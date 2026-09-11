import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// 왜 이 잠금장치가 있나 (2026-09-08):
// 2026-09-06 에 「점검·E2E 대화는 판사에서 뺀다」가 들어왔는데, 감시(ai_judge_zero)의 모수는
// 그대로였다. 감시는 답변(chat_messages)을 세고 채점(ai_response_evaluations)을 세서 비교하는데,
// 한쪽만 점검 트래픽을 빼면 «실환자가 없는 주»에 답변만 쌓이고 채점은 0 이 된다
// → critical 헛경보 「판사가 멈췄습니다」. 실측(2026-09-08): 7일 창 답변 21 · 채점 13,
//   그 13건은 전부 2026-09-06 05:55 KST 이전 것이라 9/14 실행에 발화가 예약돼 있었다.
// 늑대소년이 되면 «진짜로» 판사가 죽은 날 아무도 안 본다. 두 카운터는 같은 것을 세야 한다.
//
// 잠그는 짝: ①판사를 건너뛰는 라우트는 그 흔적(judge_skipped)을 답변 metadata 에 «조건부로» 남긴다
//            ②감시의 «답변» 집계는 그 흔적을 거른다.
// ⚠️ 「줄이 지워진 경우」만 잡으면 얕다 — 더 위험한 건 «잘못 붙인 경우»다:
//    흔적을 조건 없이 항상 남기면 실환자 답변까지 모수에서 빠져 감시가 영구 무력화되고,
//    필터가 «채점» 집계 쪽으로 옮겨 붙으면 감시가 정반대로 망가진다. 아래 시험은 그 둘도 잡는다.
const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ROUTES = [
  "app/api/public/chat/stream/route.ts",
  "app/api/public/chat/message/route.ts",
];
const KPI = read("app/api/cron/kpi-snapshot/route.ts");

/** kpi-snapshot 안에서 지정한 테이블을 세는 질의 한 토막만 잘라낸다(필터가 «어디»에 붙었는지 보려고). */
function countQuery(table: string): string {
  const i = KPI.indexOf(`.from("${table}")`);
  expect(i, `kpi-snapshot 에 ${table} 집계가 없다`).toBeGreaterThan(-1);
  const j = KPI.indexOf(".gte(\"created_at\", sinceAi)", i);
  expect(j, `${table} 집계가 AI 창(sinceAi)을 안 쓴다`).toBeGreaterThan(i);
  return KPI.slice(i, j);
}

describe("판사 건너뜀과 감시 모수는 짝이다 (회귀 잠금)", () => {
  it.each(ROUTES)("%s — 점검·E2E 면 판사를 건너뛰고 흔적을 «조건부로» 남긴다", (rel) => {
    const src = read(rel);
    // 판정은 syntheticThread.ts 한 곳에서만 한다(라우트마다 다시 정의하면 서로 어긋난다)
    expect(src).toMatch(/const judgeSkipped = isSyntheticThread\(threadMeta\)/);
    expect(src).toMatch(/isSyntheticTest: judgeSkipped/);
    // 흔적은 «판사를 건너뛴 턴에만» — 조건 없이 늘 붙이면 실환자 답변까지 감시에서 빠진다
    expect(src).toMatch(/\.\.\.\(judgeSkipped \? \{ judge_skipped: "synthetic" \} : \{\}\)/);
    // 흔적을 남기는 자리는 답변 저장 insert 한 곳뿐이어야 한다(갈래마다 다르면 일관성이 깨진다)
    expect((src.match(/judge_skipped:/g) ?? []).length).toBe(1);
  });

  it("kpi-snapshot: «답변» 집계만 그 흔적을 거른다", () => {
    const replies = countQuery("chat_messages");
    expect(replies).toMatch(/\.is\("metadata->>judge_skipped", null\)/);
    // 가로챈 턴(bypassed)도 같은 이유로 이미 빠져 있다 — 둘 다 살아 있어야 한다
    expect(replies).toMatch(/\.is\("metadata->>bypassed", null\)/);
  });

  it("kpi-snapshot: «채점» 집계에는 그 필터가 붙지 않는다(붙으면 감시가 정반대로 망가진다)", () => {
    expect(countQuery("ai_response_evaluations")).not.toMatch(/judge_skipped/);
  });
});

// 2026-09-11 추가. 위 「두 카운터는 같은 것을 세야 한다」를 저장률 판정에도 건다.
// 사고: ai_judge_save_gap 이 판사 «호출 수»(ai_usage_events)를 모수로 썼는데, 호출 기록은
// 스레드를 참조하지 않아 영원히 남고 채점 행은 스레드와 함께 지워진다(ON DELETE CASCADE).
// 점검 도구(smoke-chat·chat-eval-cleanup)가 제 스레드를 치울 때마다 유령 간극이 쌓여
// 실서비스 경보 7건이 전부 헛것이었다. 모수가 다시 그쪽으로 돌아가면 여기서 막는다.
describe("저장률 판정의 모수는 «지워질 때 같이 지워지는 쪽»이어야 한다 (회귀 잠금)", () => {
  const DEADMAN = read("src/lib/alerts/deadman.ts");
  /** ai_judge_save_gap 판정 블록만 잘라낸다. */
  const block = (() => {
    const i = DEADMAN.indexOf("replies >= JUDGE_SAVE_MIN_REPLIES");
    expect(i, "저장률 판정이 답변 수(JUDGE_SAVE_MIN_REPLIES)를 안 쓴다").toBeGreaterThan(-1);
    const j = DEADMAN.indexOf("});", DEADMAN.indexOf('key: "ai_judge_save_gap"'));
    return DEADMAN.slice(i, j);
  })();

  it("비율 계산에 판사 호출 수(aiJudgeCalls)가 끼어들지 않는다", () => {
    // details 의 참고값(aiJudgeCallsRaw)은 허용 — 판정식에 들어가는 것만 막는다.
    const decision = block.slice(0, block.indexOf("details:"));
    expect(decision).not.toContain("aiJudgeCalls");
    expect(decision).toMatch(/evaluations < replies \* JUDGE_SAVE_RATE_FLOOR/);
  });

  it("답변·채점 두 집계가 같은 창(sinceAi)을 본다 — 창이 어긋나면 비율이 거짓이 된다", () => {
    for (const table of ["chat_messages", "ai_response_evaluations"]) {
      expect(KPI.slice(KPI.indexOf(`.from("${table}")`))).toMatch(/\.gte\("created_at", sinceAi\)/);
    }
  });
});
