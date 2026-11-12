import express from 'express';
import {
  getAllTenants,
  getGlobalMetrics,
  updateTenantSubscription,
  generateWhatsAppPaymentAlert
} from '../controllers/superadmin.controller.js';
import { requireSuperAdmin } from '../middlewares/superadmin.middleware.js';

const router = express.Router();

// Aplicar middleware de autorización de SuperAdmin a todas las rutas
router.use(requireSuperAdmin);

/**
 * @route   GET /api/superadmin/metrics
 * @desc    Métricas globales del SaaS (MRR, conteos por vertical y municipio)
 */
router.get('/metrics', getGlobalMetrics);

/**
 * @route   GET /api/superadmin/tenants
 * @desc    Listar todos los negocios con estado de suscripción, urgencia y datos del dueño
 */
router.get('/tenants', getAllTenants);

/**
 * @route   PATCH /api/superadmin/tenants/:id/subscription
 * @desc    Cambiar estado de suscripción o extender días de corte de un tenant
 */
router.patch('/tenants/:id/subscription', updateTenantSubscription);

/**
 * @route   POST /api/superadmin/tenants/:id/whatsapp-alert
 * @desc    Generar mensaje y enlace de WhatsApp directo hacia el dueño
 */
router.post('/tenants/:id/whatsapp-alert', generateWhatsAppPaymentAlert);

export default router;

