import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { showErrorAlert, showSuccessAlert } from '../lib/swal';
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
  ChevronRight
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
  const { tenantId, appointments, barbers, createAppointment, updateStatus } = useBarbershop();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Form states con servicios tradicionales de barbería
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceName, setServiceName] = useState(TRADITIONAL_SERVICES[0].name);
  const [price, setPrice] = useState(TRADITIONAL_SERVICES[0].price);
  const [barberId, setBarberId] = useState(barbers[0]?.id || 'barber-01');

  // Obtener fecha local YYYY-MM-DD sin desfase horario de UTC
  const getLocalDate = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDate(new Date());
  const [agendaDate, setAgendaDate] = useState(todayStr); // Fecha activa del Calendario de la Agenda
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isManageSlotsOpen, setIsManageSlotsOpen] = useState(false);

  // Formato de fecha amigable en español
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${days[d.getDay()]}, ${day} de ${months[d.getMonth()]} de ${year}`;
    } catch {
      return dateStr;
    }
  };

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
      const res = await api.getAvailableSlots(tenantId, barberId, selectedDate);
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
  }, [tenantId, barberId, selectedDate, isAddModalOpen, isManageSlotsOpen]);

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
    const assignedBarber = barbers.find(b => b.id === barberId);

    const timeToUse = selectedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await createAppointment({
        barberId,
        barberName: assignedBarber ? assignedBarber.name : 'Barbero Asignado',
        clientName,
        clientPhone,
        serviceName,
        price: Number(price),
        tip: 0,
        paymentMethod: 'CASH',
        status: 'WAITING',
        date: selectedDate,
        time: timeToUse
      });

      setIsAddModalOpen(false);
      setClientName('');
      setClientPhone('');
    } catch (err) {
      showErrorAlert('Horario No Disponible', err.message || 'Error al agendar cita.');
    }
  };

  const handleStartService = async (aptId) => {
    await updateStatus(aptId, 'IN_CHAIR');
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
  const filteredAppointments = appointments.filter(a => {
    const aDate = a.date || todayStr;
    return aDate === agendaDate;
  });

  const waitingQueue = filteredAppointments.filter(a => a.status === 'WAITING' || a.status === 'SCHEDULED');
  const inChairList = filteredAppointments.filter(a => a.status === 'IN_CHAIR');
  const completedList = filteredAppointments.filter(a => a.status === 'COMPLETED');

  const [mobileTab, setMobileTab] = useState('waiting'); // 'waiting' | 'in_chair' | 'completed'

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* Header Adaptado para Móvil y Desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white tracking-wide">
            Agenda del Salón
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-industrial-400 mt-0.5">
            Turnos en tiempo real, calendario interactivo y asignación rápida de sillones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManageSlotsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-noir-900 hover:bg-slate-50 dark:hover:bg-noir-800 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Activar o desactivar turnos de los barberos con 1 click"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Cita / Turno</span>
          </button>
        </div>
      </div>

      {/* Barra de Navegación del Calendario del Salón (Funcional 100%) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm">
        {/* Fecha activa e indicador */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base capitalize">
                {formatFriendlyDate(agendaDate)}
              </h3>
              {agendaDate === todayStr ? (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  HOY
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAgendaDate(todayStr)}
                  className="text-[10px] font-mono text-gold-400 hover:underline cursor-pointer"
                >
                  (Volver a Hoy)
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-industrial-400">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'servicio agendado' : 'servicios agendados'} para este día
            </p>
          </div>
        </div>

        {/* Controles de Día: Ayer, Hoy, Mañana y Selector de Calendario */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={() => shiftAgendaDate(-1)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 hover:text-white transition-colors cursor-pointer"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setAgendaDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              agendaDate === todayStr
                ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-white'
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => {
              const tom = new Date();
              tom.setDate(tom.getDate() + 1);
              setAgendaDate(getLocalDate(tom));
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              (() => {
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                return agendaDate === getLocalDate(tom);
              })()
                ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-white'
            }`}
          >
            Mañana
          </button>

          <button
            type="button"
            onClick={() => shiftAgendaDate(1)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 hover:text-white transition-colors cursor-pointer"
            title="Día siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Selector de Fecha Nativo de Calendario */}
          <div className="relative">
            <input
              type="date"
              value={agendaDate}
              onChange={(e) => e.target.value && setAgendaDate(e.target.value)}
              className="bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-gold-500 cursor-pointer"
              title="Seleccionar fecha en el calendario"
            />
          </div>
        </div>
      </div>

      {/* Selector de pestañas para celular (Mobile Segmented Control) */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setMobileTab('waiting')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'waiting'
              ? 'bg-amber-500 text-noir-950 shadow-sm'
              : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>En Espera</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mobileTab === 'waiting' ? 'bg-noir-950/20 text-noir-950' : 'bg-slate-200 dark:bg-industrial-800 text-amber-700 dark:text-amber-300'}`}>
            {waitingQueue.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('in_chair')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'in_chair'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>En Sillón</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mobileTab === 'in_chair' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-industrial-800 text-blue-700 dark:text-blue-300'}`}>
            {inChairList.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('completed')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'completed'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Listos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mobileTab === 'completed' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-industrial-800 text-emerald-700 dark:text-emerald-300'}`}>
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
                  className="bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800/90 hover:border-gold-500/40 rounded-xl p-4 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{apt.clientName}</h4>
                      <p className="text-xs text-slate-500 dark:text-industrial-400 flex items-center gap-1 mt-0.5">
                        <Scissors className="w-3 h-3 text-gold-500" /> {apt.serviceName}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-gold-600 dark:text-gold-400 font-bold">${apt.price}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-industrial-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-industrial-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {apt.time}
                    </span>
                    <button
                      onClick={() => handleStartService(apt.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors text-xs font-semibold"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Al Sillón
                    </button>
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
                  className="bg-slate-50 dark:bg-noir-950 border border-blue-500/30 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{apt.clientName}</h4>
                      <p className="text-xs text-gold-600 dark:text-gold-400 flex items-center gap-1 mt-0.5 font-medium">
                        Barbero: {apt.barberName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{apt.serviceName}</p>
                    </div>
                    <span className="font-mono text-sm text-slate-900 dark:text-white font-bold">${apt.price}</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-industrial-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-semibold">
                      En Curso
                    </span>
                    <button
                      onClick={() => openCheckout(apt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors text-xs font-bold"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Cobrar Turno
                    </button>
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
                      ${(Number(apt.price) + Number(apt.tip || 0)).toFixed(2)}
                    </div>
                    {Number(apt.tip) > 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-industrial-400 font-mono">
                        Propina: ${apt.tip}
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
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              required
              placeholder="Ej. David Fernández"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
              Teléfono (Opcional)
            </label>
            <input
              type="tel"
              placeholder="+34 611 222 333"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Selector de Servicios Tradicionales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-industrial-400 uppercase">
                Servicios Básicos de Barbería
              </label>
              <span className="text-[10px] text-gold-400 font-mono">1 Clic o Personaliza</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {TRADITIONAL_SERVICES.map((srv) => {
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
                        ? 'border-gold-500 bg-gold-500/15 text-gold-300 shadow-sm'
                        : 'border-industrial-800 hover:border-industrial-700 bg-noir-950 text-industrial-300'
                    }`}
                  >
                    <span className="text-sm flex-shrink-0">{srv.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate">{srv.shortName}</div>
                      <div className="text-[9px] text-gold-400 font-mono">${srv.price.toLocaleString('es-CO')}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] text-industrial-400 uppercase mb-1 flex items-center justify-between">
                  <span>Servicio</span>
                  <span className="text-[9px] text-industrial-500 font-normal">Puedes editarlo libremente</span>
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ej: Corte, Barba, Cejas..."
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-industrial-400 uppercase mb-1 flex items-center justify-between">
                  <span>Precio ($ COP)</span>
                  <span className="text-[9px] text-industrial-500 font-normal">Modificable</span>
                </label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-gold-400 font-mono font-bold focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
              Asignar a Barbero
            </label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status === 'AVAILABLE' ? 'Disponible' : b.status})
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y Horario con Disponibilidad Sincronizada */}
          <div className="space-y-2 pt-1 border-t border-industrial-800/60">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-industrial-400 uppercase">
                Fecha del Turno
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-noir-950 border border-industrial-800 rounded-lg px-2.5 py-1 text-xs text-gold-400 font-mono font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-industrial-400 uppercase mb-1.5 flex items-center justify-between">
                <span>Horarios Disponibles (Solo Libres)</span>
                {loadingSlots && <span className="text-[10px] text-gold-400 animate-pulse">Consultando agenda...</span>}
              </label>

              {(() => {
                const freeSlots = availableSlots.filter(s => s.available);
                if (freeSlots.length === 0) {
                  return (
                    <div className="p-3 text-center bg-noir-950 border border-amber-500/20 text-amber-400 text-xs rounded-xl">
                      ⚠️ No hay turnos disponibles para este barbero en {selectedDate}.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 p-1.5 bg-noir-950 rounded-xl border border-industrial-850">
                    {freeSlots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        onClick={() => setSelectedTime(s.time)}
                        className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                          selectedTime === s.time
                            ? 'bg-gold-500 text-noir-950 font-black shadow-glow-gold'
                            : 'bg-noir-900 border border-industrial-800 text-slate-300 hover:border-gold-500/50'
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

          <div className="pt-3 pb-2 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-noir-900 border-t border-slate-100 dark:border-industrial-800 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 mt-4 z-20">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-industrial-400 hover:text-white text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer"
            >
              Agregar a la Fila
            </button>
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
            <div className="bg-noir-950 rounded-xl p-4 border border-industrial-800">
              <div className="text-xs text-industrial-400">Resumen del Turno:</div>
              <div className="text-base font-bold text-white mt-0.5">{selectedAppointment.clientName}</div>
              <div className="text-xs text-gold-400 flex items-center justify-between mt-1">
                <span>{selectedAppointment.serviceName} ({selectedAppointment.barberName})</span>
                <span className="font-mono font-bold text-white">${selectedAppointment.price}</span>
              </div>
            </div>

            {/* Selector de Productos de Venta Cruzada (Retail Upsell) */}
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-gold-400" />
                Añadir Producto de Mostrador (Pomadas, Aceites)
              </label>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {availableProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addRetailToTicket(prod)}
                    className="flex-shrink-0 px-3 py-2 rounded-xl bg-noir-950 border border-industrial-800 hover:border-gold-500 text-left transition-colors"
                  >
                    <div className="text-[11px] font-semibold text-white">{prod.name.split('(')[0]}</div>
                    <div className="text-[10px] text-gold-400 font-mono">+${prod.unitPrice}</div>
                  </button>
                ))}
              </div>

              {selectedRetailProducts.length > 0 && (
                <div className="mt-2 space-y-1.5 bg-noir-950 p-2.5 rounded-xl border border-industrial-800 text-xs">
                  {selectedRetailProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-slate-300">
                      <span>{p.name} (x{p.qty})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gold-400 font-bold">${(p.unitPrice * p.qty).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeRetailFromTicket(p.id)}
                          className="text-industrial-500 hover:text-rose-400"
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
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Efectivo', icon: Banknote },
                  { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
                  { id: 'TRANSFER', label: 'Bizum / App', icon: Smartphone }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                        isSel
                          ? 'border-gold-500 bg-gold-500/10 text-gold-400 shadow-glow-gold'
                          : 'border-industrial-800 bg-noir-950 text-industrial-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Propina Voluntaria para el Barbero ($)
              </label>
              <input
                type="number"
                min="0"
                value={tip}
                onChange={(e) => setTip(Number(e.target.value))}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>

            <div className="pt-3 border-t border-industrial-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-industrial-400 block">Total a Cobrar:</span>
                <span className="text-2xl font-bold font-mono text-gold-400">
                  ${finalTicketTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-industrial-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCompleteCheckout}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg transition-colors"
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
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <img
                src={selectedBarberObj?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80'}
                alt={selectedBarberObj?.name}
                className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-industrial-400 uppercase tracking-wider">
                  Especialista / Barbero
                </label>
                <select
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-gold-500 cursor-pointer"
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white dark:bg-noir-950 text-slate-900 dark:text-white">
                      {b.name} ({b.specialties?.[0] || 'Master Barber'})
                    </option>
                  ))}
                </select>
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
                          disabled={isBooked || isOutOfSchedule || isPast}
                          onClick={() => handleToggleSlot(s.time, isManualBlocked)}
                          className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left flex flex-col justify-between border select-none ${
                            isBooked
                              ? 'bg-slate-100 dark:bg-noir-900 border-slate-200 dark:border-industrial-800/80 text-slate-400 dark:text-industrial-500 cursor-not-allowed opacity-60'
                              : isManualBlocked
                              ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                              : isPast
                              ? 'bg-slate-100/60 dark:bg-noir-900 border-slate-200 dark:border-industrial-850 text-slate-400 dark:text-industrial-600 opacity-40 cursor-not-allowed'
                              : isOutOfSchedule
                              ? 'bg-slate-100/40 dark:bg-noir-900 border-slate-200 dark:border-industrial-850 text-slate-400 dark:text-industrial-600 opacity-30 cursor-not-allowed'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm tracking-tight">{s.time}</span>
                            <span className="text-[11px]">
                              {isBooked ? '🔒' : isManualBlocked ? '⏸️' : isPast ? '⌛' : '✓'}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase tracking-wide font-sans mt-1 block font-medium">
                            {isBooked
                              ? 'Cita Agendada'
                              : isManualBlocked
                              ? 'Pausado (Toca Activar)'
                              : isPast
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
