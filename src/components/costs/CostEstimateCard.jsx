"use client";

/**
 * CostEstimateCard — 환자에게 Tier 1 즉시 예상 범위를 카드로 표시.
 *
 * Props:
 *   - cancerType: 'stomach' | 'liver' | 'lung' | 'breast' | 'thyroid' | 'other'
 *   - stage: '1'|'2'|'3'|'4'|'unknown'
 *   - intakeId (optional): 있으면 Tier 2 AI 보정까지 시도
 *   - consultationId (optional): 정식 견적 요청 시 연결
 *
 * 본 컴포넌트는 KHIDI 정부 요건 #3, #6 — "예상진료비 산출내역 온라인 안내·제공" 대응.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 환자용 카드 — 6개 활성언어(ko·en·ru·kz·zh·ja)
const COPY = {
  loadingText: { ko: "예상 진료비 불러오는 중...", en: "Loading cost estimate...", ru: "Загрузка оценки стоимости...", zh: "正在加载预估费用...", ja: "予想診療費を読み込み中...", kz: "Болжамды емдеу құны жүктелуде..." },
  loadFailed: { ko: "예상 진료비를 불러오지 못했습니다.", en: "Failed to load the cost estimate.", ru: "Не удалось загрузить оценку стоимости.", zh: "无法加载预估费用。", ja: "予想診療費の読み込みに失敗しました。", kz: "Болжамды емдеу құнын жүктеу мүмкін болмады." },
  loadFailedDesc: { ko: "예상 진료비 범위를 불러오지 못했습니다. 정식 견적을 요청하세요.", en: "Couldn't load the estimated cost range. Please request a formal quote.", ru: "Не удалось загрузить диапазон стоимости. Запросите официальную смету.", zh: "无法加载预估费用范围。请申请正式报价。", ja: "予想診療費の範囲を読み込めませんでした。正式見積もりをご依頼ください。", kz: "Болжамды құн ауқымын жүктеу мүмкін болмады. Ресми смета сұраңыз." },
  loginRequired: { ko: "정식 견적 요청은 로그인이 필요합니다.", en: "Please log in to request a formal quote.", ru: "Для запроса официальной сметы необходимо войти в систему.", zh: "申请正式报价需要先登录。", ja: "正式見積もりのご依頼にはログインが必要です。", kz: "Ресми сметаны сұрау үшін жүйеге кіру қажет." },
  requestSuccess: { ko: "정식 견적 요청 완료. 코디네이터가 병원에 문의 후 안내드립니다.", en: "Quote request submitted. Our coordinator will check with the hospital and follow up.", ru: "Запрос сметы отправлен. Координатор свяжется с больницей и ответит вам.", zh: "正式报价申请已提交。协调员将向医院确认后与您联系。", ja: "正式見積もりのご依頼を受け付けました。コーディネーターが病院に確認のうえご案内します。", kz: "Смета сұрауы жіберілді. Үйлестіруші аурухана қаралғаннан кейін хабарласады." },
  requestFailed: { ko: "요청 실패", en: "Request failed", ru: "Ошибка запроса", zh: "申请失败", ja: "リクエスト失敗", kz: "Сұрау сәтсіз" },
  tierLabel: { ko: "예상 치료비 범위", en: "Estimated Cost Range", ru: "Ориентировочная стоимость", zh: "预估治疗费用范围", ja: "予想治療費の範囲", kz: "Болжамды емдеу құны ауқымы" },
  aiPersonalize: { ko: "AI 개인화", en: "AI Personalize", ru: "ИИ-персонализация", zh: "AI 个性化", ja: "AIパーソナライズ", kz: "AI жекелендіру" },
  aiAnalyzing: { ko: "AI 분석 중...", en: "AI analyzing...", ru: "ИИ анализирует...", zh: "AI 分析中...", ja: "AI分析中...", kz: "AI талдауда..." },
  totalCourseLabel: { ko: "전체 치료 과정 합계", en: "Total for full treatment course", ru: "Итого за весь курс лечения", zh: "全部治疗过程总计", ja: "全治療プロセス合計", kz: "Толық емдеу курсының жиыны" },
  median: { ko: "중앙값", en: "Median", ru: "Медиана", zh: "中位数", ja: "中央値", kz: "Медиана" },
  aiEstimatePrefix: { ko: "AI 개인화 추정", en: "AI-personalized estimate", ru: "ИИ-персонализированная оценка", zh: "AI 个性化预估", ja: "AIパーソナライズ推定", kz: "AI жекелендірілген болжам" },
  bandLower: { ko: "하위 구간", en: "lower range", ru: "нижний диапазон", zh: "较低区间", ja: "下位区間", kz: "төменгі ауқым" },
  bandMiddle: { ko: "중위 구간", en: "middle range", ru: "средний диапазон", zh: "中位区间", ja: "中位区間", kz: "орта ауқым" },
  bandUpper: { ko: "상위 구간", en: "upper range", ru: "верхний диапазон", zh: "较高区间", ja: "上位区間", kz: "жоғарғы ауқым" },
  breakdownSummary: { ko: "단계별 상세", en: "Breakdown by stage", ru: "Подробности по этапам", zh: "分阶段明细", ja: "段階別詳細", kz: "Кезеңдер бойынша егжей-тегжей" },
  stepsUnit: { ko: "단계", en: " steps", ru: " этапов", zh: "个阶段", ja: "段階", kz: " кезең" },
  likelihood: { ko: "가능성", en: "likelihood", ru: "вероятность", zh: "可能性", ja: "可能性", kz: "мүмкіндігі" },
  phasePre: { ko: "진단·검사", en: "Diagnosis & tests", ru: "Диагностика и анализы", zh: "诊断·检查", ja: "診断・検査", kz: "Диагностика және тексеру" },
  phaseDuring: { ko: "치료", en: "Treatment", ru: "Лечение", zh: "治疗", ja: "治療", kz: "Емдеу" },
  phasePost: { ko: "사후관리", en: "Follow-up care", ru: "Последующий уход", zh: "术后管理", ja: "アフターケア", kz: "Кейінгі күтім" },
  requesting: { ko: "요청 중...", en: "Requesting...", ru: "Отправка запроса...", zh: "申请中...", ja: "リクエスト中...", kz: "Сұрау жіберілуде..." },
  requestQuote: { ko: "정식 견적서 요청 →", en: "Request Formal Quote →", ru: "Запросить официальную смету →", zh: "申请正式报价单 →", ja: "正式見積もりを依頼 →", kz: "Ресми сметаны сұрау →" },
  myEstimates: { ko: "내 견적 목록", en: "My Estimates", ru: "Мои сметы", zh: "我的报价单", ja: "見積もり一覧", kz: "Менің смета тізімім" },
};

function fmtKRW(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("ko-KR") + " KRW";
}
function fmtUSD(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function CostEstimateCard({
  cancerType,
  stage = "unknown",
  intakeId = null,
  consultationId = null,
}) {
  const lang = useLang();
  const l = (obj) => obj?.[lang] || obj?.en || "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadTier1();
  }, [cancerType, stage]);

  async function loadTier1() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        cancer_type: cancerType,
        stage,
        include_all_phases: "1",
      });
      const res = await fetch(`/api/khidi/cost-estimate?${params}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "failed");
      }
      setData(json.data);
    } catch (err) {
      console.error("[CostEstimateCard]", err);
      setError(l(COPY.loadFailed));
    } finally {
      setLoading(false);
    }
  }

  async function loadTier2() {
    if (!intakeId) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/khidi/cost-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cancer_type: cancerType,
          stage,
          intake_id: intakeId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setData((prev) => ({ ...(prev || {}), ...json.data }));
    } catch (err) {
      // AI 실패는 무해 — Tier 1 유지
      console.warn("[CostEstimateCard] Tier 2 failed:", err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function requestFormalQuote() {
    setRequesting(true);
    try {
      const res = await fetch("/api/khidi/cost-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cancer_type: cancerType,
          stage,
          intake_id: intakeId || undefined,
          consultation_id: consultationId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status === 401) {
          alert(l(COPY.loginRequired));
          return;
        }
        throw new Error(json.error || "failed");
      }
      alert(l(COPY.requestSuccess));
      window.location.href = `/patient/cost-estimates/${json.data.id}`;
    } catch (_err) {
      alert(l(COPY.requestFailed));
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <p className="text-sm text-gray-500">{l(COPY.loadingText)}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-amber-200 rounded-lg p-5 bg-amber-50">
        <p className="text-sm text-amber-900">
          {l(COPY.loadFailedDesc)}
        </p>
        <button
          onClick={requestFormalQuote}
          disabled={requesting}
          className="mt-3 text-sm underline"
        >
          {l(COPY.requestQuote)}
        </button>
      </div>
    );
  }

  const total = data.total_if_full_course;
  const refined = data.tier2_refined_krw;
  const band = data.tier2_band;
  const bandLabel = { lower: l(COPY.bandLower), middle: l(COPY.bandMiddle), upper: l(COPY.bandUpper) };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {l(COPY.tierLabel)} (Tier {data.tier || 1})
          </p>
          <h3 className="text-xl font-semibold mt-1">
            {cancerType} · Stage {stage}
          </h3>
        </div>
        {intakeId && !aiLoading && !band && (
          <button
            onClick={loadTier2}
            className="text-xs text-blue-600 hover:underline"
          >
            {l(COPY.aiPersonalize)} ✨
          </button>
        )}
        {aiLoading && (
          <span className="text-xs text-gray-500">{l(COPY.aiAnalyzing)}</span>
        )}
      </div>

      {total && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1">{l(COPY.totalCourseLabel)}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold">
              {fmtUSD(total.min_usd)} ~ {fmtUSD(total.max_usd)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {fmtKRW(total.min_krw)} ~ {fmtKRW(total.max_krw)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {l(COPY.median)}: {fmtUSD(total.median_usd)} ({fmtKRW(total.median_krw)})
          </p>
        </div>
      )}

      {refined && band && (
        <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
          <p className="text-xs text-blue-700 mb-1">
            ✨ {l(COPY.aiEstimatePrefix)} · {bandLabel[band]} {l(COPY.likelihood)}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-blue-900">
              {fmtUSD(refined.min_usd)} ~ {fmtUSD(refined.max_usd)}
            </span>
          </div>
          <p className="text-sm text-blue-800 mt-1">
            {fmtKRW(refined.min)} ~ {fmtKRW(refined.max)}
          </p>
          {data.tier2_personalization && (
            <p className="text-xs text-gray-600 mt-2 italic">
              &ldquo;{data.tier2_personalization}&rdquo;
            </p>
          )}
        </div>
      )}

      {data.breakdown && data.breakdown.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-900">
            {l(COPY.breakdownSummary)} ({data.breakdown.length}{l(COPY.stepsUnit)})
          </summary>
          <ul className="mt-2 space-y-2">
            {data.breakdown.map((b, i) => (
              <li key={i} className="text-xs text-gray-700 border-l-2 border-gray-200 pl-3 py-1">
                <span className="font-medium">
                  {b.phase === "pre_treatment"
                    ? l(COPY.phasePre)
                    : b.phase === "during_treatment"
                    ? l(COPY.phaseDuring)
                    : l(COPY.phasePost)}
                </span>{" "}
                · {fmtUSD(b.range_usd.min)}~{fmtUSD(b.range_usd.max)}
                {b.confidence && (
                  <span className="text-gray-500 ml-2">[{b.confidence}]</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-gray-500 mt-4 italic leading-relaxed">
        ⚠️ {data.disclaimer}
      </p>

      <div className="mt-5 flex gap-2">
        <button
          onClick={requestFormalQuote}
          disabled={requesting}
          className="flex-1 bg-black text-white px-4 py-2.5 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {requesting ? l(COPY.requesting) : l(COPY.requestQuote)}
        </button>
        <Link
          href="/patient/cost-estimates"
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-md hover:border-black"
        >
          {l(COPY.myEstimates)}
        </Link>
      </div>
    </div>
  );
}
