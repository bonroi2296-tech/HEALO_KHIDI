import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// 왜 이 잠금장치가 있나 (2026-09-08):
// 2026-09-06 에 「점검·E2E 대화는 판사에서 뺀다」가 들어왔는데, 감시(ai_judge_zero)의 모수는
// 그대로였다. 감시는 답변(chat_messages)을 세고 채점(ai_response_evaluations)을 세서 비교하는데,
// 한쪽만 점검 트래픽을 빼면 «실환자가 없는 주»에 답변만 쌓이고 채점은 0 이 된다
// → critical 헛경보 「판사가 멈췄습니다」. 실측(2026-09-08): 7일 창 답변 21 · 채점 13,
//   그 13건은 전부 9/05 이전 것이라 9/13 무렵 발화가 예약돼 있었다.
// 늑대소년이 되면 «진짜로» 판사가 죽은 날 아무도 안 본다. 두 카운터는 같은 것을 세야 한다.
//
// 잠그는 짝: ①판사를 건너뛰는 라우트는 그 흔적(judge_skipped)을 답변 metadata 에 남긴다
//            ②감시의 답변 집계는 그 흔적이 붙은 답변을 뺀다.
const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ROUTES = [
  "app/api/public/chat/stream/route.ts",
  "app/api/public/chat/message/route.ts",
];
const KPI = read("app/api/cron/kpi-snapshot/route.ts");

describe("판사 건너뜀과 감시 모수는 짝이다 (회귀 잠금)", () => {
  it.each(ROUTES)("%s — 점검·E2E 면 판사를 건너뛰고 흔적을 남긴다", (rel) => {
    const src = read(rel);
    // 판정은 syntheticThread.ts 한 곳에서만 한다(라우트마다 다시 정의하면 서로 어긋난다)
    expect(src).toMatch(/isSyntheticThread/);
    expect(src).toMatch(/isSyntheticTest: judgeSkipped/);
    // 흔적을 안 남기면 감시가 이 답변을 못 걸러 헛경보가 된다
    expect(src).toMatch(/judge_skipped:/);
  });

  it("kpi-snapshot 의 답변 집계는 판사를 건너뛴 답변을 뺀다", () => {
    expect(KPI).toMatch(/\.is\("metadata->>judge_skipped", null\)/);
    // 가로챈 턴(bypassed)도 같은 이유로 이미 빠져 있다 — 둘 다 살아 있어야 한다
    expect(KPI).toMatch(/\.is\("metadata->>bypassed", null\)/);
  });
});
