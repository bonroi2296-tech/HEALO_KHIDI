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
import { useCoordinatorL, useDateLocale } from "@/lib/i18n/coordinator";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";
import { useDeepLinkParam } from "@/lib/hooks/useDeepLinkParam";

// 대화 처리 단계(워크플로): 신규 → (응답 필요 ↔ 환자 응답 대기) → 완료. 라벨은 컴포넌트에서 L로 해석.
const STATUS_VALUES = ["open", "waiting_coordinator", "waiting_patient", "resolved"];

const STATUS_BADGE = {
  open: "bg-blue-50 text-blue-600",
  waiting_coordinator: "bg-red-50 text-red-700",
  waiting_patient: "bg-amber-50 text-amber-600",
  resolved: "bg-gray-100 text-gray-600",
};

// 채널 색상만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석(WhatsApp/Telegram/LINE은 고유명사라 그대로).
const CHANNEL_COLOR = {
  web: "#0d9488",
  whatsapp: "#25D366",
  telegram: "#0088cc",
  email: "#8c3a2e",
  line: "#06C755",
  kakao: "#FEE500",
  agency: "#7c3aed",
  hospital: "#0369a1",
};

export default function CoordinatorMessagesClient() {
  const router = useRouter();
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();

  // 대화 처리 단계 라벨 (L 해석)
  const STATUS_LABEL = {
    open: L.msStatusOpen,
    waiting_coordinator: L.msStatusWaitingCoord,
    waiting_patient: L.msStatusWaitingPatient,
    resolved: L.msStatusResolved,
  };
  // 채널 라벨 (L 해석). WhatsApp/Telegram/LINE은 고유명사라 번역하지 않음.
  const CHANNEL_LABEL = {
    web: L.msChannelWeb,
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    email: L.msChannelEmail,
    line: "LINE",
    kakao: L.msChannelKakao,
    agency: L.msChannelAgency,
    hospital: L.msChannelHospital,
  };
  const statusLabel = (s) => STATUS_LABEL[s] || L.msStatusOpen;
  const fmtDate = (v) => { try { return new Date(v).toLocaleDateString(dateLoc); } catch { return ""; } };
  // 미리보기 앞에 발신자 표시 (누가 마지막 말 했는지). 실제 actor_type 값 기준.
  const actorPrefix = (actor) => {
    const m = {
      patient: `${L.msActorPatient}: `, user: `${L.msActorPatient}: `,
      system: `${L.msActorAI}: `, bot: `${L.msActorAI}: `,
      coordinator: `${L.msActorMe}: `, agency: `${L.msActorAgency}: `, admin: `${L.msActorAdmin}: `,
      hospital: `${L.msActorHospital}: `,
    };
    const label = m[actor];
    return label ? <span className="font-medium text-gray-500">{label}</span> : null;
  };
  // 스레드 제목: 게스트명 > 제목 > 폴백. AI 채팅 기본 제목은 현지어로 다듬음.
  const threadTitle = (t) => {
    if (t.guest_name) return t.guest_name;
    const s = (t.subject || "").trim();
    if (!s || s === "New Chat") return L.msTitlePatientConsult;
    if (s === "AI Health Consultation") return L.msTitleAIConsult;
    return s;
  };

  const [me, setMe] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
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

  // 딥링크: 알림(AI 부정평가·병원 답신)이 `?thread=<id>` 로 보낸다. 예전엔 이 화면이 그 값을
  // «안 읽어서» 목록만 열렸다 — 주소는 맞는데 아무 데도 안 가는 죽은 링크였다(2026-08-28).
  // ⚠️ 목록 기본 거름망이 'open' 이라 다른 상태의 스레드는 목록에 없다. 그런데 첫 로딩이
  //    «끝나기 전»에 거름망을 바꾸면 재조회 효과가 `if (!loading)` 에 걸려 건너뛰어지고,
  //    직접 다시 부르면 첫 조회와 경합해 늦게 오는 쪽이 이긴다(리뷰가 둘 다 잡음).
  //    → 첫 로딩이 끝난 뒤에 바꾼다. 그러면 거름망 효과가 알아서 한 번만 다시 불러온다.
  useDeepLinkParam("thread", (id) => {
    setSelectedId(id);
    setStatusFilter("all");
  }, { ready: !loading });

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
        const res = await fetch(`/api/portal/threads/${encodeURIComponent(selectedId)}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled && result.ok) {
          const server = result.messages || [];
          // id 병합: 방금 낙관적으로 보낸(아직 서버 목록에 안 뜬) 메시지가 폴링 전체교체에
          // 깜빡 사라지는 것 방지(전송 실패처럼 보임). 서버가 따라잡으면 dedupe 됨.
          setMessages((prev) => {
            const ids = new Set(server.map((m) => m.id));
            return [...server, ...prev.filter((m) => !ids.has(m.id))];
          });
        }
      } catch { /* 폴링 실패는 무시 */ }
      finally { if (isFirst && !cancelled) setMsgLoading(false); }
    }

    loadMessages(true);
    // 탭이 안 보이는 동안엔 건너뛴다 — 코디가 메시지함을 하루 종일 켜두면 5초 폴링이 그대로
    // 상시 부하가 된다(2026-07-24 상담방 탭이 같은 이유로 IO 예산 고갈, POSTMORTEMS #120).
    // 탭이 다시 보이면 다음 tick(최대 5초)에 자동으로 따라잡는다.
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMessages(false);
    }, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selectedId]);

  // 새 메시지가 늘었을 때만 맨아래로. (과거: messages 바뀔 때마다 scrollIntoView →
  //  5초 폴링이 매번 같은 배열을 새로 set 해서 가만히 있어도 5초마다 스크롤이 내려가던 버그)
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      msgEndRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  // 답장 추천 칩: 승인된 플레이북 패턴(상담 종료 시 자동 추출)을 단골순으로 로드.
  useEffect(() => {
    setSuggestions([]); // 스레드 전환 시 이전 스레드 칩 잔상 방지
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`/api/portal/reply-suggestions?threadId=${encodeURIComponent(selectedId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled) setSuggestions(res.ok && result.ok ? result.items || [] : []);
      } catch { if (!cancelled) setSuggestions([]); }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  // 칩 클릭 = 입력창 채움(자동 전송 아님 — 코디가 수정 후 직접 전송). 사용횟수는 fire-and-forget.
  async function applySuggestion(s) {
    setDraft(s.response_template);
    try {
      const token = await getAccessToken();
      if (token) {
        fetch("/api/portal/reply-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ patternId: s.id }),
        }).catch(() => {});
      }
    } catch { /* 사용횟수 기록 실패는 무시 */ }
  }

  async function send() {
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true);
    setSendError(false);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/portal/threads/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.ok && result.message) {
        // 메신저 릴레이 결과를 즉시 말풍선에 반영 (미전달이면 sent 는 metadata 없음)
        const sentMsg =
          result.delivery && result.delivery !== "sent"
            ? { ...result.message, metadata: { ...(result.message.metadata || {}), delivery: result.delivery } }
            : result.message;
        setMessages((m) => [...m, sentMsg]);
        setDraft("");
      } else {
        setSendError(true);
      }
    } catch (e) {
      // 네트워크 예외가 조용히 삼켜져 코디가 실패를 모르던 것 방지 (독립 리뷰 P2)
      console.error("[coordinator/messages] send failed:", e);
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  async function changeThreadStatus(newStatus) {
    if (!selectedId) return;
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/portal/threads/${encodeURIComponent(selectedId)}`, {
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
    <div className="grid h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[300px_1fr] bg-gray-50 text-gray-900">
      {/* 좌측 — 스레드 목록
          폰에선 목록 칸이 300px 를 통째로 먹어 대화가 112px 로 찌그러졌다(폰 폭 412px 기준).
          한 칸으로 세우고, 대화를 고르면 목록을 접는다 — /patient/messages 와 같은 방식. */}
      <aside className={`flex-col overflow-hidden border-r border-gray-200 bg-white ${
        selectedId ? "hidden md:flex" : "flex"
      }`}>
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <MessageSquare size={16} className="text-teal-700" /> {L.navMessages}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...STATUS_VALUES].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-teal-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? L.all : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">{L.msLoading}</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">{L.msNoThreads}</div>
          ) : (
            threads.map((t) => {
              const chColor = CHANNEL_COLOR[t.channel] || CHANNEL_COLOR.web;
              const chLabel = CHANNEL_LABEL[t.channel] || CHANNEL_LABEL.web;
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  data-testid="thread-row"
                  onClick={() => setSelectedId(t.id)}
                  className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition ${
                    active ? "bg-teal-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    {/* 채널을 색점이 아니라 글자 배지로 — 웹/텔레그램/왓츠앱 유입이 한눈에 (PO 2026-07-24) */}
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                      style={{ background: chColor, ...(t.channel === "kakao" ? { color: "#3c1e1e" } : {}) }}
                      title={`${L.msChannelLabel}: ${chLabel}`}
                    >
                      {chLabel}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-900">{threadTitle(t)}</span>
                    {t.guest_country && <span className="shrink-0 text-xs text-gray-500">· {t.guest_country}</span>}
                    <span className="ml-auto shrink-0 text-xs text-gray-500">
                      {fmtDate(t.updated_at || t.last_active_at || t.created_at)}
                    </span>
                  </div>
                  {/* 마지막 메시지 미리보기 — 누가 무슨 말 했는지 한눈에 (길면 …) */}
                  <div className="truncate text-xs text-gray-500">
                    {t.last_message
                      ? <>{actorPrefix(t.last_actor)}{t.last_message}</>
                      : <span className="text-gray-500">{t.inquiry_id ? `${L.msInquiry} #${t.inquiry_id}` : L.msNoMessages}</span>}
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

      {/* 우측 — 대화 (폰에선 고른 뒤에만 보인다) */}
      <div className={`h-full min-h-0 flex-col overflow-hidden ${
        selectedId ? "flex" : "hidden md:flex"
      }`}>
        {!selectedThread ? (
          // 폰에서 고른 대화가 목록에 없을 수도 있다(딥링크·거름망 변경) → 목록이 접힌 채로
          // 돌아갈 길이 없는 막다른 화면이 되던 것을 막는다(2026-08-28 리뷰 지적).
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-gray-500">
            <span>{selectedId ? L.msThreadNotFound : L.msSelectConversation}</span>
            {selectedId && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                ← {L.chBackToList}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {/* 폰에서만 — 목록이 접혀 있어 되돌아갈 길이 필요하다 */}
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label={L.chBackToList}
                    className="md:hidden shrink-0 -ml-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    ← {L.chBackToList}
                  </button>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                    style={{ background: CHANNEL_COLOR[selectedThread.channel] || CHANNEL_COLOR.web, ...(selectedThread.channel === "kakao" ? { color: "#3c1e1e" } : {}) }}
                  >
                    {CHANNEL_LABEL[selectedThread.channel] || CHANNEL_LABEL.web}
                  </span>
                  <span className="truncate text-base font-bold text-gray-900">{threadTitle(selectedThread)}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {selectedThread.guest_name ? (
                    <>
                      {selectedThread.guest_email && <span>✉ {selectedThread.guest_email}</span>}
                      {selectedThread.guest_country && <span>🌐 {selectedThread.guest_country}</span>}
                      {selectedThread.guest_phone && <span>📞 {selectedThread.guest_phone}</span>}
                      <span>· {L.msGuestBadge}</span>
                    </>
                  ) : (
                    <span>{selectedThread.inquiry_id ? `${L.msInquiry} #${selectedThread.inquiry_id}` : L.msAIChat}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {STATUS_VALUES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeThreadStatus(s)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      selectedThread.status === s
                        ? "bg-teal-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* 메시지 */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
              {msgLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">{L.msNoMessagesYet}</div>
              ) : (
                <>
                  {messages.map((m) => (
                    <Message key={m.id} m={m} meId={me?.id} L={L} dateLoc={dateLoc} />
                  ))}
                  <div ref={msgEndRef} />
                </>
              )}
            </div>

            {/* 답장 추천 칩 — 입력 중(draft 있음)에는 숨겨 타이핑 덮어쓰기 방지 */}
            {suggestions.length > 0 && !draft.trim() && (
              <div className="flex items-center gap-2 overflow-x-auto border-t border-gray-100 bg-white px-6 pt-2.5">
                <span className="shrink-0 text-xs font-medium text-gray-500">💬 {L.msSuggestedReplies}</span>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => applySuggestion(s)}
                    title={s.response_template}
                    className="max-w-[240px] shrink-0 truncate rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-800 transition hover:bg-teal-100"
                  >
                    {s.user_intent || s.response_template}
                  </button>
                ))}
              </div>
            )}

            {/* 메신저 스레드 안내 — 이 답장이 DB 저장만이 아니라 환자 앱으로 실발신됨을 명시 */}
            {(selectedThread.channel === "telegram" || selectedThread.channel === "whatsapp") && (
              <div className="border-t border-gray-100 bg-white px-6 pt-2 text-xs text-gray-500">
                📨 {L.msRelayHint.replace("{channel}", selectedThread.channel === "telegram" ? "Telegram" : "WhatsApp")}
              </div>
            )}

            {sendError && (
              <div className="border-t border-gray-100 bg-white px-6 pt-2 text-xs font-medium text-red-600">
                ⚠️ {L.msSendFailed}
              </div>
            )}

            {/* 입력 — 우측 여백은 우하단 고정 「사용설명서」 버튼과 전송 버튼 겹침 방지 (PO 2026-07-24) */}
            <div className="flex items-end gap-3 border-t border-gray-200 bg-white py-3 pl-6 pr-40">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                }}
                placeholder={L.msReplyPlaceholder}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="shrink-0 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {sending ? L.msSending : L.msSend}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Message({ m, meId, L, dateLoc }) {
  // 실제 actor_type 값(DB): patient(환자 입력) · system(AI 답변) · coordinator · agency · admin
  const isMine = m.actor_type === "coordinator" && m.actor_id === meId;
  const isPatient = m.actor_type === "patient" || m.actor_type === "user";
  const isAI = m.actor_type === "system" || m.actor_type === "bot";
  const isAdmin = m.actor_type === "admin";
  const isAgency = m.actor_type === "agency";
  const isHospital = m.actor_type === "hospital";

  // 발신자별 라벨 + 색 — 환자(파랑)·AI(보라)·에이전시(초록)·병원(하늘)을 한눈에 구분.
  const label =
    isMine ? L.msSenderMe :
    isPatient ? `🙋 ${L.msActorPatient}` :
    isAI ? `🤖 healwith ${L.msActorAI}` :
    isAgency ? `🏢 ${L.msActorAgency}` :
    isHospital ? `🏥 ${L.msActorHospital}` :
    isAdmin ? `healwith ${L.msActorAdmin}` :
    m.actor_type === "coordinator" ? L.msSenderOtherCoord :
    L.msSenderSystem;
  const labelColor =
    isPatient ? "text-blue-600" :
    isAI ? "text-violet-600" :
    isAgency ? "text-emerald-600" :
    isHospital ? "text-sky-600" :
    isAdmin ? "text-amber-600" :
    "text-gray-500";
  // 버블: 나=teal 우측 / 환자=흰색+파란 좌측 / AI=보라 / 에이전시=초록 / 병원=하늘 / 관리자=앰버
  const bubble =
    isMine ? "bg-teal-700 text-white" :
    isPatient ? "border border-gray-200 border-l-[3px] border-l-blue-400 bg-white text-gray-900" :
    isAI ? "border border-violet-100 bg-violet-50 text-gray-800" :
    isAgency ? "border border-emerald-100 bg-emerald-50 text-gray-800" :
    isHospital ? "border border-sky-100 bg-sky-50 text-gray-800" :
    isAdmin ? "border border-amber-100 bg-amber-50 text-gray-800" :
    "border border-gray-200 bg-gray-100 text-gray-700";

  return (
    <div className={`mb-3.5 flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%] ${isMine ? "text-right" : "text-left"}`}>
        <div className={`mb-1 text-xs font-semibold ${isMine ? "text-gray-600" : labelColor}`}>
          {label} <span className="font-normal text-gray-500">· {new Date(m.created_at).toLocaleString(dateLoc)}</span>
        </div>
        <div className={`inline-block whitespace-pre-wrap break-words rounded-xl px-4 py-2.5 text-sm leading-relaxed ${bubble}`}>
          {m.message_text}
        </div>
        {/* 메신저 릴레이 미전달 표시 — staffReplyRelay 가 metadata.delivery 에 기록 */}
        {m.metadata?.delivery === "failed" && (
          <div className="mt-1 text-[11px] font-medium text-red-600">{L.msDeliveryFailed}</div>
        )}
        {m.metadata?.delivery === "window_expired" && (
          <div className="mt-1 text-[11px] font-medium text-amber-600">{L.msDeliveryWindowExpired}</div>
        )}
      </div>
    </div>
  );
}
