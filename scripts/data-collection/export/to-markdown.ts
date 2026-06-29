/**
 * 시장 인텔리전스 → 마크다운 리포트 + JSON 사이드카.
 * PO/마케팅이 바로 읽는 한 파일(.md) + 후속 가공용 원자료(.json).
 */

import * as fs from "fs";
import * as path from "path";
import { IntelResult } from "../collectors/market-intel-collector";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

/** 수집 결과(+선택 AI요약)를 마크다운 리포트 문자열로 */
export function intelToMarkdown(result: IntelResult, aiBrief: string | null): string {
  const { items, bySource, collectedAt, sourcesOk, sourcesTried } = result;
  const lines: string[] = [];

  lines.push(`# HEALO 시장 인텔리전스 리포트`);
  lines.push("");
  lines.push(`- 수집 시각: ${collectedAt}`);
  lines.push(`- 응답 소스: ${sourcesOk}/${sourcesTried} · 수집 항목: ${items.length}건`);
  lines.push(`- 소스별: ${Object.entries(bySource).map(([s, n]) => `${s} ${n}`).join(" · ") || "—"}`);
  lines.push("");
  lines.push(`> ⚠️ 공개 신호(뉴스·커뮤니티)만 수집 — 환자 개인정보 아님. 내부 마케팅·운영 참고용.`);
  lines.push("");

  if (aiBrief) {
    lines.push(`## 🤖 AI 마케팅 브리프`);
    lines.push("");
    lines.push(aiBrief);
    lines.push("");
  }

  // 워치 키워드(브랜드·경쟁) 매칭 먼저 하이라이트
  const flagged = items.filter((i) => i.matchedKeywords.length > 0);
  if (flagged.length) {
    lines.push(`## ⭐ 주목 신호 (브랜드·경쟁 키워드 매칭)`);
    lines.push("");
    for (const it of flagged) {
      lines.push(`- [${fmtDate(it.publishedAt)}] **${it.title}** _(${it.matchedKeywords.join(", ")})_`);
      lines.push(`  - ${it.source} · ${it.url}`);
    }
    lines.push("");
  }

  // 주제(query)별 그룹
  lines.push(`## 📊 전체 신호 (주제별)`);
  lines.push("");
  const byTopic = new Map<string, typeof items>();
  for (const it of items) {
    const k = it.query || "기타";
    if (!byTopic.has(k)) byTopic.set(k, []);
    byTopic.get(k)!.push(it);
  }
  for (const [topic, list] of byTopic) {
    lines.push(`### ${topic} (${list.length})`);
    lines.push("");
    for (const it of list.slice(0, 25)) {
      lines.push(`- [${fmtDate(it.publishedAt)}] ${it.title}`);
      lines.push(`  - ${it.platform}/${it.lang || "-"} · ${it.url}`);
      if (it.snippet) lines.push(`  - ${it.snippet}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** 마크다운 + JSON 두 파일 저장. 파일 경로 배열 반환. */
export function saveIntel(
  result: IntelResult,
  aiBrief: string | null,
  outputDir: string,
  stamp: string
): string[] {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const mdPath = path.join(outputDir, `market-intel_${stamp}.md`);
  const jsonPath = path.join(outputDir, `market-intel_${stamp}.json`);
  fs.writeFileSync(mdPath, intelToMarkdown(result, aiBrief), "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify({ ...result, aiBrief }, null, 2), "utf-8");
  return [mdPath, jsonPath];
}
