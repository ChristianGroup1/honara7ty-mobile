import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseUrl } from './supabase';

type TableName =
  | 'profiles'
  | 'reading_log'
  | 'prayer_notes'
  | 'reflections'
  | 'testimonies'
  | 'devotion_log';

type RowValue = string | number | boolean | null | string[] | number[];
type DataRow = Record<string, RowValue>;
type UserDirectory = Record<
  string,
  { email: string | null; fullName: string; createdAt: string | null }
>;
type AppView = 'overview' | 'table';
type OverviewTab = 'summary' | 'users' | 'features' | 'churches' | 'trends';
type TodayFilter = 'all' | 'done' | 'not_done';
type ActivityKind =
  | 'devotion'
  | 'reading'
  | 'prayer'
  | 'reflection'
  | 'testimony';
type ActivityEvent = {
  userId: string;
  date: string;
  kind: ActivityKind;
};
type DevotionLogRow = {
  user_id: string;
  date: string;
  completed: boolean;
  reading_book: string | null;
  reading_chapter: number | null;
  chapters_read: number | null;
  selected_chapters: number[] | null;
  created_at: string;
};
type ReadingLogRow = {
  user_id: string;
  book_id: string;
  chapter: number;
  date: string;
};
type PrayerNoteRow = {
  user_id: string;
  is_answered: boolean;
  created_at: string;
};
type ProfileRow = {
  id: string;
  church: string | null;
  sect: string | null;
  birth_date: string | null;
  gender: string | null;
  devotion_time: string | null;
  reading_book: string | null;
  reading_chapter: number | null;
  daily_chapters_target: number | null;
};

type TableConfig = {
  name: TableName;
  label: string;
  description: string;
  selectColumns: string[];
  displayColumns: string[];
  ownerColumn: 'id' | 'user_id';
  order?: {
    column: string;
    ascending: boolean;
  };
};

const tables: TableConfig[] = [
  {
    name: 'profiles',
    label: 'Profile',
    description: 'Church, sect, devotion time, and reading settings.',
    ownerColumn: 'id',
    selectColumns: [
      'id',
      'church',
      'sect',
      'birth_date',
      'gender',
      'devotion_time',
      'reading_book',
      'reading_chapter',
      'daily_chapters_target',
      'selected_chapters',
      'updated_at',
    ],
    displayColumns: [
      'user_name',
      'church',
      'sect',
      'birth_date',
      'gender',
      'devotion_time',
      'reading_book',
      'reading_chapter',
      'daily_chapters_target',
      'selected_chapters',
      'updated_at',
    ],
    order: { column: 'updated_at', ascending: false },
  },
  {
    name: 'reading_log',
    label: 'Reading Log',
    description: 'Bible chapters read by date.',
    ownerColumn: 'user_id',
    selectColumns: ['user_id', 'book_id', 'chapter', 'date'],
    displayColumns: ['user_name', 'book_id', 'chapter', 'date'],
    order: { column: 'date', ascending: false },
  },
  {
    name: 'prayer_notes',
    label: 'Prayer Notes',
    description: 'Prayer requests and answered state.',
    ownerColumn: 'user_id',
    selectColumns: ['id', 'user_id', 'content', 'is_answered', 'created_at'],
    displayColumns: ['user_name', 'content', 'is_answered', 'created_at'],
    order: { column: 'created_at', ascending: false },
  },
  {
    name: 'reflections',
    label: 'Reflections',
    description: 'Spiritual journal entries.',
    ownerColumn: 'user_id',
    selectColumns: ['id', 'user_id', 'content', 'date', 'created_at'],
    displayColumns: ['user_name', 'content', 'date', 'created_at'],
    order: { column: 'date', ascending: false },
  },
  {
    name: 'testimonies',
    label: 'Testimonies',
    description: 'Shared answered-prayer stories.',
    ownerColumn: 'user_id',
    selectColumns: ['id', 'user_id', 'content', 'created_at'],
    displayColumns: ['user_name', 'content', 'created_at'],
    order: { column: 'created_at', ascending: false },
  },
  {
    name: 'devotion_log',
    label: 'Devotion Log',
    description: 'Daily quiet-time completion records.',
    ownerColumn: 'user_id',
    selectColumns: [
      'user_id',
      'date',
      'completed',
      'reading_book',
      'reading_chapter',
      'chapters_read',
      'selected_chapters',
      'created_at',
    ],
    displayColumns: [
      'user_name',
      'date',
      'completed',
      'reading_book',
      'reading_chapter',
      'chapters_read',
      'selected_chapters',
      'created_at',
    ],
    order: { column: 'date', ascending: false },
  },
];

const pageSizeOptions = [10, 25, 50, 100];

