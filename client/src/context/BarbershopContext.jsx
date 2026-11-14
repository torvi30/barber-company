import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import {
  saveFirestoreTenant,
  fetchFirestoreTenants,
  fetchFirestoreBarbers,
  saveFirestoreBarber,
  deleteFirestoreBarber,
  fetchFirestoreAppointments,
  saveFirestoreAppointment,
  updateFirestoreAppointmentStatus
} from '../services/firestoreService';
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
  const [realtimeAppointment, setRealtimeAppointment] = useState(null);
  const toastTimerRef = useRef(null);

  // Chime de barbería tradicional (Web Audio API nativo con 3 notas de bienvenida)
  const playBarberChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Campana armónica brillante tradicional (Do - Mi - Sol / C5 - E5 - G5)
      const bells = [
        { freq: 523.25, time: 0, dur: 0.35, gainVal: 0.25 },
        { freq: 659.25, time: 0.12, dur: 0.4, gainVal: 0.3 },
        { freq: 783.99, time: 0.24, dur: 0.7, gainVal: 0.35 }
      ];

      bells.forEach(({ freq, time, dur, gainVal }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

        gain.gain.setValueAtTime(gainVal, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } catch (err) {
      console.warn('Audio chime notice:', err.message);
    }
  }, []);

  // Carga de datos del tenant activo (Citas y Barberos sincronizados con Firestore + Backend)
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
      const [aptRes, barberRes, fsBarbers, fsAppointments] = await Promise.all([
        api.getAppointments(tid).catch(() => ({ success: false, data: [] })),
        api.getBarbers(tid).catch(() => ({ success: false, data: [] })),
        fetchFirestoreBarbers(tid).catch(() => []),
        fetchFirestoreAppointments(tid).catch(() => [])
      ]);

      // Fusionar barberos sin duplicados
      const barberMap = new Map();
      (fsBarbers || []).forEach(b => { if (b && b.id) barberMap.set(b.id, b); });
      if (barberRes.success && Array.isArray(barberRes.data)) {
        barberRes.data.forEach(b => { if (b && b.id) barberMap.set(b.id, { ...(barberMap.get(b.id) || {}), ...b }); });
      }
      setBarbers(Array.from(barberMap.values()));

      // Fusionar citas sin duplicados
      const aptMap = new Map();
      (fsAppointments || []).forEach(a => { if (a && a.id) aptMap.set(a.id, a); });
      if (aptRes.success && Array.isArray(aptRes.data)) {
        aptRes.data.forEach(a => { if (a && a.id) aptMap.set(a.id, { ...(aptMap.get(a.id) || {}), ...a }); });
      }
      setAppointments(Array.from(aptMap.values()));
    } catch (error) {
      console.error('Error al cargar datos del tenant:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Cargar lista de tenants desde Firestore + Backend (Persistencia Total)
  const loadTenants = useCallback(async () => {
    try {
      // 1. Cargar desde Firestore (Nube de Firebase)
      const firestoreTenants = await fetchFirestoreTenants().catch(() => []);

      // 2. Cargar desde API Backend
      let backendTenants = [];
      try {
        if (isSuperAdmin) {
          const res = await api.getSuperAdminTenants();
          if (res.success && Array.isArray(res.data)) backendTenants = res.data;
        } else if (currentUser?.companyId) {
          const res = await api.getPublicBarbershop(currentUser.companyId);
          if (res.success && res.data) backendTenants = [res.data];
        }
      } catch (e) {
        console.warn('Backend tenants load notice:', e.message);
      }

      // Fusionar tenants de ambas fuentes sin perder ninguno
      const mergedMap = new Map();
      firestoreTenants.forEach(t => { if (t && t.id) mergedMap.set(t.id, t); });
      backendTenants.forEach(t => { if (t && t.id) mergedMap.set(t.id, { ...(mergedMap.get(t.id) || {}), ...t }); });

      const allTenants = Array.from(mergedMap.values());

      if (allTenants.length > 0) {
        setTenantList(allTenants);
        const currentMatch = allTenants.find(t => t.id === tenantId);
        const active = currentMatch || allTenants[0];
        setTenantId(active.id);
        setBarbershopInfo(active);
        loadTenantData(active.id);
      } else {
        setTenantList([]);
        setTenantId('');
        setBarbershopInfo(DEFAULT_BLANK_TENANT);
        setAppointments([]);
        setBarbers([]);
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
  const registerNewTenant = async (newTenant) => {
    // Persistir de inmediato en Firestore Cloud
    await saveFirestoreTenant(newTenant);
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
      if (!payload?.appointment) return;
      const isTargetTenant = payload.barbershopId === tenantId ||
                             barbershopInfo?.slug === payload.barbershopId ||
                             barbershopInfo?.id === payload.barbershopId;

      if (isTargetTenant) {
        const apt = payload.appointment;
        setAppointments((prev) => [apt, ...prev.filter(a => a.id !== apt.id)]);
        setRealtimeAppointment(apt);
        playBarberChime();
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastNotification({
          title: '🔔 ¡NUEVA RESERVA EN TIEMPO REAL!',
          message: `${apt.clientName} reservó ${apt.serviceName || 'Servicio'} con ${apt.barberName} para las ${apt.time} hrs (${apt.date}).`,
          appointment: apt
        });
        toastTimerRef.current = setTimeout(() => {
          setToastNotification(null);
        }, 8000);
        saveFirestoreAppointment(tenantId, apt).catch(() => {});
        loadTenantData(tenantId);
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
    const res = await api.createAppointment(tenantId, appointmentData).catch(() => ({ success: false }));
    const saved = res.success ? res.data : {
      ...appointmentData,
      id: appointmentData.id || `apt_${Date.now()}`,
      status: appointmentData.status || 'WAITING',
      createdAt: new Date().toISOString()
    };
    await saveFirestoreAppointment(tenantId, saved);
    setAppointments((prev) => [saved, ...prev.filter(a => a.id !== saved.id)]);
    setRealtimeAppointment(saved);
    return { success: true, data: saved };
  };

  const updateStatus = async (id, status, paymentMethod, tip) => {
    const res = await api.updateAppointmentStatus(tenantId, id, { status, paymentMethod, tip }).catch(() => ({ success: false }));
    await updateFirestoreAppointmentStatus(tenantId, id, status, paymentMethod, tip);
    if (res.success && res.data) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? res.data : a)));
    } else {
      setAppointments((prev) => prev.map((a) => (a.id === id ? {
        ...a,
        status,
        ...(paymentMethod && { paymentMethod }),
        ...(tip !== undefined && { tip: Number(tip) })
      } : a)));
    }
    return res.success ? res : { success: true };
  };

  const addBarber = async (barberData) => {
    const res = await api.createBarber(tenantId, barberData).catch(() => ({ success: false }));
    const saved = res.success ? res.data : {
      ...barberData,
      id: barberData.id || `barb_${Date.now()}`,
      active: true,
      status: barberData.status || 'AVAILABLE'
    };
    await saveFirestoreBarber(tenantId, saved);
    setBarbers((prev) => [...prev.filter(b => b.id !== saved.id), saved]);
    return { success: true, data: saved };
  };

  const editBarber = async (id, barberData) => {
    const res = await api.updateBarber(tenantId, id, barberData).catch(() => ({ success: false }));
    const updated = res.success ? res.data : { ...barberData, id };
    await saveFirestoreBarber(tenantId, updated);
    setBarbers((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return { success: true, data: updated };
  };

  const removeBarber = async (id) => {
    const res = await api.deleteBarber(tenantId, id).catch(() => ({ success: false }));
    await deleteFirestoreBarber(tenantId, id);
    setBarbers((prev) => prev.filter((b) => b.id !== id));
    return { success: true };
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
        realtimeAppointment,
        setRealtimeAppointment,
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
