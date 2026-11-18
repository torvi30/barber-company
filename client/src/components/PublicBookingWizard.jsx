import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { fetchFirestoreBarbers, saveFirestoreAppointment } from '../services/firestoreService';
import { buildWhatsAppLink, normalizeWhatsAppPhone } from '../lib/phoneUtils';
import { generateDynamicSlots } from '../lib/slotEngine';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  MessageCircle,
  Send,
  Home,
  RotateCcw
} from 'lucide-react';

// Catálogo de respaldo inmediato de servicios básicos de barbería
const FALLBACK_SERVICES = [
  { id: 'srv-01', name: 'Corte', durationMinutes: 30, price: 25000, description: 'Corte clásico o degradado (Fade / Skin Fade) con peinado y acabado.' },
  { id: 'srv-02', name: 'Barba', durationMinutes: 20, price: 18000, description: 'Arreglo, toalla caliente y perfilado de barba con navaja.' },
  { id: 'srv-03', name: 'Cejas', durationMinutes: 15, price: 10000, description: 'Limpieza y diseño de cejas masculinas con navaja.' },
  { id: 'srv-04', name: 'Cera', durationMinutes: 15, price: 12000, description: 'Depilación con cera en nariz, oídos o pómulos.' },
  { id: 'srv-05', name: 'Corte y Barba', durationMinutes: 45, price: 38000, description: 'Combo clásico: corte completo de cabello y ritual de barba.' },
  { id: 'srv-06', name: 'Corte y Cejas', durationMinutes: 35, price: 30000, description: 'Corte completo de cabello más diseño y perfilado de cejas.' },
  { id: 'srv-07', name: 'Corte y Cera', durationMinutes: 35, price: 32000, description: 'Corte de cabello completo con aplicación de cera depilatoria facial.' },
  { id: 'srv-08', name: 'Barba y Cejas', durationMinutes: 25, price: 25000, description: 'Arreglo de barba con navaja más limpieza y perfilado de cejas.' },
  { id: 'srv-09', name: 'Barba con Cera', durationMinutes: 25, price: 25000, description: 'Ritual de barba con toalla caliente y depilación de vellos con cera.' },
  { id: 'srv-10', name: 'Corte, Barba y Cejas', durationMinutes: 50, price: 45000, description: 'Combo tradicional completo: cabello, barba ritual y cejas.' },
  { id: 'srv-11', name: 'Corte, Barba y Cera', durationMinutes: 50, price: 48000, description: 'Corte de cabello, arreglo de barba y depilación facial con cera.' },
  { id: 'srv-12', name: 'Combo Completo', durationMinutes: 60, price: 55000, description: 'La experiencia total: Corte, Barba, Cejas y Cera en una sola sesión.' }
];

