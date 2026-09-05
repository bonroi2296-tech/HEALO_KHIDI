/**
 * healwith: 짧은 텍스트(코디 메모·타임라인·채팅) 자동번역 — 캐시 우선
 *
 * 왜: 에이전시가 화면 언어를 바꿔도 코디가 쓴 한글 메모는 그대로 한글로 보인다.
 *     이 함수는 한글 메모를 상대 언어로 옮겨준다. 문서번역(translateDoc)과 달리
 *     "짧은 자유문장" 전용 — 표·판독이 아니라 사람 문장을 자연스럽게 번역.
 *
 * 설계:
 *   - (원문해시, 대상언어)로 note_translations 에 캐시 → 같은 문구는 두 번 호출 안 함(비용↓).
 *   - 이미 그 언어인 텍스트는 건너뜀. 「한국어인가」는 «비율»로 본다 — 한 글자 섞였다고
 *     건너뛰면 러시아어 소견 전체가 통째로 빠진다(isMostlyKorean 주석 참고).
 *   - 여러 문장을 한 번의 Gemini 호출로 묶어 번역(라운드트립·비용 최소화).
 *   - 키/모델 실패는 조용히 빈 결과 → 화면은 원문 폴백(끊기지 않게).
 */

import "server-only";

import { createHash } from "crypto";
import { generateText } from "ai";
import { callGeminiWithCompat } from "@/lib/ai/geminiThinkingCompat";
import { google } from "@ai-sdk/google";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { logAiUsage } from "@/lib/ai/usageLog";
import { detectLanguage } from "@/lib/translate";

const MODEL = "gemini-flash-latest";
const TARGET_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;
export type NoteTargetLang = (typeof TARGET_LANGS)[number];

const LANG_NAME: Record<NoteTargetLang, string> = {
  ko: "Korean",
  en: "English",
  ru: "Russian",
  kz: "Kazakh",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
};

export function isNoteTargetLang(v: unknown): v is NoteTargetLang {
  return typeof v === "string" && (TARGET_LANGS as readonly string[]).includes(v);
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * 이미 우리말인가 — «비율»로 본다.
 *
 * 🛑 `containsKorean`(한 글자라도 한글이면 참)으로 되돌리지 마라. 서류 판독기가 러시아어 원문을
 *    옮겨 적다가 한글을 한두 글자 섞어 놓는 일이 실제로 있다. 2026-09-04 실측: 검사 소견
 *    4,217자 안에 「Гепа토мегалия」가 있었고, 그 한 글자 때문에 소견 전체가 «이미 한국어»로
 *    분류돼 번역 목록에서 통째로 빠졌다. 창구는 200 을 주고 다른 6건은 다 번역되니 아무도
 *    실패를 몰랐고, 러시아어 그대로 세브란스 의뢰서에 실릴 뻔했다.
 *    같은 함정이 화면 쪽(HospitalReferralSection)에도 있었다 — 두 곳 다 고쳤다.
 */
export function isMostlyKorean(s: string): boolean {
  const ko = (s.match(/[가-힣]/g) || []).length;
  if (!ko) return false;
  const letters = [...s].filter((c) => !/\s/.test(c)).length;
  return ko * 3 >= letters;
}

function getModel() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY ? (google(MODEL) as any) : null;
}

/**
 * 한글 메모 목록을 대상 언어로 번역. 반환: { 원문 → 번역문 } (번역된 것만; 없는 건 호출부가 원문 폴백).
 * @param texts    번역 후보 원문들(중복·비한글·빈문자 섞여 있어도 됨 — 내부에서 정리)
 * @param lang     대상 언어(en/ru/kz/zh/ja). ko·기타는 빈 결과.
 */
