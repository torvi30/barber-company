import { getTenantCollection, isMock, mockStore, db, persistStore } from '../config/firebase.js';
import { validateAppointment, AppointmentStatus } from '../models/schemas.js';
import { dispatchNotification } from '../services/notificationService.js';
import { recordClientAppointment } from './clientController.js';

// Horarios de apertura operativos base (09:00 a 19:30 cada 30 mins)
export const OPERATING_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30'
];

export const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const generateOperatingSlots = (start = '09:00', end = '20:00', interval = 30) => {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const step = Math.max(15, Number(interval) || 30);
  const list = [];
  for (let m = startMin; m + step <= endMin; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    list.push(`${hh}:${mm}`);
  }
  return list;
};

export const checkSlotCollision = (slotTime, apt, slotDuration = 30, bufferTime = 0) => {
  const slotStart = toMinutes(slotTime);
  const slotEnd = slotStart + Number(slotDuration || 30);
  const aptStart = toMinutes(apt.time);
  const aptDuration = Number(apt.durationMinutes || apt.duration || 45);
  const aptEnd = aptStart + aptDuration + Number(bufferTime || 0);
  return slotStart < aptEnd && slotEnd > aptStart;
};

/**
 * Obtener citas del tenant
 */
export const getAppointments = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { date } = req.query;
    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');

    if (isMock) {
      let filtered = tenantAppointments.data;
      if (date) {
        filtered = filtered.filter(a => a.date === date);
      }
      return res.json({
        success: true,
        tenant: barbershopId,
        count: filtered.length,
        data: filtered
      });
    }

    let query = tenantAppointments;
    if (date) {
      query = query.where('date', '==', date);
    }
    const snapshot = await query.orderBy('time', 'asc').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      tenant: barbershopId,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener fecha local YYYY-MM-DD sin desface de zona horaria UTC
