import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link as LinkIcon, Loader2, AlertCircle, Search, Utensils, CheckCircle2, Save } from 'lucide-react';

interface ExtractedRecipe {
  title: string;
  ingredients: string;
  instructions: string;
  image?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  categories?: string[];
}

import CategorySelector from './CategorySelector';

export default function ImportRecipe() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');
    setSuccess(false);
    setHtmlPreview('');
    setExtractedRecipe(null);

    const token = localStorage.getItem('la_mia_cucina_token');

    try {
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch the URL');
      }

      setHtmlPreview(data.html);
      setExtractedRecipe(data.extractedRecipe ? { ...data.extractedRecipe, categories: [] } : null);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedRecipe) return;

    setSaving(true);
    setError('');

    const token = localStorage.getItem('la_mia_cucina_token');

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: extractedRecipe.title,
          description: extractedRecipe.description,
          ingredients: extractedRecipe.ingredients,
          instructions: extractedRecipe.instructions,
          image_url: extractedRecipe.image,
          source_url: url,
          is_imported: true,
          prep_time: extractedRecipe.prepTime || 0,
          cook_time: extractedRecipe.cookTime || 0,
          servings: extractedRecipe.servings || 1,
          categories: extractedRecipe.categories || []
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save recipe');
      }

      setSuccess(true);
      setExtractedRecipe(null);
      setUrl('');
      setHtmlPreview('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setHtmlPreview('');
    setExtractedRecipe(null);
    setSuccess(false);
  };

  return (
    <div>
      {/* Thin bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-9 border-b border-sage/20">
        <p className="label">Import from the web</p>
        {extractedRecipe && (
          <div className="flex items-center gap-2.5">
            <button onClick={handleClear} className="btn-ghost">Clear</button>
            <button onClick={handleSave} disabled={saving} className="btn-accent">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save to the box
            </button>
          </div>
        )}
      </div>

      {/* The link */}
      <form onSubmit={handleFetch} className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-8">
        <h1 className="font-serif font-bold shrink-0 text-[36px] md:text-[46px] leading-none tracking-[-0.025em]">
          Paste a <span className="italic font-normal text-sage">link</span>
        </h1>
        <div className="flex-1 min-w-0 flex items-center gap-3.5 border-b-2 border-sage/65 pb-2.5 focus-within:border-terracotta transition-colors">
          <LinkIcon className="w-[18px] h-[18px] text-sage/55 shrink-0" />
          <input
            type="url"
            placeholder="https://example.com/recipe"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[17px] text-earth placeholder:text-earth/30"
          />
          <button type="submit" disabled={loading} className="btn-primary shrink-0 px-5 py-2.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {loading ? 'Fetching' : 'Fetch'}
          </button>
        </div>
      </form>

      <div className="rule-strong mt-7" />

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 border border-brick/40 bg-brick/5 px-6 py-5 flex items-start gap-4"
        >
          <AlertCircle className="w-5 h-5 text-brick shrink-0 mt-0.5" />
          <div>
            <p className="text-xl text-brick mb-1">We could not reach that page</p>
            <p className="text-sm text-earth/60">{error}</p>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 border border-sage/40 bg-sage/6 px-6 py-8 text-center"
        >
          <CheckCircle2 className="w-10 h-10 text-sage mx-auto mb-4" strokeWidth={1.2} />
          <p className="text-2xl text-sage mb-1">Imported</p>
          <p className="font-light text-earth/60">It is in the box now.</p>
        </motion.div>
      )}

      <AnimatePresence>
        {extractedRecipe && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-[17px] h-[17px] text-sage" strokeWidth={1.7} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-earth">
                  Found a recipe &mdash; check it over
                </p>
              </div>
              <p className="font-light text-[15px] text-earth/50">
                Everything below is editable before it is saved.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-14">
              {/* Left: the photograph and the categories */}
              <div className="w-full lg:w-[430px] shrink-0 space-y-6">
                <div className="relative h-[268px] bg-sage/5 overflow-hidden">
                  {extractedRecipe.image ? (
                    <>
                      <img src={extractedRecipe.image} alt={extractedRecipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute top-3 left-3 px-3 py-1.5 bg-cream/95 text-sage text-[8px] font-semibold uppercase tracking-[0.22em]">
                        Image found
                      </span>
                      <button
                        onClick={() => setExtractedRecipe({ ...extractedRecipe, image: '' })}
                        className="absolute top-3 right-3 px-3 py-1.5 bg-cream/95 text-brick text-[8px] font-semibold uppercase tracking-[0.22em]"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <Utensils className="w-8 h-8 text-sage/30" strokeWidth={1.2} />
                      <p className="micro">No image found</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="micro block mb-2">Image URL</label>
                  <input
                    type="text"
                    value={extractedRecipe.image || ''}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, image: e.target.value })}
                    placeholder="https://…"
                    className="field text-[13px]"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3">Categories</p>
                  <CategorySelector
                    selectedCategories={extractedRecipe.categories || []}
                    onAddCategory={(cat) => setExtractedRecipe({
                      ...extractedRecipe,
                      categories: [...(extractedRecipe.categories || []), cat]
                    })}
                    onRemoveCategory={(cat) => setExtractedRecipe({
                      ...extractedRecipe,
                      categories: (extractedRecipe.categories || []).filter(c => c !== cat)
                    })}
                  />
                </div>

                {(!extractedRecipe.ingredients || !extractedRecipe.instructions) && (
                  <div className="border border-honey/45 bg-honey/8 px-5 py-4 flex items-start gap-3.5">
                    <AlertCircle className="w-5 h-5 text-honey shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-honey mb-1.5">Partial extraction</p>
                      <p className="text-[13px] leading-relaxed text-earth/70">
                        We could not find the {!extractedRecipe.ingredients && !extractedRecipe.instructions ? 'ingredients or the method' : !extractedRecipe.ingredients ? 'ingredients' : 'method'}. Fill them in before saving.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: the recipe itself */}
              <div className="flex-1 min-w-0 space-y-7">
                <div>
                  <label className="micro block mb-2">Title</label>
                  <input
                    type="text"
                    value={extractedRecipe.title}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, title: e.target.value })}
                    className="w-full bg-transparent border-0 border-b border-sage/30 pb-2.5 font-serif text-[30px] text-earth outline-none transition-colors focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="micro block mb-2">Short description</label>
                  <textarea
                    value={extractedRecipe.description}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, description: e.target.value })}
                    rows={2}
                    className="w-full bg-transparent border-0 border-b border-sage/30 pb-2.5 font-light text-[17px] leading-relaxed text-earth/70 outline-none transition-colors resize-none focus:border-terracotta"
                  />
                </div>

                <div className="flex flex-wrap gap-8">
                  <div className="w-[120px]">
                    <label className="micro block mb-2">Prep</label>
                    <input
                      type="number"
                      min="0"
                      value={extractedRecipe.prepTime || 0}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, prepTime: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-transparent border-0 border-b border-sage/30 pb-2 font-light text-2xl text-earth outline-none transition-colors focus:border-terracotta"
                    />
                  </div>
                  <div className="w-[120px]">
                    <label className="micro block mb-2">Cook</label>
                    <input
                      type="number"
                      min="0"
                      value={extractedRecipe.cookTime || 0}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, cookTime: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-transparent border-0 border-b border-sage/30 pb-2 font-light text-2xl text-earth outline-none transition-colors focus:border-terracotta"
                    />
                  </div>
                  <div className="w-[120px]">
                    <label className="micro block mb-2">Serves</label>
                    <input
                      type="number"
                      min="1"
                      value={extractedRecipe.servings || 1}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, servings: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full bg-transparent border-0 border-b border-sage/30 pb-2 font-light text-2xl text-earth outline-none transition-colors focus:border-terracotta"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="micro block mb-2">Source</label>
                    <p className="border-b border-sage/30 pb-2.5 text-[13px] text-earth/55 truncate">{url}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3">Ingredients</label>
                    <textarea
                      value={extractedRecipe.ingredients}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, ingredients: e.target.value })}
                      rows={10}
                      className="field-box resize-none text-sm"
                      placeholder="One ingredient per line…"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3">Method</label>
                    <textarea
                      value={extractedRecipe.instructions}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, instructions: e.target.value })}
                      rows={10}
                      className="field-box resize-none text-sm"
                      placeholder="One step per line…"
                    />
                  </div>
                </div>

                <button onClick={handleSave} disabled={saving} className="btn-accent w-full py-[19px]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save to the box
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {htmlPreview && !extractedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 border border-sage/25"
          >
            <div className="px-6 py-4 border-b border-sage/20 flex flex-wrap items-center justify-between gap-3">
              <span className="micro">Raw content &mdash; no structured recipe found</span>
              <button onClick={handleClear} className="micro hover:text-sage transition-colors">Clear</button>
            </div>
            <div className="p-6">
              <p className="font-light text-earth/60 mb-6 border-l-2 border-sage/40 pl-4">
                We fetched the page, but it carries no machine-readable recipe. You can still copy what you need
                out of the text below.
              </p>
              <div className="bg-white/50 border border-sage/20 p-6 overflow-auto max-h-125">
                <pre className="text-[11px] text-earth/50 font-mono whitespace-pre-wrap leading-relaxed">
                  {htmlPreview.slice(0, 5000)}
                  {htmlPreview.length > 5000 && '… [truncated]'}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
