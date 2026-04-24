import { Request, Response } from 'express';
import db from '../lib/db.ts';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};
