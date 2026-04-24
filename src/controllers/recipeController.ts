import { Request, Response } from 'express';
import db from '../lib/db.ts';

export const createRecipe = async (req: Request, res: Response) => {
  const { title, description, ingredients, instructions, prep_time, cook_time, servings, image_url, source_url, is_imported, is_public, categories } = req.body;
  const userId = (req as any).user.userId;

  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
  }

  const prepTimeNum = parseInt(prep_time) || 0;
  const cookTimeNum = parseInt(cook_time) || 0;
  const servingsNum = parseInt(servings) || 1;

  if (prepTimeNum < 0 || cookTimeNum < 0 || servingsNum < 1) {
    return res.status(400).json({ error: 'Prep time, cook time must be non-negative, and servings must be at least 1' });
  }

  try {
    const result = await db.transaction(async (client) => {
      const res = await client.query(`
        INSERT INTO recipes (user_id, title, description, ingredients, instructions, prep_time, cook_time, servings, image_url, source_url, is_imported, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        userId,
        title,
        description || '',
        ingredients,
        instructions,
        prep_time || 0,
        cook_time || 0,
        servings || 1,
        image_url || '',
        source_url || '',
        is_imported ? 1 : 0,
        is_public ? 1 : 0
      ]);

      const recipeId = res.rows[0].id;

      if (categories && Array.isArray(categories)) {
        for (const catName of categories) {
          if (!catName || typeof catName !== 'string') continue;
          const normalized = catName.trim();
          if (!normalized) continue;

          const catRes = await client.query('SELECT id FROM categories WHERE name = $1', [normalized]);
          let category = catRes.rows[0];
          
          if (!category) {
            const newCatRes = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [normalized]);
            category = { id: newCatRes.rows[0].id };
          }

          await client.query('INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2)', [recipeId, category.id]);
        }
      }

      return { id: recipeId, title };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating recipe:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
};

export const getRecipes = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { search, category } = req.query;

  try {
    let query = `
      SELECT r.*, STRING_AGG(c.name, ',') as category_names
      FROM recipes r
      LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
      LEFT JOIN categories c ON rc.category_id = c.id
      WHERE r.user_id = $1
    `;
    const params: any[] = [userId];

    if (search) {
      query += ` AND r.title ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    if (category) {
      query += ` AND r.id IN (
        SELECT recipe_id FROM recipe_categories rc2 
        JOIN categories c2 ON rc2.category_id = c2.id 
        WHERE c2.name = $${params.length + 1}
      )`;
      params.push(category);
    }

    query += ` GROUP BY r.id ORDER BY r.created_at DESC`;

    const recipes = await db.all(query, params) as any[];

    // Transform comma-separated string back into array
    const transformed = recipes.map(r => ({
      ...r,
      categories: r.category_names ? r.category_names.split(',') : []
    }));

    res.json(transformed);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

export const getRecipe = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const recipeId = req.params.id;

  try {
    const recipe = await db.get('SELECT * FROM recipes WHERE id = $1', [recipeId]) as any;

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipe.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this recipe' });
    }

    const categories = await db.all(`
      SELECT c.name FROM categories c
      JOIN recipe_categories rc ON c.id = rc.category_id
      WHERE rc.recipe_id = $1
    `, [recipeId]) as any[];

    recipe.categories = categories.map(c => c.name);

    res.json(recipe);
  } catch (err) {
    console.error('Error fetching recipe:', err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

export const updateRecipe = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const recipeId = req.params.id;
  const { title, description, ingredients, instructions, prep_time, cook_time, servings, image_url, source_url, is_public, categories } = req.body;

  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
  }

  const prepTimeNum = parseInt(prep_time) || 0;
  const cookTimeNum = parseInt(cook_time) || 0;
  const servingsNum = parseInt(servings) || 1;

  if (prepTimeNum < 0 || cookTimeNum < 0 || servingsNum < 1) {
    return res.status(400).json({ error: 'Prep time, cook time must be non-negative, and servings must be at least 1' });
  }

  try {
    await db.transaction(async (client) => {
      const res = await client.query('SELECT user_id FROM recipes WHERE id = $1', [recipeId]);
      const recipe = res.rows[0];

      if (!recipe) throw new Error('NOT_FOUND');
      if (recipe.user_id !== userId) throw new Error('UNAUTHORIZED');

      await client.query(`
        UPDATE recipes 
        SET title = $1, description = $2, ingredients = $3, instructions = $4, prep_time = $5, cook_time = $6, servings = $7, image_url = $8, source_url = $9, is_public = $10
        WHERE id = $11
      `, [
        title,
        description || '',
        ingredients,
        instructions,
        prep_time || 0,
        cook_time || 0,
        servings || 1,
        image_url || '',
        source_url || '',
        is_public ? 1 : 0,
        recipeId
      ]);

      // Sync categories
      await client.query('DELETE FROM recipe_categories WHERE recipe_id = $1', [recipeId]);

      if (categories && Array.isArray(categories)) {
        for (const catName of categories) {
          if (!catName || typeof catName !== 'string') continue;
          const normalized = catName.trim();
          if (!normalized) continue;

          const catRes = await client.query('SELECT id FROM categories WHERE name = $1', [normalized]);
          let category = catRes.rows[0];
          
          if (!category) {
            const newCatRes = await client.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [normalized]);
            category = { id: newCatRes.rows[0].id };
          }

          await client.query('INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2)', [recipeId, category.id]);
        }
      }
    });

    res.json({ message: 'Recipe updated successfully' });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Recipe not found' });
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized to update this recipe' });
    
    console.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
};

export const deleteRecipe = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const recipeId = req.params.id;

  try {
    await db.transaction(async (client) => {
      const res = await client.query('SELECT user_id FROM recipes WHERE id = $1', [recipeId]);
      const recipe = res.rows[0];

      if (!recipe) throw new Error('NOT_FOUND');
      if (recipe.user_id !== userId) throw new Error('UNAUTHORIZED');

      // Categorized links will be deleted automatically due to CASCADE
      await client.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
    });

    res.json({ message: 'Recipe deleted successfully' });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Recipe not found' });
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized to delete this recipe' });

    console.error('Error deleting recipe:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
};
