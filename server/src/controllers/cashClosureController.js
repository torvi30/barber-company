import { getTenantCollection, isMock } from '../config/firebase.js';
import { validateCashClosure, AppointmentStatus, PaymentMethod } from '../models/schemas.js';

/**
 * Motor de Cierre de Caja Diario & Arqueo Automatizado (Cash Drop Engine)
 * Integra conciliación de medios de pago, movimientos de caja (gastos/entradas),
 * propinas, comisiones de barberos y cálculo de discrepancias.
 */
export const calculateDailySummary = async (req, res) => {
  try {
    const { barbershopId } = req;
    const openingCash = Number(req.query.openingCash || 100000);
    const today = new Date().toISOString().split('T')[0];

    const appointmentsCollection = getTenantCollection(barbershopId, 'appointments');
    const barbersCollection = getTenantCollection(barbershopId, 'barbers');
    const movementsCollection = getTenantCollection(barbershopId, 'cash_movements');

    let appointments = [];
    let barbers = [];
    let movements = [];

    if (isMock) {
      appointments = appointmentsCollection.data || [];
      barbers = barbersCollection.data || [];
      movements = movementsCollection.data || [];
    } else {
      const aptSnap = await appointmentsCollection.get();
      appointments = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const barberSnap = await barbersCollection.get();
      barbers = barberSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const movSnap = await movementsCollection.get();
      movements = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Filtrar citas completadas del día
    const completedAppointments = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);

    // 1. Agrupación por métodos de pago
    let totalCashCollected = 0;
    let totalCardCollected = 0;
    let totalTransferCollected = 0;
    let totalTipsCollected = 0;

    completedAppointments.forEach(apt => {
      const price = Number(apt.price || 0);
      const tip = Number(apt.tip || 0);
      totalTipsCollected += tip;

      if (apt.paymentMethod === PaymentMethod.CASH) {
        totalCashCollected += (price + tip);
      } else if (apt.paymentMethod === PaymentMethod.CARD) {
        totalCardCollected += (price + tip);
      } else if (apt.paymentMethod === PaymentMethod.TRANSFER) {
        totalTransferCollected += (price + tip);
      } else {
        totalCashCollected += (price + tip);
      }
    });

    const grossRevenue = totalCashCollected + totalCardCollected + totalTransferCollected;

    // 2. Movimientos de caja del día (Gastos menores y Entradas extraordinarias)
    const todayMovements = movements.filter(m => !m.date || m.date === today);
    const cashExpenses = todayMovements
      .filter(m => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const cashIncomes = todayMovements
      .filter(m => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount || 0), 0);

    // 3. Cálculo automatizado de comisiones por barbero
    const barberBreakdowns = barbers.map(barber => {
      const barberApts = completedAppointments.filter(a => a.barberId === barber.id);
      const barberGross = barberApts.reduce((sum, a) => sum + Number(a.price || 0), 0);
      const barberTips = barberApts.reduce((sum, a) => sum + Number(a.tip || 0), 0);
      const commissionRate = Number(barber.commissionRate || 0.50);

      const commissionEarned = Math.round(barberGross * commissionRate);
      const totalPayableToBarber = commissionEarned + barberTips;
      const barbershopNetCut = barberGross - commissionEarned;

      return {
        barberId: barber.id,
        barberName: barber.name,
        avatar: barber.avatar || null,
        servicesCompleted: barberApts.length,
        commissionRatePercent: Math.round(commissionRate * 100),
        grossGenerated: barberGross,
        commissionEarned,
        tipsEarned: barberTips,
        totalPayout: totalPayableToBarber,
        barbershopRetained: barbershopNetCut
      };
    });

    const totalCommissionsDue = barberBreakdowns.reduce((sum, b) => sum + b.totalPayout, 0);
    const netShopRetained = grossRevenue - totalCommissionsDue;
    
    // Fórmula matemática del arqueo:
    // Fondo Inicial + Cobros Efectivo + Entradas Extra - Gastos Menores
    const expectedCashInDrawer = Math.max(0, openingCash + totalCashCollected + cashIncomes - cashExpenses);

    return res.json({
      success: true,
      data: {
        date: today,
        openingCash,
        metrics: {
          completedServicesCount: completedAppointments.length,
          grossRevenue,
          totalCashCollected,
          totalCardCollected,
          totalTransferCollected,
          totalTipsCollected
        },
        drawerReconciliation: {
          openingCash,
          cashInflow: totalCashCollected,
          cashIncomes,
          cashExpenses,
          expectedCashInDrawer
        },
        movements: {
          totalCashIn: cashIncomes,
          totalCashOut: cashExpenses,
          list: todayMovements
        },
        commissions: {
          totalPayout: totalCommissionsDue,
          netShopRetained,
          breakdown: barberBreakdowns
        }
      }
    });
  } catch (error) {
    console.error('Error al generar resumen de cierre:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Formalización del Cierre de Caja con Arqueo Físico (Cash Drop Audit)
 */
export const executeCashClosure = async (req, res) => {
  try {
    const { barbershopId } = req;
    const validation = validateCashClosure(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const {
      openingCash = 100000,
      actualCashInDrawer,
      cashDropAmount = 0,
      notes = '',
      closedBy = 'Admin Gerente'
    } = req.body;

    const appointmentsCollection = getTenantCollection(barbershopId, 'appointments');
    const movementsCollection = getTenantCollection(barbershopId, 'cash_movements');

    let appointments = [];
    let movements = [];
    if (isMock) {
      appointments = appointmentsCollection.data || [];
      movements = movementsCollection.data || [];
    } else {
      const snap = await appointmentsCollection.get();
      appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const movSnap = await movementsCollection.get();
      movements = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const today = new Date().toISOString().split('T')[0];
    const completed = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
    const cashCollected = completed
      .filter(a => a.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, a) => sum + Number(a.price || 0) + Number(a.tip || 0), 0);

    const todayMovements = movements.filter(m => !m.date || m.date === today);
    const cashExpenses = todayMovements
      .filter(m => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const cashIncomes = todayMovements
      .filter(m => m.type === 'INCOME')
      .reduce((sum, m) => sum + Number(m.amount || 0), 0);

    const expectedCashInDrawer = Math.max(0, Number(openingCash) + cashCollected + cashIncomes - cashExpenses);
    const discrepancy = Number(actualCashInDrawer) - expectedCashInDrawer;

    const closureRecord = {
      id: `closure-${Date.now()}`,
      closedAt: new Date().toISOString(),
      closedBy,
      openingCash: Number(openingCash),
      cashCollected,
      cashIncomes,
      cashExpenses,
      expectedCashInDrawer,
      actualCashInDrawer: Number(actualCashInDrawer),
      discrepancy, // Positivo = sobrante, Negativo = faltante, 0 = perfecto
      discrepancyStatus: discrepancy === 0 ? 'BALANCED' : discrepancy > 0 ? 'SURPLUS' : 'DEFICIT',
      cashDropAmount: Number(cashDropAmount),
      remainingCashInDrawer: Math.max(0, Number(actualCashInDrawer) - Number(cashDropAmount)),
      notes,
      totalServicesClosed: completed.length
    };

    const closuresCollection = getTenantCollection(barbershopId, 'cash_closures');
    if (isMock) {
      closuresCollection.data.unshift(closureRecord);
    } else {
      const doc = await closuresCollection.add(closureRecord);
      closureRecord.id = doc.id;
    }

    // Notificar a clientes conectados vía Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('cash:closed', {
        barbershopId,
        closure: closureRecord
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Cierre de caja completado y auditado con éxito.',
      data: closureRecord
    });
  } catch (error) {
    console.error('Error al ejecutar cierre de caja:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener historial de cierres de caja anteriores (Auditorías)
 */
export const getCashClosureHistory = async (req, res) => {
  try {
    const { barbershopId } = req;
    const closuresCollection = getTenantCollection(barbershopId, 'cash_closures');

    let closures = [];
    if (isMock) {
      closures = closuresCollection.data || [];
    } else {
      const snap = await closuresCollection.orderBy('closedAt', 'desc').limit(30).get();
      closures = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return res.json({
      success: true,
      data: closures
    });
  } catch (error) {
    console.error('Error al obtener historial de cierres:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Registrar un movimiento de caja (Gasto menor o Entrada extraordinaria)
 */
export const addCashMovement = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { type = 'EXPENSE', category = 'insumos', amount, description = '', registeredBy = 'Cajero' } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser mayor a 0' });
    }

    const movement = {
      id: `mov-${Date.now()}`,
      type: type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      category: category || 'insumos',
      amount: Number(amount),
      description: description.trim() || (type === 'EXPENSE' ? 'Gasto menor de caja' : 'Entrada extraordinaria'),
      registeredBy,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    const movementsCollection = getTenantCollection(barbershopId, 'cash_movements');
    if (isMock) {
      movementsCollection.data.unshift(movement);
    } else {
      const doc = await movementsCollection.add(movement);
      movement.id = doc.id;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('cash:movement_added', { barbershopId, movement });
    }

    return res.status(201).json({
      success: true,
      data: movement
    });
  } catch (error) {
    console.error('Error al agregar movimiento de caja:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar un movimiento de caja (en caso de error)
 */
export const deleteCashMovement = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;

    const movementsCollection = getTenantCollection(barbershopId, 'cash_movements');
    if (isMock) {
      movementsCollection.data = movementsCollection.data.filter(m => m.id !== id);
    } else {
      await movementsCollection.doc(id).delete();
    }

    return res.json({
      success: true,
      message: 'Movimiento eliminado correctamente.'
    });
  } catch (error) {
    console.error('Error al eliminar movimiento de caja:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
