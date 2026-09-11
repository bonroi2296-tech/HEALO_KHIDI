import { describe, it, expect, vi } from "vitest";
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

// 🛑 위 검사만으로는 부족하다. 실제 사전에 «<» 가 한 글자도 없으면 이스케이프가 통째로
//    무효여도 그냥 통과한다(헛도는 시험). 2026-09-10 에 실제로 그렇게 뚫렸다 —
//    ESCAPES 값의 백슬래시가 두 개에서 한 개로 줄어 "\\u003c" 가 «<» 자기 자신이 됐는데
//    CI 가 초록불이었다. 그래서 여기서는 «위험한 글자가 든 사전»을 일부러 밀어 넣는다.
describe("i18nDictJson — 위험한 글자가 사전에 들어왔을 때", () => {
  it("«</script» 를 그대로 내보내지 않는다", async () => {
    vi.resetModules();
    vi.doMock("./dictionary", () => ({
      DICTIONARY: {
        en: { danger: "</script><img src=x onerror=alert(1)>" },
        ru: { danger: "</script><img src=x onerror=alert(1)>" },
      },
    }));
    const { i18nDictJson: fn } = await import("./inlineScript");
    const out = fn(["ru"], "ru");

    expect(out).not.toContain("</script");
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c");
    // 두 번째 길(브라우저에서만 그려지는 화면)도 같은 문자열을 읽는다.
    expect(JSON.parse(out).ru.danger).toBe("</script><img src=x onerror=alert(1)>");

    vi.doUnmock("./dictionary");
    vi.resetModules();
  });

  it("U+2028/U+2029 도 남기지 않는다 (JS 소스에서 줄바꿈 취급 → 스크립트가 깨진다)", async () => {
    vi.resetModules();
    vi.doMock("./dictionary", () => ({
      DICTIONARY: {
        en: { sep: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c` },
        ru: { sep: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c` },
      },
    }));
    const { i18nDictJson: fn } = await import("./inlineScript");
    const out = fn(["ru"], "ru");

    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(out).ru.sep).toBe(`a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`);

    vi.doUnmock("./dictionary");
    vi.resetModules();
  });
});
