import { describe, it, expect } from "vitest";
import { generateSlug, extractExistingSlug, resolveSlugForUpdate } from "./slug";

describe("generateSlug", () => {
  it("영문: 소문자·공백→하이픈·특수문자 제거", () => {
    expect(generateSlug("Hair Transplant")).toBe("hair-transplant");
    expect(generateSlug("  Spine & Joint  Center! ")).toBe("spine-joint-center");
    expect(generateSlug("A__B--C")).toBe("a-b-c");
  });

  it("빈 문자열/공백만 → item- 폴백", () => {
    expect(generateSlug("")).toMatch(/^item-\d+$/);
    expect(generateSlug("   ")).toMatch(/^item-\d+$/);
  });

  it("⚠️ 현재 동작 잠금: 한글은 \\w(ASCII)에서 제외돼 전부 제거 → item- 폴백 (JSDoc의 로마자 변환은 미구현)", () => {
    // JSDoc 예시 "강남 세브란스 병원"→"gangnam-..."는 사실과 다름. 실제론 한글 제거 후 폴백.
    expect(generateSlug("강남 세브란스 병원")).toMatch(/^item-\d+$/);
    // 영문이 섞이면 영문만 남는다
    expect(generateSlug("서울 ABC 클리닉")).toBe("abc");
  });
});

describe("extractExistingSlug", () => {
  it("기존 slug 반환, 없으면 null", () => {
    expect(extractExistingSlug({ slug: "abc" })).toBe("abc");
    expect(extractExistingSlug({})).toBeNull();
    expect(extractExistingSlug(null)).toBeNull();
  });
});

describe("resolveSlugForUpdate", () => {
  it("제공된 slug 우선(trim)", () => {
    expect(resolveSlugForUpdate("  new-slug  ", "old", "이름")).toBe("new-slug");
  });
  it("제공 없으면 기존 slug 유지", () => {
    expect(resolveSlugForUpdate(null, "old-slug", "Name")).toBe("old-slug");
    expect(resolveSlugForUpdate("   ", "old-slug", "Name")).toBe("old-slug");
  });
  it("둘 다 없으면 name에서 생성", () => {
    expect(resolveSlugForUpdate(undefined, undefined, "Hair Transplant")).toBe("hair-transplant");
  });
});
