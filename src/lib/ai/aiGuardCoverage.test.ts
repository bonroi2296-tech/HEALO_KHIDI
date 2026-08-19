/**
 * 「로그인 없이 열린 AI 창구」에는 하루 상한(계량기)이 붙어 있어야 한다.
 *
 * 🛑 2026-08-19 독립 리뷰가 잡은 것: 서류 판독(/api/inquiry/classify-doc)이 AI 를 부르면서
 *    분당 횟수만 재고 «하루 상한»에는 안 붙어 있었다. 분당 상한은 IP 를 바꾸면 그만이라,
 *    요금이 상한 없이 늘어날 수 있었다. 사람이 다음에 또 빠뜨리지 않게 여기서 막는다.
 *
 * 무엇을 재나: 라우트 파일이 (ㄱ) AI 모델을 부르는데 (ㄴ) 로그인 확인 도우미를 안 쓰면
 * → checkAiGuards 를 반드시 불러야 한다. 로그인 뒤 창구(어드민·직원)는 익명 남용이 불가하므로 뺀다.
 * 예외 목록을 두지 않는 이유: 목록은 낡는다. «로그인을 확인하나»는 파일만 보면 알 수 있다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const API = join(__dirname, "../../../app/api");

function routes(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) routes(p, out);
    else if (name === "route.ts" || name === "route.js") out.push(p);
  }
  return out;
}

// AI 모델을 «실제로» 부르는 표시(직접 호출 + 우리 라이브러리 경유)
const CALLS_AI = /generativelanguage[.]googleapis[.]com|generateReply|@google[/]gen|models[/]gemini/;
// 로그인 확인 도우미 — 하나라도 쓰면 「로그인 뒤 창구」로 본다
const HAS_AUTH = /require[A-Za-z]*Auth|requireConsultationAccess|verifyWebhookSignature|assertCron|CRON_SECRET|APP_SECRET/;
const HAS_GUARD = /checkAiGuards|checkConsultationAiGuard/;

describe("AI 창구 하루 상한", () => {
  it("로그인 없이 열린 AI 창구는 전부 하루 상한에 붙어 있다", () => {
    const bad: string[] = [];
    for (const f of routes(API)) {
      if (f.includes(".test.")) continue;
      const src = readFileSync(f, "utf8");
      if (!CALLS_AI.test(src)) continue;
      if (HAS_AUTH.test(src)) continue;          // 로그인·서명 뒤 창구
      if (!HAS_GUARD.test(src)) bad.push(f.slice(f.indexOf("app")).split(sep).join("/"));
    }
    expect(bad, `계량기(checkAiGuards) 없는 공개 AI 창구: ${bad.join(", ")}`).toEqual([]);
  });

  it("이 검사가 «진짜로» 잡는다 (자체시험)", () => {
    // 🛑 통과만 확인하면 «아무것도 안 보고 통과»를 못 가른다(2026-08-19 리뷰 교훈).
    const fake = `import { NextRequest } from "next/server";
      export async function POST() { await fetch("https://generativelanguage.googleapis.com/v1beta/x"); }`;
    expect(CALLS_AI.test(fake) && !HAS_AUTH.test(fake) && !HAS_GUARD.test(fake)).toBe(true);
  });

  it("라우트를 실제로 훑고 있다 (0개면 길이 틀린 것)", () => {
    expect(routes(API).length).toBeGreaterThan(50);
  });
});
