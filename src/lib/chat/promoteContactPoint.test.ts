import { describe, it, expect } from "vitest";
import { threadHasContactPoint } from "./publicChatHelpers";

// 2026-09-02: 연락 수단이 전무한 채팅이 문의로 승격돼 코디 인박스에 빈칸 줄로 쌓였다
// (#274·#275·#280·#286 — 넷 다 한국어 「접수해줘」, 진짜 문의 0건).
describe("threadHasContactPoint", () => {
  it("연락 수단이 하나도 없으면 승격하지 않는다", () => {
    expect(threadHasContactPoint({ channel: "web" })).toBe(false);
    expect(
      threadHasContactPoint({ channel: "web", guest_name: null, guest_email: null, guest_phone: "" })
    ).toBe(false);
  });

  it("이름·이메일·전화 중 하나라도 있으면 승격한다", () => {
    expect(threadHasContactPoint({ channel: "web", guest_name: "Aigerim" })).toBe(true);
    expect(threadHasContactPoint({ channel: "web", guest_email: "enc:xxx" })).toBe(true);
    expect(threadHasContactPoint({ channel: "web", guest_phone: "enc:xxx" })).toBe(true);
  });

  it("메신저 봇은 대화창 자체가 연락 수단이라 항상 승격한다", () => {
    expect(threadHasContactPoint({ channel: "telegram" })).toBe(true);
    expect(threadHasContactPoint({ channel: "whatsapp" })).toBe(true);
  });
});
