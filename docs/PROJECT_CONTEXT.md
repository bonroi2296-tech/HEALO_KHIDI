# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-01 밤 — 텍스트 단락 줄바꿈 매끄러움: 전역 CSS로 뿌리뽑기 (#595 머지·배포 완료))

> PO가 홈 스샷("…보유하고 있 / 습니다"처럼 한 단어가 두 줄로 쪼개짐)을 주며 **"이런거 내가 하나하나 다 잡아줘야하니? 외국어는 내가 몰라. 언제쯤 완벽하게 수정?"**이라 답답해함 → 문구 개별수정이 아니라 **전역 CSS 규칙 한 방**으로 전 언어·전 페이지 차단 → 전수 점검(추가 잔재 없음 확인) → PO "지금 바로 머지" → #595 머지·프로덕션 배포.

**1. 이번 세션 한 일**
- **`src/index.css`에 전역 줄바꿈 규칙 3종 추가** (커밋 `dd3d9bc`, PR **#595 머지 완료** → main 배포):
  - `body { word-break: keep-all; overflow-wrap: break-word }` — 상속으로 **전 페이지×6개 언어** 적용. keep-all=한/중/일을 띄어쓰기에서만 끊음(있습니다 안 쪼개짐), overflow-wrap=긴 단어·URL 화면밖 삐짐 방지.
  - 제목 `h1~h6 { text-wrap: balance }` / 본문 `p,li,blockquote,dd,figcaption { text-wrap: pretty }` — 마지막 줄 외톨이 단어(고아) 방지. 미지원 브라우저는 무시(안전).
- **전수 점검**(같은 부류 다른 페이지 잔재 확인 — PO가 버튼으로 "전수 점검" 선택): ①`break-all` 5곳 전부 이메일·ID에만(정당) ②문장 중간 강제 `<br>`은 사용자화면 0(개발용 design-preview 1곳뿐) ③i18n 번역파일에 강제 `\n` 0개(홈 히어로만 언어별 수제 줄바꿈=양호) → **추가 코드수정 없음**.

**2. 왜 그렇게 했는지**
- 근본원인: `src/index.css`에 줄바꿈 규칙이 **아예 없어** 브라우저 기본값(`word-break: normal`)으로 CJK를 글자 아무데서나 끊었음. 그간 문구를 하나씩 고쳐 다른 페이지서 계속 재발 → **CSS 상속 1곳(body)으로 영구 차단**이 정답(새 페이지도 자동 적용, PO가 외국어 몰라도 규칙이 막음).
- 라틴/키릴은 원래 공백에서만 끊겨 keep-all 영향 거의 없음. overflow-wrap이 안전망.

**3. 안 끝났거나 보류** — 없음(이 건은 #595 머지로 종료). 단 위 화상상담 핸드오프(아래 블록)의 미검증분은 여전히 유효.

**4. 주의·함정**
- `word-break: keep-all`은 상속 → 혹시 특정 좁은 컨테이너에서 CJK가 안 쪼개져 폭이 넘치면 overflow-wrap이 단어를 끊어 처리함(설계된 동작). 실화면에서 이상하면 그 컴포넌트에 국소 override로 대응.
- 이 CSS로도 **안 잡히는 특수 케이스**(예: 하드코딩 `<br>`로 강제한 자리, 고정폭 배지)는 남을 수 있음 → PO가 스샷 주면 그 자리 원인+가드 한 세트로.

**5. 다음 세션이 먼저 할 일**
1. (이 건 관련) **없음** — #595 완료. PO가 배포 후 실화면에서 또 어색한 지점 스샷 주면 그때 국소 대응.
2. ⚠️ (이전 세션 이월) 화상 상담 A/V — 아래 "2026-07-01 저녁" 블록 5번의 미검증분(통합 링크 1개로 👥=2 재검증 → 테스트 방 2개 삭제) 확인.

**6. 검증 상태**
- ✅ `npx next build --webpack` 통과 / ✅ `npm run check:content` 통과.
- ✅ **PR #595: CI(Vercel 배포) 초록 → squash 머지 완료 → main 프로덕션 배포됨.**
- ⚠️ **실화면 시각 검증은 직접 못 함**(배포 프리뷰/프로덕션에서 스샷 그 지점이 붙었는지 PO 눈 확인 필요) — "됐다"가 아니라 "구조적으로 해결, 눈 확인만 남음"이 정확.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-07-01 밤에 텍스트 단락 줄바꿈(한/중/일 단어가 중간에서 쪼개지던 것)을 src/index.css 전역 규칙(word-break:keep-all + overflow-wrap + text-wrap)으로 뿌리뽑아 #595 머지·배포 완료했어. 전수 점검도 끝(break-all=이메일/ID만, 강제 br·i18n \n 잔재 없음). 이 건은 종료 — PO가 실화면에서 또 어색한 줄바꿈 스샷 주면 그 자리만 국소 대응하면 돼. 그다음엔 이전 세션 이월분(화상 상담 A/V 통합링크 재검증·테스트방 삭제)을 봐.

---

## 🔖 세션 핸드오프 (2026-07-01 저녁 — 화상 상담 테스트 링크 발급 + "각각 입장되는데 서로 안 보임" 진단)

> PO: "다른 세션이 화상회의 고치는데 감을 못 잡네, 넌 그냥 테스트용 임시 링크나 만들어줘" → 링크 발급(코드수정 X, DB에 테스트행만) → PO 실테스트 "각각 입장만 되고 화면·마이크 공유 안 됨" → 서버·코드 진단으로 원인 좁힘 → "다른 세션이 수정 완료했다니 걔한테 마저 시킬게, 넌 인수인계하고 퇴근".

**1. 이번 세션 한 일** (⚠️ 코드 0줄 — 전부 Supabase DB에 테스트 데이터만 삽입)
- 화상 상담(원격협진) **테스트용 임시 방 + 게스트 초대링크**를 DB에 직접 생성. 실제 API/폼 안 거치고 `consultation_sessions` + `consultation_guest_tokens`에 SQL로 삽입(토큰은 코드 발급과 동일하게 **평문의 SHA-256 해시**로 저장, URL엔 평문). **상담방 2개 / 초대토큰 3개**:
  - **방A** `50d5bc43-7e4c-405b-afdd-229233976bc2` — 통합 링크 1개(role=guest, 30일·100회). 테스트로 used_count 4까지 소모됨.
  - **방B** `aa9804ee-e0eb-44d6-bf03-b1480c13d104` — 코디용/환자용 토큰 2개 따로(role=coordinator/patient, 30일·50회씩). 신원충돌 우회 실험용.
- 각 링크를 DB에서 **해시일치·미만료·같은 방·status=scheduled** 통과 확인.

**2. 왜 그렇게 했는지**
- PO는 계정/코디 화면 안 거치고 **컴·폰으로 바로** 테스트하고 싶어함 → 게스트 초대링크면 충분. 대기실(의료진 승인)은 기본 OFF라(`CONSULTATION_WAITING_ROOM` 미설정) 링크만 열면 즉시 입장.
- 방B에서 코디/환자 토큰을 **일부러 2개로 나눈 건** 아래 진단(신원충돌)을 우회하는 실험. **실제 서비스는 링크 1개가 정답**(코디=로그인 staff, 환자=게스트 → 신원 자동 분리). PO도 "왜 구분해야 하냐"고 물어 이 점 확인함.

**3. 안 끝났거나 보류**
- **화상통화 근본수정 = 다른 세션 담당**(브랜치 `work/consult-av-basics-fixes`, PR #578~#591로 A/V 방탄화 진행, "수정 완료" 주장). 이 세션은 **진단만 넘김.**
- **테스트 데이터(상담방 2개) 정리 필요** — 테스트 끝나면 삭제(PO가 "지워줘" 하면 방A·방B의 세션+토큰 삭제).

**4. 주의·함정**
- ⚠️ **이 세션은 공용 메인 폴더(HEALO_KHIDI)에서 돌았고, 현재 그 폴더 HEAD = 다른 세션 브랜치 `work/consult-av-basics-fixes`.** 그 브랜치 커밋(#578~591)과 미커밋 파일(`app/consultation/[id]/_roomCopy.js`·`page.jsx`)은 **다른 세션 작품 — 건드리지 마라.** 이 세션 산출물은 코드가 아니라 DB 테스트행뿐(이 핸드오프 문서 편집 외 git 변경 안 함).
- **진단 결론 — 👥 참가자 카운터가 둘 다 1** = 두 명이 같은 방에 **동시에 안 잡힘**. 유력 원인 = **로그인 없이 양쪽 다 게스트 + 같은 초대토큰**이면 guest 신원(identity)이 겹침. identity는 `guest-<role>-<토큰8자리>-<기기suffix>`([guest-join/route.ts:157](app/api/khidi/consultation/%5Bid%5D/guest-join/route.ts:157))라 같은 토큰이면 앞부분 동일 → 입장 직전 같은 identity를 `removeParticipant`로 강제 제거([:170](app/api/khidi/consultation/%5Bid%5D/guest-join/route.ts:170)) → **서로 튕겨냄**. 인앱브라우저(카톡 등)면 localStorage 차단→기기suffix 랜덤폴백([page.jsx:221](app/consultation/%5Bid%5D/page.jsx:221))으로 충돌 악화 가능. 또 [PresenceGuard(page.jsx:243)](app/consultation/%5Bid%5D/page.jsx:243)가 백그라운드 60초 시 자동 퇴장 → 혼자 2기기 테스트를 방해.
- **별개(통화 무관)**: LiveKit webhook 설정 URL이 죽은 옛 도메인 `healo-khidi.com`([webhook/route.ts:12](app/api/livekit/webhook/route.ts:12)) → 최근 로그창(2시간)에 이벤트 0건. 녹화·종료상태 기록용이라 통화엔 영향 없음. 나중에 `healwith.co.kr`로 교체 권장.
- **env 누락 아님**: `LIVEKIT_URL`·`API_KEY`·`API_SECRET` 3개 다 Vercel prod에 설정됨(type=sensitive라 값은 API로 못 되읽음 — "없음"으로 보여도 실제 있음, guest-join 4회 성공이 증거).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 다른 세션 A/V 수정이 배포됐으면 **통합 링크(방A `50d5bc43…`) 1개로 재검증** — 컴·폰 둘 다 **로그인 없이 같은 링크**를 (카톡 말고 크롬/사파리로) 열어 👥가 **2** 뜨는지. 2 뜨면 신원충돌 해소 확정, 여전히 1이면 media(WebRTC/TURN)로 방향 전환.
2. 테스트 끝나면 **테스트 상담방 2개 삭제**(방A `50d5bc43…` + 방B `aa9804ee…`의 세션·토큰).
3. (선택) LiveKit webhook URL을 `healwith.co.kr`로 교체.
- ※ 화상 A/V **코드 수정 자체는 이 세션 영역 아님**(다른 세션 `work/consult-av-basics-fixes`가 담당).

**6. 검증 상태**
- ✅ **테스트 링크(내 작업)**: 방A·방B 토큰 전부 DB에서 해시일치·미만료·같은 방·`scheduled` 검증. 대기실 OFF도 코드로 확인.
- ❌ **미검증(솔직히)**: 실제 영상·음성이 뜨는 **end-to-end는 직접 못 봄**(기기 2대+실카메라 필요).
- ❌ **화상통화 근본원인(신원충돌 가설)**: 코드 근거로 강하게 추정하나 LiveKit 실참가자 identity를 **직접 못 봄**(creds가 sensitive라 서버 프로브 불가) → **확정 아님**. 위 5-1 재검증으로 확정할 것.
- **PR/CI**: 이 세션 코드 변경 0 → 내 PR 없음. 다른 세션 #578~591 상태는 **내가 확인 안 함**(내 영역 아님).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-07-01 저녁에 화상 상담 테스트용 임시 링크를 DB에 심어 발급하고(코드수정 X), "각각 입장은 되는데 서로 안 보임(👥 둘 다 1)"을 진단해 다른 세션(work/consult-av-basics-fixes)에 넘겼어. 유력원인=로그인 없이 양쪽 게스트+같은 초대토큰이라 guest identity가 겹쳐 서로 튕김(guest-join의 removeParticipant). 그 세션이 A/V 수정 배포했으면 **먼저 통합 링크(상담방 50d5bc43…) 하나로 재검증**: 컴·폰 둘 다 로그인 없이 같은 링크(크롬/사파리) 열어 👥가 2 뜨는지 → 2면 해소, 1이면 media(TURN)로 파. 그 뒤 테스트 상담방 2개(50d5bc43…, aa9804ee…) 삭제하고, 여유되면 LiveKit webhook URL을 healwith.co.kr로 교체.

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
