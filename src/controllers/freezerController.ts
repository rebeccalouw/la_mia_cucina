import { Request, Response } from 'express';
import db from '../lib/db.ts';

export const getFreezerItems = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const query = `
      SELECT f.*, STRING_AGG(c.name, ',') as category_names
      FROM freezer_items f
      LEFT JOIN freezer_item_categories fic ON f.id = fic.freezer_item_id
      LEFT JOIN freezer_categories c ON fic.freezer_category_id = c.id
      WHERE f.user_id = $1
      GROUP BY f.id
      ORDER BY f.placed_at DESC
    `;
    const items = await db.all(query, [userId]) as any[];
    
    const transformed = items.map(item => ({
      ...item,
      categories: item.category_names ? item.category_names.split(',') : []
    }));

    res.json(transformed);
  } catch (err) {
    console.error('Error fetching freezer items:', err);
    res.status(500).json({ error: 'Failed to fetch freezer items' });
  }
};

export const getFreezerCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db.all('SELECT * FROM freezer_categories ORDER BY name ASC');
    res.json(categories);
  } catch (err) {
    console.error('Error fetching freezer categories:', err);
    res.status(500).json({ error: 'Failed to fetch freezer categories' });
  }
};

export const createFreezerItem = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { name, type, placed_at, categories } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  try {
    const result = await db.transaction(async (client) => {
      const res = await client.query('INSERT INTO freezer_items (user_id, name, type, placed_at) VALUES ($1, $2, $3, $4) RETURNING id', [userId, name, type, placed_at || new Date().toISOString()]);
      const itemId = res.rows[0].id;

      if (categories && Array.isArray(categories)) {
        for (const catName of categories) {
          if (!catName || typeof catName !== 'string') continue;
          const normalized = catName.trim();
          if (!normalized) continue;

          const catRes = await client.query('SELECT id FROM freezer_categories WHERE name = $1', [normalized]);
          let category = catRes.rows[0];
          
          if (!category) {
            const newCatRes = await client.query('INSERT INTO freezer_categories (name) VALUES ($1) RETURNING id', [normalized]);
            category = { id: newCatRes.rows[0].id };
          }

          await client.query('INSERT INTO freezer_item_categories (freezer_item_id, freezer_category_id) VALUES ($1, $2)', [itemId, category.id]);
        }
      }

      return { id: itemId, name, type, placed_at, categories: categories || [] };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating freezer item:', err);
    res.status(500).json({ error: 'Failed to create freezer item' });
  }
};

export const updateFreezerItem = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { name, type, placed_at, categories } = req.body;

  try {
    await db.transaction(async (client) => {
      const itemRes = await client.query('SELECT user_id FROM freezer_items WHERE id = $1', [id]);
      const item = itemRes.rows[0];
      if (!item) throw new Error('NOT_FOUND');
      if (item.user_id !== userId) throw new Error('UNAUTHORIZED');

      await client.query('UPDATE freezer_items SET name = $1, type = $2, placed_at = $3 WHERE id = $4', [name, type, placed_at, id]);

      // Sync categories
      await client.query('DELETE FROM freezer_item_categories WHERE freezer_item_id = $1', [id]);

      if (categories && Array.isArray(categories)) {
        for (const catName of categories) {
          if (!catName || typeof catName !== 'string') continue;
          const normalized = catName.trim();
          if (!normalized) continue;

          const catRes = await client.query('SELECT id FROM freezer_categories WHERE name = $1', [normalized]);
          let category = catRes.rows[0];
          
          if (!category) {
            const newCatRes = await client.query('INSERT INTO freezer_categories (name) VALUES ($1) RETURNING id', [normalized]);
            category = { id: newCatRes.rows[0].id };
          }

          await client.query('INSERT INTO freezer_item_categories (freezer_item_id, freezer_category_id) VALUES ($1, $2)', [id, category.id]);
        }
      }
    });

    res.json({ message: 'Item updated' });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Item not found' });
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    console.error('Error updating freezer item:', err);
    res.status(500).json({ error: 'Failed to update freezer item' });
  }
};

export const deleteFreezerItem = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  try {
    const item = await db.get('SELECT user_id FROM freezer_items WHERE id = $1', [id]) as any;
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

    await db.run('DELETE FROM freezer_items WHERE id = $1', [id]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting freezer item:', err);
    res.status(500).json({ error: 'Failed to delete freezer item' });
  }
};
