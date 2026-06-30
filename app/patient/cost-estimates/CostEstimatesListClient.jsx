"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

const STATUS_LABELS = {
  auto_range: {
    en: "Auto range",
    ko: "자동 범위",
    ru: "Авторасчёт",
    kz: "Автоматты диапазон",
    zh: "自动范围",
    ja: "自動範囲",
    color: "bg-gray-100 text-gray-700",
  },
  formal_requested: {
    en: "Formal request",
    ko: "정식 요청",
    ru: "Официальный запрос",
    kz: "Ресми сұрау",
    zh: "正式请求",
    ja: "正式依頼",
    color: "bg-amber-100 text-amber-800",
  },
  hospital_pending: {
    en: "Awaiting hospital",
    ko: "병원 응답 대기",
    ru: "Ожидание ответа клиники",
    kz: "Клиника жауабын күту",
    zh: "等待医院回复",
    ja: "病院の回答待ち",
    color: "bg-blue-100 text-blue-800",
  },
  draft: {
    en: "Coordinator drafting",
    ko: "코디 작성 중",
    ru: "Координатор готовит",
    kz: "Координатор дайындауда",
    zh: "协调员编制中",
    ja: "コーディネーター作成中",
    color: "bg-indigo-100 text-indigo-800",
  },
  issued: {
    en: "Quote issued",
    ko: "견적서 발급",
    ru: "Расчёт выдан",
    kz: "Баға ұсынысы берілді",
    zh: "报价已出具",
    ja: "見積もり発行",
    color: "bg-emerald-100 text-emerald-800",
  },
  accepted: {
    en: "Agreed",
    ko: "동의 완료",
    ru: "Согласовано",
    kz: "Келісілді",
    zh: "已同意",
    ja: "同意済み",
    color: "bg-green-100 text-green-800",
  },
  rejected: {
    en: "Declined",
    ko: "거절",
    ru: "Отклонено",
    kz: "Бас тартылды",
    zh: "已拒绝",
    ja: "辞退",
    color: "bg-red-100 text-red-800",
  },
  expired: {
    en: "Expired",
    ko: "만료",
    ru: "Истёк",
    kz: "Мерзімі өтті",
    zh: "已过期",
    ja: "期限切れ",
    color: "bg-gray-100 text-gray-500",
  },
};

