import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import {
  TrendingUp,
  BarChart3,
  Download,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Award,
  Sparkles,
  Percent,
  Coins,
  CreditCard,
  Smartphone,
  ChevronRight,
  ShoppingBag
} from 'lucide-react';

export const Analytics = () => {
  const { tenantId } = useBarbershop();
  const [range, setRange] = useState('7d');
  const [revenueData, setRevenueData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultRevenue = {
    kpis: { grossRevenue: 0, netMargin: 0, totalServices: 0, averageTicket: 0 },
    timeline: [],
    paymentMethods: { CASH: 0, CARD: 0, TRANSFER: 0 }
  };
  const defaultHeatmap = { days: [], hours: [], matrix: [] };

  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) {
        setRevenueData(defaultRevenue);
        setHeatmapData(defaultHeatmap);
        setRankingData([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [revRes, heatRes, rankRes] = await Promise.all([
          api.getRevenueAnalytics(tenantId, range),
          api.getPeakHoursHeatmap(tenantId),
          api.getBarberPerformanceRanking(tenantId)
        ]);

        if (revRes && revRes.success) setRevenueData(revRes);
        else setRevenueData(defaultRevenue);

        if (heatRes && heatRes.success) setHeatmapData(heatRes);
        else setHeatmapData(defaultHeatmap);

        if (rankRes && rankRes.success) setRankingData(rankRes.rankings || []);
        else setRankingData([]);
      } catch (err) {
        console.error('Error al cargar analíticas:', err);
        setRevenueData(defaultRevenue);
        setHeatmapData(defaultHeatmap);
        setRankingData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, range]);

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch(api.getExportAccountingUrl(tenantId), {
        headers: { 'x-barbershop-id': tenantId }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_contable_${tenantId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar el archivo contable.');
    }
  };

  if (loading || !revenueData || !heatmapData) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400 animate-pulse">
        Compilando métricas y mapas de demanda en tiempo real...
      </div>
    );
  }

  const { kpis, timeline, paymentMethods } = revenueData;
  const maxDayRevenue = Math.max(...timeline.map(d => d.total), 1);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-industrial-800">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-400" />
            Analíticas de Negocio & Inteligencia Contable
          </h2>
          <p className="text-xs text-industrial-400 mt-1">
            Rendimiento de facturación, densidad horaria de clientes y reportes auditados para fiscalidad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Rango */}
          <div className="flex items-center bg-noir-900 border border-industrial-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                range === '7d' ? 'bg-gold-500 text-black shadow-glow-gold' : 'text-industrial-400 hover:text-white'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                range === '30d' ? 'bg-gold-500 text-black shadow-glow-gold' : 'text-industrial-400 hover:text-white'
              }`}
            >
              Este Mes (30d)
            </button>
          </div>

          {/* Botón Exportación CSV */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs shadow-glow-gold hover:opacity-95 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Exportar CSV Contable
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Facturación Total Período"
          value={`$${kpis.totalRevenue.toFixed(2)}`}
          change="+18.4% vs semana previa"
          icon={DollarSign}
          highlight={true}
          subtitle={`Servicios: $${kpis.servicesRevenue.toFixed(0)} | Retail: $${kpis.productsRevenue.toFixed(0)}`}
        />

        <StatCard
          title="Ticket Promedio por Cliente"
          value={`$${kpis.averageTicket.toFixed(2)}`}
          change="Corte + Producto promedio"
          icon={TrendingUp}
          subtitle="Objetivo del salón: $30.00"
        />

        <StatCard
          title="Tasa de Ocupación de Sillones"
          value={`${kpis.occupancyRatePercent}%`}
          icon={Clock}
          subtitle="Capacidad de sillas aprovechada"
        />

        <StatCard
          title="Ratio Venta Retail / Total"
          value={`${kpis.retailRatioPercent}%`}
          change="Venta cruzada activa"
          icon={ShoppingBag}
          subtitle="Comisión adicional para el barbero"
        />
      </div>

      {/* Gráfico de Facturación Diaria (Barras SVG & Tailwind) */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display font-bold text-white text-base">
              Evolución de Ingresos Diarios
            </h3>
            <p className="text-xs text-industrial-400 mt-0.5">
              Desglose entre Servicios de corte, Productos de barbería y Propinas voluntarias.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-gradient-to-t from-gold-600 to-gold-400"></span> Servicios
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-amber-400"></span> Productos Boutique
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-emerald-400"></span> Propinas
            </span>
          </div>
        </div>

        {/* Bar Chart Visualizer */}
        <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-industrial-800/80 px-2">
          {timeline.map((day) => {
            const heightPercent = maxDayRevenue > 0 ? (day.total / maxDayRevenue) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-noir-950 border border-gold-500/50 rounded-lg p-2 text-center text-[10px] font-mono absolute -translate-y-24 shadow-2xl z-20 pointer-events-none">
                  <div className="font-bold text-white">${day.total.toFixed(2)}</div>
                  <div className="text-gold-400">Serv: ${day.services}</div>
                  <div className="text-amber-300">Prod: ${day.products}</div>
                </div>

                {/* Barra Compuesta */}
                <div className="w-full max-w-[48px] bg-noir-950 rounded-xl overflow-hidden flex flex-col justify-end h-full p-0.5 border border-industrial-800 group-hover:border-gold-500/50 transition-all">
                  <div
                    className="w-full bg-gradient-to-t from-gold-600 to-gold-400 rounded-lg transition-all duration-500"
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  ></div>
                </div>

                <span className="text-xs font-mono font-semibold text-industrial-400 group-hover:text-gold-400 transition-colors">
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Métodos de Pago & Mapa de Calor de Horas Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribución de Métodos de Pago */}
        <div className="lg:col-span-5 bg-noir-900 border border-industrial-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-white text-base mb-1">
              Mix de Medios de Pago
            </h3>
            <p className="text-xs text-industrial-400 mb-6">
              Distribución de ingresos por canal de cobro en el período.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    {paymentMethods.cash.label}
                  </span>
                  <span className="font-bold text-white">
                    ${paymentMethods.cash.amount.toFixed(2)} ({paymentMethods.cash.percent}%)
                  </span>
                </div>
                <div className="w-full bg-noir-950 rounded-full h-2 overflow-hidden border border-industrial-800">
                  <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${paymentMethods.cash.percent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                  <span className="flex items-center gap-2 text-slate-200">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    {paymentMethods.card.label}
                  </span>
                  <span className="font-bold text-white">
                    ${paymentMethods.card.amount.toFixed(2)} ({paymentMethods.card.percent}%)
                  </span>
                </div>
                <div className="w-full bg-noir-950 rounded-full h-2 overflow-hidden border border-industrial-800">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${paymentMethods.card.percent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    {paymentMethods.transfer.label}
                  </span>
                  <span className="font-bold text-white">
                    ${paymentMethods.transfer.amount.toFixed(2)} ({paymentMethods.transfer.percent}%)
                  </span>
                </div>
                <div className="w-full bg-noir-950 rounded-full h-2 overflow-hidden border border-industrial-800">
                  <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${paymentMethods.transfer.percent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-industrial-800 mt-6 text-xs text-industrial-400">
            Los cobros digitales van directo a cuenta bancaria; el efectivo concilia en el arqueo diario.
          </div>
        </div>

        {/* Heatmap de Horas Pico (Demanda Horaria) */}
        <div className="lg:col-span-7 bg-noir-900 border border-industrial-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-white text-base">
                Mapa de Calor de Demanda (Horas Pico)
              </h3>
              <p className="text-xs text-industrial-400 mt-0.5">
                Intensidad de citas por hora para optimizar turnos de personal.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-industrial-400">
              <span className="w-2.5 h-2.5 rounded bg-noir-950 border border-industrial-800"></span> Baja
              <span className="w-2.5 h-2.5 rounded bg-amber-500/40"></span> Media
              <span className="w-2.5 h-2.5 rounded bg-gold-500"></span> Pico Máximo
            </div>
          </div>

          {/* Matriz Heatmap */}
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="text-industrial-500 font-mono text-[10px]">
                  <th className="py-2 text-left font-normal">Día</th>
                  {heatmapData.hours.map(h => (
                    <th key={h} className="py-2 px-1 font-normal">{h.split(':')[0]}h</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/40 font-mono">
                {heatmapData.heatmap.map((row) => (
                  <tr key={row.day}>
                    <td className="py-2.5 text-left font-semibold text-slate-300 pr-2 text-xs">
                      {row.day.slice(0, 3)}
                    </td>
                    {row.slots.map((val, idx) => {
                      const bgClass =
                        val >= 4 ? 'bg-gold-500 text-black font-bold shadow-glow-gold' :
                        val === 3 ? 'bg-amber-500/60 text-black font-semibold' :
                        val === 2 ? 'bg-amber-500/25 text-amber-300' :
                        val === 1 ? 'bg-noir-950 border border-industrial-800 text-industrial-500' :
                        'bg-noir-950/40 text-industrial-700';

                      return (
                        <td key={idx} className="p-1">
                          <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-[10px] transition-transform hover:scale-110 ${bgClass}`}>
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-industrial-800/80 flex items-center justify-between text-xs text-industrial-400">
            <span>Horas con mayor afluencia: <strong className="text-gold-400 font-mono">{heatmapData.busiestHours.join(', ')}</strong></span>
            <span>Días de máxima demanda: <strong className="text-gold-400">{heatmapData.busiestDays.join(', ')}</strong></span>
          </div>
        </div>
      </div>

      {/* Ranking Comparativo de Barberos */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-gold-400" />
            <h3 className="font-display font-bold text-white text-base">
              Tabla de Rendimiento & Productividad del Staff
            </h3>
          </div>
          <span className="text-xs text-industrial-400">
            Evaluación continua del equipo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-noir-950/80 text-industrial-400 border-b border-industrial-800 font-semibold tracking-wider font-mono">
              <tr>
                <th className="px-6 py-3.5">Posición</th>
                <th className="px-6 py-3.5">Barbero</th>
                <th className="px-6 py-3.5">Cortes Realizados</th>
                <th className="px-6 py-3.5">Facturado Bruto</th>
                <th className="px-6 py-3.5">Ticket Medio</th>
                <th className="px-6 py-3.5">Ventas Retail</th>
                <th className="px-6 py-3.5">Comisión Staff</th>
                <th className="px-6 py-3.5 text-right">Satisfacción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans text-xs">
              {rankingData.map((barber, index) => (
                <tr key={barber.barberId} className="hover:bg-noir-850/60 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gold-400 text-sm">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-10 h-10 rounded-xl object-cover border border-industrial-700"
                      />
                      <div>
                        <div className="font-bold text-white text-sm">{barber.name}</div>
                        <div className="text-[10px] text-industrial-400 font-mono">ID: {barber.barberId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    {barber.servicesCompleted} servicios
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gold-400 text-sm">
                    ${barber.grossGenerated.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300">
                    ${barber.averageTicket.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono text-amber-300">
                    {barber.retailSold} uds (${barber.retailRevenue.toFixed(0)})
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    ${barber.commissionEarned.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                    ★ {barber.clientRating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

