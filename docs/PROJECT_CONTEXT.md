# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-29 심야 — 핸드오프 인수 → 열린작업 전수조사 → 퍼널 5개 심층감사 → 출시 블로커 6개 수정·머지)

> "핸드오프 분석하고 이어가자"로 시작 → 작은 가드(RAG헬스)부터 열린 PR 정리, 중단된 작업(#406·#408) 되살리기, **그리고 PO "완벽해? 오픈 확정?"에 안심 대신 퍼널 전수 심층감사로 답함**(병렬 에이전트 5 + 실DB + 보안린트). 감사로 **진짜 법적·보안 블로커 6개**를 찾아 수정·머지. PO 지시 "니가 판단해서 머지할 건 머지, 애매한 건 인수인계" → 안전한 건 머지, auth/PII 미검증 2건은 보류.

**1. 이번 세션 한 일 (전부 main 머지·프로덕션 배포, 별도 표기 없으면)**
- **RAG 실사용 가드** [#441] — 매일 prod 스모크(`scripts/smoke-chat.mjs` TEST C)에 지식질문→`rag_chunks_used>0` 검증. RAG 또 죽으면 다음날 CI 빨강(POSTMORTEMS #48 재발방지).
- **문서 정리** [#443] — 누락됐던 POSTMORTEMS #33(REVOKE PUBLIC) 복원 + stale PR #353 닫음. [#448] — `LAUNCH_GATES_PO.md`에 출시 관문 11개로 통합(Gemini결제·텔레그램·약한비번·구글OAuth·DPA·법무PR) + KNOWN_ISSUES stale(iOS마이크 #269 등) 해결표시.
- **중단 작업 2개 되살림** — [#445]=#408 벤치 고급판(맞대결·48문항·사람검수), [#446]=#406 구글가입자 비번찾기 안내 + 코디 AI대화 검토큐(#431 검수버튼과 충돌 병합). 둘 다 옛 main 기반이라 최신에 rebase·빌드검증 후 머지.
- **퍼널 전수 심층감사** — 문의·AI챗·가입·상담·백오피스 5개를 코드+실DB+보안advisor로 추적. 점수: 문의68·가입62·AI챗76·상담78·코디72·에이전시92·병원78·견적92.
- **감사 블로커 6개 수정** (작은 PR로 쪼갬):
  - [#452] 🔴법무 — ①문의 Step2가 Step1 PIPA동의기록을 덮어써 삭제(merge로 보존) ②AI리드 승격이 동의없이 적재(thread.metadata.consent를 intake.consents로 복사). `step2/route.ts`·`publicChatHelpers.ts`.
  - [#453] 🔴보안 — 비활성(소프트삭제) 직원/어드민이 인증에서 안 막혀 그대로 로그인·PII복호화 가능하던 것 → `checkAdminAuth`에 `disabled===true` 차단(fail-safe).
  - [#454] 🔴버그 — 중국어(zh) 환자 상담 생성 400(언어 화이트리스트 zh 누락) + error.message 누출 3곳(create·partner/whoami·chat/message) 코드형 + 코디 대시보드 죽은링크(/patients→/cases)·긴급알림 항상0(followup GET을 staff 허용).
  - [#456] 🔴컴플라이언스 — 환자 PII 열람 감사로그 누락(코디 인박스 상세·병원 임상패킷)에 `VIEW_INQUIRY`/`PARTNER_VIEW_CASES` 추가.

**2. 왜 그렇게 했는지**
- **"완벽해?/오픈 확정?" = 안심 금지 신호**(PO취향) → 실측 감사로 답. 페이지가 200 뜨는 것과 퍼널이 끝까지 도는 건 다름 → 감사가 법적(동의 소실)·보안(비활성 무력)·버그(zh) 블로커를 실제로 잡음.
- **머지 판단 기준**(PO "니가 판단"): 데이터 보존만/추가형/명백한 버그 + CI초록 = 머지. **auth 동작 변경·PII 새 노출이라 실로그인 검증이 필요한 건 보류**(#453은 잠금위험 낮아 머지, #449는 PII+페이지 런타임 미확인이라 보류).
- **작은 PR로 쪼갬**: 법무/보안/버그/컴플라이언스 각각 독립 — 리뷰·롤백 쉽게. 각 PR build·CI 초록 후 머지.
- **클라우드 컨테이너 = 세션별 격리**: PO "워크트리 따로"의 의도(다른 세션과 안 엉키게)는 이 환경에선 전용 브랜치로 충족(파일시스템 공유 안 함, git/PR레벨만 만남).

**3. 안 끝났거나 보류 (= 애매해서 인수인계에 남긴 것)**
- **[#449] 코디네이터 AI 챗 뷰 (열림·draft)** — `/coordinator/chat` 읽기전용 + admin chat API GET을 staff로 넓힘. 빌드 통과지만 **코디 계정 실로그인 런타임 미검증 + 환자 PII를 새 role에 노출**이라 보류. PO가 프리뷰(`healo-khidi-git-feat-coordinator-chat-view-...vercel.app/coordinator/chat`)에서 ①네비 'AI 상담 리드' ②목록·대화·첨부 열람 ③검수버튼 안 보임 확인 후 "머지해" 하면 머지.
- **[#422] 처리방침 GDPR 보강·[#424] HIPAA/GDPR점검+계약서 (열림)** — 라이브 법무문서 → PO 법무검토 결정. 자동으로 안 건드림.
- **감사 잔여(코드)**: ①AI챗 playbook 데이터 0건 → "3-Tier RAG"가 실제론 1소스(병원/치료 en)만 가동(playbook_pattern 적재 필요) ②병원 임상패킷 GET의 viewer role 게이팅(viewer 권한 의미=PO 결정) ③`normalized_inquiries` draft가 6·9턴마다 중복 insert ④AI 승격건 nationality NULL→"(미상)".

**4. 주의·함정**
- **#453 비활성차단은 staff(coordinator/admin = `app_metadata.disabled`)만** — 에이전시/병원은 별도 is_active 메커니즘이라 미적용(후속). fail-safe라 명시적 `true`만 차단(정상계정 잠금 위험 0).
- **동의 수정(#452)·zh상담·코디대시보드(#454)는 빌드·로직만 검증, 실데이터/실런타임 미검증** — 머지 후 실문의/실상담 1건으로 확인 권장.
- **AI→유치 전환은 프로덕션에서 아직 0건** — 코드 정상이나 머지 후 실 3턴+ 대화가 없어 `source='ai_agent'` 행 0(실DB 확인). KHIDI 대시보드 집계 실검증은 실대화 필요.
- **출시 PO 콘솔 관문 = `docs/LAUNCH_GATES_PO.md`** 단일 체크리스트(11개). 코드로 못 닫는 것(약한비번 admin 삭제·Gemini 유료결제·구글 OAuth 게시·실메일).
- 보안 advisor(실 prod): RAG RPC가 anon/authenticated EXECUTE 가능(서버는 service_role만 씀 — #33류, EXECUTE 회수 권장) / 유출비번 차단 off(PO 토글) — 둘 다 🟡, 이번에 안 건드림.

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저(실로그인·실런타임 필요)**: ①**#449·#453 실검증 후 머지 결정** — 코디 계정으로 #449 프리뷰 확인 / staff 1명 비활성→로그인 막히는지(#453). ②머지된 감사수정 실동작 — 문의 Step2 후 `intake.consents` 보존·중국어 상담 생성·코디 대시보드 긴급알림 뜸·PII 열람 시 `admin_audit_logs` 기록·비활성 계정 차단.
2. **PO 콘솔 관문**(`LAUNCH_GATES_PO.md`): 약한비번 admin 삭제·Gemini 유료결제·구글 OAuth 게시·실메일 1회 — 오픈 go/no-go의 실제 잠금.
3. 감사 잔여: playbook 데이터 적재(3-Tier RAG 완성)·병원 viewer 게이팅(PO 권한정의)·normalized draft 중복 가드.
4. **#422·#424 법무 PR** — PO 검토 끝나면 머지.

**6. 검증 상태**
- ✅ **머지 9 PR**(#441·#443·#445·#446·#448·#452·#453·#454·#456) 각 **ci·Smoke·Vercel 초록 확인 후 머지**. `next build --webpack` exit 0·`check:content` 통과(매 변경).
- ✅ **실DB**(Supabase MCP): RAG 적재13/18·검색 RPC end-to-end·전환 승격 경로 코드추적·보안 advisor 점검. 문의 31건 전부 `web`(ai_agent 0).
- ✅ **열린 PR/CI 실확인**: 남은 열림 = #449(draft, CI초록)·#422·#424(법무, draft). 그 외 이번 세션 PR 전부 머지.
- ❌ **검증 못 함(솔직히 — 실로그인/실기기/실메일 필요)**: 모든 인증 화면 실클릭(코디·어드민·병원·#449 코디챗)·비활성 계정 실차단(#453)·동의 보존 실데이터(#452)·중국어 상담 실생성(#454)·PII 감사로그 실기록(#456)·2인 영상·iOS 자막·실메일·AI 3턴 실전환집계. → 5번 1순위로 승격.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단(2026-06-29 심야) 핸드오프 읽어. 퍼널 전수 심층감사로 찾은 출시 블로커 6개를 고쳐 머지했어(#452 동의·#453 비활성차단·#454 중국어상담/누출/코디대시보드·#456 PII감사로그). **근데 전부 실로그인·실데이터 검증을 못 했으니** 그것부터 확인해줘: ①#449(코디 AI챗 뷰)·#453(비활성 차단) 프리뷰/실계정 확인 후 머지할지 ②머지된 감사수정 실동작(Step2 후 동의 보존·중국어 상담 생성·코디 긴급알림·PII 열람 로그). 그담 출시 PO 관문(LAUNCH_GATES_PO.md: 약한비번 admin 삭제·Gemini 결제·구글 OAuth 게시·실메일)은 PO만 닫을 수 있으니 안내. #422·#424 법무는 PO 검토 대기, playbook 데이터 적재는 여력되면.
## 🔖 세션 핸드오프 (2026-06-29 — PyTorch 글 2개 적용: AI 과장가드 + 시장 인텔리전스 수집도구 → PR #451 머지·배포)

> PO가 PyTorch 한국 포럼 글 2개(Ornith-1.0 / Agent Reach)를 주고 "우리한테 적용할 게 있는지 분석"하라 함. 둘 다 **실제 기능으로 적용** → PR [#451](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/451) squash 머지·배포 완료.

**1. 이번 세션 한 일 (PR #451 머지됨)**
- **① AI 답변 "근거 없는 정량 과장" 안전가드 (overclaim_stat)** — Ornith의 "결정론적 모니터링+LLM 심판" 발상. 우리 2층 가드(0층 정규식 `safetyGuard.ts`+1층 `judge.ts`)가 완치·약물·생존율만 잡고 "매칭 정확도 90%·만족도 95%·성공률 N%" 류는 못 잡던 구멍을 메움. `safetyGuard.ts`(soft 카테고리, 연성 캡 0.5)·`judge.ts`(프롬프트+플래그)·`qualityStandards.ts`(OVERCLAIM_FLAGS)·`safetyGuard.test.ts`(6언어, 71개 통과). POSTMORTEMS #42.
- **② 시장 인텔리전스 수집 도구 (Agent Reach 적용)** — `npm run collect:intel` 한 줄로 공개 뉴스·커뮤니티에서 다국어(ru·kz·zh·en·ko) "한국 암치료 의료관광·경쟁국·KHIDI 정책" 신호 수집 → 마케팅 리포트(.md)+원자료(.json)+AI 브리프(Gemini, 선택). 기존 `scripts/data-collection/` 패턴에 `intel` 명령으로 얹음. 소스: Google News RSS·Reddit 공개검색·무의존 RSS/Atom 파서·r.jina.ai 웹리더. 플레이북 `docs/MARKET_INTEL_PLAYBOOK.md`.
- **부수: 기존 collect CLI가 통째로 깨져있던 버그 2건 수리** — `normalize-hospital.ts` 변수명 `eval`(ESM 예약어→`ev`), `index.ts` ESM `__dirname` 미정의(shim 추가).
- KHIDI 베이스 §4(6월 로그) 기록.

**2. 왜 그렇게 했는지**
- **중복 방지(둘 다 "이미 있는 것 위에"):** 가드는 새로 짓지 않고 2층 가드의 빈 카테고리만 채움. intel도 새 폴더가 아니라 기존 data-collection 플러그형(소스→수집기→변환→export)에 명령만 추가.
- **정적 `check:content` 룰은 의도적 제외:** 우리 KHIDI 공식지표가 "환자 만족도 **90점**"이라 정적 룰을 두면 어드민 목표 표시를 오탐(PO 2026-06-29 취향과 정합) → **런타임(환자 노출 답변) 범위로만** 한정.
- **intel 설계 원칙(의료 플랫폼이라):** 공개 데이터만(로그인뒤·쿠키 스크래핑 금지=ToS·법), 환자 PII 수집·저장 금지(시장/경쟁/평판 신호만), 출처·날짜 보존, 생성물은 `.gitignore`.

**3. 안 끝났거나 보류**
- **intel 다음 단계(플레이북에 기록, PO 원하면 진행):** 주 1회 cron 자동실행·추세비교, 브랜드 평판 알림(watchKeyword 매칭 시 코디/PO), **CIS 전용 소스(VK·텔레그램·Odnoklassniki) 보강**(Google News·Reddit은 러·카자흐 핵심망을 잘 못 봄), 중국 푸시 시 샤오홍슈·웨이보.
- **직전 세션(#431) 미검증분 여전히 유효** — 아래 5번 참고.

**4. 주의·함정**
- **Reddit은 데이터센터 IP(서버·CI)에서 403 차단** — 이 환경에선 스킵됨(우아하게). PO 로컬 PC에선 될 수 있음. 리포트 상단 `응답 소스 N/M`로 가시화.
- **AI 브리프는 `GOOGLE_GENERATIVE_AI_API_KEY` 있어야 생성** — 없으면 수집목록만(스킵). 실서비스/PO 로컬 키 환경에서 확인.
- **생성물 `data/collected/`는 `.gitignore`** — 커밋 안 됨(로컬/드라이브에만).
- **검색어·대상은 코드 수정 없이 `config.ts`의 `intel` 블록만** 손대면 됨(마케팅 직접 조정).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저 확인 (이번 세션):** ①실서비스 AI 챗에서 "정확도 90%" 같은 과장 답변 → 코디 품질 알림 뜨는지 ②`npm run collect:intel`를 **PO 로컬에서** 돌려 AI 브리프(키 환경)·Reddit(로컬 IP) 붙는지.
2. **⚠️ #431 미검증분도 아직:** AI 챗 드래그앤드랍·업로드→1차소견·어드민 검수버튼·ru/kz 실응답·3턴+ 후 전환집계(아래 옛 핸드오프 참고).
3. **(PO 선택 시) intel 다음 단계** — 3번 보류 항목 중 PO가 고른 것(주1회 자동/평판알림/CIS 소스).

**6. 검증 상태**
- ✅ `vitest run src/lib/chat/` 71개 통과 · `tsc --noEmit` 변경파일 에러 0 · `npm run check:content` 통과.
- ✅ intel **실제 48건 수집 end-to-end 동작 확인**(Google News ru/zh/en/ko) — 러시아 "한국이 러 환자 암치료"·경쟁국(터키) 등 실신호. 스니펫 HTML/이중인코딩 엔티티 정리 확인.
- ✅ PR #451 CI(`ci`·`Smoke Tests`) 둘 다 success → squash 머지 → `main` 배포(Vercel).
- ❌ **검증 못 함(실환경 필요):** 실서비스 AI챗 과장→코디알림 / AI 브리프(키 환경) / Reddit(로컬 IP) / #431 직전 미검증분.

**7. 다음 세션 첫 프롬프트**
> 먼저 `docs/PROJECT_CONTEXT.md` 최상단 핸드오프부터 읽어. 직전 2개 세션 미검증분을 실서비스에서 확인하자: ①AI 챗에 "정확도 90%" 같은 과장 답변 유도 → 코디 품질 알림 뜨나 ②`npm run collect:intel` 로컬 실행해 마케팅 리포트+AI 브리프 잘 나오나 ③#431분(드래그앤드랍·1차소견·검수버튼·ru/kz 응답·전환집계). 그다음 intel 다음 단계(주1회 자동/브랜드 평판알림/CIS 소스 VK·텔레그램) 중 뭐 할지 정하자.

---

## 🔖 세션 핸드오프 (2026-06-29 밤 — AI Agent 대개선: 첨부 1차소견·진료의뢰패킷·전환집계 구멍·RAG 완전수리·카자흐어 혼동 → 실서비스 머지)

> PO가 "AI agent 기능 개선"으로 시작 → 별도 워크트리(`HEALO_worktrees/ai-agent`, 브랜치 `work/ai-agent`)에서 작업. 표면은 "개선"이었지만 파보니 **숨은 큰 고장 3개**(전환 집계 누락·RAG 100% 고장·비영어 RAG 무력)를 발견·수리. PR [#431](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/431)에 모아 PO 프리뷰 검토 후 **실서비스 머지**. (병렬 TEST데이터 세션 [#438]의 `is_published` 가드를 흡수 — 같은 파일 충돌 정리.)

**1. 이번 세션 한 일 (PR #431)**
- **첨부 의료자료 1차 소견(triage) 신설** — 검사지·사진 올리면 멀티모달 판독 → ①환자용 예비 1차소견 즉시(강한 면책+"AI작성·검토예정", **문단 쪼개기 포맷**) ②의료진용 진료의뢰 패킷 ③어드민 「AI 대화·환자자료」 의사 "검수완료/정정해서 보내기". 파일: `src/lib/chat/triage.ts`(신규)·`api/public/chat/stream`·`api/admin/chat/.../messages`(PATCH)·`app/admin/chat/page.jsx`·`manuals`.
- **드래그앤드랍 업로드** — `app/inquiry/ThreadChat.jsx` + i18n 6개어.
- **전환 구멍 수리** — AI 챗 리드가 `inquiries`로 승격 안 돼 KHIDI 유치 대시보드에 0으로 안 잡히던 것 → `createDraftIntake`(3턴+)에서 1회 승격(`source='ai_agent'`, dedup `chat_threads.inquiry_id`). `publicChatHelpers.ts`.
- **RAG 완전 수리(2겹 버그 + 1)** — ①ingest가 없는 컬럼(`embedded_at`) insert→적재 실패 ②검색 RPC `doc_source_id uuid≠text`→검색 항상 실패. + 적재문서 전부 `lang='en'`이라 ko/ru/kz가 0청크(`p_lang` 해제로 다국어 임베딩 교차검색). + `is_published` 필터(미게시·TEST 노출 차단, #438 흡수). 검증데이터 적재(13문서/18청크). `ingest.ts`·`generateReply.ts`·`migrations/20260629_fix_rag_search_v1_1_source_id_type.sql`·`scripts/seed-rag-once.mjs`. POSTMORTEMS #47·#48.
- **카자흐어↔러시아어 혼동 방지** — `buildSystemPrompt`에 `outputLang` + "카자흐어≠러시아어" 명시. `generateReply.ts`·`externalSearch.ts`(타임아웃 3s→2s).

**2. 왜 그렇게 했는지**
- **1차소견 = 의료 레드라인 일부 완화**: 원래 "판독 안 함"이었으나 PO가 KHIDI 사전상담 'ICT 진료의뢰' 요건 근거로 원함. 절충: AI는 비임상 오리엔테이션+요약, 임상소견은 강한 면책+사후 의사검수. PO 결정 **즉시 노출 + 사후 검수**.
- **RAG 언어필터 해제**: 임베딩이 다국어라 필터만 끄면 즉시 6개어 작동(가장 값싼 해결). 다국어 적재 시 '같은 언어 우선' 재검토(주석 명시).
- **#438 흡수**: 두 세션이 `ingest.ts`·`seed-rag-once.mjs` 동시 수정(충돌). #438의 `is_published` 한 줄을 #431에 흡수해 한 번에 머지, #438은 중복으로 닫음(라이브 데이터 정리는 #438이 이미 적용).

**3. 안 끝났거나 보류**
- **TEST 더미 RAG 노출** — 라이브 정리·코드 가드 다 완료(#438+#431). 남은 위생은 없음.
- **프롬프트 미세개선** — RAG가 진짜 병목이라 우선 해결. 톤 추가 손질은 여력될 때.
- **재적재 자동화 없음** — 병원·치료 데이터 바뀌면 수동 재적재 필요(4번 참고).

**4. 주의·함정**
- **프로덕션 DB 이미 변경됨**: RAG 데이터 적재·검색 RPC 재정의·`trust_tier=2`·TEST 소프트삭제. 코드 머지와 별개로 DB는 선반영(무해, 추가형).
- **워크트리 스크립트 실행**: node_modules는 메인 폴더로 junction, env는 절대경로 `C:/Users/user/Desktop/HEALO_KHIDI/.env.local`. `server-only` 모듈은 `node --conditions=react-server --import tsx ...`.
- **로컬 `generateChatReply` 직접 호출 시 prod judge가 돌아 코디에 실제 알림** — 테스트 주의(프로브는 삭제함).
- **RAG 재적재**: `node --conditions=react-server --import tsx scripts/seed-rag-once.mjs`.
- **"RAG 검색 0건" 오진 주의**: 검색 테스트 시 질문 임베딩 차원을 **768로 고정**(`outputDimensionality:768`). 안 하면 기본 3072차원이라 저장된 768과 안 맞아 조용히 0건 나옴(병렬 세션이 이걸로 오진함).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저 실서비스에서 확인(머지·배포 후):** ①AI 챗 **파일 드래그앤드랍** ②자료 업로드→**1차소견**(문단 쪼개짐+면책) ③어드민 **진료의뢰 패킷·검수버튼** ④ru/kz로 질문→그 언어로 답 ⑤3턴+ 대화 후 `/admin/khidi/conversion`에 문의 잡힘.
2. **#438 닫기** — #431에 흡수됐으니 superseded로 닫기(그쿨 세션과 조율).
3. (여력) POSTMORTEMS #48 재발방지: "rag_chunks_used 평균 0이면 경보" + 스키마 드리프트 CI 가드.

**6. 검증 상태**
- ✅ `next build --webpack`·`check:content` 통과(매 변경). ✅ 실DB: 적재 13/18·검색 RPC end-to-end(ko/en/ru 4청크 **재확인**, prod 직접 찍음)·inquiries insert·멀티모달 계약. ✅ 1차소견 포맷(문단 분리) 실 gemini 출력 확인.
- ⚠️ PR #431 머지 시점 CI: 머지 직전 확인할 것. main 충돌은 이 세션에서 해소.
- ❌ **검증 못 함(실서비스 클릭 필요)**: 브라우저 드래그앤드랍·업로드→소견 end-to-end·어드민 검수버튼·ru/kz 실응답·전환 집계 화면 — 로그인·DB 필요해 자동검증 불가. (PO가 프리뷰에선 1차소견 뜨는 것·포맷은 눈으로 확인함.)

**7. 다음 세션 첫 프롬프트**
> 먼저 `docs/PROJECT_CONTEXT.md` 최상단(2026-06-29 밤 AI Agent 블록) 읽어. AI Agent 대개선(1차소견·진료의뢰패킷·전환집계·RAG수리·카자흐어)을 실서비스에 머지·배포했어. **실서비스에서 검증**해줘: ①AI 챗 파일 드래그앤드랍 ②자료 업로드→1차소견(문단 쪼개짐+면책) ③어드민 진료의뢰 패킷·검수버튼 ④ru/kz로 질문 시 그 언어로 답 ⑤3턴 대화 후 유치 전환 대시보드에 문의 잡힘. 그리고 PR #438이 #431에 흡수됐으니 닫을지 그쿨 세션과 조율.

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
