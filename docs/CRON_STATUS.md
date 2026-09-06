# 자동 스케줄(크론) 작업 상태

**마지막 업데이트:** 2026-09-06 (정본 = `vercel.json` `crons`. 이 문서는 «무엇이 왜 도는지»만 적는다)

> ✅ **2026-07-28 이후 모든 정기 실행은 Vercel 예약(`vercel.json`)이 깨운다.** 외부 스케줄러(cron-job.org)·깃허브 예약에 기대던 옛 안내는 폐기했다.
> 깃허브 예약은 이 저장소에서 «하루 7회»만 도는 것이 실측돼(간격 109~299분) 시각이 중요한 일에는 못 쓴다 — 배포 창구도 그래서 Vercel 예약으로 옮겼다(#1550).
> Vercel Pro(2026-07-24 전환)라 분 단위 주기가 허용된다. 개수 한도는 100개. **크론은 곧 함수 실행이니 주기는 필요한 만큼만.**

## 현재 도는 것 (11개, UTC 기준 — KST 는 +9시간)

| 경로 | 주기(UTC) | 하는 일 | 확인처 |
|---|---|---|---|
| `/api/cron/dispatch-reminders` | 5분마다 | `reminders_scheduled` 에서 `fire_at` 도래 건 발송(메일·인앱·교육 콘텐츠). 3회 실패 시 `failed` | `/admin/reminders` |
| `/api/cron/consultation-reminders` | 10분마다 | 초대 토큰 기반 상담 임박 메일(레거시 경로, 유지) | 발송 로그 |
| `/api/cron/detect-cold-leads` | 00:30 | 상담 단계에서 7일 무동작 문의를 코디에게 알림(`COLD_LEAD_DAYS`) | 코디 종 알림 |
| `/api/cron/daily-deploy` | 06:00 (KST 15:00) | 배포 창구 — 본판 최신 커밋을 production 으로. 판정은 `/api/health` 의 `commit` | Actions 「Daily Deploy」·`/api/health` |
| `/api/cron/indexnow` | 07:00 | 검색엔진 색인 자동 제출(IndexNow — 빙·얀덱스·네이버). 평일은 3일 안 변경분, 월요일은 전부 | Vercel 크론 로그 `[cron/indexnow]` |
| `/api/cron/dispatch-surveys` | 09:00 | 만족도 설문 발송(상담 «완료» +24h) + 사후관리 단계별 교육 콘텐츠 발송(D+7/14/30/90/180) + **«방문 전» 케이던스**(소견 전달 D+3·14·30 안부 메일, D+14·30 무응답 코디 알림 — 2026-09-06, 끄기 `PRE_VISIT_FOLLOWUP_ENABLED=0`) | `surveys`·`reminders_scheduled(education_content · pre_visit_followup)` |
| `/api/cron/detect-silent-patients` | 15:00 | 사후관리 환자가 3일 이상 증상 입력이 없으면 경보(`silence_long`) | 코디 「증상 알림」 |
| `/api/cron/kpi-snapshot` | 15:05 | 성과지표 일별 스냅샷(`kpi_snapshots`) + 집계 오류 감시 | `/admin/khidi/kpi-dashboard` |
| `/api/cron/automation` | 16:00 | 플레이북 자동 개선·A/B 확정·해결 뒤 후처리 | `/admin/automation/playbook` |
| `/api/cron/purge-recordings` | 17:30 | 상담 녹화 90일 만료분 파기(녹화는 `CONSULT_RECORDING_ENABLED` 로 켤 때만 생긴다) | — |
| `/api/cron/run-regression-tests` | 월·목 18:00 | AI 자가시험 50건(실서비스 채팅 경로와 같은 `streamChatReply`) | `/admin/khidi/ai-regression` |

## 크론 «밖»에서 도는 자동 검사 (깃허브 Actions — 시각은 몇 시간씩 밀릴 수 있다)

| 워크플로 | 주기 | 하는 일 |
|---|---|---|
| `uptime.yml` | 10분(실측은 하루 7회) | `/api/health` 2회 연속 실패만 장애로. **실서비스 감시의 정본은 UptimeRobot(5분, PO 계정)** |
| `sweep.yml` | 매일 23:00 UTC | `npm run sweep` 훑기 대장 — 볼 것이 있을 때만 메일 |
| `chat-smoke.yml` | 매일 18:30 UTC | AI 챗 안전 가드 스모크 |
| `e2e.yml` | 매일 19:00 UTC + 신청서마다 | 실서비스 야간 전체 E2E / 신청서는 스모크 + 변경 반경 |
| `audit-live.yml` | 매주 월 16:00 UTC | 접근성(axe-core WCAG 2.1 AA)·Lighthouse |

## 환경변수

| 변수명 | 목적 | 필수 여부 |
|---|---|---|
| `CRON_SECRET` | 크론 라우트 인증(Vercel 이 `Authorization: Bearer` 로 실어 보낸다) | **필수** |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | 이메일 발송 | 없으면 console 모드 |
| `KAKAO_BIZ_API_KEY` / `KAKAO_SENDER_KEY` | 카카오 알림톡 | 미도입(없으면 console 모드) |
| `COLD_LEAD_DAYS` | 식은 문의 판정 일수 | 기본 7 |
| `CONSULT_RECORDING_ENABLED` | 상담 녹화 켜기 | 기본 꺼짐 |
| `PRE_VISIT_FOLLOWUP_ENABLED` | 소견 뒤 «방문 전» 케이던스 | 기본 켜짐(0 이면 끔) |
| `SYMPTOM_AI_TRIAGE` | 증상 기록 AI 2차 판정 | 기본 켜짐(0 이면 끔) |

## 리마인더 흐름

```
상담 생성/수정 API
  └─ autoScheduleReminders(sessionId)
       └─ reminders_scheduled 에 row (fire_at = scheduled_at - 30min, 채널별)
Vercel 예약 5분마다 → POST /api/cron/dispatch-reminders [CRON_SECRET]
  └─ fire_at <= now() AND status='pending' (최대 100건)
       ├─ email  → Resend
       ├─ in_app → notifications 표 (벨은 30초 폴링으로 읽는다 — Realtime 아님)
       └─ kakao  → 미도입(console)
  └─ 성공 sent / 실패 attempts++ (3회 초과 failed) → /admin/reminders 에서 재발송
```

## 옛 기록

- 2026-04: Vercel Hobby 는 «하루 1회보다 잦은 주기»를 막아 크론을 껐고 cron-job.org 안내를 적었다.
- 2026-07-24: Vercel Pro 전환. 2026-07-28: `dispatch-reminders` 를 `vercel.json` 으로 이관, 외부 스케줄러 의존 종료.
- 2026-07-31~08-31: 배포 창구를 Vercel 예약으로 이관(깃허브 예약이 2~3시간씩 늦어서).
- 2026-09-05~06: `detect-cold-leads`·`indexnow` 추가.
