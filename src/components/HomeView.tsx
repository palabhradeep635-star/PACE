/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile, LearningEvent } from '../types';
import { Flame, Calendar, Sparkles, MessageSquare, Plus, ArrowRight, UserCheck, Users, Sun, CloudSun, Sunset, Moon, UserPlus, Trophy, Award, Check, TrendingUp } from 'lucide-react';
import StudentProfileModal from './StudentProfileModal';
import InteractiveGlass from './InteractiveGlass';
import AnimatedCounter from './AnimatedCounter';
import PacoMascot from './PacoMascot';

interface HomeViewProps {
  user: UserProfile;
  onRefreshUser: () => void;
  setActiveTab: (tab: string) => void;
}

export default function HomeView({ user, onRefreshUser, setActiveTab }: HomeViewProps) {
  const [feed, setFeed] = useState<LearningEvent[]>([]);
  const [myLogs, setMyLogs] = useState<LearningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const loggedToday = myLogs.some(l => l.createdAt.split('T')[0] === todayStr);

  const [greetingText, setGreetingText] = useState('Hello');
  const [greetingIcon, setGreetingIcon] = useState<React.ReactNode>(null);
  const [greetingThemeClass, setGreetingThemeClass] = useState('text-indigo-400');

  // Real classmates loaded from Database
  const [recommendedClassmates, setRecommendedClassmates] = useState<Array<{ profile: UserProfile; friendStatus: string }>>([]);
  const [addedFriends, setAddedFriends] = useState<Record<string, boolean>>({});
  const [loadingPeers, setLoadingPeers] = useState(false);

  useEffect(() => {
    const getGreetingDetails = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return {
          text: 'Good morning',
          icon: <Sun className="w-4 h-4 text-amber-400 animate-pulse" />,
          themeClass: 'text-amber-400'
        };
      } else if (hour >= 12 && hour < 17) {
        return {
          text: 'Good afternoon',
          icon: <CloudSun className="w-4 h-4 text-orange-400" />,
          themeClass: 'text-orange-400'
        };
      } else if (hour >= 17 && hour < 22) {
        return {
          text: 'Good evening',
          icon: <Sunset className="w-4 h-4 text-pink-400" />,
          themeClass: 'text-pink-400'
        };
      } else {
        return {
          text: 'Hey night owl',
          icon: <Moon className="w-4 h-4 text-indigo-400 animate-pulse" />,
          themeClass: 'text-indigo-400'
        };
      }
    };

    const details = getGreetingDetails();
    setGreetingText(details.text);
    setGreetingIcon(details.icon);
    setGreetingThemeClass(details.themeClass);
  }, []);

  const studyFocusLabel = useMemo(() => {
    if (user.branch) {
      return `${user.branch}${user.university ? ` • ${user.university}` : ''}`;
    }
    if (myLogs.length > 0) {
      const lastContent = myLogs[0].content;
      return `Last Topic: ${lastContent.length > 35 ? `${lastContent.substring(0, 35)}...` : lastContent}`;
    }
    return "Exploring Learning Horizons";
  }, [user.branch, user.university, myLogs]);

  const dynamicSubtext = useMemo(() => {
    const hour = new Date().getHours();
    if (loggedToday) {
      if (hour >= 5 && hour < 12) {
        return "Early bird progress locked! You've already logged today's study. Have an amazing day ahead!";
      } else if (hour >= 12 && hour < 17) {
        return "Splendid! Afternoon productivity is in full swing. Today's logs are safely recorded.";
      } else if (hour >= 17 && hour < 22) {
        return "Great job! Your study session is registered. Time to review or rest easy.";
      } else {
        return "Masterful work! Even late at night, your dedication is logged. Time for some rest soon!";
      }
    } else {
      if (hour >= 5 && hour < 12) {
        return "Morning is a beautiful time to learn. What study topic are we tackling first today?";
      } else if (hour >= 12 && hour < 17) {
        return "Keep your learning streak glowing! Take a few minutes to log your afternoon progress.";
      } else if (hour >= 17 && hour < 22) {
        return "The evening is perfect for reflecting. Log what you studied today to secure your streak!";
      } else {
        return "Working hard late tonight? Let's quickly document your session and keep the streak burning!";
      }
    }
  }, [loggedToday]);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        const [feedData, logsData] = await Promise.all([
          api.getFeed(),
          api.getMyLogs(),
        ]);
        setFeed(feedData);
        setMyLogs(logsData);

        // Fetch actual profiles if feed is quiet
        if (feedData.length === 0) {
          setLoadingPeers(true);
          const searchData = await api.searchProfiles('');
          // Suggest students who aren't friends yet, and are not the current user
          const recommendations = searchData
            .filter(item => item.friendStatus === 'none' && item.profile.id !== user.id)
            .slice(0, 3);
          setRecommendedClassmates(recommendations);
        }
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
        setLoadingPeers(false);
      }
    }
    loadHomeData();
  }, [user]);

  const handleConnectPeer = async (peerId: string) => {
    try {
      await api.sendFriendRequest(peerId);
      setAddedFriends(prev => ({ ...prev, [peerId]: true }));
      onRefreshUser();
    } catch (e) {
      console.error('Failed to connect peer:', e);
    }
  };

  // Generate last 7 days list
  const getWeeklyProgress = () => {
    const days = [];
    const today = new Date();
    
    // We get last 7 days starting from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon"
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if user has logs on this day
      const hasLog = myLogs.some(log => {
        const logDate = log.createdAt.split('T')[0];
        return logDate === dateStr;
      });

      days.push({
        dayName,
        dateStr,
        hasLog,
        isToday: dateStr === today.toISOString().split('T')[0],
      });
    }
    return days;
  };

  const weeklyDays = getWeeklyProgress();

  // Helper to format time ago
  const formatTimeAgo = (isoString: string) => {
    try {
      const logDate = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - logDate.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
    } catch {
      return 'Some time ago';
    }
  };

  // SaaS animation variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.02,
      },
    },
  };

  const smoothFadeInUp = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 16,
        mass: 0.8,
      },
    },
  };

  const feedItemVariant = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 18,
      },
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-32 font-sans select-none z-10 relative">
      {/* Premium Focal Hero Section with Integrated Mascot */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 75, damping: 15 }}
        className="mb-10"
      >
        <InteractiveGlass
          hoverScale={1.005}
          glowColor="rgba(99,102,241,0.12)"
          className="p-8 md:p-10 rounded-[42px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
        >
          {/* Subtle animated light orb behind the mascot */}
          <div className="absolute top-1/2 -translate-y-1/2 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none -z-10" />
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />

          {/* Top subtle grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left side: Interactive welcome text, status focus, and smart call-to-actions */}
            <div className="md:col-span-8 flex flex-col items-start space-y-4">
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${greetingThemeClass} flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm shadow-sm hover:border-white/10 transition-all duration-300`}>
                {greetingIcon}
                <span>{studyFocusLabel}</span>
              </span>
              
              <div className="space-y-1.5">
                <h1 className="text-3.5xl md:text-5xl font-display font-bold text-slate-100 tracking-tight leading-none">
                  {greetingText}, <span className="scanning-gradient-text">{user.displayName}</span>
                </h1>
                <p className="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
                  {dynamicSubtext}
                </p>
              </div>

              {/* Action buttons embedded in the hero card */}
              <div className="pt-3.5 flex flex-wrap gap-4 items-center">
                {!loggedToday ? (
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(99,102,241,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('log')}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 border border-white/10 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Today's Progress</span>
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">Pace Secured for Today</span>
                  </div>
                )}
                
                <button
                  onClick={() => setActiveTab('people')}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-slate-300 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Connect with Peers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right side: Integrated Dynamic Paco Mascot */}
            <div className="md:col-span-4 flex justify-center md:justify-end">
              <div className="relative group cursor-pointer">
                {/* Micro reflection ring underneath Paco */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-3.5 bg-indigo-500/10 rounded-full blur-md opacity-75 group-hover:bg-indigo-500/20 transition-all duration-300" />
                <PacoMascot 
                  mode={loggedToday ? "celebration" : "guidance"} 
                  context="analytics"
                  className="w-44 h-44 drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)] group-hover:scale-[1.04] transition-transform duration-300" 
                />
              </div>
            </div>
          </div>
        </InteractiveGlass>
      </motion.div>

      {/* Primary Stats Grid with Dynamic Visual Hierarchy */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
      >
        {/* High-Emphasis Streak card in Emerald */}
        <motion.div variants={smoothFadeInUp}>
          <InteractiveGlass
            hoverScale={1.025}
            glowColor="rgba(16,185,129,0.15)"
            className="p-6 h-full flex flex-col justify-between cursor-pointer border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent rounded-[28px]"
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold">Current Streak</span>
              <div className={`p-2 rounded-xl transition-all duration-300 ${user.streak > 0 ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' : 'bg-slate-500/10 text-slate-500'}`}>
                <Flame className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-slate-100 font-display">
                  <AnimatedCounter value={user.streak} />
                </span>
                <span className="text-xs text-slate-400 font-medium">days</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                {user.streak > 0 ? 'Amazing! Log daily to extend.' : 'Log a session to start your streak.'}
              </p>
            </div>
          </InteractiveGlass>
        </motion.div>

        {/* Total Logs Card in Indigo */}
        <motion.div variants={smoothFadeInUp}>
          <InteractiveGlass
            hoverScale={1.02}
            glowColor="rgba(99,102,241,0.12)"
            className="p-6 h-full flex flex-col justify-between cursor-pointer rounded-[28px] border border-indigo-500/10 bg-gradient-to-b from-indigo-500/[0.02] to-transparent"
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold">Total Logs</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Calendar className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-slate-100 font-display">
                  <AnimatedCounter value={user.totalLogs} />
                </span>
                <span className="text-xs text-slate-400 font-medium">logs</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Your overall documented learning effort.
              </p>
            </div>
          </InteractiveGlass>
        </motion.div>

        {/* Weekly Progress visual */}
        <motion.div variants={smoothFadeInUp}>
          <InteractiveGlass
            hoverScale={1.02}
            glowColor="rgba(139,92,246,0.12)"
            className="p-6 h-full flex flex-col justify-between rounded-[28px] border border-white/5 bg-white/[0.01]"
          >
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold">Weekly Pulse</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Last 7 days</span>
            </div>

            <div className="flex items-center justify-between gap-1 mt-2 relative z-10">
              {weeklyDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-help ${
                      day.hasLog
                        ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-white/10'
                        : day.isToday
                        ? 'border border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                        : 'border border-white/5 bg-white/[0.03] text-slate-600'
                    }`}
                    title={day.dateStr}
                  >
                    {day.hasLog ? '✓' : ''}
                  </motion.div>
                  <span className={`text-[9px] font-bold ${day.isToday ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {day.dayName[0]}
                  </span>
                </div>
              ))}
            </div>
          </InteractiveGlass>
        </motion.div>
      </motion.div>

      {/* Friends Activity Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity feed list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Friends Activity Feed
            </h3>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-bold uppercase tracking-wider">Live</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="space-y-6"
            >
              {/* Primary callout header */}
              <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden bg-white/[0.01]">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <h4 className="text-sm font-semibold text-slate-200">The classroom is temporarily quiet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                    Build your study network, check real-time updates, and explore academic concepts with peer classmates.
                  </p>
                  <button
                    onClick={() => setActiveTab('people')}
                    className="mt-3.5 px-4.5 py-2 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
                  >
                    <span>Discover Peer Students</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <PacoMascot mode="empty-state" context="analytics" className="w-24 h-24 shrink-0" />
              </div>

              {/* Classmate recommendations container (100% real, queries Supabase) */}
              {loadingPeers ? (
                <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                  <div className="h-10 bg-white/5 rounded" />
                  <div className="h-10 bg-white/5 rounded" />
                </div>
              ) : recommendedClassmates.length > 0 ? (
                <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-extrabold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Recommended Classmates
                    </span>
                    <span className="text-[9px] font-bold text-indigo-400 font-mono tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">REAL PEERS</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {recommendedClassmates.map(item => (
                      <div key={item.profile.id} className="flex flex-col justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-200 text-left">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xl shrink-0">
                              {item.profile.avatar}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate leading-snug">{item.profile.displayName}</div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">@{item.profile.username}</div>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium line-clamp-1">
                            {item.profile.branch ? `${item.profile.branch}` : 'Peer Scholar'}
                          </div>
                          {item.profile.university && (
                            <div className="text-[9px] text-slate-500 truncate font-semibold">
                              {item.profile.university}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleConnectPeer(item.profile.id)}
                          className={`mt-4 w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            addedFriends[item.profile.id]
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300'
                          }`}
                        >
                          {addedFriends[item.profile.id] ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Request Sent</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Connect</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Pristine layout when user is the first/only registered user */
                <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-8 text-center space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-lg text-slate-400 select-none">
                    🚀
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-semibold text-slate-200">The PACE Classroom is Fresh</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                      You are the first pioneering scholar registered here! As other students join the ledger, you can connect and check their study updates.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('log')}
                      className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Your First Session</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="space-y-3"
            >
              {feed.map((event) => (
                <motion.div
                  key={event.id}
                  variants={feedItemVariant}
                  whileHover={{ x: 6, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                  onClick={() => setSelectedUserId(event.userId)}
                  className="group p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer flex gap-4 items-start shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center text-xl shadow-inner select-none transition-transform duration-300 group-hover:scale-110">
                    {event.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                        {event.displayName}
                        <span className="text-xs text-slate-500 font-normal ml-1.5">@{event.username}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium shrink-0">
                        {formatTimeAgo(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 font-sans break-words leading-relaxed">
                      {event.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Sidebar Mini-info / Quick Guide */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.2 }}
          className="space-y-6"
        >
          <motion.div 
            whileHover={{ y: -3, borderColor: "rgba(255,255,255,0.15)" }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl transition-all duration-300"
          >
            <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Your Quick Profile</h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border-2 border-white/10 flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/20">
                {user.avatar || '🎓'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-100 truncate">{user.displayName}</div>
                <div className="text-xs text-slate-500 truncate">@{user.username}</div>
              </div>
            </div>
            {user.university && (
              <div className="mt-5 pt-4 border-t border-white/10 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="truncate">{user.university}</span>
                </div>
                {user.branch && (
                  <div className="text-[11px] text-slate-500 ml-5 font-semibold italic">
                    {user.branch} • {user.year || 'Student'}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <motion.div 
            whileHover={{ y: -3, borderColor: "rgba(99,102,241,0.3)" }}
            className="bg-gradient-to-br from-indigo-600/15 to-transparent border border-white/10 p-6 rounded-[32px] shadow-2xl space-y-4 relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -z-10" />
            <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">The PACE Ethos</h4>
            <ul className="text-xs text-slate-400 space-y-3 font-sans leading-relaxed">
              <li className="flex gap-2.5">
                <span className="text-indigo-400 font-bold">1</span>
                <span><strong>Learn</strong>: Focus on DBMS, coding, OS, or any academic study.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-violet-400 font-bold">2</span>
                <span><strong>Log</strong>: Write exactly what you completed in single entries.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-indigo-400 font-bold">3</span>
                <span><strong>Share</strong>: Keep streaks real and motivate friends with your feed!</span>
              </li>
            </ul>
          </motion.div>

          {/* Paco Mascot Interactive Guide Card */}
          <motion.div 
            whileHover={{ y: -3, borderColor: "rgba(255,255,255,0.15)" }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl transition-all duration-300 flex flex-col items-center text-center"
          >
            <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 self-start">Paco Your Partner</h4>
            <PacoMascot mode="guidance" />
            <p className="text-[11px] text-slate-500 mt-2 font-medium">Click Paco for active-recall techniques and tips!</p>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedUserId && (
          <StudentProfileModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            currentUser={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
