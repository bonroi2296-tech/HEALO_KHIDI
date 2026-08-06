#!/usr/bin/env node
/**
 * 영향 반경(blast radius) — 「A를 고쳤는데 B가 고장난다」를 고치기 «전»에 보여준다.
 *
 * 왜 만들었나 (POSTMORTEMS 실측):
 *   175건 중 「🔁 부류 재발」이 40건+. 그중 상당수가 «내가 A를 고치다 B를 깬 것»이다.
 *     #106 톤 안 맞는 부품을 지우면서 그 안의 «유일한 응급전화 동선»까지 삭제 → 한 달간 0개
 *     #27  앱아이콘 교체가 favicon.svg 를 지웠는데 서비스워커는 계속 그걸 찾음 → 앱설치 배너 소멸
 *     #150 44px 터치영역 규칙이 아이콘 버튼을 화면 밖으로 밀어냄
 *     #140 라벨 일괄수정이 프로덕션 문의폼 12칸을 한 줄씩 밀어버림
 *   #106 기록의 문장이 이 도구의 사양이다:
 *     "grep 은 «이 부품을 누가 쓰나»에는 답하지만 «이 부품 «안»에 뭐가 살고 있었나»에는 답하지 않는다."
 *     "«이 라우트로 «들어오는» 링크가 있나»는 어느 가드도 안 봤다."
 *
 * 기존 검사 30여 개와 무엇이 다른가:
 *   기존 = «알려진 규칙» 목록(금지 토큰·번역 누락·유령 컬럼…). 목록에 없는 새 파손은 못 본다.
 *   이것 = 목록이 아니라 «관계»를 본다. 무엇이 깨질지는 몰라도 «어디까지 닿는지»는 안다.
 *
 * 무엇을 «안» 하나 (일부러):
 *   차단하지 않는다. 종료코드는 항상 0(--strict 제외). 이건 문지기가 아니라 «지도»다.
 *   차단으로 만들면 회피하게 되고(규칙 7-③), 그 순간 「고친 것처럼 보이는데 안 고쳐진 상태」가 된다.
 *
 * 사용:
 *   node scripts/blast-radius.mjs                 # 본판(main) 대비 내 변경의 영향 반경
 *   node scripts/blast-radius.mjs --base HEAD~1   # 기준 바꾸기
 *   node scripts/blast-radius.mjs --commit <sha>  # 과거 커밋 하나를 되짚어 보기(검증용)
 *   node scripts/blast-radius.mjs --files a.jsx b.jsx
 *   node scripts/blast-radius.mjs --json          # 기계용
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
// 코드가 사는 곳. 라우트(app)·공용(src)·구형 공용(components) 전부.
const SCAN_DIRS = ["app", "src", "components"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "archive", "android", "ios", "public"]);

// ─────────────────────────────────────────────────────────────
// 인자
// ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] ?? "";
};
const has = (name) => argv.includes(name);
const AS_JSON = has("--json");
const STRICT = has("--strict");
const COMMIT = flag("--commit");
const BASE = flag("--base");
const EXPLICIT_FILES = (() => {
  const i = argv.indexOf("--files");
  if (i === -1) return null;
  return argv.slice(i + 1).filter((a) => !a.startsWith("--"));
})();

// ─────────────────────────────────────────────────────────────
// 1) 변경 파일 알아내기
// ─────────────────────────────────────────────────────────────
function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function defaultBase() {
  for (const ref of ["origin/main", "main"]) {
    if (sh(`git rev-parse --verify --quiet ${ref}`).trim()) return ref;
  }
  return "HEAD~1";
}

/** 변경 파일 목록 + 각 파일의 diff 본문(삭제된 줄 분석용) */
function collectChanges() {
  if (EXPLICIT_FILES) {
    return { files: EXPLICIT_FILES, diff: "", label: "--files 로 지정한 파일" };
  }
  if (COMMIT) {
    const files = sh(`git show --name-only --pretty=format: ${COMMIT}`).split("\n").map((s) => s.trim()).filter(Boolean);
    return { files, diff: sh(`git show ${COMMIT}`), label: `커밋 ${COMMIT.slice(0, 8)}` };
  }
  const base = BASE || defaultBase();
  const mergeBase = sh(`git merge-base ${base} HEAD`).trim() || base;
  const committed = sh(`git diff --name-only ${mergeBase}...HEAD`);
  const working = sh(`git diff --name-only HEAD`) + sh(`git diff --name-only --cached`);
  // 아직 «한 번도 커밋 안 한» 새 파일도 세어야 한다 — git diff 는 이걸 안 보여줘서
  // 새 파일만 만든 작업이 「코드 변경 0개」로 뜨는 구멍이 있었다.
  const untracked = sh(`git ls-files --others --exclude-standard`);
  const files = [...new Set((committed + "\n" + working + "\n" + untracked).split("\n").map((s) => s.trim()).filter(Boolean))];
  const diff = sh(`git diff ${mergeBase}...HEAD`) + sh(`git diff HEAD`);
  return { files, diff, label: `${base} 대비 내 변경` };
}

