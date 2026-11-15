import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { isPlatformSuperadminEmail } from '../lib/constants';
import {
  fetchAllPlatformUsers,
  updateUserTenantAndRole,
  deletePlatformUser
} from '../services/userService';
import {
  fetchFirestoreTenants,
  saveFirestoreTenant,
  deleteFirestoreTenant,
  formatTenantsForSuperAdmin,
  calculateSuperAdminMetrics,
  generateWhatsAppAlertTemplate
} from '../services/firestoreService';
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmDialog
} from '../lib/swal';
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
  ShoppingBag,
  User,
  UserCheck,
  UserX,
  Plus
} from 'lucide-react';

export const SuperAdminConsole = ({
  activeTab: propActiveTab,
  showCreateCompanyModal: propShowModal,
  setShowCreateCompanyModal: propSetShowModal,
  onCountsChange,
  refreshTrigger
}) => {
  const { switchTenant } = useBarbershop();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  
  const [internalTab, setInternalTab] = useState('companies');
  const activeTab = propActiveTab || internalTab;

  // Gestión de Usuarios Registrados en Plataforma
  const [platformUsers, setPlatformUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [targetRole, setTargetRole] = useState('admin');

  // Modal Crear Nueva Empresa / Barbería (Superadmin Only)
  const [internalShowModal, setInternalShowModal] = useState(false);
  const showCreateCompanyModal = propShowModal !== undefined ? propShowModal : internalShowModal;
  const setShowCreateCompanyModal = propSetShowModal || setInternalShowModal;
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyMunicipality, setNewCompanyMunicipality] = useState('Rionegro');
  const [newCompanyAddress, setNewCompanyAddress] = useState('');
  const [newCompanyWhatsapp, setNewCompanyWhatsapp] = useState('');
  const [newCompanyOwner, setNewCompanyOwner] = useState('');
  const [newCompanyOwnerEmail, setNewCompanyOwnerEmail] = useState('');
  const [newCompanyCurrency, setNewCompanyCurrency] = useState('COP');
  const [newCompanyStoreEnabled, setNewCompanyStoreEnabled] = useState(true);
  const [creatingCompany, setCreatingCompany] = useState(false);

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
      const slugOrId = selectedTenantForInvite.slug || selectedTenantForInvite.id;
      const invitationLink = `${window.location.origin}/portal?company=${slugOrId}`;
      const inviteMsg = `👋 Hola *${inviteName || 'Especialista'}*, has sido asignado como Administrador de *${selectedTenantForInvite.name}* en BarberPulse OS.\n\nAcceso a tu panel:\n🔗 Enlace: ${invitationLink}\n👤 Usuario: ${inviteEmail}\n🔑 Contraseña temporal: ${invitePassword}\n\nPor favor inicia sesión para comenzar a gestionar tu agenda y tu salón.`;
      const cleanPhone = (invitePhone || selectedTenantForInvite.whatsapp || '').replace(/[^\d]/g, '');
      const formattedPhone = cleanPhone.length === 10 && cleanPhone.startsWith('3') ? '57' + cleanPhone : cleanPhone;
      const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(inviteMsg)}` : null;

      const fallbackResult = {
        success: true,
        invitationLink,
        whatsappUrl,
        user: {
          name: inviteName,
          email: inviteEmail,
          password: invitePassword
        }
      };

      try {
        if (api.inviteAdmin) {
          const res = await api.inviteAdmin({
            barbershopId: selectedTenantForInvite.id,
            name: inviteName,
            email: inviteEmail,
            password: invitePassword,
            phone: invitePhone
          });
          if (res?.success) setInviteResult(res);
          else setInviteResult(fallbackResult);
        } else {
          setInviteResult(fallbackResult);
        }
      } catch (apiErr) {
        setInviteResult(fallbackResult);
      }

      await showSuccessAlert('¡Invitación Generada!', `Credenciales de acceso creadas para "${inviteEmail}".`);
    } catch (err) {
      await showErrorAlert('Error al generar invitación', err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Cargar datos del SuperAdmin con sincronización Firestore Spark
  const loadMasterData = async () => {
    try {
      setLoading(true);
      let loadedTenants = [];
      let loadedMetrics = null;

      // 1. Intentar API backend (si existe backend Express activo)
      try {
        const [metRes, tenRes] = await Promise.all([
          api.getSuperAdminMetrics(),
          api.getSuperAdminTenants()
        ]);

        if (tenRes?.success && Array.isArray(tenRes.data) && tenRes.data.length > 0) {
          loadedTenants = tenRes.data;
        }
        if (metRes?.success && metRes.data) {
          loadedMetrics = metRes.data;
        }
      } catch (backendError) {
        // En Firebase Hosting puro, fallback automático a Firestore
        console.info('Conectando directamente con Firestore (Plan Spark)...');
      }

      // 2. Si el backend no devolvió datos, cargar desde Firestore
      if (loadedTenants.length === 0) {
        const rawDocs = await fetchFirestoreTenants();
        loadedTenants = formatTenantsForSuperAdmin(rawDocs);
        loadedMetrics = calculateSuperAdminMetrics(loadedTenants);
      }

      setTenants(loadedTenants);
      setMetrics(loadedMetrics || calculateSuperAdminMetrics(loadedTenants));
      setFeedbackMessage(null); // Sin banner de error alarmante
    } catch (error) {
      console.error('Error cargando datos de SuperAdmin:', error);
      setFeedbackMessage({
        type: 'error',
        text: 'Aviso de sincronización: ' + (error.message || 'Verificando datos...')
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformUsers = async () => {
    try {
      setUsersLoading(true);
      let users = await fetchAllPlatformUsers();
      if (!users || users.length === 0) {
        try {
          const res = await api.getPlatformUsers();
          if (res.success && res.data) {
            users = res.data;
          }
        } catch (apiErr) {
          console.info('Usuarios cargados desde Firestore.');
        }
      }
      setPlatformUsers(users || []);
    } catch (err) {
      console.warn('Error al cargar usuarios:', err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    try {
      setCreatingCompany(true);
      const slug = newCompanyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newTenant = {
        id: `tenant_${slug}_${Date.now().toString().slice(-4)}`,
        name: newCompanyName.trim(),
        slug,
        businessType: 'barbershop',
        municipality: newCompanyMunicipality.trim() || 'Marinilla',
        department: 'Antioquia',
        address: newCompanyAddress.trim() || 'Dirección por registrar',
        whatsapp: newCompanyWhatsapp.trim() || '+573000000000',
        phone: newCompanyWhatsapp.trim() || '+573000000000',
        ownerName: newCompanyOwner.trim() || 'Administrador',
        ownerEmail: newCompanyOwnerEmail.trim() || `contacto@${slug}.com`,
        currency: newCompanyCurrency || 'COP',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        storeEnabled: newCompanyStoreEnabled !== false,
        createdAt: new Date().toISOString()
      };

      // 1. Intentar API backend
      try {
        await api.registerNewBusiness(newTenant);
      } catch (apiErr) {
        console.warn('Backend register notice:', apiErr.message);
      }

      // 2. Persistir siempre en Firestore Spark
      await saveFirestoreTenant(newTenant);

      setShowCreateCompanyModal(false);
      setNewCompanyName('');
      setNewCompanyAddress('');
      setNewCompanyWhatsapp('');
      setNewCompanyOwner('');
      setNewCompanyOwnerEmail('');
      setFeedbackMessage({
        type: 'success',
        text: `¡Barbería "${newTenant.name}" creada exitosamente!`
      });
      await loadMasterData();
      await showSuccessAlert(
        '¡Barbería Registrada!',
        `La empresa "${newTenant.name}" ha sido creada exitosamente en la plataforma.`
      );
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al crear barbería: ' + err.message
      });
      await showErrorAlert('Error al Crear Barbería', err.message);
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleAssignUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForAssign || !targetCompanyId) return;

    try {
      setActionLoading(true);
      try {
        await updateUserTenantAndRole(selectedUserForAssign.uid, targetCompanyId, targetRole);
      } catch (fsErr) {
        console.warn('Firestore update notice (falling back to API):', fsErr.message);
      }

      await api.assignUserCompany({
        uid: selectedUserForAssign.uid,
        email: selectedUserForAssign.email,
        displayName: selectedUserForAssign.displayName,
        avatarUrl: selectedUserForAssign.avatarUrl,
        companyId: targetCompanyId,
        role: targetRole
      });

      const userEmail = selectedUserForAssign.email;
      const roleText = targetRole === 'admin' ? 'Administrador / Dueño de Barbería' : 'Barbero / Personal';
      setSelectedUserForAssign(null);
      setFeedbackMessage({
        type: 'success',
        text: `Usuario "${userEmail}" asignado exitosamente como ${roleText}.`
      });
      await loadPlatformUsers();
      await showSuccessAlert(
        '¡Usuario Asignado!',
        `El usuario "${userEmail}" ahora tiene acceso a su negocio como ${roleText}.`
      );
    } catch (err) {
      console.error('Error al asignar usuario:', err);
      setFeedbackMessage({
        type: 'error',
        text: 'Error al asignar usuario: ' + err.message
      });
      await showErrorAlert('Error al Asignar', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassignUser = async (user) => {
    const confirmResult = await showConfirmDialog({
      title: '¿Desvincular Usuario?',
      text: `¿Deseas desvincular a "${user.email}" de su empresa? Volverá al estado de cuarentena sin acceso.`,
      confirmText: 'Sí, desvincular',
      cancelText: 'Cancelar'
    });
    if (!confirmResult.isConfirmed) return;

    try {
      setActionLoading(true);
      try {
        await updateUserTenantAndRole(user.uid, null, 'user');
      } catch (fsErr) {
        console.warn('Firestore update notice:', fsErr.message);
      }
      await api.assignUserCompany({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        companyId: null,
        role: 'user'
      });
      setFeedbackMessage({
        type: 'success',
        text: `Usuario "${user.email}" desvinculado de la empresa.`
      });
      await loadPlatformUsers();
      await showSuccessAlert('Usuario Desvinculado', `"${user.email}" fue devuelto a estado no asignado.`);
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al desvincular usuario: ' + err.message
      });
      await showErrorAlert('Error al Desvincular', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmResult = await showConfirmDialog({
      title: '¿Eliminar Usuario?',
      text: `¿Eliminar permanentemente a "${user.email}" de la plataforma? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      icon: 'warning'
    });
    if (!confirmResult.isConfirmed) return;

    try {
      setActionLoading(true);
      try {
        await deletePlatformUser(user.uid);
      } catch (fsErr) {
        console.warn('Firestore delete notice:', fsErr.message);
      }
      await api.deletePlatformUser(user.uid);
      setFeedbackMessage({
        type: 'success',
        text: `Usuario "${user.email}" eliminado.`
      });
      await loadPlatformUsers();
      await showSuccessAlert('Usuario Eliminado', `El usuario "${user.email}" ha sido eliminado del sistema.`);
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al eliminar usuario: ' + err.message
      });
      await showErrorAlert('Error al Eliminar', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    loadPlatformUsers();
  }, []);

  // Notificar al layout superior los conteos para las pestañas
  useEffect(() => {
    if (onCountsChange) {
      onCountsChange({
        tenantsCount: tenants.length,
        usersCount: platformUsers.length
      });
    }
  }, [tenants.length, platformUsers.length, onCountsChange]);

  // Recargar datos cuando se active el botón de refrescar del header principal
  useEffect(() => {
    if (refreshTrigger) {
      loadMasterData();
      loadPlatformUsers();
    }
  }, [refreshTrigger]);

  // Generar preview de WhatsApp al abrir el modal o cambiar el tipo de alerta
  const handleOpenWhatsAppModal = async (tenant, defaultType = 'expiring_soon') => {
    setSelectedTenantForWA(tenant);
    setWaAlertType(defaultType);
    setWaLoading(true);
    try {
      let res = null;
      try {
        res = await api.getSuperAdminWhatsAppAlert(tenant.id, defaultType);
      } catch (e) {
        // Fallback local en Firebase Hosting
      }
      if (!res || !res.success) {
        res = generateWhatsAppAlertTemplate(tenant, defaultType);
      }
      setWaPreview(res);
    } catch (err) {
      console.error('Error generando WhatsApp alert:', err);
      setWaPreview(generateWhatsAppAlertTemplate(tenant, defaultType));
    } finally {
      setWaLoading(false);
    }
  };

  const handleUpdateWaType = async (type) => {
    setWaAlertType(type);
    if (!selectedTenantForWA) return;
    setWaLoading(true);
    try {
      let res = null;
      try {
        res = await api.getSuperAdminWhatsAppAlert(selectedTenantForWA.id, type);
      } catch (e) {
        // Fallback local en Firebase Hosting
      }
      if (!res || !res.success) {
        res = generateWhatsAppAlertTemplate(selectedTenantForWA, type);
      }
      setWaPreview(res);
    } catch (err) {
      console.error('Error al actualizar tipo de alerta:', err);
      setWaPreview(generateWhatsAppAlertTemplate(selectedTenantForWA, type));
    } finally {
      setWaLoading(false);
    }
  };

  // Extender o cambiar estado de suscripción
  const handleExtendSubscription = async (tenantId, days) => {
    try {
      setActionLoading(true);
      const targetTenant = tenants.find(t => t.id === tenantId);
      const now = Date.now();
      const currentEnd = targetTenant?.currentPeriodEnd ? new Date(targetTenant.currentPeriodEnd).getTime() : now;
      const baseTime = currentEnd > now ? currentEnd : now;
      const newPeriodEnd = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();

      try {
        await api.updateSuperAdminTenantSubscription(tenantId, {
          extendDays: days,
          status: 'active'
        });
      } catch (apiErr) {
        console.warn('Backend update notice:', apiErr.message);
      }

      // Persistir siempre en Firestore Spark
      if (targetTenant) {
        await saveFirestoreTenant({
          ...targetTenant,
          subscriptionStatus: 'active',
          currentPeriodEnd: newPeriodEnd
        });
      }

      setFeedbackMessage({
        type: 'success',
        text: `Suscripción extendida +${days} días con éxito.`
      });
      setSelectedTenantForExtend(null);
      await loadMasterData();
      await showSuccessAlert('Suscripción Extendida', `Se agregaron +${days} días con éxito.`);
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al extender suscripción: ' + err.message
      });
      await showErrorAlert('Error al Extender Suscripción', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspendTenant = async (tenant) => {
    const newStatus = tenant.subscriptionStatus === 'suspended' ? 'active' : 'suspended';
    const confirmResult = await showConfirmDialog({
      title: newStatus === 'suspended' ? '¿Suspender Barbería?' : '¿Reactivar Barbería?',
      text: `¿Estás seguro de ${newStatus === 'suspended' ? 'SUSPENDER' : 'REACTIVAR'} a "${tenant.name}"?`,
      confirmText: newStatus === 'suspended' ? 'Sí, suspender' : 'Sí, reactivar',
      icon: newStatus === 'suspended' ? 'warning' : 'question'
    });
    if (!confirmResult.isConfirmed) return;

    try {
      setActionLoading(true);
      try {
        await api.updateSuperAdminTenantSubscription(tenant.id, {
          status: newStatus
        });
      } catch (apiErr) {
        console.warn('Backend update notice:', apiErr.message);
      }

      // Persistir siempre en Firestore Spark
      await saveFirestoreTenant({
        ...tenant,
        subscriptionStatus: newStatus
      });

      setFeedbackMessage({
        type: 'success',
        text: `Estado de "${tenant.name}" actualizado a ${newStatus.toUpperCase()}`
      });
      await loadMasterData();
      await showSuccessAlert('Estado Actualizado', `"${tenant.name}" ahora está ${newStatus === 'suspended' ? 'SUSPENDIDA' : 'ACTIVA'}.`);
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al cambiar estado: ' + err.message
      });
      await showErrorAlert('Error al Cambiar Estado', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Alternar activación de la Tienda Boutique de un negocio
  const handleToggleStoreTenant = async (tenant) => {
    try {
      setActionLoading(true);
      const nextStatus = !(tenant.storeEnabled !== false);
      try {
        await api.updateBarbershopSettings(tenant.id, { storeEnabled: nextStatus });
      } catch (apiErr) {
        console.warn('Backend update notice:', apiErr.message);
      }

      // Persistir siempre en Firestore Spark
      await saveFirestoreTenant({
        ...tenant,
        storeEnabled: nextStatus
      });

      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, storeEnabled: nextStatus } : t));
      setFeedbackMessage({
        type: 'success',
        text: `Tienda Boutique ${nextStatus ? 'activada' : 'desactivada'} para "${tenant.name}".`
      });
      await showSuccessAlert(
        'Tienda Boutique',
        `Tienda Boutique ${nextStatus ? 'activada' : 'desactivada'} para "${tenant.name}".`
      );
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error al cambiar estado de tienda: ' + err.message
      });
      await showErrorAlert('Error en Tienda Boutique', err.message);
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
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Banner de Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs animate-fadeIn ${feedbackMessage.type === 'success'
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
            className="text-industrial-400 hover:text-white font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === 'companies' ? (
        <>
          {/* Tarjetas de Métricas Globales (MRR & Alertas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* MRR Recurrente */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-gold-500/30 shadow-sm transition-all hover:border-amber-500/50">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400 text-xs font-mono uppercase font-semibold mb-2">
                <span>MRR Facturación Mes</span>
                <DollarSign className="w-4 h-4 text-amber-600 dark:text-gold-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white">
                ${metrics?.totalMRR_USD || 0}{' '}
                <span className="text-xs font-mono text-slate-500 dark:text-industrial-400 font-normal">USD</span>
              </div>
              <div className="text-[11px] text-amber-700 dark:text-gold-400 font-mono font-bold mt-1">
                ≈ ${(metrics?.totalMRR_COP || 0).toLocaleString('es-CO')} COP / mes
              </div>
            </div>

            {/* Total Barberías */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-industrial-700">
              <div className="flex items-center justify-between text-slate-500 dark:text-industrial-400 text-xs font-mono uppercase font-semibold mb-2">
                <span>Barberías Totales</span>
                <Building2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white">
                {metrics?.totalTenants || 0}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{metrics?.statusSummary?.active || 0} Activos • {metrics?.statusSummary?.trial || 0} en Prueba</span>
              </div>
            </div>

            {/* Alertas de Cobro (≤ 3 Días) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-noir-900 border border-amber-300 dark:border-amber-500/30 shadow-sm transition-all">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-mono uppercase font-semibold mb-2">
                <span>Próximos a Vencer (≤ 3d)</span>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-amber-600 dark:text-amber-400">
                {metrics?.statusSummary?.expiringSoon || 0}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-industrial-400 font-medium mt-1">
                Requieren mensaje de recordatorio preventivo
              </div>
            </div>

            {/* En Mora / Suspendidos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-noir-900 border border-rose-300 dark:border-rose-500/30 shadow-sm transition-all">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-mono uppercase font-semibold mb-2">
                <span>En Mora o Suspendidos</span>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-rose-600 dark:text-rose-400">
                {(metrics?.statusSummary?.pastDue || 0) + (metrics?.statusSummary?.suspended || 0)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-industrial-400 font-medium mt-1">
                {metrics?.statusSummary?.pastDue || 0} en mora • {metrics?.statusSummary?.suspended || 0} suspendidos
              </div>
            </div>
          </div>

          {/* Barra de Filtros & Búsqueda */}
          <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 shadow-sm space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Input Buscador */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 dark:text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar barbería por nombre, dueño, municipio (Marinilla, Rionegro...) o slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-industrial-500 focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-medium"
                />
              </div>

              {/* Filtro Estado */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-700 rounded-xl text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-medium cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="urgent">⚠️ Urgentes (Por Vencer / Mora)</option>
                <option value="active">✅ Activos Vigentes</option>
                <option value="past_due">🚨 En Mora (Past Due)</option>
                <option value="suspended">🚫 Suspendidos</option>
              </select>
            </div>

            {/* Chips de Municipios de Oriente Antioqueño / Medellín */}
            <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-industrial-800/80 overflow-x-auto scrollbar-none text-xs">
              <span className="text-slate-500 dark:text-industrial-500 font-mono text-[11px] flex items-center gap-1 flex-shrink-0 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" /> Municipios:
              </span>
              <button
                type="button"
                onClick={() => setSelectedMunicipality('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                  selectedMunicipality === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950'
                    : 'bg-slate-100 dark:bg-noir-950 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-industrial-800'
                }`}
              >
                Todos ({tenants.length})
              </button>
              {uniqueMunicipalities.map((mun) => {
                const count = tenants.filter(t => t.municipality === mun).length;
                return (
                  <button
                    key={mun}
                    type="button"
                    onClick={() => setSelectedMunicipality(mun)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                      selectedMunicipality === mun
                        ? 'bg-amber-500 text-slate-950 shadow-sm dark:bg-gold-500 dark:text-noir-950'
                        : 'bg-slate-100 dark:bg-noir-950 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-industrial-800'
                    }`}
                  >
                    {mun} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabla Nodriza & Vista Móvil Responsiva de Negocios */}
          <div className="rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-industrial-800 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600 dark:text-gold-400" />
                Red de Barberías Registradas ({filteredTenants.length})
              </div>
              <span className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono hidden sm:inline">
                Acciones rápidas de cobranza por WhatsApp en 1 clic
              </span>
            </div>

            {/* VISTA MÓVIL EN TARJETAS (Elimina completamente el scroll horizontal molesto) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-industrial-800">
              {filteredTenants.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 dark:text-industrial-400">
                  <Building2 className="w-10 h-10 text-slate-400 dark:text-industrial-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No hay barberías registradas</p>
                </div>
              ) : (
                filteredTenants.map((t) => (
                  <div key={t.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-noir-950 transition-colors">
                    {/* Header de la barbería */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-gold-400 flex-shrink-0">
                          {getBarberShopIcon()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {t.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-600 dark:text-gold-400 flex-shrink-0" />
                            <strong>{t.municipality}</strong> • {t.address}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono flex-shrink-0 ${
                          t.billingStatus === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                            : t.billingStatus === 'TRIAL'
                            ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30'
                            : t.billingStatus === 'EXPIRING_SOON'
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {t.billingStatus === 'EXPIRING_SOON'
                          ? `≤ ${t.daysUntilCutoff} DÍAS`
                          : t.billingStatus === 'PAST_DUE'
                          ? 'EN MORA'
                          : t.billingStatus}
                      </span>
                    </div>

                    {/* Datos del dueño y plan */}
                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-industrial-400 block font-semibold">Dueño:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">{t.ownerName}</span>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">{t.whatsapp}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-industrial-400 block font-semibold">Plan SaaS:</span>
                        <span className="font-bold font-mono text-amber-700 dark:text-gold-400 text-xs block">${t.monthlyRate} USD/mes</span>
                        <span className="text-[10px] text-slate-500 dark:text-industrial-400">Corte: {new Date(t.currentPeriodEnd).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>

                    {/* Acciones Rápidas Móviles */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppModal(t, t.urgencyLevel === 'DANGER' ? 'past_due' : 'expiring_soon')}
                        className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInviteModal(t)}
                        className="py-1.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-gold-300 border border-amber-500/30 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Mail className="w-3 h-3 text-amber-600 dark:text-gold-400" />
                        <span>Invitar</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          switchTenant(t);
                          await showSuccessAlert('Conexión Activa', `Has ingresado al panel de "${t.name}".`);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span>Entrar</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* VISTA ESCRITORIO EN TABLA (Con contraste de lujo) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-noir-950/80 text-slate-600 dark:text-industrial-400 font-mono uppercase tracking-wider border-b border-slate-200 dark:border-industrial-800 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Barbería & Ubicación</th>
                    <th className="py-3.5 px-4">Dueño & Contacto</th>
                    <th className="py-3.5 px-4">Plan SaaS</th>
                    <th className="py-3.5 px-4">Estado & Vencimiento</th>
                    <th className="py-3.5 px-4 text-right">Cobranza & Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-industrial-800/60 text-slate-800 dark:text-slate-300">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500 dark:text-industrial-400">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Building2 className="w-10 h-10 text-slate-400 dark:text-industrial-600 animate-pulse" />
                          <p className="text-sm font-bold text-slate-900 dark:text-white">No hay barberías registradas en este momento</p>
                          <p className="text-xs text-slate-500 dark:text-industrial-500 max-w-sm">
                            Como Super Administrador, eres el único que puede crear empresas en la plataforma.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowCreateCompanyModal(true)}
                            className="mt-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:text-noir-950 font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>+ Registrar Primera Barbería</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50 dark:hover:bg-noir-800/50 transition-colors ${
                            t.urgencyLevel === 'CRITICAL'
                              ? 'bg-rose-50/50 dark:bg-rose-950/15'
                              : t.urgencyLevel === 'DANGER'
                              ? 'bg-rose-50/30 dark:bg-rose-950/10'
                              : t.urgencyLevel === 'WARNING'
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : ''
                          }`}
                        >
                          {/* Barbería e Identificación */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-gold-500/30 flex-shrink-0 mt-0.5">
                                {getBarberShopIcon()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                  {t.name}
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 dark:text-gold-300 border-amber-500/30">
                                    BARBERÍA
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-industrial-400 flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-amber-600 dark:text-gold-400" />
                                  <span>
                                    <strong>{t.municipality}</strong> • {t.address}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-industrial-500 font-mono mt-0.5 flex items-center gap-2">
                                  <span>slug: /{t.slug} • ID: {t.id}</span>
                                  <a
                                    href={`/?slug=${t.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-600 dark:text-gold-400 hover:underline flex items-center gap-0.5 font-bold"
                                  >
                                    <span>Web</span>
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Dueño & Teléfono */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{t.ownerName}</div>
                            <div className="text-[11px] text-slate-600 dark:text-industrial-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-mono font-semibold">{t.whatsapp}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-industrial-500 truncate max-w-[150px]">
                              {t.ownerEmail}
                            </div>
                          </td>

                          {/* Plan SaaS */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                              {t.subscriptionPlan === 'pro' ? 'Plan Pro Black' : 'Plan Básico'}
                            </div>
                            <div className="text-xs font-mono text-amber-600 dark:text-gold-400 font-bold">
                              ${t.monthlyRate} USD <span className="text-[10px] text-slate-400 dark:text-industrial-500 font-normal">/ mes</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleStoreTenant(t)}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer font-bold ${
                                  t.storeEnabled !== false
                                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'bg-slate-100 text-slate-500 dark:bg-industrial-800 dark:text-industrial-400 border-slate-200 dark:border-industrial-700'
                                }`}
                                title={t.storeEnabled !== false ? 'Clic para pausar tienda' : 'Clic para activar tienda'}
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${
                                  t.billingStatus === 'ACTIVE'
                                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                    : t.billingStatus === 'TRIAL'
                                    ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30'
                                    : t.billingStatus === 'EXPIRING_SOON'
                                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 animate-pulse'
                                    : t.billingStatus === 'PAST_DUE'
                                    ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40'
                                    : 'bg-slate-100 text-slate-600 dark:bg-industrial-800 dark:text-industrial-400 border-slate-200 dark:border-industrial-700'
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
                            <div className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400 dark:text-industrial-500" />
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
                                type="button"
                                onClick={() => handleOpenInviteModal(t)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-gold-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Generar invitación para el dueño"
                              >
                                <Mail className="w-3 h-3 text-amber-600 dark:text-gold-400" />
                                <span>Invitar</span>
                              </button>

                              {/* Botón WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsAppModal(t, t.urgencyLevel === 'DANGER' ? 'past_due' : 'expiring_soon')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Contactar por WhatsApp"
                              >
                                <Send className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>WhatsApp</span>
                              </button>

                              {/* Botón Extender Suscripción */}
                              <button
                                type="button"
                                onClick={() => setSelectedTenantForExtend(t)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-noir-950 dark:hover:bg-noir-800 border border-slate-200 dark:border-industrial-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                                title="Extender Días de Suscripción"
                              >
                                Extender
                              </button>

                              {/* Botón Suspender / Reactivar */}
                              <button
                                type="button"
                                onClick={() => handleToggleSuspendTenant(t)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  t.subscriptionStatus === 'suspended'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                                }`}
                                title={t.subscriptionStatus === 'suspended' ? 'Reactivar Barbería' : 'Suspender Barbería'}
                              >
                                {t.subscriptionStatus === 'suspended' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              </button>

                              {/* Botón Conectar como este Negocio */}
                              <button
                                type="button"
                                onClick={async () => {
                                  switchTenant(t);
                                  await showSuccessAlert('Conexión Activa', `Has ingresado al panel de "${t.name}".`);
                                }}
                                className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-noir-950 dark:hover:bg-gold-500/20 border border-slate-700 dark:border-industrial-800 dark:text-industrial-400 dark:hover:text-gold-400 transition-colors cursor-pointer shadow-sm"
                                title="Abrir esta barbería en el panel"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Vista de Gestión de Usuarios y Asignación de Empresas */
        <div className="rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 overflow-hidden shadow-sm animate-fadeIn">
          <div className="p-4 border-b border-slate-100 dark:border-industrial-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Control de Usuarios Registrados & Asignación ({platformUsers.length})
              </div>
              <p className="text-[11px] text-slate-500 dark:text-industrial-400 mt-0.5">
                Los usuarios nuevos inician sin empresa asignada. Como Superadmin, asígnalos a su barbería para desbloquear su acceso.
              </p>
            </div>
            <button
              type="button"
              onClick={loadPlatformUsers}
              className="p-2 rounded-xl bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Refrescar usuarios"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin text-amber-600 dark:text-gold-400' : ''}`} />
            </button>
          </div>

          {/* VISTA MÓVIL DE USUARIOS */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-industrial-800">
            {platformUsers.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500 dark:text-industrial-400">
                <User className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No hay usuarios registrados todavía</p>
              </div>
            ) : (
              platformUsers.map((u) => {
                const assignedCompany = tenants.find((t) => t.id === u.companyId);
                const isSA = isPlatformSuperadminEmail(u.email) || u.role === 'superadmin';

                return (
                  <div key={u.uid} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-noir-950 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            u.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                          }
                          alt={u.displayName}
                          className="w-9 h-9 rounded-full border border-slate-300 dark:border-gold-500/30 object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {u.displayName || 'Sin Nombre'}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-industrial-400 truncate block">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border flex-shrink-0 ${
                          isSA
                            ? 'bg-amber-500/15 text-amber-900 dark:text-gold-300 border-amber-500/30'
                            : u.role === 'admin'
                            ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-100 text-slate-600 dark:bg-industrial-800 dark:text-industrial-400 border-slate-200 dark:border-industrial-700'
                        }`}
                      >
                        {isSA ? '👑 SUPER' : u.role === 'admin' ? '💈 ADMIN' : '👤 USER'}
                      </span>
                    </div>

                    <div className="text-xs p-2 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 dark:text-industrial-400 font-semibold">Empresa Asignada:</span>
                      {isSA ? (
                        <span className="font-bold text-amber-700 dark:text-gold-400 font-mono text-[11px]">Global Master</span>
                      ) : assignedCompany ? (
                        <span className="font-bold text-slate-900 dark:text-white truncate">{assignedCompany.name}</span>
                      ) : (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg">
                          Sin Asignar (Cuarentena)
                        </span>
                      )}
                    </div>

                    {!isSA && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForAssign(u);
                            setTargetCompanyId(u.companyId || (tenants[0]?.id || ''));
                            setTargetRole(u.role === 'admin' ? 'admin' : 'user');
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-900 dark:text-gold-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{u.companyId ? 'Reasignar' : 'Asignar Empresa'}</span>
                        </button>

                        {u.companyId && (
                          <button
                            type="button"
                            onClick={() => handleUnassignUser(u)}
                            className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-slate-700 dark:text-industrial-300 text-xs font-semibold cursor-pointer"
                          >
                            Desvincular
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* VISTA ESCRITORIO DE USUARIOS */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-noir-950/80 text-slate-600 dark:text-industrial-400 font-mono uppercase tracking-wider border-b border-slate-200 dark:border-industrial-800 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Correo</th>
                  <th className="py-3.5 px-4">Rol en Plataforma</th>
                  <th className="py-3.5 px-4">Empresa Asignada</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-industrial-800/60 text-slate-800 dark:text-slate-300">
                {platformUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-500 dark:text-industrial-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <User className="w-8 h-8 text-slate-400 dark:text-industrial-600" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">No hay usuarios registrados todavía</p>
                        <p className="text-xs text-slate-500 dark:text-industrial-500">
                          Cualquier persona que inicie sesión con Google o Correo aparecerá aquí automáticamente.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  platformUsers.map((u) => {
                    const assignedCompany = tenants.find((t) => t.id === u.companyId);
                    const isSA = isPlatformSuperadminEmail(u.email) || u.role === 'superadmin';

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-noir-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                u.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                              }
                              alt={u.displayName}
                              className="w-8 h-8 rounded-full border border-slate-300 dark:border-gold-500/30 object-cover"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">{u.displayName || 'Sin Nombre'}</div>
                              <div className="text-[10px] text-slate-400 dark:text-industrial-500 font-mono">
                                UID: {u.uid.slice(0, 10)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300 font-medium">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border ${
                              isSA
                                ? 'bg-amber-500/15 text-amber-800 dark:text-gold-300 border-amber-500/30'
                                : u.role === 'admin'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-100 text-slate-600 dark:bg-industrial-800 dark:text-industrial-400 border-slate-200 dark:border-industrial-700'
                            }`}
                          >
                            {isSA ? '👑 SUPERADMIN' : u.role === 'admin' ? '💈 ADMIN EMPRESA' : '👤 USUARIO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isSA ? (
                            <span className="text-xs text-amber-700 dark:text-gold-400/80 font-mono font-bold">Global (Acceso a Todas)</span>
                          ) : assignedCompany ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-bold text-slate-900 dark:text-white">{assignedCompany.name}</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-2.5 h-2.5" />
                              Sin Asignar (Cuarentena)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!isSA && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForAssign(u);
                                  setTargetCompanyId(u.companyId || (tenants[0]?.id || ''));
                                  setTargetRole(u.role === 'admin' ? 'admin' : 'user');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-gold-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Asignar a Empresa"
                              >
                                <Building2 className="w-3 h-3" />
                                <span>{u.companyId ? 'Reasignar' : 'Asignar Empresa'}</span>
                              </button>

                              {u.companyId && (
                                <button
                                  type="button"
                                  onClick={() => handleUnassignUser(u)}
                                  className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-slate-700 dark:text-industrial-300 text-xs font-semibold transition-colors cursor-pointer"
                                  title="Desvincular de la empresa"
                                >
                                  Desvincular
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Eliminar usuario de la plataforma"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Alerta de WhatsApp Pre-redactada */}
      {selectedTenantForWA && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTenantForWA(null); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-noir-900 border border-gold-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 cursor-default"
          >
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
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTenantForExtend(null); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-noir-900 border border-industrial-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 cursor-default"
          >
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
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTenantForInvite(null); }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-noir-900 border border-gold-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 cursor-default"
          >
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

      {/* Modal Registrar Nueva Empresa / Barbería (Superadmin Only) */}
      <Modal
        isOpen={showCreateCompanyModal}
        onClose={() => setShowCreateCompanyModal(false)}
        title="Registrar Nueva Empresa / Barbería"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
              Nombre de la Barbería *
            </label>
            <input
              type="text"
              placeholder="ej. Vintage Cuts Studio"
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
                Municipio
              </label>
              <input
                type="text"
                value={newCompanyMunicipality}
                onChange={e => setNewCompanyMunicipality(e.target.value)}
                placeholder="ej. Rionegro"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
                Moneda Base
              </label>
              <select
                value={newCompanyCurrency}
                onChange={e => setNewCompanyCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
              >
                <option value="COP">COP ($ Pesos)</option>
                <option value="USD">USD ($ Dólares)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
              Dirección del Salón
            </label>
            <input
              type="text"
              placeholder="ej. Cra 50 #49-20, Parque Principal"
              value={newCompanyAddress}
              onChange={e => setNewCompanyAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
                Dueño / Contacto Principal
              </label>
              <input
                type="text"
                placeholder="ej. Mateo Osorio"
                value={newCompanyOwner}
                onChange={e => setNewCompanyOwner(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
                WhatsApp Oficial
              </label>
              <input
                type="text"
                placeholder="ej. +57 300 456 7890"
                value={newCompanyWhatsapp}
                onChange={e => setNewCompanyWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Toggle Tienda Boutique */}
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800">
            <input
              type="checkbox"
              id="storeCheckModal"
              checked={newCompanyStoreEnabled}
              onChange={e => setNewCompanyStoreEnabled(e.target.checked)}
              className="rounded border-slate-300 text-gold-500 focus:ring-gold-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="storeCheckModal" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Habilitar Módulo de Tienda Boutique & Catálogo de Productos
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setShowCreateCompanyModal(false)}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-industrial-400 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingCompany}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 font-bold uppercase tracking-wider shadow-glow-gold transition-all"
            >
              {creatingCompany ? 'Registrando...' : 'Registrar Barbería'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Usuario a Empresa */}
      {selectedUserForAssign && (
        <Modal
          isOpen={Boolean(selectedUserForAssign)}
          onClose={() => setSelectedUserForAssign(null)}
          title="Asignar Usuario a una Empresa"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAssignUserSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center gap-2.5">
              <img
                src={
                  selectedUserForAssign.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                }
                alt={selectedUserForAssign.displayName}
                className="w-10 h-10 rounded-full object-cover border border-gold-500/40"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white truncate">
                  {selectedUserForAssign.displayName || 'Usuario'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-industrial-400 font-mono truncate">
                  {selectedUserForAssign.email}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
                Seleccionar Barbería / Empresa *
              </label>
              {tenants.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  No hay barberías creadas todavía. Primero registra una barbería en la pestaña anterior.
                </div>
              ) : (
                <select
                  value={targetCompanyId}
                  onChange={e => setTargetCompanyId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="">-- Elige una barbería --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.municipality})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-industrial-300 uppercase mb-1">
                Rol en la Empresa *
              </label>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
              >
                <option value="admin">Administrador / Dueño de Barbería (Acceso Total al Salón)</option>
                <option value="user">Personal / Barbero (Acceso Operativo)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-industrial-800">
              <button
                type="button"
                onClick={() => setSelectedUserForAssign(null)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-industrial-400 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading || !targetCompanyId}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 font-bold uppercase tracking-wider shadow-glow-gold disabled:opacity-50"
              >
                {actionLoading ? 'Guardando...' : 'Confirmar Asignación'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SuperAdminConsole;


