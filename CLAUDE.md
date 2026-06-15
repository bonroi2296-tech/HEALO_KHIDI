# HEALO KHIDI — Claude Code 프로젝트 지침

## ⚠️ 새 세션 시작 시 필수 (맥락 인수인계)

**`docs/PROJECT_CONTEXT.md` 먼저 읽기.** 피벗 방향·핵심 전략 결정(왜)·현재 기능 상태·PO 결정 대기 항목·다음 작업까지 — 코드만 봐선 안 보이는 맥락 전부. 이걸 읽으면 이전 세션과 연속으로 일할 수 있다 (PO가 다시 설명 안 해도 됨).
남은 버그·개선점은 `docs/KNOWN_ISSUES.md`.

## ⚠️ KHIDI 중간평가 (2026-08-27) — 모든 작업의 상시 기준

**이 사업은 8/27 중간평가에서 70점 이상이어야 잔금(30%)을 받는다. 앞으로의 모든 개발·운영 작업은 이 평가를 염두에 두고 진행한다 (8월에 급조 금지).**

- 상세·성과지표·양식·일정: **`docs/KHIDI_중간보고_베이스.md` 참고** (살아있는 준비 문서)
- **공식 성과지표(목표)**: 외국인환자 유치 **12건** / 사전상담·사후관리 **120건** / 환자 만족도 **90점** + 정성(ICT 체계 구축, 양·한방 협진모델). 정량 2개는 **유치 전환 대시보드(`/admin/khidi/conversion`)가 자동 집계** = 그게 곧 점수.
- **평가항목 4개**: ①사업목적·BM ②추진실적 ③향후계획 ④성과지표 달성도.
- **작업 습관**: 의미 있는 개발·운영을 하면 `docs/KHIDI_중간보고_베이스.md` §4 월별 로그에 한 줄 기록하고, 가능하면 성과지표(유치/상담/사후관리/만족도)와 연결되게 만든다.
- 평가일 PT 20분+Q&A 10분 / 장소 메디컬코리아지원센터(서울역).

## ⚠️ 신규 UI 작업 전 필수 확인

**`DESIGN.md` (프로젝트 루트) 먼저 읽기.** Legacy 톤 표준·금지 룰·"AI가 만든 느낌" 회피 가이드 포함.
위반 시 PR 머지 거부.

## 사용자 프로필

PO(프로덕트 오너) 혼자 운영. Bonroi 개인사업자, KHIDI(한국보건산업진흥원) 정부지원과제.

**소통 스타일:**
- 한국어 + 필수 영어 용어만 혼용, 짧고 직설적
- 결과물(URL, 배포, 시각적 확인) 우선 — 긴 설명 X
- **개발 용어는 쉽게 풀어 설명하되 원래 용어를 병기** — PO가 학습할 수 있게. 풀이 없이 용어만 쓰기 금지. (PO가 직접 요청한 방식)
  - 자주 쓰는 변환: 합치기 신청서(PR) / 자동 검사(CI) / 본판에 합침(머지) / 실서비스 반영(배포·deploy) / 작업본(브랜치) / 저장 올리기(커밋·푸시)
- 기술 디테일은 물어볼 때만 설명
- "야 이거 ~~함" "~인디?" 같은 말투에 맞춰서 대응

---

## 프로젝트 개요

**KHIDI HEALO** — 카자흐스탄/러시아/CIS 암환자 → 한국 종양 병원 매칭 의료관광 플랫폼.

**기술 스택:**
- Next.js 16 (App Router) + Supabase (PostgreSQL 17.6, RLS, pgvector)
- AI: `gemini-flash-latest` (자동 최신 별칭) — **PO 결정(2026-06-12): 최신 유지. AI가 임의로 구형 고정 금지.** 별칭 특성상 단가가 바뀔 수 있으므로 비용 통제는 Google 콘솔 spend cap + aiGuard(일일 상한)로. + 3-Tier RAG (`src/lib/chat/generateReply.ts`)
- 영상: **LiveKit** WebRTC (원격협진) — env 필수: `LIVEKIT_URL`·`LIVEKIT_API_KEY`·`LIVEKIT_API_SECRET` (NEXT_PUBLIC_LIVEKIT_URL은 선택)
- Auth: @supabase/ssr cookie-based SSR + Bearer token
- 암호화: AES-256-GCM (`src/lib/security/encryptionV2.ts`)
- Hosting: Vercel — 프로젝트 `healo-khidi` (메인), Team `bonrois-projects`
- 다국어: ko, en, ru, kz, zh, ja (6개 언어) — `src/lib/i18n/index.js`
- Supabase 프로젝트: `hvwwlkawaxabhtumjhrg`

**주요 라우트:** (2026-05 피벗·통합 반영)
- `/` 홈
- `/inquiry` **통합 문의 퍼널** — 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 redirect (통폐합 완료). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널.
- `/care-journey` 치료 여정 안내 (정적, 6개 언어)
- `/telemedicine` 원격협진 (헤더 전면 배치, NEW)
- `/hospitals` `/treatments` 목록 | `/treatments/[slug]` 암종 상세 | `/search` 검색
- `/consultation/[id]` **LiveKit 영상 상담방** (게스트 초대 링크로 계정 없이 입장)
- `/patient/*` 환자 | `/admin/*` 어드민 | `/coordinator/*` 코디네이터 | `/partner/*` 파트너
- `/stories` 후기 — **비활성화**(홈 리다이렉트, 코드는 보존)

**주요 시스템:**
- **원격협진(LiveKit)**: 코디가 `/admin/consultations`에서 상담 생성(문의에서 환자 선택 + 의사/코디 드롭다운) → 게스트 초대 링크 발송 → `/consultation/[id]`에서 영상. 예약시각은 KST 입력·KST+UTC 병기 안내.
- **회원관리**: `/admin/staff`(의사·코디 — role=doctor/coordinator 부여, 비활성=app_metadata.disabled 토글, 소프트 삭제) / `/admin/users`(환자 — 상담이력·소프트 ban). 계정 생성은 임시비번 직접 발급(최소 6자).
- **어드민 메뉴**: 운영현황 / 환자여정 / 제휴자원·RAG / AI품질·시스템 / 레거시도구 (피벗 반영 재편)

---

## ⚠️ 출시 전 self-QA (PO가 일일이 테스트하지 않아도 되게 — 필수)

**"빌드 통과 ≠ 동작."** `next build`는 문법만 검사함. 출시(커밋) 전 아래를 직접 검증:

- **DB/데이터 기능**: 쿼리 짜기 전 RLS 정책 확인(`pg_policies`). `inquiries` 등 민감 테이블은 service_role 전용 → **브라우저 client 직접 쿼리 금지, 서버 API 경유**. 암호화 컬럼(`*_encrypted`, first_name 등)은 표시 전 복호화 필요.
- **데이터 흐름 추적**: 폼→API→DB→표시 전 경로를 실제로 따라가 확인 (Supabase MCP로 실데이터 조회, Vercel 런타임 로그 확인).
- **인증/권한**: 새 API는 `requireAdminAuth`/`requireConsultationAccess`. 권한은 `app_metadata.role` + `ADMIN_EMAIL_ALLOWLIST` 둘 다 고려.
- **사용자 화면**: 가능하면 배포 후 실제 클릭/조회로 확인. 못 하면 "직접 동작 검증 못 함"이라고 명시.
- **소프트 삭제 원칙**: 계정·기록은 하드 삭제 X (FK·기록 보존, 비활성/role 플래그 토글).
- 검증 못 한 부분은 **"검증 못 했음"이라고 솔직히 보고** — "됐어요" 남발 금지.

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
