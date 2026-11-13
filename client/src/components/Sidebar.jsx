import React from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays,
  Scissors,
  Users,
  DollarSign,
  Crown,
  ExternalLink,
  LogOut
} from 'lucide-react';

export const Sidebar = ({ activeTab, onTabChange }) => {
  const { barbershopInfo } = useBarbershop();
  const { isSuperAdmin, currentUser, logout } = useAuth();

  const salonItems = [
    { id: 'reception',     label: 'Agenda & Salón',   icon: CalendarDays },
    { id: 'barber-portal', label: 'Portal Barbero',   icon: Scissors },
    { id: 'cash',          label: 'Caja & Ventas',    icon: DollarSign },
    { id: 'clients',       label: 'Clientes CRM',     icon: Users },
  ];

  return (
    <aside className="w-60 border-r border-industrial-800/60 bg-noir-900/40 backdrop-blur-sm p-3.5 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] flex-shrink-0">
      <div className="space-y-4">
        {/* Enlace al sitio público del cliente */}
        <button
          onClick={() => onTabChange('landing')}
          className="w-full py-2 px-3 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 text-gold-400 font-semibold text-xs transition-all flex items-center justify-between cursor-pointer"
          title="Ver página que ve el cliente"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Página del Cliente</span>
          </span>
          <span className="text-[10px] text-industrial-500 font-mono">↗</span>
        </button>

        {/* Sección SuperAdmin (Solo si tiene rol SuperAdmin) */}
        {isSuperAdmin && (
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-gold-400/80 flex items-center justify-between">
              <span>Control Global</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-gold-500/20 border border-gold-500/30 text-gold-300">HUB</span>
            </div>
            <button
              onClick={() => onTabChange('superadmin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'superadmin'
                  ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
                  : 'text-industrial-300 hover:text-white hover:bg-noir-800/60 border border-gold-500/20 bg-gold-500/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crown className={`w-4 h-4 ${activeTab === 'superadmin' ? 'text-noir-950' : 'text-gold-400'}`} />
                <span>SuperAdmin Master</span>
              </div>
              <span className={`text-[9px] font-mono px-1 rounded ${activeTab === 'superadmin' ? 'bg-noir-950 text-gold-300' : 'bg-noir-900 text-industrial-400'}`}>
                CASA
              </span>
            </button>
          </div>
        )}

        {/* Menú de Operación de Salón */}
        <div className="space-y-1">
          {isSuperAdmin && (
            <div className="px-2 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-industrial-400">
              Operación de Salón
            </div>
          )}
          <nav className="space-y-1">
            {salonItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30 font-bold'
                      : 'text-industrial-400 hover:text-white hover:bg-noir-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-industrial-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer con Usuario y Salir */}
      <div className="pt-3 border-t border-industrial-800/40 space-y-2">
        <div className="px-1 flex items-center justify-between text-xs">
          <div className="min-w-0">
            <span className="font-bold text-white text-xs truncate block">{currentUser?.name || 'Usuario'}</span>
            <span className="text-[10px] text-industrial-400 block truncate">
              {isSuperAdmin ? 'SuperAdmin' : 'Dueño / Admin'}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-industrial-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-industrial-500 flex items-center justify-between font-mono px-1">
          <span>BarberPulse OS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>
      </div>
    </aside>
  );
};


