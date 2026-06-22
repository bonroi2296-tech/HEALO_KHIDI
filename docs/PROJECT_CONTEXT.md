# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-22 심야 — 자율감사: 카자흐어 문의 차단 버그 발견·수정 + 공개 퍼널 레이트리밋 DB화 + 직전 잔무 정리)

> 브랜치 `claude/session-recovery-7ol6xh`, **PR [#267](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/267)(초안)**. PO 지시="밤새 피버모드, 기획·개선·디자인 뭐든". 라이브 배포·검증은 Vercel 일일 배포한도(>100/일) 소진으로 막힘(코드 무관).

**1. 이번 세션 한 일:**
- **🔴 핵심 발견: 카자흐어(`kz`) 문의가 그동안 거부되고 있었음** — 통합 문의 퍼널 언어 드롭다운은 활성코드 `kz`를 보내는데 `/api/inquiries/step1` zod 검증이 `kk`만 받아(`z.enum([...,"kk",...])`) **카자흐어 문의를 400 거부**. 카자흐스탄=본 사업 핵심 타겟 시장(KHIDI 성과지표=카자흐 암환자 유치)이라 유치·상담 KPI 직격. + `dispatch-reminders` cron도 `kz`를 못 통과시켜 카자흐 환자에게 **한국어 리마인더** 발송. → step1 enum에 `kz` 추가(kk 하위호환 유지) / 리마인더는 설문과 동일하게 경계에서 `kz→kk` 매핑. **POSTMORTEMS #24** + `check:content`에 "z.enum 언어검증에 kk만 있고 kz 누락 시 CI 실패" 가드 신설(이메일/설문 템플릿 kk·hreflang `kz:"kk"`는 정밀 제외, 오탐 0 확인). 커밋 96701d8.
- **공개 퍼널 레이트리밋 DB화(KNOWN_ISSUES #7)** — 공개 무인증 DB쓰기 6개 라우트(`inquiries` create/step1/step2/intake, `survey/submit`, `khidi/intake`)를 인메모리 `checkRateLimit`→`checkRateLimitPersistent`(DB sliding window, 인메모리 폴백 내장)로 이관. 서버리스 다중 isolate에서 분산 봇이 스팸 리드로 유치/만족도 KPI 오염시키던 구멍 차단.
- **`operationalLog` maskIp IPv4 마스킹 오타** 수정(`192.168.***,100`→`192.168.***.100`).
- **직전 세션 잔무 정리**: ①**PR #83 닫음**(AI 안전가드 0층은 클린 재구성 #256이 이미 머지돼 main에 있음 — 중복). ②**PR #254 머지 확인**(직전 핸드오프엔 초안이었으나 그새 머지됨, 커밋 a4faaaa). ③**배포 스킵 설정 확인** — `vercel.json`에 `ignoreCommand` 이미 연결돼 있어 **대시보드 손댈 필요 없음**(직전 핸드오프의 "PO가 1회 설정" 항목은 불필요로 판명). ④**TEST2 prod 실증** — 라이브 챗에 "로그인 안 해서 세션 유지 안될텐데?" 던져 "대화 안전 저장+연락처 남기면 코디 연락" 정직 응답 확인(옛 사과 사라짐). 테스트 스레드 DB 삭제.
- **핸드오프 자동화 수정(PO 지적)**: PO가 "다음 세션 복붙 프롬프트 자동화하라 했는데 왜 또 주냐"고 지적 → 핸드오프 스킬 `SKILL.md` 규칙 H를 "복붙 프롬프트를 PO에게 내밀지 마라(세션 시작 훅이 자동 표시)"로 교체 + `PO_PREFERENCES` 누적 + **반성문 POSTMORTEMS #25**(지시 미반영·재발). 커밋 cb8840f·ed32005. (이 항목 이후로 마무리 보고는 복붙 프롬프트 없이 3줄 요약으로만.)

**2. 왜 그렇게 했는지:**
- **언어코드 정본 불일치가 근본원인**: 앱 전반은 `kz`, 이메일/설문 서브시스템은 의도적으로 내부키 `kk`(ISO 639-1)를 쓰고 경계에서 `kz→kk` 정규화(`resolveRecipient.normalizeSurveyLang`). 이 경계규칙을 입력검증(step1)·리마인더가 안 따라서 터짐. hreflang(`sitemap`·`i18n/metadata`)의 `kz:"kk"`는 SEO 정답이라 안 건드림.
- **탐색 에이전트 결과를 맹신 안 함**: 서브에이전트가 "kk/kz 중복이 테스트를 깬다"고 3건 보고했으나 직접 확인하니 **오탐**(테스트는 활성6키만 검사·통과 중, kk는 의도된 폴백). 진짜는 maskIp 오타 1건뿐. 그러다 더 큰 진짜 버그(step1 카자흐어 거부)를 직접 추적해 발견.
- **레이트리밋은 인증 필요한 `agency/refer`는 제외**(공개 스팸 벡터 아님), 공개 무인증 DB쓰기만 DB화(스코프 절제).
- **가드를 `z.enum`만 정밀 타겟**: 넓게 잡으니 의도된 kk 패턴 6곳을 오탐 → 입력검증만 잡게 좁혀 노이즈 0.

**3. 안 끝났거나 보류:**
- **PR #267 = 초안** — CI(타입+테스트+스모크) 통과 확인 후 PO 머지 판단. (저위험 백엔드 정확성·하드닝이라 CI 초록이면 어시스턴트 머지 가능 범주, 단 카자흐어 퍼널 동작 변화라 PO 인지 권장.)
- **TEST3(로그인 인지) 실화면 미검증** — 직전 세션 이월. curl로 로그인 흉내 불가 → PO 브라우저 또는 배포 후 prod에서 확인 필요.
- **카자흐어 step1 수정 라이브 end-to-end 미검증** — Vercel 배포한도로 못 띄움. 한도 풀리거나 머지 후 prod에서 `preferredLanguage:"kz"`로 step1 제출이 200 되는지 확인 권장(단 실제 문의 제출은 PO에게 admin 알림 메일 감 → 주의).
- **(참고·보류) `khidi/intake` POST의 `VALID_CANCER_TYPES`가 6종**(colorectal·pancreatic 빠짐, 퍼널은 8종) — 단 이 POST를 호출하는 프론트가 없음(GET만) → 라이브 영향 없어 보류.

**4. 주의·함정:**
- **Vercel 배포 한도 소진 지속** — PR #267의 Vercel 체크는 "Deployment rate limited — retry in 24 hours"로 **빨강이지만 코드 문제 아님**(직전 세션들과 동일 환경 이슈). 진짜 CI는 GitHub Actions `ci`·`Smoke Tests (PR)`.
- **이 환경엔 node_modules 없음** → `tsc`/`vitest`/`next build` 로컬 실행 불가. `node scripts/check-content-consistency.mjs`(빌트인만 씀)는 돌아감(통과 확인). 타입·테스트는 CI에 위임.
- 카자흐어 코드는 맥락별로 다름: **입력/저장/UI=`kz`(정본)**, **이메일/설문 템플릿 키·hreflang 출력=`kk`(경계에서 변환)**. 새 코드에서 헷갈리지 말 것 — 가드가 z.enum만 잡으니 plain array 검증에서 재발 가능성은 남음.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: ①**PR #267 CI 초록 확인 후 머지 판단**(카자흐어 퍼널 복구라 빠를수록 좋음). ②**TEST3(로그인 인지)** 실화면 확인(PO 브라우저/머지 후 prod). ③배포 한도 풀리면 카자흐어 step1 제출이 prod에서 200 되는지 확인.
2. (선택) 언어코드 정본(`kz`)·경계매핑(`kz↔kk`)을 단일 헬퍼로 모아 부류 자체 제거(저우선 리팩터).
3. (이월) 스모크 자동점검 완전가동(GitHub Secrets `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY`) / 로그인 displayName·마이페이지 UI PO 결정.

**6. 검증 상태:**
- **PR #267 CI**: `ci`(타입+vitest)·`Smoke Tests (PR)` = 푸시 직후 **in_progress(미확인)**. E2E류는 PR에서 skip(정상). Vercel = **failure(배포한도, 코드 무관)**. → 다음 세션/이 세션 후속에서 초록 재확인 필요.
- **`node scripts/check-content-consistency.mjs`**: ✅ 로컬 통과(가드 신설 후 오탐 0·금지토큰 0·활성6언어 패리티).
- **레이트리밋 6파일**: ✅ 전부 `await checkRateLimitPersistent` 정합 + 미사용 import 0(grep 확인).
- **TEST2(세션 안내)**: ✅ prod 라이브 curl 실증(2026-06-22 심야).
- **TEST3(로그인 인지)**: ⏳ 실화면 미검증(이월).
- **카자흐어 step1 수정**: 코드·가드는 결정적 / **라이브 end-to-end 미검증**(배포한도).
- **로컬 `tsc`/`vitest`/`next build`**: 환경에 node_modules 없어 못 돌림 → CI 위임.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 자율감사 세션(PR #267, 브랜치 claude/session-recovery-7ol6xh) 이어가자. ①PR #267 자동검사(CI) 초록인지 확인하고 초록이면 머지할지 판단해줘(카자흐어 문의 퍼널이 그동안 막혀 있던 버그 수정이라 빨리 반영하면 좋음). ②Vercel 배포한도 풀렸으면 미리보기에서 카자흐어로 문의 step1 제출이 잘 되는지(전엔 막혔음)랑 TEST3(로그인하고 "나 로그인했어?" 물어→계정 연결 안내) 실화면 확인해줘. ③배포 한도 막혀 있으면 코드 무관이니 그냥 알려만 줘.

---

## 🔖 세션 핸드오프 (2026-06-22 저녁 — AI 에이전트 상태인지: 거짓 접수 차단 + 세션/로그인 인지 + 배포 한도 절약)

> 브랜치 `claude/ai-agent-state-detection-0ag4tj`, **PR [#254](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/254)(초안)**. CI(타입+테스트+Smoke) 초록. 실화면 검증은 **TEST1만 완료**(TEST2·3은 Vercel 일일 배포한도로 보류).

**1. 이번 세션 한 일:**
- **발단**: PO가 `/inquiry` AI Agent를 직접 테스트(위암 친구 상담 시나리오) → AI가 ①**연락처 없는 익명 사용자에게 거짓 "접수완료"**(직후 연락처 요구하는 모순) ②"로그인 안 해서 세션 유지 안될텐데?" 질문에 즉흥 오답 ③질책에 비용표·서류 정보덤프 ④실제 로그인 상태 무인지. AI가 직접 쓴 자기리포트는 "로그인 상태값 못 받음"이라 자기변호했으나 **코드 확인 결과 절반만 맞음**(이 챗은 설계상 익명·공개 `/api/public/chat/*`라 로그인 원래 안 봄).
- **고침(백엔드만, 프론트 무변경)** — 커밋 cc6b473·30b0eec:
  - ①`ChatSession{isLoggedIn,hasReachableContact}`를 `generateReply.buildSystemPrompt`까지 관통 → 프롬프트에 **SESSION & IDENTITY FACTS**(로그인=계정연결·any device / 게스트=이 브라우저 30일 쿠키복구를 정직 안내) + **접수멘트 연락처 게이트**(연락 불가 시 거짓 "접수완료" 금지·연락처 1개 요청) + **DE-ESCALATION**(화난 사용자에게 문서·가격 덤프 금지).
  - ②라우트(`start`/`message`/`stream`/`stream`) — `pickHandoffConfirm(lang,reachable)`로 접수멘트 분기 + `HANDOFF_NEED_CONTACT` 6언어 신설 + `HANDOFF_CONFIRM` `kz`키 누락 보강.
  - ③**로그인 계정연결**: 공개챗이 same-origin Supabase 인증쿠키로 로그인 식별 → `chat_threads.user_id` 연결(+`metadata.is_logged_in`). 익명(인증쿠키 없음)은 auth 왕복 생략. `hasReachableContact = guest_email ∥ guest_phone ∥ user_id`. patient 포털 챗도 `{isLoggedIn:true,...}` 전달.
  - ④**세션/로그인/저장 질문이 `isTopicCorrection`에 오탐**돼(="안 했"·"유지 안될") 세션안내 대신 엉뚱한 사과로 빠지던 것 수정 — `topicGuards.ts`에 `SESSION_STATE_TERMS` 예외.
  - ⑤회귀잠금 테스트(`systemPromptGuards.test.ts`·`topicGuards.test.ts`) + **POSTMORTEM #22**.
- **배포 한도 절약** — `scripts/vercel-ignore-build.sh`(문서-only 커밋 배포 스킵) + **`vercel.json`의 `ignoreCommand`로 연결**(공식 지원 확인) → main 머지되면 **대시보드 설정 없이** 자동 적용. 교통정리 ① 캐논화(다른 세션 `vercel-deploy-throttle`·#259 닫아도 됨).
- **반복업무 자동화(PO "싹다해")**: ①접수 게이트 로직을 순수 모듈 `contactGate.ts`로 추출→`contactGate.test.ts` 진짜 단위테스트(server-only 텍스트잠금 대체). ②`scripts/smoke-chat.mjs` 라이브 AI챗 스모크(접수게이트·세션안내, 테스트 스레드 service_role 자동삭제로 DB오염 0) — **프리뷰 2/2 통과 검증**. ③`.github/workflows/chat-smoke.yml` 매일 프로덕션 자동점검(실패=빨강 알림). 내 curl 테스트 데이터(qa-verify·smoke 5건)는 Supabase MCP로 정리 완료.
- **소통 지침**: CLAUDE.md에 "쉽게 설명 + **선택지는 텍스트 나열 말고 AskUserQuestion 버튼으로**" PO취향 고정(PO_PREFERENCES #41·#50 누적분 승격) + "폰↔컴 이어가기(push=저장≠배포)" 취향 PO_PREFERENCES 추가.

**2. 왜 그렇게 했는지:**
- AI 자기제안(`is_logged_in` 메타데이터 파이프라인)을 곧이곧대로 만들면 **안 써도 될 복잡도만 늘고 진짜 버그(거짓 접수)는 안 고쳐짐** — 이 퍼널은 의도된 익명 흐름이라 핵심은 "상태값 주입"이 아니라 **제품 사실(저장·복구·연락가능)을 프롬프트에 알려주는 것**.
- 거짓 "접수완료"는 **프롬프트(가정) + 라우트(무조건 멘트)** 두 군데서 동시에 터져서 둘 다 고침.
- 확률적 AI 행동이라 프롬프트만 고치면 "또 터질 것" → **코드 분기(연락처 게이트·정정 예외) + 단위테스트로 결정적 강제**(PO 취향: "고쳤다보다 다신 안 터진다").
- 로그인 감지는 프론트 수정 없이 가능 — same-origin fetch에 Supabase 인증쿠키가 자동 동봉되므로 서버에서 읽음(익명은 쿠키 자체가 없어 auth 왕복 스킵 → 지연 0).
- displayName(이름 호칭)은 PII 최소화 위해 일부러 뺌(필요하면 추가).

**3. 안 끝났거나 보류:**
- **TEST2·3 실화면 검증** — Vercel 일일 배포한도(100/일) 초과로 수정분(30b0eec) 배포가 막힘. ~24h 뒤 한도 풀리거나 머지 후 prod에서 확인 가능.
- **Vercel Ignored Build Step 설정** — PO가 대시보드에서 1회 설정해야 효과(아직 안 함). Settings>Git>Ignored Build Step에 `bash scripts/vercel-ignore-build.sh`.
- **로그인 사용자 이름 호칭(displayName)·마이페이지 UI** — PO 결정 대기(급하지 않음).
- PR #254 = **초안**(머지 안 함, PO 검토 대기).

**4. 주의·함정:**
- **이 작업 중 Vercel 일일 배포한도를 소진**시킴(작은 커밋 여러 번 푸시 + 문서 커밋도 배포됨). 그래서 ignore-build 스크립트 추가 — 하지만 **머지 전까진 효과 없음**(설정도 PO 몫). 당분간 새 배포 안 뜰 수 있음(코드 문제 아님).
- 라이브 curl로 TEST2 재시도하면 아직 **옛 동작(엉뚱한 사과)** 나옴 → 이건 미배포 탓이지 코드 미수정 아님(코드·단위테스트는 통과).
- `HANDOFF_CONFIRM`은 기존에 `kz` 없이 `kk`만 있어 카자흐어가 영어로 폴백되던 잔버그가 있었음(이번에 둘 다 채움) — 다른 메시지 맵도 `kz/kk` 둘 다 있는지 볼 것.
- **⚠️ 병렬 세션 중복(2026-06-22 저녁 시점) — 머지 전 교통정리 필요** (PO 지시=계획만, 아무것도 안 닫음/머지 안 함):
  - **① 배포한도**: 내 #254 `scripts/vercel-ignore-build.sh`(스크립트+대시보드) ↔ `vercel-deploy-throttle`의 `vercel.json ignoreCommand`(설정 불필요, 단 전브랜치 프리뷰 OFF) ↔ #259 = **3중복**. 추천: vercel.json 방식 1개만(문서-only 스킵으로 튜닝), 나머지 폐기.
  - **② AI 안전가드**: #83 ↔ `ai-safety-guard-reextract`(#256, "#83 클린 재구성") = 중복. 추천: **#256 살리고 #83 닫기**.
  - **③ AI 챗 행동**: 내 #254 ↔ `fix-ai-deflection-loop`(#260) ↔ `ai-agent-analysis-masterkey`(힐로 #255)가 **`generateReply.ts`(3개 다)·`topicGuards.ts`(#254·#260) 동시 수정 → 따로 머지 시 충돌**. 추천: **#254 먼저 머지 → #260·#255 rebase 후 머지**(또는 셋 통합).
  - 다수 브랜치가 25~65분 전 활동 = **활성 세션일 수 있음** → 닫기/머지 전 해당 세션과 조율.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: **TEST3(로그인 상태에서 "나 로그인했어?"→"계정 연결됨" 안내)** 실화면 확인 — curl로 로그인 흉내 불가라 미검증. PO 브라우저 또는 머지 후 prod에서. (TEST1·TEST2는 2026-06-22 라이브 실증 완료.)
2. **PR #254 초안 해제·머지 판단** — 머지되면 ①배포스킵(vercel.json ignoreCommand, 대시보드 설정 불필요) ②세션시작 열린작업 목록판 ③매일 챗 스모크 자동점검이 전 세션/프로덕션에 적용됨.
3. **(선택) 스모크 자동점검 완전가동** — GitHub Secrets에 `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 추가(없어도 테스트는 돌고 테스트 스레드 정리만 생략). 점검대상 바꾸려면 변수 `SMOKE_BASE_URL`.
4. **교통정리 실행**(PO 지시 시): ②안전가드 #256 살리고 #83 닫기 / ③AI챗 #254 먼저 머지 후 #260·#255 rebase / ①배포 dup(`vercel-deploy-throttle`·#259) 닫기 — #254가 캐논.
5. (보류) 로그인 사용자 **이름 호칭(displayName)**·마이페이지 "이력 보기" UI 붙일지 PO와 결정.

**6. 검증 상태:**
- **CI(PR #254, 커밋 7e9c59e)**: `ci`(타입 tsc + vitest) ✅ success, `Smoke Tests (PR)` ✅ success. (E2E류는 PR에선 skip — 정상.)
- **`check:content`**: 로컬 통과(금지토큰 0·활성6언어 패리티).
- **TEST1(거짓 접수 차단)**: ✅ 미리보기 라이브 curl로 **실증**(연락처 없이 "접수해줘"→연락처 요청).
- **TEST2(세션 질문)**: ✅ 미리보기 라이브 curl로 **실증**(2026-06-22, PO 실제 문구 "로그인안해서 세션 유지 안될텐데?"→"서버 자동저장+이 브라우저 30일 유지" 정직 안내. 옛 "잘못 짚었어요" 사과 사라짐).
- **TEST3(로그인 인지)**: ⏳ **실화면 미검증** — curl로 로그인 흉내 불가. 코드+로직 검토만. PO 브라우저 또는 머지 후 prod에서 확인 필요.
- **로컬 `next build`**: 이 환경에 node_modules 없어 못 돌림 → CI에 위임(ci 초록).

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. "AI 에이전트 상태인지 수정"(PR #254, 브랜치 claude/ai-agent-state-detection-0ag4tj) 이어가자. ①Vercel 배포 한도 풀렸으면 미리보기에서 TEST2(로그인 안 했는데 저장되냐고 물어→30일 저장 안내 뜨는지)·TEST3(로그인하고 나 로그인했냐 물어→계정 연결 안내 뜨는지) 실화면 확인해줘. ②내가 Vercel Ignored Build Step 설정했는지 봐주고. ③다 되면 PR #254 머지할지 판단해줘.

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
