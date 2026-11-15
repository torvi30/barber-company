import React, { useEffect, useState } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { StatCard } from '../components/StatCard';
import { BarberCard } from '../components/BarberCard';
import { Badge } from '../components/Badge';
import { api } from '../services/api';
import {
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  CalendarCheck
} from 'lucide-react';

export const Dashboard = () => {
  const { tenantId, barbers = [], appointments = [] } = useBarbershop();
  const [cashSummary, setCashSummary] = useState(null);
  const [inventoryMetrics, setInventoryMetrics] = useState({ totalItems: 0, lowStockCount: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cashRes, invRes] = await Promise.all([
          api.getCashSummary(tenantId),
          api.getInventory(tenantId)
        ]);

        if (cashRes.success) setCashSummary(cashRes.data);
        if (invRes.success) setInventoryMetrics(invRes.metrics);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      }
    };

    fetchData();
  }, [tenantId, appointments]);

  const completedToday = appointments.filter(a => a.status === 'COMPLETED');
  const inChairToday = appointments.filter(a => a.status === 'IN_CHAIR');
  const waitingToday = appointments.filter(a => a.status === 'WAITING');

  const grossRevenue = cashSummary?.metrics?.grossRevenue || 0;
  const cashCollected = cashSummary?.metrics?.totalCashCollected || 0;
  const tipsCollected = cashSummary?.metrics?.totalTipsCollected || 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wide">
            Panel de Control Ejecutivo
          </h2>
          <p className="text-xs text-industrial-400 mt-1">
            Métricas de productividad, estado de sillones y balance financiero diario en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-industrial-400 bg-noir-900 border border-industrial-800 px-3 py-1.5 rounded-xl">
            Fecha de Arqueo: <strong className="text-gold-400">{new Date().toLocaleDateString()}</strong>
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Facturación Bruta Hoy"
          value={`$${grossRevenue.toFixed(2)}`}
          change="+14.2% vs ayer"
          icon={DollarSign}
          highlight={true}
          subtitle={`Efectivo: $${cashCollected} | Tarjeta/Transf: $${(grossRevenue - cashCollected).toFixed(2)}`}
        />

        <StatCard
          title="Servicios Completados"
          value={completedToday.length}
          change={`${inChairToday.length} en sillón ahora`}
          icon={CalendarCheck}
          subtitle={`En sala de espera: ${waitingToday.length} clientes`}
        />

        <StatCard
          title="Fondo de Propinas"
          value={`$${tipsCollected.toFixed(2)}`}
          change="Distribuible 100%"
          icon={TrendingUp}
          subtitle="Registrado automáticamente por barbero"
        />

        <StatCard
          title="Alertas de Inventario"
          value={inventoryMetrics.lowStockCount}
          icon={Package}
          subtitle={inventoryMetrics.lowStockCount > 0 ? 'Productos bajo stock mínimo' : 'Stock en niveles óptimos'}
        />
      </div>

      {/* Barber Chairs Realtime State */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-gold-400" />
            Control de Sillones y Barberos en Turno
          </h3>
          <span className="text-xs text-industrial-400">
            {barbers.length} Barberos asignados al tenant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((barber) => (
            <BarberCard
              key={barber.id}
              barber={barber}
              activeAppointments={appointments}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-industrial-800 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-white">
            Registro de Citas y Turnos del Día
          </h3>
          <span className="text-xs text-industrial-400">
            Total registros: {appointments.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-noir-950/80 text-industrial-400 border-b border-industrial-800 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Hora</th>
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Servicio</th>
                <th className="px-6 py-3.5">Barbero</th>
                <th className="px-6 py-3.5">Importe</th>
                <th className="px-6 py-3.5">Medio Pago</th>
                <th className="px-6 py-3.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-industrial-500">
                    No hay citas registradas hoy aún.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-noir-850/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-industrial-400">
                      {apt.time}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {apt.clientName}
                      {apt.clientPhone && (
                        <div className="text-[11px] text-industrial-400 font-normal font-mono">
                          {apt.clientPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      {apt.serviceName}
                    </td>
                    <td className="px-6 py-4 text-gold-400 font-medium">
                      {apt.barberName}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      ${Number(apt.price).toFixed(2)}
                      {Number(apt.tip) > 0 && (
                        <span className="text-[10px] text-emerald-400 block font-normal">
                          +${apt.tip} propina
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-industrial-800 text-industrial-300 font-mono">
                        {apt.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge status={apt.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

