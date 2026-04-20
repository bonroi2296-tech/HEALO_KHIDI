/**
 * Hospital Bulk Import API
 * CSV/Excel 데이터 일괄 등록
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '../../../../../src/lib/supabase/server';
import { requireAdminAuth } from '../../../../../src/lib/auth/requireAdminAuth';
import { HospitalCreateSchema } from '../../../../../src/lib/validation/admin';
import { getFallbackImage, getHospitalGalleryImages } from '../../../../../src/lib/utils/imageFallback';
import { z } from 'zod';

interface ImportRow {
  rowIndex: number;
  data: any;
  errors?: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { data, mode } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_data', message: '데이터가 비어있습니다.' },
        { status: 400 }
      );
    }

    // mode: 'validate' (검증만) 또는 'import' (실제 등록)
    const isValidateOnly = mode === 'validate';

    const supabase = createServiceRoleClient();
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const validRows: ImportRow[] = [];

    // 1단계: 데이터 검증
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // CSV 헤더 다음 행부터 시작 (Excel 기준 2행부터)

      try {
        // JSON 문자열 파싱 (배열, JSONB 필드)
        const parsedRow = {
          ...row,
          tags: parseJsonField(row.tags, []),
          images: parseJsonField(row.images, []),
          supported_languages: parseJsonField(row.supported_languages, []),
          amenities: parseJsonField(row.amenities, []),
          specialties: parseJsonField(row.specialties, []),
          operating_hours: parseJsonField(row.operating_hours, null),
          doctor_profile: parseJsonField(row.doctor_profile, null),
          certifications: parseJsonField(row.certifications, []),
          medical_equipment: parseJsonField(row.medical_equipment, []),
          insurance_details: parseJsonField(row.insurance_details, null),
          external_ratings: parseJsonField(row.external_ratings, null),
        };

        // 빈 문자열을 null로 변환
        Object.keys(parsedRow).forEach(key => {
          if (parsedRow[key] === '') {
            parsedRow[key] = null;
          }
        });

        // Zod 스키마 검증
        const validated = HospitalCreateSchema.parse(parsedRow);

        validRows.push({
          rowIndex,
          data: validated,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          result.failed++;
          result.errors.push({
            row: rowIndex,
            errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          });
        } else {
          result.failed++;
          result.errors.push({
            row: rowIndex,
            errors: ['데이터 파싱 실패'],
          });
        }
      }
    }

    // 검증만 하는 경우
    if (isValidateOnly) {
      return NextResponse.json({
        ok: true,
        mode: 'validate',
        total: data.length,
        valid: validRows.length,
        invalid: result.failed,
        errors: result.errors,
      });
    }

    // 2단계: 실제 등록 (트랜잭션)
    for (const { rowIndex, data: hospitalData } of validRows) {
      try {
        // slug 자동 생성 (없는 경우)
        if (!hospitalData.slug) {
          hospitalData.slug = generateSlug(hospitalData.name);
        }

        // 이미지 fallback (없는 경우 Unsplash 임시 이미지)
        const specialty = hospitalData.specialties?.[0] || hospitalData.name;
        
        if (!hospitalData.thumbnail_image) {
          hospitalData.thumbnail_image = getFallbackImage(specialty, 0, 800, 600);
        }
        
        if (!hospitalData.gallery_images || hospitalData.gallery_images.length === 0) {
          hospitalData.gallery_images = getHospitalGalleryImages(specialty);
        }

        // 중복 체크 (slug 기준)
        const { data: existing } = await supabase
          .from('hospitals')
          .select('id')
          .eq('slug', hospitalData.slug)
          .single();

        if (existing) {
          result.failed++;
          result.errors.push({
            row: rowIndex,
            errors: [`이미 존재하는 slug: ${hospitalData.slug}`],
          });
          continue;
        }

        // 삽입
        const { error: insertError } = await supabase
          .from('hospitals')
          .insert(hospitalData);

        if (insertError) {
          result.failed++;
          result.errors.push({
            row: rowIndex,
            errors: [insertError.message],
          });
        } else {
          result.success++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowIndex,
          errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        });
      }
    }

    // 감사 로그 기록
    if (auth.authResult.userId) {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: auth.authResult.userId,
        admin_email: auth.authResult.email || 'unknown',
        action: 'bulk_import_hospitals',
        metadata: {
          entity_type: 'hospital',
          total: data.length,
          success: result.success,
          failed: result.failed,
        },
      } as any);
    }

    return NextResponse.json({
      ok: true,
      mode: 'import',
      result,
    });
  } catch (error) {
    console.error('Hospital import error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : '서버 오류',
      },
      { status: 500 }
    );
  }
}

/**
 * JSON 필드 파싱 (문자열 → 객체/배열)
 */
function parseJsonField(value: any, defaultValue: any): any {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  return value;
}

/**
 * Slug 생성 (한글 → 영문 변환)
 */
function generateSlug(name: string): string {
  // 한글 → 로마자 간단 변환 맵
  const korToRom: Record<string, string> = {
    '강남': 'gangnam',
    '청담': 'cheongdam',
    '압구정': 'apgujeong',
    '성형': 'plastic',
    '피부': 'dermatology',
    '병원': 'hospital',
    '의원': 'clinic',
    '클리닉': 'clinic',
    '외과': 'surgery',
    '과': '',
  };

  let slug = name.toLowerCase();
  
  // 한글 키워드를 영문으로 변환
  for (const [kor, rom] of Object.entries(korToRom)) {
    slug = slug.replace(new RegExp(kor, 'g'), rom);
  }
  
  // 남은 한글 제거, 공백을 하이픈으로
  slug = slug
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 빈 문자열이면 랜덤 slug 생성
  if (!slug || slug.length < 3) {
    slug = 'hospital-' + Math.random().toString(36).substring(2, 10);
  }
  
  return slug.substring(0, 50);
}
