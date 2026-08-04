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
  /** facilitationFeeKrw / patientTotalKrw (분모 0이면 null) */
  ratio: number | null;
  cap: number;
  grade: MedicalInstitutionGrade | null;
  gradeKnown: boolean;
  /** 상한을 넘지 않으려면 수수료가 얼마 이하여야 하는가 (원, 내림) */
  maxAllowedKrw: number;
  reason: "ok" | "over_cap" | "no_patient_total";
} {
  const { cap, grade: g, gradeKnown } = resolveFeeCap(grade);
  const list = Array.isArray(items) ? items : [];

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  let patientTotalKrw = 0;
  let facilitationFeeKrw = 0;
  for (const it of list) {
    // payer 판정은 견적서 PDF·환자 화면과 **같은 식**이어야 한다 —
    // 값이 없거나 이상하면 「환자 부담」으로 본다(합계에 포함되는 안전한 쪽).
    if (it?.payer === "hospital") facilitationFeeKrw += num(it?.krw);
    else patientTotalKrw += num(it?.krw);
  }

  // 내림(floor)으로 계산한다 — 「딱 상한까지」가 목표일 때 반올림하면 1원 초과가 난다.
  const maxAllowedKrw = Math.floor(patientTotalKrw * cap);

  if (facilitationFeeKrw <= 0) {
    return {
      ok: true, patientTotalKrw, facilitationFeeKrw, ratio: null,
      cap, grade: g, gradeKnown, maxAllowedKrw, reason: "ok",
    };
  }
  if (patientTotalKrw <= 0) {
    // 수수료만 있고 진료비가 없다 = 비율을 낼 수 없다. 통과시키면 무한대 비율을 눈감는 셈이라 막는다.
    return {
      ok: false, patientTotalKrw, facilitationFeeKrw, ratio: null,
      cap, grade: g, gradeKnown, maxAllowedKrw: 0, reason: "no_patient_total",
    };
  }

  const ratio = facilitationFeeKrw / patientTotalKrw;
  return {
    ok: facilitationFeeKrw <= maxAllowedKrw,
    patientTotalKrw, facilitationFeeKrw, ratio,
    cap, grade: g, gradeKnown, maxAllowedKrw,
    reason: facilitationFeeKrw <= maxAllowedKrw ? "ok" : "over_cap",
  };
}

/** 코디네이터 화면에 그대로 띄울 수 있는 한국어 설명. */
export function describeFeeCapResult(r: ReturnType<typeof checkFacilitationFeeCap>): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
  const gradeText = r.gradeKnown
    ? GRADE_LABEL_KO[r.grade as MedicalInstitutionGrade]
    : "종별 미확인(가장 엄격한 상급종합 기준을 적용함)";

  if (r.reason === "no_patient_total") {
    return `유치수수료 ${won(r.facilitationFeeKrw)} 가 있는데 환자 부담 진료비가 0원이라 상한 비율을 낼 수 없다. 진료비 항목을 먼저 넣어라. (${gradeText})`;
  }
  if (r.reason === "over_cap") {
    return (
      `유치수수료가 법정 상한을 넘었다 — ${gradeText} 상한 ${pct(r.cap)}, ` +
      `현재 ${pct(r.ratio || 0)}. 환자 부담 진료비 ${won(r.patientTotalKrw)} 기준으로 ` +
      `수수료는 ${won(r.maxAllowedKrw)} 이하여야 한다(현재 ${won(r.facilitationFeeKrw)}). ` +
      `초과는 「의료해외진출법」 제9조제1항 위반이고 제24조제1항제6호 등록취소 사유다.`
    );
  }
  return `유치수수료 ${won(r.facilitationFeeKrw)} — ${gradeText} 상한 ${pct(r.cap)} 이내(최대 ${won(r.maxAllowedKrw)}).`;
}
