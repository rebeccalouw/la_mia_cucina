import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Plus,
  X,
  Loader2,
  Check,
  Snowflake,
  MessageSquare
} from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  image_url: string;
  categories: string[];
}

interface FreezerItem {
  id: number;
  name: string;
  type: 'ingredient' | 'meal';
}

interface MealPlan {
  id: number;
  recipe_id?: number | null;
  recipe_title?: string;
  freezer_item_name?: string | null;
  recipe_image?: string;
  date: string;
  meal_type: string;
  notes?: string;
}

export default function MealPlannerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [freezerMeals, setFreezerMeals] = useState<FreezerItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Planning State
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planningSource, setPlanningSource] = useState<'pantry' | 'freezer'>('pantry');
  const [planningRecipeId, setPlanningRecipeId] = useState<number | null>(null);
  const [planningFreezerItemId, setPlanningFreezerItemId] = useState<number | null>(null);
  // Set when editing a plan whose freezer item was already consumed: there is no item left
  // to re-pick, so the name is shown and sent back unchanged.
  const [planningFreezerName, setPlanningFreezerName] = useState<string | null>(null);
  const [planningMealType, setPlanningMealType] = useState('dinner');
  const [planningNotes, setPlanningNotes] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const closePlanningModal = () => {
    setSelectedDate(null);
    setEditingPlanId(null);
    setPlanningRecipeId(null);
    setPlanningFreezerItemId(null);
    setPlanningFreezerName(null);
    setPlanningNotes('');
    setError('');
    setRecipeSearch('');
    setSelectedCategory('All');
  };

  const openEditModal = (plan: MealPlan) => {
    setSelectedDate(plan.date);
    setEditingPlanId(plan.id);
    if (plan.recipe_id) {
      setPlanningSource('pantry');
      setPlanningRecipeId(plan.recipe_id);
    } else if (plan.freezer_item_name) {
      setPlanningSource('freezer');
      setPlanningFreezerName(plan.freezer_item_name);
    }
    setPlanningMealType(plan.meal_type);
    setPlanningNotes(plan.notes || '');
  };

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(recipeSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || r.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const filteredFreezer = freezerMeals.filter(m => 
    m.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const plansForSelectedDate = selectedDate 
    ? mealPlans.filter(p => p.date === selectedDate) 
    : [];

  const toggleRecipeSelection = (recipeId: number) => {
    setPlanningRecipeId(prev => prev === recipeId ? null : recipeId);
  };

  const toggleFreezerSelection = (itemId: number) => {
    setPlanningFreezerItemId(prev => prev === itemId ? null : itemId);
  };

  useEffect(() => {
    fetchData();
  }, [currentDate, weekOffset]);

  const fetchData = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    
    // Month range (Desktop view)
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Week range (Mobile view)
    const week = getCurrentWeekDays();
    const weekStart = week[0];
    const weekEnd = week[6];
    
    // Use the maximum range that covers both views
    const fetchStart = monthStart < weekStart ? monthStart : weekStart;
    const fetchEnd = monthEnd > weekEnd ? monthEnd : weekEnd;
    
    const startDay = toLocalDateString(fetchStart);
    const endDay = toLocalDateString(fetchEnd);

    try {
      setLoading(true);
      const [plansRes, recipesRes, categoriesRes, freezerRes] = await Promise.all([
        fetch(`/api/planner?start=${startDay}&end=${endDay}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/recipes', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/freezer', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (plansRes.ok && recipesRes.ok && categoriesRes.ok && freezerRes.ok) {
        const plansData = await plansRes.json();
        const recipesData = await recipesRes.json();
        const categoriesData = await categoriesRes.json();
        const freezerData = await freezerRes.json();
        
        setMealPlans(plansData);
        setRecipes(recipesData);
        setCategories(categoriesData.map((c: any) => c.name));
        setFreezerMeals(freezerData.filter((f: any) => f.type === 'meal'));
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedDate || (!planningRecipeId && !planningFreezerItemId && !planningFreezerName && !planningNotes.trim())) return;

    setSaving(true);
    const token = localStorage.getItem('la_mia_cucina_token');

    try {
      const url = editingPlanId ? `/api/planner/${editingPlanId}` : '/api/planner';
      const method = editingPlanId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipeId: planningSource === 'pantry' ? planningRecipeId : null,
          freezerItemId: planningSource === 'freezer' ? planningFreezerItemId : null,
          freezerItemName: planningSource === 'freezer' && !planningFreezerItemId ? planningFreezerName : null,
          date: selectedDate,
          mealType: planningMealType,
          notes: planningNotes
        })
      });

      if (response.ok) {
        await fetchData();
        closePlanningModal();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save plan');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: number) => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch(`/api/planner/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMealPlans(mealPlans.filter(p => p.id !== id));
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // Calendar Logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Mobile Week View Logic
  const getCurrentWeekDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const startOfWeek = new Date(today);
    // Apply week offset
    startOfWeek.setDate(today.getDate() - dayOfWeek + (weekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const weekDays = getCurrentWeekDays();
  const todayCount = mealPlans.filter(p => p.date === toLocalDateString(new Date())).length;

  // Helper to format date as dd-mm-yyyy for accessibility/display
  const formatDateString = (day: number) => {
    const d = String(day).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    return `${d}-${m}-${year}`;
  };

  const renderDay = (dStr: string, label: string | number, isPadding = false) => {
    const isToday = dStr === toLocalDateString(new Date());
    const plansForDay = mealPlans.filter(p => p.date === dStr);
    const dayDate = new Date(dStr);
    const dayName = dayDate.toLocaleDateString('default', { weekday: 'short' });

    if (isPadding) {
      return <div key={`pad-${dStr}`} className="h-24 md:h-32 border border-sage/8" />;
    }

    return (
      <motion.div 
        key={dStr}
        whileHover={{ y: -4 }}
        onClick={() => setSelectedDate(dStr)}
        className={`min-h-24 md:h-32 p-2.5 bg-white/45 transition-colors group flex flex-col relative overflow-hidden cursor-pointer ${
          isToday ? 'border-2 border-terracotta bg-terracotta/7' : 'border border-sage/20 hover:bg-white/70'
        }`}
      >
        <div className="flex justify-between items-baseline gap-2 mb-1.5">
          {isToday ? (
            <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-terracotta">Today</span>
          ) : (
            <span className="md:hidden micro">{dayName}</span>
          )}
          <span className={`text-[15px] leading-none ml-auto ${isToday ? 'text-earth' : 'text-earth/55'}`}>
            {label}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 py-0.5">
          {plansForDay.map(plan => (
              <motion.div 
                key={plan.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(plan);
                }}
                className={`group/item relative flex items-center gap-2 py-1 px-1.5 cursor-pointer transition-colors ${
                  plan.recipe_id
                    ? 'bg-terracotta/10 border-l-2 border-terracotta hover:bg-terracotta/18'
                    : 'bg-sage/10 border-l-2 border-sage hover:bg-sage/18'
                }`}
              >
              {!plan.recipe_id && (
                <span className="shrink-0 text-sage/55">
                  {plan.freezer_item_name ? <Snowflake className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[12px] text-earth truncate leading-tight">
                  {plan.recipe_id ? plan.recipe_title : (plan.freezer_item_name || plan.notes)}
                </p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlan(plan.id);
                }}
                className="opacity-0 group-hover/item:opacity-100 absolute right-0 top-0 bg-cream p-1 text-brick border border-brick/30 transition-opacity z-10"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          ))}
          {plansForDay.length === 0 && (
            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-4 h-4 text-sage/40" />
            </div>
          )}
        </div>


      </motion.div>
    );
  };

  const days = [];
  // padding for previous month
  for (let i = 0; i < startDay; i++) {
    days.push(renderDay(`pad-${i}`, '', true));
  }

  // actual days
  for (let day = 1; day <= totalDays; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push(renderDay(dStr, day));
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-7">
        <div>
          <p className="label">
            {mealPlans.length} {mealPlans.length === 1 ? 'meal' : 'meals'} on the board
          </p>
          <h1 className="font-serif font-bold mt-3 text-[36px] md:text-[50px] leading-none tracking-[-0.025em]">
            {monthName} <span className="italic font-normal text-sage">{year}</span>
          </h1>
        </div>

        <div className="flex items-center gap-5 pb-1.5">
          <button
            onClick={prevMonth}
            className="hidden md:block p-2 -m-2 text-sage/55 hover:text-earth transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sage hover:text-terracotta transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="hidden md:block p-2 -m-2 text-sage/55 hover:text-earth transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="hidden md:block w-px h-4 bg-sage/25" />

          <span className="hidden md:flex items-center gap-2.5 micro">
            <span className="w-3 h-0.5 bg-terracotta" /> From the box
          </span>
          <span className="hidden md:flex items-center gap-2.5 micro">
            <span className="w-3 h-0.5 bg-sage" /> Freezer or a note
          </span>
        </div>
      </div>

      <div className="rule-strong mb-6" />

      {/* Week View (Mobile Default) */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-semibold text-earth uppercase tracking-[0.26em]">
            {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Previous Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
          </h3>
          <div className="flex items-center gap-4">
            <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 -m-2 text-sage/55">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekOffset(0)} className="text-[9px] font-semibold uppercase tracking-[0.22em] text-sage">
              This week
            </button>
            <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 -m-2 text-sage/55">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {weekDays.map(date => {
            const dStr = toLocalDateString(date);
            return renderDay(dStr, date.getDate());
          })}
        </div>
      </div>

      {/* Month View (Desktop Default) */}
      <div className="hidden md:block">
        {/* Week Day Labels */}
        <div className="grid grid-cols-7 gap-2.5 mb-3">
          {dayNames.map(day => (
            <span key={day} className="micro">{day}</span>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2.5">
          {loading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-32 bg-white/40 border border-sage/20 animate-pulse" />
            ))
          ) : (
            days
          )}
        </div>
      </div>

      {/* Planning Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-3 md:p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={closePlanningModal}
               className="absolute inset-0 bg-earth/40"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.98, opacity: 0, y: 12 }}
               className="relative w-full max-w-2xl bg-cream border border-sage/30 max-h-[90vh] overflow-y-auto no-scrollbar"
             >
                <div className="px-6 md:px-9 pt-8 pb-5 border-b-2 border-sage/65 flex items-start justify-between gap-4">
                  <div>
                    <p className="label">{editingPlanId ? 'Changing the plan for' : 'Planning for'}</p>
                    <h3 className="mt-2.5 font-serif font-bold text-[28px] md:text-[36px] leading-tight text-earth">
                      {new Date(selectedDate).toLocaleDateString('default', { weekday: 'long' })},{' '}
                      <span className="italic font-normal text-sage">
                        {new Date(selectedDate).toLocaleDateString('default', { day: 'numeric', month: 'long' })}
                      </span>
                    </h3>
                  </div>
                  <button
                    onClick={closePlanningModal}
                    className="p-2 -mr-2 -mt-1 text-sage/55 hover:text-earth transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 md:px-9 py-7 space-y-7">
                  {/* Daily Schedule Overview */}
                  {plansForSelectedDate.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta">Already on this day</label>
                        {editingPlanId && (
                          <button 
                            onClick={() => {
                              setEditingPlanId(null);
                              setPlanningRecipeId(null);
                              setPlanningFreezerItemId(null);
                              setPlanningFreezerName(null);
                            }}
                            className="text-[9px] font-semibold uppercase tracking-[0.22em] text-sage hover:text-terracotta transition-colors flex items-center gap-1.5"
                          >
                            <Plus className="w-3 h-3" /> New
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {plansForSelectedDate.map(plan => (
                          <div 
                            key={plan.id}
                            onClick={() => openEditModal(plan)}
                            className={`flex items-center gap-3.5 p-2.5 border transition-colors cursor-pointer ${
                              editingPlanId === plan.id
                                ? 'bg-sage border-sage'
                                : 'bg-white/50 border-sage/25 hover:bg-white'
                            }`}
                          >
                            <div className="w-8 h-8 overflow-hidden shrink-0 border border-white bg-cream flex items-center justify-center">
                              {plan.recipe_id ? (
                                <img src={plan.recipe_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : plan.freezer_item_name ? (
                                <Snowflake className={`w-4 h-4 ${editingPlanId === plan.id ? 'text-white/40' : 'text-sage/40'}`} />
                              ) : (
                                <MessageSquare className={`w-3.5 h-3.5 ${editingPlanId === plan.id ? 'text-white/40' : 'text-sage/40'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className={`font-serif text-[17px] leading-tight truncate ${editingPlanId === plan.id ? 'text-cream' : 'text-earth'}`}>
                                 {plan.recipe_id ? plan.recipe_title : (plan.freezer_item_name || 'A note')}
                               </p>
                               <p className={`mt-1 text-[8px] uppercase font-semibold tracking-[0.24em] ${editingPlanId === plan.id ? 'text-cream/65' : 'text-terracotta'}`}>{plan.meal_type}</p>
                               {plan.notes && (
                                 <div className={`flex items-start gap-1 mt-1 ${editingPlanId === plan.id ? 'text-white/40' : 'text-sage/40'}`}>
                                   <MessageSquare className="w-2.5 h-2.5 mt-0.5" />
                                   <p className="text-[10px] font-medium leading-normal">{plan.notes}</p>
                                 </div>
                               )}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlan(plan.id);
                                if (editingPlanId === plan.id) closePlanningModal();
                              }}
                              className={`p-2 shrink-0 transition-colors ${editingPlanId === plan.id ? 'text-cream/70 hover:text-cream' : 'text-brick/70 hover:text-brick'}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {error && (
                    <p className="border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3">{error}</p>
                  )}

                  {/* Meal Type Selection */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-terracotta mb-3.5">
                      Which meal
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                        <button
                          key={type}
                          onClick={() => setPlanningMealType(type)}
                          className={`py-3 text-[9px] font-semibold uppercase tracking-[0.22em] transition-colors ${
                            planningMealType === type
                              ? 'bg-sage text-cream'
                              : 'border border-sage/28 text-sage/65 hover:bg-sage/5'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Toggle */}
                  <div className="flex gap-8 border-b border-sage/25">
                    <button
                      onClick={() => {
                        setPlanningSource('pantry');
                        setPlanningFreezerItemId(null);
                        setPlanningFreezerName(null);
                      }}
                      className={`flex items-center gap-2.5 pb-3 -mb-px text-[10px] font-semibold uppercase tracking-[0.26em] border-b-2 transition-colors ${
                        planningSource === 'pantry' ? 'text-earth border-terracotta' : 'text-sage/50 border-transparent hover:text-sage'
                      }`}
                    >
                      <ChefHat className="w-4 h-4" /> From the box
                    </button>
                    <button
                      onClick={() => {
                        setPlanningSource('freezer');
                        setPlanningRecipeId(null);
                      }}
                      className={`flex items-center gap-2.5 pb-3 -mb-px text-[10px] font-semibold uppercase tracking-[0.26em] border-b-2 transition-colors ${
                        planningSource === 'freezer' ? 'text-earth border-terracotta' : 'text-sage/50 border-transparent hover:text-sage'
                      }`}
                    >
                      <Snowflake className="w-4 h-4" /> From the freezer
                    </button>
                  </div>

                  {/* Item Selection based on Source */}
                  <div className="space-y-3">
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        placeholder={planningSource === 'pantry' ? 'Search your recipes…' : 'Search the freezer…'}
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-sage/30 pb-2.5 font-light text-[17px] text-earth outline-none transition-colors placeholder:text-earth/40 focus:border-terracotta"
                      />
                      {planningSource === 'pantry' && (
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="self-start bg-transparent border border-sage/28 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-sage outline-none focus:border-terracotta transition-colors cursor-pointer"
                        >
                          <option value="All">All categories</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto no-scrollbar">
                       {planningSource === 'pantry' ? (
                         filteredRecipes.map(recipe => (
                           <button
                             key={recipe.id}
                             onClick={() => toggleRecipeSelection(recipe.id)}
                             className={`flex items-center gap-3.5 p-2.5 transition-colors text-left ${
                               planningRecipeId === recipe.id
                                 ? 'border-2 border-terracotta bg-terracotta/8'
                                 : 'border border-sage/22 bg-white/45 hover:bg-white'
                             }`}
                           >
                              <div className="w-11 h-11 overflow-hidden shrink-0 bg-sage/5">
                                {recipe.image_url && (
                                  <img src={recipe.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-serif text-[17px] leading-tight text-earth truncate">{recipe.title}</p>
                              </div>
                              {planningRecipeId === recipe.id && (
                                <Check className="w-4 h-4 text-terracotta shrink-0" strokeWidth={2.4} />
                              )}
                           </button>
                         ))
                       ) : (
                         filteredFreezer.map(item => (
                            <button
                               key={item.id}
                               onClick={() => toggleFreezerSelection(item.id)}
                               className={`flex items-center gap-3.5 p-2.5 transition-colors text-left ${
                                 planningFreezerItemId === item.id
                                   ? 'border-2 border-terracotta bg-terracotta/8'
                                   : 'border border-sage/22 bg-white/45 hover:bg-white'
                               }`}
                             >
                                <div className="w-11 h-11 border border-sage/25 flex items-center justify-center shrink-0">
                                  <Snowflake className="w-5 h-5 text-sage/50" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className="font-serif text-[17px] leading-tight text-earth truncate">{item.name}</p>
                                </div>
                                {planningFreezerItemId === item.id && (
                                  <Check className="w-4 h-4 text-terracotta shrink-0" strokeWidth={2.4} />
                                )}
                             </button>
                         ))
                       )}
                       {planningSource === 'pantry' && recipes.length === 0 && (
                         <p className="md:col-span-2 py-5 text-center font-light text-earth/45">
                           Nothing in the box yet.
                         </p>
                       )}
                       {planningSource === 'freezer' && freezerMeals.length === 0 && (
                         <p className="md:col-span-2 py-5 text-center font-light text-earth/45">
                           No cooked meals in the freezer.
                         </p>
                       )}
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div className="pt-2">
                    <label className="micro block mb-2.5">Note &middot; optional</label>
                    <input
                      type="text"
                      value={planningNotes}
                      onChange={(e) => setPlanningNotes(e.target.value)}
                      placeholder="Double the basil this time"
                      className="field font-light text-base"
                    />
                  </div>
                </div>

                {/* Fixed Footer Action */}
                <div className="px-6 md:px-9 py-5 border-t border-sage/20 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-light text-[15px] text-earth/45">
                    {plansForSelectedDate.length === 0
                      ? 'Nothing planned for this day yet.'
                      : `${plansForSelectedDate.length} already on this day.`}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button onClick={closePlanningModal} className="btn-ghost">Cancel</button>
                    <button
                      onClick={handleSavePlan}
                      disabled={saving || (!planningRecipeId && !planningFreezerItemId && !planningNotes.trim())}
                      className="btn-accent"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {editingPlanId ? 'Save the change' : 'Add to the day'}
                    </button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Legend / Upcoming (Sneak Peek) */}
      <div className="hidden md:flex items-center justify-between gap-6 mt-10 pt-6 border-t border-sage/20">
        <p className="font-light text-lg text-earth/55">
          {todayCount === 0
            ? 'Nothing on the board for today.'
            : `${todayCount} on the board for today.`}
        </p>
        <button onClick={() => setSelectedDate(toLocalDateString(new Date()))} className="btn-accent">
          Plan today
        </button>
      </div>
    </div>
  );
}