const FALLBACK_BARBERS = [
  { id: 'barber_default_1', name: 'Carlos López', status: 'AVAILABLE', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=200&q=80' },
  { id: 'barber_default_2', name: 'Andrés Morales', status: 'AVAILABLE', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80' },
  { id: 'barber_default_3', name: 'Mateo Gómez', status: 'AVAILABLE', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&q=80' }
];

const getLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultBookingDate = () => {
  const now = new Date();
  // Si son más de las 19:00 hrs (salón cerrado por hoy), sugerir automáticamente Mañana
  if (now.getHours() >= 19) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDate(tomorrow);
  }
  return getLocalDate(now);
};

export const PublicBookingWizard = ({
  slug,
  tenantId: propTenantId = null,
  initialBarbershop = null,
  initialBarbers = null,
  onBookingComplete
}) => {
  const effectiveSlug = (slug && String(slug).trim()) ? String(slug).trim() : (initialBarbershop?.slug || initialBarbershop?.id || 'black-gold');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [barbershop, setBarbershop] = useState(() => {
    const passedBarbers = (Array.isArray(initialBarbers) && initialBarbers.length > 0)
      ? initialBarbers
      : ((initialBarbershop?.barbers && initialBarbershop.barbers.length > 0) ? initialBarbershop.barbers : null);

    if (initialBarbershop) {
      return {
        ...initialBarbershop,
        services: (initialBarbershop.services && initialBarbershop.services.length > 0) ? initialBarbershop.services : FALLBACK_SERVICES,
        barbers: passedBarbers || FALLBACK_BARBERS
      };
    }
    return null;
  });

  // Mantener sincronizados los barberos cuando lleguen desde el contexto de la barbería
  useEffect(() => {
    if (Array.isArray(initialBarbers) && initialBarbers.length > 0) {
      setBarbershop(prev => ({
        ...(prev || {}),
        barbers: initialBarbers
      }));
      setSelectedBarber(prev => {
        if (!prev || !initialBarbers.some(b => b.id === prev.id)) {
          return initialBarbers[0];
        }
        return prev;
      });
    }
  }, [initialBarbers]);

  const servicesList = (barbershop?.services && barbershop.services.length > 0) ? barbershop.services : FALLBACK_SERVICES;
  const barbersList = (barbershop?.barbers && barbershop.barbers.length > 0) ? barbershop.barbers : FALLBACK_BARBERS;

  const [selectedService, setSelectedService] = useState(() => servicesList[0]);
  const [serviceCategory, setServiceCategory] = useState('ALL'); // 'ALL' | 'INDIVIDUAL' | 'COMBOS'

  // Filtrado de servicios por categoría para que el cliente elija rápido sin desplazarse tanto
  const filteredServices = useMemo(() => {
    if (serviceCategory === 'INDIVIDUAL') {
      return servicesList.filter(s => {
        const n = String(s.name || '').toLowerCase();
        return !n.includes(' y ') && !n.includes(' con ') && !n.includes('combo') && !n.includes(',');
      });
    }
    if (serviceCategory === 'COMBOS') {
      return servicesList.filter(s => {
        const n = String(s.name || '').toLowerCase();
        return n.includes(' y ') || n.includes(' con ') || n.includes('combo') || n.includes(',');
      });
    }
    return servicesList;
  }, [servicesList, serviceCategory]);

  const getServiceEmoji = (name = '') => {
    const n = String(name).toLowerCase();
    if (n.includes('combo')) return '👑';
    if (n.includes('cera')) return '🍯';
    if (n.includes('ceja')) return '✨';
    if (n.includes('barba')) return '🧔';
    return '✂️';
  };
  const [selectedBarber, setSelectedBarber] = useState(() => barbersList[0]);
  const [selectedDate, setSelectedDate] = useState(getDefaultBookingDate());
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [enableTestSlots, setEnableTestSlots] = useState(false);

  const todayStr = getLocalDate(new Date());
  const tomorrowStr = getLocalDate(new Date(Date.now() + 86400000));
  const dayAfterStr = getLocalDate(new Date(Date.now() + 86400000 * 2));

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

  // Client info form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Submit & Collision state
  const [submitting, setSubmitting] = useState(false);
  const [collisionError, setCollisionError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [waClicked, setWaClicked] = useState(false);

  const handleResetToHome = () => {
    setConfirmedBooking(null);
    setWaClicked(false);
    setStep(1);
    setSelectedTime(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setCollisionError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof onBookingComplete === 'function') {
      onBookingComplete();
    }
  };

  // Cargar datos de la barbería por slug y sincronizar con Firestore
  useEffect(() => {
    let isMounted = true;
    const loadBarbershop = async () => {
      try {
        if (!barbershop?.name) setLoading(true);
        setError('');

        let loadedData = null;
        let loadedBarbers = (Array.isArray(initialBarbers) && initialBarbers.length > 0) ? initialBarbers : null;

        try {
          const res = await api.getPublicBarbershop(effectiveSlug);
          if (res.success && res.data) {
            loadedData = res.data;
            if (Array.isArray(res.data.barbers) && res.data.barbers.length > 0) {
              loadedBarbers = res.data.barbers;
            }
          }
        } catch (err) {
          console.warn('API getPublicBarbershop notice:', err.message);
        }

        // Si aún no tenemos barberos, consultar directamente en Firestore Cloud
        const targetTid = propTenantId || initialBarbershop?.id || effectiveSlug;
        if (!loadedBarbers || loadedBarbers.length === 0) {
          try {
            const fsBarbers = await fetchFirestoreBarbers(targetTid);
            if (Array.isArray(fsBarbers) && fsBarbers.length > 0) {
              loadedBarbers = fsBarbers;
            }
          } catch (fsErr) {
            console.warn('Firestore fetchBarbers notice:', fsErr.message);
          }
        }

        if (!isMounted) return;

        const finalBarbers = (loadedBarbers && loadedBarbers.length > 0)
          ? loadedBarbers
          : ((barbershop?.barbers && barbershop.barbers.length > 0) ? barbershop.barbers : FALLBACK_BARBERS);

        const finalServices = (loadedData?.services && loadedData.services.length > 0)
          ? loadedData.services
          : (initialBarbershop?.services && initialBarbershop.services.length > 0 ? initialBarbershop.services : FALLBACK_SERVICES);

        setBarbershop(prev => ({
          ...(initialBarbershop || {}),
          ...(prev || {}),
          ...(loadedData || {}),
          services: finalServices,
          barbers: finalBarbers
        }));

        if (finalServices.length > 0) {
          setSelectedService(prev => prev || finalServices[0]);
        }
        if (finalBarbers.length > 0) {
          setSelectedBarber(prev => {
            if (!prev || !finalBarbers.some(b => b.id === prev.id)) {
              return finalBarbers[0];
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Aviso al sincronizar agenda pública:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBarbershop();
    return () => { isMounted = false; };
  }, [effectiveSlug, propTenantId, initialBarbershop?.id]);

  // Cargar slots cuando cambie el barbero o la fecha
  useEffect(() => {
    if (!selectedBarber || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedTime(null);
        setCollisionError('');
        const targetInterval = barbershop?.slotInterval || 30;
        const targetBuffer = barbershop?.bufferTime || 0;

        let loadedSlots = null;
        try {
          const res = await api.getPublicSlots(effectiveSlug, selectedBarber.id, selectedDate, enableTestSlots, targetInterval, targetBuffer);
          if (res.success && Array.isArray(res.slots) && res.slots.length > 0) {
            loadedSlots = res.slots;
          }
        } catch (err) {
          // Fallback a generación dinámica
        }

        if (!loadedSlots || loadedSlots.length === 0) {
          const dynamic = generateDynamicSlots({
            date: selectedDate,
            barber: selectedBarber,
            appointments: barbershop?.appointments || [],
            manualBlocked: [],
            slotInterval: targetInterval,
            bufferTime: targetBuffer,
            allowPast: enableTestSlots
          });
          loadedSlots = dynamic.slots;
        }

        setSlots(loadedSlots || []);
      } catch (err) {
        console.error('Error al cargar slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [effectiveSlug, selectedBarber, selectedDate, enableTestSlots, barbershop?.slotInterval, barbershop?.bufferTime]);

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedBarber || !selectedService || !selectedTime || !clientName || !clientPhone) {
      return;
    }

    try {
      setSubmitting(true);
      setCollisionError('');

      const serviceDuration = Number(selectedService.durationMinutes || selectedService.duration || 30);

      const payload = {
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        serviceName: selectedService.name,
        durationMinutes: serviceDuration,
        price: Number(selectedService.price || 0),
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone: normalizeWhatsAppPhone(clientPhone),
        clientEmail,
        notes
      };

      let confirmedData = null;

      // 1. Intentar registrar en API del backend
      try {
        const res = await api.createPublicBooking(effectiveSlug, payload);
        if (res.success && res.data) {
          confirmedData = res.data;
        }
      } catch (apiErr) {
        if (apiErr.status === 409 || apiErr.message?.includes('Collision') || apiErr.message?.includes('disponible')) {
          throw apiErr;
        }
        console.warn('API createPublicBooking notice, guardando directo en Firestore Cloud:', apiErr.message);
      }

      // 2. Si la API no respondió o falló la conexión de red, persistir directo en Firestore
      if (!confirmedData) {
        const targetTid = propTenantId || barbershop?.id || effectiveSlug;
        const newApt = {
          ...payload,
          id: `apt_pub_${Date.now()}`,
          status: 'WAITING',
          createdAt: new Date().toISOString()
        };
        await saveFirestoreAppointment(targetTid, newApt);
        confirmedData = newApt;
      }

      setConfirmedBooking(confirmedData);
      if (onBookingComplete) onBookingComplete(confirmedData);
    } catch (err) {
      if (err.status === 409 || err.message?.includes('Collision') || err.message?.includes('disponible')) {
        setCollisionError(err.message || 'El horario seleccionado acaba de ser tomado por otro cliente. Por favor elige otro horario.');
        // Recargar slots actualizados
        const res = await api.getPublicSlots(effectiveSlug, selectedBarber.id, selectedDate);
        if (res.success) setSlots(res.slots || []);
      } else {
        setCollisionError(err.message || 'Ocurrió un error al procesar tu cita. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-3xl p-8 text-center animate-pulse">
        <div className="w-12 h-12 bg-amber-500/20 dark:bg-gold-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Scissors className="w-6 h-6 text-amber-500 dark:text-gold-400 animate-spin" />
        </div>
        <p className="text-sm font-mono text-slate-600 dark:text-industrial-400">Conectando con la agenda de la barbería en tiempo real...</p>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="bg-white dark:bg-noir-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-red-500/10 rounded-full mx-auto flex items-center justify-center text-red-500">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Agenda no disponible temporalmente</h4>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-1">
            {error || 'No se pudo conectar con la agenda de la barbería.'}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 dark:from-gold-500 dark:to-gold-600 text-black font-bold text-xs rounded-xl shadow-glow-gold hover:scale-105 transition-all"
        >
          Reintentar Conexión
        </button>
      </div>
    );
  }

  // Pantalla de Confirmación Exitosa (Ticket de Cita)
  if (confirmedBooking) {
    const targetPhone = barbershop?.whatsapp || barbershop?.phone || '573225466673';
    const msg =
      `Hola ${barbershop?.name || 'la Barbería'} 💈 Acabo de reservar mi turno desde su web.\n\n` +
      `• Cliente: ${confirmedBooking.clientName}\n` +
      `• Servicio: ${confirmedBooking.serviceName}\n` +
      `• Barbero: ${confirmedBooking.barberName}\n` +
      `• Fecha y Hora: ${confirmedBooking.date} a las ${confirmedBooking.time} hrs\n` +
      `• Ticket: #${confirmedBooking.id}\n\n` +
      `¿Me confirman si recibieron mi reserva? ¡Muchas gracias!`;
    const waLink = buildWhatsAppLink(targetPhone, msg);

    return (
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-gold-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden animate-fadeIn transition-colors">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-2.5 pb-5 border-b border-slate-100 dark:border-industrial-800">
          <div className="w-14 h-14 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-gold-400">
            Reserva Registrada con Éxito
          </span>
          <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
            ¡Te esperamos, {confirmedBooking.clientName.split(' ')[0]}!
          </h3>
          <p className="text-xs text-slate-500 dark:text-industrial-400 max-w-sm mx-auto leading-relaxed">
            Tu turno quedó asegurado en tiempo real. Confírmalo con tu barbero vía WhatsApp para que quede listo en su pantalla.
          </p>
        </div>

        {/* Boarding Pass Ticket */}
        <div className="mt-5 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
          <div className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-industrial-800/80">
            <div>
              <span className="text-[10px] text-slate-400 dark:text-industrial-500 uppercase tracking-wider block font-medium">Establecimiento</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{barbershop?.name || 'BarberPulse Studio'}</span>
              <span className="text-xs text-slate-500 dark:text-industrial-400 block">{barbershop?.address || 'Sede Principal'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 dark:text-industrial-500 uppercase tracking-wider block font-medium">Código Ticket</span>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-gold-400">#{confirmedBooking.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 dark:text-industrial-500 block text-[11px]">Servicio:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{confirmedBooking.serviceName}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-industrial-500 block text-[11px]">Master Barbero:</span>
              <span className="font-semibold text-amber-600 dark:text-gold-400">{confirmedBooking.barberName}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-industrial-500 block text-[11px]">Fecha Programada:</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">{confirmedBooking.date}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-industrial-500 block text-[11px]">Horario de Inicio:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">{confirmedBooking.time} hrs</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200 dark:border-industrial-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-industrial-400">Total a abonar en tienda:</span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">${Number(confirmedBooking.price).toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* Acciones de WhatsApp y Retorno */}
        <div className="mt-5 space-y-2.5">
          {waClicked && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium animate-fadeIn">
              ✓ Se abrió la conversación de WhatsApp con tu barbero.
            </div>
          )}

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setWaClicked(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>Confirmar Turno por WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={handleResetToHome}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-noir-800 dark:hover:bg-noir-700 text-slate-700 dark:text-slate-200 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 border border-slate-200 dark:border-industrial-700 hover:scale-[1.005] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-600 dark:text-gold-400" />
            <span>Volver al Inicio / Nueva Reserva</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-5 border-b border-slate-100 dark:border-industrial-800 mb-4 sm:mb-6">
        <div>
          <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-gold-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Agendamiento Inteligente
          </span>
          <h3 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
            Reserva tu Cita
          </h3>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-xs">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-xs transition-colors ${
                step === s
                  ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                  : step > s
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-noir-950 text-slate-400 dark:text-industrial-500 border border-slate-200 dark:border-industrial-800'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Alerta de Colisión / Error */}
      {collisionError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block text-slate-900 dark:text-white font-semibold">Conflicto de Horario</strong>
            {collisionError}
          </div>
        </div>
      )}

      {/* PASO 1: Elegir Servicio */}
      {step === 1 && (
        <div className="space-y-3.5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase tracking-wider">
              1. Selecciona el Servicio Deseado
            </label>
            <span className="text-[10px] text-amber-500 dark:text-gold-400 font-medium">
              Toca para seleccionar
            </span>
          </div>

          {/* Filtros de Categoría Rápidos para reducir la lista */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              type="button"
              onClick={() => setServiceCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                serviceCategory === 'ALL'
                  ? 'bg-slate-900 text-amber-300 border border-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950 font-bold'
                  : 'bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>✨ Todos ({servicesList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setServiceCategory('INDIVIDUAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                serviceCategory === 'INDIVIDUAL'
                  ? 'bg-slate-900 text-amber-300 border border-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950 font-bold'
                  : 'bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>✂️ Individuales</span>
            </button>
            <button
              type="button"
              onClick={() => setServiceCategory('COMBOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                serviceCategory === 'COMBOS'
                  ? 'bg-slate-900 text-amber-300 border border-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950 font-bold'
                  : 'bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>👑 Combos Populares</span>
            </button>
          </div>

          {/* Grid Compacto de Servicios (2 Columnas en tablet/PC, 1 compacta en móvil) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-0.5 overscroll-contain">
            {filteredServices.map((srv) => {
              const isSelected = selectedService?.id === srv.id;
              return (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-950 shadow-lg ring-2 ring-amber-400/60 dark:bg-gold-500/15 dark:border-gold-500 dark:shadow-glow-gold dark:ring-gold-500/50 scale-[1.01]'
                      : 'bg-white dark:bg-noir-950 border-slate-200 dark:border-industrial-800/80 hover:border-slate-400 dark:hover:border-industrial-700 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 dark:bg-gold-500 dark:text-noir-950 shadow-sm font-bold'
                        : 'bg-slate-100 dark:bg-noir-900 text-slate-700 dark:text-slate-300'
                    }`}>
                      {getServiceEmoji(srv.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`font-bold text-xs sm:text-sm truncate transition-colors ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}>
                          {srv.name}
                        </h4>
                        {isSelected && (
                          <span className="hidden xs:inline-flex px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 dark:bg-gold-500/20 dark:text-gold-300 text-[9px] font-bold border border-amber-400/30 font-mono">
                            ✓ Elegido
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 transition-colors ${
                        isSelected ? 'text-slate-300 dark:text-industrial-300' : 'text-slate-500 dark:text-industrial-400'
                      }`}>
                        {srv.description || 'Servicio profesional de barbería'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs sm:text-sm font-bold font-mono block transition-colors ${
                      isSelected
                        ? 'text-amber-400 dark:text-gold-300'
                        : 'text-slate-900 dark:text-gold-400'
                    }`}>
                      ${Number(srv.price).toLocaleString('es-CO')}
                    </span>
                    <span className={`text-[10px] flex items-center gap-0.5 justify-end mt-0.5 font-mono transition-colors ${
                      isSelected
                        ? 'text-slate-300 dark:text-industrial-300'
                        : 'text-slate-400 dark:text-industrial-500'
                    }`}>
                      <Clock className={`w-2.5 h-2.5 ${isSelected ? 'text-amber-400' : 'text-amber-500 dark:text-gold-500'}`} /> {srv.durationMinutes} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra Inferior Fija (Sticky): El botón de continuar SIEMPRE está al alcance sin scroll */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-noir-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-industrial-800 shadow-xl flex items-center justify-between gap-3 mt-3 z-20">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-500 dark:text-industrial-400 uppercase tracking-wider block font-semibold">
                Servicio Elegido
              </span>
              <div className="flex items-center gap-2 truncate">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {selectedService ? selectedService.name : 'Ninguno seleccionado'}
                </span>
                {selectedService && (
                  <span className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-gold-400 flex-shrink-0">
                    ${Number(selectedService.price).toLocaleString('es-CO')}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!selectedService}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-950 dark:bg-gold-500 dark:hover:bg-gold-400 dark:text-noir-950 font-bold text-xs shadow-md dark:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            >
              <span>Continuar a Barbero</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Elegir Barbero */}
      {step === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase tracking-wider">
            2. Elige tu Barbero Preferido
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {barbersList.map((barber) => {
              const isSelected = selectedBarber?.id === barber.id;
              return (
                <div
                  key={barber.id}
                  onClick={() => setSelectedBarber(barber)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-950 shadow-lg ring-2 ring-amber-400/60 dark:bg-gold-500/15 dark:border-gold-500 dark:shadow-glow-gold scale-[1.01]'
                      : 'bg-white dark:bg-noir-950 border-slate-200 dark:border-industrial-800 hover:border-slate-400 dark:hover:border-industrial-700 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={barber.avatar}
                      alt={barber.name}
                      className={`w-12 h-12 rounded-xl object-cover border transition-colors ${
                        isSelected
                          ? 'border-amber-400 shadow-sm'
                          : 'border-slate-200 dark:border-industrial-700'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className={`font-bold text-sm transition-colors ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}>
                          {barber.name}
                        </h4>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 dark:bg-gold-500/20 dark:text-gold-300 text-[9px] font-bold border border-amber-400/30 font-mono">
                            ✓ Activo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${barber.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                        <span className={`text-[11px] transition-colors ${
                          isSelected ? 'text-slate-300 dark:text-industrial-300' : 'text-slate-500 dark:text-industrial-400'
                        }`}>
                          {barber.status === 'AVAILABLE' ? 'Disponible para hoy' : 'En sillón'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400 text-slate-950 dark:border-gold-500 dark:bg-gold-500 dark:text-noir-950 shadow-sm'
                      : 'border-slate-300 dark:border-industrial-700 text-transparent'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 fill-current" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedBarber}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-950 dark:bg-gold-500 dark:hover:bg-gold-400 dark:text-noir-950 font-bold text-xs shadow-md dark:shadow-glow-gold transition-all cursor-pointer disabled:opacity-40"
            >
              Elegir Horario
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Selección de Fecha y Slot Anti-Colisión */}
      {step === 3 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase tracking-wider">
              3. Fecha y Hora Disponible (Sin Esperas)
            </label>
            <div className="text-xs font-mono text-slate-900 dark:text-gold-400 font-bold flex items-center gap-1.5">
              <span>Barbero: {selectedBarber?.name}</span>
            </div>
          </div>

          {/* Resumen del Servicio & Duración de Bloque */}
          {selectedService && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/25 dark:border-gold-500/25 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-gold-300 font-semibold">
                <Scissors className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 shrink-0" />
                <span>{selectedService.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-industrial-300">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 font-bold">
                  ⏱️ Duración: {selectedService.durationMinutes || selectedService.duration || 30} min
                </span>
                <span className="hidden sm:inline text-slate-400">·</span>
                <span className="hidden sm:inline">
                  Intervalo: {barbershop?.slotInterval || 30} min
                </span>
              </div>
            </div>
          )}

          {/* Selector Rápido de Días (Hoy, Mañana, Pasado Mañana + Calendario) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-noir-950 rounded-2xl border border-slate-200 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => { setSelectedDate(todayStr); setEnableTestSlots(false); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-slate-900 text-amber-300 border border-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950 font-bold'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hoy ({todayStr.slice(8, 10)}/{todayStr.slice(5, 7)})
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDate(tomorrowStr); setEnableTestSlots(false); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-slate-900 text-amber-300 border border-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950 font-bold'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mañana ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)})
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDate(dayAfterStr); setEnableTestSlots(false); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedDate === dayAfterStr
                  ? 'bg-slate-900 text-amber-300 border border-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950 font-bold'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {dayAfterStr.slice(8, 10)}/{dayAfterStr.slice(5, 7)}
            </button>
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setEnableTestSlots(false); }}
              className="bg-white dark:bg-noir-900 border border-slate-300 dark:border-industrial-800 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500 font-mono"
            />
          </div>

          {enableTestSlots && (
            <div className="px-3.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Modo Ensayo Activo: Todas las franjas horarias están habilitadas para prueba.
              </span>
              <button
                type="button"
                onClick={() => setEnableTestSlots(false)}
                className="text-[11px] font-bold text-purple-500 dark:text-purple-300 underline hover:text-white cursor-pointer ml-2"
              >
                Restablecer
              </button>
            </div>
          )}

          {loadingSlots ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-industrial-500 font-mono animate-pulse">
              Consultando turnos libres de {selectedBarber?.name}...
            </div>
          ) : (() => {
            const freeSlots = slots.filter(s => s.available);
            if (freeSlots.length === 0) {
              const isToday = selectedDate === todayStr;
              const nextTargetDate = isToday ? tomorrowStr : getNextDateStr(selectedDate);
              const nextLabel = isToday
                ? `Ver Horarios de Mañana (${tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)}) →`
                : `Ver Siguiente Día (${nextTargetDate.slice(8, 10)}/{nextTargetDate.slice(5, 7)}) →`;

              const targetPhone = barbershop?.whatsapp || barbershop?.phone || '573225466673';
              const waMsg =
                `Hola ${barbershop?.name || 'la Barbería'} 💈 Quiero consultar disponibilidad para agendar una cita:\n\n` +
                `• Servicio: ${selectedService?.name || 'Corte'}\n` +
                `• Barbero: ${selectedBarber?.name || 'Cualquiera'}\n` +
                `• Fecha: ${selectedDate}\n\n` +
                `¿Tienen algún horario libre disponible para coordinar? ¡Muchas gracias!`;
              const waLink = buildWhatsAppLink(targetPhone, waMsg);

              return (
                <div className="py-8 text-center p-6 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-2xl space-y-3">
                  <Clock className="w-8 h-8 text-slate-700 dark:text-gold-400 mx-auto opacity-70" />
                  <h4 className="text-slate-900 dark:text-white text-sm font-bold">
                    {selectedDate === todayStr ? 'El salón ya finalizó su jornada por hoy' : 'Sin citas disponibles para esta fecha'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-industrial-400 max-w-sm mx-auto">
                    {selectedDate === todayStr
                      ? `Las citas para hoy (${selectedDate}) han concluido (horario de atención hasta las 20:00). Reserva con ${selectedBarber?.name} para mañana a primera hora.`
                      : `${selectedBarber?.name} no tiene horarios libres para el ${selectedDate}. Puedes avanzar al siguiente día o escribirnos directamente a WhatsApp.`}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(nextTargetDate);
                        setEnableTestSlots(false);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm dark:bg-gold-500 dark:hover:bg-gold-400 dark:text-noir-950 transition-all cursor-pointer"
                    >
                      {nextLabel}
                    </button>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                      <span>Hablar por WhatsApp</span>
                    </a>
                  </div>
                  {!enableTestSlots && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setEnableTestSlots(true)}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                      >
                        ⚡ Habilitar turnos para ensayo (Modo Test)
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {freeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-3 px-2 rounded-xl text-xs font-mono font-bold transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-amber-300 border-2 border-amber-400 shadow-lg scale-105 dark:bg-gold-500 dark:text-noir-950 dark:border-gold-400'
                            : 'bg-white dark:bg-noir-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-industrial-800 hover:border-slate-800 hover:text-slate-950 dark:hover:text-gold-300 shadow-2xs'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-industrial-400 pt-2 font-mono border-t border-slate-100 dark:border-industrial-800/60">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ {freeSlots.length} horarios 100% libres disponibles
                  </span>
                  {selectedTime && (
                    <span className="text-slate-900 dark:text-gold-400 font-bold bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-400/30">
                      Seleccionado: {selectedTime} hrs
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!selectedTime}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-950 dark:bg-gold-500 dark:hover:bg-gold-400 dark:text-noir-950 font-bold text-xs shadow-md dark:shadow-glow-gold transition-all disabled:opacity-50 cursor-pointer"
            >
              Completar Datos
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Datos del Cliente & Confirmación */}
      {step === 4 && (
        <form onSubmit={handleConfirmBooking} className="space-y-4 animate-fadeIn">
          <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase tracking-wider">
            4. Tus Datos para Confirmación Inmediata
          </label>

          <div className="bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-industrial-400 block">{selectedService?.name}</span>
              <span className="text-slate-900 dark:text-white font-bold">{selectedBarber?.name}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-slate-900 dark:text-gold-400 font-bold block">{selectedDate} — {selectedTime} hrs</span>
              <span className="text-slate-900 dark:text-white font-mono font-bold">${Number(selectedService?.price).toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 dark:text-industrial-400 uppercase mb-1">Nombre Completo *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
              <input
                type="text"
                required
                placeholder="Ej. Roberto Morales"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-industrial-400 uppercase font-semibold">
                  WhatsApp / Celular *
                </label>
                <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono font-medium">
                  🇨🇴 322... o 57322...
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-slate-500 dark:text-industrial-400 flex items-center gap-1 select-none pointer-events-none">
                  🇨🇴 +57
                </span>
                <input
                  type="tel"
                  required
                  placeholder="322 546 6673"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-20 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-industrial-400 uppercase mb-1">Email (Opcional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
                <input
                  type="email"
                  placeholder="roberto@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 dark:text-industrial-400 uppercase mb-1">Instrucciones o Notas Especiales</label>
            <textarea
              rows="2"
              placeholder="Ej. Prefiero barba perfilada un poco más baja..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-gold-500"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-sm dark:from-gold-500 dark:to-amber-500 dark:text-noir-950 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Confirmando Turno...' : 'Confirmar Reserva Ahora'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

