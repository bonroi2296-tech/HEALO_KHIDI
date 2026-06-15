"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  BarChart3,
  FileText,
  Brain,
  LogOut,
  Users,
  Bell,
  Palette,
  Upload,
  Menu,
  X,
  Database,
  SearchCode,
  HeartPulse,
  Video,
  TrendingUp,
  Filter,
  ThumbsDown,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// 2026-05: 피벗(암환자 컨시어지) 반영 메뉴 재편 — 환자 여정 중심으로 그룹화,
// 디렉토리 시절 도구는 '레거시 도구'로 분리(코드 보존). 크롤링은 RAG Tier2 갱신으로 라벨 재정의.
const navGroups = [
  {
    title: "운영 현황",
    items: [
      { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
      { id: "kpi-dashboard", label: "KPI 대시보드", icon: TrendingUp, href: "/admin/khidi/kpi-dashboard" },
      { id: "conversion", label: "유치 전환 현황", icon: Filter, href: "/admin/khidi/conversion" },
      { id: "evidence", label: "증빙 산출물", icon: FileText, href: "/admin/khidi/evidence" },
      { id: "analytics", label: "문의 현황", icon: BarChart3, href: "/admin/analytics" },
    ]
  },
  {
    title: "환자 여정",
    items: [
      { id: "leads", label: "사전상담 리드", icon: Users, href: "/admin/leads" },
      { id: "inquiries", label: "AI 핸드오프 문의", icon: MessageSquare, href: "/admin/inquiries" },
      { id: "consultations", label: "원격협진", icon: Video, href: "/admin/consultations" },
      { id: "referrals", label: "양·한방 협진 의뢰", icon: Building2, href: "/admin/khidi/referrals" },
      { id: "agent", label: "Human Agent", icon: HeartPulse, href: "/admin/agent" },
    ]
  },
  {
    title: "제휴 자원 · RAG",
    items: [
      { id: "hospitals", label: "제휴 병원", icon: Building2, href: "/admin/hospitals" },
      { id: "doctors", label: "의료진·지점", icon: Users, href: "/admin/doctors" },
      { id: "rag", label: "RAG 관리", icon: Brain, href: "/admin/rag" },
      { id: "rag-docs", label: "RAG 문서/Tier", icon: FileText, href: "/admin/rag/documents" },
      { id: "crawl", label: "Tier 2 데이터 갱신", icon: SearchCode, href: "/admin/crawl" },
      { id: "pipeline", label: "갱신 파이프라인", icon: BarChart3, href: "/admin/crawl/pipeline" },
    ]
  },
  {
    title: "AI 품질 · 시스템",
    items: [
      { id: "ai-quality", label: "AI 품질 모니터링", icon: Brain, href: "/admin/khidi/ai-quality" },
      { id: "ai-feedback", label: "AI 피드백", icon: ThumbsDown, href: "/admin/khidi/ai-feedback" },
      { id: "users", label: "회원(환자) 관리", icon: Users, href: "/admin/users" },
      { id: "staff", label: "직원 계정", icon: Users, href: "/admin/staff" },
      { id: "audit", label: "감사로그", icon: FileText, href: "/admin/audit" },
      { id: "notifications", label: "알림 관리", icon: Bell, href: "/admin/settings/notifications" },
      { id: "branding", label: "브랜딩 설정", icon: Palette, href: "/admin/settings/branding" },
    ]
  },
  {
    // 디렉토리 시절(전체 병원 수동등록) 잔재 — 코드는 보존, 메뉴에서만 하단 분리
    title: "레거시 도구",
    items: [
      { id: "import", label: "대량 Import", icon: Upload, href: "/admin/import" },
      { id: "enrichment", label: "데이터 보강", icon: Database, href: "/admin/enrichment" },
      { id: "playbook", label: "플레이북", icon: FileText, href: "/admin/playbook" },
      { id: "playbook-patterns", label: "응대 패턴", icon: Brain, href: "/admin/playbook-patterns" },
      { id: "playbook-analytics", label: "패턴 분석", icon: BarChart3, href: "/admin/playbook-analytics" },
      { id: "automation-playbook", label: "자동화", icon: BarChart3, href: "/admin/automation/playbook" },
    ]
  }
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navContent = (
    <>
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-gray-900">HEALO</h1>
              <p className="text-[10px] lg:text-xs text-gray-500">관리자 포털</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-4 lg:space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 lg:px-4 mb-1.5 lg:mb-2 text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-0.5 lg:space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isExactActive = pathname === item.href;
                const isParentOfActive =
                  item.href !== "/admin" &&
                  pathname !== item.href &&
                  pathname.startsWith(item.href + "/");
                // 정확히 현재 페이지만 강한 활성(teal 배경), 부모는 '열린 섹션'만 연하게 표시
                const strongActive = isExactActive;
                const parentOpen = !strongActive && isParentOfActive;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] lg:min-h-0 items-center ${
                      strongActive
                        ? "bg-teal-50 text-teal-700 shadow-sm"
                        : parentOpen
                        ? "bg-gray-50/80 text-gray-600 border-l-2 border-teal-200 -ml-0.5 pl-[14px]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        strongActive ? "text-teal-600" : parentOpen ? "text-gray-500" : "text-gray-400"
                      }
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 lg:p-4 border-t border-gray-200 pb-safe-area">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all min-h-[44px] md:min-h-0"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: top bar with hamburger (below PortalTopBar h-12) */}
      <div className="lg:hidden fixed top-12 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">HEALO Admin</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile: overlay sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop: fixed sidebar (below PortalTopBar h-12) */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 min-h-screen flex-col sticky top-12 h-[calc(100vh-3rem)]">
        {navContent}
      </aside>
    </>
  );
}
