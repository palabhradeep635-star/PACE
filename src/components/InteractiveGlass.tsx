/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface InteractiveGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  glowColor?: string;
}

export default function InteractiveGlass({
  children,
  className = '',
  hoverScale = 1.015,
  glowColor = 'rgba(99, 102, 241, 0.12)', // Subtle indigo glow
  ...props
}: InteractiveGlassProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for pointer position relative to element
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs to avoid jitter
  const springConfig = { stiffness: 200, damping: 25 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);

  // Transform for subtle reflective tilt/shift (extremely low limits to feel natural, not game-like)
  const tiltX = useTransform(glowY, [0, 400], [0.8, -0.8]);
  const tiltY = useTransform(glowX, [0, 400], [-0.8, 0.8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Reset spring values slowly
    mouseX.set(0);
    mouseY.set(0);
  };

  // Build the radial background glow style dynamically
  const glowBackground = useTransform(
    [glowX, glowY],
    ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, ${glowColor}, transparent 80%)`
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: tiltX,
        rotateY: tiltY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{
        scale: hoverScale,
        y: -3,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
      className={`relative rounded-[32px] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl transition-colors duration-500 ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Overlay */}
      <motion.div
        style={{
          background: glowBackground,
          opacity: isHovered ? 1 : 0,
        }}
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
      />

      {/* Subtle shifting diagonal glass reflection */}
      <motion.div
        style={{
          x: useTransform(glowX, [0, 500], [-15, 15]),
          y: useTransform(glowY, [0, 500], [-15, 15]),
        }}
        className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent z-0 opacity-40"
      />

      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
