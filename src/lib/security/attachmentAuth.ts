/**
 * healwith: Attachment 접근 권한 검증 유틸
 * attachments/sign과 referral/summary에서 공통 사용
 */

/**
 * path가 inquiry의 attachments 배열에 포함되는지 검증
 * @param path 요청한 파일 path
 * @param attachments attachments 배열 (jsonb)
 * @returns 권한 있으면 true
 */
export function pathAuthorized(
  path: string,
  attachments: unknown
): boolean {
  const arr = Array.isArray(attachments) ? attachments : [];
  return arr.some((a: { path?: string }) => a?.path === path);
}
