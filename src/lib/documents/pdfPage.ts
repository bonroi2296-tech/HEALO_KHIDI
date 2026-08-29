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

// ── AI 에게 읽힐 때 쓰는 «가볍게 다시 그리기» ────────────────────────────────
// 왜 (2026-08-14, PO 실사용 서류 130.9MB):
//   그 서류는 20쪽짜리 «순수 스캔»이었다 — 글자 데이터 0자, 쪽당 6.5MB.
//   원본 그대로는 AI 요청 한 장(20MB)에 절대 안 들어간다.
//   🛑 쪽마다 따로 물어보는 길(쪼개기)은 택하지 않았다 — 20번 부르고 비용도 20배인데
//      AI 가 앞뒤 쪽을 못 봐서 정확도는 오히려 떨어진다.
//   대신 «해상도만 낮춰» 한 번에 던진다. 글자를 읽는 데 쪽당 6.5MB 는 필요 없다.
//   실측: 130.9MB → 6.4MB(4.0초) → AI 8.3초에 진단명·병기·수술기록까지 전부 읽어냄.
const AI_JPEG_QUALITY = 72;
const AI_MAX_PAGES = 40;              // 쪽이 아주 많은 서류에서 요청이 터지지 않게
const AI_MAX_BYTES = 12 * 1024 * 1024; // 보낼 그림 총합 상한(요청 20MB 안에 여유 두고)

export type AiPageImage = { mime: string; b64: string };

/**
 * 큰 서류를 «AI 가 읽을 만한 크기»의 쪽 그림들로 다시 그린다.
 * @returns null 이면 못 그렸다(부품 없음·깨진 파일 등) — 부르는 쪽이 「못 읽음」으로 처리한다.
 */
export async function renderForAi(
  buf: Buffer,
  mime: string
): Promise<{ pages: AiPageImage[]; total: number; read: number } | null> {
  try {
    const mupdf: any = await import("mupdf");
    const doc = mupdf.Document.openDocument(buf, mime);
    const total = doc.countPages();
    if (total < 1) return null;

    const pages: AiPageImage[] = [];
    let bytes = 0;
    for (let i = 0; i < Math.min(total, AI_MAX_PAGES); i++) {
      const p = doc.loadPage(i);
      const b = p.getBounds();
      const scale = Math.min(MAX_SIDE_PX / Math.max(b[2] - b[0], b[3] - b[1]), 3);
      const pix = p.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
      const jpeg = Buffer.from(pix.asJPEG(AI_JPEG_QUALITY, false));
      pix.destroy();
      // 상한을 넘기 «전»에 멈춘다 — 넘고 나서 자르면 이미 보낸 요청이 터진다.
      if (bytes + jpeg.length > AI_MAX_BYTES) break;
      bytes += jpeg.length;
      pages.push({ mime: "image/jpeg", b64: jpeg.toString("base64") });
    }
    if (!pages.length) return null;
    return { pages, total, read: pages.length };
  } catch (e) {
    console.error("[pdfPage] renderForAi failed:", e);
    return null;
  }
}
