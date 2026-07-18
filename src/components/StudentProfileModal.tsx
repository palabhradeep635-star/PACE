/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile, LearningEvent } from '../types';
import { Flame, Calendar, School, Users, FileText, AlertCircle, Sparkles } from 'lucide-react';
import ActivityHeatmap from './ActivityHeatmap';
import AnimatedCounter from './AnimatedCounter';

interface StudentProfileModalProps {
  userId: string;
  onClose: () => void;
  currentUser: UserProfile;
}

export default function StudentProfileModal({ userId, onClose, currentUser }: StudentProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<LearningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    async function loadStudentData() {
      try {
        setLoading(true);
        setError('');
        const [profileData, logsData] = await Promise.all([
          api.getProfile(userId),
          api.getUserLogs(userId)
        ]);
        setProfile(profileData);
        setLogs(logsData);
      } catch (err: any) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student profile.');
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [userId]);

  const formatFullDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Some date';
    }
  };

  const isSelf = currentUser.id === userId;
  const isPrivate = profile?.isPrivate && !isSelf;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.96, y: 12, filter: 'blur(4px)' }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="bg-slate-900 border border-white/10 rounded-[36px] max-w-2xl w-full relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Top Header Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-slate-400 hover:text-slate-100 z-30 border border-white/5 transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative">
                <motion.div 
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
                <Sparkles className="w-5 h-5 text-indigo-400/60 animate-pulse" />
              </div>
              <span className="text-xs text-slate-500 font-bold tracking-widest uppercase animate-pulse">Retrieving Profile...</span>
            </div>
          ) : error || !profile ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">Retrieval Failed</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">{error || 'This user does not exist.'}</p>
              <button
                onClick={onClose}
                className="mt-6 px-5 py-2 bg-white/5 border border-white/10 text-slate-300 font-bold text-xs rounded-full transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-6">
              {/* Profile card header */}
              <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950/80 via-violet-950/80 to-slate-950 border border-white/10 p-6 flex flex-col md:flex-row items-center gap-5 overflow-hidden">
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="w-20 h-20 rounded-full bg-slate-900/90 border border-white/10 flex items-center justify-center text-4xl shadow-xl shrink-0">
                  {profile.avatar}
                </div>

                <div className="text-center md:text-left min-w-0">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h2 className="text-xl md:text-2xl font-display font-semibold text-slate-100 tracking-tight truncate">{profile.displayName}</h2>
                    {profile.university && (
                      <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded-full uppercase tracking-wider">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">@{profile.username}</p>
                  
                  {profile.university && (
                    <p className="text-[11px] text-slate-400 font-semibold flex items-center justify-center md:justify-start gap-1 mt-2.5">
                      <School className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{profile.university}</span>
                      {profile.branch && <span className="text-slate-600">•</span>}
                      {profile.branch && <span className="text-slate-500 truncate">{profile.branch} ({profile.year || 'Student'})</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="px-1">
                  <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2">About me</h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans font-medium">{profile.bio}</p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-1">
                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Flame className="w-4 h-4 text-orange-400 mb-1.5" />
                  <span className="text-base font-display font-bold text-slate-100">
                    <AnimatedCounter value={profile.streak} /> days
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Streak</span>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Calendar className="w-4 h-4 text-indigo-400 mb-1.5" />
                  <span className="text-base font-display font-bold text-slate-100">
                    <AnimatedCounter value={profile.totalLogs} />
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Total Logs</span>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Users className="w-4 h-4 text-violet-400 mb-1.5" />
                  <span className="text-base font-display font-bold text-slate-100">
                    <AnimatedCounter value={profile.friendsCount || 0} />
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Friends</span>
                </div>
              </div>

              {/* Heatmap Grid */}
              <ActivityHeatmap logs={logs} isPrivate={isPrivate} />

              {/* Logs Stream (Only if public) */}
              {!isPrivate && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <h3 className="font-display font-semibold text-xs text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      Activity Timeline
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold">{logs.length} entries</span>
                  </div>

                  {logs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-medium">No study sessions logged yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {logs.map((log) => (
                        <div key={log.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[8px] text-indigo-400 font-bold tracking-wider uppercase">STUDY BLOCK</span>
                            <span className="text-[8px] text-slate-500 font-semibold">{formatFullDate(log.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium font-sans break-words leading-relaxed">{log.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function XIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
