/**
 * AI SDK 결과에서 «실제로 응답한 모델판»을 꺼낸다.
 *
 * 왜: `gemini-flash-latest` 는 별칭이라 구글이 세대를 바꾸면 소리 없이 다른 모델이 답한다
 *     (#110·#122 부류 사고의 뿌리). 2026-09-05 3.8 Flash GA 뒤 「넘어갔나」를 물었는데
 *     사용 기록(`ai_usage_events.meta`)에 모델판이 한 줄도 없어 실DB 로 못 쟀다.
 * 어디서: 제미나이 응답 본문의 `modelVersion`(예: "gemini-3.7-flash"). AI SDK 는 이 값을
 *     `response.modelId` 로 올려주지 않고(요청한 별칭을 그대로 돌려준다) `response.body` 에
 *     원본 JSON 만 실어 준다 → 거기서 직접 읽는다.
 * 한계: «생성(generateText)» 경로만 된다. 스트리밍 경로는 SDK 가 본문을 안 넘긴다.
 */
export function readServedModel(response: unknown): string | null {
  const r = response as { body?: unknown } | null | undefined;
  let body: unknown = r?.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  const v = (body as { modelVersion?: unknown } | null | undefined)?.modelVersion;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
