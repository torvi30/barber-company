import { getTenantCollection, isMock, mockStore, db } from '../config/firebase.js';
import { dispatchNotification } from '../services/notificationService.js';

/**
 * Obtener configuración de notificaciones y automatizaciones
 */
export const getNotificationSettings = async (req, res) => {
  try {
    const { barbershopId } = req;
    let settings = null;

    if (isMock) {
      settings = mockStore.notification_settings?.[barbershopId] || {
        whatsappEnabled: true,
        emailEnabled: true,
        webhookEnabled: false,
        webhookUrl: '',
        triggers: {
          BOOKING_CONFIRMED: { active: true, label: 'Confirmación Inmediata de Reserva' },
          REMINDER_2_HOURS: { active: true, label: 'Recordatorio 2 Horas Antes' },
          REVIEW_REQUEST: { active: true, label: 'Solicitud de Reseña Google 1h Después' }
        },
        templates: {
          BOOKING_CONFIRMED: '¡Hola {{client_name}}! 💈 Tu cita para {{service_name}} con {{barber_name}} ha sido confirmada para el {{date}} a las {{time}} hrs en {{barbershop_name}}. ¡Te esperamos!',
          REMINDER_2_HOURS: 'Hola {{client_name}} ⏰ Te recordamos que en 2 horas tienes tu turno con {{barber_name}} ({{time}} hrs) en {{barbershop_name}}.',
          REVIEW_REQUEST: '¡Gracias por visitarnos hoy {{client_name}}! ⭐ Déjanos tu valoración en Google: https://g.page/barberpulse/review'
        }
      };
    } else {
      const snap = await db.collection('barbershops').doc(barbershopId).collection('notification_settings').doc('general').get();
      settings = snap.exists ? snap.data() : null;
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error al obtener ajustes de notificación:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar configuración de automatizaciones, canales y plantillas
 */
export const updateNotificationSettings = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { whatsappEnabled, emailEnabled, webhookEnabled, webhookUrl, triggers, templates } = req.body;

    if (isMock) {
      if (!mockStore.notification_settings) mockStore.notification_settings = {};
      const current = mockStore.notification_settings[barbershopId] || {};

      mockStore.notification_settings[barbershopId] = {
        ...current,
        ...(whatsappEnabled !== undefined && { whatsappEnabled }),
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(webhookEnabled !== undefined && { webhookEnabled }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(triggers && { triggers: { ...current.triggers, ...triggers } }),
        ...(templates && { templates: { ...current.templates, ...templates } })
      };

      return res.json({
        success: true,
        message: 'Ajustes de automatizaciones guardados exitosamente',
        data: mockStore.notification_settings[barbershopId]
      });
    }

    const docRef = db.collection('barbershops').doc(barbershopId).collection('notification_settings').doc('general');
    await docRef.set({ whatsappEnabled, emailEnabled, webhookEnabled, webhookUrl, triggers, templates }, { merge: true });
    const updated = await docRef.get();

    return res.json({
      success: true,
      message: 'Ajustes de automatizaciones guardados en Firestore',
      data: updated.data()
    });
  } catch (error) {
    console.error('Error al actualizar ajustes de notificación:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener historial / registro de auditoría de notificaciones emitidas
 */
export const getNotificationLogs = async (req, res) => {
  try {
    const { barbershopId } = req;
    const logsCollection = getTenantCollection(barbershopId, 'notification_logs');

    let logs = [];
    if (isMock) {
      logs = mockStore.notification_logs?.[barbershopId] || [];
    } else {
      const snap = await logsCollection.orderBy('dispatchedAt', 'desc').limit(50).get();
      logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error al obtener logs de notificación:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Disparo de Notificación de Prueba Manual
 */
export const testDispatchNotification = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { triggerType = 'BOOKING_CONFIRMED', testPhone = '+34 600 999 888', testName = 'Cliente Prueba' } = req.body;

    const dummyAppointment = {
      clientName: testName,
      clientPhone: testPhone,
      serviceName: 'Skin Fade + Ritual de Toalla',
      barberName: 'Carlos FadeMaster',
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      price: 35
    };

    const result = await dispatchNotification(barbershopId, triggerType, dummyAppointment);

    return res.json({
      success: true,
      message: 'Disparo de prueba ejecutado con éxito',
      result
    });
  } catch (error) {
    console.error('Error al ejecutar prueba de notificación:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Disparo Manual del Cron Job de Recordatorios WhatsApp para la Barbería Actual
 */
export const triggerReminderCronManually = async (req, res) => {
  try {
    const { barbershopId } = req;
    const io = req.app.get('io');
    const { checkAndSendRemindersForTenant } = await import('../jobs/reminder.cron.js');

    const dispatched = await checkAndSendRemindersForTenant(barbershopId, io);

    return res.json({
      success: true,
      message: `Escaneo de citas ejecutado exitosamente`,
      remindersSent: dispatched,
      barbershopId
    });
  } catch (error) {
    console.error('Error al ejecutar cron manual:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


