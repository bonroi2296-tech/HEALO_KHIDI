"use client";

/**
 * 어드민: AI 대화·환자자료 뷰어
 *
 * AI 챗(/inquiry) 스레드를 코디네이터가 스레드별로 열어보고, 환자가 올린
 * 검사결과지·사진(첨부)을 확인하는 화면. 첨부/핸드오프 있는 스레드를 위로 정렬.
 * AI가 첨부 자료를 1차 정리(진료의뢰 패킷 + 1차 소견)하면, 의료진이 검수·확정/정정한다.
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Paperclip, FileText, Image as ImageIcon,
  Clock, RefreshCw, User, Bot, Headset,
  Stethoscope, CheckCircle2, Pencil, Send, AlertTriangle, X, Loader2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";

const supabase = createSupabaseBrowserClient();

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
          <div><span className="text-gray-400">환자</span> · {p.patient_summary || "—"}</div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">시급도</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${urg.cls}`}>{urg.label}</span>
          </div>
          <div className="sm:col-span-2"><span className="text-gray-400">상태</span> · {p.condition || "—"}</div>
          <div className="sm:col-span-2"><span className="text-gray-400">요청</span> · {p.request || "—"}</div>
          <div className="sm:col-span-2"><span className="text-gray-400">추천 진료과</span> · {p.suggested_specialty || "—"}</div>
        </div>

        {Array.isArray(p.missing_docs) && p.missing_docs.length > 0 && (
          <div>
            <span className="text-gray-400">필요한데 빠진 자료</span>
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
          <div className="text-[10px] text-gray-400">
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

export default function AdminChatPage() {
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // thread
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [onlyAttachments, setOnlyAttachments] = useState(false);
  // 진료의뢰 패킷 검수 상태
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
          // 첨부/핸드오프 우선 → 최신순
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

  const openThread = async (thread) => {
    setSelected(thread);
    setMessages([]);
    setLoadingMsgs(true);
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
    } catch (e) {
      toast.error("파일 열기 실패: " + (e.message || ""));
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
    } catch (e) {
      toast.error("검수 표시 실패: " + (e.message || ""));
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
    } catch (e) {
      toast.error("전송 실패: " + (e.message || ""));
    } finally {
      setSavingReview(false);
    }
  };

  const visibleThreads = onlyAttachments
    ? threads.filter((t) => t.metadata?.has_attachments)
    : threads;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-teal-600" /> AI 대화 · 환자자료
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            환자가 올린 검사결과지·사진을 AI가 1차 정리(소견)하고, 의료진이 검수·확정합니다. 첨부 스레드는 위로 정렬됩니다.
          </p>
        </div>
        <button
          onClick={fetchThreads}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={onlyAttachments}
          onChange={(e) => setOnlyAttachments(e.target.checked)}
          className="accent-teal-600"
        />
        <Paperclip size={14} /> 첨부 있는 대화만 보기
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 스레드 목록 */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" /> 불러오는 중...
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">대화가 없습니다.</div>
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
                      className={`w-full text-left px-4 py-3 transition ${active ? "bg-teal-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-gray-400 truncate">#{String(t.id).slice(0, 8)}</span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0">
                          <Clock size={11} /> {fmtTime(t.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.metadata?.language && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {String(t.metadata.language).toUpperCase()}
                          </span>
                        )}
                        {hasAtt && (
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Paperclip size={10} /> 자료
                          </span>
                        )}
                        {handoff && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Headset size={10} /> 검토요청
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{t.status}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 대화 상세 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl min-h-[50vh]">
          {!selected ? (
            <div className="flex items-center justify-center h-full py-24 text-sm text-gray-400">
              왼쪽에서 대화를 선택하세요.
            </div>
          ) : loadingMsgs ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" /> 대화 불러오는 중...
            </div>
          ) : (
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {messages.map((m) => {
                const isPatient = m.actor_type === "patient";
                const atts = Array.isArray(m.attachments) ? m.attachments : [];
                return (
                  <div key={m.id} className={`flex gap-2.5 ${isPatient ? "" : "flex-row-reverse"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${
                      isPatient ? "bg-gray-400" : m.actor_type === "admin" ? "bg-amber-500" : "bg-teal-600"
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
                      <div className="text-[10px] text-gray-400 mt-1 px-1">{fmtTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center py-16 text-sm text-gray-400">메시지가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
