"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Eyebrow, Rule, ButtonGold, LinkArrow, Chip } from "../../../components/healo/Primitives";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!loading && !user) {
    return (
      <main style={{ maxWidth: 1240, margin: "0 auto", paddingTop: 64 }}>
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e" }}>{t("patientMessages.heroEyebrow", lang)}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginTop: 4 }}>{t("patientMessages.heroTitle", lang)}{heroItalic ? ` ${heroItalic}` : ""}</h1>
        </div>
        <div style={{ padding: "72px 24px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--fg-on-light-3)",
              marginBottom: 24,
            }}
          >
            {t("patientMessages.loginRequired", lang)}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>{t("patientMessages.signIn", lang)}</ButtonGold>
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
    <main style={{ maxWidth: 1240, margin: "0 auto", paddingTop: 64 }}>
      <div style={{ padding: "24px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f766e" }}>{t("patientMessages.heroEyebrow", lang)}</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginTop: 4 }}>{t("patientMessages.heroTitle", lang)}{heroItalic ? ` ${heroItalic}` : ""}</h1>
      </div>
      <section style={{ padding: "48px 24px 96px" }}>
        <div
          className="healo-msg-grid"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
            gap: 32,
            minHeight: 600,
            border: "1px solid var(--gold-tint)",
            background: "var(--paper)",
          }}
        >
          {/* Thread list */}
          <aside
            className="healo-msg-threads"
            style={{
              borderRight: "1px solid var(--cream-2)",
              padding: "24px 0",
              overflowY: "auto",
              display: selectedId && "none-mobile",
            }}
          >
            <div style={{ padding: "0 24px 16px" }}>
              <Eyebrow tone="muted">{t("patientMessages.threadsTitle", lang)}</Eyebrow>
            </div>
            {loading ? (
              <div style={{ padding: "24px", color: "var(--fg-on-light-3)", fontStyle: "italic" }}>
                {t("patientMessages.loading", lang)}
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: "24px" }}>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--fg-on-light-3)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 24,
                  }}
                >
                  {t("patientMessages.noThreads", lang)}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Link href="/patient/chat" style={{ textDecoration: "none" }}>
                    <LinkArrow>{t("patientMessages.startChat", lang)} →</LinkArrow>
                  </Link>
                  <Link href="/intake" style={{ textDecoration: "none" }}>
                    <LinkArrow>{t("patientMessages.startInquiry", lang)} →</LinkArrow>
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
          <div
            className="healo-msg-conversation"
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 600,
            }}
          >
            {!selectedThread ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 48,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--fg-on-light-4)",
                    fontSize: 17,
                  }}
                >
                  {threads.length > 0 ? t("patientMessages.selectConversation", lang) : ""}
                </p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div
                  style={{
                    padding: "20px 32px",
                    borderBottom: "1px solid var(--cream-2)",
                    background: "var(--cream-0)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Eyebrow tone="muted">{t("patientMessages.threadTitle", lang)}</Eyebrow>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--fg-on-light-1)",
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedThread.subject || t("patientMessages.conversationFallback", lang)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Chip tone={selectedThread.status === "resolved" ? "success" : "gold"}>
                      {selectedThread.status === "resolved" ? t("patientMessages.resolved", lang) : t("patientMessages.open", lang)}
                    </Chip>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="healo-msg-back"
                      style={{
                        display: "none",
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "var(--fg-on-light-3)",
                      }}
                    >
                      {t("patientMessages.back", lang)}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    padding: "24px 32px",
                    overflowY: "auto",
                    background: "var(--paper)",
                  }}
                >
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} user={user} lang={lang} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div
                  className="healo-safe-bottom"
                  style={{
                    padding: "16px 32px 20px",
                    borderTop: "1px solid var(--cream-2)",
                    background: "var(--cream-0)",
                    position: "sticky",
                    bottom: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
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
                      rows={2}
                      style={{
                        flex: 1,
                        resize: "none",
                        border: 0,
                        borderBottom: "1px solid var(--fg-on-light-4)",
                        background: "transparent",
                        padding: "10px 0",
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        color: "var(--fg-on-light-1)",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--gold-0)")}
                      onBlur={(e) => (e.currentTarget.style.borderBottomColor = "var(--fg-on-light-4)")}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending}
                      style={{
                        background: "var(--gold-0)",
                        color: "var(--ink-0)",
                        border: 0,
                        padding: "12px 20px",
                        cursor: draft.trim() ? "pointer" : "not-allowed",
                        fontFamily: "var(--font-sans)",
                        fontWeight: 600,
                        fontSize: 10,
                        letterSpacing: "0.24em",
                        textTransform: "uppercase",
                        opacity: draft.trim() && !sending ? 1 : 0.4,
                        flexShrink: 0,
                      }}
                    >
                      {sending ? "…" : t("patientMessages.send", lang)}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* styled-jsx silently no-ops in the App Router (POSTMORTEMS #113) — use a plain
          style tag. The template-literal interpolation below still works as-is. */}
      <style>{`
        @media (max-width: 768px) {
          .healo-msg-grid {
            grid-template-columns: 1fr !important;
          }
          .healo-msg-threads {
            display: ${selectedId ? "none" : "block"} !important;
            border-right: 0 !important;
          }
          .healo-msg-conversation {
            display: ${selectedId ? "flex" : "none"} !important;
          }
          .healo-msg-back {
            display: inline-block !important;
          }
        }
      `}</style>
    </main>
  );
}

function ThreadRow({ thread, active, onClick, lang }) {
  const subject = thread.subject || t("patientMessages.conversationFallback", lang);
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "16px 24px",
        border: 0,
        borderBottom: "1px solid var(--cream-2)",
        background: active ? "var(--cream-0)" : "transparent",
        cursor: "pointer",
        display: "block",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 16,
          fontWeight: 500,
          color: "var(--fg-on-light-1)",
          marginBottom: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {subject}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--fg-on-light-3)",
        }}
      >
        {new Date(thread.updated_at).toLocaleDateString()}
      </div>
    </button>
  );
}

function MessageBubble({ message, user, lang }) {
  const isMine = message.actor_type === "user" && message.actor_id === user?.id;
  const who = t(ACTOR_LABEL_KEYS[message.actor_type] || ACTOR_LABEL_KEYS.system, lang);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: 16,
      }}
    >
      <div style={{ maxWidth: "70%", textAlign: isMine ? "right" : "left" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--fg-on-light-3)",
            marginBottom: 6,
          }}
        >
          {who} ·{" "}
          <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
            {new Date(message.created_at).toLocaleString()}
          </span>
        </div>
        <div
          style={{
            display: "inline-block",
            background: isMine ? "var(--ink-0)" : "var(--paper)",
            color: isMine ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
            border: isMine ? "1px solid var(--ink-3)" : "1px solid var(--cream-2)",
            padding: "14px 18px",
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.message_text}
        </div>
      </div>
    </div>
  );
}
