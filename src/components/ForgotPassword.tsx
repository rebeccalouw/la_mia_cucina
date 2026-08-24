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
        className="flex items-center gap-3 micro hover:text-sage transition-colors mb-9"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </button>

      <h2 className="text-[40px] md:text-[52px] leading-none tracking-[-0.03em]">
        Locked <span className="italic font-normal text-sage">out</span>
      </h2>
      <p className="mt-4 mb-11 font-serif italic text-lg text-earth/55">
        Give us the address you signed up with and we&rsquo;ll send a recovery link.
      </p>

      {success ? (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-sage/40 bg-sage/6 p-8 text-center"
          >
            <CheckCircle2 className="w-10 h-10 text-sage mx-auto mb-5" strokeWidth={1.2} />
            <p className="font-serif text-2xl text-sage mb-2">Check your inbox</p>
            <p className="font-serif italic text-earth/60 leading-relaxed">
              If an account is registered to that address, a reset link is on its way.
            </p>
          </motion.div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="micro block mb-2.5">Email address</label>
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
              <>Send Recovery Link</>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
