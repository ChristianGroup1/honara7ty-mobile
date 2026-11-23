import { supabase } from '@/lib/supabase';

export type HealthLevel = 'good' | 'warn' | 'bad' | 'unknown';

export interface InsightSnapshot {
  dau_users: number;
  wau_users: number;
  mau_users: number;
  inactive_7_days: number;
  inactive_14_days: number;
  inactive_30_days: number;
  retention_7_eligible: number;
  retention_7_returned: number;
  retention_30_eligible: number;
  retention_30_returned: number;
  new_prayers_7_days: number;
  unanswered_prayers_14_days: number;
  reflections_7_days: number;
  missing_name: number;
  missing_church: number;
  missing_birth_date: number;
}

export interface AppOpenVersion {
  app_version: string;
  build_number: string;
  platform: string;
  users_7_days: number;
  opens_7_days: number;
}

export interface AppOpenDevice {
  platform: string;
  last_opened_at: string;
  last_opened_on: string;
  opens: number;
}

export interface AppOpenPerson {
  user_id: string;
  email: string;
  full_name: string;
  last_opened_at: string;
  last_opened_on: string;
  opens_30_days: number;
  app_version: string;
  build_number: string;
  platform: string;
  platforms: string[];
  devices: AppOpenDevice[];
  devotions_30: number;
  chapters_30: number;
  prayers_30: number;
  reflections_30: number;
  memorization_30: number;
  signed_up_on: string;
  is_new: boolean;
  is_new_today: boolean;
}

export interface AppOpenStats {
  opened_today: number;
  opened_7_days: number;
  opened_30_days: number;
  table_rows: number;
  versions: AppOpenVersion[];
  people: AppOpenPerson[];
  peopleReady: boolean;
}

export interface AppPulse {
  totalUsers: number;
  todayDevotionDone: number;
  todayDevotionRate: number;
  groups: number;
  chaptersRead: number;
  openTickets: number;
  newUsers7d: number;
  prayers7d: number;
  reflections7d: number;
  insight: InsightSnapshot;
  opens: AppOpenStats;
  insightError: string | null;
  opensError: string | null;
  refreshedAt: string;
}

export const emptyInsight: InsightSnapshot = {
  dau_users: 0,
  wau_users: 0,
  mau_users: 0,
  inactive_7_days: 0,
  inactive_14_days: 0,
  inactive_30_days: 0,
  retention_7_eligible: 0,
  retention_7_returned: 0,
  retention_30_eligible: 0,
  retention_30_returned: 0,
  new_prayers_7_days: 0,
  unanswered_prayers_14_days: 0,
  reflections_7_days: 0,
  missing_name: 0,
  missing_church: 0,
  missing_birth_date: 0,
};

export const emptyOpens: AppOpenStats = {
  opened_today: 0,
  opened_7_days: 0,
  opened_30_days: 0,
  table_rows: 0,
  versions: [],
  people: [],
  peopleReady: false,
};

export function parseAppOpenStats(data: unknown): AppOpenStats {
  const raw = (data ?? {}) as Partial<AppOpenStats> & {
    versions?: unknown;
    people?: unknown;
  };
  const versions = Array.isArray(raw.versions) ? raw.versions : [];
  const peopleReady = Array.isArray(raw.people);
  const people = peopleReady ? raw.people : [];
  return {
    opened_today: Number(raw.opened_today ?? 0),
    opened_7_days: Number(raw.opened_7_days ?? 0),
    opened_30_days: Number(raw.opened_30_days ?? 0),
    table_rows: Number(raw.table_rows ?? 0),
    versions: versions.map((item) => {
      const row = item as Partial<AppOpenVersion>;
      return {
        app_version: String(row.app_version ?? ''),
        build_number: String(row.build_number ?? ''),
        platform: String(row.platform ?? 'other'),
        users_7_days: Number(row.users_7_days ?? 0),
        opens_7_days: Number(row.opens_7_days ?? 0),
      };
    }),
    people: (people as unknown[]).map((item) => {
      const row = item as Partial<AppOpenPerson>;
      return {
        user_id: String(row.user_id ?? ''),
        email: String(row.email ?? ''),
        full_name: String(row.full_name ?? ''),
        last_opened_at: String(row.last_opened_at ?? ''),
        last_opened_on: String(row.last_opened_on ?? ''),
        opens_30_days: Number(row.opens_30_days ?? 0),
        app_version: String(row.app_version ?? ''),
        build_number: String(row.build_number ?? ''),
        platform: String(row.platform ?? 'other'),
        platforms: Array.isArray(row.platforms)
          ? row.platforms.map((item) => String(item))
          : [String(row.platform ?? 'other')],
        devices: Array.isArray(row.devices)
          ? row.devices.map((item) => {
              const device = item as Partial<AppOpenDevice>;
              return {
                platform: String(device.platform ?? 'other'),
                last_opened_at: String(device.last_opened_at ?? ''),
                last_opened_on: String(device.last_opened_on ?? ''),
                opens: Number(device.opens ?? 0),
              };
            })
          : [],
        devotions_30: Number(row.devotions_30 ?? 0),
        chapters_30: Number(row.chapters_30 ?? 0),
        prayers_30: Number(row.prayers_30 ?? 0),
        reflections_30: Number(row.reflections_30 ?? 0),
        memorization_30: Number(row.memorization_30 ?? 0),
        signed_up_on: String(row.signed_up_on ?? ''),
        is_new: Boolean(row.is_new),
        is_new_today: Boolean(row.is_new_today),
      };
    }),
    peopleReady,
  };
}

