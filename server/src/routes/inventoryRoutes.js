import { Router } from 'express';
import {
  getInventory,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/stock', updateStock);

export default router;
