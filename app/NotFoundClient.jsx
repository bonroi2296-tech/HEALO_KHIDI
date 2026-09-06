"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";
import { NOT_FOUND_COPY } from "@/lib/i18n/notFoundCopy";

// 글자 표는 서버(제목)와 공유 — src/lib/i18n/notFoundCopy.js
const COPY = NOT_FOUND_COPY;

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
            href={localeHref("/inquiry", lang)}
            className="inline-flex items-center px-6 py-3 text-teal-700 hover:text-teal-700 font-bold transition-colors"
          >
            {c.inquiry}
          </Link>
        </div>
      </div>
    </main>
  );
}
