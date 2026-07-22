/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import { Lock, User, Sparkles, BookOpen, School, GraduationCap, ArrowRight, Chrome, Eye, EyeOff } from 'lucide-react';
import PacoMascot from './PacoMascot';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface AuthViewProps {
  onAuthSuccess: (token: string, user: UserProfile) => void;
}

function getPasswordStrength(pass: string): 'weak' | 'medium' | 'strong' | 'excellent' | null {
  if (!pass) return null;
  if (pass.length < 6) return 'weak';
  
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  
  const score = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  
  if (pass.length >= 12 && score >= 4) {
    return 'excellent';
  }
  if (pass.length >= 8 && score >= 3) {
    return 'strong';
  }
  if (pass.length >= 6 && score >= 2) {
    return 'medium';
  }
  return 'weak';
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Password peek interactive state
  const [showPassword, setShowPassword] = useState(false);
  const [hasHiddenPasswordAgain, setHasHiddenPasswordAgain] = useState(false);

  useEffect(() => {
    if (showPassword === false && password.length > 0) {
      setHasHiddenPasswordAgain(true);
      const timer = setTimeout(() => {
        setHasHiddenPasswordAgain(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showPassword]);

  const [firebaseConfig, setFirebaseConfig] = useState<any>(null);

  // Load Firebase Config and GIS script dynamically
  useEffect(() => {
    fetch('/firebase-applet-config.json')
      .then(res => res.json())
      .then(config => setFirebaseConfig(config))
      .catch(err => console.error('Error loading firebase config:', err));

    // Dynamically inject the Google Identity Services SDK script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    
    try {
      if (typeof window === 'undefined' || !(window as any).google) {
        throw new Error('Google Sign-In library is loading. Please try again in 2 seconds.');
      }

      const google = (window as any).google;
      let config = firebaseConfig;
      if (!config) {
        const res = await fetch('/firebase-applet-config.json');
        config = await res.json();
        setFirebaseConfig(config);
      }

      const clientId = config?.oAuthClientId || '238756227188-6fa8d680bmu50efls1egbompv5amb484.apps.googleusercontent.com';

      // Initialize the secure Google Identity Services OAuth 2.0 token client
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Google Sign-In callback error:', tokenResponse);
            setError(tokenResponse.error_description || 'Google authentication was declined or cancelled.');
            setGoogleLoading(false);
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            setError('Failed to obtain Google access token.');
            setGoogleLoading(false);
            return;
          }

          try {
            // Log in on backend with Google accessToken
            const res = await fetch('/api/auth/google/signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Backend authentication failed');
            }

            const { token, user } = await res.json();
            api.setToken(token);
            setIsSuccess(true);
            setTimeout(() => {
              onAuthSuccess(token, user);
            }, 1600);
          } catch (err: any) {
            console.error('Google verification backend error:', err);
            setError(err.message || 'Failed to authenticate Google token on server.');
            setGoogleLoading(false);
          }
        },
      });

      // Request token (opens secure native popup without iframe communication blockages)
      client.requestAccessToken();

    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Failed to initiate Google Sign-In. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Screen mouse position for background parallax using MotionValues for buttery smooth 120fps (no re-renders)
  const screenX = useMotionValue(0);
  const screenY = useMotionValue(0);
  const springScreenX = useSpring(screenX, { stiffness: 45, damping: 14 });
  const springScreenY = useSpring(screenY, { stiffness: 45, damping: 14 });

  const aurora1X = useTransform(springScreenX, (x) => x * -25);
  const aurora1Y = useTransform(springScreenY, (y) => y * -25);

  const aurora2X = useTransform(springScreenX, (x) => x * -18);
  const aurora2Y = useTransform(springScreenY, (y) => y * -18);

  // Mouse hover state for card reactive highlight using MotionValues for buttery smooth 120fps (no re-renders)
  const cardMouseX = useMotionValue(0);
  const cardMouseY = useMotionValue(0);
  const cardSpringX = useSpring(cardMouseX, { stiffness: 200, damping: 25 });
  const cardSpringY = useSpring(cardMouseY, { stiffness: 200, damping: 25 });
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Focus states for input fields to animate icons dynamically
  const [activeFocus, setActiveFocus] = useState<string | null>(null);

  // Success state for cinematic transition
  const [isSuccess, setIsSuccess] = useState(false);

  // Memoize particle coordinates and styles to prevent recreation on typing/render
  const particles = React.useMemo(() => {
    return [...Array(12)].map((_, i) => ({
      id: i,
      opacity: Math.random() * 0.35 + 0.1,
      scale: Math.random() * 0.5 + 0.4,
      initialX: Math.random() * 1600 - 100,
      initialY: Math.random() * 1000 - 50,
      duration: 7 + Math.random() * 8,
      delay: i * 0.3
    }));
  }, []);

  const handleScreenMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = (e.clientX - width / 2) / (width / 2);
    const y = (e.clientY - height / 2) / (height / 2);
    screenX.set(x);
    screenY.set(y);
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    cardMouseX.set(e.clientX - rect.left);
    cardMouseY.set(e.clientY - rect.top);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all credentials.');
      return;
    }
    if (!isLogin && !displayName) {
      setError('Please specify a display name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const data = await api.login({ username, password });
        api.setToken(data.token);
        setIsSuccess(true);
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 1600);
      } else {
        const data = await api.signup({
          username,
          password,
          displayName,
          university,
          branch,
          year,
        });
        api.setToken(data.token);
        setIsSuccess(true);
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 1600);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // SaaS animation variants for staggered elements
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: {
      opacity: isSuccess ? 0 : 1,
      y: isSuccess ? -25 : 0,
      scale: isSuccess ? 0.92 : 1,
      transition: {
        type: "spring",
        stiffness: 110,
        damping: 18,
        staggerChildren: 0.06,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 15 },
    },
  };

  return (
    <div 
      id="auth-container" 
      onMouseMove={handleScreenMouseMove}
      className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center p-6 gap-10 md:gap-16 select-none relative overflow-hidden animate-fadeIn bg-[#070b13]"
    >
      {/* 1. Slow-moving animated Aurora gradients with screen-mouse parallax (GPU optimized via radial gradients) */}
      <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden">
        {/* Soft Noise Overlay for premium grain tactile texture */}
        <div className="absolute inset-0 opacity-[0.015] bg-repeat pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

        {/* Indigo Top-Left Aurora - Utilizing radial-gradient to eliminate heavy pixel-blur filter overhead */}
        <motion.div
          style={{
            x: aurora1X,
            y: aurora1Y,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
          }}
          animate={{
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={{
            scale: { duration: 15, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full will-change-transform"
        />

        {/* Violet/Fuchsia Bottom-Right Aurora - Utilizing radial-gradient to eliminate heavy pixel-blur filter overhead */}
        <motion.div
          style={{
            x: aurora2X,
            y: aurora2Y,
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0) 70%)',
          }}
          animate={{
            scale: [1, 0.92, 1.08, 1],
          }}
          transition={{
            scale: { duration: 18, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute -bottom-[10%] -right-[10%] w-[65%] h-[65%] rounded-full will-change-transform"
        />

        {/* Slow moving soft radial core glow behind login area - Utilizing radial-gradient to eliminate heavy pixel-blur filter overhead */}
        <motion.div
          style={{
            background: 'radial-gradient(circle, rgba(129, 140, 248, 0.25) 0%, rgba(129, 140, 248, 0) 70%)',
            left: '50%',
            top: '50%',
            translateX: '-50%',
            translateY: '-50%',
          }}
          animate={{
            scale: isSuccess ? [1, 3.8] : [1, 1.12, 0.96, 1],
            opacity: isSuccess ? [0.15, 0.75] : [0.12, 0.22, 0.12, 0.12],
          }}
          transition={isSuccess ? {
            duration: 1.8,
            ease: "easeOut"
          } : {
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-[360px] h-[360px] rounded-full will-change-transform"
        />

        {/* 2. Particle fields - elegant tiny spark particles floating elegantly - Memoized and optimized for high-refresh screens */}
        {!isSuccess && particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: p.opacity, 
              scale: p.scale,
              x: p.initialX, 
              y: p.initialY 
            }}
            animate={{
              y: [p.initialY, p.initialY - 40, p.initialY],
              opacity: [p.opacity, p.opacity * 2.5, p.opacity],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay
            }}
            className="absolute w-1 h-1 bg-indigo-300/40 rounded-full will-change-transform"
          />
        ))}
      </div>

      {/* Mascot Side Panel - Waits beside the card, runs towards dashboard on success */}
      <div className="flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login-mascot' : 'signup-mascot'}
            initial={{ opacity: 0, scale: 0.85, x: isLogin ? -35 : 35 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: isSuccess ? 480 : 0, // Cinematic run towards dashboard
              y: isSuccess ? -12 : 0,
            }}
            exit={{ opacity: 0, scale: 0.85, x: isLogin ? 35 : -35 }}
            transition={isSuccess ? {
              duration: 1.6,
              ease: "easeInOut"
            } : {
              type: "spring",
              stiffness: 110,
              damping: 14
            }}
            className="relative z-30"
          >
            <PacoMascot
              mode={isSuccess ? 'login-success' : loading ? 'loading' : isLogin ? 'login-wait' : 'signup-onboard'}
              focusedInput={activeFocus as any}
              passwordVisible={showPassword}
              passwordStrength={getPasswordStrength(password)}
              hasHiddenPasswordAgain={hasHiddenPasswordAgain}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        <div className="w-full text-center mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          className="flex items-center justify-center gap-2 mb-3"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10">
            <BookOpen className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="font-display font-bold text-2.5xl tracking-[0.25em] text-slate-100 pl-[0.25em] bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">PACE</span>
        </motion.div>
        
        <motion.p
          key={isLogin ? 'signin-sub' : 'signup-sub'}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm text-slate-400 font-sans tracking-wide font-medium"
        >
          {isLogin ? 'Welcome back to your learning operating system.' : 'Begin your journey. Learn, Log, Share.'}
        </motion.p>
      </div>

      <motion.div
        layout="position"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onMouseMove={handleCardMouseMove}
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
        className={`w-full max-w-md bg-slate-950/80 backdrop-blur-md border p-8 rounded-[32px] relative overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] transition-colors duration-500 will-change-transform ${
          activeFocus ? 'border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.15)]' : 'border-white/10 hover:border-white/15'
        }`}
      >
        {/* Moving glass highlight reflection sweep */}
        <motion.div
          initial={{ x: '-150%', skewX: -25 }}
          animate={{ x: '150%' }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 4 }}
          className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-0 will-change-transform"
        />

        {/* Interactive Radial Spotlight overlay - Optimized using radial-gradient instead of blur filter */}
        <motion.div
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, rgba(0, 0, 0, 0) 70%)',
            x: cardSpringX,
            y: cardSpringY,
            translateX: '-50%',
            translateY: '-50%',
            opacity: isCardHovered ? 1 : 0,
          }}
          className="absolute w-72 h-72 rounded-full pointer-events-none transition-opacity duration-500 will-change-transform"
        />

        <div className="flex justify-around border-b border-white/10 pb-4 mb-6 relative z-10">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`font-sans font-bold text-xs uppercase tracking-[0.15em] pb-2 relative transition-colors cursor-pointer ${
              isLogin ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Sign In
            {isLogin && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-400"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`font-sans font-bold text-xs uppercase tracking-[0.15em] pb-2 relative transition-colors cursor-pointer ${
              !isLogin ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Create Account
            {!isLogin && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-400"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl font-medium text-center shadow-inner overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Username */}
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block">Username</label>
            <div className="relative group">
              <motion.div
                animate={{
                  scale: activeFocus === 'username' ? 1.15 : 1,
                  color: activeFocus === 'username' ? '#818cf8' : '#64748b'
                }}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                <User className="w-4 h-4" />
              </motion.div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setActiveFocus('username')}
                onBlur={() => setActiveFocus(null)}
                placeholder="akshat"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block">Password</label>
              <AnimatePresence mode="wait">
                {password && (
                  <motion.div
                    key={getPasswordStrength(password) || 'none'}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {getPasswordStrength(password) === 'weak' && <span className="text-rose-400">Weak 🔴</span>}
                    {getPasswordStrength(password) === 'medium' && <span className="text-amber-400">Medium 🟡</span>}
                    {getPasswordStrength(password) === 'strong' && <span className="text-emerald-400">Strong 🟢</span>}
                    {getPasswordStrength(password) === 'excellent' && <span className="text-indigo-400 font-extrabold">Excellent ✨</span>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <motion.div
                animate={{
                  scale: activeFocus === 'password' ? 1.15 : 1,
                  color: activeFocus === 'password' ? '#818cf8' : '#64748b'
                }}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              >
                <Lock className="w-4 h-4" />
              </motion.div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setActiveFocus('password')}
                onBlur={() => setActiveFocus(null)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-12 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </motion.div>

          {/* Signup Only Fields */}
          <AnimatePresence initial={false}>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Display Name */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block">Display Name</label>
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: activeFocus === 'displayName' ? 1.15 : 1,
                        color: activeFocus === 'displayName' ? '#818cf8' : '#64748b'
                      }}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onFocus={() => setActiveFocus('displayName')}
                      onBlur={() => setActiveFocus(null)}
                      placeholder="Akshat Sharma"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* University */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block">University</label>
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: activeFocus === 'university' ? 1.15 : 1,
                        color: activeFocus === 'university' ? '#818cf8' : '#64748b'
                      }}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
                    >
                      <School className="w-4 h-4" />
                    </motion.div>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      onFocus={() => setActiveFocus('university')}
                      onBlur={() => setActiveFocus(null)}
                      placeholder="IIT Delhi"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Branch & Year Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block">Branch</label>
                    <div className="relative">
                      <motion.div
                        animate={{
                          scale: activeFocus === 'branch' ? 1.15 : 1,
                          color: activeFocus === 'branch' ? '#818cf8' : '#64748b'
                        }}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </motion.div>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        onFocus={() => setActiveFocus('branch')}
                        onBlur={() => setActiveFocus(null)}
                        placeholder="CSE"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] block">Year</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        onFocus={() => setActiveFocus('year')}
                        onBlur={() => setActiveFocus(null)}
                        placeholder="3rd Year"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submission Button */}
          <motion.div variants={itemVariants} className="pt-2">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01, boxShadow: '0 0 25px rgba(255, 255, 255, 0.35)' }}
              whileTap={{ scale: 0.99 }}
              className="w-full btn-primary py-3.5 mt-4 text-sm font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 relative overflow-hidden"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Access PACE' : 'Create Profile'}</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </motion.div>

          {isLogin ? (
            <div className="text-[11px] text-slate-500 text-center font-medium pt-1">
              Don't have a PACE account yet? Click <button type="button" onClick={() => { setIsLogin(false); setError(''); }} className="text-indigo-400 hover:underline font-bold cursor-pointer">Create Account</button> above to register.
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 text-center font-medium pt-1">
              Already registered? Click <button type="button" onClick={() => { setIsLogin(true); setError(''); }} className="text-indigo-400 hover:underline font-bold cursor-pointer">Sign In</button> above to login.
            </div>
          )}

          {/* OR divider */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 pt-2">
            <div className="h-[1px] bg-white/10 flex-grow" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">or</span>
            <div className="h-[1px] bg-white/10 flex-grow" />
          </motion.div>

          {/* Google Button */}
          <motion.div variants={itemVariants}>
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-white/[0.03] border border-white/10 text-slate-100 py-3.5 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {googleLoading ? (
                <span className="w-5 h-5 border-2 border-slate-100/30 border-t-slate-100 rounded-full animate-spin" />
              ) : (
                <>
                  <Chrome className="w-4 h-4 text-indigo-400" />
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
      </div> {/* Closing w-full max-w-md flex flex-col items-center */}
    </div>
  );
}
