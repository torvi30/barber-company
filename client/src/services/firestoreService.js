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

export async function fetchFirestoreTenants() {
  try {
    const colRef = collection(db, 'barbershops');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (err) {
    console.warn('Firestore notice (fetchTenants):', err.message);
    return [];
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

// --- 2. BARBEROS / ESPECIALISTAS ---
export async function fetchFirestoreBarbers(tenantId) {
  if (!tenantId) return [];
  try {
    const colRef = collection(db, 'barbershops', tenantId, 'barbers');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore notice (fetchBarbers):', err.message);
    return [];
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