export async function translateNotes(
  texts: (string | null | undefined)[],
  lang: string,
): Promise<Record<string, string>> {
  if (!isNoteTargetLang(lang)) return {};

  // 비어있지 않고 «이미 그 언어가 아닌» 고유 원문만.
  //
  // 예전엔 「한글이 든 것」만 골랐다(`containsKorean`). 그때는 코디 한글 메모를 상대에게
  // 보여주는 한 방향뿐이었기 때문이다. 이제 반대 방향도 필요하다 — **환자가 러시아어로 쓴 글,
  // 의료진이 러시아어로 낸 소견을 우리가 읽어야 한다**(2026-08-06 PO). 그래서 관문을
  // 「한국어냐」가 아니라 「읽을 언어와 다르냐」로 바꿨다.
  const uniq = Array.from(
    new Set(
      (texts || [])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .filter((t) => (lang === "ko" ? !isMostlyKorean(t) : detectLanguage(t) !== lang)),
    ),
  );
  if (uniq.length === 0) return {};

  const out: Record<string, string> = {};
  const hashOf = new Map<string, string>(); // 원문 → 해시
  uniq.forEach((t) => hashOf.set(t, sha256(t)));

  // 1) 캐시 조회
  const hashes = Array.from(hashOf.values());
  try {
    const { data: cached } = await (supabaseAdmin as any)
      .from("note_translations")
      .select("source_hash, translated")
      .in("source_hash", hashes)
      .eq("target_lang", lang);
    const byHash = new Map<string, string>();
    (cached || []).forEach((r: any) => byHash.set(r.source_hash, r.translated));
    for (const [text, h] of hashOf) {
      const hit = byHash.get(h);
      if (hit != null) out[text] = hit;
    }
  } catch {
    /* 캐시 조회 실패는 무시(번역으로 진행) */
  }

  // 2) 미캐시분만 Gemini 배치 번역
  const misses = uniq.filter((t) => out[t] == null);
  if (misses.length === 0) return out;

  const model = getModel();
  if (!model) return out; // 키 없으면 캐시분만 반환(원문 폴백)

  /**
   * 한 번에 몰아 보내면 **답이 상한에서 잘리고, 잘린 JSON 은 통째로 못 읽어 전부 버려진다.**
   * 2026-08-06 실측: 2,736자짜리 소견 1건 + 짧은 글 4건을 한 번에 보냈더니
   * `Unexpected token 'к', "ку напряму"...` — 답이 문장 중간에서 끊겼고 5건 다 날아갔다.
   * (그 전까지 이 함수는 «짧은 코디 메모»만 다뤄서 안 걸렸다.)
   *
   * 그래서 ①상한을 8192 로 올리고 ②글자 수로 나눠 여러 번 부른다. 긴 글 하나면 그것만 한 통.
   * 나눠 부른 것도 각각 캐시에 남으므로 다음부터는 어차피 0원이다.
   */
  const CHUNK_CHARS = 2000;

  /**
   * 🛑 항목 «하나»가 상한을 넘으면 위 규칙으로는 못 나눈다 — 통짜로 한 통이 되고, 그 통의 답이
   *    잘려 그 글만 조용히 사라진다. 2026-09-04 실측: 서류 세 장에서 모은 검사 소견 4,217자를
   *    보냈더니 같이 보낸 짧은 글 6건은 다 돌아오고 «그 하나만» 응답에 없었다. 화면은 실패를
   *    모르니 러시아어 원문을 그대로 두었고, 그대로 두면 세브란스에 러시아어로 나간다.
   * 그래서 긴 글은 «줄 경계»로 쪼개 따로 보내고, 번역문을 줄로 다시 잇는다. 줄 단위라 원문의
   * 구조가 그대로 남고, 조각도 각각 캐시에 들어가 다음부터는 0원이다.
   */
  const longOnes = misses.filter((t) => t.length > CHUNK_CHARS);
  const shortOnes = misses.filter((t) => t.length <= CHUNK_CHARS);

  for (const whole of longOnes) {
    // 조각은 한 통보다 «더 작게» 잡는다 — 답이 원문보다 길어질 수 있고, 조각이 클수록
    // 모델이 항목을 통째로 빠뜨리는 일이 잦다(2026-09-04 실측).
    const pieces = splitByLines(whole, 1200);
    // 조각도 캐시에 남겨야 다음부터 0원이다 — 해시가 없으면 저장 단계에서 통째로 버려진다.
    for (const piece of pieces) if (!hashOf.has(piece)) hashOf.set(piece, sha256(piece));
    const got: Record<string, string> = {};
    // 두 번까지 해 본다. 모델이 답에서 항목을 통째로 빠뜨려도 «예외가 아니라» 조용한 누락이라
    // (translateBatch 는 못 받은 항목을 그냥 건너뛴다) 한 번만 부르면 그 조각만 원문으로 남는다.
    // 2026-09-04 실측: 검사 소견을 다섯 조각으로 나눴더니 세 조각만 돌아와 앞 두 서류가
    // 러시아어인 채로 남았다.
    for (let attempt = 0; attempt < 2; attempt++) {
      const todo = pieces.filter((p) => !got[p]);
      if (!todo.length) break;
      for (const piece of todo) {
        try {
          await translateBatch([piece], lang, model, hashOf, got);
        } catch (err) {
          console.error("[translateNotes] long piece failed:", (err as Error)?.message?.slice(0, 160));
        }
      }
    }
    // 한 조각도 못 옮겼으면 그 글은 손대지 않는다(화면이 원문을 그대로 보여준다).
    if (!pieces.some((p) => got[p])) continue;
    out[whole] = pieces.map((p) => got[p] ?? p).join("\n");
  }

  const chunks: string[][] = [];
  let cur: string[] = [];
  let curLen = 0;
  for (const t of shortOnes) {
    if (cur.length && curLen + t.length > CHUNK_CHARS) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(t);
    curLen += t.length;
  }
  if (cur.length) chunks.push(cur);

  // 한 통이 실패해도 나머지는 살린다 — 예전엔 통짜 try 안이라 하나 깨지면 전부 날아갔다.
  for (const batch of chunks) {
    try {
      await translateBatch(batch, lang, model, hashOf, out);
    } catch (err) {
      console.error("[translateNotes] failed:", (err as Error)?.message?.slice(0, 160));
    }
  }

  return out;
}

