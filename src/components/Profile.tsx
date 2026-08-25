import React, { useState } from 'react';
import { User, Lock, Save, Loader2, CheckCircle2, Mail } from 'lucide-react';

interface ProfileProps {
  user: { id: number; email: string; name: string };
  onUpdate: (user: { id: number; email: string; name: string }) => void;
}

export default function Profile({ user, onUpdate }: ProfileProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileError('');
    setProfileSuccess(false);

    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      if (data.token) localStorage.setItem('la_mia_cucina_token', data.token);
      onUpdate(data.user);
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setChangingPassword(false);
      return;
    }

    const token = localStorage.getItem('la_mia_cucina_token');
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      {/* Masthead for the chef */}
      <div className="flex flex-wrap items-end gap-7 pb-8">
        <div className="w-24 h-24 shrink-0 bg-terracotta flex items-center justify-center">
          <span className="font-serif text-[40px] text-cream leading-none">
            {(user.name || '?').trim().charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="label">Your details and your password</p>
          {/* Names are stored as the chef writes them — no honorific is prepended. */}
          <h1 className="font-serif mt-3 text-[40px] md:text-[56px] leading-none tracking-[-0.025em] italic font-normal text-sage">
            {user.name}
          </h1>
        </div>
      </div>

      <div className="rule-strong" />

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 pt-10">
        {/* Details */}
        <section className="flex-1 min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.30em] text-earth mb-8">Your details</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-7">
            <div>
              <label className="micro block mb-2.5">Display name</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <User className="w-4 h-4 text-sage/45 shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="micro block mb-2.5">Email address &middot; cannot be changed</label>
              <div className="flex items-center gap-3 border-b border-dashed border-sage/30">
                <Mail className="w-4 h-4 text-sage/35 shrink-0" />
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth/40 outline-none"
                />
              </div>
            </div>

            {profileError && (
              <p className="border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3">{profileError}</p>
            )}

            {profileSuccess && (
              <div className="flex items-center gap-3.5 border border-sage/40 bg-sage/6 px-4 py-3.5">
                <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage">Saved a moment ago</p>
              </div>
            )}

            <button type="submit" disabled={updatingProfile} className="btn-primary">
              {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update details
            </button>
          </form>
        </section>

        <div className="hidden lg:block w-px bg-sage/20 shrink-0" />

        {/* Password */}
        <section className="flex-1 min-w-0 pt-10 lg:pt-0 border-t lg:border-t-0 border-sage/20">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.30em] text-earth mb-8">Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-7">
            <div>
              <label className="micro block mb-2.5">Current password</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <Lock className="w-4 h-4 text-sage/45 shrink-0" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="micro block mb-2.5">New password &middot; at least 8 characters</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <Lock className="w-4 h-4 text-sage/45 shrink-0" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="Type a new one"
                />
              </div>
            </div>

            <div>
              <label className="micro block mb-2.5">Confirm the new password</label>
              <div className="flex items-center gap-3 border-b border-sage/30 focus-within:border-terracotta transition-colors">
                <Lock className="w-4 h-4 text-sage/45 shrink-0" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="flex-1 min-w-0 bg-transparent border-0 pb-2.5 text-[17px] text-earth outline-none placeholder:text-earth/30"
                  placeholder="Type it again"
                />
              </div>
            </div>

            {passwordError && (
              <p className="border border-brick/40 bg-brick/5 text-brick text-sm px-4 py-3">{passwordError}</p>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-3.5 border border-sage/40 bg-sage/6 px-4 py-3.5">
                <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage">Password changed</p>
              </div>
            )}

            <button type="submit" disabled={changingPassword} className="btn-accent">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Change password
            </button>
          </form>
        </section>
      </div>
    </div>
  );

}
