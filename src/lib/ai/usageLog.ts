/**
 * healwith: AI 사용량·비용 계측 (제미나이 실시간 비용 추적)
 *
 * 배경: 어드민 '외부 서비스 사용량' 화면이 제미나이 API 비용을 실시간으로 보여주려면
 *       각 호출의 실제 토큰 수가 필요하다. Vercel AI SDK 의 generateText/streamText 는
 *       result.usage 로 토큰 수를 돌려준다 → 호출마다 ai_usage_events 에 적재한다.
 *
 * 설계 원칙:
 * - **호출자를 절대 막지 않는다**: 로깅 실패(네트워크·DB)는 삼키고 AI 응답에 영향 없음(fire-and-forget).
 * - **비용은 기록 시점 단가로 동결**: 별칭(gemini-flash-latest) 단가가 바뀌어도 과거 집계 불변.
 * - **PII 금지**: 쿼리 내용·환자정보 저장 안 함. 토큰 수·표면(surface)·모델만.
 *
 * ⚠️ 단가는 추정치다. gemini-flash-latest 는 별칭이라 실제 단가가 바뀔 수 있다
 *    (CLAUDE.md: 최신 유지·비용통제는 Google 콘솔 spend cap). 이 표는 '대략 얼마 쓰는지'
 *    감을 주는 용도 — 정산 기준이 아니다. 필요 시 env 로 덮어쓴다.
 */

import "server-only";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { estimateCostUsd, normalizeUsage, MODEL_PRICING } from "@/lib/ai/usagePricing";
import { readServedModel } from "@/lib/ai/servedModel";

// 순수 단가·정규화 유틸은 usagePricing.ts 로 분리(server-only 없이 단위테스트). 재노출.
export { estimateCostUsd, normalizeUsage, priceForModel, MODEL_PRICING } from "@/lib/ai/usagePricing";
export type { ModelPrice } from "@/lib/ai/usagePricing";

export type AiSurface =
  | "public_chat"
  | "consult_translate"
  | "consult_stt"
  | "judge"
  | "triage"
  | "doc_translate"
  | "doc_translate_verify"
  | "note_translate"
  | "opinion_translate"
  | "case_brief"
  // 회귀 테스트(매주 월·목) — 2026-08-14 이전엔 계측 밖이라 AI 비용 화면에 「0」으로 보였다.
  | "regression_generate"
  | "regression_judge"
  // 매일 도는 자동 개선 크론 — 2026-08-15 계측 추가(그전엔 비용 화면에 0으로 보였다).
  | "playbook_auto_improve"
  // 병원 리뷰 등 공개 텍스트 번역(/api/translate-text) — 2026-08-14 계측 추가.
  | "text_translate"
  | "embedding"
  | "other";

export interface LogAiUsageArgs {
  surface: AiSurface;
  model: string;
  /** AI SDK result.usage (정규화 전 원본). normalizeUsage 로 흡수. */
  usage?: any;
  /** usage 가 없을 때 직접 토큰 수 지정(통역/STT 등). */
  promptTokens?: number | null;
  completionTokens?: number | null;
  /**
   * AI SDK result.providerMetadata (정규화 전 원본). 캐시 적중 토큰이 usage 가 아니라
   * 여기(`google.cachedContentTokenCount`)로만 오는 SDK 버전이 있어 둘 다 본다.
   */
  providerMetadata?: any;
  /**
   * AI SDK result.response (생성 경로). 본문의 modelVersion 을 meta.model_version 으로 남긴다 —
   * 별칭(gemini-flash-latest)이 «실제로 어느 세대를 불렀나»를 실DB 로 재기 위함(2026-09-05).
   */
  response?: any;
  meta?: Record<string, unknown>;
}

