import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
      {/* Masthead */}
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-8">
          <div
            className="flex items-baseline gap-4 cursor-pointer shrink-0"
            onClick={() => onTabChange('dashboard')}
          >
            <h1 className="font-serif font-bold text-lg md:text-xl uppercase tracking-[0.3em] text-sage leading-none">
              La Mia Cucina
            </h1>
            <span className="hidden lg:block micro">Est. in your kitchen</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors border-b-2 ${
                  activeTab === item.id
                    ? 'text-earth border-terracotta'
                    : 'text-sage/60 border-transparent hover:text-sage'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* User & Desktop Logout */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <button
              onClick={() => onTabChange('profile')}
              className="text-right group"
            >
              <p className="micro leading-none mb-1.5 group-hover:text-terracotta transition-colors">Chef</p>
              <p className={`font-serif text-[15px] leading-none transition-colors ${activeTab === 'profile' ? 'text-terracotta' : 'text-sage group-hover:text-terracotta'}`}>
                {user.name}
              </p>
            </button>
            <button
              onClick={onLogout}
              className="p-2.5 text-sage/50 hover:text-brick transition-colors border border-sage/25 hover:border-brick/40"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-3 -mr-3 text-sage/70 hover:text-sage"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
        {/* The masthead is a double rule, the way a paper sets one. */}
        <div className="h-[3px] bg-sage/85" />
        <div className="rule mt-[3px]" />
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
              className="fixed inset-0 z-40 bg-earth/40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[302px] bg-cream border-l-2 border-sage/65 md:hidden flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 px-6 pt-14 pb-5 border-b border-sage/20">
                <button
                  onClick={() => {
                    onTabChange('profile');
                    setIsMenuOpen(false);
                  }}
                  className="text-left group"
                >
                  <p className="micro mb-1.5">Chef</p>
                  <h2 className={`font-serif text-[28px] leading-tight transition-colors ${activeTab === 'profile' ? 'text-terracotta' : 'text-earth group-hover:text-terracotta'}`}>
                    {user.name}
                  </h2>
                </button>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 -mr-3 -mt-2 text-sage"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 px-6">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    className="w-full h-[62px] flex items-center gap-4 border-b border-sage/15 text-left relative"
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMenuOpen(false);
                    }}
                  >
                    {activeTab === item.id && (
                      <span className="absolute -left-6 top-0 bottom-0 w-[3px] bg-terracotta" />
                    )}
                    <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-terracotta' : 'text-sage'}`} />
                    <span className={`font-serif text-[21px] ${activeTab === item.id ? 'text-terracotta' : 'text-earth'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
                <button
                  className="w-full h-[62px] flex items-center gap-4 text-left relative"
                  onClick={() => {
                    onTabChange('profile');
                    setIsMenuOpen(false);
                  }}
                >
                  {activeTab === 'profile' && (
                    <span className="absolute -left-6 top-0 bottom-0 w-[3px] bg-terracotta" />
                  )}
                  <ChefHat className={`w-5 h-5 shrink-0 ${activeTab === 'profile' ? 'text-terracotta' : 'text-sage'}`} />
                  <span className={`font-serif text-[21px] ${activeTab === 'profile' ? 'text-terracotta' : 'text-earth'}`}>
                    Chef profile
                  </span>
                </button>
              </div>

              <div className="px-6 pt-4 pb-8 border-t border-sage/20">
                <button onClick={onLogout} className="btn-danger w-full">
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
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
