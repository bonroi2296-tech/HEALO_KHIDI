/**
 * AI 단가·토큰 정규화 순수 유틸 — usageLog.ts 에서 분리(server-only 없이 단위테스트).
 *
 * ⚠️ 단가는 추정치다. gemini-flash-latest 는 별칭이라 실제 단가가 바뀔 수 있다
 *    (CLAUDE.md: 비용통제는 Google 콘솔 spend cap). 정산 기준 아님 — 감 잡는 용도.
 *    env 로 flash 단가 덮어쓰기 가능: AI_PRICE_FLASH_IN / AI_PRICE_FLASH_OUT (USD/1M).
 */

/** 모델별 단가 (USD / 100만 토큰). 입력/출력 분리. */
export interface ModelPrice {
  inputPer1M: number;
  outputPer1M: number;
}

// 기본값 = Gemini **3.6 Flash** 표준 단가(USD/1M): in $1.50 / out $7.50 (+ 캐시입력 $0.15).
// 출처: https://ai.google.dev/gemini-api/docs/pricing (2026-07-27 확인)
//
// ✅ **2026-07-27 실측으로 확정** — `gemini-flash-latest` 별칭이 이미 **3.6 Flash** 를 가리킨다.
//    확인 방법(다음에도 이걸로): 모델 메타데이터(`GET /v1beta/models/gemini-flash-latest`)는
//    displayName 이 "Gemini Flash Latest" 라 **세대를 안 알려준다.** 반드시 **실제 호출**을 하고
//    응답의 `modelVersion` 필드를 봐라 —
//        POST /v1beta/models/gemini-flash-latest:generateContent → "modelVersion": "gemini-3.6-flash"
//    (2026-07-25 에는 메타데이터만 보고 "확인 불가"로 남겼는데, 방법이 틀렸던 것.)
//
// 별칭이 또 이동하면: 새 세대 단가를 확인해 아래 기본값을 고치거나 env 로 덮어라
//   (`AI_PRICE_FLASH_IN` / `AI_PRICE_FLASH_OUT`). 과거 집계는 기록 시점 단가로 동결되므로
//   소급 영향은 없다(usageLog.ts).
// 참고 이력: 2.5 Flash 0.3/2.5 → 3.5 Flash 1.5/9.0 → 3.6 Flash 1.5/7.5(출력만 17% 인하).
const FLASH_IN = Number(process.env.AI_PRICE_FLASH_IN || 1.5);
const FLASH_OUT = Number(process.env.AI_PRICE_FLASH_OUT || 7.5);

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // 채팅·판정(judge) — gemini-flash-latest 별칭(2026-07-27 실측: Gemini 3.6 Flash)
  "gemini-flash": { inputPer1M: FLASH_IN, outputPer1M: FLASH_OUT },
  // 임베딩 — 매우 저렴(출력 토큰 없음)
  "gemini-embedding": { inputPer1M: 0.15, outputPer1M: 0 },
};

/** 모델명(별칭 포함) → 단가. 임베딩이면 임베딩 단가, 그 외는 flash 로 보수적 추정. */
export function priceForModel(model: string): ModelPrice {
  const m = (model || "").toLowerCase();
  if (m.includes("embedding")) return MODEL_PRICING["gemini-embedding"];
  return MODEL_PRICING["gemini-flash"];
}

/** 토큰 수 → 추정 비용(USD). 토큰 미상이면 0. numeric(12,6) 정밀도로 반올림. */
export function estimateCostUsd(
  model: string,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined
): number {
  const p = priceForModel(model);
  const inTok = promptTokens ?? 0;
  const outTok = completionTokens ?? 0;
  const cost = (inTok / 1_000_000) * p.inputPer1M + (outTok / 1_000_000) * p.outputPer1M;
  return Math.round(cost * 1e6) / 1e6;
}

/**
 * Vercel AI SDK usage 객체는 버전에 따라 키가 다르다
 * (promptTokens/completionTokens/totalTokens 또는 inputTokens/outputTokens). 둘 다 흡수.
 */
export function normalizeUsage(usage: unknown): {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
} {
  if (!usage || typeof usage !== "object") {
    return { promptTokens: null, completionTokens: null, totalTokens: null };
  }
  const u = usage as Record<string, unknown>;
  const prompt = (u.promptTokens ?? u.inputTokens ?? null) as number | null;
  const completion = (u.completionTokens ?? u.outputTokens ?? null) as number | null;
  const total =
    (u.totalTokens as number | undefined) ??
    (prompt != null && completion != null ? prompt + completion : null);
  return {
    promptTokens: prompt != null ? Number(prompt) : null,
    completionTokens: completion != null ? Number(completion) : null,
    totalTokens: total != null ? Number(total) : null,
  };
}
