/**
 * 보관기간 — 「얼마나 들고 있을 것인가」의 단일 출처.
 *
 * 왜 여기 모으나 (2026-09-08 PO 결정):
 *   개인정보처리방침 §6 에 기간을 적어 두었는데 **실제로 지우는 장치가 없었다.**
 *   적어만 두고 안 지우면 방침을 어기는 것이고, 민감정보라 시간이 갈수록 책임만 는다.
 *   숫자를 코드 한 곳에 두고, 방침 문구와 파기 크론이 «같은 값»을 보게 한다.
 *
 * 기준점은 «관계 종료»다 — 일회성 진료가 아니라 사후관리까지 끝난 시점.
 * (방침 §6 의 「‘서비스 완료’란 사후관리를 포함한 이용자와의 관계 종료를 의미한다」와 같은 뜻)
 *
 * 🛑 여기 숫자를 바꾸면 방침 §6 의 문구도 같이 고쳐라. 어긋나면 그 자체가 위반이다.
 */

/** 관계 종료 뒤 며칠까지 들고 있나. */
export const RETENTION_DAYS = {
  /**
   * 환자가 올린 검사 서류·영상(DICOM zip 포함).
   * 3년 = 방침 §6 「소비자 불만 및 분쟁 처리 기록 3년」(전자상거래법 §6)과 같은 기준.
   * 영상만 더 짧게 두는 안도 있었지만 PO 결정으로 문서와 같게 맞췄다 —
   * 기준이 하나라야 사람에게 설명할 수 있고, 「이건 되고 저건 안 되는」 혼선이 없다.
   */
  patientDocuments: 3 * 365,

  /**
   * 계약·청약철회 기록. 전자상거래법 §6 이 5년을 요구한다 — 우리가 줄일 수 없다.
   */
  contractRecords: 5 * 365,

  /** 로그인 기록. 통신비밀보호법 §15-2. */
  loginLogs: 90,
} as const;

/** 사람에게 보여줄 표기(방침·화면에서 같은 말을 쓰라고). */
export const RETENTION_LABEL = {
  patientDocuments: { ko: "3년", en: "3 years", ru: "3 года", kz: "3 жыл", zh: "3年", ja: "3年" },
} as const;

/** 그 날짜가 보관기간을 지났나. 기준일(관계 종료일)이 없으면 «아직 아니다»로 본다. */
export function isExpired(since: string | Date | null | undefined, days: number, now = new Date()): boolean {
  if (!since) return false;              // 관계가 안 끝났으면 파기 대상이 아니다
  const t = since instanceof Date ? since.getTime() : Date.parse(String(since));
  if (!Number.isFinite(t)) return false; // 날짜를 못 읽으면 «지우지 않는다» — 의심스러우면 남긴다
  return now.getTime() - t > days * 24 * 60 * 60 * 1000;
}

/** 파기 예정일 — 화면에 「언제 지워지는지」를 보여줄 때. */
export function expiryDate(since: string | Date, days: number): Date {
  const t = since instanceof Date ? since.getTime() : Date.parse(String(since));
  return new Date(t + days * 24 * 60 * 60 * 1000);
}
