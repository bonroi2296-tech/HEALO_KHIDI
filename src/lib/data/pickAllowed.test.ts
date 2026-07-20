import { describe, it, expect } from "vitest";
import { pickAllowed } from "./pickAllowed";

type Row = { name_ko?: string; phone?: string; display_order?: number };

describe("pickAllowed — 허용 컬럼만 통과", () => {
  it("허용 목록에 있는 값만 가져온다", () => {
    const body = { name_ko: "서울점", phone: "02-1234", 몰래끼워넣기: "해킹" };
    expect(pickAllowed<Row>(body, ["name_ko", "phone"])).toEqual({
      name_ko: "서울점",
      phone: "02-1234",
    });
  });

  it("허용됐지만 안 보낸 키는 넣지 않는다 (undefined 로 덮어쓰기 방지)", () => {
    // 이게 중요하다: 없는 키를 undefined 로 넣으면 update 가 그 컬럼을 지워버릴 수 있다.
    const out = pickAllowed<Row>({ name_ko: "부산점" }, ["name_ko", "phone"]);
    expect(out).toEqual({ name_ko: "부산점" });
    expect("phone" in out).toBe(false);
  });

  it("명시적으로 보낸 null 은 통과시킨다 (값 비우기는 정당한 요청)", () => {
    expect(pickAllowed<Row>({ phone: null }, ["phone"])).toEqual({ phone: null });
  });

  it("본문이 객체가 아니면 빈 객체", () => {
    expect(pickAllowed<Row>(null, ["name_ko"])).toEqual({});
    expect(pickAllowed<Row>("문자열", ["name_ko"])).toEqual({});
    expect(pickAllowed<Row>(undefined, ["name_ko"])).toEqual({});
  });

  it("원본을 건드리지 않는다", () => {
    const body = { name_ko: "대구점" };
    pickAllowed<Row>(body, ["name_ko"]);
    expect(body).toEqual({ name_ko: "대구점" });
  });
});
