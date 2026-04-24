import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, Check, Search, X } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface CategorySelectorProps {
  selectedCategories: string[];
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
}

export default function CategorySelector({ 
  selectedCategories, 
  onAddCategory, 
  onRemoveCategory 
}: CategorySelectorProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    if (input.trim() === '') {
      setSuggestions([]);
      return;
    }

    const filtered = allCategories.filter(cat => 
      cat.name.toLowerCase().includes(input.toLowerCase()) && 
      !selectedCategories.includes(cat.name)
    );
    setSuggestions(filtered);
  }, [input, allCategories, selectedCategories]);

  const handleSelect = (name: string) => {
    onAddCategory(name);
    setInput('');
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const name = input.trim();
    if (name) {
      onAddCategory(name);
      setInput('');
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="relative">
        <div className="relative">
          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage/30" />
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0) {
                  handleSelect(suggestions[0].name);
                } else {
                  handleAddNew();
                }
              }
            }}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 outline-none transition-all"
            placeholder="Type to search or add category..."
          />
        </div>

        <AnimatePresence>
          {isOpen && (input.length > 0 || suggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-sage/10 overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto no-scrollbar">
                {suggestions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.name)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-sage/5 transition-colors text-left"
                  >
                    <span className="text-sage font-medium">{cat.name}</span>
                    <Plus className="w-4 h-4 text-sage/30" />
                  </button>
                ))}
                
                {input.trim() !== '' && !allCategories.some(c => c.name.toLowerCase() === input.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="w-full flex items-center gap-3 px-6 py-4 bg-terracotta/5 hover:bg-terracotta/10 transition-colors text-left border-t border-sage/5"
                  >
                    <div className="bg-terracotta/20 p-1.5 rounded-lg">
                      <Plus className="w-4 h-4 text-terracotta" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-terracotta uppercase tracking-widest">Create New</p>
                      <p className="text-sage font-medium">"{input.trim()}"</p>
                    </div>
                  </button>
                )}

                {input.trim() !== '' && suggestions.length === 0 && allCategories.some(c => c.name.toLowerCase() === input.trim().toLowerCase() && selectedCategories.includes(c.name)) && (
                  <div className="px-6 py-4 text-center text-sage/40 italic text-sm">
                    Category already added
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Categories */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {selectedCategories.map((cat) => (
            <motion.span
              key={cat}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-terracotta/10 group overflow-hidden relative"
            >
              <span className="relative z-10">{cat}</span>
              <button
                type="button"
                onClick={() => onRemoveCategory(cat)}
                className="relative z-10 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <motion.div 
                className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
