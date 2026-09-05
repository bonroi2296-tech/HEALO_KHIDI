#!/usr/bin/env node
/**
 * 코디네이터 교정을 «코드로 되돌린다» (content_overrides → dictionary.js / homeContent.js)
 *
 * ── 왜 이게 필요한가 (2026-08-20 실측) ─────────────────────────────────────
 * 코디네이터가 백오피스에서 고친 문구는 DB(`content_overrides`)에만 쌓이고, 코드로는
 * **한 번도 돌아온 적이 없었다.** 그래서 이런 일이 벌어지고 있었다:
 *
 *   · 사전 파일은 옛 값 그대로 — 암종 선택지의 러시아어가 「Лёгкое」(폐), 「Грудь」(가슴)처럼
 *     **암 이름이 아니라 장기 이름**인 채로 남아 있었다(코디는 이미 「Рак лёгких」로 고쳤는데도).
 *   · override 가 안 걸리는 곳(앱·PDF·메일·AI 프롬프트·검색 노출용 메타)에는 **여전히 옛 값**이 나간다.
 *   · 다음 세션이 사전을 기준으로 새 문구를 만들면 **고쳐진 적 없는 값에서 다시 출발**한다.
 *   · 그래서 코디는 같은 자리를 또 고친다 — 「하나부터 열까지 고치고 있다」의 실체 중 하나.
 *
 * 실측: 코디 교정 262건 중 **259건이 코드에 미반영**이었다(표본 10건은 10건 모두 어긋남).
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────────
 *   node scripts/i18n-backport-overrides.mjs --check    # 어긋난 건수만 (CI·sweep 용, 파일 안 건드림)
 *   node scripts/i18n-backport-overrides.mjs            # 실제로 코드에 반영
 *
 * 필요 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ⚠️ 없으면 «건너뜀(exit 0)» — 자격증명이 없는 상자(클라우드 세션 등)에서 CI 를 빨갛게 만들지 않는다.
 *      그런 상자에서는 Supabase MCP 로 같은 표를 읽어 손으로 반영할 수 있다.
 *
 * ── 원칙 ───────────────────────────────────────────────────────────────────
 * **코디(원어민) 값이 우선이다.** 다만 코디가 못 본 「사실」(글자수 제한·등록번호 등)이 코드 쪽에만
 * 있다면 그건 사람이 판단할 일이라, 이 스크립트는 **덮어쓰기 전에 그 목록을 먼저 찍어 준다**.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHECK_ONLY = process.argv.includes("--check");
const ROOT = process.cwd();

// 자동 검사 상자에서는 NEXT_PUBLIC_SUPABASE_URL 이 «비어 있다» — 실제 주소는 SUPABASE_URL 에 있다.
// 이 한 줄이 폴백 없이 있어서, 열쇠가 다 있는데도 매일 「못 잼」으로 넘어갔다(2026-08-28 실측).
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.log("[i18n-backport] Supabase 자격증명이 없어 건너뛴다 (이 상자에서는 확인 불가).");
  process.exit(0);
}

async function fetchOverrides() {
  // PostgREST 는 db-max-rows(기본 1000)에서 «에러 없이» 잘린다 — 잘린 줄 모르고
  // 「어긋남 N건」을 보고하면 나머지는 영영 역류되지 않는다. 끝까지 페이지로 읽는다.
  const PAGE = 500;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${URL_}/rest/v1/content_overrides?select=content_key,lang,value`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok && res.status !== 206) throw new Error(`content_overrides 조회 실패: ${res.status}`);
    const page = await res.json();
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}

const escapeKey = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function dictBlockRange(src, lang) {
  const starts = [...src.matchAll(/^ {2}([a-z]{2}): \{$/gm)].map((m) => ({ lang: m[1], start: m.index }));
  const i = starts.findIndex((b) => b.lang === lang);
  if (i < 0) return null;
  return [starts[i].start, i + 1 < starts.length ? starts[i + 1].start : src.length];
}

async function main() {
  const rows = await fetchOverrides();
  const dictPath = path.join(ROOT, "src/lib/i18n/dictionary.js");
  const { DICTIONARY } = await import(pathToFileURL(dictPath).href);

  let dict = fs.readFileSync(dictPath, "utf8");
  const stale = [];   // 코드 ≠ DB
  const missing = []; // 사전에 없는 키(홈 콘텐츠 등 다른 파일 소관)

  // 🔁 «비교»와 «반영»이 같은 값을 봐야 한다 (2026-08-29 실측으로 잡은 무한 반복).
  //    아래 반영부는 코디 값을 trim() 해서 넣는데(편집창에서 딸려온 앞뒤 공백 제거),
  //    비교를 원본으로 하면 «넣은 값 ≠ DB 값»이라 다음 회차에 또 「어긋남」으로 잡힌다.
  //    → 매일 훑기가 같은 건수를 영원히 알리고, 아무리 돌려도 줄지 않는다(14→12→10 에서 멈췄다).
  //    반영부와 «똑같은 규칙»으로 기대값을 만들어 비교한다.
  const 기대값 = (dbValue, codeValue) =>
    /^\s|\s$/.test(String(codeValue)) ? dbValue : String(dbValue).trim();

  for (const r of rows) {
    const cur = DICTIONARY[r.lang]?.[r.content_key];
    if (cur === undefined) { missing.push(r); continue; }
    if (cur !== 기대값(r.value, cur)) stale.push({ ...r, cur });
  }

  console.log(`[i18n-backport] DB 교정 ${rows.length}건 · 코드와 어긋남 ${stale.length}건 · 사전 밖 키 ${missing.length}건`);

  if (CHECK_ONLY) {
    for (const s of stale.slice(0, 20)) {
      console.log(`  [${s.lang}] ${s.content_key}`);
      console.log(`      코드: ${String(s.cur).slice(0, 70)}`);
      console.log(`      코디: ${String(s.value).slice(0, 70)}`);
    }
    if (stale.length > 20) console.log(`  … 외 ${stale.length - 20}건`);
    if (stale.length) {
      console.log("\n→ 반영하려면 --check 없이 다시 돌려라. 코디 값이 우선이다.");
      console.log("→ 다만 코드 쪽에만 있는 «사실»(글자수 제한·등록번호 등)이 코디 값에서 빠졌는지 눈으로 한 번 봐라.");
    }
    // 어긋남이 있으면 실패로 끝낸다 — 그래야 자동 검사가 «코디 교정이 코드로 안 돌아온 상태»를 막는다.
    process.exit(stale.length ? 1 : 0);
  }

  let applied = 0;
  const skipped = [];
  for (const s of stale) {
    const range = dictBlockRange(dict, s.lang);
    if (!range) { skipped.push({ ...s, why: "언어 블록을 못 찾음" }); continue; }
    const [from, to] = range;
    const block = dict.slice(from, to);
    // `\s*` 로 개행까지 먹는다 — prettier 가 긴 값을 다음 줄로 내린 키(27개)를 건너뛰던 원인.
    const m = block.match(
      new RegExp(`(    "${escapeKey(s.content_key)}":\\s*)("(?:[^"\\\\]|\\\\.)*")(,?)`),
    );
    if (!m) { skipped.push({ ...s, why: "사전에서 그 줄을 못 찾음" }); continue; }
    // 앞뒤 공백은 코디 의도가 아니라 편집창에서 딸려온 것 — 메타 설명·버튼에 그대로 들어가면 지저분하다.
    // 다만 「숫자+단위」처럼 «이어붙이는 조각»은 공백이 의미가 있으므로 원문(코드)이 이미 그런 모양이면 둔다.
    const codeVal = (() => { try { return JSON.parse(m[2]); } catch { return ""; } })();
    const keepEdges = /^\s|\s$/.test(codeVal);
    const value = keepEdges ? s.value : s.value.trim();
    // 함수형 replace — 코디 값에 $& · $` · $' 가 들어가면 문자열형 replace 는 사전을 통째로 망가뜨린다.
    dict =
      dict.slice(0, from) +
      block.replace(m[0], () => `${m[1]}${JSON.stringify(value)}${m[3]}`) +
      dict.slice(to);
    applied++;
  }
  fs.writeFileSync(dictPath, dict);
  console.log(`[i18n-backport] 사전 파일에 ${applied}건 반영.`);
  if (skipped.length) {
    // 조용히 건너뛰면 「반영 끝」으로 읽히고, 코디는 다음 주에 같은 문장을 또 고친다.
    console.log(`⚠️ 반영 못 한 ${skipped.length}건 — 손으로 확인해라:`);
    for (const s of skipped.slice(0, 15)) console.log(`   [${s.lang}] ${s.content_key} (${s.why})`);
    if (skipped.length > 15) console.log(`   … 외 ${skipped.length - 15}건`);
  }
  if (missing.length) {
    console.log(`⚠️ 사전에 없는 ${missing.length}건은 다른 파일(예: src/lib/content/homeContent.js) 소관 — 손으로 확인해라:`);
    for (const r of [...new Set(missing.map((r) => r.content_key))].slice(0, 15)) console.log(`   ${r}`);
  }
  console.log("→ 반영 후 반드시: npm run check:i18n-quality && npm run test:run");
}

main().catch((e) => {
  console.error("[i18n-backport] 실패:", e?.message || e);
  process.exit(1);
});
