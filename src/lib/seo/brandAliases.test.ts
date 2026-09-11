/**
 * 브랜드 별칭 — 사전(glossary)과 «짝»이 어긋나지 않게 잠근다.
 *
 * 잠그는 계약: 사전이 「본문에 쓰지 마라」(avoid)고 적어 둔 브랜드 철자는
 *   **전부 별칭 목록에 있어야 한다.** 안 그러면 그렇게 검색하는 사람을 통째로 놓친다.
 *
 * 왜 기계로 재나: 두 파일이 서로 반대말처럼 보여서(한쪽은 「쓰지 마라」, 한쪽은 「넣어라」)
 *   나중 세션이 한쪽만 보고 정리하기 쉽다. 사전에 철자를 하나 더 넣고 여기 안 넣으면
 *   빨간불이 나게 해서, 둘이 늘 같이 움직이게 만든다.
 */
import { describe, it, expect } from "vitest";
import { BRAND_CANONICAL, BRAND_ALIASES, BRAND_NAME_FORMS } from "./brandAliases";
import { GLOSSARY } from "@/lib/i18n/glossary";

const brandEntry: any = (GLOSSARY as any[]).find((g) => g.id === "brand.healwith");

describe("브랜드 별칭", () => {
  it("사전의 brand.healwith 항목이 아직 있다 (없어졌으면 이 검사의 전제가 깨진 것)", () => {
    expect(brandEntry).toBeTruthy();
    expect(brandEntry.use.ru).toBe(BRAND_CANONICAL);
  });

  it("사전이 「쓰지 마라」고 한 철자는 전부 별칭으로 검색되게 돼 있다", () => {
    const avoided: string[] = Object.values(brandEntry.avoid || {}).flat() as string[];
    expect(avoided.length).toBeGreaterThan(0);
    // 끝의 * 는 어간 매칭 표식이라 떼고 본다. 라틴 글자가 섞인 동형이의 오타(Хилвиc)는
    // 사람이 «칠 수 있는» 글자가 아니라 붙여넣기로만 생기므로 별칭에서 제외한다.
    const HOMOGLYPH = /[a-zA-Z]/;
    const needed = [...new Set(avoided.map((w) => w.replace(/\*$/, "")))].filter((w) => !HOMOGLYPH.test(w));
    const missing = needed.filter((w) => !BRAND_ALIASES.includes(w));
    expect(missing, `사전 avoid 에 있는데 별칭에 없다: ${missing.join(", ")}`).toEqual([]);
  });

  it("정식명은 별칭 목록에 «중복»으로 들어가지 않는다", () => {
    expect(BRAND_ALIASES).not.toContain(BRAND_CANONICAL);
    expect(BRAND_NAME_FORMS[0]).toBe(BRAND_CANONICAL);
    expect(new Set(BRAND_NAME_FORMS).size).toBe(BRAND_NAME_FORMS.length);
  });

  it("한글 병기 표기가 빠지지 않는다 (네이버 브랜드 검색의 유일한 통로)", () => {
    expect(BRAND_ALIASES).toContain("힐위드");
  });
});
