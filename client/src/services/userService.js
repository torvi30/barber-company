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

    // Si el usuario no tiene rol o companyId asignado, verificar si es barbero de alguna empresa
    if (!isSA && (!data.companyId || data.role === 'user') && firebaseUser.email) {
      try {
        const cleanEmail = firebaseUser.email.trim().toLowerCase();
        const tenantsSnap = await getDocs(collection(db, 'barbershops'));
        for (const tenantDoc of tenantsSnap.docs) {
          const barbersSnap = await getDocs(collection(db, 'barbershops', tenantDoc.id, 'barbers'));
          const matched = barbersSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .find(b => b.email && b.email.trim().toLowerCase() === cleanEmail);

          if (matched) {
            const updatedFields = {
              role: 'barbero',
              companyId: tenantDoc.id,
              barberId: matched.id
            };
            await updateDoc(docRef, updatedFields);
            return { ...data, ...updatedFields, uid: firebaseUser.uid };
          }
        }
      } catch (err) {
        console.warn('Notice matching barber email on existing profile:', err.message);
      }
    }

    return { uid: docRef.id, ...data };
  }

  // Detectar rol y companyId en la creación de nuevo perfil
  let detectedRole = isSA ? 'superadmin' : 'user';
  let detectedCompanyId = null;
  let detectedBarberId = null;

  // Si no es superadmin, revisar si su correo electrónico coincide con algún barbero o dueño de empresa
  if (!isSA && firebaseUser.email) {
    try {
      const cleanEmail = firebaseUser.email.trim().toLowerCase();
      const tenantsSnap = await getDocs(collection(db, 'barbershops'));

      // 1. Revisar si coincide con un barbero de alguna empresa
      for (const tenantDoc of tenantsSnap.docs) {
        const barbersSnap = await getDocs(collection(db, 'barbershops', tenantDoc.id, 'barbers'));
        const matched = barbersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(b => b.email && b.email.trim().toLowerCase() === cleanEmail);

        if (matched) {
          detectedRole = 'barbero';
          detectedCompanyId = tenantDoc.id;
          detectedBarberId = matched.id;
          break;
        }
      }

      // 2. Revisar si es dueño de alguna empresa registrada
      if (detectedRole === 'user') {
        const ownedTenant = tenantsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(t => t.ownerEmail && t.ownerEmail.trim().toLowerCase() === cleanEmail);

        if (ownedTenant) {
          detectedRole = 'admin';
          detectedCompanyId = ownedTenant.id;
        }
      }
    } catch (err) {
      console.warn('Notice matching company/barber role:', err.message);
    }
  }

  // Create new profile
  const newProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuario'),
    avatarUrl: firebaseUser.photoURL || null,
    role: detectedRole,
    companyId: detectedCompanyId,
    barberId: detectedBarberId,
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

/**
 * Vincular o actualizar la cuenta de usuario para un barbero/empleado creado por el Admin
 * Garantiza aislamiento estricto por companyId desde el momento de creación
 */
export async function createOrUpdateBarberUser(companyId, barberData) {
  if (!companyId || !barberData) return null;
  const cleanEmail = barberData.email ? barberData.email.trim().toLowerCase() : '';
  if (!cleanEmail) return null;

  try {
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userDoc = snap.docs[0];
      await updateDoc(userDoc.ref, {
        role: 'barbero',
        companyId,
        barberId: barberData.id,
        displayName: barberData.name,
        phone: barberData.phone || '',
        updatedAt: serverTimestamp()
      });
      return { uid: userDoc.id, role: 'barbero', companyId, barberId: barberData.id };
    }
  } catch (err) {
    console.warn('Notice al vincular cuenta de barbero:', err.message);
  }
  return null;
}

