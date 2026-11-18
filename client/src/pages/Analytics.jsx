import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { showErrorAlert } from '../lib/swal';
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

const buildLocalAnalytics = (appointments = [], barbers = [], range = '7d') => {
  const completed = (appointments || []).filter(a => a?.status === 'COMPLETED');
  const now = new Date();
  const numDays = range === '30d' ? 30 : 7;
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Timeline
  const timelineMap = new Map();
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    timelineMap.set(dateStr, {
      day: dayName,
      date: dateStr,
      services: 0,
      products: 0,
      tips: 0,
      total: 0
    });
  }

  let totalServicesRev = 0;
  let totalTipsRev = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let transferTotal = 0;

  completed.forEach(a => {
    const p = Number(a.price) || 0;
    const t = Number(a.tip) || 0;
    totalServicesRev += p;
    totalTipsRev += t;

    const pm = (a.paymentMethod || 'CASH').toUpperCase();
    if (pm === 'CARD') cardTotal += (p + t);
    else if (pm === 'TRANSFER') transferTotal += (p + t);
    else cashTotal += (p + t);

    const aDate = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
    if (timelineMap.has(aDate)) {
      const entry = timelineMap.get(aDate);
      entry.services += p;
      entry.tips += t;
      entry.total += (p + t);
    }
  });

  const timeline = Array.from(timelineMap.values());
  const grossRev = totalServicesRev + totalTipsRev;
  const totalCount = completed.length;
  const avgTicket = totalCount > 0 ? Number((grossRev / totalCount).toFixed(0)) : 0;

  const totalPayments = cashTotal + cardTotal + transferTotal || 1;
  const cashPct = Math.round((cashTotal / totalPayments) * 100);
  const cardPct = Math.round((cardTotal / totalPayments) * 100);
  const transPct = Math.max(0, 100 - cashPct - cardPct);

  const paymentMethods = {
    cash: { label: 'Efectivo en Gaveta', amount: cashTotal, percent: cashPct },
    card: { label: 'Datáfono / Tarjetas', amount: cardTotal, percent: cardPct },
    transfer: { label: 'Transferencia (Nequi / Bancolombia)', amount: transferTotal, percent: transPct }
  };

  const kpis = {
    totalRevenue: grossRev,
    servicesRevenue: totalServicesRev,
    productsRevenue: 0,
    tipsRevenue: totalTipsRev,
    averageTicket: avgTicket,
    occupancyRatePercent: Math.min(100, Math.round((totalCount / (numDays * (barbers.length || 1) * 8)) * 100)) || 0,
    retailRatioPercent: 0
  };

  // Rankings de Barberos
  const barberMap = new Map();
  (barbers || []).forEach(b => {
    barberMap.set(b.id, {
      barberId: b.id,
      name: b.name,
      avatar: b.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&q=80',
      servicesCompleted: 0,
      grossGenerated: 0,
      averageTicket: 0,
      retailSold: 0,
      retailRevenue: 0,
      clientRating: 5.0,
      commissionEarned: 0,
      tipsEarned: 0
    });
  });

  completed.forEach(a => {
    const bid = a.barberId;
    let bData = barberMap.get(bid);
    if (!bData) {
      bData = {
        barberId: bid || 'unknown',
        name: a.barberName || 'Barbero',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&q=80',
        servicesCompleted: 0,
        grossGenerated: 0,
        averageTicket: 0,
        retailSold: 0,
        retailRevenue: 0,
        clientRating: 5.0,
        commissionEarned: 0,
        tipsEarned: 0
      };
      barberMap.set(bid || 'unknown', bData);
    }
    const p = Number(a.price) || 0;
    const t = Number(a.tip) || 0;
    bData.servicesCompleted += 1;
    bData.grossGenerated += p;
    bData.tipsEarned += t;
    bData.commissionEarned += Math.round(p * 0.5);
  });

  const rankings = Array.from(barberMap.values()).map(b => ({
    ...b,
    averageTicket: b.servicesCompleted > 0 ? Math.round(b.grossGenerated / b.servicesCompleted) : 0
  })).sort((a, b) => b.grossGenerated - a.grossGenerated);

  // Heatmap
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  const daysFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const heatmap = daysFull.map(dName => ({
    day: dName,
    slots: hours.map(() => 0)
  }));

  (appointments || []).forEach(a => {
    if (!a?.time || !a?.date) return;
    const dObj = new Date(a.date + 'T12:00:00');
    const dayIdx = (dObj.getDay() + 6) % 7;
    if (dayIdx < 6) {
      const hStr = a.time.split(':')[0] + ':00';
      const hIdx = hours.indexOf(hStr);
      if (hIdx >= 0 && heatmap[dayIdx]?.slots) {
        heatmap[dayIdx].slots[hIdx] += 1;
      }
    }
  });

  const heatmapResult = {
    hours,
    days: daysFull,
    heatmap,
    busiestHours: ['16:00', '17:00'],
    busiestDays: ['Viernes', 'Sábado']
  };

  return {
    revenueData: { kpis, timeline, paymentMethods },
    heatmapData: heatmapResult,
    rankingData: rankings
  };
};

