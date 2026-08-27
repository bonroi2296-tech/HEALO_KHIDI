"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageSquare } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { t, dateLocale } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";

// DB actor_type 코드 → 표시 라벨 키(중앙 사전). 코드값은 서버/DB 비교용이라 그대로 두고
// 라벨만 t() 경유. 알 수 없는 actor_type 은 기존과 동일하게 system 라벨로 폴백.
const ACTOR_LABEL_KEYS = {
  user: "patientMessages.you",
  bot: "patientMessages.ai",
  admin: "patientMessages.admin",
  coordinator: "patientMessages.coordinator",
  system: "patientMessages.system",
};

export default function MessagesClient() {
  const lang = useLang();
  const heroItalic = t("patientMessages.heroTitleItalic", lang);

  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);

  // chat_threads/chat_messages 는 service_role 전용 RLS → 서버 API 경유 필수
  async function getAccessToken() {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  // Load threads on mount
  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);

      try {
        const res = await fetch("/api/portal/threads", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await res.json();
        setThreads(result.ok ? result.threads || [] : []);
      } catch {
        setThreads([]);
      }
      setLoading(false);
    })();
  }, []);

  // Load messages when thread selected (+5초 폴링 — RLS상 realtime 구독 불가)
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;

    async function loadMessages() {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`/api/portal/threads/${selectedId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled && result.ok) {
          const server = result.messages || [];
          // id 병합: 방금 낙관적으로 보낸(아직 서버 목록에 안 뜬) 메시지가 폴링 전체교체에
          // 깜빡 사라졌다 다시 뜨는 것(전송 실패처럼 보임) 방지. 서버가 따라잡으면 dedupe 됨.
          setMessages((prev) => {
            const ids = new Set(server.map((m) => m.id));
            return [...server, ...prev.filter((m) => !ids.has(m.id))];
          });
        }
      } catch {
        /* 폴링 실패는 무시 (다음 주기에 재시도) */
      }
    }

    loadMessages();
    // 탭이 안 보이는 동안엔 건너뛴다. 안 그러면 열어둔 채 방치한 탭이 하루 종일 5초마다 DB를
    // 두드린다(2026-07-24 상담방 탭이 같은 이유로 3시간 요청의 72%를 만들어 IO 예산을 태움,
    // POSTMORTEMS #120). 탭이 다시 보이면 다음 tick(최대 5초)에 자동으로 따라잡는다.
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMessages();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: scrollBehavior() });
  }, [messages]);

  if (!loading && !user) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-6" aria-label={t("patientMessages.heroTitle", lang)}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("patientMessages.heroTitle", lang)}{heroItalic ? ` ${heroItalic}` : ""}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t("patientMessages.heroEyebrow", lang)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 md:p-12 text-center">
          <p className="text-gray-600 mb-6">{t("patientMessages.loginRequired", lang)}</p>
          <Link
            href="/login"
            className="inline-block bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition-all duration-200"
          >
            {t("patientMessages.signIn", lang)}
          </Link>
        </div>
      </main>
    );
  }

  const selectedThread = threads.find((th) => th.id === selectedId);

  async function sendMessage() {
    if (!draft.trim() || !selectedId || !user || sending) return;
    setSending(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/portal/threads/${selectedId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.ok && result.message) {
        setMessages((m) => [...m, result.message]);
        setDraft("");
      }
    } catch {
      /* 전송 실패 — draft 유지해서 재시도 가능 */
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6" aria-label={t("patientMessages.heroTitle", lang)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("patientMessages.heroTitle", lang)}{heroItalic ? ` ${heroItalic}` : ""}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t("patientMessages.heroEyebrow", lang)}</p>
      </div>

      {/* 모바일에서는 목록↔대화를 한 화면씩 보여준다(예전 <style> 태그 토글을 클래스 조건으로 대체). */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] min-h-[600px]">
        {/* Thread list */}
        <aside
          className={`md:border-r border-gray-200 py-4 overflow-y-auto ${selectedId ? "hidden md:block" : "block"}`}
        >
          <div className="px-5 pb-3 text-xs font-bold text-gray-500">
            {t("patientMessages.threadsTitle", lang)}
          </div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-gray-500">{t("patientMessages.loading", lang)}</div>
          ) : threads.length === 0 ? (
            <div className="px-5 py-6">
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{t("patientMessages.noThreads", lang)}</p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/patient/chat"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                >
                  {t("patientMessages.startChat", lang)} <ArrowRight size={14} />
                </Link>
                <Link
                  href="/inquiry"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                >
                  {t("patientMessages.startInquiry", lang)} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            threads.map((th) => (
              <ThreadRow
                key={th.id}
                thread={th}
                active={selectedId === th.id}
                onClick={() => setSelectedId(th.id)}
                lang={lang}
              />
            ))
          )}
        </aside>

        {/* Conversation */}
        <div className={`flex-col min-h-[600px] ${selectedId ? "flex" : "hidden md:flex"}`}>
            {!selectedThread ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                {threads.length > 0 && (
                  <>
                    <MessageSquare size={28} className="text-gray-500 mb-3" />
                    <p className="text-gray-600">{t("patientMessages.selectConversation", lang)}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedId(null)}
                      aria-label={t("patientMessages.back", lang)}
                      className="md:hidden shrink-0 p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-all duration-200"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{t("patientMessages.threadTitle", lang)}</div>
                      <div className="text-base font-bold text-gray-900 truncate">
                        {selectedThread.subject || t("patientMessages.conversationFallback", lang)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      selectedThread.status === "resolved"
                        ? "bg-gray-100 text-gray-700 border-gray-200"
                        : "bg-teal-50 text-teal-700 border-teal-100"
                    }`}
                  >
                    {selectedThread.status === "resolved" ? t("patientMessages.resolved", lang) : t("patientMessages.open", lang)}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 px-5 py-5 overflow-y-auto bg-white">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} user={user} lang={lang} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="pb-safe-area px-5 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={t("patientMessages.typePlaceholder", lang)}
                      aria-label={t("patientMessages.typePlaceholder", lang)}
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      className="shrink-0 bg-teal-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {sending ? "…" : t("patientMessages.send", lang)}
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>
    </main>
  );
}

