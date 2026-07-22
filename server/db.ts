/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserProfile, FriendRequest, LearningEvent, Friend,
  ConnectedAccount, Resource, Clan, ClanMember, Notification, Battle, Goal, ProfileSettings
} from '../src/types';
import { ParsedLog, PointsBreakdown, heuristicParse, calculatePACEPoints, fallbackAIAssistedScoring, analyzeAIAssistedScoring, analyzeStudyLog, analyzeUserProfile, UserProfileAnalysisReport } from './gemini';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let supabaseInstance: SupabaseClient | null = null;
let isPgEnabled = false;

// Local JSON file path for database fallback
const localDbPath = path.join(process.cwd(), 'server', 'local_db.json');

interface LocalDbSchema {
  profiles: UserProfile[];
  profilesAuth?: { id: string; username: string; passwordHash: string }[];
  profilesSessions?: { token: string; userId: string }[];
  friendRequests: FriendRequest[];
  friends: Friend[];
  learningEvents: LearningEvent[];
  connectedAccounts: ConnectedAccount[];
  resources: Resource[];
  clans: Clan[];
  clanMembers: ClanMember[];
  notifications: Notification[];
  battles: Battle[];
  goals: Goal[];
  profileSettings: ProfileSettings[];
  aiAnalysisReports?: any[];
}

// Ensure the local database file exists and return parsed data
export function readLocalDb(): LocalDbSchema {
  try {
    if (!fs.existsSync(localDbPath)) {
      const initialDb: LocalDbSchema = {
        profiles: [],
        profilesAuth: [],
        profilesSessions: [],
        friendRequests: [],
        friends: [],
        learningEvents: [],
        connectedAccounts: [],
        resources: [],
        clans: [],
        clanMembers: [],
        notifications: [],
        battles: [],
        goals: [],
        profileSettings: [],
        aiAnalysisReports: []
      };
      fs.writeFileSync(localDbPath, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const raw = fs.readFileSync(localDbPath, 'utf-8');
    const db = JSON.parse(raw);
    db.profiles = db.profiles || [];
    db.profilesAuth = db.profilesAuth || [];
    db.profilesSessions = db.profilesSessions || [];
    db.friendRequests = db.friendRequests || [];
    db.friends = db.friends || [];
    db.learningEvents = db.learningEvents || [];
    db.connectedAccounts = db.connectedAccounts || [];
    db.resources = db.resources || [];
    db.clans = db.clans || [];
    db.clanMembers = db.clanMembers || [];
    db.notifications = db.notifications || [];
    db.battles = db.battles || [];
    db.goals = db.goals || [];
    db.profileSettings = db.profileSettings || [];
    db.aiAnalysisReports = db.aiAnalysisReports || [];
    return db;
  } catch (error) {
    console.error('Error reading local JSON db, using empty schema:', error);
    return {
      profiles: [],
      profilesAuth: [],
      profilesSessions: [],
      friendRequests: [],
      friends: [],
      learningEvents: [],
      connectedAccounts: [],
      resources: [],
      clans: [],
      clanMembers: [],
      notifications: [],
      battles: [],
      goals: [],
      profileSettings: [],
      aiAnalysisReports: []
    };
  }
}

// Safely write to the local database file
export function writeLocalDb(data: LocalDbSchema) {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing local JSON db:', error);
  }
}

// Raw SQL Query router for JSON database fallback
export async function queryDb(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  if (isPgEnabled) {
    const pool = getPool();
    return await pool.query(text, params);
  }

  const db = readLocalDb();
  const lowerText = text.toLowerCase();

  if (lowerText.includes('select 1 from public.profiles where username =')) {
    const username = params[0]?.trim().toLowerCase();
    const found = db.profiles.some(p => p.username === username);
    return { rows: found ? [{ '1': 1 }] : [] };
  }

  if (lowerText.includes('select 1 from public.friends where user_id =') && lowerText.includes('friend_id =')) {
    const uId = params[0];
    const fId = params[1];
    const found = db.friends.some(f => f.userId === uId && f.friendId === fId);
    return { rows: found ? [{ '1': 1 }] : [] };
  }

  if (lowerText.includes('select 1 from public.friend_requests') && lowerText.includes('status = \'pending\'')) {
    const p1 = params[0];
    const p2 = params[1];
    const found = db.friendRequests.some(r => 
      ((r.senderId === p1 && r.receiverId === p2) || (r.senderId === p2 && r.receiverId === p1)) &&
      r.status === 'pending'
    );
    return { rows: found ? [{ '1': 1 }] : [] };
  }

  return { rows: [] };
}

// Lazy initialization of PG Pool (strictly PostgreSQL - no local fallback)
export function getPool(): pg.Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'PostgreSQL connection string is not configured. Please define DATABASE_URL or SUPABASE_DATABASE_URL in environment variables.'
      );
    }
    poolInstance = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for most hosted PostgreSQL instances like Supabase
      },
    });
  }
  return poolInstance;
}

// Lazy initialization of Supabase client for auth verification
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Supabase client is not configured. Please define SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in environment variables.'
      );
    }
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

// Get standard date strings (YYYY-MM-DD)
export function getDbStatus(): { pgEnabled: boolean; supabaseEnabled: boolean } {
  let supabaseEnabled = false;
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    supabaseEnabled = !!(url && key && !url.includes('PLACEHOLDER') && !url.includes('[YOUR-'));
  } catch (e) {
    // Ignore
  }
  return {
    pgEnabled: isPgEnabled,
    supabaseEnabled
  };
}

export function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
}

