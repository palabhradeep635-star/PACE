/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // URL or emoji or initial
  bio: string;
  university: string;
  branch: string;
  year: string;
  streak: number;
  totalLogs: number;
  lastActiveDate?: string; // YYYY-MM-DD
  isPrivate?: boolean;
  friendsCount?: number;
  points?: number;
  level?: number;
  weeklyScore?: number;
  weeklyPoints?: number;
  globalRank?: number;
  institutionRank?: number;
  globalTotal?: number;
  institutionTotal?: number;
  xp?: number; // Lifetime XP - Total verified work completed (never decreases)
  paceRating?: number; // PACE Rating - Current competitive strength / Elo (can go up or down)
  leaderboardScore?: number; // Leaderboard Score - Ranking score based on recent performance & rating
  longestStreak?: number;
  dailyScore?: number;
  monthlyScore?: number;
  yearlyScore?: number;
  totalStudyTime?: number;
  totalProblemsSolved?: number;
  totalProjects?: number;
  achievementProgress?: Record<string, any>;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Friend {
  userId: string;
  friendId: string;
  friendUsername: string;
  friendDisplayName: string;
  friendAvatar: string;
  createdAt: string;
}

export interface LearningEvent {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  content: string;
  createdAt: string; // ISO String
  points?: number;
  analysis?: any;
}

export interface DatabaseSchema {
  users: Record<string, { id: string; username: string; passwordHash: string; createdAt: string }>;
  profiles: Record<string, UserProfile>;
  friendRequests: FriendRequest[];
  friends: Record<string, string[]>; // userId -> list of friendUserIds
  learningEvents: LearningEvent[];
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: 'github' | 'leetcode' | 'codeforces' | 'codechef' | 'atcoder';
  username: string;
  status: string;
  lastSyncedAt: string;
  accessToken?: string;
  syncError?: string;
  stats?: any;
}

export interface Resource {
  id: string;
  userId: string;
  title: string;
  subject: string;
  type: 'playlist' | 'book' | 'course' | 'website' | 'roadmap';
  url: string;
  progress: number;
  completed: boolean;
  createdAt: string;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string;
  createdBy: string;
  points: number;
  createdAt: string;
  memberCount?: number;
}

export interface ClanMember {
  clanId: string;
  userId: string;
  role: 'leader' | 'member';
  joinedAt: string;
  username?: string;
  displayName?: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'friend_request' | 'friend_accepted' | 'clan_joined' | 'battle_invited' | 'level_up' | 'streak';
  read: boolean;
  createdAt: string;
}

export interface Battle {
  id: string;
  ownerId: string;
  opponentId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  ownerScore: number;
  opponentScore: number;
  winnerId: string | null;
  createdAt: string;
  ownerName?: string;
  opponentName?: string;
  ownerAvatar?: string;
  opponentAvatar?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  target: number;
  progress: number;
  deadline: string | null;
  completed: boolean;
  createdAt: string;
}

export interface ProfileSettings {
  userId: string;
  theme: string;
  timezone: string;
  connectedPlatforms: Record<string, boolean>;
  notificationPreferences: {
    friendRequests: boolean;
    clanUpdates: boolean;
    battleInvites: boolean;
    streakMilestones: boolean;
  };
  privacySettings?: {
    shareLeaderboard: boolean;
    showSubmissions: boolean;
  };
  appearanceSettings?: {
    accentColor: string;
    reducedMotion: boolean;
  };
  notificationsExtended?: {
    soundEnabled: boolean;
    emailDigest: boolean;
    streakAlerts: boolean;
    goalAlerts: boolean;
  };
  pacoSettings?: {
    disableAnimations: boolean;
    reduceMotion: boolean;
    hideMascot: boolean;
    completelyHidden: boolean;
  };
}
