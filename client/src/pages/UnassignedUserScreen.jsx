import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { initSocket } from '../services/socket';
import { showSuccessAlert, showErrorAlert } from '../lib/swal';
import {
  ShieldAlert,
  Building2,
  Clock,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Mail,
  User,
  Radio,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';

export const UnassignedUserScreen = () => {
  const { currentUser, logout, applyUserAssignment } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [checking, setChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState('Ahora mismo');
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Contador de tiempo de espera en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsWaiting(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatWaitingTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Función para comprobar estado de asignación
  const checkStatusSilently = async (showToast = false) => {
    if (!currentUser?.uid || isUnlocked) return;
    try {
      if (showToast) setChecking(true);
      const res = await api.getUserStatus(currentUser.uid);
      setLastCheckTime(new Date().toLocaleTimeString());

      if (res.success && res.assigned && res.user?.companyId) {
        setIsUnlocked(true);
        await showSuccessAlert(
          '¡Acceso Autorizado!',
          `El Super Administrador te ha asignado a "${res.user.companyName || 'tu barbería'}". Ingresando al sistema...`
        );
        applyUserAssignment(res.user);
        return true;
      } else if (showToast) {
        // Si el usuario presionó el botón manualmente y aún no está asignado
        await showSuccessAlert(
          'En espera de Aprobación',
          'Tu cuenta sigue en cola de espera. El Super Administrador aún no ha confirmado tu asignación.'
        );
      }
    } catch (err) {
      console.warn('Error al verificar asignación:', err.message);
      if (showToast) {
        await showErrorAlert('Comprobación de Estado', 'No se pudo contactar al servidor: ' + err.message);
      }
    } finally {
      if (showToast) setChecking(false);
    }
    return false;
  };

  // 1. Escuchar evento en tiempo real por WebSockets (Socket.io)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const socket = initSocket('nodriza-global');

    const handleUserAssignedLive = async (data) => {
      if (!data || isUnlocked) return;
      const cleanMyEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
      const cleanAssignedEmail = data.email ? data.email.toLowerCase().trim() : '';
      const isMe = data.uid === currentUser.uid || (cleanMyEmail && cleanMyEmail === cleanAssignedEmail);

      if (isMe && data.companyId) {
        console.log('⚡ [UnassignedUserScreen] Asignación recibida en vivo vía Socket:', data);
        setIsUnlocked(true);
        await showSuccessAlert(
          '¡Acceso Autorizado en Vivo!',
          `El Super Administrador te ha asignado a "${data.companyName || 'tu barbería'}". Abriendo tu panel...`
        );
        applyUserAssignment(data);
      }
    };

    socket.on('user:assigned', handleUserAssignedLive);

    return () => {
      socket.off('user:assigned', handleUserAssignedLive);
    };
  }, [currentUser, isUnlocked, applyUserAssignment]);

  // 2. Heartbeat de sondeo automático cada 3.5 segundos (Fallback infalible de red)
  useEffect(() => {
    if (isUnlocked) return;
    const interval = setInterval(() => {
      checkStatusSilently(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [currentUser?.uid, isUnlocked]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-noir-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-gold-500 selection:text-black transition-colors duration-200">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 dark:border-industrial-800 bg-white/90 dark:bg-noir-900/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-base shadow-glow-gold">
            BP
          </div>
          <div>
            <h1 className="font-display font-bold text-sm tracking-wide text-slate-900 dark:text-white">
              BarberPulse OS
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-industrial-400 font-mono">
              Plataforma Multi-Tenant SaaS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Indicador En Vivo */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>EN VIVO</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 transition-colors shadow-sm"
            title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Quarantine Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Badge & Live Pulse */}
          <div className="flex items-center justify-between mb-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 dark:bg-gold-500/15 border border-amber-500/30 dark:border-gold-500/30 flex items-center justify-center text-amber-600 dark:text-gold-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/30 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                Validación en Vivo
              </span>
              <span className="text-[10px] text-slate-400 dark:text-industrial-400 font-mono mt-1">
                Tiempo en espera: <strong className="text-slate-700 dark:text-slate-200">{formatWaitingTimer(secondsWaiting)}</strong>
              </span>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-black text-slate-900 dark:text-white leading-tight">
            Esperando Acceso del Super Administrador
          </h2>

          <p className="text-xs md:text-sm text-slate-600 dark:text-industrial-400 mt-2 leading-relaxed">
            Tu cuenta ha sido creada exitosamente. Para mantener la seguridad y el aislamiento estricto de las barberías, el <strong>Super Administrador</strong> debe asignarte a tu negocio correspondiente.
          </p>

          {/* Live Message Box (Mensaje en Vivo) */}
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-gold-500/10 to-amber-500/5 dark:from-gold-500/15 dark:via-noir-950 dark:to-gold-500/5 border border-amber-500/30 dark:border-gold-500/30 relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 dark:bg-gold-500/20 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-gold-400 mt-0.5">
                <Zap className="w-4 h-4 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold font-display uppercase tracking-wider text-amber-700 dark:text-gold-300 flex items-center gap-1.5">
                  <span>Mensaje en Vivo de la Plataforma</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-xs text-slate-700 dark:text-industrial-300 leading-relaxed font-sans">
                  <strong>No necesitas recargar la página.</strong> Tu pantalla está sincronizada en tiempo real mediante WebSockets con la Casa Nodriza. En el instante exacto en que el Super Administrador confirme tu asignación, tu panel se desbloqueará automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Stepper de Proceso */}
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>1. Cuenta registrada y verificada con Google / Firebase</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-gold-300 font-semibold animate-pulse">
              <Radio className="w-4 h-4 flex-shrink-0 text-amber-500 dark:text-gold-400" />
              <span>2. En cola de espera para asignación de barbería (Escuchando en vivo...)</span>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-xs text-slate-400 dark:text-industrial-500">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>3. Desbloqueo y apertura de tu espacio de trabajo (Automático)</span>
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser?.name}
                className="w-10 h-10 rounded-full border border-gold-500/40 object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {currentUser?.name || 'Usuario'}
                </div>
                <div className="text-xs text-slate-500 dark:text-industrial-400 font-mono truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{currentUser?.email}</span>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-industrial-800 text-[10px] font-mono text-slate-600 dark:text-industrial-300">
                Rol: Pendiente
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => checkStatusSilently(true)}
              disabled={checking}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Comprobando en vivo...' : 'Comprobar Estado Ahora'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-noir-950 hover:bg-slate-200 dark:hover:bg-noir-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors border border-slate-200 dark:border-industrial-800 cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Live Ping Footer */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-industrial-900 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-industrial-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronización continua de red
            </span>
            <span>Último sondeo: {lastCheckTime}</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-industrial-500 font-mono">
        BarberPulse OS • Sala de Espera Activa • Aislamiento Estricto Multi-Tenant
      </footer>
    </div>
  );
};
