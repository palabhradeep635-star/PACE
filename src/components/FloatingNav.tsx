/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Home, Edit3, Users, User, Settings } from 'lucide-react';

interface FloatingNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
}

export default function FloatingNav({ activeTab, setActiveTab, onOpenSettings }: FloatingNavProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor page scroll to create a responsive, spatial shrinking effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'log', label: 'Log', icon: Edit3 },
    { id: 'people', label: 'People', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <>
      {/* Desktop Floating Navigation */}
      <motion.div 
        id="desktop-nav" 
        className="hidden md:flex fixed top-6 left-1/2 z-50 pointer-events-auto"
        initial={{ x: "-50%", y: -20, opacity: 0 }}
        animate={{ 
          x: "-50%",
          y: isScrolled ? 6 : 0, 
          opacity: 1,
          scale: isScrolled ? 0.95 : 1
        }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        <div 
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`px-3.5 py-2.5 rounded-full flex items-center gap-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] relative overflow-hidden border transition-all duration-300 ${
            isScrolled 
              ? 'bg-slate-950/80 border-white/15 backdrop-blur-3xl' 
              : 'bg-slate-950/60 border-white/10 backdrop-blur-2xl'
          }`}
        >
          {/* Subtle cursor-reactive magnetic glow */}
          {isHovered && (
            <div 
              style={{
                left: mousePos.x,
                top: mousePos.y,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute w-28 h-28 bg-indigo-500/10 rounded-full blur-xl pointer-events-none transition-opacity duration-300"
            />
          )}

          <div className="flex items-center gap-1.5 relative z-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  whileHover="hover"
                  className={`relative px-4.5 py-2 rounded-full text-xs font-bold tracking-wider flex items-center gap-2 transition-colors duration-200 cursor-pointer select-none ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePillDesktop"
                      className="absolute inset-0 bg-white/10 border border-white/15 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_24px_rgba(99,102,241,0.12)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <motion.div 
                    variants={{
                      hover: { y: -1, scale: 1.05 }
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-indigo-400'}`} />
                  </motion.div>
                  <motion.span 
                    variants={{
                      hover: { color: "#ffffff" }
                    }}
                    className="relative z-10 transition-colors uppercase text-[10px] tracking-widest font-bold"
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-white/15 mx-2 relative z-10" />

          <motion.button
            onClick={onOpenSettings}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(99,102,241,0.12)" }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-all cursor-pointer relative z-10"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <div id="mobile-nav" className="md:hidden fixed bottom-6 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-3xl border border-white/12 p-1.5 rounded-full flex items-center justify-between shadow-[0_24px_55px_rgba(0,0,0,0.85)] w-full max-w-sm pointer-events-auto">
          <div className="flex items-center justify-between flex-1 pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="relative flex items-center justify-center transition-all duration-300 select-none flex-1 min-w-[48px] min-h-[44px] cursor-pointer"
                >
                  {isActive ? (
                    <motion.div
                      layoutId="activeCapsuleMobile"
                      className="bg-white/10 border border-white/15 px-3.5 py-2.5 rounded-full flex items-center gap-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-100">{item.label}</span>
                    </motion.div>
                  ) : (
                    <div className="p-3.5 text-slate-500 hover:text-slate-300 transition-colors duration-200 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0" />

          <button
            onClick={onOpenSettings}
            className="p-3.5 min-w-[44px] min-h-[44px] rounded-full text-indigo-400 hover:text-indigo-300 transition-colors duration-200 flex items-center justify-center cursor-pointer shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
