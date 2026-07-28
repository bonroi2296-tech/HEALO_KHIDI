/**
 * AEO 가시성 측정 — "AI 가 우리를 인용하나?"를 숫자로 남긴다.
 *
 * 왜: AEO(답변엔진 최적화) 작업을 해도 **효과를 잴 수단이 없으면 했는지 안 했는지 알 수 없다.**
 *     구조화데이터·robots·llms.txt 를 아무리 손봐도 "AI 가 실제로 우리를 근거로 쓰는가"는
 *     별개 질문이다. 이 스크립트가 그 성적표를 만든다.
 *
 * 무엇을 재나: 실제 환자가 던질 법한 질문을 **검색 근거(Google Search grounding)를 켠 Gemini**
 *     에 물어보고, 그 답의 **근거 출처 목록에 healwith.co.kr 이 들어갔는지**를 본다.
 *     동시에 어떤 경쟁사가 인용됐는지도 같이 기록한다(우리 자리를 누가 차지하고 있는지).
 *
 * ⚠️ 이 측정이 커버하는 범위와 한계 — 정직하게 읽어라:
 *   · 커버함: **구글 계열**(Gemini + Google Search). Google AI 개요와 같은 검색 근거를 쓴다.
 *   · 커버 못 함: **챗GPT·퍼플렉시티**. 각각 유료 키가 필요하고 우리는 아직 없다.
 *     → 그쪽은 사람이 직접 물어보고 아래 기록 파일에 손으로 한 줄 추가하는 수밖에 없다.
 *   · "인용 0" 이 곧 "우리가 안 보인다"는 아니다. 검색 근거는 질문·시점·지역에 따라 흔들린다.
 *     **한 번의 결과로 단정하지 말고 추세로 봐라.** 그래서 매번 날짜와 함께 append 한다.
 *
 * 사용법:
 *   node scripts/aeo-visibility.mjs            # 측정 + docs/audit/AEO_VISIBILITY.md 에 기록
 *   node scripts/aeo-visibility.mjs --dry      # 기록 안 하고 화면에만
 *
 * 키: GOOGLE_GENERATIVE_AI_API_KEY (.env.local 에서 읽음)
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs", "audit", "AEO_VISIBILITY.md");

const MODEL = "gemini-flash-latest"; // PO 결정: 최신 별칭 유지(구형 고정 금지)
const OUR_DOMAIN = "healwith.co.kr";

// 경쟁사 — 인용 자리를 실제로 차지하고 있는 곳들(2026-07-28 실측 기준)
const COMPETITORS = [
  "bookimed.com",
  "mediglobus.com",
  "medigence.com",
  "healthtrip.com",
  "clinicspots.com",
  "medicaltourism.com",
];

/**
 * 실제 환자가 던질 법한 질문.
 * 러시아어·카자흐어가 핵심 시장이라 비중을 크게 두고, 비교용으로 영어·한국어를 섞는다.
 * ⚠️ 질문을 바꾸면 이전 기록과 비교가 깨진다 — 추가는 하되 기존 문항은 그대로 둘 것.
 */
const QUESTIONS = [
  { id: "ru-where", lang: "ru", q: "Куда поехать на лечение рака в Корею? Какие есть агентства и как организовать?" },
  { id: "ru-cost", lang: "ru", q: "Сколько стоит лечение рака в Южной Корее для иностранца?" },
  { id: "ru-remote", lang: "ru", q: "Можно ли получить онлайн-консультацию корейского онколога до поездки?" },
  { id: "ru-visa", lang: "ru", q: "Как получить медицинскую визу в Корею для лечения рака?" },
  { id: "kz-where", lang: "kk", q: "Кореяда қатерлі ісікті емдеу үшін қайда жүгінуге болады?" },
  { id: "kz-help", lang: "kk", q: "Кореяда емделуге көмектесетін компаниялар қайсы?" },
  { id: "en-agency", lang: "en", q: "Which agency helps international cancer patients get treatment in Korea?" },
  { id: "en-second", lang: "en", q: "How can I get a second opinion from a Korean oncologist before traveling?" },
  { id: "ko-agency", lang: "ko", q: "외국인 암환자가 한국에서 치료받으려면 어디에 문의해야 하나요?" },
];

// ── .env.local 에서 키만 주입 ────────────────────────────────────────
function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "").trim();
  }
}

/** 근거 출처에서 도메인만 뽑는다.
 *  구글은 출처 URL 을 vertexaisearch 리다이렉트로 감싸서 준다 → 실제 도메인은 web.domain/title 에 있다.
 *  (uri 만 파싱하면 전부 "vertexaisearch.cloud.google.com" 으로 보여서 측정이 통째로 무의미해진다.) */
