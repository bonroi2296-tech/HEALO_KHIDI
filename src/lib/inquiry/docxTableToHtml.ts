/**
 * 워드 양식(docx) 안의 표를 «그 구조 그대로» HTML 로 옮긴다.
 *
 * 왜 (2026-09-04 PO): 「니가 대충 만든 양식 말고 실제 각 병원 양식 그대로에다가 텍스트
 *   붙여줄 수 없냐. 지금 좀 이상해, 얼기설기 비슷한데 좀 다르잖아」
 *   화면 표를 우리가 새로 그리고 있었다. 칸 순서·병합·인쇄된 안내 문구가 원본과 조금씩
 *   어긋나서, 코디가 화면에서 본 것과 병원에 나가는 파일이 다르게 보였다.
 *   이제 «원본 파일을 채운 결과»를 그대로 그린다 — 화면과 파일이 같아진다.
 *
 * 무엇을 옮기나: 표의 행·칸·가로병합(gridSpan)·세로병합(vMerge)·열 너비(tblGrid)·
 *   칸 배경(shd)·문단 줄바꿈. 글꼴과 글자 크기는 옮기지 않는다(화면은 화면 글꼴로 읽는다).
 *
 * 🛑 여기서 만드는 HTML 은 화면에 그대로 꽂힌다. 글자는 «전부» escapeHtml 을 거쳐야 한다.
 *    태그는 이 파일이 만드는 것만 나가고, 원본 XML 의 태그는 한 개도 통과시키지 않는다.
 */

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** 문단 하나의 글자를 모은다. 워드의 줄바꿈(<w:br/>)과 탭도 살린다. */
function paraText(pXml: string): string {
  let out = "";
  for (const m of pXml.matchAll(/<w:(t|br|tab)\b([^>]*)(?:\/>|>([\s\S]*?)<\/w:\1>)/g)) {
    if (m[1] === "t") out += m[3] ?? "";
    else if (m[1] === "br") out += "\n";
    else out += "\t";
  }
  return out;
}

/** 칸 하나의 글자 — 문단 사이는 줄바꿈이다. */
function cellHtml(tcXml: string): string {
  const body = tcXml.replace(/^[\s\S]*?<\/w:tcPr>/, "");   // 칸 설정에는 글자가 없다
  const paras = [...body.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>|<w:p\b[^>]*\/>/g)].map((m) => paraText(m[0]));
  const text = paras.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";
  return esc(text).replace(/\n/g, "<br>").replace(/\t/g, "&#9;");
}

type Cell = { html: string; colspan: number; rowspan: number; shaded: boolean; col: number };

/**
 * document.xml 을 받아 첫 표를 HTML 로 돌려준다.
 * 표 바깥의 문단은 제목으로 따로 준다(이화의료원 양식은 표 위에 제목이 있다).
 */
export function docxTableToHtml(documentXml: string): { heading: string; table: string } {
  const tblMatch = /<w:tbl>[\s\S]*?<\/w:tbl>/.exec(documentXml);
  if (!tblMatch) return { heading: "", table: "" };
  const tbl = tblMatch[0];

  // 표 바깥 문단 = 제목
  const outside = documentXml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, "");
  const heading = [...outside.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)]
    .map((m) => paraText(m[0]).trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // 열 너비 — 원본 비율 그대로 쓴다. 이게 있어야 라벨 칸 폭이 원본과 같아진다.
  const grid = [...tbl.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g)].map((m) => Number(m[1]));
  const gridSum = grid.reduce((a, b) => a + b, 0);
  const colgroup = gridSum
    ? `<colgroup>${grid.map((w) => `<col style="width:${((w / gridSum) * 100).toFixed(2)}%">`).join("")}</colgroup>`
    : "";

  const rowsXml = [...tbl.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  const rows: Cell[][] = [];
  // 세로로 합쳐진 칸을 이어 붙이려면 «그 열에서 위쪽 어느 칸이 시작이었는지»를 들고 있어야 한다.
  const vOpen = new Map<number, Cell>();

  for (const trXml of rowsXml) {
    const row: Cell[] = [];
    let col = 0;
    for (const tcM of trXml.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)) {
      const tc = tcM[0];
      const pr = /<w:tcPr>[\s\S]*?<\/w:tcPr>/.exec(tc)?.[0] || "";
      const colspan = Number(/<w:gridSpan\b[^>]*w:val="(\d+)"/.exec(pr)?.[1] || 1) || 1;
      const vMergeTag = /<w:vMerge\b([^>]*)\/>|<w:vMerge\b([^>]*)>/.exec(pr);
      const vAttrs = vMergeTag ? `${vMergeTag[1] || ""}${vMergeTag[2] || ""}` : null;
      const isContinue = vAttrs !== null && !/w:val="restart"/.test(vAttrs);

      if (isContinue) {
        // 위 칸에 붙는다 — 이 행에는 칸을 만들지 않고 위 칸의 높이만 늘린다.
        const owner = vOpen.get(col);
        if (owner) owner.rowspan += 1;
        col += colspan;
        continue;
      }

      const cell: Cell = {
        html: cellHtml(tc),
        colspan,
        rowspan: 1,
        shaded: /<w:shd\b[^>]*w:fill="(?!auto|FFFFFF)/i.test(pr),
        col,
      };
      if (vAttrs !== null) vOpen.set(col, cell);   // restart — 아래 행이 여기에 붙는다
      else vOpen.delete(col);
      row.push(cell);
      col += colspan;
    }
    rows.push(row);
  }

  const trs = rows
    .filter((r) => r.length)
    .map((r) => {
      const tds = r
        .map((c) => {
          const attrs = [
            c.colspan > 1 ? ` colspan="${c.colspan}"` : "",
            c.rowspan > 1 ? ` rowspan="${c.rowspan}"` : "",
            c.shaded ? ' class="sh"' : "",
          ].join("");
          return `<td${attrs}>${c.html || "&nbsp;"}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return { heading, table: `<table class="docx">${colgroup}<tbody>${trs}</tbody></table>` };
}
