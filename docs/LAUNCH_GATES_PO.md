# 서비스 오픈 전 PO 관문 — 콘솔 작업 안내 (2026-06-24, 2026-06-29 갱신)

> 코드·시스템은 준비 끝(자동검사 전수 초록·프로덕션 실측). **오픈 go/no-go는 아래 PO 콘솔/실기기 작업에 달림.**
> 관문4(E2E 시크릿)는 `docs/E2E_SECRETS_SETUP.md`, 테스트계정은 `docs/TEST_ACCOUNTS.md` 참조.
> **2026-06-29 전수조사로 추가 관문(7~11)을 아래에 합침** — 이 문서가 PO 액션 단일 체크리스트.

## 한눈에 — 오픈/평가 전 PO 관문

### A. 출시 기본 관문 (2026-06-24)

| # | 관문 | 누가 | 상태 |
|---|------|------|------|
| 1 | 가입→인증메일→로그인 / 비번찾기 **실메일 1회** 통과 | PO | 관문2 끝낸 뒤 1회 |
| 2 | **Supabase 이메일 템플릿 href → `token_hash`** | PO 콘솔 | ↓ 아래 가이드 |
| 3 | **구글 OAuth 게시(테스트→프로덕션)** | PO 콘솔 | ↓ 아래 가이드 |
| 4 | **E2E Secrets 등록** → 로그인 자동검사 가동 | PO | 준비 끝(`E2E_SECRETS_SETUP.md`), 복붙만 |
| 5 | iOS 영상 마이크 실기기 / K-01 점수판 정직성 | PO | 실기기·판단 |
| 6 | 🔴 **약한비번 테스트계정 삭제/비활성** | PO | 오픈 직전 필수 (아래 ⚠️) |

### B. 추가 관문 (2026-06-29 전수조사로 합침)

| # | 관문 | 누가 | 상태 |
|---|------|------|------|
| 7 | 🔴 **Gemini 유료 결제 확인** — 무료 등급이면 환자 건강정보가 구글 모델 학습에 쓰일 수 있음(의료 PII·출시 전 필수) | PO 콘솔 | 미확인 |
| 8 | 🟢 **텔레그램 새 문의 알림 켜기** — 코드(#430)는 배포됨, env 2개만 넣으면 작동 | PO 콘솔 | 토큰 미설정 (아래) |
| 9 | 🟡 **테스트 문의 #26~31 정리** — 검증용 가짜 문의, 오픈 전 삭제(유치 전환 대시보드 집계 오염 방지) | PO/나 | 오픈 전 |
| 10 | 🟡 **DPA 서명** — Supabase·Google·Resend·LiveKit·Vercel (무료) | PO | `docs/audit/DPA_SIGNING_GUIDE.md` |
| 11 | 🔵 **법무문서 PR #422·#424** — 처리방침 GDPR 보강·계약서, 법무검토 후 머지 | PO | 검토 대기 |

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
