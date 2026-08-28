/**
 * 알림을 눌렀을 때 «실제로 열어야 할 주소».
 *
 * 왜 따로 있나 (2026-08-28 PO 제보 — "알림와서 들어갔는데 문의 내용 조회가 안된다"):
 *   여러 알림이 어느 건인지를 `payload` 에만 담고 `link` 는 목록 주소였다. 그래서 알림을
 *   눌러도 100건짜리 목록만 열리고 «그 건»으로는 못 갔다. 발송부(inApp.ts 등)는 고쳤지만
 *   **이미 발송돼 DB 에 쌓인 알림들은 옛 link 그대로**라 읽는 쪽에서도 payload 로 보정한다.
 *
 * 규칙: link 에 이미 쿼리(?)가 있으면 손대지 않는다(발송부가 제대로 만든 것).
 */

export interface NotificationLinkSource {
  link?: string | null;
  payload?: Record<string, unknown> | null;
}

/** `?thread=<id>` 딥링크를 읽는 대화 화면들. */
const THREAD_VIEWERS = ["/admin/chat", "/coordinator/chat", "/coordinator/messages"];
/** `?inquiry=<id>` 로 그 문의 상세를 여는 목록 화면. */
const INQUIRY_QUERY_LISTS = ["/admin/inquiries"];
/** 상세가 `/<목록>/<id>` 라우트로 실재하는 목록 화면. */
const INQUIRY_PATH_LISTS = ["/coordinator/inbox"];

/** payload 값이 주소에 쓸 만한 문자열인가 (숫자 id 도 허용). */
function idOf(v: unknown): string | null {
  if (typeof v === "string" && v) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

export function resolveNotificationLink(n: NotificationLinkSource | null | undefined): string | null {
  const link = n?.link;
  if (!link || typeof link !== "string") return null;
  if (link.includes("?")) return link;

  const threadId = idOf(n?.payload?.threadId);
  if (threadId && THREAD_VIEWERS.includes(link)) {
    return `${link}?thread=${encodeURIComponent(threadId)}`;
  }

  const inquiryId = idOf(n?.payload?.inquiryId);
  if (inquiryId && INQUIRY_QUERY_LISTS.includes(link)) {
    return `${link}?inquiry=${encodeURIComponent(inquiryId)}`;
  }
  if (inquiryId && INQUIRY_PATH_LISTS.includes(link)) {
    return `${link}/${encodeURIComponent(inquiryId)}`;
  }

  return link;
}
