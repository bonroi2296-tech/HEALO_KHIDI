/**
 * 알림을 눌렀을 때 «실제로 열어야 할 주소».
 *
 * 왜 따로 있나 (2026-08-28 PO 제보 — "알림와서 들어갔는데 문의 내용 조회가 안된다"):
 *   `chat_handoff` 알림은 어느 대화인지를 `payload.threadId` 로만 들고 있었고 `link` 는
 *   목록 주소(`/admin/chat`)였다. 그래서 알림을 눌러도 100건짜리 목록만 열리고 «그 대화»로는
 *   못 갔다. 발송부(inApp.ts)는 고쳤지만 **이미 발송돼 DB 에 쌓인 알림들은 옛 link 그대로**라
 *   읽는 쪽에서도 payload 로 주소를 보정해 준다.
 *
 * 규칙: link 에 이미 쿼리(?)가 있으면 손대지 않는다(발송부가 제대로 만든 것).
 */

export interface NotificationLinkSource {
  type?: string | null;
  link?: string | null;
  payload?: Record<string, unknown> | null;
}

/** 대화 뷰어(어드민·코디)는 `?thread=<id>` 딥링크를 지원한다. */
const THREAD_VIEWER_PATHS = ["/admin/chat", "/coordinator/chat"];
/** 문의 목록(어드민)은 `?inquiry=<id>` 로 그 문의 상세 모달을 연다. */
const INQUIRY_LIST_PATHS = ["/admin/inquiries"];

export function resolveNotificationLink(n: NotificationLinkSource | null | undefined): string | null {
  const link = n?.link;
  if (!link || typeof link !== "string") return null;
  if (link.includes("?")) return link;

  const threadId = n?.payload?.threadId;
  if (typeof threadId === "string" && threadId && THREAD_VIEWER_PATHS.includes(link)) {
    return `${link}?thread=${encodeURIComponent(threadId)}`;
  }

  const inquiryId = n?.payload?.inquiryId;
  if (
    (typeof inquiryId === "string" || typeof inquiryId === "number") &&
    String(inquiryId) &&
    INQUIRY_LIST_PATHS.includes(link)
  ) {
    return `${link}?inquiry=${encodeURIComponent(String(inquiryId))}`;
  }

  return link;
}
