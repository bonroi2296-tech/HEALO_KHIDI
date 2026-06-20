import { describe, it, expect } from "vitest";
import { normalizeInquiryStatus, INQUIRY_STATUS_VALUES } from "./inquiryStatus";

describe("normalizeInquiryStatus", () => {
  it("유효한 영문 값은 그대로(대소문자 무시·trim)", () => {
    expect(normalizeInquiryStatus("pending")).toBe("pending");
    expect(normalizeInquiryStatus("COMPLETED")).toBe("completed");
    expect(normalizeInquiryStatus("  blocked  ")).toBe("blocked");
  });

  it("한글/혼용 값은 허용된 영문으로 매핑", () => {
    expect(normalizeInquiryStatus("대기중")).toBe("pending");
    expect(normalizeInquiryStatus("대기")).toBe("pending");
    expect(normalizeInquiryStatus("수신")).toBe("received");
    expect(normalizeInquiryStatus("완료")).toBe("completed");
    expect(normalizeInquiryStatus("차단")).toBe("blocked");
    expect(normalizeInquiryStatus("정규화완료")).toBe("normalized");
    expect(normalizeInquiryStatus("에러")).toBe("error");
  });

  it("null·undefined·빈문자·알 수 없는 값 → 안전 기본값 received", () => {
    expect(normalizeInquiryStatus(null)).toBe("received");
    expect(normalizeInquiryStatus(undefined)).toBe("received");
    expect(normalizeInquiryStatus("")).toBe("received");
    expect(normalizeInquiryStatus("   ")).toBe("received");
    expect(normalizeInquiryStatus("ㅁㄴㅇㄹ")).toBe("received");
    // @ts-expect-error 잘못된 타입도 던지지 않고 기본값
    expect(normalizeInquiryStatus(123)).toBe("received");
  });

  it("반환값은 항상 허용된 집합 안에 있다(DB 오염 방지)", () => {
    const inputs = ["pending", "대기중", null, "x", "ERROR", "정규화", ""];
    for (const i of inputs) {
      expect(INQUIRY_STATUS_VALUES).toContain(normalizeInquiryStatus(i as string));
    }
  });
});
