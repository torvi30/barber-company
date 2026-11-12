import React, { useState } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Modal } from './Modal';
import {
  Store,
  Bell,
  Volume2,
  ChevronDown,
  CheckCircle2,
  X,
  Crown,
  MapPin,
  Sun,
  Moon,
  Settings,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Sliders,
  Check
} from 'lucide-react';

export const Navbar = ({ onOpenOnboarding, onOpenSuperAdmin }) => {
  const {
    tenantId,
    barbershopInfo,
    availableTenants,
    switchTenant,
    socketConnected,
    toastNotification,
    clearToast,
    playBarberChime,
    toggleStoreModule
  } = useBarbershop();

  const { currentUser, toggleSuperAdmin, isSuperAdmin, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);

  const isStoreEnabled = barbershopInfo?.storeEnabled !== false;

  const handleToggleStore = async () => {
    try {
      setIsUpdatingStore(true);
      const nextState = !isStoreEnabled;
      await toggleStoreModule(nextState);
      setSettingsFeedback({
        type: 'success',
        text: nextState
          ? '¡Tienda Boutique activada! Tu catálogo ya es visible en la web pública.'
          : 'Tienda Boutique desactivada. Tu web ahora está 100% enfocada solo en reservas.'
      });
      setTimeout(() => setSettingsFeedback(null), 4000);
    } catch (err) {
      setSettingsFeedback({
        type: 'error',
        text: 'Error al actualizar configuración: ' + (err.message || 'Inténtalo de nuevo')
      });
    } finally {
      setIsUpdatingStore(false);
    }
  };

  const statusColors = {
    active:   'bg-emerald-400',
    trial:    'bg-sky-400',
    past_due: 'bg-rose-500',
    canceled: 'bg-industrial-600'
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-industrial-800 bg-white/90 dark:bg-noir-900/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo */}
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-sm md:text-lg shadow-glow-gold flex-shrink-0">
              BP
            </div>

            {/* Selector de Sucursal con Aislamiento Estricto */}
            <div className="relative min-w-0">
              {isSuperAdmin ? (
                <button
                  onClick={() => setShowTenantMenu(!showTenantMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950/80 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 transition-colors text-left max-w-[200px] sm:max-w-none shadow-sm"
                >
                  <div className="min-w-0">
                    <h1 className="font-display font-bold text-slate-900 dark:text-white text-xs tracking-wide flex items-center gap-1.5 truncate">
                      <span className="truncate">{barbershopInfo.name}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/30 flex-shrink-0 hidden sm:inline">
                        SA
                      </span>
                    </h1>
                    <p className="text-[10px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 dark:text-industrial-500 flex-shrink-0" />
                      <span className="truncate">{barbershopInfo.municipality || 'Rionegro'}</span>
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-industrial-400 flex-shrink-0 ml-0.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950/80 border border-slate-200 dark:border-industrial-800/80 text-left max-w-[220px] sm:max-w-none shadow-sm">
                  <div className="min-w-0">
                    <h1 className="font-display font-bold text-slate-900 dark:text-white text-xs tracking-wide flex items-center gap-1.5 truncate">
                      <span className="truncate">{barbershopInfo.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                        ADMIN
                      </span>
                    </h1>
                    <p className="text-[10px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 dark:text-industrial-500 flex-shrink-0" />
                      <span className="truncate">{barbershopInfo.municipality || 'Rionegro'} · {barbershopInfo.address}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Dropdown de sucursales (Solo visible para SuperAdmin) */}
              {isSuperAdmin && showTenantMenu && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-industrial-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-industrial-400 font-mono">
                      Mis Barberías
                    </span>
                    {onOpenOnboarding && (
                      <button
                        onClick={() => { setShowTenantMenu(false); onOpenOnboarding(); }}
                        className="text-[10px] font-bold text-amber-600 dark:text-gold-400 hover:text-amber-500 dark:hover:text-gold-300 font-mono"
                      >
                        + Registrar Barbería
                      </button>
                    )}
                  </div>

                  <div className="mt-1 space-y-1 max-h-64 overflow-y-auto">
                    {availableTenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { switchTenant(t); setShowTenantMenu(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          t.id === tenantId
                            ? 'bg-amber-500/15 dark:bg-gold-500/15 text-amber-800 dark:text-gold-300 font-bold border border-amber-500/30 dark:border-gold-500/30'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            {t.name}
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusColors[t.subscriptionStatus] || 'bg-industrial-600'}`} />
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-industrial-500 font-mono mt-0.5">
                            📍 {t.municipality} • {t.currency} • /{t.slug}
                          </div>
                        </div>
                        {t.id === tenantId && <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {onOpenSuperAdmin && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-industrial-800">
                      <button
                        onClick={() => { setShowTenantMenu(false); onOpenSuperAdmin(); }}
                        className="w-full text-center py-2 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 hover:bg-amber-500/20 dark:hover:bg-gold-500/20 text-amber-700 dark:text-gold-400 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Consola SuperAdmin (Casa Nodriza)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón de Ajustes & Módulos */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 transition-colors shadow-sm"
            title="Ajustes de Módulos (Tienda Boutique, etc.)"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Botón de Modo Claro / Modo Oscuro */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 transition-colors shadow-sm"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Socket Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-[11px] text-slate-600 dark:text-industrial-400 shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">En Línea</span>
          </div>

          {/* Menú de Usuario con Aislamiento y Logout */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 hover:opacity-90 transition-opacity"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-full border border-gold-500/40 object-cover"
              />
              <div className="hidden md:block text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                {currentUser?.name || 'Usuario'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-xs">
                <div className="p-2 border-b border-slate-100 dark:border-industrial-800">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-industrial-400 font-mono truncate">{currentUser?.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                      isSuperAdmin ? 'bg-amber-500/20 text-amber-700 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/30' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isSuperAdmin ? 'SUPERADMIN' : 'ADMINISTRADOR'}
                    </span>
                    {!isSuperAdmin && (
                      <span className="text-[10px] text-slate-500 dark:text-industrial-400 truncate max-w-[120px]">
                        {barbershopInfo.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acceso a Configuración de Módulos */}
                <button
                  onClick={() => { setShowUserMenu(false); setShowSettingsModal(true); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800 font-medium transition-colors mt-1 flex items-center gap-2"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                  <span>Ajustes & Módulos</span>
                </button>

                {isSuperAdmin && onOpenSuperAdmin && (
                  <button
                    onClick={() => { setShowUserMenu(false); onOpenSuperAdmin(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-amber-600 dark:text-gold-400 hover:bg-slate-100 dark:hover:bg-noir-800 font-medium transition-colors mt-1 flex items-center gap-2"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Consola SuperAdmin</span>
                  </button>
                )}

                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors mt-1 flex items-center gap-2 border-t border-slate-100 dark:border-industrial-800/60 pt-2"
                >
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Configuración de Negocio & Módulos */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Ajustes del Negocio & Módulos"
        subtitle={`Personaliza los módulos activos para ${barbershopInfo.name}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          {/* Tarjeta de Datos Básicos de la Sucursal */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                {barbershopInfo.name}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/30">
                  {barbershopInfo.slug}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-industrial-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 dark:text-industrial-500" />
                <span>{barbershopInfo.municipality} • {barbershopInfo.address}</span>
              </div>
            </div>

            <a
              href={`/?slug=${barbershopInfo.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 hover:bg-amber-500/20 dark:hover:bg-gold-500/20 text-amber-700 dark:text-gold-400 text-xs font-bold font-mono transition-colors flex items-center gap-1.5 flex-shrink-0"
              title="Abrir landing de clientes en pestaña nueva"
            >
              <span>Ver Web</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Feedback Alerta */}
          {settingsFeedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
              settingsFeedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}>
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{settingsFeedback.text}</span>
            </div>
          )}

          {/* Selector de Módulo: Tienda Boutique */}
          <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-2xl flex-shrink-0 transition-colors ${
                  isStoreEnabled
                    ? 'bg-amber-500/15 dark:bg-gold-500/15 text-amber-600 dark:text-gold-400 border border-amber-500/30 dark:border-gold-500/30'
                    : 'bg-slate-100 dark:bg-noir-800 text-slate-400 dark:text-industrial-500 border border-slate-200 dark:border-industrial-700'
                }`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Módulo: Tienda Boutique & Catálogo
                    </h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      isStoreEnabled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-industrial-800 text-slate-600 dark:text-industrial-400'
                    }`}>
                      {isStoreEnabled ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-industrial-400 mt-1 leading-relaxed">
                    Permite a tus clientes explorar y pedir ceras, aceites, champús y merchandising minorista directamente desde su móvil o la web pública.
                  </p>
                </div>
              </div>

              {/* Botón Switch iOS Style */}
              <button
                type="button"
                disabled={isUpdatingStore}
                onClick={handleToggleStore}
                className={`w-13 h-7 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none flex-shrink-0 ${
                  isStoreEnabled
                    ? 'bg-gradient-to-r from-amber-500 to-gold-400 dark:from-gold-500 dark:to-gold-300 shadow-glow-gold'
                    : 'bg-slate-300 dark:bg-industrial-700'
                } ${isUpdatingStore ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={isStoreEnabled ? 'Desactivar Tienda Boutique' : 'Activar Tienda Boutique'}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    isStoreEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Explicación del impacto en vivo */}
            <div className={`p-3 rounded-xl text-xs transition-colors border ${
              isStoreEnabled
                ? 'bg-amber-500/5 dark:bg-gold-500/5 border-amber-500/20 dark:border-gold-500/20 text-slate-700 dark:text-industrial-300'
                : 'bg-slate-100 dark:bg-noir-950 border-slate-200 dark:border-industrial-800 text-slate-500 dark:text-industrial-400'
            }`}>
              <div className="font-semibold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                <span>Impacto en la experiencia del cliente:</span>
              </div>
              {isStoreEnabled ? (
                <p>
                  En tu página pública se mostrará la pestaña <strong className="text-amber-700 dark:text-gold-300">[Tienda Boutique]</strong> junto a <strong className="text-amber-700 dark:text-gold-300">[Reservar Turno]</strong>, permitiendo venta cruzada de productos con pedidos vía WhatsApp o pasarela.
                </p>
              ) : (
                <p>
                  Tu página pública se simplifica al 100%: <strong>se ocultan todos los botones y pestañas de tienda</strong>, ofreciendo una experiencia minimalista orientada únicamente al agendamiento rápido de citas.
                </p>
              )}
            </div>
          </div>

          {/* Botón de Guardado / Cerrar */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-industrial-800">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all"
            >
              Listo / Entendido
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast de eventos en vivo */}
      {toastNotification && (
        <div className="fixed top-20 right-6 z-50 max-w-sm bg-noir-900 border border-gold-500/50 shadow-glow-gold rounded-2xl p-4 flex items-start gap-3 animate-fadeIn text-slate-100">
          <div className="p-2 rounded-xl bg-gold-500/20 text-gold-400 flex-shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-xs text-white">{toastNotification.title}</h5>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toastNotification.message}</p>
          </div>
          <button onClick={clearToast} className="text-industrial-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
