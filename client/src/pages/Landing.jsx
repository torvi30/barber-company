import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { useTheme } from '../context/ThemeContext';
import { PublicBookingWizard } from '../components/PublicBookingWizard';
import { PublicStore } from '../components/PublicStore';
import { BarberPinModal } from '../components/BarberPinModal';
import {
  Scissors,
  Award,
  ChevronRight,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Sparkles,
  Phone,
  ShoppingBag,
  CalendarDays,
  Sun,
  Moon
} from 'lucide-react';

export const Landing = ({ onEnterAdmin, onBarberLogin }) => {
  const { barbershopInfo, availableTenants, switchTenant, barbers, tenantId } = useBarbershop();
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeSlug, setActiveSlug] = useState(barbershopInfo?.slug || barbershopInfo?.id || '');
  const [activeTab, setActiveTab] = useState('booking'); // 'booking' | 'store'
  const [isBarberPinModalOpen, setIsBarberPinModalOpen] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('barbero') === 'pin' || p.has('pin') || window.location.hash === '#barbero';
    } catch {
      return false;
    }
  });

  // Si la URL trae ?barbero=pin o hash #barbero abrir modal automáticamente
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('barbero') === 'pin' || p.has('pin') || window.location.hash === '#barbero') {
      setIsBarberPinModalOpen(true);
    }
  }, []);

  // Sincronizar reactivamente el slug cuando cargue o cambie barbershopInfo
  useEffect(() => {
    const slug = barbershopInfo?.slug || barbershopInfo?.id || '';
    if (slug) {
      setActiveSlug(slug);
    }
  }, [barbershopInfo?.slug, barbershopInfo?.id]);

  const effectiveSlug = activeSlug || barbershopInfo?.slug || barbershopInfo?.id || 'black-gold';
  const isStoreEnabled = barbershopInfo?.storeEnabled !== false;

  // Mantener sincronizado el slug con la barbería activa
  const handleSelectBarbershop = (tenant) => {
    switchTenant(tenant);
    setActiveSlug(tenant.slug || tenant.id);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-noir-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-gold-500 selection:text-black transition-colors duration-200">
      {/* Top Bar Navigation Pinned: Fijo siempre visible al hacer scroll para alternar rápido entre Tienda y Cita */}
      <nav className="border-b border-slate-200 dark:border-industrial-800 bg-white/95 dark:bg-noir-900/95 backdrop-blur-md px-4 py-2.5 md:px-6 md:py-3.5 sticky top-0 z-40 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {barbershopInfo?.logoUrl ? (
              <img
                src={barbershopInfo.logoUrl}
                alt={barbershopInfo?.name || 'Logo'}
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover border border-amber-500/40 shadow-glow-gold flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-sm md:text-xl shadow-glow-gold flex-shrink-0">
                {barbershopInfo?.name ? barbershopInfo.name.substring(0, 2).toUpperCase() : 'BP'}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-display font-bold text-sm md:text-lg text-slate-900 dark:text-white tracking-wide truncate block">
                {barbershopInfo?.name || 'BarberPulse Studio'}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono flex items-center gap-1 truncate">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" /> {barbershopInfo?.municipality || 'Colombia'}
                {barbershopInfo?.slogan && <span className="hidden sm:inline">• {barbershopInfo.slogan}</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Tema Claro / Oscuro */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 transition-colors cursor-pointer"
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={onEnterAdmin}
              className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 text-xs font-semibold transition-all cursor-pointer"
            >
              <span>Panel</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Client View Switcher Móvil / Desktop (Siempre accesible en la cabecera fija) */}
        {isStoreEnabled && (
          <div className="max-w-md mx-auto mt-2 flex items-center gap-1.5 bg-slate-100 dark:bg-noir-950 p-1 rounded-2xl border border-slate-200 dark:border-industrial-800 text-xs font-bold animate-fadeIn">
            <button
              onClick={() => setActiveTab('booking')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'booking'
                  ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 shadow-sm dark:shadow-glow-gold font-bold'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Reservar Turno</span>
            </button>

            <button
              onClick={() => setActiveTab('store')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'store'
                  ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 shadow-sm dark:shadow-glow-gold font-bold'
                  : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tienda Boutique</span>
            </button>
          </div>
        )}
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 md:py-10 flex-1 w-full">
        {isStoreEnabled && activeTab === 'store' ? (
          <PublicStore
            slug={effectiveSlug}
            onGoToBooking={() => {
              setActiveTab('booking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
            {/* Left Column: Brand Story & Live Proof (Visible en desktop/tablet, en móvil el cliente va directo al wizard de reserva limpio) */}
            <div className="hidden lg:block lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/30 dark:border-gold-500/30 text-amber-700 dark:text-gold-400 text-[11px] font-semibold tracking-wider uppercase font-mono">
                <Award className="w-3.5 h-3.5" /> Grooming & Gentlemen Sanctuary
              </div>

              <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white leading-tight">
                Cortes de precisión y rituales clásicos, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-gold-500 to-amber-700 dark:from-gold-400 dark:via-gold-300 dark:to-amber-500">sin minutos de espera</span>.
              </h2>

              <p className="text-slate-600 dark:text-industrial-400 text-sm md:text-base leading-relaxed">
                Reserva tu horario con tu barbero favorito en tiempo real. Nuestro sistema anti-colisión asegura tu sillón al instante, sin solapamientos ni esperas en sala.
              </p>

              {/* Social Proof & Badges */}
              <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 space-y-2 shadow-sm">
                <div className="flex items-center gap-1 text-gold-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  <span className="text-slate-900 dark:text-white text-xs font-bold font-mono ml-2">4.96 / 5.0</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                  "El mejor corte Fade y ritual de toalla de la ciudad. Reservé desde el móvil en 30 segundos y al llegar me senté directo al sillón."
                </p>
                <div className="text-[10px] text-slate-400 dark:text-industrial-500 font-mono">
                  — Carlos Santamaría (Cliente verificado)
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm">
                  <div className="text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white">0 min</div>
                  <div className="text-[9px] text-slate-500 dark:text-industrial-400 uppercase mt-0.5">Espera</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm">
                  <div className="text-lg md:text-xl font-bold font-display text-amber-600 dark:text-gold-400">100%</div>
                  <div className="text-[9px] text-slate-500 dark:text-industrial-400 uppercase mt-0.5">Navaja & Vapor</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm">
                  <div className="text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white">3</div>
                  <div className="text-[9px] text-slate-500 dark:text-industrial-400 uppercase mt-0.5">Master Barberos</div>
                </div>
              </div>
            </div>

            {/* Right Column: Public Booking Wizard (En móvil ocupa todo el ancho y se ve al instante) */}
            <div className="col-span-1 lg:col-span-7 w-full max-w-2xl mx-auto lg:max-w-none">
              <PublicBookingWizard slug={effectiveSlug} initialBarbershop={barbershopInfo} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-industrial-800/80 bg-slate-100 dark:bg-noir-900/40 px-6 py-6 text-center text-xs text-slate-500 dark:text-industrial-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full transition-colors">
        <p>© 2026 {barbershopInfo?.name || 'BarberPulse'} — Todos los derechos reservados.</p>
        <p className="font-mono text-amber-700/80 dark:text-gold-500/80 mt-2 sm:mt-0 flex items-center gap-1.5 justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Powered by BarberPulse OS Multi-Tenant Cloud
        </p>
      </footer>

      {/* Modal de Acceso por PIN del Barbero */}
      <BarberPinModal
        isOpen={isBarberPinModalOpen}
        onClose={() => setIsBarberPinModalOpen(false)}
        tenantId={tenantId}
        slug={effectiveSlug}
        barbers={barbers}
        onLoginSuccess={(session) => {
          if (onBarberLogin) onBarberLogin(session);
        }}
      />
    </div>
  );
};
