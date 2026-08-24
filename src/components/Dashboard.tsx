import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import {
  ArrowRight,
  ChevronRight,
  ChefHat,
  Link as LinkIcon,
  Snowflake,
  MessageSquare
} from 'lucide-react';

interface Stats {
  recipeCount: number;
  monthlyMealsCount: number;
  todayMeals: any[];
  latestRecipes: any[];
}

interface DashboardProps {
  onNavigate: (tab: string, recipeId?: number | null) => void;
  userName?: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function Dashboard({ onNavigate, userName }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      setLoading(true);
      
      const [recipesRes, plannerRes] = await Promise.all([
        fetch('/api/recipes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/planner?start=${new Date().toISOString().split('T')[0]}&end=${new Date().toISOString().split('T')[0]}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        })
      ]);

      const recipes = await recipesRes.json();
      const todayMeals = await plannerRes.json();

      // Get monthly count
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
      
      const monRes = await fetch(`/api/planner?start=${startOfMonth.toISOString().split('T')[0]}&end=${endOfMonth.toISOString().split('T')[0]}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const monthMeals = await monRes.json();

      setStats({
        recipeCount: recipes.length,
        monthlyMealsCount: monthMeals.length,
        todayMeals: todayMeals,
        latestRecipes: [...recipes].sort((a, b) => b.id - a.id).slice(0, 3)
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return <Loading message="Setting the table…" />;
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const today = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const summary = [
    stats.todayMeals.length
      ? `${plural(stats.todayMeals.length, 'plate is', 'plates are')} on the board today`
      : 'Nothing is on the board today',
    `${plural(stats.recipeCount, 'recipe', 'recipes')} in the box`,
    `${plural(stats.monthlyMealsCount, 'meal', 'meals')} planned this month`,
  ].join(', ') + '.';

  return (
    <div className="space-y-10 md:space-y-12">
      {/* Hero */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 lg:gap-16">
        <div className="flex-1 min-w-0">
          <p className="label">N&deg; {stats.recipeCount} &nbsp;&mdash;&nbsp; {today}</p>
          <h1 className="mt-4 text-[44px] md:text-[76px] leading-[0.94] tracking-[-0.025em] text-pretty">
            <span className="italic font-normal text-sage">{greeting},</span>
            <br />
            {/* Names are stored as the chef writes them — some already carry the honorific. */}
            {userName ? `${userName}.` : 'welcome back.'}
          </h1>
          <p className="mt-5 max-w-2xl font-serif italic text-lg md:text-xl leading-relaxed text-earth/60">
            {summary}
          </p>
        </div>

        <div className="w-full lg:w-[300px] shrink-0 flex flex-col">
          <button
            onClick={() => onNavigate('add-recipe')}
            className="bg-terracotta text-cream p-6 text-left transition-colors hover:bg-sage"
          >
            <span className="block text-[9px] font-semibold uppercase tracking-[0.30em] text-cream/70">Start something</span>
            <span className="mt-2.5 block font-serif text-3xl leading-tight">Write a<br />new recipe</span>
            <span className="mt-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em]">
              Begin <ArrowRight className="w-5 h-4" />
            </span>
          </button>
          <button
            onClick={() => onNavigate('import')}
            className="border border-t-0 border-sage/28 p-5 flex items-center justify-between gap-3 text-left transition-colors hover:bg-sage/5"
          >
            <span>
              <span className="micro block mb-1">Or</span>
              <span className="font-serif italic text-lg text-sage">Import from a link</span>
            </span>
            <LinkIcon className="w-5 h-5 text-sage shrink-0" />
          </button>
        </div>
      </div>

      {/* Stat rule */}
      <div>
        <div className="rule" />
        <div className="flex flex-col sm:flex-row">
          <button
            onClick={() => onNavigate('recipes')}
            className="flex-1 flex items-baseline gap-4 py-5 sm:pr-10 text-left group"
          >
            <span className="font-serif text-4xl md:text-5xl leading-none text-earth group-hover:text-terracotta transition-colors">
              {stats.recipeCount}
            </span>
            <span className="micro leading-relaxed">Recipes<br />in the box</span>
          </button>
          <button
            onClick={() => onNavigate('planner')}
            className="flex-1 flex items-baseline gap-4 py-5 sm:px-10 border-t sm:border-t-0 sm:border-l border-sage/20 text-left group"
          >
            <span className="font-serif text-4xl md:text-5xl leading-none text-terracotta">
              {stats.monthlyMealsCount}
            </span>
            <span className="micro leading-relaxed">Meals planned<br />this month</span>
          </button>
          <button
            onClick={() => onNavigate('planner')}
            className="flex-1 flex items-baseline gap-4 py-5 sm:pl-10 border-t sm:border-t-0 sm:border-l border-sage/20 text-left group"
          >
            <span className="font-serif text-4xl md:text-5xl leading-none text-earth group-hover:text-terracotta transition-colors">
              {stats.todayMeals.length}
            </span>
            <span className="micro leading-relaxed">On the board<br />today</span>
          </button>
        </div>
        <div className="rule-strong" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-12 lg:gap-16">
        {/* Today's Meals */}
        <div>
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" />
              <h3 className="text-[11px] font-semibold text-earth uppercase tracking-[0.30em]">Today&rsquo;s Menu</h3>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="text-[10px] font-semibold text-terracotta tracking-[0.22em] uppercase hover:text-sage transition-colors"
            >
              Open the planner &rarr;
            </button>
          </div>

          {stats.todayMeals.length > 0 ? (
            <div>
              {stats.todayMeals.map((meal, index) => (
                <button
                  key={meal.id}
                  onClick={() => {
                    if (meal.recipe_id) {
                      onNavigate('recipes', meal.recipe_id);
                    } else if (meal.freezer_item_name) {
                      onNavigate('freezer');
                    } else {
                      onNavigate('planner');
                    }
                  }}
                  className="w-full flex items-start gap-5 md:gap-7 py-5 border-b border-sage/20 text-left group"
                >
                  <span className="hidden md:block w-7 shrink-0 pt-1.5 font-serif text-sm text-sage/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="w-[110px] md:w-[150px] h-[84px] md:h-28 shrink-0 overflow-hidden bg-sage/5 flex items-center justify-center">
                    {meal.recipe_id ? (
                      <img src={meal.recipe_image || meal.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : meal.freezer_item_name ? (
                      <Snowflake className="w-8 h-8 text-sage/25" />
                    ) : (
                      <MessageSquare className="w-8 h-8 text-sage/25" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-semibold text-terracotta uppercase tracking-[0.30em]">{meal.meal_type}</p>
                    <h4 className="mt-2 font-serif text-2xl md:text-[32px] leading-tight text-earth group-hover:text-terracotta transition-colors">
                      {meal.recipe_id ? meal.recipe_title : (meal.freezer_item_name || meal.notes)}
                    </h4>
                    {((meal.recipe_id || meal.freezer_item_name) && meal.notes) && (
                      <p className="mt-1.5 font-serif italic text-[15px] text-earth/55 line-clamp-1">{meal.notes}</p>
                    )}
                  </div>
                  <ChevronRight className="hidden sm:block w-5 h-5 mt-2 shrink-0 text-sage/50 group-hover:text-terracotta transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-sage/30 py-14 px-8 text-center">
              <ChefHat className="w-10 h-10 text-sage/25 mx-auto mb-5" />
              <p className="font-serif italic text-2xl text-earth/60 mb-6">Nothing planned for today</p>
              <button onClick={() => onNavigate('planner')} className="btn-ghost">
                Plan something
              </button>
            </div>
          )}
        </div>

        {/* Latest Recipes */}
        <div>
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <h3 className="text-[11px] font-semibold text-earth uppercase tracking-[0.30em]">Lately</h3>
            <button
              onClick={() => onNavigate('recipes')}
              className="text-[10px] font-semibold text-terracotta tracking-[0.22em] uppercase hover:text-sage transition-colors"
            >
              All {stats.recipeCount} &rarr;
            </button>
          </div>

          <div>
            {stats.latestRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => onNavigate('recipes', recipe.id)}
                className="w-full flex items-center gap-4 py-4 border-b border-sage/20 text-left group"
              >
                <div className="w-14 h-14 shrink-0 overflow-hidden bg-sage/5">
                  <img src={recipe.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-xl leading-tight text-earth group-hover:text-terracotta transition-colors line-clamp-1">
                    {recipe.title}
                  </h4>
                  <p className="micro mt-1.5">
                    {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}