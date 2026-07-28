import { describe, it, expect } from "vitest";
import { withOldValueDefaults } from "./changeLog";
import { getDefaultValueObject, REGISTRY_KEYS } from "./registry";
import { getI18nValues } from "@/lib/i18n";

const D = {
  isRegistryKey: (k: string) => REGISTRY_KEYS.has(k),
  getDefaultValueObject,
  getI18nValues,
} as any;

describe("withOldValueDefaults — 이력의 「이전 값」 보정", () => {
  it("첫 편집(old_value=null)이면 사전 기본값을 채우고 from_default 를 단다", () => {
    // 실제로 (없음) 으로 떴던 행 — 코디가 인테이크 암종 라벨을 처음 고친 건
    const [row]: any = withOldValueDefaults(
      [{ content_key: "intakeLabels.cancer.lung", lang: "ru", old_value: null }],
      D
    );
    expect(row.old_value).toBe("Лёгкое"); // 사전 원문 = 화면에 실제로 떠 있던 문구
    expect(row.from_default).toBe(true);
  });

  it("이미 오버라이드가 있던 편집은 저장된 이전 값을 그대로 둔다", () => {
    const [row]: any = withOldValueDefaults(
      [{ content_key: "intakeLabels.cancer.lung", lang: "ru", old_value: "Рак молочной железы" }],
      D
    );
    expect(row.old_value).toBe("Рак молочной железы");
    expect(row.from_default).toBeUndefined();
  });

  it("홈 트리와 경로가 겹치는 사전 키는 «사전» 값을 쓴다 (독립 리뷰 지적 — 순서 폴백이면 틀린 값)", () => {
    // process.title 은 홈 트리에도 같은 경로가 있다. 홈을 먼저 보면 «Как это работает» 가
    // 잡히지만, 이 키로 실제 화면에 떠 있던 문구는 사전의 «Ваш путь» 다.
    expect(REGISTRY_KEYS.has("process.title")).toBe(false); // = 사전 키
    const [row]: any = withOldValueDefaults(
      [{ content_key: "process.title", lang: "ru", old_value: null }],
      D
    );
    expect(row.old_value).toBe("Ваш путь");
    expect(row.old_value).not.toBe("Как это работает");
  });

  it("홈 레지스트리 키는 홈 기본값을 쓴다", () => {
    const key = [...REGISTRY_KEYS][0] as string;
    const expected = (getDefaultValueObject(key) as any)?.ru;
    const [row]: any = withOldValueDefaults([{ content_key: key, lang: "ru", old_value: null }], D);
    if (expected) expect(row.old_value).toBe(expected);
  });

  it("기본값을 못 찾는 키는 원본 그대로(화면은 «(빈칸)» 표시)", () => {
    const [row]: any = withOldValueDefaults(
      [{ content_key: "존재하지.않는.키", lang: "ru", old_value: null }],
      D
    );
    expect(row.old_value).toBeNull();
    expect(row.from_default).toBeUndefined();
  });
});
