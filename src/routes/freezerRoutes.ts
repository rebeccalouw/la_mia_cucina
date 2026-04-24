import { Router } from 'express';
import { getFreezerItems, getFreezerCategories, createFreezerItem, updateFreezerItem, deleteFreezerItem } from '../controllers/freezerController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

router.get('/', isAuthenticated, getFreezerItems);
router.get('/categories', isAuthenticated, getFreezerCategories);
router.post('/', isAuthenticated, createFreezerItem);
router.put('/:id', isAuthenticated, updateFreezerItem);
router.delete('/:id', isAuthenticated, deleteFreezerItem);

export default router;
