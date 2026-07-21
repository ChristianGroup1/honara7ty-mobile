'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Megaphone,
  Sparkles,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Smartphone,
  WifiOff,
  Clock,
  RefreshCw,
  Eye,
  ArrowRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface SendResult {
  broadcast_id: string | null;
  sent: number;
  failed: number;
  total: number;
  stale_removed: number;
  no_token_users: number;
  total_users: number;
}

interface Broadcast {
  id: string;
  title: string;
  body: string;
  total_tokens: number;
  sent: number;
  failed: number;
  stale_removed: number;
  no_token_users: number;
  created_at: string;
}

interface Recipient {
  user_id: string;
  status: 'sent' | 'failed' | 'stale';
  profiles: { full_name: string | null } | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pphbwecwwotrfqjyrsai.supabase.co';

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pct(part: number, total: number) {
  if (!total) return '0';
  return ((part / total) * 100).toFixed(0);
}

// ─── Sub-component: Recipient Drawer ───────────────────────────────────────

function RecipientDrawer({
  broadcast,
  onClose,
}: {
  broadcast: Broadcast;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'sent' | 'failed' | 'stale' | 'all'>('sent');

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Step 1: fetch recipients for this broadcast
      const { data: rows, error } = await supabase
        .from('notification_broadcast_recipients')
        .select('user_id, status')
        .eq('broadcast_id', broadcast.id)
        .order('status');

      if (error) {
        console.error('recipients query error:', error);
        setRecipients([]);
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        setRecipients([]);
        setLoading(false);
        return;
      }

      // Step 2: fetch real names via existing RPC (reads auth.users metadata)
      const userIds = [...new Set(rows.map(r => r.user_id as string))];
      const { data: usersData } = await supabase
        .rpc('get_users_by_ids', { user_ids: userIds });

      const nameMap: Record<string, string | null> = {};
      for (const u of usersData ?? []) {
        nameMap[u.id as string] = (u.full_name as string) || (u.email as string) || null;
      }

      const enriched: Recipient[] = rows.map(r => ({
        user_id: r.user_id as string,
        status: r.status as 'sent' | 'failed' | 'stale',
        profiles: { full_name: nameMap[r.user_id as string] ?? null },
      }));

      setRecipients(enriched);
      setLoading(false);
    };
    load();
  }, [broadcast.id]);


  const filtered = recipients.filter(r => {
    const matchTab = activeTab === 'all' || r.status === activeTab;
    const q = search.toLowerCase();
    const name = (r.profiles?.full_name ?? '').toLowerCase();
    const uid = r.user_id.toLowerCase();
    return matchTab && (!q || name.includes(q) || uid.includes(q));
  });

  const counts = {
    all: recipients.length,
    sent: recipients.filter(r => r.status === 'sent').length,
    failed: recipients.filter(r => r.status === 'failed').length,
    stale: recipients.filter(r => r.status === 'stale').length,
  };

  const statusConfig = {
    sent: { label: 'وصل', color: 'var(--success)', bg: 'rgba(16,185,129,0.1)', emoji: '✅' },
    failed: { label: 'فشل', color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)', emoji: '⚠️' },
    stale: { label: 'token منتهي', color: 'var(--accent-teal)', bg: 'rgba(20,184,166,0.1)', emoji: '🗑️' },
  };

  return (
    <div className="notif-drawer-overlay" onClick={onClose}>
      <div className="notif-drawer" onClick={e => e.stopPropagation()} style={{ direction: 'rtl' }}>
        {/* Header */}
        <div className="notif-drawer-header">
          <div>
            <h2 className="notif-drawer-title">مستلمو الإشعار</h2>
            <p className="notif-drawer-subtitle">"{broadcast.title}"</p>
            <p className="notif-drawer-date">{fmtDate(broadcast.created_at)}</p>
          </div>
          <button className="notif-drawer-close" onClick={onClose}>
            <XCircle size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="notif-drawer-tabs">
          {(['all', 'sent', 'failed', 'stale'] as const).map(tab => (
            <button
              key={tab}
              className={`notif-drawer-tab ${activeTab === tab ? 'notif-drawer-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'الكل' : statusConfig[tab].emoji + ' ' + statusConfig[tab].label}
              <span className="notif-drawer-tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="notif-drawer-search-wrap">
          <div className="notif-search-box">
            <Search size={14} color="var(--text-muted)" />
            <input
              className="notif-search-input"
              type="text"
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="notif-search-clear" onClick={() => setSearch('')}>
                <XCircle size={13} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="notif-history-loading">
            <Loader2 size={24} className="spin" color="var(--primary)" />
          </div>
        ) : (
          <div className="notif-drawer-list">
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                لا يوجد نتائج
              </p>
            ) : (
              filtered.slice(0, 300).map((r, i) => {
                const cfg = statusConfig[r.status];
                return (
                  <div key={r.user_id + r.status} className="notif-drawer-row">
                    <span className="notif-drawer-idx">{i + 1}</span>
                    <div className="notif-drawer-avatar">
                      {(r.profiles?.full_name ?? '؟').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="notif-drawer-name">
                      {r.profiles?.full_name || <span style={{ color: 'var(--text-muted)' }}>(بدون اسم)</span>}
                    </span>
                    <span
                      className="notif-hstat"
                      style={{ background: cfg.bg, color: cfg.color, marginRight: 'auto' }}
                    >
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                );
              })
            )}
            {filtered.length > 300 && (
              <p className="notif-table-note">يُعرض أول 300 نتيجة</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  // Compose state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // History state
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerBroadcast, setDrawerBroadcast] = useState<Broadcast | null>(null);

  // Token stats
  const [tokenCount, setTokenCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Load history ──────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('notification_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setBroadcasts(data ?? []);
    setHistoryLoading(false);
  }, []);

  // ── Load token stats ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const [{ count: tokens }, { count: users }] = await Promise.all([
      supabase.from('user_push_tokens').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ]);
    setTokenCount(tokens ?? 0);
    setTotalUsers(users ?? 0);
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, [loadHistory, loadStats]);

  // ── Send ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setLastResult(null);
    setSendError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSendError('غير مصرح لك بهذا الإجراء');
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-broadcast-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ title: title.trim(), body: body.trim() }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        setSendError(data.error || 'حدث خطأ أثناء الإرسال');
        return;
      }

      setLastResult(data as SendResult);
      setTitle('');
      setBody('');
      await Promise.all([loadHistory(), loadStats()]);
    } catch (err) {
      setSendError('حدث خطأ في الاتصال بالخادم');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const charLimitBody = 200;
  const isReady = title.trim().length > 0 && body.trim().length > 0 && !sending;
  const noTokenCount = Math.max(0, totalUsers - tokenCount);

  return (
    <div className="notifications-page" style={{ direction: 'rtl' }}>

      {/* Drawer */}
      {drawerBroadcast && (
        <RecipientDrawer
          broadcast={drawerBroadcast}
          onClose={() => setDrawerBroadcast(null)}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="notif-header">
        <div className="notif-header-icon">
          <Megaphone size={28} color="var(--primary)" />
        </div>
        <div>
          <h1 className="notif-title">إشعارات جماعية</h1>
          <p className="notif-subtitle">أرسل إشعاراً فورياً لجميع المستخدمين وتابع نتائجه</p>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="notif-stats-bar">
        <div className="notif-stat-item">
          <Users size={16} color="var(--primary)" />
          <span className="notif-stat-val">
            {statsLoading ? '...' : totalUsers.toLocaleString()}
          </span>
          <span className="notif-stat-label">إجمالي المستخدمين</span>
        </div>
        <div className="notif-stat-divider" />
        <div className="notif-stat-item">
          <Smartphone size={16} color="var(--success)" />
          <span className="notif-stat-val">
            {statsLoading ? '...' : tokenCount.toLocaleString()}
          </span>
          <span className="notif-stat-label">لديهم token (يصلهم الإشعار)</span>
        </div>
        <div className="notif-stat-divider" />
        <div className="notif-stat-item">
          <WifiOff size={16} color="var(--text-muted)" />
          <span className="notif-stat-val">
            {statsLoading ? '...' : noTokenCount.toLocaleString()}
          </span>
          <span className="notif-stat-label">بدون token (رفضوا الإذن)</span>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────── */}
      <div className="notif-grid">

        {/* ── Left: Compose + Result ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="notif-compose-card glass">
            <div className="notif-compose-header">
              <Sparkles size={18} color="var(--primary)" />
              <span>كتابة الإشعار</span>
            </div>

            <div className="notif-field">
              <label className="notif-label" htmlFor="notif-title">عنوان الإشعار</label>
              <input
                id="notif-title"
                type="text"
                className="notif-input"
                placeholder="مثال: رسالة من فريق هنا راحتي"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                disabled={sending}
              />
              <span className="notif-char-count">{title.length} / 100</span>
            </div>

            <div className="notif-field">
              <label className="notif-label" htmlFor="notif-body">نص الإشعار</label>
              <textarea
                id="notif-body"
                className="notif-textarea"
                placeholder="اكتب رسالتك هنا..."
                value={body}
                onChange={e => setBody(e.target.value)}
                maxLength={charLimitBody}
                rows={4}
                disabled={sending}
              />
              <span
                className="notif-char-count"
                style={{ color: body.length >= charLimitBody ? 'var(--danger)' : 'var(--text-muted)' }}
              >
                {body.length} / {charLimitBody}
              </span>
            </div>

            {(title || body) && (
              <div className="notif-preview">
                <p className="notif-preview-label">معاينة الإشعار</p>
                <div className="notif-preview-bubble">
                  <Bell size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="notif-preview-title">{title || '(بدون عنوان)'}</p>
                    <p className="notif-preview-body">{body || '(بدون نص)'}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              id="send-notification-btn"
              className={`notif-send-btn ${isReady ? 'notif-send-btn-active' : ''}`}
              onClick={handleSend}
              disabled={!isReady}
            >
              {sending ? (
                <><Loader2 size={18} className="spin" /><span>جاري الإرسال...</span></>
              ) : (
                <><Send size={18} /><span>إرسال للجميع</span></>
              )}
            </button>
          </div>

          {/* Send result */}
          {lastResult && (
            <div className="notif-result-card notif-result-card-success glass">
              <div className="notif-result-card-header">
                <CheckCircle size={20} color="var(--success)" />
                <span>نتيجة الإرسال</span>
              </div>
              <div className="notif-result-grid">
                <div className="notif-result-stat">
                  <span className="notif-result-stat-val" style={{ color: 'var(--success)' }}>
                    {lastResult.sent.toLocaleString()}
                  </span>
                  <span className="notif-result-stat-label">✅ وصل</span>
                </div>
                <div className="notif-result-stat">
                  <span className="notif-result-stat-val" style={{ color: lastResult.failed > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {lastResult.failed.toLocaleString()}
                  </span>
                  <span className="notif-result-stat-label">⚠️ فشل حقيقي</span>
                </div>
                <div className="notif-result-stat">
                  <span className="notif-result-stat-val" style={{ color: 'var(--accent-teal)' }}>
                    {lastResult.stale_removed.toLocaleString()}
                  </span>
                  <span className="notif-result-stat-label">
                    <Trash2 size={11} style={{ marginLeft: 3 }} />
                    token منتهي محذوف
                  </span>
                </div>
                <div className="notif-result-stat">
                  <span className="notif-result-stat-val" style={{ color: 'var(--text-muted)' }}>
                    {lastResult.no_token_users.toLocaleString()}
                  </span>
                  <span className="notif-result-stat-label">📵 بدون token</span>
                </div>
              </div>
              {lastResult.stale_removed > 0 && (
                <p className="notif-stale-note">
                  ✅ تم حذف {lastResult.stale_removed} token منتهية تلقائياً — الإرسال القادم أدق
                </p>
              )}
              {lastResult.broadcast_id && (
                <button
                  className="notif-view-recipients-btn"
                  onClick={() => {
                    const b = broadcasts.find(x => x.id === lastResult.broadcast_id);
                    if (b) setDrawerBroadcast(b);
                  }}
                >
                  <Eye size={15} />
                  <span>شوف مين وصله بالاسم</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {sendError && (
            <div className="notif-result notif-result-error glass">
              <XCircle size={22} color="var(--danger)" />
              <div>
                <p className="notif-result-title">فشل الإرسال</p>
                <p className="notif-result-detail">{sendError}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Info + History ─────────────────────────────────── */}
        <div className="notif-side">
          <div className="notif-info-card glass">
            <div className="notif-info-header">
              <Users size={18} color="var(--accent-teal)" />
              <span>معلومات مهمة</span>
            </div>
            <ul className="notif-info-list">
              <li>الـ tokens المنتهية تُحذف تلقائياً بعد كل إرسال</li>
              <li>الفشل الحقيقي: network errors أو أخطاء Firebase</li>
              <li>بدون token: رفضوا الإذن أو ما فتحوش التطبيق</li>
              <li>اضغط "عرض المستلمين" لترى الأسماء بالتفصيل</li>
            </ul>
          </div>

          {/* History */}
          <div className="notif-history-card glass">
            <div className="notif-history-header">
              <Clock size={16} color="var(--primary)" />
              <span>آخر الإشعارات المُرسلة</span>
              <button className="notif-refresh-btn" onClick={loadHistory} title="تحديث">
                <RefreshCw size={14} />
              </button>
            </div>

            {historyLoading ? (
              <div className="notif-history-loading">
                <Loader2 size={18} className="spin" color="var(--primary)" />
              </div>
            ) : broadcasts.length === 0 ? (
              <p className="notif-history-empty">لا يوجد إشعارات مُرسلة بعد</p>
            ) : (
              <div className="notif-history-list">
                {broadcasts.map(b => (
                  <div key={b.id} className="notif-history-item">
                    <button
                      className="notif-history-item-header"
                      onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    >
                      <div className="notif-history-title-row">
                        <span className="notif-history-title">{b.title}</span>
                        {expandedId === b.id
                          ? <ChevronUp size={14} color="var(--text-muted)" />
                          : <ChevronDown size={14} color="var(--text-muted)" />
                        }
                      </div>
                      <span className="notif-history-date">{fmtDate(b.created_at)}</span>
                    </button>

                    {expandedId === b.id && (
                      <div className="notif-history-details">
                        <p className="notif-history-body">"{b.body}"</p>
                        <div className="notif-history-stats">
                          <span className="notif-hstat notif-hstat-sent">✅ {b.sent} وصل</span>
                          {b.failed > 0 && (
                            <span className="notif-hstat notif-hstat-fail">⚠️ {b.failed} فشل</span>
                          )}
                          {b.stale_removed > 0 && (
                            <span className="notif-hstat notif-hstat-stale">🗑️ {b.stale_removed} محذوف</span>
                          )}
                          <span className="notif-hstat notif-hstat-notok">📵 {b.no_token_users} بدون token</span>
                        </div>
                        <div className="notif-progress-bar">
                          <div
                            className="notif-progress-fill"
                            style={{ width: `${pct(b.sent, b.total_tokens)}%` }}
                          />
                        </div>
                        <p className="notif-progress-label">
                          {pct(b.sent, b.total_tokens)}% وصل من أصل {b.total_tokens} token
                        </p>
                        {/* View recipients button */}
                        <button
                          className="notif-history-recipients-btn"
                          onClick={() => setDrawerBroadcast(b)}
                        >
                          <Eye size={14} />
                          <span>عرض المستلمين بالاسم</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
