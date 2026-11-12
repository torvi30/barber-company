import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db;
let isMock = false;

// In-Memory store for fast local development without requiring immediate GCP credentials
const mockStore = {
  barbershops: {
    'demo-barbershop-01': {
      id: 'demo-barbershop-01',
      name: 'Black & Gold Barber Club',
      slug: 'black-gold',
      businessType: 'barbershop',
      ownerName: 'Mateo Osorio',
      ownerEmail: 'mateo@blackgoldbarber.com',
      whatsapp: '+57 300 456 7890',
      municipality: 'Rionegro',
      department: 'Antioquia',
      address: 'Cra 50 #49-20, Parque Principal',
      currency: 'COP',
      storeEnabled: true,
      openingCashDefault: 100000,
      createdAt: new Date().toISOString(),
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro',
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(), // Vence en 25 días
      stripeCustomerId: 'cus_mock_barberpulse_01',
      stripeSubscriptionId: 'sub_mock_barberpulse_pro_01',
      planLimits: {
        maxBarbers: 15,
        whatsappAutomation: true,
        crmStyleSheets: true,
        advancedAnalytics: true,
        boutiqueStore: true
      }
    },
    'el-capitan-02': {
      id: 'el-capitan-02',
      name: 'El Capitán Barber Studio',
      slug: 'el-capitan',
      businessType: 'barbershop',
      ownerName: 'Julián Gómez',
      ownerEmail: 'julian@elcapitanbarber.com',
      whatsapp: '+57 312 987 6543',
      municipality: 'Marinilla',
      department: 'Antioquia',
      address: 'Calle 28 #30-15, Zona Rosa',
      currency: 'COP',
      storeEnabled: false,
      openingCashDefault: 80000,
      createdAt: new Date().toISOString(),
      subscriptionStatus: 'trial',
      subscriptionPlan: 'pro',
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // Vence en 3 días (ALERTA)
      stripeCustomerId: 'cus_mock_capitan_02',
      planLimits: {
        maxBarbers: 6,
        whatsappAutomation: true,
        crmStyleSheets: true,
        advancedAnalytics: true,
        boutiqueStore: true
      }
    },
    'elite-cuts-medellin': {
      id: 'elite-cuts-medellin',
      name: 'Elite Cuts Barbería & Grooming',
      slug: 'elite-cuts',
      businessType: 'barbershop',
      ownerName: 'Alejandro Ramírez',
      ownerEmail: 'alejandro@elitecuts.co',
      whatsapp: '+57 304 123 9876',
      municipality: 'Medellín',
      department: 'Antioquia',
      address: 'El Poblado, Cra 43A #7-50, Ed. Element',
      currency: 'COP',
      storeEnabled: true,
      openingCashDefault: 120000,
      createdAt: new Date().toISOString(),
      subscriptionStatus: 'active',
      subscriptionPlan: 'basic',
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(), // Vence en 12 días
      stripeCustomerId: 'cus_mock_elite_03',
      planLimits: {
        maxBarbers: 4,
        whatsappAutomation: false,
        crmStyleSheets: true,
        advancedAnalytics: false,
        boutiqueStore: false
      }
    }
  },
  barbers: {
    'demo-barbershop-01': [
      {
        id: 'barber-01',
        name: 'Carlos "FadeMaster" Ruiz',
        phone: '+57 300 111 2222',
        email: 'carlos.ruiz@barberpulse.io',
        commissionRate: 0.50,
        retailCommissionRate: 0.15,
        dailyTarget: 150000,
        active: true,
        status: 'IN_SERVICE',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80',
        specialties: ['Skin Fade', 'Ritual de Barba', 'Freestyle Designs'],
        schedule: {
          monday: { working: true, start: '09:00', end: '19:00' },
          tuesday: { working: true, start: '09:00', end: '19:00' },
          wednesday: { working: true, start: '09:00', end: '19:00' },
          thursday: { working: true, start: '09:00', end: '19:00' },
          friday: { working: true, start: '09:00', end: '20:00' },
          saturday: { working: true, start: '09:00', end: '15:00' },
          sunday: { working: false }
        }
      },
      {
        id: 'barber-02',
        name: 'Mateo "Blade" Morales',
        phone: '+57 300 333 4444',
        email: 'mateo.morales@barberpulse.io',
        commissionRate: 0.45,
        retailCommissionRate: 0.15,
        dailyTarget: 120000,
        active: true,
        status: 'AVAILABLE',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&q=80',
        specialties: ['Corte Clásico Pompadour', 'Afeitado Tradicional Toalla Caliente'],
        schedule: {
          monday: { working: true, start: '10:00', end: '20:00' },
          tuesday: { working: true, start: '10:00', end: '20:00' },
          wednesday: { working: true, start: '10:00', end: '20:00' },
          thursday: { working: true, start: '10:00', end: '20:00' },
          friday: { working: true, start: '10:00', end: '20:00' },
          saturday: { working: true, start: '10:00', end: '16:00' },
          sunday: { working: false }
        }
      },
      {
        id: 'barber-03',
        name: 'Leo "Scissors" Santana',
        phone: '+57 300 555 6666',
        email: 'leo.santana@barberpulse.io',
        commissionRate: 0.50,
        retailCommissionRate: 0.15,
        dailyTarget: 130000,
        active: true,
        status: 'BREAK',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?fit=crop&w=200&q=80',
        specialties: ['Tijera Texturizada', 'Tratamientos Capilares', 'Colorimetría'],
        schedule: {
          monday: { working: false },
          tuesday: { working: true, start: '09:00', end: '19:00' },
          wednesday: { working: true, start: '09:00', end: '19:00' },
          thursday: { working: true, start: '09:00', end: '19:00' },
          friday: { working: true, start: '09:00', end: '19:00' },
          saturday: { working: true, start: '09:00', end: '19:00' },
          sunday: { working: false }
        }
      }
    ],
    'el-capitan-02': [
      {
        id: 'capitan-barber-01',
        name: 'Julián "Capitán" Gómez',
        phone: '+57 312 987 6543',
        email: 'julian@elcapitanbarber.com',
        commissionRate: 0.50,
        retailCommissionRate: 0.15,
        dailyTarget: 140000,
        active: true,
        status: 'AVAILABLE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=200&q=80',
        specialties: ['Corte Clásico', 'Perfilado de Barba', 'Navaja Japonesa'],
        schedule: {
          monday: { working: true, start: '09:00', end: '19:00' },
          tuesday: { working: true, start: '09:00', end: '19:00' },
          wednesday: { working: true, start: '09:00', end: '19:00' },
          thursday: { working: true, start: '09:00', end: '19:00' },
          friday: { working: true, start: '09:00', end: '20:00' },
          saturday: { working: true, start: '09:00', end: '18:00' },
          sunday: { working: false }
        }
      }
    ],
    'elite-cuts-medellin': [
      {
        id: 'elite-barber-01',
        name: 'Alejandro "Elite" Ramírez',
        phone: '+57 304 123 9876',
        email: 'alejandro@elitecuts.co',
        commissionRate: 0.50,
        retailCommissionRate: 0.15,
        dailyTarget: 180000,
        active: true,
        status: 'AVAILABLE',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=200&q=80',
        specialties: ['Skin Fade', 'Barba Ritual', 'Black Mask'],
        schedule: {
          monday: { working: true, start: '09:00', end: '19:00' },
          tuesday: { working: true, start: '09:00', end: '19:00' },
          wednesday: { working: true, start: '09:00', end: '19:00' },
          thursday: { working: true, start: '09:00', end: '19:00' },
          friday: { working: true, start: '09:00', end: '20:00' },
          saturday: { working: true, start: '09:00', end: '18:00' },
          sunday: { working: false }
        }
      }
    ]
  },
  appointments: {
    'demo-barbershop-01': [
      {
        id: 'apt-001',
        barberId: 'barber-01',
        barberName: 'Carlos "FadeMaster" Ruiz',
        clientName: 'Alejandro Gómez',
        clientPhone: '+34 600 111 222',
        serviceName: 'Skin Fade + Barba Ritual',
        durationMinutes: 45,
        price: 35.00,
        tip: 5.00,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        completedAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'apt-002',
        barberId: 'barber-02',
        barberName: 'Mateo "Blade" Morales',
        clientName: 'Daniel Vega',
        clientPhone: '+34 600 333 444',
        serviceName: 'Corte Clásico',
        durationMinutes: 30,
        price: 25.00,
        tip: 3.00,
        paymentMethod: 'CARD',
        status: 'COMPLETED',
        date: new Date().toISOString().split('T')[0],
        time: '11:00',
        completedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'apt-003',
        barberId: 'barber-01',
        barberName: 'Carlos "FadeMaster" Ruiz',
        clientName: 'Javier Navarro',
        clientPhone: '+34 600 555 666',
        serviceName: 'Fade + Diseño Freestyle',
        durationMinutes: 45,
        price: 45.00,
        tip: 0.00,
        paymentMethod: 'TRANSFER',
        status: 'IN_CHAIR',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        completedAt: null
      }
    ],
    'el-capitan-02': [
      {
        id: 'apt-cap-01',
        barberId: 'barber-cap-01',
        barberName: 'Sebastián "El Capi" Ríos',
        clientName: 'Felipe Henao',
        clientPhone: '+57 311 444 5555',
        serviceName: 'Corte Clásico Ejecutivo',
        durationMinutes: 45,
        price: 30.00,
        tip: 5.00,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        date: new Date().toISOString().split('T')[0],
        time: '10:30',
        completedAt: new Date().toISOString()
      }
    ],
    'elite-cuts-medellin': [
      {
        id: 'apt-elite-01',
        barberId: 'barber-elite-01',
        barberName: 'Camilo "Master" Posada',
        clientName: 'Andrés Londoño',
        clientPhone: '+57 320 888 9999',
        serviceName: 'Full Grooming Experience',
        durationMinutes: 60,
        price: 55.00,
        tip: 10.00,
        paymentMethod: 'CARD',
        status: 'IN_CHAIR',
        date: new Date().toISOString().split('T')[0],
        time: '11:30',
        completedAt: null
      }
    ]
  },
  inventory: {
    'demo-barbershop-01': [
      {
        id: 'inv-01',
        name: 'Pomada Mate Fijación Fuerte (100ml)',
        category: 'FIJACION',
        sku: 'POM-MAT-01',
        stock: 18,
        minStock: 5,
        unitPrice: 18.00,
        costPrice: 8.50,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
        description: 'Acabado mate natural sin residuos. Fijación extrema durante 24 horas y base al agua lavable.',
        isPublic: true
      },
      {
        id: 'inv-02',
        name: 'Aceite Nutritivo para Barba Sándalo & Cedro',
        category: 'CUIDADO_BARBA',
        sku: 'OIL-SAN-02',
        stock: 12,
        minStock: 4,
        unitPrice: 22.00,
        costPrice: 9.00,
        image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80',
        description: 'Enriquecido con aceite de argán, jojoba y aroma amaderado. Suaviza e hidrata la piel bajo la barba.',
        isPublic: true
      },
      {
        id: 'inv-03',
        name: 'Loción Aftershave Eucalipto Refrescante',
        category: 'Afeitado',
        sku: 'AFT-EUC-03',
        stock: 8,
        minStock: 5,
        unitPrice: 16.00,
        costPrice: 6.00,
        image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=400&q=80',
        description: 'Cierra los poros y calma la irritación del afeitado clásico con extracto natural de mentol y hamamelis.',
        isPublic: true
      },
      {
        id: 'inv-04',
        name: 'Cera Brillante Pompadour Vintage (120ml)',
        category: 'FIJACION',
        sku: 'CER-VNT-04',
        stock: 15,
        minStock: 4,
        unitPrice: 20.00,
        costPrice: 8.00,
        image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80',
        description: 'Brillo alto clásico con fijación media-alta para peinados retro, quiffs y slick backs impecables.',
        isPublic: true
      },
      {
        id: 'inv-05',
        name: 'Shampoo Purificante Anti-Grasa con Carbón Activado',
        category: 'TRATAMIENTOS',
        sku: 'SHP-CRB-05',
        stock: 10,
        minStock: 3,
        unitPrice: 19.50,
        costPrice: 7.50,
        image: 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?auto=format&fit=crop&w=400&q=80',
        description: 'Limpia impurezas profundas y desintoxica el cuero cabelludo con carbón de bambú y árbol de té.',
        isPublic: true
      },
      {
        id: 'inv-06',
        name: 'Navaja Shavette Profesional Acero Japonés',
        category: 'HERRAMIENTAS',
        sku: 'NAV-JAP-06',
        stock: 6,
        minStock: 2,
        unitPrice: 35.00,
        costPrice: 16.00,
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80',
        description: 'Diseño ergonómico equilibrado con sistema de carga de media cuchilla estándar para perfilados al ras.',
        isPublic: true
      }
    ]
  },
  cash_closures: {
    'demo-barbershop-01': []
  },
  clients: {
    'demo-barbershop-01': [
      {
        id: 'cli-01',
        name: 'Alejandro Gómez',
        phone: '+34 600 111 222',
        email: 'alejandro.gomez@email.com',
        tier: 'VIP',
        totalVisits: 14,
        totalSpent: 490.00,
        lastVisit: '2026-11-05',
        preferredBarberId: 'barber-01',
        preferredBarberName: 'Carlos "FadeMaster" Ruiz',
        styleProfile: {
          haircutType: 'Mid Skin Fade + Texturizado Superior',
          guardSides: '0.5 con palanca abierta a 1.5 en zona parietal',
          topLength: 'Tijera de entresacar 3cm, peinado hacia la derecha',
          beardNotes: 'Perfilado a navaja japonesa recto, degradado suave en patillas',
          productPreference: 'Pomada Mate Fijación Fuerte (sin brillo)',
          technicalNotes: 'Sensibilidad en la nuca, siempre toalla fría al terminar.'
        },
        visitHistory: [
          { date: '2026-11-05', service: 'Skin Fade + Barba Ritual', price: 35.00, barber: 'Carlos Ruiz' },
          { date: '2026-10-18', service: 'Skin Fade + Pomada Mate', price: 53.00, barber: 'Carlos Ruiz' },
          { date: '2026-09-29', service: 'Corte Clásico', price: 25.00, barber: 'Carlos Ruiz' }
        ]
      },
      {
        id: 'cli-02',
        name: 'Daniel Vega',
        phone: '+34 600 333 444',
        email: 'daniel.vega@email.com',
        tier: 'REGULAR',
        totalVisits: 5,
        totalSpent: 145.00,
        lastVisit: '2026-11-06',
        preferredBarberId: 'barber-02',
        preferredBarberName: 'Mateo "Blade" Morales',
        styleProfile: {
          haircutType: 'Corte Clásico Ejecutivo Pompadour',
          guardSides: 'Peine #2 y #3 a máquina con degradado cónico',
          topLength: 'Largo para peinar hacia atrás con secador',
          beardNotes: 'Afeitado completo con toalla caliente',
          productPreference: 'Cera Brillante Vintage Pompadour',
          technicalNotes: 'Remolino pronunciado en coronilla.'
        },
        visitHistory: [
          { date: '2026-11-06', service: 'Corte Clásico', price: 25.00, barber: 'Mateo Morales' },
          { date: '2026-10-10', service: 'Corte Clásico + Aftershave', price: 41.00, barber: 'Mateo Morales' }
        ]
      },
      {
        id: 'cli-03',
        name: 'Javier Navarro',
        phone: '+34 600 555 666',
        email: 'j.navarro@email.com',
        tier: 'REENGAGEMENT_DUE', // Requiere recordatorio WhatsApp (>25 días sin corte)
        totalVisits: 2,
        totalSpent: 90.00,
        lastVisit: '2026-10-10',
        preferredBarberId: 'barber-01',
        preferredBarberName: 'Carlos "FadeMaster" Ruiz',
        styleProfile: {
          haircutType: 'Fade Freestyle + Línea Lateral',
          guardSides: 'Skin a navaja directa en contornos',
          topLength: 'Tijera estilo crop francés con flequillo despuntado',
          beardNotes: 'Barba de 3 días rebajada al #1',
          productPreference: 'Polvo Voluminizador / Pomada Mate',
          technicalNotes: 'Le gusta que marquen bien los cantos frontales.'
        },
        visitHistory: [
          { date: '2026-10-10', service: 'Fade Freestyle', price: 45.00, barber: 'Carlos Ruiz' },
          { date: '2026-09-02', service: 'Skin Fade', price: 35.00, barber: 'Carlos Ruiz' }
        ]
      }
    ]
  },
  notification_settings: {
    'demo-barbershop-01': {
      whatsappEnabled: true,
      emailEnabled: true,
      webhookEnabled: true,
      webhookUrl: 'https://webhook.site/demo-barberpulse-integration',
      triggers: {
        BOOKING_CONFIRMED: { active: true, label: 'Confirmación Inmediata de Reserva' },
        REMINDER_2_HOURS: { active: true, label: 'Recordatorio 2 Horas Antes' },
        REVIEW_REQUEST: { active: true, label: 'Solicitud de Reseña Google 1h Después' }
      },
      templates: {
        BOOKING_CONFIRMED: '¡Hola {{client_name}}! 💈 Tu cita para {{service_name}} con {{barber_name}} ha sido confirmada para el {{date}} a las {{time}} hrs en {{barbershop_name}}. ¡Te esperamos!',
        REMINDER_2_HOURS: 'Hola {{client_name}} ⏰ Te recordamos que en 2 horas tienes tu turno con {{barber_name}} ({{time}} hrs) en {{barbershop_name}} ({{address}}).',
        REVIEW_REQUEST: '¡Gracias por visitarnos hoy {{client_name}}! ⭐ ¿Qué tal te pareció tu corte con {{barber_name}}? Apóyanos con tu reseña en Google: https://g.page/barberpulse/review'
      }
    }
  },
  notification_logs: {
    'demo-barbershop-01': [
      {
        id: 'log-101',
        type: 'WHATSAPP',
        trigger: 'BOOKING_CONFIRMED',
        recipientName: 'Alejandro Gómez',
        recipientPhone: '+34 600 111 222',
        message: '¡Hola Alejandro! 💈 Tu cita para Skin Fade + Barba Ritual con Carlos FadeMaster ha sido confirmada para hoy a las 10:00 hrs.',
        status: 'DELIVERED',
        dispatchedAt: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'log-102',
        type: 'WHATSAPP',
        trigger: 'REMINDER_2_HOURS',
        recipientName: 'Daniel Vega',
        recipientPhone: '+34 600 333 444',
        message: 'Hola Daniel ⏰ Te recordamos que en 2 horas tienes tu turno con Mateo Blade (11:00 hrs) en Gran Vía 42.',
        status: 'DELIVERED',
        dispatchedAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'log-103',
        type: 'WEBHOOK',
        trigger: 'BOOKING_CONFIRMED',
        recipientName: 'Zapier / CRM Externo',
        recipientPhone: 'https://webhook.site/demo',
        message: 'Payload JSON emitido con éxito a endpoint externo.',
        status: 'DELIVERED',
        dispatchedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
  blockedSlots: {
    // Estructura: { 'tenantId_barberId_date': ['15:30', '16:00'] }
  },
  users: [
    {
      id: 'usr-admin-01',
      name: 'Mateo Osorio',
      email: 'mateo@blackgoldbarber.com',
      password: 'Demo2026',
      role: 'OWNER',
      tenantId: 'demo-barbershop-01',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-admin-02',
      name: 'Julián Gómez',
      email: 'julian@elcapitanbarber.com',
      password: 'Demo2026',
      role: 'OWNER',
      tenantId: 'el-capitan-02',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-admin-03',
      name: 'Alejandro Ramírez',
      email: 'alejandro@elitecuts.co',
      password: 'Demo2026',
      role: 'OWNER',
      tenantId: 'elite-cuts-medellin',
      active: true,
      createdAt: new Date().toISOString()
    }
  ]
};

try {
  if (process.env.USE_MOCK_FIRESTORE === 'true' || !process.env.FIREBASE_PROJECT_ID) {
    console.log('⚡ [Firestore] Usando Mock Store en memoria para desarrollo local rápido.');
    isMock = true;
  } else {
    // Inicialización oficial Firebase Admin SDK
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        admin.initializeApp({
          credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
      }
    }
    db = admin.firestore();
    console.log('🔥 [Firestore] Conexión establecida con Firebase Admin SDK.');
  }
} catch (error) {
  console.warn('⚠️ [Firestore] Fallo al inicializar Firebase Admin SDK, usando Mock Store de respaldo:', error.message);
  isMock = true;
}

/**
 * Tenant Subcollection Helper
 * Garantiza aislamiento estricto multi-tenant: /barbershops/{barbershopId}/{collectionName}
 */
export const getTenantCollection = (barbershopId, subcollection) => {
  if (isMock) {
    if (!mockStore[subcollection]) {
      mockStore[subcollection] = {};
    }
    if (!mockStore[subcollection][barbershopId]) {
      mockStore[subcollection][barbershopId] = [];
    }
    return {
      isMock: true,
      data: mockStore[subcollection][barbershopId],
      store: mockStore,
      barbershopId,
      subcollection
    };
  }

  // Instancia real de Firestore
  return db.collection('barbershops').doc(barbershopId).collection(subcollection);
};

export { db, isMock, mockStore };

