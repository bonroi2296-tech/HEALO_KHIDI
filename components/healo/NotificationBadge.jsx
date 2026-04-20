"use client";

/**
 * 환자 대시보드 링크에 붙는 작은 알림 배지.
 * Nav에서 사용. 로그인 시 Supabase에서 count 가져옴.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../src/lib/supabase/browser";

export default function NotificationBadge() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        // 열린 스레드 + 예정된 오늘 상담
        const today = new Date().toISOString().slice(0, 10);
        const [threadsRes, consRes] = await Promise.all([
          supabase
            .from("chat_threads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("status", "open"),
          supabase
            .from("consultation_sessions")
            .select("id", { count: "exact", head: true })
            .eq("patient_user_id", session.user.id)
            .eq("status", "scheduled")
            .gte("scheduled_at", `${today}T00:00:00Z`)
            .lte("scheduled_at", `${today}T23:59:59Z`),
        ]);
        const total = (threadsRes.count || 0) + (consRes.count || 0);
        setCount(total);
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  if (!mounted || count === 0) return null;

  return (
    <Link
      href="/patient"
      aria-label={`${count} notifications`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        textDecoration: "none",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--fg-on-light-1)" }}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <span
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          background: "var(--gold-0)",
          color: "var(--ink-0)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1,
          padding: "3px 5px",
          borderRadius: 999,
          minWidth: 14,
          textAlign: "center",
        }}
      >
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
