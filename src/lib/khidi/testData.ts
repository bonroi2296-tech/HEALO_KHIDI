/**
 * KHIDI 테스트/실제 데이터 분리 — 단일 표식 inquiries.is_test 의 판정·조회 로직.
 *
 * 왜: 운영자(PO·코디)가 오픈 후에도 실폼으로 테스트하면 그 데이터가 평가 KPI 에 섞인다.
 *     '테스트'를 문의 생성 시점에 한 번만 판정해 inquiries.is_test 에 박고,
 *     상담/설문/유치는 inquiry_id 로 따라가 제외한다(다운스트림에 도장 복사 X → 누락 사고 차단).
 *
 * 판정 트리거(하나라도 해당하면 테스트):
 *   1) 사무실 IP   — env TEST_OFFICE_IPS (콤마구분). **문의 생성 시점의 IP만** 봄
 *      (코디가 진짜 유치를 '확정 클릭'할 때의 IP 는 안 봄 → 진짜 실적이 안 빠짐).
 *   2) 테스트 이메일 — env TEST_EMAIL_DOMAINS (콤마구분, 기본 'test.com'). 예: hong@test.com
 *   3) 수동 도장   — 폼/어드민에서 명시적으로 isTest=true.
 *
 * server-only 를 import 하지 않음(순수) → vitest 에서 직접 임포트해 테스트 가능.
 * DB 조회 헬퍼는 supabase 클라이언트를 인자로 받음(모듈 로드시 service_role 안 끌어옴).
 */

/** 콤마구분 env → 정규화된 문자열 배열 */
function parseList(raw: string | undefined | null): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 이메일이 테스트 도메인(예: test.com)에 속하는가. 대소문자·공백 무시. */
export function isTestEmail(email: string | null | undefined, domains: string[]): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return false;
  return domains.some((d) => {
    const dom = d.trim().toLowerCase().replace(/^@/, "");
    return dom.length > 0 && e.endsWith("@" + dom);
  });
}

/** IP 가 사무실 IP 목록에 정확히 일치하는가. */
export function isOfficeIp(ip: string | null | undefined, officeIps: string[]): boolean {
  if (!ip) return false;
  const v = ip.trim();
  return officeIps.includes(v);
}

export interface DetectTestInput {
  /** 문의 '생성 시점'의 클라이언트 IP (getClientIp 결과). 확정 클릭 IP 아님. */
  ip?: string | null;
  /** 평문 이메일 (암호화 전). 없으면 무시. */
  email?: string | null;
  /** 폼/어드민에서 명시적으로 테스트라고 표시했는가. */
  manual?: boolean | null;
  /** 테스트용 주입(미지정 시 process.env 사용). */
  officeIps?: string[];
  testDomains?: string[];
}

/** 문의가 테스트인지 판정. 트리거 하나라도 해당하면 true. */
export function detectInquiryIsTest(input: DetectTestInput): boolean {
  const officeIps = input.officeIps ?? parseList(process.env.TEST_OFFICE_IPS);
  const testDomains = input.testDomains ?? (parseList(process.env.TEST_EMAIL_DOMAINS).length > 0
    ? parseList(process.env.TEST_EMAIL_DOMAINS)
    : ["test.com"]);

  if (input.manual === true) return true;
  if (isOfficeIp(input.ip, officeIps)) return true;
  if (isTestEmail(input.email, testDomains)) return true;
  return false;
}

/**
 * PostgREST `.not(col,"in",<여기>)` 용 값 포맷터. 숫자는 그대로, 문자열(uuid)은 따옴표.
 * 예: numericIdsToFilter([1,2]) -> "(1,2)" / [uuid] -> '("a","b")'
 * ids 가 비면 null(필터 적용하지 말라는 신호).
 */
export function idsToInFilter(ids: Array<number | string>): string | null {
  if (!ids || ids.length === 0) return null;
  const parts = ids.map((id) =>
    typeof id === "number" ? String(id) : `"${String(id).replace(/"/g, "")}"`
  );
  return `(${parts.join(",")})`;
}

/** 테스트로 표시된 문의 id 목록(bigint). 데이터가 적어 전수 조회. */
export async function fetchTestInquiryIds(db: any): Promise<number[]> {
  const { data, error } = await db.from("inquiries").select("id").eq("is_test", true);
  if (error || !Array.isArray(data)) return [];
  return data.map((r: any) => r.id).filter((v: any) => v != null);
}

export interface DetectSessionTestInput {
  /** 연결된 inquiry 의 is_test (연결 없으면 null/undefined). */
  inquiryIsTest?: boolean | null;
  /** 세션 notes — '[TEST]' 마커가 있으면 테스트로 판정. */
  notes?: string | null;
  /** API 호출부에서 명시적으로 테스트라고 표시했는가. */
  manual?: boolean | null;
}

/**
 * 상담세션 생성 시점의 테스트 판정 (K-02 오염 벡터 차단).
 * inquiry 미연결 세션은 체인으로 못 거르므로, 생성 시점에 세션 자체에
 * consultation_sessions.is_test 를 도장한다. 트리거 하나라도 해당하면 true.
 */
export function detectSessionIsTest(input: DetectSessionTestInput): boolean {
  if (input.manual === true) return true;
  if (input.inquiryIsTest === true) return true;
  if (input.notes && input.notes.toUpperCase().includes("[TEST]")) return true;
  return false;
}

/**
 * KPI 제외 대상 상담세션 id 목록(uuid) — **합집합**:
 *   1) consultation_sessions.is_test = true  (세션 자체 표식 — inquiry 미연결 테스트 커버)
 *   2) 테스트 문의(inquiries.is_test)에 딸린 세션 (문의가 사후에 테스트로 도장돼도 계속 걸러지게)
 * 세션 제외는 inquiry_id(널 가능)가 아니라 세션 PK id(널 없음)로 해야
 * inquiry 없는 정상 세션이 NOT IN 의 NULL 처리로 잘못 빠지지 않는다.
 */
export async function fetchTestSessionIds(db: any): Promise<string[]> {
  const ids = new Set<string>();

  const { data: flaggedRows } = await db
    .from("consultation_sessions")
    .select("id")
    .eq("is_test", true);
  (flaggedRows || []).forEach((r: any) => {
    if (r?.id) ids.add(r.id);
  });

  const inquiryIds = await fetchTestInquiryIds(db);
  if (inquiryIds.length > 0) {
    const { data: sessRows } = await db
      .from("consultation_sessions")
      .select("id")
      .in("inquiry_id", inquiryIds);
    (sessRows || []).forEach((r: any) => {
      if (r?.id) ids.add(r.id);
    });
  }

  return Array.from(ids);
}

/**
 * 테스트 문의에 딸린 설문(survey) id 목록(uuid).
 * 체인: 테스트 inquiry → consultation_sessions(inquiry_id) → surveys(consultation_session_id).
 * survey_responses 제외에 사용(K-03 만족도).
 */
export async function fetchTestSurveyIds(db: any): Promise<string[]> {
  const sessionIds = await fetchTestSessionIds(db);
  if (sessionIds.length === 0) return [];
  const { data: surveyRows } = await db
    .from("surveys")
    .select("id")
    .in("consultation_session_id", sessionIds);
  return (surveyRows || []).map((r: any) => r.id).filter(Boolean);
}
