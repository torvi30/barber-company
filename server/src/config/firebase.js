import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db;
let isMock = true;

/**
 * Clean Multi-Tenant In-Memory Store
 * STRICT MULTI-TENANCY (ADR 002): Initialized 100% EMPTY.
 * Zero hardcoded companies, zero burned users, zero fake appointments.
 */
const mockStore = {
  barbershops: {},
  users: [],
  barbers: {},
  appointments: {},
  inventory: {},
  cashClosures: {},
  clients: {},
  notifications: {}
};

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'oriente-auth'
    });
    db = admin.firestore();
    isMock = false;
    console.log('🔥 [Firestore] Conectado exitosamente con credenciales de servicio (oriente-auth).');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    db = admin.firestore();
    isMock = false;
    console.log('🔥 [Firestore] Conectado con GOOGLE_APPLICATION_CREDENTIALS.');
  } else {
    isMock = true;
    console.log('⚡ [Firestore] Almacén Multi-Tenant dinámico listo (iniciado desde 0 sin datos quemados).');
  }
} catch (err) {
  console.warn('⚠️ [Firestore Init Notice]:', err.message);
  isMock = true;
}

/**
 * Tenant Subcollection Helper
 * Garantiza aislamiento estricto multi-tenant: /barbershops/{barbershopId}/{subcollection}
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

  return db.collection('barbershops').doc(barbershopId).collection(subcollection);
};

export { db, isMock, mockStore };
