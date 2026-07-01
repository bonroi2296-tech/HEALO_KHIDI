# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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

## 🔖 세션 핸드오프 (2026-07-01 오후 — 디자인 톤 개명(legacy→'기본 톤') + 죽은 premium 이메일 삭제 + 홍보 차별점 자료(한·러·카))

> PO "죽은 premium 이메일 라우트 지워" → 삭제·머지 → "앞으로 premium 톤 안 하지?" → "레거시라는 이름 때문에 헷갈리는 거 아냐? 바꿔줄까?" → 명칭을 '기본 톤'으로 개명(문서·메모리) → "완벽하지? 다시 안 헷갈려?" → 살아있는 문서까지 정정 → "홍보업체가 '왜 HEALWITH를 선택?'을 알려달래, 다른 에이전시랑 뭐가 다른지" → 차별점 자료 작성·톤 다듬기·3개국어·PDF→이미지 → "핸드오프해".

**1. 이번 세션 한 일** (코드 3건 전부 CI 통과 후 squash 머지·배포 + 홍보 파일 산출)
- **죽은 premium 이메일 시스템 삭제 [#539 머지]**: 아무도 안 부르는 `/api/email/send`·`/api/email/preview` + 그것만 쓰던 React Email premium 템플릿(`src/emails/templates.jsx`·`shared.jsx` — 검정+골드+세리프 = DESIGN.md `premium_drift` 위반) 4개 파일(1,028줄) 삭제. 전수 grep으로 죽음 확인(참조=죽은 라우트 자기 자신뿐). 라이브 발송 템플릿(`src/lib/email/*`·`surveyEmailTemplate.ts`, teal 톤)은 안 건드림.
- **활성 디자인 명칭 "legacy 모드" → "기본 톤" 개명 [#560, #561 머지]**: `DESIGN.md` §1·§3·change-history + `CLAUDE.md` 진입점 + `PROJECT_CONTEXT.md` §3(#561) 전부 "기본 톤"으로. "두 모드(legacy/premium)" 틀 폐기 → "단일 디자인 + 금지요소 목록". 이미 삭제된 참조(`src/lib/designMode.js`·`src/legacy-pages/`) 정정. 메모리 `design_mode_premium_legacy`·`feedback_marketing_taste` 갱신.
- **홍보용 차별점 자료 (코드 아님 — 파일 산출물)**: "보통 에이전시 vs HEALWITH" 비교표(상업적 톤, "환자가 궁금한 질문" 프레이밍), **한국어·러시아어·카자흐어 3개국어**. → **바탕화면(Desktop) 저장**: `HEALWITH_차별점_3개국어.pdf`(3p) + `HEALWITH_KO/RU/KZ.png`(여백 제거 이미지). 업체 견적용. 만든 방식 = 스타일 HTML → Edge 헤드리스 print-to-pdf → pypdfium2 렌더 + PIL 여백 크롭.

**2. 왜 그렇게 했는지**
- **죽은 이메일 삭제**: premium 톤이 브랜드 정합성 깨는데 죽어있어 재브랜딩 가치 없고, 남기면 다음 사람이 실수로 되살릴 위험 → 삭제가 정답.
- **개명(파일명은 제외)**: "legacy(옛날꺼)"라는 이름 + 짝 "premium(고급판처럼 들림)"이 "레거시→프리미엄 업그레이드" 정반대 오해를 반복 유발 = premium_drift 근본원인. 근데 컴포넌트 파일명 `*Legacy*` 81개까지 바꾸면 import·이름충돌 위험 큰데 오해 감소엔 0 기여(아무도 파일명 안 읽음) → **규칙서(사람·AI가 읽는 곳)만 정정**. 진짜 방어선은 이름이 아니라 `premium_drift` 검사 + PR 머지 거부(기계 가드).
- **홍보자료**: PO가 업체에 "왜 HEALWITH 선택?"을 줘야 견적 나온다 함. 차별점을 **지어내지 않고 실제 자산**에서만 뽑음(연속 케어·양한방 협진·오기 전 화상상담·모국어·정부과제 KHIDI). PO 피드백 반영: "PII 암호화" 등 전문용어 뺌·"보증보험 1억"은 의무가입이라 자랑소재서 뺌·"알선 아님" 같은 짜친 표현 → 긍정·구체·환자입장으로. 실적 수치 자랑 금지(초기·의료광고법).

**3. 안 끝났거나 보류**
- **홍보자료 카자흐어 "번역 뉘앙스" 원어민 최종검수 권장** — 렌더·뜻은 정상(육안 확인), 마케팅 문구 자연스러움만 현지인이 더 다듬을 여지. 급하면 이대로 발송 가능.
- **PO가 "다시 작업 이어나갈래"** — 다음 작업 미지정(PO 지시 대기). 이 세션 코드 부채는 없음(다 머지).

**4. 주의·함정**
- **자동저장 훅(2분 `git add -A` 자동커밋)이 이번 세션에 여러 번 끼어들어** 편집을 엉뚱한 브랜치(`satisfaction-min-n-env`)·`main`에 얹었음 → 매번 떼내 전용 브랜치로 재정리(#560·#561 정상). 멀티파일 작업 시 브랜치 확인 필수([[autosave_hook_hazard]]).
- **홍보자료 파일은 repo가 아니라 Desktop에 있음**(git에 없음). HTML 원본은 세션 scratchpad(휘발성) → 재생성하려면 이 핸드오프/PDF의 표 내용으로 HTML 재작성.
- **"기본 톤" = 옛 "legacy".** 과거 로그·postmortem·정부과제 변경대장·`archive/`의 "legacy" 표현과 컴포넌트 파일명 `*Legacy*`는 **기록/무해라 그대로 둠**(고치면 사실 왜곡·충돌). 되살리지 마라.

**5. 다음 세션이 먼저 할 일**
1. **PO가 이어서 시킬 작업 대기**(미지정) — 이 세션발(發) 미검증 코드 부채 없음(개명·이메일삭제 다 머지·CI 초록·main 반영 확인).
2. (선택) 홍보자료 카자흐어 원어민 검수 / 6개 언어(영·중·일) 확장 / 업체용 1페이지 브리핑(A) 문서화.
- ※ 타 세션 열린 항목(병원 토글 밀림 실브라우저 검증 #565 / 파트너발굴 #567 프리뷰검증·Assel 권한 / 이메일 DMARC 등)은 각 핸드오프 참조 — 이 세션 영역 아님.

**6. 검증 상태**
- ✅ **PR/CI**: #539·#560·#561 전부 `ci`·`Smoke Tests(PR)` 통과 후 squash 머지(#539는 빌드도 통과). **열린 PR 없음**(내 3건 다 머지·닫힘). `origin/main`에 파일 삭제·개명 반영 grep으로 실확인.
- ✅ **홍보 PDF/PNG**: 3개국어 렌더를 실제 이미지로 **육안 검증** — 카자흐 특수문자(ә·ғ·қ·ң·ө·і) 정상, 네모박스 없음. KO 이미지 여백 제거 확인.
- ❌ **미검증(솔직히)**: 카자흐어 마케팅 문구의 현지 자연스러움(원어민 미검수 — 뜻/렌더는 OK).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-07-01 오후에 ①활성 디자인 명칭을 'legacy'→'기본 톤'으로 개명(#560·#561, 혼란 원인 제거)하고 죽은 premium 이메일 시스템 삭제(#539) ②홍보업체용 'HEALWITH 차별점' 3개국어(한·러·카) 자료를 만들어 바탕화면(Desktop)에 저장(PDF+PNG 3장)까지 다 끝냈어. 코드 부채 없음(다 머지·CI초록). 지금은 PO가 이어서 시킬 작업을 기다리는 상태니 지시 받아 진행해. (홍보자료 카자흐어는 원어민 검수만 남음 — 급하면 이대로 발송 가능.)

---

## 🔖 세션 핸드오프 (2026-07-01 오전 (2) — 병원 지점 토글 밀림 수정 + 의사사진 자체호스팅·신촌 명단 현행화)

> PO 스크린샷 "병원 토글 누르면 밀려버림, 이쁘게 못하니? + 프로필 사진 핫링크 하지 말랬는데 날아간 원인 찾아와 + 워크트리 새로 파고" → 사진 자체호스팅·토글 애니 → "싹 다 병원 사이트 가서 가져와 로컬에 박아둬" → 명단 현행화 → "토글 누르면 스크롤 밀려서 신촌 정보 안 보임, 최적화하라니깐" → pin 수정 → "핸드오프해".

**1. 이번 세션 한 일** (전부 CI 통과 후 squash 머지·배포)
- **의사 사진 자체호스팅 [#548 닫힘 → #554 구제 머지로 본판 반영]**: 병원 페이지 의사 사진이 외부 `immunehospital.com`에서 **핫링크**돼 원본이 파일명 변경/삭제 시 깨졌음(실제 배길준·강주안 404, 조현실은 원본이 로고 반환). 42장을 `public/doctors/`에 내려받아 로컬 경로(`/doctors/*`)로 참조. `scripts/fetch-doctor-photos.mjs` 추가.
- **지점 토글 애니메이션 [#554]**: 즉시 나타나 아래를 밀던 걸 `grid-rows 0fr→1fr` 부드러운 펼침 + 페이드인 + 화살표 회전 + 접근성(`aria-expanded`·접힌 내용 `inert`·`prefers-reduced-motion`)으로.
- **신촌 명단 현행화 + 실사진 [#559 머지]**: 병원 사이트 지점별 `doctor.php` 재크롤링 기준 — 사이트에서 사라진 **정유진·김민정 제거**(퇴사 추정), **신규 3명 추가**(김서진 / 진수현·홍정화=한방내과 전문의; 경력·학력·활동·논문 전부 병원 공식 프로필 스크랩 ko/en), **강주안 실사진 확보**(옛 URL 404였음), 배길준 최신 리스팅 사진. **총 의료진 27→28명**(강서7·신촌6·광명7·성동8), 히어로 카운트 갱신.
- **토글 "밀림" 수정 [#565 머지, main 886f15c]**: 신촌점 누르면 위 강서점(기본 펼침)이 뒤늦게 접히며 화면이 튀어 클릭해 열린 지점이 화면 밖으로 사라지던 것 → 클릭한 지점 헤더를 고정헤더 아래(80px)에 **매 프레임 `getBoundingClientRect`+`scrollBy`로 pin**(FLIP), 애니(200ms) 동안 위치 재고정. 옛 코드는 스크롤을 접힘 애니 '전' `requestAnimationFrame` 1회만 해서 어긋났음.
- **재발방지**: `check:content`에 **`immunehospital.com/uploads/` 의사사진 핫링크 금지 가드** 추가 → 이 가드가 미사용 **죽은 파일 `immuneHospitalDoctors.ts`(핫링크 38개)** 도 적발해 삭제. **POSTMORTEMS #55** 기록.
- **배포**: main push 자동배포가 **Vercel 하루 배포 한도 초과**(`build-rate-limit`)로 실패 → **Vercel REST API로 프로덕션 새 빌드 직접 트리거**(dpl_2M8q…, READY). 프로덕션 번들에 `scrollBy`·신촌 김서진·강주안 사진 반영 확인.

**2. 왜 그렇게 했는지**
- **사진 자체호스팅**: PO가 "핫링크 하지 말라" 반복. 원본은 우리 통제 밖(파일명 변경/삭제·사진 없으면 로고) → 자체호스팅이 유일한 근본해결. Next/image 프록시나 폴백 개선은 원인 안 없앰.
- **명단 현행화(떠난 의사 제거·신규 추가)**: PO "병원 사이트 가서 싹 다 가져와 로컬에 박아둬" → 병원 공식 사이트가 authoritative. 떠난 의사 계속 표시 = 의료 정확도 오류(KHIDI 신뢰 리스크). 신규는 **공식 상세페이지 실데이터만** 스크랩(창작 금지 — 의료 정확도 경계).
- **토글 pin**: 스크롤을 애니 '전' 1회만 하면 위 지점 접힘 후 위치가 어긋남 → 프레임별 pin이 타이밍에 안 흔들리는 정답.
- **배포는 프리뷰 승격 아닌 새 빌드**: 프리뷰 빌드를 프로덕션 alias로 올리면 `NEXT_PUBLIC_SITE_URL` 등 env 차이로 canonical/OG가 프리뷰 URL로 박힐 SEO 위험 → **API로 main HEAD를 프로덕션 env로 새 빌드**(안전).

**3. 안 끝났거나 보류**
- 없음(다 머지·배포). 단 아래 6번의 토글 "스크롤 동작 자체" 미검증이 유일한 열린 항목.
- 조현실(신촌 양방대표) 실사진: 병원 사이트에도 얼굴 사진이 없어(로고만 반환) 회색/로고로 뜸 — 우리가 더 못함(병원이 사진 제공해야).

**4. 주의·함정**
- **PR #548은 CLOSED(머지 아님)** — 실제 본판 반영은 #554(구제)·#559·#565. #548 되살리지 마라(혼란 원인, 다른 세션이 rescue 함).
- **Vercel 하루 배포 한도** — 이 날 여러 세션이 많이 배포해 한도 걸렸었음. 이 영역 배포는 **모아서 한 번에**.
- **프로덕션 재배포는 Vercel REST API로 가능(CLI 없어도)**: `POST /v13/deployments?teamId=team_OTAPgfKKul5pUokdQeRTnX9p&forceNew=1` body `{name:"healo-khidi",target:"production",gitSource:{type:"github",ref:"main",repoId:"1178442315"}}` (토큰=.env.local VERCEL_TOKEN). project=`prj_5W5Md15wbvvkJt7k61mOqBjqYdt8`. **프리뷰→프로덕션 승격은 env/canonical 위험이라 지양**.
- 프리뷰 링크는 PR 닫히면 죽는다 → PO에게 죽은 프리뷰 링크 내밀면 "하나도 안 바뀜"으로 오해. **확인은 프로덕션(healwith.co.kr)에서**.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: 병원 지점 토글 "밀림" **실브라우저 확인** — `healwith.co.kr/ko/hospitals` 강력새로고침(Ctrl+Shift+R) 후 신촌점 클릭 → 헤더가 화면 상단에 붙고 신촌 의사들이 바로 보이는지(위 강서점 접혀도 안 밀림). **검증환경이 헤드리스(window.innerHeight=0)라 스크롤 동작을 눈으로 못 봤음.** 여전히 밀리면 대안(위 지점을 애니 없이 즉시 접기 → 드리프트 0)으로 재수정.
2. 조현실 실사진은 병원에 요청(현재 로고).

**6. 검증 상태**
- ✅ **PR/CI**: #554·#559·#565 전부 `ci`·`Smoke Tests(PR)` 통과 후 squash 머지(#559는 `Vercel` 프리뷰도 pass). `next build --webpack` exit0 · `check:content` 통과 · 이미지 참조 46개 누락 0.
- ✅ **실측**: 자체호스팅 사진 프로덕션 200(image/jpeg)·`uploads` 핫링크 0 / 강주안 새 사진 프로덕션 200 / 신촌 렌더에 김서진 있고 정유진·김민정 없음·28명 / **스크롤 수정 코드(`scrollBy`)가 프로덕션 hospitals 청크에 존재**(청크 해시 5232fc7f→cf2c1007 변경 확인).
- ❌ **미검증(솔직히)**: **토글 "밀림" 스크롤 동작 자체** — 프리뷰가 헤드리스(viewport 높이 0, scrollTo 무효)라 실제 스크롤 재현 불가. 코드·배포는 확인했으나 시각 동작은 실브라우저 확인 필요.
- 참고: E2E(main push) 빨간 건 `signup-duplicate-email`·`xss-protection` 테스트로 **직전 커밋에도 실패 = 이 작업과 무관**(hospitals e2e는 통과, 환경/가입설정 이슈).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-07-01 오전 병원 지점 토글 밀림 수정(#565)·의사사진 자체호스팅·신촌 의료진 현행화(#559)까지 다 머지·배포 끝(Vercel API로 수동 재배포). **먼저 미검증분 확인해**: healwith.co.kr/ko/hospitals 강력새로고침(Ctrl+Shift+R) 후 신촌점 눌러 — 헤더가 화면 상단에 붙고 신촌 의사들이 바로 보이는지(위 강서점 접혀도 안 밀림). 헤드리스 환경이라 내가 스크롤 동작은 눈으로 못 봤어. 여전히 밀리면 위 지점을 애니 없이 즉시 접는 방식으로 다시 손봐. 조현실은 병원 사이트에도 얼굴 없어(로고) → 실사진은 병원에 요청.

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
