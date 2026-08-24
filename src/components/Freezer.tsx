import React, { useState, useEffect, useRef } from 'react';
import Loading from './Loading';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2,
  Edit3,
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  X,
  Package,
  ChefHat,
  Search
} from 'lucide-react';

interface FreezerItem {
  id: number;
  name: string;
  type: 'ingredient' | 'meal';
  placed_at: string;
  categories: string[];
}

interface DBHouseCategory {
  id: number;
  name: string;
}

export default function Freezer() {
  const [items, setItems] = useState<FreezerItem[]>([]);
  const [dbCategories, setDbCategories] = useState<DBHouseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FreezerItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ingredient' as 'ingredient' | 'meal',
    placed_at: new Date().toISOString().split('T')[0],
    categories: [] as string[]
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation State (Sliding)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      setLoading(true);
      const [itemsRes, catRes] = await Promise.all([
        fetch('/api/freezer', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/freezer/categories', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setDbCategories(catData);
      }
    } catch (err) {
      setError('Failed to load freezer items');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: 'ingredient' | 'meal', item?: FreezerItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        type: item.type,
        placed_at: new Date(item.placed_at).toISOString().split('T')[0],
        categories: item.categories || []
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        type,
        placed_at: new Date().toISOString().split('T')[0],
        categories: []
      });
    }
    setCategoryInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setError('');
  };

  const handleAddTag = (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) return;
    if (!formData.categories.includes(normalized)) {
      setFormData({
        ...formData,
        categories: [...formData.categories, normalized]
      });
    }
    setCategoryInput('');
    setShowSuggestions(false);
  };

  const removeCategory = (cat: string) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter(c => c !== cat)
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const token = localStorage.getItem('la_mia_cucina_token');
    setSaving(true);
    try {
      const url = editingItem ? `/api/freezer/${editingItem.id}` : '/api/freezer';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchData();
        handleCloseModal();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save item');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    setIsDeletingId(id);
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const res = await fetch(`/api/freezer/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        setConfirmDeleteId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete item');
    } finally {
      setIsDeletingId(null);
    }
  };

  const allCategories = Array.from(new Set(items.flatMap(i => i.categories || []))).sort();
  
  const suggestedCategories = dbCategories
    .map(c => c.name)
    .filter(name => 
      name.toLowerCase().includes(categoryInput.toLowerCase()) && 
      !formData.categories.includes(name)
    );

  const filteredItems = selectedCategory 
    ? items.filter(i => i.categories?.includes(selectedCategory))
    : items;

  const ingredients = filteredItems.filter(i => i.type === 'ingredient');
  const meals = filteredItems.filter(i => i.type === 'meal');

  if (loading) {
    return <Loading message="Checking the freezer…" />;
  }

  /** Whole days between the placement date and today. */
  const daysIn = (placedAt: string) =>
    Math.max(0, Math.round((Date.now() - new Date(placedAt).getTime()) / 86_400_000));

  const renderSection = (title: string, type: 'ingredient' | 'meal', list: FreezerItem[]) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <div className="flex items-center gap-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.30em] text-earth">{title}</h3>
          <span className="font-serif text-[15px] text-sage/45">{String(list.length).padStart(2, '0')}</span>
        </div>
        <button
          onClick={() => handleOpenModal(type)}
          className="text-[9px] font-semibold uppercase tracking-[0.22em] text-terracotta hover:text-sage transition-colors"
        >
          Add one
        </button>
      </div>

      {list.length > 0 ? (
        <div className="border-t border-sage/20">
          {list.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 md:gap-5 py-3.5 border-b border-sage/20 group cursor-pointer"
              onClick={() => handleOpenModal(item.type, item)}
            >
              <div className="w-[54px] h-[54px] shrink-0 border border-sage/25 flex items-center justify-center text-sage/55 group-hover:bg-sage group-hover:text-cream group-hover:border-sage transition-colors">
                {type === 'ingredient' ? <Package className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-xl leading-tight text-earth group-hover:text-terracotta transition-colors truncate">
                  {item.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {item.categories?.map(cat => (
                    <span key={cat} className="px-2.5 py-1 border border-sage/25 text-[8px] font-semibold uppercase tracking-[0.20em] text-sage/60">
                      {cat}
                    </span>
                  ))}
                  <span className="micro">
                    In since {new Date(item.placed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className={`font-serif text-2xl leading-none ${daysIn(item.placed_at) > 60 ? 'text-terracotta' : 'text-earth'}`}>
                  {String(daysIn(item.placed_at)).padStart(2, '0')}
                </p>
                <p className="micro mt-1">days</p>
              </div>

              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <AnimatePresence mode="wait">
                  {confirmDeleteId === item.id ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5"
                    >
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeletingId === item.id}
                        className="px-3 py-2 bg-brick text-cream text-[9px] font-semibold uppercase tracking-[0.2em] hover:bg-earth transition-colors"
                      >
                        {isDeletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeletingId === item.id}
                        className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-sage hover:text-earth transition-colors"
                      >
                        Keep
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => handleOpenModal(item.type, item)}
                        className="w-[34px] h-[34px] border border-sage/25 flex items-center justify-center text-sage hover:bg-sage/5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="w-[34px] h-[34px] border border-brick/30 flex items-center justify-center text-brick hover:bg-brick/5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <button
          onClick={() => handleOpenModal(type)}
          className="w-full mt-3 py-6 px-6 border border-dashed border-sage/30 flex items-center justify-center gap-3.5 text-sage/55 hover:bg-sage/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="font-serif italic text-[17px]">
            Nothing here yet &mdash; add {type === 'ingredient' ? 'an ingredient' : 'a cooked meal'}
          </span>
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-7">
        <div>
          <p className="label">
            {items.length} {items.length === 1 ? 'thing' : 'things'} on ice
          </p>
          <h1 className="mt-3 text-[40px] md:text-[56px] leading-none tracking-[-0.025em]">
            The <span className="italic font-normal text-sage">freezer</span>
          </h1>
        </div>

        {allCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] border-b-2 transition-colors ${
                selectedCategory === null ? 'text-earth border-terracotta' : 'text-sage/55 border-transparent hover:text-sage'
              }`}
            >
              All
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] border-b-2 transition-colors ${
                  selectedCategory === cat ? 'text-earth border-terracotta' : 'text-sage/55 border-transparent hover:text-sage'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rule-strong" />

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 pt-10">
        {renderSection('Cooked meals', 'meal', meals)}
        {renderSection('Ingredients', 'ingredient', ingredients)}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-earth/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 12 }}
              className="relative w-full max-w-lg bg-cream border border-sage/30 max-h-[88vh] overflow-y-auto no-scrollbar"
            >
              <div className="px-8 pt-8 pb-5 border-b-2 border-sage/65 flex items-start justify-between gap-4">
                <div>
                  <p className="label">{editingItem ? 'Editing' : 'Putting something in'}</p>
                  <h3 className="mt-2.5 font-serif text-[32px] leading-none text-earth">
                    {formData.type === 'ingredient' ? 'An ingredient' : 'A cooked meal'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 -mr-2 -mt-1 text-sage/55 hover:text-earth transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-7">
                {error && (
                  <p className="border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3">{error}</p>
                )}

                <div>
                  <label className="micro block mb-2.5">What is it</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder={formData.type === 'ingredient' ? 'Guanciale, 300 g' : 'Minestrone, 2 portions'}
                    className="field"
                  />
                </div>

                <div>
                  <label className="micro block mb-2.5">Went in on</label>
                  <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                    <CalendarIcon className="w-4 h-4 text-sage/45 shrink-0" />
                    <input
                      type="date"
                      required
                      value={formData.placed_at}
                      onChange={e => setFormData({...formData, placed_at: e.target.value})}
                      className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none"
                    />
                  </div>
                </div>

                {/* Categories / Tags */}
                <div className="space-y-3">
                  <label className="micro block">Categories</label>
                  <div className="space-y-2 relative" ref={suggestionRef}>
                    <div className="flex items-center relative">
                      <Search className="absolute left-0 top-1.5 w-4 h-4 text-sage/45" />
                      <input 
                        type="text"
                        value={categoryInput}
                        onChange={e => {
                          setCategoryInput(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(categoryInput);
                          }
                        }}
                        placeholder="Search or add…"
                        className="w-full pl-7 pr-4 pb-2.5 bg-transparent border-0 border-b border-sage/30 focus:border-terracotta outline-none transition-colors text-[15px] text-earth placeholder:text-earth/30"
                      />
                    </div>

                    <AnimatePresence>
                      {showSuggestions && suggestedCategories.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute z-110 left-0 right-0 top-full mt-1 bg-cream border border-sage/30 overflow-hidden"
                        >
                          {suggestedCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleAddTag(cat)}
                              className="w-full px-4 py-3 text-left font-serif text-[17px] text-earth border-b border-sage/15 last:border-b-0 hover:bg-sage/5 transition-colors flex items-center justify-between gap-3"
                            >
                              {cat}
                              <Plus className="w-3.5 h-3.5 text-sage/40 shrink-0" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={() => handleAddTag(categoryInput)}
                      className="btn-ghost w-full py-3"
                    >
                      Add category
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.categories.map(cat => (
                      <span 
                        key={cat}
                        className="chip-on"
                      >
                        {cat}
                        <button 
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className="hover:text-earth transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formData.categories.length === 0 && (
                      <p className="font-serif italic text-[15px] text-earth/40">No categories yet.</p>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={saving} className="btn-accent w-full py-[19px]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingItem ? 'Save changes' : 'Put it in the freezer'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
