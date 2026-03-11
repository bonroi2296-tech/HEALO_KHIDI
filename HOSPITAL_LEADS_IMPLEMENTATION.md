# Hospital Leads Management System - Implementation Report

**Date:** 2026-02-04  
**Status:** ✅ COMPLETED  
**Build Status:** ✅ PASSED (`npm run build`)

---

## 🎯 Executive Summary

100개 병원으로 확장하기 위한 병원별 리드 라우팅/응답 레이어가 성공적으로 구현되었습니다.

**핵심 기능:**
- ✅ `hospital_leads` 테이블: normalized_inquiries와 hospitals 연결
- ✅ Admin API: 리드 할당, 상태 업데이트, 목록 조회
- ✅ Admin UI: 리드 관리 페이지 (`/admin/leads`)
- ✅ RLS 정책: service_role 전용 (보안)
- ✅ 감사 로그: 모든 작업 자동 기록

---

## 📁 Created/Modified Files

### 새로 생성된 파일 (6개)

| 파일 | 목적 | Lines |
|------|------|-------|
| `migrations/20260204_hospital_leads.sql` | DB 테이블 + RLS 정책 | ~200 |
| `app/api/admin/leads/assign/route.ts` | 리드 할당 API (POST) | ~200 |
| `app/api/admin/leads/[id]/route.ts` | 리드 업데이트 API (PATCH) | ~200 |
| `app/api/admin/leads/route.ts` | 리드 목록 API (GET) | ~180 |
| `app/admin/leads/page.jsx` | Admin UI (리드 관리) | ~350 |
| `HOSPITAL_LEADS_IMPLEMENTATION.md` | 이 보고서 | - |

### 수정된 파일 (2개)

| 파일 | 변경 사항 |
|------|-----------|
| `src/lib/validation/admin.ts` | Zod 스키마 추가 (LeadAssignSchema, LeadUpdateSchema) |
| `app/admin/_components/AdminNav.jsx` | "리드 관리" 메뉴 추가 |

---

## 🗄️ Database Schema

### Table: `public.hospital_leads`

```sql
CREATE TABLE public.hospital_leads (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Foreign keys
  normalized_inquiry_id uuid NOT NULL REFERENCES normalized_inquiries(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'viewed', 'replied', 'converted', 'rejected', 'expired')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  first_response_at timestamptz,
  last_status_at timestamptz NOT NULL DEFAULT now(),
  
  -- Pricing
  quoted_price_min numeric,
  quoted_price_max numeric,
  
  -- Additional data
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT unique_inquiry_hospital UNIQUE(normalized_inquiry_id, hospital_id),
  CONSTRAINT valid_price_range CHECK (
    quoted_price_min IS NULL 
    OR quoted_price_max IS NULL 
    OR quoted_price_min <= quoted_price_max
  )
);
```

### Indexes (성능 최적화)

```sql
-- 병원별 리드 조회 (가장 자주 사용)
CREATE INDEX idx_hospital_leads_hospital_status 
  ON hospital_leads(hospital_id, status, assigned_at DESC);

-- Inquiry별 할당된 병원 조회
CREATE INDEX idx_hospital_leads_inquiry 
  ON hospital_leads(normalized_inquiry_id);

-- Status별 조회 (대시보드용)
CREATE INDEX idx_hospital_leads_status 
  ON hospital_leads(status, assigned_at DESC);

-- 최근 활동 조회
CREATE INDEX idx_hospital_leads_updated 
  ON hospital_leads(updated_at DESC);
```

### Triggers

```sql
-- updated_at 자동 갱신
CREATE TRIGGER trigger_hospital_leads_updated_at
  BEFORE UPDATE ON hospital_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_hospital_leads_updated_at();
```

### RLS Policies

```sql
-- ✅ service_role: 모든 작업 허용 (Admin API 전용)
CREATE POLICY "hospital_leads_all_service_role"
  ON hospital_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ❌ anon/authenticated: 모든 접근 거부 (기본값)
```

---

## 🔌 API Routes

### 1. POST /api/admin/leads/assign

**목적:** 하나의 inquiry를 여러 병원에 동시 할당

**Request:**
```json
{
  "normalized_inquiry_id": "uuid",
  "hospital_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "ok": true,
  "assigned": 3,
  "skipped": 0,
  "leads": [...],
  "hospitals": [...]
}
```

**특징:**
- ✅ Zod 검증 (LeadAssignSchema)
- ✅ Upsert (중복 방지)
- ✅ Inquiry/Hospital 존재 확인
- ✅ 감사 로그 자동 기록

---

### 2. PATCH /api/admin/leads/[id]

**목적:** 리드 상태/정보 업데이트

**Request:**
```json
{
  "status": "replied",
  "quoted_price_min": 3000,
  "quoted_price_max": 5000,
  "notes": "병원이 응답함"
}
```

