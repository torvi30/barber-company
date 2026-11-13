import { mockStore, isMock, db } from '../config/firebase.js';

export const SUPERADMIN_EMAILS = [
  'victortamayopine@gmail.com',
  'victortamayopinc@gmail.com',
  'danielb.alzate1@gmail.com'
];

export const isSuperadminEmail = (email) => {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.toLowerCase().trim());
};

/**
 * Sincroniza un usuario autenticado con Firebase Auth (Google o Email)
 * STRICT RULE (ADR 003): Si no es SuperAdmin, inicia con companyId: null (Cuarentena).
 */
export const syncUser = async (req, res) => {
  try {
    const { uid, email, displayName, avatarUrl } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ success: false, error: 'UID y Email requeridos' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isSA = isSuperadminEmail(cleanEmail);

    if (!mockStore.users) mockStore.users = [];

    let user = mockStore.users.find(u => u.uid === uid || u.email === cleanEmail);

    if (user) {
      // Si el email está en la lista blanca de superadmins, forzar rol superadmin
      if (isSA && user.role !== 'superadmin') {
        user.role = 'superadmin';
      }
      user.displayName = displayName || user.displayName;
      user.avatarUrl = avatarUrl || user.avatarUrl;
    } else {
      user = {
        uid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        avatarUrl: avatarUrl || null,
        role: isSA ? 'superadmin' : 'user',
        companyId: null, // Default: sin asignar
        createdAt: new Date().toISOString()
      };
      mockStore.users.push(user);
    }

    // Persistir en Firestore si está conectado
    if (!isMock && db) {
      try {
        await db.collection('users').doc(uid).set({
          uid,
          email: cleanEmail,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          companyId: user.companyId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Backend firestore sync notice:', fsErr.message);
      }
    }

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error al sincronizar usuario:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Listar todos los usuarios de la plataforma (Superadmin only)
 */
export const listPlatformUsers = async (req, res) => {
  try {
    if (!mockStore.users) mockStore.users = [];

    // Si Firestore real está habilitado, traer de Firestore y sincronizar
    if (!isMock && db) {
      try {
        const snap = await db.collection('users').get();
        const firestoreUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        for (const fu of firestoreUsers) {
          const idx = mockStore.users.findIndex(u => u.uid === fu.uid || (fu.email && u.email === fu.email.toLowerCase().trim()));
          if (idx >= 0) {
            mockStore.users[idx] = { ...mockStore.users[idx], ...fu };
          } else {
            mockStore.users.push(fu);
          }
        }
      } catch (fsErr) {
        console.warn('Backend firestore list users notice:', fsErr.message);
      }
    }

    return res.json({
      success: true,
      count: mockStore.users.length,
      data: mockStore.users
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Asignar usuario a una empresa y definir rol (Superadmin only)
 * Soporta UPSERT: si el usuario aún no estaba en memoria, se crea y asigna de inmediato.
 */
export const assignUserCompany = async (req, res) => {
  try {
    const { uid, companyId, role, email, displayName, avatarUrl } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, error: 'UID de usuario requerido' });
    }

    if (!mockStore.users) mockStore.users = [];
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    let user = mockStore.users.find(u => u.uid === uid || (cleanEmail && u.email === cleanEmail));

    if (!user) {
      // Upsert: Si el usuario inició sesión por Firebase y la instancia en memoria no lo tenía
      user = {
        uid,
        email: cleanEmail,
        displayName: displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Usuario'),
        avatarUrl: avatarUrl || null,
        companyId: companyId || null,
        role: role || (companyId ? 'admin' : 'user'),
        createdAt: new Date().toISOString()
      };
      mockStore.users.push(user);
    } else {
      user.companyId = companyId || null;
      user.role = role || (companyId ? 'admin' : 'user');
      if (cleanEmail) user.email = cleanEmail;
      if (displayName) user.displayName = displayName;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      user.updatedAt = new Date().toISOString();
    }

    // Si Firestore real está habilitado en backend
    if (!isMock && db) {
      try {
        await db.collection('users').doc(uid).set({
          uid,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          companyId: user.companyId,
          role: user.role,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Backend firestore update notice:', fsErr.message);
      }
    }

    const company = companyId ? mockStore.barbershops?.[companyId] : null;
    const userWithCompany = {
      ...user,
      companyName: company?.name || (companyId ? 'Barbería Asignada' : null)
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('user:assigned', userWithCompany);
    }

    return res.json({
      success: true,
      message: `Usuario asignado exitosamente a ${company?.name || companyId || 'ninguna (desvinculado)'}`,
      user: userWithCompany
    });
  } catch (error) {
    console.error('Error al asignar usuario:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar usuario de la plataforma (Superadmin only)
 */
export const deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    if (!mockStore.users) mockStore.users = [];

    const initialLen = mockStore.users.length;
    mockStore.users = mockStore.users.filter(u => u.uid !== uid);

    if (!isMock && db) {
      try {
        await db.collection('users').doc(uid).delete();
      } catch (fsErr) {
        console.warn('Backend firestore delete notice:', fsErr.message);
      }
    }

    return res.json({
      success: true,
      deleted: initialLen > mockStore.users.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar configuración de la barbería
 */
export const updateBarbershopSettings = async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const { storeEnabled, name, address, whatsapp, logoUrl, slogan, municipality } = req.body;

    if (!mockStore.barbershops) mockStore.barbershops = {};
    let barbershop = mockStore.barbershops[barbershopId];
    if (!barbershop) {
      barbershop = {
        id: barbershopId,
        name: name || 'Mi Barbería',
        address: address || '',
        whatsapp: whatsapp || '',
        municipality: municipality || 'Rionegro',
        logoUrl: logoUrl || '',
        slogan: slogan || '',
        storeEnabled: storeEnabled !== undefined ? Boolean(storeEnabled) : true
      };
      mockStore.barbershops[barbershopId] = barbershop;
    }

    if (storeEnabled !== undefined) barbershop.storeEnabled = Boolean(storeEnabled);
    if (name) barbershop.name = name;
    if (address !== undefined) barbershop.address = address;
    if (whatsapp !== undefined) barbershop.whatsapp = whatsapp;
    if (logoUrl !== undefined) barbershop.logoUrl = logoUrl;
    if (slogan !== undefined) barbershop.slogan = slogan;
    if (municipality !== undefined) barbershop.municipality = municipality;

    // Persistir en Firestore si está conectado
    if (!isMock && db) {
      try {
        await db.collection('barbershops').doc(barbershopId).set(barbershop, { merge: true });
      } catch (e) {
        console.warn('Notice saving barbershop settings to Firestore:', e.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('barbershop:settings_updated', barbershop);
      io.emit('tenant:updated', barbershop);
    }

    return res.json({
      success: true,
      message: 'Configuración e identidad actualizadas exitosamente',
      data: barbershop
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Consultar estado de asignación en tiempo real para un usuario
 */
export const getUserStatus = async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ success: false, error: 'UID requerido' });

    if (!mockStore.users) mockStore.users = [];
    const cleanUid = String(uid).trim();
    const user = mockStore.users.find(u => u.uid === cleanUid || (cleanUid.includes('@') && u.email === cleanUid.toLowerCase()));

    if (!user) {
      return res.json({
        success: true,
        assigned: false,
        user: null
      });
    }

    const company = user.companyId ? mockStore.barbershops?.[user.companyId] : null;

    return res.json({
      success: true,
      assigned: Boolean(user.companyId),
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        companyId: user.companyId || null,
        role: user.role || 'user',
        companyName: company?.name || null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
