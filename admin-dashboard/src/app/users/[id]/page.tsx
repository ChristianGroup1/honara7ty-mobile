'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Award,
  Edit2,
  Heart,
  MessageSquare,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BookOpen
} from 'lucide-react';

// Types & Helpers
interface UserDetails {
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

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetails | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'devotion' | 'prayer' | 'reflection'>('devotion');
  const [devotionLogs, setDevotionLogs] = useState<DevotionLog[]>([]);
  const [prayerNotes, setPrayerNotes] = useState<UserPrayerNote[]>([]);
  const [reflections, setReflections] = useState<UserReflection[]>([]);

  // Calendar Navigation
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [selectedCalLog, setSelectedCalLog] = useState<DevotionLog | null>(null);

  const MONTH_NAMES_AR = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const DAYS_OF_WEEK_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  // XP Editing
  const [editingXp, setEditingXp] = useState(false);
  const [xpInput, setXpInput] = useState('');
  const [xpError, setXpError] = useState<string | null>(null);

  const fetchAllDetails = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // 1. Fetch profile metadata using RPC (get_users_by_ids)
      const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_users_by_ids', {
        user_ids: [userId]
      });

      if (rpcUsers && rpcUsers.length > 0) {
        const u = rpcUsers[0];
        setUser({
          id: u.id,
          email: u.email || '',
          full_name: u.full_name || 'مستخدم بدون اسم',
          church: u.church || 'غير محدد',
          sect: u.sect || 'غير محدد',
          xp: u.xp || 0,
          updated_at: u.updated_at || '',
        });
        setXpInput((u.xp || 0).toString());
      } else {
        // Fallback: direct profiles query
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('id, church, sect, xp, updated_at')
          .eq('id', userId)
          .maybeSingle();

        if (prof) {
          setUser({
            id: prof.id,
            email: '—',
            full_name: `مشارك (${prof.id.substring(0, 6)})`,
            church: prof.church || 'غير محدد',
            sect: prof.sect || 'غير محدد',
            xp: prof.xp || 0,
            updated_at: prof.updated_at || '',
          });
          setXpInput((prof.xp || 0).toString());
        }
      }

      // 2. Fetch devotion logs (increased to 180 to cover calendar history)
      const { data: devLog } = await supabase
        .from('devotion_log')
        .select('date, completed, reading_book, reading_chapter')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(180);
      if (devLog) setDevotionLogs(devLog as DevotionLog[]);

      // 3. Fetch prayer notes
      const { data: prayers } = await supabase
        .from('prayer_notes')
        .select('id, content, is_answered, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (prayers) setPrayerNotes(prayers as UserPrayerNote[]);

      // 4. Fetch reflections
      const { data: refs } = await supabase
        .from('reflections')
        .select('id, content, date, created_at')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (refs) setReflections(refs as UserReflection[]);

    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDetails();
  }, [userId]);

  const handleUpdateXp = async () => {
    if (!user) return;
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
        .eq('id', user.id);

      if (error) {
        throw new Error('فشل التحديث بقاعدة البيانات. تأكد من تشغيل ملف السياسات.');
      }

      setUser(prev => prev ? { ...prev, xp: newXp } : null);
      setEditingXp(false);
    } catch (err: any) {
      setXpError(err.message || 'فشل تحديث النقاط');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }} className="animate-pulse">
        <div style={{ height: '32px', width: '220px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '30px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '70px', background: 'var(--bg-secondary)', borderRadius: '10px' }} />
          ))}
        </div>
        <div style={{ height: '200px', background: 'var(--bg-secondary)', borderRadius: '12px' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', direction: 'rtl' }}>
        <h2 style={{ color: 'var(--danger)' }}>المستخدم غير موجود</h2>
        <button onClick={() => router.push('/users')} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
          الرجوع للمستخدمين
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>
      {/* Header & Back Action */}
      <header style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyItems: 'flex-start', gap: '16px' }}>
        <button 
          onClick={() => router.push('/users')}
          style={{
            display: 'flex', alignItems: 'center', justifyItems: 'center',
            background: 'none', border: '1px solid var(--border-color)',
            borderRadius: '50%', width: '40px', height: '40px', color: 'var(--text-primary)',
            cursor: 'pointer', transition: 'var(--transition-fast)'
          }}
          className="sidebar-link-hover-effect"
        >
          <ArrowLeft size={20} style={{ margin: 'auto' }} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>تفاصيل المستخدم</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>بيانات الخلوة، طلبات الصلاة، والتأملات الخاصة بالمشترك.</p>
        </div>
      </header>

      {/* Main Info Card */}
      <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem', flexShrink: 0 }}>
            {(user.full_name || '').substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>{user.full_name}</h2>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{user.email}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>معرف المستخدم:</span>
            <code style={{ fontSize: '0.78rem' }}>{user.id}</code>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>الكنيسة / المجمع</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <MapPin size={16} color="var(--primary)" />
              <span>{user.church}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>الطائفة العقائدية</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <User size={16} color="var(--accent-purple)" />
              <span>{user.sect}</span>
            </div>
          </div>

          {/* Interactive XP Editor */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>نقاط الخبرة XP</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {!editingXp ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <Award size={16} color="var(--warning)" />
                  <span>{user.xp} XP</span>
                  <button onClick={() => setEditingXp(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                    <Edit2 size={13} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="number"
                      className="form-input"
                      value={xpInput}
                      onChange={(e) => setXpInput(e.target.value)}
                      style={{ height: '30px', padding: '2px 8px', fontSize: '0.85rem', width: '80px' }}
                    />
                    <button 
                      onClick={handleUpdateXp}
                      style={{ padding: '4px 10px', background: 'var(--primary)', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', color: 'white' }}
                    >
                      حفظ
                    </button>
                    <button 
                      onClick={() => { setEditingXp(false); setXpError(null); }}
                      style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      إلغاء
                    </button>
                  </div>
                  {xpError && <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>{xpError}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '20px',
          gap: '24px'
        }}>
          <button 
            onClick={() => setActiveTab('devotion')}
            style={{
              paddingBottom: '12px',
              borderBottom: activeTab === 'devotion' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'devotion' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer', fontSize: '0.95rem'
            }}
          >
            الخلوات اليومية ({devotionLogs.length})
          </button>
          <button 
            onClick={() => setActiveTab('prayer')}
            style={{
              paddingBottom: '12px',
              borderBottom: activeTab === 'prayer' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'prayer' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer', fontSize: '0.95rem'
            }}
          >
            طلبات الصلاة ({prayerNotes.length})
          </button>
          <button 
            onClick={() => setActiveTab('reflection')}
            style={{
              paddingBottom: '12px',
              borderBottom: activeTab === 'reflection' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'reflection' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer', fontSize: '0.95rem'
            }}
          >
            التأملات الروحية ({reflections.length})
          </button>
        </div>

        {/* Tab content */}
        <div>
          {/* Devotion Logs Calendar */}
          {activeTab === 'devotion' && (() => {
            // Index logs by date for fast O(1) lookups
            const logMap = new Map<string, DevotionLog>();
            devotionLogs.forEach(l => logMap.set(l.date, l));

            // Calendar calculations
            const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
            const firstDayIdx = new Date(currentYear, currentMonth, 1).getDay();

            const handlePrevMonth = () => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(prev => prev - 1);
              } else {
                setCurrentMonth(prev => prev - 1);
              }
              setSelectedCalLog(null);
            };

            const handleNextMonth = () => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(prev => prev + 1);
              } else {
                setCurrentMonth(prev => prev + 1);
              }
              setSelectedCalLog(null);
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Split Layout: Calendar + Side Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  
                  {/* Calendar Grid Box */}
                  <div className="glass" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                    
                    {/* Navigation Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        {MONTH_NAMES_AR[currentMonth]} {currentYear}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={handlePrevMonth}
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <ChevronRight size={16} color="var(--text-primary)" />
                        </button>
                        <button 
                          onClick={handleNextMonth}
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <ChevronLeft size={16} color="var(--text-primary)" />
                        </button>
                      </div>
                    </div>

                    {/* Week Days Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
                      {DAYS_OF_WEEK_AR.map(day => (
                        <span key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{day}</span>
                      ))}
                    </div>

                    {/* Monthly Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                      {/* Blank spaces for offset */}
                      {Array.from({ length: firstDayIdx }).map((_, idx) => (
                        <div key={`blank-${idx}`} />
                      ))}

                      {/* Actual Days */}
                      {Array.from({ length: totalDays }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const log = logMap.get(dateStr);
                        const isSelected = selectedCalLog?.date === dateStr;

                        let cellBg = 'rgba(255,255,255,0.02)';
                        let cellBorder = '1px solid var(--border-color)';
                        let cellColor = 'var(--text-secondary)';

                        if (log) {
                          if (log.completed) {
                            cellBg = 'rgba(16, 185, 129, 0.15)';
                            cellBorder = '1px solid var(--success)';
                            cellColor = 'var(--success)';
                          } else {
                            cellBg = 'rgba(239, 68, 68, 0.15)';
                            cellBorder = '1px solid var(--danger)';
                            cellColor = 'var(--danger)';
                          }
                        }

                        if (isSelected) {
                          cellBorder = '2px solid var(--primary)';
                        }

                        return (
                          <button
                            key={dayNum}
                            onClick={() => log && setSelectedCalLog(log)}
                            disabled={!log}
                            style={{
                              aspectRatio: '1',
                              borderRadius: '8px',
                              background: cellBg,
                              border: cellBorder,
                              color: cellColor,
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: log ? 'pointer' : 'default',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{dayNum}</span>
                            {log && (
                              <span style={{ fontSize: '0.6rem', marginTop: '2px' }}>
                                {log.completed ? '✓' : '✗'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '14px', marginTop: '20px', fontSize: '0.72rem', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                        <span style={{ color: 'var(--text-muted)' }}>مكتملة</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }} />
                        <span style={{ color: 'var(--text-muted)' }}>فائتة</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color)' }} />
                        <span style={{ color: 'var(--text-muted)' }}>لم تسجل</span>
                      </div>
                    </div>

                  </div>

                  {/* Day Detail Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    {selectedCalLog ? (
                      <div className="glass animate-fade-in" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--primary)40', background: 'rgba(99,102,241,0.02)', height: '100%' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={16} />
                          <span>خلوة يوم {selectedCalLog.date}</span>
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>حالة إتمام الخلوة:</span>
                            {selectedCalLog.completed ? (
                              <span className="badge badge-success">مكتملة</span>
                            ) : (
                              <span className="badge badge-danger">فائتة</span>
                            )}
                          </div>

                          {selectedCalLog.completed && (
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>ما تم قراءته في خلوة هذا اليوم:</span>
                              {selectedCalLog.reading_book ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-teal)' }}>
                                  <BookOpen size={16} />
                                  <span>{getBookName(selectedCalLog.reading_book)} - إصحاح {selectedCalLog.reading_chapter || 1}</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>سجل خلوة بدون تحديد إصحاح قراءة.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '100%', minHeight: '160px', borderRadius: '12px', border: '1px dashed var(--border-color)',
                        textAlign: 'center', padding: '20px', color: 'var(--text-muted)'
                      }}>
                        <Calendar size={28} style={{ marginBottom: '10px' }} />
                        <span style={{ fontSize: '0.82rem' }}>اختر يوماً ملوناً من التقويم لعرض تفاصيل إتمام الخلوة وما تم قراءته.</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* History list headers */}
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>قائمة الخلوات التاريخية (آخر 180 يوم)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {devotionLogs.length > 0 ? (
                      devotionLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar size={15} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.date}</span>
                            {log.reading_book && (
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginRight: '10px' }}>
                                (قرأ: {getBookName(log.reading_book)} - إصحاح {log.reading_chapter})
                              </span>
                            )}
                          </div>
                          <div>
                            {log.completed ? (
                              <span className="badge badge-success">
                                <CheckCircle size={12} />
                                مكتملة
                              </span>
                            ) : (
                              <span className="badge badge-danger">
                                <XCircle size={12} />
                                فائتة
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        لم يسجل هذا المستخدم أي سجل خلوة بعد.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* Prayer Notes */}
          {activeTab === 'prayer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {prayerNotes.length > 0 ? (
                prayerNotes.map((note) => (
                  <div 
                    key={note.id} 
                    style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(note.created_at).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {note.is_answered ? (
                        <span className="badge badge-success">مستجاب</span>
                      ) : (
                        <span className="badge badge-warning">قيد الصلاة</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {note.content}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  لا يوجد طلبات صلاة مسجلة.
                </div>
              )}
            </div>
          )}

          {/* Reflections */}
          {activeTab === 'reflection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reflections.length > 0 ? (
                reflections.map((ref) => (
                  <div 
                    key={ref.id} 
                    style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        تأمل يوم: {ref.date}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {ref.content}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  لا يوجد تأملات روحية مسجلة بعد.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
