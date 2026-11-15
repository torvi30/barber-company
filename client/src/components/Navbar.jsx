import React, { useState } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SettingsModal } from './SettingsModal';
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
  Check,
  User,
  Scissors
} from 'lucide-react';

export const Navbar = ({ onOpenOnboarding, onOpenSuperAdmin, activeTab, onTabChange, onOpenSettings }) => {
  const {
    tenantId,
    barbershopInfo,
    availableTenants,
    switchTenant,
    socketConnected,
    toastNotification,
    clearToast,
    playBarberChime
  } = useBarbershop();

  const { currentUser, toggleSuperAdmin, isSuperAdmin, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [internalSettingsModal, setInternalSettingsModal] = useState(false);
  const [internalInitialTab, setInternalInitialTab] = useState('identity');

  const handleOpenSettings = (tab = 'identity') => {
    const validTab = (typeof tab === 'string' && ['profile', 'identity', 'modules'].includes(tab)) ? tab : 'identity';
    if (onOpenSettings) {
      onOpenSettings(validTab);
    } else {
      setInternalInitialTab(validTab);
      setInternalSettingsModal(true);
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
            {/* Logo de la Barbería con soporte personalizado y fallback elegante */}
            {barbershopInfo?.logoUrl ? (
              <button
                type="button"
                onClick={handleOpenSettings}
                className="relative group rounded-xl cursor-pointer focus:outline-none flex-shrink-0"
                title="Haga clic para cambiar o personalizar el logotipo de la empresa"
              >
                <img
                  src={barbershopInfo?.logoUrl}
                  alt={barbershopInfo?.name || 'Logo'}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-xl object-cover border border-amber-500/50 shadow-glow-gold flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-gold-500 rounded-full border-2 border-noir-950 flex items-center justify-center text-[7px] text-black font-black">
                  ✦
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-sm md:text-lg shadow-glow-gold flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
                title="Haga clic para subir el logotipo oficial de tu empresa"
              >
                {barbershopInfo?.name ? barbershopInfo.name.substring(0, 2).toUpperCase() : 'BP'}
              </button>
            )}

            {/* Selector de Sucursal con Aislamiento Estricto */}
            <div className="relative min-w-0">
              {isSuperAdmin ? (
                <button
                  onClick={() => setShowTenantMenu(!showTenantMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950/80 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 transition-colors text-left max-w-[220px] sm:max-w-none shadow-sm cursor-pointer"
                >
                  <div className="min-w-0">
                    <h1 className="font-display font-bold text-slate-900 dark:text-white text-xs tracking-wide flex items-center gap-1.5 truncate">
                      <span className="truncate">
                        {activeTab === 'superadmin' ? 'Casa Nodriza (Global)' : (barbershopInfo?.name || 'Seleccionar Barbería')}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/30 flex-shrink-0">
                        {activeTab === 'superadmin' ? 'SUPERADMIN' : 'SA'}
                      </span>
                    </h1>
                    <p className="text-[10px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 dark:text-industrial-500 flex-shrink-0" />
                      <span className="truncate">
                        {activeTab === 'superadmin' ? 'Nodo Central • Colombia' : (barbershopInfo?.municipality || 'Rionegro')}
                      </span>
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-industrial-400 flex-shrink-0 ml-0.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950/80 border border-slate-200 dark:border-industrial-800/80 text-left max-w-[220px] sm:max-w-none shadow-sm">
                  <div className="min-w-0">
                    <h1 className="font-display font-bold text-slate-900 dark:text-white text-xs tracking-wide flex items-center gap-1.5 truncate">
                      <span className="truncate">{barbershopInfo?.name || 'Mi Barbería'}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                        ADMIN
                      </span>
                    </h1>
                    <p className="text-[10px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 dark:text-industrial-500 flex-shrink-0" />
                      <span className="truncate">{barbershopInfo?.municipality || 'Rionegro'} · {barbershopInfo?.address || 'Antioquia'}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Dropdown de sucursales (Solo visible para SuperAdmin) */}
              {isSuperAdmin && showTenantMenu && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-industrial-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-industrial-400 font-mono">
                      Selector de Entorno
                    </span>
                    {onOpenOnboarding && (
                      <button
                        onClick={() => { setShowTenantMenu(false); onOpenOnboarding(); }}
                        className="text-[10px] font-bold text-amber-600 dark:text-gold-400 hover:text-amber-500 dark:hover:text-gold-300 font-mono cursor-pointer"
                      >
                        + Nueva Barbería
                      </button>
                    )}
                  </div>

                  {/* Opción rápida: Casa Nodriza (SuperAdmin Master) */}
                  <div className="py-1 border-b border-slate-100 dark:border-industrial-800">
                    <button
                      onClick={() => {
                        setShowTenantMenu(false);
                        if (onTabChange) onTabChange('superadmin');
                        else if (onOpenSuperAdmin) onOpenSuperAdmin();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        activeTab === 'superadmin'
                          ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 font-bold shadow-glow-gold'
                          : 'text-gold-400 hover:bg-gold-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        <div>
                          <div className="font-bold">Casa Nodriza (SuperAdmin)</div>
                          <div className={`text-[10px] font-mono ${activeTab === 'superadmin' ? 'text-noir-900' : 'text-industrial-400'}`}>
                            Control Global de todas las sedes
                          </div>
                        </div>
                      </div>
                      {activeTab === 'superadmin' && <Check className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase text-industrial-400">
                    Barberías Afiliadas ({availableTenants.length})
                  </div>

                  <div className="mt-1 space-y-1 max-h-56 overflow-y-auto">
                    {availableTenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          switchTenant(t);
                          if (onTabChange) onTabChange('reception');
                          setShowTenantMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          t.id === tenantId && activeTab !== 'superadmin'
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
                        {t.id === tenantId && activeTab !== 'superadmin' && <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />}
                      </button>
                    ))}
                    {availableTenants.length === 0 && (
                      <div className="px-3 py-3 text-center text-xs text-industrial-400">
                        No hay barberías registradas aún.
                      </div>
                    )}
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

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Cluster Ejecutivo Unificado de Herramientas (Theme + Settings) */}
          <div className="flex items-center p-0.5 sm:p-1 bg-slate-100 dark:bg-noir-950 rounded-2xl border border-slate-200 dark:border-industrial-800 shadow-xs">
            {/* Botón de Modo Claro / Modo Oscuro */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 hover:bg-white dark:hover:bg-noir-900 transition-all cursor-pointer"
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Separador sutil */}
            <span className="w-px h-4 bg-slate-200 dark:bg-industrial-800" />

            {/* Botón de Ajustes & Módulos */}
            <button
              type="button"
              onClick={() => handleOpenSettings('identity')}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 hover:bg-white dark:hover:bg-noir-900 transition-all cursor-pointer"
              title="Ajustes de Barbería, Logotipo y Módulos"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Menú de Usuario con Indicador de Conexión Live Integrado */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 hover:border-amber-500/40 transition-all cursor-pointer shadow-xs"
              title="Mi Cuenta & Sesión"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser?.name || 'Usuario'}
                  className="w-7 h-7 rounded-xl object-cover border border-amber-500/40"
                />
                {/* Live Socket Dot integrado */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-noir-950 ${
                    socketConnected ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  title={socketConnected ? 'En línea' : 'Desconectado'}
                />
              </div>

              <div className="hidden md:flex flex-col text-left pr-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                  {currentUser?.name || 'Usuario'}
                </span>
                <span className="text-[9px] font-mono font-semibold text-amber-600 dark:text-gold-400">
                  {isSuperAdmin ? 'SuperAdmin' : 'Admin'}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-industrial-500 mr-0.5" />
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
                        {barbershopInfo?.name || 'Mi Barbería'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acceso a Configuración de Mi Perfil Personal */}
                <button
                  onClick={() => { setShowUserMenu(false); handleOpenSettings('profile'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800 font-medium transition-colors mt-1 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                  <span>Mi Perfil Personal</span>
                </button>

                {/* Acceso a Configuración de Identidad & Módulos */}
                <button
                  onClick={() => { setShowUserMenu(false); handleOpenSettings('identity'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800 font-medium transition-colors mt-0.5 flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                  <span>Identidad & Logotipo</span>
                </button>

                {/* Acceso a Catálogo de Cortes & Precios */}
                <button
                  onClick={() => { setShowUserMenu(false); handleOpenSettings('services'); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800 font-medium transition-colors mt-0.5 flex items-center gap-2 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                  <span>Cortes & Precios</span>
                </button>

                {isSuperAdmin && onOpenSuperAdmin && (
                  <button
                    onClick={() => { setShowUserMenu(false); onOpenSuperAdmin(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-amber-600 dark:text-gold-400 hover:bg-slate-100 dark:hover:bg-noir-800 font-medium transition-colors mt-0.5 flex items-center gap-2"
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

      {/* Modal Completo de Configuración de Negocio, Logotipo & Módulos (Fallback local si no se inyecta desde App) */}
      {!onOpenSettings && (
        <SettingsModal
          isOpen={internalSettingsModal}
          onClose={() => setInternalSettingsModal(false)}
          initialTab={internalInitialTab}
        />
      )}

      {/* Toast de eventos en vivo súper visible */}
      {toastNotification && (
        <div
          onClick={() => {
            if (onTabChange) onTabChange('reception');
            clearToast();
          }}
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-noir-900 border-2 border-gold-500 shadow-2xl rounded-2xl p-4 flex items-start gap-3 animate-fadeIn text-slate-100 cursor-pointer hover:border-gold-400 transition-all ring-4 ring-gold-500/20"
        >
          <div className="p-2.5 rounded-xl bg-gold-500 text-noir-950 flex-shrink-0 shadow-glow-gold">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h5 className="font-bold text-xs sm:text-sm text-gold-400 uppercase tracking-wide truncate">
                {toastNotification.title || '🔔 ¡NUEVA CITA AGENDADA!'}
              </h5>
              <span className="text-[9px] font-mono bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded font-bold">
                EN VIVO
              </span>
            </div>
            <p className="text-xs text-white mt-1 leading-snug font-medium">
              {toastNotification.message}
            </p>
            <span className="text-[11px] text-amber-400 font-bold block mt-1.5 underline">
              👉 Toca aquí para ver en el Salón
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearToast();
            }}
            aria-label="Cerrar notificación"
            className="text-industrial-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-noir-800 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
