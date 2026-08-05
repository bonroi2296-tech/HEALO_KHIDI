/**
 * healwith: 환자가 «자기 진행상황 링크에서» 추가 내용·자료를 보낸다 (계정 없이)
 *
 * POST { token, text }                          → 추가 정보(글) 붙이기
 * POST { token, phase:"sign"|"commit", ... }    → 자료 올리기(브라우저 → 저장소 직행)
 *
 * 왜 (2026-08-05 PO): *"텍스트 문의 했던 내용을 여기서 사용자가 입력할 수 있게 해두고 그걸
 *   코디가 확인해서 의료진에 전달하는 흐름으로 가면 좋겠는데? 그리고 추가 서류도 올릴 수 있게"*
 *   지금까지 환자가 뭔가를 더 보내려면 왓츠앱으로 코디에게 보내고 코디가 손으로 옮겨 적었다.
 *
 * 흐름을 새로 만들지 않는다 — **이미 있는 두 곳에 그대로 붙인다**:
 *   · 글  → `inquiries.follow_ups` (코디 화면 「추가 정보」 → 소견 화면 → 케이스 브리프로 흐른다)
 *   · 자료 → `inquiries.attachments` (코디 화면 「첨부」)
 *   그래서 코디가 새로 볼 화면이 없다. 늘 보던 자리에 «환자가 보냄» 표시로 뜬다.
 *
 * ⚠️ 이 주소는 **공개 링크로 들어오는 쓰기**다(이 화면 최초). 그래서:
 *   ①토큰이 진짜 문의인지 확인 ②횟수 제한(도배 차단) ③글자·개수·용량 상한
 *   ④파일은 기존 검증 그대로(형식·크기 + 앞부분을 읽어 위장 검사)
 *   글은 저장할 때 암호화된다(followUps 헬퍼가 한다) — 환자 건강정보라서.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { appendFollowUp, FOLLOWUP_MAX_LEN } from "@/lib/inquiry/followUps";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 도배 차단 — 사람이 글을 쓰거나 파일을 고르는 속도로는 절대 안 걸린다.
const RATE = { windowMs: 60 * 1000, maxRequests: 10, apiName: "claim_submit" };

const BUCKET = "attachments";
const MAX_SIZE = 200 * 1024 * 1024;
const MAX_ATTACHMENTS = 30; // 환자 본인 + 코디 대리분 + 여기서 추가되는 몫
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", "application/x-zip-compressed",
  "application/vnd.rar", "application/x-rar-compressed",
  "application/dicom",
];

/** 「누가 보냈나」 표시 — 코디가 목록에서 한눈에 가른다. */
const BY_PATIENT = "환자(진행상황 링크)";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const body = await request.json();
    const token = String(body?.token || "");
    if (!UUID_RE.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const { data: rows, error: findErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, follow_ups, attachments")
      .eq("public_token", token)
      .limit(1);
    if (findErr) throw findErr;
    const inq = rows?.[0];
    if (!inq) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    // ── 자료 올리기 ──
    if (body.phase === "sign" || body.phase === "commit") {
      const dir = `inquiry/${inq.id}/patient`;

      if (body.phase === "sign") {
        const signed = await issueUploadUrl(body, {
          bucket: BUCKET,
          dir,
          allowed: ALLOWED_TYPES,
          maxBytes: MAX_SIZE,
        });
        if (!signed.ok) {
          return Response.json({ ok: false, error: signed.error, detail: signed.detail }, { status: signed.status });
        }
        return Response.json({
          ok: true,
          signedUrl: signed.signedUrl,
          path: signed.path,
          name: signed.name,
          type: signed.type,
        });
      }

      const path = String(body.path || "");
      if (!isOwnPath(dir, path)) {
        return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
      }
      const type = normalizeMime(path, String(body.type || ""));
      const verified = await verifyUploaded(BUCKET, path, type, MAX_SIZE);
      if (!verified.ok) return Response.json({ ok: false, error: verified.error }, { status: 400 });

      const existing = Array.isArray(inq.attachments) ? inq.attachments : [];
      if (existing.length >= MAX_ATTACHMENTS) {
        await supabaseAdmin.storage.from(BUCKET).remove([path]);
        return Response.json({ ok: false, error: "too_many_files" }, { status: 400 });
      }

      const entry = {
        path,
        name: String(body.name || path.split("/").pop() || "file").slice(0, 300),
        type,
        category: "other",
        // 코디가 대신 올린 것(uploaded_by_staff)과 구분 — 누가 낸 자료인지가 흐려지면 안 된다.
        uploaded_by_patient: true,
      };
      const { error: writeErr } = await (supabaseAdmin as any)
        .from("inquiries")
        .update({ attachments: [...existing, entry] })
        .eq("id", inq.id);
      if (writeErr) {
        await supabaseAdmin.storage.from(BUCKET).remove([path]);
        return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
      }
      return Response.json({ ok: true, attachment: { name: entry.name } });
    }

    // ── 추가 내용(글) ──
    const text = String(body?.text || "").trim().slice(0, FOLLOWUP_MAX_LEN);
    if (!text) return Response.json({ ok: false, error: "text_required" }, { status: 400 });

    const next = appendFollowUp(inq.follow_ups, text, BY_PATIENT);
    const { error: upErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .update({ follow_ups: next })
      .eq("id", inq.id);
    if (upErr) throw upErr;

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[inquiries/claim/submit]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
