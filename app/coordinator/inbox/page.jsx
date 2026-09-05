"use client";

/**
 * 코디네이터 인박스 — inquiries 테이블 기반 단일 뷰
 * Step 1만 완료 → 빨간 배지 "추가 정보 필요"
 * Step 2 완료 → 매칭 정확도 표시
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox, User, Globe, AlertCircle, CheckCircle2,
  Calendar, ChevronRight, RefreshCw,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { caseDelayDays } from "@/lib/khidi/caseStatus";
import { useBackofficeLang, useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { cancerTypeLabelL, contactMethodLabelL } from "@/lib/khidi/medicalLabels";
import { nationalityLabelL } from "@/lib/khidi/nationality";

const STATUS_COLORS = {
  received: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  matched: "bg-teal-100 text-teal-700",
  completed: "bg-gray-100 text-gray-600",
};

export default function CoordinatorInboxPage() {
  const router = useRouter();
  const L = useCoordinatorL();
  const lang = useBackofficeLang();
  const dateLoc = useDateLocale();
  const STATUS_LABELS = {
    received: L.invStatusReceived, reviewing: L.invStatusReviewing,
    matched: L.invStatusMatched, completed: L.invStatusCompleted,
  };
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | step1_only | step2_done
  // 시연·점검용. 기본은 꺼짐 = 평소 화면 그대로(시험 문의는 안 보인다).
  const [showTest, setShowTest] = useState(false);
  // 최근 24시간에 시험으로 분류돼 «숨은» 건수. 숨기는 건 맞지만 숨겼다는 사실은 보여야 한다.
  const [hiddenTest, setHiddenTest] = useState(0);

  useEffect(() => {
    load();
  }, [showTest]);

  async function load() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    try {
      // inquiries 는 service_role 전용 RLS → 서버 API 경유 (이름은 복호화+마스킹돼서 옴)
      const res = await fetch(`/api/portal/inbox${showTest ? "?includeTest=1" : ""}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "fetch_failed");
      setItems(result.items || []);
      setHiddenTest(result.hiddenTestCount || 0);
    } catch (e) {
      console.error("[inbox] fetch error:", e);
    }
    setLoading(false);
  }

  /**
   * 「시험」 표시를 떼어 진짜 문의로 되돌린다.
   * 접수 시점 판정이 틀리는 경우가 실제로 있어서 사람이 고칠 길을 둔다(2026-09-02 PO 요청).
   * 실적 집계가 걸린 값이라 되묻고 나서 바꾼다.
   */
  async function markReal(id) {
    if (!window.confirm(
      `문의 #${id} 의 「시험」 표시를 뗍니다.\n\n` +
      `코디 목록에 그대로 남고, KHIDI 실적에도 잡히게 됩니다.`
    )) return;
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`/api/coordinator/inquiries/${id}/test-flag`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ isTest: false }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j?.error || "failed");
      load();
    } catch (e) {
      console.error("[inbox] test-flag error:", e);
      window.alert("표시를 바꾸지 못했습니다. 잠시 뒤 다시 눌러주세요.");
    }
  }

  const filtered = items.filter((item) => {
    if (filter === "step1_only") return item.step1_completed_at && !item.step2_completed_at;
    if (filter === "step2_done") return !!item.step2_completed_at;
    return true;
  });

  const step1OnlyCount = items.filter((i) => i.step1_completed_at && !i.step2_completed_at).length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox size={24} className="text-teal-700" /> {L.inboxTitle}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{L.inboxSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 숨긴 건 맞지만 «숨겼다는 사실»은 보여야 한다 — 안 그러면 「접수가 안 됐다」로 읽힌다.
              (2026-09-02: 진짜 환자 문의 #291 이 회사 도메인 연락처 탓에 시험으로 찍혀 통째로 사라졌다) */}
          {!showTest && hiddenTest > 0 && (
            <button
              onClick={() => setShowTest(true)}
              className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
              title="시험으로 분류돼 목록에서 빠진 문의입니다. 눌러서 함께 보기"
            >
              최근 24시간에 시험으로 분류돼 숨은 문의 {hiddenTest}건
            </button>
          )}
          {/* 시연·점검용 — 켜면 시험 문의도 함께 보인다(각 줄에 「시험」 표가 붙는다). */}
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTest}
              onChange={(e) => setShowTest(e.target.checked)}
              className="accent-teal-700"
            />
            시험 문의 보기
          </label>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
          >
            <RefreshCw size={16} /> {L.refresh}
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "all", label: L.all, count: items.length },
          {
            key: "step1_only",
            label: L.inboxFilterNeedInfo,
            count: step1OnlyCount,
            badge: "red",
          },
          {
            key: "step2_done",
            label: L.inboxFilterReady,
            count: items.filter((i) => !!i.step2_completed_at).length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 flex items-center gap-2 ${
              filter === tab.key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                tab.badge === "red"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div data-testid="inbox-empty" className="text-center py-16 bg-gray-50 rounded-xl">
          <Inbox size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{L.inboxEmpty}</p>
        </div>
      ) : (
        <div data-testid="inbox-table" className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          {/* overflow-x-auto: 표가 6칸이라 폰(412px)에서는 874px 까지 벌어진다.
              예전에는 `overflow-hidden` 이라 넘친 칸(연락 방법·접수일 등)을 **옆으로 밀 수도 없어
              영영 못 봤다**(2026-08-04 실측). 이제 옆으로 밀어서 볼 수 있다. */}
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.name}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.nationality}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.cancerType}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.contactMethod}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.inboxColStep}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.receivedDate}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">{L.status}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const step2Done = !!item.step2_completed_at;
                // 지연 감지: 살아있는 케이스가 단계 기준일을 넘기면 「N일째 정체」.
                // 앵커는 단계 갱신 시각, 단계 미설정이면 접수 시각(방치 케이스 감지).
                // 완료·차단(스팸)·오류 문의는 죽은 문의라 제외(독립리뷰 #738 지적).
                const delayDays =
                  ["completed", "blocked", "error"].includes(item.status)
                    ? null
                    : caseDelayDays(item.case_status, item.case_status_updated_at || item.created_at);
                return (
                  <tr
                    key={item.id}
                    // 자동 검사가 «글자» 대신 이걸로 고른다 — 이 줄은 링크가 아니라 행 클릭이라
                    // a[href] 로 찾으면 0건이 나와 검사가 조용히 지나친다(2026-08-25).
                    data-testid="inbox-row"
                    data-inquiry-id={item.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => router.push(`/coordinator/inbox/${item.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          <User size={14} className="text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[120px]">
                          {item.name || "—"}
                        </span>
                        {/* 접수 주체 구분: 에이전시 의뢰면 배지(환자 직접은 배지 없음=기본) */}
                        {/* 누르면 「시험」 표시가 떨어져 진짜 문의로 돌아온다. 줄 전체가 상세로
                            가는 클릭을 물고 있으므로 stopPropagation 이 없으면 상세로 튕긴다. */}
                        {item.is_test && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markReal(item.id); }}
                            title="시험으로 분류돼 목록에서 숨겨진 문의입니다. 누르면 표시가 떨어져 실적에도 잡힙니다."
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 shrink-0 transition"
                          >
                            시험 ✕
                          </button>
                        )}
                        {item.agency_id && (
                          <span
                            title={item.agency_name || L.agencyReferral}
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-violet-100 text-violet-700 shrink-0"
                          >
                            🏢 {L.badgeAgency}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        {item.nationality ? nationalityLabelL(item.nationality, lang) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.cancer_type ? cancerTypeLabelL(item.cancer_type, lang) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.contact_method
                        ? contactMethodLabelL(item.contact_method, lang)
                        : item.preferred_language
                        ? contactMethodLabelL("email", lang)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            step2Done
                              ? "bg-teal-100 text-teal-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {step2Done ? "Step 1+2" : L.inboxStepOneOnly}
                        </span>
                        {!step2Done && (
                          <AlertCircle size={14} className="text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString(dateLoc)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[item.status] || L.invStatusReceived}
                        </span>
                        {delayDays !== null && (
                          <span
                            className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 shrink-0"
                            title={L.inboxDelayedDays.replace("{n}", String(delayDays))}
                          >
                            ⏰ {L.inboxDelayedDays.replace("{n}", String(delayDays))}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
