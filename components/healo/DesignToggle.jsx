"use client";

/**
 * DesignToggle — 화면 우측 하단 플로팅 버튼으로 디자인 모드 즉시 전환
 *
 * 개발·QA 중에만 표시. 배포 전에는 env var로 강제하거나 이 컴포넌트 제거.
 * 현재는 localStorage 기반이므로 브라우저에서만 작동.
 */

import { useState, useEffect } from "react";
import { getClientDesignMode, setDesignMode } from "../../src/lib/designMode";

export default function DesignToggle() {
  const [mode, setMode] = useState("premium");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMode(getClientDesignMode());
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        background: "var(--ink-0, #0a0a0a)",
        color: "var(--gold-0, #c8a96a)",
        border: "1px solid var(--gold-0, #c8a96a)",
        borderRadius: 2,
        padding: "8px 14px",
        fontFamily: "var(--font-sans, system-ui)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        opacity: 0.85,
        transition: "opacity 150ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
      onClick={() => setDesignMode(mode === "premium" ? "legacy" : "premium")}
      title="Toggle HEALO design mode (premium ↔ legacy)"
    >
      {mode === "premium" ? "◆ Premium" : "◇ Legacy"} &nbsp;→&nbsp;{" "}
      {mode === "premium" ? "Legacy" : "Premium"}
    </div>
  );
}
