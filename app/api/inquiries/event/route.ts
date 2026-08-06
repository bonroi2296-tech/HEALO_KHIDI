/**
 * healwith: Inquiry Funnel 이벤트 수집 API (서버 전용)
 * step1_viewed, step1_submitted, step2_viewed, step2_submitted
 * 
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * 
 * 이유:
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";

const EVENT_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 60,
  apiName: "inquiry_event",
};

const ALLOWED_EVENT_TYPES = [
  "step1_viewed",
  "step1_submitted",
  "step2_viewed",
  "step2_submitted",
] as const;

type EventType = (typeof ALLOWED_EVENT_TYPES)[number];

const REQUIRES_INQUIRY_ID: EventType[] = ["step1_submitted", "step2_viewed", "step2_submitted"];

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  // Rate limit (이벤트 어뷰즈 방지)
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, EVENT_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const eventType = body?.eventType ? String(body.eventType) : null;
    const inquiryId = body?.inquiryId != null
      ? (typeof body.inquiryId === "number" ? body.inquiryId : Number(body.inquiryId))
      : null;
    const meta = body?.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? body.meta
      : {};

    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType as EventType)) {
      return Response.json(
        { ok: false, error: "invalid_event_type", allowed: ALLOWED_EVENT_TYPES },
        { status: 400 }
      );
    }

    if (REQUIRES_INQUIRY_ID.includes(eventType as EventType)) {
      if (inquiryId == null || isNaN(inquiryId)) {
        return Response.json(
          { ok: false, error: "inquiry_id_required" },
          { status: 400 }
        );
      }
    }

    // 실제 컬럼명은 metadata (meta 아님). 여기만 POSTMORTEMS #59 수정에서 빠져 있어
    // 퍼널 이벤트 4종이 매번 42703 으로 실패하고 있었다 — supabase-js 2.112 의
    // 「없는 칸 쓰기」 검사가 잡아냈다(2.90 은 any 객체를 그냥 통과시켰다).
    const { error: insertError } = await supabaseAdmin
      .from("inquiry_events")
      .insert({
        inquiry_id: inquiryId || null,
        event_type: eventType,
        metadata: meta,
      });

    if (insertError) {
      console.error("[api/inquiries/event] insert error:", insertError);
      return Response.json(
        { ok: false, error: "event_insert_failed" },
        { status: 500 }
      );
    }

    console.log("[api/inquiries/event] success:", { eventType, inquiryId });
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[api/inquiries/event] error:", error);
    return Response.json(
      { ok: false, error: "event_failed" },
      { status: 500 }
    );
  }
}
