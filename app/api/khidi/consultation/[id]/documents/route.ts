import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/data/supabaseServerClient';
import { uploadLimiter } from '@/lib/api/rateLimiter';
import { sanitizeString } from '@/lib/api/sanitize';
import { resolveConsultationActor } from '@/lib/auth/requireConsultationAccess';
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from '@/lib/storage/directUpload';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/dicom',
];

// 예전엔 20MB 라고 적어놓고 실제로는 4.5MB 에서 끊겼다(서버 경유 방식의 Vercel 본문 한도).
// 지금은 브라우저 → Storage 직행이라 이 숫자가 진짜 상한이다.
const MAX_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/khidi/consultation/[id]/documents
 * Upload a medical document (images, PDFs, DICOM) to Supabase Storage.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Rate limit uploads
    const limited = uploadLimiter.check(request);
    if (limited) return limited;

    const { id: consultationId } = await params;

    // 인증 + 참가자 검증 (계정 또는 게스트 초대토큰)
    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const body = await request.json();
    const documentType = sanitizeString(body.documentType, 50) || 'other';
    const description = sanitizeString(body.description, 500);

    const supabase = getSupabaseServerClient();
    const dir = `consultations/${consultationId}`;

    // ── 1단계: 서명 URL 발급 ──
    if (body.phase !== 'commit') {
      const signed = await issueUploadUrl(body, {
        bucket: 'documents',
        dir,
        allowed: ALLOWED_TYPES,
        maxBytes: MAX_SIZE,
      });
      if (!signed.ok) {
        return NextResponse.json(
          { ok: false, error: signed.error, detail: signed.detail },
          { status: signed.status },
        );
      }
      return NextResponse.json({
        ok: true,
        signedUrl: signed.signedUrl,
        path: signed.path,
        name: signed.name,
        type: signed.type,
      });
    }

    // ── 2단계: 올라간 파일 검증 + 기록 저장 ──
    const storagePath = String(body.path || '');
    if (!isOwnPath(dir, storagePath)) {
      return NextResponse.json({ ok: false, error: 'invalid_path' }, { status: 400 });
    }
    const fileType = normalizeMime(storagePath, String(body.type || ''));
    const verified = await verifyUploaded('documents', storagePath, fileType, MAX_SIZE);
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: verified.error }, { status: 400 });
    }

    // Save metadata to DB
    const { data: doc, error: dbError } = await supabase
      .from('consultation_documents')
      .insert({
        consultation_id: consultationId,
        file_name: sanitizeString(body.name, 200),
        file_type: fileType,
        file_size: verified.size, // 선언값이 아니라 실제 저장된 크기
        storage_path: storagePath,
        document_type: documentType,
        description,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[DocumentUpload] DB error:', dbError);
      // Clean up uploaded file on DB failure
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ ok: false, error: 'Failed to save document metadata' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: doc });
  } catch (error) {
    console.error('[DocumentUpload] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/khidi/consultation/[id]/documents
 * List all documents for a consultation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('consultation_documents')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DocumentList] error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to list documents' }, { status: 500 });
    }

    // Generate signed URLs for each document
    const docsWithUrls = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry
        return { ...doc, url: urlData?.signedUrl || null };
      }),
    );

    return NextResponse.json({ ok: true, data: docsWithUrls });
  } catch (error) {
    console.error('[DocumentList] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
