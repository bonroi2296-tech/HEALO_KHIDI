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
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";

const supabase = createSupabaseBrowserClient();

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
                on ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
        {/* 스레드 목록 */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" /> 불러오는 중...
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
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
                        {!handoff && <span className="text-[10px] text-gray-400">{t.status}</span>}
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
            // 빈 화면 → 검토 대기 큐로 공백 활용
            <div className="p-5 h-full">
              {reviewQueue.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Headset size={18} className="text-amber-600" />
                    <h2 className="font-bold text-gray-900">검토 대기 {reviewQueue.length}건</h2>
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
                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {String(t.metadata.language).toUpperCase()}
                                </span>
                              )}
                              {t.metadata?.has_attachments && (
                                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Paperclip size={10} /> 자료
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
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
                  <p className="text-sm text-gray-400 mt-1">왼쪽 목록에서 대화를 골라 내용을 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          ) : loadingMsgs ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" /> 대화 불러오는 중...
            </div>
          ) : (
            <>
              {/* 선택된 스레드 헤더 */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-mono text-gray-600">#{String(selected.id).slice(0, 8)}</span>
                  {selected.metadata?.language && (
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {String(selected.metadata.language).toUpperCase()}
                    </span>
                  )}
                  {selected.metadata?.hand_off_requested && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Headset size={10} /> 검토요청
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
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
                        <div className="text-[10px] text-gray-400 mt-1 px-1">{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center py-16 text-sm text-gray-400">메시지가 없습니다.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
