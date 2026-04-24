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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-2xl shadow-sage/10 border border-sage/5"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sage/40 hover:text-sage font-bold uppercase tracking-widest text-[10px] mb-6 transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Login
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif text-sage mb-2">Reset Password</h2>
        <p className="text-sage/60 font-light italic">
          Enter your email to receive a recovery link
        </p>
      </div>

      {success ? (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-sage/10 rounded-[2rem] border border-sage/10 text-center"
          >
            <CheckCircle2 className="w-10 h-10 text-sage mx-auto mb-4" />
            <p className="text-sage font-medium leading-relaxed">
              If an account is associated with that email, a reset link has been sent. Please check your inbox.
            </p>
          </motion.div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-sage/70 mb-1 ml-1 uppercase tracking-wider">Email Address</label>
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
              <>Send Recovery Link</>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
