'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Hash,
  Layers,
  User,
  Users,
  XCircle,
} from 'lucide-react';

interface GroupDetails {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  shared_reading_book: string | null;
  shared_selected_chapters: number[] | null;
  shared_target_days: number | null;
  created_at: string;
}

interface GroupMember {
  user_id: string;
  role: 'owner' | 'leader' | 'member';
  display_name: string;
  joined_at: string;
  completedToday: boolean;
}

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
  '66': 'الرؤيا',
};

const getBookLabel = (value: string | null) => {
  if (!value) {
    return 'لا يوجد كتاب مشترك';
  }
  return /^\d+$/.test(value) ? bookIdToName[value] || `سفر ${value}` : value;
};

const getRoleLabel = (role: GroupMember['role']) => {
  if (role === 'owner') {
    return 'قائد المجموعة';
  }
  if (role === 'leader') {
    return 'مشرف';
  }
  return 'عضو';
};

const getSharedReadingLabel = (group: GroupDetails) => {
  if (!group.shared_reading_book) {
    return 'لا يوجد قراءة مشتركة';
  }

  const book = getBookLabel(group.shared_reading_book);
  const chapters = group.shared_selected_chapters?.length
    ? ` — إصحاح ${group.shared_selected_chapters.join('، ')}`
    : '';
  const target = group.shared_target_days
    ? ` (${group.shared_target_days} يوم)`
    : '';

  return `${book}${chapters}${target}`;
};

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!groupId) {
        return;
      }

      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const [{ data: groupData, error: groupError }, { data: membersData, error: membersError }] =
          await Promise.all([
            supabase.from('devotion_groups').select('*').eq('id', groupId).maybeSingle(),
            supabase
              .from('devotion_group_members')
              .select('user_id, role, display_name, joined_at')
              .eq('group_id', groupId)
              .order('joined_at', { ascending: true }),
          ]);

        if (groupError) {
          throw groupError;
        }
        if (membersError) {
          throw membersError;
        }
        if (!groupData) {
          setGroup(null);
          setMembers([]);
          return;
        }

        const memberIds = (membersData ?? []).map(member => member.user_id);
        let completedTodayByUser = new Set<string>();

        if (memberIds.length > 0) {
          const { data: todayLogs } = await supabase
            .from('devotion_log')
            .select('user_id, completed')
            .eq('date', today)
            .in('user_id', memberIds);

          completedTodayByUser = new Set(
            (todayLogs ?? [])
              .filter(log => log.completed)
              .map(log => log.user_id),
          );
        }

        setGroup(groupData as GroupDetails);
        setMembers(
          (membersData ?? []).map(member => ({
            user_id: member.user_id,
            role: member.role as GroupMember['role'],
            display_name: member.display_name,
            joined_at: member.joined_at,
            completedToday: completedTodayByUser.has(member.user_id),
          })),
        );
      } catch (error) {
        console.error('Error fetching group details:', error);
        setGroup(null);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupId]);

  const completedTodayCount = useMemo(
    () => members.filter(member => member.completedToday).length,
    [members],
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }}>
        <div
          style={{
            height: '32px',
            width: '220px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            marginBottom: '30px',
          }}
          className="animate-pulse"
        />
        <div style={{ height: '180px', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '20px' }} />
        <div style={{ height: '260px', background: 'var(--bg-secondary)', borderRadius: '12px' }} />
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', direction: 'rtl' }}>
        <h2 style={{ color: 'var(--danger)' }}>المجموعة غير موجودة</h2>
        <button
          onClick={() => router.push('/groups')}
          style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
        >
          الرجوع للمجموعات
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>
      <header
        style={{
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <button
          onClick={() => router.push('/groups')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>
            تفاصيل المجموعة
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            معلومات الجروب، عدد المشتركين، وحالة خلوة اليوم لكل عضو.
          </p>
        </div>
      </header>

      <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(120, 161, 189, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={26} color="var(--accent-purple)" />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '6px' }}>{group.name}</h2>
            <code
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.82rem',
                color: 'var(--accent-teal)',
                border: '1px solid var(--border-color)',
              }}
            >
              {group.invite_code}
            </code>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '8px 12px' }}>
            <Users size={14} style={{ marginLeft: '6px' }} />
            {members.length} مشترك
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              كود الدعوة
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <Hash size={16} color="var(--accent-teal)" />
              <span>{group.invite_code}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              القراءة المشتركة
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
              <BookOpen size={16} color="var(--primary)" />
              <span>{getSharedReadingLabel(group)}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              تاريخ الإنشاء
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <Calendar size={16} color="var(--text-muted)" />
              <span>{new Date(group.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              خلوة اليوم
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <CheckCircle size={16} color="var(--success)" />
              <span>
                {completedTodayCount} من {members.length} أكملوا الخلوة
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>أعضاء المجموعة</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            {members.length} مشترك في هذه المجموعة
          </p>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الدور</th>
              <th>خلوة اليوم</th>
              <th>تاريخ الانضمام</th>
              <th style={{ textAlign: 'center' }}>الملف</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map(member => (
                <tr key={member.user_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={14} color="var(--text-muted)" />
                      <span style={{ fontWeight: 600 }}>{member.display_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{getRoleLabel(member.role)}</span>
                  </td>
                  <td>
                    {member.completedToday ? (
                      <span className="badge badge-success">
                        <CheckCircle size={12} style={{ marginLeft: '4px' }} />
                        أكمل الخلوة
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        <XCircle size={12} style={{ marginLeft: '4px' }} />
                        لم يكمل بعد
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(member.joined_at).toLocaleDateString('ar-EG')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link
                      href={`/users/${member.user_id}`}
                      style={{
                        color: 'var(--primary)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      عرض المستخدم
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                  لا يوجد أعضاء في هذه المجموعة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
