import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldAlert,
  Crown,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  Calendar,
  MapPin,
  Phone,
  Scissors,
  ArrowUpRight,
  Mail,
  Copy,
  Key,
  ShoppingBag
} from 'lucide-react';

export const SuperAdminConsole = () => {
  const { switchTenant } = useBarbershop();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState('all');

  // Modal WhatsApp
  const [selectedTenantForWA, setSelectedTenantForWA] = useState(null);
  const [waAlertType, setWaAlertType] = useState('expiring_soon');
  const [waLoading, setWaLoading] = useState(false);
  const [waPreview, setWaPreview] = useState(null);

  // Modal de Extensión
  const [selectedTenantForExtend, setSelectedTenantForExtend] = useState(null);
  const [extendDaysInput, setExtendDaysInput] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Modal de Invitación a Administrador
  const [selectedTenantForInvite, setSelectedTenantForInvite] = useState(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleOpenInviteModal = (tenant) => {
    setSelectedTenantForInvite(tenant);
    setInviteName(tenant.ownerName || '');
    setInviteEmail(tenant.ownerEmail || `admin@${tenant.slug || 'barberia'}.com`);
    setInvitePhone(tenant.whatsapp || '');
    setInvitePassword(`Barber${Math.floor(1000 + Math.random() * 9000)}!`);
    setInviteResult(null);
    setCopiedLink(false);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedTenantForInvite) return;
    try {
      setInviteLoading(true);
      const res = await api.inviteAdmin({
        barbershopId: selectedTenantForInvite.id,
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        phone: invitePhone
      });
      if (res.success) {
        setInviteResult(res);
      }
    } catch (err) {
      alert('Error al generar invitación: ' + err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Cargar datos del SuperAdmin
  const loadMasterData = async () => {
    try {
      setLoading(true);
      const [metRes, tenRes] = await Promise.all([
        api.getSuperAdminMetrics(),
        api.getSuperAdminTenants()
      ]);

      if (metRes.success) setMetrics(metRes.data);
      if (tenRes.success) setTenants(tenRes.data);
    } catch (error) {
      console.error('Error cargando datos de SuperAdmin:', error);
      setFeedbackMessage({
        type: 'error',
        text: 'Error de conexión con la Casa Nodriza: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Generar preview de WhatsApp al abrir el modal o cambiar el tipo de alerta
  const handleOpenWhatsAppModal = async (tenant, defaultType = 'expiring_soon') => {
    setSelectedTenantForWA(tenant);
    setWaAlertType(defaultType);
    setWaLoading(true);
    try {
      const res = await api.getSuperAdminWhatsAppAlert(tenant.id, defaultType);
      if (res.success) {
        setWaPreview(res);
      }
    } catch (err) {
      console.error('Error generando WhatsApp alert:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleUpdateWaType = async (type) => {
    setWaAlertType(type);
    if (!selectedTenantForWA) return;
    setWaLoading(true);
    try {
      const res = await api.getSuperAdminWhatsAppAlert(selectedTenantForWA.id, type);
      if (res.success) {
        setWaPreview(res);
      }
    } catch (err) {
      console.error('Error al actualizar tipo de alerta:', err);
    } finally {
      setWaLoading(false);
    }
  };

  // Extender o cambiar estado de suscripción
  const handleExtendSubscription = async (tenantId, days) => {
    try {
      setActionLoading(true);
      const res = await api.updateSuperAdminTenantSubscription(tenantId, {
        extendDays: days,
        status: 'active'
      });

      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Suscripción extendida +${days} días con éxito.`
        });
        setSelectedTenantForExtend(null);
        await loadMasterData();
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al extender suscripción: ' + err.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspendTenant = async (tenant) => {
    const newStatus = tenant.subscriptionStatus === 'suspended' ? 'active' : 'suspended';
    const confirmAction = window.confirm(
      `¿Estás seguro de ${newStatus === 'suspended' ? 'SUSPENDER' : 'REACTIVAR'} a "${tenant.name}"?`
    );
    if (!confirmAction) return;

    try {
      setActionLoading(true);
      const res = await api.updateSuperAdminTenantSubscription(tenant.id, {
        status: newStatus
      });

      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Estado de "${tenant.name}" actualizado a ${newStatus.toUpperCase()}`
        });
        await loadMasterData();
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al cambiar estado: ' + err.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Alternar activación de la Tienda Boutique de un negocio
  const handleToggleStoreTenant = async (tenant) => {
    try {
      setActionLoading(true);
      const nextStatus = !(tenant.storeEnabled !== false);
      const res = await api.updateBarbershopSettings(tenant.id, { storeEnabled: nextStatus });
      if (res.success) {
        setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, storeEnabled: nextStatus } : t));
        setFeedbackMessage({
          type: 'success',
          text: `Tienda Boutique ${nextStatus ? 'activada' : 'desactivada'} para "${tenant.name}".`
        });
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al cambiar estado de tienda: ' + err.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrado de tenants (todas son barberías — sin filtro de vertical)
  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMunicipality = selectedMunicipality === 'all' || t.municipality === selectedMunicipality;

    let matchesStatus = true;
    if (selectedStatus === 'urgent') matchesStatus = t.urgencyLevel === 'WARNING' || t.urgencyLevel === 'DANGER';
    else if (selectedStatus === 'past_due') matchesStatus = t.billingStatus === 'PAST_DUE';
    else if (selectedStatus === 'active') matchesStatus = t.billingStatus === 'ACTIVE';
    else if (selectedStatus === 'suspended') matchesStatus = t.billingStatus === 'SUSPENDED';

    return matchesSearch && matchesMunicipality && matchesStatus;
  });

  // Lista única de municipios para el filtro
  const uniqueMunicipalities = Array.from(new Set(tenants.map(t => t.municipality).filter(Boolean)));

  // Icono único para todas las barberías
  const getBarberShopIcon = () => (
    <Scissors className="w-3.5 h-3.5 text-gold-400" />
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header SuperAdmin */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-industrial-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-gold-400 mb-1">
            <Crown className="w-4 h-4 text-gold-400 animate-pulse" />
            Central Control Plane • Casa Nodriza
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white flex items-center gap-3">
            Consola SuperAdmin
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/30 font-mono">
              MASTER HUB
            </span>
          </h1>
          <p className="text-sm text-industrial-400 mt-1">
            Monitoreo en tiempo real de barberías registradas, facturación recurrente, alertas de vencimiento y soporte por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMasterData}
            title="Sincronizar datos de la red"
            className="p-2.5 rounded-xl bg-noir-900 border border-industrial-800 text-industrial-400 hover:text-white hover:border-gold-500/40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gold-400' : ''}`} />
          </button>

          <div className="px-3.5 py-2 rounded-xl bg-noir-900 border border-gold-500/30 text-xs font-mono text-gold-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Nodo: Colombia Central</span>
          </div>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-fadeIn ${feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-industrial-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas Globales (MRR & Alertas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR Recurrente */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-noir-900 to-noir-950 border border-gold-500/30 shadow-glow-gold/10">
          <div className="flex items-center justify-between text-industrial-400 text-xs font-mono uppercase mb-2">
            <span>MRR Facturación Mes</span>
            <DollarSign className="w-4 h-4 text-gold-400" />
          </div>
          <div className="text-2xl font-display font-black text-white">
            ${metrics?.totalMRR_USD || 0}{' '}
            <span className="text-xs font-mono text-industrial-400">USD</span>
          </div>
          <div className="text-[11px] text-gold-400/90 font-mono mt-1">
            ≈ ${(metrics?.totalMRR_COP || 0).toLocaleString('es-CO')} COP / mes
          </div>
        </div>

        {/* Total Barberías */}
        <div className="p-5 rounded-2xl bg-noir-900 border border-industrial-800">
          <div className="flex items-center justify-between text-industrial-400 text-xs font-mono uppercase mb-2">
            <span>Barberías Totales</span>
            <Building2 className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-2xl font-display font-black text-white">
            {metrics?.totalTenants || 0}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{metrics?.statusSummary?.active || 0} Activos • {metrics?.statusSummary?.trial || 0} en Prueba</span>
          </div>
        </div>

        {/* Alertas de Cobro (≤ 3 Días) */}
        <div className="p-5 rounded-2xl bg-noir-900 border border-amber-500/30">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono uppercase mb-2">
            <span>Próximos a Vencer (≤ 3d)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-display font-black text-amber-300">
            {metrics?.statusSummary?.expiringSoon || 0}
          </div>
          <div className="text-[11px] text-industrial-400 mt-1">
            Requieren mensaje de recordatorio preventivo
          </div>
        </div>

        {/* En Mora / Suspendidos */}
        <div className="p-5 rounded-2xl bg-noir-900 border border-rose-500/30">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono uppercase mb-2">
            <span>En Mora o Suspendidos</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-display font-black text-rose-400">
            {(metrics?.statusSummary?.pastDue || 0) + (metrics?.statusSummary?.suspended || 0)}
          </div>
          <div className="text-[11px] text-industrial-400 mt-1">
            {metrics?.statusSummary?.pastDue || 0} en mora • {metrics?.statusSummary?.suspended || 0} suspendidos
          </div>
        </div>
      </div>

      {/* Barra de Filtros & Búsqueda */}
      <div className="p-4 rounded-2xl bg-noir-900 border border-industrial-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Input Buscador */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar barbería por nombre, dueño, municipio (Marinilla, Rionegro...) o slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-noir-950 border border-industrial-700 rounded-xl text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Filtro Estado */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-noir-950 border border-industrial-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-gold-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="urgent">⚠️ Urgentes (Por Vencer / Mora)</option>
            <option value="active">✅ Activos Vigentes</option>
            <option value="past_due">🚨 En Mora (Past Due)</option>
            <option value="suspended">🚫 Suspendidos</option>
          </select>
        </div>

        {/* Chips de Municipios de Oriente Antioqueño / Medellín */}
        <div className="flex items-center gap-2 pt-2 border-t border-industrial-800/80 overflow-x-auto text-xs">
          <span className="text-industrial-500 font-mono text-[11px] flex items-center gap-1 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5" /> Municipios:
          </span>
          <button
            onClick={() => setSelectedMunicipality('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${selectedMunicipality === 'all'
                ? 'bg-gold-500 text-noir-950 font-bold'
                : 'bg-noir-950 text-industrial-400 hover:text-white'
              }`}
          >
            Todos ({tenants.length})
          </button>
          {uniqueMunicipalities.map((mun) => {
            const count = tenants.filter(t => t.municipality === mun).length;
            return (
              <button
                key={mun}
                onClick={() => setSelectedMunicipality(mun)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${selectedMunicipality === mun
                    ? 'bg-gold-500 text-noir-950 font-bold'
                    : 'bg-noir-950 text-industrial-400 hover:text-white'
                  }`}
              >
                {mun} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla Nodriza de Negocios */}
      <div className="rounded-2xl bg-noir-900 border border-industrial-800 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-industrial-800 flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold-400" />
            Red de Barberías Registradas ({filteredTenants.length})
          </div>
          <span className="text-[11px] text-industrial-500 font-mono">
            Acciones rápidas de cobranza por WhatsApp en 1 clic
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-noir-950/80 text-industrial-400 font-mono uppercase tracking-wider border-b border-industrial-800">
              <tr>
                <th className="py-3.5 px-4">Barbería & Ubicación</th>
                <th className="py-3.5 px-4">Dueño & Contacto</th>
                <th className="py-3.5 px-4">Plan SaaS</th>
                <th className="py-3.5 px-4">Estado & Vencimiento</th>
                <th className="py-3.5 px-4 text-right">Cobranza & Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 text-slate-300">
              {filteredTenants.map((t) => {
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-noir-800/50 transition-colors ${t.urgencyLevel === 'CRITICAL'
                        ? 'bg-rose-950/15'
                        : t.urgencyLevel === 'DANGER'
                          ? 'bg-rose-950/10'
                          : t.urgencyLevel === 'WARNING'
                            ? 'bg-amber-950/10'
                            : ''
                      }`}
                  >
                    {/* Barbería e Identificación */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-noir-950 border border-gold-500/30 flex-shrink-0 mt-0.5">
                          {getBarberShopIcon()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {t.name}
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border bg-gold-500/15 text-gold-300 border-gold-500/30">
                              BARBERÍA
                            </span>
                          </div>
                          <div className="text-[11px] text-industrial-400 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-industrial-500" />
                            <span>
                              <strong>{t.municipality}</strong> • {t.address}
                            </span>
                          </div>
                          <div className="text-[10px] text-industrial-500 font-mono mt-0.5">
                            slug: /{t.slug} • ID: {t.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Dueño & Teléfono */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{t.ownerName}</div>
                      <div className="text-[11px] text-industrial-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono">{t.whatsapp}</span>
                      </div>
                      <div className="text-[10px] text-industrial-500 truncate max-w-[150px]">
                        {t.ownerEmail}
                      </div>
                    </td>

                    {/* Plan SaaS */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white uppercase text-[11px]">
                        {t.subscriptionPlan === 'pro' ? 'Plan Pro Black' : 'Plan Básico'}
                      </div>
                      <div className="text-xs font-mono text-gold-400 font-semibold">
                        ${t.monthlyRate} USD <span className="text-[10px] text-industrial-500">/ mes</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStoreTenant(t)}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                            t.storeEnabled !== false
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-industrial-800 text-industrial-400 border-industrial-700 hover:text-white hover:border-industrial-600'
                          }`}
                          title={t.storeEnabled !== false ? 'Clic para pausar tienda boutique' : 'Clic para activar tienda boutique'}
                        >
                          <ShoppingBag className="w-2.5 h-2.5" />
                          <span>{t.storeEnabled !== false ? 'Tienda: ACTIVA' : 'Tienda: OFF'}</span>
                        </button>
                      </div>
                    </td>

                    {/* Estado & Días restantes */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${t.billingStatus === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : t.billingStatus === 'TRIAL'
                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                : t.billingStatus === 'EXPIRING_SOON'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                  : t.billingStatus === 'PAST_DUE'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-industrial-800 text-industrial-400 border-industrial-700'
                            }`}
                        >
                          {t.billingStatus === 'EXPIRING_SOON'
                            ? `VENCE EN ${t.daysUntilCutoff} DÍAS`
                            : t.billingStatus === 'PAST_DUE'
                              ? 'EN MORA (PAGO PENDIENTE)'
                              : t.billingStatus === 'TRIAL'
                                ? `PRUEBA (${t.daysUntilCutoff}D RESTANTES)`
                                : t.billingStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-industrial-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-industrial-500" />
                        <span>
                          Corte: {new Date(t.currentPeriodEnd).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </td>

                    {/* Acciones de Cobro & Administración */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botón Invitar Administrador */}
                        <button
                          onClick={() => handleOpenInviteModal(t)}
                          className="px-2.5 py-1.5 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="Generar invitación privada para el administrador de este negocio"
                        >
                          <Mail className="w-3 h-3 text-gold-400" />
                          <span>Invitar Admin</span>
                        </button>

                        {/* Botón WhatsApp */}
                        <button
                          onClick={() => handleOpenWhatsAppModal(t, t.urgencyLevel === 'DANGER' ? 'past_due' : 'expiring_soon')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="Contactar por WhatsApp"
                        >
                          <Send className="w-3 h-3 text-emerald-400" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Botón Extender Suscripción */}
                        <button
                          onClick={() => setSelectedTenantForExtend(t)}
                          className="px-2.5 py-1.5 rounded-lg bg-noir-950 hover:bg-noir-800 border border-industrial-700 text-slate-300 text-xs font-medium transition-colors"
                          title="Extender Días de Suscripción"
                        >
                          Extender
                        </button>

                        {/* Botón Suspender / Reactivar */}
                        <button
                          onClick={() => handleToggleSuspendTenant(t)}
                          className={`p-1.5 rounded-lg border transition-colors ${t.subscriptionStatus === 'suspended'
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50'
                              : 'bg-rose-950/40 border-rose-500/30 text-rose-400 hover:bg-rose-900/50'
                            }`}
                          title={t.subscriptionStatus === 'suspended' ? 'Reactivar Barbería' : 'Suspender Barbería'}
                        >
                          {t.subscriptionStatus === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>

                        {/* Botón Conectar como este Negocio */}
                        <button
                          onClick={() => {
                            switchTenant(t);
                            alert(`Has ingresado como administrador de "${t.name}".`);
                          }}
                          className="p-1.5 rounded-lg bg-noir-950 hover:bg-gold-500/20 border border-industrial-800 text-industrial-400 hover:text-gold-400 transition-colors"
                          title="Abrir esta barbería en el panel"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Alerta de WhatsApp Pre-redactada */}
      {selectedTenantForWA && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-noir-900 border border-gold-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Enviar Alerta de WhatsApp
                  </h3>
                  <p className="text-xs text-industrial-400">
                    Hacia: <strong>{selectedTenantForWA.ownerName}</strong> ({selectedTenantForWA.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenantForWA(null)}
                className="text-industrial-500 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Selector de Tipo de Mensaje */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-industrial-400">Tipo de Mensaje:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleUpdateWaType('expiring_soon')}
                  className={`p-2 rounded-xl border text-left transition-all ${waAlertType === 'expiring_soon'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-noir-950 border-industrial-800 text-industrial-400'
                    }`}
                >
                  ⏰ Cobro Preventivo (≤ 3d)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateWaType('past_due')}
                  className={`p-2 rounded-xl border text-left transition-all ${waAlertType === 'past_due'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-300 font-bold'
                      : 'bg-noir-950 border-industrial-800 text-industrial-400'
                    }`}
                >
                  🚨 Aviso de Mora (Past Due)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateWaType('suspended')}
                  className={`p-2 rounded-xl border text-left transition-all ${waAlertType === 'suspended'
                      ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold'
                      : 'bg-noir-950 border-industrial-800 text-industrial-400'
                    }`}
                >
                  🚫 Aviso de Suspensión
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateWaType('support')}
                  className={`p-2 rounded-xl border text-left transition-all ${waAlertType === 'support'
                      ? 'bg-gold-500/15 border-gold-500 text-gold-300 font-bold'
                      : 'bg-noir-950 border-industrial-800 text-industrial-400'
                    }`}
                >
                  💬 Soporte Técnico VIP
                </button>
              </div>
            </div>

            {/* Vista Previa del Mensaje */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-industrial-400">Mensaje a Enviar:</label>
              <div className="p-3.5 rounded-xl bg-noir-950 border border-industrial-800 text-xs text-slate-200 whitespace-pre-line font-sans max-h-48 overflow-y-auto leading-relaxed">
                {waLoading ? (
                  <div className="flex items-center gap-2 text-industrial-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                    <span>Generando plantilla...</span>
                  </div>
                ) : (
                  waPreview?.message || 'Cargando mensaje...'
                )}
              </div>
            </div>

            {/* Botón Abrir WhatsApp */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedTenantForWA(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-industrial-400 hover:text-white"
              >
                Cancelar
              </button>
              <a
                href={waPreview?.whatsappUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-noir-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Abrir WhatsApp Web</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Extender Suscripción */}
      {selectedTenantForExtend && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-noir-900 border border-industrial-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-white">
              Extender Suscripción: {selectedTenantForExtend.name}
            </h3>
            <p className="text-xs text-industrial-400">
              Otorga días de servicio adicionales o cortesía comercial sin necesidad de pasarela.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-industrial-400">Días a Añadir:</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDaysInput(d)}
                    className={`py-2 rounded-xl border font-bold transition-all ${extendDaysInput === d
                        ? 'bg-gold-500 text-noir-950 border-gold-500'
                        : 'bg-noir-950 border-industrial-800 text-slate-300'
                      }`}
                  >
                    +{d} Días
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTenantForExtend(null)}
                className="px-4 py-2 rounded-xl text-xs text-industrial-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleExtendSubscription(selectedTenantForExtend.id, extendDaysInput)}
                className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs uppercase"
              >
                {actionLoading ? 'Guardando...' : 'Aplicar Extensión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Invitación a Administrador de Barbería */}
      {selectedTenantForInvite && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-noir-900 border border-gold-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gold-500/20 text-gold-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Invitar Administrador
                  </h3>
                  <p className="text-[11px] text-industrial-400">
                    Acceso privado y aislado para {selectedTenantForInvite.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenantForInvite(null)}
                className="text-industrial-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {!inviteResult ? (
              <form onSubmit={handleSendInvite} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                    Nombre del Administrador / Dueño
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Ej. Mateo Osorio"
                    className="w-full bg-noir-950 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                    Correo Electrónico (Usuario de Acceso)
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="admin@barberia.com"
                    className="w-full bg-noir-950 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                      Contraseña Temporal
                    </label>
                    <input
                      type="text"
                      required
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full bg-noir-950 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-gold-400 font-mono font-bold focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                      WhatsApp para Envío
                    </label>
                    <input
                      type="tel"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className="w-full bg-noir-950 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-noir-950 border border-industrial-800 text-[11px] text-industrial-400 space-y-1">
                  <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Aislamiento Multi-Tenant Garantizado:
                  </p>
                  <p>
                    Este administrador solo podrá ver y gestionar <strong>{selectedTenantForInvite.name}</strong>. No tendrá acceso a la Casa Nodriza ni a los datos de otros negocios.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-industrial-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForInvite(null)}
                    className="px-4 py-2 rounded-xl text-xs text-industrial-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs uppercase shadow-glow-gold flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{inviteLoading ? 'Generando...' : 'Generar Acceso & Enlace'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                  <span>¡Invitación y credenciales generadas exitosamente para {inviteName}!</span>
                </div>

                <div className="p-4 rounded-2xl bg-noir-950 border border-industrial-800 space-y-3 text-xs">
                  <div>
                    <span className="text-industrial-500 block font-mono text-[10px] uppercase">Enlace Directo de Acceso:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.invitationLink}
                        className="flex-1 bg-noir-900 border border-industrial-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.invitationLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="p-2 rounded-lg bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 text-xs font-bold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-industrial-850">
                    <div>
                      <span className="text-industrial-500 block font-mono text-[10px] uppercase">Usuario:</span>
                      <span className="font-mono font-bold text-white text-xs">{inviteResult.user.email}</span>
                    </div>
                    <div>
                      <span className="text-industrial-500 block font-mono text-[10px] uppercase">Contraseña Temporal:</span>
                      <span className="font-mono font-bold text-gold-400 text-xs">{inviteResult.user.password}</span>
                    </div>
                  </div>
                </div>

                {inviteResult.whatsappUrl && (
                  <a
                    href={inviteResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-noir-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <Send className="w-4 h-4 fill-current" />
                    <span>Enviar Invitación por WhatsApp al Administrador</span>
                  </a>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedTenantForInvite(null)}
                    className="px-4 py-2 rounded-xl bg-noir-800 hover:bg-noir-700 text-slate-300 text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminConsole;


