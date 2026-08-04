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
 *   통신비밀보호법 등 대장에 없는 법령은 검사 범위 밖.
 *   **법 이름이 조문 «뒤»에 오는데 그 사이에 다른 문서 이름이 끼어든 문장**
 *   (예: "Article 999 Integrated Notice of the Act …" — of 없이 두 이름이 붙은 형태)은
 *   사람이 읽어도 어느 쪽 조문인지 모호하고, 기계는 앞쪽(통합고시)에 붙인다 → 검사에서 빠진다.
 *   2026-08-04 독립 리뷰가 이 형태를 지적했는데, «자연스러운» 두 형태
 *   ("Article N of the Act …" / "Article N of the Integrated Notice …")는 각각 올바르게
 *   갈리는 것을 자기시험으로 확인했으므로 **이 모호한 형태는 잡지 않기로 하고 여기 적어 둔다**
 *   (코드를 비틀어 맞추면 자연스러운 문장 쪽에서 오탐이 난다).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const LEDGER = JSON.parse(readFileSync(join(ROOT, "src/lib/legal/citations.json"), "utf8"));
const SCAN_DIRS = ["src", "app"];
const EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".md", ".json"]);
const SKIP = /node_modules|\.next|dist|build|citations\.json|check-legal-citations\.mjs/;

/** 조문 번호 추출 — 6개 언어 표기
 *
 * ⚠️ 두 곳에 함정이 있었다(2026-08-04 독립 리뷰가 잡음 — 만든 날 바로 새 언어가 안 걸렸다):
 *  ① **「제2항」을 괄호로 쓰는 표기**: "Article 8(2) of the Act…" / "статье 8(2) Закона…".
 *     조문 번호만 먹고 끊으면 남는 글자가 "(2) of the …" 라 **닫는 괄호가 먼저** 나온다.
 *     아래 귀속 판정은 조문과 법 이름 사이에 쉼표·괄호가 있으면 「다른 항목」으로 보고 버리므로,
 *     법 이름이 뒤에 오는 영어·러시아어 문장이 **통째로 검사 대상에서 빠졌다.**
 *     → 항 번호 `(N)` 까지 같이 먹어서 사이에 괄호가 남지 않게 한다.
 *  ② **카자흐어 격변화**: 사전 문장은 "8-бап"(원형)이 아니라 "8-бабының"(속격)으로 쓴다.
 *     원형만 찾으면 카자흐어는 영원히 0건이다 → 어간 `ба(п|б)…` 뒤 어미를 허용한다.
 *  둘 다 자기시험에 박아 뒀다(아래 SELFTESTS).
 */
