"use client";

/**
 * 코디네이터 메시지
 * 모든 환자/게스트의 chat_threads 를 조회·응답하는 운영 UI.
 * 환자 측 /patient/messages 와 같은 chat_threads + chat_messages 테이블 사용.
 * 톤: legacy(회색·teal·system 폰트) — 다른 코디 화면과 통일. (premium serif/gold 잔재 제거)
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const STATUS_OPTIONS = [
  { value: "open", label: "열림" },
  { value: "waiting_coordinator", label: "응답 필요" },
  { value: "waiting_patient", label: "환자 응답 대기" },
  { value: "resolved", label: "해결됨" },
];

const STATUS_BADGE = {
  open: "bg-teal-50 text-teal-700",
  waiting_coordinator: "bg-red-50 text-red-600",
  waiting_patient: "bg-gray-100 text-gray-500",
  resolved: "bg-green-50 text-green-700",
};

const CHANNEL = {
  web: { color: "#0d9488", label: "웹" },
  whatsapp: { color: "#25D366", label: "WhatsApp" },
  telegram: { color: "#0088cc", label: "Telegram" },
  email: { color: "#8c3a2e", label: "이메일" },
  line: { color: "#06C755", label: "LINE" },
  kakao: { color: "#FEE500", label: "카카오" },
  agency: { color: "#7c3aed", label: "에이전시" },
};

function fmtDate(v) {
  try { return new Date(v).toLocaleDateString("ko-KR"); } catch { return ""; }
}
function statusLabel(s) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label || "열림";
}
// 스레드 제목: 게스트명 > 제목 > 폴백. AI 채팅 기본 제목은 한국어로 다듬음.
function threadTitle(t) {
  if (t.guest_name) return t.guest_name;
  const s = (t.subject || "").trim();
  if (!s || s === "New Chat") return "환자 상담";
  if (s === "AI Health Consultation") return "AI 건강 상담";
  return s;
}

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
  const [msgLoading, setMsgLoading] = useState(false);
  const msgEndRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/login"); return; }
      setMe(session.user);
      await loadThreads(statusFilter);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadThreads(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await fetch(`/api/portal/threads${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      setThreads(result.ok ? result.threads || [] : []);
    } catch {
      setThreads([]);
    }
  }

  // 메시지 로드 + 5초 폴링 (RLS상 realtime 구독 불가)
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let cancelled = false;
    prevCountRef.current = 0; // 스레드 전환 시 첫 로드는 맨아래로 스크롤되게 리셋
    setMessages([]);
    setMsgLoading(true); // 클릭 즉시 로딩 표시(빈 화면으로 멈춘 듯 보이던 문제)

    async function loadMessages(isFirst) {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`/api/portal/threads/${selectedId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled && result.ok) setMessages(result.messages || []);
      } catch { /* 폴링 실패는 무시 */ }
      finally { if (isFirst && !cancelled) setMsgLoading(false); }
    }

    loadMessages(true);
    const timer = setInterval(() => loadMessages(false), 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selectedId]);

  // 새 메시지가 늘었을 때만 맨아래로. (과거: messages 바뀔 때마다 scrollIntoView →
  //  5초 폴링이 매번 같은 배열을 새로 set 해서 가만히 있어도 5초마다 스크롤이 내려가던 버그)
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      msgEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  async function send() {
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/portal/threads/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        setThreads((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status: newStatus } : t)));
      }
    } catch { /* 상태 변경 실패 — UI 유지 */ }
  }

  const selectedThread = threads.find((t) => t.id === selectedId);

  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-[300px_1fr] bg-gray-50 text-gray-900">
      {/* 좌측 — 스레드 목록 */}
      <aside className="flex flex-col overflow-hidden border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <MessageSquare size={16} className="text-teal-700" /> 메시지
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...STATUS_OPTIONS.map((s) => s.value)].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? "전체" : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-400">불러오는 중…</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">이 조건의 대화가 없습니다.</div>
          ) : (
            threads.map((t) => {
              const ch = CHANNEL[t.channel] || CHANNEL.web;
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition ${
                    active ? "bg-teal-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ch.color }} title={ch.label} />
                    <span className="truncate text-sm font-medium text-gray-900">{threadTitle(t)}</span>
                    {t.guest_country && <span className="shrink-0 text-xs text-gray-400">· {t.guest_country}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-gray-400">
                      {t.guest_name ? (t.guest_email || ch.label) : (t.inquiry_id ? `문의 #${t.inquiry_id}` : ch.label)}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {fmtDate(t.updated_at || t.last_active_at || t.created_at)}
                    </span>
                  </div>
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] || STATUS_BADGE.open}`}>
                    {statusLabel(t.status)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* 우측 — 대화 */}
      <div className="flex flex-col overflow-hidden">
        {!selectedThread ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            왼쪽에서 대화를 선택하세요.
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3">
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-gray-900">{threadTitle(selectedThread)}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-400">
                  {selectedThread.guest_name ? (
                    <>
                      {selectedThread.guest_email && <span>✉ {selectedThread.guest_email}</span>}
                      {selectedThread.guest_country && <span>🌐 {selectedThread.guest_country}</span>}
                      {selectedThread.guest_phone && <span>📞 {selectedThread.guest_phone}</span>}
                      <span>· 게스트(비회원)</span>
                    </>
                  ) : (
                    <span>{selectedThread.inquiry_id ? `문의 #${selectedThread.inquiry_id}` : "AI 채팅"}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => changeThreadStatus(s.value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      selectedThread.status === s.value
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 메시지 */}
            <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
              {msgLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">아직 메시지가 없습니다.</div>
              ) : (
                <>
                  {messages.map((m) => (
                    <Message key={m.id} m={m} meId={me?.id} />
                  ))}
                  <div ref={msgEndRef} />
                </>
              )}
            </div>

            {/* 입력 */}
            <div className="flex items-end gap-3 border-t border-gray-200 bg-white px-6 py-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                }}
                placeholder="환자에게 답장… (Ctrl+Enter 전송)"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="shrink-0 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {sending ? "전송 중…" : "보내기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Message({ m, meId }) {
  const isMine = m.actor_type === "coordinator" && m.actor_id === meId;
  const isPatient = m.actor_type === "user";
  const label =
    isMine ? "나 (코디네이터)" :
    isPatient ? "환자" :
    m.actor_type === "agency" ? "에이전시(파트너)" :
    m.actor_type === "bot" ? "healwith AI" :
    m.actor_type === "admin" ? "healwith 관리자" :
    m.actor_type === "coordinator" ? "다른 코디네이터" :
    "시스템";

  return (
    <div className={`mb-3.5 flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%] ${isMine ? "text-right" : "text-left"}`}>
        <div className="mb-1 text-xs font-medium text-gray-400">
          {label} · {new Date(m.created_at).toLocaleString("ko-KR")}
        </div>
        <div
          className={`inline-block whitespace-pre-wrap break-words rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isMine
              ? "bg-teal-600 text-white"
              : isPatient
              ? "border border-gray-200 bg-white text-gray-900"
              : "border border-gray-200 bg-gray-100 text-gray-800"
          }`}
        >
          {m.message_text}
        </div>
      </div>
    </div>
  );
}
