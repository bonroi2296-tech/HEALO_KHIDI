# HEALO KHIDI — Claude Code 프로젝트 지침

## ⚠️ 신규 UI 작업 전 필수 확인

**`DESIGN.md` (프로젝트 루트) 먼저 읽기.** Legacy 톤 표준·금지 룰·"AI가 만든 느낌" 회피 가이드 포함.
위반 시 PR 머지 거부.

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
- AI: Gemini 2.5 Flash (via @ai-sdk/google) + 3-Tier RAG (`src/lib/chat/generateReply.ts`)
- Auth: @supabase/ssr cookie-based SSR + Bearer token
- 암호화: AES-256-GCM (`src/lib/security/encryptionV2.ts`)
- Hosting: Vercel — 프로젝트 `healo-khidi` (메인), Team `bonrois-projects`
- 다국어: ko, en, ru, kz, zh, ja (6개 언어) — `src/lib/i18n/index.js`
- Supabase 프로젝트: `hvwwlkawaxabhtumjhrg`

**주요 라우트:**
- `/` 홈 | `/intake` 암 치료 신청 | `/inquiry` 일반 문의
- `/hospitals` `/treatments` 목록 | `/search` 검색
- `/patient/*` 환자 대시보드 (미들웨어 보호)
- `/admin/*` 어드민 | `/coordinator/*` 코디네이터 | `/partner/*` 파트너 병원

---

## 빌드 & 배포

```bash
npx next build --webpack   # 필수: --webpack (Turbopack 금지 — 빌드 실패)
npm run dev                # dev 서버는 Turbopack 정상
```

- Production: `main` 브랜치 푸시 → Vercel 자동 배포
- Preview: 다른 브랜치 푸시 → 자동 preview
- OS: Windows 11 / Shell: bash (Unix syntax)

---

## 보안 핵심 규칙

> 상세 체크리스트: `docs/SECURITY_CHECKLIST.md`

- **API 응답에 error.message 절대 노출 금지** → `"internal_error"` 코드형만
- **새 API 라우트** → 인증 헬퍼 필수 (`requireAdminAuth` / `requireConsultationAccess`)
- **권한 체크** → `app_metadata.role` 기준 (user_metadata 금지)
- **환자 PII** → `encryptStringNullable()` AES-256-GCM 후 `*_encrypted` 컬럼
- **공개 POST** → `checkRateLimit(ip, config)` from `src/lib/rateLimit`
- **서버 모듈** → `import "server-only"` (service_role 키 접근 시)

---

## 코드 컨벤션

- Path alias: `@/*` → `src/*`
- 한국어 주석 OK, 커밋 메시지 한국어
- `strict: false` (TypeScript) — 점진적 전환 중

---

## 프리뷰 팁

- `preview_screenshot` 자주 타임아웃 → `preview_eval` (DOM 쿼리)로 대체
- 시각 확인 필요 시 Vercel preview URL 사용자에게 제공
