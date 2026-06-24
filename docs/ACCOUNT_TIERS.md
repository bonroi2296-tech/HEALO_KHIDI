# 계정 계층 (Account Tiers) — HEALO / KHIDI

> **단일 표준(SoR): `src/lib/auth/accountTiers.ts`**
> 역할 목록을 다른 곳에 하드코딩하지 말고 이 모듈을 import 해서 쓴다.
> (과거 `roles.ts`/`user_roles`에 다른 역할 묶음이 떠돌아 실제 인증 코드와
> 어긋난 적이 있어 통일함.)

우리 서비스의 계정은 **7개 계층**이다.

| # | 계층 | 누구인가 | 권한 저장 위치 | 전용 화면 |
|---|------|----------|----------------|-----------|
| 1 | **비회원(게스트)** | 화상상담 초대받은 사람 | 초대링크 토큰(계정 없음) | 상담방 |
| 2 | **사용자(환자)** | 로그인한 일반 회원 | 기본값(role 없음) | `/patient/*` |
| 3 | **코디네이터** | 내부 스태프 | `app_metadata.role=coordinator` | `/coordinator/*` |
| 4 | **관리자** | 운영자(PO) | `app_metadata.role=admin` 또는 `ADMIN_EMAIL_ALLOWLIST` | `/admin/*` |
| 5 | **국내 의료기관** | 제휴 한국 병원 담당자 | `hospital_users` 테이블(owner/manager/viewer) | `/hospital/*` |
| 6 | **해외 에이전시** | 해외 환자 유치 파트너 | `agency_users` + `agencies.partner_type='agency'` | `/agency` |
| 7 | **해외 의료기관** | 환자를 의뢰하는 현지 병원 | `agency_users` + `agencies.partner_type='medical_institution'` | `/clinic` |

> **의사(doctor)는 계정 계층이 아니다.** 의사는 ①소속 **국내 의료기관(병원) 계정**으로
> 로그인해 자기 병원 상담방에 들어오거나(`requireConsultationAccess`가 `consultation_sessions.hospital_id`
> ↔ `hospital_users`로 판정 → 상담방 안에서 `role=doctor`), ②계정 없이 **게스트 초대링크**로 참여한다.
> "doctor"는 상담방 안의 **참가자 역할**로만 남아 있고, 만들거나 부여할 수 있는 계정 종류가 아니다.

## 권한이 저장되는 4가지 방식

1. **guest_token** — 계정 없이 화상상담 초대링크 토큰으로만 입장 (1번).
2. **app_metadata.role** — service_role(서버)만 바꿀 수 있는 보안 필드. 3·4번.
   - ⚠️ `user_metadata`는 사용자가 스스로 고칠 수 있어 권한 판정에 **절대 사용 금지**.
3. **hospital_users 테이블** — 병원별 담당자 연결. 5번. (`checkHospitalAuth`)
4. **agency_users 테이블 + agencies.partner_type** — 해외 파트너. 6·7번. (`checkAgencyAuth`)

## 6번과 7번이 같은 인프라를 쓰는 이유

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
| 코디·관리자(스태프) | `requirePortalAuth({ staffOnly })`, 포털 UI는 `StaffPortalGate` + `/api/me` |
| 상담 참가자(의사 포함) | `requireConsultationAccess` / `resolveConsultationActor`(게스트·병원 계정 포함) |
| 국내 의료기관 | `checkHospitalAuth` (`/api/partner/whoami`) |
| 해외 에이전시·의료기관 | `checkAgencyAuth` |

## 변경 이력

- 2026-06-24: **의사(doctor) 계정 계층 완전 제거 → 8계층에서 7계층으로.** 의사는 더 이상
  만들 수 있는 계정이 아니다. 소속 병원 계정으로 로그인(상담의 `hospital_id`↔`hospital_users`
  매칭 시 상담방 `role=doctor` 부여)하거나 게스트 초대링크로 참여. `accountTiers.ts`(타입·
  `STAFF_TIERS`·`ASSIGNABLE_TIERS`·`resolveTier`)·`roles.ts`·`requirePortalAuth`·`resolveLanding`
  에서 doctor 제거, `/admin/staff`는 코디네이터만, 상담 생성 모달의 '담당 의사 계정 배정' 칸 제거,
  죽은 `/doctor` 라우트 삭제. `requireConsultationAccess`에 병원 계정 입장 경로 추가.
  (DB 미사용 doctor 계정 1개 → 일반회원 강등. 상담 0건이 doctor 계정 배정 사용 중이라 무영향.)
- 2026-06-23: **계층 재편 마이그레이션(기획 `KHIDI_역할_프로세스_기획.md` §7 반영).** 국내 병원 포털
  `/partner`→`/hospital`(옛 주소 자동 리다이렉트, `/api/partner/*` API 경로는 유지). 해외 의료기관
  포털 `/agency`→`/clinic` 분리(에이전시는 `/agency` 유지, URL↔partner_type 불일치 시 자동 이동).
  의사 전용 포털 `/doctor` 비활성화(접속 시 홈으로 — 코드·계정은 보존, 상담 '담당 의사' 배정엔 계속 사용).
  `accountTiers.ts` portal 값·`resolveLanding.ts`·`proxy.ts` 갱신. 8계층 골격은 유지.
- 2026-06-21: 8계층 표준 확정. `accountTiers.ts` 단일 SoR 신설. 옛 `roles.ts`
  (`korean_hospital/local_clinic/agent`)는 표준에 맞춰 정리(레거시 별칭만 유지).
  해외 의료기관(8번) 신규 추가 — `agencies.partner_type` 재활용. 코디·의사 포털에
  역할 문지기(`StaffPortalGate`) 추가(이전엔 로그인만 확인).
