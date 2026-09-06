import { describe, it, expect } from "vitest";
import { resolveMailLang, toBcp47 } from "./mailLang";

describe("resolveMailLang — 메일 템플릿 언어 판정 한 곳", () => {
  const kzKeyed = { ko: 1, ru: 1, kz: 1 };
  const kkKeyed = { ko: 1, ru: 1, kk: 1 };
  it("kz·kk·지역 꼬리·대문자·공백 → 템플릿에 있는 키(kz 든 kk 든)로", () => {
    for (const raw of ["kz", "kk", "kz-KZ", "kk-KZ", "KK", " Kz "]) {
      expect(resolveMailLang(raw, kzKeyed, "ko"), raw).toBe("kz");
      expect(resolveMailLang(raw, kkKeyed, "ko"), raw).toBe("kk");
    }
  });
  it("우리 6개 언어가 아니거나 템플릿에 없으면 fallback", () => {
    expect(resolveMailLang("xx", kzKeyed, "ko")).toBe("ko");
    expect(resolveMailLang(undefined, kzKeyed, "ru")).toBe("ru");
    expect(resolveMailLang("ja", kzKeyed, "ko")).toBe("ko"); // 템플릿에 ja 가 없으면 fallback
    expect(resolveMailLang("ru-RU", kzKeyed, "ko")).toBe("ru");
  });
  it("toBcp47: kz → kk, 나머지는 그대로", () => {
    expect(toBcp47("kz")).toBe("kk");
    expect(toBcp47("ru")).toBe("ru");
  });
});
