# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-06 오전 — '짧은 목줄' 아티클 반면교사 → 자동머지 자기검증 보강 2건: 독립 리뷰 게이트 + 자동머지 일지)

> PO가 공유한 GeekNews 아티클("Fable을 이기는 '짧은 목줄' AI 코딩", news.hada.io/topic?id=31113) 리뷰 세션. 첫 평가("우리는 이미 반영돼 있어 바꿀 것 없음")에 PO가 "반면교사 삼을 내용은 없어?"라고 되물음 → 우리 자율운영 구조의 약점 3개를 자기비판으로 도출 → PO 버튼 승인("A+B 둘 다")으로 규칙 2건 추가.

**1. 이번 세션 한 일**
- **약점 진단 3건 보고**: ①작성자=판정자=머지자 동일인(자동머지에 제3의 눈 없음 — CI 13종은 전부 "당해본 부류"만 잡는 사후약방문) ②"저위험" 딱지도 어시가 자기 판정(오류를 PO가 발견할 장치 없음) ③핸드오프가 유일한 기억인데 실제로 밀림(세션훅 뒤처짐 경보가 산 증거).
- **PR #644 (머지)** — `CLAUDE.md` 자동 운영 규칙에 2줄 추가: 🔍**독립 리뷰 게이트**(자동머지 전 작성 맥락 미공유 리뷰 에이전트가 diff 검토, CONFIRMED급 정합성 결함 시 머지 중단, 문서·주석-only PR은 생략 가능) + 📋**자동머지 일지**(하루 요약에 그날 자동머지 PR 목록+저위험 판정 근거 한 줄 필수). 문서만 변경.

**2. 왜 그렇게 했는지**
- 아티클 원처방("모든 diff를 사람이 검토")은 개발자 팀용 — 1인 비개발자 PO 체제에 그대로 적용하면 PO가 종일 diff만 봐야 함. **취지(제3의 눈 + 사후 감사)만 기계·구조로 이식**: 사람 검토 → 맥락 미공유 리뷰 에이전트, 사후 감사 → 일지.
- 약점 ③(핸드오프 밀림)은 별도 규칙 안 만듦 — 같은 날 다른 세션이 이미 "중간 저장" 규칙을 CLAUDE.md에 넣어서 중복(그쪽이 SoR).

**3. 안 끝났거나 보류**
- **독립 리뷰 게이트 실전 발동 0회**: #644 자신이 문서-only라 생략 대상. 다음 "코드" PR 자동머지부터 적용 — 현재는 규칙 문서일 뿐 기계 강제(CI·훅) 아님. 어시가 안 지키면 그만인 구조라, 반복 누락 보이면 훅/CI로 기계화가 다음 단계 후보.

**4. 주의·함정**
- 게이트 생략 조건은 "문서·주석만"뿐 — 코드 한 줄이라도 섞이면 돌려라. 일지는 그날 자동머지 0건이어도 "0건"으로 적어야 빼먹음과 구분됨.
- 이 작업본(`claude/article-review-kpecs1`)은 #644 머지 후 최신 main에서 재시작됨(머지된 PR 재사용 금지 규칙).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 다음 코드 PR 자동머지 때 **독립 리뷰 게이트 첫 실전 적용**(안 돌리면 규칙 위반) + 하루 요약에 자동머지 일지 포함(2026-07-06분 1호 = #644, 근거: PO 버튼 승인 문서-only 변경).
2. 화상 트랙 1순위(2026-07-06 월 직원 다기기 테스트 결과 확인)는 아래 "2026-07-06 아침" 블록 그대로 유효.

**6. 검증 상태**
- ✅ PR #644: CI 초록(ci·Smoke Tests 성공) + `check:content` 통과 확인 후 머지, main 반영(머지 웹훅 수신으로 확정). 문서만 변경이라 실서비스(런타임) 영향 없음.
- ⚠️ **검증 못 함**: 새 규칙 2건의 실전 작동 — 다음 자동머지 코드 PR에서 첫 발동해봐야 앎(5번 1항으로 승격).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 코드가 든 PR을 자동머지하기 전엔 CLAUDE.md 자동 운영 규칙 1번의 독립 리뷰 게이트(작성 맥락 미공유 리뷰 에이전트로 diff 검토)를 반드시 먼저 돌려라 — 문서·주석만 바꾼 PR만 생략. 하루 요약엔 자동머지 일지(PR 목록+저위험 판정 근거 한 줄, 0건이면 0건) 포함. 화상 트랙 1순위(월요일 다기기 테스트 확인)는 2026-07-06 아침 블록 참조.

---

## 🔖 세션 핸드오프 (2026-07-06 아침 — 화상 원격협진(LiveKit) 검증+수리 2건 배포 + 야간 자율 순찰 12회 무사고)

