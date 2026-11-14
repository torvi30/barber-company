import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
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

export const PublicBookingWizard = ({ slug, initialBarbershop = null, onBookingComplete }) => {
  const effectiveSlug = (slug && String(slug).trim()) ? String(slug).trim() : (initialBarbershop?.slug || initialBarbershop?.id || 'black-gold');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!initialBarbershop);
  const [error, setError] = useState('');
  const [barbershop, setBarbershop] = useState(initialBarbershop);
  const [selectedService, setSelectedService] = useState(initialBarbershop?.services?.[0] || null);
  const [selectedBarber, setSelectedBarber] = useState(initialBarbershop?.barbers?.[0] || null);
  const [selectedDate, setSelectedDate] = useState(getDefaultBookingDate());
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [enableTestSlots, setEnableTestSlots] = useState(false);

  const todayStr = getLocalDate(new Date());
  const tomorrowStr = getLocalDate(new Date(Date.now() + 86400000));
  const dayAfterStr = getLocalDate(new Date(Date.now() + 86400000 * 2));

  // Client info form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Submit & Collision state
  const [submitting, setSubmitting] = useState(false);
  const [collisionError, setCollisionError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [returnCountdown, setReturnCountdown] = useState(15);

  const handleResetToHome = () => {
    setConfirmedBooking(null);
    setStep(1);
    setSelectedTime(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setCollisionError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Temporizador para volver al inicio automáticamente tras reserva exitosa
  useEffect(() => {
    if (!confirmedBooking) {
      setReturnCountdown(15);
      return;
    }

    const interval = setInterval(() => {
      setReturnCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleResetToHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [confirmedBooking]);

  // Cargar datos de la barbería por slug
  useEffect(() => {
    let isMounted = true;
    const loadBarbershop = async () => {
      try {
        if (!barbershop) setLoading(true);
        setError('');
        const res = await api.getPublicBarbershop(effectiveSlug);
        if (!isMounted) return;
        if (res.success && res.data) {
          setBarbershop(res.data);
          if (res.data.services?.length > 0) {
            setSelectedService(prev => prev || res.data.services[0]);
          }
          if (res.data.barbers?.length > 0) {
            setSelectedBarber(prev => prev || res.data.barbers[0]);
          }
        } else {
          throw new Error(res.message || 'Error al conectar con la barbería');
        }
      } catch (err) {
        console.error('Error al cargar barbería pública:', err);
        if (!isMounted) return;
        if (effectiveSlug !== 'black-gold') {
          try {
            const fallbackRes = await api.getPublicBarbershop('black-gold');
            if (!isMounted) return;
            if (fallbackRes.success && fallbackRes.data) {
              setBarbershop(fallbackRes.data);
              if (fallbackRes.data.services?.length > 0) setSelectedService(prev => prev || fallbackRes.data.services[0]);
              if (fallbackRes.data.barbers?.length > 0) setSelectedBarber(prev => prev || fallbackRes.data.barbers[0]);
              return;
            }
          } catch (e) {
            console.warn('Fallback error:', e);
          }
        }
        if (!barbershop) {
          setError(err.message || 'No fue posible conectar con la barbería.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBarbershop();
    return () => { isMounted = false; };
  }, [effectiveSlug]);

  // Cargar slots cuando cambie el barbero o la fecha
  useEffect(() => {
    if (!selectedBarber || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedTime(null);
        setCollisionError('');
        const res = await api.getPublicSlots(effectiveSlug, selectedBarber.id, selectedDate, enableTestSlots);
        if (res.success) {
          setSlots(res.slots || []);
        }
      } catch (err) {
        console.error('Error al cargar slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [effectiveSlug, selectedBarber, selectedDate, enableTestSlots]);

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedBarber || !selectedService || !selectedTime || !clientName || !clientPhone) {
      return;
    }

    try {
      setSubmitting(true);
      setCollisionError('');

      const payload = {
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        serviceName: selectedService.name,
        durationMinutes: selectedService.durationMinutes,
        price: selectedService.price,
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone,
        clientEmail,
        notes
      };

      const res = await api.createPublicBooking(effectiveSlug, payload);
      if (res.success) {
        setConfirmedBooking(res.data);
        if (onBookingComplete) onBookingComplete(res.data);
      }
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
    return (
      <div className="bg-noir-900 border border-gold-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-3 pb-6 border-b border-industrial-800">
          <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-gold-400">
            Reserva Confirmada & Registrada
          </span>
          <h3 className="text-2xl font-display font-bold text-white">
            ¡Nos vemos pronto, {confirmedBooking.clientName.split(' ')[0]}!
          </h3>
          <p className="text-xs text-industrial-400 max-w-sm mx-auto">
            Tu barbero ya fue notificado en su pantalla en vivo. No es necesario realizar pago previo.
          </p>
        </div>

        {/* Boarding Pass Ticket */}
        <div className="mt-6 bg-noir-950 border border-industrial-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-start pb-4 border-b border-industrial-800/80">
            <div>
              <span className="text-[10px] text-industrial-500 uppercase tracking-wider block">Establecimiento</span>
              <span className="text-sm font-bold text-white">{barbershop.name}</span>
              <span className="text-xs text-industrial-400 block">{barbershop.address}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-industrial-500 uppercase tracking-wider block">Código Ticket</span>
              <span className="text-xs font-mono font-bold text-gold-400">{confirmedBooking.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-industrial-500 block">Servicio:</span>
              <span className="font-semibold text-white">{confirmedBooking.serviceName}</span>
            </div>
            <div>
              <span className="text-industrial-500 block">Master Barbero:</span>
              <span className="font-semibold text-gold-400">{confirmedBooking.barberName}</span>
            </div>
            <div>
              <span className="text-industrial-500 block">Fecha Programada:</span>
              <span className="font-semibold text-white font-mono">{confirmedBooking.date}</span>
            </div>
            <div>
              <span className="text-industrial-500 block">Horario de Inicio:</span>
              <span className="font-bold text-emerald-400 text-sm font-mono">{confirmedBooking.time} hrs</span>
            </div>
          </div>

          <div className="pt-3 border-t border-industrial-800/80 flex items-center justify-between text-xs">
            <span className="text-industrial-400">Total a abonar en tienda:</span>
            <span className="text-lg font-bold font-mono text-white">${Number(confirmedBooking.price).toFixed(2)}</span>
          </div>
        </div>

        {/* Botón directo de WhatsApp para el cliente */}
        {(() => {
          const rawPhone = (barbershop.whatsapp || barbershop.phone || '573004567890').replace(/[^\d]/g, '');
          const cleanPhone = rawPhone.length === 10 && rawPhone.startsWith('3') ? `57${rawPhone}` : rawPhone;
          const msg = encodeURIComponent(
            `Hola ${barbershop.name} 💈 Acabo de reservar mi turno desde su web.\n\n` +
            `• Cliente: ${confirmedBooking.clientName}\n` +
            `• Servicio: ${confirmedBooking.serviceName}\n` +
            `• Barbero: ${confirmedBooking.barberName}\n` +
            `• Fecha y Hora: ${confirmedBooking.date} a las ${confirmedBooking.time} hrs\n` +
            `• Ticket: #${confirmedBooking.id}\n\n` +
            `¿Me confirman si recibieron mi reserva? ¡Muchas gracias!`
          );
          const waLink = `https://wa.me/${cleanPhone}?text=${msg}`;

          return (
            <div className="mt-5 space-y-2.5">
              {/* Temporizador automático de retorno */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-noir-950/90 border border-industrial-800 text-[11px] text-industrial-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-gold-400 animate-pulse" />
                  Regresando al inicio en <strong className="text-white">{returnCountdown}s</strong>
                </span>
                <button
                  type="button"
                  onClick={handleResetToHome}
                  className="text-gold-400 hover:text-white font-bold text-xs underline cursor-pointer"
                >
                  Volver Ya
                </button>
              </div>

              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-noir-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Enviar Comprobante por WhatsApp a la Barbería</span>
              </a>

              <button
                type="button"
                onClick={handleResetToHome}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-gold hover:scale-[1.01] transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Volver al Inicio / Hacer Otra Reserva</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-xl bg-noir-800 hover:bg-noir-700 text-industrial-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recargar Página Principal</span>
              </button>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-industrial-800 mb-6">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-gold-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Agendamiento Inteligente
          </span>
          <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mt-1">
            Reserva tu Cita en {barbershop.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
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
        <div className="space-y-4 animate-fadeIn">
          <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase tracking-wider">
            1. Selecciona el Servicio Deseado
          </label>

          <div className="grid grid-cols-1 gap-3">
            {barbershop.services.map((srv) => {
              const isSelected = selectedService?.id === srv.id;
              return (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-gold-500/15 border-amber-500 dark:border-gold-500 shadow-sm dark:shadow-glow-gold'
                      : 'bg-slate-50 dark:bg-noir-950 border-slate-200 dark:border-industrial-800 hover:border-amber-400 dark:hover:border-industrial-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-gold-500 text-noir-950' : 'bg-slate-200 dark:bg-noir-800 text-amber-600 dark:text-gold-400'}`}>
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{srv.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">{srv.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-white">${Number(srv.price).toLocaleString('es-CO')}</div>
                      <div className="text-[11px] text-slate-400 dark:text-industrial-500 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" /> {srv.durationMinutes} min
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedService}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all disabled:opacity-50"
            >
              Continuar a Barbero
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
            {barbershop.barbers.map((barber) => {
              const isSelected = selectedBarber?.id === barber.id;
              return (
                <div
                  key={barber.id}
                  onClick={() => setSelectedBarber(barber)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-gold-500/15 border-amber-500 dark:border-gold-500 shadow-sm dark:shadow-glow-gold'
                      : 'bg-slate-50 dark:bg-noir-950 border-slate-200 dark:border-industrial-800 hover:border-amber-400 dark:hover:border-industrial-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={barber.avatar}
                      alt={barber.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-industrial-700"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{barber.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${barber.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                        <span className="text-[11px] text-slate-500 dark:text-industrial-400">
                          {barber.status === 'AVAILABLE' ? 'Disponible' : 'En sillón'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-500 dark:border-gold-500 bg-amber-500 dark:bg-gold-500 text-noir-950' : 'border-slate-300 dark:border-industrial-700'}`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedBarber}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all"
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
            <div className="text-xs font-mono text-amber-600 dark:text-gold-400 font-bold flex items-center gap-1.5">
              <span>Barbero: {selectedBarber?.name}</span>
            </div>
          </div>

          {/* Selector Rápido de Días (Hoy, Mañana, Pasado Mañana + Calendario) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-noir-950 rounded-2xl border border-slate-200 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => { setSelectedDate(todayStr); setEnableTestSlots(false); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-gold-500 text-noir-950 font-bold shadow-sm'
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
                  ? 'bg-gold-500 text-noir-950 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mañana ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)})
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDate(dayAfterStr); setEnableTestSlots(false); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedDate === dayAfterStr
                  ? 'bg-gold-500 text-noir-950 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pasado Mañana
            </button>
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setEnableTestSlots(false); }}
              className="bg-white dark:bg-noir-900 border border-slate-300 dark:border-industrial-800 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 font-mono"
            />
          </div>

          {loadingSlots ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-industrial-500 font-mono animate-pulse">
              Consultando turnos libres de {selectedBarber?.name}...
            </div>
          ) : (() => {
            const freeSlots = slots.filter(s => s.available);
            if (freeSlots.length === 0) {
              return (
                <div className="py-8 text-center p-6 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-2xl space-y-3">
                  <Clock className="w-8 h-8 text-amber-500 dark:text-gold-400 mx-auto opacity-70" />
                  <h4 className="text-slate-900 dark:text-white text-sm font-bold">
                    {selectedDate === todayStr ? 'El salón ya finalizó su jornada por hoy' : 'Sin citas disponibles para esta fecha'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-industrial-400 max-w-sm mx-auto">
                    {selectedDate === todayStr
                      ? `Las citas para hoy (${selectedDate}) han concluido (horario de atención hasta las 20:00). Reserva con ${selectedBarber?.name} para mañana a primera hora.`
                      : `${selectedBarber?.name} no tiene horarios libres para el ${selectedDate}. Por favor selecciona otro día en el calendario o elige otro barbero.`}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(tomorrowStr)}
                      className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all cursor-pointer"
                    >
                      Ver Horarios de Mañana ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)}) →
                    </button>
                    {selectedDate === todayStr && !enableTestSlots && (
                      <button
                        type="button"
                        onClick={() => setEnableTestSlots(true)}
                        className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-600 dark:text-gold-400 text-xs hover:bg-amber-500/10 transition-colors cursor-pointer"
                      >
                        ⚡ Habilitar turnos para ensayo hoy
                      </button>
                    )}
                  </div>
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
                        className={`py-3 px-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
                          isSelected
                            ? 'bg-gold-500 text-noir-950 border border-gold-400 shadow-glow-gold scale-105'
                            : 'bg-slate-50 dark:bg-noir-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-industrial-800 hover:border-gold-500 hover:text-amber-700 dark:hover:text-gold-300'
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
                    <span className="text-amber-600 dark:text-gold-400 font-bold">
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
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!selectedTime}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all disabled:opacity-50"
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

          <div className="bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-industrial-400 block">{selectedService?.name}</span>
              <span className="text-slate-900 dark:text-white font-bold">{selectedBarber?.name}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-amber-600 dark:text-gold-400 font-bold block">{selectedDate} — {selectedTime} hrs</span>
              <span className="text-slate-900 dark:text-white font-mono font-bold">${selectedService?.price}</span>
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
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 dark:text-industrial-400 uppercase mb-1">WhatsApp / Móvil *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
                <input
                  type="tel"
                  required
                  placeholder="+34 600 000 000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 font-mono"
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
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
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
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-industrial-400 hover:text-white text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs shadow-glow-gold hover:opacity-95 transition-opacity disabled:opacity-50"
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

