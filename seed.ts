
import db from './src/lib/db.ts';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Create a default user
    const password = await bcrypt.hash('password123', 10);
    await db.run(
      'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      ['chef@lamiacucina.com', 'Chef Mario', password]
    );
    
    const user = await db.get('SELECT id FROM users WHERE email = $1', ['chef@lamiacucina.com']) as any;
    const userId = user.id;

    // 2. Create Categories
    const categories = ['Italian', 'Pasta', 'Dessert', 'Quick & Easy', 'Vegetarian'];
    for (const cat of categories) {
      await db.run('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cat]);
    }

    const italianCat = await db.get('SELECT id FROM categories WHERE name = $1', ['Italian']) as any;
    const pastaCat = await db.get('SELECT id FROM categories WHERE name = $1', ['Pasta']) as any;
    const dessertCat = await db.get('SELECT id FROM categories WHERE name = $1', ['Dessert']) as any;

    // 3. Create Recipes
    const recipes = [
      {
        title: 'Classic Spaghetti Carbonara',
        description: 'The authentic Roman way: guanciale, eggs, pecorino romano, and black pepper.',
        ingredients: '400g Spaghetti\n150g Guanciale (or pancetta)\n4 Large egg yolks\n1 Whole egg\n100g Pecorino Romano\nFreshly cracked black pepper',
        instructions: '1. Boil pasta in salted water.\n2. Fry guanciale until crispy in a wide pan.\n3. Whisk eggs and cheese in a bowl.\n4. Toss pasta with guanciale off the heat.\n5. Add egg mixture and splash of pasta water, stirring vigorously to create a creamy sauce.',
        prep_time: 10,
        cook_time: 15,
        servings: 4,
        categories: [italianCat.id, pastaCat.id]
      },
      {
        title: 'Tiramisù della Nonna',
        description: 'The perfect pick-me-up dessert with layers of coffee-soaked ladyfingers and creamy mascarpone.',
        ingredients: '300g Savoiardi (Ladyfingers)\n500g Mascarpone cheese\n4 Eggs (separated)\n100g Sugar\n300ml Strong coffee/espresso\nCocoa powder for dusting',
        instructions: '1. Whisk yolks with sugar until pale.\n2. Fold in mascarpone.\n3. Whisk whites to stiff peaks and fold in.\n4. Dip ladyfingers in coffee and layer in a dish.\n5. Spread cream, repeat layers, and dust with cocoa.',
        prep_time: 30,
        cook_time: 0,
        servings: 6,
        categories: [italianCat.id, dessertCat.id]
      }
    ];

    for (const r of recipes) {
      const result = await db.run(`
        INSERT INTO recipes 
        (user_id, title, description, ingredients, instructions, prep_time, cook_time, servings) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [userId, r.title, r.description, r.ingredients, r.instructions, r.prep_time, r.cook_time, r.servings]);
      
      if (result.rowCount && result.rowCount > 0 && result.rows[0]) {
        const recipeId = result.rows[0].id;
        for (const catId of r.categories) {
          await db.run('INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [recipeId, catId]);
        }
      }
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