// ─────────────────────────────────────────────────────────────
// 2) 전체 코드 스캔 → import 그래프
// ─────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (IGNORE_DIRS.has(e.name)) continue;
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (CODE_EXT.includes(path.extname(e.name))) out.push(rel);
  }
  return out;
}

const ALL_FILES = SCAN_DIRS.flatMap((d) => walk(d));
const FILE_SET = new Set(ALL_FILES);

/** "@/lib/x" · "./y" · "../z" → 저장소 상대 실제 파일 경로 */
function resolveImport(spec, fromFile) {
  if (!spec) return null;
  let candidate;
  if (spec.startsWith("@/")) candidate = path.posix.join("src", spec.slice(2));
  else if (spec.startsWith(".")) candidate = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  else return null; // 외부 패키지
  const tries = [
    candidate,
    ...CODE_EXT.map((e) => candidate + e),
    ...CODE_EXT.map((e) => path.posix.join(candidate, "index" + e)),
  ];
  for (const t of tries) if (FILE_SET.has(t)) return t;
  return null;
}

const IMPORT_RE = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'`]([^"'`]+)["'`]/g;

/** who → [내가 쓰는 파일들] */
const importsOf = new Map();
/** target → [나를 쓰는 파일들]  ← «들어오는 방향». #106 이 아무도 안 봤다고 한 그 방향. */
const importedBy = new Map();

