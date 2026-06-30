'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  BarChart3,
  Flame,
  Heart,
  RefreshCw,
} from 'lucide-react';
import {
  computeFunnel,
  computeGroupHealth,
  computePrayerRepeatStats,
  computeReadingDepth,
  computeStreakAnalytics,
  computeWeekdayHeatmap,
  computeXpDistribution,
  buildCompletedDatesByUser,
  getInsightsStartDate,
  type DevotionLogRow,
  type DirectoryUser,
  type FunnelStep,
  type GroupHealthRow,
  type GroupMemberRow,
  type GroupRow,
  type PrayerRepeatStats,
  type ReadingDepthStats,
  type ReadingLogRow,
  type StreakAnalytics,
  type WeekdayHeatmapCell,
  type XpTierRow,
} from '@/lib/insightsAnalytics';

type InsightsSnapshot = {
  registeredCount: number;
  streak: StreakAnalytics;
  funnel: FunnelStep[];
  weekdayHeatmap: WeekdayHeatmapCell[];
  topGroups: GroupHealthRow[];
  inactiveGroups: GroupHealthRow[];
  xpTiers: XpTierRow[];
  readingDepth: ReadingDepthStats;
  prayerRepeat: PrayerRepeatStats;
};

const emptySnapshot = (): InsightsSnapshot => ({
  registeredCount: 0,
  streak: {
    activeStreak7Plus: 0,
    activeStreak30Plus: 0,
    averageCurrentStreak: 0,
    averageLongestStreak: 0,
    usersWithAnyStreak: 0,
  },
  funnel: [],
  weekdayHeatmap: [],
  topGroups: [],
  inactiveGroups: [],
  xpTiers: [],
  readingDepth: {
    avgChaptersPerSession: 0,
    withReadingEvidence: 0,
    markOnlyComplete: 0,
    markOnlyShare: 0,
    withReadingShare: 0,
  },
  prayerRepeat: {
    usersWithPrayers: 0,
    usersWithMoreThan3: 0,
    repeatRate: 0,
    totalPrayers: 0,
  },
});

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    primary: 'rgba(99, 102, 241, 0.1)',
    success: 'rgba(16, 185, 129, 0.1)',
    warning: 'rgba(245, 158, 11, 0.1)',
    danger: 'rgba(239, 68, 68, 0.1)',
  };
  const colors = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
  };

  return (
    <div className="glass metric-card">
      <div className="metric-info">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{value}</span>
        <span className="metric-trend trend-up">
          <span>{hint}</span>
        </span>
      </div>
      <div
        className="metric-icon-wrapper"
        style={{ background: tones[tone], color: colors[tone] }}
      >
        {icon}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <div className="glass card">
        <div className="card-title">
          <span>{title}</span>
        </div>
        {subtitle ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '-8px', marginBottom: '16px' }}>
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const [snapshot, setSnapshot] = useState<InsightsSnapshot>(emptySnapshot());
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = getInsightsStartDate(24);

      const [
        usersResult,
        logsResult,
        readingResult,
        prayerResult,
        groupsResult,
        membersResult,
      ] = await Promise.all([
        supabase.rpc('admin_user_directory'),
        supabase.rpc('get_devotion_logs_in_range', {
          start_date: startDate,
          end_date: today,
        }),
        supabase.rpc('get_completed_reading_logs_in_range', {
          start_date: startDate,
          end_date: today,
        }),
        supabase.rpc('get_prayer_counts_by_user'),
        supabase.from('devotion_groups').select('id, name, created_at'),
        supabase.from('devotion_group_members').select('group_id, user_id'),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (logsResult.error) throw logsResult.error;
      if (readingResult.error) throw readingResult.error;
      if (prayerResult.error) throw prayerResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (membersResult.error) throw membersResult.error;

      const registeredUsers = (usersResult.data ?? []) as DirectoryUser[];
      const logs = (logsResult.data ?? []) as DevotionLogRow[];
      const readingLogs = (readingResult.data ?? []) as ReadingLogRow[];
      const prayerCounts = (prayerResult.data ?? []) as Array<{
        user_id: string;
        prayer_count: number;
      }>;
      const groups = (groupsResult.data ?? []) as GroupRow[];
      const members = (membersResult.data ?? []) as GroupMemberRow[];

      const completedDatesByUser = buildCompletedDatesByUser(logs);
      const { topGroups, inactiveGroups } = computeGroupHealth({
        groups,
        members,
        completedDatesByUser,
        today,
      });

      setSnapshot({
        registeredCount: registeredUsers.length,
        streak: computeStreakAnalytics(completedDatesByUser),
        funnel: computeFunnel(registeredUsers, completedDatesByUser),
        weekdayHeatmap: computeWeekdayHeatmap(logs),
        topGroups,
        inactiveGroups,
        xpTiers: computeXpDistribution(completedDatesByUser),
        readingDepth: computeReadingDepth(readingLogs),
        prayerRepeat: computePrayerRepeatStats(
          prayerCounts,
          registeredUsers.length,
        ),
      });
      setRefreshedAt(new Date());
    } catch (fetchError: any) {
      console.error('[insights] fetch failed:', fetchError);
      setError(
        fetchError?.message ||
          'تعذر تحميل التحليلات. تأكد من تشغيل ملفات SQL الخاصة بالأدمن.',
      );
      setSnapshot(emptySnapshot());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const maxWeekday = useMemo(
    () => Math.max(...snapshot.weekdayHeatmap.map(cell => cell.completions), 1),
    [snapshot.weekdayHeatmap],
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }}>
        <div style={{ height: '32px', width: '260px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '24px' }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map(item => (
            <div key={item} style={{ height: '110px', background: 'var(--bg-secondary)', borderRadius: '12px' }} className="animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>
      <header style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>التحليلات المتقدمة</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            مؤشرات الالتزام، التحويل، عمق القراءة، وصحة المجموعات — آخر تحديث {refreshedAt.toLocaleTimeString('ar-EG')}
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="glass"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </header>

      {error ? (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <MetricCard
          label="Streak ٧+ أيام"
          value={snapshot.streak.activeStreak7Plus}
          hint={`متوسط streak الحالي: ${snapshot.streak.averageCurrentStreak} يوم`}
          icon={<Flame size={22} />}
          tone="warning"
        />
        <MetricCard
          label="Streak ٣٠+ يوم"
          value={snapshot.streak.activeStreak30Plus}
          hint={`متوسط أطول streak: ${snapshot.streak.averageLongestStreak} يوم`}
          icon={<Flame size={22} />}
          tone="success"
        />
        <MetricCard
          label="مستخدمون بخلوة أولى"
          value={snapshot.funnel[1]?.count ?? 0}
          hint={`${snapshot.funnel[1]?.rateFromRegistered ?? 0}% من المسجلين`}
          icon={<Activity size={22} />}
          tone="primary"
        />
        <MetricCard
          label="طلبات صلاة متكررة"
          value={`${snapshot.prayerRepeat.repeatRate}%`}
          hint={`${snapshot.prayerRepeat.usersWithMoreThan3} مستخدم سجّل +٣ طلبات`}
          icon={<Heart size={22} />}
          tone="danger"
        />
      </section>

      <SectionCard
        title="🔥 Streak Analytics"
        subtitle="الأشخاص ذوو الـ streak النشط حالياً، مع متوسط طول الالتزام."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)' }}>{snapshot.streak.activeStreak7Plus}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>نشط ٧+ أيام</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>{snapshot.streak.activeStreak30Plus}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>نشط ٣٠+ يوم</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{snapshot.streak.averageCurrentStreak}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>متوسط streak الحالي</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{snapshot.streak.usersWithAnyStreak}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>لديهم streak نشط الآن</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="📊 Funnel التحويل"
        subtitle={`من ${snapshot.registeredCount} مستخدم مسجل إلى التزام ٣٠ يوم متتالي.`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {snapshot.funnel.map((step, index) => (
            <div key={step.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {index + 1}. {step.label}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {step.count} مستخدم — {step.rateFromRegistered}% من المسجلين
                  {index > 0 ? ` · ${step.rateFromPrevious}% من الخطوة السابقة` : ''}
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(step.rateFromRegistered, 4)}%`,
                    height: '100%',
                    background: index === 0 ? 'var(--primary)' : index === 1 ? '#3b82f6' : index === 2 ? 'var(--warning)' : 'var(--success)',
                    borderRadius: '6px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="📅 Heatmap أيام الأسبوع"
        subtitle="أيام الأسبوع الأكثر نشاطاً في إتمام الخلوة."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(72px, 1fr))', gap: '10px' }}>
          {snapshot.weekdayHeatmap.map(cell => (
            <div
              key={cell.dayIndex}
              style={{
                textAlign: 'center',
                padding: '14px 8px',
                borderRadius: '12px',
                background: `rgba(16,185,129,${0.08 + (cell.completions / maxWeekday) * 0.28})`,
                border: '1px solid rgba(16,185,129,0.18)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{cell.dayName}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{cell.completions}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{cell.share}%</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="glass card">
          <div className="card-title"><span>👥 مجموعات الأعلى إنجازاً (٧ أيام)</span></div>
          {snapshot.topGroups.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد بيانات مجموعات.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {snapshot.topGroups.map((group, index) => (
                <div key={group.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`} {group.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{group.memberCount} عضو</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, color: 'var(--success)' }}>{group.completionsLast7Days}</div>
                    <Link href={`/groups/${group.id}`} style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none' }}>التفاصيل</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass card">
          <div className="card-title"><span>💤 مجموعات خاملة (+١٤ يوم)</span></div>
          {snapshot.inactiveGroups.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد مجموعات خاملة حالياً.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {snapshot.inactiveGroups.map(group => (
                <div key={group.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{group.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{group.memberCount} عضو</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span className="badge badge-warning">
                      {group.inactiveDays === null ? 'بدون نشاط' : `${group.inactiveDays} يوم`}
                    </span>
                    <div>
                      <Link href={`/groups/${group.id}`} style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none' }}>التفاصيل</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="glass card">
          <div className="card-title"><span>💎 توزيع مستويات XP</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {snapshot.xpTiers.map(tier => (
              <div key={tier.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{tier.label}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tier.count} ({tier.share}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${tier.share}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass card">
          <div className="card-title"><span>📖 عمق القراءة</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>{snapshot.readingDepth.avgChaptersPerSession}</div>
              <div style={{ fontSize: '0.8rem' }}>متوسط إصحاحات/جلسة</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{snapshot.readingDepth.withReadingShare}%</div>
              <div style={{ fontSize: '0.8rem' }}>سجّلوا قراءة فعلية</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>{snapshot.readingDepth.markOnlyShare}%</div>
              <div style={{ fontSize: '0.8rem' }}>أتمّوا بدون قراءة مسجلة</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{snapshot.readingDepth.markOnlyComplete}</div>
              <div style={{ fontSize: '0.8rem' }}>جلسة بدون أدلة قراءة</div>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="🙏 معدل تكرار الصلاة"
        subtitle="نسبة المستخدمين الذين سجّلوا أكثر من ٣ طلبات صلاة."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)' }}>{snapshot.prayerRepeat.repeatRate}%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>من إجمالي المسجلين</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{snapshot.prayerRepeat.usersWithMoreThan3}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>سجّلوا أكثر من ٣ طلبات</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{snapshot.prayerRepeat.usersWithPrayers}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>لديهم طلبات صلاة</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{snapshot.prayerRepeat.totalPrayers}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>إجمالي طلبات الصلاة</div>
          </div>
        </div>
      </SectionCard>

      <div
        style={{
          padding: '14px 16px',
          borderRadius: '12px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <BarChart3 size={16} />
        البيانات محسوبة من آخر ٢٤ شهراً. لو ظهرت أخطاء RPC، شغّل ملف `supabase/get_users_directory.sql` في Supabase.
      </div>
    </div>
  );
}
