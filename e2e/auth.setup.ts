/**
 * 역할별 세션 준비 — 전체 실행에서 UI 로그인은 여기서만, 역할당 1회.
 *
 * 왜(POSTMORTEMS #117): 테스트마다 UI 로그인 = 스모크 1회당 Supabase 로그인 10회+
 * (retry 시 3배)가 공유 Supabase(프로덕션 겸용)로 나간다. 그 DB 가 느려지는 시간대엔
 * (실측 trace: auth 무응답·REST 10~25초) 이 반복 로그인이 가장 먼저 무너지는 지점이라
 * 매번 다른 테스트가 떨어졌다. 역할당 1회만 로그인해 두면 각 테스트는 쿠키 주입뿐.
 * ※ 이 부하가 DB 저하의 *원인*이라는 뜻은 아니다 — 같은 날 부하 없이도 인스턴스가
 *   무너졌다(#117 원인 정정). 우리는 증폭 요인을 줄이는 것.
 *
 * 제목의 @smoke: `--grep @smoke` 실행에서도 이 setup 이 걸러지지 않게 하기 위함.
 * env 미설정 역할은 스킵 — 해당 역할 스펙도 어차피 각자 스킵한다.
 */

import { test as setup } from "@playwright/test";
import fs from "node:fs";
import { AUTH_STATE_DIR, statePath, uiLoginAs, type Role } from "./fixtures/auth";

// 부팅 판정이 /api/health(가벼움)로 바뀌면서 홈("/") 첫 컴파일(2코어 러너 30~60s)이
// 테스트 예산(30s) 안으로 밀리는 것을 방지 — setup 의 넉넉한 예산(120s)에서 미리 흡수.
setup("@smoke 서버 웜업 — 홈 첫 컴파일 흡수", async ({ page }) => {
  await page.goto("/");
});

const ROLES: Array<[Role, string]> = [
  ["patient", "E2E_TEST_USER_EMAIL"],
  ["admin", "E2E_ADMIN_EMAIL"],
  ["coordinator", "E2E_COORDINATOR_EMAIL"],
  ["agency", "E2E_AGENCY_EMAIL"],
  ["clinic", "E2E_CLINIC_EMAIL"],
];

for (const [role, envKey] of ROLES) {
  setup(`@smoke ${role} 세션 저장 (역할당 로그인 1회)`, async ({ page }) => {
    setup.skip(!process.env[envKey], `${envKey} 미설정 — 해당 역할 스펙도 스킵됨`);
    // 소프트 실패: setup 테스트가 fail 이면 의존 프로젝트(chromium) 전체가 스킵돼
    // 공개/비인증 스펙·야간 프로덕션 감시까지 통째로 침묵한다(독립 리뷰 지적 — 장애 격리 회귀).
    // 로그인이 안 되면 상태 저장만 건너뛰고 통과 → 그 역할 스펙이 uiLoginAs 폴백으로
    // 직접 시도하다 개별 실패해 신호는 스펙 단위로 살아남는다(= 이 PR 이전과 동일한 격리).
    try {
      await uiLoginAs(page, role);
      fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
      await page.context().storageState({ path: statePath(role) });
    } catch (e) {
      console.warn(`[auth.setup] ${role} 로그인 실패 — 이 역할 스펙은 개별 UI 로그인 폴백(느림): ${e}`);
    }
  });
}
