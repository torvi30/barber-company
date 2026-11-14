import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { Scissors, Lock, CheckCircle2, AlertCircle, ArrowLeft, Delete, KeyRound } from 'lucide-react';

export const BarberPinModal = ({
  isOpen,
  onClose,
  tenantId,
  slug = '',
  barbers = [],
  onLoginSuccess
}) => {
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Limpiar estado y detectar preselección de barbero por URL (?b=... o ?barberId=...)
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setIsSuccess(false);

      const p = new URLSearchParams(window.location.search);
      const targetBarberId = p.get('b') || p.get('barberId') || p.get('barber');

      if (targetBarberId && barbers && barbers.length > 0) {
        const found = barbers.find(
          b => String(b.id) === String(targetBarberId) ||
               b.name?.toLowerCase() === targetBarberId?.toLowerCase()
        );
        if (found) {
          setSelectedBarber(found);
          return;
        }
      }

      if (barbers.length === 1) {
        setSelectedBarber(barbers[0]);
      }
    }
  }, [isOpen, barbers]);

  // Manejo de teclado físico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedBarber, pin, loading]);

  const handleDigit = (digit) => {
    if (loading || isSuccess || !selectedBarber) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading || isSuccess) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (loading || isSuccess) return;
    setPin('');
    setErrorMsg(null);
  };

  const submitPin = async (fullPin) => {
    if (!selectedBarber) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      let res;
      if (tenantId) {
        res = await api.verifyBarberPin(tenantId, selectedBarber.id, fullPin);
      } else {
        res = await api.barberPinLogin(slug, selectedBarber.id, fullPin);
      }

      if (res && res.success) {
        setIsSuccess(true);
        const sessionData = {
          ...res.data,
          pin: String(fullPin).trim(),
          loginTimestamp: Date.now()
        };
        localStorage.setItem('barberpulse_barber_session', JSON.stringify(sessionData));

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(sessionData);
          }
          onClose();
        }, 600);
      } else {
        setErrorMsg(res?.error || 'PIN incorrecto. Intenta nuevamente.');
        setPin('');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'PIN incorrecto. Consulta con administración.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-md"
    >
      <div className="space-y-5 animate-fadeIn">
        {/* Cabecera del Modal */}
        <div className="text-center pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-gold-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Scissors className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display font-black text-slate-900 dark:text-white">
            Acceso al Sillón del Barbero
          </h3>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">
            Ingresa tu PIN personal de 4 dígitos para ver tus turnos y metas
          </p>
        </div>

        {/* PASO 1: Selección de Barbero si aún no se ha escogido */}
        {!selectedBarber ? (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-industrial-300 block">
              1. Selecciona tu perfil de especialista:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedBarber(b);
                    setPin('');
                    setErrorMsg(null);
                  }}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-industrial-800 bg-slate-50 dark:bg-noir-950 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center gap-3 text-left cursor-pointer group"
                >
                  <img
                    src={b.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80'}
                    alt={b.name}
                    className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 group-hover:scale-105 transition-transform flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono">
                      Sillón Activo
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* PASO 2: Ingreso de PIN con Teclado Numérico */
          <div className="space-y-4">
            {/* Tarjeta de Barbero Seleccionado */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBarber.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80'}
                  alt={selectedBarber.name}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-amber-500 shadow-sm flex-shrink-0"
                />
                <div>
                  <span className="text-[10px] uppercase font-mono font-semibold text-amber-600 dark:text-gold-400 block">
                    Barbero en Turno
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedBarber.name}
                  </h4>
                </div>
              </div>

              {barbers.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBarber(null);
                    setPin('');
                    setErrorMsg(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white underline font-medium cursor-pointer"
                >
                  Cambiar
                </button>
              )}
            </div>

            {/* Puntos Indicadores del PIN */}
            <div className="py-2 text-center">
              <div className="flex items-center justify-center gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        isSuccess
                          ? 'bg-emerald-500 scale-110 shadow-glow-emerald'
                          : filled
                          ? 'bg-amber-500 scale-125 shadow-sm'
                          : 'border-2 border-slate-300 dark:border-industrial-700 bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Mensajes de feedback */}
              <div className="min-h-[22px] mt-2.5">
                {loading && (
                  <span className="text-xs font-mono text-amber-600 dark:text-gold-400 animate-pulse flex items-center justify-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Verificando PIN de seguridad...
                  </span>
                )}
                {isSuccess && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    ¡PIN correcto! Abriendo tu sillón...
                  </span>
                )}
                {errorMsg && !loading && !isSuccess && (
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 animate-shake">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorMsg}
                  </span>
                )}
                {!loading && !isSuccess && !errorMsg && (
                  <span className="text-[11px] text-slate-400 dark:text-industrial-500 font-mono">
                    Digita tus 4 dígitos en el teclado
                  </span>
                )}
              </div>
            </div>

            {/* Teclado Numérico Táctil Responsivo */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading || isSuccess}
                  onClick={() => handleDigit(digit)}
                  className="h-13 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white font-mono font-bold text-xl hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer select-none"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                disabled={loading || isSuccess || pin.length === 0}
                onClick={handleClear}
                className="h-13 rounded-2xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 font-mono font-bold text-xs hover:bg-slate-200 dark:hover:bg-industrial-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none disabled:opacity-30"
              >
                BORRAR
              </button>

              <button
                type="button"
                disabled={loading || isSuccess}
                onClick={() => handleDigit('0')}
                className="h-13 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white font-mono font-bold text-xl hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer select-none"
              >
                0
              </button>

              <button
                type="button"
                disabled={loading || isSuccess || pin.length === 0}
                onClick={handleBackspace}
                className="h-13 rounded-2xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 font-mono font-bold text-sm hover:bg-slate-200 dark:hover:bg-industrial-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none disabled:opacity-30"
                title="Retroceso"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Nota de Seguridad Blindada */}
        <div className="pt-2 border-t border-slate-100 dark:border-industrial-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-industrial-400">
          <span className="flex items-center gap-1 font-mono">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            Acceso seguro & aislado
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BarberPinModal;

