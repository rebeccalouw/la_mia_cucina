import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  ChefHat, 
  FileText, 
  ShoppingCart,
  ExternalLink,
  Loader2,
  Calendar,
  Edit2,
  Trash2
} from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  image_url?: string;
  source_url?: string;
  is_imported?: boolean;
  created_at: string;
  categories?: string[];
}

interface RecipeDetailProps {
  recipeId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDelete: () => void;
}

export default function RecipeDetail({ recipeId, onBack, onEdit, onDelete }: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [recipeId]);

  const handleDelete = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete recipe');
      onDelete();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const fetchRecipe = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 403) throw new Error('Unauthorized access');
      if (response.status === 404) throw new Error('Recipe not found');
      if (!response.ok) throw new Error('Failed to fetch recipe');
      const data = await response.json();
      setRecipe(data);
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
        <p className="text-sage/60 font-medium">Loading recipe details...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-[2.5rem] border border-red-100 mb-8">
          <p className="text-xl font-serif mb-2">{error || 'Something went wrong'}</p>
          <p className="text-sm opacity-70">Please check your permissions or try again later.</p>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sage font-bold uppercase tracking-widest text-xs hover:text-terracotta transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Go back to recipes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sage/40 hover:text-sage font-bold uppercase tracking-widest text-xs transition-all group"
          >
            <div className="bg-white p-2 rounded-xl group-hover:bg-sage/5 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to list
          </button>

          <div className="flex md:hidden items-center gap-3 text-sage/30 text-xs font-bold uppercase tracking-widest">
            <Calendar className="w-4 h-4" />
            {new Date(recipe.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-6">
          <div className="hidden md:flex items-center gap-3 text-sage/30 text-xs font-bold uppercase tracking-widest mr-4">
            <Calendar className="w-4 h-4" />
            Added {new Date(recipe.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(recipe.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-sage/5 text-sage rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-sage/5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-500 p-1 rounded-xl shadow-lg shadow-red-200">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-white text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-white hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Image and Header Information */}
        <div className="lg:col-span-5 space-y-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square bg-sage/5 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-sage/10 border border-sage/5"
          >
            {recipe.image_url ? (
              <img 
                src={recipe.image_url} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                alt={recipe.title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ChefHat className="w-24 h-24 text-sage/10" />
              </div>
            )}
          </motion.div>

          <div className="bg-white rounded-[3rem] p-4 md:p-10 shadow-sm border border-sage/5">
            <div className="flex items-center gap-4 mb-4 md:mb-6">
              <h1 className="text-3xl md:text-4xl font-serif text-sage leading-tight">
                {recipe.title}
              </h1>
              {recipe.is_imported && (
                <span className="shrink-0 px-3 py-1 bg-terracotta text-white rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm h-fit">
                  Imported
                </span>
              )}
            </div>

            {recipe.categories && recipe.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {recipe.categories.map((cat) => (
                  <span 
                    key={cat} 
                    className="px-3 py-1 bg-sage/5 text-sage/60 rounded-full text-[10px] font-bold uppercase tracking-widest border border-sage/5"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sage/60 text-lg leading-relaxed italic mb-10">
              "{recipe.description || 'A cherished family recipe.'}"
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-cream rounded-2xl p-4 text-center border border-sage/5">
                <Clock className="w-5 h-5 text-sage/40 mx-auto mb-2" />
                <p className="text-xs uppercase font-bold tracking-tighter text-sage/40 mb-1">Total</p>
                <p className="text-sm font-bold text-sage">{recipe.prep_time + recipe.cook_time}m</p>
              </div>
              <div className="bg-cream rounded-2xl p-4 text-center border border-sage/5">
                <Users className="w-5 h-5 text-sage/40 mx-auto mb-2" />
                <p className="text-xs uppercase font-bold tracking-tighter text-sage/40 mb-1">Serves</p>
                <p className="text-sm font-bold text-sage">{recipe.servings}</p>
              </div>
              <div className="bg-cream rounded-2xl p-4 text-center border border-sage/5">
                <ChefHat className="w-5 h-5 text-sage/40 mx-auto mb-2" />
                <p className="text-xs uppercase font-bold tracking-tighter text-sage/40 mb-1">Prep</p>
                <p className="text-sm font-bold text-sage">{recipe.prep_time}m</p>
              </div>
            </div>

            {recipe.source_url && (
              <a 
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex items-center justify-center gap-2 w-full py-4 bg-sage/5 hover:bg-sage/10 text-sage rounded-2xl text-sm font-bold transition-all border border-sage/5"
              >
                <ExternalLink className="w-4 h-4" />
                View Original Source
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Ingredients and Instructions */}
        <div className="lg:col-span-7 space-y-10">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[3.5rem] p-4 md:p-12 shadow-sm border border-sage/5"
          >
            <div className="flex items-center gap-4 mb-6 md:mb-10 pb-6 border-b border-sage/5">
              <div className="bg-ochre/10 p-3 rounded-2xl">
                <ShoppingCart className="w-6 h-6 text-ochre" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif text-sage tracking-tight">Ingredients</h2>
            </div>
            <div className="prose prose-sage max-w-none prose-sm lg:prose-base">
              <div className="whitespace-pre-wrap text-sage/70 font-medium leading-[2]">
                {recipe.ingredients}
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[3.5rem] p-4 md:p-12 shadow-sm border border-sage/5"
          >
            <div className="flex items-center gap-4 mb-6 md:mb-10 pb-6 border-b border-sage/5">
              <div className="bg-terracotta/10 p-3 rounded-2xl">
                <FileText className="w-6 h-6 text-terracotta" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif text-sage tracking-tight">Method</h2>
            </div>
            <div className="prose prose-sage max-w-none prose-sm lg:prose-base">
              <div className="whitespace-pre-wrap text-sage/70 leading-[1.8]">
                {recipe.instructions}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
