import express from 'express';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  handleWebhook,
  simulatePaymentEvent,
  SAAS_PLANS
} from '../controllers/subscription.controller.js';
import { requireTenant } from '../middlewares/tenant.js';

const router = express.Router();

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Obtener catálogo público de planes disponibles en el SaaS
 * @access  Public
 */
router.get('/plans', (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.values(SAAS_PLANS)
  });
});

/**
 * @route   POST /api/subscriptions/webhook
 * @desc    Webhook oficial para eventos de pasarela de pago (Stripe)
 * @access  Public (Valida firma HMAC SHA256 de Stripe)
 */
router.post('/webhook', handleWebhook);

/**
 * @route   GET /api/subscriptions/status
 * @desc    Consultar estado de suscripción, plan actual y fechas de corte del tenant
 * @access  Private (Requiere x-tenant-id)
 */
router.get('/status', requireTenant, getSubscriptionStatus);

/**
 * @route   POST /api/subscriptions/create-checkout-session
 * @desc    Generar sesión de pago / checkout para suscribirse a un plan
 * @access  Private (Requiere x-tenant-id)
 */
router.post('/create-checkout-session', requireTenant, createCheckoutSession);

/**
 * @route   POST /api/subscriptions/simulate-event
 * @desc    Simulador de eventos de pago para entornos de testing / demos
 * @access  Private (Requiere x-tenant-id)
 */
router.post('/simulate-event', requireTenant, simulatePaymentEvent);

export default router;

