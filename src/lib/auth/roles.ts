/**
 * healwith / KHIDI — 역할 권한 헬퍼 (레거시 호환 계층)
 * =============================================================================
 *
 * ⚠️ 계정 계층의 단일 표준은 `accountTiers.ts` 다. 새 코드는 거기서 import 할 것.
 *
 * 이 파일은 과거 KHIDI 멀티롤 설계(`patient|korean_hospital|local_clinic|agent|admin`)
 * 의 잔재였다. 그 역할 이름들은 실제 인증 코드(app_metadata.role + hospital_users
 * + agency_users)와 어긋나 혼란을 일으켰다. 이제는 표준(AccountTier)에 맞춰
 * 다시 정의하고, 옛 이름은 별칭(alias)으로만 매핑해 깨지지 않게 유지한다.
 */

import {
  ACCOUNT_TIERS,
  ASSIGNABLE_TIERS,
  type AccountTier,
} from "./accountTiers";

/** 표준 계정 계층 — accountTiers.ts 의 AccountTier 와 동일 */
export type UserRole = AccountTier;

/**
 * 옛 역할 이름 → 표준 AccountTier 매핑 (하위호환).
 * 외부에서 옛 문자열이 들어와도 표준으로 변환해 처리한다.
 */
export const LEGACY_ROLE_ALIASES: Record<string, AccountTier> = {
  patient: "patient",
  korean_hospital: "domestic_hospital",
  local_clinic: "overseas_medical",
  agent: "overseas_agency",
  agency: "overseas_agency",
  coordinator: "coordinator",
  doctor: "doctor",
  admin: "admin",
};

export function normalizeRole(role: string): AccountTier | null {
  if (role in ACCOUNT_TIERS) return role as AccountTier;
  return LEGACY_ROLE_ALIASES[role] ?? null;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  organization_name?: string;
  organization_id?: string;
  language_preference: string;
  is_active: boolean;
}

/**
 * 계층별 기능 권한(coarse-grained). 세부 권한은 각 API 헬퍼가 최종 판정한다.
 */
export const ROLE_PERMISSIONS: Record<AccountTier, readonly string[]> = {
  guest: ["consultation:join"],
  patient: [
    "intake:create",
    "symptom:report",
    "consultation:join",
    "followup:view",
  ],
  coordinator: [
    "escalation:handle",
    "matching:verify",
    "schedule:manage",
    "patient:view",
    "consultation:moderate",
  ],
  doctor: [
    "consultation:host",
    "treatment:record",
    "patient:view",
    "document:manage",
  ],
  admin: ["*"],
  domestic_hospital: [
    "referral:review",
    "lead:manage",
    "profile:manage",
    "patient:view",
  ],
  overseas_agency: ["referral:create", "case:track", "patient:view"],
  overseas_medical: ["referral:create", "case:track", "patient:view"],
} as const;

export function hasPermission(
  roles: UserRoleRecord[],
  permission: string
): boolean {
  return roles.some((r) => {
    if (!r.is_active) return false;
    const tier = normalizeRole(r.role as string);
    if (!tier) return false;
    const perms = ROLE_PERMISSIONS[tier];
    return perms.includes("*") || perms.includes(permission);
  });
}

/** 우선순위 높은 역할 반환 (admin > coordinator > doctor > 병원 > 해외파트너 > 환자) */
export function getPrimaryRole(roles: UserRoleRecord[]): UserRole | null {
  const priority: AccountTier[] = [
    "admin",
    "coordinator",
    "doctor",
    "domestic_hospital",
    "overseas_agency",
    "overseas_medical",
    "patient",
  ];
  const active = roles
    .filter((r) => r.is_active)
    .map((r) => normalizeRole(r.role as string))
    .filter((t): t is AccountTier => t !== null);
  for (const p of priority) {
    if (active.includes(p)) return p;
  }
  return null;
}

/** 관리자가 부여 가능한 역할 목록 (검증용) */
export const ASSIGNABLE_ROLES: readonly AccountTier[] = ASSIGNABLE_TIERS;
