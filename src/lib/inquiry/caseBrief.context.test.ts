/**
 * 브리프가 모델에게 «무엇을 넘기는가»를 지킨다.
 * 왜 따로 두나: 요약문에 값이 안 보인다고 해서 안 넘어간 건 아니다(모델이 안 쓴 것일 수 있다).
 * 둘을 못 가르면 「고쳤는데 안 고쳐진 것처럼」 보인다(2026-08-26 실제로 헷갈렸다).
 */
import { describe, it, expect } from "vitest";
import { buildContext } from "./caseBrief";

describe("buildContext — 코디가 확정한 진단코드", () => {
  it("코디 확정 코드가 자료에 들어가고, 환자가 적은 값과 이름이 갈린다", () => {
    const ctx = buildContext(
      {
        cancer_type: "colorectal",
        icd_code: "C18",
        referral: { version: "referral_v1", icdCode: "C18.2" },
      },
      "ko"
    );
    expect(ctx).toContain("icd_code (confirmed by coordinator): C18");
    expect(ctx).toContain("referral.icdCode: C18.2");
  });

  it("코디가 안 넣었으면 그 줄이 아예 없다 (빈 값을 넘기지 않는다)", () => {
    const ctx = buildContext({ cancer_type: "colorectal" }, "ko");
    expect(ctx).not.toContain("confirmed by coordinator");
  });
});
