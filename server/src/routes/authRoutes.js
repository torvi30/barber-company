import { Router } from 'express';
import { login, inviteAdmin, getAdminsByBarbershop, updateBarbershopSettings } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/invite-admin', inviteAdmin);
router.get('/admins/:barbershopId', getAdminsByBarbershop);
router.patch('/barbershops/:barbershopId/settings', updateBarbershopSettings);

export default router;

