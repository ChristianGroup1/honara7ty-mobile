'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // Check if already logged in and redirect
  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Verify admin status
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (data && !error) {
          router.replace('/');
        }
      }
    };
    checkActiveSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }

      // Check if user ID is in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (adminError || !adminData) {
        // Sign out immediately if not admin
        await supabase.auth.signOut();
        throw new Error('عذراً، هذا الحساب ليس لديه صلاحيات المسؤول (Admin).');
      }

      // Success - redirect to dashboard
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#0a0e17',
      overflow: 'hidden'
    }}>
      {/* Background glow spots */}
      <div className="glow-spot" style={{ width: '400px', height: '400px', background: 'var(--primary)', top: '10%', left: '10%' }} />
      <div className="glow-spot" style={{ width: '400px', height: '400px', background: 'var(--accent-purple)', bottom: '10%', right: '10%' }} />

      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '16px',
        padding: '40px 30px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{
            display: 'inline-flex',
            width: '60px',
            height: '60px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <ShieldCheck size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.02em' }}>لوحة تحكم هنا راحتي</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>بوابة المسؤولين والتسجيل الآمن</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            color: 'var(--danger)',
            direction: 'rtl'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="admin@honara7ty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ paddingLeft: '40px' }}
              />
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ paddingLeft: '40px' }}
              />
              <KeyRound size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: loading ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)',
              transition: 'var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
