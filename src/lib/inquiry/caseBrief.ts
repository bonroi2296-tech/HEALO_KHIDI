/**
 * healwith: 문의 → 코디용 "케이스 브리프" (빠른 의사판단 보조)
 *
 * 코디가 문의상세에서 버튼을 누르면, 접수된 구조화 인테이크 + 메시지 + 첨부 의료문서(멀티모달)를
 * Gemini가 다 읽고 한 화면 브리프로 정리한다:
 *   ① 환자 개요(누구·무슨 상태)  ② 원하는 것  ③ 코디가 볼 포인트/다음 액션  ④ 주의 플래그
 *
 * ⚠️ 의료 레드라인(triage.ts 와 동일): 확정진단·처방·결과보장 금지. 이건 "AI가 정리한 초안"이고
 *    최종 판단은 코디·의료진 몫 — 응답에 항상 검수 라벨을 붙여 노출한다(클라이언트).
 *    개인식별정보(이름·연락처)는 브리프에 넣지 않는다(임상 요약만) → 평문 노출 최소화.
 *
 * 저장하지 않는다(on-demand). message 가 암호화 PII라, 합성 브리프를 평문 저장하면 보호가 약해짐.
 * → 번역 기능과 동일하게 생성 즉시 화면에만 표시(캐시가 필요해지면 그때 암호화 저장 검토).
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { redactModelPii } from "../security/redactModelPii";
import { logAiUsage } from "@/lib/ai/usageLog";
import { fetchGeminiWithCompat } from "@/lib/ai/geminiThinkingCompat";

const MODEL = "gemini-flash-latest";

// Gemini inlineData 로 직접 판독 가능한 타입만(이미지 + PDF). doc/docx 는 모델이 못 읽음.
const MODEL_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

type Attachment = { path?: string | null; name?: string | null; type?: string | null };

export type CaseBrief = {
  overview: string;        // 한 줄 개요(누구·무슨 상태) — 이름 없이 임상 위주
  request: string;         // 환자가 원하는 것(치료·일정·우선순위)
  points: string[];        // 코디가 볼 포인트 / 다음 액션
  red_flags: string[];     // 주의 깊게 볼 점(있으면)
};

export type CaseBriefResult =
  | { ok: true; brief: CaseBrief; unreadableCount: number }
  | { ok: false; error: string };

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    request: { type: "string" },
    points: { type: "array", items: { type: "string" } },
    red_flags: { type: "array", items: { type: "string" } },
  },
  required: ["overview", "request", "points"],
};

// 저장소에서 모델이 읽을 수 있는 첨부만 base64 inlineData 로.
async function loadInlineParts(attachments: Attachment[]): Promise<{ parts: any[]; unreadable: number }> {
  const parts: any[] = [];
  let total = 0;
  let unreadable = 0;
  for (const att of (attachments || []).slice(0, MAX_FILES)) {
    const type = att?.type || (att?.name ? guessType(att.name) : "") || "";
    if (!att?.path || !MODEL_READABLE.has(type)) { unreadable++; continue; }
    try {
      const { data, error } = await supabaseAdmin.storage.from("attachments").download(att.path);
      if (error || !data) { unreadable++; continue; }
      const buf = Buffer.from(await data.arrayBuffer());
      if (total + buf.length > MAX_TOTAL_BYTES) break;
      total += buf.length;
      parts.push({ inlineData: { mimeType: type, data: buf.toString("base64") } });
    } catch { unreadable++; }
  }
  return { parts, unreadable };
}

function guessType(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "";
}

/**
 * 브리프 입력 서명 — 첨부가 바뀌면(추가/삭제) 캐시를 stale 로 감지해 다음 열람 때 자동 재생성.
 * 첨부 경로만 쓰므로 비민감(경로는 난수 파일명). 저장(POST)·판정(GET) 양쪽이 같은 함수로 계산.
 */
export function briefSig(attachments: Attachment[] | null | undefined): string {
  const paths = (attachments || []).map((a) => a?.path || "").filter(Boolean).sort();
  return `${paths.length}:${paths.join("|")}`;
}

