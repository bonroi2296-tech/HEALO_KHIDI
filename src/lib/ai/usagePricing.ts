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

// 기본값 = Gemini 3.5 Flash 표준 단가(USD/1M, 2026-05-19 출시: in $1.50 / out $9.00).
// `gemini-flash-latest` 별칭은 최신 Flash 로 자동 스왑되므로 2026-07 현재 3.5 Flash 를 가리킨다
// (옛 2.5 Flash 0.3/2.5 대비 in 5배·out 3.6배 상승). 별칭이 또 이동하면 env 로 덮어써라.
//
// 📌 다음 이동 예정 — Gemini 3.6 Flash (2026-07-21 GA): **in $1.50(동일) / out $7.50**
//    (+ 캐시입력 $0.15). 즉 별칭이 3.6 으로 넘어가면 출력 단가가 17% 싸진다 → 이 표를
//    안 고치면 **비용이 실제보다 부풀려** 집계된다.
//    ⚠️ 아직 기본값을 3.6 으로 바꾸지 않았다: 별칭이 실제로 3.6 을 가리키는지 실호출로
//    확인하지 못했고(2026-07-25 트렌드 스캔 — 컨테이너에 API 키 없음), 미리 내리면 반대로
//    과소 집계가 된다. **확인되는 즉시** 아래 기본값을 1.5/7.5 로 내리거나 env 로 덮어라:
//        AI_PRICE_FLASH_OUT=7.5
//    확인 방법: `GET /v1beta/models/gemini-flash-latest?key=…` 의 응답 모델명 확인.
const FLASH_IN = Number(process.env.AI_PRICE_FLASH_IN || 1.5);
const FLASH_OUT = Number(process.env.AI_PRICE_FLASH_OUT || 9.0);

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // 채팅·판정(judge) — gemini-flash-latest 별칭(현재 Gemini 3.5 Flash)
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
