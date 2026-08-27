# HEALO 외부 계정 · 키 등록 가이드

> 대상: 프로덕트 오너 (본인)
> 목적: 내일 하루 안에 모든 외부 계정을 세팅하고 env 에 키를 채워 배포 가능 상태로.
> 작성일: 2026-04-20

---

## 순서 개요 (체크리스트)

| # | 항목 | 난이도 | 예상 시간 | 긴급도 |
|---|------|--------|----------|--------|
| 1 | Supabase 키 회전 + Leaked Password Protection | 쉬움 | 10분 | 🔴 즉시 |
| 2 | Vercel 환경변수 반영 | 쉬움 | 15분 | 🔴 즉시 |
| 3 | 서버 시크릿 3종 생성 + 반영 | 쉬움 | 5분 | 🔴 즉시 |
| 4 | Google AI (Gemini) 키 회전 | 쉬움 | 5분 | 🔴 즉시 |
| 5 | Google Maps 키 회전 + HTTP Referrer 제한 | 중간 | 15분 | 🔴 즉시 |
| 6 | HIRA / Kakao / Naver 키 회전 | 쉬움 | 각 5~10분 | 🟠 24시간 |
| 7 | LiveKit Cloud 계정 개설 + API Key | 중간 | 20분 | 🔴 즉시 (원격진료 동작 안 함) |
| 8 | Sentry 계정 + 프로젝트 + DSN | 쉬움 | 10분 | ✅ 완료 (프로덕션 가동, 2026-07-07 검증) |
| 9 | AWS SES (이메일 발송) | 중간 | 30~60분 | 🟠 24시간 |
| 10 | DROP 마이그레이션 2종 실행 | 쉬움 | 5분 | 🟡 일주일 |
| 11 | 개인정보처리방침 법무 리뷰 | — | 법무팀 | 🟠 런칭 전 |

**총 예상 시간**: 2~3시간 (AWS SES 제외 시 1.5시간)

---

## 1. 🔴 Supabase — 키 회전 + Leaked Password Protection

### 1-1. Service Role 키 회전

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 **HEALO-KHIDI** (`hvwwlkawaxabhtumjhrg`) 선택
3. 좌측 메뉴 **Settings → API** 클릭
4. **Project API keys** 섹션에서 **service_role** 키 우측 **Reset** 클릭 → 확인
5. 새 키 복사 (한 번만 보임)

### 1-2. Anon 키 회전

같은 화면에서 **anon** 키도 **Reset** → 새 키 복사

### 1-3. 비밀번호 보안 강화 (Free tier 대응)

⚠️ **"Prevent use of leaked passwords" (HaveIBeenPwned 연동) 는 Pro plan 전용 유료 기능.**
Free tier 에서는 대신 아래 4개 설정으로 동등 수준 방어 구성.

1. 좌측 **Authentication → Attack Protection** 이동
2. **"Prevent use of leaked passwords"** 행의 **`Configure email provider`** 버튼 클릭
3. `Sign In / Providers → Email` 패널이 열림
4. 다음 4개 설정 변경:

| 항목 | 변경 | 이유 |
|------|------|------|
| **Secure password change** | OFF → **ON** | 비번 변경 시 최근 24h 재로그인 요구 (세션 탈취 방어) |
| **Require current password when updating** | OFF → **ON** | 비번 변경 시 현재 비번 필수 (XSS 시 비번 탈취 방어 핵심) |
| **Minimum password length** | 6 → **10** | 6자는 brute force 로 뚫림, 10자 이상 권장 |
| **Password requirements** | 미설정 → **Lowercase, uppercase, digits and symbols** | 복잡도 강제 |

5. 맨 아래 **Save** 클릭

### 1-3a. 나중에 Pro 업그레이드 시 고려사항

Pro plan ($25/월) 올리면 아래 자동 활성:
- Prevent leaked passwords (HaveIBeenPwned DB 대조)
- 자동 일일 백업 + PITR
- 8GB DB (Free 는 500MB)

**파일럿 환자 10명 초과 or 1개월 운영 후** 업그레이드 권장.

### 1-3b. Captcha 보호 (선택, 나중에)

