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
import { encryptStringNullable } from "@/lib/security/encryptionV2";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import {
  checkRateLimitPersistent,
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
    // 큰 자료는 쪼개서 올리게 되므로 5개는 좁다(문의 #60: 131MB PDF). 10개로.
    .max(10)
    .optional(),
  matchAccuracy: z.number().int().min(60).max(100).optional(),
});

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
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

  // 인코딩 깨진 본문(U+FFFD) 거부 — CP949 등으로 깨진 한글이 DB·알림메일에 그대로 박힘 (POSTMORTEMS #92)
  if (hasMojibake(body)) {
    return Response.json(
      { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
      { status: 400 }
    );
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
      .select("id, step1_completed_at, public_token, cancer_type, intake")
      .eq("id", inquiryId)
      .maybeSingle();

    // 생성타입에서 intake(jsonb)는 Json(원시값 포함)이라 spread 가 안 됨 → 명시 타입으로 정리.
    const existing = existingRaw as unknown as
      | {
          id: number;
          step1_completed_at?: string | null;
          public_token?: string | null;
          cancer_type?: string | null;
          intake?: Record<string, any> | null;
        }
      | null;

    // 「없는 문의」와 「토큰 불일치」를 같은 답으로 — 다르게 답하면 문의 ID 존재 여부가 샌다.
    if (fetchErr || !existing) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
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
        // intake JSONB. 의료 민감 필드(진단일·치료상태)는 AES-256-GCM 암호화 저장
        // (어드민 표시 시 decryptForAdmin 이 복호화). stage/일정/우선순위는 비민감 → 평문.
        // ⚠️ 기존 intake 를 spread 로 보존(merge) — step1 이 저장한 PIPA 동의기록
        // (intake.consents·consentVersion·consentAt)을 덮어써 지우지 않기 위함(법적 증빙).
        intake: {
          ...(existing.intake || {}),
          stage: data.stage ?? null,
          diagnosis_date: data.diagnosisDate ? encryptStringNullable(data.diagnosisDate) : null,
          treatment_state: data.treatmentState ? encryptStringNullable(data.treatmentState) : null,
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

    // cancer_patient_intakes — 보조 리포팅 테이블에도 인테이크 반영(upsert).
    // ⚠️ 과거 버그(2026-06-22 수정): ① inquiry_id 에 UNIQUE 제약이 없어
    //   onConflict:"inquiry_id" upsert 가 항상 거부→무음 실패 ② cancer_type 이
    //   NOT NULL 인데 미전달 ③ 민감필드(current_treatment·diagnosis_date)를 평문에 쓰려 함.
    //   → UNIQUE 인덱스 추가(마이그레이션) + cancer_type 을 inquiry 에서 가져오고
    //     민감필드는 *_encrypted 컬럼에 AES 저장으로 정상화.
    // 진짜 데이터는 inquiries.intake(암호화)에 이미 안전 → 실패해도 비치명적이라 try/catch 유지.
    try {
      const intakePayload: Record<string, unknown> = {
        inquiry_id: inquiryId,
        cancer_type: existing.cancer_type ?? "other", // step1 에서 저장된 암종(NOT NULL)
        cancer_stage: data.stage ?? null, // 카테고리(비민감) → 평문
        current_treatment_encrypted: data.treatmentState
          ? encryptStringNullable(data.treatmentState)
          : null,
        diagnosis_date_encrypted: data.diagnosisDate
          ? encryptStringNullable(data.diagnosisDate)
          : null,
        updated_at: now,
      };
      const { error: intakeErr } = await (supabaseAdmin.from(
        "cancer_patient_intakes"
      ) as any).upsert(intakePayload, {
        onConflict: "inquiry_id",
        ignoreDuplicates: false,
      });
      if (intakeErr) {
        console.warn(
          "[/api/inquiries/step2] cancer_patient_intakes upsert failed:",
          intakeErr.message
        );
      }
    } catch (intakeErr: any) {
      // 치명적이지 않음 — inquiries 는 이미 업데이트 완료(정본 데이터 안전)
      console.warn(
        "[/api/inquiries/step2] cancer_patient_intakes upsert error:",
        intakeErr?.message
      );
    }

    return Response.json({ ok: true, inquiryId, matchAccuracy: accuracy });
  } catch (e: any) {
    console.error("[/api/inquiries/step2] error:", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
