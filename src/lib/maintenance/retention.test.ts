import { describe, it, expect } from "vitest";
import {
  RETENTION_YEARS,
  RETENTION_MONTHS,
  RETENTION_LABEL,
  expiryDate,
  isExpired,
  daysUntilExpiry,
} from "./retention";

describe("보관기간 — 달력 기념일로 잰다", () => {
  it("3년 뒤는 «같은 날짜»다 (일수 계산이면 하루 어긋난다)", () => {
    // 2028-03-01 에서 3*365 일을 더하면 2031-02-28 이다 — 2029 가 윤년이라 하루 모자란다.
    // 방침은 「3년」이라고 «달력»으로 약속했으니 2031-03-01 이어야 한다.
    const due = expiryDate("2028-03-01T00:00:00.000Z", 3);
    expect(due?.toISOString().slice(0, 10)).toBe("2031-03-01");
  });

  it("계약 기록 5년도 법정 최소(전자상거래법 §6)를 하루도 안 깎는다", () => {
    const due = expiryDate("2024-03-01T00:00:00.000Z", RETENTION_YEARS.contractRecords);
    expect(due?.toISOString().slice(0, 10)).toBe("2029-03-01");
  });

  it("2월 29일은 «없는 날»이라 3월 1일로 넘어간다 — 늦게 지우는 쪽이라 안전하다", () => {
    const due = expiryDate("2028-02-29T00:00:00.000Z", 3);
    expect(due?.toISOString().slice(0, 10)).toBe("2031-03-01");
  });
});

describe("의심스러우면 남긴다", () => {
  it.each([null, undefined, "", "어제쯤", "not-a-date"])("못 읽는 기준일(%s)은 파기 대상이 아니다", (v) => {
    expect(isExpired(v as never, 3)).toBe(false);
    expect(expiryDate(v as never, 3)).toBeNull();
    expect(daysUntilExpiry(v as never, 3)).toBeNull();
  });

  it("깨진 날짜로 Invalid Date 를 «화면에» 내보내지 않는다", () => {
    // 예전 판은 new Date(NaN) 을 그대로 돌려줘서 환자 화면에 «Invalid Date» 가 찍혔다.
    expect(expiryDate("깨진값", 3)).toBeNull();
  });
});

describe("만료 판정", () => {
  const since = "2020-01-01T00:00:00.000Z";
  it("기간이 지나면 참", () => {
    expect(isExpired(since, 3, new Date("2023-01-02T00:00:00.000Z"))).toBe(true);
  });
  it("기념일 «당일»은 아직 아니다 — 지나야 지운다", () => {
    expect(isExpired(since, 3, new Date("2023-01-01T00:00:00.000Z"))).toBe(false);
  });
  it("하루 전은 아직 아니다", () => {
    expect(isExpired(since, 3, new Date("2022-12-31T00:00:00.000Z"))).toBe(false);
  });
  it("남은 날수를 센다", () => {
    expect(daysUntilExpiry(since, 3, new Date("2022-12-30T00:00:00.000Z"))).toBe(2);
  });
});

describe("방침 문구와 붙어 있는 값", () => {
  it("검사 서류·문의 보관 기준이 하나다 (사람에게 설명 가능해야 한다)", () => {
    expect(RETENTION_YEARS.patientDocuments).toBe(RETENTION_YEARS.dormantInquiries);
  });

  it("6개 언어 표기가 다 있고, 전부 실제 햇수를 담고 있다", () => {
    const n = String(RETENTION_YEARS.patientDocuments);
    for (const lang of ["ko", "en", "ru", "kz", "zh", "ja"] as const) {
      expect(RETENTION_LABEL.patientDocuments[lang]).toContain(n);
    }
  });

  it("로그인 기록은 통신비밀보호법 §15-2 의 3개월", () => {
    expect(RETENTION_MONTHS.loginLogs).toBe(3);
  });
});
