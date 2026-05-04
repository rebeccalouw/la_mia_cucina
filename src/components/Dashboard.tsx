import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Utensils, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronRight, 
  ChefHat, 
  Plus,
  Loader2,
  TrendingUp,
  History,
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
}

export default function Dashboard({ onNavigate }: DashboardProps) {
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
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
        <p className="text-sage/60 font-medium italic font-serif">Setting the table...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-sage tracking-tight">Cucina Dashboard</h1>
          <p className="text-sage/40 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mt-2 italic">Your kitchen at a glance</p>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={() => onNavigate('add-recipe')}
            className="w-fit bg-terracotta text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-terracotta/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Recipe
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-8 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onNavigate('recipes')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-white p-3 md:p-10 rounded-3xl md:rounded-[3rem] border border-sage/5 shadow-xl shadow-sage/5 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-8 group md:aspect-auto justify-center md:justify-start cursor-pointer hover:border-ochre/20 transition-colors"
        >
          <div className="bg-ochre/10 p-2 md:p-5 rounded-xl md:rounded-3xl group-hover:bg-ochre group-hover:text-cream transition-all duration-500">
            <Utensils className="w-4 h-4 md:w-8 md:h-8 text-ochre group-hover:text-cream transition-colors" />
          </div>
          <div>
            <p className="text-[7px] md:text-[10px] font-bold text-sage/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1">Recipes</p>
            <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
              <span className="text-xl md:text-4xl font-serif text-sage leading-none">{stats.recipeCount}</span>
              <span className="hidden md:inline text-sage/30 text-[10px] italic">total</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onNavigate('planner')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-white p-3 md:p-10 rounded-3xl md:rounded-[3rem] border border-sage/5 shadow-xl shadow-sage/5 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-8 group md:aspect-auto justify-center md:justify-start cursor-pointer hover:border-terracotta/20 transition-colors"
        >
          <div className="bg-terracotta/10 p-2 md:p-5 rounded-xl md:rounded-3xl group-hover:bg-terracotta group-hover:text-cream transition-all duration-500">
            <TrendingUp className="w-4 h-4 md:w-8 md:h-8 text-terracotta group-hover:text-cream transition-colors" />
          </div>
          <div className="flex flex-col">
            <p className="text-[7px] md:text-[10px] font-bold text-sage/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1 leading-tight">
              Meals Planned <br className="md:hidden" />
              For The Month
            </p>
            <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
              <span className="text-xl md:text-4xl font-serif text-sage leading-none">{stats.monthlyMealsCount}</span>
              <span className="hidden md:inline text-sage/30 text-[10px] italic">this month</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-12">
        {/* Today's Meals */}
        <div className="space-y-6 mb-8 md:mb-0">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-terracotta rounded-full animate-pulse" />
              <h3 className="text-xs font-bold text-sage/40 uppercase tracking-[0.2em]">Today's Menu</h3>
            </div>
            <button 
              onClick={() => onNavigate('planner')}
              className="text-[10px] font-bold text-sage tracking-widest uppercase hover:text-terracotta transition-colors"
            >
              Go to Planner
            </button>
          </div>
          
          <div className="space-y-4">
            {stats.todayMeals.length > 0 ? (
              stats.todayMeals.map((meal) => (
                <motion.div 
                  key={meal.id}
                  whileHover={{ x: 4 }}
                  className="bg-white p-4 md:p-6 rounded-3xl border border-sage/5 shadow-md shadow-sage/5 flex items-center gap-6"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-cream shadow-sm shrink-0 bg-cream flex items-center justify-center">
                    {meal.recipe_id ? (
                      <img src={meal.recipe_image || meal.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : meal.freezer_item_id ? (
                      <Snowflake className="w-8 h-8 text-sage/20" />
                    ) : (
                      <MessageSquare className="w-8 h-8 text-sage/20" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-1">{meal.meal_type}</p>
                    <h4 className="text-lg font-serif text-sage">
                      {meal.recipe_id ? meal.recipe_title : (meal.freezer_item_id ? meal.freezer_item_name : meal.notes)}
                    </h4>
                    {((meal.recipe_id || meal.freezer_item_id) && meal.notes) && (
                      <p className="text-[10px] text-sage/40 italic mt-1 line-clamp-1">{meal.notes}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (meal.recipe_id) {
                        onNavigate('recipes', meal.recipe_id);
                      } else if (meal.freezer_item_id) {
                        onNavigate('freezer');
                      } else {
                        onNavigate('planner');
                      }
                    }}
                    className="p-3 bg-sage/5 text-sage/40 rounded-xl hover:bg-sage hover:text-white transition-all shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="bg-white/40 border-2 border-dashed border-sage/10 rounded-[3rem] p-12 text-center">
                <ChefHat className="w-10 h-10 text-sage/10 mx-auto mb-4" />
                <p className="text-sage/40 font-serif italic mb-4">No meals planned for today</p>
                <button 
                  onClick={() => onNavigate('planner')}
                  className="text-[10px] font-bold text-sage uppercase tracking-widest py-2 px-6 border border-sage/10 rounded-full hover:bg-sage hover:text-cream transition-all"
                >
                  Plan something
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Latest Recipes */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <History className="w-4 h-4 text-sage/30" />
              <h3 className="text-xs font-bold text-sage/40 uppercase tracking-[0.2em]">Recently Added</h3>
            </div>
            <button 
              onClick={() => onNavigate('recipes')}
              className="text-[10px] font-bold text-sage tracking-widest uppercase hover:text-terracotta transition-colors"
            >
              View Full Pantry
            </button>
          </div>

          <div className="space-y-4">
            {stats.latestRecipes.map((recipe) => (
              <motion.div 
                key={recipe.id}
                whileHover={{ x: 4 }}
                onClick={() => onNavigate('recipes', recipe.id)}
                className="bg-white p-4 md:p-6 rounded-3xl border border-sage/5 shadow-md shadow-sage/5 flex items-center gap-6 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-cream shadow-sm shrink-0">
                  <img src={recipe.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-serif text-sage group-hover:text-terracotta transition-colors">{recipe.title}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-sage/30 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {recipe.prep_time + recipe.cook_time} min
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-sage/5 text-sage/40 rounded-xl group-hover:bg-sage group-hover:text-white transition-all shadow-sm">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}