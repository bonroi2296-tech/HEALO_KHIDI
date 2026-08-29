// 공개 화면의 내부 링크에 «언어 접두어»가 붙었는지 검사한다.
//
// 왜 생겼나 (2026-08-20):
//   2026-06-17 URL 언어화 때 localeHref() 를 만들어 놓고 **어느 링크에도 연결하지 않았다**.
//   그래서 두 달 동안 헤더·푸터·카드가 href="/about" 처럼 언어 없는 맨 주소를 내보냈다.
//   사람은 healo_lang 쿠키가 있어 제 언어로 가지만, **쿠키가 없는 구글봇은 proxy.ts 가
//   감지언어(=en)로 308** 시킨다 → 카자흐 홈에서 링크를 따라가면 전부 영어 페이지.
//   결과: /kz 18쪽·/ru 14쪽이 「발견됨 - 한 번도 크롤 안 됨」으로 두 달 방치됐다.
//   당시 검증은 «/ru 가 러시아어로 렌더되나»만 봤고 «그 화면의 링크가 어디로 가나»는 안 봤다.
//
// 이 검사가 막는 것: 공개 경로를 가리키는 «문자열 리터럴» 링크.
//   href="/hospitals"  ·  router.push("/treatments")  ·  <Link href="/visa">
// 통과시키는 것: localeHref(...) 로 감싼 것, 언어가 이미 붙은 것(/kz/...), 외부·앵커·내부도구 경로.
//
// 한계(일부러 안 잡는 것): 변수로 만든 주소(`href={x}`)는 정적으로 못 본다.
//   그건 e2e 의 렌더 결과 검사로 잡아야 한다. 이 검사는 «리터럴»만 100% 덮는다.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

// 공개 경로 목록의 단일 출처 = proxy.ts. 새 공개 페이지가 늘면 이 검사가 자동으로 따라간다.
const proxySrc = readFileSync(join(ROOT, "proxy.ts"), "utf8");
const block = proxySrc.match(/const PUBLIC_PREFIXES = \[([\s\S]*?)\];/);
if (!block) {
  console.error("❌ proxy.ts 에서 PUBLIC_PREFIXES 를 못 찾았다. 목록 이름이 바뀌었으면 이 검사도 고쳐라.");
  process.exit(1);
}
const PUBLIC = [...block[1].matchAll(/"(\/[^"]*)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== "/"); // 홈("/")은 링크로 흔히 쓰여 오탐이 크다. 홈은 어차피 언어 감지로 잘 붙는다.

// 검사 대상: 공개 화면. 내부 도구(로그인 벽 안)는 SEO 무관이라 뺀다.
const SKIP_DIR = new Set([
  "node_modules", ".next", ".git", "admin", "coordinator", "hospital", "agency",
  "patient", "clinic", "api", "auth", "dev", "design-preview", "__tests__",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "src"))];
const problems = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const src = readFileSync(file, "utf8");
  // 검색에서 일부러 뺀 화면(robots index:false)은 링크가 어느 언어로 가든 SEO 영향이 없다.
  // 예: /specialties/dental·dermatology·plastic-surgery (암환자 피벗과 안 맞아 2026-06-17 PO 가 제외).
  if (/robots:\s*\{\s*index:\s*false/.test(src)) continue;
  src.split("\n").forEach((line, i) => {
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
    for (const m of line.matchAll(/(?:href=|router\.push\(|router\.replace\()"(\/[^"]*)"/g)) {
      const path = m[1];
      const hit = PUBLIC.find((p) => path === p || path.startsWith(p + "/"));
      if (!hit) continue;
      problems.push(`${rel}:${i + 1}  "${path}"  →  localeHref("${path}", lang) 로 감싸라`);
    }
  });
}

if (problems.length) {
  console.error(`❌ 언어 접두어 없는 내부 링크 ${problems.length}건\n`);
  console.error("   쿠키 없는 검색 로봇은 이 링크를 따라가면 «영어 페이지»로 튕긴다.");
  console.error("   → src/lib/i18n/config.js 의 localeHref(경로, 현재언어) 로 감쌀 것.\n");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`✅ 공개 화면의 내부 링크 ${files.length}개 파일 전부 언어 접두어 있음`);
