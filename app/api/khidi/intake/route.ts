/**
 * healwith: Cancer Patient Intake API
 *
 * POST /api/khidi/intake — 암환자 초기 상담 양식 제출 (공개 — 회원가입 전 가능)
 * GET  /api/khidi/intake — 인테이크 목록 (admin only, 평문 마스킹 + 복호화 옵션)
 *
 * 변경 이력:
 * - 2026-04-17 (보안):
 *   * POST: rate limit (3/min/IP) 추가, first_name / current_treatment /
 *     diagnosis_date 를 AES-256-GCM 으로 암호화해 *_encrypted 컬럼에 저장.
 *     평문 컬럼은 backward-compat 으로 유지하나 새 코드는 암호화본 사용.
 *   * GET: requireAdminAuth 게이트 + 평문 컬럼 응답에서 마스킹.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  encryptStringNullable,
  decryptStringNullable,
  maskEmail,
} from "@/lib/security/encryptionV2";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
} from "@/lib/rateLimit";

const INTAKE_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 3,
  apiName: "cancer_intake_submit",
};

const VALID_CANCER_TYPES = [
  "stomach",
  "liver",
  "lung",
  "breast",
  "thyroid",
  "other",
];

export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────────────────
    // Rate limit (스팸/대량 enum 방지)
    // ────────────────────────────────────────────
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, INTAKE_RATE);
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const payload = await request.json();

    // Validation
    if (!payload.cancer_type) {
      return Response.json(
        { ok: false, error: "cancer_type is required" },
        { status: 400 }
      );
    }
    if (!VALID_CANCER_TYPES.includes(payload.cancer_type)) {
      return Response.json(
        { ok: false, error: "Invalid cancer_type" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import(
      "@/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    // ────────────────────────────────────────────
    // 민감 필드 암호화 (자유서술 + PII)
    // ────────────────────────────────────────────
    const insertData: Record<string, any> = {
      // categorical (검색용 평문 유지)
      cancer_type: payload.cancer_type,
      cancer_stage: payload.cancer_stage || null,
      preferred_hospitals: payload.preferred_hospitals || [],
      budget_range: payload.budget_range || null,
      travel_dates: payload.travel_dates || null,
      language_preference: payload.language_preference || "ru",

      // 민감 — 암호화
      first_name_encrypted: encryptStringNullable(payload.first_name),
      current_treatment_encrypted: encryptStringNullable(
        payload.current_treatment
      ),
      diagnosis_date_encrypted: encryptStringNullable(
        payload.diagnosis_date
      ),
    };

    const { data, error } = await supabaseAdmin
      .from("cancer_patient_intakes")
      .insert([insertData] as any)
      .select("id, cancer_type, cancer_stage, language_preference, created_at")
      .single();

    if (error) {
      console.error("[api/khidi/intake] Insert error:", error.message);
      return Response.json(
        { ok: false, error: "insert_failed" },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/intake] New intake: ${data.id} (${data.cancer_type})`
    );

    return Response.json({
      ok: true,
      data: {
        id: data.id,
        cancer_type: data.cancer_type,
        cancer_stage: data.cancer_stage,
        language_preference: data.language_preference,
        created_at: data.created_at,
      },
    });
  } catch (error: any) {
    console.error("[api/khidi/intake] Exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { requireAdminAuth } = await import(
      "@/lib/auth/requireAdminAuth"
    );
    const auth = await requireAdminAuth(request);
    if (!auth.success) return auth.response;

    const { getSupabaseServerClient } = await import(
      "@/lib/data/supabaseServerClient"
    );
    const supabaseAdmin = getSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const decrypt = searchParams.get("decrypt") === "1";

    const { data, count, error } = await supabaseAdmin
      .from("cancer_patient_intakes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/intake] GET error:", error.message);
      return Response.json(
        { ok: false, error: "list_failed" },
        { status: 500 }
      );
    }

    // 기본은 마스킹된 응답. ?decrypt=1 (admin 명시 요청) 시 복호화.
    const rows = (data || []).map((row: any) => {
      const out: any = {
        ...row,
        // 평문 컬럼 마스킹 (backward-compat 데이터)
        first_name: row.first_name ? row.first_name[0] + "***" : null,
      };
      if (decrypt) {
        try {
          out.first_name_decrypted = decryptStringNullable(
            row.first_name_encrypted
          );
          out.current_treatment_decrypted = decryptStringNullable(
            row.current_treatment_encrypted
          );
          out.diagnosis_date_decrypted = decryptStringNullable(
            row.diagnosis_date_encrypted
          );
        } catch (err: any) {
          console.warn(
            `[api/khidi/intake] decrypt failed row=${row.id}: ${err.message}`
          );
        }
      }
      // 암호화 페이로드는 클라이언트에 보낼 필요 없음
      delete out.first_name_encrypted;
      delete out.current_treatment_encrypted;
      delete out.diagnosis_date_encrypted;
      return out;
    });

    return Response.json({
      ok: true,
      data: rows,
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[api/khidi/intake] GET exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
