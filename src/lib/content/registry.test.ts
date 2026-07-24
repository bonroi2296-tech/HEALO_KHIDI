import { describe, it, expect } from "vitest";
import { HOME_CONTENT_REGISTRY, REGISTRY_KEYS, getDefaultValueObject, EDITABLE_LANGS } from "./registry";
import { normalizeForSearch } from "@/lib/i18n";

describe("HOME_CONTENT_REGISTRY 자동 생성", () => {
  it("옛 수동 목록의 키가 그대로 살아있다(하위호환 — 저장된 오버라이드가 계속 먹힘)", () => {
    for (const key of [
      "home.hero.badge",
      "home.hero.title",
      "home.stats.title",
      "home.stats.subtitle",
      "home.bottomCta.desc",
    ]) {
      expect(REGISTRY_KEYS.has(key), key).toBe(true);
    }
  });

  it("통계 카드 등 배열 항목 문구도 등록된다(#PO 신고: 카드 문구 검색 불가)", () => {
    expect(REGISTRY_KEYS.has("home.stats.items.0.label")).toBe(true);
    expect(HOME_CONTENT_REGISTRY.length).toBeGreaterThan(13); // 옛 수동 목록 = 13개
  });

  it("등록된 모든 키가 실제 HOME_CONTENT 경로로 풀린다(유령 키 없음)", () => {
    for (const r of HOME_CONTENT_REGISTRY) {
      const v = getDefaultValueObject(r.key);
      expect(v, r.key).not.toBeNull();
      expect(
        EDITABLE_LANGS.some((l) => typeof (v as any)[l] === "string"),
        r.key
      ).toBe(true);
    }
  });

  it("항목 라벨이 사람 읽는 형태다", () => {
    const item = HOME_CONTENT_REGISTRY.find((r) => r.key === "home.stats.items.0.label");
    expect(item?.section).toBe("통계");
    expect(item?.label).toBe("항목1 · 문구");
  });
});

describe("socialProof 사전 키 (SocialProofSection t() 마이그레이션)", () => {
  it("11개 키가 6개어 전부 값이 있다", async () => {
    const { getI18nValues } = await import("@/lib/i18n");
    const keys = [
      "socialProof.eyebrow", "socialProof.title", "socialProof.lede",
      "socialProof.stat1Big", "socialProof.stat1Sub",
      "socialProof.stat2Big", "socialProof.stat2Sub",
      "socialProof.stat3Big", "socialProof.stat3Sub",
      "socialProof.stat4Big", "socialProof.stat4Sub",
    ];
    for (const k of keys) {
      const v = getI18nValues(k);
      expect(v, k).not.toBeNull();
      for (const l of EDITABLE_LANGS) expect((v as any)[l], `${k}:${l}`).not.toBe("");
    }
  });
});

describe("normalizeForSearch — 줄바꿈/공백 차이 무시", () => {
  it("여러 줄 저장값을 화면 복사본(공백 연결)으로 찾는다", () => {
    const stored = "Рак желудка\n5-летняя выживаемость\n(№1 в мире)";
    const copied = "Рак желудка 5-летняя выживаемость";
    expect(normalizeForSearch(stored).includes(normalizeForSearch(copied))).toBe(true);
  });

  it("대소문자·앞뒤 공백 무시", () => {
    expect(normalizeForSearch("  Почему ИМЕННО Корея?  ")).toBe("почему именно корея?");
  });

  it("null/undefined 안전", () => {
    expect(normalizeForSearch(null)).toBe("");
    expect(normalizeForSearch(undefined)).toBe("");
  });
});
