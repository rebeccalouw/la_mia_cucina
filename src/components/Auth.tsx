import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Loader2, User as UserIcon } from 'lucide-react';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

interface AuthProps {
  onSuccess: (user: { id: number; email: string; name: string }) => void;
  initialResetToken?: string | null;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export default function Auth({ onSuccess, initialResetToken }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(initialResetToken ? 'reset-password' : 'login');
  const [resetToken, setResetToken] = useState<string | null>(initialResetToken || null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialResetToken) {
      setResetToken(initialResetToken);
      setMode('reset-password');
    }
  }, [initialResetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login' 
      ? { email, password } 
      : { email, password, name };
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.token) {
        localStorage.setItem('la_mia_cucina_token', data.token);
      }
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot-password') {
    return <ForgotPassword onBack={() => setMode('login')} />;
  }

  if (mode === 'reset-password' && resetToken) {
    return <ResetPassword token={resetToken} onSuccess={() => setMode('login')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-2xl shadow-sage/10 border border-sage/5"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif text-sage mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Join La Mia Cucina'}
        </h2>
        <p className="text-sage/60 font-light italic">
          {mode === 'login' ? 'Log in to your kitchen' : 'Start your culinary journey'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <label className="block text-sm font-medium text-sage/70 mb-1 ml-1 uppercase tracking-wider">Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
              <input
                type="text"
                required={mode === 'register'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 outline-none transition-all font-sans"
                placeholder="Chef Mario"
              />
            </div>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-sage/70 mb-1 ml-1 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 outline-none transition-all font-sans"
              placeholder="chef@lamiacucina.com"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 ml-1">
            <label className="block text-sm font-medium text-sage/70 uppercase tracking-wider">Password</label>
            {mode === 'login' && (
              <button 
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-[10px] font-bold text-terracotta uppercase tracking-widest hover:underline"
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 outline-none transition-all font-sans"
              placeholder="••••••••"
            />
          </div>
        </div>

        {mode === 'register' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <label className="block text-sm font-medium text-sage/70 mb-1 ml-1 uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
              <input
                type="password"
                required={mode === 'register'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 outline-none transition-all font-sans"
                placeholder="••••••••"
              />
            </div>
          </motion.div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl border border-red-100"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-terracotta hover:bg-terracotta/90 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-terracotta/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : mode === 'login' ? (
            <>
              <LogIn className="w-5 h-5" /> Sign In
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" /> Create Account
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center border-t border-sage/5 pt-6">
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
          }}
          className="text-terracotta hover:text-terracotta/80 text-sm font-medium transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </motion.div>
  );
}
