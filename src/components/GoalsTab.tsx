import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Goal } from '../types';
import { Target, Plus, Trash2, Check, Loader2, Award, Calendar, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation form states
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(10);
  const [deadlineDays, setDeadlineDays] = useState<number | null>(7);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || target <= 0) return;

    try {
      setSubmitting(true);
      await api.createGoal(title, target, deadlineDays);
      setTitle('');
      setTarget(10);
      setDeadlineDays(7);
      setShowGoalForm(false);
      await loadGoals();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncrement = async (id: string, currentVal: number, targetVal: number) => {
    try {
      // Optimistic update
      setGoals(prev => prev.map(g => {
        if (g.id === id) {
          const nextProgress = Math.min(targetVal, currentVal + 1);
          return { ...g, progress: nextProgress, completed: nextProgress === targetVal };
        }
        return g;
      }));

      await api.incrementGoalProgress(id, 1);
      // Wait a moment and sync state to be safe
      setTimeout(loadGoals, 1000);
    } catch (err) {
      console.error(err);
      loadGoals();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div className="space-y-6">
      {/* Action triggers */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Target className="w-4.5 h-4.5 text-indigo-400" />
          Active Study Goals
        </h3>

        <button
          onClick={() => setShowGoalForm(!showGoalForm)}
          className="px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showGoalForm ? 'Cancel' : 'Set Goal'}</span>
        </button>
      </div>

      {showGoalForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 overflow-hidden shadow-xl"
        >
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Goal Target Objective</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete 20 video lectures or solve 15 problems"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Target Value (Number of tasks)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(parseInt(e.target.value))}
                  placeholder="10"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-sans">Deadline Period</span>
                <div className="flex gap-2">
                  {[3, 7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDeadlineDays(days)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border font-mono transition-all cursor-pointer ${
                        deadlineDays === days
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDeadlineDays(null)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border font-mono transition-all cursor-pointer ${
                      deadlineDays === null
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    No Limit
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Establish Goal</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ACTIVE GOALS GRID */}
      {activeGoals.length === 0 ? (
        <div className="bg-white/5 border border-white/10 p-12 rounded-[28px] text-center flex flex-col items-center">
          <Target className="w-8 h-8 text-slate-600 mb-2" />
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">No Active Targets</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
            Create learning milestones (e.g. video completion counts) to pace your course schedule effectively.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeGoals.map(g => {
            const percentage = Math.min(100, (g.progress / g.target) * 100);
            return (
              <div
                key={g.id}
                className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-3xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Study Target
                    </span>

                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 transition-all cursor-pointer"
                      title="Remove Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-semibold tracking-tight text-slate-200">
                    {g.title}
                  </h4>

                  {g.deadline && (
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-2.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Deadline: {new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold font-mono mb-2">
                    <span>PROGRESS: {g.progress} / {g.target}</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden relative">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300"
                      />
                    </div>

                    <button
                      onClick={() => handleIncrement(g.id, g.progress, g.target)}
                      className="p-2 bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                      title="Log Progress (+1)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-0.5">+1</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPLETED GOALS HISTORY */}
      {completedGoals.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-white/5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Completed Achievements</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {completedGoals.map(g => (
              <div
                key={g.id}
                className="bg-emerald-500/[0.02] border border-emerald-500/10 p-4 rounded-2xl flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 uppercase mb-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </div>
                  <h5 className="font-semibold text-slate-300 truncate">{g.title}</h5>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
