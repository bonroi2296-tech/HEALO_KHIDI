/**
 * HOSPITAL_OFFER_IMPORT_V1: 네이버·구글 검색 보조 수집
 * 병원 웹사이트만으로 부족할 때, 병원명으로 검색해 스니펫을 보강
 */

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "";

export function isNaverSearchAvailable(): boolean {
  return !!(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET);
}

function stripHtml(str: string): string {
  return (str || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 네이버 웹검색 API로 병원명 검색 후 스니펫 합쳐서 반환
 * NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 설정 시 사용
 */
export async function fetchNaverWebSearch(query: string): Promise<{
  text: string;
  itemCount: number;
}> {
  if (!isNaverSearchAvailable() || !query?.trim()) {
    return { text: "", itemCount: 0 };
  }

  try {
    const q = encodeURIComponent(query.trim());
    const url = `https://openapi.naver.com/v1/search/webkr.json?query=${q}&display=10&start=1`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn("[searchFallback] Naver API error:", res.status);
      return { text: "", itemCount: 0 };
    }

    const data = (await res.json()) as { items?: Array<{ title?: string; description?: string }> };
    const items = Array.isArray(data?.items) ? data.items : [];
    const snippets = items
      .map((i) => {
        const t = stripHtml(String(i.title || ""));
        const d = stripHtml(String(i.description || ""));
        return [t, d].filter(Boolean).join(": ");
      })
      .filter(Boolean);

    const text = snippets.length
      ? `[네이버 검색 "${query}" 결과]\n${snippets.join("\n")}`
      : "";
    return { text, itemCount: items.length };
  } catch (e) {
    console.warn("[searchFallback] Naver fetch failed:", (e as Error)?.message);
    return { text: "", itemCount: 0 };
  }
}
