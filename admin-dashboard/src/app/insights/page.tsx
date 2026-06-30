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

const FUNNEL_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#10b981'];
const XP_COLORS: Record<string, string> = {
  beginner: '#14b8a6',
  intermediate: '#6366f1',
  elite: '#a855f7',
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

function HeroMetric({
  label,
  value,
  hint,
  icon,
  color,
  glow,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
}) {
  return (
    <div
      className="glass insights-hero-metric"
      style={{ color, borderColor: `${color}33`, background: glow }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="insights-hero-label">{label}</div>
          <div className="insights-hero-value" style={{ color }}>{value}</div>
          <div className="insights-hero-hint">{hint}</div>
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: `${color}22`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  color = 'var(--text-primary)',
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="insights-stat-tile">
      <div className="insights-stat-value" style={{ color }}>{value}</div>
      <div className="insights-stat-label">{label}</div>
    </div>
  );
}

function GradientBar({
  percent,
  color,
  label,
  showBadge = true,
}: {
  percent: number;
  color: string;
  label?: string;
  showBadge?: boolean;
}) {
  const width = Math.max(percent, percent > 0 ? 6 : 0);
  return (
    <div className="insights-bar-track" style={{ height: label ? 22 : 18 }}>
      <div
        className="insights-bar-fill"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          boxShadow: `0 0 14px ${color}55`,
        }}
      />
      {showBadge && percent >= 8 ? (
        <span className="insights-bar-value-badge">{Math.round(percent)}%</span>
      ) : null}
    </div>
  );
}

