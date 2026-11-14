import { getTenantCollection, isMock, mockStore, db } from '../config/firebase.js';
import { validateAppointment, AppointmentStatus } from '../models/schemas.js';
import { OPERATING_SLOTS, toMinutes, checkSlotCollision } from './appointmentController.js';
import { dispatchNotification } from '../services/notificationService.js';
import { recordClientAppointment } from './clientController.js';

// Catálogo maestro tradicional de servicios de barbería
const DEFAULT_SERVICES = [
  { id: 'srv-01', name: 'Corte de Cabello (Fade / Clásico)', durationMinutes: 35, price: 25000, description: 'Corte clásico o degradado (Fade / Skin Fade) con acabado profesional y peinado.' },
  { id: 'srv-02', name: 'Arreglo & Ritual de Barba', durationMinutes: 25, price: 18000, description: 'Perfilado con navaja tradicional, toalla caliente y aplicación de bálsamo/óleo.' },
  { id: 'srv-03', name: 'Perfilado de Cejas con Navaja', durationMinutes: 15, price: 10000, description: 'Diseño y limpieza de cejas masculinas con navaja descartable.' },
  { id: 'srv-04', name: 'Combo Tradicional: Corte + Barba', durationMinutes: 50, price: 38000, description: 'Servicio combinado clásico: corte de cabello completo y ritual de toalla para barba.' },
  { id: 'srv-05', name: 'Combo: Corte + Cejas', durationMinutes: 40, price: 30000, description: 'Corte de precisión y alineación milimétrica de cejas.' },
  { id: 'srv-06', name: 'Combo VIP: Corte + Barba + Cejas', durationMinutes: 60, price: 45000, description: 'La experiencia completa tradicional: corte, barba y cejas en una sola sesión.' }
];

/**
 * Resolver barbería por SLUG público (ej: /black-gold o /el-capitan)
 */
