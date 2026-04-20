"use client";

/**
 * DesignToggle — 우하단 작은 플로팅 버튼으로 디자인 모드 전환 (QA 용도)
 *
 * 작동 방식: 쿠키 `healo_design` 에 저장 후 페이지 새로고침.
 * 서버와 클라이언트 둘 다 이 쿠키를 읽어 일관된 모드 적용.
 *
 * 배포 전 production에서 숨기려면 env NEXT_PUBLIC_DESIGN_TOGGLE=off 로 설정.
 */

import { useState, useEffect } from "react";
import { getClientDesignMode, toggleDesignMode } from "../../src/lib/designMode";

export default function DesignToggle() {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    setMode(getClientDesignMode());
  }, []);

  // 환경변수로 숨김 가능
  const isHidden = process.env.NEXT_PUBLIC_DESIGN_TOGGLE === "off";
  if (isHidden || mode === null) return null;

  const isPremium = mode === "premium";

  return (
    <button
      onClick={toggleDesignMode}
      aria-label={`Switch to ${isPremium ? "Legacy" : "Premium"} design`}
      title={`Current: ${isPremium ? "Premium" : "Legacy"}. Click to switch.`}
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: isPremium ? "var(--ink-0, #0a0a0a)" : "#0d9488",
        color: isPremium ? "var(--gold-0, #c8a96a)" : "#ffffff",
        border: isPremium
          ? "1px solid var(--gold-0, #c8a96a)"
          : "1px solid rgba(255,255,255,0.4)",
        borderRadius: 2,
        padding: "6px 10px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        opacity: 0.6,
        transition: "opacity 150ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
    >
      {isPremium ? "◆ Premium" : "◇ Legacy"} · Switch
    </button>
  );
}