// Auto-initialize tables in PostgreSQL (Mandatory - No fallback allowed)
export async function initDb(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
    console.error('========================================================================');
    console.error('CRITICAL WARNING: Supabase PostgreSQL database connection string is not configured.');
    console.error('All data persistence requests will fail until DATABASE_URL or SUPABASE_DATABASE_URL is set.');
    console.error('========================================================================');
    isPgEnabled = false;
    return;
  }

  try {
    // Temporarily flag as true to allow testing actual connection
    isPgEnabled = true;
    const pool = getPool();
    console.log('Testing PostgreSQL/Supabase connection...');
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL/Supabase connected successfully! Initializing database tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        bio TEXT DEFAULT '',
        university TEXT DEFAULT '',
        branch TEXT DEFAULT '',
        year TEXT DEFAULT '',
        streak INTEGER DEFAULT 0 NOT NULL,
        total_logs INTEGER DEFAULT 0 NOT NULL,
        last_active_date TEXT DEFAULT '',
        is_private BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.profiles_auth (
        id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.profiles_sessions (
        token TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.friend_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT unique_sender_receiver UNIQUE (sender_id, receiver_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.friends (
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        PRIMARY KEY (user_id, friend_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.learning_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.connected_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        last_synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        subject TEXT DEFAULT '' NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('playlist', 'book', 'course', 'website', 'roadmap')),
        url TEXT DEFAULT '' NOT NULL,
        progress INTEGER DEFAULT 0 NOT NULL,
        completed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.clans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        tag TEXT NOT NULL,
        description TEXT DEFAULT '' NOT NULL,
        created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        points INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.clan_members (
        clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member' NOT NULL,
        joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        PRIMARY KEY (clan_id, user_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.battles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'declined')),
        owner_score INTEGER DEFAULT 0 NOT NULL,
        opponent_score INTEGER DEFAULT 0 NOT NULL,
        winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        target INTEGER NOT NULL,
        progress INTEGER DEFAULT 0 NOT NULL,
        deadline TIMESTAMPTZ,
        completed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.profile_settings (
        user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'dark' NOT NULL,
        timezone TEXT DEFAULT 'UTC' NOT NULL,
        connected_platforms JSONB DEFAULT '{}'::jsonb NOT NULL,
        notification_preferences JSONB DEFAULT '{"friendRequests": true, "clanUpdates": true, "battleInvites": true, "streakMilestones": true}'::jsonb NOT NULL
      );
    `);

    // Schema alterations for PACE Logging and Points
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_points INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_score INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_score INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_score INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS yearly_score INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_study_time INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_problems_solved INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievement_progress JSONB DEFAULT '{}'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
    `);
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_sub TEXT;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_google_sub ON public.profiles(google_sub);
    `);
    await pool.query(`
      ALTER TABLE public.learning_events ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.learning_events ADD COLUMN IF NOT EXISTS analysis JSONB;
    `);
    await pool.query(`
      ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS access_token TEXT;
    `);
    await pool.query(`
      ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS sync_error TEXT;
    `);
    await pool.query(`
      ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS stats JSONB;
    `);
    await pool.query(`
      ALTER TABLE public.profile_settings ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"shareLeaderboard": true, "showSubmissions": true}'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profile_settings ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{"accentColor": "indigo", "reducedMotion": false}'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profile_settings ADD COLUMN IF NOT EXISTS notifications_extended JSONB DEFAULT '{"soundEnabled": true, "emailDigest": true, "streakAlerts": true, "goalAlerts": true}'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.profile_settings ADD COLUMN IF NOT EXISTS paco_settings JSONB DEFAULT '{"disableAnimations": false, "reduceMotion": false, "hideMascot": false, "completelyHidden": false}'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.friends ADD COLUMN IF NOT EXISTS is_rival BOOLEAN DEFAULT FALSE NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.friends ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb NOT NULL;
    `);
    await pool.query(`
      ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS invitations JSONB DEFAULT '[]'::jsonb NOT NULL;
    `);

    // Create AI analysis reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.ai_analysis_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        analysis JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    console.log('PostgreSQL database tables verified/created successfully!');
    isPgEnabled = true;
  } catch (error: any) {
    console.error('========================================================================');
    console.error('CRITICAL WARNING: PostgreSQL/Supabase database initialization or connection failed.');
    console.error(`Error details: ${error.message || error}`);
    console.error('The server will start, but database-dependent features will fail with a connection error.');
    console.error('========================================================================');
    isPgEnabled = false;
  }
}

// Check and reset streak if needed
export function checkAndResetStreak(profile: UserProfile): UserProfile {
  if (!profile.lastActiveDate) {
    profile.streak = 0;
    return profile;
  }

  const todayStr = getDateString();
  const yesterdayStr = getYesterdayString();

  if (profile.lastActiveDate !== todayStr && profile.lastActiveDate !== yesterdayStr) {
    profile.streak = 0;
  }
  return profile;
}

// Safely parse a date-only string like YYYY-MM-DD as a UTC Date to avoid local timezone/DST shifts in date subtraction
function parseDateOnlyStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Recompute total scores, streaks, level, and stats from the user's immutable learning events to prevent data/persistence loss
export async function recalculateUserProfileFromEvents(userId: string): Promise<void> {
  const todayStr = getDateString();
  const yesterdayStr = getYesterdayString();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfYear = new Date();
  startOfYear.setMonth(0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  let events: any[] = [];
  let dbType = 'Local Fallback';

  if (isPgEnabled) {
    try {
      dbType = 'PostgreSQL/Supabase';
      const pool = getPool();
      const eventsRes = await pool.query(
        `SELECT id, points, analysis, created_at FROM public.learning_events WHERE user_id = $1`,
        [userId]
      );
      events = eventsRes.rows;
    } catch (err: any) {
      console.error(`[AI Studio Debug Error] Error fetching learning events in PG for recalculation for user ${userId}:`, err);
    }
  } else {
    const db = readLocalDb();
    events = (db.learningEvents || []).filter(e => e.userId === userId);
  }

  let totalPoints = 0;
  let totalLogs = events.length;
  let totalStudyTime = 0;
  let totalProblemsSolved = 0;
  let dailyScore = 0;
  let weeklyScore = 0;
  let monthlyScore = 0;
  let yearlyScore = 0;
  let lastActiveDate = '';

  const activeDaysSet = new Set<string>();

  for (const ev of events) {
    const pts = ev.points || 0;
    totalPoints += pts;

    const analysis = ev.analysis;
    let parsedAnalysis: any = null;
    if (analysis) {
      parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    }

    let duration = 0;
    if (parsedAnalysis) {
      if (typeof parsedAnalysis.duration === 'number') {
        duration = parsedAnalysis.duration;
      } else if (typeof parsedAnalysis.duration === 'string') {
        duration = parseInt(parsedAnalysis.duration, 10) || 0;
      } else if (!parsedAnalysis.recommendedPoints) {
        duration = 30; // standard study event fallback
      }
    } else {
      duration = 30;
    }
    totalStudyTime += duration;

    let solved = 0;
    if (parsedAnalysis) {
      if (typeof parsedAnalysis.problemsSolved === 'number') {
        solved = parsedAnalysis.problemsSolved;
      } else if (typeof parsedAnalysis.problemsSolved === 'string') {
        solved = parseInt(parsedAnalysis.problemsSolved, 10) || 0;
      }
    }
    totalProblemsSolved += solved;

    // Date calculations
    const createdDate = new Date(ev.createdAt || ev.created_at);
    const evDateStr = getDateString(createdDate);
    activeDaysSet.add(evDateStr);

    if (evDateStr === todayStr) {
      dailyScore += pts;
    }
    if (createdDate >= startOfWeek) {
      weeklyScore += pts;
    }
    if (createdDate >= startOfMonth) {
      monthlyScore += pts;
    }
    if (createdDate >= startOfYear) {
      yearlyScore += pts;
    }
  }

  // Calculate streaks from distinct active learning days
  const activeDays = Array.from(activeDaysSet).sort((a, b) => b.localeCompare(a)); // newest first
  let calculatedStreak = 0;
  let calculatedLongestStreak = 0;

  if (activeDays.length > 0) {
    lastActiveDate = activeDays[0];

    // Current consecutive streak ending today or yesterday
    if (lastActiveDate === todayStr || lastActiveDate === yesterdayStr) {
      calculatedStreak = 1;
      let currentParsed = parseDateOnlyStr(lastActiveDate);
      for (let i = 1; i < activeDays.length; i++) {
        const nextDayStr = activeDays[i];
        const nextParsed = parseDateOnlyStr(nextDayStr);
        const diffDays = Math.round((currentParsed.getTime() - nextParsed.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          calculatedStreak++;
          currentParsed = nextParsed;
        } else if (diffDays > 1) {
          break;
        }
      }
    }

    // Longest streak segment in all history
    const activeDaysAsc = Array.from(activeDaysSet).sort((a, b) => a.localeCompare(b));
    let tempStreak = 0;
    let lastParsed: Date | null = null;
    for (const dayStr of activeDaysAsc) {
      const curParsed = parseDateOnlyStr(dayStr);
      if (lastParsed === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((curParsed.getTime() - lastParsed.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreak);
      lastParsed = curParsed;
    }
  }

  const level = Math.floor(totalPoints / 500) + 1;
  const xp = totalPoints;

  // Print diagnostic debugging logs requested by user
  const yesterdayEvents = events.filter(ev => getDateString(new Date(ev.createdAt || ev.created_at)) === yesterdayStr);
  console.log(`[AI Studio Debug] =========================================`);
  console.log(`[AI Studio Debug] Logged-in user ID: ${userId}`);
  console.log(`[AI Studio Debug] Database Type: ${dbType}`);
  console.log(`[AI Studio Debug] Number of learning_events loaded: ${events.length}`);
  console.log(`[AI Studio Debug] Total PACE points calculated: ${totalPoints}`);
  console.log(`[AI Studio Debug] Number of events from yesterday (${yesterdayStr}): ${yesterdayEvents.length}`);
  console.log(`[AI Studio Debug] Recomputed Level: ${level}, Streak: ${calculatedStreak}, Longest Streak: ${calculatedLongestStreak}`);
  console.log(`[AI Studio Debug] =========================================`);

  if (isPgEnabled) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE public.profiles 
         SET points = $1, total_logs = $2, xp = $3, level = $4,
             streak = $5, longest_streak = $6, last_active_date = $7,
             daily_score = $8, weekly_points = $9, weekly_score = $9,
             monthly_score = $10, yearly_score = $11,
             total_study_time = $12, total_problems_solved = $13
         WHERE id = $14`,
        [
          totalPoints, totalLogs, xp, level,
          calculatedStreak, calculatedLongestStreak, lastActiveDate,
          dailyScore, weeklyScore, monthlyScore, yearlyScore,
          totalStudyTime, totalProblemsSolved, userId
        ]
      );
    } catch (err: any) {
      console.error(`[AI Studio Debug Error] Error updating profiles in PG after recalculation for user ${userId}:`, err);
    }
  } else {
    const db = readLocalDb();
    const pIdx = db.profiles.findIndex(p => p.id === userId);
    if (pIdx !== -1) {
      db.profiles[pIdx] = {
        ...db.profiles[pIdx],
        points: totalPoints,
        totalLogs,
        xp,
        level,
        streak: calculatedStreak,
        longestStreak: calculatedLongestStreak,
        lastActiveDate: lastActiveDate || undefined,
        dailyScore,
        weeklyPoints: weeklyScore,
        weeklyScore,
        monthlyScore,
        yearlyScore,
        totalStudyTime,
        totalProblemsSolved
      };
      writeLocalDb(db);
    }
  }
}

