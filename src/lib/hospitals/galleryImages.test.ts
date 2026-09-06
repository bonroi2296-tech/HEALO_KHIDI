import { describe, it, expect } from "vitest";
import { normalizeImages, pickGalleryImages } from "./galleryImages";

describe("pickGalleryImages — 확장자를 지어내지 않는다", () => {
  it("정적 목록이 있으면 그대로(세브란스 3.webp · 고대구로 3.png)", () => {
    const out = pickGalleryImages({
      slug: "severance-sinchon", isPartner: true,
      staticImage: "/images/hospitals/severance-sinchon/1.jpg",
      staticGallery: ["/images/hospitals/severance-sinchon/2.jpg", "/images/hospitals/severance-sinchon/3.webp"],
      gallery_images: ["/images/hospitals/severance-sinchon/3.jpg"], // DB 가 틀려도 정적이 이긴다
    });
    expect(out).toEqual(["/images/hospitals/severance-sinchon/1.jpg", "/images/hospitals/severance-sinchon/2.jpg", "/images/hospitals/severance-sinchon/3.webp"]);
    expect(out.some((p) => p.endsWith("/3.jpg"))).toBe(false);
  });

  it("정적 목록이 없으면 DB(썸네일 → gallery_images → images), Postgres 배열 문자열도 읽는다", () => {
    const out = pickGalleryImages({
      slug: "korea-guro", isPartner: true,
      thumbnail_image: "/images/hospitals/korea-guro/1.jpg",
      gallery_images: "{/images/hospitals/korea-guro/2.jpg,/images/hospitals/korea-guro/3.png}",
      images: '["/images/hospitals/korea-guro/1.jpg","/images/hospitals/korea-guro/4.jpg"]',
    });
    expect(out).toEqual([
      "/images/hospitals/korea-guro/1.jpg", "/images/hospitals/korea-guro/2.jpg", "/images/hospitals/korea-guro/3.png", "/images/hospitals/korea-guro/4.jpg",
    ]);
  });

  it("아무 목록도 없을 때만 폴더 규칙 1~5.jpg (옛 동작 유지)", () => {
    const out = pickGalleryImages({ slug: "new-partner", isPartner: true });
    expect(out).toHaveLength(5);
    expect(out[2]).toBe("/images/hospitals/new-partner/3.jpg?v=3");
    expect(pickGalleryImages({ slug: "x", isPartner: false })).toEqual([]);
  });

  it("normalizeImages: 빈 값·이상값은 빈 배열", () => {
    expect(normalizeImages(null)).toEqual([]);
    expect(normalizeImages(["a", "", null])).toEqual(["a"]);
    expect(normalizeImages("not-json")).toEqual(["not-json"]);
    expect(normalizeImages(42)).toEqual([]);
  });
});
