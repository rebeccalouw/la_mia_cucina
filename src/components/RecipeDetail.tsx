import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import { motion } from 'motion/react';
import { ChevronLeft, ChefHat, ExternalLink, Loader2, Pencil, Trash2, Calendar } from 'lucide-react';

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
  onPlan?: () => void;
}

export default function RecipeDetail({ recipeId, onBack, onEdit, onDelete, onPlan }: RecipeDetailProps) {
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
        <div className="card border-brick/30 bg-brick-tint p-10 mb-7">
          <p className="dsp text-[24px] font-bold text-brick mb-2">{error || 'Something went wrong'}</p>
          <p className="text-[15px] text-muted">Check your permissions, or try again in a moment.</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 mx-auto text-[14px] font-semibold text-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.2} /> Back to recipes
        </button>
      </div>
    );
  }

  const ingredients = parseLines(recipe.ingredients);
  const steps = parseLines(recipe.instructions);

  return (
    <div className="flex flex-col gap-7">
      {/* Bar: back on the left, what you can do on the right */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-[18px] h-[18px] text-faint" strokeWidth={2.2} />
          Back to recipes
        </button>

        <div className="flex items-center gap-2">
          {onPlan && (
            <button onClick={onPlan} className="btn-ghost !px-4 !py-[11px] !text-ink">
              <Calendar className="w-[17px] h-[17px] text-green" strokeWidth={2} />
              Plan it
            </button>
          )}
          <button onClick={() => onEdit(recipe.id)} className="btn-ghost !px-4 !py-[11px] !text-ink">
            <Pencil className="w-[17px] h-[17px] text-muted" strokeWidth={2} />
            Edit
          </button>
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-[42px] h-[42px] rounded-[14px] bg-surface border border-hairline flex items-center justify-center transition-colors hover:border-brick/40"
              title="Delete this recipe"
            >
              <Trash2 className="w-[17px] h-[17px] text-brick" strokeWidth={2} />
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-[14px] border border-brick/30 bg-brick-tint pl-4 pr-1.5 py-1.5">
              <span className="text-[14px] font-semibold text-brick">Delete for good?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-[10px] bg-brick px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-ink flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink transition-colors"
              >
                Keep it
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-7">
        {/* The words */}
        <div className="lg:col-span-3 flex flex-col gap-[22px] order-2 lg:order-1">
          <div>
            <div className="flex flex-wrap gap-2">
              {recipe.categories?.map((cat) => (
                <span key={cat} className="tag-coral">{cat}</span>
              ))}
              {recipe.is_imported && <span className="tag-green">Imported</span>}
            </div>
            <h1 className="dsp mt-3 text-[36px] md:text-[48px] font-extrabold tracking-[-0.04em] leading-[1.02] text-pretty">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-3 max-w-[520px] text-[17px] leading-[1.55] text-muted">{recipe.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-3.5">
            <h2 className="h-section">Method</h2>
            <ol className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={index} className="card-sm px-[18px] py-4 flex gap-3.5">
                  <span className="w-[26px] h-[26px] shrink-0 rounded-[9px] bg-coral-tint text-coral flex items-center justify-center text-[13px] font-bold">
                    {index + 1}
                  </span>
                  <span className="text-[15px] leading-[1.55] text-ink-soft">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* The plate, the numbers, the shopping */}
        <div className="lg:col-span-2 flex flex-col gap-4 order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[240px] rounded-[20px] overflow-hidden flex items-center justify-center"
            style={{ background: 'linear-gradient(140deg, #FFD9A8, #E9A87C)' }}
          >
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                alt={recipe.title}
              />
            ) : (
              <ChefHat className="w-16 h-16 text-white/70" strokeWidth={1.2} />
            )}
          </motion.div>

          <div className="card p-[18px] grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="dsp text-[24px] font-bold tracking-[-0.03em]">{recipe.prep_time}</p>
              <p className="text-[12px] text-faint mt-0.5">Prep min</p>
            </div>
            <div className="border-x border-hairline-soft">
              <p className="dsp text-[24px] font-bold tracking-[-0.03em]">{recipe.cook_time}</p>
              <p className="text-[12px] text-faint mt-0.5">Cook min</p>
            </div>
            <div>
              <p className="dsp text-[24px] font-bold tracking-[-0.03em]">{recipe.servings}</p>
              <p className="text-[12px] text-faint mt-0.5">Serves</p>
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-3">
            <h2 className="dsp text-[18px] font-bold tracking-[-0.02em]">Ingredients</h2>
            <ul className="flex flex-col gap-2.5">
              {ingredients.map((item, index) => (
                <li key={index} className="flex items-start gap-[11px] text-[15px] leading-[1.45] text-ink-soft">
                  <span className="w-[7px] h-[7px] mt-[7px] shrink-0 rounded-full bg-coral" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-green px-5 py-[18px] flex flex-col gap-1.5"
            >
              <span className="micro text-green">Where it came from</span>
              <span className="flex items-center gap-2 text-[14px] leading-[1.5] text-green-ink">
                <ExternalLink className="w-4 h-4 shrink-0" strokeWidth={2} />
                Read the original
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
