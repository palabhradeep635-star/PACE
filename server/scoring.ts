import { UserProfile, LearningEvent, Goal, Clan, Battle, ConnectedAccount } from '../src/types';

export interface ScoreBreakdown {
  userId: string;
  overallScore: number;
  components: {
    consistency: number;
    codingPerformance: number;
    academicProgress: number;
    learningQuality: number;
    goalCompletion: number;
    collaboration: number;
    improvementTrend: number;
  };
  dynamicElo: number;
  paceRating: number;
  leaderboardScore: number;
  level: number;
  xp: number;
  weeklyXp: number;
  monthlyXp: number;
  recentHistory: Array<{
    id: string;
    action: string;
    points: number;
    timestamp: string;
    type: 'award' | 'deduction';
  }>;
  contributionSources: Array<{ source: string; points: number; percentage: number }>;
  riskScore: number;
  antiCheatStatus: 'verified' | 'suspicious' | 'flagged';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number; // 0 to 100
  target: string;
  icon: string;
}

// Deterministic anti-cheat analysis for learning events
export function analyzeAntiCheat(events: LearningEvent[]): { riskScore: number; status: 'verified' | 'suspicious' | 'flagged'; cleanEvents: LearningEvent[] } {
  let riskScore = 0;
  const contentSet = new Set<string>();
  const urlSet = new Set<string>();
  const timeThresholdMs = 2 * 60 * 1000; // 2 minutes
  let lastTime = 0;

  const cleanEvents: LearningEvent[] = [];

  // Sort events oldest first to check sequence
  const sortedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const ev of sortedEvents) {
    let evRisk = 0;
    const content = ev.content.trim().toLowerCase();
    const evTime = new Date(ev.createdAt).getTime();

    // Check duplicate content
    if (contentSet.has(content) && content.length > 5) {
      evRisk += 35;
    }
    contentSet.add(content);

    // Check repeated URLs in evidence
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    for (const url of urls) {
      if (urlSet.has(url)) {
        evRisk += 25;
      }
      urlSet.add(url);
    }

    // Check for impossible activity rate (logs within 2 minutes of each other)
    if (lastTime > 0 && evTime - lastTime < timeThresholdMs) {
      evRisk += 40;
    }
    lastTime = evTime;

    // Check impossible study duration in analysis
    if (ev.analysis) {
      const parsed = typeof ev.analysis === 'string' ? JSON.parse(ev.analysis) : ev.analysis;
      if (parsed.duration > 360) { // More than 6 hours in a single log
        evRisk += 30;
      }
    }

    if (evRisk >= 70) {
      riskScore += evRisk;
    } else {
      cleanEvents.push(ev);
    }
  }

  // Cap absolute risk score at 100
  const finalRisk = Math.min(100, Math.round(riskScore));
  let status: 'verified' | 'suspicious' | 'flagged' = 'verified';
  if (finalRisk >= 75) {
    status = 'flagged';
  } else if (finalRisk >= 40) {
    status = 'suspicious';
  }

  return { riskScore: finalRisk, status, cleanEvents };
}

