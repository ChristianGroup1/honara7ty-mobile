'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Layers, 
  Search, 
  User, 
  Hash, 
  BookOpen, 
  Users, 
  Calendar, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Eye
} from 'lucide-react';

interface DevotionGroup {
  id: string;
  name: string;
  invite_code: string;
  shared_reading_book: string | null;
  shared_target_days: number | null;
  created_at: string;
  leader_name: string;
  member_count: number;
}

// Arabic mapping for common Bible book IDs (reused)
const bookIdToName: Record<string, string> = {
  '1': 'التكوين', '2': 'الخروج', '19': 'المزامير', '40': 'متى',
  '41': 'مرقس', '42': 'لوقا', '43': 'يوحنا', '44': 'أعمال الرسل',
  '45': 'رومية', '51': 'كولوسي', '62': 'يوحنا الأولى', '66': 'الرؤيا'
};

const getBookName = (id: string | null): string => {
  if (!id) return 'لا يوجد كتاب مشترك';
  return bookIdToName[id] || `سفر ${id}`;
};

export default function GroupsPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DevotionGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dissolution confirmation state
  const [deletingGroup, setDeletingGroup] = useState<DevotionGroup | null>(null);
  const [deletingError, setDeletingError] = useState<string | null>(null);
  const [deletingSuccess, setDeletingSuccess] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);

      // 1. Fetch devotion groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('devotion_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      if (groupsData) {
        // 2. Fetch all members to aggregate counts and find owners
        const { data: membersData, error: membersError } = await supabase
          .from('devotion_group_members')
          .select('group_id, role, display_name');

        if (membersError) throw membersError;

        // Group members by group_id
        const membersMap: Record<string, { count: number; leader: string }> = {};
        
        if (membersData) {
          membersData.forEach(member => {
            if (!membersMap[member.group_id]) {
              membersMap[member.group_id] = { count: 0, leader: 'غير معروف' };
            }
            
            membersMap[member.group_id].count += 1;
            
            if (member.role === 'owner') {
              membersMap[member.group_id].leader = member.display_name;
            }
          });
        }

        const enrichedGroups: DevotionGroup[] = groupsData.map(group => {
          const stats = membersMap[group.id] || { count: 0, leader: 'قائد الجروب' };
          return {
            id: group.id,
            name: group.name,
            invite_code: group.invite_code,
            shared_reading_book: group.shared_reading_book,
            shared_target_days: group.shared_target_days,
            created_at: group.created_at,
            leader_name: stats.leader,
            member_count: stats.count
          };
        });

        setGroups(enrichedGroups);
      }
    } catch (err) {
      console.error('Error fetching devotion groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDissolveGroup = async () => {
    if (!deletingGroup) return;
    setDeletingError(null);

    try {
      const { error } = await supabase
        .from('devotion_groups')
        .delete()
        .eq('id', deletingGroup.id);

      if (error) {
        throw new Error(
          'فشل حل المجموعة بقاعدة البيانات. تأكد من تشغيل ملف السياسات `admin-write-policies.sql` لتفعيل حذف المشرفين.'
        );
      }

      setDeletingSuccess(true);
      setGroups(prev => prev.filter(g => g.id !== deletingGroup.id));
      setTimeout(() => {
        setDeletingGroup(null);
        setDeletingSuccess(false);
      }, 1500);
    } catch (err: any) {
      setDeletingError(err.message || 'فشل حذف المجموعة');
    }
  };

  const filteredGroups = groups.filter(group => {
    const q = searchQuery.toLowerCase();
    return (
      (group.name || '').toLowerCase().includes(q) ||
      (group.leader_name || '').toLowerCase().includes(q) ||
      (group.invite_code || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }}>
        <div style={{ height: '32px', width: '220px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '30px' }} className="animate-pulse" />
        <div className="table-container">
          <div style={{ height: '300px' }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header style={{ marginBottom: '35px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>مجموعات التفاعل خلوتي</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          مراقبة مجموعات خلوتي النشطة، ومتابعة الكتب المشتركة ورموز الدعوة المخصصة لربط المشاركين.
        </p>
      </header>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '25px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="البحث باسم الجروب، قائد المجموعة، أو كود الدعوة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingRight: '42px' }}
          />
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Groups Grid / Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>اسم المجموعة</th>
              <th>كود الدعوة</th>
              <th>القائد (المنشئ)</th>
              <th>الكتاب المشترك</th>
              <th>الأعضاء</th>
              <th>تاريخ الإنشاء</th>
              <th style={{ textAlign: 'center' }}>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <tr key={group.id}>
                  <td>
                    <Link
                      href={`/groups/${group.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <Layers size={18} color="var(--accent-purple)" />
                      <span style={{ fontWeight: 600 }}>{group.name}</span>
                    </Link>
                  </td>
                  <td>
                    <code style={{ 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      padding: '3px 8px', 
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      color: 'var(--accent-teal)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {group.invite_code}
                    </code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <User size={14} color="var(--text-muted)" />
                      <span>{group.leader_name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <BookOpen size={14} color="var(--text-muted)" />
                      <span>{getBookName(group.shared_reading_book)}</span>
                      {group.shared_target_days && (
                        <span style={{ color: 'var(--text-muted)' }}>({group.shared_target_days} يوم)</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      <Users size={12} style={{ marginLeft: '4px' }} />
                      {group.member_count} أعضاء
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(group.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Link
                        href={`/groups/${group.id}`}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(120, 161, 189, 0.25)',
                          background: 'rgba(120, 161, 189, 0.08)',
                          color: 'var(--primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="عرض التفاصيل"
                      >
                        <Eye size={15} />
                      </Link>
                      <button 
                        onClick={() => setDeletingGroup(group)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          background: 'rgba(239, 68, 68, 0.05)',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'var(--transition-fast)'
                        }}
                        title="حل المجموعة"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  لا توجد مجموعات تفاعل مطابقة للبحث.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dissolution Dialog Modal */}
      {deletingGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center'
          }}>
            {deletingSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
                <CheckCircle size={52} color="var(--success)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>تم حل المجموعة بنجاح</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>جاري إغلاق النافذة وتحديث الجدول...</p>
              </div>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  border: '1px solid rgba(239,68,68,0.2)'
                }}>
                  <AlertTriangle size={28} color="var(--danger)" />
                </div>
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>هل أنت متأكد من حل المجموعة؟</h3>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                  أنت على وشك حذف المجموعة <strong style={{ color: '#fff' }}>"{deletingGroup.name}"</strong> نهائياً. 
                  سيتم إزالة جميع الأعضاء ولن يكون كود الدعوة <code style={{ color: 'var(--accent-teal)' }}>{deletingGroup.invite_code}</code> صالحاً للاستخدام بعد الآن.
                </p>

                {deletingError && (
                  <div style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: 'var(--danger)',
                    fontSize: '0.8rem',
                    marginBottom: '20px',
                    textAlign: 'right'
                  }}>
                    {deletingError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button 
                    onClick={handleDissolveGroup}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--danger)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    نعم، حل المجموعة
                  </button>
                  <button 
                    onClick={() => { setDeletingGroup(null); setDeletingError(null); }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
