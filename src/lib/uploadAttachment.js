/**
 * 파일 업로드 (브라우저 전용) — 업로드가 있는 화면은 전부 이걸 쓴다.
 *
 * 브라우저 → Supabase Storage 직행. 서버(Vercel 함수)를 거치면 4.5MB 에서 413 으로 끊긴다.
 * 서버는 서명 URL 발급(앞)과 위장 검사(뒤)만 한다 — 상세는 src/lib/storage/directUpload.ts.
 *
 * 반환: { ok: true, ...서버 commit 응답 } | { ok: false, error }
 *   error: file_too_large | invalid_file_type | invalid_file_content | rate_limited | upload_failed
 */

export const MAX_ATTACHMENT_BYTES = 200 * 1024 * 1024;
export const MAX_ATTACHMENT_MB = 200;

// Vercel 413 등은 JSON 이 아니라 HTML/평문으로 온다. res.json() 을 그냥 부르면 예외가 터져
// 호출부가 «아무 메시지도 없이» 조용히 실패했다(문의 #60 때 실제로 그랬다).
async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return { ok: false, error: res.status === 413 ? "file_too_large" : "upload_failed" };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 429 응답이 알려주는 «언제 다시 오라»를 초로. 헤더가 없으면 짧게 잡고 다시 본다. */
function retryAfterMs(res) {
  const after = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(after) && after > 0) return Math.min(after * 1000 + 500, 70_000);
  const reset = Date.parse(res.headers.get("X-RateLimit-Reset") || "");
  if (Number.isFinite(reset)) return Math.min(Math.max(reset - Date.now(), 0) + 500, 70_000);
  return 5_000;
}

/**
 * 창구에 요청을 보내되, 분당 상한(429)에 걸리면 창이 열릴 때까지 기다렸다 다시 보낸다.
 *
 * 왜: 파일 하나에 이 창구를 «두 번»(sign·commit) 쓴다. 상한이 분당 20회면 실질 상한은
 * 파일 10개다. 2026-09-08 실서비스에서 실제 환자 서류(PDF 44장)를 올리다 429 가 났고,
 * 화면엔 「올리지 못했습니다」만 떠서 사유도 안 보였다. 재시도가 없으면 사람이 몇 장이
 * 올라갔는지 세어 가며 손으로 다시 올려야 한다 — 의료 서류에서 제일 위험한 실패다.
 */
async function postWithRetry(doFetch, endpoint, body, onWait) {
  for (let attempt = 0; ; attempt++) {
    const res = await doFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt >= 5) return readJson(res);
    const wait = retryAfterMs(res);
    // 화면이 「멈췄나」로 읽지 않게 기다리는 중임을 알린다.
    if (onWait) onWait(Math.ceil(wait / 1000));
    await sleep(wait);
  }
}

/**
 * @param endpoint  sign/commit 두 단계를 모두 받는 API 주소
 * @param file      File 객체
 * @param extra     화면별 부가 필드(consultationId, docType …) — 두 단계 모두에 함께 보냄
 * @param opts.fetch  인증 헤더가 필요한 화면용 fetch 대체 함수
 * @param opts.onProgress  0~1 진행률 콜백 (50MB 업로드는 몇 분 걸린다 — 표시 없으면 멈춘 줄 안다)
 * @param opts.onWait  분당 상한에 걸려 기다리는 중임을 알리는 콜백(남은 초). 없어도 동작은 같다.
 */
export async function uploadDirect(endpoint, file, extra = {}, opts = {}) {
  const doFetch = opts.fetch || fetch;
  if (!file) return { ok: false, error: "file_required" };

  try {
    // 1) 서명 URL 발급
    const sign = await postWithRetry(
      doFetch,
      endpoint,
      { phase: "sign", name: file.name, type: file.type, size: file.size, ...extra },
      opts.onWait
    );
    if (!sign.ok) return sign;

    // 2) Storage 직행 업로드
    const put = await putWithProgress(sign.signedUrl, file, sign.type, opts.onProgress);
    if (!put.ok) return put;

    // 3) 서버가 실제 파일 앞부분을 읽어 위장 검사 (실패하면 서버가 지운다)
    //    ⚠️ 여기서 포기하면 파일은 저장소에 올라가 있는데 기록이 없는 «떠도는 파일»이 된다.
    //    그래서 commit 은 sign 보다 더 끈질기게 재시도해야 한다.
    const commit = await postWithRetry(
      doFetch,
      endpoint,
      {
        phase: "commit",
        path: sign.path,
        name: sign.name,
        type: sign.type,
        size: file.size,
        ...extra,
      },
      opts.onWait
    );
    if (!commit.ok) return commit;

    return { path: sign.path, name: sign.name, type: sign.type, ...commit };
  } catch (e) {
    console.warn("[uploadDirect] failed:", e);
    return { ok: false, error: "upload_failed" };
  }
}

// 진행률이 필요하면 XHR(진행 이벤트를 주는 유일한 방법), 아니면 fetch.
function putWithProgress(url, file, contentType, onProgress) {
  const type = contentType || file.type || "application/octet-stream";
  if (!onProgress) {
    return fetch(url, { method: "PUT", headers: { "content-type": type }, body: file }).then((r) =>
      r.ok ? { ok: true } : { ok: false, error: r.status === 413 ? "file_too_large" : "upload_failed" }
    );
  }
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      resolve(
        xhr.status >= 200 && xhr.status < 300
          ? { ok: true }
          : { ok: false, error: xhr.status === 413 ? "file_too_large" : "upload_failed" }
      );
    xhr.onerror = () => resolve({ ok: false, error: "upload_failed" });
    xhr.send(file);
  });
}

/** 문의 첨부(공개 인테이크·에이전시·코디 소견) 전용 단축형. */
export function uploadAttachment(file, opts = {}) {
  if (file && file.size > MAX_ATTACHMENT_BYTES) return Promise.resolve({ ok: false, error: "file_too_large" });
  return uploadDirect("/api/attachments/upload", file, {}, opts);
}
