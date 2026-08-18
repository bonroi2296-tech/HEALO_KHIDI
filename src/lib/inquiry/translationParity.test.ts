import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * 세 언어가 «같이» 고쳐졌는지 본다.
 *
 * 왜 (2026-08-18 실측): 문구를 짧게 다듬으면서 한국어만 고치고 **영어·러시아어를 빼먹었다**.
 * 화면 다섯 곳에서 러시아어만 옛 장문이 그대로 떠 있었는데, 러시아어가 우리 주 사용자 언어다.
 * 눈으로 한 줄씩 훑어서는 또 놓친다.
 *
 * 🛑 «배수 고정»으로 재지 마라 — 한국어는 원래 압축적이라 러시아어의 2~3배가 정상이다
 *    (「국적」 3자 vs "Гражданство" 11자). 고정 문턱을 쓰면 멀쩡한 낱말이 잔뜩 걸린다.
 *    대신 «이 파일들의 평소 배수»(중앙값)와 비교한다 — 한쪽만 안 고친 항목은 평소에서 크게 벗어난다.
 */
const FILES = [
  "app/inquiry/referral/ReferralForm.jsx",
  "src/lib/inquiry/referralSchema.js",
];

type Entry = { ko: string; en: string; ru: string; at: string };

function collect(src: string, file: string): Entry[] {
  const out: Entry[] = [];
  // { ko: "…", en: "…", ru: "…" } 모양과 L("…", "…", "…") 모양 둘 다 훑는다.
  const obj = /\{\s*ko:\s*"((?:[^"\\]|\\.)*)"\s*,\s*en:\s*"((?:[^"\\]|\\.)*)"\s*,\s*ru:\s*"((?:[^"\\]|\\.)*)"/g;
  const fn = /\bL\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g;
  for (const re of [obj, fn]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split("\n").length;
      out.push({ ko: m[1], en: m[2], ru: m[3], at: `${file}:${line}` });
    }
  }
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const all: Entry[] = FILES.flatMap((f) =>
  collect(fs.readFileSync(path.join(process.cwd(), f), "utf8"), f)
);

describe("세 언어가 같이 고쳐졌나", () => {
  it("훑을 문구를 실제로 찾았다 (검사가 헛돌지 않는다)", () => {
    expect(all.length).toBeGreaterThan(30);
  });

  it("빈 번역이 없다", () => {
    const empty = all.filter((e) => !e.ko || !e.en || !e.ru).map((e) => e.at);
    expect(empty, empty.join(", ")).toEqual([]);
  });

  // 문장에서만 본다. 낱말은 길이 비교가 의미 없다.
  const sentences = all.filter((e) => e.ko.length >= 20);

  for (const other of ["en", "ru"] as const) {
    it(`🛑 ${other} 만 안 고쳐진 문구가 없다`, () => {
      const ratios = sentences.map((e) => e[other].length / e.ko.length);
      const typical = median(ratios);
      const odd = sentences
        .map((e, i) => ({ e, r: ratios[i] }))
        // 평소 배수의 «2배 이상» 길면 한국어만 줄이고 저쪽은 안 줄인 것이다.
        .filter((x) => x.r > typical * 2)
        .map((x) => `${x.e.at} (평소 ${typical.toFixed(1)}배인데 ${x.r.toFixed(1)}배) ko:${x.e.ko.slice(0, 26)}…`);
      expect(odd, odd.join("\n")).toEqual([]);
    });
  }
});
