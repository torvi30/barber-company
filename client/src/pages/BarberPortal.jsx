import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmDialog
} from '../lib/swal';
import { uploadToCloudinary } from '../services/cloudinaryService';
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
  AlertCircle,
  Upload,
  Camera
} from 'lucide-react';

const AVATAR_PRESETS = [
  { label: 'Fade / Corto', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=300&q=80' },
  { label: 'Pompadour / Largo', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=300&q=80' },
  { label: 'Afro / Rizado', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=300&q=80' }
];

export const BarberPortal = () => {
  const { tenantId, barbers, updateStatus, addBarber, editBarber, removeBarber } = useBarbershop();
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('jornada'); // 'jornada' | 'schedule' | 'team'

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
      setDashboardData(null);
      setLoading(false);
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
      await showErrorAlert('Gestión de Turnos', 'Error al modificar turno: ' + err.message);
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
      await showErrorAlert('Turnos en Lote', 'Error al modificar turnos en lote: ' + err.message);
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
  const barberFileInputRef = React.useRef(null);
  const [barberPhotoFeedback, setBarberPhotoFeedback] = useState(null);

  const handleBarberPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBarberPhotoFeedback('Subiendo foto a Cloudinary...');
    try {
      const result = await uploadToCloudinary(file, 'barberos');
      if (result?.url) {
        setBarberFormData(prev => ({ ...prev, avatar: result.url }));
        setBarberPhotoFeedback('✓ Foto guardada en Cloudinary (barber-company/barberos)');
      }
    } catch (err) {
      console.warn('Fallo Cloudinary upload:', err.message);
      setBarberPhotoFeedback('Error al subir: ' + err.message);
    }
  };

  const openNewBarberModal = () => {
    setEditingBarber(null);
    setBarberPhotoFeedback(null);
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
    setBarberPhotoFeedback(null);
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
      await showSuccessAlert(
        editingBarber ? '¡Barbero Actualizado!' : '¡Barbero Registrado!',
        `El perfil de "${formData.name}" ha sido guardado exitosamente.`
      );
    } catch (err) {
      await showErrorAlert('Error al Guardar Especialista', err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteBarber = async (b) => {
    if (barbers.length <= 1) {
      await showErrorAlert('Operación No Permitida', 'Tu barbería debe tener al menos un especialista registrado.');
      return;
    }

    const confirmRes = await showConfirmDialog({
      title: '¿Eliminar Barbero?',
      text: `¿Estás seguro de eliminar a "${b.name}" del equipo de trabajo?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      icon: 'warning'
    });
    if (!confirmRes.isConfirmed) return;

    try {
      await removeBarber(b.id);
      if (selectedBarberId === b.id) {
        const remaining = barbers.filter(barb => barb.id !== b.id);
        if (remaining.length > 0) setSelectedBarberId(remaining[0].id);
      }
      fetchBarberData();
      await showSuccessAlert('Barbero Eliminado', `"${b.name}" fue removido de la barbería.`);
    } catch (err) {
      await showErrorAlert('Error al Eliminar', err.message);
    }
  };

  const fetchBarberData = async () => {
    if (!selectedBarberId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getBarberDashboard(tenantId, selectedBarberId);
      if (res && res.success && res.barber) {
        setDashboardData(res);
        setDailyTargetInput(res.barber.dailyTarget || 150000);
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
      } else {
        const currentB = barbers.find(b => b.id === selectedBarberId) || { name: 'Especialista', commissionRate: 0.5 };
        setDashboardData({
          barber: currentB,
          metrics: {
            todayCommission: 0,
            todayTips: 0,
            totalEarningsToday: 0,
            completedCuts: 0,
            targetProgress: 0,
            dailyTarget: currentB.dailyTarget || 150000
          },
          appointments: []
        });
      }
    } catch (err) {
      console.warn('Error al cargar dashboard del barbero, usando datos locales:', err.message);
      const currentB = barbers.find(b => b.id === selectedBarberId) || { name: 'Especialista', commissionRate: 0.5 };
      setDashboardData({
        barber: currentB,
        metrics: {
          todayCommission: 0,
          todayTips: 0,
          totalEarningsToday: 0,
          completedCuts: 0,
          targetProgress: 0,
          dailyTarget: currentB.dailyTarget || 150000
        },
        appointments: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBarberId) {
      fetchBarberData();
    } else {
      setLoading(false);
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
      await showErrorAlert('Estado en Salón', 'Error al actualizar estado en vivo: ' + err.message);
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
        fetchBarberData();
        await showSuccessAlert(
          '¡Horarios y Metas Guardados!',
          `Se actualizaron los turnos semanales de "${dashboardData?.barber?.name || 'barbero'}" exitosamente.`
        );
      }
    } catch (err) {
      await showErrorAlert('Horarios', err.message || 'Error al guardar horario');
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

  if (barbers.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto p-8 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-3xl shadow-lg animate-fadeIn my-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-600/20 to-gold-400/20 border border-gold-500/30 flex items-center justify-center mx-auto text-gold-400 shadow-glow-gold/10">
          <Scissors className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
            {tenantId ? 'No hay barberos registrados' : 'Selecciona una barbería'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-1.5 leading-relaxed">
            {tenantId
              ? 'Para activar las jornadas, comisiones y turnos en tiempo real, registra a tu primer especialista del equipo.'
              : 'Selecciona una barbería en el menú superior o crea una nueva desde el SuperAdmin.'}
          </p>
        </div>
        {tenantId ? (
          <button
            type="button"
            onClick={openNewBarberModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider transition-all shadow-glow-gold cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Primer Barbero</span>
          </button>
        ) : (
          <div className="text-[11px] font-mono text-gold-400 bg-gold-500/10 border border-gold-500/20 px-3 py-1.5 rounded-xl">
            💡 Abre el menú superior para elegir o crear una sede.
          </div>
        )}
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400 flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
        <span>Sincronizando portal privado...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400">
        No se pudieron cargar los datos del especialista seleccionado.
      </div>
    );
  }

  const { barber, metrics, appointments } = dashboardData;

  return (
    <div className="space-y-4 animate-fadeIn max-w-6xl mx-auto">
      {/* Sub-Navegación Compacta */}
      <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-noir-950 rounded-xl border border-slate-200 dark:border-industrial-850">
          <button
            type="button"
            onClick={() => setActiveSection('jornada')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'jornada'
                ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Jornada</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'schedule'
                ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Turnos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('team')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'team'
                ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Equipo ({barbers.length})</span>
          </button>
        </div>

        {/* Switcher rápido de barbero */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
          <span className="text-slate-400 dark:text-industrial-500 text-[10px] hidden sm:inline uppercase font-bold tracking-wider">Barbero:</span>
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
      </div>

      {activeSection === 'jornada' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Unificado de Barbero + Control de Estado en Vivo (1 sola fila limpia) */}
          <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Perfil del Barbero */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-gold-500 shadow-glow-gold"
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-noir-900 ${
                    barber.status === 'AVAILABLE' ? 'bg-emerald-500' :
                    barber.status === 'IN_SERVICE' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
                  }`}
                  title={barber.status === 'AVAILABLE' ? 'Disponible' : barber.status === 'IN_SERVICE' ? 'En Sillón' : 'Descanso'}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white truncate">
                    {barber.name}
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30 flex-shrink-0">
                    {barber.commissionPercent}% com.
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-industrial-400 flex items-center gap-2 truncate">
                  <span>Meta: <strong className="font-mono text-slate-700 dark:text-slate-200">${Math.round(barber.dailyTarget || 0).toLocaleString('es-CO')}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-500 dark:text-emerald-400 font-mono text-[10px]">
                    {barber.status === 'AVAILABLE' ? '🟢 Disponible' : barber.status === 'IN_SERVICE' ? '🔵 En Sillón' : '⚪ Pausa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Segmented Control de Estado (3 Píldoras Compactas) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-noir-950 rounded-xl border border-slate-200 dark:border-industrial-800 self-stretch sm:self-auto justify-between sm:justify-end gap-1">
              <button
                type="button"
                onClick={() => handleStatusChange('AVAILABLE')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  barber.status === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>Libre</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('IN_SERVICE')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  barber.status === 'IN_SERVICE'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Scissors className="w-3 h-3" />
                <span>En Sillón</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('BREAK')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  barber.status === 'BREAK'
                    ? 'bg-slate-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Pausa</span>
              </button>
            </div>
          </div>

          {/* Métricas Financieras del Barbero: Cuadrícula Compacta 2x2 en Móvil / 4 columnas en Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Total Ganado Hoy */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-gold-500/10 via-noir-900 to-noir-950 border border-gold-500/30 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">Total Ganado</span>
                <TrendingUp className="w-3.5 h-3.5 text-gold-400" />
              </div>
              <div className="mt-1">
                <div className="text-base sm:text-xl font-bold font-mono text-white">
                  ${Math.round(metrics.totalPersonalEarnings || 0).toLocaleString('es-CO')}
                </div>
                <span className="text-[10px] text-industrial-400 font-mono">
                  {metrics.servicesCount || 0} {metrics.servicesCount === 1 ? 'corte' : 'cortes'}
                </span>
              </div>
            </div>

            {/* Mi Comisión */}
            <div className="p-3 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Mi Comisión</span>
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1">
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                  ${Math.round(metrics.commissionEarned || 0).toLocaleString('es-CO')}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">
                  {barber.commissionPercent}% de ${Math.round(metrics.grossServices || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Propinas */}
            <div className="p-3 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Mis Propinas</span>
                <Award className="w-3.5 h-3.5 text-gold-400" />
              </div>
              <div className="mt-1">
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                  ${Math.round(metrics.tipsEarned || 0).toLocaleString('es-CO')}
                </div>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono">
                  100% tuyas
                </span>
              </div>
            </div>

            {/* Meta Diaria y Progreso */}
            <div className="p-3 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Meta Diaria</span>
                <span className="text-[10px] font-mono font-bold text-gold-400">{metrics.targetProgressPercent || 0}%</span>
              </div>
              <div className="mt-1">
                <div className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate">
                  ${Math.round(metrics.grossServices || 0).toLocaleString('es-CO')} <span className="text-[10px] text-slate-400 dark:text-industrial-500 font-normal">/ ${Math.round(barber.dailyTarget || 0).toLocaleString('es-CO')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-noir-950 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-gold-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(metrics.targetProgressPercent || 0, 100)}%` }}
                  />
                </div>
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
                              await showErrorAlert('Sillón', 'Error al pasar cliente al sillón');
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
    </div>
  )}

      {/* Vista 2: Gestión de Horarios Semanales & Metas */}
      {activeSection === 'schedule' && (
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-industrial-800">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Horarios & Metas Financieras: {barber.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">
                Define la meta de facturación diaria, comisión pactada y disponibilidad semanal de este especialista.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-gold-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 self-start sm:self-auto">
              Tasa Actual: {barber.commissionPercent}%
            </span>
          </div>

          <form onSubmit={handleSaveSchedule} className="space-y-6">
            {/* Metas Financieras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-noir-950 p-4 rounded-2xl border border-slate-200 dark:border-industrial-800">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                  Meta Diaria Facturación ($)
                </label>
                <input
                  type="number"
                  value={dailyTargetInput}
                  onChange={(e) => setDailyTargetInput(e.target.value)}
                  className="w-full bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-gold-500"
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
                  className="w-full bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-600 dark:text-gold-400 font-mono font-bold focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            {/* Matriz Semanal de Turnos */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                Jornada Laboral Semanal (Staff Rostering)
              </label>

              {scheduleForm && Object.keys(daysLabels).map((dayKey) => {
                const dayConfig = scheduleForm[dayKey] || { working: false };
                return (
                  <div
                    key={dayKey}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                      dayConfig.working
                        ? 'bg-white dark:bg-noir-950 border-slate-200 dark:border-industrial-800 shadow-sm'
                        : 'bg-slate-50 dark:bg-noir-950/40 border-slate-200 dark:border-industrial-900 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer sm:w-36">
                      <input
                        type="checkbox"
                        checked={dayConfig.working}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            [dayKey]: { ...dayConfig, working: e.target.checked }
                          })
                        }
                        className="rounded border-slate-300 dark:border-industrial-700 text-gold-500 focus:ring-gold-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{daysLabels[dayKey]}</span>
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
                          className="bg-slate-50 dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
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
                          className="bg-slate-50 dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-industrial-500 italic">Día Libre / Descanso</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-industrial-800">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Horarios y Metas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista 3: Gestión del Equipo de Barberos */}
      {activeSection === 'team' && (
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-industrial-800">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Equipo de Especialistas ({barbers.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">
                Administra los barberos del salón, sus tasas de comisión y datos de contacto.
              </p>
            </div>
            <button
              onClick={openNewBarberModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs shadow-glow-gold transition-all self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Nuevo Barbero</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map((b) => {
              const isCurrent = b.id === selectedBarberId;
              const commissionPct = Math.round((Number(b.commissionRate) || 0.5) * 100);

              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isCurrent
                      ? 'bg-amber-500/5 dark:bg-gold-500/10 border-gold-500/50 shadow-md ring-1 ring-gold-500/20'
                      : 'bg-slate-50 dark:bg-noir-950 border-slate-200 dark:border-industrial-800 hover:border-gold-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.avatar || AVATAR_PRESETS[0].url}
                          alt={b.name}
                          className="w-12 h-12 rounded-xl object-cover border border-gold-500/40 shadow-sm flex-shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{b.name}</h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-gold-300 border border-amber-500/30">
                            {commissionPct}% Comisión
                          </span>
                        </div>
                      </div>

                      <Badge status={b.status || 'AVAILABLE'}>
                        {b.status === 'AVAILABLE' ? '🟢 Libre' : b.status === 'IN_SERVICE' ? '🔵 En Sillón' : '⚪ Pausa'}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-industrial-400 space-y-1 font-mono">
                      {b.phone && <div className="flex items-center gap-1.5">📞 {b.phone}</div>}
                      {b.dailyTarget && <div className="flex items-center gap-1.5">🎯 Meta: ${b.dailyTarget}</div>}
                    </div>

                    {b.specialties && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(Array.isArray(b.specialties) ? b.specialties : b.specialties.split(',')).map((spec, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-slate-300"
                          >
                            {spec.trim ? spec.trim() : spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones del Barbero */}
                  <div className="pt-3 border-t border-slate-200 dark:border-industrial-850 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedBarberId(b.id);
                        setActiveSection('jornada');
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                        isCurrent
                          ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                          : 'bg-slate-200/80 dark:bg-industrial-800/80 hover:bg-gold-500 hover:text-black text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isCurrent ? 'Viendo Jornada' : 'Ver Jornada'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditBarberModal(b)}
                        className="p-2 rounded-xl bg-slate-200/80 dark:bg-industrial-800/80 hover:bg-gold-500/20 text-slate-700 dark:text-industrial-300 hover:text-gold-400 transition-colors cursor-pointer"
                        title="Editar barbero"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteBarber(b)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar barbero"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

          {/* Selector y Vista Previa de Foto de Perfil */}
          <div className="p-3.5 rounded-2xl bg-noir-950 border border-industrial-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-industrial-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-gold-400" />
                <span>Foto de Perfil Profesional</span>
              </label>
              <input
                ref={barberFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBarberPhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => barberFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs shadow-glow-gold transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Foto Propia</span>
              </button>
            </div>

            {barberPhotoFeedback && (
              <p className={`text-[11px] font-mono ${barberPhotoFeedback.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                {barberPhotoFeedback}
              </p>
            )}

            {/* Vista Previa de Foto Activa + 3 Avatares Genéricos con Diferente Pelo */}
            <div className="flex items-center gap-4 pt-1">
              {/* Foto / Preview Activo */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="relative group">
                  <img
                    src={barberFormData.avatar || AVATAR_PRESETS[0].url}
                    alt={barberFormData.name || 'Barbero'}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-gold-500 shadow-glow-gold"
                  />
                  <button
                    type="button"
                    onClick={() => barberFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-semibold transition-opacity cursor-pointer"
                    title="Cambiar foto"
                  >
                    <Camera className="w-4 h-4 text-gold-400 mb-0.5" />
                    <span>Cambiar</span>
                  </button>
                </div>
                <span className="text-[10px] text-gold-400 font-mono font-semibold">Foto Activa</span>
              </div>

              {/* 3 Avatares Genéricos con Diferente Pelo */}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-industrial-400 block mb-1.5">
                  O escoge un avatar genérico por estilo de cabello:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_PRESETS.map((preset, idx) => {
                    const isSelected = barberFormData.avatar === preset.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBarberFormData({ ...barberFormData, avatar: preset.url });
                          setBarberPhotoFeedback(null);
                        }}
                        className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-gold-500 bg-gold-500/20 shadow-glow-gold ring-1 ring-gold-500'
                            : 'border-industrial-800 hover:border-gold-500/40 bg-noir-900'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className={`text-[9px] truncate w-full font-medium ${isSelected ? 'text-gold-400 font-bold' : 'text-industrial-400'}`}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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

