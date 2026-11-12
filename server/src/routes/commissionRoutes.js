import { Router } from 'express';
import {
  getBarbers,
  getBarberById,
  createBarber,
  updateBarber,
  deleteBarber,
  getBarberPersonalDashboard,
  updateBarberStatus,
  updateBarberSchedule,
  getCommissionSummary
} from '../controllers/commissionController.js';

const router = Router();

// Barberos del tenant (CRUD Completo)
router.get('/barbers', getBarbers);
router.post('/barbers', createBarber);
router.get('/barbers/:id', getBarberById);
router.patch('/barbers/:id', updateBarber);
router.delete('/barbers/:id', deleteBarber);

router.get('/barbers/:id/dashboard', getBarberPersonalDashboard);
router.patch('/barbers/:id/status', updateBarberStatus);
router.patch('/barbers/:id/schedule', updateBarberSchedule);

// Resumen de comisiones para el dueño/administrador
router.get('/summary', getCommissionSummary);

export default router;
