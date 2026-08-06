/**
 * 워드(.docx) → 화면에 그릴 수 있는 안전한 HTML (서버 전용).
 *
 * 왜 필요한가 (2026-08-05 PO: *"docx 로 주면 pdf 로 변환해서 상대방이 볼 수 있게 해줘"*):
 *   환자는 폰으로 링크를 연다. 워드 파일은 폰에서 앱이 없으면 안 열리거나 서식이 깨진다.
 *
 * ⚠️ 왜 «서버에서 PDF 로 변환»을 안 하나 — 못 한다. 워드를 PDF 로 정확히 바꾸려면
 *   리브레오피스(LibreOffice) 같은 오피스 엔진이 서버에 있어야 하는데 우리 서버(Vercel 함수)엔
 *   못 올린다(용량 한계). 헤드리스 브라우저를 얹는 길도 있지만 무겁고 키릴·한글 글꼴이 또 문제다.
 *   대신 **글로 풀어서 화면에 그리고, 「인쇄 · PDF 로 저장」을 브라우저에 맡긴다** — 결과물은
 *   같고(환자 손에 PDF 가 남는다), 글꼴 문제도 없다(그 사람 기기 글꼴로 그린다).
 *
 * 보안: mammoth 가 내는 태그는 종류가 적지만, 남이 만든 파일에서 나온 HTML 을 그대로 화면에
 *   꽂지 않는다. **허용 목록에 있는 태그만 남기고 속성은 전부 버린다**(표 병합만 남김).
 */
import "server-only";

import { sanitizeDocHtml } from "./sanitizeDocHtml";

export type DocxHtmlResult =
  | { ok: true; html: string }
  | { ok: false; error: "not_docx" | "convert_failed" };

export async function docxToHtml(buf: Buffer, fileName: string): Promise<DocxHtmlResult> {
  if (!/\.docx$/i.test(fileName)) return { ok: false, error: "not_docx" };
  try {
    const mammoth: any = await import("mammoth");
    // 그림은 뺀다 — 소견서·안내문엔 거의 없고, 있으면 base64 로 부풀어 응답이 몇 MB 가 된다.
    const out = await mammoth.convertToHtml(
      { buffer: buf },
      { convertImage: mammoth.images.imgElement(() => ({ src: "" })) }
    );
    const html = sanitizeDocHtml(String(out?.value || "")).trim();
    if (!html) return { ok: false, error: "convert_failed" };
    return { ok: true, html };
  } catch (err: any) {
    console.error("[docxToHtml]", err?.message);
    return { ok: false, error: "convert_failed" };
  }
}
