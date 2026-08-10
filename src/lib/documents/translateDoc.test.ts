/**
 * Word(.docx) 첨부 번역 — 글자·표를 실제로 뽑아내는지, 자를 때 표가 안 쪼개지는지.
 * (모델 호출은 안 한다 — 모델에 «무엇을 넘기는가»만 검사한다.)
 */
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { chunkHtmlBlocks, docxToHtml, inferMimeFromName } from "./translateDoc";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** 최소 구성의 .docx 한 개 만들기(문단 1 + 1x2 표). */
async function makeDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`
  );
  const p = (t: string) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
      p("История болезни") +
      `<w:tbl><w:tr><w:tc>${p("Гемоглобин")}</w:tc><w:tc>${p("141 г/л")}</w:tc></w:tr></w:tbl>` +
      `</w:body></w:document>`
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("docx 번역 입력", () => {
  it(".docx 확장자를 번역 가능한 형식으로 인식한다", () => {
    expect(inferMimeFromName("История болезни.docx")).toBe(DOCX_MIME);
    expect(inferMimeFromName("옛날파일.doc")).toBe(null); // 옛 .doc 은 여전히 미지원
  });

  it("문단과 표를 함께 뽑아낸다(수치는 그대로)", async () => {
    const html = await docxToHtml(await makeDocx());
    expect(html).toContain("История болезни");
    expect(html).toContain("<table>");
    expect(html).toContain("Гемоглобин");
    expect(html).toContain("141 г/л");
  });

  it("자를 때 표를 중간에서 쪼개지 않는다", () => {
    const html = "<p>머리말</p><table><tr><td>가</td></tr></table><p>꼬리말</p>";
    const parts = chunkHtmlBlocks(html, 20); // 일부러 아주 작게 잘라본다
    expect(parts.join("")).toBe(html); // 한 글자도 안 잃는다
    for (const part of parts) {
      const open = (part.match(/<table>/g) || []).length;
      const close = (part.match(/<\/table>/g) || []).length;
      expect(open).toBe(close); // 표가 반쪽으로 갈리지 않았다
    }
  });
});
