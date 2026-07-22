/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile, LearningEvent, ConnectedAccount } from '../types';
import { 
  User, Flame, Calendar, BookOpen, Edit2, School, GraduationCap, 
  FileText, AlertCircle, Users, Award, Github, Code, Laptop, 
  Layers, Sparkles, Activity, CheckCircle2,
  Swords, Target, Trash2, Loader2, Check, ExternalLink, Shield, Info, Trophy,
  RefreshCw, Settings, AlertTriangle, Clock
} from 'lucide-react';
import ActivityHeatmap from './ActivityHeatmap';
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

// ==========================================
// 1. MEMOIZED STATS TAB (RECHARTS)
// ==========================================
const StatsTab = React.memo(function StatsTab({ analyticsData }: { analyticsData: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Recharts Area Chart: Weekly progress trend */}
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
              <Area type="monotone" dataKey="logs" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrend)" animationDuration={800} />
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
              <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} animationDuration={800}>
                {analyticsData.monthlyData.map((entry: any, index: number) => (
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
                animationDuration={800}
              >
                {analyticsData.fieldDistribution.map((entry: any, index: number) => (
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
          {analyticsData.fieldDistribution.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400 truncate">{entry.name}</span>
              <span className="text-slate-500 ml-auto font-semibold font-mono">({entry.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ==========================================
// 2. MEMOIZED ACHIEVEMENTS TAB
// ==========================================
const AchievementsTab = React.memo(function AchievementsTab({ achievementsList }: { achievementsList: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {achievementsList.map((badge) => {
        const Icon = badge.icon;
        return (
          <div
            key={badge.id}
            className={`p-5 rounded-3xl border transition-all duration-200 flex items-start gap-4 ${
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
    </div>
  );
});

// ==========================================
// 3. MEMOIZED CONNECTED PLATFORMS WIDGET
// ==========================================
const ConnectedPlatformsWidget = React.memo(function ConnectedPlatformsWidget({
  connectedAccounts,
  accountStats,
  syncStates,
  linkingPlatform,
  onSync,
  onDisconnect,
  onConnectPlatform,
  onConnectOAuth
}: {
  connectedAccounts: ConnectedAccount[];
  accountStats: Record<string, any>;
  syncStates: Record<string, { status: string; error?: string }>;
  linkingPlatform: string | null;
  onSync: (plat: string, username: string) => void;
  onDisconnect: (plat: string) => void;
  onConnectPlatform: (plat: string, username: string) => void;
  onConnectOAuth: () => void;
}) {
  const [platformInputs, setPlatformInputs] = useState<Record<string, string>>({});

  return (
    <div className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-2">
          <Laptop className="w-4 h-4 text-indigo-400 animate-pulse" />
          Connected Platforms
        </h4>
      </div>

      <div className="space-y-4">
        {([
          { id: 'github', label: 'GitHub Code Sync', icon: <Github className="w-4 h-4 text-slate-300" /> },
          { id: 'leetcode', label: 'LeetCode Pulse', icon: <Code className="w-4 h-4 text-amber-500" /> },
          { id: 'codeforces', label: 'Codeforces Rank', icon: <Layers className="w-4 h-4 text-red-400" /> }
        ] as const).map((plat) => {
          const conn = connectedAccounts.find(a => a.platform === plat.id);
          const stats = accountStats[plat.id];
          const isSubmitting = linkingPlatform === plat.id;

          return (
            <div key={plat.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {plat.icon}
                  <span className="text-[11px] font-bold text-slate-200">{plat.label}</span>
                </div>
                {conn ? (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                    🟢 Connected
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Unlinked</span>
                )}
              </div>

              {conn ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-xl border border-white/5">
                    <span className="text-xs text-indigo-400 font-semibold font-mono">@{conn.username}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onSync(plat.id, conn.username)} 
                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDisconnect(plat.id)} 
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {plat.id === 'github' ? (
                    <button
                      disabled={isSubmitting}
                      onClick={onConnectOAuth}
                      className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                      Connect GitHub
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter username"
                        value={platformInputs[plat.id] || ''}
                        onChange={(e) => setPlatformInputs({ ...platformInputs, [plat.id]: e.target.value })}
                        className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl py-1 px-2.5 text-[10px] text-slate-100 placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        disabled={isSubmitting}
                        onClick={() => onConnectPlatform(plat.id, platformInputs[plat.id])}
                        className="px-2.5 py-1 bg-indigo-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-lg hover:bg-indigo-400"
                      >
                        Link
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
  );
});

// ==========================================
// MAIN PROFILE VIEW COMPONENT
// ==========================================
export default function ProfileView({ user, onProfileUpdated }: ProfileViewProps) {
  const [logs, setLogs] = useState<LearningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'resources' | 'clans' | 'battles' | 'goals'>('stats');

  // AI Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountStats, setAccountStats] = useState<Record<string, any>>({});
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);
  const [syncStates, setSyncStates] = useState<Record<string, { status: string; error?: string }>>({});
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncAll = useCallback(async () => {
    try {
      setIsSyncingAll(true);
      setSyncNotice(null);
      const res = await api.syncAllPlatforms();
      if (res.updatedProfile) {
        onProfileUpdated(res.updatedProfile);
      }
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
      const myLogs = await api.getMyLogs();
      setLogs(myLogs);
      
      const msg = res.totalNewEventsCreated > 0
        ? `Synced ${res.syncedPlatforms.length} platforms! Found ${res.totalNewEventsCreated} new verified activities (+${res.xpGained} XP).`
        : `Synced ${res.syncedPlatforms.length} platforms. All activity is verified & up-to-date!`;
      setSyncNotice(msg);
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      setSyncNotice(err.message || 'Platform sync failed.');
    } finally {
      setIsSyncingAll(false);
    }
  }, [onProfileUpdated]);

  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        setLoading(true);
        const [logsData, accountsData, reportsData] = await Promise.all([
          api.getMyLogs().catch(() => []),
          api.getConnectedAccounts().catch(() => []),
          api.getProfileAnalysisReports().catch(() => [])
        ]);
        if (isMounted) {
          setLogs(logsData);
          setConnectedAccounts(accountsData);
          setReports(reportsData);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadInitialData();
    return () => { isMounted = false; };
  }, [user.id]);

  const handleSyncPlatform = useCallback(async (platform: string, username: string) => {
    try {
      const res = await api.syncPlatform(platform);
      setAccountStats(prev => ({ ...prev, [platform]: res.stats }));
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
    } catch (e: any) {
      console.error(e);
    }
  }, []);

  const handleConnectPlatform = useCallback(async (platform: string, username: string) => {
    if (!username.trim()) return;
    setLinkingPlatform(platform);
    try {
      await api.connectAccount(platform as any, username);
      await handleSyncPlatform(platform, username);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLinkingPlatform(null);
    }
  }, [handleSyncPlatform]);

  const handleConnectGitHubOAuth = useCallback(async () => {
    try {
      setLinkingPlatform('github');
      // @ts-ignore
      const url = await api.getGitHubAuthUrl();
      const authWindow = window.open(url, 'github_oauth_popup', 'width=600,height=750');
      if (!authWindow) setLinkingPlatform(null);
    } catch (e) {
      setLinkingPlatform(null);
    }
  }, []);

  const handleDisconnectPlatform = useCallback(async (platform: string) => {
    try {
      await api.disconnectAccount(platform);
      const accts = await api.getConnectedAccounts();
      setConnectedAccounts(accts);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleTriggerAudit = useCallback(async () => {
    try {
      setGeneratingReport(true);
      setReportError(null);
      const res = await api.triggerProfileAnalysis();
      const data = await api.getProfileAnalysisReports();
      setReports(data);
      if (res.profile) onProfileUpdated(res.profile);
    } catch (err: any) {
      setReportError(err.message || 'Audit failed');
    } finally {
      setGeneratingReport(false);
    }
  }, [onProfileUpdated]);

  const paceScore = useMemo(() => user.points || 0, [user.points]);

  const levelInfo = useMemo(() => {
    const level = user.level || Math.floor(paceScore / 500) + 1;
    const progressToNext = (paceScore % 500) / 500 * 100;
    const ptsRemaining = 500 - (paceScore % 500);
    return { level, progressToNext, ptsRemaining };
  }, [paceScore, user.level]);

  // Analytics parser
  const analyticsData = useMemo(() => {
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
        if (dayKey in dailyCounts) dailyCounts[dayKey] += 1;
      }
    });

    const weeklyTrend = Object.entries(dailyCounts).map(([day, count]) => ({
      day, logs: count, points: count * 150
    }));

    let coding = 0, dbms = 0, systems = 0, dev = 0, others = 0;
    logs.forEach(l => {
      const text = l.content.toLowerCase();
      if (text.includes('leetcode') || text.includes('code') || text.includes('solve')) coding += 1;
      else if (text.includes('sql') || text.includes('database')) dbms += 1;
      else if (text.includes('os') || text.includes('system')) systems += 1;
      else if (text.includes('api') || text.includes('react')) dev += 1;
      else others += 1;
    });

    if (logs.length === 0) { coding = 1; dbms = 1; systems = 1; dev = 1; others = 1; }

    const fieldDistribution = [
      { name: 'Algorithms', value: coding, color: '#22d3ee' },
      { name: 'Databases', value: dbms, color: '#6366f1' },
      { name: 'Systems', value: systems, color: '#a78bfa' },
      { name: 'Web Dev', value: dev, color: '#ec4899' },
      { name: 'General', value: others, color: '#64748b' }
    ].filter(i => i.value > 0);

    const monthlyData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]}`;
      let count = 0;
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate.getFullYear() === d.getFullYear() && logDate.getMonth() === d.getMonth()) count += 1;
      });
      monthlyData.push({ month: label, count });
    }

    return { weeklyTrend, fieldDistribution, monthlyData };
  }, [logs]);

  const achievementsList = useMemo(() => [
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
  ], [user.streak, user.totalLogs, user.friendsCount, levelInfo.level]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-20 pb-24 font-sans select-none z-10 relative">
      
      {/* Banner */}
      <div className="h-40 md:h-48 rounded-[32px] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden mb-6 border border-white/10 shadow-xl flex items-end p-6">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-xl flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-slate-300 font-extrabold uppercase font-mono">LEVEL {levelInfo.level}</span>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative -mt-20 px-4 md:px-8 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-slate-900/90 flex items-center justify-center text-5xl border-2 border-white/20 shadow-2xl relative">
            {user.avatar}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-100">{user.displayName}</h1>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-center md:self-end">
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-full flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Syncing Activity...' : 'Sync All Platforms'}</span>
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-100 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3.5 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl flex items-center gap-3 text-xs text-indigo-200 shadow-xl"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="font-medium">{syncNotice}</span>
        </motion.div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="space-y-6">
          <InteractiveGlass className="p-5 rounded-[24px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Verified Metrics
              </span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                Level {levelInfo.level}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl">
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Lifetime XP</div>
                <div className="text-lg font-bold font-mono text-emerald-400">{(user.xp || 0).toLocaleString()}</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Verified work (never drops)</div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl">
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">PACE Rating</div>
                <div className="text-lg font-bold font-mono text-cyan-400">{(user.paceRating || 1200).toLocaleString()}</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Elo / Competitive strength</div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl">
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Leaderboard Score</div>
                <div className="text-lg font-bold font-mono text-indigo-400">{(user.leaderboardScore || user.points || 0).toLocaleString()}</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Recent performance & rank</div>
              </div>

              <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl">
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">PACE Points</div>
                <div className="text-lg font-bold font-mono text-purple-400">{(user.points || 0).toLocaleString()}</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Level progression</div>
              </div>
            </div>
          </InteractiveGlass>

          <ConnectedPlatformsWidget
            connectedAccounts={connectedAccounts}
            accountStats={accountStats}
            syncStates={syncStates}
            linkingPlatform={linkingPlatform}
            onSync={handleSyncPlatform}
            onDisconnect={handleDisconnectPlatform}
            onConnectPlatform={handleConnectPlatform}
            onConnectOAuth={handleConnectGitHubOAuth}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="flex flex-wrap gap-1 bg-slate-950/40 border border-white/10 rounded-2xl p-1 self-start w-full md:w-auto">
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
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  activeTab === tab.id 
                    ? 'text-slate-100 bg-indigo-500/20 border border-indigo-500/40' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            {activeTab === 'stats' && <StatsTab analyticsData={analyticsData} />}
            {activeTab === 'achievements' && <AchievementsTab achievementsList={achievementsList} />}
            {activeTab === 'resources' && <ResourcesTab />}
            {activeTab === 'clans' && <ClansTab />}
            {activeTab === 'battles' && <BattlesTab />}
            {activeTab === 'goals' && <GoalsTab />}
          </div>
        </div>
      </div>

      <ActivityHeatmap logs={logs} isPrivate={user.isPrivate} />

      {/* AI Deep Profile Audit */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[28px] p-6 mt-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-display font-bold text-slate-100">Paco's Deep AI Profile Audit</h2>
          </div>
          <button
            onClick={handleTriggerAudit}
            disabled={generatingReport}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
          >
            {generatingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Run Audit</span>
          </button>
        </div>

        {reports.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-indigo-300">Latest Growth Analysis</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {reports[0]?.summary || reports[0]?.insight || 'Keep logging your study sessions to receive personalized AI recommendations and burnout prevention tips.'}
            </p>
          </div>
        )}
      </div>

      <EditProfileModal
        user={user}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={async (data) => {
          const updated = await api.updateProfile(data);
          onProfileUpdated(updated);
        }}
      />
    </div>
  );
}
