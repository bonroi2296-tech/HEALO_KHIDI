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
  KeyRound,
  Settings,
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
  ChevronDown,
  Target,
  Wallet,
  Inbox,
  BookOpen,
  Mic,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// 2026-05: 피벗(암환자 컨시어지) 반영 메뉴 재편 — 환자 여정 중심으로 그룹화,
// 디렉토리 시절 도구는 '레거시 도구'로 분리(코드 보존). 크롤링은 RAG Tier2 갱신으로 라벨 재정의.
// 2026-06-30: 메뉴 정리 — 과적된 "AI 품질·시스템"(10개)을 "AI 품질"+"계정·시스템"으로 분리.
// 2026-07-24: 백오피스 리뉴얼 2단계(메뉴 정리) — 근거·시안 = docs/ADMIN_RENEWAL_PLAN.md §3-2.
//   ① 그룹 재편: 홈 / 상담·문의 / 파트너·회원 / 콘텐츠 / AI 품질(접힘) / 시스템 (용어는 IT 표준 — PO_PREFERENCES 2026-07-24).
//   ② 실DB 0행으로 실측된 안 쓰는 화면은 hidden:true 로 "비활성"만 — 🛑 삭제 금지(PO 지시).
//      코드·주소(/admin/…)는 그대로 살아 있고, hidden 한 줄 지우면 즉시 메뉴 복구된다.
const navGroups = [
  {
    title: "홈",
    items: [
      { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
      { id: "kpi-dashboard", label: "KHIDI 리포트", icon: TrendingUp, href: "/admin/khidi/kpi-dashboard", children: [
        { id: "north-star", label: "북극성 지표", icon: Target, href: "/admin/khidi/north-star" },
        { id: "conversion", label: "유치 전환 상세", icon: Filter, href: "/admin/khidi/conversion" },
        { id: "satisfaction", label: "환자 만족도", icon: Star, href: "/admin/khidi/satisfaction" },
        { id: "evidence", label: "증빙 산출물", icon: FileText, href: "/admin/khidi/evidence" },
      ] },
      { id: "analytics", label: "문의 통계", icon: BarChart3, href: "/admin/analytics" },
      { id: "ad-budget", label: "광고 예산", icon: Calculator, href: "/admin/khidi/ad-budget" },
    ]
  },
  {
    title: "상담 · 문의",
    items: [
      // 2026-08-25: 「문의 관리」가 어드민 전용 «얇은» 화면(상태 변경 + 번역만)을 가리키고 있었다.
      //   같은 문의를 코디 받은함은 의뢰서·소견·공유문서·후속일정까지 보여준다(어드민 19KB / 코디 84KB).
      //   → 주 진입점을 코디 받은함으로 돌린다. 화면 신설이 아니다 — StaffPortalGate 가 admin 을 통과시켜
      //     어드민은 원래 그 화면에 들어갈 수 있었고, 메뉴에만 없었다.
      //   옛 화면은 지우지 않고 하위 항목으로 남긴다 — 거기에만 있는 기능이 «시험 문의 포함 보기»(includeTest).
      //   코디 받은함은 is_test 를 항상 숨긴다(2026-08-14 PO 결정)라 대체할 수 없다.
      { id: "inquiries", label: "문의 · 케이스 받은함", icon: Inbox, href: "/coordinator/inbox", children: [
        { id: "inquiries-raw", label: "문의 원본(시험 포함)", icon: MessageSquare, href: "/admin/inquiries" },
      ] },
      // 2026-09-07: 왓츠앱·텔레그램 음성을 문의 만들기 전에 읽는 자리 — 코디 메뉴에만 있었다(9/04 신설).
      { id: "voice", label: "음성 정리", icon: Mic, href: "/coordinator/voice" },
      { id: "cases", label: "케이스 관리", icon: HeartPulse, href: "/admin/khidi/cases" },
      { id: "chat", label: "AI 채팅", icon: MessageSquare, href: "/admin/chat" },
      { id: "agent", label: "Human Agent 채널", icon: HeartPulse, href: "/admin/agent" },
      { id: "consultations", label: "화상 상담", icon: Video, href: "/admin/consultations" },
      { id: "referrals", label: "협진 의뢰", icon: Building2, href: "/admin/khidi/referrals" },
      { id: "reminders", label: "후속 리마인더", icon: Bell, href: "/admin/reminders" },
      // ↓ 리뉴얼 5단계(2026-07-24): 코디 전용이던 실무 화면을 어드민 메뉴에서도 연다(§2 "어드민 = 통합 콘솔").
      //   화면 자체는 코디 포털(공용 문지기 PortalGate 가 admin 을 통과시킴) — 신설 아님, 링크 연결만.
      // 2026-08-25 추가: 환자↔코디 메신저. 5단계에서 4개만 연결하고 이것만 빠져 있었다.
      { id: "patient-messages", label: "환자 대화", icon: MessageSquare, href: "/coordinator/messages" },
      { id: "cost-estimates", label: "견적 관리", icon: Calculator, href: "/coordinator/cost-estimates" },
      { id: "visa", label: "비자 트래킹", icon: FileText, href: "/coordinator/visa" },
      { id: "symptom-alerts", label: "증상 알림", icon: Bell, href: "/coordinator/alerts" },
      // 2026-09-06: 재진 요청·증상 기록·케이던스를 받는 자리(코디 화면 공용).
      { id: "postcare-board", label: "사후관리 보드", icon: HeartPulse, href: "/coordinator/satisfaction" },
    ]
  },
  {
    title: "파트너 · 회원",
    items: [
      { id: "staff", label: "직원(코디) 계정", icon: Users, href: "/admin/staff" },
      { id: "agencies", label: "에이전시·클리닉", icon: Users, href: "/admin/khidi/agencies" },
      { id: "partner-outreach", label: "파트너 발굴", icon: Target, href: "/admin/khidi/partners" },
      { id: "hospitals", label: "제휴 병원", icon: Building2, href: "/admin/hospitals" },
      // 2026-08-25 이름·자리 교정: 옛 이름 「사전상담 리드」는 사실과 달랐다. 이 화면이 보는 표는
      //   hospital_leads = «제휴 병원에 넘긴 진료 의뢰» 다(병원 포털 /hospital/leads 가 보는 그 표).
      //   사전상담과 무관해서 「상담·문의」 칸에 있으면 안 된다 → 파트너 칸으로 옮김.
      { id: "leads", label: "병원 진료의뢰", icon: MessageSquare, href: "/admin/leads" },
      { id: "users", label: "환자 회원", icon: Users, href: "/admin/users" },
      { id: "deletion-requests", label: "데이터 삭제 요청", icon: Trash2, href: "/admin/account/deletion-requests" },
    ]
  },
  {
    title: "콘텐츠",
    items: [
      // 리뉴얼 5단계(2026-07-24): 코디 문구 편집기를 어드민에서도 — 화면은 코디 포털(admin 통과).
      { id: "content-editor", label: "문구 편집기", icon: Palette, href: "/coordinator/content" },
      // 2026-08-25 신설: 환자 교육자료(education_contents 18건)는 환자 화면에 나가는데
      //   고칠 화면이 어드민·코디 어디에도 없었다(마지막 손댄 날 2026-04-17 = 피벗 전).
      { id: "education", label: "환자 교육자료", icon: BookOpen, href: "/admin/education" },
      { id: "rag", label: "AI 지식베이스", icon: Brain, href: "/admin/rag", children: [
        { id: "rag-docs", label: "RAG 문서/Tier", icon: FileText, href: "/admin/rag/documents" },
      ] },
    ]
  },
  {
    title: "AI 품질",
    collapsed: true, // 평소엔 접어둠(가끔 쓰는 튜닝·평가 도구). 해당 페이지 들어가면 자동 펼침
    items: [
      { id: "ai-status", label: "AI 상태", icon: Brain, href: "/admin/ai-status" },
      { id: "ai-quality", label: "AI 품질 평가", icon: Sparkles, href: "/admin/khidi/ai-quality" },
      { id: "ai-regression", label: "AI 회귀 테스트", icon: Bug, href: "/admin/khidi/ai-regression" },
      { id: "agent-analysis", label: "에이전트 자기분석", icon: Sparkles, href: "/admin/khidi/agent-analysis" },
      { id: "model-benchmark", label: "모델 성능 비교", icon: BarChart3, href: "/admin/khidi/model-benchmark" },
      // 2026-08-25 보관함에서 복귀. 7/24 에 «연결된 표(playbook_patterns)가 0행» 이라 죽은 걸로 보고
      //   숨겼는데, 이 화면이 실제로 보는 건 auto_jobs 다 — 다시 재보니 184건·어제(8/24)도 돌았다.
      //   매일 도는 자동 작업을 볼 화면이 숨겨져 있으면 실패해도 아무도 모른다.
      { id: "automation-playbook", label: "자동개선 현황", icon: BarChart3, href: "/admin/automation/playbook" },
    ]
  },
  {
    title: "시스템",
    items: [
      // 코디가 적은 개선 요청을 어드민에서도 본다(화면은 코디 포털 — admin 통과). 2026-08-04 PO 제안
      { id: "staff-requests", label: "개선 요청함", icon: MessageSquare, href: "/coordinator/requests" },
      { id: "audit", label: "감사로그", icon: FileText, href: "/admin/audit" },
      { id: "usage", label: "외부 서비스 사용량", icon: Wallet, href: "/admin/khidi/usage" },
      { id: "notifications", label: "알림 관리", icon: Bell, href: "/admin/settings/notifications" },
      { id: "branding", label: "브랜딩 설정", icon: Palette, href: "/admin/settings/branding" },
    ]
  },
  {
    // 🗄️ 비활성 보관함 — 실DB 0행 실측으로 안 쓰는 화면.
    // 메뉴에서만 숨김(hidden) — 라우트·코드는 살아 있어 주소 직접 입력하면 열리고, hidden 지우면 메뉴 복구.
    // ⚠️ 여기 넣는 판정은 «영구»가 아니다. 2026-08-25 재측정에서 자동화 1건이 잘못 들어와 있었고
    //    (auto_jobs 184건·매일 도는 중) 비자·후속일정·경과기록 3건은 0 → 살아난 것으로 뒤집혔다.
    //    그래서 `npm run check:dead-screens` 가 아래 목록과 실DB 를 매달 대조한다.
    title: "비활성 화면 (메뉴에서 숨김)",
    hidden: true,
    items: [
      { id: "import", label: "대량 Import", icon: Upload, href: "/admin/import" },
      { id: "enrichment", label: "데이터 보강", icon: Database, href: "/admin/enrichment" },
      { id: "observability", label: "시스템 관측", icon: Eye, href: "/admin/observability" },
      { id: "crawl", label: "Tier 2 데이터 갱신", icon: SearchCode, href: "/admin/crawl" },
      { id: "pipeline", label: "갱신 파이프라인", icon: BarChart3, href: "/admin/crawl/pipeline" },
      { id: "crawl-review", label: "크롤 검수(옛 고아 화면)", icon: SearchCode, href: "/admin/crawl/review" },
      { id: "playbook", label: "플레이북", icon: FileText, href: "/admin/playbook", children: [
        { id: "playbook-patterns", label: "응대 패턴", icon: Brain, href: "/admin/playbook-patterns" },
        { id: "playbook-analytics", label: "패턴 분석", icon: BarChart3, href: "/admin/playbook-analytics" },
      ] },
      // ↓ 2026-08-25 재측정으로 새로 내려온 것들 (전부 실DB 0행, 코드는 보존)
      // treatments 0행 · treatment_sources 0행. 7/20 에 비워졌고(_backup_treatments_20260720)
      //   공개 /treatments 목록은 코드에 박힌 암종 상수를 쓴다 — 이 표를 안 본다.
      { id: "treatments", label: "치료·암종(디렉토리 시절)", icon: Stethoscope, href: "/admin/treatments" },
      // partner_doctors 0행 · partner_branches 0행. 의사 계층은 #334 에서 폐지됐고(상담방 초대링크로 참여)
      //   화상상담 만들기 화면엔 의사 고르는 칸이 이미 없다(2026-08-25 확인) — 남은 건 빈 표뿐.
      { id: "doctors", label: "의료진·지점(폐지된 계층)", icon: Users, href: "/admin/doctors" },
      // chat_feedback 0행. 환자가 AI 답변에 👍👎 누르는 기능이 한 번도 안 눌렸다.
      //   AI 품질 평가(ai_response_evaluations 481건)가 실질 대체.
      { id: "ai-feedback", label: "AI 피드백", icon: ThumbsDown, href: "/admin/khidi/ai-feedback" },
    ]
  }
];

// hidden 플래그 반영 — 그룹/항목/하위항목 어디든 hidden:true 면 메뉴에서 제외(코드는 보존)
const visibleGroups = navGroups
  .filter((g) => !g.hidden)
  .map((g) => ({
    ...g,
    items: g.items
      .filter((it) => !it.hidden)
      .map((it) => {
        if (!it.children) return it;
        const kids = it.children.filter((c) => !c.hidden);
        return kids.length ? { ...it, children: kids } : { ...it, children: undefined };
      }),
  }))
  .filter((g) => g.items.length > 0);

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // 접힌 그룹을 사용자가 수동으로 펼친 상태(제목→bool). 현재 페이지가 든 그룹은 항상 펼침.
  const [openExtra, setOpenExtra] = useState({});

  const groupHasActive = (group) =>
    group.items.some(
      (it) =>
        pathname === it.href ||
        pathname.startsWith(it.href + "/") ||
        (it.children &&
          it.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")))
    );

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
          className={strongActive ? "text-teal-700" : parentOpen ? "text-gray-500" : "text-gray-500"}
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
            className="lg:hidden p-2 text-gray-500 hover:text-gray-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-4 lg:space-y-6 overflow-y-auto">
        {visibleGroups.map((group) => {
          const collapsible = !!group.collapsed;
          // 펼침: 접이식 아님 OR 사용자가 수동 토글했으면 그 값 우선, 아니면 현재 페이지가 이 그룹 안일 때 자동 펼침
          // (수동 토글값을 자동펼침보다 우선해야 — 활성 그룹을 사용자가 접을 수 있음. 안 그러면 토글 버튼이 먹통)
          const open = !collapsible || (group.title in openExtra ? !!openExtra[group.title] : groupHasActive(group));
          return (
          <div key={group.title}>
            {collapsible ? (
              <button
                onClick={() => setOpenExtra((s) => ({ ...s, [group.title]: !open }))}
                className="w-full flex items-center justify-between px-3 lg:px-4 mb-1.5 lg:mb-2 text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                <span>{group.title}</span>
                <ChevronDown size={14} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>
            ) : (
              <h3 className="px-3 lg:px-4 mb-1.5 lg:mb-2 text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            {open && (
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
            )}
          </div>
          );
        })}
      </nav>

      <div className="p-3 lg:p-4 border-t border-gray-200 pb-safe-area space-y-1">
        <Link
          href="/coordinator/settings"
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all min-h-[44px] md:min-h-0"
        >
          <Settings size={18} />
          <span>설정</span>
        </Link>
        <Link
          href="/account/password"
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all min-h-[44px] md:min-h-0"
        >
          <KeyRound size={18} />
          <span>비밀번호 변경</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all min-h-[44px] md:min-h-0"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: top bar with hamburger — 전역 포털 상단바 «바로 밑». 높이 값을 손으로 박지 마라,
          상단바는 h-14 md:h-16 + 안전영역이다(단일 SoR: src/index.css 의 .healo-portal-offset). */}
      <div className="lg:hidden fixed top-[calc(3.5rem+var(--healo-safe-top))] md:top-[calc(4rem+var(--healo-safe-top))] left-0 right-0 z-40 h-[4.5rem] bg-white border-b border-gray-200 px-4 flex items-center justify-between">
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
          {/* 여는 버튼(☰)이 오른쪽 위라 서랍도 오른쪽에서 나온다 (2026-08-04 PO 지적) */}
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop: fixed sidebar — 전역 포털 상단바(lg 에선 h-16=4rem) 바로 밑 */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 min-h-screen flex-col sticky top-16 h-[calc(100vh-4rem)]">
        {navContent}
      </aside>
    </>
  );
}
