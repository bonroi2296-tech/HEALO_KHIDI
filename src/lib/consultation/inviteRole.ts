/**
 * healwith: 초대 링크의 「역할」은 이름표일 뿐 — 언어 기본값만 여기서 가른다.
 *
 * 배경(PO 2026-07-23 결정): 역할 6종(환자·의사·통역사·코디·참관·게스트)은 2026-06-21 이후
 * **권한이 전부 같다.** 그래서 스태프 화면에서 역할 고르기를 없애고 「통합 참여 링크」(guest)
 * 하나로 통일했다.
 *
 * ⚠️ 그런데 역할은 죽은 이름표가 **아니었다** — 입장자의 «기본 언어»를 정하고 있었다
 * (2026-07-31 단순화 작업 중 발견). 그냥 지웠으면 러시아 환자가 초대 링크로 들어왔을 때
 * 화면·리마인더가 한국어로 떴다. 그래서 판정을 이 한 곳으로 모으고 시험으로 묶는다.
 */

/** 이 역할이 「환자 쪽」인가 — 통합 링크(guest)로 들어오는 사람은 환자로 본다. */
export function isPatientSideRole(role: string | null | undefined): boolean {
  return role === "patient" || role === "guest";
}

/** 입장자에게 보여줄 기본 언어. 환자 쪽이면 상담에 지정된 환자 언어(없으면 러시아어), 그 외는 한국어. */
export function defaultLangForRole(
  role: string | null | undefined,
  patientLanguage?: string | null
): string {
  return isPatientSideRole(role) ? (patientLanguage ?? "ru") : "ko";
}
