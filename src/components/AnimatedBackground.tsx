/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: -1000, y: -1000 });

  // Spring animation values for cursor parallax (lag-free, high-performance GPU movement)
  const springConfig = { stiffness: 45, damping: 25, mass: 0.8 };
  const driftX = useSpring(0, springConfig);
  const driftY = useSpring(0, springConfig);

  // Dedicated top-level springs to avoid dynamic hook instantiation inside style props
  const driftX3 = useSpring(0, springConfig);
  const driftY3 = useSpring(0, springConfig);
  const driftX4 = useSpring(0, { ...springConfig, stiffness: 20 });
  const driftY4 = useSpring(0, { ...springConfig, stiffness: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      
      // Calculate normalized offset from center (-24px to +24px drift)
      const normX = (e.clientX / window.innerWidth - 0.5) * 24;
      const normY = (e.clientY / window.innerHeight - 0.5) * 24;
      
      driftX.set(normX);
      driftY.set(normY);
      driftX3.set(-normX * 0.8); // counter-drift
      driftY3.set(-normY * 0.8);
      driftX4.set(normX * 1.5);
      driftY4.set(normY * 1.5);
    };

    const handleMouseLeave = () => {
      mousePosRef.current = { x: -1000, y: -1000 };
      driftX.set(0);
      driftY.set(0);
      driftX3.set(0);
      driftY3.set(0);
      driftX4.set(0);
      driftY4.set(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [driftX, driftY, driftX3, driftY3, driftX4, driftY4]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    // Adjust density based on screen size
    const particleCount = Math.min(50, Math.floor((width * height) / 35000));

    // Initialize particles with different hues (Indigo to Violet to Blue)
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25, // slow drifting
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.5 ? 240 : 260, // indigo/purple
      });
    }

    const resizeHandler = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeHandler);

    let lastTime = performance.now();

    const draw = (time: number) => {
      // Delta time normalization to achieve uniform speeds across 60Hz, 120Hz, or 144Hz displays
      const delta = Math.min(3, (time - lastTime) / 16.666);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Draw elegant subtle connecting constellation lines (O(N^2) but optimized by avoiding Math.sqrt)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 16900) { // 130px squared
            const dist = Math.sqrt(distSq);
            // Smooth gradient alpha as points get further
            const alpha = (1 - dist / 130) * 0.05;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`; // Violet subtle line
            ctx.lineWidth = 0.6;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      const currentMouse = mousePosRef.current;

      // Draw & update floating stars
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 231, 255, ${p.alpha})`; // White/Indigo soft star
        ctx.fill();

        // Update coordinates scaled by delta
        p.x += p.vx * delta;
        p.y += p.vy * delta;

        // Micro-cursor repulsion physics scaled by delta
        if (currentMouse.x !== -1000) {
          const dx = p.x - currentMouse.x;
          const dy = p.y - currentMouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 16900) { // 130px squared
            const dist = Math.sqrt(distSq);
            const force = (130 - dist) / 130;
            const angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * force * 0.8 * delta;
            p.y += Math.sin(angle) * force * 0.8 * delta;
          }
        }

        // Star boundary wrapping
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden bg-slate-950 pointer-events-none select-none">
      {/* Mesh Layer 1: Ambient deep navy background layer */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* Mesh Layer 2: Main slow breathing Purple/Indigo gradient orb */}
      <motion.div
        style={{
          x: driftX,
          y: driftY,
        }}
        animate={{
          scale: [1, 1.05, 0.95, 1],
          opacity: [0.22, 0.28, 0.24, 0.22],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vw] bg-gradient-to-br from-indigo-600/25 via-violet-800/12 to-transparent rounded-full blur-[130px] will-change-transform"
      />

      {/* Mesh Layer 3: Cyan/Electric Blue counter-breathing gradient orb */}
      <motion.div
        style={{
          x: driftX3,
          y: driftY3,
        }}
        animate={{
          scale: [1, 0.95, 1.05, 1],
          opacity: [0.15, 0.20, 0.17, 0.15],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-15%] right-[-10%] w-[65vw] h-[65vw] bg-gradient-to-tl from-cyan-500/15 via-blue-700/10 to-transparent rounded-full blur-[120px] will-change-transform"
      />

      {/* Mesh Layer 4: Floating central violet core aura */}
      <motion.div
        style={{
          x: driftX4,
          y: driftY4,
        }}
        animate={{
          y: [0, 30, -20, 0],
          x: [0, -20, 30, 0],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[20%] left-[25%] w-[50vw] h-[50vh] bg-violet-600/5 rounded-full blur-[140px] will-change-transform"
      />

      {/* Cybernetic Grid Pattern Overlay (Static for peak rendering performance) */}
      <div 
        className="absolute inset-0 opacity-[0.015]" 
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '56px 56px'
        }}
      />

      {/* Premium Cinematic Grain / Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.012]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.7'/%3E%3C/svg%3E")`
        }}
      />

      {/* Subtle Diagonal Glass reflection/light sweep */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 10,
        }}
        className="absolute top-0 bottom-0 w-[40vw] bg-gradient-to-r from-transparent via-white/[0.01] to-transparent transform -skew-x-12 blur-md pointer-events-none will-change-transform"
      />

      {/* Interactive Constellation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block opacity-60" />
    </div>
  );
}
