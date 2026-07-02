# 서비스 오픈 전 PO 관문 — 콘솔 작업 안내 (2026-06-24 작성 · **2026-07-02 전수 감사 실측 갱신**)

> 코드·시스템은 준비 끝(자동검사 전수 초록·프로덕션 실측). **오픈 go/no-go는 아래 PO 콘솔/실기기 작업에 달림.**
> 관문4(E2E 시크릿)는 `docs/E2E_SECRETS_SETUP.md`, 테스트계정은 `docs/TEST_ACCOUNTS.md` 참조.
> **2026-07-02 전수 감사에서 각 관문을 실DB·GitHub·Vercel API로 재실측** — 닫힌 것은 ✅로 확정, 진짜 남은 건 아래 "지금 남은 관문"뿐.

## 🎯 지금 남은 관문 (2026-07-02 실측 — 우선순위순 · PO 결정 3건 반영)

| 순위 | 관문 | 누가 | 비고 |
|---|------|------|------|
| 1 | 🔴 **관문7 — Gemini 유료 결제 확인** (의료 PII 학습 방지) | PO 콘솔 | **보채기 복귀(2026-07-02 PO 재정정)** — 실사용자가 이미 유입 중(실적 문의 13건·AI챗 공개)이라 "실운영 중 미결제" 상황에 해당. 다음 콘솔 작업 시 1순위 |
| 2 | 🟢 **관문8 — 텔레그램 알림 env 2개** | PO 콘솔 | ↓ 아래 가이드 |
| 3 | 🟡 **관문10 — DPA 서명** (무료) | PO | `docs/audit/DPA_SIGNING_GUIDE.md` |
| 4 | 🔴 **관문13~17 — 앱스토어**(결제·Firebase·에셋·빌드) | PO | 아래 C섹션 · **결제 부분은 보채기 제외**(PO 인지·직접, 2026-07-02) |
| + | 🟡 `TEST_OFFICE_IPS` env 등록 — 사무실 IP 자동 테스트태깅 활성화(PO만 값을 앎) | PO 콘솔 | Vercel prod env |
| + | 🟢 (선택) Supabase 유출비번 보호 켜기 — Authentication → Password 에서 체크 1개 | PO 콘솔 | advisor WARN |
| + | 🟢 (선택) Resend 도메인 검증 — E2E 실패 알림 메일이 403으로 안 오는 중(`onboarding@resend.dev` 발신) | PO 콘솔 | E2E 무감시 방지 |

> 💤 **보채기 제외 규칙(2026-07-02 PO 지시 + 같은 날 재정정)**: 유료 결제류 관문은 PO가 인지·직접 처리 예정이라 기본은 보채기 제외. **단 예외(PO 재정정): "실제 운영이 돌아가는데도 결제 안 해주면 그건 보채야 해. 너는 나의 견제자야"** — 실사용자·실데이터가 미결제 상태의 리스크에 실제 노출되고 있으면 보채기 복귀(관문7이 현재 이 경우). 앱스토어 결제($99/$25)는 실운영 리스크가 아니라 출시 일정 문제라 제외 유지. 새로운 돈 이슈는 항상 즉시 보고.

> ✅ **2026-07-02 PO 결정 3건 실행 완료**: ①관문9 테스트 문의 태깅 — 12건(13·14·17·20·26~31·AI챗 33·34) `is_test=true` 도장 완료(실DB, 가역), 대시보드 '실적만' 뷰 즉시 정화(실적 문의 13건/테스트 22건, 의심 국적값 잔여 0) ②관문6 — `admin@test.com` **강비번 유지로 공식 종결**(E2E 자동검사 유지, 비번은 GitHub Secret 보관) ③**main 브랜치 보호 켜짐** — required checks `ci`+`Smoke Tests (PR)`, PO(admin) 긴급 우회 가능(enforce_admins=off).

## 한눈에 — 전체 관문 상태

### A. 출시 기본 관문 (2026-06-24 → 2026-07-02 실측)

