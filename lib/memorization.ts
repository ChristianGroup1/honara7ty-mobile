import supabase from './supbase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemorizationResult } from '../components/bible-memorization/types';
import { BIBLE_BOOKS } from '../components/data/bibleMetadata';
import { isNetworkAvailable } from './networkStatus';

const MEMORIZATION_LOGS_KEY = (userId: string) =>
  `offline_memorization_logs:${userId}`;
const MEMORIZATION_GOAL_KEY = (userId: string) =>
  `offline_memorization_goal:${userId}`;
const OFFLINE_QUEUE_KEY = 'offline_sync_queue_v1';

export type MemorizationGoalPeriod = 'week' | 'month';

export interface MemorizationGoal {
  period: MemorizationGoalPeriod;
  target: number;
}

export interface MemorizationDifficultyStat {
  difficulty: string;
  attempts: number;
  averageScore: number;
}

export interface MemorizationStats {
  totalVerses: number;
  totalAttempts: number;
  averageScore: number;
  thisWeekCount: number;
  thisMonthCount: number;
  currentPeriodCount: number;
  goal: number;
  goalPeriod: MemorizationGoalPeriod;
  currentStreak: number;
  bestScore: number;
  perfectAttempts: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  difficultyBreakdown: MemorizationDifficultyStat[];
  history: MemorizationResult[];
}

const defaultGoal: MemorizationGoal = {
  period: 'month',
  target: 0,
};

const emptyStats = (): MemorizationStats => ({
  totalVerses: 0,
  totalAttempts: 0,
  averageScore: 0,
  thisWeekCount: 0,
  thisMonthCount: 0,
  currentPeriodCount: 0,
  goal: 0,
  goalPeriod: defaultGoal.period,
  currentStreak: 0,
  bestScore: 0,
  perfectAttempts: 0,
  totalTimeSeconds: 0,
  averageTimeSeconds: 0,
  difficultyBreakdown: [],
  history: [],
});

const normalizeGoal = (value: unknown): MemorizationGoal => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { period: 'week', target: value };
  }

  if (typeof value === 'string') {
    try {
      return normalizeGoal(JSON.parse(value));
    } catch {
      const target = parseInt(value, 10);
      return Number.isFinite(target) ? { period: 'week', target } : defaultGoal;
    }
  }

  if (value && typeof value === 'object') {
    const next = value as Partial<MemorizationGoal>;
    return {
      period: next.period === 'month' ? 'month' : 'week',
      target:
        typeof next.target === 'number' && Number.isFinite(next.target)
          ? next.target
          : 0,
    };
  }

  return defaultGoal;
};

const getLogDate = (log: any) =>
  new Date(log.created_at || log.createdAt || Date.now());

const getVerseCount = (log: any) =>
  Array.isArray(log.verses)
    ? log.verses.length
    : Array.isArray(log.selectedVerses)
    ? log.selectedVerses.length
    : 0;

const getCorrectVerseCount = (log: any) =>
  log.total > 0 && log.score === log.total ? getVerseCount(log) : 0;

const getScorePercent = (log: any) =>
  log.total > 0 ? Math.round((log.score / log.total) * 100) : 0;

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const getLogBookId = (log: any) =>
  log.book_id || log.selectedBook?.bookID?.toString() || '';

const getLogChapter = (log: any) => log.chapter || log.selectedChapter;

const getLogVerses = (log: any) =>
  Array.isArray(log.verses) ? log.verses : log.selectedVerses || [];

