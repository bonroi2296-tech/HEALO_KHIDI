/**
 * Treatment Bulk Import API
 * CSV/Excel 데이터 일괄 등록
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';
import { TreatmentCreateSchema } from '@/lib/validation/admin';
import { getFallbackImage, getTreatmentGalleryImages } from '@/lib/utils/imageFallback';
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
      const rowIndex = i + 2;

      try {
        // JSON 문자열 파싱
        const parsedRow = {
          ...row,
          tags: parseJsonField(row.tags, []),
          images: parseJsonField(row.images, []),
          benefits: parseJsonField(row.benefits, []),
          recovery_process: parseJsonField(row.recovery_process, null),
          side_effects: parseJsonField(row.side_effects, []),
          precautions: parseJsonField(row.precautions, []),
          required_equipment: parseJsonField(row.required_equipment, []),
          similar_treatments: parseJsonField(row.similar_treatments, []),
          comparison_data: parseJsonField(row.comparison_data, null),
        };

        // 빈 문자열을 null로 변환
        Object.keys(parsedRow).forEach(key => {
          if (parsedRow[key] === '') {
            parsedRow[key] = null;
          }
        });

        // 숫자 필드 변환
        if (parsedRow.price_min) parsedRow.price_min = Number(parsedRow.price_min);
        if (parsedRow.price_max) parsedRow.price_max = Number(parsedRow.price_max);
        if (parsedRow.recovery_time_min) parsedRow.recovery_time_min = Number(parsedRow.recovery_time_min);
        if (parsedRow.recovery_time_max) parsedRow.recovery_time_max = Number(parsedRow.recovery_time_max);
        if (parsedRow.surgery_duration_min) parsedRow.surgery_duration_min = Number(parsedRow.surgery_duration_min);
        if (parsedRow.surgery_duration_max) parsedRow.surgery_duration_max = Number(parsedRow.surgery_duration_max);
        if (parsedRow.annual_procedure_count) parsedRow.annual_procedure_count = Number(parsedRow.annual_procedure_count);
        if (parsedRow.success_rate) parsedRow.success_rate = Number(parsedRow.success_rate);
        if (parsedRow.display_order) parsedRow.display_order = Number(parsedRow.display_order);

        // 불리언 필드 변환
        if (typeof parsedRow.insurance_coverage === 'string') {
          parsedRow.insurance_coverage = parsedRow.insurance_coverage === 'true';
        }
        if (typeof parsedRow.is_published === 'string') {
          parsedRow.is_published = parsedRow.is_published === 'true';
        }

        // Zod 스키마 검증
        const validated = TreatmentCreateSchema.parse(parsedRow);

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

    // 2단계: 실제 등록
    for (const { rowIndex, data: treatmentData } of validRows) {
      try {
        // slug 자동 생성 (없는 경우)
        if (!treatmentData.slug) {
          treatmentData.slug = generateSlug(treatmentData.name);
        }

        // 이미지 fallback (없는 경우 Unsplash 임시 이미지)
        if (!treatmentData.thumbnail_image) {
          treatmentData.thumbnail_image = getFallbackImage(treatmentData.name, 0, 800, 600);
        }
        
        if (!treatmentData.gallery_images || treatmentData.gallery_images.length === 0) {
          treatmentData.gallery_images = getTreatmentGalleryImages(treatmentData.name);
        }

        // 중복 체크 (hospital_id + slug 기준)
        const { data: existing } = await supabase
          .from('treatments')
          .select('id')
          .eq('hospital_id', treatmentData.hospital_id)
          .eq('slug', treatmentData.slug)
          .single();

        if (existing) {
          result.failed++;
          result.errors.push({
            row: rowIndex,
            errors: [`이미 존재하는 시술: ${treatmentData.slug}`],
          });
          continue;
        }

        // 삽입
        const { error: insertError } = await supabase
          .from('treatments')
          .insert(treatmentData);

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
        action: 'bulk_import_treatments',
        metadata: {
          entity_type: 'treatment',
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
    console.error('Treatment import error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
      },
      { status: 500 }
    );
  }
}

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

function generateSlug(name: string): string {
  // 한글 → 로마자 간단 변환 맵
  const korToRom: Record<string, string> = {
    '보톡스': 'botox',
    '필러': 'filler',
    '리프팅': 'lifting',
    '레이저': 'laser',
    '성형': 'plastic',
    '피부': 'skin',
    '주름': 'wrinkle',
    '탄력': 'elasticity',
    '시술': 'procedure',
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
    slug = 'treatment-' + Math.random().toString(36).substring(2, 10);
  }
  
  return slug.substring(0, 50);
}