export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Consulta de horarios disponibles (Slot Availability Engine)
 * Filtra citas pasadas, días no laborables y colisiones de duración
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { barberId, date = getLocalDateString(new Date()), allowPast, interval = 30, buffer = 0 } = req.query;

    if (!barberId) {
      return res.status(400).json({ success: false, error: 'El parámetro "barberId" es requerido.' });
    }

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');
    let appointments = [];

    const todayStr = getLocalDateString(new Date());

    if (isMock) {
      appointments = (tenantAppointments.data || []).filter(
        a => a.barberId === barberId &&
             (a.date === date || (!a.date && date === todayStr)) &&
             a.status !== AppointmentStatus.CANCELLED
      );
    } else {
      const snap = await tenantAppointments
        .where('barberId', '==', barberId)
        .where('date', '==', date)
        .get();

      appointments = snap.docs
        .map(d => d.data())
        .filter(a => a.status !== AppointmentStatus.CANCELLED);
    }

    // Horarios bloqueados manualmente por el barbero/admin
    const blockKey = `${barbershopId}_${barberId}_${date}`;
    const manualBlocked = (mockStore.blockedSlots?.[blockKey] || []);

    // Horario laboral semanal del barbero
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = new Date(date + 'T12:00:00').getDay();
    const dayName = dayNames[dayIndex];
    const barber = (mockStore.barbers?.[barbershopId] || []).find(b => b.id === barberId);
    const daySchedule = barber?.schedule?.[dayName] || { working: true, start: '09:00', end: '20:00' };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isAllowPast = allowPast === 'true' || allowPast === true;

    const slotInterval = Math.max(15, Number(interval) || 30);
    const bufferTime = Math.max(0, Number(buffer) || 0);
    const dayStart = daySchedule?.start || '09:00';
    const dayEnd = daySchedule?.end || '20:00';
    const slotList = generateOperatingSlots(dayStart, dayEnd, slotInterval);

    const slots = slotList.map(time => {
      const slotMinutes = toMinutes(time);

      if (daySchedule && daySchedule.working === false) {
        return { time, available: false, reason: 'DAY_OFF' };
      }
      if (daySchedule?.start && slotMinutes < toMinutes(daySchedule.start)) {
        return { time, available: false, reason: 'OUT_OF_SCHEDULE' };
      }
      if (daySchedule?.end && slotMinutes >= toMinutes(daySchedule.end)) {
        return { time, available: false, reason: 'OUT_OF_SCHEDULE' };
      }
      if (!isAllowPast && (date < todayStr || (date === todayStr && slotMinutes <= currentMinutes))) {
        return { time, available: false, reason: 'PAST' };
      }
      if (manualBlocked.includes(time)) {
        return { time, available: false, reason: 'BLOCKED_MANUALLY' };
      }

      const collisionApt = appointments.find(apt => checkSlotCollision(time, apt, slotInterval, bufferTime));
      if (collisionApt) {
        return {
          time,
          available: false,
          reason: 'BOOKED',
          clientName: collisionApt.clientName,
          serviceName: collisionApt.serviceName,
          durationMinutes: collisionApt.durationMinutes || collisionApt.duration || 45
        };
      }

      return { time, available: true, reason: 'OPEN' };
    });

    const availableSlots = slots.filter(s => s.available);

    return res.json({
      success: true,
      tenant: barbershopId,
      barberId,
      date,
      totalSlots: slots.length,
      availableCount: availableSlots.length,
      slots,
      availableSlots
    });
  } catch (error) {
    console.error('Error al calcular slots disponibles:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear cita con algoritmo Anti-Colisión (Concurrency Safe Booking)
 */
export const createAppointment = async (req, res) => {
  try {
    const { barbershopId } = req;
    const validation = validateAppointment(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const todayStr = getLocalDateString(new Date());
    const appointmentDate = req.body.date || todayStr;
    const appointmentTime = req.body.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const { barberId } = req.body;
    const durationMinutes = Number(req.body.durationMinutes || 45);

    const newAppointment = {
      id: `apt-${Date.now()}`,
      barberId,
      barberName: req.body.barberName || 'Barbero Asignado',
      clientName: req.body.clientName.trim(),
      clientPhone: req.body.clientPhone ? req.body.clientPhone.trim() : '',
      clientEmail: req.body.clientEmail ? req.body.clientEmail.trim() : '',
      serviceName: req.body.serviceName,
      durationMinutes,
      price: Number(req.body.price),
      tip: Number(req.body.tip || 0),
      paymentMethod: req.body.paymentMethod || 'CASH',
      status: req.body.status || AppointmentStatus.WAITING,
      date: appointmentDate,
      time: appointmentTime,
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');

    // 1. CHEQUEO ANTI-COLISIÓN EN MEMORIA (MOCK)
    if (isMock) {
      const collision = (tenantAppointments.data || []).find(
        a => a.barberId === barberId &&
             (a.date === appointmentDate || (!a.date && appointmentDate === todayStr)) &&
             a.status !== AppointmentStatus.CANCELLED &&
             checkSlotCollision(appointmentTime, a, durationMinutes)
      );

      if (collision) {
        return res.status(409).json({
          success: false,
          error: 'Slot Collision',
          message: `El barbero ya tiene una cita reservada a las ${collision.time} el día ${appointmentDate}. Por favor selecciona otro horario.`
        });
      }

      tenantAppointments.data.unshift(newAppointment);
      persistStore();
    } else {
      // 2. CHEQUEO Y ESCRITURA EN TRANSACCIÓN FIRESTORE REAL
      const queryExisting = await tenantAppointments
        .where('barberId', '==', barberId)
        .where('date', '==', appointmentDate)
        .get();

      const hasActive = queryExisting.docs.some(doc => {
        const d = doc.data();
        return d.status !== AppointmentStatus.CANCELLED && checkSlotCollision(appointmentTime, d, durationMinutes);
      });

      if (hasActive) {
        return res.status(409).json({
          success: false,
          error: 'Slot Collision',
          message: `El horario ${appointmentTime} para el ${appointmentDate} acaba de ser reservado por otro cliente. Por favor elige otro horario.`
        });
      }

      const docRef = await tenantAppointments.add(newAppointment);
      newAppointment.id = docRef.id;
    }

    // 3. Sincronización en tiempo real vía Socket.io a la sala de la barbería
    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('appointment:created', {
        barbershopId,
        appointment: newAppointment
      });
    }

    // 4. Disparo Automatizado de Confirmación (WhatsApp / Webhook)
    dispatchNotification(barbershopId, 'BOOKING_CONFIRMED', newAppointment).catch(console.error);

    // 5. Vincular automáticamente al historial del cliente en el CRM
    recordClientAppointment({
      barbershopId,
      clientName: newAppointment.clientName,
      clientPhone: newAppointment.clientPhone,
      clientEmail: newAppointment.clientEmail || '',
      serviceName: newAppointment.serviceName,
      barberId: newAppointment.barberId,
      barberName: newAppointment.barberName,
      price: newAppointment.price,
      date: newAppointment.date,
      time: newAppointment.time,
      status: newAppointment.status || 'WAITING'
    }).catch(err => console.warn('Aviso: sync CRM cita creada:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Cita agendada exitosamente sin conflicto de horario.',
      data: newAppointment
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Alternar activación o bloqueo manual de turno por parte del barbero o admin
 */
export const toggleSlot = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { barberId, date, time, times, blocked } = req.body;

    const timesToProcess = Array.isArray(times)
      ? times
      : (time ? [time] : []);

    if (!barberId || !date || timesToProcess.length === 0) {
      return res.status(400).json({ success: false, error: 'Parámetros requeridos: barberId, date, time o times' });
    }

    const blockKey = `${barbershopId}_${barberId}_${date}`;
    if (!mockStore.blockedSlots) mockStore.blockedSlots = {};
    if (!mockStore.blockedSlots[blockKey]) mockStore.blockedSlots[blockKey] = [];

    if (blocked) {
      timesToProcess.forEach(t => {
        if (!mockStore.blockedSlots[blockKey].includes(t)) {
          mockStore.blockedSlots[blockKey].push(t);
        }
      });
    } else {
      mockStore.blockedSlots[blockKey] = mockStore.blockedSlots[blockKey].filter(t => !timesToProcess.includes(t));
    }
    persistStore();

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('slots:updated', {
        barbershopId,
        barberId,
        date,
        blockedSlots: mockStore.blockedSlots[blockKey]
      });
    }

    return res.json({
      success: true,
      message: blocked ? `${timesToProcess.length} horario(s) pausados` : `${timesToProcess.length} horario(s) activados`,
      blockedSlots: mockStore.blockedSlots[blockKey]
    });
  } catch (error) {
    console.error('Error al alternar slot:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar estado de cita
 */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { status, paymentMethod, tip } = req.body;

    if (!Object.values(AppointmentStatus).includes(status)) {
      return res.status(400).json({ success: false, error: 'Estado de cita no válido' });
    }

    const updates = {
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(tip !== undefined && { tip: Number(tip) }),
      ...(status === AppointmentStatus.COMPLETED && { completedAt: new Date().toISOString() })
    };

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');

    if (isMock) {
      const index = tenantAppointments.data.findIndex(a => a.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Cita no encontrada' });
      }
      tenantAppointments.data[index] = { ...tenantAppointments.data[index], ...updates };
      persistStore();
      const currentApt = tenantAppointments.data[index];

      // Si la cita fue completada, registrar visita con pago en historial del cliente
      if (status === AppointmentStatus.COMPLETED && currentApt) {
        recordClientAppointment({
          barbershopId,
          clientName: currentApt.clientName,
          clientPhone: currentApt.clientPhone,
          clientEmail: currentApt.clientEmail || '',
          serviceName: currentApt.serviceName,
          barberId: currentApt.barberId,
          barberName: currentApt.barberName,
          price: Number(currentApt.price || 0) + Number(tip || 0),
          date: currentApt.date,
          time: currentApt.time,
          status: 'COMPLETED'
        }).catch(err => console.warn('Aviso: sync CRM cita completada:', err.message));
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('appointment:updated', {
          barbershopId,
          appointment: currentApt
        });
      }

      return res.json({
        success: true,
        data: currentApt
      });
    }

    const docRef = tenantAppointments.doc(id);
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };

    // Si la cita fue completada en Firestore real, sincronizar historial del cliente
    if (status === AppointmentStatus.COMPLETED && updatedData) {
      recordClientAppointment({
        barbershopId,
        clientName: updatedData.clientName,
        clientPhone: updatedData.clientPhone,
        clientEmail: updatedData.clientEmail || '',
        serviceName: updatedData.serviceName,
        barberId: updatedData.barberId,
        barberName: updatedData.barberName,
        price: Number(updatedData.price || 0) + Number(tip || 0),
        date: updatedData.date,
        time: updatedData.time,
        status: 'COMPLETED'
      }).catch(err => console.warn('Aviso: sync CRM cita completada firestore:', err.message));
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('appointment:updated', {
        barbershopId,
        appointment: updatedData
      });
    }

    return res.json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar / Cancelar cita de la agenda
 */
export const deleteAppointment = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');

    if (isMock) {
      const index = (tenantAppointments.data || []).findIndex(a => a.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Cita no encontrada' });
      }
      const deleted = tenantAppointments.data.splice(index, 1)[0];
      persistStore();

      const io = req.app.get('io');
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('appointment:cancelled', {
          barbershopId,
          appointmentId: id
        });
      }

      return res.json({
        success: true,
        message: 'Cita eliminada y cancelada exitosamente',
        data: deleted
      });
    }

    const docRef = tenantAppointments.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }
    const deletedData = { id: snap.id, ...snap.data() };
    await docRef.delete();

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('appointment:cancelled', {
        barbershopId,
        appointmentId: id
      });
    }

    return res.json({
      success: true,
      message: 'Cita eliminada y cancelada exitosamente',
      data: deletedData
    });
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
