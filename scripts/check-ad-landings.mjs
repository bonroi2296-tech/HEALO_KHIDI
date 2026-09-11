#!/usr/bin/env node
/**
 * 광고 착지 주소 점검 — 돈을 넣기 «전»에 돌린다.
 *
 * 왜 만들었나 (2026-09-11):
 *   광고 계획서 §5-2 가 카자흐어 착지를 전부 `/kk/treatments/…` 로 적어놨는데 그 주소는 **404** 였다
 *   (우리 경로 코드는 `kz` 이고 `kk` 를 쓰는 건 `/kk/for-kazakh-patients` 하나뿐).
 *   그대로 켰으면 카자흐 암종 광고 4개가 전부 404 로 떨어져 예산이 통째로 샜다.
 *   같은 날 두 번째 결함도 나왔다: 구글이 금지하는 세포치료(NK) 문구가 6주 사이 암종 상세 18쪽으로 퍼졌다.
 *   둘 다 «화면은 멀쩡한데 돈만 새는» 종류라 사람 눈으로는 안 걸린다.
 *
 * 무엇을 보나
 *   ① 계획서 표의 착지 주소가 전부 최종 200 인가
 *   ② 그 착지에 세포·유전자 치료 문구가 새로 새지 않았나 (구글 광고정책 위반 → 광고그룹 반려)
 *
 * 주소 정본은 `docs/광고_캠페인_플랜.md` §5-2 표다. 여기 사본을 두지 않는다 — 두 곳이 갈리는 순간
 * 검사가 «지난 주소»를 통과시키고 광고는 새 주소로 나간다.
 *
 * 네트워크를 타므로 기본 CI 에는 넣지 않았다. 광고를 켜기 전·착지를 고친 뒤에 손으로 돌려라.
 *   npm run check:ads
 */
import fs from "node:fs";
import path from "node:path";

const PLAN = path.join(process.cwd(), "docs", "광고_캠페인_플랜.md");
// 구글 광고정책이 막는 세포·유전자 치료 표기 (한·영·러·카)
const CELL_THERAPY = [
  /NK세포치료/i,
  /NK[-\s]?Cell\s+Therapy/i,
  /НК[-\s]?клеточн/i,
  /NK[-\s]?жасушалық/i,
];

function extractUrls(md) {
  // 표 칸의 `https://healwith.co.kr/…` 만 뽑는다(백틱 안, 축약 «…» 없는 완전한 주소).
  const found = md.match(/`(https:\/\/healwith\.co\.kr\/[^`\s]+)`/g) ?? [];
  return [...new Set(found.map((m) => m.slice(1, -1)))].filter((u) => !u.includes("…"));
}

const md = fs.readFileSync(PLAN, "utf8");
const urls = extractUrls(md);

if (urls.length === 0) {
  console.error("[check:ads] 계획서에서 착지 주소를 한 개도 못 뽑았다 — 표 형식이 바뀌었나?");
  console.error(`  본 파일: ${PLAN}`);
  process.exit(1);
}

let bad = 0;
console.log(`[check:ads] 착지 ${urls.length}개 점검 (정본 = docs/광고_캠페인_플랜.md §5-2)\n`);

for (const url of urls) {
  const shown = url.replace("https://healwith.co.kr", "").split("?")[0];
  const tag = new URL(url).searchParams.get("utm_content") ?? "-";
  let line = `  ${shown.padEnd(28)} ${tag.padEnd(15)}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    const html = await res.text();
    const cell = CELL_THERAPY.find((re) => re.test(html));
    const ok = res.status === 200 && !cell;
    line += ` ${res.status}`;
    if (res.status !== 200) line += "  🛑 200 이 아니다 — 광고비가 통째로 샌다";
    else if (cell) line += `  🛑 세포치료 문구(${cell.source}) — 구글 광고정책 위반, 반려 위험`;
    else line += "  ✅";
    if (!ok) bad++;
  } catch (e) {
    line += `  🛑 요청 실패: ${String(e).slice(0, 60)}`;
    bad++;
  }
  console.log(line);
}

console.log("");
if (bad > 0) {
  console.error(`[check:ads] ✗ ${bad}건 문제. 고치기 «전»에 광고를 켜지 마라.`);
  process.exit(1);
}
console.log("[check:ads] ✓ 전부 통과 — 착지는 광고를 받을 준비가 됐다.");
