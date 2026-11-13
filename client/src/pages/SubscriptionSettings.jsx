import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { showSuccessAlert } from '../lib/swal';
import {
  CreditCard,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Lock,
  Download,
  Users,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';

export const SubscriptionSettings = () => {
  const { tenantId, barbershopInfo } = useBarbershop();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('stripe');
  const [actionLoading, setActionLoading] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Cargar estado de suscripción y planes
  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [statusRes, plansRes] = await Promise.all([
        tenantId ? api.getSubscriptionStatus(tenantId) : Promise.resolve({ success: false }),
        api.getSubscriptionPlans()
      ]);

      if (statusRes && statusRes.success) {
        setSubscription(statusRes.data);
      }
      if (plansRes && plansRes.success) {
        setPlans(plansRes.data);
      }
    } catch (error) {
      console.warn('Error cargando datos de suscripción:', error);
      setStatusMessage({
        type: 'error',
        text: error.message || 'No se pudo cargar la información de facturación.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [tenantId]);

  // Iniciar Checkout con Pasarela
  const handleUpgradePlan = async (planId) => {
    try {
      setActionLoading(true);
      setStatusMessage(null);

      const res = await api.createCheckoutSession(tenantId, planId, 'month', selectedGateway);

      if (res.success && res.checkoutUrl) {
        if (res.simulated) {
          setStatusMessage({
            type: 'info',
            text: `Sesión de pago simulada (${res.provider.toUpperCase()}). Redirigiendo...`
          });
          // Para testing abrimos o recargamos en 1.5s
          setTimeout(() => {
            window.open(res.checkoutUrl, '_blank');
            loadSubscriptionData();
          }, 1000);
        } else {
          // Redirección real de Stripe Checkout
          window.location.href = res.checkoutUrl;
        }
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error.message || 'Error al iniciar checkout de suscripción.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Simular eventos de webhook (Éxito o Fallo de pago)
  const handleSimulateWebhook = async (eventType, planId) => {
    try {
      setActionLoading(true);
      setStatusMessage(null);

      const res = await api.simulateSubscriptionPayment(tenantId, eventType, planId);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Evento simulado (${eventType}): ${res.message}`
        });
        await loadSubscriptionData();
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error.message || 'Error al simular evento de pago.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Disparar escaneo de citas para recordatorios de WhatsApp
  const handleRunReminderCron = async () => {
    try {
      setCronLoading(true);
      setStatusMessage(null);

      const res = await api.runReminderCronNow(tenantId);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Escaneo de citas ejecutado con éxito. Recordatorios WhatsApp disparados: ${res.remindersSent}`
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error.message || 'Error al ejecutar cron de recordatorios.'
      });
    } finally {
      setCronLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-industrial-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-gold-400" />
        <span className="text-sm font-medium">Consultando estado de facturación del SaaS...</span>
      </div>
    );
  }

  const currentPlan = subscription?.currentPlan || { id: 'pro', name: 'Plan Pro Black Edition', price: 59 };
  const isPastDue = subscription?.subscriptionStatus === 'past_due';
  const isCanceled = subscription?.subscriptionStatus === 'canceled';
  const isActive = subscription?.subscriptionStatus === 'active';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Banner Superior */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-industrial-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-gold-400 mb-1">
            <CreditCard className="w-4 h-4 text-gold-400" />
            BarberPulse OS • Facturación & Licencia SaaS
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white">
            Suscripción & Plan del Negocio
          </h1>
          <p className="text-sm text-industrial-400 mt-1">
            Gestiona la categoría de tu barbería, pasarelas de pago recurrentes y límites operativos.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadSubscriptionData}
            title="Refrescar estado"
            className="p-2.5 rounded-xl bg-noir-900 border border-industrial-800 text-industrial-400 hover:text-white hover:border-gold-500/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div
            className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isPastDue
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isActive ? 'bg-emerald-400 animate-pulse' : isPastDue ? 'bg-amber-400' : 'bg-rose-500'
              }`}
            />
            <span>
              {isActive ? 'Suscripción Activa' : isPastDue ? 'Pago Pendiente (Mora)' : 'Servicio Suspendido'}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Feedback / Alertas */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              : 'bg-gold-950/40 border-gold-500/30 text-gold-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-gold-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-industrial-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Resumen del Plan Actual y Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta Plan Actual */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-noir-900 to-noir-950 border border-gold-500/30 shadow-glow-gold/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-gold-400 mb-1">
                <Crown className="w-4 h-4 text-gold-400" />
                PLAN ACTUAL EN ESTA SUCURSAL
              </div>
              <h2 className="text-2xl font-display font-black text-white flex items-center gap-3">
                {currentPlan.name}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/40 font-mono">
                  ${currentPlan.price} USD / mes
                </span>
              </h2>
            </div>

            <div className="text-right">
              <span className="text-xs text-industrial-400 block">Próxima Fecha de Corte</span>
              <span className="text-sm font-mono font-bold text-white flex items-center gap-1.5 justify-end mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  : '30 días desde activación'}
              </span>
            </div>
          </div>

          {/* Grid de Capacidades del Plan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-industrial-800 text-xs">
            <div className="p-3 rounded-xl bg-noir-950/80 border border-industrial-800/80">
              <span className="text-[11px] text-industrial-400 block mb-1">Sillones / Barberos</span>
              <span className="font-mono font-bold text-white text-sm">
                {currentPlan.limits?.maxBarbers > 50 ? 'ILIMITADOS' : `Hasta ${currentPlan.limits?.maxBarbers}`}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-noir-950/80 border border-industrial-800/80">
              <span className="text-[11px] text-industrial-400 block mb-1">WhatsApp Cloud API</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentPlan.limits?.whatsappAutomation ? 'Activo (Cron 15m)' : 'No incluido'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-noir-950/80 border border-industrial-800/80">
              <span className="text-[11px] text-industrial-400 block mb-1">CRM Fichas VIP</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentPlan.limits?.crmStyleSheets ? 'Habilitado' : 'No incluido'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-noir-950/80 border border-industrial-800/80">
              <span className="text-[11px] text-industrial-400 block mb-1">Tienda Boutique</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentPlan.limits?.boutiqueStore ? 'Click & Collect' : 'No incluido'}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas y Automatizaciones */}
        <div className="p-6 rounded-2xl bg-noir-900 border border-industrial-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-industrial-400 mb-2">
              <Zap className="w-4 h-4 text-gold-400" />
              DISPARADORES DE AUTOMATIZACIÓN
            </div>
            <h3 className="font-display font-bold text-white text-base mb-1">
              Motor de Recordatorios WhatsApp
            </h3>
            <p className="text-xs text-industrial-400 leading-relaxed mb-4">
              El cron job en segundo plano escanea turnos cada 15 min. Puedes disparar una revisión manual ahora.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleRunReminderCron}
              disabled={cronLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-noir-950 border border-industrial-700 hover:border-gold-500/50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {cronLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold-400" />
                  <span>Escaneando turnos en Firestore...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Disparar Recordatorios WhatsApp Ahora</span>
                </>
              )}
            </button>

            {/* Simulador para Testing de Webhook */}
            <div className="pt-2 border-t border-industrial-800">
              <div className="text-[10px] uppercase tracking-wider font-mono text-industrial-500 mb-1.5">
                Simulador Webhooks de Pago (Testing)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSimulateWebhook('invoice.payment_succeeded', 'pro')}
                  disabled={actionLoading}
                  className="py-1.5 px-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium transition-colors"
                >
                  Simular Pago Exitoso
                </button>
                <button
                  onClick={() => handleSimulateWebhook('invoice.payment_failed', currentPlan.id)}
                  disabled={actionLoading}
                  className="py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-[11px] text-rose-300 font-medium transition-colors"
                >
                  Simular Pago Fallido
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Pasarela y Comparativa de Planes */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-black text-white">
              Planes BarberPulse OS Disponibles
            </h2>
            <p className="text-xs text-industrial-400">
              Escoge el plan adecuado según la escala de tu negocio o actualiza tu suscripción en 1 clic.
            </p>
          </div>

          {/* Pasarela Selector */}
          <div className="flex items-center gap-2 p-1 bg-noir-900 border border-industrial-800 rounded-xl text-xs">
            <span className="text-industrial-500 text-[11px] pl-2 font-mono">Pasarela:</span>
            <button
              onClick={() => setSelectedGateway('stripe')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedGateway === 'stripe'
                  ? 'bg-gold-500 text-noir-950 shadow-sm'
                  : 'text-industrial-400 hover:text-white'
              }`}
            >
              Stripe Global
            </button>
            <button
              onClick={() => setSelectedGateway('mercadopago')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                selectedGateway === 'mercadopago'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-industrial-400 hover:text-white'
              }`}
            >
              Mercado Pago LATAM
            </button>
          </div>
        </div>

        {/* Tarjetas de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Plan Básico */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              currentPlan.id === 'basic'
                ? 'bg-noir-900 border-industrial-600 shadow-lg'
                : 'bg-noir-900/60 border-industrial-800 hover:border-industrial-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-black text-lg text-white">
                    Plan Básico Essential
                  </h3>
                  <p className="text-xs text-industrial-400">
                    Ideal para barberos independientes o negocios con 1-2 sillas.
                  </p>
                </div>
                {currentPlan.id === 'basic' && (
                  <span className="px-2.5 py-1 rounded-full bg-industrial-800 text-industrial-300 border border-industrial-700 text-[10px] font-mono font-bold uppercase">
                    Plan Actual
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 my-6 font-mono">
                <span className="text-3xl font-black text-white">$29</span>
                <span className="text-xs text-industrial-400">USD / mes</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-industrial-400 flex-shrink-0 mt-0.5" />
                  <span>Hasta <strong>2 Barberos</strong> activos en simultáneo</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-industrial-400 flex-shrink-0 mt-0.5" />
                  <span>Agenda digital y turnos Walk-In ilimitados</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-industrial-400 flex-shrink-0 mt-0.5" />
                  <span>Control de caja diario y arqueo básico</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-industrial-400 flex-shrink-0 mt-0.5" />
                  <span>Control de inventario de suministros</span>
                </li>
                <li className="flex items-start gap-2.5 text-industrial-500">
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Sin recordatorios automáticos de WhatsApp</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-industrial-800/80">
              <button
                onClick={() => handleUpgradePlan('basic')}
                disabled={actionLoading || currentPlan.id === 'basic'}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                  currentPlan.id === 'basic'
                    ? 'bg-noir-950 text-industrial-500 border border-industrial-800 cursor-default'
                    : 'bg-noir-800 hover:bg-noir-700 text-white border border-industrial-700'
                }`}
              >
                {currentPlan.id === 'basic' ? 'Tu Plan Actual' : 'Cambiar a Plan Básico'}
              </button>
            </div>
          </div>

          {/* Plan Pro Black Edition */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
              currentPlan.id === 'pro'
                ? 'bg-gradient-to-br from-noir-900 via-noir-900 to-gold-950/20 border-gold-500/50 shadow-glow-gold/20'
                : 'bg-noir-900 border-gold-500/30 hover:border-gold-500/60'
            }`}
          >
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-gold-500 text-noir-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                MÁS POPULAR
              </span>
            </div>

            <div>
              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-gold-400 text-xs font-mono font-bold mb-1">
                  <Crown className="w-4 h-4" /> RECOMENDADO PARA CRECER
                </div>
                <h3 className="font-display font-black text-xl text-white">
                  Plan Pro Black Edition
                </h3>
                <p className="text-xs text-industrial-400">
                  Para barberías establecidas que buscan automatización y máxima rentabilidad.
                </p>
              </div>

              <div className="flex items-baseline gap-1 my-6 font-mono">
                <span className="text-3xl font-black text-gold-400">$59</span>
                <span className="text-xs text-industrial-400">USD / mes</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Barberos y sillones ILIMITADOS</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Automatización oficial <strong>WhatsApp Cloud API</strong> & Cron Jobs</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>CRM de Clientes & Fichas Técnicas de Corte VIP</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Tienda Boutique Online con Click & Collect</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Analíticas BI, Heatmaps & Exportador Contable CSV</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-industrial-800/80">
              <button
                onClick={() => handleUpgradePlan('pro')}
                disabled={actionLoading || (currentPlan.id === 'pro' && isActive)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  currentPlan.id === 'pro' && isActive
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 cursor-default'
                    : 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-noir-950 shadow-glow-gold'
                }`}
              >
                {currentPlan.id === 'pro' && isActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tu Plan Actual (Pro Activo)</span>
                  </>
                ) : (
                  <>
                    <span>Actualizar a Plan Pro</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Facturación y Recibos */}
      <div className="p-6 rounded-2xl bg-noir-900 border border-industrial-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gold-400" />
            <h3 className="font-display font-bold text-base text-white">
              Historial de Facturación & Comprobantes
            </h3>
          </div>
          <span className="text-xs text-industrial-400 font-mono">
            {subscription?.stripeCustomerId ? `Stripe ID: ${subscription.stripeCustomerId}` : 'Cuenta Facturada'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-noir-950/60 text-industrial-400 font-mono uppercase tracking-wider border-b border-industrial-800">
              <tr>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-mono font-medium text-white">#INV-2026-004</td>
                <td className="py-3.5 px-4 font-mono">
                  {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3.5 px-4">{currentPlan.name} (Mensual)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-white">${currentPlan.price}.00 USD</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                    PAGADA
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => showSuccessAlert('Comprobante Contable', 'Recibo de pago en PDF generado y enviado a tu correo.')}
                    className="p-1.5 rounded-lg bg-noir-950 border border-industrial-800 text-industrial-400 hover:text-white transition-colors"
                    title="Descargar Comprobante PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-mono font-medium text-white">#INV-2026-003</td>
                <td className="py-3.5 px-4 font-mono">10 Ene 2026</td>
                <td className="py-3.5 px-4">Plan Pro Black Edition (Mensual)</td>
                <td className="py-3.5 px-4 font-mono font-bold text-white">$59.00 USD</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                    PAGADA
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => showSuccessAlert('Comprobante Contable', 'Recibo de pago en PDF generado y enviado a tu correo.')}
                    className="p-1.5 rounded-lg bg-noir-950 border border-industrial-800 text-industrial-400 hover:text-white transition-colors"
                    title="Descargar Comprobante PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSettings;

