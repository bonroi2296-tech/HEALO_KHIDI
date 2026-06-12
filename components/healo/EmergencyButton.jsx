"use client";

/**
 * 응급 SOS 버튼 — 모든 환자 페이지에 떠있는 플로팅 버튼.
 * 클릭 시 각국 응급 전화 + HEALO 24시간 핫라인 + 코디네이터 즉시 알림 모달.
 */

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const COPY = {
  en: {
    sos: "SOS",
    title: "Emergency",
    titleItalic: "help.",
    body: "If you are in immediate danger, call your local emergency number.",
    local: "Local emergency",
    healo: "HEALO coordinator",
    healoNote: "24/7 urgent line (message + call back within 10 min)",
    sendAlert: "Alert my coordinator now",
    sent: "Alert sent. A coordinator will contact you within 10 minutes.",
    sending: "Sending…",
    close: "Close",
    countries: {
      kr: "Korea",
      kz: "Kazakhstan",
      ru: "Russia",
      cn: "China",
      jp: "Japan",
    },
    numbers: {
      kr: "119",
      kz: "103 / 112",
      ru: "103 / 112",
      cn: "120",
      jp: "119",
    },
    healoPhone: "+82 10 4772 1075",
  },
  ko: {
    sos: "SOS",
    title: "응급",
    titleItalic: "도움.",
    body: "즉각적인 위험에 처해 있다면 먼저 현지 응급번호로 전화하세요.",
    local: "현지 응급번호",
    healo: "HEALO 코디네이터",
    healoNote: "24시간 긴급 회선 (메시지 + 10분 내 콜백)",
    sendAlert: "지금 코디네이터에게 알리기",
    sent: "알림이 전송되었습니다. 10분 내 코디네이터가 연락드립니다.",
    sending: "전송 중…",
    close: "닫기",
    countries: {
      kr: "한국",
      kz: "카자흐스탄",
      ru: "러시아",
      cn: "중국",
      jp: "일본",
    },
    numbers: {
      kr: "119",
      kz: "103 / 112",
      ru: "103 / 112",
      cn: "120",
      jp: "119",
    },
    healoPhone: "+82 10 4772 1075",
  },
};

export default function EmergencyButton() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function sendAlert() {
    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert("Please sign in to send an alert to your coordinator.");
        return;
      }

      // chat_threads 는 service_role 전용 RLS → 서버 API가 스레드 생성+메시지+상태 일괄 처리
      const res = await fetch("/api/portal/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lang }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "sos_failed");

      setSent(true);
    } catch (e) {
      console.error("[sos] error", e);
    } finally {
      setSending(false);
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => { setOpen(true); setSent(false); }}
        aria-label="Emergency SOS"
        className="healo-safe-bottom healo-no-print"
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 9998,
          background: "#8c3a2e",
          color: "#fff",
          border: 0,
          borderRadius: 2,
          padding: "12px 18px",
          fontFamily: "var(--font-sans, system-ui)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(140,58,46,0.4)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
        }}
      >
        <span style={{ fontSize: 14 }}>●</span> {copy.sos}
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,10,0.7)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#0a0a0a",
              color: "#f5f0e8",
              border: "1px solid #c8a96a",
              padding: "40px 32px",
              maxHeight: "90vh",
              overflowY: "auto",
              fontFamily: "var(--font-sans, system-ui)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#8c3a2e",
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              🚨 SOS · {copy.title}
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 36,
                fontWeight: 400,
                lineHeight: 1.1,
                margin: "0 0 16px",
              }}
            >
              {copy.title} <span style={{ fontStyle: "italic", color: "#c8a96a" }}>{copy.titleItalic}</span>
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "#c7c2b8",
                margin: "0 0 24px",
              }}
            >
              {copy.body}
            </p>

            {/* Local emergency numbers */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#c8a96a",
                  fontWeight: 600,
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom: "1px solid rgba(200,169,106,0.3)",
                }}
              >
                {copy.local}
              </div>
              {Object.keys(copy.countries).map((c) => (
                <a
                  key={c}
                  href={`tel:${copy.numbers[c].replace(/[^\d]/g, "")}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #2a2a2a",
                    color: "#f5f0e8",
                    textDecoration: "none",
                    fontSize: 13,
                  }}
                >
                  <span>{copy.countries[c]}</span>
                  <span style={{ fontFamily: "SF Mono, monospace", color: "#c8a96a", fontWeight: 600 }}>
                    {copy.numbers[c]}
                  </span>
                </a>
              ))}
            </div>

            {/* HEALO hotline */}
            <div
              style={{
                padding: 20,
                background: "rgba(200,169,106,0.08)",
                border: "1px solid rgba(200,169,106,0.3)",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "#c8a96a",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {copy.healo}
              </div>
              <a
                href={`tel:${copy.healoPhone.replace(/[^\d+]/g, "")}`}
                style={{
                  display: "block",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 24,
                  color: "#c8a96a",
                  textDecoration: "none",
                  marginBottom: 8,
                }}
              >
                {copy.healoPhone}
              </a>
              <div style={{ fontSize: 11, color: "#8a8578", lineHeight: 1.55 }}>
                {copy.healoNote}
              </div>
            </div>

            {/* In-app alert */}
            {sent ? (
              <div
                style={{
                  padding: 16,
                  background: "rgba(90,122,74,0.15)",
                  border: "1px solid #5a7a4a",
                  color: "#b8d4a8",
                  fontSize: 13,
                  lineHeight: 1.55,
                  marginBottom: 24,
                }}
              >
                ✓ {copy.sent}
              </div>
            ) : (
              <button
                onClick={sendAlert}
                disabled={sending}
                style={{
                  width: "100%",
                  background: "#c8a96a",
                  color: "#0a0a0a",
                  border: 0,
                  padding: "14px 20px",
                  cursor: sending ? "wait" : "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                  opacity: sending ? 0.6 : 1,
                  minHeight: 44,
                }}
              >
                {sending ? copy.sending : copy.sendAlert}
              </button>
            )}

            <button
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                background: "transparent",
                color: "#8a8578",
                border: "1px solid #2a2a2a",
                padding: "12px 20px",
                cursor: "pointer",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {copy.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
