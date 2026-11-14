import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBarbershop } from '../context/BarbershopContext';
import { SuperAdminConsole } from './SuperAdminConsole';
import {
  Crown,
  Building2,
  Plus,
  LogOut,
  RefreshCw,
  Bell,
  Scissors,
  BarChart3,
  User,
  ShieldCheck
} from 'lucide-react';

/**
 * Layout exclusivo del SuperAdmin — Central Control Plane / Casa Nodriza
 * Diseño ultra-elegante, sin botones repetidos, 100% intuitivo y unificado con la barra lateral
 */
export const SuperAdminLayout = ({ onExitSuperAdmin, embedded = true }) => {
  const { currentUser, logout } = useAuth();
  const { availableTenants } = useBarbershop();
  const [activeSection, setActiveSection] = useState('companies'); // 'companies' | 'users' | 'analytics'
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [counts, setCounts] = useState({ tenantsCount: 0, usersCount: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshMaster = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const navItems = [
    { id: 'companies', label: 'Red de Barberías', icon: Building2, badge: counts.tenantsCount },
    { id: 'users', label: 'Usuarios & Asignación', icon: User, badge: counts.usersCount },
    { id: 'analytics', label: 'Métricas Globales', icon: BarChart3 },
  ];

  const content = (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Control Plane Header Banner */}
      <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-noir-900 dark:via-noir-900 dark:to-noir-950 border border-slate-200 dark:border-gold-500/25 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Título y Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 dark:from-gold-600 dark:to-gold-400 flex items-center justify-center font-display font-black text-slate-950 text-lg shadow-sm dark:shadow-glow-gold flex-shrink-0">
              <Crown className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-slate-900 dark:text-white text-base md:text-lg tracking-wide">
                  Consola SuperAdmin
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 dark:bg-gold-500/15 dark:border-gold-500/30 text-amber-800 dark:text-gold-300 text-[10px] font-mono font-bold flex items-center gap-1">
                  CASA NODRIZA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono mt-0.5">
                Control maestro de barberías, asignación de cuentas y métricas de red.
              </p>
            </div>
          </div>

          {/* Pestañas de Sub-navegación Responsivas (Sin scroll molesto) */}
          <nav className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl p-1 w-full lg:w-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:text-noir-950 shadow-sm dark:shadow-glow-gold'
                      : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-noir-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-600 dark:text-gold-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-slate-950 text-amber-300 dark:bg-noir-950 dark:text-gold-300' : 'bg-slate-200 dark:bg-industrial-800 text-slate-700 dark:text-industrial-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-amber-500/30 dark:border-gold-500/30 text-[11px] font-mono text-amber-800 dark:text-gold-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Nodo: Colombia</span>
            </div>

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <button
                onClick={handleRefreshMaster}
                title="Sincronizar toda la red"
                className="p-2 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white hover:border-amber-500/40 dark:hover:border-gold-500/40 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600 dark:text-gold-400' : ''}`} />
              </button>

              <button
                onClick={() => setShowCreateCompanyModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:hover:from-gold-500 dark:hover:to-gold-300 text-slate-950 dark:text-noir-950 font-bold text-xs uppercase tracking-wider transition-all shadow-sm dark:shadow-glow-gold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Barbería</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de barberías vencidas o en mora */}
      <AlertBar tenants={availableTenants} />

      {/* Vistas */}
      {(activeSection === 'companies' || activeSection === 'users') && (
        <SuperAdminConsole
          activeTab={activeSection}
          showCreateCompanyModal={showCreateCompanyModal}
          setShowCreateCompanyModal={setShowCreateCompanyModal}
          onCountsChange={setCounts}
          refreshTrigger={refreshTrigger}
        />
      )}
      {activeSection === 'analytics' && <SuperAdminAnalytics tenants={availableTenants} />}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-gold-500 selection:text-black">
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {content}
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
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-500/30 px-4 sm:px-6 py-2.5 flex items-center gap-3 overflow-x-auto scrollbar-none text-xs rounded-xl shadow-xs">
      <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-bounce" />
      {critical.length > 0 && (
        <span className="text-rose-800 dark:text-rose-300 font-bold flex-shrink-0">
          🚨 {critical.length} {critical.length === 1 ? 'barbería' : 'barberías'} en mora/suspendida:
          {critical.map(t => <span key={t.id} className="ml-1 font-mono bg-rose-500/20 px-1.5 py-0.5 rounded">{t.name}</span>)}
        </span>
      )}
      {expiring.length > 0 && (
        <span className="text-amber-800 dark:text-amber-300 font-bold flex-shrink-0">
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
    { label: 'Por Vencer ≤ 3 días', value: stats.expiringSoon, sub: 'Requieren recordatorio preventivo', color: 'amber' },
    { label: 'En Mora / Suspendidas', value: stats.pastDue + stats.suspended, sub: `${stats.pastDue} en mora · ${stats.suspended} suspendidas`, color: 'rose' },
  ];

  const colorMap = {
    gold:    { border: 'border-amber-300 dark:border-gold-500/30',    text: 'text-amber-800 dark:text-gold-400',    num: 'text-slate-900 dark:text-white' },
    emerald: { border: 'border-emerald-300 dark:border-emerald-500/30', text: 'text-emerald-800 dark:text-emerald-400', num: 'text-slate-900 dark:text-white' },
    amber:   { border: 'border-amber-300 dark:border-amber-500/30',   text: 'text-amber-700 dark:text-amber-400',   num: 'text-amber-600 dark:text-amber-400' },
    rose:    { border: 'border-rose-300 dark:border-rose-500/30',    text: 'text-rose-700 dark:text-rose-400',    num: 'text-rose-600 dark:text-rose-400' },
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white mb-1">Métricas Globales</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-industrial-400">Visión en tiempo real de toda la red de barberías BarberPulse.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {statCards.map(card => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-noir-900 border ${c.border} shadow-sm`}>
              <div className={`text-xs font-mono uppercase tracking-wider mb-2 font-bold ${c.text}`}>{card.label}</div>
              <div className={`text-2xl sm:text-3xl font-display font-black ${c.num}`}>{card.value}</div>
              <div className="text-[11px] text-slate-500 dark:text-industrial-400 mt-1">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Distribución por municipio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-600 dark:text-gold-400" />
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

