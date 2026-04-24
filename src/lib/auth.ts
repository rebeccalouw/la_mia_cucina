import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mia-cucina-jwt-secret-dev';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized. Please log in.',
      code: 'AUTH_MISSING' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; name: string };
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ 
      error: 'Session expired. Please log in again.',
      code: 'AUTH_INVALID' 
    });
  }
}

export function generateToken(user: { id: number; email: string; name: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