/** usage / providerMetadata 어느 쪽에 실려 오든 캐시 적중 토큰을 꺼낸다. 못 찾으면 null. */
export function readCachedTokens(
  normCached: number | null,
  providerMetadata: any
): number | null {
  if (normCached != null) return normCached;
  const raw = providerMetadata?.google?.cachedContentTokenCount;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * AI 호출 1건 사용량을 적재한다. **fire-and-forget** — await 해도 throw 하지 않는다.
 * 호출 예: logAiUsage({ surface: "public_chat", model: getModelName(), usage: result.usage });
 */
export async function logAiUsage(args: LogAiUsageArgs): Promise<void> {
  try {
    const norm = args.usage
      ? normalizeUsage(args.usage)
      : {
          promptTokens: args.promptTokens ?? null,
          completionTokens: args.completionTokens ?? null,
          totalTokens:
            (args.promptTokens ?? 0) + (args.completionTokens ?? 0) || null,
          cachedTokens: null as number | null,
        };

    const cachedTokens = readCachedTokens(norm.cachedTokens, args.providerMetadata);
    const est = estimateCostUsd(args.model, norm.promptTokens, norm.completionTokens, cachedTokens);

    // 캐시 적중 토큰은 «칸을 새로 파지 않고» meta 에 담는다(되돌리기 쉬운 쪽).
    // 왜 기록하나: 제미나이 자동 캐시는 «앞부분이 글자 하나까지 같을 때만» 걸리는데,
    // 걸렸는지 아닌지를 우리가 지금까지 아예 안 재고 있었다 → 「빨라졌다/싸졌다」를
    // 추측으로 말하게 된다. 이 숫자가 있어야 실측으로 답할 수 있다(2026-08-11).
    const extra: Record<string, unknown> = {};
    if (cachedTokens != null) extra.cached_tokens = cachedTokens;
    // 실제 응답한 모델판(별칭 세대 교체 감시). 없으면 칸을 안 만든다 — 요청 별칭으로 채우면 감시가 무의미하다.
    const servedModel = readServedModel(args.response);
    if (servedModel) extra.model_version = servedModel;
    const meta =
      args.meta || Object.keys(extra).length ? { ...(args.meta ?? {}), ...extra } : null;

    await (supabaseAdmin as any).from("ai_usage_events").insert({
      surface: args.surface,
      model: args.model,
      prompt_tokens: norm.promptTokens,
      completion_tokens: norm.completionTokens,
      total_tokens: norm.totalTokens,
      est_cost_usd: est,
      meta,
    });
  } catch (e) {
    // 계측 실패는 절대 본 흐름에 영향 없게 삼킨다.
    console.warn("[usageLog] insert failed (ignored):", (e as Error).message);
  }
}

// ============================================================
// 집계 (어드민 사용량 화면)
// ============================================================

export interface AiUsageSummaryRow {
  surface: string;
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface AiUsageSummary {
  /** 표면×모델별 합계 */
  rows: AiUsageSummaryRow[];
  /** 전체 합계 */
  totals: {
    calls: number;
    totalTokens: number;
    costUsd: number;
  };
}

/** 기간 내 사용량 집계 (surface×model). RLS 우회(service_role). */
export async function getAiUsageSummary(
  fromISO: string,
  toISO: string
): Promise<AiUsageSummary> {
  const empty: AiUsageSummary = {
    rows: [],
    totals: { calls: 0, totalTokens: 0, costUsd: 0 },
  };
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("ai_usage_events")
      .select("surface, model, prompt_tokens, completion_tokens, total_tokens, est_cost_usd")
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .limit(100000);

    if (error || !data) {
      if (error) console.error("[usageLog] summary error:", error.message);
      return empty;
    }

    const byKey = new Map<string, AiUsageSummaryRow>();
    let totCalls = 0;
    let totTokens = 0;
    let totCost = 0;

    for (const r of data as any[]) {
      const key = `${r.surface}::${r.model}`;
      const row =
        byKey.get(key) ??
        {
          surface: r.surface,
          model: r.model,
          calls: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
        };
      row.calls += 1;
      row.promptTokens += r.prompt_tokens ?? 0;
      row.completionTokens += r.completion_tokens ?? 0;
      row.totalTokens += r.total_tokens ?? 0;
      row.costUsd += Number(r.est_cost_usd ?? 0);
      byKey.set(key, row);

      totCalls += 1;
      totTokens += r.total_tokens ?? 0;
      totCost += Number(r.est_cost_usd ?? 0);
    }

    const rows = Array.from(byKey.values())
      .map((r) => ({ ...r, costUsd: Math.round(r.costUsd * 1e6) / 1e6 }))
      .sort((a, b) => b.costUsd - a.costUsd);

    return {
      rows,
      totals: {
        calls: totCalls,
        totalTokens: totTokens,
        costUsd: Math.round(totCost * 1e6) / 1e6,
      },
    };
  } catch (e) {
    console.error("[usageLog] summary exception:", (e as Error).message);
    return empty;
  }
}
