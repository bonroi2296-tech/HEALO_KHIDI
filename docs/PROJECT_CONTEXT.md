# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-16 밤 — 실서비스 검증으로 실버그 수리 + "목표·지시법" 합의)

📝 **정정**: 바로 아래 블록(백오피스 8개 #787)이 "실동작 전부 미검증"이라 했는데, 이 세션에서 **실서비스 로그인으로 실제 눌러 검증했고 그 중 1건이 고장나 있어 수리**함(아래).

**1. 이번 세션 한 일**
- **#787(백오피스 8개) 머지 완료** (main `67155d4f`). 머지 충돌(PROJECT_CONTEXT) 1회 해소 후 squash.
- **실서비스(healwith.co.kr) 실검증** — `docs/TEST_ACCOUNTS.md`의 테스트 계정(admin/coordinator/hospital@test.com, 비번 `Healwith2026!` — 실측결과 **로그인 다 됨=문서 안 낡음**)으로 로그인→각 기능 실제 API 호출→DB 대조. 결과: **Feature 2(코디 유치전환)·6(만족도)** 코디 200 OK(admin전용 엔드포인트엔 코디 403=권한판별 정상 대조) / **Feature 7(병원 알림 종)** 스태프 4명 실제 알림 생성 / **Feature 1(병원 온보딩)** 읽기200+admin전용403(신규계정 *생성*은 프로덕션 상태변경이라 미실행, 코드검증) / **Feature 8(병원↔코디 대화)** = 🐛 **실버그 발견**.
- **🐛 실버그 수리 [PR #791 머지](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/791)** (main `f891b153`): 병원 대화창 메시지 전송 POST 가 `chat_messages_actor_type_check` 에 `'hospital'` 이 없어 전부 실패(GET=스레드생성은 됨, POST만 internal_error, 화면 무증상). = **Feature 8 전송경로가 머지 후 한 번도 작동 안 함.** 🔁 #94/#62 부류 재발(새 actor_type→CHECK 미확장). 고침: `migrations/20260716_chat_messages_actor_type_hospital.sql`(프로덕션 apply 완료) + 실호출 재검증(POST ok·GET읽힘·알림4건) + 테스트데이터 정리. **정적 가드 신설**(check-content §22: 코드 actor_type 리터럴↔마이그레이션 CHECK 허용집합 대조, 음성테스트로 실증) + POSTMORTEMS #95.

**2. 왜 그렇게 했는지** — PO "완벽해?"·"완성 목표 정의하고 있냐"에 **말로 안심 대신 실측**(취향 규칙)으로 답. 로컬 node_modules 없어 tsc/E2E/브라우저 불가 → **실서비스+테스트계정 실호출이 유일한 진짜 검증**. #94 방지책은 consultation_messages(상담방)용 런타임 E2E 였고 chat_messages(코디·에이전시·병원 메신저)는 정적 미방비라 또 뚫림 → 이번엔 정적 CI 가드로 그 부류 봉인.

**3. 안 끝났거나 보류**
- **전체스택 전수조사(PO 요청 확정)** — 프론트(환자 6개어 화면 렌더·잘림)~백엔드~화상회의(LiveKit)~AI챗까지 전 계층. 로직(API·DB·권한·집계)은 실호출로 100% 가능, **시각/영상(레이아웃 잘림·실제 영상송출)은 헤드리스라 못 봄** → 크롬(설치돼있음)+Playwright로 프리뷰 구동하면 시각까지 가능(세션 세팅 필요). PO는 **"1번=브라우저+로직 풀세팅"** 택하려다 "잠깐"으로 보류 → 다음에 "시작" 한마디면 착수.
- 🔴 에이전시 정산/수수료 · 의료기관 소견 발신 · 케이스 생애주기 지도(구조).

**4. 주의·함정**
- **actor_type/role/status enum 을 코드에 추가하면 같은 PR에 DB CHECK 확장 마이그레이션 필수** — 안 그러면 insert 조용히 실패(무증상). chat_messages.actor_type 은 이제 check-content §22 가 정적으로 막지만, participant_role·기타 status CHECK 는 아직 정적 미방비(같은 패턴 한 줄로 확장 가능 — POSTMORTEMS #95 후속).
- 실서비스 실호출 검증 시 **테스트 데이터(메시지·알림·스레드) 반드시 정리**(이번엔 정리 완료). 신규 **계정 생성**류는 프로덕션 상태변경이라 안전분류상 PO 승인 없이 실행 금지(안전분류기도 차단).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 미검증분 먼저**: Feature 1 병원계정 **신규생성→임시비번 로그인**은 프로덕션 계정생성이라 이 세션서 미실행(코드만 검증). 실동작 확인하려면 throwaway 계정 생성+삭제(PO 승인 필요) or 프리뷰서 PO가 1회.
2. **전체스택 전수조사** — PO "시작" 시 크롬+Playwright 세팅→프론트~백~화상~AI챗 전 계층 실검증(3번 참고).
3. 🔴 큰 거(에이전시 정산·의료기관 소견·케이스 지도) 중 PO 지정.

**6. 검증 상태**
- ✅ **#787·#791 둘 다 MERGED**(main `f891b153`), CI ci·Smoke 둘 다 success. check:content/schema-refs/completeness 로컬 초록. 정적 가드 §22 음성테스트 통과.
- ✅ **실서비스 실호출 검증**(로직): Feature 2·6·7·8 실제 동작 확인(8은 수리 후). 근거=실API 응답+DB 실측(Supabase MCP).
- ⚠️ **검증 못 함**: Feature 1 신규계정생성 실동작(프로덕션 계정생성 회피) / 시각·레이아웃·화상영상 전부(헤드리스 한계) / Features 3·4·5(리다이렉트·매뉴얼·지표 = 정적/코드검증만).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 백오피스 8개(#787)+병원대화창 실버그 수리(#791) 다 머지·실서비스 검증됨. 이어서 ①전체스택 전수조사("시작"하면 크롬+Playwright로 프론트~백~화상~AI챗 실검증) or ②큰 거(에이전시 정산·의료기관 소견·케이스 지도) 중 하나. 지시할 땐 "이거 자율주행: [목표]" = 완성기준 네가 정하고 자가검증까지 끝까지, 돈·삭제·방향만 물어봐.

---

## 🔖 세션 핸드오프 (2026-07-16 — 계층별 백오피스 완성 8개 [PR #787])

**1. 이번 세션 한 일** — PO 지시("이해관계자 계층별 필요기능 완성, 백오피스 우선 — 파트너 넘기기 전 단계, 실사용자 없으니 빠르게"). 3개 계층 전수 스캔(어드민·코디 / 병원·에이전시·의료기관 / 공통기반)으로 완성/반쪽/없음 매핑 후 랭킹 상위부터 8개 구현. **[PR #787](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/787)** (CI 초록·머지 예정).
- ①**병원 계정 온보딩**: `admin/hospital-accounts` 신규계정 tempPassword 어드민에 1회 반환 + UI 표시(로그인 불가 블로커 해소). ②**코디 유치 전환**: `conversion-funnel` requireAdminAuth→requirePortalAuth(staffOnly) + 코디 화면(`app/coordinator/conversion` 재사용)+네비(PO 권한확대 승인). ③**코디 인테이크 메뉴 정리**: 상담일정 중복+의사배정 노-옵 → redirect+네비제거+매뉴얼 5개어 정리. ④⑤**위생**: 코디 죽은지표(activePatients→예정상담)·병원 매뉴얼 4→2 드리프트. ⑥**코디 만족도 화면**: `khidi/satisfaction` staffOnly 확대 + 코디 재사용화면+네비. ⑦**병원 알림 종**: `inApp.ts` 파트너 리졸버+notifyHospitalNewLead, 리드배정 양경로(admin+coordinator) 배선(#85 반쪽 방지). ⑧**병원↔코디 대화창**: `hospital/leads/[id]/messages`(channel='hospital', 리드→source_inquiry_id) + 코디 콘솔 hospital 채널 + 병원 리드화면 채팅 드로어.

**2. 왜 그렇게 했는지** — 백오피스가 완성돼야 파트너(병원·에이전시·의료기관)에 전달 가능. 코디 관련은 KHIDI 성과지표(유치12·사후관리120·만족도90)를 코디가 실제로 굴리게. 재사용 우선(어드민 화면 re-export, 에이전시 메신저 템플릿) → 파일 최소.

**3. 안 끝났거나 보류** — 🔴 에이전시 **정산/수수료**(대) · 의료기관 **소견 발신**(중대) · 케이스 **생애주기 지도**(구조). 소refinement: 코디→병원 **답장 종 알림**(현재 병원은 8초 폴링으로 봄) · 파트너 **초대메일 자동화**.

**4. 주의·함정** — ⚠️ **로컬 node_modules 없어 실제 클릭·실발송·tsc 못 함** → 코드+CI+프리뷰 빌드까지만 검증, **실동작은 미검증**(누군가 눌러봐야 함). 커밋 게이팅 실수로 가드 위반본(h3 크기) 1회 푸시→즉시 수정(다음엔 커밋 전 가드 통과 gate). 병원 리드 스레드는 `normalized_inquiries.source_inquiry_id`로 inquiries 키공간에 맞춤(그게 없으면 대화 불가 — coordinator_referral·admin배정은 있음).

**5. 다음 세션이 먼저 할 일** — 1) **실동작 검증**(프리뷰/실서비스에서 병원계정 비번·코디 유치도장·종알림·대화창 실제 눌러보기). 2) 남은 🔴(정산 등) 중 PO 지정. 3) 코디→병원 답장 종(소).

**6. 검증 상태** — ✅ #787 CI 초록(ci·smoke success). check:content/schema-refs/completeness 로컬 초록. ⚠️ 실동작 전부 미검증(로컬 한계). 스캔 근거는 실코드+DB 실측(notifications RLS=본인것, profiles 컬럼 등).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 계층별 백오피스 8개(PR #787) 머지됨 — 근데 **실동작은 아무도 안 눌러봄**(로컬 한계). 이어가려면 ①프리뷰/실서비스에서 눌러 검증 or ②남은 큰 거(에이전시 정산·의료기관 소견·케이스 지도) 중 하나.

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
