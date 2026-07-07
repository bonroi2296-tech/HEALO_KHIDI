/**
 * healwith: 디자인타임 생성 파일럿 (Stitch 방식 재현)
 *
 * POST /api/astryx-pilot/draft  { screen: string }
 * - Stitch가 하는 일(= Gemini + DESIGN.md → 화면 코드)을 우리 스택에서 재현.
 * - DESIGN.md 토큰을 프롬프트에 넣어 온-브랜드(teal) self-contained HTML 1장을 생성.
 * - 외부 CDN/폰트 금지(오프라인 렌더 확실). 공개 POST 안전패턴 준수.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getClientIp, checkRateLimitPersistent, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";

// DESIGN.md §4 토큰 발췌 — 생성 강제용(허브에서 가져온 단일 SoR 값).
const TOKENS = `브랜드/토큰(반드시 준수):
- primary teal #0d9488 (hover #0f766e, subtle bg #f0fdfa, border #ccfbf1)
- 텍스트 #111827(주)/#6b7280(보조), 배경 #ffffff/#f9fafb, 테두리 #e5e7eb
- success #10b981, warning #f59e0b, danger #ef4444
- 모서리 반경 12px(카드·버튼), 16px(큰 카드), 알약(배지)만 999px
- 시스템 폰트(system-ui). serif 금지. 그라데이션 배경 금지.
- 그림자: 카드 부드럽게(rgba(0,0,0,.06) 정도), 호버는 그림자만(확대·회전 금지)
- 간격 넉넉히, 숫자는 tabular(font-variant-numeric: tabular-nums)
"AI가 만든 느낌" 회피: 똑같은 카드 3~4개 반복 금지, 큰 컬러원+큰아이콘 금지, 의미없는 영문 카피 금지, 이모지 UI크롬 금지.
의료 도메인: 불안한 암환자 대상 차분·신뢰 톤. 가짜 수치·치료결과 단정/과장 표현 금지(의료광고법). 한국어.`;

const SYSTEM = `너는 healwith(카자흐스탄·러시아 암환자를 한국 종양병원과 잇는 의료관광 서비스)의 시니어 프로덕트 디자이너다.
요청받은 화면을 **완전한 self-contained HTML 문서 하나**로 만든다.
엄격 규칙:
- 출력은 오직 HTML 코드만. 설명·마크다운 펜스(\`\`\`) 금지. <!doctype html>로 시작.
- 모든 스타일은 문서 안 <style> 블록에 인라인 CSS로. 외부 CSS/JS/폰트/이미지/CDN 절대 금지(네트워크 요청 0).
- 이미지가 필요하면 실제 <img> 대신 회색 플레이스홀더 박스(배경색+라벨)로.
- 반응형(모바일 우선). 아래 브랜드 토큰을 정확히 지켜라.
${TOKENS}`;

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const [rl, aiGuard] = await Promise.all([
    checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT),
    checkAiGuards(clientIp, "/api/astryx-pilot/draft"),
  ]);
  if (!rl.allowed) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  if (!aiGuard.allowed) return Response.json({ ok: false, error: aiGuard.code }, { status: aiGuard.status });
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return Response.json({ ok: false, error: "no_model" }, { status: 503 });

  try {
    const body = await request.json().catch(() => ({}));
    const screen = typeof body?.screen === "string" ? body.screen.slice(0, 600) : "";
    if (!screen.trim()) return Response.json({ ok: false, error: "empty_screen" }, { status: 400 });

    const result = await generateText({
      model: google("gemini-flash-latest") as any,
      system: SYSTEM,
      messages: [{ role: "user", content: `이 화면을 만들어줘: ${screen}` }],
      temperature: 0.7,
      maxOutputTokens: 8000,
    });

    // 혹시 모델이 펜스를 붙이면 제거.
    let html = (result.text || "").trim();
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    if (!/<(!doctype|html)/i.test(html)) return Response.json({ ok: false, error: "bad_output" }, { status: 502 });

    return Response.json({ ok: true, html });
  } catch {
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