**Response:**
```json
{
  "ok": true,
  "lead": {...}
}
```

**특징:**
- ✅ Zod 검증 (LeadUpdateSchema)
- ✅ Status가 "replied"로 변경 시 `first_response_at` 자동 설정
- ✅ `last_status_at` 항상 업데이트
- ✅ 감사 로그 자동 기록

---

### 3. GET /api/admin/leads

**목적:** 리드 목록 조회 (JOIN으로 hospital, inquiry 정보 포함)

**Query Parameters:**
```
?status=sent
&hospital_id=uuid
&normalized_inquiry_id=uuid
&start_date=2026-01-01
&end_date=2026-12-31
&limit=100
&offset=0
```

**Response:**
```json
{
  "ok": true,
  "leads": [
    {
      "id": "uuid",
      "status": "sent",
      "assigned_at": "2026-02-04T...",
      "hospital": {
        "id": "uuid",
        "name": "강남 세브란스",
        "slug": "gangnam-sevrance"
      },
      "inquiry": {
        "id": "uuid",
        "language": "ko",
        "country": "South Korea",
        "treatment_slug": "hair-transplant",
        "objective": "..."
      },
      ...
    }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

**특징:**
- ✅ 필터링: status, hospital_id, inquiry_id, 날짜 범위
- ✅ JOIN: hospital, normalized_inquiry 정보 포함
- ✅ 페이지네이션 지원
- ✅ 감사 로그 자동 기록

---

## 🎨 Admin UI

### Page: `/admin/leads`

**주요 기능:**

1. **리드 목록 테이블**
   - 할당일시
   - 병원 (이름, slug)
   - 문의 정보 (country, language, treatment_slug)
   - 상태 (뱃지)
   - 가격 (quoted_price_min/max)
   - 액션 (상태 변경 드롭다운)

2. **필터**
   - 상태 필터 (queued, sent, viewed, replied, converted, rejected, expired)
   - 병원 필터 (전체 병원 목록)

3. **상태 요약**
   - 각 상태별 리드 개수 표시

4. **실시간 업데이트**
   - 상태 변경 시 API 호출 + 목록 새로고침

**UI 스타일:**
- ✅ 기존 admin 레이아웃 재사용
- ✅ 최소한의 디자인 (깔끔한 테이블)
- ✅ 색상 코딩 (상태별 뱃지)

---

## 🔐 Security

### RLS 정책

```
[Browser]
   ↓ (fetch + Bearer token)
