/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, MotionValue, animate } from 'motion/react';
import { 
  Sparkles, Trophy, Flame, Compass, Wrench, BookOpen, 
  BarChart3, HelpCircle, X, Users, Laptop, Code, Layers, 
  Settings, Eye, EyeOff, Activity, ShieldAlert, ArrowRight, Check,
  Heart, Zap, Star, Moon, Sun, AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';

interface PacoMascotProps {
  mode?: 'onboarding' | 'empty-state' | 'celebration' | 'guidance' | 'compact' | 'loading' | 'battle-won' | 'battle-lost' | 'no-friends' | 'no-resources' | 'no-logs' | 'no-battles' | 'no-clan' | 'profile-complete' | 'login-wait' | 'login-success' | 'signup-onboard' | 'study-started' | 'study-completed' | 'level-up' | 'rank-up' | 'rank-down' | 'ai-thinking' | 'error' | 'success';
  context?: 'analytics' | 'roadmaps' | 'battles' | 'clans' | 'resources' | 'settings' | 'profile' | 'friends';
  customTip?: string;
  className?: string;
  forceProfile?: UserProfile | null;
  
  // Floating system
  floating?: boolean;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
  
  // Input tracking
  focusedInput?: 'username' | 'password' | 'displayName' | 'university' | 'branch' | 'year' | null;

  // Password animations
  passwordVisible?: boolean;
  passwordStrength?: 'weak' | 'medium' | 'strong' | 'excellent' | null;
  hasHiddenPasswordAgain?: boolean;
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

const PETTING_QUOTES = [
  "Hehe, that tickles! Let's conquer our study goals today! 🦊✨",
  "Tail wagging at maximum velocity! Ready to learn! 🔥",
  "Paco approves of your dedication! Keep going! 🚀",
  "Purrr... I mean, Yip! Let me watch over your focus session! 🎓"
];

// Play synthesized soft pet chime
function playPetChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch (e) {
    // Audio context prevented or unavailable
  }
}

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
  focusedInput = null,
  passwordVisible = false,
  passwordStrength = null,
  hasHiddenPasswordAgain = false
}: PacoMascotProps) {
  const [profile, setProfile] = useState<UserProfile | null>(forceProfile || null);
  const [speech, setSpeech] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);

  // Motion values and spring configs for lag-free, GPU-accelerated look-around tracking
  const mouseXValue = useMotionValue(0);
  const mouseYValue = useMotionValue(0);
  const mouseXSpring = useSpring(mouseXValue, { stiffness: 180, damping: 25 });
  const mouseYSpring = useSpring(mouseYValue, { stiffness: 180, damping: 25 });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [petHearts, setPetHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus tracking lock: automatically pivot mascot's look position when user focuses on credential input fields
  useEffect(() => {
    if (focusedInput) {
      if (focusedInput === 'password') {
        if (passwordVisible) {
          mouseXValue.set(16);
          mouseYValue.set(5);
        } else {
          mouseXValue.set(-18);
          mouseYValue.set(-4);
        }
      } else {
        mouseXValue.set(14);
        mouseYValue.set(5);
      }
    } else if (!isHovered) {
      mouseXValue.set(0);
      mouseYValue.set(0);
    }
  }, [focusedInput, passwordVisible, isHovered, mouseXValue, mouseYValue]);

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
      } catch (e) {}
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
      if (profile?.id && api.getToken()) {
        try {
          const settings = await api.getSettings();
          if (settings.pacoSettings) {
            setAccSettings(settings.pacoSettings);
            localStorage.setItem('paco_accessibility_settings', JSON.stringify(settings.pacoSettings));
            window.dispatchEvent(new Event('paco_settings_updated'));
          }
        } catch (e) {
          console.error('Mascot was unable to load settings from DB:', e);
        }
      }
    }
    loadDbSettings();
  }, [profile?.id]);

  // Track inactivity / sleep timer
  const [isIdle, setIsIdle] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync profile when forceProfile changes
  useEffect(() => {
    if (forceProfile) {
      setProfile(forceProfile);
    }
  }, [forceProfile]);

  // Fetch profile if not provided to fuel state machine
  useEffect(() => {
    if (forceProfile) return;
    async function loadMascotProfile() {
      if (api.getToken()) {
        try {
          const userProfile = await api.me();
          setProfile(userProfile);
        } catch (e) {}
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
    
    window.dispatchEvent(new Event('paco_settings_updated'));

    try {
      await api.updateSettings({ pacoSettings: merged });
    } catch (e) {
      console.error('Failed to sync mascot settings to DB:', e);
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

  const lastMouseMoveResetRef = useRef<number>(0);

  // Idle & Sleep Timer logic (15s -> Idle, 45s -> Sleep)
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    setIsSleeping(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 15000);

    sleepTimerRef.current = setTimeout(() => {
      setIsSleeping(true);
    }, 45000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [mode, context, activeTab, speech, resetIdleTimer]);

  // Tab navigation tracking
  const lastTabRef = useRef(activeTab);
  useEffect(() => {
    if (floating && activeTab && activeTab !== lastTabRef.current) {
      lastTabRef.current = activeTab;
      setIsExpanded(false);
      setBubbleKey(k => k + 1);
    }
  }, [floating, activeTab]);

  // Choose dialogue and text
  useEffect(() => {
    if (focusedInput) {
      if (focusedInput === 'password') {
        if (hasHiddenPasswordAgain && !passwordVisible) {
          setSpeech("😅 Sorry! I'll cover my eyes so your password stays private!");
        } else if (!passwordVisible) {
          if (passwordStrength === 'weak') {
            setSpeech("😟 Hmm... this one looks easy to guess. Let's add numbers and symbols!");
          } else if (passwordStrength === 'medium') {
            setSpeech("🙂 Getting better!");
          } else if (passwordStrength === 'strong') {
            setSpeech("😎 Now that's a secure password!");
          } else if (passwordStrength === 'excellent') {
            setSpeech("🎉 Excellent! That password is rock solid!");
          } else {
            setSpeech("I'll cover my eyes so you can type your password safely! 🦊🙈");
          }
        } else {
          // password visible!
          if (passwordStrength === 'weak') {
            setSpeech("😟 Easy to guess! Try adding special characters.");
          } else if (passwordStrength === 'medium') {
            setSpeech("🙂 Looking solid!");
          } else if (passwordStrength === 'strong') {
            setSpeech("😎 Very strong encryption!");
          } else if (passwordStrength === 'excellent') {
            setSpeech("🎉 Outstanding password security!");
          } else {
            setSpeech("👀 Peeking... curious what password you came up with!");
          }
        }
      } else if (focusedInput === 'username') {
        setSpeech("Ready to lock in your handle? Let's check our ledger credentials! 🔑🦊");
      } else if (focusedInput === 'displayName') {
        setSpeech("What name should I call you in our workspace? 🦊✨");
      } else if (focusedInput === 'university') {
        setSpeech("Which university are you studying at? Let's join forces! 🎓");
      } else if (focusedInput === 'branch') {
        setSpeech("What's your major branch? Let's specialize our brainpower! 💻");
      } else if (focusedInput === 'year') {
        setSpeech("Which year of study are we currently conqueror of? 📅");
      }
      return;
    }

    if (customTip) {
      setSpeech(customTip);
      return;
    }

    if (floating) {
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
      case 'study-completed':
      case 'level-up':
      case 'rank-up':
      case 'success':
        setSpeech(CELEBRATION_TIPS[Math.floor(Math.random() * CELEBRATION_TIPS.length)]);
        break;
      case 'study-started':
        setSpeech("Study session initiated! I'll hold our notebook and keep us distraction-free. 📖⚡");
        break;
      case 'rank-down':
        setSpeech("Every setback is fuel for a stronger comeback. Let's review our logs and conquer!");
        break;
      case 'empty-state':
        setSpeech("A brand new slate! Let me hold our study ledger while we log our first block.");
        break;
      case 'battle-won':
        setSpeech("Incredible! Battle won! Our academic training is paying off beautifully! 🏆🦊");
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
        setSpeech("The archives are quiet. Let me help you add our first educational guide or textbook here!");
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
      case 'ai-thinking':
        setSpeech("Compiling assets, running optimizations... Analyzing options for our next step! 🔥🦊");
        break;
      case 'error':
        setSpeech("Ouch! We ran into a hiccup. Let's double check our connection and try again.");
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
  }, [mode, context, customTip, activeTab, floating, profile, focusedInput, passwordVisible, passwordStrength, hasHiddenPasswordAgain]);

  // Cursor tracking loop
  useEffect(() => {
    if (accSettings.reduceMotion) {
      mouseXValue.set(0);
      mouseYValue.set(0);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (focusedInput) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const limit = 400;
      const factor = Math.min(dist / limit, 1);
      const angle = Math.atan2(deltaY, deltaX);

      mouseXValue.set(Math.cos(angle) * factor * 5.5);
      mouseYValue.set(Math.sin(angle) * factor * 3.8);

      const now = Date.now();
      if (now - lastMouseMoveResetRef.current > 2500) {
        lastMouseMoveResetRef.current = now;
        resetIdleTimer();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [accSettings.reduceMotion, focusedInput, mouseXValue, mouseYValue, resetIdleTimer]);

  const cycleTip = () => {
    resetIdleTimer();
    setBubbleKey(prev => prev + 1);
    if (mode === 'onboarding' || mode === 'signup-onboard') {
      const next = ONBOARDING_TIPS[Math.floor(Math.random() * ONBOARDING_TIPS.length)];
      setSpeech(next);
    } else if (mode === 'celebration' || mode === 'level-up' || mode === 'rank-up') {
      const next = CELEBRATION_TIPS[Math.floor(Math.random() * CELEBRATION_TIPS.length)];
      setSpeech(next);
    } else {
      const next = FOX_ACADEMIC_TIPS[Math.floor(Math.random() * FOX_ACADEMIC_TIPS.length)];
      setSpeech(next);
    }
  };

  // Handle clicking / petting Paco
  const handlePetPaco = (e: React.MouseEvent) => {
    resetIdleTimer();
    playPetChime();
    
    // Trigger floating heart particles
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const newHeart = { id: Date.now(), x: clickX, y: clickY };
    setPetHearts(prev => [...prev.slice(-4), newHeart]);

    // Choose petting response
    const quote = PETTING_QUOTES[Math.floor(Math.random() * PETTING_QUOTES.length)];
    setSpeech(quote);
    setBubbleKey(k => k + 1);
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

  // Determine active emotional state matching the 12-emotion model
  const getActiveEmotion = (): 'happy' | 'sleepy' | 'thinking' | 'curious' | 'confident' | 'excited' | 'relaxed' | 'concerned' | 'focused' | 'celebrating' | 'motivating' | 'surprised' => {
    if (isSleeping) return 'sleepy';
    if (isIdle) return 'relaxed';
    
    if (focusedInput === 'password') {
      if (passwordVisible) {
        if (passwordStrength === 'weak') return 'concerned';
        if (passwordStrength === 'medium') return 'curious';
        if (passwordStrength === 'strong') return 'confident';
        if (passwordStrength === 'excellent') return 'celebrating';
        return 'curious'; // Peeking
      }
      if (hasHiddenPasswordAgain) {
        return 'concerned';
      }
      return 'sleepy'; // Covered eyes / polite look-away
    }

    if (mode === 'celebration' || mode === 'battle-won' || mode === 'profile-complete' || mode === 'study-completed' || mode === 'level-up' || mode === 'rank-up' || mode === 'success') {
      return 'celebrating';
    }
    if (mode === 'login-success') return 'confident';
    if (mode === 'study-started') return 'focused';
    if (mode === 'rank-down' || mode === 'error' || mode === 'battle-lost') return 'concerned';
    
    // Inactive for several days
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
      return 'motivating';
    }

    // Connected integrations or first additions
    if (integrations.github || integrations.leetcode || (profile && profile.friendsCount && profile.friendsCount > 0)) {
      if (activeTab === 'profile') return 'confident';
    }

    // Onboarding / loading states
    if (mode === 'signup-onboard' || mode === 'onboarding') return 'curious';
    if (mode === 'loading' || mode === 'ai-thinking') return 'thinking';

    // Context map
    if (context === 'analytics' || activeTab === 'profile') return 'thinking';
    if (context === 'resources') return 'focused';
    if (mode === 'no-friends' || mode === 'no-logs' || mode === 'no-battles') return 'surprised';
    if (mode === 'no-clan') return 'concerned';

    return 'happy';
  };

  const emotion = getActiveEmotion();

  // Time Greeting
  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning';
    if (hr >= 12 && hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isCompact = mode === 'compact';

  // Define animation props respecting user preferences
  const animateProp = (defaultVal: any, disabledVal: any) => {
    return (accSettings.disableAnimations || accSettings.reduceMotion) ? disabledVal : defaultVal;
  };

  if (accSettings.completelyHidden && floating) {
    return null;
  }

  // FLOATING PANEL
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
              {/* Star Particle burst for celebration */}
              {emotion === 'celebrating' && !accSettings.reduceMotion && (
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
                  <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-extrabold">PACE Companion</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Mascot Settings"
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

              {/* Settings Drawer */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col gap-2.5 text-xs text-slate-300"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mascot Controls</div>
                    
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
                      <span>Hide mascot (Text only)</span>
                      <input
                        type="checkbox"
                        checked={accSettings.hideMascot}
                        onChange={(e) => updateAccessibility({ hideMascot: e.target.checked })}
                        className="rounded border-white/10 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group text-red-400">
                      <span>Hide companion completely</span>
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

              {/* Central Mascot & Speech */}
              <div className="flex items-start gap-4">
                {!accSettings.hideMascot && (
                  <div 
                    onClick={handlePetPaco}
                    className="w-[88px] h-[88px] shrink-0 bg-gradient-to-b from-orange-500/10 to-indigo-500/5 rounded-2xl flex items-center justify-center border border-white/5 relative group cursor-pointer overflow-visible"
                    title="Click to pet Paco! 🦊"
                  >
                    <PacoMascotGraphic 
                      emotion={emotion} 
                      streak={streak} 
                      level={level} 
                      mouseX={mouseXSpring}
                      mouseY={mouseYSpring}
                      accSettings={accSettings}
                      passwordVisible={passwordVisible}
                      isPasswordFocused={focusedInput === 'password'}
                      isHovered={isHovered}
                      isSleeping={isSleeping}
                    />

                    {/* Pet Heart Burst */}
                    <AnimatePresence>
                      {petHearts.map(h => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 1, scale: 0.5, y: h.y, x: h.x }}
                          animate={{ opacity: 0, scale: 1.5, y: h.y - 35, x: h.x + (Math.random() - 0.5) * 20 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          className="absolute pointer-events-none text-rose-400 z-30"
                        >
                          <Heart className="w-4 h-4 fill-rose-400" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

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
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today's Strategy</span>
                  <button
                    onClick={cycleTip}
                    className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Next Strategy</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Consistency is your superpower. Small steps build giant empires! 🦊🚀
                </p>
              </div>
            </motion.div>
          ) : (
            /* COLLAPSED FLOATING COMPACT FAB */
            <motion.button
              key="collapsed-fab"
              onClick={() => setIsExpanded(true)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              initial={animateProp({ scale: 0.8, opacity: 0 }, { opacity: 0 })}
              animate={animateProp({ scale: 1, opacity: 1 }, { opacity: 1 })}
              exit={animateProp({ scale: 0.8, opacity: 0 }, { opacity: 0 })}
              whileHover={animateProp({ scale: 1.06, y: -2 }, {})}
              className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center cursor-pointer shadow-[0_12px_36px_rgba(0,0,0,0.5)] hover:border-indigo-500/30 transition-all duration-300 relative group overflow-visible"
              title="Speak with Paco"
              id="paco-floating-fab"
            >
              <div className="absolute inset-0 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/10 blur-xl transition-all duration-300" />
              
              <div className="w-11 h-11 relative overflow-visible flex items-center justify-center">
                <PacoMascotGraphic 
                  emotion={emotion} 
                  streak={streak} 
                  level={level} 
                  mouseX={mouseXSpring}
                  mouseY={mouseYSpring}
                  accSettings={accSettings}
                  passwordVisible={passwordVisible}
                  isPasswordFocused={focusedInput === 'password'}
                  isHovered={isHovered}
                  isSleeping={isSleeping}
                />
              </div>

              {/* Status Dot */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-indigo-500 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // STANDARD INLINE COMPACT STATE
  if (isCompact) {
    return (
      <div className={`flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl ${className}`} id="paco-inline-compact">
        {!accSettings.hideMascot && (
          <div 
            onClick={handlePetPaco}
            className="w-11 h-11 shrink-0 overflow-visible relative cursor-pointer"
            title="Pet Paco! 🦊"
          >
            <PacoMascotGraphic 
              emotion={emotion} 
              streak={streak} 
              level={level} 
              mouseX={mouseXSpring}
              mouseY={mouseYSpring}
              accSettings={accSettings}
              passwordVisible={passwordVisible}
              isPasswordFocused={focusedInput === 'password'}
              isHovered={isHovered}
              isSleeping={isSleeping}
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

  // STANDARD INLINE GENERAL LAYOUT
  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center justify-center relative ${className}`}
      id="paco-mascot-container"
    >
      {/* Speech Bubble */}
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
            {/* Curved tail pointing to Fox */}
            <svg className="absolute top-[98%] left-16 md:left-[116px] w-8 h-8 text-slate-950/95 pointer-events-none overflow-visible" viewBox="0 0 32 32" fill="currentColor">
              <path d="M0 0 C8 12, 14 20, 16 30 C12 20, 4 10, 0 0" />
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

      {/* Fox Body */}
      {!accSettings.hideMascot && (
        <motion.div
          initial={animateProp({ x: -20, opacity: 0 }, { opacity: 0 })}
          animate={animateProp({ x: 0, opacity: 1 }, { opacity: 1 })}
          transition={{ type: "spring", stiffness: 100, damping: 14 }}
          onClick={handlePetPaco}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative cursor-pointer group select-none will-change-transform overflow-visible"
          title="Click Paco to pet him! 🦊"
          id="paco-mascot-interactive"
        >
          {/* Petting Hearts */}
          <AnimatePresence>
            {petHearts.map(h => (
              <motion.div
                key={h.id}
                initial={{ opacity: 1, scale: 0.5, y: h.y, x: h.x }}
                animate={{ opacity: 0, scale: 1.5, y: h.y - 45, x: h.x + (Math.random() - 0.5) * 30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="absolute pointer-events-none text-rose-400 z-30"
              >
                <Heart className="w-5 h-5 fill-rose-400 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Background Aura */}
          <div className="absolute inset-0 bg-orange-500/10 rounded-full filter blur-xl scale-90 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none -z-10" />

          {/* Sparkles for Celebrations */}
          {emotion === 'celebrating' && !accSettings.reduceMotion && (
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
              passwordVisible={passwordVisible}
              isPasswordFocused={focusedInput === 'password'}
              isHovered={isHovered}
              isSleeping={isSleeping}
            />
          </div>

          {/* Streak indicator */}
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
   PACO MASCOT GRAPHIC (VECTOR GRAPHIC RIGGED WITH FRAMER MOTION SPRINGS)
   ========================================================================= */

interface MascotGraphicProps {
  emotion: 'happy' | 'sleepy' | 'thinking' | 'curious' | 'confident' | 'excited' | 'relaxed' | 'concerned' | 'focused' | 'celebrating' | 'motivating' | 'surprised';
  streak: number;
  level: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  accSettings: { disableAnimations: boolean; reduceMotion: boolean; hideMascot: boolean };
  context?: string;
  mode?: string;
  isTalking?: boolean;
  passwordVisible?: boolean;
  isPasswordFocused?: boolean;
  isHovered?: boolean;
  isSleeping?: boolean;
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
  isTalking = false,
  passwordVisible = false,
  isPasswordFocused = false,
  isHovered = false,
  isSleeping = false
}: MascotGraphicProps) {
  
  const getBreathingDuration = () => {
    if (isSleeping || emotion === 'sleepy') return 6.5;
    if (emotion === 'celebrating' || emotion === 'confident') return 1.8;
    return 3.8;
  };

  const isMotionDisabled = accSettings.disableAnimations || accSettings.reduceMotion;

  // Idle micro saccades & eye movements
  const idleX = useMotionValue(0);
  const idleY = useMotionValue(0);
  const blinkY = useMotionValue(0);

  // Eye scanning animation loop during loading state
  useEffect(() => {
    if (isMotionDisabled) return;
    if (mode !== 'loading' && mode !== 'ai-thinking') {
      animate(idleX, 0, { duration: 0.3 });
      animate(idleY, 0, { duration: 0.3 });
      return;
    }

    let active = true;
    const runScan = async () => {
      while (active) {
        if (!active) break;
        await animate(idleX, -7, { duration: 0.65, ease: "easeInOut" });
        if (!active) break;
        await new Promise(r => setTimeout(r, 220));
        if (!active) break;
        await animate(idleX, 7, { duration: 0.65, ease: "easeInOut" });
        if (!active) break;
        await new Promise(r => setTimeout(r, 220));
      }
    };
    runScan();

    return () => {
      active = false;
      animate(idleX, 0, { duration: 0.3 });
    };
  }, [mode, isMotionDisabled, idleX, idleY]);

  // Periodic idle micro-saccades & subtle gazes
  useEffect(() => {
    if (isMotionDisabled) return;
    if (mode === 'loading' || mode === 'ai-thinking') return;

    let active = true;
    const runIdleLoops = () => {
      if (!active) return;
      
      if (!isPasswordFocused && !isTalking && !isSleeping) {
        const rand = Math.random();
        if (rand < 0.25) {
          const targetX = (Math.random() - 0.5) * 5.0;
          const targetY = (Math.random() - 0.5) * 2.5;
          animate(idleX, targetX, { duration: 0.22, ease: "easeOut" });
          animate(idleY, targetY, { duration: 0.22, ease: "easeOut" });

          setTimeout(() => {
            if (active && !isPasswordFocused) {
              animate(idleX, 0, { duration: 0.3, ease: "easeInOut" });
              animate(idleY, 0, { duration: 0.3, ease: "easeInOut" });
            }
          }, 700 + Math.random() * 800);
        } else if (rand < 0.55) {
          const targetX = (Math.random() - 0.5) * 1.5;
          const targetY = (Math.random() - 0.5) * 1.5;
          animate(idleX, targetX, { duration: 0.11, ease: "easeOut" });
          animate(idleY, targetY, { duration: 0.11, ease: "easeOut" });
        }
      }

      const nextDelay = 3000 + Math.random() * 3500;
      if (active) {
        setTimeout(runIdleLoops, nextDelay);
      }
    };

    const timer = setTimeout(runIdleLoops, 2500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isPasswordFocused, isTalking, isSleeping, mode, isMotionDisabled, idleX, idleY]);

  // Blink animation loop (Occurs every 3–6 seconds with standard 120–180ms duration)
  useEffect(() => {
    if (isMotionDisabled) return;

    let active = true;
    const triggerBlink = async () => {
      if (!active || isSleeping) return;

      await animate(blinkY, 1, { duration: 0.065, ease: "easeIn" });
      if (!active) return;
      await animate(blinkY, 0, { duration: 0.085, ease: "easeOut" });

      if (mode === 'login-success') {
        await new Promise(r => setTimeout(r, 120));
        if (!active) return;
        await animate(blinkY, 1, { duration: 0.065, ease: "easeIn" });
        await animate(blinkY, 0, { duration: 0.085, ease: "easeOut" });
      }

      const nextDelay = (mode === 'loading' ? 2000 : 3500) + Math.random() * 2500;
      if (active) {
        setTimeout(triggerBlink, nextDelay);
      }
    };

    const initialDelay = 1500 + Math.random() * 2000;
    const timer = setTimeout(triggerBlink, initialDelay);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isMotionDisabled, isSleeping, mode, blinkY]);

  // Combine cursor tracking with idle micro-saccades to drive irises/pupils
  const eyeX = useTransform([mouseX, idleX], ([x, ix]) => {
    if (isMotionDisabled || isSleeping) return 0;
    const combinedX = (x as number) * 0.25 + (ix as number) * 0.45;
    return Math.max(-4.2, Math.min(4.2, combinedX));
  });

  const eyeY = useTransform([mouseY, idleY], ([y, iy]) => {
    if (isMotionDisabled || isSleeping) return 0;
    const combinedY = (y as number) * 0.25 + (iy as number) * 0.45;
    return Math.max(-2.5, Math.min(2.5, combinedY));
  });

  const headX = useTransform(mouseX, (x) => isMotionDisabled ? 0 : x * (emotion === 'confident' ? 1.4 : 0.9));
  const headY = useTransform(mouseY, (y) => isMotionDisabled ? 0 : y * 0.8);

  // Eyelid offset logic based on active emotional state
  const getEyelidOffsets = () => {
    if (isSleeping || emotion === 'sleepy') {
      return [0, 0]; // closed
    }
    if (emotion === 'surprised' || mode === 'login-success') {
      return [-14, 14]; // eyes widen
    }
    if (emotion === 'confident' || emotion === 'focused') {
      return [-6.5, 6.5]; // sharp squint
    }
    if (emotion === 'celebrating') {
      return [-13.5, 13.5]; // eyes brighten & widen in joy
    }
    if (emotion === 'happy') {
      return [-9.5, 4.2]; // warm smile squint
    }
    if (emotion === 'concerned') {
      return [-8.0, 8.0]; // worried squint
    }
    return [-11.5, 11.5]; // open
  };

  const [eyelidTargetUpper, eyelidTargetLower] = getEyelidOffsets();

  const emotionUpperYVal = useMotionValue(eyelidTargetUpper);
  const emotionLowerYVal = useMotionValue(eyelidTargetLower);
  
  const emotionUpperY = useSpring(emotionUpperYVal, { stiffness: 100, damping: 15 });
  const emotionLowerY = useSpring(emotionLowerYVal, { stiffness: 100, damping: 15 });

  useEffect(() => {
    emotionUpperYVal.set(eyelidTargetUpper);
    emotionLowerYVal.set(eyelidTargetLower);
  }, [eyelidTargetUpper, eyelidTargetLower, emotionUpperYVal, emotionLowerYVal]);

  const upperEyelidY = useTransform([blinkY, emotionUpperY], ([b, eY]) => {
    if (isMotionDisabled || isSleeping) {
      return isSleeping || emotion === 'sleepy' ? 0 : -11.5;
    }
    return (eY as number) * (1 - (b as number));
  });

  const lowerEyelidY = useTransform([blinkY, emotionLowerY], ([b, eY]) => {
    if (isMotionDisabled || isSleeping) {
      return isSleeping || emotion === 'sleepy' ? 0 : 11.5;
    }
    return (eY as number) * (1 - (b as number));
  });

  // Eyebrow configuration
  const getEyebrowConfig = () => {
    if (isPasswordFocused && passwordVisible) {
      return [-4.5, -8, -4.5, 8];
    }
    if (emotion === 'concerned') {
      return [1.5, 12, 1.5, -12];
    }
    if (emotion === 'thinking' || emotion === 'curious') {
      return [1.0, -4, -3.5, 9];
    }
    if (emotion === 'confident' || emotion === 'focused') {
      return [0.8, -5, 0.8, 5];
    }
    if (emotion === 'celebrating') {
      return [-6.0, -10, -6.0, 10]; // raised high in delight
    }
    if (emotion === 'happy') {
      return [-2.5, -3, -2.5, 3];
    }
    return [0, 0, 0, 0];
  };

  const [lEyebrowY, lEyebrowRot, rEyebrowY, rEyebrowRot] = getEyebrowConfig();

  const leftEyebrowYVal = useMotionValue(lEyebrowY);
  const leftEyebrowRotVal = useMotionValue(lEyebrowRot);
  const rightEyebrowYVal = useMotionValue(rEyebrowY);
  const rightEyebrowRotVal = useMotionValue(rEyebrowRot);

  const leftEyebrowYSpring = useSpring(leftEyebrowYVal, { stiffness: 90, damping: 14 });
  const leftEyebrowRotSpring = useSpring(leftEyebrowRotVal, { stiffness: 90, damping: 14 });
  const rightEyebrowYSpring = useSpring(rightEyebrowYVal, { stiffness: 90, damping: 14 });
  const rightEyebrowRotSpring = useSpring(rightEyebrowRotVal, { stiffness: 90, damping: 14 });

  useEffect(() => {
    leftEyebrowYVal.set(lEyebrowY);
    leftEyebrowRotVal.set(lEyebrowRot);
    rightEyebrowYVal.set(rEyebrowY);
    rightEyebrowRotVal.set(rEyebrowRot);
  }, [lEyebrowY, lEyebrowRot, rEyebrowY, rEyebrowRot, leftEyebrowYVal, leftEyebrowRotVal, rightEyebrowYVal, rightEyebrowRotVal]);

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
        ? "M 94 122 Q 100 129, 106 122 Z"
        : "M 94 123 Q 100 125, 106 123";
    }
    if (isPasswordFocused && passwordVisible) {
      return "M 94 122 Q 100 126, 106 122";
    }
    if (emotion === 'celebrating') {
      return "M 90 119 Q 100 134, 110 119 Z";
    }
    if (emotion === 'happy' || isHovered) {
      return "M 92 121 Q 100 130, 108 121 Z";
    }
    if (emotion === 'concerned') {
      return "M 94 125 Q 100 121, 106 125";
    }
    if (emotion === 'thinking' || emotion === 'surprised' || emotion === 'curious') {
      return "M 96 122 Q 100 128, 104 122 Z";
    }
    if (emotion === 'confident' || emotion === 'focused') {
      return "M 94 122 Q 100 123, 106 121";
    }
    if (isSleeping || emotion === 'sleepy') {
      return "M 95 123 Q 100 125, 105 123";
    }
    return "M 94 122 Q 100 126, 106 122";
  };

  const isCoveringEyes = isPasswordFocused && !passwordVisible;

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
          <stop offset="0%" stopColor="#ffb834" />
          <stop offset="45%" stopColor="#ff6a00" />
          <stop offset="100%" stopColor="#d82000" />
        </linearGradient>

        {/* Light Orange/Cheek Gradient */}
        <linearGradient id="foxOrangeLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffdca0" />
          <stop offset="100%" stopColor="#ff7820" />
        </linearGradient>

        {/* Premium Fur White/Cream Gradient */}
        <linearGradient id="foxWhite" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={1.0} />
          <stop offset="100%" stopColor="#ffe6cc" stopOpacity={0.95} />
        </linearGradient>

        {/* Snout Gradient */}
        <linearGradient id="foxSnout" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffcf9" />
          <stop offset="100%" stopColor="#fed9c1" />
        </linearGradient>

        {/* Inner Ear Dark Gradient */}
        <linearGradient id="innerEar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f1a14" />
          <stop offset="100%" stopColor="#1c0704" />
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

        {/* Pink Rosy Blush Gradient */}
        <radialGradient id="pinkBlush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0" />
        </radialGradient>

        {/* Deep amber/brown iris gradient */}
        <radialGradient id="irisGrad" cx="50%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#ffd875" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>

        {/* Dark soft pupil gradient */}
        <radialGradient id="pupilGrad" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#2c2c30" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </radialGradient>

        {/* Almond shaped left eye clip path */}
        <clipPath id="left-eye-clip">
          <path d="M 67 82 C 67 73, 89 73, 89 82 C 89 91, 67 91, 67 82 Z" />
        </clipPath>

        {/* Almond shaped right eye clip path */}
        <clipPath id="right-eye-clip">
          <path d="M 111 82 C 111 73, 133 73, 133 82 C 133 91, 111 91, 111 82 Z" />
        </clipPath>
      </defs>

      {/* Ground Shadow - Reacts dynamically to full-body jump elevation */}
      <motion.g
        id="paco-ground-shadow"
        style={{ transformOrigin: "100px 178px" }}
        animate={isMotionDisabled ? { scale: 1, opacity: 0.8 } : {
          scale: emotion === 'celebrating'
            ? [1, 1.15, 0.52, 0.48, 1.22, 0.94, 1]
            : [1, 1.03, 1],
          opacity: emotion === 'celebrating'
            ? [0.8, 0.95, 0.25, 0.20, 0.98, 0.72, 0.8]
            : [0.8, 0.9, 0.8]
        }}
        transition={{
          duration: emotion === 'celebrating' ? 1.35 : getBreathingDuration(),
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <ellipse cx="100" cy="178" rx="55" ry="9" fill="rgba(0,0,0,0.32)" filter="blur(3.5px)" />
        <ellipse cx="100" cy="178" rx="35" ry="5.5" fill="rgba(0,0,0,0.18)" />
      </motion.g>

      {/* TAIL (Animated with rapid wagging, jump elevation, and follow-through) */}
      <motion.g
        id="paco-tail"
        style={{ transformOrigin: "128px 154px" }}
        animate={isMotionDisabled ? { rotate: 0, y: 0 } : {
          rotate: emotion === 'celebrating'
            ? [0, -34, 38, -32, 34, -20, 24, 0]
            : isHovered
            ? [-18, 24, -18] 
            : emotion === 'concerned'
            ? [-15, -11, -15]
            : [-5, 6, -5],
          scale: emotion === 'celebrating' ? [1, 0.92, 1.14, 0.96, 1.08, 0.98, 1] : 1,
          y: emotion === 'celebrating' ? [0, 5, -24, -28, 3, -2, 0] : 0
        }}
        transition={{
          duration: emotion === 'celebrating' ? 1.35 : (isHovered ? 1.2 : 4.0),
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

      {/* BACK PAWS / FEET (Crouches, pushes off, stretches in air, squashes on landing) */}
      <motion.g
        id="paco-back-feet"
        style={{ transformOrigin: "100px 165px" }}
        animate={isMotionDisabled ? { y: 0, scaleY: 1, scaleX: 1 } : {
          y: emotion === 'celebrating'
            ? [0, 4, -24, -28, 3, -2, 0]
            : 0,
          scaleY: emotion === 'celebrating'
            ? [1, 0.80, 1.26, 1.10, 0.76, 1.05, 1]
            : 1,
          scaleX: emotion === 'celebrating'
            ? [1, 1.18, 0.84, 0.92, 1.22, 0.96, 1]
            : 1
        }}
        transition={{
          duration: emotion === 'celebrating' ? 1.35 : 0.3,
          repeat: emotion === 'celebrating' ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
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
      </motion.g>

      {/* TORSO / BODY BREATHING & SQUASH-STRETCH SYSTEM */}
      <motion.g
        id="paco-torso"
        style={{ transformOrigin: "100px 165px" }}
        animate={isMotionDisabled ? { scaleY: 1, scaleX: 1, y: 0, rotate: 0 } : {
          y: emotion === 'celebrating'
            ? [0, 5, -28, -32, 4, -3, 0]
            : isHovered
            ? [0, -4, 0]
            : [0, -2.5, 0],
          scaleY: emotion === 'celebrating'
            ? [1, 0.84, 1.22, 1.08, 0.78, 1.06, 1]
            : isSleeping || emotion === 'sleepy'
            ? [1, 1.01, 1]
            : [1, 1.025, 1],
          scaleX: emotion === 'celebrating'
            ? [1, 1.15, 0.86, 0.94, 1.20, 0.96, 1]
            : 1,
          rotate: emotion === 'celebrating'
            ? [0, -3, 4, -4, 2, -1, 0]
            : 0
        }}
        transition={{
          duration: emotion === 'celebrating' ? 1.35 : getBreathingDuration(),
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <path d="M 68 118 Q 100 95 132 118 L 140 162 Q 100 174 60 162 Z" fill="url(#foxOrange)" />
        <path d="M 82 120 Q 100 108 118 120 L 126 154 Q 100 172 74 154 Z" fill="url(#foxWhite)" />
      </motion.g>

      {/* FRONT PAWS / ARMS (Lifts and waves joyfully during celebration, resting otherwise) */}
      {!isCoveringEyes && (
        <g id="paco-front-paws">
          {/* Left Front Paw */}
          <motion.g
            id="paco-front-paw-left"
            style={{ transformOrigin: "75px 128px" }}
            animate={isMotionDisabled ? { y: 0, x: 0, rotate: 0, scale: 1 } : {
              y: emotion === 'celebrating'
                ? [0, 5, -34, -40, 3, -2, 0]
                : 0,
              x: emotion === 'celebrating'
                ? [0, -2, -10, -12, -1, 0, 0]
                : 0,
              rotate: emotion === 'celebrating'
                ? [0, 12, -52, 32, -38, 12, 0]
                : 0,
              scale: emotion === 'celebrating'
                ? [1, 0.92, 1.18, 1.1, 0.88, 1.02, 1]
                : 1
            }}
            transition={{
              duration: emotion === 'celebrating' ? 1.35 : 0.3,
              repeat: emotion === 'celebrating' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <path d="M 66 128 C 66 118, 84 118, 84 128 C 84 136, 66 136, 66 128 Z" fill="url(#foxOrangeLight)" stroke="#ff7820" strokeWidth="0.8" />
            <circle cx="71" cy="130" r="1.8" fill="url(#foxWhite)" />
            <circle cx="78" cy="130" r="1.8" fill="url(#foxWhite)" />
          </motion.g>

          {/* Right Front Paw */}
          <motion.g
            id="paco-front-paw-right"
            style={{ transformOrigin: "125px 128px" }}
            animate={isMotionDisabled ? { y: 0, x: 0, rotate: 0, scale: 1 } : {
              y: emotion === 'celebrating'
                ? [0, 5, -34, -40, 3, -2, 0]
                : 0,
              x: emotion === 'celebrating'
                ? [0, 2, 10, 12, 1, 0, 0]
                : 0,
              rotate: emotion === 'celebrating'
                ? [0, -12, 52, -32, 38, -12, 0]
                : 0,
              scale: emotion === 'celebrating'
                ? [1, 0.92, 1.18, 1.1, 0.88, 1.02, 1]
                : 1
            }}
            transition={{
              duration: emotion === 'celebrating' ? 1.35 : 0.3,
              repeat: emotion === 'celebrating' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <path d="M 116 128 C 116 118, 134 118, 134 128 C 134 136, 116 136, 116 128 Z" fill="url(#foxOrangeLight)" stroke="#ff7820" strokeWidth="0.8" />
            <circle cx="121" cy="130" r="1.8" fill="url(#foxWhite)" />
            <circle cx="128" cy="130" r="1.8" fill="url(#foxWhite)" />
          </motion.g>
        </g>
      )}

      {/* HEAD & EARS SYSTEM (Independent motion, head bounce, natural tilt, ears bounce) */}
      <motion.g
        id="paco-head"
        style={{
          transformOrigin: "100px 120px",
          x: headX,
          y: headY
        }}
        animate={isMotionDisabled ? { rotate: 0, y: 0, scaleY: 1, scaleX: 1 } : {
          y: emotion === 'celebrating'
            ? [0, 6, -30, -36, 5, -3, 0]
            : 0,
          rotate: emotion === 'celebrating'
            ? [0, -8, 10, -10, 6, -3, 0]
            : emotion === 'thinking' || emotion === 'curious'
            ? 6
            : emotion === 'concerned'
            ? -4
            : emotion === 'confident'
            ? 3
            : 0,
          scaleY: emotion === 'celebrating'
            ? [1, 0.90, 1.14, 1.06, 0.86, 1.04, 1]
            : 1,
          scaleX: emotion === 'celebrating'
            ? [1, 1.10, 0.88, 0.94, 1.12, 0.97, 1]
            : 1
        }}
        transition={{
          duration: emotion === 'celebrating' ? 1.35 : 0.5,
          repeat: emotion === 'celebrating' ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* LEFT EAR (Secondary bounce physics) */}
        <motion.path
          id="paco-ear-left"
          style={{ transformOrigin: "66px 72px" }}
          animate={isMotionDisabled ? { rotate: 0 } : {
            rotate: emotion === 'celebrating'
              ? [0, 16, -26, 20, -15, 6, 0]
              : isSleeping
              ? [0, -2, 0]
              : [0, -8, 6, -3, 0]
          }}
          transition={{
            duration: emotion === 'celebrating' ? 1.35 : 6.0,
            repeat: Infinity,
            repeatDelay: emotion === 'celebrating' ? 0 : 3.5,
            ease: "easeInOut"
          }}
          d="M 66 72 L 46 26 C 58 20, 78 32, 80 58 Z"
          fill="url(#foxOrange)"
          stroke="#e0411a"
          strokeWidth="0.5"
        />
        <path d="M 64 66 L 50 33 C 58 28, 72 38, 74 54 Z" fill="url(#innerEar)" />

        {/* RIGHT EAR (Secondary bounce physics) */}
        <motion.path
          id="paco-ear-right"
          style={{ transformOrigin: "134px 72px" }}
          animate={isMotionDisabled ? { rotate: 0 } : {
            rotate: emotion === 'celebrating'
              ? [0, -16, 26, -20, 15, -6, 0]
              : isSleeping
              ? [0, 3, 0]
              : [0, 9, -5, 3, 0]
          }}
          transition={{
            duration: emotion === 'celebrating' ? 1.35 : 5.5,
            repeat: Infinity,
            repeatDelay: emotion === 'celebrating' ? 0 : 2.8,
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

        {/* Rosy Cheeks */}
        <ellipse cx="66" cy="94" rx="9" ry="5" fill="url(#pinkBlush)" />
        <ellipse cx="134" cy="94" rx="9" ry="5" fill="url(#pinkBlush)" />

        {/* Snout */}
        <path d="M 84 92 L 100 123 L 116 92 Q 100 88, 84 92 Z" fill="url(#foxSnout)" />
        
        {/* Nose */}
        <path d="M 96 117.5 C 96 115.5, 104 115.5, 104 117.5 C 104 119.5, 101.5 121, 100 121 C 98.5 121, 96 119.5, 96 117.5 Z" fill="#111827" />
        <circle cx="98.5" cy="116.8" r="0.9" fill="white" />

        {/* SHAPE-SHIFTING MOUTH (Big open smile when celebrating with tongue highlight) */}
        <motion.path
          animate={{ d: getMouthPath() }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
          fill={emotion === 'celebrating' || emotion === 'happy' || isTalking || isHovered ? "#991b1b" : "none"}
          stroke="#1e293b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {emotion === 'celebrating' && (
          <path d="M 94 125 Q 100 131, 106 125 Q 100 121, 94 125 Z" fill="#ff708a" />
        )}

        {/* EYES SYSTEM */}
        <g id="paco-eyes">
          {/* Left Eye */}
          <g clipPath="url(#left-eye-clip)">
            <path d="M 65 82 C 65 70, 91 70, 91 82 C 91 94, 65 94, 65 82 Z" fill="#fffefd" />
            <path d="M 65 72 Q 78 78, 91 72" stroke="rgba(0, 0, 0, 0.08)" strokeWidth="3" strokeLinecap="round" fill="none" />

            <motion.g style={{ x: eyeX, y: eyeY }}>
              <circle cx="78" cy="82" r="7.8" fill="url(#irisGrad)" />
              <circle cx="78" cy="82" r="4.3" fill="url(#pupilGrad)" />
              <circle cx="75.2" cy="78.8" r="2.2" fill="white" opacity="0.95" />
              <circle cx="81.0" cy="85.2" r="1.1" fill="white" opacity="0.7" />
              <circle cx="79.8" cy="79.2" r="0.6" fill="white" opacity="0.8" />
            </motion.g>

            <motion.path
              d="M 64 82 C 64 68, 92 68, 92 82 L 92 60 L 64 60 Z"
              fill="url(#foxOrange)"
              style={{ y: upperEyelidY }}
            />
            <motion.path
              d="M 64 82 C 64 68, 92 68, 92 82"
              stroke="#1c0704"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              style={{ y: upperEyelidY }}
            />

            <motion.path
              d="M 64 82 C 64 96, 92 96, 92 82 L 92 104 L 64 104 Z"
              fill="url(#foxOrange)"
              style={{ y: lowerEyelidY }}
            />
            <motion.path
              d="M 64 82 C 64 96, 92 96, 92 82"
              stroke="#1c0704"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              style={{ y: lowerEyelidY }}
            />
          </g>
          <path d="M 67 82 C 67 73, 89 73, 89 82 C 89 91, 67 91, 67 82 Z" stroke="#3b150a" strokeWidth="2.2" fill="none" strokeLinecap="round" />

          {/* Right Eye */}
          <g clipPath="url(#right-eye-clip)">
            <path d="M 109 82 C 109 70, 135 70, 135 82 C 135 94, 109 94, 109 82 Z" fill="#fffefd" />
            <path d="M 109 72 Q 122 78, 135 72" stroke="rgba(0, 0, 0, 0.08)" strokeWidth="3" strokeLinecap="round" fill="none" />

            <motion.g style={{ x: eyeX, y: eyeY }}>
              <circle cx="122" cy="82" r="7.8" fill="url(#irisGrad)" />
              <circle cx="122" cy="82" r="4.3" fill="url(#pupilGrad)" />
              <circle cx="119.2" cy="78.8" r="2.2" fill="white" opacity="0.95" />
              <circle cx="125.0" cy="85.2" r="1.1" fill="white" opacity="0.7" />
              <circle cx="123.8" cy="79.2" r="0.6" fill="white" opacity="0.8" />
            </motion.g>

            <motion.path
              d="M 108 82 C 108 68, 136 68, 136 82 L 136 60 L 108 60 Z"
              fill="url(#foxOrange)"
              style={{ y: upperEyelidY }}
            />
            <motion.path
              d="M 108 82 C 108 68, 136 68, 136 82"
              stroke="#1c0704"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              style={{ y: upperEyelidY }}
            />

            <motion.path
              d="M 108 82 C 108 96, 136 96, 136 82 L 136 104 L 108 104 Z"
              fill="url(#foxOrange)"
              style={{ y: lowerEyelidY }}
            />
            <motion.path
              d="M 108 82 C 108 96, 136 96, 136 82"
              stroke="#1c0704"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              style={{ y: lowerEyelidY }}
            />
          </g>
          <path d="M 111 82 C 111 73, 133 73, 133 82 C 133 91, 111 91, 111 82 Z" stroke="#3b150a" strokeWidth="2.2" fill="none" strokeLinecap="round" />

          {/* Brightening Eye Sparkles when Celebrating */}
          {emotion === 'celebrating' && (
            <g id="paco-eye-sparkles" opacity="0.95">
              <polygon points="78,74 79.5,77.5 83,78 79.5,78.5 78,82 76.5,78.5 73,78 76.5,77.5" fill="#fef08a" />
              <polygon points="122,74 123.5,77.5 127,78 123.5,78.5 122,82 120.5,78.5 117,78 120.5,77.5" fill="#fef08a" />
            </g>
          )}
        </g>

        {/* EYEBROWS */}
        <g id="paco-eyebrows" opacity="0.95">
          <motion.path
            d="M 71 69 Q 78 66, 85 69"
            stroke="#4a1d12"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            style={{
              transformOrigin: "78px 69px",
              y: leftEyebrowYSpring,
              rotate: leftEyebrowRotSpring
            }}
          />
          <motion.path
            d="M 115 69 Q 122 66, 129 69"
            stroke="#4a1d12"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            style={{
              transformOrigin: "122px 69px",
              y: rightEyebrowYSpring,
              rotate: rightEyebrowRotSpring
            }}
          />
        </g>

        {/* Whiskers */}
        <g id="paco-whiskers" opacity="0.38">
          <line x1="42" y1="94" x2="28" y2="92" stroke="#0f172a" strokeWidth="1" />
          <line x1="42" y1="99" x2="30" y2="100" stroke="#0f172a" strokeWidth="1" />
          <line x1="158" y1="94" x2="172" y2="92" stroke="#0f172a" strokeWidth="1" />
          <line x1="158" y1="99" x2="170" y2="100" stroke="#0f172a" strokeWidth="1" />
        </g>

        {/* PAWS COVERING EYES WHEN PASSWORD HIDDEN */}
        {isCoveringEyes && (
          <motion.g
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            id="paco-paws-cover-eyes"
          >
            {/* Left Paw Covering Eye */}
            <path d="M 60 96 C 60 76, 88 76, 88 96 Z" fill="url(#foxOrangeLight)" stroke="#ff7820" strokeWidth="1" />
            <circle cx="68" cy="92" r="3" fill="url(#foxWhite)" />
            <circle cx="78" cy="90" r="3" fill="url(#foxWhite)" />
            
            {/* Right Paw Covering Eye */}
            <path d="M 112 96 C 112 76, 140 76, 140 96 Z" fill="url(#foxOrangeLight)" stroke="#ff7820" strokeWidth="1" />
            <circle cx="122" cy="90" r="3" fill="url(#foxWhite)" />
            <circle cx="132" cy="92" r="3" fill="url(#foxWhite)" />
          </motion.g>
        )}

        {/* Golden Crown */}
        {streak >= 100 && (
          <g id="paco-crown" transform="translate(100, 32)">
            <polygon points="-12,0 -16,-12 -6,-4 0,-15 6,-4 16,-12 12,0" fill="url(#goldGrad)" stroke="#f59e0b" strokeWidth="0.5" filter="drop-shadow(0 0 3px #f59e0b)" />
          </g>
        )}
      </motion.g>

      {/* DYNAMIC ACCESSORIES */}
      {/* Level 10-29: Collar */}
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
      {/* Notebook & Pencil for Study Mode */}
      {(mode === 'study-started' || context === 'roadmaps') && (
        <motion.g id="paco-study-notebook" animate={isMotionDisabled ? { y: 0 } : { y: [0, -2, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <rect x="132" y="122" width="24" height="28" rx="3" fill="#6366f1" stroke="#312e81" strokeWidth="1" />
          <line x1="138" y1="128" x2="150" y2="128" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="138" y1="133" x2="150" y2="133" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="138" y1="138" x2="146" y2="138" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="150" y="118" width="4" height="16" rx="1" fill="#f59e0b" transform="rotate(15, 150, 118)" />
        </motion.g>
      )}

      {/* Analytics */}
      {context === 'analytics' && (
        <motion.g id="paco-context-analytics" animate={isMotionDisabled ? { y: 0 } : { y: [0, -1.5, 0] }} transition={{ duration: 3.0, repeat: Infinity }}>
          <rect x="135" y="125" width="22" height="18" rx="3.5" fill="rgba(6,182,212,0.18)" stroke="#06b6d4" strokeWidth="1" />
          <line x1="140" y1="138" x2="140" y2="132" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="146" y1="138" x2="146" y2="129" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="152" y1="138" x2="152" y2="134" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
      )}

      {/* Friends / Binoculars */}
      {(mode === 'no-friends' || context === 'clans' || context === 'friends') && (
        <g id="paco-binoculars" transform="translate(88, 114)">
          <rect x="0" y="0" width="9" height="13" rx="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
          <rect x="13" y="0" width="9" height="13" rx="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
          <rect x="9" y="4" width="4" height="3" fill="#1e293b" />
          <circle cx="4.5" cy="13" r="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="0.6" />
          <circle cx="17.5" cy="13" r="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="0.6" />
        </g>
      )}

      {/* Trophy for victory / celebration */}
      {(emotion === 'celebrating' || mode === 'battle-won' || mode === 'rank-up') && (
        <motion.g
          id="paco-trophy-item"
          animate={isMotionDisabled ? { y: 0 } : {
            y: emotion === 'celebrating' ? [0, 5, -28, -32, 4, -3, 0] : [0, -3, 0]
          }}
          transition={{
            duration: emotion === 'celebrating' ? 1.35 : 3.0,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          transform="translate(138, 124)"
        >
          <path d="M -8 -12 L 8 -12 L 6 -2 L -6 -2 Z" fill="url(#goldGrad)" />
          <path d="M -1.5 -2 L 1.5 -2 L 1.5 6 L -1.5 6 Z" fill="url(#goldGrad)" />
          <rect x="-6" y="6" width="12" height="3.5" rx="1" fill="#78350f" />
          <path d="M -8 -9 Q -12 -9, -8 -5" stroke="url(#goldGrad)" strokeWidth="1.8" fill="none" />
          <path d="M 8 -9 Q 12 -9, 8 -5" stroke="url(#goldGrad)" strokeWidth="1.8" fill="none" />
        </motion.g>
      )}

      {/* Zzz Bubble when sleeping */}
      {isSleeping && (
        <motion.g
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: [0, 1, 0.8, 0], scale: [0.6, 1, 1.2, 1], y: [-10, -25, -40, -55], x: [130, 138, 132, 140] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <text x="135" y="60" fill="#a5b4fc" fontSize="16" fontWeight="bold" fontFamily="monospace">Z</text>
          <text x="145" y="48" fill="#818cf8" fontSize="12" fontWeight="bold" fontFamily="monospace">z</text>
          <text x="152" y="38" fill="#6366f1" fontSize="9" fontWeight="bold" fontFamily="monospace">z</text>
        </motion.g>
      )}
    </svg>
  );
}
