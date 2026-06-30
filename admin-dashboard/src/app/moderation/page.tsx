'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import { 
  MessageSquare, 
  Search, 
  Trash2, 
  Clock, 
  Heart, 
  Sparkles, 
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface ModerationItem {
  id: string;
  userId: string;
  type: 'prayer' | 'testimony';
  content: string;
  created_at: string;
}

export default function ModerationPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Moderation delete confirm states
  const [deletingItem, setDeletingItem] = useState<ModerationItem | null>(null);
  const [deletingError, setDeletingError] = useState<string | null>(null);
  const [deletingSuccess, setDeletingSuccess] = useState(false);

  const fetchModerationContent = async () => {
    try {
      setLoading(true);

      const itemsList: ModerationItem[] = [];

      // 1. Fetch testimonies
      const { data: testimoniesData } = await supabase
        .from('testimonies')
        .select('id, user_id, content, created_at')
        .order('created_at', { ascending: false });

      if (testimoniesData) {
        testimoniesData.forEach(t => {
          itemsList.push({
            id: t.id,
            userId: t.user_id,
            type: 'testimony',
            content: t.content, // Testimonies are plaintext
            created_at: t.created_at
          });
        });
      }

      // 2. Fetch prayer notes
      const { data: prayersData } = await supabase
        .from('prayer_notes')
        .select('id, user_id, content, created_at')
        .order('created_at', { ascending: false });

      if (prayersData) {
        prayersData.forEach(p => {
          itemsList.push({
            id: p.id,
            userId: p.user_id,
            type: 'prayer',
            content: p.content || '',
            created_at: p.created_at
          });
        });
      }

      // Sort items by created_at DESC
      itemsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(itemsList);

    } catch (err) {
      console.error('Error fetching moderation content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationContent();
  }, []);

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setDeletingError(null);

    const tableName = deletingItem.type === 'prayer' ? 'prayer_notes' : 'testimonies';

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', deletingItem.id);

      if (error) {
        throw new Error(
          `فشل الحذف بقاعدة البيانات. تأكد من تشغيل ملف السياسات \`admin-write-policies.sql\` لتفعيل حذف المشرفين لجدول \`${tableName}\`.`
        );
      }

      setDeletingSuccess(true);
      setItems(prev => prev.filter(item => item.id !== deletingItem.id));
      setTimeout(() => {
        setDeletingItem(null);
        setDeletingSuccess(false);
      }, 1500);
    } catch (err: any) {
      setDeletingError(err.message || 'فشل حذف المحتوى');
    }
  };

  const filteredItems = items.filter(item => {
    return (item.content || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div style={{ padding: '20px', direction: 'rtl' }}>
        <div style={{ height: '32px', width: '250px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '30px' }} className="animate-pulse" />
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
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>الإشراف ومراجعة المحتوى</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          تصفح طلبات الصلاة والشهادات المنشورة في التغذية العامة. يمكنك إزالة المحتوى غير اللائق أو المسيء.
        </p>
      </header>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '25px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="البحث في الكلمات ومحتوى الكتابات المنشورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingRight: '42px' }}
          />
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Moderation Items Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>نوع المحتوى</th>
              <th>النص المكتوب</th>
              <th style={{ width: '160px' }}>تاريخ النشر</th>
              <th style={{ width: '120px' }}>معرف الكاتب</th>
              <th style={{ width: '80px', textAlign: 'center' }}>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                let badgeClass = 'badge-primary';
                let typeText = 'مجهول';
                let Icon = HelpCircle;

                if (item.type === 'prayer') {
                  badgeClass = 'badge-success';
                  typeText = 'طلب صلاة';
                  Icon = Heart;
                } else if (item.type === 'testimony') {
                  badgeClass = 'badge-warning';
                  typeText = 'اختبار/شهادة';
                  Icon = Sparkles;
                }

                return (
                  <tr key={item.id}>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        <Icon size={12} style={{ marginLeft: '4px' }} />
                        {typeText}
                      </span>
                    </td>
                    <td>
                      <p style={{ 
                        fontSize: '0.85rem', 
                        lineHeight: 1.5, 
                        color: 'var(--text-primary)',
                        wordBreak: 'break-word',
                        maxWidth: '450px'
                      }}>
                        {item.content}
                      </p>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(item.created_at).toLocaleString('ar-EG')}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontFamily: 'monospace', 
                        color: 'var(--text-muted)' 
                      }}>
                        {item.userId.substring(0, 8)}...
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => setDeletingItem(item)}
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
                        title="حذف هذا المحتوى"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  لا توجد كتابات أو طلبات صلاة تطابق البحث.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Item Confirmation Dialog */}
      {deletingItem && (
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>تم حذف المحتوى بنجاح</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>جاري إغلاق النافذة وتحديث القائمة...</p>
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
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>تأكيد حذف المحتوى</h3>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px', wordBreak: 'break-word' }}>
                  أنت على وشك حذف المحتوى التالي نهائياً من الجداول العامة:<br/>
                  <span style={{ color: '#fff', fontSize: '0.9rem', fontStyle: 'italic', display: 'block', marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    "{deletingItem.content.length > 100 ? deletingItem.content.substring(0, 100) + '...' : deletingItem.content}"
                  </span>
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
                    onClick={handleDeleteItem}
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
                    نعم، احذف المحتوى
                  </button>
                  <button 
                    onClick={() => { setDeletingItem(null); setDeletingError(null); }}
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