const bookDefinitions: Record<string, { displayName: string; testament: 'old' | 'new' }> = {
  '1': { displayName: 'سفر التكوين', testament: 'old' },
  '2': { displayName: 'سفر الخروج', testament: 'old' },
  '3': { displayName: 'سفر اللاويين', testament: 'old' },
  '4': { displayName: 'سفر العدد', testament: 'old' },
  '5': { displayName: 'سفر التثنية', testament: 'old' },
  '6': { displayName: 'سفر يشوع', testament: 'old' },
  '7': { displayName: 'سفر القضاة', testament: 'old' },
  '8': { displayName: 'سفر راعوث', testament: 'old' },
  '9': { displayName: 'سفر صموئيل الأول', testament: 'old' },
  '10': { displayName: 'سفر صموئيل الثاني', testament: 'old' },
  '11': { displayName: 'سفر الملوك الأول', testament: 'old' },
  '12': { displayName: 'سفر الملوك الثاني', testament: 'old' },
  '13': { displayName: 'سفر أخبار الأيام الأول', testament: 'old' },
  '14': { displayName: 'سفر أخبار الأيام الثاني', testament: 'old' },
  '15': { displayName: 'سفر عزرا', testament: 'old' },
  '16': { displayName: 'سفر نحميا', testament: 'old' },
  '17': { displayName: 'سفر أستير', testament: 'old' },
  '18': { displayName: 'سفر أيوب', testament: 'old' },
  '19': { displayName: 'سفر المزامير', testament: 'old' },
  '20': { displayName: 'سفر الأمثال', testament: 'old' },
  '21': { displayName: 'سفر الجامعة', testament: 'old' },
  '22': { displayName: 'سفر نشيد الأنشاد', testament: 'old' },
  '23': { displayName: 'سفر إشعياء', testament: 'old' },
  '24': { displayName: 'سفر إرميا', testament: 'old' },
  '25': { displayName: 'سفر مراثي إرميا', testament: 'old' },
  '26': { displayName: 'سفر حزقيال', testament: 'old' },
  '27': { displayName: 'سفر دانيال', testament: 'old' },
  '28': { displayName: 'سفر هوشع', testament: 'old' },
  '29': { displayName: 'سفر يوئيل', testament: 'old' },
  '30': { displayName: 'سفر عاموس', testament: 'old' },
  '31': { displayName: 'سفر عوبديا', testament: 'old' },
  '32': { displayName: 'سفر يونان', testament: 'old' },
  '33': { displayName: 'سفر ميخا', testament: 'old' },
  '34': { displayName: 'سفر ناحوم', testament: 'old' },
  '35': { displayName: 'سفر حبقوق', testament: 'old' },
  '36': { displayName: 'سفر صفنيا', testament: 'old' },
  '37': { displayName: 'سفر حجي', testament: 'old' },
  '38': { displayName: 'سفر زكريا', testament: 'old' },
  '39': { displayName: 'سفر ملاخي', testament: 'old' },
  '40': { displayName: 'إنجيل متى', testament: 'new' },
  '41': { displayName: 'إنجيل مرقس', testament: 'new' },
  '42': { displayName: 'إنجيل لوقا', testament: 'new' },
  '43': { displayName: 'إنجيل يوحنا', testament: 'new' },
  '44': { displayName: 'سفر أعمال الرسل', testament: 'new' },
  '45': { displayName: 'رسالة بولس الرسول إلى أهل رومية', testament: 'new' },
  '46': { displayName: 'رسالة بولس الرسول الأولى إلى أهل كورنثوس', testament: 'new' },
  '47': { displayName: 'رسالة بولس الرسول الثانية إلى أهل كورنثوس', testament: 'new' },
  '48': { displayName: 'رسالة بولس الرسول إلى أهل غلاطية', testament: 'new' },
  '49': { displayName: 'رسالة بولس الرسول إلى أهل أفسس', testament: 'new' },
  '50': { displayName: 'رسالة بولس الرسول إلى أهل فيلبي', testament: 'new' },
  '51': { displayName: 'رسالة بولس الرسول إلى أهل كولوسي', testament: 'new' },
  '52': { displayName: 'رسالة بولس الرسول الأولى إلى أهل تسالونيكي', testament: 'new' },
  '53': { displayName: 'رسالة بولس الرسول الثانية إلى أهل تسالونيكي', testament: 'new' },
  '54': { displayName: 'رسالة بولس الرسول الأولى إلى تيموثاوس', testament: 'new' },
  '55': { displayName: 'رسالة بولس الرسول الثانية إلى تيموثاوس', testament: 'new' },
  '56': { displayName: 'رسالة بولس الرسول إلى تيطس', testament: 'new' },
  '57': { displayName: 'رسالة بولس الرسول إلى فليمون', testament: 'new' },
  '58': { displayName: 'رسالة بولس الرسول إلى العبرانيين', testament: 'new' },
  '59': { displayName: 'رسالة يعقوب', testament: 'new' },
  '60': { displayName: 'رسالة بطرس الرسول الأولى', testament: 'new' },
  '61': { displayName: 'رسالة بطرس الرسول الثانية', testament: 'new' },
  '62': { displayName: 'رسالة يوحنا الرسول الأولى', testament: 'new' },
  '63': { displayName: 'رسالة يوحنا الرسول الثانية', testament: 'new' },
  '64': { displayName: 'رسالة يوحنا الرسول الثالثة', testament: 'new' },
  '65': { displayName: 'رسالة يهوذا', testament: 'new' },
  '66': { displayName: 'سفر رؤيا يوحنا اللاهوتي', testament: 'new' },
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIsoDate(date);
};

const eachDayFrom = (days: number) =>
  Array.from({ length: days }, (_, index) => daysAgoIso(days - index - 1));

const isoDateFromTimestamp = (timestamp?: string | null) =>
  timestamp ? toIsoDate(new Date(timestamp)) : null;

const computeStreaks = (dates: string[]) => {
  const sortedDates = [...new Set(dates)].sort();
  let longest = 0;
  let currentRun = 0;
  let previousTime: number | null = null;

  sortedDates.forEach((date) => {
    const time = new Date(`${date}T00:00:00`).getTime();
    const isNextDay =
      previousTime !== null && time - previousTime === 24 * 60 * 60 * 1000;
    currentRun = previousTime === null || isNextDay ? currentRun + 1 : 1;
    longest = Math.max(longest, currentRun);
    previousTime = time;
  });

  let current = 0;
  const dateSet = new Set(sortedDates);
  const cursor = new Date();

  while (dateSet.has(toIsoDate(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
};

const buildMonthDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = firstDay.getDay();
  const days: Array<{ key: string; day?: number; isoDate?: string; empty?: boolean }> = [];

  for (let index = 0; index < leadingEmpty; index += 1) {
    days.push({ key: `empty-start-${index}`, empty: true });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const current = new Date(year, month, day);
    days.push({ key: toIsoDate(current), day, isoDate: toIsoDate(current) });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `empty-end-${days.length}`, empty: true });
  }

  return days;
};

const formatValue = (value: RowValue) => {
  if (value === null || value === undefined) {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
};

function AuthPanel() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const credentials = { email, password };
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    if (error) {
      setStatus(error.message);
    } else if (mode === 'signup') {
      setStatus('Account created. Check your email if confirmation is enabled.');
    }

    setIsSubmitting(false);
  };

  return (
    <section className="auth-shell" aria-label="Supabase authentication">
      <div className="brand-block">
        <p className="eyebrow">Supabase data reader</p>
        <h1>Honara7ty Data</h1>
        <p>
          Sign in with a Supabase user account to read the rows allowed by your
          Row Level Security policies.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="segmented-control" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <label>
          Email
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {status ? <p className="form-status">{status}</p> : null}
      </form>
    </section>
  );
}

