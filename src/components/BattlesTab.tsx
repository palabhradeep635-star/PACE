import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Battle, UserProfile } from '../types';
import { Swords, Plus, Loader2, Play, Check, X, ShieldAlert, Award, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BattlesTab() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [opponents, setOpponents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Challenge form states
  const [opponentId, setOpponentId] = useState('');
  const [title, setTitle] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBattles = async () => {
    try {
      setLoading(true);
      const [battlesList, friendsList] = await Promise.all([
        api.getBattles(),
        api.getFriends(),
      ]);
      setBattles(battlesList);
      setOpponents(friendsList.map(f => ({
        id: f.friendId,
        username: f.friendUsername,
        displayName: f.friendDisplayName,
        avatar: f.friendAvatar,
        bio: '',
        university: '',
        branch: '',
        year: '',
        streak: 0,
        totalLogs: 0,
      } as UserProfile)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBattles();
  }, []);

  const handleChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId || !title.trim()) return;

    try {
      setSubmitting(true);
      await api.createBattle(opponentId, title, durationDays);
      setTitle('');
      setOpponentId('');
      setShowChallengeForm(false);
      await loadBattles();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (id: string, action: 'accept' | 'decline') => {
    try {
      setLoading(true);
      await api.respondBattle(id, action);
      await loadBattles();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group battles by status
  const incoming = battles.filter(b => b.status === 'pending' && b.opponentName === undefined); // wait, let's see which is incoming vs outgoing.
  // Actually, we can check ownerId vs current user profile to determine incoming/outgoing.
  // In our schema, ownerId is the sender, opponentId is the receiver.
  // Let's check how to determine incoming/outgoing using my ID or usernames.
  const myProfile = opponents.length > 0 ? null : null; // wait, let's just inspect name or username matches, or simply:
  // if current user is the opponent, it's incoming. If they are the owner, it's outgoing.
  // In `getBattles()`, the server returns opponentName, ownerName, etc.
  // Let's split them carefully based on roles:
  // Since we don't have user.id immediately, let's look at ownerName/opponentName or compare with localStorage or auth state.
  // Alternatively, the endpoint itself returns the battles. We can parse:
  // Let's determine who sent the challenge by checking if ownerName is the user, but we have user displayName.
  // A safer way is to check the Battle object properties, or simply render all of them with proper action buttons!
  // If status is 'pending', we show:
  // - "Respond" (Accept/Decline) buttons if the current user is the opponent.
  // - "Awaiting confirmation" if current user is the owner.
  // How do we know if we are owner vs opponent? The backend sets:
  // b.opponentId == loggedInUser => incoming
  // b.ownerId == loggedInUser => outgoing
  // Let's get the current user profile from localStorage or api.me on mount to compare!
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    api.me().then(usr => setCurrentUser(usr)).catch(() => {});
  }, []);

  const isOpponent = (b: Battle) => {
    if (!currentUser) return false;
    return b.opponentId === currentUser.id;
  };

  const pendingIncoming = battles.filter(b => b.status === 'pending' && isOpponent(b));
  const pendingOutgoing = battles.filter(b => b.status === 'pending' && !isOpponent(b));
  const activeBattles = battles.filter(b => b.status === 'active');
  const finishedBattles = battles.filter(b => b.status === 'completed' || b.status === 'declined');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action block */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Swords className="w-4.5 h-4.5 text-indigo-400" />
          Study Sprints & Battles
        </h3>

        {opponents.length > 0 && (
          <button
            onClick={() => setShowChallengeForm(!showChallengeForm)}
            className="px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showChallengeForm ? 'Cancel Challenge' : 'Issue Duel'}</span>
          </button>
        )}
      </div>

      {showChallengeForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 overflow-hidden shadow-xl"
        >
          <form onSubmit={handleChallenge} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Opponent (Study Friend)</label>
                <select
                  required
                  value={opponentId}
                  onChange={(e) => setOpponentId(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-400 font-sans"
                >
                  <option value="">Choose Classmate...</option>
                  {opponents.map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.displayName} (@{opp.username})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Battle Objective / Sprint Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Solve 30 Leetcode problems in 7 days"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sprint Duration</span>
                <div className="flex gap-2">
                  {[3, 5, 7, 14].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDurationDays(days)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border font-mono transition-all cursor-pointer ${
                        durationDays === days
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
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
                  <Swords className="w-3.5 h-3.5" />
                )}
                <span>Send Duel Invite</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* INCOMING CHALLENGES CARD */}
      {pendingIncoming.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Incoming Challenges</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingIncoming.map(b => (
              <div
                key={b.id}
                className="bg-indigo-500/[0.03] border border-indigo-500/10 p-4 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[9px] font-mono font-extrabold text-indigo-400 mb-2 uppercase tracking-wider">
                    <span>Duel Invitation</span>
                    <span>PENDING</span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-200">{b.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-1">Challenged by <span className="font-semibold text-slate-300">@{b.ownerName || 'Classmate'}</span></p>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-indigo-500/5">
                  <button
                    onClick={() => handleRespond(b.id, 'decline')}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Decline</span>
                  </button>
                  <button
                    onClick={() => handleRespond(b.id, 'accept')}
                    className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-slate-950 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Accept Duel</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE BATTLES */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Study Duels</h4>
        
        {activeBattles.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-12 rounded-[28px] text-center flex flex-col items-center">
            <Swords className="w-8 h-8 text-slate-600 mb-2" />
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">No ongoing Battles</h4>
            <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
              Connect with classmates, add them as friends, and challenge them to a high-intensity study duel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBattles.map(b => {
              const myScore = isOpponent(b) ? b.opponentScore : b.ownerScore;
              const oppScore = isOpponent(b) ? b.ownerScore : b.opponentScore;
              const oppName = isOpponent(b) ? b.ownerName : b.opponentName;
              
              const totalPoints = myScore + oppScore;
              const percentage = totalPoints === 0 ? 50 : (myScore / totalPoints) * 100;

              return (
                <div
                  key={b.id}
                  className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-3xl transition-all shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 mb-2 uppercase tracking-wider">
                      <span className="text-indigo-400 flex items-center gap-1"><Play className="w-3 h-3 text-indigo-400" /> Active Duel</span>
                      <span>Ends {new Date(b.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>

                    <h5 className="text-xs font-semibold text-slate-200 tracking-tight leading-snug">{b.title}</h5>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">VS @{oppName || 'Classmate'}</p>
                  </div>

                  {/* Dual progress bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider font-mono">
                      <span className="text-indigo-300">You ({myScore} pts)</span>
                      <span className="text-slate-400">@{oppName} ({oppScore} pts)</span>
                    </div>

                    <div className="h-2 w-full bg-white/5 border border-white/5 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500 rounded-l-full"
                      />
                      <div
                        style={{ width: `${100 - percentage}%` }}
                        className="h-full bg-slate-800 transition-all duration-500 rounded-r-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OUTGOING SENT INVITATIONS */}
      {pendingOutgoing.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sent Battle Invites</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pendingOutgoing.map(b => (
              <div
                key={b.id}
                className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-xs"
              >
                <div className="text-[9px] font-mono font-bold text-slate-500 uppercase mb-2">Awaiting confirmation</div>
                <h5 className="font-semibold text-slate-300 truncate">{b.title}</h5>
                <p className="text-[10px] text-slate-500 mt-1">To @{b.opponentName || 'Classmate'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
