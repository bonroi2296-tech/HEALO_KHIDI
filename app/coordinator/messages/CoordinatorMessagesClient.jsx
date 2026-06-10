"use client";

/**
 * 코디네이터 인박스
 * 모든 환자의 chat_threads 를 조회·응답할 수 있는 운영 UI.
 * 환자 측의 /patient/messages 와 같은 chat_threads + chat_messages 테이블 사용.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const STATUS_OPTIONS = [
  { value: "open", label: "열림" },
  { value: "waiting_coordinator", label: "응답 필요" },
  { value: "waiting_patient", label: "환자 응답 대기" },
  { value: "resolved", label: "해결됨" },
];

export default function CoordinatorMessagesClient() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const msgEndRef = useRef(null);

  // Auth + initial load
  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      setMe(session.user);
      await loadThreads(statusFilter);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) loadThreads(statusFilter);
  }, [statusFilter]);

  // chat_threads/chat_messages 는 service_role 전용 RLS → 서버 API 경유 필수
  async function getAccessToken() {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async function loadThreads(filter) {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const qs = filter && filter !== "all" ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/portal/threads${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setThreads(result.ok ? result.threads || [] : []);
    } catch {
      setThreads([]);
    }
  }

  // Load messages when thread selected (+5초 폴링 — RLS상 realtime 구독 불가)
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let cancelled = false;

    async function loadMessages() {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`/api/portal/threads/${selectedId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled && result.ok) setMessages(result.messages || []);
      } catch {
        /* 폴링 실패는 무시 */
      }
    }

    loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selectedId]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      // 서버가 staff 전송 시 스레드를 waiting_patient 로 자동 전환
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
    } finally {
      setSending(false);
    }
  }

  async function changeThreadStatus(newStatus) {
    if (!selectedId) return;
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/portal/threads/${selectedId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        setThreads((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status: newStatus } : t)));
      }
    } catch {
      /* 상태 변경 실패 — UI 유지 */
    }
  }

  const selectedThread = threads.find((t) => t.id === selectedId);

  return (
    <div
      style={{
        height: "calc(100vh - 60px)",
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#fafaf7",
        color: "#0a0a0a",
      }}
    >
      {/* Left — thread list */}
      <aside
        style={{
          borderRight: "1px solid #e3dbcc",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e3dbcc" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b89550", fontWeight: 600, marginBottom: 8 }}>
            Coordinator Inbox
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["all", ...STATUS_OPTIONS.map(s => s.value)].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: statusFilter === s ? "#0a0a0a" : "transparent",
                  color: statusFilter === s ? "#c8a96a" : "#6b6458",
                  border: `1px solid ${statusFilter === s ? "#0a0a0a" : "#e3dbcc"}`,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {s === "all" ? "전체" : STATUS_OPTIONS.find(o => o.value === s)?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Threads */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, color: "#6b6458", fontStyle: "italic" }}>Loading…</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: 24, color: "#6b6458", fontStyle: "italic", fontSize: 13 }}>
              No threads match this filter.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 20px",
                  border: 0,
                  borderBottom: "1px solid #e3dbcc",
                  background: selectedId === t.id ? "#f5f0e8" : "transparent",
                  cursor: "pointer",
                  display: "block",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <ChannelDot channel={t.channel} />
                  {t.guest_name ? (
                    <span>
                      {t.guest_name}
                      {t.guest_country ? <span style={{ color: "#9a9284", fontWeight: 400, marginLeft: 6 }}>· {t.guest_country}</span> : null}
                    </span>
                  ) : (
                    <span>{t.subject || "Conversation"}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#6b6458", display: "flex", justifyContent: "space-between", overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.guest_name ? (t.subject || t.guest_email || "Guest chat") : `Inquiry #${t.inquiry_id || "—"}`}
                  </span>
                  <span style={{ fontFamily: "SF Mono, monospace", flexShrink: 0, marginLeft: 8 }}>
                    {new Date(t.updated_at || t.last_active_at || t.created_at).toLocaleDateString()}
                  </span>
                </div>
                <StatusBadge status={t.status} />
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right — conversation */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selectedThread ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9a9284",
              fontStyle: "italic",
            }}
          >
            Select a thread to respond
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e3dbcc",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 20,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ChannelDot channel={selectedThread.channel} />
                  {selectedThread.guest_name || selectedThread.subject || "Conversation"}
                </div>
                <div style={{ fontSize: 11, color: "#6b6458", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {selectedThread.guest_name ? (
                    <>
                      {selectedThread.guest_email && <span>✉ {selectedThread.guest_email}</span>}
                      {selectedThread.guest_country && <span>🌐 {selectedThread.guest_country}</span>}
                      {selectedThread.guest_phone && <span>📞 {selectedThread.guest_phone}</span>}
                      <span style={{ color: "#9a9284" }}>· Guest (no signup)</span>
                    </>
                  ) : (
                    <span>Inquiry #{selectedThread.inquiry_id || "—"} · {selectedThread.user_id?.slice(0, 8)}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => changeThreadStatus(s.value)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: selectedThread.status === s.value ? "#c8a96a" : "transparent",
                      color: selectedThread.status === s.value ? "#0a0a0a" : "#6b6458",
                      border: `1px solid ${selectedThread.status === s.value ? "#c8a96a" : "#e3dbcc"}`,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#fafaf7" }}>
              {messages.map((m) => (
                <Message key={m.id} m={m} meId={me?.id} />
              ))}
              <div ref={msgEndRef} />
            </div>

            {/* Composer */}
            <div
              style={{
                padding: "16px 24px 20px",
                borderTop: "1px solid #e3dbcc",
                background: "#fff",
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Reply to patient… (Cmd+Enter to send)"
                rows={2}
                style={{
                  flex: 1,
                  resize: "none",
                  border: 0,
                  borderBottom: "1px solid #9a9284",
                  padding: "10px 0",
                  fontFamily: "inherit",
                  fontSize: 14,
                  outline: "none",
                  background: "transparent",
                }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = "#c8a96a")}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = "#9a9284")}
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                style={{
                  background: "#c8a96a",
                  color: "#0a0a0a",
                  border: 0,
                  padding: "12px 20px",
                  cursor: draft.trim() ? "pointer" : "not-allowed",
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  opacity: draft.trim() && !sending ? 1 : 0.5,
                  flexShrink: 0,
                }}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChannelDot({ channel }) {
  const map = {
    web: { color: "#0d9488", label: "Web" },
    whatsapp: { color: "#25D366", label: "WhatsApp" },
    telegram: { color: "#0088cc", label: "Telegram" },
    email: { color: "#8c3a2e", label: "Email" },
    line: { color: "#06C755", label: "Line" },
    kakao: { color: "#FEE500", label: "Kakao" },
  };
  const c = map[channel] || map.web;
  return (
    <span
      title={`Channel: ${c.label}`}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: c.color,
        flexShrink: 0,
      }}
    />
  );
}

function StatusBadge({ status }) {
  const map = {
    open: { bg: "#c8a96a20", fg: "#b89550", label: "열림" },
    waiting_coordinator: { bg: "#8c3a2e20", fg: "#8c3a2e", label: "응답 필요" },
    waiting_patient: { bg: "#e3dbcc", fg: "#6b6458", label: "환자 응답 대기" },
    resolved: { bg: "#5a7a4a20", fg: "#5a7a4a", label: "해결됨" },
  };
  const c = map[status] || map.open;
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: 6,
        padding: "2px 6px",
        fontSize: 9,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: c.bg,
        color: c.fg,
        fontWeight: 600,
      }}
    >
      {c.label}
    </span>
  );
}

function Message({ m, meId }) {
  const isMine = m.actor_type === "coordinator" && m.actor_id === meId;
  const isPatient = m.actor_type === "user";
  const label =
    isMine ? "You (Coordinator)" :
    isPatient ? "Patient" :
    m.actor_type === "bot" ? "HEALO AI" :
    m.actor_type === "admin" ? "HEALO Admin" :
    m.actor_type === "coordinator" ? "Other Coordinator" :
    "System";

  return (
    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div style={{ maxWidth: "72%", textAlign: isMine ? "right" : "left" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#9a9284",
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          {label} · <span style={{ fontFamily: "SF Mono, monospace", fontWeight: 400 }}>{new Date(m.created_at).toLocaleString()}</span>
        </div>
        <div
          style={{
            display: "inline-block",
            padding: "12px 16px",
            background: isMine ? "#0a0a0a" : isPatient ? "#fff" : "#f5f0e8",
            color: isMine ? "#f5f0e8" : "#0a0a0a",
            border: isMine ? "none" : "1px solid #e3dbcc",
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "inherit",
          }}
        >
          {m.message_text}
        </div>
      </div>
    </div>
  );
}
