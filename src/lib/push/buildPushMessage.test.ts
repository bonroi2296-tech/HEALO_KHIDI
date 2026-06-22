import { describe, it, expect } from "vitest";
import { buildPushMessage } from "./buildPushMessage";

describe("buildPushMessage", () => {
  it("토큰·알림 기본 구조를 만든다", () => {
    const msg = buildPushMessage("tok123", { title: "제목", body: "본문" });
    expect(msg).toEqual({
      message: { token: "tok123", notification: { title: "제목", body: "본문" } },
    });
  });

  it("data 값을 전부 문자열로 강제한다(FCM 규약)", () => {
    const msg = buildPushMessage("tok", {
      title: "t",
      body: "b",
      data: { consultationId: 123, route: "/consultation/123" },
    });
    expect(msg.message.data).toEqual({
      consultationId: "123",
      route: "/consultation/123",
    });
    // 숫자가 문자열로 바뀌었는지 타입까지 확인
    expect(typeof msg.message.data!.consultationId).toBe("string");
  });

  it("data 없으면 data 키를 넣지 않는다", () => {
    const msg = buildPushMessage("tok", { title: "t", body: "b" });
    expect("data" in msg.message).toBe(false);
  });
});
