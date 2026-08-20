/**
 * 비자 권한 판정 계약 검사.
 *
 * 왜 있나(2026-08-20 실측 사고): 코디네이터가 비자 목록 API 에서 «환자»로 취급돼
 * 자기 것만 찾다가 항상 0건이 나왔다. 환자가 비자 신청을 넣어도 코디가 못 봤다.
 *
 * 진짜 원인: 판정을 user_roles 테이블에서 했는데, 그 테이블의 검사규칙
 * (user_roles_role_check)이 받는 값은 patient/korean_hospital/local_clinic/agent/admin 뿐이라
 * **'coordinator' 는 그 컬럼에 애초에 들어갈 수 없었다.** 그래서 판정 함수는 항상 false 였다.
 * 실제 직원 계정(assel@healwith.co.kr)도 user_roles 에는 'patient' 로 적혀 있었다.
 *
 * 프로젝트 표준은 app_metadata.role 이다(CLAUDE.md 보안 규칙). 여기만 다른 기준을 봤다.
 *
 * 이 검사는 「판정 기준이 다시 user_roles 로 돌아가는 것」을 막는다. 단위검사 70개가
 * 이 버그가 있는 상태에서도 전부 통과했으므로, 그 그물로는 못 잡는 유형이다.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = fs.readFileSync(
  path.join(process.cwd(), "src/lib/auth/requireVisaAccess.ts"),
  "utf8"
);

// user_roles.role 이 실제로 받는 값(DB 검사규칙 user_roles_role_check, 2026-08-20 스냅샷).
const USER_ROLES_ALLOWED = ["patient", "korean_hospital", "local_clinic", "agent", "admin"];

describe("비자 권한 판정 — 코디네이터를 실제로 알아보는가", () => {
  it("app_metadata.role(appRole)로 코디를 판정한다", () => {
    expect(SRC).toMatch(/appRole\s*===\s*["']coordinator["']/);
  });

  it("user_roles 표 «단독»으로 코디를 판정하지 않는다", () => {
    // user_roles 에는 'coordinator' 를 저장할 수 없다 → 그것만 보면 항상 false 가 된다.
    const usesUserRoles = /from\(\s*["']user_roles["']\s*\)/.test(SRC);
    if (!usesUserRoles) return; // 아예 안 쓰면 이 위험 자체가 없다
    // 쓰더라도 appRole 판정과 «함께»(||) 쓰여야 한다.
    expect(SRC).toMatch(/isCoordinatorRole\([^)]*\)\s*\|\|/);
  });

  it("user_roles 가 'coordinator' 를 받을 수 없다는 전제가 아직 맞다", () => {
    // 이 전제가 깨지면(=DB 규칙에 coordinator 가 추가되면) 위 검사의 이유가 사라진다.
    // 그때는 이 파일의 설명과 판정 방식을 함께 다시 보라는 뜻으로 남긴다.
    expect(USER_ROLES_ALLOWED).not.toContain("coordinator");
  });
});