| # | 관문 | 누가 | 상태 |
|---|------|------|------|
| 1 | 가입→인증메일→로그인 실메일 1회 | PO | ✅ **닫힘** — 2026-07-01 실가입 1건 `email_confirmed` 실DB 확인(PO 실테스트) |
| 2 | Supabase 이메일 템플릿 href → `token_hash` | PO 콘솔 | ✅ **닫힘** — 관문1 통과가 증거(token_hash 정상, 메모리 기록 일치) |
| 3 | **구글 OAuth 게시(테스트→프로덕션)** | PO 콘솔 | ✅ **닫힘(2026-07-02 실측)** — PO가 이전에 게시 완료. 증거: 외부 계정(medextravel.kg@gmail.com — PO가 당일 제휴미팅한 키르기스스탄 에이전시, 콘솔 테스트 사용자로 등록한 적 없음)이 2026-07-02 구글 로그인 실가입 성공(auth.users 실DB). 테스트 모드였다면 불가능 |
| 4 | E2E Secrets 등록 | PO | ✅ **닫힘** — `gh secret list` 실측: E2E_* 10종+SERVICE_ROLE+ENCRYPTION_KEY_V1, 비번 시크릿 2026-06-29 갱신 |
| 5 | iOS 영상 마이크 실기기 / K-01 점수판 정직성 | PO | 🟡 iOS 실기기=화상상담 세션 검증 중 / K-01 데모 4건은 is_test 태깅돼 기본뷰에서 자동 제외(#501) — 정직성 구조 확보 |
| 6 | 약한비번 테스트계정 | PO | ✅ **닫힘(PO 결정 2026-07-02)** — `test1234` 실측 400(사망), 전 계정 강비번+GitHub Secret 보관. `admin@test.com`은 **강비번 유지로 공식 종결**(E2E 자동검사 유지) |

### B. 추가 관문 (2026-06-29 → 2026-07-02 실측)

| # | 관문 | 누가 | 상태 |
|---|------|------|------|
| 7 | 🔴 **Gemini 유료 결제 확인** — 무료 등급이면 환자 건강정보가 구글 모델 학습에 쓰일 수 있음 | PO 콘솔 | 열림(코드로 검증 불가) |
| 8 | 🟢 **텔레그램 새 문의 알림** — 코드(#430) 배포됨 | PO 콘솔 | 열림 — Vercel prod env에 TELEGRAM_* 없음(2026-07-02 env API 실측) |
| 9 | 테스트 문의 정리 | PO/나 | ✅ **닫힘(2026-07-02)** — 12건(13·14·17·20·26~31·AI챗 33·34) is_test 태깅 완료(가역). 실적 문의 13건/테스트 22건, 의심 국적값 잔여 0 |
| 10 | 🟡 **DPA 서명** | PO | 열림(코드로 검증 불가) |
| 11 | 법무문서 PR #422·#424 | PO | ✅ **닫힘** — 2026-06-30 둘 다 머지(gh 실측) |

> 🆕 **관문 외 신규(2026-07-02 감사)**: ①Vercel prod env `TEST_OFFICE_IPS` 미설정 — 사무실 IP 자동 테스트태깅이 무장해제 상태(PO만 값을 앎, 콤마구분 공인IP) ②~~발급 PDF 한글·키릴 깨짐~~ → 같은 날 #603으로 해결(폰트 셀프호스팅).

### C. 📱 앱 스토어 등록 관문 (2026-06-29 패키징 전수조사로 추가)

> **코드는 준비 끝** — 카메라·마이크·푸시 권한, Capacitor 셸, Codemagic 자동빌드, 6개어 등록문구 모두 됨(#465 머지). 아래는 **결제·콘솔·실기기 = PO만 가능한 것**. 상세는 `docs/APP_STORE_LISTING.md`.

| # | 관문 | 누가 | 상태 |
|---|------|------|------|
| 12 | ✅ **도메인 `healwith.co.kr` 등록·Vercel 연결** — 앱 셸이 이 주소를 로드. **2026-06-29 라이브 확인됨**(HTTP 200, 우리 앱 서빙, `/privacy` 200). `DOMAIN_CUTOVER` 문서는 6/18자라 낡음 | PO | ✅ 완료 |
| 13 | 🔴 **애플 개발자 $99/년 + 구글 플레이 $25 결제** + App ID·앱 생성(`kr.co.healwith.app`) | PO | 미결제 |
| 14 | 🔴 **Firebase 설정파일 커밋** — `android/app/google-services.json`·`ios/App/App/GoogleService-Info.plist` + iOS APNs `.p8` 업로드 (없으면 푸시 무동작) | PO | 미설정 |
| 15 | 🟡 **Vercel env 2개**(서버 푸시 발송) — `FCM_PROJECT_ID`·`GOOGLE_SERVICE_ACCOUNT_JSON` → `/api/push/test`로 실기기 수신 확인 | PO 콘솔 | 미설정 |
| 16 | 🟡 **스크린샷·앱아이콘·데이터안전(라벨) 설문** — iOS 6.7"/6.5", Android 폰+피처그래픽 1024×500, 수집항목 신고 | PO | `APP_STORE_LISTING.md` 체크리스트 |
| 17 | 🟡 **Codemagic UI 1회 세팅** — App Store Connect API키·Play 서비스계정·Android 키스토어 등록 → `ios-release`/`android-release` 워크플로 실행 → TestFlight/내부테스트 1회 후 심사 제출 | PO | `codemagic.yaml` 주석에 절차 |

> **순서**: ~~12(도메인=완료)~~ → **13(결제·앱생성) → 14·15(푸시) → 16(에셋) → 17(빌드·제출)**. 도메인이 살아있으므로 실제 시작점은 **13(애플·구글 결제)**.
> **애플 4.2 반려 주의**: 단순 웹뷰 래퍼는 반려됨 — 우리는 푸시알림+원격협진(카메라/마이크 영상)이라는 네이티브 가치가 있어 통과 근거 있음(제출 시 이 기능들 시연).

---

> **KHIDI 8/27 중간평가 직결**: K-01 유치 점수판이 아직 시드 데모데이터(진짜 유치 0건) — 실 유치건 생기면 대체해야 점수 반영(관문 5와 연결).

---

## 📧 관문 2 — Supabase 이메일 템플릿을 `token_hash`로 교체

**왜:** 지금 가입·비번찾기 메일 링크는 Supabase 기본(`{{ .ConfirmationURL }}`)이라 ①보안 스캐너 봇이 링크를 미리 클릭해 일회용 토큰을 태워버리거나 ②우리 6개 언어 확인 페이지를 안 거침. 우리 앱 페이지로 직접 보내면 자동로그인+스캐너 안전이 완성됨.

**어디서:** Supabase 대시보드 → 프로젝트(`hvwwlkawaxabhtumjhrg`) → **Authentication → Emails(이메일 템플릿)**

**먼저 1회:** Authentication → **URL Configuration → Site URL** 이 `https://healwith.co.kr` 인지 확인(아니면 그렇게 설정).

**그다음 — 템플릿별로 링크의 `href`를 아래로 교체** (기본 `{{ .ConfirmationURL }}` 부분을 통째로 갈아끼움):

| 템플릿 | 바꿀 링크 |
|--------|-----------|
| **Confirm signup**(가입확인) | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` |
| **Reset Password**(비번재설정) | `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery` |
| **Magic Link**(쓰면) | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink` |
| **Change Email**(쓰면) | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change` |

> **핵심:** 가입확인은 `/auth/confirm`, **비번재설정은 `/reset-password`**(새 비번 입력폼이 있는 페이지)로 보내야 함.
> `type` 값(`signup`/`recovery`/...)이 코드의 `supabase.auth.verifyOtp({ type, token_hash })`와 정확히 맞아야 동작 — 위 표대로면 맞음.
> 코드 계약: `app/auth/confirm/ConfirmClient.jsx`, `app/reset-password/ResetPasswordClient.jsx`.

예시(가입확인 템플릿 버튼):
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">이메일 인증하기</a>
```

**확인:** 교체 후 관문1(실제 가입→메일 1회)을 돌리면 메일 링크가 healwith.co.kr 확인페이지로 뜨고 자동 로그인되면 성공.

---

## 🔓 관문 3 — 구글 OAuth "테스트 → 게시(프로덕션)"

**왜:** 지금 동의화면이 "테스트(Testing)" 상태라 **등록된 테스트 사용자만** 구글 로그인 가능 = 실제 환자가 구글가입하면 막힘.

**어디서:** Google Cloud Console → 프로젝트 **`medical-consumables-491407`** 선택 → **APIs & Services → OAuth consent screen**(동의화면) → 새 UI면 **Audience(대상)** 페이지

**할 것:**
1. **Publishing status(게시 상태)** 가 `Testing` 으로 보임
2. **`PUBLISH APP`(앱 게시)** 버튼 클릭
3. "Push to production?" 확인창 → **Confirm**
4. 상태가 **`In production`** 으로 바뀌면 끝

> **검수 필요 없음:** 로그인 기본 범위(email·profile·openid)만 써서 민감/제한 scope가 아님 → **게시 즉시 모든 사용자에게 열림**(구글 심사 대기 X). 화면에 "verification 필요"가 뜨면 민감 scope를 요청 중이란 뜻이니 그때 점검 필요(우린 해당 없어야 정상).

---

## ⚠️ 관문 6 — 오픈 직전 약한비번 테스트계정 삭제/비활성 (필수)

E2E 자동검사를 위해 5개 테스트계정(`patient·coordinator·admin·agency·clinic@test.com`) 비번을 `test1234`로 통일했다.
그중 **`admin@test.com`은 `app_metadata.role=admin`** 이라 비번만 맞으면 실서비스 어드민(환자 PII 복호화 포함)에 들어온다.

🔴 **오픈 전 반드시**: `admin@test.com`(+ 가능하면 다른 `@test.com` 약한비번 계정)을 **삭제 또는 비활성**(`app_metadata.disabled=true`)할 것.
안 하면 실서비스에 약한비번 admin이 남는다. (배경: `docs/TEST_ACCOUNTS.md` ⚠️ 섹션)

> E2E 자동검사를 계속 돌리려면: 약한비번 대신 **강한 비번**으로 두고 그 값을 GitHub Secret에만 넣는 방법도 있다(외울 필요 없음 — 시크릿에 저장). admin만 강비번으로 두면 자동검사 손해 없이 노출도 없앤다.

---

## 🔴 관문 7 — Gemini 유료 결제 확인 (의료 PII·출시 전 필수)

**왜:** AI 챗·1차소견·번역이 Google Gemini를 쓴다. **무료 등급(free tier)**이면 입력 데이터가 구글 모델 **개선/학습에 쓰일 수 있다** — 우리는 환자 건강정보(PII)를 보내므로 출시 전 반드시 **유료(paid/billing 연결) 등급**이어야 한다(유료는 데이터 미학습 약관).

**할 것:** Google AI Studio / Google Cloud 콘솔에서 해당 API 키 프로젝트에 **결제(billing) 연결 + 유료 등급** 확인. 무료면 결제수단 연결해 paid로 전환. (비용 통제는 Google 콘솔 spend cap + 코드의 aiGuard 일일 상한으로 이미 보호.)

---

## 🟢 관문 8 — 텔레그램 새 문의 알림 켜기 (무료·5분)

**왜:** 새 문의가 오면 PO 텔레그램으로 "삥" 알림(이메일 외 채널). 코드(#430)는 이미 배포됨 — **env 2개만 넣으면 켜짐**, 안 넣으면 무동작(기존 동작 무변경).

**할 것:**
1. 텔레그램에서 **@BotFather** → `/newbot` → 봇 이름 정하고 → **봇 토큰** 받기.
2. 그 봇과 대화 시작(아무 메시지) → `https://api.telegram.org/bot<토큰>/getUpdates` 열어 **chat_id** 확인.
3. Vercel(프로젝트 `healo-khidi`) → Settings → Environment Variables(**Production**)에 추가:
   - `TELEGRAM_BOT_TOKEN` = 봇 토큰
   - `TELEGRAM_CHAT_ID` = chat_id
4. 재배포 → 테스트 문의 1건 넣어 텔레그램에 알림 뜨는지 확인(내가 도와줄 수 있음).
