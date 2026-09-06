/**
 * 병원 상세 갤러리 사진 고르기 — 순수 함수.
 *
 * 왜 (2026-09-06 실서비스 404 로그): 옛 상세 화면이 제휴 병원을 «/images/hospitals/<slug>/1~5.jpg» 규칙으로 «지어내» 요청했다.
 *   세브란스는 3.webp, 고대구로는 3.png 라 세 번째 사진이 방문자마다 깨졌다(72시간 404 16건 = 실제 조회).
 *   화면에 들어오는 병원 객체(정적 partnerHospitals → initialData, 또는 DB → mapper)는 이미 올바른 확장자 목록을
 *   갖고 있었다 — 그 목록을 쓰고, 목록이 «비었을 때만» 옛 폴더 규칙으로 떨어진다.
 * 정규화는 mapper.js 의 normalizeImages 하나만 쓴다(같은 일을 두 벌로 하지 않는다 — 독립 리뷰 2026-09-06).
 */
import { normalizeImages } from "@/lib/mapper";

export interface GalleryInput {
  slug?: string | null;
  isPartner?: boolean;
  thumbnail_image?: string | null;
  gallery_images?: unknown;
  images?: unknown;
}

const FOLDER_SLOTS = [1, 2, 3, 4, 5] as const;

export function pickGalleryImages(h: GalleryInput): string[] {
  const listed = [h.thumbnail_image, ...normalizeImages(h.gallery_images), ...normalizeImages(h.images)].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  if (listed.length) return [...new Set(listed)];
  // 아무 목록도 없을 때만 폴더 규칙 — 없는 칸은 화면이 onError 로 자리표시자를 띄운다.
  if (h.isPartner && h.slug) return FOLDER_SLOTS.map((n) => `/images/hospitals/${h.slug}/${n}.jpg?v=3`);
  return [];
}
