import { getTenantCollection, isMock } from '../config/firebase.js';

/**
 * Obtener lista de clientes del tenant con métricas de fidelidad
 */
export const getClients = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { search = '', tier = '' } = req.query;
    const clientCollection = getTenantCollection(barbershopId, 'clients');

    let clients = [];

    if (isMock) {
      clients = clientCollection.data || [];
    } else {
      const snap = await clientCollection.get();
      clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Filtrar por término de búsqueda (nombre, teléfono)
    if (search) {
      const term = search.toLowerCase();
      clients = clients.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term)
      );
    }

    // Filtrar por nivel de fidelidad
    if (tier && tier !== 'ALL') {
      clients = clients.filter(c => c.tier === tier);
    }

    const vipCount = clients.filter(c => c.tier === 'VIP').length;
    const dueCount = clients.filter(c => c.tier === 'REENGAGEMENT_DUE').length;

    return res.json({
      success: true,
      count: clients.length,
      metrics: {
        totalClients: clients.length,
        vipClients: vipCount,
        dueForReminder: dueCount
      },
      data: clients
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener detalle de cliente y Ficha Técnica de Estilo
 */
export const getClientById = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const clientCollection = getTenantCollection(barbershopId, 'clients');

    let client = null;

    if (isMock) {
      client = (clientCollection.data || []).find(c => c.id === id);
    } else {
      const doc = await clientCollection.doc(id).get();
      if (doc.exists) client = { id: doc.id, ...doc.data() };
    }

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    return res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar Ficha Técnica de Estilo del Cliente
 */
export const updateClientStyleProfile = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { styleProfile } = req.body;

    if (!styleProfile) {
      return res.status(400).json({ success: false, error: 'Se requiere el objeto styleProfile' });
    }

    const clientCollection = getTenantCollection(barbershopId, 'clients');

    if (isMock) {
      const client = (clientCollection.data || []).find(c => c.id === id);
      if (!client) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });

      client.styleProfile = { ...client.styleProfile, ...styleProfile };
      return res.json({ success: true, message: 'Ficha técnica actualizada', data: client });
    }

    const docRef = clientCollection.doc(id);
    await docRef.update({ styleProfile });
    const updated = await docRef.get();

    return res.json({
      success: true,
      message: 'Ficha técnica actualizada exitosamente',
      data: { id: updated.id, ...updated.data() }
    });
  } catch (error) {
    console.error('Error al actualizar ficha técnica:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear nuevo cliente manualmente o sincronizado
 */
export const createClient = async (req, res) => {
  try {
    const { barbershopId } = req;
    const {
      name,
      phone,
      email = '',
      preferredBarberId = 'barber-01',
      preferredBarberName = 'Carlos FadeMaster',
      styleProfile = {}
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre y teléfono son obligatorios' });
    }

    const newClient = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      tier: 'NEW',
      totalVisits: 1,
      totalSpent: 0,
      lastVisit: new Date().toISOString().split('T')[0],
      preferredBarberId,
      preferredBarberName,
      styleProfile: {
        haircutType: styleProfile.haircutType || 'Corte Clásico / Fade',
        guardSides: styleProfile.guardSides || 'A convenir',
        topLength: styleProfile.topLength || 'Tijera normal',
        beardNotes: styleProfile.beardNotes || 'Sin notas de barba',
        productPreference: styleProfile.productPreference || 'Pomada Mate',
        technicalNotes: styleProfile.technicalNotes || ''
      },
      visitHistory: []
    };

    const clientCollection = getTenantCollection(barbershopId, 'clients');

    if (isMock) {
      if (!clientCollection.data) clientCollection.data = [];
      clientCollection.data.push(newClient);
    } else {
      const doc = await clientCollection.add(newClient);
      newClient.id = doc.id;
    }

    return res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: newClient
    });
  } catch (error) {
    console.error('Error al registrar cliente:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generador de Recordatorio Inteligente para WhatsApp
 */
export const getWhatsAppReminder = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const clientCollection = getTenantCollection(barbershopId, 'clients');

    let client = null;
    if (isMock) {
      client = (clientCollection.data || []).find(c => c.id === id);
    } else {
      const doc = await clientCollection.doc(id).get();
      if (doc.exists) client = doc.data();
    }

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const rawPhone = (client.phone || '').toString().replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 && rawPhone.startsWith('3') ? `57${rawPhone}` : rawPhone;
    const clientFirstName = client.name.split(' ')[0];
    const barber = client.preferredBarberName || 'tu barbero habitual';
    const style = client.styleProfile?.haircutType || 'tu corte habitual';

    const message = `¡Hola ${clientFirstName}! 💈 Te escribimos de tu barbería. Notamos que hace unos días no renuevas tu ${style}. ${barber} tiene algunos turnos disponibles esta semana. ¿Te reservamos un hueco para mantener ese perfil al día? Puedes reservar directo aquí: http://localhost:5173`;

    const encodedUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    return res.json({
      success: true,
      clientName: client.name,
      phone: client.phone,
      suggestedMessage: message,
      whatsappUrl: encodedUrl
    });
  } catch (error) {
    console.error('Error al generar recordatorio WhatsApp:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Registra o actualiza automáticamente una cita en el historial del cliente (CRM)
 */
export const recordClientAppointment = async ({
  barbershopId,
  clientName,
  clientPhone,
  clientEmail = '',
  serviceName,
  barberId = '',
  barberName = '',
  price = 0,
  date,
  time,
  status = 'SCHEDULED'
}) => {
  if (!barbershopId || !clientPhone || !clientName) return null;

  try {
    const clientCollection = getTenantCollection(barbershopId, 'clients');
    const cleanPhone = String(clientPhone).trim();
    const cleanName = String(clientName).trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');

    let client = null;
    let clientId = null;

    if (isMock) {
      if (!clientCollection.data) clientCollection.data = [];
      const match = clientCollection.data.find(c => {
        const cDigits = (c.phone || '').replace(/\D/g, '');
        return (cDigits && cleanDigits && cDigits === cleanDigits) ||
               (c.name && c.name.toLowerCase() === cleanName.toLowerCase());
      });
      if (match) {
        client = match;
        clientId = match.id;
      }
    } else {
      const snap = await clientCollection.where('phone', '==', cleanPhone).limit(1).get();
      if (!snap.empty) {
        clientId = snap.docs[0].id;
        client = { id: clientId, ...snap.docs[0].data() };
      }
    }

    const visitEntry = {
      id: `vis-${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '12:00',
      service: serviceName || 'Corte Personalizado',
      barber: barberName || 'Barbero Salón',
      price: Number(price) || 0,
      status: status,
      recordedAt: new Date().toISOString()
    };

    if (client) {
      const existingHistory = Array.isArray(client.visitHistory) ? client.visitHistory : [];
      const existingIdx = existingHistory.findIndex(v => v.date === visitEntry.date && (v.time === visitEntry.time || v.service === visitEntry.service));
      let updatedHistory = [];
      if (existingIdx >= 0) {
        updatedHistory = [...existingHistory];
        updatedHistory[existingIdx] = { ...updatedHistory[existingIdx], ...visitEntry };
      } else {
        updatedHistory = [visitEntry, ...existingHistory];
      }

      const isCompleted = status === 'COMPLETED';
      const visits = isCompleted ? (Number(client.totalVisits || 1) + 1) : (client.totalVisits || 1);
      const spent = isCompleted ? (Number(client.totalSpent || 0) + Number(price || 0)) : Number(client.totalSpent || 0);
      const tier = visits >= 5 ? 'VIP' : (visits >= 2 ? 'FREQUENT' : 'NEW');

      const updates = {
        name: client.name || cleanName,
        phone: cleanPhone,
        email: clientEmail || client.email || '',
        preferredBarberId: barberId || client.preferredBarberId,
        preferredBarberName: barberName || client.preferredBarberName,
        lastVisit: date || client.lastVisit,
        totalVisits: visits,
        totalSpent: spent,
        tier,
        visitHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      };

      if (isMock) {
        Object.assign(client, updates);
      } else {
        await clientCollection.doc(clientId).update(updates);
      }
      return { id: clientId, ...client, ...updates };
    } else {
      const newClient = {
        id: `cli-${Date.now()}`,
        name: cleanName,
        phone: cleanPhone,
        email: clientEmail ? clientEmail.trim() : '',
        tier: 'NEW',
        totalVisits: status === 'COMPLETED' ? 1 : 1,
        totalSpent: status === 'COMPLETED' ? Number(price || 0) : 0,
        lastVisit: date || new Date().toISOString().split('T')[0],
        preferredBarberId: barberId || 'barber-01',
        preferredBarberName: barberName || 'Barbero Asignado',
        styleProfile: {
          haircutType: serviceName || 'Corte Clásico / Fade',
          guardSides: 'A convenir en cita',
          topLength: 'Tijera normal',
          beardNotes: 'Sin notas aún',
          productPreference: 'Pomada Mate',
          technicalNotes: `Cliente registrado automáticamente al agendar turno (${date || ''} ${time || ''})`
        },
        visitHistory: [visitEntry],
        createdAt: new Date().toISOString()
      };

      if (isMock) {
        clientCollection.data.push(newClient);
      } else {
        const docRef = await clientCollection.add(newClient);
        newClient.id = docRef.id;
      }
      return newClient;
    }
  } catch (err) {
    console.error('Error al registrar cita en cliente CRM:', err);
    return null;
  }
};

/**
 * Añadir manualmente una visita o servicio al historial de un cliente existente
 */
export const addClientVisit = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { service, barber, price, date, time, notes } = req.body;

    if (!service) {
      return res.status(400).json({ success: false, error: 'El nombre del servicio es obligatorio' });
    }

    const clientCollection = getTenantCollection(barbershopId, 'clients');
    let client = null;

    if (isMock) {
      client = (clientCollection.data || []).find(c => c.id === id);
    } else {
      const doc = await clientCollection.doc(id).get();
      if (doc.exists) client = { id: doc.id, ...doc.data() };
    }

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const visitEntry = {
      id: `vis-${Date.now()}`,
      service: service.trim(),
      barber: barber || client.preferredBarberName || 'Barbero Salón',
      price: Number(price) || 0,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '12:00',
      notes: notes || '',
      status: 'COMPLETED',
      recordedAt: new Date().toISOString()
    };

    const currentHistory = Array.isArray(client.visitHistory) ? client.visitHistory : [];
    const updatedHistory = [visitEntry, ...currentHistory];
    const totalVisits = Number(client.totalVisits || 0) + 1;
    const totalSpent = Number(client.totalSpent || 0) + Number(price || 0);
    const tier = totalVisits >= 5 ? 'VIP' : (totalVisits >= 2 ? 'FREQUENT' : 'NEW');

    const updates = {
      visitHistory: updatedHistory,
      totalVisits,
      totalSpent,
      tier,
      lastVisit: visitEntry.date,
      updatedAt: new Date().toISOString()
    };

    if (isMock) {
      Object.assign(client, updates);
    } else {
      await clientCollection.doc(id).update(updates);
    }

    return res.status(201).json({
      success: true,
      message: 'Visita añadida al historial del cliente con éxito',
      data: { ...client, ...updates }
    });
  } catch (error) {
    console.error('Error al agregar visita al cliente:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

