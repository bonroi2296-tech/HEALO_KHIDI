/**
 * /api/inquiry/classify-doc — 환자가 올린 서류를 «열어보고» 무슨 서류인지 추정한다.
 *
 * 왜 필요한가: 실서비스 문의에 실제로 올라온 파일 이름이 `папка 2.rar`·`мед доки.pdf`·
 * `image01.png` 였다. 종류별 칸을 나눠 달라고 해도 사람은 뭐가 뭔지 모르고 넣는다.
 * 그래서 «분류는 우리가 한다» — 환자는 가진 걸 그대로 올리고, 화면이 그 자리에서
 * 「이건 조직검사네요 / 진단서가 아직 없습니다」를 말해준다.
 *
 * 실측(2026-08-11, 실제 환자 서류): 원본 6개 중 6개가 글자를 못 뽑는다
 * (3개는 사진 스캔, 2개는 글꼴 깨짐). 그래서 글자 추출이 아니라 «AI 가 보는» 방식이다.
 * 사진 스캔 5쪽 PDF 기준 7.0~7.5초 / 약 3,700 토큰에 종류·환자명·날짜·진단명까지 나왔다.
 *
 * ⚠️ 결과는 «추정»이다. 사용자가 화면에서 고칠 수 있어야 하고(PO 결정 2026-08-12),
 *    이 값만 보고 의료 판단을 하면 안 된다.
 */
export const runtime = "nodejs";

import "server-only";
import { NextRequest } from "next/server";
import {
  checkRateLimitPersistent,
  getClientIp,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/lib/rateLimit";
import { DOC_KINDS, isKnownKind } from "@/lib/inquiry/docKinds";

// Vercel 은 요청 본문 4.5MB 벽이 있다. 그보다 큰 서류·영상은 여기로 안 보내고
// 「코디네이터가 확인합니다」로 넘긴다(화면이 그렇게 표시한다).
const MAX_BYTES = 4 * 1024 * 1024;

const ACCEPT = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
]);

const KIND_LIST = DOC_KINDS.map((k) => k.value).join("|");

const PROMPT = `You are looking at a medical document a patient uploaded. Identify what it is.
Return ONLY JSON:
{"kind":"${KIND_LIST}",
 "confidence":0..1,
 "patient_name": name written on the document or null,
 "doc_date": "YYYY-MM-DD" or null,
 "diagnosis_text": diagnosis exactly as written in the original language, or null}
Rules: never translate diagnosis_text. If unsure of the kind, use "unknown" — do not guess.`;

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!file) return Response.json({ ok: false, error: "file_required" }, { status: 400 });

  // 큰 파일·영상은 판별 대상이 아니다. 오류가 아니라 «못 봤다»로 돌려준다 —
  // 화면은 그걸 「코디네이터가 확인합니다」로 그린다.
  if (file.size > MAX_BYTES) {
    return Response.json({ ok: true, skipped: "too_large", kind: "unknown" });
  }
  if (!ACCEPT.has(file.type)) {
    return Response.json({ ok: true, skipped: "unsupported_type", kind: "unknown" });
  }

  try {
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: file.type, data: b64 } }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );
    if (!res.ok) return Response.json({ ok: true, skipped: "upstream_error", kind: "unknown" });

    const j = await res.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { /* 형식이 깨졌으면 «판별 못 함»으로 */ }

    // AI 가 목록에 없는 종류를 지어내면 받지 않는다.
    const kind = isKnownKind(parsed?.kind) ? parsed.kind : "unknown";
    return Response.json({
      ok: true,
      kind,
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
      patientName: parsed?.patient_name ?? null,
      docDate: parsed?.doc_date ?? null,
      diagnosisText: parsed?.diagnosis_text ?? null,
    });
  } catch {
    // 서버 오류 문구를 그대로 내보내지 않는다(보안 규칙). 화면은 코디 확인으로 넘긴다.
    return Response.json({ ok: true, skipped: "internal_error", kind: "unknown" });
  }
}
