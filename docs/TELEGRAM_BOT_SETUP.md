# 텔레그램 환자 상담 봇 — 설정 가이드 (PO용)

> 코드(웹훅·발신·집계 연결)는 배포돼 있고, **아래 env 3개만 넣으면 켜진다.**
> ⚠️ PO 개인 알림봇(`TELEGRAM_BOT_TOKEN`)과 **다른 봇**이다 — 환자와 대화하는 브랜드 봇을 새로 만든다.

## 1. 봇 만들기 (5분, 텔레그램 앱에서)

1. 텔레그램에서 `@BotFather` 검색 → 대화 시작
2. `/newbot` 입력
3. 봇 이름 입력 (예: `HEALO — Cancer Care Korea`)
4. 봇 아이디 입력 — 끝이 `bot`이어야 함 (예: `healwith_bot`)
5. BotFather가 주는 **토큰**(`123456:ABC-...`)을 복사
6. (권장) `/setuserpic`으로 프로필 사진, `/setdescription`으로 소개문 설정

## 2. Vercel 환경변수 등록 (healo-khidi 프로젝트 → Settings → Environment Variables)

| 이름 | 값 |
|---|---|
| `TELEGRAM_PATIENT_BOT_TOKEN` | 위에서 복사한 봇 토큰 |
| `TELEGRAM_WEBHOOK_SECRET` | 아무 랜덤 문자열 64자 (아래 명령으로 생성: `openssl rand -hex 32`) |
| `NEXT_PUBLIC_MESSENGER_TELEGRAM_URL` | (선택 — 2026-07-23부터 코드 기본값 `https://t.me/healwith_bot`이 있어 **안 넣어도 됨**.) 넣는다면 값은 `https://t.me/<봇아이디>` — ⚠️ **`?start=...` 딥링크 금지**: start 파라미터가 있으면 이미 대화하던 사용자도 재입장 때마다 `/start`가 채팅에 찍힌다(텔레그램 프로토콜, 실기기 확인 2026-07-23 PO). |

등록 후 **재배포** 필요 (env는 배포 시점에 반영).

## 3. 웹훅 연결 (터미널에서 1번)

```bash
curl -s "https://api.telegram.org/bot<봇토큰>/setWebhook" \
  -d "url=https://healwith.co.kr/api/webhooks/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET 값>" \
  -d 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
```

`{"ok":true,...}` 나오면 끝. 확인: `curl -s "https://api.telegram.org/bot<봇토큰>/getWebhookInfo"`

## 4. 동작 검증 (실기기)

> ⚠️ **검증은 반드시 `?start=test` 딥링크로.** 이걸로 시작한 대화는 자동으로 「테스트」 표식이 붙어
> KHIDI 평가 숫자(유치·상담 집계)를 오염시키지 않는다. `?start=inq_human`으로 테스트하면 가짜 실적이 잡힌다.

1. `t.me/<봇아이디>?start=test` 접속 → **동의 버튼** 메시지 수신
2. 동의 → 환영 메시지 → 질문 3턴 → AI 답장 수신
3. `/admin/chat`에 ✈️ Telegram 배지 스레드 확인 → **관리자(admin) 계정**으로 답장 → 텔레그램 수신 확인 (코디 계정은 현재 열람만 가능 — 답장 권한을 코디에게 열지는 PO 결정)
4. `/admin/khidi/conversion`에서 「테스트 포함」 토글 켜고 「Telegram 상담」 행 확인 (실적만 보기에선 안 보이는 게 정상)
5. "I want to talk to a human" → 검토요청 종 + 이후 AI 침묵 확인

## 5. 스태프 그룹 — 코디가 텔레그램에서 보고 "거기서 바로 답장" (선택, PO 승인 2026-07-24)

> 환자 1명 = 그룹 안의 주제(Topic) 1개. 환자·AI·웹 코디 메시지가 주제로 실시간 흐르고,
> **주제에 답장을 쓰면 봇이 환자 메신저(텔레그램·왓츠앱 공통)로 배달**한다.
> ⚠️ 환자 대화 본문이 그룹에 흐르므로 **그룹 멤버는 스태프만**(초대 관리 = 운영 책임).

1. 텔레그램에서 **새 그룹** 생성(예: "healwith 상담데스크") → 그룹 설정 → **주제(Topics) 켜기**
2. 그룹에 **@healwith_bot 초대 → 관리자로 승격**(주제 관리 권한 포함)
3. **BotFather → `/setprivacy` → @healwith_bot 선택 → Disable** — 안 하면 봇이 그룹 글을 못 받아 답장 라우팅이 안 됨(가장 흔한 함정)
4. 그룹 채팅에 **`/id`** 라고 치면 봇이 그룹 chat_id 를 알려줌(보통 `-100…`)
5. Vercel env **`STAFF_TELEGRAM_GROUP_ID`** = 그 값 → **재배포**
6. 검증: 봇에 환자로 메시지 → 그룹에 새 주제 생김 → 주제에 답장 → 환자 텔레그램 수신 + `/admin/chat`에도 같은 답장 기록(👤 admin, via telegram_staff)

- 주제 답장은 웹 답장과 동일 취급: 그 스레드는 이후 **AI 침묵**(coordinator_active)
- 전송 실패·왓츠앱 24시간 창 만료는 주제에 ⚠️ 안내가 자동으로 붙음
- ⚠️ **"익명으로 보내기(관리자 익명)" 금지** — 익명이 켜져 있으면 답장을 환자에게 전달할 수
  없다(주제에 경고가 자동으로 뜸). 그룹 관리자 설정에서 익명을 꺼 두고 쓸 것.
- env 미설정이면 이 기능 전체가 조용히 꺼진 상태(기존 동작 무변경)

## 동작 방식 요약

- 환자 텔레그램 → 봇 웹훅(`/api/webhooks/telegram`) → `chat_threads`(channel='telegram')
- PIPA 동의 전에는 **본문 저장 안 함**(동의 버튼만 안내)
- AI 자동응답(기존 3-Tier RAG) / "사람 연결" 요청 시 검토요청 종 + AI 침묵
- 운영자(admin)가 `/admin/chat`에서 답장 → 환자 텔레그램으로 자동 발신. **사람이 한 번 답장한 스레드는 이후 AI가 끼어들지 않음**(상담 종료 후 재문의는 새 스레드라 다시 AI 응대)
- 3턴마다 `inquiries(source='messenger_telegram')` 승격 → KHIDI 전환 대시보드 자동 집계
- 상담 종료(resolve) 시 응대패턴 자동추출 → RAG 자기학습 루프 (기존 파이프라인 그대로)
- 파일(사진·문서)은 v1 미지원 — 환자에게 웹 채팅 업로드 안내가 자동 발송됨
