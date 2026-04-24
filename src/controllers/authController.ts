import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../lib/db.ts';
import { generateToken } from '../lib/auth.ts';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../services/emailService.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'mia-cucina-jwt-secret-dev';

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id', [email, hashedPassword, name]);
    
    const user = { id: result.rows[0].id, email, name };
    const token = generateToken(user);
    
    res.status(201).json({ user, token });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]) as any;
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = { id: user.id, email: user.email, name: user.name };
    const token = generateToken(userData);
    
    res.json({ user: userData, token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};

export const me = (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; name: string };
    res.json({ id: decoded.userId, email: decoded.email, name: decoded.name });
  } catch (err) {
    res.status(401).json({ error: 'Invalid session' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = (req as any).user.userId;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    await db.run('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    
    // Get updated user data
    const user = await db.get('SELECT id, email, name FROM users WHERE id = $1', [userId]) as any;
    const token = generateToken(user);
    
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = (req as any).user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = await db.get('SELECT password FROM users WHERE id = $1', [userId]) as any;
    
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await db.get('SELECT id FROM users WHERE email = $1', [email]) as any;
    
    if (!user) {
      return res.json({ message: 'If that email exists in our records, a reset link has been generated.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // no toISOString

    await db.run('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, user.id]);
    
    let baseUrl = process.env.VITE_APP_URL?.trim();
    if (!baseUrl) {
      const protocol = req.get('host')?.includes('localhost') ? 'http' : 'https';
      baseUrl = `${protocol}://${req.get('host')}`;
    }
    
    const urlObj = new URL('/reset-password', baseUrl);
    urlObj.searchParams.set('reset_token', token);
    const resetLink = urlObj.toString();
    
    console.log(`[AUTH] Generated reset link for ${email}: ${resetLink}`);
    
    try {
      await sendResetPasswordEmail(email, resetLink);
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
    }

    res.json({ 
      message: 'If that email exists in our records, a reset link has been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  try {
    const user = await db.get('SELECT id, reset_token_expiry FROM users WHERE reset_token = $1', [token]) as any;

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    console.log('Raw expiry from DB:', user.reset_token_expiry);
    console.log('Parsed expiry:', new Date(user.reset_token_expiry).toISOString());
    console.log('Now:', new Date().toISOString());

    if (new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.run(`
      UPDATE users 
      SET password = $1, reset_token = NULL, reset_token_expiry = NULL 
      WHERE id = $2
    `, [hashedPassword, user.id]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
