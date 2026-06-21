import { describe, it, expect } from "vitest";
import { BoundedCache } from "./boundedCache";

describe("BoundedCache", () => {
  it("set/get 기본 동작", () => {
    const c = new BoundedCache<string, number>(3);
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
    expect(c.get("none")).toBeUndefined();
    expect(c.has("a")).toBe(true);
    expect(c.size).toBe(1);
  });

  it("상한 초과 시 가장 오래된 항목 제거", () => {
    const c = new BoundedCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3); // a 가 밀려남
    expect(c.has("a")).toBe(false);
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
    expect(c.size).toBe(2);
  });

  it("get 이 LRU 순서를 갱신(최근 접근은 살아남음)", () => {
    const c = new BoundedCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a");      // a 를 최신으로
    c.set("c", 3);   // 이제 b 가 가장 오래됨 → 제거
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
    expect(c.has("c")).toBe(true);
  });

  it("같은 키 재설정은 값 갱신 + 최신화(중복 증가 없음)", () => {
    const c = new BoundedCache<string, number>(2);
    c.set("a", 1);
    c.set("a", 9);
    expect(c.get("a")).toBe(9);
    expect(c.size).toBe(1);
  });

  it("max < 1 이면 생성 시 에러", () => {
    expect(() => new BoundedCache<string, number>(0)).toThrow();
  });
});
