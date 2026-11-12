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

  // Menú esencial de 4 pestañas: sin redundancias
  const menuItems = [
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'SuperAdmin Master', icon: Crown, isMaster: true }] : []),
    { id: 'reception',    label: 'Agenda & Salón',   icon: CalendarDays },
    { id: 'barber-portal',label: 'Portal Barbero',   icon: Scissors },
    { id: 'cash',         label: 'Caja & Ventas',    icon: DollarSign },
    { id: 'clients',      label: 'Clientes CRM',     icon: Users },
  ];

  return (
    <aside className="w-56 border-r border-industrial-800/60 bg-noir-900/30 p-3 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {/* Enlace al sitio público del cliente */}
        <button
          onClick={() => onTabChange('landing')}
          className="w-full py-2 px-3 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 text-gold-400 font-semibold text-xs transition-all flex items-center justify-between"
          title="Ver página que ve el cliente"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Página del Cliente</span>
          </span>
          <span className="text-[10px] text-industrial-500 font-mono">↗</span>
        </button>

        {/* Menú Compacto y Directo */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? item.isMaster
                      ? 'bg-gold-500 text-noir-950 font-bold shadow-glow-gold'
                      : 'bg-gold-500/15 text-gold-300 border border-gold-500/30 font-bold'
                    : 'text-industrial-400 hover:text-white hover:bg-noir-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? (item.isMaster ? 'text-noir-950' : 'text-gold-400') : 'text-industrial-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
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


