'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  MessageSquare, 
  LogOut, 
  ShieldAlert,
  Activity,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  userEmail: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'الرئيسية والإحصائيات', href: '/', icon: LayoutDashboard },
    { name: 'صحة التطبيق', href: '/health', icon: Activity },
    { name: 'التحليلات المتقدمة', href: '/insights', icon: BarChart3 },
    { name: 'إدارة المستخدمين', href: '/users', icon: Users },
    { name: 'مجموعات التفاعل', href: '/groups', icon: Layers },
    { name: 'الإشراف والمراجعة', href: '/moderation', icon: MessageSquare },
  ];

  // Helper to extract email prefix for display
  const displayName = userEmail ? userEmail.split('@')[0] : 'مشرف';

  return (
    <aside className="sidebar">
      <div>
        {/* Logo */}
        <div className="sidebar-logo">
          <ShieldAlert size={26} color="var(--primary)" />
          <span className="sidebar-logo-text">هنا راحتي — أدمن</span>
        </div>

        {/* Menu Items */}
        <nav className="sidebar-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                style={{ direction: 'rtl', justifyContent: 'flex-start' }}
              >
                <Icon size={20} style={{ marginLeft: '12px' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Logout */}
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ direction: 'rtl' }}>
          <div className="user-avatar">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-role">مسؤول النظام</span>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-logout" style={{ direction: 'rtl' }}>
          <LogOut size={16} style={{ marginLeft: '8px' }} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
