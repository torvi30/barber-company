import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const BarbershopContext = createContext();

// Barberías registradas en el sistema (sucursales multi-tenant)
export const AVAILABLE_TENANTS = [
  {
    id: 'demo-barbershop-01',
    name: 'Black & Gold Barber Club',
    slug: 'black-gold',
    municipality: 'Rionegro',
    department: 'Antioquia',
    address: 'Cra 50 #49-20, Parque Principal',
    currency: 'COP',
    whatsapp: '+57 300 456 7890',
    ownerName: 'Mateo Osorio',
    subscriptionStatus: 'active',
    storeEnabled: true
  },
  {
    id: 'el-capitan-02',
    name: 'El Capitán Barber Studio',
    slug: 'el-capitan',
    municipality: 'Marinilla',
    department: 'Antioquia',
    address: 'Calle 28 #30-15, Zona Rosa',
    currency: 'COP',
    whatsapp: '+57 312 987 6543',
    ownerName: 'Julián Gómez',
    subscriptionStatus: 'trial',
    storeEnabled: false
  },
  {
    id: 'elite-cuts-medellin',
    name: 'Elite Cuts Barbería VIP',
    slug: 'elite-cuts',
    municipality: 'Medellín',
    department: 'Antioquia',
    address: 'El Poblado, Cra 43A #1-50, Torre Empresarial',
    currency: 'COP',
    whatsapp: '+57 310 777 9900',
    ownerName: 'Alejandro Ramírez',
    subscriptionStatus: 'active',
    storeEnabled: true
  }
];

