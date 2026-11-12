import { getTenantCollection, isMock, mockStore, db } from '../config/firebase.js';

/**
 * Middleware de Verificación de Suscripción SaaS
 * Valida si el tenant tiene la suscripción activa.
 * Si se encuentra en 'past_due' o 'canceled' habiendo superado el período de gracia (3 días),
 * bloquea la petición con HTTP 402 Payment Required.
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const barbershopId = req.barbershopId || req.headers['x-barbershop-id'] || 'demo-barbershop-01';

    let barbershop = null;

    if (isMock) {
      barbershop = mockStore.barbershops?.[barbershopId];
    } else {
      const doc = await db.collection('barbershops').doc(barbershopId).get();
      if (doc.exists) {
        barbershop = doc.data();
      }
    }

    if (!barbershop) {
      return res.status(404).json({
        success: false,
        error: 'Tenant Not Found',
        message: `No se encontró la barbería con ID: ${barbershopId}`
      });
    }

    const {
      subscriptionStatus = 'active',
      subscriptionPlan = 'pro',
      currentPeriodEnd
    } = barbershop;

    // Si está activa, permitir acceso normal
    if (subscriptionStatus === 'active') {
      req.subscription = { status: 'active', plan: subscriptionPlan, currentPeriodEnd };
      return next();
    }

    // Período de gracia de 3 días para cuentas en 'past_due'
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
    const expirationTime = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : Date.now();
    const isWithinGracePeriod = (Date.now() - expirationTime) < gracePeriodMs;

    if (subscriptionStatus === 'past_due' && isWithinGracePeriod) {
      // Advertencia en header pero permite continuar
      res.setHeader('X-Subscription-Warning', 'Payment Past Due - Grace Period Active');
      req.subscription = { status: 'past_due', inGracePeriod: true, plan: subscriptionPlan };
      return next();
    }

    // Bloqueo estricto con HTTP 402 Payment Required
    return res.status(402).json({
      success: false,
      error: 'Payment Required',
      code: 'SUBSCRIPTION_LOCKED',
      message: 'La suscripción SaaS de tu barbería está suspendida o vencida. Por favor regulariza el pago para continuar utilizando el sistema operativo.',
      details: {
        status: subscriptionStatus,
        plan: subscriptionPlan,
        expiredAt: currentPeriodEnd
      },
      renewalUrl: '/subscription'
    });
  } catch (error) {
    console.error('Error en middleware de suscripción:', error);
    // En caso de fallo de infraestructura, permitimos continuar para no tumbar la operativa
    next();
  }
};

