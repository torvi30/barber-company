import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { showErrorAlert, showSuccessAlert, showConfirmDialog } from '../lib/swal';
import { buildWhatsAppLink, normalizeWhatsAppPhone, formatDisplayPhone } from '../lib/phoneUtils';
import {
  UserPlus,
  PlayCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Scissors,
  Clock,
  ShoppingBag,
  Plus,
  Trash2,
  Calendar,
  CalendarDays,
  Sliders,
  Sparkles,
  Save,
  Coffee,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Users,
  MessageSquare,
  Phone,
  FileText
} from 'lucide-react';
import { TRADITIONAL_SERVICES } from '../constants/services';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
];

export const ReceptionQueue = () => {
  const { tenantId, barbershopInfo, appointments, barbers, createAppointment, updateStatus, cancelAppointment, realtimeAppointment } = useBarbershop();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const activeServices = (barbershopInfo?.services && barbershopInfo.services.length > 0)
    ? barbershopInfo.services
    : TRADITIONAL_SERVICES;

  // Form states con servicios configurados de la barbería
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceName, setServiceName] = useState(() => activeServices[0]?.name || 'Corte');
  const [price, setPrice] = useState(() => activeServices[0]?.price || 25000);
  const [barberId, setBarberId] = useState(barbers[0]?.id || 'barber-01');

  // Obtener fecha local YYYY-MM-DD sin desfase horario de UTC
  const getLocalDate = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDate(new Date());
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDate(d);
  })();
  const dayAfterStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return getLocalDate(d);
  })();

  // Obtener fecha del siguiente día respecto a cualquier fecha YYYY-MM-DD
  const getNextDateStr = (dateStr) => {
    try {
      const parts = String(dateStr).split('-').map(Number);
      if (parts.length < 3 || isNaN(parts[0])) return tomorrowStr;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      return getLocalDate(d);
    } catch {
      return tomorrowStr;
    }
  };

  const [agendaDate, setAgendaDate] = useState(todayStr); // Fecha activa del Calendario de la Agenda
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isManageSlotsOpen, setIsManageSlotsOpen] = useState(false);
  const [allowPast, setAllowPast] = useState(false);
  const [mobileTab, setMobileTab] = useState('waiting'); // 'waiting' | 'in_chair' | 'completed'
  const [selectedBarberFilter, setSelectedBarberFilter] = useState('ALL'); // 'ALL' | barberId
  const [isSillonMenuOpen, setIsSillonMenuOpen] = useState(false);

  // Auto-switch de fecha y animación inmediata cuando entra una nueva reserva en tiempo real
  useEffect(() => {
    if (realtimeAppointment?.date) {
      setAgendaDate(realtimeAppointment.date);
      setMobileTab('waiting');
    }
  }, [realtimeAppointment]);

  // Ref y estado para el popover del calendario personalizado
  const calendarRef = useRef(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    const parts = (agendaDate || todayStr).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, 1);
  });

  // Sincronizar vista del popover cuando cambia la fecha de la agenda
  useEffect(() => {
    if (agendaDate) {
      const parts = agendaDate.split('-').map(Number);
      if (parts.length >= 2) {
        setCalendarViewDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [agendaDate]);

  // Cerrar el popover del calendario al hacer clic por fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Formato compacto para botón selector (ej: "Hoy, 14 Nov" o "Vie, 13 Nov")
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = String(dateStr).split('-').map(Number);
      if (parts.length < 3 || isNaN(parts[0])) return String(dateStr);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayName = days[d.getDay()];
      const dayNum = parts[2];
      const monthName = months[d.getMonth()];

      if (dateStr === todayStr) {
        return `Hoy, ${dayNum} ${monthName}`;
      }
      if (dateStr === tomorrowStr) {
        return `Mañana, ${dayNum} ${monthName}`;
      }
      return `${dayName}, ${dayNum} ${monthName}`;
    } catch {
      return String(dateStr);
    }
  };

  // Formato completo en español para subtítulo
  const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = String(dateStr).split('-').map(Number);
      if (parts.length < 3 || isNaN(parts[0])) return String(dateStr);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${days[d.getDay()]}, ${parts[2]} de ${months[d.getMonth()]} de ${parts[0]}`;
    } catch {
      return String(dateStr);
    }
  };

  // Días rápidos e interactivos para navegación inmediata con 1 tap
  const quickDays = useMemo(() => {
    const map = new Map();
    (appointments || []).forEach(a => {
      if (!a) return;
      const d = String(a.date || todayStr);
      if (d) map.set(d, (map.get(d) || 0) + 1);
    });

    const dayItems = [];
    const addedDates = new Set();

    const addDay = (dateStr, fixedLabel = null) => {
      if (!dateStr || addedDates.has(dateStr)) return;
      addedDates.add(dateStr);
      const count = map.get(dateStr) || 0;
      let label = fixedLabel;
      if (!label) {
        if (dateStr === todayStr) label = 'Hoy';
        else if (dateStr === tomorrowStr) label = 'Mañana';
        else {
          try {
            const parts = dateStr.split('-').map(Number);
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            label = `${days[d.getDay()]} ${parts[2]}`;
          } catch {
            label = dateStr;
          }
        }
      }
      dayItems.push({ date: dateStr, label, count });
    };

    // Ayer si tiene citas o está seleccionado
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDate(yesterday);
    if (map.has(yesterdayStr) || agendaDate === yesterdayStr) {
      addDay(yesterdayStr, 'Ayer');
    }

    // Hoy
    addDay(todayStr, 'Hoy');

    // Mañana
    addDay(tomorrowStr, 'Mañana');

    // Pasado mañana si tiene citas o está seleccionado
    if (map.has(dayAfterStr) || agendaDate === dayAfterStr) {
      addDay(dayAfterStr);
    }

    // Otras fechas con citas
    Array.from(map.keys()).sort().forEach(d => {
      addDay(d);
    });

    // Si la fecha actual seleccionada no está en la lista, agregarla
    if (!addedDates.has(agendaDate)) {
      addDay(agendaDate);
    }

    return dayItems.sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments, todayStr, tomorrowStr, dayAfterStr, agendaDate]);

  // Mover fecha hacia adelante o hacia atrás en el calendario
  const shiftAgendaDate = (days) => {
    try {
      const [year, month, day] = agendaDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + days);
      setAgendaDate(getLocalDate(d));
    } catch (e) {
      console.warn(e);
    }
  };

  // Mapa de citas por fecha para marcar los días con turnos en el calendario desplegable
  const appointmentDatesMap = useMemo(() => {
    const map = new Map();
    (appointments || []).forEach(a => {
      if (!a?.date) return;
      map.set(a.date, (map.get(a.date) || 0) + 1);
    });
    return map;
  }, [appointments]);

  // Cuadrícula de días para el popover del calendario (Lunes a Domingo)
  const calendarDaysGrid = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    // Lunes = 0, Domingo = 6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = [];

    // Días del mes anterior
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      grid.push({
        dateStr: getLocalDate(d),
        dayNum,
        isCurrentMonth: false
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const curr = new Date(year, month, d);
      grid.push({
        dateStr: getLocalDate(curr),
        dayNum: d,
        isCurrentMonth: true
      });
    }

    // Días del mes siguiente para completar la cuadrícula de 7 columnas
    const remaining = (7 - (grid.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const next = new Date(year, month + 1, d);
      grid.push({
        dateStr: getLocalDate(next),
        dayNum: d,
        isCurrentMonth: false
      });
    }

    return grid;
  }, [calendarViewDate]);

  // Estados de gestión de turnos avanzada
  const [manageTab, setManageTab] = useState('slots'); // 'slots' | 'schedule'
  const [slotFilter, setSlotFilter] = useState('ALL'); // 'ALL' | 'FREE' | 'PAUSED'
  const [barberScheduleForm, setBarberScheduleForm] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const selectedBarberObj = barbers.find(b => b.id === barberId);

  useEffect(() => {
    if (selectedBarberObj?.schedule) {
      setBarberScheduleForm(selectedBarberObj.schedule);
    } else {
      setBarberScheduleForm({
        monday: { working: true, start: '09:00', end: '19:00' },
        tuesday: { working: true, start: '09:00', end: '19:00' },
        wednesday: { working: true, start: '09:00', end: '19:00' },
        thursday: { working: true, start: '09:00', end: '19:00' },
        friday: { working: true, start: '09:00', end: '20:00' },
        saturday: { working: true, start: '09:00', end: '18:00' },
        sunday: { working: false }
      });
    }
  }, [barberId, selectedBarberObj]);

  const fetchSlots = async () => {
    if (!barberId) return;
    try {
      setLoadingSlots(true);
      const res = await api.getAvailableSlots(tenantId, barberId, selectedDate, allowPast);
      if (res.success && res.slots) {
        setAvailableSlots(res.slots);
        const firstOpen = res.slots.find(s => s.available);
        if (firstOpen) {
          setSelectedTime(firstOpen.time);
        } else {
          setSelectedTime('');
        }
      }
    } catch (err) {
      console.error('Error al obtener slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Cargar disponibilidad en tiempo real según el barbero y fecha elegidos
  useEffect(() => {
    if (isAddModalOpen || isManageSlotsOpen) {
      fetchSlots();
    }
  }, [tenantId, barberId, selectedDate, allowPast, isAddModalOpen, isManageSlotsOpen]);

  const handleToggleSlot = async (slotTime, isCurrentlyBlocked) => {
    try {
      await api.toggleSlot(tenantId, {
        barberId,
        date: selectedDate,
        time: slotTime,
        blocked: !isCurrentlyBlocked
      });
      fetchSlots();
    } catch (err) {
      showErrorAlert('Error al modificar turno', err.message);
    }
  };

  // Acciones en Lote (1 Clic para activar o pausar múltiples franjas)
  const handleToggleBatch = async (timesToToggle, blocked) => {
    if (!timesToToggle || timesToToggle.length === 0) return;
    try {
      setLoadingSlots(true);
      await api.toggleSlot(tenantId, {
        barberId,
        date: selectedDate,
        times: timesToToggle,
        blocked
      });
      fetchSlots();
    } catch (err) {
      showErrorAlert('Error al modificar turnos en lote', err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Guardar Jornada Semanal Base del Barbero
  const handleSaveBarberSchedule = async (e) => {
    e.preventDefault();
    if (!barberId || !barberScheduleForm) return;
    try {
      setSavingSchedule(true);
      const res = await api.updateBarberSchedule(tenantId, barberId, {
        schedule: barberScheduleForm
      });
      if (res.success) {
        setScheduleSuccess(true);
        setTimeout(() => setScheduleSuccess(false), 3000);
        fetchSlots();
      }
    } catch (err) {
      showErrorAlert('Error al actualizar horario semanal', err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // Checkout modal states
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tip, setTip] = useState(0);

  // Retail products upsell in POS checkout
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedRetailProducts, setSelectedRetailProducts] = useState([]);

  useEffect(() => {
    const fetchInv = async () => {
      try {
        const res = await api.getInventory(tenantId);
        if (res.success) {
          setAvailableProducts(res.data.filter(p => p.stock > 0) || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInv();
  }, [tenantId]);

  const handleCreateWalkin = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const assignedBarber = barbers.find(b => b.id === barberId);

    const timeToUse = selectedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await createAppointment({
        barberId,
        barberName: assignedBarber ? assignedBarber.name : 'Barbero Asignado',
        clientName,
        clientPhone: clientPhone ? normalizeWhatsAppPhone(clientPhone) : '',
        serviceName,
        price: Number(price),
        tip: 0,
        paymentMethod: 'CASH',
        status: 'WAITING',
        date: selectedDate,
        time: timeToUse
      });

      // 1. Cerrar ventana inmediatamente
      setIsAddModalOpen(false);

      // 2. Mover la agenda del salón automáticamente a la fecha del turno para que el admin lo vea de inmediato
      setAgendaDate(selectedDate);

      // 3. Limpiar formulario y modo ensayo
      setClientName('');
      setClientPhone('');
      setSelectedTime('');
      setAllowPast(false);

      // 4. Mostrar confirmación visual automática
      showSuccessAlert(
        '¡Turno Agendado con Éxito!',
        `El turno de ${clientName || 'Cliente'} (${serviceName}) quedó registrado para las ${timeToUse} con ${assignedBarber ? assignedBarber.name : 'el barbero'}. La vista de la agenda se ubicó en la fecha ${selectedDate}.`
      );
    } catch (err) {
      showErrorAlert('Horario No Disponible', err.message || 'Error al agendar cita.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartService = async (aptId) => {
    await updateStatus(aptId, 'IN_CHAIR');
  };

  const handleCancelAppointment = async (apt) => {
    if (!apt) return;
    const result = await showConfirmDialog({
      title: '¿Cancelar o Eliminar Turno?',
      text: `¿Estás seguro de cancelar el turno de ${apt.clientName || 'este cliente'}? Esta acción liberará el espacio en la agenda y el sillón del barbero ${apt.barberName || ''}.`,
      confirmText: 'Sí, Cancelar Turno',
      cancelText: 'Volver',
      icon: 'warning'
    });

    if (result.isConfirmed) {
      try {
        await cancelAppointment(apt.id);
        showSuccessAlert(
          'Turno Cancelado',
          `El turno de ${apt.clientName || 'el cliente'} ha sido cancelado y retirado de la agenda.`
        );
      } catch (err) {
        showErrorAlert('Error', 'No se pudo cancelar el turno. Intenta nuevamente.');
      }
    }
  };

  const openCheckout = (apt) => {
    setSelectedAppointment(apt);
    setTip(0);
    setPaymentMethod('CASH');
    setSelectedRetailProducts([]);
    setIsCheckoutModalOpen(true);
  };

  const addRetailToTicket = (product) => {
    setSelectedRetailProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeRetailFromTicket = (productId) => {
    setSelectedRetailProducts(prev => prev.filter(p => p.id !== productId));
  };

  const totalProductsPrice = selectedRetailProducts.reduce(
    (sum, p) => sum + (Number(p.unitPrice) * p.qty),
    0
  );

  const finalTicketTotal = selectedAppointment
    ? Number(selectedAppointment.price) + totalProductsPrice + Number(tip)
    : 0;

  const handleCompleteCheckout = async () => {
    if (!selectedAppointment) return;

    // 1. Descontar stock de productos agregados en mostrador
    for (const prod of selectedRetailProducts) {
      try {
        await api.updateStock(tenantId, prod.id, -prod.qty);
      } catch (err) {
        console.error('Error al descontar stock:', err);
      }
    }

    // 2. Finalizar cita con precio combinado (servicio + productos)
    const combinedPrice = Number(selectedAppointment.price) + totalProductsPrice;
    await updateStatus(selectedAppointment.id, 'COMPLETED', paymentMethod, tip);

    setIsCheckoutModalOpen(false);
    setSelectedAppointment(null);
    setSelectedRetailProducts([]);
  };

  // Filtrar citas del día seleccionado en el Calendario de la Agenda
  const dayAppointments = appointments.filter(a => {
    if (!a) return false;
    const aDate = String(a.date || todayStr);
    return aDate === agendaDate;
  });

  // Filtrar por Barbero si hay uno seleccionado
  const filteredAppointments = selectedBarberFilter === 'ALL'
    ? dayAppointments
    : dayAppointments.filter(a => a.barberId === selectedBarberFilter || a.barberName === selectedBarberFilter);

  const activeBarberObj = barbers.find(b => b.id === selectedBarberFilter || b.name === selectedBarberFilter);

  const waitingQueue = filteredAppointments.filter(a => a.status === 'WAITING' || a.status === 'SCHEDULED');
  const inChairList = filteredAppointments.filter(a => a.status === 'IN_CHAIR');
  const completedList = filteredAppointments.filter(a => a.status === 'COMPLETED');

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* Header Adaptado para Móvil y Desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white tracking-wide">
              Agenda del Salón
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-amber-500/10 border border-slate-200 dark:border-amber-500/20 text-slate-700 dark:text-amber-400 text-xs font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'turno' : 'turnos'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5 capitalize">
            {formatFullDate(agendaDate)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManageSlotsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-noir-900 hover:bg-slate-50 dark:hover:bg-noir-800 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Activar o pausar turnos y franjas"
          >
            <Clock className="w-3.5 h-3.5 text-gold-500" />
            <span className="hidden sm:inline">Pausar / Activar Turnos</span>
            <span className="sm:hidden">Turnos</span>
          </button>

          <button
            onClick={() => {
              setSelectedDate(agendaDate);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gold-500 dark:hover:bg-gold-400 dark:text-noir-950 font-bold text-xs shadow-sm dark:shadow-glow-gold transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-950 dark:text-noir-950" />
            <span>+ Cita / Turno</span>
          </button>
        </div>
      </div>

      {/* Barra de Control de Fecha (Diseño Pro, Limpio y 100% Modificable con 1 Click) */}
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-2.5 sm:p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Selector de Fecha Principal e Interactivo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => shiftAgendaDate(-1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-noir-950 hover:bg-slate-200 dark:hover:bg-industrial-850 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 transition-colors cursor-pointer"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Botón Central con Calendario Popover Integrado y Perfectamente Ubicado Debajo */}
          <div className="relative inline-flex items-center" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/50 text-slate-900 dark:text-white text-xs font-bold transition-all cursor-pointer shadow-sm select-none"
              title="Abrir calendario interactivo"
            >
              <Calendar className="w-4 h-4 text-gold-500 flex-shrink-0" />
              <span className="capitalize">{formatDateDisplay(agendaDate)}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Popover del Calendario (Anclado directamente debajo del botón sin desviarse de la pantalla) */}
            {isCalendarOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 p-3.5 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 rounded-2xl shadow-2xl animate-fadeIn backdrop-blur-md">
                {/* Cabecera del Mes con Navegación */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-industrial-800">
                  <button
                    type="button"
                    onClick={() => setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-600 dark:text-industrial-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold font-display uppercase tracking-wider text-slate-900 dark:text-white">
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-600 dark:text-industrial-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Días de la Semana: L M X J V S D */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                    <span key={idx} className="text-[10px] font-mono font-bold text-slate-400 dark:text-industrial-500 py-0.5">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Cuadrícula de Días */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarDaysGrid.map((item, idx) => {
                    const isSelected = item.dateStr === agendaDate;
                    const isToday = item.dateStr === todayStr;
                    const aptCount = appointmentDatesMap.get(item.dateStr) || 0;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAgendaDate(item.dateStr);
                          setIsCalendarOpen(false);
                        }}
                        className={`relative py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-noir-950 font-bold shadow-sm'
                            : isToday
                            ? 'border border-amber-500/50 text-amber-500 dark:text-amber-400 font-bold hover:bg-amber-500/10'
                            : item.isCurrentMonth
                            ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-noir-800'
                            : 'text-slate-300 dark:text-industrial-600 hover:bg-slate-50 dark:hover:bg-noir-950/40'
                        }`}
                      >
                        <span>{item.dayNum}</span>
                        {/* Indicador de citas para ese día */}
                        {aptCount > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              isSelected ? 'bg-noir-950' : 'bg-gold-500'
                            }`}
                            title={`${aptCount} turnos`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pie del Popover: Acceso rápido a Hoy y Cerrar */}
                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-industrial-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAgendaDate(todayStr);
                      setCalendarViewDate(new Date());
                      setIsCalendarOpen(false);
                    }}
                    className="text-[11px] font-bold text-gold-500 hover:text-gold-400 hover:underline cursor-pointer"
                  >
                    Ir a Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-[11px] text-slate-400 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => shiftAgendaDate(1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-noir-950 hover:bg-slate-200 dark:hover:bg-industrial-850 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 transition-colors cursor-pointer"
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {agendaDate !== todayStr && (
            <button
              type="button"
              onClick={() => setAgendaDate(todayStr)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-600 dark:text-gold-400 text-xs font-bold transition-colors cursor-pointer ml-0.5"
              title="Volver a la fecha de hoy"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hoy</span>
            </button>
          )}
        </div>

        {/* Chips de Días Rápidos (Hoy, Mañana, Días con Citas Registradas) */}
        {quickDays.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none sm:justify-end">
            {quickDays.map((d) => {
              const isSelected = agendaDate === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setAgendaDate(d.date)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm dark:bg-gold-500 dark:text-noir-950'
                      : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`Ver turnos del ${d.date}`}
                >
                  <span>{d.label}</span>
                  {d.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-slate-950/15 text-slate-950 dark:bg-noir-950/25 dark:text-noir-950'
                        : 'bg-slate-200 dark:bg-industrial-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {d.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filtro Compacto de Sillón / Barbero (Minimalista sin scroll molesto) */}
      {barbers && barbers.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSillonMenuOpen(!isSillonMenuOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-amber-500 dark:hover:border-gold-500/50 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
              <span className="text-slate-400 dark:text-industrial-400">Sillón:</span>
              {selectedBarberFilter === 'ALL' ? (
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Todos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-noir-950 text-slate-700 dark:text-slate-300 font-mono font-bold border border-slate-200 dark:border-industrial-800">
                    {dayAppointments.length}
                  </span>
                </span>
              ) : (
                <span className="font-bold text-amber-600 dark:text-gold-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{activeBarberObj?.name || 'Barbero'}</span>
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-industrial-500 ml-0.5" />
            </button>

            {/* Menú Desplegable Flotante */}
            {isSillonMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSillonMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl shadow-xl p-1.5 z-40 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400 dark:text-industrial-500 border-b border-slate-100 dark:border-industrial-800 mb-1">
                    Filtrar por sillón / barbero
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSelectedBarberFilter('ALL'); setIsSillonMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedBarberFilter === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>👥</span>
                      <span>Todos los sillones</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-slate-950/15">
                      {dayAppointments.length}
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-industrial-800" />

                  {barbers.map((b) => {
                    const bApts = dayAppointments.filter(a => a.barberId === b.id || a.barberName === b.name);
                    const bWaiting = bApts.filter(a => a.status === 'WAITING' || a.status === 'SCHEDULED').length;
                    const isSelected = selectedBarberFilter === b.id || selectedBarberFilter === b.name;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSelectedBarberFilter(b.id); setIsSillonMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="truncate">{b.name}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-slate-950/15">
                          {bWaiting} en espera
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {selectedBarberFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedBarberFilter('ALL')}
              className="text-xs text-amber-600 dark:text-gold-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>✕ Quitar filtro</span>
            </button>
          )}
        </div>
      )}

      {/* Selector de pestañas para celular (Mobile Segmented Control) */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setMobileTab('waiting')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'waiting'
              ? 'bg-white dark:bg-noir-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-industrial-700'
              : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>En Espera</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${mobileTab === 'waiting' ? 'bg-slate-100 dark:bg-noir-950 text-slate-900 dark:text-white font-bold' : 'bg-slate-200/70 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'}`}>
            {waitingQueue.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('in_chair')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'in_chair'
              ? 'bg-white dark:bg-noir-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-industrial-700'
              : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>En Sillón</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${mobileTab === 'in_chair' ? 'bg-slate-100 dark:bg-noir-950 text-slate-900 dark:text-white font-bold' : 'bg-slate-200/70 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'}`}>
            {inChairList.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('completed')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'completed'
              ? 'bg-white dark:bg-noir-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-industrial-700'
              : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Listos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${mobileTab === 'completed' ? 'bg-slate-100 dark:bg-noir-950 text-slate-900 dark:text-white font-bold' : 'bg-slate-200/70 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'}`}>
            {completedList.length}
          </span>
        </button>
      </div>

      {/* Grid de 3 Columnas (en Desktop) / Vista de Pestaña activa (en Móvil) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: En Sala de Espera */}
        <div className={`bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 flex-col h-full shadow-sm ${mobileTab === 'waiting' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-industrial-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">En Espera</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
              {waitingQueue.length}
            </span>
          </div>

          <div className="space-y-3 mt-4 flex-1">
            {waitingQueue.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-industrial-500">
                No hay clientes esperando en sala.
              </div>
            ) : (
              waitingQueue.map((apt) => (
                <div
                  key={apt.id}
                  className={`bg-slate-50 dark:bg-noir-950 border rounded-2xl p-4 transition-all shadow-sm ${
                    realtimeAppointment?.id === apt.id
                      ? 'border-gold-500 ring-2 ring-gold-500/50 shadow-glow-gold animate-fadeIn'
                      : 'border-slate-200 dark:border-industrial-800/90 hover:border-gold-500/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide truncate">
                          {apt.clientName}
                        </h4>
                        {realtimeAppointment?.id === apt.id && (
                          <span className="px-1.5 py-0.5 rounded-full bg-gold-500 text-noir-950 font-black text-[9px] uppercase tracking-wider animate-pulse font-mono">
                            Nuevo
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-industrial-400 flex items-center gap-1.5 mt-1">
                        <Scissors className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{apt.serviceName}</span>
                      </p>

                      {/* Barbero Asignado Destacado & Teléfono / WhatsApp */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gold-500/15 border border-slate-200 dark:border-gold-500/30 text-slate-700 dark:text-gold-400 text-xs font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-gold-400" />
                          <span>Barbero: <strong className="text-slate-900 dark:text-white font-bold">{apt.barberName || 'Por Asignar'}</strong></span>
                        </span>

                        {apt.clientPhone && (
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-lg p-0.5 text-xs font-mono shadow-xs">
                            <a
                              href={`tel:+${normalizeWhatsAppPhone(apt.clientPhone)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-noir-800 text-slate-700 dark:text-slate-300 font-semibold transition-all hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              title="Tocar para llamar directamente"
                            >
                              <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>{formatDisplayPhone(apt.clientPhone)}</span>
                            </a>
                            <span className="w-px h-3 bg-slate-300 dark:bg-industrial-700"></span>
                            <a
                              href={buildWhatsAppLink(
                                apt.clientPhone,
                                `Hola ${apt.clientName || 'Cliente'} 💈 te saludamos de ${barbershopInfo?.name || 'la Barbería'}. ¿Cómo estás?`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-bold transition-all cursor-pointer"
                              title="Abrir chat en WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Nota del Cliente */}
                      {apt.notes && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/25 dark:border-gold-500/25 text-xs flex items-start gap-1.5 shadow-xs">
                          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-mono font-bold text-amber-700 dark:text-gold-400 block tracking-wider">
                              Nota del Cliente:
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 italic text-[11px] leading-snug">
                              "{apt.notes}"
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-sm sm:text-base text-slate-900 dark:text-gold-400 font-bold block">
                        ${Number(apt.price).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-industrial-800 flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-600 dark:text-industrial-300 font-mono font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-noir-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-industrial-800 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-gold-500" />
                      <span>{apt.time} hrs</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(apt)}
                        className="p-1.5 sm:p-2 2xl:px-2.5 2xl:py-1.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Cancelar o eliminar este turno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden 2xl:inline text-xs font-semibold">Cancelar</span>
                      </button>
                      <button
                        onClick={() => handleStartService(apt.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500/20 dark:text-blue-400 dark:border dark:border-blue-500/30 dark:hover:bg-blue-500 dark:hover:text-white transition-all text-xs font-bold whitespace-nowrap shadow-sm cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Al Sillón</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 2: En Sillón (Atendiéndose) */}
        <div className={`bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 flex-col h-full shadow-sm ${mobileTab === 'in_chair' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-industrial-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">En Sillón</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-mono font-bold">
              {inChairList.length}
            </span>
          </div>

          <div className="space-y-3 mt-4 flex-1">
            {inChairList.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-industrial-500">
                Ningún barbero atendiendo ahora mismo.
              </div>
            ) : (
              inChairList.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-slate-50 dark:bg-noir-950 border border-blue-500/40 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide truncate">
                        {apt.clientName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-industrial-400 flex items-center gap-1 mt-0.5">
                        <Scissors className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" /> {apt.serviceName}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                          <User className="w-3.5 h-3.5" />
                          <span>Atendido por: <strong>{apt.barberName}</strong></span>
                        </span>

                        {apt.clientPhone && (
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-lg p-0.5 text-xs font-mono shadow-xs">
                            <a
                              href={`tel:+${normalizeWhatsAppPhone(apt.clientPhone)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-noir-800 text-slate-700 dark:text-slate-300 font-semibold transition-all hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              title="Tocar para llamar directamente"
                            >
                              <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>{formatDisplayPhone(apt.clientPhone)}</span>
                            </a>
                            <span className="w-px h-3 bg-slate-300 dark:bg-industrial-700"></span>
                            <a
                              href={buildWhatsAppLink(
                                apt.clientPhone,
                                `Hola ${apt.clientName || 'Cliente'} 💈 te saludamos de ${barbershopInfo?.name || 'la Barbería'}. Tu turno en sillón está en proceso.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-bold transition-all cursor-pointer"
                              title="Abrir chat en WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Nota del Cliente */}
                      {apt.notes && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/25 dark:border-gold-500/25 text-xs flex items-start gap-1.5 shadow-xs">
                          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-mono font-bold text-amber-700 dark:text-gold-400 block tracking-wider">
                              Nota del Cliente:
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 italic text-[11px] leading-snug">
                              "{apt.notes}"
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-sm sm:text-base text-slate-900 dark:text-white font-bold block">${Number(apt.price).toLocaleString('es-CO')}</span>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-industrial-800 flex items-center justify-between text-xs gap-2">
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span>{apt.time} hrs</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(apt)}
                        className="p-1.5 sm:p-2 2xl:px-2.5 2xl:py-1.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Cancelar o retirar este turno del sillón"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden 2xl:inline text-xs font-semibold">Cancelar</span>
                      </button>
                      <button
                        onClick={() => openCheckout(apt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors text-xs font-bold whitespace-nowrap shadow-sm cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 3: Completados Recientes */}
        <div className={`bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 flex-col h-full shadow-sm ${mobileTab === 'completed' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-industrial-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Completados Hoy</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
              {completedList.length}
            </span>
          </div>

          <div className="space-y-3 mt-4 flex-1 max-h-[500px] overflow-y-auto pr-1">
            {completedList.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-industrial-500">
                Aún no hay turnos cerrados en la jornada.
              </div>
            ) : (
              completedList.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-slate-50 dark:bg-noir-950/80 border border-slate-200 dark:border-industrial-800/60 rounded-xl p-3.5 flex items-center justify-between hover:border-gold-500/40 transition-colors shadow-sm"
                >
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white text-xs">{apt.clientName}</h5>
                    <div className="text-[11px] text-slate-500 dark:text-industrial-400 flex items-center gap-2 mt-0.5">
                      <span>{apt.barberName}</span>
                      <span>•</span>
                      <span className="font-mono font-medium text-gold-600 dark:text-gold-400">{apt.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(Number(apt.price) + Number(apt.tip || 0)).toLocaleString('es-CO')}
                    </div>
                    {Number(apt.tip) > 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-industrial-400 font-mono">
                        Propina: ${Number(apt.tip).toLocaleString('es-CO')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Registro de Walk-In */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Nuevo Turno de Recepción (Walk-In)"
      >
        <form onSubmit={handleCreateWalkin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              required
              placeholder="Ej. David Fernández"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                WhatsApp / Teléfono (Opcional)
              </label>
              <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono font-medium">
                🇨🇴 Válido 322... o 57322...
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-slate-500 dark:text-industrial-400 flex items-center gap-1 select-none pointer-events-none">
                🇨🇴 +57
              </span>
              <input
                type="tel"
                placeholder="322 546 6673"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-20 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500 font-mono"
              />
            </div>
          </div>

          {/* Selector de Servicios Tradicionales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                Servicios Básicos de Barbería
              </label>
              <span className="text-[10px] text-slate-500 dark:text-gold-400 font-mono">1 Clic o Personaliza</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {activeServices.map((srv) => {
                const isSelected = serviceName === srv.name;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      setServiceName(srv.name);
                      setPrice(srv.price);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 text-amber-900 dark:border-gold-500 dark:bg-gold-500/15 dark:text-gold-300 shadow-sm'
                        : 'border-slate-200 dark:border-industrial-800 hover:border-slate-400 dark:hover:border-industrial-700 bg-slate-50 dark:bg-noir-950 text-slate-700 dark:text-industrial-300'
                    }`}
                  >
                    <span className="text-sm flex-shrink-0">{srv.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate">{srv.shortName}</div>
                      <div className={`text-[9px] font-mono ${isSelected ? 'text-amber-800 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-gold-400'}`}>${srv.price.toLocaleString('es-CO')}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-industrial-300 uppercase mb-1">
                  Servicio
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ej: Corte, Barba..."
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-industrial-300 uppercase mb-1">
                  Precio ($ COP)
                </label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-gold-400 font-mono font-bold focus:outline-none focus:border-slate-900 dark:focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          {/* Asignación de Barbero (Selector Visual Táctil sin Desfase de Pantalla) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
                Asignar a Barbero
              </label>
              <span className="text-[10px] text-slate-500 dark:text-industrial-500 font-medium">1 Clic para cambiar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {barbers.map((b) => {
                const isSelected = barberId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBarberId(b.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 text-amber-900 dark:border-gold-500 dark:bg-gold-500/15 dark:text-gold-300 ring-1 ring-amber-500 dark:ring-gold-500 shadow-sm'
                        : 'border-slate-200 dark:border-industrial-800 bg-slate-50 dark:bg-noir-950 text-slate-700 dark:text-industrial-300 hover:border-slate-400 dark:hover:border-industrial-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{b.name}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] font-mono font-bold text-amber-900 dark:text-gold-400 px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-gold-500/20">
                        Elegido
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha del Turno (Selector en Cuadrícula 100% Responsive) */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-industrial-800/60">
            <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase">
              Fecha del Turno
            </label>
            
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => { setSelectedDate(todayStr); setAllowPast(false); }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm dark:bg-gold-500 dark:text-noir-950'
                    : 'bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Hoy ({todayStr.slice(8, 10)}/{todayStr.slice(5, 7)})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedDate(tomorrowStr); setAllowPast(false); }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === tomorrowStr
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm dark:bg-gold-500 dark:text-noir-950'
                    : 'bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mañana ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedDate(dayAfterStr); setAllowPast(false); }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === dayAfterStr
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm dark:bg-gold-500 dark:text-noir-950'
                    : 'bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {dayAfterStr.slice(8, 10)}/{dayAfterStr.slice(5, 7)}
              </button>
            </div>

            {allowPast && (
              <div className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center justify-between">
                <span>⚡ Modo Ensayo activo: Mostrando todas las franjas horarias de hoy</span>
                <button
                  type="button"
                  onClick={() => setAllowPast(false)}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-white underline text-[10px] ml-2 cursor-pointer"
                >
                  Restablecer
                </button>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-industrial-400 uppercase mb-1.5 flex items-center justify-between">
                <span>Horarios Disponibles (Solo Libres)</span>
                {loadingSlots && <span className="text-[10px] text-slate-500 dark:text-gold-400 animate-pulse">Consultando agenda...</span>}
              </label>

              {(() => {
                const freeSlots = availableSlots.filter(s => s.available);
                if (freeSlots.length === 0) {
                  const isCurrentDayToday = selectedDate === todayStr;
                  const nextTargetDate = isCurrentDayToday ? tomorrowStr : getNextDateStr(selectedDate);
                  const nextTargetLabel = isCurrentDayToday
                    ? `Pasar a Mañana (${tomorrowStr.slice(8, 10)}/${tomorrowStr.slice(5, 7)})`
                    : `Ver Siguiente Día (${nextTargetDate.slice(8, 10)}/${nextTargetDate.slice(5, 7)})`;

                  const rawPhone = barbershopInfo?.whatsapp || barbershopInfo?.phone || '573001234567';
                  const digits = String(rawPhone).replace(/[^\d]/g, '');
                  const cleanPhone = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
                  const assignedBarber = barbers.find(b => b.id === barberId);
                  const waMsg = encodeURIComponent(
                    `Hola ${barbershopInfo?.name || 'la Barbería'} 💈 Quiero consultar disponibilidad para agendar una cita:\n\n` +
                    `• Servicio: ${serviceName || 'Corte'}\n` +
                    `• Barbero: ${assignedBarber?.name || 'Cualquiera disponible'}\n` +
                    `• Fecha: ${selectedDate}\n\n` +
                    `¿Tienen algún espacio libre para confirmar? ¡Muchas gracias!`
                  );
                  const waLink = `https://wa.me/${cleanPhone || '573001234567'}?text=${waMsg}`;

                  return (
                    <div className="p-3.5 text-center bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-amber-500/20 text-xs rounded-2xl space-y-3">
                      <p className="text-slate-700 dark:text-amber-300 font-medium">
                        {isCurrentDayToday
                          ? '⚠️ Los turnos diurnos de hoy ya finalizaron (cierre comercial 20:00).'
                          : `⚠️ No hay turnos disponibles para este barbero el ${selectedDate}.`}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                        {/* Botón dinámico que SIEMPRE avanza de fecha */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(nextTargetDate);
                            setAllowPast(false);
                          }}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm dark:bg-gold-500 dark:hover:bg-gold-400 dark:text-noir-950 cursor-pointer"
                        >
                          👉 {nextTargetLabel}
                        </button>

                        {/* Botón directo de WhatsApp con la Barbería */}
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-white" />
                          <span>Hablar por WhatsApp</span>
                        </a>
                      </div>

                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setAllowPast(true)}
                          className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
                        >
                          ⚡ Habilitar turnos para ensayo (Modo Test)
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-50 dark:bg-noir-950 rounded-xl border border-slate-200 dark:border-industrial-850 max-h-48 overflow-y-auto">
                    {freeSlots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        onClick={() => setSelectedTime(s.time)}
                        className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                          selectedTime === s.time
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm dark:bg-gold-500 dark:text-noir-950'
                            : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-800 dark:text-slate-300 hover:border-amber-400 dark:hover:border-gold-500/50'
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="pt-3 pb-2 flex items-center justify-between gap-2 sticky bottom-0 bg-white dark:bg-noir-900 border-t border-slate-100 dark:border-industrial-800 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 mt-4 z-20">
            <div className="min-w-0 flex-shrink-0">
              {!selectedTime ? (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">👆 Elige hora</span>
              ) : (
                <span className="text-xs text-emerald-800 dark:text-emerald-400 font-mono font-bold whitespace-nowrap bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-1 rounded-lg">
                  {selectedTime} hrs
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedTime}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:hover:from-gold-500 dark:hover:to-gold-300 dark:text-noir-950 font-bold text-xs uppercase tracking-wider shadow-sm dark:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? 'Agregando...' : 'Agregar Fila'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal de Cobro & Checkout Rápido POS con Upsell de Productos */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Cobro POS de Servicio & Venta Retail"
      >
        {selectedAppointment && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="bg-slate-50 dark:bg-noir-950 rounded-2xl p-4 border border-slate-200 dark:border-industrial-800 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 dark:text-industrial-400">Resumen del Turno:</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedAppointment.clientName}</div>
              <div className="text-xs text-amber-700 dark:text-gold-400 flex items-center justify-between mt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedAppointment.serviceName} ({selectedAppointment.barberName})</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">${Number(selectedAppointment.price).toLocaleString('es-CO')}</span>
              </div>
            </div>

            {/* Selector de Productos de Venta Cruzada (Retail Upsell) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                Añadir Producto de Mostrador (Pomadas, Aceites)
              </label>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {availableProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addRetailToTicket(prod)}
                    className="flex-shrink-0 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-noir-950 dark:hover:bg-noir-900 border border-slate-200 dark:border-industrial-800 hover:border-amber-500 dark:hover:border-gold-500 text-left transition-colors cursor-pointer shadow-xs"
                  >
                    <div className="text-[11px] font-semibold text-slate-900 dark:text-white">{prod.name.split('(')[0]}</div>
                    <div className="text-[10px] text-amber-600 dark:text-gold-400 font-mono font-bold">+${Number(prod.unitPrice).toLocaleString('es-CO')}</div>
                  </button>
                ))}
              </div>

              {selectedRetailProducts.length > 0 && (
                <div className="mt-2 space-y-1.5 bg-slate-50 dark:bg-noir-950 p-2.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-xs">
                  {selectedRetailProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                      <span>{p.name} (x{p.qty})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-700 dark:text-gold-400 font-bold">${Number(p.unitPrice * p.qty).toLocaleString('es-CO')}</span>
                        <button
                          type="button"
                          onClick={() => removeRetailFromTicket(p.id)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Efectivo', icon: Banknote },
                  { id: 'CARD', label: 'Datáfono / Tarjeta', icon: CreditCard },
                  { id: 'TRANSFER', label: 'Transferencia / Nequi', icon: Smartphone }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                        isSel
                          ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-gold-300 dark:bg-gold-500/20 dark:border-gold-500 shadow-sm font-bold'
                          : 'border-slate-200 dark:border-industrial-800 bg-slate-50 dark:bg-noir-950 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-noir-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-amber-600 dark:text-gold-400" />
                      <span className="text-center text-[11px] leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-400 uppercase mb-1">
                Propina Voluntaria para el Barbero ($)
              </label>
              <input
                type="number"
                min="0"
                value={tip}
                onChange={(e) => setTip(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-mono font-bold"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-industrial-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-industrial-400 block font-medium">Total a Cobrar:</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-gold-400">
                  ${Number(finalTicketTotal).toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCompleteCheckout}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                >
                  Confirmar Cobro
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Rápido: Activar / Pausar Turnos de la Barbería */}
      <Modal
        isOpen={isManageSlotsOpen}
        onClose={() => setIsManageSlotsOpen(false)}
        title="Gestión de Turnos y Disponibilidad"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Selector de Barbero y Selector de Pestaña */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-industrial-800">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <img
                  src={selectedBarberObj?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80'}
                  alt={selectedBarberObj?.name}
                  className="w-8 h-8 rounded-xl object-cover border border-amber-500/40 flex-shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Barbero Activo
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {selectedBarberObj?.name || 'Selecciona Barbero'}
                  </span>
                </div>
              </div>

              {/* Selector Rápido de Barberos sin Desfase */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                {barbers.map((b) => {
                  const isSelected = barberId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBarberId(b.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500 text-noir-950 font-bold shadow-sm'
                          : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pestañas: Franjas del Día vs Horario Semanal Habitual */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 self-stretch sm:self-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setManageTab('slots')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  manageTab === 'slots'
                    ? 'bg-gold-500 text-noir-950 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Franjas por Fecha</span>
              </button>

              <button
                type="button"
                onClick={() => setManageTab('schedule')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  manageTab === 'schedule'
                    ? 'bg-gold-500 text-noir-950 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Horario Semanal Base</span>
              </button>
            </div>
          </div>

          {/* VISTA 1: Franjas Horarias por Fecha (1 Clic) */}
          {manageTab === 'slots' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* Selector de Fecha con botones rápidos (Hoy / Mañana) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fecha:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedDate === todayStr
                        ? 'bg-amber-500 text-noir-950 font-bold shadow-sm'
                        : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      setSelectedDate(getLocalDate(tom));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      (() => {
                        const tom = new Date();
                        tom.setDate(tom.getDate() + 1);
                        return selectedDate === getLocalDate(tom);
                      })()
                        ? 'bg-amber-500 text-noir-950 font-bold shadow-sm'
                        : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400'
                    }`}
                  >
                    Mañana
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowPast(!allowPast)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      allowPast
                        ? 'bg-purple-600 text-white font-bold shadow-sm'
                        : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-gold-400'
                    }`}
                    title="Permite activar o ensayar turnos incluso fuera de horario comercial"
                  >
                    ⚡ {allowPast ? 'Modo Ensayo ON' : 'Desbloquear Ensayo'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-1 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Contadores de Resumen */}
              {(() => {
                const freeCount = availableSlots.filter(s => s.available).length;
                const pausedCount = availableSlots.filter(s => s.reason === 'BLOCKED_MANUALLY').length;
                const bookedCount = availableSlots.filter(s => s.reason === 'BOOKED').length;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                        🟢 {freeCount} Libres
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold font-mono">
                        ⏸️ {pausedCount} Pausados
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-industrial-800 text-slate-700 dark:text-slate-300 font-semibold font-mono">
                        🔒 {bookedCount} Citas
                      </span>
                    </div>

                    {loadingSlots && (
                      <span className="text-[11px] font-mono text-amber-600 dark:text-gold-400 animate-pulse">
                        Sincronizando...
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Botones de Acción Masiva Rápida (1 Clic) */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-industrial-400 block font-mono">
                  ⚡ Acciones Rápidas en Lote (1 Clic)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    disabled={loadingSlots}
                    onClick={() => {
                      const pausedTimes = availableSlots
                        .filter(s => s.reason === 'BLOCKED_MANUALLY')
                        .map(s => s.time);
                      handleToggleBatch(pausedTimes, false);
                    }}
                    className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white font-semibold transition-all text-center disabled:opacity-50"
                    title="Activar todas las franjas pausadas del día"
                  >
                    🟢 Activar Todo
                  </button>

                  <button
                    type="button"
                    disabled={loadingSlots}
                    onClick={() => {
                      const morningTimes = availableSlots
                        .filter(s => s.available && s.time < '13:30')
                        .map(s => s.time);
                      handleToggleBatch(morningTimes, true);
                    }}
                    className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-black font-semibold transition-all text-center disabled:opacity-50"
                    title="Pausar todas las franjas de la mañana (09:00 a 13:00)"
                  >
                    ⏸️ Pausar Mañana
                  </button>

                  <button
                    type="button"
                    disabled={loadingSlots}
                    onClick={() => {
                      const afternoonTimes = availableSlots
                        .filter(s => s.available && s.time >= '13:30')
                        .map(s => s.time);
                      handleToggleBatch(afternoonTimes, true);
                    }}
                    className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-black font-semibold transition-all text-center disabled:opacity-50"
                    title="Pausar todas las franjas de la tarde (14:00 a 19:30)"
                  >
                    ⏸️ Pausar Tarde
                  </button>

                  <button
                    type="button"
                    disabled={loadingSlots}
                    onClick={() => {
                      const allOpenTimes = availableSlots
                        .filter(s => s.available)
                        .map(s => s.time);
                      handleToggleBatch(allOpenTimes, true);
                    }}
                    className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500 hover:text-white font-semibold transition-all text-center disabled:opacity-50"
                    title="Pausar todas las franjas disponibles de hoy"
                  >
                    🔴 Pausar Todo
                  </button>
                </div>
              </div>

              {/* Filtro de Visualización */}
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
                <span className="text-slate-400 dark:text-industrial-500 text-[11px] font-semibold mr-1">Ver:</span>
                {[
                  { id: 'ALL', label: `Todos (${availableSlots.length})` },
                  { id: 'FREE', label: `Solo Libres (${availableSlots.filter(s => s.available).length})` },
                  { id: 'PAUSED', label: `Solo Pausados (${availableSlots.filter(s => s.reason === 'BLOCKED_MANUALLY').length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSlotFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all text-xs font-semibold whitespace-nowrap ${
                      slotFilter === f.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-noir-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-noir-900 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Grilla de Franjas Horarias */}
              {(() => {
                const filteredSlots = availableSlots.filter(s => {
                  if (slotFilter === 'FREE') return s.available;
                  if (slotFilter === 'PAUSED') return s.reason === 'BLOCKED_MANUALLY';
                  return true;
                });

                if (filteredSlots.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 dark:bg-noir-950 rounded-2xl border border-slate-200 dark:border-industrial-800 text-xs text-slate-500 dark:text-industrial-400">
                      No hay franjas horarias que coincidan con el filtro seleccionado.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2.5 bg-slate-50 dark:bg-noir-950 rounded-2xl border border-slate-200 dark:border-industrial-800">
                    {filteredSlots.map((s) => {
                      const isBooked = s.reason === 'BOOKED';
                      const isManualBlocked = s.reason === 'BLOCKED_MANUALLY';
                      const isOutOfSchedule = s.reason === 'OUT_OF_SCHEDULE' || s.reason === 'DAY_OFF';
                      const isPast = s.reason === 'PAST';

                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={isBooked || isOutOfSchedule || (!allowPast && isPast)}
                          onClick={() => handleToggleSlot(s.time, isManualBlocked)}
                          className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left flex flex-col justify-between border select-none ${
                            isBooked
                              ? 'bg-slate-100 dark:bg-noir-900 border-slate-200 dark:border-industrial-800/80 text-slate-400 dark:text-industrial-500 cursor-not-allowed opacity-60'
                              : isManualBlocked
                              ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                              : (!allowPast && isPast)
                              ? 'bg-slate-100/60 dark:bg-noir-900 border-slate-200 dark:border-industrial-850 text-slate-400 dark:text-industrial-600 opacity-40 cursor-not-allowed'
                              : isOutOfSchedule
                              ? 'bg-slate-100/40 dark:bg-noir-900 border-slate-200 dark:border-industrial-850 text-slate-400 dark:text-industrial-600 opacity-30 cursor-not-allowed'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm tracking-tight">{s.time}</span>
                            <span className="text-[11px]">
                              {isBooked ? '🔒' : isManualBlocked ? '⏸️' : (!allowPast && isPast) ? '⌛' : '✓'}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase tracking-wide font-sans mt-1 block font-medium">
                            {isBooked
                              ? 'Cita Agendada'
                              : isManualBlocked
                              ? 'Pausado (Toca Activar)'
                              : (!allowPast && isPast)
                              ? 'Turno Pasado'
                              : isOutOfSchedule
                              ? 'No Labora'
                              : 'Libre (Toca Pausar)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* VISTA 2: Modificar Horario Semanal Habitual del Barbero */}
          {manageTab === 'schedule' && barberScheduleForm && (
            <form onSubmit={handleSaveBarberSchedule} className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-gold-300 text-xs">
                💡 <strong>Jornada Semanal Habitual:</strong> Define qué días y en qué horario trabaja <strong>{selectedBarberObj?.name}</strong>. Las franjas se calcularán automáticamente cada semana.
              </div>

              {scheduleSuccess && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Horario semanal de {selectedBarberObj?.name} guardado con éxito!
                </div>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {DAYS_OF_WEEK.map((d) => {
                  const dayConfig = barberScheduleForm[d.id] || { working: false, start: '09:00', end: '19:00' };
                  return (
                    <div
                      key={d.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                        dayConfig.working
                          ? 'bg-white dark:bg-noir-950 border-slate-200 dark:border-industrial-800 shadow-sm'
                          : 'bg-slate-50 dark:bg-noir-950/40 border-slate-200 dark:border-industrial-900 opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dayConfig.working}
                          onChange={(e) =>
                            setBarberScheduleForm({
                              ...barberScheduleForm,
                              [d.id]: { ...dayConfig, working: e.target.checked }
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500 cursor-pointer"
                        />
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{d.label}</span>
                      </label>

                      {dayConfig.working ? (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <input
                            type="time"
                            value={dayConfig.start || '09:00'}
                            onChange={(e) =>
                              setBarberScheduleForm({
                                ...barberScheduleForm,
                                [d.id]: { ...dayConfig, start: e.target.value }
                              })
                            }
                            className="bg-slate-50 dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-400 dark:text-industrial-500">hasta</span>
                          <input
                            type="time"
                            value={dayConfig.end || '19:00'}
                            onChange={(e) =>
                              setBarberScheduleForm({
                                ...barberScheduleForm,
                                [d.id]: { ...dayConfig, end: e.target.value }
                              })
                            }
                            className="bg-slate-50 dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-industrial-500 italic">
                          Día de descanso (Sin turnos)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSchedule ? 'Guardando...' : `Guardar Horario de ${selectedBarberObj?.name || 'Barbero'}`}</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer de Cierre */}
          <div className="pt-3 border-t border-slate-100 dark:border-industrial-800 flex justify-end">
            <button
              type="button"
              onClick={() => setIsManageSlotsOpen(false)}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-gold-500 hover:bg-slate-800 dark:hover:bg-gold-400 text-white dark:text-noir-950 font-bold text-xs shadow-sm transition-all"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
