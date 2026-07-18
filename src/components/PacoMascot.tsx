/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, MotionValue } from 'motion/react';
import { 
  Sparkles, Trophy, Flame, Compass, Wrench, BookOpen, 
  BarChart3, HelpCircle, X, Users, Laptop, Code, Layers, 
  Settings, Eye, EyeOff, Activity, ShieldAlert, ArrowRight, Check
} from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';

interface PacoMascotProps {
  mode?: 'onboarding' | 'empty-state' | 'celebration' | 'guidance' | 'compact' | 'loading' | 'battle-won' | 'battle-lost' | 'no-friends' | 'no-resources' | 'no-logs' | 'no-battles' | 'no-clan' | 'profile-complete' | 'login-wait' | 'login-success' | 'signup-onboard';
  context?: 'analytics' | 'roadmaps' | 'battles' | 'clans' | 'resources' | 'settings';
  customTip?: string;
  className?: string;
  forceProfile?: UserProfile | null;
  
  // New props for floating system
  floating?: boolean;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
  
  // Input tracking
  focusedInput?: 'username' | 'password' | 'displayName' | 'university' | 'branch' | 'year' | null;
}

const FOX_ACADEMIC_TIPS = [
  "Study in 25-minute Pomodoro intervals. I'll watch the timer while you dive deep! 🦊⏱️",
  "A database normalization a day keeps redundant tables away. Clean code, sharp mind! ✨",
  "Teaching a concept to a friend (or a friendly fox!) locks in 90% of the knowledge.",
  "Tackle the hardest algorithms first thing in the morning when our focus is pristine! 🧠⚡",
  "Don't skip rest. Sleep is when your brain commits your study logs to long-term memory. 💤",
  "Consistency is our superpower. Even a brief 10-minute session keeps our daily streak burning! 🔥",
  "Clean code reads like a story. Keep your variables descriptive and your functions modular! 🦊💻",
  "Every small study log is a brick in the empire of your future. Keep building!"
];

const ONBOARDING_TIPS = [
  "Hi! I'm Paco, your strategic learning companion. Let's finish your profile to unlock our dashboard! 🦊✨",
  "Tell me which university and branch you're in, and I'll keep us connected with friends!",
  "A display name is how classmates will identify you in the real-time learning logs feed!"
];

const CELEBRATION_TIPS = [
  "Outstanding work! Paco is performing a joyful double-flip! Let's log more victories! 🏆🦊",
  "Consistency is the ultimate competitive edge. We're getting smarter by the second!",
  "A perfect milestone! Let's record this in the eternal PACE archives."
];

