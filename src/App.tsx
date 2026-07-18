/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Lenis from 'lenis';
import { api } from './lib/api';
import { UserProfile } from './types';
import FloatingNav from './components/FloatingNav';
import SettingsModal from './components/SettingsModal';
import HomeView from './components/HomeView';
import LogView from './components/LogView';
import PeopleView from './components/PeopleView';
import ProfileView from './components/ProfileView';
import AuthView from './components/AuthView';
import AnimatedBackground from './components/AnimatedBackground';
import PacoMascot from './components/PacoMascot';

export default function App() {
  const [token, setToken] = useState<string | null>(api.getToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState('Connecting securely...');

  // Authenticate session on mount
  useEffect(() => {
    async function checkSession() {
      if (!token) {
        setCheckingSession(false);
        return;
      }

      // Helper function to update text & insert brief visual cadence for text readability
      const setStage = async (text: string, delayMs = 120) => {
        setLoadingText(text);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      };

      try {
        await setStage('Connecting securely...', 250);
        
        // 1. Authenticate with Supabase Auth via profiles/me
        const profile = await api.me();
        setUser(profile);
        await setStage('✓ Authentication verified', 280);

        // 2. Fetch learning history
        await setStage('Syncing learning history...', 180);
        await api.getMyLogs();

        // 3. Fetch feed classmates
        await setStage('Loading your classmates...', 180);
        await api.getFeed();

        // 4. Wrap up UI construction
        await setStage('Preparing analytics...', 150);
        await setStage('Building today\'s dashboard...', 150);
        await setStage('Welcome back.', 180);

      } catch (error) {
        console.warn('Session expired or invalid:', error);
        api.logout();
        setToken(null);
        setUser(null);
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [token]);

  // Setup Lenis Butter Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium expo out easing
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleAuthSuccess = (newToken: string, authedUser: UserProfile) => {
    setToken(newToken);
    setUser(authedUser);
    setActiveTab('home');
  };

  const handleLogout = () => {
    api.logout();
    setToken(null);
    setUser(null);
    setActiveTab('home');
  };

  const handleRefreshUser = async () => {
    if (!token) return;
    try {
      const updatedProfile = await api.me();
      setUser(updatedProfile);
    } catch (e) {
      console.error(e);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 select-none font-sans relative">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4 relative z-10 w-full max-w-xs text-center">
          <PacoMascot mode="compact" customTip="Paco is compiling your dashboard... 🦉" className="mb-2" />
          <div className="h-6 flex items-center justify-center w-full">
            <AnimatePresence mode="wait">
              <motion.span
                key={loadingText}
                initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="text-[10px] sm:text-xs text-indigo-400 font-bold uppercase tracking-[0.2em] block"
              >
                {loadingText}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-12 overflow-hidden bg-transparent text-slate-100 font-sans">
      {/* Unconditional continuous animated background */}
      <AnimatedBackground />

      <AnimatePresence mode="wait">
        {!token || !user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <AuthView onAuthSuccess={handleAuthSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="app-workspace"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Floating Pill Navigation */}
            <FloatingNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Comprehensive Settings Modal */}
            <SettingsModal
              user={user}
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              onLogout={handleLogout}
              onProfileUpdated={(updated) => setUser(updated)}
            />

            {/* Global Floating Study Companion */}
            <PacoMascot 
              floating={true} 
              onNavigate={setActiveTab} 
              activeTab={activeTab} 
              forceProfile={user} 
            />

            {/* View router with clean transitions */}
            <main className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 24, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 180,
                    damping: 22,
                    mass: 0.9
                  }}
                >
                  {activeTab === 'home' && (
                    <HomeView
                      user={user}
                      onRefreshUser={handleRefreshUser}
                      setActiveTab={setActiveTab}
                    />
                  )}
                  {activeTab === 'log' && (
                    <LogView
                      onLogCompleted={(updatedProfile) => setUser(updatedProfile)}
                      setActiveTab={setActiveTab}
                    />
                  )}
                  {activeTab === 'people' && <PeopleView currentUser={user} />}
                  {activeTab === 'profile' && (
                    <ProfileView
                      user={user}
                      onProfileUpdated={(updated) => setUser(updated)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
