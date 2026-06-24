/**
 * healwith / KHIDI — 계정 계층(Account Tier) 단일 표준 (Single Source of Truth)
 * =============================================================================
 *
 * ⚠️ 우리 서비스의 "누가 어떤 계정인가"는 전부 여기서 정의한다.
 *    다른 곳에 역할 목록을 하드코딩하지 말고 이 파일을 import 해서 쓸 것.
 *    (과거에 roles.ts / user_roles 테이블에 다른 역할 묶음이 따로 떠돌아
 *     실제 인증 코드와 어긋나 혼란을 일으킨 적이 있음 → 그걸 막으려고 통일.)
 *
 * 계정 계층은 "권한이 어디에 저장되는가"에 따라 4가지 방식으로 나뉜다:
 *   1) guest_token       — 계정 없음. 화상상담 초대링크 토큰으로만 입장.
 *   2) default           — 로그인한 일반 회원(환자). 별도 role 없음.
 *   3) app_metadata_role — auth.users.app_metadata.role (service_role만 변경 가능).
 *                          admin / coordinator / agency.
 *      ⚠️ doctor(의사)는 계정 계층이 아니다. 의사는 국내 의료기관(병원) 계정으로
 *         로그인하거나 화상상담 게스트 초대링크로 상담방에 참여한다.
 *   4) hospital_users    — hospital_users 테이블 행(병원별 owner/manager/viewer).
 *   5) agency_users      — agency_users 테이블 행 + agencies.partner_type 로
 *                          해외 에이전시 / 해외 의료기관을 구분.
 *
 * 보안 원칙: 권한 판정은 항상 app_metadata / service_role 전용 테이블 기준.
 *           user_metadata 는 클라이언트가 스스로 고칠 수 있어 신뢰 금지.
 */

export type AccountTier =
  | "guest" // 비회원 (초대링크 게스트)
  | "patient" // 사용자 (환자)
  | "coordinator" // 코디네이터 (내부 스태프)
  | "admin" // 관리자 (운영자)
  | "domestic_hospital" // 국내 의료기관 (제휴 한국 병원)
  | "overseas_agency" // 해외 에이전시 (환자 유치 파트너)
  | "overseas_medical"; // 해외 의료기관 (환자를 의뢰하는 현지 병원)

export type TierStorage =
  | "guest_token"
  | "default"
  | "app_metadata_role"
  | "hospital_users"
  | "agency_users";

export interface AccountTierDef {
  tier: AccountTier;
  labelKo: string;
  labelEn: string;
  /** 권한이 어디에 저장되는가 */
  storage: TierStorage;
  /** app_metadata.role 값 (해당될 때) */
  appRole?: "admin" | "coordinator" | "agency";
  /** agencies.partner_type 값 (해외 파트너일 때) */
  partnerType?: "agency" | "medical_institution";
  /** 전용 포털 경로 (없으면 null) */
  portal: string | null;
  /** 한 줄 설명 */
  description: string;
}

/**
 * 7개 계정 계층 정의 — 이 객체가 표준이다.
 */