for (const f of ALL_FILES) {
  let src = "";
  try {
    src = fs.readFileSync(path.join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  const deps = new Set();
  for (const m of src.matchAll(IMPORT_RE)) {
    const r = resolveImport(m[1], f);
    if (r && r !== f) deps.add(r);
  }
  importsOf.set(f, [...deps]);
  for (const d of deps) {
    if (!importedBy.has(d)) importedBy.set(d, []);
    importedBy.get(d).push(f);
  }
}

// ─────────────────────────────────────────────────────────────
// 3) 파일 → 화면(URL) 매핑
// ─────────────────────────────────────────────────────────────
function routeOf(file) {
  if (!file.startsWith("app/")) return null;
  const base = path.posix.basename(file);
  const isPage = /^page\.(t|j)sx?$/.test(base);
  const isRoute = /^route\.(t|j)sx?$/.test(base);
  const isLayout = /^layout\.(t|j)sx?$/.test(base);
  if (!isPage && !isRoute && !isLayout) return null;
  const segs = path.posix.dirname(file).split("/").slice(1) // "app" 제거
    .filter((s) => !(s.startsWith("(") && s.endsWith(")"))); // (그룹) 은 URL 에 안 나옴
  const url = "/" + segs.join("/");
  return { url: url === "/" ? "/" : url.replace(/\/$/, ""), kind: isRoute ? "api" : isLayout ? "layout" : "page" };
}

const ROUTE_FILES = ALL_FILES.filter((f) => routeOf(f));

// ─────────────────────────────────────────────────────────────
// 3-b) 부품 연결 «밖»의 씨앗 — 코드끼리 안 이어져도 파생은 일어난다
//
// 첫 판은 import 로 이어진 것만 봤다. 그런데 반성문 실측으로는 그 «밖»이 더 크다:
//   DB 표·칸 부류 14건 · 화면 주소(문자열) 부류 11건 · 환경변수 부류 4건.
//   #94/#95 는 표에 «지키기 규칙(CHECK)»을 하나 더 걸었더니 채팅 전송이 통째로 500 이 났는데
//   화면엔 아무 표시가 없었다 — 그 표를 쓰는 코드가 어디까지 퍼져 있는지 아무도 안 봤다.
//   #103 은 없는 칸 17개 때문에 치료 등록이 5개월간 0건이었다.
// 기존 검사(check:schema-refs·check:ghost-columns)는 «코드 → DB» 방향(이 코드가 없는 칸을
// 쓰나)을 본다. 여기서 보는 건 반대 방향 — «DB 를 바꿨는데 그게 어느 화면까지 가나».
// ─────────────────────────────────────────────────────────────

/** 표 이름 → 그 표를 쓰는 코드 파일들 */
const TABLE_USERS = new Map();
/** 환경변수 이름 → 그걸 읽는 코드 파일들 */
const ENV_USERS = new Map();

for (const f of ALL_FILES) {
  let src = "";
  try {
    src = fs.readFileSync(path.join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  for (const m of src.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]/gi)) {
    const t = m[1];
    if (!TABLE_USERS.has(t)) TABLE_USERS.set(t, []);
    TABLE_USERS.get(t).push(f);
  }
  for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    const k = m[1];
    if (!ENV_USERS.has(k)) ENV_USERS.set(k, []);
    ENV_USERS.get(k).push(f);
  }
}

/** 바뀐 이사(마이그레이션) 파일에서 «어느 표를 건드렸나»를 뽑는다 */
function tablesTouched(changedFiles, diffText) {
  const migs = changedFiles.filter((f) => /^migrations\/.*\.sql$/i.test(f) || /^supabase\/migrations\/.*\.sql$/i.test(f));
  if (!migs.length) return [];
  // diff 가 있으면 «바뀐 줄»에서만, 없으면 파일 전체에서 뽑는다.
  let text = "";
  if (diffText) {
    let cur = null;
    for (const line of diffText.split("\n")) {
      const gm = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (gm) { cur = gm[2]; continue; }
      if (!cur || !migs.includes(cur)) continue;
      if (/^[+-]/.test(line) && !/^(\+\+\+|---)/.test(line)) text += line.slice(1) + "\n";
    }
  }
  if (!text) {
    for (const m of migs) {
      try {
        text += fs.readFileSync(path.join(ROOT, m), "utf8") + "\n";
      } catch {}
    }
  }
  const names = new Set();
  const pats = [
    /\b(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:public\.)?["']?([a-z0-9_]+)/gi,
    /\bON\s+(?:public\.)?["']?([a-z0-9_]+)/gi, // 인덱스·접근권한 규칙
    /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?["']?([a-z0-9_]+)/gi,
  ];
  for (const p of pats) for (const m of text.matchAll(p)) names.add(m[1].toLowerCase());
  return [...names].filter((t) => TABLE_USERS.has(t));
}

// 어디서나 쓰는 것들 — 잡아봐야 「전부가 반경」이라 뜻이 없고 소음만 된다.
const ENV_NOISE = new Set(["NODE_ENV", "VERCEL_ENV", "VERCEL_URL", "CI", "PORT", "npm_lifecycle_event"]);

/** 바뀐 줄에서 건드린 환경변수 이름 */
function envTouched(diffText) {
  if (!diffText) return [];
  const names = new Set();
  for (const line of diffText.split("\n")) {
    if (!/^[+-]/.test(line) || /^(\+\+\+|---)/.test(line)) continue;
    for (const m of line.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (ENV_NOISE.has(m[1])) continue;
      if (ENV_USERS.has(m[1])) names.add(m[1]);
    }
  }
  return [...names];
}

/** 「이거 하나 바꾸면 사실상 전 화면」인 파일들 — 반경을 세는 게 의미 없으니 따로 말한다 */
const GLOBAL_FILES = [
  { re: /^tailwind\.config\.js$/, what: "화면 전체 스타일 규칙" },
  { re: /^(src\/)?app\/globals\.css$/, what: "화면 전체 스타일" },
  { re: /^app\/layout\.(t|j)sx?$/, what: "모든 화면을 감싸는 틀" },
  { re: /^next\.config\.js$/, what: "앱 전체 설정(보안 머리말·주소 넘기기 포함)" },
  { re: /^middleware\.(t|j)s$/, what: "모든 요청이 먼저 지나는 길목" },
  { re: /^src\/lib\/i18n\//, what: "6개 언어 사전" },
];

// ─────────────────────────────────────────────────────────────
// 4) 영향 반경 — 변경 파일에서 «들어오는 방향»으로 BFS
// ─────────────────────────────────────────────────────────────
/** seeds: [{ file, reason }] — reason 은 «왜 이게 출발점인가»(코드 변경 / DB 표 / 환경변수) */
function blastRadius(seeds) {
  const seen = new Set();
  const queue = [];
  /** 도달 경로 기록: 어떤 출발점에서 몇 다리 건너 닿았나 */
  const via = new Map();

  for (const { file: f, reason } of seeds) {
    if (!FILE_SET.has(f)) continue;
    if (seen.has(f)) continue;
    seen.add(f);
    queue.push(f);
    via.set(f, { from: f, hops: 0, reason: reason || null });
  }

  while (queue.length) {
    const cur = queue.shift();
    const curVia = via.get(cur);
    for (const parent of importedBy.get(cur) || []) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      via.set(parent, { from: curVia.from, hops: curVia.hops + 1, reason: curVia.reason });
      queue.push(parent);
    }
  }
  return { reached: seen, via };
}

// ─────────────────────────────────────────────────────────────
// 5) 「같이 사라진 것」 — 삭제된 줄에서 사용자 동선 신호를 뽑는다 (#106)
// ─────────────────────────────────────────────────────────────
const VANISH_PATTERNS = [
  // ⚠️ `tel:${copy.numbers[c]}` 처럼 «값을 끼워 넣는» 형태가 실제 코드다(#106 원문이 그랬다).
  //    숫자를 요구하는 정규식으로 짰다가 정작 그 사고를 못 잡았다 — 표시자만 보고 뒤는 짧게 곁들인다.
  { re: /tel:[^"'`\s)]{0,40}/g, what: "전화 걸기 링크", why: "#106 — 응급전화 동선이 이렇게 사라졌다" },
  { re: /mailto:[^\s"'`<>]+/g, what: "메일 보내기 링크", why: "연락 통로" },
  { re: /<Link\s[^>]*href=\{?["'`](\/[^"'`}\s]*)/g, what: "화면 이동 링크", why: "그 화면으로 «들어오는» 유일한 길일 수 있다" },
  { re: /router\.(push|replace)\(\s*["'`](\/[^"'`]*)/g, what: "코드로 화면 이동", why: "그 화면으로 «들어오는» 유일한 길일 수 있다" },
  { re: /fetch\(\s*["'`](\/api\/[^"'`?]*)/g, what: "서버 호출", why: "호출부가 사라지면 그 API 는 고아가 된다" },
  { re: /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g, what: "밖에서 쓰라고 내놓은 함수", why: "쓰던 곳이 남아 있으면 그 자리가 깨진다" },
  { re: /export\s+(?:const|let|class)\s+([A-Za-z0-9_]+)/g, what: "밖에서 쓰라고 내놓은 값", why: "쓰던 곳이 남아 있으면 그 자리가 깨진다" },
];

function vanishedSignals(diffText) {
  if (!diffText) return [];
  // diff 의 «삭제된 줄»만. 추가된 줄에도 같은 게 있으면 «옮긴 것»이므로 상계 처리한다.
  const removed = [];
  const added = [];
  let currentFile = null;
  const removedByFile = new Map();
  const deletedFiles = new Set();
  for (const line of diffText.split("\n")) {
    // ⚠️ `+++ b/…` 로만 파일을 추적하면 «통째로 삭제된 파일»을 놓친다 — 그건 `+++ /dev/null` 이라
    //    직전 파일 이름이 그대로 남아 삭제분이 엉뚱한 파일 것으로 찍힌다(첫 판이 정확히 이렇게 틀렸다).
    //    파일 삭제야말로 이 검사가 제일 잡아야 할 경우라, 헤더(`diff --git`)로 추적한다.
    const gm = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (gm) { currentFile = gm[1]; continue; }
    if (/^deleted file mode/.test(line) && currentFile) { deletedFiles.add(currentFile); continue; }
    if (line.startsWith("-") && !line.startsWith("---")) {
      removed.push(line.slice(1));
      if (currentFile) {
        if (!removedByFile.has(currentFile)) removedByFile.set(currentFile, []);
        removedByFile.get(currentFile).push(line.slice(1));
      }
    } else if (line.startsWith("+") && !line.startsWith("+++")) added.push(line.slice(1));
  }
  const addedText = added.join("\n");

  const out = [];
  for (const [file, lines] of removedByFile) {
    const text = lines.join("\n");
    for (const p of VANISH_PATTERNS) {
      const hits = new Set();
      for (const m of text.matchAll(new RegExp(p.re.source, p.re.flags))) {
        const token = (m[2] ?? m[1] ?? m[0]).trim();
        if (!token) continue;
        // 같은 것이 추가된 줄에도 있으면 «옮긴 것» — 사라진 게 아니다.
        if (addedText.includes(token)) continue;
        hits.add(token);
      }
      if (hits.size) out.push({ file, deleted: deletedFiles.has(file), what: p.what, why: p.why, tokens: [...hits].slice(0, 8), more: Math.max(0, hits.size - 8) });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 5-b) 「지웠는데 아직 부르는 곳」 — import 그래프 «밖»의 참조 (#27)
//
// #27: 앱아이콘 교체가 `public/favicon.svg` 를 지웠는데 `public/sw.js` 의 프리캐시 목록엔
//      `/favicon.svg` 가 문자열로 남았다. 그 목록은 하나만 404 나도 통째로 실패하는 구조라
//      서비스워커 설치가 죽었고 → PWA 「앱 설치」 배너가 사라졌다. 새 방문자만 증상이라 발견도 늦었다.
// 그림 파일·JSON·글꼴은 import 로 안 이어지는 경우가 많아 위의 «들어오는 방향» 그래프에 안 걸린다.
// 그래서 «지워진 파일 이름이 저장소 어딘가에 글자로 남아 있나»를 따로 본다.
// ─────────────────────────────────────────────────────────────
const REF_SCAN_DIRS = ["app", "src", "components", "public", "e2e", "scripts", "migrations"];
const REF_SCAN_EXT = new Set([...CODE_EXT, ".json", ".css", ".html", ".webmanifest", ".sql", ".yml", ".yaml"]);

function walkAny(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name) && e.name !== "public") continue;
      walkAny(path.posix.join(dir, e.name), out);
    } else if (REF_SCAN_EXT.has(path.extname(e.name))) out.push(path.posix.join(dir, e.name));
  }
  return out;
}

/** 지워진 파일들을 아직 «글자로» 부르고 있는 곳 */
function danglingRefs(deletedPaths) {
  if (!deletedPaths.length) return [];
  const corpus = REF_SCAN_DIRS.flatMap((d) => walkAny(d));
  const bodies = new Map();
  const bodyOf = (f) => {
    if (!bodies.has(f)) {
      try {
        bodies.set(f, fs.readFileSync(path.join(ROOT, f), "utf8"));
      } catch {
        bodies.set(f, "");
      }
    }
    return bodies.get(f);
  };

  // 찾을 표시자 두 종류를 한 목록으로 모은다.
  const needles = [];
  for (const del of deletedPaths) {
    const base = path.posix.basename(del);
    // ① 파일 이름 — 부르는 쪽 표기가 제각각이라(`/favicon.svg`·`@/…`·`../…`) 이름이 제일 튼튼하다.
    //    이름이 너무 흔하면(index.js·page.jsx) 오탐이 쏟아지므로 건너뛴다.
    if (!/^(index|page|route|layout|loading|error|not-found)\./.test(base)) {
      needles.push({ deleted: del, needle: base, kind: "파일" });
    }
    // ② 사라진 «화면 주소» — 화면 파일을 지우면 그 주소가 통째로 없어지는데,
    //    그리로 보내는 링크는 글자라 부품 연결 그래프에도, 빌드에도 안 걸린다.
    //    반성문에서 이 부류가 11건이다(#31 목록이 없는 상세로 링크 → 404,
    //    #107 언어 바꾸면 404, #104 폐기 주소 5개가 임시 넘김이라 검색엔진에 계속 남음).
    const r = routeOf(del);
    if (r && r.url !== "/" && r.url.length > 3 && !r.url.includes("[")) {
      needles.push({ deleted: del, needle: r.url, kind: "화면 주소", url: r.url });
    }
  }

  const out = [];
  for (const n of needles) {
    const callers = [];
    for (const f of corpus) {
      if (f === n.deleted) continue;
      if (deletedPaths.includes(f)) continue; // 같이 지워진 것끼리는 서로 불러도 상관없다
      const body = bodyOf(f);
      if (!body) continue;
      if (n.kind === "화면 주소") {
        // 주소는 «따옴표 안에서 그 주소로 끝나거나 하위 경로로 이어지는» 형태만 — `/visa` 가
        // `/visa-guide` 를 잡으면 거짓 경보가 된다.
        if (!new RegExp(`["'\`]${n.needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(["'\`/?#])`).test(body)) continue;
      } else if (!body.includes(n.needle)) continue;
      callers.push(f);
    }
    if (callers.length) {
      out.push({ deleted: n.deleted, kind: n.kind, needle: n.needle, callers: callers.slice(0, 6), more: Math.max(0, callers.length - 6) });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 6) 커버 매핑 — 그 화면을 실제로 «돌려보는» 검사가 있나
// ─────────────────────────────────────────────────────────────
function testCorpus() {
  const dirs = ["e2e", "src", "app", "scripts", "components"];
  const files = dirs.flatMap((d) => walk(d)).filter((f) => /\.(test|spec)\.[tj]sx?$/.test(f) || f.startsWith("e2e/"));
  return files.map((f) => {
    let body = "";
    try {
      body = fs.readFileSync(path.join(ROOT, f), "utf8");
    } catch {}
    return { file: f, body, smoke: /@smoke/.test(body) };
  });
}
const TESTS = testCorpus();

/** 이 URL 을 실제로 열어보는 검사 파일들 */
function coversUrl(url) {
  if (!url) return [];
  const hit = [];
  // ⚠️ 「그 글자가 들어 있나」로 보면 안 된다 — `/admin` 이 `/admin/chat` 에도 걸려서
  //    정작 `/admin` 은 안 여는 검사가 그 화면의 「검사 있음」 근거가 된다(실측 3건).
  //    그러면 «검사 없으니 눈으로 봐라»가 나와야 할 자리에 초록불이 뜬다 = 잘못된 안심.
  //    지운 주소 검사(③-b)에선 경계를 맞춰놓고 여기선 안 맞춘, 같은 저장소 안의 불일치였다.
  //    → 따옴표 안에서 그 주소로 «끝나거나» 물음표·우물정으로 이어지는 것만 센다.
  const esc = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exact = new RegExp(`["'\`]${esc}(["'\`?#])`);
  for (const t of TESTS) {
    if (url !== "/" && exact.test(t.body)) hit.push(t);
    else if (url === "/" && /goto\(\s*["'`]\/["'`]\s*\)/.test(t.body)) hit.push(t);
  }
  return hit;
}

// ─────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────
const { files: changed, diff, label } = collectChanges();
const codeChanged = changed.filter((f) => CODE_EXT.includes(path.extname(f)));

// 출발점 모으기 — 코드 변경 + 부품 연결 «밖»의 경로(DB 표·환경변수)
const seeds = codeChanged.map((f) => ({ file: f, reason: null }));

const dbTables = tablesTouched(changed, diff);
for (const t of dbTables) {
  for (const f of TABLE_USERS.get(t) || []) seeds.push({ file: f, reason: `DB 표 «${t}»` });
}

const envKeys = envTouched(diff);
for (const k of envKeys) {
  for (const f of ENV_USERS.get(k) || []) seeds.push({ file: f, reason: `환경변수 «${k}»` });
}

// ⚠️ «실재하는» 파일만 본다. 경로 생김새만 보고 판정하면 오타나 이미 지워진 파일에도
//    「사실상 전 화면」이라고 단정한다(실측: 없는 파일명을 줬더니 그대로 경보가 떴다).
//    지워진 파일은 여기가 아니라 ③번 축(아직 부르는 곳)이 다뤄야 할 몫이다.
const globalHits = changed
  .filter((f) => fs.existsSync(path.join(ROOT, f)))
  .flatMap((f) => GLOBAL_FILES.filter((g) => g.re.test(f)).map((g) => ({ file: f, what: g.what })));

// --files 로 준 것 중 «없는» 파일은 조용히 넘기지 말고 말해준다 — 오타면 반경이 통째로 헛돈다.
const missingInputs = EXPLICIT_FILES ? EXPLICIT_FILES.filter((f) => !fs.existsSync(path.join(ROOT, f))) : [];

const { reached, via } = blastRadius(seeds);

const impactedRoutes = [];
for (const f of reached) {
  const r = routeOf(f);
  if (!r) continue;
  const directlyChanged = codeChanged.includes(f);
  const covering = coversUrl(r.url);
  impactedRoutes.push({
    file: f,
    url: r.url,
    kind: r.kind,
    hops: via.get(f)?.hops ?? 0,
    from: via.get(f)?.from ?? f,
    reason: via.get(f)?.reason ?? null,
    directlyChanged,
    covered: covering.length > 0,
    coveredBySmoke: covering.some((c) => c.smoke),
    // ⚠️ 여기서 자르지 마라. 이 목록은 화면에 «보여주는» 용도만이 아니라
    //    blast-verify 가 «실제로 돌릴 검사»를 고르는 원본이다. 처음엔 4개로 잘라놨는데,
    //    화면 47개 중 13개가 잘려 있었다 — 5번째부터의 검사는 영원히 안 돌면서
    //    화면엔 「검사 있음」 초록불만 떴다. 정확히 내가 문서에 「제일 해롭다」고 적은
    //    «조용한 상한»을 내가 심은 것이다. 자르는 건 출력할 때만 한다.
    coveredBy: covering.map((c) => c.file),
  });
}
impactedRoutes.sort((a, b) => a.hops - b.hops || a.url.localeCompare(b.url));

// 같은 주소가 두 번 나오지 않게 (한 화면은 page 와 layout 이 각각 파일이라 둘 다 잡힌다).
// 사람이 볼 것은 «주소»지 파일이 아니므로 page/api 를 남기고 틀(layout)은 접는다.
{
  const best = new Map();
  for (const r of impactedRoutes) {
    const prev = best.get(r.url);
    const better = !prev || (prev.kind === "layout" && r.kind !== "layout") || (r.directlyChanged && !prev.directlyChanged);
    if (better) best.set(r.url, r);
  }
  impactedRoutes.length = 0;
  impactedRoutes.push(...[...best.values()].sort((a, b) => a.hops - b.hops || a.url.localeCompare(b.url)));
}

const vanished = vanishedSignals(diff);

// 통째로 지워진 파일 — 아직 부르는 곳이 있나 (#27)
const deletedPaths = (() => {
  const out = [];
  let cur = null;
  for (const line of (diff || "").split("\n")) {
    const gm = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (gm) { cur = gm[1]; continue; }
    if (/^deleted file mode/.test(line) && cur) out.push(cur);
  }
  return out;
})();
const dangling = danglingRefs(deletedPaths);

// 변경 파일 중 「많이 쓰이는 것」 — 여기를 건드리면 반경이 넓다
const hotspots = codeChanged
  .filter((f) => FILE_SET.has(f))
  .map((f) => ({ file: f, users: (importedBy.get(f) || []).length }))
  .filter((h) => h.users > 0)
  .sort((a, b) => b.users - a.users);

const uncovered = impactedRoutes.filter((r) => !r.covered && r.kind !== "layout");

if (AS_JSON) {
  console.log(
    JSON.stringify(
      { label, changed: codeChanged, impactedRoutes, vanished, dangling, hotspots, uncovered, dbTables, envKeys, globalHits },
      null,
      2
    )
  );
  process.exit(0);
}

// ── 사람이 읽는 출력 ─────────────────────────────────────────
const B = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YEL = (s) => `\x1b[33m${s}\x1b[0m`;
const GRN = (s) => `\x1b[32m${s}\x1b[0m`;

console.log("");
console.log(B(`🎯 영향 반경 — ${label}`));
console.log(DIM(`   코드 변경 ${codeChanged.length}개 파일 · 훑은 코드 ${ALL_FILES.length}개 · 화면/서버창구 ${ROUTE_FILES.length}개`));
if (missingInputs.length) {
  console.log(RED(`   ⚠️ 지정한 파일 중 ${missingInputs.length}개가 «없다» — 오타면 아래 반경이 통째로 헛돈다:`));
  missingInputs.forEach((f) => console.log(RED(`      ${f}`)));
}

if (!codeChanged.length && !dbTables.length && !envKeys.length && !globalHits.length && !dangling.length) {
  console.log(DIM("\n   코드·DB·설정 변경이 없다. 볼 것 없음."));
  process.exit(0);
}

// 부품 연결 «밖»의 출발점 — 코드끼리 안 이어져도 파생은 일어난다.
if (dbTables.length || envKeys.length || globalHits.length) {
  console.log("");
  console.log(B("⓪ 부품 연결 «밖»으로도 퍼진다"));
  for (const t of dbTables) {
    const n = (TABLE_USERS.get(t) || []).length;
    console.log(`   ${YEL(`DB 표 «${t}»`)} 를 바꿨다 → 이 표를 쓰는 코드 ${n}곳이 전부 반경 안이다`);
  }
  if (dbTables.length) {
    console.log(DIM("     └ #94·#95 — 표에 «지키기 규칙»을 하나 걸었더니 채팅 전송이 통째로 500. 화면엔 무증상이었다"));
  }
  for (const k of envKeys) {
    const n = (ENV_USERS.get(k) || []).length;
    console.log(`   ${YEL(`환경변수 «${k}»`)} 를 건드렸다 → 이걸 읽는 코드 ${n}곳`);
  }
  for (const g of globalHits) {
    console.log(`   ${RED(`${g.file}`)} — ${g.what}. ${RED("사실상 전 화면")}이라 반경을 세는 게 의미 없다`);
  }
}

if (hotspots.length) {
  console.log("");
  console.log(B("① 내가 건드린 것을 «쓰고 있는» 곳 (들어오는 방향)"));
  for (const h of hotspots.slice(0, 12)) {
    const mark = h.users >= 10 ? RED(`${h.users}곳`) : h.users >= 4 ? YEL(`${h.users}곳`) : `${h.users}곳`;
    console.log(`   ${h.file}  ← ${mark}이 쓴다`);
  }
  if (hotspots.length > 12) console.log(DIM(`   … 외 ${hotspots.length - 12}개`));
}

console.log("");
console.log(B(`② 여기까지 닿는다 — 화면·서버창구 ${impactedRoutes.length}개`));
if (!impactedRoutes.length) {
  console.log(DIM("   화면에 닿는 경로 없음 (도구·문서·설정만 건드림)"));
} else {
  const direct = impactedRoutes.filter((r) => r.hops === 0);
  const derived = impactedRoutes.filter((r) => r.hops > 0);
  const line = (r) => {
    const cov = r.covered ? (r.coveredBySmoke ? GRN("검사 있음(빠른)") : GRN("검사 있음")) : RED("검사 없음");
    const kind = r.kind === "api" ? DIM("[서버창구]") : r.kind === "layout" ? DIM("[틀]") : "";
    return `   ${r.url.padEnd(42)} ${kind} ${cov}`;
  };
  if (direct.length) {
    console.log(DIM("   ─ 직접 고친 것"));
    direct.forEach((r) => console.log(line(r)));
  }
  if (derived.length) {
    console.log(DIM(`   ─ ⚠️ 파생 — 내가 안 열어본 곳 (${derived.length}개). «A 고쳤는데 B 고장»은 여기서 난다`));
    derived.slice(0, 40).forEach((r) => console.log(line(r) + DIM(`  ← ${r.reason ? r.reason + " 경유 " : ""}${r.from} 에서 ${r.hops}다리`)));
    if (derived.length > 40) console.log(DIM(`   … 외 ${derived.length - 40}개`));
  }
}

if (vanished.length) {
  console.log("");
  console.log(B("③ ⚠️ 같이 사라진 것 — 지운 줄에 «기능»이 섞여 있었다"));
  console.log(DIM("   (옮겨간 것은 뺐다. 남은 건 정말 없어진 것)"));
  for (const v of vanished) {
    console.log(`   ${YEL(v.what)} in ${v.file}${v.deleted ? RED("  [파일 통째로 삭제됨]") : ""}`);
    console.log(`     ${v.tokens.join(", ")}${v.more ? ` … 외 ${v.more}개` : ""}`);
    console.log(DIM(`     └ ${v.why}`));
  }
}

if (dangling.length) {
  console.log("");
  console.log(B("③-b ⚠️ 지웠는데 «아직 부르는 곳»이 있다"));
  console.log(DIM("   (부품 연결이 아니라 «글자로» 부르는 것 — 빌드도 타입검사도 이건 안 본다)"));
  for (const d of dangling) {
    const label = d.kind === "화면 주소" ? `${RED(d.needle)} (사라진 화면 주소)` : RED(d.needle);
    console.log(`   ${label} 를 아직 부른다:`);
    d.callers.forEach((c) => console.log(`     ${c}`));
    if (d.more) console.log(DIM(`     … 외 ${d.more}곳`));
  }
  console.log(DIM("   └ #27 favicon.svg 를 지웠는데 sw.js 가 계속 불러 앱 설치 배너 소멸"));
  console.log(DIM("   └ #31 목록이 없는 상세로 링크 → 404 (화면 주소 부류 11건)"));
}

console.log("");
console.log(B("④ 그래서 뭘 해야 하나"));
if (uncovered.length) {
  console.log(`   ${RED(`검사 없는 화면 ${uncovered.length}개`)} — 여기는 «내가 눈으로 봐야» 한다:`);
  uncovered.slice(0, 15).forEach((r) => console.log(`     ${r.url}${r.hops > 0 ? DIM("  (파생 — 안 열어본 곳)") : ""}`));
  if (uncovered.length > 15) console.log(DIM(`     … 외 ${uncovered.length - 15}개`));
} else if (impactedRoutes.length) {
  console.log(`   ${GRN("영향받는 화면 전부 검사가 있다.")} 그 검사들을 돌려라.`);
} else {
  console.log(DIM("   화면 영향 없음."));
}
if (vanished.length) {
  console.log(`   ${YEL("위 ③ 항목마다")} «이 삭제로 사용자가 못 하게 되는 일»을 한 줄 적어라.`);
  console.log(DIM("     적을 게 없으면 진짜 무해. 적히면 그건 «옮겨야 할 기능»이다 (#106)."));
}
if (dangling.length) {
  console.log(`   ${RED("③-b 는 고르는 게 아니라 «고쳐야» 한다")} — 부르는 쪽을 같이 지우거나 딴 데로 돌려라.`);
}
console.log("");

process.exit(STRICT && (uncovered.length || vanished.length || dangling.length) ? 1 : 0);
