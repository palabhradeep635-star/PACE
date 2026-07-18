/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LearningEvent } from '../types';
import { Calendar, CheckCircle2, Sparkles, X, Flame, Clock, Code, Library } from 'lucide-react';

interface ActivityHeatmapProps {
  logs: LearningEvent[];
  isPrivate?: boolean;
}

// Pure utility functions declared outside component to prevent recreation on every render
const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatHumanDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const getCellIntensity = (count: number) => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count <= 5) return 4;
  return 5;
};

const getCellColorClass = (intensity: number, isFuture: boolean) => {
  if (isFuture) return 'bg-white/[0.01] border border-white/[0.02] opacity-10 pointer-events-none';
  switch (intensity) {
    case 0:
      return 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08]';
    case 1:
      return 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-950/60';
    case 2:
      return 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60';
    case 3:
      return 'bg-violet-800/40 border border-violet-500/40 text-violet-200 hover:bg-violet-800/60';
    case 4:
      return 'bg-violet-600/60 border border-violet-400/50 text-violet-100 hover:bg-violet-600/80 shadow-[0_0_8px_rgba(139,92,246,0.15)]';
    case 5:
    default:
      return 'bg-cyan-400 border border-cyan-300/50 text-cyan-950 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
  }
};

interface MonthGridProps {
  m: any;
  monthIdx: number;
  logsByDate: Record<string, { count: number; events: LearningEvent[] }>;
  isHoveredMonth: boolean;
  isDimmed: boolean;
  isLoaded: boolean;
  todayStr: string;
  hoveredCellDate?: string;
  setHoveredMonthName: (name: string | null) => void;
  handleMouseEnter: (dateStr: string, isFuture: boolean, intensity: number, events: LearningEvent[], count: number, e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  setSelectedDate: (date: string | null) => void;
}

// Memoized Sub-Component to isolate month render blocks from parent hover state updates
const MonthGrid = React.memo(function MonthGrid({
  m,
  monthIdx,
  logsByDate,
  isHoveredMonth,
  isDimmed,
  isLoaded,
  todayStr,
  hoveredCellDate,
  setHoveredMonthName,
  handleMouseEnter,
  handleMouseLeave,
  setSelectedDate,
}: MonthGridProps) {
  return (
    <div
      onMouseEnter={() => setHoveredMonthName(m.name)}
      onMouseLeave={() => setHoveredMonthName(null)}
      className={`border rounded-2xl p-3.5 transition-all duration-300 flex flex-col justify-between select-none ${
        m.isCurrent 
          ? 'bg-indigo-500/5 border-indigo-500/20 shadow-[0_4px_20px_rgba(99,102,241,0.06)]' 
          : isHoveredMonth
          ? 'bg-white/[0.04] border-white/15 shadow-[0_4px_20px_rgba(255,255,255,0.02)]'
          : 'bg-white/[0.01] border-white/5'
      } ${isDimmed ? 'opacity-40 blur-[0.5px]' : 'opacity-100'}`}
      style={{
        transform: isHoveredMonth ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Month Label Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-wider font-sans transition-colors ${
          m.isCurrent || isHoveredMonth ? 'text-indigo-400' : 'text-slate-400'
        }`}>
          {m.name}
        </span>
        <span className="text-[9px] font-bold text-slate-600 font-mono">{m.year}</span>
      </div>

      {/* mini calendar grid layout for the month */}
      <div className="flex gap-1.5 justify-center">
        {/* Days labels on the left of each month (Mon, Wed, Fri inline) */}
        <div className="flex flex-col justify-between text-[8px] font-bold text-slate-600 font-mono pt-[3px] pb-[3px] select-none h-[115px] pr-1">
          <span>S</span>
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
        </div>

        <div className="flex gap-1.2 flex-1 justify-start">
          {m.weeks.map((week: (Date | null)[], colIdx: number) => {
            return (
              <div key={colIdx} className="flex flex-col gap-1.2 shrink-0">
                {week.map((date, rowIdx) => {
                  if (!date) {
                    // Empty placeholder spacer for out-of-month padding
                    return <div key={rowIdx} className="w-[12px] h-[12px] rounded-[3px] bg-transparent" />;
                  }
                  
                  const dateStr = formatDateKey(date);
                  const isFuture = date > new Date();
                  const dayData = logsByDate[dateStr] || { count: 0, events: [] };
                  const intensity = getCellIntensity(dayData.count);
                  const cellColor = getCellColorClass(intensity, isFuture);
                  const isToday = dateStr === todayStr;

                  // Calculate custom delay based on row and column index for a left-to-right sweep illumination
                  const delayMs = isLoaded ? 0 : (monthIdx * 60 + colIdx * 10 + rowIdx * 2);
                  const isHovered = hoveredCellDate === dateStr;

                  return (
                    <motion.div
                      key={rowIdx}
                      onMouseEnter={(e) => handleMouseEnter(dateStr, isFuture, intensity, dayData.events, dayData.count, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => {
                        if (!isFuture && dayData.count > 0) {
                          setSelectedDate(dateStr);
                        }
                      }}
                      whileHover={isFuture ? undefined : { scale: 1.08 }}
                      animate={{
                        opacity: isLoaded ? 1 : 0,
                        scale: isLoaded ? (isHovered ? 1.08 : 1) : 0.5,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15
                      }}
                      style={{
                        transitionDelay: `${delayMs}ms`,
                      }}
                      className={`w-[12px] h-[12px] rounded-[3px] cursor-pointer ${cellColor} relative transition-colors duration-300 ${
                        isToday ? 'ring-1.5 ring-cyan-400 ring-offset-1 ring-offset-slate-950 animate-pulse' : ''
                      } ${
                        isHovered && intensity === 5
                          ? 'ring-2 ring-cyan-300 ring-offset-1 ring-offset-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.85)] z-20'
                          : isHovered && (intensity === 4 || intensity === 3)
                          ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-950 shadow-[0_0_10px_rgba(167,139,250,0.8)] z-20'
                          : isHovered && intensity > 0
                          ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950 shadow-[0_0_8px_rgba(99,102,241,0.7)] z-20'
                          : isHovered
                          ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-slate-950 z-20'
                          : 'z-10'
                      }`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default function ActivityHeatmap({ logs, isPrivate = false }: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hover states
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    intensity: number;
    points: number;
    studyTime: number;
    problemsSolved: number;
    resources: number;
    sessions: number;
    preview: string;
    cellRect: DOMRect | null;
  } | null>(null);

  const [hoveredMonthName, setHoveredMonthName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger sequential loading animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Group logs by date
  const logsByDate = useMemo(() => {
    const counts: Record<string, { count: number; events: LearningEvent[] }> = {};
    logs.forEach(log => {
      const dateStr = log.createdAt.split('T')[0];
      if (!counts[dateStr]) {
        counts[dateStr] = { count: 0, events: [] };
      }
      counts[dateStr].count += 1;
      counts[dateStr].events.push(log);
    });
    return counts;
  }, [logs]);

  // Generate 12 months structure
  const monthsData = useMemo(() => {
    const result = [];
    const today = new Date();
    
    // Past 12 months, ending with the current month
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      const dates: Date[] = [];
      const numDays = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= numDays; day++) {
        dates.push(new Date(year, month, day));
      }
      
      // Group into weeks (each week has 7 elements, Sunday to Saturday)
      const weeksList: (Date | null)[][] = [];
      let currentWeek: (Date | null)[] = Array(7).fill(null);
      
      dates.forEach(date => {
        const dayOfWeek = date.getDay();
        currentWeek[dayOfWeek] = date;
        if (dayOfWeek === 6 || date.getDate() === numDays) {
          weeksList.push(currentWeek);
          currentWeek = Array(7).fill(null);
        }
      });
      
      if (weeksList.length === 0 || !weeksList.includes(currentWeek)) {
        if (currentWeek.some(day => day !== null)) {
          weeksList.push(currentWeek);
        }
      }
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthShortNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      
      result.push({
        year,
        month,
        name: monthNames[month],
        shortName: monthShortNames[month],
        weeks: weeksList,
        isCurrent: today.getFullYear() === year && today.getMonth() === month
      });
    }
    
    return result;
  }, []);

  // Dynamic analysis of daily learning content to extract points, study time, problems solved
  const analyzeDayLogs = useCallback((events: LearningEvent[], count: number) => {
    let points = 0;
    let studyTimeMinutes = 0;
    let problemsSolved = 0;
    let resourcesCount = 0;
    let sessions = events.length;

    events.forEach(e => {
      points += 100; // base points
      const text = e.content.toLowerCase();
      
      // Attempt to parse minutes or hours
      let detectedMinutes = 0;
      const minMatch = text.match(/(\d+)\s*(min|minute)/);
      const hrMatch = text.match(/(\d+)\s*(hr|hour)/);
      if (minMatch) detectedMinutes += parseInt(minMatch[1], 10);
      if (hrMatch) detectedMinutes += parseInt(hrMatch[1], 10) * 60;

      if (detectedMinutes > 0) {
        studyTimeMinutes += detectedMinutes;
        points += Math.round(detectedMinutes * 1.5);
      } else {
        studyTimeMinutes += 45; // default estimate
        points += 50;
      }

      // Problems Solved
      const probMatch = text.match(/(\d+)\s*problem/);
      if (probMatch) {
        problemsSolved += parseInt(probMatch[1], 10);
      } else if (text.includes('leetcode') || text.includes('solve')) {
        problemsSolved += 3;
      }

      // Resources
      if (text.includes('chapter') || text.includes('read') || text.includes('book') || text.includes('lecture') || text.includes('video') || text.includes('watch')) {
        resourcesCount += 1;
      }
    });

    return {
      points: count > 0 ? points : 0,
      studyTime: count > 0 ? studyTimeMinutes : 0,
      problemsSolved: count > 0 ? problemsSolved : 0,
      resources: count > 0 ? (resourcesCount || 1) : 0,
      sessions: count > 0 ? sessions : 0,
      preview: events.length > 0 ? events[0].content : ""
    };
  }, []);

  // Ultra performant direct DOM modification for cosmetic mouse Spotlight - avoids triggering any React renders
  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !lightRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lightRef.current.style.left = `${x}px`;
    lightRef.current.style.top = `${y}px`;
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    if (lightRef.current) {
      lightRef.current.style.opacity = '1';
    }
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    if (lightRef.current) {
      lightRef.current.style.opacity = '0';
    }
  }, []);

  const handleMouseEnter = useCallback((
    dateStr: string,
    isFuture: boolean,
    intensity: number,
    events: LearningEvent[],
    count: number,
    e: React.MouseEvent
  ) => {
    if (isFuture) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const analysis = analyzeDayLogs(events, count);

    setHoveredCell({
      date: dateStr,
      intensity,
      points: analysis.points,
      studyTime: analysis.studyTime,
      problemsSolved: analysis.problemsSolved,
      resources: analysis.resources,
      sessions: analysis.sessions,
      preview: analysis.preview,
      cellRect: rect
    });
  }, [analyzeDayLogs]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setHoveredCell(null);
    }, 150);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setHoveredCell(null);
    }, 150);
  }, []);

  if (isPrivate) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center shadow-2xl relative overflow-hidden my-8">
        <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">Learning Activity</h4>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto font-medium">
          This student's learning activity heatmap is private.
        </p>
      </div>
    );
  }

  const isEmptyState = logs.length === 0;
  const todayStr = formatDateKey(new Date());

  // Tooltip viewport positioning and horizontal clamping
  let tooltipStyle: React.CSSProperties = {};
  let placement: 'top' | 'bottom' = 'top';

  if (hoveredCell && hoveredCell.cellRect) {
    const rect = hoveredCell.cellRect;
    const tooltipWidth = 340;
    const tooltipHeight = 185;
    const safetyMargin = 12;

    // Viewport-relative check for vertical flip:
    const wouldOverflowTop = rect.top - tooltipHeight - safetyMargin < 0;

    const x = rect.left + rect.width / 2;
    let y = 0;

    if (wouldOverflowTop) {
      placement = 'bottom';
      y = rect.bottom + safetyMargin;
      tooltipStyle = {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      };
    } else {
      placement = 'top';
      y = rect.top - safetyMargin;
      tooltipStyle = {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
      };
    }

    // Horizontal viewport clamping to keep full card in view:
    const halfWidth = tooltipWidth / 2;
    const minLeft = halfWidth + safetyMargin;
    const maxLeft = window.innerWidth - halfWidth - safetyMargin;

    let clampedX = x;
    if (clampedX < minLeft) {
      clampedX = minLeft;
    } else if (clampedX > maxLeft) {
      clampedX = maxLeft;
    }

    tooltipStyle.left = `${clampedX}px`;
  }

  return (
    <>
      <div className="my-8" ref={containerRef}>
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-5 px-1">
          <h3 className="font-display font-semibold text-sm text-slate-300 uppercase tracking-[0.15em] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Learning Pulse
          </h3>
          <span className="text-xs text-slate-500 font-bold tracking-wider font-mono">Past 12 Months</span>
        </div>

        {/* Signature Multi-Layer Glass Heatmap Card Container */}
        <motion.div
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-950/40 border border-white/10 rounded-[32px] p-6 relative overflow-hidden shadow-2xl backdrop-blur-2xl transition-colors duration-500 hover:border-white/15"
        >
          {/* Soft Ambient Radial Light following mouse - Managed directly via ref style to run at 60 FPS */}
          <div
            ref={lightRef}
            style={{
              transform: 'translate(-50%, -50%)',
              left: '-999px',
              top: '-999px',
              opacity: 0,
            }}
            className="absolute w-80 h-80 bg-indigo-500/5 rounded-full blur-[70px] pointer-events-none transition-opacity duration-500"
          />

          {/* Top diagonal glass highlight */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />

          {/* 12-Month Grid: Bounded, Isolated Months */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 relative z-10">
            {monthsData.map((m, monthIdx) => {
              const isHoveredMonth = hoveredMonthName === m.name;
              const isDimmed = hoveredMonthName !== null && hoveredMonthName !== m.name;
              
              return (
                <MonthGrid
                  key={monthIdx}
                  m={m}
                  monthIdx={monthIdx}
                  logsByDate={logsByDate}
                  isHoveredMonth={isHoveredMonth}
                  isDimmed={isDimmed}
                  isLoaded={isLoaded}
                  todayStr={todayStr}
                  hoveredCellDate={hoveredCell?.date}
                  setHoveredMonthName={setHoveredMonthName}
                  handleMouseEnter={handleMouseEnter}
                  handleMouseLeave={handleMouseLeave}
                  setSelectedDate={setSelectedDate}
                />
              );
            })}
          </div>

          {/* Premium Legend & Footer Controls */}
          <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between gap-4 flex-wrap select-none relative z-10">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              {isEmptyState ? "Your learning journey begins today." : "Click logged days to view study notes"}
            </span>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
              <span>Less Active</span>
              <div className="flex gap-[4px]">
                <div className="w-[11px] h-[11px] rounded-[2.5px] bg-white/[0.03] border border-white/[0.04]" />
                <div className="w-[11px] h-[11px] rounded-[2.5px] bg-indigo-950/40 border border-indigo-500/20" />
                <div className="w-[11px] h-[11px] rounded-[2.5px] bg-indigo-900/40 border border-indigo-500/30" />
                <div className="w-[11px] h-[11px] rounded-[2.5px] bg-violet-800/40 border border-violet-500/40" />
                <div className="w-[11px] h-[11px] rounded-[2.5px] bg-violet-600/60 border border-violet-400/50" />
                <div className="w-[11px] h-[11px] rounded-[2.5px] bg-cyan-400 border border-cyan-300/40" />
              </div>
              <span>More Active</span>
            </div>
          </div>

          {/* Integrated Clean Empty State Overlay inside the calendar card */}
          {isEmptyState && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-6 p-8 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Your learning journey begins today.</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Log your very first study block on the dashboard to trigger the interactive heatmap, unlock levels, and connect with peers!
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Click Day Details Side-Drawer/Modal */}
        <AnimatePresence>
          {selectedDate && selectedDate in logsByDate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDate(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.96, y: 10, filter: 'blur(4px)' }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className="bg-slate-900 border border-white/10 p-6 rounded-[28px] max-w-md w-full relative z-10 shadow-2xl max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4 shrink-0">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Learning Records</span>
                    <h3 className="text-lg font-display font-semibold text-slate-100 mt-0.5">{formatHumanDate(selectedDate)}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-3 pr-1 flex-1 py-1">
                  {(logsByDate[selectedDate]?.events || []).map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-bold font-mono">
                          {new Date(event.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-sm text-slate-100 leading-relaxed font-medium mt-1 font-sans break-words whitespace-pre-wrap">
                          {event.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10 mt-4 shrink-0 flex justify-end">
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="px-5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-full transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Cell Tooltip with beautiful glass structure using Portal */}
      {createPortal(
        <AnimatePresence>
          {hoveredCell && hoveredCell.cellRect && (
            <motion.div
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
              initial={{ opacity: 0, y: placement === 'top' ? 8 : -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: placement === 'top' ? 8 : -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed z-[9999] bg-slate-950/90 border border-white/10 p-4 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-auto select-none overflow-hidden"
              style={{
                ...tooltipStyle,
                width: '340px',
              }}
            >
              <div className="font-display font-bold text-slate-100 text-xs mb-1">
                {formatHumanDate(hoveredCell.date)}
              </div>
              <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-[0.1em] mb-3">
                {hoveredCell.intensity === 0 
                  ? 'Inactive Day' 
                  : hoveredCell.intensity === 5
                  ? '🔥 Exceptional Study Day'
                  : 'Active Learning Block'}
              </div>
              
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5 mb-2.5 text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>{hoveredCell.points} PACE pts</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{hoveredCell.studyTime} mins</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{hoveredCell.problemsSolved} Solved</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Library className="w-3.5 h-3.5 text-purple-400" />
                  <span>{hoveredCell.resources} Resources</span>
                </div>
              </div>

              {hoveredCell.preview ? (
                <div className="text-[10px] border-t border-white/5 pt-2 text-slate-300 leading-relaxed italic break-words">
                  "{hoveredCell.preview.length > 90 ? `${hoveredCell.preview.slice(0, 87)}...` : hoveredCell.preview}"
                </div>
              ) : (
                <div className="text-[9px] text-slate-500 italic">No notes logged for this date.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
