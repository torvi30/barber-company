import { Router } from 'express';
import { getInventory, updateStock } from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.patch('/:id/stock', updateStock);

export default router;

