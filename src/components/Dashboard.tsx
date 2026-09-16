import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import {
  ChevronRight,
  ChefHat,
  Link as LinkIcon,
  Snowflake,
  MessageSquare,
  Plus,
} from 'lucide-react';

interface Stats {
  recipeCount: number;
  monthlyMealsCount: number;
  todayMeals: any[];
  latestRecipes: any[];
  openNights: string[];
}

interface DashboardProps {
  onNavigate: (tab: string, recipeId?: number | null) => void;
  userName?: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const iso = (d: Date) => d.toISOString().split('T')[0];

/* Thumbnails carry a warm gradient when a recipe has no photograph, so a card
   never opens with a grey hole in it. */
const gradients = [
  'linear-gradient(140deg, #FFD9A8, #E9A87C)',
  'linear-gradient(140deg, #DCE9CF, #A9C78B)',
  'linear-gradient(140deg, #F6D9CF, #E2A38B)',
  'linear-gradient(140deg, #FFE2B8, #E8BC7A)',
];

export default function Dashboard({ onNavigate, userName }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('la_mia_cucina_token');
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    try {
      setLoading(true);

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // The rest of this week, Monday-start, today included.
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + (7 - ((today.getDay() + 6) % 7) - 1));

      const [recipesRes, plannerRes, monRes, weekRes] = await Promise.all([
        fetch('/api/recipes', auth),
        fetch(`/api/planner?start=${iso(today)}&end=${iso(today)}`, auth),
        fetch(`/api/planner?start=${iso(startOfMonth)}&end=${iso(endOfMonth)}`, auth),
        fetch(`/api/planner?start=${iso(today)}&end=${iso(weekEnd)}`, auth),
      ]);

      const recipes = await recipesRes.json();
      const todayMeals = await plannerRes.json();
      const monthMeals = await monRes.json();
      const weekMeals = await weekRes.json();

      const planned = new Set(
        (Array.isArray(weekMeals) ? weekMeals : []).map((m: any) => String(m.date).split('T')[0])
      );
      const openNights: string[] = [];
      for (let d = new Date(today); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        if (!planned.has(iso(d))) {
          openNights.push(d.toLocaleDateString(undefined, { weekday: 'long' }));
        }
      }

      setStats({
        recipeCount: recipes.length,
        monthlyMealsCount: monthMeals.length,
        todayMeals,
        latestRecipes: [...recipes].sort((a, b) => b.id - a.id).slice(0, 3),
        openNights,
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

  const summary =
    [
      stats.todayMeals.length
        ? `${plural(stats.todayMeals.length, 'plate is', 'plates are')} on the board today`
        : 'Nothing is on the board today',
      `${plural(stats.recipeCount, 'recipe', 'recipes')} in the box`,
      `${plural(stats.monthlyMealsCount, 'meal', 'meals')} planned this month`,
    ].join(', ') + '.';

  const nights = stats.openNights;
  const nightList =
    nights.length > 1
      ? `${nights.slice(0, -1).join(', ')} and ${nights[nights.length - 1]} are still open.`
      : nights.length === 1
        ? `${nights[0]} is still open.`
        : 'Every night left this week is spoken for.';

  return (
    <div className="flex flex-col gap-7 md:gap-[30px]">
      {/* Hero */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-7">
        <div className="flex-grow min-w-0">
          <p className="eyebrow">{today}</p>
          <h1 className="dsp mt-2.5 text-[38px] md:text-[52px] font-extrabold tracking-[-0.035em] leading-[1.02] text-pretty">
            {greeting},
            <br />
            {/* Names are stored as the chef writes them — some already carry the honorific. */}
            {userName ? (
              <>
                {userName}
                <span className="text-coral">.</span>
              </>
            ) : (
              <>
                welcome back<span className="text-coral">.</span>
              </>
            )}
          </h1>
          <p className="mt-3.5 max-w-[460px] text-[17px] leading-[1.5] text-muted">{summary}</p>
        </div>

        <div className="w-full lg:w-[250px] shrink-0 flex flex-col gap-2.5">
          <button
            onClick={() => onNavigate('add-recipe')}
            className="rounded-[20px] bg-coral text-oncoral px-[22px] py-5 flex flex-col gap-2 text-left transition-colors hover:bg-[#C8401E]"
          >
            <Plus className="w-[22px] h-[22px]" strokeWidth={2} />
            <span className="dsp text-[22px] font-bold tracking-[-0.02em] leading-[1.15]">
              Write a new recipe
            </span>
          </button>
          <button
            onClick={() => onNavigate('import')}
            className="card px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors hover:border-fainter"
          >
            <span className="text-[15px] font-semibold">Import from a link</span>
            <LinkIcon className="w-[18px] h-[18px] shrink-0 text-green" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* The three counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => onNavigate('recipes')} className="card px-6 py-[22px] flex flex-col gap-1.5 text-left">
          <span className="stat">{stats.recipeCount}</span>
          <span className="text-[14px] text-muted">Recipes in the box</span>
        </button>
        <button onClick={() => onNavigate('planner')} className="card-coral px-6 py-[22px] flex flex-col gap-1.5 text-left">
          <span className="stat text-coral">{stats.monthlyMealsCount}</span>
          <span className="text-[14px] text-coral-ink">Meals planned this month</span>
        </button>
        <button onClick={() => onNavigate('planner')} className="card-green px-6 py-[22px] flex flex-col gap-1.5 text-left">
          <span className="stat text-green">{stats.todayMeals.length}</span>
          <span className="text-[14px] text-green-ink">On the board today</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-[26px]">
        {/* Today's menu */}
        <div className="lg:col-span-2 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="h-section">Today&rsquo;s menu</h2>
            <button
              onClick={() => onNavigate('planner')}
              className="text-[13px] font-semibold text-coral hover:text-green transition-colors"
            >
              Open the planner
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {stats.todayMeals.map((meal, index) => {
              const fromFreezer = !meal.recipe_id && meal.freezer_item_name;
              const image = meal.recipe_image || meal.image_url;
              return (
                <button
                  key={meal.id}
                  onClick={() => {
                    if (meal.recipe_id) onNavigate('recipes', meal.recipe_id);
                    else if (meal.freezer_item_name) onNavigate('freezer');
                    else onNavigate('planner');
                  }}
                  className="card p-3.5 flex items-center gap-4 text-left transition-colors hover:border-fainter"
                >
                  <span
                    className="w-[92px] h-[82px] shrink-0 rounded-[14px] overflow-hidden flex items-center justify-center"
                    style={{ background: fromFreezer ? 'linear-gradient(140deg, #CFE8D4, #9FC7A8)' : gradients[index % gradients.length] }}
                  >
                    {meal.recipe_id && image ? (
                      <img src={image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : fromFreezer ? (
                      <Snowflake className="w-[26px] h-[26px] text-white" strokeWidth={1.8} />
                    ) : !meal.recipe_id ? (
                      <MessageSquare className="w-[26px] h-[26px] text-white" strokeWidth={1.8} />
                    ) : null}
                  </span>
                  <span className="flex-grow min-w-0 flex flex-col gap-[5px] items-start">
                    <span className={fromFreezer ? 'tag-green' : 'tag-coral'}>
                      {meal.meal_type}
                      {fromFreezer ? ' · from the freezer' : ''}
                    </span>
                    <span className="dsp text-[22px] font-bold tracking-[-0.025em] leading-[1.15] line-clamp-1">
                      {meal.recipe_id ? meal.recipe_title : meal.freezer_item_name || meal.notes}
                    </span>
                    {(meal.recipe_id || meal.freezer_item_name) && meal.notes && (
                      <span className="text-[14px] text-faint line-clamp-1">{meal.notes}</span>
                    )}
                  </span>
                  <ChevronRight className="w-5 h-5 shrink-0 text-fainter" strokeWidth={2} />
                </button>
              );
            })}

            {stats.todayMeals.length === 0 ? (
              <div className="card-dashed py-14 px-8 flex flex-col items-center gap-4 text-center">
                <ChefHat className="w-10 h-10 text-fainter" strokeWidth={1.6} />
                <p className="text-[17px] text-muted">Nothing planned for today</p>
                <button onClick={() => onNavigate('planner')} className="btn-primary">
                  Plan something
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('planner')}
                className="card-dashed py-5 flex items-center justify-center gap-2.5 text-[15px] font-semibold text-faint transition-colors hover:text-ink"
              >
                <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
                Add another plate
              </button>
            )}
          </div>
        </div>

        {/* Lately */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="h-section">Lately</h2>
            <button
              onClick={() => onNavigate('recipes')}
              className="text-[13px] font-semibold text-coral hover:text-green transition-colors"
            >
              All {stats.recipeCount}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {stats.latestRecipes.map((recipe, i) => (
              <button
                key={recipe.id}
                onClick={() => onNavigate('recipes', recipe.id)}
                className="card-sm p-3 flex items-center gap-3 text-left transition-colors hover:border-fainter"
              >
                <span
                  className="w-[52px] h-[52px] shrink-0 rounded-xl overflow-hidden"
                  style={{ background: gradients[i % gradients.length] }}
                >
                  {recipe.image_url && (
                    <img src={recipe.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-[1.25] line-clamp-1">{recipe.title}</span>
                  <span className="block mt-[3px] text-[13px] text-faint">
                    {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                  </span>
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('planner')}
            className="card-ink mt-1 p-5 flex flex-col gap-2 text-left"
          >
            <span className="label text-peach tracking-[0.06em]">This week</span>
            <span className="dsp text-[21px] font-bold tracking-[-0.02em] leading-[1.2]">
              {nights.length
                ? `${plural(nights.length, 'empty night', 'empty nights')} left to fill`
                : 'The week is fully planned'}
            </span>
            <span className="text-[14px] leading-[1.45] text-darkmuted">{nightList}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
