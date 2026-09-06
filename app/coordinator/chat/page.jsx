"use client";

/**
 * 코디네이터: AI 대화·환자자료 뷰어 (읽기전용)
 *
 * AI 챗(/inquiry) 스레드를 코디가 확인하는 화면 — AI 상담 리드 모니터.
 * 환자가 올린 검사결과지·사진(첨부)과 "상담사 연결(검토요청·hand_off)" 스레드를 본다.
 * 데이터 API는 /api/admin/chat/* (GET은 staff 허용) 재사용.
 * ⚠️ 읽기전용 — 진료의뢰 패킷 「검수완료/정정 발송」 같은 쓰기 액션은 의사·어드민(/admin/chat)에서만.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare, Paperclip, FileText, Image as ImageIcon, Clock, RefreshCw, User, Bot, Headset, Inbox, CheckCircle2, ArrowRight, Stethoscope, AlertTriangle, Loader2, Send, Pencil, X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { scrollToTopOnNarrow } from "@/lib/a11y/prefersReducedMotion";
import { useDeepLinkParam } from "@/lib/hooks/useDeepLinkParam";
import { usePortalContext } from "../../_components/PortalGate";

const supabase = createSupabaseBrowserClient();

// dateLoc = 현재 언어 로케일(BCP47). ko-KR 하드코딩 대신 언어별 표기.
function fmtTime(s, dateLoc = "en-US") {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString(dateLoc, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return s;
  }
}

// 시급도 스타일(색은 언어 무관). 라벨은 컴포넌트에서 L로 해석.
const URGENCY_STYLE = {
  high: { labelKey: "chUrgencyHigh", cls: "text-red-700 bg-red-50 border-red-200" },
  medium: { labelKey: "chUrgencyMedium", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  low: { labelKey: "chUrgencyLow", cls: "text-gray-600 bg-gray-50 border-gray-200" },
};

// 진료의뢰 패킷 카드 — AI가 첨부 자료를 정리한 요약 + 의료진 검수.
// 코디는 읽기만, 관리자(canReview)는 검수완료·정정 발송까지. 2026-09-07 어드민 채팅 화면을 이 화면으로 합쳤다
// (리뉴얼 7단계: 형태③ «API 만 공유, 화면 별도» → 형태① 재수출). 권한은 API(requireAdminAuth)가 지킨다.
function TriagePacketCard({ m, L, dateLoc, canReview, correcting, correctText, setCorrectText, saving, onMarkReviewed, onStartCorrect, onCancelCorrect, onSendCorrect }) {
  const tri = m.metadata?.triage || {};
  const p = tri.packet || {};
  const reviewed = !!tri.reviewed;
  const urg = URGENCY_STYLE[p.urgency] || URGENCY_STYLE.medium;
  const isCorrecting = correcting === m.id;

  return (
    <div className="mt-2 border border-teal-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-teal-50 border-b border-teal-100">
        <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
          <Stethoscope size={14} /> {L.chPacketTitle}
        </span>
        {reviewed ? (
          <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <CheckCircle2 size={11} /> {L.chReviewed}
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <AlertTriangle size={11} /> {L.chReviewPending}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2 text-xs text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
          <div><span className="text-gray-500">{L.fieldPatient}</span> · {p.patient_summary || "—"}</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">{L.chUrgency}</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${urg.cls}`}>{L[urg.labelKey]}</span>
          </div>
          <div className="sm:col-span-2"><span className="text-gray-500">{L.chCondition}</span> · {p.condition || "—"}</div>
          <div className="sm:col-span-2"><span className="text-gray-500">{L.chRequest}</span> · {p.request || "—"}</div>
          <div className="sm:col-span-2"><span className="text-gray-500">{L.chSuggestedSpecialty}</span> · {p.suggested_specialty || "—"}</div>
        </div>

        {Array.isArray(p.missing_docs) && p.missing_docs.length > 0 && (
          <div>
            <span className="text-gray-500">{L.chMissingDocs}</span>
            <ul className="list-disc list-inside text-gray-600 mt-0.5">
              {p.missing_docs.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(p.red_flags) && p.red_flags.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
            <span className="text-amber-700 font-semibold flex items-center gap-1"><AlertTriangle size={11} /> {L.chRedFlags}</span>
            <ul className="list-disc list-inside text-amber-800 mt-0.5">
              {p.red_flags.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* 검수 상태 — 코디는 읽기, 관리자는 단추 */}
      <div className="px-3 pb-3">
        {reviewed ? (
          <div className="text-[10px] text-gray-500">
            {L.chReviewed} {tri.reviewed_at ? `· ${fmtTime(tri.reviewed_at, dateLoc)}` : ""}{tri.review_note ? ` · ${L.chCorrectionSent}` : ""}
          </div>
        ) : !canReview ? (
          <div className="text-[10px] text-gray-500">{L.chReviewWaitingNote}</div>
        ) : isCorrecting ? (
          <div className="space-y-2">
            <textarea
              value={correctText}
              onChange={(e) => setCorrectText(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder={L.chCorrectPlaceholder}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSendCorrect(m)}
                disabled={saving || !correctText.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} {L.chSendToPatient}
              </button>
              <button type="button" onClick={onCancelCorrect} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <X size={12} /> {L.chCancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMarkReviewed(m)}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} {L.chMarkReviewed}
            </button>
            <button type="button" onClick={() => onStartCorrect(m)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              <Pencil size={12} /> {L.chStartCorrect}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 검토 대기 시간 — 오래 기다린 검토요청을 눈에 띄게 (정렬 이유 노출용)
function ageLabel(s, L) {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return L.chWaitDays.replace("{n}", days);
  const hrs = Math.floor(diff / 3600000);
  if (hrs >= 1) return L.chWaitHours.replace("{n}", hrs);
  return L.chWaitJustNow;
}

export default function CoordinatorChatPage() {
  const toast = useToast();
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // thread
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState("all"); // all | review | attachments
  // 관리자가 이 화면(또는 재수출된 /admin/chat)을 열었나 — 검수·정정 단추는 관리자만. API 도 requireAdminAuth.
  const me = usePortalContext();
  const canReview = !!me?.isAdmin;
  const [correcting, setCorrecting] = useState(null); // 정정 중인 messageId
  const [correctText, setCorrectText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }, []);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/admin/chat/threads?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) {
        const list = (json.threads || []).slice().sort((a, b) => {
          // 검토요청·첨부 우선 → 그 안에서 최신순
          const aw = (a.metadata?.has_attachments ? 2 : 0) + (a.metadata?.hand_off_requested ? 1 : 0);
          const bw = (b.metadata?.has_attachments ? 2 : 0) + (b.metadata?.hand_off_requested ? 1 : 0);
          if (aw !== bw) return bw - aw;
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
        setThreads(list);
      } else {
        toast.error(`${L.chLoadListFail}: ${json.error || "unknown"}`);
      }
    } catch (_e) {
      toast.error(L.chLoadListFail);
    } finally {
      setLoading(false);
    }
  }, [getToken, toast, L]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  // 딥링크: 알림(품질 경고 등)에서 ?thread=<id> 로 들어오면 그 대화를 바로 연다.
  // 목록(최근 100개)에 없어도 id 만으로 메시지는 열린다.
  useDeepLinkParam("thread", (id) => openThread(threads.find((t) => t.id === id) || { id }), {
    ready: !loading,
  });

  const openThread = async (thread) => {
    setSelected(thread);
    setMessages([]);
    setLoadingMsgs(true);
    scrollToTopOnNarrow(); // 폰: 목록을 한참 내려서 눌렀어도 상세는 맨 위에 그려진다
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/chat/threads/${thread.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) setMessages(json.messages || []);
      else toast.error(`${L.chLoadThreadFail}: ${json.error || "unknown"}`);
    } catch (_e) {
      toast.error(L.chLoadThreadFail);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const openFile = async (path) => {
    try {
      const token = await getToken();
      const res = await fetch("/api/attachments/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ path }),
      });
      const json = await res.json();
      if (!json.ok || !json.signedUrl) throw new Error(json.error || "sign_failed");
      window.open(json.signedUrl, "_blank", "noopener,noreferrer");
    } catch (_e) {
      toast.error(L.chOpenFileFail);
    }
  };

  // 카운트 (요약 바 + 탭 뱃지)
  const counts = useMemo(() => ({
    all: threads.length,
    review: threads.filter((t) => t.metadata?.hand_off_requested).length,
    attachments: threads.filter((t) => t.metadata?.has_attachments).length,
  }), [threads]);

  // 검토 대기 목록 (빈 화면 가이드용 — 오래 기다린 순)
  const reviewQueue = useMemo(
    () => threads
      .filter((t) => t.metadata?.hand_off_requested)
      .slice()
      .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at)),
    [threads]
  );

  const visibleThreads = useMemo(() => {
    if (filter === "review") return threads.filter((t) => t.metadata?.hand_off_requested);
    if (filter === "attachments") return threads.filter((t) => t.metadata?.has_attachments);
    return threads;
  }, [threads, filter]);

  const tabs = [
    { key: "all", label: L.all, n: counts.all, icon: Inbox },
    { key: "review", label: L.chTabReview, n: counts.review, icon: Headset },
    { key: "attachments", label: L.chTabAttachments, n: counts.attachments, icon: Paperclip },
  ];

  // ── 검수(관리자) — 어드민 채팅 화면에서 옮겨옴(2026-09-07) ──
  const markReviewed = async (m) => {
    if (!selected) return;
    setSavingReview(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/chat/threads/${selected.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ messageId: m.id, reviewed: true }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "fail");
      toast.success(L.chToastReviewed);
      await openThread(selected);
    } catch {
      toast.error(L.chToastReviewFail);
    } finally {
      setSavingReview(false);
    }
  };
  const startCorrect = (m) => { setCorrecting(m.id); setCorrectText(m.message_text || ""); };
  const cancelCorrect = () => { setCorrecting(null); setCorrectText(""); };
  // 정정 소견을 환자에게(admin 메시지) 보내고 원본 패킷을 검수완료로 표시.
  const sendCorrect = async (m) => {
    if (!selected || !correctText.trim()) return;
    setSavingReview(true);
    try {
      const token = await getToken();
      const post = await fetch(`/api/admin/chat/threads/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ actor_type: "admin", message_text: correctText.trim(), metadata: { triage_correction_of: m.id } }),
      });
      const pj = await post.json();
      if (!pj.ok) throw new Error(pj.error || "send_fail");
      await fetch(`/api/admin/chat/threads/${selected.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ messageId: m.id, reviewed: true, note: "corrected_and_sent" }),
      });
      toast.success(L.chToastCorrectionSent);
      setCorrecting(null);
      setCorrectText("");
      await openThread(selected);
    } catch {
      toast.error(L.chToastSendFail);
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare size={20} className="text-teal-600" /> {L.chTitle}
        </h1>
        <button
          onClick={fetchThreads}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} /> {L.refresh}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {L.chSubtitle}
      </p>

      {/* 할 일 요약 배너 — 들어오자마자 무엇을 할지 */}
      {!loading && (
        <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          counts.review > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-teal-50 border-teal-200 text-teal-900"
        }`}>
          {counts.review > 0 ? <Headset size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
          <span className="font-medium">
            {counts.review > 0
              ? L.chBannerPending.replace("{n}", counts.review)
              : L.chBannerClear}
          </span>
        </div>
      )}

      {/* 탭 (필터 + 카운트) */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition ${
                on ? "bg-teal-700 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={14} /> {t.label}
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                on ? "bg-white/20" : t.key === "review" && t.n > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
              }`}>{t.n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 스레드 목록
            폰(1단 배치)에선 대화를 고르면 목록을 접고 상세만 보인다. 예전엔 상세가 목록 «아래»에
            그려져서, 눌러도 첫 화면이 그대로라 「조회가 안 된다」로 보였다 (2026-08-28 PO 제보). */}
        <div className={`lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden ${
          selected ? "hidden lg:block" : ""
        }`}>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2" /> {L.chLoading}
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">
              {filter === "review" ? L.chEmptyReview : filter === "attachments" ? L.chEmptyAttachments : L.chEmptyThreads}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {visibleThreads.map((t) => {
                const hasAtt = !!t.metadata?.has_attachments;
                const handoff = !!t.metadata?.hand_off_requested;
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => openThread(t)}
                      className={`w-full text-left px-4 py-3 transition ${active ? "bg-teal-50" : handoff ? "hover:bg-amber-50/60" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-gray-500 truncate">#{String(t.id).slice(0, 8)}</span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1 shrink-0">
                          <Clock size={11} /> {fmtTime(t.updated_at, dateLoc)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.metadata?.language && (
                          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {String(t.metadata.language).toUpperCase()}
                          </span>
                        )}
                        {handoff && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Headset size={10} /> {L.chBadgeReview}
                          </span>
                        )}
                        {hasAtt && (
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Paperclip size={10} /> {L.chBadgeAttachment}
                          </span>
                        )}
                        {handoff && (
                          <span className="text-[10px] font-semibold text-amber-600 ml-auto">{ageLabel(t.updated_at, L)}</span>
                        )}
                        {!handoff && <span className="text-[10px] text-gray-500">{t.status}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 대화 상세 */}
        {/* 상세 칸은 폰에서도 숨기지 않는다 — 아무것도 안 골랐을 땐 「검토 대기 큐」 자리다. */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl min-h-[50vh]">
          {!selected ? (
            // 빈 화면 → 검토 대기 큐로 공백 활용
            <div className="p-5 h-full">
              {reviewQueue.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Headset size={18} className="text-amber-600" />
                    <h2 className="text-lg font-bold text-gray-900">{L.chReviewQueueTitle.replace("{n}", reviewQueue.length)}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{L.chReviewQueueHint}</p>
                  <ul className="space-y-2">
                    {reviewQueue.map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() => openThread(t)}
                          className="w-full flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 px-4 py-3 text-left transition"
                        >
                          <Headset size={16} className="text-amber-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500">#{String(t.id).slice(0, 8)}</span>
                              {t.metadata?.language && (
                                <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {String(t.metadata.language).toUpperCase()}
                                </span>
                              )}
                              {t.metadata?.has_attachments && (
                                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Paperclip size={10} /> {L.chBadgeAttachment}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock size={11} /> {fmtTime(t.updated_at, dateLoc)} · {ageLabel(t.updated_at, L)}
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-amber-400 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                  <CheckCircle2 size={40} className="text-teal-400 mb-3" />
                  <p className="text-gray-600 font-medium">{L.chNoReviewPending}</p>
                  <p className="text-sm text-gray-500 mt-1">{L.chNoReviewHint}</p>
                </div>
              )}
            </div>
          ) : loadingMsgs ? (
            <div className="flex items-center justify-center py-24 text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2" /> {L.chLoadingThread}
            </div>
          ) : (
            <>
              {/* 선택된 스레드 헤더 */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-mono text-gray-600">#{String(selected.id).slice(0, 8)}</span>
                  {selected.metadata?.language && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                      {String(selected.metadata.language).toUpperCase()}
                    </span>
                  )}
                  {selected.metadata?.hand_off_requested && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Headset size={10} /> {L.chBadgeReview}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-gray-600 hover:text-gray-800 shrink-0 px-2.5 py-2 -my-1 rounded-lg border border-gray-200 lg:border-transparent hover:bg-gray-50"
                >
                  ← {L.chBackToList}
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[64vh] overflow-y-auto">
                {messages.map((m) => {
                  const isPatient = m.actor_type === "patient";
                  const atts = Array.isArray(m.attachments) ? m.attachments : [];
                  return (
                    <div key={m.id} className={`flex gap-2.5 ${isPatient ? "" : "flex-row-reverse"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${
                        isPatient ? "bg-gray-600" : m.actor_type === "admin" ? "bg-amber-700" : "bg-teal-700"
                      }`}>
                        {isPatient ? <User size={14} /> : m.actor_type === "admin" ? <Headset size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`max-w-[80%] ${isPatient ? "" : "items-end"}`}>
                        <div className={`p-3 rounded-2xl text-sm border ${
                          isPatient ? "bg-gray-50 border-gray-100" : "bg-teal-50 border-teal-100"
                        }`}>
                          {m.message_text && <p className="whitespace-pre-wrap text-gray-800">{m.message_text}</p>}
                          {atts.length > 0 && (
                            <div className={`flex flex-col gap-1.5 ${m.message_text ? "mt-2" : ""}`}>
                              {atts.map((f, i) => {
                                const isImg = (f.type || "").startsWith("image/");
                                return (
                                  <button
                                    key={i}
                                    onClick={() => openFile(f.path)}
                                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs bg-white border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition text-left"
                                  >
                                    {isImg ? <ImageIcon size={14} className="text-teal-600 shrink-0" /> : <FileText size={14} className="text-teal-600 shrink-0" />}
                                    <span className="truncate max-w-[220px] text-gray-700">{f.name || f.path}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* 진료의뢰 패킷 — 코디는 읽기, 관리자는 검수·정정 */}
                        {!isPatient && m.metadata?.triage?.packet && (
                          <TriagePacketCard
                            m={m} L={L} dateLoc={dateLoc}
                            canReview={canReview} correcting={correcting} correctText={correctText} setCorrectText={setCorrectText} saving={savingReview}
                            onMarkReviewed={markReviewed} onStartCorrect={startCorrect} onCancelCorrect={cancelCorrect} onSendCorrect={sendCorrect}
                          />
                        )}
                        <div className="text-[10px] text-gray-500 mt-1 px-1">{fmtTime(m.created_at, dateLoc)}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center py-16 text-sm text-gray-500">{L.chNoMessages}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
