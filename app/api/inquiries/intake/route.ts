/**
 * healwith: Step2 intake 저장 API (서버 전용)
 * inquiries.intake에 Step2 데이터 저장 (PII 없음)
 * public_token 검증 후 overwrite (MVP)
 * 
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * ✅ 운영 안정화: Rate limit + 운영 로그 추가
 * 
 * 이유:
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - 암호화 키 검증
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 * - 봇/도배 방지 및 운영 추적성 확보
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { encryptPiiInObject } from "@/lib/security/piiJson";
import { NextRequest, after } from "next/server";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rateLimit";
import { logRateLimitExceeded, logEncryptionFailed, logInquiryReceived, logInquiryFailed } from "@/lib/operationalLog";
import { trackFunnelEvent } from "@/lib/events/funnelTracking";
import { checkBlockRate } from "@/lib/alerts/operationalAlerts";
import { sendAdminNotification } from "@/lib/notifications/adminNotifier";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import type { TablesUpdate, Json } from "@/types/database.types";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const clientIp = getClientIp(request);
  const apiPath = '/api/inquiries/intake';

  // ✅ 운영 안정화: Rate limit 체크 (봇/도배 방지)
  const rateLimitResult = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
  if (!rateLimitResult.allowed) {
    logRateLimitExceeded(
      apiPath,
      clientIp,
      RATE_LIMITS.INQUIRY.maxRequests,
      RATE_LIMITS.INQUIRY.windowMs
    );

    // ✅ P2: 차단율 모니터링
    checkBlockRate().catch(err => console.error('[alert] checkBlockRate failed:', err));

    // ✅ P2: 퍼널 이벤트 추적 (차단)
    // after(): 응답을 보낸 뒤에도 함수를 살려 둔다. 안 감싸면 서버리스가 그대로 얼어서
    // 기록이 «조용히 사라진다» (2026-08-20 실측: 문의 145건에 퍼널 이벤트 1건뿐이었다).
    after(() => trackFunnelEvent({
      stage: 'form_blocked',
      dropReason: 'rate_limit_exceeded',
    }));
    
    return Response.json(
      { 
        ok: false, 
        error: "rate_limit_exceeded",
        message: rateLimitResult.reason,
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }

  // ✅ Security: 암호화 키는 encryptPiiInObject 호출 시 자동 검증됨 (Fail-Closed)

  try {
    const body = await request.json().catch(() => ({}));

    // 인코딩 깨진 본문(U+FFFD) 거부 — CP949 등으로 깨진 한글이 DB·알림메일에 그대로 박힘 (POSTMORTEMS #92)
    if (hasMojibake(body)) {
      return Response.json(
        { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
        { status: 400 }
      );
    }

    const inquiryId = body?.inquiryId != null
      ? (typeof body.inquiryId === "number" ? body.inquiryId : Number(body.inquiryId))
      : null;
    const publicToken = body?.publicToken ? String(body.publicToken) : null;
    const intakePatch = body?.intakePatch;

    if (inquiryId == null || isNaN(inquiryId)) {
      return Response.json(
        { ok: false, error: "inquiry_id_required" },
        { status: 400 }
      );
    }

    if (!publicToken) {
      return Response.json(
        { ok: false, error: "public_token_required" },
        { status: 400 }
      );
    }

    if (!intakePatch || typeof intakePatch !== "object" || Array.isArray(intakePatch)) {
      return Response.json(
        { ok: false, error: "intake_patch_must_be_object" },
        { status: 400 }
      );
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("inquiries")
      .select("id, public_token, intake, attachments, nationality, treatment_type, contact_method, lead_quality, priority_score, created_at")
      .eq("id", inquiryId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[api/inquiries/intake] fetch error:", fetchErr);
      return Response.json(
        { ok: false, error: "inquiry_fetch_failed" },
        { status: 500 }
      );
    }

    // 「없는 문의」와 「토큰 불일치」를 같은 답으로 — 다르게 답하면 문의 ID 존재 여부가 샌다.
    if (!row) {
      return Response.json(
        { ok: false, error: "invalid_public_token" },
        { status: 403 }
      );
    }

    const stored = row.public_token;
    if (stored == null || String(stored) !== String(publicToken)) {
      console.error("[api/inquiries/intake] public_token mismatch");
      return Response.json(
        { ok: false, error: "invalid_public_token" },
        { status: 403 }
      );
    }

    const patch = { ...intakePatch } as Record<string, unknown>;
    const extra = Array.isArray(patch.attachments_extra) ? (patch.attachments_extra as { path: string; name?: string | null; type?: string | null }[]) : [];
    delete patch.attachments_extra;

    const existingIntake = (row.intake && typeof row.intake === "object" && !Array.isArray(row.intake))
      ? (row.intake as Record<string, unknown>)
      : {};
    const mergedIntake = { ...existingIntake, ...patch };

    /**
     * ✅ Encrypt-before-store: intake JSONB 내 PII만 암호화 (AES-256-GCM)
     * 
     * 암호화 대상 키:
     * - email, phone, passport_no, kakao, line, whatsapp, contact_id 등
     * 
     * Fail-Closed:
     * - 암호화 실패 시 DB 저장 중단, 500 반환, 이벤트 기록
     */
    let encryptedIntake: Record<string, unknown>;
    try {
      encryptedIntake = encryptPiiInObject(mergedIntake, null, "intake");
    } catch (encryptErr: any) {
      console.error("[api/inquiries/intake] PII encryption failed - aborting DB update:", encryptErr?.message);
      logEncryptionFailed(apiPath, clientIp, encryptErr?.message || 'intake_encryption_failed');
      
      return Response.json(
        { 
          ok: false, 
          error: "encryption_failed", 
          detail: "개인정보 암호화에 실패했습니다. 데이터 저장을 중단합니다." 
        },
        { status: 500 }
      );
    }

    const existingAttachments = Array.isArray(row.attachments) ? row.attachments : [];
    const mergedAttachments = [...existingAttachments, ...extra];

    // 실DB 표의 모양으로 못박는다 — 없는 칸이 섞이면 여기서 걸린다(Record<string, any> 면 안 걸린다)
    // intake·attachments 는 jsonb — 안에 뭐가 들어갈지는 화면마다 달라 형식으로 못 묶는다.
    // 여기서 검사받는 건 「칸 이름」이고, 그게 이 가드의 목적이다.
    const updatePayload: TablesUpdate<"inquiries"> = { intake: encryptedIntake as Json };
    if (extra.length) updatePayload.attachments = mergedAttachments as Json;

    const { error: updateErr } = await supabaseAdmin
      .from("inquiries")
      .update(updatePayload)
      .eq("id", inquiryId);

    if (updateErr) {
      console.error("[api/inquiries/intake] update error:", updateErr);
      logInquiryFailed(apiPath, clientIp, 'intake_update_failed', { inquiryId, error: updateErr.message });
      return Response.json(
        { ok: false, error: "intake_update_failed" },
        { status: 500 }
      );
    }

    console.log("[api/inquiries/intake] success:", { inquiryId });
    // ✅ 운영 로그: 문의 수신 성공
    logInquiryReceived(apiPath, clientIp, { inquiryId });

    // ✅ P2: 퍼널 이벤트 추적 (Step2 제출)
    // after(): 응답을 보낸 뒤에도 함수를 살려 둔다. 안 감싸면 서버리스가 그대로 얼어서
    // 기록이 «조용히 사라진다» (2026-08-20 실측: 문의 145건에 퍼널 이벤트 1건뿐이었다).
    after(() => trackFunnelEvent({
      stage: 'form_step2_submit',
    }));

    // ✅ P4.1: 관리자 알림 (fail-safe: 알림 실패해도 메인 로직 영향 없음)
    // 최신 inquiry 정보 조회하여 알림
    // after(): 응답 후에도 함수를 살려 이메일 발송이 잘리지 않게 (서버리스 freeze 방지)
    after(() => sendAdminNotification({
      inquiryId,
      nationality: row.nationality ?? undefined,
      treatmentType: row.treatment_type ?? undefined,
      contactMethod: row.contact_method ?? undefined,
      leadQuality: row.lead_quality ?? undefined,
      priorityScore: row.priority_score ?? undefined,
      createdAt: row.created_at ?? undefined,
    }).catch((err) => {
      // 에러 무시 (메인 로직 보호)
      console.error('[intake] Admin notification failed (ignored):', err);
    }));

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[api/inquiries/intake] error:", error);
    logInquiryFailed(apiPath, clientIp, 'intake_failed', { error: error?.message });
    return Response.json(
      { ok: false, error: "intake_failed" },
      { status: 500 }
    );
  }
}
