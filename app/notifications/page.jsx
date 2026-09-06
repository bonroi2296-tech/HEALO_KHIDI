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
import { resolveNotificationLink } from "@/lib/notifications/resolveLink";

const PAGE_SIZE = 20;


// 우선순위 점 — 장식(aria-hidden)이지만 흰 배경 3:1(UI 요소) 이상은 지킨다.
const PRIORITY_DOT = {
  low:    "bg-gray-400",
  normal: "bg-teal-700",
  high:   "bg-orange-600",
  urgent: "bg-red-500",
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
    types: { symptom_alert: "증상 알림", reminder: "리마인더", survey: "만족도 조사", system: "시스템", patient_message: "환자 글", rebooking_request: "재진 요청", pre_visit_silent: "소견 뒤 무응답", cold_lead: "식은 문의", new_inquiry: "새 문의", opinion_arrived: "소견 도착", chat_handoff: "AI→사람 인계", consultation_unclosed: "상담 완료 미처리" },
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
    types: { symptom_alert: "Symptom alert", reminder: "Reminder", survey: "Satisfaction survey", system: "System", patient_message: "Patient note", rebooking_request: "Follow-up request", pre_visit_silent: "Silent after opinion", cold_lead: "Cold inquiry", new_inquiry: "New inquiry", opinion_arrived: "Opinion arrived", chat_handoff: "AI→human handoff", consultation_unclosed: "Consultation not closed" },
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
    types: { symptom_alert: "Оповещение о симптомах", reminder: "Напоминание", survey: "Опрос удовлетворённости", system: "Система", patient_message: "Сообщение пациента", rebooking_request: "Запрос на консультацию", pre_visit_silent: "Нет ответа после заключения", cold_lead: "Остывшая заявка", new_inquiry: "Новая заявка", opinion_arrived: "Заключение получено", chat_handoff: "Передача от ИИ", consultation_unclosed: "Консультация не закрыта" },
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
    types: { symptom_alert: "Симптом туралы хабарлама", reminder: "Еске салу", survey: "Қанағаттану сауалнамасы", system: "Жүйе", patient_message: "Науқас хабарламасы", rebooking_request: "Кеңес сұранысы", pre_visit_silent: "Қорытындыдан кейін жауап жоқ", cold_lead: "Суыған өтінім", new_inquiry: "Жаңа өтінім", opinion_arrived: "Қорытынды келді", chat_handoff: "ЖИ→адам тапсыру", consultation_unclosed: "Кеңес жабылмаған" },
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
    types: { symptom_alert: "症状提醒", reminder: "提醒", survey: "满意度调查", system: "系统", patient_message: "患者留言", rebooking_request: "复诊申请", pre_visit_silent: "意见后无回复", cold_lead: "冷却的咨询", new_inquiry: "新咨询", opinion_arrived: "意见已到", chat_handoff: "AI→人工转接", consultation_unclosed: "咨询未结束" },
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
    types: { symptom_alert: "症状アラート", reminder: "リマインダー", survey: "満足度調査", system: "システム", patient_message: "患者メッセージ", rebooking_request: "再診依頼", pre_visit_silent: "所見後の無応答", cold_lead: "冷めた問い合わせ", new_inquiry: "新規問い合わせ", opinion_arrived: "所見到着", chat_handoff: "AI→人へ引き継ぎ", consultation_unclosed: "相談未完了" },
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
    // payload 로 주소 보정 (옛 알림은 link 가 목록 주소라 «그 대화»로 못 갔다 — resolveLink.ts)
    const href = resolveNotificationLink(item);
    if (href) router.push(href);
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
  // 2026-09-06: 실제로 쌓이는 유형으로 현행화(환자 글·재진 요청·무응답·식은 문의 …). 목록에 없는 유형도 「전체」에선 보인다.
  const allTypes = ["all", "symptom_alert", "patient_message", "rebooking_request", "pre_visit_silent", "cold_lead", "new_inquiry", "opinion_arrived", "chat_handoff", "consultation_unclosed", "reminder", "survey", "system"];


  return (
    <div className="max-w-[640px] mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-gray-900">
          {c.title}
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-xl border border-gray-300 px-6 py-1.5 text-xs font-semibold text-teal-700 transition-all duration-200 hover:border-teal-400 hover:bg-teal-50"
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
            className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
              filterRead === val
                ? "border-teal-700 bg-teal-700 font-semibold text-white"
                : "border-gray-300 bg-white text-gray-600 hover:border-teal-400"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="mx-1 w-px self-stretch bg-gray-200" />

        {/* 타입 필터 */}
        {allTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
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
        <div className="py-12 text-center text-sm text-gray-500">{c.loading}</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">{c.empty}</div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all duration-200 ${
                item.read_at ? "bg-white hover:bg-gray-50" : "bg-teal-50 hover:bg-teal-100"
              } ${item.link ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* 우선순위 점 */}
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  item.read_at ? "bg-gray-300" : (PRIORITY_DOT[item.priority] || "bg-teal-700")
                }`}
              />

              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <p
                    className={`min-w-0 flex-1 truncate text-sm text-gray-900 ${
                      item.read_at ? "font-normal" : "font-semibold"
                    }`}
                  >
                    {item.title}
                  </p>
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {c.types[item.type] || item.type}
                  </span>
                </div>
                <p className="truncate text-[13px] text-gray-600">{item.body}</p>
                <span className="mt-1 block text-[11px] tabular-nums text-gray-600">
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
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:border-teal-400 hover:text-teal-700"
          >
            {c.more}
          </button>
        </div>
      )}
      {loading && items.length > 0 && (
        <div className="mt-5 text-center text-sm text-gray-500">{c.loading}</div>
      )}
    </div>
  );
}
