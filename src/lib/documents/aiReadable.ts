/**
 * AI 가 읽을 수 있는 형태로 문서를 준비한다 (서버 전용).
 *
 * 왜 필요한가 (2026-08-03, 문의 #60):
 *   환자가 올린 20쪽짜리 진료기록이 130.9MB 였다. 각 쪽이 통째로 PNG 스캔이라 그렇다.
 *   이걸 그대로 Gemini 에 넣으면 **요청 자체가 반려된다**(실측: 137MB → INVALID_ARGUMENT).
 *   그런데 브리프 만드는 쪽은 «18MB 넘으면 조용히 건너뛰기»라, 자료를 한 글자도 안 읽고
 *   «첨부 반영됨»으로 기록됐다. 그 브리프는 실제 상태(4기·다발전이 확진)보다 가볍게 적혀
 *   있었다 — 코디가 그걸 믿으면 위험하다.
 *
 * 어떻게 고치나: **읽기 직전에 줄인다.** 같은 파일을 JPEG 로 다시 담으면 눈으로 구별이 안 되는데
 *   130.9MB → 9.0MB (실측 6.9초, 20쪽). 그 9MB 는 Gemini 가 완벽히 읽는다(실측).
 *   원본은 절대 건드리지 않는다 — 의료 원본이라 화질을 깎아 덮어쓰면 안 된다.
 *   줄인 사본은 `<원본경로>.ai.pdf` 로 저장소에 남겨 다음부터 재사용한다(같은 문서를 두 번 안 간다).
 */
import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// Gemini inlineData 로 한 번에 넣을 수 있는 실질 상한. 이보다 크면 줄여야 한다.
export const AI_INLINE_LIMIT = 18 * 1024 * 1024;
// 줄인 결과가 이보다도 크면 포기한다(쪽수가 너무 많은 문서 등).
const GIVE_UP_OVER = AI_INLINE_LIMIT;
// 쪽수가 너무 많으면 시간·메모리가 감당이 안 된다.
const MAX_PAGES = 300;
const JPEG_QUALITY = 75;
const MAX_SIDE_PX = 2200; // A4 기준 ≈260dpi — 잔글씨도 읽힌다(실측 비교로 확인)

export type AiDocResult =
  | { ok: true; buffer: Buffer; mimeType: string; shrunk: boolean }
  | { ok: false; reason: "too_large" | "download_failed" | "unsupported" };

/** 원본 경로 → 줄인 사본 경로. 같은 버킷에 나란히 둔다. */
function shrunkPath(path: string): string {
  return `${path}.ai.pdf`;
}

/**
 * 저장소의 문서를 «AI 가 삼킬 수 있는» 버퍼로 돌려준다.
 * 작으면 원본 그대로, 크고 PDF 면 줄여서, 그래도 크면 실패 사유를 돌려준다.
 */
export async function getAiReadable(
  bucket: string,
  path: string,
  declaredMime: string
): Promise<AiDocResult> {
  const dl = async (p: string) => {
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(p);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  };

  const original = await dl(path);
  if (!original) return { ok: false, reason: "download_failed" };
  if (original.length <= AI_INLINE_LIMIT) {
    return { ok: true, buffer: original, mimeType: declaredMime, shrunk: false };
  }
  if (declaredMime !== "application/pdf") {
    // 이미지 한 장이 18MB 를 넘는 경우 — 흔치 않고, 줄이는 코드가 따로 필요해 지금은 안 한다.
    return { ok: false, reason: "too_large" };
  }

  // 전에 줄여둔 게 있으면 그걸 쓴다.
  const cached = await dl(shrunkPath(path));
  if (cached && cached.length <= GIVE_UP_OVER) {
    return { ok: true, buffer: cached, mimeType: "application/pdf", shrunk: true };
  }

  const small = await shrinkScannedPdf(original);
  if (!small || small.length > GIVE_UP_OVER) return { ok: false, reason: "too_large" };

  // 캐시 저장 실패는 치명적이지 않다(다음에 또 줄이면 된다) — 조용히 넘어간다.
  await supabaseAdmin.storage
    .from(bucket)
    .upload(shrunkPath(path), small, { contentType: "application/pdf", upsert: true })
    .catch(() => null);

  return { ok: true, buffer: small, mimeType: "application/pdf", shrunk: true };
}

/**
 * 스캔 PDF 를 각 쪽 JPEG 로 다시 담아 크기를 줄인다.
 * MuPDF(WASM) 사용 — 브라우저 pdf.js 로도 해봤지만 이 파일은 한 쪽 그리는 데 25초를 넘겨도
 * 안 끝났다(실측). 같은 작업이 서버 MuPDF 에서는 20쪽 6.9초에 끝난다.
 */
async function shrinkScannedPdf(buf: Buffer): Promise<Buffer | null> {
  try {
    const mupdf: any = await import("mupdf");
    const doc = mupdf.Document.openDocument(buf, "application/pdf");
    const pages = doc.countPages();
    if (pages < 1 || pages > MAX_PAGES) return null;

    const out = new mupdf.PDFDocument();
    for (let i = 0; i < pages; i++) {
      const page = doc.loadPage(i);
      const b = page.getBounds();
      const w = b[2] - b[0];
      const h = b[3] - b[1];
      const scale = Math.min(MAX_SIDE_PX / Math.max(w, h), 3);
      const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
      const img = out.addImage(new mupdf.Image(pix.asJPEG(JPEG_QUALITY, false)));
      const res = out.addObject({ XObject: { Im0: img } });
      // 종이 크기(pt)는 원본 그대로 두고 안에 든 화소만 줄인다 — 인쇄 크기가 안 바뀐다.
      const contents = Buffer.from(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
      out.insertPage(-1, out.addPage([0, 0, w, h], 0, res, contents));
      pix.destroy();
    }
    return Buffer.from(out.saveToBuffer("compress").asUint8Array());
  } catch (e) {
    console.error("[aiReadable] shrink failed:", e);
    return null;
  }
}
