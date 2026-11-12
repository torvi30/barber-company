import { Router } from 'express';
import {
  getClients,
  getClientById,
  updateClientStyleProfile,
  createClient,
  getWhatsAppReminder
} from '../controllers/clientController.js';

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClientById);
router.patch('/:id/style-profile', updateClientStyleProfile);
router.get('/:id/whatsapp-reminder', getWhatsAppReminder);

export default router;

