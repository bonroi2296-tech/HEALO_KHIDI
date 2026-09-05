/**
 * 완치 주장 검사기 — «정상 문장 코퍼스»에서 오탐 0 을 잠근다 (반성문 #182, 2026-09-05).
 *
 * 왜: 2026-08-03(#167) 한국어 오탐을 고치며 러시아어만 되살렸고, en·kz·zh·ja 는 «부정·완화 꼬리»를 전혀 안 봤다.
 *   실제 AI 답변(회귀 시험 원문)에 돌리니 "cannot completely cure cancer" 같은 **거절 문장의 대다수**가 위반으로 잡혔다
 *   (en 20/33 · ru 19/27 · kz 27/27 · zh 26/26 · ja 13/30). 예문 몇 개로는 이 부류를 못 본다 — 코퍼스로 잠근다.
 *
 * 코퍼스 두 개:
 *   ① 실제 AI 거절·안내 문장(ai_regression_runs 원문, 개인정보 없음) — src/lib/chat/__fixtures__/redline-refusals.json
 *   ② 우리 번역 문장 전부(공개 사이트 사전 6개 언어) — 우리가 검수한 안내문이므로 완치 주장이 있을 리 없다.
 * 규칙을 «넓힐» 때는 이 시험이 빨간불이 나야 정상이고, 그때 부정·완화 꼬리를 같이 넣어라(설계 원칙 ⑦).
 */
import { describe, it, expect } from "vitest";
import { scanRedlines } from "./safetyGuard";
import refusals from "./__fixtures__/redline-refusals.json";
import { DICTIONARY } from "@/lib/i18n/dictionary";

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;

function cureHits(texts: string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const r = scanRedlines(t);
    for (const h of r.hits) if (h.flag === "cure_claim") out.push(`${h.excerpt} ⟵ ${t.slice(0, 80)}`);
  }
  return out;
}

function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") { if (v.length >= 12) out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) collectStrings(x, out); return; }
  if (v && typeof v === "object") for (const k of Object.keys(v as object)) collectStrings((v as any)[k], out);
}

describe("완치 주장 검사기 — 실제 AI 거절·안내 문장에서 오탐 0", () => {
  it.each(LANGS)("%s", (lang) => {
    const texts = (refusals as Record<string, string[]>)[lang] || [];
    expect(texts.length).toBeGreaterThan(20);
    expect(cureHits(texts)).toEqual([]);
  });
});

describe("완치 주장 검사기 — 우리 번역 문장(공개 사전)에서 오탐 0", () => {
  it.each(LANGS)("%s", (lang) => {
    const texts: string[] = [];
    collectStrings((DICTIONARY as any)[lang], texts);
    expect(texts.length).toBeGreaterThan(500);
    expect(cureHits(texts)).toEqual([]);
  });
});
