"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, AlertCircle, Loader2, Bot, ThumbsUp, ThumbsDown, X, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { getLangCodeFromCookie, t } from "@/lib/i18n";

const TOKEN_COOKIE = "healo_chat_token";
const SESSION_COOKIE = "healo_browser_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value, maxAge = COOKIE_MAX_AGE) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function ensureBrowserSessionId() {
  let id = readCookie(SESSION_COOKIE);
  if (!id) {
    id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeCookie(SESSION_COOKIE, id, 60 * 60 * 24 * 365);
  }
  return id;
}

// 식별 폼 — 회원가입 아닌 가벼운 명함 (이름·이메일·국가)
function IdentificationForm({ langCode, onSubmit, submitting }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [consent, setConsent] = useState(false);

  const canSubmit = name.trim().length >= 1 && country.trim().length >= 1 && consent;

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-teal-700 flex items-center justify-center text-white">
            <Bot size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {t("chat.identify.title", langCode) || "Start the conversation"}
          </h3>
          <p className="text-xs text-gray-500">
            {t("chat.identify.subtitle", langCode) || "No signup. Just so we can reach you with the right answer."}
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("chat.identify.namePlaceholder", langCode) || "Your name"}
            className="w-full border border-gray-300 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={submitting}
            autoComplete="name"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`${t("chat.identify.emailPlaceholder", langCode) || "Email (optional)"}`}
            className="w-full border border-gray-300 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={submitting}
            autoComplete="email"
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            disabled={submitting}
          >
            <option value="">{t("chat.identify.countryPlaceholder", langCode) || "Select your country"}</option>
            <option value="KZ">Қазақстан / Kazakhstan</option>
            <option value="RU">Россия / Russia</option>
            <option value="UZ">O&apos;zbekiston / Uzbekistan</option>
            <option value="KG">Кыргызстан / Kyrgyzstan</option>
            <option value="MN">Монгол / Mongolia</option>
            <option value="CN">中国 / China</option>
            <option value="JP">日本 / Japan</option>
            <option value="KR">대한민국 / Korea</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* PIPA 필수 동의 (개인·민감 건강정보 수집 + 국외/AI 이전) */}
        <label className="mt-4 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 w-4 h-4 accent-teal-700 shrink-0"
          />
          <span className="text-[12px] leading-snug text-gray-600">
            {t("chat.identify.consent", langCode) ||
              "[Required] I agree to the collection of my personal & sensitive health data and its cross-border transfer to Korea (including AI processing) for consultation."}
          </span>
        </label>

        <button
          onClick={() => onSubmit({ name, email, country, consent })}
          disabled={!canSubmit || submitting}
          className="mt-4 w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {t("chat.identify.startButton", langCode) || "Start chat"}
        </button>

        <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
          {t("chat.identify.privacyNote", langCode) ||
            "We use your info only to follow up. No marketing. Encrypted & PIPA-compliant."}
        </p>
      </div>
    </div>
  );
}

// 생각 중(타이핑) 점 — 스트리밍 첫 글자 도착 전 표시. 언어 무관(ChatGPT식).
function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5" aria-label="AI is typing">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-600/70 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-teal-600/70 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-teal-600/70 animate-bounce" />
    </span>
  );
}