/**
 * 긴 글을 «줄 경계»로 잘라 조각으로 만든다. 조각을 `\n` 으로 다시 이으면 원문이 된다.
 * 한 줄 자체가 limit 보다 길면 그 줄이 조각 하나가 된다(줄 가운데를 자르면 문장이 깨진다).
 */
export function splitByLines(text: string, limit: number): string[] {
  const lines = text.split("\n");
  const pieces: string[] = [];
  let cur: string[] = [];
  let len = 0;
  for (const ln of lines) {
    if (cur.length && len + ln.length + 1 > limit) {
      pieces.push(cur.join("\n"));
      cur = [];
      len = 0;
    }
    cur.push(ln);
    len += ln.length + 1;
  }
  if (cur.length) pieces.push(cur.join("\n"));
  return pieces;
}

/** 한 통 번역 → `out` 에 채우고 캐시에 적는다. 실패하면 던진다(호출부가 그 통만 버린다). */
async function translateBatch(
  misses: string[],
  lang: NoteTargetLang,
  model: any,
  hashOf: Map<string, string>,
  out: Record<string, string>,
): Promise<void> {
  {
    // 각 원문에 인덱스(i)를 붙여 보내고, 응답도 같은 i 로 받는다 → 번역을 "위치"가 아니라
    // "i 값"으로 원문에 묶는다(모델이 순서를 뒤섞어도 엉뚱한 메모에 붙지 않게 — 영구 캐시 오염 방지).
    const items = misses.map((t, i) => ({ i, text: t }));
    const { text: raw, usage } = await callGeminiWithCompat((p) => generateText(p as any), {
      model,
      system:
        `You translate short notes for a cancer medical-tourism case into ${LANG_NAME[lang]}. ` +
        `They are written by the coordinator, the patient, or the clinician, in any language. ` +
        `These are progress notes, symptom reports, timeline entries, and chat messages. ` +
        `Rules: translate naturally and concisely; keep medical terms accurate; ` +
        `KEEP numbers, dates, units, hospital/drug names and Latin abbreviations (HGB, CT, PET-CT…) unchanged; ` +
        `do NOT add, summarize, or explain. ` +
        `Input is a JSON array of {"i":<number>,"text":<string>}. ` +
        `Return ONLY a JSON array of {"i":<the SAME number>,"t":<translation of that item's text>}. ` +
        `Each "i" MUST equal the input item's "i" so translations stay bound to their source; do not add, drop, or renumber items.`,
      prompt: `Translate each item's "text" to ${LANG_NAME[lang]}:\n${JSON.stringify(items)}`,
      temperature: 0.1,
      // 넉넉히. 답이 잘리면 JSON 이 깨져 그 통이 통째로 날아간다(위 설명).
      maxOutputTokens: 8192,
    });

    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) throw new Error("shape_mismatch");

    // i 값으로 원문↔번역 매핑(위치 무관). 빠지거나 형식이 틀린 항목은 스킵 → 원문 폴백.
    const byIndex = new Map<number, string>();
    for (const o of arr) {
      if (o && typeof o.i === "number" && typeof o.t === "string" && o.t.trim()) {
        byIndex.set(o.i, o.t.trim());
      }
    }

    const rows: any[] = [];
    misses.forEach((src, i) => {
      const tr = byIndex.get(i);
      if (!tr) return;
      out[src] = tr;
      rows.push({
        source_hash: hashOf.get(src),
        target_lang: lang,
        source_lang: detectLanguage(src),
        translated: tr,
        model: MODEL,
      });
    });

    void logAiUsage({ surface: "note_translate", model: MODEL, usage, meta: { lang, count: misses.length } });

    // 3) 캐시 저장(중복은 무시)
    if (rows.length > 0) {
      try {
        await (supabaseAdmin as any)
          .from("note_translations")
          .upsert(rows, { onConflict: "source_hash,target_lang", ignoreDuplicates: true });
      } catch {
        /* 캐시 저장 실패는 무시(번역 결과는 이미 반환) */
      }
    }
  }
}
