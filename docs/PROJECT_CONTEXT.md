# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-29 밤늦게 — 다국어 전수조사: 환자 포털 한국어 하드코딩 6언어화 + 번역 품질(AI 번역투 제거·마케팅 후킹) + 재발방지 가드)

> PO가 "정식 오픈 전 다국어(ko·en·ru·kz·zh·ja 6개어) 제대로 됐는지 **싹다 전수조사**"를 지시("예전에도 내가 찾아서 고치라 했던 게 많다"). 작업 중 PO가 **"AI 특유의 번역투 최대한 제거 + 마케팅적으로 후킹되는 표현"**을 추가 주문. 정적 키 검사(`check:content`)는 통과하지만 **검사가 못 잡는 ①컴포넌트 하드코딩 ②번역 품질**에서 구멍 발견·수리. PR [#459](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/459) (드래프트).

**1. 이번 세션 한 일 (PR #459 — 커밋 3개)**
- **환자 포털 `/patient` 6언어화(가장 큰 구멍)** — 한국어로 완전 고정돼 있던 5개 화면을 `COPY={en,ko,ru,kz,zh,ja}`+`useLang()` 패턴(`MessagesClient.jsx` 기준)으로 전환. 파일: `consultations/PatientConsultationsClient`·`cost-estimates/CostEstimatesListClient`·`cost-estimates/[id]/CostEstimateDetailClient`·`visa/applications/VisaApplicationsClient`·`visa/applications/[id]/VisaApplicationDetailClient`. **법적 confirm/alert(견적 동의 §15 동의시각·IP 고지, 비자 코디검수)까지 6개어**, 날짜·단위 로케일도 언어별. (병렬 에이전트 5개로 파일별 분담.)
- **공통/정적 화면 하드코딩 수리** — 헤더(`src/components.jsx`) 모바일 `Menu`·`Language`·언어전환 `aria-label`; 암종상세(`CancerDetailClient`) `ITCRN Framework` eyebrow→`SECTION_COPY` 6어; 레거시 치료상세(`TreatmentDetailLegacyClient`) `Equipment Used`→`detail.equipmentUsed`; 문의 퍼널 완료화면(`UnifiedInquiryFunnel`) `lang==="ko"?` 삼항→`tl("backHome")`. 신규 글로벌 키 4개·`itcrnEyebrow`·`backHome` 6어 추가.
- **번역 품질(AI 번역투 제거·마케팅 후킹)** — `src/lib/i18n/index.js`: RU `консьерж-сервис`(호텔식 직역)→`личный медицинский сопровождающий`, aftercare `послеоперационный`(수술후 오역)→`после лечения`; KZ coordinator 표기 **전 환자흐름 `Координатор`로 통일**(`Үйлестіруші` 혼용 제거 — 포털·`_roomCopy`·survey·faq·`immuneCancerDetails`·메시지·챗), `Сілтеме ID`(기계번역투)→`Өтінім нөмірі`, `Алаңдаушылық`(불안감 오역) 수정; ZH `礼宾`→`顾问`; JA CTA `取得`→`受け取る`·`お越しの理由`/`つなげてください` 직역투 수정·コンシェルジュ 표기 통일.
- **재발방지 가드** — `scripts/check-content-consistency.mjs` §7 신설: `app/patient` 클라이언트 컴포넌트가 한국어를 코드(주석 제외)에 쓰는데 `useLang()`·글로벌 `t()`·인라인 다국어객체(`kz:`/`ru:`) 중 아무것도 없으면 CI 실패. 이번에 깨졌던 부류(`useLang` 미사용)를 영구 차단.

**2. 왜 그렇게 했는지**
- **글로벌 DICTIONARY가 아니라 파일내 COPY 패턴 사용**: 환자 포털은 원래 `MessagesClient`처럼 파일 상단 `COPY={6개어}`+`useLang()` 컨벤션을 씀(글로벌 `t()` 사전과 별개). 기존 컨벤션을 따라야 일관 → 글로벌 사전에 40키 욱여넣지 않고 파일별 COPY로.
- **"FAQ" eyebrow는 안 건드림**: 6개어 웹에서 통용되는 Latin 약어 액센트라 의도적 유지(번역하면 아래 제목과 중복돼 디자인 악화). "ITCRN Framework"의 'Framework'·"Equipment Used"만 번역대상.
- **KZ coordinator를 `Координатор`로 통일**: 둘 다 맞으나 KZ 품질검토가 의료맥락 차용어가 더 통용된다고 판단 + 한 환자흐름에서 두 표기 섞이는 게 진짜 문제 → 차용어로 통일.
- **번역투 수정은 환자 첫화면(hero/cta/가치제안)에 집중**: 폼 라벨·기능명은 정확하면 안 건드림(과잉수정 회피). 언어별 원어민 카피라이터 관점 에이전트로 검토 후 적용.
- **가드 오탐 회피**: `kz:`/`ru:` 인라인 키 존재를 통과신호로 추가 — 정상 다국어 라벨객체(`layout.jsx` 등)가 오탐으로 안 걸리게(테스트로 확인).

**3. 안 끝났거나 보류**
- **PR #459 미머지** — 드래프트. 마케팅 카피 톤 변경 포함이라 PO 비동기 검토 대상(규칙). PO가 "마무리되면 핸드오프해"라 해서 머지 전 핸드오프 작성. **머지 여부는 PO 결정 대기**(직전에 버튼으로 "지금 머지 / 프리뷰 보고 결정 / 가드부터" 물었고 PO가 "가드부터" 선택 → 가드 완료 → 머지/프리뷰 재확인 필요).
- **POSTMORTEMS 기록 안 함** — 이번 전수조사 발견(환자포털 하드코딩)을 `docs/POSTMORTEMS.md`에 1건 기록하는 4단계 마무리가 남음(가드는 이미 넣음). 머지 후 추가 권장.
- **에이전시 포털·AI챗 백엔드 KZ coordinator 표기는 미통일** — `app/agency/PartnerPortal.jsx`·`src/lib/chat/{generateReply,contactGate,publicChatHelpers}` 의 `Үйлестіруші` 잔존. 맥락 다름(직원 대상)·AI 프롬프트 영향 리스크라 의도적으로 남김.

**4. 주의·함정**
- **환자 포털 5파일은 병렬 에이전트가 편집** — 자가 보고로는 깨끗하나, 머지 전 프리뷰에서 ru/kz로 각 화면 실제 렌더 확인 권장(특히 법적 confirm/alert 문구·날짜 포맷).
- **`useInquiryForm.js`는 죽은 코드** — 영어 하드코딩 검증문구가 있으나 어디서도 import 안 됨(활성 퍼널은 `UnifiedInquiryFunnel`의 자체 `T`/`tl` 사용). 그래서 미수정.
- **가드는 `app/patient`만 스코프** — 다른 환자노출 영역(`/inquiry` 등)은 자체 i18n 패턴이라 가드 미적용. 같은 사고가 다른 디렉토리서 나면 가드 확장 필요.
- **node_modules는 이 환경에 없었음** — `npm ci`로 설치 후 빌드함(원격 컨테이너 특성).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저 확인:** PR #459 프리뷰(`healo-khidi-git-claude-multilingual-aud-77b18e-bonrois-projects.vercel.app`)에서 **ru/kz로 로그인해 `/patient`의 원격협진·견적(목록/상세)·비자(목록/상세)** 6언어 렌더 + 법적 confirm/alert 문구를 눈으로 확인(로그인 필요해 자동검증 불가). 홈 hero/cta 바뀐 카피도 ru/kz/zh/ja로 톤 점검.
2. **PR #459 머지** — 위 확인 OK면 머지·배포(CI는 `ci` 초록).
3. **POSTMORTEMS 1건 기록** — 환자포털 하드코딩 누락(왜 못 잡았나=키 패리티검사가 파일내 인라인 한국어를 못 봄 / 어떻게=COPY+useLang화 / 재발방지=check:content §7 가드).
4. (여력) 직전 세션(#431) 미검증분: AI챗 드래그앤드랍·1차소견·진료의뢰패킷·전환집계.

**6. 검증 상태**
- ✅ `next build --webpack` 성공(전 라우트) · `check:content`(새 가드 포함)·`check:i18n`(ru/kz 508키 100%)·`check:cancer-i18n` 통과.
- ✅ 가드 자체 검증: 현재 트리 통과 + consultations를 옛 하드코딩으로 되돌리면 정확히 검출 + `layout.jsx` 오탐 0.
- ✅ 프리뷰 라이브 확인(공개 페이지): 헤더 새 라벨 `Сменить язык` RU 렌더 + 옛 직역 `консьерж-сервис` 0건.
- ✅ 환자 포털 5파일 한국어 누출 0(렌더부 스캔) — 단 **로그인 화면이라 실제 클릭 검증은 못 함**(5-1번으로 승격).
- **PR/CI 상태(확인함)**: PR **#459 열림(드래프트)**. CI `ci`=success ✅, `Smoke Tests (PR)`=핸드오프 작성 시점 in_progress(직전 동일 런타임 커밋에서 success였음), E2E/Nightly=PR 대상 아님(skipped). **미머지**.

**7. 다음 세션 첫 프롬프트**
> 먼저 `docs/PROJECT_CONTEXT.md` 최상단 핸드오프를 읽어. 다국어 전수조사(PR #459, 드래프트) 마무리하는 차례야. ①프리뷰에서 ru/kz로 로그인해 `/patient`의 원격협진·견적·비자 화면이 6개어로 제대로 뜨는지(특히 견적 동의·비자 검수 confirm/alert 문구) + 홈 hero/cta 바뀐 카피 톤 눈으로 확인 ②OK면 #459 머지·배포 ③`docs/POSTMORTEMS.md`에 환자포털 하드코딩 누락 1건 기록(재발방지=check:content §7 가드). 못 한 검증은 솔직히 "검증 못 함"이라 말해.

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
