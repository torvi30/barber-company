import { isMock, mockStore, db } from '../config/firebase.js';

/**
 * Normaliza y formatea números de WhatsApp eliminando espacios y agregando código de país
 */
const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  // Si comienza por 3 (número móvil colombiano común de 10 dígitos) y no tiene prefijo 57
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '57' + cleaned;
  }
  return cleaned;
};

/**
 * Obtener todos los tenants registrados con métricas detalladas y estados de facturación
 */
export const getAllTenants = async (req, res) => {
  try {
    let tenants = [];

    if (isMock) {
      tenants = Object.values(mockStore.barbershops || {});
    } else {
      const snap = await db.collection('barbershops').get();
      tenants = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    const now = Date.now();

    const formattedTenants = tenants.map(t => {
      const periodEnd = t.currentPeriodEnd ? new Date(t.currentPeriodEnd).getTime() : (now + 1000 * 60 * 60 * 24 * 30);
      const daysUntilCutoff = Math.round((periodEnd - now) / (1000 * 60 * 60 * 24));

      let billingStatus = 'ACTIVE';
      let urgencyLevel = 'NORMAL'; // 'NORMAL', 'WARNING', 'DANGER', 'CRITICAL'

      if (t.subscriptionStatus === 'suspended' || t.subscriptionStatus === 'canceled') {
        billingStatus = 'SUSPENDED';
        urgencyLevel = 'CRITICAL';
      } else if (daysUntilCutoff < 0 || t.subscriptionStatus === 'past_due') {
        billingStatus = 'PAST_DUE';
        urgencyLevel = 'DANGER';
      } else if (daysUntilCutoff <= 3) {
        billingStatus = 'EXPIRING_SOON';
        urgencyLevel = 'WARNING';
      } else if (t.subscriptionStatus === 'trial') {
        billingStatus = 'TRIAL';
        urgencyLevel = daysUntilCutoff <= 3 ? 'WARNING' : 'NORMAL';
      }

      // Conteo de staff y citas
      let staffCount = 0;
      let appointmentsCount = 0;

      if (isMock) {
        staffCount = (mockStore.barbers?.[t.id] || []).length;
        appointmentsCount = (mockStore.appointments?.[t.id] || []).length;
      }

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        businessType: t.businessType || 'barbershop',
        municipality: t.municipality || 'Rionegro',
        department: t.department || 'Antioquia',
        address: t.address || 'Ubicación no registrada',
        ownerName: t.ownerName || 'Dueño del Negocio',
        ownerEmail: t.ownerEmail || 'admin@' + (t.slug || 'local') + '.com',
        whatsapp: t.whatsapp || t.phone || '+573000000000',
        cleanWhatsApp: formatWhatsAppNumber(t.whatsapp || t.phone),
        currency: t.currency || 'COP',
        subscriptionPlan: t.subscriptionPlan || 'pro',
        subscriptionStatus: t.subscriptionStatus || 'active',
        billingStatus,
        urgencyLevel,
        currentPeriodEnd: t.currentPeriodEnd || new Date(periodEnd).toISOString(),
        daysUntilCutoff,
        staffCount,
        appointmentsCount,
        monthlyRate: t.subscriptionPlan === 'basic' ? 29 : 59,
        createdAt: t.createdAt || new Date().toISOString()
      };
    });

    // Ordenar: primero los que están en peligro / por vencer
    formattedTenants.sort((a, b) => {
      const urgencyScore = { CRITICAL: 4, DANGER: 3, WARNING: 2, NORMAL: 1 };
      return (urgencyScore[b.urgencyLevel] || 0) - (urgencyScore[a.urgencyLevel] || 0);
    });

    return res.json({
      success: true,
      count: formattedTenants.length,
      data: formattedTenants
    });
  } catch (error) {
    console.error('Error al listar tenants en SuperAdmin:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener métricas globales para el Dashboard del SuperAdmin (MRR, distribución de verticales y municipios)
 */
export const getGlobalMetrics = async (req, res) => {
  try {
    let tenants = [];

    if (isMock) {
      tenants = Object.values(mockStore.barbershops || {});
    } else {
      const snap = await db.collection('barbershops').get();
      tenants = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    const now = Date.now();
    let totalMRR_USD = 0;
    let activeCount = 0;
    let trialCount = 0;
    let pastDueCount = 0;
    let suspendedCount = 0;
    let expiringSoonCount = 0;

    const verticalCounts = {
      barbershop: 0,
      beauty_salon: 0,
      spa: 0,
      aesthetic_center: 0,
      nail_studio: 0
    };

    const municipalityCounts = {};

    tenants.forEach(t => {
      const plan = t.subscriptionPlan || 'pro';
      const status = t.subscriptionStatus || 'active';
      const price = plan === 'basic' ? 29 : 59;

      const periodEnd = t.currentPeriodEnd ? new Date(t.currentPeriodEnd).getTime() : (now + 1000 * 60 * 60 * 24 * 30);
      const daysUntilCutoff = Math.round((periodEnd - now) / (1000 * 60 * 60 * 24));

      if (status === 'active') {
        totalMRR_USD += price;
        activeCount++;
      } else if (status === 'trial') {
        trialCount++;
      } else if (status === 'past_due' || daysUntilCutoff < 0) {
        pastDueCount++;
      } else if (status === 'suspended' || status === 'canceled') {
        suspendedCount++;
      }

      if (daysUntilCutoff <= 3 && daysUntilCutoff >= 0 && status !== 'suspended') {
        expiringSoonCount++;
      }

      // Verticales
      const v = t.businessType || 'barbershop';
      if (verticalCounts[v] !== undefined) {
        verticalCounts[v]++;
      } else {
        verticalCounts[v] = 1;
      }

      // Municipios
      const mun = t.municipality || 'Rionegro';
      municipalityCounts[mun] = (municipalityCounts[mun] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        totalTenants: tenants.length,
        totalMRR_USD,
        totalMRR_COP: totalMRR_USD * 4200, // Tasa referencial para display
        statusSummary: {
          active: activeCount,
          trial: trialCount,
          pastDue: pastDueCount,
          suspended: suspendedCount,
          expiringSoon: expiringSoonCount
        },
        verticalDistribution: verticalCounts,
        municipalityDistribution: municipalityCounts
      }
    });
  } catch (error) {
    console.error('Error calculando métricas de SuperAdmin:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar estado de suscripción de un tenant (Activar, Suspender, Poner en Mora o Extender)
 */
export const updateTenantSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, plan, extendDays = 0 } = req.body;
    const io = req.app.get('io');

    let tenant = null;

    if (isMock) {
      tenant = mockStore.barbershops?.[id];
    } else {
      const doc = await db.collection('barbershops').doc(id).get();
      if (doc.exists) tenant = { id: doc.id, ...doc.data() };
    }

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Negocio no encontrado con ID: ' + id });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (status) updates.subscriptionStatus = status;
    if (plan) updates.subscriptionPlan = plan;

    if (extendDays > 0) {
      const currentEnd = tenant.currentPeriodEnd ? new Date(tenant.currentPeriodEnd).getTime() : Date.now();
      const baseTime = Math.max(Date.now(), currentEnd);
      const newEndTime = new Date(baseTime + extendDays * 24 * 60 * 60 * 1000).toISOString();
      updates.currentPeriodEnd = newEndTime;
      if (status !== 'suspended') updates.subscriptionStatus = 'active';
    }

    // Persistir
    if (isMock) {
      Object.assign(mockStore.barbershops[id], updates);
    } else {
      await db.collection('barbershops').doc(id).update(updates);
    }

    // Notificar en tiempo real al tenant
    if (io) {
      io.to(`barbershop:${id}`).emit('subscription:admin_override', {
        tenantId: id,
        ...updates
      });
    }

    return res.json({
      success: true,
      message: `Suscripción de ${tenant.name} actualizada correctamente`,
      data: {
        id,
        ...updates
      }
    });
  } catch (error) {
    console.error('Error actualizando suscripción de tenant:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generar enlace directo y mensaje pre-redactado de WhatsApp para cobro o soporte
 */
export const generateWhatsAppPaymentAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { alertType = 'expiring_soon' } = req.body; // 'expiring_soon', 'past_due', 'suspended', 'support'

    let tenant = null;

    if (isMock) {
      tenant = mockStore.barbershops?.[id];
    } else {
      const doc = await db.collection('barbershops').doc(id).get();
      if (doc.exists) tenant = { id: doc.id, ...doc.data() };
    }

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Negocio no encontrado' });
    }

    const cleanPhone = formatWhatsAppNumber(tenant.whatsapp || tenant.phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'El negocio no tiene un número de WhatsApp registrado' });
    }

    const owner = tenant.ownerName || 'Estimado Dueño';
    const businessName = tenant.name || 'tu negocio';
    const planName = (tenant.subscriptionPlan === 'basic' ? 'Plan Básico ($29 USD)' : 'Plan Pro ($59 USD)');

    let message = '';

    switch (alertType) {
      case 'expiring_soon':
        message =
          `👋 Hola *${owner}*, te saludamos desde el equipo central de *BarberPulse OS / Beauty SaaS*. 💈✨

Te escribimos para recordarte que la suscripción de *${businessName}* (${planName}) está próxima a vencer en los próximos días.

Para evitar interrupciones en la agenda en vivo, recordatorios de WhatsApp a tus clientes o reportes de caja, puedes renovar directamente desde tu panel en la sección "Suscripción & Plan", o si lo prefieres, te enviamos el link de pago por este medio.

¿Deseas que te generemos la orden de renovación? ¡Quedamos atentos a cualquier duda!`;
        break;

      case 'past_due':
        message =
          `⚠️ *AVISO IMPORTANTE DE FACTURACIÓN - BarberPulse OS*

Hola *${owner}*, esperamos te encuentres muy bien.
Te informamos que tu suscripción para *${businessName}* presenta un pago pendiente y ha entrado en período de mora.

Actualmente cuentas con un margen de cortesía de 3 días antes de que los módulos operativos (cierre de caja y agenda automatizada) queden pausados.

💳 Puedes regularizar tu pago de forma instantánea ingresando a tu panel administrativo o respondiendo a este mensaje para ayudarte. ¡Estamos para apoyarte!`;
        break;

      case 'suspended':
        message =
          `🚫 *SERVICIO PAUSADO TEMPORALMENTE - BarberPulse OS*

Estimado/a *${owner}*,
El acceso operativo para *${businessName}* ha sido suspendido debido a la expiración de la suscripción.

Para reactivar tus agendas, catálogos y sincronización en tiempo real sin perder tus datos ni historiales de clientes, por favor contáctanos por este medio o efectúa tu renovación inmediata.

¡Tu base de datos está 100% segura y lista para ser reactivada en 1 clic!`;
        break;

      case 'support':
      default:
        message =
          `💈 *SOPORTE TÉCNICO VIP - BarberPulse Central*

Hola *${owner}*, te saludamos desde la consola central de BarberPulse OS.
Notamos que estás operando con *${businessName}* en ${tenant.municipality || 'tu sede'}.

¿Cómo ha sido tu experiencia con la plataforma? ¿Necesitas asesoría para configurar nuevos servicios, staff o recordatorios de WhatsApp? Estamos a tu completa disposición.`;
        break;
    }

    const encodedText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    return res.json({
      success: true,
      businessName,
      owner,
      phone: cleanPhone,
      alertType,
      message,
      whatsappUrl: waUrl
    });
  } catch (error) {
    console.error('Error generando alerta de WhatsApp:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


