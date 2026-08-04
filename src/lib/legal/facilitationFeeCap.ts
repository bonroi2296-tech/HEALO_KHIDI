/**
 * healwith: 유치수수료 법정 상한 판정
 *
 * 근거: 「의료 해외진출 및 외국인환자 유치 지원을 위한 통합고시」(보건복지부고시 제2024-79호) 제3조.
 *   상한은 **의료기관 종별로 다르다.** 초과하면 법 제9조제1항(중대한 시장질서 위반행위) 위반이고,
 *   법 제24조제1항제6호에 따라 **등록 취소 사유**다.
 *
 * 왜 기계가 막아야 하나 (2026-08-04 PO 결정):
 *   PO 가 «수수료율은 종별 상한을 꽉 채워 받는다»고 정했다. 그 말은 **여유가 0** 이라는 뜻이다.
 *   상한이 20% 인데 20% 로 받으면, 진료비 총액이 1원만 달라져도, 항목 하나를 잘못 분류해도,
 *   반올림을 어느 쪽으로 하느냐에 따라 바로 20%를 넘는다. 사람 눈으로 매번 지킬 수 있는 종류의
 *   규칙이 아니다 — 그래서 견적을 저장하는 길목에서 막는다.
 *
 * 「무엇을 무엇으로 나누는가」 (제일 틀리기 쉬운 곳):
 *   상한은 «총 진료비 대비» 비율이다. 여기서 총 진료비 = **환자가 의료기관에 내는 금액**이고,
 *   수수료 자체는 그 분모에 들어가지 않는다(수수료는 병원이 우리에게 주는 돈이라 환자 청구액이 아니다 —
 *   통합고시 제2조제1호). 즉 fee / patientTotal 이지 fee / (patientTotal + fee) 가 아니다.
 *   후자로 계산하면 같은 금액이 «더 낮은 비율»로 보여서, 실제로는 상한을 넘었는데 통과시킨다.
 *
 * 못 하는 것 (정직하게):
 *   · 부가세 처리는 판정에 넣지 않았다. 통합고시는 부가세 별도 산정을 허용하는데, 우리 견적 항목에
 *     부가세 구분 칸이 없어서 «세금 포함인지»를 알 수 없다. 세금 별도라면 이 검사는 실제보다
 *     엄격하게 잡는다 — 안전한 방향이라 그대로 둔다. 항목에 세금 칸이 생기면 여기도 같이 고쳐라.
 *   · 견적서에 안 적고 따로 정산하는 수수료는 당연히 못 잡는다. 이 검사는 «견적서에 적힌 것»만 본다.
 *   · 원화와 달러를 «섞어» 적은 경우(진료비는 원화, 수수료는 달러) 두 통화의 환율을 우리가 정할 수 없어
 *     비율을 못 낸다. 그 조합은 「같은 통화의 진료비가 0」으로 걸려 차단된다 — 통과시키는 것보다 낫다.
 *
 * ⚠️ 이 판정이 «실제로» 돌려면 estimate.hospital_id 가 조회돼야 한다.
 *   2026-08-04 독립 리뷰: 타입에만 넣고 select 에서 빠뜨려 **상한이 항상 15% 로 판정**되고 있었다
 *   (= 면력한방병원 20% 짜리 합법 견적까지 전부 막힘). requireCostEstimateAccess 의 select 를 건드릴 땐
 *   반드시 이 판정부터 다시 확인하라.
 */

/** 통합고시 제3조 — 의료기관 종별 유치수수료 상한(총 진료비 대비). */
export const FEE_CAP_BY_GRADE = {
  tertiary: 0.15, // 상급종합병원
  general: 0.20, // 종합병원
  hospital: 0.20, // 병원 (한방병원 포함 — 의료법 제3조제2항제3호)
  clinic: 0.30, // 의원
} as const;

export type MedicalInstitutionGrade = keyof typeof FEE_CAP_BY_GRADE;

/** 종별을 모를 때 쓰는 상한. **가장 엄격한 값**을 쓴다 — 틀리는 방향이 「법을 넘는다」가 되면 안 된다. */
export const UNKNOWN_GRADE_CAP = FEE_CAP_BY_GRADE.tertiary; // 0.15

export const GRADE_LABEL_KO: Record<MedicalInstitutionGrade, string> = {
  tertiary: "상급종합병원",
  general: "종합병원",
  hospital: "병원(한방병원 포함)",
  clinic: "의원",
};

function isGrade(v: unknown): v is MedicalInstitutionGrade {
  return typeof v === "string" && v in FEE_CAP_BY_GRADE;
}

/** 이 병원에 적용되는 상한과, 그게 「확인된 종별」에서 온 것인지. */
export function resolveFeeCap(grade: unknown): {
  cap: number;
  grade: MedicalInstitutionGrade | null;
  gradeKnown: boolean;
} {
  if (isGrade(grade)) return { cap: FEE_CAP_BY_GRADE[grade], grade, gradeKnown: true };
  return { cap: UNKNOWN_GRADE_CAP, grade: null, gradeKnown: false };
}

