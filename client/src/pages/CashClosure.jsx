import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import {
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ArrowDownCircle,
  Coins,
  CreditCard,
  Smartphone,
  Users
} from 'lucide-react';

export const CashClosure = () => {
  const { tenantId, barbershopInfo } = useBarbershop();
  const [openingCash, setOpeningCash] = useState(100);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closureResult, setClosureResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const defaultSummary = {
    metrics: { totalRevenue: 0, cashRevenue: 0, electronicRevenue: 0, serviceCount: 0, retailCount: 0 },
    drawerReconciliation: { openingCash: openingCash || 0, cashIn: 0, cashOut: 0, expectedCashInDrawer: openingCash || 0 },
    commissions: []
  };

  const fetchSummary = async () => {
    if (!tenantId) {
      setSummaryData(defaultSummary);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getCashSummary(tenantId, openingCash);
      if (res && res.success && res.data) {
        setSummaryData(res.data);
      } else {
        setSummaryData(defaultSummary);
      }
    } catch (err) {
      setErrorMsg(err.message);
      setSummaryData(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [tenantId, openingCash]);

  if (loading || !summaryData) {
    return (
      <div className="py-20 text-center text-industrial-400 font-mono text-sm animate-pulse">
        Calculando arqueo de caja e índices de comisiones...
      </div>
    );
  }

  const { metrics, drawerReconciliation, commissions } = summaryData;
  const numericActualCash = actualCash === '' ? drawerReconciliation.expectedCashInDrawer : Number(actualCash);
  const discrepancy = Number((numericActualCash - drawerReconciliation.expectedCashInDrawer).toFixed(2));
  const suggestedCashDrop = Math.max(0, numericActualCash - openingCash);

  const handleExecuteClosure = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        openingCash: Number(openingCash),
        actualCashInDrawer: Number(numericActualCash),
        cashDropAmount: Number(suggestedCashDrop),
        notes,
        closedBy: 'Gerente en Turno'
      };

      const res = await api.executeCashClosure(tenantId, payload);
      if (res.success) {
        setClosureResult(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
            <Coins className="w-6 h-6 text-gold-400" />
            Cierre de Caja Diario & Auditoría (Cash Drop Engine)
          </h2>
          <p className="text-xs text-industrial-400 mt-1">
            Arqueo de efectivo en gaveta física, conciliación de datáfonos/transferencias y distribución automática de comisiones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-industrial-400 font-semibold uppercase">Fondo Base Caja:</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs text-industrial-500">$</span>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
              className="w-24 bg-noir-900 border border-industrial-800 rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>
      </div>

      {closureResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-emerald-400 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <div>
              <h4 className="font-bold text-base text-white">¡Cierre de Caja Registrado & Auditado Exitosamente!</h4>
              <p className="text-xs text-emerald-300">
                Identificador de auditoría: <strong className="font-mono">{closureResult.id}</strong> — Guardado en subcolección multi-tenant.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-emerald-500/20 text-xs font-mono">
            <div>
              <span className="text-emerald-500 block">Efectivo Retirado (Cash Drop):</span>
              <strong className="text-white text-sm">${closureResult.cashDropAmount.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-emerald-500 block">Queda en Gaveta:</span>
              <strong className="text-white text-sm">${closureResult.remainingCashInDrawer.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-emerald-500 block">Estado Arqueo:</span>
              <strong className="text-white text-sm">{closureResult.discrepancyStatus}</strong>
            </div>
            <div>
              <span className="text-emerald-500 block">Servicios Auditados:</span>
              <strong className="text-white text-sm">{closureResult.totalServicesClosed}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Medios de Pago */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-industrial-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Efectivo Recibido</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ${metrics.totalCashCollected.toFixed(2)}
          </div>
          <p className="text-[11px] text-industrial-400 mt-1">Cobros en papel moneda hoy</p>
        </div>

        <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-industrial-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Datáfono / Tarjetas</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ${metrics.totalCardCollected.toFixed(2)}
          </div>
          <p className="text-[11px] text-industrial-400 mt-1">Conciliado directamente con banco</p>
        </div>

        <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-industrial-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Transferencias / App</span>
            <Smartphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ${metrics.totalTransferCollected.toFixed(2)}
          </div>
          <p className="text-[11px] text-industrial-400 mt-1">Bizum, Zelle, MercadoPago</p>
        </div>

        <div className="bg-noir-900 border border-gold-500/30 rounded-2xl p-5 bg-gradient-to-br from-gold-500/10 to-noir-900">
          <div className="flex items-center justify-between text-gold-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Facturación Bruta</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-display text-white">
            ${metrics.grossRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-gold-400/80 mt-1">{metrics.completedServicesCount} servicios finalizados</p>
        </div>
      </div>

      {/* Arqueo de Caja Físico (Cash Drop vs Gaveta) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-noir-900 border border-industrial-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-gold-400" />
            Conciliación de Efectivo Físico en Gaveta
          </h3>

          <div className="space-y-3 font-mono text-sm bg-noir-950 rounded-xl p-4 border border-industrial-800">
            <div className="flex justify-between items-center text-industrial-400">
              <span>(+) Saldo Inicial en Gaveta (Opening):</span>
              <span className="text-white font-bold">${drawerReconciliation.openingCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-industrial-400">
              <span>(+) Cobros del Día en Efectivo:</span>
              <span className="text-emerald-400 font-bold">+${drawerReconciliation.cashInflow.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-industrial-800 flex justify-between items-center text-white font-bold text-base">
              <span>(=) Total Teórico Esperado en Gaveta:</span>
              <span className="text-gold-400">${drawerReconciliation.expectedCashInDrawer.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleExecuteClosure} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Efectivo Real Contado en Gaveta ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder={drawerReconciliation.expectedCashInDrawer.toFixed(2)}
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            {/* Banner de Discrepancia en vivo */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono ${
              discrepancy === 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : discrepancy > 0
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <div className="flex items-center gap-2">
                {discrepancy === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
                <span>
                  {discrepancy === 0 ? 'Caja Perfectamente Cuadrada' :
                   discrepancy > 0 ? `Sobrante en Gaveta: +$${discrepancy.toFixed(2)}` :
                   `Faltante en Gaveta: -$${Math.abs(discrepancy).toFixed(2)}`}
                </span>
              </div>
              <span className="font-bold">
                Diferencia: ${discrepancy.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Observaciones del Arqueo / Cierre
              </label>
              <textarea
                rows="2"
                placeholder="Notas de auditoría, incidencias de pago..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-sm tracking-wide shadow-glow-gold hover:opacity-95 transition-opacity"
            >
              Auditar y Cerrar Jornada (Retirar ${suggestedCashDrop.toFixed(2)})
            </button>
          </form>
        </div>

        {/* Resumen de Retiro y Ganancia Neta */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-6">
            <h4 className="font-display font-bold text-white text-base mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4 text-gold-400" />
              Retiro Sugerido (Cash Drop)
            </h4>

            <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20 text-center">
              <div className="text-xs uppercase tracking-wider text-gold-400 font-bold">
                Retiro a Caja Fuerte / Banco
              </div>
              <div className="text-3xl font-display font-black text-white mt-1">
                ${suggestedCashDrop.toFixed(2)}
              </div>
              <div className="text-[11px] text-industrial-400 mt-2">
                Deja intactos los <strong className="text-white">${openingCash}</strong> como fondo base para el turno de mañana.
              </div>
            </div>

            <div className="mt-6 space-y-3 text-xs">
              <div className="flex justify-between text-industrial-400">
                <span>Comisiones Totales Barberos:</span>
                <span className="text-white font-mono font-bold">${commissions.totalPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-industrial-400">
                <span>Ganancia Neta Retenida Barbería:</span>
                <span className="text-emerald-400 font-mono font-bold">${commissions.netShopRetained.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución Automatizada de Comisiones por Barbero */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-industrial-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gold-400" />
            <h3 className="font-display font-bold text-base text-white">
              Reparto de Comisiones por Barbero
            </h3>
          </div>
          <span className="text-xs text-industrial-400">
            Fondo a liquidar: <strong className="text-gold-400 font-mono">${commissions.totalPayout.toFixed(2)}</strong>
          </span>
        </div>

        {/* Vista Móvil: Tarjetas Compactas */}
        <div className="block md:hidden divide-y divide-industrial-800/60 p-3 space-y-3">
          {commissions.breakdown.map((b) => (
            <div key={b.barberId} className="bg-noir-950 p-4 rounded-xl border border-industrial-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{b.barberName}</span>
                <span className="text-xs font-mono font-bold text-gold-400 px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                  {b.commissionRatePercent}% pactado
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div>
                  <span className="text-industrial-500 block text-[10px] uppercase">Facturado:</span>
                  <span className="text-white">${b.grossGenerated.toFixed(2)} ({b.servicesCompleted} cortes)</span>
                </div>
                <div>
                  <span className="text-industrial-500 block text-[10px] uppercase">Comisión + Tips:</span>
                  <span className="text-emerald-400 font-bold">${b.commissionEarned.toFixed(2)} + ${b.tipsEarned.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-industrial-850 flex items-center justify-between text-xs font-mono">
                <span className="text-industrial-400">Total a Liquidar:</span>
                <span className="text-base font-bold text-gold-400 font-display">${b.totalPayout.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Vista Desktop: Tabla Completa */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-noir-950/80 text-industrial-400 border-b border-industrial-800 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Barbero</th>
                <th className="px-6 py-3.5">Servicios</th>
                <th className="px-6 py-3.5">Tasa Pactada</th>
                <th className="px-6 py-3.5">Facturado Bruto</th>
                <th className="px-6 py-3.5">Comisión (%)</th>
                <th className="px-6 py-3.5">Propinas (100%)</th>
                <th className="px-6 py-3.5">Total a Liquidar</th>
                <th className="px-6 py-3.5 text-right">Margen Barbería</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-mono text-xs">
              {commissions.breakdown.map((b) => (
                <tr key={b.barberId} className="hover:bg-noir-850/60 transition-colors">
                  <td className="px-6 py-4 font-sans font-bold text-white text-sm">
                    {b.barberName}
                  </td>
                  <td className="px-6 py-4 text-industrial-300">
                    {b.servicesCompleted}
                  </td>
                  <td className="px-6 py-4 text-gold-400 font-bold">
                    {b.commissionRatePercent}%
                  </td>
                  <td className="px-6 py-4 text-white">
                    ${b.grossGenerated.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-white font-bold">
                    ${b.commissionEarned.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-emerald-400">
                    +${b.tipsEarned.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-bold text-sm text-gold-400">
                    ${b.totalPayout.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-industrial-300">
                    ${b.barbershopRetained.toFixed(2)}
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

