/**
 * healwith: Education Content API
 *
 * GET /api/khidi/education — 교육 콘텐츠 조회
 * Query: cancerType, phase, category, lang
 *
 * DB 스키마: education_contents
 * - cancer_type, content_type (=category), send_at_phase (=phase)
 * - title_ko, title_en, title_ru, title_kz, title_zh, title_ja
 * - body_ko, body_en, body_ru, body_kz, body_zh, body_ja
 * - is_published, media_url
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
// 언어 고르기는 자동발송 cron 과 «같은» 함수를 쓴다 — 갈라지면 화면과 메일의 폴백이 어긋난다.
import { localizeEducation, type EducationRow } from "@/lib/followup/educationEngine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cancerType = searchParams.get("cancerType");
    const phase = searchParams.get("phase");
    const category = searchParams.get("category");
    const lang = searchParams.get("lang") || "en";

    if (!cancerType) {
      return Response.json(
        { ok: false, error: "cancerType_required" },
        { status: 400 }
      );
    }

    const { getSupabaseServerClient } = await import(
      "@/lib/data/supabaseServerClient"
    );
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("education_contents")
      .select("*")
      .eq("cancer_type", cancerType)
      .eq("is_published", true)
      .order("send_at_phase");

    if (phase) {
      query = query.eq("send_at_phase", phase);
    }
    if (category) {
      query = query.eq("content_type", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[api/khidi/education] Query error:", error);
      return Response.json(
        { ok: false, error: "query_failed" },
        { status: 500 }
      );
    }

    // 다국어 매핑: 요청 언어 → 영어 → 한국어 (제목·본문을 한 벌로 고름)
    const localized = (data || []).map((item: any) =>
      localizeEducation(item as EducationRow, lang)
    );

    return Response.json({
      ok: true,
      data: localized,
      count: localized.length,
      lang,
    });
  } catch (error: any) {
    console.error("[api/khidi/education] Exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
