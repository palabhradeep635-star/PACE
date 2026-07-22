import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserProfile, Friend, LearningEvent } from '../types';
import { 
  Trophy, Award, Shield, Users, Swords, Search, Flame, Zap, CheckCircle, 
  Hourglass, BarChart2, TrendingUp, Sparkles, BookOpen, Clock, Activity, RefreshCw, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface RankingsHubProps {
  currentUser: UserProfile;
}

export default function RankingsHub({ currentUser }: RankingsHubProps) {
  const [activeHubTab, setActiveHubTab] = useState<'leaderboard' | 'clans' | 'achievements' | 'compare'>('leaderboard');
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'university' | 'friends'>('global');
  
  // Data states
  const [breakdown, setBreakdown] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [clanRankings, setClanRankings] = useState<any[]>([]);
  const [clanWars, setClanWars] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Comparison states
  const [searchTerm, setSearchTerm] = useState('');
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  const loadHubData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const [bd, lb, cr, cw, ach, fl] = await Promise.all([
        api.getScoringBreakdown(),
        api.getLeaderboards(leaderboardType),
        api.getClanRankings(),
        api.getClanWars(),
        api.getAchievements(),
        api.getFriends()
      ]);

      setBreakdown(bd);
      setLeaderboard(lb);
      setClanRankings(cr);
      setClanWars(cw);
      setAchievements(ach);
      setFriendsList(fl);
    } catch (err) {
      console.error('Error loading PACE Hub data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHubData();
  }, [leaderboardType]);

  const handleCompare = async (targetUserId: string) => {
    setComparing(true);
    try {
      const data = await api.compareProfiles(targetUserId);
      setCompareData(data);
      // Find peer profile info from friends or search
      const peer = friendsList.find(f => f.friendId === targetUserId);
      setSelectedPeer(peer);
    } catch (err) {
      console.error('Error comparing profiles:', err);
    } finally {
      setComparing(false);
    }
  };

  const getComponentColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    if (score >= 50) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
  };

  const getComponentBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 shadow-emerald-500/25';
    if (score >= 50) return 'bg-indigo-500 shadow-indigo-500/25';
    return 'bg-amber-500 shadow-amber-500/25';
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 select-none">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950/40 border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-[60px]" />
        <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-[60px]" />

        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-xl">
            🏆
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl md:text-3xl font-display font-black text-slate-100 tracking-tight">PACE Scoring Hub</h1>
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Deterministic, server-authoritative learning metrics and multiplayer rankings.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 self-center relative z-10">
          <button
            onClick={() => loadHubData(true)}
            disabled={refreshing || loading}
            className="p-3 bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Recalculate Score</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-xs uppercase tracking-widest text-slate-500 font-black">Hydrating Multiplayer Rankings...</p>
        </div>
      ) : (
        <>
          {/* USER SCORE OVERVIEW & ELO RADAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall Score Circle/Stats */}
            <div className="lg:col-span-2 bg-slate-950/40 border border-white/10 rounded-[32px] p-6 md:p-8 shadow-xl flex flex-col md:flex-row gap-8 items-center relative backdrop-blur-2xl">
              <div className="flex flex-col items-center justify-center relative min-w-[160px]">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="64" stroke="rgba(255,255,255,0.04)" strokeWidth="12" fill="transparent" />
                    <circle cx="72" cy="72" r="64" stroke="url(#indigoCyanGrad)" strokeWidth="12" fill="transparent"
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * (breakdown?.overallScore || 0)) / 100}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="indigoCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="text-center relative z-10">
                    <div className="text-4xl md:text-5xl font-display font-black text-slate-100 tracking-tighter">
                      {breakdown?.overallScore}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 mt-1">
                      Overall PACE
                    </div>
                  </div>
                </div>
              </div>

              {/* Component breakdown list */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">PACE Components Breakdown</h3>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Anti-Cheat Status: {breakdown?.antiCheatStatus?.toUpperCase()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                  {[
                    { label: 'Consistency (25%)', val: breakdown?.components?.consistency },
                    { label: 'Coding Performance (20%)', val: breakdown?.components?.codingPerformance },
                    { label: 'Academic Progress (20%)', val: breakdown?.components?.academicProgress },
                    { label: 'Learning Quality (15%)', val: breakdown?.components?.learningQuality },
                    { label: 'Goal Completion (10%)', val: breakdown?.components?.goalCompletion },
                    { label: 'Collaboration (5%)', val: breakdown?.components?.collaboration },
                  ].map((comp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-slate-400">{comp.label}</span>
                        <span className="text-[11px] font-bold text-slate-100">{comp.val}/100</span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.04] border border-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${getComponentBarColor(comp.val)}`}
                          style={{ width: `${comp.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Elo, Level & Trust Analytics */}
            <div className="bg-slate-950/40 border border-white/10 rounded-[32px] p-6 md:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-2xl">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-500/10 rounded-full blur-[40px]" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold">Competitive Standing</span>
                  <span className="px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 font-bold text-[10px] rounded-lg">
                    Level {breakdown?.level}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <h2 className="text-3xl md:text-4xl font-display font-black text-indigo-400">{breakdown?.dynamicElo}</h2>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ELO Rating</span>
                </div>

                <div className="h-[1px] bg-white/5" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Weekly XP</span>
                    <span className="text-lg font-bold text-slate-200 mt-1 block">{breakdown?.weeklyXp} XP</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Monthly XP</span>
                    <span className="text-lg font-bold text-slate-200 mt-1 block">{breakdown?.monthlyXp} XP</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Anti-Cheat Risk Score</span>
                  <span className="text-xs font-semibold text-slate-300 block">{breakdown?.riskScore || 0}% / Safe Sandbox Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN TAB SWITCHER */}
          <div className="flex items-center border-b border-white/10 gap-6">
            {[
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'clans', label: 'Clans & Clan Wars', icon: Users },
              { id: 'achievements', label: 'Achievements', icon: Award },
              { id: 'compare', label: 'Compare & Analyze', icon: Swords },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeHubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveHubTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2.5 transition-all cursor-pointer select-none relative ${
                    isActive 
                      ? 'border-indigo-400 text-slate-100' 
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-6">
            {/* TAB 1: LEADERBOARD */}
            {activeHubTab === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Board filtering */}
                <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-950/20 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                    {[
                      { id: 'global', label: 'Global Rank' },
                      { id: 'university', label: 'University' },
                      { id: 'friends', label: 'Friends' },
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setLeaderboardType(btn.id as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                          leaderboardType === btn.id
                            ? 'bg-white/10 border border-white/10 text-slate-100'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    Showing top active 50 participants, re-calculated on activity.
                  </span>
                </div>

                {/* Podium Highlight Cards (Top 3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {leaderboard.slice(0, 3).map((player, idx) => {
                    const colors = [
                      { bg: 'from-amber-500/10 to-transparent border-amber-400/20', badge: 'bg-amber-400/15 border-amber-400/30 text-amber-300', emoji: '🥇', podium: 'First Place' },
                      { bg: 'from-slate-400/10 to-transparent border-slate-400/20', badge: 'bg-slate-400/15 border-slate-400/30 text-slate-300', emoji: '🥈', podium: 'Second Place' },
                      { bg: 'from-amber-600/10 to-transparent border-amber-600/20', badge: 'bg-amber-600/15 border-amber-600/30 text-amber-500', emoji: '🥉', podium: 'Third Place' },
                    ];
                    const cfg = colors[idx] || colors[2];
                    const isSelf = player.userId === currentUser.id;

                    return (
                      <div 
                        key={player.userId}
                        className={`bg-gradient-to-b ${cfg.bg} border rounded-[28px] p-6 relative overflow-hidden backdrop-blur-2xl flex flex-col justify-between ${
                          isSelf ? 'ring-2 ring-indigo-500/40 border-indigo-400/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{cfg.emoji}</span>
                            <div>
                              <span className={`text-[10px] uppercase tracking-wider font-extrabold ${cfg.badge.split(' ').slice(-1)[0]}`}>
                                {cfg.podium}
                              </span>
                              <h3 className="text-base font-display font-black text-slate-100 block mt-0.5 truncate max-w-[150px]">
                                {player.displayName}
                              </h3>
                              <span className="text-[10px] text-slate-500 font-medium block">@{player.username}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-base font-display font-black text-slate-100 block">{player.rankScore}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Rank Score</span>
                          </div>
                        </div>

                        <div className="h-[1px] bg-white/5 my-4" />

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">PACE</span>
                            <span className="text-xs font-extrabold text-slate-300 block">{player.paceScore}</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">ELO</span>
                            <span className="text-xs font-extrabold text-indigo-400 block">{player.dynamicElo}</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Streak</span>
                            <span className="text-xs font-extrabold text-emerald-400 block">{player.streak}d</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[120px]">{player.university}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md font-bold">YOU</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Leaderboard Table (Ranks 4-50) */}
                <div className="bg-slate-950/40 border border-white/10 rounded-[32px] overflow-hidden shadow-xl backdrop-blur-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase tracking-wider font-extrabold bg-slate-900/10">
                          <th className="py-4.5 px-6 font-bold w-16 text-center">Rank</th>
                          <th className="py-4.5 px-4 font-bold">Student</th>
                          <th className="py-4.5 px-4 font-bold">University</th>
                          <th className="py-4.5 px-4 font-bold text-center">PACE (0-100)</th>
                          <th className="py-4.5 px-4 font-bold text-center">ELO</th>
                          <th className="py-4.5 px-4 font-bold text-center">Streak</th>
                          <th className="py-4.5 px-6 font-bold text-right">Rank Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-slate-500 font-bold">
                              No leaderboard entries found for this category.
                            </td>
                          </tr>
                        ) : (
                          leaderboard.slice(3).map((entry) => {
                            const isSelf = entry.userId === currentUser.id;
                            return (
                              <tr 
                                key={entry.userId}
                                className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                                  isSelf ? 'bg-indigo-500/[0.04]' : ''
                                }`}
                              >
                                <td className="py-4 px-6 text-center font-mono text-xs font-extrabold text-slate-400">
                                  #{entry.rank}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-lg shrink-0">
                                      {entry.avatar || '🦉'}
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                        {entry.displayName}
                                        {isSelf && (
                                          <span className="px-1 py-0.5 bg-indigo-500/15 border border-indigo-500/35 text-indigo-400 rounded-md text-[9px] font-black">YOU</span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-slate-500 block">@{entry.username}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-xs font-semibold text-slate-400 max-w-[150px] truncate">
                                  {entry.university}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-xs font-black text-slate-200 bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl">
                                    {entry.paceScore}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center text-xs font-bold text-indigo-400">
                                  {entry.dynamicElo}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                                    <Flame className="w-3.5 h-3.5" />
                                    {entry.streak}d
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right font-display font-bold text-slate-200">
                                  {entry.rankScore}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: CLANS & CLAN WARS */}
            {activeHubTab === 'clans' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Season Countdown Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-slate-950/40 border border-indigo-500/20 rounded-3xl p-5 relative overflow-hidden backdrop-blur-2xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">Weekly Season Progression</h4>
                    </div>
                    <div className="text-xl font-display font-black text-slate-100 mt-2">
                      {clanWars?.weeklyCountdown || 'Calculating...'}
                    </div>
                    <div className="text-[10px] text-indigo-300 font-semibold mt-1">
                      Top 3 clans receive Weekly Vanguard badge status.
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-cyan-500/20 rounded-3xl p-5 relative overflow-hidden backdrop-blur-2xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">Monthly Season Trophy</h4>
                    </div>
                    <div className="text-xl font-display font-black text-slate-100 mt-2">
                      {clanWars?.monthlyCountdown || 'Calculating...'}
                    </div>
                    <div className="text-[10px] text-cyan-300 font-semibold mt-1">
                      Grand winner receives the July Monthly Emerald Trophy.
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-purple-500/20 rounded-3xl p-5 relative overflow-hidden backdrop-blur-2xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-purple-400" />
                      <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-extrabold">Weekly Active MVP</h4>
                    </div>
                    <div className="flex items-center gap-2.5 mt-2">
                      <span className="text-xl">{clanWars?.mvp?.avatar || '👑'}</span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-200 truncate block">
                          {clanWars?.mvp?.displayName || 'Loading...'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold block">{clanWars?.mvp?.weeklyScore || 0} XP earned this week</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clan Leaderboards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Clan rankings table */}
                  <div className="lg:col-span-2 bg-slate-950/40 border border-white/10 rounded-[32px] p-6 shadow-xl backdrop-blur-2xl space-y-4">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">Clan Leaderboards</h3>
                    
                    <div className="space-y-3">
                      {clanRankings.map((clan, idx) => (
                        <div 
                          key={clan.id}
                          className="flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4.5 transition-all"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="font-mono text-xs font-black text-slate-500 w-6 text-center">#{idx + 1}</span>
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-base shrink-0">
                              🛡️
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-black text-[10px] rounded-lg">
                                  [{clan.tag.toUpperCase()}]
                                </span>
                                <span className="text-xs font-extrabold text-slate-200 truncate block">{clan.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{clan.memberCount} active members · Avg PACE {clan.averageScore}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-display font-black text-indigo-400 block">{clan.clanXp} XP</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wider">Clan Experience</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hall of Fame */}
                  <div className="bg-slate-950/40 border border-white/10 rounded-[32px] p-6 shadow-xl backdrop-blur-2xl space-y-4">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      Season Hall of Fame
                    </h3>

                    <div className="space-y-4.5">
                      {clanWars?.hallOfFame?.map((h, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>{h.season}</span>
                            <span className="text-amber-400">{h.trophy}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-black text-slate-200">{h.winner}</span>
                            <span className="text-[9px] text-slate-500 font-mono">[{h.tag}]</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Season MVP: <span className="font-extrabold text-slate-300">@{h.mvp}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ACHIEVEMENTS */}
            {activeHubTab === 'achievements' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {achievements.map((ach) => (
                  <div 
                    key={ach.id}
                    className={`bg-slate-950/40 border rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between backdrop-blur-2xl ${
                      ach.unlocked 
                        ? 'border-indigo-500/25 shadow-lg shadow-indigo-500/5' 
                        : 'border-white/5 opacity-70'
                    }`}
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                    
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-3xl bg-slate-900 border border-white/5 w-12 h-12 rounded-2xl flex items-center justify-center">
                          {ach.icon}
                        </span>
                        {ach.unlocked ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            Unlocked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800/20 border border-slate-700/30 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            Locked
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-black text-slate-200 mt-4 block">{ach.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1.5">{ach.description}</p>
                    </div>

                    <div className="mt-6 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-slate-300">{ach.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            ach.unlocked ? 'bg-indigo-500' : 'bg-slate-700'
                          }`}
                          style={{ width: `${ach.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* TAB 4: COMPARE & ANALYZE */}
            {activeHubTab === 'compare' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Search & Selector */}
                <div className="bg-slate-950/40 border border-white/10 rounded-[32px] p-6 shadow-xl backdrop-blur-2xl">
                  <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold mb-4">Select classmate to compare</h3>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-4.5 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Search peer username or nickname..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-indigo-500/40 focus:bg-white/[0.05] rounded-2xl text-xs text-slate-200 placeholder-slate-500 font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Friends search results */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                    {friendsList
                      .filter(f => {
                        const name = (f.friendDisplayName || f.friendUsername).toLowerCase();
                        return name.includes(searchTerm.toLowerCase());
                      })
                      .map(friend => (
                        <button
                          key={friend.friendId}
                          onClick={() => handleCompare(friend.friendId)}
                          className="flex flex-col items-center p-3.5 bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] rounded-2xl cursor-pointer transition-all"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xl shrink-0">
                            {friend.friendAvatar || '🦉'}
                          </div>
                          <span className="text-[11px] font-bold text-slate-200 mt-2 truncate max-w-full text-center">
                            {friend.friendDisplayName || friend.friendUsername}
                          </span>
                          <span className="text-[9px] text-slate-500 block truncate max-w-full text-center">@{friend.friendUsername}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Compare View Output */}
                <AnimatePresence mode="wait">
                  {comparing ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Syncing peer analytics...</p>
                    </div>
                  ) : compareData ? (
                    <motion.div
                      key="compare-results"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {/* Side-by-side components comparison */}
                      <div className="lg:col-span-2 bg-slate-950/40 border border-white/10 rounded-[32px] p-6 md:p-8 shadow-xl backdrop-blur-2xl space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">PACE Radar Matrix Comparison</h4>
                          <button 
                            onClick={() => setCompareData(null)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Side by side display of overall score */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
                            <span className="text-[10px] uppercase text-slate-500 font-bold block">Your Overall PACE</span>
                            <span className="text-3xl font-display font-black text-indigo-400 mt-1 block">
                              {compareData.currentUser.breakdown.overallScore}
                            </span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
                            <span className="text-[10px] uppercase text-slate-500 font-bold block">@{compareData.targetUser.profile.username}’s PACE</span>
                            <span className="text-3xl font-display font-black text-cyan-400 mt-1 block">
                              {compareData.targetUser.breakdown.overallScore}
                            </span>
                          </div>
                        </div>

                        {/* List comparison */}
                        <div className="space-y-4 pt-2">
                          {[
                            { label: 'Consistency', val1: compareData.currentUser.breakdown.components.consistency, val2: compareData.targetUser.breakdown.components.consistency },
                            { label: 'Coding Performance', val1: compareData.currentUser.breakdown.components.codingPerformance, val2: compareData.targetUser.breakdown.components.codingPerformance },
                            { label: 'Academic Progress', val1: compareData.currentUser.breakdown.components.academicProgress, val2: compareData.targetUser.breakdown.components.academicProgress },
                            { label: 'Learning Quality', val1: compareData.currentUser.breakdown.components.learningQuality, val2: compareData.targetUser.breakdown.components.learningQuality },
                            { label: 'Goal Completion', val1: compareData.currentUser.breakdown.components.goalCompletion, val2: compareData.targetUser.breakdown.components.goalCompletion },
                          ].map((item, idx) => (
                            <div key={idx} className="space-y-2 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                <span>{item.label}</span>
                                <div className="flex items-center gap-3 font-mono">
                                  <span className="text-indigo-400">{item.val1}</span>
                                  <span className="text-slate-600">vs</span>
                                  <span className="text-cyan-400">{item.val2}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.val1}%` }} />
                                </div>
                                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${item.val2}%` }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Headmaps & Streaks Comparison */}
                      <div className="space-y-6">
                        <div className="bg-slate-950/40 border border-white/10 rounded-[32px] p-6 shadow-xl backdrop-blur-2xl space-y-4">
                          <h4 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">Streaks & Level Standing</h4>

                          <div className="space-y-3">
                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                              <span className="text-[10px] uppercase text-slate-500 font-bold block">Current Active Streak</span>
                              <div className="flex justify-between font-bold">
                                <span className="text-indigo-400">YOU: {compareData.currentUser.profile.streak} Days</span>
                                <span className="text-cyan-400">THEM: {compareData.targetUser.profile.streak} Days</span>
                              </div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                              <span className="text-[10px] uppercase text-slate-500 font-bold block">Dynamic ELO Ratings</span>
                              <div className="flex justify-between font-bold">
                                <span className="text-indigo-400">YOU: {compareData.currentUser.breakdown.dynamicElo}</span>
                                <span className="text-cyan-400">THEM: {compareData.targetUser.breakdown.dynamicElo}</span>
                              </div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                              <span className="text-[10px] uppercase text-slate-500 font-bold block">Level Progression</span>
                              <div className="flex justify-between font-bold">
                                <span className="text-indigo-400">YOU: Lvl {compareData.currentUser.breakdown.level}</span>
                                <span className="text-cyan-400">THEM: Lvl {compareData.targetUser.breakdown.level}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Simple instruction callout */}
                        <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-5 rounded-3xl">
                          <h4 className="text-xs font-black text-slate-200">🤖 AI Insight Summary</h4>
                          <p className="text-[11px] text-indigo-200 mt-2 leading-relaxed">
                            {compareData.currentUser.breakdown.overallScore > compareData.targetUser.breakdown.overallScore
                              ? `You have a higher Consistency and Academic score compared to @${compareData.targetUser.profile.username}. Maintain your active daily study streak to widen your lead.`
                              : `@${compareData.targetUser.profile.username} is leading due to superior Academic Progress. Increase your total study minutes or connect platform accounts to close the GAP.`
                            }
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-slate-950/20 border border-white/5 rounded-[32px] py-12 text-center text-slate-500 text-xs font-bold">
                      Select a classmate above to initiate side-by-side compare matrices.
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