export const ACCOUNT_TIERS: Record<AccountTier, AccountTierDef> = {
  guest: {
    tier: "guest",
    labelKo: "비회원(게스트)",
    labelEn: "Guest",
    storage: "guest_token",
    portal: null,
    description: "계정 없이 화상상담 초대링크 토큰으로만 상담방에 입장.",
  },
  patient: {
    tier: "patient",
    labelKo: "사용자(환자)",
    labelEn: "Patient",
    storage: "default",
    portal: "/patient",
    description: "로그인한 일반 회원. 문의·상담·사후관리. role 없음이 기본값.",
  },
  coordinator: {
    tier: "coordinator",
    labelKo: "코디네이터",
    labelEn: "Coordinator",
    storage: "app_metadata_role",
    appRole: "coordinator",
    portal: "/coordinator",
    description: "내부 스태프. 환자 여정·상담 일정·증상 알림 관리.",
  },
  admin: {
    tier: "admin",
    labelKo: "관리자",
    labelEn: "Admin",
    storage: "app_metadata_role",
    appRole: "admin",
    portal: "/admin",
    description:
      "운영자. app_metadata.role='admin' 또는 ADMIN_EMAIL_ALLOWLIST. 전체 권한.",
  },
  domestic_hospital: {
    tier: "domestic_hospital",
    labelKo: "국내 의료기관",
    labelEn: "Domestic hospital",
    storage: "hospital_users",
    portal: "/hospital",
    description:
      "제휴 한국 병원 담당자. hospital_users 테이블(owner/manager/viewer)로 연결. 리드·프로필 관리.",
  },
  overseas_agency: {
    tier: "overseas_agency",
    labelKo: "해외 에이전시",
    labelEn: "Overseas agency",
    storage: "agency_users",
    appRole: "agency",
    partnerType: "agency",
    portal: "/agency",
    description:
      "해외 환자 유치 파트너(에이전시). agency_users + agencies.partner_type='agency'. 의뢰 환자 진행상황 조회.",
  },
  overseas_medical: {
    tier: "overseas_medical",
    labelKo: "해외 의료기관",
    labelEn: "Overseas medical institution",
    storage: "agency_users",
    appRole: "agency",
    partnerType: "medical_institution",
    portal: "/clinic",
    description:
      "환자를 한국으로 의뢰하는 현지 병원/클리닉. agency_users + agencies.partner_type='medical_institution'. 에이전시와 동일 인프라 재활용.",
  },
};

/** 내부 스태프 계층 (관리자 포함) */
export const STAFF_TIERS: AccountTier[] = ["admin", "coordinator"];

/** 외부 파트너 계층 (병원·에이전시·해외 의료기관) */
export const PARTNER_TIERS: AccountTier[] = [
  "domestic_hospital",
  "overseas_agency",
  "overseas_medical",
];

/** agency_users 인프라를 공유하는 해외 파트너 계층 */
export const AGENCY_BACKED_TIERS: AccountTier[] = [
  "overseas_agency",
  "overseas_medical",
];

/** 관리자가 /api/khidi/roles 등으로 부여 가능한 계층(게스트·환자 기본값 제외) */
export const ASSIGNABLE_TIERS: AccountTier[] = [
  "coordinator",
  "admin",
  "domestic_hospital",
  "overseas_agency",
  "overseas_medical",
];

/** agencies.partner_type 허용값 */
export const PARTNER_TYPES = ["agency", "medical_institution"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

/** partner_type → 사람이 읽는 라벨 */
export function partnerTypeLabel(t?: string | null): { ko: string; en: string } {
  if (t === "medical_institution") {
    return { ko: "해외 의료기관", en: "Overseas medical institution" };
  }
  return { ko: "해외 에이전시", en: "Overseas agency" };
}

/** partner_type → AccountTier */
export function tierFromPartnerType(t?: string | null): AccountTier {
  return t === "medical_institution" ? "overseas_medical" : "overseas_agency";
}

/**
 * 인증 컨텍스트로부터 계정 계층을 판정한다.
 * 우선순위: admin > coordinator > 병원 > 해외(에이전시/의료기관) > 환자.
 */
export function resolveTier(ctx: {
  isAdmin?: boolean;
  appRole?: string | null;
  isHospitalUser?: boolean;
  isAgencyUser?: boolean;
  partnerType?: string | null;
}): AccountTier {
  if (ctx.isAdmin || ctx.appRole === "admin") return "admin";
  if (ctx.appRole === "coordinator") return "coordinator";
  if (ctx.isHospitalUser) return "domestic_hospital";
  if (ctx.isAgencyUser || ctx.appRole === "agency") {
    return tierFromPartnerType(ctx.partnerType);
  }
  return "patient";
}

export function tierLabel(tier: AccountTier): string {
  return ACCOUNT_TIERS[tier]?.labelKo ?? tier;
}

export function isStaffTier(tier: AccountTier): boolean {
  return STAFF_TIERS.includes(tier);
}
