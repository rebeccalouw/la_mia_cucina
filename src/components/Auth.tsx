import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Mail, Lock, Loader2, User as UserIcon, UtensilsCrossed, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
    setShowPassword(false);
  };

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
        <div>
          <h2 className="dsp text-[38px] md:text-[44px] font-extrabold tracking-[-0.035em] leading-[1.02]">
            {mode === 'login' ? (
              <>Welcome<br />back<span className="text-coral">.</span></>
            ) : (
              <>Join the<br />kitchen<span className="text-coral">.</span></>
            )}
          </h2>
          <p className="mt-3.5 text-[16px] leading-[1.5] text-muted">
            {mode === 'login'
              ? 'Your recipes, your week and your freezer are where you left them.'
              : 'Somewhere to keep everything worth cooking twice.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <label className="field-label">Name</label>
              <div className="flex items-center gap-3 rounded-[14px] bg-surface border border-hairline px-4 py-[15px] transition-colors focus-within:border-coral">
                <UserIcon className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
                <input
                  type="text"
                  required={mode === 'register'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                  placeholder="Mario"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="field-label">Email</label>
            <div className="flex items-center gap-3 rounded-[14px] bg-surface border border-hairline px-4 py-[15px] transition-colors focus-within:border-coral">
              <Mail className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                placeholder="chef@lamiacucina.com"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label className="field-label">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-[13px] font-semibold text-coral hover:text-green transition-colors"
                >
                  Forgotten it?
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-[14px] bg-surface border border-hairline px-4 py-[15px] transition-colors focus-within:border-coral">
              <Lock className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                placeholder="••••••••"
              />
              {/* Masked by default; the eye is the only way to read it back. */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide the password' : 'Show the password'}
                aria-pressed={showPassword}
                className="shrink-0 text-fainter hover:text-coral transition-colors"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <label className="field-label">Confirm the password</label>
              <div className="flex items-center gap-3 rounded-[14px] bg-surface border border-hairline px-4 py-[15px] transition-colors focus-within:border-coral">
                <Lock className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
                <input
                  type="password"
                  required={mode === 'register'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-1.5 w-full !rounded-2xl !py-[17px] !text-[15px]"
          >
            {loading ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Enter the kitchen' : 'Create the account'}
                <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </>
            )}
          </button>

          <p className="text-center text-[14px] text-muted">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button" onClick={switchMode} className="font-bold text-green hover:text-coral transition-colors">
              {mode === 'login' ? 'Join the kitchen' : 'Sign in'}
            </button>
          </p>
        </form>
      </motion.div>
    </AuthShell>
  );
}

/**
 * The split: the form on a white panel, and a warm coral field beside it
 * carrying the plates. Everything the auth flow renders — sign in, register,
 * forgot, reset — sits inside it, so the panel never flashes away mid-flow.
 */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-page">
      {/* The statement. Decorative, so it steps aside on a narrow screen. */}
      <div className="hidden lg:flex w-[46%] max-w-[700px] shrink-0 items-center justify-center bg-ink px-12 py-[54px]">
        {/* A hairline frame, set in from the edge the way a page is. */}
        <div className="w-full h-full rounded-[26px] border border-oncoral/12 flex flex-col justify-between px-11 py-11">
          <div className="flex items-center gap-3">
            <span className="w-[42px] h-[42px] shrink-0 rounded-[14px] bg-coral flex items-center justify-center">
              <UtensilsCrossed className="w-[22px] h-[22px] text-oncoral" strokeWidth={1.9} />
            </span>
            <span className="dsp text-[19px] font-extrabold tracking-[-0.02em] text-oncoral">La Mia Cucina</span>
          </div>

          <div>
            <p className="micro text-peach">Your kitchen, written down</p>
            <p className="dsp mt-5 text-[52px] font-extrabold tracking-[-0.04em] leading-[1.02] text-oncoral">
              Every recipe<br />worth keeping<span className="text-coral">.</span>
            </p>
            <span className="block w-[90px] h-[3px] rounded-full bg-coral my-7" />
            <p className="max-w-[440px] text-[17px] leading-[1.55] text-darkmuted">
              Write them, import them, plan the week around them, and remember what is still in
              the freezer.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow min-w-0 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="w-full max-w-[480px] flex flex-col gap-8">
          {/* The mark sits on the statement panel from lg up; here it stands in below it. */}
          <div className="flex lg:hidden items-center gap-3">
            <span className="w-[42px] h-[42px] shrink-0 rounded-[14px] bg-coral flex items-center justify-center">
              <UtensilsCrossed className="w-[22px] h-[22px] text-oncoral" strokeWidth={1.9} />
            </span>
            <span className="dsp text-[19px] font-extrabold tracking-[-0.02em]">La Mia Cucina</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
