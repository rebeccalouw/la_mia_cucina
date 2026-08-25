import { Request, Response } from 'express';
import db from '../lib/db.ts';

/**
 * The categories table is global — a label created on one account's recipe is a row every
 * account can reach, and nothing ever deletes one. Listing it wholesale put every category
 * anyone had ever typed into the filter rail, including ones whose recipes are long gone, so
 * most of them matched nothing. The list is the categories actually in use on the caller's
 * own recipes.
 */
export const getCategories = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const categories = await db.all(`
      SELECT DISTINCT c.id, c.name
      FROM categories c
      JOIN recipe_categories rc ON rc.category_id = c.id
      JOIN recipes r ON r.id = rc.recipe_id
      WHERE r.user_id = $1
      ORDER BY c.name ASC
    `, [userId]);
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};