const sameVerseList = (left: any[], right: any[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const isSameMemorizationLog = (left: any, right: any) => {
  if (left.id && right.id) {
    return left.id === right.id;
  }

  if (left.local_id && right.local_id) {
    return left.local_id === right.local_id;
  }

  return (
    left.created_at === right.created_at &&
    getLogBookId(left) === getLogBookId(right) &&
    getLogChapter(left) === getLogChapter(right) &&
    left.score === right.score &&
    left.total === right.total &&
    sameVerseList(getLogVerses(left), getLogVerses(right))
  );
};

export const saveMemorizationAttempt = async (result: MemorizationResult) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Save to local cache first
  const cacheKey = MEMORIZATION_LOGS_KEY(user.id);
  const existing = await AsyncStorage.getItem(cacheKey);
  const logs = existing ? JSON.parse(existing) : [];
  const savedLog = {
    ...result,
    local_id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  logs.unshift(savedLog);
  await AsyncStorage.setItem(cacheKey, JSON.stringify(logs.slice(0, 100))); // Keep last 100

  // 2. Try to sync to Supabase
  if (await isNetworkAvailable()) {
    const { data, error } = await supabase
      .from('memorization_log')
      .insert({
        user_id: user.id,
        book_id: result.selectedBook.bookID.toString(),
        chapter: result.selectedChapter,
        verses: result.selectedVerses,
        score: result.score,
        total: result.total,
        time_seconds: result.timeSeconds || 0,
        difficulty: result.difficulty,
      })
      .select('id')
      .single();

    if (!error) {
      if (data?.id) {
        const currentCache = await AsyncStorage.getItem(cacheKey);
        const currentLogs = currentCache ? JSON.parse(currentCache) : [];
        const logsWithRemoteId = currentLogs.map((log: any) =>
          log.local_id === savedLog.local_id ? { ...log, id: data.id } : log,
        );
        await AsyncStorage.setItem(cacheKey, JSON.stringify(logsWithRemoteId));
      }
      return true;
    }
  }

  // 3. If offline or error, add to sync queue
  const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue = queueJson ? JSON.parse(queueJson) : [];
  queue.push({
    id: `local-${Date.now()}`,
    kind: 'memorization-log-upsert',
    userId: user.id,
    payload: savedLog,
  });
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

  return true;
};

export const getMemorizationStats = async (): Promise<MemorizationStats> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return emptyStats();
  }

  // 1. Get Goal (Try local first, then remote)
  let goal = defaultGoal;
  const localGoal = await AsyncStorage.getItem(MEMORIZATION_GOAL_KEY(user.id));
  if (localGoal) {
    goal = normalizeGoal(localGoal);
  } else {
    const { data: goalData } = await supabase
      .from('memorization_goals')
      .select('target_per_week')
      .eq('user_id', user.id)
      .single();
    if (goalData) {
      goal = normalizeGoal(goalData.target_per_week);
      await AsyncStorage.setItem(
        MEMORIZATION_GOAL_KEY(user.id),
        JSON.stringify(goal),
      );
    }
  }

  // 2. Get Logs (Try local first, then merge with remote if online)
  const localLogsStr = await AsyncStorage.getItem(
    MEMORIZATION_LOGS_KEY(user.id),
  );
  let allLogs: any[] = localLogsStr ? JSON.parse(localLogsStr) : [];

  if ((await isNetworkAvailable()) && allLogs.length < 10) {
    // If cache is empty or small, fetch from remote
    const { data: remoteLogs } = await supabase
      .from('memorization_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (remoteLogs) {
      // Map remote logs to include labels for display
      const enrichedLogs = remoteLogs.map(log => {
        const book = BIBLE_BOOKS.find(b => b.bookID.toString() === log.book_id);
        return {
          ...log,
          bookLabel: book?.bookName || log.book_id,
          chapterLabel: `${log.chapter}`, // Simple label for now
          // Convert snake_case to camelCase for consistency with MemorizationResult if needed
          timeSeconds: log.time_seconds,
        };
      });
      allLogs = enrichedLogs;
      await AsyncStorage.setItem(
        MEMORIZATION_LOGS_KEY(user.id),
        JSON.stringify(enrichedLogs),
      );
    }
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeekLogs = allLogs.filter(log => getLogDate(log) >= startOfWeek);
  const thisMonthLogs = allLogs.filter(log => getLogDate(log) >= startOfMonth);

  const thisWeekCount = thisWeekLogs.reduce(
    (acc, log) => acc + getCorrectVerseCount(log),
    0,
  );
  const thisMonthCount = thisMonthLogs.reduce(
    (acc, log) => acc + getCorrectVerseCount(log),
    0,
  );
  const totalVerses = allLogs.reduce(
    (acc, log) => acc + getCorrectVerseCount(log),
    0,
  );
  const averageScore =
    allLogs.length > 0
      ? allLogs.reduce(
          (acc, log) => acc + (log.total > 0 ? log.score / log.total : 0),
          0,
        ) / allLogs.length
      : 0;
  const totalTimeSeconds = allLogs.reduce(
    (acc, log) => acc + (log.timeSeconds || log.time_seconds || 0),
    0,
  );
  const bestScore = allLogs.reduce(
    (best, log) => Math.max(best, getScorePercent(log)),
    0,
  );
  const perfectAttempts = allLogs.filter(
    log => log.total > 0 && log.score === log.total,
  ).length;
  const activeDayKeys = new Set(
    allLogs
      .filter(log => getCorrectVerseCount(log) > 0)
      .map(log => dayKey(getLogDate(log))),
  );
  let currentStreak = 0;
  const streakCursor = new Date();
  streakCursor.setHours(0, 0, 0, 0);
  while (activeDayKeys.has(dayKey(streakCursor))) {
    currentStreak += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  const difficultyBreakdown = Object.values(
    allLogs.reduce<
      Record<string, { difficulty: string; attempts: number; scoreSum: number }>
    >((acc, log) => {
      const difficulty = log.difficulty || 'medium';
      const existing = acc[difficulty] || {
        difficulty,
        attempts: 0,
        scoreSum: 0,
      };
      existing.attempts += 1;
      existing.scoreSum += getScorePercent(log);
      acc[difficulty] = existing;
      return acc;
    }, {}),
  ).map(item => ({
    difficulty: item.difficulty,
    attempts: item.attempts,
    averageScore:
      item.attempts > 0 ? Math.round(item.scoreSum / item.attempts) : 0,
  }));

  return {
    totalVerses,
    totalAttempts: allLogs.length,
    averageScore: Math.round(averageScore * 100),
    thisWeekCount,
    thisMonthCount,
    currentPeriodCount:
      goal.period === 'month' ? thisMonthCount : thisWeekCount,
    goal: goal.target,
    goalPeriod: goal.period,
    currentStreak,
    bestScore,
    perfectAttempts,
    totalTimeSeconds,
    averageTimeSeconds:
      allLogs.length > 0 ? Math.round(totalTimeSeconds / allLogs.length) : 0,
    difficultyBreakdown,
    history: allLogs,
  };
};

export const updateMemorizationGoal = async (
  nextGoalInput: number | MemorizationGoal,
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const nextGoal = normalizeGoal(nextGoalInput);

  // Save locally first
  await AsyncStorage.setItem(
    MEMORIZATION_GOAL_KEY(user.id),
    JSON.stringify(nextGoal),
  );

  if (await isNetworkAvailable()) {
    const { error } = await supabase.from('memorization_goals').upsert({
      user_id: user.id,
      target_per_week: nextGoal.target,
      updated_at: new Date().toISOString(),
    });
    if (!error) return true;
  }

  // Add to queue
  const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue = queueJson ? JSON.parse(queueJson) : [];
  queue.push({
    id: `local-${Date.now()}`,
    kind: 'memorization-goal-upsert',
    userId: user.id,
    target: nextGoal.target,
  });
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

  return true;
};

export const deleteMemorizationAttempt = async (targetLog: any) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const cacheKey = MEMORIZATION_LOGS_KEY(user.id);
  const existing = await AsyncStorage.getItem(cacheKey);
  const logs = existing ? JSON.parse(existing) : [];
  const nextLogs = logs.filter(
    (log: any) => !isSameMemorizationLog(log, targetLog),
  );
  await AsyncStorage.setItem(cacheKey, JSON.stringify(nextLogs));

  if (targetLog.id) {
    if (await isNetworkAvailable()) {
      await supabase
        .from('memorization_log')
        .delete()
        .eq('user_id', user.id)
        .eq('id', targetLog.id);
    }
  }

  const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (queueJson) {
    const queue = JSON.parse(queueJson);
    const nextQueue = queue.filter(
      (mutation: any) =>
        mutation.kind !== 'memorization-log-upsert' ||
        !isSameMemorizationLog(mutation.payload, targetLog),
    );
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  }

  return true;
};
