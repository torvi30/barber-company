import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * =========================================================================
 * BarberPulse OS — Firestore Multi-Tenant Service (Plan Spark)
 * Aislamiento estricto por subcolecciones:
 * /barbershops/{tenantId}/[subcollection]
 * Compatible 100% con el Plan Gratuito (Spark) de Firebase.
 * =========================================================================
 */

// --- 1. BARBERÍAS / EMPRESAS (CASA NODRIZA) ---
export async function saveFirestoreTenant(tenant) {
  if (!tenant || !tenant.id) return null;
  try {
    const docRef = doc(db, 'barbershops', tenant.id);
    await setDoc(docRef, {
      ...tenant,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return tenant;
  } catch (err) {
    console.warn('Firestore notice (saveTenant):', err.message);
    return tenant;
  }
}

export const INITIAL_SEED_TENANTS = [
  {
    id: "tenant_imperio_barber_01",
    name: "Imperio Barbershop",
    slug: "imperio-barber",
    businessType: "barbershop",
    municipality: "Marinilla",
    department: "Antioquia",
    address: "Cra 50 # 48-12, Parque Principal",
    whatsapp: "+57 311 456 7890",
    phone: "+57 311 456 7890",
    ownerName: "Victor Tamayo",
    ownerEmail: "victortamayopine@gmail.com",
    currency: "COP",
    openingCashDefault: 100000,
    subscriptionStatus: "active",
    subscriptionPlan: "pro",
    logoUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?fit=crop&w=300&q=80",
    slogan: "El Santuario del Caballero Moderno",
    storeEnabled: true,
    barbers: [
      {
        id: "barber_imp_1",
        name: "Mateo Restrepo",
        whatsapp: "3124567891",
        email: "mateo.restrepo@imperio.com",
        commissionRate: 50,
        dailyGoal: 180000,
        specialties: "Skin Fade, Ritual de Toalla Caliente, Barba Tradicional",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "barber_imp_2",
        name: "Sebastián Gómez",
        whatsapp: "3124567892",
        email: "sebastian.gomez@imperio.com",
        commissionRate: 50,
        dailyGoal: 150000,
        specialties: "Corte Clásico a Tijera, Peinado Pompadour, Perfilado Cejas",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "barber_imp_3",
        name: "David Henao",
        whatsapp: "3124567893",
        email: "david.henao@imperio.com",
        commissionRate: 50,
        dailyGoal: 160000,
        specialties: "Mid Fade, Diseños Freestyle, Barba Completa con Navaja",
        avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      }
    ]
  },
  {
    id: "tenant_la_fortaleza_02",
    name: "La Fortaleza Barber Club",
    slug: "la-fortaleza",
    businessType: "barbershop",
    municipality: "Medellín",
    department: "Antioquia",
    address: "Calle 10 # 43E-28, El Poblado",
    whatsapp: "+57 320 890 1234",
    phone: "+57 320 890 1234",
    ownerName: "Daniel Alzate",
    ownerEmail: "danielb.alzate1@gmail.com",
    currency: "COP",
    openingCashDefault: 100000,
    subscriptionStatus: "active",
    subscriptionPlan: "pro",
    logoUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?fit=crop&w=300&q=80",
    slogan: "Tradición, Estilo y Maestría Clásica",
    storeEnabled: true,
    barbers: [
      {
        id: "barber_fort_1",
        name: "Camilo Valencia",
        whatsapp: "3108901235",
        email: "camilo.valencia@lafortaleza.com",
        commissionRate: 55,
        dailyGoal: 200000,
        specialties: "Low Fade, High Fade, Taper Fade, Cejas con Navaja",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "barber_fort_2",
        name: "Alejandro Morales",
        whatsapp: "3108901236",
        email: "alejandro.morales@lafortaleza.com",
        commissionRate: 50,
        dailyGoal: 170000,
        specialties: "Arreglo & Ritual de Barba, Masaje Capilar, Vapor de Ozono",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "barber_fort_3",
        name: "Julián Ramírez",
        whatsapp: "3108901237",
        email: "julian.ramirez@lafortaleza.com",
        commissionRate: 50,
        dailyGoal: 160000,
        specialties: "Corte Clásico Tradicional, Pompadour, Combo VIP",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      }
    ]
  },
  {
    id: "tenant_netx_baber_483",
    name: "Netx Baber",
    slug: "netx-baber",
    businessType: "barbershop",
    municipality: "Marinilla",
    department: "Antioquia",
    address: "Parque Principal",
    whatsapp: "+57 322 546 6673",
    phone: "+57 322 546 6673",
    ownerName: "Victor Tamayo",
    ownerEmail: "victortamayopine@gmail.com",
    currency: "COP",
    openingCashDefault: 100000,
    subscriptionStatus: "active",
    subscriptionPlan: "pro",
    logoUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?fit=crop&w=300&q=80",
    slogan: "Cortes Premium y Estilo Vanguardista",
    storeEnabled: true,
    barbers: [
      {
        id: "barber_netx_1",
        name: "Carlos López",
        whatsapp: "3225466673",
        email: "carlos.lopez@netxbaber.com",
        commissionRate: 50,
        dailyGoal: 150000,
        specialties: "Skin Fade + Ritual de Toalla Caliente, Corte Clásico a Tijera, Perfilado",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "barber_netx_2",
        name: "Andrés Morales",
        whatsapp: "3112223334",
        email: "andres.morales@netxbaber.com",
        commissionRate: 50,
        dailyGoal: 120000,
        specialties: "Fade Urbano, Barba, Cejas",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      },
      {
        id: "barber_netx_3",
        name: "Mateo Gómez",
        whatsapp: "3001112233",
        email: "mateo.gomez@netxbaber.com",
        commissionRate: 50,
        dailyGoal: 130000,
        specialties: "Corte Tradicional, Afeitado",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&q=80",
        status: "AVAILABLE",
        active: true
      }
    ]
  }
];

export async function ensureFirestoreSeed() {
  try {
    for (const t of INITIAL_SEED_TENANTS) {
      const { barbers = [], ...tenantData } = t;
      await saveFirestoreTenant(tenantData);
      for (const b of barbers) {
        await saveFirestoreBarber(t.id, b);
      }
    }
  } catch (err) {
    console.warn('Notice seeding Firestore:', err.message);
  }
}

export async function fetchFirestoreTenants() {
  try {
    const colRef = collection(db, 'barbershops');
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    if (docs.length === 0) {
      // Sembrar inmediatamente en Firestore si está vacío
      await ensureFirestoreSeed();
      return INITIAL_SEED_TENANTS.map(({ barbers, ...rest }) => rest);
    }

    return docs;
  } catch (err) {
    console.warn('Firestore notice (fetchTenants):', err.message);
    return INITIAL_SEED_TENANTS.map(({ barbers, ...rest }) => rest);
  }
}

export async function deleteFirestoreTenant(tenantId) {
  if (!tenantId) return;
  try {
    const docRef = doc(db, 'barbershops', tenantId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore notice (deleteTenant):', err.message);
  }
}

/**
 * Normaliza y formatea números de teléfono para enlace de WhatsApp (+57 Colombia por defecto)
 */
export function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '57' + cleaned;
  }
  return cleaned;
}

/**
 * Formatea tenants crudos desde Firestore con campos calculados de facturación y urgencia
 */
export function formatTenantsForSuperAdmin(rawTenants) {
  const now = Date.now();
  return (rawTenants || []).map(t => {
    const periodEnd = t.currentPeriodEnd ? new Date(t.currentPeriodEnd).getTime() : (now + 1000 * 60 * 60 * 24 * 30);
    const daysUntilCutoff = Math.round((periodEnd - now) / (1000 * 60 * 60 * 24));

    let billingStatus = 'ACTIVE';
    let urgencyLevel = 'NORMAL';

    if (t.subscriptionStatus === 'suspended' || t.subscriptionStatus === 'canceled') {
      billingStatus = 'SUSPENDED';
      urgencyLevel = 'CRITICAL';
    } else if (daysUntilCutoff < 0 || t.subscriptionStatus === 'past_due') {
      billingStatus = 'PAST_DUE';
      urgencyLevel = 'DANGER';
    } else if (daysUntilCutoff <= 3) {
      billingStatus = 'EXPIRING_SOON';
      urgencyLevel = 'WARNING';
    } else if (t.subscriptionStatus === 'trial') {
      billingStatus = 'TRIAL';
      urgencyLevel = daysUntilCutoff <= 3 ? 'WARNING' : 'NORMAL';
    }

    const cleanPhone = formatWhatsAppNumber(t.whatsapp || t.phone);

    return {
      id: t.id,
      name: t.name || 'Barbería sin Nombre',
      slug: t.slug || t.id,
      businessType: t.businessType || 'barbershop',
      municipality: t.municipality || 'Marinilla',
      department: t.department || 'Antioquia',
      address: t.address || 'Ubicación no registrada',
      ownerName: t.ownerName || 'Dueño del Negocio',
      ownerEmail: t.ownerEmail || `admin@${t.slug || 'barberia'}.com`,
      whatsapp: t.whatsapp || t.phone || '+573000000000',
      cleanWhatsApp: cleanPhone,
      currency: t.currency || 'COP',
      subscriptionPlan: t.subscriptionPlan || 'pro',
      subscriptionStatus: t.subscriptionStatus || 'active',
      billingStatus,
      urgencyLevel,
      currentPeriodEnd: t.currentPeriodEnd || new Date(periodEnd).toISOString(),
      daysUntilCutoff,
      monthlyRate: t.monthlyRate || (t.subscriptionPlan === 'basic' ? 120000 : 250000),
      storeEnabled: t.storeEnabled !== false,
      createdAt: t.createdAt || new Date().toISOString()
    };
  }).sort((a, b) => {
    const urgencyScore = { CRITICAL: 4, DANGER: 3, WARNING: 2, NORMAL: 1 };
    return (urgencyScore[b.urgencyLevel] || 0) - (urgencyScore[a.urgencyLevel] || 0);
  });
}

/**
 * Calcula las métricas globales para la Consola SuperAdmin (MRR & Resumen de Estados en COP)
 */
export function calculateSuperAdminMetrics(formattedTenants) {
  let totalMRR_COP = 0;
  let activeCount = 0;
  let trialCount = 0;
  let pastDueCount = 0;
  let suspendedCount = 0;
  let expiringSoonCount = 0;
  const municipalityCounts = {};

  (formattedTenants || []).forEach(t => {
    const price = t.monthlyRate || (t.subscriptionPlan === 'basic' ? 120000 : 250000);
    if (t.subscriptionStatus === 'active' && t.billingStatus !== 'SUSPENDED') {
      totalMRR_COP += price;
      activeCount++;
    } else if (t.subscriptionStatus === 'trial') {
      trialCount++;
    } else if (t.billingStatus === 'PAST_DUE') {
      pastDueCount++;
    } else if (t.billingStatus === 'SUSPENDED') {
      suspendedCount++;
    }

    if (t.billingStatus === 'EXPIRING_SOON') {
      expiringSoonCount++;
    }

    const mun = t.municipality || 'Marinilla';
    municipalityCounts[mun] = (municipalityCounts[mun] || 0) + 1;
  });

  return {
    totalTenants: (formattedTenants || []).length,
    totalMRR_COP,
    totalMRR_USD: Math.round(totalMRR_COP / 4200),
    statusSummary: {
      active: activeCount,
      trial: trialCount,
      pastDue: pastDueCount,
      suspended: suspendedCount,
      expiringSoon: expiringSoonCount
    },
    municipalityDistribution: municipalityCounts
  };
}

/**
 * Generador de plantillas y links de WhatsApp para cobranza / alertas del SuperAdmin
 */
export function generateWhatsAppAlertTemplate(tenant, alertType = 'expiring_soon') {
  if (!tenant) return null;
  const cleanPhone = formatWhatsAppNumber(tenant.whatsapp || tenant.phone);
  const owner = tenant.ownerName || 'Estimado Dueño';
  const businessName = tenant.name || 'tu barbería';
  const planName = tenant.subscriptionPlan === 'basic' ? 'Plan Básico ($120.000 COP/mes)' : 'Plan Pro ($250.000 COP/mes)';

  let message = '';
  switch (alertType) {
    case 'expiring_soon':
      message = `👋 Hola *${owner}*, te saludamos desde el equipo central de *BarberPulse OS*. 💈✨\n\nTe escribimos para recordarte que la suscripción de *${businessName}* (${planName}) está próxima a vencer en los próximos días.\n\nPara evitar interrupciones en la agenda en vivo, recordatorios de WhatsApp a tus clientes o reportes de caja, puedes renovar directamente desde tu panel en la sección "Suscripción & Plan", o si lo prefieres, te enviamos el link de pago por este medio.\n\n¿Deseas que te generemos la orden de renovación? ¡Quedamos atentos a cualquier duda!`;
      break;
    case 'past_due':
      message = `⚠️ *AVISO IMPORTANTE DE FACTURACIÓN - BarberPulse OS*\n\nHola *${owner}*, esperamos te encuentres muy bien.\nTe informamos que tu suscripción para *${businessName}* presenta un pago pendiente y ha entrado en período de mora.\n\nActualmente cuentas con un margen de cortesía de 3 días antes de que los módulos operativos (cierre de caja y agenda automatizada) queden pausados.\n\n💳 Puedes regularizar tu pago de forma instantánea ingresando a tu panel administrativo o respondiendo a este mensaje para ayudarte. ¡Estamos para apoyarte!`;
      break;
    case 'suspended':
      message = `🚫 *SERVICIO PAUSADO TEMPORALMENTE - BarberPulse OS*\n\nEstimado/a *${owner}*,\nEl acceso operativo para *${businessName}* ha sido suspendido debido a la expiración de la suscripción.\n\nPara reactivar tus agendas, catálogos y sincronización en tiempo real sin perder tus datos ni historiales de clientes, por favor contáctanos por este medio o efectúa tu renovación inmediata.\n\n¡Tu base de datos está 100% segura y lista para ser reactivada en 1 clic!`;
      break;
    default:
      message = `Hola *${owner}*, te contactamos desde la administración de *BarberPulse OS* respecto a *${businessName}*.`;
  }

  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : null;

  return {
    success: true,
    cleanPhone,
    message,
    whatsappUrl,
    businessName,
    owner
  };
}

// --- 2. BARBEROS / ESPECIALISTAS ---
export async function fetchFirestoreBarbers(tenantId) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'barbers');
    const snapshot = await getDocs(colRef);
    const barbers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (barbers.length > 0) return barbers;

    const seed = INITIAL_SEED_TENANTS.find(t => t.id === tenantId);
    if (seed && seed.barbers) {
      for (const b of seed.barbers) {
        saveFirestoreBarber(tenantId, b).catch(() => {});
      }
      return seed.barbers;
    }
    return [];
  } catch (err) {
    console.warn('Firestore notice (fetchBarbers):', err.message);
    const seed = INITIAL_SEED_TENANTS.find(t => t.id === tenantId);
    return seed?.barbers || [];
  }
}

