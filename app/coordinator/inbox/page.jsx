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

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    try {
      // inquiries 는 service_role 전용 RLS → 서버 API 경유 (이름은 복호화+마스킹돼서 옴)
      const res = await fetch("/api/portal/inbox", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "fetch_failed");
      setItems(result.items || []);
    } catch (e) {
      console.error("[inbox] fetch error:", e);
    }
    setLoading(false);
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
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
        >
          <RefreshCw size={16} /> {L.refresh}
        </button>
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
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Inbox size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{L.inboxEmpty}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
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
