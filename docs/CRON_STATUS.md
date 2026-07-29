# 자동 스케줄(크론) 작업 상태

**마지막 업데이트:** 2026-05-18

---

## 현재 활성화된 엔드포인트

| 경로 | 목적 | 권장 주기 |
|------|------|-----------|
| `GET/POST /api/cron/dispatch-reminders` | 리마인더 발송 (fire_at 도래 건 처리) | **5분 — 2026-07-28 `vercel.json` 정기작업으로 이관(외부 스케줄러 의존 종료)** |
| `GET /api/cron/consultation-reminders` | 레거시: guest_token 기반 이메일 리마인더 | 15분 |
| `GET /api/cron/automation` | 자동화 기타 작업 | 필요 시 |
| `GET /api/cron/purge-recordings` | 상담 녹화 보관기간(90일) 만료분 파기 | 매일 1회 (02:30 KST) |

> ✅ **2026-07-28 정정 — 예전 「vercel.json crons 절대 추가 금지(Hobby 한도)」 경고는 낡았다.**
> ①우리는 **Vercel Pro**다(2026-07-24 전환) ②Hobby 든 Pro 든 **개수 한도는 100개**로 같고,
> Hobby 가 막던 건 개수가 아니라 **「하루 1회보다 잦은 주기」**였다(공식 문서 실확인).
> Pro 는 분 단위까지 가능. `vercel.json` 에 현재 6개 — 추가해도 된다. 다만 **cron 은 곧 함수 실행**이니
> 잦은 주기는 비용으로 돌아온다(주기는 필요한 만큼만).

---

## 외부 스케줄러 등록 (cron-job.org) — 단계별 가이드

### 준비물

1. **CRON_SECRET** — Vercel 환경변수에 이미 설정된 값 (없으면 먼저 생성: `openssl rand -hex 32`)
2. cron-job.org 계정 (무료 플랜 OK)

---

### Step 1: cron-job.org 가입 & 로그인

1. [https://cron-job.org](https://cron-job.org) 접속 → 회원가입 (이메일만)
2. 로그인 후 대시보드 진입

---

### Step 2: 새 크론 작업 등록

1. 대시보드 → **"Create cronjob"** 클릭
2. 아래 값 입력:

| 항목 | 값 |
|------|----|
| **Title** | `HEALO dispatch-reminders` |
| **URL** | `https://healo-khidi.vercel.app/api/cron/dispatch-reminders` |
| **Schedule** | `*/5 * * * *` (5분마다) |
| **Request method** | `POST` |
| **Request timeout** | `30` 초 |

3. **Headers** 섹션에서 "Add header":
   - Header name: `Authorization`
   - Header value: `Bearer <여기에 CRON_SECRET 값 붙여넣기>`

4. **Save** 클릭

---

### Step 3: 첫 실행 확인

1. 저장 후 **"Run now"** 버튼 클릭
2. Response 탭에서 아래 형태 확인:
   ```json
   {"ok":true,"checked":0,"sent":0,"failed":0,"errors":[],"ts":"..."}
   ```
3. HTTP 200이면 정상 연결된 것

---

### Step 4: 실패 알림 설정

1. 크론 작업 설정 → **Notifications** 탭
2. 이메일 알림 켜기 (실패 시 즉시 통보)
3. 권장: 연속 2회 실패 시 알림

---

### CRON_SECRET Vercel 설정 확인

```
Vercel 대시보드 → healo-khidi 프로젝트 → Settings → Environment Variables
→ CRON_SECRET 확인 (없으면 추가)
```

값 생성 방법:
```bash
openssl rand -hex 32
```

---

## 리마인더 흐름 (전체)

```
컨설테이션 생성/수정 API
  └─ autoScheduleReminders(sessionId)
       └─ reminders_scheduled 테이블에 row 삽입
            (fire_at = scheduled_at - 30min)
            (채널: email / kakao / in_app 각각)

cron-job.org (5분 주기)
  └─ POST /api/cron/dispatch-reminders  [CRON_SECRET]
       └─ fire_at <= now() AND status='pending' 조회 (최대 100건)
            ├─ channel=email   → Resend API (or console log)
            ├─ channel=kakao   → 카카오 비즈메시지 API (or console log)
            └─ channel=in_app  → notifications 테이블 insert (Realtime)
       └─ 성공: status='sent', sent_at=now()
          실패: attempts++, 3회 초과 → status='failed'

관리자 페이지 /admin/reminders
  └─ 상태 모니터링 + 실패 건 수동 재발송 버튼
```

---

## 환경변수 (설정 필요한 것)

| 변수명 | 목적 | 필수 여부 |
|--------|------|-----------|
| `CRON_SECRET` | 디스패처 API 인증 | **필수** |
| `RESEND_API_KEY` | 이메일 발송 | 없으면 console 모드 |
| `RESEND_FROM_EMAIL` | 발신 이메일 주소 | Resend 사용 시 필수 |
| `KAKAO_BIZ_API_KEY` | 카카오 알림톡 | 없으면 console 모드 |
| `KAKAO_SENDER_KEY` | 카카오 발신 프로필 키 | 없으면 console 모드 |
| `KAKAO_BIZ_API_URL` | API 엔드포인트 | 없으면 기본값 사용 |
| `NEXT_PUBLIC_SITE_URL` | 이메일 내 입장 링크 생성 | 없으면 healo-khidi.vercel.app |

---

## 레거시 라우트 상태

- `app/api/cron/consultation-reminders/route.ts` — guest_token 직접 조회 방식 (유지)
- `app/api/cron/crawl/route.ts` — 병원 크롤링 (중단 중)
- `app/api/cron/automation/route.ts` — 기타 자동화

---

## Option A: Pro 플랜 전환 시

Pro 플랜($20/월) 업그레이드 후 vercel.json 에 추가 가능:

```json
{
  "crons": [
    {
      "path": "/api/cron/dispatch-reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

단, **지금은 절대 추가 금지** (Hobby 한도 위반).

---

## 🛟 KHIDI 데드맨 스위치 (2026-06-16)

`kpi-snapshot` cron(8/27 평가 점수 집계원)이 조용히 멈추는 걸 감지.
- **방식**: 새 cron 추가(Hobby 한도) 대신, **다른 시간대 cron(`dispatch-surveys`)에 KPI 누락 감지를 얹음** → kpi-snapshot 트리거가 죽어도 잡힘.
- `src/lib/khidi/kpiHealthcheck.ts` `alertIfKpiStale()`: `kpi_snapshots` 최신 날짜가 2일 이상 지나면 **Sentry 경보**(= PO 이메일 도달). 호출 cron 본업엔 영향 0.
- **belt-and-suspenders (PO 권장)**: 모든 cron 트리거가 죽는 경우 대비, 외부 무료 모니터(UptimeRobot·cron-job.org)로 `/api/health`를 일 1회 핑 → 실패 시 메일. (Vercel cron 시스템과 독립이라 최종 방어선)
