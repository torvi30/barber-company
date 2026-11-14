import { getTenantCollection, isMock, persistStore } from '../config/firebase.js';

/**
 * Obtener todos los barberos del tenant
 */
export const getBarbers = async (req, res) => {
  try {
    const { barbershopId } = req;
    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    if (isMock) {
      return res.json({ success: true, tenant: barbershopId, data: barbersCollection.data });
    }

    const snap = await barbersCollection.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, tenant: barbershopId, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener perfil de un barbero específico
 */
export const getBarberById = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    let barber = null;
    if (isMock) {
      barber = (barbersCollection.data || []).find(b => b.id === id);
    } else {
      const doc = await barbersCollection.doc(id).get();
      if (doc.exists) barber = { id: doc.id, ...doc.data() };
    }

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    }

    return res.json({ success: true, data: barber });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Portal Personal del Barbero (Métricas y Turnos del Día)
 */
export const getBarberPersonalDashboard = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params; // ID del barbero

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');
    const aptCollection = getTenantCollection(barbershopId, 'appointments');

    let barber = null;
    let appointments = [];

    if (isMock) {
      barber = (barbersCollection.data || []).find(b => b.id === id);
      appointments = aptCollection.data || [];
    } else {
      const barberDoc = await barbersCollection.doc(id).get();
      if (barberDoc.exists) barber = { id: barberDoc.id, ...barberDoc.data() };

      const aptSnap = await aptCollection.where('barberId', '==', id).get();
      appointments = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barbero no encontrado' });
    }

    // Filtrar citas asignadas a este barbero
    const myAppointments = appointments.filter(a => a.barberId === id);
    const completed = myAppointments.filter(a => a.status === 'COMPLETED');
    const inChair = myAppointments.filter(a => a.status === 'IN_CHAIR');
    const scheduledOrWaiting = myAppointments.filter(a => a.status === 'WAITING' || a.status === 'SCHEDULED');

    // Métricas de facturación y comisión
    const grossServices = completed.reduce((sum, a) => sum + Number(a.price || 0), 0);
    const tipsEarned = completed.reduce((sum, a) => sum + Number(a.tip || 0), 0);
    const rawRate = Number(barber.commissionRate !== undefined ? barber.commissionRate : 0.50);
    const rate = rawRate > 1 ? rawRate / 100 : rawRate;
    const commissionEarned = Number((grossServices * rate).toFixed(2));
    const totalPersonalEarnings = Number((commissionEarned + tipsEarned).toFixed(2));

    const dailyTarget = Number(barber.dailyGoal || barber.dailyTarget || 150000);
    const targetProgressPercent = dailyTarget > 0 ? Math.min(100, Number(((grossServices / dailyTarget) * 100).toFixed(1))) : 0;

    return res.json({
      success: true,
      barber: {
        id: barber.id,
        name: barber.name,
        avatar: barber.avatar,
        status: barber.status,
        commissionRate: rate,
        commissionPercent: Math.round(rate * 100),
        dailyTarget,
        schedule: barber.schedule
      },
      metrics: {
        servicesCount: completed.length,
        inChairCount: inChair.length,
        upcomingCount: scheduledOrWaiting.length,
        grossServices,
        commissionEarned,
        tipsEarned,
        totalPersonalEarnings,
        targetProgressPercent
      },
      appointments: {
        current: inChair[0] || null,
        upcoming: scheduledOrWaiting,
        history: completed
      }
    });
  } catch (error) {
    console.error('Error al generar dashboard personal del barbero:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar Estado en Vivo del Barbero (Disponible, En Sillón, Descanso)
 */
export const updateBarberStatus = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'IN_SERVICE', 'BREAK'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Estado no válido (AVAILABLE, IN_SERVICE, BREAK)' });
    }

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    if (isMock) {
      const barber = (barbersCollection.data || []).find(b => b.id === id);
      if (!barber) return res.status(404).json({ success: false, error: 'Barbero no encontrado' });

      barber.status = status;
      persistStore();

      // Broadcast Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('barber:status_updated', {
          barberId: id,
          status,
          barberName: barber.name,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({ success: true, message: 'Estado actualizado', data: barber });
    }

    const docRef = barbersCollection.doc(id);
    await docRef.update({ status });
    const updated = await docRef.get();

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('barber:status_updated', {
        barberId: id,
        status,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar Horario Semanal de Turnos (Rostering)
 */
export const updateBarberSchedule = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { schedule, dailyTarget, commissionRate } = req.body;

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    if (isMock) {
      const barber = (barbersCollection.data || []).find(b => b.id === id);
      if (!barber) return res.status(404).json({ success: false, error: 'Barbero no encontrado' });

      if (schedule) barber.schedule = schedule;
      if (dailyTarget !== undefined) barber.dailyTarget = Number(dailyTarget);
      if (commissionRate !== undefined) barber.commissionRate = Number(commissionRate);
      persistStore();

      return res.json({ success: true, message: 'Turno laboral actualizado', data: barber });
    }

    const docRef = barbersCollection.doc(id);
    const updates = {};
    if (schedule) updates.schedule = schedule;
    if (dailyTarget !== undefined) updates.dailyTarget = Number(dailyTarget);
    if (commissionRate !== undefined) updates.commissionRate = Number(commissionRate);

    await docRef.update(updates);
    const updated = await docRef.get();

    return res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Resumen General de Comisiones (Para el Gerente / Owner)
 */
export const getCommissionSummary = async (req, res) => {
  try {
    const { barbershopId } = req;
    const barbersCollection = getTenantCollection(barbershopId, 'barbers');
    const aptCollection = getTenantCollection(barbershopId, 'appointments');

    let barbers = isMock ? barbersCollection.data : (await barbersCollection.get()).docs.map(d => ({ id: d.id, ...d.data() }));
    let appointments = isMock ? aptCollection.data : (await aptCollection.get()).docs.map(d => ({ id: d.id, ...d.data() }));

    const completed = appointments.filter(a => a.status === 'COMPLETED');

    const summary = barbers.map(barber => {
      const barberApts = completed.filter(a => a.barberId === barber.id);
      const gross = barberApts.reduce((s, a) => s + Number(a.price || 0), 0);
      const tips = barberApts.reduce((s, a) => s + Number(a.tip || 0), 0);
      const rate = Number(barber.commissionRate || 0.5);
      const commission = gross * rate;

      return {
        barberId: barber.id,
        name: barber.name,
        servicesCount: barberApts.length,
        commissionRate: rate,
        grossServices: gross,
        commissionAmount: Number(commission.toFixed(2)),
        tipsAmount: Number(tips.toFixed(2)),
        totalPayout: Number((commission + tips).toFixed(2))
      };
    });

    return res.json({ success: true, data: summary });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Registrar un nuevo barbero en el equipo del salón
 */
export const createBarber = async (req, res) => {
  try {
    const { barbershopId } = req;
    const {
      name,
      phone = '',
      email = '',
      pin = '1234',
      commissionRate = 0.50,
      retailCommissionRate = 0.15,
      dailyTarget = 150000,
      specialties = ['Skin Fade', 'Ritual de Barba'],
      avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80',
      schedule
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre del especialista es obligatorio.' });
    }

    const defaultSchedule = schedule || {
      monday: { working: true, start: '09:00', end: '19:00' },
      tuesday: { working: true, start: '09:00', end: '19:00' },
      wednesday: { working: true, start: '09:00', end: '19:00' },
      thursday: { working: true, start: '09:00', end: '19:00' },
      friday: { working: true, start: '09:00', end: '20:00' },
      saturday: { working: true, start: '09:00', end: '18:00' },
      sunday: { working: false }
    };

    const newBarber = {
      id: `barber-${Date.now()}`,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      pin: pin ? String(pin).trim() : '1234',
      commissionRate: Number(commissionRate),
      retailCommissionRate: Number(retailCommissionRate),
      dailyTarget: Number(dailyTarget),
      dailyGoal: Number(dailyTarget),
      active: true,
      status: 'AVAILABLE',
      avatar: avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80',
      specialties: Array.isArray(specialties) ? specialties : specialties.split(',').map(s => s.trim()),
      schedule: defaultSchedule,
      createdAt: new Date().toISOString()
    };

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    if (isMock) {
      if (!barbersCollection.data) barbersCollection.data = [];
      barbersCollection.data.push(newBarber);
      persistStore();
    } else {
      const docRef = await barbersCollection.add(newBarber);
      newBarber.id = docRef.id;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('barber:created', {
        barbershopId,
        barber: newBarber
      });
    }

    return res.status(201).json({
      success: true,
      message: `Especialista "${newBarber.name}" registrado con éxito.`,
      data: newBarber
    });
  } catch (error) {
    console.error('Error al crear barbero:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Modificar datos de un barbero del equipo
 */
export const updateBarber = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      pin,
      commissionRate,
      retailCommissionRate,
      dailyTarget,
      specialties,
      avatar,
      active,
      status,
      schedule
    } = req.body;

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    if (isMock) {
      const index = (barbersCollection.data || []).findIndex(b => b.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Barbero no encontrado.' });
      }

      const current = barbersCollection.data[index];
      const updated = {
        ...current,
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(pin !== undefined && { pin: String(pin).trim() }),
        ...(commissionRate !== undefined && { commissionRate: Number(commissionRate) }),
        ...(retailCommissionRate !== undefined && { retailCommissionRate: Number(retailCommissionRate) }),
        ...(dailyTarget !== undefined && { dailyTarget: Number(dailyTarget), dailyGoal: Number(dailyTarget) }),
        ...(specialties !== undefined && { specialties: Array.isArray(specialties) ? specialties : specialties.split(',').map(s => s.trim()) }),
        ...(avatar !== undefined && { avatar }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(status !== undefined && { status }),
        ...(schedule !== undefined && { schedule })
      };

      barbersCollection.data[index] = updated;
      persistStore();

      const io = req.app.get('io');
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('barber:updated', {
          barbershopId,
          barber: updated
        });
      }

      return res.json({ success: true, message: 'Perfil de barbero actualizado', data: updated });
    } else {
      const docRef = barbersCollection.doc(id);
      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (email !== undefined) updates.email = email.trim();
      if (pin !== undefined) updates.pin = String(pin).trim();
      if (commissionRate !== undefined) updates.commissionRate = Number(commissionRate);
      if (retailCommissionRate !== undefined) updates.retailCommissionRate = Number(retailCommissionRate);
      if (dailyTarget !== undefined) {
        updates.dailyTarget = Number(dailyTarget);
        updates.dailyGoal = Number(dailyTarget);
      }
      if (specialties !== undefined) updates.specialties = Array.isArray(specialties) ? specialties : specialties.split(',').map(s => s.trim());
      if (avatar !== undefined) updates.avatar = avatar;
      if (active !== undefined) updates.active = Boolean(active);
      if (status !== undefined) updates.status = status;
      if (schedule !== undefined) updates.schedule = schedule;

      await docRef.update(updates);
      const snap = await docRef.get();
      const updated = { id: snap.id, ...snap.data() };

      return res.json({ success: true, message: 'Perfil de barbero actualizado', data: updated });
    }
  } catch (error) {
    console.error('Error al actualizar barbero:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar barbero del equipo
 */
export const deleteBarber = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    if (isMock) {
      const barber = (barbersCollection.data || []).find(b => b.id === id);
      if (!barber) {
        return res.status(404).json({ success: false, error: 'Barbero no encontrado.' });
      }

      barbersCollection.data = barbersCollection.data.filter(b => b.id !== id);
      persistStore();

      const io = req.app.get('io');
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('barber:deleted', {
          barbershopId,
          barberId: id
        });
      }

      return res.json({ success: true, message: `Barbero "${barber.name}" eliminado del equipo.` });
    } else {
      await barbersCollection.doc(id).delete();
      return res.json({ success: true, message: 'Barbero eliminado del equipo.' });
    }
  } catch (error) {
    console.error('Error al eliminar barbero:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Validar PIN de acceso rápido del Barbero (4 Dígitos)
 */
export const verifyBarberPin = async (req, res) => {
  try {
    const barbershopId = req.barbershopId || req.headers['x-barbershop-id'] || req.body.barbershopId;
    const { barberId, pin } = req.body;

    if (!barberId || !pin) {
      return res.status(400).json({ success: false, error: 'Barbero y PIN son obligatorios.' });
    }

    const barbersCollection = getTenantCollection(barbershopId, 'barbers');
    let barber = null;

    if (isMock) {
      barber = (barbersCollection.data || []).find(b => b.id === barberId);
    } else {
      const doc = await barbersCollection.doc(barberId).get();
      if (doc.exists) barber = { id: doc.id, ...doc.data() };
    }

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barbero no encontrado.' });
    }

    // PIN configurado o default 1234
    const expectedPin = barber.pin || '1234';
    if (String(pin).trim() !== String(expectedPin).trim()) {
      return res.status(401).json({ success: false, error: 'PIN incorrecto. Consulta con administración.' });
    }

    return res.json({
      success: true,
      message: `¡Bienvenido ${barber.name}!`,
      data: {
        id: barber.id,
        name: barber.name,
        avatar: barber.avatar,
        phone: barber.phone || barber.whatsapp || '',
        commissionRate: barber.commissionRate || 0.5,
        dailyTarget: barber.dailyTarget || barber.dailyGoal || 150000,
        role: 'barber',
        barbershopId
      }
    });
  } catch (error) {
    console.error('Error al verificar PIN de barbero:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
