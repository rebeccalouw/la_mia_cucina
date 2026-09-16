import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Plus,
  X,
  Loader2,
  Check,
  Search,
  Snowflake,
  MessageSquare
} from 'lucide-react';
import { gradients } from './RecipeList';

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
  /* The week is the default view, the way the board is actually read. */
  const [view, setView] = useState<'week' | 'month'>('week');
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
  const firstDayOfMonth = (year: number, month: number) => (new Date(year, month, 1).getDay() + 6) % 7;

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
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Mobile Week View Logic
  const getCurrentWeekDays = () => {
    const today = new Date();
    // Monday starts the week: the way a meal plan is actually read.
    const mondayIndex = (today.getDay() + 6) % 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - mondayIndex + (weekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const weekDays = getCurrentWeekDays();
  /* One plate on a day card: coral when it came out of the recipe box,
     green when it came out of the freezer or is just a note. */
  const planChip = (plan: MealPlan) => {
    const fromBox = Boolean(plan.recipe_id);
    return (
      <div
        key={plan.id}
        onClick={(e) => {
          e.stopPropagation();
          openEditModal(plan);
        }}
        className={`group/item relative rounded-[13px] px-2.5 py-2.5 flex flex-col gap-1 cursor-pointer transition-colors ${
          fromBox
            ? 'bg-surface border border-hairline hover:border-fainter'
            : 'bg-green-tint border border-[#DCEBDE] hover:border-green/40'
        }`}
      >
        <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${fromBox ? 'text-coral' : 'text-green'}`}>
          {plan.meal_type}
        </span>
        <span className="text-[13px] font-semibold leading-[1.25] line-clamp-2">
          {plan.recipe_id ? plan.recipe_title : plan.freezer_item_name || plan.notes}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeletePlan(plan.id);
          }}
          className="opacity-0 group-hover/item:opacity-100 absolute -top-1.5 -right-1.5 rounded-full bg-surface border border-brick/30 p-1 text-brick transition-opacity z-10"
          title="Take it off the day"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  /* A day card. The week view gives it room; the month grid packs it down. */
  const renderDay = (dStr: string, label: string | number, isPadding = false, compact = false) => {
    if (isPadding) {
      return <div key={`pad-${dStr}`} className="rounded-[20px] border border-hairline-soft min-h-[96px]" />;
    }

    const isToday = dStr === toLocalDateString(new Date());
    const plansForDay = mealPlans.filter(p => p.date === dStr);
    const dayDate = new Date(dStr);
    const dayName = dayDate.toLocaleDateString('default', { weekday: 'short' });

    return (
      <div
        key={dStr}
        onClick={() => setSelectedDate(dStr)}
        className={`rounded-[20px] px-3 py-3.5 flex flex-col gap-2.5 cursor-pointer transition-colors ${
          compact ? 'min-h-[118px]' : 'min-h-[210px]'
        } ${
          isToday
            ? 'bg-coral-tint border border-[#F6CFC2]'
            : 'bg-surface border border-hairline hover:border-fainter'
        }`}
      >
        <div className="flex items-baseline justify-between gap-1.5">
          <span className={`text-[12px] font-bold uppercase tracking-[0.08em] ${isToday ? 'text-coral' : 'text-faint'}`}>
            {dayName}
          </span>
          <span className={`dsp text-[19px] font-bold tracking-[-0.03em] ${isToday ? 'text-coral' : 'text-ink'}`}>
            {label}
          </span>
        </div>

        <div className={`flex flex-col gap-2 ${compact ? 'overflow-y-auto no-scrollbar' : ''} flex-grow`}>
          {plansForDay.map(planChip)}
          {plansForDay.length === 0 && (
            <div className="flex-grow rounded-[13px] border-[1.5px] border-dashed border-edge flex items-center justify-center text-fainter">
              <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(renderDay(`pad-${i}`, '', true));
  }
  for (let day = 1; day <= totalDays; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push(renderDay(dStr, day, false, true));
  }

  /* The month's own numbers, for the card on the right. */
  const monthPlans = mealPlans.filter(p => p.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const monthProgress = Math.min(100, Math.round((monthPlans.length / totalDays) * 100));

  /* Only the days still to come — a Monday already eaten is not a gap. */
  const todayStr = toLocalDateString(new Date());
  const openNights = weekDays
    .filter(d => toLocalDateString(d) >= todayStr)
    .filter(d => !mealPlans.some(p => p.date === toLocalDateString(d)))
    .map(d => d.toLocaleDateString('default', { weekday: 'long' }));
  const openNightList =
    openNights.length > 1
      ? `${openNights.slice(0, -1).join(', ')} and ${openNights[openNights.length - 1]}.`
      : openNights.length === 1
        ? `${openNights[0]}.`
        : 'Every day this week has something on it.';

  const weekLabel = weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`;

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex-grow min-w-0">
          <p className="eyebrow">{monthName} {year}</p>
          <h1 className="h-page mt-2 text-[34px] md:text-[42px]">
            {view === 'week' ? 'The week ahead' : 'The month ahead'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex gap-1 rounded-[14px] bg-surface border border-hairline p-[5px]">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-[10px] px-3.5 py-2 text-[13px] font-semibold capitalize transition-colors ${
                  view === v ? 'bg-ink text-oncoral' : 'text-muted hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-[14px] bg-surface border border-hairline p-2">
            <button
              onClick={() => (view === 'week' ? setWeekOffset(weekOffset - 1) : prevMonth())}
              className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center text-muted transition-colors hover:bg-page"
              title="Back"
            >
              <ChevronLeft className="w-[17px] h-[17px]" strokeWidth={2.2} />
            </button>
            <button
              onClick={() => { setWeekOffset(0); setCurrentDate(new Date()); }}
              className="px-2.5 text-[14px] font-semibold"
            >
              {view === 'week' ? weekLabel : 'This month'}
            </button>
            <button
              onClick={() => (view === 'week' ? setWeekOffset(weekOffset + 1) : nextMonth())}
              className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center text-muted transition-colors hover:bg-page"
              title="Forward"
            >
              <ChevronRight className="w-[17px] h-[17px]" strokeWidth={2.2} />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(toLocalDateString(new Date()))}
            className="btn-primary"
          >
            <Plus className="w-[17px] h-[17px]" strokeWidth={2.4} />
            Plan a meal
          </button>
        </div>
      </div>

      {/* The week */}
      {view === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-[20px] bg-surface border border-hairline min-h-[210px] animate-pulse" />
              ))
            : weekDays.map(date => renderDay(toLocalDateString(date), date.getDate()))}
        </div>
      )}

      {/* The month */}
      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-2.5 mb-2.5">
            {dayNames.map(day => (
              <span key={day} className="text-[12px] font-bold uppercase tracking-[0.08em] text-faint">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2.5">
            {loading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="rounded-[20px] bg-surface border border-hairline min-h-[118px] animate-pulse" />
                ))
              : days}
          </div>
        </div>
      )}

      {/* The panel and the three cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          {selectedDate ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[22px] bg-surface border border-hairline px-6 py-[22px] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="h-section">
                  {editingPlanId ? 'Changing' : 'Planning'}{' '}
                  {new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <button
                  onClick={closePlanningModal}
                  className="text-[13px] font-semibold text-faint hover:text-ink transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Already on this day */}
              {plansForSelectedDate.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="field-label">Already on this day</p>
                    {editingPlanId && (
                      <button
                        onClick={() => {
                          setEditingPlanId(null);
                          setPlanningRecipeId(null);
                          setPlanningFreezerItemId(null);
                          setPlanningFreezerName(null);
                        }}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-coral hover:text-green transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Add another
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {plansForSelectedDate.map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => openEditModal(plan)}
                        className={`rounded-2xl p-2.5 flex items-center gap-3.5 cursor-pointer transition-colors ${
                          editingPlanId === plan.id
                            ? 'bg-ink text-oncoral'
                            : 'bg-page border border-hairline hover:border-fainter'
                        }`}
                      >
                        <span className="w-[54px] h-12 shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(140deg, #EFDCE8, #C9A3BE)' }}>
                          {plan.recipe_id && plan.recipe_image ? (
                            <img src={plan.recipe_image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : plan.freezer_item_name ? (
                            <Snowflake className="w-5 h-5 text-white" strokeWidth={1.8} />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-white" strokeWidth={1.8} />
                          )}
                        </span>
                        <span className="flex-grow min-w-0">
                          <span className="block text-[15px] font-semibold leading-[1.2] truncate">
                            {plan.recipe_id ? plan.recipe_title : plan.freezer_item_name || 'A note'}
                          </span>
                          <span className={`block mt-[3px] text-[13px] capitalize ${editingPlanId === plan.id ? 'text-darkmuted' : 'text-faint'}`}>
                            {plan.meal_type}{plan.notes ? ` · ${plan.notes}` : ''}
                          </span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlan(plan.id);
                            if (editingPlanId === plan.id) closePlanningModal();
                          }}
                          className={`p-2 shrink-0 transition-colors ${editingPlanId === plan.id ? 'text-peach' : 'text-brick/70 hover:text-brick'}`}
                          title="Take it off the day"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3">{error}</p>
              )}

              {/* Which meal */}
              <div className="flex flex-wrap gap-2">
                {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                  <button
                    key={type}
                    onClick={() => setPlanningMealType(type)}
                    className={`rounded-full px-4 py-2.5 text-[14px] font-semibold capitalize transition-colors ${
                      planningMealType === type
                        ? 'bg-coral text-oncoral'
                        : 'bg-page border border-hairline text-muted hover:text-ink'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Search and where it comes from */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-grow flex items-center gap-2.5 rounded-[14px] bg-page border border-hairline px-[15px] py-3 transition-colors focus-within:border-coral">
                  <Search className="w-[17px] h-[17px] shrink-0 text-fainter" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder={planningSource === 'pantry' ? 'Search your recipes…' : 'Search the freezer…'}
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] text-ink placeholder:text-placeholder"
                  />
                </div>
                <div className="flex gap-1.5 rounded-[14px] bg-page border border-hairline p-[5px] shrink-0">
                  <button
                    onClick={() => {
                      setPlanningSource('pantry');
                      setPlanningFreezerItemId(null);
                      setPlanningFreezerName(null);
                    }}
                    className={`rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                      planningSource === 'pantry' ? 'bg-ink text-oncoral' : 'text-muted hover:text-ink'
                    }`}
                  >
                    From the box
                  </button>
                  <button
                    onClick={() => {
                      setPlanningSource('freezer');
                      setPlanningRecipeId(null);
                    }}
                    className={`rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                      planningSource === 'freezer' ? 'bg-ink text-oncoral' : 'text-muted hover:text-ink'
                    }`}
                  >
                    From the freezer
                  </button>
                </div>
              </div>

              {planningSource === 'pantry' && categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {['All', ...categories].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? 'chip-on !py-1.5 !text-[12px]' : 'chip !py-1.5 !text-[12px]'}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* What you can add */}
              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto no-scrollbar">
                {planningSource === 'pantry'
                  ? filteredRecipes.map((recipe, i) => (
                      <button
                        key={recipe.id}
                        onClick={() => toggleRecipeSelection(recipe.id)}
                        className={`rounded-2xl p-2.5 flex items-center gap-3.5 text-left transition-colors ${
                          planningRecipeId === recipe.id
                            ? 'bg-coral-tint border border-coral'
                            : 'bg-page border border-hairline hover:border-fainter'
                        }`}
                      >
                        <span
                          className="w-[54px] h-12 shrink-0 rounded-xl overflow-hidden"
                          style={{ background: gradients[i % gradients.length] }}
                        >
                          {recipe.image_url && (
                            <img src={recipe.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                        </span>
                        <span className="flex-grow min-w-0">
                          <span className="block text-[15px] font-semibold leading-[1.2] truncate">{recipe.title}</span>
                          {recipe.categories?.length ? (
                            <span className="block mt-[3px] text-[13px] text-faint truncate">{recipe.categories.join(' · ')}</span>
                          ) : null}
                        </span>
                        <span className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold ${
                          planningRecipeId === recipe.id ? 'bg-coral text-oncoral' : 'bg-coral-tint text-coral'
                        }`}>
                          {planningRecipeId === recipe.id ? 'Added' : 'Add'}
                        </span>
                      </button>
                    ))
                  : filteredFreezer.map(item => (
                      <button
                        key={item.id}
                        onClick={() => toggleFreezerSelection(item.id)}
                        className={`rounded-2xl p-2.5 flex items-center gap-3.5 text-left transition-colors ${
                          planningFreezerItemId === item.id
                            ? 'bg-coral-tint border border-coral'
                            : 'bg-page border border-hairline hover:border-fainter'
                        }`}
                      >
                        <span className="w-[54px] h-12 shrink-0 rounded-xl bg-green-tint flex items-center justify-center">
                          <Snowflake className="w-5 h-5 text-green" strokeWidth={1.8} />
                        </span>
                        <span className="flex-grow min-w-0">
                          <span className="block text-[15px] font-semibold leading-[1.2] truncate">{item.name}</span>
                          <span className="block mt-[3px] text-[13px] text-faint">From the freezer</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold ${
                          planningFreezerItemId === item.id ? 'bg-coral text-oncoral' : 'bg-coral-tint text-coral'
                        }`}>
                          {planningFreezerItemId === item.id ? 'Added' : 'Add'}
                        </span>
                      </button>
                    ))}

                {planningSource === 'pantry' && filteredRecipes.length === 0 && (
                  <p className="py-5 text-center text-[15px] text-faint">Nothing in the box matches.</p>
                )}
                {planningSource === 'freezer' && filteredFreezer.length === 0 && (
                  <p className="py-5 text-center text-[15px] text-faint">No cooked meals in the freezer.</p>
                )}
                {planningFreezerName && !planningFreezerItemId && planningSource === 'freezer' && (
                  <p className="rounded-2xl bg-green-tint px-4 py-3 text-[14px] text-green-ink">
                    This plan holds “{planningFreezerName}”, which has already left the freezer. Save to keep it as it is.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="field-label">Note · optional</label>
                <input
                  type="text"
                  value={planningNotes}
                  onChange={(e) => setPlanningNotes(e.target.value)}
                  placeholder="Double the basil this time"
                  className="field"
                />
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-faint">
                  {plansForSelectedDate.length === 0
                    ? 'Nothing planned for this day yet.'
                    : `${plansForSelectedDate.length} already on this day.`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={closePlanningModal} className="btn-ghost">Cancel</button>
                  <button
                    onClick={handleSavePlan}
                    disabled={saving || (!planningRecipeId && !planningFreezerItemId && !planningFreezerName && !planningNotes.trim())}
                    className="btn-primary"
                  >
                    {saving ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Check className="w-[17px] h-[17px]" strokeWidth={2.4} />}
                    {editingPlanId ? 'Save the change' : 'Add to the day'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="card-dashed min-h-[180px] flex flex-col items-center justify-center gap-3 text-center px-8 py-10">
              <ChefHat className="w-10 h-10 text-fainter" strokeWidth={1.5} />
              <p className="text-[17px] text-muted">Pick a day above to plan something for it.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[22px] bg-surface border border-hairline p-[22px] flex flex-col gap-3.5">
            <h3 className="dsp text-[18px] font-bold tracking-[-0.02em]">This month</h3>
            <div className="flex items-baseline gap-2.5">
              <span className="stat text-coral">{monthPlans.length}</span>
              <span className="text-[14px] text-muted">meals planned</span>
            </div>
            <div className="h-2 rounded-full bg-hairline-soft overflow-hidden">
              <div className="h-2 rounded-full bg-coral" style={{ width: `${monthProgress}%` }} />
            </div>
            <p className="text-[13px] leading-[1.45] text-faint">
              {monthProgress}% of {monthName}’s days have something on them.
            </p>
          </div>

          <div className="rounded-[22px] bg-ink text-oncoral p-[22px] flex flex-col gap-2.5">
            <span className="micro text-peach">Gaps</span>
            <span className="dsp text-[21px] font-bold tracking-[-0.02em] leading-[1.2]">
              {openNights.length
                ? `${openNights.length} empty ${openNights.length === 1 ? 'day' : 'days'} left to fill`
                : 'The week is fully planned'}
            </span>
            <span className="text-[14px] leading-[1.45] text-darkmuted">{openNightList}</span>
          </div>

          <div className="rounded-[22px] bg-green-tint p-[22px] flex flex-col gap-2.5">
            <span className="micro text-green">From the freezer</span>
            <span className="text-[14px] leading-[1.5] text-green-ink">
              Plan a frozen portion and it leaves the freezer list automatically.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
