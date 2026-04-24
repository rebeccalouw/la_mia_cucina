import { Router } from 'express';
import { fetchUrlPreview } from '../controllers/importController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

router.post('/preview', isAuthenticated, fetchUrlPreview);

export default router;
