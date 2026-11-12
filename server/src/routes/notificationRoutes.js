import { Router } from 'express';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationLogs,
  testDispatchNotification,
  triggerReminderCronManually
} from '../controllers/notificationController.js';

const router = Router();

router.get('/settings', getNotificationSettings);
router.patch('/settings', updateNotificationSettings);
router.get('/logs', getNotificationLogs);
router.post('/test-dispatch', testDispatchNotification);
router.post('/run-cron-reminders', triggerReminderCronManually);

export default router;

