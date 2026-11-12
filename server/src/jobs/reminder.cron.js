/**
 * BarberPulse OS - Background Cron Job: Recordatorios Inteligentes por WhatsApp
 * 
 * Escanea periódicamente las citas de todas las barberías activas
 * e identifica aquellas dentro de la ventana de las próximas 2 horas
 * que aún no han recibido recordatorio (reminderSent: false), disparando
 * el mensaje mediante WhatsApp Cloud API y actualizando el estado.
 */

import cron from 'node-cron';
import { getTenantCollection, isMock, mockStore, db } from '../config/firebase.js';
import { sendAppointmentReminderWhatsApp } from '../services/whatsapp.service.js';

/**
 * Convierte fecha YYYY-MM-DD y hora HH:mm en un objeto Date en zona horaria local
 */
const parseAppointmentDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
};

/**
 * Obtiene la lista de IDs de barberías activas (Tenants)
 */
const getActiveTenantIds = async () => {
  if (isMock) {
    return Object.keys(mockStore.barbershops || {});
  }

  try {
    const snapshot = await db.collection('barbershops').get();
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('⚠️ [Cron Job] Error obteniendo barberías:', error.message);
    return ['demo-barbershop-01'];
  }
};

/**
 * Ejecuta la verificación y despacho de recordatorios para una barbería específica
 */
export const checkAndSendRemindersForTenant = async (tenantId, io = null) => {
  const now = new Date();
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  let dispatchedCount = 0;

  try {
    let appointmentsToProcess = [];

    if (isMock) {
      const list = mockStore.appointments?.[tenantId] || [];
      // Filtrar citas no canceladas, sin recordatorio y con teléfono del cliente
      appointmentsToProcess = list.filter(app => 
        (app.status === 'SCHEDULED' || app.status === 'WAITING') &&
        !app.reminderSent &&
        Boolean(app.clientPhone)
      );
    } else {
      const colRef = getTenantCollection(tenantId, 'appointments');
      const snapshot = await colRef
        .where('status', 'in', ['SCHEDULED', 'WAITING'])
        .where('reminderSent', '!=', true)
        .get();

      appointmentsToProcess = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Identificar citas cuya hora programada esté dentro de los próximos 120 minutos
    for (const app of appointmentsToProcess) {
      const appDate = parseAppointmentDateTime(app.date, app.time);
      if (!appDate) continue;

      const timeDiffMs = appDate.getTime() - now.getTime();
      const minutesUntilAppointment = Math.round(timeDiffMs / (60 * 1000));

      // Ventana de recordatorio: entre 0 y 125 minutos (las próximas 2 horas con 5 min de buffer)
      if (minutesUntilAppointment >= 0 && minutesUntilAppointment <= 125) {
        console.log(`⏰ [Cron Reminder] Disparando recordatorio para cita ID: ${app.id} (${app.clientName} a las ${app.time}, en ${minutesUntilAppointment} mins)`);

        try {
          // 1. Enviar mensaje por WhatsApp
          const result = await sendAppointmentReminderWhatsApp({
            to: app.clientPhone,
            clientName: app.clientName,
            barberName: app.barberName || 'Tu Barbero Asignado',
            serviceName: app.serviceName || 'Servicio de Barbería',
            time: app.time,
            date: app.date,
            barbershopName: 'BarberPulse'
          });

          const sentAt = new Date().toISOString();

          // 2. Marcar en Base de Datos como recordatorio enviado
          if (isMock) {
            const index = mockStore.appointments[tenantId].findIndex(a => a.id === app.id);
            if (index !== -1) {
              mockStore.appointments[tenantId][index].reminderSent = true;
              mockStore.appointments[tenantId][index].reminderSentAt = sentAt;
              mockStore.appointments[tenantId][index].whatsappMessageId = result.messageId;
            }
          } else {
            const colRef = getTenantCollection(tenantId, 'appointments');
            await colRef.doc(app.id).update({
              reminderSent: true,
              reminderSentAt: sentAt,
              whatsappMessageId: result.messageId
            });
          }

          dispatchedCount++;

          // 3. Emitir evento Socket.io en tiempo real a la sala del tenant
          if (io) {
            io.to(`barbershop:${tenantId}`).emit('appointment:reminder_sent', {
              appointmentId: app.id,
              clientName: app.clientName,
              time: app.time,
              sentAt,
              messageId: result.messageId
            });
          }
        } catch (sendError) {
          console.error(`❌ [Cron Reminder] Error al enviar WhatsApp a ${app.clientPhone}:`, sendError.message);
        }
      }
    }
  } catch (error) {
    console.error(`💥 [Cron Reminder] Fallo procesando tenant ${tenantId}:`, error.message);
  }

  return dispatchedCount;
};

/**
 * Escaneo global de todas las barberías
 */
export const runReminderCheckNow = async (io = null) => {
  const startTime = Date.now();
  const tenantIds = await getActiveTenantIds();
  let totalDispatched = 0;

  console.log(`\n⏳ [Cron Reminder Job] Iniciando escaneo de citas para ${tenantIds.length} barberías...`);

  for (const tenantId of tenantIds) {
    const dispatched = await checkAndSendRemindersForTenant(tenantId, io);
    totalDispatched += dispatched;
  }

  const duration = Date.now() - startTime;
  console.log(`✨ [Cron Reminder Job] Escaneo completado en ${duration}ms. Recordatorios enviados: ${totalDispatched}\n`);
  return { tenantsScanned: tenantIds.length, totalDispatched, durationMs: duration };
};

/**
 * Inicializador del cron job programado
 * Se ejecuta cada 15 minutos en producción (cada cuarto de hora)
 */
export const initReminderCron = (io = null) => {
  // Expresión cron: Cada 15 minutos
  const scheduleExpression = process.env.REMINDER_CRON_SCHEDULE || '*/15 * * * *';

  console.log(`🕒 [Reminder Cron Job] Registrado con frecuencia: "${scheduleExpression}"`);

  const task = cron.schedule(scheduleExpression, async () => {
    try {
      await runReminderCheckNow(io);
    } catch (err) {
      console.error('💥 [Reminder Cron Job] Error durante ejecución periódica:', err);
    }
  });

  return task;
};

export default {
  initReminderCron,
  runReminderCheckNow,
  checkAndSendRemindersForTenant
};
