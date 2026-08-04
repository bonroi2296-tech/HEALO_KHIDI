/**
 * PDF 한 쪽을 «사진»으로 그려 준다 (서버 전용).
 *
 * 왜 (2026-08-04 PO 제보 «아직도 pdf 미리보기 안 되는데?» — 로컬에서도 안 보였다):
 *   미리보기를 브라우저 내장 PDF 뷰어(<iframe>)에 맡겼는데, 그건 **환경을 너무 탄다** —
 *   PDF 플러그인이 꺼져 있거나, 차단 프로그램이 끼어들거나, 폰(iOS·안드로이드)이면
 *   아예 하얀 화면이다. 원장님이 폰으로 링크를 여는 일이 흔한데 그때 100% 안 보인다.
 *   재현·원인 추적보다 **의존 자체를 없애는 게 맞다** — 우리 서버가 그려서 사진으로 준다.
 *   사진은 어디서든 뜬다.
 *
 * 원본은 안 건드린다. 큰 스캔 PDF 는 이미 만들어 둔 가벼운 사본(`<원본>.ai.pdf`)에서
 *   그린다 — 130MB 를 매번 내려받으면 한 쪽 보는 데 몇 초씩 걸린다.
 */
import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const MAX_SIDE_PX = 1600; // 화면에서 잔글씨가 읽히는 선(실측). 더 키우면 느려지기만 한다.
const JPEG_QUALITY = 80;
const MAX_PAGES = 300;

export type PdfPageResult =
  | { ok: true; pages: number; image?: Buffer }
  | { ok: false; error: "not_found" | "not_pdf" | "render_failed" };

/** 큰 원본이면 가벼운 사본을 쓴다. 사본이 없으면 원본 그대로. */
async function loadSource(bucket: string, path: string): Promise<Buffer | null> {
  const dl = async (p: string) => {
    const { data } = await supabaseAdmin.storage.from(bucket).download(p);
    return data ? Buffer.from(await data.arrayBuffer()) : null;
  };
  return (await dl(`${path}.ai.pdf`)) || (await dl(path));
}

/**
 * @param page 0-부터. 없으면 쪽 수만 센다(창을 열 때 한 번).
 */
export async function renderPdfPage(
  bucket: string,
  path: string,
  page?: number
): Promise<PdfPageResult> {
  if (!/\.pdf$/i.test(path)) return { ok: false, error: "not_pdf" };
  const buf = await loadSource(bucket, path);
  if (!buf) return { ok: false, error: "not_found" };

  try {
    const mupdf: any = await import("mupdf");
    const doc = mupdf.Document.openDocument(buf, "application/pdf");
    const pages = doc.countPages();
    if (pages < 1 || pages > MAX_PAGES) return { ok: false, error: "render_failed" };
    if (page === undefined) return { ok: true, pages };

    const i = Math.min(Math.max(0, page), pages - 1);
    const p = doc.loadPage(i);
    const b = p.getBounds();
    const scale = Math.min(MAX_SIDE_PX / Math.max(b[2] - b[0], b[3] - b[1]), 3);
    const pix = p.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
    const jpeg = Buffer.from(pix.asJPEG(JPEG_QUALITY, false));
    pix.destroy();
    return { ok: true, pages, image: jpeg };
  } catch (e) {
    console.error("[pdfPage] render failed:", e);
    return { ok: false, error: "render_failed" };
  }
}
