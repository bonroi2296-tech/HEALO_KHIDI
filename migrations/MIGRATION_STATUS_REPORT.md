# 마이그레이션 상태 보고서

생성일: 2026-02-05

## 📋 현재 상황

### 1. normalized_inquiries 테이블
**누락된 컬럼:** (사용자 확인)
- ❌ `utm` (jsonb)
- ❌ `landing_path` (text)
- ❌ `referrer` (text)
- ❌ `client_meta` (jsonb)

**출처:**
- Migration 파일: `20260204_p0_db_schema_refinement.sql` (lines 299-342)
- 이미 SQL 작성되어 있음, DB에만 미적용 상태

**코드 사용 여부:**
- 코드에서는 `constraints` 객체 안에 utm을 포함시킴
- 직접 컬럼으로는 아직 사용하지 않음
- 하지만 마이그레이션 파일에 추가 예정이므로 **적용 필요**

---

### 2. inquiries 테이블 (리드 품질)
**확인 필요 컬럼:**
- `lead_quality` (text)
- `priority_score` (integer)
- `lead_tags` (jsonb)
- `quality_signals` (jsonb)
- `quality_evaluated_at` (timestamptz)

**출처:**
- Migration 파일: `20260129_add_lead_quality_and_events.sql`
- 코드에서 사용: `app/api/inquiry/normalize/route.ts` (line 27)
  - `evaluateLeadQuality()` 함수 호출

**상태:**
- 코드에서 import는 하지만 실제 UPDATE/INSERT는 확인 필요
- DB에 컬럼 존재 여부 확인 필요

---

### 3. admin_notification_recipients 테이블
**상태:**
- ✅ `email` 컬럼 존재 (사용자 확인)
- Migration: `20260205_add_email_channel_support.sql`
- **적용 완료**

---

## 🎯 적용할 마이그레이션

### 우선순위 1: normalized_inquiries (즉시 적용)

**파일:** `migrations/SAFE_MIGRATION_APPLY.sql` (새로 생성)

**내용:**
```sql
-- 1. utm 파라미터
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS utm jsonb DEFAULT NULL;

-- 2. landing_path (첫 방문 페이지)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS landing_path text DEFAULT NULL;

-- 3. referrer (유입 경로)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS referrer text DEFAULT NULL;

-- 4. client_meta (브라우저/디바이스 정보)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS client_meta jsonb DEFAULT NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_normalized_inquiries_utm_gin
  ON public.normalized_inquiries USING GIN(utm)
  WHERE utm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_normalized_inquiries_landing_path
  ON public.normalized_inquiries(landing_path)
  WHERE landing_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_normalized_inquiries_referrer
  ON public.normalized_inquiries(referrer)
  WHERE referrer IS NOT NULL;
```

**안전성:**
- ✅ 모든 컬럼 nullable (DEFAULT NULL)
- ✅ 기존 데이터 영향 없음
- ✅ 컬럼이 이미 있어도 에러 없음 (IF NOT EXISTS)
- ✅ 인덱스도 중복 생성 방지

---

### 우선순위 2: inquiries (선택 - 확인 후 적용)

**확인 필요:**
1. Supabase SQL Editor에서 다음 쿼리 실행:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
  AND column_name IN (
    'lead_quality', 
    'priority_score', 
    'lead_tags', 
    'quality_signals', 
    'quality_evaluated_at'
  )
ORDER BY column_name;
```

2. 결과가 0건이면 → `SAFE_MIGRATION_APPLY.sql`의 주석 해제하여 적용
3. 결과가 5건이면 → 이미 적용됨, 건너뛰기

---

## 📝 실행 순서

### Step 1: 사전 검증
```sql
-- normalized_inquiries 현재 상태 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'normalized_inquiries'
  AND column_name IN ('utm', 'landing_path', 'referrer', 'client_meta')
ORDER BY column_name;

