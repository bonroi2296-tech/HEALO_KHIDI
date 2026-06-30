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
  Calculator,
  Sparkles,
  Trash2,
  Star,
  Stethoscope,
  Eye,
  Bug,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// 2026-05: 피벗(암환자 컨시어지) 반영 메뉴 재편 — 환자 여정 중심으로 그룹화,
// 디렉토리 시절 도구는 '레거시 도구'로 분리(코드 보존). 크롤링은 RAG Tier2 갱신으로 라벨 재정의.
// 2026-06-30: 메뉴 정리 — 과적된 "AI 품질·시스템"(10개)을 "AI 품질"+"계정·시스템"으로 분리.
//   메뉴에서 빠져 묻혀있던 페이지 편입: 만족도(KHIDI 성과지표)·치료/암종·후속 리마인더·AI품질평가·AI회귀·시스템관측.
const navGroups = [
  {
    title: "운영 현황",
    items: [
      { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
      { id: "kpi-dashboard", label: "중간평가 현황", icon: TrendingUp, href: "/admin/khidi/kpi-dashboard", children: [
        { id: "conversion", label: "유치 전환 상세", icon: Filter, href: "/admin/khidi/conversion" },
        { id: "satisfaction", label: "환자 만족도", icon: Star, href: "/admin/khidi/satisfaction" },
        { id: "evidence", label: "증빙 산출물", icon: FileText, href: "/admin/khidi/evidence" },
      ] },
      { id: "analytics", label: "문의 현황", icon: BarChart3, href: "/admin/analytics" },
      { id: "ad-budget", label: "광고 예산 계산기", icon: Calculator, href: "/admin/khidi/ad-budget" },
    ]
  },
  {
    title: "환자 여정",
    items: [
      { id: "leads", label: "사전상담 리드", icon: Users, href: "/admin/leads" },
      { id: "cases", label: "케이스 관리", icon: HeartPulse, href: "/admin/khidi/cases" },
      { id: "inquiries", label: "AI 핸드오프 문의", icon: MessageSquare, href: "/admin/inquiries" },
      { id: "chat", label: "AI 대화·환자자료", icon: MessageSquare, href: "/admin/chat" },
      { id: "consultations", label: "원격협진", icon: Video, href: "/admin/consultations" },
      { id: "referrals", label: "양·한방 협진 의뢰", icon: Building2, href: "/admin/khidi/referrals" },
      { id: "agent", label: "Human Agent", icon: HeartPulse, href: "/admin/agent" },
      { id: "reminders", label: "후속 리마인더", icon: Bell, href: "/admin/reminders" },
    ]
  },
  {
    title: "제휴 자원 · RAG",
    items: [
      { id: "hospitals", label: "제휴 병원", icon: Building2, href: "/admin/hospitals" },
      { id: "treatments", label: "치료·암종", icon: Stethoscope, href: "/admin/treatments" },
      { id: "agencies", label: "에이전시 관리", icon: Users, href: "/admin/khidi/agencies" },
      { id: "doctors", label: "의료진·지점", icon: Users, href: "/admin/doctors" },
      { id: "rag", label: "RAG", icon: Brain, href: "/admin/rag", children: [
        { id: "rag-docs", label: "RAG 문서/Tier", icon: FileText, href: "/admin/rag/documents" },
        { id: "crawl", label: "Tier 2 데이터 갱신", icon: SearchCode, href: "/admin/crawl" },
        { id: "pipeline", label: "갱신 파이프라인", icon: BarChart3, href: "/admin/crawl/pipeline" },
      ] },
    ]
  },
  {
    title: "AI 품질",
    items: [
      { id: "ai-status", label: "AI 상태", icon: Brain, href: "/admin/ai-status" },
      { id: "ai-quality", label: "AI 품질 평가", icon: Sparkles, href: "/admin/khidi/ai-quality" },
      { id: "ai-regression", label: "AI 회귀 테스트", icon: Bug, href: "/admin/khidi/ai-regression" },
      { id: "agent-analysis", label: "에이전트 자기분석", icon: Sparkles, href: "/admin/khidi/agent-analysis" },
      { id: "model-benchmark", label: "모델 성능 비교", icon: BarChart3, href: "/admin/khidi/model-benchmark" },
      { id: "ai-feedback", label: "AI 피드백", icon: ThumbsDown, href: "/admin/khidi/ai-feedback" },
    ]
  },
  {
    title: "계정 · 시스템",
    items: [
      { id: "users", label: "회원(환자) 관리", icon: Users, href: "/admin/users" },
      { id: "staff", label: "직원 계정", icon: Users, href: "/admin/staff" },
      { id: "deletion-requests", label: "데이터 삭제 요청", icon: Trash2, href: "/admin/account/deletion-requests" },
      { id: "audit", label: "감사로그", icon: FileText, href: "/admin/audit" },
      { id: "observability", label: "시스템 관측", icon: Eye, href: "/admin/observability" },
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
      { id: "playbook", label: "플레이북", icon: FileText, href: "/admin/playbook", children: [
        { id: "playbook-patterns", label: "응대 패턴", icon: Brain, href: "/admin/playbook-patterns" },
        { id: "playbook-analytics", label: "패턴 분석", icon: BarChart3, href: "/admin/playbook-analytics" },
        { id: "automation-playbook", label: "자동화", icon: BarChart3, href: "/admin/automation/playbook" },
      ] },
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

  const renderLeaf = (item, isChild) => {
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
        className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-2.5 rounded-lg ${isChild ? "text-[13px]" : "text-sm"} font-medium transition-all min-h-[44px] lg:min-h-0 items-center ${
          strongActive
            ? "bg-teal-50 text-teal-700 shadow-sm"
            : parentOpen
            ? "bg-gray-50/80 text-gray-600 border-l-2 border-teal-200 -ml-0.5 pl-[14px]"
            : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Icon
          size={isChild ? 16 : 18}
          className={strongActive ? "text-teal-700" : parentOpen ? "text-gray-500" : "text-gray-400"}
        />
        <span>{item.label}</span>
      </Link>
    );
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
              <h1 className="text-base lg:text-lg font-bold text-gray-900">healwith</h1>
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
                if (!item.children) return renderLeaf(item, false);
                // 부모 섹션이 활성(부모/자식 어느 경로든)일 때만 자식 펼침 — 토글 상태 없이 경로로만 제어
                const sectionActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/") ||
                  item.children.some(
                    (c) => pathname === c.href || pathname.startsWith(c.href + "/")
                  );
                return (
                  <div key={item.id} className="space-y-0.5 lg:space-y-1">
                    {renderLeaf(item, false)}
                    {sectionActive && (
                      <div className="ml-4 pl-2 border-l border-gray-100 space-y-0.5 lg:space-y-1">
                        {item.children.map((c) => renderLeaf(c, true))}
                      </div>
                    )}
                  </div>
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
          <span className="font-bold text-gray-900">healwith Admin</span>
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