// 구조화 인테이크(복호화된 inquiry)에서 브리프에 쓸 비식별 임상 컨텍스트만 뽑아 텍스트로.
function buildContext(inq: any): string {
  const intake = inq?.intake && typeof inq.intake === "object" ? inq.intake : {};
  const looksEnc = (s: any) => typeof s === "string" && /^\{"(v|iv|tag|data)"\s*:/.test(s.trim());
  const clean = (v: any) => (looksEnc(v) ? null : v);
  const lines: string[] = [];
  if (inq?.nationality) lines.push(`nationality: ${inq.nationality}`);
  if (inq?.cancer_type) lines.push(`cancer_type: ${inq.cancer_type}`);
  if (clean(intake.stage)) lines.push(`stage: ${intake.stage}`);
  if (clean(intake.treatment_state)) lines.push(`treatment_state: ${clean(intake.treatment_state)}`);
  if (clean(intake.diagnosis_date)) lines.push(`diagnosis_date: ${clean(intake.diagnosis_date)}`);
  if (clean(intake.travel_timing)) lines.push(`travel_timing: ${intake.travel_timing}`);
  if (Array.isArray(intake.priorities) && intake.priorities.length) {
    lines.push(`priorities: ${intake.priorities.map((p: string) => PRIORITY_KO[p] || p).join(", ")}`);
  }
  if (inq?.preferred_date) lines.push(`preferred_date: ${inq.preferred_date}`);
  return lines.join("\n");
}

// 우선순위 코드 → 한글 라벨(신·구 값 모두). 서버 모듈이라 intakeLabels(lucide) 를 안 끌어오려고 인라인.
const PRIORITY_KO: Record<string, string> = {
  cost: "비용", fast_start: "빠른 치료 시작", short_stay: "짧은 체류·치료 기간", expertise: "의료진·병원 실력", communication: "소통·통역",
  price: "가격", duration: "기간", doctor: "의료진", accessibility: "접근성",
};

function buildPrompt(): string {
  return [
    "You are a medical-tourism case coordinator's assistant for healwith (Korea, oncology).",
    "A foreign patient (Russian/Kazakh/CIS) submitted an inquiry. You are given: (1) structured intake fields, (2) the patient's free-text message, (3) uploaded medical documents (images/PDF).",
    "Produce a CONCISE Korean BRIEF that lets the coordinator make a fast judgment. Output JSON:",
    "- overview: one or two sentences — who (age/sex if evident, nationality) and their clinical situation (what the records/intake suggest). Use careful, non-definitive language ('~로 보임', '~시사'). DO NOT include the patient's name, phone, email, or any personal identifier.",
    "- request: ONLY what the patient EXPLICITLY stated — from their free-text message and the intake fields (travel timing, stated priorities, the treatment stage they reported). Do NOT name or infer a specific treatment (e.g. conization/LEEP) that the patient did not state. If the patient did not specify a desired treatment, say so plainly (e.g. '구체적 치료는 명시하지 않음') — never invent a wish.",
    "  When listing the patient's priorities, quote each selected option by its plain label ONLY (e.g. '의료진', '비용', '빠른 치료 시작'). Do NOT expand a label into an interpretive phrase — e.g. do NOT turn '의료진' into '의료진의 전문성', or '기간/짧은 체류' into '치료 기간 단축'. Just state which priorities they picked.",
    "- points: array of short bullet strings — what the coordinator should look at or do next. Put YOUR CLINICAL INFERENCES here (e.g. 'CIN3 → 원추절제술(LEEP) 검토 대상'), clearly framed as coordinator considerations, NOT as the patient's request. Also: needed precision tests, suggested hospital department, missing documents, scheduling.",
    "- red_flags: array of short strings — anything needing careful attention (urgency, abnormal critical values, contradictions). Empty array if none.",
    "",
    "RULES (medical redline): You are NOT the treating doctor. Do NOT give a definitive diagnosis, prescribe, or guarantee outcomes. Summarize what the records appear to show, carefully. Preserve any critical values/findings faithfully (do not invent). **Strictly separate what the patient STATED (goes in `request`) from your clinical INFERENCE (goes in `points`) — never present an inference as the patient's stated wish.** Keep it brief and skimmable. Write everything in Korean.",
    "Return ONLY the JSON object.",
  ].join("\n");
}

/**
 * 문의 1건의 케이스 브리프를 생성한다. inquiry 는 복호화된 상세(API 가 넘김).
 * 저장하지 않고 결과만 반환. 모델 실패/키없음이면 error 코드형 반환.
 */
export async function generateCaseBrief(opts: {
  inquiry: any;
  attachments: Attachment[];
}): Promise<CaseBriefResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };

  const { parts: fileParts, unreadable } = await loadInlineParts(opts.attachments || []);
  const context = buildContext(opts.inquiry);
  const rawMsg = typeof opts.inquiry?.message === "string" ? opts.inquiry.message : "";
  const safeMsg = redactModelPii(rawMsg).trim();

  const userText =
    `Structured intake:\n${context || "(none)"}\n\n` +
    (safeMsg ? `Patient message: "${safeMsg}"\n\n` : "") +
    (fileParts.length ? "Uploaded medical documents are attached — read them.\n" : "No documents uploaded.\n") +
    "Produce the JSON brief.";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    // 별칭 세대 교체 생존 사다리 — thinkingBudget 거절(400) 시 강등 재시도(geminiThinkingCompat).
    const res = await fetchGeminiWithCompat(url, {
      systemInstruction: { parts: [{ text: buildPrompt() }] },
      contents: [{ role: "user", parts: [{ text: userText }, ...fileParts] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: "minimal" },
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!res.ok) return { ok: false, error: "model_http_error" };
    const json = await res.json();

    logAiUsage({
      surface: "case_brief",
      model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { attachments: fileParts.length },
    }).catch(() => {});

    const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "parse_error" }; }
    if (!parsed || !parsed.overview) return { ok: false, error: "empty_result" };

    return {
      ok: true,
      unreadableCount: unreadable,
      brief: {
        overview: String(parsed.overview || ""),
        request: String(parsed.request || ""),
        points: Array.isArray(parsed.points) ? parsed.points.map((s: any) => String(s)) : [],
        red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map((s: any) => String(s)) : [],
      },
    };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}
