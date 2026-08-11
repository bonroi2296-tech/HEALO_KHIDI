import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 캐시 접두사(cache prefix) 잠금 — 2026-08-11.
 *
 * 왜 이 시험이 있나:
 *   제미나이는 «요청들의 앞부분이 글자 하나까지 똑같을 때만» 그 부분을 캐시로 재사용한다.
 *   예전 구조는 시스템 프롬프트 **첫 줄**이 조건부(`currentMentionsCancer`)라 요청마다 앞부분이
 *   달라졌고, 그래서 캐시가 한 번도 안 걸렸다. 실측(최근 30일): 공개 챗 1건당 입력 4,962 토큰 :
 *   출력 141 토큰 = 입력이 97%. 매번 규칙서를 처음부터 다시 읽히고 있었다는 뜻.
 *
 *   고정부(STATIC_RULES)를 맨 앞 한 덩어리로 모아 고쳤는데, **이건 사람이 안 지키면 바로 되돌아간다** —
 *   누군가 상태에 따라 달라지는 줄 하나를 위에 끼워 넣거나 고정부에 `${}` 를 넣으면 조용히 원상복구된다.
 *   그래서 문서에 적지 않고 여기서 기계로 막는다.
 *
 * ⚠️ 이 시험이 보증하는 범위: «앞부분이 상태와 무관하게 고정이다» 까지다.
 *    «캐시가 실제로 걸렸다» 는 실서비스 숫자(ai_usage_events.meta.cached_tokens)로만 확인된다.
 *
 * buildSystemPrompt 은 "server-only" 를 import 하는 무거운 모듈이라 vitest(node)에서 직접
 * import 하면 throw → systemPromptGuards.test.ts 와 같은 방식으로 소스를 텍스트로 검사한다.
 */
const SRC = readFileSync(path.resolve(__dirname, "generateReply.ts"), "utf8");

/** STATIC_RULES = [ ... ].join("\n") 의 대괄호 안쪽만 잘라낸다. */
function staticRulesBlock(): string {
  const start = SRC.indexOf("const STATIC_RULES = [");
  expect(start).toBeGreaterThan(-1);
  const end = SRC.indexOf('].join("\\n");', start);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
}

describe("시스템 프롬프트 캐시 접두사 (regression lock)", () => {
  it("고정부(STATIC_RULES)가 존재하고, 프롬프트 배열의 맨 처음 원소다", () => {
    const block = staticRulesBlock();
    expect(block.length).toBeGreaterThan(0);

    // return [ 다음에 오는 첫 «코드» 줄이 STATIC_RULES 여야 한다(주석·빈 줄은 건너뜀).
    const retIdx = SRC.indexOf("  return [", SRC.indexOf("export function buildSystemPrompt"));
    expect(retIdx).toBeGreaterThan(-1);
    const firstCodeLine = SRC.slice(retIdx)
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("//"));
    expect(firstCodeLine).toBe("STATIC_RULES,");
  });

  it("고정부에 문자열 끼워넣기(${...})가 없다 — 하나만 있어도 캐시가 통째로 깨진다", () => {
    expect(staticRulesBlock()).not.toMatch(/\$\{/);
  });

  it("고정부에 조건부(삼항 연산자)가 없다 — 상태에 따라 달라지면 접두사가 아니다", () => {
    // 배열 원소 자리에서의 `조건 ? "" : "..."` 패턴. 문장 안의 물음표는 걸리지 않게 ? 앞뒤를 좁게 본다.
    expect(staticRulesBlock()).not.toMatch(/^\s*[\w.!]+\s*\?\s*$/m);
    expect(staticRulesBlock()).not.toMatch(/^\s*[\w.!]+\s*\?\s*"/m);
  });

  it("고정부가 캐시 최소치를 넘길 만큼 길다(제미나이 자동 캐시 약 1,024 토큰)", () => {
    // 영어 기준 대략 4자 ≈ 1토큰이라 4,000자면 1,000토큰 언저리(= 자동 캐시 최소치)의 안전선.
    // 실측(2026-08-11): 실제 고정부는 12,043자 ≒ 3,010토큰 — 최소치의 약 3배 여유.
    // 따옴표 안 실제 규칙 문자열만 합산(주석·코드 제외)해서 대충의 하한을 본다.
    const literals: string[] = staticRulesBlock().match(/"(?:[^"\\]|\\.)*"/g) ?? [];
    const chars = literals.reduce((n: number, s: string) => n + s.length - 2, 0);
    expect(chars).toBeGreaterThan(4000);
  });

  it("상태에 따라 달라지는 규칙들은 고정부 «뒤»에 있다", () => {
    const block = staticRulesBlock();
    for (const varying of [
      "TOP PRIORITY — THE USER'S CURRENT MESSAGE DOES NOT NAME A CANCER TYPE",
      "UPLOADED FILES (CRITICAL",
      "- LANGUAGE: The user's selected language is",
      "SESSION & IDENTITY FACTS",
      "REGISTER / PROCEED",
      "SOURCE LABELING (IMPORTANT):",
    ]) {
      expect(block).not.toContain(varying);
      expect(SRC).toContain(varying); // 사라진 게 아니라 «뒤로 옮겨졌을» 뿐임을 같이 확인
    }
  });
});
