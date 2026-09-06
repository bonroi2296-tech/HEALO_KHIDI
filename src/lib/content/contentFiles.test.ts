import { describe, it, expect } from "vitest";
import {
  CONTENT_FILE_REGISTRY,
  CONTENT_FILE_KEYS,
  CONTENT_FILE_ROOTS,
  CONTENT_FILE_LANGS,
  getContentFileDefault,
} from "./contentFiles";
import { mergeContentFiles } from "./contentFileMerge";
import { IMMUNE_THERAPIES } from "@/lib/data/immuneTherapies";
import { ITCRN_FRAMEWORK } from "@/lib/data/immuneCancerDetails";

describe("콘텐츠 파일 등록부 — 코디가 고칠 수 있는 문구 목록", () => {
  it("치료법·5축·암종·FAQ·수술 후 관리·제휴 병원 문구가 전부 잡히고 키가 겹치지 않는다", () => {
    expect(CONTENT_FILE_REGISTRY.length).toBeGreaterThan(200);
    expect(CONTENT_FILE_KEYS.size).toBe(CONTENT_FILE_REGISTRY.length);
    for (const prefix of ["therapy", "itcrn", "cancer", "cancerFaq", "care", "hospital"]) {
      expect(CONTENT_FILE_REGISTRY.some((r) => r.prefix === prefix)).toBe(true);
    }
  });

  it("등록된 키는 전부 기본값 객체(ko 포함)로 풀린다", () => {
    for (const r of CONTENT_FILE_REGISTRY) {
      const def = getContentFileDefault(r.key);
      expect(def, r.key).not.toBeNull();
      expect(typeof (def as any).ko, r.key).toBe("string");
    }
    expect(getContentFileDefault("therapy.없는것.name")).toBeNull();
    expect(getContentFileDefault("home.hero.title")).toBeNull();
  });

  it("5축 요법 태그(치료법 name 참조)는 따로 등록하지 않는다 — 한 문구가 두 키로 뜨지 않게", () => {
    // 5축 배열 항목 중 «치료법 이름과 같은 것»은 참조라 빠져야 하고, 영양 프로그램처럼 독립 문구만 남는다.
    const therapyKo = new Set(Object.values(IMMUNE_THERAPIES).map((t: any) => t.name.ko));
    const arrayItems = CONTENT_FILE_REGISTRY.filter((r) => /^itcrn\.[a-z]+\.[a-zA-Z]+\.\d+$/.test(r.key));
    expect(arrayItems.length).toBeGreaterThan(0);
    for (const r of arrayItems) {
      expect(therapyKo.has((getContentFileDefault(r.key) as any).ko), r.key).toBe(false);
    }
    // 치료법 name 자체는 등록된다
    expect(CONTENT_FILE_KEYS.has("therapy.thymosin.name")).toBe(true);
    // 참조였던 자리(면역 축 세포면역 첫 태그 = 싸이모신)는 키가 없다
    expect(CONTENT_FILE_KEYS.has("itcrn.immunity.cellular.0")).toBe(false);
  });

  it("이름표는 코드가 아니라 «개체 이름 / 칸 이름»이다", () => {
    const r = CONTENT_FILE_REGISTRY.find((x) => x.key === "cancer.female.complications.0.name");
    expect(r?.label).toBe(`${(CONTENT_FILE_ROOTS.cancer as any).female.title.ko} / 합병증1 · 이름`);
    const h = CONTENT_FILE_REGISTRY.find((x) => x.key === "hospital.immunehospital-magok.description");
    expect(h?.label.startsWith("면력한방병원 강서점 / ")).toBe(true);
  });
});

describe("콘텐츠 파일 병합 — 코디 값이 화면에 가는 길", () => {
  const opt = { roots: CONTENT_FILE_ROOTS, langs: CONTENT_FILE_LANGS };

  it("오버라이드가 없으면 파일 값 그대로, 원본은 안 건드린다", () => {
    const m = mergeContentFiles([], opt);
    expect(m.therapies.thymosin.name.ru).toBe(IMMUNE_THERAPIES.thymosin.name.ru);
    m.therapies.thymosin.name.ru = "변조";
    expect(IMMUNE_THERAPIES.thymosin.name.ru).not.toBe("변조");
  });

  it("코디 값이 그 언어 칸만 덮는다 · 없는 키·다른 언어는 무시", () => {
    const m = mergeContentFiles(
      [
        { content_key: "cancer.female.title", lang: "ru", value: "Женские онкозаболевания" },
        { content_key: "cancer.female.없는칸", lang: "ru", value: "x" },
        { content_key: "cancer.female.title", lang: "xx", value: "x" },
        { content_key: "home.hero.title", lang: "ru", value: "x" },
      ],
      opt
    );
    expect(m.cancers.female.title.ru).toBe("Женские онкозаболевания");
    expect(m.cancers.female.title.ko).toBe((CONTENT_FILE_ROOTS.cancer as any).female.title.ko);
  });

  it("치료법 name 을 고치면 5축의 요법 태그에도 같이 번진다(같은 객체를 참조하던 자리)", () => {
    const m = mergeContentFiles([{ content_key: "therapy.thymosin.name", lang: "kz", value: "Тимозин α1 емі" }], opt);
    expect(m.therapies.thymosin.name.kz).toBe("Тимозин α1 емі");
    const idx = (ITCRN_FRAMEWORK as any).immunity.cellular.findIndex((n: any) => n.ko === IMMUNE_THERAPIES.thymosin.name.ko);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(m.itcrn.immunity.cellular[idx].kz).toBe("Тимозин α1 емі");
    // 다른 치료법 태그는 그대로
    const other = (ITCRN_FRAMEWORK as any).immunity.cellular.find((n: any) => n.ko !== IMMUNE_THERAPIES.thymosin.name.ko);
    expect(m.itcrn.immunity.cellular.find((n: any) => n.ko === other.ko).kz).toBe(other.kz);
  });
});
