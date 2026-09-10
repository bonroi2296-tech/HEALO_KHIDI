import { describe, it, expect } from "vitest";
import { i18nDictJson } from "./inlineScript";

// 이 문자열은 «두 곳»에서 읽힌다. 한쪽만 맞으면 404 화면에서 번역이 통째로 빈다.
//  ① <script>window.__I18N__=…</script>  — 보통 화면(서버 렌더)
//  ② JSON.parse(…)                       — 브라우저에서만 그려지는 화면(app/_components/I18nDict.jsx)
describe("i18nDictJson", () => {
  const json = i18nDictJson(["ru"], "ru");

  it("JSON.parse 로 읽힌다 (404 경로가 쓰는 길)", () => {
    const parsed = JSON.parse(json);
    expect(parsed.__primary).toBe("ru");
    expect(parsed.ru["footer.company"]).toBeTruthy();
    // 그 언어에 없는 키는 en 으로 메워진 「완성본」이어야 한다.
    expect(Object.keys(parsed.ru).length).toBeGreaterThan(2000);
  });

  it("<script> 안에서 위험한 글자를 남기지 않는다", () => {
    expect(json).not.toMatch(/[<\u2028\u2029]/);
  });

  it("여러 언어를 한 번에 담는다", () => {
    const parsed = JSON.parse(i18nDictJson(["ru", "ko"], "ru"));
    expect(parsed.ko["footer.company"]).toBeTruthy();
    expect(parsed.ru["footer.company"]).not.toBe(parsed.ko["footer.company"]);
  });
});