function DataTable({
  rows,
  columns,
}: {
  rows: DataRow[];
  columns: string[];
}) {
  if (!rows.length) {
    return <div className="empty-state">No rows found for this account.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column.replaceAll('_', ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.id ?? index}`}>
              {columns.map((column) => (
                <td key={column}>{formatValue(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<AppView>('overview');
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('summary');
  const [activeTable, setActiveTable] = useState<TableName>('profiles');
  const [rows, setRows] = useState<DataRow[]>([]);
  const [userDirectory, setUserDirectory] = useState<UserDirectory>({});
  const [allProfiles, setAllProfiles] = useState<Record<string, ProfileRow>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [selectedUserLogs, setSelectedUserLogs] = useState<DevotionLogRow[]>([]);
  const [allDevotionLogs, setAllDevotionLogs] = useState<DevotionLogRow[]>([]);
  const [allReadingLogs, setAllReadingLogs] = useState<ReadingLogRow[]>([]);
  const [allPrayerNotes, setAllPrayerNotes] = useState<PrayerNoteRow[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [overviewSearch, setOverviewSearch] = useState('');
  const [minCompleted, setMinCompleted] = useState('');
  const [maxCompleted, setMaxCompleted] = useState('');
  const [todayFilter, setTodayFilter] = useState<TodayFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [isUserDetailsLoading, setIsUserDetailsLoading] = useState(false);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConfig = useMemo(
    () => tables.find((table) => table.name === activeTable) ?? tables[0],
    [activeTable],
  );

  const users = useMemo(
    () =>
      Object.entries(userDirectory)
        .map(([id, user]) => ({ id, ...user }))
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [userDirectory],
  );

  const selectedUser = selectedUserId ? userDirectory[selectedUserId] : null;
  const selectedLogsByDate = useMemo(
    () =>
      selectedUserLogs.reduce<Record<string, DevotionLogRow>>((acc, log) => {
        acc[log.date] = log;
        return acc;
      }, {}),
    [selectedUserLogs],
  );
  const visibleMonthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const selectedCompletedLogs = useMemo(
    () => selectedUserLogs.filter((log) => log.completed),
    [selectedUserLogs],
  );
  const monthKey = toMonthKey(visibleMonth);
  const monthCompletedCount = selectedCompletedLogs.filter((log) =>
    log.date.startsWith(monthKey),
  ).length;
  const todayIso = toIsoDate(new Date());
  const sevenDaysAgoIso = daysAgoIso(6);
  const thirtyDaysAgoIso = daysAgoIso(29);
  const completedLogs = useMemo(
    () => allDevotionLogs.filter((log) => log.completed),
    [allDevotionLogs],
  );
  const todayCompletedUserIds = useMemo(
    () =>
      new Set(
        allDevotionLogs
          .filter((log) => log.completed && log.date === todayIso)
          .map((log) => log.user_id),
      ),
    [allDevotionLogs, todayIso],
  );
  const logsByUser = useMemo(
    () =>
      allDevotionLogs.reduce<Record<string, DevotionLogRow[]>>((acc, log) => {
        acc[log.user_id] = acc[log.user_id] ?? [];
        acc[log.user_id].push(log);
        return acc;
      }, {}),
    [allDevotionLogs],
  );
  const activityByUser = useMemo(
    () =>
      activityEvents.reduce<Record<string, ActivityEvent[]>>((acc, event) => {
        acc[event.userId] = acc[event.userId] ?? [];
        acc[event.userId].push(event);
        return acc;
      }, {}),
    [activityEvents],
  );
  const userSummaries = useMemo(
    () =>
      users.map((user) => {
        const userLogs = logsByUser[user.id] ?? [];
        const userCompletedLogs = userLogs.filter((log) => log.completed);
        const userMonthCompleted = userCompletedLogs.filter((log) =>
          log.date.startsWith(monthKey),
        );
        const userLogsByDate = userLogs.reduce<Record<string, DevotionLogRow>>(
          (acc, log) => {
            acc[log.date] = log;
            return acc;
          },
          {},
        );

        return {
          ...user,
          profile: allProfiles[user.id],
          accountCreatedAt: user.createdAt,
          accountCreatedDate: isoDateFromTimestamp(user.createdAt),
          completedCount: userCompletedLogs.length,
          monthCompletedCount: userMonthCompleted.length,
          completedToday: todayCompletedUserIds.has(user.id),
          streaks: computeStreaks(userCompletedLogs.map((log) => log.date)),
          activityCount: activityByUser[user.id]?.length ?? 0,
          lastActivity: (() => {
            const dates = activityByUser[user.id]?.map((event) => event.date).sort() ?? [];
            return dates.length ? dates[dates.length - 1] : '-';
          })(),
          logsByDate: userLogsByDate,
        };
      }),
    [activityByUser, allProfiles, logsByUser, monthKey, todayCompletedUserIds, users],
  );
  const filteredUserSummaries = useMemo(() => {
    const query = overviewSearch.trim().toLowerCase();
    const min = minCompleted === '' ? null : Number(minCompleted);
    const max = maxCompleted === '' ? null : Number(maxCompleted);

    return userSummaries.filter((user) => {
      const searchable = [
        user.fullName,
        user.email ?? '',
        user.profile?.church ?? '',
        user.profile?.sect ?? '',
        user.profile?.gender ?? '',
        user.profile?.devotion_time ?? '',
      ]
        .join(' ')
        .toLowerCase();

      if (query && !searchable.includes(query)) {
        return false;
      }

      if (min !== null && user.completedCount < min) {
        return false;
      }

      if (max !== null && user.completedCount > max) {
        return false;
      }

      if (todayFilter === 'done' && !user.completedToday) {
        return false;
      }

      if (todayFilter === 'not_done' && user.completedToday) {
        return false;
      }

      return true;
    });
  }, [maxCompleted, minCompleted, overviewSearch, todayFilter, userSummaries]);
  const completionDistribution = useMemo(() => {
    const counts = userSummaries.reduce<Record<number, number>>((acc, user) => {
      acc[user.completedCount] = (acc[user.completedCount] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([completedCount, userCount]) => ({
        completedCount: Number(completedCount),
        userCount,
      }))
      .sort((left, right) => left.completedCount - right.completedCount);
  }, [userSummaries]);
  const averageCompletedPerUser =
    users.length > 0 ? Math.round((completedLogs.length / users.length) * 10) / 10 : 0;
  const newTodayUsers = useMemo(
    () => userSummaries.filter((user) => user.accountCreatedDate === todayIso),
    [todayIso, userSummaries],
  );
  const new7DayUsers = useMemo(
    () =>
      userSummaries.filter(
        (user) => user.accountCreatedDate && user.accountCreatedDate >= sevenDaysAgoIso,
      ),
    [sevenDaysAgoIso, userSummaries],
  );
  const new30DayUsers = useMemo(
    () =>
      userSummaries.filter(
        (user) => user.accountCreatedDate && user.accountCreatedDate >= thirtyDaysAgoIso,
      ),
    [thirtyDaysAgoIso, userSummaries],
  );
  const recentNewUsers = useMemo(
    () =>
      [...userSummaries]
        .filter((user) => user.accountCreatedAt)
        .sort((left, right) =>
          (right.accountCreatedAt ?? '').localeCompare(left.accountCreatedAt ?? ''),
        )
        .slice(0, 8),
    [userSummaries],
  );
  const activeTodayUserIds = useMemo(
    () =>
      new Set(
        activityEvents
          .filter((event) => event.date === todayIso)
          .map((event) => event.userId),
      ),
    [activityEvents, todayIso],
  );
  const active7DayUserIds = useMemo(
    () =>
      new Set(
        activityEvents
          .filter((event) => event.date >= sevenDaysAgoIso)
          .map((event) => event.userId),
      ),
    [activityEvents, sevenDaysAgoIso],
  );
  const active30DayUserIds = useMemo(
    () =>
      new Set(
        activityEvents
          .filter((event) => event.date >= thirtyDaysAgoIso)
          .map((event) => event.userId),
      ),
    [activityEvents, thirtyDaysAgoIso],
  );
  const everActiveUserIds = useMemo(
    () => new Set(activityEvents.map((event) => event.userId)),
    [activityEvents],
  );
  const inactiveUserCount = Math.max(0, users.length - everActiveUserIds.size);
  const active30Rate =
    users.length > 0 ? Math.round((active30DayUserIds.size / users.length) * 100) : 0;
  const active7Rate =
    users.length > 0 ? Math.round((active7DayUserIds.size / users.length) * 100) : 0;
  const activityKindCounts = useMemo(
    () =>
      activityEvents.reduce<Record<ActivityKind, number>>(
        (acc, event) => {
          acc[event.kind] += 1;
          return acc;
        },
        {
          devotion: 0,
          reading: 0,
          prayer: 0,
          reflection: 0,
          testimony: 0,
        },
      ),
    [activityEvents],
  );
  const topActiveUsers = useMemo(
    () =>
      [...userSummaries]
        .sort((left, right) => right.activityCount - left.activityCount)
        .slice(0, 8),
    [userSummaries],
  );
  const usersWithDevotion = useMemo(
    () => new Set(completedLogs.map((log) => log.user_id)),
    [completedLogs],
  );
  const devotionAdoptionRate = users.length
    ? Math.round((usersWithDevotion.size / users.length) * 100)
    : 0;
  const sevenOfThirtyRate = active30DayUserIds.size
    ? Math.round((active7DayUserIds.size / active30DayUserIds.size) * 100)
    : 0;
  const dormantUsers = useMemo(
    () =>
      userSummaries
        .filter((user) => user.lastActivity !== '-' && user.lastActivity < thirtyDaysAgoIso)
        .sort((left, right) => left.lastActivity.localeCompare(right.lastActivity))
        .slice(0, 8),
    [thirtyDaysAgoIso, userSummaries],
  );
  const noActivityUsers = useMemo(
    () => userSummaries.filter((user) => user.activityCount === 0).slice(0, 8),
    [userSummaries],
  );
  const streakBuckets = useMemo(
    () => [
      {
        label: '0 days',
        count: userSummaries.filter((user) => user.streaks.current === 0).length,
      },
      {
        label: '1-2 days',
        count: userSummaries.filter(
          (user) => user.streaks.current >= 1 && user.streaks.current <= 2,
        ).length,
      },
      {
        label: '3-6 days',
        count: userSummaries.filter(
          (user) => user.streaks.current >= 3 && user.streaks.current <= 6,
        ).length,
      },
      {
        label: '7-13 days',
        count: userSummaries.filter(
          (user) => user.streaks.current >= 7 && user.streaks.current <= 13,
        ).length,
      },
      {
        label: '14+ days',
        count: userSummaries.filter((user) => user.streaks.current >= 14).length,
      },
    ],
    [userSummaries],
  );
  const longestStreakUsers = useMemo(
    () =>
      [...userSummaries]
        .sort((left, right) => right.streaks.longest - left.streaks.longest)
        .slice(0, 8),
    [userSummaries],
  );
  const topReadingBooks = useMemo(() => {
    const rows = allReadingLogs.reduce<
      Record<
        string,
        {
          book: string;
          displayName: string;
          testament: 'old' | 'new' | 'unknown';
          chapters: number;
        }
      >
    >(
      (acc, log) => {
        const definition = bookDefinitions[log.book_id];
        acc[log.book_id] = acc[log.book_id] ?? {
          book: log.book_id,
          displayName: definition?.displayName ?? `Book ${log.book_id}`,
          testament: definition?.testament ?? 'unknown',
          chapters: 0,
        };
        acc[log.book_id].chapters += 1;
        return acc;
      },
      {},
    );

    return Object.values(rows)
      .sort((left, right) => right.chapters - left.chapters)
      .slice(0, 10);
  }, [allReadingLogs]);
  const answeredPrayerCount = allPrayerNotes.filter((note) => note.is_answered).length;
  const prayerAnswerRate = allPrayerNotes.length
    ? Math.round((answeredPrayerCount / allPrayerNotes.length) * 100)
    : 0;
  const featureUsage = useMemo(
    () =>
      (Object.keys(activityKindCounts) as ActivityKind[]).map((kind) => {
        const uniqueUsers = new Set(
          activityEvents.filter((event) => event.kind === kind).map((event) => event.userId),
        );

        return {
          kind,
          events: activityKindCounts[kind],
          users: uniqueUsers.size,
          rate: users.length ? Math.round((uniqueUsers.size / users.length) * 100) : 0,
        };
      }),
    [activityEvents, activityKindCounts, users.length],
  );
  const churchBreakdown = useMemo(() => {
    const rows = userSummaries.reduce<
      Record<
        string,
        {
          church: string;
          users: number;
          active30: number;
          completed: number;
          avgCompleted: number;
        }
      >
    >((acc, user) => {
      const church = user.profile?.church || 'No church';
      acc[church] = acc[church] ?? {
        church,
        users: 0,
        active30: 0,
        completed: 0,
        avgCompleted: 0,
      };
      acc[church].users += 1;
      acc[church].completed += user.completedCount;
      if (active30DayUserIds.has(user.id)) {
        acc[church].active30 += 1;
      }
      return acc;
    }, {});

    return Object.values(rows)
      .map((row) => ({
        ...row,
        avgCompleted: row.users ? Math.round((row.completed / row.users) * 10) / 10 : 0,
      }))
      .sort((left, right) => right.active30 - left.active30 || right.users - left.users);
  }, [active30DayUserIds, userSummaries]);
  const sectBreakdown = useMemo(() => {
    const rows = userSummaries.reduce<Record<string, { sect: string; users: number }>>(
      (acc, user) => {
        const sect = user.profile?.sect || 'No sect';
        acc[sect] = acc[sect] ?? { sect, users: 0 };
        acc[sect].users += 1;
        return acc;
      },
      {},
    );

    return Object.values(rows).sort((left, right) => right.users - left.users);
  }, [userSummaries]);
  const trendDays = useMemo(() => eachDayFrom(14), []);
  const dailyTrends = useMemo(
    () =>
      trendDays.map((date) => {
        const activeUsers = new Set(
          activityEvents
            .filter((event) => event.date === date)
            .map((event) => event.userId),
        ).size;
        const devotions = completedLogs.filter((log) => log.date === date).length;
        const newUsers = userSummaries.filter(
          (user) => user.accountCreatedDate === date,
        ).length;

        return { date, activeUsers, devotions, newUsers };
      }),
    [activityEvents, completedLogs, trendDays, userSummaries],
  );
  const maxTrendValue = Math.max(
    1,
    ...dailyTrends.map((day) => Math.max(day.activeUsers, day.devotions, day.newUsers)),
  );

  const getUserLabel = useCallback(
    (userId: RowValue) => {
      if (typeof userId !== 'string' || !userId) {
        return '-';
      }

      const user = userDirectory[userId];

      if (user) {
        return user.email ? `${user.fullName} (${user.email})` : user.fullName;
      }

      if (session?.user.id === userId) {
        return (
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email ||
          'Current user'
        );
      }

      return `Unknown user ${userId.slice(0, 8)}`;
    },
    [session, userDirectory],
  );

  const loadUserDirectory = useCallback(async () => {
    if (!session) {
      setUserDirectory({});
      return;
    }

    setIsDirectoryLoading(true);

    const currentUserName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email?.split('@')[0] ||
      'Current user';

    const nextDirectory: UserDirectory = {
      [session.user.id]: {
        email: session.user.email ?? null,
        fullName: currentUserName,
        createdAt: session.user.created_at ?? null,
      },
    };

    const { data, error: directoryError } = await supabase.rpc(
      'admin_user_directory',
    );

    if (!directoryError && Array.isArray(data)) {
      data.forEach((user) => {
        if (user?.id) {
          nextDirectory[user.id] = {
            email: user.email ?? null,
            fullName: user.full_name || user.email || user.id,
            createdAt: user.created_at ?? null,
          };
        }
      });
    }

    setUserDirectory(nextDirectory);
    setSelectedUserId((current) => current || session.user.id);
    setIsDirectoryLoading(false);
  }, [session]);

  const loadSelectedUserDetails = useCallback(async () => {
    if (!selectedUserId) {
      setSelectedProfile(null);
      setSelectedUserLogs([]);
      return;
    }

    setIsUserDetailsLoading(true);

    const [profileResult, logsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, church, sect, birth_date, gender, devotion_time, reading_book, reading_chapter, daily_chapters_target',
        )
        .eq('id', selectedUserId)
        .maybeSingle(),
      supabase
        .from('devotion_log')
        .select(
          'user_id, date, completed, reading_book, reading_chapter, chapters_read, selected_chapters, created_at',
        )
        .eq('user_id', selectedUserId)
        .order('date', { ascending: false }),
    ]);

    setSelectedProfile((profileResult.data as ProfileRow | null) ?? null);
    setSelectedUserLogs((logsResult.data ?? []) as unknown as DevotionLogRow[]);
    setIsUserDetailsLoading(false);
  }, [selectedUserId]);

  const loadOverview = useCallback(async () => {
    if (!session) {
      setAllDevotionLogs([]);
      return;
    }

    setIsOverviewLoading(true);

    const [
      logsResult,
      profilesResult,
      readingResult,
      prayerResult,
      reflectionResult,
      testimonyResult,
    ] = await Promise.all([
      supabase
        .from('devotion_log')
        .select(
          'user_id, date, completed, reading_book, reading_chapter, chapters_read, selected_chapters, created_at',
        )
        .order('date', { ascending: false })
        .limit(10000),
      supabase
        .from('profiles')
        .select(
          'id, church, sect, birth_date, gender, devotion_time, reading_book, reading_chapter, daily_chapters_target',
        )
        .limit(10000),
      supabase.from('reading_log').select('user_id, book_id, chapter, date').limit(10000),
      supabase.from('prayer_notes').select('user_id, is_answered, created_at').limit(10000),
      supabase.from('reflections').select('user_id, date, created_at').limit(10000),
      supabase.from('testimonies').select('user_id, created_at').limit(10000),
    ]);

    if (!logsResult.error) {
      setAllDevotionLogs((logsResult.data ?? []) as unknown as DevotionLogRow[]);
    }

    if (!profilesResult.error) {
      const profiles = ((profilesResult.data ?? []) as unknown as ProfileRow[]).reduce<
        Record<string, ProfileRow>
      >((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      setAllProfiles(profiles);
    }

    if (!readingResult.error) {
      setAllReadingLogs((readingResult.data ?? []) as unknown as ReadingLogRow[]);
    }

    if (!prayerResult.error) {
      setAllPrayerNotes((prayerResult.data ?? []) as unknown as PrayerNoteRow[]);
    }

    const nextActivityEvents: ActivityEvent[] = [];

    if (!logsResult.error) {
      ((logsResult.data ?? []) as unknown as DevotionLogRow[]).forEach((log) => {
        nextActivityEvents.push({
          userId: log.user_id,
          date: log.date,
          kind: 'devotion',
        });
      });
    }

    if (!readingResult.error) {
      ((readingResult.data ?? []) as ReadingLogRow[]).forEach((row) => {
          nextActivityEvents.push({
            userId: row.user_id,
            date: row.date,
            kind: 'reading',
          });
        });
    }

    if (!prayerResult.error) {
      ((prayerResult.data ?? []) as PrayerNoteRow[]).forEach((row) => {
        nextActivityEvents.push({
          userId: row.user_id,
          date: row.created_at.slice(0, 10),
          kind: 'prayer',
        });
      });
    }

    if (!reflectionResult.error) {
      (
        (reflectionResult.data ?? []) as Array<{
          user_id: string;
          date: string | null;
          created_at: string;
        }>
      ).forEach((row) => {
        nextActivityEvents.push({
          userId: row.user_id,
          date: row.date ?? row.created_at.slice(0, 10),
          kind: 'reflection',
        });
      });
    }

    if (!testimonyResult.error) {
      (
        (testimonyResult.data ?? []) as Array<{ user_id: string; created_at: string }>
      ).forEach((row) => {
        nextActivityEvents.push({
          userId: row.user_id,
          date: row.created_at.slice(0, 10),
          kind: 'testimony',
        });
      });
    }

    setActivityEvents(nextActivityEvents);

    setIsOverviewLoading(false);
  }, [session]);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(activeConfig.name)
      .select(activeConfig.selectColumns.join(','), { count: 'exact' })
      .range(from, to);

    if (activeConfig.order) {
      query = query.order(activeConfig.order.column, {
        ascending: activeConfig.order.ascending,
      });
    }

    const { count, data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setTotalRows(0);
    } else {
      const nextRows = ((data ?? []) as unknown as DataRow[]).map((row) => ({
        ...row,
        user_name: getUserLabel(row[activeConfig.ownerColumn]),
      }));

      setRows(nextRows);
      setTotalRows(count ?? nextRows.length);
    }

    setIsLoading(false);
  }, [activeConfig, getUserLabel, page, pageSize]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadUserDirectory();
    } else {
      setUserDirectory({});
    }
  }, [loadUserDirectory, session]);

  useEffect(() => {
    if (session) {
      loadRows();
    } else {
      setRows([]);
      setTotalRows(0);
    }
  }, [loadRows, session]);

  useEffect(() => {
    if (session) {
      loadSelectedUserDetails();
    }
  }, [loadSelectedUserDetails, session]);

  useEffect(() => {
    if (session) {
      loadOverview();
    } else {
      setAllDevotionLogs([]);
    }
  }, [loadOverview, session]);

  useEffect(() => {
    setPage(0);
  }, [activeTable, pageSize]);

  const lastPage = Math.max(0, Math.ceil(totalRows / pageSize) - 1);
  const pageStart = totalRows === 0 ? 0 : page * pageSize + 1;
  const pageEnd = Math.min(totalRows, (page + 1) * pageSize);

  if (!session) {
    return <AuthPanel />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Connected to {new URL(supabaseUrl).host}</p>
          <h1>Honara7ty Data</h1>
        </div>
        <button className="ghost-button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <section className="workspace">
        <aside className="table-nav" aria-label="Admin navigation">
          <button
            type="button"
            className={view === 'overview' ? 'active' : ''}
            onClick={() => setView('overview')}
          >
            <span>Overview</span>
            <small>كل المستخدمين، التقويم، وعدد مرات الخلوة.</small>
          </button>
          <div className="nav-section-label">Tables</div>
          {tables.map((table) => (
            <button
              type="button"
              key={table.name}
              className={view === 'table' && table.name === activeTable ? 'active' : ''}
              onClick={() => {
                setView('table');
                setActiveTable(table.name);
                setPage(0);
              }}
            >
              <span>{table.label}</span>
              <small>{table.description}</small>
            </button>
          ))}
        </aside>

        <section className="data-panel">
          {view === 'overview' ? (
          <>
            <div className="overview-panel">
              <div className="user-details-header">
                <div>
                  <h2>All users overview</h2>
                  <p>كل الإحصائيات متقسمة في tabs.</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={loadOverview}
                  disabled={isOverviewLoading}
                >
                  {isOverviewLoading ? 'Loading...' : 'Refresh overview'}
                </button>
              </div>

              <div className="overview-tabs" aria-label="Overview tabs">
                {[
                  ['summary', 'Summary'],
                  ['users', 'Users'],
                  ['features', 'Features'],
                  ['churches', 'Churches'],
                  ['trends', 'Trends'],
                ].map(([tab, label]) => (
                  <button
                    type="button"
                    key={tab}
                    className={overviewTab === tab ? 'active' : ''}
                    onClick={() => setOverviewTab(tab as OverviewTab)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {overviewTab === 'summary' ? (
                <>
                  <div className="detail-grid overview-stats">
                    <div>
                      <span>Total users</span>
                      <strong>{users.length}</strong>
                    </div>
                    <div>
                      <span>New today</span>
                      <strong>{newTodayUsers.length}</strong>
                    </div>
                    <div>
                      <span>New 7 days</span>
                      <strong>{new7DayUsers.length}</strong>
                    </div>
                    <div>
                      <span>New 30 days</span>
                      <strong>{new30DayUsers.length}</strong>
                    </div>
                  </div>

                  <div className="detail-grid overview-stats">
                    <div>
                      <span>Did it today</span>
                      <strong>{todayCompletedUserIds.size}</strong>
                    </div>
                    <div>
                      <span>Total completed</span>
                      <strong>{completedLogs.length}</strong>
                    </div>
                    <div>
                      <span>Avg per user</span>
                      <strong>{averageCompletedPerUser}</strong>
                    </div>
                  </div>

                  <div className="detail-grid overview-stats">
                    <div>
                      <span>Active today</span>
                      <strong>{activeTodayUserIds.size}</strong>
                    </div>
                    <div>
                      <span>Active 7 days</span>
                      <strong>{active7DayUserIds.size} ({active7Rate}%)</strong>
                    </div>
                    <div>
                      <span>Active 30 days</span>
                      <strong>{active30DayUserIds.size} ({active30Rate}%)</strong>
                    </div>
                    <div>
                      <span>No visible activity</span>
                      <strong>{inactiveUserCount}</strong>
                    </div>
                  </div>

                  <div className="detail-grid overview-stats">
                    <div>
                      <span>Devotion adoption</span>
                      <strong>{usersWithDevotion.size} ({devotionAdoptionRate}%)</strong>
                    </div>
                    <div>
                      <span>7d / 30d retention</span>
                      <strong>{sevenOfThirtyRate}%</strong>
                    </div>
                    <div>
                      <span>Chapters read</span>
                      <strong>{allReadingLogs.length}</strong>
                    </div>
                    <div>
                      <span>Answered prayer rate</span>
                      <strong>{prayerAnswerRate}%</strong>
                    </div>
                  </div>

                  <div className="distribution-panel">
                    <div>
                      <h3>Users by completion count</h3>
                      <p>كام واحد عمل الخلوة كذا مرة.</p>
                    </div>
                    <div className="distribution-list">
                      {completionDistribution.map((item) => (
                        <div className="distribution-item" key={item.completedCount}>
                          <strong>{item.userCount}</strong>
                          <span>
                            users did it {item.completedCount}{' '}
                            {item.completedCount === 1 ? 'time' : 'times'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="distribution-panel">
                    <div>
                      <h3>Current streak buckets</h3>
                      <p>تقسيم المستخدمين حسب الاستمرارية الحالية.</p>
                    </div>
                    <div className="distribution-list">
                      {streakBuckets.map((bucket) => (
                        <div className="distribution-item" key={bucket.label}>
                          <strong>{bucket.count}</strong>
                          <span>{bucket.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="top-users-panel">
                    <div>
                      <h3>Newest accounts</h3>
                      <p>آخر حسابات اتعملت من Supabase Auth.</p>
                    </div>
                    <div className="top-users-list">
                      {recentNewUsers.map((user) => (
                        <div className="top-user-row" key={user.id}>
                          <div>
                            <strong>{user.fullName}</strong>
                            <span>{user.email ?? user.id}</span>
                          </div>
                          <div>
                            <strong>{user.accountCreatedDate ?? '-'}</strong>
                            <span>{user.activityCount} activities</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="top-users-panel">
                    <div>
                      <h3>Most active users</h3>
                      <p>أكتر ناس ظهر منهم استخدام داخل التطبيق.</p>
                    </div>
                    <div className="top-users-list">
                      {topActiveUsers.map((user) => (
                        <div className="top-user-row" key={user.id}>
                          <div>
                            <strong>{user.fullName}</strong>
                            <span>{user.email ?? user.id}</span>
                          </div>
                          <div>
                            <strong>{user.activityCount}</strong>
                            <span>last: {user.lastActivity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="top-users-panel">
                    <div>
                      <h3>Needs follow-up</h3>
                      <p>مستخدمين خامدين أو بدون أي نشاط ظاهر.</p>
                    </div>
                    <div className="top-users-list">
                      {[...dormantUsers, ...noActivityUsers].slice(0, 10).map((user) => (
                        <div className="top-user-row" key={user.id}>
                          <div>
                            <strong>{user.fullName}</strong>
                            <span>{user.email ?? user.id}</span>
                          </div>
                          <div>
                            <strong>{user.lastActivity}</strong>
                            <span>{user.activityCount ? 'dormant' : 'no activity'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {overviewTab === 'users' ? (
                <>
                  <div className="overview-filters">
                    <label>
                      Search
                      <input
                        type="search"
                        value={overviewSearch}
                        placeholder="Name, email, church, sect..."
                        onChange={(event) => setOverviewSearch(event.target.value)}
                      />
                    </label>
                    <label>
                      Min times
                      <input
                        type="number"
                        min="0"
                        value={minCompleted}
                        onChange={(event) => setMinCompleted(event.target.value)}
                      />
                    </label>
                    <label>
                      Max times
                      <input
                        type="number"
                        min="0"
                        value={maxCompleted}
                        onChange={(event) => setMaxCompleted(event.target.value)}
                      />
                    </label>
                    <label>
                      Today
                      <select
                        value={todayFilter}
                        onChange={(event) => setTodayFilter(event.target.value as TodayFilter)}
                      >
                        <option value="all">All</option>
                        <option value="done">Done today</option>
                        <option value="not_done">Not done today</option>
                      </select>
                    </label>
                  </div>

                  <div className="calendar-header">
              <button
                className="secondary-button"
                onClick={() =>
                  setVisibleMonth(
                    (current) =>
                      new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
              >
                Previous month
              </button>
              <strong>
                {visibleMonth.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              <button
                className="secondary-button"
                onClick={() =>
                  setVisibleMonth(
                    (current) =>
                      new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
              >
                Next month
              </button>
                  </div>

                  <div className="users-calendar-list">
              {filteredUserSummaries.map((user) => (
                <article className="user-calendar-card" key={user.id}>
                  <div className="user-calendar-header">
                    <div>
                      <strong>{user.fullName}</strong>
                      <small>{user.email ?? user.id}</small>
                      <small>
                        {[user.profile?.church, user.profile?.sect]
                          .filter(Boolean)
                          .join(' · ') || 'No profile details'}
                      </small>
                    </div>
                    <div className={user.completedToday ? 'today-pill done' : 'today-pill'}>
                      {user.completedToday ? 'Today done' : 'Not today'}
                    </div>
                  </div>
                  <div className="user-calendar-stats">
                    <span>joined {user.accountCreatedDate ?? '-'}</span>
                    <span>{user.completedCount} total</span>
                    <span>{user.monthCompletedCount} this month</span>
                    <span>{user.streaks.current} current streak</span>
                    <span>{user.streaks.longest} longest streak</span>
                  </div>
                  <div className="mini-calendar" aria-label={`${user.fullName} calendar`}>
                    {visibleMonthDays.map((day) => {
                      const log = day.isoDate ? user.logsByDate[day.isoDate] : null;
                      const className = log?.completed
                        ? 'mini-day completed'
                        : log
                        ? 'mini-day missed'
                        : 'mini-day';

                      return (
                        <div className={className} key={day.key} title={day.isoDate}>
                          {day.empty ? '' : day.day}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
                  </div>

                  <div className="user-details">
            <div className="user-details-header">
              <div>
                <h2>User details</h2>
                <p>Profile, devotion calendar, and completion counts.</p>
              </div>
              <label className="user-select-label">
                User
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email ? `${user.fullName} (${user.email})` : user.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isUserDetailsLoading ? (
              <div className="empty-state">Loading user details...</div>
            ) : selectedUser ? (
              <>
                <div className="detail-grid">
                  <div>
                    <span>Name</span>
                    <strong>{selectedUser.fullName}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{selectedUser.email ?? '-'}</strong>
                  </div>
                  <div>
                    <span>Joined</span>
                    <strong>{isoDateFromTimestamp(selectedUser.createdAt) ?? '-'}</strong>
                  </div>
                  <div>
                    <span>Church</span>
                    <strong>{selectedProfile?.church ?? '-'}</strong>
                  </div>
                  <div>
                    <span>Devotion time</span>
                    <strong>{selectedProfile?.devotion_time ?? '-'}</strong>
                  </div>
                  <div>
                    <span>Total completed</span>
                    <strong>{selectedCompletedLogs.length}</strong>
                  </div>
                  <div>
                    <span>This month</span>
                    <strong>{monthCompletedCount}</strong>
                  </div>
                  <div>
                    <span>Logged days</span>
                    <strong>{selectedUserLogs.length}</strong>
                  </div>
                  <div>
                    <span>Missed logs</span>
                    <strong>
                      {selectedUserLogs.filter((log) => !log.completed).length}
                    </strong>
                  </div>
                </div>

                <div className="calendar-header">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setVisibleMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                  >
                    Previous month
                  </button>
                  <strong>
                    {visibleMonth.toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setVisibleMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                  >
                    Next month
                  </button>
                </div>

                <div className="calendar-grid" aria-label="User devotion calendar">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div className="calendar-weekday" key={day}>
                      {day}
                    </div>
                  ))}
                  {visibleMonthDays.map((day) => {
                    const log = day.isoDate ? selectedLogsByDate[day.isoDate] : null;
                    const className = log?.completed
                      ? 'calendar-day completed'
                      : log
                      ? 'calendar-day missed'
                      : 'calendar-day';

                    return (
                      <div className={className} key={day.key}>
                        {day.empty ? null : (
                          <>
                            <span>{day.day}</span>
                            {log ? (
                              <small>
                                {log.completed ? 'Done' : 'No'}
                              </small>
                            ) : (
                              <small>No log</small>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state">
                No user directory available. Run the admin SQL and sign in as admin.
              </div>
            )}
                  </div>
                </>
              ) : null}

              {overviewTab === 'features' ? (
                <>
                <div className="top-users-panel">
                  <div>
                    <h3>Feature usage</h3>
                    <p>كام يوز استخدم كل جزء في التطبيق.</p>
                  </div>
                  <div className="top-users-list">
                    {featureUsage.map((feature) => (
                      <div className="top-user-row" key={feature.kind}>
                        <div>
                          <strong>{feature.kind}</strong>
                          <span>{feature.events} total events</span>
                        </div>
                        <div>
                          <strong>{feature.users}</strong>
                          <span>{feature.rate}% of users</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="top-users-panel">
                  <div>
                    <h3>Reading depth</h3>
                    <p>أكتر أسفار/أرقام كتب اتقرأت حسب reading log.</p>
                  </div>
                  <div className="top-users-list">
                    {topReadingBooks.map((book) => (
                      <div className="top-user-row" key={book.book}>
                        <div>
                          <strong>{book.displayName}</strong>
                          <span>
                            ID {book.book} · {book.testament === 'old' ? 'العهد القديم' : book.testament === 'new' ? 'العهد الجديد' : 'غير معروف'}
                          </span>
                        </div>
                        <div>
                          <strong>{book.chapters}</strong>
                          <span>chapters</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="detail-grid overview-stats">
                  <div>
                    <span>Total prayer notes</span>
                    <strong>{allPrayerNotes.length}</strong>
                  </div>
                  <div>
                    <span>Answered prayers</span>
                    <strong>{answeredPrayerCount}</strong>
                  </div>
                  <div>
                    <span>Answered rate</span>
                    <strong>{prayerAnswerRate}%</strong>
                  </div>
                  <div>
                    <span>Total chapters read</span>
                    <strong>{allReadingLogs.length}</strong>
                  </div>
                </div>
                </>
              ) : null}

              {overviewTab === 'churches' ? (
                <>
                  <div className="top-users-panel">
                    <div>
                      <h3>Church activity</h3>
                      <p>نشاط المستخدمين حسب الكنيسة.</p>
                    </div>
                    <div className="top-users-list">
                      {churchBreakdown.map((church) => (
                        <div className="top-user-row" key={church.church}>
                          <div>
                            <strong>{church.church}</strong>
                            <span>{church.users} users · {church.active30} active 30d</span>
                          </div>
                          <div>
                            <strong>{church.completed}</strong>
                            <span>avg {church.avgCompleted}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="distribution-panel">
                    <div>
                      <h3>Sect breakdown</h3>
                      <p>عدد المستخدمين حسب الطائفة.</p>
                    </div>
                    <div className="distribution-list">
                      {sectBreakdown.map((sect) => (
                        <div className="distribution-item" key={sect.sect}>
                          <strong>{sect.users}</strong>
                          <span>{sect.sect}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {overviewTab === 'trends' ? (
                <>
                <div className="top-users-panel">
                  <div>
                    <h3>14 day trend</h3>
                    <p>نشاط يومي ومين عمل الخلوة.</p>
                  </div>
                  <div className="trend-list">
                    {dailyTrends.map((day) => (
                      <div className="trend-row" key={day.date}>
                        <span>{day.date.slice(5)}</span>
                        <div>
                          <div
                            className="trend-bar active"
                            style={{ width: `${(day.activeUsers / maxTrendValue) * 100}%` }}
                          />
                          <small>{day.activeUsers} active</small>
                        </div>
                        <div>
                          <div
                            className="trend-bar devotion"
                            style={{ width: `${(day.devotions / maxTrendValue) * 100}%` }}
                          />
                          <small>{day.devotions} devotion</small>
                        </div>
                        <div>
                          <div
                            className="trend-bar signups"
                            style={{ width: `${(day.newUsers / maxTrendValue) * 100}%` }}
                          />
                          <small>{day.newUsers} new</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="top-users-panel">
                  <div>
                    <h3>Longest streak leaders</h3>
                    <p>أعلى مستخدمين في أطول streak للخلوة.</p>
                  </div>
                  <div className="top-users-list">
                    {longestStreakUsers.map((user) => (
                      <div className="top-user-row" key={user.id}>
                        <div>
                          <strong>{user.fullName}</strong>
                          <span>{user.email ?? user.id}</span>
                        </div>
                        <div>
                          <strong>{user.streaks.longest}</strong>
                          <span>current {user.streaks.current}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
              ) : null}
            </div>
          </>
          ) : (
          <>

          <div className="panel-header">
            <div>
              <h2>{activeConfig.label}</h2>
              <p>{activeConfig.description}</p>
            </div>
            <button className="secondary-button" onClick={loadRows} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="table-controls">
            <div className="row-count">
              {isDirectoryLoading ? 'Loading users...' : `${pageStart}-${pageEnd} of ${totalRows} rows`}
            </div>
            <label className="page-size-label">
              Rows
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="pagination-buttons" aria-label="Pagination controls">
              <button
                className="secondary-button"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {lastPage + 1}
              </span>
              <button
                className="secondary-button"
                disabled={page >= lastPage || isLoading}
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              >
                Next
              </button>
            </div>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {isLoading ? (
            <div className="empty-state">Loading rows...</div>
          ) : (
            <DataTable rows={rows} columns={activeConfig.displayColumns} />
          )}
          </>
          )}
        </section>
      </section>
    </main>
  );
}
