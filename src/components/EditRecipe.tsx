import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, CheckCircle2, ChevronLeft, Image as ImageIcon } from 'lucide-react';
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
        className="max-w-xl mx-auto my-20 card-green p-12 text-center"
      >
        <CheckCircle2 className="w-12 h-12 text-green mx-auto mb-5" strokeWidth={1.4} />
        <h2 className="dsp text-[34px] font-extrabold text-green mb-2">Saved</h2>
        <p className="text-[17px] text-green-ink">Your changes are in the box.</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-7"
    >
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 self-start text-[14px] font-semibold text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="w-[18px] h-[18px] text-faint" strokeWidth={2.2} />
        Back to the recipe
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="flex-grow min-w-0">
          <p className="eyebrow">Editing</p>
          <h1 className="h-page mt-2 text-[34px] md:text-[42px] line-clamp-2">{formData.title || 'This recipe'}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Check className="w-[17px] h-[17px]" strokeWidth={2.4} />}
            Save the changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative card-dashed bg-surface h-[250px] overflow-hidden flex flex-col items-center justify-center gap-3">
            {formData.image_url ? (
              <>
                <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image_url: '' })}
                  className="absolute top-3 right-3 rounded-full bg-white/92 px-3.5 py-1.5 text-[12px] font-bold text-brick"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <span className="w-[54px] h-[54px] rounded-[18px] bg-coral-tint flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-coral" strokeWidth={1.8} />
                </span>
                <p className="text-[15px] font-semibold">Drop a photograph here</p>
                <label className="pill-dark cursor-pointer">
                  Choose a file
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
                <p className="text-[13px] text-faint">JPEG, PNG or WebP · up to 2 MB</p>
              </>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-page/85 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-coral animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Or paste an image URL</label>
            <input name="image_url" value={formData.image_url} onChange={handleChange} className="field" placeholder="https://…" />
          </div>

          <div className="card p-5 flex flex-col gap-3.5">
            <p className="field-label">Categories</p>
            <CategorySelector
              selectedCategories={formData.categories}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
            />
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="field-label">Title</label>
            <input name="title" required value={formData.title} onChange={handleChange} className="field" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <label className="field-label">Prep · minutes</label>
              <input name="prep_time" type="number" min="0" value={formData.prep_time} onChange={handleChange} className="field" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="field-label">Cook · minutes</label>
              <input name="cook_time" type="number" min="0" value={formData.cook_time} onChange={handleChange} className="field" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="field-label">Serves</label>
              <input name="servings" type="number" min="1" value={formData.servings} onChange={handleChange} className="field" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Ingredients · one per line</label>
            <textarea name="ingredients" required rows={6} value={formData.ingredients} onChange={handleChange} className="field resize-none min-h-[132px]" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Method · one step per line</label>
            <textarea name="instructions" required rows={6} value={formData.instructions} onChange={handleChange} className="field resize-none min-h-[132px]" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Source URL · optional</label>
            <input name="source_url" value={formData.source_url} onChange={handleChange} className="field" placeholder="https://original-recipe.com" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Chef’s notes · optional</label>
            <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="field resize-none min-h-[84px]" placeholder="Any special tips?" />
          </div>

          {error && (
            <p className="rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3">{error}</p>
          )}
        </div>
      </div>
    </motion.form>
  );
}
