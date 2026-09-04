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
  /**
   * 로그인 계정(auth.users)의 이메일 — 폼에 적은 email 과 별개.
   * 왜: 공유 테스트 계정(예: agency@test.com)으로 로그인한 채 폼엔 개인 이메일(gmail)을 적으면
   *     폼 email 만 보던 옛 판정이 실제 유치(is_test=false)로 오인해 KHIDI 실적을 오염시켰다.
   *     계정 이메일도 같은 테스트 도메인 룰로 검사(POSTMORTEMS — 로그인 계정 경로 누락).
   */
  accountEmail?: string | null;
  /** 폼/어드민에서 명시적으로 테스트라고 표시했는가. */
  manual?: boolean | null;
  /** 테스트용 주입(미지정 시 process.env 사용). */
  officeIps?: string[];
  testDomains?: string[];
}

/** 문의가 테스트인지 판정. 트리거 하나라도 해당하면 true. */
/**
 * 🚫 폐기(2026-09-04). 옛 규칙: 「연락 이메일이 healwith.co.kr 이면 시험」.
 *
 * 왜 뺐나: 전제가 틀렸다. 2026-08-18 에 이 규칙을 넣을 때의 근거는 «환자가 우리 회사 주소로
 *   문의할 일은 없다» 였는데, 실제로는 **코디·PO 가 환자를 대신해 회사 주소로 대리 접수**한다.
 *   그래서 진짜 환자 문의 #291·#302 가 이 규칙 하나에 걸려 시험으로 찍혔고, KHIDI 실적
 *   집계에서 통째로 빠질 뻔했다(PO 2026-09-04: 「healwith.co.kr 으로도 접수할 수 있는데」).
 *
 * 이 판정이 틀리는 두 방향은 값이 다르다:
 *   ① 진짜를 시험으로 → 실적에서 «조용히» 사라진다. 아무도 모르고, 목표 12건 중 1건이 8%다.
 *   ② 시험을 진짜로 → 문의함에 그대로 보이고, 코디가 「시험으로 표시」를 누르면 끝난다.
 *   ①이 훨씬 비싸므로, 애매하면 진짜로 두고 사람이 걷어내는 쪽을 택한다.
 *
 * 봇·자동시험은 이 규칙 없이도 그대로 걸린다 — 전용 도메인(healo-test.invalid)·시험 계정
 * (test.com)·텔레그램 딥링크 표식·왓츠앱 번호 목록이 각자 잡는다. 회사 도메인을 쓰는 봇은 없다.
 *
 * 🛑 되살리지 마라. 되살리려면 「코디가 대리 접수할 때 무엇을 적는가」부터 다시 재고,
 *    그 주소를 예외로 빼는 방법까지 같이 가져와라.
 */

export function detectInquiryIsTest(input: DetectTestInput): boolean {
  const officeIps = input.officeIps ?? parseList(process.env.TEST_OFFICE_IPS);
  // ⚠️ 기본 목록을 여기 또 적지 마라 — resolveTestDomains() 한 곳만 쓴다.
  //    2026-08-04 실측: 같은 규칙이 두 벌로 적혀 있어 «감사 함수는 새 도메인을 아는데
  //    정작 만드는 시점의 판정기는 모르는» 상태였다(둘 다 고쳐야 기능이 켜진다).
  const testDomains = input.testDomains ?? resolveTestDomains();

  if (input.manual === true) return true;
  if (isOfficeIp(input.ip, officeIps)) return true;
  if (isTestEmail(input.email, testDomains)) return true;
  if (isTestEmail(input.accountEmail, testDomains)) return true;
  return false;
}

/**
 * 실적 오염 감사(드리프트 모니터): is_test=false 로 실적에 잡혀 있으나 '접수 계정'이
 * 테스트 도메인인 문의 id 를 골라낸다. 코드 가드(감지기)를 우회해 새는 경로를 사후에도 잡는 그물.
 * 순수 함수 — DB 조회(계정 이메일 해석)는 호출부(cron)가 하고 여기엔 결과만 넘긴다.
 */
