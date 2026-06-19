# healwith — 암환자 의료관광 컨시어지 (KHIDI HEALO)

**Stage**: 운영 중 (연속 케어 컨시어지) · **Last Updated**: 2026-06-19

> 카자흐스탄·러시아·CIS **암환자**를 한국 **종양 병원**으로 연결하는 의료관광 컨시어지 플랫폼.
> 정부지원과제(KHIDI, 한국보건산업진흥원) + Bonroi 개인사업자. PO 1인 운영.

> ⚠️ **새 세션·신규 합류자는 [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) 최상단 핸드오프를 먼저 읽으세요** — "왜 이렇게 결정했는지"와 현재 상태·다음 할 일의 단일 출처(SoR)입니다. 프로젝트 지침은 [`CLAUDE.md`](CLAUDE.md), 알려진 이슈는 [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

---

## 🎯 무엇인가 (피벗 반영)

예전엔 "한국 병원 디렉토리(크롤링)"였으나 → **암환자 연속 케어 컨시어지**로 피벗했습니다.
제휴 병원은 면역·한방병원 3곳(진단·면역·재활) + 협진 대학병원 4곳(수술·항암)으로,
"100개 중 하나 고르기"가 아니라 **진단 → 수술 연계 → 면역·재활을 쭉 잇는** 모델입니다.

### 핵심 기능
- 🩺 **통합 문의 퍼널** (`/inquiry`): AI Agent / Human Agent(WhatsApp·Telegram·WeChat·LINE) / 문의 폼
- 🤖 **AI 상담**: `gemini-flash-latest` + 3-Tier RAG (pgvector) — 암환자 필수서류·견적 안내
- 🎥 **원격협진(LiveKit WebRTC)** (`/consultation/[id]`): 게스트 초대 링크로 계정 없이 입장, 실시간 번역 자막
- 🗺️ **치료 여정 안내** (`/care-journey`): 6개 언어 정적 가이드
- 🛠️ **운영 대시보드** (`/admin/*`): 문의·상담·회원·제휴자원·RAG·유치 전환 집계
- 🌐 **다국어 6종**: 한국어·영어·러시아어·카자흐어·중국어·일본어

---

## 🛠 기술 스택
- **Frontend/Backend**: Next.js 16 (App Router) + React 18, TailwindCSS 3
- **DB**: Supabase (PostgreSQL 17.6, RLS, pgvector) — 프로젝트 `hvwwlkawaxabhtumjhrg`
- **AI**: Google Gemini (`gemini-flash-latest` 별칭 — 최신 유지가 PO 결정)
- **영상**: LiveKit (WebRTC 원격협진)
- **Auth**: @supabase/ssr 쿠키 SSR + Bearer 토큰, 권한은 `app_metadata.role`
- **암호화**: AES-256-GCM (`src/lib/security/encryptionV2.ts`)
- **이메일**: AWS SES / Resend
- **모니터링**: Sentry (서버·클라이언트), 운영 로그
- **Hosting**: Vercel (`healo-khidi`, Team `bonrois-projects`) — `main` 푸시 시 자동 배포

---

## 🚀 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기 (Supabase·암호화키·Gemini·LiveKit 등 — .env.example 참고)
npm run check:env            # 환경변수 검증
npm run dev                  # dev 서버 (Turbopack 정상)
```

**프로덕션 빌드는 반드시 `--webpack`** (Turbopack은 빌드 실패):
```bash
npx next build --webpack
```

**암호화 키 생성**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 주요 env (전체는 `.env.example`)
- 필수: `NEXT_PUBLIC_SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY`·`ENCRYPTION_KEY_V2`·`GOOGLE_GENERATIVE_AI_API_KEY`·`ADMIN_EMAIL_ALLOWLIST`
- 영상: `LIVEKIT_URL`·`LIVEKIT_API_KEY`·`LIVEKIT_API_SECRET`
- 선택: `NEXT_PUBLIC_SENTRY_DSN`(설정 시 에러 수집 활성)·AWS SES·`NEXT_PUBLIC_GA_MEASUREMENT_ID`

---

## 💻 개발 스크립트

```bash
npm run dev / build / start      # 개발·빌드·실행
npm run typecheck                # tsc --noEmit (CI 머지 차단 게이트)
npm run lint                     # eslint (정보용)
npm run test:run                 # vitest 단위 테스트
npm run check:content            # 옛 브랜드/이메일 잔재 + i18n 키 누락 차단
npm run check:i18n / check:legal / check:cancer-i18n  # 6개 언어 정합성
npm run verify:rag               # RAG 회귀 방지
npm run e2e / e2e:smoke          # Playwright E2E
```

### CI (`.github/workflows/ci.yml`)
PR마다: vercel.json 검증 → **타입검사(차단)** → 단위테스트 → 콘텐츠/i18n/법률/암종 일관성 → 빌드 → verify:rag.
(lint 는 기존 에러 정리 전까지 정보용·비차단.)

---

## 🔒 보안 핵심 규칙 (상세: `docs/SECURITY_CHECKLIST.md`)
- API 응답에 `error.message` 노출 금지 → `"internal_error"` 코드형만
- 새 API 라우트 → 인증 헬퍼 필수 (`requireAdminAuth` / `requireConsultationAccess`)
- 권한 체크 → `app_metadata.role` 기준 (user_metadata 금지)
- 환자 PII → `encryptStringNullable()` AES-256-GCM 후 `*_encrypted` 컬럼
- 공개 POST → `checkRateLimit(...)`, service_role 서버 모듈 → `import "server-only"`

---

## 📚 문서
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) — **세션 인수인계 단일 출처(먼저 읽기)**
- [`CLAUDE.md`](CLAUDE.md) — 프로젝트 지침 / [`DESIGN.md`](DESIGN.md) — UI 톤 표준
- [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) — 알려진 이슈·기초 감리 백로그
- [`docs/KHIDI_중간보고_베이스.md`](docs/KHIDI_중간보고_베이스.md) — KHIDI 중간평가(2026-08-27) 준비
- [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) · [`docs/ENCRYPTION_GUIDE.md`](docs/ENCRYPTION_GUIDE.md)

---

## 📄 License
Proprietary — All rights reserved.
