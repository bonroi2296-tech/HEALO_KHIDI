/**
 * 병원 상세 갤러리 사진 고르기 — 순수 함수.
 *
 * 왜 (2026-09-06 실서비스 404 로그): 제휴 병원은 «/images/hospitals/<slug>/1~5.jpg» 규칙으로 5칸을 «지어내» 요청했다.
 *   그런데 세브란스는 3.webp, 고대구로는 3.png 라 세 번째 사진이 방문자마다 깨졌다(72시간 404 16건 = 실제 페이지 조회).
 *   정적 파일(partnerHospitals.js)과 DB(gallery_images·images)엔 올바른 확장자가 있었다 — 그걸 먼저 쓰고,
 *   둘 다 없을 때만 옛 규칙으로 떨어진다.
 */
export function normalizeImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  if (typeof raw === "string") {
    const str = raw.trim();
    if (str.startsWith("[") && str.endsWith("]")) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      } catch {
        /* 아래 단일 경로 처리로 */
      }
    }
    // Postgres text[] 가 "{a,b}" 로 올 때
    if (str.startsWith("{") && str.endsWith("}")) {
      return str.slice(1, -1).split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
    }
    return [str];
  }
  return [];
}

export interface GalleryInput {
  slug?: string | null;
  isPartner?: boolean;
  /** DB 칸 */
  thumbnail_image?: string | null;
  gallery_images?: unknown;
  images?: unknown;
  /** 정적 partnerHospitals.js 칸(있으면 최우선 — 확장자가 실제 파일과 맞다) */
  staticImage?: string | null;
  staticGallery?: unknown;
}

const FOLDER_SLOTS = [1, 2, 3, 4, 5] as const;

export function pickGalleryImages(h: GalleryInput): string[] {
  const fromStatic = [h.staticImage, ...normalizeImages(h.staticGallery)].filter(Boolean) as string[];
  const fromDb = [h.thumbnail_image, ...normalizeImages(h.gallery_images), ...normalizeImages(h.images)].filter(Boolean) as string[];
  const chosen = fromStatic.length ? fromStatic : fromDb;
  if (chosen.length) return [...new Set(chosen)];
  // 아무 데도 사진 목록이 없을 때만 폴더 규칙 — 없는 칸은 화면이 onError 로 자리표시자를 띄운다.
  if (h.isPartner && h.slug) return FOLDER_SLOTS.map((n) => `/images/hospitals/${h.slug}/${n}.jpg?v=3`);
  return [];
}