// 피드백 모달 컴포넌트
function FeedbackModal({ langCode, messageId, threadId, publicToken, onClose, onSubmitted }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    { key: "inaccurate", label: t("chat.feedback.reason.inaccurate", langCode) || "Inaccurate information" },
    { key: "irrelevant", label: t("chat.feedback.reason.irrelevant", langCode) || "Not relevant" },
    { key: "harmful", label: t("chat.feedback.reason.harmful", langCode) || "Potentially harmful" },
    { key: "other", label: t("chat.feedback.reason.other", langCode) || "Other" },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/public/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          message_id: messageId,
          public_token: publicToken,
          rating: -1,
          reason_category: selectedReason || null,
          comment: comment.trim() || null,
        }),
      });
    } catch (e) {
      console.warn("[FeedbackModal] submit failed:", e);
    } finally {
      setSubmitting(false);
      onSubmitted();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">
            {t("chat.feedback.modalTitle", langCode) || "What was wrong with this response?"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {reasons.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelectedReason(r.key)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                selectedReason === r.key
                  ? "bg-red-50 border-red-400 text-red-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("chat.feedback.commentPlaceholder", langCode) || "Additional comments (optional)"}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            {t("chat.feedback.cancel", langCode) || "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-1"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("chat.feedback.submit", langCode) || "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 신규 진입(쿠키 없음) 시 익명 자동시작 직전에 끼우는 1줄 필수 동의 게이트.
// 이름·이메일을 묻지 않아 기존 무마찰 진입을 유지하되(클릭 1번 추가), 민감정보·국외이전 동의만 받는다.
function ConsentGate({ langCode, onConsent, submitting }) {
  const [consent, setConsent] = useState(false);
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-teal-700 flex items-center justify-center text-white">
            <Bot size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {t("chat.identify.title", langCode) || "Start the conversation"}
          </h3>
          <p className="text-xs text-gray-500">
            {t("chat.identify.subtitle", langCode) || "No signup. Just so we can reach you with the right answer."}
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer rounded-xl border border-gray-200 p-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 w-4 h-4 accent-teal-700 shrink-0"
          />
          <span className="text-[12px] leading-snug text-gray-700">
            {t("chat.identify.consent", langCode) ||
              "[Required] I agree to the collection of my personal & sensitive health data and its cross-border transfer to Korea (including AI processing) for consultation."}
          </span>
        </label>

        <button
          onClick={() => onConsent()}
          disabled={!consent || submitting}
          className="mt-4 w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {t("chat.consentStart", langCode) || "Agree & start chat"}
        </button>

        <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
          {t("chat.identify.privacyNote", langCode) ||
            "We use your info only to follow up. No marketing. Encrypted & PIPA-compliant."}
        </p>
      </div>
    </div>
  );
}

export function ThreadChat() {
  const [threadId, setThreadId] = useState(null);
  const [publicToken, setPublicToken] = useState(null);
  const [guest, setGuest] = useState(null); // { name, email, country }
  const [identifying, setIdentifying] = useState(false);
  const [restoring, setRestoring] = useState(true); // 초기 쿠키 복구 시도 중
  // PIPA: 게스트가 민감 건강정보를 AI(국외·Google)에 입력하기 전 1줄 필수 동의 게이트.
  // 신규 진입(쿠키 토큰 없음)은 익명 자동시작 대신 이 게이트를 먼저 통과해야 함.
  const [needsConsent, setNeedsConsent] = useState(false);
  const langCode = getLangCodeFromCookie();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handOff, setHandOff] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // 첨부(검사결과지·사진) 업로드 — 환자가 자료 올려서 의료진 검토 받게.
  const [attachments, setAttachments] = useState([]); // [{path,name,type}]
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const MAX_ATTACHMENTS = 5;
  const MAX_FILE_MB = 10;

  const handleFilePick = async (fileList) => {
    setUploadError("");
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setUploadError(t("chat.upload.tooMany", langCode) || `Up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files.slice(0, remaining)) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          setUploadError(t("chat.upload.tooLarge", langCode) || `Each file must be under ${MAX_FILE_MB}MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.ok) {
          setUploadError(t("chat.upload.failed", langCode) || "Upload failed. Please try again.");
          continue;
        }
        setAttachments((prev) => [...prev, { path: data.path, name: data.name, type: data.type }]);
      }
    } catch (e) {
      console.warn("[ThreadChat] upload failed:", e);
      setUploadError(t("chat.upload.failed", langCode) || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // textarea 자동 높이 — 한 줄에서 시작해 입력에 맞춰 늘어남(최대 128px), 전송 후 한 줄로 복귀.
  // 긴 질문(암환자 상세 문의)도 잘리지 않게 + 입력 영역이 채팅을 가리지 않게.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [input]);

  // 피드백 상태
  const [feedbackModal, setFeedbackModal] = useState(null); // { messageId }
  const [feedbackDone, setFeedbackDone] = useState({}); // { [messageId]: 'positive'|'negative' }
  const [feedbackThanks, setFeedbackThanks] = useState(null); // messageId

  const handleThumbsUp = async (messageId) => {
    if (feedbackDone[messageId] || !threadId || !publicToken) return;
    setFeedbackDone((prev) => ({ ...prev, [messageId]: "positive" }));
    setFeedbackThanks(messageId);
    setTimeout(() => setFeedbackThanks(null), 2000);
    try {
      await fetch("/api/public/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, message_id: messageId, public_token: publicToken, rating: 1 }),
      });
    } catch (e) {
      console.warn("[ThreadChat] thumbsUp submit failed:", e);
    }
  };

  const handleThumbsDown = (messageId) => {
    if (feedbackDone[messageId] || !threadId || !publicToken) return;
    setFeedbackModal({ messageId });
  };

  const handleFeedbackSubmitted = (messageId) => {
    setFeedbackDone((prev) => ({ ...prev, [messageId]: "negative" }));
    setFeedbackModal(null);
    setFeedbackThanks(messageId);
    setTimeout(() => setFeedbackThanks(null), 2000);
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // 진입장벽 제거: 이름/이메일/국가 안 묻고 익명으로 즉시 채팅 시작.
  // 언어는 이미 선택된 사이트 언어(langCode) 그대로 상속. 연락처는 대화 중 필요할 때만.
  const startAnonymousThread = useCallback(async ({ consent } = {}) => {
    try {
      const browserSessionId = ensureBrowserSessionId();
      const res = await fetch("/api/public/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langCode,
          browser_session_id: browserSessionId,
          landing_path: typeof window !== "undefined" ? window.location.pathname : null,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
          // PIPA: 동의 게이트 통과분만 true. 서버가 다시 검증.
          consent: consent === true,
          consent_version: "1.0.0",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "start_failed");
      setThreadId(json.thread_id);
      setPublicToken(json.public_token);
      writeCookie(TOKEN_COOKIE, json.public_token);
      setMessages([{ id: "intro", role: "assistant", content: t("chat.intro", langCode) }]);
      return true;
    } catch (e) {
      console.warn("[ThreadChat] anonymous start failed, fallback to form:", e);
      return false;
    }
  }, [langCode]);

  // 동의 게이트 "동의하고 시작":
  //  - 기존 thread(재방문 쿠키·게이트 도입 이전 시작분)면 → 그 thread에 동의 백필.
  //  - 신규(thread 없음)면 → 동의 플래그와 함께 익명 thread 생성.
  const handleConsentStart = useCallback(async () => {
    setIdentifying(true);
    let ok = false;
    if (threadId && publicToken) {
      try {
        const res = await fetch("/api/public/chat/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thread_id: threadId, public_token: publicToken, consent_version: "1.0.0" }),
        });
        ok = (await res.json())?.ok === true;
      } catch (e) {
        console.warn("[ThreadChat] consent backfill failed:", e);
      }
    } else {
      ok = await startAnonymousThread({ consent: true });
    }
    setIdentifying(false);
    if (ok) setNeedsConsent(false);
    // 실패 시 게이트 유지 → 사용자가 다시 시도.
  }, [threadId, publicToken, startAnonymousThread]);

  // 초기 진입 시 쿠키 토큰으로 복구 시도.
  // 신규(토큰 없음)는 자동시작 대신 PIPA 동의 게이트를 먼저 띄운다(민감정보·국외이전 동의 후 시작).
  useEffect(() => {
    let cancelled = false;
    async function tryResume() {
      const token = readCookie(TOKEN_COOKIE);
      if (!token) {
        if (!cancelled) {
          setNeedsConsent(true);
          setRestoring(false);
        }
        return;
      }
      try {
        const res = await fetch(`/api/public/chat/resume?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.ok && json.thread) {
          setThreadId(json.thread.id);
          setPublicToken(json.thread.public_token);
          setGuest(json.thread.guest || null);
          // PIPA: 동의 기록 없는 기존 thread(게이트 도입 이전 시작분)면 게이트를 띄워 동의 백필.
          if (json.thread.has_consent === false) setNeedsConsent(true);
          const history = (json.messages || []).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }));
          setMessages([
            { id: "intro", role: "assistant", content: t("chat.intro", langCode) },
            ...history,
            {
              id: "resume_note",
              role: "assistant",
              content: t("chat.resumedNote", langCode) ||
                "Welcome back. Your previous conversation has been restored.",
            },
          ]);
        } else {
          // 토큰 만료/없음 → 식별 폼으로
          setMessages([{ id: "intro", role: "assistant", content: t("chat.intro", langCode) }]);
        }
      } catch (e) {
        console.warn("[ThreadChat] resume failed:", e);
        setMessages([{ id: "intro", role: "assistant", content: t("chat.intro", langCode) }]);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }
    tryResume();
    return () => {
      cancelled = true;
    };
  }, [langCode, startAnonymousThread]);

  // 기존 thread 복구 (이름·이메일 매칭 후 사용자 확인 거친 토큰)
  const resumeWithToken = useCallback(
    async (token, fallbackGuest) => {
      try {
        const res = await fetch(`/api/public/chat/resume?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!json.ok || !json.thread) throw new Error("resume_failed");
        setThreadId(json.thread.id);
        setPublicToken(json.thread.public_token);
        setGuest(json.thread.guest || fallbackGuest);
        writeCookie(TOKEN_COOKIE, json.thread.public_token);
        // PIPA: 동의 기록 없는 기존 thread면 게이트를 띄워 동의 백필.
        if (json.thread.has_consent === false) setNeedsConsent(true);

        const history = (json.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }));
        setMessages([
          { id: "intro", role: "assistant", content: t("chat.intro", langCode) },
          ...history,
          {
            id: `resumed_${Date.now()}`,
            role: "assistant",
            content: t("chat.resumedNote", langCode) || "Welcome back. Your previous conversation has been restored.",
          },
        ]);
        return true;
      } catch (e) {
        console.warn("[ThreadChat] resume by token failed:", e);
        return false;
      }
    },
    [langCode]
  );

  const handleIdentify = useCallback(
    async ({ name, email, country, consent }) => {
      setIdentifying(true);
      try {
        const browserSessionId = ensureBrowserSessionId();

        // 1) 이메일 있으면 lookup — 다른 기기·새 브라우저에서도 복구
        if (email && email.includes("@")) {
          try {
            const lookupRes = await fetch("/api/public/chat/lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email }),
            });
            const lookupJson = await lookupRes.json();
            if (lookupJson.ok && lookupJson.found && lookupJson.public_token) {
              const confirmMsg = t("chat.identify.resumePrompt", langCode) ||
                "We found your previous conversation. Continue from where you left off?";
              if (typeof window !== "undefined" && window.confirm(confirmMsg)) {
                const ok = await resumeWithToken(lookupJson.public_token, { name, email, country });
                if (ok) return;
              }
              // 사용자가 No → 새 thread 진행
            }
          } catch (e) {
            // lookup 실패해도 그냥 새 thread 진행
            console.warn("[ThreadChat] lookup failed, starting new:", e);
          }
        }

        // 2) 새 thread 생성
        const res = await fetch("/api/public/chat/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: langCode,
            guest_name: name,
            guest_email: email || null,
            guest_country: country,
            browser_session_id: browserSessionId,
            landing_path: typeof window !== "undefined" ? window.location.pathname : null,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
            // PIPA: 폼 체크박스 동의. 서버 재검증.
            consent: consent === true,
            consent_version: "1.0.0",
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "start_failed");

        setThreadId(json.thread_id);
        setPublicToken(json.public_token);
        setGuest({ name, email, country });
        writeCookie(TOKEN_COOKIE, json.public_token);

        // 인사 추가
        setMessages((prev) => [
          ...prev,
          {
            id: `greet_${Date.now()}`,
            role: "assistant",
            content: (t("chat.identify.greeting", langCode) || "Hello {name}, how can I help you today?")
              .replace("{name}", name),
          },
        ]);
      } catch (e) {
        console.error("[ThreadChat] identify failed:", e);
        alert(t("chat.errorRetry", langCode) || "Failed to start. Please try again.");
      } finally {
        setIdentifying(false);
      }
    },
    [langCode, resumeWithToken]
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    const outgoingFiles = attachments;
    if ((!trimmed && outgoingFiles.length === 0) || sending || uploading || !threadId || !publicToken) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      role: "user",
      content: trimmed,
      attachments: outgoingFiles,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachments([]);
    setSending(true);

    // 메타 프레임 구분자(RS, U+001E) — 서버 STREAM_META_DELIM 와 동일해야 함.
    const META_DELIM = "";
    const aiId = `ai_${Date.now()}`;

    try {
      const res = await fetch("/api/public/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          public_token: publicToken,
          message_text: trimmed,
          attachments: outgoingFiles,
        }),
      });

      // 스트림 시작 전 차단(회수제한·토큰오류·닫힌 스레드)은 JSON 오류로 옴.
      if (!res.ok || !res.body) {
        let errMsg = res.statusText;
        try {
          const j = await res.json();
          errMsg = j.error || errMsg;
        } catch {
          /* 본문이 JSON 이 아님 */
        }
        setMessages((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, role: "assistant", content: `Error: ${errMsg}. Please try again.` },
        ]);
        return;
      }

      // 빈 말풍선을 먼저 띄우고 채운다.
      setMessages((prev) => [...prev, { id: aiId, role: "assistant", content: "" }]);

      // 받기(network) ↔ 보여주기(display)를 분리한다.
      // 모델/네트워크는 토큰을 뭉텅뭉텅 보내므로, 그걸 그대로 그리면 끊겨 보인다.
      // target 에 받은 전체 텍스트를 쌓고, 화면에는 일정 속도로 글자를 흘려보내(타자기 버퍼)
      // 도착이 들쭉날쭉해도 매끄럽게 타이핑되는 것처럼 보이게 한다(ChatGPT 방식).
      let target = "";        // 지금까지 받은 응답 본문(메타 제외)
      let meta = null;
      let streamDone = false;

      const readLoop = (async () => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const i = buffer.indexOf(META_DELIM);
            target = i === -1 ? buffer : buffer.slice(0, i);
          }
          const i = buffer.indexOf(META_DELIM);
          target = i === -1 ? buffer : buffer.slice(0, i);
          if (i !== -1) {
            try {
              meta = JSON.parse(buffer.slice(i + META_DELIM.length));
            } catch {
              /* 메타 파싱 실패는 무시 */
            }
          }
        } finally {
          // 읽기 오류가 나도 타자기 루프가 멈추도록 항상 종료 표시(무한대기 방지).
          streamDone = true;
        }
      })();

      // 타자기 버퍼: 25ms마다 남은 글자의 일부를 드러낸다(뒤처지면 더 빨리 따라잡음).
      let shown = 0;
      await new Promise((resolve) => {
        const timer = setInterval(() => {
          if (shown < target.length) {
            const remaining = target.length - shown;
            const step = Math.max(2, Math.ceil(remaining / 8));
            shown = Math.min(target.length, shown + step);
            const slice = target.slice(0, shown);
            setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: slice } : m)));
          } else if (streamDone) {
            clearInterval(timer);
            resolve();
          }
        }, 25);
      });
      await readLoop; // 메타 캡처 보장

      const finalText = (target || "").trim();
      const safeText =
        finalText ||
        (t("chat.aiUnavailable", langCode) ||
          "I'm having trouble generating a response right now. Please try again in a moment.");
      setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: safeText } : m)));

      if (meta?.ai_error) {
        console.warn("[ThreadChat] AI returned error reply:", meta.ai_error);
      }
      if (meta?.hand_off?.requested) {
        setHandOff(true);
      }
    } catch (e) {
      console.error("[ThreadChat] unexpected error:", e);
      const errText = t("chat.errorRetry", langCode) || "Something went wrong. Please try again.";
      // 스트림 도중 끊긴 경우: 비어 있는 응답 말풍선이 있으면 그 자리에 오류를 채우고,
      // 없으면(요청 자체 실패) 새 오류 말풍선을 추가한다(중복 방지).
      setMessages((prev) => {
        const bubble = prev.find((m) => m.id === aiId);
        if (bubble && !bubble.content) {
          return prev.map((m) => (m.id === aiId ? { ...m, content: errText } : m));
        }
        if (bubble) return prev; // 부분 응답이라도 표시됨 → 그대로 둠
        return [...prev, { id: `err_${Date.now()}`, role: "assistant", content: errText }];
      });
    } finally {
      setSending(false);
    }
  };

  const needsIdentification = !restoring && !threadId && !needsConsent;

  return (
    // 높이: 작은 폰(iPhone SE 등)에서 600px 고정이 하단 탭바에 깔리던 문제 →
    // 화면 높이에 맞춰 줄어들되(min 420px) 데스크톱은 기존 600px 유지
    <div className="bg-white border border-gray-200 rounded-3xl shadow-xl h-full min-h-0 flex flex-col p-3 sm:p-4 animate-in fade-in slide-in-from-right-4">
      {restoring ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <Loader2 size={20} className="animate-spin mr-2" />
          {t("chat.loading", langCode) || "Loading..."}
        </div>
      ) : needsConsent ? (
        <ConsentGate langCode={langCode} onConsent={handleConsentStart} submitting={identifying} />
      ) : needsIdentification ? (
        <IdentificationForm langCode={langCode} onSubmit={handleIdentify} submitting={identifying} />
      ) : (
        <>
          {/* 채팅 메시지 */}
          <div className="flex-1 overflow-y-auto mb-3 bg-gray-50 rounded-2xl p-3 sm:p-4 text-left space-y-4" ref={chatRef}>
            {guest?.name && (
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="text-[11px] text-gray-400">
                  {(t("chat.identifiedAs", langCode) || "Conversing as {name} · {country}")
                    .replace("{name}", guest.name)
                    .replace("{country}", guest.country || "")}
                </div>
                <button
                  onClick={() => {
                    if (!window.confirm(t("chat.endSession.confirm", langCode) || "End this conversation and clear local history? (Server-side history is kept for follow-up.)")) return;
                    if (typeof document !== "undefined") {
                      document.cookie = "healo_chat_token=; path=/; max-age=0; SameSite=Lax";
                      document.cookie = "healo_browser_session=; path=/; max-age=0; SameSite=Lax";
                    }
                    window.location.reload();
                  }}
                  className="text-[10px] text-gray-400 hover:text-red-600 underline underline-offset-2 transition"
                  title={t("chat.endSession.button", langCode) || "End conversation"}
                >
                  {t("chat.endSession.button", langCode) || "End conversation"}
                </button>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex flex-col gap-1 max-w-[90%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3 rounded-2xl shadow-sm text-xs leading-relaxed border ${
                      msg.role === "assistant"
                        ? "bg-white border-gray-100"
                        : "bg-teal-700 text-white border-teal-700"
                    }`}
                  >
                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                    {/* 스트리밍 첫 글자 도착 전 빈 말풍선 → 타이핑 점(생각 중) 표시 */}
                    {!msg.content &&
                      msg.role === "assistant" &&
                      (!Array.isArray(msg.attachments) || msg.attachments.length === 0) && (
                        <TypingDots />
                      )}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className={`flex flex-col gap-1.5 ${msg.content ? "mt-2" : ""}`}>
                        {msg.attachments.map((f, i) => {
                          const isImg = (f.type || "").startsWith("image/");
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                                msg.role === "user" ? "bg-teal-700/40" : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {isImg ? <ImageIcon size={14} className="shrink-0" /> : <FileText size={14} className="shrink-0" />}
                              <span className="truncate max-w-[180px]">{f.name || "file"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* assistant 메시지만 피드백 버튼 표시 (intro/resume 제외) */}
                  {msg.role === "assistant" && !["intro", "resume_note"].includes(msg.id) && !msg.id.startsWith("resumed_") && !msg.id.startsWith("greet_") && threadId && (
                    <div className="flex items-center gap-1 pl-1">
                      {feedbackThanks === msg.id ? (
                        <span className="text-[11px] text-teal-700 font-medium">
                          {t("chat.feedback.thanks", langCode) || "Thank you!"}
                        </span>
                      ) : feedbackDone[msg.id] ? (
                        <span className="text-[11px] text-gray-400">
                          {feedbackDone[msg.id] === "positive"
                            ? (t("chat.feedback.helpful", langCode) || "Helpful") + " ✓"
                            : (t("chat.feedback.notHelpful", langCode) || "Not helpful") + " ✓"}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleThumbsUp(msg.id)}
                            aria-label="Helpful"
                            title={t("chat.feedback.helpful", langCode) || "Helpful"}
                            className="p-1 rounded-lg text-gray-300 hover:text-teal-700 hover:bg-teal-50 transition"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => handleThumbsDown(msg.id)}
                            aria-label="Not helpful"
                            title={t("chat.feedback.notHelpful", langCode) || "Not helpful"}
                            className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* 응답 말풍선이 아직 안 뜬 짧은 순간(요청~응답 헤더)만 생각 중 점 표시.
                말풍선이 뜨면 그 안의 TypingDots 가 이어받아 중복·잔존 스피너를 없앤다. */}
            {sending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl shadow-sm text-sm border bg-white border-gray-100">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Hand-off banner */}
          {handOff && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{t("chat.handoffNote", langCode) || "A human coordinator has been notified. You can continue chatting while you wait."}</span>
            </div>
          )}

          {/* 대기 중 첨부 미리보기 칩 */}
          {(attachments.length > 0 || uploading || uploadError) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {attachments.map((f, i) => {
                const isImg = (f.type || "").startsWith("image/");
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg pl-2 pr-1 py-1 text-xs">
                    {isImg ? <ImageIcon size={13} /> : <FileText size={13} />}
                    <span className="truncate max-w-[140px]">{f.name || "file"}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="p-0.5 hover:bg-teal-100 rounded-full"
                      aria-label="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
              {uploading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader2 size={13} className="animate-spin" /> {t("chat.upload.uploading", langCode) || "Uploading..."}
                </span>
              )}
              {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
            </div>
          )}

          {/* Input — 통합 입력 박스(클립·입력칸·전송이 한 테두리 안 → 회색 막대 없음, Claude/GPT 방식) */}
          <div className="flex items-end gap-1.5 border border-gray-300 rounded-3xl px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-teal-500 transition">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading || attachments.length >= MAX_ATTACHMENTS}
              aria-label={t("chat.upload.attach", langCode) || "Attach file (test results, photos)"}
              title={t("chat.upload.attach", langCode) || "Attach file (test results, photos)"}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-teal-600 rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("chat.placeholder", langCode)}
              className="flex-1 resize-none border-0 bg-transparent outline-none py-1.5 leading-relaxed text-xs max-h-32 overflow-y-auto"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              aria-label="Send message"
              disabled={sending || uploading || (!input.trim() && attachments.length === 0)}
              className="shrink-0 w-9 h-9 flex items-center justify-center bg-teal-700 text-white rounded-full hover:bg-teal-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
          </div>

          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-start gap-2 text-left">
            <AlertCircle size={13} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-snug">
              <span className="font-semibold text-gray-700">{t("chat.noteLabel", langCode)}</span> {t("chat.noteText", langCode)}
            </p>
          </div>
        </>
      )}

      {/* 피드백 모달 */}
      {feedbackModal && (
        <FeedbackModal
          langCode={langCode}
          messageId={feedbackModal.messageId}
          threadId={threadId}
          publicToken={publicToken}
          onClose={() => setFeedbackModal(null)}
          onSubmitted={() => handleFeedbackSubmitted(feedbackModal.messageId)}
        />
      )}
    </div>
  );
}
