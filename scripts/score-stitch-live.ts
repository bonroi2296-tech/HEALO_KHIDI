/**
 * 실서비스에 «이미 쌓인» 자막으로 이어 붙이기를 채점한다.
 *
 * 왜 (2026-08-28): 러시아어 고유명사 판정을 완화했는데(endsWithConnector), 그 완화가
 *   통역봇 경로에만 좋고 «기존 자막 경로»에는 나쁠 수 있다. 잘못 붙이면 뜻이 바뀐다.
 *   그래서 실제로 쌓인 자막에 걸어 보고, 완화 전후로 «붙는 건수»가 얼마나 달라지는지 센다.
 *
 * ⚠️ 실환자 대화다. **내용은 절대 찍지 않는다** — 건수와 비율만 낸다.
 *    (자막이 화면에 뜨면 안 되는 이유는 watch_captions.py 머리말과 같다)
 *
 *   node --env-file=.env.local --import tsx --conditions=react-server scripts/score-stitch-live.ts [최대건수]
 *   ⚠️ 환경변수는 반드시 --env-file 로 넘겨라: 코드에서 dotenv 를 부르면 암호화 모듈이
 *      먼저 평가돼 열쇠를 못 읽고, 최근 자막(암호문)이 통째로 빠진 채 «다 봤다»고 착각한다.
 */
import { createClient } from "@supabase/supabase-js";
import { decryptTranscriptRows } from "../src/lib/consultation/transcriptCrypto";
import {
  shouldStitch,
  endsWithConnector,
  startsNewSentence,
  looksCut,
} from "../src/lib/consultation/transcriptStitch";

const LIMIT = Number(process.argv[2] || 4000);

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⚠️ PostgREST 는 한 번에 1,000행까지만 준다. 나눠 받지 않으면 «다 봤다»고 착각한다.
const data: any[] = [];
for (let from = 0; from < LIMIT; from += 1000) {
  const { data: page, error } = await db
    .from("consultation_translations")
    .select(
      "session_id, source_lang, source_text, source_text_encrypted, speaker_name, speaker_name_encrypted, translated_text, translated_text_encrypted, created_at"
    )
    // ⚠️ 말하는 중 흐른 «중간 자막»은 뻐다(2026-09-01 부터 DB 에 남기기 시작했다).
    //    중간 자막은 정의상 같은 발화의 앞토막이라, 섞으면 «붙일 수 있는 쌍»이 인위적으로
    //    늘어나 이어붙이기 점수가 왜곡된다. 이 스크립트가 재는 것은
    //    «확정 자막끼리 얼마나 잘 이어지나» 다.
    .eq("is_partial", false)
    .order("created_at", { ascending: false })
    .range(from, Math.min(from + 999, LIMIT - 1));
  if (error) {
    console.error("조회 실패:", error.message);
    process.exit(1);
  }
  if (!page?.length) break;
  data.push(...page);
}

const rows = decryptTranscriptRows(data as any).filter((r) => r.source_text);
console.log(`자막 ${rows.length}줄 (최근 ${LIMIT}건 중 원문이 있는 것)`);

// 방별로 시간순 — 이어 붙이기는 «바로 앞줄»과만 견준다
const bySession = new Map<string, any[]>();
for (const r of rows) {
  const k = (r as any).session_id;
  if (!bySession.has(k)) bySession.set(k, []);
  bySession.get(k)!.push(r);
}
for (const list of bySession.values()) {
  list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
}

/** 완화가 «켜졌을 때만» 새로 붙는 짝을 센다. 그게 이번 변경이 만든 차이의 전부다. */
let pairs = 0;
let stitched = 0;
const newlyStitched: { lang: string; joined: string }[] = [];

for (const list of bySession.values()) {
  for (let i = 1; i < list.length; i++) {
    const prev = {
      source: list[i - 1].source_text || "",
      translated: list[i - 1].translated_text || "",
      speaker: list[i - 1].speaker_name || "",
      lang: list[i - 1].source_lang || "",
      at: +new Date(list[i - 1].created_at),
    };
    const next = {
      source: list[i].source_text || "",
      translated: list[i].translated_text || "",
      speaker: list[i].speaker_name || "",
      lang: list[i].source_lang || "",
      at: +new Date(list[i].created_at),
    };
    pairs++;
    const now = shouldStitch({ prev, next });
    if (now) stitched++;
    // 완화가 없었다면? = 뒤가 새 문장으로 보이는데 앞이 전치사로 끝나서 통과한 경우
    if (now && startsNewSentence(next.source) && endsWithConnector(prev.source)) {
      newlyStitched.push({
        lang: next.lang || "?",
        // 내용은 안 찍는다 — 길이와 언어만
        joined: `${prev.source.trim()} ▸ ${next.source.trim()}`,
        joined: `${prev.source.trim()} ▸ ${next.source.trim()}`,
      });
    }
  }
}

const cut = rows.filter((r) => looksCut(r.source_text || "")).length;
console.log(`\n문장 중간에서 끊긴 줄: ${cut}/${rows.length} (${((100 * cut) / rows.length).toFixed(0)}%)`);
console.log(`이어 붙이기가 붙이는 짝: ${stitched}/${pairs} (${((100 * stitched) / Math.max(1, pairs)).toFixed(1)}%)`);
console.log(`\n이번 완화(전치사 뒤 대문자)로 «새로» 붙는 짝: ${newlyStitched.length}건`);
if (newlyStitched.length) {
  const byLang: Record<string, number> = {};
  for (const x of newlyStitched) byLang[x.lang] = (byLang[x.lang] ?? 0) + 1;
  for (const [lang, n] of Object.entries(byLang).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang}: ${n}건`);
  }
  console.log("\n  ⚠️ 이 건들은 «잘못 붙었을 수도» 있다. 0 이 아니면 사람이 봐야 한다.");
  // ⚠️ SHOW_TEXT=1 을 줄 때만 내용을 찍는다. 실환자 대화라 기본은 숫자만이다.
  if (process.env.SHOW_TEXT) {
    newlyStitched.forEach((x, i2) => console.log(`   ${i2 + 1}. ${x.joined}`));
  }
} else {
  console.log("  → 기존 자막 경로에는 영향이 없다(완화가 여기선 한 건도 안 걸렸다).");
}
