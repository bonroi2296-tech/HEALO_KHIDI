"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Send, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

const STATUS_CONFIG = {
  pending: { label: "대기 중", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  sent: { label: "발송 완료", icon: CheckCircle, color: "text-green-700", bg: "bg-green-50 border-green-200" },
  failed: { label: "실패", icon: XCircle, color: "text-red-700", bg: "bg-red-50 border-red-200" },
  cancelled: { label: "취소됨", icon: XCircle, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

const CHANNEL_LABELS = {
  email: "이메일",
  kakao: "카카오 알림톡",
  in_app: "앱 알림",
};

// 무엇을 보냈는지 — 종류가 안 보이면 「상담 알림」과 「사후관리 교육」이 한 줄로 뭉쳐 보인다.
const TYPE_LABELS = {
  consultation_reminder: "상담 30분 전 알림",
  survey_request: "만족도 설문",
  education_content: "사후관리 교육",
};

export default function RemindersAdminPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | sent | failed
  const [retrying, setRetrying] = useState(null);
  const [dispatching, setDispatching] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // ⚠️ 서버 API 경유 필수 — reminders_scheduled 는 RLS deny-all(service_role 전용)이라
  // 브라우저 직쿼리는 에러도 없이 영원히 빈 목록이었음(2026-07-02 전수 감사에서 소생).
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/reminders${qs}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "query_failed");
      setReminders(json.items ?? []);
    } catch (err) {
      console.error("[reminders page] fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // 수동 재발송 (failed → pending 으로 리셋)
  const handleRetry = async (id) => {
    setRetrying(id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`/api/admin/reminders/${id}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        await fetchReminders();
      } else {
        alert(`재발송 실패: ${json.error}`);
      }
    } catch (_err) {
      alert("재발송 중 오류가 발생했습니다");
    } finally {
      setRetrying(null);
    }
  };

  // 수동 디스패처 실행 — 어드민 인증 프록시 경유(CRON_SECRET 브라우저 입력 제거)
  const handleDispatch = async () => {
    setDispatching(true);
    setLastResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/admin/reminders/dispatch", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      setLastResult(json);
      await fetchReminders();
    } catch (_err) {
      setLastResult({ ok: false, error: "잠시 후 다시 시도해 주세요" });
    } finally {
      setDispatching(false);
    }
  };

  // 통계
  const stats = reminders.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리마인더 관리</h1>
          <p className="text-sm text-gray-500 mt-1">예약 30분 전 자동 알림 현황</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReminders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
          <button
            onClick={handleDispatch}
            disabled={dispatching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {dispatching ? "발송 중..." : "수동 실행"}
          </button>
        </div>
      </div>

      {/* 디스패처 결과 */}
      {lastResult && (
        <div
          className={`mb-4 p-3 rounded-lg border text-sm ${
            lastResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {lastResult.ok
            ? `✅ 실행 완료 — 확인: ${lastResult.checked}건, 발송: ${lastResult.sent}건, 실패: ${lastResult.failed}건`
            : `❌ 실행 오류: ${lastResult.error}`}
          {lastResult.errors?.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {lastResult.errors.map((e, i) => (
                <li key={i} className="text-xs">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={status} className={`p-3 rounded-lg border ${cfg.bg}`}>
              <div className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${cfg.color}`}>
                {stats[status] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-4 border-b">
        {["all", "pending", "sent", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f === "all" ? "전체" : STATUS_CONFIG[f]?.label ?? f}
            {f !== "all" && stats[f] ? ` (${stats[f]})` : ""}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          리마인더 없음
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left py-2 pr-3 font-medium">발송 예정 시각</th>
                <th className="text-left py-2 pr-3 font-medium">종류</th>
                <th className="text-left py-2 pr-3 font-medium">채널</th>
                <th className="text-left py-2 pr-3 font-medium">수신자</th>
                <th className="text-left py-2 pr-3 font-medium">역할</th>
                <th className="text-left py-2 pr-3 font-medium">상태</th>
                <th className="text-left py-2 pr-3 font-medium">시도</th>
                <th className="text-left py-2 font-medium">오류</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {reminders.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.cancelled;
                const Icon = cfg.icon;
                const isFailed = r.status === "failed";

                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-700">
                      {new Date(r.fire_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">
                      {TYPE_LABELS[r.reminder_type] ?? r.reminder_type ?? "—"}
                      {r.payload?.phase ? (
                        <span className="ml-1 text-[11px] text-gray-500">({r.payload.phase})</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {CHANNEL_LABELS[r.channel] ?? r.channel}
                    </td>
                    <td className="py-2 pr-3 text-gray-600 max-w-[160px] truncate">
                      {r.recipient_address
                        ? maskAddress(r.recipient_address)
                        : r.recipient_user_id
                        ? `user:${r.recipient_user_id.slice(0, 8)}…`
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 text-xs">
                      {r.payload?.role ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{r.attempts}</td>
                    <td className="py-2 pr-3 text-xs text-red-600 max-w-[200px] truncate">
                      {r.last_error ?? "—"}
                    </td>
                    <td className="py-2">
                      {isFailed && (
                        <button
                          onClick={() => handleRetry(r.id)}
                          disabled={retrying === r.id}
                          className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded hover:bg-amber-100 disabled:opacity-50"
                        >
                          {retrying === r.id ? "…" : "재발송"}
                        </button>
                      )}
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

function maskAddress(addr) {
  if (!addr) return "—";
  if (addr.includes("@")) {
    const [local, domain] = addr.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  // 전화번호
  return addr.replace(/(\+?\d{2,3})(\d{3,4})(\d{4})/, "$1****$3");
}
