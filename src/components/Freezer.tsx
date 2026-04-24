import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Snowflake, 
  Trash2, 
  Edit3, 
  Plus, 
  Calendar as CalendarIcon, 
  Loader2, 
  X,
  Package,
  ChefHat,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle
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
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
        <p className="text-sage/60 font-medium italic font-serif">Checking the freezer...</p>
      </div>
    );
  }

  const renderSection = (title: string, icon: React.ReactNode, type: 'ingredient' | 'meal', list: FreezerItem[]) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-sage/10 p-2 rounded-xl text-sage">
            {icon}
          </div>
          <h3 className="text-xs font-bold text-sage/40 uppercase tracking-[0.2em]">{title}</h3>
          <span className="bg-sage/5 px-2 py-1 rounded-lg text-[10px] font-bold text-sage/30">{list.length}</span>
        </div>
        <button 
          onClick={() => handleOpenModal(type)}
          className="bg-terracotta text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-terracotta/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          title={`Add ${type}`}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.length > 0 ? (
          list.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-sage/5 shadow-md shadow-sage/5 flex flex-col sm:flex-row sm:items-center justify-between group hover:shadow-xl hover:shadow-sage/10 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => handleOpenModal(item.type, item)}
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="bg-cream p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-sage/5 group-hover:bg-sage group-hover:text-cream transition-colors shrink-0">
                  {type === 'ingredient' ? <Package className="w-5 h-5 sm:w-6 h-6" /> : <ChefHat className="w-5 h-5 sm:w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-serif text-sage group-hover:text-terracotta transition-colors">{item.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
                    <div className="flex items-center gap-2 text-sage/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mr-2">
                      <CalendarIcon className="w-3 h-3" />
                      <span>{new Date(item.placed_at).toLocaleDateString()}</span>
                    </div>
                    {item.categories?.map(cat => (
                      <span key={cat} className="px-2 py-0.5 bg-sage/5 text-sage/40 text-[8px] font-bold uppercase tracking-widest rounded-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit or Confirm Delete Overlay */}
              <div className="flex items-center justify-end gap-2 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-sage/5">
                <AnimatePresence mode="wait">
                  {confirmDeleteId === item.id ? (
                    <motion.div 
                      key="confirm"
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 30, opacity: 0 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="flex items-center gap-1 bg-red-500 p-1 rounded-xl shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-3 py-2 bg-white text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-red-50 transition-all whitespace-nowrap"
                        disabled={isDeletingId === item.id}
                      >
                        {isDeletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-2 text-white hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest"
                        disabled={isDeletingId === item.id}
                      >
                        Cancel
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item.type, item); }}
                        className="p-3 hover:bg-cream text-sage/40 hover:text-sage transition-all rounded-xl"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                        className="p-3 hover:bg-red-50 text-terracotta/40 hover:text-red-500 transition-all rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="md:col-span-2 py-12 text-center border-2 border-dashed border-sage/10 rounded-[3rem] bg-white/40">
            <Snowflake className="w-10 h-10 text-sage/10 mx-auto mb-4" />
            <p className="text-sage/40 font-serif italic uppercase text-[10px] tracking-widest">Empty Shelf</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Header Overlay */}
      <div className="bg-white p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] shadow-xl shadow-sage/5 border border-sage/5 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="bg-sage p-4 rounded-3xl shadow-lg shadow-sage/20 text-cream">
            <Snowflake className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl md:text-5xl font-serif text-sage tracking-tight">Freezer</h2>
            <p className="text-sage/40 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1 italic">Preserving your pantry</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-2">
          <div className="bg-sage/10 p-2 rounded-lg text-sage">
            <Filter className="w-4 h-4" />
          </div>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
              selectedCategory === null 
                ? 'bg-sage text-white border-sage shadow-md' 
                : 'bg-white text-sage/60 border-sage/10 hover:border-sage/20'
            }`}
          >
            All Items
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                selectedCategory === cat 
                  ? 'bg-sage text-white border-sage shadow-md' 
                  : 'bg-white text-sage/60 border-sage/10 hover:border-sage/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-16">
        {renderSection('Ingredients', <Package className="w-5 h-5" />, 'ingredient', ingredients)}
        {renderSection('Ready Made Meals', <ChefHat className="w-5 h-5" />, 'meal', meals)}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-sage/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-sage/5"
            >
              <div className="px-8 py-6 bg-sage/5 border-b border-sage/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif text-sage">
                    {editingItem ? 'Update Entry' : `New ${formData.type === 'ingredient' ? 'Ingredient' : 'Meal'}`}
                  </h3>
                  <p className="text-[10px] font-bold text-sage/40 uppercase tracking-widest mt-0.5">Label your chill storage</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-2 bg-white hover:bg-red-50 text-sage/30 hover:text-red-500 rounded-xl transition-all border border-sage/10 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-medium text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-sage/40 uppercase tracking-[0.2em] ml-1">Item Name</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder={formData.type === 'ingredient' ? "e.g., Frozen Spinach" : "e.g., Homemade Lasagna"}
                    className="w-full px-6 py-4 bg-cream/30 border border-sage/10 rounded-2xl focus:ring-8 focus:ring-terracotta/5 focus:border-terracotta/20 outline-none transition-all text-sage font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-sage/40 uppercase tracking-[0.2em] ml-1">Placement Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                    <input 
                      type="date"
                      required
                      value={formData.placed_at}
                      onChange={e => setFormData({...formData, placed_at: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-cream/30 border border-sage/10 rounded-2xl focus:ring-8 focus:ring-terracotta/5 focus:border-terracotta/20 outline-none transition-all text-sage font-medium"
                    />
                  </div>
                </div>

                {/* Categories / Tags */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-sage/40 uppercase tracking-[0.2em] ml-1">Categories / Tags</label>
                  <div className="space-y-2 relative" ref={suggestionRef}>
                    <div className="flex items-center relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
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
                        placeholder="Search or add categories..."
                        className="w-full pl-12 pr-6 py-4 bg-cream/30 border border-transparent border-b-sage/10 focus:border-b-terracotta/40 focus:bg-white outline-none transition-all text-sm text-sage"
                      />
                    </div>

                    <AnimatePresence>
                      {showSuggestions && suggestedCategories.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white border border-sage/10 rounded-2xl shadow-xl overflow-hidden"
                        >
                          {suggestedCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleAddTag(cat)}
                              className="w-full px-6 py-3 text-left text-xs font-medium text-sage hover:bg-cream hover:text-terracotta transition-colors flex items-center justify-between"
                            >
                              {cat}
                              <Plus className="w-3 h-3 opacity-30" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={() => handleAddTag(categoryInput)}
                      className="w-full bg-sage/5 text-sage hover:bg-sage hover:text-cream py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                      Add Category
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.categories.map(cat => (
                      <span 
                        key={cat}
                        className="px-3 py-1.5 bg-sage text-white text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-sm"
                      >
                        {cat}
                        <button 
                          type="button"
                          onClick={() => removeCategory(cat)}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {formData.categories.length === 0 && (
                      <p className="text-[10px] text-sage/30 italic ml-1 pt-1 font-medium">Add some tags to organize better...</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-terracotta hover:bg-terracotta/90 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-terracotta/10 flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingItem ? 'Update Entry' : 'Store in Freezer'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
