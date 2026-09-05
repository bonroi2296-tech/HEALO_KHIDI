import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { IMMUNE_HOSPITAL } from "./immuneHospitalInfo";

/**
 * 면력한방병원 소개 화면(`/hospitals/immune`)의 **숫자**를 지키는 검사.
 *
 * 🔴 왜 생겼나 (2026-07-29): 그 화면이 「환자 만족도 98% · 전담 의료진 7+」이라 적고,
 *    바로 밑에 「환자 만족도는 면력한방병원 자체 조사 결과입니다(2024.11.06 · 전지점)」라는
 *    **출처를 병원에 걸어** 뒀다. 그런데 병원이 그 조사 결과로 공개한 값은 **93.5%** 였고,
 *    전담 의료진도 병원 표기는 **19명** 이었다.
 *    → 출처는 남의 것, 숫자는 우리 것 = 단순 오타보다 나쁘다(남의 조사 결과를 부풀린 게 된다).
 *
 * 막는 방법: 화면 파일에 **숫자를 직접 적는 것 자체**를 금지하고, 값은 정보 파일 한 곳에서만 온다.
 * ⚠️ 이 검사가 못 잡는 것: 「병원이 값을 바꾼 것」. 자동 검사는 인터넷을 안 본다.
 *    병원 사이트가 바뀌면 `immuneHospitalInfo.js` 를 사람이 갱신해야 한다.
 */
describe("면력 소개 화면 — 숫자는 한 곳에서만 온다", () => {
  const 화면 = fs.readFileSync("app/hospitals/immune/ImmuneHospitalClient.jsx", "utf8");

  it("정보 파일이 병원 공개값을 그대로 들고 있다", () => {
    // 출처: immunehospital.com 「만족도 93.5%, 전담 의료진 19명」 (2024.11.06 전지점 조사)
    expect(IMMUNE_HOSPITAL.satisfactionRate).toBe("93.5%");
    expect(IMMUNE_HOSPITAL.dedicatedDoctors).toBe("19");
    expect(IMMUNE_HOSPITAL.satisfactionAsOf).toBe("2024-11-06");
    expect(IMMUNE_HOSPITAL.foundedYear).toBe(2017); // 병원 연혁: 2017년 개원
    expect(IMMUNE_HOSPITAL.cumulativeCases).toBe("50,000+");
  });

  it("🔴 통계 바에 숫자를 직접 적지 않았다 (값은 정보 파일에서만)", () => {
    // 통계 바 블록만 떼어 본다 — 페이지의 다른 곳(스타일 수치 등)까지 훑으면 오탐이 난다.
    const 시작 = 화면.indexOf("statCases");
    expect(시작, "통계 바를 못 찾았다 — 검사가 안 돈 것").toBeGreaterThan(-1);
    const 블록 = 화면.slice(화면.lastIndexOf("[", 시작), 화면.indexOf("].map(", 시작));
    // `num:` 뒤에 «따옴표로 감싼 숫자»가 오면 손으로 박은 것이다. "24/7" 처럼 숫자가 아닌 표기는 통과.
    const 손으로박은값 = [...블록.matchAll(/num:\s*"([^"]*)"/g)]
      .map((m) => m[1])
      .filter((v) => /\d/.test(v) && !/^\d+\/\d+$/.test(v));
    expect(
      손으로박은값,
      `화면에 숫자를 직접 적었다: ${손으로박은값.join(", ")} — src/lib/data/immuneHospitalInfo.js 로 옮겨라`,
    ).toEqual([]);
  });
});
