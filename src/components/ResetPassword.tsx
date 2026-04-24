import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ResetPasswordProps {
  token: string;
  onSuccess: () => void;
}

export default function ResetPassword({ token, onSuccess }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-2xl shadow-sage/10 border border-sage/5"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif text-sage mb-2">New Password</h2>
        <p className="text-sage/60 font-light italic">
          Set your new secure password
        </p>
      </div>

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-sage/10 rounded-[2rem] border border-sage/10 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-sage mx-auto mb-4" />
          <p className="text-sage font-serif text-xl mb-1">Success!</p>
          <p className="text-sage/60 text-sm italic">
            Your password has been reset. Redirecting to login...
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-sage/70 mb-1 ml-1 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 outline-none transition-all font-sans"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-sage/70 mb-1 ml-1 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/40" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream/50 border border-sage/10 focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 outline-none transition-all font-sans"
                  placeholder="Confirm your new password"
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl border border-red-100 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terracotta hover:bg-terracotta/90 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-terracotta/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Reset Password</>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
