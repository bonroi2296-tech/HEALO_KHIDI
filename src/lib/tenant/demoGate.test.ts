import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { isTemplateDemoVisible } from "./demoGate.js";

/**
 * 판 시연 화면의 **노출 범위**를 지키는 검사.
 *
 * 2026-07-29 에 「프리뷰에서는 보이게」로 한 칸 열었다. 한 칸 열 때 제일 위험한 건
 * **옆칸까지 같이 열리는 것**이라, 여기서 «실서비스는 여전히 404» 를 못 박는다.
 * 이 검사가 빨개지면 = 남의 병원 목업이 healwith 실서비스에 공개됐다는 뜻이다.
 */
describe("판 시연 화면 — 노출 범위", () => {
  it("🔒 실서비스(Vercel production)에서는 안 보인다", () => {
    expect(isTemplateDemoVisible({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
  });

  it("🔒 실서비스 빌드인데 VERCEL_ENV 가 아예 없어도 안 보인다 (자체 호스팅·오설정 대비)", () => {
    // 왜: 「production 이 아니면 열린다」로 짜면 env 가 안 붙은 환경에서 통째로 열린다.
    //     막는 쪽이 기본값이어야 한다 — 열림은 «명시된 경우»에만.
    expect(isTemplateDemoVisible({ NODE_ENV: "production" })).toBe(false);
    expect(isTemplateDemoVisible({ NODE_ENV: "production", VERCEL_ENV: "" })).toBe(false);
    expect(isTemplateDemoVisible({ NODE_ENV: "production", VERCEL_ENV: "Preview" })).toBe(false); // 대문자 오타
  });

  it("✅ 프리뷰 빌드에서는 보인다 — PO 가 검토할 유일한 통로", () => {
    expect(isTemplateDemoVisible({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("✅ 로컬 개발에서는 보인다", () => {
    expect(isTemplateDemoVisible({ NODE_ENV: "development" })).toBe(true);
  });

  it("✅ ALLOW_TEMPLATE_DEMO=1 탈출구는 그대로 산다 (실서비스 영업용 링크가 필요해질 때)", () => {
    expect(isTemplateDemoVisible({ NODE_ENV: "production", VERCEL_ENV: "production", ALLOW_TEMPLATE_DEMO: "1" })).toBe(true);
    // "1" 이 아닌 값은 안 먹는다 — "true"·"yes" 로 켠 줄 알고 넘어가는 일 방지.
    expect(isTemplateDemoVisible({ NODE_ENV: "production", VERCEL_ENV: "production", ALLOW_TEMPLATE_DEMO: "true" })).toBe(false);
  });

  /* 🔴 두 화면이 **같은** 판정을 쓰는지 본다.
     예전엔 같은 조건문이 두 파일에 복사돼 있었다. 한쪽만 고치면 목록은 열리고 탭은 404 가 되는
     «반쪽 노출»이 나는데, 그건 노출보다 더 나쁘다 — PO 가 «링크 눌렀는데 안 나온다»만 겪는다.
     그래서 «각자 판단하지 않는다»를 검사로 박는다. */
  it("🧩 시연 화면 두 곳이 저마다 판단하지 않는다 (한 곳만 고쳐 반쪽만 열리는 일 방지)", () => {
    const 화면들 = ["app/demo/hospital/page.jsx", "app/demo/hospital/[slug]/page.jsx"];
    const 문제: string[] = [];
    for (const f of 화면들) {
      const s = fs.readFileSync(f, "utf8");
      if (!s.includes("isTemplateDemoVisible")) 문제.push(`${f}: 공용 판정을 안 쓴다`);
      if (/NODE_ENV\s*===\s*"production"/.test(s)) 문제.push(`${f}: 잠금 조건을 직접 다시 적었다`);
    }
    expect(문제, `시연 화면 잠금이 갈라졌다:\n${문제.join("\n")}`).toEqual([]);
  });
});
