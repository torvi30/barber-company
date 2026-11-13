import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import { saveFirestoreTenant } from '../services/firestoreService';
import { useAuth } from './AuthContext';

const BarbershopContext = createContext();

export const DEFAULT_BLANK_TENANT = {
  id: '',
  name: 'Sin Barbería Asignada',
  slug: '',
  municipality: 'Sin definir',
  department: 'Antioquia',
  address: 'Sin dirección',
  currency: 'COP',
  whatsapp: '',
  ownerName: 'Administrador',
  subscriptionStatus: 'active',
  storeEnabled: false,
  logoUrl: '',
  slogan: ''
};

export const BarbershopProvider = ({ children }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [tenantList, setTenantList] = useState([]);
  const [tenantId, setTenantId] = useState(() => currentUser?.companyId || '');
  const [barbershopInfo, setBarbershopInfo] = useState(DEFAULT_BLANK_TENANT);
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

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

  // Carga de datos del tenant activo (Citas y Barberos)
  const loadTenantData = useCallback(async (currentTenantId) => {
    const tid = currentTenantId || tenantId;
    if (!tid) {
      setAppointments([]);
      setBarbers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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

  // Cargar lista de tenants desde la base de datos dinámica
  const loadTenants = useCallback(async () => {
    try {
      if (isSuperAdmin) {
        const res = await api.getSuperAdminTenants();
        if (res.success && res.data) {
          setTenantList(res.data);
          if (res.data.length > 0) {
            const currentMatch = res.data.find(t => t.id === tenantId);
            const active = currentMatch || res.data[0];
            setTenantId(active.id);
            setBarbershopInfo(active);
            loadTenantData(active.id);
          } else {
            setTenantId('');
            setBarbershopInfo(DEFAULT_BLANK_TENANT);
            setAppointments([]);
            setBarbers([]);
            setLoading(false);
          }
        }
      } else if (currentUser?.companyId) {
        const res = await api.getPublicBarbershop(currentUser.companyId);
        if (res.success && res.data) {
          setTenantList([res.data]);
          setTenantId(res.data.id);
          setBarbershopInfo(res.data);
          loadTenantData(res.data.id);
        }
      } else {
        setTenantList([]);
        setTenantId('');
        setBarbershopInfo(DEFAULT_BLANK_TENANT);
        setLoading(false);
      }
    } catch (err) {
      console.warn('Error al sincronizar tenants:', err.message);
      setLoading(false);
    }
  }, [isSuperAdmin, currentUser?.companyId, tenantId, loadTenantData]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Cambio de Sucursal / Tenant (Solo SuperAdmin puede cambiar entre barberías)
  const switchTenant = (newTenant) => {
    if (!isSuperAdmin && currentUser?.companyId && newTenant.id !== currentUser.companyId) {
      console.warn('Acceso restringido: solo puedes gestionar tu propia barbería.');
      return;
    }
    const socket = getSocket();
    if (socket) {
      if (tenantId) socket.emit('tenant:leave', { barbershopId: tenantId });
      socket.emit('tenant:join', { barbershopId: newTenant.id });
    }
    setTenantId(newTenant.id);
    setBarbershopInfo(newTenant);
    loadTenantData(newTenant.id);
  };

  // Registrar nueva barbería desde el Wizard de Onboarding (SuperAdmin)
  const registerNewTenant = (newTenant) => {
    setTenantList(prev => [newTenant, ...prev.filter(t => t.id !== newTenant.id)]);
    switchTenant(newTenant);
  };

  // Conexión y sincronización Socket.io en tiempo real
  useEffect(() => {
    if (!tenantId) return;

    const socket = initSocket(tenantId);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onAppointmentCreated = (payload) => {
      if (payload.barbershopId === tenantId) {
        setAppointments((prev) => [payload.appointment, ...prev.filter(a => a.id !== payload.appointment.id)]);
        playBarberChime();
        setToastNotification({
          title: '¡Nueva Cita Agendada!',
          message: `${payload.appointment.clientName} reservó con ${payload.appointment.barberName} a las ${payload.appointment.time}`
        });
      }
    };

    const onAppointmentUpdated = (payload) => {
      if (payload.barbershopId === tenantId) {
        setAppointments((prev) => prev.map((a) => (a.id === payload.appointment.id ? payload.appointment : a)));
      }
    };

    const onBarberStatus = (payload) => {
      if (payload.barbershopId === tenantId) {
        setBarbers((prev) => prev.map((b) => (b.id === payload.barberId ? { ...b, status: payload.status } : b)));
      }
    };

    const onBarberCreated = (newBarber) => {
      setBarbers((prev) => [...prev.filter(b => b.id !== newBarber.id), newBarber]);
    };

    const onBarberUpdated = (updatedBarber) => {
      setBarbers((prev) => prev.map((b) => (b.id === updatedBarber.id ? updatedBarber : b)));
    };

    const onBarberDeleted = ({ id }) => {
      setBarbers((prev) => prev.filter((b) => b.id !== id));
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
      console.warn('Actualización local de tienda boutique:', err.message);
      setBarbershopInfo(prev => ({ ...prev, storeEnabled: enabled }));
      setTenantList(prev => prev.map(t => t.id === tenantId ? { ...t, storeEnabled: enabled } : t));
      return { success: true };
    }
  };

  const updateCompanySettings = async (settings) => {
    try {
      const res = await api.updateBarbershopSettings(tenantId, settings);
      setBarbershopInfo(prev => ({ ...prev, ...settings }));
      setTenantList(prev => prev.map(t => t.id === tenantId ? { ...t, ...settings } : t));
      await saveFirestoreTenant({ id: tenantId, ...barbershopInfo, ...settings });
      return res;
    } catch (err) {
      console.warn('Actualización local de identidad:', err.message);
      setBarbershopInfo(prev => ({ ...prev, ...settings }));
      setTenantList(prev => prev.map(t => t.id === tenantId ? { ...t, ...settings } : t));
      await saveFirestoreTenant({ id: tenantId, ...barbershopInfo, ...settings });
      return { success: true, data: { ...barbershopInfo, ...settings } };
    }
  };

  return (
    <BarbershopContext.Provider
      value={{
        tenantId,
        barbershopInfo,
        availableTenants: isSuperAdmin
          ? tenantList
          : tenantList.filter(t => t.id === currentUser?.companyId || t.id === tenantId),
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
        toggleStoreModule,
        updateCompanySettings
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
