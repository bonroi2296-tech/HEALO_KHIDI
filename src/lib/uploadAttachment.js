/**
 * 첨부파일 업로드 (브라우저 전용) — 모든 화면이 이걸 쓴다.
 *
 * 브라우저 → Supabase Storage 직행. 서버(Vercel 함수)를 거치면 4.5MB 에서 413 으로 끊긴다.
 * 서버는 서명 URL 발급(앞)과 위장 검사(뒤)만 한다 — 상세는 app/api/attachments/upload/route.ts.
 *
 * 반환: { ok: true, path, name, type } | { ok: false, error }
 *   error: file_too_large | invalid_file_type | invalid_file_content | rate_limited | upload_failed
 */

export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAX_ATTACHMENT_MB = 50;

// Vercel 413 등은 JSON 이 아니라 HTML/평문으로 온다. res.json() 을 그냥 부르면 예외가 터져
// 호출부가 «아무 메시지도 없이» 조용히 실패했다(문의 #60 때 실제로 그랬다).
async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return { ok: false, error: res.status === 413 ? "file_too_large" : "upload_failed" };
  }
}

export async function uploadAttachment(file) {
  if (!file) return { ok: false, error: "file_required" };
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: "file_too_large" };

  try {
    // 1) 서명 URL 발급
    const sign = await readJson(
      await fetch("/api/attachments/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      })
    );
    if (!sign.ok) return sign;

    // 2) Storage 직행 업로드
    const put = await fetch(sign.signedUrl, {
      method: "PUT",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) return { ok: false, error: put.status === 413 ? "file_too_large" : "upload_failed" };

    // 3) 서버가 실제 파일 앞부분을 읽어 위장 검사 (실패하면 서버가 지운다)
    const confirm = await readJson(
      await fetch("/api/attachments/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPath: sign.path, type: file.type }),
      })
    );
    if (!confirm.ok) return confirm;

    return { ok: true, path: sign.path, name: sign.name, type: sign.type };
  } catch (e) {
    console.warn("[uploadAttachment] failed:", e);
    return { ok: false, error: "upload_failed" };
  }
}
