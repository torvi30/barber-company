import { Router } from 'express';
import {
  syncUser,
  getUserStatus,
  listPlatformUsers,
  assignUserCompany,
  deleteUser,
  updateBarbershopSettings,
  updateUserProfile
} from '../controllers/authController.js';

const router = Router();

router.post('/sync', syncUser);
router.get('/status/:uid', getUserStatus);
router.get('/users', listPlatformUsers);
router.post('/users/assign', assignUserCompany);
router.delete('/users/:uid', deleteUser);
router.patch('/barbershops/:barbershopId/settings', updateBarbershopSettings);
router.patch('/profile', updateUserProfile);

export default router;