**"Enable Captcha protection"** 는 지금 skip.
ON 하려면 hCaptcha 계정 + Site Key + Secret + 가입 폼 UI 코드 수정 필요.
가입 스팸 실제 발생 시 그때 설정.

### 1-4. Database 백업 확보 (마이그레이션 실행 전)

1. 좌측 **Database → Backups**
2. **Create backup** 클릭 → 완료까지 대기 (보통 1~5분)
3. 백업 파일명 어딘가 기록

---

## 2. 🔴 Vercel 환경변수 반영

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 **healo-khidi** 선택
3. **Settings → Environment Variables** 이동
4. 아래 값 교체 (Production + Preview + Development 모두):

```bash
# Supabase (위 1-1, 1-2 에서 받은 새 키)
SUPABASE_SERVICE_ROLE_KEY=<새_service_role_key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<새_anon_key>

# URL 은 그대로
NEXT_PUBLIC_SUPABASE_URL=https://hvwwlkawaxabhtumjhrg.supabase.co
```

5. 저장 후 **Deployments → 최근 배포 우측 ⋯ → Redeploy** 로 재배포 트리거

### 로컬 `.env.local` 동기화

```bash
# C:\Users\user\Desktop\HEALO_KHIDI\.env.local 열어서 동일 값 업데이트
# 수정 후 dev 서버 재시작
npm run dev
```

---

## ⚠️ Vercel "Need to Rotate" 배지 대응

Vercel 이 오래된 env 변수에 "Need To Rotate" 경고 배지를 붙입니다.
**다 회전해야 하는 건 아님.** 각 변수별 대응:

### 🔴 절대 회전 금지 (데이터 손실 위험)

| 변수 | 이유 |
|------|------|
| `SUPABASE_ENCRYPTION_KEY` | DB `inquiries.encrypted_email`, `cancer_patient_intakes.*_encrypted` 복호화 불가 |
| `ENCRYPTION_KEY_V1` | 구버전 암호화 데이터 복호화 불가 |

**조치**: 각 행 우측 `...` → **Dismiss rotation warning** 만 클릭.
회전하려면 `scripts/reencrypt-inquiries-email.mjs` 같은 재암호화 배치를 먼저 돌려야 함.

### 🟡 외부 서비스 재발급 필요 (급하진 않음)

| 변수 | 대응 | 긴급도 |
|------|------|-------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI Studio 에서 재발급 | 🟠 24h |
| `HIRA_API_KEY` | 공공데이터포털 재발급 | 🟡 1주 |
| `KAKAO_REST_API_KEY` | 앱 키 회전 불가 — 유출 의심 시만 새 앱 생성 | 🟡 1주 |
| `NAVER_CLIENT_SECRET` | Naver Developers → Client Secret 재발급 | 🟡 1주 |

DB 안쪽 개인정보와 무관한 외부 API 키들이라 당장 유출 증거 없으면 급하지 않음.

### ✅ 자체 생성 (지금 즉시)

`CRON_SECRET`, `INTERNAL_ADMIN_SECRET`, `INTERNAL_API_SECRET` — 아래 #3 참조.

---

## 3. 🔴 서버 시크릿 3종 생성

### 3-1. 새 시크릿 생성 (각 한 번씩)

PowerShell 또는 Git Bash 에서:

```bash
# 각 줄 한 번씩 실행 — 출력값 복사
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3-2. Vercel + 로컬 env 반영

```bash
INTERNAL_ADMIN_SECRET=<첫번째_출력>
INTERNAL_API_SECRET=<두번째_출력>
CRON_SECRET=<세번째_출력>
```

### 3-3. Encryption Key 검증 (기존)

`SUPABASE_ENCRYPTION_KEY` 또는 `ENCRYPTION_KEY_V2` 가 **64자 hex** 인지 확인:

```bash
npm run check:env
```

⚠️ 이 키를 회전하려면 기존 암호화된 데이터 재암호화가 필요하므로 지금은 건드리지 말 것.

---

## 4. 🔴 Google AI (Gemini) 키 회전

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. 기존 키 **Delete**
3. **Create API Key** → 프로젝트 선택 → 새 키 생성
4. Vercel + 로컬 env 반영:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=<새_키>
```

---