const COPY = {
  en: {
    title: "My estimated treatment cost",
    subtitle:
      "Your coordinator issues a formal quote after consulting the hospital. Only an issued quote is legally binding.",
    loading: "Loading…",
    errorPrefix: "Error",
    emptyTitle: "No quote requests in progress.",
    emptyCta: "Check estimated costs with the chatbot first",
    quoteFallback: "Quote request",
    totalPrefix: "Total",
    autoRangePrefix: "Auto range",
    noRange: "Range not calculated",
    createdPrefix: "Created",
  },
  ko: {
    title: "내 예상 진료비 견적",
    subtitle:
      "코디네이터가 병원에 문의 후 정식 견적서를 발급합니다. 법적 효력은 발급된 견적서에만 있습니다.",
    loading: "불러오는 중...",
    errorPrefix: "오류",
    emptyTitle: "진행 중인 견적 요청이 없습니다.",
    emptyCta: "챗봇으로 예상비용 먼저 확인하기",
    quoteFallback: "견적 요청",
    totalPrefix: "총",
    autoRangePrefix: "자동 범위",
    noRange: "범위 미산출",
    createdPrefix: "생성",
  },
  ru: {
    title: "Мой предварительный расчёт лечения",
    subtitle:
      "Координатор оформляет официальный расчёт после консультации с клиникой. Юридическую силу имеет только выданный расчёт.",
    loading: "Загрузка…",
    errorPrefix: "Ошибка",
    emptyTitle: "Нет активных запросов на расчёт.",
    emptyCta: "Сначала узнайте примерную стоимость в чат-боте",
    quoteFallback: "Запрос расчёта",
    totalPrefix: "Итого",
    autoRangePrefix: "Авторасчёт",
    noRange: "Диапазон не рассчитан",
    createdPrefix: "Создано",
  },
  kz: {
    title: "Емделу құнының болжамды бағасы",
    subtitle:
      "Координатор клиникамен кеңескеннен кейін ресми баға ұсынысын береді. Заңды күші тек берілген баға ұсынысында болады.",
    loading: "Жүктелуде…",
    errorPrefix: "Қате",
    emptyTitle: "Орындалып жатқан баға сұраулары жоқ.",
    emptyCta: "Алдымен чат-боттан болжамды құнды біліңіз",
    quoteFallback: "Баға сұрауы",
    totalPrefix: "Барлығы",
    autoRangePrefix: "Автоматты диапазон",
    noRange: "Диапазон есептелмеген",
    createdPrefix: "Жасалды",
  },
  zh: {
    title: "我的预估治疗费用",
    subtitle:
      "协调员与医院沟通后出具正式报价。仅已出具的报价具有法律效力。",
    loading: "加载中…",
    errorPrefix: "错误",
    emptyTitle: "暂无进行中的报价请求。",
    emptyCta: "先用聊天机器人了解预估费用",
    quoteFallback: "报价请求",
    totalPrefix: "合计",
    autoRangePrefix: "自动范围",
    noRange: "范围未计算",
    createdPrefix: "创建",
  },
  ja: {
    title: "私の概算治療費見積もり",
    subtitle:
      "コーディネーターが病院に確認のうえ正式な見積もりを発行します。法的効力は発行された見積もりにのみあります。",
    loading: "読み込み中…",
    errorPrefix: "エラー",
    emptyTitle: "進行中の見積もり依頼はありません。",
    emptyCta: "まずチャットボットで概算費用を確認する",
    quoteFallback: "見積もり依頼",
    totalPrefix: "合計",
    autoRangePrefix: "自動範囲",
    noRange: "範囲未算出",
    createdPrefix: "作成",
  },
};

const LOCALES = {
  ko: "ko-KR",
  ru: "ru-RU",
  kz: "kk-KZ",
  zh: "zh-CN",
  ja: "ja-JP",
  en: "en-US",
};

export default function CostEstimatesListClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const dateLocale = LOCALES[lang] || "en-US";

  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/khidi/cost-estimates", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setEstimates(json.data || []);
    } catch (err) {
      // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="text-gray-500 mt-2 text-sm">
        {copy.subtitle}
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">{copy.loading}</p>}
      {error && <p className="mt-8 text-sm text-red-600">{copy.errorPrefix}</p>}

      {!loading && estimates.length === 0 && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">{copy.emptyTitle}</p>
          <Link
            href="/patient/chat"
            className="mt-4 inline-block text-sm underline underline-offset-4"
          >
            {copy.emptyCta}
          </Link>
        </div>
      )}

      {estimates.length > 0 && (
        <div className="mt-8 space-y-3">
          {estimates.map((est) => {
            const label = STATUS_LABELS[est.status] || STATUS_LABELS.auto_range;
            return (
              <Link
                key={est.id}
                href={`/patient/cost-estimates/${est.id}`}
                className="block border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {est.quotation_no || copy.quoteFallback}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${label.color}`}
                      >
                        {label[lang] || label.en}
                      </span>
                    </div>
                    {est.total_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {copy.totalPrefix} {Number(est.total_krw).toLocaleString(dateLocale)} KRW
                        {est.total_usd
                          ? ` · $${Number(est.total_usd).toLocaleString("en-US")}`
                          : ""}
                      </p>
                    ) : est.auto_min_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {copy.autoRangePrefix}: {Number(est.auto_min_krw).toLocaleString(dateLocale)} ~{" "}
                        {Number(est.auto_max_krw).toLocaleString(dateLocale)} KRW
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">{copy.noRange}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {copy.createdPrefix} {new Date(est.created_at).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
