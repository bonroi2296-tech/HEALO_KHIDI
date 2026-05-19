"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, AlertCircle, Loader2, User, Bot } from "lucide-react";
import { getLangCodeFromCookie, t } from "../../src/lib/i18n";

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

  const canSubmit = name.trim().length >= 1 && country.trim().length >= 1;

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-teal-600 flex items-center justify-center text-white">
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

        <button
          onClick={() => onSubmit({ name, email, country })}
          disabled={!canSubmit || submitting}
          className="mt-4 w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition"
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

export function ThreadChat() {
  const [threadId, setThreadId] = useState(null);
  const [publicToken, setPublicToken] = useState(null);
  const [guest, setGuest] = useState(null); // { name, email, country }
  const [identifying, setIdentifying] = useState(false);
  const [restoring, setRestoring] = useState(true); // 초기 쿠키 복구 시도 중
  const langCode = getLangCodeFromCookie();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handOff, setHandOff] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // 초기 진입 시 쿠키 토큰으로 복구 시도
  useEffect(() => {
    let cancelled = false;
    async function tryResume() {
      const token = readCookie(TOKEN_COOKIE);
      if (!token) {
        if (!cancelled) setRestoring(false);
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
  }, [langCode]);

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
    async ({ name, email, country }) => {
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
    if (!trimmed || sending || !threadId || !publicToken) return;

    const userMsg = { id: `u_${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/public/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          public_token: publicToken,
          message_text: trimmed,
        }),
      });

      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        console.error("[ThreadChat] response parse failed:", parseErr, "status:", res.status);
        setMessages((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, role: "assistant", content: t("chat.errorRetry", langCode) || "Something went wrong. Please try again." },
        ]);
        return;
      }

      if (!res.ok || !json.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, role: "assistant", content: `Error: ${json.error || res.statusText}. Please try again.` },
        ]);
        return;
      }

      if (json.ai_error) {
        console.warn("[ThreadChat] AI returned error reply:", json.ai_error);
        setMessages((prev) => [
          ...prev,
          { id: `ai_${Date.now()}`, role: "assistant", content: t("chat.aiUnavailable", langCode) || "I'm having trouble generating a response right now. Please try again in a moment." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `ai_${Date.now()}`, role: "assistant", content: json.reply },
      ]);

      if (json.hand_off?.requested) {
        setHandOff(true);
      }
    } catch (e) {
      console.error("[ThreadChat] unexpected error:", e);
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: "assistant", content: t("chat.errorRetry", langCode) || "Something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const needsIdentification = !restoring && !threadId;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-xl h-[600px] flex flex-col p-4 animate-in fade-in slide-in-from-right-4">
      {restoring ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <Loader2 size={20} className="animate-spin mr-2" />
          {t("chat.loading", langCode) || "Loading..."}
        </div>
      ) : needsIdentification ? (
        <IdentificationForm langCode={langCode} onSubmit={handleIdentify} submitting={identifying} />
      ) : (
        <>
          {/* 채팅 메시지 */}
          <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-2xl p-4 text-left space-y-4" ref={chatRef}>
            {guest?.name && (
              <div className="text-[11px] text-gray-400 text-center pb-2 border-b border-gray-200">
                {(t("chat.identifiedAs", langCode) || "Conversing as {name} · {country}")
                  .replace("{name}", guest.name)
                  .replace("{country}", guest.country || "")}
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    msg.role === "assistant" ? "bg-teal-600" : "bg-gray-400"
                  }`}
                >
                  {msg.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div
                  className={`p-3 rounded-2xl shadow-sm text-sm border max-w-[80%] ${
                    msg.role === "assistant"
                      ? "bg-white border-gray-100 rounded-tl-none"
                      : "bg-teal-600 text-white border-teal-600 rounded-tr-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-teal-600">
                  <Bot size={16} />
                </div>
                <div className="p-3 rounded-2xl shadow-sm text-sm border bg-white border-gray-100 rounded-tl-none">
                  <Loader2 size={16} className="animate-spin text-teal-500" />
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

          {/* Input */}
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={t("chat.placeholder", langCode)}
              className="w-full border border-gray-300 rounded-full py-3 px-5 pr-12 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="absolute right-2 top-1.5 bg-teal-600 text-white p-1.5 rounded-full hover:bg-teal-700 transition disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
          </div>

          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2.5 text-left">
            <AlertCircle size={16} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-800">{t("chat.noteLabel", langCode)}</span> {t("chat.noteText", langCode)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
