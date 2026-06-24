# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-24 저녁 — 환자↔코디 상호작용 전반 정리 + 메시지 화면 재작성)

> 긴 세션. 환자↔코디 통로를 검토하며 PO 피드백을 연속 반영. **머지·배포 완료: [#326](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/326)[#329](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/329)[#331](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/331)[#333](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/333)[#337](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/337)[#340](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/340)[#342](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/342).** 핵심 교훈: 같은 파일(메시지 화면)을 다른 세션(#336 에이전시 메신저)과 동시에 만져 머지 충돌 발생 — 병렬 worktree 안 쓴 대가.

**1. 이번 세션 한 일:**
- **#326** 코디→환자 '추가 정보 요청' 카피 검토 + **카자흐어 오타 수정**(`ауруханаmen`→`аурухана мен`, 라틴-키릴 혼입).
- **#329** 상담 초대·리마인더 이메일: **러·카 환자가 한국어 메일 받던 버그**(언어 게이트가 `role==="patient"`만 봤는데 모달은 `role:"guest"`로 발급) 교정 + 계정환자 이메일 폴백. POSTMORTEM #31.
- **#331** 환자 인앱 알림 벨 신설 — `notifications` 테이블 RLS로 브라우저 직접조회(새 API 0). 견적 발행·상담 생성 이벤트 배선(best-effort, try/catch 격리).
- **#333** 에이전시 의뢰 첨부 조회 + 환자/에이전시 문의 구분: 상세/리스트 API에 `attachments`·`agency_id`·`agencies(name)` 추가, `/api/attachments/sign`에 staff 허용, 코디 화면에 첨부 카드+배지. POSTMORTEM #32.
- **#337** 코디 문의 상세에 **진행 단계 인라인 편집**(접수→사전상담→병원검토→…→완료, `/api/admin/khidi/cases` 재사용) + 흐름순 버튼 정리 + 보험·다중병원배정 UI 숨김(`SHOW_INSURANCE`/`SHOW_HOSPITAL_ASSIGN`=false). **계정 없는 시드 병원 7곳 `is_active=false`(prod DB 적용, TEST 병원만 남김, 가역).**
- **#340 + #342** 코디 메시지 화면 **premium 잔재 제거 → legacy 한국어 재작성** + 자동 스크롤 버그(폴링이 5초마다 맨아래로) + **환자(파랑)/AI(보라) 구분** + 입력창 짤림 + 공개 헤더/푸터 제거 + 마지막 메시지 미리보기 + "열림"→"신규".

**2. 왜 그렇게 했는지:**
- **환자/AI 구분 버그 근본원인**: 실제 `chat_messages.actor_type`은 `patient`(환자)·`system`(AI)인데 코드가 `user`/`bot`로 분기 → 둘 다 "시스템"으로 떨어짐. **DB 집계(`patient 352·system 352·agency·coordinator`)로 확인 후 수정**(추측 금물 교훈).
- **메시지 입력창 짤림**: 코디 레이아웃 offset(`pt-12`=48px)이 실제 PortalTopBar(`h-14 md:h-16`=56/64px)와 안 맞고 풀블리드 main이 패딩을 한 번 더 더해 grid가 화면 밖. → offset을 바 높이에 정렬 + grid 높이 브레이크포인트별 정확화.
- **`/coordinator`가 `isPortalPage` 누락**(ClientShell) → 공개 사이트 헤더+푸터가 코디 화면에 붙어 빈 띠·푸터. 추가하니 PortalTopBar만 남음(POSTMORTEM #32 부류).
- **병원 1곳 운영**: PO가 "실제로 TEST 병원 1곳이 다 컨트롤, 나중에 추가" → 다중병원 배정 UI 숨기고 시드 병원 비활성.

**3. 안 끝났거나 보류:**
- **#342 prod 프리뷰 미확인** — Vercel **일일 배포 한도(24h)** 초과(2026-06-24 병렬 세션들이 배포 과다)라 새 프리뷰가 안 떴다. 한도 풀리면 자동 생성. (단 **로컬 dev에 코디 계정 로그인해 실측 검증함** — 아래 6번.)
- 보험·다중병원배정은 **숨김만**(코드 보존). 실제 병원 추가 시 `SHOW_INSURANCE`/`SHOW_HOSPITAL_ASSIGN` true + 시드 병원 `is_active` 되돌리기.

**4. 주의·함정:**
- ⚠️ **같은 파일 동시작업 충돌 재발**: 메시지 화면(`CoordinatorMessagesClient.jsx`)을 #336 에이전시 세션과 동시에 편집 → #340 머지 후 내 후속 수정이 닫힌 PR에 갇혀 main 미반영 → origin/main 머지로 충돌 해결 후 #342로 재상정. **다음엔 새 영역은 반드시 worktree 분리.**
- ⚠️ **GitHub Actions 큐 밀림**: 병렬 세션 CI 폭주로 일부 푸시에 ci/Smoke가 트리거 지연/누락됨(빈 커밋 재트리거 무용 — paths 필터). 열린 PR이면 결국 돈다.
- ⚠️ **프리뷰 자동화 로그인**: 로컬 dev는 코디 계정 로그인 후 SSR 쿠키가 붙어 검증 가능했음(이번에 성공). 단 타이밍 민감(로그인→충분히 대기 후 이동).

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: Vercel 한도 풀리면 **prod/프리뷰에서 코디 메시지 화면**(환자 파랑/AI 보라 구분·입력창 안 짤림·푸터 없음) + **#337 코디 문의 상세 진행단계 인라인**·**#333 에이전시 첨부 열람**을 실제 클릭으로 최종 확인. (로컬 실측은 했으나 prod 미확인)
2. 보험·병원배정 재활성 시점이 오면 플래그 + 시드 병원 `is_active` 복구.
3. (선택) 메시지 API가 요청마다 인증조회+권한쿼리+메시지쿼리 3연속이라 느림 — 포털 공통 인증 캐싱은 별도 과제.

**6. 검증 상태:**
- ✅ **머지된 PR 전부 CI(ci·Smoke) 초록**: #326·#329·#331·#333·#337·#340·#342. `next build --webpack` exit 0 · `check:content` 통과.
- ✅ **실DB 검증**: actor_type 값 확인(patient/system), 에이전시 문의 #20 첨부 5건·조인, 시드 병원 7곳 비활성.
- ✅ **로컬 dev 실측(코디 로그인)**: 메시지 화면 환자(🙋 파랑)/AI(🤖 보라) 구분 렌더, 입력창 화면 안 완전노출(gridBottom=winH), 공개푸터·설치배너 없음, 콘솔 에러 0. (md 961px 창 기준 — lg는 동일 구조)
- ❌ **prod 런타임 미확인**: Vercel 일일 배포 한도로 #342 새 프리뷰 못 띄움 → 5번 1.
- 열린 PR: 이 세션 기준 없음(전부 머지). 다른 병렬 세션 PR은 별도.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24 저녁에 환자↔코디 상호작용(추가정보요청·상담알림·인앱벨·에이전시첨부·문의 진행단계 인라인·메시지 화면 재작성)을 #326~#342로 다 머지·배포했어. Vercel 배포 한도 때문에 #342(코디 메시지) prod 프리뷰를 못 봤으니, 한도 풀렸으면 **코디 계정으로 로그인해 메시지 화면(환자 파랑/AI 보라 구분·입력창 안 짤림·푸터 없음)** + 문의 상세 진행단계 인라인 + 에이전시 첨부 열람을 실제로 확인해줘. 보험·다중병원배정은 일부러 숨긴 상태(SHOW_INSURANCE/SHOW_HOSPITAL_ASSIGN=false, 시드 병원 비활성)니 건들지 마.

## 🔖 세션 핸드오프 (2026-06-24 늦은오후 — 국내 의료기관(병원) 백오피스 강화 2건)

> 병원 포털(`/hospital`) 테스트 중 PO 피드백 반영. ①콘텐츠 메뉴 비활성 + 대시보드 '경영 현황판'화 [#335] ②리드 상세에 임상 판단 패킷 + 원격협진 가능시간 코디 전달 [#338]. **둘 다 머지·프로덕션 배포됨.** 단 실데이터가 데모 리드 1건뿐 + 로컬 SSR 쿠키 로그인 자동화가 막혀 **시각 런타임 검증은 못 함**(빌드·CI는 초록).

**1. 이번 세션 한 일:**
- **[#335](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/335) 머지·배포 — 비활성 + 대시보드 경영현황판화**: 「병원 정보」·「시술 카탈로그」 메뉴 비활성(`app/hospital/_components/featureFlags.js`의 `HOSPITAL_CONTENT_ENABLED=false` 한 값 토글, 직접 URL 접근도 대시보드로 redirect, 코드는 보존). 대시보드를 **응답대기·전환율·평균 첫 응답시간·확정 견적합계(예상매출) KPI + '응답 필요' 할 일 큐**로 재편(리드 목록과 차별화). 리드 화면에 **검색·정렬·CSV 내보내기** 추가.
- **[#338](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/338) 머지·배포 — 리드 임상 상세 + 원격협진 가능시간**: 리드 상세를 원본 의뢰에서 끌어온 **임상 패킷**으로(신설 `GET /api/partner/leads/[id]`) — 환자명·국적·언어·**암종·병기·진단일·현재치료상태·방한시기·보험·환자가 쓴 메시지(복호화)·첨부 의료기록(signed URL)**. 이메일·전화·연락처는 미노출. + **원격협진 가능 시간 슬롯**(datetime-local) 입력 → `hospital_leads.metadata.consult_slots` 저장 + `case_status_history` 타임라인에 "📹 원격협진 가능시간: …(KST)"로 코디에게 전달.

**2. 왜 그렇게 했는지:**
- **비활성**: 공개 프론트(`/hospitals`·`/treatments`)가 병원 자가입력 콘텐츠를 노출할 준비가 안 됨 → 메뉴만 끄고 코드 보존(나중에 플래그 1값만 `true`).
- **임상 패킷**: PO 지적 "병원이 시술·국가만 보고 견적·치료가능 여부를 못 판단한다" → 원본 `inquiries`에서 복호화(`decryptInquiryForAdmin`)해 노출. 신원 PII는 가리되 **이름은 PO 결정으로 노출**("병원이 식별 필요").
- **코디 전달 채널 재사용**: 새 알림을 만들지 않고 코디가 이미 보는 `case_status_history`에 남김(에이전시 '화상상담 요청' #330과 동일 패턴 — 일관성).

**3. 안 끝났거나 보류:**
- 둘 다 머지·배포 완료라 보류 코드는 없음. **후속 = 데이터가 쌓인 뒤 KPI·임상 패킷이 실제로 채워져 보이는지 확인**(현재 데모 1건).

**4. 주의·함정:**
- ⚠️ `partner/leads/[id]` GET의 inquiries 조회는 **`(supabase as any)` 캐스팅** — 생성된 DB 타입이 일부 컬럼(`cancer_type`·`preferred_language` 등)에 stale이라 typed 클라이언트가 막음(에이전시 라우트와 동일 우회). 타입 재생성 전까지 유지.
- ⚠️ **환자 메시지는 자유텍스트** — 환자가 본문에 이름·연락처를 적었으면 병원에 노출될 수 있음(구조적 PII 컬럼은 가림). PO는 이름 노출 OK 결정함.
- ⚠️ **로컬 SSR 쿠키 로그인 자동화 불가** → 병원/코디 포털 시각검증은 Vercel 프리뷰/프로덕션에서 PO가 직접(자격증명은 정상 확인). [[verify-authgated-portal]]

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: 프로덕션에서 병원 계정(`hospital@test.com`)으로 그 **stomach/KZ 리드**를 열어 — 이름·암종·병기·환자메시지·(있으면)첨부가 뜨는지 + **원격협진 가능시간 입력·저장 → 코디 케이스 타임라인에 KST로 전달**되는지 실클릭 확인.
2. (선택) **#335 반성문 1줄**: 리드 상세를 처음 얇게 만든 누락을 `docs/POSTMORTEMS.md`에 기록(PO가 "이걸로 판단되겠냐"고 직접 지적했음).

**6. 검증 상태:**
- ✅ 두 PR 다 `next build --webpack` exit 0 · CI(`ci`·`Smoke Tests`·`Vercel`) 초록 · squash 머지 · 프로덕션 배포.
- ❌ **시각 런타임 미검증**: 실데이터 데모 1건 + 로컬 로그인 자동화 막힘 → 다중주체(병원↔코디) 실클릭 못 함. 데이터 경로·복호화·타임라인 relay 로직은 코드로 확인. → 5번 1.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24 늦은오후에 병원 백오피스 2건(#335 콘텐츠메뉴 비활성+대시보드 경영현황판, #338 리드 임상상세+원격협진 가능시간)을 머지·배포했는데 실데이터가 데모 1건뿐이라 시각검증을 못 했어. 프로덕션에서 hospital@test.com 로 stomach/KZ 리드 열어서 ①이름·암종·병기·환자메시지·첨부 뜨는지 ②원격협진 가능시간 입력·저장 → 코디 케이스 타임라인에 KST로 전달되는지 확인해줘.

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
