import { Router } from 'express';
import { getCategories } from '../controllers/categoryController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

router.get('/', isAuthenticated, getCategories);

export default router;
