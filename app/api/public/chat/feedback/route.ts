/**
 * healwith: AI 응답 피드백 API
 *
 * POST /api/public/chat/feedback
 * - 비회원 사용 가능 (public_token 검증)
 * - rating=+1 (👍) / -1 (👎) 저장
 * - rating=-1 시 코디네이터에게 in-app 알림 발송
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { broadcastInAppNotification } from "@/lib/notifications/inApp";

const VALID_CATEGORIES = ["inaccurate", "irrelevant", "harmful", "other"] as const;
type ReasonCategory = (typeof VALID_CATEGORIES)[number];

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { thread_id, message_id, public_token, rating, reason_category, comment } = body;

    // 필수 필드 검증
    if (!thread_id || !message_id || !public_token) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    // message_id 가 uuid 가 아니면 «평가를 버리지 말고» 번호만 비운다.
    // 화면이 임시 번호(`ai_<시각>`)를 보내던 시절에는 여기서 500 이 나 평가가 통째로 유실됐다
    // (2026-08-20 실측: 챗 메시지 1,068건 대비 평가 0건). 평가 자체는 스레드 단위로도 쓸 수 있다.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const messageId = UUID_RE.test(String(message_id)) ? String(message_id) : null;
    if (rating !== 1 && rating !== -1) {
      return Response.json({ ok: false, error: "invalid_rating" }, { status: 400 });
    }
    if (reason_category && !VALID_CATEGORIES.includes(reason_category as ReasonCategory)) {
      return Response.json({ ok: false, error: "invalid_reason_category" }, { status: 400 });
    }

    // public_token으로 thread 확인 (스레드 테이블은 chat_threads — 과거 존재하지
    // 않는 inquiry_threads 를 조회해 모든 피드백이 403 으로 실패하던 버그 수정)
    const { data: thread, error: threadError } = await (supabaseAdmin as any)
      .from("chat_threads")
      .select("id, guest_email, user_id")
      .eq("id", thread_id)
      .eq("public_token", public_token)
      .single();

    if (threadError || !thread) {
      return Response.json({ ok: false, error: "invalid_token" }, { status: 403 });
    }

    // 중복 피드백 확인 (같은 message_id + public_token)
    // ⚠️ error 를 반드시 받는다 — supabase-js 는 오류에 reject 하지 않아, 안 받으면 조회 실패가
    // "중복 없음"으로 둔갑해 가드를 그냥 통과한다(POSTMORTEMS #105 부류).
    // 번호를 못 붙인 평가(messageId=null)는 메시지 단위 중복검사를 건너뛴다(스레드 전체를
    // 한 건으로 묶어버리면 두 번째 평가부터 «이미 제출됨»으로 막힌다).
    const dupQuery = (supabaseAdmin as any)
      .from("chat_feedback")
      .select("id")
      .eq("thread_id", thread_id)
      .limit(1);
    const { data: existingRows, error: dupErr } = messageId
      ? await dupQuery.eq("message_id", messageId)
      : { data: null, error: null };

    if (dupErr) {
      console.error("[chat/feedback] 중복검사 실패:", dupErr.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (existingRows?.length) {
      return Response.json({ ok: false, error: "already_submitted" }, { status: 409 });
    }

    // 피드백 저장
    const { error: insertError } = await (supabaseAdmin as any)
      .from("chat_feedback")
      .insert({
        thread_id,
        message_id: messageId,
        rating,
        reason_category: reason_category || null,
        comment: comment?.trim() || null,
        guest_email: thread.guest_email || null,
        user_id: thread.user_id || null,
      });

    if (insertError) {
      console.error("[feedback] insert 실패:", insertError.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 👎 시 코디네이터 알림 발송
    if (rating === -1) {
      await notifyCoordinators(thread_id, reason_category);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[feedback] 예외:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

async function notifyCoordinators(threadId: string, reasonCategory?: string) {
  try {
    // 역할은 profiles 가 아니라 auth.users(app_metadata.role) 에 있음 → 공용 헬퍼로 조회.
    const { getStaffIdsByRole } = await import("@/lib/notifications/inApp");
    const { coordinators: coordinatorIds } = await getStaffIdsByRole();

    if (coordinatorIds.length === 0) {
      console.log("[feedback] 코디네이터 없음, 알림 스킵");
      return;
    }

    const reasonLabel: Record<string, string> = {
      inaccurate: "정보 부정확",
      irrelevant: "관련 없음",
      harmful: "위험한 내용",
      other: "기타",
    };
    const reason = reasonCategory ? (reasonLabel[reasonCategory] || reasonCategory) : "사유 미입력";

    await broadcastInAppNotification(coordinatorIds, {
      type: "ai_negative_feedback",
      title: "AI 응답에 부정 피드백",
      body: `환자가 AI 응답을 신고했습니다: ${reason}`,
      link: `/coordinator/messages?thread=${threadId}`,
      priority: "high",
    });
  } catch (err: any) {
    // 알림 실패해도 피드백 응답에 영향 없게
    console.warn("[feedback] 코디네이터 알림 실패 (무시):", err.message);
  }
}
