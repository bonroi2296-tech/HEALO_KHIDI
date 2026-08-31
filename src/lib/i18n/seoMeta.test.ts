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

// ⚠️ layout 도 같이 걷는다 (2026-08-31 확장). 클라이언트 컴포넌트(page 첫 줄 "use client")는
//    metadata 를 내보낼 수 없어서 서버 layout 이 대신 부르는 화면이 있다(app/consultation).
//    page 만 걷던 시절엔 그런 화면이 아래 «ru/kz 키릴 검사»에서 «조용히» 빠졌다 —
//    이 시험이 막으려던 바로 그 구조다. 새 파일 이름을 늘리려면 여기부터 늘려라.
const META_FILE = /^(page|layout)\.(jsx|tsx)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (META_FILE.test(entry.name)) out.push(p);
  }
  return out;
}

// app/ 을 한 번만 걷는다 — 아래 두 시험이 같은 목록을 본다(예전엔 각자 걸어서
// 「한쪽만 새 파일을 본다」가 가능했다).
const META_FILES = walk(APP_DIR);

function collectKeys() {
  const found: { file: string; key: string }[] = [];
  for (const file of META_FILES) {
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

  /**
   * 위 정규식은 `localizedMeta(식별자, "키", "키")` 모양만 문다. 그래서 base 를 «인라인 객체»로
   * 넘기면 — localizedMeta({ robots: … }, "키", "키") — 그 화면이 아래 키릴 검사에서 통째로,
   * 그리고 «조용히» 빠진다. 2026-08-31 비공개 화면 7개를 언어화하며 실제로 밟은 함정이라
   * 여기서 기계로 막는다. 고치는 법: base 를 `const baseMeta = {…}` 로 빼서 이름으로 넘길 것.
   */
  it("localizedMeta 를 부르는 화면은 하나도 빠짐없이 위 정규식에 잡힌다 (인라인 base 금지)", () => {
    const missed: string[] = [];
    for (const file of META_FILES) {
      const src = fs.readFileSync(file, "utf8");
      // ⚠️ «파일 단위»가 아니라 «호출 단위»로 센다 (2026-08-31 정정).
      //    예전엔 파일에 걸리는 호출이 하나라도 있으면 통째로 통과시켰다 → 같은 파일의 «두 번째»
      //    호출이 인라인 base 여도 조용히 빠졌다. 「하나도 빠짐없이」라는 이름과 실제 동작이 달랐다.
      //    주석 안의 `localizedMeta(` 는 진짜 호출이 아니므로 주석을 먼저 걷어내고 센다.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
      const calls = (code.match(/\blocalizedMeta\(/g) || []).length;
      const matched = [...code.matchAll(CALL)].length;
      if (calls > matched) {
        missed.push(`${path.relative(process.cwd(), file)}  (호출 ${calls}개 중 ${matched}개만 잡힘)`);
      }
    }
    expect(
      missed,
      `\nlocalizedMeta 를 부르지만 검사에서 빠지는 화면:\n${missed.join("\n")}\n` +
        `→ base 를 인라인 객체가 아니라 이름 붙인 상수(const baseMeta = {…})로 넘겨라.\n`
    ).toEqual([]);
  });

  /**
   * ⚠️ 위 시험들의 «구멍»을 막는다 (2026-08-31 독립 감사 지적).
   *
   * 위 시험은 전부 **「이미 localizedMeta 를 부르는 화면」만** 본다. 그래서 어떤 화면이
   * `export const metadata = { title: "Sign in" }` 로 **되돌아가면 그냥 목록에서 빠지고 전부 초록**이다.
   * 즉 이 판의 본체(정적 제목 → 언어화)에 대한 잠금이 하나도 없었다 — 되돌리기가 공짜였다.
   *
   * 그래서 «반드시 언어화돼 있어야 하는 화면»을 이름으로 박는다. 화면을 지우거나 주소를 옮길 땐
   * 이 목록도 같이 고쳐라(그게 의도적 변경이라는 증거가 된다).
   * 새 환자·토큰 화면을 만들면 여기에 «추가»하라 — 안 그러면 다음 사람이 또 조용히 빠뜨린다.
   */
  const MUST_LOCALIZE = [
    // 코디가 계정 없는 환자에게 보내는 토큰 링크 4종 (proxy.ts 의 GUEST_LINK_PREFIXES 와 한 벌)
    "app/claim/[token]/page.jsx",
    "app/survey/[token]/page.jsx",
    "app/opinion/[token]/page.jsx",
    "app/consultation/layout.jsx",
    "app/inquiry/intake/layout.jsx",
    // 로그인 벽 — /patient/* 로 가는 모든 링크가 여기로 튕긴다
    "app/login/page.jsx",
    "app/signup/page.jsx",
    "app/find-id/page.jsx",
    "app/forgot-password/page.jsx",
    "app/reset-password/page.jsx",
    "app/auth/confirm/page.jsx",
    "app/account/password/page.jsx",
    // 로그인한 환자 화면
    "app/patient/page.jsx",
    "app/patient/consultations/page.jsx",
    "app/patient/symptoms/page.jsx",
    "app/patient/documents/page.jsx",
    "app/patient/account/page.jsx",
    "app/patient/chat/page.jsx",
    "app/patient/cost-estimates/page.jsx",
    "app/patient/cost-estimates/[id]/page.jsx",
    "app/patient/rebooking/page.jsx",
    "app/patient/visa/page.jsx",
    "app/patient/visa/applications/page.jsx",
    "app/patient/visa/applications/[id]/page.jsx",
    "app/patient/messages/page.jsx",
    "app/patient/calendar/page.jsx",
    // 그 밖에 사람이 보는 비공개·공개 화면
    "app/no-access/page.jsx",
    "app/education/page.jsx",
    "app/app/page.jsx",
  ];

  it("정적 제목으로 되돌아간 화면이 없다 (이 판의 본체를 잠그는 시험)", () => {
    const broken: string[] = [];
    for (const rel of MUST_LOCALIZE) {
      const abs = path.resolve(process.cwd(), rel);
      if (!fs.existsSync(abs)) {
        broken.push(`${rel} → 파일이 없다(주소를 옮겼으면 이 목록도 고쳐라)`);
        continue;
      }
      const src = fs.readFileSync(abs, "utf8");
      if (![...src.matchAll(CALL)].length) {
        broken.push(`${rel} → localizedMeta(식별자,"키","키") 호출이 없다`);
      }
      if (/export\s+const\s+metadata\s*=/.test(src)) {
        broken.push(`${rel} → 정적 export const metadata 가 되살아났다(언어 폴백을 안 탄다)`);
      }
    }
    expect(
      broken,
      `\n언어화가 풀린 화면:\n${broken.join("\n")}\n` +
        `→ 정적 문자열은 언어 폴백을 «전혀» 안 탄다. generateMetadata + localizedMeta 로 되돌려라.\n`
    ).toEqual([]);
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
