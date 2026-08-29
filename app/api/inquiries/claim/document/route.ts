/**
 * healwith: 환자가 받은 서류를 «화면에서 바로 보게» 하는 창구 (계정 없이, 공개 링크 토큰)
 *
 * GET ?token=<진행상황토큰>&docId=<서류>            → PDF 면 { kind:"pdf", pages }
 *                                                     워드면 { kind:"html", html }
 * GET ?token=…&docId=…&p=2                          → PDF 한 쪽을 JPEG 사진으로
 *
 * 왜 (2026-08-05 PO: *"미리보기랑 다운로드 둘 다"*, *"docx 로 주면 pdf 로 변환해서 상대방이
 *   볼 수 있게"*): 환자는 폰으로 링크를 연다. 워드는 앱이 없으면 안 열리고, PDF 도 브라우저
 *   내장 뷰어가 하얗게 뜨는 일이 잦다(2026-08-04 실제 사고). 그래서 **서버가 그려서 보여준다** —
 *   PDF 는 한 쪽씩 사진으로, 워드는 글로 풀어서. 내려받기는 그대로 두고(원본 파일) 두 길을 다 준다.
 *
 * ⚠️ 서버에서 워드를 PDF 파일로 «변환»하지는 않는다 — 그러려면 오피스 엔진이 서버에 있어야 하는데
 *    우리 서버엔 못 올린다. 대신 화면에 그린 뒤 「인쇄 · PDF 로 저장」을 브라우저에 맡긴다.
 *    자세한 근거는 src/lib/documents/docxHtml.ts 머리말.
 *
 * 보안: ①토큰이 진짜 문의인가 ②그 문의의 서류인가 ③**코디가 「환자에게 보이기」를 켰는가**
 *       ④횟수 제한. 셋 중 하나라도 아니면 없는 것처럼 404.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { renderPdfPage } from "@/lib/documents/pdfPage";
import { docxToHtml } from "@/lib/documents/docxHtml";

const BUCKET = "attachments";
const RATE = { windowMs: 60_000, maxRequests: 120, apiName: "claim_document" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DOCX_BYTES = 10 * 1024 * 1024; // 워드는 글만 뽑으므로 이보다 클 일이 없다

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    const docId = url.searchParams.get("docId") || "";
    const pRaw = url.searchParams.get("p");

    if (!UUID_RE.test(token) || !UUID_RE.test(docId)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    // 조회 오류를 «없음»으로 삼키지 않는다 — 오류면 404 가 아니라 500 이어야 원인이 드러난다
    // (POSTMORTEMS #105: maybeSingle 의 error 를 안 보면 에러가 "없음"으로 둔갑한다).
    const { data: inqRows, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id")
      .eq("public_token", token)
      .limit(1);
    if (inqErr) throw inqErr;
    const inq = inqRows?.[0];
    if (!inq) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    // 「환자에게 보이기」가 켜진 것만. 이 한 줄이 서류함의 안전장치다.
    const { data: docRows, error: docErr } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .select("file_name, storage_path, mime, size_bytes")
      .eq("id", docId)
      .eq("inquiry_id", inq.id)
      .eq("visible_to_patient", true)
      .limit(1);
    if (docErr) throw docErr;
    const doc = docRows?.[0];
    if (!doc) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    const name = String(doc.file_name || "");

    // ── PDF: 한 쪽씩 사진으로 ──
    if (/\.pdf$/i.test(name) || doc.mime === "application/pdf") {
      const page = pRaw === null ? undefined : Math.max(0, Number(pRaw) || 0);
      const res = await renderPdfPage(BUCKET, String(doc.storage_path), page);
      if (!res.ok) return Response.json({ ok: false, error: "preview_failed" }, { status: 404 });
      if (res.image) {
        return new Response(new Uint8Array(res.image), {
          headers: {
            "Content-Type": "image/jpeg",
            // 같은 쪽을 다시 볼 때 또 그리지 않게. 주소에 서류 id 가 있으니 섞일 일은 없다.
            "Cache-Control": "private, max-age=600",
          },
        });
      }
      return Response.json({ ok: true, kind: "pdf", pages: res.pages, name });
    }

    // ── 워드: 글로 풀어서 ──
    if (/\.docx$/i.test(name)) {
      if (Number(doc.size_bytes) > MAX_DOCX_BYTES) {
        return Response.json({ ok: false, error: "too_large" }, { status: 413 });
      }
      const { data: file } = await supabaseAdmin.storage.from(BUCKET).download(String(doc.storage_path));
      if (!file) return Response.json({ ok: false, error: "preview_failed" }, { status: 404 });
      const out = await docxToHtml(Buffer.from(await file.arrayBuffer()), name);
      if (!out.ok) return Response.json({ ok: false, error: "preview_failed" }, { status: 415 });
      return Response.json({ ok: true, kind: "html", html: out.html, name });
    }

    // ── 사진: 그대로 보면 된다(서명 주소는 목록이 이미 내려줬다) ──
    if (/\.(jpe?g|png|webp)$/i.test(name)) {
      return Response.json({ ok: true, kind: "image", name });
    }

    // 옛 .doc 등 — 미리보기 없음. 화면은 「내려받기」만 보여준다.
    return Response.json({ ok: true, kind: "none", name });
  } catch (err: any) {
    console.error("[inquiries/claim/document]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
