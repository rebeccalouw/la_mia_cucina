import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Mail, Lock, Loader2, User as UserIcon, UtensilsCrossed } from 'lucide-react';
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
    return (
      <AuthShell>
        <ForgotPassword onBack={() => setMode('login')} />
      </AuthShell>
    );
  }

  if (mode === 'reset-password' && resetToken) {
    return (
      <AuthShell>
        <ResetPassword token={resetToken} onSuccess={() => setMode('login')} />
      </AuthShell>
    );
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Mode is a pair of tabs on a rule, not a link buried at the bottom. */}
        <div className="flex gap-8 border-b border-sage/25 mb-10">
          <button
            onClick={() => mode !== 'login' && switchMode()}
            className={`pb-3.5 -mb-px text-[10px] font-semibold uppercase tracking-[0.28em] border-b-2 transition-colors ${
              mode === 'login' ? 'text-earth border-terracotta' : 'text-sage/50 border-transparent hover:text-sage'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => mode !== 'register' && switchMode()}
            className={`pb-3.5 -mb-px text-[10px] font-semibold uppercase tracking-[0.28em] border-b-2 transition-colors ${
              mode === 'register' ? 'text-earth border-terracotta' : 'text-sage/50 border-transparent hover:text-sage'
            }`}
          >
            Create an account
          </button>
        </div>

        <h2 className="text-[40px] md:text-[52px] leading-none tracking-[-0.03em]">
          {mode === 'login' ? (
            <>Welcome <span className="italic font-normal text-sage">back</span></>
          ) : (
            <>Join the <span className="italic font-normal text-sage">kitchen</span></>
          )}
        </h2>
        <p className="mt-4 mb-11 font-serif italic text-lg text-earth/55">
          {mode === 'login' ? 'Let yourself into the kitchen.' : 'Somewhere to keep everything worth cooking twice.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {mode === 'register' && (
            <div>
              <label className="micro block mb-2.5">Name</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <UserIcon className="w-[17px] h-[17px] text-sage/45 shrink-0" />
                <input
                  type="text"
                  required={mode === 'register'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="Mario"
                />
              </div>
            </div>
          )}

          <div>
            <label className="micro block mb-2.5">Email</label>
            <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
              <Mail className="w-[17px] h-[17px] text-sage/45 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                placeholder="chef@lamiacucina.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4 mb-2.5">
              <label className="micro">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-[9px] font-semibold text-terracotta uppercase tracking-[0.22em] hover:text-sage transition-colors"
                >
                  Forgotten it?
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
              <Lock className="w-[17px] h-[17px] text-sage/45 shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="micro block mb-2.5">Confirm the password</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <Lock className="w-[17px] h-[17px] text-sage/45 shrink-0" />
                <input
                  type="password"
                  required={mode === 'register'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3"
            >
              {error}
            </motion.p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-[19px]">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <>Enter the kitchen <ArrowRight className="w-6 h-4" /></>
            ) : (
              <>Create the account <ArrowRight className="w-6 h-4" /></>
            )}
          </button>
        </form>
      </motion.div>
    </AuthShell>
  );
}

/**
 * The split: a plated left half that carries the brand, a form on the right.
 * Everything the auth flow renders — sign in, register, forgot, reset — sits
 * inside it, so the panel never flashes away mid-flow.
 */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-cream">
      <div
        className="hidden lg:block relative w-[46%] max-w-[700px] shrink-0 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 40% 34%, #E8C99A 0%, #C98F5E 34%, #8E5A42 68%, #59715E 130%)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(118deg, rgba(246,241,231,0.13) 0 2px, transparent 2px 13px)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-earth/55 to-transparent to-60%" />

        <div className="absolute top-14 left-14 flex items-center gap-4">
          <div className="w-11 h-11 bg-cream/95 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-sage" />
          </div>
          <span className="font-serif font-bold text-[17px] uppercase tracking-[0.30em] text-cream">
            La Mia Cucina
          </span>
        </div>

        <div className="absolute left-14 right-14 bottom-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cream/70">
            Your kitchen, written down
          </p>
          <p className="mt-5 font-serif font-bold text-[66px] leading-[0.98] tracking-[-0.03em] text-cream">
            Every recipe<br />worth <span className="italic font-normal">keeping.</span>
          </p>
          <div className="w-[90px] h-[3px] bg-cream/75 my-7" />
          <p className="max-w-[470px] font-serif italic text-xl leading-relaxed text-cream/80">
            Write them, import them, plan the week around them, and remember what is still in
            the freezer.
          </p>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-14">
        <div className="lg:hidden flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-sage flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-cream" />
          </div>
          <span className="font-serif font-bold text-sm uppercase tracking-[0.28em] text-sage">
            La Mia Cucina
          </span>
        </div>
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