const ARTICLE_PATTERNS = [
  /§\s*(\d+)/g,
  /제\s*(\d+)\s*조/g,
  /Article\s+(\d+)(?:\s*\(\s*\d+\s*\))?/gi,
  /Art\.\s*(\d+)(?:\s*\(\s*\d+\s*\))?/gi,
  /第\s*(\d+)\s*条/g,
  /第\s*(\d+)\s*條/g,
  /стать[еи]\s+(\d+)(?:\s*\(\s*\d+\s*\))?/gi,
  /(\d+)\s*-\s*ба[пб]\S*/g,
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
  "통신비밀보호법", "Protection of Communications",
  "시행규칙", "시행령", "GDPR", "ЗРК", "국세청", "약관", "Terms",
  // 「통합고시」는 보건복지부 «고시»지 법률이 아니다 — 조문 번호 체계가 따로 돈다.
  //   2026-08-04 실제 오탐: "통합고시 제3조(… 20% …). 초과는 의료해외진출법 제9조제1항 위반"
  //   → 통합고시에 표식이 없으니 제3조가 뒤에 있는 「의료해외진출법」에 붙어
  //     «의료해외진출법 제3조 미등록»이라는 헛경보가 났다. 표식을 줘서 여기 묶어 둔다.
  //   ⚠️ 같은 줄의 «진짜» 의료해외진출법 조문(제9조·제24조)은 바로 앞에 법 이름이 있어
  //      영향을 받지 않는다(아래 자기시험이 그걸 지킨다).
  //   ⚠️ 6개 언어를 «한 줄»에 담는 사전 파일 특성상, 다른 언어 표기도 전부 넣어야 한다 —
  //      하나라도 빠지면 그 언어의 "제3조"가 앞 언어에 적힌 법 이름에 붙어 헛경보가 난다
  //      (2026-08-04 실제로 중국어 「统合告示第3条」가 한국어 「의료해외진출법」에 붙었다).
  "통합고시", "Integrated Notice", "统合告示", "統合告示",
  "Сводного уведомления", "Сводном уведомлении", "Біріктірілген хабарлама",
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
      const end = at + m[0].length;
      // 법 이름은 조문 앞에도(한국어 "의료법 §56") 뒤에도(러시아어 "статье 9 GDPR") 온다.
      // 앞만 보면 러시아어 문장이 앞 문장의 다른 법에 잘못 붙고, 뒤만 보면
      // "개인정보보호법(§28-8 포함), 의료법" 이 의료법에 잘못 붙는다(둘 다 2026-08-04 실제 오탐).
      // → 앞·뒤 중 «더 가까운» 법 이름에 귀속시킨다. 거리가 같거나 없으면 앞을 쓴다.
      let before = null, beforeDist = Infinity;
      let after = null, afterDist = Infinity;
      for (const mk of marks) {
        if (mk.pos < at) {
          const dist = at - mk.pos;
          if (dist <= beforeDist) { beforeDist = dist; before = mk; }
        } else if (mk.pos >= end && mk.pos - end < afterDist) {
          // 뒤에 오는 법 이름은 «붙어 있을 때»만 인정한다 — "статье 9 GDPR" 은 조문의 주인이지만
          // "§28-8), the Medical Service Act" 는 그냥 다음 항목이다. 사이에 쉼표·괄호·마침표가
          // 있으면 다른 항목으로 보고 무시한다.
          if (/[,;.)\]、，]/.test(line.slice(end, mk.pos))) continue;
          afterDist = mk.pos - end;
          after = mk;
        }
      }
      // ⚠️ 「앞이 «붙어 있으면» 앞이 이긴다」 — 거리 비교만 하면 거짓 통과가 난다.
      //   2026-08-04 독립 리뷰가 잡은 실제 구멍:
      //     "의료해외진출법 제15조와 통합고시 제3조에 따라 예상 진료비를 안내한다."
      //   여기서 제15조는 «바로 앞» 의료해외진출법 것인데, 뒤의 「통합고시」가 거리상 더 가까워서
      //   제15조가 통합고시(검사 대상 아님)에 붙어 **§15 진료비 오인용 규칙 자체가 조용히 통과**했다.
      //   그 규칙 하나 때문에 이 검사기를 만들었는데, 새로 넣은 문구 스타일(통합고시와 의료해외진출법을
      //   한 줄에 같이 쓰는 것)이 정확히 그 사각지대와 겹쳤다.
      //   → 앞 법 이름과 조문 사이에 «다른 숫자가 없고 짧게 붙어 있으면» 무조건 앞이 주인이다.
      //     뒤를 보는 건 어순이 반대인 언어(영어·러시아어)에서 «앞에 아무것도 없을 때»만 쓴다.
      const beforeGap = before ? line.slice(before.pos, at) : null;
      const beforeAdjacent =
        before !== null && beforeGap.length <= 40 && !/\d/.test(beforeGap.replace(/^\S+/, ""));
      const chosen = beforeAdjacent ? before : afterDist < beforeDist ? after : before;
      if (!chosen || !chosen.owner) continue; // 남의 법 조문 → 검사 대상 아님
      (out[chosen.owner] ||= new Set()).add(m[1]);
    }
  }
  return out;
}
/** 한 줄을 검사해 위반 목록을 돌려준다. */
function checkLine(line, rel, lineNo) {
  const found = [];
  // 「§15 는 근거가 아니다」처럼 오류를 «설명하는» 줄은 통과시킨다.
  if (/근거가 아니다|아니다 —|아님\)|제15조가 아니다|잘못 인용/.test(line)) return found;

  const attributed = attributeArticles(line);
  for (const [lawKey, nos] of Object.entries(attributed)) {
    const law = LEDGER[lawKey];
    for (const no of nos) {
      if (!law.조문?.[no]) {
        found.push({
          rel, line: lineNo, rule: "미등록 조문",
          msg: `${lawKey} 제${no}조 — 대장(src/lib/legal/citations.json)에 없다. 법령 원문을 열어 조문 제목을 확인하고 등록하라.`,
          src: line.trim().slice(0, 140),
        });
        continue;
      }
      if (lawKey === "의료해외진출법" && no === "15" && COST_CONTEXT.test(line)) {
        found.push({
          rel, line: lineNo, rule: "§15 오인용(진료비)",
          msg: '의료해외진출법 제15조는 "의료광고에 관한 특례"다. 진료비·견적 고지 근거는 제8조제2항제2호.',
          src: line.trim().slice(0, 140),
        });
      }
    }
  }
  return found;
}

