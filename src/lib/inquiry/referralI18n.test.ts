/**
 * 의뢰서 6개 언어 — «조용히 영어로 떨어지는 것»을 막는다.
 *
 * 왜 검사로 박나: 덧대기 사전(referralI18n.js)의 열쇠는 «한국어 원문»이다.
 * 원문을 한 글자 고치면 짝이 끊어지는데, 화면은 안 죽고 그 문구만 영어로 나온다 —
 * 한국어·영어만 쓰는 사람은 절대 못 본다. 그래서 기계가 본다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;

const i18n = readFileSync(join(ROOT, "src/lib/inquiry/referralI18n.js"), "utf8");
const schema = readFileSync(join(ROOT, "src/lib/inquiry/referralSchema.js"), "utf8");
const docKinds = readFileSync(join(ROOT, "src/lib/inquiry/docKinds.js"), "utf8");
const form = readFileSync(join(ROOT, "app/inquiry/referral/ReferralForm.jsx"), "utf8");

/** 덧대기 사전의 한 덩어리를 꺼낸다(EXTRA / EXTRA_TR). */
function block(name: string): string {
  const i = i18n.indexOf(`export const ${name} = {`);
  expect(i, `${name} 를 못 찾았다`).toBeGreaterThan(-1);
  return i18n.slice(i, i18n.indexOf("\n};", i));
}
const EXTRA_SRC = block("EXTRA");
const EXTRA_TR_SRC = block("EXTRA_TR");

/**
 * "열쇠": { kz: …, zh: …, ja: … } 를 훑는다. 값이 빈 문자열이면 «없는 것»으로 센다.
 * ⚠️ 「{ … }」를 통째로 잡는 식(`\{[^}]*\}`)으로 쓰지 마라 — 번역문 안에 {n}·{mb} 같은
 *    갈아끼우는 자리가 있어서 첫 「}」에서 잘린다(2026-08-18 실측: 검사가 다 빠짐이라고 우겼다).
 *    열쇠가 나온 자리부터 «다음 열쇠 직전»까지를 한 덩어리로 본다.
 */
function entries(src: string, keyPat: RegExp) {
  const re = new RegExp(keyPat.source + String.raw`\s*:\s*\{`, "g");
  const starts = [...src.matchAll(re)].map((m) => ({ key: m[1], at: m.index! + m[0].length }));
  return starts.map((s, i) => {
    const body = src.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : src.length);
    const langs: Record<string, string> = {};
    for (const p of body.matchAll(/(kz|zh|ja)\s*:\s*"([^"]*)"/g)) langs[p[1]] = p[2];
    return { key: s.key, langs };
  });
}

