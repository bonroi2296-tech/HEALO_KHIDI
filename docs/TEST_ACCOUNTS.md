# 계층별 테스트 계정 — 백오피스 점검용

> 로그인: **`/login`** (로그인하면 계층에 맞는 포털로 자동 착지 — `resolveLanding.ts`)
> 계층 정의 표준: `src/lib/auth/accountTiers.ts` · 설명: `docs/ACCOUNT_TIERS.md` · 재편 배경: `docs/KHIDI_역할_프로세스_기획.md`
> 마지막 확인: 2026-06-23 (Supabase `auth.users` 실조회 + 계층 재편 마이그레이션 반영)

## ⚠️ 2026-06-23 계층 재편 — URL 바뀜

- 국내 병원 포털 `/partner` → **`/hospital`** (옛 주소는 자동 리다이렉트, 안 깨짐)
- 해외 의료기관 포털 `/agency` → **`/clinic`** 으로 분리 (에이전시는 `/agency` 그대로)
- 의사 전용 포털 `/doctor` → **비활성화**(접속 시 홈으로 리다이렉트). 의사 *계정*은 그대로 두어
  원격협진 상담 생성 시 '담당 의사' 배정에는 계속 쓰임. 의사는 상담방 초대링크 참여자로 입장.

## 한눈에

| # | 계층 | 테스트 계정 | 비번 | 로그인 후 착지 | 비고 |
|---|------|------------|------|----------------|------|
| 1 | 비회원(게스트) | — (계정 없음) | — | 상담방 `/consultation/[id]` | 화상상담 **초대링크 토큰**으로만 입장. 계정 X |
| 2 | 사용자(환자) | `patient@test.com` | `test1234` | `/patient` | role 없음 = 기본값 |
| 3 | 코디네이터 | `coordinator@test.com` | `test1234` | `/coordinator` | `app_metadata.role=coordinator` |
| 4 | 의사 | `doctor@test.com` | `test1234` | ⚠️ 포털 비활성화(홈으로) | 계정·상담배정은 유지 / 전용 화면 없음 |
| 5 | 관리자 | ⚠️ **전용 테스트 계정 없음** | — | `/admin` | 아래 ⚠️ 참고 — PO 실계정 사용 |
| 6 | 국내 의료기관 | `hospital@test.com` | `test1234` | **`/hospital`** | `hospital_users` owner · "TEST 병원" |
| 7 | 해외 에이전시 | `agency@test.com` | `test1234` | `/agency` | `agency_users` · "TEST 에이전시" |
| 8 | 해외 의료기관 | `clinic@test.com` | **`clinic1234`** | **`/clinic`** | `agency_users` · partner_type=medical_institution · 경과 업로드 가능 |

이 `@test.com` 6종은 2026-06-21 한 번에 만든 **QA 전용 세트**다. 에이전시·해외의료기관·국내병원은
**TEST 전용 기관에만 연결**돼 실데이터와 격리돼 있다.

> URL을 직접 치고 들어가도 계정 유형과 안 맞으면 맞는 포털로 자동 이동한다.
> 예: 에이전시 계정으로 `/clinic` 가면 `/agency`로, 의료기관 계정으로 `/agency` 가면 `/clinic`으로.

## ⚠️ 관리자(5번) — 테스트 계정을 일부러 안 만듦

`test1234` 같은 약한 비번의 admin 계정은 **환자 PII 복호화 권한**까지 갖게 돼 위험 →
의도적으로 미생성. admin 화면(`/admin/*`, 유치 전환 점수판 등)은 **PO 실계정**으로 점검:

- `bonroi2296@gmail.com` (실 admin, `app_metadata.role=admin`)

> DB에 `admin@test.healo.kr`(role=admin)가 있긴 하나 **한 번도 로그인 안 했고 비번 미상** → 쓰지 말 것.

## 비번 출처·주의

- **비번은 DB에서 못 꺼낸다**(해시 저장). 위 값은 생성 당시 기록 기준 →
  안 되면 `/admin/staff`(스태프) 또는 `/admin/khidi/agencies`(파트너)에서 **임시비번 재발급** 후 갱신.
- **clinic만 예외**: 처음엔 `test1234`였으나 이후 `clinic1234`로 바꾼 기록 있음 → `clinic1234` 먼저 시도.
- 레거시 세트 `@test.healo.kr`(2026-04 생성)는 매핑이 지저분함(예: `patient@test.healo.kr`가 실제론
  에이전시에 묶임) → **점검엔 쓰지 말고 위 `@test.com` 세트만 사용.**

## 점검 체크리스트(계층별 핵심 루프)

- **환자**: `/patient` — 문의·상담이력·증상기록·사후관리
- **코디네이터**: `/coordinator` — 환자 여정·상담 일정·증상 알림 (단, **admin 점수판 API는 코디로 안 통함**)
- **관리자(PO 실계정)**: `/admin` — 운영현황·유치 전환 점수판(KHIDI KPI 자동집계)·스태프/파트너 계정발급·상담 생성(담당 의사 배정)
- **국내 의료기관**: `/hospital` — 리드·병원 프로필 관리
- **해외 에이전시**: `/agency` — 의뢰 환자 진행상황 조회 + '환자 의뢰하기'
- **해외 의료기관**: `/clinic` — 위 + **경과 업로드**(검사결과·영상·소견, 사후관리 ICT ④)
- **의사**: 전용 포털 없음 — 코디가 상담을 잡고 **초대링크로 상담방(`/consultation/[id]`) 참여**
