import { Router } from 'express';
import { createRecipe, getRecipes, getRecipe, updateRecipe, deleteRecipe } from '../controllers/recipeController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

router.post('/', isAuthenticated, createRecipe);
router.get('/', isAuthenticated, getRecipes);
router.get('/:id', isAuthenticated, getRecipe);
router.put('/:id', isAuthenticated, updateRecipe);
router.delete('/:id', isAuthenticated, deleteRecipe);

export default router;
