/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { UserProfile, FriendRequest, Friend } from '../types';
import { Search, Users, UserPlus, UserCheck, Clock, Check, X, UserMinus } from 'lucide-react';
import StudentProfileModal from './StudentProfileModal';

interface PeopleViewProps {
  currentUser: UserProfile;
}

export default function PeopleView({ currentUser }: PeopleViewProps) {
  const [subTab, setSubTab] = useState<'find' | 'incoming' | 'friends'>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ profile: UserProfile; friendStatus: 'none' | 'friend' | 'outgoing_pending' | 'incoming_pending' }>>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds ID of profile undergoing action
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [confirmDisconnectId, setConfirmDisconnectId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Load friends and requests on mount / tab change
  const loadPeopleData = async () => {
    try {
      setLoading(true);
      const [reqs, friends] = await Promise.all([
        api.getFriendRequests(),
        api.getFriends(),
      ]);
      setPendingRequests(reqs);
      setFriendsList(friends);
    } catch (err) {
      console.error('Error loading people data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeopleData();
  }, [subTab]);

  // Execute search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.searchProfiles(searchQuery);
      setSearchResults(res);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on typing (with fallback on enter)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Actions
  const sendRequest = async (profileId: string) => {
    setActionLoading(profileId);
    try {
      await api.sendFriendRequest(profileId);
      // Update result state locally
      setSearchResults(prev =>
        prev.map(item =>
          item.profile.id === profileId
            ? { ...item, friendStatus: 'outgoing_pending' }
            : item
        )
      );
      setFeedbackMsg('Friend request sent!');
      setTimeout(() => setFeedbackMsg(''), 2500);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Could not send friend request.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const respondRequest = async (requestId: string, action: 'accept' | 'decline') => {
    setActionLoading(requestId);
    try {
      await api.respondFriendRequest(requestId, action);
      // Remove from state
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setFeedbackMsg(action === 'accept' ? 'Connection approved!' : 'Invite declined');
      setTimeout(() => setFeedbackMsg(''), 2500);
      loadPeopleData();
    } catch (err) {
      console.error('Failed responding to request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const executeRemoveFriend = async (friendId: string) => {
    setActionLoading(friendId);
    try {
      await api.removeFriend(friendId);
      setFriendsList(prev => prev.filter(f => f.friendId !== friendId));
      setFeedbackMsg('Disconnected successfully');
      setTimeout(() => setFeedbackMsg(''), 2500);
    } catch (err) {
      console.error('Failed removing friend:', err);
    } finally {
      setActionLoading(null);
      setConfirmDisconnectId(null);
    }
  };

  // SaaS stagger animation variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const saasCardVariant = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 16,
      },
    },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-32 font-sans select-none z-10 relative">
      {/* Sleek Custom Confirm Modal */}
      <AnimatePresence>
        {confirmDisconnectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDisconnectId(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, y: 10, filter: 'blur(4px)' }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-[28px] max-w-sm w-full relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-display font-semibold text-slate-100 mb-2">Remove Connection?</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to remove this connection? You won't see their logs on your feed anymore.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDisconnectId(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeRemoveFriend(confirmDisconnectId)}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-full shadow-[0_4px_12px_rgba(244,63,94,0.3)] transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-1.5 mb-2">
          <Users className="w-4 h-4" />
          The Student Registry
        </span>
        <h1 className="text-3xl font-display font-semibold text-slate-100 tracking-tight">
          Community & Connections
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          Search for other students, manage requests, and build your learning network.
        </p>
      </div>

      {/* Floating feedback message */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-indigo-500/90 backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-xl shadow-indigo-500/20 border border-white/20"
          >
            {feedbackMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connections View Navigation Sub-Tabs */}
      <div className="flex border-b border-white/10 pb-4 mb-6 gap-6">
        <button
          onClick={() => setSubTab('find')}
          className={`font-sans font-bold text-xs uppercase tracking-[0.15em] relative pb-2 cursor-pointer transition-colors ${
            subTab === 'find' ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Find People
          {subTab === 'find' && (
            <motion.div layoutId="subTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />
          )}
        </button>

        <button
          onClick={() => setSubTab('incoming')}
          className={`font-sans font-bold text-xs uppercase tracking-[0.15em] relative pb-2 cursor-pointer transition-colors flex items-center gap-2 ${
            subTab === 'incoming' ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span className="bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-indigo-500/20 border border-white/10">
              {pendingRequests.length}
            </span>
          )}
          {subTab === 'incoming' && (
            <motion.div layoutId="subTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />
          )}
        </button>

        <button
          onClick={() => setSubTab('friends')}
          className={`font-sans font-bold text-xs uppercase tracking-[0.15em] relative pb-2 cursor-pointer transition-colors ${
            subTab === 'friends' ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          My Friends ({friendsList.length})
          {subTab === 'friends' && (
            <motion.div layoutId="subTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[300px]">
        {subTab === 'find' && (
          <div className="space-y-4">
            {/* Search Input bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username, display name, university..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-12 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400/60 focus:bg-white/[0.07] transition-all font-sans"
              />
              <div className="absolute inset-0 border border-indigo-500/0 rounded-2xl pointer-events-none group-focus-within:border-indigo-500/20 transition-all" />
            </div>

            {/* Results */}
            {loading && searchResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium animate-pulse">Searching directory...</div>
            ) : searchQuery && searchResults.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center text-sm text-slate-500 shadow-2xl"
              >
                No students found with "{searchQuery}".
              </motion.div>
            ) : !searchQuery ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center shadow-2xl"
              >
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                <h4 className="text-sm font-semibold text-gray-300">Discover Students</h4>
                <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed font-medium">
                  Start typing in the input above to search. You can search by university, branch, or display name to connect with peers.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {searchResults.map(({ profile, friendStatus }) => (
                  <motion.div
                    key={profile.id}
                    variants={saasCardVariant}
                    whileHover={{ x: 6, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    onClick={() => setSelectedUserId(profile.id)}
                    className="group p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border-2 border-white/10 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-indigo-500/20">
                        {profile.avatar || '🎓'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors truncate">{profile.displayName}</div>
                        <div className="text-xs text-slate-500 truncate">@{profile.username}</div>
                        {profile.university && (
                          <div className="text-[10px] text-indigo-400/90 font-bold uppercase tracking-wider truncate mt-1">
                            {profile.university} {profile.branch ? `• ${profile.branch}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {friendStatus === 'none' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => sendRequest(profile.id)}
                          disabled={actionLoading === profile.id}
                          className="px-5 py-2.5 bg-white text-slate-950 font-bold rounded-full shadow-[0_0_15px_rgba(255,255,255,0.25)] transition-all text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </motion.button>
                      )}

                      {friendStatus === 'outgoing_pending' && (
                        <div className="px-4 py-2 bg-white/5 border border-white/5 text-slate-500 text-xs font-bold rounded-full flex items-center gap-1.5 select-none uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </div>
                      )}

                      {friendStatus === 'incoming_pending' && (
                        <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full flex items-center gap-1.5 select-none uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Needs response</span>
                        </div>
                      )}

                      {friendStatus === 'friend' && (
                        <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5 select-none uppercase tracking-wider">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {subTab === 'incoming' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium animate-pulse">Checking pending requests...</div>
            ) : pendingRequests.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center shadow-2xl"
              >
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                <h4 className="text-sm font-semibold text-slate-300">No pending requests</h4>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Incoming friend invites will appear here for you to respond.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {pendingRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    variants={saasCardVariant}
                    whileHover={{ x: 6, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 flex items-center justify-between gap-4 shadow-xl"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border-2 border-white/10 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-indigo-500/20">
                        {req.senderAvatar || '🎓'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-100 truncate">{req.senderDisplayName}</div>
                        <div className="text-xs text-slate-500 truncate">@{req.senderUsername}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => respondRequest(req.id, 'accept')}
                        disabled={actionLoading === req.id}
                        className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        title="Accept Request"
                      >
                        <Check className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => respondRequest(req.id, 'decline')}
                        disabled={actionLoading === req.id}
                        className="p-2.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        title="Decline Request"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {subTab === 'friends' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium animate-pulse">Retrieving friends list...</div>
            ) : friendsList.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center shadow-2xl"
              >
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                <h4 className="text-sm font-semibold text-slate-300">Build your network</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed font-medium">
                  Your connected friends will appear here. Go to the "Find People" tab to connect with other students!
                </p>
              </motion.div>
            ) : (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {friendsList.map((friend) => (
                  <motion.div
                    key={friend.friendId}
                    variants={saasCardVariant}
                    whileHover={{ y: -3, scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    onClick={() => setSelectedUserId(friend.friendId)}
                    className="p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border-2 border-white/10 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-indigo-500/20">
                        {friend.friendAvatar || '🎓'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-100 truncate">{friend.friendDisplayName}</div>
                        <div className="text-[10px] text-slate-500 truncate">@{friend.friendUsername}</div>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(244,63,94,0.15)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setConfirmDisconnectId(friend.friendId)}
                        disabled={actionLoading === friend.friendId}
                        className="p-2 bg-white/5 border border-white/5 text-slate-500 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                        title="Disconnect"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedUserId && (
          <StudentProfileModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
