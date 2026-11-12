import { Router } from 'express';
import { calculateDailySummary, executeCashClosure } from '../controllers/cashClosureController.js';

const router = Router();

router.get('/summary', calculateDailySummary);
router.post('/close', executeCashClosure);

export default router;

