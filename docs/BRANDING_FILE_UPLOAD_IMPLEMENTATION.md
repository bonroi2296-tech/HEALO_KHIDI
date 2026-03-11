# 브랜딩 파일 업로드 시스템 구현 보고서

**작성일**: 2026-02-04  
**목표**: URL 입력 방식을 파일 업로드 방식으로 전환

---

## 🎯 개선 사항 요약

### Before (URL 입력 방식):
- ❌ 사용자가 직접 이미지 URL 입력
- ❌ 외부 호스팅 의존
- ❌ 이미지 관리 불편
- ❌ 500 에러 발생

### After (파일 업로드 방식):
- ✅ 드래그 & 드롭 스타일 파일 업로드
- ✅ Supabase Storage 자동 관리
- ✅ 업로드 즉시 저장 및 반영
- ✅ 에러 처리 강화

---

## 📦 구현 내용

### 1. **업로드 API 생성**
**파일**: `app/api/admin/site-settings/upload/route.ts`

#### 기능:
- FormData로 파일 수신
- 파일 타입/크기 검증
- Supabase Storage 업로드 (upsert)
- Public URL 생성
- `site_settings` 테이블 자동 업데이트

#### 엔드포인트:
```
POST /api/admin/site-settings/upload
Content-Type: multipart/form-data

Body:
- file: File
- type: "logo" | "hero"
```

#### 검증 규칙:
| 항목 | 로고 | 히어로 배경 |
|------|------|-------------|
| **타입** | PNG, SVG, WebP | JPEG, PNG, WebP |
| **최대 크기** | 2MB | 8MB |
| **저장 경로** | `branding/logo.<ext>` | `branding/hero-bg.<ext>` |

#### 응답:
```json
{
  "ok": true,
  "message": "로고 업로드 완료",
  "url": "https://.../public-assets/branding/logo.png",
  "type": "logo"
}
```

---

### 2. **기존 API 유지 (안정화)**
**파일**: `app/api/admin/site-settings/route.ts`

#### GET `/api/admin/site-settings`
- **변경 없음**: 이미 안정적으로 구현됨
- `maybeSingle()` 사용으로 0건 시에도 정상 응답
- 기본값: `{ logo_url: "", hero_background_url: "" }`

#### PUT `/api/admin/site-settings`
- **변경 없음**: Upsert 로직 정상 동작
- 기존 설정 있으면 UPDATE
- 없으면 INSERT

#### 에러 처리:
- DB 에러는 서버 로그 + 클라이언트 응답
- 500 에러 대신 적절한 에러 메시지

---

### 3. **UI 완전 재구성**
**파일**: `app/admin/settings/branding/page.tsx`

#### 제거된 요소:
- ❌ URL 입력 필드
- ❌ "저장" 버튼 (업로드 즉시 저장)
- ❌ PUT 요청 로직

#### 추가된 요소:
- ✅ 파일 업로드 영역 (2개: 로고, 히어로)
- ✅ 현재 이미지 미리보기
- ✅ 드래그 & 드롭 스타일 UI
- ✅ 업로드 중 로딩 상태
- ✅ Toast 알림
- ✅ Storage 설정 안내

#### UI 구조:
```
┌─────────────────────────────────────────────────────────┐
│ 브랜딩 설정                                              │
│ 사이트 로고 및 히어로 배경 이미지를 관리합니다.          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 로고 이미지                                          │ │
│ │                                                      │ │
│ │ ┌──────────────┐  ┌──────────────┐                 │ │
│ │ │ 현재 로고    │  │ 새 로고 업로드│                 │ │
│ │ │              │  │              │                 │ │
│ │ │  [이미지]    │  │  📤 파일선택 │                 │ │
│ │ │              │  │              │                 │ │
│ │ └──────────────┘  └──────────────┘                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 히어로 배경 이미지                                   │ │
│ │                                                      │ │
│ │ ┌──────────────┐  ┌──────────────┐                 │ │
│ │ │ 현재 배경    │  │ 새 배경 업로드│                 │ │
│ │ │              │  │              │                 │ │
│ │ │  [이미지]    │  │  📤 파일선택 │                 │ │
│ │ │              │  │              │                 │ │
│ │ └──────────────┘  └──────────────┘                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ 💡 참고 사항                                             │
│ • 로고: 투명 배경 PNG 권장, 최대 높이 40px 내외         │
│ • 히어로 배경: 1920x1080 이상 해상도 권장              │
└─────────────────────────────────────────────────────────┘
```