describe("의뢰서 6개 언어", () => {
  const extra = entries(EXTRA_SRC, /"([^"]+)"/);
  const extraTr = entries(EXTRA_TR_SRC, /\n  (\w+)/);

  it("덧대기 사전에 카자흐·중국어·일본어가 다 있다", () => {
    const miss: string[] = [];
    for (const e of [...extra, ...extraTr])
      for (const l of ["kz", "zh", "ja"]) if (!e.langs[l]) miss.push(`${e.key} → ${l}`);
    expect(miss, miss.join(", ")).toEqual([]);
  });

  it("칸 정의·서류 종류의 한국어 원문이 전부 사전에 있다", () => {
    // L("…", "…", "…") 의 첫 칸 = 한국어 원문
    const kos = [...schema.matchAll(/L\(\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*\)/g),
                 ...docKinds.matchAll(/L\(\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*"[^"]*"\s*\)/g)]
      .map((m) => m[1]);
    const have = new Set(extra.map((e) => e.key));
    const miss = kos.filter((k) => !have.has(k));
    expect(miss, `사전에 없는 한국어: ${miss.join(" | ")}`).toEqual([]);
  });

  it("화면 문구의 이름이 전부 사전에 있다", () => {
    const keys = [...form.matchAll(/\n  (\w+):\s*\{\s*ko:/g)].map((m) => m[1]);
    const have = new Set(extraTr.map((e) => e.key));
    const miss = keys.filter((k) => !have.has(k));
    expect(miss, `사전에 없는 문구: ${miss.join(" | ")}`).toEqual([]);
  });

  it("사전에만 있고 쓰이지 않는 열쇠가 없다 (원문을 고치면 여기가 끊긴다)", () => {
    const kos = new Set([...schema.matchAll(/L\(\s*"([^"]*)"/g), ...docKinds.matchAll(/L\(\s*"([^"]*)"/g)].map((m) => m[1]));
    const keys = new Set([...form.matchAll(/\n  (\w+):\s*\{\s*ko:/g)].map((m) => m[1]));
    const orphan = [...extra.filter((e) => !kos.has(e.key)).map((e) => `EXTRA:${e.key}`),
                    ...extraTr.filter((e) => !keys.has(e.key)).map((e) => `EXTRA_TR:${e.key}`)];
    expect(orphan, orphan.join(" | ")).toEqual([]);
  });

  it("{n} 같은 «갈아끼우는 자리»가 언어마다 그대로 있다", () => {
    const bad: string[] = [];
    for (const m of form.matchAll(/\n  (\w+):\s*\{\s*ko:\s*"([^"]*)"/g)) {
      const want = new Set([...m[2].matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
      if (!want.size) continue;
      const e = extraTr.find((x) => x.key === m[1]);
      if (!e) continue;
      for (const l of ["kz", "zh", "ja"]) {
        const got = new Set([...(e.langs[l] || "").matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
        for (const w of want) if (!got.has(w)) bad.push(`${m[1]}/${l}: {${w}} 빠짐`);
      }
    }
    expect(bad, bad.join(", ")).toEqual([]);
  });

  it("중국어·일본어 문장부호가 그 나라 것이다", () => {
    // 🛑 한국어 습관을 그대로 옮기지 마라. 실측(2026-08-18): 반각 괄호 40곳, 한국식 줄표 24곳.
    //    괄호는 전각（）, 줄표 「 — 」 대신 「。」·「、」, 인용은 중국어 “ ” · 일본어 「 」.
    const bad: string[] = [];
    for (const e of [...extra, ...extraTr])
      for (const l of ["zh", "ja"]) {
        const v = e.langs[l] || "";
        if (/[()]/.test(v)) bad.push(`${e.key}/${l}: 반각 괄호`);
        if (v.includes(" — ")) bad.push(`${e.key}/${l}: 한국식 줄표`);
        if (/[一-鿿぀-ヿ],/.test(v)) bad.push(`${e.key}/${l}: 반각 쉼표`);
        if (l === "zh" && v.includes("「")) bad.push(`${e.key}/zh: 일본식 「」 (중국어는 “ ”)`);
        if (l === "ja" && v.includes("“")) bad.push(`${e.key}/ja: 중국식 “” (일본어는 「 」)`);
      }
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("가운뎃점이 언어별로 맞다 (일본어 ・ / 중국어 ·)", () => {
    const bad: string[] = [];
    for (const e of [...extra, ...extraTr]) {
      if ((e.langs.ja || "").includes("·")) bad.push(`${e.key}/ja: 중국식 ·`);
      if ((e.langs.zh || "").includes("・")) bad.push(`${e.key}/zh: 일본식 ・`);
    }
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("러시아어에서 «대학병원»을 한 가지 말로만 부른다", () => {
    // 🛑 실측(2026-08-18): 같은 대학병원을 клиника·университетская клиника·больница
    //    세 가지로 부르고 있었다 — 환자에겐 «다른 곳»으로 읽힌다.
    //    «больница» 는 «환자분이 다니는 병원»을 가리킬 때만 쓴다. 늘리려면 여기 이름을 추가하고,
    //    그때 «정말 환자 쪽 병원인가»를 한 번 더 생각하라.
    const OWN_HOSPITAL_OK = [
      "stillNeedWhy",                          // 병원에서 받으시는 대로 = 환자분이 다니는 병원
      "병원에서 받은 CD (CT · MRI)",            // 환자분이 병원에서 받아 온 것
      "지금 다니시는 병원에서 권고받은 치료",   // 환자분이 다니는 병원
    ];
    const bad: string[] = [];
    // 화면 문구: 이름 → 그 항목의 ru 값 (「{ }」 통째 잡기는 {n} 때문에 못 쓴다 — entries() 설명 참고)
    const RU = new RegExp(String.raw`\n  (\w+):\s*\{(?:[^{}]|\{\w+\})*?ru:\s*"([^"]*)"`, "g");
    for (const m of form.matchAll(RU))
      if (/больниц/i.test(m[2]) && !OWN_HOSPITAL_OK.includes(m[1])) bad.push(`${m[1]}: ${m[2].slice(0, 50)}`);
    // 칸 정의: L("<한국어>", "<영어>", "<러시아어>") — 열쇠는 한국어 원문
    const LRU = new RegExp(String.raw`L\(\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*"([^"]*)"`, "g");
    for (const src of [schema, docKinds])
      for (const m of src.matchAll(LRU))
        if (/больниц/i.test(m[2]) && !OWN_HOSPITAL_OK.includes(m[1])) bad.push(`${m[1]}: ${m[2].slice(0, 50)}`);
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("사이트에 언어가 늘면 여기도 늘려야 한다", () => {
    // 🛑 「6개」라고 숫자만 세지 마라 — 사이트에 언어가 하나 늘어도 이 검사는 통과해버린다.
    //    실제 목록(src/lib/i18n/config.js)과 맞춰본다.
    const cfg = readFileSync(join(ROOT, "src/lib/i18n/config.js"), "utf8");
    const m = cfg.match(/LOCALES\s*=\s*\[([^\]]*)\]/);
    const site = [...(m?.[1] || "").matchAll(/"(\w+)"/g)].map((x) => x[1]).sort();
    expect(site, `사이트 언어: ${site.join(",")}`).toEqual([...LANGS].sort());
  });
});
