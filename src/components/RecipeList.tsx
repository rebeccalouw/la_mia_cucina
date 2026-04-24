import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Users, ChevronRight, Loader2, Utensils, Search, Filter, X, ChefHat } from 'lucide-react';

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
      setRecipes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
        <p className="text-sage/60 font-medium italic font-serif">Gathering your recipes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage/30 group-focus-within:text-terracotta transition-colors" />
          <input 
            type="text"
            placeholder="Search recipes by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-4 bg-white rounded-[1.5rem] border border-sage/5 shadow-sm focus:ring-4 focus:ring-terracotta/5 focus:border-terracotta/20 outline-none transition-all font-sans text-sage"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sage/30 hover:text-sage transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-sage/30 shrink-0 hidden md:block" />
          
          {/* Mobile Dropdown */}
          <div className="md:hidden w-full relative">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="w-full pl-5 pr-10 py-4 bg-white rounded-2xl border border-sage/5 shadow-sm text-sage font-bold uppercase tracking-widest text-xs appearance-none outline-none focus:ring-4 focus:ring-terracotta/5"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sage/30">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>

          {/* Desktop Chips */}
          <div className="hidden md:flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                !selectedCategory 
                  ? 'bg-terracotta text-cream shadow-md shadow-terracotta/10' 
                  : 'bg-white text-sage/60 hover:bg-sage/5 border border-sage/5'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-terracotta text-cream shadow-md shadow-terracotta/10' 
                    : 'bg-white text-sage/60 hover:bg-sage/5 border border-sage/5'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-[2.5rem] text-center border border-red-100">
          <p className="font-serif text-lg">{error}</p>
        </div>
      ) : recipes.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-32 bg-white/40 border-2 border-dashed border-sage/10 rounded-[3.5rem]"
        >
          <Utensils className="w-16 h-16 text-sage/10 mx-auto mb-6" />
          <h3 className="text-3xl font-serif text-sage/40 mb-3 italic">
            {searchQuery || selectedCategory ? "No matching recipes found" : "Your recipe box is empty"}
          </h3>
          <p className="text-sage/30 uppercase tracking-[0.2em] font-bold text-xs">
            {searchQuery || selectedCategory ? "Try adjusting your filters" : "Time to start your collection"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          <AnimatePresence>
            {recipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectRecipe(recipe.id)}
                className="group bg-white rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-sage/10 transition-all border border-sage/5 cursor-pointer flex flex-col h-full"
              >
                <div className="aspect-[16/10] bg-sage/5 relative overflow-hidden">
                  {recipe.image_url ? (
                    <img 
                      src={recipe.image_url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                      alt={recipe.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-12 h-12 text-sage/10" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <div className="bg-white/95 backdrop-blur-md px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold text-sage shadow-sm border border-sage/5 uppercase tracking-wider">
                      {recipe.prep_time + recipe.cook_time} min
                    </div>
                    {recipe.is_imported && (
                      <div className="bg-terracotta text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[7px] md:text-[8px] font-bold uppercase tracking-widest shadow-sm">
                        Imported
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-5 md:p-10 flex flex-col flex-1">
                  <h3 className="text-xl md:text-2xl font-serif text-sage mb-2 md:mb-4 group-hover:text-terracotta transition-colors line-clamp-1 leading-tight">
                    {recipe.title}
                  </h3>
                  <p className="text-sage/60 text-xs md:text-sm line-clamp-2 mb-4 md:mb-8 leading-relaxed italic">
                    {recipe.description || 'A cherished recipe for your collection.'}
                  </p>

                  <div className="mt-auto">
                    {recipe.categories && recipe.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 md:mb-8">
                        {recipe.categories.slice(0, 3).map((cat) => (
                          <span 
                            key={cat} 
                            className="px-2 md:px-3 py-1 bg-sage/5 text-sage/60 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-widest border border-sage/5"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 md:pt-8 border-t border-sage/5">
                      <div className="flex items-center gap-3 md:gap-6 text-[9px] md:text-[10px] font-bold text-sage/30 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          {recipe.cook_time} min
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          {recipe.servings}
                        </div>
                      </div>
                      <div className="bg-sage/5 group-hover:bg-terracotta group-hover:text-cream p-2 md:p-3 rounded-xl md:rounded-2xl transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-terracotta/20">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
