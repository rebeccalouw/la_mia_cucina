import { Router } from 'express';
import { createMealPlan, getMealPlans, deleteMealPlan, updateMealPlan } from '../controllers/plannerController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

router.post('/', isAuthenticated, createMealPlan);
router.get('/', isAuthenticated, getMealPlans);
router.put('/:id', isAuthenticated, updateMealPlan);
router.delete('/:id', isAuthenticated, deleteMealPlan);

export default router;
