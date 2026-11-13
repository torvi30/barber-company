import { Router } from 'express';
import {
  calculateDailySummary,
  executeCashClosure,
  getCashClosureHistory,
  addCashMovement,
  deleteCashMovement
} from '../controllers/cashClosureController.js';

const router = Router();

router.get('/summary', calculateDailySummary);
router.post('/close', executeCashClosure);
router.get('/history', getCashClosureHistory);
router.post('/movements', addCashMovement);
router.delete('/movements/:id', deleteCashMovement);

export default router;
