"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 상태 배지 색 — 상태 코드(DB값)는 여기, 표시 라벨은 중앙 사전 costList.status.* 키
const STATUS_COLORS = {
  auto_range: "bg-gray-100 text-gray-700",
  formal_requested: "bg-amber-100 text-amber-800",
  hospital_pending: "bg-blue-100 text-blue-800",
  draft: "bg-indigo-100 text-indigo-800",
  issued: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
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
      console.error("[patient/cost-estimates]", err);
      // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("costList.title", lang)}</h1>
      <p className="text-gray-500 mt-2 text-sm">
        {t("costList.subtitle", lang)}
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">{t("costList.loading", lang)}</p>}
      {error && <p className="mt-8 text-sm text-red-600">{t("costList.errorPrefix", lang)}</p>}

      {!loading && estimates.length === 0 && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">{t("costList.emptyTitle", lang)}</p>
          <Link
            href="/patient/chat"
            className="mt-4 inline-block text-sm underline underline-offset-4"
          >
            {t("costList.emptyCta", lang)}
          </Link>
        </div>
      )}

      {estimates.length > 0 && (
        <div className="mt-8 space-y-3">
          {estimates.map((est) => {
            // 알 수 없는 상태 코드는 auto_range 로 폴백 (기존 동작 유지)
            const statusKey = STATUS_COLORS[est.status] ? est.status : "auto_range";
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
                        {est.quotation_no || t("costList.quoteFallback", lang)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[statusKey]}`}
                      >
                        {t(`costList.status.${statusKey}`, lang)}
                      </span>
                    </div>
                    {est.total_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {t("costList.totalPrefix", lang)} {Number(est.total_krw).toLocaleString(dateLocale)} KRW
                        {est.total_usd
                          ? ` · $${Number(est.total_usd).toLocaleString("en-US")}`
                          : ""}
                      </p>
                    ) : est.auto_min_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {t("costList.autoRangePrefix", lang)}: {Number(est.auto_min_krw).toLocaleString(dateLocale)} ~{" "}
                        {Number(est.auto_max_krw).toLocaleString(dateLocale)} KRW
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">{t("costList.noRange", lang)}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {t("costList.createdPrefix", lang)} {new Date(est.created_at).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <span className="text-gray-500 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
