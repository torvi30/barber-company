import { getTenantCollection, isMock, mockStore, persistStore, db } from '../config/firebase.js';
import { validateAppointment, AppointmentStatus } from '../models/schemas.js';
import { OPERATING_SLOTS, generateOperatingSlots, toMinutes, checkSlotCollision, getLocalDateString } from './appointmentController.js';
import { dispatchNotification } from '../services/notificationService.js';
import { recordClientAppointment } from './clientController.js';
import { DEFAULT_BARBERSHOP_PRODUCTS } from './inventoryController.js';

// Catálogo tradicional de servicios básicos de barbería
const DEFAULT_SERVICES = [
  { id: 'srv-01', name: 'Corte', durationMinutes: 30, price: 25000, description: 'Corte clásico o degradado (Fade / Skin Fade) con peinado y acabado.' },
  { id: 'srv-02', name: 'Barba', durationMinutes: 20, price: 18000, description: 'Arreglo, toalla caliente y perfilado de barba con navaja.' },
  { id: 'srv-03', name: 'Cejas', durationMinutes: 15, price: 10000, description: 'Limpieza y diseño de cejas masculinas con navaja.' },
  { id: 'srv-04', name: 'Cera', durationMinutes: 15, price: 12000, description: 'Depilación con cera en nariz, oídos o pómulos.' },
  { id: 'srv-05', name: 'Corte y Barba', durationMinutes: 45, price: 38000, description: 'Combo clásico: corte completo de cabello y ritual de barba.' },
  { id: 'srv-06', name: 'Corte y Cejas', durationMinutes: 35, price: 30000, description: 'Corte completo de cabello más diseño y perfilado de cejas.' },
  { id: 'srv-07', name: 'Corte y Cera', durationMinutes: 35, price: 32000, description: 'Corte de cabello completo con aplicación de cera depilatoria facial.' },
  { id: 'srv-08', name: 'Barba y Cejas', durationMinutes: 25, price: 25000, description: 'Arreglo de barba con navaja más limpieza y perfilado de cejas.' },
  { id: 'srv-09', name: 'Barba con Cera', durationMinutes: 25, price: 25000, description: 'Ritual de barba con toalla caliente y depilación de vellos con cera.' },
  { id: 'srv-10', name: 'Corte, Barba y Cejas', durationMinutes: 50, price: 45000, description: 'Combo tradicional completo: cabello, barba ritual y cejas.' },
  { id: 'srv-11', name: 'Corte, Barba y Cera', durationMinutes: 50, price: 48000, description: 'Corte de cabello, arreglo de barba y depilación facial con cera.' },
  { id: 'srv-12', name: 'Combo Completo', durationMinutes: 60, price: 55000, description: 'La experiencia total: Corte, Barba, Cejas y Cera en una sola sesión.' }
];

/**
 * Resolver barbería por SLUG público (ej: /black-gold o /el-capitan)
 */
