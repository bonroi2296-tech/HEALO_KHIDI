/*
 * 마크다운 → 한글 워드(.docx) 변환기 (제목·표·목록·굵게·인용·구분선, 맑은 고딕).
 *
 * 왜: coo/04-operations SOP·용어집을 대표원장님/한글(한컴오피스)용 문서로 뽑기 위함.
 *     한글은 .docx를 그대로 열고 "다른 이름으로 저장 → hwpx"로 1클릭 변환 가능.
 *     (kordoc은 파싱·양식fill 전용이라 자유문서 md→hwpx 생성 불가 — PROJECT_CONTEXT 핸드오프 참고.)
 *
 * 사용법:
 *   npm install --no-save docx@8            # docx는 package.json에 없음 — 임시 설치
 *   NODE_PATH=./node_modules node scripts/md2docx.cjs <input.md> <output.docx>
 *
 * 예: NODE_PATH=./node_modules node scripts/md2docx.cjs \
 *       coo/04-operations/PATIENT_JOURNEY_SOP.md coo/04-operations/실환자_운영_SOP_초안.docx
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, WidthType, BorderStyle, AlignmentType, ShadingType,
} = require('docx');

const SRC = process.argv[2];
const OUT = process.argv[3];
const FONT = '맑은 고딕';

const border = { style: BorderStyle.SINGLE, size: 2, color: 'BBBBBB' };
const cellBorders = { top: border, bottom: border, left: border, right: border };

// 인라인: **굵게**, `코드`, [텍스트](링크) 처리 → TextRun[]
function inline(text, base = {}) {
  // 링크 → 텍스트만
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // 코드 백틱 제거(텍스트 유지)
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('**') && p.endsWith('**')) {
      runs.push(new TextRun({ text: p.slice(2, -2).replace(/`/g, ''), bold: true, font: FONT, ...base }));
    } else {
      runs.push(new TextRun({ text: p.replace(/`/g, ''), font: FONT, ...base }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', font: FONT })];
}

const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const children = [];
let i = 0;

function isTableRow(l) { return /^\s*\|/.test(l); }

while (i < lines.length) {
  let line = lines[i];

  // 표 블록
  if (isTableRow(line)) {
    const block = [];
    while (i < lines.length && isTableRow(lines[i])) { block.push(lines[i]); i++; }
    const rows = block
      .map(r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()));
    // 구분선(---) 행 제거
    const dataRows = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c) || c === ''));
    const header = dataRows[0] || [];
    const body = dataRows.slice(1);
    const nCol = header.length;
    const mkCell = (txt, isHead) => new TableCell({
      borders: cellBorders,
      shading: isHead ? { type: ShadingType.CLEAR, fill: 'E8EEF4' } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({ children: inline(txt, isHead ? { bold: true } : {}), spacing: { after: 0 } })],
    });
    const trs = [];
    trs.push(new TableRow({ tableHeader: true, children: header.map(h => mkCell(h, true)) }));
    for (const r of body) {
      const cells = [];
      for (let c = 0; c < nCol; c++) cells.push(mkCell(r[c] || '', false));
      trs.push(new TableRow({ children: cells }));
    }
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: trs }));
    children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    continue;
  }

  // 제목
  let m;
  if ((m = line.match(/^#\s+(.*)/))) {
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 200 }, children: inline(m[1]) }));
    i++; continue;
  }
  if ((m = line.match(/^##\s+(.*)/))) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: inline(m[1]) }));
    i++; continue;
  }
  if ((m = line.match(/^###\s+(.*)/))) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: inline(m[1]) }));
    i++; continue;
  }
  // 구분선
  if (/^---+\s*$/.test(line)) {
    children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } }, spacing: { after: 120 } }));
    i++; continue;
  }
  // 인용구(>)
  if ((m = line.match(/^>\s?(.*)/))) {
    const txt = m[1];
    children.push(new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: 'F3F6F9' },
      spacing: { after: 40 }, indent: { left: 120 },
      children: inline(txt, { italics: false }),
    }));
    i++; continue;
  }
  // 목록(- 또는 숫자.)
  if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
    children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: inline(m[1]) }));
    i++; continue;
  }
  if ((m = line.match(/^\s*(\d+)\.\s+(.*)/))) {
    children.push(new Paragraph({ spacing: { after: 20 }, children: inline(m[1] + '. ' + m[2]) }));
    i++; continue;
  }
  // 빈 줄
  if (line.trim() === '') { children.push(new Paragraph({ text: '', spacing: { after: 40 } })); i++; continue; }
  // 일반 문단
  children.push(new Paragraph({ spacing: { after: 40 }, children: inline(line) }));
  i++;
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 20 } },
    },
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('wrote', OUT, buf.length, 'bytes'); });