export const getBarbershopBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let barbershop = null;
    let barbers = [];

    if (isMock) {
      const match = Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug);
      if (match) {
        barbershop = match;
        barbers = (mockStore.barbers[match.id] || []).filter(b => b.active);
      }
    } else {
      const snapshot = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        barbershop = { id: doc.id, ...doc.data() };

        const barbersSnap = await doc.ref.collection('barbers').where('active', '==', true).get();
        barbers = barbersSnap.docs.map(b => ({ id: b.id, ...b.data() }));
      }
    }

    if (!barbershop) {
      return res.status(404).json({
        success: false,
        error: 'Barbershop Not Found',
        message: `No se encontró ninguna barbería registrada con el slug "${slug}".`
      });
    }

    return res.json({
      success: true,
      data: {
        id: barbershop.id,
        name: barbershop.name,
        slug: barbershop.slug,
        address: barbershop.address,
        phone: barbershop.phone || barbershop.whatsapp,
        whatsapp: barbershop.whatsapp || barbershop.phone || '+573004567890',
        currency: barbershop.currency || 'COP',
        storeEnabled: barbershop.storeEnabled !== false,
        barbers: barbers.map(b => ({
          id: b.id,
          name: b.name,
          status: b.status || 'AVAILABLE',
          avatar: b.avatar || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&q=80`
        })),
        services: DEFAULT_SERVICES
      }
    });
  } catch (error) {
    console.error('Error al resolver barbería por slug:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Horarios disponibles públicos para un barbero y fecha en una barbería
 * Sincronizado 100% con recepción y motor anti-colisión
 */
export const getPublicSlots = async (req, res) => {
  try {
    const { slug } = req.params;
    const { barberId, date = new Date().toISOString().split('T')[0] } = req.query;

    if (!barberId) {
      return res.status(400).json({ success: false, error: 'Parámetro barberId requerido.' });
    }

    // Resolver barbershopId desde el slug
    let barbershopId = slug;
    if (isMock) {
      const match = Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug);
      if (match) barbershopId = match.id;
    } else {
      const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
      if (!snap.empty) barbershopId = snap.docs[0].id;
    }

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');
    let appointments = [];
    const todayStr = new Date().toISOString().split('T')[0];

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
    const daySchedule = barber?.schedule?.[dayName];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = OPERATING_SLOTS.map(time => {
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
      if (date === todayStr && slotMinutes <= currentMinutes) {
        return { time, available: false, reason: 'PAST' };
      }
      if (manualBlocked.includes(time)) {
        return { time, available: false, reason: 'BLOCKED' };
      }

      const collisionApt = appointments.find(apt => checkSlotCollision(time, apt));
      if (collisionApt) {
        return { time, available: false, reason: 'OCCUPIED' };
      }

      return { time, available: true, reason: 'FREE' };
    });

    const availableSlots = slots.filter(s => s.available);

    return res.json({
      success: true,
      slug,
      barberId,
      date,
      totalSlots: slots.length,
      availableCount: availableSlots.length,
      slots,
      availableSlots
    });
  } catch (error) {
    console.error('Error al consultar slots públicos:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear reserva pública desde la Landing del cliente (Anti-Colisión Garantizada)
 */
export const createPublicBooking = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      barberId,
      barberName,
      clientName,
      clientPhone,
      clientEmail,
      serviceName,
      durationMinutes = 45,
      price,
      date,
      time,
      notes = ''
    } = req.body;

    if (!barberId || !clientName || !clientPhone || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Campos obligatorios faltantes (barberId, clientName, clientPhone, date, time)'
      });
    }

    // Resolver barbershopId
    let barbershopId = slug;
    if (isMock) {
      const match = Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug);
      if (match) barbershopId = match.id;
    } else {
      const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
      if (!snap.empty) {
        barbershopId = snap.docs[0].id;
      }
    }

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');
    const todayStr = new Date().toISOString().split('T')[0];
    const duration = Number(durationMinutes || 45);

    // 1. CHEQUEO ANTI-COLISIÓN
    if (isMock) {
      const collision = (tenantAppointments.data || []).find(
        a => a.barberId === barberId &&
             (a.date === date || (!a.date && date === todayStr)) &&
             a.status !== AppointmentStatus.CANCELLED &&
             checkSlotCollision(time, a, duration)
      );

      if (collision) {
        return res.status(409).json({
          success: false,
          error: 'Slot Already Booked',
          message: `El barbero ya no tiene disponible las ${time} para el día ${date}. Por favor elige otro horario.`
        });
      }
    } else {
      const queryExisting = await tenantAppointments
        .where('barberId', '==', barberId)
        .where('date', '==', date)
        .get();

      const hasActive = queryExisting.docs.some(doc => {
        const d = doc.data();
        return d.status !== AppointmentStatus.CANCELLED && checkSlotCollision(time, d, duration);
      });

      if (hasActive) {
        return res.status(409).json({
          success: false,
          error: 'Slot Already Booked',
          message: `El horario ${time} para el ${date} acaba de ser reservado. Por favor selecciona otro horario.`
        });
      }
    }

    // 2. CREACIÓN DEL TURNO
    const newAppointment = {
      id: `apt-${Date.now()}`,
      barberId,
      barberName: barberName || 'Barbero Asignado',
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail ? clientEmail.trim() : '',
      serviceName: serviceName || 'Corte Personalizado',
      durationMinutes: duration,
      price: Number(price || 30),
      tip: 0,
      paymentMethod: 'CASH',
      status: AppointmentStatus.SCHEDULED,
      date,
      time,
      notes,
      source: 'PUBLIC_LANDING',
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    if (isMock) {
      if (!tenantAppointments.data) tenantAppointments.data = [];
      tenantAppointments.data.unshift(newAppointment);
    } else {
      const docRef = await tenantAppointments.add(newAppointment);
      newAppointment.id = docRef.id;
    }

    // 3. BROADCAST SOCKET.IO EN TIEMPO REAL
    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('appointment:created', {
        barbershopId,
        appointment: newAppointment
      });
    }

    // 4. DISPARO AUTOMATIZADO WHATSAPP / WEBHOOK
    dispatchNotification(barbershopId, 'BOOKING_CONFIRMED', newAppointment).catch(console.error);

    // 5. REGISTRAR O VINCULAR AUTOMÁTICAMENTE AL CLIENTE EN EL HISTORIAL CRM
    recordClientAppointment({
      barbershopId,
      clientName: newAppointment.clientName,
      clientPhone: newAppointment.clientPhone,
      clientEmail: newAppointment.clientEmail,
      serviceName: newAppointment.serviceName,
      barberId: newAppointment.barberId,
      barberName: newAppointment.barberName,
      price: newAppointment.price,
      date: newAppointment.date,
      time: newAppointment.time,
      status: 'SCHEDULED'
    }).catch(err => console.warn('Aviso: sync CRM cliente reserva pública:', err.message));

    return res.status(201).json({
      success: true,
      message: '¡Tu turno ha sido confirmado con éxito!',
      data: newAppointment
    });
  } catch (error) {
    console.error('Error al registrar reserva pública:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Catálogo público de productos para venta online / Click & Collect
 */
export const getPublicProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    let barbershopId = slug;

    if (isMock) {
      const match = Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug);
      if (match) barbershopId = match.id;
    } else {
      const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
      if (!snap.empty) barbershopId = snap.docs[0].id;
    }

    const tenantInventory = getTenantCollection(barbershopId, 'inventory');
    let products = [];

    if (isMock) {
      products = (tenantInventory.data || []).filter(item => item.isPublic !== false);
    } else {
      const snap = await tenantInventory.where('isPublic', '==', true).get();
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return res.json({
      success: true,
      slug,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error al obtener productos públicos:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear pedido de productos para recoger en tienda o entrega
 */
export const createPublicOrder = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      clientName,
      clientPhone,
      items = [], // [{ id, name, unitPrice, qty }]
      paymentPreference = 'STORE_PICKUP', // 'STORE_PICKUP', 'BIZUM', 'CARD'
      notes = ''
    } = req.body;

    if (!clientName || !clientPhone || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe ingresar nombre, teléfono y al menos un producto en el carrito.'
      });
    }

    let barbershopId = slug;
    if (isMock) {
      const match = Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug);
      if (match) barbershopId = match.id;
    } else {
      const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
      if (!snap.empty) barbershopId = snap.docs[0].id;
    }

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.qty)), 0);

    const newOrder = {
      id: `ord-${Date.now()}`,
      clientName,
      clientPhone,
      items,
      totalAmount: Number(totalAmount.toFixed(2)),
      paymentPreference,
      status: 'PENDING_PREPARATION', // 'PENDING_PREPARATION', 'READY', 'DELIVERED'
      notes,
      createdAt: new Date().toISOString()
    };

    // Descontar inventario
    const tenantInventory = getTenantCollection(barbershopId, 'inventory');
    if (isMock) {
      items.forEach(orderItem => {
        const prod = (tenantInventory.data || []).find(p => p.id === orderItem.id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - orderItem.qty);
        }
      });
    }

    // Emitir alerta a la recepción por Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('order:created', {
        barbershopId,
        order: newOrder
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Pedido registrado con éxito. Te avisaremos cuando esté listo para recoger.',
      data: newOrder
    });
  } catch (error) {
    console.error('Error al crear pedido público:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