export async function saveFirestoreBarber(tenantId, barber) {
  if (!tenantId || !barber) return null;
  try {
    const id = barber.id || `barb_${Date.now()}`;
    const docRef = doc(db, 'barbershops', tenantId, 'barbers', id);
    const data = { ...barber, id, updatedAt: serverTimestamp() };
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn('Firestore notice (saveBarber):', err.message);
    return barber;
  }
}

export async function deleteFirestoreBarber(tenantId, barberId) {
  if (!tenantId || !barberId) return;
  try {
    const docRef = doc(db, 'barbershops', tenantId, 'barbers', barberId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore notice (deleteBarber):', err.message);
  }
}

// --- 3. CITAS & AGENDAMIENTO ---
export async function fetchFirestoreAppointments(tenantId, date) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'appointments');
    let q = colRef;
    if (date) {
      q = query(colRef, where('date', '==', date));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore notice (fetchAppointments):', err.message);
    return [];
  }
}

export async function saveFirestoreAppointment(tenantId, appointment) {
  if (!tenantId || !appointment) return null;
  try {
    const id = appointment.id || `apt_${Date.now()}`;
    const docRef = doc(db, 'barbershops', tenantId, 'appointments', id);
    const data = { ...appointment, id, updatedAt: serverTimestamp() };
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn('Firestore notice (saveAppointment):', err.message);
    return appointment;
  }
}

