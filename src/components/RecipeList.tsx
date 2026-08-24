import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Search, X, ChefHat } from 'lucide-react';

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
}

export default function RecipeList({ onSelectRecipe }: RecipeListProps) {
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
    <div className="space-y-7">
      {/* Header: title left, search as a rule on the right */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <p className="label">
            The recipe box &nbsp;&mdash;&nbsp; {recipes.length} {recipes.length === 1 ? 'entry' : 'entries'}
          </p>
          <h1 className="mt-3 text-[40px] md:text-[64px] leading-none tracking-[-0.025em]">
            Everything <span className="italic font-normal text-sage">you cook</span>
          </h1>
        </div>

        <div className="w-full lg:w-[420px] flex items-center gap-3 border-b-2 border-sage/65 pb-3 focus-within:border-terracotta transition-colors">
          <Search className="w-[18px] h-[18px] text-sage/55 shrink-0" />
          <input
            type="text"
            placeholder="Search the box…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none font-serif italic text-lg text-earth placeholder:text-earth/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 -m-1 text-sage/40 hover:text-sage transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter rail */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pb-4 border-b border-sage/20">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] border-b-2 transition-colors ${
            !selectedCategory ? 'text-earth border-terracotta' : 'text-sage/55 border-transparent hover:text-sage'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] border-b-2 transition-colors ${
              selectedCategory === cat.name
                ? 'text-earth border-terracotta'
                : 'text-sage/55 border-transparent hover:text-sage'
            }`}
          >
            {cat.name}
          </button>
        ))}
        <span className="ml-auto micro">A &ndash; Z</span>
      </div>

      {error ? (
        <div className="border border-brick/40 bg-brick/5 text-brick p-8 text-center">
          <p className="font-serif text-lg">{error}</p>
        </div>
      ) : recipes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 px-8 border border-dashed border-sage/30"
        >
          <Utensils className="w-12 h-12 text-sage/25 mx-auto mb-6" strokeWidth={1.1} />
          <h3 className="font-serif italic text-3xl text-earth/60 mb-3">
            {filtering ? 'Nothing here matches' : 'Your recipe box is still empty'}
          </h3>
          <p className="micro">
            {filtering ? 'Try a different word, or clear the filters' : 'Time to start the collection'}
          </p>
          {filtering && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="btn-ghost mt-7"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 pt-3">
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
                className="group flex flex-col gap-3.5 text-left"
              >
                <div className="relative h-[250px] overflow-hidden bg-sage/5">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      alt={recipe.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-12 h-12 text-sage/20" strokeWidth={1.1} />
                    </div>
                  )}
                  {/* The index tag is notched into the corner, like a plate number. */}
                  <span className="absolute top-0 left-0 px-3.5 py-2 bg-cream font-serif text-[13px] text-sage">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {recipe.is_imported && (
                    <span className="absolute top-3.5 right-3.5 px-3 py-1.5 bg-terracotta text-cream text-[8px] font-semibold uppercase tracking-[0.24em]">
                      Imported
                    </span>
                  )}
                  <span className="absolute bottom-3.5 right-3.5 px-3 py-1.5 bg-cream/95 text-sage text-[8px] font-semibold uppercase tracking-[0.24em]">
                    {recipe.prep_time + recipe.cook_time} min
                  </span>
                </div>

                <h3 className="font-serif text-[26px] leading-[1.12] text-earth group-hover:text-terracotta transition-colors line-clamp-2">
                  {recipe.title}
                </h3>
                {recipe.description && (
                  <p className="font-serif italic text-[15px] leading-relaxed text-earth/55 line-clamp-2">
                    {recipe.description}
                  </p>
                )}

                <div className="mt-auto pt-3 border-t border-sage/20 flex items-center justify-between gap-4 micro">
                  <span className="truncate">
                    {recipe.categories?.length ? recipe.categories.slice(0, 2).join(' · ') : 'Uncategorised'}
                  </span>
                  <span className="shrink-0">Serves {recipe.servings}</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
