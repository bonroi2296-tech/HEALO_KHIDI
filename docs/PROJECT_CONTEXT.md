# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-29 — 교육 자료 → "암 치료 가이드" 콘텐츠·디자인 품질 개선 + 면력한방병원 통합면역 케어 추가 → PR #467 머지·배포)

> PO "교육 자료 세부 콘텐츠 개선해봐. 이미지도 맘에 안 들고, 면력한방병원 홈페이지 참고하라 했는데 전체 퀄리티가 너무 낮다. 타이틀도 '교육 자료'는 부적합" → 개선 방향(타이틀·이미지) 버튼으로 2개만 확인 후 전면 개선. 이후 PO "객관적 전문가 시점 전수조사 다시해서 이상 없으면 머지하고 핸드오프해" → 독립 리뷰 에이전트로 6언어 전수검토 → 발견 이슈 수정 → CI 초록 확인 후 **squash 머지(8df5899)·배포 완료**.

**1. 이번 세션 한 일 (PR [#467](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/467) squash 머지·프로덕션 배포)**
- **타이틀 통일** — 제각각이던 라벨('교육 자료'/'건강 교육'/'Education')을 **"암 치료 가이드"**(en Cancer Guide·ru Гид по лечению·zh 癌症治疗指南·ja がん治療ガイド·kz Емдеу нұсқаулығы)로 6개 언어 통일. `i18n nav.education`·`app/patient/layout.jsx`·`PatientDashboardClient.jsx`·`app/education/page.jsx`(메타).
- **이미지** — 섹션마다 무관·따로 노는 랜덤 Unsplash 스톡(분홍 청진기 하트·산책 커플·일출 등)을 **섹션 유형(진료/식이/운동/심리)별 큐레이션 이미지**(`SECTION_IMAGE` Map, lucide 아이콘 키)로 교체. 경고·통합면역 섹션은 콜아웃이 주인공 → 이미지 없음.
- **콘텐츠 구조화** — 한 덩어리 `whitespace-pre-line` 텍스트를 파서(`StructuredBody`/`BodyLine`/`Callout`)로 **소제목·teal 불릿·🔴긴급/🟡주의 컬러 콜아웃 박스**로 렌더. 의학 텍스트는 보존, 표현만 정돈.
- **면력한방병원 통합면역 케어 섹션** — 전 암종에 공통 추가(`INTEGRATIVE_SECTION`을 `Object.values(GUIDES).forEach`로 1회씩 push). HEALO 양·한방 협진(수술·항암=암 병원 / 면역·체력=면력한방병원 통합암치료팀) 반영. 의료광고법 안전: "표준치료 대체 아님·미검증치료로 표준치료 지연 금지·병행 전 의료진 상담" 🟡 콜아웃 명시.

**2. 왜 그렇게 했는지**
- **타이틀·이미지만 버튼으로 물음**: 나머지(구조화·면력 섹션 추가)는 명백히 개선이라 PO 결정 불필요. 갈리는 취향(이름·이미지 방향)만 `AskUserQuestion` 버튼(평문질문 금지 규칙). PO 선택 = "암 치료 가이드" + "사진 교체+구조화 둘 다".
- **이미지 유형별 통일(암종별 차별화 X)**: DESIGN.md 정합성(coherence) 우선 — 한 화면 안에선 유형별로 다르고, 암종 간엔 일관. 외부 깨짐 위험 줄이려 기존 검증된 Unsplash ID 재사용. (변경 데이터엔 옛 `image`/`imageAlt` 필드가 dead로 남음 — 무해, 정리는 후속.)
- **브랜드 표기 "면력한방병원"**: 오타로 보이지만 코드 전반(HomeClient·immuneHospitalDoctors·i18n SEO)이 일관되게 "면력"(영문 Immune Hospital·中 免疫医院·日 免疫病院)을 써서 **그대로 맞춤**(일관성 우선, 표기 수정은 별도 결정사항).
- **전수조사 = 독립 에이전트**: PO "전문가 시점 전수조사"에 자기검토 대신 별도 리뷰 에이전트로 6언어×156개 본문 추적(객관성).

**3. 안 끝났거나 보류**
- **dead 데이터 정리(LOW)** — 섹션 객체의 옛 `image`/`imageAlt` 필드(약 30개)가 이제 안 쓰임(렌더는 `SECTION_IMAGE` Map 사용). 무해하나 오해 소지 → 후속 청소 가능.
- **암종별 이미지 차별화(PO 선택지)** — 현재 유형별 통일. PO가 "암종마다 다른 사진" 원하면 재작업 가능(단 랜덤 스톡 회귀 주의).
- **이미지 자체 품질** — 여전히 Unsplash 무료 사진. 면력한방병원 실제 사진/자체 일러스트로 교체하면 더 좋음(PO 자산 있으면).

**4. 주의·함정**
- **파서는 마커 의존** — body 텍스트의 `\n\n` 블록·`• ` 불릿·`🔴/🟡` 경고·콜론(ASCII `:` + 전각 `：` 둘 다) 패턴에 의존. 콘텐츠 편집 시 이 마커 유지해야 구조화가 먹음. 특히 **zh·ja는 전각 콜론 `：`** 씀(이번에 처리). 경고 블록 안 비-불릿 줄도 이제 보존(유실 안 됨).
- **이모지 정규식 함정(이번에 CI가 잡음)** — 이모지를 정규식 문자클래스 `[🔴🟡]`에 넣으면 `no-misleading-character-class` ESLint 에러(surrogate pair). → 교체그룹 `(?:🔴|🟡)/u`로. `next build`는 통과해도 `eslint`(CI)는 막음 — **빌드≠린트** 기억.
- **체크 게이트 2종** — 이 repo CI는 `get_status`(Vercel)와 별개로 GitHub Actions check-run `ci`·`Smoke Tests (PR)`가 있음. 머지 게이트는 **둘 다(checks API)** 확인해야 함(status API만 보면 ci 실패를 놓침).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저(실클릭 필요)**: `/education` 프로덕션에서 **실제 렌더 확인** — ①암종 5개 전환 ②각 섹션 펼침 시 큐레이션 이미지·구조화(소제목/불릿/콜아웃) 정상 ③통합면역 섹션 6개 언어(특히 zh·ja 전각 콜론 볼드, ru 카피) ④모바일. (배포는 됐으나 직접 클릭 검증은 못 함.)
2. (이월) #449·#453 실검증 후 머지 결정 / 머지된 감사수정 실동작 — 직전 핸드오프(아래 심야 블록) 참고.
3. (이월) 출시 PO 콘솔 관문(`LAUNCH_GATES_PO.md`)·#422·#424 법무 PR·playbook 적재.

**6. 검증 상태**
- ✅ **PR #467 squash 머지·배포** — `ci`·`Smoke Tests (PR)`·`Vercel` 전부 success 확인 후 머지(E2E는 메인전용 skip). `next build --webpack` exit 0·`npm run check:content` 통과·`eslint . --quiet` 에러 0.
- ✅ **독립 전문가 리뷰**(별도 에이전트, 6언어 156개 본문 추적): 파서 정확성·통합면역 append·이미지 Map·i18n 패리티·의료광고법·접근성 = 머지 차단 이슈 0. 발견된 MED-1(콜아웃 이모지 DESIGN.md 위반)+LOW 3건 수정 반영.
- ❌ **검증 못 함(솔직히)**: **배포된 실화면을 직접 클릭/조회 안 함** — 프리뷰 URL은 Ready였으나 렌더 결과 육안 확인 미실시. → 5번 1순위로 승격.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 교육 자료를 "암 치료 가이드"로 품질 개선해서 머지·배포했어(#467: 타이틀 6언어 통일·유형별 큐레이션 이미지·소제목/불릿/경고콜아웃 구조화·면력한방병원 통합면역 케어 섹션). **근데 배포된 실화면을 직접 클릭 확인 못 했으니** /education 프로덕션에서 암종5개 전환·섹션 펼침 이미지·구조화·통합면역 6개 언어(zh·ja 전각콜론 볼드, ru 카피)·모바일을 눈으로 확인해줘. 이상 있으면 고치고, 없으면 다음으로 — 직전 심야 핸드오프의 미검증분(#449·#453 실검증)과 출시 관문(LAUNCH_GATES_PO.md)으로.

## 🔖 세션 핸드오프 (2026-06-29 밤(2) — 오픈 전 최종 전수조사: AI 위험답변 송출차단·환자화면 6개어·옛도메인 잔재·약한비번 교체 → PR #463)

> PO "정식 오픈 전 추가 고도화할 부분 없는지 최종 전수조사 해봐"로 시작. 5축(보안·i18n·데이터/RLS·AI/RAG·위생) **병렬 서브에이전트 감사 + 실DB(Supabase MCP) 점검**. **런치 막는 보안 구멍 0**(뼈대 견고) 확인 후, 나온 개선점을 PR [#463](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/463)(작업본 `claude/pre-launch-service-review-df30bx`)에 모음. PO 지시로 코드 거의 전부 수리 + 약한비번 실DB 교체.

**1. 이번 세션 한 일** (전부 PR #463, 미머지)
- **🔴 AI 위험답변 송출 차단**: 결정적 레드라인 가드 `scanRedlines`(완치·약물·예후 단정)가 그동안 `judge.ts`(비동기)·벤치에서만 호출돼 **위험문구가 환자에게 나간 뒤 점수만** 매겨졌음. 라이브 경로에 게이트 연결 — 비스트리밍 `generateChatReply`=critical 시 안전 대체문구로 통째 교체(노출 0)+`redlineBlocked` 플래그 / 스트리밍 `stream/route.ts`=정정 안내 append + **코디 종 즉시 호출**(비동기 judge 의존 탈피) + `redline`·`needs_doctor_review` 기록. `safetyGuard.ts`에 `safeDeferralMessage`·`redlineCorrectionNotice` 6개어 추가. triage 출력도 같은 경로라 함께 스캔됨.
- **🔴 triage(1차소견) PII 마스킹**: `triage.ts` `messageText`에 `redactModelPii` 적용(채팅 경로와 동등). 첨부 파일 자체는 판독에 필요해 불가피.
- **🔴 환자화면 6개어**: `/patient/consultations`·`/patient/cost-estimates` 한국어 하드코딩 → page-local 6개어 COPY(ko·en·ru·kz·zh·ja). 환자 alert 6곳·에러표시 3곳의 raw `err.message` 노출 제거+6개어화(`_err` 처리).
- **🟡 옛 도메인 잔재(POSTMORTEMS #49)**: `healo-khidi.vercel.app`·`khidi.healo.kr` → `healwith.co.kr`(메일 푸터 `src/emails/shared.jsx`·survey·cron·`.env.example`). dev/내부 페이지(`email/preview`·`design-preview`·`dev/cancer-preview`) prod 가드. `ClientShell`·`LoginClient` console.log 이메일 제거. **가드 추가**: `check-content`에 옛도메인 금지룰, `check-env`에 `NEXT_PUBLIC_SITE_URL` 검증.
- **🟢 하드닝**: admin import 라우트 `error.message` → 코드형+서버로그. `translate-text` `maxOutputTokens` 추가.
- **🔴 약한비번 교체(코드 아님, 실DB)**: 7개 `@test.com` 비번 `test1234` → **`Healwith2026!`**(bcrypt, `admin@test.com` 포함). 오픈 관문 6 거의 닫힘.
- **문서**: POSTMORTEMS #49(옛도메인)·#50(AI 가드) 추가. KNOWN_ISSUES에 후속과제. LAUNCH_GATES_PO 관문6 갱신.

**2. 왜 그렇게 했는지**
- **스트리밍은 원시 텍스트 append라 "이미 보낸 토큰 취소 불가"** → 차단(비스트림)+정정·즉시 에스컬레이션(스트림)으로 비대칭 설계가 최선.
- **환자화면은 page-local COPY 패턴**(`_roomCopy.js`·`LoginClient` 선례) 사용 — 중앙 i18n 사전 안 건드림(병렬세션 충돌·패리티 머신 회피).
- **약한비번은 PO가 값 지정**(`Healwith2026!`) — 삭제/비활성 대신 강한비번으로 두면 E2E 자동검사 유지 + 노출 제거.
- **RAG ingest taskType·테스트데이터 삭제는 보류** — 전자는 전체 재적재 동반(반쪽=불일치), 후자는 비가역(데이터 삭제)이라 PO 확인 영역.

**3. 안 끝났거나 보류**
- **PR #463 미머지** — CI 초록(아래 6번). PO 지시 "CI 초록면 머지". 머지 시 draft→ready 전환 필요.
- **환자 상세페이지 광범위 한국어** — `/patient/cost-estimates/[id]`·`/patient/visa/applications`(목록·상세) 전체 한국어. 이번엔 목록 2페이지만 6개어 + 상세는 err.message 누수만 닫음. 본문 6개어화 후속(KNOWN_ISSUES).
- **RAG ingest taskType / `rag_chunks_used=0` 경보 / cron 비상수시간 / Auth 유출비번보호 / 테스트문의·국적값 정리** — 전부 KNOWN_ISSUES에 기록.

**4. 주의·함정**
- **이 세션은 작업본(브랜치)에서 작업** → 핸드오프도 브랜치에 커밋됨. main 반영은 PR #463 머지 시. **다른 병렬 세션이 같은 PROJECT_CONTEXT 최상단을 건드렸으면 머지 시 충돌** → 양쪽 블록 보존으로 풀 것(PO 취향 2026-06-20과 동일).
- **node_modules 증발 주의**: 이 컨테이너에서 빌드 중 `@sentry/nextjs` 등 의존성이 사라져 빌드 깨짐 → `npm install`로 복구함(환경 이슈, 코드 무관).
- **lint 함정**: alert에서 `err.message` 제거 시 `catch(err)`가 미사용이 돼 eslint `no-unused-vars` **error**로 CI 빨강 → `_err`로 교정해야 함(이미 처리). CI는 eslint error로 머지 차단됨.
- **PR 활동 구독 중**: 웹훅이 CI 실패·코멘트는 주지만 **CI 성공·머지가능은 안 줌** → 매시 :17 자가체크인 cron(세션 한정)으로 재확인·머지하도록 걸어둠.

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저(머지·배포 후 실서비스 클릭):** ①AI 챗에서 위험문구 유도 시 **송출 차단/정정안내+코디 종** 실제 동작 ②`/patient/consultations`·`/patient/cost-estimates`를 **ru/kz로 보면 그 언어로** 렌더 ③자료 업로드 시 triage가 messageText PII 마스킹 ④거래메일 푸터 링크가 healwith.co.kr.
2. **PR #463 머지** — CI 초록이면 draft 해제 후 머지(PO 지시). 머지 후 `git fetch origin main` + 브랜치 재기준.
3. **PO 콘솔 관문**(`LAUNCH_GATES_PO.md`): 🔴Gemini 유료(PO "나중에") · E2E GitHub Secret 비번을 `Healwith2026!`로 갱신 · 인증메일 token_hash · 구글 OAuth 게시 · 텔레그램 토큰 · Auth 유출비번보호 · 테스트문의 #26~31 정리.
4. (여력) 환자 상세페이지 6개어 · RAG taskType+재적재 · `rag_chunks_used=0` 경보(KNOWN_ISSUES).

**6. 검증 상태**
- ✅ **CI(PR #463, 커밋 00d2a23) 초록**: `ci`·`Smoke Tests (PR)` 둘 다 **success**(GitHub check_runs 실확인), E2E 크론은 PR이라 skip(정상), Vercel 프리뷰 Ready.
- ✅ 로컬: `next build --webpack` 통과 · `vitest` **406/406** · `check:content`·`i18n`(ru/kz 100%)·`schema-refs`·`migrations`·`legal` 통과 · `eslint .` **0 errors**.
- ✅ 실DB(Supabase MCP): 약한비번 7개 `Healwith2026!` 교체·검증 / RAG 13문서·18청크·임베딩 누락 0 / RLS 67테이블 전부 on.
- ❌ **검증 못 함(실서비스 클릭 필요)**: AI 송출차단·정정안내 라이브 동작 / 환자화면 ru·kz 실렌더 / triage PII 마스킹 end-to-end / 메일 링크 실수신 — 로그인·브라우저·실메일 필요해 자동검증 불가(5번 1항에서 갚을 것).

**7. 다음 세션 첫 프롬프트**
> 먼저 `docs/PROJECT_CONTEXT.md` 최상단(2026-06-29 밤(2) 전수조사 블록) 읽어. 오픈 전 전수조사로 **AI 위험답변 송출차단·환자화면 6개어·옛도메인 잔재·약한비번 교체**를 PR #463에 모았고 CI 초록이야. 먼저 **실서비스에서 검증**해줘: ①AI 챗 위험문구 유도 시 송출차단/정정안내+코디 종 ②`/patient/consultations`·`/patient/cost-estimates`를 ru/kz로 보면 그 언어 렌더 ③자료 업로드 시 triage PII 마스킹 ④메일 푸터 링크 healwith.co.kr. 그담 PR #463 머지(CI 초록이면 draft 해제 후) + PO 콘솔 관문(Gemini 유료·E2E 시크릿 비번 Healwith2026!로 갱신·인증메일 token_hash 등) 같이 닫자.

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
- **Legacy 톤만 표준** (Airbnb 스타일: 흰 배경·teal-600·시스템폰트·rounded-xl).
- **Premium 톤 폐기**: 검은배경·금색·serif·필름그레인 = "럭셔리 호텔" 느낌이라 PO·대표가 거부. 정부과제 성격과 안 맞음.
- PO가 가장 싫어하는 것: **"AI가 만든 느낌"** (큰 컬러원+큰아이콘, 똑같은 카드 반복, 이모지 도배, 의미없는 영문카피).
- 공개 페이지(/treatments·상세·/telemedicine·/faq·/hospitals/immune·404·500) 전부 Legacy로 재구성 완료. Premium은 `*Premium.jsx` 폴백으로만 존재(기본 비활성).

## 4. 주요 기능 현황 (라우트는 CLAUDE.md 참조)
- **통합 문의 퍼널 `/inquiry`**: 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 통합(redirect). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널 (env URL 미설정이라 현재 "준비 중" 표시).
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

## 6-1-b. 심층 리서치 결과 (2026-06-11) — `docs/DEEP_RESEARCH_2026_06_11.md` 필독
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
