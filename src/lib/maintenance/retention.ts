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
 *    → 이제 **기계가 잡는다**: `npm run check:retention` 이 6개 언어 §6 본문에 아래
 *      RETENTION_LABEL 문구가 실제로 들어 있는지 대조한다. 2026-09-08 에 카자흐어만
 *      옛 문장이 남아 「사본을 보관하지 않는다」와 「영상 3년 보관」이 한 문서에서 부딪쳤는데,
 *      기존 `check:legal-parity` 는 **줄 수만 세서** 초록불이었다(그래서 이 검사를 따로 만들었다).
 */

/**
 * 관계 종료 뒤 얼마나 들고 있나 — **«햇수»가 단위다.**
 *
 * 🛑 일수(3*365)로 두지 마라. 윤년이 끼면 달력 기념일보다 하루 짧아진다.
 *    방침 문구는 「3년」·「5년」이라고 «달력»으로 약속하고 있고, 계약 기록 5년은
 *    전자상거래법 §6 이 요구하는 **법정 최소**다 — 하루라도 짧으면 그 자체가 위반이다.
 *    (2029-02-28 vs 2029-03-01 처럼 실제로 갈리는 날이 생긴다.)
 */
export const RETENTION_YEARS = {
  /**
   * 환자가 올린 검사 서류·영상(DICOM zip 포함).
   * 3년 = 방침 §6 「소비자 불만 및 분쟁 처리 기록 3년」(전자상거래법 §6)과 같은 기준.
   * 영상만 더 짧게 두는 안도 있었지만 PO 결정으로 문서와 같게 맞췄다 —
   * 기준이 하나라야 사람에게 설명할 수 있고, 「이건 되고 저건 안 되는」 혼선이 없다.
   */
  patientDocuments: 3,

  /**
   * 🔑 접수만 하고 오지 않은 문의 (2026-09-08 PO 질문에서 드러난 구멍).
   *
   * 「관계 종료 후 3년」만 두면 **관계가 끝난 적이 없는 건은 영원히 안 지워진다.**
   * 상담까지 못 간 문의가 그렇다 — 종료 이벤트가 아예 없으니 3년 시계가 시작을 안 한다.
   * 개인정보보호법 §21 은 「목적 달성」뿐 아니라 「그 개인정보가 불필요하게 되었을 때」도
   * 파기 사유로 든다. 상담이 성사되지 않은 채 오래 조용하면 그 상태다.
   *
   * 기준일은 «마지막 움직임»이다(문의 생성·상태 변경·후속 글·상담 기록 등 — 실제 계산은
   * src/lib/inquiry/coldLeads.ts 의 lastActivityMs 가 이미 9가지를 본다. 새로 만들지 마라).
   * 관계가 종료된 건도 종료가 곧 «마지막 움직임»이라 이 규칙 하나로 함께 덮인다.
   *
   * 3년으로 맞춘 이유: ①문서 보관과 기준이 하나라야 설명할 수 있다 ②방침 §6 이 이미
   * 「암 치료는 진단·치료·사후관리가 수년에 걸치는 여정이어서 일정 기간의 미이용을 관계
   * 종료로 보기 어렵다」고 적어 두었다 — 1~2년으로 짧게 잡으면 그 서술과 어긋난다.
   */
  dormantInquiries: 3,

  /**
   * 계약·청약철회 기록. 전자상거래법 §6 이 5년을 요구한다 — 우리가 줄일 수 없다.
   * ⚠️ 위 두 기간이 지나도 «계약이 있었던» 건은 이 5년이 이긴다. 파기 장치는 둘 중
   *    «늦게 오는 날»을 기준으로 삼아야 한다.
   */
  contractRecords: 5,
} as const;

/** 로그인 기록은 «달»이 단위다. 통신비밀보호법 §15-2. */
export const RETENTION_MONTHS = {
  loginLogs: 3,
} as const;

/**
 * 사람에게 보여줄 표기 — **방침 §6 본문이 반드시 이 문구를 담아야 한다**(`check:retention`).
 * 여기 값을 바꾸면 6개 언어 방침 문구도 같이 고쳐야 검사가 통과한다. 그게 이 검사의 목적이다.
 */
export const RETENTION_LABEL = {
  patientDocuments: { ko: "3년", en: "3 years", ru: "3 года", kz: "3 жыл", zh: "3 年", ja: "3 年" },
} as const;

export type RetentionLang = keyof (typeof RETENTION_LABEL)["patientDocuments"];

function toTime(since: string | Date | null | undefined): number | null {
  if (since === null || since === undefined || since === "") return null;
  const t = since instanceof Date ? since.getTime() : Date.parse(String(since));
  return Number.isFinite(t) ? t : null;
}

/**
 * 파기 예정일 — «달력 기념일»로 잰다.
 *
 * `setFullYear(+N)` 은 2028-02-29 처럼 그 해에 없는 날을 만나면 3월 1일로 넘긴다.
 * 그건 «하루 늦게 지운다»는 뜻이라 안전한 쪽이다 — 짧아지는 것과 달리 위반이 아니다.
 *
 * 날짜를 못 읽으면 **null** 이다(Invalid Date 를 화면에 내보내지 않는다).
 */
export function expiryDate(since: string | Date | null | undefined, years: number): Date | null {
  const t = toTime(since);
  if (t === null) return null;
  const d = new Date(t);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/** 그 날짜가 보관기간을 지났나. 기준일(관계 종료일)이 없거나 못 읽으면 «아직 아니다»로 본다. */
export function isExpired(
  since: string | Date | null | undefined,
  years: number,
  now: Date = new Date(),
): boolean {
  // 🛑 «의심스러우면 남긴다» — 기준일이 없거나 깨졌으면 절대 파기 대상으로 세지 마라.
  //    민감정보라 「잘못 지우는 것」이 「하루 늦게 지우는 것」보다 훨씬 비싸다.
  const due = expiryDate(since, years);
  if (!due) return false;
  return now.getTime() > due.getTime();
}

/** 며칠 남았나 — 화면에 「언제 지워지는지」를 보여줄 때. 못 읽으면 null. */
export function daysUntilExpiry(
  since: string | Date | null | undefined,
  years: number,
  now: Date = new Date(),
): number | null {
  const due = expiryDate(since, years);
  if (!due) return null;
  return Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
