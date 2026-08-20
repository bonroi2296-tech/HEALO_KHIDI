"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

// 견적 요청 폼에서 고르는 값 — DB 검사규칙(treatment_cost_benchmarks_cancer_type_check /
// _stage_check)이 받는 값과 «같아야» 한다. 여기 없는 값을 보내면 자동 범위가 안 잡힌다.
// 표시 문구는 비용 계산기와 같은 사전 키(costCalc.cancers.*)를 그대로 쓴다(중복 번역 방지).
const CANCER_OPTIONS = [
  { value: "stomach", labelKey: "costCalc.cancers.stomach" },
  { value: "lung", labelKey: "costCalc.cancers.lung" },
  { value: "breast", labelKey: "costCalc.cancers.breast" },
  { value: "liver", labelKey: "costCalc.cancers.liver" },
  { value: "thyroid", labelKey: "costCalc.cancers.thyroid" },
  { value: "colorectal", labelKey: "costCalc.cancers.colorectal" },
  { value: "other", labelKey: "costCalc.cancers.other" },
];
const STAGE_OPTIONS = ["unknown", "1", "2", "3", "4"];

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

  // 견적 요청 폼
  const [formOpen, setFormOpen] = useState(false);
  const [cancerType, setCancerType] = useState(CANCER_OPTIONS[0].value);
  const [stage, setStage] = useState("unknown");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function requestEstimate() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/khidi/cost-estimates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // 병기는 「모름」이면 안 보낸다(서버 기본값이 unknown).
        body: JSON.stringify({
          cancer_type: cancerType,
          ...(stage === "unknown" ? {} : { stage }),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setFormOpen(false);
      await load();
    } catch (err) {
      console.error("[patient/cost-estimates] request", err);
      // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("costList.title", lang)}</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {t("costList.subtitle", lang)}
          </p>
        </div>
        {!formOpen && (
          <button
            onClick={() => { setFormOpen(true); setSubmitError(null); }}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition"
          >
            {t("costList.requestBtn", lang)}
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-6 border border-gray-200 rounded-2xl p-5 bg-white">
          <h2 className="text-base font-bold text-gray-900">{t("costList.requestTitle", lang)}</h2>
          <p className="text-sm text-gray-500 mt-1">{t("costList.requestDesc", lang)}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">{t("costList.cancerLabel", lang)}</span>
              <select
                value={cancerType}
                onChange={(e) => setCancerType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              >
                {CANCER_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey, lang)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">{t("costList.stageLabel", lang)}</span>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{t(`costList.stage.${s}`, lang)}</option>
                ))}
              </select>
            </label>
          </div>

          {submitError && (
            <p className="mt-3 text-sm text-red-600">{t("costList.requestErr", lang)}</p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={requestEstimate}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition disabled:opacity-40"
            >
              {submitting ? t("costList.requestSubmitting", lang) : t("costList.requestSubmit", lang)}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700"
            >
              {t("costList.requestCancel", lang)}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-500">{t("costList.requestNote", lang)}</p>
        </div>
      )}

      {loading && <p className="mt-8 text-sm text-gray-500">{t("costList.loading", lang)}</p>}
      {error && <p className="mt-8 text-sm text-red-600">{t("costList.errorPrefix", lang)}</p>}

      {!loading && estimates.length === 0 && !formOpen && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">{t("costList.emptyTitle", lang)}</p>
          {/* 예전엔 여기서 챗봇으로만 보냈다 — 정식 견적을 «요청할 자리»가 화면에 없어
              cost_estimates 생성 경로가 통째로 안 쓰이고 있었다(2026-08-20 실측). */}
          <button
            onClick={() => { setFormOpen(true); setSubmitError(null); }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition"
          >
            {t("costList.requestBtn", lang)}
          </button>
          <div>
            <Link
              href="/patient/chat"
              className="mt-3 inline-block text-sm text-gray-500 underline underline-offset-4"
            >
              {t("costList.emptyCta", lang)}
            </Link>
          </div>
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
