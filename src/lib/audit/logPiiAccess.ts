/**
 * healwith: 환자 PII «열람» 접속기록 (법정 의무)
 *
 * 왜 별도로 두나 —
 *   개인정보보호법상 민감정보(건강정보)를 다루는 개인정보처리시스템은 접속기록을
 *   **2년 이상 보관**해야 하고, 기록에는 다음 5가지가 있어야 한다.
 *     ①계정 ②접속일시 ③접속지 정보 ④처리한 정보주체 정보 ⑤수행업무
 *   우리 admin_audit_logs 는 이 5칸을 이미 갖췄는데(admin_user_id·created_at·
 *   ip_address·inquiry_ids·action), **부르는 자리가 빠져 있었다.**
 *   2026-09-05 감사 실측: 환자 PII 를 복호화하는 라우트 중 절반 가까이가
 *   기록 없이 열람하고 있었다. 「수정·삭제」는 남기면서 「조회」를 안 남긴 것이다.
 *
 * 왜 복호화 함수가 아니라 여기서 남기나 —
 *   decryptInquiryForAdmin 은 «누가» 보는지 모른다(request·auth 를 안 받는다).
 *   시그니처를 바꾸면 부르는 모든 자리를 고쳐야 해서 이득이 없다.
 *   대신 이 헬퍼가 auth 결과를 받아 한 줄로 남기게 한다.
 *
 * 쓰는 법 (라우트에서 한 줄):
 * ```ts
 * const auth = await requirePortalAuth(request, { staffOnly: true });
 * if (!auth.success) return auth.response;
 * ...
 * after(() => logPiiAccess(request, auth, { action: "VIEW_INQUIRY", inquiryIds: [id] }));
 * ```
 *
 * ⚠️ after() 로 감싸라 — 서버리스는 응답 직후 얼어서, 안 감싸면 기록이
 *    «조용히 사라진다»(2026-08-20 실측: 문의 145건에 퍼널 이벤트 1건뿐이었다).
 * ⚠️ 실패해도 본 작업을 막지 않는다(fail-open). 기록 때문에 진료 업무가
 *    멈추는 것이 더 나쁘다. 대신 실패는 서버 로그에 남는다.
 */

import "server-only";
import type { NextRequest } from "next/server";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
  type AdminAuditAction,
} from "./adminAuditLog";

/**
 * 행위자. 두 인증 헬퍼의 «성공» 결과를 그대로 넘길 수 있게 둘 다 받는다.
 *  - requirePortalAuth → { userId, email, ... }        (평평한 형태)
 *  - requireAdminAuth  → { authResult: { userId, email } } (한 겹 안쪽)
 * 라우트마다 풀어 쓰게 하면 실수하기 쉬워서 여기서 흡수한다.
 */
type ActorLike =
  | { userId?: string | null; email?: string | null }
  | { authResult?: { userId?: string | null; email?: string | null } };

function pickActor(actor: ActorLike): { userId?: string | null; email?: string | null } {
  if (actor && typeof actor === "object" && "authResult" in actor && actor.authResult) {
    return actor.authResult;
  }
  return actor as { userId?: string | null; email?: string | null };
}

interface PiiAccessParams {
  /** 수행업무 — 무엇을 했나 (조회/목록/내보내기 등) */
  action: AdminAuditAction;
  /** 처리한 정보주체 — 어느 문의(환자)를 봤나. 목록이면 실제로 조회된 id 들. */
  inquiryIds?: (number | string)[] | null;
  /** 부가 맥락(경로·필터 등). PII 평문은 넣지 마라 — logAdminAction 이 걸러내지만 애초에 넣지 않는다. */
  metadata?: Record<string, unknown> | null;
}

export async function logPiiAccess(
  request: NextRequest,
  actor: ActorLike,
  params: PiiAccessParams
): Promise<void> {
  try {
    const who = pickActor(actor);

    // 일부 인증 헬퍼(requireVisaAccess·requireCostEstimateAccess)는 userId 만 주고
    // email 은 안 준다. 그대로 두면 「unknown」으로 남아 나중에 «누가 봤나»를 못 읽는다.
    // id 는 있으니 그걸로 한 번 채워 온다(실패해도 기록 자체는 남긴다).
    let email = who.email || null;
    if (!email && who.userId) {
      try {
        const { supabaseAdmin } = await import("../rag/supabaseAdmin");
        const { data } = await supabaseAdmin.auth.admin.getUserById(who.userId);
        email = data?.user?.email ?? null;
      } catch {
        /* 조회 실패는 무시 — 아래에서 unknown 으로 남는다 */
      }
    }

    await logAdminAction({
      adminEmail: email || "unknown",
      adminUserId: who.userId ?? undefined,
      action: params.action,
      inquiryIds: (params.inquiryIds ?? null) as number[] | null,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        path: new URL(request.url).pathname,
        method: request.method,
        ...(params.metadata || {}),
      },
    });
  } catch (err) {
    // 기록 실패가 진료 업무를 막으면 안 된다. 남길 수 있는 곳에 남기고 넘어간다.
    console.error(
      "[logPiiAccess] 접속기록 실패:",
      err instanceof Error ? err.message : String(err)
    );
  }
}
