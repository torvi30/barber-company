import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isPlatformSuperadminEmail } from '../lib/constants';

export const USERS_COLLECTION = 'users';

/**
 * Fetch or initialize a user profile document in Firestore upon authentication.
 * STRICT RULE (ADR 003): Non-superadmin users default to companyId: null (Quarantine/Pending).
 */
export async function getOrCreateUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  const docRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const snap = await getDoc(docRef);

  const isSA = isPlatformSuperadminEmail(firebaseUser.email);

  if (snap.exists()) {
    const data = snap.data();
    // If user is a designated superadmin email, force superadmin role
    if (isSA && data.role !== 'superadmin') {
      await updateDoc(docRef, { role: 'superadmin' });
      return { ...data, uid: firebaseUser.uid, role: 'superadmin' };
    }
    return { uid: docRef.id, ...data };
  }

  // Create new profile
  const newProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuario'),
    avatarUrl: firebaseUser.photoURL || null,
    role: isSA ? 'superadmin' : 'user',
    companyId: isSA ? null : null, // null for unassigned tenant admins awaiting company binding
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(docRef, {
      ...newProfile,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore setDoc notice (using local profile):', err.message);
  }

  return newProfile;
}

/**
 * Fetch users belonging to a company.
 * STRICT MULTI-TENANCY RULE (ADR 002): Must filter by companyId.
 */
export async function fetchCompanyUsers(companyId) {
  if (!companyId) return [];

  try {
    const colRef = collection(db, USERS_COLLECTION);
    const q = query(colRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email,
        displayName: data.displayName || null,
        avatarUrl: data.avatarUrl || null,
        role: data.role,
        companyId: data.companyId,
        createdAt: data.createdAt
      };
    });
  } catch (err) {
    console.error('Error fetching company users:', err);
    return [];
  }
}

/**
 * Fetch all platform users across all tenants (Superadmin only).
 */
export async function fetchAllPlatformUsers() {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(colRef);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email || '',
        displayName: data.displayName || null,
        avatarUrl: data.avatarUrl || null,
        role: data.role || 'user',
        companyId: data.companyId || null,
        createdAt: data.createdAt
      };
    });
  } catch (err) {
    console.error('Error fetching all platform users:', err);
    return [];
  }
}

/**
 * Assigns or reassigns a user to a tenant company, and changes their role (Superadmin only).
 */
export async function updateUserTenantAndRole(uid, companyId, role = 'admin', extraData = {}) {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, {
      uid,
      companyId: companyId || null,
      role: role,
      ...extraData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore setDoc notice in updateUserTenantAndRole:', err.message);
  }
}

/**
 * Update personal user profile document in Firestore
 */
export async function updateUserProfile(uid, profileData) {
  if (!uid) return { success: false, error: 'UID requerido' };
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.warn('Firestore setDoc notice in updateUserProfile:', err.message);
    return { success: true, localOnly: true };
  }
}

/**
 * Permanently delete a user profile document from Firestore (Superadmin only).
 */
export async function deletePlatformUser(uid) {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(docRef);
}

