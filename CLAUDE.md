# HEALO KHIDI — Claude Code 프로젝트 지침

## 사용자 프로필

PO(프로덕트 오너) 혼자 운영. Bonroi 개인사업자, KHIDI(한국보건산업진흥원) 정부지원과제.

**소통 스타일:**
- 한국어 + 필수 영어 용어만 혼용, 짧고 직설적
- 결과물(URL, 배포, 시각적 확인) 우선 — 긴 설명 X
- git/브랜치 전문 용어 금지: "저장" "합치기" "A버전/B버전" 같은 일상어로
- 기술 디테일은 물어볼 때만 설명
- "야 이거 ~~함" "~인디?" 같은 말투에 맞춰서 대응

---

## 프로젝트 개요

**KHIDI HEALO** — 카자흐스탄/러시아/CIS 암환자 → 한국 종양 병원 매칭 의료관광 플랫폼.

**기술 스택:**
- Next.js 16 (App Router) + Supabase (PostgreSQL 17.6, RLS, pgvector)
- AI: Gemini 2.5 Flash (via @ai-sdk/google) + 3-Tier RAG
- Auth: @supabase/ssr cookie-based SSR + Bearer token
- 암호화: AES-256-GCM (src/lib/security/encryptionV2.ts)
- Hosting: Vercel (healo-khidi 프로젝트)
- 다국어: ko, en, ru, kz, zh, ja (6개 언어)

**주요 라우트:**
- `/` 홈 | `/intake` 암 치료 신청 | `/inquiry` 일반 문의
- `/hospitals` `/treatments` 목록 | `/search` 검색
- `/patient/*` 환자 대시보드 (미들웨어 보호)
- `/admin/*` 어드민 | `/coordinator/*` 코디네이터 | `/partner/*` 파트너 병원

---

## 빌드 & 배포

```bash
# 빌드 (필수: --webpack 플래그)
npx next build --webpack

# Turbopack 절대 사용 금지 — "Call retries were exceeded" 에러 발생
# dev 서버는 Turbopack 정상 작동 (npm run dev)
```

- Production 배포: `main` 브랜치 푸시 → Vercel 자동 배포
- Preview: 다른 브랜치 푸시 → 자동 preview 배포
- Vercel Team: `team_OTAPgfKKul5pUokdQeRTnX9p` (bonrois-projects)
- Project ID: `prj_5W5Md15wbvvkJt7k61mOqBjqYdt8`

---

## 보안 규칙 (필수 준수)

### API 응답
- **error.message 응답 노출 절대 금지** → `"internal_error"`, `"query_failed"` 등 코드형만
- `detail: error.message` 같은 필드도 금지
- `console.error`로 서버 로그는 보존

### 인증
- 새 API 라우트 만들면 반드시 인증 헬퍼 추가:
  - Admin: `requireAdminAuth` (src/lib/auth/requireAdminAuth.ts)
  - Consultation 참가자: `requireConsultationAccess` (src/lib/auth/requireConsultationAccess.ts)
  - 일반 인증: `checkAdminAuth` → `authResult.userId` 체크
- 권한은 `app_metadata.role` 기준 (user_metadata 아님 — 클라이언트가 조작 가능)

### 암호화 & PII
- 환자 PII → `encryptStringNullable()` 으로 AES-256-GCM 암호화 후 `*_encrypted` 컬럼 저장
- 평문 PII 컬럼 응답 시 마스킹 필수 (예: `first_name[0] + "***"`)

### Rate Limit
- 공개 POST 엔드포인트에는 반드시 rate limit 추가
- `checkRateLimit(ip, config)` from `src/lib/rateLimit`

### 기타
- `.env`, 시크릿 파일 수정/커밋 절대 금지
- `import "server-only"` — service_role 키 접근하는 서버 모듈에 필수
- Storage RLS: `attachments`/`documents` = service_role only, `images`/`public-assets` = anon SELECT

---

## 코드 컨벤션

- Path alias: `@/*` → `src/*` (tsconfig.json)
- 한국어 주석 OK, 커밋 메시지 한국어
- `strict: false` (TypeScript) — 점진적 전환 중
- i18n 파일: `src/lib/i18n/index.js`

---

## 3-Tier RAG 시스템

환자 질문 답변을 신뢰도 순서로 검색:

1. **Tier 1 — HEALO DB** (가장 신뢰): hospitals/treatments 직접 검색 + pgvector RAG
2. **Tier 2 — 외부 공식 API**: HIRA + Naver (3초 타임아웃)
3. **Tier 3 — Google Search Grounding**: Gemini grounding (면책 고지 포함)

핵심 파일: `src/lib/chat/generateReply.ts`

---

## Vercel 프로젝트 매핑

| 프로젝트 | 용도 | 비고 |
|---------|------|------|
| `healo-khidi` | **메인** | Production = main 브랜치 |
| `heuristic-black` | 임시 worktree | 환경변수 없음, 사용 금지 |
| `healo`, `bonroi-erp`, `deploy-temp` | 무관 | |

---

## 플랫폼 환경

- OS: Windows 11
- Shell: bash (Unix syntax)
- Supabase 프로젝트: `hvwwlkawaxabhtumjhrg`

---

## 프리뷰 스크린샷 팁

- `preview_screenshot` 자주 30초 타임아웃 (heavy JS, cookie consent)
- 실패 시: `preview_snapshot` (a11y tree) + `preview_eval` (DOM 쿼리) 로 검증
- 시각 확인 필요하면 Vercel preview URL 제공해서 사용자가 직접 보게
