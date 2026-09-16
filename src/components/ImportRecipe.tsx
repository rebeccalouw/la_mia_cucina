import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link as LinkIcon, Loader2, AlertCircle, Check, ArrowRight, Utensils, CheckCircle2 } from 'lucide-react';

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
    <div className="flex flex-col gap-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="flex-grow min-w-0">
          <p className="eyebrow">Import from the web</p>
          <h1 className="h-page mt-2 text-[32px] md:text-[42px]">Paste a link, keep the recipe</h1>
        </div>
      </div>

      {/* The link */}
      <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-grow flex items-center gap-3 rounded-2xl bg-surface border border-hairline px-[18px] py-[15px] transition-colors focus-within:border-coral">
          <LinkIcon className="w-[19px] h-[19px] shrink-0 text-coral" strokeWidth={2} />
          <input
            type="url"
            placeholder="https://example.com/recipes/ragu-alla-bolognese"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary shrink-0 !rounded-2xl !px-6 !py-[15px] !text-[15px]">
          {loading ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : null}
          {loading ? 'Fetching' : 'Fetch it'}
          {!loading && <ArrowRight className="w-[17px] h-[17px]" strokeWidth={2.4} />}
        </button>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-[20px] border border-brick/30 bg-brick-tint px-5 py-4 flex items-start gap-3.5"
        >
          <AlertCircle className="w-5 h-5 text-brick shrink-0 mt-0.5" />
          <div>
            <p className="text-[15px] font-semibold text-brick">We could not reach that page</p>
            <p className="text-[14px] text-muted mt-0.5">{error}</p>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-green px-6 py-8 text-center"
        >
          <CheckCircle2 className="w-10 h-10 text-green mx-auto mb-3" strokeWidth={1.4} />
          <p className="dsp text-[24px] font-bold text-green">Imported</p>
          <p className="text-[15px] text-green-ink mt-1">It is in the box now.</p>
        </motion.div>
      )}

      <AnimatePresence>
        {extractedRecipe && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-7">
            <div className="card-green px-5 py-4 flex items-center gap-3">
              <Check className="w-[19px] h-[19px] shrink-0 text-green" strokeWidth={2.4} />
              <p className="text-[15px] font-semibold text-green">
                We found a structured recipe. Check it over before it goes in the box.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* The photograph, the categories, the caveat */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div
                  className="relative h-[220px] rounded-[20px] overflow-hidden flex flex-col items-center justify-center gap-2.5"
                  style={{ background: 'linear-gradient(140deg, #FBD9D2, #DE9B8B)' }}
                >
                  {extractedRecipe.image ? (
                    <>
                      <img src={extractedRecipe.image} alt={extractedRecipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        onClick={() => setExtractedRecipe({ ...extractedRecipe, image: '' })}
                        className="absolute top-3 right-3 rounded-full bg-white/92 px-3.5 py-1.5 text-[12px] font-bold text-brick"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Utensils className="w-8 h-8 text-white/80" strokeWidth={1.6} />
                      <p className="text-[13px] font-semibold text-white/90">No image found</p>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">Image URL</label>
                  <input
                    type="text"
                    value={extractedRecipe.image || ''}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, image: e.target.value })}
                    placeholder="https://…"
                    className="field"
                  />
                </div>

                <div className="card p-5 flex flex-col gap-3.5">
                  <p className="field-label">Categories</p>
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
                  <div className="rounded-[20px] bg-amber-tint px-5 py-[18px] flex flex-col gap-1.5">
                    <p className="micro text-amber">Partial extraction</p>
                    <p className="text-[14px] leading-[1.5] text-amber-ink">
                      We could not find the {!extractedRecipe.ingredients && !extractedRecipe.instructions ? 'ingredients or the method' : !extractedRecipe.ingredients ? 'ingredients' : 'method'}. Fill them in below before saving.
                    </p>
                  </div>
                )}
              </div>

              {/* The recipe itself */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="field-label">Title</label>
                  <input
                    type="text"
                    value={extractedRecipe.title}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, title: e.target.value })}
                    className="field"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">Short description</label>
                  <textarea
                    value={extractedRecipe.description}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, description: e.target.value })}
                    rows={2}
                    className="field resize-none min-h-[84px]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="field-label">Prep</label>
                    <input
                      type="number"
                      min="0"
                      value={extractedRecipe.prepTime || 0}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, prepTime: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="field"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="field-label">Cook</label>
                    <input
                      type="number"
                      min="0"
                      value={extractedRecipe.cookTime || 0}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, cookTime: Math.max(0, parseInt(e.target.value) || 0) })}
                      className={`field ${!extractedRecipe.cookTime ? '!border-coral' : ''}`}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="field-label">Serves</label>
                    <input
                      type="number"
                      min="1"
                      value={extractedRecipe.servings || 1}
                      onChange={(e) => setExtractedRecipe({ ...extractedRecipe, servings: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="field"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="field-label">Source</label>
                    <p className="field truncate !text-muted">{url}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">Ingredients · one per line</label>
                  <textarea
                    value={extractedRecipe.ingredients}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, ingredients: e.target.value })}
                    rows={6}
                    className="field resize-none min-h-[140px]"
                    placeholder="One ingredient per line…"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">Method · one step per line</label>
                  <textarea
                    value={extractedRecipe.instructions}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, instructions: e.target.value })}
                    rows={6}
                    className="field resize-none min-h-[140px]"
                    placeholder="One step per line…"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <button onClick={handleSave} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Check className="w-[17px] h-[17px]" strokeWidth={2.4} />}
                    Put it in the box
                  </button>
                  <button onClick={handleClear} className="btn-ghost">Clear</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {htmlPreview && !extractedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-muted">Raw content — no structured recipe found</span>
              <button onClick={handleClear} className="text-[13px] font-semibold text-coral hover:text-green transition-colors">Clear</button>
            </div>
            <div className="p-5">
              <p className="rounded-[14px] bg-amber-tint px-4 py-3 text-[14px] leading-[1.5] text-amber-ink mb-4">
                We fetched the page, but it carries no machine-readable recipe. You can still copy what you need
                out of the text below.
              </p>
              <div className="rounded-[14px] bg-page border border-hairline p-5 overflow-auto max-h-[500px]">
                <pre className="text-[11px] text-faint font-mono whitespace-pre-wrap leading-relaxed">
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
