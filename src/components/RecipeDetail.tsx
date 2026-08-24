import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ChefHat,
  ExternalLink,
  Loader2,
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

  /** Split a stored newline-delimited block, stripping any bullets or numbers
   *  the author typed in — the layout supplies its own. */
  const parseLines = (text: string) =>
    (text || '')
      .split('\n')
      .map(line => line.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''))
      .filter(Boolean);

  if (loading) {
    return <Loading message="Opening the recipe…" />;
  }

  if (error || !recipe) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="border border-brick/40 bg-brick/5 p-10 mb-8">
          <p className="font-serif text-2xl text-brick mb-3">{error || 'Something went wrong'}</p>
          <p className="text-sm text-earth/60">Check your permissions, or try again in a moment.</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-3 mx-auto text-[10px] font-semibold uppercase tracking-[0.26em] text-sage hover:text-terracotta transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to recipes
        </button>
      </div>
    );
  }

  const ingredients = parseLines(recipe.ingredients);
  const steps = parseLines(recipe.instructions);

  // Editorial drop cap: the first letter is lifted out of the opening sentence.
  const blurb = (recipe.description || '').trim();
  const dropCap = blurb.charAt(0);
  const blurbRest = blurb.slice(1);

  const savedOn = new Date(recipe.created_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      {/* Thin bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-10 border-b border-sage/20">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-sage/60 hover:text-sage transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to recipes
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onEdit(recipe.id)}
            className="px-5 py-2.5 border border-sage/30 text-sage text-[9px] font-semibold uppercase tracking-[0.24em] hover:bg-sage/5 transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="px-5 py-2.5 border border-brick/40 text-brick text-[9px] font-semibold uppercase tracking-[0.24em] hover:bg-brick/5 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2 border border-brick/40 bg-brick/5 pl-4 pr-1.5 py-1.5">
              <span className="font-serif italic text-sm text-brick">Delete for good?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 bg-brick text-cream text-[9px] font-semibold uppercase tracking-[0.2em] hover:bg-earth transition-colors flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-sage hover:text-earth transition-colors"
              >
                Keep it
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left: the plate, the numbers, the shopping */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-square bg-sage/5 overflow-hidden"
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
                <ChefHat className="w-24 h-24 text-sage/20" strokeWidth={1} />
              </div>
            )}
            {recipe.categories && recipe.categories.length > 0 && (
              <div className="absolute left-5 bottom-5 flex flex-wrap gap-2">
                {recipe.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3.5 py-1.5 bg-cream/95 text-sage text-[8px] font-semibold uppercase tracking-[0.26em]"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* Numbers, as a ruled band rather than three little cards */}
          <div className="flex border-b border-sage/20">
            <div className="flex-1 py-6 text-center border-r border-sage/20">
              <p className="font-serif text-3xl leading-none">{recipe.prep_time}<span className="text-sm">m</span></p>
              <p className="micro mt-2">Prep</p>
            </div>
            <div className="flex-1 py-6 text-center border-r border-sage/20">
              <p className="font-serif text-3xl leading-none">{recipe.cook_time}<span className="text-sm">m</span></p>
              <p className="micro mt-2">Cook</p>
            </div>
            <div className="flex-1 py-6 text-center">
              <p className="font-serif text-3xl leading-none">{recipe.servings}</p>
              <p className="micro mt-2">Serves</p>
            </div>
          </div>

          <div className="pt-9">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.30em] text-terracotta mb-5">
              The shopping
            </h2>
            <ul className="space-y-3">
              {ingredients.map((item, index) => (
                <li key={index} className="flex items-baseline gap-3.5 text-[15px] leading-relaxed">
                  <span className="w-2 h-2 shrink-0 translate-y-[-1px] border border-sage/45" />
                  <span className="text-earth/85">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: the spread */}
        <div className="lg:col-span-7">
          <p className="label">
            {recipe.is_imported ? 'Imported' : 'Written here'} &nbsp;&mdash;&nbsp; saved {savedOn}
          </p>

          <h1 className="mt-3.5 text-[40px] md:text-[68px] leading-[0.96] tracking-[-0.025em] text-pretty">
            {recipe.title}
          </h1>

          {blurb && (
            <div className="flex gap-5 mt-7 pb-7 border-b-2 border-sage/65">
              <span className="font-serif text-[72px] leading-[0.72] text-terracotta shrink-0">{dropCap}</span>
              <p className="font-serif italic text-lg md:text-xl leading-relaxed text-earth/62">{blurbRest}</p>
            </div>
          )}

          <h2 className="text-[10px] font-semibold uppercase tracking-[0.32em] text-terracotta mt-9 mb-6">
            The method
          </h2>

          <ol>
            {steps.map((step, index) => (
              <li key={index} className="flex gap-5 md:gap-6 py-5 border-b border-sage/15 last:border-b-0">
                <span className="font-serif text-2xl leading-none text-sage/40 w-10 shrink-0 pt-1">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[17px] leading-relaxed text-earth">{step}</span>
              </li>
            ))}
          </ol>

          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-9 pt-6 border-t border-sage/20 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-terracotta hover:text-sage transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Read the original
            </a>
          )}
        </div>
      </div>
    </div>
  );
}