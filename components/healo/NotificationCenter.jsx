"use client";

/**
 * NotificationCenter
 *
 * 헤더 우측 종 아이콘 + 미읽음 뱃지.
 * 클릭 시 드롭다운 (최근 10개).
 * - "모두 읽음" 버튼
 * - "더 보기" → /notifications
 *
 * 실시간 토스트는 이 컴포넌트가 담당 (신규 알림 감지 → NotificationToast 렌더).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { useLang } from "@/lib/i18n/LangContext";
import NotificationToast from "./NotificationToast";

const PRIORITY_DOT = {
  low:    "#9ca3af",
  normal: "#14b8a6",
  high:   "#f97316",
  urgent: "#ef4444",
};

/* ───────── i18n (6개 언어) ───────── */
const COPY = {
  ko: {
    title: "알림",
    markAllRead: "모두 읽음",
    loading: "불러오는 중…",
    empty: "알림이 없습니다",
    viewAll: "전체 알림 보기 →",
    ariaBell: "알림",
    ariaUnread: (n) => `(미읽음 ${n}개)`,
    time: { now: "방금", min: (n) => `${n}분 전`, hour: (n) => `${n}시간 전`, day: (n) => `${n}일 전` },
  },
  en: {
    title: "Notifications",
    markAllRead: "Mark all read",
    loading: "Loading…",
    empty: "No notifications",
    viewAll: "View all notifications →",
    ariaBell: "Notifications",
    ariaUnread: (n) => `(${n} unread)`,
    time: { now: "Just now", min: (n) => `${n} min ago`, hour: (n) => `${n} h ago`, day: (n) => `${n} d ago` },
  },
  ru: {
    title: "Уведомления",
    markAllRead: "Отметить всё",
    loading: "Загрузка…",
    empty: "Нет уведомлений",
    viewAll: "Все уведомления →",
    ariaBell: "Уведомления",
    ariaUnread: (n) => `(${n} непрочитанных)`,
    time: { now: "Только что", min: (n) => `${n} мин назад`, hour: (n) => `${n} ч назад`, day: (n) => `${n} дн назад` },
  },
  kz: {
    title: "Хабарламалар",
    markAllRead: "Барлығын оқылды деп белгілеу",
    loading: "Жүктелуде…",
    empty: "Хабарлама жоқ",
    viewAll: "Барлық хабарламалар →",
    ariaBell: "Хабарламалар",
    ariaUnread: (n) => `(${n} оқылмаған)`,
    time: { now: "Жаңа ғана", min: (n) => `${n} мин бұрын`, hour: (n) => `${n} сағ бұрын`, day: (n) => `${n} күн бұрын` },
  },
  zh: {
    title: "通知",
    markAllRead: "全部标为已读",
    loading: "加载中…",
    empty: "暂无通知",
    viewAll: "查看全部通知 →",
    ariaBell: "通知",
    ariaUnread: (n) => `(${n} 条未读)`,
    time: { now: "刚刚", min: (n) => `${n} 分钟前`, hour: (n) => `${n} 小时前`, day: (n) => `${n} 天前` },
  },
  ja: {
    title: "通知",
    markAllRead: "すべて既読",
    loading: "読み込み中…",
    empty: "通知はありません",
    viewAll: "すべての通知を見る →",
    ariaBell: "通知",
    ariaUnread: (n) => `(未読 ${n}件)`,
    time: { now: "たった今", min: (n) => `${n} 分前`, hour: (n) => `${n} 時間前`, day: (n) => `${n} 日前` },
  },
};

function timeAgo(dateStr, c) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return c.time.now;
  if (min < 60) return c.time.min(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return c.time.hour(hr);
  return c.time.day(Math.floor(hr / 24));
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState([]); // 실시간 토스트 큐
  const dropRef = useRef(null);
  const prevCountRef = useRef(null);
  const router = useRouter();
  const lang = useLang();
  const c = COPY[lang] || COPY.en;

  const { items, unreadCount, loading, markAsRead, markAllRead } = useNotifications();

  // 신규 알림 감지 → 토스트 추가
  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = items.length;
      return;
    }
    const newItems = items.slice(0, items.length - prevCountRef.current);
    prevCountRef.current = items.length;

    // 가장 최신 1개만 토스트 (스팸 방지)
    const newest = items[0];
    if (newest && !newest.read_at && newItems.length > 0) {
      const toastId = `toast-${newest.id}`;
      setToasts((prev) => {
        // 중복 방지
        if (prev.some((t) => t.id === toastId)) return prev;
        return [...prev, { id: toastId, notification: newest }];
      });
    }
  }, [items]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function removeToast(toastId) {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }

  async function handleItemClick(item) {
    setOpen(false);
    if (!item.read_at) await markAsRead(item.id);
    if (item.link) router.push(item.link);
  }

  const preview = items.slice(0, 10);

  return (
    <>
      {/* 토스트 컨테이너 — 우상단 고정 */}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: 72,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <NotificationToast
              notification={t.notification}
              onClose={() => removeToast(t.id)}
            />
          </div>
        ))}
      </div>

      {/* 종 아이콘 + 드롭다운 */}
      <div ref={dropRef} style={{ position: "relative" }}>
        <button
          aria-label={`${c.ariaBell} ${unreadCount > 0 ? c.ariaUnread(unreadCount) : ""}`}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen(!open)}
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "var(--fg-on-light-1)",
            padding: 0,
          }}
        >
          {/* 종 아이콘 */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>

          {/* 미읽음 뱃지 */}
          {unreadCount > 0 && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "var(--gold-0, #c8a96a)",
                color: "var(--ink-0, #1a1a1a)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 9,
                fontWeight: 700,
                lineHeight: 1,
                padding: "3px 5px",
                borderRadius: 999,
                minWidth: 14,
                textAlign: "center",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* 드롭다운 */}
        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 320,
              background: "var(--paper, #fff)",
              border: "1px solid var(--cream-2, #e5e0d8)",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              zIndex: 200,
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--cream-2, #e5e0d8)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--fg-on-light-1)",
                }}
              >
                {c.title}
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 999,
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  style={{
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--gold-2, #b8860b)",
                    fontWeight: 600,
                    padding: "2px 6px",
                  }}
                >
                  {c.markAllRead}
                </button>
              )}
            </div>

            {/* 목록 */}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  {c.loading}
                </div>
              ) : preview.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  {c.empty}
                </div>
              ) : (
                preview.map((item) => (
                  <button
                    key={item.id}
                    role="menuitem"
                    onClick={() => handleItemClick(item)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      background: item.read_at ? "transparent" : "var(--gold-tint, rgba(200,169,106,0.06))",
                      border: 0,
                      borderBottom: "1px solid var(--cream-2, #e5e0d8)",
                      cursor: "pointer",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cream-0, #faf7f2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = item.read_at ? "transparent" : "var(--gold-tint, rgba(200,169,106,0.06))"; }}
                  >
                    {/* 우선순위 점 */}
                    <span
                      aria-hidden
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: item.read_at ? "#d1d5db" : (PRIORITY_DOT[item.priority] || "#14b8a6"),
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: item.read_at ? 400 : 600,
                          color: "var(--fg-on-light-1)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "var(--fg-on-light-3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.body}
                      </p>
                      <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "block" }}>
                        {timeAgo(item.created_at, c)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* 더 보기 */}
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--cream-2, #e5e0d8)" }}>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--gold-2, #b8860b)",
                  textDecoration: "none",
                  padding: "4px 0",
                }}
              >
                {c.viewAll}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
