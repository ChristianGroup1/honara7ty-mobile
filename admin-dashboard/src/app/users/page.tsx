'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

import { 
  Search, 
  User, 
  TrendingUp, 
  MapPin, 
  Calendar, 
  Heart, 
  BookOpen,
  Award,
  Edit2,
  CheckCircle,
  XCircle,
  X,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

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

const getBookName = (id: string | undefined): string => {
  if (!id) return '';
  return bookIdToName[id] || `سفر ${id}`;
};

interface DirectoryUser {
  id: string;
  email: string;
  full_name: string;
  church: string;
  sect: string;
  xp: number;
  updated_at: string;
  created_at?: string;
}

interface DevotionLog {
  date: string;
  completed: boolean;
  reading_book?: string;
  reading_chapter?: number;
}

interface UserPrayerNote {
  id: string;
  content: string;
  is_answered: boolean;
  created_at: string;
}

interface UserReflection {
  id: string;
  content: string;
  date: string;
  created_at: string;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  
  // Modal Details State
  const [activeTab, setActiveTab] = useState<'devotion' | 'prayer' | 'reflection'>('devotion');
  const [devotionLogs, setDevotionLogs] = useState<DevotionLog[]>([]);
  const [prayerNotes, setPrayerNotes] = useState<UserPrayerNote[]>([]);
  const [reflections, setReflections] = useState<UserReflection[]>([]);
  
  // XP Update State
  const [editingXp, setEditingXp] = useState(false);
  const [xpInput, setXpInput] = useState('');
  const [xpError, setXpError] = useState<string | null>(null);
  const [rpcWarning, setRpcWarning] = useState(false);

  // Fetch users directory
  const fetchUsers = async (search: string = '') => {
    try {
      setLoading(true);
      setRpcWarning(false);
      
      // Try to call get_users_directory RPC with search_query parameter
      const { data, error } = await supabase.rpc('get_users_directory', {
        search_query: search
      });

      if (error) {
        console.warn('RPC get_users_directory failed, falling back to direct profiles query:', error.message);
        setRpcWarning(true);
        
        // Fallback: Query profiles directly
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, church, sect, xp, updated_at');
        
        if (pError) throw pError;
        
        if (profiles) {
          const mappedUsers: DirectoryUser[] = profiles.map(p => ({
            id: p.id,
            email: `user_${p.id.substring(0, 4)}@honara7ty.com`, // fallback obfuscated email
            full_name: `مشارك (${p.id.substring(0, 4)})`, // fallback name
            church: p.church || 'غير محدد',
            sect: p.sect || 'غير محدد',
            xp: p.xp || 0,
            updated_at: p.updated_at
          }));
          setUsers(mappedUsers);
        }
      } else if (data) {
        setUsers(data as DirectoryUser[]);
      }
    } catch (err: any) {
      console.error('Error fetching users directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search query fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch user detailed logs when a user is selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchUserDetails = async () => {
      // Clear previous stats
      setDevotionLogs([]);
      setPrayerNotes([]);
      setReflections([]);
      setXpInput(selectedUser.xp.toString());
      setXpError(null);
      setEditingXp(false);

      try {
        // 1. Fetch devotion logs (last 30)
        const { data: devLog } = await supabase
          .from('devotion_log')
          .select('date, completed, reading_book, reading_chapter')
          .eq('user_id', selectedUser.id)
          .order('date', { ascending: false })
          .limit(30);
        
        if (devLog) setDevotionLogs(devLog as DevotionLog[]);

        // 2. Fetch prayer notes & decrypt them
        const { data: prayers } = await supabase
          .from('prayer_notes')
          .select('id, content, is_answered, created_at')
          .eq('user_id', selectedUser.id)
          .order('created_at', { ascending: false });

        if (prayers) {
          const decryptedPrayers = prayers.map(p => ({
            id: p.id,
            is_answered: p.is_answered,
            created_at: p.created_at,
            content: p.content || ''
          }));
          setPrayerNotes(decryptedPrayers);
        }

        // 3. Fetch reflections & decrypt them
        const { data: refs } = await supabase
          .from('reflections')
          .select('id, content, date, created_at')
          .eq('user_id', selectedUser.id)
          .order('date', { ascending: false });

        if (refs) {
          const decryptedRefs = refs.map(r => ({
            id: r.id,
            date: r.date,
            created_at: r.created_at,
            content: r.content || ''
          }));
          setReflections(decryptedRefs);
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      }
    };

    fetchUserDetails();
  }, [selectedUser]);

  const handleUpdateXp = async () => {
    if (!selectedUser) return;
    setXpError(null);
    const newXp = parseInt(xpInput);

    if (isNaN(newXp) || newXp < 0) {
      setXpError('يرجى إدخال عدد صحيح موجب');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', selectedUser.id);

      if (error) {
        throw new Error(
          'فشل التحديث بقاعدة البيانات. تأكد من تشغيل ملف السياسات `admin-write-policies.sql` لتفعيل تعديل الأدمن.'
        );
      }

      // Update local state immediately
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, xp: newXp } : u));
      setSelectedUser(prev => prev ? { ...prev, xp: newXp } : null);
      setEditingXp(false);
    } catch (err: any) {
      setXpError(err.message || 'فشل تحديث النقاط');
    }
  };



  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header className="page-header" style={{ marginBottom: '35px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>إدارة المستخدمين</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          تصفح المجلد العام، تحقق من التزام الخلوة، وراجع ملاحظات الصلوات والتأملات الخاصة بالمشاركين.
        </p>
      </header>

      {/* RPC Warning Banner */}
      {rpcWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '25px',
          fontSize: '0.85rem',
          color: 'var(--warning)'
        }}>
          <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>وضع الوصول المحدود (أسماء مستعارة)</h4>
            <p>
              يتم تشغيل لوحة التحكم حالياً في وضع القراءة البديل للملف الشخصي فقط، مما يعني إخفاء أسماء ورسائل البريد الخاصة بالمشاركين لأسباب أمنية.
              لتفعيل ربط أسماء المستخدمين وإيميلاتهم، يرجى تشغيل السكريبت 
              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', margin: '0 4px', color: '#fff' }}>supabase/get_users_directory.sql</code> 
              في واجهة SQL Editor الخاصة بـ Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '25px',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="البحث باسم المستخدم، البريد، الكنيسة، أو الطائفة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingRight: '42px' }}
          />
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الكنيسة والطائفة</th>
              <th>نقاط الخبرة XP</th>
              <th>آخر تحديث</th>
              <th style={{ textAlign: 'center' }}>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="user-avatar" style={{ flexShrink: 0 }}>
                        {(user.full_name || '').substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{user.full_name || 'مستحدم بدون اسم'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{user.church}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.sect}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ fontWeight: 'bold' }}>
                      <Award size={13} style={{ marginLeft: '4px' }} />
                      {user.xp} XP
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {user.updated_at ? new Date(user.updated_at).toLocaleDateString('ar-EG') : 'غير متوفر'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link 
                      href={`/users/${user.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255,255,255,0.03)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        textDecoration: 'none',
                        color: 'var(--text-primary)'
                      }}
                      className="sidebar-link-hover-effect"
                    >
                      عرض التفاصيل
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  لا يوجد مستخدمون يطابقون معايير البحث.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
