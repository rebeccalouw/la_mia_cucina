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
        <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
          <Tag className="w-4 h-4 text-sage/45 shrink-0" />
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
            className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[15px] text-earth outline-none placeholder:text-earth/30"
            placeholder="Type to search or add…"
          />
        </div>

        <AnimatePresence>
          {isOpen && (input.length > 0 || suggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute z-50 w-full mt-1 bg-cream border border-sage/30 overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto no-scrollbar">
                {suggestions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.name)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 border-b border-sage/15 last:border-b-0 hover:bg-sage/5 transition-colors text-left"
                  >
                    <span className="text-[17px] text-earth">{cat.name}</span>
                    <Plus className="w-4 h-4 text-sage/40 shrink-0" />
                  </button>
                ))}

                {input.trim() !== '' && !allCategories.some(c => c.name.toLowerCase() === input.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-terracotta/8 hover:bg-terracotta/15 transition-colors text-left border-t border-sage/20"
                  >
                    <Plus className="w-4 h-4 text-terracotta shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-terracotta uppercase tracking-[0.24em]">Create new</p>
                      <p className="text-[17px] text-earth truncate">{input.trim()}</p>
                    </div>
                  </button>
                )}

                {input.trim() !== '' && suggestions.length === 0 && allCategories.some(c => c.name.toLowerCase() === input.trim().toLowerCase() && selectedCategories.includes(c.name)) && (
                  <div className="px-4 py-4 text-center font-light text-sm text-earth/45">
                    Already added
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="chip-on"
            >
              {cat}
              <button
                type="button"
                onClick={() => onRemoveCategory(cat)}
                className="hover:text-earth transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