export function formatOpenedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function cairoToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function pct(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function healthVerdict(pulse: AppPulse): {
  level: HealthLevel;
  title: string;
  detail: string;
} {
  const issues: string[] = [];
  const opensToday = pulse.opens.opened_today;
  const devotionRate = pulse.todayDevotionRate;
  const inactiveShare = pct(pulse.insight.inactive_14_days, pulse.totalUsers);

  if (pulse.opensError) issues.push('إحصاء فتح التطبيق غير متاح');
  if (pulse.insightError) issues.push('لقطة النشاط المتقدمة غير متاحة');
  if (pulse.totalUsers > 0 && opensToday === 0 && !pulse.opensError) {
    issues.push('مفيش فتحات مسجّلة النهاردة');
  }
  if (pulse.totalUsers >= 10 && devotionRate < 10) {
    issues.push('نسبة خلوة اليوم منخفضة');
  }
  if (pulse.openTickets >= 5) {
    issues.push(`${pulse.openTickets} تذاكر مساعدة مفتوحة`);
  }
  if (inactiveShare >= 70 && pulse.totalUsers >= 20) {
    issues.push('نسبة كبيرة من المستخدمين خاملة ١٤ يوم');
  }

  if (issues.length === 0 && pulse.totalUsers === 0) {
    return {
      level: 'unknown',
      title: 'لسه مفيش بيانات كافية',
      detail: 'لما يبدأ المستخدمون يدخلوا، الأرقام هتظهر هنا.',
    };
  }

  if (issues.length >= 2) {
    return {
      level: 'bad',
      title: 'في علامات تحتاج متابعة',
      detail: issues.slice(0, 3).join(' · '),
    };
  }

  if (issues.length === 1) {
    return {
      level: 'warn',
      title: 'التطبيق شغال مع ملاحظة',
      detail: issues[0],
    };
  }

  return {
    level: 'good',
    title: 'التطبيق يبدو تمام',
    detail: `فتحات اليوم ${opensToday} · خلوة اليوم ${devotionRate}% · نشط أسبوعياً ${pulse.insight.wau_users}`,
  };
}

export async function fetchAppPulse(): Promise<AppPulse> {
  const today = cairoToday();
  const weekAgo = daysAgoIso(7);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartDate = weekStart.toISOString().slice(0, 10);

  const [
    usersRes,
    devotionRes,
    groupsRes,
    readingRes,
    ticketsRes,
    newUsersRes,
    prayersRes,
    reflectionsRes,
    insightRes,
    opensRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('devotion_log')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('completed', true),
    supabase.from('devotion_groups').select('*', { count: 'exact', head: true }),
    supabase.from('reading_log').select('*', { count: 'exact', head: true }),
    supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'waiting']),
    supabase.rpc('get_new_registrations_count', {
      start_date: new Date(`${weekStartDate}T00:00:00`).toISOString(),
      end_date: new Date().toISOString(),
    }),
    supabase
      .from('prayer_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabase
      .from('reflections')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabase.rpc('get_admin_insight_snapshot'),
    supabase.rpc('get_app_open_stats'),
  ]);

  const totalUsers = usersRes.count ?? 0;
  const todayDevotionDone = devotionRes.count ?? 0;

  let insight = emptyInsight;
  let insightError: string | null = null;
  if (insightRes.error) {
    insightError = insightRes.error.message;
  } else if (Array.isArray(insightRes.data) && insightRes.data[0]) {
    const row = insightRes.data[0] as Record<string, unknown>;
    insight = {
      ...emptyInsight,
      ...Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, Number(value ?? 0)]),
      ),
    } as InsightSnapshot;
  }

  let opens = emptyOpens;
  let opensError: string | null = null;
  if (opensRes.error) {
    opensError = opensRes.error.message;
  } else if (opensRes.data && typeof opensRes.data === 'object') {
    opens = parseAppOpenStats(opensRes.data);
  }

  const newUsers7d = newUsersRes.error ? 0 : Number(newUsersRes.data ?? 0);

  return {
    totalUsers,
    todayDevotionDone,
    todayDevotionRate: pct(todayDevotionDone, totalUsers),
    groups: groupsRes.count ?? 0,
    chaptersRead: readingRes.count ?? 0,
    openTickets: ticketsRes.error ? 0 : (ticketsRes.count ?? 0),
    newUsers7d,
    prayers7d: prayersRes.count ?? 0,
    reflections7d: reflectionsRes.count ?? 0,
    insight,
    opens,
    insightError,
    opensError,
    refreshedAt: new Date().toISOString(),
  };
}

export function openedToday(person: AppOpenPerson) {
  return person.last_opened_on.slice(0, 10) === cairoToday();
}

export function personPlatforms(person: AppOpenPerson) {
  const listed = (person.platforms ?? []).filter(Boolean);
  if (listed.length > 0) return [...new Set(listed)];
  return person.platform ? [person.platform] : [];
}

export function platformNames(person: AppOpenPerson) {
  return personPlatforms(person).map(platformLabel).join(' · ');
}

export function platformLabel(platform: string) {
  if (platform === 'ios') return 'آيفون';
  if (platform === 'android') return 'أندرويد';
  return 'جهاز آخر';
}

export function newUserLabel(person: AppOpenPerson) {
  if (person.is_new_today) return 'جديد النهاردة';
  if (person.is_new) return 'جديد';
  return 'قديم';
}

export function activitySummary(person: AppOpenPerson) {
  const parts = [
    person.devotions_30 > 0 ? `خلوة ${person.devotions_30}` : '',
    person.chapters_30 > 0 ? `قراءة ${person.chapters_30}` : '',
    person.prayers_30 > 0 ? `صلاة ${person.prayers_30}` : '',
    person.reflections_30 > 0 ? `تأمل ${person.reflections_30}` : '',
    person.memorization_30 > 0 ? `حفظ ${person.memorization_30}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'فتح التطبيق من غير نشاط مسجّل';
}
