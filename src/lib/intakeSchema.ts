/**
 * IntakeSchema — normalized_inquiries.constraints 고정 스키마
 * AI Agent(/api/chat) + Inquiry Form(/api/inquiry/normalize) 공통 적재용
 */

export type Intake = {
  goal: string | null;
  chief_complaint: string | null;
  body_part: string | null;
  duration: string | null;
  severity: string | null;
  budget: string | null;
  timeline: string | null;
  contraindications: string[] | null;
  medical_history_flag: boolean | null;
  medications_flag: boolean | null;
  allergy_flag: boolean | null;
  previous_procedure_flag: boolean | null;
  attachments_present: boolean | null;
};

export type IntakeMeta = {
  pipeline_version: string;
  source_type: "ai_agent" | "inquiry_form";
  model: string | null;
  prompt_version: string | null;
};

/** 필수 6개 — 누락 판단 기준 */
const REQUIRED_KEYS: (keyof Intake)[] = [
  "goal",
  "chief_complaint",
  "body_part",
  "timeline",
  "budget",
  "attachments_present",
];

/**
 * 빈 Intake + Meta 기본값
 */
export function createEmptyIntake(
  source_type: "ai_agent" | "inquiry_form" = "ai_agent"
): { intake: Intake; meta: IntakeMeta } {
  const intake: Intake = {
    goal: null,
    chief_complaint: null,
    body_part: null,
    duration: null,
    severity: null,
    budget: null,
    timeline: null,
    contraindications: null,
    medical_history_flag: null,
    medications_flag: null,
    allergy_flag: null,
    previous_procedure_flag: null,
    attachments_present: null,
  };
  const meta: IntakeMeta = {
    pipeline_version: "v1",
    source_type,
    model: null,
    prompt_version: null,
  };
  return { intake, meta };
}

/**
 * 누락 필드 목록 (필수 6개 기준)
 */
export function computeMissingFields(intake: Intake): string[] {
  const missing: string[] = [];
  for (const k of REQUIRED_KEYS) {
    const v = intake[k];
    if (k === "attachments_present") {
      if (v === null || v === undefined) missing.push(k);
      continue;
    }
    if (v === null || v === undefined || (typeof v === "string" && !String(v).trim())) {
      missing.push(k);
    }
  }
  return missing;
}

/**
 * 추출 신뢰도 0~1 (필수 6개 중 채워진 비율)
 */
export function computeExtractionConfidence(
  intake: Intake,
  missing_fields: string[]
): number {
  const filled = REQUIRED_KEYS.length - missing_fields.length;
  if (filled <= 0) return 0;
  return Math.min(1, Math.round((filled / REQUIRED_KEYS.length) * 100) / 100);
}
