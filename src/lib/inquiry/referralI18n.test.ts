/**
 * 의뢰서 6개 언어 — «조용히 영어로 떨어지는 것»과 «한국식 문장부호»를 막는다.
 *
 * 문구는 사전(src/lib/i18n/dictionary.js)의 `referral.*` 키에 있다. 코디 백오피스 편집기로
 * 고칠 수 있게 옮긴 것(2026-08-18). 그래서 검사도 «소스»가 아니라 «사전»을 본다.
 *
 * 🛑 편집기로 고친 값은 DB(content_overrides)에 들어가므로 이 검사가 못 본다.
 *    즉 이 검사는 «기본값»만 지킨다 — 편집기로 넣은 값의 품질은 사람이 봐야 한다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;

const dict = readFileSync(join(ROOT, "src/lib/i18n/dictionary.js"), "utf8");
const schema = readFileSync(join(ROOT, "src/lib/inquiry/referralSchema.js"), "utf8");
const docKinds = readFileSync(join(ROOT, "src/lib/inquiry/docKinds.js"), "utf8");
const form = readFileSync(join(ROOT, "app/inquiry/referral/ReferralForm.jsx"), "utf8");

/** 사전의 한 언어 덩어리에서 referral.* 키만 뽑는다. */
function referralKeys(lang: string): Map<string, string> {
  const m = new RegExp(String.raw`\n  ${lang}:\s*\{`).exec(dict);
  expect(m, `${lang} 사전 덩어리를 못 찾았다`).toBeTruthy();
  const body = dict.slice(m!.index + m![0].length, dict.indexOf("\n  },", m!.index));
  const out = new Map<string, string>();
  for (const e of body.matchAll(/\n\s+"(referral\.[\w.]+)":\s*"((?:[^"\\]|\\.)*)"/g)) out.set(e[1], e[2]);
  return out;
}
const BY_LANG = Object.fromEntries(LANGS.map((l) => [l, referralKeys(l)])) as Record<string, Map<string, string>>;

