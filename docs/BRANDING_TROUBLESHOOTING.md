# 브랜딩 설정 문제 해결 가이드

**작성일**: 2026-02-04

---

## 🔴 에러: "site_settings 테이블이 존재하지 않습니다"

### 증상:
```
[Branding] 설정 조회 실패: "table_not_found"
GET /api/admin/site-settings 503 (Service Unavailable)
```

### 원인:
`site_settings` 테이블이 데이터베이스에 생성되지 않았습니다.

### 해결 방법:

#### 1. Supabase SQL Editor 접속
1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

#### 2. 마이그레이션 실행
1. **New query** 버튼 클릭
2. `migrations/20260204_create_site_settings.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭 (또는 Ctrl+Enter)

#### 3. 확인
```sql
-- 테이블 생성 확인
SELECT * FROM public.site_settings;

-- 결과: 1행 (id, created_at, updated_at, logo_url, hero_background_url)
```

#### 4. 페이지 새로고침
- `/admin/settings/branding` 페이지 새로고침
- ✅ 에러 없이 로드되어야 함

---

## 🔴 에러: "internal_error"

### 증상:
```
[Branding] 설정 조회 실패: "internal_error"
GET /api/admin/site-settings 500 (Internal Server Error)
```

### 원인 (가능성 순서):

#### 1. 인증 문제
**확인**:
```javascript
// 브라우저 콘솔에서
console.log(document.cookie);
// "sb-" 로 시작하는 쿠키가 있는지 확인
```

**해결**:
- 로그아웃 후 재로그인
- 관리자 계정으로 로그인했는지 확인

#### 2. supabaseAdmin 설정 문제
**확인**:
- `.env.local` 파일에 `SUPABASE_SERVICE_ROLE_KEY` 존재 확인
- `src/lib/rag/supabaseAdmin.ts` 파일 확인

**해결**:
```bash
# .env.local에 추가
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. RLS 정책 문제
**확인**:
```sql
-- RLS 활성화 여부 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'site_settings';

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'site_settings';
```

**해결**:
- 마이그레이션 파일 재실행 (RLS 정책 포함)
- 또는 service_role은 RLS를 우회하므로 문제 없어야 함

---

## 🔴 에러: "Bucket not found"

### 증상 (업로드 시):
```
❌ storage_bucket_not_found
public-assets 버킷을 생성하세요.
```

### 해결:
`docs/STORAGE_SETUP.md` 참조하여 Storage 버킷 생성

---

## 🔴 업로드 후 이미지가 반영되지 않음

### 증상:
- 업로드 성공 Toast 표시
- 하지만 헤더/홈페이지에 새 이미지 안 보임

### 원인:

#### 1. 브라우저 캐시
**해결**:
- 강제 새로고침: `Ctrl + Shift + R` (Windows/Linux)
- 또는 `Cmd + Shift + R` (Mac)

#### 2. CDN 캐시
**해결**:
- 1-2분 대기 (CDN 캐시 갱신)
- 또는 파일명에 타임스탬프 추가 (향후 개선)

#### 3. ClientShell 캐시
**확인**:
```javascript
// app/ClientShell.jsx
supabaseClient
  .from("site_settings")
  .select("*")
  .single()
```

**해결**:
- 페이지 전체 새로고침으로 해결됨
- 또는 `no-cache` 옵션 추가

---

## 🔴 파일 업로드 실패

### 증상:
```
❌ file_too_large. Max: 2MB
```

### 해결:
1. 이미지 압축 도구 사용:
   - [TinyPNG](https://tinypng.com/)
   - [Squoosh](https://squoosh.app/)
   - [ImageOptim](https://imageoptim.com/)

2. 또는 파일 크기 제한 변경:
   - `app/api/admin/site-settings/upload/route.ts`
   - `MAX_SIZE` 상수 수정

---

## 🔴 잘못된 파일 타입

### 증상:
```
❌ invalid_file_type. Allowed: image/png, image/svg+xml, image/webp
```

### 해결:
1. 허용된 파일 형식으로 변환:
   - **로고**: PNG, SVG, WebP
   - **배경**: JPEG, PNG, WebP

2. 또는 허용 타입 확장:
   - `app/api/admin/site-settings/upload/route.ts`
   - `ALLOWED_TYPES` 상수 수정

---

## 📋 진단 체크리스트

### 기본 확인:
- [ ] `site_settings` 테이블 존재
- [ ] `public-assets` Storage 버킷 존재
- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 설정
- [ ] 관리자 계정으로 로그인

### API 확인:
- [ ] `GET /api/admin/site-settings` 200 응답
- [ ] `POST /api/admin/site-settings/upload` 200 응답

### 브라우저 확인:
- [ ] 콘솔에 에러 없음
- [ ] Network 탭에서 API 응답 확인
- [ ] 브라우저 캐시 초기화

---

## 🔧 디버깅 명령어

### 1. 테이블 확인
```sql
-- 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'site_settings';

-- 테이블 구조 확인
\d public.site_settings;

-- 데이터 확인
SELECT * FROM public.site_settings;
```

### 2. Storage 확인
```sql
-- 버킷 확인
SELECT * FROM storage.buckets WHERE name = 'public-assets';

-- 파일 목록
SELECT * FROM storage.objects WHERE bucket_id = 'public-assets';
```

### 3. RLS 정책 확인
```sql
-- RLS 활성화 여부
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'site_settings';

-- 정책 목록
SELECT * FROM pg_policies WHERE tablename = 'site_settings';
```

---

## 🆘 추가 지원

### 서버 로그 확인:
```bash
# 터미널에서 개발 서버 로그 확인
npm run dev

# API 에러 로그 찾기
# [/api/admin/site-settings [GET]] 로 시작하는 로그 확인
```

### Supabase 로그 확인:
1. Supabase Dashboard
2. **Logs** 섹션
3. **API Logs** 또는 **Database Logs** 확인

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-02-04
