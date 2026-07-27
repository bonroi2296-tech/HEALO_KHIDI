"use client";

// 어드민 홈 = 통합 대시보드 (백오피스 리뉴얼 3단계 — docs/ADMIN_RENEWAL_PLAN.md §3-3, PO 승인 시안 v2)
// 역할별 현황 카드(환자/코디/에이전시·클리닉/병원/시스템) + 최근 활동 피드.
// 데이터 = /api/admin/dashboard/overview (기존 기록 집계 — 새 테이블 없음).

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Building2,
  HeartPulse,
  Video,
  BarChart3,
  Brain,
  Users,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { formatDate } from "@/lib/i18n/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AdminGuideModal } from "./_components/AdminGuideModal";

const supabase = createSupabaseBrowserClient();

// 역할 식별 색(사이드바 teal 브랜드와 별개로, 피드·카드에서 역할 구분용)
// ⚠️ 이 칩들은 흰 글씨(10px bold)를 얹는다 → 배경이 흰색 대비 4.5:1 이상이어야 한다.
//    2026-07-27 프로덕션 실측에서 teal-600(3.74)이 걸렸다. 같은 이유로 violet-500(4.23)·amber-500(2.15)도
//    미달이지만 «그 역할의 데이터가 마침 없어서» 측정에 안 잡혔을 뿐이라 함께 교정한다.
//    교훈: 프리뷰에서 0건이어도 «데이터가 없어 안 걸린 것»일 수 있다 — 색 상수는 실측을 기다리지 말고 계산으로 검산할 것.
const ROLE_META = {
  patient: { label: "환자", chip: "bg-teal-700" },      // 3.74 → 5.47
  coordinator: { label: "코디", chip: "bg-sky-700" },   // 5.93 (유지)
  agency: { label: "에이전시", chip: "bg-violet-600" }, // 4.23 → 5.70
  hospital: { label: "병원", chip: "bg-amber-700" },    // 2.15 → 5.02
  system: { label: "시스템", chip: "bg-gray-600" },     // 4.83 → 7.56
};

const quickLinks = [
  { title: "문의 관리", href: "/admin/inquiries", icon: MessageSquare },
  { title: "AI 채팅", href: "/admin/chat", icon: MessageSquare },
  { title: "화상 상담", href: "/admin/consultations", icon: Video },
  { title: "Human Agent 채널", href: "/admin/agent", icon: HeartPulse },
  { title: "제휴 병원", href: "/admin/hospitals", icon: Building2 },
  { title: "문의 통계", href: "/admin/analytics", icon: BarChart3 },
  { title: "AI 지식베이스", href: "/admin/rag", icon: Brain },
  { title: "환자 회원", href: "/admin/users", icon: Users },
];

function timeOf(iso) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
    return formatDate(iso, "ko");
  } catch {
    return "";
  }
}

