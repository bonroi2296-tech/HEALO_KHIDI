// 보관기간 정합성 검사 — 「코드에 적은 기간」과 「방침에 적은 기간」이 어긋나는 것을 막는다.
//
// 왜 따로 만들었나 (2026-09-08):
//   개인정보처리방침 §6 은 6개 언어에 「3년」을 **손으로** 박아 두고,
//   src/lib/maintenance/retention.ts 는 그 숫자를 「단일 출처」라고 선언한다.
//   둘이 어긋나도 아무도 몰랐다 — `check:legal-parity` 는 **줄 수만** 세기 때문이다.
//
// 🛑 «§6 어딘가에 3년이 있나»로 재면 헛것이 된다 (2026-09-08 독립 리뷰가 실증):
//   처음 판은 그렇게 만들었는데, §6 에는 「계약 5년」·「분쟁 3년」 같은 법정 보관 줄이 이미 있어서
//   보관기간을 3 → 5 로 바꾸고 방침 문구를 «하나도 안 고쳐도» 초록불이 떴다.
//   → 그래서 **줄을 지목해서** 잰다: 검사 서류·영상 조항 «그 한 줄»에 그 표기가 있어야 한다.
//   줄 번호는 ko 에서 찾고 다른 언어엔 같은 번호를 쓴다 — `check:legal-parity` 가 6개 언어의
//   줄 수가 같음을 이미 보장하므로 번호가 맞아떨어진다. ko 문장이 바뀌어 못 찾으면 **멈춘다**
//   (조용히 통과하지 않는다 — 그게 이 검사를 처음에 헛것으로 만든 실수였다).
//
// 🛑 그래도 «못» 잡는 것: 한 언어의 문장이 통째로 안 고쳐진 «번역 누락».
//   자연어라 기계로 판정할 수 없다(오탐·미탐 둘 다 난다). 사람이 세어야 한다.
import { readFileSync } from "node:fs";
import { getPrivacyPolicy } from "../src/lib/legal/privacyPolicy.js";

// retention.ts 는 «글»로 읽는다 — CI 에 TypeScript 로더를 하나 더 물리지 않으려고.
// 값이 전부 리터럴이라 읽어내면 그만이고, 모양이 바뀌면 아래에서 바로 멈춘다.
const SRC = readFileSync(new URL("../src/lib/maintenance/retention.ts", import.meta.url), "utf8");

function years(key) {
  const m = SRC.match(new RegExp(`${key}:\\s*(\\d+)\\s*,`));
  if (!m) throw new Error(`retention.ts 에서 RETENTION_YEARS.${key} 를 못 읽었다 — 모양이 바뀌었으면 이 검사도 같이 고쳐라`);
  return Number(m[1]);
}
let RETENTION_YEARS = {
  patientDocuments: years("patientDocuments"),
  dormantInquiries: years("dormantInquiries"),
  contractRecords: years("contractRecords"),
};

const labelLine = SRC.match(/patientDocuments:\s*\{([^}]*)\}/);
if (!labelLine) throw new Error("retention.ts 에서 RETENTION_LABEL.patientDocuments 를 못 읽었다");
let RETENTION_LABEL = {
  patientDocuments: Object.fromEntries(
    [...labelLine[1].matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]),
  ),
};

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const problems = [];
const P = (m) => problems.push(m);

// 보관기간이 적히는 자리 = §6. 방침 객체는 키별 {title, body[]} 평면 구조다.
const RETENTION_SECTION = "retention";

// ko 본문에서 «검사 서류·영상 자료» 조항이 몇 번째 줄인지 찾는다. 이 표식이 사라지면 멈춘다.
const KO_MARKER = "검사 서류·영상 자료";

function bodyOf(lang) {
  const sec = getPrivacyPolicy(lang)?.[RETENTION_SECTION];
  return Array.isArray(sec?.body) ? sec.body : null;
}

function imagingBulletIndex() {
  const ko = bodyOf("ko");
  if (!ko) throw new Error("방침 ko 의 §6 을 못 읽었다");
  const i = ko.findIndex((line) => line.includes(KO_MARKER));
  if (i < 0) {
    throw new Error(
      `방침 ko §6 에서 "${KO_MARKER}" 줄을 못 찾았다 — 문구를 바꿨으면 이 검사의 KO_MARKER 도 같이 고쳐라.\n` +
        "    (조용히 통과시키지 않는다: 줄을 못 지목하면 이 검사는 아무것도 재지 못한다)",
    );
  }
  return i;
}

/** 그 언어의 «검사 서류·영상 조항 한 줄». 줄 수가 어긋나면 null(= 대조 불가로 잡는다). */
function imagingBullet(lang, idx) {
  const body = bodyOf(lang);
  if (!body) return null;
  return body[idx] ?? null;
}

