import { getTenantCollection, isMock } from '../config/firebase.js';
import { validateCashClosure, AppointmentStatus, PaymentMethod } from '../models/schemas.js';

/**
 * Motor de Cierre de Caja Diario & Arqueo Automatizado (Cash Drop Engine)
 * Integra conciliación de medios de pago, propinas, comisiones de barberos y discrepancias.
 */
export const calculateDailySummary = async (req, res) => {
  try {
    const { barbershopId } = req;
    const openingCash = Number(req.query.openingCash || 100);

    const appointmentsCollection = getTenantCollection(barbershopId, 'appointments');
    const barbersCollection = getTenantCollection(barbershopId, 'barbers');

    let appointments = [];
    let barbers = [];

    if (isMock) {
      appointments = appointmentsCollection.data || [];
      barbers = barbersCollection.data || [];
    } else {
      const aptSnap = await appointmentsCollection.get();
      appointments = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const barberSnap = await barbersCollection.get();
      barbers = barberSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Filtrar solo citas completadas
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

    // 2. Cálculo automatizado de comisiones por barbero
    const barberBreakdowns = barbers.map(barber => {
      const barberApts = completedAppointments.filter(a => a.barberId === barber.id);
      const barberGross = barberApts.reduce((sum, a) => sum + Number(a.price || 0), 0);
      const barberTips = barberApts.reduce((sum, a) => sum + Number(a.tip || 0), 0);
      const commissionRate = Number(barber.commissionRate || 0.50);

      const commissionEarned = Number((barberGross * commissionRate).toFixed(2));
      const totalPayableToBarber = Number((commissionEarned + barberTips).toFixed(2));
      const barbershopNetCut = Number((barberGross - commissionEarned).toFixed(2));

      return {
        barberId: barber.id,
        barberName: barber.name,
        servicesCompleted: barberApts.length,
        commissionRatePercent: commissionRate * 100,
        grossGenerated: barberGross,
        commissionEarned,
        tipsEarned: barberTips,
        totalPayout: totalPayableToBarber,
        barbershopRetained: barbershopNetCut
      };
    });

    const totalCommissionsDue = barberBreakdowns.reduce((sum, b) => sum + b.totalPayout, 0);
    const netShopRetained = Number((grossRevenue - totalCommissionsDue).toFixed(2));
    const expectedCashInDrawer = Number((openingCash + totalCashCollected).toFixed(2));

    return res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
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
          expectedCashInDrawer
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
      openingCash = 100,
      actualCashInDrawer,
      cashDropAmount = 0,
      notes = '',
      closedBy = 'Admin Gerente'
    } = req.body;

    // Ejecución de cálculo base
    const appointmentsCollection = getTenantCollection(barbershopId, 'appointments');
    let appointments = [];
    if (isMock) {
      appointments = appointmentsCollection.data || [];
    } else {
      const snap = await appointmentsCollection.get();
      appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const completed = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
    const cashCollected = completed
      .filter(a => a.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, a) => sum + Number(a.price || 0) + Number(a.tip || 0), 0);

    const expectedCashInDrawer = Number((Number(openingCash) + cashCollected).toFixed(2));
    const discrepancy = Number((Number(actualCashInDrawer) - expectedCashInDrawer).toFixed(2));

    const closureRecord = {
      id: `closure-${Date.now()}`,
      closedAt: new Date().toISOString(),
      closedBy,
      openingCash: Number(openingCash),
      cashCollected,
      expectedCashInDrawer,
      actualCashInDrawer: Number(actualCashInDrawer),
      discrepancy, // Positivo = sobrante, Negativo = faltante, 0 = perfecto
      discrepancyStatus: discrepancy === 0 ? 'BALANCED' : discrepancy > 0 ? 'SURPLUS' : 'DEFICIT',
      cashDropAmount: Number(cashDropAmount),
      remainingCashInDrawer: Number((Number(actualCashInDrawer) - Number(cashDropAmount)).toFixed(2)),
      notes,
      totalServicesClosed: completed.length
    };

    const closuresCollection = getTenantCollection(barbershopId, 'cash_closures');
    if (isMock) {
      closuresCollection.data.push(closureRecord);
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

