/**
 * healwith: 환자가 «자기 진행상황 링크에서» 추가 내용·자료를 보낸다 (계정 없이)
 *
 * POST { token, text }                          → 추가 정보(글) 붙이기
 * POST { token, phase:"sign"|"commit", ... }    → 자료 올리기(브라우저 → 저장소 직행)
 * POST { token, remove:{kind,id} }              → 본인이 보낸 것 «지우기»(화면에서만 — 기록은 남는다)
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
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { appendFollowUp, FOLLOWUP_MAX_LEN, BY_PATIENT_LINK } from "@/lib/inquiry/followUps";
import { notifyStaffPatientMessage } from "@/lib/notifications/inApp";
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE);
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

    // ── 본인이 보낸 것 지우기 ──
    //
    // 왜 (2026-08-06 PO): *"사용자가 잘못 올릴 수도 있으니깐 사용자가 지울 수도 있게 해줘야겠다.
    //   근데 로그는 남기고 — 환자가 줬다가 지워서 안줬다고 할 수도 있잖아"*
    //
    // 그래서 **정말로 지우지 않는다.** 표시(`removed_at`)만 붙인다:
    //   · 환자 화면 → 안 보인다(잘못 올린 걸 치울 수 있다)
    //   · 코디 화면 → 「환자가 지움 · 날짜」로 보인다(냈던 사실은 남는다)
    //   · 저장소 파일도 안 지운다 — 뒤에 「이런 자료 준 적 없다」는 말이 나오면 원본이 있어야 한다
    //
    // 지울 수 있는 건 **본인이 이 화면에서 보낸 것뿐**이다. 코디가 넣은 기록·대신 올린 자료는
    // 이 링크를 가진 사람이 손댈 수 없다(링크는 왓츠앱으로 굴러다닐 수 있다).
    if (body.remove) {
      const kind = String(body.remove.kind || "");
      const id = String(body.remove.id || "");
      const now = new Date().toISOString();

      if (kind === "file") {
        const list: any[] = Array.isArray(inq.attachments) ? inq.attachments : [];
        const idx = list.findIndex((a) => String(a?.path || "") === id && a?.uploaded_by_patient === true);
        if (idx < 0) return Response.json({ ok: false, error: "not_yours" }, { status: 403 });
        if (list[idx].removed_at) return Response.json({ ok: true }); // 이미 지운 것 — 다시 눌러도 탈 없이
        const next = list.map((a, i) => (i === idx ? { ...a, removed_at: now } : a));
        const { error } = await (supabaseAdmin as any).from("inquiries").update({ attachments: next }).eq("id", inq.id);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      if (kind === "note") {
        const list: any[] = Array.isArray(inq.follow_ups) ? inq.follow_ups : [];
        const idx = list.findIndex((f) => String(f?.at || "") === id && f?.by === BY_PATIENT_LINK);
        if (idx < 0) return Response.json({ ok: false, error: "not_yours" }, { status: 403 });
        if (list[idx].removed_at) return Response.json({ ok: true });
        const next = list.map((f, i) => (i === idx ? { ...f, removed_at: now } : f));
        const { error } = await (supabaseAdmin as any).from("inquiries").update({ follow_ups: next }).eq("id", inq.id);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

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
      // 같은 commit 이 두 번 오면(브라우저 재전송 — 환자 문서 화면 2026-08-18 실사고와 같은 경로)
      // 두 번째는 붙이지 않고 «이미 있음»으로 답한다. 안 그러면 첨부가 두 줄로 보인다.
      // ponytail: 읽고-쓰기라 «첫 번째가 끝나기 전에» 두 번째가 오면 못 막는다(JSON 배열 칸의 한계).
      //   그 경우가 실제로 보이면 inquiries.attachments 를 DB 트리거(path 중복 제거)로 막는다.
      const dup = existing.find((a) => String(a?.path || "") === path);
      if (dup) return Response.json({ ok: true, attachment: { name: dup.name } });
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

    const next = appendFollowUp(inq.follow_ups, text, BY_PATIENT_LINK);
    const { error: upErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .update({ follow_ups: next })
      .eq("id", inq.id);
    if (upErr) throw upErr;

    // 환자가 말을 걸었다 — 코디·어드민에게 종 알림. 2026-09-05 까지 이 경로는 아무에게도 안 알렸다
    // (문의 #302: 글이 왔는데 열람 0·답 0 으로 이틀). 저장은 끝났으니 알림 실패가 응답을 막지 않게 한다.
    void notifyStaffPatientMessage({ inquiryId: Number(inq.id) });

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[inquiries/claim/submit]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
