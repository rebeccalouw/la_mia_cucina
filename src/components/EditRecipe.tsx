import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Loader2, CheckCircle2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import CategorySelector from './CategorySelector';
import Loading from './Loading';

interface EditRecipeProps {
  recipeId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditRecipe({ recipeId, onSuccess, onCancel }: EditRecipeProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    ingredients: '',
    instructions: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: '2',
    source_url: '',
    image_url: '',
    categories: [] as string[],
  });

  useEffect(() => {
    fetchRecipe();
  }, [recipeId]);

  const fetchRecipe = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch recipe details');
      const data = await response.json();
      setFormData({
        title: data.title,
        ingredients: data.ingredients,
        instructions: data.instructions,
        description: data.description || '',
        prep_time: data.prep_time.toString(),
        cook_time: data.cook_time.toString(),
        servings: data.servings.toString(),
        source_url: data.source_url || '',
        image_url: data.image_url || '',
        categories: data.categories || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const token = localStorage.getItem('la_mia_cucina_token');
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      if (!response.ok) throw new Error('File upload failed');
      const data = await response.json();
      setFormData({ ...formData, image_url: data.url });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = (val: string) => {
    if (val && !formData.categories.includes(val)) {
      setFormData({ ...formData, categories: [...formData.categories, val] });
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('la_mia_cucina_token');

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          prep_time: parseInt(formData.prep_time) || 0,
          cook_time: parseInt(formData.cook_time) || 0,
          servings: parseInt(formData.servings) || 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update recipe');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (fetching) {
    return <Loading message="Opening the recipe…" />;
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-xl mx-auto my-20 border border-sage/40 bg-sage/6 p-12 text-center"
      >
        <CheckCircle2 className="w-12 h-12 text-sage mx-auto mb-5" strokeWidth={1.2} />
        <h2 className="font-serif text-4xl text-sage mb-3">Saved</h2>
        <p className="font-serif italic text-lg text-earth/60">Your changes are in the box.</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Thin bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-9 border-b border-sage/20">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-sage/60 hover:text-sage transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to the recipe
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>

      <p className="label">Editing</p>
      <h1 className="mt-3 text-[36px] md:text-[50px] leading-none tracking-[-0.025em] mb-10 text-pretty">
        {formData.title || 'Untitled recipe'}
      </h1>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        {/* Left: the photograph and the categories */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-9">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3">
              The photograph
            </p>
            <div className="relative h-[268px] bg-white/35 border border-dashed border-sage/40 overflow-hidden flex flex-col items-center justify-center gap-3.5">
              {formData.image_url ? (
                <>
                  <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <label className="cursor-pointer px-3 py-1.5 bg-cream/95 text-sage text-[8px] font-semibold uppercase tracking-[0.22em]">
                      Replace
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="px-3 py-1.5 bg-cream/95 text-brick text-[8px] font-semibold uppercase tracking-[0.22em]"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-sage/30" strokeWidth={1.2} />
                  <p className="font-serif italic text-[17px] text-sage/55">No photograph yet</p>
                  <label className="cursor-pointer px-5 py-2.5 bg-cream border border-sage/35 text-sage text-[9px] font-semibold uppercase tracking-[0.24em] hover:bg-sage/5 transition-colors">
                    Choose a file
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-cream/80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-sage animate-spin" />
                </div>
              )}
            </div>
            <div className="mt-5">
              <label className="micro block mb-2">Or paste an image URL</label>
              <input
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="field text-[15px]"
                placeholder="https://…"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3">
              Categories
            </p>
            <CategorySelector
              selectedCategories={formData.categories}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
            />
          </div>
        </div>

        {/* Right: the recipe itself */}
        <div className="flex-1 min-w-0 space-y-8">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3">
              Title
            </label>
            <input
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-transparent border-0 border-b border-sage/30 pb-2.5 font-serif text-[30px] md:text-[32px] text-earth outline-none transition-colors placeholder:text-earth/30 focus:border-terracotta"
              placeholder="Grandma’s Secret Lasagna"
            />
          </div>

          <div className="flex flex-wrap gap-8">
            <div className="w-[130px]">
              <label className="micro block mb-2">Prep · minutes</label>
              <input
                name="prep_time"
                type="number"
                min="0"
                value={formData.prep_time}
                onChange={handleChange}
                className="w-full bg-transparent border-0 border-b border-sage/30 pb-2 font-serif text-[26px] text-earth outline-none transition-colors placeholder:text-earth/30 focus:border-terracotta"
                placeholder="15"
              />
            </div>
            <div className="w-[130px]">
              <label className="micro block mb-2">Cook · minutes</label>
              <input
                name="cook_time"
                type="number"
                min="0"
                value={formData.cook_time}
                onChange={handleChange}
                className="w-full bg-transparent border-0 border-b border-sage/30 pb-2 font-serif text-[26px] text-earth outline-none transition-colors placeholder:text-earth/30 focus:border-terracotta"
                placeholder="45"
              />
            </div>
            <div className="w-[130px]">
              <label className="micro block mb-2">Serves</label>
              <input
                name="servings"
                type="number"
                min="1"
                value={formData.servings}
                onChange={handleChange}
                className="w-full bg-transparent border-0 border-b border-sage/30 pb-2 font-serif text-[26px] text-earth outline-none transition-colors placeholder:text-earth/30 focus:border-terracotta"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta">Ingredients</label>
                <span className="micro">One per line</span>
              </div>
              <textarea
                name="ingredients"
                required
                rows={9}
                value={formData.ingredients}
                onChange={handleChange}
                className="field-box resize-none"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta">Method</label>
                <span className="micro">One step per line</span>
              </div>
              <textarea
                name="instructions"
                required
                rows={9}
                value={formData.instructions}
                onChange={handleChange}
                className="field-box resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="micro block mb-2">Source URL</label>
              <input
                name="source_url"
                value={formData.source_url}
                onChange={handleChange}
                className="field text-[15px]"
                placeholder="Not set"
              />
            </div>
            <div>
              <label className="micro block mb-2">Chef’s notes</label>
              <input
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="field font-serif italic text-base"
                placeholder="Any special tips?"
              />
            </div>
          </div>

          {error && (
            <p className="border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3">{error}</p>
          )}

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full py-[19px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </motion.form>
  );
}