function run(bulletByLang = null) {
  problems.length = 0;
  const label = RETENTION_LABEL.patientDocuments;
  const idx = bulletByLang ? -1 : imagingBulletIndex();

  for (const lang of LANGS) {
    const text = bulletByLang ? bulletByLang[lang] : imagingBullet(lang, idx);
    if (text == null) {
      P(`${lang}: §6 의 검사 서류·영상 조항(${idx}번째 줄)을 못 찾았다 — 줄 수가 ko 와 다르다(check:legal 도 같이 봐라)`);
      continue;
    }
    const want = label[lang];
    if (!want) {
      P(`RETENTION_LABEL 에 ${lang} 표기가 없다 — 언어를 늘렸으면 여기도 늘려라`);
      continue;
    }
    if (!text.includes(want)) {
      P(
        `${lang}: §6 의 «검사 서류·영상» 조항에 보관기간 표기 "${want}" 가 없다.\n` +
          `    그 줄: ${String(text).slice(0, 90)}…\n` +
          `    → retention.ts 의 RETENTION_YEARS.patientDocuments(=${RETENTION_YEARS.patientDocuments}년) 를 바꿨다면\n` +
          `      RETENTION_LABEL 과 6개 언어 방침 문구를 «같이» 고쳐라. 한쪽만 고치면 그 자체가 방침 위반이다.`,
      );
    }
  }

  // 라벨이 실제 햇수와 말이 되는지 — "3" 이 문구 안에 있어야 한다(숫자만 대조, 문법은 안 본다).
  const n = String(RETENTION_YEARS.patientDocuments);
  for (const [lang, txt] of Object.entries(label)) {
    if (!txt.includes(n)) P(`RETENTION_LABEL.${lang} "${txt}" 안에 숫자 ${n} 이 없다 — 햇수를 바꾸고 표기를 안 고쳤다`);
  }

  // 법정 최소는 우리가 줄일 수 없다.
  if (RETENTION_YEARS.contractRecords < 5) {
    P(`계약 기록 보관이 ${RETENTION_YEARS.contractRecords}년 — 전자상거래법 §6 의 5년보다 짧다`);
  }
  return [...problems];
}

// --selftest: 결함을 «일부러 심어» 실제로 빨간불이 뜨는지 본다.
// (규칙: 검사를 만들었으면 그 검사가 진짜 잡는지부터 보여라)
if (process.argv.includes("--selftest")) {
  const ok = {};
  for (const l of LANGS) ok[l] = `· 검사 서류·영상 자료: ${RETENTION_LABEL.patientDocuments[l]} 보관 뒤 파기`;
  // 🔑 마지막 칸이 핵심이다: «다른 줄에 그 숫자가 있어도» 통과하면 안 된다.
  //    처음 판이 딱 그래서 헛것이었다(계약 5년 줄 때문에 5 로 바꿔도 초록불).
  const cases = [
    ["정상 — 통과해야 함", ok, 0],
    ["카자흐어만 옛 숫자 — 잡아야 함", { ...ok, kz: "· Тексеру құжаттары: 5 жыл сақталады" }, 1],
    ["두 언어가 빠짐 — 둘 다 잡아야 함", { ...ok, ru: "· без срока", ja: "· 期間なし" }, 2],
  ];
  let bad = 0;
  for (const [name, fixture, want] of cases) {
    const got = run(fixture).length;
    const pass = got === want;
    if (!pass) bad++;
    console.log(`  ${pass ? "✅" : "❌"} ${name} (기대 ${want}건 / 실제 ${got}건)`);
  }

  // 🔑 제일 중요한 시험 — «진짜 방침»을 상대로 잰다.
  //    보관기간을 3 → 5 로 바꾸고 방침 문구를 하나도 안 고치면 반드시 빨간불이어야 한다.
  //    처음 판은 여기서 초록불이 떴다(§6 의 「계약 5년」 줄 때문에). 그래서 이 시험이 있다.
  {
    const keepY = RETENTION_YEARS, keepL = RETENTION_LABEL;
    RETENTION_YEARS = { ...keepY, patientDocuments: 5 };
    RETENTION_LABEL = {
      patientDocuments: { ko: "5년", en: "5 years", ru: "5 лет", kz: "5 жыл", zh: "5 年", ja: "5 年" },
    };
    const got = run().length;
    RETENTION_YEARS = keepY; RETENTION_LABEL = keepL;
    const pass = got === LANGS.length;
    if (!pass) bad++;
    console.log(
      `  ${pass ? "✅" : "❌"} 실제 방침 상대: 햇수만 3→5 로 바꾸면 6개 언어 전부 빨간불 (기대 ${LANGS.length}건 / 실제 ${got}건)`,
    );
  }
  if (bad) {
    console.error("\n[retention] 자기시험 실패 — 이 검사는 결함을 못 잡는다.");
    process.exit(1);
  }
  console.log("[retention] 자기시험 통과 — 결함을 심으면 실제로 빨간불이 뜬다.\n");
}

const found = run();
if (found.length) {
  console.error(`[retention] 보관기간 정합성 ${found.length}건 어긋남:\n` + found.map((m) => `  · ${m}`).join("\n"));
  process.exit(1);
}
console.log(
  `[retention] OK — 검사 서류·영상 보관 ${RETENTION_YEARS.patientDocuments}년이 6개 언어 방침 §6 문구와 일치한다.`,
);
