import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOME_CONTENT_REGISTRY, REGISTRY_KEYS, getDefaultValueObject, EDITABLE_LANGS } from "./registry";
import { HOME_CONTENT } from "./homeContent";
import { normalizeForSearch } from "@/lib/i18n";

describe("홈 의료진·파트너: 문구 배열 ↔ 메타 배열 길이 일치", () => {
  // 왜: 문구는 HOME_CONTENT.doctors/partners.items 에, 사진·slug 는 HomeClient 의
  // DOCTORS_META/PARTNERS_META 에 있고 **인덱스로 짝**을 맞춘다. 한쪽만 늘리거나 지우면
  // 의료진 사진이 조용히 빈칸이 되고, 파트너는 next/image 가 빈 src 로 하드 에러를 내
  // **홈 전체가 렌더 실패**한다. 길이 단언으로 그런 커밋을 CI에서 막는다(독립 리뷰 지적).
  const countMeta = (name: string) => {
    const src = readFileSync(join(process.cwd(), "app/home/HomeClient.jsx"), "utf8");
    const block = src.split(`const ${name} = [`)[1]?.split("];")[0] ?? "";
    return (block.match(/\{\s*(?:slug|img)/g) || []).length;
  };

  it("의료진: 문구 항목 수 = 사진 메타 수", () => {
    const n = countMeta("DOCTORS_META");
    expect(n).toBeGreaterThan(0);
    expect((HOME_CONTENT as any).doctors.items.length).toBe(n);
  });

  it("파트너 병원: 문구 항목 수 = slug·이미지 메타 수", () => {
    const n = countMeta("PARTNERS_META");
    expect(n).toBeGreaterThan(0);
    expect((HOME_CONTENT as any).partners.items.length).toBe(n);
  });
});

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

describe("공개 화면 문구 중앙 사전 이관 (#974) — 편집기에서 잡히는지", () => {
  // 왜: 이 키들이 사라지거나 언어가 빠지면 그 화면 문구가 편집기 밖으로 다시 나간다(POSTMORTEMS #118).
  // 화면당 대표 키 1개씩 — 이관이 통째로 되돌려지는 회귀를 잡는 게 목적.
  const SCREENS: Array<[string, string]> = [
    ["병원 목록", "hospitalsPage.cta"],
    ["병원 상세", "partnerHospital.about"],
    ["문의 퍼널", "inquiryFunnel.aiAgent"],
    ["인테이크", "intakeForm.fields.stage.label"],
    ["환자 교육", "patientEdu.page.title"],
    ["치료법", "treatmentsPage.title"],
    ["암종 상세", "cancerDetail.cta.intake"],
    ["환자 대시보드", "patientDash.consultationCta"],
    ["환자 메시지", "patientMessages.conversationFallback"],
    ["FAQ 문답", "faqData.category.visa"],
    ["원격협진", "telemedicine.heroTitle"],
    ["비용 계산기", "costCalc.heroTitle"],
    ["케어 저니", "careJourney.heroTitle"],
    ["신뢰 섹션", "socialProof.title"],
    ["쿠키 배너", "cookieConsent.title"],
    ["알림 벨", "notifBell.title"],
  ];

  it.each(SCREENS)("%s 문구가 6개어로 사전에 있다 (%s)", async (_name, key) => {
    const { getI18nValues } = await import("@/lib/i18n");
    const v = getI18nValues(key);
    expect(v, `${key} 가 사전에서 사라짐 — 이관이 되돌려졌는지 확인`).not.toBeNull();
    for (const l of EDITABLE_LANGS) {
      expect((v as any)[l], `${key}.${l} 이 빔`).toBeTruthy();
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
