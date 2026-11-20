'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LifeBuoy } from 'lucide-react';

interface SupportTicketRow {
  id: string;
  user_id: string | null;
  contact_email: string | null;
  subject: string;
  status: string;
  source: string;
  updated_at: string;
}

const statusLabel: Record<string, string> = {
  open: 'وصلت',
  in_progress: 'بنشتغل عليها',
  waiting: 'مستنيين رد المستخدم',
  resolved: 'اتحلت',
  closed: 'اتقفلت',
};

const filters = [
  { id: 'all', label: 'الكل' },
  { id: 'open', label: 'وصلت' },
  { id: 'in_progress', label: 'بنشتغل عليها' },
  { id: 'waiting', label: 'مستنيين رد' },
  { id: 'resolved', label: 'اتحلت' },
  { id: 'closed', label: 'اتقفلت' },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('support_tickets')
        .select('id, user_id, contact_email, subject, status, source, updated_at')
        .order('updated_at', { ascending: false });
      if (queryError) {
        setError('شغّل هجرة التذاكر عشان القائمة تظهر.');
        setTickets([]);
      } else {
        setError(null);
        setTickets((data ?? []) as SupportTicketRow[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const visible = filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <LifeBuoy size={22} />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>تذاكر المساعدة</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
        كل التذاكر اللي وصلتك من التطبيق ومن شاشة تسجيل الدخول.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={filter === item.id ? 'badge badge-success' : 'badge'}
            style={{ cursor: 'pointer', border: 0 }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error ? (
        <div role="alert" className="badge badge-warning" style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>
          {error}
        </div>
      ) : null}
      {loading ? <p>جاري التحميل...</p> : null}
      {!loading && !error && visible.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>مفيش تذاكر في الفلتر ده.</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {visible.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            className="glass card"
            style={{ padding: '16px', borderRadius: '14px', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <strong>{ticket.subject}</strong>
              <span className="badge">{statusLabel[ticket.status] ?? ticket.status}</span>
            </div>
            <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              {ticket.contact_email || 'بدون بريد'} · {ticket.source === 'login' ? 'من تسجيل الدخول' : 'من التطبيق'} · {new Date(ticket.updated_at).toLocaleString('ar-EG')}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
