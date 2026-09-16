import React, { useState, useEffect } from 'react';
import { Lock, Save, Loader2, CheckCircle2 } from 'lucide-react';

interface ProfileProps {
  user: { id: number; email: string; name: string };
  onUpdate: (user: { id: number; email: string; name: string }) => void;
  onLogout?: () => void;
}

export default function Profile({ user, onUpdate, onLogout }: ProfileProps) {
  /* What the chef has built, for the green card. */
  const [stats, setStats] = useState<{ recipes: number; meals: number; freezer: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('la_mia_cucina_token');
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    Promise.all([
      fetch('/api/recipes', auth).then(r => r.json()),
      fetch('/api/planner', auth).then(r => r.json()),
      fetch('/api/freezer', auth).then(r => r.json()),
    ])
      .then(([recipes, meals, freezer]) =>
        setStats({
          recipes: Array.isArray(recipes) ? recipes.length : 0,
          meals: Array.isArray(meals) ? meals.length : 0,
          freezer: Array.isArray(freezer) ? freezer.length : 0,
        })
      )
      .catch(err => console.error('Failed to fetch profile counts', err));
  }, []);

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
    <div className="flex flex-col gap-7">
      <div>
        <p className="eyebrow">Your details and your password</p>
        <h1 className="h-page mt-2 text-[34px] md:text-[42px]">Chef profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Who you are */}
        <form onSubmit={handleUpdateProfile} className="rounded-[22px] bg-surface border border-hairline p-[26px] flex flex-col gap-[18px] self-start">
          <div className="flex items-center gap-3.5">
            <span className="w-[58px] h-[58px] shrink-0 rounded-[20px] bg-avatar text-avatar-ink flex items-center justify-center text-[22px] font-bold">
              {(user.name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              {/* Names are stored as the chef writes them — no honorific is prepended. */}
              <p className="dsp text-[22px] font-bold tracking-[-0.025em] truncate">{user.name}</p>
              <p className="text-[14px] text-faint mt-0.5">Keeping the box in order</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Display name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="field-label">Email address · cannot be changed</label>
            <input type="email" value={user.email} disabled className="field !text-placeholder" />
          </div>

          {profileError && (
            <p className="rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3">{profileError}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={updatingProfile} className="btn-primary">
              {updatingProfile ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : <Save className="w-[17px] h-[17px]" strokeWidth={2.2} />}
              Save changes
            </button>
            {profileSuccess && (
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-green">
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.4} /> Saved a moment ago
              </span>
            )}
          </div>
        </form>

        <div className="flex flex-col gap-6">
          {/* The password */}
          <form onSubmit={handleChangePassword} className="rounded-[22px] bg-surface border border-hairline p-[26px] flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Lock className="w-[19px] h-[19px] text-muted" strokeWidth={2} />
              <h2 className="dsp text-[19px] font-bold tracking-[-0.02em]">Password</h2>
            </div>

            <div className="flex flex-col gap-2">
              <label className="field-label">Current password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="field-label">New password · at least 8 characters</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Type a new one"
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="field-label">Confirm the new password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type it again"
                className="field"
              />
            </div>

            {passwordError && (
              <p className="rounded-[14px] border border-brick/30 bg-brick-tint text-brick text-[14px] px-4 py-3">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="rounded-[14px] bg-green-tint text-green text-[14px] font-semibold px-4 py-3">
                Your password has been changed.
              </p>
            )}

            <button type="submit" disabled={changingPassword} className="btn-dark self-start">
              {changingPassword ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : null}
              Change the password
            </button>
          </form>

          {/* What you have built */}
          <div className="rounded-[22px] bg-green-tint p-6 flex flex-col gap-3.5">
            <h2 className="dsp text-[19px] font-bold tracking-[-0.02em] text-green">Your kitchen so far</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                [stats?.recipes, 'Recipes'],
                [stats?.meals, 'Meals planned'],
                [stats?.freezer, 'In the freezer'],
              ].map(([value, label]) => (
                <div key={label as string}>
                  <p className="dsp text-[30px] font-bold tracking-[-0.04em] text-green">
                    {value === undefined ? '—' : (value as number)}
                  </p>
                  <p className="text-[13px] text-green-ink mt-0.5">{label as string}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The way out */}
          {onLogout && (
            <div className="rounded-[22px] border border-[#F0D4CC] px-6 py-[22px] flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-[#B8401F]">Log out</p>
                <p className="text-[13px] text-[#9A6B5C] mt-0.5">You will need your password to get back in.</p>
              </div>
              <button
                onClick={onLogout}
                className="shrink-0 rounded-full border border-[#E8A895] px-[18px] py-[11px] text-[13px] font-bold text-[#C0563E] transition-colors hover:bg-brick-tint"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