function DonutChart({
  segments,
  size = 180,
  centerValue,
  centerLabel,
}: {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="insights-donut-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {segments.map((seg, index) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ filter: `drop-shadow(0 0 6px ${seg.color}66)` }}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
            {centerValue}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, maxWidth: 90 }}>
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="insights-legend">
        {segments.map((seg, index) => (
          <div key={index} className="insights-legend-item">
            <span className="insights-legend-dot" style={{ background: seg.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
            <span className="insights-legend-value" style={{ color: seg.color }}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekdayChart({ cells, maxValue }: { cells: WeekdayHeatmapCell[]; maxValue: number }) {
  const barW = 56;
  const gap = 24;
  const startX = 50;
  const chartH = 200;
  const svgWidth = startX + cells.length * (barW + gap) + 30;
  const peakIndex = cells.reduce(
    (best, cell, index) => (cell.completions > cells[best].completions ? index : best),
    0,
  );

  return (
    <div className="insights-chart-wrap">
      <svg viewBox={`0 0 ${svgWidth} ${chartH + 50}`} style={{ width: '100%', minWidth: svgWidth }}>
        <defs>
          <linearGradient id="weekday-bar-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="weekday-peak-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map(pct => {
          const val = Math.round((pct / 100) * maxValue);
          const y = 16 + ((100 - pct) / 100) * 150;
          return (
            <g key={pct}>
              <line x1="44" x2={svgWidth - 10} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x="38" y={y + 4} textAnchor="end" className="chart-axis-text" style={{ fontSize: 10 }}>
                {val}
              </text>
            </g>
          );
        })}

        {cells.map((cell, index) => {
          const barH = maxValue > 0 ? Math.max(6, (cell.completions / maxValue) * 150) : 6;
          const bx = startX + index * (barW + gap);
          const isPeak = index === peakIndex;
          const fill = isPeak ? 'url(#weekday-peak-grad)' : 'url(#weekday-bar-grad)';

          return (
            <g key={cell.dayIndex}>
              <rect x={bx} y={16} width={barW} height={150} rx="8" fill="rgba(255,255,255,0.03)" />
              <rect
                x={bx}
                y={166 - barH}
                width={barW}
                height={barH}
                rx="8"
                fill={fill}
                opacity={isPeak ? 1 : 0.85}
              />
              {isPeak ? (
                <rect
                  x={bx}
                  y={166 - barH}
                  width={barW}
                  height={barH}
                  rx="8"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  opacity="0.6"
                />
              ) : null}
              <text
                x={bx + barW / 2}
                y={Math.max(30, 166 - barH - 10)}
                textAnchor="middle"
                style={{ fontSize: 14, fontWeight: 800, fill: isPeak ? '#c4b5fd' : '#6ee7b7' }}
              >
                {cell.completions}
              </text>
              <text
                x={bx + barW / 2}
                y={182}
                textAnchor="middle"
                className="chart-axis-text"
                style={{ fontSize: 11, fontWeight: isPeak ? 800 : 600, fill: isPeak ? '#e9d5ff' : 'var(--text-secondary)' }}
              >
                {cell.dayName}
              </text>
              <text
                x={bx + barW / 2}
                y={198}
                textAnchor="middle"
                className="chart-axis-text"
                style={{ fontSize: 10, fill: 'var(--text-muted)' }}
              >
                {cell.share}%
              </text>
              {isPeak ? (
                <text x={bx + barW / 2} y={214} textAnchor="middle" style={{ fontSize: 9, fill: '#a855f7', fontWeight: 700 }}>
                  الأعلى
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  return (
    <div style={{ marginTop: 8 }}>
      {steps.map((step, index) => {
        const color = FUNNEL_COLORS[index] ?? 'var(--primary)';
        const dropoff =
          index > 0 && steps[index - 1].count > 0
            ? Math.round(((steps[index - 1].count - step.count) / steps[index - 1].count) * 100)
            : 0;

        return (
          <div key={step.key} className="insights-funnel-step">
            <div
              className="insights-funnel-index"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              {index + 1}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{step.label}</div>
              <GradientBar percent={step.rateFromRegistered} color={color} showBadge={step.rateFromRegistered >= 10} />
              <div className="insights-funnel-meta">
                {step.rateFromRegistered}% من المسجلين
                {index > 0 ? ` · ${step.rateFromPrevious}% من الخطوة السابقة` : ''}
                {dropoff > 0 ? ` · تسرب ${dropoff}%` : ''}
              </div>
            </div>
            <div>
              <div className="insights-funnel-count" style={{ color }}>{step.count}</div>
              <div className="insights-funnel-meta">مستخدم</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupBarList({
  groups,
  maxCompletions,
  variant,
}: {
  groups: GroupHealthRow[];
  maxCompletions: number;
  variant: 'top' | 'inactive';
}) {
  if (!groups.length) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
        {variant === 'top' ? 'لا توجد بيانات مجموعات.' : 'لا توجد مجموعات خاملة حالياً.'}
      </p>
    );
  }

  return (
    <div>
      {groups.map((group, index) => {
        const barPercent =
          variant === 'top' && maxCompletions > 0
            ? (group.completionsLast7Days / maxCompletions) * 100
            : 0;

        return (
          <div key={group.id} className="insights-group-row">
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 6 }}>
                {variant === 'top'
                  ? `${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`} ${group.name}`
                  : group.name}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 8 }}>
                  · {group.memberCount} عضو
                </span>
              </div>
              {variant === 'top' ? (
                <GradientBar
                  percent={barPercent}
                  color={index === 0 ? '#10b981' : index === 1 ? '#6366f1' : '#3b82f6'}
                  showBadge={false}
                />
              ) : (
                <span className="badge badge-warning">
                  {group.inactiveDays === null ? 'بدون نشاط' : `خامل منذ ${group.inactiveDays} يوم`}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'left', minWidth: 72 }}>
              {variant === 'top' ? (
                <>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>
                    {group.completionsLast7Days}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>خلوة/٧ أيام</div>
                </>
              ) : null}
              <Link href={`/groups/${group.id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                التفاصيل ←
              </Link>
            </div>
          </div>
        );
      })}
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-12px', marginBottom: '20px' }}>
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

  const maxGroupCompletions = useMemo(
    () => Math.max(...snapshot.topGroups.map(group => group.completionsLast7Days), 1),
    [snapshot.topGroups],
  );

  if (loading) {
    return (
      <div className="insights-page" style={{ padding: '20px' }}>
        <div style={{ height: '36px', width: '280px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '28px' }} className="animate-pulse" />
        <div className="insights-metrics-grid">
          {[1, 2, 3, 4].map(item => (
            <div key={item} style={{ height: '130px', background: 'var(--bg-secondary)', borderRadius: '16px' }} className="animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in insights-page">
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>التحليلات المتقدمة</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
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
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </header>

      {error ? (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--danger)',
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      ) : null}

      <section className="insights-metrics-grid">
        <HeroMetric
          label="Streak ٧+ أيام"
          value={snapshot.streak.activeStreak7Plus}
          hint={`متوسط streak الحالي: ${snapshot.streak.averageCurrentStreak} يوم`}
          icon={<Flame size={26} />}
          color="#f59e0b"
          glow="rgba(245,158,11,0.08)"
        />
        <HeroMetric
          label="Streak ٣٠+ يوم"
          value={snapshot.streak.activeStreak30Plus}
          hint={`متوسط أطول streak: ${snapshot.streak.averageLongestStreak} يوم`}
          icon={<Flame size={26} />}
          color="#10b981"
          glow="rgba(16,185,129,0.08)"
        />
        <HeroMetric
          label="خلوة أولى"
          value={snapshot.funnel[1]?.count ?? 0}
          hint={`${snapshot.funnel[1]?.rateFromRegistered ?? 0}% من ${snapshot.registeredCount} مسجل`}
          icon={<Activity size={26} />}
          color="#6366f1"
          glow="rgba(99,102,241,0.08)"
        />
        <HeroMetric
          label="تكرار الصلاة (+٣)"
          value={`${snapshot.prayerRepeat.repeatRate}%`}
          hint={`${snapshot.prayerRepeat.usersWithMoreThan3} مستخدم من المسجلين`}
          icon={<Heart size={26} />}
          color="#ef4444"
          glow="rgba(239,68,68,0.08)"
        />
      </section>

      <SectionCard
        title="🔥 Streak Analytics"
        subtitle="الأشخاص ذوو الـ streak النشط حالياً، مع متوسط طول الالتزام."
      >
        <div className="insights-stat-grid">
          <StatTile value={snapshot.streak.activeStreak7Plus} label="نشط ٧+ أيام" color="#f59e0b" />
          <StatTile value={snapshot.streak.activeStreak30Plus} label="نشط ٣٠+ يوم" color="#10b981" />
          <StatTile value={snapshot.streak.averageCurrentStreak} label="متوسط streak الحالي" color="#6366f1" />
          <StatTile value={snapshot.streak.averageLongestStreak} label="متوسط أطول streak" color="#a855f7" />
          <StatTile value={snapshot.streak.usersWithAnyStreak} label="لديهم streak نشط الآن" />
        </div>
      </SectionCard>

      <SectionCard
        title="📊 Funnel التحويل"
        subtitle={`من ${snapshot.registeredCount} مستخدم مسجل إلى التزام ٣٠ يوم متتالي.`}
      >
        <FunnelChart steps={snapshot.funnel} />
      </SectionCard>

      <SectionCard
        title="📅 Heatmap أيام الأسبوع"
        subtitle="أيام الأسبوع الأكثر نشاطاً في إتمام الخلوة — العمود الأعلى مميز بلون بنفسجي."
      >
        <WeekdayChart cells={snapshot.weekdayHeatmap} maxValue={maxWeekday} />
      </SectionCard>

      <section className="insights-two-col">
        <div className="glass card">
          <div className="card-title"><span>👥 مجموعات الأعلى إنجازاً (٧ أيام)</span></div>
          <GroupBarList groups={snapshot.topGroups} maxCompletions={maxGroupCompletions} variant="top" />
        </div>
        <div className="glass card">
          <div className="card-title"><span>💤 مجموعات خاملة (+١٤ يوم)</span></div>
          <GroupBarList groups={snapshot.inactiveGroups} maxCompletions={0} variant="inactive" />
        </div>
      </section>

      <section className="insights-two-col">
        <div className="glass card">
          <div className="card-title"><span>💎 توزيع مستويات XP</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '8px' }}>
            {snapshot.xpTiers.map(tier => {
              const color = XP_COLORS[tier.key] ?? 'var(--primary)';
              return (
                <div key={tier.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{tier.label}</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{tier.count}</span>
                  </div>
                  <GradientBar percent={tier.share} color={color} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{tier.share}% من النشطين</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass card">
          <div className="card-title"><span>📖 عمق القراءة</span></div>
          <DonutChart
            centerValue={`${snapshot.readingDepth.withReadingShare}%`}
            centerLabel="قراءة فعلية"
            segments={[
              {
                value: snapshot.readingDepth.withReadingEvidence,
                color: '#10b981',
                label: 'قراءة مسجلة',
              },
              {
                value: snapshot.readingDepth.markOnlyComplete,
                color: '#ef4444',
                label: 'أتمّ بدون قراءة',
              },
            ]}
          />
          <div className="insights-stat-grid" style={{ marginTop: 16 }}>
            <StatTile
              value={snapshot.readingDepth.avgChaptersPerSession}
              label="متوسط إصحاحات/جلسة"
              color="#10b981"
            />
            <StatTile
              value={`${snapshot.readingDepth.markOnlyShare}%`}
              label="أتمّ بدون قراءة"
              color="#ef4444"
            />
          </div>
        </div>
      </section>

      <SectionCard
        title="🙏 معدل تكرار الصلاة"
        subtitle="نسبة المستخدمين الذين سجّلوا أكثر من ٣ طلبات صلاة."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
          <DonutChart
            size={200}
            centerValue={`${snapshot.prayerRepeat.repeatRate}%`}
            centerLabel="من المسجلين"
            segments={[
              {
                value: snapshot.prayerRepeat.usersWithMoreThan3,
                color: '#ef4444',
                label: 'أكثر من ٣ طلبات',
              },
              {
                value: Math.max(snapshot.registeredCount - snapshot.prayerRepeat.usersWithMoreThan3, 0),
                color: 'rgba(255,255,255,0.08)',
                label: 'أقل من ٣ أو بدون',
              },
            ]}
          />
          <div className="insights-stat-grid" style={{ flex: 1, minWidth: 240 }}>
            <StatTile value={snapshot.prayerRepeat.usersWithMoreThan3} label="سجّلوا +٣ طلبات" color="#ef4444" />
            <StatTile value={snapshot.prayerRepeat.usersWithPrayers} label="لديهم طلبات صلاة" color="#6366f1" />
            <StatTile value={snapshot.prayerRepeat.totalPrayers} label="إجمالي الطلبات" />
            <StatTile value={snapshot.registeredCount} label="إجمالي المسجلين" />
          </div>
        </div>
      </SectionCard>

      <div
        style={{
          padding: '14px 16px',
          borderRadius: '12px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
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
