import { isMock, mockStore, db, persistStore } from '../config/firebase.js';

// Catálogo base de servicios para barberías — inicialización instantánea al crear un nuevo tenant
const BARBERSHOP_DEFAULTS = {
  staffTitle: 'Barbero Principal',
  services: [
    { id: 'srv-1', name: 'Corte', duration: 30, price: 25000, commissionRate: 0.50 },
    { id: 'srv-2', name: 'Barba', duration: 20, price: 18000, commissionRate: 0.50 },
    { id: 'srv-3', name: 'Cejas', duration: 15, price: 10000, commissionRate: 0.50 },
    { id: 'srv-4', name: 'Cera', duration: 15, price: 12000, commissionRate: 0.50 },
    { id: 'srv-5', name: 'Corte y Barba', duration: 45, price: 38000, commissionRate: 0.50 },
    { id: 'srv-6', name: 'Corte y Cejas', duration: 35, price: 30000, commissionRate: 0.50 },
    { id: 'srv-7', name: 'Corte y Cera', duration: 35, price: 32000, commissionRate: 0.50 },
    { id: 'srv-8', name: 'Barba y Cejas', duration: 25, price: 25000, commissionRate: 0.50 },
    { id: 'srv-9', name: 'Barba con Cera', duration: 25, price: 25000, commissionRate: 0.50 },
    { id: 'srv-10', name: 'Corte, Barba y Cejas', duration: 50, price: 45000, commissionRate: 0.50 },
    { id: 'srv-11', name: 'Corte, Barba y Cera', duration: 50, price: 48000, commissionRate: 0.50 },
    { id: 'srv-12', name: 'Combo Completo', duration: 60, price: 55000, commissionRate: 0.50 }
  ],
  products: [
    { id: 'prod-1', name: 'Cera Fijadora Mate Suavecito 120g', price: 45000, costPrice: 24000, stock: 15 },
    { id: 'prod-2', name: 'Óleo para Barba Wood & Spice 30ml', price: 38000, costPrice: 19000, stock: 10 }
  ]
};

/**
 * Genera un slug apto para URL a partir del nombre
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Onboarding de una nueva Barbería en BarberPulse OS
 * Siempre crea tenants de tipo 'barbershop' con servicios preconfigurados
 */
export const registerNewBusiness = async (req, res) => {
  try {
    const {
      name,
      municipality = 'Rionegro',
      department = 'Antioquia',
      address = '',
      whatsapp = '',
      ownerName = '',
      ownerEmail = '',
      currency = 'COP'
    } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'El nombre de la barbería es obligatorio (mínimo 3 caracteres)' });
    }

    const baseSlug = generateSlug(name);
    const tenantId = `tenant_${baseSlug.replace(/-/g, '_')}_${Math.floor(100 + Math.random() * 900)}`;
    const slug = `${baseSlug}-${Math.floor(10 + Math.random() * 89)}`;

    // Fecha de corte: 14 días de prueba gratuita (Trial)
    const trialDays = 14;
    const currentPeriodEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * trialDays).toISOString();

    // Siempre usamos los defaults de barbería
    const preset = BARBERSHOP_DEFAULTS;

    const newTenant = {
      id: tenantId,
      name: name.trim(),
      slug,
      businessType: 'barbershop',
      municipality: municipality.trim(),
      department: department.trim(),
      address: address.trim() || 'Dirección por registrar',
      whatsapp: whatsapp.trim() || '+573000000000',
      ownerName: ownerName.trim() || 'Administrador',
      ownerEmail: ownerEmail.trim() || `contacto@${slug}.com`,
      currency,
      openingCashDefault: currency === 'COP' ? 100000 : 50.00,
      createdAt: new Date().toISOString(),
      // Suscripción de Onboarding: 14 días gratis
      subscriptionStatus: 'trial',
      subscriptionPlan: 'pro',
      currentPeriodEnd,
      stripeCustomerId: `cus_trial_${tenantId}`,
      planLimits: {
        maxBarbers: 10,
        whatsappAutomation: true,
        crmStyleSheets: true,
        advancedAnalytics: true,
        boutiqueStore: true
      }
    };

    // Barbero inicial (el dueño / Barbero Principal)
    const initialBarber = {
      id: `staff_${Date.now()}`,
      name: ownerName || preset.staffTitle,
      phone: whatsapp,
      email: ownerEmail || `staff@${slug}.com`,
      commissionRate: 0.50,
      retailCommissionRate: 0.15,
      dailyTarget: currency === 'COP' ? 150000 : 150,
      active: true,
      status: 'AVAILABLE',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      specialties: preset.services.map(s => s.name),
      schedule: {
        monday: { working: true, start: '09:00', end: '19:00' },
        tuesday: { working: true, start: '09:00', end: '19:00' },
        wednesday: { working: true, start: '09:00', end: '19:00' },
        thursday: { working: true, start: '09:00', end: '19:00' },
        friday: { working: true, start: '09:00', end: '20:00' },
        saturday: { working: true, start: '09:00', end: '18:00' },
        sunday: { working: false }
      }
    };

    // Persistir en Firestore o MockStore
    if (isMock) {
      if (!mockStore.barbershops) mockStore.barbershops = {};
      mockStore.barbershops[tenantId] = newTenant;

      if (!mockStore.barbers) mockStore.barbers = {};
      mockStore.barbers[tenantId] = [initialBarber];

      if (!mockStore.appointments) mockStore.appointments = {};
      mockStore.appointments[tenantId] = [];

      if (!mockStore.inventory) mockStore.inventory = {};
      mockStore.inventory[tenantId] = preset.products;

      persistStore();
    } else {
      await db.collection('barbershops').doc(tenantId).set(newTenant);
      await db.collection('barbershops').doc(tenantId).collection('barbers').doc(initialBarber.id).set(initialBarber);

      // Precargar inventario de productos de barbería
      for (const prod of preset.products) {
        await db.collection('barbershops').doc(tenantId).collection('inventory').doc(prod.id).set(prod);
      }
    }

    console.log(`🎉 [Nueva Barbería Creada] ${newTenant.name} en ${municipality}. ID: ${tenantId}`);

    return res.status(201).json({
      success: true,
      message: `¡Felicitaciones! Tu barbería "${newTenant.name}" ha sido registrada con 14 días de prueba gratuita.`,
      data: {
        tenant: newTenant,
        initialStaff: initialBarber,
        presetServices: preset.services,
        publicLandingUrl: `http://localhost:5173/?slug=${slug}`
      }
    });
  } catch (error) {
    console.error('Error en onboarding de nueva barbería:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

