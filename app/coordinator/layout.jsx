'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ClipboardList, Video, Bell, Inbox, MessageSquare, Plane, Calculator,
  LogOut, Menu, X, LayoutDashboard, Building2,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import StaffPortalGate from '../_components/StaffPortalGate';

// 메뉴 = 실제 존재하는 라우트만 (옛 patients·kpi 화면은 미구현 → 404라 제거).
const NAV_ITEMS = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, href: '/coordinator' },
  { id: 'inbox', label: '문의함', icon: Inbox, href: '/coordinator/inbox' },
  { id: 'cases', label: '의뢰·케이스/병원배정', icon: Building2, href: '/coordinator/cases' },
  { id: 'consultations', label: '상담 일정', icon: Video, href: '/coordinator/consultations' },
  { id: 'intakes', label: '인테이크 관리', icon: ClipboardList, href: '/coordinator/intakes' },
  { id: 'messages', label: '메시지', icon: MessageSquare, href: '/coordinator/messages' },
  { id: 'visa', label: '비자 트래킹', icon: Plane, href: '/coordinator/visa' },
  { id: 'cost-estimates', label: '견적', icon: Calculator, href: '/coordinator/cost-estimates' },
  { id: 'alerts', label: '증상 알림', icon: Bell, href: '/coordinator/alerts' },
];

export default function CoordinatorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navContent = (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">healwith</h1>
              <p className="text-[10px] text-gray-500">코디네이터</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/coordinator' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all min-h-[44px]"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </>
  );

  return (
    <StaffPortalGate allow={["coordinator"]} portalName="코디네이터 포털" redirect="/coordinator">
    <div className="flex min-h-screen bg-gray-50 pt-12">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-12 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <ClipboardList size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">코디네이터</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 min-h-screen flex-col sticky top-12 h-[calc(100vh-3rem)]">
        {navContent}
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:py-6">
          {children}
        </div>
      </main>
    </div>
    </StaffPortalGate>
  );
}
