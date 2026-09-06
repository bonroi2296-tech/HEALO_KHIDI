/**
 * healwith: AI 가르치기 — 추천 초안(Suggest) API
 *
 * POST /api/admin/playbook/suggest
 * - 가르치기 박스를 열 때, 그 질문에 대한 "이상적인 답변 초안"을 AI가 먼저 써준다.
 * - PO는 초안을 고치기만 하면 됨(백지에서 작성 X). 채점 흐름을 오염시키지 않도록
 *   목적 전용 generateText 호출(judge/로그 없음).
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { getModel } from "@/lib/chat/generateReply";
import { callGeminiWithCompat, DEFAULT_THINKING_LEVEL } from "@/lib/ai/geminiThinkingCompat";

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const LANG_NAME: Record<string, string> = {
  ko: "Korean", en: "English", ru: "Russian", kz: "Kazakh", zh: "Chinese", ja: "Japanese",
};

function detectLang(text: string): string {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[Ѐ-ӿ]/.test(text)) return "ru";
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  return "en";
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const question = String(body?.question ?? "").trim();
    if (!question) {
      return Response.json({ ok: false, error: "question is required" }, { status: 400 });
    }
    let language = String(body?.language ?? "").trim();
    if (!LANG_NAME[language]) language = detectLang(question);

    const model = getModel();
    if (!model) {
      return Response.json({ ok: false, error: "model_unavailable" }, { status: 503 });
    }

    const system = [
      "You are healwith's medical concierge connecting international cancer patients to Korean hospitals.",
      `Write the IDEAL answer to the patient's question below, in ${LANG_NAME[language] || "the user's language"}.`,
      "Style: warm, human, concise (3-5 short sentences). Plain text only (no markdown).",
      "Frame care as a journey: surgery/chemo at partner university hospitals is the core; immune/rehab is supportive (never a cure).",
      "healwith's role: connect to the right hospital + accompany with coordinator + interpretation.",
      "NEVER: diagnose, recommend a specific treatment choice, name drugs/doses, state survival/cure rates, give a fixed price (ranges only if asked), or rank hospitals.",
      "This is a DRAFT for a human admin to edit, so keep it general and safe.",
    ].join("\n");

    // 별칭 세대 교체 생존 사다리(geminiThinkingCompat) — 이 라우트만 사다리 없이 "minimal" 을 그대로
    // 보내고 있었다(2026-09-06 발견). 지금 세대는 그 값을 400 으로 거절하므로 늘 500 이었을 자리.
    const result = await callGeminiWithCompat(
      (p) => generateText(p as any),
      {
        model,
        system,
        messages: [{ role: "user", content: question }] as any,
        maxOutputTokens: 1024,
        providerOptions: {
          google: {
            thinkingConfig: { thinkingLevel: DEFAULT_THINKING_LEVEL },
            safetySettings: SAFETY_SETTINGS as any,
          },
        },
      },
    );

    const suggestion = (result?.text || "").trim();
    if (!suggestion) {
      return Response.json({ ok: false, error: "empty_suggestion" }, { status: 502 });
    }

    return Response.json({ ok: true, suggestion, language });
  } catch (err: any) {
    console.error("[POST /api/admin/playbook/suggest] Unexpected:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
