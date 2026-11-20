'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface TicketRow {
  id: string;
  user_id: string | null;
  contact_email: string | null;
  subject: string;
  status: string;
  source: string;
}

interface MessageRow {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

const statuses = [
  { id: 'open', label: 'وصلت' },
  { id: 'in_progress', label: 'بنشتغل عليها' },
  { id: 'waiting', label: 'مستنيين رد المستخدم' },
  { id: 'resolved', label: 'اتحلت' },
  { id: 'closed', label: 'اتقفلت' },
];

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = String(params.id ?? '');
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [reply, setReply] = useState('');
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: ticketRow, error: ticketError }, { data: messageRows, error: messageError }] = await Promise.all([
      supabase
        .from('support_tickets')
        .select('id, user_id, contact_email, subject, status, source')
        .eq('id', ticketId)
        .maybeSingle(),
      supabase
        .from('support_messages')
        .select('id, author_id, body, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at'),
    ]);
    if (ticketError || messageError || !ticketRow) {
      setError('التذكرة مش ظاهرة. تأكد إن الهجرة اتشغلت وإنك داخل كأدمن.');
      setTicket(null);
      setMessages([]);
    } else {
      setError(null);
      setTicket(ticketRow as TicketRow);
      setMessages((messageRows ?? []) as MessageRow[]);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id ?? null));
    load();
  }, [load]);

  const setStatus = async (status: string) => {
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (updateError) {
      setError('تغيير الحالة متعطل.');
      return;
    }
    await load();
  };

  const send = async () => {
    const body = reply.trim();
    if (!body || !adminId || sending) return;
    setSending(true);
    const { error: insertError } = await supabase.from('support_messages').insert({
      ticket_id: ticketId,
      author_id: adminId,
      body,
    });
    if (insertError) {
      setError('الرد ماتبعَتش.');
      setSending(false);
      return;
    }
    if (ticket?.status !== 'closed') {
      await supabase
        .from('support_tickets')
        .update({ status: 'waiting', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    }
    setReply('');
    setSending(false);
    await load();
  };

  if (loading) return <p>جاري التحميل...</p>;

  return (
    <section>
      <Link href="/tickets" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
        رجوع للتذاكر
      </Link>
      {error ? (
        <div role="alert" className="badge badge-warning" style={{ display: 'block', marginTop: '12px', whiteSpace: 'normal' }}>
          {error}
        </div>
      ) : null}
      {ticket ? (
        <>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>{ticket.subject}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
            {ticket.contact_email || 'بدون بريد'}
            {ticket.user_id ? ` · ${ticket.user_id}` : ''}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {statuses.map((status) => (
              <button
                key={status.id}
                type="button"
                onClick={() => setStatus(status.id)}
                className={ticket.status === status.id ? 'badge badge-success' : 'badge'}
                style={{ cursor: 'pointer', border: 0 }}
              >
                {status.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {messages.map((message) => {
              const fromUser = message.author_id == null || message.author_id === ticket.user_id;
              return (
                <div
                  key={message.id}
                  className="glass card"
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    alignSelf: fromUser ? 'flex-start' : 'flex-end',
                    maxWidth: '640px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {fromUser ? 'المستخدم' : 'الدعم'} · {new Date(message.created_at).toLocaleString('ar-EG')}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{message.body}</div>
                </div>
              );
            })}
          </div>
          {ticket.status === 'closed' ? (
            <p style={{ color: 'var(--text-secondary)' }}>التذكرة مقفولة. افتحها تاني لو عايز ترد.</p>
          ) : (
            <div className="glass card" style={{ padding: '16px', borderRadius: '14px' }}>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="اكتب الرد"
                style={{ width: '100%', resize: 'vertical', marginBottom: '12px' }}
              />
              <button type="button" onClick={send} disabled={sending || reply.trim().length === 0}>
                {sending ? 'بنبعت...' : 'إرسال الرد'}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
