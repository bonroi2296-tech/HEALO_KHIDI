/**
 * healwith: 브랜딩 이미지 업로드 API
 * 
 * 경로: /api/admin/site-settings/upload
 * 
 * 기능:
 * - POST: 로고 또는 히어로 배경 이미지 업로드
 * - Supabase Storage에 저장 후 public URL 반환
 * - site_settings 테이블 자동 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";

const ALLOWED_TYPES = {
  logo: ["image/png", "image/svg+xml", "image/webp"],
  hero: ["image/jpeg", "image/png", "image/webp"],
};

const MAX_SIZE = {
  logo: 2 * 1024 * 1024, // 2MB
  // 4MB — Vercel 함수 본문 한도가 4.5MB. 8MB 라고 적어놨지만 실제로는 4.5MB 에서 끊겼다(실측 2026-08-03).
  hero: 4 * 1024 * 1024,
};

/**
 * POST /api/admin/site-settings/upload
 * FormData: file, type (logo | hero)
 */
export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const apiPath = "/api/admin/site-settings/upload [POST]";

  try {
    // 1) 관리자 인증
    const auth = await requireAdminAuth(request);
    if (!auth.success) return auth.response;

    // 2) FormData 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "logo" | "hero"

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "file_required" },
        { status: 400 }
      );
    }

    if (!type || !["logo", "hero"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "invalid_type" },
        { status: 400 }
      );
    }

    // 3) 파일 타입 검증
    const allowedTypes = ALLOWED_TYPES[type as "logo" | "hero"];
    if (!allowedTypes.includes(file.type)) {
      console.warn(`[${apiPath}] 허용되지 않은 파일 타입:`, file.type);
      return NextResponse.json(
        { ok: false, error: `invalid_file_type. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // 4) 파일 크기 검증
    const maxSize = MAX_SIZE[type as "logo" | "hero"];
    if (file.size > maxSize) {
      console.warn(`[${apiPath}] 파일 크기 초과:`, file.size, "Max:", maxSize);
      return NextResponse.json(
        { ok: false, error: `file_too_large. Max: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 5) 파일 확장자 추출
    const ext = file.name.split(".").pop() || "png";
    const fileName = type === "logo" ? `logo.${ext}` : `hero-bg.${ext}`;
    const storagePath = `branding/${fileName}`;

    console.log(`[${apiPath}] 업로드 시작:`, { fileName, type: file.type, size: file.size });

    // 6) Supabase Storage에 업로드 (upsert)
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("public-assets")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // 기존 파일 덮어쓰기
      });

    if (uploadError) {
      console.error(`[${apiPath}] Storage 업로드 실패:`, uploadError);
      
      // 버킷이 없는 경우
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json(
          { 
            ok: false, 
            error: "storage_bucket_not_found",
            detail: "public-assets 버킷을 생성하세요. 가이드: docs/STORAGE_SETUP.md"
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { ok: false, error: "upload_failed" },
        { status: 500 }
      );
    }

    // 7) Public URL 생성
    const { data: urlData } = supabaseAdmin.storage
      .from("public-assets")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`[${apiPath}] Public URL 생성:`, publicUrl);

    // 8) site_settings 업데이트
    const fieldName = type === "logo" ? "logo_url" : "hero_background_url";
    
    // 기존 설정 확인
    const { data: existingRows, error: existingErr } = await supabaseAdmin
      .from("site_settings")
      .select("id")
      .limit(1);

    // 실패-닫힘: 못 읽은 걸 "설정 없음"으로 보면 INSERT 로 흘러 단일행 설정이 두 줄이 된다.
    if (existingErr) {
      console.error(`[${apiPath}] 기존 설정 조회 실패:`, existingErr);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    const existing = existingRows?.[0];

    if (existing?.id) {
      // UPDATE
      const { error: updateError } = await supabaseAdmin
        .from("site_settings")
        .update({ [fieldName]: publicUrl })
        .eq("id", existing.id);

      if (updateError) {
        console.error(`[${apiPath}] site_settings UPDATE 실패:`, updateError);
        return NextResponse.json(
          { ok: false, error: "update_failed" },
          { status: 500 }
        );
      }
    } else {
      // INSERT
      const { error: insertError } = await supabaseAdmin
        .from("site_settings")
        .insert({ [fieldName]: publicUrl } as any);

      if (insertError) {
        console.error(`[${apiPath}] site_settings INSERT 실패:`, insertError);
        return NextResponse.json(
          { ok: false, error: "insert_failed" },
          { status: 500 }
        );
      }
    }

    console.log(`[${apiPath}] 업로드 완료:`, { type, url: publicUrl });

    return NextResponse.json({
      ok: true,
      message: `${type === "logo" ? "로고" : "히어로 배경"} 업로드 완료`,
      url: publicUrl,
      type,
    });
  } catch (err: any) {
    console.error(`[${apiPath}] 예외 발생:`, err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
