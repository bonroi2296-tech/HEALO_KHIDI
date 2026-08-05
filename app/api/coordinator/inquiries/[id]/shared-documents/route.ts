/**
 * healwith: 우리 → 환자 방향의 서류함 (staff 전용)
 *
 * 왜 필요한가 (2026-08-05, 문의 #60):
 *   원장님 2차 소견서와 사전상담 정리본(docx)을 만들어 놓고도 **환자에게 줄 통로가 없었다.**
 *   소견 「공개」는 에이전시 화면에만 뜨는데 이 환자는 에이전시도 계정도 없다(연락수단=전화).
 *   그래서 공개 케이스 링크(/claim/<token>) 에 붙일 서류함을 따로 만든다.
 *
 * GET    → 목록(+ 코디 확인용 서명 주소 1시간)
 * POST   → { phase:"sign", name, type, size } → 업로드 주소
 *          { phase:"commit", path, name, type, note } → 표에 기록(아직 «안 보임» 상태)
 * PATCH  → { docId, visible } 「환자에게 보이기」 켜기/끄기
 * DELETE → { docId } 기록·파일 삭제
 *
 * ⚠️ 올린다고 곧바로 환자에게 나가지 않는다 — PATCH 로 보이기를 켠 것만 공개 링크에 뜬다.
 *    공개 링크는 메신저로 굴러다닐 수 있어서, 실수 한 번이 곧 유출이 되지 않게 두 단계로 나눴다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";
import { DOC_LANGS, guessDocLang, withDownloadName } from "@/lib/documents/sharedDocMeta";

// ponytail: 새 표라 생성된 타입(src/types/database.types.ts)에 아직 없다 → `supabaseAdmin as any`.
//   5,300줄짜리 타입 파일을 통째로 다시 뽑으면 병렬 세션과 충돌한다. 옆 파일들(claim·opinions)도
//   같은 방식이다. 타입 파일을 다시 뽑는 날 이 캐스팅도 같이 걷어내면 된다.

const BUCKET = "attachments";
const MAX_SIZE = 50 * 1024 * 1024; // 소견서·안내문 수준. CT 원본을 여기 넣는 칸이 아니다.
const MAX_DOCS = 20;

// 환자가 폰에서 열 수 있어야 한다 → 문서·이미지만. 압축·의료영상은 여기 대상이 아니다.
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function parseId(raw: string): number | null {
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .select("id, file_name, title, lang, storage_path, mime, size_bytes, note, visible_to_patient, shared_at, created_at")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    // 코디가 「뭘 보냈는지」 열어볼 수 있게 서명 주소를 같이 내린다(1시간, 내려받기).
    const paths = rows.map((r: any) => r.storage_path).filter(Boolean);
    const signed = paths.length
      ? (await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, 3600)).data ?? []
      : [];
    const urlByPath = new Map(signed.map((s: any) => [s.path, s.signedUrl]));

    return Response.json({
      ok: true,
      documents: rows.map((r: any) => ({
        id: r.id,
        name: r.file_name,
        title: r.title,
        lang: r.lang,
        mime: r.mime,
        size: r.size_bytes,
        note: r.note,
        visible: r.visible_to_patient,
        sharedAt: r.shared_at,
        createdAt: r.created_at,
        url: withDownloadName(urlByPath.get(r.storage_path), String(r.file_name || "document")),
      })),
    });
  } catch (err) {
    console.error("[coordinator/shared-documents] GET:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const dir = `inquiry/${id}/shared`;

  try {
    const body = await request.json();

    // ── 1단계: 업로드 주소 발급 ──
    if (body.phase !== "commit") {
      const signed = await issueUploadUrl(body, {
        bucket: BUCKET,
        dir,
        allowed: ALLOWED_TYPES,
        maxBytes: MAX_SIZE,
      });
      if (!signed.ok) {
        return Response.json(
          { ok: false, error: signed.error, detail: signed.detail },
          { status: signed.status }
        );
      }
      return Response.json({
        ok: true,
        signedUrl: signed.signedUrl,
        path: signed.path,
        name: signed.name,
        type: signed.type,
      });
    }

    // ── 2단계: 올라간 파일 확인 후 기록 ──
    const path = String(body.path || "");
    if (!isOwnPath(dir, path)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }
    const type = normalizeMime(path, String(body.type || ""));
    const verified = await verifyUploaded(BUCKET, path, type, MAX_SIZE);
    if (!verified.ok) {
      return Response.json({ ok: false, error: verified.error }, { status: 400 });
    }

    const { count } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .select("id", { count: "exact", head: true })
      .eq("inquiry_id", id);
    if ((count ?? 0) >= MAX_DOCS) {
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return Response.json({ ok: false, error: "too_many_files" }, { status: 400 });
    }

    const { data: inserted, error: writeErr } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .insert({
        inquiry_id: id,
        file_name: String(body.name || path.split("/").pop() || "file").slice(0, 300),
        storage_path: path,
        mime: type,
        size_bytes: verified.size,
        note: String(body.note || "").slice(0, 200) || null,
        // 파일명에서 알아맞힌 «초깃값». 틀리면 코디가 화면에서 고친다.
        lang: guessDocLang(String(body.name || path)),
        uploaded_by: auth.userId,
      })
      .select("id, file_name, visible_to_patient")
      .single();

    if (writeErr) {
      console.error("[coordinator/shared-documents] insert:", writeErr.message);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, document: inserted });
  } catch (err) {
    console.error("[coordinator/shared-documents] POST:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const docId = String(body.docId || "");
    if (!docId) return Response.json({ ok: false, error: "doc_required" }, { status: 400 });

    // 보이기 토글과 이름·언어 수정이 같은 창구를 쓴다. **보낸 칸만** 바꾼다 —
    // 이름만 고치려는 요청이 「보이기」를 조용히 꺼 버리면 안 된다.
    const patch: Record<string, unknown> = {};
    if (typeof body.visible === "boolean") {
      patch.visible_to_patient = body.visible;
      patch.shared_at = body.visible ? new Date().toISOString() : null;
    }
    if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 120) || null;
    if ("lang" in body) {
      const l = String(body.lang || "");
      patch.lang = (DOC_LANGS as readonly string[]).includes(l) ? l : null;
    }
    if (!Object.keys(patch).length) {
      return Response.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .update(patch)
      .eq("id", docId)
      .eq("inquiry_id", id) // 다른 문의의 서류를 남의 문의에서 못 건드리게
      .select("id, title, lang, visible_to_patient, shared_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    return Response.json({ ok: true, document: data });
  } catch (err) {
    console.error("[coordinator/shared-documents] PATCH:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id == null) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const docId = String(body.docId || "");
    if (!docId) return Response.json({ ok: false, error: "doc_required" }, { status: 400 });

    const { data, error } = await (supabaseAdmin as any)
      .from("case_shared_documents")
      .delete()
      .eq("id", docId)
      .eq("inquiry_id", id)
      .select("storage_path")
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    if (data.storage_path) await supabaseAdmin.storage.from(BUCKET).remove([data.storage_path]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[coordinator/shared-documents] DELETE:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