export type QuotationItem = {
  label?: string | null;
  krw?: number | string | null;
  usd?: number | string | null;
  payer?: string | null;
};

/**
 * 견적 항목 목록에서 「병원 부담(=유치수수료)」이 상한을 넘는지 본다.
 *
 * @param items  견적 항목 전체 (환자 부담 + 병원 부담 섞인 그대로)
 * @param grade  hospitals.medical_institution_grade (없으면 null/undefined)
 */
export function checkFacilitationFeeCap(
  items: QuotationItem[] | null | undefined,
  grade: unknown
): {
  ok: boolean;
  /** 환자가 의료기관에 내는 총액 = 상한 계산의 분모 */
  patientTotalKrw: number;
  /** 병원이 우리에게 지급하는 항목 합계 = 유치수수료 */
  facilitationFeeKrw: number;
  patientTotalUsd: number;
  facilitationFeeUsd: number;
  /** 판정에 실제로 쓰인 비율 (분모 0이거나 수수료 0이면 null) */
  ratio: number | null;
  cap: number;
  grade: MedicalInstitutionGrade | null;
  gradeKnown: boolean;
  /** 상한을 넘지 않으려면 수수료가 얼마 이하여야 하는가 (내림) */
  maxAllowedKrw: number;
  maxAllowedUsd: number;
  /** 어느 통화에서 걸렸나 — 화면이 숫자를 골라 보여줄 때 쓴다 */
  currency: "KRW" | "USD" | null;
  reason: "ok" | "over_cap" | "no_patient_total" | "negative_amount";
} {
  const { cap, grade: g, gradeKnown } = resolveFeeCap(grade);
  const list = Array.isArray(items) ? items : [];

  const num = (v: unknown) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  let patientTotalKrw = 0, facilitationFeeKrw = 0;
  let patientTotalUsd = 0, facilitationFeeUsd = 0;
  let hasNegative = false;

  for (const it of list) {
    const krw = num(it?.krw);
    const usd = num(it?.usd);
    // 음수 금액은 «상쇄 줄»로 상한을 우회하는 통로다 —
    //   [수수료 500만, 조정 -300만] 이면 합계는 200만이라 통과하는데,
    //   발급되는 견적서 PDF 는 병원 부담 항목을 «줄마다 따로» 찍으므로 종이에는 500만이 남는다.
    //   (2026-08-04 독립 리뷰 지적) → 아예 받지 않는다.
    if (krw < 0 || usd < 0) hasNegative = true;
    if (it?.payer === "hospital") { facilitationFeeKrw += krw; facilitationFeeUsd += usd; }
    // payer 판정은 견적서 PDF·환자 화면과 **같은 식**이어야 한다 —
    // 값이 없거나 이상하면 「환자 부담」으로 본다(합계에 포함되는 안전한 쪽).
    else { patientTotalKrw += krw; patientTotalUsd += usd; }
  }

  // 내림(floor)으로 계산한다 — 「딱 상한까지」가 목표일 때 반올림하면 1원 초과가 난다.
  const maxAllowedKrw = Math.floor(patientTotalKrw * cap);
  const maxAllowedUsd = Math.floor(patientTotalUsd * cap);
  const base = {
    patientTotalKrw, facilitationFeeKrw, patientTotalUsd, facilitationFeeUsd,
    cap, grade: g, gradeKnown, maxAllowedKrw, maxAllowedUsd,
  };

  if (hasNegative) {
    return { ...base, ok: false, ratio: null, currency: null, reason: "negative_amount" };
  }

  // ⚠️ 통화를 «둘 다» 본다. 원화 칸을 비우고 달러로만 적으면 예전 판은 수수료 0원으로 읽어
  //    그냥 통과시켰다(2026-08-04 독립 리뷰가 잡은 실제 우회 경로). 수수료가 적힌 통화마다 검사한다.
  const checks: Array<{ currency: "KRW" | "USD"; fee: number; total: number; max: number }> = [
    { currency: "KRW", fee: facilitationFeeKrw, total: patientTotalKrw, max: maxAllowedKrw },
    { currency: "USD", fee: facilitationFeeUsd, total: patientTotalUsd, max: maxAllowedUsd },
  ];

  for (const c of checks) {
    if (c.fee <= 0) continue; // 그 통화로 적힌 수수료가 없다 → 검사할 게 없다
    if (c.total <= 0) {
      // 수수료만 있고 같은 통화의 진료비가 없다 = 비율을 낼 수 없다.
      // 통과시키면 무한대 비율을 눈감는 셈이라 막는다.
      return { ...base, ok: false, ratio: null, currency: c.currency, reason: "no_patient_total" };
    }
    if (c.fee > c.max) {
      return { ...base, ok: false, ratio: c.fee / c.total, currency: c.currency, reason: "over_cap" };
    }
  }

  const shown = checks.find((c) => c.fee > 0);
  return {
    ...base,
    ok: true,
    ratio: shown ? shown.fee / shown.total : null,
    currency: shown ? shown.currency : null,
    reason: "ok",
  };
}
