'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

import { 
  Users, 
  BookOpen, 
  Layers, 
  CheckCircle, 
  Calendar,
  Sparkles,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Heart,
  User
} from 'lucide-react';

interface MetricStats {
  totalUsers: number;
  totalChaptersRead: number;
  totalGroups: number;
  devotionCompletionRate: number;
  completionRateChange: number;
}

interface ProductEngagement {
  dau: number;
  wau: number;
  mau: number;
}

interface BibleBookStat {
  bookId: string;
  bookName: string;
  count: number;
}

interface ChurchStat {
  name: string;
  count: number;
}

interface RecentActivityItem {
  id: string;
  userId: string;
  userName: string;
  type: 'prayer' | 'reflection' | 'signup' | 'reading';
  content: string;
  time: string;
  dateStr?: string;
  timestamp: number;
}

// Arabic mapping for common Bible book IDs
const bookIdToName: Record<string, string> = {
  '1': 'التكوين',
  '2': 'الخروج',
  '19': 'المزامير',
  '40': 'متى',
  '41': 'مرقس',
  '42': 'لوقا',
  '43': 'يوحنا',
  '44': 'أعمال الرسل',
  '45': 'رومية',
  '51': 'كولوسي',
  '62': 'يوحنا الأولى',
  '66': 'الرؤيا'
};

const getBookName = (id: string): string => {
  return bookIdToName[id] || `سفر ${id}`;
};

const getCairoDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<ProductEngagement>({ dau: 0, wau: 0, mau: 0 });
  const [metrics, setMetrics] = useState<MetricStats>({
    totalUsers: 0,
    totalChaptersRead: 0,
    totalGroups: 0,
    devotionCompletionRate: 0,
    completionRateChange: 0
  });

  const [topBooks, setTopBooks] = useState<BibleBookStat[]>([]);
  const [churchStats, setChurchStats] = useState<ChurchStat[]>([]);
  const [trendData, setTrendData] = useState<{ day: string; rate: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);

  const [demographics, setDemographics] = useState({
    gender: { male: 0, female: 0, unknown: 0 },
    ageBrackets: [
      { label: 'تحت ١٨ سنة', count: 0 },
      { label: '١٨ - ٢٥ سنة', count: 0 },
      { label: '٢٦ - ٣٥ سنة', count: 0 },
      { label: '٣٦ - ٥٠ سنة', count: 0 },
      { label: 'فوق ٥٠ سنة', count: 0 }
    ]
  });

  const [prayersStat, setPrayersStat] = useState({
    total: 0,
    answered: 0,
    rate: 0
  });

  const [testamentSplit, setTestamentSplit] = useState({
    oldTestament: 0,
    newTestament: 0,
    oldPercent: 50,
    newPercent: 50
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setDashboardError(null);

        // 1. Fetch total users (profiles count)
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // 2. Fetch total chapters read (reading_log count)
        const { count: readingCount, error: readingError } = await supabase
          .from('reading_log')
          .select('*', { count: 'exact', head: true });

        // 3. Fetch devotion groups count
        const { count: groupsCount, error: groupsError } = await supabase
          .from('devotion_groups')
          .select('*', { count: 'exact', head: true });

        const totalUsers = usersCount || 0;
        const totalChapters = readingCount || 0;
        const totalGroups = groupsCount || 0;

        // 4. Fetch today's devotion log completion
        const todayStr = getCairoDate();
        const { data: todayLogs, error: todayLogsError } = await supabase
          .from('devotion_log')
          .select('completed')
          .eq('date', todayStr);

        if (usersError || readingError || groupsError || todayLogsError) {
          throw usersError || readingError || groupsError || todayLogsError;
        }

        let todayRate = 0;
        if (totalUsers > 0 && todayLogs && todayLogs.length > 0) {
          const completedCount = todayLogs.filter(log => log.completed).length;
          todayRate = Math.round((completedCount / totalUsers) * 100);
        }

        // 5. Fetch yesterday's devotion log completion for trend comparison
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getCairoDate(yesterday);
        const { data: yesterdayLogs, error: yesterdayLogsError } = await supabase
          .from('devotion_log')
          .select('completed')
          .eq('date', yesterdayStr);

        if (yesterdayLogsError) throw yesterdayLogsError;

        let yesterdayRate = 0;
        if (totalUsers > 0 && yesterdayLogs && yesterdayLogs.length > 0) {
          const completedCount = yesterdayLogs.filter(log => log.completed).length;
          yesterdayRate = Math.round((completedCount / totalUsers) * 100);
        }

        const completionRateChange = yesterdayRate > 0 ? (todayRate - yesterdayRate) : 0;

        setMetrics({
          totalUsers,
          totalChaptersRead: totalChapters,
          totalGroups,
          devotionCompletionRate: todayRate,
          completionRateChange
        });

        // The compact home view only renders these core health indicators.
        const { data: productMetrics } = await supabase.rpc('get_product_engagement_metrics');
        if (productMetrics?.[0]) {
          const product = productMetrics[0];
          setEngagement({
            dau: Number(product.dau_users ?? 0),
            wau: Number(product.wau_users ?? 0),
            mau: Number(product.mau_users ?? 0),
          });
        }
        // 6. Fetch profiles to aggregate church and demographic statistics
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, church, updated_at, birth_date, gender');

        if (profilesError) throw profilesError;

        const churchMap: Record<string, number> = {};
        let male = 0;
        let female = 0;
        let unknownGender = 0;
        const ageCount = [0, 0, 0, 0, 0]; // <18, 18-25, 26-35, 36-50, 50+

        if (profilesData) {
          profilesData.forEach(p => {
            // Church
            const ch = p.church?.trim() || 'غير محدد';
            churchMap[ch] = (churchMap[ch] || 0) + 1;

            // Gender
            const g = (p.gender || '').trim().toLowerCase();
            if (g === 'ذكر' || g === 'male' || g === 'm') {
              male += 1;
            } else if (g === 'أنثى' || g === 'female' || g === 'f') {
              female += 1;
            } else {
              unknownGender += 1;
            }

            // Age
            if (p.birth_date) {
              const birthDate = new Date(`${p.birth_date}T00:00:00`);
              if (!Number.isNaN(birthDate.getTime())) {
                const now = new Date();
                let age = now.getFullYear() - birthDate.getFullYear();
                const birthdayHasPassed =
                  now.getMonth() > birthDate.getMonth() ||
                  (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
                if (!birthdayHasPassed) age -= 1;
                if (age < 18) ageCount[0] += 1;
                else if (age <= 25) ageCount[1] += 1;
                else if (age <= 35) ageCount[2] += 1;
                else if (age <= 50) ageCount[3] += 1;
                else ageCount[4] += 1;
              }
            }
          });
        }
        const sortedChurches = Object.entries(churchMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setChurchStats(sortedChurches);

        setDemographics({
          gender: { male, female, unknown: unknownGender },
          ageBrackets: [
            { label: 'تحت ١٨ سنة', count: ageCount[0] },
            { label: '١٨ - ٢٥ سنة', count: ageCount[1] },
            { label: '٢٦ - ٣٥ سنة', count: ageCount[2] },
            { label: '٣٦ - ٥٠ سنة', count: ageCount[3] },
            { label: 'فوق ٥٠ سنة', count: ageCount[4] }
          ]
        });

        // 7. Fetch reading logs to aggregate top Bible books read & testament split
        const { data: readingLogs, error: readingLogsError } = await supabase
          .from('reading_log')
          .select('book_id');

        if (readingLogsError) throw readingLogsError;

        const bookMap: Record<string, number> = {};
        let oldTestament = 0;
        let newTestament = 0;

        if (readingLogs && readingLogs.length > 0) {
          readingLogs.forEach(log => {
            bookMap[log.book_id] = (bookMap[log.book_id] || 0) + 1;

            const bId = parseInt(log.book_id);
            if (!isNaN(bId)) {
              if (bId <= 39) {
                oldTestament += 1;
              } else {
                newTestament += 1;
              }
            }
          });
        }
        const sortedBooks = Object.entries(bookMap)
          .map(([bookId, count]) => ({
            bookId,
            bookName: getBookName(bookId),
            count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopBooks(sortedBooks);

        const totalT = oldTestament + newTestament;
        setTestamentSplit({
          oldTestament,
          newTestament,
          oldPercent: totalT > 0 ? Math.round((oldTestament / totalT) * 100) : 0,
          newPercent: totalT > 0 ? Math.round((newTestament / totalT) * 100) : 0
        });

        // 8. Fetch last 7 days devotion completion rate trend
        const trendList = [];
        const daysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = getCairoDate(d);
          const dayName = daysArabic[new Date(`${dStr}T12:00:00`).getDay()];

          const { data: dayLogs, error: dayLogsError } = await supabase
            .from('devotion_log')
            .select('completed')
            .eq('date', dStr);

          if (dayLogsError) throw dayLogsError;

          let rate = 0;
          if (dayLogs && dayLogs.length > 0) {
            const completedCount = dayLogs.filter(log => log.completed).length;
            rate = totalUsers > 0 ? Math.round((completedCount / totalUsers) * 100) : 0;
          }
          trendList.push({ day: dayName, rate });
        }
        setTrendData(trendList);

        // 9. Fetch recent user activities: Signups, prayer notes, reflections
        const activities: RecentActivityItem[] = [];

        // Recent Signups (from profiles updated_at as proxy for users)
        if (profilesData && profilesData.length > 0) {
          profilesData.slice(0, 3).forEach((p, idx) => {
            activities.push({
              id: `signup-${idx}`,
              userId: p.id,
              userName: `مستخدم جديد`,
              type: 'signup',
              content: p.church ? `انضم من كنيسة: ${p.church}` : 'انضم لتطبيق خلوتي',
              time: p.updated_at ? new Date(p.updated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '14:30',
              dateStr: p.updated_at ? p.updated_at.split('T')[0] : todayStr,
              timestamp: p.updated_at ? new Date(p.updated_at).getTime() : 0,
            });
          });
        }

        // Recent Prayer Notes
        const { data: recentPrayers, error: recentPrayersError } = await supabase
          .from('prayer_notes')
          .select('id, user_id, content, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentPrayersError) throw recentPrayersError;

        if (recentPrayers) {
          recentPrayers.forEach(pr => {
            activities.push({
              id: pr.id,
              userId: pr.user_id,
              userName: 'مشارك',
              type: 'prayer',
              content: pr.content ? (pr.content.length > 40 ? pr.content.substring(0, 40) + '...' : pr.content) : '',
              time: new Date(pr.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              dateStr: pr.created_at.split('T')[0],
              timestamp: new Date(pr.created_at).getTime(),
            });
          });
        }

        // Recent Reflections
        const { data: recentReflections, error: recentReflectionsError } = await supabase
          .from('reflections')
          .select('id, user_id, content, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentReflectionsError) throw recentReflectionsError;

        if (recentReflections) {
          recentReflections.forEach(rf => {
            activities.push({
              id: rf.id,
              userId: rf.user_id,
              userName: 'مشارك',
              type: 'reflection',
              content: rf.content ? (rf.content.length > 40 ? rf.content.substring(0, 40) + '...' : rf.content) : '',
              time: new Date(rf.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              dateStr: rf.created_at.split('T')[0],
              timestamp: new Date(rf.created_at).getTime(),
            });
          });
        }

        // 10. Fetch all prayer notes statistics for answered rate
        const { data: prayersData, error: prayersError } = await supabase
          .from('prayer_notes')
          .select('is_answered');

        if (prayersError) throw prayersError;

        let totalPrayers = 0;
        let answeredPrayers = 0;
        let answeredRate = 0;

        if (prayersData) {
          totalPrayers = prayersData.length;
          answeredPrayers = prayersData.filter(p => p.is_answered).length;
          answeredRate = totalPrayers > 0 ? Math.round((answeredPrayers / totalPrayers) * 100) : 0;
        }

        setPrayersStat({
          total: totalPrayers,
          answered: answeredPrayers,
          rate: answeredRate
        });

        setRecentActivities(activities.sort((left, right) => right.timestamp - left.timestamp).slice(0, 5));


      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setDashboardError(
          err instanceof Error
            ? err.message
            : 'تعذر تحميل بيانات لوحة التحكم. تأكد من صلاحيات الأدمن واتصال قاعدة البيانات.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <div style={{ height: '32px', width: '200px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }} className="animate-pulse" />
        </div>
        <div className="metrics-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass animate-pulse" style={{ height: '120px', borderRadius: '16px', border: '1px solid var(--border-color)' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div className="glass animate-pulse" style={{ height: '350px', borderRadius: '16px' }} />
          <div className="glass animate-pulse" style={{ height: '350px', borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  // Visual layout for line chart
  const maxTrendVal = 100;
  const linePoints = trendData.map((d, index) => {
    const x = 50 + index * 60; // 7 points spaced by 60px
    const y = 200 - (d.rate / maxTrendVal) * 150; // Map 0-100% to Y 200-50
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="animate-fade-in dashboard-page" style={{ direction: 'rtl' }}>
      {/* Title */}
      <header className="page-header" style={{ marginBottom: '35px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>لوحة التحكم والتحليلات</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>نظرة شاملة على أداء تطبيق خلوتي ومستوى التفاعل الروحي</p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <Calendar size={14} />
          <span>تحديث مباشر اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      {dashboardError ? (
        <div
          role="alert"
          style={{
            marginBottom: '24px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.24)',
            color: 'var(--danger)',
            fontSize: '0.88rem',
          }}
        >
          تعذر تحديث كل بيانات اللوحة: {dashboardError}
        </div>
      ) : null}

      <section className="dashboard-executive">
        {(() => {
          const hasData = metrics.totalUsers > 0;
          const isHealthy = hasData && metrics.devotionCompletionRate >= 30 && engagement.wau > 0;
          const status = !hasData
            ? { title: 'لا توجد بيانات كافية للحكم', message: 'ابدأ بمتابعة التسجيلات وأول خلوة للمستخدمين.', color: 'var(--warning)' }
            : isHealthy
              ? { title: 'التطبيق يتحرك بشكل جيد', message: 'يوجد تفاعل أسبوعي ونسبة خلوة يومية مقبولة. راقب النمو أسبوعياً.', color: 'var(--success)' }
              : { title: 'التطبيق يحتاج متابعة', message: 'التفاعل اليومي أو الأسبوعي منخفض. راجع المستخدمين الخاملين وأرسل تنبيهاً مناسباً.', color: 'var(--warning)' };

          return (
            <>
              <div className="glass" style={{ padding: '24px', borderRadius: '18px', borderRight: `5px solid ${status.color}`, marginBottom: '20px' }}>
                <div style={{ color: status.color, fontSize: '0.82rem', fontWeight: 800, marginBottom: '6px' }}>القرار السريع</div>
                <h2 style={{ fontSize: '1.45rem', marginBottom: '8px' }}>{status.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{status.message}</p>
              </div>

              <div className="insights-stat-grid" style={{ marginBottom: '20px' }}>
                <div className="insights-stat-tile"><div className="insights-stat-value">{metrics.totalUsers}</div><div className="insights-stat-label">إجمالي المستخدمين</div></div>
                <div className="insights-stat-tile"><div className="insights-stat-value" style={{ color: 'var(--success)' }}>{engagement.wau}</div><div className="insights-stat-label">نشطون خلال ٧ أيام</div></div>
                <div className="insights-stat-tile"><div className="insights-stat-value" style={{ color: metrics.devotionCompletionRate >= 30 ? 'var(--success)' : 'var(--warning)' }}>{metrics.devotionCompletionRate}%</div><div className="insights-stat-label">إتمام الخلوة اليوم</div></div>
                <div className="insights-stat-tile"><div className="insights-stat-value">{engagement.mau}</div><div className="insights-stat-label">نشطون خلال ٣٠ يوماً</div></div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Link href="/health" className="btn-overview-primary">افهم حالة التطبيق</Link>
                <Link href="/insights" className="btn-overview-secondary">التحليلات التفصيلية</Link>
                <Link href="/users" className="btn-overview-secondary">المستخدمون والمتابعة</Link>
                <Link href="/notifications" className="btn-overview-secondary">إرسال تنبيه</Link>
              </div>
            </>
          );
        })()}
      </section>

      {/* Metrics Cards Grid */}
      <section className="metrics-grid">
        {/* Total Users */}
        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">المستخدمين المسجلين</span>
            <span className="metric-value">{metrics.totalUsers.toLocaleString()}</span>
            <span className="metric-trend trend-up">
              <UserPlus size={14} />
              <span>مستخدمين نشطين</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
        </div>

        {/* Chapters Read */}
        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">الإصحاحات المقروءة</span>
            <span className="metric-value">{metrics.totalChaptersRead.toLocaleString()}</span>
            <span className="metric-trend trend-up">
              <TrendingUp size={14} />
              <span>إجمالي فترات القراءة</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-teal)' }}>
            <BookOpen size={22} />
          </div>
        </div>

        {/* Active Groups */}
        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">مجموعات المتابعة</span>
            <span className="metric-value">{metrics.totalGroups}</span>
            <span className="metric-trend trend-up">
              <Activity size={14} />
              <span>جروبات التفاعل المشترك</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
            <Layers size={22} />
          </div>
        </div>

        {/* Devotion Completion */}
        <div className="glass metric-card">
          <div className="metric-info">
            <span className="metric-label">إتمام الخلوة من المسجلين</span>
            <span className="metric-value">{metrics.devotionCompletionRate}%</span>
            <span className={`metric-trend ${metrics.completionRateChange >= 0 ? 'trend-up' : 'trend-down'}`}>
              <ArrowUpRight size={14} />
              <span>{metrics.completionRateChange >= 0 ? '+' : ''}{metrics.completionRateChange}% عن الأمس</span>
            </span>
          </div>
          <div className="metric-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle size={22} />
          </div>
        </div>
      </section>

      {/* Analytics Charts Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Trend line Chart */}
        <div className="glass card">
          <div className="card-title">
            <span>معدل إتمام الخلوات اليومية (آخر 7 أيام)</span>
            <TrendingUp size={16} color="var(--primary)" />
          </div>
          <div className="chart-container">
            {!trendData.some(item => item.rate > 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', paddingTop: '90px', textAlign: 'center' }}>
                لا توجد خلوات مسجلة خلال آخر ٧ أيام.
              </p>
            ) : null}
            <svg className="svg-chart" viewBox="0 0 460 250">
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--accent-purple)" />
                </linearGradient>
                <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[50, 100, 150, 200].map((yVal, i) => (
                <g key={yVal}>
                  <line x1="40" y1={yVal} x2="420" y2={yVal} className="chart-grid-line" />
                  <text x="30" y={yVal + 4} className="chart-axis-text" textAnchor="end">
                    {100 - i * 25}%
                  </text>
                </g>
              ))}

              {/* Area Under Line */}
              {trendData.length > 0 && (
                <path 
                  d={`M 50,200 L ${linePoints} L 410,200 Z`}
                  className="chart-area"
                />
              )}

              {/* Line path */}
              {trendData.length > 0 && (
                <polyline
                  fill="none"
                  points={linePoints}
                  className="chart-line"
                />
              )}

              {/* Interactive Dots */}
              {trendData.map((d, index) => {
                const x = 50 + index * 60;
                const y = 200 - (d.rate / maxTrendVal) * 150;
                return (
                  <g key={index} style={{ cursor: 'pointer' }}>
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="7" 
                      fill="var(--bg-secondary)" 
                      stroke="var(--primary)" 
                      strokeWidth="3.5"
                    />
                    {/* Tooltip value display */}
                    <text x={x} y={y - 12} className="chart-axis-text" textAnchor="middle" style={{ fontWeight: 'bold', fill: '#ffffff' }}>
                      {d.rate}%
                    </text>
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {trendData.map((d, index) => (
                <text 
                  key={index}
                  x={50 + index * 60} 
                  y="225" 
                  className="chart-axis-text" 
                  textAnchor="middle"
                >
                  {d.day}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Bar Chart - Top Books */}
        <div className="glass card">
          <div className="card-title">
            <span>الأسفار الأكثر قراءة (إجمالي فترات القراءة)</span>
            <BookOpen size={16} color="var(--accent-teal)" />
          </div>
          <div className="chart-container">
            {topBooks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', paddingTop: '90px', textAlign: 'center' }}>
                لا توجد قراءات مسجلة بعد.
              </p>
            ) : null}
            <svg className="svg-chart" viewBox="0 0 460 250">
              <defs>
                <linearGradient id="bar-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent-teal)" />
                  <stop offset="100%" stopColor="var(--primary)" />
                </linearGradient>
              </defs>

              {/* Render horizontal bars */}
              {topBooks.map((book, index) => {
                const y = 25 + index * 40;
                const maxCount = Math.max(...topBooks.map(b => b.count), 1);
                const barWidth = (book.count / maxCount) * 280; // scale bars to fit 280px width

                return (
                  <g key={book.bookId} style={{ cursor: 'pointer' }}>
                    {/* Book name */}
                    <text 
                      x="10" 
                      y={y + 16} 
                      className="chart-axis-text" 
                      textAnchor="start"
                      style={{ fontSize: '0.85rem', fontWeight: 600, fill: 'var(--text-primary)' }}
                    >
                      {book.bookName}
                    </text>

                    {/* Bar background */}
                    <rect 
                      x="100" 
                      y={y} 
                      width="280" 
                      height="20" 
                      fill="rgba(255, 255, 255, 0.02)" 
                      rx="4"
                    />

                    {/* Foreground Bar */}
                    <rect 
                      x="100" 
                      y={y} 
                      width={barWidth} 
                      height="20" 
                      className="chart-bar"
                    />

                    {/* Value count */}
                    <text 
                      x={100 + barWidth + 10} 
                      y={y + 15} 
                      className="chart-axis-text"
                      style={{ fontWeight: 'bold', fill: 'var(--text-secondary)' }}
                    >
                      {book.count}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Detailed Spiritual Analytics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Answered Prayers */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">
              <span>تحليلات الصلاة والاستجابة</span>
              <Heart size={16} color="var(--success)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px', padding: '20px 10px' }}>
              {/* Circular progress SVG */}
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg width="100" height="100" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--success)" strokeWidth="10" 
                    strokeDasharray={2 * Math.PI * 50} 
                    strokeDashoffset={2 * Math.PI * 50 * (1 - prayersStat.rate / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{prayersStat.rate}%</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>مستجاب</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>إجمالي الطلبات:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{prayersStat.total} طلب</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الصلوات المستجابة:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>{prayersStat.answered}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الطلبات الجارية:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning)' }}>{prayersStat.total - prayersStat.answered}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bible Testaments Split */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">
              <span>توزيع القراءات (العهد القديم vs العهد الجديد)</span>
              <BookOpen size={16} color="var(--primary)" />
            </div>
            <div style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>العهد القديم ({testamentSplit.oldPercent}%)</span>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>العهد الجديد ({testamentSplit.newPercent}%)</span>
                </div>
                
                {/* Visual split progress bar */}
                <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', display: 'flex', overflow: 'hidden' }}>
                  <div style={{ width: `${testamentSplit.oldPercent}%`, background: 'linear-gradient(90deg, var(--accent-teal), var(--primary))', height: '100%' }} />
                  <div style={{ width: `${testamentSplit.newPercent}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))', height: '100%' }} />
                </div>
              </div>
              
              <div className="responsive-2col" style={{ gap: '12px', marginTop: '5px' }}>
                <div style={{ background: 'rgba(20, 184, 166, 0.03)', border: '1px solid rgba(20, 184, 166, 0.1)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>قراءات العهد القديم</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)', display: 'block', marginTop: '2px' }}>{testamentSplit.oldTestament}</span>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.1)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>قراءات العهد الجديد</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)', display: 'block', marginTop: '2px' }}>{testamentSplit.newTestament}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Demographics Analytics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Age Brackets */}
        <div className="glass card">
          <div className="card-title">
            <span>التوزيع العمري للمشاركين</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            {demographics.ageBrackets.map((bracket, idx) => {
              const totalAgeCount = demographics.ageBrackets.reduce((sum, item) => sum + item.count, 0);
              const percent = Math.round((bracket.count / (totalAgeCount || 1)) * 100);
              const maxCount = Math.max(...demographics.ageBrackets.map(b => b.count), 1);
              const barWidth = (bracket.count / maxCount) * 100;
              
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ width: '80px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{bracket.label}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${barWidth}%`, 
                      background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))',
                      borderRadius: '3px'
                    }} />
                  </div>
                  <span style={{ width: '70px', fontSize: '0.8rem', color: 'var(--text-primary)', textAlign: 'left', fontWeight: 'bold' }}>
                    {bracket.count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Demographics */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">
              <span>توزيع الجنسين (ذكور vs إناث)</span>
              <User size={16} color="var(--accent-purple)" />
            </div>
            <div style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(() => {
                const totalG = demographics.gender.male + demographics.gender.female + demographics.gender.unknown;
                const maleP = Math.round((demographics.gender.male / (totalG || 1)) * 100);
                const femaleP = Math.round((demographics.gender.female / (totalG || 1)) * 100);
                const unknownP = Math.round((demographics.gender.unknown / (totalG || 1)) * 100);
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>ذكور ({maleP}%)</span>
                        <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>إناث ({femaleP}%)</span>
                      </div>
                      <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: `${maleP}%`, background: 'var(--primary)', height: '100%' }} />
                        <div style={{ width: `${femaleP}%`, background: 'var(--accent-pink)', height: '100%' }} />
                        {unknownP > 0 && <div style={{ width: `${unknownP}%`, background: 'var(--text-muted)', height: '100%' }} />}
                      </div>
                    </div>

                    <div className="responsive-2col" style={{ gap: '12px' }}>
                      <div style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>عدد الذكور</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', display: 'block', marginTop: '2px' }}>{demographics.gender.male}</span>
                      </div>
                      <div style={{ background: 'rgba(236, 72, 153, 0.03)', border: '1px solid rgba(236, 72, 153, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>عدد الإناث</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-pink)', display: 'block', marginTop: '2px' }}>{demographics.gender.female}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Grid of churches & activities */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Church stats */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">
              <span>توزيع المستخدمين حسب الكنيسة / الطائفة</span>
              <Sparkles size={16} color="var(--warning)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              {churchStats.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد بيانات مستخدمين بعد.</p>
              ) : null}
              {churchStats.map((ch, idx) => {
                const totalC = churchStats.reduce((sum, item) => sum + item.count, 0);
                const percent = Math.round((ch.count / (totalC || 1)) * 100);
                
                // Color palette array
                const colors = ['var(--primary)', 'var(--accent-purple)', 'var(--accent-teal)', 'var(--accent-pink)', 'var(--warning)'];

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{ch.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{ch.count} مشارك ({percent}%)</span>
                    </div>
                    {/* Bar visual percentage */}
                    <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${percent}%`, 
                        background: colors[idx % colors.length],
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="glass card">
          <div className="card-title">
            <span>الأنشطة الروحية الأخيرة</span>
            <Activity size={16} color="var(--accent-pink)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentActivities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد أنشطة حديثة بعد.</p>
            ) : null}
            {recentActivities.map((act) => {
              // Icon mapping
              let badgeColorClass = 'badge-primary';
              let badgeText = 'مستخدم';
              if (act.type === 'prayer') {
                badgeColorClass = 'badge-success';
                badgeText = 'طلب صلاة';
              } else if (act.type === 'reflection') {
                badgeColorClass = 'badge-warning';
                badgeText = 'تأمل';
              } else if (act.type === 'signup') {
                badgeColorClass = 'badge-primary';
                badgeText = 'تسجيل';
              }

              return (
                <div 
                  key={act.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <span className={`badge ${badgeColorClass}`} style={{ flexShrink: 0 }}>
                      {badgeText}
                    </span>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '220px'
                    }}>
                      {act.content}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
