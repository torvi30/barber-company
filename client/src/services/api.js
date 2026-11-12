const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Cliente API HTTP para BarberPulse OS
 * Incluye inyección automática del tenant header (x-barbershop-id)
 */
export const apiClient = async (endpoint, options = {}, tenantId = 'demo-barbershop-01') => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tenantId && { 'x-barbershop-id': tenantId }),
      ...(options.headers || {})
    }
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Error en petición al servidor');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // --- Rutas Públicas (Landing del Cliente & Tienda) ---
  getPublicBarbershop: (slug) => apiClient(`/public/barbershop/${slug}`, { method: 'GET' }, null),
  getPublicSlots: (slug, barberId, date) => apiClient(`/public/barbershop/${slug}/slots?barberId=${barberId}&date=${date}`, { method: 'GET' }, null),
  createPublicBooking: (slug, bookingData) => apiClient(`/public/barbershop/${slug}/book`, { method: 'POST', body: bookingData }, null),
  getPublicProducts: (slug) => apiClient(`/public/barbershop/${slug}/products`, { method: 'GET' }, null),
  createPublicOrder: (slug, orderData) => apiClient(`/public/barbershop/${slug}/orders`, { method: 'POST', body: orderData }, null),

  // --- Citas / Turnos (Staff / Operativo) ---
  getAppointments: (tenantId, date) => apiClient(`/appointments${date ? `?date=${date}` : ''}`, { method: 'GET' }, tenantId),
  getAvailableSlots: (tenantId, barberId, date) => apiClient(`/appointments/available-slots?barberId=${barberId}&date=${date}`, { method: 'GET' }, tenantId),
  toggleSlot: (tenantId, payload) => apiClient('/appointments/toggle-slot', { method: 'POST', body: payload }, tenantId),
  createAppointment: (tenantId, appointmentData) => apiClient('/appointments', { method: 'POST', body: appointmentData }, tenantId),
  updateAppointmentStatus: (tenantId, id, payload) => apiClient(`/appointments/${id}/status`, { method: 'PATCH', body: payload }, tenantId),

  // --- Autenticación & Gestión de Roles / Invitaciones ---
  loginUser: (credentials) => apiClient('/auth/login', { method: 'POST', body: credentials }, null),
  inviteAdmin: (invitationData) => apiClient('/auth/invite-admin', { method: 'POST', body: invitationData }, null),
  getAdminsByBarbershop: (tenantId) => apiClient(`/auth/admins/${tenantId}`, { method: 'GET' }, tenantId),
  updateBarbershopSettings: (tenantId, settings) => apiClient(`/auth/barbershops/${tenantId}/settings`, { method: 'PATCH', body: settings }, tenantId),

  // --- Barberos, Portal Staff & Horarios (Rostering & CRUD) ---
  getBarbers: (tenantId) => apiClient('/commissions/barbers', { method: 'GET' }, tenantId),
  getBarberById: (tenantId, id) => apiClient(`/commissions/barbers/${id}`, { method: 'GET' }, tenantId),
  createBarber: (tenantId, barberData) => apiClient('/commissions/barbers', { method: 'POST', body: barberData }, tenantId),
  updateBarber: (tenantId, id, barberData) => apiClient(`/commissions/barbers/${id}`, { method: 'PATCH', body: barberData }, tenantId),
  deleteBarber: (tenantId, id) => apiClient(`/commissions/barbers/${id}`, { method: 'DELETE' }, tenantId),
  getBarberDashboard: (tenantId, id) => apiClient(`/commissions/barbers/${id}/dashboard`, { method: 'GET' }, tenantId),
  updateBarberStatus: (tenantId, id, status) => apiClient(`/commissions/barbers/${id}/status`, { method: 'PATCH', body: { status } }, tenantId),
  updateBarberSchedule: (tenantId, id, data) => apiClient(`/commissions/barbers/${id}/schedule`, { method: 'PATCH', body: data }, tenantId),
  getCommissionSummary: (tenantId) => apiClient('/commissions/summary', { method: 'GET' }, tenantId),

  // --- Inventario ---
  getInventory: (tenantId) => apiClient('/inventory', { method: 'GET' }, tenantId),
  updateStock: (tenantId, id, adjustment) => apiClient(`/inventory/${id}/stock`, { method: 'PATCH', body: { adjustment } }, tenantId),

  // --- Cierre de Caja & Arqueo ---
  getCashSummary: (tenantId, openingCash = 100) => apiClient(`/cash-closures/summary?openingCash=${openingCash}`, { method: 'GET' }, tenantId),
  executeCashClosure: (tenantId, payload) => apiClient('/cash-closures/close', { method: 'POST', body: payload }, tenantId),

  // --- Clientes & CRM (Ficha de Estilo & Fidelización) ---
  getClients: (tenantId, search = '', tier = '') => apiClient(`/clients?search=${encodeURIComponent(search)}&tier=${tier}`, { method: 'GET' }, tenantId),
  getClientById: (tenantId, id) => apiClient(`/clients/${id}`, { method: 'GET' }, tenantId),
  updateClientStyleProfile: (tenantId, id, styleProfile) => apiClient(`/clients/${id}/style-profile`, { method: 'PATCH', body: { styleProfile } }, tenantId),
  createClient: (tenantId, clientData) => apiClient('/clients', { method: 'POST', body: clientData }, tenantId),
  getWhatsAppReminder: (tenantId, id) => apiClient(`/clients/${id}/whatsapp-reminder`, { method: 'GET' }, tenantId),

  // --- Analíticas & Business Intelligence ---
  getRevenueAnalytics: (tenantId, range = '7d') => apiClient(`/analytics/revenue?range=${range}`, { method: 'GET' }, tenantId),
  getPeakHoursHeatmap: (tenantId) => apiClient('/analytics/peak-hours', { method: 'GET' }, tenantId),
  getBarberPerformanceRanking: (tenantId) => apiClient('/analytics/barber-performance', { method: 'GET' }, tenantId),
  getExportAccountingUrl: (tenantId) => `${BASE_URL}/analytics/export/csv`,

  // --- Notificaciones & Webhooks Automatizados ---
  getNotificationSettings: (tenantId) => apiClient('/notifications/settings', { method: 'GET' }, tenantId),
  updateNotificationSettings: (tenantId, settings) => apiClient('/notifications/settings', { method: 'PATCH', body: settings }, tenantId),
  getNotificationLogs: (tenantId) => apiClient('/notifications/logs', { method: 'GET' }, tenantId),
  testDispatchNotification: (tenantId, payload) => apiClient('/notifications/test-dispatch', { method: 'POST', body: payload }, tenantId),
  runReminderCronNow: (tenantId) => apiClient('/notifications/run-cron-reminders', { method: 'POST' }, tenantId),

  // --- Suscripciones SaaS & Pasarela de Pagos (Stripe / Mercado Pago) ---
  getSubscriptionPlans: () => apiClient('/subscriptions/plans', { method: 'GET' }, null),
  getSubscriptionStatus: (tenantId) => apiClient('/subscriptions/status', { method: 'GET' }, tenantId),
  createCheckoutSession: (tenantId, planId, billingInterval = 'month', gateway = 'stripe') => apiClient('/subscriptions/create-checkout-session', { method: 'POST', body: { planId, billingInterval, gateway } }, tenantId),
  simulateSubscriptionPayment: (tenantId, eventType = 'invoice.payment_succeeded', planId = 'pro') => apiClient('/subscriptions/simulate-event', { method: 'POST', body: { eventType, planId } }, tenantId),

  // --- Onboarding & Autoconfiguración de Negocios (Wizard) ---
  registerNewBusiness: (businessData) => apiClient('/public/onboarding', { method: 'POST', body: businessData }, null),

  // --- Consola Central SuperAdmin (Casa Nodriza / Master Hub) ---
  getSuperAdminMetrics: () => apiClient('/superadmin/metrics', {
    method: 'GET',
    headers: { 'x-role': 'SUPERADMIN', 'x-admin-key': 'superadmin-secret-nodriza-2026' }
  }, null),
  getSuperAdminTenants: () => apiClient('/superadmin/tenants', {
    method: 'GET',
    headers: { 'x-role': 'SUPERADMIN', 'x-admin-key': 'superadmin-secret-nodriza-2026' }
  }, null),
  updateSuperAdminTenantSubscription: (tenantId, payload) => apiClient(`/superadmin/tenants/${tenantId}/subscription`, {
    method: 'PATCH',
    body: payload,
    headers: { 'x-role': 'SUPERADMIN', 'x-admin-key': 'superadmin-secret-nodriza-2026' }
  }, null),
  getSuperAdminWhatsAppAlert: (tenantId, alertType = 'expiring_soon') => apiClient(`/superadmin/tenants/${tenantId}/whatsapp-alert`, {
    method: 'POST',
    body: { alertType },
    headers: { 'x-role': 'SUPERADMIN', 'x-admin-key': 'superadmin-secret-nodriza-2026' }
  }, null),

  // --- Health ---
  checkHealth: () => fetch(`${BASE_URL}/health`).then(res => res.json())
};
