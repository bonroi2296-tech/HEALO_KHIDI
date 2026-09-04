/**
 * healwith: 코디 음성 메모 보관함 (staff 전용)
 *
 *   GET    → 최근 100건 (전사본·요약·출처는 복호화해서 준다)
 *   POST   → 판독 결과를 남긴다
 *   DELETE → 한 건 지운다(?id=…) — 저장소 파일도 같이 지운다
 *
 * 왜 (2026-09-04 PO): 처음엔 화면에만 띄우고 안 남겼는데, 실무는 여러 건을 쌓아 두고
 * 「이건 누가 보낸 것」을 되짚는 일이었다.
 *
 * 🔒 voice_notes 는 service_role 전용 RLS → 브라우저가 직접 못 읽는다. 반드시 이 창구를 거친다.
 *    전사본에는 병력·이름·연락처가 그대로 들어가므로 저장 전에 암호화한다(inquiries 와 같은 방식).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";

const BUCKET = "attachments";
// 저장소 경로는 «우리 업로드 창구가 만든 모양»만 받는다 — 남의 파일 경로를 넣지 못하게.
const PATH_OK = /^inquiry\/[a-f0-9-]{36}_[A-Za-z0-9._-]{1,200}$/;

const dec = (v: string | null | undefined) => {
  try { return decryptStringNullable(v) || null; } catch { return null; }
};
const str = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("voice_notes")
      .select("id, created_at, file_name, byte_size, language, inquiry_id, source_label_encrypted, transcript_encrypted, summary_encrypted, uncertain, ask_next, fields, glossary")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[voice-notes] list error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const items = (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      fileName: r.file_name,
      byteSize: r.byte_size,
      language: r.language,
      inquiryId: r.inquiry_id,
      sourceLabel: dec(r.source_label_encrypted),
      transcript: dec(r.transcript_encrypted),
      summaryKo: dec(r.summary_encrypted),
      uncertain: r.uncertain || [],
      askNext: r.ask_next || [],
      fields: r.fields || {},
      glossary: r.glossary || [],
    }));
    return Response.json({ ok: true, items });
  } catch (err: any) {
    console.error("[voice-notes] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  let body: any;
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const storagePath = str(body?.storagePath, 400);
  const fileName = str(body?.fileName, 300);
  if (!storagePath || !fileName || !PATH_OK.test(storagePath)) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const inquiryId = Number.isInteger(body?.inquiryId) ? body.inquiryId : null;

  try {
    const { data, error } = await supabaseAdmin
      .from("voice_notes")
      .insert({
        created_by: auth.userId || null,
        storage_path: storagePath,
        file_name: fileName,
        byte_size: Number.isFinite(body?.byteSize) ? Math.round(body.byteSize) : null,
        source_label_encrypted: encryptStringNullable(str(body?.sourceLabel, 200)),
        inquiry_id: inquiryId,
        language: str(body?.language, 40),
        transcript_encrypted: encryptStringNullable(str(body?.transcript, 20000)),
        summary_encrypted: encryptStringNullable(str(body?.summaryKo, 4000)),
        uncertain: arr(body?.uncertain, 12),
        ask_next: arr(body?.askNext, 12),
        fields: body?.fields && typeof body.fields === "object" ? body.fields : {},
        glossary: arr(body?.glossary, 12),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[voice-notes] insert error:", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("[voice-notes] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  try {
    // 저장소 파일도 같이 치운다 — 표만 지우면 소리가 주인 없이 남는다.
    const { data: row } = await supabaseAdmin
      .from("voice_notes").select("storage_path").eq("id", id).single();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([row.storage_path]);
    }

    const { error } = await supabaseAdmin.from("voice_notes").delete().eq("id", id);
    if (error) {
      console.error("[voice-notes] delete error:", error.message);
      return Response.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
    console.info(`[voice-notes] deleted ${id} by ${auth.email || auth.userId}`);
    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[voice-notes] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
