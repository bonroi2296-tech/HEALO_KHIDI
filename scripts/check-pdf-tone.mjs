#!/usr/bin/env node
/**
 * check:pdf-tone — PDF 문서(초청장·견적서·동의서) 톤이 Premium으로 되돌아가는 걸 CI가 차단.
 *
 * 왜: `src/lib/pdf/styles.js`가 'D.Premium 톤'(Playfair 세리프 + 골드/크림)으로
 *     DESIGN.md 금지 항목을 정면 위반한 채 있었고, PO가 반복해서 지적. 한 번 고쳐도
 *     사람이 실수로 다시 넣으면 못 잡는다 → 기계가 매 PR 검사한다.
 *
 * 금지(=DESIGN.md forbidden.premium_drift):
 *   - serif 폰트: Playfair / Noto Serif
 *   - 골드·크림 premium hex 팔레트
 *   - 외부 웹폰트 다운로드(fonts.gstatic.com) — 톤 위반 + 오프라인/프록시 404로 렌더 실패 위험
 *
 * 범위: src/lib/pdf/ (PDF 레이어). 통과 못 하면 = Legacy 톤(내장 산세리프·teal·회색)으로.
 */
import fs from "node:fs";
import path from "node:path";

const PDF_DIR = path.join(process.cwd(), "src", "lib", "pdf");

// (라벨, 정규식) — 매칭되면 위반
const RULES = [
  ["serif 폰트(Playfair)", /Playfair/],
  ["serif 폰트(Noto Serif)", /Noto\s*Serif/],
  ["외부 웹폰트 다운로드(gstatic)", /fonts\.gstatic\.com/],
  // premium 골드/크림 hex (styles.js에서 제거한 값들) — 되돌아오면 차단
  ["premium gold hex", /#c8a96a|#b89550|#e8d9b4/i],
  ["premium cream hex", /#f5f0e8|#e3dbcc|#fbf8f2/i],
];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(p);
  }
}

const files = [];
walk(PDF_DIR, files);

const violations = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const [label, re] of RULES) {
      if (re.test(line)) {
        violations.push({ file: path.relative(process.cwd(), f), line: i + 1, label, text: line.trim().slice(0, 100) });
      }
    }
  });
}

if (violations.length > 0) {
  console.error("\n✗ PDF 톤 위반 (DESIGN.md: serif·gold·cream·외부웹폰트 금지):");
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line}  [${v.label}]  ${v.text}`);
  }
  console.error("\n조치: Legacy 톤으로 — 내장 Helvetica(산세리프) · teal-600/회색/흰색.");
  console.error("      외부 폰트 등록 금지(내장 폰트만). 상세: DESIGN.md forbidden.premium_drift.");
  process.exit(1);
}

console.log(`✓ PDF 톤 검사 통과 (${files.length}개 파일 — serif·gold·cream·외부웹폰트 0)`);
