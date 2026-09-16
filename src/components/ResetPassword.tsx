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
      <h2 className="dsp text-[38px] md:text-[44px] font-extrabold tracking-[-0.035em] leading-[1.02]">
        A new password<span className="text-coral">.</span>
      </h2>
      <p className="mt-3.5 mb-8 text-[16px] leading-[1.5] text-muted">
        Pick something you have not used elsewhere.
      </p>

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-green p-10 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green mx-auto mb-4" strokeWidth={1.4} />
          <p className="dsp text-[28px] font-bold text-green mb-1.5">All set</p>
          <p className="text-[15px] text-green-ink">
            Your password has been changed. Taking you back to sign in&hellip;
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="field-label mb-2">New password &middot; at least 8 characters</label>
              <div className="flex items-center gap-3 rounded-[14px] bg-surface border border-hairline px-4 py-[15px] transition-colors focus-within:border-coral">
                <Lock className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                  placeholder="Type a new one"
                />
              </div>
            </div>

            <div>
              <label className="field-label mb-2">Confirm the new password</label>
              <div className="flex items-center gap-3 rounded-[14px] bg-surface border border-hairline px-4 py-[15px] transition-colors focus-within:border-coral">
                <Lock className="w-[18px] h-[18px] shrink-0 text-fainter" strokeWidth={2} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-ink placeholder:text-placeholder"
                  placeholder="Type it again"
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !rounded-2xl !py-[17px] !text-[15px]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Set the new password</>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
