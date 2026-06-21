# 계정 계층 (Account Tiers) — HEALO / KHIDI

> **단일 표준(SoR): `src/lib/auth/accountTiers.ts`**
> 역할 목록을 다른 곳에 하드코딩하지 말고 이 모듈을 import 해서 쓴다.
> (과거 `roles.ts`/`user_roles`에 다른 역할 묶음이 떠돌아 실제 인증 코드와
> 어긋난 적이 있어 통일함.)

우리 서비스의 계정은 **8개 계층**이다.

| # | 계층 | 누구인가 | 권한 저장 위치 | 전용 화면 |
|---|------|----------|----------------|-----------|
| 1 | **비회원(게스트)** | 화상상담 초대받은 사람 | 초대링크 토큰(계정 없음) | 상담방 |
| 2 | **사용자(환자)** | 로그인한 일반 회원 | 기본값(role 없음) | `/patient/*` |
| 3 | **코디네이터** | 내부 스태프 | `app_metadata.role=coordinator` | `/coordinator/*` |
| 4 | **의사** | 한국 종양 전문의 | `app_metadata.role=doctor` | `/doctor/*` |
| 5 | **관리자** | 운영자(PO) | `app_metadata.role=admin` 또는 `ADMIN_EMAIL_ALLOWLIST` | `/admin/*` |
| 6 | **국내 의료기관** | 제휴 한국 병원 담당자 | `hospital_users` 테이블(owner/manager/viewer) | `/partner/*` |
| 7 | **해외 에이전시** | 해외 환자 유치 파트너 | `agency_users` + `agencies.partner_type='agency'` | `/agency` |
| 8 | **해외 의료기관** | 환자를 의뢰하는 현지 병원 | `agency_users` + `agencies.partner_type='medical_institution'` | `/agency` |

## 권한이 저장되는 4가지 방식

1. **guest_token** — 계정 없이 화상상담 초대링크 토큰으로만 입장 (1번).
2. **app_metadata.role** — service_role(서버)만 바꿀 수 있는 보안 필드. 3·4·5번.
   - ⚠️ `user_metadata`는 사용자가 스스로 고칠 수 있어 권한 판정에 **절대 사용 금지**.
3. **hospital_users 테이블** — 병원별 담당자 연결. 6번. (`checkHospitalAuth`)
4. **agency_users 테이블 + agencies.partner_type** — 해외 파트너. 7·8번. (`checkAgencyAuth`)

## 7번과 8번이 같은 인프라를 쓰는 이유

해외 **에이전시**와 해외 **의료기관**은 하는 일이 같다 — "한국으로 환자를 의뢰하고,
그 환자의 진행 상황을 추적한다." 그래서 별도 테이블·포털을 새로 만들지 않고
`agencies`/`agency_users`/포털 `/agency`를 **재활용**하고, `partner_type` 한 컬럼으로만
구분한다. 포털·관리 화면은 이 값에 따라 라벨("해외 에이전시" vs "해외 의료기관")만 바뀐다.

- 등록·계정발급: 관리자 → `/admin/khidi/agencies` (유형 선택 후 등록 → 담당자 임시비번 발급)
- 파트너 로그인: `/login` → 포털 `/agency` (의뢰 환자 진행 단계 확인)

## 인증 헬퍼 매핑

| 계층 | 인증 헬퍼 |
|------|-----------|
| 관리자 | `requireAdminAuth` / `checkAdminAuth` |
| 코디·의사·관리자(스태프) | `requirePortalAuth({ staffOnly })`, 포털 UI는 `StaffPortalGate` + `/api/me` |
| 상담 참가자 | `requireConsultationAccess` / `resolveConsultationActor`(게스트 포함) |
| 국내 의료기관 | `checkHospitalAuth` (`/api/partner/whoami`) |
| 해외 에이전시·의료기관 | `checkAgencyAuth` |

## 변경 이력

- 2026-06-21: 8계층 표준 확정. `accountTiers.ts` 단일 SoR 신설. 옛 `roles.ts`
  (`korean_hospital/local_clinic/agent`)는 표준에 맞춰 정리(레거시 별칭만 유지).
  해외 의료기관(8번) 신규 추가 — `agencies.partner_type` 재활용. 코디·의사 포털에
  역할 문지기(`StaffPortalGate`) 추가(이전엔 로그인만 확인).
