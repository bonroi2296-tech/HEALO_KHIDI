"use client";

/**
 * 어드민: AI 대화·환자자료 뷰어
 *
 * AI 챗(/inquiry) 스레드를 코디네이터가 스레드별로 열어보고, 환자가 올린
 * 검사결과지·사진(첨부)을 확인하는 화면. 첨부/핸드오프 있는 스레드를 위로 정렬.
 * ⚠️ AI는 자료를 판독하지 않음 — 의료진/코디가 직접 검토 후 회신하는 흐름.
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Paperclip, FileText, Image as ImageIcon,
  Clock, RefreshCw, User, Bot, Headset,
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

export default function AdminChatPage() {
  const toast = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // thread
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [onlyAttachments, setOnlyAttachments] = useState(false);

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
            환자가 AI 챗에 올린 검사결과지·사진을 스레드별로 확인합니다. (AI는 판독하지 않음 — 의료진 검토용)
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
