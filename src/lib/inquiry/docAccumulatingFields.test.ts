import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * 이 시험이 지키는 것: 서류 판독 지시문이 「쌓이는 칸」과 「하나여야 하는 칸」을 가르는가.
 *
 * 2026-09-09 실사고. 한 파일에 권고가 셋 있었다 — 2019 이비인후과, 2022 심장내과,
 * 2023 의뢰의 재상담. 서로 어긋나는 게 아니라 셋 다 사실인데, 지시문의
 * 「어긋나면 최신 것만 취하고 절대 합치지 마라」가 권고 칸까지 덮어 2019 이비인후과 권고가
 * 버려졌다. 환자 호소가 «반복되는 대량 코피»였으니 그 줄이 파일에서 가장 쓸모 있는 한 줄이었다.
 *
 * ⚠️ 이 시험은 «지시문에 규칙이 살아 있는가»만 잰다. 모델이 실제로 지키는지는 못 잰다 —
 *    그건 판독 결과를 사람이 원본과 대조해야 안다. 규칙이 조용히 지워지는 것만 막는 관문이다.
 */
const PROMPT = fs.readFileSync(
  path.join(process.cwd(), "app/api/inquiry/classify-doc/route.ts"),
  "utf8"
);

describe("서류 판독 지시문 — 쌓이는 칸", () => {
  it("🔴 「최신 것만 취하라」가 단일값 칸에만 걸린다고 명시한다", () => {
    expect(PROMPT).toContain("SINGLE-VALUE fields");
    expect(PROMPT).toContain("ACCUMULATING fields");
    // 진단·병기는 단일값 쪽에 있어야 한다
    const single = PROMPT.slice(PROMPT.indexOf("SINGLE-VALUE fields"), PROMPT.indexOf("ACCUMULATING fields"));
    for (const f of ["diagnosisNameRaw", "icdCode", "stage"]) expect(single).toContain(f);
  });

  it("🔴 현지 의사 권고는 «전부 남기는» 칸으로 지정돼 있다", () => {
    const acc = PROMPT.slice(PROMPT.indexOf("ACCUMULATING fields"));
    expect(acc).toContain("localDoctorOpinion");
    expect(acc).toContain("testsAndTreatments");
  });

  it("권고를 날짜와 함께 «오래된 것부터» 남기라고 지시한다", () => {
    expect(PROMPT).toMatch(/PREFIXED WITH ITS DATE|prefixed with that document's date/);
    expect(PROMPT).toContain("oldest first");
  });

  it("표 안의 수치도 옮기라고 지시한다(심박수 101 유실 재발 방지)", () => {
    expect(PROMPT).toMatch(/Copy numbers out of tables/);
  });

  it("단일값 칸의 「합치지 마라」는 그대로 살아 있다", () => {
    // 병기가 두 개일 수는 없다 — 이쪽 규칙을 지우면 다른 사고가 난다.
    expect(PROMPT).toContain("Never merge");
    expect(PROMPT).toContain("cT4N1M1");
  });
});
