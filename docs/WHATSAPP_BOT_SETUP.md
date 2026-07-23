# 왓츠앱 환자 봇 개통 가이드 (Meta WhatsApp Cloud API)

> 코드는 전부 준비돼 있음(2026-07-23) — 이 문서의 절차만 끝내면 켜진다.
> 텔레그램(docs/TELEGRAM_BOT_SETUP.md)과 같은 구조: 환자 메시지 → 우리 DB → AI 1차 응대
> → `/admin/chat`에서 코디 답장 → 환자 왓츠앱으로 배달. 코디는 왓츠앱 앱 불필요.

## ⚠️ 시작 전 알아둘 것 (PO 결정 필요 지점)

- **비즈니스 앱(폰 앱)만으로는 봇 불가** — Meta 공식 API(Cloud API)를 써야 하고, **한 전화번호는
  폰 앱/API 중 하나만** 쓸 수 있다. 지금 wa.me 링크의 010-4772-1075를 API로 옮기면 폰 앱 응대 불가.
  - **A안(권장)**: 기존 번호는 코디 폰 유지 + **봇용 새 번호** 하나 개통(알뜰폰 등, SMS 수신만 되면 됨)
  - **B안**: 기존 번호를 봇으로 전환(폰 앱 포기, 기존 대화기록 폰에서 안 보임)
- **비용**: 환자가 먼저 보낸 대화에 답하는 건 무료. 우리가 먼저 보내는 건 승인된 템플릿만 가능(건당 과금).
  **24시간 창**: 환자 마지막 메시지 후 24시간 안에만 자유 답장 — 지나면 어드민 답장이
  `window_expired`로 표시된다(v1은 템플릿 재개 미지원 — 환자가 다시 말 걸면 창이 열림).

## 1. Meta 쪽 절차 (PO, 브라우저)

1. **Meta Business Suite** (business.facebook.com) → 비즈니스 계정 생성(Bonroi).
2. **developers.facebook.com** → 「My Apps」 → Create App → 유형 **Business** → 앱 생성.
3. 앱 대시보드에서 **WhatsApp 제품 추가** (Add product → WhatsApp → Set up).
4. **사업자 인증(Business verification)**: Business Suite → 설정 → 비즈니스 정보 → 인증 시작.
   사업자등록증 업로드 — **심사 며칠 걸림**(이게 유일한 대기 구간). 인증 전엔 테스트 번호로만 가능.
5. **전화번호 등록**: WhatsApp → API Setup → 번호 추가(A안 새 번호) → SMS 인증.
6. **영구 토큰 발급**: Business Suite → 설정 → 사용자 → **시스템 사용자(System User)** 생성(admin)
   → 토큰 생성 (권한: `whatsapp_business_messaging`, `whatsapp_business_management`) — 이게
   `WHATSAPP_ACCESS_TOKEN`. (API Setup 화면의 임시 토큰은 24시간짜리 — 쓰지 말 것.)
7. 다음 4개 값을 확보:
   - **Access Token** (6번 영구 토큰)
   - **Phone number ID** (API Setup 화면, 전화번호 아래 숫자 ID — 전화번호 자체가 아님)
   - **App Secret** (앱 설정 → 기본 설정 → 앱 시크릿)
   - **Verify Token** (아무 랜덤 문자열 — `openssl rand -hex 16`)

## 2. Vercel 환경변수 (healo-khidi → Settings → Environment Variables, Production+Preview)

| 이름 | 값 |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | 시스템 사용자 영구 토큰 |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID |
| `WHATSAPP_APP_SECRET` | 앱 시크릿 (웹훅 위조 차단용) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | 직접 만든 랜덤 문자열 |

등록 후 **재배포** 필요.

## 3. 웹훅 연결 (앱 대시보드 → WhatsApp → Configuration)

- Callback URL: `https://healwith.co.kr/api/webhooks/whatsapp`
- Verify token: 위 `WHATSAPP_WEBHOOK_VERIFY_TOKEN` 값 → **Verify and save**
  (우리 서버가 자동으로 핸드셰이크에 응답 — env 재배포가 먼저 끝나 있어야 함)
- **Webhook fields**: `messages` 구독(Subscribe).

## 4. 검증 (E2E)

1. 본인 왓츠앱에서 봇 번호로 아무 말 → **동의 버튼** 도착 → 동의 → 환영 인사.
2. 질문("면력한방병원 지점 알려줘") → AI 답변(별표 없는 평문).
3. "상담원 연결해줘" → "이 채팅으로 연락드립니다" 접수 멘트 + 어드민 종 알림.
4. `/admin/chat`에서 답장 → 왓츠앱으로 수신 확인. 이후 그 방은 AI 침묵(코디 인수).
5. `/admin/khidi/conversion`에 「WhatsApp 상담」 행 (3턴+ 대화가 문의로 승격된 뒤).

## 참고 (구현 메모)

- 인바운드: `app/api/webhooks/whatsapp/route.ts` (서명 HMAC 검증·동의 게이트·wamid 멱등)
- 아웃바운드: `src/lib/messaging/whatsapp.ts` (fail-safe, 24시간 창 감지 131047)
- 언어: 전화 국가번호로 추정(`src/lib/messaging/waLang.ts` — +7 6xx/7xx=카자흐, +7 9xx=러시아)
- `/inquiry` Human Agent 의 WhatsApp 카드는 개통 후 `NEXT_PUBLIC_MESSENGER_WHATSAPP_URL`을
  `https://wa.me/<봇 새 번호>`로 바꾸면 봇으로 연결된다(현재는 코디 개인 번호 wa.me).
