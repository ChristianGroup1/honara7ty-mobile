'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Heart,
  Layers,
  LifeBuoy,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import {
  AppPulse,
  activitySummary,
  fetchAppPulse,
  formatOpenedAt,
  healthVerdict,
  pct,
  platformLabel,
} from '@/lib/appPulse';

function Metric({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string | number;
  note?: string;
  color?: string;
}) {
  return (
    <div className="insights-stat-tile">
      <div className="insights-stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="insights-stat-label">{label}</div>
      {note ? (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          {note}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState<AppPulse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAppPulse();
      setPulse(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل النبض');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verdict = pulse ? healthVerdict(pulse) : null;
  const verdictColor =
    verdict?.level === 'good'
      ? 'var(--success)'
      : verdict?.level === 'warn'
        ? 'var(--warning)'
        : verdict?.level === 'bad'
          ? 'var(--danger)'
          : 'var(--text-secondary)';
  const VerdictIcon =
    verdict?.level === 'good'
      ? CheckCircle2
      : verdict?.level === 'bad'
        ? XCircle
        : AlertTriangle;

  return (
    <div className="dashboard-container" style={{ display: 'grid', gap: 20 }}>
      <section className="card glass" style={{ padding: 22 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              <Activity size={16} />
              نبض التطبيق
            </div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>هل هنا راحتي شغال تمام؟</h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 620, lineHeight: 1.7 }}>
              نظرة واحدةحدة على الفتحات، النشاط، الخلوة، والمشاكل — عشان تعرف بسرعة لو التطبيق
              حيّ أو محتاج متابعة.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void load()}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : undefined} />
            تحديث
          </button>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: 'var(--danger-glow)',
              color: 'var(--danger)',
            }}
          >
            {error}
          </div>
        ) : null}

        {verdict ? (
          <div
            style={{
              marginTop: 18,
              padding: 18,
              borderRadius: 16,
              border: `1px solid ${verdictColor}44`,
              background: `${verdictColor}12`,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <VerdictIcon size={28} color={verdictColor} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: verdictColor }}>
                {verdict.title}
              </div>
              <div style={{ marginTop: 6, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {verdict.detail}
              </div>
              {pulse ? (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  آخر تحديث:{' '}
                  {new Date(pulse.refreshedAt).toLocaleString('ar-EG', {
                    timeZone: 'Africa/Cairo',
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : loading ? (
          <div style={{ marginTop: 18, color: 'var(--text-secondary)' }}>جاري قراءة الأرقام…</div>
        ) : null}
      </section>

      {pulse ? (
        <>
          <section>
            <div className="card-title" style={{ marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={18} /> هل الناس بتفتح التطبيق؟
              </span>
            </div>
            {pulse.opensError ? (
              <div className="card glass" style={{ color: 'var(--warning)', marginBottom: 12 }}>
                فتحات التطبيق: {pulse.opensError}
              </div>
            ) : null}
            <div className="insights-stat-grid">
              <Metric
                label="فتحوا النهاردة"
                value={pulse.opens.opened_today}
                note="مستخدمون مميزون"
                color="var(--accent-teal)"
              />
              <Metric label="فتحوا آخر ٧ أيام" value={pulse.opens.opened_7_days} />
              <Metric label="فتحوا آخر ٣٠ يوم" value={pulse.opens.opened_30_days} />
              <Metric
                label="مستخدمون إجمالي"
                value={pulse.totalUsers}
                note={`جدد آخر ٧ أيام: ${pulse.newUsers7d}`}
              />
            </div>
            <div className="card glass" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>مين فتح التطبيق</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                آخر ٣٠ يوم: آيفون أو أندرويد، واللي عمله بعد الدخول
              </div>
              {!pulse.opens.peopleReady ? (
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  الأعداد ظاهرة، والأسماء محتاجة تحديث دالة فتح التطبيق على قاعدة البيانات.
                </div>
              ) : pulse.opens.people.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>
                  لسه مفيش حد مسجّل فتح التطبيق خلال آخر ٣٠ يوم.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pulse.opens.people.slice(0, 20).map((person) => (
                    <Link
                      key={person.user_id}
                      href={`/users/${person.user_id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <span>
                        <strong>{person.full_name || person.email}</strong>
                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13 }}>
                          {platformLabel(person.platform)} · {person.email}
                        </span>
                        <span style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                          {activitySummary(person)}
                        </span>
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'left' }}>
                        {formatOpenedAt(person.last_opened_at)}
                        <span style={{ display: 'block' }}>{person.opens_30_days} فتحة</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="card-title" style={{ marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} /> النشاط اليومي / الأسبوعي / الشهري
              </span>
            </div>
            {pulse.insightError ? (
              <div className="card glass" style={{ color: 'var(--warning)', marginBottom: 12 }}>
                لقطة النشاط: {pulse.insightError}
              </div>
            ) : null}
            <div className="insights-stat-grid">
              <Metric
                label="DAU اليوم"
                value={pulse.insight.dau_users}
                note="أي تفاعل مسجّل النهاردة"
              />
              <Metric label="WAU أسبوع" value={pulse.insight.wau_users} />
              <Metric label="MAU شهر" value={pulse.insight.mau_users} />
              <Metric
                label="خامل ١٤ يوم"
                value={pulse.insight.inactive_14_days}
                note={`${pct(pulse.insight.inactive_14_days, pulse.totalUsers)}% من الكل`}
                color={
                  pulse.insight.inactive_14_days > pulse.totalUsers * 0.5
                    ? 'var(--warning)'
                    : undefined
                }
              />
            </div>
          </section>

          <section>
            <div className="card-title" style={{ marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Heart size={18} /> هل الخلوة والمحتوى شغالين؟
              </span>
            </div>
            <div className="insights-stat-grid">
              <Metric
                label="خلوة اليوم"
                value={`${pulse.todayDevotionDone}`}
                note={`${pulse.todayDevotionRate}% من المستخدمين`}
                color="var(--success)"
              />
              <Metric label="فصول مقروءة (كل الوقت)" value={pulse.chaptersRead} />
              <Metric
                label="صلوات ٧ أيام"
                value={pulse.prayers7d || pulse.insight.new_prayers_7_days}
              />
              <Metric
                label="تأملات ٧ أيام"
                value={pulse.reflections7d || pulse.insight.reflections_7_days}
              />
              <Metric label="مجموعات" value={pulse.groups} />
              <Metric
                label="صلوات متأخرة +١٤ يوم"
                value={pulse.insight.unanswered_prayers_14_days}
                color={
                  pulse.insight.unanswered_prayers_14_days > 0
                    ? 'var(--warning)'
                    : 'var(--success)'
                }
              />
              <Metric
                label="عودة بعد ٧ أيام"
                value={`${
                  pulse.insight.retention_7_eligible > 0
                    ? pct(
                        pulse.insight.retention_7_returned,
                        pulse.insight.retention_7_eligible,
                      )
                    : 0
                }%`}
                note={`${pulse.insight.retention_7_returned}/${pulse.insight.retention_7_eligible}`}
              />
              <Metric
                label="تذاكر مفتوحة"
                value={pulse.openTickets}
                color={pulse.openTickets > 0 ? 'var(--warning)' : 'var(--success)'}
              />
            </div>
          </section>

          <section className="card glass">
            <div className="card-title">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={18} /> النسخ المستخدمة (٧ أيام)
              </span>
            </div>
            {pulse.opens.versions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                لسه مفيش بيانات فتحات/نسخ. بعد ما المستخدمين يفتحوا التطبيق المتصل، هتظهر هنا.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>النسخة</th>
                      <th>البناء</th>
                      <th>المنصة</th>
                      <th>مستخدمون</th>
                      <th>فتحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulse.opens.versions.map((row) => (
                      <tr
                        key={`${row.app_version}-${row.build_number}-${row.platform}`}
                      >
                        <td>{row.app_version || '—'}</td>
                        <td>{row.build_number || '—'}</td>
                        <td>{platformLabel(row.platform)}</td>
                        <td>{row.users_7_days}</td>
                        <td>{row.opens_7_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card glass">
            <div className="card-title">جودة البيانات</div>
            <div className="insights-stat-grid">
              <Metric label="بدون اسم" value={pulse.insight.missing_name} />
              <Metric label="بدون كنيسة" value={pulse.insight.missing_church} />
              <Metric label="بدون تاريخ ميلاد" value={pulse.insight.missing_birth_date} />
              <Metric
                label="خامل ٣٠ يوم"
                value={pulse.insight.inactive_30_days}
                note="خطر تسرب"
              />
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <Link className="card glass" href="/health" style={{ padding: 18 }}>
              <Activity size={18} color="var(--accent-teal)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>صحة الخلوة بالتفصيل</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                اتجاهات يومية ومقارنات
              </div>
            </Link>
            <Link className="card glass" href="/insights" style={{ padding: 18 }}>
              <TrendingUp size={18} color="var(--primary)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>تحليلات متقدمة</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                سلوك أعمق
              </div>
            </Link>
            <Link className="card glass" href="/users" style={{ padding: 18 }}>
              <Users size={18} color="var(--accent-purple)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>المستخدمون</div>
            </Link>
            <Link className="card glass" href="/groups" style={{ padding: 18 }}>
              <Layers size={18} color="var(--accent-pink)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>المجموعات</div>
            </Link>
            <Link className="card glass" href="/tickets" style={{ padding: 18 }}>
              <LifeBuoy size={18} color="var(--warning)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>تذاكر المساعدة</div>
            </Link>
            <Link className="card glass" href="/moderation" style={{ padding: 18 }}>
              <BookOpen size={18} color="var(--success)" />
              <div style={{ marginTop: 10, fontWeight: 800 }}>الإشراف</div>
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
