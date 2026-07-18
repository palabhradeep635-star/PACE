import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Resource } from '../types';
import { BookOpen, Laptop, GraduationCap, ExternalLink, Target, Plus, Trash2, Check, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ResourcesTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<'playlist' | 'book' | 'course' | 'website' | 'roadmap'>('playlist');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await api.getResources();
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;

    try {
      setSubmitting(true);
      await api.createResource(title, subject, type, url);
      setTitle('');
      setSubject('');
      setUrl('');
      await loadResources();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (res: Resource) => {
    try {
      const nextCompleted = !res.completed;
      const nextProgress = nextCompleted ? 100 : res.progress;
      await api.updateResource(res.id, nextProgress, nextCompleted);
      await loadResources();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProgressChange = async (res: Resource, value: number) => {
    try {
      const completed = value === 100;
      await api.updateResource(res.id, value, completed);
      // Optimistic update
      setResources(prev => prev.map(item => item.id === res.id ? { ...item, progress: value, completed } : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteResource(id);
      setResources(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'playlist': return <Play className="w-4 h-4 text-rose-400" />;
      case 'book': return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'course': return <GraduationCap className="w-4 h-4 text-indigo-400" />;
      case 'website': return <ExternalLink className="w-4 h-4 text-cyan-400" />;
      case 'roadmap': return <Target className="w-4 h-4 text-amber-400" />;
      default: return <BookOpen className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Creation form */}
      <div className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 shadow-xl">
        <h3 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" />
          Track New Study Resource
        </h3>

        <form onSubmit={handleAddResource} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Resource Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Algorithms"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Subject / Course Code</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. CSE 301"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Resource Type</label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-400 transition-all font-sans"
            >
              <option value="playlist">YouTube Playlist</option>
              <option value="book">Reference Book</option>
              <option value="course">Online Course</option>
              <option value="website">Study Website</option>
              <option value="roadmap">Developer Roadmap</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">URL / Reference Link (Optional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all font-sans"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2">
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
              <span>Add to Study ledger</span>
            </button>
          </div>
        </form>
      </div>

      {/* List section */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white/5 border border-white/15 p-12 rounded-[28px] text-center flex flex-col items-center">
            <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">No active study materials</h4>
            <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
              Log playlists, books, websites, or video courses you are working through to monitor your curriculum progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((res) => (
              <motion.div
                key={res.id}
                layout
                className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-3xl transition-all duration-200 flex flex-col justify-between h-auto shadow-md relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      {getIcon(res.type)}
                      {res.subject}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleComplete(res)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          res.completed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                        title={res.completed ? "Mark Incomplete" : "Mark Complete"}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className={`text-sm font-semibold tracking-tight ${res.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {res.title}
                  </h4>

                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-1 mt-2.5"
                    >
                      <span>Study Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold font-mono mb-2">
                    <span>Progress Tracker</span>
                    <span>{res.progress}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={res.progress}
                    onChange={(e) => handleProgressChange(res, parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
