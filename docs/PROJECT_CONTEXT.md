# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-21 배포검증·KPI) — #202 prod 배포·실검증 + 병원 확정→유치 자동집계(평가KPI 누락 차단) + 화상카메라 테스트 준비 + 반쪽 백오피스 반성문(#18) + ⚠️Vercel 한도 재초과

**이번 세션 한 일:**
- **#202(병원 응답 역방향) production 배포·실검증 완료.** 세션 시작 시 prod=`19ab034`(#200)였고 #202(`eb73623`)는 머지됐으나 Vercel 한도로 prod 빌드 미생성 상태. 한도 풀린 것 확인 → main에 **빈 커밋(`09b517d`) 푸시로 production 배포 트리거** → prod READY(`healo-khidi.vercel.app`가 #202 서빙). 병원 계정(`hospital@test.com`) 토큰으로 **prod API 직접 호출**해 데모 #13 상태를 `replied`로 변경 → `inquiries.case_status='scheduling'` 자동 전진 + `case_status_history` 기록까지 실검증(닫힌 고리 prod 동작 확인).
- **🔴 병원 '치료 확정'(converted) → 유치(outcome='admitted') 자동 집계 — 평가 KPI 누락 차단 (PR #207, 미배포).** 발견: 유치 전환 점수판(`/admin/khidi/conversion`)의 유치 카운트는 `inquiries.outcome='admitted'` 한 곳에만 의존하는데, 에이전시→병원 의뢰 경로(#194/#200/#202)는 `case_status`·`hospital_leads`로만 진행 → **병원이 'converted' 해도 유치로 안 잡히고 코디 '유치확정 대기' 목록에도 안 떠 완전 사각지대**(실데이터 #13이 그 상태였음). PO 결정="병원 확정하면 자동 유치 집계". `outcomeForHospitalLeadStatus()`(순수, `caseStatus.ts`) + `/api/partner/leads` PATCH에서 converted 시 `outcome='admitted'` 자동 기록. 테스트 3개 + POSTMORTEMS #17.
- **KPI 정의 주석 정확도 수정**(PR #207): `KpiResult` JSDoc이 옛 구현(K-02 `duration>=5`·K-01 `visit_confirmed_at`)을 가리켜 모순 → 실제 집계(duration 미필터·`outcome='admitted'`)와 일치하게 정정. 로직 무변경.
- **점수판 3개 KPI 읽기전용 감사**: 유치(K-01)·상담(K-02/K-04)·만족도(K-03) 실데이터로 교차검증 → 숫자 집계 자체는 정상(유치 4·사전상담 8·사후관리 3 등 데이터와 일치). 만족도는 `satisfaction.ts` 순수함수+테스트로 단일화돼 이상 없음.
- **화상방 다자 카메라(#160) 라이브 테스트 준비**: 데모 상담세션(`b5891711-...`, room `healwith-camtest-260621`) + **자동승인(doctor 역할) 초대링크 2개** 발급(48h·각 20회). prod guest-join API 실호출로 LiveKit 토큰 발급·입장 가능 확인. PO가 폰 1대뿐이라 2명 라이브 카메라 확인은 미실시(보류).
- **반쪽 백오피스 패턴 반성문(POSTMORTEMS #18) + PO 취향**: PO 지적("계층별 백오피스는 얘기 안 해도 당연히 있었어야") 수용 → 근본원인(노드만 만들고 역할 간 엣지·KPI 연결을 PO가 짚을 때마다 메움) + 재발방지 3종 점검 기록.

**왜 그렇게 했는지:**
- #202 prod 트리거를 빈 커밋으로 한 이유: 이미 main에 머지됐는데 한도로 빌드만 안 생긴 상태라, 코드 변경 없이 main에 push가 있어야 Vercel이 production을 다시 빌드함.
- 유치 자동집계는 PO가 옵션 중 "완전 자동(병원 확정=유치)"을 선택. 코디 수동 확인 단계를 거치지 않고 카운트되지만 PO가 그걸 원함.
- 새 알림 canary(코디가 단계만 올리고 outcome 누락 감지)는 라이브 검증 불가 + 오발 위험이라 **일부러 안 만듦**(PO 취향: 라이브 검증 필요/위험한 건 보류).

**안 끝났거나 보류:**
- **⚠️ Vercel 무료 배포 한도 재초과(2026-06-21)** — 이번 세션에 #202 prod 트리거 + PR #207 프리뷰 빌드들로 하루 100건을 또 넘김(`api-deployments-free-per-day`). **PR #207(병원확정→유치 자동집계)은 코드·테스트 완료·푸시됐으나 prod 미반영.** PO 결정대로 유료 전환 없이 **2026-06-22 한도 리셋 후** 머지·배포. (#202는 이미 prod에 떴으니 OK.)
- **화상 카메라 2명 라이브 확인** — 초대링크 2개 준비됨, PO 폰 2대(또는 1명 추가) 되면 실시.
- **케이스 생애주기 단일 지도 문서**(POSTMORTEMS #18 재발방지) — 다음 세션 권장(단계 × 행동역할/조회역할/갱신KPI 표).

**주의·함정:**
- **유치 자동집계는 prod 미반영(PR #207 미배포)** — 한도 풀린 뒤 머지·배포해야 동작. 그 전엔 병원 converted 해도 유치 카운트 안 오름(코드만 준비됨).
- **데모 #13 상태 변경됨**: 이번 검증으로 #13 리드=`replied`/`case_status=scheduling`로 남겨둠(에이전시 데모로 보기 좋은 상태). TEST 병원/에이전시 데이터라 실데이터 격리됨.
- **화상 데모 세션·초대토큰**은 `consultation_sessions`·`consultation_guest_tokens`에 직접 SQL로 심음(어드민 계정 미생성이라). 48h 후 토큰 만료.
- **배포 한도**: 한 세션에서 prod 트리거+프리뷰가 쌓이면 또 막힘. PR 묶고 배포 남발 금지(PO 취향).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저(2026-06-22 한도 리셋 후):** (a) **PR #207 머지 → prod 배포**(병원확정→유치 자동집계). (b) prod에서 **병원 계정으로 데모 #13(또는 새 리드)을 '치료 확정(converted)'으로 바꿔 점수판 유치 +1 되는지 1회 확인**(`/admin/khidi/conversion`). (c) #160 **화상 카메라 2명 라이브**(초대링크는 핸드오프 본문/이전 메시지, 만료 시 재발급).
2. (권장) **케이스 생애주기 단일 지도 문서** 작성 — 새 기능 "반쪽 금지" 점검 기준.
3. KHIDI 중간평가(2026-08-27) 상시 — 점수판 자동집계가 평가 점수.

**검증 상태:** 이번 변경 **로컬 vitest(caseStatus 10·khidi 59) 통과 / tsc 0 / `next build --webpack` 통과**. **#202: prod 배포 READY + 병원→코디·에이전시 역방향 prod 실검증 완료(API+DB 확인).** **PR #207(유치 자동집계): 코드·테스트 완료·푸시, GitHub CI(`ci`·`Smoke`) 마지막 확인 시 진행 중(머지 전 초록 재확인 필요), ⚠️Vercel prod 미배포(한도).** 점수판 3개 KPI 집계는 실데이터 교차검증으로 정상 확인. **❌ 미검증(다음 세션): PR #207 prod 동작(유치 자동+1) / 화상 카메라 2명 라이브 / cron은 이전 세션에 정상 확인됨.**

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-21 배포검증·KPI) 읽어. 지난 세션에 #202(병원 응답 역방향)는 prod에 배포·실검증 끝냈고, '병원이 치료확정하면 평가점수(유치)에 자동 집계'되게 고친 PR #207을 만들었는데 Vercel 무료 배포한도 재초과로 아직 실서비스 미반영이야. 1) 한도 풀렸으면 PR #207 자동검사 초록 확인하고 머지→배포, 그다음 병원 계정(hospital@test.com/test1234)으로 데모 케이스를 '치료확정'으로 바꿔서 유치 점수판(/admin/khidi/conversion) 유치 숫자가 +1 되는지 prod에서 1회 확인해줘. 2) 화상방 다자 카메라(#160)는 폰 2대 되면 2명 들어가서 카메라 확인(초대링크 만료됐으면 재발급). 3) 여유 되면 케이스 생애주기 단일 지도 문서(단계×행동역할/조회역할/갱신KPI) 만들어서 앞으로 '반쪽 기능' 안 나오게 점검 기준 잡자.

**이번 세션 한 일:**
- **#178 (✅머지·배포): 계정 계층 8종 단일 표준 확정 + 해외 의료기관 신규.** 실제 인증코드(`app_metadata.role`+`hospital_users`+`agency_users`)와 어긋난 유령 역할묶음(`roles.ts`/`user_roles`: korean_hospital/local_clinic/agent) 통일. `src/lib/auth/accountTiers.ts`가 단일 SoR(게스트·환자·코디·의사·관리자·국내병원·해외에이전시·해외의료기관). **해외 의료기관(8번째)** = 에이전시와 기능 동일 → 별도 테이블/포털 안 만들고 `agencies.partner_type`('agency'|'medical_institution') 한 컬럼으로 구분(마이그레이션 `20260621` **prod 적용 완료**, additive). 코디·의사 포털에 역할 문지기(`StaffPortalGate`+`/api/me`) 추가(전엔 로그인만 하면 뚫림). `docs/ACCOUNT_TIERS.md`+가드 테스트 14개.
- **#184 (✅머지·배포): 로그인 후 역할별 포털 착지 + /agency 크롬 정리.** 전엔 로그인 시 무조건 `/patient`로 보내 에이전시가 환자 대시보드를 봄. `src/lib/auth/resolveLanding.ts`(역할→착지경로), `/api/me`가 `landing` 반환, `LoginPremium`이 그걸 보고 분기, `auth/callback`도 역할별. `ClientShell` `isPortalPage`에 `/agency` 포함 → 환자용 헤더·하단탭바(SOS·병원) 숨기고 깔끔한 포털 상단바.
- **#187 (머지됨·⚠️prod 미배포): 프리미엄 환자 대시보드 비환자 가드.** 이미 로그인된 채 `/patient`에 머물면 #184가 안 먹혀서 가드 추가.
- **#191 (머지됨·⚠️prod 미배포): 레거시 환자 대시보드에도 같은 가드.** 환자 대시보드가 **두 버전**인데 디자인 **기본값이 LEGACY**라 실제로 뜨는 건 `PatientDashboardClient`였음 — #187(프리미엄만)으론 안 고쳐져 PO가 "아직 그대로"라 재신고 → 레거시에도 추가. `/api/me` 에이전시 landing=`/agency` **실측 확인**(프리뷰 토큰 호출).
- **#194 (📝DRAFT·배포한도로 프리뷰 못 만듦): 에이전시 '환자 의뢰하기'.** 에이전시 포털이 조회전용이라 직접 환자 의뢰 불가(관리자가 `/admin/khidi/cases`에서 수동 배정해야만 노출)였음. `POST /api/agency/refer`(checkAgencyAuth, 본인 agency_id 강제, PII AES-256-GCM 암호화, case_status='received'+이력+관리자 알림) + `/agency`에 '+환자 의뢰하기' 폼.
- **테스트 계정 6종 생성**(Supabase auth 직접 insert): `patient/coordinator/doctor/hospital/agency/clinic @test.com` / **`test1234`**. agency·clinic·hospital은 **TEST 전용 기관**에 연결(실데이터 격리). **admin은 의도적으로 안 만듦**(test1234 관리자=환자PII 복호화 위험).

**왜 그렇게 했는지:**
- 해외 의료기관은 PO가 8번째 계층으로 "만든다" 결정 → 에이전시 인프라 재활용이 가장 안전·DRY(별도 포털 중복 X).
- #191은 "환자 대시보드가 2개(레거시/프리미엄), 기본이 레거시"란 함정 때문 — 프리미엄만 고치면 안 보임. 둘 다 고쳐야.
- #194는 머지 안 함: **보이는 새 기능 → 프리뷰로 PO 확인 먼저**(PO 취향). 그런데 Vercel 한도로 프리뷰조차 못 만들어 대기.

**안 끝났거나 보류:**
- **⚠️ Vercel 무료 배포 한도(하루 100회) 초과** — 한 세션에서 PR을 많이 만들어 초과. 약 24시간 뒤(2026-06-22) 풀림. **PO 결정: 유료(Pro $20/월) 안 쓰고 2026-06-22까지 무료 대기.** 그래서 #187·#191(머지됨)이 **prod 미반영**(현재 prod=`6bc613b` #187빌드라 #191 없음), #194 프리뷰도 못 만듦.
- **TEST 에이전시에 환자 진행 예시 1건 넣기** — PO가 "넣을까요?"에 답 안 함(데모용, 미실행).

**주의·함정:**
- **Vercel 배포 한도**: 한 세션에서 PR/푸시 남발하면 하루 100 배포 초과 → 프리뷰·prod 다 막힘. PR 묶어서.
- **환자 대시보드 2종**: `PatientDashboardClient`(레거시·**기본값**) + `PatientDashboardPremium`. 환자 화면 손대면 **둘 다** 고쳐라(레거시가 실제로 뜸).
- **`@/*`=`src/*` alias** — `app/` 컴포넌트는 상대경로 import(`StaffPortalGate` 빌드 실패 경험). `case_status_history`는 생성타입에 없어 `(supabaseAdmin as any)`.
- **squash 머지 후 같은 브랜치 이어쓰면 충돌**(#184 dirty 경험) → `git fetch origin main` 후 origin/main 기준 새 브랜치, 옛 커밋 cherry-pick.
- **테스트 계정**: coordinator/doctor는 실환자 PII 봄 → 외부 에이전시엔 `agency@test.com`만. admin 미생성.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 배포 대기분 먼저 처리(자동 불가):** Vercel 한도 풀렸는지 확인 → (a) **#194 프리뷰 빌드되면 PO에게 '환자 의뢰하기' 화면 보여주고 OK받고 머지** (b) **#187·#191이 prod 반영되게 main 배포 트리거**(#194 머지가 곧 트리거, 아니면 빈 커밋). (c) prod에서 **에이전시 로그인→/agency·자동튕김·의뢰 폼 end-to-end 1회 실클릭 확인**(`agency@test.com`/`test1234`).
2. (선택) PO가 원하면 TEST 에이전시에 환자 진행 예시 1건 넣어 데모.
3. 직전(2026-06-21 저녁) 미검증분 그대로: 화상방 다자 카메라(#160)·만족도/침묵 알림 수신(데이터 쌓여야).
4. KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:** 각 변경 **로컬 tsc 0 / eslint 0 error / next build --webpack 통과**. vitest accountTiers 14개 추가(#178 때 총 259). **#178·#184: CI(`ci`·`Smoke`) 초록 + squash 머지 + prod 배포 확인.** **#187·#191: CI 초록 + 머지됐으나 ⚠️prod 배포 실패(Vercel 한도) → prod 미반영.** **#194: DRAFT, 로컬 빌드만 통과, 프리뷰/CI 미생성(한도).** 마이그레이션 `20260621`(agencies.partner_type) prod 적용·확인. `/api/me` 에이전시 landing=`/agency` 실측 확인. **❌ 미검증: #194 화면(프리뷰 못 만듦) / #191 prod 동작 / 에이전시 의뢰 end-to-end(폼→DB→목록) — 전부 2026-06-22 배포 후.**

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-21에 Vercel 배포 한도(하루 100회)에 걸려서 #187·#191(머지됨)이 실서비스에 아직 안 올라갔고 #194(에이전시 '환자 의뢰하기')는 초안 상태야. 한도 풀렸는지 확인하고: ①#194 프리뷰 만들어서 나한테 '환자 의뢰하기' 화면 보여주고 OK받으면 머지 ②#187·#191도 실서비스 반영되게 배포 트리거 ③에이전시 계정(agency@test.com / test1234)으로 로그인→에이전시 화면·환자 의뢰 폼 실제 작동 1회 확인해줘.
## 🔖 세션 핸드오프 (2026-06-21 심야) — AI 챗 "대장암 단정·정정 무시" 버그 코드강제 수정(#183·#188) + 재발방지 행동점검(#193) + Vercel 무료플랜 일일 배포한도(100/day) 초과로 prod 배포 지연

**이번 세션 한 일:** (PR 3개 모두 ✅머지)
- **🔴 AI 챗 핵심 버그 수정 — PO 신고**: PO가 /inquiry AI Agent에서 ① 암종을 안 밝혔는데 AI가 "대장암"으로 멋대로 단정, ② "대장암 아니라고" 정정해도 계속 대장암 우김, ③ 모델 내부 사고("Wait, let's keep it short"·"(32 words)")가 답변에 노출 — 스크린샷 신고.
  - **원인(DB 실측)**: 데이터 편중 아님(treatments·hospitals·rag 모두 대장암 0건). 그 스레드 앞부분에서 PO가 "대장암 치료법"을 6번+ 반복 → 대화기록에 깔린 옛 화제를 generic 질문에 **단정으로 끌고 오는 over-anchoring** + 정정 수용/최종출력 규칙 부재.
  - **#183 (1차, 프롬프트)**: `buildSystemPrompt`에 행동가드 3종(현재 메시지 안 밝힌 암종 단정 금지·정정 즉시 수용·최종메시지만 출력) + `systemPromptGuards.test.ts`. → **프리뷰는 됐지만 누적 스레드(대장암 6회+)에선 안 꺾임**(프롬프트는 확률적 LLM에 best-effort).
  - **#188 (2차, 코드 강제)**: 순수모듈 `src/lib/chat/topicGuards.ts` 분리(`mentionsCancerType`·`isTopicCorrection`·`correctionReply` 6언어) → 두 응답경로에서 **정정 감지 시 모델 미경유로 결정적 사과+재질문(화제 100% 리셋)** + 암종 미명시 시 프롬프트 최상단 강제 차단. `topicGuards.test.ts` 15개(PO 실패 문장 전부 검출·오탐 방지). **#188 프리뷰에서 before→after 100% 작동 확인.**
- **🟢 #193 재발방지 (PO 요청 "그냥 고치지 말고 앞으로 이런 일 없게")**: `scripts/check-ai-behavior.mjs`(`npm run check:ai-behavior [URL]`) — 실제 라우트로 적대적 대화(대장암 누적→정정→generic→영어정정) 재생해 invariant(정정 후 암종 언급 0·사과 수용) 자동 감지. **#188 프리뷰에 돌려 통과 확인.** POSTMORTEMS #15(1·2차) 기록.
- **만족도 설문 테스트 셋업(아침)**: 테스트 문의 #12(inquiry_id 12)+완료 상담(session `f0a36145-b593-4ded-a36d-ccd898a087e0`, updated_at `2026-06-20 06:00 UTC`)을 09:00 UTC cron 윈도(완료 후 24~30h)에 맞춰 심음. 이메일=`bonroi2296@gmail.com` 평문(decryptMaybe 통과). **→ 09:00 cron이 발송 안 함(설문 0건+cron 런타임로그 0).**

**왜 그렇게 했는지:**
- AI 챗 행동은 의료서비스 기본기라 PO가 직접 신고 → 끝까지(코드강제+테스트+행동점검) 수정. UI 레이아웃 변경 아니고 AI 응답 행동 교정이라 프리뷰로 보여주고 #183은 PO OK("바로 합쳐 배포"), #188·#193은 저위험(테스트·CI 초록)이라 머지.
- **프롬프트→코드 전환이 핵심 교훈**: "반드시 지켜야 할 AI 행동"은 프롬프트(부탁)가 아니라 코드 게이트(결정적 분기)로 강제해야 함. #183이 누적 스레드에서 깨진 게 증거.

**안 끝났거나 보류 (⚠️ 둘 다 인프라/타이밍 — 코드는 끝):**
- **#188이 본서비스(prod)에 아직 안 떴음 — 진짜 원인 = Vercel 무료플랜 일일 배포 100건 한도 초과**: 머지·검증 다 됐는데 2026-06-21에 여러 세션이 PR을 쏟아내 **Vercel 무료플랜 일일 배포한도(100/day)를 넘김**(에러 `api-deployments-free-per-day` → "try again in 24 hours"). 그래서 c9b9bb3·afec814(main HEAD)의 production 배포가 **아예 생성도 안 됨**(새 배포 전면 차단). **24시간 지나 한도 리셋되면**, 다음 main 변경 시 자동 배포로 #188 올라옴. 즉시 원하면 **Pro 업그레이드(유료)** — PO 결정 사항(돈). 이 클라우드 env엔 Vercel CLI 없고 main 직접 푸시 불가라 어시스턴트가 강제 못 함.
- **만족도 설문 cron 미발송**: 09:00 UTC dispatch-surveys가 안 돔(또는 로그 미수집). 2026-06-21 배포 혼잡 영향 가능. KHIDI K-03 직결이라 **cron이 매일 진짜 도는지 점검 필요.** 테스트 상담은 2026-06-21 12:00 UTC까지만 윈도 내.

**주의·함정:**
- **prod 현재 = #187(6bc613b)**, #188 없음. healo-khidi.vercel.app에서 정정 테스트하면 아직 옛 동작(모델이 사과하되 대장암 언급)일 수 있음 → **#188 떴는지 확인법: 정정 시 "앗, 죄송합니다. 제가 잘못 짚었어요. 말씀하지 않으신 내용을…"(고정 문구) 나오면 #188 라이브.**
- **AI 챗 테스트는 일일 회수제한(aiGuard) 소모** — 2026-06-21 어시스턴트가 많이 때려 `ai_daily_limit` 걸림. prod 확인은 한도 회복 후(2026-06-22 이후).
- `topicGuards.ts`는 server-only 아님(테스트 위해). 정정 패턴은 "A 말고 B"(새 화제) 제외 — 순수 부정만.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인:** (a) **prod에 #188 떴는지** — healo-khidi.vercel.app/inquiry에서 대장암 여러 번→"난 대장암 안 물어봤는데?" → 고정 사과문구 나오면 OK(안 떴으면 Vercel 대시보드 c905ed5 Promote to Production). (b) **만족도 설문 cron이 매일 도는지** — Vercel cron 로그/`reminders_scheduled` 확인, 안 돌면 KHIDI K-03 위해 수리(테스트 상담 다시 윈도 맞춰 심기).
2. `npm run check:ai-behavior https://healo-khidi.vercel.app` 한 번 돌려 prod 행동 자동 점검(한도 회복 후).
3. KHIDI 중간평가(2026-08-27) 상시 — 설문(K-03)·사후관리 알림 작동 복구 직결.

**검증 상태:** **PR #183·#188·#193 셋 다 CI(`ci`·`Smoke`) 초록 + squash 머지**(main에 2964b19·c9b9bb3·afec814). 로컬 **vitest 279개(+29) / tsc 0 / check:content / next build --webpack** 통과. **#188 프리뷰에서 정정→사과리셋·generic 암종0·영어정정 before→after 실측 통과**(check-ai-behavior도 프리뷰 통과). **❌ 미검증(인프라/타이밍): prod 본서비스 #188 미반영(Vercel 무료 빌드큐 백로그) / 만족도 설문 cron 09:00 미발송(원인 미규명) / prod 챗 행동 실클릭(일일한도).** 열린 PR: 내 것 없음(셋 다 머지).

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-21 심야) 읽어. 지난 세션에 AI 챗 "대장암 멋대로 단정·정정 무시" 버그를 코드로 강제 수정(#188)하고 재발방지 점검(#193)까지 머지했는데, Vercel 무료플랜 일일 배포한도(100/day)를 2026-06-21에 초과해서 본서비스 배포만 안 떴어(24h 뒤 리셋되면 자동으로 올라옴). 1) healo-khidi.vercel.app/inquiry에서 대장암 여러 번→"난 대장암 안 물어봤는데?" 쳐서 "앗, 죄송합니다 제가 잘못 짚었어요…" 고정 문구 나오면 #188 라이브(안 나오면 Vercel 대시보드에서 c905ed5를 Promote to Production). 2) 만족도 설문 09:00 cron이 2026-06-21 발송을 안 했어 — Vercel cron 로그/reminders_scheduled 확인해서 매일 진짜 도는지 점검(KHIDI K-03 직결). 3) ai_daily_limit 회복됐으면 npm run check:ai-behavior로 prod 자동점검.

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
