import { Router } from 'express';
import {
  syncUser,
  getUserStatus,
  listPlatformUsers,
  assignUserCompany,
  deleteUser,
  updateBarbershopSettings
} from '../controllers/authController.js';

const router = Router();

router.post('/sync', syncUser);
router.get('/status/:uid', getUserStatus);
router.get('/users', listPlatformUsers);
router.post('/users/assign', assignUserCompany);
router.delete('/users/:uid', deleteUser);
router.patch('/barbershops/:barbershopId/settings', updateBarbershopSettings);

export default router;
