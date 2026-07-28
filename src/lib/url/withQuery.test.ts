import { describe, it, expect } from "vitest";
import { withQuery } from "./withQuery";

describe("withQuery (리다이렉트에서 주소 뒤 꼬리표 보존)", () => {
  it("꼬리표가 없으면 경로 그대로", () => {
    expect(withQuery("/inquiry", {})).toBe("/inquiry");
    expect(withQuery("/inquiry", undefined)).toBe("/inquiry");
    expect(withQuery("/inquiry", null)).toBe("/inquiry");
  });

  it("⭐ 광고 꼬리표(utm)를 그대로 넘긴다 — 이게 유실되면 광고비 출처를 못 찾는다", () => {
    const out = withQuery("/inquiry", {
      utm_source: "yandex",
      utm_medium: "cpc",
      utm_campaign: "ru_lung_2608",
    });
    expect(out).toBe("/inquiry?utm_source=yandex&utm_medium=cpc&utm_campaign=ru_lung_2608");
  });

  it("같은 이름이 여러 번 와도 전부 보존", () => {
    expect(withQuery("/hospitals", { tag: ["a", "b"] })).toBe("/hospitals?tag=a&tag=b");
  });

  it("값이 없는 항목은 건너뛴다 (undefined 가 문자열로 새지 않게)", () => {
    expect(withQuery("/inquiry", { utm_source: "google", utm_term: undefined })).toBe(
      "/inquiry?utm_source=google"
    );
  });

  it("특수문자는 안전하게 인코딩된다", () => {
    expect(withQuery("/inquiry", { utm_campaign: "рак лёгких" })).toContain("utm_campaign=");
    expect(withQuery("/inquiry", { q: "a b&c" })).toBe("/inquiry?q=a+b%26c");
  });
});
