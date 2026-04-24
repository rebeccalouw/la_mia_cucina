/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import Auth from "./components/Auth.tsx";
import DashboardLayout from "./components/DashboardLayout.tsx";
import AddRecipe from "./components/AddRecipe.tsx";
import EditRecipe from "./components/EditRecipe.tsx";
import RecipeList from "./components/RecipeList.tsx";
import RecipeDetail from "./components/RecipeDetail.tsx";
import ImportRecipe from "./components/ImportRecipe.tsx";
import MealPlannerCalendar from "./components/MealPlannerCalendar.tsx";
import Profile from "./components/Profile.tsx";
import Dashboard from "./components/Dashboard.tsx";
import Freezer from "./components/Freezer.tsx";

interface UserData {
  id: number;
  email: string;
  name: string;
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [isEditingId, setIsEditingId] = useState<number | null>(null);
  const [initialResetToken, setInitialResetToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for reset token in URL (query param or hash)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('reset_token') || hashParams.get('reset_token');
    
    if (token) {
      setInitialResetToken(token);
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    }
    
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('la_mia_cucina_token');
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('la_mia_cucina_token');
      }
    } catch (err) {
      console.error('Auth check failed', err);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('la_mia_cucina_token');
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      localStorage.removeItem('la_mia_cucina_token');
      setUser(null);
      setActiveTab('dashboard');
      setSelectedRecipeId(null);
      setIsEditingId(null);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedRecipeId(null);
    setIsEditingId(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-earth font-sans selection:bg-terracotta/20">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-sage p-3 rounded-2xl shadow-lg shadow-sage/20">
                <UtensilsCrossed className="w-8 h-8 text-cream" />
              </div>
              <h1 className="text-4xl font-serif text-sage tracking-tight">La Mia Cucina</h1>
            </div>
            <Auth onSuccess={setUser} initialResetToken={initialResetToken} />
          </motion.div>
        ) : (
          <DashboardLayout 
            user={user} 
            onLogout={handleLogout}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <Dashboard onNavigate={(tab, id) => {
                  setActiveTab(tab);
                  if (id) setSelectedRecipeId(id);
                }} />
              )}

              {activeTab === 'add-recipe' && (
                <AddRecipe onSuccess={() => handleTabChange('recipes')} />
              )}

              {activeTab === 'recipes' && (
                <div key="recipes-view">
                  {isEditingId ? (
                    <EditRecipe 
                      recipeId={isEditingId}
                      onSuccess={() => {
                        setIsEditingId(null);
                        setSelectedRecipeId(isEditingId);
                      }}
                      onCancel={() => setIsEditingId(null)}
                    />
                  ) : selectedRecipeId ? (
                    <RecipeDetail 
                      recipeId={selectedRecipeId} 
                      onBack={() => setSelectedRecipeId(null)} 
                      onEdit={(id) => setIsEditingId(id)}
                      onDelete={() => setSelectedRecipeId(null)}
                    />
                  ) : (
                    <RecipeList onSelectRecipe={setSelectedRecipeId} />
                  )}
                </div>
              )}

              {activeTab === 'import' && (
                <ImportRecipe key="import-view" />
              )}

              {activeTab === 'planner' && (
                <MealPlannerCalendar />
              )}

              {activeTab === 'profile' && (
                <Profile user={user} onUpdate={setUser} />
              )}

              {activeTab === 'freezer' && (
                <Freezer key="freezer-view" />
              )}
            </AnimatePresence>
          </DashboardLayout>
        )}
      </AnimatePresence>
    </div>
  );
}