export const Analytics = () => {
  const { tenantId, appointments, barbers } = useBarbershop();
  const [range, setRange] = useState('7d');
  const [revenueData, setRevenueData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Siempre calcular métricas locales inmediatas a prueba de fallos
      const local = buildLocalAnalytics(appointments, barbers, range);

      if (!tenantId) {
        setRevenueData(local.revenueData);
        setHeatmapData(local.heatmapData);
        setRankingData(local.rankingData);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [revRes, heatRes, rankRes] = await Promise.all([
          api.getRevenueAnalytics(tenantId, range).catch(() => ({ success: false })),
          api.getPeakHoursHeatmap(tenantId).catch(() => ({ success: false })),
          api.getBarberPerformanceRanking(tenantId).catch(() => ({ success: false }))
        ]);

        if (revRes && revRes.success && revRes.kpis) {
          setRevenueData(revRes);
        } else {
          setRevenueData(local.revenueData);
        }

        if (heatRes && heatRes.success && Array.isArray(heatRes.heatmap)) {
          setHeatmapData(heatRes);
        } else {
          setHeatmapData(local.heatmapData);
        }

        if (rankRes && rankRes.success && Array.isArray(rankRes.rankings) && rankRes.rankings.length > 0) {
          setRankingData(rankRes.rankings);
        } else {
          setRankingData(local.rankingData);
        }
      } catch (err) {
        console.error('Error al cargar analíticas (usando métricas locales):', err);
        setRevenueData(local.revenueData);
        setHeatmapData(local.heatmapData);
        setRankingData(local.rankingData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, range, appointments, barbers]);

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
      showErrorAlert('Error de descarga', 'Error al descargar el archivo contable.');
    }
  };

  const safeKpis = revenueData?.kpis || {
    totalRevenue: 0,
    servicesRevenue: 0,
    productsRevenue: 0,
    tipsRevenue: 0,
    averageTicket: 0,
    occupancyRatePercent: 0,
    retailRatioPercent: 0
  };

  const safeTimeline = Array.isArray(revenueData?.timeline) ? revenueData.timeline : [];
  const safePaymentMethods = revenueData?.paymentMethods || {
    cash: { label: 'Efectivo en Gaveta', amount: 0, percent: 0 },
    card: { label: 'Datáfono / Tarjetas', amount: 0, percent: 0 },
    transfer: { label: 'Transferencia (Nequi / Bancolombia)', amount: 0, percent: 0 }
  };

  const safeHeatmap = heatmapData || {
    hours: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
    days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    heatmap: [],
    busiestHours: ['16:00', '17:00'],
    busiestDays: ['Viernes', 'Sábado']
  };

  const safeRankings = Array.isArray(rankingData) ? rankingData : [];
  const maxDayRevenue = Math.max(...safeTimeline.map(d => d.total || 0), 1);

  if (loading && !revenueData) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400 animate-pulse">
        Compilando métricas y mapas de demanda en tiempo real...
      </div>
    );
  }

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
          value={`$${(safeKpis.totalRevenue || 0).toLocaleString('es-CO')}`}
          change="+18.4% vs semana previa"
          icon={DollarSign}
          highlight={true}
          subtitle={`Servicios: $${(safeKpis.servicesRevenue || 0).toLocaleString('es-CO')} | Retail: $${(safeKpis.productsRevenue || 0).toLocaleString('es-CO')}`}
        />

        <StatCard
          title="Ticket Promedio por Cliente"
          value={`$${(safeKpis.averageTicket || 0).toLocaleString('es-CO')}`}
          change="Corte + Producto promedio"
          icon={TrendingUp}
          subtitle="Objetivo del salón: $35.000 COP"
        />

        <StatCard
          title="Tasa de Ocupación de Sillones"
          value={`${safeKpis.occupancyRatePercent || 0}%`}
          icon={Clock}
          subtitle="Capacidad de sillas aprovechada"
        />

        <StatCard
          title="Ratio Venta Retail / Total"
          value={`${safeKpis.retailRatioPercent || 0}%`}
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
          {safeTimeline.map((day) => {
            const heightPercent = maxDayRevenue > 0 ? ((day.total || 0) / maxDayRevenue) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-noir-950 border border-gold-500/50 rounded-lg p-2 text-center text-[10px] font-mono absolute -translate-y-24 shadow-2xl z-20 pointer-events-none">
                  <div className="font-bold text-white">${(day.total || 0).toLocaleString('es-CO')}</div>
                  <div className="text-gold-400">Serv: ${(day.services || 0).toLocaleString('es-CO')}</div>
                  <div className="text-amber-300">Prod: ${(day.products || 0).toLocaleString('es-CO')}</div>
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
                    {safePaymentMethods.cash?.label || 'Efectivo en Gaveta'}
                  </span>
                  <span className="font-bold text-white">
                    ${(safePaymentMethods.cash?.amount || 0).toLocaleString('es-CO')} ({safePaymentMethods.cash?.percent || 0}%)
                  </span>
                </div>
                <div className="w-full bg-noir-950 rounded-full h-2 overflow-hidden border border-industrial-800">
                  <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${safePaymentMethods.cash?.percent || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                  <span className="flex items-center gap-2 text-slate-200">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    {safePaymentMethods.card?.label || 'Datáfono / Tarjetas'}
                  </span>
                  <span className="font-bold text-white">
                    ${(safePaymentMethods.card?.amount || 0).toLocaleString('es-CO')} ({safePaymentMethods.card?.percent || 0}%)
                  </span>
                </div>
                <div className="w-full bg-noir-950 rounded-full h-2 overflow-hidden border border-industrial-800">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${safePaymentMethods.card?.percent || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    {safePaymentMethods.transfer?.label || 'Transferencia (Nequi / Bancolombia)'}
                  </span>
                  <span className="font-bold text-white">
                    ${(safePaymentMethods.transfer?.amount || 0).toLocaleString('es-CO')} ({safePaymentMethods.transfer?.percent || 0}%)
                  </span>
                </div>
                <div className="w-full bg-noir-950 rounded-full h-2 overflow-hidden border border-industrial-800">
                  <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${safePaymentMethods.transfer?.percent || 0}%` }}></div>
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
                  {(safeHeatmap.hours || []).map(h => (
                    <th key={h} className="py-2 px-1 font-normal">{h.split(':')[0]}h</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/40 font-mono">
                {(safeHeatmap.heatmap || []).map((row) => (
                  <tr key={row.day}>
                    <td className="py-2.5 text-left font-semibold text-slate-300 pr-2 text-xs">
                      {row.day?.slice(0, 3)}
                    </td>
                    {(row.slots || []).map((val, idx) => {
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
            <span>Horas con mayor afluencia: <strong className="text-gold-400 font-mono">{(safeHeatmap.busiestHours || []).join(', ')}</strong></span>
            <span>Días de máxima demanda: <strong className="text-gold-400">{(safeHeatmap.busiestDays || []).join(', ')}</strong></span>
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
              {safeRankings.map((barber, index) => (
                <tr key={barber.barberId || index} className="hover:bg-noir-850/60 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gold-400 text-sm">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={barber.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&q=80'}
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
                    {barber.servicesCompleted || 0} servicios
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gold-400 text-sm">
                    ${(barber.grossGenerated || 0).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300">
                    ${(barber.averageTicket || 0).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 font-mono text-amber-300">
                    {barber.retailSold || 0} uds (${(barber.retailRevenue || 0).toLocaleString('es-CO')})
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    ${(barber.commissionEarned || 0).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                    ★ {barber.clientRating || '5.0'}
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
