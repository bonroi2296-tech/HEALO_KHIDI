# Supabase Storage 설정 가이드

**목적**: 브랜딩 이미지 업로드를 위한 Supabase Storage 버킷 설정

---

## 📦 버킷 생성

### 1. Supabase Dashboard 접속
1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **Storage** 클릭

### 2. 버킷 생성
1. **"New bucket"** 버튼 클릭
2. 버킷 설정:
   - **Name**: `public-assets`
   - **Public bucket**: ✅ **체크** (필수)
   - **File size limit**: 기본값 (50MB) 또는 적절히 설정
   - **Allowed MIME types**: 비워두기 (모든 이미지 허용)

3. **"Create bucket"** 클릭

---

## 🔐 RLS 정책 설정

### 기본 정책 (권장)

#### 1. 읽기 (Public)
```sql
-- 모든 사용자가 public-assets 버킷의 파일을 읽을 수 있음
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'public-assets' );
```

#### 2. 쓰기 (Admin만)
```sql
-- 관리자만 업로드/수정/삭제 가능
CREATE POLICY "Admin Only Write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets' 
  AND auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE is_admin = true
  )
);

CREATE POLICY "Admin Only Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE is_admin = true
  )
);

CREATE POLICY "Admin Only Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE is_admin = true
  )
);
```

**참고**: 현재 구현은 **service_role**을 사용하므로 RLS를 우회합니다.  
위 정책은 추가 보안을 위한 권장 사항입니다.

---

## 📂 폴더 구조

버킷 내부 경로:
```
public-assets/
└── branding/
    ├── logo.png          (또는 .svg, .webp)
    └── hero-bg.jpg       (또는 .png, .webp)
```

**특징**:
- 파일 업로드 시 자동으로 `branding/` 폴더 생성
- 동일 파일명 업로드 시 기존 파일 덮어쓰기 (upsert)

---

## 🧪 테스트

### 1. 수동 업로드 테스트
1. Supabase Dashboard > Storage > public-assets
2. **"Upload file"** 클릭
3. 테스트 이미지 업로드
4. Public URL 복사 후 브라우저에서 접근 확인

### 2. API 테스트
브랜딩 설정 페이지(`/admin/settings/branding`)에서:
1. 로고 파일 선택
2. "업로드 중..." 표시 확인
3. Toast 알림: "✅ 로고 업로드 완료"
4. 미리보기 영역에 새 이미지 표시 확인

---

## ⚠️ 문제 해결

### 에러 1: "Bucket not found"
**원인**: `public-assets` 버킷이 생성되지 않음

**해결**:
1. Storage 섹션에서 버킷 목록 확인
2. 없으면 위 "버킷 생성" 단계 수행

---

### 에러 2: "new row violates row-level security policy"
**원인**: RLS 정책이 업로드를 차단

**해결 (옵션 A - 권장)**:
- 관리자 API는 service_role을 사용하므로 RLS 우회
- `app/api/admin/site-settings/upload/route.ts`가 `supabaseAdmin` 사용 확인

**해결 (옵션 B)**:
- Storage RLS 정책을 관리자 이메일에 맞게 수정

---

### 에러 3: "File size exceeds limit"
**원인**: 파일 크기가 버킷 제한 초과

**해결**:
1. Supabase Dashboard > Storage > public-assets > Settings
2. **File size limit** 증가 (예: 50MB)
3. 또는 이미지 압축 후 재업로드

---

### 에러 4: "Invalid MIME type"
**원인**: 버킷이 특정 파일 형식만 허용

**해결**:
1. Supabase Dashboard > Storage > public-assets > Settings
2. **Allowed MIME types** 비워두기 (모든 형식 허용)
3. 또는 필요한 형식 추가:
   ```
   image/png
   image/jpeg
   image/webp
   image/svg+xml
   ```

---

## 🔄 업로드 흐름

```
[Admin UI]
   ↓ 파일 선택
[FormData 생성]
   ↓
[POST /api/admin/site-settings/upload]
   ↓ requireAdminAuth
[파일 검증]
   ↓ 타입/크기 체크
[Supabase Storage 업로드]
   ↓ public-assets/branding/
[Public URL 생성]
   ↓
[site_settings 테이블 업데이트]
   ↓ logo_url or hero_background_url
[응답: { ok: true, url }]
   ↓
[UI 갱신 + Toast]
   ↓
[페이지 새로고침]
   ✅ 즉시 반영
```

---

## 📋 체크리스트

설정 완료 확인:
- [ ] `public-assets` 버킷 생성 완료
- [ ] Public bucket 옵션 활성화
- [ ] RLS 정책 설정 (선택, 권장)
- [ ] `/admin/settings/branding` 접속 시 500 에러 없음
- [ ] 로고 업로드 → 성공 Toast 표시
- [ ] 히어로 배경 업로드 → 성공 Toast 표시
- [ ] 업로드 후 미리보기 자동 갱신
- [ ] 헤더/홈페이지에 새 이미지 반영

---

## 🚀 다음 단계

### 선택적 개선:
1. **이미지 최적화**
   - Sharp 라이브러리로 자동 리사이즈
   - WebP 변환

2. **CDN 연동**
   - Cloudflare CDN
   - 캐시 설정

3. **버전 관리**
   - 파일명에 타임스탬프 추가
   - 이전 버전 보관

4. **진행 표시**
   - 업로드 진행률 바
   - 파일 크기 표시

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-02-04  
**관련 파일**: `app/api/admin/site-settings/upload/route.ts`
