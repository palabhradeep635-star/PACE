/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface EditProfileModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const avatarOptions = ['💻', '🚀', '📚', '🤖', '👾', '🎨', '⚡', '☕', '🧬', '🧠', '🎯', '🏆'];

export default function EditProfileModal({ user, isOpen, onClose, onSave }: EditProfileModalProps) {
  // Form states maintained completely inside the modal to isolate re-renders
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '💻');
  const [university, setUniversity] = useState(user.university || '');
  const [branch, setBranch] = useState(user.branch || '');
  const [year, setYear] = useState(user.year || '');
  const [isPrivate, setIsPrivate] = useState(user.isPrivate || false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setEditLoading(true);
    setError('');

    try {
      await onSave({
        displayName,
        bio,
        avatar,
        university,
        branch,
        year,
        isPrivate,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          {/* Subtle outer glowing blob */}
          <div className="absolute w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 15, filter: 'blur(10px)' }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="w-full max-w-lg bg-slate-950/90 border border-white/10 rounded-[32px] overflow-hidden relative shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
          >
            {/* Glossy top border highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Modify Profile</span>
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                id="edit-profile-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {error && (
                <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl font-medium text-center">
                  {error}
                </div>
              )}

              {/* Avatar selection option */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Choose Avatar Emoji</label>
                <div className="flex flex-wrap gap-2.5 p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  {avatarOptions.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl cursor-pointer transition-all ${
                        avatar === emoji
                          ? 'bg-gradient-to-tr from-indigo-500 to-violet-500 border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-110'
                          : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all font-sans"
                  placeholder="Abhradeep"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Short Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all font-sans resize-none"
                  placeholder="Tell us about your learning style or current goals..."
                />
              </div>

              {/* School */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">University</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all font-sans"
                  placeholder="IIT Delhi"
                />
              </div>

              {/* Branch / Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all font-sans"
                    placeholder="CSE"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Year</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all font-sans"
                    placeholder="3rd Year"
                  />
                </div>
              </div>

              {/* Profile Privacy */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="pr-4">
                  <label className="text-[11px] font-bold text-slate-200 block">Private Activity Heatmap</label>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-semibold leading-relaxed">
                    Hide your learning calendar and logs from other students.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 focus:ring-offset-2"
                />
              </div>

              {/* Submit / Save action buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-transparent hover:bg-white/5 border border-transparent rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 border border-white/10 shadow-[0_4px_20px_rgba(99,102,241,0.35)] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