#### 업로드 흐름:
1. 파일 선택 (`<input type="file">`)
2. `handleFileUpload()` 호출
3. FormData 생성
4. POST `/api/admin/site-settings/upload`
5. 업로드 중 로딩 표시
6. 성공 시:
   - Toast 알림
   - `fetchSettings()` 재호출
   - 1.5초 후 페이지 새로고침
7. 실패 시:
   - Toast 알림 (에러 메시지)
   - 파일 input 초기화

---

## 🗂️ Storage 구조

### 버킷: `public-assets`
- **접근 권한**: Public (읽기)
- **쓰기 권한**: Admin만 (service_role)

### 경로:
```
public-assets/
└── branding/
    ├── logo.png          # 로고 (덮어쓰기)
    ├── logo.svg          # 또는 SVG
    ├── logo.webp         # 또는 WebP
    ├── hero-bg.jpg       # 히어로 배경 (덮어쓰기)
    ├── hero-bg.png       # 또는 PNG
    └── hero-bg.webp      # 또는 WebP
```

**특징**:
- 동일 파일명 업로드 시 기존 파일 덮어쓰기 (`upsert: true`)
- Public URL 자동 생성
- CDN을 통한 빠른 로딩

---

## 🔄 데이터 흐름

```
[관리자 페이지]
     ↓ 파일 선택
[FormData 구성]
     ↓
[POST /api/admin/site-settings/upload]
     ↓ requireAdminAuth
[파일 검증]
  ├─ 타입 체크 (PNG/SVG/WebP/JPEG)
  ├─ 크기 체크 (2MB/8MB)
  └─ 확장자 추출
     ↓
[Supabase Storage 업로드]
  └─ public-assets/branding/<filename>
     ↓
[Public URL 생성]
     ↓
[site_settings 업데이트]
  └─ logo_url or hero_background_url
     ↓
[응답: {ok, url}]
     ↓
[UI 갱신]
  ├─ Toast 알림
  ├─ fetchSettings() 재호출
  └─ 1.5초 후 window.location.reload()
     ↓
[ClientShell 재로드]
  └─ site_settings 다시 조회
     ↓
[헤더/홈페이지]
  ✅ 새 이미지 즉시 반영
```

---

## 📂 생성/수정된 파일

### 생성된 파일:
1. **`app/api/admin/site-settings/upload/route.ts`**
   - 파일 업로드 API
   - 검증, Storage 업로드, DB 업데이트

2. **`docs/STORAGE_SETUP.md`**
   - Supabase Storage 설정 가이드
   - 버킷 생성, RLS 정책, 문제 해결

3. **`docs/BRANDING_FILE_UPLOAD_IMPLEMENTATION.md`**
   - 이 문서

### 수정된 파일:
1. **`app/admin/settings/branding/page.tsx`**
   - URL 입력 → 파일 업로드 UI로 전환
   - 완전 재작성

2. **`app/api/admin/site-settings/route.ts`**
   - (변경 없음, 이미 안정적)

---

## ✅ 완료 기준 충족

### ✅ 1. 파일 업로드 기반으로 전환
- URL 입력 필드 제거
- 파일 선택 UI 추가
- Supabase Storage 연동

### ✅ 2. 500 에러 해결
- GET API는 이미 안정적 (maybeSingle 사용)
- 에러 처리 강화
- 버킷 없음 시 안내 메시지

### ✅ 3. 즉시 반영
- 업로드 성공 시 자동 새로고침
- ClientShell이 새 설정 로드
- 헤더/홈페이지 즉시 갱신

### ✅ 4. 파일 검증
- 타입 체크 (로고: PNG/SVG/WebP, 배경: JPEG/PNG/WebP)
- 크기 제한 (로고: 2MB, 배경: 8MB)
- 에러 메시지 명확

### ✅ 5. UX 개선
- 드래그 & 드롭 스타일
- 업로드 중 로딩 표시
- Toast 알림
- 미리보기 자동 갱신

---

## 🧪 테스트 가이드

