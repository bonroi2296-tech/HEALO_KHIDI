import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../src/lib/data/supabaseServerClient';
import { uploadLimiter } from '../../../../../../src/lib/api/rateLimiter';
import { sanitizeString } from '../../../../../../src/lib/api/sanitize';
import { resolveConsultationActor } from '../../../../../../src/lib/auth/requireConsultationAccess';
import { verifyFileMagic } from '../../../../../../src/lib/security/fileMagic';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/dicom',
];

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = sanitizeString(formData.get('documentType') as string, 50) || 'other';
    const description = sanitizeString(formData.get('description') as string, 500);

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `File type not allowed. Accepted: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `consultations/${consultationId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes 검증 — declared content-type 와 실제 파일 헤더가 일치하는지 확인.
    // `.pdf.exe` 같은 확장자 위장이나 content-type spoofing 차단.
    const magicCheck = verifyFileMagic(buffer, file.type);
    if (!magicCheck.ok) {
      console.warn(
        `[DocumentUpload] magic check failed: file=${file.name} declared=${file.type} reason=${magicCheck.reason}`
      );
      return NextResponse.json(
        { ok: false, error: 'File content does not match declared type' },
        { status: 400 }
      );
    }

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[DocumentUpload] Storage error:', uploadError);
      return NextResponse.json({ ok: false, error: 'Failed to upload file' }, { status: 500 });
    }

    // Save metadata to DB
    const { data: doc, error: dbError } = await supabase
      .from('consultation_documents')
      .insert({
        consultation_id: consultationId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
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
