/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Link2, Shield, Bell, Palette, Cpu, Lock, LogOut, 
  CheckCircle2, Loader2, Info, Check, 
  Trash2, ShieldAlert, Key, Globe, Volume2, Moon, Sun, Monitor, Github,
  Database, Activity, Code2, Terminal,
  Bug, Lightbulb, Search, Smartphone, Eye, EyeOff, Zap, Download,
  CheckSquare, ArrowRight, ShieldCheck, RefreshCw, Menu, X, ChevronRight,
  Sparkles, Layers
} from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile, ConnectedAccount } from '../types';

interface SettingsViewProps {
  user: UserProfile;
  activeSubTab: string;
  onSubTabChange: (subTab: string) => void;
  onLogout: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

const AVATAR_OPTIONS = ['💻', '🚀', '📚', '🤖', '👾', '🎨', '⚡', '☕', '🧬', '🧠', '🎯', '🏆', '🔥', '💎', '🛡️', '👑'];

const TIMEZONE_OPTIONS = [
  'UTC', 'America/New_York (EST)', 'America/Los_Angeles (PST)', 'Europe/London (GMT)',
  'Europe/Paris (CET)', 'Asia/Kolkata (IST)', 'Asia/Tokyo (JST)', 'Australia/Sydney (AEST)'
];

const LANGUAGE_OPTIONS = ['English (US)', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Mandarin'];

const CATEGORIES = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Personal details, avatar & institution', badge: null },
  { id: 'security', label: 'Security', icon: Shield, desc: 'Passwords, OAuth, 2FA & active sessions', badge: 'Protected' },
  { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Themes, accent colors & visual density', badge: null },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts, email digests & study reminders', badge: null },
  { id: 'ai', label: 'AI Preferences', icon: Cpu, desc: 'AI mentor persona & burnout warnings', badge: 'Smart' },
  { id: 'integrations', label: 'Integrations', icon: Link2, desc: 'GitHub, LeetCode, Codeforces & Calendar', badge: null },
  { id: 'privacy', label: 'Privacy', icon: Lock, desc: 'Visibility settings & data sharing', badge: null },
  { id: 'data', label: 'Data & Analytics', icon: Database, desc: 'Export, import & storage stats', badge: null },
  { id: 'performance', label: 'Performance', icon: Zap, desc: 'Cache management & live latency test', badge: '120 FPS' },
  { id: 'about', label: 'About PACE', icon: Info, desc: 'Version v1.4.2, release notes & feedback', badge: null },
];

// Shared Settings Cache to avoid duplicate network fetches
let cachedSettingsData: any = null;
let cachedConnectedAccounts: ConnectedAccount[] | null = null;

// ==========================================
// 1. MEMOIZED PROFILE CATEGORY
// ==========================================
const ProfileCategory = React.memo(function ProfileCategory({
  user,
  onProfileUpdated,
  onSave
}: {
  user: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onSave: (updates: any) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '💻');
  const [university, setUniversity] = useState(user.university || '');
  const [branch, setBranch] = useState(user.branch || '');
  const [year, setYear] = useState(user.year || '2026');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [language, setLanguage] = useState('English (US)');

  useEffect(() => {
    setDisplayName(user.displayName);
    setBio(user.bio || '');
    setAvatar(user.avatar || '💻');
    setUniversity(user.university || '');
    setBranch(user.branch || '');
    setYear(user.year || '2026');
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({ displayName, bio, avatar, university, branch, year });
      onProfileUpdated(updated);
      await onSave({ timezone, language });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" />
          Profile & Academic Identity
        </h2>
        <p className="text-xs text-slate-400">Configure public handle, avatar, bio, and academic institution.</p>
      </div>

      {/* Avatar Selector */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Choose Avatar Emoji</label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setAvatar(emoji);
                onSave({ avatar: emoji });
                onProfileUpdated({ ...user, avatar: emoji });
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                avatar === emoji 
                  ? 'bg-indigo-600 border-2 border-indigo-400 text-white scale-110 shadow-md' 
                  : 'bg-slate-900 border border-slate-800 hover:border-slate-700 hover:scale-105'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Username (Read-only)</label>
            <input 
              type="text" 
              disabled 
              value={`@${user.username}`}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => onSave({ displayName })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Bio / Status</label>
          <textarea 
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={() => onSave({ bio })}
            placeholder="Share your goals, stack, or current learning focus..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">University / College</label>
            <input 
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              onBlur={() => onSave({ university })}
              placeholder="e.g. Pace University"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Branch / Major</label>
            <input 
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              onBlur={() => onSave({ branch })}
              placeholder="e.g. Computer Science"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Graduation Year</label>
            <input 
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              onBlur={() => onSave({ year })}
              placeholder="e.g. 2026"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Timezone</label>
            <select 
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                onSave({ timezone: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Language</label>
            <select 
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                onSave({ language: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {LANGUAGE_OPTIONS.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Save Profile Details
          </button>
        </div>
      </form>
    </div>
  );
});

// ==========================================
// 2. MEMOIZED SECURITY CATEGORY
// ==========================================
const SecurityCategory = React.memo(function SecurityCategory({
  onSave
}: {
  onSave: (updates: any) => Promise<void>;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState('');
  const [securityErrorMsg, setSecurityErrorMsg] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.getActiveSessions()
      .then(res => {
        if (mounted && res.sessions) setActiveSessions(res.sessions);
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, []);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setSecurityErrorMsg('');
    setSecuritySuccessMsg('');

    if (newPassword.length < 6) {
      setSecurityErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityErrorMsg('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(newPassword);
      setSecuritySuccessMsg('Password updated successfully across all devices ✓');
      setNewPassword('');
      setConfirmPassword('');
      await onSave({ securityUpdateAt: new Date().toISOString() });
    } catch (err: any) {
      setSecurityErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Security & Authentication
        </h2>
        <p className="text-xs text-slate-400">Update password, manage 2FA, and inspect active sessions across all devices.</p>
      </div>

      <form onSubmit={handlePasswordChange} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Key className="w-4 h-4 text-indigo-400" /> Change Account Password
        </div>

        {securitySuccessMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {securitySuccessMsg}
          </div>
        )}

        {securityErrorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {securityErrorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">New Password</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pr-9 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="button" 
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Confirm New Password</label>
            <input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button 
            type="submit"
            disabled={isChangingPassword || !newPassword}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Update Password
          </button>
        </div>
      </form>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> Two-Factor Authentication (2FA)
          </div>
          <p className="text-[11px] text-slate-400">Protect account with TOTP authenticator app verification.</p>
        </div>

        <button
          onClick={() => {
            const nextVal = !twoFactorEnabled;
            setTwoFactorEnabled(nextVal);
            onSave({ securitySettings: { twoFactorEnabled: nextVal } });
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            twoFactorEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {twoFactorEnabled ? '2FA Enabled ✓' : 'Enable 2FA'}
        </button>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-indigo-400" /> Active Sessions ({activeSessions.length || 1})
        </div>

        {(activeSessions.length > 0 ? activeSessions : [
          { deviceType: 'Current Desktop Browser', ip: '127.0.0.1', isCurrent: true }
        ]).map((session, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-slate-200">{session.deviceType || 'Current Device'}</div>
                <div className="text-[10px] text-slate-500">{session.ip} • Active now</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
              This Device
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ==========================================
// 3. MEMOIZED APPEARANCE CATEGORY
// ==========================================
const AppearanceCategory = React.memo(function AppearanceCategory({
  initialTheme = 'dark',
  initialAccent = 'indigo',
  initialGlass = 60,
  initialCompact = false,
  initialAnimation = 'full',
  onSave
}: {
  initialTheme?: string;
  initialAccent?: string;
  initialGlass?: number;
  initialCompact?: boolean;
  initialAnimation?: string;
  onSave: (updates: any) => Promise<void>;
}) {
  const [themeMode, setThemeMode] = useState(initialTheme);
  const [accentColor, setAccentColor] = useState(initialAccent);
  const [glassIntensity, setGlassIntensity] = useState(initialGlass);
  const [compactMode, setCompactMode] = useState(initialCompact);
  const [animationIntensity, setAnimationIntensity] = useState(initialAnimation);

  // Synchronize document attributes instantly without re-rendering parent
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');

    root.setAttribute('data-accent', accentColor);

    const blurPx = Math.max(8, Math.round(glassIntensity / 2.5));
    const bgOpacity = (0.02 + (glassIntensity / 100) * 0.08).toFixed(2);
    root.style.setProperty('--glass-blur', `${blurPx}px`);
    root.style.setProperty('--color-glass-bg', `rgba(255, 255, 255, ${bgOpacity})`);

    if (compactMode) root.setAttribute('data-density', 'compact');
    else root.removeAttribute('data-density');

    if (animationIntensity === 'off') root.setAttribute('data-animation', 'off');
    else root.removeAttribute('data-animation');
  }, [themeMode, accentColor, glassIntensity, compactMode, animationIntensity]);

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          Appearance & Custom Theme
        </h2>
        <p className="text-xs text-slate-400">Recolor application, adjust glass blur intensity, and compact UI density.</p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Theme Mode</label>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { mode: 'dark', label: 'Dark Mode', icon: Moon },
            { mode: 'light', label: 'Light Mode', icon: Sun },
            { mode: 'system', label: 'System', icon: Monitor },
          ].map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setThemeMode(mode);
                onSave({ theme: mode });
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                themeMode === mode 
                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold shadow-md' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Accent Color Swatch</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { id: 'indigo', name: 'Indigo', colorClass: 'bg-indigo-500' },
            { id: 'cyan', name: 'Cyan', colorClass: 'bg-cyan-400' },
            { id: 'violet', name: 'Violet', colorClass: 'bg-violet-500' },
            { id: 'emerald', name: 'Emerald', colorClass: 'bg-emerald-500' },
            { id: 'amber', name: 'Amber', colorClass: 'bg-amber-500' },
            { id: 'rose', name: 'Rose', colorClass: 'bg-rose-500' },
          ].map(({ id, name, colorClass }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setAccentColor(id);
                onSave({ appearanceSettings: { accentColor: id, glassIntensity, compactMode, animationIntensity } });
              }}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                accentColor === id
                  ? 'bg-slate-900 border-white text-white font-bold scale-105 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full ${colorClass}`} />
                <span className="text-xs">{name}</span>
              </div>
              {accentColor === id && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Glass Blur Intensity</label>
            <span className="text-xs font-mono font-bold text-indigo-400">{glassIntensity}%</span>
          </div>
          <input 
            type="range"
            min="10"
            max="100"
            value={glassIntensity}
            onChange={(e) => {
              const val = Number(e.target.value);
              setGlassIntensity(val);
              onSave({ appearanceSettings: { accentColor, glassIntensity: val, compactMode, animationIntensity } });
            }}
            className="w-full accent-indigo-500 bg-slate-900 cursor-pointer h-1.5 rounded-lg"
          />
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Compact Density Mode</div>
            <div className="text-[10px] text-slate-400">Reduce padding and spacing app-wide.</div>
          </div>
          <button
            onClick={() => {
              const nextVal = !compactMode;
              setCompactMode(nextVal);
              onSave({ appearanceSettings: { accentColor, glassIntensity, compactMode: nextVal, animationIntensity } });
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${compactMode ? 'bg-indigo-600' : 'bg-slate-800'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${compactMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
});

// ==========================================
// 4. MEMOIZED INTEGRATIONS CATEGORY
// ==========================================
const IntegrationsCategory = React.memo(function IntegrationsCategory({
  onSave
}: {
  onSave: (updates: any) => Promise<void>;
}) {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(cachedConnectedAccounts || []);
  const [platformInputs, setPlatformInputs] = useState<Record<string, string>>({ github: '', leetcode: '', codeforces: '' });
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);
  const [syncStates, setSyncStates] = useState<Record<string, { status: string; error?: string }>>({});

  const loadAccounts = useCallback(async () => {
    try {
      const accts = await api.getConnectedAccounts();
      cachedConnectedAccounts = accts;
      setConnectedAccounts(accts);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, []);

  useEffect(() => {
    if (!cachedConnectedAccounts) loadAccounts();
  }, [loadAccounts]);

  const handleConnect = async (platform: string) => {
    const username = platformInputs[platform];
    if (!username || !username.trim()) return;
    setLinkingPlatform(platform);
    try {
      await api.connectAccount(platform as any, username);
      setPlatformInputs(prev => ({ ...prev, [platform]: '' }));
      await api.syncPlatform(platform);
      await loadAccounts();
      await onSave({ integrationSynced: platform });
    } catch (e: any) {
      setSyncStates(prev => ({ ...prev, [platform]: { status: 'failed', error: e.message } }));
    } finally {
      setLinkingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!window.confirm(`Disconnect ${platform}?`)) return;
    try {
      await api.disconnectAccount(platform);
      await loadAccounts();
      await onSave({ integrationDisconnected: platform });
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          External Coding Integrations
        </h2>
        <p className="text-xs text-slate-400">Connect GitHub, LeetCode, and Codeforces to sync streaks and submissions.</p>
      </div>

      {['github', 'leetcode', 'codeforces'].map((plat) => {
        const connected = connectedAccounts.find(a => a.platform === plat);
        return (
          <div key={plat} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 font-bold uppercase text-xs">
                {plat[0]}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 capitalize">{plat}</div>
                {connected ? (
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Linked as @{connected.username}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500">Not connected</div>
                )}
              </div>
            </div>

            {connected ? (
              <button
                onClick={() => handleDisconnect(plat)}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  placeholder={`Enter ${plat} username`}
                  value={platformInputs[plat] || ''}
                  onChange={(e) => setPlatformInputs({ ...platformInputs, [plat]: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                />
                <button
                  onClick={() => handleConnect(plat)}
                  disabled={linkingPlatform === plat}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                >
                  {linkingPlatform === plat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

// ==========================================
// 5. MEMOIZED TOGGLE CATEGORIES (Notifications, AI, Privacy)
// ==========================================
const NotificationsCategory = React.memo(function NotificationsCategory({ onSave }: { onSave: (u: any) => Promise<void> }) {
  const [friends, setFriends] = useState(true);
  const [battles, setBattles] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" /> Notifications & Alerts
        </h2>
        <p className="text-xs text-slate-400">Control notifications for friend requests, battle challenges, and daily streak reminders.</p>
      </div>

      {[
        { title: 'Friend Activity & Requests', state: friends, setState: setFriends, key: 'friends' },
        { title: 'Battle Challenges & Invites', state: battles, setState: setBattles, key: 'battles' },
        { title: 'Daily Study Reminders', state: reminders, setState: setReminders, key: 'reminders' },
        { title: 'Weekly Progress Email Digest', state: emailDigest, setState: setEmailDigest, key: 'emailDigest' },
      ].map(({ title, state, setState, key }) => (
        <div key={key} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">{title}</span>
          <button
            onClick={() => {
              const next = !state;
              setState(next);
              onSave({ notificationsExtended: { [key]: next } });
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${state ? 'bg-indigo-600' : 'bg-slate-800'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${state ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      ))}
    </div>
  );
});

const AICategory = React.memo(function AICategory({ onSave }: { onSave: (u: any) => Promise<void> }) {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [persona, setPersona] = useState<'mentor' | 'taskmaster' | 'technical'>('mentor');
  const [burnout, setBurnout] = useState(true);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" /> AI Coach & Mentor Preferences
        </h2>
        <p className="text-xs text-slate-400">Configure Paco AI mentor persona and adaptive study recommendations.</p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-200">Enable AI Mentor (Paco)</div>
          <div className="text-[10px] text-slate-400">Receive real-time study tips and automated reviews.</div>
        </div>
        <button
          onClick={() => {
            setAiEnabled(!aiEnabled);
            onSave({ aiPreferences: { enabled: !aiEnabled, persona, burnout } });
          }}
          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${aiEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
        <label className="text-xs font-bold text-slate-300 block">AI Coaching Persona</label>
        <div className="grid grid-cols-3 gap-2">
          {(['mentor', 'taskmaster', 'technical'] as const).map(p => (
            <button
              key={p}
              onClick={() => {
                setPersona(p);
                onSave({ aiPreferences: { enabled: aiEnabled, persona: p, burnout } });
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                persona === p ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const PrivacyCategory = React.memo(function PrivacyCategory({ onSave }: { onSave: (u: any) => Promise<void> }) {
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" /> Privacy & Visibility
        </h2>
        <p className="text-xs text-slate-400">Control who can view your profile, learning stats, and leaderboard ranks.</p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
        <label className="text-xs font-bold text-slate-300 block">Profile Visibility</label>
        <div className="grid grid-cols-3 gap-2">
          {(['public', 'friends', 'private'] as const).map(v => (
            <button
              key={v}
              onClick={() => {
                setVisibility(v);
                onSave({ privacySettings: { profileVisibility: v } });
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                visibility === v ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const DataCategory = React.memo(function DataCategory({ user }: { user: UserProfile }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const dataPayload = { user, exportDate: new Date().toISOString(), version: '1.4.2' };
      const blob = new Blob([JSON.stringify(dataPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PACE_Data_${user.username}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 400);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" /> Data & Export
        </h2>
        <p className="text-xs text-slate-400">Export your complete learning history and PACE data backup.</p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-200">Export Account Data (JSON)</div>
          <div className="text-[10px] text-slate-400">Download all your profile statistics, logs, and settings.</div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>Export JSON</span>
        </button>
      </div>
    </div>
  );
});

const PerformanceCategory = React.memo(function PerformanceCategory() {
  const [cacheSize, setCacheSize] = useState('18.4 MB');
  const [latency, setLatency] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  const testPing = async () => {
    setTesting(true);
    const start = performance.now();
    try {
      await api.getSystemStatus();
      setLatency(Math.round(performance.now() - start));
    } catch {
      setLatency(999);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Performance & Diagnostics
        </h2>
        <p className="text-xs text-slate-400">Inspect server latency and manage application cache.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Server Latency</div>
            <div className="text-[10px] text-slate-400">{latency ? `${latency} ms ping` : 'Not tested'}</div>
          </div>
          <button
            onClick={testPing}
            disabled={testing}
            className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-lg hover:bg-indigo-600/30 transition-all flex items-center gap-1"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            <span>Test Ping</span>
          </button>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Local Cache ({cacheSize})</div>
            <div className="text-[10px] text-slate-400">Clear temporary local state.</div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              setCacheSize('0.0 KB');
            }}
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-500/20 transition-all"
          >
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
});

const AboutCategory = React.memo(function AboutCategory() {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" /> About PACE Platform
        </h2>
        <p className="text-xs text-slate-400">Version 1.4.2 • High-Performance Cloud-Native Architecture.</p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="text-xs font-bold text-slate-200">PACE Cloud Engine v1.4.2</div>
        <p className="text-xs text-slate-400 leading-relaxed">
          PACE is built with Supabase cloud database synchronization, real-time WebSockets, and Gemini AI deep profile analytics.
        </p>
      </div>
    </div>
  );
});

// ==========================================
// MAIN SETTINGS VIEW CONTAINER
// ==========================================
export default function SettingsView({ user, activeSubTab, onSubTabChange, onLogout, onProfileUpdated }: SettingsViewProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const currentCategory = useMemo(() => {
    return CATEGORIES.some(c => c.id === activeSubTab) ? activeSubTab : 'profile';
  }, [activeSubTab]);

  const activeCategoryObj = useMemo(() => {
    return CATEGORIES.find(c => c.id === currentCategory) || CATEGORIES[0];
  }, [currentCategory]);

  const handleSave = useCallback(async (updates: any) => {
    setSaveStatus('saving');
    try {
      await api.updateSettings(updates);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-3 space-y-4 select-none font-sans">
      
      {/* HEADER BAR */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-base shadow-sm">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>Settings</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-indigo-400 font-bold">{activeCategoryObj.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-display font-black text-slate-100 tracking-tight">
                Control Center
              </h1>
            </div>
          </div>

          <button 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Save Indicator */}
        <div className="flex items-center gap-3 z-10">
          {saveStatus === 'saving' && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved ✓ {lastSavedTime && <span className="text-[10px] text-emerald-500/80">({lastSavedTime})</span>}</span>
            </div>
          )}
          {saveStatus === 'idle' && (
            <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Synced</span>
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD: FIXED SIDEBAR + INDEPENDENT CONTENT PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start relative">
        
        {/* SIDEBAR NAVIGATION */}
        <div className={`md:col-span-4 lg:col-span-3 space-y-2 md:sticky md:top-4 md:max-h-[calc(100vh-140px)] overflow-y-auto pr-1 ${isMobileSidebarOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 shadow-xl backdrop-blur-xl space-y-1">
            <div className="px-2.5 py-1 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
              Navigation
            </div>

            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = currentCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSubTabChange(cat.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold tracking-tight text-slate-100">
                        {cat.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[130px] font-normal">
                        {cat.desc}
                      </div>
                    </div>
                  </div>

                  {cat.badge && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">@{user.username}</div>
                <div className="text-[10px] text-slate-500">Active session</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* INDEPENDENT CONTENT PANEL */}
        <div className="md:col-span-8 lg:col-span-9 md:max-h-[calc(100vh-140px)] md:overflow-y-auto pr-1">
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-6">
            {currentCategory === 'profile' && <ProfileCategory user={user} onProfileUpdated={onProfileUpdated} onSave={handleSave} />}
            {currentCategory === 'security' && <SecurityCategory onSave={handleSave} />}
            {currentCategory === 'appearance' && <AppearanceCategory onSave={handleSave} />}
            {currentCategory === 'notifications' && <NotificationsCategory onSave={handleSave} />}
            {currentCategory === 'ai' && <AICategory onSave={handleSave} />}
            {currentCategory === 'integrations' && <IntegrationsCategory onSave={handleSave} />}
            {currentCategory === 'privacy' && <PrivacyCategory onSave={handleSave} />}
            {currentCategory === 'data' && <DataCategory user={user} />}
            {currentCategory === 'performance' && <PerformanceCategory />}
            {currentCategory === 'about' && <AboutCategory />}
          </div>
        </div>

      </div>
    </div>
  );
}
