import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const STORAGE_KEY = 'barberpulse_auth_user';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error recuperando sesión:', e);
    }
    // Estado inicial: SuperAdmin demo para acceso completo
    return {
      id: 'usr-superadmin',
      name: 'SuperAdmin Central',
      email: 'superadmin@barberpulse.io',
      role: 'SUPERADMIN', // 'SUPERADMIN' | 'OWNER'
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return !!saved || true;
  });

  useEffect(() => {
    try {
      if (currentUser && isAuthenticated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error guardando sesión:', e);
    }
  }, [currentUser, isAuthenticated]);

  const login = (userData) => {
    setCurrentUser(prev => ({
      ...prev,
      ...userData,
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    }));
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleSuperAdmin = () => {
    setCurrentUser(prev => ({
      ...prev,
      role: prev?.role === 'SUPERADMIN' ? 'OWNER' : 'SUPERADMIN'
    }));
  };

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, toggleSuperAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
