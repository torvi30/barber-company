import { Router } from 'express';
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getAvailableSlots,
  toggleSlot
} from '../controllers/appointmentController.js';

const router = Router();

router.get('/', getAppointments);
router.get('/available-slots', getAvailableSlots);
router.post('/toggle-slot', toggleSlot);
router.post('/', createAppointment);
router.patch('/:id/status', updateAppointmentStatus);
router.delete('/:id', deleteAppointment);

export default router;
