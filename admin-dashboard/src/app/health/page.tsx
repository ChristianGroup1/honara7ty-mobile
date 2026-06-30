'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Users,
  Calendar,
  Flame,
  Activity,
  BookOpen,
  List,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayPoint {
  day: string;        // e.g. "الإثنين"
  date: string;       // YYYY-MM-DD
  tookDevotion: number;   // unique users who completed devotion
  didNotTake: number;     // logged but not completed (completed=false)
  totalLogged: number;    // total who logged anything that day
  rate: number;           // % out of all registered users
}

interface TodayDevotionUser {
  user_id: string;
  full_name: string;
  email: string;
  reading_book: string | null;
  reading_chapter: number | null;
  xp: number;
  church: string;
}

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function statusColor(rate: number) {
  if (rate >= 60) return 'var(--success)';
  if (rate >= 30) return 'var(--warning)';
  return 'var(--danger)';
}

const formatMonthName = (monthStr: string) => {
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return `${months[monthIdx]} ${year}`;
  }
  return monthStr;
};

const getRangeLabel = (range: string) => {
  if (range === '7d') return 'آخر ٧ أيام';
  if (range === '30d') return 'آخر ٣٠ يوم';
  if (range === '6m') return 'آخر ٦ شهور';
  if (range === '1y') return 'آخر سنة';
  if (range === '2y') return 'آخر سنتين';
  return 'الفترة المحددة';
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  const [totalUsers, setTotalUsers] = useState(0);

  // Today's devotion snapshot
  const [todayTook, setTodayTook] = useState(0);
  const [todayDidNot, setTodayDidNot] = useState(0);

  // Streak: users who took devotion ALL 7 days
  const [consistentUsers, setConsistentUsers] = useState(0);

  // Users who took devotion at least once in last 7 days
  const [activeLastWeek, setActiveLastWeek] = useState(0);



  // 7-day chart data
  const [chartData, setChartData] = useState<DayPoint[]>([]);

  // Today's devotion user list
  const [todayUserList, setTodayUserList] = useState<TodayDevotionUser[]>([]);
  const [viewDate, setViewDate] = useState<'today' | 'yesterday'>('today');
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Advantage / Drawback Metrics
  const [groupUsersCount, setGroupUsersCount] = useState(0);
  const [soloUsersCount, setSoloUsersCount] = useState(0);
  const [groupCompRate, setGroupCompRate] = useState(0);
  const [soloCompRate, setSoloCompRate] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0); // churned (> 14 days)

  // Advanced Spiritual Insights Metrics
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [answeredPrayersRate, setAnsweredPrayersRate] = useState(0);
  const [totalReflections, setTotalReflections] = useState(0);
  const [topBooks, setTopBooks] = useState<{ book: string; count: number }[]>([]);
  const [devotionTimeDist, setDevotionTimeDist] = useState({ morning: 0, afternoon: 0, evening: 0, night: 0 });

  // Time period filter & registration stats
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '1y' | '2y' | 'custom'>('7d');
  const [regStats, setRegStats] = useState<{ month: string; count: number }[]>([]);

  // Custom period datepicker states & registrations count
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [newRegistrationsCount, setNewRegistrationsCount] = useState<number>(0);

  // Product Engagement & Retention Cohort Metrics
  const [activatedCount, setActivatedCount] = useState(0);
  const [mauCount, setMauCount] = useState(0);
  const [wauCount, setWauCount] = useState(0);
  const [dauMauRatio, setDauMauRatio] = useState(0);
  const [wauMauRatio, setWauMauRatio] = useState(0);
  const [zeroActivityCount, setZeroActivityCount] = useState(0);

  // Community Demographics & Memorization Metrics
  const [topChurches, setTopChurches] = useState<{ name: string; count: number }[]>([]);
  const [topSects, setTopSects] = useState<{ name: string; count: number }[]>([]);
  const [memoStats, setMemoStats] = useState({ totalTests: 0, avgScore: 0, totalVerses: 0, totalTimeHours: 0 });

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // ── 1. Total registered users ─────────────────────────────────────────
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      const total = userCount || 0;
      setTotalUsers(total);

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, xp, updated_at, devotion_time, church, sect');

      // ── 2. Today's devotion ───────────────────────────────────────────────
      const { data: todayLogs } = await supabase
        .from('devotion_log')
        .select('user_id, completed, reading_book, reading_chapter')
        .eq('date', todayStr);

      const todayCompleted = (todayLogs ?? []).filter(r => r.completed).length;
      const todayNotCompleted = (todayLogs ?? []).filter(r => !r.completed).length;
      setTodayTook(todayCompleted);
      setTodayDidNot(todayNotCompleted);

      // ── 2b. Build today's user list with name & church from RPC ─────────────
      const completedLogs = (todayLogs ?? []).filter(r => r.completed);
      if (completedLogs.length > 0) {
        const completedIds = new Set(completedLogs.map(r => r.user_id));

        // Try new direct RPC first passing the completedIds to avoid 1000 row limits
        let nameMap = new Map<string, { full_name: string; email: string; church: string; xp: number }>();
        const completedIdsArr = [...completedIds];
        const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_users_by_ids', {
          user_ids: completedIdsArr
        });
        
        if (rpcError) {
          console.error('[health] get_users_by_ids RPC failed:', rpcError.message);
        }

        if (rpcUsers && Array.isArray(rpcUsers)) {
          rpcUsers.forEach((u: any) => {
            nameMap.set(u.id, {
              full_name: u.full_name || '',
              email: u.email || '',
              church: u.church || '—',
              xp: u.xp || 0,
            });
          });
        }

        // Fallback: profiles table for remaining IDs
        const missingIds = completedIdsArr.filter(id => !nameMap.has(id));
        if (missingIds.length > 0) {
          console.warn('[health] Falling back to profiles table for', missingIds.length, 'missing IDs');
          const { data: profilesForToday } = await supabase
            .from('profiles')
            .select('id, xp, church')
            .in('id', missingIds);
          (profilesForToday ?? []).forEach(p => {
            nameMap.set(p.id, {
              full_name: '',
              email: '',
              church: p.church || '—',
              xp: p.xp || 0,
            });
          });
        }

        let debugStr = '';
        if (rpcError) {
          debugStr += `خطأ الـ RPC: ${rpcError.message}. `;
        } else if (rpcUsers) {
          const matchedIds = rpcUsers.map((u: any) => u.full_name || u.id);
          debugStr += `الـ RPC رجع ${rpcUsers.length} مستخدم نشط من أصل ${completedIdsArr.length}. المتطابقين بالاسم: [${matchedIds.slice(0, 5).join(', ')}]. `;
        } else {
          debugStr += 'الـ RPC رجع فارغ. ';
        }
        setDebugInfo(debugStr);

        const userList: TodayDevotionUser[] = completedLogs.map(log => {
          const info = nameMap.get(log.user_id);
          return {
            user_id: log.user_id,
            full_name: info?.full_name || '',
            email: info?.email || '',
            reading_book: log.reading_book ?? null,
            reading_chapter: log.reading_chapter ?? null,
            xp: info?.xp ?? 0,
            church: info?.church ?? '—',
          };
        });
        setTodayUserList(userList);
      } else {
        setTodayUserList([]);
      }

      // ── 3. Fetch devotion logs dynamically based on selected date range ───
      let startDateStr = '';
      let endDateStr = todayStr;
      let daysToBuild = 7;

      if (timeRange === '7d') {
        daysToBuild = 7;
        const d = new Date();
        d.setDate(d.getDate() - 6);
        startDateStr = d.toISOString().split('T')[0];
      } else if (timeRange === '30d') {
        daysToBuild = 30;
        const d = new Date();
        d.setDate(d.getDate() - 29);
        startDateStr = d.toISOString().split('T')[0];
      } else if (timeRange === '6m') {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        startDateStr = d.toISOString().split('T')[0];
        const diffTime = Math.abs(new Date().getTime() - d.getTime());
        daysToBuild = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } else if (timeRange === '1y') {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        startDateStr = d.toISOString().split('T')[0];
        const diffTime = Math.abs(new Date().getTime() - d.getTime());
        daysToBuild = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } else if (timeRange === '2y') {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 2);
        startDateStr = d.toISOString().split('T')[0];
        const diffTime = Math.abs(new Date().getTime() - d.getTime());
        daysToBuild = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } else {
        // Custom Range
        startDateStr = customStartDate;
        endDateStr = customEndDate;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        daysToBuild = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      const { data: rangeLogsRaw } = await supabase.rpc('get_devotion_logs_in_range', {
        start_date: startDateStr,
        end_date: endDateStr
      });
      const rangeLogs = (rangeLogsRaw ?? []) as Array<{ user_id: string; date: string; completed: boolean }>;

      // Group by date
      const logsByDate = new Map<string, Array<{ user_id: string; completed: boolean }>>();
      rangeLogs.forEach(log => {
        if (!logsByDate.has(log.date)) logsByDate.set(log.date, []);
        logsByDate.get(log.date)!.push(log);
      });

      // Build points dynamically based on range size
      const points: DayPoint[] = [];
      const periodUserSets: string[][] = [];

      let groupUnit: 'day' | 'week' | 'month' = 'day';
      if (daysToBuild > 35 && daysToBuild <= 180) {
        groupUnit = 'week';
      } else if (daysToBuild > 180) {
        groupUnit = 'month';
      }

      if (groupUnit === 'day') {
        for (let i = daysToBuild - 1; i >= 0; i--) {
          const d = new Date(endDateStr);
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const dayLabel = timeRange !== '7d'
            ? `${d.getDate()}/${d.getMonth() + 1}`
            : DAY_NAMES[d.getDay()];

          const dayLogs = logsByDate.get(dStr) ?? [];
          const took = dayLogs.filter(r => r.completed).map(r => r.user_id);
          const didNot = dayLogs.filter(r => !r.completed).length;
          const rate = total > 0 ? Math.round((took.length / total) * 100) : 0;

          periodUserSets.push(took);
          points.push({
            day: dayLabel,
            date: dStr,
            tookDevotion: took.length,
            didNotTake: didNot,
            totalLogged: dayLogs.length,
            rate,
          });
        }
      } else if (groupUnit === 'week') {
        const totalWeeks = Math.ceil(daysToBuild / 7);
        for (let w = totalWeeks - 1; w >= 0; w--) {
          const wEnd = new Date(endDateStr);
          wEnd.setDate(wEnd.getDate() - w * 7);
          const wStart = new Date(wEnd);
          wStart.setDate(wStart.getDate() - 6);

          const wEndStr = wEnd.toISOString().split('T')[0];
          const wStartStr = wStart.toISOString().split('T')[0];

          const weekLogs = (rangeLogs ?? []).filter(l => l.date >= wStartStr && l.date <= wEndStr);
          const dailyCounts: number[] = [];
          const allWeekUids = new Set<string>();

          for (let d = 0; d < 7; d++) {
            const cur = new Date(wStart);
            cur.setDate(cur.getDate() + d);
            const curStr = cur.toISOString().split('T')[0];
            if (curStr > endDateStr) continue;

            const dayLogs = (rangeLogs ?? []).filter(l => l.date === curStr && l.completed);
            dailyCounts.push(dayLogs.length);
            dayLogs.forEach(l => allWeekUids.add(l.user_id));
          }

          const avgTook = dailyCounts.length > 0 ? Math.round(dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length) : 0;
          const rate = total > 0 ? Math.round((avgTook / total) * 100) : 0;

          periodUserSets.push(Array.from(allWeekUids));
          points.push({
            day: `أسبوع ${totalWeeks - w}`,
            date: `${wStart.getDate()}/${wStart.getMonth() + 1} - ${wEnd.getDate()}/${wEnd.getMonth() + 1}`,
            tookDevotion: avgTook,
            didNotTake: 0,
            totalLogged: weekLogs.length,
            rate,
          });
        }
      } else {
        const monthlyLogsMap = new Map<string, Array<{ user_id: string; date: string; completed: boolean }>>();
        (rangeLogs ?? []).forEach(log => {
          const ym = log.date.slice(0, 7);
          if (!monthlyLogsMap.has(ym)) monthlyLogsMap.set(ym, []);
          monthlyLogsMap.get(ym)!.push(log);
        });

        const monthsList: string[] = [];
        let cur = new Date(startDateStr);
        const end = new Date(endDateStr);
        while (cur <= end) {
          const ym = cur.toISOString().slice(0, 7);
          if (!monthsList.includes(ym)) monthsList.push(ym);
          cur.setMonth(cur.getMonth() + 1);
        }

        monthsList.forEach(ym => {
          const mLogs = monthlyLogsMap.get(ym) ?? [];
          const mLogsCompleted = mLogs.filter(l => l.completed);

          const uniqueDays = new Set(mLogs.map(l => l.date)).size || 30;
          const avgTook = Math.round(mLogsCompleted.length / uniqueDays);
          const rate = total > 0 ? Math.round((avgTook / total) * 100) : 0;

          const monthUids = new Set(mLogsCompleted.map(l => l.user_id));
          periodUserSets.push(Array.from(monthUids));

          points.push({
            day: formatMonthName(ym),
            date: ym,
            tookDevotion: avgTook,
            didNotTake: 0,
            totalLogged: mLogs.length,
            rate,
          });
        });
      }
      setChartData(points);

      // ── 4. Users who completed devotion every single day in the period ────
      if (periodUserSets.length > 0) {
        const sets = periodUserSets.map(arr => new Set(arr));
        const consistent = new Set(sets[0]);
        for (let i = 1; i < sets.length; i++) {
          for (const uid of [...consistent]) {
            if (!sets[i].has(uid)) consistent.delete(uid);
          }
        }
        setConsistentUsers(consistent.size);
      } else {
        setConsistentUsers(0);
      }

      // ── 5. Users active (took devotion) at least once in period ───────────
      const allPeriodIds = new Set(periodUserSets.flat());
      setActiveLastWeek(allPeriodIds.size);

      // ── 5b. Fetch user registration growth statistics ─────────────────────
      const { data: regData } = await supabase.rpc('get_registration_stats');
      if (regData && Array.isArray(regData)) {
        setRegStats(regData.map(r => ({
          month: r.reg_month,
          count: Number(r.reg_count)
        })));
      }

      // ── 5c. Fetch specific registrations count for current period ─────────
      const { data: customRegCount } = await supabase.rpc('get_new_registrations_count', {
        start_date: new Date(startDateStr).toISOString(),
        end_date: new Date(endDateStr + 'T23:59:59').toISOString()
      });
      setNewRegistrationsCount(Number(customRegCount || 0));

      // ── 5d. Fetch Product Engagement Metrics ──────────────────────────────
      const { data: prodMetrics } = await supabase.rpc('get_product_engagement_metrics');
      if (prodMetrics && prodMetrics.length > 0) {
        const m = prodMetrics[0];
        const actCount = Number(m.activated_users || 0);
        setActivatedCount(actCount);
        const mCount = Number(m.mau_users || 0);
        setMauCount(mCount);
        const wCount = Number(m.wau_users || 0);
        setWauCount(wCount);
        
        // DAU/MAU
        const dauCount = Number(m.dau_users || 0);
        setDauMauRatio(mCount > 0 ? Math.round((dauCount / mCount) * 100) : 0);
        
        // 7d / 30d retention (WAU/MAU)
        setWauMauRatio(mCount > 0 ? Math.round((wCount / mCount) * 100) : 0);
        
        // Zero activity users
        const tot = Number(m.total_users || 0);
        setZeroActivityCount(Math.max(0, tot - actCount));
      }

      // ── 6. Group Advantage vs Solo Completion rates (today) ──────────────
      const { data: groupMembers } = await supabase
        .from('devotion_group_members')
        .select('user_id');
      
      const groupUids = new Set((groupMembers ?? []).map(m => m.user_id));
      const totalGroupUsers = groupUids.size;
      const totalSoloUsers = Math.max(0, total - totalGroupUsers);
      setGroupUsersCount(totalGroupUsers);
      setSoloUsersCount(totalSoloUsers);

      const todayCompletedLogs = (todayLogs ?? []).filter(r => r.completed);
      const todayGroupCompletions = todayCompletedLogs.filter(r => groupUids.has(r.user_id)).length;
      const todaySoloCompletions = Math.max(0, todayCompletedLogs.length - todayGroupCompletions);

      const groupRate = totalGroupUsers > 0 ? Math.round((todayGroupCompletions / totalGroupUsers) * 100) : 0;
      const soloRate = totalSoloUsers > 0 ? Math.round((todaySoloCompletions / totalSoloUsers) * 100) : 0;
      setGroupCompRate(groupRate);
      setSoloCompRate(soloRate);

      // ── 7. Churn Analysis: Inactive > 14 days ──────────────────────────────
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const inactiveUsers = (allProfiles ?? []).filter(p => {
        if (!p.updated_at) return true;
        return new Date(p.updated_at) < fourteenDaysAgo;
      });
      setInactiveCount(inactiveUsers.length);

      // ── 8. Advanced Spiritual Insights: Prayers ───────────────────────────
      const { data: prayersData } = await supabase
        .from('prayer_notes')
        .select('is_answered');
      
      const totalPr = prayersData?.length || 0;
      const answeredPr = prayersData?.filter(p => p.is_answered).length || 0;
      setTotalPrayers(totalPr);
      setAnsweredPrayersRate(totalPr > 0 ? Math.round((answeredPr / totalPr) * 100) : 0);

      // ── 9. Reflections Count ──────────────────────────────────────────────
      const { count: reflectionsCount } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true });
      setTotalReflections(reflectionsCount || 0);

      // ── 10. Most Popular Bible Books (Last 30 Days) ────────────────────────
      const { data: popularBooks } = await supabase
        .from('devotion_log')
        .select('reading_book')
        .not('reading_book', 'is', null)
        .eq('completed', true)
        .limit(300);

      const bookCounts: Record<string, number> = {};
      (popularBooks ?? []).forEach(row => {
        if (row.reading_book) {
          bookCounts[row.reading_book] = (bookCounts[row.reading_book] || 0) + 1;
        }
      });

      const bookList = Object.entries(bookCounts)
        .map(([book, count]) => ({ book, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // top 5
      setTopBooks(bookList);

      // ── 11. Preferred Devotion Time Distribution ─────────────────────────
      let morning = 0;   // 5:00 AM - 11:59 AM
      let afternoon = 0; // 12:00 PM - 4:59 PM
      let evening = 0;   // 5:00 PM - 9:59 PM
      let night = 0;     // 10:00 PM - 4:59 AM

      (allProfiles ?? []).forEach(p => {
        if (!p.devotion_time) return;
        const timePart = p.devotion_time.split(':');
        if (timePart.length >= 2) {
          const hour = parseInt(timePart[0]);
          if (hour >= 5 && hour < 12) {
            morning++;
          } else if (hour >= 12 && hour < 17) {
            afternoon++;
          } else if (hour >= 17 && hour < 22) {
            evening++;
          } else {
            night++;
          }
        }
      });
      setDevotionTimeDist({ morning, afternoon, evening, night });

      // ── 12. Community Demographics: Top Churches & Sects ─────────────────
      const churchMap: Record<string, number> = {};
      const sectMap: Record<string, number> = {};
      (allProfiles ?? []).forEach((p: { church?: string; sect?: string }) => {
        if (p.church && p.church.trim() !== '') {
          const ch = p.church.trim();
          churchMap[ch] = (churchMap[ch] || 0) + 1;
        }
        if (p.sect && p.sect.trim() !== '') {
          const sc = p.sect.trim();
          sectMap[sc] = (sectMap[sc] || 0) + 1;
        }
      });
      setTopChurches(
        Object.entries(churchMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      );
      setTopSects(
        Object.entries(sectMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      );

      // ── 13. Scripture Memorization Stats ─────────────────────────────────
      const { data: memoData } = await supabase.rpc('get_memorization_stats');
      if (memoData && memoData.length > 0) {
        const ms = memoData[0];
        setMemoStats({
          totalTests: Number(ms.total_tests || 0),
          avgScore: Number(ms.avg_score || 0),
          totalVerses: Number(ms.total_verses || 0),
          totalTimeHours: Math.round(Number(ms.total_time_seconds || 0) / 3600),
        });
      }

    } catch (err) {
      console.error('[health] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshedAt(new Date());
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchAll();
    }
  }, [timeRange]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const todayRate = totalUsers > 0 ? Math.round((todayTook / totalUsers) * 100) : 0;
  const weekRetentionRate = totalUsers > 0 ? Math.round((activeLastWeek / totalUsers) * 100) : 0;
  const consistentRate = totalUsers > 0 ? Math.round((consistentUsers / totalUsers) * 100) : 0;

  const todayChange = chartData.length >= 2
    ? chartData[chartData.length - 1].tookDevotion - chartData[chartData.length - 2].tookDevotion
    : 0;

  const maxBar = Math.max(...chartData.map(d => d.tookDevotion), 1);

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }}>
        <div style={{ height: '32px', width: '260px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '32px' }} className="animate-pulse" />
        <div className="metrics-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass animate-pulse" style={{ height: '120px', borderRadius: '16px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gap: '24px', marginTop: '28px' }}>
          <div className="glass animate-pulse" style={{ height: '320px', borderRadius: '16px' }} />
          <div className="glass animate-pulse" style={{ height: '260px', borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>صحة التطبيق</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            السؤال الوحيد المهم: <strong style={{ color: 'var(--text-primary)' }}>كام واحد أخد خلوته النهارده؟</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Time Range Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              onClick={() => setTimeRange('7d')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: timeRange === '7d' ? 'var(--primary)' : 'none',
                color: timeRange === '7d' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              آخر ٧ أيام
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: timeRange === '30d' ? 'var(--primary)' : 'none',
                color: timeRange === '30d' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              آخر ٣٠ يوم
            </button>
            <button
              onClick={() => setTimeRange('6m')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: timeRange === '6m' ? 'var(--primary)' : 'none',
                color: timeRange === '6m' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              آخر ٦ شهور
            </button>
            <button
              onClick={() => setTimeRange('1y')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: timeRange === '1y' ? 'var(--primary)' : 'none',
                color: timeRange === '1y' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              آخر سنة
            </button>
            <button
              onClick={() => setTimeRange('2y')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: timeRange === '2y' ? 'var(--primary)' : 'none',
                color: timeRange === '2y' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              آخر سنتين
            </button>
            <button
              onClick={() => setTimeRange('custom')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: timeRange === 'custom' ? 'var(--primary)' : 'none',
                color: timeRange === 'custom' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              فترة مخصصة 🗓️
            </button>
          </div>

          <button
            onClick={() => fetchAll()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>تحديث — {refreshedAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </button>
        </div>
      </header>

      {/* ── Custom Datepicker Panel ────────────────────────────────────────── */}
      {timeRange === 'custom' && (
        <div className="glass" style={{
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          border: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>من تاريخ:</span>
            <input 
              type="date"
              className="form-input"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem', width: '150px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>إلى تاريخ:</span>
            <input 
              type="date"
              className="form-input"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{ height: '34px', padding: '6px 10px', fontSize: '0.85rem', width: '150px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
            />
          </div>

          <button
            onClick={() => fetchAll()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              transition: 'var(--transition-fast)'
            }}
          >
            <span>تطبيق الفلتر</span>
            <CheckCircle size={14} />
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            * يرجى اختيار فترة لا تتجاوز ٩٠ يوماً لضمان سرعة معالجة الرسوم البيانية.
          </p>
        </div>
      )}

      {/* ── Big Today Banner ────────────────────────────────────────────────── */}
      <div className="glass" style={{
        padding: '32px',
        borderRadius: '20px',
        marginBottom: '32px',
        border: `1px solid ${statusColor(todayRate)}30`,
        background: todayRate >= 60
          ? 'rgba(16, 185, 129, 0.06)'
          : todayRate >= 30
            ? 'rgba(245, 158, 11, 0.06)'
            : 'rgba(239, 68, 68, 0.06)',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          اليوم — {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
          {/* Big number */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
            <span style={{ fontSize: '4rem', fontWeight: 800, color: statusColor(todayRate), lineHeight: 1 }}>
              {todayTook}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              من أصل {totalUsers} مستخدم
            </span>
          </div>

          {/* Visual ring */}
          <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
            <svg width="110" height="110" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={statusColor(todayRate)} strokeWidth="14"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - todayRate / 100)}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: statusColor(todayRate) }}>{todayRate}%</span>
            </div>
          </div>

          {/* Stats breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="var(--success)" />
              <span style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--success)' }}>{todayTook}</strong>
                {' '}مستخدم أخد خلوته اليوم ✅
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <XCircle size={18} color="var(--danger)" />
              <span style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--danger)' }}>{totalUsers - todayTook - todayDidNot}</strong>
                {' '}لم يفتحوا التطبيق أصلاً
              </span>
            </div>
            {todayDidNot > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                <span style={{ fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--warning)' }}>{todayDidNot}</strong>
                  {' '}فتحوا التطبيق بس ما كملوش
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {todayChange >= 0
                ? <TrendingUp size={18} color="var(--success)" />
                : <TrendingDown size={18} color="var(--danger)" />}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {todayChange >= 0 ? '+' : ''}{todayChange} عن أمس
              </span>
            </div>
          </div>
        </div>
      </div>

        {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <section className="metrics-grid" style={{ marginBottom: '32px' }}>

        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">أخدوا خلوة ({getRangeLabel(timeRange)})</span>
            <span className="metric-value">{activeLastWeek}</span>
            <span className={`metric-trend ${weekRetentionRate >= 40 ? 'trend-up' : 'trend-down'}`}>
              {weekRetentionRate >= 40 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              <span>{weekRetentionRate}% من الكل — {weekRetentionRate >= 60 ? 'ممتاز' : weekRetentionRate >= 40 ? 'مقبول' : 'منخفض'}</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Activity size={22} />
          </div>
        </div>

        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">ملتزمون كل يوم ({getRangeLabel(timeRange)})</span>
            <span className="metric-value">{consistentUsers}</span>
            <span className={`metric-trend ${consistentRate >= 20 ? 'trend-up' : 'trend-down'}`}>
              <Flame size={13} />
              <span>{consistentRate}% من المستخدمين — النخبة الملتزمة</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Flame size={22} />
          </div>
        </div>

        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">مستخدمون جدد (في الفترة)</span>
            <span className="metric-value">+{newRegistrationsCount}</span>
            <span className="metric-trend trend-up">
              <TrendingUp size={13} />
              <span>دخلوا وسجلوا بالتطبيق</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
        </div>

        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">إجمالي المستخدمين (الكل)</span>
            <span className="metric-value">{totalUsers}</span>
            <span className="metric-trend trend-up">
              <Users size={13} />
              <span>مسجلون في التطبيق</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
        </div>
      </section>

      {/* ── Devotion Chart ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="glass card">
          <div className="card-title">
            <span>عدد المستخدمين الملتزمين بالخلوة يومياً — {getRangeLabel(timeRange)}</span>
            <Calendar size={16} color="var(--success)" />
          </div>

          {/* SVG Bar Chart with dynamic width rendering */}
          {(() => {
            const barW = chartData.length > 15 ? 36 : 56;
            const gap = chartData.length > 15 ? 20 : 36;
            const startX = 60;
            const svgWidth = startX + chartData.length * (barW + gap) + 40;
            const viewBoxStr = `0 0 ${svgWidth} 240`;

            return (
              <div style={{ overflowX: 'auto', padding: '20px 0 8px' }}>
                <svg viewBox={viewBoxStr} style={{ width: '100%', minWidth: `${svgWidth}px` }}>
                  {/* Y guide lines */}
                  {[0, 25, 50, 75, 100].map(pct => {
                    const val = Math.round((pct / 100) * maxBar);
                    const y = 20 + ((100 - pct) / 100) * 160;
                    return (
                      <g key={pct}>
                        <line x1="50" x2={svgWidth - 20} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <text x="42" y={y + 4} textAnchor="end" className="chart-axis-text" style={{ fontSize: '10px' }}>{val}</text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {chartData.map((point, i) => {
                    const barH = maxBar > 0 ? Math.max(3, (point.tookDevotion / maxBar) * 160) : 3;
                    const bx = startX + i * (barW + gap);
                    const barColor = statusColor(point.rate);
                    const isToday = i === chartData.length - 1;

                    return (
                      <g key={i}>
                        {/* Background track */}
                        <rect x={bx} y={20} width={barW} height={160} rx="6" fill="rgba(255,255,255,0.02)" />

                        {/* Filled bar */}
                        <rect
                          x={bx}
                          y={180 - barH}
                          width={barW}
                          height={barH}
                          rx="6"
                          fill={barColor}
                          opacity={isToday ? 1 : 0.65}
                        />

                        {/* Today glow */}
                        {isToday && (
                          <rect x={bx} y={180 - barH} width={barW} height={barH} rx="6"
                            fill="none" stroke={barColor} strokeWidth="2" opacity="0.5"
                          />
                        )}

                        {/* Count label on top */}
                        <text x={bx + barW / 2} y={Math.max(34, 180 - barH - 8)}
                          textAnchor="middle" className="chart-axis-text"
                          style={{ fontSize: '11px', fontWeight: 'bold', fill: barColor }}
                        >
                          {point.tookDevotion}
                        </text>

                        {/* Rate % below bar */}
                        <text x={bx + barW / 2} y={196}
                          textAnchor="middle" className="chart-axis-text"
                          style={{ fontSize: '9px', fill: barColor, fontWeight: '600' }}
                        >
                          {point.rate}%
                        </text>

                        {/* Day name */}
                        <text x={bx + barW / 2} y={212}
                          textAnchor="middle" className="chart-axis-text"
                          style={{ fontSize: '10px', fill: isToday ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isToday ? 'bold' : 'normal' }}
                        >
                          {point.day}
                        </text>

                        {/* Date */}
                        <text x={bx + barW / 2} y={226}
                          textAnchor="middle" className="chart-axis-text"
                          style={{ fontSize: '9px', fill: 'var(--text-muted)' }}
                        >
                          {point.date.slice(5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}

          {/* Color legend */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '4px', fontSize: '0.78rem' }}>
            {[
              { label: '٦٠٪ فأكثر — ممتاز', color: 'var(--success)' },
              { label: '٣٠٪ - ٥٩٪ — مقبول', color: 'var(--warning)' },
              { label: 'أقل من ٣٠٪ — منخفض', color: 'var(--danger)' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── SaaS / Product Engagement & Retention Metrics ──────────────────────── */}
      <section style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          مؤشرات تفاعل ونمو التطبيق (Engagement & Retention Cohorts)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* 1. Activation */}
          {(() => {
            const pct = totalUsers > 0 ? Math.round((activatedCount / totalUsers) * 100) : 0;
            const rating = pct >= 40 ? { text: 'Healthy', color: 'var(--success)' } : pct >= 20 ? { text: 'Needs work', color: 'var(--warning)' } : { text: 'Weak', color: 'var(--danger)' };
            return (
              <div className="glass card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Activation (معدل التفعيل)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pct}%</span>
                  <span className="badge" style={{ background: `${rating.color}15`, color: rating.color, fontSize: '0.75rem', fontWeight: 'bold' }}>{rating.text}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  <strong>{activatedCount}</strong> مستخدم أكمل خلوة واحدة على الأقل (طوال عمر التطبيق).
                </p>
              </div>
            );
          })()}

          {/* 2. 30-day active */}
          {(() => {
            const pct = totalUsers > 0 ? Math.round((mauCount / totalUsers) * 100) : 0;
            const rating = pct >= 30 ? { text: 'Healthy', color: 'var(--success)' } : pct >= 15 ? { text: 'Needs work', color: 'var(--warning)' } : { text: 'Weak', color: 'var(--danger)' };
            return (
              <div className="glass card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>30-day active (النشطون شهرياً - MAU)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pct}%</span>
                  <span className="badge" style={{ background: `${rating.color}15`, color: rating.color, fontSize: '0.75rem', fontWeight: 'bold' }}>{rating.text}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  <strong>{mauCount}</strong> مستخدم نشط في آخر ٣٠ يوماً.
                </p>
              </div>
            );
          })()}

          {/* 3. DAU / MAU */}
          {(() => {
            const rating = dauMauRatio >= 20 ? { text: 'Healthy', color: 'var(--success)' } : dauMauRatio >= 10 ? { text: 'Needs work', color: 'var(--warning)' } : { text: 'Weak', color: 'var(--danger)' };
            return (
              <div className="glass card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>DAU / MAU (تكرار النشاط اليومي)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dauMauRatio}%</span>
                  <span className="badge" style={{ background: `${rating.color}15`, color: rating.color, fontSize: '0.75rem', fontWeight: 'bold' }}>{rating.text}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  <strong>{todayTook}</strong> نشط اليوم من أصل <strong>{mauCount}</strong> نشط شهرياً.
                </p>
              </div>
            );
          })()}

          {/* 4. 7d / 30d retention */}
          {(() => {
            const rating = wauMauRatio >= 50 ? { text: 'Healthy', color: 'var(--success)' } : wauMauRatio >= 30 ? { text: 'Needs work', color: 'var(--warning)' } : { text: 'Weak', color: 'var(--danger)' };
            return (
              <div className="glass card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>7d / 30d retention (الاستبقاء الأسبوعي)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{wauMauRatio}%</span>
                  <span className="badge" style={{ background: `${rating.color}15`, color: rating.color, fontSize: '0.75rem', fontWeight: 'bold' }}>{rating.text}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  مستخدمو الشهر النشطون الذين تفاعلوا أيضاً في آخر ٧ أيام.
                </p>
              </div>
            );
          })()}

          {/* 5. Devotion adoption */}
          {(() => {
            const pct = totalUsers > 0 ? Math.round((activatedCount / totalUsers) * 100) : 0;
            const rating = pct >= 40 ? { text: 'Healthy', color: 'var(--success)' } : pct >= 20 ? { text: 'Needs work', color: 'var(--warning)' } : { text: 'Weak', color: 'var(--danger)' };
            return (
              <div className="glass card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Devotion adoption (تبني الخلوة)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pct}%</span>
                  <span className="badge" style={{ background: `${rating.color}15`, color: rating.color, fontSize: '0.75rem', fontWeight: 'bold' }}>{rating.text}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  <strong>{activatedCount}</strong> مستخدم أتم خلوة واحدة بنجاح (طوال عمر التطبيق).
                </p>
              </div>
            );
          })()}

          {/* 6. Zero activity */}
          <div className="glass card" style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Zero activity (بدون أي تفاعل)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)' }}>
                {totalUsers > 0 ? Math.round((zeroActivityCount / totalUsers) * 100) : 0}%
              </span>
              <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>خطر تسرب</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              <strong>{zeroActivityCount}</strong> مستخدم سجلوا ولم يسجلوا خلوة واحدة.
            </p>
          </div>

        </div>
      </section>

      {/* ── Habit Dynamics & Churn Analysis (Advantages vs Drawbacks) ────────── */}
      <section style={{ marginTop: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Advantage - Group Accountability */}
          <div className="glass card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>مقارنة الالتزام (محفزات مجموعات التفاعل)</h3>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>مؤشر القوة (Advantage)</span>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              مقارنة نسبة إكمال الخلوة اليومية بين المشتركين داخل مجموعات التفاعل والمشتركين الفرديين (Solo). يوضح هذا مدى فاعلية الجروبات في التشجيع.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              {/* Group Users Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>المشتركون في مجموعات ({groupUsersCount} مستخدم)</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{groupCompRate}% التزام اليوم</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--success) 0%, #10b981 100%)', width: `${groupCompRate}%`, borderRadius: '4px' }} />
                </div>
              </div>

              {/* Solo Users Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>المشتركون الفرديون (Solo) ({soloUsersCount} مستخدم)</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{soloCompRate}% التزام اليوم</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--warning) 0%, #f59e0b 100%)', width: `${soloCompRate}%`, borderRadius: '4px' }} />
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: 'var(--success)',
              lineHeight: 1.4,
              marginTop: 'auto'
            }}>
              💡 <strong>الخلاصة:</strong> المشتركون في مجموعات تفاعلية لديهم التزام أعلى بمعدل{' '}
              <strong>
                {Math.max(0, groupCompRate - soloCompRate)}%
              </strong>{' '}
              عن المستخدمين الفرديين. الجروبات تعد ميزة تنافسية قوية (Key Advantage).
            </div>
          </div>

          {/* Card 2: Drawback - User Retention & Churn */}
          <div className="glass card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>معدل تسرب وخمول المستخدمين (Retention & Churn)</h3>
              <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>نقطة ضعف (Drawback)</span>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              تحليل نشاط المشتركين المسجلين لمعرفة نسبة خمول المستخدمين الذين لم يفتحوا التطبيق أو يسجلوا أي خلوة خلال آخر 14 يومًا.
            </p>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
              {/* Pie/Donut approximation using HSL gradients or clear text ratios */}
              <div style={{
                position: 'relative', width: '70px', height: '70px', borderRadius: '50%',
                background: `conic-gradient(var(--danger) ${totalUsers > 0 ? (inactiveCount / totalUsers) * 360 : 0}deg, var(--success) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#0b0f17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>
                    {totalUsers > 0 ? Math.round((inactiveCount / totalUsers) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--success)' }}>🟢 مستخدمون نشطون (نشاط &lt;١٤ يوم)</span>
                  <strong>{Math.max(0, totalUsers - inactiveCount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--danger)' }}>🔴 مستخدمون خاملون (خمول &gt;١٤ يوم)</span>
                  <strong>{inactiveCount}</strong>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: 'var(--danger)',
              lineHeight: 1.4,
              marginTop: 'auto'
            }}>
              ⚠️ <strong>تحذير التسرب:</strong> هناك{' '}
              <strong>{inactiveCount} مستخدم</strong> من أصل <strong>{totalUsers}</strong> دخلوا مرحلة الخمول. يوصى بإرسال تنبيهات Push Notifications لتنشيطهم وتجنب تسربهم بالكامل.
            </div>
          </div>

        </div>
      </section>

      {/* ── Advanced Spiritual Insights & Focus Analytics ────────────────────── */}
      <section style={{ marginTop: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Most Read Bible Books */}
          <div className="glass card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>التركيز الكتابي (الأسفار الأكثر قراءة)</h3>
              <Calendar size={18} color="var(--accent-teal)" />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              الأسفار الأكثر قراءة وتسجيلاً في خلوات المستخدمين خلال آخر ٣٠٠ خلوة مكتملة. يوضح التوجه العام للمجتمع.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {topBooks.length > 0 ? (
                topBooks.map((b, idx) => {
                  const maxCount = topBooks[0].count;
                  const percent = Math.round((b.count / maxCount) * 100);
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{b.book}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{b.count} خلوة</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--accent-teal)', width: `${percent}%`, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  لا توجد قراءات مسجلة بعد.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Devotion Time Distribution */}
          <div className="glass card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>أوقات الخلوة المفضلة (ساعة التنبيه)</h3>
              <Activity size={18} color="var(--accent-purple)" />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              توزيع المشتركين حسب ساعة التنبيه المفضلة لديهم للخلوة اليومية المسجلة في ملفاتهم الشخصية.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {[
                { label: '🌅 الصباحية (5ص - 12ظ)', count: devotionTimeDist.morning },
                { label: '☀️ الظهر والمساء (12ظ - 5م)', count: devotionTimeDist.afternoon },
                { label: '🌆 العشية (5م - 10م)', count: devotionTimeDist.evening },
                { label: '🌌 الليلية (10م - 5ص)', count: devotionTimeDist.night },
              ].map((t, idx) => {
                const totalDist = (devotionTimeDist.morning + devotionTimeDist.afternoon + devotionTimeDist.evening + devotionTimeDist.night) || 1;
                const percent = Math.round((t.count / totalDist) * 100);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                      <span>{t.label}</span>
                      <strong>{t.count} مستخدم ({percent}%)</strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--accent-purple)', width: `${percent}%`, borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Prayer & Reflections Engagement */}
          <div className="glass card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>التفاعل الروحي ومستودع الصلوات</h3>
              <Flame size={18} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              تحليل عمق استخدام الميزات الروحية المصاحبة في التطبيق مثل دفتر الصلوات وسجل التأملات الشخصية.
            </p>

            <div className="responsive-2col" style={{ gap: '16px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>طلبات الصلاة</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{totalPrayers}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>نسبة الاستجابة</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{answeredPrayersRate}%</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📝 إجمالي التأملات الروحية المكتوبة:</span>
              <strong style={{ fontSize: '0.95rem' }}>{totalReflections} تأمل</strong>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: 'var(--primary)',
              lineHeight: 1.4,
              marginTop: 'auto'
            }}>
              ✨ <strong>مؤشر التفاعل:</strong> يُظهر تفاعل المستخدمين كتابةً وصلاةً نمواً في العلاقة الشخصية مع التطبيق وتجاوز التفاعل مجرد Ticking للخلوة اليومية.
            </div>
          </div>

          {/* Card 4: User Registrations & Growth */}
          <div className="glass card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>معدل تسجيل الحسابات ونمو التطبيق</h3>
              <Users size={18} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              معدل انضمام مستخدمين جدد للتطبيق شهرياً. يوضح وتيرة نمو واكتساب حسابات جديدة للمنصة.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {regStats.length > 0 ? (
                regStats.slice(-4).map((r, idx) => {
                  const maxCount = Math.max(...regStats.map(s => s.count), 1);
                  const percent = Math.round((r.count / maxCount) * 100);
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{formatMonthName(r.month)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>+{r.count} مستخدم جديد</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--primary)', width: `${percent}%`, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  لا توجد عمليات تسجيل مسجلة شهرياً.
                </div>
              )}
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: 'var(--primary)',
              lineHeight: 1.4,
              marginTop: 'auto'
            }}>
              📈 <strong>إجمالي الحسابات:</strong> قاعدة البيانات تحتوي حالياً على{' '}
              <strong>{totalUsers}</strong> حساب مسجل بنشاط متنامي.
            </div>
          </div>

        </div>
      </section>


      {/* ── Today's Devotion User List ───────────────────────────────────────── */}
      <section style={{ marginTop: '32px' }}>
        <div className="glass card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>مين أخد خلوته النهارده؟</span>
              <span style={{
                fontSize: '0.78rem',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--success)',
                padding: '2px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                {todayUserList.length} مستخدم ✅
              </span>
            </span>
            <List size={16} color="var(--success)" />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
            قائمة بكل المستخدمين اللي سجلوا خلوة مكتملة اليوم — وإيه اللي قرأوه.
          </p>

          {debugInfo && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              border: '1px dashed var(--border-color)',
              direction: 'ltr',
              textAlign: 'left'
            }}>
              <strong>Debug info:</strong> {debugInfo}
            </div>
          )}

          {todayUserList.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              color: 'var(--text-muted)', fontSize: '0.9rem'
            }}>
              <Calendar size={32} color="var(--text-muted)" />
              <span>لا أحد أخد خلوته لحد دلوقتي اليوم</span>
            </div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                    <th>الكنيسة</th>
                    <th>الإصحاح اللي قراه</th>
                    <th>نقاط XP</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {todayUserList.map((u, idx) => (
                    <tr key={u.user_id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {u.full_name && u.full_name.trim()
                              ? u.full_name
                              : u.email
                                ? u.email.split('@')[0]
                                : `مستخدم (${u.user_id.substring(0, 6)})`}
                          </span>
                          {u.email && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {u.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {u.church || '—'}
                        </span>
                      </td>
                      <td>
                        {u.reading_book ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={13} color="var(--accent-teal)" />
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                              {u.reading_book}
                              {u.reading_chapter ? ` — إصحاح ${u.reading_chapter}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.82rem', fontWeight: 700,
                          color: u.xp > 200 ? 'var(--success)' : u.xp > 50 ? 'var(--warning)' : 'var(--text-muted)'
                        }}>
                          {u.xp.toLocaleString()} XP
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: 'var(--success)',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          ✅ أخد خلوته
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Scripture Memorization Stats ─────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="glass card">
          <div className="card-title">
            <span>📖 إحصاءات الحفظ والتسميع</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '16px' }}>
            {/* Total Tests */}
            <div style={{ background: 'rgba(99,102,241,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)' }}>{memoStats.totalTests.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>جلسة تسميع</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>إجمالي الاختبارات المكتملة</div>
            </div>
            {/* Average Score */}
            <div style={{ background: memoStats.avgScore >= 80 ? 'rgba(16,185,129,0.07)' : memoStats.avgScore >= 60 ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: `1px solid ${memoStats.avgScore >= 80 ? 'rgba(16,185,129,0.2)' : memoStats.avgScore >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: memoStats.avgScore >= 80 ? 'var(--success)' : memoStats.avgScore >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{memoStats.avgScore}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>متوسط الدقة</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{memoStats.avgScore >= 80 ? 'ممتاز 🏆' : memoStats.avgScore >= 60 ? 'جيد 👍' : 'يحتاج تطوير'}</div>
            </div>
            {/* Total Verses */}
            <div style={{ background: 'rgba(16,185,129,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--success)' }}>{memoStats.totalVerses.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>آية محفوظة</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>إجمالي الآيات المُسمَّعة</div>
            </div>
            {/* Total Time */}
            <div style={{ background: 'rgba(245,158,11,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--warning)' }}>{memoStats.totalTimeHours.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>ساعة تسميع</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>وقت مُصلٍّ ومُتمعِّن في الكلمة</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Community Demographics ────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="responsive-2col">

          {/* Top Churches */}
          <div className="glass card">
            <div className="card-title">
              <span>⛪ الكنائس الأكثر تفاعلاً</span>
            </div>
            {topChurches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>لا توجد بيانات كنائس</p>
            ) : (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topChurches.map((ch, i) => {
                  const maxCount = topChurches[0].count;
                  const pct = Math.round((ch.count / maxCount) * 100);
                  const colors = ['var(--primary)', 'var(--success)', 'var(--warning)', '#8b5cf6', '#ec4899', '#06b6d4'];
                  return (
                    <div key={ch.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {ch.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: colors[i] }}>{ch.count} مستخدم</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colors[i], borderRadius: '4px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Sects */}
          <div className="glass card">
            <div className="card-title">
              <span>✝️ الطوائف الأكثر تفاعلاً</span>
            </div>
            {topSects.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>لا توجد بيانات طوائف</p>
            ) : (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topSects.map((sc, i) => {
                  const maxCount = topSects[0].count;
                  const pct = Math.round((sc.count / maxCount) * 100);
                  const colors = ['var(--primary)', 'var(--success)', 'var(--warning)', '#8b5cf6', '#ec4899', '#06b6d4'];
                  return (
                    <div key={sc.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {sc.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: colors[i] }}>{sc.count} مستخدم</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colors[i], borderRadius: '4px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>

    </div>

  );
}