// Deterministic PACE Components Calculation
export function calculatePaceScore(
  profile: UserProfile,
  events: LearningEvent[],
  goals: Goal[],
  friendsCount: number,
  inClan: boolean,
  battles: Battle[],
  platforms: ConnectedAccount[]
): ScoreBreakdown {
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Consistency (25%) - active days in last 30 days & streak
  const activeDaysLast30 = new Set<string>();
  events.forEach(ev => {
    const d = ev.createdAt.split('T')[0];
    if (new Date(ev.createdAt) >= thirtyDaysAgo) {
      activeDaysLast30.add(d);
    }
  });
  const activeDaysCount = activeDaysLast30.size;
  const streakBonus = (profile.streak || 0) * 2;
  const consistencyScore = Math.min(100, Math.round((activeDaysCount / 15) * 80 + streakBonus));

  // 2. Coding Performance (20%) - solved problems & syncs
  let totalSolved = profile.totalProblemsSolved || 0;
  platforms.forEach(p => {
    if (p.stats && p.stats.solvedQuestions) {
      totalSolved = Math.max(totalSolved, p.stats.solvedQuestions);
    }
  });
  const codingScore = Math.min(100, Math.round((totalSolved / 50) * 100));

  // 3. Academic Progress (20%) - study duration in minutes in last 30 days
  let studyMinutes = 0;
  events.forEach(ev => {
    if (new Date(ev.createdAt) >= thirtyDaysAgo) {
      const parsed = typeof ev.analysis === 'string' ? JSON.parse(ev.analysis) : ev.analysis;
      studyMinutes += parsed?.duration || 30;
    }
  });
  const academicScore = Math.min(100, Math.round((studyMinutes / 600) * 100)); // 10 hours target

  // 4. Learning Quality (15%) - based on server-awarded points per event (higher for medium/hard)
  const recentEvents = events.filter(ev => new Date(ev.createdAt) >= thirtyDaysAgo);
  const avgPoints = recentEvents.length > 0 
    ? recentEvents.reduce((acc, curr) => acc + (curr.points || 0), 0) / recentEvents.length 
    : 10;
  const qualityScore = Math.min(100, Math.round((avgPoints / 20) * 100));

  // 5. Goal Completion (10%) - goals completed
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.completed).length;
  const goalScore = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 50;

  // 6. Collaboration (5%) - friends, clans, battles
  const collabPoints = (friendsCount * 12) + (inClan ? 40 : 0) + (battles.length * 15);
  const collaborationScore = Math.min(100, collabPoints);

  // 7. Improvement Trend (5%) - points this week vs last week
  const pointsThisWeek = events
    .filter(ev => new Date(ev.createdAt) >= sevenDaysAgo)
    .reduce((acc, curr) => acc + (curr.points || 0), 0);
  const pointsPrevWeek = events
    .filter(ev => {
      const d = new Date(ev.createdAt);
      return d < sevenDaysAgo && d >= new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    })
    .reduce((acc, curr) => acc + (curr.points || 0), 0);
  
  const trendScore = pointsPrevWeek === 0 
    ? (pointsThisWeek > 0 ? 85 : 50)
    : Math.min(100, Math.round((pointsThisWeek / pointsPrevWeek) * 75));

  // Overall PACE Score
  const overallScore = Math.round(
    0.25 * consistencyScore +
    0.20 * codingScore +
    0.20 * academicScore +
    0.15 * qualityScore +
    0.10 * goalScore +
    0.05 * collaborationScore +
    0.05 * trendScore
  );

  // Dynamic Elo / PACE Rating calculation
  // Base Rating starts at 1200. Earn Elo based on problem difficulties, platform contest ratings, battle performance, streak.
  let baseElo = 1200;
  
  // Count solved problems by difficulty from event analysis
  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;

  events.forEach(ev => {
    const parsed = typeof ev.analysis === 'string' ? JSON.parse(ev.analysis) : ev.analysis;
    if (parsed?.difficulty === 'easy') easyCount++;
    else if (parsed?.difficulty === 'medium') mediumCount++;
    else if (parsed?.difficulty === 'hard') hardCount++;
  });

  const problemElo = (easyCount * 3) + (mediumCount * 8) + (hardCount * 20) + Math.max(0, (totalSolved - easyCount - mediumCount - hardCount) * 4);

  // Platform ratings influences
  let externalRatingBonus = 0;
  platforms.forEach(p => {
    if (p.platform === 'codeforces' && p.stats?.rating) {
      externalRatingBonus += Math.round((p.stats.rating - 1000) * 0.4);
    }
    if (p.platform === 'leetcode' && p.stats?.contestRating) {
      externalRatingBonus += Math.round((p.stats.contestRating - 1500) * 0.3);
    }
  });

  // Battle ELO
  let battleElo = 0;
  battles.forEach(b => {
    if (b.status === 'completed') {
      if (b.winnerId === profile.id) {
        battleElo += 25;
      } else if (b.winnerId) {
        battleElo -= 12;
      }
    }
  });

  // Active streak bonus
  const streakElo = Math.min(150, (profile.streak || 0) * 6);
  const paceRating = Math.max(800, baseElo + problemElo + battleElo + streakElo + externalRatingBonus);
  const dynamicElo = paceRating;

  // Weekly and Monthly XP
  const weeklyXp = events
    .filter(ev => new Date(ev.createdAt) >= sevenDaysAgo)
    .reduce((sum, ev) => sum + (ev.points || 0), 0);
  
  const monthlyXp = events
    .filter(ev => new Date(ev.createdAt) >= thirtyDaysAgo)
    .reduce((sum, ev) => sum + (ev.points || 0), 0);

  // Anti-Cheat Analysis
  const { riskScore, status } = analyzeAntiCheat(events);

  // Calculate Leaderboard Score
  const leaderboardScore = calculateRankScore(profile, weeklyXp, riskScore, paceRating);

  // Contributions breakdown
  let studyPoints = 0;
  let codePoints = 0;
  let goalPoints = 0;
  let battlePoints = 0;

  events.forEach(ev => {
    const pts = ev.points || 0;
    if (ev.content.toLowerCase().includes('solve') || ev.content.toLowerCase().includes('code') || ev.content.toLowerCase().includes('leetcode') || ev.content.toLowerCase().includes('codeforces')) {
      codePoints += pts;
    } else {
      studyPoints += pts;
    }
  });

  goals.forEach(g => {
    if (g.completed) goalPoints += 20;
  });

  battles.forEach(b => {
    if (b.status === 'completed' && b.winnerId === profile.id) {
      battlePoints += 50;
    }
  });

  const grandTotal = studyPoints + codePoints + goalPoints + battlePoints || 1;
  const contributionSources = [
    { source: 'Academic Study Logs', points: studyPoints, percentage: Math.round((studyPoints / grandTotal) * 100) },
    { source: 'Coding Achievements', points: codePoints, percentage: Math.round((codePoints / grandTotal) * 100) },
    { source: 'Goal Completions', points: goalPoints, percentage: Math.round((goalPoints / grandTotal) * 100) },
    { source: 'Battle Duels Won', points: battlePoints, percentage: Math.round((battlePoints / grandTotal) * 100) },
  ];

  // Point history trace
  const recentHistory = events.slice(-8).reverse().map(ev => ({
    id: ev.id,
    action: ev.content,
    points: ev.points || 10,
    timestamp: ev.createdAt,
    type: 'award' as const,
  }));

  return {
    userId: profile.id,
    overallScore: Math.max(5, overallScore),
    components: {
      consistency: Math.max(5, consistencyScore),
      codingPerformance: Math.max(5, codingScore),
      academicProgress: Math.max(5, academicScore),
      learningQuality: Math.max(5, qualityScore),
      goalCompletion: Math.max(5, goalScore),
      collaboration: Math.max(5, collaborationScore),
      improvementTrend: Math.max(5, trendScore),
    },
    dynamicElo,
    paceRating,
    leaderboardScore,
    level: profile.level || 1,
    xp: profile.xp || 0,
    weeklyXp,
    monthlyXp,
    recentHistory,
    contributionSources,
    riskScore,
    antiCheatStatus: status,
  };
}

