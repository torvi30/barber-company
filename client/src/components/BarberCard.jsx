import React from 'react';
import { Badge } from './Badge';
import { Scissors, DollarSign } from 'lucide-react';

export const BarberCard = ({ barber, activeAppointments = [], onStatusChange }) => {
  const currentAppointment = activeAppointments.find(
    a => a.barberId === barber.id && (a.status === 'IN_CHAIR' || a.status === 'WAITING')
  );

  return (
    <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-5 hover:border-gold-500/40 transition-all duration-300 relative overflow-hidden group">
      {/* Decorative subtle gold line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-noir-800 border border-industrial-700 flex items-center justify-center font-display font-bold text-gold-400 text-lg">
              {barber.name.charAt(0)}
            </div>
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-noir-900 ${
              barber.status === 'IN_SERVICE' ? 'bg-blue-500 animate-pulse' :
              barber.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-slate-500'
            }`}></span>
          </div>

          <div>
            <h4 className="font-semibold text-white text-base leading-tight group-hover:text-gold-300 transition-colors">
              {barber.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-industrial-400">Comisión:</span>
              <span className="text-xs font-semibold text-gold-400">
                {Number(barber.commissionRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <Badge status={barber.status || 'AVAILABLE'}>
          {barber.status === 'IN_SERVICE' ? 'En Sillón' :
           barber.status === 'AVAILABLE' ? 'Disponible' : 'Descanso'}
        </Badge>
      </div>

      {/* Estado del sillón en vivo */}
      <div className="mt-4 pt-3 border-t border-industrial-800/80">
        {currentAppointment ? (
          <div className="bg-noir-950/70 rounded-xl p-3 border border-industrial-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-industrial-400">Cliente en turno:</div>
              <div className="text-sm font-semibold text-white">{currentAppointment.clientName}</div>
              <div className="text-xs text-gold-400/90 flex items-center gap-1 mt-0.5">
                <Scissors className="w-3 h-3" /> {currentAppointment.serviceName}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-industrial-400">{currentAppointment.time}</div>
              <div className="text-sm font-bold text-white">${currentAppointment.price}</div>
            </div>
          </div>
        ) : (
          <div className="bg-noir-950/40 rounded-xl p-3 border border-dashed border-industrial-800/60 text-center text-xs text-industrial-400 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Sillón libre para asignación inmediata
          </div>
        )}
      </div>
    </div>
  );
};