export const getBarbershopBySlug = async (req, res) => {
  try {
    const slug = req.params.slug || req.query.slug || '';

    let barbershop = null;
    let barbers = [];

    if (isMock) {
      let match = null;
      if (slug && slug.trim()) {
        const cleanSlug = slug.trim().toLowerCase();
        match = Object.values(mockStore.barbershops).find(b => 
          (b.slug && b.slug.toLowerCase() === cleanSlug) || 
          (b.id && b.id.toLowerCase() === cleanSlug)
        );
        if (!match) {
          match = Object.values(mockStore.barbershops).find(b => 
            b.name && b.name.toLowerCase().includes(cleanSlug)
          );
        }
      }

      // Si no hubo coincidencia o slug venía vacío, tomar la primera barbería existente
      if (!match && Object.values(mockStore.barbershops).length > 0) {
        match = Object.values(mockStore.barbershops)[0];
      }

      // Si la base en memoria está totalmente vacía, proveer la barbería por defecto
      if (!match) {
        match = {
          id: 'black-gold',
          name: 'BarberPulse Studio',
          slug: 'black-gold',
          address: 'Calle 10 # 43E-28, El Poblado',
          phone: '+57 300 123 4567',
          whatsapp: '+57 300 123 4567',
          municipality: 'Medellín',
          department: 'Antioquia',
          currency: 'COP',
          storeEnabled: true
        };
        mockStore.barbershops['black-gold'] = match;
      }

      barbershop = match;
      const tenantBarbers = getTenantCollection(match.id, 'barbers');
      barbers = (tenantBarbers.data || []).filter(b => b.active !== false);

      // Si no hay barberos registrados en esta barbería, proveer barberos de demostración
      if (barbers.length === 0) {
        const defaultBarbers = [
          {
            id: `barber_${match.id}_1`,
            name: 'Carlos López',
            active: true,
            status: 'AVAILABLE',
            specialties: 'Fade, Barba Tradicional, Perfilado',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=150&q=80'
          },
          {
            id: `barber_${match.id}_2`,
            name: 'Andrés Morales',
            active: true,
            status: 'AVAILABLE',
            specialties: 'Corte Clásico, Diseños, Cejas',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&q=80'
          }
        ];
        tenantBarbers.data.push(...defaultBarbers);
        barbers = defaultBarbers;
      }
    } else {
      if (slug && slug.trim()) {
        const clean = slug.trim();
        const snapshot = await db.collection('barbershops').where('slug', '==', clean).limit(1).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          barbershop = { id: doc.id, ...doc.data() };
        } else {
          const docSnap = await db.collection('barbershops').doc(clean).get();
          if (docSnap.exists) {
            barbershop = { id: docSnap.id, ...docSnap.data() };
          }
        }
      }

      if (!barbershop) {
        const allSnap = await db.collection('barbershops').limit(1).get();
        if (!allSnap.empty) {
          const doc = allSnap.docs[0];
          barbershop = { id: doc.id, ...doc.data() };
        }
      }

      if (barbershop) {
        const barbersSnap = await db.collection('barbershops').doc(barbershop.id).collection('barbers').get();
        barbers = barbersSnap.docs.map(b => ({ id: b.id, ...b.data() })).filter(b => b.active !== false);
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
    const { barberId, date = getLocalDateString(new Date()), allowPast, interval = 30, buffer = 0 } = req.query;

    if (!barberId) {
      return res.status(400).json({ success: false, error: 'Parámetro barberId requerido.' });
    }

    // Resolver barbershopId desde el slug
    let barbershopId = slug;
    if (isMock) {
      const match = (slug && Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug)) || Object.values(mockStore.barbershops)[0];
      if (match) barbershopId = match.id;
    } else {
      if (slug) {
        const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
        if (!snap.empty) {
          barbershopId = snap.docs[0].id;
        } else {
          const docSnap = await db.collection('barbershops').doc(slug).get();
          if (docSnap.exists) barbershopId = docSnap.id;
        }
      }
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
        return { time, available: false, reason: 'BLOCKED' };
      }

      const collisionApt = appointments.find(apt => checkSlotCollision(time, apt, slotInterval, bufferTime));
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
      const match = (slug && Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug)) || Object.values(mockStore.barbershops)[0];
      if (match) barbershopId = match.id;
    } else {
      if (slug) {
        const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
        if (!snap.empty) {
          barbershopId = snap.docs[0].id;
        } else {
          const docSnap = await db.collection('barbershops').doc(slug).get();
          if (docSnap.exists) barbershopId = docSnap.id;
        }
      }
    }

    const tenantAppointments = getTenantCollection(barbershopId, 'appointments');
    const todayStr = getLocalDateString(new Date());
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
      if (mockStore.appointments) {
        mockStore.appointments[barbershopId] = tenantAppointments.data;
      }
      persistStore();
    } else {
      const docRef = await tenantAppointments.add(newAppointment);
      newAppointment.id = docRef.id;
    }

    // 3. BROADCAST SOCKET.IO EN TIEMPO REAL
    const io = req.app.get('io');
    if (io) {
      // Emitir a la sala del tenant
      io.to(`barbershop:${barbershopId}`).emit('appointment:created', {
        barbershopId,
        appointment: newAppointment
      });
      // Emitir también a nivel raíz para clientes conectados a nodriza
      io.emit('appointment:created', {
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
      const match = (slug && Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug)) || Object.values(mockStore.barbershops)[0];
      if (match) barbershopId = match.id;
    } else {
      if (slug) {
        const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
        if (!snap.empty) {
          barbershopId = snap.docs[0].id;
        } else {
          const docSnap = await db.collection('barbershops').doc(slug).get();
          if (docSnap.exists) barbershopId = docSnap.id;
        }
      }
    }

    const tenantInventory = getTenantCollection(barbershopId, 'inventory');
    let products = [];

    if (isMock) {
      if (!tenantInventory.data || tenantInventory.data.length === 0) {
        tenantInventory.data = JSON.parse(JSON.stringify(DEFAULT_BARBERSHOP_PRODUCTS));
        if (mockStore.inventory) {
          mockStore.inventory[barbershopId] = tenantInventory.data;
        }
        persistStore();
      }
      products = (tenantInventory.data || []).filter(item => item.isPublic !== false);
    } else {
      const snap = await tenantInventory.where('isPublic', '==', true).get();
      if (snap.empty) {
        for (const item of DEFAULT_BARBERSHOP_PRODUCTS) {
          await tenantInventory.doc(item.id).set(item);
        }
        products = DEFAULT_BARBERSHOP_PRODUCTS;
      } else {
        products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
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
      const match = (slug && Object.values(mockStore.barbershops).find(b => b.slug === slug || b.id === slug)) || Object.values(mockStore.barbershops)[0];
      if (match) barbershopId = match.id;
    } else {
      if (slug) {
        const snap = await db.collection('barbershops').where('slug', '==', slug).limit(1).get();
        if (!snap.empty) {
          barbershopId = snap.docs[0].id;
        } else {
          const docSnap = await db.collection('barbershops').doc(slug).get();
          if (docSnap.exists) barbershopId = docSnap.id;
        }
      }
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

/**
 * Autenticación Rápida de Barbero por PIN (Pública / Móvil)
 */
export const publicBarberPinLogin = async (req, res) => {
  try {
    const slug = req.params.slug || req.query.slug || '';
    const { barberId, pin } = req.body;

    if (!barberId || !pin) {
      return res.status(400).json({ success: false, error: 'Barbero y PIN son obligatorios.' });
    }

    let barbershop = null;
    if (isMock) {
      if (slug && slug.trim()) {
        const cleanSlug = slug.trim().toLowerCase();
        barbershop = Object.values(mockStore.barbershops).find(b =>
          (b.slug && b.slug.toLowerCase() === cleanSlug) ||
          (b.id && b.id.toLowerCase() === cleanSlug)
        );
      }
      if (!barbershop && Object.values(mockStore.barbershops).length > 0) {
        barbershop = Object.values(mockStore.barbershops)[0];
      }
    } else {
      if (slug && slug.trim()) {
        const snap = await db.collection('barbershops').where('slug', '==', slug.trim()).limit(1).get();
        if (!snap.empty) {
          barbershop = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      if (!barbershop) {
        const snap = await db.collection('barbershops').limit(1).get();
        if (!snap.empty) barbershop = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    }

    if (!barbershop) {
      return res.status(404).json({ success: false, error: 'Barbería no encontrada.' });
    }

    const tenantId = barbershop.id;
    const barbersCollection = getTenantCollection(tenantId, 'barbers');
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

    const expectedPin = barber.pin || '1234';
    if (String(pin).trim() !== String(expectedPin).trim()) {
      return res.status(401).json({ success: false, error: 'PIN incorrecto. Consulta con tu administrador.' });
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
        barbershopId: tenantId,
        barbershopName: barbershop.name
      }
    });
  } catch (error) {
    console.error('Error al autenticar barbero con PIN:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

