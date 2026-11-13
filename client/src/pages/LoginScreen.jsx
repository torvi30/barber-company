import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Mail,
  Lock,
  ArrowRight,
  UserPlus,
  LogIn,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

function getFriendlyFirebaseErrorMessage(errorMsg = '') {
  if (errorMsg.includes('auth/popup-closed-by-user')) {
    return 'La ventana de inicio de sesión con Google fue cerrada antes de completar la verificación.';
  }
  if (errorMsg.includes('auth/unauthorized-domain')) {
    return 'Este dominio (localhost) no está autorizado en la Consola de Firebase. Ve a Firebase Console > Authentication > Settings > Authorized domains y agrégalo.';
  }
  if (errorMsg.includes('auth/operation-not-allowed')) {
    return 'Este método de acceso no está habilitado en Firebase. Ve a Authentication > Sign-in method y habilítalo.';
  }
  if (
    errorMsg.includes('auth/user-not-found') ||
    errorMsg.includes('auth/wrong-password') ||
    errorMsg.includes('auth/invalid-credential')
  ) {
    return 'Correo o contraseña incorrectos. Por favor verifica tus credenciales o crea una cuenta.';
  }
  if (errorMsg.includes('auth/email-already-in-use')) {
    return 'Ya existe una cuenta registrada con este correo electrónico. Por favor inicia sesión.';
  }
  if (errorMsg.includes('auth/weak-password')) {
    return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
  }
  if (errorMsg.includes('auth/invalid-email')) {
    return 'Por favor ingresa una dirección de correo válida.';
  }
  return errorMsg;
}

export const LoginScreen = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, isLoading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manejar Login con Google (Gmail)
  const handleGoogleLogin = async () => {
    setError(null);
    setResetSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Error Google Sign-In:', err);
      setError(getFriendlyFirebaseErrorMessage(err.message || 'Error al iniciar sesión con Google'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar Formulario de Correo/Contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMessage(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Por favor ingresa tu correo electrónico para enviarte el enlace de recuperación.');
        return;
      }
      setIsSubmitting(true);
      try {
        await resetPassword(email.trim());
        setResetSuccessMessage(`Enlace de restablecimiento enviado a ${email.trim()}. Revisa tu bandeja de entrada o spam.`);
      } catch (err) {
        setError(getFriendlyFirebaseErrorMessage(err.message));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Por favor completa tanto el correo como la contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Por favor ingresa tu nombre completo.');
          setIsSubmitting(false);
          return;
        }
        await registerWithEmail(email.trim(), password, displayName.trim());
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(getFriendlyFirebaseErrorMessage(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-noir-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 relative overflow-hidden transition-colors duration-200">
      {/* Botón de Modo Claro / Modo Oscuro en la esquina */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 transition-colors shadow-sm"
          title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto my-auto relative z-10 animate-fadeIn">
        {/* Logo & Marca */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-600 to-gold-400 text-noir-950 font-display font-black text-xl shadow-glow-gold mb-3">
            BP
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 dark:text-white">
            BarberPulse OS
          </h1>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-1 font-mono">
            Plataforma Multi-Tenant • Portal de Acceso
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="bg-white/95 dark:bg-noir-900/90 backdrop-blur-xl border border-slate-200 dark:border-industrial-800/80 rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl">
          {/* Selector de Pestaña: Iniciar Sesión / Crear Cuenta */}
          {mode !== 'forgot' && (
            <div className="flex rounded-2xl bg-slate-100 dark:bg-noir-950 p-1 mb-6 border border-slate-200 dark:border-industrial-800">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setResetSuccessMessage(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold font-bold'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setResetSuccessMessage(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold font-bold'
                    : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Crear Cuenta</span>
              </button>
            </div>
          )}

          {/* Título de la acción */}
          <div className="mb-4 text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {mode === 'signin'
                ? '¡Bienvenido de vuelta!'
                : mode === 'signup'
                ? 'Registrarse en la Plataforma'
                : 'Restablecer Contraseña'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">
              {mode === 'signin'
                ? 'Ingresa con tu cuenta de Google o con correo'
                : mode === 'signup'
                ? 'Crea tu usuario; podrás ser asignado a tu barbería'
                : 'Ingresa tu correo registrado para recibir el enlace'}
            </p>
          </div>

          {/* Alertas de Error o Éxito */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{resetSuccessMessage}</div>
            </div>
          )}

          {/* Botón Principal: Continuar con Google */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-noir-950 dark:hover:bg-noir-800 border border-slate-300 dark:border-industrial-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-sm"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5 12 5z" />
                  <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.7 3.2-8.1z" />
                  <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.3-1.4-.3-2.1s.1-1.4.3-2.1V7.1H2.2C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8C4 20.5 7.7 23 12 23z" />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-industrial-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white dark:bg-noir-900 px-2 text-slate-400 dark:text-industrial-500 font-mono">
                    O con correo electrónico
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-industrial-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="ej. Daniel Buitrago"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500/60"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-industrial-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
                <input
                  type="email"
                  placeholder="ejemplo@barberia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500/60"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-industrial-300">
                    Contraseña
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setResetSuccessMessage(null); }}
                      className="text-[10px] text-amber-600 dark:text-gold-400 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500/60"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <span>Procesando...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Registrar Cuenta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enviar Enlace de Recuperación</span>
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setResetSuccessMessage(null); }}
                className="w-full py-2 text-xs text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al inicio de sesión</span>
              </button>
            )}
          </form>
        </div>

        {/* Nota Multi-Tenant */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400 dark:text-industrial-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acceso seguro protegido por Firebase & Aislamiento Multi-Tenant</span>
          </p>
        </div>
      </div>

      <footer className="py-2 text-center text-[10px] text-slate-400 dark:text-industrial-600 font-mono">
        BarberPulse OS • 2026
      </footer>
    </div>
  );
};