/** 소스가 실제로 쓰는 키 — K("referral.x") 와 tr("x") */
const USED = new Set<string>([
  ...[...schema.matchAll(/K\("(referral\.[\w.]+)"\)/g)].map((m) => m[1]),
  ...[...docKinds.matchAll(/K\("(referral\.[\w.]+)"\)/g)].map((m) => m[1]),
  ...[...form.matchAll(/tr\("(\w+)"/g)].map((m) => `referral.tr.${m[1]}`),
]);

describe("의뢰서 6개 언어", () => {
  it("소스가 쓰는 키가 6개 언어에 다 있다", () => {
    const miss: string[] = [];
    for (const key of USED)
      for (const l of LANGS) if (!BY_LANG[l].get(key)) miss.push(`${key} → ${l}`);
    expect(miss, miss.join(", ")).toEqual([]);
  });

  it("사전에만 있고 아무도 안 쓰는 referral 키가 없다", () => {
    // 🛑 키 이름을 바꾸면 옛 키가 사전에 남는다 — 남으면 편집기에서 「고쳤는데 화면이 그대로」가 된다.
    const orphan = [...BY_LANG.ko.keys()].filter((k) => !USED.has(k));
    expect(orphan, orphan.join(" | ")).toEqual([]);
  });

  it("{n} 같은 «갈아끼우는 자리»가 언어마다 그대로 있다", () => {
    const bad: string[] = [];
    for (const [key, ko] of BY_LANG.ko) {
      const want = new Set([...ko.matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
      if (!want.size) continue;
      for (const l of LANGS) {
        if (l === "ko") continue;
        const got = new Set([...(BY_LANG[l].get(key) || "").matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
        for (const w of want) if (!got.has(w)) bad.push(`${key}/${l}: {${w}} 빠짐`);
      }
    }
    expect(bad, bad.join(", ")).toEqual([]);
  });

  it("중국어·일본어 문장부호가 그 나라 것이다", () => {
    // 🛑 한국어 습관을 그대로 옮기지 마라. 실측(2026-08-18): 반각 괄호 40곳, 한국식 줄표 24곳.
    //    괄호는 전각（）, 줄표 「 — 」 대신 「。」·「（）」, 인용은 중국어 “ ” · 일본어 「 」.
    //    대괄호도 전각 【 】.
    const bad: string[] = [];
    for (const l of ["zh", "ja"])
      for (const [key, v] of BY_LANG[l]) {
        if (/[()]/.test(v)) bad.push(`${key}/${l}: 반각 괄호`);
        if (/\[|\]/.test(v)) bad.push(`${key}/${l}: 반각 대괄호`);
        if (v.includes(" — ")) bad.push(`${key}/${l}: 한국식 줄표`);
        if (/[一-鿿぀-ヿ],/.test(v)) bad.push(`${key}/${l}: 반각 쉼표`);
        if (l === "zh" && v.includes("「")) bad.push(`${key}/zh: 일본식 「」 (중국어는 “ ”)`);
        if (l === "ja" && v.includes("“")) bad.push(`${key}/ja: 중국식 “” (일본어는 「 」)`);
      }
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("가운뎃점이 언어별로 맞다 (일본어 ・ / 중국어 ·)", () => {
    const bad: string[] = [];
    for (const [key, v] of BY_LANG.ja) if (v.includes("·")) bad.push(`${key}/ja: 중국식 ·`);
    for (const [key, v] of BY_LANG.zh) if (v.includes("・")) bad.push(`${key}/zh: 일본식 ・`);
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("러시아어에서 «대학병원»을 한 가지 말로만 부른다", () => {
    // 🛑 실측(2026-08-18): 같은 대학병원을 клиника·университетская клиника·больница
    //    세 가지로 부르고 있었다 — 환자에겐 «다른 곳»으로 읽힌다.
    //    «больница» 는 «환자분이 다니는 병원»을 가리킬 때만 쓴다. 늘리려면 여기 키를 추가하고,
    //    그때 «정말 환자 쪽 병원인가»를 한 번 더 생각하라.
    const OWN_HOSPITAL_OK = [
      "referral.tr.stillNeedWhy",   // 병원에서 받으시는 대로 = 환자분이 다니는 병원
      "referral.f.cdFolder.label",  // 병원에서 받아 온 CD
      "referral.f.localDoctorOpinion.ph", // 지금 다니시는 병원에서 권고받은 치료
    ];
    const bad: string[] = [];
    for (const [key, v] of BY_LANG.ru)
      if (/больниц/i.test(v) && !OWN_HOSPITAL_OK.includes(key)) bad.push(`${key}: ${v.slice(0, 50)}`);
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("사이트에 언어가 늘면 여기도 늘려야 한다", () => {
    // 🛑 「6개」라고 숫자만 세지 마라 — 사이트에 언어가 하나 늘어도 이 검사는 통과해버린다.
    const cfg = readFileSync(join(ROOT, "src/lib/i18n/config.js"), "utf8");
    const m = cfg.match(/LOCALES\s*=\s*\[([^\]]*)\]/);
    const site = [...(m?.[1] || "").matchAll(/"(\w+)"/g)].map((x) => x[1]).sort();
    expect(site, `사이트 언어: ${site.join(",")}`).toEqual([...LANGS].sort());
  });

  it("한 언어만 안 고쳐진 문구가 없다", () => {
    // 🛑 «배수 고정»으로 재지 마라 — 한국어는 원래 압축적이라 러시아어의 2~3배가 정상이다.
    //    대신 «이 문구들의 평소 배수»(중앙값)와 비교한다. 한국어만 짧게 줄이고 저쪽은
    //    옛 문장 그대로면 그 줄만 평소에서 크게 벗어난다 — 그게 「한쪽만 고쳤다」의 흔적이다.
    const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const long = [...BY_LANG.ko].filter(([, v]) => v.length >= 20);   // 낱말은 길이 비교가 의미 없다
    const bad: string[] = [];
    for (const l of LANGS) {
      if (l === "ko") continue;
      const ratios = long.map(([k, ko]) => (BY_LANG[l].get(k) || "").length / ko.length);
      const typical = median(ratios);
      long.forEach(([k, ko], i) => {
        if (ratios[i] > typical * 2)
          bad.push(`${k}/${l}: 평소 ${typical.toFixed(1)}배인데 ${ratios[i].toFixed(1)}배 — ko:${ko.slice(0, 24)}…`);
      });
    }
    expect(bad, bad.join(" | ")).toEqual([]);
  });

  it("문구가 다시 소스로 새어 들어오지 않았다", () => {
    // 🛑 소스에 문구를 직접 적으면 편집기에서 안 보인다. L("…","…","…") 모양이 돌아오면 잡는다.
    const back = [schema, docKinds].flatMap((s) => [...s.matchAll(/\bL\(\s*"/g)]).length;
    expect(back, "referralSchema/docKinds 에 L(\"…\") 가 되살아났다").toBe(0);
  });
});
