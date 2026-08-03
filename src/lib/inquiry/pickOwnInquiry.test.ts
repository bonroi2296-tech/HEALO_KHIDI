import { describe, it, expect } from "vitest";
import { pickOwnInquiry } from "./pickOwnInquiry";

// 복호화 흉내 — 여기선 email 컬럼에 평문을 넣고 그대로 돌려준다.
const dec = (v: any) => (typeof v === "string" ? v : "");

describe("pickOwnInquiry — 문의 폼 자동채움 안전장치", () => {
  it("스태프가 «환자 대신» 낸 접수는 계정에 붙어 있어도 안 쓴다 (남의 개인정보 유출 방지)", () => {
    const rows = [
      { id: 58, email: "test@test.com", created_at: "2026-07-20" }, // 코디 계정에 붙어 있지만 남의 것
      { id: 47, email: "patient-a@gmail.com", created_at: "2026-07-10" },
    ];
    expect(pickOwnInquiry(rows, "assel@healwith.co.kr", dec)).toBeNull();
  });

  it("문의서 이메일이 계정 이메일과 같은 것만 고른다", () => {
    const rows = [
      { id: 2, email: "other@gmail.com", created_at: "2026-07-30" },
      { id: 1, email: "me@gmail.com", created_at: "2026-07-01" },
    ];
    expect(pickOwnInquiry(rows, "ME@Gmail.com ", dec)?.id).toBe(1);
  });

  it("본인 것이 여럿이면 가장 최근 것", () => {
    const rows = [
      { id: 1, email: "me@gmail.com", created_at: "2026-07-01" },
      { id: 3, email: "me@gmail.com", created_at: "2026-07-25" },
    ];
    expect(pickOwnInquiry(rows, "me@gmail.com", dec)?.id).toBe(3);
  });

  it("계정 이메일이 없거나 복호화가 실패하면 아무것도 안 쓴다", () => {
    const rows = [{ id: 1, email: "me@gmail.com", created_at: "2026-07-01" }];
    expect(pickOwnInquiry(rows, "", dec)).toBeNull();
    expect(pickOwnInquiry(rows, "me@gmail.com", () => "")).toBeNull();
  });
});