// Database helper functions mapped to standard endpoints
export const dbHelpers = {
  recalculateUserProfileFromEvents,
  getDbStatus,
  getPool,

  async getAllProfiles(): Promise<UserProfile[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT * FROM public.profiles');
        return res.rows.map(row => ({
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          avatar: row.avatar,
          bio: row.bio || '',
          university: row.university || '',
          branch: row.branch || '',
          year: row.year || '',
          streak: row.streak || 0,
          totalLogs: row.total_logs || 0,
          lastActiveDate: row.last_active_date || '',
          isPrivate: row.is_private || false,
          points: row.points || 0,
          level: row.level || 1,
          weeklyScore: row.weekly_score || 0,
          weeklyPoints: row.weekly_points || 0,
          xp: row.xp || 0,
          longestStreak: row.longest_streak || 0,
          dailyScore: row.daily_score || 0,
          monthlyScore: row.monthly_score || 0,
          yearlyScore: row.yearly_score || 0,
          totalStudyTime: row.total_study_time || 0,
          totalProblemsSolved: row.total_problems_solved || 0,
          totalProjects: row.total_projects || 0,
        }));
      } catch (err) {
        console.error('PostgreSQL error in getAllProfiles:', err);
      }
    }
    const db = readLocalDb();
    return db.profiles || [];
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    // Rebuild profile stats/scores from learning event logs first to guarantee correct hydration/persistence
    await recalculateUserProfileFromEvents(userId);

    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT p.*, 
            (SELECT COUNT(*)::int FROM public.friends f WHERE f.user_id = p.id) as "friendsCount"
           FROM public.profiles p 
           WHERE p.id = $1`,
          [userId]
        );
        if (res.rows.length === 0) return null;

        const row = res.rows[0];
        const pointsVal = row.points || 0;
        const univ = row.university || '';

        // Calculate dynamic real-time rankings
        const globalRankRes = await pool.query(
          `SELECT COUNT(*)::int + 1 as rank FROM public.profiles WHERE points > $1`,
          [pointsVal]
        );
        const globalTotalRes = await pool.query(
          `SELECT COUNT(*)::int as total FROM public.profiles`
        );

        let instRank = 1;
        let instTotal = 1;
        if (univ) {
          const instRankRes = await pool.query(
            `SELECT COUNT(*)::int + 1 as rank FROM public.profiles WHERE points > $1 AND university = $2`,
            [pointsVal, univ]
          );
          const instTotalRes = await pool.query(
            `SELECT COUNT(*)::int as total FROM public.profiles WHERE university = $1`,
            [univ]
          );
          instRank = instRankRes.rows[0]?.rank || 1;
          instTotal = instTotalRes.rows[0]?.total || 1;
        }

        let profile: UserProfile = {
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          avatar: row.avatar,
          bio: row.bio || '',
          university: univ,
          branch: row.branch || '',
          year: row.year || '',
          streak: row.streak,
          totalLogs: row.total_logs,
          lastActiveDate: row.last_active_date || undefined,
          isPrivate: row.is_private,
          friendsCount: row.friendsCount,
          points: pointsVal,
          level: row.level || 1,
          weeklyScore: row.weekly_score || row.weekly_points || 0,
          weeklyPoints: row.weekly_score || row.weekly_points || 0,
          globalRank: globalRankRes.rows[0]?.rank || 1,
          globalTotal: globalTotalRes.rows[0]?.total || 1,
          institutionRank: instRank,
          institutionTotal: instTotal,
          xp: row.xp || 0,
          longestStreak: row.longest_streak || 0,
          dailyScore: row.daily_score || 0,
          monthlyScore: row.monthly_score || 0,
          yearlyScore: row.yearly_score || 0,
          totalStudyTime: row.total_study_time || 0,
          totalProblemsSolved: row.total_problems_solved || 0,
          totalProjects: row.total_projects || 0,
          achievementProgress: typeof row.achievement_progress === 'string' ? JSON.parse(row.achievement_progress) : (row.achievement_progress || {})
        };

        if (row.email) (profile as any).email = row.email;
        if (row.google_sub) (profile as any).googleSub = row.google_sub;

        profile = checkAndResetStreak(profile);
        return profile;
      } catch (err) {
        console.error('PostgreSQL error in getProfile, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const found = db.profiles.find(p => p.id === userId);
    if (!found) return null;
    const friendsCount = db.friends.filter(f => f.userId === userId).length;

    const pointsVal = found.points || 0;
    const univ = found.university || '';

    // Calculate real rankings
    const allProfiles = db.profiles.map(p => ({ ...p, points: p.points || 0 }));
    allProfiles.sort((a, b) => b.points - a.points);
    
    const globalRank = allProfiles.filter(p => p.points > pointsVal).length + 1;
    const globalTotal = allProfiles.length;

    let institutionRank = 1;
    let institutionTotal = 1;
    if (univ) {
      const univProfiles = allProfiles.filter(p => p.university === univ);
      institutionRank = univProfiles.filter(p => p.points > pointsVal).length + 1;
      institutionTotal = univProfiles.length;
    }

    let profile: UserProfile = {
      ...found,
      points: pointsVal,
      level: found.level || 1,
      weeklyScore: found.weeklyScore || found.weeklyPoints || 0,
      weeklyPoints: found.weeklyScore || found.weeklyPoints || 0,
      friendsCount,
      globalRank,
      globalTotal,
      institutionRank,
      institutionTotal,
      xp: found.xp || 0,
      longestStreak: found.longestStreak || 0,
      dailyScore: found.dailyScore || 0,
      monthlyScore: found.monthlyScore || 0,
      yearlyScore: found.yearlyScore || 0,
      totalStudyTime: found.totalStudyTime || 0,
      totalProblemsSolved: found.totalProblemsSolved || 0,
      totalProjects: found.totalProjects || 0,
      achievementProgress: found.achievementProgress || {}
    };
    profile = checkAndResetStreak(profile);
    return profile;
  },

  async getProfileByEmailOrSub(email?: string, googleSub?: string): Promise<UserProfile | null> {
    if (!email && !googleSub) return null;
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT id FROM public.profiles 
           WHERE (google_sub IS NOT NULL AND google_sub = $1 AND google_sub != '')
              OR (email IS NOT NULL AND LOWER(email) = LOWER($2) AND email != '')
           LIMIT 1`,
          [googleSub || '', (email || '').toLowerCase()]
        );
        if (res.rows.length > 0) {
          return await this.getProfile(res.rows[0].id);
        }
      } catch (err) {
        console.error('Error finding profile by email or googleSub in PG:', err);
      }
    }
    const db = readLocalDb();
    const found = db.profiles.find(p => 
      (googleSub && (p as any).googleSub === googleSub) ||
      (email && (p as any).email && (p as any).email.toLowerCase() === email.toLowerCase())
    );
    if (found) {
      return await this.getProfile(found.id);
    }
    return null;
  },

  async updateProfileEmailAndSub(userId: string, email?: string, googleSub?: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        if (email && googleSub) {
          await pool.query(`UPDATE public.profiles SET email = $1, google_sub = $2 WHERE id = $3`, [email, googleSub, userId]);
        } else if (email) {
          await pool.query(`UPDATE public.profiles SET email = $1 WHERE id = $2`, [email, userId]);
        } else if (googleSub) {
          await pool.query(`UPDATE public.profiles SET google_sub = $1 WHERE id = $2`, [googleSub, userId]);
        }
      } catch (err) {
        console.error('Error updating profile email/sub in PG:', err);
      }
    }
    const db = readLocalDb();
    const pIdx = db.profiles.findIndex(p => p.id === userId);
    if (pIdx !== -1) {
      if (email) (db.profiles[pIdx] as any).email = email;
      if (googleSub) (db.profiles[pIdx] as any).googleSub = googleSub;
      writeLocalDb(db);
    }
  },

  async createProfile(profile: UserProfile): Promise<UserProfile> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.profiles (id, username, display_name, avatar, bio, university, branch, year, streak, total_logs, last_active_date, is_private, points, level, weekly_points, xp, longest_streak, daily_score, weekly_score, monthly_score, yearly_score, total_study_time, total_problems_solved, total_projects, achievement_progress, email, google_sub)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
          [
            profile.id,
            profile.username,
            profile.displayName,
            profile.avatar,
            profile.bio || '',
            profile.university || '',
            profile.branch || '',
            profile.year || '',
            profile.streak || 0,
            profile.totalLogs || 0,
            profile.lastActiveDate || '',
            profile.isPrivate || false,
            profile.points || 0,
            profile.level || 1,
            profile.weeklyScore || profile.weeklyPoints || 0,
            profile.xp || 0,
            profile.longestStreak || 0,
            profile.dailyScore || 0,
            profile.weeklyScore || profile.weeklyPoints || 0,
            profile.monthlyScore || 0,
            profile.yearlyScore || 0,
            profile.totalStudyTime || 0,
            profile.totalProblemsSolved || 0,
            profile.totalProjects || 0,
            JSON.stringify(profile.achievementProgress || {}),
            (profile as any).email || null,
            (profile as any).googleSub || null
          ]
        );
        return profile;
      } catch (err) {
        console.error('PostgreSQL error in createProfile, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    db.profiles = db.profiles.filter(p => p.id !== profile.id);
    db.profiles.push(profile);
    writeLocalDb(db);
    return profile;
  },

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const existing = await this.getProfile(userId);
        if (!existing) {
          throw new Error('Profile not found');
        }

        const merged = { ...existing, ...data };
        await pool.query(
          `UPDATE public.profiles 
           SET display_name = $1, avatar = $2, bio = $3, university = $4, branch = $5, year = $6, is_private = $7,
               points = $8, level = $9, weekly_points = $10, xp = $11, longest_streak = $12, daily_score = $13,
               weekly_score = $14, monthly_score = $15, yearly_score = $16, total_study_time = $17,
               total_problems_solved = $18, total_projects = $19, achievement_progress = $20
           WHERE id = $21`,
          [
            merged.displayName,
            merged.avatar,
            merged.bio,
            merged.university,
            merged.branch,
            merged.year,
            merged.isPrivate || false,
            merged.points || 0,
            merged.level || 1,
            merged.weeklyScore || merged.weeklyPoints || 0,
            merged.xp || 0,
            merged.longestStreak || 0,
            merged.dailyScore || 0,
            merged.weeklyScore || merged.weeklyPoints || 0,
            merged.monthlyScore || 0,
            merged.yearlyScore || 0,
            merged.totalStudyTime || 0,
            merged.totalProblemsSolved || 0,
            merged.totalProjects || 0,
            JSON.stringify(merged.achievementProgress || {}),
            userId,
          ]
        );

        return (await this.getProfile(userId))!;
      } catch (err) {
        console.error('PostgreSQL error in updateProfile, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const idx = db.profiles.findIndex(p => p.id === userId);
    if (idx === -1) throw new Error('Profile not found');
    db.profiles[idx] = { ...db.profiles[idx], ...data };
    writeLocalDb(db);
    return (await this.getProfile(userId))!;
  },

  async searchProfiles(userId: string, query: string): Promise<Array<{ profile: UserProfile; friendStatus: 'none' | 'friend' | 'outgoing_pending' | 'incoming_pending' }>> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const searchPattern = `%${query.toLowerCase()}%`;

        // Fetch all matched profiles except the current user
        const res = await pool.query(
          `SELECT p.*, 
            (SELECT COUNT(*)::int FROM public.friends f WHERE f.user_id = p.id) as "friendsCount"
           FROM public.profiles p
           WHERE p.id != $1 AND (
             LOWER(p.username) LIKE $2 OR 
             LOWER(p.display_name) LIKE $2 OR 
             LOWER(p.university) LIKE $2
           )`,
          [userId, searchPattern]
        );

        const results: any[] = [];
        for (const row of res.rows) {
          let profile: UserProfile = {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            avatar: row.avatar,
            bio: row.bio || '',
            university: row.university || '',
            branch: row.branch || '',
            year: row.year || '',
            streak: row.streak,
            totalLogs: row.total_logs,
            lastActiveDate: row.last_active_date || undefined,
            isPrivate: row.is_private,
            friendsCount: row.friendsCount,
          };
          profile = checkAndResetStreak(profile);

          // Check friendship status
          let friendStatus: 'none' | 'friend' | 'outgoing_pending' | 'incoming_pending' = 'none';

          // Friend check
          const friendRes = await pool.query(
            `SELECT 1 FROM public.friends WHERE user_id = $1 AND friend_id = $2`,
            [userId, profile.id]
          );
          if (friendRes.rows.length > 0) {
            friendStatus = 'friend';
          } else {
            // Pending check
            const reqRes = await pool.query(
              `SELECT sender_id, receiver_id FROM public.friend_requests 
               WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = 'pending'`,
              [userId, profile.id]
            );
            if (reqRes.rows.length > 0) {
              const r = reqRes.rows[0];
              if (r.sender_id === userId) {
                friendStatus = 'outgoing_pending';
              } else {
                friendStatus = 'incoming_pending';
              }
            }
          }

          results.push({ profile, friendStatus });
        }

        return results;
      } catch (err) {
        console.error('PostgreSQL error in searchProfiles, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const pat = query.toLowerCase();
    const matched = db.profiles.filter(p => 
      p.id !== userId && (
        p.username.toLowerCase().includes(pat) ||
        p.displayName.toLowerCase().includes(pat) ||
        (p.university && p.university.toLowerCase().includes(pat))
      )
    );

    const results = [];
    for (const p of matched) {
      const friendsCount = db.friends.filter(f => f.userId === p.id).length;
      let profile: UserProfile = {
        ...p,
        friendsCount
      };
      profile = checkAndResetStreak(profile);

      let friendStatus: 'none' | 'friend' | 'outgoing_pending' | 'incoming_pending' = 'none';
      const isFriend = db.friends.some(f => f.userId === userId && f.friendId === p.id);
      if (isFriend) {
        friendStatus = 'friend';
      } else {
        const req = db.friendRequests.find(r => 
          ((r.senderId === userId && r.receiverId === p.id) || (r.senderId === p.id && r.receiverId === userId)) &&
          r.status === 'pending'
        );
        if (req) {
          friendStatus = req.senderId === userId ? 'outgoing_pending' : 'incoming_pending';
        }
      }

      results.push({ profile, friendStatus });
    }
    return results;
  },

  async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const sender = await this.getProfile(senderId);
        if (!sender) throw new Error('Sender profile not found');

        const requestId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO public.friend_requests (id, sender_id, receiver_id, status)
           VALUES ($1, $2, $3, 'pending')`,
          [requestId, senderId, receiverId]
        );

        return {
          id: requestId,
          senderId,
          senderUsername: sender.username,
          senderDisplayName: sender.displayName,
          senderAvatar: sender.avatar,
          receiverId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('PostgreSQL error in sendFriendRequest, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const sender = db.profiles.find(p => p.id === senderId);
    if (!sender) throw new Error('Sender profile not found');

    const requestId = crypto.randomUUID();
    const newReq: FriendRequest = {
      id: requestId,
      senderId,
      senderUsername: sender.username,
      senderDisplayName: sender.displayName,
      senderAvatar: sender.avatar,
      receiverId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.friendRequests.push(newReq);
    writeLocalDb(db);
    return newReq;
  },

  async getFriendRequests(receiverId: string): Promise<FriendRequest[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT r.id, r.sender_id, r.receiver_id, r.status, r.created_at,
                  p.username, p.display_name, p.avatar
           FROM public.friend_requests r
           JOIN public.profiles p ON r.sender_id = p.id
           WHERE r.receiver_id = $1 AND r.status = 'pending'`,
          [receiverId]
        );

        return res.rows.map(row => ({
          id: row.id,
          senderId: row.sender_id,
          senderUsername: row.username,
          senderDisplayName: row.display_name,
          senderAvatar: row.avatar,
          receiverId: row.receiver_id,
          status: row.status as 'pending',
          createdAt: row.created_at.toISOString(),
        }));
      } catch (err) {
        console.error('PostgreSQL error in getFriendRequests, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    return db.friendRequests.filter(r => r.receiverId === receiverId && r.status === 'pending');
  },

  async respondFriendRequest(requestId: string, receiverId: string, action: 'accept' | 'decline'): Promise<{ success: boolean; status: string }> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const statusVal = action === 'accept' ? 'accepted' : 'declined';

        const reqRes = await pool.query(
          `UPDATE public.friend_requests 
           SET status = $1 
           WHERE id = $2 AND receiver_id = $3 AND status = 'pending'
           RETURNING sender_id`,
          [statusVal, requestId, receiverId]
        );

        if (reqRes.rows.length === 0) {
          throw new Error('Pending request not found');
        }

        const senderId = reqRes.rows[0].sender_id;

        if (action === 'accept') {
          // Add bidirectional relationships in friends table
          await pool.query(
            `INSERT INTO public.friends (user_id, friend_id)
             VALUES ($1, $2), ($2, $1)
             ON CONFLICT DO NOTHING`,
            [receiverId, senderId]
          );
        }

        return { success: true, status: statusVal };
      } catch (err) {
        console.error('PostgreSQL error in respondFriendRequest, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const reqIdx = db.friendRequests.findIndex(r => r.id === requestId && r.receiverId === receiverId && r.status === 'pending');
    if (reqIdx === -1) throw new Error('Pending request not found');

    const statusVal = action === 'accept' ? 'accepted' : 'declined';
    db.friendRequests[reqIdx].status = statusVal;

    const senderId = db.friendRequests[reqIdx].senderId;

    if (action === 'accept') {
      const exists1 = db.friends.some(f => f.userId === receiverId && f.friendId === senderId);
      if (!exists1) {
        db.friends.push({
          userId: receiverId,
          friendId: senderId,
          friendUsername: '',
          friendDisplayName: '',
          friendAvatar: '',
          createdAt: new Date().toISOString()
        });
      }
      const exists2 = db.friends.some(f => f.userId === senderId && f.friendId === receiverId);
      if (!exists2) {
        db.friends.push({
          userId: senderId,
          friendId: receiverId,
          friendUsername: '',
          friendDisplayName: '',
          friendAvatar: '',
          createdAt: new Date().toISOString()
        });
      }
    }

    writeLocalDb(db);
    return { success: true, status: statusVal };
  },

  async getFriends(userId: string): Promise<Friend[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT f.friend_id, p.username, p.display_name, p.avatar, f.created_at
           FROM public.friends f
           JOIN public.profiles p ON f.friend_id = p.id
           WHERE f.user_id = $1`,
          [userId]
        );

        return res.rows.map(row => ({
          userId,
          friendId: row.friend_id,
          friendUsername: row.username,
          friendDisplayName: row.display_name,
          friendAvatar: row.avatar,
          createdAt: row.created_at.toISOString(),
        }));
      } catch (err) {
        console.error('PostgreSQL error in getFriends, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const userFriends = db.friends.filter(f => f.userId === userId);
    const results: Friend[] = [];
    for (const uf of userFriends) {
      const p = db.profiles.find(profile => profile.id === uf.friendId);
      if (p) {
        results.push({
          userId,
          friendId: uf.friendId,
          friendUsername: p.username,
          friendDisplayName: p.displayName,
          friendAvatar: p.avatar,
          createdAt: uf.createdAt
        });
      }
    }
    return results;
  },

  async removeFriend(userId: string, friendId: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        // Delete bidirectional friendship
        await pool.query(
          `DELETE FROM public.friends 
           WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
          [userId, friendId]
        );

        // Delete requests to let them connect again
        await pool.query(
          `DELETE FROM public.friend_requests 
           WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
          [userId, friendId]
        );
        return;
      } catch (err) {
        console.error('PostgreSQL error in removeFriend, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    db.friends = db.friends.filter(f => 
      !(f.userId === userId && f.friendId === friendId) && 
      !(f.userId === friendId && f.friendId === userId)
    );
    db.friendRequests = db.friendRequests.filter(r => 
      !(r.senderId === userId && r.receiverId === friendId) && 
      !(r.senderId === friendId && r.receiverId === userId)
    );
    writeLocalDb(db);
  },

  async createLearningLog(userId: string, content: string): Promise<{ event: LearningEvent; profile: UserProfile }> {
    const profile = await this.getProfile(userId);
    const recentLogs = await this.getUserLogs(userId);
    const connectedAccounts = await this.getConnectedAccounts(userId);
    const resources = await this.getResources(userId);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = recentLogs.filter(log => log.createdAt && log.createdAt.startsWith(todayStr));
    const recentCount = todayLogs.length;
    const recentDuration = todayLogs.reduce((acc, log) => {
      const duration = (log.analysis as any)?.duration || 30;
      return acc + duration;
    }, 0);

    const parsed = await analyzeStudyLog(content.trim(), recentCount, recentDuration);

    const userContext = {
      streak: profile?.streak || 0,
      recentLogs: recentLogs.slice(0, 5).map(l => ({
        content: l.content,
        points: l.points,
        analysis: l.analysis
      })),
      connectedAccounts: connectedAccounts.map(a => ({
        platform: a.platform,
        username: a.username,
        stats: a.stats
      })),
      resources: resources.map(r => ({
        title: r.title,
        type: r.type,
        progress: r.progress,
        completed: r.completed
      }))
    };

    const aiAnalysis = await analyzeAIAssistedScoring(userId, content.trim(), parsed, userContext);
    const { total, breakdown } = calculatePACEPoints(parsed, profile?.streak || 0, false, aiAnalysis);
    const enrichedParsed = {
      ...parsed,
      aiScoringAnalysis: aiAnalysis
    };
    return this.savePACETrackedLog(userId, content, enrichedParsed, total, breakdown);
  },

  async savePACETrackedLog(userId: string, content: string, parsed: ParsedLog, pointsAwarded: number, breakdown: PointsBreakdown[]): Promise<{ event: LearningEvent; profile: UserProfile }> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const profile = await this.getProfile(userId);
        if (!profile) throw new Error('Profile not found');

        const logId = crypto.randomUUID();
        const createdAt = new Date();

        // 1. Insert learning log with points and parsed analysis
        await pool.query(
          `INSERT INTO public.learning_events (id, user_id, content, points, analysis, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, userId, content, pointsAwarded, JSON.stringify({ ...parsed, pointsBreakdown: breakdown }), createdAt]
        );

        // 2. Calculate streak and progress increments
        const todayStr = getDateString();
        const yesterdayStr = getYesterdayString();

        let newStreak = profile.streak || 0;
        let newTotalLogs = (profile.totalLogs || 0) + 1;
        let newPoints = (profile.points || 0) + pointsAwarded;
        let newWeeklyPoints = (profile.weeklyScore || profile.weeklyPoints || 0) + pointsAwarded;
        let newLevel = Math.floor(newPoints / 500) + 1; // 500 points per level progression

        if (profile.lastActiveDate === todayStr) {
          // Already logged today
        } else if (profile.lastActiveDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        const newLongestStreak = Math.max(profile.longestStreak || 0, newStreak);
        const newDailyScore = (profile.lastActiveDate === todayStr ? (profile.dailyScore || 0) : 0) + pointsAwarded;
        const newMonthlyScore = (profile.monthlyScore || 0) + pointsAwarded;
        const newYearlyScore = (profile.yearlyScore || 0) + pointsAwarded;
        const newXp = (profile.xp || 0) + pointsAwarded;
        const newTotalStudyTime = (profile.totalStudyTime || 0) + (parsed.duration || 30);
        const newTotalProblemsSolved = (profile.totalProblemsSolved || 0) + (parsed.problemsSolved || 0);

        // 3. Update profile points, levels, streak, logs, and advanced progress metrics
        await pool.query(
          `UPDATE public.profiles 
           SET streak = $1, total_logs = $2, points = $3, level = $4, weekly_points = $5, last_active_date = $6,
               longest_streak = $7, daily_score = $8, weekly_score = $5, monthly_score = $9, yearly_score = $10,
               xp = $11, total_study_time = $12, total_problems_solved = $13
           WHERE id = $14`,
          [
            newStreak, newTotalLogs, newPoints, newLevel, newWeeklyPoints, todayStr,
            newLongestStreak, newDailyScore, newMonthlyScore, newYearlyScore, newXp,
            newTotalStudyTime, newTotalProblemsSolved, userId
          ]
        );

        // 3b. Insert AI analysis report for history
        if (parsed.aiScoringAnalysis) {
          await pool.query(
            `INSERT INTO public.ai_analysis_reports (user_id, type, analysis)
             VALUES ($1, $2, $3)`,
            [userId, 'session_deep', JSON.stringify(parsed.aiScoringAnalysis)]
          );
        }

        // 4. Increment Clan Score if part of a clan
        const clanMemberRes = await pool.query('SELECT clan_id FROM public.clan_members WHERE user_id = $1', [userId]);
        if (clanMemberRes.rows.length > 0) {
          const clanId = clanMemberRes.rows[0].clan_id;
          await pool.query(
            `UPDATE public.clans SET points = points + $1 WHERE id = $2`,
            [pointsAwarded, clanId]
          );
        }

        // 5. Progress any matched active goals
        const goalsRes = await pool.query('SELECT id, title, target, progress FROM public.goals WHERE user_id = $1 AND completed = FALSE', [userId]);
        for (const goal of goalsRes.rows) {
          const goalTitle = goal.title.toLowerCase();
          const matches = goalTitle.includes(parsed.subject.toLowerCase()) || 
                          (parsed.topic && goalTitle.includes(parsed.topic.toLowerCase())) ||
                          (parsed.platform && goalTitle.includes(parsed.platform.toLowerCase())) ||
                          goalTitle.includes('log') || goalTitle.includes('points') || goalTitle.includes('study');
          if (matches) {
            const newProgress = Math.min(goal.target, goal.progress + 1);
            const completed = newProgress >= goal.target;
            await pool.query(
              `UPDATE public.goals SET progress = $1, completed = $2 WHERE id = $3`,
              [newProgress, completed, goal.id]
            );
          }
        }

        const updatedProfile = (await this.getProfile(userId))!;

        const event: LearningEvent = {
          id: logId,
          userId,
          username: updatedProfile.username,
          displayName: updatedProfile.displayName,
          avatar: updatedProfile.avatar,
          content,
          createdAt: createdAt.toISOString(),
          points: pointsAwarded,
          analysis: { ...parsed, pointsBreakdown: breakdown } as any
        };

        return { event, profile: updatedProfile };
      } catch (err) {
        console.error('PostgreSQL error in savePACETrackedLog, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const pIdx = db.profiles.findIndex(p => p.id === userId);
    if (pIdx === -1) throw new Error('Profile not found');

    const profile = db.profiles[pIdx];
    const logId = crypto.randomUUID();
    const createdAt = new Date();
    const todayStr = getDateString(createdAt);
    const yesterdayStr = getYesterdayString();

    let newStreak = profile.streak || 0;
    let newTotalLogs = (profile.totalLogs || 0) + 1;
    const newPoints = (profile.points || 0) + pointsAwarded;
    const newWeeklyPoints = (profile.weeklyScore || profile.weeklyPoints || 0) + pointsAwarded;
    const newLevel = Math.floor(newPoints / 500) + 1;

    if (profile.lastActiveDate === todayStr) {
      // Already active today
    } else if (profile.lastActiveDate === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const newLongestStreak = Math.max(profile.longestStreak || 0, newStreak);
    const newDailyScore = (profile.lastActiveDate === todayStr ? (profile.dailyScore || 0) : 0) + pointsAwarded;
    const newMonthlyScore = (profile.monthlyScore || 0) + pointsAwarded;
    const newYearlyScore = (profile.yearlyScore || 0) + pointsAwarded;
    const newXp = (profile.xp || 0) + pointsAwarded;
    const newTotalStudyTime = (profile.totalStudyTime || 0) + (parsed.duration || 30);
    const newTotalProblemsSolved = (profile.totalProblemsSolved || 0) + (parsed.problemsSolved || 0);

    db.profiles[pIdx] = {
      ...profile,
      streak: newStreak,
      totalLogs: newTotalLogs,
      points: newPoints,
      level: newLevel,
      weeklyPoints: newWeeklyPoints,
      weeklyScore: newWeeklyPoints,
      lastActiveDate: todayStr,
      longestStreak: newLongestStreak,
      dailyScore: newDailyScore,
      monthlyScore: newMonthlyScore,
      yearlyScore: newYearlyScore,
      xp: newXp,
      totalStudyTime: newTotalStudyTime,
      totalProblemsSolved: newTotalProblemsSolved
    };

    // Store AI analysis report for history
    if (!db.aiAnalysisReports) {
      db.aiAnalysisReports = [];
    }
    if (parsed.aiScoringAnalysis) {
      db.aiAnalysisReports.push({
        id: crypto.randomUUID(),
        userId,
        type: 'session_deep',
        analysis: parsed.aiScoringAnalysis,
        createdAt: createdAt.toISOString()
      });
    }

    // Update Clan Points in local fallback
    if (db.clanMembers) {
      const clanMember = db.clanMembers.find(cm => cm.userId === userId);
      if (clanMember) {
        const clanIdx = db.clans.findIndex(c => c.id === clanMember.clanId);
        if (clanIdx !== -1) {
          db.clans[clanIdx].points = (db.clans[clanIdx].points || 0) + pointsAwarded;
        }
      }
    }

    // Update Goals in local fallback
    if (db.goals) {
      db.goals.forEach((g, idx) => {
        if (g.userId === userId && !g.completed) {
          const goalTitle = g.title.toLowerCase();
          const matches = goalTitle.includes(parsed.subject.toLowerCase()) || 
                          (parsed.topic && goalTitle.includes(parsed.topic.toLowerCase())) ||
                          (parsed.platform && goalTitle.includes(parsed.platform.toLowerCase())) ||
                          goalTitle.includes('log') || goalTitle.includes('points') || goalTitle.includes('study');
          if (matches) {
            const newProg = Math.min(g.target, g.progress + 1);
            db.goals[idx].progress = newProg;
            db.goals[idx].completed = newProg >= g.target;
          }
        }
      });
    }

    const event: LearningEvent = {
      id: logId,
      userId,
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      content,
      createdAt: createdAt.toISOString(),
      points: pointsAwarded,
      analysis: { ...parsed, pointsBreakdown: breakdown } as any
    };

    if (!db.learningEvents) db.learningEvents = [];
    db.learningEvents.push(event);
    writeLocalDb(db);

    const updatedProfile = {
      ...db.profiles[pIdx],
      friendsCount: db.friends.filter(f => f.userId === userId).length,
      points: newPoints,
      level: newLevel,
      weeklyScore: newWeeklyPoints
    };

    return { event, profile: updatedProfile as any };
  },

  async getUserLogs(targetUserId: string): Promise<LearningEvent[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT e.id, e.user_id, e.content, e.points, e.analysis, e.created_at, p.username, p.display_name, p.avatar
           FROM public.learning_events e
           JOIN public.profiles p ON e.user_id = p.id
           WHERE e.user_id = $1
           ORDER BY e.created_at DESC`,
          [targetUserId]
        );

        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          displayName: row.display_name,
          avatar: row.avatar,
          content: row.content,
          createdAt: row.created_at.toISOString(),
          points: row.points || 0,
          analysis: row.analysis || null
        }));
      } catch (err) {
        console.error('PostgreSQL error in getUserLogs, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const logs = db.learningEvents || [];
    return logs
      .filter(e => e.userId === targetUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(e => ({
        ...e,
        points: e.points || 0,
        analysis: e.analysis || null
      }));
  },

  async getFeed(userId: string): Promise<LearningEvent[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT e.id, e.user_id, e.content, e.points, e.analysis, e.created_at, p.username, p.display_name, p.avatar
           FROM public.learning_events e
           JOIN public.profiles p ON e.user_id = p.id
           WHERE e.user_id = $1 OR e.user_id IN (
             SELECT friend_id FROM public.friends WHERE user_id = $1
           )
           ORDER BY e.created_at DESC`,
           [userId]
        );

        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          displayName: row.display_name,
          avatar: row.avatar,
          content: row.content,
          createdAt: row.created_at.toISOString(),
          points: row.points || 0,
          analysis: row.analysis || null
        }));
      } catch (err) {
        console.error('PostgreSQL error in getFeed, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const friendIds = db.friends.filter(f => f.userId === userId).map(f => f.friendId);
    const allowedIds = [userId, ...friendIds];
    const logs = db.learningEvents || [];
    return logs
      .filter(e => allowedIds.includes(e.userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(e => ({
        ...e,
        points: e.points || 0,
        analysis: e.analysis || null
      }));
  },

  async getHeatmap(targetUserId: string): Promise<Array<{ date: string; count: number }>> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*)::int as count
           FROM public.learning_events
           WHERE user_id = $1
           GROUP BY DATE_TRUNC('day', created_at)
           ORDER BY date ASC`,
          [targetUserId]
        );

        return res.rows.map(row => ({
          date: getDateString(new Date(row.date)),
          count: row.count,
        }));
      } catch (err) {
        console.error('PostgreSQL error in getHeatmap, falling back:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const userLogs = db.learningEvents.filter(e => e.userId === targetUserId);
    const groups: Record<string, number> = {};
    for (const log of userLogs) {
      const dStr = getDateString(new Date(log.createdAt));
      groups[dStr] = (groups[dStr] || 0) + 1;
    }
    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT * FROM public.connected_accounts WHERE user_id = $1', [userId]);
        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          platform: row.platform,
          username: row.username,
          status: row.status,
          lastSyncedAt: row.last_synced_at.toISOString(),
          accessToken: row.access_token || undefined,
          syncError: row.sync_error || undefined,
          stats: row.stats || undefined
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    return db.connectedAccounts.filter(c => c.userId === userId);
  },

  async saveConnectedAccount(userId: string, platform: string, username: string, accessToken?: string): Promise<ConnectedAccount> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `INSERT INTO public.connected_accounts (user_id, platform, username, status, last_synced_at, access_token)
           VALUES ($1, $2, $3, 'active', NOW(), $4)
           ON CONFLICT (user_id, platform) DO UPDATE 
           SET username = EXCLUDED.username, last_synced_at = NOW(), status = 'active', access_token = COALESCE(EXCLUDED.access_token, public.connected_accounts.access_token)
           RETURNING *`,
          [userId, platform, username, accessToken || null]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          platform: row.platform,
          username: row.username,
          status: row.status,
          lastSyncedAt: row.last_synced_at.toISOString(),
          accessToken: row.access_token || undefined,
          syncError: row.sync_error || undefined,
          stats: row.stats || undefined
        };
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const existingIdx = db.connectedAccounts.findIndex(c => c.userId === userId && c.platform === platform);
    const updated: ConnectedAccount = {
      id: existingIdx !== -1 ? db.connectedAccounts[existingIdx].id : crypto.randomUUID(),
      userId,
      platform: platform as any,
      username,
      status: 'active',
      lastSyncedAt: new Date().toISOString(),
      accessToken,
      syncError: existingIdx !== -1 ? db.connectedAccounts[existingIdx].syncError : undefined,
      stats: existingIdx !== -1 ? db.connectedAccounts[existingIdx].stats : undefined
    };
    if (existingIdx !== -1) {
      db.connectedAccounts[existingIdx] = updated;
    } else {
      db.connectedAccounts.push(updated);
    }
    writeLocalDb(db);
    return updated;
  },

  async updateConnectedAccount(userId: string, platform: string, fields: Partial<ConnectedAccount>): Promise<ConnectedAccount> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const keys = Object.keys(fields);
        if (keys.length === 0) {
          const res = await pool.query('SELECT * FROM public.connected_accounts WHERE user_id = $1 AND platform = $2', [userId, platform]);
          const row = res.rows[0];
          return {
            id: row.id,
            userId: row.user_id,
            platform: row.platform,
            username: row.username,
            status: row.status,
            lastSyncedAt: row.last_synced_at.toISOString(),
            accessToken: row.access_token || undefined,
            syncError: row.sync_error || undefined,
            stats: row.stats || undefined
          };
        }
        
        const setClauses: string[] = [];
        const values: any[] = [userId, platform];
        let placeholderIndex = 3;
        
        for (const key of keys) {
          const dbCol = key === 'lastSyncedAt' ? 'last_synced_at' :
                       key === 'accessToken' ? 'access_token' :
                       key === 'syncError' ? 'sync_error' : 
                       key === 'stats' ? 'stats' : key;
          
          setClauses.push(`${dbCol} = $${placeholderIndex}`);
          let val = (fields as any)[key];
          if (key === 'stats' && val !== null && val !== undefined) {
            val = JSON.stringify(val);
          }
          values.push(val !== undefined ? val : null);
          placeholderIndex++;
        }
        
        const queryStr = `
          UPDATE public.connected_accounts 
          SET ${setClauses.join(', ')} 
          WHERE user_id = $1 AND platform = $2 
          RETURNING *
        `;
        const res = await pool.query(queryStr, values);
        if (res.rows.length === 0) {
          throw new Error('Account connection not found');
        }
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          platform: row.platform,
          username: row.username,
          status: row.status,
          lastSyncedAt: row.last_synced_at.toISOString(),
          accessToken: row.access_token || undefined,
          syncError: row.sync_error || undefined,
          stats: row.stats || undefined
        };
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const idx = db.connectedAccounts.findIndex(c => c.userId === userId && c.platform === platform);
    if (idx === -1) {
      throw new Error('Account connection not found');
    }
    db.connectedAccounts[idx] = {
      ...db.connectedAccounts[idx],
      ...fields
    } as any;
    writeLocalDb(db);
    return db.connectedAccounts[idx];
  },

  async disconnectAccount(userId: string, platform: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query('DELETE FROM public.connected_accounts WHERE user_id = $1 AND platform = $2', [userId, platform]);
        return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    db.connectedAccounts = db.connectedAccounts.filter(c => !(c.userId === userId && c.platform === platform));
    writeLocalDb(db);
  },

  async getResources(userId: string): Promise<Resource[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT * FROM public.resources WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          title: row.title,
          subject: row.subject,
          type: row.type as any,
          url: row.url,
          progress: row.progress,
          completed: row.completed,
          createdAt: row.created_at.toISOString()
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    return db.resources.filter(r => r.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createResource(userId: string, title: string, subject: string, type: string, url: string): Promise<Resource> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `INSERT INTO public.resources (user_id, title, subject, type, url, progress, completed, created_at)
           VALUES ($1, $2, $3, $4, $5, 0, FALSE, NOW())
           RETURNING *`,
          [userId, title, subject, type, url]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          subject: row.subject,
          type: row.type as any,
          url: row.url,
          progress: row.progress,
          completed: row.completed,
          createdAt: row.created_at.toISOString()
        };
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const item: Resource = {
      id: crypto.randomUUID(),
      userId,
      title,
      subject,
      type: type as any,
      url,
      progress: 0,
      completed: false,
      createdAt: new Date().toISOString()
    };
    db.resources.push(item);
    writeLocalDb(db);
    return item;
  },

  async updateResource(userId: string, id: string, progress: number, completed: boolean): Promise<Resource> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `UPDATE public.resources 
           SET progress = $1, completed = $2
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [progress, completed, id, userId]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          subject: row.subject,
          type: row.type as any,
          url: row.url,
          progress: row.progress,
          completed: row.completed,
          createdAt: row.created_at.toISOString()
        };
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const idx = db.resources.findIndex(r => r.id === id && r.userId === userId);
    if (idx !== -1) {
      db.resources[idx].progress = progress;
      db.resources[idx].completed = completed;
      writeLocalDb(db);
      return db.resources[idx];
    }
    throw new Error('Resource not found');
  },

  async deleteResource(userId: string, id: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query('DELETE FROM public.resources WHERE id = $1 AND user_id = $2', [id, userId]);
        return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    db.resources = db.resources.filter(r => !(r.id === id && r.userId === userId));
    writeLocalDb(db);
  },

  async getClans(): Promise<Clan[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(`
          SELECT c.*, COUNT(cm.user_id)::int as member_count 
          FROM public.clans c
          LEFT JOIN public.clan_members cm ON c.id = cm.clan_id
          GROUP BY c.id
          ORDER BY c.points DESC
        `);
        return res.rows.map(row => ({
          id: row.id,
          name: row.name,
          tag: row.tag,
          description: row.description,
          createdBy: row.created_by,
          points: row.points,
          createdAt: row.created_at.toISOString(),
          memberCount: row.member_count
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    return db.clans.map(clan => {
      const members = db.clanMembers.filter(m => m.clanId === clan.id);
      return { ...clan, memberCount: members.length };
    }).sort((a, b) => b.points - a.points);
  },

  async createClan(userId: string, name: string, tag: string, description: string): Promise<Clan> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `INSERT INTO public.clans (name, tag, description, created_by, points, created_at)
           VALUES ($1, $2, $3, $4, 0, NOW())
           RETURNING *`,
          [name, tag, description, userId]
        );
        const clan = res.rows[0];
        // Auto join as leader
        await pool.query(
          `INSERT INTO public.clan_members (clan_id, user_id, role, joined_at)
           VALUES ($1, $2, 'leader', NOW())`,
          [clan.id, userId]
        );
        return {
          id: clan.id,
          name: clan.name,
          tag: clan.tag,
          description: clan.description,
          createdBy: clan.created_by,
          points: clan.points,
          createdAt: clan.created_at.toISOString(),
          memberCount: 1
        };
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const db = readLocalDb();
    if (db.clans.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Clan name already exists');
    }
    const clan: Clan = {
      id: crypto.randomUUID(),
      name,
      tag,
      description,
      createdBy: userId,
      points: 0,
      createdAt: new Date().toISOString()
    };
    db.clans.push(clan);
    db.clanMembers.push({
      clanId: clan.id,
      userId,
      role: 'leader',
      joinedAt: new Date().toISOString()
    });
    writeLocalDb(db);
    return { ...clan, memberCount: 1 };
  },

  async joinClan(userId: string, clanId: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        // Leave other clans first
        await pool.query('DELETE FROM public.clan_members WHERE user_id = $1', [userId]);
        await pool.query(
          `INSERT INTO public.clan_members (clan_id, user_id, role, joined_at)
           VALUES ($1, $2, 'member', NOW())`,
          [clanId, userId]
         );
         return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    db.clanMembers = db.clanMembers.filter(m => m.userId !== userId);
    db.clanMembers.push({
      clanId,
      userId,
      role: 'member',
      joinedAt: new Date().toISOString()
    });
    writeLocalDb(db);
  },

  async getMyClan(userId: string): Promise<{ clan: Clan; members: ClanMember[] } | null> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const memberCheck = await pool.query('SELECT * FROM public.clan_members WHERE user_id = $1', [userId]);
        if (memberCheck.rows.length === 0) return null;
        
        const clanId = memberCheck.rows[0].clan_id;
        const clanRes = await pool.query(`
          SELECT c.*, COUNT(cm.user_id)::int as member_count 
          FROM public.clans c
          LEFT JOIN public.clan_members cm ON c.id = cm.clan_id
          WHERE c.id = $1
          GROUP BY c.id
        `, [clanId]);
        
        const membersRes = await pool.query(`
          SELECT cm.*, p.username, p.display_name, p.avatar
          FROM public.clan_members cm
          JOIN public.profiles p ON cm.user_id = p.id
          WHERE cm.clan_id = $1
        `, [clanId]);

        if (clanRes.rows.length === 0) return null;
        const clanRow = clanRes.rows[0];
        return {
          clan: {
            id: clanRow.id,
            name: clanRow.name,
            tag: clanRow.tag,
            description: clanRow.description,
            createdBy: clanRow.created_by,
            points: clanRow.points,
            createdAt: clanRow.created_at.toISOString(),
            memberCount: clanRow.member_count
          },
          members: membersRes.rows.map(m => ({
            clanId: m.clan_id,
            userId: m.user_id,
            role: m.role as any,
            joinedAt: m.joined_at.toISOString(),
            username: m.username,
            displayName: m.display_name,
            avatar: m.avatar
          }))
        };
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const m = db.clanMembers.find(member => member.userId === userId);
    if (!m) return null;
    
    const clan = db.clans.find(c => c.id === m.clanId);
    if (!clan) return null;

    const allMembers = db.clanMembers.filter(member => member.clanId === m.clanId).map(member => {
      const p = db.profiles.find(prof => prof.id === member.userId);
      return {
        ...member,
        username: p?.username,
        displayName: p?.displayName,
        avatar: p?.avatar
      };
    });

    return {
      clan: { ...clan, memberCount: allMembers.length },
      members: allMembers
    };
  },

  async leaveClan(userId: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query('DELETE FROM public.clan_members WHERE user_id = $1', [userId]);
        return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    db.clanMembers = db.clanMembers.filter(m => m.userId !== userId);
    writeLocalDb(db);
  },

  async getAllClanMembers(): Promise<Array<{ clanId: string; userId: string; role: string }>> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT clan_id, user_id, role FROM public.clan_members');
        return res.rows.map(row => ({
          clanId: row.clan_id,
          userId: row.user_id,
          role: row.role
        }));
      } catch (err) {
        console.error('PostgreSQL error in getAllClanMembers:', err);
      }
    }
    const db = readLocalDb();
    return (db.clanMembers || []).map(m => ({
      clanId: m.clanId,
      userId: m.userId,
      role: m.role
    }));
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          title: row.title,
          message: row.message,
          type: row.type as any,
          read: row.read,
          createdAt: row.created_at.toISOString()
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    return db.notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createNotification(userId: string, title: string, message: string, type: string): Promise<Notification> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `INSERT INTO public.notifications (user_id, title, message, type, read, created_at)
           VALUES ($1, $2, $3, $4, FALSE, NOW())
           RETURNING *`,
          [userId, title, message, type]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          message: row.message,
          type: row.type as any,
          read: row.read,
          createdAt: row.created_at.toISOString()
        };
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const item: Notification = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type: type as any,
      read: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(item);
    writeLocalDb(db);
    return item;
  },

  async markNotificationRead(userId: string, id: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query('UPDATE public.notifications SET read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
        return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const idx = db.notifications.findIndex(n => n.id === id && n.userId === userId);
    if (idx !== -1) {
      db.notifications[idx].read = true;
      writeLocalDb(db);
    }
  },

  async getBattles(userId: string): Promise<Battle[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(`
          SELECT b.*, 
                 p1.display_name as owner_name, p1.avatar as owner_avatar,
                 p2.display_name as opponent_name, p2.avatar as opponent_avatar
          FROM public.battles b
          JOIN public.profiles p1 ON b.owner_id = p1.id
          JOIN public.profiles p2 ON b.opponent_id = p2.id
          WHERE b.owner_id = $1 OR b.opponent_id = $1
          ORDER BY b.created_at DESC
        `, [userId]);
        return res.rows.map(row => ({
          id: row.id,
          ownerId: row.owner_id,
          opponentId: row.opponent_id,
          title: row.title,
          startTime: row.start_time.toISOString(),
          endTime: row.end_time.toISOString(),
          status: row.status as any,
          ownerScore: row.owner_score,
          opponentScore: row.opponent_score,
          winnerId: row.winner_id,
          createdAt: row.created_at.toISOString(),
          ownerName: row.owner_name,
          ownerAvatar: row.owner_avatar,
          opponentName: row.opponent_name,
          opponentAvatar: row.opponent_avatar
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    return db.battles.filter(b => b.ownerId === userId || b.opponentId === userId).map(b => {
      const o = db.profiles.find(p => p.id === b.ownerId);
      const op = db.profiles.find(p => p.id === b.opponentId);
      return {
        ...b,
        ownerName: o?.displayName,
        ownerAvatar: o?.avatar,
        opponentName: op?.displayName,
        opponentAvatar: op?.avatar
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createBattle(userId: string, opponentId: string, title: string, durationDays: number): Promise<Battle> {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + durationDays);

    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `INSERT INTO public.battles (owner_id, opponent_id, title, start_time, end_time, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           RETURNING *`,
          [userId, opponentId, title, start, end]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          ownerId: row.owner_id,
          opponentId: row.opponent_id,
          title: row.title,
          startTime: row.start_time.toISOString(),
          endTime: row.end_time.toISOString(),
          status: row.status as any,
          ownerScore: row.owner_score,
          opponentScore: row.opponent_score,
          winnerId: row.winner_id,
          createdAt: row.created_at.toISOString()
        };
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const db = readLocalDb();
    const item: Battle = {
      id: crypto.randomUUID(),
      ownerId: userId,
      opponentId,
      title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: 'pending',
      ownerScore: 0,
      opponentScore: 0,
      winnerId: null,
      createdAt: new Date().toISOString()
    };
    db.battles.push(item);
    writeLocalDb(db);
    return item;
  },

  async respondBattle(userId: string, id: string, action: 'accept' | 'decline'): Promise<void> {
    const status = action === 'accept' ? 'active' : 'declined';
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query(
          'UPDATE public.battles SET status = $1 WHERE id = $2 AND opponent_id = $3',
          [status, id, userId]
        );
        return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const idx = db.battles.findIndex(b => b.id === id && b.opponentId === userId);
    if (idx !== -1) {
      db.battles[idx].status = status as any;
      writeLocalDb(db);
    }
  },

  async getGoals(userId: string): Promise<Goal[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT * FROM public.goals WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          title: row.title,
          target: row.target,
          progress: row.progress,
          deadline: row.deadline ? row.deadline.toISOString() : null,
          completed: row.completed,
          createdAt: row.created_at.toISOString()
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    return db.goals.filter(g => g.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createGoal(userId: string, title: string, target: number, deadlineDays: number | null): Promise<Goal> {
    const deadline = deadlineDays ? new Date() : null;
    if (deadline) deadline.setDate(deadline.getDate() + deadlineDays);

    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `INSERT INTO public.goals (user_id, title, target, progress, deadline, completed, created_at)
           VALUES ($1, $2, $3, 0, $4, FALSE, NOW())
           RETURNING *`,
          [userId, title, target, deadline]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          target: row.target,
          progress: row.progress,
          deadline: row.deadline ? row.deadline.toISOString() : null,
          completed: row.completed,
          createdAt: row.created_at.toISOString()
        };
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const db = readLocalDb();
    const item: Goal = {
      id: crypto.randomUUID(),
      userId,
      title,
      target,
      progress: 0,
      deadline: deadline ? deadline.toISOString() : null,
      completed: false,
      createdAt: new Date().toISOString()
    };
    db.goals.push(item);
    writeLocalDb(db);
    return item;
  },

  async incrementGoalProgress(userId: string, id: string, amount: number): Promise<Goal> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const gRes = await pool.query('SELECT * FROM public.goals WHERE id = $1 AND user_id = $2', [id, userId]);
        if (gRes.rows.length === 0) throw new Error('Goal not found');
        const goal = gRes.rows[0];
        const newProg = Math.min(goal.target, goal.progress + amount);
        const comp = newProg >= goal.target;

        const res = await pool.query(
          `UPDATE public.goals 
           SET progress = $1, completed = $2
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [newProg, comp, id, userId]
        );
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          target: row.target,
          progress: row.progress,
          deadline: row.deadline ? row.deadline.toISOString() : null,
          completed: row.completed,
          createdAt: row.created_at.toISOString()
        };
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const db = readLocalDb();
    const idx = db.goals.findIndex(g => g.id === id && g.userId === userId);
    if (idx !== -1) {
      const goal = db.goals[idx];
      goal.progress = Math.min(goal.target, goal.progress + amount);
      goal.completed = goal.progress >= goal.target;
      writeLocalDb(db);
      return goal;
    }
    throw new Error('Goal not found');
  },

  async deleteGoal(userId: string, id: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query('DELETE FROM public.goals WHERE id = $1 AND user_id = $2', [id, userId]);
        return;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    db.goals = db.goals.filter(g => !(g.id === id && g.userId === userId));
    writeLocalDb(db);
  },

  async getSettings(userId: string): Promise<ProfileSettings> {
    const def: ProfileSettings = {
      userId,
      theme: 'dark',
      timezone: 'UTC',
      connectedPlatforms: { github: true, leetcode: true, vscode: false },
      notificationPreferences: {
        friendRequests: true,
        clanUpdates: true,
        battleInvites: true,
        streakMilestones: true
      },
      privacySettings: {
        shareLeaderboard: true,
        showSubmissions: true
      },
      appearanceSettings: {
        accentColor: 'indigo',
        reducedMotion: false
      },
      notificationsExtended: {
        soundEnabled: true,
        emailDigest: true,
        streakAlerts: true,
        goalAlerts: true
      },
      pacoSettings: {
        disableAnimations: false,
        reduceMotion: false,
        hideMascot: false,
        completelyHidden: false
      }
    };

    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query('SELECT * FROM public.profile_settings WHERE user_id = $1', [userId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            userId: row.user_id,
            theme: row.theme,
            timezone: row.timezone,
            connectedPlatforms: typeof row.connected_platforms === 'string' ? JSON.parse(row.connected_platforms) : (row.connected_platforms || def.connectedPlatforms),
            notificationPreferences: typeof row.notification_preferences === 'string' ? JSON.parse(row.notification_preferences) : (row.notification_preferences || def.notificationPreferences),
            privacySettings: typeof row.privacy_settings === 'string' ? JSON.parse(row.privacy_settings) : (row.privacy_settings || def.privacySettings),
            appearanceSettings: typeof row.appearance_settings === 'string' ? JSON.parse(row.appearance_settings) : (row.appearance_settings || def.appearanceSettings),
            notificationsExtended: typeof row.notifications_extended === 'string' ? JSON.parse(row.notifications_extended) : (row.notifications_extended || def.notificationsExtended),
            pacoSettings: typeof row.paco_settings === 'string' ? JSON.parse(row.paco_settings) : (row.paco_settings || def.pacoSettings)
          };
        } else {
          // No row found, let's insert the default row in PG
          await pool.query(
            `INSERT INTO public.profile_settings (
               user_id, theme, timezone, connected_platforms, notification_preferences,
               privacy_settings, appearance_settings, notifications_extended, paco_settings
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              userId, def.theme, def.timezone,
              JSON.stringify(def.connectedPlatforms),
              JSON.stringify(def.notificationPreferences),
              JSON.stringify(def.privacySettings),
              JSON.stringify(def.appearanceSettings),
              JSON.stringify(def.notificationsExtended),
              JSON.stringify(def.pacoSettings)
            ]
          );
          return def;
        }
      } catch (err: any) {
        console.error('PostgreSQL error in getSettings, falling back to JSON local DB:', err);
      }
    }

    // JSON Local Fallback
    const db = readLocalDb();
    const s = db.profileSettings.find(set => set.userId === userId);
    if (s) {
      return {
        ...s,
        privacySettings: s.privacySettings || def.privacySettings,
        appearanceSettings: s.appearanceSettings || def.appearanceSettings,
        notificationsExtended: s.notificationsExtended || def.notificationsExtended,
        pacoSettings: s.pacoSettings || def.pacoSettings
      };
    }

    db.profileSettings.push(def);
    writeLocalDb(db);
    return def;
  },

  async updateSettings(userId: string, updates: Partial<ProfileSettings>): Promise<ProfileSettings> {
    const current = await this.getSettings(userId);
    const next = { ...current, ...updates };

    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.profile_settings (
             user_id, theme, timezone, connected_platforms, notification_preferences,
             privacy_settings, appearance_settings, notifications_extended, paco_settings
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id) DO UPDATE 
           SET theme = EXCLUDED.theme, timezone = EXCLUDED.timezone, 
               connected_platforms = EXCLUDED.connected_platforms, 
               notification_preferences = EXCLUDED.notification_preferences,
               privacy_settings = EXCLUDED.privacy_settings,
               appearance_settings = EXCLUDED.appearance_settings,
               notifications_extended = EXCLUDED.notifications_extended,
               paco_settings = EXCLUDED.paco_settings`,
          [
            userId,
            next.theme,
            next.timezone,
            JSON.stringify(next.connectedPlatforms),
            JSON.stringify(next.notificationPreferences),
            JSON.stringify(next.privacySettings || { shareLeaderboard: true, showSubmissions: true }),
            JSON.stringify(next.appearanceSettings || { accentColor: 'indigo', reducedMotion: false }),
            JSON.stringify(next.notificationsExtended || { soundEnabled: true, emailDigest: true, streakAlerts: true, goalAlerts: true }),
            JSON.stringify(next.pacoSettings || { disableAnimations: false, reduceMotion: false, hideMascot: false, completelyHidden: false })
          ]
        );
        return next;
      } catch (err) {
        console.error(err);
      }
    }
    const db = readLocalDb();
    const idx = db.profileSettings.findIndex(s => s.userId === userId);
    if (idx !== -1) {
      db.profileSettings[idx] = next;
    } else {
      db.profileSettings.push(next);
    }
    writeLocalDb(db);
    return next;
  },

  async createLocalAuth(userId: string, username: string, passwordHash: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.profiles_auth (id, username, password_hash)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
          [userId, username.toLowerCase().trim(), passwordHash]
        );
        return;
      } catch (err) {
        console.error('PostgreSQL error in createLocalAuth, falling back:', err);
      }
    }

    const db = readLocalDb();
    if (!db.profilesAuth) {
      db.profilesAuth = [];
    }
    db.profilesAuth = db.profilesAuth.filter(a => a.id !== userId && a.username !== username.toLowerCase().trim());
    db.profilesAuth.push({ id: userId, username: username.toLowerCase().trim(), passwordHash });
    writeLocalDb(db);
  },

  async getLocalAuth(username: string): Promise<{ id: string; username: string; passwordHash: string } | null> {
    const normalized = username.toLowerCase().trim();
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT id, username, password_hash as "passwordHash" FROM public.profiles_auth WHERE username = $1`,
          [normalized]
        );
        if (res.rows.length > 0) {
          return res.rows[0];
        }
        return null;
      } catch (err) {
        console.error('PostgreSQL error in getLocalAuth, falling back:', err);
      }
    }

    const db = readLocalDb();
    if (!db.profilesAuth) {
      db.profilesAuth = [];
    }
    const found = db.profilesAuth.find(a => a.username === normalized);
    return found || null;
  },

  async createLocalSession(token: string, userId: string): Promise<void> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        await pool.query(
          `INSERT INTO public.profiles_sessions (token, user_id)
           VALUES ($1, $2)
           ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id`,
          [token, userId]
        );
        return;
      } catch (err) {
        console.error('PostgreSQL error in createLocalSession, falling back:', err);
      }
    }

    const db = readLocalDb();
    if (!db.profilesSessions) {
      db.profilesSessions = [];
    }
    db.profilesSessions = db.profilesSessions.filter(s => s.token !== token);
    db.profilesSessions.push({ token, userId });
    writeLocalDb(db);
  },

  async getUserIdFromLocalSession(token: string): Promise<string | null> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT user_id as "userId" FROM public.profiles_sessions WHERE token = $1`,
          [token]
        );
        if (res.rows.length > 0) {
          return res.rows[0].userId;
        }
        return null;
      } catch (err) {
        console.error('PostgreSQL error in getUserIdFromLocalSession, falling back:', err);
      }
    }

    const db = readLocalDb();
    if (!db.profilesSessions) {
      db.profilesSessions = [];
    }
    const found = db.profilesSessions.find(s => s.token === token);
    return found ? found.userId : null;
  },

  async generateUserProfileAnalysisReport(userId: string): Promise<{ analysis: UserProfileAnalysisReport; profile: UserProfile }> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Profile not found');

    const logs = await this.getUserLogs(userId);
    const connectedAccounts = await this.getConnectedAccounts(userId);
    const resources = await this.getResources(userId);
    const goals = await this.getGoals(userId);

    // Call Gemini (or fallback) to do deep analysis
    const analysis = await analyzeUserProfile(userId, profile, logs, connectedAccounts, resources, goals);

    const pointsAwarded = analysis.recommendedPoints || 0;
    const createdAt = new Date();

    if (isPgEnabled) {
      try {
        const pool = getPool();
        // 1. Insert into ai_analysis_reports
        await pool.query(
          `INSERT INTO public.ai_analysis_reports (user_id, type, analysis, created_at)
           VALUES ($1, $2, $3, $4)`,
          [userId, 'profile_deep', JSON.stringify(analysis), createdAt]
        );

        if (pointsAwarded > 0) {
          // 2. Award points via a learning event or transaction so it shows in logs
          const eventId = crypto.randomUUID();
          const content = `AI Profile Audit: ${analysis.explanation.substring(0, 200)}...`;
          
          const breakdown = [{
            label: 'AI Profile Growth Bonus',
            value: pointsAwarded,
            explanation: `AI-Assisted PACE profile audit recommended points based on balanced progress across: academic (${analysis.academicProgress}%), consistency (${analysis.consistency}%), coding growth (${analysis.codingGrowth}%), project impact (${analysis.projectImpact}%), and GitHub quality (${analysis.githubQuality}%).`
          }];

          await pool.query(
            `INSERT INTO public.learning_events (id, user_id, content, points, analysis, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [eventId, userId, content, pointsAwarded, JSON.stringify({
              subject: 'AI Audit',
              topic: 'Profile Analysis',
              platform: 'AI OS',
              resource: 'Gemini Agent',
              duration: 0,
              problemsSolved: 0,
              difficulty: 'unspecified',
              tags: ['ai-analysis', 'audit', 'bonus'],
              urls: [],
              isRevision: false,
              verification: 'verified',
              reason: 'AI deep profile audit completed',
              pointsBreakdown: breakdown
            }), createdAt]
          );

          // 3. Update profile points, xp, levels
          const newPoints = (profile.points || 0) + pointsAwarded;
          const newWeeklyPoints = (profile.weeklyScore || profile.weeklyPoints || 0) + pointsAwarded;
          const newLevel = Math.floor(newPoints / 500) + 1;
          const newXp = (profile.xp || 0) + pointsAwarded;
          
          await pool.query(
            `UPDATE public.profiles 
             SET points = $1, level = $2, weekly_points = $3, weekly_score = $3, xp = $4
             WHERE id = $5`,
            [newPoints, newLevel, newWeeklyPoints, newXp, userId]
          );
        }

        const updatedProfile = await this.getProfile(userId);
        return { analysis, profile: updatedProfile! };
      } catch (err) {
        console.error('PostgreSQL error in generateUserProfileAnalysisReport, falling back:', err);
      }
    }

    // Local JSON DB fallback
    const ldb = readLocalDb();
    const pIdx = ldb.profiles.findIndex(p => p.id === userId);
    if (pIdx === -1) throw new Error('Profile not found');

    const localProfile = ldb.profiles[pIdx];

    if (!ldb.aiAnalysisReports) {
      ldb.aiAnalysisReports = [];
    }

    ldb.aiAnalysisReports.push({
      id: crypto.randomUUID(),
      userId,
      type: 'profile_deep',
      analysis,
      createdAt: createdAt.toISOString()
    });

    if (pointsAwarded > 0) {
      const eventId = crypto.randomUUID();
      const content = `AI Profile Audit: ${analysis.explanation.substring(0, 200)}...`;
      const breakdown = [{
        label: 'AI Profile Growth Bonus',
        value: pointsAwarded,
        explanation: `AI-Assisted PACE profile audit recommended points based on balanced progress across: academic (${analysis.academicProgress}%), consistency (${analysis.consistency}%), coding growth (${analysis.codingGrowth}%), project impact (${analysis.projectImpact}%), and GitHub quality (${analysis.githubQuality}%).`
      }];

      ldb.learningEvents.push({
        id: eventId,
        userId,
        username: localProfile.username,
        displayName: localProfile.displayName,
        avatar: localProfile.avatar,
        content,
        createdAt: createdAt.toISOString(),
        points: pointsAwarded,
        analysis: {
          subject: 'AI Audit',
          topic: 'Profile Analysis',
          platform: 'AI OS',
          resource: 'Gemini Agent',
          duration: 0,
          problemsSolved: 0,
          difficulty: 'unspecified',
          tags: ['ai-analysis', 'audit', 'bonus'],
          urls: [],
          isRevision: false,
          verification: 'verified',
          reason: 'AI deep profile audit completed',
          pointsBreakdown: breakdown
        } as any
      });

      const newPoints = (localProfile.points || 0) + pointsAwarded;
      const newWeeklyPoints = (localProfile.weeklyScore || localProfile.weeklyPoints || 0) + pointsAwarded;
      const newLevel = Math.floor(newPoints / 500) + 1;
      const newXp = (localProfile.xp || 0) + pointsAwarded;

      ldb.profiles[pIdx] = {
        ...localProfile,
        points: newPoints,
        level: newLevel,
        weeklyPoints: newWeeklyPoints,
        weeklyScore: newWeeklyPoints,
        xp: newXp
      };
    }

    writeLocalDb(ldb);
    return { analysis, profile: ldb.profiles[pIdx] };
  },

  async getUserProfileAnalysisReports(userId: string): Promise<any[]> {
    if (isPgEnabled) {
      try {
        const pool = getPool();
        const res = await pool.query(
          `SELECT id, user_id as "userId", type, analysis, created_at as "createdAt"
           FROM public.ai_analysis_reports
           WHERE user_id = $1 AND type = 'profile_deep'
           ORDER BY created_at DESC`,
          [userId]
        );
        return res.rows;
      } catch (err) {
        console.error('PostgreSQL error fetching ai analysis reports, falling back:', err);
      }
    }

    const dbObj = readLocalDb();
    if (!dbObj.aiAnalysisReports) return [];
    return dbObj.aiAnalysisReports
      .filter(r => r.userId === userId && r.type === 'profile_deep')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};
