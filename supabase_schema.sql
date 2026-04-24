
-- Supabase / PostgreSQL Schema for La Mia Cucina

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT NOT NULL,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT,
  instructions TEXT,
  prep_time INTEGER DEFAULT 0,
  cook_time INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 1,
  image_url TEXT,
  source_url TEXT,
  is_imported INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 4. Recipe Categories Mapping
CREATE TABLE IF NOT EXISTS recipe_categories (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);

-- 5. Freezer Items Table
CREATE TABLE IF NOT EXISTS freezer_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('ingredient', 'meal')),
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Freezer Categories Table
CREATE TABLE IF NOT EXISTS freezer_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 7. Freezer Item Categories Mapping
CREATE TABLE IF NOT EXISTS freezer_item_categories (
  freezer_item_id INTEGER NOT NULL REFERENCES freezer_items(id) ON DELETE CASCADE,
  freezer_category_id INTEGER NOT NULL REFERENCES freezer_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (freezer_item_id, freezer_category_id)
);

-- 8. Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  freezer_item_id INTEGER REFERENCES freezer_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_freezer_items_user_id ON freezer_items(user_id);
