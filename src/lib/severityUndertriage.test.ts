import { describe, it, expect } from "vitest";
import { extractSeverityFromQuery } from "./intakeExtract";
import { CHIEF_COMPLAINT_MAX, RAW_MESSAGE_MAX } from "./chat/publicChatHelpers";

/**
 * 이 시험이 지키는 것: 「심각한 글이 경증으로 기록되지 않는다」.
 *
 * 2026-09-09 실사고(문의 #328). 대량 비출혈 환자가 이렇게 적었는데 «경증(mild)»으로 저장됐다.
 * 옛 구현이 mild 를 맨 먼저 검사해 «첫 낱말»을 집었기 때문이다.
 */
const REAL_CASE =
  "Date/Time of onset:** Approximately 8:00 AM\n\n" +
  "At approximately 8:00 AM, I developed sudden nasal bleeding. Initially, the bleeding was mild, " +
  "with blood coming from my nose drop by drop. Within less than one minute, the bleeding rapidly " +
  "increased in volume and became significantly heavier.\n\n" +
  "I attempted to control the bleeding by manually closing/compressing my nose. However, when my " +
  "nose was closed, blood began to drain into and come out through my mouth. I subsequently began " +
  "vomiting blood.";

describe("extractSeverityFromQuery — 과소평가 방지", () => {
  it("🔴 실사고 원문이 severe 로 잡힌다 (옛 구현은 mild 였다)", () => {
    expect(extractSeverityFromQuery(REAL_CASE)).toBe("severe");
  });

  it("한 글에 mild 와 severe 가 같이 있으면 «높은 쪽»이 이긴다", () => {
    expect(extractSeverityFromQuery("it started mild but became severe")).toBe("severe");
    expect(extractSeverityFromQuery("mild at first, then moderate")).toBe("medium");
  });

  it("위험 신호는 환자가 스스로 「mild」라 적어도 이긴다", () => {
    expect(extractSeverityFromQuery("mild nosebleed, but I was vomiting blood")).toBe("severe");
    expect(extractSeverityFromQuery("slight pain, they called an ambulance")).toBe("severe");
    expect(extractSeverityFromQuery("minor, nasal packing was done")).toBe("severe");
  });

  it("러시아어 위험 신호도 잡는다 — 환자 대부분이 러시아어로 쓴다", () => {
    expect(extractSeverityFromQuery("началась рвота кровью")).toBe("severe");
    expect(extractSeverityFromQuery("сильное кровотечение из носа")).toBe("severe");
    expect(extractSeverityFromQuery("вызвали скорую помощь")).toBe("severe");
    expect(extractSeverityFromQuery("потерял сознание")).toBe("severe");
  });

  it("위험 신호는 환자가 매긴 점수보다도 앞선다", () => {
    // 사람은 자기 상태를 낮게 매기기도 한다. 토혈이 있으면 3/10 이어도 severe 다.
    expect(extractSeverityFromQuery("pain 3/10 but vomiting blood")).toBe("severe");
  });

  it("평범한 경증 표현은 그대로 mild 로 남는다 — 전부 severe 로 만들면 신호가 죽는다", () => {
    expect(extractSeverityFromQuery("mild headache for two days")).toBe("mild");
    expect(extractSeverityFromQuery("slight discomfort")).toBe("mild");
    expect(extractSeverityFromQuery("moderate pain")).toBe("medium");
  });

  it("아무 신호도 없으면 null", () => {
    expect(extractSeverityFromQuery("Hello, I would like to ask about hospitals")).toBeNull();
    expect(extractSeverityFromQuery("")).toBeNull();
  });

  it("환자가 매긴 점수 표기는 그대로 유지된다", () => {
    expect(extractSeverityFromQuery("pain is 7/10")).toBe("7/10");
  });
});

describe("환자 서술 길이 상한", () => {
  it("🔴 실사고 서술(1,256자)이 통째로 들어간다", () => {
    // 잘려 나간 뒷부분에 «비강 패킹·타 병원 이송»이 있었다.
    expect(CHIEF_COMPLAINT_MAX).toBeGreaterThanOrEqual(1256);
    expect(RAW_MESSAGE_MAX).toBeGreaterThanOrEqual(1256);
  });

  it("여러 턴을 이어 붙이므로 원문 보관 쪽이 더 넉넉하다", () => {
    expect(RAW_MESSAGE_MAX).toBeGreaterThan(CHIEF_COMPLAINT_MAX);
  });
});
