/**
 * 만족도 설문 수신자 결정 (순수 함수 — server-only 아님 → 단위 테스트로 고정)
 *
 * ⚠️ 왜 만들었나 (근본원인): dispatch-surveys cron 이 환자 이메일을
 *  consultation_sessions.patient_id → patients 로만 찾았는데, patient_id 가
 *  현재 전부 null(미사용)이라 모든 세션이 skip → **설문 영구 0건 발송**
 *  = KHIDI KPI K-03(만족도 90점) 측정 불능(POSTMORTEMS #12).
 *  실제 환자 연결고리는 inquiry_id → inquiries 다 (kpi.ts 가 이미 같은 이유로
 *  patient_id→inquiry_id 로 전환했었음 — POSTMORTEMS #7과 동일 부류).
 *
 * → 이메일을 patients(있으면) 다음 inquiries 로 폴백해 결정한다.
 */

/** 설문 이메일 템플릿이 지원하는 6개 언어 (surveyEmailTemplate.ts 와 일치) */
export const SURVEY_LANGS = ["ko", "en", "ru", "kk", "zh", "ja"] as const;
export type SurveyLang = (typeof SURVEY_LANGS)[number];

export interface SessionLite {
  patient_id?: string | null;
  inquiry_id?: number | null;
  patient_language?: string | null;
}

export interface PatientLite {
  email?: string | null;
}

export interface InquiryLite {
  email?: string | null;
  preferred_language?: string | null;
  spoken_language?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface SurveyRecipient {
  email: string;
  lang: SurveyLang;
  name?: string;
}

/**
 * 언어코드 → 설문 이메일 지원 6언어 정규화.
 * - 카자흐: 앱 i18n 은 `kz` 를 쓰지만 이메일 템플릿 키는 `kk` → 매핑.
 * - 미지원/없음 → `ko`.
 */
export function normalizeSurveyLang(raw: string | null | undefined): SurveyLang {
  if (!raw) return "ko";
  const v = raw.trim().toLowerCase();
  const mapped = v === "kz" ? "kk" : v;
  return (SURVEY_LANGS as readonly string[]).includes(mapped)
    ? (mapped as SurveyLang)
    : "ko";
}

function cleanEmail(e: string | null | undefined): string | null {
  if (!e) return null;
  const t = e.trim();
  return t.includes("@") ? t : null;
}

function fullName(inq?: InquiryLite | null): string | undefined {
  if (!inq) return undefined;
  const n = [inq.first_name, inq.last_name].filter(Boolean).join(" ").trim();
  return n || undefined;
}

/**
 * 설문 수신자 결정. 이메일을 못 찾으면 null(= cron 에서 skip).
 *
 * - 이메일 우선순위: patients.email → inquiries.email
 * - 언어 우선순위: session.patient_language → inquiry.preferred_language
 *                  → inquiry.spoken_language → ko
 * - 이름: inquiry.first_name + last_name (없으면 생략 → 이메일 인사말 기본형)
 */
export function resolveSurveyRecipient(
  session: SessionLite,
  patient: PatientLite | null | undefined,
  inquiry: InquiryLite | null | undefined
): SurveyRecipient | null {
  const email = cleanEmail(patient?.email) ?? cleanEmail(inquiry?.email);
  if (!email) return null;

  const langRaw =
    session.patient_language ||
    inquiry?.preferred_language ||
    inquiry?.spoken_language ||
    "ko";

  return {
    email,
    lang: normalizeSurveyLang(langRaw),
    name: fullName(inquiry),
  };
}
