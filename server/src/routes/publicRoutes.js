import { Router } from 'express';
import {
  getBarbershopBySlug,
  getPublicSlots,
  createPublicBooking,
  getPublicProducts,
  createPublicOrder
} from '../controllers/publicController.js';
import { registerNewBusiness } from '../controllers/onboarding.controller.js';

const router = Router();

// Alta y Registro de Nuevos Negocios (Wizard Onboarding con 14 días gratis)
router.post('/onboarding', registerNewBusiness);

// Resolver barbería por su slug (ej: /black-gold)
router.get('/barbershop/:slug', getBarbershopBySlug);

// Disponibilidad de slots por fecha y barbero
router.get('/barbershop/:slug/slots', getPublicSlots);

// Agendar cita sin cuenta (Landing del cliente)
router.post('/barbershop/:slug/book', createPublicBooking);

// Catálogo de productos para la tienda online de la barbería
router.get('/barbershop/:slug/products', getPublicProducts);

// Pedido Click & Collect / Envío de productos
router.post('/barbershop/:slug/orders', createPublicOrder);

export default router;
