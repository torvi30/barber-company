import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const storeFilePath = path.join(dataDir, 'mockStore.json');

let db;
let isMock = true;

/**
 * Clean Multi-Tenant Store con Persistencia Local Automática
 * Garantiza que ninguna barbería, barbero o cita se pierda al reiniciar el servidor.
 */
let mockStore = {
  barbershops: {},
  users: [],
  barbers: {},
  appointments: {},
  inventory: {},
  cashClosures: {},
  clients: {},
  notifications: {},
  blockedSlots: {}
};

// Cargar store previo desde disco si existe
try {
  if (fs.existsSync(storeFilePath)) {
    const rawData = fs.readFileSync(storeFilePath, 'utf8');
    const parsed = JSON.parse(rawData);
    if (parsed && typeof parsed === 'object') {
      mockStore = { ...mockStore, ...parsed };
      console.log(`💾 [Store] Cargadas ${Object.keys(mockStore.barbershops || {}).length} barberías persistidas desde disco.`);
    }
  }
} catch (err) {
  console.warn('⚠️ [Store Read Notice]:', err.message);
}

let persistTimer = null;
export const persistStore = () => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(storeFilePath, JSON.stringify(mockStore, null, 2), 'utf8');
    } catch (err) {
      console.error('Error al persistir store en disco:', err.message);
    }
  }, 250);
};

export const persistStoreSync = () => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storeFilePath, JSON.stringify(mockStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Error al persistir store en disco (Sync):', err.message);
  }
};

// Persistir automáticamente al cerrar el proceso
process.on('SIGINT', () => { persistStoreSync(); process.exit(0); });
process.on('SIGTERM', () => { persistStoreSync(); process.exit(0); });
process.on('beforeExit', () => { persistStoreSync(); });

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
    console.log('⚡ [Firestore/Store] Almacén Multi-Tenant dinámico persistente listo en disco.');
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