function ThreadRow({ thread, active, onClick, lang }) {
  const subject = thread.subject || t("patientMessages.conversationFallback", lang);
  return (
    <button
      onClick={onClick}
      data-testid="thread-row"
      aria-current={active ? "true" : undefined}
      className={`block w-full text-left px-5 py-4 border-b border-gray-100 transition-all duration-200 ${
        active ? "bg-teal-50" : "hover:bg-gray-50"
      }`}
    >
      <div className={`text-sm font-semibold truncate ${active ? "text-teal-800" : "text-gray-900"}`}>
        {subject}
      </div>
      <div className="text-xs text-gray-500 tabular-nums mt-0.5">
        {new Date(thread.updated_at).toLocaleDateString(dateLocale(lang))}
      </div>
    </button>
  );
}

function MessageBubble({ message, user, lang }) {
  const isMine = message.actor_type === "user" && message.actor_id === user?.id;
  const who = t(ACTOR_LABEL_KEYS[message.actor_type] || ACTOR_LABEL_KEYS.system, lang);

  return (
    <div className={`flex mb-4 ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] md:max-w-[70%] ${isMine ? "text-right" : "text-left"}`}>
        <div className="text-xs text-gray-500 mb-1.5">
          {who} · <span className="tabular-nums">{new Date(message.created_at).toLocaleString(dateLocale(lang))}</span>
        </div>
        <div
          className={`inline-block px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words text-left ${
            isMine ? "bg-teal-700 text-white" : "bg-gray-50 text-gray-900 border border-gray-200"
          }`}
        >
          {message.message_text}
        </div>
      </div>
    </div>
  );
}