// Calculate Multiplayer Rank Score based on requested formula
export function calculateRankScore(profile: UserProfile, weeklyXp: number, riskScore: number, paceRating: number = 1200): number {
  // Formula: Leaderboard Score = Lifetime XP + Recent Activity Weight (weeklyXp * 1.5) + Consistency Bonus (Streak * 25) + PACE Rating Bonus ((paceRating - 1000) * 0.2) - Penalty (Risk * 2)
  const lifetimeXp = profile.xp || 0;
  const recentWeight = Math.round(weeklyXp * 1.5);
  const consistencyBonus = (profile.streak || 0) * 25;
  const ratingBonus = Math.max(0, Math.round((paceRating - 1000) * 0.2));
  const penalty = riskScore * 2;
  return Math.max(0, lifetimeXp + recentWeight + consistencyBonus + ratingBonus - penalty);
}

// Generate Achievements/Badges
export function evaluateAchievements(profile: UserProfile, events: LearningEvent[], goals: Goal[], platforms: ConnectedAccount[]): Achievement[] {
  const achievementsList: Array<{ id: string; title: string; description: string; targetValue: number; icon: string }> = [
    { id: '100_problems', title: 'LeetCode Centurion', description: 'Solve 100 or more coding problems across integrated platforms.', targetValue: 100, icon: '🏆' },
    { id: '7_streak', title: 'Consistency Pioneer', description: 'Maintain an active study streak of 7 consecutive days.', targetValue: 7, icon: '🔥' },
    { id: '30_streak', title: 'Unstoppable Mind', description: 'Maintain an active study streak of 30 consecutive days.', targetValue: 30, icon: '⚡' },
    { id: 'github_contrib', title: 'Open Source Knight', description: 'Connect GitHub and push verified learning repositories.', targetValue: 5, icon: '🐙' },
    { id: 'researcher', title: 'Deep Work Scholar', description: 'Complete a study session lasting 3 hours (180 mins) or more.', targetValue: 180, icon: '📚' },
    { id: 'clan_champion', title: 'Clan Vanguard', description: 'Contribute points towards your clan’s total rankings.', targetValue: 1, icon: '🛡️' },
    { id: 'night_owl', title: 'Midnight Scholar', description: 'Log study activity between 12 AM and 4 AM.', targetValue: 1, icon: '🦉' },
    { id: 'morning_warrior', title: 'Dawn Strider', description: 'Log study activity between 5 AM and 8 AM.', targetValue: 1, icon: '🌅' },
  ];

  const results: Achievement[] = [];

  // Problem counts
  let totalSolved = profile.totalProblemsSolved || 0;
  platforms.forEach(p => {
    if (p.stats && p.stats.solvedQuestions) {
      totalSolved = Math.max(totalSolved, p.stats.solvedQuestions);
    }
  });

  // Longest study session
  let maxDuration = 0;
  events.forEach(ev => {
    const parsed = typeof ev.analysis === 'string' ? JSON.parse(ev.analysis) : ev.analysis;
    const dur = parsed?.duration || 0;
    maxDuration = Math.max(maxDuration, dur);
  });

  // Timestamps check
  let nightOwlCount = 0;
  let morningWarriorCount = 0;
  events.forEach(ev => {
    const date = new Date(ev.createdAt);
    const hour = date.getUTCHours(); // Assuming UTC/Standard
    if (hour >= 0 && hour <= 4) {
      nightOwlCount++;
    }
    if (hour >= 5 && hour <= 8) {
      morningWarriorCount++;
    }
  });

  achievementsList.forEach(ach => {
    let currentProgress = 0;
    let unlocked = false;

    if (ach.id === '100_problems') {
      currentProgress = Math.min(100, Math.round((totalSolved / ach.targetValue) * 100));
      unlocked = totalSolved >= ach.targetValue;
    } else if (ach.id === '7_streak') {
      const streak = profile.streak || 0;
      currentProgress = Math.min(100, Math.round((streak / ach.targetValue) * 100));
      unlocked = streak >= ach.targetValue;
    } else if (ach.id === '30_streak') {
      const longest = profile.longestStreak || profile.streak || 0;
      currentProgress = Math.min(100, Math.round((longest / ach.targetValue) * 100));
      unlocked = longest >= ach.targetValue;
    } else if (ach.id === 'github_contrib') {
      const githubConnected = platforms.some(p => p.platform === 'github');
      currentProgress = githubConnected ? 100 : 0;
      unlocked = githubConnected;
    } else if (ach.id === 'researcher') {
      currentProgress = Math.min(100, Math.round((maxDuration / ach.targetValue) * 100));
      unlocked = maxDuration >= ach.targetValue;
    } else if (ach.id === 'clan_champion') {
      const inClan = profile.points && profile.points > 0; // Check if they have active points contributing
      currentProgress = inClan ? 100 : 0;
      unlocked = !!inClan;
    } else if (ach.id === 'night_owl') {
      currentProgress = nightOwlCount > 0 ? 100 : 0;
      unlocked = nightOwlCount > 0;
    } else if (ach.id === 'morning_warrior') {
      currentProgress = morningWarriorCount > 0 ? 100 : 0;
      unlocked = morningWarriorCount > 0;
    }

    results.push({
      id: ach.id,
      title: ach.title,
      description: ach.description,
      unlocked,
      progress: currentProgress,
      target: String(ach.targetValue),
      icon: ach.icon,
    });
  });

  return results;
}