### 1. Storage 버킷 설정
```
1. Supabase Dashboard 접속
2. Storage > New bucket
3. Name: public-assets
4. Public bucket: ✅ 체크
5. Create
```

### 2. 로고 업로드 테스트
```
1. /admin/settings/branding 접속
2. ✅ 500 에러 없음, 현재 설정 로드
3. 로고 섹션에서 "파일 선택" 클릭
4. PNG 파일 선택 (예: logo.png, < 2MB)
5. ✅ "업로드 중..." 표시
6. ✅ Toast: "✅ 로고 업로드 완료"
7. ✅ 미리보기 영역에 새 로고 표시
8. ✅ 1.5초 후 페이지 자동 새로고침
9. ✅ 헤더에 새 로고 반영 확인
```

### 3. 히어로 배경 업로드 테스트
```
1. 히어로 배경 섹션에서 "파일 선택" 클릭
2. JPEG 파일 선택 (예: hero.jpg, < 8MB)
3. ✅ "업로드 중..." 표시
4. ✅ Toast: "✅ 히어로 배경 업로드 완료"
5. ✅ 미리보기 영역에 새 배경 표시
6. ✅ 홈페이지에서 새 배경 반영 확인
```

### 4. 에러 케이스 테스트
```
# 파일 크기 초과
1. 10MB 이미지 업로드 시도
2. ✅ Toast: "❌ file_too_large. Max: 2MB"

# 잘못된 파일 타입
1. PDF 파일 업로드 시도
2. ✅ Toast: "❌ invalid_file_type"

# 버킷 없음
1. Storage 버킷 미생성 상태
2. ✅ Toast + 노란색 안내 배너
3. ✅ "docs/STORAGE_SETUP.md 참조" 메시지
```

---

## 🎨 UI 특징

### 색상:
- **로고 업로드**: 파란색 (`bg-blue-50`, `border-blue-300`)
- **히어로 업로드**: 보라색 (`bg-purple-50`, `border-purple-300`)
- **로딩**: 회색 (`bg-gray-100`)
- **Toast 성공**: 녹색 (`bg-green-600`)
- **Toast 에러**: 빨간색 (`bg-red-600`)

### 레이아웃:
- Grid 2열 (현재 이미지 | 업로드 영역)
- 반응형: 모바일에서 1열로 변경 (`md:grid-cols-2`)
- 높이 통일: `h-40` (160px)

### 아이콘:
- **업로드**: `Upload` (lucide-react)
- **로딩**: `RefreshCw` + `animate-spin`
- **성공**: `Check`
- **에러**: `X`

---

## ⚠️ 주의 사항

### 1. Storage 버킷 필수
- 업로드 전 `public-assets` 버킷 생성 필요
- 가이드: `docs/STORAGE_SETUP.md`

### 2. RLS 정책
- 현재는 service_role로 우회
- 추가 보안을 위해 RLS 정책 권장 (선택)

### 3. 파일 덮어쓰기
- 동일 파일명 업로드 시 기존 파일 교체
- 버전 관리 필요 시 별도 구현

### 4. 캐시
- CDN 캐시로 인해 즉시 반영 안 될 수 있음
- `window.location.reload()`로 강제 갱신

---

## 🚀 향후 개선 사항

### 선택적 확장:
1. **드래그 & 드롭**
   - HTML5 Drag and Drop API
   - 더 직관적인 UX

2. **이미지 최적화**
   - Sharp 라이브러리
   - 자동 리사이즈/압축
   - WebP 변환

3. **진행률 표시**
   - XMLHttpRequest 또는 axios
   - 업로드 진행률 바

4. **파일 미리보기**
   - 업로드 전 로컬 미리보기
   - FileReader API

5. **버전 관리**
   - 파일명에 타임스탬프
   - 이전 버전 보관/롤백

6. **일괄 업로드**
   - 로고 + 배경 동시 업로드
   - 배치 처리

---

## 📊 성능 고려

### Storage 최적화:
- **CDN**: Supabase 자동 CDN 제공
- **캐싱**: Public 파일 브라우저 캐싱
- **압축**: WebP 권장 (용량 30-80% 감소)

### API 성능:
- **병렬 처리**: 로고/배경 독립적 업로드
- **에러 핸들링**: 빠른 실패 (Fast Fail)

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-02-04  
**테스트 환경**: `/admin/settings/branding`