export function findTestPollutedInquiryIds(
  rows: Array<{ id: number; accountEmail: string | null }>,
  domains: string[]
): number[] {
  return rows
    .filter((r) => isTestEmail(r.accountEmail, domains))
    .map((r) => r.id)
    .filter((v) => v != null);
}

/** 감사에서 쓸 테스트 도메인 목록(env → 기본 test.com). detectInquiryIsTest 와 동일 규칙. */
export function resolveTestDomains(): string[] {
  const fromEnv = parseList(process.env.TEST_EMAIL_DOMAINS);
  // ⚠️ healo-test.invalid 를 기본에 넣는 이유(2026-08-04 실측):
  //   매일 새벽 실서비스 대상 자동 화면시험(e2e.yml JOB3, cron 19:00 UTC)이 AI 채팅으로
  //   문의를 하나씩 만든다. 그 게스트 이메일이 e2e-test@healo-test.invalid 인데
  //   기본 목록이 test.com 하나뿐이라 **로봇 문의가 「진짜 문의」로 저장돼 왔다.**
  //   14일 실측: ai_agent 문의 17건 전부 is_test=false, 그중 11건이 매일 04:45~05:15 정각 패턴.
  //   일일 오염감사(cron/kpi-snapshot)는 «로그인 계정»만 훑어서 게스트인 이걸 못 잡는다 —
  //   그래서 사후 그물이 아니라 «만드는 시점»에서 막아야 한다.
  //   healo-test.invalid 는 이미 이 저장소가 내부 전용으로 쓰는 도메인이다
  //   (scripts/dev-login-as.mjs 의 허용 목록과 같은 뜻).
  //   🛑 여기에 우리 회사 도메인(healwith.co.kr)을 넣지 마라. 코디·PO 가 환자를 대신해 그 주소로
  //   대리 접수하기 때문에, 넣으면 «진짜 환자 문의»가 통째로 시험이 되고 야간 감사가 지난 것까지
  //   소급해 뒤집는다(2026-09-04 실측: #291·#302 가 그렇게 걸렸다. 위 detectInquiryIsTest 주석 참고).
  return fromEnv.length > 0 ? fromEnv : ["test.com", "healo-test.invalid"];
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
 * 테스트 문의에 딸린 설문(survey) id 목록(uuid). survey_responses 제외에 사용(K-03 만족도).
 *
 * 체인이 **두 갈래**다 — 설문이 두 경로로 만들어지기 때문:
 *  ① 상담 경로: 테스트 inquiry → consultation_sessions(inquiry_id) → surveys(consultation_session_id)
 *  ② 케이스 경로: 테스트 inquiry → surveys(inquiry_id)  ← 2026-07-21 추가
 *
 * ②가 없으면 케이스 경로로 나간 설문은 `consultation_session_id` 가 null 이라 ①에 **영원히 안 걸려**
 * 테스트 응답이 K-03 만족도 점수에 그대로 섞인다(독립 리뷰 2026-07-21 지적). 특히 이 프로젝트는
 * `is_test` 를 사무실 IP·수동 도장으로 **사후에** 붙이므로, 설문이 나간 뒤 테스트로 뒤집힌 문의도
 * 여기서 걸러져야 한다.
 */
export async function fetchTestSurveyIds(db: any): Promise<string[]> {
  const ids = new Set<string>();

  // ① 상담 세션을 거친 설문
  const sessionIds = await fetchTestSessionIds(db);
  if (sessionIds.length > 0) {
    const { data: bySession } = await db
      .from("surveys")
      .select("id")
      .in("consultation_session_id", sessionIds);
    (bySession || []).forEach((r: any) => { if (r?.id) ids.add(r.id); });
  }

  // ② 케이스(문의)에 직접 붙은 설문
  const inquiryIds = await fetchTestInquiryIds(db);
  if (inquiryIds.length > 0) {
    const { data: byInquiry } = await db
      .from("surveys")
      .select("id")
      .in("inquiry_id", inquiryIds);
    (byInquiry || []).forEach((r: any) => { if (r?.id) ids.add(r.id); });
  }

  return Array.from(ids);
}
