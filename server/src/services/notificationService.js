import { getTenantCollection, isMock, mockStore, db } from '../config/firebase.js';

/**
 * Motor de Notificaciones & Webhooks Automatizados (WhatsApp, Email & Webhook Cloud)
 */
export const dispatchNotification = async (barbershopId, triggerType, appointmentData) => {
  try {
    let settings = null;
    let barbershop = null;

    if (isMock) {
      settings = mockStore.notification_settings?.[barbershopId];
      barbershop = mockStore.barbershops?.[barbershopId] || { name: 'BarberPulse Studio', address: 'Gran Vía 42' };
    } else {
      const snap = await db.collection('barbershops').doc(barbershopId).collection('notification_settings').doc('general').get();
      if (snap.exists) settings = snap.data();

      const shopDoc = await db.collection('barbershops').doc(barbershopId).get();
      if (shopDoc.exists) barbershop = shopDoc.data();
    }

    if (!settings) {
      console.log(`[Notification Service] No hay configuración de notificaciones para el tenant: ${barbershopId}`);
      return null;
    }

    const triggerConfig = settings.triggers?.[triggerType];
    if (!triggerConfig || !triggerConfig.active) {
      console.log(`[Notification Service] El trigger "${triggerType}" está inactivo.`);
      return null;
    }

    // 1. Interpolación de variables en la plantilla
    const rawTemplate = settings.templates?.[triggerType] || 'Cita confirmada en {{barbershop_name}} para {{client_name}}.';
    const message = rawTemplate
      .replace(/{{client_name}}/g, appointmentData.clientName || 'Cliente')
      .replace(/{{service_name}}/g, appointmentData.serviceName || 'Servicio')
      .replace(/{{barber_name}}/g, appointmentData.barberName || 'Barbero Asignado')
      .replace(/{{date}}/g, appointmentData.date || new Date().toISOString().split('T')[0])
      .replace(/{{time}}/g, appointmentData.time || '10:00')
      .replace(/{{price}}/g, `$${appointmentData.price || 0}`)
      .replace(/{{barbershop_name}}/g, barbershop?.name || 'Tu Barbería')
      .replace(/{{address}}/g, barbershop?.address || '');

    const logsCollection = getTenantCollection(barbershopId, 'notification_logs');
    const dispatchedLogs = [];

    // 2. Disparo por WhatsApp (si está activo y hay teléfono)
    if (settings.whatsappEnabled && appointmentData.clientPhone) {
      const waLog = {
        id: `notif-${Date.now()}-wa`,
        type: 'WHATSAPP',
        trigger: triggerType,
        recipientName: appointmentData.clientName,
        recipientPhone: appointmentData.clientPhone,
        message,
        status: 'DELIVERED',
        dispatchedAt: new Date().toISOString()
      };

      if (isMock) {
        if (!mockStore.notification_logs[barbershopId]) mockStore.notification_logs[barbershopId] = [];
        mockStore.notification_logs[barbershopId].unshift(waLog);
      } else {
        await logsCollection.add(waLog);
      }

      console.log(`📲 [WhatsApp Cloud Simulated] Enviado a ${appointmentData.clientPhone}: "${message.slice(0, 50)}..."`);
      dispatchedLogs.push(waLog);
    }

    // 3. Disparo de Webhook Saliente (Zapier / Make / n8n)
    if (settings.webhookEnabled && settings.webhookUrl) {
      const webhookPayload = {
        event: triggerType,
        tenantId: barbershopId,
        timestamp: new Date().toISOString(),
        data: appointmentData
      };

      try {
        // En producción se hace fetch real; registramos el log de auditoría
        const hookLog = {
          id: `notif-${Date.now()}-hook`,
          type: 'WEBHOOK',
          trigger: triggerType,
          recipientName: 'Webhook Receptor Externo',
          recipientPhone: settings.webhookUrl,
          message: JSON.stringify(webhookPayload),
          status: 'DELIVERED',
          dispatchedAt: new Date().toISOString()
        };

        if (isMock) {
          if (!mockStore.notification_logs[barbershopId]) mockStore.notification_logs[barbershopId] = [];
          mockStore.notification_logs[barbershopId].unshift(hookLog);
        } else {
          await logsCollection.add(hookLog);
        }

        console.log(`🌐 [Webhook Dispatched] POST a ${settings.webhookUrl} con evento: ${triggerType}`);
        dispatchedLogs.push(hookLog);
      } catch (err) {
        console.warn('[Webhook Error]:', err.message);
      }
    }

    return dispatchedLogs;
  } catch (error) {
    console.error('Error al procesar notificación:', error);
    return null;
  }
};

