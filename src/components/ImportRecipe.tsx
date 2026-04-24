import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link as LinkIcon, Loader2, Globe, AlertCircle, Search, Utensils, ClipboardList, CheckCircle2, Save, X, Tag } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 md:p-12 rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-sage/5 border border-sage/5 text-center"
      >
        <div className="bg-sage/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8">
          <Globe className="w-8 h-8 text-sage" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-serif text-sage mb-2">Import from Web</h2>
        <p className="text-sage/60 italic font-light tracking-wide mb-8 md:mb-10 max-w-md mx-auto text-sm md:text-base">
          Paste a recipe URL below and we'll gather the details for your pantry.
        </p>

        <form onSubmit={handleFetch} className="max-w-2xl mx-auto group">
          <div className="flex flex-col md:flex-row gap-4 relative">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-sage/30 group-focus-within:text-terracotta transition-colors" />
              <input 
                type="url"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full pl-14 md:pl-16 pr-6 md:pr-32 py-4 md:py-5 bg-cream/40 rounded-[2rem] border border-sage/10 focus:ring-8 focus:ring-terracotta/5 focus:border-terracotta/20 outline-none transition-all font-sans text-sage text-base md:text-lg"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="md:absolute md:right-3 md:top-1/2 md:-translate-y-1/2 px-8 py-4 md:py-3 bg-terracotta hover:bg-terracotta/90 text-white font-bold rounded-[1.5rem] transition-all shadow-lg shadow-terracotta/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 md:w-4 md:h-4" />
                  <span>Fetch Content</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 bg-red-50 text-red-600 rounded-[2rem] border border-red-100 flex items-center justify-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-8 bg-sage/10 text-sage rounded-[2rem] border border-sage/10 flex flex-col items-center gap-4"
          >
            <CheckCircle2 className="w-10 h-10" />
            <div className="text-center">
              <p className="text-xl font-serif mb-1">Import Successful!</p>
              <p className="text-sm opacity-70 italic">Your new recipe has been added to your digital pantry.</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {extractedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-sage/5 border border-sage/5 overflow-hidden"
          >
            <div className="px-4 md:px-12 py-6 bg-sage/10 border-b border-sage/5 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-sage flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Preview & Edit
              </span>
              <button 
                onClick={handleClear}
                className="text-sage/40 hover:text-red-500 transition-colors uppercase text-[10px] font-bold tracking-widest"
              >
                Clear Results
              </button>
            </div>
            <div className="p-4 md:p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="aspect-video bg-sage/5 rounded-[2.5rem] overflow-hidden border border-sage/10 relative group">
                    {extractedRecipe.image ? (
                      <>
                        <img src={extractedRecipe.image} alt={extractedRecipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          className="absolute top-4 right-4 bg-white/80 p-2 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setExtractedRecipe({...extractedRecipe, image: ''})}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                        <Utensils className="w-8 h-8 text-sage/20" />
                        <p className="text-[10px] text-sage/30 font-bold uppercase tracking-widest">No Image Extracted</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={extractedRecipe.image || ''}
                    onChange={(e) => setExtractedRecipe({...extractedRecipe, image: e.target.value})}
                    placeholder="Image URL..."
                    className="w-full px-4 py-2 bg-cream/30 border border-sage/5 rounded-xl text-[10px] outline-none focus:border-sage/20"
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">Title</label>
                    <input 
                      type="text"
                      value={extractedRecipe.title}
                      onChange={(e) => setExtractedRecipe({...extractedRecipe, title: e.target.value})}
                      className="w-full px-6 py-4 bg-cream/50 border border-sage/10 rounded-2xl text-2xl font-serif text-sage outline-none focus:border-terracotta/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">Short Description</label>
                    <textarea 
                      value={extractedRecipe.description}
                      onChange={(e) => setExtractedRecipe({...extractedRecipe, description: e.target.value})}
                      rows={3}
                      className="w-full px-6 py-4 bg-cream/50 border border-sage/10 rounded-2xl text-sm italic text-sage/60 outline-none focus:border-terracotta/30 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-sage/5 pt-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-sage/40 uppercase tracking-widest block text-center">Prep (min)</label>
                      <input 
                        type="number"
                        min="0"
                        value={extractedRecipe.prepTime || 0}
                        onChange={(e) => setExtractedRecipe({...extractedRecipe, prepTime: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-full px-4 py-3 bg-cream/50 border border-sage/10 rounded-xl text-center text-sage font-bold outline-none focus:border-terracotta/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-sage/40 uppercase tracking-widest block text-center">Cook (min)</label>
                      <input 
                        type="number"
                        min="0"
                        value={extractedRecipe.cookTime || 0}
                        onChange={(e) => setExtractedRecipe({...extractedRecipe, cookTime: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-full px-4 py-3 bg-cream/50 border border-sage/10 rounded-xl text-center text-sage font-bold outline-none focus:border-terracotta/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-sage/40 uppercase tracking-widest block text-center">Servings</label>
                      <input 
                        type="number"
                        min="1"
                        value={extractedRecipe.servings || 1}
                        onChange={(e) => setExtractedRecipe({...extractedRecipe, servings: Math.max(1, parseInt(e.target.value) || 1)})}
                        className="w-full px-4 py-3 bg-cream/50 border border-sage/10 rounded-xl text-center text-sage font-bold outline-none focus:border-terracotta/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-sage/5 pt-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sage mb-2">
                    <Tag className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">Categories</h4>
                  </div>
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
                  <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 uppercase tracking-wide mb-1">Partial Extraction</p>
                      <p className="text-xs text-amber-700 italic leading-relaxed">
                        We couldn't automatically find all the {!extractedRecipe.ingredients && !extractedRecipe.instructions ? 'ingredients or instructions' : !extractedRecipe.ingredients ? 'ingredients' : 'instructions'}. Please verify and fill them in manually below.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-sage/5 pt-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sage mb-2">
                    <Utensils className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">Ingredients</h4>
                  </div>
                  <textarea 
                    value={extractedRecipe.ingredients}
                    onChange={(e) => setExtractedRecipe({...extractedRecipe, ingredients: e.target.value})}
                    rows={12}
                    className="w-full p-8 bg-cream/30 border border-sage/5 rounded-[2rem] text-sm text-sage/70 font-sans leading-relaxed outline-none focus:border-sage/20 resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sage mb-2">
                    <ClipboardList className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">Instructions</h4>
                  </div>
                  <textarea 
                    value={extractedRecipe.instructions}
                    onChange={(e) => setExtractedRecipe({...extractedRecipe, instructions: e.target.value})}
                    rows={12}
                    className="w-full p-8 bg-cream/30 border border-sage/5 rounded-[2rem] text-sm text-sage/70 font-sans leading-relaxed outline-none focus:border-sage/20 resize-none"
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-sage/5 text-center flex flex-col items-center gap-4">
                <p className="text-sage/40 text-xs italic">
                  Review and adjust the details above. When ready, save to your kitchen.
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full max-w-md bg-terracotta hover:bg-terracotta/90 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-terracotta/10 flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  Save Import to Pantry
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {htmlPreview && !extractedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-[3.5rem] shadow-xl shadow-sage/5 border border-sage/5 overflow-hidden"
          >
            <div className="px-12 py-6 bg-sage/5 border-b border-sage/5 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-sage/40">Raw Content Preview (No Structured Data)</span>
              <button 
                onClick={handleClear}
                className="text-sage/40 hover:text-red-500 transition-colors uppercase text-[10px] font-bold tracking-widest"
              >
                Clear Preview
              </button>
            </div>
            <div className="p-12">
              <div className="prose prose-sage max-w-none">
                <p className="text-sage/60 italic mb-8 border-l-4 border-sage/10 pl-4 py-1 text-sm">
                  We fetched the page content, but no machine-readable recipe structure (JSON-LD) was found. In the next step, our AI chef will parse this raw text for you.
                </p>
                <div className="bg-cream/30 p-8 rounded-[2rem] border border-sage/5 overflow-auto max-h-[500px]">
                  <pre className="text-[10px] text-sage/40 font-mono whitespace-pre-wrap leading-relaxed">
                    {htmlPreview.slice(0, 5000)}
                    {htmlPreview.length > 5000 && '... [content truncated for preview]'}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
