# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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

## 🔖 세션 핸드오프 (2026-06-19) — 핸드오프 시스템 고도화: 닫힌 고리(A~G) + 종료 문지기(강제) + PO 취향 누적 원장

**이번 세션 한 일 (PR [#74](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/74) main 머지·squash `5c5d4a4`):**
- **인수인계(핸드오프) 시스템을 "쓰고 끝"→"닫힌 고리"로 고도화.** PO 질문("정기 핸드오프 vs 한 세션 길게?")에서 출발 → 답은 *"한 덩어리는 끝까지, 끝나면 핸드오프하고 새 세션"*, 그게 안 깨지게 시스템으로 강제.
- **A 미검증 자동 승격**: `/handoff` 스킬에 — 검증상태의 "미검증"을 다음할일 1번으로 끌어올리는 규칙.
- **B 핵심 직접 표시**: `session-orient.sh` 훅이 세션 시작 시 *다음할일·보류·검증상태* 3칸을 PROJECT_CONTEXT에서 긁어 직접 띄움(안 읽어도 눈앞). awk로 `**헤더**` 섹션 추출.
- **C 뒤처짐 경보**: 마지막 핸드오프 커밋 이후 5커밋+/2일+ 경과 시 훅이 경고.
- **D 자동 보관**: `scripts/handoff-rotate.mjs` — 핸드오프 3개+면 가장 오래된 걸 `docs/archive/`로 회전(`npm run handoff:rotate`). 2개 이하면 무동작.
- **E PR/CI 수집**: 스킬이 열린 PR·CI 상태를 기억 말고 GitHub MCP로 확인해 검증상태에 기재.
- **F 완결성 검사**: `scripts/check-handoff.mjs` — 6칸·절대날짜·상대표기(어제/오늘 금지) 자동 점검(`npm run check:handoff`).
- **G PO 취향 누적 원장 신설**: `docs/PO_PREFERENCES.md` — 고정 규칙(CLAUDE.md) 밖의 유동적 PO 취향을 `/handoff`가 대화 분석해 「활성 취향」에 누적, 훅이 매 세션 시작 시 자동 표시. 시작값 5개 박음(3D의료이미지 거부·어설픈디자인 거부·"일단 됐다"=종료·결과물우선·⭐질문찔끔금지).
- **세션 종료 문지기(강제) — PO가 "강제로 막아라" 결정**: `.claude/hooks/handoff-gate.sh` (Stop 훅). 종료 시 ①check:handoff 실패 또는 ②직전 핸드오프 이후 커밋 2개+ 면 `decision:block`으로 **세션을 못 끝내게 막고** /handoff 강제. `stop_hook_active` 가드로 최대 1회만(무한루프 방지). settings.json Stop 배열에 연결(auto-commit-push 다음).
- CLAUDE.md·스킬·package.json(check:handoff·handoff:rotate) 갱신.

**왜 그렇게 했는지:**
- **지시문 vs 훅 구분이 핵심**: PO 우려 "다른 세션이 제대로 안 하면 비개발자인 내가 어떻게 교정?" → 답: **지시문(스킬)은 게으른 세션이 건너뛸 수 있으나, 훅은 도구(Claude Code)가 강제 실행 → 못 건너뜀.** 그래서 중요 규칙을 훅/검사로 박음. PO 교정수단 = "말 한마디"면 그 세션이 검사룰/훅으로 변환·영구화.
- **문지기를 강제(hard block)로**: PO가 경고/강제 중 "강제" 선택. 단 stop_hook_active로 1회 제한 + 판단불가/에러는 통과 → 작업을 인질로 잡지 않음.
- **취향 원장을 CLAUDE.md와 분리**: 고정 규칙은 무겁고, 유동적 취향은 자주 바뀜 → 별도 원장 + 훅 자동표시가 가볍고 누적에 적합. 3회+ 확정되면 CLAUDE.md로 승격.

**안 끝났거나 보류:**
- 없음(이 세션 작업은 PR #74로 전부 머지·배포 완료). 다른 트랙(Gemini 유료·도메인·RAG 등)은 아래 "이전 세션에서 이어지는 보류" 참고 — 이 세션과 무관하게 그대로 유효.

**주의·함정:**
- **종료 문지기 실차단은 시뮬레이션만 검증**: 모의 stdin(루프가드/무차단/차단 JSON 이스케이프)으로 전 경로 통과 확인했으나, **실제 Claude Code Stop 이벤트에서 진짜로 막히는지는 다음 세션 첫 종료 때 처음 확인됨.** 만약 안 막거나 과하게 막으면 `handoff-gate.sh` 조건(since>=2, stop_hook_active) 조정.
- **문지기가 너무 자주 막으면**: 커밋 2개+ 기준이 빡세면 잡담성 세션도 막힐 수 있음 → 거슬리면 threshold 상향 또는 경고 모드로 전환(PO 한마디면 조정).
- **취향 원장 군살**: 「활성 취향」이 길어지면 훅 출력이 길어짐 → 오래된 건 「보관」으로 내릴 것.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인**: 이 세션 종료 시 **종료 문지기가 실제로 작동하는지**(핸드오프 강제) 첫 관찰. + session-orient 훅의 B/C/G 출력이 이 세션 시작 때 정상 떴는지(이미 resume에서 정상 확인됨).
2. (이전 트랙) Gemini 유료 확인 → 회의록 활성화(env `GEMINI_PII_BILLING_CONFIRMED=true`).
3. (이전 트랙) 라이브 클릭 검증: 회의록 실데이터 / RAG 출처·톤 / WhatsApp 버튼 / 새 사진.
4. (이전 트랙) 도메인 `healwith.co.kr` 결제되면 컷오버.
5. KHIDI 중간평가(2026-08-27) 상시 — `docs/KHIDI_중간보고_베이스.md`.

**검증 상태:** PR #74 = **CI(`ci`·`Smoke Tests`·`Vercel`) 전부 초록 + main 머지(squash `5c5d4a4`) + 배포 완료.** E2E류는 스킵(정상, main 푸시 전용). 직접 검증한 것: `check:handoff`·`handoff:rotate`(--keep 1로 3블록 회전 시나리오 임시복사본 검증)·`session-orient.sh` 실행·`handoff-gate.sh` 모의 stdin 전 경로(차단 JSON 인용/줄바꿈 이스케이프 포함). **미검증**: 종료 문지기의 실제 Claude Code Stop 이벤트 차단(시뮬만 함) — 위 1번으로 승격.

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