// Helper to check/set date strings
function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PacoMascot({
  mode = 'guidance',
  context,
  customTip,
  className = '',
  forceProfile,
  floating = false,
  onNavigate,
  activeTab,
  focusedInput = null
}: PacoMascotProps) {
  const [profile, setProfile] = useState<UserProfile | null>(forceProfile || null);
  const [speech, setSpeech] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);

  // Motion values and spring configs for lag-free, GPU-accelerated look-around tracking (re-render free)
  const mouseXValue = useMotionValue(0);
  const mouseYValue = useMotionValue(0);
  const mouseXSpring = useSpring(mouseXValue, { stiffness: 180, damping: 25 });
  const mouseYSpring = useSpring(mouseYValue, { stiffness: 180, damping: 25 });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus tracking lock: automatically pivot mascot's look position when user focuses on credential input fields
  useEffect(() => {
    if (focusedInput) {
      if (focusedInput === 'password') {
        mouseXValue.set(-14);
        mouseYValue.set(-4);
      } else {
        mouseXValue.set(14);
        mouseYValue.set(5);
      }
    } else {
      mouseXValue.set(0);
      mouseYValue.set(0);
    }
  }, [focusedInput, mouseXValue, mouseYValue]);

  // Trigger talking lip-sync animations when speech or bubble key changes
  useEffect(() => {
    if (speech) {
      setIsTalking(true);
      const timer = setTimeout(() => {
        setIsTalking(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [speech, bubbleKey]);

  // Accessibility Settings (Disable animations, Reduce motion, Hide mascot, Completely hidden)
  const [accSettings, setAccSettings] = useState(() => {
    const saved = localStorage.getItem('paco_accessibility_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      disableAnimations: false,
      reduceMotion: false,
      hideMascot: false,
      completelyHidden: false
    };
  });

  // Sync settings with server database on load
  useEffect(() => {
    async function loadDbSettings() {
      if (api.getToken()) {
        try {
          const settings = await api.getSettings();
          if (settings.pacoSettings) {
            setAccSettings(settings.pacoSettings);
            localStorage.setItem('paco_accessibility_settings', JSON.stringify(settings.pacoSettings));
            window.dispatchEvent(new Event('paco_settings_updated'));
          }
          if (settings.connectedPlatforms) {
            localStorage.setItem('pace_connected_platforms', JSON.stringify(settings.connectedPlatforms));
            window.dispatchEvent(new Event('pace_platforms_updated'));
          }
        } catch (e) {
          console.error('Mascot was unable to load settings from DB:', e);
        }
      }
    }
    loadDbSettings();
  }, [profile?.id]);

  // Track if we just had an action
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync profile when forceProfile changes
  useEffect(() => {
    if (forceProfile) {
      setProfile(forceProfile);
    }
  }, [forceProfile]);

  // Fetch profile if not provided to fuel the state machine
  useEffect(() => {
    if (forceProfile) return;
    async function loadMascotProfile() {
      if (api.getToken()) {
        try {
          const userProfile = await api.me();
          setProfile(userProfile);
        } catch (e) {
          console.warn('Mascot was unable to fetch user profile for state machine.', e);
        }
      }
    }
    loadMascotProfile();
  }, [forceProfile]);

  // Handle local storage change events to sync multiple Paco instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'paco_accessibility_settings') {
        try {
          const parsed = JSON.parse(e.newValue || '{}');
          setAccSettings(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateAccessibility = async (updated: Partial<typeof accSettings>) => {
    const merged = { ...accSettings, ...updated };
    setAccSettings(merged);
    localStorage.setItem('paco_accessibility_settings', JSON.stringify(merged));
    
    // Dispatch local event to update other instances in the same tab
    window.dispatchEvent(new Event('paco_settings_updated'));

    try {
      await api.updateSettings({ pacoSettings: merged });
    } catch (e) {
      console.error('Failed to sync mascot settings to DB from Mascot:', e);
    }
  };

  useEffect(() => {
    const handleLocalUpdate = () => {
      const saved = localStorage.getItem('paco_accessibility_settings');
      if (saved) {
        try {
          setAccSettings(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('paco_settings_updated', handleLocalUpdate);
    return () => window.removeEventListener('paco_settings_updated', handleLocalUpdate);
  }, []);

  // Idle Timer logic
  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 15000); // 15 seconds to switch to idle
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [mode, context, activeTab, speech]);

  // Quiet on tab change: update dialogue behind the scenes but remain collapsed
  const lastTabRef = useRef(activeTab);
  useEffect(() => {
    if (floating && activeTab && activeTab !== lastTabRef.current) {
      lastTabRef.current = activeTab;
      // Do not auto-expand on tab changes. Keep him collapsed and non-intrusive.
      setIsExpanded(false);
      setBubbleKey(k => k + 1);
    }
  }, [floating, activeTab]);

  // Choose dialogue and text
  useEffect(() => {
    if (customTip) {
      setSpeech(customTip);
      return;
    }

    if (floating) {
      // Custom dialogue based on page context for floating panel
      if (activeTab === 'home') {
        const todayStr = getDateString();
        const loggedToday = profile?.lastActiveDate === todayStr;
        if (loggedToday) {
          setSpeech("Awesome job completing your study today! Paco is performing a joyful double-flip! 🦊🔥");
        } else {
          setSpeech("Ready for today's progress? Let's log your first learning session and build your streak.");
        }
      } else if (activeTab === 'log') {
        setSpeech("Log your active study session here. Keep it structured and clear for your friends!");
      } else if (activeTab === 'people') {
        setSpeech("Looking through binoculars... Let's find classmate peers and build our network! 🔍");
      } else if (activeTab === 'profile') {
        setSpeech("This is our command center! Update your stats, customize bio, and audit achievements.");
      } else {
        setSpeech(FOX_ACADEMIC_TIPS[Math.floor(Math.random() * FOX_ACADEMIC_TIPS.length)]);
      }
      return;
    }

    switch (mode) {
      case 'onboarding':
      case 'signup-onboard':
        setSpeech(ONBOARDING_TIPS[0]);
        break;
      case 'celebration':
      case 'profile-complete':
        setSpeech(CELEBRATION_TIPS[Math.floor(Math.random() * CELEBRATION_TIPS.length)]);
        break;
      case 'empty-state':
        setSpeech("A brand new slate! Let's log our first learning session and start building our streak.");
        break;
      case 'battle-won':
        setSpeech("Incredible! Battle won! Our training is paying off beautifully! 🏆🦊");
        break;
      case 'battle-lost':
        setSpeech("You'll come back stronger. Every setback is just data for our next victory!");
        break;
      case 'login-wait':
        setSpeech("Waiting beside the gates... Let's get checked in to enter our study dashboard!");
        break;
      case 'login-success':
        setSpeech("Success! Welcome back! Let's zoom into our workspace! 🚀🦊");
        break;
      case 'no-friends':
        setSpeech("Scanning the perimeter... No classmates found yet! Let's invite friends to share logs!");
        break;
      case 'no-resources':
        setSpeech("The archives are quiet. Let's add our first educational guide or textbook here!");
        break;
      case 'no-logs':
        setSpeech("No logs for today. Let's document our learning and keep our streak burning bright!");
        break;
      case 'no-battles':
        setSpeech("The practice arena is waiting. Let's find an academic sparring partner!");
        break;
      case 'no-clan':
        setSpeech("A solo adventurer! Or we can join a Clan to multiply our collective brainpower!");
        break;
      case 'loading':
        setSpeech("Compiling assets, running optimizations... Cozy up by my campfire! 🔥🦊");
        break;
      default:
        if (context === 'analytics') {
          setSpeech("Let's analyze our high-productivity zones and see what areas we can optimize today.");
        } else if (context === 'roadmaps') {
          setSpeech("Charting out our future! Follow this path to structural mastery.");
        } else if (context === 'battles') {
          setSpeech("Focus on precision. A disciplined mind wins the battle of ideas! ⚔️");
        } else if (context === 'clans') {
          setSpeech("Strength in numbers! Waving our banner high on the PACE leaderboard!");
        } else if (context === 'resources') {
          setSpeech("Knowledge is power. Grab a textbook and let's absorb some fresh paradigms!");
        } else if (context === 'settings') {
          setSpeech("Calibrating our dashboard preferences... Making our ledger feel like home.");
        } else {
          setSpeech(FOX_ACADEMIC_TIPS[Math.floor(Math.random() * FOX_ACADEMIC_TIPS.length)]);
        }
    }
  }, [mode, context, customTip, activeTab, floating, profile]);

  // Cursor tracking loop (Disable if reduceMotion is on)
  useEffect(() => {
    if (accSettings.reduceMotion) {
      mouseXValue.set(0);
      mouseYValue.set(0);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (focusedInput) return; // Lock look direction when focus is locked
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const limit = 400; // sensitivity limit
      const factor = Math.min(dist / limit, 1);
      const angle = Math.atan2(deltaY, deltaX);

      mouseXValue.set(Math.cos(angle) * factor * 5.0);
      mouseYValue.set(Math.sin(angle) * factor * 3.5);
      resetIdleTimer();
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [accSettings.reduceMotion, focusedInput, mouseXValue, mouseYValue]);

  const cycleTip = () => {
    resetIdleTimer();
    setBubbleKey(prev => prev + 1);
    if (mode === 'onboarding' || mode === 'signup-onboard') {
      const next = ONBOARDING_TIPS[Math.floor(Math.random() * ONBOARDING_TIPS.length)];
      setSpeech(next);
    } else if (mode === 'celebration') {
      const next = CELEBRATION_TIPS[Math.floor(Math.random() * CELEBRATION_TIPS.length)];
      setSpeech(next);
    } else {
      const next = FOX_ACADEMIC_TIPS[Math.floor(Math.random() * FOX_ACADEMIC_TIPS.length)];
      setSpeech(next);
    }
  };

  // Determine Level and Streaks
  const paceScore = (profile?.totalLogs || 0) * 150;
  const level = Math.floor(paceScore / 500) + 1;
  const streak = profile?.streak || 0;

  // Retrieve Connected Integrations
  const [integrations, setIntegrations] = useState({ github: false, leetcode: false });
  useEffect(() => {
    const handlePlatformsUpdate = () => {
      const saved = localStorage.getItem('pace_connected_platforms');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setIntegrations({
            github: parsed.github ?? false,
            leetcode: parsed.leetcode ?? false
          });
        } catch (e) {}
      }
    };
    handlePlatformsUpdate();
    window.addEventListener('pace_platforms_updated', handlePlatformsUpdate);
    return () => window.removeEventListener('pace_platforms_updated', handlePlatformsUpdate);
  }, []);

  // Determine active emotional state matching the 8-state model
  const getActiveEmotion = (): 'happy' | 'sleepy' | 'thinking' | 'confident' | 'celebration' | 'surprised' | 'concerned' | 'proud' => {
    if (isIdle) return 'sleepy';
    if (focusedInput === 'password') return 'sleepy'; // polite look-away/eyes closed
    if (mode === 'celebration' || mode === 'battle-won' || mode === 'profile-complete') return 'celebration';
    if (mode === 'login-success') return 'proud';
    
    // Inactive for several days (Streak broken)
    if (profile && profile.streak === 0 && profile.lastActiveDate) {
      const lastActive = new Date(profile.lastActiveDate);
      const diffDays = Math.ceil(Math.abs(Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 3) {
        return 'concerned';
      }
    }

    // Motivating if hasn't studied today
    const todayStr = getDateString();
    if (profile && profile.lastActiveDate !== todayStr && activeTab === 'home') {
      return 'confident';
    }

    // Connected integrations or first additions
    if (integrations.github || integrations.leetcode || (profile && profile.friendsCount && profile.friendsCount > 0)) {
      if (activeTab === 'profile') return 'proud';
    }

    // Onboarding / loading states
    if (mode === 'signup-onboard' || mode === 'onboarding') return 'confident';
    if (mode === 'loading') return 'thinking';

    // Context map
    if (context === 'analytics' || activeTab === 'profile') return 'thinking';
    if (context === 'resources') return 'confident';
    if (mode === 'no-friends' || mode === 'no-logs' || mode === 'no-battles') return 'surprised';
    if (mode === 'battle-lost' || mode === 'no-clan') return 'concerned';

    return 'happy'; // Default cozy state
  };

  const emotion = getActiveEmotion();

  // Greeting based on local time
  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning';
    if (hr >= 12 && hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isCompact = mode === 'compact';

  // Define spring transitions unless disabled or reduced motion
  const animateProp = (defaultVal: any, disabledVal: any) => {
    return (accSettings.disableAnimations || accSettings.reduceMotion) ? disabledVal : defaultVal;
  };

  // If completely hidden, do not render floating widget at all
  if (accSettings.completelyHidden && floating) {
    return null;
  }

  // --- FLOATING COMPACT PANEL LAYOUT ---
  if (floating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              initial={animateProp({ opacity: 0, scale: 0.9, y: 30 }, { opacity: 0 })}
              animate={animateProp({ opacity: 1, scale: 1, y: 0 }, { opacity: 1 })}
              exit={animateProp({ opacity: 0, scale: 0.9, y: 20 }, { opacity: 0 })}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              className="bg-slate-950/90 border border-white/10 rounded-[32px] w-[340px] md:w-[380px] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col gap-4 text-left border-t-white/15 overflow-hidden relative"
              id="paco-floating-expanded-panel"
            >
              {/* Star Particle burst (premium celebration) */}
              {emotion === 'celebration' && !accSettings.reduceMotion && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 0, x: 190, y: 110 }}
                      animate={{
                        opacity: [1, 1, 0],
                        scale: [0.5, 1.2, 0.5],
                        x: 190 + (Math.random() - 0.5) * 160,
                        y: 110 + (Math.random() - 0.5) * 120,
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute text-yellow-400"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Panel Top Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-extrabold">PACE Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Accessibility Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label="Collapse panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Accessibility Settings Drawer */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col gap-2.5 text-xs text-slate-300"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mascot Settings</div>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span>Disable animations</span>
                      <input
                        type="checkbox"
                        checked={accSettings.disableAnimations}
                        onChange={(e) => updateAccessibility({ disableAnimations: e.target.checked })}
                        className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <span>Reduce motion</span>
                      <input
                        type="checkbox"
                        checked={accSettings.reduceMotion}
                        onChange={(e) => updateAccessibility({ reduceMotion: e.target.checked })}
                        className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <span>Hide mascot (Text notifications only)</span>
                      <input
                        type="checkbox"
                        checked={accSettings.hideMascot}
                        onChange={(e) => updateAccessibility({ hideMascot: e.target.checked })}
                        className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group text-red-400">
                      <span>Hide assistant completely</span>
                      <input
                        type="checkbox"
                        checked={accSettings.completelyHidden}
                        onChange={(e) => updateAccessibility({ completelyHidden: e.target.checked })}
                        className="rounded border-red-500/30 bg-slate-900 text-red-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Central Mascot & Speech Balloon Column */}
              <div className="flex items-start gap-4">
                {/* Adorable Fox Graphic */}
                {!accSettings.hideMascot && (
                  <div className="w-[84px] h-[84px] shrink-0 bg-gradient-to-b from-orange-500/10 to-indigo-500/5 rounded-2xl flex items-center justify-center border border-white/5 relative group overflow-visible">
                    <PacoMascotGraphic 
                      emotion={emotion} 
                      streak={streak} 
                      level={level} 
                      mouseX={mouseXSpring}
                      mouseY={mouseYSpring}
                      accSettings={accSettings}
                    />
                  </div>
                )}

                {/* Speech notification area */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 font-semibold">
                    {getTimeGreeting()}, {profile?.displayName || profile?.username || 'Learner'}
                  </div>
                  <div className="text-[13px] text-slate-100 font-medium leading-relaxed mt-1 text-wrap break-words">
                    {speech}
                  </div>
                </div>
              </div>

              {/* Log Session CTA action button */}
              {onNavigate && activeTab !== 'log' && (
                <button
                  onClick={() => {
                    onNavigate('log');
                    setIsExpanded(false);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-[0_8px_24px_rgba(99,102,241,0.25)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.4)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 duration-200"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-300 fill-orange-300" />
                  <span>Log Study Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {activeTab === 'log' && (
                <div className="w-full text-center text-[11px] text-indigo-400/80 font-mono font-bold bg-indigo-500/5 border border-indigo-500/10 rounded-xl py-2 px-3">
                  ⚡ Write your progress details below to commit your study log!
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today's Tip</span>
                  <button
                    onClick={cycleTip}
                    className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Next Tip</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Remember: Consistency is your superpower. Small steps build giant empires! 🦊🚀
                </p>
              </div>
            </motion.div>
          ) : (
            /* COLLAPSED FLOATING COMPACT FAB */
            <motion.button
              key="collapsed-fab"
              onClick={() => setIsExpanded(true)}
              initial={animateProp({ scale: 0.8, opacity: 0 }, { opacity: 0 })}
              animate={animateProp({ scale: 1, opacity: 1 }, { opacity: 1 })}
              exit={animateProp({ scale: 0.8, opacity: 0 }, { opacity: 0 })}
              whileHover={animateProp({ scale: 1.06, y: -2 }, {})}
              className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center cursor-pointer shadow-[0_12px_36px_rgba(0,0,0,0.5)] hover:border-indigo-500/30 transition-all duration-300 relative group overflow-visible"
              title="Speak with Paco"
              id="paco-floating-fab"
            >
              <div className="absolute inset-0 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/10 blur-xl transition-all duration-300" />
              
              {/* Adorable little peeking Paco head */}
              <div className="w-11 h-11 relative overflow-visible flex items-center justify-center">
                <PacoMascotGraphic 
                  emotion={emotion} 
                  streak={streak} 
                  level={level} 
                  mouseX={mouseXSpring}
                  mouseY={mouseYSpring}
                  accSettings={accSettings}
                />
              </div>

              {/* Red notification dot showing status activity */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-indigo-500 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- STANDARD INLINE COMPACT STATE ---
  if (isCompact) {
    return (
      <div className={`flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl ${className}`} id="paco-inline-compact">
        {!accSettings.hideMascot && (
          <div className="w-11 h-11 shrink-0 overflow-visible relative">
            <PacoMascotGraphic 
              emotion={emotion} 
              streak={streak} 
              level={level} 
              mouseX={mouseXSpring}
              mouseY={mouseYSpring}
              accSettings={accSettings}
            />
          </div>
        )}
        <div className="text-left min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-200 truncate">{customTip || speech}</div>
          <div className="text-[9px] text-slate-500 font-medium mt-0.5">PACE Study Companion • Level {level}</div>
        </div>
      </div>
    );
  }

  // --- STANDARD INLINE GENERAL MULTI-EMOTION LAYOUT ---
  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center justify-center relative ${className}`}
      id="paco-mascot-container"
    >
      {/* Speech Bubble (Redesigned with beautiful round speech balloon, small tail, comfortable line wraps) */}
      <AnimatePresence mode="wait">
        {speech && (
          <motion.div
            key={bubbleKey}
            initial={animateProp({ opacity: 0, y: 15, scale: 0.94 }, { opacity: 0 })}
            animate={animateProp({ opacity: 1, y: 0, scale: 1 }, { opacity: 1 })}
            exit={animateProp({ opacity: 0, y: -10, scale: 0.94 }, { opacity: 0 })}
            transition={{ type: "spring", stiffness: 150, damping: 16 }}
            className="absolute bottom-[118%] left-[-40px] md:left-[-100px] bg-slate-950/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.7)] w-[340px] text-left z-20 pointer-events-auto border-t-white/15 overflow-visible"
            id="paco-speech-bubble"
          >
            {/* Elegant curved tail pointing directly to Fox */}
            <svg className="absolute top-[98%] left-16 md:left-[116px] w-8 h-8 text-slate-950/95 pointer-events-none overflow-visible" viewBox="0 0 32 32" fill="currentColor">
              <path d="M0 0 C8 12, 14 20, 16 30 C12 20, 4 10, 0 0" />
              {/* Thin border matching bubble border */}
              <path d="M0 0 C8 12, 14 20, 16 30" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
            </svg>

            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Paco Companion</span>
            </div>

            <p className="text-[15px] text-slate-100 font-medium leading-[1.65] font-sans text-wrap break-words">
              {speech}
            </p>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <button
                onClick={cycleTip}
                className="text-[10px] text-indigo-400 font-extrabold hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                id="paco-next-tip-btn"
              >
                <Sparkles className="w-3 h-3" />
                <span>Next strategy</span>
              </button>
              <button
                onClick={() => setSpeech(null)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-0.5 uppercase tracking-wider font-semibold"
                aria-label="Close speech bubble"
                id="paco-dismiss-bubble-btn"
              >
                <X className="w-3 h-3" />
                <span>Dismiss</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Fox Body with sliding enter animation */}
      {!accSettings.hideMascot && (
        <motion.div
          initial={animateProp({ x: -20, opacity: 0 }, { opacity: 0 })}
          animate={animateProp({ x: 0, opacity: 1 }, { opacity: 1 })}
          transition={{ type: "spring", stiffness: 100, damping: 14 }}
          onClick={cycleTip}
          className="relative cursor-pointer group select-none will-change-transform"
          title="Click Paco for a fresh study tip! 🦊"
          id="paco-mascot-interactive"
        >
          {/* Soft background aura (breathes and expands on hover) */}
          <div className="absolute inset-0 bg-orange-500/10 rounded-full filter blur-xl scale-90 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none -z-10" />

          {/* Sparkle animations for Happy/Celebration */}
          {emotion === 'celebration' && !accSettings.reduceMotion && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [-10, -50],
                    x: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 120],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.5]
                  }}
                  transition={{ duration: 2.0, repeat: Infinity, delay: i * 0.4 }}
                  className="absolute text-yellow-400"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              ))}
            </div>
          )}

          <div className="w-[130px] h-[130px] overflow-visible">
            <PacoMascotGraphic 
              emotion={emotion} 
              streak={streak} 
              level={level} 
              mouseX={mouseXSpring}
              mouseY={mouseYSpring}
              accSettings={accSettings}
              context={context}
              mode={mode}
              isTalking={isTalking}
            />
          </div>

          {/* Small sparkle floating on side for streak power visual indicator */}
          {streak >= 7 && (
            <motion.div
              animate={animateProp({
                scale: [1, 1.2, 0.9, 1],
                opacity: [0.4, 0.8, 0.4, 0.4],
              }, {})}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-1.5 -right-1.5 text-yellow-400"
              id="paco-sparkle-indicator"
            >
              <Flame className="w-5.5 h-5.5 filter drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* =========================================================================
   PACO MASCOT GRAPHIC (PREMIUM HIGH-PERFORMANCE INTERPOLATED VECTOR GRAPHIC)
   ========================================================================= */

interface MascotGraphicProps {
  emotion: 'happy' | 'sleepy' | 'thinking' | 'confident' | 'celebration' | 'surprised' | 'concerned' | 'proud';
  streak: number;
  level: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  accSettings: { disableAnimations: boolean; reduceMotion: boolean; hideMascot: boolean };
  context?: string;
  mode?: string;
  isTalking?: boolean;
}

function PacoMascotGraphic({
  emotion,
  streak,
  level,
  mouseX,
  mouseY,
  accSettings,
  context,
  mode,
  isTalking = false
}: MascotGraphicProps) {
  
  // Custom breathing config
  const getBreathingDuration = () => {
    if (emotion === 'sleepy') return 6.0;
    if (emotion === 'celebration' || emotion === 'proud') return 1.8;
    return 4.0;
  };

  const isMotionDisabled = accSettings.disableAnimations || accSettings.reduceMotion;

  // GPU dynamic offsets using useTransform mapping (avoids triggering React re-renders)
  const headX = useTransform(mouseX, (x) => isMotionDisabled ? 0 : x * (emotion === 'confident' ? 1.4 : 0.9));
  const headY = useTransform(mouseY, (y) => isMotionDisabled ? 0 : y - (emotion === 'celebration' ? 12 : 1));
  const eyeX = useTransform(mouseX, (x) => isMotionDisabled ? 0 : x * 0.45);
  const eyeY = useTransform(mouseY, (y) => isMotionDisabled ? 0 : y * 0.45);

  const [speakPulse, setSpeakPulse] = useState(false);
  useEffect(() => {
    if (!isTalking) return;
    const interval = setInterval(() => {
      setSpeakPulse(p => !p);
    }, 180);
    return () => clearInterval(interval);
  }, [isTalking]);

  const getMouthPath = () => {
    if (isTalking) {
      return speakPulse 
        ? "M 94 122 Q 100 129, 106 122 Z" // open
        : "M 94 123 Q 100 125, 106 123";   // closed
    }
    if (emotion === 'celebration' || emotion === 'happy' || emotion === 'proud') {
      return "M 92 121 Q 100 130, 108 121 Z"; // Big open smile
    }
    if (emotion === 'concerned') {
      return "M 94 125 Q 100 121, 106 125"; // Frown
    }
    if (emotion === 'thinking' || emotion === 'surprised') {
      return "M 96 122 Q 100 128, 104 122 Z"; // Surprised/Thinking little O-mouth
    }
    if (emotion === 'confident') {
      return "M 94 122 Q 100 123, 106 121"; // Smirk/Confident line
    }
    if (emotion === 'sleepy') {
      return "M 95 123 Q 100 125, 105 123"; // Little flat line
    }
    return "M 94 122 Q 100 126, 106 122"; // Calm smile
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] overflow-visible"
    >
      <defs>
        {/* Primary Orange Gradient */}
        <linearGradient id="foxOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2876e" />
          <stop offset="100%" stopColor="#aa4832" />
        </linearGradient>

        {/* Light Orange/Cheek Gradient */}
        <linearGradient id="foxOrangeLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9a28b" />
          <stop offset="100%" stopColor="#e2876e" />
        </linearGradient>

        {/* Premium Fur White Gradient */}
        <linearGradient id="foxWhite" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdfdfe" stopOpacity={0.99} />
          <stop offset="100%" stopColor="#eef1f6" stopOpacity={0.90} />
        </linearGradient>

        {/* Snout Gradient */}
        <linearGradient id="foxSnout" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#faf0ea" />
          <stop offset="100%" stopColor="#ecd3c5" />
        </linearGradient>

        {/* Inner Ear Dark Gradient */}
        <linearGradient id="innerEar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c1a16" />
          <stop offset="100%" stopColor="#140a08" />
        </linearGradient>

        {/* Glowing Collar Gradient */}
        <linearGradient id="glowingCollar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Scarf Gradient */}
        <linearGradient id="glowingScarf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        {/* Crystal Companion Gradient */}
        <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Gold Trophy/Crown Gradient */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="100" cy="178" rx="55" ry="9" fill="rgba(0,0,0,0.32)" filter="blur(3.5px)" />
      <ellipse cx="100" cy="178" rx="35" ry="5.5" fill="rgba(0,0,0,0.18)" />

      {/* TAIL (Naturally animated using spring curves) */}
      <motion.g
        id="paco-tail"
        style={{ transformOrigin: "128px 154px" }}
        animate={isMotionDisabled ? { rotate: 0 } : {
          rotate: emotion === 'celebration' || emotion === 'proud' 
            ? [-16, 22, -16] 
            : emotion === 'concerned'
            ? [-15, -11, -15] // Drooped low
            : [-5, 6, -5],
          scale: emotion === 'proud' ? [1, 1.05, 1] : 1
        }}
        transition={{
          duration: emotion === 'celebration' || emotion === 'proud' ? 1.5 : 4.0,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <path d="M 115 146 C 132 140, 172 118, 166 84 C 162 76, 142 98, 122 125 C 114 135, 110 141, 115 146 Z" fill="url(#foxOrange)" />
        <path d="M 166 84 C 162 76, 148 86, 138 98 C 145 102, 158 96, 166 84 Z" fill="url(#foxWhite)" />
        
        {/* Tail Glow for Level 100+ */}
        {level >= 100 && (
          <path
            d="M 115 146 C 132 140, 172 118, 166 84 C 162 76, 142 98, 122 125"
            stroke="#ff7a45"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
            filter="drop-shadow(0 0 5px #ff7a45)"
          />
        )}
      </motion.g>

      {/* BACK COZY SITTING FEET */}
      <g id="paco-back-feet">
        {/* Left foot */}
        <path d="M 52 146 C 40 146, 36 168, 54 172 C 68 174, 76 156, 70 146 Z" fill="url(#foxOrangeLight)" />
        <circle cx="53" cy="167" r="6" fill="url(#foxWhite)" />
        <circle cx="45" cy="162" r="2.5" fill="url(#foxWhite)" />
        <circle cx="53" cy="159" r="2.5" fill="url(#foxWhite)" />
        <circle cx="61" cy="162" r="2.5" fill="url(#foxWhite)" />

        {/* Right foot */}
        <path d="M 148 146 C 160 146, 164 168, 146 172 C 132 174, 124 156, 130 146 Z" fill="url(#foxOrangeLight)" />
        <circle cx="147" cy="167" r="6" fill="url(#foxWhite)" />
        <circle cx="139" cy="162" r="2.5" fill="url(#foxWhite)" />
        <circle cx="147" cy="159" r="2.5" fill="url(#foxWhite)" />
        <circle cx="155" cy="162" r="2.5" fill="url(#foxWhite)" />
      </g>

      {/* TORSO / BODY BREATHING SYSTEM */}
      <motion.g
        id="paco-torso"
        animate={isMotionDisabled ? { scaleY: 1, y: 0 } : {
          y: emotion === 'celebration' ? [0, -18, 0] : [0, -2.5, 0], // Jump animations
          scaleY: emotion === 'sleepy' ? [1, 1.01, 1] : [1, 1.025, 1],
          rotate: emotion === 'celebration' ? [0, 360] : 0
        }}
        transition={{
          duration: getBreathingDuration(),
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ transformOrigin: "100px 170px" }}
      >
        <path d="M 68 118 Q 100 95 132 118 L 140 162 Q 100 174 60 162 Z" fill="url(#foxOrange)" />
        <path d="M 82 120 Q 100 108 118 120 L 126 154 Q 100 172 74 154 Z" fill="url(#foxWhite)" />
      </motion.g>

      {/* HEAD & EARS SYSTEM (Features spring-driven head tilting & cursor tracking) */}
      <motion.g
        id="paco-head"
        style={{
          transformOrigin: "100px 120px",
          x: headX,
          y: headY
        }}
        animate={isMotionDisabled ? { rotate: 0 } : {
          rotate: emotion === 'thinking' ? 6 : emotion === 'concerned' ? -4 : emotion === 'confident' ? 3 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 110,
          damping: 18
        }}
      >
        {/* LEFT EAR (Occasional cute micro-twitching) */}
        <motion.path
          id="paco-ear-left"
          style={{ transformOrigin: "66px 72px" }}
          animate={isMotionDisabled ? { rotate: 0 } : {
            rotate: emotion === 'sleepy' ? [0, -2, 0] : [0, -8, 6, -3, 0]
          }}
          transition={{
            duration: 6.0,
            repeat: Infinity,
            repeatDelay: 3.5,
            ease: "easeInOut"
          }}
          d="M 66 72 L 46 26 C 58 20, 78 32, 80 58 Z"
          fill="url(#foxOrange)"
          stroke="#e0411a"
          strokeWidth="0.5"
        />
        <path d="M 64 66 L 50 33 C 58 28, 72 38, 74 54 Z" fill="url(#innerEar)" />

        {/* RIGHT EAR (Occasional cute micro-twitching) */}
        <motion.path
          id="paco-ear-right"
          style={{ transformOrigin: "134px 72px" }}
          animate={isMotionDisabled ? { rotate: 0 } : {
            rotate: emotion === 'sleepy' ? [0, 3, 0] : [0, 9, -5, 3, 0]
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: "easeInOut"
          }}
          d="M 134 72 L 154 26 C 142 20, 122 32, 120 58 Z"
          fill="url(#foxOrange)"
          stroke="#e0411a"
          strokeWidth="0.5"
        />
        <path d="M 136 66 L 150 33 C 142 28, 128 38, 126 54 Z" fill="url(#innerEar)" />

        {/* MAIN FACE GEOMETRY */}
        <path d="M 100 48 L 154 84 C 154 112, 128 124, 100 124 C 72 124, 46 112, 46 84 Z" fill="url(#foxOrange)" />

        {/* Cheek white fluffs */}
        <path d="M 46 84 C 46 106, 74 124, 100 124 L 100 94 C 78 94, 58 89, 46 84 Z" fill="url(#foxWhite)" />
        <path d="M 154 84 C 154 106, 126 124, 100 124 L 100 94 C 122 94, 142 89, 154 84 Z" fill="url(#foxWhite)" />

        {/* Snout with highlights */}
        <path d="M 84 92 L 100 123 L 116 92 Q 100 88, 84 92 Z" fill="url(#foxSnout)" />
        <ellipse cx="100" cy="120" rx="4.5" ry="2.8" fill="#1e293b" />

        {/* DYNAMIC SHAPE-SHIFTING MOUTH (Interpolates naturally with motion.path) */}
        <motion.path
          animate={{ d: getMouthPath() }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
          fill={emotion === 'celebration' || emotion === 'happy' || emotion === 'proud' || isTalking ? "#991b1b" : "none"}
          stroke="#1e293b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* DYNAMIC SPARKLE & SHIFTING EYES SYSTEM */}
        <g id="paco-eyes">
          {/* Left Eye */}
          <motion.g
            style={{ 
              transformOrigin: "78px 82px",
              x: eyeX,
              y: eyeY
            }}
            animate={isMotionDisabled ? { scaleY: 1 } : {
              scaleY: emotion === 'sleepy' ? [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] : [1, 1, 1, 1, 0, 1, 1, 1], // blinks organically
            }}
            transition={{
              scaleY: { duration: 4.8, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            {emotion === 'celebration' || emotion === 'happy' || emotion === 'proud' ? (
              // Sparkly happy curved eyes
              <path d="M 72 84 Q 78 77, 84 84" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            ) : emotion === 'sleepy' ? (
              // Sleeping closed curves
              <path d="M 72 83 Q 78 88, 84 83" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            ) : emotion === 'concerned' ? (
              // Concerned slanted line
              <path d="M 73 85 L 83 82" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            ) : emotion === 'confident' ? (
              // Cool confident squints
              <path d="M 72 82 L 84 82" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
            ) : emotion === 'surprised' ? (
              // Big round eyes
              <>
                <circle cx="78" cy="82" r="5" fill="#0f172a" />
                <circle cx="79.5" cy="80.5" r="1.5" fill="white" />
              </>
            ) : (
              // Classic smart/thinking eyes
              <>
                <ellipse cx="78" cy="82" rx="4.5" ry="3" fill="#0f172a" />
                <circle cx="79.5" cy="80.5" r="1.1" fill="white" />
              </>
            )}
          </motion.g>

          {/* Right Eye */}
          <motion.g
            style={{ 
              transformOrigin: "122px 82px",
              x: eyeX,
              y: eyeY
            }}
            animate={isMotionDisabled ? { scaleY: 1 } : {
              scaleY: emotion === 'sleepy' ? [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] : [1, 1, 1, 1, 0, 1, 1, 1],
            }}
            transition={{
              scaleY: { duration: 4.8, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            {emotion === 'celebration' || emotion === 'happy' || emotion === 'proud' ? (
              <path d="M 116 84 Q 122 77, 128 84" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            ) : emotion === 'sleepy' ? (
              <path d="M 116 83 Q 122 88, 128 83" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            ) : emotion === 'concerned' ? (
              <path d="M 117 82 L 127 85" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            ) : emotion === 'confident' ? (
              <path d="M 116 82 L 128 82" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
            ) : emotion === 'surprised' ? (
              <>
                <circle cx="122" cy="82" r="5" fill="#0f172a" />
                <circle cx="123.5" cy="80.5" r="1.5" fill="white" />
              </>
            ) : (
              <>
                <ellipse cx="122" cy="82" rx="4.5" ry="3" fill="#0f172a" />
                <circle cx="123.5" cy="80.5" r="1.1" fill="white" />
              </>
            )}
          </motion.g>
        </g>

        {/* Cute Whiskers */}
        <g id="paco-whiskers" opacity="0.38">
          <line x1="42" y1="94" x2="28" y2="92" stroke="#0f172a" strokeWidth="1" />
          <line x1="42" y1="99" x2="30" y2="100" stroke="#0f172a" strokeWidth="1" />
          <line x1="158" y1="94" x2="172" y2="92" stroke="#0f172a" strokeWidth="1" />
          <line x1="158" y1="99" x2="170" y2="100" stroke="#0f172a" strokeWidth="1" />
        </g>

        {/* Minimalist Golden Crown for 100+ Streak */}
        {streak >= 100 && (
          <g id="paco-crown" transform="translate(100, 32)">
            <polygon points="-12,0 -16,-12 -6,-4 0,-15 6,-4 16,-12 12,0" fill="url(#goldGrad)" stroke="#f59e0b" strokeWidth="0.5" filter="drop-shadow(0 0 3px #f59e0b)" />
          </g>
        )}
      </motion.g>

      {/* DYNAMIC ACCESSORIES */}
      {/* Level 10-29: Glowing collar */}
      {level >= 10 && level < 30 && (
        <ellipse
          cx="100"
          cy="114"
          rx="18"
          ry="3.5"
          fill="none"
          stroke="url(#glowingCollar)"
          strokeWidth="2.0"
          filter="drop-shadow(0 0 4.5px #06b6d4)"
        />
      )}

      {/* Level 30+: Scarf */}
      {level >= 30 && (
        <g id="paco-scarf">
          <path d="M 80 110 Q 100 120 120 110 C 123 116, 115 121, 100 121 C 85 121, 77 116, 80 110 Z" fill="url(#glowingScarf)" opacity="0.95" />
          <motion.path
            style={{ transformOrigin: "111px 116px" }}
            animate={isMotionDisabled ? { rotate: 0 } : { rotate: [-2, 6, -2] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            d="M 111 116 L 117 142 L 107 140 Z"
            fill="url(#glowingScarf)"
          />
        </g>
      )}

      {/* Level 50+: Floating Crystal companion */}
      {level >= 50 && (
        <motion.g
          id="paco-crystal"
          style={{ transformOrigin: "42px 70px" }}
          animate={isMotionDisabled ? { y: 0, rotate: 0 } : {
            y: [0, -6, 0],
            rotate: [0, 360]
          }}
          transition={{
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 16, repeat: Infinity, ease: "linear" }
          }}
        >
          <polygon points="42,58 50,70 42,82 34,70" fill="url(#crystalGrad)" filter="drop-shadow(0 0 5px #06b6d4)" />
          <polygon points="42,58 45,70 42,82 39,70" fill="#ffffff" opacity="0.25" />
        </motion.g>
      )}

      {/* CONTEXT SPECIFIC ITEMS */}
      {/* Analytics: Holding stat bars */}
      {context === 'analytics' && (
        <motion.g id="paco-context-analytics" animate={isMotionDisabled ? { y: 0 } : { y: [0, -1.5, 0] }} transition={{ duration: 3.0, repeat: Infinity }}>
          <rect x="135" y="125" width="22" height="18" rx="3.5" fill="rgba(6,182,212,0.18)" stroke="#06b6d4" strokeWidth="1" />
          <line x1="140" y1="138" x2="140" y2="132" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="146" y1="138" x2="146" y2="129" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="152" y1="138" x2="152" y2="134" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      )}

      {/* Friends / Binoculars */}
      {(mode === 'no-friends' || context === 'clans') && (
        <g id="paco-binoculars" transform="translate(88, 114)">
          <rect x="0" y="0" width="9" height="13" rx="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
          <rect x="13" y="0" width="9" height="13" rx="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
          <rect x="9" y="4" width="4" height="3" fill="#1e293b" />
          <circle cx="4.5" cy="13" r="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="0.6" />
          <circle cx="17.5" cy="13" r="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="0.6" />
        </g>
      )}

      {/* Trophy for victory / celebration */}
      {(emotion === 'celebration' || mode === 'battle-won') && (
        <motion.g id="paco-trophy-item" animate={isMotionDisabled ? { y: 0 } : { y: [0, -3, 0] }} transition={{ duration: 3.0, repeat: Infinity }} transform="translate(138, 124)">
          <path d="M -8 -12 L 8 -12 L 6 -2 L -6 -2 Z" fill="url(#goldGrad)" />
          <path d="M -1.5 -2 L 1.5 -2 L 1.5 6 L -1.5 6 Z" fill="url(#goldGrad)" />
          <rect x="-6" y="6" width="12" height="3.5" rx="1" fill="#78350f" />
          <path d="M -8 -9 Q -12 -9, -8 -5" stroke="url(#goldGrad)" strokeWidth="1.8" fill="none" />
          <path d="M 8 -9 Q 12 -9, 8 -5" stroke="url(#goldGrad)" strokeWidth="1.8" fill="none" />
        </motion.g>
      )}
    </svg>
  );
}