// ── 자기시험: 검사기가 조용히 죽는 것을 막는다 (`--selftest`) ──────────────
// 왜: 잡아야 할 것 못지않게 «오탐 안 내는 것»이 중요하다. 오탐이 나면 사람이 검사를 끄고,
//     끈 검사는 없는 것과 같다. 실제로 만들면서 오탐 2종을 냈다(2026-08-04).
const SELFTESTS = [
  { name: "§15 진료비 오인용", line: "의료해외진출법 §15 에 따라 예상 진료비를 안내한다.", expect: true },
  { name: "미등록 조문", line: "의료법 제999조에 따라", expect: true },
  { name: "정상 인용", line: "의료해외진출법 제8조제2항에 따라 예상 진료비를 안내한다.", expect: false },
  { name: "오탐- 법 이름이 뒤에(러시아어)", line: "чувствительным данным согласно PIPA §23 и к особой категории согласно статье 9 GDPR.", expect: false },
  { name: "오탐- 나열 속 다른 법", line: "대한민국 개인정보보호법(§28-8 포함), 의료법, 의료해외진출법을 기반으로", expect: false },
  { name: "오탐- 남의 법(통신비밀보호법)", line: "· 로그인 기록: 3개월 (통신비밀보호법 §15-2)", expect: false },
  // ↓ 아래 4종은 2026-08-04 독립 리뷰가 「검사한다고 해놓고 안 하던 언어」를 짚어내 추가한 것.
  //   전부 «잡혀야 하는데 안 잡히던» 부류다 — 통과 시험이 아니라 적발 시험이다.
  {
    name: "괄호 항번호 + 뒤에 오는 법 이름(영어)",
    line: 'Under Article 999(2) of the Act on the Support for Overseas Expansion of Healthcare, the institution must…',
    expect: true,
  },
  {
    name: "괄호 항번호 + 뒤에 오는 법 이름(러시아어)",
    line: "Согласно статье 999(2) Закона Кореи о привлечении иностранных пациентов, учреждение обязано…",
    expect: true,
  },
  {
    name: "카자흐어 격변화(-бабының)",
    line: "Медициналық шетелдік даму туралы заң 999-бабының 2-тармағы бойынша",
    expect: true,
  },
  {
    name: "정상- 괄호 항번호가 등록된 조문이면 통과",
    line: "Under Article 8(2) of the Act on the Support for Overseas Expansion of Healthcare, …",
    expect: false,
  },
  {
    // 2026-08-04 실제 오탐. 「통합고시 제3조」가 뒤의 의료해외진출법에 붙어 헛경보를 냈다.
    name: "오탐- 통합고시(고시)의 조문을 법률 조문으로 세지 않는다",
    line: "근거: 통합고시 제3조(상급종합 15% / 종합병원·병원 20%). 초과는 의료해외진출법 제9조제1항 위반이며 제24조제1항제6호 등록취소 사유다.",
    expect: false,
  },
  {
    // 위 수정이 «같은 줄의 진짜 법률 조문까지» 눈감게 만들면 안 된다 — 그게 더 나쁜 결과다.
    name: "통합고시가 같은 줄에 있어도 «법률» 미등록 조문은 여전히 잡는다",
    line: "근거: 통합고시 제3조. 자세한 것은 의료해외진출법 제999조를 보라.",
    expect: true,
  },
  // ↓ 2026-08-04 독립 리뷰가 잡은 «거짓 통과» 4종. 전부 «잡혀야 하는데 안 잡히던» 것이다.
  //   앞의 법 이름이 바로 붙어 있는데도, 뒤에 온 「통합고시」가 거리상 가깝다는 이유로
  //   조문을 빼앗아 가서 검사 자체를 건너뛰었다.
  {
    name: "거짓통과- 뒤의 통합고시가 앞 법의 조문을 빼앗음(미등록)",
    line: "근거: 의료해외진출법 제999조와 통합고시 제3조.",
    expect: true,
  },
  {
    // 제일 심각한 것 — 이 검사기를 만든 이유인 §15 규칙이 통째로 조용해졌다.
    name: "거짓통과- §15 진료비 오인용이 통합고시 뒤에 숨음",
    line: "의료해외진출법 제15조와 통합고시 제3조에 따라 예상 진료비를 안내한다.",
    expect: true,
  },
  {
    name: "거짓통과- 시행규칙이 앞 법의 조문을 빼앗음",
    line: "의료해외진출법 제999조와 시행규칙 제7조",
    expect: true,
  },
  {
    // 영어 어순의 «자연스러운» 두 형태는 둘 다 올바르게 갈린다.
    name: "영어- of the Act 형태는 우리 법 조문으로 잡는다",
    line: "Under Article 999 of the Act on the Support for Overseas Expansion of Healthcare, …",
    expect: true,
  },
  {
    name: "영어- of the Integrated Notice 형태는 우리 법이 아니다",
    line: "Under Article 999 of the Integrated Notice on Support for Overseas Expansion of Healthcare, …",
    expect: false,
  },
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const t of SELFTESTS) {
    const hit = checkLine(t.line, "(selftest)", 0).length > 0;
    const ok = hit === t.expect;
    if (!ok) bad++;
    console.log(`${ok ? "✅" : "❌"} ${t.name} — 기대 ${t.expect ? "적발" : "통과"}, 실제 ${hit ? "적발" : "통과"}`);
  }
  if (bad) {
    console.error(`\n❌ 자기시험 실패 ${bad}건 — 검사기가 고장났다. 고치기 전엔 이 검사를 믿지 마라.`);
    process.exit(1);
  }
  console.log("\n✅ 자기시험 통과 — 검사기가 살아 있다.");
  process.exit(0);
}

const violations = [];

for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  const rel = file.slice(ROOT.length + 1);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => violations.push(...checkLine(line, rel, i + 1)));
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
