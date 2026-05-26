"use client";

/**
 * /notifications — 알림 전체 목록 페이지
 *
 * - 페이지네이션 (20개씩)
 * - type 별 필터
 * - 읽음/안읽음 토글
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../src/lib/supabase/browser";
import { useLang } from "../../src/lib/i18n/LangContext";

const PAGE_SIZE = 20;

const PRIORITY_DOT = {
  low:    "#9ca3af",
  normal: "#14b8a6",
  high:   "#f97316",
  urgent: "#ef4444",
};

/* ───────── i18n (6개 언어) ───────── */
const COPY = {
  ko: {
    locale: "ko-KR",
    title: "알림",
    markAllRead: "모두 읽음",
    filterAll: "전체",
    filterUnread: "미읽음",
    filterRead: "읽음",
    typeAll: "전체 타입",
    read: "읽음",
    more: "더 보기",
    loading: "불러오는 중…",
    empty: "알림이 없습니다",
    types: { symptom_alert: "증상 알림", reminder: "리마인더", survey: "만족도 조사", system: "시스템" },
    time: { now: "방금", min: (n) => `${n}분 전`, hour: (n) => `${n}시간 전`, day: (n) => `${n}일 전` },
  },
  en: {
    locale: "en-US",
    title: "Notifications",
    markAllRead: "Mark all read",
    filterAll: "All",
    filterUnread: "Unread",
    filterRead: "Read",
    typeAll: "All types",
    read: "Read",
    more: "Load more",
    loading: "Loading…",
    empty: "No notifications",
    types: { symptom_alert: "Symptom alert", reminder: "Reminder", survey: "Satisfaction survey", system: "System" },
    time: { now: "Just now", min: (n) => `${n} min ago`, hour: (n) => `${n} h ago`, day: (n) => `${n} d ago` },
  },
  ru: {
    locale: "ru-RU",
    title: "Уведомления",
    markAllRead: "Отметить всё",
    filterAll: "Все",
    filterUnread: "Непрочитанные",
    filterRead: "Прочитанные",
    typeAll: "Все типы",
    read: "Прочитано",
    more: "Загрузить ещё",
    loading: "Загрузка…",
    empty: "Нет уведомлений",
    types: { symptom_alert: "Оповещение о симптомах", reminder: "Напоминание", survey: "Опрос удовлетворённости", system: "Система" },
    time: { now: "Только что", min: (n) => `${n} мин назад`, hour: (n) => `${n} ч назад`, day: (n) => `${n} дн назад` },
  },
  kz: {
    locale: "kk-KZ",
    title: "Хабарламалар",
    markAllRead: "Барлығын оқылды деп белгілеу",
    filterAll: "Барлығы",
    filterUnread: "Оқылмаған",
    filterRead: "Оқылған",
    typeAll: "Барлық түрлері",
    read: "Оқылды",
    more: "Тағы жүктеу",
    loading: "Жүктелуде…",
    empty: "Хабарлама жоқ",
    types: { symptom_alert: "Симптом туралы хабарлама", reminder: "Еске салу", survey: "Қанағаттану сауалнамасы", system: "Жүйе" },
    time: { now: "Жаңа ғана", min: (n) => `${n} мин бұрын`, hour: (n) => `${n} сағ бұрын`, day: (n) => `${n} күн бұрын` },
  },
  zh: {
    locale: "zh-CN",
    title: "通知",
    markAllRead: "全部标为已读",
    filterAll: "全部",
    filterUnread: "未读",
    filterRead: "已读",
    typeAll: "全部类型",
    read: "已读",
    more: "加载更多",
    loading: "加载中…",
    empty: "暂无通知",
    types: { symptom_alert: "症状提醒", reminder: "提醒", survey: "满意度调查", system: "系统" },
    time: { now: "刚刚", min: (n) => `${n} 分钟前`, hour: (n) => `${n} 小时前`, day: (n) => `${n} 天前` },
  },
  ja: {
    locale: "ja-JP",
    title: "通知",
    markAllRead: "すべて既読",
    filterAll: "すべて",
    filterUnread: "未読",
    filterRead: "既読",
    typeAll: "すべてのタイプ",
    read: "既読",
    more: "もっと見る",
    loading: "読み込み中…",
    empty: "通知はありません",
    types: { symptom_alert: "症状アラート", reminder: "リマインダー", survey: "満足度調査", system: "システム" },
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
  const d = Math.floor(hr / 24);
  if (d < 30) return c.time.day(d);
  return new Date(dateStr).toLocaleDateString(c.locale);
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all"); // all | unread | read
  const [userId, setUserId] = useState(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const lang = useLang();
  const c = COPY[lang] || COPY.en;

  // 세션 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
    });
  }, []);

  const fetchPage = useCallback(
    async (pageNum, type, readFilter) => {
      if (!userId) return;
      setLoading(true);
      try {
        let query = (supabase)
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (type !== "all") query = query.eq("type", type);
        if (readFilter === "unread") query = query.is("read_at", null);
        if (readFilter === "read") query = query.not("read_at", "is", null);

        const { data, error } = await query;
        if (!error && data) {
          setItems((prev) => (pageNum === 0 ? data : [...prev, ...data]));
          setHasMore(data.length === PAGE_SIZE);
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase]
  );

  useEffect(() => {
    if (userId) {
      setPage(0);
      setItems([]);
      fetchPage(0, filterType, filterRead);
    }
  }, [userId, filterType, filterRead]);

  async function handleItemClick(item) {
    if (!item.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: now } : n)));
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", item.id);
    }
    if (item.link) router.push(item.link);
  }

  async function markAllRead() {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, filterType, filterRead);
  }

  const unreadCount = items.filter((n) => !n.read_at).length;

  // 알림 타입 목록 (필터 옵션)
  const allTypes = ["all", "symptom_alert", "reminder", "survey", "system"];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 500 }}>
          {c.title}
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: "#ef4444",
                color: "#fff",
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 700,
                verticalAlign: "middle",
              }}
            >
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: "transparent",
              border: "1px solid var(--cream-2, #e5e0d8)",
              borderRadius: 4,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--gold-2, #b8860b)",
            }}
          >
            {c.markAllRead}
          </button>
        )}
      </div>

      {/* 필터 바 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {/* 읽음 상태 필터 */}
        {[["all", c.filterAll], ["unread", c.filterUnread], ["read", c.filterRead]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterRead(val)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: filterRead === val ? "var(--gold-0, #c8a96a)" : "var(--cream-2, #e5e0d8)",
              background: filterRead === val ? "var(--gold-tint, rgba(200,169,106,0.12))" : "transparent",
              color: filterRead === val ? "var(--gold-2, #b8860b)" : "var(--fg-on-light-2)",
              fontSize: 12,
              fontWeight: filterRead === val ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}

        <div style={{ width: 1, background: "var(--cream-2)", alignSelf: "stretch", margin: "0 4px" }} />

        {/* 타입 필터 */}
        {allTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: filterType === t ? "var(--gold-0, #c8a96a)" : "var(--cream-2, #e5e0d8)",
              background: filterType === t ? "var(--gold-tint, rgba(200,169,106,0.12))" : "transparent",
              color: filterType === t ? "var(--gold-2, #b8860b)" : "var(--fg-on-light-2)",
              fontSize: 12,
              fontWeight: filterType === t ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {t === "all" ? c.typeAll : (c.types[t] || t)}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>{c.loading}</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af", fontSize: 14 }}>
          {c.empty}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--cream-2, #e5e0d8)", borderRadius: 8, overflow: "hidden" }}>
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                width: "100%",
                textAlign: "left",
                padding: "14px 16px",
                background: item.read_at ? "transparent" : "var(--gold-tint, rgba(200,169,106,0.06))",
                border: 0,
                borderBottom: idx < items.length - 1 ? "1px solid var(--cream-2, #e5e0d8)" : 0,
                cursor: item.link ? "pointer" : "default",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cream-0, #faf7f2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = item.read_at ? "transparent" : "var(--gold-tint, rgba(200,169,106,0.06))"; }}
            >
              {/* 우선순위 점 */}
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: item.read_at ? "#d1d5db" : (PRIORITY_DOT[item.priority] || "#14b8a6"),
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: item.read_at ? 400 : 600,
                      color: "var(--fg-on-light-1)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {item.title}
                  </p>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--cream-0, #faf7f2)",
                      color: "var(--fg-on-light-3)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {c.types[item.type] || item.type}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--fg-on-light-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.body}
                </p>
                <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, display: "block" }}>
                  {timeAgo(item.created_at, c)}
                  {item.read_at && ` · ${c.read}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 더 보기 */}
      {hasMore && !loading && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={loadMore}
            style={{
              background: "transparent",
              border: "1px solid var(--cream-2, #e5e0d8)",
              borderRadius: 4,
              padding: "10px 24px",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--fg-on-light-2)",
            }}
          >
            {c.more}
          </button>
        </div>
      )}
      {loading && items.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 20, color: "#9ca3af", fontSize: 13 }}>{c.loading}</div>
      )}
    </div>
  );
}
