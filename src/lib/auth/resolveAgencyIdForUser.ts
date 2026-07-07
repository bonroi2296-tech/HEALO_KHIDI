/**
 * 로그인 user_id 가 활성 에이전시 멤버면 그 agency_id 를 돌려준다 (아니면 null).
 *
 * 왜: 공개 문의 폼(/api/inquiries/step1)은 그동안 agency_id 를 안 찍어서, 에이전시 유저가
 * 공개 폼으로 넣은 문의가 에이전시 포털(agency_id 로 필터)에서 안 보였다. /api/agency/refer 는
 * 찍는데 공개 폼만 누락 — "접수 경로별 각인 규칙 드리프트"(POSTMORTEMS #63 부류).
 *
 * service_role 클라이언트를 받아 agency_users RLS 를 우회한다. 조회 실패/미소속은 null
 * (fail-safe — agency_id 없이라도 접수 자체는 진행돼야 한다).
 */
export async function resolveAgencyIdForUser(
  serviceClient: any,
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null;
  try {
    // ponytail: limit(1) 무순서 — checkAgencyAuth 의 멤버십 해석과 동일 패턴을 의도적으로 미러.
    // 에이전시 포털 조회(reader)도 같은 WHERE 로 agency 를 1개로 좁히므로, 각인(여기)과 조회가
    // 항상 같은 행을 골라 일치한다. 한 유저가 여러 활성 에이전시 소속이면 어느 쪽을 골라도 모호한데,
    // 그 케이스가 실제로 생기면(현재 없음) checkAgencyAuth 와 '함께' ORDER BY 를 넣어 둘을 맞춰야 한다
    // (한쪽만 정렬하면 각인≠조회로 오히려 어긋남).
    const { data } = await serviceClient
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return (data as { agency_id?: string } | null)?.agency_id ?? null;
  } catch {
    return null;
  }
}
