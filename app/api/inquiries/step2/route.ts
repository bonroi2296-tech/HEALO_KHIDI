/**
 * /api/inquiries/step2 — 단일 funnel Step 2 제출
 *
 * cancer_patient_intakes upsert + inquiries.step2_completed_at = now() + match_accuracy 업데이트
 * inquiry_id 필수 (step1 응답값).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/lib/rateLimit";

const Step2Schema = z.object({
  inquiryId: z.union([z.string(), z.number()]),
  // 소유권 증명 토큰 (step1 응답값). 없으면 순번 정수 id 로 남의 문의를 변조 가능(IDOR).
  publicToken: z.string().min(8).max(100),
  stage: z.string().max(10).nullable().optional(),
  diagnosisDate: z.string().max(30).nullable().optional(),
  treatmentState: z.string().max(50).nullable().optional(),
  travelTiming: z.string().max(20).nullable().optional(),
  priorities: z.array(z.string().max(30)).max(10).optional(),
  attachments: z
    .array(
      z.object({
        path: z.string().max(500),
        name: z.string().max(300).nullable().optional(),
        type: z.string().max(100).nullable().optional(),
      })
    )
    .max(5)
    .optional(),
  matchAccuracy: z.number().int().min(60).max(100).optional(),
});

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = Step2Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "validation_error", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const inquiryId = Number(data.inquiryId);
  if (isNaN(inquiryId) || inquiryId <= 0) {
    return Response.json({ ok: false, error: "invalid_inquiry_id" }, { status: 400 });
  }

  try {
    // inquiry 존재 확인 + 소유권(public_token) 검증
    const { data: existingRaw, error: fetchErr } = await supabaseAdmin
      .from("inquiries")
      .select("id, step1_completed_at, public_token")
      .eq("id", inquiryId)
      .maybeSingle();

    const existing = existingRaw as
      | (typeof existingRaw & { step1_completed_at?: string | null; public_token?: string | null })
      | null;

    if (fetchErr || !existing) {
      return Response.json({ ok: false, error: "inquiry_not_found" }, { status: 404 });
    }

    // IDOR 방지: 토큰 불일치면 거부 (남의 문의 변조 차단)
    if (!existing.public_token || String(existing.public_token) !== String(data.publicToken)) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!existing.step1_completed_at) {
      return Response.json({ ok: false, error: "step1_not_completed" }, { status: 400 });
    }

    const accuracy = data.matchAccuracy ?? ((data.attachments?.length ?? 0) > 0 ? 95 : 90);
    const now = new Date().toISOString();

    // inquiries 업데이트
    const { error: updateErr } = await supabaseAdmin
      .from("inquiries")
      .update({
        step2_completed_at: now,
        match_accuracy: accuracy,
        // intake JSONB에 step2 데이터 병합
        intake: {
          stage: data.stage ?? null,
          diagnosis_date: data.diagnosisDate ?? null,
          treatment_state: data.treatmentState ?? null,
          travel_timing: data.travelTiming ?? null,
          priorities: data.priorities ?? [],
        },
        // 의료문서 첨부 병합
        attachments: data.attachments ?? [],
      })
      .eq("id", inquiryId);

    if (updateErr) {
      console.error("[/api/inquiries/step2] update error:", updateErr.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // cancer_patient_intakes — inquiry_id 컬럼 존재 여부를 동적으로 처리
    // inquiry_id 컬럼이 없는 구버전 스키마에서도 실패하지 않도록 try/catch 감싸기
    try {
      // inquiry_id / current_treatment_state / travel_timing / priorities 등 신규 컬럼은
      // 타입 정의 재생성 전까지 any 캐스팅 사용
      const intakePayload: Record<string, unknown> = {
        inquiry_id: inquiryId,
        cancer_stage: data.stage ?? null,
        current_treatment: data.treatmentState ?? null, // 기존 컬럼명 호환
        updated_at: now,
      };
      await (supabaseAdmin.from("cancer_patient_intakes") as any).upsert(
        intakePayload,
        { onConflict: "inquiry_id", ignoreDuplicates: false }
      );
    } catch (intakeErr: any) {
      // 치명적이지 않음 — inquiries 는 이미 업데이트 완료
      console.warn("[/api/inquiries/step2] cancer_patient_intakes upsert skipped:", intakeErr.message);
    }

    return Response.json({ ok: true, inquiryId, matchAccuracy: accuracy });
  } catch (e: any) {
    console.error("[/api/inquiries/step2] error:", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
