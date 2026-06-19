# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-19 저녁) — 문의(/inquiry) UI 분석·수정: AI 채팅 마크다운·대화영역 확대 + 일관성 (PR #83)

**이번 세션 한 일 (PR [#83](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/83) 같은 브랜치에 누적, 커밋 `ba94a88`·`c4cd2e3`):**
- PO가 모바일 `/ko/inquiry` 스크린샷 4장(+콘솔)을 주며 "뭐가 이상한지 직접 분석해서 개선점 알려달라" → 코드 대조로 진단 후 수정.
- **AI 채팅 마크다운(서식) 렌더링** (`app/inquiry/MessageContent.jsx` 신규): 기존엔 `ThreadChat.jsx`가 `whitespace-pre-wrap`로 raw 출력 → AI가 쓴 `*`·`**`·`-`·`###`가 기호 그대로 노출(러시아어 면책문구 별표가 증거). 외부 의존성 없이 React 노드만 만드는 경량 렌더러(굵게/기울임/코드/링크/불릿·번호목록/제목, XSS 안전) 신설, 어시스턴트 말풍선에만 적용.
- **Human Agent 카드 카피 현실화**: "WhatsApp·Telegram·WeChat·LINE 직접 연결"로 4채널 광고했으나 실제 WhatsApp만 작동(나머지 준비중) → 중립 카피로(6언어).
- **AI 채팅 대화영역 확대(PO 핵심 요청)**: 아바타 아이콘(Bot/User 원형) 제거, AI 응답=전체 폭(말풍선 없이), 사용자 메시지=우측 teal 말풍선(좌측 여백 구분), 폰트 14→13px, 패널 패딩 축소. 채팅 컨테이너 `rounded-3xl`(DESIGN 금지토큰)→`rounded-2xl`·`shadow-lg` 교정. 미사용 `User` import 제거.
- **일관성(PO가 #2·#3만 선택)**: 모드 카드 3색(teal/green/blue)→**teal 단일 통일**(구분은 아이콘/카피로, DESIGN "색만 다른 동일카드=AI느낌" 해소). 카드 패딩 p-6→p-5, 뒤로가기 버튼 여백 통일, 전환 duration-200.

**왜 그렇게 했는지:**
- PO 새 작업방식: "내가 하나하나 지시하면 그것만 하니, 네가 직접 분석해서 개선점 제시하고 내가 취사선택" → 진단 리포트 6건 제시 후 PO가 골라서 적용(#2·#3+채팅재설계 선택, #1·#4·#5·#6 보류).
- 채팅 재설계 레퍼런스 = Claude/ChatGPT 모바일 패턴(아바타 없이 AI 전체폭, 사용자 우측 들여쓰기). PO가 "이 인터페이스처럼 대화영역 넓게, 폰트 약간 작게"라고 명시.
- 마크다운은 라이브러리(react-markdown) 대신 자작 — 번들·공급망 리스크 회피 + 채팅엔 인라인+목록이면 충분.

**안 끝났거나 보류:**
- **분석했으나 PO가 보류한 UX 항목 4개** (원하면 재개): #1 모드카드 제목 영어("AI Agent" 등)→네이티브 번역, #4 Human Agent 동선 단순화(WhatsApp만이면 바로 연결/활성채널만), #5 폼 이메일 필수→이메일|전화 택1 완화, #6 폼 선택필드 정리.
- **PR #83 미머지(초안)** — AI 품질 + 문의 UI가 한 PR에 섞임(브랜치 지정 때문). PO 검토 후 Ready→머지.
- (이전) 유령 시드 파일(20260519) 정리 여부 / Gemini 유료 / 도메인 컷오버.

**주의·함정:**
- **PR #83 스코프 혼합**: "AI 품질(규칙0층+회귀)" + "문의 UI 개선"이 한 PR. 리뷰 시 커밋 단위로 봐야 함(`64e017f` AI품질 / `ba94a88`·`c4cd2e3` UI).
- **채팅 아바타 제거**: 이제 AI=전체폭 평문, 사용자=우측 teal버블로만 구분. 구분 약하다 싶으면 AI쪽에 옅은 라벨/배경 추가 검토(PO가 미세조정 요청 가능).
- `MessageContent`는 표·이미지·중첩목록 미지원(의도). AI가 표를 쓰면 raw로 보일 수 있음 → 필요시 확장.
- DESIGN.md는 guide_only지만 PO가 "이 UI 고쳐"라고 명시해 기존 페이지 변경 정당화됨.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인**: 문의 UI 변경의 **라이브 미리보기 클릭 검증 못 함** — 미리보기 URL(healo-khidi-git-claude-article-analysis-7a2dfa-bonrois-projects.vercel.app/ko/inquiry)에서 채팅 폭·폰트·구분·마크다운 렌더·모드카드 색을 실제로 봐야 함. + PR #83 **CI 초록 여부** 확인 후 머지.
2. PO 미세조정 가능성(폰트 더↓·사용자 말풍선 여백) 대기.
3. 보류한 UX 4개(#1·#4·#5·#6) 중 PO가 추가 지시하면 진행.
4. (이전 트랙) 유령 시드 정리 / Gemini 유료 / 도메인 / 종료문지기 관찰.
5. KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:** ✅ `next build --webpack` 통과(2회) · ✅ `check:content` 통과(i18n 6언어 패리티 OK) · ✅ AI품질 트랙 `test:safety` 25/25·DB 44개 적용. **PR/CI**: PR #83 열림(초안), Vercel 미리보기 빌드 반복 성공(Ready 관측). **미검증**: ①문의 UI 라이브 클릭(채팅 폭·마크다운·색) 직접 확인 못 함 ②PR #83 ci·Smoke 워크플로 최종 초록 ③AI채팅 end-to-end(위반→경보). → 1번으로 승격.

---

## 🔖 세션 핸드오프 (2026-06-19 늦은오후) — AI 품질: 규칙기반 안전 0층 + 다국어 안전 회귀 커버리지 (PR #83 초안)

**이번 세션 한 일 (PR [#83](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/83) 초안·미머지, 커밋 `64e017f`):**
- 직전 분석(아래 "오후" 블록)에서 찾은 **진짜 구멍 2개**를 PO "싹다 해" 지시로 둘 다 구현.
- **[A] 규칙기반 안전 0층 신설** — `src/lib/chat/safetyGuard.ts`(신규, 순수 모듈=server-only 아님). 완치 보장·약물 용량·예후(생존율) 수치를 6개 언어(ko·en·ru·kz·zh·ja) **정규식으로 확정 탐지**. critical 적중 시 안전·overall 점수에 **바닥(floor: safety≤0.2, overall≤0.3)** 강제 → LLM 판사(judge)가 놓쳐도 0.6 미만으로 떨궈 코디 경보 보장. `judge.ts`(라이브)·`scripts/run-regression-tests.ts`(회귀) 둘 다에 연결. 자가검증 `scripts/test-safety-guard.ts`(신규, `npm run test:safety`) 25케이스(위반17+오탐방지 정상8) 전부 통과.
- **[B] 다국어 안전 회귀 커버리지** — `migrations/20260619_ai_regression_multilang_safety.sql`(신규). **라이브 DB 점검 결과 중국어(zh)·일본어(ja)는 안전 시나리오 0개**, 일부 위험 카테고리는 단일 언어뿐이었음. zh·ja에 위험 6종(완치주장·진단·치료선택·약물·생존율·판독·사례보장) 전부 추가 + ru/kz/en/ko 교차 보강. 신규 21개. **DB에 execute_sql로 직접 적용 완료**(23→44개, zh/ja 0→각 7개).
- **문서·스크립트**: `docs/AI_QUALITY_ASSURANCE.md`(Eval 피라미드 3층 명시, 회귀 23/4언어→44/6언어, 규칙 0층 구축완료), `package.json`(test:safety 스크립트).

**왜 그렇게 했는지:**
- **규칙 0층을 LLM 판사 위가 아니라 아래(병합)로**: 기계적으로 100% 잡히는 고위험 패턴은 확률적 LLM에 맡기지 않고 확정적 정규식으로 먼저 막는 게 글(요즘IT)·CLAUDE.md("오류는 기계가 잡는다") 둘 다와 정합. 비용 0.
- **점수 바닥을 safety뿐 아니라 overall까지 강제**: safety만 0.2로 깎으면 가중치(0.35) 때문에 overall이 0.6 위에 남아 경보가 안 뜸 → critical은 overall도 0.3으로 직접 캡.
- **safetyGuard를 server-only 아닌 순수 모듈로**: 회귀 스크립트(scripts/)는 server-only 모듈을 import 못 함 → 서버·스크립트 공용 위해 의존성 0으로 설계.
- **마이그레이션을 DB 컨벤션에 맞춤**: 라이브 DB는 `<category>_<lang>` id·언어코드 `kz`·`redline_*`/`policy_*` 카테고리를 씀(내가 처음 쓴 `safety-*`/`kk` 양식은 폐기하고 맞춤).

**안 끝났거나 보류:**
- **PR #83 미머지(초안)** — PO가 검토 후 "Ready for review" → 머지. CI 결과 확인 필요(아래 검증상태).
- **유령 시드 파일 `migrations/20260519_ai_regression_seed.sql`(105개)이 실제 DB(44개, 다른 양식)와 불일치** — 적용된 적 없는 것으로 보임. 이번엔 안 건드림. 정리(삭제/아카이브) 여부는 PO 판단 대기. PR 본문에도 적어둠.

**주의·함정:**
- **safetyGuard 정규식은 고정밀만**(오탐 방지). 애매한 진단/치료권유는 일부러 LLM 판사에 맡김 — 0층은 "확실한 것만" 잡는 그물. 패턴 추가 시 `npm run test:safety`로 오탐 케이스(정상8) 깨지는지 꼭 확인.
- **키릴 문자에 `\w` 안 먹음**(JS 정규식 비유니코드 모드) — ru/kz 패턴에서 `\w*` 대신 `[^.?!\n]{0,N}` 써야 함(이번에 이 버그로 자가검증 5개 깨졌다 고침).
- **DB 직접 반영함**(execute_sql) — 마이그레이션 파일은 SoR로 커밋했지만, 자동 적용 파이프라인이 따로 없어 보임(5월 시드가 DB에 안 들어가 있던 게 증거). 다음에 시나리오 추가하면 파일만 만들지 말고 DB 적용까지 직접 해야 함.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인**: PR #83의 **CI(자동검사) 초록 여부** 확인 후 머지(이 세션 종료 시점엔 Vercel 미리보기 빌드 중, ci/Smoke 워크플로 아직 안 뜸). + **라이브 end-to-end 미검증**: 실제 채팅에서 위반 답변→점수 바닥→코디 경보까지 가는지 직접 확인 못 함(로직·점수는 단위검증됨).
2. 유령 시드 파일(20260519) 정리할지 PO 결정.
3. (이전 트랙) Gemini 유료 확인 → 회의록 활성화(env `GEMINI_PII_BILLING_CONFIRMED=true`).
4. (이전 트랙) 종료 문지기 실작동 관찰 / 도메인 `healwith.co.kr` 컷오버.
5. KHIDI 중간평가(2026-08-27) 상시 — 이번 AI 품질체계가 "ICT 체계 구축"·"만족도 90점" 어필 재료.

**검증 상태:** ✅ `next build --webpack` 통과(npm ci로 의존성 설치 후) · ✅ `npm run test:safety` 25/25 · ✅ `npm run check:content` 통과 · ✅ DB 적용 확인(총 44/zh 7/ja 7, execute_sql). **PR/CI**: PR #83 초안 생성, 현재 check-run은 `Vercel Preview Comments`(success) 1개뿐 — **ci·Smoke Tests 워크플로는 아직 미실행**(트리거 지연 또는 draft). **미검증**: ①PR #83 CI 최종 초록 여부 ②라이브 채팅 end-to-end(위반→경보) 직접 클릭. → 위 1번으로 승격.

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
