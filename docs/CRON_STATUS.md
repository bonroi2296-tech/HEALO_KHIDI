# 자동 스케줄(크론) 작업 상태

**마지막 업데이트:** 2026-04-21

## 현재: 전체 비활성화

`vercel.json` 에는 크론 블록 없음. 서버리스 자동 스케줄 작업 0개.

## 비활성화 이유

1. **Hobby 플랜 한도**: daily 크론 1개만 허용 → 10분 주기 리마인더 불가
2. **크롤링 중단**: 사용자 요청으로 중단
3. **아직 실 환자 예약 없음**: 리마인더도 불필요

## 정식 오픈 시 복구 방법

### Option A. Pro 플랜 업그레이드 ($20/월)

```json
// vercel.json
"crons": [
  {
    "path": "/api/cron/consultation-reminders",
    "schedule": "*/10 * * * *"
  }
]
```

### Option B. Pro 없이 외부 스케줄러 사용

**cron-job.org** 또는 **EasyCron** 등:

- URL: `https://healo-khidi.vercel.app/api/cron/consultation-reminders`
- Method: POST
- Header: `Authorization: Bearer <CRON_SECRET>`
- 주기: 10분

## 라우트 파일 상태

`/api/cron/*` 라우트 파일은 **유지 중**. 수동 POST 호출 또는 재활성화 시 즉시 사용 가능.

- `app/api/cron/crawl/route.ts` — 병원 크롤링 (자동화 재개 결정 시 별도 검토)
- `app/api/cron/consultation-reminders/route.ts` — 원격협진 30분 전 알림
- `app/api/cron/automation/route.ts` — 기타 자동화
