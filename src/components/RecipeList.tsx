import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Search, X, ChefHat, Clock, Users, Plus } from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  image_url?: string;
  is_imported?: boolean;
  categories?: string[];
}

interface Category {
  id: number;
  name: string;
}

interface RecipeListProps {
  onSelectRecipe: (id: number) => void;
  onAddRecipe?: () => void;
}

/* The warm gradients a card falls back to when a recipe has no photograph. */
export const gradients = [
  'linear-gradient(140deg, #FFD9A8, #E9A87C)',
  'linear-gradient(140deg, #F6D9CF, #E2A38B)',
  'linear-gradient(140deg, #DCE9CF, #A9C78B)',
  'linear-gradient(140deg, #FFE2B8, #E8BC7A)',
  'linear-gradient(140deg, #FBD9D2, #DE9B8B)',
  'linear-gradient(140deg, #D7EBE3, #9CC7B8)',
];

/* 3 hr 20, not 200 min — the way a cook says it. */
export const readableTime = (minutes: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m}` : `${h} hr`;
};

export default function RecipeList({ onSelectRecipe, onAddRecipe }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipes();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchRecipes = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/recipes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      // Sort alphabetically by title
      const sortedData = (data as Recipe[]).sort((a, b) => a.title.localeCompare(b.title));
      setRecipes(sortedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Gathering your recipes…" />;
  }

  const filtering = Boolean(searchQuery || selectedCategory);

  return (
    <div className="flex flex-col gap-7">
      {/* Header: the count, the headline, the search box */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-7">
        <div className="flex-grow min-w-0">
          <p className="eyebrow">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in the box
          </p>
          <h1 className="h-page mt-2 text-[34px] md:text-[42px]">Everything you cook</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-full lg:w-[330px] flex items-center gap-2.5 rounded-2xl bg-surface border border-hairline px-4 py-[13px] transition-colors focus-within:border-coral">
            <Search className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search your recipes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 -m-1 text-fainter hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {onAddRecipe && (
            <button onClick={onAddRecipe} className="btn-primary shrink-0" title="Write a new recipe">
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
              <span className="hidden xl:inline">Write a recipe</span>
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={!selectedCategory ? 'chip-on !bg-ink' : 'chip'}
        >
          All {recipes.length}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={selectedCategory === cat.name ? 'chip-on' : 'chip'}
          >
            {cat.name}
          </button>
        ))}
        <span className="ml-auto text-[13px] font-semibold text-faint">A &ndash; Z</span>
      </div>

      {error ? (
        <div className="card border-brick/30 bg-brick-tint text-brick p-8 text-center">
          <p className="text-[17px]">{error}</p>
        </div>
      ) : recipes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-dashed text-center py-20 px-8 flex flex-col items-center gap-4"
        >
          <Utensils className="w-11 h-11 text-fainter" strokeWidth={1.4} />
          <h3 className="dsp text-[24px] font-bold tracking-[-0.02em]">
            {filtering ? 'Nothing here matches' : 'Your recipe box is still empty'}
          </h3>
          <p className="text-[15px] text-muted">
            {filtering ? 'Try a different word, or clear the filters' : 'Time to start the collection'}
          </p>
          {filtering ? (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="btn-ghost mt-1"
            >
              Clear filters
            </button>
          ) : onAddRecipe ? (
            <button onClick={onAddRecipe} className="btn-primary mt-1">
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
              Write a new recipe
            </button>
          ) : null}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          <AnimatePresence>
            {recipes.map((recipe, index) => (
              <motion.button
                key={recipe.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onSelectRecipe(recipe.id)}
                className="group card overflow-hidden flex flex-col text-left transition-colors hover:border-fainter"
              >
                <div
                  className="relative h-[168px] shrink-0"
                  style={{ background: gradients[index % gradients.length] }}
                >
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      alt={recipe.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-11 h-11 text-white/70" strokeWidth={1.4} />
                    </div>
                  )}
                  {recipe.categories?.length ? (
                    <span className="absolute top-3 left-3 rounded-full bg-white/92 px-[11px] py-[5px] label text-muted">
                      {recipe.categories[0]}
                    </span>
                  ) : null}
                  {recipe.is_imported && (
                    <span className="absolute top-3 right-3 rounded-full bg-coral px-[11px] py-[5px] label text-oncoral">
                      Imported
                    </span>
                  )}
                </div>

                <div className="flex-grow flex flex-col gap-2 px-[18px] pt-4 pb-[18px]">
                  <h3 className="dsp text-[20px] font-bold tracking-[-0.025em] leading-[1.15] line-clamp-2 transition-colors group-hover:text-coral">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-[14px] leading-[1.45] text-muted line-clamp-2">{recipe.description}</p>
                  )}
                  <div className="mt-auto pt-3 border-t border-hairline-soft flex items-center gap-4 text-[13px] text-faint">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-[15px] h-[15px] text-fainter" strokeWidth={2} />
                      {readableTime((recipe.prep_time || 0) + (recipe.cook_time || 0))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-[15px] h-[15px] text-fainter" strokeWidth={2} />
                      Serves {recipe.servings}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
