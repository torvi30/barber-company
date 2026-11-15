import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import {
  saveFirestoreCashClosure,
  fetchFirestoreCashClosures,
  saveFirestoreCashMovement,
  fetchFirestoreCashMovements,
  deleteFirestoreCashMovement
} from '../services/firestoreService';
import { showSuccessAlert, showErrorAlert, showConfirmDialog } from '../lib/swal';
import {
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ArrowDownCircle,
  Coins,
  CreditCard,
  Smartphone,
  Users,
  Plus,
  Trash2,
  History,
  FileText,
  Clock,
  Sparkles,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  Scissors,
  Filter,
  UserCheck,
  Search
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { id: 'insumos', label: 'Insumos / Cuchillas' },
  { id: 'cafeteria', label: 'Cafetería / Bebidas Clientes' },
  { id: 'almuerzo', label: 'Almuerzo / Viáticos' },
  { id: 'aseo', label: 'Aseo & Limpieza' },
  { id: 'mantenimiento', label: 'Mantenimiento Sillones/Máquinas' },
  { id: 'otro', label: 'Otros Gastos Menores' }
];

export const CashClosure = () => {
  const { tenantId, barbershopInfo, appointments = [], barbers = [] } = useBarbershop();
  const currency = barbershopInfo?.currency || 'COP';

  const [selectedBarberId, setSelectedBarberId] = useState('ALL');
  const [activeTab, setActiveTab] = useState('movements'); // 'movements' | 'settlement' | 'reconciliation' | 'history'
  const [openingCash, setOpeningCash] = useState(100000);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closureResult, setClosureResult] = useState(null);
  const [closureHistory, setClosureHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Formulario de Movimientos (Gastos Menores / Entradas Extra)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [movementCategory, setMovementCategory] = useState('insumos');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');
  const [movementRegistrar, setMovementRegistrar] = useState('Cajero');
  const [savingMovement, setSavingMovement] = useState(false);

  // Formateador de moneda en pesos colombianos o moneda configurada
  const formatMoney = (amount) => {
    const val = Number(amount) || 0;
    if (currency === 'COP') {
      return `$ ${Math.round(val).toLocaleString('es-CO')} COP`;
    }
    return `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const defaultSummary = {
    date: new Date().toISOString().split('T')[0],
    openingCash,
    metrics: {
      completedServicesCount: 0,
      grossRevenue: 0,
      totalCashCollected: 0,
      totalCardCollected: 0,
      totalTransferCollected: 0,
      totalTipsCollected: 0
    },
    drawerReconciliation: {
      openingCash,
      cashInflow: 0,
      cashIncomes: 0,
      cashExpenses: 0,
      expectedCashInDrawer: openingCash
    },
    movements: {
      totalCashIn: 0,
      totalCashOut: 0,
      list: []
    },
    commissions: {
      totalPayout: 0,
      netShopRetained: 0,
      breakdown: []
    }
  };

  // Carga de resumen diario
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
      console.warn('Cargando resumen de caja con valores base:', err.message);
      setSummaryData(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  // Carga de historial de cierres
  const loadHistory = async () => {
    if (!tenantId) return;
    try {
      setLoadingHistory(true);
      const res = await api.getCashClosureHistory(tenantId);
      if (res && res.success && res.data) {
        setClosureHistory(res.data);
      } else {
        // Fallback a Firestore Spark
        const fsClosures = await fetchFirestoreCashClosures(tenantId);
        setClosureHistory(fsClosures);
      }
    } catch (err) {
      console.warn('Error al cargar historial de cierres:', err.message);
      const fsClosures = await fetchFirestoreCashClosures(tenantId);
      setClosureHistory(fsClosures);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [tenantId, openingCash]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, tenantId]);

  if (loading && !summaryData) {
    return (
      <div className="py-20 text-center text-industrial-400 font-mono text-xs animate-pulse flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
        <span>Calculando arqueo de caja e índices de comisiones...</span>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const todayCompletedAppointments = (appointments || []).filter(a => {
    if (!a || a.status !== 'COMPLETED') return false;
    const aDate = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : todayStr);
    return aDate === todayStr;
  });

  const barberFilteredServices = selectedBarberId === 'ALL'
    ? todayCompletedAppointments
    : todayCompletedAppointments.filter(a => a.barberId === selectedBarberId || a.barberName === selectedBarberId);

  // Totales reales en vivo por barbero o globales
  const totalCashCollected = barberFilteredServices
    .filter(a => !a.paymentMethod || a.paymentMethod === 'CASH')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const totalCardCollected = barberFilteredServices
    .filter(a => a.paymentMethod === 'CARD')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const totalTransferCollected = barberFilteredServices
    .filter(a => a.paymentMethod === 'TRANSFER')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const grossRevenue = barberFilteredServices
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const totalTipsCollected = barberFilteredServices
    .reduce((sum, a) => sum + (Number(a.tip) || 0), 0);

  const completedServicesCount = barberFilteredServices.length;

  const rawData = summaryData || defaultSummary;
  const drawerReconciliation = rawData?.drawerReconciliation || defaultSummary.drawerReconciliation;
  const movements = {
    ...defaultSummary.movements,
    ...(rawData?.movements || {}),
    list: Array.isArray(rawData?.movements?.list) ? rawData.movements.list : []
  };

  // Conciliación de caja en vivo
  const salonCashServices = todayCompletedAppointments
    .filter(a => !a.paymentMethod || a.paymentMethod === 'CASH')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const totalCashExpenses = (movements?.list || [])
    .filter(m => m.type === 'EXPENSE')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const totalCashIncomes = (movements?.list || [])
    .filter(m => m.type === 'INCOME')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const calculatedExpectedCash = openingCash + salonCashServices + totalCashIncomes - totalCashExpenses;
  const expectedCash = (drawerReconciliation.expectedCashInDrawer && drawerReconciliation.expectedCashInDrawer !== openingCash)
    ? drawerReconciliation.expectedCashInDrawer
    : calculatedExpectedCash;

  const numericActualCash = actualCash === '' ? expectedCash : Number(actualCash);
  const discrepancy = numericActualCash - expectedCash;
  const suggestedCashDrop = Math.max(0, numericActualCash - openingCash);

  // Liquidaciones por barbero calculadas en vivo
  const calculatedCommissions = (barbers || []).map(b => {
    const bServices = todayCompletedAppointments.filter(a => a.barberId === b.id || a.barberName === b.name);
    const grossGenerated = bServices.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const tipsEarned = bServices.reduce((sum, a) => sum + (Number(a.tip) || 0), 0);
    const rate = Number(b.commissionRate !== undefined ? b.commissionRate : 0.5);
    const ratePercent = Math.round(rate > 1 ? rate : rate * 100);
    const effectiveRate = rate > 1 ? rate / 100 : rate;
    const commissionEarned = Math.round(grossGenerated * effectiveRate);
    const totalPayout = commissionEarned + tipsEarned;
    return {
      barberId: b.id,
      barberName: b.name,
      avatar: b.avatar,
      servicesCompleted: bServices.length,
      commissionRatePercent: ratePercent,
      grossGenerated,
      commissionEarned,
      tipsEarned,
      totalPayout
    };
  });

  const commissions = {
    totalPayout: calculatedCommissions.reduce((sum, c) => sum + c.totalPayout, 0),
    netShopRetained: Math.max(0, grossRevenue - calculatedCommissions.reduce((sum, c) => sum + c.totalPayout, 0)),
    breakdown: calculatedCommissions
  };

  // Feed unificado de movimientos
  const serviceMovements = barberFilteredServices.map(a => ({
    id: `srv-${a.id}`,
    type: 'SERVICE',
    title: a.serviceName || 'Servicio de Barbería',
    subtitle: `Cliente: ${a.clientName || 'Cliente General'}`,
    barberName: a.barberName || 'Barbero Asignado',
    barberId: a.barberId,
    time: a.time || '--:--',
    amount: Number(a.price) || 0,
    tip: Number(a.tip) || 0,
    paymentMethod: a.paymentMethod || 'CASH',
    date: a.date || todayStr
  }));

  const cashMovements = (selectedBarberId === 'ALL' ? (movements?.list || []) : []).map(m => ({
    id: `mov-${m.id}`,
    type: m.type,
    title: m.description || (m.type === 'EXPENSE' ? 'Gasto Menor' : 'Entrada Extraordinaria'),
    subtitle: `Categoría: ${EXPENSE_CATEGORIES.find(c => c.id === m.category)?.label || m.category} • Por: ${m.registeredBy || 'Caja'}`,
    barberName: m.registeredBy || 'Caja',
    barberId: null,
    time: m.time || '--:--',
    amount: Number(m.amount) || 0,
    tip: 0,
    paymentMethod: 'CASH',
    date: m.date || todayStr,
    rawMovement: m
  }));

  const allDailyMovements = [...serviceMovements, ...cashMovements];
  const activeBarberObj = (barbers || []).find(b => b.id === selectedBarberId);
  const selectedBarberName = selectedBarberId === 'ALL' ? 'Todos los Especialistas' : (activeBarberObj?.name || 'Barbero Seleccionado');

  // Ejecución de Cierre Diario con SweetAlert2 y Guardado en Firestore
  const handleExecuteClosure = async (e) => {
    e.preventDefault();

    const isBalanced = discrepancy === 0;
    const confirmMessage = isBalanced
      ? `La caja está perfectamente cuadrada. Se retirará un Cash Drop de ${formatMoney(suggestedCashDrop)}, dejando ${formatMoney(openingCash)} como fondo base para mañana.`
      : discrepancy > 0
      ? `Hay un SOBRANTE de ${formatMoney(discrepancy)}. Se retirarán ${formatMoney(suggestedCashDrop)} dejando el fondo base intacto.`
      : `ATENCIÓN: Hay un FALTANTE de ${formatMoney(Math.abs(discrepancy))}. ¿Deseas formalizar el arqueo con esta discrepancia?`;

    const confirmRes = await showConfirmDialog({
      title: '¿Confirmar Cierre Diario de Caja?',
      text: confirmMessage,
      confirmText: 'Sí, Auditar y Cerrar Jornada',
      cancelText: 'Revisar Conteo',
      icon: isBalanced ? 'question' : 'warning'
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const payload = {
        openingCash: Number(openingCash),
        actualCashInDrawer: Number(numericActualCash),
        cashDropAmount: Number(suggestedCashDrop),
        notes,
        closedBy: 'Gerente en Turno'
      };

      const res = await api.executeCashClosure(tenantId, payload);
      if (res && res.success) {
        setClosureResult(res.data);
        // Persistir copia en Firestore Spark Plan
        await saveFirestoreCashClosure(tenantId, res.data);
        fetchSummary();
        await showSuccessAlert(
          '¡Cierre de Caja Guardado!',
          `Arqueo auditado con éxito. Se guardó el registro ID: ${res.data.id}`
        );
      }
    } catch (err) {
      await showErrorAlert('Error al Cerrar Caja', err.message || 'No se pudo registrar el cierre.');
    }
  };

  // Registrar Movimiento de Caja (Gasto menor o Entrada extraordinaria)
  const handleAddMovement = async (e) => {
    e.preventDefault();
    if (!movementAmount || Number(movementAmount) <= 0) {
      await showErrorAlert('Monto Inválido', 'El monto debe ser superior a 0.');
      return;
    }

    try {
      setSavingMovement(true);
      const payload = {
        type: movementType,
        category: movementCategory,
        amount: Number(movementAmount),
        description: movementDescription,
        registeredBy: movementRegistrar
      };

      const res = await api.addCashMovement(tenantId, payload);
      if (res && res.success) {
        // Persistir en Firestore Spark
        await saveFirestoreCashMovement(tenantId, res.data);
        setIsMovementModalOpen(false);
        setMovementAmount('');
        setMovementDescription('');
        fetchSummary();
        await showSuccessAlert(
          movementType === 'EXPENSE' ? 'Gasto Registrado' : 'Entrada Registrada',
          `${movementType === 'EXPENSE' ? 'Salida de' : 'Ingreso de'} ${formatMoney(payload.amount)} contabilizado en el arqueo.`
        );
      }
    } catch (err) {
      await showErrorAlert('Error al Registrar Movimiento', err.message);
    } finally {
      setSavingMovement(false);
    }
  };

  // Eliminar Movimiento de Caja
  const handleDeleteMovement = async (movId) => {
    const confirmRes = await showConfirmDialog({
      title: '¿Eliminar Movimiento?',
      text: 'Se revertirá este movimiento del cálculo del arqueo de caja.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      icon: 'warning'
    });
    if (!confirmRes.isConfirmed) return;

    try {
      await api.deleteCashMovement(tenantId, movId);
      await deleteFirestoreCashMovement(tenantId, movId);
      fetchSummary();
      await showSuccessAlert('Movimiento Eliminado', 'El arqueo fue actualizado correctamente.');
    } catch (err) {
      await showErrorAlert('Error', err.message);
    }
  };

  // Liquidar a un barbero
  const handleSettleBarber = async (barber) => {
    const confirmRes = await showConfirmDialog({
      title: `¿Liquidar a ${barber.barberName}?`,
      text: `Monto total a entregarle hoy: ${formatMoney(barber.totalPayout)} (Comisión: ${formatMoney(barber.commissionEarned)} + Propinas: ${formatMoney(barber.tipsEarned)}).`,
      confirmText: 'Confirmar Pago',
      cancelText: 'Cancelar',
      icon: 'question'
    });
    if (!confirmRes.isConfirmed) return;

    await showSuccessAlert(
      'Pago Confirmado',
      `Se ha registrado la liquidación de ${barber.barberName} por ${formatMoney(barber.totalPayout)}.`
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Encabezado y Navegación de Caja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-lg shadow-glow-gold flex-shrink-0">
            <Coins className="w-5 h-5 text-noir-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-display font-bold text-slate-900 dark:text-white tracking-wide">
                Caja & Ventas
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                AUDITORÍA EN VIVO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-industrial-400 font-mono mt-0.5">
              Arqueo de gaveta, conciliación de medios de pago y liquidación de barberos.
            </p>
          </div>
        </div>

        {/* Acciones Rápidas del Encabezado */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fondo Base Configurable */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono uppercase font-bold">Base:</span>
            <input
              type="number"
              step="1000"
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
              className="w-24 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:text-gold-400"
              title="Fondo inicial de caja"
            />
          </div>

          {/* Botón Registrar Gasto Menor */}
          <button
            onClick={() => {
              setMovementType('EXPENSE');
              setIsMovementModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-noir-950 hover:bg-slate-200 dark:hover:bg-noir-800 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
            <span>+ Gasto Menor</span>
          </button>
        </div>
      </div>

      {/* Selector de Especialistas / Barberos */}
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-industrial-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <Users className="w-3.5 h-3.5 text-gold-400" />
            Filtrar por Especialista:
          </span>
          {selectedBarberId !== 'ALL' && (
            <button
              onClick={() => setSelectedBarberId('ALL')}
              className="text-[11px] text-gold-500 hover:text-gold-400 font-bold font-mono transition-colors cursor-pointer"
            >
              Mostrar Todos ({todayCompletedAppointments.length}) ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedBarberId('ALL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedBarberId === 'ALL'
                ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
                : 'bg-slate-50 dark:bg-noir-950 text-slate-600 dark:text-industrial-400 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 hover:text-white'
            }`}
          >
            <span>✨ Todos</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              selectedBarberId === 'ALL' ? 'bg-noir-950 text-gold-300' : 'bg-slate-200 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'
            }`}>
              {todayCompletedAppointments.length}
            </span>
          </button>

          {(barbers || []).map((b) => {
            const bCuts = todayCompletedAppointments.filter(a => a.barberId === b.id || a.barberName === b.name).length;
            const isSelected = selectedBarberId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBarberId(b.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
                    : 'bg-slate-50 dark:bg-noir-950 text-slate-600 dark:text-industrial-400 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 hover:text-white'
                }`}
              >
                {b.avatar ? (
                  <img src={b.avatar} alt={b.name} className="w-5 h-5 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-noir-950 text-gold-400' : 'bg-industrial-800 text-gold-400'
                  }`}>
                    {b.name?.charAt(0) || 'B'}
                  </div>
                )}
                <span>{b.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-noir-950 text-gold-300' : 'bg-slate-200 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'
                }`}>
                  {bCuts}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Compacto de Indicadores Clave (2x2 en móvil, 4 col en desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Efectivo Servicios */}
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-mono truncate">
              Efectivo
            </span>
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
            {formatMoney(totalCashCollected)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-industrial-500 mt-0.5 truncate">
            Papel moneda en gaveta
          </p>
        </div>

        {/* Datáfono / Tarjetas */}
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-mono truncate">
              Datáfono
            </span>
            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
            {formatMoney(totalCardCollected)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-industrial-500 mt-0.5 truncate">
            Terminal bancaria
          </p>
        </div>

        {/* Transferencias App */}
        <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-mono truncate">
              Transferencia
            </span>
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
            {formatMoney(totalTransferCollected)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-industrial-500 mt-0.5 truncate">
            Nequi / Bancolombia
          </p>
        </div>

        {/* Facturación Bruta */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-gold-500/10 dark:to-noir-900 border border-amber-500/30 dark:border-gold-500/30 rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-700 dark:text-gold-400 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-mono truncate">
              Facturación
            </span>
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-display font-black text-slate-900 dark:text-white truncate">
            {formatMoney(grossRevenue)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-amber-700/80 dark:text-gold-400/80 mt-0.5 truncate">
            {completedServicesCount} {completedServicesCount === 1 ? 'corte realizado' : 'cortes realizados'}
          </p>
        </div>
      </div>

      {/* Selector de Pestañas de la Caja */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-noir-950 rounded-xl border border-slate-200 dark:border-industrial-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'movements'
              ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
              : 'text-slate-600 dark:text-industrial-400 hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Movimientos del Día</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'movements' ? 'bg-noir-950 text-gold-300' : 'bg-slate-200 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'
          }`}>
            {allDailyMovements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settlement'
              ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
              : 'text-slate-600 dark:text-industrial-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Liquidaciones</span>
          {commissions.breakdown.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'settlement' ? 'bg-noir-950 text-gold-300' : 'bg-slate-200 dark:bg-industrial-800 text-slate-600 dark:text-industrial-300'
            }`}>
              {commissions.breakdown.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'reconciliation'
              ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
              : 'text-slate-600 dark:text-industrial-400 hover:text-white'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Arqueo & Gaveta</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 shadow-glow-gold'
              : 'text-slate-600 dark:text-industrial-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial</span>
        </button>
      </div>

      {/* PESTAÑA 1: ARQUEO Y CIERRE DE HOY */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Banner de Cierre Reciente si se acaba de ejecutar */}
          {closureResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-emerald-800 dark:text-emerald-300 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">¡Cierre de Caja Registrado & Auditado Exitosamente!</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      ID de auditoría: <strong className="font-mono">{closureResult.id}</strong> — Sincronizado en la nube (Spark Plan).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setClosureResult(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-500/20 text-xs font-mono">
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">Cash Drop Retirado:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{formatMoney(closureResult.cashDropAmount)}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">Queda en Gaveta:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{formatMoney(closureResult.remainingCashInDrawer)}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">Estado Arqueo:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{closureResult.discrepancyStatus}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">Cortes Auditados:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{closureResult.totalServicesClosed}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Arqueo de Caja Físico (Conciliación Gaveta vs Cash Drop) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Formulario de Cuadre y Conteo */}
            <div className="lg:col-span-7 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-gold-400" />
                  Conciliación de Efectivo en Gaveta
                </h3>
                <span className="text-xs font-mono text-slate-400 dark:text-industrial-400">
                  {new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Fórmula Matemática Visual */}
              <div className="space-y-2.5 font-mono text-xs bg-slate-50 dark:bg-noir-950 rounded-xl p-4 border border-slate-200 dark:border-industrial-800">
                <div className="flex justify-between items-center text-slate-600 dark:text-industrial-400">
                  <span>(+) Saldo Inicial en Gaveta (Opening):</span>
                  <span className="text-slate-900 dark:text-white font-bold">{formatMoney(drawerReconciliation.openingCash)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-industrial-400">
                  <span>(+) Cobros de Servicios en Efectivo:</span>
                  <span className="text-emerald-500 font-bold">+{formatMoney(drawerReconciliation.cashInflow)}</span>
                </div>
                {drawerReconciliation.cashIncomes > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>(+) Entradas Extraordinarias de Caja:</span>
                    <span className="font-bold">+{formatMoney(drawerReconciliation.cashIncomes)}</span>
                  </div>
                )}
                {drawerReconciliation.cashExpenses > 0 && (
                  <div className="flex justify-between items-center text-rose-400">
                    <span>(-) Gastos Menores y Salidas de Caja:</span>
                    <span className="font-bold">-{formatMoney(drawerReconciliation.cashExpenses)}</span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-slate-200 dark:border-industrial-800 flex justify-between items-center text-slate-900 dark:text-white font-bold text-sm">
                  <span>(=) Total Teórico Esperado en Gaveta:</span>
                  <span className="text-amber-600 dark:text-gold-400 font-display text-base">
                    {formatMoney(expectedCash)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleExecuteClosure} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase font-mono">
                      Efectivo Real Contado en Gaveta
                    </label>
                    <button
                      type="button"
                      onClick={() => setActualCash(String(expectedCash))}
                      className="text-[11px] font-bold text-gold-400 hover:text-gold-300 font-mono underline cursor-pointer"
                    >
                      🎯 Usar Valor Teórico
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="100"
                      required
                      placeholder={String(expectedCash)}
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-3 text-lg font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                    />
                  </div>

                  {/* Botones de conteo rápido */}
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                    {[10000, 20000, 50000, 100000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setActualCash(prev => String((Number(prev) || 0) + inc))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-[10px] font-mono font-bold text-slate-600 dark:text-industrial-400 hover:text-white cursor-pointer whitespace-nowrap"
                      >
                        +{formatMoney(inc).replace(' COP', '')}
                      </button>
                    ))}
                    {actualCash !== '' && (
                      <button
                        type="button"
                        onClick={() => setActualCash('')}
                        className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-mono font-bold hover:bg-rose-500/20 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {/* Banner de Discrepancia en Vivo */}
                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                  discrepancy === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : discrepancy > 0
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {discrepancy === 0 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertOctagon className="w-4 h-4 flex-shrink-0" />}
                    <span>
                      {discrepancy === 0
                        ? 'Caja Perfectamente Cuadrada'
                        : discrepancy > 0
                        ? `Sobrante en Gaveta: +${formatMoney(discrepancy)}`
                        : `Faltante en Gaveta: -${formatMoney(Math.abs(discrepancy))}`}
                    </span>
                  </div>
                  <span className="font-bold">
                    Diferencia: {discrepancy >= 0 ? `+${formatMoney(discrepancy)}` : `-${formatMoney(Math.abs(discrepancy))}`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase mb-1 font-mono">
                    Observaciones del Arqueo / Cierre
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Notas de auditoría, incidencias de cobro o justificación de diferencias..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-sm tracking-wide shadow-glow-gold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-noir-950" />
                  <span>Auditar y Cerrar Jornada (Retirar {formatMoney(suggestedCashDrop)})</span>
                </button>
              </form>
            </div>

            {/* Columna Derecha: Resumen de Retiro (Cash Drop) y Ganancia Neta */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-5 md:p-6 shadow-sm">
                <h4 className="font-display font-bold text-slate-900 dark:text-white text-base mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-gold-400" />
                  Retiro Sugerido (Cash Drop)
                </h4>

                <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20 text-center">
                  <div className="text-xs uppercase tracking-wider text-gold-400 font-bold font-mono">
                    Retiro a Banco / Caja Fuerte
                  </div>
                  <div className="text-3xl font-display font-black text-slate-900 dark:text-white mt-1">
                    {formatMoney(suggestedCashDrop)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-industrial-400 mt-2">
                    Deja intactos los <strong className="text-slate-900 dark:text-white font-mono">{formatMoney(openingCash)}</strong> como fondo base para el turno siguiente.
                  </p>
                </div>

                <div className="mt-5 space-y-3 text-xs pt-4 border-t border-slate-100 dark:border-industrial-800">
                  <div className="flex justify-between text-slate-500 dark:text-industrial-400">
                    <span>Comisiones Totales a Barberos:</span>
                    <span className="text-slate-900 dark:text-white font-mono font-bold">{formatMoney(commissions.totalPayout)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-industrial-400">
                    <span>Ganancia Neta Retenida Barbería:</span>
                    <span className="text-emerald-500 font-mono font-bold">{formatMoney(commissions.netShopRetained)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-industrial-400">
                    <span>Gastos Menores Deducidos:</span>
                    <span className="text-rose-400 font-mono font-bold">-{formatMoney(drawerReconciliation.cashExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Acceso Rápido a Movimientos */}
              <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Gastos Menores del Día</div>
                  <div className="text-[11px] text-slate-500 dark:text-industrial-400">
                    {movements?.list?.length || 0} movimientos registrados hoy
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('movements')}
                  className="px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 text-xs font-bold transition-all cursor-pointer font-mono"
                >
                  Ver Movimientos →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: LIQUIDACIONES DE COMISIONES */}
      {activeTab === 'settlement' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Reparto de Comisiones por Barbero */}
          <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-industrial-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-400" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Reparto y Liquidación de Comisiones
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-industrial-400">
                Fondo total a pagar hoy: <strong className="text-gold-400 font-mono">{formatMoney(commissions.totalPayout)}</strong>
              </span>
            </div>

            {/* Vista Móvil: Tarjetas Compactas */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-industrial-800/60 p-3 space-y-3">
              {commissions.breakdown.map((b) => (
                <div key={b.barberId} className="bg-slate-50 dark:bg-noir-950 p-4 rounded-xl border border-slate-200 dark:border-industrial-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{b.barberName}</span>
                    <span className="text-xs font-mono font-bold text-gold-400 px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                      {b.commissionRatePercent}% pactado
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-slate-400 dark:text-industrial-500 block text-[10px] uppercase">Facturado:</span>
                      <span className="text-slate-900 dark:text-white">{formatMoney(b.grossGenerated)} ({b.servicesCompleted} cortes)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-industrial-500 block text-[10px] uppercase">Comisión + Tips:</span>
                      <span className="text-emerald-500 font-bold">{formatMoney(b.commissionEarned)} + {formatMoney(b.tipsEarned)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-industrial-850 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-500 dark:text-industrial-400 block text-[10px]">Total a Liquidar:</span>
                      <span className="text-base font-bold text-gold-400 font-display">{formatMoney(b.totalPayout)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSettleBarber(b)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500/25 transition-all cursor-pointer"
                    >
                      Pagar
                    </button>
                  </div>
                </div>
              ))}
              {commissions.breakdown.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-industrial-400 font-mono">
                  No hay servicios facturados por especialistas hoy.
                </div>
              )}
            </div>

            {/* Vista Desktop: Tabla Completa */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-noir-950 text-slate-500 dark:text-industrial-400 border-b border-slate-200 dark:border-industrial-800 font-semibold tracking-wider font-mono">
                  <tr>
                    <th className="px-6 py-3.5">Especialista</th>
                    <th className="px-6 py-3.5">Servicios</th>
                    <th className="px-6 py-3.5">Tasa Pactada</th>
                    <th className="px-6 py-3.5">Facturado Bruto</th>
                    <th className="px-6 py-3.5">Comisión</th>
                    <th className="px-6 py-3.5">Propinas (100%)</th>
                    <th className="px-6 py-3.5">Total a Liquidar</th>
                    <th className="px-6 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-industrial-800/60 font-mono text-xs">
                  {commissions.breakdown.map((b) => (
                    <tr key={b.barberId} className="hover:bg-slate-50 dark:hover:bg-noir-850/60 transition-colors">
                      <td className="px-6 py-4 font-sans font-bold text-slate-900 dark:text-white text-sm">
                        {b.barberName}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-industrial-300">
                        {b.servicesCompleted} cortes
                      </td>
                      <td className="px-6 py-4 text-gold-400 font-bold">
                        {b.commissionRatePercent}%
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">
                        {formatMoney(b.grossGenerated)}
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">
                        {formatMoney(b.commissionEarned)}
                      </td>
                      <td className="px-6 py-4 text-emerald-500">
                        +{formatMoney(b.tipsEarned)}
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-gold-400 font-display">
                        {formatMoney(b.totalPayout)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSettleBarber(b)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all font-sans font-bold cursor-pointer"
                        >
                          Liquidar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {commissions.breakdown.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-slate-400 dark:text-industrial-400 font-mono">
                        No hay servicios facturados por especialistas hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 1: MOVIMIENTOS DEL DÍA (SERVICIOS Y GASTOS) */}
      {activeTab === 'movements' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Barra de Contexto del Filtro */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                  Movimientos del Día
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-[10px] font-mono font-bold">
                  {selectedBarberName}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">
                {selectedBarberId === 'ALL'
                  ? 'Consolidado general de todos los servicios cobrados y gastos menores.'
                  : `Visualizando únicamente los servicios completados por ${selectedBarberName}.`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setMovementType('EXPENSE');
                  setIsMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                <span>+ Gasto Menor</span>
              </button>
              <button
                onClick={() => {
                  setMovementType('INCOME');
                  setIsMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Entrada Extra</span>
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen de Movimientos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono font-bold uppercase text-rose-400 mb-0.5">Gastos Menores Deducidos</div>
                <div className="text-xl font-bold font-mono text-rose-400">
                  -{formatMoney(drawerReconciliation.cashExpenses)}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-industrial-500">Insumos y salidas de caja</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono font-bold uppercase text-emerald-400 mb-0.5">Entradas Extraordinarias</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  +{formatMoney(drawerReconciliation.cashIncomes)}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-industrial-500">Ingresos extra en gaveta</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Lista de Movimientos */}
          <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-industrial-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-700 dark:text-industrial-300 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gold-400" />
                Transacciones Registradas ({allDailyMovements.length})
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-industrial-400">
                Total Facturado: <strong className="text-slate-900 dark:text-white font-bold">{formatMoney(grossRevenue)}</strong>
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-industrial-800/60">
              {allDailyMovements.map((mov) => {
                if (mov.type === 'SERVICE') {
                  const methodBadge = {
                    CASH: { label: 'EFECTIVO', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                    CARD: { label: 'DATÁFONO', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
                    TRANSFER: { label: 'TRANSFERENCIA', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' }
                  }[mov.paymentMethod] || { label: mov.paymentMethod, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };

                  return (
                    <div key={mov.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-noir-850/60 transition-colors gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {mov.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${methodBadge.color}`}>
                              {methodBadge.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono mt-0.5 truncate">
                            {mov.subtitle} • <span className="text-gold-400 font-bold">{mov.barberName}</span> • {mov.time}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 font-mono">
                        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {formatMoney(mov.amount)}
                        </div>
                        {mov.tip > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            +{formatMoney(mov.tip)} propina
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Gasto menor o Entrada extraordinaria
                const isExpense = mov.type === 'EXPENSE';
                return (
                  <div key={mov.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-noir-850/60 transition-colors gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        isExpense ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {isExpense ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {mov.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isExpense
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {isExpense ? 'GASTO CAJA' : 'ENTRADA EXTRA'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono mt-0.5 truncate">
                          {mov.subtitle} • {mov.time}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className={`font-mono font-bold text-sm sm:text-base ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isExpense ? '-' : '+'}{formatMoney(mov.amount)}
                      </div>
                      {mov.rawMovement && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMovement(mov.rawMovement.id)}
                          title="Eliminar movimiento"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {allDailyMovements.length === 0 && (
                <div className="p-12 text-center text-xs text-slate-400 dark:text-industrial-400 font-mono space-y-2">
                  <Coins className="w-8 h-8 text-industrial-600 mx-auto opacity-50" />
                  <p>No hay servicios ni movimientos registrados para este filtro hoy.</p>
                  <p className="text-[11px] text-industrial-500">
                    Los cortes atendidos y cobrados en la Agenda se reflejarán automáticamente aquí en vivo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: HISTORIAL DE CIERRES AUDITADOS */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Historial de Cierres Diarios & Auditorías
              </h3>
              <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5">
                Consultas de auditoría previas guardadas en Firestore (Plan Spark).
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="text-xs font-mono font-bold text-gold-400 hover:text-gold-300 cursor-pointer"
            >
              ↻ Actualizar Historial
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-xs text-industrial-400 font-mono animate-pulse">
              Cargando historial de auditorías de caja...
            </div>
          ) : (
            <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-industrial-800/60">
                {closureHistory.map((cl) => {
                  const isBalanced = cl.discrepancy === 0;
                  return (
                    <div key={cl.id} className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-noir-850/60 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${isBalanced ? 'bg-emerald-400' : cl.discrepancy > 0 ? 'bg-sky-400' : 'bg-rose-500'}`} />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {new Date(cl.closedAt).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-industrial-500">
                            {new Date(cl.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isBalanced
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : cl.discrepancy > 0
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {isBalanced ? 'CUADRADA' : cl.discrepancy > 0 ? `SOBRANTE (+${formatMoney(cl.discrepancy)})` : `FALTANTE (-${formatMoney(Math.abs(cl.discrepancy))})`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-50 dark:bg-noir-950 p-3 rounded-xl border border-slate-200 dark:border-industrial-850">
                        <div>
                          <span className="text-slate-400 dark:text-industrial-500 block text-[10px] uppercase">Base Apertura:</span>
                          <span className="text-slate-900 dark:text-white font-bold">{formatMoney(cl.openingCash)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-industrial-500 block text-[10px] uppercase">Efectivo Contado:</span>
                          <span className="text-slate-900 dark:text-white font-bold">{formatMoney(cl.actualCashInDrawer)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-industrial-500 block text-[10px] uppercase">Cash Drop Retirado:</span>
                          <span className="text-gold-400 font-bold">{formatMoney(cl.cashDropAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-industrial-500 block text-[10px] uppercase">Cortes Cerrados:</span>
                          <span className="text-slate-900 dark:text-white font-bold">{cl.totalServicesClosed} servicios</span>
                        </div>
                      </div>

                      {cl.notes && (
                        <div className="text-xs text-slate-500 dark:text-industrial-400 italic">
                          "{cl.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}

                {closureHistory.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400 dark:text-industrial-400 font-mono">
                    No hay registros de cierres anteriores en esta barbería.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Registrar Gasto Menor o Entrada Extraordinaria */}
      {isMovementModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsMovementModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-industrial-800">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                {movementType === 'EXPENSE' ? (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-rose-400" />
                    Registrar Gasto Menor de Caja
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    Registrar Entrada Extraordinaria
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase font-mono mb-1">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('EXPENSE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      movementType === 'EXPENSE'
                        ? 'bg-rose-500 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-noir-950 text-slate-600 dark:text-industrial-400'
                    }`}
                  >
                    Salida / Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('INCOME')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      movementType === 'INCOME'
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-noir-950 text-slate-600 dark:text-industrial-400'
                    }`}
                  >
                    Entrada Extra
                  </button>
                </div>
              </div>

              {movementType === 'EXPENSE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase font-mono mb-1">
                    Categoría del Gasto
                  </label>
                  <select
                    value={movementCategory}
                    onChange={(e) => setMovementCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase font-mono mb-1">
                  Monto en {currency}
                </label>
                <input
                  type="number"
                  step="500"
                  required
                  placeholder="Ej: 15000"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase font-mono mb-1">
                  Descripción o Motivo
                </label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'EXPENSE' ? 'Ej: Compra de 2 paquetes de cuchillas doradas' : 'Ej: Ingreso por devolución'}
                  value={movementDescription}
                  onChange={(e) => setMovementDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-industrial-800">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMovement}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all cursor-pointer ${
                    movementType === 'EXPENSE' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {savingMovement ? 'Guardando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
