export const DAYS_PER_LEVEL = 7;
export const DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export type DevotionLogRow = {
  user_id: string;
  date: string;
  completed: boolean;
};

export type ReadingLogRow = {
  user_id: string;
  date: string;
  reading_book?: string | null;
  reading_chapter?: number | null;
  chapters_read?: number | null;
  selected_chapters?: number[] | null;
  reading_entries?: Array<{
    reading_book?: string;
    selected_chapters?: number[];
  }> | null;
};

export type DirectoryUser = {
  id: string;
  created_at: string;
};

export type GroupRow = {
  id: string;
  name: string;
  created_at: string;
};

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
};

export type StreakAnalytics = {
  activeStreak7Plus: number;
  activeStreak30Plus: number;
  averageCurrentStreak: number;
  averageLongestStreak: number;
  usersWithAnyStreak: number;
};

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  rateFromRegistered: number;
  rateFromPrevious: number;
};

export type WeekdayHeatmapCell = {
  dayIndex: number;
  dayName: string;
  completions: number;
  share: number;
};

export type GroupHealthRow = {
  id: string;
  name: string;
  memberCount: number;
  completionsLast7Days: number;
  lastActivityDate: string | null;
  inactiveDays: number | null;
  status: 'active' | 'inactive';
};

export type XpTierRow = {
  key: string;
  label: string;
  count: number;
  share: number;
};

export type ReadingDepthStats = {
  avgChaptersPerSession: number;
  withReadingEvidence: number;
  markOnlyComplete: number;
  markOnlyShare: number;
  withReadingShare: number;
};

export type PrayerRepeatStats = {
  usersWithPrayers: number;
  usersWithMoreThan3: number;
  repeatRate: number;
  totalPrayers: number;
};

const toLocalIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysBetween = (left: string, right: string) => {
  const start = new Date(`${left}T00:00:00`);
  const end = new Date(`${right}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

export function computeCurrentStreak(dates: string[]): number {
  if (!dates.length) {
    return 0;
  }

  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = toLocalIsoDate(new Date());
  let streak = 0;
  let expected = today;

  for (const date of unique) {
    if (date === expected) {
      streak += 1;
      const previous = new Date(expected);
      previous.setDate(previous.getDate() - 1);
      expected = toLocalIsoDate(previous);
    } else if (date < expected) {
      break;
    }
  }

  return streak;
}

export function computeLongestStreak(dates: string[]): number {
  const sorted = Array.from(new Set(dates)).sort();
  if (!sorted.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    if (daysBetween(sorted[index - 1], sorted[index]) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function hasConsecutiveDays(dates: string[], target: number): boolean {
  return computeLongestStreak(dates) >= target;
}

export function buildCompletedDatesByUser(logs: DevotionLogRow[]) {
  const map = new Map<string, string[]>();

  logs.forEach(log => {
    if (!log.completed) {
      return;
    }
    const current = map.get(log.user_id) ?? [];
    current.push(log.date);
    map.set(log.user_id, current);
  });

  return map;
}

export function computeStreakAnalytics(
  completedDatesByUser: Map<string, string[]>,
): StreakAnalytics {
  let activeStreak7Plus = 0;
  let activeStreak30Plus = 0;
  let streakSum = 0;
  let longestSum = 0;
  let usersWithAnyStreak = 0;

  completedDatesByUser.forEach(dates => {
    const current = computeCurrentStreak(dates);
    const longest = computeLongestStreak(dates);

    if (current > 0) {
      usersWithAnyStreak += 1;
      streakSum += current;
    }
    longestSum += longest;

    if (current >= 7) {
      activeStreak7Plus += 1;
    }
    if (current >= 30) {
      activeStreak30Plus += 1;
    }
  });

  return {
    activeStreak7Plus,
    activeStreak30Plus,
    averageCurrentStreak:
      usersWithAnyStreak > 0
        ? Math.round((streakSum / usersWithAnyStreak) * 10) / 10
        : 0,
    averageLongestStreak:
      completedDatesByUser.size > 0
        ? Math.round((longestSum / completedDatesByUser.size) * 10) / 10
        : 0,
    usersWithAnyStreak,
  };
}

export function computeFunnel(
  registeredUsers: DirectoryUser[],
  completedDatesByUser: Map<string, string[]>,
): FunnelStep[] {
  const registered = registeredUsers.length;
  const firstDevotion = completedDatesByUser.size;
  const sevenDays = Array.from(completedDatesByUser.values()).filter(dates =>
    hasConsecutiveDays(dates, 7),
  ).length;
  const thirtyDays = Array.from(completedDatesByUser.values()).filter(dates =>
    hasConsecutiveDays(dates, 30),
  ).length;

  const steps = [
    { key: 'registered', label: 'تسجيل', count: registered },
    { key: 'first', label: 'خلوة أولى', count: firstDevotion },
    { key: 'seven', label: '٧ أيام متتالية', count: sevenDays },
    { key: 'thirty', label: '٣٠ يوم متتالي', count: thirtyDays },
  ];

  return steps.map((step, index) => {
    const previous = index === 0 ? registered : steps[index - 1].count;
    return {
      ...step,
      rateFromRegistered:
        registered > 0 ? Math.round((step.count / registered) * 100) : 0,
      rateFromPrevious:
        previous > 0 ? Math.round((step.count / previous) * 100) : 0,
    };
  });
}

export function computeWeekdayHeatmap(logs: DevotionLogRow[]): WeekdayHeatmapCell[] {
  const counts = Array.from({ length: 7 }, () => 0);

  logs.forEach(log => {
    if (!log.completed) {
      return;
    }
    const dayIndex = new Date(`${log.date}T12:00:00`).getDay();
    counts[dayIndex] += 1;
  });

  const total = counts.reduce((sum, value) => sum + value, 0) || 1;

  return counts.map((completions, dayIndex) => ({
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    completions,
    share: Math.round((completions / total) * 100),
  }));
}

export function computeGroupHealth(params: {
  groups: GroupRow[];
  members: GroupMemberRow[];
  completedDatesByUser: Map<string, string[]>;
  today: string;
}): { topGroups: GroupHealthRow[]; inactiveGroups: GroupHealthRow[] } {
  const { groups, members, completedDatesByUser, today } = params;
  const membersByGroup = new Map<string, string[]>();

  members.forEach(member => {
    const current = membersByGroup.get(member.group_id) ?? [];
    current.push(member.user_id);
    membersByGroup.set(member.group_id, current);
  });

  const sevenDaysAgo = new Date(`${today}T00:00:00`);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = toLocalIsoDate(sevenDaysAgo);

  const rows: GroupHealthRow[] = groups.map(group => {
    const memberIds = membersByGroup.get(group.id) ?? [];
    let lastActivityDate: string | null = null;
    let completionsLast7Days = 0;

    memberIds.forEach(userId => {
      const dates = completedDatesByUser.get(userId) ?? [];
      dates.forEach(date => {
        if (!lastActivityDate || date > lastActivityDate) {
          lastActivityDate = date;
        }
        if (date >= sevenDaysAgoStr && date <= today) {
          completionsLast7Days += 1;
        }
      });
    });

    const inactiveDays = lastActivityDate
      ? daysBetween(lastActivityDate, today)
      : null;
    const status =
      inactiveDays === null || inactiveDays >= 14 ? 'inactive' : 'active';

    return {
      id: group.id,
      name: group.name,
      memberCount: memberIds.length,
      completionsLast7Days,
      lastActivityDate,
      inactiveDays,
      status,
    };
  });

  const topGroups = [...rows]
    .sort((left, right) => right.completionsLast7Days - left.completionsLast7Days)
    .slice(0, 5);

  const inactiveGroups = rows
    .filter(row => row.status === 'inactive')
    .sort((left, right) => (right.inactiveDays ?? 999) - (left.inactiveDays ?? 999))
    .slice(0, 8);

  return { topGroups, inactiveGroups };
}

export function getLevelFromCompletedDays(completedDays: number) {
  return Math.floor(Math.max(completedDays, 0) / DAYS_PER_LEVEL) + 1;
}

export function computeXpDistribution(
  completedDatesByUser: Map<string, string[]>,
): XpTierRow[] {
  let beginner = 0;
  let intermediate = 0;
  let elite = 0;

  completedDatesByUser.forEach(dates => {
    const level = getLevelFromCompletedDays(dates.length);
    if (level <= 2) {
      beginner += 1;
    } else if (level <= 5) {
      intermediate += 1;
    } else {
      elite += 1;
    }
  });

  const usersWithActivity = beginner + intermediate + elite || 1;

  return [
    {
      key: 'beginner',
      label: 'مبتدئ (مستوى ١–٢)',
      count: beginner,
      share: Math.round((beginner / usersWithActivity) * 100),
    },
    {
      key: 'intermediate',
      label: 'متوسط (مستوى ٣–٥)',
      count: intermediate,
      share: Math.round((intermediate / usersWithActivity) * 100),
    },
    {
      key: 'elite',
      label: 'نخبة (مستوى ٦+)',
      count: elite,
      share: Math.round((elite / usersWithActivity) * 100),
    },
  ];
}

export function countChaptersInReadingLog(log: ReadingLogRow) {
  if (Array.isArray(log.reading_entries) && log.reading_entries.length > 0) {
    return log.reading_entries.reduce(
      (total, entry) => total + (entry.selected_chapters?.length ?? 0),
      0,
    );
  }

  if (Array.isArray(log.selected_chapters) && log.selected_chapters.length > 0) {
    return log.selected_chapters.length;
  }

  if (typeof log.chapters_read === 'number' && log.chapters_read > 0) {
    return log.chapters_read;
  }

  if (log.reading_chapter) {
    return 1;
  }

  return 0;
}

export function hasReadingEvidence(log: ReadingLogRow) {
  return countChaptersInReadingLog(log) > 0 || Boolean(log.reading_book);
}

export function computeReadingDepth(readingLogs: ReadingLogRow[]): ReadingDepthStats {
  if (!readingLogs.length) {
    return {
      avgChaptersPerSession: 0,
      withReadingEvidence: 0,
      markOnlyComplete: 0,
      markOnlyShare: 0,
      withReadingShare: 0,
    };
  }

  let chapterTotal = 0;
  let withReadingEvidence = 0;
  let markOnlyComplete = 0;

  readingLogs.forEach(log => {
    const chapters = countChaptersInReadingLog(log);
    chapterTotal += chapters;

    if (hasReadingEvidence(log)) {
      withReadingEvidence += 1;
    } else {
      markOnlyComplete += 1;
    }
  });

  const total = readingLogs.length;

  return {
    avgChaptersPerSession: Math.round((chapterTotal / total) * 10) / 10,
    withReadingEvidence,
    markOnlyComplete,
    markOnlyShare: Math.round((markOnlyComplete / total) * 100),
    withReadingShare: Math.round((withReadingEvidence / total) * 100),
  };
}

export function computePrayerRepeatStats(
  prayerCounts: Array<{ user_id: string; prayer_count: number }>,
  registeredCount: number,
): PrayerRepeatStats {
  const usersWithPrayers = prayerCounts.length;
  const usersWithMoreThan3 = prayerCounts.filter(
    row => row.prayer_count > 3,
  ).length;
  const totalPrayers = prayerCounts.reduce(
    (sum, row) => sum + Number(row.prayer_count),
    0,
  );

  return {
    usersWithPrayers,
    usersWithMoreThan3,
    repeatRate:
      registeredCount > 0
        ? Math.round((usersWithMoreThan3 / registeredCount) * 100)
        : 0,
    totalPrayers,
  };
}

export function getInsightsStartDate(monthsBack = 24) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsBack);
  return toLocalIsoDate(date);
}
