/**
 * 워드 표 → HTML 변환의 시험.
 *
 * 🛑 이 파일이 만든 HTML 은 화면에 dangerouslySetInnerHTML 로 꽂힌다. 값의 출처는 환자가 낸
 * 서류(AI 판독)라 «사용자 입력»이다. 그래서 XSS 시험이 이 파일의 존재 이유다 —
 * check-content-consistency 의 XSS 기준선에 「안전함을 감사했다」고 적어 둔 근거가 여기다.
 */
import { describe, it, expect } from "vitest";
import { docxTableToHtml } from "./docxTableToHtml";

/** 표 한 칸짜리 최소 문서. cell 에 넣은 글자가 그대로 칸 안에 들어간다. */
const doc = (cellText: string) =>
  `<w:document><w:body><w:tbl><w:tblGrid><w:gridCol w:w="1000"/></w:tblGrid>` +
  `<w:tr><w:tc><w:tcPr/><w:p><w:r><w:t>${cellText}</w:t></w:r></w:p></w:tc></w:tr>` +
  `</w:tbl></w:body></w:document>`;

describe("docxTableToHtml — 표 구조", () => {
  it("표·행·칸이 그대로 나온다", () => {
    const { table } = docxTableToHtml(doc("환자 성명"));
    expect(table).toContain("<table class=\"docx\">");
    expect(table).toContain("<td>환자 성명</td>");
  });

  it("표가 없으면 빈 결과", () => {
    expect(docxTableToHtml("<w:document><w:body/></w:document>").table).toBe("");
  });

  it("가로 병합(gridSpan)은 colspan 으로", () => {
    const xml = `<w:document><w:body><w:tbl><w:tr><w:tc><w:tcPr><w:gridSpan w:val="3"/></w:tcPr>` +
      `<w:p><w:r><w:t>합친 칸</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`;
    expect(docxTableToHtml(xml).table).toContain('colspan="3"');
  });

  it("세로 병합(vMerge)은 아래 칸을 삼켜 rowspan 이 된다", () => {
    const xml = `<w:document><w:body><w:tbl>` +
      `<w:tr><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr><w:p><w:r><w:t>환자 정보</w:t></w:r></w:p></w:tc></w:tr>` +
      `<w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc></w:tr>` +
      `</w:tbl></w:body></w:document>`;
    const { table } = docxTableToHtml(xml);
    expect(table).toContain('rowspan="2"');
    // 이어지는 칸은 «만들지 않는다» — 만들면 표가 한 칸씩 밀린다.
    expect((table.match(/<td/g) || []).length).toBe(1);
  });
});

describe("🛑 XSS — 값에 태그가 들어와도 글자로만 나온다", () => {
  it("<script> 는 실행 태그로 안 나간다", () => {
    // 워드가 저장할 때는 이미 이스케이프된 모습이다(referral-docx 의 xmlText 가 그렇게 넣는다).
    const { table } = docxTableToHtml(doc("&lt;script&gt;alert(1)&lt;/script&gt;"));
    expect(table).not.toContain("<script");
    expect(table).toContain("&lt;script&gt;");
  });

  it("XML 에 날것의 태그가 섞여 들어와도 통과시키지 않는다", () => {
    const { table } = docxTableToHtml(doc("<img src=x onerror=alert(1)>"));
    // ⚠️ 판정 기준은 «태그로 해석되는가»다. `onerror=alert` 라는 «글자»가 남는 것은 정상이고
    //    막을 이유도 없다(사람이 그 글을 쓸 수 있다). 위험한 건 여는 꺾쇠가 살아 있는 것뿐이다.
    //    처음엔 문자열이 없는지로 쟀다가 이 시험이 빨간불을 냈다 — 시험 쪽이 틀렸다(2026-09-04).
    expect(table).not.toContain("<img");
    expect(table).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("따옴표로 속성을 깨고 나올 수 없다", () => {
    const { table } = docxTableToHtml(doc('" onmouseover="alert(1)'));
    expect(table).not.toContain('onmouseover="alert');
    expect(table).toContain("&quot;");
  });

  it("제목(표 밖 문단)도 값이 그대로 새지 않는다", () => {
    const xml = `<w:document><w:body><w:p><w:r><w:t>&lt;b&gt;굵게&lt;/b&gt;</w:t></w:r></w:p>` +
      `<w:tbl><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl></w:body></w:document>`;
    // 제목은 React 가 글자로 렌더한다(화면이 {preview.heading} 로 꽂는다) — 여기서는 «태그가
    // 풀린 원문»이 나오는 것이 정상이고, 화면에서 React 가 다시 막는다.
    expect(docxTableToHtml(xml).heading).toBe("<b>굵게</b>");
  });
});

describe("이중 이스케이프 방지", () => {
  it("원본의 &amp; 는 화면에서 & 한 글자로 보인다", () => {
    const { table } = docxTableToHtml(doc("A &amp; B"));
    expect(table).toContain("A &amp; B");     // HTML 로는 &amp; = 화면엔 &
    expect(table).not.toContain("&amp;amp;");
  });
});
