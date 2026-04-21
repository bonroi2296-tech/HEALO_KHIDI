# 배포 전 체크리스트

> 마지막 업데이트: 2026-04-21
> 배경: Hobby 플랜 크론 한도 초과로 15회 연속 배포 실패 사건(2026-04) 이후 작성.

---

## 배포 직전 수동 체크

```bash
# 1. vercel.json Hobby 호환성 검증
npm run check:vercel

# 2. lint + 빌드 통합 체크
npm run check
```

---

## vercel.json 변경 시 주의사항

### Hobby 플랜 제약 (현재 플랜)

| 항목 | Hobby 한도 | 비고 |
|------|-----------|------|
| crons | **daily만 허용** (1개) | `0 X * * *` 형태만 사용 |
| functions.maxDuration | **최대 10초** | 초과 시 배포 거절 |
| bandwidth | 100 GB/월 | |

### 허용 크론 스케줄 예시

```json
// O: 매일 새벽 2시
{ "schedule": "0 2 * * *" }

// O: 매일 정오
{ "schedule": "0 12 * * *" }

// X: 10분마다 → 배포 거절됨
{ "schedule": "*/10 * * * *" }

// X: 매 시간 → 배포 거절됨
{ "schedule": "0 * * * *" }
```

> 자동 검증: `vercel.json`을 git에 스테이지하면 pre-commit 훅이 자동으로 차단.

### Pro 플랜 업그레이드 시 복구 방법

1. [Vercel 대시보드](https://vercel.com/pricing)에서 Pro 업그레이드 ($20/월)
2. `vercel.json`의 `_crons_memo` 참고하여 crons 블록 복구:
   ```json
   "crons": [
     {
       "path": "/api/cron/consultation-reminders",
       "schedule": "*/10 * * * *"
     }
   ]
   ```
3. `npm run check:vercel`로 검증 후 커밋

---

## 크론을 Pro 없이 수동 실행하는 방법

### cron-job.org 사용 (무료 외부 스케줄러)

1. [cron-job.org](https://cron-job.org) 가입
2. 새 크론잡 생성:
   - **URL**: `https://healo-khidi.vercel.app/api/cron/consultation-reminders`
   - **Method**: `GET` (또는 `POST`)
   - **Schedule**: 원하는 주기 (예: 10분마다)
   - **Headers 추가**:
     ```
     Authorization: Bearer <CRON_SECRET>
     ```
     (`CRON_SECRET`은 Vercel 환경변수에 설정된 값과 동일)
3. 활성화 후 테스트 실행으로 200 응답 확인

### 기타 외부 스케줄러 옵션

| 서비스 | 무료 한도 | 특이사항 |
|--------|----------|---------|
| [cron-job.org](https://cron-job.org) | 무제한 | 가장 단순 |
| [EasyCron](https://www.easycron.com) | 1개 무료 | |
| GitHub Actions schedule | 무제한 | `workflow_dispatch` + cron |
| Supabase pg_cron | DB 내장 | SQL 실행용 |

---

## 환경변수 체크리스트

배포 전 Vercel 대시보드에서 아래 환경변수 설정 확인:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CRON_SECRET`
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] 기타 `scripts/check-env.js` 목록 참조 (`npm run check:env`)

---

## CI 게이트 요약

| 단계 | 도구 | 차단 조건 |
|------|------|----------|
| pre-commit | `scripts/validate-vercel-config.js` | vercel.json Hobby 위반 |
| GitHub CI | `.github/workflows/ci.yml` | 위반 + 빌드 실패 + RAG 회귀 |
| 수동 | `npm run check:vercel` | 즉시 확인용 |
