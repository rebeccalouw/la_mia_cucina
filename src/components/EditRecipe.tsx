import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Utensils, Clock, Users, Link as LinkIcon, FileText, Loader2, CheckCircle2, ArrowLeft, Tag, X, Image as ImageIcon } from 'lucide-react';
import CategorySelector from './CategorySelector';

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
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
        <p className="text-sage/60 font-medium">Loading recipe details...</p>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto bg-white/50 backdrop-blur-md p-12 rounded-[3rem] border border-sage/10 text-center"
      >
        <div className="bg-sage/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-sage" />
        </div>
        <h2 className="text-3xl font-serif text-sage mb-2">Recipe Updated</h2>
        <p className="text-sage/60 italic">Your changes have been saved to your pantry.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto bg-white p-4 md:p-12 rounded-[3rem] shadow-xl shadow-sage/5 border border-sage/5"
    >
      <div className="flex items-center justify-between mb-8 md:mb-10">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-sage/40 hover:text-sage font-bold uppercase tracking-widest text-xs transition-all group"
        >
          <div className="bg-cream p-2 rounded-xl group-hover:bg-sage/5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Cancel
        </button>
        <div className="text-right">
          <h2 className="text-3xl font-serif text-sage">Edit Recipe</h2>
          <p className="text-sage/40 text-xs uppercase font-bold tracking-widest">Update your creation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Image Upload Section */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-sage uppercase tracking-widest ml-1">Recipe Image</label>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-48 h-48 bg-cream/30 border-2 border-dashed border-sage/20 rounded-[2rem] overflow-hidden flex items-center justify-center relative group">
              {formData.image_url ? (
                <>
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, image_url: ''})}
                    className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-sage/20 mx-auto mb-2" />
                  <p className="text-[10px] text-sage/40 font-bold uppercase tracking-widest">No Image</p>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-sage animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4 w-full">
              <p className="text-sage/60 text-sm italic">Capture the beauty of your dish. Upload a new photo or provide a link.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="cursor-pointer bg-cream hover:bg-cream/50 text-sage px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-sage/10 transition-all text-center flex-1 sm:flex-none">
                  {formData.image_url ? 'Change Photo' : 'Choose Photo'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
                <div className="flex-1">
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                    <input
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-cream/30 border border-sage/10 focus:border-terracotta/50 outline-none transition-all text-xs"
                      placeholder="Or paste an image URL..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage uppercase tracking-widest ml-1">Recipe Title</label>
            <div className="relative">
              <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage/30" />
              <input
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 outline-none transition-all text-lg"
                placeholder="e.g. Grandma's Secret Lasagna"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-sage uppercase tracking-widest ml-1">Categories</label>
            <CategorySelector 
              selectedCategories={formData.categories}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
            />
          </div>
        </div>

        {/* Times & Servings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-sage uppercase tracking-widest ml-1">Prep Time (min)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
              <input
                name="prep_time"
                type="number"
                min="0"
                value={formData.prep_time}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/30 border border-sage/10 focus:border-terracotta/50 outline-none transition-all"
                placeholder="15"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-sage uppercase tracking-widest ml-1">Cook Time (min)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
              <input
                name="cook_time"
                type="number"
                min="0"
                value={formData.cook_time}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/30 border border-sage/10 focus:border-terracotta/50 outline-none transition-all"
                placeholder="45"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-sage uppercase tracking-widest ml-1">Servings</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
              <input
                name="servings"
                type="number"
                min="1"
                value={formData.servings}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/30 border border-sage/10 focus:border-terracotta/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Ingredients & Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage uppercase tracking-widest ml-1">Ingredients</label>
            <textarea
              name="ingredients"
              required
              rows={8}
              value={formData.ingredients}
              onChange={handleChange}
              className="w-full p-6 rounded-[2rem] bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 outline-none transition-all resize-none"
              placeholder="List one ingredient per line (will be bulleted)..."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-sage uppercase tracking-widest ml-1">Instructions</label>
            <textarea
              name="instructions"
              required
              rows={8}
              value={formData.instructions}
              onChange={handleChange}
              className="w-full p-6 rounded-[2rem] bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 outline-none transition-all resize-none"
              placeholder="Step-by-step method (each line becomes a bullet point)..."
            />
          </div>
        </div>

        {/* Optional Notes & URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-sage/5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-sage uppercase tracking-widest ml-1">Source URL (Optional)</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
              <input
                name="source_url"
                value={formData.source_url}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/30 border border-sage/10 focus:border-terracotta/50 outline-none transition-all"
                placeholder="https://original-recipe.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-sage uppercase tracking-widest ml-1">Chef's Notes (Optional)</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-sage/30" />
              <textarea
                name="description"
                rows={1}
                value={formData.description}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/30 border border-sage/10 focus:border-terracotta/50 outline-none transition-all resize-none"
                placeholder="Any special tips?"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-3 rounded-2xl border border-red-100">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-terracotta hover:bg-terracotta/90 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-terracotta/10 flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          Update Recipe
        </button>
      </form>
    </motion.div>
  );
}
