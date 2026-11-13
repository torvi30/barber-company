import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { isPlatformSuperadminEmail } from '../lib/constants';
import { getOrCreateUserProfile, updateUserProfile, USERS_COLLECTION } from '../services/userService';
import { api } from '../services/api';
import { initSocket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Determinar si el usuario actual es SuperAdmin
  const isSuperAdmin = Boolean(
    currentUser?.role === 'superadmin' ||
    isPlatformSuperadminEmail(firebaseUser?.email || currentUser?.email)
  );

  // Si no es superadmin y no tiene empresa asignada -> Cuarentena (ADR 003)
  const isUnassigned = Boolean(
    currentUser &&
    !isSuperAdmin &&
    !currentUser.companyId
  );

  // Escuchar el estado de autenticación de Firebase
  useEffect(() => {
    let unsubscribeUserDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setAuthError(null);

      if (user) {
        setFirebaseUser(user);
        const isSA = isPlatformSuperadminEmail(user.email);

        try {
          // 1. Obtener o inicializar perfil en Firestore
          const profile = await getOrCreateUserProfile(user);

          // 2. Sincronizar en el backend multi-tenant
          try {
            await api.syncUser({
              uid: user.uid,
              email: user.email,
              displayName: profile?.displayName || user.displayName || user.email?.split('@')[0],
              avatarUrl: user.photoURL || profile?.avatarUrl || null
            });
          } catch (syncErr) {
            console.warn('Backend user sync notice:', syncErr.message);
          }

          const userState = {
            uid: user.uid,
            id: user.uid,
            email: user.email,
            name: profile?.displayName || user.displayName || user.email?.split('@')[0],
            displayName: profile?.displayName || user.displayName || user.email?.split('@')[0],
            avatar: user.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            avatarUrl: user.photoURL || profile?.avatarUrl || null,
            phone: profile?.phone || '',
            bio: profile?.bio || '',
            role: isSA ? 'superadmin' : (profile?.role || 'user'),
            companyId: isSA ? null : (profile?.companyId || null),
            tenantId: isSA ? null : (profile?.companyId || null)
          };

          setCurrentUser(userState);

          // 3. Listener en tiempo real al documento del usuario en Firestore (para desbloqueo instantáneo al ser asignado)
          const userDocRef = doc(db, USERS_COLLECTION, user.uid);
          unsubscribeUserDoc = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const liveData = snap.data();
              setCurrentUser(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  name: liveData.displayName || prev.name,
                  displayName: liveData.displayName || prev.displayName,
                  avatar: liveData.avatarUrl || prev.avatar,
                  avatarUrl: liveData.avatarUrl || prev.avatarUrl,
                  phone: liveData.phone !== undefined ? liveData.phone : prev.phone,
                  bio: liveData.bio !== undefined ? liveData.bio : prev.bio,
                  role: isSA ? 'superadmin' : (liveData.role || prev.role),
                  companyId: isSA ? null : (liveData.companyId || null),
                  tenantId: isSA ? null : (liveData.companyId || null)
                };
              });
            }
          }, (err) => {
            console.warn('Firestore onSnapshot notice:', err.message);
          });

        } catch (err) {
          console.error('Error al resolver perfil de usuario:', err);
          setCurrentUser({
            uid: user.uid,
            id: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split('@')[0],
            displayName: user.displayName || user.email?.split('@')[0],
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            role: isSA ? 'superadmin' : 'user',
            companyId: null,
            tenantId: null
          });
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Escuchar asignación en tiempo real vía Socket.io para desbloqueo instantáneo
  useEffect(() => {
    if (!currentUser?.uid) return;

    const socket = initSocket('nodriza-global');

    const handleLiveAssigned = (data) => {
      if (!data) return;
      const cleanMyEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
      const cleanAssignedEmail = data.email ? data.email.toLowerCase().trim() : '';
      const isMe = data.uid === currentUser.uid || (cleanMyEmail && cleanMyEmail === cleanAssignedEmail);

      if (isMe && data.companyId) {
        console.log('⚡ [Live Socket] ¡Asignación detectada en vivo!', data);
        setCurrentUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            companyId: data.companyId,
            tenantId: data.companyId,
            role: data.role || prev.role,
            companyName: data.companyName || prev.companyName || null
          };
        });
      }
    };

    socket.on('user:assigned', handleLiveAssigned);

    return () => {
      socket.off('user:assigned', handleLiveAssigned);
    };
  }, [currentUser?.uid, currentUser?.email]);

  const applyUserAssignment = (assignedData) => {
    if (!assignedData?.companyId) return;
    setCurrentUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        companyId: assignedData.companyId,
        tenantId: assignedData.companyId,
        role: assignedData.role || prev.role,
        companyName: assignedData.companyName || prev.companyName || null
      };
    });
  };

  // Iniciar Sesión con Google (Gmail)
  const loginWithGoogle = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar Sesión con Correo y Contraseña
  const loginWithEmail = async (email, password) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Registrar nuevo usuario con Correo y Contraseña
  const registerWithEmail = async (email, password, displayName) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && res.user) {
        await updateProfile(res.user, { displayName: displayName.trim() });
      }
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Restablecer Contraseña por Correo
  const resetPassword = async (email) => {
    setAuthError(null);
    return sendPasswordResetEmail(auth, email.trim());
  };

  // Actualizar perfil de usuario en Firebase Auth, Firestore y Backend
  const updateCurrentUserProfile = async ({ displayName, avatarUrl, phone, bio }) => {
    if (!currentUser?.uid) return;

    // 1. Actualizar Firebase Auth si hay usuario autenticado
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          ...(displayName && { displayName: displayName.trim() }),
          ...(avatarUrl && { photoURL: avatarUrl.trim() })
        });
      } catch (authErr) {
        console.warn('Firebase Auth updateProfile notice:', authErr.message);
      }
    }

    // 2. Actualizar Firestore
    try {
      await updateUserProfile(currentUser.uid, {
        ...(displayName !== undefined && { displayName: displayName.trim() }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(bio !== undefined && { bio: bio.trim() })
      });
    } catch (fsErr) {
      console.warn('Firestore user profile update notice:', fsErr.message);
    }

    // 3. Actualizar Backend
    try {
      await api.updateUserProfile({
        uid: currentUser.uid,
        displayName: displayName?.trim(),
        avatarUrl: avatarUrl?.trim(),
        phone: phone?.trim(),
        bio: bio?.trim()
      });
    } catch (apiErr) {
      console.warn('Backend user profile update notice:', apiErr.message);
    }

    // 4. Actualizar estado local reactivo
    setCurrentUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        name: displayName ? displayName.trim() : prev.name,
        displayName: displayName ? displayName.trim() : prev.displayName,
        avatar: avatarUrl ? avatarUrl.trim() : prev.avatar,
        avatarUrl: avatarUrl ? avatarUrl.trim() : prev.avatarUrl,
        phone: phone !== undefined ? phone.trim() : prev.phone,
        bio: bio !== undefined ? bio.trim() : prev.bio
      };
    });
  };

  // Cerrar Sesión
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated: Boolean(currentUser),
        isSuperAdmin,
        isUnassigned,
        isLoading,
        authError,
        applyUserAssignment,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        updateCurrentUserProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
