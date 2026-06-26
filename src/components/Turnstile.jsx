"use client";

import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile 위젯 — "로봇 아님" 자동 확인(managed). 대부분 클릭 없이 통과.
// NEXT_PUBLIC_TURNSTILE_SITE_KEY 없으면 아무것도 안 그리고 onVerify("")만 즉시 호출
// → 키 설정 전엔 캡차 없이 기존 흐름 그대로(안 깨짐).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export const turnstileEnabled = !!SITE_KEY;

export default function Turnstile({ onVerify }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  // 키 없으면 캡차 생략 — 빈 토큰으로 통과 신호
  useEffect(() => {
    if (!SITE_KEY) onVerify("");
  }, [onVerify]);

  // CF 스크립트 1회 로드
  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.turnstile) { setReady(true); return; }
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const t = setInterval(() => { if (window.turnstile) { setReady(true); clearInterval(t); } }, 100);
      return () => clearInterval(t);
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  // 위젯 렌더 — 통과 시 onVerify(token), 만료 시 빈 토큰
  useEffect(() => {
    if (!ready || !SITE_KEY || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (token) => onVerify(token),
      "expired-callback": () => onVerify(""),
      "error-callback": () => onVerify(""),
    });
    return () => { try { window.turnstile.remove(id); } catch {} };
  }, [ready, onVerify]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="flex justify-center min-h-[65px]" />;
}
