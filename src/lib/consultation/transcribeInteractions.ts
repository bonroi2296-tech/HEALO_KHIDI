/**
 * Gemini 3.5 Transcribe — 받아쓰기 «전용» 모델을 Interactions API 로 부른다 (실험, 2026-09-05).
 *
 * 왜 따로 짰나: 이 모델은 우리가 쓰는 generateContent(AI SDK `google(model)`)가 아니라
 *   별도 엔드포인트(`/v1beta/interactions`)만 받는다. AI SDK 받아쓰기 표에도 Gemini 는 없다.
 * 무엇이 다른가: «생각(thinking)» 토큰이 없다(9/01 자막 잘림의 뿌리가 구조적으로 없다) ·
 *   카자흐어(kk-KZ) 명시 지원 · 단가 파일 기준 분당 약 $0.005.
 * 켜는 법: env `STT_TRANSCRIBE_MODEL=gemini-3.5-transcribe`. 비어 있으면(기본) 라우트가 이 모듈을 안 부른다.
 * 한계·미검증: 이 상자엔 API 키가 없어 **실호출 0회**. 요청·응답 모양은 공식 문서의 REST 예시
 *   (`steps[].content[].text`) 기준이고, 모양이 다르면 `found=false` 로 돌려 라우트가 기존 Flash 경로로 떨어진다.
 *   usage(토큰) 키 이름은 문서에 없어 후보 이름 여러 개를 관대하게 읽는다 — 첫 실호출 뒤 하나로 좁혀라.
 */

export const INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/** 우리 언어 코드 → 모델이 받는 BCP-47. 모르는 코드는 빈 문자열(= 힌트를 안 준다). */
const LANG_TO_BCP47: Record<string, string> = {
  ko: "ko-KR",
  ru: "ru-RU",
  en: "en-US",
  kz: "kk-KZ",
  zh: "cmn-Hans-CN",
  ja: "ja-JP",
};
export function bcp47For(lang: string): string {
  return LANG_TO_BCP47[lang] || "";
}

/** 실험 스위치. 비어 있으면 null = 꺼짐(실서비스 기본). */
export function transcribeExperimentModel(): string | null {
  const v = (process.env.STT_TRANSCRIBE_MODEL || "").trim();
  return v || null;
}

/** 용어 편향 목록(쉼표 구분, 최대 100개). 효과는 미검증 — 포럼에 «안 먹는다» 제보가 있어 기본은 비워 둔다. */
export function customVocabularyFromEnv(): string[] {
  return (process.env.STT_TRANSCRIBE_VOCAB || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
}

export interface TranscribeRequestOpts {
  model: string;
  audioBase64: string;
  mimeType: string;
  languageCodes?: string[];
  customVocabulary?: string[];
}

/** REST 본문(snake_case). 힌트가 하나도 없으면 generation_config 자체를 안 붙인다(= 자동 감지). */
export function buildTranscribeRequest(o: TranscribeRequestOpts): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: o.model,
    input: [{ type: "audio", data: o.audioBase64, mime_type: o.mimeType }],
  };
  const tc: Record<string, unknown> = {};
  const langs = (o.languageCodes || []).filter(Boolean);
  if (langs.length) tc.language_codes = langs;
  const vocab = (o.customVocabulary || []).filter(Boolean).slice(0, 100);
  if (vocab.length) tc.custom_vocabulary = vocab;
  if (Object.keys(tc).length) body.generation_config = { transcription_config: tc };
  return body;
}

export interface ParsedTranscribe {
  /** 받아쓴 글. 말이 없으면 "". */
  text: string;
  /** text 조각이 «있기는 했나». false = 응답 모양이 예상과 다르다(빈 자막이 아니라 폴백 신호). */
  found: boolean;
  status: string;
  usage: { promptTokens: number | null; completionTokens: number | null } | null;
  /** 모양이 다를 때 로그에 남길 최상위 키 이름들(내용은 안 남긴다). */
  topKeys: string[];
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && v !== null && v !== undefined && v !== "" ? n : null;
}

function readUsage(u: unknown): ParsedTranscribe["usage"] {
  if (!u || typeof u !== "object") return null;
  const x = u as Record<string, unknown>;
  const p = num(x.input_tokens ?? x.prompt_tokens ?? x.prompt_token_count ?? x.promptTokenCount ?? x.inputTokens);
  const c = num(
    x.output_tokens ?? x.completion_tokens ?? x.candidates_token_count ?? x.candidatesTokenCount ?? x.outputTokens
  );
  if (p == null && c == null) return null;
  return { promptTokens: p, completionTokens: c };
}

export function parseTranscribeResponse(json: unknown): ParsedTranscribe {
  const j = (json && typeof json === "object" ? json : {}) as Record<string, any>;
  const topKeys = Object.keys(j);
  const status = String(j.status ?? "");
  const texts: string[] = [];
  let found = false;
  const steps = Array.isArray(j.steps) ? j.steps : [];
  for (const s of steps) {
    const content = Array.isArray(s?.content) ? s.content : [];
    for (const c of content) {
      if (c && c.type === "text" && typeof c.text === "string") {
        found = true;
        texts.push(c.text);
      }
    }
  }
  // SDK 편의 필드가 REST 에도 실려 오면 그것을 우선한다(조각을 이어 붙인 것보다 정확하다).
  if (typeof j.output_text === "string") {
    found = true;
    texts.length = 0;
    texts.push(j.output_text);
  }
  const usage = readUsage(j.usage ?? j.usage_metadata ?? j.usageMetadata);
  return { text: texts.join(" ").replace(/\s+/g, " ").trim(), found, status, usage, topKeys };
}

export interface TranscribeCallOpts {
  model: string;
  audio: Uint8Array;
  mimeType: string;
  languageCodes?: string[];
  customVocabulary?: string[];
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * 실제 호출. 오류는 던진다(라우트가 잡아 Flash 경로로 폴백). 응답 본문 오류 문구는 로그용
 * 200자로만 자른다 — 사용자 응답에는 절대 싣지 않는다(라우트 쪽 규칙).
 */
export async function transcribeViaInteractions(
  opts: TranscribeCallOpts
): Promise<ParsedTranscribe & { elapsedMs: number }> {
  const apiKey = opts.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing");
  const body = buildTranscribeRequest({
    model: opts.model,
    audioBase64: Buffer.from(opts.audio).toString("base64"),
    mimeType: opts.mimeType,
    languageCodes: opts.languageCodes,
    customVocabulary: opts.customVocabulary ?? customVocabularyFromEnv(),
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25_000);
  const t0 = Date.now();
  try {
    const res = await fetch(INTERACTIONS_ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const elapsedMs = Date.now() - t0;
    if (!res.ok) {
      const snippet = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`interactions ${res.status}: ${snippet}`);
    }
    const json = await res.json();
    return { ...parseTranscribeResponse(json), elapsedMs };
  } finally {
    clearTimeout(timer);
  }
}
