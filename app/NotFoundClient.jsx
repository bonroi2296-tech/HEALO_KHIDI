"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

const COPY = {
  ko: { title: "페이지를 찾을 수 없습니다", body: "주소가 바뀌었거나 존재하지 않는 페이지예요.", home: "홈으로", inquiry: "상담 신청 →" },
  en: { title: "Page not found", body: "The page you're looking for doesn't exist or has moved.", home: "Home", inquiry: "Make an inquiry →" },
  ru: { title: "Страница не найдена", body: "Запрашиваемая страница не существует или была перемещена.", home: "На главную", inquiry: "Оставить заявку →" },
  kz: { title: "Бет табылмады", body: "Сұралған бет жоқ немесе жылжытылған.", home: "Басты бетке", inquiry: "Сұраныс қалдыру →" },
  zh: { title: "未找到页面", body: "您访问的页面不存在或已移动。", home: "返回首页", inquiry: "在线咨询 →" },
  ja: { title: "ページが見つかりません", body: "お探しのページは存在しないか、移動されました。", home: "ホームへ", inquiry: "お問い合わせ →" },
};

export default function NotFoundClient() {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;

  return (
    <main className="min-h-[70vh] bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold tracking-widest text-teal-700 uppercase mb-3">
          Error 404
        </p>
        <div className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-4">404</div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          {c.title}
        </h1>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-8">
          {c.body}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
          >
            {c.home}
          </Link>
          <Link
            href="/inquiry"
            className="inline-flex items-center px-6 py-3 text-teal-700 hover:text-teal-700 font-bold transition-colors"
          >
            {c.inquiry}
          </Link>
        </div>
      </div>
    </main>
  );
}
