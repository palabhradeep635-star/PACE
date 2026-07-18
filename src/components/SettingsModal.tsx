/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Link2, Shield, Bell, Palette, Cpu, Lock, LogOut, 
  Sparkles, AlertCircle, CheckCircle2, Loader2, Info, Check, 
  Trash2, ShieldAlert, Key, Globe, Volume2, Moon, Sun, Monitor, RefreshCw, Github,
  ExternalLink, Mail, Award, MessageSquare, Terminal, Heart, Calendar, Database, Activity, Code2,
  Bug, Lightbulb, Linkedin, Twitter
} from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile, ConnectedAccount } from '../types';

interface SettingsModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

const avatarOptions = ['💻', '🚀', '📚', '🤖', '👾', '🎨', '⚡', '☕', '🧬', '🧠', '🎯', '🏆'];

export default function SettingsModal({ user, isOpen, onClose, onLogout, onProfileUpdated }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'accounts' | 'privacy' | 'notifications' | 'appearance' | 'integrations' | 'security' | 'about'>('profile');
  const devEmail = user.username && user.username.includes('@') ? user.username : 'palabhradeep635@gmail.com';

  // Profile Form States
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '💻');
  const [university, setUniversity] = useState(user.university || '');
  const [branch, setBranch] = useState(user.branch || '');
  const [year, setYear] = useState(user.year || '');
  const [isPrivate, setIsPrivate] = useState(user.isPrivate || false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Connected Accounts States
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountStats, setAccountStats] = useState<Record<string, any>>({});
  const [platformInputs, setPlatformInputs] = useState<Record<string, string>>({ github: '', leetcode: '', codeforces: '' });
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);
  const [syncStates, setSyncStates] = useState<Record<string, { status: 'idle' | 'syncing' | 'success' | 'failed'; error?: string; lastSync?: string }>>({});
  const [managingPlatform, setManagingPlatform] = useState<string | null>(null);

  // Privacy States
  const [shareLeaderboard, setShareLeaderboard] = useState(true);
  const [showSubmissions, setShowSubmissions] = useState(true);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  // Notifications States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [goalAlerts, setGoalAlerts] = useState(true);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // Appearance States
  const [accentColor, setAccentColor] = useState<'indigo' | 'emerald' | 'rose' | 'amber'>('indigo');
  const [themeMode, setThemeMode] = useState<'dark' | 'glass' | 'high-contrast'>('dark');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Integrations States
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('pace_live_kt_9a2b8e3f71c40d6e8a');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [integrationSuccess, setIntegrationSuccess] = useState(false);

  // Security States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // System Status States
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState<boolean>(false);

  const loadSystemStatus = async () => {
    try {
      setSystemStatusLoading(true);
      const res = await api.getSystemStatus();
      setSystemStatus(res);
    } catch (err) {
      console.error('Failed to load system status:', err);
    } finally {
      setSystemStatusLoading(false);
    }
  };

  // About Page Animated Ticker States
  const [focusScore, setFocusScore] = useState(0);
  const [milestoneCount, setMilestoneCount] = useState(0);
  const [engineChamberTemp, setEngineChamberTemp] = useState(0);

  useEffect(() => {
    if (activeTab === 'about') {
      setFocusScore(0);
      setMilestoneCount(0);
      setEngineChamberTemp(0);
      
      const t1 = setTimeout(() => {
        let fValue = 0;
        let mValue = 0;
        let eValue = 0;
        
        const interval = setInterval(() => {
          let done = true;
          if (fValue < 100) { fValue += 4; setFocusScore(Math.min(fValue, 100)); done = false; }
          if (mValue < 8) { mValue += 1; setMilestoneCount(Math.min(mValue, 8)); done = false; }
          if (eValue < 98) { eValue += 3; setEngineChamberTemp(Math.min(eValue, 98)); done = false; }
          if (done) clearInterval(interval);
        }, 30);
        return () => clearInterval(interval);
      }, 150);
    }
  }, [activeTab]);

  // Load accounts and user options on mount
  useEffect(() => {
    if (isOpen) {
      loadConnectedAccounts();
      loadSystemStatus();
    }
  }, [isOpen, user.username]);

  // Handle GitHub OAuth PostMessage events
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { platform, username } = event.data;
        console.log(`[Settings SettingsModal] Linked GitHub: ${username}`);
        setLinkingPlatform(null);
        const accts = await api.getConnectedAccounts();
        setConnectedAccounts(accts);
        if (platform && username) {
          await handleSyncPlatform(platform, username);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        const { error } = event.data;
        console.error(`[Settings SettingsModal] OAuth error: ${error}`);
        setLinkingPlatform(null);
        setSyncStates(prev => ({
          ...prev,
          github: { status: 'failed', error: error || 'OAuth login failed' }
        }));
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const loadConnectedAccounts = async (forceSync = false) => {
    try {
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
      
      accts.forEach((acct) => {
        if (acct.stats) {
          setAccountStats(prev => ({ ...prev, [acct.platform]: acct.stats }));
        }

        const dateStr = acct.lastSyncedAt ? new Date(acct.lastSyncedAt).toLocaleTimeString() : undefined;

        if (acct.status === 'failed') {
          setSyncStates(prev => ({
            ...prev,
            [acct.platform]: { status: 'failed', error: acct.syncError || 'Sync failed', lastSync: dateStr }
          }));
        } else if (acct.status === 'active' && acct.stats) {
          setSyncStates(prev => ({
            ...prev,
            [acct.platform]: { status: 'success', lastSync: dateStr }
          }));
        } else {
          setSyncStates(prev => ({
            ...prev,
            [acct.platform]: { status: 'idle', lastSync: dateStr }
          }));
        }

        if (!acct.stats || forceSync) {
          handleSyncPlatform(acct.platform, acct.username);
        }
      });
    } catch (e) {
      console.error('Error loading connected accounts in settings:', e);
    }
  };

  const handleSyncPlatform = async (platform: string, username: string) => {
    setSyncStates(prev => ({
      ...prev,
      [platform]: { status: 'syncing' }
    }));

    // Setup absolute 15 second timeout to prevent indefinite hangs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sync operations timed out after 15 seconds. Please try again later.')), 15000);
    });

    try {
      console.log(`[Settings Sync] Executing sync for ${platform}`);
      const syncPromise = api.fetchPlatformStats(platform, username);
      const stats = await Promise.race([syncPromise, timeoutPromise]) as any;

      setAccountStats(prev => ({ ...prev, [platform]: stats }));
      
      const nowStr = new Date().toLocaleTimeString();
      setSyncStates(prev => ({
        ...prev,
        [platform]: { status: 'success', lastSync: nowStr }
      }));
      
      // Reload db records to get latest synced times
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
    } catch (e: any) {
      console.error(`[Settings Sync Error] Failed:`, e);
      setSyncStates(prev => ({
        ...prev,
        [platform]: { status: 'failed', error: e.message || 'Verification or fetch operation timed out' }
      }));
    }
  };

  const handleConnectPlatform = async (platform: 'github' | 'leetcode' | 'codeforces', username: string) => {
    if (!username.trim()) return;
    try {
      setLinkingPlatform(platform);
      setSyncStates(prev => ({ ...prev, [platform]: { status: 'syncing' } }));
      
      await api.connectAccount(platform, username);
      setPlatformInputs(prev => ({ ...prev, [platform]: '' }));
      setManagingPlatform(null);
      
      await handleSyncPlatform(platform, username);
    } catch (e: any) {
      console.error(`Error connecting ${platform}:`, e);
      setSyncStates(prev => ({ ...prev, [platform]: { status: 'failed', error: e.message } }));
    } finally {
      setLinkingPlatform(null);
    }
  };

  const handleConnectGitHubOAuth = async () => {
    try {
      setLinkingPlatform('github');
      // @ts-ignore
      const url = await api.getGitHubAuthUrl();
      
      const authWindow = window.open(
        url,
        'github_oauth_popup',
        'width=600,height=750'
      );

      if (!authWindow) {
        alert('Please allow popups to connect your GitHub account via secure OAuth protocol.');
        setLinkingPlatform(null);
      }
    } catch (error: any) {
      console.error('GitHub OAuth settings trigger error:', error);
      alert(`Could not trigger GitHub OAuth sequence: ${error.message}`);
      setLinkingPlatform(null);
    }
  };

  const handleDisconnectPlatform = async (platform: string) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${platform} integration?`)) return;
    try {
      await api.disconnectAccount(platform);
      setAccountStats(prev => {
        const copy = { ...prev };
        delete copy[platform];
        return copy;
      });
      setSyncStates(prev => {
        const copy = { ...prev };
        delete copy[platform];
        return copy;
      });
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
    } catch (e: any) {
      alert(`Disconnect failed: ${e.message}`);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileError('Display name is required');
      return;
    }
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      const updated = await api.updateProfile({
        displayName,
        bio,
        avatar,
        university,
        branch,
        year,
        isPrivate,
      });
      onProfileUpdated(updated);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile values.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSavePrivacy = () => {
    setPrivacySuccess(true);
    setTimeout(() => setPrivacySuccess(false), 2500);
  };

  const handleSaveNotif = () => {
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2500);
  };

  const handleSaveIntegration = () => {
    setIntegrationSuccess(true);
    setTimeout(() => setIntegrationSuccess(false), 2500);
  };

  const handleUpdatePassword = (e: FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess(false);

    if (!currentPassword) {
      setSecurityError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match');
      return;
    }

    setSecuritySuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSecuritySuccess(false), 3000);
  };

  const handleDeleteAccount = () => {
    alert('Security verification: Please contact the system administrator to completely purge your account ledger.');
    setShowDeleteConfirm(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
          {/* Subtle glowing ambient orb */}
          <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: 20, filter: 'blur(12px)' }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-full max-w-4xl h-[85vh] max-h-[700px] bg-slate-950/90 border border-white/10 rounded-[32px] overflow-hidden relative shadow-[0_30px_80px_rgba(0,0,0,0.85)] flex flex-col md:flex-row"
          >
            {/* Top Gloss Border Highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* LEFT PANEL: Navigation */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between p-6 bg-white/[0.01]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>User Settings</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Manage preferences & sync logs</p>
                </div>

                <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 custom-scrollbar scrollbar-none">
                  {[
                    { id: 'profile', label: 'My Profile', icon: User },
                    { id: 'accounts', label: 'Linked Accounts', icon: Link2 },
                    { id: 'privacy', label: 'Privacy', icon: Shield },
                    { id: 'notifications', label: 'Notifications', icon: Bell },
                    { id: 'appearance', label: 'Appearance', icon: Palette },
                    { id: 'integrations', label: 'Integrations', icon: Cpu },
                    { id: 'security', label: 'Security & Auth', icon: Lock },
                    { id: 'about', label: 'About PACE & Dev', icon: Info }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-3 transition-all shrink-0 cursor-pointer ${
                          isActive 
                            ? 'bg-white/10 text-white border border-white/10 shadow-[0_4px_12px_rgba(255,255,255,0.02)]' 
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.02]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Red Sign Out action button inside sidebar as final option */}
              <div className="hidden md:block pt-4 border-t border-white/5">
                <button
                  onClick={onLogout}
                  className="w-full px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* RIGHT PANEL: Settings Content */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">Settings</span>
                  <span className="text-xs text-slate-600">/</span>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">{activeTab}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Viewport */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
                
                {/* 1. PROFILE SETTINGS */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {profileError && (
                      <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}
                    {profileSuccess && (
                      <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Profile attributes saved successfully.</span>
                      </div>
                    )}

                    {/* Choose Avatar Emoji */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Select Emoji Identity</label>
                      <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                        {avatarOptions.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setAvatar(emoji)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg cursor-pointer transition-all ${
                              avatar === emoji
                                ? 'bg-indigo-500 border border-white/20 shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-110'
                                : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:scale-105'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-sans"
                        />
                      </div>

                      {/* University */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">University</label>
                        <input
                          type="text"
                          value={university}
                          onChange={(e) => setUniversity(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-sans"
                        />
                      </div>

                      {/* Branch */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Branch / Major</label>
                        <input
                          type="text"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-sans"
                        />
                      </div>

                      {/* Year */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Graduation Year</label>
                        <input
                          type="text"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Bio Description</label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-sans resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_20px_rgba(99,102,241,0.25)] transition-all"
                    >
                      {profileLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save Profile Details</span>
                    </button>
                  </form>
                )}

                {/* 2. CONNECTED ACCOUNTS */}
                {activeTab === 'accounts' && (
                  <div className="space-y-5">
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl text-xs text-slate-400 flex items-start gap-3">
                      <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-200">Synchronized Integrations:</strong> Connect your developer accounts to import real learning activities automatically. Synchronizations enforce automated safety guidelines.
                      </div>
                    </div>

                    {/* Platforms lists */}
                    {['github', 'leetcode', 'codeforces'].map((platform) => {
                      const account = connectedAccounts.find(a => a.platform === platform);
                      const state = syncStates[platform] || { status: 'idle' };
                      const isLinked = !!account;

                      return (
                        <div key={platform} className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {platform === 'github' ? (
                                <div className="p-3 bg-white/5 rounded-2xl text-white">
                                  <Github className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 font-extrabold font-mono text-sm leading-none flex items-center justify-center w-11 h-11 border border-amber-500/10">
                                  {platform.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">{platform} Connection</h4>
                                {isLinked ? (
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                                    <Check className="w-3 h-3" />
                                    <span>Connected as <strong className="underline text-slate-300">{account.username}</strong></span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-medium">No account connected yet.</span>
                                )}
                              </div>
                            </div>

                            {/* Actions bar */}
                            <div className="flex items-center gap-2">
                              {isLinked ? (
                                <>
                                  {/* Sync Now */}
                                  <button
                                    onClick={() => handleSyncPlatform(platform, account.username)}
                                    disabled={state.status === 'syncing'}
                                    className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 text-indigo-400 text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${state.status === 'syncing' ? 'animate-spin' : ''}`} />
                                    <span>Sync Now</span>
                                  </button>

                                  {/* Disconnect */}
                                  <button
                                    onClick={() => handleDisconnectPlatform(platform)}
                                    className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/10 cursor-pointer"
                                    title="Disconnect Account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setManagingPlatform(managingPlatform === platform ? null : platform)}
                                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  {managingPlatform === platform ? 'Cancel' : 'Link Account'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expansion options for linking/saving account */}
                          {managingPlatform === platform && !isLinked && (
                            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                              {platform === 'github' ? (
                                <div className="space-y-3">
                                  <p className="text-[11px] text-slate-400">OAuth verification creates verified study events from repositories and DSA commits automatically.</p>
                                  <button
                                    onClick={handleConnectGitHubOAuth}
                                    disabled={linkingPlatform === 'github'}
                                    className="w-full py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-200 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.1)]"
                                  >
                                    {linkingPlatform === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                                    <span>Authenticate via GitHub OAuth</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder={`Enter your ${platform} username`}
                                    value={platformInputs[platform] || ''}
                                    onChange={(e) => setPlatformInputs(prev => ({ ...prev, [platform]: e.target.value }))}
                                    className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                                  />
                                  <button
                                    onClick={() => handleConnectPlatform(platform as any, platformInputs[platform])}
                                    disabled={linkingPlatform === platform}
                                    className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition-all text-[10px] uppercase font-bold text-white shrink-0 cursor-pointer"
                                  >
                                    {linkingPlatform === platform ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Connect'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sync details status outputs */}
                          {state.status === 'syncing' && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                              <span>Importing real platform events and checking commit patterns... (max 15s)</span>
                            </div>
                          )}

                          {state.status === 'failed' && (
                            <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] text-rose-400 flex items-start gap-2">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <div>
                                <strong>Platform Error:</strong> {state.error}
                              </div>
                            </div>
                          )}

                          {isLinked && state.status === 'success' && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[10px]">
                              <span className="text-slate-500 font-bold">
                                LAST SYNCED: <span className="text-slate-300">{state.lastSync || 'Never'}</span>
                              </span>
                              
                              {/* Display specific stats for verification transparency */}
                              {platform === 'github' && accountStats.github && (
                                <span className="text-emerald-400 font-bold">
                                  Repos: {accountStats.github.public_repos || 0} • Followers: {accountStats.github.followers || 0}
                                </span>
                              )}
                              {platform === 'leetcode' && accountStats.leetcode && (
                                <span className="text-amber-400 font-bold">
                                  Solved: {accountStats.leetcode.totalSolved || 0} • Easy: {accountStats.leetcode.easySolved || 0} • Med: {accountStats.leetcode.mediumSolved || 0}
                                </span>
                              )}
                              {platform === 'codeforces' && accountStats.codeforces && (
                                <span className="text-indigo-400 font-bold">
                                  Contests: {accountStats.codeforces.contestsCount || 0} • Max Rating: {accountStats.codeforces.maxRating || 0}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. PRIVACY */}
                {activeTab === 'privacy' && (
                  <div className="space-y-4">
                    {privacySuccess && (
                      <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl font-medium">
                        Privacy configurations saved successfully.
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Private Toggle */}
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1 pr-4">
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Private Profile Mode</h4>
                          <p className="text-[10px] text-slate-500">Hide your active study hours, metrics, and logs from the general classmates directory.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isPrivate} 
                          onChange={(e) => setIsPrivate(e.target.checked)}
                          className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Leaderboard Toggle */}
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1 pr-4">
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Share Leaderboard Rankings</h4>
                          <p className="text-[10px] text-slate-500">Allow other classmates to view your total cumulative PACE points and achievements.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={shareLeaderboard} 
                          onChange={(e) => setShareLeaderboard(e.target.checked)}
                          className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Submissions Visibility */}
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1 pr-4">
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Verify Submissions Log Details</h4>
                          <p className="text-[10px] text-slate-500">Include source commit URLs and solved problems details in global public peer-reviews.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={showSubmissions} 
                          onChange={(e) => setShowSubmissions(e.target.checked)}
                          className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSavePrivacy}
                      className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Save Privacy Changes
                    </button>
                  </div>
                )}

                {/* 4. NOTIFICATIONS */}
                {activeTab === 'notifications' && (
                  <div className="space-y-4">
                    {notifSuccess && (
                      <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl font-medium">
                        Notification alert systems updated.
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Sound */}
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Sound Effects Enabled</h4>
                          <p className="text-[10px] text-slate-500">Play chime alerts upon earning PACE points or completing daily study goals.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={soundEnabled} 
                          onChange={(e) => setSoundEnabled(e.target.checked)}
                          className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Email Digests */}
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Email Progress Digests</h4>
                          <p className="text-[10px] text-slate-500">Receive weekly summaries regarding completed tasks and active research tracks.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={emailDigest} 
                          onChange={(e) => setEmailDigest(e.target.checked)}
                          className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      {/* Streak Expiration Alerts */}
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Streak Expiration Warnings</h4>
                          <p className="text-[10px] text-slate-500">Receive alerts if your daily study loop is within 3 hours of expiring.</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={streakAlerts} 
                          onChange={(e) => setStreakAlerts(e.target.checked)}
                          className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveNotif}
                      className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Save Notifications
                    </button>
                  </div>
                )}

                {/* 5. APPEARANCE */}
                {activeTab === 'appearance' && (
                  <div className="space-y-5">
                    {/* Visual Accents */}
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Active Theme Color Accent</h4>
                      <p className="text-[10px] text-slate-500">Select the secondary coloring highlights used across your workspaces.</p>
                      
                      <div className="flex gap-3">
                        {[
                          { id: 'indigo', name: 'Cyber-Indigo', class: 'bg-indigo-500' },
                          { id: 'emerald', name: 'Emerald Oasis', class: 'bg-emerald-500' },
                          { id: 'rose', name: 'Crimson Dawn', class: 'bg-rose-500' },
                          { id: 'amber', name: 'Sunburst Amber', class: 'bg-amber-500' }
                        ].map(color => (
                          <button
                            key={color.id}
                            onClick={() => setAccentColor(color.id as any)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
                              accentColor === color.id 
                                ? 'border-white/30 bg-white/10 text-white font-bold' 
                                : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full ${color.class}`} />
                            <span>{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Transparency */}
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Interface Display Type</h4>
                      <div className="flex gap-2">
                        {[
                          { id: 'dark', name: 'Pure Dark', desc: 'True pitch black base borders' },
                          { id: 'glass', name: 'Frosted Glass', desc: 'Translucent background blurring' },
                          { id: 'high-contrast', name: 'Monochrome', desc: 'Aggressive borders, zero blurring' }
                        ].map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => setThemeMode(mode.id as any)}
                            className={`flex-1 p-3.5 rounded-2xl text-left border cursor-pointer transition-all ${
                              themeMode === mode.id
                                ? 'border-white/20 bg-white/5 text-white shadow-[0_4px_16px_rgba(255,255,255,0.02)]'
                                : 'border-white/5 bg-white/[0.01] text-slate-400 hover:border-white/10'
                            }`}
                          >
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-200">{mode.name}</div>
                            <div className="text-[9px] text-slate-500 mt-0.5">{mode.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. INTEGRATIONS */}
                {activeTab === 'integrations' && (
                  <div className="space-y-4">
                    {integrationSuccess && (
                      <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl font-medium">
                        Integrations webhook synced successfully.
                      </div>
                    )}

                    {/* Webhook API */}
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Custom Integration Webhook</h4>
                      <p className="text-[10px] text-slate-500">Provide an HTTPS URL to trigger background updates whenever your metrics sync or streak increment.</p>
                      <input
                        type="url"
                        placeholder="https://api.yourdomain.com/v1/study-webhooks"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                      />
                    </div>

                    {/* Personal API Key */}
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-3">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Personal Developer API Token</h4>
                      <p className="text-[10px] text-slate-500">Use this secret authentication token to push direct learning events from custom IDE integrations.</p>
                      
                      <div className="flex gap-2">
                        <input
                          type={apiKeyVisible ? 'text' : 'password'}
                          readOnly
                          value={apiKey}
                          className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl px-4 text-xs font-mono text-slate-400 select-all"
                        />
                        <button
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          className="px-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {apiKeyVisible ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveIntegration}
                      className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Save Webhook Options
                    </button>
                  </div>
                )}

                {/* 7. SECURITY & AUTH */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    
                    {/* Password Update form */}
                    <form onSubmit={handleUpdatePassword} className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">Modify Authentication Password</h4>
                      
                      {securityError && (
                        <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl font-medium">
                          {securityError}
                        </div>
                      )}
                      {securitySuccess && (
                        <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl font-medium">
                          Password updated and secured successfully.
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Current Password</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Confirm New Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-2.5 px-4 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05]"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Update Password
                      </button>
                    </form>

                    {/* Permanent Delete Section */}
                    <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[24px] space-y-3">
                      <div className="flex items-center gap-2 text-rose-400">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <h4 className="text-xs uppercase font-extrabold tracking-wider">Danger Zone</h4>
                      </div>
                      <p className="text-[10px] text-slate-500">Permanently delete your profile ledger, active streak trackers, and linked accounts. This action is irreversible.</p>
                      
                      {showDeleteConfirm ? (
                        <div className="p-4 bg-slate-950 border border-rose-500/20 rounded-2xl space-y-3">
                          <p className="text-[11px] text-slate-300 font-bold">Are you absolutely sure? This will purge all your earned learning credits.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteAccount}
                              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Yes, Delete Ledger
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 text-rose-400 text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer"
                        >
                          Delete Account Permanent Ledger
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 8. ABOUT DEVELOPER & PLATFORM */}
                {activeTab === 'about' && (
                  <div className="space-y-8 relative pb-10">
                    
                    {/* Background floating micro-particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1.5 h-1.5 bg-indigo-500/20 rounded-full"
                          style={{
                            top: `${15 + i * 11}%`,
                            left: `${10 + (i * 17) % 80}%`,
                          }}
                          animate={{
                            y: [0, -15, 0],
                            x: [0, 10, 0],
                            opacity: [0.15, 0.45, 0.15],
                          }}
                          transition={{
                            duration: 4 + (i % 3) * 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>

                    {/* DUAL COHORT CONTAINER (Developer Identity & Dynamic Focus) */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10"
                    >
                      {/* Left Block: Premium Identity Card */}
                      <div className="md:col-span-2 bg-gradient-to-br from-slate-950/80 via-slate-900/40 to-indigo-950/20 border border-white/5 backdrop-blur-xl p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-2xl group">
                        {/* Interactive light glow back-cover */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-500" />
                        
                        <div className="space-y-5">
                          <div className="flex items-start gap-4">
                            {/* Glow bordered Avatar container */}
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-2xl blur-md opacity-30 group-hover:opacity-55 animate-pulse transition-opacity" />
                              <div className="relative w-16 h-16 bg-slate-900 border-2 border-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-lg cursor-default select-none transform group-hover:scale-105 transition-transform duration-300">
                                {avatar || '💻'}
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-black uppercase tracking-wider text-white">
                                  {displayName || user.username || "Lead Developer"}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 text-[8px] font-black uppercase tracking-widest leading-none">
                                  Verified Class Dev
                                </span>
                              </div>
                              <p className="text-xs text-indigo-400 font-extrabold uppercase tracking-widest mt-0.5">
                                {branch ? `${branch} Undergraduate` : "PACE System Architect"}
                              </p>
                              {university && (
                                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                                  <Globe className="w-3 h-3 text-slate-500" />
                                  <span>{university}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="h-[1px] bg-white/5" />

                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Philosophy & Mission</span>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                              "{bio || "Building high-performance pipelines, gamifying active academic tracks, and index-matching verified commits under a streamlined performance engine."}"
                            </p>
                          </div>
                        </div>

                        {/* Interactive dynamic developer focus tags based on real connected accounts */}
                        <div className="mt-5 space-y-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Active Developer Focus Tracks</span>
                          <div className="flex flex-wrap gap-1.5">
                            {/* Always include a custom baseline focus */}
                            <span className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/5 text-slate-300 text-[10px] font-bold flex items-center gap-1">
                              <Terminal className="w-3 h-3 text-indigo-400" />
                              <span>System Architecture</span>
                            </span>
                            
                            {/* If they have GitHub connected, highlight Open Source / Full-Stack */}
                            {connectedAccounts.some(a => a.platform === 'github') && (
                              <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center gap-1">
                                <Github className="w-3 h-3 text-indigo-400" />
                                <span>Full-Stack Development</span>
                              </span>
                            )}

                            {/* If they have leetcode or codeforces connected, highlight Competitive Programming / DSA */}
                            {(connectedAccounts.some(a => a.platform === 'leetcode' || a.platform === 'codeforces')) && (
                              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                <Code2 className="w-3 h-3 text-amber-400" />
                                <span>Algorithms & DSA</span>
                              </span>
                            )}

                            {/* Always highlight AI/ML integrations for using PACE Gemini engines */}
                            <span className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span>AI/ML Logic Integration</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Dynamic Tickers (Counters) */}
                      <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-2xl">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Core Compilation</span>
                            </h4>
                            <p className="text-[9px] text-slate-500">Live operational tickers</p>
                          </div>

                          <div className="space-y-4 pt-1">
                            {/* Counter 1: Dev Focus Score */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-slate-400">Developer Focus Score</span>
                                <span className="text-cyan-400 font-mono font-black">{focusScore}%</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${focusScore}%` }} />
                              </div>
                            </div>

                            {/* Counter 2: Milestones Synced */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-slate-400">Milestones Planned</span>
                                <span className="text-purple-400 font-mono font-black">{milestoneCount} / 8</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${(milestoneCount / 8) * 100}%` }} />
                              </div>
                            </div>

                            {/* Counter 3: Core Chamber Heat */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-slate-400">Chamber Sync Latency</span>
                                <span className="text-emerald-400 font-mono font-black">{100 - engineChamberTemp}ms</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${engineChamberTemp}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive dynamic developer social triggers */}
                        <div className="border-t border-white/5 pt-4">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Connect with Developer</span>
                          <div className="grid grid-cols-6 gap-2">
                            {/* Portfolio */}
                            <motion.a
                              whileHover={{ y: -3, scale: 1.05, backgroundColor: "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.2)" }}
                              whileTap={{ scale: 0.95 }}
                              href="https://portfolio.example.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center border border-white/5 shadow-inner"
                              title="Portfolio"
                            >
                              <Award className="w-4 h-4 text-indigo-400" />
                            </motion.a>

                            {/* GitHub Profile */}
                            <motion.a
                              whileHover={{ y: -3, scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
                              whileTap={{ scale: 0.95 }}
                              href={connectedAccounts.find(a => a.platform === 'github') ? `https://github.com/${connectedAccounts.find(a => a.platform === 'github')!.username}` : "https://github.com"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center border border-white/5 shadow-inner"
                              title="GitHub Profile"
                            >
                              <Github className="w-4 h-4 text-slate-200" />
                            </motion.a>

                            {/* LinkedIn Link */}
                            <motion.a
                              whileHover={{ y: -3, scale: 1.05, backgroundColor: "rgba(14,118,168,0.12)", borderColor: "rgba(14,118,168,0.2)" }}
                              whileTap={{ scale: 0.95 }}
                              href="https://linkedin.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center border border-white/5 shadow-inner"
                              title="LinkedIn Profile"
                            >
                              <Linkedin className="w-4 h-4 text-sky-400" />
                            </motion.a>

                            {/* X (Twitter) */}
                            <motion.a
                              whileHover={{ y: -3, scale: 1.05, backgroundColor: "rgba(29,161,242,0.12)", borderColor: "rgba(29,161,242,0.2)" }}
                              whileTap={{ scale: 0.95 }}
                              href="https://x.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center border border-white/5 shadow-inner"
                              title="X (Twitter)"
                            >
                              <Twitter className="w-4 h-4 text-blue-400" />
                            </motion.a>

                            {/* Direct Email Link */}
                            <motion.a
                              whileHover={{ y: -3, scale: 1.05, backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.2)" }}
                              whileTap={{ scale: 0.95 }}
                              href={`mailto:${devEmail}?subject=Feedback regarding PACE Platform`}
                              className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center border border-white/5 shadow-inner"
                              title="Contact Email"
                            >
                              <Mail className="w-4 h-4 text-rose-400" />
                            </motion.a>

                            {/* Developer Website */}
                            <motion.a
                              whileHover={{ y: -3, scale: 1.05, backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.2)" }}
                              whileTap={{ scale: 0.95 }}
                              href="https://github.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-white/5 text-slate-300 hover:text-white transition-colors duration-200 flex items-center justify-center border border-white/5 shadow-inner"
                              title="Developer Website"
                            >
                              <Globe className="w-4 h-4 text-emerald-400" />
                            </motion.a>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ABOUT PACE & ROADMAP CONTAINER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      {/* About PACE Description */}
                      <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/[0.02] border border-white/5 backdrop-blur-xl p-6 rounded-3xl space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-cyan-400" />
                            <span>About the PACE Platform</span>
                          </h4>
                          <div className="space-y-3 font-medium text-slate-300 text-xs leading-relaxed">
                            <p>
                              {systemStatus?.about?.whyCreated || "PACE (Platform of Automated Collaborative Education) was built to bridge the gap between classroom studying, competitive programming, and open-source contributions. By providing real-time integrations, gamified learning mechanics, and rigorous AI verification, we turn theoretical study hours into bulletproof, real-world developer capability."}
                            </p>
                            <p className="border-l-2 border-indigo-500/40 pl-3 italic text-slate-400">
                              <strong>Vision:</strong> {systemStatus?.about?.vision || "Empower developers worldwide to showcase and track their continuous, authentic path of educational mastery through an elegant, low-friction visual canvas."}
                            </p>
                            <p className="border-l-2 border-cyan-500/40 pl-3 italic text-slate-400">
                              <strong>Mission:</strong> {systemStatus?.about?.mission || "Accelerate technological education and peer collaboration by indexing, validating, and harmonizing elite engineering platforms into a single unified performance engine."}
                            </p>
                          </div>
                        </div>

                        {/* Technology Stack Grid */}
                        <div className="pt-4 border-t border-white/5 space-y-3">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Operational Technology Stack</span>
                          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {(systemStatus?.technologyStack || [
                              { name: "React", color: "from-cyan-400 to-blue-500" },
                              { name: "TypeScript", color: "from-blue-500 to-indigo-600" },
                              { name: "Supabase", color: "from-emerald-400 to-teal-600" },
                              { name: "PostgreSQL", color: "from-blue-600 to-sky-700" },
                              { name: "Node.js", color: "from-emerald-500 to-green-600" },
                              { name: "Framer Motion", color: "from-pink-500 to-rose-600" },
                              { name: "Tailwind CSS", color: "from-cyan-400 to-teal-500" },
                              { name: "GitHub API", color: "from-slate-100 to-slate-400" },
                              { name: "LeetCode integration", color: "from-amber-400 to-orange-500" },
                              { name: "Codeforces API", color: "from-red-400 to-rose-500" },
                              { name: "Gemini AI", color: "from-indigo-400 via-purple-500 to-pink-500" }
                            ]).map((tech: any) => (
                              <motion.span
                                key={tech.name}
                                whileHover={{ scale: 1.05 }}
                                className="px-2.5 py-1 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-[10px] font-bold text-slate-300 flex items-center gap-1.5 cursor-default transition-colors"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${tech.color || 'from-indigo-400 to-cyan-400'}`} />
                                <span>{tech.name}</span>
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      {/* Long term roadmap */}
                      <motion.div
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/[0.02] border border-white/5 backdrop-blur-xl p-6 rounded-3xl space-y-4"
                      >
                        <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span>Long-Term Platform Roadmap</span>
                        </h4>
                        
                        <div className="space-y-4 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                          {(systemStatus?.roadmap || [
                            { title: "Multiplayer Study Rooms", status: "In Development", desc: "Real-time focus arenas with integrated pomodoro sync and group multipliers.", date: "Q3 2026" },
                            { title: "AI Coach & Adaptive Scoring", status: "Planning", desc: "Automated targets based on connected LeetCode performance areas.", date: "Q4 2026" },
                            { title: "Mobile App Companion", status: "Planning", desc: "Native iOS & Android logs sync with streak push alerts.", date: "Q1 2027" },
                            { title: "Browser Extension Integrated Tracking", status: "Researching", desc: "Capture real study hours spent on developer documentation tabs.", date: "Q2 2027" },
                            { title: "Smart Scheduling Engine", status: "Researching", desc: "Optimize target study sessions around individual peak productivity hours.", date: "Q3 2027" },
                            { title: "Clan Wars & Academic Tournaments", status: "Planning", desc: "Sprint events pitting classroom rosters against competitor schools.", date: "Q4 2027" },
                            { title: "Achievement Badge System", status: "In Development", desc: "Earn rare badges for DSA runs, open source commits, and late night loops.", date: "Q3 2026" },
                            { title: "University Administration Dashboards", status: "Researching", desc: "Allow educators to easily monitor classroom coding engagement.", date: "Q1 2027" }
                          ]).map((item: any, idx: number) => {
                            let statusColor = "bg-indigo-400/10 text-indigo-400 border-indigo-400/20";
                            if (item.status === "In Development") statusColor = "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
                            else if (item.status === "Researching") statusColor = "bg-amber-400/10 text-amber-300 border-amber-400/20";

                            return (
                              <div key={item.title} className="flex gap-3 relative group">
                                {idx < (systemStatus?.roadmap?.length || 8) - 1 && (
                                  <div className="absolute top-5 left-2 w-[1px] h-[calc(100%+12px)] bg-white/5 group-hover:bg-indigo-500/20 transition-colors" />
                                )}
                                
                                <div className="w-4 h-4 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 mt-1 relative z-10 group-hover:border-indigo-500/50 transition-colors">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:bg-cyan-400 transition-colors" />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h5 className="text-[11px] font-black uppercase text-slate-100">{item.title}</h5>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${statusColor}`}>
                                      {item.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block pt-0.5">{item.date}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    </div>

                    {/* DIAGNOSTICS & SYSTEM CONFIGURATION */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.02] border border-white/5 backdrop-blur-xl p-6 rounded-3xl space-y-4 relative z-10"
                    >
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        <span>Core Sandbox Diagnostics & Telemetry</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        {/* Status Grid */}
                        <div className="space-y-2 bg-slate-950/40 p-4 rounded-2xl border border-white/[0.02] flex flex-col justify-between">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">System Core Parameters</span>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">PACE Core Version</span>
                              <span className="font-mono font-black text-indigo-300">{systemStatus?.version || "1.4.2"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Active Build Number</span>
                              <span className="font-mono font-black text-slate-300">{systemStatus?.buildNumber || "B2026.0717.842"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Last Production Update</span>
                              <span className="font-mono font-bold text-slate-400">
                                {systemStatus?.lastUpdate ? new Date(systemStatus.lastUpdate).toLocaleDateString() : "July 17, 2026"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">System Channel</span>
                              <span className="font-bold text-cyan-400 uppercase text-[9px] tracking-wider">{systemStatus?.releaseChannel || "Alpha Build - Developer Sandbox"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Micro Service Status lights */}
                        <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-white/[0.02]">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Local Server Health Ledger</span>
                          
                          <div className="space-y-3">
                            {/* API service status */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">REST API Routing Status</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">ONLINE</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                              </div>
                            </div>

                            {/* Database service status */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">PostgreSQL Core Database</span>
                              <div className="flex items-center gap-2">
                                {systemStatus?.services?.database === "online" ? (
                                  <>
                                    <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">ONLINE</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono text-[10px] font-bold text-amber-400 uppercase" title="Seamless fallback operates correctly">FALLBACK LOCAL JSON</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Supabase service status */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Supabase Integration API</span>
                              <div className="flex items-center gap-2">
                                {systemStatus?.services?.supabase === "online" ? (
                                  <>
                                    <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">CONNECTED</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">UNCONFIGURED</span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* OPEN-SOURCE ACKNOWLEDGEMENT CREDITS */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.01] border border-white/5 backdrop-blur-xl p-6 rounded-3xl space-y-4 relative z-10"
                    >
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                        <span>Platform Credits & Acknowledgements</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Open-Source Engines</span>
                          <div className="flex flex-wrap gap-1">
                            {(systemStatus?.credits?.libraries || ["React 18", "Express", "Vite", "Framer Motion", "Recharts", "D3", "Lucide React", "Pg-Pool"]).map((lib: string) => (
                              <span key={lib} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/5 text-[9px] text-slate-400 font-mono">
                                {lib}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Development Cohort</span>
                          <p className="text-[11px] text-slate-300 font-medium font-mono">
                            {systemStatus?.credits?.contributors?.join(" • ") || "Plabhradeep (Lead Developer) • Gemini AI Sandbox Companion"}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Special Thanks & Guidance</span>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            {systemStatus?.credits?.thanks?.join(", ") || "Google DeepMind, Vite, Tailwind Labs, and the competitive programming community at large."}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* FEEDBACK & ACTIONS DECK */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10 font-sans">
                      {/* Report a Bug */}
                      <a
                        href={`mailto:${devEmail}?subject=[PACE BUG REPORT] Description of Issue&body=Hi Developer,%0D%0A%0D%0AI discovered an issue with PACE version ${systemStatus?.version || '1.4.2'}.%0D%0A%0D%0AContext:%0D%0A-%20User:%20${user.username}%0D%0A-%20Step%20to%20reproduce:%20`}
                        className="p-4 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 transition-all flex flex-col justify-between h-28 group cursor-pointer"
                      >
                        <Bug className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-rose-300">Report a Bug</div>
                          <div className="text-[9px] text-slate-500 font-medium">Log software glitches & failures</div>
                        </div>
                      </a>

                      {/* Request a Feature */}
                      <a
                        href={`mailto:${devEmail}?subject=[PACE FEATURE REQUEST] Pitching a New Concept&body=Hi Developer,%0D%0A%0D%0AI would love to request the following feature in a future update:%0D%0A%0D%0A-%20Feature%20Goal:%20%0D%0A-%20Why%20it%20adds%20value:%20`}
                        className="p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 text-emerald-400 transition-all flex flex-col justify-between h-28 group cursor-pointer"
                      >
                        <Lightbulb className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300">Request Feature</div>
                          <div className="text-[9px] text-slate-500 font-medium">Pitch a novel concept to the dev</div>
                        </div>
                      </a>

                      {/* Contact Developer */}
                      <a
                        href={`mailto:${devEmail}?subject=[PACE INQUIRY] General Collaboration`}
                        className="p-4 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/20 text-indigo-400 transition-all flex flex-col justify-between h-28 group cursor-pointer"
                      >
                        <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-indigo-300">Contact Dev</div>
                          <div className="text-[9px] text-slate-500 font-medium">Collaborate or ask questions</div>
                        </div>
                      </a>

                      {/* GitHub Issues */}
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer"
                        className="p-4 rounded-2xl bg-slate-100/5 hover:bg-slate-100/10 border border-slate-100/10 hover:border-slate-100/20 text-slate-300 transition-all flex flex-col justify-between h-28 group cursor-pointer"
                      >
                        <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-100">GitHub Issues</div>
                          <div className="text-[9px] text-slate-500 font-medium">Browse community reports</div>
                        </div>
                      </a>
                    </div>

                  </div>
                )}

              </div>

              {/* Mobile Bottom Sign Out Panel */}
              <div className="p-4 border-t border-white/5 bg-slate-950/60 md:hidden">
                <button
                  onClick={onLogout}
                  className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
