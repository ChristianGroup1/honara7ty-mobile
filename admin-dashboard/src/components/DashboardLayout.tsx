'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from './Sidebar';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      // 1. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setAuthenticated(false);
        setLoading(false);
        if (pathname !== '/login') {
          router.replace('/login');
        }
        return;
      }

      setUserEmail(session.user.email || '');
      setAuthenticated(true);

      // 2. Check admin status in public.admin_users
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminError || !adminData) {
        setIsAdmin(false);
        setLoading(false);
        // Log out immediately if not admin
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkUser();
  }, [router, pathname]);

  // If we are on the login page, render children directly without auth wrap
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0e17',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text-secondary)'
      }}>
        <RefreshCw className="animate-spin" size={32} color="var(--primary)" />
        <span style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>جاري التحميل والتحقق من الصلاحيات...</span>
      </div>
    );
  }

  if (!authenticated || !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0e17',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        color: '#ffffff',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <ShieldAlert size={36} color="var(--danger)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>خطأ في الصلاحيات</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.9rem' }}>
          عذراً، لا تمتلك صلاحيات كافية للوصول إلى لوحة التحكم هذه. يرجى تسجيل الدخول بحساب مسؤول.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar userEmail={userEmail} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
