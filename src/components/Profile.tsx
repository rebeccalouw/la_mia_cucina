import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Save, Loader2, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl shadow-sage/5 border border-sage/5">
        <div className="flex items-center gap-6 mb-10">
          <div className="bg-sage/10 w-16 h-16 rounded-3xl flex items-center justify-center">
            <User className="w-8 h-8 text-sage" />
          </div>
          <div>
            <h2 className="text-3xl font-serif text-sage">Chef Profile</h2>
            <p className="text-sage/40 text-xs uppercase font-bold tracking-widest mt-1">Manage your details & security</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Profile Details */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-sage/40 mb-4">
              <User className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Personal Information</h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-cream/30 border border-sage/10 rounded-2xl focus:border-terracotta/50 outline-none transition-all text-sm font-medium text-sage"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-60">
                <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">Email Address (Read Only)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 bg-cream/10 border border-sage/5 rounded-2xl outline-none text-sm font-medium text-sage/40"
                  />
                </div>
              </div>

              {profileError && (
                <p className="text-[10px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{profileError}</p>
              )}

              {profileSuccess && (
                <div className="flex items-center gap-2 text-sage bg-sage/5 p-3 rounded-xl border border-sage/10">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Profile updated!</p>
                </div>
              )}

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full bg-sage hover:bg-sage/90 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-sage/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="text-xs uppercase tracking-widest">Update Profile</span>
              </button>
            </form>
          </section>

          {/* Password Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-sage/40 mb-4">
              <ShieldCheck className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Security & Password</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-cream/30 border border-sage/10 rounded-2xl focus:border-terracotta/50 outline-none transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-cream/30 border border-sage/10 rounded-2xl focus:border-terracotta/50 outline-none transition-all text-sm"
                    placeholder="Min. 8 characters"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-sage/40 uppercase tracking-widest ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage/30" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-cream/30 border border-sage/10 rounded-2xl focus:border-terracotta/50 outline-none transition-all text-sm"
                    placeholder="Re-type new password"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-[10px] text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{passwordError}</p>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 text-sage bg-sage/5 p-3 rounded-xl border border-sage/10">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Password changed successfully!</p>
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-terracotta hover:bg-terracotta/90 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-terracotta/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span className="text-xs uppercase tracking-widest">Change Password</span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
