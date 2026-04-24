import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UtensilsCrossed, 
  BookOpen, 
  PlusCircle, 
  Download, 
  Calendar, 
  LogOut, 
  Menu, 
  X, 
  ChefHat,
  Snowflake
} from 'lucide-react';

interface DashboardLayoutProps {
  user: { id: number; email: string; name: string };
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardLayout({ user, onLogout, children, activeTab, onTabChange }: DashboardLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Recipes', icon: BookOpen, id: 'recipes' },
    { label: 'Add Recipe', icon: PlusCircle, id: 'add-recipe' },
    { label: 'Import Recipe', icon: Download, id: 'import' },
    { label: 'Meal Planner', icon: Calendar, id: 'planner' },
    { label: 'Freezer', icon: Snowflake, id: 'freezer' },
  ];

  return (
    <div className="min-h-screen bg-cream selection:bg-terracotta/20">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-sage/5">
        <nav className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onTabChange('dashboard')}
          >
            <motion.div 
              whileHover={{ rotate: 15 }}
              className="bg-sage p-2 rounded-xl shadow-lg shadow-sage/10"
            >
              <UtensilsCrossed className="w-6 h-6 text-cream" />
            </motion.div>
            <h1 className="text-2xl font-serif text-sage tracking-tight hidden sm:block">
              La Mia Cucina
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === item.id
                    ? 'bg-sage/10 text-sage' 
                    : 'text-sage/60 hover:text-sage hover:bg-sage/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          {/* User & Desktop Logout */}
          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-sage/10">
            <button 
              onClick={() => onTabChange('profile')}
              className={`text-right group ${activeTab === 'profile' ? 'opacity-100' : 'opacity-80 hover:opacity-100'} transition-all`}
            >
              <p className="text-xs uppercase tracking-widest text-sage/40 font-bold leading-none mb-1 group-hover:text-terracotta transition-colors">Chef</p>
              <p className="text-sm font-medium text-sage leading-none group-hover:text-terracotta transition-colors">{user.name}</p>
            </button>
            <button
              onClick={onLogout}
              className="bg-cream hover:bg-red-50 text-sage/60 hover:text-red-500 p-2.5 rounded-xl transition-all border border-sage/5 hover:border-red-100 group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-sage/60 hover:text-sage"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
      </header>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-earth/10 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-white shadow-2xl p-6 md:hidden flex flex-col"
            >
              <button 
                onClick={() => {
                  onTabChange('profile');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-3 mb-10 pb-6 border-b border-sage/5 w-full text-left group transition-all ${activeTab === 'profile' ? 'bg-sage/5 rounded-2xl p-4 -mx-4' : ''}`}
              >
                <ChefHat className={`w-8 h-8 transition-colors ${activeTab === 'profile' ? 'text-terracotta' : 'text-sage'}`} />
                <div>
                  <h2 className={`text-xl font-serif leading-none mb-1 transition-colors ${activeTab === 'profile' ? 'text-terracotta' : 'text-sage'}`}>Menu</h2>
                  <p className="text-xs text-sage/40 font-medium tracking-wider uppercase group-hover:text-terracotta transition-colors">{user.name}</p>
                </div>
              </button>

              <div className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-4 transition-all text-lg font-medium ${
                      activeTab === item.id 
                        ? 'bg-sage/10 text-sage' 
                        : 'text-sage/60 hover:text-sage hover:bg-sage/5'
                    }`}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMenuOpen(false);
                    }}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={onLogout}
                className="mt-auto w-full px-4 py-4 rounded-2xl flex items-center gap-4 text-red-500 hover:bg-red-50 transition-all text-lg font-medium"
              >
                <LogOut className="w-6 h-6" />
                Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Pane */}
      <main className="max-w-7xl mx-auto px-4 md:px-10 lg:px-16 py-6 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
