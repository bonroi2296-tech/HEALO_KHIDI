/**
 * healwith: 환자가 «진행상황 링크에서» 재진 상담을 요청한다 (계정 없이) — 사후관리 ICT ⑥
 *
 * POST { token, note? } → followup_schedules 요청 행 + 케이스 「추가 정보」 태그 + 코디·관리자 종·메일
 *
 * 왜 (2026-09-06 PO 「한 번 누르면 코디에게 요청」): 병원 가용 일정은 시스템이 모르니 사람이 잡는다.
 *   환자 쪽은 한 번 누르면 요청이 닿아야 한다 — 왓츠앱으로 따로 연락하면 기록이 플랫폼 밖에 남는다.
 * 보안: claim/submit 과 같은 부류(토큰 검증·횟수 제한·글자 상한·깨진 인코딩 거부). 6시간 안 중복 요청은 새 행 없이 ok.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import { submitRebookingRequest, REBOOKING_NOTE_MAX } from "@/lib/followup/rebookingRequest";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE = { windowMs: 60 * 1000, maxRequests: 5, apiName: "claim_rebooking" };
const LANGS = new Set(["ko", "en", "ru", "kz", "zh", "ja"]);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }
  try {
    const body = await request.json();
    const token = String(body?.token || "");
    if (!UUID_RE.test(token)) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    if (hasMojibake(body)) return Response.json({ ok: false, error: "broken_encoding" }, { status: 400 });
    const note = String(body?.note || "").slice(0, REBOOKING_NOTE_MAX);
    const lang = LANGS.has(String(body?.language)) ? String(body.language) : "ru";

    const { data: rows, error: findErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, is_test, user_id, cancer_type, follow_ups")
      .eq("public_token", token)
      .limit(1);
    if (findErr) throw findErr;
    const inq = rows?.[0];
    if (!inq) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    const result = await submitRebookingRequest(supabaseAdmin as any, {
      inquiryId: Number(inq.id),
      patientUserId: inq.user_id || null,
      cancerType: inq.cancer_type || null,
      note,
      lang,
      followUps: inq.follow_ups,
      isTest: !!inq.is_test,
    });
    return Response.json({ ok: true, duplicate: result.duplicate });
  } catch (err: any) {
    console.error("[inquiries/claim/rebooking]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
