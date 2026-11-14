import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BarbershopProvider, useBarbershop } from './context/BarbershopContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { ReceptionQueue } from './pages/ReceptionQueue';
import { CashClosure } from './pages/CashClosure';
import { Inventory } from './pages/Inventory';
import { ClientsCRM } from './pages/ClientsCRM';
import { BarberPortal } from './pages/BarberPortal';
import { Analytics } from './pages/Analytics';
import { NotificationsHub } from './pages/NotificationsHub';
import { SubscriptionSettings } from './pages/SubscriptionSettings';
import { SuperAdminConsole } from './pages/SuperAdminConsole';
import { SuperAdminLayout } from './pages/SuperAdminLayout';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { LoginScreen } from './pages/LoginScreen';
import { UnassignedUserScreen } from './pages/UnassignedUserScreen';
import { SettingsModal } from './components/SettingsModal';

const AppContent = () => {
  const { isAuthenticated, isSuperAdmin, isUnassigned, isLoading } = useAuth();
  const { availableTenants, switchTenant } = useBarbershop();
  const [activeTab, setActiveTab] = useState('reception');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('profile');

  // Sesión Aislada de Barbero (Acceso por PIN de 4 Dígitos sin credenciales de Admin)
  const [barberSession, setBarberSession] = useState(() => {
    try {
      const saved = localStorage.getItem('barberpulse_barber_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleBarberLogin = (session) => {
    setBarberSession(session);
  };

  const handleLogoutBarber = () => {
    localStorage.removeItem('barberpulse_barber_session');
    setBarberSession(null);
  };

  const handleOpenSettings = (tab = 'profile') => {
    setSettingsInitialTab(tab);
    setShowSettingsModal(true);
  };

  // Detectar si la URL trae un parámetro público (ej: ?slug=black-gold o ?view=landing o ruta /citas o ?barbero=pin)
  const urlParams = new URLSearchParams(window.location.search);
  const isBarberPinUrl = urlParams.get('barbero') === 'pin' || urlParams.has('pin') || window.location.hash === '#barbero';
  const isPublicUrl = urlParams.has('slug') || urlParams.get('view') === 'landing' || isBarberPinUrl;
  const [isLandingMode, setIsLandingMode] = useState(isPublicUrl);

  // Pantalla de carga mientras se sincroniza Firebase
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-noir-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-xl shadow-glow-gold animate-bounce mb-4">
          BP
        </div>
        <p className="text-xs font-mono text-slate-500 dark:text-industrial-400 animate-pulse">
          Sincronizando sesión y credenciales...
        </p>
      </div>
    );
  }

  // 1. SI HAY SESIÓN DE BARBERO ACTIVA (PIN): Portal Exclusivo y Blindado del Sillón
  if (barberSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-noir-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 overflow-x-hidden">
        <main className="flex-1 p-3 sm:p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto">
          <BarberPortal
            standaloneBarberMode={true}
            barberSession={barberSession}
            onLogoutBarber={handleLogoutBarber}
          />
        </main>
      </div>
    );
  }

  // 2. Modo público directo para clientes (sin requerir login)
  if (isLandingMode) {
    return (
      <Landing
        onEnterAdmin={() => setIsLandingMode(false)}
        onBarberLogin={handleBarberLogin}
      />
    );
  }

  // 3. Si no está autenticado, mostramos la pantalla de login con Firebase
  if (!isAuthenticated) {
    return <LoginScreen onBarberLogin={handleBarberLogin} />;
  }

  // Si el usuario no es SuperAdmin y no tiene empresa asignada -> Cuarentena (ADR 003)
  if (isUnassigned) {
    return <UnassignedUserScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-noir-950 text-slate-900 dark:text-slate-100 flex flex-col pb-16 md:pb-0 transition-colors duration-200 overflow-x-hidden">
      <Navbar
        onOpenOnboarding={() => setActiveTab('onboarding')}
        onOpenSuperAdmin={() => setActiveTab('superadmin')}
        onOpenSettings={handleOpenSettings}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex flex-1 min-w-0 overflow-x-hidden">
        <Sidebar
          activeTab={activeTab}
          onOpenSettings={handleOpenSettings}
          onTabChange={(tab) => {
            if (tab === 'landing') {
              setIsLandingMode(true);
            } else {
              setActiveTab(tab);
            }
          }}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto overflow-x-hidden">
          {activeTab === 'onboarding' && (
            <OnboardingWizard
              onComplete={() => setActiveTab('reception')}
              onCancel={() => setActiveTab('reception')}
            />
          )}
          {activeTab === 'superadmin' && isSuperAdmin && (
            <SuperAdminLayout
              onExitSuperAdmin={() => setActiveTab('reception')}
              embedded={true}
            />
          )}
          {activeTab === 'reception' && <ReceptionQueue />}
          {activeTab === 'barber-portal' && <BarberPortal />}
          {activeTab === 'cash' && <CashClosure />}
          {activeTab === 'clients' && <ClientsCRM />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'subscription' && <SubscriptionSettings />}
        </main>
      </div>

      {/* Modal Global de Ajustes de Barbería, Perfil Personal & Logotipo */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab={settingsInitialTab}
      />

      {/* Barra de Navegación Inferior Móvil (Mobile Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-noir-900/95 backdrop-blur-md border-t border-slate-200 dark:border-industrial-800 z-40 flex items-center justify-around px-2 shadow-sm transition-colors">
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('superadmin')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              activeTab === 'superadmin' ? 'text-amber-600 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'
            }`}
          >
            <span className="text-base">👑</span>
            <span>Master</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('reception')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            activeTab === 'reception' ? 'text-amber-600 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'
          }`}
        >
          <span className="text-base">📅</span>
          <span>Salón</span>
        </button>

        <button
          onClick={() => setActiveTab('barber-portal')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            activeTab === 'barber-portal' ? 'text-amber-600 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'
          }`}
        >
          <span className="text-base">✂️</span>
          <span>Barbero</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            activeTab === 'inventory' ? 'text-amber-600 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'
          }`}
        >
          <span className="text-base">🛍️</span>
          <span>Tienda</span>
        </button>

        <button
          onClick={() => setActiveTab('cash')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            activeTab === 'cash' ? 'text-amber-600 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'
          }`}
        >
          <span className="text-base">💵</span>
          <span>Caja</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            activeTab === 'clients' ? 'text-amber-600 dark:text-gold-400 font-bold' : 'text-slate-500 dark:text-industrial-400'
          }`}
        >
          <span className="text-base">👥</span>
          <span>Clientes</span>
        </button>

        <button
          onClick={() => setIsLandingMode(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] text-slate-500 dark:text-industrial-400 hover:text-amber-600 dark:hover:text-gold-400 font-semibold transition-colors"
        >
          <span className="text-base">🌐</span>
          <span>Web</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BarbershopProvider>
          <AppContent />
        </BarbershopProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}


