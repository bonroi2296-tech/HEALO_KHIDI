/**
 * healwith: inquiries.status 정규화
 *
 * 목적: 한글/혼용 값이 DB에 저장되지 않도록 영문으로 매핑
 * 허용값: pending, received, completed, blocked, normalized, error
 */

export const INQUIRY_STATUS_VALUES = [
  "pending",
  "received",
  "completed",
  "blocked",
  "normalized",
  "error",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUS_VALUES)[number];

const KO_TO_EN: Record<string, InquiryStatus> = {
  대기중: "pending",
  대기: "pending",
  수신: "received",
  완료: "completed",
  차단: "blocked",
  정규화완료: "normalized",
  정규화: "normalized",
  에러: "error",
};

/**
 * 상태 값을 영문으로 정규화합니다.
 * 한글이나 유사값이 들어와도 항상 허용된 영문값으로 반환합니다.
 */
export function normalizeInquiryStatus(value: string | null | undefined): InquiryStatus {
  if (!value || typeof value !== "string") return "received";
  const v = value.trim().toLowerCase();
  if (INQUIRY_STATUS_VALUES.includes(v as InquiryStatus)) return v as InquiryStatus;
  const mapped = KO_TO_EN[value.trim()];
  if (mapped) return mapped;
  return "received";
}
