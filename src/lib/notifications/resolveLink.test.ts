import { describe, it, expect } from "vitest";
import { resolveNotificationLink } from "./resolveLink";

describe("resolveNotificationLink", () => {
  it("옛 chat_handoff 알림(목록 주소 + payload.threadId)을 그 대화로 보낸다", () => {
    expect(
      resolveNotificationLink({
        link: "/admin/chat",
        payload: { threadId: "ab869ad9-1111-2222-3333-444455556666" },
      })
    ).toBe("/admin/chat?thread=ab869ad9-1111-2222-3333-444455556666");
  });

  it("코디 뷰어도 같은 규칙", () => {
    expect(
      resolveNotificationLink({ link: "/coordinator/chat", payload: { threadId: "t1" } })
    ).toBe("/coordinator/chat?thread=t1");
  });

  it("이미 쿼리가 붙은 링크는 건드리지 않는다", () => {
    expect(
      resolveNotificationLink({ link: "/admin/chat?thread=already", payload: { threadId: "other" } })
    ).toBe("/admin/chat?thread=already");
  });

  it("threadId 가 없으면 원래 링크 그대로", () => {
    expect(resolveNotificationLink({ link: "/admin/chat", payload: {} })).toBe("/admin/chat");
    expect(resolveNotificationLink({ link: "/admin/chat" })).toBe("/admin/chat");
  });

  it("대화 뷰어가 아닌 주소에는 thread 를 붙이지 않는다", () => {
    expect(
      resolveNotificationLink({ link: "/admin/inquiries", payload: { threadId: "t1" } })
    ).toBe("/admin/inquiries");
  });

  it("옛 새문의 알림(목록 주소 + payload.inquiryId)을 그 문의로 보낸다", () => {
    expect(
      resolveNotificationLink({ link: "/admin/inquiries", payload: { inquiryId: 412 } })
    ).toBe("/admin/inquiries?inquiry=412");
  });

  it("문의 목록이 아닌 주소에는 inquiry 를 붙이지 않는다", () => {
    expect(
      resolveNotificationLink({ link: "/admin/consultations", payload: { inquiryId: 412 } })
    ).toBe("/admin/consultations");
  });

  it("링크가 없으면 null (클릭해도 이동 없음)", () => {
    expect(resolveNotificationLink({ link: null })).toBeNull();
    expect(resolveNotificationLink(null)).toBeNull();
  });

  it("코디 받은함은 상세가 /코디받은함/<번호> 라우트라 «경로»로 붙인다", () => {
    expect(
      resolveNotificationLink({ link: "/coordinator/inbox", payload: { inquiryId: 412 } })
    ).toBe("/coordinator/inbox/412");
  });

  it("코디 메시지함도 ?thread= 를 읽는다", () => {
    expect(
      resolveNotificationLink({ link: "/coordinator/messages", payload: { threadId: "t9" } })
    ).toBe("/coordinator/messages?thread=t9");
  });

  it("threadId 는 URL 로 안전하게 인코딩한다", () => {
    expect(
      resolveNotificationLink({ link: "/admin/chat", payload: { threadId: "a b&c" } })
    ).toBe("/admin/chat?thread=a%20b%26c");
  });
});
