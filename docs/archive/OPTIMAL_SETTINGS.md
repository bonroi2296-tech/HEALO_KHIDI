# 🚀 healwith 상용화를 위한 최적 설정 가이드

## 📋 목차
1. [Cursor AI 설정](#cursor-ai-설정)
2. [프로젝트 설정](#프로젝트-설정)
3. [개발 환경 설정](#개발-환경-설정)
4. [협업 워크플로우](#협업-워크플로우)
5. [상용화 체크리스트](#상용화-체크리스트)

---

## 🤖 Cursor AI 설정

### 1. Cursor 설정 최적화

#### Settings (설정) 열기
- `Ctrl + ,` (Windows) 또는 `Cmd + ,` (Mac)
- 또는 메뉴: `File > Preferences > Settings`

#### 추천 설정값

```json
{
  // 코드 자동 완성
  "editor.suggestSelection": "first",
  "editor.wordBasedSuggestions": "off",
  
  // AI 관련
  "cursor.ai.enableAutoComplete": true,
  "cursor.ai.model": "claude-3.5-sonnet", // 또는 최신 모델
  
  // 파일 자동 저장
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  
  // 포맷팅
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  
  // 코드 품질
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 2. .cursorrules 파일 활용

현재 프로젝트의 `.cursorrules` 파일이 AI의 동작을 제어합니다.

**확인 방법:**
- 프로젝트 루트에 `.cursorrules` 파일이 있는지 확인
- 파일이 있으면 AI가 이 규칙을 따라 코드를 작성합니다

**업데이트된 규칙:**
- ✅ 데이터 페칭 규칙
- ✅ 스타일링 규칙
- ✅ 에러 처리 규칙
- ✅ 성능 최적화 규칙
- ✅ 보안 규칙

---

## ⚙️ 프로젝트 설정

### 1. 환경 변수 설정

#### `.env` 파일 생성 (프로젝트 루트)

```bash
# Supabase 설정
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key

# 환경 구분
VITE_APP_ENV=development  # development | staging | production
```

#### `.env.example` 파일 생성 (Git에 포함)

```bash
# Supabase 설정
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=

# 환경 구분
VITE_APP_ENV=development
```

**중요:** `.env` 파일은 `.gitignore`에 포함되어 있어야 합니다!

### 2. Vite 설정 최적화

`vite.config.js` 업데이트:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // 성능 최적화
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
    // 청크 크기 경고 제한
    chunkSizeWarningLimit: 1000,
  },
  
  // 개발 서버 설정
  server: {
    port: 5173,
    open: true, // 자동으로 브라우저 열기
  },
  
  // 경로 별칭 (선택사항)
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

### 3. ESLint 설정 강화

`eslint.config.js`에 추가 규칙:

```javascript
rules: {
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
  'no-console': ['warn', { allow: ['warn', 'error'] }], // console.log 금지
  'react-hooks/exhaustive-deps': 'warn', // useEffect 의존성 체크
}
```

### 4. package.json 스크립트 추가

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit", // TypeScript 사용 시
    "test": "vitest", // 테스트 추가 시
    "format": "prettier --write \"src/**/*.{js,jsx}\"" // 포맷팅
  }
}
```

---

## 🛠️ 개발 환경 설정

### 1. 필수 확장 프로그램 (VSCode/Cursor)

#### 필수
- **ESLint** - 코드 품질 검사
- **Prettier** - 코드 포맷팅
- **Tailwind CSS IntelliSense** - Tailwind 자동완성

#### 권장
- **Error Lens** - 에러를 인라인으로 표시
- **GitLens** - Git 히스토리 확인
- **Thunder Client** - API 테스트

### 2. Git 설정

#### `.gitignore` 확인

다음 항목들이 포함되어 있는지 확인:
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

#### Git Hooks 설정 (선택사항)

`.husky` 폴더 생성하여 커밋 전 자동 검사:

```bash
# pre-commit: 린트 체크
npm run lint

# 커밋 메시지 규칙
# 예: "feat: 새로운 기능 추가"
# 예: "fix: 버그 수정"
# 예: "refactor: 코드 리팩토링"
```

### 3. 브라우저 개발 도구

#### Chrome DevTools 추천 설정
- Network 탭: "Disable cache" 체크
- Console: "Preserve log" 체크
- React DevTools 확장 프로그램 설치

---

## 👥 협업 워크플로우

### 1. 브랜치 전략

```
main (프로덕션)
  └── develop (개발)
      ├── feature/새기능
      ├── fix/버그수정
      └── refactor/리팩토링
```

### 2. 커밋 메시지 규칙

```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 스타일 변경 (UI)
docs: 문서 수정
test: 테스트 추가
chore: 빌드/설정 변경
```

### 3. 코드 리뷰 체크리스트

- [ ] 에러 처리가 있는가?
- [ ] 로딩 상태가 있는가?
- [ ] 모바일 반응형인가?
- [ ] Toast 메시지를 사용하는가?
- [ ] 테스트가 있는가? (추후)

---

## ✅ 상용화 체크리스트

### Phase 1: 필수 준비 (1-2주)

#### 코드 품질
- [ ] 모든 `alert()` → `toast`로 변경 ✅ (완료)
- [ ] 에러 처리 통합
- [ ] 로딩 상태 일관성
- [ ] 코드 중복 제거

#### 환경 설정
- [ ] `.env` 파일 설정
- [ ] `.env.example` 파일 생성
- [ ] 환경별 설정 분리 (dev/staging/prod)

#### 보안
- [ ] 환경 변수 검증 추가
- [ ] Supabase RLS (Row Level Security) 설정
- [ ] CORS 설정 확인

### Phase 2: 성능 최적화 (2-3주)

#### 번들 최적화
- [ ] 코드 스플리팅
- [ ] 이미지 최적화 (WebP)
- [ ] 불필요한 의존성 제거

#### 런타임 최적화
- [ ] React.memo 적용
- [ ] useMemo, useCallback 최적화
- [ ] 이미지 lazy loading

#### 모니터링
- [ ] Web Vitals 측정
- [ ] 에러 로깅 (Sentry 등)
- [ ] 성능 분석 도구 연동

### Phase 3: 테스트 & 문서화 (2-3주)

#### 테스트
- [ ] 핵심 기능 단위 테스트
- [ ] 통합 테스트
- [ ] E2E 테스트 (선택)

#### 문서화
- [ ] README 업데이트
- [ ] API 문서화
- [ ] 배포 가이드
- [ ] 트러블슈팅 가이드

### Phase 4: 배포 준비 (1주)

#### 배포 설정
- [ ] Vercel/Netlify 배포 설정
- [ ] 도메인 연결
- [ ] SSL 인증서 설정

#### 최종 점검
- [ ] 프로덕션 빌드 테스트
- [ ] 모든 기능 동작 확인
- [ ] 모바일 테스트
- [ ] 크로스 브라우저 테스트

---

## 🎯 다음 단계 추천

### 즉시 시작 가능한 작업

1. **환경 변수 설정**
   ```bash
   # .env 파일 생성
   # Supabase 정보 입력
   ```

2. **에러 로깅 시스템 구축**
   - Sentry 계정 생성
   - 프로젝트에 연동

3. **성능 모니터링**
   - Google Analytics 설정
   - Web Vitals 측정

### 중기 작업 (1-2개월)

1. **TypeScript 마이그레이션**
   - 점진적 마이그레이션
   - 새 파일부터 TypeScript로 작성

2. **테스트 코드 작성**
   - 핵심 기능부터 시작
   - Jest + React Testing Library

3. **CI/CD 파이프라인**
   - GitHub Actions 설정
   - 자동 배포

---

## 📞 도움이 필요할 때

### AI 어시스턴트에게 요청할 때

**좋은 요청:**
```
"환경 변수 검증 로직을 supabase.js에 추가해줘. 
VITE_SUPABASE_URL이 없으면 에러를 throw하도록"
```

**나쁜 요청:**
```
"설정해줘" (너무 모호함)
```

### 문제 해결 순서

1. 에러 메시지 확인
2. 브라우저 콘솔 확인
3. 터미널 로그 확인
4. AI 어시스턴트에게 에러 메시지와 함께 질문

---

## 🎉 마무리

이 설정들을 적용하면:
- ✅ 일관된 코드 품질
- ✅ 효율적인 개발 워크플로우
- ✅ 안정적인 배포 프로세스
- ✅ 확장 가능한 아키텍처

**상용화까지 함께 달려봅시다! 🚀**
