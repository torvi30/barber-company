import Stripe from 'stripe';
import { getTenantCollection, isMock, mockStore, db } from '../config/firebase.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const isStripeConfigured = stripeSecretKey && !stripeSecretKey.includes('Mock');
const stripe = isStripeConfigured ? new Stripe(stripeSecretKey) : null;

// Catálogo de Planes SaaS de BarberPulse OS
export const SAAS_PLANS = {
  basic: {
    id: 'basic',
    name: 'Plan Básico Essential',
    price: 29.00,
    currency: 'USD',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_29',
    features: [
      'Hasta 2 Barberos activos en simultáneo',
      'Agenda digital y turnos Walk-In ilimitados',
      'Control de caja diario y arqueo básico',
      'Control de inventario de suministros',
      'Soporte estándar por correo electrónico'
    ],
    limits: {
      maxBarbers: 2,
      whatsappAutomation: false,
      crmStyleSheets: false,
      advancedAnalytics: false,
      boutiqueStore: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro Black Edition',
    price: 59.00,
    currency: 'USD',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_59',
    badge: 'MÁS POPULAR',
    features: [
      'Barberos y sillones ILIMITADOS',
      'Automatización WhatsApp Cloud API & Recordatorios Cron',
      'CRM de Clientes & Fichas Técnicas de Corte VIP',
      'Analíticas de Negocio, Heatmaps & Exportador CSV',
      'Tienda Boutique Online con Click & Collect',
      'Soporte prioritario 24/7 y multi-sucursal'
    ],
    limits: {
      maxBarbers: 999,
      whatsappAutomation: true,
      crmStyleSheets: true,
      advancedAnalytics: true,
      boutiqueStore: true
    }
  }
};

/**
 * Obtener estado de suscripción del tenant
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const barbershopId = req.barbershopId || req.query.barbershopId || 'demo-barbershop-01';

    let barbershop = null;
    let barbersCount = 0;

    if (isMock) {
      barbershop = mockStore.barbershops?.[barbershopId];
      barbersCount = (mockStore.barbers?.[barbershopId] || []).length;
    } else {
      const doc = await db.collection('barbershops').doc(barbershopId).get();
      if (doc.exists) barbershop = doc.data();

      const bSnap = await db.collection('barbershops').doc(barbershopId).collection('barbers').get();
      barbersCount = bSnap.size;
    }

    if (!barbershop) {
      return res.status(404).json({ success: false, error: 'Barbería no encontrada' });
    }

    const currentPlanId = barbershop.subscriptionPlan || 'pro';
    const planDetails = SAAS_PLANS[currentPlanId] || SAAS_PLANS.pro;
    const status = barbershop.subscriptionStatus || 'active';
    const periodEnd = barbershop.currentPeriodEnd || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const daysRemaining = Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return res.json({
      success: true,
      data: {
        barbershopId,
        barbershopName: barbershop.name,
        status,
        subscriptionStatus: status,
        subscriptionPlan: currentPlanId,
        statusLabel: status === 'active' ? 'Suscripción Activa' : status === 'past_due' ? 'Pago Pendiente (En Gracia)' : 'Cancelada',
        currentPlan: planDetails,
        currentPeriodEnd: periodEnd,
        daysRemaining,
        usage: {
          activeBarbers: barbersCount,
          maxBarbers: planDetails.limits.maxBarbers
        },
        availablePlans: Object.values(SAAS_PLANS),
        invoicesHistory: [
          {
            id: 'inv-bp-991',
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
            amount: planDetails.price,
            planName: planDetails.name,
            status: 'PAID',
            pdfUrl: '#'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error al consultar suscripción:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear Sesión de Checkout Recurrente (Stripe / Mercado Pago)
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const barbershopId = req.barbershopId || req.body.barbershopId || 'demo-barbershop-01';
    const { planId = 'pro', paymentGateway = 'stripe' } = req.body;

    const plan = SAAS_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan inválido (basic o pro)' });
    }

    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const successUrl = `${clientOrigin}/?session_id={CHECKOUT_SESSION_ID}&payment_status=success&plan=${planId}`;
    const cancelUrl = `${clientOrigin}/?payment_status=canceled`;

    // 1. Integración con Stripe Checkout Session Real
    if (isStripeConfigured && stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price_data: {
                currency: plan.currency.toLowerCase(),
                product_data: {
                  name: `BarberPulse OS - ${plan.name}`,
                  description: plan.features.join(' • ')
                },
                unit_amount: Math.round(plan.price * 100),
                recurring: { interval: plan.interval }
              },
              quantity: 1
            }
          ],
          metadata: {
            barbershopId,
            planId
          },
          success_url: successUrl,
          cancel_url: cancelUrl
        });

        return res.json({
          success: true,
          gateway: 'stripe',
          checkoutUrl: session.url,
          url: session.url,
          sessionId: session.id,
          simulated: false
        });
      } catch (stripeError) {
        console.warn('⚠️ [Stripe API Warning]: Falló conexión con Stripe, activando fallback simulado:', stripeError.message);
      }
    }

    // 2. Modo Desarrollo / Simulación Inteligente (Zero-Config Test)
    const simulatedSessionId = `cs_test_barberpulse_${Date.now()}_${planId}`;
    const simulatedCheckoutUrl = `${clientOrigin}/?checkout_session=${simulatedSessionId}&plan=${planId}&amount=${plan.price}&simulated=true`;

    return res.json({
      success: true,
      gateway: paymentGateway,
      isSimulated: true,
      simulated: true,
      message: 'Checkout session generada exitosamente (Modo Sandbox/Dev)',
      checkoutUrl: simulatedCheckoutUrl,
      url: simulatedCheckoutUrl,
      sessionId: simulatedSessionId,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency
      }
    });
  } catch (error) {
    console.error('Error al crear checkout session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Endpoint Webhook de Pasarela de Pagos (Stripe & Mercado Pago)
 * Escucha eventos de cobro recurrente exitoso o fallido y actualiza Firestore en vivo.
 */
export const handleWebhook = async (req, res) => {
  try {
    let event = req.body;
    const sig = req.headers['stripe-signature'];

    // Si Stripe está activo y se envió firma oficial, validarla
    if (isStripeConfigured && stripe && sig && process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error(`⚠️ Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    const eventType = event.type || event.event || 'checkout.session.completed';
    const eventData = event.data?.object || event.data || event;

    console.log(`💳 [SaaS Webhook Received] Tipo de evento: ${eventType}`);

    const barbershopId = eventData.metadata?.barbershopId || event.barbershopId || 'demo-barbershop-01';
    const planId = eventData.metadata?.planId || event.planId || 'pro';

    const io = req.app.get('io');

    // Manejar Evento: Pago de Factura Exitoso / Checkout Completado
    if (eventType === 'invoice.payment_succeeded' || eventType === 'checkout.session.completed') {
      const newPeriodEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

      if (isMock) {
        if (mockStore.barbershops?.[barbershopId]) {
          mockStore.barbershops[barbershopId].subscriptionStatus = 'active';
          mockStore.barbershops[barbershopId].subscriptionPlan = planId;
          mockStore.barbershops[barbershopId].currentPeriodEnd = newPeriodEnd;
        }
      } else {
        await db.collection('barbershops').doc(barbershopId).update({
          subscriptionStatus: 'active',
          subscriptionPlan: planId,
          currentPeriodEnd: newPeriodEnd,
          updatedAt: new Date().toISOString()
        });
      }

      console.log(`✅ [SaaS Subscription Activated] Barbería: ${barbershopId} | Plan: ${planId} | Válido hasta: ${newPeriodEnd}`);

      // Notificar a la UI en vivo mediante Socket.io
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('subscription:updated', {
          barbershopId,
          status: 'active',
          planId,
          currentPeriodEnd: newPeriodEnd
        });
      }

      return res.status(200).json({
        success: true,
        received: true,
        action: 'SUBSCRIPTION_RENEWED',
        message: 'Suscripción renovada exitosamente',
        data: {
          barbershopId,
          status: 'active',
          planId,
          currentPeriodEnd: newPeriodEnd
        }
      });
    }

    // Manejar Evento: Fallo de Cobro (Mora / Tarjeta Declinada)
    if (eventType === 'invoice.payment_failed') {
      if (isMock) {
        if (mockStore.barbershops?.[barbershopId]) {
          mockStore.barbershops[barbershopId].subscriptionStatus = 'past_due';
        }
      } else {
        await db.collection('barbershops').doc(barbershopId).update({
          subscriptionStatus: 'past_due',
          updatedAt: new Date().toISOString()
        });
      }

      console.warn(`⚠️ [SaaS Subscription Past Due] Pago fallido para barbería: ${barbershopId}`);

      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('subscription:past_due', {
          barbershopId,
          status: 'past_due'
        });
      }

      return res.status(200).json({
        success: true,
        received: true,
        action: 'MARKED_PAST_DUE',
        message: 'Suscripción marcada en mora (past_due)',
        data: {
          barbershopId,
          status: 'past_due'
        }
      });
    }

    // Manejar Evento: Cancelación de Suscripción
    if (eventType === 'customer.subscription.deleted') {
      if (isMock) {
        if (mockStore.barbershops?.[barbershopId]) {
          mockStore.barbershops[barbershopId].subscriptionStatus = 'canceled';
        }
      } else {
        await db.collection('barbershops').doc(barbershopId).update({
          subscriptionStatus: 'canceled',
          updatedAt: new Date().toISOString()
        });
      }

      console.log(`🚫 [SaaS Subscription Canceled] Suscripción cancelada para: ${barbershopId}`);

      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('subscription:canceled', {
          barbershopId,
          status: 'canceled'
        });
      }

      return res.status(200).json({
        success: true,
        received: true,
        action: 'MARKED_CANCELED',
        message: 'Suscripción cancelada',
        data: {
          barbershopId,
          status: 'canceled'
        }
      });
    }

    return res.status(200).json({ received: true, unhandledEvent: eventType });
  } catch (error) {
    console.error('Error al procesar webhook de suscripción:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Simulador de Evento Webhook para Desarrollo / Pruebas en Vivo
 */
export const simulatePaymentEvent = async (req, res) => {
  try {
    const barbershopId = req.barbershopId || req.body.barbershopId || 'demo-barbershop-01';
    const { eventType = 'invoice.payment_succeeded', planId = 'pro' } = req.body;

    const simulatedPayload = {
      type: eventType,
      barbershopId,
      planId,
      data: {
        object: {
          metadata: {
            barbershopId,
            planId
          }
        }
      }
    };

    req.body = simulatedPayload;
    return handleWebhook(req, res);
  } catch (error) {
    console.error('Error al simular evento de pago:', error);
    return res.status(500).json({ error: error.message });
  }
};
