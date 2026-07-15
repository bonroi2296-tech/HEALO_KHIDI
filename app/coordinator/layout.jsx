'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ClipboardList, Video, Bell, Inbox, MessageSquare, Plane, Calculator,
  LogOut, Menu, X, LayoutDashboard, Building2, Bot, Target, KeyRound, TrendingUp,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useCoordinatorL } from '@/lib/i18n/coordinator';
import StaffPortalGate from '../_components/StaffPortalGate';
import ManualDrawer from '../_components/ManualDrawer';

// 메뉴 = 실제 존재하는 라우트만 (옛 patients·kpi 화면은 미구현 → 404라 제거).
// 라벨은 언어 스위처에 반응하도록 사전 키(labelKey)로 — 렌더 시 L[labelKey]로 해석.
const NAV_ITEMS = [
  { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard, href: '/coordinator' },
  { id: 'inbox', labelKey: 'navInbox', icon: Inbox, href: '/coordinator/inbox' },
  { id: 'chat', labelKey: 'navChat', icon: Bot, href: '/coordinator/chat' },
  { id: 'cases', labelKey: 'navCases', icon: Building2, href: '/coordinator/cases' },
  { id: 'consultations', labelKey: 'navConsultations', icon: Video, href: '/coordinator/consultations' },
  { id: 'conversion', labelKey: 'navConversion', icon: TrendingUp, href: '/coordinator/conversion' },
  { id: 'partners', labelKey: 'navPartners', icon: Target, href: '/coordinator/partners' },
  { id: 'intakes', labelKey: 'navIntakes', icon: ClipboardList, href: '/coordinator/intakes' },
  { id: 'messages', labelKey: 'navMessages', icon: MessageSquare, href: '/coordinator/messages' },
  { id: 'visa', labelKey: 'navVisa', icon: Plane, href: '/coordinator/visa' },
  { id: 'cost-estimates', labelKey: 'navCostEstimates', icon: Calculator, href: '/coordinator/cost-estimates' },
  { id: 'alerts', labelKey: 'navAlerts', icon: Bell, href: '/coordinator/alerts' },
];

export default function CoordinatorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const L = useCoordinatorL();
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
              <p className="text-[10px] text-gray-500">{L.brandRole}</p>
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
              <span>{L[item.labelKey]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 space-y-1">
        <Link
          href="/account/password"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all min-h-[44px]"
        >
          <KeyRound size={18} />
          <span>{L.changePassword}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all min-h-[44px]"
        >
          <LogOut size={18} />
          <span>{L.logout}</span>
        </button>
      </div>
    </>
  );

  return (
    <StaffPortalGate allow={["coordinator"]} portalName="코디네이터 포털" redirect="/coordinator">
    <div className="flex min-h-screen bg-gray-50 pt-14 md:pt-16">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-14 md:top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <ClipboardList size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">{L.brandRole}</span>
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
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 min-h-screen flex-col sticky top-14 md:top-16 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
        {navContent}
      </aside>

      {/* Content — 메시지 화면은 풀블리드(2단 채팅이 화면을 꽉 채우게). 나머지는 가운데 정렬+여백. */}
      {pathname === '/coordinator/messages' ? (
        <main className="flex-1 overflow-hidden pt-12 lg:pt-0">
          {children}
        </main>
      ) : (
        <main className="flex-1 overflow-auto pt-14 lg:pt-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:py-6">
            {children}
          </div>
        </main>
      )}
      <ManualDrawer role="coordinator" />
    </div>
    </StaffPortalGate>
  );
}
