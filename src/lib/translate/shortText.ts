/**
 * healwith: 짧은 텍스트(코디 메모·타임라인·채팅) 자동번역 — 캐시 우선
 *
 * 왜: 에이전시가 화면 언어를 바꿔도 코디가 쓴 한글 메모는 그대로 한글로 보인다.
 *     이 함수는 한글 메모를 상대 언어로 옮겨준다. 문서번역(translateDoc)과 달리
 *     "짧은 자유문장" 전용 — 표·판독이 아니라 사람 문장을 자연스럽게 번역.
 *
 * 설계:
 *   - (원문해시, 대상언어)로 note_translations 에 캐시 → 같은 문구는 두 번 호출 안 함(비용↓).
 *   - 한글이 없는 텍스트는 번역하지 않고 건너뜀(이미 상대 언어이거나 숫자·ID 등).
 *   - 여러 문장을 한 번의 Gemini 호출로 묶어 번역(라운드트립·비용 최소화).
 *   - 키/모델 실패는 조용히 빈 결과 → 화면은 원문 폴백(끊기지 않게).
 */

import "server-only";

import { createHash } from "crypto";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { logAiUsage } from "@/lib/ai/usageLog";
import { containsKorean, detectLanguage } from "@/lib/translate";

const MODEL = "gemini-flash-latest";
const TARGET_LANGS = ["en", "ru", "kz", "zh", "ja"] as const;
export type NoteTargetLang = (typeof TARGET_LANGS)[number];

const LANG_NAME: Record<NoteTargetLang, string> = {
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

  // 한글 포함 + 비어있지 않은 고유 원문만
  const uniq = Array.from(
    new Set(
      (texts || [])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0 && containsKorean(t))
        .map((t) => t.trim()),
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

  try {
    const { text: raw, usage } = await generateText({
      model,
      system:
        `You translate short operational notes written by a Korean medical coordinator into ${LANG_NAME[lang]}. ` +
        `These are progress notes, timeline entries, and chat messages for a cancer medical-tourism case. ` +
        `Rules: translate naturally and concisely; keep medical terms accurate; ` +
        `KEEP numbers, dates, units, hospital/drug names and Latin abbreviations (HGB, CT, PET-CT…) unchanged; ` +
        `do NOT add, summarize, or explain. Return ONLY a JSON array of translated strings in the SAME order and length as the input array.`,
      prompt: `Translate each item to ${LANG_NAME[lang]}:\n${JSON.stringify(misses)}`,
      temperature: 0.1,
      maxOutputTokens: 2048,
    });

    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr) || arr.length !== misses.length) {
      throw new Error("shape_mismatch");
    }

    const rows: any[] = [];
    misses.forEach((src, i) => {
      const tr = typeof arr[i] === "string" ? arr[i].trim() : "";
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
  } catch (err) {
    console.error("[translateNotes] failed:", (err as Error)?.message?.slice(0, 160));
    // 실패해도 캐시분(out)은 반환
  }

  return out;
}
