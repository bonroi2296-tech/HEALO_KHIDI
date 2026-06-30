/**
 * 시장 인텔리전스 → 마케팅 브리프 요약(선택) — Gemini 로 raw 신호를 사람이 읽을 한 장으로.
 *
 * 챗봇과 동일한 gemini-flash-latest 사용(PO 결정: 최신 별칭 유지). API 키 없으면 조용히 스킵
 * (수집·CSV·마크다운은 그대로 나옴 — 요약은 부가가치일 뿐 필수 아님).
 *
 * 출력은 운영자 내부용 — 환자에게 안 나감. 단, 과장 금지(완치·근거없는 수치)는 동일하게 지킨다.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { IntelItem } from "../collectors/market-intel-collector";

export async function summarizeIntel(items: IntelItem[]): Promise<string | null> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log("  ⚠️ GOOGLE_GENERATIVE_AI_API_KEY 없음 — AI 요약 스킵(수집 결과는 그대로 저장).");
    return null;
  }
  if (!items.length) return null;

  // 토큰 절약: 상위 40건의 제목·소스·언어·스니펫만 모델에 전달
  const sample = items.slice(0, 40).map((it, i) =>
    `${i + 1}. [${it.platform}/${it.lang || "-"}] ${it.title}` +
    (it.snippet ? ` — ${it.snippet.slice(0, 160)}` : "")
  ).join("\n");

  const prompt = [
    "당신은 한국 암치료 의료관광 플랫폼 'healwith'(타겟: 러시아·CIS·카자흐스탄·중국 환자)의 시장조사 분석가입니다.",
    "아래는 공개 뉴스·커뮤니티에서 수집한 시장 신호 목록입니다. 마케팅·운영에 쓸 한 장짜리 브리프를 한국어 평문으로 작성하세요.",
    "",
    "규칙:",
    "- 평문만(마크다운 ##·** 금지). 섹션은 '■' 제목 + '- ' 목록.",
    "- 근거 없는 수치·완치 단정 금지(의료 과장광고 리스크). 신호에 실제로 나온 내용만.",
    "- 추측은 '추정'이라 표기. 신호가 빈약하면 솔직히 '신호 부족'이라 쓰세요.",
    "",
    "다음 구조로:",
    "■ 핵심 동향 3~5줄",
    "■ 경쟁/비교 신호 (다른 의료관광국·병원 언급)",
    "■ 환자 관심사·불만·질문 (커뮤니티에서)",
    "■ 우리(healwith)에게 시사점·액션 아이디어 2~3개",
    "",
    "[수집된 시장 신호]",
    sample,
  ].join("\n");

  try {
    const result = await generateText({
      model: google("gemini-flash-latest") as any,
      prompt,
      maxTokens: 1200,
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    } as any);
    return (result.text || "").trim() || null;
  } catch (e: any) {
    console.warn(`  ⚠️ AI 요약 실패: ${String(e?.message || e).slice(0, 80)}`);
    return null;
  }
}
