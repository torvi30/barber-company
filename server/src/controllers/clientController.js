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

    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
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

