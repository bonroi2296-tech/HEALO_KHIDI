import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { t } from "./index";

/**
 * 화면의 「제목·설명」이 러시아어·카자흐어로 나오는지 잠근다.
 * 대상 = localizedMeta 를 쓰는 모든 화면 — 공개 마케팅 화면 + 환자·토큰 화면(2026-08-31 확장).
 *
 * 왜 필요한가 (2026-07-30 실측): 검색에 올려둔 러시아어 주소 29개 중 8개
 * (`/ru/faq`·`visa`·`about`·`contact`·`terms`·`privacy`·`cookies`·`medical-disclaimer`)의
 * 제목·설명이 **영어로 나가고 있었다.** 화면 본문은 러시아어인데 구글 검색결과의 첫 줄만
 * 영어 = 카자흐·러시아 환자가 검색에서 우리를 보고도 「내 말이 아니네」 하고 지나친다.
 *
 * 조용히 터지는 구조라 눈으로는 안 잡혔다: `t()` 는 열쇳말이 없으면 **경고 없이 영어로
 * 폴백**한다(index.js). 그래서 「빌드 통과 · 화면 200」인데 제목만 영어인 상태가 유지됐다.
 * → 여기서 «키릴 문자가 한 자라도 있나»로 재서 CI 가 막는다.
 *
 * ⚠️ 아래 정규식은 `localizedMeta` 라는 «이름»과 «인자 정확히 3개»를 맞춘다. 그래서
 *    비공개 화면(/patient·/claim·/survey·/no-access)도 별도 헬퍼나 4번째 옵션 인자를 만들지 않고
 *    같은 3-인자 모양으로 부른다 — 모양이 달라지는 순간 그 화면들이 이 시험에서 «조용히» 빠지고,
 *    그게 정확히 이 시험이 막으려던 구조다(위 문단). 호출 모양을 바꾸려면 이 정규식도 같이 넓혀라.
 */

const APP_DIR = path.resolve(process.cwd(), "app");
const CYRILLIC = /[Ѐ-ӿ]/; // 러시아어·카자흐어 공통 문자 범위

// localizedMeta(baseMeta, "seo.x.title", "seo.x.desc") 호출에서 열쇳말 두 개를 뽑는다.
const CALL = /localizedMeta\(\s*[A-Za-z_$][\w$]*\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/^page\.(jsx|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function collectKeys() {
  const found: { file: string; key: string }[] = [];
  for (const file of walk(APP_DIR)) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(CALL)) {
      found.push({ file: path.relative(process.cwd(), file), key: m[1] });
      found.push({ file: path.relative(process.cwd(), file), key: m[2] });
    }
  }
  return found;
}

describe("공개 화면의 검색 제목·설명 언어화", () => {
  const keys = collectKeys();

  it("localizedMeta 를 쓰는 화면이 실제로 있다 (정규식이 죽으면 시험이 통째로 조용해진다)", () => {
    expect(keys.length).toBeGreaterThan(20);
  });

  it.each(["ru", "kz"])("%s: 모든 열쇳말이 키릴 문자로 번역돼 있다 (영어 폴백 = 실패)", (lang) => {
    const broken: string[] = [];
    for (const { file, key } of keys) {
      const val = t(key, lang);
      if (val === key) broken.push(`${file}  ${key} → 사전에 아예 없음(열쇳말이 그대로 나옴)`);
      else if (!CYRILLIC.test(val)) broken.push(`${file}  ${key} → 「${val.slice(0, 60)}」 (영어 폴백)`);
    }
    expect(broken, `\n${broken.join("\n")}\n`).toEqual([]);
  });
});
