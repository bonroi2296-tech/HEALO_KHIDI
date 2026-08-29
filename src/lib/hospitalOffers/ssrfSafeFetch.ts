/**
 * healwith: SSRF 방지 외부 URL fetch
 * - 허용 스킴: http, https 만
 * - 사설/로컬 IP 대역 차단
 * - 최대 응답 크기, 타임아웃 제한
 */

const ALLOWED_SCHEMES = ["http:", "https:"];
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB

// 사설/로컬 IP 패턴 (IPv4)
const PRIVATE_IPV4 =
  /^(?:127\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/;
const LOCALHOST = /^localhost$/i;

function getHostname(url: URL): string {
  try {
    return url.hostname;
  } catch {
    return "";
  }
}

function isPrivateOrLocal(hostname: string): boolean {
  if (!hostname) return true;
  if (LOCALHOST.test(hostname)) return true;
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return PRIVATE_IPV4.test(hostname);
  }
  // IPv6 local
  if (hostname === "[::1]" || hostname.startsWith("[fe80:")) return true;
  return false;
}

export interface SsrfFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
}

export interface SsrfFetchResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
}

/**
 * SSRF-safe fetch: scheme 검증, 사설 IP 차단, 타임아웃/크기 제한
 */
export async function ssrfSafeFetch(
  inputUrl: string,
  options: SsrfFetchOptions = {}
): Promise<SsrfFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    return { ok: false, error: "scheme_not_allowed" };
  }

  const hostname = getHostname(url);
  if (isPrivateOrLocal(hostname)) {
    return { ok: false, error: "private_or_local_ip_blocked" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // ⚠️ redirect:"follow" 는 «처음 주소»만 검사하고 3xx 로 옮겨간 주소는 그냥 따라간다 —
    //    외부 병원 주소가 169.254.169.254(클라우드 내부정보) 같은 데로 넘기면 뚫렸다(2026-08-14 감사).
    //    직접 따라가며 «옮겨갈 때마다» 같은 검사를 다시 한다.
    const MAX_REDIRECTS = 5;
    let current = url;
    let res: Response;
    for (let hop = 0; ; hop++) {
      res = await fetch(current.toString(), {
        signal: controller.signal,
        headers: options.headers ?? {},
        redirect: "manual",
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) break;
      if (hop >= MAX_REDIRECTS) {
        clearTimeout(timeoutId);
        return { ok: false, status: res.status, error: "too_many_redirects" };
      }
      let next: URL;
      try {
        next = new URL(location, current); // 상대 주소도 흡수
      } catch {
        clearTimeout(timeoutId);
        return { ok: false, status: res.status, error: "invalid_url" };
      }
      if (!ALLOWED_SCHEMES.includes(next.protocol)) {
        clearTimeout(timeoutId);
        return { ok: false, status: res.status, error: "scheme_not_allowed" };
      }
      if (isPrivateOrLocal(getHostname(next))) {
        clearTimeout(timeoutId);
        return { ok: false, status: res.status, error: "private_or_local_ip_blocked" };
      }
      current = next;
    }
    clearTimeout(timeoutId);

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      const len = parseInt(contentLength, 10);
      if (!Number.isNaN(len) && len > maxBytes) {
        return {
          ok: false,
          status: res.status,
          error: "response_too_large",
        };
      }
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      return {
        ok: false,
        status: res.status,
        error: "response_too_large",
      };
    }

    const body = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === "AbortError") {
      return { ok: false, error: "timeout" };
    }
    const cause = e?.cause?.message ?? e?.cause ?? "";
    const detail = cause ? ` (${String(cause).slice(0, 200)})` : "";
    return {
      ok: false,
      error: (e?.message ?? "fetch_failed") + detail,
    };
  }
}
