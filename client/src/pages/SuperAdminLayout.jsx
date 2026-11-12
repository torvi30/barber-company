import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBarbershop } from '../context/BarbershopContext';
import { SuperAdminConsole } from './SuperAdminConsole';
import { OnboardingWizard } from './OnboardingWizard';
import {
  Crown,
  Building2,
  PlusCircle,
  LogOut,
  RefreshCw,
  Bell,
  Scissors,
  BarChart3,
  Settings
} from 'lucide-react';

/**
 * Layout exclusivo del SuperAdmin — gestión de TODAS las barberías
 * Panel separado y dedicado, sin mezclar con la vista de dueño
 */
export const SuperAdminLayout = ({ onExitSuperAdmin }) => {
  const { currentUser, logout } = useAuth();
  const { availableTenants, switchTenant } = useBarbershop();
  const [activeSection, setActiveSection] = useState('consola'); // 'consola' | 'analytics'
  const [showOnboarding, setShowOnboarding] = useState(false);

  const totalBarbers = availableTenants.length;

  const navItems = [
    { id: 'consola', label: 'Red de Barberías', icon: Building2, badge: totalBarbers },
    { id: 'analytics', label: 'Métricas Globales', icon: BarChart3 },
  ];

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-noir-950 text-slate-100 p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowOnboarding(false)}
            className="flex items-center gap-2 text-sm text-industrial-400 hover:text-white mb-6 transition-colors"
          >
            ← Volver a la Consola
          </button>
          <OnboardingWizard
            onComplete={() => setShowOnboarding(false)}
            onCancel={() => setShowOnboarding(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir-950 text-slate-100 flex flex-col">
      {/* Header SuperAdmin */}
      <header className="h-16 border-b border-gold-500/30 bg-noir-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-lg shadow-glow-gold flex-shrink-0">
            BP
          </div>

          {/* Título y modo */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-white text-sm">BarberPulse OS</h1>
              <span className="px-2 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <Crown className="w-2.5 h-2.5" />
                SUPERADMIN
              </span>
            </div>
            <p className="text-[10px] text-industrial-500 font-mono mt-0.5">
              Casa Nodriza · {totalBarbers} barberías registradas
            </p>
          </div>
        </div>

        {/* Nav central */}
        <nav className="hidden md:flex items-center gap-1 bg-noir-950 border border-industrial-800 rounded-xl p-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gold-500 text-noir-950 font-bold'
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-noir-950/30 text-noir-950' : 'bg-industrial-800 text-industrial-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Acciones derechas */}
        <div className="flex items-center gap-3">
          {/* Botón Ver como Dueño / Panel Operativo */}
          {onExitSuperAdmin && (
            <button
              onClick={onExitSuperAdmin}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-noir-950 border border-industrial-700 hover:border-gold-500/40 text-slate-300 text-xs font-medium transition-colors"
              title="Ir al panel operativo de la barbería seleccionada"
            >
              <Scissors className="w-3.5 h-3.5 text-gold-400" />
              <span>Ver Panel de Barbería</span>
            </button>
          )}

          {/* Botón Nueva Barbería */}
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-black text-xs uppercase tracking-wider transition-all shadow-glow-gold"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Barbería</span>
          </button>

          {/* Usuario */}
          <div className="flex items-center gap-2 pl-3 border-l border-industrial-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center text-noir-950 font-black text-xs">
              {currentUser.name?.charAt(0) || 'S'}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-bold text-white">{currentUser.name}</div>
              <div className="text-[10px] text-gold-400 font-mono">👑 SUPERADMIN</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="p-2 rounded-xl bg-noir-950 border border-industrial-800 text-industrial-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Barra de alerta rapida de barberías en mora */}
      <AlertBar tenants={availableTenants} />

      {/* Contenido principal */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {activeSection === 'consola' && <SuperAdminConsole />}
        {activeSection === 'analytics' && <SuperAdminAnalytics tenants={availableTenants} />}
      </main>
    </div>
  );
};

/**
 * Barra de alerta rápida para barberías críticas
 */
const AlertBar = ({ tenants }) => {
  const critical = tenants.filter(t =>
    t.subscriptionStatus === 'past_due' ||
    t.subscriptionStatus === 'canceled' ||
    t.subscriptionStatus === 'suspended'
  );
  const expiring = tenants.filter(t => {
    if (!t.currentPeriodEnd) return false;
    const daysLeft = Math.round((new Date(t.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 3 && t.subscriptionStatus !== 'suspended';
  });

  if (critical.length === 0 && expiring.length === 0) return null;

  return (
    <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2.5 flex items-center gap-4 overflow-x-auto text-xs">
      <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-bounce" />
      {critical.length > 0 && (
        <span className="text-rose-300 font-bold flex-shrink-0">
          🚨 {critical.length} {critical.length === 1 ? 'barbería' : 'barberías'} en mora/suspendida:
          {critical.map(t => <span key={t.id} className="ml-1 font-mono bg-rose-500/20 px-1.5 py-0.5 rounded">{t.name}</span>)}
        </span>
      )}
      {expiring.length > 0 && (
        <span className="text-amber-300 font-bold flex-shrink-0">
          ⏰ {expiring.length} {expiring.length === 1 ? 'barbería vence' : 'barberías vencen'} en ≤ 3 días:
          {expiring.map(t => <span key={t.id} className="ml-1 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">{t.name}</span>)}
        </span>
      )}
    </div>
  );
};

/**
 * Vista de Métricas Globales del SuperAdmin
 */
const SuperAdminAnalytics = ({ tenants }) => {
  const now = Date.now();

  const stats = tenants.reduce((acc, t) => {
    const plan = t.subscriptionPlan || 'pro';
    const price = plan === 'basic' ? 29 : 59;
    const status = t.subscriptionStatus || 'active';
    const periodEnd = t.currentPeriodEnd ? new Date(t.currentPeriodEnd).getTime() : (now + 1000 * 60 * 60 * 24 * 30);
    const daysLeft = Math.round((periodEnd - now) / (1000 * 60 * 60 * 24));

    if (status === 'active') { acc.mrr += price; acc.active++; }
    else if (status === 'trial') acc.trial++;
    else if (status === 'past_due') acc.pastDue++;
    else if (status === 'suspended' || status === 'canceled') acc.suspended++;

    if (daysLeft <= 3 && daysLeft >= 0 && status !== 'suspended') acc.expiringSoon++;

    const mun = t.municipality || 'Desconocido';
    acc.byMunicipality[mun] = (acc.byMunicipality[mun] || 0) + 1;

    return acc;
  }, { mrr: 0, active: 0, trial: 0, pastDue: 0, suspended: 0, expiringSoon: 0, byMunicipality: {} });

  const statCards = [
    { label: 'MRR Total', value: `$${stats.mrr} USD`, sub: `≈ $${(stats.mrr * 4200).toLocaleString('es-CO')} COP`, color: 'gold' },
    { label: 'Barberías Activas', value: stats.active, sub: `${stats.trial} en período de prueba`, color: 'emerald' },
    { label: 'Por Vencer ≤ 3 días', value: stats.expiringSoon, sub: 'Requieren recordatorio', color: 'amber' },
    { label: 'En Mora / Suspendidas', value: stats.pastDue + stats.suspended, sub: `${stats.pastDue} en mora · ${stats.suspended} suspendidas`, color: 'rose' },
  ];

  const colorMap = {
    gold:    { border: 'border-gold-500/30',    text: 'text-gold-400',    bg: 'bg-gold-500/10' },
    emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    amber:   { border: 'border-amber-500/30',   text: 'text-amber-400',   bg: 'bg-amber-500/10' },
    rose:    { border: 'border-rose-500/30',    text: 'text-rose-400',    bg: 'bg-rose-500/10' },
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-display font-black text-white mb-1">Métricas Globales</h2>
        <p className="text-sm text-industrial-400">Visión en tiempo real de toda la red de barberías BarberPulse.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(card => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className={`p-5 rounded-2xl bg-noir-900 border ${c.border}`}>
              <div className={`text-xs font-mono uppercase tracking-wider mb-2 ${c.text}`}>{card.label}</div>
              <div className={`text-3xl font-display font-black ${c.text}`}>{card.value}</div>
              <div className="text-[11px] text-industrial-400 mt-1">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Distribución por municipio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-gold-400" />
            Distribución por Municipio
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byMunicipality)
              .sort((a, b) => b[1] - a[1])
              .map(([mun, count]) => {
                const pct = Math.round((count / tenants.length) * 100);
                return (
                  <div key={mun}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{mun}</span>
                      <span className="font-mono text-gold-400">{count} {count === 1 ? 'barbería' : 'barberías'}</span>
                    </div>
                    <div className="h-2 bg-noir-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-500 to-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Distribución por plan */}
        <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gold-400" />
            Estado de Suscripciones
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Activas', value: stats.active, color: 'emerald' },
              { label: 'En Prueba (Trial)', value: stats.trial, color: 'sky' },
              { label: 'En Mora', value: stats.pastDue, color: 'rose' },
              { label: 'Suspendidas', value: stats.suspended, color: 'industrial' },
            ].map(item => {
              const pct = tenants.length > 0 ? Math.round((item.value / tenants.length) * 100) : 0;
              const barColor = {
                emerald: 'bg-emerald-400',
                sky: 'bg-sky-400',
                rose: 'bg-rose-400',
                industrial: 'bg-industrial-500',
              }[item.color] || 'bg-gold-400';
              const textColor = {
                emerald: 'text-emerald-400',
                sky: 'text-sky-400',
                rose: 'text-rose-400',
                industrial: 'text-industrial-400',
              }[item.color] || 'text-gold-400';
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={`font-mono font-bold ${textColor}`}>{item.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-noir-950 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista rápida de todas las barberías */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-industrial-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold-400" />
            Resumen de Barberías ({tenants.length})
          </h3>
        </div>
        <div className="divide-y divide-industrial-800/60">
          {tenants.map(t => {
            const daysLeft = t.currentPeriodEnd
              ? Math.round((new Date(t.currentPeriodEnd).getTime() - now) / (1000 * 60 * 60 * 24))
              : 30;
            const statusColor = {
              active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
              trial: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
              past_due: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
              suspended: 'text-industrial-400 bg-industrial-800/50 border-industrial-700',
            }[t.subscriptionStatus] || 'text-industrial-400 bg-industrial-800/50 border-industrial-700';

            return (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-noir-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-noir-950 border border-gold-500/20">
                    <Scissors className="w-3.5 h-3.5 text-gold-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-[11px] text-industrial-500 font-mono">{t.municipality} · {t.ownerName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-mono text-gold-400">${t.subscriptionPlan === 'basic' ? '29' : '59'} USD/mes</div>
                    <div className="text-[11px] text-industrial-500">{daysLeft >= 0 ? `${daysLeft}d restantes` : 'Vencida'}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase font-mono ${statusColor}`}>
                    {t.subscriptionStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

