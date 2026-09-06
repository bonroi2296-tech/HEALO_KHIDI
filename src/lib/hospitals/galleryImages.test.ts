import { describe, it, expect } from "vitest";
import { pickGalleryImages } from "./galleryImages";

describe("pickGalleryImages — 확장자를 지어내지 않는다", () => {
  it("병원 객체에 목록이 있으면 그대로(세브란스 3.webp · 고대구로 3.png) — 파트너여도 1~5.jpg 로 덮지 않는다", () => {
    const out = pickGalleryImages({
      slug: "severance-sinchon", isPartner: true,
      thumbnail_image: "/images/hospitals/severance-sinchon/1.jpg",
      gallery_images: ["/images/hospitals/severance-sinchon/2.jpg", "/images/hospitals/severance-sinchon/3.webp"],
      images: ["/images/hospitals/severance-sinchon/1.jpg", "/images/hospitals/severance-sinchon/3.webp"],
    });
    expect(out).toEqual(["/images/hospitals/severance-sinchon/1.jpg", "/images/hospitals/severance-sinchon/2.jpg", "/images/hospitals/severance-sinchon/3.webp"]);
    expect(out.some((p) => p.includes("3.jpg"))).toBe(false);
  });

  it("JSON 문자열 목록도 mapper 의 정규화로 읽고, 주소가 아닌 값은 버린다", () => {
    const out = pickGalleryImages({
      slug: "korea-guro", isPartner: true,
      gallery_images: '["/images/hospitals/korea-guro/2.jpg","/images/hospitals/korea-guro/3.png","not a url"]',
    });
    expect(out).toEqual(["/images/hospitals/korea-guro/2.jpg", "/images/hospitals/korea-guro/3.png"]);
  });

  it("아무 목록도 없을 때만 폴더 규칙 1~5.jpg(옛 동작 유지) · 파트너가 아니면 빈 배열", () => {
    const out = pickGalleryImages({ slug: "new-partner", isPartner: true, gallery_images: [], images: null });
    expect(out).toHaveLength(5);
    expect(out[2]).toBe("/images/hospitals/new-partner/3.jpg?v=3");
    expect(pickGalleryImages({ slug: "x", isPartner: false })).toEqual([]);
  });
});
