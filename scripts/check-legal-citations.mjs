#!/usr/bin/env node
/**
 * healwith: 법 조문 인용 검사 — 「환자에게 보이는 문구에 박힌 법 조문이 실제 그 조문인가」
 *
 * 왜 만들었나 (2026-08-04):
 *   의료해외진출법 §15 는 "의료광고에 관한 특례"인데, 코드·환자 노출 문구 24곳이 이걸
 *   「진료비 사전 고지 근거」로 인용하고 있었다(진짜 근거는 제8조제2항제2호).
 *   더 나쁜 건 이 오류를 **과거 세션이 이미 발견**해 약관에서만 고치고(PR #53) 끝냈다는 것 —
 *   재발방지가 없으니 코드·PDF 견적서·FAQ 6개 언어에 그대로 남아 4개월을 굴렀다.
 *   사람 기억이 아니라 기계가 막는다.
 *
 * 무엇을 잡나 (정직하게 = 이게 전부다):
 *   ① 대장(citations.json)에 없는 조문 번호를 인용한 곳 → 등록을 강제(등록하려면 원문을 봐야 한다)
 *   ② 「진료비·견적」 문맥에서 의료해외진출법 §15 를 인용한 곳 → 과거 그 오류 자체를 재발 차단
 * 못 잡는 것:
 *   대장에 등록된 조문끼리 서로 뒤바뀐 인용(예: §8 자리에 §9). 조문 «내용»과 문장 «취지»의
 *   일치는 기계가 못 잰다 — 그건 사람이 원문을 보고 판단해야 한다.
 *   개인정보보호법(PIPA)·통신비밀보호법 등 다른 법은 검사 범위 밖.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const LEDGER = JSON.parse(readFileSync(join(ROOT, "src/lib/legal/citations.json"), "utf8"));
const SCAN_DIRS = ["src", "app"];
const EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".md", ".json"]);
const SKIP = /node_modules|\.next|dist|build|citations\.json|check-legal-citations\.mjs/;

/** 조문 번호 추출 — 6개 언어 표기 */
const ARTICLE_PATTERNS = [
  /§\s*(\d+)/g,
  /제\s*(\d+)\s*조/g,
  /Article\s+(\d+)/gi,
  /Art\.\s*(\d+)/gi,
  /第\s*(\d+)\s*条/g,
  /第\s*(\d+)\s*條/g,
  /стать[еи]\s+(\d+)/gi,
  /(\d+)\s*-\s*бап/g,
];

/** 진료비·견적 문맥 (6개 언어) — ② 규칙용 */
const COST_CONTEXT =
  /진료비|견적|예상\s*비용|quotation|estimate|treatment\s*cost|费用|报价|预估|見積|診療費|смет|стоимост|смета|баға|смет/i;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (SKIP.test(p)) continue;
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const LAWS = Object.entries(LEDGER).filter(([k]) => !k.startsWith("_"));

/**
 * 한 줄에 법이 여러 개 섞여 있을 때 조문 번호를 엉뚱한 법에 붙이지 않도록,
 * 조문 번호 «바로 앞»에 나온 법 이름에만 귀속시킨다.
 * (예: "개인정보보호법 §28-8 ... 의료법, 의료해외진출법" → §28-8 은 개인정보보호법 몫)
 * 시행규칙·시행령의 조문은 법 본문 조문이 아니므로 제외한다.
 */
const OTHER_LAW_TOKENS = [
  "개인정보보호법", "개인정보 보호법", "PIPA", "통신비밀보호법", "Protection of Communications",
  "시행규칙", "시행령", "GDPR", "ЗРК", "국세청", "약관", "Terms",
  "《通信秘密保护法》", "通信秘密保護法", "Закон о защите тайны связи", "Байланыс құпиясын қорғау",
];

/** 이 줄에서 (법키 → 인용된 조문번호 목록) 을 귀속 판정해 돌려준다. */
function attributeArticles(line) {
  const marks = [];
  for (const [lawKey, law] of LAWS) {
    for (const alias of law._별칭 || []) {
      let idx = line.indexOf(alias);
      while (idx !== -1) {
        marks.push({ pos: idx, owner: lawKey });
        idx = line.indexOf(alias, idx + 1);
      }
    }
  }
  for (const tok of OTHER_LAW_TOKENS) {
    let idx = line.indexOf(tok);
    while (idx !== -1) {
      marks.push({ pos: idx, owner: null }); // 우리 검사 범위 밖
      idx = line.indexOf(tok, idx + 1);
    }
  }
  if (!marks.some((m) => m.owner)) return {};
  marks.sort((a, b) => a.pos - b.pos);

  const out = {};
  for (const re of ARTICLE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const at = m.index;
      let owner = null;
      for (const mark of marks) {
        if (mark.pos < at) owner = mark.owner;
        else break;
      }
      if (!owner) continue; // 앞에 우리 법 이름이 없다 → 남의 법 조문
      (out[owner] ||= new Set()).add(m[1]);
    }
  }
  return out;
}
const violations = [];

for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  const rel = file.slice(ROOT.length + 1);
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, i) => {
    // 「§15 는 근거가 아니다」처럼 오류를 «설명하는» 줄은 통과시킨다.
    if (/근거가 아니다|아니다 —|아님\)|제15조가 아니다|잘못 인용/.test(line)) return;

    const attributed = attributeArticles(line);
    for (const [lawKey, nos] of Object.entries(attributed)) {
      const law = LEDGER[lawKey];
      for (const no of nos) {
        const known = law.조문?.[no];
        if (!known) {
          violations.push({
            rel, line: i + 1, rule: "미등록 조문",
            msg: `${lawKey} 제${no}조 — 대장(src/lib/legal/citations.json)에 없다. 법령 원문을 열어 조문 제목을 확인하고 등록하라.`,
            src: line.trim().slice(0, 140),
          });
          continue;
        }
        if (lawKey === "의료해외진출법" && no === "15" && COST_CONTEXT.test(line)) {
          violations.push({
            rel, line: i + 1, rule: "§15 오인용(진료비)",
            msg: '의료해외진출법 제15조는 "의료광고에 관한 특례"다. 진료비·견적 고지 근거는 제8조제2항제2호.',
            src: line.trim().slice(0, 140),
          });
        }
      }
    }
  });
}

if (violations.length === 0) {
  console.log("✅ 법 조문 인용 검사 통과 — 대장에 등록된 조문만 인용하고 있다.");
  process.exit(0);
}

console.error(`\n❌ 법 조문 인용 위반 ${violations.length}건\n`);
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.rel}:${v.line}`);
  console.error(`     ${v.msg}`);
  console.error(`     > ${v.src}\n`);
}
console.error("대장: src/lib/legal/citations.json — 새 조문은 법령 원문(law.go.kr) 확인 후 확인일과 함께 등록하라.\n");
process.exit(1);
