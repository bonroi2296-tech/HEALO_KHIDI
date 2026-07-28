# E2E 자동 클릭검사 켜기 — GitHub Secrets 설치 (PO 5분)

> **왜 (POSTMORTEMS #35 S3):** 로그인이 필요한 화면(코디·환자·어드민·에이전시·의료기관)의 자동 클릭검사를
> 다 만들어 놨지만, **GitHub Secrets 미등록이라 매 PR에서 전부 `skip`** 된다 = 안전망이 꺼져 있음.
> 아래 값을 한 번 넣으면, 그 화면들이 **합치기 신청(PR)마다 자동으로 로그인→클릭 검사**된다.
> ("구현했다는데 안 됨"의 대부분을 기계가 먼저 잡아 PO가 화면에서 찾을 일을 줄인다.)

## 어디에 넣나
GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** → 아래 이름/값을 하나씩 추가.

## 무슨 값 (전용 더미 테스트 계정만 — 실제 환자/PII 금지)
각 역할의 **테스트 계정 이메일·비밀번호**. 계정이 없으면 `/admin/staff`(코디·환자) 또는 어드민에서 만들고,
비밀번호를 모르면 Supabase 대시보드에서 리셋해 값을 맞춘다. (비번이 Secret 값과 정확히 같아야 로그인됨.)

| Secret 이름 | 역할 | 켜지는 검사 |
|---|---|---|
| `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` | 환자 | `patient-mobile-chrome`(모바일 이중헤더 회귀) · `patient-symptoms-input` |
| `E2E_COORDINATOR_EMAIL` / `E2E_COORDINATOR_PASSWORD` | 코디 | `consultation-create-modal`(새 상담 모달) · `coordinator-request-info`(추가정보 요청) |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | 어드민 | `admin-kpi-dashboard` · `admin-feedback-list` |
| `E2E_AGENCY_EMAIL` / `E2E_AGENCY_PASSWORD` | 해외 에이전시 | `agency-portal`(포털 접근 — **신규, 그동안 사각지대**) |
| `E2E_CLINIC_EMAIL` / `E2E_CLINIC_PASSWORD` | 해외 의료기관 | `clinic-portal`(포털 접근 — **신규, 그동안 사각지대**) |
| `E2E_HOSPITAL_EMAIL` / `E2E_HOSPITAL_PASSWORD` | 국내 병원 | `hospital-portal`(포털·프로필·진료항목 — **2026-07-28 신설. 그전엔 역할 목록에 아예 없어서 어떤 방법으로도 확인 불가였다**) |

> 일부 검사는 **시드 데이터**도 필요(예: 코디 문의 #17, 환자 증상 입력 UI) — 없으면 그 케이스만 추가 skip.
> 환자/코디/어드민 6개만 먼저 넣어도 핵심 화면 8개가 즉시 보호된다. 에이전시/의료기관 4개는 그다음.

## 넣은 뒤 확인
아무 PR이나 새로 푸시 → **Smoke Tests (PR)** 잡 로그에서 해당 spec이 `skip`이 아니라 **실제 실행**되는지 확인.
(이 문서·`e2e/fixtures/auth.ts`의 env 키와 Secret 이름이 정확히 일치해야 함.)
