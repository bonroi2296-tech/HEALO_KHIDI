#!/usr/bin/env node
/**
 * 콘텐츠 일관성 자동 검사 (CI 매 PR 실행 — 사람이 스크린샷으로 찾지 않게)
 *
 * 왜: 리브랜딩/콘텐츠 변경 때 "옛 모델 잔재"(옛 브랜드·옛 이메일·일부 언어만 적힌 목록·
 *     일부 언어에 키 누락)가 사람이 발견할 때까지 남는 사고가 반복됨. → 기계가 매번 차단.
 *
 * 검사:
 *  1) 금지 토큰: 고객/제품 코드(app·src·components)에 옛 이메일/도메인 잔재 있으면 실패.
 *  2) i18n 키 패리티: 활성 6개 언어(ko·en·ru·kz·zh·ja)가 같은 키 집합을 갖는지(영어 기준 누락 검출).
 *
 * 실행: node scripts/check-content-consistency.mjs   (npm run check:content)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "components"];
const EXCLUDE = /node_modules|\.next|\.test\.|\.spec\.|__tests__|\/archive\//;
const CODE_EXT = /\.(js|jsx|ts|tsx)$/;

// ── 1) 금지 토큰 (고객/제품 코드에 절대 없어야 함) ──────────────
const FORBIDDEN = [
  { re: /immunelab/i, msg: "옛 이메일 도메인 immunelab 잔재 (→ admin@healwith.co.kr)" },
  { re: /@healo\.com/i, msg: "옛 이메일 @healo.com 잔재 (→ admin@healwith.co.kr)" },
  { re: /healo\.com/i, msg: "옛 도메인 healo.com 잔재" },
  // ponytail: @healo.kr 이메일만 차단(.com만 막던 구멍). 현 사이트 도메인 khidi.healo.kr(@ 없음)·api 호스트 allowlist는 안 걸림.
  { re: /@healo\.kr/i, msg: "옛 이메일 @healo.kr 잔재 (→ admin@healwith.co.kr)" },
  { re: /HEALO-KHIDI/, msg: "옛 브랜드 HEALO-KHIDI 가 제품 코드에 (코드명은 주석/내부만, 고객 텍스트 금지)" },
  // 보안: 비밀키를 NEXT_PUBLIC_ 접두사로 두면 클라이언트 번들에 그대로 박혀 노출된다
  // (2026-06-20 NEXT_PUBLIC_CRON_SECRET 누출 사고). 공개돼도 되는 값만 NEXT_PUBLIC_ 사용.
  { re: /NEXT_PUBLIC_[A-Z0-9_]*SECRET/, msg: "비밀키가 NEXT_PUBLIC_ 접두사로 클라이언트에 노출됨 — 서버 전용(CRON_SECRET 등)으로 옮기고 관리자 인증 라우트로 감쌀 것" },
  // 조작된 환자 후기 시그니처 차단 (2026-06-20 홈에 가짜 후기 라이브 사고, POSTMORTEMS #11).
  // "이니셜 / 국가 / 암종" 형식(예: "A.K. / Kazakhstan / Stomach Cancer", "A.K. / 카자흐스탄 / 위암").
  // 실제 후기는 동의받은 것만, 출처표시 또는 외부 플랫폼 링크로.
  { re: /[A-Z]\.\s?[A-Z]\.\s*\/\s*[^/\n]+\/\s*(?:[Cc]ancer|암|[Рр]ак|がん|癌)/, msg: "조작된 환자 후기 의심(이니셜/국가/암종 형식) — 가짜 후기 금지. 동의받은 실후기만 출처표시하거나 외부 플랫폼 링크로" },
  // 존재하지 않는 테이블을 쿼리하면 결과가 조용히 비어 KHIDI 지표가 0이 된다(POSTMORTEMS #7·#15).
  // khidi_intakes 는 실재하지 않음 — 실제 연결고리는 consultation_sessions.inquiry_id → inquiries.
  // 실제 쿼리 사용(.from("khidi_intakes") / PostgREST 임베드 khidi_intakes!inner)만 차단(설명 주석은 통과).
  { re: /from\(\s*["']khidi_intakes["']|khidi_intakes\s*!/, msg: "존재하지 않는 테이블 khidi_intakes 쿼리 — 실제 연결고리는 inquiry_id→inquiries (POSTMORTEMS #19)" },
  // 리드 상태 converted 의 화면 라벨을 "치료 확정" 하나로 통일(2026-06-22, POSTMORTEMS #21).
  // 같은 상태를 화면마다 "진료 전환"(액션버튼)·"전환됨"(뱃지)·"치료 확정"(문서)으로 다르게 불러 PO가 혼란.
  // "진료 전환"은 "진료를 옮긴다"처럼 읽혀 의미까지 헷갈림 → 두 잔재 표기를 영구 차단.
  { re: /진료\s*전환|전환됨/, msg: "converted 리드 상태 라벨 잔재 — '치료 확정' 으로 통일(화면별 라벨 불일치 방지, POSTMORTEMS #21)" },
];

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const e of entries) {
    const rel = join(dir, e);
    if (EXCLUDE.test("/" + rel.replace(/\\/g, "/") + "/")) continue;
    let st;
    try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(rel));
    else if (CODE_EXT.test(e) && !EXCLUDE.test(rel)) out.push(rel);
  }
  return out;
}

const errors = [];

for (const file of SCAN_DIRS.flatMap(walk)) {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const f of FORBIDDEN) {
      if (f.re.test(line)) errors.push(`[금지토큰] ${file}:${i + 1} — ${f.msg}\n    ${line.trim().slice(0, 120)}`);
    }
  });
}

// ── 2) i18n 활성 6개 언어 키 패리티 ─────────────────────────────
const ACTIVE = ["ko", "en", "ru", "kz", "zh", "ja"];
const I18N = "src/lib/i18n/index.js";
try {
  const text = readFileSync(join(ROOT, I18N), "utf8").split("\n");
  // 최상위 언어 블록 시작: "  xx: {"
  const blocks = {}; // lang -> {start, keys:Set}
  let cur = null;
  text.forEach((line, idx) => {
    const m = line.match(/^ {2}([a-z]{2}): \{\s*$/);
    if (m) { cur = m[1]; blocks[cur] = new Set(); return; }
    if (/^ {2}\};?\s*$/.test(line)) { cur = null; return; } // 블록 종료(최상위 객체 닫힘 등)
    if (cur) {
      const k = line.match(/^\s{3,}"([^"]+)":/);
      if (k) blocks[cur].add(k[1]);
    }
  });
  const ref = blocks.en;
  if (!ref || ref.size === 0) {
    errors.push(`[i18n] 기준(en) 블록을 못 읽음 — 검사 스크립트 점검 필요`);
  } else {
    for (const lang of ACTIVE) {
      if (lang === "en") continue;
      const b = blocks[lang];
      if (!b) { errors.push(`[i18n] 활성 언어 '${lang}' 블록이 없음`); continue; }
      const missing = [...ref].filter((k) => !b.has(k));
      if (missing.length) {
        errors.push(`[i18n] '${lang}' 에 키 ${missing.length}개 누락 (en 기준): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
      }
    }
  }
} catch (e) {
  errors.push(`[i18n] ${I18N} 읽기 실패: ${e.message}`);
}

// ── 3) 화상 상담방 카피(_roomCopy.js) 6개 언어 키 패리티 ─────────────
// 화상방은 별도 COPY 객체(_roomCopy.js)를 쓰는데 위 i18n 검사(index.js)가 안 본다.
// 한 언어에만 키가 빠지면 그 언어 환자 화면에 undefined/빈칸이 뜬다(화상방=KHIDI 시연 핵심).
const ROOMCOPY = "app/consultation/[id]/_roomCopy.js";
try {
  const text = readFileSync(join(ROOT, ROOMCOPY), "utf8").split("\n");
  const blocks = {}; // lang -> Set(keys)
  let cur = null;
  for (const line of text) {
    const m = line.match(/^ {2}([a-z]{2}): \{\s*$/); // "  ko: {"
    if (m) { cur = m[1]; blocks[cur] = new Set(); continue; }
    if (/^ {2}\},?\s*$/.test(line)) { cur = null; continue; } // 언어 블록 종료 "  },"
    if (cur) {
      const k = line.match(/^ {4}([A-Za-z0-9_]+):/); // 4칸 들여쓰기 키(따옴표 없음)
      if (k) blocks[cur].add(k[1]);
    }
  }
  const ref = blocks.en;
  if (!ref || ref.size === 0) {
    errors.push(`[roomCopy] 기준(en) 블록을 못 읽음 — 검사 스크립트 점검 필요`);
  } else {
    for (const lang of ACTIVE) {
      if (lang === "en") continue;
      const b = blocks[lang];
      if (!b) { errors.push(`[roomCopy] 활성 언어 '${lang}' 블록이 없음`); continue; }
      const missing = [...ref].filter((k) => !b.has(k));
      const extra = [...b].filter((k) => !ref.has(k));
      if (missing.length) errors.push(`[roomCopy] '${lang}' 에 키 ${missing.length}개 누락 (en 기준): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
      if (extra.length) errors.push(`[roomCopy] '${lang}' 에 en 에 없는 키 ${extra.length}개: ${extra.slice(0, 8).join(", ")}`);
    }
  }
} catch (e) {
  errors.push(`[roomCopy] ${ROOMCOPY} 읽기 실패: ${e.message}`);
}

// ── 결과 ────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n❌ 콘텐츠 일관성 검사 실패 (${errors.length}건)\n`);
  errors.forEach((e) => console.error("  " + e + "\n"));
  console.error("→ 고친 뒤 다시 커밋하세요. (옛 브랜드/이메일 잔재·언어별 키 누락 방지)\n");
  process.exit(1);
}
console.log("✓ 콘텐츠 일관성 검사 통과 (금지토큰 0 · i18n+화상방 활성6 키 패리티 OK)");
