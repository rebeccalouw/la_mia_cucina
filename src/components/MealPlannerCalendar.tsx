import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ChefHat,
  Plus,
  Clock,
  Utensils,
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
  freezer_item_id?: number | null;
  recipe_title?: string;
  freezer_item_name?: string;
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
  const [planningMealType, setPlanningMealType] = useState('dinner');
  const [planningNotes, setPlanningNotes] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const closePlanningModal = () => {
    setSelectedDate(null);
    setEditingPlanId(null);
    setPlanningRecipeId(null);
    setPlanningFreezerItemId(null);
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
    } else if (plan.freezer_item_id) {
      setPlanningSource('freezer');
      setPlanningFreezerItemId(plan.freezer_item_id);
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
    if (!selectedDate || (planningSource === 'pantry' && !planningRecipeId) || (planningSource === 'freezer' && !planningFreezerItemId)) return;

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
      return <div key={`pad-${dStr}`} className="h-24 md:h-48 bg-cream/20 border border-sage/5 rounded-xl md:rounded-2xl opacity-50" />;
    }

    return (
      <motion.div 
        key={dStr}
        whileHover={{ y: -4 }}
        onClick={() => setSelectedDate(dStr)}
        className={`min-h-[6rem] md:h-48 p-3 bg-white border border-sage/5 rounded-2xl md:rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-sage/10 transition-all group flex flex-col relative overflow-hidden cursor-pointer ${isToday ? 'ring-2 ring-terracotta' : ''}`}
      >
        <div className="flex justify-between items-start mb-1 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-terracotta' : 'text-sage/40'}`}>
              {label}
            </span>
            <span className="md:hidden text-[8px] font-bold text-sage/20 uppercase tracking-widest">{dayName}</span>
          </div>
          <div className="hidden md:group-hover:flex items-center gap-1">
             <Plus className="w-3 h-3 text-sage/30" />
          </div>
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
                className="group/item relative flex items-center gap-2 p-1 bg-sage/5 rounded-lg border border-sage/5 cursor-pointer hover:bg-sage/10 transition-colors"
              >
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-md overflow-hidden shrink-0 border border-white bg-cream flex items-center justify-center">
                {plan.recipe_id ? (
                  <img src={plan.recipe_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Snowflake className="w-4 h-4 md:w-5 md:h-5 text-sage/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] md:text-[10px] font-bold text-sage truncate leading-tight uppercase tracking-tighter">
                  {plan.recipe_id ? plan.recipe_title : plan.freezer_item_name}
                </p>
                <div className="flex items-center gap-1">
                  <p className={`text-[7px] md:text-[8px] uppercase font-bold tracking-widest leading-none ${
                      plan.meal_type === 'breakfast' ? 'text-[#B8860B]' :
                      plan.meal_type === 'lunch' ? 'text-[#B8860B]' :
                      plan.meal_type === 'dinner' ? 'text-terracotta' :
                      'text-terracotta/70'
                    }`}>{plan.meal_type}</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlan(plan.id);
                }}
                className="opacity-0 group-hover/item:opacity-100 absolute -right-1 -top-1 bg-white p-1 rounded-full text-red-500 shadow-sm border border-red-50 transition-all hover:scale-110 z-10"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          ))}
          {plansForDay.length === 0 && (
            <div className="h-full flex flex-col justify-center items-center gap-1 opacity-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Plus className="w-4 h-4 text-sage/20" />
              <p className="hidden md:block text-[8px] text-sage/30 font-bold uppercase tracking-tighter">Add Meal</p>
            </div>
          )}
        </div>

        {isToday && (
          <div className="absolute top-3 right-3">
            <div className="w-1.5 h-1.5 bg-terracotta rounded-full shadow-lg shadow-terracotta/40 animate-pulse" />
          </div>
        )}
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
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20 px-0">
      {/* Header Overlay */}
      <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3.5rem] shadow-xl shadow-sage/5 border border-sage/5 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="bg-sage p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-lg shadow-sage/20">
            <CalendarIcon className="w-6 h-6 md:w-8 md:h-8 text-cream" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-serif text-sage tracking-tight md:block hidden">{monthName} {year}</h2>
            <h2 className="text-xl font-serif text-sage tracking-tight md:hidden">Meal Planner</h2>
            <p className="text-sage/40 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mt-0.5 md:mt-1 italic">Organize your weekly feast</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-cream/40 p-1.5 md:p-2 rounded-2xl border border-sage/5 w-full md:w-auto justify-between md:justify-start">
          <button 
            onClick={prevMonth}
            className="p-3 hover:bg-white hover:text-terracotta text-sage/40 transition-all rounded-xl shadow-sm md:block hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="md:hidden flex items-center gap-1 ml-2">
            <CalendarIcon className="w-4 h-4 text-sage/40" />
            <span className="text-[10px] font-bold text-sage/60 uppercase tracking-widest">{monthName}</span>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-6 py-2 bg-white text-sage text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm hover:text-terracotta transition-colors"
          >
            Today
          </button>
          <button 
            onClick={nextMonth}
            className="p-3 hover:bg-white hover:text-terracotta text-sage/40 transition-all rounded-xl shadow-sm md:block hidden"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Week View (Mobile Default) */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-xs font-bold text-sage/40 uppercase tracking-[0.2em]">
            {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Previous Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
          </h3>
          <div className="flex items-center gap-2 bg-cream/40 p-1 rounded-xl border border-sage/5">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-2 hover:bg-white hover:text-terracotta text-sage/40 transition-all rounded-lg shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setWeekOffset(0)}
              className="px-4 py-1 text-[9px] font-bold uppercase tracking-widest text-sage"
            >
              Reset
            </button>
            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-2 hover:bg-white hover:text-terracotta text-sage/40 transition-all rounded-lg shadow-sm"
            >
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
      <div className="hidden md:block space-y-8">
        {/* Week Day Labels */}
        <div className="grid grid-cols-7 gap-4 px-2">
          {dayNames.map(day => (
            <div key={day} className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-sage/30">{day}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-4">
          {loading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-48 bg-white/50 border border-sage/5 rounded-[2rem] animate-pulse" />
            ))
          ) : (
            days
          )}
        </div>
      </div>

      {/* Planning Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={closePlanningModal}
               className="absolute inset-0 bg-sage/20 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative w-full max-w-xl bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden border border-sage/5"
             >
                <div className="px-4 py-4 md:px-6 md:py-5 bg-sage/5 border-b border-sage/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-serif text-sage">{editingPlanId ? 'Update Meal Plan' : 'Plan Your Meal'}</h3>
                    <p className="text-[10px] font-bold text-sage/40 uppercase tracking-widest mt-0.5">
                      For {new Date(selectedDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button 
                    onClick={closePlanningModal}
                    className="p-2 bg-white hover:bg-red-50 text-sage/30 hover:text-red-500 rounded-xl transition-all border border-sage/10 shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 md:p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {/* Daily Schedule Overview */}
                  {plansForSelectedDate.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-bold text-sage/40 uppercase tracking-[0.2em]">Already scheduled</label>
                        {editingPlanId && (
                          <button 
                            onClick={() => {
                              setEditingPlanId(null);
                              setPlanningRecipeId(null);
                              setPlanningFreezerItemId(null);
                            }}
                            className="text-[9px] text-terracotta font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
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
                            className={`flex items-center gap-3 p-1.5 rounded-xl border transition-all cursor-pointer ${
                              editingPlanId === plan.id 
                                ? 'bg-sage border-sage shadow-md' 
                                : 'bg-cream/30 border-sage/5 hover:border-sage/20'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white bg-cream flex items-center justify-center">
                              {plan.recipe_id ? (
                                <img src={plan.recipe_image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Snowflake className={`w-4 h-4 ${editingPlanId === plan.id ? 'text-white/40' : 'text-sage/40'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className={`text-[11px] font-bold truncate ${editingPlanId === plan.id ? 'text-white' : 'text-sage'}`}>
                                 {plan.recipe_id ? plan.recipe_title : plan.freezer_item_name}
                               </p>
                               <p className={`text-[8px] uppercase font-bold tracking-widest ${editingPlanId === plan.id ? 'text-white/60' : 'text-terracotta'}`}>{plan.meal_type}</p>
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
                              className={`p-1.5 rounded-lg transition-colors ${editingPlanId === plan.id ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-red-500 hover:bg-red-50'}`}
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
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-[10px] font-medium text-center">
                      {error}
                    </div>
                  )}

                  {/* Meal Type Selection */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[9px] font-bold text-sage/40 uppercase tracking-[0.2em] ml-1">
                      {editingPlanId ? 'Change Meal Type' : 'Select Meal Type'}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['breakfast', 'snack', 'lunch', 'dinner'].map(type => (
                        <button
                          key={type}
                          onClick={() => setPlanningMealType(type)}
                          className={`px-2 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${
                            planningMealType === type 
                              ? 'bg-terracotta text-cream border-terracotta shadow-md' 
                              : 'bg-white text-sage/60 border-sage/10 hover:bg-[#B8860B]/5 hover:text-[#B8860B]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Toggle */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-sage/40 uppercase tracking-[0.2em] ml-1">Select From</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPlanningSource('pantry');
                          setPlanningFreezerItemId(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          planningSource === 'pantry'
                            ? 'bg-sage text-white border-sage shadow-md'
                            : 'bg-white text-sage/40 border-sage/10 hover:bg-sage/5'
                        }`}
                      >
                        <ChefHat className="w-4 h-4" /> Pantry Recipes
                      </button>
                      <button
                        onClick={() => {
                          setPlanningSource('freezer');
                          setPlanningRecipeId(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          planningSource === 'freezer'
                            ? 'bg-sage text-white border-sage shadow-md'
                            : 'bg-white text-sage/40 border-sage/10 hover:bg-sage/5'
                        }`}
                      >
                        <Snowflake className="w-4 h-4" /> Freezer Meals
                      </button>
                    </div>
                  </div>

                  {/* Item Selection based on Source */}
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 px-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-sage/40 uppercase tracking-[0.2em]">
                          {planningSource === 'pantry' ? 'Select Recipe' : 'Select Freezer Meal'}
                        </label>
                        {planningSource === 'pantry' && (
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-[9px] bg-cream/50 border border-sage/10 rounded-lg px-2 py-1 outline-none focus:border-sage/30 transition-all font-bold text-sage uppercase tracking-widest cursor-pointer"
                          >
                            <option value="All">All Categories</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="relative w-full">
                        <input 
                          type="text"
                          placeholder={planningSource === 'pantry' ? "Search pantry..." : "Search freezer..."}
                          value={recipeSearch}
                          onChange={(e) => setRecipeSearch(e.target.value)}
                          className="w-full text-[10px] bg-cream/50 border border-sage/10 rounded-lg px-3 py-1.5 outline-none focus:border-sage/30 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                       {planningSource === 'pantry' ? (
                         filteredRecipes.map(recipe => (
                           <button
                             key={recipe.id}
                             onClick={() => toggleRecipeSelection(recipe.id)}
                             className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left ${
                               planningRecipeId === recipe.id
                                 ? 'bg-sage/10 border-sage shadow-sm'
                                 : 'bg-white border-sage/5 hover:border-sage/20'
                             }`}
                           >
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white">
                                <img src={recipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-medium text-sage truncate">{recipe.title}</p>
                              </div>
                              {planningRecipeId === recipe.id && (
                                <div className="bg-sage text-white p-1 rounded-full">
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                              )}
                           </button>
                         ))
                       ) : (
                         filteredFreezer.map(item => (
                            <button
                               key={item.id}
                               onClick={() => toggleFreezerSelection(item.id)}
                               className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left ${
                                 planningFreezerItemId === item.id
                                   ? 'bg-sage/10 border-sage shadow-sm'
                                   : 'bg-white border-sage/5 hover:border-sage/20'
                               }`}
                             >
                                <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center shrink-0 border border-white">
                                  <Snowflake className="w-5 h-5 text-sage/40" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className="text-xs font-medium text-sage truncate">{item.name}</p>
                                </div>
                                {planningFreezerItemId === item.id && (
                                  <div className="bg-sage text-white p-1 rounded-full">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                )}
                             </button>
                         ))
                       )}
                       {planningSource === 'pantry' && recipes.length === 0 && (
                         <div className="py-4 text-center text-sage/30 italic text-xs">
                           No recipes found in your pantry yet.
                         </div>
                       )}
                       {planningSource === 'freezer' && freezerMeals.length === 0 && (
                         <div className="py-4 text-center text-sage/30 italic text-xs">
                           No ready-made meals found in your freezer.
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div className="space-y-3 border-t border-sage/5 pt-4">
                    <label className="text-[9px] font-bold text-sage/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                       <MessageSquare className="w-3 h-3" /> Add a note (sides, etc)
                    </label>
                    <textarea 
                      value={planningNotes}
                      onChange={(e) => setPlanningNotes(e.target.value)}
                      placeholder="e.g., Serve with sweet potato fries and a garden salad..."
                      className="w-full text-xs bg-cream/30 border border-sage/10 rounded-2xl p-4 outline-none focus:border-sage/30 transition-all font-medium text-sage min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                {/* Fixed Footer Action */}
                <div className="p-4 md:p-6 bg-sage/5 border-t border-sage/5">
                  <button
                    onClick={handleSavePlan}
                    disabled={saving || (planningSource === 'pantry' ? !planningRecipeId : !planningFreezerItemId)}
                    className="w-full bg-sage hover:bg-sage/90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Utensils className="w-5 h-5" />}
                    {editingPlanId ? 'Update Meal Plan' : 'Confirm Meal Plan'}
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Legend / Upcoming (Sneak Peek) */}
      <div className="hidden md:block bg-sage/5 rounded-[3rem] p-10 border border-sage/10 relative overflow-hidden">
        <ChefHat className="absolute -right-4 -bottom-4 w-48 h-48 text-sage/5 -rotate-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-sage/10">
              <Clock className="w-5 h-5 text-sage" />
            </div>
            <div>
              <p className="text-sage font-serif text-xl italic leading-none mb-1">Today's Kitchen Forecast</p>
              <p className="text-sage/40 text-[10px] font-bold uppercase tracking-widest">
                {mealPlans.filter(p => p.date === toLocalDateString(new Date())).length} meals planned for today
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSelectedDate(toLocalDateString(new Date()))}
            className="px-8 py-4 bg-terracotta text-cream rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-terracotta/20 hover:scale-105 transition-all"
          >
            Quick Add
          </button>
        </div>
      </div>
    </div>
  );
}