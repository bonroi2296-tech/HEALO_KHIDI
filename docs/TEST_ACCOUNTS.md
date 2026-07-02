# 계층별 테스트 계정 — 백오피스 점검용

> 로그인: **`/login`** (로그인하면 계층에 맞는 포털로 자동 착지 — `resolveLanding.ts`)
> 계층 정의 표준: `src/lib/auth/accountTiers.ts` · 설명: `docs/ACCOUNT_TIERS.md` · 재편 배경: `docs/KHIDI_역할_프로세스_기획.md`
> 마지막 확인: 2026-07-02 (전수 감사 — `test1234` 로그인 실측 400 사망 확인, 강비번 교체 반영)

## ⚠️ 2026-06-23 계층 재편 — URL 바뀜

- 국내 병원 포털 `/partner` → **`/hospital`** (옛 주소는 자동 리다이렉트, 안 깨짐)
- 해외 의료기관 포털 `/agency` → **`/clinic`** 으로 분리 (에이전시는 `/agency` 그대로)
- 의사 전용 포털 `/doctor` → **비활성화**(접속 시 홈으로 리다이렉트). 의사 *계정*은 그대로 두어
  원격협진 상담 생성 시 '담당 의사' 배정에는 계속 쓰임. 의사는 상담방 초대링크 참여자로 입장.

## 한눈에

| # | 계층 | 테스트 계정 | 비번 | 로그인 후 착지 | 비고 |
|---|------|------------|------|----------------|------|
| 1 | 비회원(게스트) | — (계정 없음) | — | 상담방 `/consultation/[id]` | 화상상담 **초대링크 토큰**으로만 입장. 계정 X |
| 2 | 사용자(환자) | `patient@test.com` | `Healwith2026!` (Secret 보관) | `/patient` | role 없음 = 기본값 |
| 3 | 코디네이터 | `coordinator@test.com` | `Healwith2026!` (Secret 보관) | `/coordinator` | `app_metadata.role=coordinator` |
| 4 | 의사 | `doctor@test.com` | `Healwith2026!` (Secret 보관) | ⚠️ 포털 비활성화(홈으로) | 계정·상담배정은 유지 / 전용 화면 없음 |
| 5 | 관리자 | `admin@test.com` | `Healwith2026!` (Secret 보관) | `/admin` | E2E 자동검사용(2026-06-24 설정). **약한 비번 = 실서비스 PII 노출 위험** → 아래 ⚠️ + 🔴 오픈 전 삭제 |
| 6 | 국내 의료기관 | `hospital@test.com` | `Healwith2026!` (Secret 보관) | **`/hospital`** | `hospital_users` owner · "TEST 병원" |
| 7 | 해외 에이전시 | `agency@test.com` | `Healwith2026!` (Secret 보관) | `/agency` | `agency_users` · "TEST 에이전시" |
| 8 | 해외 의료기관 | `clinic@test.com` | `Healwith2026!` (Secret 보관) | **`/clinic`** | `agency_users` · partner_type=medical_institution · 경과 업로드 가능 (2026-06-24 `clinic1234`→`test1234` 통일) |

이 `@test.com` 6종은 2026-06-21 한 번에 만든 **QA 전용 세트**다. 에이전시·해외의료기관·국내병원은
**TEST 전용 기관에만 연결**돼 실데이터와 격리돼 있다.

> URL을 직접 치고 들어가도 계정 유형과 안 맞으면 맞는 포털로 자동 이동한다.
> 예: 에이전시 계정으로 `/clinic` 가면 `/agency`로, 의료기관 계정으로 `/agency` 가면 `/clinic`으로.

## ⚠️ 관리자(5번) — 상태 갱신 (2026-07-02 실측)

> **경위:** E2E 자동검사용으로 2026-06-24 `test1234` 통일 → **2026-06-29 전 계정 강비번 `Healwith2026!` 교체 완료**
> (GitHub Secret 동시 갱신). 2026-07-02 실측: `admin@test.com`에 `test1234` 로그인 시도 → **400 invalid_credentials(사망 확인)**.
> 옛 기록의 "약한비번 admin 잔존" 위험은 해소됨 — 이 문서가 갱신 전엔 그 위험을 실제보다 과장하고 있었음.

🟡 **남은 PO 결정 1건**: `admin@test.com`은 여전히 **활성 admin**(비번만 강해짐, 2026-07-01에도 로그인 이력). 옵션 둘:
① **강비번+Secret 보관 유지**로 관문 공식 종결(E2E 자동검사 유지 — 현 상태) ② **비활성**(`app_metadata.disabled=true`,
E2E admin 스펙 대체 계획 필요). → `docs/LAUNCH_GATES_PO.md` 관문 6.

- admin 화면을 **수동** 점검할 땐 PO 실계정 `bonroi2296@gmail.com`(실 admin) 권장(약한비번 노출 없음).
- DB의 `admin@test.healo.kr`는 **2026-06-26 비활성 처리됨**(`app_metadata.role` 해제 + `disabled=true`) — 한 번도 로그인 안 한 떠돌이 admin이라 보안상 정리. E2E 미사용 → CI 영향 없음. (출시 전 삭제 대상은 여전히 `admin@test.com`.)

## 비번 출처·주의

- **비번은 DB에서 못 꺼낸다**(해시 저장). 위 값은 생성 당시 기록 기준 →
  안 되면 `/admin/staff`(스태프) 또는 `/admin/khidi/agencies`(파트너)에서 **임시비번 재발급** 후 갱신.
- **2026-06-24 통일 → 2026-06-29 강비번 교체**: E2E Secrets 편의로 `test1234` 통일했다가,
  2026-06-29 전 계정 **`Healwith2026!`(외부공유용 강비번)** 으로 재교체 + GitHub Secrets 동시 갱신.
  GitHub Secrets 등록값: `docs/E2E_SECRETS_SETUP.md` 참조.
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
