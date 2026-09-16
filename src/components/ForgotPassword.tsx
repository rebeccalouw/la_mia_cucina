import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-ink transition-colors mb-7"
      >
        <ArrowLeft className="w-[18px] h-[18px] text-faint" strokeWidth={2.2} />
        Back to sign in
      </button>

      <h2 className="dsp text-[38px] md:text-[44px] font-extrabold tracking-[-0.035em] leading-[1.02]">
        Locked out<span className="text-coral">.</span>
      </h2>
      <p className="mt-3.5 mb-8 text-[16px] leading-[1.5] text-muted">
        Give us the address you signed up with and we&rsquo;ll send a recovery link.
      </p>

      {success ? (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-green p-8 text-center"
          >
            <CheckCircle2 className="w-10 h-10 text-green mx-auto mb-4" strokeWidth={1.4} />
            <p className="dsp text-[24px] font-bold text-green mb-1.5">Check your inbox</p>
            <p className="text-[15px] leading-[1.5] text-green-ink">
              If an account is registered to that address, a reset link is on its way.
            </p>
          </motion.div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="field-label mb-2">Email address</label>
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
              <>Send the recovery link</>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
