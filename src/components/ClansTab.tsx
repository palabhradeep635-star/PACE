import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Clan, ClanMember } from '../types';
import { Users, Plus, Shield, LogOut, Loader2, Award, Swords, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClansTab() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [myClanData, setMyClanData] = useState<{ clan: Clan; members: ClanMember[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Creation form states
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadClanData = async () => {
    try {
      setLoading(true);
      const [allClans, me] = await Promise.all([
        api.getClans(),
        api.getMyClan(),
      ]);
      setClans(allClans);
      setMyClanData(me);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClanData();
  }, []);

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tag.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      await api.createClan(name, tag, description);
      setName('');
      setTag('');
      setDescription('');
      setShowCreateForm(false);
      await loadClanData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinClan = async (id: string) => {
    try {
      setLoading(true);
      await api.joinClan(id);
      await loadClanData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClan = async () => {
    try {
      setLoading(true);
      await api.leaveClan();
      await loadClanData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {myClanData ? (
          // RENDER USER'S CURRENT CLAN PROFILE
          <motion.div
            key="my-clan"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="bg-slate-950/40 border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-[60px]" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 font-black text-xs rounded-xl font-mono">
                      [{myClanData.clan.tag.toUpperCase()}]
                    </span>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">{myClanData.clan.name}</h2>
                  </div>
                  <p className="text-xs text-slate-400 font-medium max-w-xl mt-3 leading-relaxed">
                    {myClanData.clan.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-start md:self-center">
                  <div className="bg-white/5 border border-white/5 px-4.5 py-2.5 rounded-2xl text-center min-w-[90px]">
                    <div className="text-lg font-bold text-slate-100 font-display">{myClanData.clan.points}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">Total Points</div>
                  </div>
                  <button
                    onClick={handleLeaveClan}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Clan</span>
                  </button>
                </div>
              </div>

              {/* Clan members list */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <h3 className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Fellow Clan Members ({myClanData.members.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {myClanData.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 bg-white/[0.03] border border-white/5 p-3 rounded-2xl"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-lg border border-white/10">
                        {member.avatar || '🦉'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-200 truncate block">
                            {member.displayName || member.username}
                          </span>
                          {member.role === 'leader' && (
                            <Shield className="w-3 h-3 text-amber-400" title="Clan Founder" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block font-medium">@{member.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          // RENDER CLANS DIRECTORY & CREATION FORM
          <motion.div
            key="clans-directory"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Create form trigger */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-400" />
                Study Clans Directory
              </h3>

              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showCreateForm ? 'Cancel' : 'Found Clan'}</span>
              </button>
            </div>

            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950/40 border border-white/10 rounded-[28px] p-6 overflow-hidden"
              >
                <form onSubmit={handleCreateClan} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Clan Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Apex Code Sprints"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Unique TAG (3-4 Chars)</label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={tag}
                        onChange={(e) => setTag(e.target.value.toLowerCase().trim())}
                        placeholder="e.g. APEX"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Clan Description</label>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. A dedicated high-intensity study tribe for daily algorithm design, systems lecture pacing, and mock exam battles."
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 resize-none font-sans"
                    />
                  </div>

                  <div className="flex justify-end">
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
                      <span>Establish Clan</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* List Clans Grid */}
            {clans.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-12 rounded-[28px] text-center flex flex-col items-center">
                <Users className="w-8 h-8 text-slate-600 mb-2" />
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">No Active Clans Founded</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                  Be the very first study leader to establish a Clan tag, recruit friends, and dominate the points leaderboard.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clans.map((clan) => (
                  <div
                    key={clan.id}
                    className="bg-slate-950/40 border border-white/5 hover:border-white/10 p-5 rounded-3xl transition-all duration-200 flex flex-col justify-between h-auto shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold text-[10px] rounded-lg font-mono">
                          [{clan.tag.toUpperCase()}]
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200 tracking-tight">{clan.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium line-clamp-2">
                        {clan.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/5 text-[10px]">
                      <div className="flex items-center gap-3 font-mono font-bold text-slate-500">
                        <span>{clan.memberCount || 1} MEMS</span>
                        <span>•</span>
                        <span className="text-amber-400/90 inline-flex items-center gap-0.5">
                          <Award className="w-3.5 h-3.5" />
                          {clan.points} PTS
                        </span>
                      </div>

                      <button
                        onClick={() => handleJoinClan(clan.id)}
                        className="px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-bold uppercase rounded-lg transition-all cursor-pointer"
                      >
                        Join Tribe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