export async function updateFirestoreAppointmentStatus(tenantId, appointmentId, status, paymentMethod, tip = 0) {
  if (!tenantId || !appointmentId) return;
  try {
    const docRef = doc(db, 'barbershops', tenantId, 'appointments', appointmentId);
    await updateDoc(docRef, {
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(tip !== undefined && { tip: Number(tip) }),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore notice (updateAppointmentStatus):', err.message);
  }
}

export async function deleteFirestoreAppointment(tenantId, appointmentId) {
  if (!tenantId || !appointmentId) return;
  try {
    const docRef = doc(db, 'barbershops', tenantId, 'appointments', appointmentId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore notice (deleteAppointment):', err.message);
  }
}

// --- 4. CAJA & CIERRES DIARIOS (ARQUEO & AUDITORÍA) ---
export async function saveFirestoreCashClosure(tenantId, closureData) {
  if (!tenantId || !closureData) return null;
  try {
    const id = closureData.id || `closure_${Date.now()}`;
    const docRef = doc(db, 'barbershops', tenantId, 'cash_closures', id);
    const data = { ...closureData, id, closedAt: closureData.closedAt || new Date().toISOString() };
    await setDoc(docRef, data);
    return data;
  } catch (err) {
    console.warn('Firestore notice (saveCashClosure):', err.message);
    return closureData;
  }
}

export async function fetchFirestoreCashClosures(tenantId) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'cash_closures');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore notice (fetchCashClosures):', err.message);
    return [];
  }
}

