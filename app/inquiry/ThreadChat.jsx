"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, AlertCircle, Loader2, User, Bot } from "lucide-react";
import { getLangCodeFromCookie, t } from "../../src/lib/i18n";

export function ThreadChat() {
  const [threadId, setThreadId] = useState(null);
  const [publicToken, setPublicToken] = useState(null);
  const langCode = getLangCodeFromCookie();
  const [messages, setMessages] = useState([
    {
      id: "intro",
      role: "assistant",
      content: t("chat.intro", langCode),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handOff, setHandOff] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const startThread = useCallback(async () => {
    if (threadId) return { threadId, publicToken };
    try {
      const lang = getLangCodeFromCookie() || "en";
      const res = await fetch("/api/public/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          landing_path: typeof window !== "undefined" ? window.location.pathname : null,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setThreadId(json.thread_id);
      setPublicToken(json.public_token);
      return { threadId: json.thread_id, publicToken: json.public_token };
    } catch (e) {
      console.error("Failed to start thread:", e);
      return null;
    }
  }, [threadId, publicToken]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg = { id: `u_${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const session = await startThread();
      if (!session) {
        setMessages((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, role: "assistant", content: "Sorry, failed to connect. Please refresh and try again." },
        ]);
        return;
      }

      const res = await fetch("/api/public/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: session.threadId,
          public_token: session.publicToken,
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

      console.log("[ThreadChat] response:", { status: res.status, ok: json.ok, hasReply: !!json.reply, aiError: json.ai_error || null });

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
          { id: `ai_${Date.now()}`, role: "assistant", content: t("chat.aiUnavailable", langCode) || "I'm having trouble generating a response right now. Please try again in a moment, or submit an inquiry form for a faster reply." },
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

  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-xl h-[600px] flex flex-col p-4 animate-in fade-in slide-in-from-right-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-2xl p-4 text-left space-y-4" ref={chatRef}>
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
          <span>A human coordinator has been notified. You can continue chatting while you wait.</span>
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
    </div>
  );
}
