import { describe, it, expect } from "vitest";
import { khidiCountState, KHIDI_COUNTED_TYPES } from "./countState";

/**
 * 왜 이 시험이 있나 (2026-07-29):
 * 실측 결과 사전상담 방 66개 중 「완료」 표시가 1개뿐이라 공식 실적 K-02 가 1 이었다.
 * 화면이 그 사실을 안 알려준 게 원인이라 배지를 붙였는데,
 * **처음엔 그 배지 문구 자체가 틀렸다**(「문의 미연결 = 실적 0」이라고 적었으나 실제로는 아니다).
 * 집계가 두 군데인데 조건이 다르다 — 그 차이가 조용히 뒤집히면 화면이 또 거짓말을 한다 → 기계로 박는다.
 */
describe("khidiCountState — 실적 집계 판정", () => {
  it("파트너 미팅·긴급 상담은 애초에 집계 대상이 아니다(배지도 안 띄운다)", () => {
    expect(khidiCountState({ session_type: "partner_meeting", inquiry_id: 1, status: "completed" })).toBeNull();
    expect(khidiCountState({ session_type: "emergency", inquiry_id: 1, status: "completed" })).toBeNull();
  });

  it("🔴 공식 실적을 0 으로 만드는 건 «완료 아님» 하나뿐이다", () => {
    // 문의가 붙어 있어도 완료가 아니면 K-02·K-04 에 안 잡힌다.
    expect(khidiCountState({ session_type: "pre_consultation", inquiry_id: 41, status: "scheduled" })).toBe("notCounted");
    expect(khidiCountState({ session_type: "follow_up", inquiry_id: 41, status: "active" })).toBe("notCounted");
    // 문의도 없고 완료도 아니면 — 더 아픈 쪽인 「완료 아님」을 먼저 알린다.
    expect(khidiCountState({ session_type: "pre_consultation", inquiry_id: null, status: "scheduled" })).toBe("notCounted");
  });

  it("완료됐는데 문의 미연결이면 «실적엔 잡히되 유치 추적이 끊긴다»", () => {
    // ⚠️ 이걸 「실적 0」이라 표시하면 거짓말이다 — kpi.ts 는 inquiry_id 를 안 본다.
    expect(khidiCountState({ session_type: "pre_consultation", inquiry_id: null, status: "completed" })).toBe("noLink");
    expect(khidiCountState({ session_type: "follow_up", inquiry_id: undefined, status: "completed" })).toBe("noLink");
  });

  it("완료 + 문의 연결이면 실적도 유치 추적도 온전하다", () => {
    expect(khidiCountState({ session_type: "pre_consultation", inquiry_id: 41, status: "completed" })).toBe("counted");
    expect(khidiCountState({ session_type: "follow_up", inquiry_id: "42", status: "completed" })).toBe("counted");
  });

  it("빠진 값이 들어와도 터지지 않는다", () => {
    expect(khidiCountState({})).toBeNull();
    expect(khidiCountState({ session_type: null })).toBeNull();
  });

  // 이 목록이 조용히 바뀌면 화면과 서버 집계가 어긋난다 → 바꿀 때 이 시험이 먼저 걸린다.
  it("집계 대상 유형은 사전상담·사후관리 둘뿐이다 (kpi.ts 와 짝)", () => {
    expect([...KHIDI_COUNTED_TYPES]).toEqual(["pre_consultation", "follow_up"]);
  });
});
