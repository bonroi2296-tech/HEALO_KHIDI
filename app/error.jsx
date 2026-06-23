"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n/LangContext";

const COPY = {
  ko: { title: "일시적인 오류가 발생했어요", body1: "페이지를 준비하는 중 예기치 못한 문제가 생겼어요. 데이터는 안전합니다.", body2: "다시 시도하시고, 계속되면 코디네이터에게 문의해 주세요.", retry: "다시 시도", home: "홈으로 →" },
  en: { title: "Something went wrong", body1: "An unexpected problem occurred while loading the page. Your data is safe.", body2: "Please try again, and contact your coordinator if it continues.", retry: "Try again", home: "Home →" },
  ru: { title: "Произошла ошибка", body1: "При загрузке страницы возникла непредвиденная проблема. Ваши данные в безопасности.", body2: "Повторите попытку, и если проблема не исчезнет, свяжитесь с координатором.", retry: "Повторить", home: "На главную →" },
  kz: { title: "Қате орын алды", body1: "Бетті жүктеу кезінде күтпеген мәселе туындады. Деректеріңіз қауіпсіз.", body2: "Қайталап көріңіз, жалғаса берсе координаторға хабарласыңыз.", retry: "Қайталау", home: "Басты бетке →" },
  zh: { title: "发生了临时错误", body1: "加载页面时出现意外问题。您的数据是安全的。", body2: "请重试，如持续出现请联系协调员。", retry: "重试", home: "返回首页 →" },
  ja: { title: "エラーが発生しました", body1: "ページの読み込み中に予期しない問題が発生しました。データは安全です。", body2: "再試行し、問題が続く場合はコーディネーターにご連絡ください。", retry: "再試行", home: "ホームへ →" },
};

export default function Error({ error, reset }) {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    // 동적 import — 프로덕션 번들에만 Sentry 포함, DSN 없으면 완전 제거
    import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {});
  }, [error]);

  return (
    <main className="min-h-[70vh] bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold tracking-widest text-red-500 uppercase mb-3">
          Error 500
        </p>
        <div className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-4">500</div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          {c.title}
        </h1>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-8">
          {c.body1}
          <br />
          {c.body2}
        </p>

        {process.env.NODE_ENV === "development" && error?.message && (
          <pre className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-red-600 overflow-auto mb-8 max-h-52 font-mono">
            {error.message}
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
          >
            {c.retry}
          </button>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 text-teal-700 hover:text-teal-700 font-bold transition-colors"
          >
            {c.home}
          </a>
        </div>
      </div>
    </main>
  );
}
