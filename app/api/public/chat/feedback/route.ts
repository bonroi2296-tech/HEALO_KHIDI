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
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { broadcastInAppNotification } from "@/lib/notifications/inApp";

const VALID_CATEGORIES = ["inaccurate", "irrelevant", "harmful", "other"] as const;
type ReasonCategory = (typeof VALID_CATEGORIES)[number];

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
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
    const { data: existing } = await (supabaseAdmin as any)
      .from("chat_feedback")
      .select("id")
      .eq("message_id", message_id)
      .eq("thread_id", thread_id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return Response.json({ ok: false, error: "already_submitted" }, { status: 409 });
    }

    // 피드백 저장
    const { error: insertError } = await (supabaseAdmin as any)
      .from("chat_feedback")
      .insert({
        thread_id,
        message_id,
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