## 5. 🔴 Google Maps 키 회전 + HTTP Referrer 제한

1. [GCP Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. 기존 Maps 키 클릭 → **Delete** → **Create credentials → API Key**
3. 새 키 **Edit** 클릭 → **Application restrictions**:
   - **HTTP referrers (web sites)** 선택
   - 아래 URL 추가:
     ```
     https://healo-khidi.com/*
     https://*.healo-khidi.com/*
     https://*.vercel.app/*
     http://localhost:3000/*
     ```
4. **API restrictions → Restrict key** 선택 → 아래만 체크:
   - Maps JavaScript API
   - Places API
   - Geocoding API (필요 시)
5. Save → Vercel + 로컬 env 반영:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<새_키>
```

---

## 6. 🟠 HIRA / Kakao / Naver 키 회전

### 6-1. HIRA (건강보험심사평가원)
1. [공공데이터포털](https://www.data.go.kr) 로그인
2. 마이페이지 → 활용신청 현황 → HIRA 관련 API 목록
3. 각 API 우측 **인증키 재발급** → 새 키 반영:
```bash
HIRA_API_KEY=<새_키>
```

### 6-2. Kakao REST API
1. [Kakao Developers Console](https://developers.kakao.com/console/app)
2. 내 애플리케이션 → 앱 선택 → **앱 키** → REST API 키 확인 (회전 불가, 새 앱 생성 시만)
3. 필요 시 **새 애플리케이션 생성** → 새 REST API 키
```bash
KAKAO_REST_API_KEY=<키>
```

### 6-3. Naver OpenAPI
1. [Naver Developers](https://developers.naver.com/apps)
2. 기존 앱 → **Client Secret 재발급**
```bash
NAVER_CLIENT_ID=<기존>
NAVER_CLIENT_SECRET=<새_시크릿>
```

---

## 7. 🔴 LiveKit — 원격진료 (중요)

> 현재 상태: 코드 전부 준비됨 (`app/api/khidi/consultation/token/route.ts`), **키만 없으면 원격진료 버튼 누를 때 500 에러**.

### 7-1. 계정 개설

1. [LiveKit Cloud](https://cloud.livekit.io) 접속 → **Sign up**
2. GitHub 또는 Google 로그인 권장 (빠름)
3. 조직명: `HEALO` 또는 `KHIDI` (원하는 대로)
4. 가입 후 **Free tier** 시작 (월 10,000 분 무료 — 환자 수십 명 커버)

### 7-2. 프로젝트 생성

1. Dashboard 에서 **+ New Project** 클릭
2. 이름: `healo-khidi-prod` (프로덕션)
3. Region: **Asia Pacific (Singapore 또는 Tokyo)** — 한국 레이턴시 최적
4. **Create**

### 7-3. API Key 발급

1. 좌측 **Settings → Keys** 이동
2. **Add Key** 클릭
3. 이름: `healo-server` (서버용)
4. Permission: 기본값 (Room Admin)
5. 발급된 **URL / API Key / Secret** 3가지 전부 복사 (Secret 은 한 번만 보임!)

### 7-4. env 반영

```bash
# Vercel + .env.local
NEXT_PUBLIC_LIVEKIT_URL=wss://<프로젝트명>.livekit.cloud   # WSS 프로토콜 주의
LIVEKIT_API_KEY=<API Key>
LIVEKIT_API_SECRET=<API Secret>
```

⚠️ `NEXT_PUBLIC_LIVEKIT_URL` 은 **`wss://`** 시작이어야 함 (https 아님).

### 7-5. 동작 확인

1. `npm run dev` 로 로컬 재시작
2. `/consultation/[아무_UUID]` 접속 시도 — "세션 찾을 수 없음" 이면 정상 (인증/IDOR 차단 작동)
3. 실제 세션 만드는 건 `/admin/consultations` 에서
4. 프로덕션 배포 후 실제 환자-의사 세션으로 테스트

### 7-6. Webhook 설정 (선택)

세션 종료·녹화 이벤트를 DB 에 기록하려면:
1. LiveKit Dashboard → **Settings → Webhooks → Add webhook**
2. URL: `https://healwith.co.kr/api/livekit/webhook` (라우트 구현됨 — `app/api/livekit/webhook/route.ts`)
   - ⚠️ 이전 문서의 `healo-khidi.com` 은 죽은 옛 도메인이라 이벤트가 오지 않았음. 반드시 `healwith.co.kr` 로 등록할 것.
   - 참고: `room_finished` 는 상담을 자동으로 '완료' 처리하지 **않는다**(성과지표 K-02 정직성 — 완료는 staff 가 상담관리에서 직접). 녹화 URL 기록·로깅 용도.

---

## 8. 🟠 Sentry — 에러 모니터링

> ✅ **현재 상태: 프로덕션 연결·가동 중** (2026-07-07 라이브 검증 — healwith.co.kr HTML에 `sentry-trace`·`sentry-environment` 메타 주입 + CSP `connect-src`에 `*.ingest.de.sentry.io` 허용 확인. DSN 리전 = `ingest.de.sentry.io`). 코드는 `NEXT_PUBLIC_SENTRY_DSN` 있을 때만 켜지며(`instrumentation.ts`·`sentry.*.config.js`), 그 DSN이 Vercel 프로덕션에 설정돼 있음.
> 아래 8-1~8-2는 **재설정·신규 프로젝트가 필요할 때만** 참고(이미 켜져 있으면 손댈 것 없음).

### 8-1. 계정 + 프로젝트

1. [Sentry.io](https://sentry.io) 가입 — GitHub 로그인
2. Plan: **Developer (무료)** — 월 5,000 events 무료
3. **Create Project**:
   - Platform: **Next.js**
   - Project name: `healo-khidi`
   - Team: 본인 또는 기본
4. 생성 후 **Configure Next.js** 화면에서 **DSN** 복사 (형식: `https://xxx@o0.ingest.sentry.io/0`)

### 8-2. env 반영

```bash
NEXT_PUBLIC_SENTRY_DSN=https://<public_key>@o<org_id>.ingest.sentry.io/<project_id>
SENTRY_ORG=<Sentry 조직 slug, URL 에서 확인>
SENTRY_PROJECT=healo-khidi
```

### 8-3. Source Map Upload (선택, 스택트레이스 정확도 향상)

1. Sentry **Settings → Developer Settings → Auth Tokens → Create New Token**
2. Scope: **project:releases + project:write** 체크
3. 토큰 복사
4. Vercel env:
```bash
SENTRY_AUTH_TOKEN=<토큰>
```

### 8-4. 동작 확인

1. 재배포 후 프로덕션 URL 접속
2. 브라우저 콘솔에서 `throw new Error("sentry test")`
3. Sentry Dashboard → **Issues** 에 1분 내 뜸

---

## 9. 🟠 AWS SES (이메일 발송) — 선택

> 현재 상태: 코드는 `/api/email/*` 에 scaffold 있지만 키 없으면 비활성.
> 필요성: 예약 확인 / 상담 알림 / 비자 안내 자동 이메일.

### 9-1. AWS 계정 개설

1. [AWS Console](https://aws.amazon.com/ko/) 에서 가입 (신용카드 필요)
2. 결제 정보 등록 (프리 티어 한도 내면 무료)

### 9-2. SES 설정

1. Console 에서 리전 **Seoul (ap-northeast-2)** 선택
2. **SES (Simple Email Service)** 이동
3. **Verified identities → Create identity**:
   - Identity type: **Domain** 또는 **Email address**
   - 도메인: `healo-khidi.com` (도메인 소유 시) 또는 발신 이메일 주소
   - DNS TXT 레코드 추가 지시 따르기 (도메인인 경우)
4. **Sandbox → Production 요청** (Sandbox 는 검증된 주소만 발송 가능):
   - **Account dashboard → Request production access**
   - 사용 목적 설명 작성 (환자 예약 확인 등)
   - 승인까지 24~48시간

### 9-3. IAM 유저 생성 (SES 전용 키)

1. **IAM → Users → Create user**
2. 이름: `healo-ses-sender`
3. Permissions: **Attach policies directly → AmazonSESFullAccess**
4. 유저 생성 후 **Security credentials → Create access key**
5. Use case: **Application running outside AWS**
6. Access key ID + Secret access key 복사 (Secret 한 번만)

### 9-4. env 반영

```bash
AWS_SES_REGION=ap-northeast-2
AWS_SES_ACCESS_KEY_ID=<Access Key>
AWS_SES_SECRET_ACCESS_KEY=<Secret>
AWS_SES_FROM_EMAIL=noreply@healo-khidi.com
```

---

## 10. 🟡 DROP 마이그레이션 실행 (일주일 내)

### 10-1. 백업 먼저

1. Supabase Dashboard → **Database → Backups → Create backup** (위 1-4 와 동일)

### 10-2. SQL Editor 에서 실행

#### inquiries.email 평문 DROP
1. Supabase Dashboard → **SQL Editor → New query**
2. 파일 내용 복사 붙여넣기: `migrations/20260420_drop_inquiries_plaintext_email.sql`
3. **Run** 클릭
4. 결과:
   - `NOTICE: Safety check passed` 뜨면 정상
   - `ERROR: N rows have plaintext email but NULL encrypted_email` 뜨면 **중단** — 재암호화 스크립트 먼저 돌려야 함 (별도 작업 필요)

#### cancer_patient_intakes 평문 DROP
동일 절차로 `migrations/20260420_drop_cancer_intake_plaintext.sql` 실행.

### 10-3. 실행 후 검증

```sql
-- inquiries 확인 (email 컬럼 없어야 함)
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='inquiries'
  AND column_name LIKE '%email%';

-- cancer_patient_intakes 확인 (3개 컬럼 없어야 함)
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='cancer_patient_intakes'
  AND column_name IN ('first_name', 'current_treatment', 'diagnosis_date');
```

### 10-4. 타입 재생성

DB 스키마가 변경됐으므로 `database.types.ts` 도 재생성:
```bash
# Claude 에게 "database.types.ts 재생성" 요청 → MCP 로 자동 처리
```

---

## 11. 🟠 개인정보처리방침 법무 리뷰

### 11-1. 현재 상태

- ⚠️ **경로 정정 (2026-08-27)** — 아래 설명이 가리키던 `app/signup/SignupPremium.jsx` 는 **없는 파일**이다.
  폐기된 premium 가입 화면이었고 프리미엄 전면 폐기 커밋(`825d61e3` / PR #288)에서 화면째 삭제됐다.
  **현재 국외이전 동의를 받는 곳은 문의 폼**(`app/inquiry/_components/UnifiedInquiryFunnel.jsx`, `crossBorder` 필수)이고,
  가입 화면(`app/signup/SignupClient.jsx`)은 「개인정보 수집·이용」 + 「이용약관」만 받는다 —
  **이건 누락이 아니라 의도된 설계**다(`src/lib/legal/consentForms.js` 「문 앞 마찰 0 유지」).
  법적 판단의 최신본은 `src/lib/legal/privacyPolicy.js` 머리 주석(2026-08-20 실측: 진짜 문의 6건 전부 `cross_border_kr` 기록됨)이다.
  → 아래 「11-2 법무 검토 포인트」는 **2026-04~05 시점 문서**다. 그 뒤 방침이 여러 번 갱신됐으니 여기 것을 근거로 쓰지 마라.
- 6항목 고지: 이전 목적 / 이전 항목 / 수탁자(국가) / 이전 방법 / 보관 기간 / 거부권
- 한국어 / 영어 기본

### 11-2. 법무 검토 포인트

1. **이전 목적 문구**: "의료 상담 매칭, 번역, AI 챗봇, 원격진료 호스팅" — 포괄적 표현 OK?
2. **이전 항목**: "병력, 치료 선호도, 상담 영상/음성" 이 민감정보 동의 문구로 충분한지
3. **수탁자 목록**: Google LLC / LiveKit Inc. / AWS — 정확한 법인명 + 주소 표기 필요?
4. **보관 기간**: "계정 삭제 시 또는 3년간 미활동 시까지" — 약관과 일치하는지
5. **거부권**: 현재 "거부 시 매칭·번역·원격진료 불가" — 근거 있는지

### 11-3. `/privacy` 페이지 반영

법무 피드백 받은 문구를 `/privacy` 페이지 본문에도 동일하게 적용.
현재 `src/lib/policies.js` 에 정책 문구가 있음 (확인 필요).

### 11-4. 다국어 번역 추가

현재 ko / en 만. ru / kz / zh / ja 추가 번역 필요.
(법무 검토 후 한국어 원본 확정되면 Claude 에게 번역 요청 가능)

---

## 📋 최종 체크리스트

완료하면 각 항목 체크:

### 🔴 P0 — 즉시
- [x] Supabase service_role 키 회전 (2026-04-20)
- [x] Supabase anon 키 회전 (2026-04-20)
- [x] Supabase 비밀번호 정책 강화 (10자+ / 복잡도 / secure change / require current)
- [ ] Supabase Database 백업 생성 (마이그레이션 실행 전 권장)
- [ ] `INTERNAL_ADMIN_SECRET` 생성 + 반영 (미룸 — 이번 주)
- [ ] `INTERNAL_API_SECRET` 생성 + 반영 (미룸 — 이번 주)
- [ ] `CRON_SECRET` 회전 (미룸 — 이번 주)
- [ ] Google AI API 키 회전 (연 1회 권장, 긴급도 낮음)
- [ ] Google Maps API 키 회전 + HTTP Referrer 제한 (연 1회 권장)
- [x] LiveKit 계정 + 프로젝트 + API Key 발급 (2026-04-20)
- [x] LiveKit URL / KEY / SECRET Vercel + 로컬 env 반영 (2026-04-20)
- [x] Vercel Redeploy 트리거 (2026-04-20)
- [x] 로컬 `.env.local` 동기화 (2026-04-20)
- [ ] `npm run check:env` 통과 확인 (Redeploy 후 로컬에서)

### 🟠 P1 — 24시간
- [ ] HIRA 키 회전
- [ ] Kakao REST API 키 (필요 시)
- [ ] Naver Client Secret 재발급
- [ ] Sentry 계정 + 프로젝트
- [ ] `NEXT_PUBLIC_SENTRY_DSN` 반영
- [ ] Sentry 동작 확인 (의도적 에러 발생)
- [ ] AWS SES 계정 + 도메인 인증 시작 (Production 승인 대기 24-48h)

### 🟡 P2 — 일주일
- [ ] inquiries.email DROP 마이그레이션 실행
- [ ] cancer_patient_intakes 평문 DROP 실행
- [ ] 실행 후 `database.types.ts` 재생성 요청
- [ ] 개인정보처리방침 법무 검토 요청

### ✅ 최종 배포 검증
- [ ] Vercel 프로덕션 재배포 성공
- [ ] `npm run build` 로컬 통과
- [ ] `npm run test:run` 468/468 통과
- [ ] 회원가입 플로우 E2E 테스트 (PIPA 동의 체크박스 동작)
- [ ] `/admin/consultations` 에서 세션 생성 → LiveKit 토큰 발급 → 실제 방 참여 테스트
- [ ] Sentry 에 테스트 에러 들어오는지 확인

---

## ❓ 문제 생기면

### 키 회전 후 500 에러 쏟아지면
- Vercel env 반영 후 **Redeploy 누락** 체크
- 로컬 `.env.local` 업데이트 후 `npm run dev` 재시작했는지 확인

### LiveKit 연결 실패
- URL 이 `wss://` 로 시작하는지 확인
- LiveKit Dashboard 의 Region 과 지연 시간 체크
- 브라우저 Console 에서 WebRTC 에러 메시지 확인

### Sentry 에 에러 안 들어옴
- DSN 이 `NEXT_PUBLIC_` 프리픽스 달려있는지 (클라이언트도 접근해야 함)
- `NODE_ENV === "production"` 에서만 활성 — 로컬 개발에서는 안 뜨는 게 정상
- 의도적 에러: 브라우저 콘솔에 `throw new Error("sentry test " + Date.now())`

### 마이그레이션 실행 시 RAISE EXCEPTION
- `N rows have plaintext email but NULL encrypted_email` → 재암호화 스크립트 필요 (별도 작업)
- 증상 첨부해서 Claude 에게 문의

---

*모든 항목 완료 후 `docs/SECURITY_ACTION_ITEMS.md` 의 체크박스도 업데이트.*
