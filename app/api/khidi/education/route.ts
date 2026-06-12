/**
 * HEALO: Education Content API
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

const LANG_COLUMNS: Record<string, { title: string; body: string }> = {
  ko: { title: "title_ko", body: "body_ko" },
  en: { title: "title_en", body: "body_en" },
  ru: { title: "title_ru", body: "body_ru" },
  kz: { title: "title_kz", body: "body_kz" },
  zh: { title: "title_zh", body: "body_zh" },
  ja: { title: "title_ja", body: "body_ja" },
};

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

    // 다국어 매핑: lang 컬럼 → fallback ko → en
    const cols = LANG_COLUMNS[lang] || LANG_COLUMNS.en;
    const fallbackKo = LANG_COLUMNS.ko;
    const fallbackEn = LANG_COLUMNS.en;

    const localized = (data || []).map((item: any) => ({
      id: item.id,
      cancerType: item.cancer_type,
      phase: item.send_at_phase,
      category: item.content_type,
      title: item[cols.title] || item[fallbackEn.title] || item[fallbackKo.title] || "",
      body: item[cols.body] || item[fallbackEn.body] || item[fallbackKo.body] || "",
      mediaUrl: item.media_url || null,
    }));

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
