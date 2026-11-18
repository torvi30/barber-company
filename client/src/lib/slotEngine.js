/**
 * =========================================================================
 * Motor Inteligente de Franjas Horarias y Detección de Colisiones
 * Soporta cadencias dinámicas (30, 40, 45, 60 min), tiempos de colchón y
 * duraciones específicas por servicio (ej. Corte 30m, Corte y Barba 45m).
 * =========================================================================
 */

export const SLOT_INTERVAL_OPTIONS = [
  { value: 30, label: '30 min', icon: '⚡', subtitle: 'Ritmo Express' },
  { value: 40, label: '40 min', icon: '💈', subtitle: 'Ritmo Estándar' },
  { value: 45, label: '45 min', icon: '⏱️', subtitle: 'Ritmo Clásico' },
  { value: 60, label: '60 min (1h)', icon: '👑', subtitle: 'Ritmo VIP' }
];

export const BUFFER_TIME_OPTIONS = [
  { value: 0, label: '0 min', subtitle: 'Sin colchón' },
  { value: 5, label: '+5 min', subtitle: 'Limpieza de cuchillas' },
  { value: 10, label: '+10 min', subtitle: 'Colchón de seguridad' },
  { value: 15, label: '+15 min', subtitle: 'Desinfección / Descanso' }
];

export const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const checkSlotCollision = (slotTime, slotInterval, appointment, bufferTime = 0) => {
  if (!slotTime || !appointment?.time) return false;
  const slotStart = timeToMinutes(slotTime);
  const slotEnd = slotStart + Number(slotInterval || 30);
  const aptStart = timeToMinutes(appointment.time);
  const aptDuration = Number(appointment.durationMinutes || appointment.duration || 45);
  const aptEnd = aptStart + aptDuration + Number(bufferTime || 0);

  return slotStart < aptEnd && slotEnd > aptStart;
};

export const generateDynamicSlots = ({
  date,
  barber,
  appointments = [],
  manualBlocked = [],
  slotInterval = 30,
  bufferTime = 0,
  allowPast = false
}) => {
  const interval = Number(slotInterval) || 30;
  const buffer = Number(bufferTime) || 0;

  // Determinar jornada del barbero para el día de la semana
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let dayIndex = 1;
  try {
    dayIndex = new Date(`${date}T12:00:00`).getDay();
    if (isNaN(dayIndex)) dayIndex = 1;
  } catch {
    dayIndex = 1;
  }
  const dayName = dayNames[dayIndex] || 'monday';

  const daySchedule = barber?.schedule?.[dayName] || {
    working: dayName !== 'sunday',
    start: '09:00',
    end: dayName === 'friday' ? '20:00' : '19:00'
  };

  const startTimeStr = daySchedule.start || '09:00';
  const endTimeStr = daySchedule.end || '20:00';
  const startMin = timeToMinutes(startTimeStr);
  const endMin = timeToMinutes(endTimeStr);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Filtrar citas del barbero para la fecha especificada que no estén canceladas
  const barberAppointments = (appointments || []).filter(a => {
    if (!a) return false;
    const sameBarber = String(a.barberId) === String(barber?.id);
    const sameDate = a.date === date || (!a.date && date === todayStr);
    const notCancelled = a.status !== 'CANCELLED';
    return sameBarber && sameDate && notCancelled;
  });

  const slots = [];

  for (let current = startMin; current + interval <= endMin; current += interval) {
    const timeStr = minutesToTime(current);

    if (daySchedule.working === false) {
      slots.push({ time: timeStr, available: false, reason: 'DAY_OFF' });
      continue;
    }

    if (!allowPast && (date < todayStr || (date === todayStr && current <= nowMin))) {
      slots.push({ time: timeStr, available: false, reason: 'PAST' });
      continue;
    }

    if (Array.isArray(manualBlocked) && manualBlocked.includes(timeStr)) {
      slots.push({ time: timeStr, available: false, reason: 'BLOCKED_MANUALLY' });
      continue;
    }

    const collisionApt = barberAppointments.find(apt =>
      checkSlotCollision(timeStr, interval, apt, buffer)
    );

    if (collisionApt) {
      slots.push({
        time: timeStr,
        available: false,
        reason: 'BOOKED',
        clientName: collisionApt.clientName || 'Cliente',
        serviceName: collisionApt.serviceName || 'Servicio',
        durationMinutes: collisionApt.durationMinutes || collisionApt.duration || 45
      });
      continue;
    }

    slots.push({
      time: timeStr,
      available: true,
      reason: 'OPEN'
    });
  }

  const availableSlots = slots.filter(s => s.available);

  return {
    slots,
    availableSlots,
    totalSlots: slots.length,
    availableCount: availableSlots.length,
    interval,
    buffer
  };
};
