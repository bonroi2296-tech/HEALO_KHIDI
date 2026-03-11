/**
 * HEALO: SSRF 방지 외부 URL fetch
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
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: options.headers ?? {},
      redirect: "follow",
    });
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
