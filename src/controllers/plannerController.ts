import { Request, Response } from 'express';
import db from '../lib/db.ts';

export const createMealPlan = async (req: Request, res: Response) => {
  const { recipeId, freezerItemId, date, mealType, notes } = req.body;
  const userId = (req as any).user.userId;

  if ((!recipeId && !freezerItemId) || !date || !mealType) {
    return res.status(400).json({ error: 'Recipe or Freezer Item, date, and meal type are required' });
  }

  // Validate recipe if provided
  if (recipeId) {
    const recipe = await db.get('SELECT id FROM recipes WHERE id = $1 AND user_id = $2', [recipeId, userId]);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found in your pantry' });
    }
  }

  // Validate freezer item if provided
  if (freezerItemId) {
    const item = await db.get('SELECT id FROM freezer_items WHERE id = $1 AND user_id = $2', [freezerItemId, userId]);
    if (!item) {
      return res.status(404).json({ error: 'Freezer item not found' });
    }
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }

  try {
    const result = await db.run(`
      INSERT INTO meal_plans (user_id, recipe_id, freezer_item_id, date, meal_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, recipeId || null, freezerItemId || null, date, mealType, notes || '']);
    
    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Meal plan created successfully' 
    });
  } catch (err: any) {
    console.error('Error creating meal plan:', err);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
};

export const getMealPlans = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { start, end } = req.query;

  try {
    let query = `
      SELECT 
        mp.*, 
        r.title as recipe_title, 
        r.image_url as recipe_image,
        fi.name as freezer_item_name
      FROM meal_plans mp
      LEFT JOIN recipes r ON mp.recipe_id = r.id
      LEFT JOIN freezer_items fi ON mp.freezer_item_id = fi.id
      WHERE mp.user_id = $1
    `;
    const params: any[] = [userId];

    if (start && end) {
      query += ` AND mp.date BETWEEN $2 AND $3`;
      params.push(start, end);
    }

    query += ` ORDER BY mp.date ASC, mp.meal_type ASC`;

    const plans = await db.all(query, params);
    
    res.json(plans);
  } catch (err: any) {
    console.error('Error fetching meal plans:', err);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
};

export const deleteMealPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;

  try {
    const result = await db.run('DELETE FROM meal_plans WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Meal plan not found or unauthorized' });
    }

    res.json({ message: 'Meal plan deleted' });
  } catch (err: any) {
    console.error('Error deleting meal plan:', err);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
};

export const updateMealPlan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { recipeId, freezerItemId, date, mealType, notes } = req.body;
  const userId = (req as any).user.userId;

  if ((!recipeId && !freezerItemId) || !date || !mealType) {
    return res.status(400).json({ error: 'Recipe or Freezer Item, date, and meal type are required' });
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }

  try {
    const result = await db.run(`
      UPDATE meal_plans 
      SET recipe_id = $1, freezer_item_id = $2, date = $3, meal_type = $4, notes = $5
      WHERE id = $6 AND user_id = $7
    `, [recipeId || null, freezerItemId || null, date, mealType, notes || '', id, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Meal plan not found or unauthorized' });
    }

    res.json({ message: 'Meal plan updated successfully' });
  } catch (err: any) {
    console.error('Error updating meal plan:', err);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
};
