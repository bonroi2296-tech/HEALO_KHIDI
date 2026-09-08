// 보관기간 정합성 검사 — 「코드에 적은 기간」과 「방침에 적은 기간」이 어긋나는 것을 막는다.
//
// 왜 따로 만들었나 (2026-09-08):
//   개인정보처리방침 §6 은 6개 언어에 「3년」을 **손으로** 박아 두고,
//   src/lib/maintenance/retention.ts 는 그 숫자를 「단일 출처」라고 선언한다.
//   둘이 어긋나도 아무도 몰랐다 — `check:legal-parity` 는 **줄 수만** 세기 때문이다.
//
// 🛑 이 검사가 «못» 잡는 것 (알고 만들었다, 초록불을 과신하지 마라):
//   같은 날 카자흐어에서 §6 문장 하나가 안 고쳐져 「사본을 보관하지 않는다」와
//   「영상은 3년 보관」이 한 문서 안에서 부딪쳤다. 그건 «번역 누락»이라 문자열 대조로는
//   기계적으로 판정할 수 없다(자연어라 오탐·미탐 둘 다 난다). 사람이 볼 몫으로 남긴다.
//   여기서 잡는 건 **숫자 드리프트**뿐이다.
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
const RETENTION_YEARS = {
  patientDocuments: years("patientDocuments"),
  dormantInquiries: years("dormantInquiries"),
  contractRecords: years("contractRecords"),
};

const labelLine = SRC.match(/patientDocuments:\s*\{([^}]*)\}/);
if (!labelLine) throw new Error("retention.ts 에서 RETENTION_LABEL.patientDocuments 를 못 읽었다");
const RETENTION_LABEL = {
  patientDocuments: Object.fromEntries(
    [...labelLine[1].matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]),
  ),
};

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const problems = [];
const P = (m) => problems.push(m);

// 보관기간이 적히는 자리 = §6. 방침 객체는 키별 {title, body[]} 평면 구조다.
const RETENTION_SECTION = "retention";

function retentionBody(lang) {
  const doc = getPrivacyPolicy(lang);
  const sec = doc?.[RETENTION_SECTION];
  if (!sec || !Array.isArray(sec.body)) return null;
  return `${sec.title}\n${sec.body.join("\n")}`;
}

function run(bodyByLang = null) {
  problems.length = 0;
  const label = RETENTION_LABEL.patientDocuments;

  for (const lang of LANGS) {
    const text = bodyByLang ? bodyByLang[lang] : retentionBody(lang);
    if (text == null) {
      P(`${lang}: 방침에 §6(${RETENTION_SECTION}) 절이 없다`);
      continue;
    }
    const want = label[lang];
    if (!want) {
      P(`RETENTION_LABEL 에 ${lang} 표기가 없다 — 언어를 늘렸으면 여기도 늘려라`);
      continue;
    }
    if (!text.includes(want)) {
      P(
        `${lang}: §6 본문에 보관기간 표기 "${want}" 가 없다.\n` +
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
  for (const l of LANGS) ok[l] = `보관 ${RETENTION_LABEL.patientDocuments[l]} 문구가 들어간 본문`;
  const cases = [
    ["정상 — 통과해야 함", ok, 0],
    ["카자흐어 문구가 옛 숫자 — 잡아야 함", { ...ok, kz: "보관 5 жыл 문구" }, 1],
    ["두 언어가 빠짐 — 둘 다 잡아야 함", { ...ok, ru: "없음", ja: "없음" }, 2],
  ];
  let bad = 0;
  for (const [name, fixture, want] of cases) {
    const got = run(fixture).length;
    const pass = got === want;
    if (!pass) bad++;
    console.log(`  ${pass ? "✅" : "❌"} ${name} (기대 ${want}건 / 실제 ${got}건)`);
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
