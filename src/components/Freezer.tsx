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
  Snowflake,
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

interface FreezerProps {
  onNavigate?: (tab: string) => void;
}

export default function Freezer({ onNavigate }: FreezerProps) {
  const [items, setItems] = useState<FreezerItem[]>([]);
  const [dbCategories, setDbCategories] = useState<DBHouseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'meal' | 'ingredient'>('all');
  
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

  /* One shelf: the cooked meals, or the raw ingredients. */
  const renderSection = (title: string, type: 'ingredient' | 'meal', list: FreezerItem[]) => (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="h-section">{title} · {list.length}</h2>
        <button
          onClick={() => handleOpenModal(type)}
          className="text-[13px] font-semibold text-coral hover:text-green transition-colors"
        >
          Add one
        </button>
      </div>

      {list.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {list.map(item => {
            const old = daysIn(item.placed_at) > 30;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => handleOpenModal(item.type, item)}
                className={`rounded-[18px] bg-surface px-[18px] py-[15px] flex items-center gap-4 cursor-pointer transition-colors ${
                  old ? 'border border-[#F6CFC2]' : 'border border-hairline hover:border-fainter'
                }`}
              >
                <span className={`w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center ${old ? 'bg-coral-tint' : 'bg-green-tint'}`}>
                  <Snowflake className={`w-5 h-5 ${old ? 'text-coral' : 'text-green'}`} strokeWidth={1.8} />
                </span>

                <span className="flex-grow min-w-0">
                  <span className="block text-[16px] font-semibold leading-[1.2] truncate">{item.name}</span>
                  <span className="block mt-[3px] text-[13px] text-faint truncate">
                    Went in {new Date(item.placed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                    {item.categories?.length ? ` · ${item.categories.join(', ')}` : ''}
                  </span>
                </span>

                {old && <span className="tag-coral shrink-0 hidden sm:inline-flex">Older than a month</span>}

                <span className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {confirmDeleteId === item.id ? (
                    <>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeletingId === item.id}
                        className="rounded-[12px] bg-brick px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-ink"
                      >
                        {isDeletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeletingId === item.id}
                        className="px-2.5 py-2 text-[13px] font-semibold text-muted hover:text-ink transition-colors"
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      {onNavigate && type === 'meal' && (
                        <button
                          onClick={() => onNavigate('planner')}
                          className="w-9 h-9 rounded-xl bg-page border border-hairline flex items-center justify-center transition-colors hover:border-green/40"
                          title="Plan it"
                        >
                          <CalendarIcon className="w-4 h-4 text-green" strokeWidth={2} />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenModal(item.type, item)}
                        className="w-9 h-9 rounded-xl bg-page border border-hairline flex items-center justify-center transition-colors hover:border-fainter"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4 text-muted" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="w-9 h-9 rounded-xl bg-page border border-hairline flex items-center justify-center transition-colors hover:border-brick/40"
                        title="Take it out"
                      >
                        <Trash2 className="w-4 h-4 text-brick" strokeWidth={2} />
                      </button>
                    </>
                  )}
                </span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <button
          onClick={() => handleOpenModal(type)}
          className="card-dashed py-6 px-6 flex items-center justify-center gap-2.5 text-[15px] font-semibold text-faint transition-colors hover:text-ink"
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
          Nothing here yet — add {type === 'ingredient' ? 'an ingredient' : 'a cooked meal'}
        </button>
      )}
    </div>
  );

  const stale = filteredItems.filter(i => daysIn(i.placed_at) > 30);

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex-grow min-w-0">
          <p className="eyebrow">
            {items.length} {items.length === 1 ? 'thing' : 'things'} in the freezer
          </p>
          <h1 className="h-page mt-2 text-[34px] md:text-[42px]">What&rsquo;s in the cold</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex gap-1.5 rounded-[14px] bg-surface border border-hairline p-[5px]">
            {([['all', 'Everything'], ['meal', 'Meals'], ['ingredient', 'Ingredients']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`rounded-[10px] px-[15px] py-[9px] text-[13px] font-semibold transition-colors ${
                  typeFilter === value ? 'bg-ink text-oncoral' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => handleOpenModal('meal')} className="btn-primary">
            <Plus className="w-[17px] h-[17px]" strokeWidth={2.4} />
            Put something in
          </button>
        </div>
      </div>

      {/* Eat these first */}
      {stale.length > 0 && (
        <div className="card-coral px-[22px] py-[18px] flex flex-wrap items-center gap-3.5">
          <Snowflake className="w-[22px] h-[22px] shrink-0 text-coral" strokeWidth={1.9} />
          <div className="flex-grow min-w-0">
            <p className="text-[15px] font-semibold text-[#B8401F]">
              {stale.length} {stale.length === 1 ? 'thing has' : 'things have'} been in there over a month
            </p>
            <p className="text-[14px] text-[#9A6B5C] mt-0.5">
              Plan them this week before they turn into a science experiment.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('planner')}
              className="shrink-0 rounded-full bg-coral px-4 py-2.5 text-[13px] font-bold text-oncoral transition-colors hover:bg-[#C8401E]"
            >
              Plan them
            </button>
          )}
        </div>
      )}

      {/* Category filter */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? 'chip-on' : 'chip'}
          >
            All categories
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={selectedCategory === cat ? 'chip-on' : 'chip'}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {typeFilter !== 'ingredient' && renderSection('Meals', 'meal', meals)}
      {typeFilter !== 'meal' && renderSection('Ingredients', 'ingredient', ingredients)}

      {/* Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-ink/40"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 12 }}
              className="relative w-full max-w-lg rounded-[22px] bg-page border border-hairline max-h-[88vh] overflow-y-auto no-scrollbar"
            >
              <div className="px-7 pt-7 pb-5 border-b border-hairline flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{editingItem ? 'Editing' : 'Putting something in'}</p>
                  <h3 className="dsp mt-1.5 text-[28px] font-extrabold tracking-[-0.035em] leading-tight">
                    {formData.type === 'ingredient' ? 'An ingredient' : 'A cooked meal'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 -mr-2 -mt-1 text-faint hover:text-ink transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-7 flex flex-col gap-4">
                {error && (
                  <p className="rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3">{error}</p>
                )}

                <div className="flex gap-1.5 rounded-[14px] bg-surface border border-hairline p-[5px] self-start">
                  {(['meal', 'ingredient'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`rounded-[10px] px-[15px] py-[9px] text-[13px] font-semibold transition-colors ${
                        formData.type === t ? 'bg-ink text-oncoral' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {t === 'meal' ? 'A cooked meal' : 'An ingredient'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">What is it</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.type === 'ingredient' ? 'Guanciale, 300 g' : 'Minestrone, 2 portions'}
                    className="field"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">Went in on</label>
                  <div className="flex items-center gap-2.5 rounded-[14px] bg-surface border border-hairline px-4 py-[13px] transition-colors focus-within:border-coral">
                    <CalendarIcon className="w-[17px] h-[17px] shrink-0 text-fainter" strokeWidth={2} />
                    <input
                      type="date"
                      required
                      value={formData.placed_at}
                      onChange={e => setFormData({ ...formData, placed_at: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent border-0 text-[15px] text-ink outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="field-label">Categories</label>
                  <div className="relative flex flex-col gap-2" ref={suggestionRef}>
                    <div className="flex items-center gap-2.5 rounded-[14px] bg-surface border border-hairline px-4 py-[13px] transition-colors focus-within:border-coral">
                      <Search className="w-[17px] h-[17px] shrink-0 text-fainter" strokeWidth={2} />
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
                        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag(categoryInput)}
                        className="shrink-0 text-[13px] font-bold text-coral hover:text-green transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    <AnimatePresence>
                      {showSuggestions && suggestedCategories.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute z-110 left-0 right-0 top-full mt-1.5 rounded-[14px] bg-surface border border-hairline overflow-hidden shadow-[0_10px_30px_-18px_rgba(51,35,44,0.35)]"
                        >
                          {suggestedCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleAddTag(cat)}
                              className="w-full px-4 py-3 text-left text-[15px] font-medium text-ink border-b border-hairline-soft last:border-b-0 hover:bg-page transition-colors flex items-center justify-between gap-3"
                            >
                              {cat}
                              <Plus className="w-4 h-4 text-fainter shrink-0" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {formData.categories.map(cat => (
                      <span key={cat} className="chip-on">
                        {cat}
                        <button
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formData.categories.length === 0 && (
                      <p className="text-[14px] text-faint">No categories yet.</p>
                    )}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button type="button" onClick={handleCloseModal} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Plus className="w-[17px] h-[17px]" strokeWidth={2.4} />}
                    {editingItem ? 'Save the changes' : 'Put it in the freezer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
