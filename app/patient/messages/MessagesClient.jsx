"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import PageShell from "../../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow, Chip } from "../../../components/healo/Primitives";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const COPY = {
  en: {
    heroEyebrow: "Inbox",
    heroTitle: "Your conversations,",
    heroTitleItalic: "in one place.",
    loading: "Loading conversations…",
    noThreads: "No conversations yet. Once you inquire or start an AI chat, threads appear here.",
    startChat: "Start AI chat",
    startInquiry: "Start a new inquiry",
    you: "You",
    coordinator: "Coordinator",
    ai: "HEALO AI",
    admin: "HEALO Support",
    system: "System",
    typePlaceholder: "Type your message… Press Enter to send",
    send: "Send",
    back: "← All conversations",
    unread: "Unread",
    resolved: "Resolved",
    open: "Open",
    today: "Today",
    yesterday: "Yesterday",
    loginRequired: "Please sign in to view your messages.",
  },
  ko: {
    heroEyebrow: "메시지",
    heroTitle: "당신의 모든 대화,",
    heroTitleItalic: "한 곳에서.",
    loading: "대화 불러오는 중…",
    noThreads: "아직 대화가 없습니다. 문의를 시작하거나 AI 채팅을 시작하면 여기에 표시됩니다.",
    startChat: "AI 채팅 시작",
    startInquiry: "새 문의 시작",
    you: "나",
    coordinator: "코디네이터",
    ai: "HEALO AI",
    admin: "HEALO 지원팀",
    system: "시스템",
    typePlaceholder: "메시지 입력… 엔터로 전송",
    send: "전송",
    back: "← 전체 대화",
    unread: "읽지 않음",
    resolved: "해결됨",
    open: "진행중",
    today: "오늘",
    yesterday: "어제",
    loginRequired: "메시지 확인을 위해 로그인해 주세요.",
  },
};

export default function MessagesClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);

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

      const { data } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      setThreads(data || []);
      setLoading(false);
    })();
  }, []);

  // Load messages when thread selected
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", selectedId)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      // Subscribe realtime
      const channel = supabase
        .channel(`thread-${selectedId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${selectedId}` },
          (payload) => {
            if (!payload.new.is_internal) {
              setMessages((m) => [...m, payload.new]);
            }
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!loading && !user) {
    return (
      <PageShell
        current=""
        heroEyebrow={copy.heroEyebrow}
        heroTitle={copy.heroTitle}
        heroTitleItalic={copy.heroTitleItalic}
      >
        <div style={{ padding: "72px 24px", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--fg-on-light-3)",
              marginBottom: 24,
            }}
          >
            {copy.loginRequired}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>Sign in</ButtonGold>
          </Link>
        </div>
      </PageShell>
    );
  }

  const selectedThread = threads.find((t) => t.id === selectedId);

  async function sendMessage() {
    if (!draft.trim() || !selectedId || !user || sending) return;
    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          thread_id: selectedId,
          actor_type: "user",
          actor_id: user.id,
          message_text: draft.trim(),
          is_internal: false,
        })
        .select()
        .single();
      if (!error && data) {
        setMessages((m) => [...m, data]);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell
      current=""
      heroEyebrow={copy.heroEyebrow}
      heroTitle={copy.heroTitle}
      heroTitleItalic={copy.heroTitleItalic}
    >
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
              <Eyebrow tone="muted">Threads</Eyebrow>
            </div>
            {loading ? (
              <div style={{ padding: "24px", color: "var(--fg-on-light-3)", fontStyle: "italic" }}>
                {copy.loading}
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
                  {copy.noThreads}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Link href="/patient/chat" style={{ textDecoration: "none" }}>
                    <LinkArrow>{copy.startChat} →</LinkArrow>
                  </Link>
                  <Link href="/intake" style={{ textDecoration: "none" }}>
                    <LinkArrow>{copy.startInquiry} →</LinkArrow>
                  </Link>
                </div>
              </div>
            ) : (
              threads.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  active={selectedId === t.id}
                  onClick={() => setSelectedId(t.id)}
                  copy={copy}
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
                  {threads.length > 0
                    ? lang === "ko" ? "대화를 선택하세요" : "Select a conversation"
                    : ""}
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
                    <Eyebrow tone="muted">Thread</Eyebrow>
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
                      {selectedThread.subject || (lang === "ko" ? "대화" : "Conversation")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Chip tone={selectedThread.status === "resolved" ? "success" : "gold"}>
                      {selectedThread.status === "resolved" ? copy.resolved : copy.open}
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
                      {copy.back}
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
                    <MessageBubble key={m.id} message={m} user={user} copy={copy} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div
                  style={{
                    padding: "16px 32px 20px",
                    borderTop: "1px solid var(--cream-2)",
                    background: "var(--cream-0)",
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
                      placeholder={copy.typePlaceholder}
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
                      {sending ? "…" : copy.send}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-msg-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.healo-msg-threads) {
            display: ${selectedId ? "none" : "block"} !important;
            border-right: 0 !important;
          }
          :global(.healo-msg-conversation) {
            display: ${selectedId ? "flex" : "none"} !important;
          }
          :global(.healo-msg-back) {
            display: inline-block !important;
          }
        }
      `}</style>
    </PageShell>
  );
}

function ThreadRow({ thread, active, onClick, copy }) {
  const subject = thread.subject || "Conversation";
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

function MessageBubble({ message, user, copy }) {
  const isMine = message.actor_type === "user" && message.actor_id === user?.id;
  const who =
    message.actor_type === "user"
      ? copy.you
      : message.actor_type === "bot"
      ? copy.ai
      : message.actor_type === "admin"
      ? copy.admin
      : message.actor_type === "coordinator"
      ? copy.coordinator
      : copy.system;

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