function RoleCard({ swatch, title, big, unit, rows, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition text-left"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-sm ${swatch}`} />
        <span className="text-xs font-bold text-gray-500">{title}</span>
      </div>
      <div className="text-2xl font-extrabold text-gray-900 tabular-nums">
        {big}
        <span className="text-xs font-semibold text-gray-500 ml-1">{unit}</span>
      </div>
      <div className="mt-2 space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs text-gray-500">
            <span>{k}</span>
            <span className="font-semibold text-gray-700 tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(false);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/admin/dashboard/overview", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) setData(json);
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const c = data?.cards;

  return (
    <div className="space-y-6 lg:space-y-8">
      {showGuide && (
        <AdminGuideModal title="대시보드 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>관리자 포털의 <strong>통합 대시보드</strong>입니다. 환자·코디네이터·에이전시/클리닉·병원·시스템 — 모든 역할의 현황을 한 화면에서 봅니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">보는 법</h3>
            <p>「오늘 현황」 카드의 숫자는 실제 운영 데이터 집계이고, 카드를 누르면 해당 관리 화면으로 이동합니다. 「최근 활동」에는 문구 수정·새 문의·상담 생성·협진 의뢰·병원 리드가 시간순으로 쌓여요 — "누가 뭘 했는지"를 여기서 따라갑니다.</p>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">메뉴 안내</h3>
            <p className="text-teal-700 text-sm">좌측 메뉴는 홈 / 상담·문의 / 파트너·회원 / 콘텐츠 / AI 품질 / 시스템 6묶음입니다. 안 쓰는 옛 도구(대량 Import·플레이북·크롤링 등)는 2026-07 메뉴 정리로 숨겨졌습니다 — 삭제가 아니라 비활성이라 필요하면 복구할 수 있어요.</p>
          </section>
        </AdminGuideModal>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">통합 대시보드</h1>
          <p className="text-gray-500 mt-1 lg:mt-2 text-sm lg:text-base">모든 역할의 현황을 한 화면에서</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {/* ── 오늘 현황 (역할별 카드) ── */}
      <section>
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-base font-bold text-gray-900">오늘 현황</h2>
          <span className="text-xs text-gray-500">실데이터 집계</span>
          <button
            type="button"
            onClick={load}
            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 transition"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> 새로고침
          </button>
        </div>

        {loadError ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
            현황을 불러오지 못했습니다. <button type="button" onClick={load} className="underline font-semibold">다시 시도</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <RoleCard
              swatch={ROLE_META.patient.chip}
              title="환자"
              big={loading ? "…" : (c?.patient.inquiries ?? 0)}
              unit="건 문의"
              rows={[
                ["AI 채팅", loading ? "…" : `${c?.patient.chatThreads ?? 0}건`],
                ["텔레그램·왓츠앱", loading ? "…" : `${(c?.patient.telegram ?? 0) + (c?.patient.whatsapp ?? 0)}건`],
              ]}
              onClick={() => router.push("/admin/inquiries")}
            />
            <RoleCard
              swatch={ROLE_META.coordinator.chip}
              title="코디네이터"
              big={loading ? "…" : (c?.coordinator.consultations ?? 0)}
              unit="건 상담"
              rows={[
                ["예정 상담", loading ? "…" : `${c?.coordinator.upcoming ?? 0}건`],
                ["견적 · 문구 편집", loading ? "…" : `${c?.coordinator.estimates ?? 0} · ${c?.coordinator.contentEdits ?? 0}건`],
              ]}
              onClick={() => router.push("/admin/consultations")}
            />
            <RoleCard
              swatch={ROLE_META.agency.chip}
              title="에이전시·클리닉"
              big={loading ? "…" : (c?.agency.active ?? 0)}
              unit="개사 활성"
              rows={[
                ["협진 의뢰", loading ? "…" : `${c?.agency.referrals ?? 0}건 (대기 ${c?.agency.referralsPending ?? 0})`],
                ["파트너 계정", loading ? "…" : `${c?.agency.users ?? 0}명`],
              ]}
              onClick={() => router.push("/admin/khidi/agencies")}
            />
            <RoleCard
              swatch={ROLE_META.hospital.chip}
              title="병원"
              big={loading ? "…" : (c?.hospital.unanswered ?? 0)}
              unit="건 미응답 리드"
              rows={[
                ["제휴 병원", loading ? "…" : `${c?.hospital.hospitals ?? 0}곳`],
                ["리드 전체", loading ? "…" : `${c?.hospital.leads ?? 0}건`],
              ]}
              onClick={() => router.push("/admin/leads")}
            />
            <RoleCard
              swatch={ROLE_META.system.chip}
              title="시스템"
              big={loading ? "…" : (c?.system.aiPassRate ?? "–")}
              unit={c?.system.aiPassRate != null ? "% AI 통과율" : "AI 회귀 없음"}
              rows={[
                ["환각 응답", loading ? "…" : c?.system.aiHallucinations != null ? `${c.system.aiHallucinations}건` : "–"],
                ["최근 실행", loading ? "…" : (c?.system.aiRunDate || "–")],
              ]}
              onClick={() => router.push("/admin/khidi/ai-regression")}
            />
          </div>
        )}
      </section>

      {/* ── 최근 활동 ── */}
      <section>
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-base font-bold text-gray-900">최근 활동</h2>
          <span className="text-xs text-gray-500">모든 역할의 변경사항이 시간순으로</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {loading && (
            <div className="p-4 text-sm text-gray-500">불러오는 중…</div>
          )}
          {!loading && (data?.feed?.length ? (
            data.feed.map((f, i) => {
              const meta = ROLE_META[f.role] || ROLE_META.system;
              return (
                <button
                  key={`${f.at}-${i}`}
                  type="button"
                  onClick={() => router.push(f.href)}
                  className="w-full flex items-baseline gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition"
                >
                  <span className="text-[11px] text-gray-500 tabular-nums min-w-[52px]">{timeOf(f.at)}</span>
                  <span className={`text-[10px] font-bold text-white rounded-full px-2 py-0.5 whitespace-nowrap ${meta.chip}`}>
                    {meta.label}
                  </span>
                  <span className="text-sm text-gray-600 truncate">{f.label}</span>
                  <ArrowRight size={13} className="ml-auto text-gray-300 flex-shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="p-4 text-sm text-gray-500">
              {loadError ? "불러오지 못했습니다." : "아직 기록된 활동이 없습니다."}
            </div>
          ))}
        </div>
      </section>

      {/* ── 바로가기 ── */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-3">바로가기</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.href}
                type="button"
                onClick={() => router.push(link.href)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-teal-300 hover:text-teal-700 text-sm text-gray-600 transition"
              >
                <Icon size={14} />
                {link.title}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
