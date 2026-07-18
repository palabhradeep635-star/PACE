/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile, LearningEvent } from '../types';
import { 
  Sparkles, Send, CheckCircle2, AlertTriangle, ArrowRight, 
  HelpCircle, Sliders, Edit3, BookOpen, Clock, Code, Link2, 
  ChevronRight, Award, Trophy, Info, Camera, Zap, Plus, X, RotateCcw
} from 'lucide-react';
import PacoMascot from './PacoMascot';

interface LogViewProps {
  onLogCompleted: (updatedProfile: UserProfile) => void;
  setActiveTab: (tab: string) => void;
}

export default function LogView({ onLogCompleted, setActiveTab }: LogViewProps) {
  // Tabs: quick (natural language) vs detailed (structured fields)
  const [activeMode, setActiveMode] = useState<'quick' | 'detailed'>('quick');
  
  // Quick mode inputs
  const [quickText, setQuickText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);

  // Detailed mode inputs
  const [activityType, setActivityType] = useState('Coding Practice');
  const [subject, setSubject] = useState('DSA');
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('LeetCode');
  const [resource, setResource] = useState('');
  const [duration, setDuration] = useState<number>(45);
  const [problemsSolved, setProblemsSolved] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'unspecified'>('unspecified');
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState('');
  const [screenshotName, setScreenshotName] = useState<string | null>(null);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    event: LearningEvent;
    profile: UserProfile;
    insights: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [animateShake, setAnimateShake] = useState(false);
  
  // Real-time score ticker state
  const [animatedScore, setAnimatedScore] = useState(0);

  // Suggestions for quick inspiration
  const suggestions = [
    'Solved 3 LeetCode medium problems on Binary Search, revised DBMS Normalization for 1 hour.',
    'Completed Agile Sprint Planning notes and solved Codeforces Round 1050 Div2 A.',
    'Watched Abdul Bari Lecture 18 on Dynamic Programming and implemented Knapsack.',
    'Developed user auth routes in Express and tested in Postman for 2 hours.'
  ];

  // Quick analyze handler
  const handleAnalyze = async () => {
    if (!quickText.trim()) {
      setError('Please type your study log first.');
      triggerShake();
      return;
    }
    setError('');
    setAnalyzing(true);
    setParsedPreview(null);

    try {
      const data = await api.analyzeStudyLog(quickText);
      setParsedPreview(data.parsed);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please enter details manually.');
      setActiveMode('detailed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper to trigger shake animation
  const triggerShake = () => {
    setAnimateShake(true);
    setTimeout(() => setAnimateShake(false), 500);
  };

  // Local point estimator for responsive UI updates
  const getEstimatedPoints = (parsed: any) => {
    if (!parsed) return 0;
    if (parsed.verification === 'flagged') return 0;
    
    let total = 0;
    // 1. Duration (1 point per 1.5 minutes, max 60)
    total += Math.min(60, Math.round((parsed.duration || 30) / 1.5));
    
    // 2. Problems solved
    if (parsed.problemsSolved > 0) {
      let multiplier = 10;
      if (parsed.difficulty === 'medium') multiplier = 15;
      if (parsed.difficulty === 'hard') multiplier = 20;
      total += Math.min(100, parsed.problemsSolved * multiplier);
    }

    // 3. Revision
    if (parsed.isRevision) {
      total += 20;
    }

    // 4. Streak / Consistency
    total += 15; // baseline consistency bonus

    // 5. Verification multiplier
    if (parsed.verification === 'suspicious') {
      total = Math.round(total * 0.2); // 80% reduction
    }

    return total;
  };

  // Submission handler for both modes
  const handleFinalSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalContent = '';
      let finalParsed = null;

      if (activeMode === 'quick') {
        finalContent = quickText;
        finalParsed = parsedPreview;
      } else {
        // Detailed mode constructs content and parsed structure
        finalContent = `Studied ${subject}: ${topic || 'General'}. Platform: ${platform}. Duration: ${duration}m. Resource: ${resource || 'None'}. solved: ${problemsSolved} (${difficulty}). notes: ${notes}`;
        finalParsed = {
          subject,
          topic: topic || 'General',
          platform,
          resource: resource || 'Self directed',
          duration: Number(duration) || 30,
          problemsSolved: Number(problemsSolved) || 0,
          difficulty,
          tags: [subject.toLowerCase(), platform.toLowerCase()],
          urls: links ? links.split(',').map(l => l.trim()) : [],
          isRevision: notes.toLowerCase().includes('revise') || notes.toLowerCase().includes('revision') || activityType === 'Theoretical Revision',
          verification: 'verified', // Detailed forms default to verified unless abused
          reason: 'Manually logged'
        };
      }

      const result = await api.logStudy(finalContent, finalParsed);
      setSuccessResult({
        event: result.event,
        profile: result.profile,
        insights: result.insights || []
      });

      // Animate score count-up
      const targetScore = result.event.points || 0;
      let cur = 0;
      const interval = setInterval(() => {
        cur += Math.ceil(targetScore / 12);
        if (cur >= targetScore) {
          setAnimatedScore(targetScore);
          clearInterval(interval);
        } else {
          setAnimatedScore(cur);
        }
      }, 40);

    } catch (err: any) {
      setError(err.message || 'Failed to submit log entry.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // Trigger return to feed/dashboard
  const handleSuccessClose = () => {
    if (successResult) {
      onLogCompleted(successResult.profile);
      setActiveTab('home');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-32 font-sans select-none z-10 relative">
      <AnimatePresence mode="wait">
        {!successResult ? (
          <motion.div
            key="logging-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header section */}
            <div className="text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 flex items-center justify-center gap-1.5 mb-2">
                <Edit3 className="w-3.5 h-3.5" />
                The PACE Ledger
              </span>
              <h1 className="text-3xl font-display font-semibold text-slate-100 tracking-tight">
                Log Your Learning Session
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                All logs are analyzed server-side and automatically converted into validated learning events and PACE points.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Mode selector tab rail */}
            <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('quick');
                  setParsedPreview(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMode === 'quick' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Quick Natural Log
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('detailed');
                  setParsedPreview(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMode === 'detailed' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Detailed Dialog
              </button>
            </div>

            {/* Main Interactive card */}
            <motion.div
              layout
              variants={{
                shake: {
                  x: [0, -6, 6, -6, 6, 0],
                  transition: { duration: 0.4, ease: "easeInOut" }
                }
              }}
              animate={animateShake ? "shake" : undefined}
              className="bg-slate-950/40 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[32px] shadow-2xl relative overflow-hidden"
            >
              {/* Backglow decor */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 blur-[80px] rounded-full pointer-events-none" />

              <AnimatePresence mode="wait">
                {activeMode === 'quick' ? (
                  <motion.div
                    key="quick-mode"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    {!parsedPreview ? (
                      <div className="space-y-6">
                        <div className="relative group">
                          <textarea
                            rows={4}
                            value={quickText}
                            onChange={(e) => setQuickText(e.target.value)}
                            placeholder="Type naturally (e.g. Solved 3 LeetCode Binary Search questions and revised DBMS Normalization for 1.5 hrs...)"
                            className="w-full bg-transparent border-b border-white/10 text-xl font-light text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all font-sans resize-none leading-relaxed pb-6 pt-2"
                            disabled={analyzing}
                          />
                          <div className="absolute bottom-3 right-0 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Paco AI will analyze your study metrics
                          </div>
                        </div>

                        {/* Suggestion bank */}
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Suggestions Box
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {suggestions.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setQuickText(s)}
                                className="text-left text-xs bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 p-3 rounded-2xl transition-all cursor-pointer font-medium"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Trigger button */}
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                          <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
                            Paco's analysis parses platforms, subjects, duration, and difficulties directly.
                          </p>
                          <button
                            type="button"
                            onClick={handleAnalyze}
                            disabled={analyzing || !quickText.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
                          >
                            {analyzing ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Analyzing Log...</span>
                              </>
                            ) : (
                              <>
                                <span>Analyze Session</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* PARSED PREVIEW EDIT DIALOG */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6 text-left"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-sm font-bold text-slate-200">AI Study Verification Preview</h3>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setParsedPreview(null)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Re-type Text
                          </button>
                        </div>

                        {/* Audit Verification status alert */}
                        {parsedPreview.verification !== 'verified' ? (
                          <div className={`p-4 rounded-2xl border flex gap-3 ${
                            parsedPreview.verification === 'flagged' 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          }`}>
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div className="text-xs space-y-1">
                              <span className="font-bold uppercase tracking-wider block">
                                {parsedPreview.verification === 'flagged' ? 'Flagged Activity Audit' : 'Suspicious Logging Pattern'}
                              </span>
                              <p className="leading-relaxed">{parsedPreview.reason || 'This activity is under security review.'}</p>
                              <span className="text-[10px] opacity-80 block font-semibold">
                                {parsedPreview.verification === 'flagged' ? 'Awarded Points: 0 PACE (Denied)' : 'Awarded Points reduced by 80%'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-300 text-xs flex items-center gap-2.5">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span className="font-semibold">Log validation secure. PACE scoring calculated successfully.</span>
                          </div>
                        )}

                        {/* Interactive Edit fields of parsing result */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Subject Field</label>
                            <select
                              value={parsedPreview.subject}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, subject: e.target.value })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                              {['DSA', 'DBMS', 'Operating Systems', 'Web Development', 'System Design', 'Software Engineering', 'Mathematics', 'General Study'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Subtopic</label>
                            <input
                              type="text"
                              value={parsedPreview.topic}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, topic: e.target.value })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Platform / Provider</label>
                            <input
                              type="text"
                              value={parsedPreview.platform}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, platform: e.target.value })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Learning Resource</label>
                            <input
                              type="text"
                              value={parsedPreview.resource}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, resource: e.target.value })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Duration (Minutes)</label>
                            <input
                              type="number"
                              value={parsedPreview.duration}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, duration: Math.max(1, Number(e.target.value)) })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Problems Solved</label>
                            <input
                              type="number"
                              value={parsedPreview.problemsSolved}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, problemsSolved: Math.max(0, Number(e.target.value)) })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Question Difficulty</label>
                            <select
                              value={parsedPreview.difficulty}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, difficulty: e.target.value })}
                              className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="unspecified">Unspecified</option>
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 pt-6">
                            <input
                              id="isRevision"
                              type="checkbox"
                              checked={parsedPreview.isRevision}
                              onChange={(e) => setParsedPreview({ ...parsedPreview, isRevision: e.target.checked })}
                              className="rounded border-white/5 text-indigo-600 focus:ring-0 bg-slate-900 w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor="isRevision" className="text-xs text-slate-300 font-medium cursor-pointer">
                              This was a revision session (+20 pts)
                            </label>
                          </div>
                        </div>

                        {/* Interactive dynamic estimator breakdown box */}
                        <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">Estimated PACE Points</span>
                            <div className="flex items-center gap-1.5">
                              <Award className="w-5 h-5 text-indigo-400" />
                              <span className="text-lg font-bold text-slate-100">+{getEstimatedPoints(parsedPreview)} Points</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium leading-normal max-w-[200px] text-right">
                            Server-side deterministic validation secures the score calculation on submission.
                          </span>
                        </div>

                        {/* Confirm Submit block */}
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setParsedPreview(null)}
                            className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                          >
                            Back to edit text
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFinalSubmit()}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/15"
                          >
                            {loading ? (
                              <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>Save Verified Log</span>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  /* DETAILED DIALOG MODE */
                  <motion.form
                    key="detailed-mode"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onSubmit={handleFinalSubmit}
                    className="space-y-6 text-left"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Activity Type</label>
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {['Coding Practice', 'Theoretical Revision', 'Lecture / Video Course', 'Book Reading'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Subject Area</label>
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {['DSA', 'DBMS', 'Operating Systems', 'Web Development', 'System Design', 'Software Engineering', 'Mathematics', 'General Study'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Specific Topic</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Binary Search Trees"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Platform / Provider</label>
                        <input
                          type="text"
                          placeholder="e.g. LeetCode, Striver, YouTube"
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Study Duration (Minutes)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={duration}
                          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Problems Solved</label>
                        <input
                          type="number"
                          min={0}
                          value={problemsSolved}
                          onChange={(e) => setProblemsSolved(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Difficulty Match</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as any)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="unspecified">Unspecified</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Resource / Material Used</label>
                        <input
                          type="text"
                          placeholder="e.g. Striver DSA Sheet PDF"
                          value={resource}
                          onChange={(e) => setResource(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Activity Details / Notes</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Write down what you did, equations, theories learned, or keys solved..."
                        className="w-full bg-slate-900 border border-white/5 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Attach Links (Comma Separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. https://leetcode.com/submissions/detail/1234/"
                          value={links}
                          onChange={(e) => setLinks(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-400" /> Upload Screenshot (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setScreenshotName(file.name);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="w-full bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-between">
                            <span className="truncate max-w-[200px]">{screenshotName || 'Select image...'}</span>
                            {screenshotName && (
                              <button 
                                type="button" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setScreenshotName(null);
                                }}
                                className="text-slate-500 hover:text-slate-300 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Estimator for Detailed Entry */}
                    <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">Estimated PACE Points</span>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-5 h-5 text-indigo-400" />
                          <span className="text-lg font-bold text-slate-100">
                            +{getEstimatedPoints({
                              duration,
                              problemsSolved,
                              difficulty,
                              isRevision: notes.toLowerCase().includes('revise') || notes.toLowerCase().includes('revision') || activityType === 'Theoretical Revision',
                              subject,
                              platform,
                              verification: 'verified'
                            })} Points
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium leading-normal max-w-[200px] text-right">
                        Structured inputs get calculated deterministically on the secure backend.
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs px-8 py-3.5 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
                      >
                        {loading ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Submit Detailed Session</span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : (
          /* MAJESTIC GAMIFIED SUCCESS BOARD */
          <motion.div
            key="success-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-950/50 backdrop-blur-2xl border border-white/10 p-8 rounded-[36px] shadow-2xl relative overflow-hidden text-center max-w-xl mx-auto space-y-6"
          >
            {/* Ambient gold/emerald sparks glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative flex flex-col items-center">
              <PacoMascot mode="celebration" className="mb-4" />
              <div className="h-6 w-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center justify-center mb-2">
                VERIFIED
              </div>
              <h2 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                Session Successfully Recorded!
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Your study has been secured and audited in the ledger.
              </p>
            </div>

            {/* Score Wheel counter */}
            <div className="py-6 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-36 h-36 rounded-full border-4 border-dashed border-emerald-500/20 flex flex-col items-center justify-center bg-emerald-500/[0.02] shadow-2xl shadow-emerald-500/5 relative"
              >
                <Trophy className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                  +{animatedScore}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  PACE Points
                </span>
              </motion.div>
            </div>

            {/* Points Breakdown */}
            {successResult.event.analysis?.pointsBreakdown && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-left space-y-2.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block pb-1 border-b border-white/5">
                  Points Allocation Breakdown
                </span>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {successResult.event.analysis.pointsBreakdown.map((b: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">{b.label}</span>
                      <span className="text-emerald-400 font-mono font-bold">+{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Custom Actionable Insights Section */}
            {successResult.insights && successResult.insights.length > 0 && (
              <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-4 text-left space-y-2.5">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold block flex items-center gap-1 pb-1 border-b border-indigo-500/5">
                  <Sparkles className="w-3.5 h-3.5" /> Actionable Insights (Paco Engine)
                </span>
                <ul className="space-y-2">
                  {successResult.insights.map((insight: string, i: number) => (
                    <li key={i} className="text-xs text-indigo-200/95 leading-relaxed flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Return / Action button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSuccessClose}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-3.5 rounded-2xl transition-colors cursor-pointer shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-1.5"
              >
                <span>Back to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
