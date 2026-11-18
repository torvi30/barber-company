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
import { buildWhatsAppLink, normalizeWhatsAppPhone, formatDisplayPhone } from '../lib/phoneUtils';
import { generateDynamicSlots } from '../lib/slotEngine';
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
  ChevronDown,
  Save,
  Sliders,
  Phone,
  MessageCircle,
  ArrowRight,
  UserPlus,
  Edit3,
  FileText,
  Trash2,
  Users,
  AlertCircle,
  Upload,
  Camera,
  Lock,
  KeyRound,
  LogOut,
  Target,
  X,
  Plus,
  Copy
} from 'lucide-react';

const AVATAR_PRESETS = [
  { label: 'Fade / Corto', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=300&q=80' },
  { label: 'Pompadour / Largo', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=300&q=80' },
  { label: 'Afro / Rizado', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=300&q=80' }
];

export const BarberPortal = ({
  standaloneBarberMode = false,
  barberSession = null,
  onLogoutBarber = null,
  initialSection = null
}) => {
  const { tenantId, barbers = [], appointments: contextAppointments = [], updateStatus, cancelAppointment, addBarber, editBarber, removeBarber, barbershopInfo } = useBarbershop();
  const [selectedBarberId, setSelectedBarberId] = useState(
    standaloneBarberMode && (barberSession?.id || barberSession?.barberId)
      ? (barberSession.id || barberSession.barberId)
      : ''
  );
  const [dashboardData, setDashboardData] = useState(() => {
    if (standaloneBarberMode && barberSession) {
      return {
        barber: barberSession,
        metrics: {
          servicesCount: 0,
          inChairCount: 0,
          upcomingCount: 0,
          grossServices: 0,
          commissionEarned: 0,
          tipsEarned: 0,
          totalPersonalEarnings: 0,
          targetProgressPercent: 0
        },
        appointments: { current: null, upcoming: [], history: [] }
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (initialSection) return initialSection;
    return standaloneBarberMode ? 'jornada' : 'team';
  });
  const [activeBottomTab, setActiveBottomTab] = useState('sillon'); // 'sillon' | 'turnos' | 'ganancias' | 'horario'
  const [isBarberDropdownOpen, setIsBarberDropdownOpen] = useState(false);
  const [visiblePins, setVisiblePins] = useState({});

  // Mantener actualizado el barbero seleccionado cuando cambien los barberos del tenant
  useEffect(() => {
    if (standaloneBarberMode && (barberSession?.id || barberSession?.barberId)) {
      setSelectedBarberId(barberSession.id || barberSession.barberId);
      return;
    }
    if (barbers && barbers.length > 0) {
      const exists = barbers.some(b => b.id === selectedBarberId);
      if (!exists) {
        setSelectedBarberId(barbers[0].id);
      }
    } else {
      setSelectedBarberId('');
      setDashboardData(null);
      setLoading(false);
    }
  }, [barbers, tenantId, standaloneBarberMode, barberSession]);

  // En modo sillón aislado (PIN), garantizar persistencia sin expulsión accidental
  useEffect(() => {
    if (!standaloneBarberMode || !barberSession) return;
    const sessionBarberId = barberSession.id || barberSession.barberId;
    if (sessionBarberId && selectedBarberId !== sessionBarberId) {
      setSelectedBarberId(sessionBarberId);
    }
  }, [standaloneBarberMode, barberSession, selectedBarberId]);

  // Modal / Drawer de Horarios (Rostering)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(null);
  const [dailyTargetInput, setDailyTargetInput] = useState(150);
  const [commissionRateInput, setCommissionRateInput] = useState(50);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal de Ajuste Rápido de Comisión del Barbero
  const [isEditCommissionOpen, setIsEditCommissionOpen] = useState(false);
  const [commissionEditInput, setCommissionEditInput] = useState(50);
  const [savingCommission, setSavingCommission] = useState(false);

  // Control rápido de turnos y disponibilidad activa
  const [barberSlots, setBarberSlots] = useState([]);
  const [loadingBarberSlots, setLoadingBarberSlots] = useState(false);
  const [allowPastBarber, setAllowPastBarber] = useState(false);

  const getLocalDate = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadBarberSlots = async () => {
    if (!selectedBarberId) return;
    try {
      setLoadingBarberSlots(true);
      const today = getLocalDate(new Date());
      const targetInterval = barbershopInfo?.slotInterval || 30;
      const targetBuffer = barbershopInfo?.bufferTime || 0;

      let loadedSlots = null;
      try {
        const res = await api.getAvailableSlots(tenantId, selectedBarberId, today, allowPastBarber, targetInterval, targetBuffer);
        if (res.success && Array.isArray(res.slots) && res.slots.length > 0) {
          loadedSlots = res.slots;
        }
      } catch (e) {
        // Fallback dinámico
      }

      if (!loadedSlots || loadedSlots.length === 0) {
        const dynamic = generateDynamicSlots({
          date: today,
          barber: selectedBarber,
          appointments,
          manualBlocked: [],
          slotInterval: targetInterval,
          bufferTime: targetBuffer,
          allowPast: allowPastBarber
        });
        loadedSlots = dynamic.slots;
      }

      setBarberSlots(loadedSlots || []);
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
  }, [selectedBarberId, tenantId, allowPastBarber, barbershopInfo?.slotInterval, barbershopInfo?.bufferTime]);

  const handleToggleBarberSlot = async (slotTime, isBlocked) => {
    try {
      const today = getLocalDate(new Date());
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
      const today = getLocalDate(new Date());
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
    dailyTarget: 150000,
    specialties: '',
    avatar: AVATAR_PRESETS[0].url
  });
  const [formSaving, setFormSaving] = useState(false);
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('');
  const barberFileInputRef = React.useRef(null);
  const [barberPhotoFeedback, setBarberPhotoFeedback] = useState(null);

  const normalizePercent = (val) => {
    let num = Number(val);
    if (isNaN(num)) return 50;
    while (num > 100) num /= 100;
    if (num <= 1 && num > 0) num *= 100;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

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
    setNewSpecialtyInput('');
    setBarberFormData({
      name: '',
      phone: '',
      email: '',
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      commissionRate: 50,
      dailyTarget: 150000,
      specialties: '',
      avatar: AVATAR_PRESETS[0].url
    });
    setIsBarberFormOpen(true);
  };

  const openEditBarberModal = (b) => {
    setEditingBarber(b);
    setBarberPhotoFeedback(null);
    setNewSpecialtyInput('');
    setBarberFormData({
      name: b.name || '',
      phone: b.phone || '',
      email: b.email || '',
      pin: b.pin || '1234',
      commissionRate: normalizePercent(b.commissionRate != null ? b.commissionRate : b.commissionPercent),
      dailyTarget: b.dailyTarget || b.dailyGoal || 150000,
      specialties: Array.isArray(b.specialties) ? b.specialties.join(', ') : (b.specialties || ''),
      avatar: b.avatar || AVATAR_PRESETS[0].url
    });
    setIsBarberFormOpen(true);
  };

  const getBarberAccessUrl = (b) => {
    const shopSlug = barbershopInfo?.slug || barbershopInfo?.id || tenantId || '';
    const tid = tenantId || barbershopInfo?.id || '';
    return `${window.location.origin}?barbero=pin&b=${b.id}${shopSlug ? `&slug=${shopSlug}` : ''}${tid ? `&tid=${tid}` : ''}`;
  };

  const handleCopyBarberLink = async (b) => {
    const url = getBarberAccessUrl(b);
    try {
      await navigator.clipboard.writeText(url);
      await showSuccessAlert(
        '¡Enlace Copiado!',
        `Enlace copiado para ${b.name}.\n\nPIN Personal: ${b.pin || '1234'}\n\nEnvíaselo a ${b.name} por WhatsApp o mensaje. Al abrirlo en su celular, solo ingresa su PIN y entra directo a su sillón.`
      );
    } catch {
      prompt(`Enlace de acceso para ${b.name} (PIN: ${b.pin || '1234'}):`, url);
    }
  };

  const handleSendWhatsAppPin = (b) => {
    const pin = b.pin || '1234';
    const phone = b.phone || b.whatsapp || '';
    const shopName = barbershopInfo?.name || 'Imperio Barbershop';
    const accessUrl = getBarberAccessUrl(b);
    const text = `💈 *${shopName}*\n\n¡Hola ${b.name}! Bienvenido a tu panel de barbero.\n\n🔑 *Tu PIN personal de acceso es:* *${pin}*\n\n👉 *Toca este enlace para abrir tu sillón:* \n${accessUrl}\n\n💡 _Solo debes ingresar tu PIN de 4 dígitos. Tu sesión quedará guardada en tu celular para que veas tus citas del día, comisiones y manejes tus clientes en tiempo real._`;
    const link = buildWhatsAppLink(phone, text);
    window.open(link, '_blank');
  };

  const handleCancelAppointment = async (apt) => {
    if (!apt) return;
    const result = await showConfirmDialog({
      title: '¿Cancelar Turno?',
      text: `¿Estás seguro de cancelar o retirar el turno de ${apt.clientName || 'este cliente'}? Esta acción liberará tu sillón y la agenda.`,
      confirmText: 'Sí, Cancelar Turno',
      cancelText: 'Volver',
      icon: 'warning'
    });

    if (result.isConfirmed) {
      try {
        await cancelAppointment(apt.id);
        fetchBarberData();
        showSuccessAlert(
          'Turno Cancelado',
          `El turno de ${apt.clientName || 'el cliente'} ha sido cancelado.`
        );
      } catch (err) {
        showErrorAlert('Error', 'No se pudo cancelar el turno.');
      }
    }
  };

  const handlePreviewBarberMobile = (b) => {
    const previewSession = {
      id: b.id,
      name: b.name,
      avatar: b.avatar,
      phone: b.phone,
      commissionRate: b.commissionRate,
      dailyTarget: b.dailyTarget || b.dailyGoal || 150000,
      role: 'barber',
      barbershopId: tenantId,
      barbershopName: barbershopInfo?.name || 'Barbería',
      pin: b.pin || '1234'
    };
    localStorage.setItem('barberpulse_barber_session', JSON.stringify(previewSession));
    window.location.reload();
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    if (!barberFormData.name.trim()) return;

    try {
      setFormSaving(true);
      const cleanPercent = normalizePercent(barberFormData.commissionRate);
      const payload = {
        name: barberFormData.name.trim(),
        phone: barberFormData.phone.trim(),
        email: barberFormData.email.trim(),
        pin: barberFormData.pin ? String(barberFormData.pin).trim() : '1234',
        commissionRate: cleanPercent / 100,
        commissionPercent: cleanPercent,
        dailyTarget: Number(barberFormData.dailyTarget) || 150000,
        specialties: (typeof barberFormData.specialties === 'string'
          ? barberFormData.specialties.split(',')
          : (Array.isArray(barberFormData.specialties) ? barberFormData.specialties : [])
        ).map(s => s.trim()).filter(Boolean),
        avatar: barberFormData.avatar
      };

      const wasNew = !editingBarber;
      let newId = editingBarber ? editingBarber.id : null;

      if (editingBarber) {
        await editBarber(editingBarber.id, payload);
      } else {
        const res = await addBarber(payload);
        if (res.success && res.data) {
          newId = res.data.id;
          setSelectedBarberId(res.data.id);
        }
      }

      setIsBarberFormOpen(false);
      fetchBarberData();

      if (wasNew && payload.phone) {
        const inviteConfirm = await showConfirmDialog({
          title: '¡Barbero Registrado!',
          text: `¿Deseas enviar ahora mismo la invitación por WhatsApp a "${payload.name}" con su PIN (${payload.pin}) y su enlace directo de sillón?`,
          confirmText: '📲 Sí, Enviar por WhatsApp',
          cancelText: 'Hacerlo más tarde',
          icon: 'success'
        });
        if (inviteConfirm.isConfirmed) {
          handleSendWhatsAppPin({ id: newId || 'barber', ...payload });
        }
      } else {
        await showSuccessAlert(
          editingBarber ? '¡Barbero Actualizado!' : '¡Barbero Registrado!',
          `El perfil de "${barberFormData.name}" ha sido guardado exitosamente.`
        );
      }
    } catch (err) {
      await showErrorAlert('Error al Guardar Especialista', err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteBarber = async (b) => {
    if (!barbers || barbers.length <= 1) {
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
        const rawApts = res.appointments;
        const normalizedApts = {
          current: rawApts?.current || null,
          upcoming: Array.isArray(rawApts?.upcoming) ? rawApts.upcoming : (Array.isArray(rawApts) ? rawApts : []),
          history: Array.isArray(rawApts?.history) ? rawApts.history : []
        };
        setDashboardData({
          barber: res.barber,
          metrics: res.metrics || {
            servicesCount: 0,
            inChairCount: 0,
            upcomingCount: 0,
            grossServices: 0,
            commissionEarned: 0,
            tipsEarned: 0,
            totalPersonalEarnings: 0,
            targetProgressPercent: 0
          },
          appointments: normalizedApts
        });
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
        const currentB = (barbers || []).find(b => b.id === selectedBarberId)
          || (standaloneBarberMode && barberSession ? barberSession : null)
          || { id: selectedBarberId, name: 'Especialista', commissionRate: 0.5 };
        const myApts = (contextAppointments || []).filter(a => a.barberId === selectedBarberId);
        const inChair = myApts.find(a => a.status === 'IN_CHAIR') || null;
        const upcoming = myApts.filter(a => a.status === 'WAITING' || a.status === 'SCHEDULED');
        const completed = myApts.filter(a => a.status === 'COMPLETED');
        const gross = completed.reduce((sum, a) => sum + Number(a.price || 0), 0);
        const tips = completed.reduce((sum, a) => sum + Number(a.tip || 0), 0);
        const rate = Number(currentB.commissionRate || 0.5);
        const comm = gross * (rate > 1 ? rate / 100 : rate);

        setDashboardData({
          barber: currentB,
          metrics: {
            servicesCount: completed.length,
            inChairCount: inChair ? 1 : 0,
            upcomingCount: upcoming.length,
            grossServices: gross,
            commissionEarned: comm,
            tipsEarned: tips,
            totalPersonalEarnings: comm + tips,
            targetProgressPercent: Math.min(100, Math.round((gross / (currentB.dailyTarget || 150000)) * 100))
          },
          appointments: {
            current: inChair,
            upcoming: upcoming,
            history: completed
          }
        });
      }
    } catch (err) {
      console.warn('Error al cargar dashboard del barbero, usando datos locales:', err.message);
      const currentB = (barbers || []).find(b => b.id === selectedBarberId)
        || (standaloneBarberMode && barberSession ? barberSession : null)
        || { id: selectedBarberId, name: 'Especialista', commissionRate: 0.5 };
      const myApts = (contextAppointments || []).filter(a => a.barberId === selectedBarberId);
      const inChair = myApts.find(a => a.status === 'IN_CHAIR') || null;
      const upcoming = myApts.filter(a => a.status === 'WAITING' || a.status === 'SCHEDULED');
      const completed = myApts.filter(a => a.status === 'COMPLETED');
      const gross = completed.reduce((sum, a) => sum + Number(a.price || 0), 0);
      const tips = completed.reduce((sum, a) => sum + Number(a.tip || 0), 0);
      const rate = Number(currentB.commissionRate || 0.5);
      const comm = gross * (rate > 1 ? rate / 100 : rate);

      setDashboardData({
        barber: currentB,
        metrics: {
          servicesCount: completed.length,
          inChairCount: inChair ? 1 : 0,
          upcomingCount: upcoming.length,
          grossServices: gross,
          commissionEarned: comm,
          tipsEarned: tips,
          totalPersonalEarnings: comm + tips,
          targetProgressPercent: Math.min(100, Math.round((gross / (currentB.dailyTarget || 150000)) * 100))
        },
        appointments: {
          current: inChair,
          upcoming: upcoming,
          history: completed
        }
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
    // 1. Actualización optimista inmediata en la UI local del sillón
    setDashboardData(prev => prev ? ({
      ...prev,
      barber: { ...prev.barber, status: newStatus }
    }) : prev);

    try {
      // 2. Intentar actualización vía API REST (con silenciador si está offline)
      await api.updateBarberStatus(tenantId, selectedBarberId, newStatus).catch(err => {
        console.warn('API updateBarberStatus notice (usando persistencia directa en Firestore):', err.message);
      });

      // 3. Persistir en Firestore de manera 100% resiliente y actualizar contexto
      const currentBarber = barbers.find(b => b.id === selectedBarberId) || dashboardData?.barber || { id: selectedBarberId };
      await editBarber(selectedBarberId, { ...currentBarber, status: newStatus });
    } catch (err) {
      console.warn('Fallback de emergencia para estado de barbero:', err.message);
      try {
        const currentBarber = barbers.find(b => b.id === selectedBarberId) || dashboardData?.barber || { id: selectedBarberId };
        await editBarber(selectedBarberId, { ...currentBarber, status: newStatus });
      } catch (innerErr) {
        console.error('Error final en handleStatusChange:', innerErr);
      }
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

      // 1. Notificar API REST si está en línea
      await api.updateBarberSchedule(tenantId, selectedBarberId, payload).catch(err => {
        console.warn('API updateBarberSchedule notice (usando Firestore):', err.message);
      });

      // 2. Persistir en Firestore y sincronizar barberos
      const currentBarber = barbers.find(b => b.id === selectedBarberId) || dashboardData?.barber || { id: selectedBarberId };
      await editBarber(selectedBarberId, {
        ...currentBarber,
        ...payload
      });

      setSaveSuccess(true);
      fetchBarberData();
      await showSuccessAlert(
        '¡Horarios y Metas Guardados!',
        `Se actualizaron los turnos semanales de "${dashboardData?.barber?.name || 'barbero'}" exitosamente.`
      );
    } catch (err) {
      console.error('Error al guardar horario:', err);
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

  if (!barbers || barbers.length === 0) {
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

  if (!dashboardData && !standaloneBarberMode) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400">
        No se pudieron cargar los datos del especialista seleccionado.
      </div>
    );
  }

  const barber = dashboardData?.barber || (
    standaloneBarberMode && barberSession
      ? { ...barberSession, ...(barbers.find(b => b.id === (barberSession.id || barberSession.barberId)) || {}) }
      : (barbers.find(b => b.id === selectedBarberId) || {})
  );
  const metrics = dashboardData?.metrics || {
    servicesCount: 0,
    inChairCount: 0,
    upcomingCount: 0,
    grossServices: 0,
    commissionEarned: 0,
    tipsEarned: 0,
    totalPersonalEarnings: 0,
    targetProgressPercent: 0
  };
  const rawAppointments = dashboardData?.appointments;
  const appointments = {
    current: rawAppointments?.current || null,
    upcoming: Array.isArray(rawAppointments?.upcoming)
      ? rawAppointments.upcoming
      : (Array.isArray(rawAppointments) ? rawAppointments : []),
    history: Array.isArray(rawAppointments?.history)
      ? rawAppointments.history
      : []
  };
  const getBarberCommissionPct = (b) => {
    if (!b) return 50;
    if (b.commissionPercent != null) {
      return Number(b.commissionPercent) > 100
        ? Math.round(Number(b.commissionPercent) / 100)
        : Math.round(Number(b.commissionPercent));
    }
    if (b.commissionRate != null) {
      const cr = Number(b.commissionRate);
      return cr > 1 ? Math.round(cr) : Math.round(cr * 100);
    }
    return 50;
  };

  const commissionDisplay = getBarberCommissionPct(barber);

  const handleOpenEditCommission = () => {
    setCommissionEditInput(commissionDisplay);
    setIsEditCommissionOpen(true);
  };

  const handleSaveCommissionRate = async (newPct) => {
    const rawVal = newPct !== undefined ? newPct : commissionEditInput;
    const pct = Math.max(0, Math.min(100, Number(rawVal) || 0));
    try {
      setSavingCommission(true);
      const rateDecimal = pct / 100;

      // 1. Sincronizar en Firestore a través de editBarber
      const currentBarber = barbers.find(b => b.id === selectedBarberId) || barber || { id: selectedBarberId };
      const updatedBarber = {
        ...currentBarber,
        commissionRate: rateDecimal,
        commissionPercent: pct
      };
      await editBarber(selectedBarberId, updatedBarber);

      // 2. Intentar API en background
      api.updateBarber(tenantId, selectedBarberId, { commissionRate: rateDecimal }).catch(() => {});

      // 3. Actualizar inmediatamente dashboardData y métricas de comisiones
      setDashboardData(prev => {
        if (!prev) return prev;
        const gross = prev.metrics?.grossServices || 0;
        const tips = prev.metrics?.tipsEarned || 0;
        const newComm = gross * rateDecimal;
        return {
          ...prev,
          barber: {
            ...prev.barber,
            commissionRate: rateDecimal,
            commissionPercent: pct
          },
          metrics: {
            ...prev.metrics,
            commissionEarned: newComm,
            totalPersonalEarnings: newComm + tips
          }
        };
      });

      setIsEditCommissionOpen(false);
      await showSuccessAlert(
        '¡Comisión Actualizada!',
        `La comisión de ${barber.name || 'este especialista'} ahora es del ${pct}%.`
      );
    } catch (err) {
      console.error('Error al actualizar comisión:', err);
      showErrorAlert('Comisión', err.message || 'Error al actualizar comisión');
    } finally {
      setSavingCommission(false);
    }
  };
  const dailyTargetDisplay = (barber.dailyTarget && barber.dailyTarget > 1000)
    ? barber.dailyTarget
    : (barber.dailyGoal || 150000);

  return (
    <div className="space-y-4 animate-fadeIn max-w-6xl mx-auto w-full min-w-0">
      {/* Cabecera Exclusiva Modo Sillón (Aislado y Seguro para el Barbero) */}
      {standaloneBarberMode && (
        <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={barber?.avatar || AVATAR_PRESETS[0].url}
                alt={barber?.name}
                className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-500 shadow-sm"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-noir-900 ${
                  barber?.status === 'AVAILABLE' ? 'bg-emerald-500' :
                  barber?.status === 'IN_SERVICE' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditCommission}
                  className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-gold-300 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Haz clic para modificar el % de comisión"
                >
                  <span>Sillón Activo • {commissionDisplay}% Com.</span>
                  <Edit3 className="w-2.5 h-2.5 opacity-80" />
                </button>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-industrial-400">
                  {barbershopInfo?.name || barberSession?.barbershopName || 'Imperio Barbershop'}
                </span>
              </div>
              <h1 className="text-xl font-display font-black text-slate-900 dark:text-white mt-0.5">
                {barber?.name || barberSession?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Control de Estado en Vivo (Libre, Sillón, Pausa) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-noir-950 rounded-xl border border-slate-200 dark:border-industrial-800 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleStatusChange('AVAILABLE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  barber?.status === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🟢 Libre
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('IN_SERVICE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  barber?.status === 'IN_SERVICE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🔵 En Sillón
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('BREAK')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  barber?.status === 'BREAK'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚪ Pausa
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                const res = await showConfirmDialog({
                  title: '¿Cerrar Sesión del Sillón?',
                  text: 'Para volver a ingresar deberás digitar nuevamente tu PIN de 4 dígitos.',
                  confirmText: 'Sí, cerrar turno',
                  cancelText: 'Seguir atendiendo',
                  icon: 'info'
                });
                if (res.isConfirmed && onLogoutBarber) {
                  onLogoutBarber();
                }
              }}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Cerrar turno y bloquear panel"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar</span>
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Navegación y Switcher Profesional de Barbero (Totalmente Responsive) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl shadow-sm">
        {/* Pestañas de Sección */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-noir-950 rounded-xl border border-slate-200 dark:border-industrial-850 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSection('jornada')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'jornada'
                ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 shadow-sm dark:shadow-glow-gold'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Jornada & Turnos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('schedule')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'schedule'
                ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 shadow-sm dark:shadow-glow-gold'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Horarios</span>
          </button>

          {!standaloneBarberMode && (
            <button
              type="button"
              onClick={() => setActiveSection('team')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'team'
                  ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 shadow-sm dark:shadow-glow-gold'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Equipo ({barbers?.length || 0})</span>
            </button>
          )}
        </div>

        {/* Custom Luxury Barber Switcher Dropdown (Solo en modo Admin) */}
        {!standaloneBarberMode && (
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsBarberDropdownOpen(prev => !prev)}
              className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-2 bg-slate-50 dark:bg-noir-950 hover:bg-slate-100 dark:hover:bg-noir-850 border border-slate-200 dark:border-industrial-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-industrial-700 flex-shrink-0"
                />
                <span className="text-slate-400 dark:text-industrial-500 text-[10px] uppercase font-bold tracking-wider hidden sm:inline">
                  Especialista:
                </span>
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {barber.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${
                  barber.status === 'AVAILABLE' ? 'bg-emerald-500' : barber.status === 'IN_SERVICE' ? 'bg-blue-500' : 'bg-slate-400'
                }`} />
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isBarberDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Menú Desplegable Flotante de Selección Elegante */}
            {isBarberDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsBarberDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 sm:w-72 mt-1.5 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl shadow-xl z-50 p-1.5 animate-fadeIn space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-industrial-500 border-b border-slate-100 dark:border-industrial-800/80">
                    Seleccionar Barbero
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                    {barbers.map((b) => {
                      const isSelected = b.id === selectedBarberId;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBarberId(b.id);
                            setIsBarberDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold dark:bg-gold-500/20 dark:text-gold-300'
                              : 'hover:bg-slate-100 dark:hover:bg-noir-950 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={b.avatar || AVATAR_PRESETS[0].url}
                              alt={b.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-industrial-700 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold truncate block">{b.name}</span>
                              <span className={`text-[10px] font-mono block ${isSelected ? 'text-amber-950 font-semibold dark:text-gold-400' : 'text-slate-400 dark:text-industrial-500'}`}>
                                {b.status === 'AVAILABLE' ? '🟢 Disponible' : b.status === 'IN_SERVICE' ? '🔵 En Sillón' : '⚪ Pausa'}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-slate-950 dark:text-gold-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeSection === 'jornada' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Unificado de Barbero + Control de Estado en Vivo (Solo en modo Admin) */}
          {!standaloneBarberMode && (
            <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Perfil del Barbero */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  onClick={() => setIsBarberDropdownOpen(prev => !prev)}
                  className="relative flex-shrink-0 cursor-pointer group"
                  title="Toca para cambiar de barbero"
                >
                  <img
                    src={barber.avatar}
                    alt={barber.name}
                    className="w-11 h-11 rounded-xl object-cover border-2 border-slate-900 dark:border-gold-500 shadow-sm group-hover:scale-105 transition-transform"
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white truncate">
                      {barber.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsBarberDropdownOpen(prev => !prev)}
                      className="text-[10px] text-slate-500 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white underline font-semibold cursor-pointer"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenEditCommission}
                      className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 dark:bg-gold-500/15 dark:hover:bg-gold-500/25 text-amber-900 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/40 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 shadow-2xs"
                      title="Haz clic para modificar la comisión pactada de este barbero"
                    >
                      <span>{commissionDisplay}% com.</span>
                      <Edit3 className="w-2.5 h-2.5 text-amber-600 dark:text-gold-400 opacity-80" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-industrial-400 flex items-center gap-2 truncate mt-0.5">
                    <span>Meta: <strong className="font-mono text-slate-700 dark:text-slate-200">${Math.round(dailyTargetDisplay).toLocaleString('es-CO')}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">
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
                      ? 'bg-emerald-600 text-white shadow-sm'
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
                      ? 'bg-blue-600 text-white shadow-sm'
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
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Pausa</span>
                </button>
              </div>
            </div>
          )}

          {/* Banner Motivacional de Meta Diaria del Barbero */}
          {dailyTargetDisplay > 0 && (
            <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all ${
              (metrics.targetProgressPercent || 0) >= 100
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-gold-300'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">
                  {(metrics.targetProgressPercent || 0) >= 100 ? '🏆' : '🎯'}
                </span>
                <div>
                  <div className="font-bold text-sm">
                    {(metrics.targetProgressPercent || 0) >= 100
                      ? '¡FELICITACIONES! Has alcanzado tu meta del día en el sillón 🔥'
                      : `Meta del Día: ${metrics.targetProgressPercent || 0}% completado`}
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {(metrics.targetProgressPercent || 0) >= 100
                      ? 'Cada corte o producto extra sumará directo a tus comisiones récord del mes.'
                      : `Faltan $${Math.max(0, Math.round(dailyTargetDisplay - (metrics.grossServices || 0))).toLocaleString('es-CO')} para alcanzar el 100% de tu objetivo.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-industrial-400">Objetivo:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white px-2.5 py-1 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800">
                  ${Math.round(dailyTargetDisplay).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          )}

          {/* Métricas Financieras del Barbero: Limpias, Elegantes y en Porcelana Blanca en Modo Claro */}
          <div id="barber-kpis-section" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Total Ganado Hoy */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-gold-400">Total Ganado</span>
                <TrendingUp className="w-3.5 h-3.5 text-slate-600 dark:text-gold-400" />
              </div>
              <div className="mt-1">
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                  ${Math.round(metrics.totalPersonalEarnings || 0).toLocaleString('es-CO')}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">
                  {metrics.servicesCount || 0} {metrics.servicesCount === 1 ? 'corte' : 'cortes'}
                </span>
              </div>
            </div>

            {/* Mi Comisión */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-300">Mi Comisión</span>
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1">
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                  ${Math.round(metrics.commissionEarned || 0).toLocaleString('es-CO')}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">
                  {commissionDisplay}% de ${Math.round(metrics.grossServices || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Propinas */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-300">Mis Propinas</span>
                <Award className="w-3.5 h-3.5 text-slate-600 dark:text-gold-400" />
              </div>
              <div className="mt-1">
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
                  ${Math.round(metrics.tipsEarned || 0).toLocaleString('es-CO')}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  100% tuyas
                </span>
              </div>
            </div>

            {/* Meta Diaria y Progreso */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-300">Meta Diaria</span>
                <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-gold-400">{metrics.targetProgressPercent || 0}%</span>
              </div>
              <div className="mt-1">
                <div className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate">
                  ${Math.round(metrics.grossServices || 0).toLocaleString('es-CO')} <span className="text-[10px] text-slate-400 dark:text-industrial-500 font-normal">/ ${Math.round(dailyTargetDisplay).toLocaleString('es-CO')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-noir-950 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-slate-900 dark:bg-gradient-to-r dark:from-amber-500 dark:to-gold-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(metrics.targetProgressPercent || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

      {/* Control Rápido de Turnos de Hoy (1 Click para Activar/Pausar) */}
      <div id="turnos-de-hoy-section" className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-industrial-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-700 dark:text-gold-500" />
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Mis Turnos de Hoy (Activar / Pausar)</h3>
              <p className="text-xs text-slate-500 dark:text-industrial-400">Toca cualquier hora para pausarla o activarla con 1 clic en tiempo real.</p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5 bg-slate-100 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{barberSlots.filter(s => s.available).length} turnos libres hoy</span>
            {loadingBarberSlots && <span className="text-amber-500 animate-pulse text-[10px] ml-1">Actualizando...</span>}
          </div>
        </div>

        {/* Acciones Rápidas en Lote (1 Toque) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-industrial-400 mr-1">Rápido:</span>
          <button
            type="button"
            onClick={() => setAllowPastBarber(!allowPastBarber)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              allowPastBarber
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-gold-400'
            }`}
            title="Permite activar y probar turnos incluso fuera de jornada"
          >
            ⚡ {allowPastBarber ? 'Ensayo ON' : 'Desbloquear Ensayo'}
          </button>
          <button
            type="button"
            disabled={loadingBarberSlots}
            onClick={() => {
              const pausedTimes = barberSlots.filter(s => s.reason === 'BLOCKED_MANUALLY').map(s => s.time);
              handleToggleBatchBarberSlots(pausedTimes, false);
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-amber-500/15 border border-slate-200 dark:border-amber-500/30 text-slate-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-amber-500 dark:hover:text-black text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-amber-500/15 border border-slate-200 dark:border-amber-500/30 text-slate-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-amber-500 dark:hover:text-black text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
                disabled={isBooked || (!allowPastBarber && isPast) || isOutOfSchedule}
                onClick={() => handleToggleBarberSlot(s.time, isManualBlocked)}
                className={`p-3 rounded-xl text-xs font-mono font-bold transition-all text-center flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  isBooked
                    ? 'bg-slate-100 dark:bg-noir-950 border-slate-200 dark:border-industrial-850 text-slate-400 dark:text-industrial-500 cursor-not-allowed opacity-60'
                    : isManualBlocked
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                    : (!allowPastBarber && isPast)
                    ? 'bg-slate-50 dark:bg-noir-950/60 border-slate-200 dark:border-industrial-900 text-slate-400 dark:text-industrial-600 opacity-40 cursor-not-allowed'
                    : isOutOfSchedule
                    ? 'bg-slate-50 dark:bg-noir-950/40 border-slate-200 dark:border-industrial-900 text-slate-400 dark:text-industrial-600 opacity-30 cursor-not-allowed'
                    : 'bg-white dark:bg-noir-950 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-industrial-800 hover:border-slate-900 hover:shadow-sm dark:hover:border-gold-500 dark:hover:text-gold-300 shadow-sm'
                }`}
              >
                <span className="text-sm font-bold">{s.time}</span>
                <span className="text-[10px] font-normal tracking-wide">
                  {isBooked ? 'Ocupado 🔒' : isManualBlocked ? 'Pausado ⏸️' : (!allowPastBarber && isPast) ? 'Pasado' : isOutOfSchedule ? 'Fuera Horario' : 'Libre ✓'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda Personal del Día (100% Responsivo en Móvil y Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* En Sillón Ahora */}
        <div id="seccion-sillon" className="lg:col-span-5 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-industrial-800 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Cliente en Sillón Ahora
                </h3>
              </div>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-mono font-bold bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full">
                En Atención
              </span>
            </div>

            {appointments.current ? (
              <div className="bg-slate-50 dark:bg-noir-950 rounded-2xl p-4 border border-blue-500/30 space-y-3 shadow-xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">
                      {appointments.current.clientName}
                    </h4>
                    <p className="text-xs text-amber-600 dark:text-gold-400 font-semibold mt-0.5 flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>{appointments.current.serviceName}</span>
                    </p>
                    {appointments.current.clientPhone && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <a
                          href={`tel:+${normalizeWhatsAppPhone(appointments.current.clientPhone)}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                          title="Llamar directamente"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{formatDisplayPhone(appointments.current.clientPhone)}</span>
                        </a>
                        <a
                          href={buildWhatsAppLink(
                            appointments.current.clientPhone,
                            `Hola ${appointments.current.clientName} 💈 te atiende ${barber.name} en Imperio Barbershop.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                          title="Escribir por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white block">
                      ${Number(appointments.current.price || 0).toLocaleString('es-CO')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono">
                      Inició {appointments.current.time}
                    </span>
                  </div>
                </div>

                {appointments.current.notes && (
                  <div className="p-2.5 bg-white dark:bg-noir-900 rounded-xl text-xs text-slate-700 dark:text-slate-200 italic border border-slate-200 dark:border-industrial-800 flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400 flex-shrink-0 mt-0.5" />
                    <span className="break-words">"{appointments.current.notes}"</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 dark:text-industrial-400 bg-slate-50 dark:bg-noir-950 rounded-2xl border border-dashed border-slate-200 dark:border-industrial-800 p-4">
                Tu sillón está libre ahora mismo.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-industrial-800/80 text-xs text-slate-500 dark:text-industrial-400 flex items-center gap-1.5 mt-3">
            <span>💡</span>
            <span>Al terminar el corte, recepción procesará el cobro y se sumará a tus comisiones de hoy.</span>
          </div>
        </div>

        {/* Mis Próximos Turnos (100% Responsivo, sin desbordes) */}
        <div id="seccion-proximos-turnos" className="lg:col-span-7 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-industrial-800 mb-3.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-500" />
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Mis Próximos Turnos
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-industrial-400 font-mono">
                {appointments.upcoming.length} pendientes
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5">
              {appointments.upcoming.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 dark:text-industrial-500">
                  No tienes más citas programadas para hoy.
                </div>
              ) : (
                appointments.upcoming.map((apt) => {
                  const waUrl = apt.clientPhone
                    ? buildWhatsAppLink(
                        apt.clientPhone,
                        `Hola ${apt.clientName} 💈 te escribe ${barber.name} de BarberPulse. ¿Estás listo para tu turno a las ${apt.time}?`
                      )
                    : null;

                  return (
                    <div
                      key={apt.id}
                      className="p-3 sm:p-4 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 rounded-2xl transition-all shadow-xs space-y-3"
                    >
                      {/* Fila Principal de Información del Turno */}
                      <div className="flex items-start gap-3">
                        {/* Insignia de Hora */}
                        <div className="w-12 h-12 bg-white dark:bg-noir-900 border border-amber-500/30 dark:border-gold-500/30 rounded-xl flex flex-col items-center justify-center font-mono flex-shrink-0 shadow-xs">
                          <span className="text-xs font-bold text-amber-600 dark:text-gold-400">{apt.time}</span>
                          <span className="text-[9px] text-slate-400 font-normal">turno</span>
                        </div>

                        {/* Datos del Cliente y Servicio */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {apt.clientName}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-gold-300 border border-amber-500/30 font-mono font-semibold flex-shrink-0">
                              En Espera
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-industrial-300 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <Scissors className="w-3 h-3 text-gold-500" />
                              {apt.serviceName}
                            </span>
                            {apt.price && (
                              <>
                                <span className="text-slate-300 dark:text-industrial-700">•</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-industrial-200">
                                  ${Number(apt.price).toLocaleString('es-CO')}
                                </span>
                              </>
                            )}
                          </div>

                          {apt.clientPhone && (
                            <div className="mt-1">
                              <a
                                href={`tel:+${normalizeWhatsAppPhone(apt.clientPhone)}`}
                                className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                                title="Llamar directamente"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{formatDisplayPhone(apt.clientPhone)}</span>
                              </a>
                            </div>
                          )}

                          {apt.notes && (
                            <div className="mt-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/20 text-[11px] text-slate-800 dark:text-slate-200 italic flex items-start gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 flex-shrink-0 mt-0.5" />
                              <span className="break-words">"{apt.notes}"</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fila de Acciones: 100% amigable para dedos en móvil y alineada a la derecha en PC */}
                      <div className="pt-2.5 border-t border-slate-200/70 dark:border-industrial-800/80 flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                              title="Escribir por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(apt)}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Cancelar turno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cancelar</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateStatus(apt.id, 'IN_CHAIR');
                              fetchBarberData();
                            } catch (e) {
                              await showErrorAlert('Sillón', 'Error al pasar cliente al sillón');
                            }
                          }}
                          className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-sm flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Pasar a Sillón</span>
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
                Equipo de Especialistas ({barbers?.length || 0})
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
              const commissionPct = normalizePercent(b.commissionRate ?? b.commissionPercent);

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

                    <div className="text-xs text-slate-500 dark:text-industrial-400 space-y-1.5 font-mono">
                      {b.phone && <div className="flex items-center gap-1.5">📞 {formatDisplayPhone(b.phone)}</div>}
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-gold-300 font-semibold">
                        🎯 Meta: ${Number(b.dailyTarget || b.dailyGoal || 150000).toLocaleString('es-CO')} / día
                      </div>
                    </div>

                    {/* Tarjeta de Acceso al Sillón con PIN & Invitación Directa */}
                    <div className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-gold-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-industrial-300 flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          PIN de Acceso:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-600 dark:text-gold-400 tracking-widest text-sm bg-white dark:bg-noir-900 px-2 py-0.5 rounded-lg border border-amber-500/30 shadow-2xs">
                            {visiblePins[b.id] ? (b.pin || '1234') : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVisiblePins(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
                            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer transition-transform hover:scale-110"
                            title={visiblePins[b.id] ? 'Ocultar PIN' : 'Ver PIN'}
                          >
                            {visiblePins[b.id] ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>

                      {/* Botón Principal: Enviar Invitación Completa por WhatsApp */}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppPin(b)}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
                        title="Enviar mensaje de WhatsApp al barbero con su PIN y su enlace directo de sillón"
                      >
                        <MessageCircle className="w-4 h-4 fill-current flex-shrink-0" />
                        <span>Enviar Invitación WhatsApp</span>
                      </button>

                      {/* Botones secundarios: Copiar Enlace Directo & Probar Vista Móvil */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyBarberLink(b)}
                          className="py-1.5 px-2 rounded-xl bg-white dark:bg-noir-900 hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-800 dark:text-industrial-200 border border-slate-300 dark:border-industrial-700 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Copiar enlace de acceso directo al portapapeles"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400 flex-shrink-0" />
                          <span>Copiar Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePreviewBarberMobile(b)}
                          className="py-1.5 px-2 rounded-xl bg-white dark:bg-noir-900 hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-800 dark:text-industrial-200 border border-slate-300 dark:border-industrial-700 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Probar en pantalla cómo verá este barbero su sillón"
                        >
                          <Scissors className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400 flex-shrink-0" />
                          <span>Ver Sillón</span>
                        </button>
                      </div>
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
            <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
              Nombre Completo & Apodo Profesional *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Andrés 'Fader' Castro"
              value={barberFormData.name}
              onChange={(e) => setBarberFormData({ ...barberFormData, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                  WhatsApp / Teléfono
                </label>
                <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono">🇨🇴 322... o 57322...</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs font-mono font-bold text-slate-400 dark:text-industrial-500 pointer-events-none select-none">
                  🇨🇴 +57
                </span>
                <input
                  type="tel"
                  placeholder="322 546 6673"
                  value={barberFormData.phone}
                  onChange={(e) => setBarberFormData({ ...barberFormData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-20 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="andres@barberia.com"
                value={barberFormData.email}
                onChange={(e) => setBarberFormData({ ...barberFormData, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                  PIN (4 Dígitos) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = String(Math.floor(1000 + Math.random() * 9000));
                    setBarberFormData({ ...barberFormData, pin: rnd });
                  }}
                  className="text-[10px] text-amber-600 dark:text-gold-400 font-bold hover:underline cursor-pointer"
                >
                  ⚡ Generar
                </button>
              </div>
              <input
                type="text"
                maxLength={4}
                required
                placeholder="1234"
                value={barberFormData.pin || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setBarberFormData({ ...barberFormData, pin: val });
                }}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold tracking-widest text-center focus:outline-none focus:border-amber-500 dark:focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                % Comisión
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={barberFormData.commissionRate}
                  onChange={(e) => setBarberFormData({ ...barberFormData, commissionRate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-amber-600 dark:text-gold-400 font-mono font-bold focus:outline-none focus:border-amber-500 dark:focus:border-gold-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-industrial-500 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                Meta Diaria ($)
              </label>
              <input
                type="number"
                step="10000"
                value={barberFormData.dailyTarget}
                onChange={(e) => setBarberFormData({ ...barberFormData, dailyTarget: e.target.value })}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 dark:focus:border-gold-500"
              />
            </div>
          </div>

          {/* Botones de Meta Diaria Rápida */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">Metas rápidas:</span>
            {[100000, 150000, 200000, 250000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setBarberFormData({ ...barberFormData, dailyTarget: val })}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  Number(barberFormData.dailyTarget) === val
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-noir-950 border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:border-amber-500/40'
                }`}
              >
                ${val / 1000}k
              </button>
            ))}
          </div>

          {/* ACCESO Y ENLACE DIRECTO AL SILLÓN (Para darle entrada fácilmente) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-gold-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white text-xs font-mono uppercase">
                <KeyRound className="w-4 h-4 text-amber-500 dark:text-gold-400" />
                <span>Acceso al Sillón del Barbero</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-gold-300 font-bold border border-amber-500/30">
                PIN: {barberFormData.pin || '1234'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-industrial-400 leading-relaxed">
              El barbero <strong>no necesita correo ni contraseña</strong>. Solo le envías su enlace personal y al abrirlo en su celular digita su PIN de 4 dígitos ({barberFormData.pin || '1234'}). Su sesión queda guardada para siempre.
            </p>

            {editingBarber ? (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppPin({ ...editingBarber, pin: barberFormData.pin, phone: barberFormData.phone, name: barberFormData.name })}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Enviar Invitación por WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyBarberLink({ ...editingBarber, pin: barberFormData.pin, name: barberFormData.name })}
                  className="py-2 px-3 rounded-xl bg-white dark:bg-noir-900 hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-800 dark:text-industrial-200 border border-slate-300 dark:border-industrial-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-amber-500 dark:text-gold-400" />
                  <span>Copiar Enlace</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-gold-300 flex items-center gap-2 font-mono">
                <span>💡 Al guardar a este nuevo barbero, el sistema te ofrecerá enviarle la invitación por WhatsApp de inmediato.</span>
              </div>
            )}
          </div>

          {/* SERVICIOS Y ESPECIALIDADES (100% Editable, Alto Contraste y Fácil de Usar) */}
          <div className="space-y-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                <span>Servicios y Especialidades Asignadas</span>
              </label>
              <span className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">
                {(() => {
                  const specs = (typeof barberFormData.specialties === 'string'
                    ? barberFormData.specialties.split(',')
                    : (Array.isArray(barberFormData.specialties) ? barberFormData.specialties : [])
                  ).map(s => s.trim()).filter(Boolean);
                  return `${specs.length} activas`;
                })()}
              </span>
            </div>

            {/* 1. Especialidades Activas del Barbero (Tags con botón de eliminar ✕) */}
            {(() => {
              const currentSpecs = (typeof barberFormData.specialties === 'string'
                ? barberFormData.specialties.split(',')
                : (Array.isArray(barberFormData.specialties) ? barberFormData.specialties : [])
              ).map(s => s.trim()).filter(Boolean);

              const handleRemoveSpec = (specToRemove) => {
                const next = currentSpecs.filter(s => s.toLowerCase() !== specToRemove.toLowerCase());
                setBarberFormData({ ...barberFormData, specialties: next.join(', ') });
              };

              const handleAddSpec = (specToAdd) => {
                const trimmed = specToAdd.trim();
                if (!trimmed) return;
                if (!currentSpecs.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                  setBarberFormData({ ...barberFormData, specialties: [...currentSpecs, trimmed].join(', ') });
                }
              };

              const handleAddMultiple = (specsToAdd) => {
                const newSet = new Set(currentSpecs);
                specsToAdd.forEach(s => {
                  const t = s.trim();
                  if (t) newSet.add(t);
                });
                setBarberFormData({ ...barberFormData, specialties: Array.from(newSet).join(', ') });
              };

              const handleClearAll = () => {
                setBarberFormData({ ...barberFormData, specialties: '' });
              };

              // Catálogo de Servicios Tradicionales Normales
              const TRADITIONAL_NORMALS = [
                'Corte',
                'Barba',
                'Cejas',
                'Cera',
                'Corte y Barba',
                'Corte y Cejas',
                'Corte y Cera',
                'Barba y Cejas',
                'Barba con Cera',
                'Combo Completo'
              ];
              const shopServices = (barbershopInfo?.services || []).map(s => s.name || s.shortName).filter(Boolean);
              const availableCatalog = Array.from(new Set([...TRADITIONAL_NORMALS, ...shopServices]));

              return (
                <div className="space-y-3">
                  {/* Chips Activos */}
                  <div className="p-3 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 min-h-[48px] flex flex-wrap gap-1.5 items-center">
                    {currentSpecs.length === 0 ? (
                      <span className="text-xs text-slate-400 dark:text-industrial-500 italic">
                        ✨ Sin servicios asignados aún. Toca los servicios normales abajo o escribe uno nuevo.
                      </span>
                    ) : (
                      currentSpecs.map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-gold-400 text-noir-950 font-bold text-xs shadow-xs animate-fadeIn"
                        >
                          <span>✂️ {spec}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(spec)}
                            className="hover:bg-black/20 rounded-full p-0.5 transition-colors cursor-pointer"
                            title={`Quitar ${spec}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Acciones Rápidas de Selección */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddMultiple(['Corte', 'Barba', 'Cejas', 'Cera'])}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-gold-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Asignar los 4 servicios más comunes en 1 clic"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500 dark:text-gold-400" />
                      <span>+ Básicos (Corte, Barba, Cejas, Cera)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMultiple(TRADITIONAL_NORMALS)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-noir-900 hover:bg-slate-200 dark:hover:bg-noir-800 text-slate-700 dark:text-industrial-200 border border-slate-300 dark:border-industrial-700 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                      title="Asignar todos los servicios normales"
                    >
                      <Plus className="w-3 h-3 text-amber-500 dark:text-gold-400" />
                      <span>+ Todos los Normales</span>
                    </button>

                    {currentSpecs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium transition-all cursor-pointer ml-auto"
                        title="Limpiar todos los servicios seleccionados"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </div>

                  {/* 2. Catálogo de Cortes y Servicios Normales (Toca para activar/desactivar) */}
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-300 block mb-1.5">
                      Cortes y Servicios Normales (Toca para agregar/quitar):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {availableCatalog.map((spec) => {
                        const isAlreadyActive = currentSpecs.some(s => s.toLowerCase() === spec.toLowerCase());

                        return (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => isAlreadyActive ? handleRemoveSpec(spec) : handleAddSpec(spec)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                              isAlreadyActive
                                ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 font-bold border border-amber-600 shadow-sm'
                                : 'bg-white dark:bg-noir-900 border border-slate-300 dark:border-industrial-700 text-slate-800 dark:text-industrial-100 hover:border-amber-500 dark:hover:border-gold-400 hover:text-amber-700 dark:hover:text-gold-300'
                            }`}
                          >
                            {isAlreadyActive ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{spec}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                                <span>{spec}</span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Campo para escribir cualquier corte o servicio personalizado */}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-industrial-800">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-300 block mb-1">
                      ¿Deseas crear otro servicio personalizado?
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSpecialtyInput}
                        onChange={(e) => setNewSpecialtyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSpecialtyInput.trim()) {
                              handleAddSpec(newSpecialtyInput.trim());
                              setNewSpecialtyInput('');
                            }
                          }
                        }}
                        placeholder="Ej: Fade Americano, Diseño Freestyle, Tintura, Mascarilla..."
                        className="flex-1 bg-white dark:bg-noir-900 border border-slate-300 dark:border-industrial-750 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-industrial-500 focus:outline-none focus:border-amber-500 dark:focus:border-gold-400 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSpecialtyInput.trim()) {
                            handleAddSpec(newSpecialtyInput.trim());
                            setNewSpecialtyInput('');
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-gold hover:opacity-95 transition-all cursor-pointer flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear Servicio</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Selector y Vista Previa de Foto de Perfil */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Foto Propia</span>
              </button>
            </div>

            {barberPhotoFeedback && (
              <p className={`text-[11px] font-mono ${barberPhotoFeedback.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 animate-pulse'}`}>
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
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 dark:border-gold-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => barberFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-semibold transition-opacity cursor-pointer"
                    title="Cambiar foto"
                  >
                    <Camera className="w-4 h-4 text-amber-400 dark:text-gold-400 mb-0.5" />
                    <span>Cambiar</span>
                  </button>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono font-semibold">Foto Activa</span>
              </div>

              {/* 3 Avatares Genéricos con Diferente Pelo */}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-industrial-400 block mb-1.5">
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
                            ? 'border-amber-500 bg-amber-500/15 dark:bg-gold-500/20 shadow-sm ring-1 ring-amber-500'
                            : 'border-slate-200 dark:border-industrial-800 hover:border-amber-500/40 bg-white dark:bg-noir-900'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className={`text-[9px] truncate w-full font-medium ${isSelected ? 'text-amber-700 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'}`}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 pb-2 flex justify-end gap-3 border-t border-slate-100 dark:border-industrial-800 sticky bottom-0 bg-white dark:bg-noir-900 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 mt-4 z-20">
            <button
              type="button"
              onClick={() => setIsBarberFormOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{formSaving ? 'Guardando...' : editingBarber ? 'Guardar Cambios' : 'Registrar Barbero'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Rápido: Modificar Porcentaje de Comisión */}
      <Modal
        isOpen={isEditCommissionOpen}
        onClose={() => setIsEditCommissionOpen(false)}
        title={`Ajustar Comisión: ${barber?.name || 'Especialista'}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center gap-3">
            <img
              src={barber?.avatar || AVATAR_PRESETS[0].url}
              alt={barber?.name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-amber-500 shadow-xs flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                {barber?.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-industrial-300">
                Comisión actual:{' '}
                <strong className="font-mono text-amber-600 dark:text-gold-400 font-bold">
                  {commissionDisplay}%
                </strong>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-industrial-200 font-mono mb-2">
              Presets de Comisión Frecuentes:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[30, 40, 45, 50, 60].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setCommissionEditInput(pct)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                    Number(commissionEditInput) === pct
                      ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 border-amber-500 dark:border-gold-400 shadow-glow-gold'
                      : 'bg-white dark:bg-noir-900 border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 hover:border-gold-500/40'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-industrial-200 uppercase font-mono">
              O ingresa el porcentaje exacto (0% a 100%):
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={commissionEditInput}
                onChange={(e) => setCommissionEditInput(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-400"
                placeholder="Ej: 45, 55, 70..."
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-amber-600 dark:text-gold-400 pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Simulador de Liquidación en tiempo real */}
          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/20 dark:border-gold-500/20 text-xs">
            <span className="font-semibold text-slate-900 dark:text-white block mb-1">
              💡 Simulación para un servicio de $30.000 COP:
            </span>
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-700 dark:text-industrial-200">
              <span>Para {barber?.name?.split(' ')[0] || 'el barbero'} ({commissionEditInput || 0}%):</span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                ${Math.round(30000 * ((Number(commissionEditInput) || 0) / 100)).toLocaleString('es-CO')} COP
              </strong>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-700 dark:text-industrial-200 mt-0.5">
              <span>Para la barbería ({100 - (Number(commissionEditInput) || 0)}%):</span>
              <strong className="text-amber-700 dark:text-gold-300">
                ${Math.round(30000 * ((100 - (Number(commissionEditInput) || 0)) / 100)).toLocaleString('es-CO')} COP
              </strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setIsEditCommissionOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-industrial-400 hover:bg-slate-100 dark:hover:bg-noir-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={savingCommission}
              onClick={() => handleSaveCommissionRate(commissionEditInput)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold hover:opacity-95 transition-all cursor-pointer font-mono"
            >
              {savingCommission ? 'Guardando...' : 'Guardar Comisión'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Menú Inferior Fijo Exclusivo para el Barbero en Sillón (Móvil & Desktop) */}
      {standaloneBarberMode && (
        <nav
          aria-label="Navegación del Sillón"
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-noir-950/95 backdrop-blur-md border-t border-slate-200 dark:border-industrial-800 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.7)] px-2 py-1.5 sm:py-2"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-around gap-1">
            {/* 1. Sillón */}
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('sillon');
                if (activeSection !== 'jornada') setActiveSection('jornada');
                setTimeout(() => {
                  const el = document.getElementById('seccion-sillon');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  else window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 50);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeBottomTab === 'sillon' && activeSection === 'jornada'
                  ? 'text-amber-600 dark:text-gold-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Scissors className="w-5 h-5 mb-0.5" />
                {appointments?.current && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">Sillón</span>
            </button>

            {/* 2. Turnos */}
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('turnos');
                if (activeSection !== 'jornada') setActiveSection('jornada');
                setTimeout(() => {
                  const el = document.getElementById('seccion-proximos-turnos') || document.getElementById('turnos-de-hoy-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeBottomTab === 'turnos' && activeSection === 'jornada'
                  ? 'text-amber-600 dark:text-gold-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Calendar className="w-5 h-5 mb-0.5" />
                {(appointments?.upcoming?.length || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 font-mono font-bold text-[9px] rounded-full">
                    {appointments.upcoming.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">Turnos</span>
            </button>

            {/* 3. Ganancias */}
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('ganancias');
                if (activeSection !== 'jornada') setActiveSection('jornada');
                setTimeout(() => {
                  const el = document.getElementById('barber-kpis-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeBottomTab === 'ganancias' && activeSection === 'jornada'
                  ? 'text-amber-600 dark:text-gold-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Ganancias</span>
            </button>

            {/* 4. Horarios */}
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('horario');
                setActiveSection('schedule');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeSection === 'schedule'
                  ? 'text-amber-600 dark:text-gold-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Horario</span>
            </button>

            {/* 5. Salir */}
            <button
              type="button"
              onClick={async () => {
                const res = await showConfirmDialog({
                  title: '¿Cerrar Sesión del Sillón?',
                  text: 'Para volver a ingresar deberás digitar nuevamente tu PIN de 4 dígitos.',
                  confirmText: 'Sí, cerrar turno',
                  cancelText: 'Seguir atendiendo',
                  icon: 'info'
                });
                if (res.isConfirmed && onLogoutBarber) {
                  onLogoutBarber();
                }
              }}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-rose-500 hover:text-rose-600 transition-all cursor-pointer"
            >
              <LogOut className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight font-medium">Salir</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