export const BarbershopProvider = ({ children }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [tenantList, setTenantList] = useState(AVAILABLE_TENANTS);
  const [tenantId, setTenantId] = useState(() => currentUser?.tenantId || 'demo-barbershop-01');
  const [barbershopInfo, setBarbershopInfo] = useState(() => {
    const initialTid = currentUser?.tenantId || 'demo-barbershop-01';
    return AVAILABLE_TENANTS.find(t => t.id === initialTid) || AVAILABLE_TENANTS[0];
  });
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  // Aislamiento estricto: Si el usuario es Dueño/Admin, forzar su barbería asignada
  useEffect(() => {
    if (currentUser?.tenantId && !isSuperAdmin) {
      const match = tenantList.find(t => t.id === currentUser.tenantId);
      if (match && tenantId !== match.id) {
        setTenantId(match.id);
        setBarbershopInfo(match);
        loadTenantData(match.id);
      }
    }
  }, [currentUser, isSuperAdmin, tenantList]);

  // Chime de barbería tradicional (Web Audio API nativo)
  const playBarberChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15);
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1760.00, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(); osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (err) {
      // Ignorar si el usuario aún no interactuó con el DOM
    }
  }, []);

  // Carga de datos del tenant activo
  const loadTenantData = useCallback(async (currentTenantId) => {
    try {
      setLoading(true);
      const tid = currentTenantId || tenantId;
      const [aptRes, barberRes] = await Promise.all([
        api.getAppointments(tid),
        api.getBarbers(tid)
      ]);
      if (aptRes.success) setAppointments(aptRes.data || []);
      if (barberRes.success) setBarbers(barberRes.data || []);
    } catch (error) {
      console.error('Error al cargar datos del tenant:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Cambio de Sucursal / Tenant (Solo SuperAdmin puede cambiar entre barberías)
  const switchTenant = (newTenant) => {
    if (!isSuperAdmin && currentUser?.tenantId && newTenant.id !== currentUser.tenantId) {
      console.warn('Acceso restringido: solo puedes gestionar tu propia barbería.');
      return;
    }
    const socket = getSocket();
    if (socket) {
      socket.emit('tenant:leave', { barbershopId: tenantId });
      socket.emit('tenant:join', { barbershopId: newTenant.id });
    }
    setTenantId(newTenant.id);
    setBarbershopInfo(newTenant);
    loadTenantData(newTenant.id);
  };

  // Registrar nueva barbería desde el Wizard de Onboarding
  const registerNewTenant = (newTenant) => {
    setTenantList(prev => [newTenant, ...prev.filter(t => t.id !== newTenant.id)]);
    switchTenant(newTenant);
  };

  // Conexión y sincronización Socket.io en tiempo real
  useEffect(() => {
    const socket = initSocket(tenantId);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onAppointmentCreated = (payload) => {
      if (payload.barbershopId === tenantId) {
        setAppointments((prev) => [payload.appointment, ...prev.filter(a => a.id !== payload.appointment.id)]);
        playBarberChime();
        setToastNotification({
          id: Date.now(),
          title: '¡Nueva Cita Confirmada!',
          message: `${payload.appointment.clientName} agendó con ${payload.appointment.barberName} a las ${payload.appointment.time}`,
          type: 'success'
        });
      }
    };

    const onAppointmentUpdated = (payload) => {
      if (payload.barbershopId === tenantId) {
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === payload.appointment.id ? payload.appointment : apt))
        );
      }
    };

    const onBarberStatus = (payload) => {
      setBarbers((prev) =>
        prev.map((b) => (b.id === payload.barberId ? { ...b, status: payload.status } : b))
      );
    };

    const onBarberCreated = (payload) => {
      if (payload.barbershopId === tenantId) {
        setBarbers((prev) => [...prev.filter(b => b.id !== payload.barber.id), payload.barber]);
      }
    };

    const onBarberUpdated = (payload) => {
      if (payload.barbershopId === tenantId) {
        setBarbers((prev) => prev.map(b => b.id === payload.barber.id ? payload.barber : b));
      }
    };

    const onBarberDeleted = (payload) => {
      if (payload.barbershopId === tenantId) {
        setBarbers((prev) => prev.filter(b => b.id !== payload.barberId));
      }
    };

    const onSettingsUpdated = (updated) => {
      if (updated.id === tenantId) {
        setBarbershopInfo(prev => ({ ...prev, ...updated }));
      }
      setTenantList(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('appointment:created', onAppointmentCreated);
    socket.on('appointment:updated', onAppointmentUpdated);
    socket.on('barber:status_updated', onBarberStatus);
    socket.on('barber:created', onBarberCreated);
    socket.on('barber:updated', onBarberUpdated);
    socket.on('barber:deleted', onBarberDeleted);
    socket.on('barbershop:settings_updated', onSettingsUpdated);

    loadTenantData(tenantId);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('appointment:created', onAppointmentCreated);
      socket.off('appointment:updated', onAppointmentUpdated);
      socket.off('barber:status_updated', onBarberStatus);
      socket.off('barber:created', onBarberCreated);
      socket.off('barber:updated', onBarberUpdated);
      socket.off('barber:deleted', onBarberDeleted);
      socket.off('barbershop:settings_updated', onSettingsUpdated);
    };
  }, [tenantId, loadTenantData, playBarberChime]);

  const createAppointment = async (appointmentData) => {
    const res = await api.createAppointment(tenantId, appointmentData);
    if (res.success) {
      setAppointments((prev) => [res.data, ...prev.filter(a => a.id !== res.data.id)]);
    }
    return res;
  };

  const updateStatus = async (id, status, paymentMethod, tip) => {
    const res = await api.updateAppointmentStatus(tenantId, id, { status, paymentMethod, tip });
    if (res.success) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? res.data : a)));
    }
    return res;
  };

  const addBarber = async (barberData) => {
    const res = await api.createBarber(tenantId, barberData);
    if (res.success && res.data) {
      setBarbers((prev) => [...prev.filter(b => b.id !== res.data.id), res.data]);
    }
    return res;
  };

  const editBarber = async (id, barberData) => {
    const res = await api.updateBarber(tenantId, id, barberData);
    if (res.success && res.data) {
      setBarbers((prev) => prev.map((b) => (b.id === id ? res.data : b)));
    }
    return res;
  };

  const removeBarber = async (id) => {
    const res = await api.deleteBarber(tenantId, id);
    if (res.success) {
      setBarbers((prev) => prev.filter((b) => b.id !== id));
    }
    return res;
  };

  const toggleStoreModule = async (enabled) => {
    try {
      const res = await api.updateBarbershopSettings(tenantId, { storeEnabled: enabled });
      setBarbershopInfo(prev => ({ ...prev, storeEnabled: enabled }));
      setTenantList(prev => prev.map(t => t.id === tenantId ? { ...t, storeEnabled: enabled } : t));
      return res;
    } catch (err) {
      console.warn('Usando actualización local para tienda boutique:', err);
      setBarbershopInfo(prev => ({ ...prev, storeEnabled: enabled }));
      setTenantList(prev => prev.map(t => t.id === tenantId ? { ...t, storeEnabled: enabled } : t));
      return { success: true };
    }
  };

  return (
    <BarbershopContext.Provider
      value={{
        tenantId,
        barbershopInfo,
        availableTenants: isSuperAdmin
          ? tenantList
          : tenantList.filter(t => t.id === currentUser?.tenantId || t.id === tenantId),
        allTenants: tenantList,
        registerNewTenant,
        switchTenant,
        appointments,
        barbers,
        loading,
        socketConnected,
        toastNotification,
        clearToast: () => setToastNotification(null),
        playBarberChime,
        refreshData: () => loadTenantData(tenantId),
        createAppointment,
        updateStatus,
        addBarber,
        editBarber,
        removeBarber,
        toggleStoreModule
      }}
    >
      {children}
    </BarbershopContext.Provider>
  );
};

export const useBarbershop = () => {
  const context = useContext(BarbershopContext);
  if (!context) throw new Error('useBarbershop must be used within a BarbershopProvider');
  return context;
};
