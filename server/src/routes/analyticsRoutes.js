import { Router } from 'express';
import {
  getRevenueAnalytics,
  getPeakHoursHeatmap,
  getBarberPerformanceRanking,
  exportAccountingCSV
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/revenue', getRevenueAnalytics);
router.get('/peak-hours', getPeakHoursHeatmap);
router.get('/barber-performance', getBarberPerformanceRanking);
router.get('/export/csv', exportAccountingCSV);

export default router;

