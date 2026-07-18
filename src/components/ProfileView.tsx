/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile, LearningEvent, ConnectedAccount, Resource, Clan, ClanMember, Battle, Goal, Friend } from '../types';
import { 
  User, Flame, Calendar, BookOpen, Edit2, School, GraduationCap, 
  FileText, AlertCircle, Users, Award, Github, Code, Laptop, 
  Layers, ToggleLeft, ToggleRight, Sparkles, Activity, CheckCircle2,
  Swords, Target, Plus, Trash2, Loader2, Check, ExternalLink, Shield, Info, Trophy,
  RefreshCw, Settings, AlertTriangle, Clock
} from 'lucide-react';
import ActivityHeatmap from './ActivityHeatmap';
import AnimatedCounter from './AnimatedCounter';
import InteractiveGlass from './InteractiveGlass';
import PacoMascot from './PacoMascot';
import EditProfileModal from './EditProfileModal';
import ResourcesTab from './ResourcesTab';
import ClansTab from './ClansTab';
import BattlesTab from './BattlesTab';
import GoalsTab from './GoalsTab';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ProfileViewProps {
  user: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export default function ProfileView({ user, onProfileUpdated }: ProfileViewProps) {
  const [logs, setLogs] = useState<LearningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'resources' | 'clans' | 'battles' | 'goals'>('stats');

  // Connected platforms engine state
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountStats, setAccountStats] = useState<Record<string, any>>({});
  const [platformInputs, setPlatformInputs] = useState<Record<string, string>>({ github: '', leetcode: '', codeforces: '' });
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);
  const [syncStates, setSyncStates] = useState<Record<string, { status: 'idle' | 'syncing' | 'success' | 'failed'; error?: string }>>({});
  const [managingPlatform, setManagingPlatform] = useState<string | null>(null);

  const handleSyncPlatform = async (platform: string, username: string) => {
    setSyncStates(prev => ({
      ...prev,
      [platform]: { status: 'syncing' }
    }));
    try {
      console.log(`[Platform Sync] Running sync for ${platform} as ${username}`);
      const stats = await api.fetchPlatformStats(platform, username);
      setAccountStats(prev => ({ ...prev, [platform]: stats }));
      setSyncStates(prev => ({
        ...prev,
        [platform]: { status: 'success' }
      }));
      // Refresh list to sync DB fields like lastSyncedAt and status
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
    } catch (e: any) {
      console.error(`[Platform Sync Error] Sync failed for ${platform}:`, e);
      setSyncStates(prev => ({
        ...prev,
        [platform]: { status: 'failed', error: e.message || 'Failed to sync live data' }
      }));
      // Refresh list to update any DB fields
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
    }
  };

  const loadConnectedAccounts = async (forceSync = false) => {
    try {
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
      
      accts.forEach((acct) => {
        // Load cached stats immediately to avoid stuck states
        if (acct.stats) {
          setAccountStats(prev => ({ ...prev, [acct.platform]: acct.stats }));
        }

        // Set initial sync states from the DB record
        if (acct.status === 'failed') {
          setSyncStates(prev => ({
            ...prev,
            [acct.platform]: { status: 'failed', error: acct.syncError || 'Sync failed' }
          }));
        } else if (acct.status === 'active' && acct.stats) {
          setSyncStates(prev => ({
            ...prev,
            [acct.platform]: { status: 'success' }
          }));
        } else {
          setSyncStates(prev => ({
            ...prev,
            [acct.platform]: { status: 'idle' }
          }));
        }

        // If no stats are cached yet, or if forced, trigger sync
        if (!acct.stats || forceSync) {
          handleSyncPlatform(acct.platform, acct.username);
        }
      });
    } catch (e) {
      console.error('Error loading connected accounts:', e);
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
      
      // Perform immediate sync to load stats and verify username
      await handleSyncPlatform(platform, username);
    } catch (e: any) {
      console.error(`Error linking ${platform}:`, e);
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
        alert('Please allow popups for this site to connect your GitHub account.');
        setLinkingPlatform(null);
      }
    } catch (error: any) {
      console.error('GitHub OAuth initialization error:', error);
      alert(`Could not initiate GitHub connection: ${error.message}`);
      setLinkingPlatform(null);
    }
  };

  const handleDisconnectPlatform = async (platform: string) => {
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
    } catch (e) {
      console.error('Error disconnecting account:', e);
    }
  };

  useEffect(() => {
    loadConnectedAccounts();
  }, [user.username]);

  // Handle GitHub OAuth PostMessage events
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { platform, username } = event.data;
        console.log(`[GitHub OAuth Success] Linked GitHub account: ${username}`);
        setLinkingPlatform(null);
        // Reload all accounts and fetch fresh stats
        const accts = await api.getConnectedAccounts();
        setConnectedAccounts(accts);
        if (platform && username) {
          await handleSyncPlatform(platform, username);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        const { error } = event.data;
        console.error(`[GitHub OAuth Failure] ${error}`);
        alert(`GitHub OAuth authentication failed: ${error}`);
        setLinkingPlatform(null);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Platform toggles state
  const [platforms, setPlatforms] = useState(() => {
    const saved = localStorage.getItem('pace_connected_platforms');
    return saved ? JSON.parse(saved) : { github: true, leetcode: true, vscode: false };
  });

  const updatePlatforms = async (updated: typeof platforms) => {
    setPlatforms(updated);
    localStorage.setItem('pace_connected_platforms', JSON.stringify(updated));
    window.dispatchEvent(new Event('pace_platforms_updated'));
    try {
      await api.updateSettings({ connectedPlatforms: updated });
    } catch (e) {
      console.error('Failed to sync platforms to DB:', e);
    }
  };

  // Mascot configuration state sync
  const [pacoSettings, setPacoSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('paco_accessibility_settings');
      return saved ? JSON.parse(saved) : {
        disableAnimations: false,
        reduceMotion: false,
        hideMascot: false,
        completelyHidden: false,
      };
    } catch (e) {
      return {
        disableAnimations: false,
        reduceMotion: false,
        hideMascot: false,
        completelyHidden: false,
      };
    }
  });

  const updatePacoSettings = async (updated: any) => {
    const merged = { ...pacoSettings, ...updated };
    setPacoSettings(merged);
    localStorage.setItem('paco_accessibility_settings', JSON.stringify(merged));
    window.dispatchEvent(new Event('paco_settings_updated'));
    try {
      await api.updateSettings({ pacoSettings: merged });
    } catch (e) {
      console.error('Failed to sync mascot settings to DB:', e);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('paco_accessibility_settings');
        if (saved) setPacoSettings(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('paco_settings_updated', handleSync);
    return () => window.removeEventListener('paco_settings_updated', handleSync);
  }, []);

  // Fetch settings on mount to populate states from DB (Single Source of Truth)
  useEffect(() => {
    async function loadDbSettings() {
      try {
        const settings = await api.getSettings();
        if (settings.connectedPlatforms) {
          setPlatforms(settings.connectedPlatforms);
          localStorage.setItem('pace_connected_platforms', JSON.stringify(settings.connectedPlatforms));
          window.dispatchEvent(new Event('pace_platforms_updated'));
        }
        if (settings.pacoSettings) {
          setPacoSettings(settings.pacoSettings);
          localStorage.setItem('paco_accessibility_settings', JSON.stringify(settings.pacoSettings));
          window.dispatchEvent(new Event('paco_settings_updated'));
        }
      } catch (e) {
        console.error('Failed to fetch settings from DB:', e);
      }
    }
    loadDbSettings();
  }, []);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const data = await api.getMyLogs();
        setLogs(data);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [user.username]);

  const handleSaveProfile = async (updatedData: any) => {
    const updated = await api.updateProfile(updatedData);
    onProfileUpdated(updated);
  };

  const formatFullDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Some date';
    }
  };

  // Smart Level and Score calculations from server-side PACE Points
  const paceScore = useMemo(() => {
    return user.points || 0;
  }, [user.points]);

  const levelInfo = useMemo(() => {
    const level = user.level || Math.floor(paceScore / 500) + 1;
    const progressToNext = (paceScore % 500) / 500 * 100;
    const ptsRemaining = 500 - (paceScore % 500);
    return { level, progressToNext, ptsRemaining };
  }, [paceScore, user.level]);

  // Parse logs for real Recharts Analytics
  const analyticsData = useMemo(() => {
    // 1. Weekly activity trend (last 7 days)
    const dailyCounts: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayKey = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyCounts[dayKey] = 0;
    }

    logs.forEach(log => {
      const logDate = new Date(log.createdAt);
      const diffMs = today.getTime() - logDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dayKey = logDate.toLocaleDateString('en-US', { weekday: 'short' });
        if (dayKey in dailyCounts) {
          dailyCounts[dayKey] += 1;
        }
      }
    });

    const weeklyTrend = Object.entries(dailyCounts).map(([day, count]) => ({
      day,
      logs: count,
      points: count * 150
    }));

    // 2. Study fields classification based on keyword matching
    let coding = 0;
    let dbms = 0;
    let systems = 0;
    let dev = 0;
    let others = 0;

    logs.forEach(l => {
      const text = l.content.toLowerCase();
      if (text.includes('leetcode') || text.includes('code') || text.includes('solve') || text.includes('problem') || text.includes('algorithm') || text.includes('rust') || text.includes('cpp')) {
        coding += 1;
      } else if (text.includes('dbms') || text.includes('sql') || text.includes('database') || text.includes('normalization') || text.includes('query')) {
        dbms += 1;
      } else if (text.includes('operating') || text.includes('system') || text.includes('os') || text.includes('process') || text.includes('memory') || text.includes('scheduling')) {
        systems += 1;
      } else if (text.includes('api') || text.includes('backend') || text.includes('express') || text.includes('react') || text.includes('frontend') || text.includes('server')) {
        dev += 1;
      } else {
        others += 1;
      }
    });

    // Handle initial state if no logs exist
    if (logs.length === 0) {
      coding = 1;
      dbms = 1;
      systems = 1;
      dev = 1;
      others = 1;
    }

    const fieldDistribution = [
      { name: 'Algorithms & Coding', value: coding, color: '#22d3ee' },
      { name: 'Database Systems', value: dbms, color: '#6366f1' },
      { name: 'Operating Systems', value: systems, color: '#a78bfa' },
      { name: 'Web Dev & APIs', value: dev, color: '#ec4899' },
      { name: 'General Studies', value: others, color: '#64748b' }
    ].filter(item => item.value > 0);

    // 3. Monthly progress (6 months)
    const monthlyData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]}`;
      let count = 0;
      
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate.getFullYear() === d.getFullYear() && logDate.getMonth() === d.getMonth()) {
          count += 1;
        }
      });
      monthlyData.push({ month: label, count });
    }

    return { weeklyTrend, fieldDistribution, monthlyData };
  }, [logs]);

  // Determine achievement locking state dynamically based on real statistics
  const achievementsList = useMemo(() => {
    return [
      {
        id: 'streak_3',
        title: 'Consistency Spark',
        desc: 'Reach a learning streak of 3 days.',
        icon: Flame,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        unlocked: user.streak >= 3
      },
      {
        id: 'logs_10',
        title: 'Habitual Ledger',
        desc: 'Document at least 10 learning blocks.',
        icon: FileText,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        unlocked: user.totalLogs >= 10
      },
      {
        id: 'friends_3',
        title: 'Co-Learning Catalyst',
        desc: 'Connect with 3 or more study companions.',
        icon: Users,
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        unlocked: (user.friendsCount || 0) >= 3
      },
      {
        id: 'exceptional_1',
        title: 'Deep Focus Pioneer',
        desc: 'Level up your profile beyond Level 2.',
        icon: Award,
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        unlocked: levelInfo.level > 2
      },
    ];
  }, [user.streak, user.totalLogs, user.friendsCount, levelInfo.level]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-32 font-sans select-none z-10 relative">
      
      {/* Premium Profile Banner Card */}
      <div className="h-44 md:h-52 rounded-[36px] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden mb-8 border border-white/10 shadow-xl flex items-end p-6 md:p-8">
        {/* Slow moving ambient glow */}
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-radial-gradient from-transparent to-black/40" />
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/15 rounded-full blur-[80px]" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Level & Rankings indicator in top right */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 flex flex-col md:flex-row items-end md:items-center gap-2">
          {user.globalRank && (
            <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-300 font-bold font-mono">GLOBAL #{user.globalRank}</span>
            </div>
          )}
          {user.institutionRank && (
            <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] text-slate-300 font-bold font-mono">CAMPUS #{user.institutionRank}</span>
            </div>
          )}
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 px-4.5 py-1.5 rounded-2xl flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">LEVEL {levelInfo.level}</span>
          </div>
        </div>
      </div>

      {/* Main Profile Info Section (Bento style layouts) */}
      <div className="relative -mt-24 px-6 md:px-10 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          <div className="w-28 h-28 rounded-full bg-slate-900/90 flex items-center justify-center text-6xl border-3 border-white/15 shadow-2xl relative shadow-indigo-500/10">
            {user.avatar}
            <div className="absolute -bottom-1.5 -right-1 w-6.5 h-6.5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-lg">
              {levelInfo.level}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100 tracking-tight">{user.displayName}</h1>
              {user.university && (
                <span className="px-2.5 py-0.5 bg-cyan-500/15 border border-cyan-400/25 text-cyan-300 text-[9px] font-bold rounded-full uppercase tracking-widest">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">@{user.username}</p>
            {user.university && (
              <p className="text-xs text-slate-300 font-medium flex items-center justify-center md:justify-start gap-1.5 mt-3">
                <School className="w-4 h-4 text-indigo-400" />
                <span>{user.university}</span>
                {user.branch && <span className="text-slate-600">•</span>}
                {user.branch && <span className="text-slate-400">{user.branch} ({user.year || 'Student'})</span>}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-100 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer self-center md:self-end"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Profile Bio */}
      {user.bio && (
        <div className="px-6 md:px-10 mb-8">
          <h4 className="font-bold text-xs text-slate-500 uppercase tracking-[0.2em] mb-2">About me</h4>
          <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-2xl font-medium">{user.bio}</p>
        </div>
      )}

      {/* Bento Grid: Statistics, Gamified Level, Connected Platforms, Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left Column: Quick Profile Metrics & Platforms */}
        <div className="space-y-6">
          
          {/* Gamified Level & PACE Points Card */}
          <InteractiveGlass className="p-6 rounded-[28px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Gamified Rank</span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-400/10 px-2.5 py-0.5 rounded-md border border-cyan-400/20">
                Lvl {levelInfo.level}
              </span>
            </div>
            
            <div className="my-2">
              <span className="text-3xl font-display font-semibold text-slate-100">{paceScore.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 ml-1.5 font-bold uppercase tracking-wider">PACE points</span>
            </div>

            {/* Premium Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <span>LVL {levelInfo.level}</span>
                <span>{levelInfo.ptsRemaining} XP to LVL {levelInfo.level + 1}</span>
              </div>
              <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progressToNext}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                />
              </div>
            </div>
          </InteractiveGlass>

          {/* Social Companion Tracker */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <Flame className="w-4.5 h-4.5 text-orange-400 mx-auto mb-1.5" />
              <div className="text-lg font-semibold text-slate-100 font-display">{user.streak}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">Streak</div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <FileText className="w-4.5 h-4.5 text-indigo-400 mx-auto mb-1.5" />
              <div className="text-lg font-semibold text-slate-100 font-display">{user.totalLogs}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">Logs</div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <Users className="w-4.5 h-4.5 text-cyan-400 mx-auto mb-1.5" />
              <div className="text-lg font-semibold text-slate-100 font-display">{user.friendsCount || 0}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">Companions</div>
            </div>
          </div>

          {/* Connected Platforms Widget */}
          <div className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-400 animate-pulse" />
                Connected Platforms
              </h4>
              <button 
                onClick={() => loadConnectedAccounts(true)} 
                title="Sync All Accounts"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {([
                { id: 'github', label: 'GitHub Code Sync', icon: <Github className="w-4 h-4 text-slate-300" />, placeholder: 'GitHub Username' },
                { id: 'leetcode', label: 'LeetCode Pulse', icon: <Code className="w-4 h-4 text-amber-500" />, placeholder: 'LeetCode Username' },
                { id: 'codeforces', label: 'Codeforces Rank', icon: <Layers className="w-4 h-4 text-red-400" />, placeholder: 'Codeforces Handle' }
              ] as const).map((plat) => {
                const conn = connectedAccounts.find(a => a.platform === plat.id);
                const stats = accountStats[plat.id];
                const isSubmitting = linkingPlatform === plat.id;
                
                // Determine consolidated status
                const activeSyncState = syncStates[plat.id];
                const isSyncing = activeSyncState?.status === 'syncing' || isSubmitting;
                const isFailed = activeSyncState?.status === 'failed' || conn?.status === 'failed';
                const errorMsg = activeSyncState?.error || conn?.syncError;
                
                return (
                  <div key={plat.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {plat.icon}
                        <span className="text-[11px] font-bold text-slate-200">{plat.label}</span>
                      </div>
                      
                      {/* Connection status badges */}
                      <div className="flex items-center gap-2">
                        {isSyncing ? (
                          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            🟡 Syncing
                          </span>
                        ) : isFailed ? (
                          <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            🔴 Failed
                          </span>
                        ) : conn ? (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            🟢 Connected
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Unlinked</span>
                        )}
                      </div>
                    </div>

                    {conn ? (
                      <div className="space-y-2">
                        {/* Connected User details and actions */}
                        <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-xl border border-white/5">
                          <div className="text-xs text-indigo-400 font-semibold font-mono">
                            @{conn.username}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSyncPlatform(plat.id, conn.username)}
                              disabled={isSyncing}
                              title="Sync Now"
                              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => setManagingPlatform(managingPlatform === plat.id ? null : plat.id)}
                              title="Manage Account"
                              className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDisconnectPlatform(plat.id)}
                              title="Disconnect Account"
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Last Synced details */}
                        {conn.lastSyncedAt && (
                          <div className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>⏰ Last Synced: {new Date(conn.lastSyncedAt).toLocaleString()}</span>
                          </div>
                        )}

                        {/* Manage section expanded */}
                        {managingPlatform === plat.id && (
                          <div className="p-3 bg-slate-900/40 rounded-xl border border-indigo-500/20 space-y-2">
                            <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">⚙️ Update Username</div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={plat.placeholder}
                                value={platformInputs[plat.id] || ''}
                                onChange={(e) => setPlatformInputs(prev => ({ ...prev, [plat.id]: e.target.value }))}
                                className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg py-1 px-2.5 text-[10px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400"
                              />
                              <button
                                onClick={() => handleConnectPlatform(plat.id, platformInputs[plat.id])}
                                className="px-2 py-1 bg-indigo-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider rounded hover:bg-indigo-400 transition-all cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Error Reason block */}
                        {isFailed && errorMsg && (
                          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[9px] text-rose-300 flex items-start gap-1.5 leading-relaxed font-mono">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Sync Error:</span> {errorMsg}
                            </div>
                          </div>
                        )}

                        {/* Metrics readouts */}
                        {stats ? (
                          <div className="space-y-2">
                            {/* GitHub Metrics */}
                            {plat.id === 'github' && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1.5">
                                    <div className="text-xs font-bold text-slate-200">{stats.publicRepos ?? stats.public_repos ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-extrabold uppercase tracking-wider">Repos</div>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1.5">
                                    <div className="text-xs font-bold text-slate-200">{stats.followers ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-extrabold uppercase tracking-wider">Followers</div>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1.5">
                                    <div className="text-xs font-bold text-slate-200">{stats.stars ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-extrabold uppercase tracking-wider">Stars</div>
                                  </div>
                                </div>
                                
                                {stats.languages && stats.languages.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {stats.languages.map((l: any, idx: number) => (
                                      <span key={idx} className="text-[8px] font-mono font-bold bg-white/5 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded-md">
                                        {l.lang} ({l.count})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* LeetCode Metrics */}
                            {plat.id === 'leetcode' && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1">
                                    <div className="text-[11px] font-bold text-slate-200">{stats.totalSolved ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wide">Solved</div>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1">
                                    <div className="text-[11px] font-bold text-emerald-400">{stats.easySolved ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wide">Easy</div>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1">
                                    <div className="text-[11px] font-bold text-amber-400">{stats.mediumSolved ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wide">Med</div>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1">
                                    <div className="text-[11px] font-bold text-rose-400">{stats.hardSolved ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wide">Hard</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-slate-400">
                                  <div className="bg-white/[0.01] border border-white/5 p-1 rounded-md flex justify-between px-2">
                                    <span className="text-slate-500 uppercase tracking-wider text-[7px] font-bold self-center">Ranking</span>
                                    <span className="font-bold text-slate-300">#{stats.ranking ? stats.ranking.toLocaleString() : 'N/A'}</span>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 p-1 rounded-md flex justify-between px-2">
                                    <span className="text-slate-500 uppercase tracking-wider text-[7px] font-bold self-center">Rating</span>
                                    <span className="font-bold text-indigo-400">{stats.contestRating ?? 'Unrated'}</span>
                                  </div>
                                </div>

                                {/* LeetCode Recent Activity list */}
                                {stats.recentActivity && stats.recentActivity.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1">
                                    <div className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-1">
                                      <Activity className="w-2.5 h-2.5 text-cyan-400" />
                                      Recent LeetCode Submissions
                                    </div>
                                    <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
                                      {stats.recentActivity.map((act: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-[8px] font-mono text-slate-500 bg-white/[0.01] px-2 py-0.5 rounded border border-white/[0.02]">
                                          <span className="truncate max-w-[130px] text-slate-300 font-medium">{act.title}</span>
                                          <span className={`text-[7px] font-bold uppercase ${act.status === 'Accepted' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {act.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Codeforces Metrics */}
                            {plat.id === 'codeforces' && (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-2 gap-2 text-center">
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1.5">
                                    <div className="text-xs font-bold text-slate-200">{stats.rating || 'Unrated'}</div>
                                    <div className="text-[7px] text-slate-500 font-extrabold uppercase tracking-wider">Rating</div>
                                  </div>
                                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-1.5">
                                    <div className="text-xs font-bold text-slate-200">{stats.problemsSolved ?? 0}</div>
                                    <div className="text-[7px] text-slate-500 font-extrabold uppercase tracking-wider">Solved</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 text-[8px] font-mono text-slate-500 font-bold uppercase">
                                  <div className="bg-white/[0.01] p-1 rounded-md flex justify-between px-2">
                                    <span>Rank:</span>
                                    <span className="text-indigo-400">{stats.rank ?? 'unranked'}</span>
                                  </div>
                                  <div className="bg-white/[0.01] p-1 rounded-md flex justify-between px-2">
                                    <span>Max Rank:</span>
                                    <span className="text-slate-300">{stats.maxRank ?? 'unranked'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-600 mt-1 italic flex items-center gap-1.5">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-400" />
                            Fetching real metrics...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {plat.id === 'github' ? (
                          // OAuth Link Button for GitHub
                          <button
                            disabled={isSubmitting}
                            onClick={handleConnectGitHubOAuth}
                            className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Github className="w-3.5 h-3.5" />
                                Connect via GitHub OAuth
                              </>
                            )}
                          </button>
                        ) : (
                          // Standard Username inputs for LeetCode / Codeforces
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={plat.placeholder}
                              value={platformInputs[plat.id] || ''}
                              onChange={(e) => setPlatformInputs(prev => ({ ...prev, [plat.id]: e.target.value }))}
                              className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl py-1 px-2.5 text-[10px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400"
                            />
                            <button
                              disabled={isSubmitting}
                              onClick={() => handleConnectPlatform(plat.id, platformInputs[plat.id])}
                              className="px-2.5 py-1 bg-indigo-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-lg hover:bg-indigo-400 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {isSubmitting ? '...' : 'Link'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paco Profile Companion Card */}
          <motion.div 
            whileHover={{ y: -3, borderColor: "rgba(255,255,255,0.15)" }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
          >
            <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 self-start">Paco Your Partner</h4>
            
            {pacoSettings.completelyHidden ? (
              <div className="py-4 px-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-xs text-slate-400 w-full">
                <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2 animate-pulse" />
                <p className="font-bold text-red-200">Paco Companion Hidden</p>
                <p className="text-[10px] mt-1.5 leading-relaxed text-slate-500">You have completely hidden the companion. Re-enable to get study assistance and streak reminders.</p>
                <button
                  onClick={() => updatePacoSettings({ completelyHidden: false })}
                  className="mt-4 px-4.5 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  Bring Paco Back
                </button>
              </div>
            ) : (
              <>
                <PacoMascot 
                  mode={activeTab === 'achievements' ? 'celebration' : 'guidance'} 
                  context={activeTab === 'stats' ? 'analytics' : 'settings'}
                  forceProfile={user}
                  className="my-2"
                />
                
                {/* Embedded control suite */}
                <div className="w-full border-t border-white/5 pt-3.5 mt-3 space-y-2 text-left text-xs text-slate-400">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Companion Preferences</div>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="group-hover:text-slate-300 transition-colors">Disable Animations</span>
                    <input
                      type="checkbox"
                      checked={pacoSettings.disableAnimations}
                      onChange={(e) => updatePacoSettings({ disableAnimations: e.target.checked })}
                      className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="group-hover:text-slate-300 transition-colors">Reduce Motion</span>
                    <input
                      type="checkbox"
                      checked={pacoSettings.reduceMotion}
                      onChange={(e) => updatePacoSettings({ reduceMotion: e.target.checked })}
                      className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="group-hover:text-slate-300 transition-colors">Hide Fox Illustration</span>
                    <input
                      type="checkbox"
                      checked={pacoSettings.hideMascot}
                      onChange={(e) => updatePacoSettings({ hideMascot: e.target.checked })}
                      className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group text-red-400/80 hover:text-red-400">
                    <span>Hide Assistant Completely</span>
                    <input
                      type="checkbox"
                      checked={pacoSettings.completelyHidden}
                      onChange={(e) => updatePacoSettings({ completelyHidden: e.target.checked })}
                      className="rounded border-red-500/20 bg-slate-900 text-red-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    />
                  </label>
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Right Columns: Interactive Tabs - Analytics Charts & Achievement Badges */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* Glass Navigation Segment selector */}
          <div className="flex flex-wrap gap-1 bg-slate-950/40 border border-white/10 rounded-3xl p-1 self-start relative z-10 w-full md:w-auto">
            {[
              { id: 'stats', label: 'Analytics' },
              { id: 'achievements', label: 'Honor' },
              { id: 'resources', label: 'Resources' },
              { id: 'clans', label: 'Clans' },
              { id: 'battles', label: 'Battles' },
              { id: 'goals', label: 'Goals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex-1 md:flex-initial text-center ${
                  activeTab === tab.id 
                    ? 'text-slate-100 bg-indigo-500/15 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'stats' ? (
              <motion.div
                key="stats-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                
                {/* Recharts Area Chart: Weekly progress pulse */}
                <div className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 flex flex-col justify-between h-[230px] shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      Weekly Progress Trend
                    </span>
                    <span className="text-[9px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">PAST 7 DAYS</span>
                  </div>

                  <div className="w-full h-36 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.weeklyTrend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            fontSize: '10px',
                            color: '#e2e8f0'
                          }} 
                        />
                        <Area type="monotone" dataKey="logs" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrend)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recharts Bar Chart: Monthly effort tracking */}
                <div className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 flex flex-col justify-between h-[230px] shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      Monthly Study Volume
                    </span>
                    <span className="text-[9px] font-bold font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">PAST 6 MONTHS</span>
                  </div>

                  <div className="w-full h-36 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.monthlyData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                        <XAxis dataKey="month" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            fontSize: '10px',
                            color: '#e2e8f0'
                          }} 
                        />
                        <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} animationDuration={1000}>
                          {analyticsData.monthlyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 5 ? '#22d3ee' : '#1e1b4b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart: Study distribution breakdown */}
                <div className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 flex flex-col md:flex-row items-center gap-6 md:col-span-2 shadow-lg relative overflow-hidden h-auto">
                  <div className="flex-1 space-y-3 select-none text-center md:text-left">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-1.5 justify-center md:justify-start">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Learning Domain Breakdown
                    </span>
                    <h4 className="text-base font-display font-semibold text-slate-100">Study Logs Distribution</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                      Categorized based on terms parsed in your logging descriptions. Lock more logs to refine categorizations.
                    </p>
                  </div>

                  <div className="w-32 h-32 shrink-0 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.fieldDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={1000}
                        >
                          {analyticsData.fieldDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">PACE</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto text-[10px] font-bold uppercase tracking-wider font-mono">
                    {analyticsData.fieldDistribution.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-400 truncate">{entry.name}</span>
                        <span className="text-slate-500 ml-auto font-semibold font-mono">({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="achievements-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {achievementsList.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className={`p-5 rounded-3xl border transition-all duration-300 flex items-start gap-4 ${
                        badge.unlocked 
                          ? 'bg-slate-900/60 border-indigo-500/20 shadow-lg shadow-indigo-500/5 hover:border-indigo-500/35'
                          : 'bg-white/[0.01] border-white/5 opacity-50 select-none'
                      }`}
                    >
                      <div className={`p-3.5 rounded-2xl shrink-0 ${
                        badge.unlocked 
                          ? badge.color 
                          : 'bg-slate-950 text-slate-600 border border-white/5'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold tracking-tight ${badge.unlocked ? 'text-slate-100' : 'text-slate-500'}`}>
                            {badge.title}
                          </h4>
                          {badge.unlocked && (
                            <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">Unlocked</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">
                          {badge.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'resources' && (
              <motion.div
                key="resources-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <ResourcesTab />
              </motion.div>
            )}

            {activeTab === 'clans' && (
              <motion.div
                key="clans-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <ClansTab />
              </motion.div>
            )}

            {activeTab === 'battles' && (
              <motion.div
                key="battles-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <BattlesTab />
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div
                key="goals-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <GoalsTab />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* Activity Heatmap Panel */}
      <ActivityHeatmap logs={logs} isPrivate={user.isPrivate} />

      {/* Edit Profile Modal Dialog */}
      <EditProfileModal
        user={user}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={handleSaveProfile}
      />

      {/* User's Recent Activity Log Stream */}
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="font-display font-semibold text-sm text-slate-300 uppercase tracking-[0.15em] flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Your Activity History
          </h3>
          <span className="text-xs text-slate-500 font-bold">{logs.length} entries</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-3xl animate-pulse flex flex-col gap-2">
                <div className="h-3 bg-white/5 rounded w-1/4" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-10 rounded-[32px] text-center flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">Your ledger is blank</h4>
            <p className="text-xs text-slate-500 mt-2 max-w-sm font-medium">
              Log your very first learning block to start recording your historical learning progress!
            </p>
          </div>
        ) : (
          <motion.div 
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.04
                }
              }
            }}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {logs.slice(0, 8).map((log) => (
              <motion.div
                key={log.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { 
                      type: "tween", 
                      ease: "easeOut",
                      duration: 0.22
                    } 
                  }
                }}
                className="bg-white/5 border border-white/5 p-5 rounded-[24px] transition-all duration-200 hover:translate-x-1.5 hover:bg-white/[0.08] hover:border-white/15 will-change-transform"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] uppercase font-sans">
                    STUDY BLOCK
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold font-sans">
                    {formatFullDate(log.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium">
                  {log.content}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Small X SVG Helper component
function X(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
