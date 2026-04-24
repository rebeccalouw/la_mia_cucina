import { Router } from 'express';
import { register, login, logout, me, updateProfile, changePassword, forgotPassword, resetPassword } from '../controllers/authController.ts';
import { isAuthenticated } from '../lib/auth.ts';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);
router.post('/update-profile', isAuthenticated, updateProfile);
router.post('/change-password', isAuthenticated, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
