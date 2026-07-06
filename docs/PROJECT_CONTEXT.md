# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-06 오후~저녁 — 디자인 시스템 3연구(Astryx→Stitch→제너레이티브UI) → **DESIGN.md 허브화 + gen-UI 실제 Gemini 연결**. 방향 = 하이브리드 + "DESIGN.md를 뇌로 3도구")

> PO가 기사 3개를 연달아 던짐: ①Astryx ②Google Stitch ③브런치 "제너레이티브 UI". 매번 분석→"더 깊이"→파일럿. **통합 결론: 셋은 경쟁이 아니라 한 파이프라인의 층 — DESIGN.md(규칙=뇌)를 Stitch(디자인타임 생성)·컴포넌트(프런트=우리Tailwind/백오피스=Astryx)·Vercel AI SDK(런타임 챗봇)가 각자 소비.** PO가 시작점으로 "DESIGN.md 허브화" 선택 → 실행. 이어 gen-UI(챗봇이 검증 컴포넌트 렌더)를 개념→**실제 Gemini 툴콜까지** 파일럿. 전부 PR #669(draft)에. PO "오늘은 마무리·핸드오프".

**1. 이번 세션 한 일**
- **Astryx 심층 리서치**(웹): 실체 = `facebook/astryx`, MIT, 베타(v0.1.3), 메타 사내 8년·13,000앱. 핵심 = React+StyleX + **CLI/MCP 매니페스트**("AI가 읽는 디자인 규칙"). 경쟁(shadcn·Radix·MUI) 대비 차별점(swizzle 이젝트·context-aware spacing·JSON manifest=프론트판 OpenAPI). 한계: StyleX 러닝커브·베타·마케팅글이 리스크 숨김.
- **파일럿 4커밋 푸시**(브랜치 `claude/astryx-design-system-7yw3d3`, **PR #669 draft**):
  - `/astryx-pilot` — 단독 Astryx 화면(병원목록+상담폼), neutral 테마의 accent 토큰 1개만 **teal-600으로 오버라이드** → 버튼·배지·포커스 전부 teal 통일.
  - `/astryx-pilot/compare` — **A/B 토글**(같은 내용, 우리 톤 ↔ Astryx 전환).
  - `/astryx-pilot/backoffice` — **Astryx Table 상담관리 화면**(상태 배지·행별 액션·필터·검색 실동작, 환자명 마스킹 예시).
  - 의존성 추가: `@astryxdesign/core`·`theme-neutral`·`@stylexjs/stylex` (package.json).
- **1차 프리뷰 버그 2건 수정**(PO 스샷 제보): ①기기 다크모드 시 Astryx가 어두워져 밝은 사이트 크롬과 충돌 → `color-scheme:light` 강제 ②Tailwind preflight가 Astryx 버튼 배경을 덮어 투명 → **astryx.css를 de-layer**(`app/astryx-pilot/_vendor/astryx-unlayered.css`)해 원자클래스를 unlayered로 승격.
- **데스크탑/모바일 스샷**(로컬 `next start`+Playwright)으로 PO에게 A/B·백오피스 3장 전달.
- **Stitch·제너레이티브UI 리서치**: Stitch = 무료·MCP(Claude Code 지원)·DESIGN.md import/URL추출. ⚠️핵심한계 = **강제력 없음(매 생성 재지정)** → 초안 도구지 브랜드 공장 아님. 브런치글 = "런타임 생성 UI"(디자이너=모듈+규칙 아키텍트). 런타임 gen-UI 실물 1등 = **Vercel AI SDK**(우리 `ai` v6 이미 설치).
- **DESIGN.md 허브화**(커밋 `477e45e`): 상단 「이 문서의 지위」표(세 도구 소비 매핑) + §4 토큰에 **hex 병기** + 「Astryx teal 토큰 매핑」CSS(@layer 경고 포함) + 「런타임 gen-UI 화이트리스트+가드레일」. 기존 톤규칙·금지목록 그대로(추가만).
- **gen-UI 파일럿**: `/astryx-pilot/genui`(커밋 `b46a574`) = 챗봇이 텍스트 대신 검증 컴포넌트(병원비교·예약슬롯·비용요약·채널) 렌더. **실제 LLM 연결**(커밋 `6cf9f3e`) = `/api/astryx-pilot/genui`에서 Gemini가 화이트리스트 tool 4개 중 선택(execute 없음=렌더는 클라, 자유생성 아님). 안전패턴: 회수제한+aiGuard+에러코드형. 키 없으면 키워드 모의 폴백.

**2. 왜 그렇게 했는지**
- **전면 즉시 도입 안 함**: 베타 + 8/27 중간평가 앞 + 150컴포넌트는 1인엔 오버킬. → 리스크를 화면 파일럿으로 상한.
- **하이브리드로 기운 근거**: 환자 앞단(불안한 암환자)엔 우리 톤의 여백·큰 숫자가 안심 톤. 백오피스(정보밀도)엔 Astryx `Table`·콤팩트함이 실익 큼(손수 Tailwind로 짜는 시간 절약). PO도 모바일에서 "Astryx가 콤팩트해서 좋다"고 함(=백오피스 강점).
- **de-layer가 핵심 발견**: 우리 Tailwind 3.4는 `@tailwind base`(unlayered)라 preflight가 Astryx의 `@layer` 컴포넌트 스타일을 이김 → **정식 도입 시 글로벌 Tailwind를 @layer로 재편해야 함**(1회성 통합 비용, 파일럿이 미리 잡음).
- **DESIGN.md 허브화가 1번인 이유**: 색·톤 값이 세 도구에 흩어지면 드리프트. §4 한 곳(hex 포함)만 SoR로 두면 Stitch import·AI SDK 가드·Astryx 토큰이 다 따라옴. 리스크 0(문서), 나머지의 토대라 먼저.
- **gen-UI가 저리스크·우선인 이유**: 이미 `ai` v6 설치됨 + 화이트리스트만 렌더 = 의료 안전(자유생성 X). 환자 퍼널 개선 = KHIDI 유치전환(=평가 점수)에 직접 기여.

**3. 안 끝났거나 보류**
- ⏸ **Astryx 방향 미확정**: PO가 2026-07-07 이후 파일럿 3화면을 더 테스트한 뒤 결정. 파일럿·PR #669는 그대로 유지(초안). 확정 시 → PROJECT_CONTEXT·DESIGN.md에 기록 + 실제 백오피스 1화면 마이그레이션(글로벌 Tailwind @layer 재편부터).
- ⏸ (이전 세션분 유지) 다기기 화상 테스트·PR #514·옛 브랜치 182개 삭제 — 아래 이전 핸드오프 블록 참조.

**4. 주의·함정**
- 파일럿 라우트(`/astryx-pilot*`)는 **아무 데도 링크 안 됨 + noindex** — 실서비스·기존 페이지 무영향. 지워도 서비스 영향 0.
- `_vendor/astryx-unlayered.css`는 **생성물**(astryx.css에서 @layer 껍데기만 벗긴 사본). 패키지 업그레이드 시 재생성 필요(헤더 주석에 방법). 정식 도입 땐 이 방식 대신 글로벌 @layer 재편이 정답.
- Astryx 컴포넌트는 subpath import 필요(`@astryxdesign/core/Heading` 등 — 메인 index가 Heading·VStack·HStack 등 일부 미포함).
- 브라우저 스샷은 **원격 프리뷰 URL이 프록시로 안 열림**(ERR_CONNECTION_RESET) → 로컬 `next start`(localhost는 프록시 우회)로 찍어야 함.

**5. 다음 세션이 먼저 할 일**
1. **PO의 파일럿 테스트 결과 수렴**: 3화면(단독/compare/backoffice) + gen-UI(`/astryx-pilot/genui`, 실제 Gemini) PO가 폰으로 만져본 뒤 방향 확정. 확정 시 남은 순서: **③Stitch 초안(무료·무커밋 액셀러레이터) ④Astryx 백오피스(글로벌 Tailwind @layer 재편부터, 8/27 평가 후)**.
2. **gen-UI 실전 승격 검토**(원하면): 파일럿 `/api/astryx-pilot/genui`의 tool 패턴을 실제 공개 챗(`/api/public/chat/*`)에 붙일지. 컴포넌트 6언어화·실데이터 연결·스트리밍이 과제.
3. (이전분) 다기기 화상 테스트 — 링크 2026-07-10 만료, 아래 이전 블록 5번 참조.

**6. 검증 상태**
- ✅ `next build --webpack` 성공(파일럿 4라우트 전부 빌드 확인) · `check:content` 통과 · eslint 에러 0(레이아웃 metadata export 경고 1건만, Next 관례상 무해).
- ✅ 배포 CSS 실검증: de-layer 적용(서빙 CSS에 `@layer astryx-base` 0) · `color-scheme:light` · primary 버튼 `background:var(--color-accent)`=teal 확인.
- ✅ 백오피스 테이블 로컬 실렌더 확인(데스크탑 스샷 — 배지·액션·필터 정상). 모바일은 테이블 칼럼 빡빡(백오피스=데스크탑 화면이라 실무 영향 작음).
- ✅ **DESIGN.md 허브화**: `check:content` 통과(추가만, 톤규칙 불변). gen-UI 라우트 `next build` 성공.
- ✅ **gen-UI 실제 Gemini 검증(curl 실측, 배포 프리뷰)**: 4개 의도 → 정확한 tool 4/4 선택(병원비교는 specialty:"폐암" 인자까지 추출) + 비매칭("안녕") = 안전 텍스트. 전부 HTTP 200. aiGuard·회수제한 적용.
- **PR #669**: draft, 열림. CI = **Vercel 프리뷰 하나뿐**(GitHub Actions 미부착). 파일럿 라우트 프리뷰 전부 배포 READY·200(`/astryx-pilot`·`/compare`·`/backoffice`·`/genui`).
- ⚠️ **검증 못 함**: ①"AI 느낌/톤" = PO 육안 몫. ②**gen-UI 배포화면 스샷 못 찍음** — Playwright가 프록시로 프리뷰 못 엶(ERR_CONNECTION_RESET), 로컬은 Gemini 키 없어 모의만. 실제LLM은 curl로만 검증(렌더 컴포넌트는 로컬 모의 스샷과 동일). PO가 폰으로 실화면 확인 필요.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프를 읽어. 지난 세션(2026-07-06)에 디자인시스템 3연구(Astryx·Stitch·제너레이티브UI) 하고 **DESIGN.md를 세 도구가 읽는 허브로 확장** + **챗봇 gen-UI를 실제 Gemini 툴콜까지** 파일럿(PR #669 draft, `/astryx-pilot/*`·`/genui` 배포됨) 해놨어. 방향 = 하이브리드 + "DESIGN.md를 뇌로". 내가 폰으로 파일럿 만져보고 정할게 — 다음은 Stitch 초안이나 gen-UI 실전 승격, 아니면 Astryx 백오피스(평가 후) 중에.

---

## 🔖 세션 핸드오프 (2026-07-06 낮~밤 종결 — 주말 정리 + PO 결정 일괄 완결: notes 암호화 100%·2인 레이아웃·#562 초청장·#658 튕김수리 + webhook 최초 등록 + 루프 정지 + ⚠️다기기 테스트 연기)

> PO 출근 준비 세션("금토일 작업 정리"). 주말 요약 → PO 버튼 결정으로 보류 3건 착수·완결 + 미머지 PR 4건 머지(#654·#567·#562·#658) + 유실 전수조사 0건. **오후 PO 지시로 자동 루프 전부 정지.** ⚠️ **다기기 테스트는 직원 퇴근으로 2026-07-06 미실시 — 연기, 링크 2026-07-10 만료**(5번). (낮 상세 기록은 archive 회전분 참조 — 여기는 종결판)

**1. 이번 세션 한 일**
- **PR #654 ✅ 머지·배포**: ①상담 notes 암호화(AES-256-GCM, `consultationNotes.ts` 신설, 기회주의적 백필) ②데스크톱 1:1 반반분할 + 세로영상 blur-fill. 독립 리뷰 통과 + PLAUSIBLE 2건 반영(구형 iOS matchMedia 폴백·복호화 실패 로그 마커).
- **notes 암호화 100% 완결 실측**: PO가 관리자 계정으로 /admin/consultations + 「전체」 탭 열어 백필 완료 — **DB 실측 평문 0건 / 암호문 7건**.
- **PR #567 ✅ 머지·배포**: 파트너 발굴 추적기(schema-refs 스냅샷 수리 + flaky 스모크 재실행 판별 포함). **Assel 코디 계정 생성·실로그인 검증**(`assel@healwith.co.kr`, 임시비번 PO 채팅 전달).
- **PR #562 ✅ 머지·배포**: 초청장 = 면력한방병원(등록 유치의료기관) 명의 + 본로이 공동.
- **PR #658 ✅ 머지·배포·PO 실화면 검증**: 권한 없는 계정의 /admin 진입 시 "말없이 /login 튕김"(PO 실사고) → proxy.ts 가 로그인O·권한X 를 신설 `/no-access` 안내로, 미로그인만 /login(딥링크 보존). 독립 리뷰가 1차 수정(클라이언트 게이트)=프로덕션 죽은코드임을 CONFIRMED로 잡아 미들웨어로 이전 + open-redirect `/\` 우회 차단.
- **LiveKit webhook 최초 등록(PO 직접)**: 등록된 적 자체가 없었음(이벤트 0의 진짜 원인). `https://healwith.co.kr/api/livekit/webhook` + Signing key `healo`. 첫 실통화 때 Vercel 로그 `[livekit/webhook]` 수신/서명워닝 확인 필요.
- **테스트 상담방 2개 삭제**(PO 승인) / **유실 전수조사**: 브랜치 205개 merge-tree 시뮬레이션 = **main 유실 0건 확정**. 잔여 브랜치 182개 착시가 원인 — GitHub 자동삭제 설정 PO가 켬. 182개 삭제는 원격 환경 3중 차단으로 보류(목록 PO 채팅 전달).

**2. 왜 그렇게 했는지**
- notes 백필을 "조회 시점"으로: ENCRYPTION_KEY_V1 이 서버(Vercel)에만 있고 어드민 목록이 매일 열림 → 자동 전량 이전. `.is("notes_encrypted", null)` 가드로 이중 변환 방지.
- blur-fill 방향 감지 생략: 가로 영상은 앞장(contain)이 타일을 채워 뒷장이 안 보임 — 감지 자체가 불필요.

**3. 안 끝났거나 보류**
- ⏸ **다기기 화상 테스트 연기 (2026-07-06 직원 퇴근)**: 초대 링크 상담방 87710d1d, **2026-07-10 만료** → **2026-07-07(화)~07-09(목) 진행 필요**(만료 시 재발급 가능). 새 반반분할 화면이 이미 배포돼 있어 그 화면으로 검증됨.
- ⏸ **자동 루프 전부 정지 (PO 지시)**: 이 세션 자가점검 예약 비활성 + 「사고·품질 순찰(2시간)」 cron 삭제(타 세션 바인딩이라 정지 불가 → 삭제, 복원 프롬프트는 archive 낮 블록에). **PO가 "루프 다시 켜"라고 하기 전까지 새 루프·자가점검 예약 금지.**
- ⏸ 옛 브랜치 182개 삭제 보류(원격 환경 차단, 서비스 영향 0) / 잔존: 게스트토큰 E2E 스펙 고정 실패 / **PR #514(사업계획서) = 마지막 남은 열린 PR, PO 검토 대기**.

**4. 주의·함정**
- notes 는 이제 **API 경유로만 읽어라** — DB 직접 조회하면 암호문. `[TEST]` 마커 판정은 저장 전 평문이라 동작 불변.
- 상담방 `useIsDesktopViewport`는 iOS 13 이하 폴백(addListener) 포함 — matchMedia 새 API만 쓰면 구형 폰에서 상담방이 죽는다.
- 이 세션 브랜치(claude/work-summary-prep-f1499o)는 PR 4개를 재활용한 뒤 **GitHub Actions 가 PR 이벤트에 검사를 안 붙이는 상태**(다른 브랜치는 정상) — 다음 세션은 새 브랜치로 시작 권장.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 (다기기 테스트 연기로 대기)**: ①2인 반반분할·blur-fill 육안 ②webhook 첫 수신(Vercel 로그 `[livekit/webhook]`/서명 워닝) — 둘 다 첫 실통화 때 확인. **링크 2026-07-10 만료 → 테스트하자고 PO 보채기(보채기는 PO가 요청한 서비스).**
2. 다기기 테스트 결과 판독(실패 기기 = admin_audit_logs CONSULTATION_CLIENT_ERROR).
3. GSC/얀덱스 후속은 아래 "구글 서치콘솔" 블록 5번 참조.

**6. 검증 상태**
- ✅ 2026-07-06 머지 4건(#654·#567·#562·#658) 전부 CI 초록 확인 후 머지, 프로덕션 health ok·핵심 페이지 200 재검증. #658은 PO 실화면 검증까지.
- ✅ notes: DB 실측 평문 0/암호문 7. 열린 PR 실확인(API 조회): #514 하나뿐.
- ⚠️ **검증 못 함**: 2인 레이아웃 육안·webhook 첫 수신(5-1 승격). 핸드오프 PR(#665)은 Actions 미부착으로 CI 없이 머지 — 로컬에서 동일 검사(check:handoff·check:content) 통과가 근거.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 다기기 테스트가 아직이면 링크 만료(2026-07-10) 전에 하자고 PO를 보채고, 끝났으면 결과 판독(CONSULTATION_CLIENT_ERROR) + webhook 첫 수신(Vercel 로그) + 반반분할 육안 피드백 확인해. 자동 루프는 PO 지시로 전부 정지 — "다시 켜" 전까지 만들지 마라. 작업은 새 브랜치로 시작해(이 세션 브랜치는 Actions 미부착 상태).

---

## 🧭 오전 다중세션 통합 정리 (2026-07-01) — 무엇이 배포됐고 / 무엇이 미머지로 남았나

> **왜 이 블록:** 오늘 오전 여러 창(병렬 세션)에서 각자 작업 후 각자 핸드오프 → 배포된 건 main·SoR에 잘 쌓였지만, **끝냈는데 아직 본판에 안 합친(미머지) 작업 3건**이 각 세션 브랜치에만 있고 이 SoR엔 기록이 없었음(=다음 세션이 놓칠 위험). 그 3건을 여기 한 곳에 모아 다음 세션 큐로 승격. (세부 이야기는 아래 오후·오전(2) 핸드오프 + `archive/`에 이미 있음 — 여기선 안 겹치게 '무엇이 남았나'만.)

**✅ 오늘 오전 실서비스(main·프로덕션) 반영 완료** — 다 머지·CI초록:
- **어드민 대청소** #555 (가짜숫자·가짜성공률 제거 / 병원 6곳 활성화 / 매칭 실작동 / 상담취소 실API / AccuracyPanel 실측)
- **병원 페이지** #554 의사사진 자체호스팅(핫링크 제거) + 토글 애니 · #559 신촌 의료진 현행화(27→28명)·실사진 · #565 토글 "밀림" pin 수정
- **콘텐츠 자체호스팅** #551 암종 카드/합병증 이미지(immunehospital 핫링크 제거)
- **비자** #549 체크리스트 계정동기화·러카 누적일수 · #552 PDF 톤 Premium→기본톤 교정
- **환자앱** #544 견적 상세페이지 6개어화(ko/en/ru/kz/zh/ja)
- **KHIDI 지표** #557 만족도 표본부족 env 스위치 · 유치 전환 대시보드 **채널별(유입경로) 분해** (migration 반영)
- **SEO** #547 BreadcrumbList·WebSite SearchAction 구조화데이터
- **디자인/정리** #560·#561 활성 디자인 명칭 'legacy'→'기본 톤' 개명 · #539 죽은 premium 이메일 시스템 삭제

**⚠️ 끝냈지만 미머지 — 다음 세션이 먼저 처리 (브랜치에만 있음, 안 잃게):**
1. **파트너 발굴 아웃리치 추적기** [PR #567 · 브랜치 `work/partner-outreach`] — 코디·어드민 백오피스 신규 기능(카자흐 직원 Assel이 파일 대신 백오피스에서 파트너 영업 추적). **완성 + 프로덕션 DB에 표 `partner_outreach`+시드 6곳 이미 적용.** 남은 것: ①프리뷰에서 화면 클릭 검증(후보추가·상태변경·탭필터·CRUD, 코디+어드민 둘 다) → 이상 없으면 **머지** ②Assel 계정에 코디네이터 권한 부여(`/admin/staff`). (큰 UI라 PO 눈으로 보고 머지하기로 했던 건)
2. **초청장 발급주체 = 등록 유치의료기관(병원) 명의** [PR #562 · 브랜치 `claude/kazakhstan-keta-config-ko4g7b`] — `VisaInvitationLetter.jsx`+`inviterHospitals.ts` 완성, 미머지. (같은 세션의 비자 정정 #535·541·549·552는 이미 머지됨 — #562만 남음.)
3. **이메일 수신률 문서** [PR #545 · 브랜치 `work/email-deliverability`] — `docs/EMAIL_DELIVERABILITY.md`(DMARC·콜드 아웃리치 플레이북). DMARC 감시 켜기·Google Postmaster 등록은 이미 실행(외부 완료). 문서라 CI 초록시 자동머지 대상.
- (추가 열린 검증) #565 토글 "밀림"은 코드·배포 반영됐으나 **실브라우저 스크롤 동작만 미검증**(검증환경 헤드리스라 눈으로 못 봄) — 오전(2) 핸드오프 6번 참조.

**🧹 정리해도 되는 브랜치(작업 이미 main에 반영 = squash 머지됨, 지워도 안전):** `claude/handoff-2026-07-01-am`·`handoff/admin-cleanup-0701`·`work/admin-backoffice`·`work/hospitals-roster-refresh`·`work/hospitals-toggle-ui`·`work/hospital-toggle-scroll-fix`·`claude/rescue-548-doctor-selfhost`·`claude/seo-audit-improvements`·`claude/inspiring-williamson-56fbfc`·`claude/patient-detail-i18n`·`claude/satisfaction-min-n-env`·`claude/fix-all-errors-sweep`·`claude/khidi-conversion-source-breakdown`·`claude/handoff-cancer-img-selfhost`. **남겨둘 것(미머지 작업 있음):** `work/partner-outreach`·`claude/kazakhstan-keta-config-ko4g7b`·`work/email-deliverability`.

---

## 🏷️ 서비스명 변경 — HEALO → **healwith** (2026-06-16 확정·적용)

**상표 문제로 서비스명을 `HEALO` → `healwith`(항상 소문자 표기)로 최종 변경. 앞으로 모든 신규 작업은 `healwith`로 한다.**

- **표기 규칙**: 화면·문서 어디서나 **소문자 `healwith`** (문장 첫머리도 소문자). 로고는 투톤(heal=teal-600 / with=slate).
- **이번에 바꾼 것 (화면에 보이는 것)**: app/src/components 의 브랜드 텍스트·i18n 6개 언어 문자열·메타데이터·이메일 발신자명·PDF/견적/초청장 문서번호 접두사·헤더 워드마크·favicon(`h`)·manifest. (`HEALO`→`healwith` 약 1,144곳)
- **일부러 안 바꾼 것 (그대로 둠 — 건들면 깨지거나 기록보존)**:
  - `HEALO-KHIDI` (코드 내부 프로젝트 코드명, 20곳), `HEALO_EMAIL_FROM` (환경변수명)
  - `healo-khidi` (Vercel 프로젝트명·배포 URL·repo = 인프라), `components/healo/` (폴더 경로), 소문자 `healo`(예시 비번 `healo1234`·placeholder 이메일·기존 `healo.kr` URL)
  - **docs 내부 개발 히스토리 문서**: 과거 기록이라 본문 유지 (이 핸드오프 노트로 변경 사실만 명시).
- **아직 남음 (TODO)**:
  - **PNG 앱아이콘 재생성**: `public/icons/icon-*.png`·`apple-touch-icon.png`·`favicon-16/32.png` 가 옛 `H` 마크. 래스터라이저(rsvg/sharp) 환경에서 새 `favicon.svg`(소문자 h)로 재생성 필요.
  - **도메인**: `healwith.co.kr` 등록 예정(후이즈) → 등록 후 `healo.kr`/`khidi.healo.kr` 구조화데이터 URL·OG·canonical 교체 + Vercel 도메인 연결.
  - **상표 출원**(Madrid) 별도 트랙.
  - Vercel 프로젝트명/배포 URL 변경은 인프라 마이그레이션이라 보류(현 `healo-khidi.vercel.app` 유지).
- 계획·범위 상세: `docs/REBRAND_HEALWITH_PLAN.md`.

---

## 1. 이 서비스가 뭔가 (피벗 후)
- **KHIDI HEALO** = 카자흐스탄·러시아·CIS **암환자**를 한국 **종양 병원**으로 연결하는 의료관광 컨시어지.
- **중요한 피벗**: 예전엔 "한국 전체 병원 디렉토리(크롤링)"였으나 → **암환자 컨시어지**로 전환. 디렉토리 시절 잔재(대량 import·크롤링 등)는 "레거시"로 분리.
- 자금: KHIDI 정부지원과제 + Bonroi 개인사업자. PO 혼자 운영.

## 2. 핵심 전략 결정 (왜)
- **"병원 매칭 마켓플레이스" 아님 → "연속 케어 컨시어지"**: 제휴 병원이 면력한방병원 3곳(진단·면역·재활, 수술 X) + 협진 대학병원 4곳(수술·항암)뿐. 100개 중 1개 고르는 게 아니라 **진단→수술 연계→면역·재활을 쭉 잇는** 모델. 그래서 홈·AI챗·치료여정의 "매칭" 표현을 "케어 경로/상담 배정"으로 톤다운함. (`/care-journey` 페이지가 이 스토리)
- **매칭 엔진 코드는 보존**하되 환자 전면엔 안 붙임 (미래 확장용).

## 3. 디자인 (DESIGN.md 가 헌법)
- **"기본 톤"만 표준** (Airbnb 스타일: 흰 배경·teal-600·시스템폰트·rounded-xl). ※ 예전 "legacy 모드"를 **2026-07-01에 "기본 톤"으로 개명** — "legacy(옛날꺼)"라는 이름이 "premium으로 올려야지"라는 정반대 오해를 반복 유발해서. 이제 디자인은 하나뿐, 모드 토글 없음.
- **Premium 톤 폐기**: 검은배경·금색·serif·필름그레인 = "럭셔리 호텔" 느낌이라 PO·대표가 거부. 정부과제 성격과 안 맞음. **되살리기·재활용 금지 — 폐기된 옛 실험이지 업그레이드 아님.**
- PO가 가장 싫어하는 것: **"AI가 만든 느낌"** (큰 컬러원+큰아이콘, 똑같은 카드 반복, 이모지 도배, 의미없는 영문카피).
- 공개 페이지(/treatments·상세·/telemedicine·/faq·/hospitals/immune·404·500) 전부 기본 톤으로 재구성 완료. 옛 premium은 `*Premium.jsx` 잔재로만 존재(비활성, import 금지).

## 4. 주요 기능 현황 (라우트는 CLAUDE.md 참조)
- **통합 문의 퍼널 `/inquiry`**: 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 통합(redirect). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널 — **실제 동작(2026-07-02 실측 정정): WhatsApp만 라이브(코드 폴백 wa.me, #73), 나머지 3채널은 env(`NEXT_PUBLIC_MESSENGER_*_URL`) 미설정이라 카드 자체가 숨김 처리**("준비 중" 표시 아님 — 미완성 인상 안 줌, 1채널뿐이면 picker 생략 직행).
- **원격협진(LiveKit 영상)**: 코디가 `/admin/consultations`에서 상담 생성(문의에서 환자 선택+의사/코디 드롭다운) → 게스트 초대 링크 → `/consultation/[id]` 영상. LiveKit 키는 Vercel에 설정됨(작동). 예약시각 KST 입력·KST+UTC 병기.
- **회원관리**: `/admin/staff`(의사·코디 — 역할부여·임시비번·소프트 비활성), `/admin/users`(환자 — 상담이력·소프트 ban). 계정은 어드민에서 생성(이메일 형식이면 가짜 `doc1@healo.local` 도 가능, 메일 수신 불필요).
- **어드민 메뉴**: 운영현황 / 환자여정 / 제휴자원·RAG / AI품질·시스템 / 레거시도구 (피벗 반영 재편).
- 보안: inquiries/chat_threads/consultation_sessions 는 **service_role 전용 RLS + PII 암호화** → 반드시 서버 API 경유.

## 5. 지금 막혀있거나 PO 결정 대기
- **서비스명 변경**: HEALO 상표권 문제 → 새 이름 정해야 함(미정). 정하면 도메인 등록 + Madrid 출원.
- **메신저 URL 4개**: Vercel env(`NEXT_PUBLIC_MESSENGER_*_URL`)에 넣어야 채널 활성. Telegram 봇·WhatsApp 비즈니스는 PO가 가입.
- **병원 사진 전체**: 주워온 이미지(immunehospital 배너·시술컷, unsplash, 세브란스 위키미디어) **전부 제거** → "이미지 준비 중" 플레이스홀더(`_coming-soon.svg`)로 대체. PO가 직접 제공하는 실사진만 적용 원칙. **성동만 PO 제공 항공샷 적용됨**(`immunehospital-seongdong/1.jpg`).
  - **폴더 규칙**: `public/images/hospitals/<slug>/1~5.jpg` (1=메인 썸네일, 2~5=서브 갤러리). 상세페이지 그리드가 메인1+서브4 자동 정렬. 폴더 8개 생성됨(README.md 참조).
  - **연결 위치**: 마곡·신촌·광명·이대서울·이대목동·고려대구로·세브란스 = **DB**(hospitals 테이블 thumbnail_image/gallery_images/images) / 성동 = **정적**(partnerHospitals.js). PO가 폴더에 사진 넣으면 → DB(SQL) 또는 정적 코드에서 해당 경로로 연결해야 반영됨.
  - 면력 의료진 헤드샷·`/hospitals/immune` 전용 페이지(Photos.js)는 immunehospital.com 공식 사용권 이미지라 미변경(PO가 원하면 교체).
- **고려대구로 "수술 성공률"** 문구: 출처 불명이라 톤다운 유지 중.

## 6. 다음 작업 (KNOWN_ISSUES.md 참조)
- **P1 — portal 데이터 서버 API 이관**: coordinator/inbox·patient/messages·coordinator/messages·알림뱃지가 service_role 테이블을 client로 직접 조회 → 빈 데이터. 단 portal 미활성(메뉴 미연결·코디계정 없음)이라 손님 영향 없음. portal 본격 활성화 직전 일괄 수정 권장.
- **환자 여정 통합 뷰**: ✅ 1단계 완료 — 문의 폼 이메일 필수화(전화 선택) → `/admin/users` 환자 상세에 "과거 문의"를 **이메일로 매칭**해 표시(가입 전 게스트 문의↔계정 통합). 동일인 식별 키 = **이메일**(PO 결정). inquiries.email은 AES암호화(IV랜덤)라 복호화 후 비교(파일럿 규모; 대량화 시 이메일 해시 컬럼 권장). 다음: 상담·견적·비자까지 한 타임라인으로 확장 가능.
- 의사/코디 portal, 비자·견적 admin 감독 뷰(읽기전용 미러) 등.

## 6-1. 공신력 데이터 인용 (콘텐츠 신뢰·SEO)
- **인용 중인 통계**: 한국 암 5년 생존율 **72.9%**(2018–2022, 국립암센터 국가암등록통계) / 2024 외국인환자 **117만명**(KHIDI) / 러시아 누적 16,622·카자흐 14,475명(KHIDI 2009–2024).
- **사용 위치**: `/care-journey`("숫자로 보는 한국 암치료" 섹션, 6개 언어), `/ru/for-russian-patients`·`/kk/for-kazakh-patients`(통계 밴드). 모두 출처 각주 표기.
- **주의**: 한방=암 "치료/완치" 근거로 쓰지 말 것. 통합종양학 문헌은 "보조·삶의질·부작용 관리" 프레임으로만. 통계는 매년 신규 발표 시 갱신.

## 6-1-b. 심층 리서치 결과 (2026-06-11) — `docs/archive/DEEP_RESEARCH_2026_06_11.md` 필독
- **법**: 의료해외진출법 개정(2026.5.26 공포, ~2027.5 시행) — 외국인환자 비대면진료 합법화. 단 진료 주체=유치의료기관 소속 의사 (HEALO는 플랫폼/유치업자 역할로 구조 명확화). 유치업자 등록 확인 + 변호사 자문 + KHIDI 지원시스템 위탁 문의 필요.
- **즉시 5건**: Gemini spend cap 설정 / 모델 별칭 핀(5배 비용 폭탄 방지) / 유치업자 등록 확인 / AI챗 국외이전 고지 / Vercel Pro 전환.
- **카자흐어 통역 해결책 확정**: Gemini 3.5 Live Translate 카자흐 지원 확인 (백업: Gladia). PoC 대기.
- **결제 원칙**: 러시아 직접 결제 불가 → 병원 직접청구 + 카자흐 허브.
- **데드라인**: Supabase 구형 API 키 마이그레이션 (2026년 말 키 제거).
- Supabase 리전 = 서울 확정 (국외이전 부담 최소).

## 6-2. 트렌드 스캔 루틴 (`/trend`)
- PO가 아무 세션에서 **`/trend`** 입력 → 최근 신뢰도 높은 기술·시장 소식 중 HEALO 적용 가능한 "보석"만 선별 보고 (`.claude/commands/trend.md`에 기준 정의). 주 1회 권장. 적용은 PO 승인 후에만.
- 후보 메모: **Gemini 3.5 Live Translate** (2026-06-09 발표) — LiveKit 공식 연동, 분당 $0.023, 음성+자막 동시. 카자흐어 지원 확인 + PoC 1~2일 후 도입 판단 (Gemini 유료 전환·토큰 방어와 묶어서).

## 7. 일하는 방식 (반드시)
- 출시 전 **self-QA**(CLAUDE.md): "빌드 통과 ≠ 동작". DB 기능은 RLS·암호화·데이터흐름 직접 검증. 검증 못 한 건 솔직히 말함.
- 빌드: `npx next build --webpack` (Turbopack 금지). main 푸시 = Vercel 자동 배포.
- 큰 변경은 계획 먼저 보여주고 승인받기. "겸사겸사" 다른 거 건들지 말기.