// --- 5. MOVIMIENTOS DE CAJA (GASTOS MENORES & ENTRADAS) ---
export async function saveFirestoreCashMovement(tenantId, movement) {
  if (!tenantId || !movement) return null;
  try {
    const id = movement.id || `mov_${Date.now()}`;
    const docRef = doc(db, 'barbershops', tenantId, 'cash_movements', id);
    const data = { ...movement, id, createdAt: new Date().toISOString() };
    await setDoc(docRef, data);
    return data;
  } catch (err) {
    console.warn('Firestore notice (saveCashMovement):', err.message);
    return movement;
  }
}

export async function fetchFirestoreCashMovements(tenantId, date) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'cash_movements');
    let q = colRef;
    if (date) {
      q = query(colRef, where('date', '==', date));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore notice (fetchCashMovements):', err.message);
    return [];
  }
}

export async function deleteFirestoreCashMovement(tenantId, movementId) {
  if (!tenantId || !movementId) return;
  try {
    const docRef = doc(db, 'barbershops', tenantId, 'cash_movements', movementId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore notice (deleteCashMovement):', err.message);
  }
}

// --- 6. CLIENTES & HISTORIAL CRM ---
export async function saveFirestoreClient(tenantId, client) {
  if (!tenantId || !client) return null;
  try {
    const id = client.id || `cli_${Date.now()}`;
    const docRef = doc(db, 'barbershops', tenantId, 'clients', id);
    const data = { ...client, id, updatedAt: serverTimestamp() };
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn('Firestore notice (saveClient):', err.message);
    return client;
  }
}

export async function fetchFirestoreClients(tenantId) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'clients');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore notice (fetchClients):', err.message);
    return [];
  }
}

// --- 7. PRODUCTOS & INVENTARIO BOUTIQUE (PERSISTENCIA TOTAL EN LA NUBE) ---
export async function saveFirestoreProduct(tenantId, product) {
  if (!tenantId || !product) return null;
  try {
    const id = product.id || `prod_${Date.now()}`;
    const docRef = doc(db, 'barbershops', tenantId, 'inventory', id);
    const data = { ...product, id, updatedAt: serverTimestamp() };
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn('Firestore notice (saveProduct):', err.message);
    return product;
  }
}

export async function fetchFirestoreProducts(tenantId) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'inventory');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore notice (fetchProducts):', err.message);
    return [];
  }
}

export async function deleteFirestoreProduct(tenantId, productId) {
  if (!tenantId || !productId) return;
  try {
    const docRef = doc(db, 'barbershops', tenantId, 'inventory', productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore notice (deleteProduct):', err.message);
  }
}

