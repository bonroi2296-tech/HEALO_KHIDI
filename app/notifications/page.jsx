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
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";

const PAGE_SIZE = 20;

// 우선순위 점 — DESIGN.md 4-b「아이콘·상태 점은 3:1 이상」. 흰 배경 대비 실측값을 옆에 적어 둔다.
// (옛 값 gray-400 2.54 · teal-500 2.42 · orange-500 3.02 는 전부 미달이었다.)
const PRIORITY_DOT = {
  low:    "#6b7280",  // gray-500  4.83:1
  normal: "#0d9488",  // teal-600  3.74:1
  high:   "#d97706",  // amber-600 3.35:1
  urgent: "#ef4444",  // red-500   3.76:1
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[640px] px-4 py-8">
        {/* 제목 + 모두 읽음 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-gray-900">
            {c.title}
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
            >
              {c.markAllRead}
            </button>
          )}
        </div>

        {/* 필터 바 */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {/* 읽음 상태 필터 */}
          {[["all", c.filterAll], ["unread", c.filterUnread], ["read", c.filterRead]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterRead(val)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                filterRead === val
                  ? "border-teal-700 bg-teal-700 font-semibold text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-teal-400"
              }`}
            >
              {label}
            </button>
          ))}

          {/* 읽음 필터와 타입 필터를 가르는 세로줄. 폰에서는 칩이 줄바꿈돼 이 줄만 줄 끝에
              매달려 보이므로 숨긴다(카자흐어 375px 실측). */}
          <span aria-hidden className="mx-1 hidden w-px self-stretch bg-gray-200 sm:block" />

          {/* 타입 필터 */}
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                filterType === t
                  ? "border-teal-700 bg-teal-700 font-semibold text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-teal-400"
              }`}
            >
              {t === "all" ? c.typeAll : (c.types[t] || t)}
            </button>
          ))}
        </div>

        {/* 알림 목록 */}
        {loading && items.length === 0 ? (
          <div className="py-12 text-center text-gray-500">{c.loading}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">{c.empty}</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
                  item.read_at ? "bg-white hover:bg-gray-50" : "bg-teal-50/70 hover:bg-teal-50"
                } ${idx < items.length - 1 ? "border-b border-gray-100" : ""} ${
                  item.link ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {/* 우선순위 점 (색은 데이터로 정해지므로 인라인 유지) */}
                <span
                  aria-hidden
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.read_at ? "#d1d5db" : (PRIORITY_DOT[item.priority] || PRIORITY_DOT.normal) }}
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <p
                      className={`m-0 flex-1 truncate text-sm text-gray-900 ${
                        item.read_at ? "font-normal" : "font-semibold"
                      }`}
                    >
                      {item.title}
                    </p>
                    <span className="shrink-0 whitespace-nowrap rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {c.types[item.type] || item.type}
                    </span>
                  </div>
                  <p className="m-0 truncate text-[13px] text-gray-500">{item.body}</p>
                  <span className="mt-1 block text-[11px] text-gray-500">
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
          <div className="mt-5 text-center">
            <button
              onClick={loadMore}
              className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-[13px] text-gray-700 transition hover:border-teal-400 hover:bg-teal-50"
            >
              {c.more}
            </button>
          </div>
        )}
        {loading && items.length > 0 && (
          <div className="mt-5 text-center text-[13px] text-gray-500">{c.loading}</div>
        )}
      </div>
    </div>
  );
}
