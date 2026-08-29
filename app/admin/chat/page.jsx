"use client";

/**
 * 어드민: AI 대화·환자자료 뷰어 (검토 큐)
 *
 * AI 챗(/inquiry) 스레드를 코디가 검토하는 화면. 환자가 올린 검사결과지·사진(첨부)
 * 과 "상담사 연결(검토요청·hand_off)"을 처리한다. 검토요청·첨부 있는 스레드를 위로.
 * ⚠️ AI는 자료를 판독하지 않음 — 의료진/코디가 직접 검토 후 회신하는 흐름.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare, Paperclip, FileText, Image as ImageIcon,
  Clock, RefreshCw, User, Bot, Headset, Inbox, CheckCircle2, ArrowRight,
  Stethoscope, Pencil, Send, AlertTriangle, X, Loader2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { guessPatientTimezone, patientLocalTime } from "@/lib/chat/patientLocalTime";
import { scrollToTopOnNarrow } from "@/lib/a11y/prefersReducedMotion";
import { useDeepLinkParam } from "@/lib/hooks/useDeepLinkParam";

const supabase = createSupabaseBrowserClient();

// 환자 현지 시각 배지 — 새벽인 환자를 알림으로 깨우지 않게 답장 전에 보인다(2026-07-23 PO).
// 웹=브라우저 시간대(정확) / 왓츠앱=전화 국가번호 / 텔레그램=언어 기반 추정. 추정 불가면 숨김.
function LocalTimeBadge({ thread }) {
  const { tz, source } = guessPatientTimezone(thread);
  if (!tz) return null;
  const lt = patientLocalTime(tz);
  if (!lt) return null;
  const src = source === "browser" ? "브라우저 확인" : "추정";
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
        lt.night
          ? "text-indigo-700 bg-indigo-50 border-indigo-200"
          : "text-gray-500 bg-gray-50 border-gray-200"
      }`}
      title={`환자 현지 시각 (${src}: ${tz})${lt.night ? " — 심야(22~08시)라 지금 답장하면 알림으로 깨울 수 있어요" : ""}`}
    >
      {lt.night ? "🌙" : "🕓"} 현지 {lt.label}
      {lt.night ? " 심야" : ""}
    </span>
  );
}

function fmtTime(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("ko-KR", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const URGENCY_STYLE = {
  high: { label: "높음", cls: "text-red-700 bg-red-50 border-red-200" },
  medium: { label: "보통", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  low: { label: "낮음", cls: "text-gray-600 bg-gray-50 border-gray-200" },
};

// 진료의뢰 패킷 카드 — AI가 첨부 자료를 정리한 의료진용 요약 + 의사 검수 액션.
function TriagePacketCard({
  m, correcting, correctText, setCorrectText, saving,
  onMarkReviewed, onStartCorrect, onCancelCorrect, onSendCorrect,
}) {
  const tri = m.metadata?.triage || {};
  const p = tri.packet || {};
  const reviewed = !!tri.reviewed;
  const urg = URGENCY_STYLE[p.urgency] || URGENCY_STYLE.medium;
  const isCorrecting = correcting === m.id;

  return (
    <div className="mt-2 border border-teal-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-teal-50 border-b border-teal-100">
        <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
          <Stethoscope size={14} /> 진료의뢰 패킷 · AI 정리
        </span>
        {reviewed ? (
          <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <CheckCircle2 size={11} /> 검수완료
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <AlertTriangle size={11} /> 검수 대기
          </span>
        )}
      </div>

      <div className="p-3 space-y-2 text-xs text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
          <div><span className="text-gray-500">환자</span> · {p.patient_summary || "—"}</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">시급도</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${urg.cls}`}>{urg.label}</span>
          </div>
          <div className="sm:col-span-2"><span className="text-gray-500">상태</span> · {p.condition || "—"}</div>
          <div className="sm:col-span-2"><span className="text-gray-500">요청</span> · {p.request || "—"}</div>
          <div className="sm:col-span-2"><span className="text-gray-500">추천 진료과</span> · {p.suggested_specialty || "—"}</div>
        </div>

        {Array.isArray(p.missing_docs) && p.missing_docs.length > 0 && (
          <div>
            <span className="text-gray-500">필요한데 빠진 자료</span>
            <ul className="list-disc list-inside text-gray-600 mt-0.5">
              {p.missing_docs.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(p.red_flags) && p.red_flags.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
            <span className="text-amber-700 font-semibold flex items-center gap-1"><AlertTriangle size={11} /> 주의해서 볼 점</span>
            <ul className="list-disc list-inside text-amber-800 mt-0.5">
              {p.red_flags.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* 검수 액션 */}
      <div className="px-3 pb-3">
        {reviewed ? (
          <div className="text-[10px] text-gray-500">
            검수완료 {tri.reviewed_at ? `· ${fmtTime(tri.reviewed_at)}` : ""}
            {tri.review_note ? ` · 정정 발송됨` : ""}
          </div>
        ) : isCorrecting ? (
          <div className="space-y-2">
            <textarea
              value={correctText}
              onChange={(e) => setCorrectText(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="환자에게 보낼 정정된 소견을 적으세요. AI 초안을 다듬어 보내면 됩니다."
            />
            <div className="flex gap-2">
              <button
                onClick={() => onSendCorrect(m)}
                disabled={saving || !correctText.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} 환자에게 보내기
              </button>
              <button
                onClick={onCancelCorrect}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <X size={12} /> 취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onMarkReviewed(m)}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} 정확함 · 검수완료
            </button>
            <button
              onClick={() => onStartCorrect(m)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <Pencil size={12} /> 정정해서 환자에게 보내기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 검토 대기 시간 — 오래 기다린 검토요청을 눈에 띄게 (정렬 이유 노출용)
function ageLabel(s) {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}일 대기`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs >= 1) return `${hrs}시간 대기`;
  return "방금";
}

export default function AdminChatPage() {
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // thread
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState("all"); // all | review | attachments
  // 의사 검수(진료의뢰 패킷)
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
        toast.error(`목록 로딩 실패: ${json.error || "unknown"}`);
      }
    } catch (_e) {
      toast.error("목록 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, [getToken, toast]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  // 딥링크: 알림(상담 연결 요청·품질 경고)에서 ?thread=<id> 로 들어오면 그 대화를 바로 연다.
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
      else toast.error(`대화 로딩 실패: ${json.error || "unknown"}`);
    } catch (_e) {
      toast.error("대화 로딩 실패");
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
      toast.error("파일 열기 실패");
    }
  };

  // 패킷 검수완료 표시
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
      toast.success("검수완료로 표시했습니다.");
      await openThread(selected);
    } catch (_e) {
      toast.error("검수 표시 실패");
    } finally {
      setSavingReview(false);
    }
  };

  const startCorrect = (m) => { setCorrecting(m.id); setCorrectText(m.message_text || ""); };
  const cancelCorrect = () => { setCorrecting(null); setCorrectText(""); };

  // 의사 정정 소견을 환자에게(admin 메시지) 보내고 원본 패킷을 검수완료로 표시.
  const sendCorrect = async (m) => {
    if (!selected || !correctText.trim()) return;
    setSavingReview(true);
    try {
      const token = await getToken();
      const post = await fetch(`/api/admin/chat/threads/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({
          actor_type: "admin",
          message_text: correctText.trim(),
          metadata: { triage_correction_of: m.id },
        }),
      });
      const pj = await post.json();
      if (!pj.ok) throw new Error(pj.error || "send_fail");
      await fetch(`/api/admin/chat/threads/${selected.id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ messageId: m.id, reviewed: true, note: "corrected_and_sent" }),
      });
      toast.success("정정 소견을 환자에게 보냈습니다.");
      setCorrecting(null);
      setCorrectText("");
      await openThread(selected);
    } catch (_e) {
      toast.error("전송 실패");
    } finally {
      setSavingReview(false);
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
    { key: "all", label: "전체", n: counts.all, icon: Inbox },
    { key: "review", label: "검토요청", n: counts.review, icon: Headset },
    { key: "attachments", label: "자료 첨부", n: counts.attachments, icon: Paperclip },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare size={20} className="text-teal-600" /> AI 대화 · 환자자료
        </h1>
        <button
          onClick={fetchThreads}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        환자가 AI 챗에 올린 검사결과지·사진과 상담사 연결 요청을 검토합니다. (AI는 판독하지 않음 — 의료진 검토용)
      </p>

      {/* 할 일 요약 배너 — 들어오자마자 무엇을 할지 */}
      {!loading && (
        <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          counts.review > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-teal-50 border-teal-200 text-teal-900"
        }`}>
          {counts.review > 0 ? <Headset size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
          <span className="font-medium">
            {counts.review > 0
              ? `상담사 연결(검토) 대기 ${counts.review}건 — 아래 "검토요청" 탭부터 처리하세요.`
              : "검토 대기 없음 — 모든 상담사 연결 요청을 처리했습니다."}
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
              <RefreshCw size={18} className="animate-spin mr-2" /> 불러오는 중...
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">
              {filter === "review" ? "검토 대기 중인 요청이 없습니다." : filter === "attachments" ? "첨부 자료가 있는 대화가 없습니다." : "대화가 없습니다."}
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
                          <Clock size={11} /> {fmtTime(t.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.channel === "telegram" && (
                          <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                            ✈️ Telegram
                          </span>
                        )}
                        {t.channel === "whatsapp" && (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                            💬 WhatsApp
                          </span>
                        )}
                        {t.metadata?.language && (
                          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {String(t.metadata.language).toUpperCase()}
                          </span>
                        )}
                        <LocalTimeBadge thread={t} />
                        {handoff && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Headset size={10} /> 검토요청
                          </span>
                        )}
                        {hasAtt && (
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Paperclip size={10} /> 자료
                          </span>
                        )}
                        {handoff && (
                          <span className="text-[10px] font-semibold text-amber-600 ml-auto">{ageLabel(t.updated_at)}</span>
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
        {/* 상세 칸은 폰에서도 숨기지 않는다 — 아무것도 안 골랐을 땐 여기에 「검토 대기 큐」가
            그려지고, 그건 폰으로 분류하는 사람이 제일 먼저 봐야 할 것이다(2026-08-28 리뷰 지적). */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl min-h-[50vh]">
          {!selected ? (
            // 빈 화면 → 검토 대기 큐로 공백 활용
            <div className="p-5 h-full">
              {reviewQueue.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Headset size={18} className="text-amber-600" />
                    <h2 className="text-lg font-bold text-gray-900">검토 대기 {reviewQueue.length}건</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">오래 기다린 순 — 위에서부터 클릭해 확인·회신하세요.</p>
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
                                  <Paperclip size={10} /> 자료
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock size={11} /> {fmtTime(t.updated_at)} · {ageLabel(t.updated_at)}
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
                  <p className="text-gray-600 font-medium">검토 대기 없음</p>
                  <p className="text-sm text-gray-500 mt-1">왼쪽 목록에서 대화를 골라 내용을 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          ) : loadingMsgs ? (
            <div className="flex items-center justify-center py-24 text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2" /> 대화 불러오는 중...
            </div>
          ) : (
            <>
              {/* 선택된 스레드 헤더 */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-mono text-gray-600">#{String(selected.id).slice(0, 8)}</span>
                  {selected.channel === "telegram" && (
                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded" title="이 스레드의 답장은 환자의 텔레그램으로 전송됩니다">
                      ✈️ Telegram 발신
                    </span>
                  )}
                  {selected.channel === "whatsapp" && (
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded" title="이 스레드의 답장은 환자의 왓츠앱으로 전송됩니다 (마지막 환자 메시지 후 24시간이 지나면 전송이 막힐 수 있어요)">
                      💬 WhatsApp 발신
                    </span>
                  )}
                  {selected.metadata?.language && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                      {String(selected.metadata.language).toUpperCase()}
                    </span>
                  )}
                  <LocalTimeBadge thread={selected} />
                  {selected.metadata?.hand_off_requested && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Headset size={10} /> 검토요청
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-gray-600 hover:text-gray-800 shrink-0 px-2.5 py-2 -my-1 rounded-lg border border-gray-200 lg:border-transparent hover:bg-gray-50"
                >
                  ← 목록
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
                        {/* 진료의뢰 패킷 + 의사 검수 (첨부 자료를 AI가 정리한 메시지에만) */}
                        {!isPatient && m.metadata?.triage?.packet && (
                          <TriagePacketCard
                            m={m}
                            correcting={correcting}
                            correctText={correctText}
                            setCorrectText={setCorrectText}
                            saving={savingReview}
                            onMarkReviewed={markReviewed}
                            onStartCorrect={startCorrect}
                            onCancelCorrect={cancelCorrect}
                            onSendCorrect={sendCorrect}
                          />
                        )}
                        {/* 메신저 발신 실패 표시 — window_expired 는 왓츠앱 24시간 창 만료(재발신 불가, 환자가 다시 말 걸어야 열림) */}
                        {!isPatient && m.metadata?.delivery && m.metadata.delivery !== "sent" && (
                          <div className="text-[10px] font-semibold text-red-600 mt-1 px-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {m.metadata.delivery === "window_expired"
                              ? "미전달 — 24시간 창 만료 (환자가 다시 메시지를 보내면 답장 가능)"
                              : "미전달 — 메신저 발신 실패"}
                          </div>
                        )}
                        <div className="text-[10px] text-gray-500 mt-1 px-1">{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center py-16 text-sm text-gray-500">메시지가 없습니다.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
