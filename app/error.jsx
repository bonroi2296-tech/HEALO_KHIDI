"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
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
          일시적인 오류가 발생했어요
        </h1>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-8">
          페이지를 준비하는 중 예기치 못한 문제가 생겼어요. 데이터는 안전합니다.
          <br />
          다시 시도하시고, 계속되면 코디네이터에게 문의해 주세요.
        </p>

        {process.env.NODE_ENV === "development" && error?.message && (
          <pre className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-red-600 overflow-auto mb-8 max-h-52 font-mono">
            {error.message}
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 text-teal-600 hover:text-teal-700 font-bold transition-colors"
          >
            홈으로 →
          </a>
        </div>
      </div>
    </main>
  );
}