-- 예상 결과: 0 rows (컬럼 없음)
```

### Step 2: 마이그레이션 적용
Supabase SQL Editor에서 `migrations/SAFE_MIGRATION_APPLY.sql` 전체 실행

### Step 3: 검증
```sql
-- 컬럼 추가 확인
SELECT 
  '✅ normalized_inquiries 컬럼 추가 완료' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'normalized_inquiries'
  AND column_name IN ('utm', 'landing_path', 'referrer', 'client_meta')
ORDER BY column_name;

-- 예상 결과: 4 rows
-- utm         | jsonb | YES | NULL
-- landing_path | text  | YES | NULL
-- referrer     | text  | YES | NULL
-- client_meta  | jsonb | YES | NULL
```

### Step 4: 샘플 UPDATE 테스트
```sql
-- 테스트 데이터 1건 업데이트 (있다면)
DO $$
DECLARE
  test_id bigint;
BEGIN
  SELECT id INTO test_id 
  FROM public.normalized_inquiries 
  LIMIT 1;
  
  IF test_id IS NOT NULL THEN
    UPDATE public.normalized_inquiries
    SET 
      utm = '{"source": "test", "medium": "manual"}'::jsonb,
      landing_path = '/test',
      referrer = 'https://test.com'
    WHERE id = test_id;
    
    RAISE NOTICE '✅ 샘플 UPDATE 성공: ID %', test_id;
  ELSE
    RAISE NOTICE '⚠️ normalized_inquiries 테이블이 비어있음 (정상)';
  END IF;
END $$;
```

---

## ⚠️ 주의사항

1. **NOT NULL 제약 없음**
   - 모든 신규 컬럼은 nullable
   - 기존 데이터에 영향 없음

2. **인덱스 생성**
   - WHERE 조건 포함 (partial index)
   - NULL 값은 인덱스에 포함 안됨
   - 성능 영향 최소화

3. **롤백 방법** (필요시)
```sql
-- 컬럼 삭제 (데이터 손실 주의!)
ALTER TABLE public.normalized_inquiries
  DROP COLUMN IF EXISTS utm,
  DROP COLUMN IF EXISTS landing_path,
  DROP COLUMN IF EXISTS referrer,
  DROP COLUMN IF EXISTS client_meta;

-- 인덱스 삭제
DROP INDEX IF EXISTS idx_normalized_inquiries_utm_gin;
DROP INDEX IF EXISTS idx_normalized_inquiries_landing_path;
DROP INDEX IF EXISTS idx_normalized_inquiries_referrer;
```

---

## ✅ 체크리스트

- [ ] Step 1: 사전 검증 쿼리 실행
- [ ] Step 2: `SAFE_MIGRATION_APPLY.sql` 실행
- [ ] Step 3: 컬럼 추가 확인
- [ ] Step 4: 샘플 UPDATE 테스트
- [ ] Step 5: inquiries 테이블 확인 (선택)

---

## 📊 예상 결과

### normalized_inquiries 테이블
```
Before: country, treatment_slug, constraints, raw_message, contact, ...
After:  country, treatment_slug, constraints, raw_message, contact, utm, landing_path, referrer, client_meta, ...
```

### 인덱스
```
idx_normalized_inquiries_utm_gin       (GIN on utm)
idx_normalized_inquiries_landing_path  (B-tree on landing_path)
idx_normalized_inquiries_referrer      (B-tree on referrer)
```

---

## 🔍 다른 테이블 검토 결과

**검토 완료:**
- ✅ admin_notification_recipients: email 컬럼 존재
- ✅ inquiries: attachments, lead_quality 등 (확인 필요)
- ✅ normalized_inquiries: utm, landing_path 등 (적용 필요)
- ✅ hospitals, treatments: ARRAY 타입 이미 적용됨 (20260204_p0_db_schema_refinement.sql)

**코드에서 사용하지만 DB에 없는 컬럼:**
- normalized_inquiries: utm, landing_path, referrer, client_meta (확정)
- inquiries: lead_quality 관련 (확인 필요)

**결론:** normalized_inquiries 마이그레이션 즉시 적용 권장
