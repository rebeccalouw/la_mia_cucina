import { Request, Response } from 'express';
import db from '../lib/db.ts';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PlanInput {
  recipeId: number | null;
  freezerItemId: number | null;
  freezerItemName: string | null;
  date: string;
  mealType: string;
  notes: string;
}

/**
 * Validates a create/update body without touching the database, so a bad request can never
 * consume a freezer item. `freezerItemId` is a fresh pick from the freezer (the item is removed
 * when the plan is saved); `freezerItemName` carries an already-consumed item through an edit.
 */
function readPlanInput(body: any): { error: string } | { input: PlanInput } {
  const recipeId = body.recipeId || null;
  const freezerItemId = body.freezerItemId || null;
  const freezerItemName =
    typeof body.freezerItemName === 'string' && body.freezerItemName.trim()
      ? body.freezerItemName.trim()
      : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const { date, mealType } = body;

  if (!recipeId && !freezerItemId && !freezerItemName && !notes) {
    return { error: 'Recipe, Freezer Item, or Note, plus date and meal type are required' };
  }

  if (!date || !mealType) {
    return { error: 'Date and meal type are required' };
  }

  if (!DATE_PATTERN.test(date)) {
    return { error: 'Date must be in YYYY-MM-DD format' };
  }

  if (!MEAL_TYPES.includes(mealType)) {
    return { error: `Meal type must be one of: ${MEAL_TYPES.join(', ')}` };
  }

  return { input: { recipeId, freezerItemId, freezerItemName, date, mealType, notes } };
}

export const createMealPlan = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const parsed = readPlanInput(req.body);
  if ('error' in parsed) {
    return res.status(400).json({ error: parsed.error });
  }
  const { recipeId, freezerItemId, freezerItemName, date, mealType, notes } = parsed.input;

  try {
    const id = await db.transaction(async (client) => {
      if (recipeId) {
        const recipe = await client.query('SELECT id FROM recipes WHERE id = $1 AND user_id = $2', [recipeId, userId]);
        if (!recipe.rows[0]) throw new Error('RECIPE_NOT_FOUND');
      }

      // Planning a freezer meal consumes it: record the name on the plan, then remove the item.
      // Both happen in one transaction, so a failure can no longer lose the item.
      let itemName = freezerItemName;
      if (freezerItemId) {
        const item = await client.query('SELECT name FROM freezer_items WHERE id = $1 AND user_id = $2', [freezerItemId, userId]);
        if (!item.rows[0]) throw new Error('FREEZER_ITEM_NOT_FOUND');
        itemName = item.rows[0].name;
        await client.query('DELETE FROM freezer_items WHERE id = $1 AND user_id = $2', [freezerItemId, userId]);
      }

      const inserted = await client.query(`
        INSERT INTO meal_plans (user_id, recipe_id, freezer_item_name, date, meal_type, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [userId, recipeId, itemName, date, mealType, notes]);

      return inserted.rows[0].id;
    });

    res.status(201).json({
      id,
      message: freezerItemId
        ? 'Meal plan created and item removed from freezer'
        : 'Meal plan created'
    });
  } catch (err: any) {
    if (err.message === 'RECIPE_NOT_FOUND') return res.status(404).json({ error: 'Recipe not found in your pantry' });
    if (err.message === 'FREEZER_ITEM_NOT_FOUND') return res.status(404).json({ error: 'Freezer item not found' });

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
        mp.id,
        mp.user_id,
        mp.recipe_id,
        mp.freezer_item_name,
        TO_CHAR(mp.date, 'YYYY-MM-DD') as date,
        mp.meal_type,
        mp.notes,
        mp.created_at,
        r.title as recipe_title,
        r.image_url as recipe_image
      FROM meal_plans mp
      LEFT JOIN recipes r ON mp.recipe_id = r.id
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
  const userId = (req as any).user.userId;

  const parsed = readPlanInput(req.body);
  if ('error' in parsed) {
    return res.status(400).json({ error: parsed.error });
  }
  const { recipeId, freezerItemId, freezerItemName, date, mealType, notes } = parsed.input;

  try {
    await db.transaction(async (client) => {
      const existing = await client.query('SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2', [id, userId]);
      if (!existing.rows[0]) throw new Error('NOT_FOUND');

      if (recipeId) {
        const recipe = await client.query('SELECT id FROM recipes WHERE id = $1 AND user_id = $2', [recipeId, userId]);
        if (!recipe.rows[0]) throw new Error('RECIPE_NOT_FOUND');
      }

      // Only a freshly picked freezer item is consumed here. Editing a plan that already holds a
      // consumed item passes its name back through `freezerItemName` and deletes nothing, which
      // is what previously removed a second item on every edit.
      let itemName = freezerItemName;
      if (freezerItemId) {
        const item = await client.query('SELECT name FROM freezer_items WHERE id = $1 AND user_id = $2', [freezerItemId, userId]);
        if (!item.rows[0]) throw new Error('FREEZER_ITEM_NOT_FOUND');
        itemName = item.rows[0].name;
        await client.query('DELETE FROM freezer_items WHERE id = $1 AND user_id = $2', [freezerItemId, userId]);
      }

      await client.query(`
        UPDATE meal_plans
        SET recipe_id = $1, freezer_item_name = $2, date = $3, meal_type = $4, notes = $5
        WHERE id = $6 AND user_id = $7
      `, [recipeId, itemName, date, mealType, notes, id, userId]);
    });

    res.json({ message: 'Meal plan updated successfully' });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Meal plan not found or unauthorized' });
    if (err.message === 'RECIPE_NOT_FOUND') return res.status(404).json({ error: 'Recipe not found in your pantry' });
    if (err.message === 'FREEZER_ITEM_NOT_FOUND') return res.status(404).json({ error: 'Freezer item not found' });

    console.error('Error updating meal plan:', err);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
};
