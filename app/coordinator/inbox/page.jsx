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
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const CANCER_LABELS = {
  stomach: "위암", liver: "간암", lung: "폐암",
  breast: "유방암", thyroid: "갑상선암", colorectal: "대장암",
  pancreatic: "췌장암", other: "기타",
};

const NATIONALITY_LABELS = {
  KZ: "카자흐스탄", RU: "러시아", UZ: "우즈베키스탄",
  KG: "키르기스스탄", MN: "몽골", CN: "중국",
  JP: "일본", KR: "한국", OTHER: "기타",
};

const STATUS_COLORS = {
  received: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  matched: "bg-teal-100 text-teal-700",
  completed: "bg-gray-100 text-gray-600",
};

export default function CoordinatorInboxPage() {
  const router = useRouter();
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
      const { data, error } = await supabase
        .from("inquiries")
        .select(
          "id, nationality, cancer_type, preferred_language, contact_method, match_accuracy, status, step1_completed_at, step2_completed_at, created_at, first_name"
        )
        .not("step1_completed_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setItems(data || []);
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
            <Inbox size={24} className="text-teal-600" /> 신규 상담 인박스
          </h1>
          <p className="text-gray-500 text-sm mt-1">funnel Step 1 이상 완료된 상담 목록입니다.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
        >
          <RefreshCw size={16} /> 새로 고침
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "all", label: "전체", count: items.length },
          {
            key: "step1_only",
            label: "추가 정보 필요",
            count: step1OnlyCount,
            badge: "red",
          },
          {
            key: "step2_done",
            label: "매칭 준비 완료",
            count: items.filter((i) => !!i.step2_completed_at).length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 flex items-center gap-2 ${
              filter === tab.key
                ? "border-teal-600 text-teal-600"
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
          <p className="text-gray-500">해당 조건의 상담이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">이름</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">국적</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">암종</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">연락방법</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Step 완료</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">매칭 정확도</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">접수일</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const step1Done = !!item.step1_completed_at;
                const step2Done = !!item.step2_completed_at;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => router.push(`/coordinator/inbox/${item.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          <User size={14} className="text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[120px]">
                          {item.first_name ? "[암호화됨]" : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        {NATIONALITY_LABELS[item.nationality] || item.nationality || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {CANCER_LABELS[item.cancer_type] || item.cancer_type || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.contact_method || (item.preferred_language ? "이메일" : "—")}
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
                          {step2Done ? "Step 1+2" : "Step 1만"}
                        </span>
                        {!step2Done && (
                          <AlertCircle size={14} className="text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          (item.match_accuracy ?? 0) >= 90
                            ? "bg-teal-100 text-teal-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.match_accuracy ?? 60}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("ko-KR")
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.status || "received"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
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
