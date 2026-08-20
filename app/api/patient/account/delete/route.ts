export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { confirmMatchesEmail, deleteAccountCompletely } from "@/lib/account/deleteAccount";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";

/**
 * 계정 탈퇴 — 누르면 «그 자리에서» 계정이 지워진다.
 *
 * 왜 「요청 접수」가 아니라 즉시 실행인가 (2026-08-20 PO 결정):
 *   기존 `deletion-request` 는 표에 요청 한 줄을 쌓기만 했고, 관리자가 「완료」를 눌러도
 *   상태 글자만 바뀌었다. 계정을 지우는 코드가 0줄이라 **사용자는 영영 탈퇴할 수 없었다.**
 *   애플 5.1.1(v)·구글 데이터 안전 모두 「앱 안에서 계정 삭제를 시작할 수 있어야」 하고,
 *   사람 손을 거쳐야 하는 구조는 1인 운영에서 사실상 「안 되는 기능」이 된다.
 *
 * 🛑 되돌릴 수 없다. 그래서 관문을 셋 둔다:
 *   ① 로그인 세션(본인만)
 *   ② 화면에서 받은 확인 문구가 본인 이메일과 일치할 것 (실수 클릭 방지)
 *   ③ 권한 계정(관리자·코디·병원·에이전시)은 거부 — 이 창구로 지우면 조직 운영이 끊긴다.
 *      그런 계정은 관리자가 사람 확인 후 처리해야 한다.
 */

const DELETE_RATE = { windowMs: 60 * 1000, maxRequests: 3, apiName: "account_delete" };

/** 이 창구로 지우면 안 되는 역할. app_metadata.role 기준(user_metadata 는 사용자가 바꿀 수 있다). */
const PRIVILEGED_ROLES = ["admin", "coordinator", "hospital", "agency", "doctor"];

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), DELETE_RATE);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // ① 본인 확인
  let user;
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    user = data.user;
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // ③ 권한 계정 거부 (②보다 먼저 본다 — 확인 문구를 맞게 쳤어도 막아야 한다)
  const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (typeof role === "string" && PRIVILEGED_ROLES.includes(role)) {
    return NextResponse.json({ ok: false, error: "privileged_account" }, { status: 403 });
  }

  // ② 확인 문구. 본인 이메일을 그대로 쳐야 통과한다.
  //    ⚠️ 대소문자·앞뒤 공백만 눈감아 준다. 그 이상 느슨하게 만들지 마라 — 실수 클릭 방지가 목적이다.
  const body = await request.json().catch(() => ({}));
  if (!confirmMatchesEmail(body?.confirm, user.email)) {
    return NextResponse.json({ ok: false, error: "confirm_mismatch" }, { status: 400 });
  }

  // 감사 기록은 «지우기 전»에 남긴다. 계정이 사라진 뒤에는 이메일을 못 읽는다.
  void logAdminAction({
    adminEmail: user.email || `patient:${user.id}`,
    adminUserId: user.id,
    action: "PATIENT_ACCOUNT_DELETED",
    ipAddress: getIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
  });

  const result = await deleteAccountCompletely(user.id);

  if (!result.ok) {
    // 계정이 안 지워졌다 = 사용자는 여전히 로그인된다. 「됐다」고 말하면 거짓말이 된다.
    console.error("[account/delete] failed steps:", result.failedSteps.join(","));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  // 남은 요청 기록이 있으면 「완료」로 닫는다(관리자 화면에 유령 대기건이 남지 않게).
  try {
    await (supabaseAdmin as any)
      .from("account_deletion_requests")
      .update({ status: "completed", processed_at: new Date().toISOString(), note: "self-service" })
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"]);
  } catch {
    /* 부수 정리 실패는 탈퇴 자체를 되돌리지 않는다 */
  }

  if (result.failedSteps.length) {
    console.warn("[account/delete] partial:", result.failedSteps.join(","));
  }

  return NextResponse.json({
    ok: true,
    anonymizedInquiries: result.anonymizedInquiries,
    purgedRows: result.purgedRows,
  });
}
