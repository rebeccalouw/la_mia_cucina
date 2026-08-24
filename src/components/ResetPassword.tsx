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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-[40px] md:text-[52px] leading-none tracking-[-0.03em]">
        A new <span className="italic font-normal text-sage">password</span>
      </h2>
      <p className="mt-4 mb-11 font-serif italic text-lg text-earth/55">
        Pick something you have not used elsewhere.
      </p>

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-sage/40 bg-sage/6 p-10 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-sage mx-auto mb-5" strokeWidth={1.2} />
          <p className="font-serif text-3xl text-sage mb-2">All set</p>
          <p className="font-serif italic text-earth/60">
            Your password has been changed. Taking you back to sign in&hellip;
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="micro block mb-2.5">New password &middot; at least 8 characters</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <Lock className="w-[17px] h-[17px] text-sage/45 shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="Type a new one"
                />
              </div>
            </div>

            <div>
              <label className="micro block mb-2.5">Confirm the new password</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <Lock className="w-[17px] h-[17px] text-sage/45 shrink-0" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="Type it again"
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full py-[19px]"
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
