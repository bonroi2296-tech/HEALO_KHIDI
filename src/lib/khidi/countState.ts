/**
 * KHIDI 실적에 «세지는지»를 판정하는 단일 기준.
 *
 * 🔴 2026-07-29 정정 — 처음엔 「문의 연결 + 완료」 둘 다 필요하다고 적었는데 **틀렸다.**
 *    집계가 두 군데인데 조건이 서로 다르다. 코드를 한 줄씩 대조해 확인한 결과:
 *
 *    ① 공식 지표 K-02·K-04 (`src/lib/khidi/kpi.ts` — 중간평가에 제출되는 그 숫자)
 *       = session_type + `status='completed'` + 기간. **문의 연결은 안 본다.**
 *    ② 유치 전환 깔때기 (`app/api/admin/khidi/conversion-funnel/route.ts` — 분석 화면)
 *       = 위 조건 + `inquiry_id IS NOT NULL`.
 *
 *    → 그래서 「문의 미연결」은 **실적이 0 이 되는 게 아니라, 유치 추적이 끊기는** 것이다.
 *      실적을 0 으로 만드는 진짜 원인은 **「완료」를 안 누르는 것** 하나다.
 *      (2026-07-29 실측: 사전상담 방 66개 중 완료 표시 1개 → K-02 가 1.)
 *
 * ⚠️ 위 두 파일의 조건이 바뀌면 여기도 바꿔라. 안 그러면 화면과 숫자가 어긋난다.
 *    `countState.test.ts` 가 그 어긋남을 먼저 잡는다.
 */

/** 실적으로 세는 세션 유형. `kpi.ts` 의 session_type 조건과 짝. */
export const KHIDI_COUNTED_TYPES = ["pre_consultation", "follow_up"] as const;

export type KhidiCountState = "counted" | "noLink" | "notCounted" | null;

export interface CountableSession {
  session_type?: string | null;
  inquiry_id?: number | string | null;
  status?: string | null;
  /** 시험용 방인가. `kpi.ts` 는 시험분을 빼고 세므로 화면도 같이 빼야 숫자가 맞는다. */
  is_test?: boolean | null;
}

/**
 * 이 상담이 실적에 잡히는지, 안 잡히면 왜.
 *
 * @returns `null` = 애초에 집계 대상 아님(파트너 미팅 등) — 배지를 안 띄운다.
 *          `'notCounted'` = **완료가 아님 → 공식 실적에서 0.** 제일 아픈 경우.
 *          `'noLink'` = 실적엔 잡히지만 문의 미연결 → **유치 전환 추적이 끊긴다.**
 *          `'counted'` = 실적도 잡히고 유치 추적도 이어진다.
 */
export function khidiCountState(c: CountableSession): KhidiCountState {
  if (!c) return null;
  // 🔴 2026-08-03 추가 — 시험용 방은 애초에 집계 대상이 아니다.
  //    `kpi.ts` 는 `fetchTestSessionIds` 로 시험분을 «빼고» 세는데 화면은 안 빼고 있었다.
  //    실측: 「지난 상담인데 완료 안 함」 81건 중 **78건이 시험분**이었다 — 그대로 두면
  //    화면이 «실적 78건이 밀렸다»고 거짓 경보를 내고, 그걸 없애려면 시험 방 78개를
  //    사람이 하나씩 눌러야 한다. 배지·배너가 조용해야 진짜 3건이 눈에 띈다.
  if (c.is_test === true) return null;
  if (!KHIDI_COUNTED_TYPES.includes(c.session_type as (typeof KHIDI_COUNTED_TYPES)[number])) {
    return null;
  }
  // 순서가 중요하다 — 공식 실적을 0 으로 만드는 건 「완료 아님」뿐이다.
  if (c.status !== "completed") return "notCounted";
  if (!c.inquiry_id) return "noLink";
  return "counted";
}
