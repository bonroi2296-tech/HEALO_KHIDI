'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ClipboardList, Video, Bell, Inbox, MessageSquare, Plane, Calculator,
  LogOut, Menu, X, LayoutDashboard, Building2, Bot, Target, KeyRound, TrendingUp, Star, FileText,
  Settings,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useCoordinatorL } from '@/lib/i18n/coordinator';
import StaffPortalGate from '../_components/StaffPortalGate';
import ManualDrawer from '../_components/ManualDrawer';
import PushOptInBanner from '../_components/PushOptInBanner';

// 메뉴 = 실제 존재하는 라우트만 (옛 patients·kpi 화면은 미구현 → 404라 제거).
// 라벨은 언어 스위처에 반응하도록 사전 키(labelKey)로 — 렌더 시 L[labelKey]로 해석.
const NAV_ITEMS = [
  { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard, href: '/coordinator' },
  { id: 'inbox', labelKey: 'navInbox', icon: Inbox, href: '/coordinator/inbox' },
  { id: 'chat', labelKey: 'navChat', icon: Bot, href: '/coordinator/chat' },
  { id: 'cases', labelKey: 'navCases', icon: Building2, href: '/coordinator/cases' },
  { id: 'consultations', labelKey: 'navConsultations', icon: Video, href: '/coordinator/consultations' },
  { id: 'conversion', labelKey: 'navConversion', icon: TrendingUp, href: '/coordinator/conversion' },
  { id: 'satisfaction', labelKey: 'navSatisfaction', icon: Star, href: '/coordinator/satisfaction' },
  { id: 'partners', labelKey: 'navPartners', icon: Target, href: '/coordinator/partners' },
  // 인테이크 메뉴 제거(2026-07-15 PO): 상담 일정과 중복 + '의사 배정' 노-옵이라 상담 일정으로 통합.
  { id: 'messages', labelKey: 'navMessages', icon: MessageSquare, href: '/coordinator/messages' },
  { id: 'visa', labelKey: 'navVisa', icon: Plane, href: '/coordinator/visa' },
  { id: 'cost-estimates', labelKey: 'navCostEstimates', icon: Calculator, href: '/coordinator/cost-estimates' },
  { id: 'alerts', labelKey: 'navAlerts', icon: Bell, href: '/coordinator/alerts' },
  { id: 'content', labelKey: 'navContent', label: '콘텐츠 편집', icon: FileText, href: '/coordinator/content' },
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
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 text-gray-500 hover:text-gray-600 rounded-lg">
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
              <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-500'} />
              <span>{L[item.labelKey] || item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 space-y-1">
        <Link
          href="/coordinator/settings"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all min-h-[44px]"
        >
          <Settings size={18} />
          <span>{L.navSettings}</span>
        </Link>
        <Link
          href="/account/password"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all min-h-[44px]"
        >
          <KeyRound size={18} />
          <span>{L.changePassword}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all min-h-[44px]"
        >
          <LogOut size={18} />
          <span>{L.logout}</span>
        </button>
      </div>
    </>
  );

  return (
    <StaffPortalGate allow={["coordinator"]} portalName="코디네이터 포털" redirect="/coordinator">
    <div className="flex min-h-screen bg-gray-50 healo-portal-offset">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-[calc(3.5rem+var(--healo-safe-top))] md:top-[calc(4rem+var(--healo-safe-top))] left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
        /* 2026-07-28: `overflow-auto` 제거.
           이 main 은 부모가 `flex min-h-screen`(높이 상한 없음)이라 **자기가 스크롤한 적이 없다**
           (실측 scrollHeight>clientHeight = false, 실제 스크롤 주체는 문서).
           그런데 overflow 가 visible 이 아니면 CSS 상 여기가 «스크롤 상자»로 잡혀,
           안쪽의 `position: sticky` 가 **움직이지 않는 상자를 기준 삼아 아예 안 붙었다.**
           실측(콘텐츠 편집, 문서 10,985px): 저장바가 맨 위 기준 10,889px 지점에 정적으로 앉아
           편집 중엔 화면에 없었고 끝까지 내려야 보였다.
           ⚠️ 메시지 화면은 위 분기의 `overflow-hidden` 을 그대로 쓴다(2단 채팅 풀블리드 — 건드리지 말 것). */
        <main className="flex-1 pt-14 lg:pt-0">
          {/* pb: 쿠키 동의 배너(`fixed bottom-0`)가 화면 맨 아래 내용을 덮는다 — 코디 화면엔
              바닥 여백이 없어 「더 보기」 같은 마지막 버튼이 눌리지 않았다(2026-07-29 실측,
              elementFromPoint 가 배너를 반환). 배너가 알려주는 높이만큼 비워 둔다(닫히면 0). */}
          {/* paddingBottom 을 클래스(pb-[calc(...)])로 주면 같은 요소의 py-* 에 눌려 안 먹었다
              (실측: 여백이 24px 그대로 → 「더 보기」가 쿠키 배너에 덮임). 인라인 스타일은 항상 이긴다.
              배너 높이만큼만 비우고, 배너가 닫히면 변수가 지워져 0 이 된다. */}
          <div
            className="max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:py-6"
            style={{ paddingBottom: "calc(1.5rem + var(--cookie-banner-h, 0px))" }}
          >
            {/* 폰 알림이 꺼져 있을 때만 뜨는 줄 — 브라우저에선 아무것도 안 그린다 */}
            <PushOptInBanner />
            {children}
          </div>
        </main>
      )}
      <ManualDrawer role="coordinator" />
    </div>
    </StaffPortalGate>
  );
}
