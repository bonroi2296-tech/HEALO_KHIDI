# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-19 저녁) — 화상상담방 줌화(스피커뷰·화면공유포커스·화질·언어전환) ⚠️작업 진행중·이어감

> **이 트랙은 아직 안 끝났다. PO가 "이어나갈 것"이라 명시.** 아래 5번(다음 할 일) + 미검증분부터 그대로 이어가라. 같은 날 "오후" 블록(↓)의 연장선.

**이번 세션 한 일 (PR 4건 전부 main 머지·실서비스 배포):**
- **참가자 수 + 경과 시간 오버레이** ([#79](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/79), `4cd07eb`): 영상 좌상단 `👥N · mm:ss`. 다자 미팅 인원·진행시간(줌 벤치).
- **화면공유 자동 포커스 + 화질 720p/simulcast** ([#80](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/80), `8cf0deb`): 화면 공유 시 자동으로 크게(FocusLayout). `ROOM_OPTIONS`(LiveKit): 720p 캡처+h180/360/720 simulcast+adaptiveStream/dynacast.
- **스피커 뷰 기본(발화자 자동 메인) + 화면공유 1080p 인코딩** ([#81](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/81), `33ab84e`): 균등 그리드 폐기 → 말하는 사람이 자동 메인. 우선순위 **수동핀 > 화면공유 > 발화자(`useSpeakingParticipants`) > 첫 원격카메라**. `screenShareEncoding` 1080p(3Mbps).
- **입장 시 언어 선택 → 전체 UI 그 언어로 전환** ([#82](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/82), `58c2b61`): 기존엔 'My language'가 번역 방향만 바꾸고 화면은 영어 고정이었음(PO 지적). → `setLangCookie`+`healo:langchange` 이벤트로 `useLang()` 전역 갱신. 입장 폼 + 방 안 언어시트 양쪽. **프리뷰에서 한국어 전환 실제 확인.**
- (세션 전반 인프라) **종료 문지기 강제차단 OFF**(`handoff-gate.sh` ENFORCE=0) — 핸드오프는 PO 트리거 + 과부하 시 어시스턴트 제안 방식으로(PO 결정). PO_PREFERENCES 갱신.
- **테스트 상담 운영**: id `87710d1d-dbae-4fe2-8810-93ee6d6ef7e1`, 의사/환자 게스트토큰 2개(14일·각10회). 의사 invite=`cf3678…9bca6b0` / 환자 invite=`2ce242…4062a7c5`. **PO가 "종료" 누르면 토큰 자동 폐기됨 → `revoked_at=NULL, used_count=0`로 리셋하면 재사용**(이번 세션 4번 리셋함).

**왜 그렇게 했는지:**
- **스피커 뷰로 전환**: PO가 "1:1:1 균등 그리드면 누가 말하는지·공유화면 집중 안 됨, 줌처럼 발화자가 메인에" 요청. 마지막 발화자 유지(`dominantId` state)로 깜빡임 방지.
- **화질은 "큰 화면이 고화질 계층 받게"가 핵심**: adaptiveStream은 작은 타일엔 저화질을 보냄 → 메인을 항상 크게 잡아야 선명. 단 웹캠·회선 자체 한계는 코드로 못 넘음(PO에 명시).
- **언어 전환은 쿠키+이벤트**: 사이트 메인 스위처는 URL 이동 방식인데, 게스트 상담 페이지는 이탈하면 안 됨 → 쿠키 세팅 + `healo:langchange` 발송으로 페이지 내에서 전역 `useLang` 갱신(이탈 없음).

**안 끝났거나 보류:**
- **⛔ 방 안 영상 UI 전부 PO 라이브 미검증** — 스피커뷰·화면공유 자동포커스·화질·참가자수/타이머·재연결/음소거 배너·핀. 나(어시스턴트)는 **로컬에 LiveKit env가 없어 영상방을 못 띄움** → 빌드만 통과. PO가 시크릿 2창으로 확인해야 함.
- **화질 추가 손볼 여지**: 720p/1080p 적용했는데도 흐리면 카메라/회선 문제 or 추가 인코딩 튜닝 필요(다음 트랙).
- **발화자 역할 DB 미저장**: `saveTranslationLog`가 speaker_role 안 넣음 → AI 회의록 화자 구분 불가(작은 마이그레이션).
- **테스트 상담 데이터 정리**: 트랙 끝나면 토큰/세션 정리(id `87710d1d-…`).
- TTS 비활성 유지. `Volume2/VolumeX` import 미사용(무해).

**주의·함정:**
- **배포해도 PO가 옛 화면 보면 캐시 때문** — 이번 세션 내내 반복됨. **테스트는 반드시 새 시크릿 창**(Ctrl+Shift+N) 또는 `Ctrl+Shift+R`. 일반 탭은 옛 버전 캐시.
- **"종료" 버튼 = 상담 completed → 게스트 토큰 일괄 폐기**(보안상 정상). 테스트 중엔 종료 누르지 말고 탭만 닫기. 폐기되면 SQL로 리셋.
- **로컬 LiveKit 검증 불가**: `.env.local`에 LIVEKIT_* 없음 → 게스트 입장폼까진 로컬 검증되나 영상방은 production에서만. (언어전환·폼은 로컬 검증 가능.)
- 파일이 2,600줄+ 단일 컴포넌트라 Edit 전 Read 자주 필요(상태 무효화 잦음).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인 (PO 테스트 결과 수령)**: 시크릿 2창(의사+환자)으로 **스피커뷰(발화자 자동 메인)·화면공유 자동 크게·화질·참가자수/타이머·언어전환** 실제 동작 확인. 안 되는 항목을 정확히 받아서 잇기.
2. 화질 여전히 불만이면 → 카메라/회선 점검 or 인코딩 추가 튜닝.
3. 발화자 역할 DB 저장 추가 → AI 회의록 화자 구분.
4. **Gemini 유료 확인 → AI 회의록(#68) 활성화** (env `GEMINI_PII_BILLING_CONFIRMED=true`) — 이전 세션부터 대기.
5. 도메인 `healwith.co.kr` 결제되면 컷오버 / KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:** PR [#79](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/79)·[#80](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/80)·[#81](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/81)·[#82](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/82) = **CI(ci·smoke·Vercel) 전부 초록 + main 머지 + 프로덕션 배포 완료.** `next build --webpack` 매 PR 통과. **언어 전환(#82)은 프리뷰에서 직접 클릭 검증 ✅**(한국어로 h1·라벨·버튼 전환, 쿠키 ko). **❌ 방 안 영상 UI(#79~81: 스피커뷰·화면공유포커스·화질·오버레이)는 라이브 클릭 미검증 — 로컬 LiveKit 부재로 어시스턴트가 못 봄. PO 시크릿 2창 테스트가 유일한 검증.** 열린 PR: 없음(전부 머지).

---

## 🔖 세션 핸드오프 (2026-06-19 오후) — 화상상담방 품질 개선 6종(줌·미트 벤치) + 실서비스 배포 + 테스트 상담 생성

**이번 세션 한 일 (PR [#77](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/77) main 머지·배포 완료, merge `34f6aa0`):**
- **출발점**: 카자흐 병원과의 줌 미팅 스크린샷(회의록 `회의록_카자흐스탄_260617.docx`)을 보고 PO가 "쟤들(줌) 깔끔한데 우린 너저분 → 줌·구글미트 참고해 **우리 서비스 퀄리티를 높여라**"(베끼기 아님).
- **화상상담방(`app/consultation/[id]/page.jsx`) 품질 개선 6종 구현·배포:**
  1. **입장 전 카메라 점검(pre-join)**: 게스트 이름폼에 셀프뷰(거울모드 `<video>`) + `getUserMedia`로 권한 선확보 → 통화 중 권한팝업으로 끊기는 일 방지. 권한 거부 시 안내. (게스트 전용)
  2. **재연결 배너**: `useConnectionState`로 회선 끊김/재연결 시 영상 위 "재연결 중" 안내(불안정 회선 대응).
  3. **음소거 경고**: 마이크 끈 채 말하면 "마이크 꺼져있어요"(AnalyserNode 진폭 휴리스틱). 비기술 환자 배려.
  4. **핀/포커스**: 타일 클릭 = 그 화면 크게 고정(`FocusLayout`/`CarouselLayout`). 다자 기관미팅 대응. 발화자강조·이름표·연결품질은 LiveKit 기본 활용(`@livekit/components-styles`).
  5. **헤더 정리 + 컨트롤 하단 통합(Meet식)**: 회색 드롭다운 3개·`Room:` 내부ID·죽은 TTS버튼 제거. 조작버튼(번역·언어·패널·종료)을 마이크/카메라와 함께 **영상 하단 한 줄**로 통합. 헤더는 정보만.
  6. 언어쌍·자막크기 → 기존 언어 바텀시트로 이전. i18n 6개 언어 키 추가(reconnecting·cameraPreview·micMuted·unpin).
- **테스트 상담 생성(production DB)**: `consultation_sessions` 1행(id `87710d1d-dbae-4fe2-8810-93ee6d6ef7e1`, room `healwith-uitest-260619`) + 게스트토큰 2개(의사/환자, **7일 유효·각 10회**). PO가 나중에 직접 클릭 테스트용.
  - 의사 링크: `/consultation/87710d1d-…?invite=cf36788163…9bca6b0`
  - 환자 링크: `/consultation/87710d1d-…?invite=2ce24247d2…4062a7c5`
  - 실서비스 도메인 = **`healo-khidi.vercel.app`** (khidi.healo.kr은 죽은 주소).

**왜 그렇게 했는지:**
- **"참고=품질 향상"으로 해석**: 줌 UI 베끼기가 아니라 줌·미트가 고품질인 3축(그냥 된다=신뢰성 / 내 상태를 안다=자신감 / 길 안 잃음=단순함)을 우리 의료상담 맥락에 적용. 타깃이 카자흐 고령·비기술 암환자라 pre-join·재연결·음소거경고가 더 절실.
- **컨트롤 완전 하단통합 채택**: 처음엔 헤더 정리만(저위험) 제안했으나 PO가 "싹 다" 지시 → Meet 모델로 조작버튼 전부 하단바 통합. 공용 JSX 상수(sessionActions/languageButton/endButton)로 헤더·하단·폴백 중복 제거.
- **pin은 LiveKit `onParticipantClick` 이벤트로 클릭 타일 식별** → GridLayout/FocusLayout 전환. 발화자강조·이름표는 lk 기본테마라 추가코드 0(무료).
- **자막→기록→회의록(#3 백로그)은 추가 안 함**: 이미 연결돼 있음 — 번역이 `consultation_translations`에 저장되고 AI 회의록(#68)이 그걸 읽음(`translate-realtime/route.ts` 확인). 손댈 것 없음.

**안 끝났거나 보류:**
- **발화자 역할 DB 미저장(빈틈)**: `saveTranslationLog`가 speaker_role을 받지만 INSERT에 안 넣음 → AI 회의록이 "누가 말했는지" 구분 못 함. `consultation_translations`에 컬럼 추가하는 작은 마이그레이션 필요. PO에게 보고함(다음에 다른 개선과 묶을지 대기).
- **테스트 상담 데이터**: 테스트 끝나면 정리(revoke/delete) 필요 — id `87710d1d-…`.
- TTS는 여전히 비활성(`TTS_FEATURE_ON=false`, 기존 결정 유지). `Volume2/VolumeX` import는 이제 미사용(무해).

**주의·함정:**
- **방 안 UI는 실상담 토큰 없이 라이브 클릭 못 함** → 위 테스트 링크가 그 검증 수단. 프리뷰(헤드리스)에선 카메라가 없어 "권한 차단" 경로만 확인됨.
- **인앱 브라우저(카카오톡·라인) 금지** 안내가 있음 — 테스트는 크롬/사파리 등 실제 브라우저로(인앱은 카메라·영상 제한).
- 음소거 경고는 **휴리스틱**(임계 peak>18, 0.7초). 음소거 시 기기가 해제되는 환경(브라우저별)에선 감지 못 함 → 그땐 조용히 패스(오작동 아님).
- **자동커밋 훅**이 중간 상태를 별도 커밋(`5f3a372 chore: 작업 자동 저장`)으로 남김 → PR에 섞임(무해). `next-env.d.ts`(빌드 자동생성)도 PR에 1줄 들어감.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인**: 위 테스트 링크(의사+환자)로 **방 안 UI 실제 클릭 검증** — pre-join 셀프뷰 / 하단 통합 컨트롤바 / 핀(타일 클릭) / 재연결·음소거 배너 / 헤더 깔끔함. (이 세션에서 코드·빌드·배포는 됐으나 영상방 라이브 클릭은 PO 몫.)
2. (검증 후 빈틈이면) 발화자 역할 DB 저장 추가 → AI 회의록 화자 구분.
3. **Gemini 유료 확인 → AI 회의록(#68) 활성화** (Vercel env `GEMINI_PII_BILLING_CONFIRMED=true`) — 이전 세션부터 대기 중.
4. 도메인 `healwith.co.kr` 결제되면 컷오버.
5. KHIDI 중간평가(2026-08-27) 상시 — `docs/KHIDI_중간보고_베이스.md`. (이번 화상상담방 개선은 "ICT 체계 구축" 정성평가에 직접 기여.)

**검증 상태:** PR [#77](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/77) = **CI(ci·smoke) 초록 + main 머지 + 프로덕션 배포 READY 확인**(Vercel `dpl_6dd7…`, `34f6aa0`). `next build --webpack`·`check:content` 통과. 게스트 입장폼·셀프뷰·권한차단 안내 **라이브 렌더 확인**(콘솔 에러 0). **❌ 방 안 UI(헤더·하단바·핀·재연결/음소거 배너)는 실상담 토큰 필요해 라이브 클릭 미검증** — 다음 세션/PO가 테스트 링크로 확인(위 1번). 열린 PR: 없음(#77 머지됨).

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
