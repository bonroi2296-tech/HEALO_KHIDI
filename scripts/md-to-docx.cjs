/**
 * 마크다운 → 워드(.docx) 변환기 (표·제목 서식 유지)
 *
 * 왜 있나: PO 는 산출물을 워드로 받길 원한다(마크다운은 메모장에서 표가 깨짐).
 * 이 저장소 환경엔 pandoc 이 없어서 docx-js 로 직접 만든다.
 *
 * 사용법:
 *   npm i docx --no-save        # 저장소 의존성 아님 — 문서 뽑을 때만 설치
 *   node scripts/md-to-docx.cjs docs/비자_대행_매뉴얼.md 비자_대행_매뉴얼.docx
 *
 * 지원: 제목(#~####) · 표 · 코드블록 · 인용(>) · 목록(체크박스 포함) · 번호목록
 *      · 굵게(**) · 인라인코드(`) · 링크 · 수평선
 *      · <details>/<summary> 블록은 #### 제목으로 자동 변환
 *
 * ⚠️ 이 컨테이너엔 LibreOffice 가 동작하지 않아 결과물을 눈으로 렌더 확인할 수 없다.
 *    검증은 word/document.xml 을 파싱해 표 개수·핵심 문구로 대신하고,
 *    PO 에게 "눈으로는 못 봤다"고 고지할 것.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, ExternalHyperlink,
  LevelFormat, PageOrientation,
} = require('docx');

const SRC = process.argv[2];
const OUT = process.argv[3];
const FONT = '맑은 고딕';

const PAGE_W = 11906;          // A4 세로 폭(DXA)
const MARGIN = 1000;
const CONTENT_W = PAGE_W - MARGIN * 2;

// <details><summary>제목</summary> 본문 </details> -> #### 제목 + 본문
function stripDetails(src) {
  src = src.replace(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/g,
    (_, title, body) => `#### ${title.replace(/<[^>]+>/g, '').trim()}\n\n${body.trim()}\n`);
  return src.replace(/<\/?(details|summary)>/g, '');
}

const md = stripDetails(fs.readFileSync(SRC, 'utf8')).split('\n');

// ---------- 인라인 파서: **bold**, `code`, [text](url) ----------
function inline(text, base = {}) {
  const runs = [];
  // 링크 먼저 분리
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m;
  const pieces = [];
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) pieces.push({ t: text.slice(last, m.index) });
    pieces.push({ t: m[1], url: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) pieces.push({ t: text.slice(last) });

  for (const p of pieces) {
    const sub = styleRuns(p.t, base, !!p.url);
    if (p.url) runs.push(new ExternalHyperlink({ children: sub, link: p.url }));
    else runs.push(...sub);
  }
  return runs.length ? runs : [new TextRun({ text: '', font: FONT, ...base })];
}

function styleRuns(text, base, isLink) {
  const out = [];
  // **bold** 와 `code` 를 토큰으로 쪼갬
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  const push = (t, extra) => {
    if (!t) return;
    out.push(new TextRun({
      text: t, font: extra.mono ? 'Consolas' : FONT, size: 20,
      bold: extra.bold || base.bold, color: isLink ? '1155CC' : (extra.color || base.color),
      underline: isLink ? {} : undefined,
      shading: extra.mono ? { type: ShadingType.CLEAR, fill: 'F2F2F2' } : undefined,
    }));
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index), {});
    const tok = m[0];
    if (tok.startsWith('**')) push(tok.slice(2, -2), { bold: true });
    else push(tok.slice(1, -1), { mono: true });
    last = m.index + tok.length;
  }
  push(text.slice(last), {});
  return out;
}

// ---------- 표 ----------
function isTableSep(l) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && l.includes('-'); }
function splitRow(l) {
  return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function buildTable(header, rows) {
  const n = header.length;
  const colW = Math.floor(CONTENT_W / n);
  const widths = Array(n).fill(colW);
  widths[n - 1] = CONTENT_W - colW * (n - 1);

  const cell = (txt, opts) => new TableCell({
    width: { size: widths[opts.i], type: WidthType.DXA },
    shading: opts.head ? { type: ShadingType.CLEAR, fill: 'E8F3F1' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: inline(txt, opts.head ? { bold: true } : {}),
    })],
  });

  const trs = [new TableRow({
    tableHeader: true,
    children: header.map((h, i) => cell(h, { head: true, i })),
  })];
  for (const r of rows) {
    const cells = [];
    for (let i = 0; i < n; i++) cells.push(cell(r[i] ?? '', { head: false, i }));
    trs.push(new TableRow({ children: cells }));
  }

  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows: trs,
    borders: ['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].reduce((a, k) => {
      a[k] = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
      return a;
    }, {}),
  });
}

// ---------- 본문 조립 ----------
const children = [];
let i = 0;

while (i < md.length) {
  const line = md[i];

  // 코드블록
  if (/^\s*```/.test(line)) {
    i++;
    const buf = [];
    while (i < md.length && !/^\s*```/.test(md[i])) { buf.push(md[i]); i++; }
    i++;
    for (const b of buf) {
      children.push(new Paragraph({
        spacing: { before: 0, after: 0 },
        shading: { type: ShadingType.CLEAR, fill: 'F7F7F7' },
        children: [new TextRun({ text: b || ' ', font: 'Consolas', size: 18 })],
      }));
    }
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    continue;
  }

  // 표
  if (line.includes('|') && i + 1 < md.length && isTableSep(md[i + 1])) {
    const header = splitRow(line);
    i += 2;
    const rows = [];
    while (i < md.length && md[i].includes('|') && md[i].trim() !== '') {
      rows.push(splitRow(md[i])); i++;
    }
    children.push(buildTable(header, rows));
    children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
    continue;
  }

  // 수평선
  if (/^\s*---\s*$/.test(line)) {
    children.push(new Paragraph({
      spacing: { before: 160, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } },
      children: [],
    }));
    i++; continue;
  }

  // 제목
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const lvl = h[1].length;
    const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    const size = { 1: 34, 2: 27, 3: 23, 4: 21 }[lvl];
    children.push(new Paragraph({
      heading: map[lvl],
      spacing: { before: lvl === 1 ? 0 : 280, after: 140 },
      children: [new TextRun({ text: h[2].replace(/\*\*/g, ''), font: FONT, size, bold: true, color: lvl <= 2 ? '0F766E' : '1F2937' })],
    }));
    i++; continue;
  }

  // 인용(>)
  if (/^\s*>/.test(line)) {
    const txt = line.replace(/^\s*>\s?/, '');
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      indent: { left: 240 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: '0F766E', space: 8 } },
      children: inline(txt),
    }));
    i++; continue;
  }

  // 목록 (체크박스 포함)
  const li = line.match(/^(\s*)[-*]\s+(.*)$/);
  if (li) {
    const depth = Math.min(Math.floor(li[1].length / 2), 2);
    let txt = li[2];
    let prefix = '';
    const cb = txt.match(/^\[( |x|X)\]\s*(.*)$/);
    if (cb) { prefix = cb[1].trim() ? '☑ ' : '☐ '; txt = cb[2]; }
    children.push(new Paragraph({
      numbering: { reference: 'bullets', level: depth },
      spacing: { before: 30, after: 30 },
      children: [...(prefix ? [new TextRun({ text: prefix, font: FONT, size: 20 })] : []), ...inline(txt)],
    }));
    i++; continue;
  }

  // 번호 목록
  const ol = line.match(/^(\s*)\d+\.\s+(.*)$/);
  if (ol) {
    children.push(new Paragraph({
      numbering: { reference: 'numbers', level: Math.min(Math.floor(ol[1].length / 2), 2) },
      spacing: { before: 30, after: 30 },
      children: inline(ol[2]),
    }));
    i++; continue;
  }

  // 빈 줄
  if (line.trim() === '') {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    i++; continue;
  }

  // 일반 문단
  children.push(new Paragraph({
    spacing: { before: 40, after: 40, line: 300 },
    children: inline(line),
  }));
  i++;
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [0, 1, 2].map((l) => ({
          level: l, format: LevelFormat.BULLET, text: ['•', '◦', '▪'][l],
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340 + l * 300, hanging: 220 } } },
        })),
      },
      {
        reference: 'numbers',
        levels: [0, 1, 2].map((l) => ({
          level: l, format: LevelFormat.DECIMAL, text: `%${l + 1}.`,
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340 + l * 300, hanging: 220 } } },
        })),
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: FONT, size: 20 } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: 16838, orientation: PageOrientation.PORTRAIT },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log('OK', OUT, buf.length, 'bytes');
});
