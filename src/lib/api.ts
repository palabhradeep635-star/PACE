/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, FriendRequest, LearningEvent, Friend, ConnectedAccount, Resource, Clan, ClanMember, Notification, Battle, Goal, ProfileSettings } from '../types';

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('pace_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  setToken(token: string) {
    localStorage.setItem('pace_token', token);
  },

  getToken() {
    return localStorage.getItem('pace_token');
  },

  logout() {
    localStorage.removeItem('pace_token');
  },

  async signup(data: any) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Signup failed');
    }
    return res.json(); // { token, user }
  },

  async login(data: any) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json(); // { token, user }
  },

  async getGoogleAuthUrl() {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to initiate Google Sign-In');
    }
    return res.json(); // { url }
  },

  async me(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/profiles/me`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  },

  async searchProfiles(q: string): Promise<Array<{ profile: UserProfile; friendStatus: 'none' | 'friend' | 'outgoing_pending' | 'incoming_pending' }>> {
    const res = await fetch(`${API_BASE}/profiles/search?q=${encodeURIComponent(q)}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async sendFriendRequest(receiverId: string): Promise<FriendRequest> {
    const res = await fetch(`${API_BASE}/friends/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ receiverId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send friend request');
    }
    return res.json();
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const res = await fetch(`${API_BASE}/friends/requests`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async respondFriendRequest(requestId: string, action: 'accept' | 'decline'): Promise<{ success: boolean; status: string }> {
    const res = await fetch(`${API_BASE}/friends/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ requestId, action }),
    });
    if (!res.ok) throw new Error('Failed to respond to request');
    return res.json();
  },

  async getFriends(): Promise<Friend[]> {
    const res = await fetch(`${API_BASE}/friends/list`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch friends');
    return res.json();
  },

  async removeFriend(friendId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/friends/remove`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ friendId }),
    });
    if (!res.ok) throw new Error('Failed to remove friend');
    return res.json();
  },

  async logStudy(content: string, parsed?: any): Promise<{ event: LearningEvent; profile: UserProfile; insights?: string[] }> {
    const res = await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, parsed }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit study log');
    }
    return res.json();
  },

  async analyzeStudyLog(text: string): Promise<{ parsed: any; pointsBreakdown: any[]; totalPoints: number }> {
    const res = await fetch(`${API_BASE}/logs/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Log analysis failed');
    }
    return res.json();
  },

  async getMyLogs(): Promise<LearningEvent[]> {
    const res = await fetch(`${API_BASE}/logs/my`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  async getFeed(): Promise<LearningEvent[]> {
    const res = await fetch(`${API_BASE}/logs/feed`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch feed');
    return res.json();
  },

  async getProfile(userId: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/profiles/${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getUserLogs(userId: string): Promise<LearningEvent[]> {
    const res = await fetch(`${API_BASE}/profiles/${userId}/logs`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch user logs');
    return res.json();
  },

  async getUserHeatmap(userId: string): Promise<Array<{ date: string; count: number }>> {
    const res = await fetch(`${API_BASE}/profiles/${userId}/heatmap`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch heatmap data');
    return res.json();
  },

  // PACE v1 Connected Platforms
  async getConnectedAccounts(): Promise<ConnectedAccount[]> {
    const res = await fetch(`${API_BASE}/platforms/connected`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch connected accounts');
    return res.json();
  },

  async getGitHubAuthUrl(): Promise<string> {
    const res = await fetch(`${API_BASE}/auth/github/url`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch GitHub OAuth URL');
    }
    const data = await res.json();
    return data.url;
  },

  async connectAccount(platform: string, username: string): Promise<ConnectedAccount> {
    const res = await fetch(`${API_BASE}/platforms/connect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ platform, username }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to connect account');
    }
    return res.json();
  },

  async disconnectAccount(platform: string): Promise<void> {
    const res = await fetch(`${API_BASE}/platforms/disconnect/${platform}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to disconnect account');
  },

  async fetchPlatformStats(platform: string, username: string): Promise<any> {
    const res = await fetch(`${API_BASE}/platforms/stats/${platform}/${username}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch platform stats');
    }
    return res.json();
  },

  async syncAllPlatforms(): Promise<{
    success: boolean;
    syncedPlatforms: string[];
    totalNewEventsCreated: number;
    xpGained: number;
    pointsGained: number;
    updatedProfile: UserProfile;
    scoreBreakdown: any;
    achievements: any[];
  }> {
    const res = await fetch(`${API_BASE}/platforms/sync-all`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to sync platform accounts');
    }
    return res.json();
  },

  // PACE v1 Resources
  async getResources(): Promise<Resource[]> {
    const res = await fetch(`${API_BASE}/resources`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async createResource(title: string, subject: string, type: string, url?: string): Promise<Resource> {
    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, subject, type, url }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create resource');
    }
    return res.json();
  },

  async updateResource(id: string, progress: number, completed: boolean): Promise<Resource> {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ progress, completed }),
    });
    if (!res.ok) throw new Error('Failed to update resource');
    return res.json();
  },

  async deleteResource(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete resource');
  },

  // PACE v1 Clans
  async getClans(): Promise<Clan[]> {
    const res = await fetch(`${API_BASE}/clans`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch clans list');
    return res.json();
  },

  async createClan(name: string, tag: string, description: string): Promise<Clan> {
    const res = await fetch(`${API_BASE}/clans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, tag, description }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create clan');
    }
    return res.json();
  },

  async joinClan(clanId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/clans/join`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ clanId }),
    });
    if (!res.ok) throw new Error('Failed to join clan');
  },

  async getMyClan(): Promise<{ clan: Clan; members: ClanMember[] } | null> {
    const res = await fetch(`${API_BASE}/clans/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch your clan info');
    return res.json();
  },

  async leaveClan(): Promise<void> {
    const res = await fetch(`${API_BASE}/clans/leave`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to leave clan');
  },

  // PACE v1 Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
  },

  // PACE v1 Study Battles
  async getBattles(): Promise<Battle[]> {
    const res = await fetch(`${API_BASE}/battles`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch study battles');
    return res.json();
  },

  async createBattle(opponentId: string, title: string, durationDays: number): Promise<Battle> {
    const res = await fetch(`${API_BASE}/battles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ opponentId, title, durationDays }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to challenge friend to a battle');
    }
    return res.json();
  },

  async respondBattle(id: string, action: 'accept' | 'decline'): Promise<void> {
    const res = await fetch(`${API_BASE}/battles/${id}/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error('Failed to respond to battle challenge');
  },

  // PACE v1 Study Goals
  async getGoals(): Promise<Goal[]> {
    const res = await fetch(`${API_BASE}/goals`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch study goals');
    return res.json();
  },

  async createGoal(title: string, target: number, deadlineDays: number | null): Promise<Goal> {
    const res = await fetch(`${API_BASE}/goals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, target, deadlineDays }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create goal');
    }
    return res.json();
  },

  async incrementGoalProgress(id: string, amount: number): Promise<Goal> {
    const res = await fetch(`${API_BASE}/goals/${id}/progress`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error('Failed to update goal progress');
    return res.json();
  },

  async deleteGoal(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/goals/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete goal');
  },

  // PACE v1 Profile Settings
  async changePassword(newPassword: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update password');
    }
    return res.json();
  },

  async getActiveSessions(): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/sessions`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch active sessions');
    return res.json();
  },

  async syncPlatform(platform: string): Promise<any> {
    const res = await fetch(`${API_BASE}/integrations/sync/${platform}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Failed to sync ${platform}`);
    }
    return res.json();
  },

  async getSettings(): Promise<ProfileSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch custom settings');
    return res.json();
  },

  async updateSettings(updates: Partial<ProfileSettings>): Promise<ProfileSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  async getSystemStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/system/status`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve system status');
    return res.json();
  },

  async getProfileAnalysisReports(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/profile/analysis`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve analysis reports');
    return res.json();
  },

  async triggerProfileAnalysis(): Promise<any> {
    const res = await fetch(`${API_BASE}/profile/analyze`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate profile analysis');
    return res.json();
  },

  async getScoringBreakdown(): Promise<any> {
    const res = await fetch(`${API_BASE}/scoring/breakdown`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve scoring breakdown');
    return res.json();
  },

  async getLeaderboards(type = 'global'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/scoring/leaderboards?type=${type}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve leaderboards');
    return res.json();
  },

  async getClanRankings(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/clans/rankings`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve clan rankings');
    return res.json();
  },

  async getClanWars(): Promise<any> {
    const res = await fetch(`${API_BASE}/clans/wars`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve clan wars status');
    return res.json();
  },

  async getAchievements(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/scoring/achievements`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve achievements');
    return res.json();
  },

  async compareProfiles(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/scoring/compare/${userId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to compare profiles');
    return res.json();
  },
};
