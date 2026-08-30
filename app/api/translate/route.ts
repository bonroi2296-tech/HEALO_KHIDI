/**
 * Internal translation API endpoint
 *
 * Called internally after hospital/treatment save to translate
 * Korean content to English asynchronously.
 *
 * NOT intended for external use — secured by a shared secret.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { triggerMultiLangTranslation } from "@/lib/translate";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { safeEqual } from "@/lib/security/safeEqual";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: NextRequest) {
  if (!INTERNAL_SECRET) {
    return NextResponse.json({ ok: false, error: "INTERNAL_API_SECRET not configured" }, { status: 500 });
  }
  // `!==` 단순비교는 타이밍 사이드채널(CISO-5) → 공용 safeEqual 로 상수시간 비교.
  const authHeader = request.headers.get("x-internal-secret");
  if (!safeEqual(authHeader, INTERNAL_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { table, id, fields } = body;

  if (!table || !id || !fields) {
    return NextResponse.json(
      { ok: false, error: "missing_params", detail: "table, id, fields required" },
      { status: 400 }
    );
  }

  if (table !== "hospitals" && table !== "treatments") {
    return NextResponse.json(
      { ok: false, error: "invalid_table" },
      { status: 400 }
    );
  }

  try {
    await triggerMultiLangTranslation(table, id, fields, supabaseAdmin);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[api/translate] Error:", err.message);
    return NextResponse.json(
      { ok: false, error: "translation_failed" },
      { status: 500 }
    );
  }
}
