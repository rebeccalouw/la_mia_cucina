import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Download,
  Calendar,
  LogOut,
  Menu,
  X,
  LayoutGrid,
  Snowflake,
  ArrowRight,
} from 'lucide-react';

interface DashboardLayoutProps {
  user: { id: number; email: string; name: string };
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/* The wordmark: a coral tile with the fork-and-spoon, then the two words stacked. */
export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-[11px] px-2 text-left">
      <span className="w-[38px] h-[38px] shrink-0 rounded-[13px] bg-coral flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF6EE" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3v8" /><path d="M11 3v8" /><path d="M9 11v10" />
          <path d="M7 3a2 2 0 0 0-2 2v3a4 4 0 0 0 8 0V5a2 2 0 0 0-2-2" />
          <path d="M18 3c-1.7 1.6-2.5 3.7-2.5 6.5 0 2 .8 3.2 2.5 3.5v8" />
        </svg>
      </span>
      <span className="font-display text-[16px] font-extrabold tracking-[-0.02em]">
        <span className="block leading-none">La Mia</span>
        <span className="block leading-[1.1] text-green">Cucina</span>
      </span>
    </button>
  );
}

export default function DashboardLayout({ user, onLogout, children, activeTab, onTabChange }: DashboardLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /* Add Recipe is not a rail item — it is the coral call to action on the
     Kitchen and Recipes pages — so writing a recipe keeps Recipes lit. */
  const navItems = [
    { label: 'Kitchen', icon: LayoutGrid, id: 'dashboard' },
    { label: 'Recipes', icon: BookOpen, id: 'recipes', also: ['add-recipe'] },
    { label: 'Meal planner', icon: Calendar, id: 'planner' },
    { label: 'Freezer', icon: Snowflake, id: 'freezer' },
    { label: 'Import a link', icon: Download, id: 'import' },
  ];

  const isOn = (item: { id: string; also?: string[] }) =>
    activeTab === item.id || (item.also?.includes(activeTab) ?? false);

  const initial = (user.name || '?').trim().charAt(0).toUpperCase();

  const nav = (onDone?: () => void) => (
    <div className="flex flex-col gap-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            onTabChange(item.id);
            onDone?.();
          }}
          className={`${isOn(item) ? 'rail-item-on' : 'rail-item'} w-full text-left`}
        >
          <item.icon className="w-5 h-5 shrink-0" strokeWidth={1.9} />
          {item.label}
        </button>
      ))}
    </div>
  );

  const freezerNote = (onDone?: () => void) => (
    <button
      onClick={() => {
        onTabChange('freezer');
        onDone?.();
      }}
      className="rounded-[18px] bg-green-tint p-[18px] flex flex-col gap-2.5 text-left"
    >
      <span className="text-[13px] font-semibold text-green">Freezer check</span>
      <span className="text-[13px] leading-[1.45] text-green-ink">
        Anything older than a month is worth eating first.
      </span>
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-green">
        Open freezer <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
      </span>
    </button>
  );

  const chef = (onDone?: () => void) => (
    <button
      onClick={() => {
        onTabChange('profile');
        onDone?.();
      }}
      className="flex items-center gap-[11px] px-1.5 py-2.5 rounded-[14px] text-left transition-colors hover:bg-page"
    >
      <span className="w-9 h-9 shrink-0 rounded-xl bg-avatar flex items-center justify-center text-[14px] font-bold text-avatar-ink">
        {initial}
      </span>
      <span className="min-w-0">
        <span className={`block text-[14px] font-semibold leading-tight ${activeTab === 'profile' ? 'text-coral' : ''}`}>
          {user.name}
        </span>
        <span className="block text-[12px] text-faint">Chef profile</span>
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-page selection:bg-coral/15 md:flex">
      {/* The rail — the whole navigation, 236px of it, from lg up. */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[236px] flex-col gap-[34px] overflow-y-auto no-scrollbar bg-surface border-r border-hairline px-5 py-7">
        <Wordmark onClick={() => onTabChange('dashboard')} />
        {nav()}
        <div className="mt-auto flex flex-col gap-4">
          {freezerNote()}
          {chef()}
        </div>
      </aside>

      {/* Mobile bar */}
      <header className="md:hidden sticky top-0 z-40 bg-page/90 backdrop-blur-xl border-b border-hairline">
        <div className="h-[68px] px-4 flex items-center justify-between">
          <Wordmark onClick={() => onTabChange('dashboard')} />
          <button
            className="p-3 -mr-3 text-muted"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-ink/40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[288px] bg-surface border-l border-hairline md:hidden flex flex-col gap-6 px-5 py-7 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <Wordmark
                  onClick={() => {
                    onTabChange('dashboard');
                    setIsMenuOpen(false);
                  }}
                />
                <button onClick={() => setIsMenuOpen(false)} className="p-3 -mr-3 text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {nav(() => setIsMenuOpen(false))}

              <div className="mt-auto flex flex-col gap-4">
                {freezerNote(() => setIsMenuOpen(false))}
                {chef(() => setIsMenuOpen(false))}
                <button onClick={onLogout} className="btn-danger w-full">
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-grow min-w-0 px-5 py-8 md:ml-[236px] md:px-10 md:pt-[34px] md:pb-11">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-[1180px]"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
