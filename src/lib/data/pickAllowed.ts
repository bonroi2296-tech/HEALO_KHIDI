/**
 * pickAllowed — 클라이언트가 보낸 값에서 **허용된 컬럼만** 뽑아 DB 에 넘길 객체를 만든다.
 *
 * 왜 만들었나:
 *   1) **보안** — 요청 본문을 그대로 update/insert 에 넘기면 클라이언트가 아무 컬럼이나
 *      건드릴 수 있다(대량 할당). 그래서 라우트마다 allowlist 로 걸러 왔다.
 *   2) **타입** — 그런데 걸러낸 결과를 `Record<string, any>` 로 두면 컬럼명이 틀려도
 *      아무도 모른다. 2026-07-20 실제로 이것 때문에 기능 3개가 몇 달간 죽어 있었다
 *      (`/admin/playbook`·`/admin/crawl`·`/admin/offers` — 존재하지 않는 컬럼에 저장 시도,
 *       에러는 조용히 삼켜지고 화면은 멀쩡, 테이블만 0건. POSTMORTEMS #97).
 *
 * 이 헬퍼는 **허용 컬럼 목록 자체를 테이블 타입으로 검사**한다:
 *
 *   type BranchUpdate = Database["public"]["Tables"]["partner_branches"]["Update"];
 *   const sanitized = pickAllowed<BranchUpdate>(body, ["branch_code", "name_ko"]);
 *   //                                                  ↑ 이 표에 없는 이름이면 컴파일 에러
 *
 * 값의 타입까지는 검사하지 않는다(요청 본문은 런타임에 뭐가 올지 모르므로 — 값 검증은
 * 라우트의 몫). 이 헬퍼가 막는 건 **"있지도 않은 칸에 쓰는 것"** 하나이고, 그게 실제로
 * 사고를 낸 부류다.
 */

export function pickAllowed<T extends object>(
  source: unknown,
  // `NoInfer` 가 핵심이다. 이게 없으면 TS 가 **keys 배열에서 T 를 거꾸로 추론**해서,
  // 타입 인자를 빠뜨린 호출(`pickAllowed(body, ["없는컬럼"])`)이 그냥 통과한다 —
  // 즉 «조용한 저장 실패»를 막으려는 가드가 저 자신도 조용히 실패한다(독립 리뷰 2026-07-21 실증).
  // NoInfer 를 붙이면 T 가 `object` 로 떨어지고 `keyof object` = never 라 **컴파일이 막힌다**.
  // (축 D 정적 가드는 객체 리터럴만 읽어서 pickAllowed 호출부를 못 본다 → 이중 사각이 될 뻔했다.)
  keys: readonly (keyof NoInfer<T> & string)[]
): T {
  const out: Record<string, unknown> = {};
  if (!source || typeof source !== "object") return out as T;
  const src = source as Record<string, unknown>;
  for (const key of keys) {
    if (key in src) out[key] = src[key];
  }
  return out as T;
}
