/**
 * healwith: gen-UI 파일럿 API (실제 LLM 툴콜)
 *
 * POST /api/astryx-pilot/genui
 * - 파일럿: 챗봇이 텍스트 대신 "검증된 컴포넌트"를 렌더하도록, Gemini가
 *   화이트리스트 tool 중 하나를 선택하게 한다(DESIGN.md 「런타임 gen-UI 화이트리스트」).
 * - tool 은 execute 없음 → 모델은 "어떤 컴포넌트를 어떤 인자로 보여줄지"만 정하고,
 *   실제 렌더는 클라이언트가 함(자유 UI 생성 아님 = 의료 안전).
 * - 공개 POST → 회수제한 + AI 비용가드 필수. 에러는 코드형만(메시지 비노출).
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { getClientIp, checkRateLimitPersistent, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";

const SYSTEM = `너는 healwith(한국 종양병원 원격협진 의료관광)의 안내 도우미다. 카자흐스탄·러시아 등 해외 암환자와 보호자를 돕는다.
규칙:
- 사용자의 의도가 아래 도구 중 하나에 해당하면 반드시 그 도구를 호출해 UI를 보여줘라(장황한 설명 대신).
- 도구 밖의 UI를 지어내지 마라. 진단·처방·치료효과 보장 발언 금지(의료광고법). 가짜 수치 금지.
- 짧고 차분한 한국어로. 불안한 환자를 배려.
도구:
- showHospitalCompare: 병원 비교/추천/어디가 좋은지 물을 때
- showBookingSlots: 영상 협진 예약/상담 시간을 원할 때
- showCostEstimate: 비용/가격/얼마를 물을 때
- showChannelPicker: 코디네이터 연결/문의 채널을 원할 때
도구가 안 맞으면 한두 문장으로 답하고, 위 주제로 자연스럽게 안내해라.`;

// tool 들은 execute 없음 — 모델은 "무엇을 보여줄지"만 정하고 렌더는 클라이언트가 한다.
const tools = {
  showHospitalCompare: tool({
    description: "조건에 맞는 병원 비교 카드를 보여준다.",
    inputSchema: z.object({
      specialty: z.string().optional().describe("암종/진료과 예: 폐암, 유방암"),
    }),
  }),
  showBookingSlots: tool({
    description: "영상 협진 예약 가능 시간(슬롯) 피커를 보여준다.",
    inputSchema: z.object({}),
  }),
  showCostEstimate: tool({
    description: "예상 비용 범위 요약을 보여준다(공식 진료비 자료 기준).",
    inputSchema: z.object({
      treatment: z.string().optional().describe("치료 종류 예: 정밀검사, 항암"),
    }),
  }),
  showChannelPicker: tool({
    description: "코디네이터와 연결할 메신저 채널 선택을 보여준다.",
    inputSchema: z.object({}),
  }),
};

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const [rl, aiGuard] = await Promise.all([
    checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT),
    checkAiGuards(clientIp, "/api/astryx-pilot/genui"),
  ]);
  if (!rl.allowed) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  if (!aiGuard.allowed) return Response.json({ ok: false, error: aiGuard.code }, { status: aiGuard.status });

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // 키 없으면 클라가 모의(키워드) 폴백하도록 신호.
    return Response.json({ ok: false, error: "no_model" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.slice(0, 500) : "";
    if (!message.trim()) return Response.json({ ok: false, error: "empty_message" }, { status: 400 });

    const result = await generateText({
      model: google("gemini-flash-latest") as any,
      system: SYSTEM,
      messages: [{ role: "user", content: message }],
      tools,
      toolChoice: "auto",
      temperature: 0.3,
    });

    const toolCalls = (result.toolCalls || []).map((tc: any) => ({
      name: tc.toolName,
      args: tc.input ?? tc.args ?? {},
    }));

    return Response.json({ ok: true, text: result.text || "", toolCalls });
  } catch {
    // 메시지 비노출(보안 규칙) — 코드형만.
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
