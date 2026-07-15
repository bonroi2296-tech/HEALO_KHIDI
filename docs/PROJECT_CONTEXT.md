# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-15 오후 — PO 취향 원장 슬림화: 히스토리 "쌓기 OK, 정리 고장" 진단·수리)

**1. 이번 세션 한 일** — 코드 아님, **기억 시스템(취향 원장) 정리** 세션. PO 질문("핸드오프 반복되며 내 요구사항이 쌓이는데 히스토리 제대로 쌓고 있냐?")에서 출발.
- **실측 진단**: 핸드오프 117세션분(`archive/PROJECT_CONTEXT_handoffs.md`, 5천줄) + 취향 117건 전부 유실 0 보존 확인 = 쌓기는 정상. 진짜 문제는 **정리 파이프라인이 한 번도 안 돎** → `PO_PREFERENCES.md` 「활성 취향」이 **117건·94,662자**로 비대, 세션시작 훅이 매번 통째 주입(자기 규칙 "활성은 짧게" 위반), 「보관」 0건·CLAUDE.md 승격 0건.
- **정리 실행(PO 버튼 승인 "정리하자")**: ①**실측·검증(verification-depth) 클러스터 10건**(#43·54·59·65·89·111·117·121·123·130 — 같은 취지 반복확정) → CLAUDE.md self-QA 고정규칙 1줄로 **승격** ②이미 CLAUDE.md 반영·뒤집힌(#114 자율확대·#33 CTO)·중복인 23건 → 「보관」 이동 ③원문 33건 전부 「보관」에 그대로 보존(스크립트로 유실 0 검증).
- **결과**: 활성 취향 **117→84개(94,662→72,571자, ~23%↓)**. `docs/PO_PREFERENCES.md` + `CLAUDE.md` 2파일 변경.
- **PR [#785](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/785) 머지 완료**(squash, main `702a4f1b`). 문서만 저위험 → CI 초록 확인 후 PO 승인대로 자동머지.

**2. 왜 그렇게 했는지**
- PO 취향 규칙("됐어요 말고 실측")대로 말로 안심시키지 않고 파일·글자수·유실검사를 실제로 돌려 진단.
- 비대함의 해악 = "요구사항이 사라져서"가 아니라 **너무 안 사라져서 최신 신호가 옛것에 묻히는 역설**. 그래서 삭제가 아니라 승격(졸업)+보관(은퇴)으로 앞줄만 가볍게.
- 손편집 대신 스크립트(`scratchpad/prune-prefs.mjs`)로 원문 라인을 그대로 이동 → 전사 오류·유실 원천 차단, `git`상 원문 33건 100% 재현 확인.

**3. 안 끝났거나 보류**
- 활성 84개도 아직 큰 편(7만2천자). **다음 슬림화 후보**(원장 상단 주석에도 기록): '버튼/질문 형식'·'로컬우선 배포절감'·'말투 쉽게'류 — CLAUDE.md에 이미 고정규칙으로 있으니 반복분 추가 보관 가능. PO가 "더 줄여" 하면 60개대까지 가능(이번엔 과감히 안 하고 보수적으로 멈춤 — PO 뉘앙스 오판 리스크).

**4. 주의·함정**
- 「보관」 섹션은 이제 A그룹(승격 클러스터)·B그룹(중복/낡음/뒤집힘)으로 나뉨. **원문 유실 0이니 되살릴 항목 있으면 거기서 그대로 복귀** 가능.
- CLAUDE.md self-QA에 "⭐ 실측·재검증이 기본값(10회+ 반복확정 승격)" 줄이 새로 박힘 — 이건 취향이 아니라 이제 **고정규칙**. 「보관」 A그룹이 그 근거 원문.
- 취향 원장 상단에 `PO_PREFS_VERSION: 2` + 정리 이력 주석 3줄 추가됨.

**5. 다음 세션이 먼저 할 일**
1. (이 세션 후속 아님 — 정리 종결) 직전 세션들 승계 항목 우선: 화상상담 UX(#777 등) 프로덕션 실측, KHIDI 계약 협약서 최종본/번역, 앱스토어 결제·APNs (아래 블록들 참고).
2. 취향 원장 재슬림화는 PO가 "더 줄여" 명시할 때만(3번 참고).

**6. 검증 상태**
- ✅ PR [#785](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/785) **MERGED**(main `702a4f1b`, squash). CI: `ci`·`Smoke Tests (PR)` 둘 다 **success**, E2E류는 문서 PR이라 정상 skip, Vercel 배포 Ignored(정상).
- ✅ 유실 검사: 원본 취향 117건 전부 새 파일에 존재(스크립트 대조, 0 유실).
- ✅ `check:handoff`·`check:content` 통과.
- ⚠️ 미검증 없음(문서·규칙 변경뿐, 런타임 표면 없음).
- 열린 PR: 이 세션 몫 없음(#785 머지 완료). 타 세션 브랜치 다수 열림(오리엔테이션 목록 참고 — 이 세션 무관).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프를 읽어. 취향 원장 슬림화는 종결됐고(활성 117→84), 이어서 할 건 직전 세션 승계분(화상상담 UX #777 프로덕션 실측 / KHIDI 계약 협약서 최종본·번역 / 앱스토어 결제·APNs) 중 PO가 고르는 것. PO가 "취향 더 줄여" 하면 PO_PREFERENCES 상단 주석의 "다음 슬림화 후보"부터.

---

## 🔖 세션 핸드오프 (2026-07-15 밤 — 완성도 루프 구축: "완성 판정을 사람 눈에서 기계로" + 협업방식 codify)

**1. 이번 세션 한 일** — OKKY 칼럼("Codex 72시간 사이클") 분석 → 우리가 반복 발견하는 "미완성"을 "완성"으로 끌어올리는 시스템 구축. **[PR #784](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/784)** (CI 초록).
- **완성도 루프 3축**: 축A 판단기준 SoR(`docs/DEFINITION_OF_DONE.md` + 기계판독 `src/lib/completeness/rubric.js` 7유형) + `check:completeness` 게이트(ci.yml 비차단). 축B 감사루프 스킬(`.claude/skills/completeness-audit`) + `session-orient.sh` 7일 리마인드 + `CLAUDE.md` 자동머지 전 완성도 감사 게이트(PO 승인). 축C 범위 무한정화(check:content 한글누출 → `isPublicFacingFile()` 공개/환자 전체, 동적링크 app→src, `check-schema-refs` 컬럼레벨·비차단).
- **루프 실가동 = 실제 수확(제안 아님)**: 유형3 문서-현실 드리프트 **3건 종결**(consultation notes 암호화·"미머지" 3건·리브랜드 TODO) + 유형1 한글누출 **2건 6개어화**(inquiry 업로드힌트 등) + 유형6 **실버그 2건 수리**(리마인더 profiles 없는컬럼 5개→실컬럼+auth 이메일+in_app 보장 / crawl name→title alias) + **stale 생성타입 재생성**(inquiries 35→61 컬럼).
- **1차(협업방식 개선) codify**: `docs/PO_PREFERENCES.md`에 3건 — 완성기준 먼저·자가검증 / PO주의력=병목이니 아껴라 / "자율주행" 명령 템플릿.

**2. 왜 그렇게 했는지** — 칼럼 요지: AI시대 사람 일 = 목표+판단기준 주기, 병목 = 사람 주의력. 우리 진단: 고치는 루프(부검→가드)는 최고인데 **"완성 판정(Manager)"이 아직 PO의 눈=스크린샷** → 그걸 기계로 옮겨 PO 보기 전에 미완성 소진.

**3. 안 끝났거나 보류**
- 컬럼레벨 schema-refs·`check:completeness` = **비차단(경고)** — 안정 후 blocking 승격(DEFINITION_OF_DONE 로드맵).
- 축C 잔여: 필터(.eq)·복호화 누락·"같은 가정 쓰는 소비자 전수 스캐너" = 감사루프 몫.

**4. 주의·함정**
- **⚠️ 로컬 tsc 못 돌림(node_modules 없는 fresh clone)** — 생성타입 재생성이 tsc 1건 깼고(step2 intake=Json spread) CI가 잡음. 타입·빌드 건드리면 **CI typecheck가 유일한 검증** → 푸시 후 CI 주시 필수. 마찬가지로 playwright(clip-sweep) 로컬 실행 불가 → 나이틀리 커버.
- 리마인더 수정은 **코드·스키마 정합만 확인, 실발송(이메일/in_app) 런타임 미검증**.

**5. 다음 세션이 먼저 할 일**
1. **리마인더 수정 실동작 확인**(등록회원 in_app/이메일 리마인더 실제 나가는지 — 미검증).
2. 완성도 루프 후속: `check:completeness`·컬럼레벨 **blocking 승격**, 축C 잔여(소비자 전수 스캐너).
3. (#784 이 세션 끝에 머지 처리 — main 반영됐는지 확인 후 진행.)

**6. 검증 상태**
- ✅ CI 초록(`ci` success·Smoke success, HeadSHA 2fe48289). check:content/schema-refs/completeness 로컬 초록.
- ✅ 실버그 2건 = DB 실측(Supabase MCP)으로 컬럼 부재 확인 후 수리. 유형3 드리프트 3건 = 코드/커밋 대조 확인.
- ⚠️ **검증 못 함**: 리마인더 실발송 / 감사루프 유형7 clip-sweep ad-hoc(node_modules 없음, 나이틀리 커버) / 재생성 타입 tsc는 CI로만 확인.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 완성도 루프(PR #784)=「완성 판정을 기계로」 — 7유형 판단기준(DEFINITION_OF_DONE)+감사루프(/completeness-audit)+가드확장. 이어서 할 거면 ①리마인더 수정 실발송 확인 ②check:completeness·컬럼레벨 가드 blocking 승격부터.

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

**✅ (완성도 감사 2026-07-15 종결) 아래 3건은 전부 main 머지 완료** — #562=`45e58f7c`·#567=`e83f9b50`·#545=`9a8dcb9c`. 문서만 "미머지"로 남아 있던 드리프트(#63 부류). 아래는 이력 보존용:
1. **파트너 발굴 아웃리치 추적기** [PR #567 · 브랜치 `work/partner-outreach`] — 코디·어드민 백오피스 신규 기능(카자흐 직원 Assel이 파일 대신 백오피스에서 파트너 영업 추적). **완성 + 프로덕션 DB에 표 `partner_outreach`+시드 6곳 이미 적용.** 남은 것: ①프리뷰에서 화면 클릭 검증(후보추가·상태변경·탭필터·CRUD, 코디+어드민 둘 다) → 이상 없으면 **머지** ②Assel 계정에 코디네이터 권한 부여(`/admin/staff`). (큰 UI라 PO 눈으로 보고 머지하기로 했던 건)
2. **초청장 발급주체 = 등록 유치의료기관(병원) 명의** [PR #562 · 브랜치 `claude/kazakhstan-keta-config-ko4g7b`] — `VisaInvitationLetter.jsx`+`inviterHospitals.ts` 완성, 미머지. (같은 세션의 비자 정정 #535·541·549·552는 이미 머지됨 — #562만 남음.)
3. **이메일 수신률 문서** [PR #545 · 브랜치 `work/email-deliverability`] — `docs/EMAIL_DELIVERABILITY.md`(DMARC·콜드 아웃리치 플레이북). DMARC 감시 켜기·Google Postmaster 등록은 이미 실행(외부 완료). 문서라 CI 초록시 자동머지 대상.
- (추가 열린 검증) #565 토글 "밀림"은 코드·배포 반영됐으나 **실브라우저 스크롤 동작만 미검증**(검증환경 헤드리스라 눈으로 못 봄) — 오전(2) 핸드오프 6번 참조.

**🧹 정리해도 되는 브랜치(작업 이미 main에 반영 = squash 머지됨, 지워도 안전):** `claude/handoff-2026-07-01-am`·`handoff/admin-cleanup-0701`·`work/admin-backoffice`·`work/hospitals-roster-refresh`·`work/hospitals-toggle-ui`·`work/hospital-toggle-scroll-fix`·`claude/rescue-548-doctor-selfhost`·`claude/seo-audit-improvements`·`claude/inspiring-williamson-56fbfc`·`claude/patient-detail-i18n`·`claude/satisfaction-min-n-env`·`claude/fix-all-errors-sweep`·`claude/khidi-conversion-source-breakdown`·`claude/handoff-cancer-img-selfhost`. ~~**남겨둘 것(미머지 작업 있음):** `work/partner-outreach`·`claude/kazakhstan-keta-config-ko4g7b`·`work/email-deliverability`.~~ → 세 브랜치 모두 머지 완료(위 참조), 이제 정리해도 안전 (완성도 감사 2026-07-15).

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
  - ~~PNG 앱아이콘 재생성~~ ✅ **완료**(2026-06-23 `943481c`, KNOWN_ISSUES:358 종결과 일치 — 완성도 감사 2026-07-15가 문서 간 모순 교정).
  - ~~도메인 `healwith.co.kr` 등록~~ ✅ **완료**(2026-06-29 라이브 HTTP 200, LAUNCH_GATES 관문12 일치 — 완성도 감사 2026-07-15 교정).
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
