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

/**
 * 캐시로 재사용된 입력 토큰의 단가 배수(2026-08-11).
 * 제미나이는 앞부분이 «글자 하나까지 똑같은» 요청을 자동으로 캐시해, 그 부분의 입력 토큰을
 * 정가의 약 10% 로 매긴다. 우리 공개 챗은 입력이 전체 토큰의 97% 라 여기가 곧 비용이다.
 * ⚠️ 이것도 추정이다 — 정산 기준 아님(구글 콘솔이 정본). 감 잡는 용도.
 */
export const CACHED_INPUT_RATE = 0.1;

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
  // 받아쓰기 전용(Gemini 3.5 Transcribe, 실험 2026-09-05) — 공식 가격표: 입력 $2.00(오디오)/출력 $12.00 per 1M
  "gemini-transcribe": { inputPer1M: 2.0, outputPer1M: 12.0 },
};

/** 모델명(별칭 포함) → 단가. 임베딩이면 임베딩 단가, 그 외는 flash 로 보수적 추정. */
export function priceForModel(model: string): ModelPrice {
  const m = (model || "").toLowerCase();
  if (m.includes("embedding")) return MODEL_PRICING["gemini-embedding"];
  if (m.includes("transcribe")) return MODEL_PRICING["gemini-transcribe"];
  return MODEL_PRICING["gemini-flash"];
}

/**
 * 토큰 수 → 추정 비용(USD). 토큰 미상이면 0. numeric(12,6) 정밀도로 반올림.
 *
 * `cachedTokens` 는 «입력 토큰 중 캐시로 재사용된 몫»이다(제미나이 promptTokenCount 에 이미
 * 포함돼 들어오므로 빼서 따로 싸게 매긴다). 안 넘기면 예전과 완전히 같은 계산이다.
 */
export function estimateCostUsd(
  model: string,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined,
  cachedTokens: number | null | undefined = null
): number {
  const p = priceForModel(model);
  const inTok = promptTokens ?? 0;
  const outTok = completionTokens ?? 0;
  // 캐시 토큰이 입력보다 크게 보고되는 일은 없어야 하지만, 방어적으로 잘라 음수 단가를 막는다.
  const cached = Math.min(Math.max(cachedTokens ?? 0, 0), inTok);
  const freshIn = inTok - cached;
  const cost =
    (freshIn / 1_000_000) * p.inputPer1M +
    (cached / 1_000_000) * p.inputPer1M * CACHED_INPUT_RATE +
    (outTok / 1_000_000) * p.outputPer1M;
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
  /** 입력 토큰 중 캐시로 재사용된 몫. 모르면 null(= 아직 못 잼), 0 이면 «캐시가 안 걸렸다». */
  cachedTokens: number | null;
} {
  if (!usage || typeof usage !== "object") {
    return { promptTokens: null, completionTokens: null, totalTokens: null, cachedTokens: null };
  }
  const u = usage as Record<string, unknown>;
  const prompt = (u.promptTokens ?? u.inputTokens ?? null) as number | null;
  // ⚠️ 「생각 토큰」도 출력으로 청구된다. 구글은 별도 필드(thoughtsTokenCount / reasoningTokens)로
  // 주고 SDK 의 completionTokens 에는 «안» 들어 있다. 안 더하면 출력 비용을 절반 이하로
  // 과소집계한다 — 2026-08-14 실측: 같은 질문에서 답변 411 토큰 / 생각 631 토큰(출력의 61%).
  const thoughts = (u.thoughtsTokenCount ?? u.reasoningTokens ?? u.thoughtsTokens ?? null) as number | null;
  const completionRaw = (u.completionTokens ?? u.outputTokens ?? null) as number | null;
  const completion =
    completionRaw != null ? Number(completionRaw) + Number(thoughts ?? 0) : (thoughts != null ? Number(thoughts) : null);
  const total =
    (u.totalTokens as number | undefined) ??
    (prompt != null && completion != null ? prompt + completion : null);
  // 캐시 적중 토큰의 «실제 위치»를 설치된 판으로 확인해 둔 것 (2026-08-11, ai 6.0.168):
  //   usage.inputTokenDetails.cacheReadTokens  ← 지금 우리가 받는 자리(정답)
  //   usage.inputTokens                        ← 캐시분을 «포함한» 총 입력 (그래서 아래서 빼야 한다)
  // ⚠️ 처음엔 `cachedInputTokens` 를 봤는데 **그 이름은 이 판에 없다** → 조용히 0건 기록될 뻔했다.
  //    (같은 부류의 사고 전례: `useSearchGrounding` 이 없는 키라 웹검색이 한 번도 안 돌았음.)
  //    옛/새 판 이름도 같이 받아둔다 — 판이 올라가며 자리가 또 바뀌어도 계측이 죽지 않게.
  const details = (u.inputTokenDetails ?? {}) as Record<string, unknown>;
  const cached = (details.cacheReadTokens ??
    u.cachedInputTokens ??
    u.cachedContentTokenCount ??
    u.cacheReadInputTokens ??
    null) as number | null;
  return {
    promptTokens: prompt != null ? Number(prompt) : null,
    completionTokens: completion != null ? Number(completion) : null,
    totalTokens: total != null ? Number(total) : null,
    cachedTokens: cached != null ? Number(cached) : null,
  };
}
