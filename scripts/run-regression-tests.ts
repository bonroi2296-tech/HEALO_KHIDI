/**
 * healwith AI 회귀 테스트 — 손으로 돌리는 창구
 *
 *   npm run test:regression
 *   (= tsx --conditions=react-server scripts/run-regression-tests.ts)
 *
 * ⚠️ 여기에 시험 로직을 다시 쓰지 마라. 코어는 src/lib/chat/regressionRunner.ts 하나뿐이고
 *    cron(/api/cron/run-regression-tests)·관리자 버튼(/api/admin/khidi/run-regression)이
 *    같은 걸 쓴다. 2026-08-21 이전엔 이 파일이 «간소화 재현본»을 따로 들고 있어서
 *    실서비스 RAG·프롬프트를 하나도 검증하지 못했다(그 사본은 삭제됨).
 *
 * `--conditions=react-server` 가 필요한 이유: 코어가 import "server-only" 하는데,
 * 그 패키지는 기본 조건에서 throw 하고 react-server 조건에서만 빈 모듈로 풀린다.
 * (Next.js 서버 런타임이 쓰는 것과 같은 조건 — 스텁을 따로 만들 필요가 없다.)
 *
 * 필요 환경변수(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                            GOOGLE_GENERATIVE_AI_API_KEY
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]
    .filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[regression] 환경변수 없음: ${missing.join(", ")}`);
    process.exit(1);
  }

  // server-only 체인이라 동적 import (환경변수 로드 뒤에 불러야 함)
  const { runRegressionBatch } = await import("../src/lib/chat/regressionRunner");
  const r = await runRegressionBatch();
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("[regression] 치명 오류:", err);
  process.exit(1);
});