> PO 지시("화상회의 지난번 고친 거 진짜 고쳐졌는지 확인 + 개선점 고쳐 + 2026-07-06 07시까지 순찰")로 진행한 **화상 트랙 전용 세션**(2026-07-05 저녁~2026-07-06 07시 KST). 병렬로 돈 AI-안전 루프 세션(#636·#640·#641, 아래 블록)과 별개 트랙.

**1. 이번 세션 한 일**
- **검증**: 지난 화상 수정 뭉치(#576~#612 · iOS마이크 #269 · 게스트언어 #360)가 전부 코드에 정상 반영됨을 서브에이전트 전수 대조(file:line)로 확인. 실DB `admin_audit_logs` = 게스트 입장(`CONSULTATION_GUEST_JOIN`) 다수 성공, 클라 오류는 "카메라·마이크 없는 데스크톱" 2건뿐(예상된 폴백), 크래시 0.
- **PR #637 (머지·배포)** — 화상 4건: ①자막 DataChannel이 `livekit-client` v2 API 오용(`{kind:...}` — 이 버전에 없는 필드)으로 RELIABLE 의도가 **LOSSY 전송**되던 것 → `{reliable:true}`(불안정 CIS 회선 자막 유실 방지) ②webhook `room_finished` 자동 `completed` 제거(K-02 인플레 + 완료 시 `token`·`guest-join`이 `consultation_closed` 반환해 **재입장까지 막던** 부작용 예방) ③옛 도메인 `healo-khidi.com`→`healwith.co.kr`(webhook 주석·EXTERNAL_SETUP_GUIDE) + `check:content` 가드룰(MKT-08) ④카메라 꺼짐 검은 박스→브랜드 teal 아바타 CSS.
- **PR #642 (머지·배포)** — webhook 무완료 규칙을 계약 회귀 테스트로 잠금(4테스트: room_finished/participant_joined DB 무변경, recording_finished만 recording_url 저장). 테스트 전용.
- **야간 자율 순찰 45분 간격 12회** (2026-07-05 13:09Z~22:03Z) 전건 정상: health db:up · 홈/inquiry/telemedicine 200 · 신규 audit 오류 0 · 화상 회귀 징후 0.

**2. 왜 그렇게 했는지**
- 자막 LOSSY 버그: livekit-client v2에서 `DataPublishOptions`가 `{reliable:boolean}`로 바뀌었는데 옛 `{kind:DataPacket_Kind.RELIABLE}`가 조용히 무시됨(타입 에러도 안 남 — JS). 도크스트링이 "delivery guarantee엔 Reliable"이라 명시 = 자막은 reliable이 맞음.
- webhook 자동완료는 dormant(옛 도메인이라 이벤트 0)였으나, URL 교체 시 활성화될 잠재 폭탄 + K-02는 8/27 평가 잔금 직결이라 **선제 차단 + 테스트로 잠금**. "되돌아가기 쉬운 부정 로직"이라 #642로 고정.
- 카메라오프 아바타·자막 등은 God컴포넌트(2883줄) 로직 무관한 CSS/훅 국소 수정만 — 라이브 검증 불가 영역(레이아웃 대수술)은 손대지 않음.

**3. 안 끝났거나 보류 (PO 결정/라이브 검증 필요)**
- **①상담 notes 평문저장 → 암호화**: `notes_encrypted` 컬럼 미사용, 현재 평문. PII라 규칙상 PO 확인 후. 패턴은 visa/cost-estimates 라우트의 `encryptStringNullable`/`decryptStringNullable` 그대로 + 기존 평문 행 마이그레이션.
- **②LiveKit 대시보드 webhook URL 실제 교체**: 코드·주석은 고쳤으나 실제 이벤트 수신은 대시보드에서 `https://healwith.co.kr/api/livekit/webhook` 등록해야 함(외부 설정, PO 5분).
- **③2인 데스크톱 반반분할 / 세로영상 blur-fill 배경**(#612 감성 (a)(b)): 레이아웃 로직이라 라이브 2인 검증 필요 → 자동검증 불가로 보류.
- 잔존: 게스트토큰 E2E 스펙 고정 실패 / 테스트 상담방 2개(50d5bc43…·aa9804ee…) 삭제 대기(PO 확인).

**4. 주의·함정**
- 안전감지·통화 정규식의 `\b`+비ASCII 함정은 이 프로젝트 반복 사고(아래 AI루프 블록 #640 참조) — 화상 코드엔 해당 없음.
- webhook은 `.eq("livekit_room_name", roomName)`로 매칭 — room 이름 = consultation_id 규칙(token 발급 시). 대시보드 URL 교체 후 recording_url이 실제 저장되는지 라이브 확인 권장.
- 카메라오프 아바타 CSS는 **육안 미검증**(헤드리스라 렌더 못 봄). 구조상 통화는 못 깨뜨림. PO가 별로면 `consultation.css`의 `.lk-participant-placeholder` 블록만 revert.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: ①2인 실제 양방향 영상·자막 송출(월요일 다기기 테스트로 커버) ②카메라오프 아바타 CSS 육안(실통화 시).
2. **2026-07-06(월) 직원 다기기 테스트** 결과 확인(실패 기기는 `admin_audit_logs` CONSULTATION_CLIENT_ERROR의 `user_agent`로 판독 — 로그 정상 작동 확인함).
3. PO 결정 3건(위 3번) 중 PO가 고른 것 착수.

**6. 검증 상태**
- ✅ PR #637·#642 CI 초록(ci + Smoke Tests) → squash 머지 → main-push CI/E2E 초록 + Vercel 프로덕션 배포 후 재검증(health ok·페이지 200·webhook 라우트 405). `check:content`·빌드·상담 단위테스트(24) + webhook 회귀테스트(4) 통과.
- ✅ 야간 순찰 12회 전건 무사고(실측).
- ⚠️ **검증 못 함**: 2인 실영상 송출(라이브 2기기 필요 — 월요일 테스트), 카메라오프 아바타 CSS 육안, LiveKit 대시보드 URL 실제 교체 여부(외부 설정).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 화상 트랙: 2026-07-06(월)이면 직원 다기기 화상 테스트 결과부터 확인(실패 기기는 admin_audit_logs CONSULTATION_CLIENT_ERROR의 user_agent로 진단). 카메라오프 아바타 CSS는 실통화 때 육안 확인하고 별로면 consultation.css placeholder 블록만 revert. PO 결정 3건(notes 암호화·LiveKit 대시보드 webhook URL 교체·2인 레이아웃) 중 PO가 고른 것 착수. 화상 수정 #637·#642는 배포·검증 완료.

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
