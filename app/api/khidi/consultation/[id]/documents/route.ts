import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/data/supabaseServerClient';
import { uploadLimiter } from '@/lib/api/rateLimiter';
import { sanitizeString } from '@/lib/api/sanitize';
import { resolveConsultationActor } from '@/lib/auth/requireConsultationAccess';
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from '@/lib/storage/directUpload';
import { withDownloadName } from "@/lib/documents/sharedDocMeta";

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/dicom',
];

// 예전엔 20MB 라고 적어놓고 실제로는 4.5MB 에서 끊겼다(서버 경유 방식의 Vercel 본문 한도).
// 지금은 브라우저 → Storage 직행이라 이 숫자가 진짜 상한이다(실측: 200MB 성공 / 201MB 거부).
const MAX_SIZE = 200 * 1024 * 1024;

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
        // 누가 올렸나 — 환자는 본인이 올린 것만 지울 수 있다(게스트 초대링크는 계정이 없어 null)
        uploaded_by: access.userId ?? null,
      })
      .select()
      .single();

    // 같은 commit 이 두 번 오면(브라우저 재전송) 유일 인덱스가 막는다 → 이미 저장된 그 줄을 돌려준다.
    // 이 갈래에선 파일을 절대 지우지 않는다 — 첫 줄이 그 파일을 쓴다(app/api/patient/documents 와 같은 처리).
    if (dbError?.code === '23505') {
      const { data: existing } = await supabase
        .from('consultation_documents')
        .select()
        .eq('storage_path', storagePath)
        .is('deleted_at', null)
        .maybeSingle();
      if (existing) return NextResponse.json({ ok: true, data: existing });
      return NextResponse.json({ ok: false, error: 'conflict' }, { status: 409 });
    }

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
      .is('deleted_at', null) // 환자가 지운 것(소프트 삭제)은 상담방에서도 안 보인다
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
        // 저장 이름은 «올릴 때 쓰던 이름»으로 — 저장소 열쇠의 임의값이 파일명이 되면
        // 받아 놓고도 어느 상담 서류인지 못 찾는다(2026-08-05 PO 지적, 환자 화면부터 고쳐 왔다).
        return {
          ...doc,
          url: withDownloadName(urlData?.signedUrl, String((doc as any).file_name || (doc as any).name || "document")),
        };
      }),
    );

    return NextResponse.json({ ok: true, data: docsWithUrls });
  } catch (error) {
    console.error('[DocumentList] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