[/api/admin/leads/*]
   ↓ (requireAdminAuth)
[Admin Auth Check]
   ↓ (supabaseAdmin - service_role)
[Supabase Service Role]
   ↓ (RLS bypass)
[hospital_leads table]
```

**보안 원칙:**
- ✅ 브라우저는 절대 `hospital_leads`에 직접 접근 불가
- ✅ 모든 요청은 관리자 권한 확인 필수
- ✅ 서비스 롤은 서버 사이드에서만 사용
- ✅ 모든 작업은 감사 로그에 기록됨

### Validation

**Zod 스키마:**
```typescript
// LeadAssignSchema
{
  normalized_inquiry_id: uuid (required),
  hospital_ids: uuid[] (min 1, required)
}

// LeadUpdateSchema
{
  status?: enum (7 values),
  quoted_price_min?: number (min 0),
  quoted_price_max?: number (min 0),
  notes?: string,
  metadata?: object
}
```

**검증 규칙:**
- ✅ UUID 형식 검증
- ✅ Status enum 검증
- ✅ 가격 범위 검증 (min <= max)
- ✅ 예상치 못한 필드 거부

---

## 🚀 Deployment Instructions

### 1. SQL Migration 실행

```sql
-- Supabase Dashboard > SQL Editor
\i migrations/20260204_hospital_leads.sql
```

**검증 쿼리:**
```sql
-- 테이블 확인
SELECT * FROM hospital_leads LIMIT 1;

-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'hospital_leads';

-- Indexes 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'hospital_leads';
```

---

### 2. Vercel 배포

```bash
git add .
git commit -m "feat: hospital leads management system - 100 hospital scale"
git push origin main
# → Vercel 자동 배포
```

---

### 3. Admin UI 테스트

**접속:**
- URL: `https://your-domain.com/admin/leads`
- 권한: `admin@healo.com` 로그인 필요

**테스트 시나리오:**

1. **리드 목록 조회**
   - [ ] 페이지 로드 확인
   - [ ] 필터 동작 확인 (status, hospital)
   - [ ] 데이터 표시 확인

2. **상태 변경**
   - [ ] 드롭다운에서 상태 선택
   - [ ] API 호출 성공 확인
   - [ ] 목록 새로고침 확인

3. **필터링**
   - [ ] 상태별 필터링
   - [ ] 병원별 필터링
   - [ ] 복합 필터링

---

## 📊 Usage Examples

### 예제 1: 리드 할당

**시나리오:** 하나의 inquiry를 3개 병원에 할당

```bash
curl -X POST https://your-domain.com/api/admin/leads/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "normalized_inquiry_id": "123e4567-e89b-12d3-a456-426614174000",
    "hospital_ids": [
      "223e4567-e89b-12d3-a456-426614174001",
      "323e4567-e89b-12d3-a456-426614174002",
      "423e4567-e89b-12d3-a456-426614174003"
    ]
  }'
```

**결과:**
- 3개의 `hospital_leads` 레코드 생성
- 각 병원에 status='sent', assigned_at=now()
- 감사 로그에 ASSIGN_LEADS 이벤트 기록

---

### 예제 2: 병원 응답 기록

**시나리오:** 병원이 가격을 제시하며 응답

```bash
curl -X PATCH https://your-domain.com/api/admin/leads/[lead-id] \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "replied",
    "quoted_price_min": 3000,
    "quoted_price_max": 5000,
    "notes": "병원 측에서 가격 제시함. 상담 예약 가능."
  }'
```

**결과:**
- status → "replied"
- first_response_at → now() (처음 replied 시)
- last_status_at → now()
- 가격 정보 업데이트
- 감사 로그에 UPDATE_LEAD 이벤트 기록

---

### 예제 3: 병원별 응답률 조회

**시나리오:** 특정 병원의 리드 현황 조회

```bash
curl https://your-domain.com/api/admin/leads?hospital_id=[hospital-id] \
  -H "Authorization: Bearer $TOKEN"
```

**분석:**
```javascript
const { leads, total } = response.data;
const replied = leads.filter(l => l.status === 'replied').length;
const responseRate = (replied / total * 100).toFixed(1);

console.log(`응답률: ${responseRate}%`);
console.log(`평균 응답 시간: ...`);
```

---

## 🎯 Next Steps (향후 확장)

현재 구현된 P0 기능으로 100개 병원 확장이 가능합니다. 향후 선택적으로 추가할 수 있는 기능:

### Phase 2 (선택)

1. **자동 리드 할당**
   - 조건: 병원 위치, 시술 종류, 가용성
   - 우선순위: 응답률, 전환율, 평점

2. **이메일 알림**
   - 병원에 새 리드 할당 시 이메일 발송
   - 관리자에게 응답 알림

3. **병원 포털**
   - 병원이 직접 로그인하여 리드 확인
   - 가격 제시, 상담 예약 직접 입력

4. **분석 대시보드**
   - 병원별 응답률, 전환율
   - 시술별 인기도
   - 지역별 수요 분석

5. **A/B 테스팅**
   - 리드 할당 알고리즘 최적화
   - 응답률 개선 실험

---

## ✅ Verification Checklist

- [x] **Database**
  - [x] hospital_leads 테이블 생성
  - [x] RLS 정책 설정 (service_role 전용)
  - [x] Indexes 생성 (성능 최적화)
  - [x] Triggers 설정 (updated_at 자동 갱신)

- [x] **API Routes**
  - [x] POST /api/admin/leads/assign (리드 할당)
  - [x] PATCH /api/admin/leads/[id] (상태 업데이트)
  - [x] GET /api/admin/leads (목록 조회)
  - [x] Zod 검증 적용
  - [x] requireAdminAuth 적용
  - [x] 감사 로그 기록

- [x] **Admin UI**
  - [x] /admin/leads 페이지 생성
  - [x] 리드 목록 테이블
  - [x] 필터 (status, hospital)
  - [x] 상태 변경 드롭다운
  - [x] AdminNav 메뉴 추가

- [x] **Security**
  - [x] 브라우저에서 직접 DB 접근 차단
  - [x] 모든 API 요청에 admin 권한 확인
  - [x] RLS 정책으로 데이터 레벨 보안

- [x] **Build & Deploy**
  - [x] npm run build 성공
  - [x] 임포트 에러 없음
  - [x] 새 routes 정상 생성

---

## 📝 Conclusion

**Hospital Leads Management System이 성공적으로 구현되었습니다.**

- ✅ 100개 병원으로 확장 가능한 구조
- ✅ 병원별 리드 할당 및 응답 추적
- ✅ Admin API + UI 완성
- ✅ 보안 (RLS + Admin 권한)
- ✅ 감사 로그 (모든 작업 기록)
- ✅ 빌드 성공, 프로덕션 배포 준비 완료

**플랫폼이 스케일 아웃 준비 완료되었습니다!** 🚀✨

---

## 📞 Support

문의사항이나 추가 기능 요청이 있으시면 알려주세요.

- Migration 실행: `migrations/20260204_hospital_leads.sql`
- Admin UI 접속: `https://your-domain.com/admin/leads`
- API 문서: 이 보고서 참조
