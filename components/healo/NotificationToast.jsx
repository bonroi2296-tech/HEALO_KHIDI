"use client";

/**
 * NotificationToast
 *
 * Realtime 신규 알림을 우상단에 슬라이드 인으로 보여준다.
 * - 자동 닫힘 5초
 * - priority 별 색상: low=회색, normal=teal, high=주황, urgent=빨강
 * - 클릭 시 link 이동 + read_at 업데이트
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangContext";

/* ───────── i18n (6개 언어) ───────── */
const COPY = {
  ko: { close: "닫기" },
  en: { close: "Close" },
  ru: { close: "Закрыть" },
  kz: { close: "Жабу" },
  zh: { close: "关闭" },
  ja: { close: "閉じる" },
};

const PRIORITY_STYLES = {
  low:    { border: "#d1d5db", bg: "#f9fafb", text: "#374151", dot: "#9ca3af" },
  normal: { border: "#99f6e4", bg: "#f0fdfa", text: "#0f766e", dot: "#14b8a6" },
  high:   { border: "#fed7aa", bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  urgent: { border: "#fecaca", bg: "#fff1f2", text: "#b91c1c", dot: "#ef4444" },
};

export default function NotificationToast({ notification, onClose }) {
  const router = useRouter();
  const timerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const lang = useLang();
  const c = COPY[lang] || COPY.en;

  // mount 시 슬라이드 인
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => handleClose(), 5000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timerRef.current);
    };
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(() => onClose?.(), 300); // 애니메이션 후 언마운트
  }

  function handleClick() {
    onClose?.();
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const priority = notification.priority || "normal";
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal;

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={handleClick}
      style={{
        cursor: notification.link ? "pointer" : "default",
        minWidth: 280,
        maxWidth: 360,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        transition: "transform 300ms ease, opacity 300ms ease",
        transform: visible ? "translateX(0)" : "translateX(110%)",
        opacity: visible ? 1 : 0,
      }}
    >
      {/* 우선순위 색점 */}
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: style.dot,
          flexShrink: 0,
          marginTop: 5,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 13,
            color: style.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notification.title}
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: 12,
            color: style.text,
            opacity: 0.8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {notification.body}
        </p>
      </div>

      {/* 닫기 버튼 */}
      <button
        aria-label={c.close}
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        style={{
          background: "transparent",
          border: 0,
          cursor: "pointer",
          padding: "2px 4px",
          color: style.text,
          opacity: 0.5,
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