function domainsFromGrounding(meta) {
  const chunks = meta?.groundingChunks || [];
  const out = [];
  for (const c of chunks) {
    const w = c.web || {};
    const d = w.domain || w.title || "";
    if (d) out.push(String(d).toLowerCase().replace(/^www\./, ""));
  }
  return out;
}

async function ask({ q }) {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: q }] }],
      tools: [{ google_search: {} }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const cand = j.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("");
  const domains = domainsFromGrounding(cand?.groundingMetadata);
  return { text, domains };
}

function analyze({ text, domains }) {
  const uniq = [...new Set(domains)];
  const citedUs = uniq.some((d) => d.includes(OUR_DOMAIN));
  // 근거 출처엔 없어도 답변 본문에 이름이 나올 수 있다 — 둘은 다른 신호라 따로 센다.
  const namedUs = /healwith|힐위드/i.test(text);
  const citedRivals = COMPETITORS.filter((c) => uniq.some((d) => d.includes(c)));
  return { citedUs, namedUs, citedRivals, sourceCount: uniq.length, topSources: uniq.slice(0, 6) };
}

async function main() {
  loadEnvLocal();
  const dry = process.argv.includes("--dry");
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("✗ GOOGLE_GENERATIVE_AI_API_KEY 없음 (.env.local 확인)");
    process.exit(1);
  }

  const rows = [];
  for (const item of QUESTIONS) {
    process.stdout.write(`· ${item.id} … `);
    try {
      const r = analyze(await ask(item));
      rows.push({ ...item, ...r });
      console.log(
        `${r.citedUs ? "인용됨 ✅" : r.namedUs ? "본문 언급만 △" : "없음 ✗"}` +
          ` | 출처 ${r.sourceCount}개 | 경쟁사 ${r.citedRivals.join(",") || "-"}`
      );
    } catch (e) {
      rows.push({ ...item, error: String(e.message).slice(0, 120) });
      console.log(`오류: ${String(e.message).slice(0, 80)}`);
    }
  }

  const ok = rows.filter((r) => !r.error);
  const cited = ok.filter((r) => r.citedUs).length;
  const named = ok.filter((r) => !r.citedUs && r.namedUs).length;
  const rivalTally = {};
  for (const r of ok) for (const c of r.citedRivals) rivalTally[c] = (rivalTally[c] || 0) + 1;
  const rivalLine =
    Object.entries(rivalTally)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c} ${n}`)
      .join(" · ") || "(없음)";

  console.log(`\n── 요약 ──`);
  console.log(`근거로 인용됨: ${cited}/${ok.length}   본문 언급만: ${named}/${ok.length}`);
  console.log(`경쟁사 인용 횟수: ${rivalLine}`);
  if (rows.some((r) => r.error)) console.log(`⚠️ 오류 ${rows.filter((r) => r.error).length}건 — 아래 기록 참조`);

  if (dry) return;

  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    ``,
    `## ${stamp} — 인용 ${cited}/${ok.length} · 본문 언급만 ${named}/${ok.length}`,
    ``,
    `- 엔진: Google (Gemini \`${MODEL}\` + Google Search 근거). **챗GPT·퍼플렉시티는 미포함**(유료 키 없음 — 사람이 직접 물어 아래에 손으로 추가할 것).`,
    `- 경쟁사 인용 횟수: ${rivalLine}`,
    ``,
    `| 질문 | 언어 | 우리 인용 | 본문 언급 | 인용된 경쟁사 | 주요 출처 |`,
    `|---|---|---|---|---|---|`,
    ...rows.map((r) =>
      r.error
        ? `| ${r.id} | ${r.lang} | — | — | — | ⚠️ ${r.error} |`
        : `| ${r.id} | ${r.lang} | ${r.citedUs ? "✅" : "✗"} | ${r.namedUs ? "○" : "✗"} | ${r.citedRivals.join(", ") || "-"} | ${r.topSources.join(", ")} |`
    ),
    ``,
  ];

  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  if (!existsSync(OUT)) {
    writeFileSync(
      OUT,
      [
        `# AEO 가시성 기록 — "AI 가 우리를 인용하나"`,
        ``,
        `> \`node scripts/aeo-visibility.mjs\` 를 돌리면 아래에 날짜별로 쌓인다.`,
        `> **한 번의 숫자로 단정하지 마라** — 검색 근거는 질문·시점·지역에 따라 흔들린다. 추세로 봐라.`,
        `> 챗GPT·퍼플렉시티는 자동 측정 대상이 아니다(유료 키 필요). 사람이 물어본 결과는 해당 날짜 절에 손으로 덧붙일 것.`,
        ``,
      ].join("\n"),
      "utf8"
    );
  }
  appendFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`\n기록: ${OUT.replace(ROOT, ".")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
