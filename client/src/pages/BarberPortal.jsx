import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  Scissors,
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  Coffee,
  PlayCircle,
  User,
  Settings,
  Sparkles,
  Award,
  ChevronRight,
  Save,
  Sliders,
  Phone,
  MessageCircle,
  ArrowRight,
  UserPlus,
  Edit3,
  Trash2,
  Users,
  AlertCircle
} from 'lucide-react';

const AVATAR_PRESETS = [
  { label: 'Fade Master', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80' },
  { label: 'Blade Classic', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&q=80' },
  { label: 'Scissors Pro', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?fit=crop&w=200&q=80' },
  { label: 'Vintage Style', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=200&q=80' },
  { label: 'Urban Look', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?fit=crop&w=200&q=80' }
];

export const BarberPortal = () => {
  const { tenantId, barbers, updateStatus, addBarber, editBarber, removeBarber } = useBarbershop();
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mantener actualizado el barbero seleccionado cuando cambien los barberos del tenant
  useEffect(() => {
    if (barbers && barbers.length > 0) {
      // Si el seleccionado actual no existe en la lista de barberos de este tenant, seleccionar el primero
      const exists = barbers.some(b => b.id === selectedBarberId);
      if (!exists) {
        setSelectedBarberId(barbers[0].id);
      }
    } else {
      setSelectedBarberId('');
    }
  }, [barbers, tenantId]);

  // Modal / Drawer de Horarios (Rostering)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(null);
  const [dailyTargetInput, setDailyTargetInput] = useState(150);
  const [commissionRateInput, setCommissionRateInput] = useState(50);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Control rápido de turnos y disponibilidad activa
  const [barberSlots, setBarberSlots] = useState([]);
  const [loadingBarberSlots, setLoadingBarberSlots] = useState(false);

  const loadBarberSlots = async () => {
    if (!selectedBarberId) return;
    try {
      setLoadingBarberSlots(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await api.getAvailableSlots(tenantId, selectedBarberId, today);
      if (res.success && res.slots) {
        setBarberSlots(res.slots);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBarberSlots(false);
    }
  };

  useEffect(() => {
    if (selectedBarberId) {
      loadBarberSlots();
    }
  }, [selectedBarberId, tenantId]);

  const handleToggleBarberSlot = async (slotTime, isBlocked) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.toggleSlot(tenantId, {
        barberId: selectedBarberId,
        date: today,
        time: slotTime,
        blocked: !isBlocked
      });
      loadBarberSlots();
    } catch (err) {
      alert('Error al modificar turno: ' + err.message);
    }
  };

  // Modificación en Lote de Franjas (1 Clic)
  const handleToggleBatchBarberSlots = async (timesToToggle, blocked) => {
    if (!timesToToggle || timesToToggle.length === 0) return;
    try {
      setLoadingBarberSlots(true);
      const today = new Date().toISOString().split('T')[0];
      await api.toggleSlot(tenantId, {
        barberId: selectedBarberId,
        date: today,
        times: timesToToggle,
        blocked
      });
      loadBarberSlots();
    } catch (err) {
      alert('Error al modificar turnos en lote: ' + err.message);
    } finally {
      setLoadingBarberSlots(false);
    }
  };

  // Modales de Gestión de Barberos (CRUD)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isBarberFormOpen, setIsBarberFormOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberFormData, setBarberFormData] = useState({
    name: '',
    phone: '',
    email: '',
    commissionRate: 50,
    dailyTarget: 120000,
    specialties: 'Skin Fade, Barba Ritual',
    avatar: AVATAR_PRESETS[0].url
  });
  const [formSaving, setFormSaving] = useState(false);

  const openNewBarberModal = () => {
    setEditingBarber(null);
    setBarberFormData({
      name: '',
      phone: '',
      email: '',
      commissionRate: 50,
      dailyTarget: 120000,
      specialties: 'Skin Fade, Barba Ritual',
      avatar: AVATAR_PRESETS[0].url
    });
    setIsBarberFormOpen(true);
  };

  const openEditBarberModal = (b) => {
    setEditingBarber(b);
    setBarberFormData({
      name: b.name || '',
      phone: b.phone || '',
      email: b.email || '',
      commissionRate: Math.round((Number(b.commissionRate) || 0.5) * 100),
      dailyTarget: b.dailyTarget || 120000,
      specialties: Array.isArray(b.specialties) ? b.specialties.join(', ') : (b.specialties || ''),
      avatar: b.avatar || AVATAR_PRESETS[0].url
    });
    setIsBarberFormOpen(true);
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    if (!barberFormData.name.trim()) return;

    try {
      setFormSaving(true);
      const payload = {
        name: barberFormData.name.trim(),
        phone: barberFormData.phone.trim(),
        email: barberFormData.email.trim(),
        commissionRate: Number(barberFormData.commissionRate) / 100,
        dailyTarget: Number(barberFormData.dailyTarget),
        specialties: barberFormData.specialties.split(',').map(s => s.trim()).filter(Boolean),
        avatar: barberFormData.avatar
      };

      if (editingBarber) {
        await editBarber(editingBarber.id, payload);
      } else {
        const res = await addBarber(payload);
        if (res.success && res.data) {
          setSelectedBarberId(res.data.id);
        }
      }

      setIsBarberFormOpen(false);
      fetchBarberData();
    } catch (err) {
      alert('Error al guardar especialista: ' + err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteBarber = async (b) => {
    if (barbers.length <= 1) {
      alert('Tu barbería debe tener al menos un especialista registrado.');
      return;
    }

    const ok = window.confirm(`¿Estás seguro de eliminar a "${b.name}" del equipo?`);
    if (!ok) return;

    try {
      await removeBarber(b.id);
      if (selectedBarberId === b.id) {
        const remaining = barbers.filter(barb => barb.id !== b.id);
        if (remaining.length > 0) setSelectedBarberId(remaining[0].id);
      }
      fetchBarberData();
    } catch (err) {
      alert('Error al eliminar barbero: ' + err.message);
    }
  };

  const fetchBarberData = async () => {
    try {
      setLoading(true);
      const res = await api.getBarberDashboard(tenantId, selectedBarberId);
      if (res.success) {
        setDashboardData(res);
        setDailyTargetInput(res.barber.dailyTarget || 150);
        setCommissionRateInput(res.barber.commissionPercent || 50);
        setScheduleForm(res.barber.schedule || {
          monday: { working: true, start: '09:00', end: '19:00' },
          tuesday: { working: true, start: '09:00', end: '19:00' },
          wednesday: { working: true, start: '09:00', end: '19:00' },
          thursday: { working: true, start: '09:00', end: '19:00' },
          friday: { working: true, start: '09:00', end: '20:00' },
          saturday: { working: true, start: '09:00', end: '15:00' },
          sunday: { working: false }
        });
      }
    } catch (err) {
      console.error('Error al cargar dashboard del barbero:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBarberId) {
      fetchBarberData();
    }
  }, [tenantId, selectedBarberId]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateBarberStatus(tenantId, selectedBarberId, newStatus);
      setDashboardData(prev => ({
        ...prev,
        barber: { ...prev.barber, status: newStatus }
      }));
    } catch (err) {
      alert('Error al actualizar estado en vivo');
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        schedule: scheduleForm,
        dailyTarget: Number(dailyTargetInput),
        commissionRate: Number(commissionRateInput) / 100
      };

      const res = await api.updateBarberSchedule(tenantId, selectedBarberId, payload);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setIsScheduleModalOpen(false);
          fetchBarberData();
        }, 1500);
      }
    } catch (err) {
      alert(err.message || 'Error al guardar horario');
    }
  };

  const daysLabels = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  if (barbers.length === 0 && !loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Scissors className="w-8 h-8 text-gold-400 mx-auto" />
        <h3 className="text-base font-bold text-white">No hay barberos registrados en esta barbería</h3>
        <p className="text-xs text-industrial-400 max-w-sm mx-auto">
          Registra especialistas en el equipo para gestionar horarios, comisiones y turnos del día.
        </p>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400 animate-pulse">
        Cargando portal privado del barbero...
      </div>
    );
  }

  const { barber, metrics, appointments } = dashboardData;

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Top Header con Selector de Barbero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-industrial-800">
        <div className="flex items-center gap-4">
          <img
            src={barber.avatar}
            alt={barber.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-gold-500 shadow-glow-gold"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-wide">
                {barber.name}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-gold-400 border border-amber-500/30 dark:border-gold-500/30">
                Tasa: {barber.commissionPercent}%
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5 flex items-center gap-2">
              <span>Portal Móvil Staff</span>
              <span>•</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">Meta Diaria: ${barber.dailyTarget}</span>
            </p>
          </div>
        </div>

        {/* Switcher de Barbero, Botón Horarios y Gestión de Equipo */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
            <span className="text-slate-500 dark:text-industrial-400 text-[11px] hidden sm:inline">Ver como:</span>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-noir-950 text-slate-900 dark:text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 hover:border-amber-400 dark:hover:border-gold-500 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-colors"
            title="Horarios y metas del especialista activo"
          >
            <Sliders className="w-3.5 h-3.5 text-gold-500" />
            <span className="hidden sm:inline">Turnos & Metas</span>
            <span className="sm:hidden">Metas</span>
          </button>

          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 text-xs font-bold shadow-glow-gold transition-all"
            title="Agregar, modificar o eliminar barberos del equipo"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Equipo ({barbers.length})</span>
          </button>
        </div>
      </div>

      {/* Control Rápido de Estado en Vivo (Sillón / Descanso) */}
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-industrial-400 block mb-1">
            Tu Estado Actual en el Salón
          </span>
          <div className="flex items-center gap-2">
            <Badge status={barber.status}>
              {barber.status === 'AVAILABLE' ? '🟢 Disponible para recibir cliente' :
               barber.status === 'IN_SERVICE' ? '🔵 Atendiendo en Sillón' : '⚪ En Pausa / Descanso'}
            </Badge>
            <span className="text-xs text-slate-400 dark:text-industrial-500">
              (Se sincroniza en tiempo real con recepción)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusChange('AVAILABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              barber.status === 'AVAILABLE'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Disponible
          </button>

          <button
            onClick={() => handleStatusChange('IN_SERVICE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              barber.status === 'IN_SERVICE'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            En Sillón
          </button>

          <button
            onClick={() => handleStatusChange('BREAK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              barber.status === 'BREAK'
                ? 'bg-slate-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Descanso
          </button>
        </div>
      </div>

      {/* KPI Cards Personales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mi Comisión de Hoy"
          value={`$${metrics.commissionEarned.toFixed(2)}`}
          highlight={true}
          icon={DollarSign}
          subtitle={`${barber.commissionPercent}% de $${metrics.grossServices.toFixed(2)} facturados`}
        />

        <StatCard
          title="Mis Propinas (100%)"
          value={`$${metrics.tipsEarned.toFixed(2)}`}
          icon={Award}
          subtitle="Directo a tu liquidación"
        />

        <StatCard
          title="Total Ganado Hoy"
          value={`$${metrics.totalPersonalEarnings.toFixed(2)}`}
          change="+ Comisiones + Tips"
          icon={TrendingUp}
          subtitle={`${metrics.servicesCount} cortes completados`}
        />

        {/* Card Progreso de Meta Diaria */}
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-industrial-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Meta del Día</span>
              <span className="font-mono text-amber-600 dark:text-gold-400 font-bold">{metrics.targetProgressPercent}%</span>
            </div>
            <div className="text-xl font-bold font-display text-slate-900 dark:text-white">
              ${metrics.grossServices.toFixed(2)} <span className="text-xs text-slate-400 dark:text-industrial-500 font-normal">/ ${barber.dailyTarget}</span>
            </div>
          </div>

          <div className="mt-3 w-full bg-slate-100 dark:bg-noir-950 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-industrial-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-gold-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.targetProgressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Control Rápido de Turnos de Hoy (1 Click para Activar/Pausar) */}
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-industrial-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-500" />
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Mis Turnos de Hoy (Activar / Pausar)</h3>
              <p className="text-xs text-slate-500 dark:text-industrial-400">Toca cualquier hora para pausarla o activarla con 1 clic en tiempo real.</p>
            </div>
          </div>
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{barberSlots.filter(s => s.available).length} turnos libres para agendar hoy</span>
            {loadingBarberSlots && <span className="text-amber-500 animate-pulse text-[10px]">Actualizando...</span>}
          </div>
        </div>

        {/* Acciones Rápidas en Lote (1 Toque) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-industrial-400 mr-1">Rápido:</span>
          <button
            type="button"
            disabled={loadingBarberSlots}
            onClick={() => {
              const pausedTimes = barberSlots.filter(s => s.reason === 'BLOCKED_MANUALLY').map(s => s.time);
              handleToggleBatchBarberSlots(pausedTimes, false);
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            🟢 Activar Todo
          </button>
          <button
            type="button"
            disabled={loadingBarberSlots}
            onClick={() => {
              const morningTimes = barberSlots.filter(s => s.available && s.time < '13:30').map(s => s.time);
              handleToggleBatchBarberSlots(morningTimes, true);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-black text-xs font-semibold transition-all disabled:opacity-50"
          >
            ⏸️ Pausar Mañana
          </button>
          <button
            type="button"
            disabled={loadingBarberSlots}
            onClick={() => {
              const afternoonTimes = barberSlots.filter(s => s.available && s.time >= '13:30').map(s => s.time);
              handleToggleBatchBarberSlots(afternoonTimes, true);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-black text-xs font-semibold transition-all disabled:opacity-50"
          >
            ⏸️ Pausar Tarde
          </button>
          <button
            type="button"
            disabled={loadingBarberSlots}
            onClick={() => {
              const allOpenTimes = barberSlots.filter(s => s.available).map(s => s.time);
              handleToggleBatchBarberSlots(allOpenTimes, true);
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            🔴 Pausar Todo
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {barberSlots.map((s) => {
            const isBooked = s.reason === 'BOOKED';
            const isManualBlocked = s.reason === 'BLOCKED_MANUALLY';
            const isPast = s.reason === 'PAST';
            const isOutOfSchedule = s.reason === 'OUT_OF_SCHEDULE' || s.reason === 'DAY_OFF';

            return (
              <button
                key={s.time}
                type="button"
                disabled={isBooked || isPast || isOutOfSchedule}
                onClick={() => handleToggleBarberSlot(s.time, isManualBlocked)}
                className={`p-3 rounded-xl text-xs font-mono font-bold transition-all text-center flex flex-col items-center justify-center gap-1 border ${
                  isBooked
                    ? 'bg-slate-100 dark:bg-noir-950 border-slate-200 dark:border-industrial-850 text-slate-400 dark:text-industrial-500 cursor-not-allowed opacity-60'
                    : isManualBlocked
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                    : isPast
                    ? 'bg-slate-100/60 dark:bg-noir-950/60 border-slate-200 dark:border-industrial-900 text-slate-400 dark:text-industrial-600 opacity-40 cursor-not-allowed'
                    : isOutOfSchedule
                    ? 'bg-slate-100/40 dark:bg-noir-950/40 border-slate-200 dark:border-industrial-900 text-slate-400 dark:text-industrial-600 opacity-30 cursor-not-allowed'
                    : 'bg-emerald-50 dark:bg-noir-950 text-emerald-900 dark:text-slate-200 border-emerald-300 dark:border-industrial-800 hover:border-gold-500 hover:text-amber-600 dark:hover:text-gold-300 shadow-sm'
                }`}
              >
                <span className="text-sm font-bold">{s.time}</span>
                <span className="text-[10px] font-normal tracking-wide">
                  {isBooked ? 'Ocupado 🔒' : isManualBlocked ? 'Pausado ⏸️' : isPast ? 'Pasado' : isOutOfSchedule ? 'Fuera Horario' : 'Libre ✓'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda Personal del Día */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* En Sillón Ahora */}
        <div className="lg:col-span-5 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-industrial-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Cliente en Sillón Ahora</h3>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold">En Atención</span>
            </div>

            {appointments.current ? (
              <div className="bg-slate-50 dark:bg-noir-950 rounded-2xl p-5 border border-blue-500/30 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">{appointments.current.clientName}</h4>
                    <p className="text-xs text-amber-600 dark:text-gold-400 mt-0.5">{appointments.current.serviceName}</p>
                    {appointments.current.clientPhone && (
                      <p className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono mt-1">{appointments.current.clientPhone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">${appointments.current.price}</span>
                    <span className="text-xs text-slate-500 dark:text-industrial-400 block font-mono">{appointments.current.time}</span>
                  </div>
                </div>

                {appointments.current.notes && (
                  <div className="p-3 bg-white dark:bg-noir-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 italic border border-slate-200 dark:border-industrial-800">
                    "{appointments.current.notes}"
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-industrial-500 bg-slate-50 dark:bg-noir-950 rounded-2xl border border-dashed border-slate-200 dark:border-industrial-800">
                Tu sillón está libre ahora mismo.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-industrial-800/80 text-xs text-slate-500 dark:text-industrial-400">
            Al terminar el corte, recepción procesará el cobro y se sumará a tus comisiones de hoy.
          </div>
        </div>

        {/* Próximas Citas Asignadas */}
        <div className="lg:col-span-7 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-industrial-800 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-500" />
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Mis Próximos Turnos</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-industrial-400 font-mono">
                {appointments.upcoming.length} turnos pendientes
              </span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {appointments.upcoming.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 dark:text-industrial-500">
                  No tienes más citas programadas para hoy.
                </div>
              ) : (
                appointments.upcoming.map((apt) => {
                  const rawPhone = (apt.clientPhone || '').replace(/[^\d]/g, '');
                  const cleanPhone = rawPhone.length === 10 && rawPhone.startsWith('3') ? `57${rawPhone}` : rawPhone;
                  const waUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${apt.clientName} 💈 te escribe ${barber.name} de BarberPulse. ¿Estás listo para tu turno a las ${apt.time}?`)}`
                    : null;

                  return (
                    <div
                      key={apt.id}
                      className="p-4 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 rounded-xl flex items-center justify-between transition-colors gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white dark:bg-noir-900 border border-amber-400/40 dark:border-gold-500/30 rounded-xl flex flex-col items-center justify-center font-mono flex-shrink-0 shadow-sm">
                          <span className="text-xs font-bold text-amber-600 dark:text-gold-400">{apt.time}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{apt.clientName}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-semibold">
                              En Espera
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-industrial-400 flex items-center gap-1.5 mt-0.5">
                            <Scissors className="w-3 h-3 text-gold-500" /> {apt.serviceName}
                          </p>
                          {apt.clientPhone && (
                            <p className="text-[11px] text-slate-400 dark:text-industrial-500 font-mono mt-0.5">
                              📞 {apt.clientPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                            title="Escribir al cliente por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                          </a>
                        )}

                        <button
                          onClick={async () => {
                            try {
                              await updateStatus(apt.id, 'IN_CHAIR');
                              fetchBarberData();
                            } catch (e) {
                              alert('Error al pasar al sillón');
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors text-xs font-semibold"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Sillón
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Configuración de Horarios & Turnos (Rostering) */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Configurar Horarios & Metas: ${barber.name}`}
        maxWidth="max-w-xl"
      >
        {scheduleForm && (
          <form onSubmit={handleSaveSchedule} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {saveSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                ¡Turnos y metas guardadas exitosamente!
              </div>
            )}

            {/* Metas Financieras */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-noir-950 p-4 rounded-2xl border border-slate-200 dark:border-industrial-800 shadow-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                  Meta Diaria Facturación ($)
                </label>
                <input
                  type="number"
                  value={dailyTargetInput}
                  onChange={(e) => setDailyTargetInput(e.target.value)}
                  className="w-full bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                  % Comisión Pactada
                </label>
                <input
                  type="number"
                  value={commissionRateInput}
                  onChange={(e) => setCommissionRateInput(e.target.value)}
                  className="w-full bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-xl px-3 py-2 text-xs text-amber-600 dark:text-gold-400 font-mono font-bold"
                />
              </div>
            </div>

            {/* Matriz Semanal de Turnos */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                Jornada Laboral Semanal (Staff Rostering)
              </label>

              {Object.keys(daysLabels).map((dayKey) => {
                const dayConfig = scheduleForm[dayKey] || { working: false };
                return (
                  <div
                    key={dayKey}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors ${
                      dayConfig.working
                        ? 'bg-white dark:bg-noir-950 border-slate-200 dark:border-industrial-800 shadow-sm'
                        : 'bg-slate-50 dark:bg-noir-950/40 border-slate-200 dark:border-industrial-900 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer sm:w-32">
                      <input
                        type="checkbox"
                        checked={dayConfig.working}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            [dayKey]: { ...dayConfig, working: e.target.checked }
                          })
                        }
                        className="rounded border-slate-300 dark:border-industrial-700 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">{daysLabels[dayKey]}</span>
                    </label>

                    {dayConfig.working ? (
                      <div className="flex items-center gap-2 font-mono">
                        <input
                          type="time"
                          value={dayConfig.start || '09:00'}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              [dayKey]: { ...dayConfig, start: e.target.value }
                            })
                          }
                          className="bg-slate-50 dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-400 dark:text-industrial-500">hasta</span>
                        <input
                          type="time"
                          value={dayConfig.end || '19:00'}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              [dayKey]: { ...dayConfig, end: e.target.value }
                            })
                          }
                          className="bg-slate-50 dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-industrial-500 italic">Día Libre / Descanso</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-industrial-800">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold"
              >
                <Save className="w-4 h-4" /> Guardar Turno
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Administrar Todo el Equipo de Barberos */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title={`Equipo de Barberos (${barbers.length})`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
            <p className="text-xs text-industrial-400">
              Gestiona los barberos del salón, sus tasas de comisión y datos de contacto.
            </p>
            <button
              onClick={() => {
                setIsTeamModalOpen(false);
                openNewBarberModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-gold transition-all flex-shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Nuevo Barbero</span>
            </button>
          </div>

          <div className="space-y-3">
            {barbers.map((b) => {
              const isCurrent = b.id === selectedBarberId;
              const commissionPct = Math.round((Number(b.commissionRate) || 0.5) * 100);

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-gold-500/10 border-gold-500/40 shadow-sm'
                      : 'bg-noir-950 border-industrial-800 hover:border-industrial-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={b.avatar || AVATAR_PRESETS[0].url}
                      alt={b.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gold-500/30 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{b.name}</h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-gold-500/20 text-gold-300">
                          {commissionPct}% Comisión
                        </span>
                      </div>

                      <div className="text-[11px] text-industrial-400 flex flex-wrap items-center gap-2 mt-0.5">
                        {b.phone && <span>📞 {b.phone}</span>}
                        {b.dailyTarget && <span>• Meta: ${b.dailyTarget}</span>}
                      </div>

                      {b.specialties && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(Array.isArray(b.specialties) ? b.specialties : b.specialties.split(',')).map((spec, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-noir-900 border border-industrial-800 text-slate-300">
                              {spec.trim ? spec.trim() : spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setSelectedBarberId(b.id);
                        setIsTeamModalOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-noir-900 hover:bg-noir-850 border border-industrial-700 text-slate-200 text-xs font-semibold transition-colors"
                      title="Ver panel de este barbero"
                    >
                      Ver Panel
                    </button>

                    <button
                      onClick={() => {
                        setIsTeamModalOpen(false);
                        openEditBarberModal(b);
                      }}
                      className="p-2 rounded-lg bg-noir-900 hover:bg-gold-500/20 border border-industrial-700 text-industrial-400 hover:text-gold-400 transition-colors"
                      title="Editar barbero"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteBarber(b)}
                      className="p-2 rounded-lg bg-noir-900 hover:bg-rose-500/20 border border-industrial-700 text-industrial-400 hover:text-rose-400 transition-colors"
                      title="Eliminar barbero"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Modal: Formulario Crear / Editar Barbero */}
      <Modal
        isOpen={isBarberFormOpen}
        onClose={() => setIsBarberFormOpen(false)}
        title={editingBarber ? `Modificar Barbero: ${editingBarber.name}` : 'Registrar Nuevo Barbero'}
      >
        <form onSubmit={handleSaveBarber} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
              Nombre Completo & Apodo Profesional *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Andrés 'Fader' Castro"
              value={barberFormData.name}
              onChange={(e) => setBarberFormData({ ...barberFormData, name: e.target.value })}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                WhatsApp / Teléfono
              </label>
              <input
                type="tel"
                placeholder="+57 300 000 0000"
                value={barberFormData.phone}
                onChange={(e) => setBarberFormData({ ...barberFormData, phone: e.target.value })}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="andres@barberia.com"
                value={barberFormData.email}
                onChange={(e) => setBarberFormData({ ...barberFormData, email: e.target.value })}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                % Comisión por Servicios
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="90"
                  required
                  value={barberFormData.commissionRate}
                  onChange={(e) => setBarberFormData({ ...barberFormData, commissionRate: e.target.value })}
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-gold-400 font-mono font-bold focus:outline-none focus:border-gold-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-industrial-500 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Meta Diaria ($)
              </label>
              <input
                type="number"
                value={barberFormData.dailyTarget}
                onChange={(e) => setBarberFormData({ ...barberFormData, dailyTarget: e.target.value })}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
              Especialidades (Separadas por coma)
            </label>
            <input
              type="text"
              placeholder="Skin Fade, Barba Ritual, Freestyle, Tijera Clásica"
              value={barberFormData.specialties}
              onChange={(e) => setBarberFormData({ ...barberFormData, specialties: e.target.value })}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Selector de Foto / Avatar */}
          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-2">
              Foto de Perfil Profesional
            </label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {AVATAR_PRESETS.map((preset, idx) => {
                const isSelected = barberFormData.avatar === preset.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBarberFormData({ ...barberFormData, avatar: preset.url })}
                    className={`p-1 rounded-xl border transition-all text-center flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'border-gold-500 bg-gold-500/20 shadow-glow-gold'
                        : 'border-industrial-800 hover:border-industrial-700 bg-noir-950'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-10 h-10 rounded-lg object-cover" />
                    <span className="text-[9px] text-industrial-400 truncate w-full">{preset.label}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="url"
              placeholder="O pega una URL de imagen personalizada"
              value={barberFormData.avatar}
              onChange={(e) => setBarberFormData({ ...barberFormData, avatar: e.target.value })}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-1.5 text-[11px] text-industrial-400 font-mono focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-industrial-800">
            <button
              type="button"
              onClick={() => setIsBarberFormOpen(false)}
              className="px-4 py-2 rounded-xl text-industrial-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs uppercase shadow-glow-gold transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{formSaving ? 'Guardando...' : editingBarber ? 'Guardar Cambios' : 'Registrar Barbero'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

