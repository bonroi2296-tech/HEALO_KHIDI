# PR

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


---

## 🔖 세션 핸드오프 (2026-06-18 늦은 세션) — 라이브 검증·죽은 도메인 진단 + AI회의록/RAG출처/홈·치료 콘텐츠 7개 PR 머지 + 위키독스 MCP

**이번 세션 한 일 (PR 7개 전부 main 머지·실서비스 배포):**
- **홈 옛 도메인 이메일 정리 + 죽은 도메인 진단** ([#67](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/67)): 홈 "긴급 연락" 이메일 `contact@healo.kr`→`admin@healwith.co.kr`. `check:content` 가드에 `@healo.kr` 추가(.com만 막던 구멍). 반성문 POSTMORTEMS #4.
- **⚠️ 죽은 도메인 발견**: 라이브 검증 결과 `khidi.healo.kr`이 **DNS·Vercel 어디에도 없음**(구글DNS도 "존재하지 않는 도메인"). 근데 canonical/hreflang/sitemap/OG가 전부 거길 가리켜 **색인 0**. 진짜 라이브=`healo-khidi.vercel.app`. PO 결정: 지금 안 고치고 `healwith.co.kr` 등록 시 처리. 경고 배너 `docs/DOMAIN_CUTOVER_healwith.md` 최상단. **URL 언어화 SSR 엔진 자체는 정상**(/ru→러시아어·/ko→한국어·hreflang 6+x-default 확인).
- **AI 상담 회의록 (화상상담 Phase A)** ([#68](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/68)): 상담 번역기록(`consultation_translations`)→Gemini→요약·결정사항·다음단계·환자우려를 기존 `ai_summary`(jsonb) 컬럼에 저장. `POST /api/khidi/consultation/[id]/summarize` + 어드민 완료상담 "AI 회의록 생성" 버튼. **DB 마이그레이션 0**(컬럼 이미 존재). **⚠️ `GEMINI_PII_BILLING_CONFIRMED=true` 게이트로 비활성**(무료 Gemini PII 학습 방지).
- **RAG 답변 출처 표기 + 책2권 학습노트** ([#69](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/69)): `generateReply.ts` 시스템 프롬프트에 "출처 표기" 규칙(병원·가격·통계에 `(출처:…)`, 출처 없으면 진술 금지). "모르면 코디"·안티환각은 **이미 구현돼 있어** 출처표기만 보강. `docs/RAG_AGENT_LEARNINGS.md` 신설(위키독스 책 2권 정독 증류).
- **treatments 통계 라벨** ([#70](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/70)): "5 · ITCRN axes"→"5 · 면역 회복 요소"(6언어, ru/kz/zh/ja 누락분도 채움). ITCRN 약자는 설명섹션에만.
- **treatments 암종 카드 사진** ([#71](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/71)): 차가운 스톡/기계 사진→면력한방 회복 실사진(산책·푸드테라피·운동·휴식 등, 기존 로컬 이미지 재매핑).
- **홈 협진 대학병원 3곳 사진 연결** ([#72](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/72)): 이대서울·이대목동·고려대구로 사진이 업로드돼 있었으나 데이터가 `_coming-soon.svg` placeholder를 가리켜 안 떴음 → 실제 경로 연결.
- **WhatsApp 문의 채널 연결** ([#73](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/73)): `/inquiry` Human Agent WhatsApp이 "준비 중"이었음 → `siteSettings.js` 기본값에 `https://wa.me/821047721075` 박음(비즈니스 번호 010-4772-1075).
- **위키독스 MCP 연결**: Claude Code(`.claude.json`) + Claude Desktop(`claude_desktop_config.json`, `cmd /c npx` 형태 — 공백경로 문제 회피) 둘 다 연결. 토큰은 PO 위키독스 계정. **남의 공개책은 MCP 말고 URL 직접 긁기.**
- 말투 규칙 훅(`session-orient.sh`)·메모리 추가(죽은 도메인·마케팅 취향).

**왜 그렇게 했는지:**
- **회의록 유료 게이트**: 무료 Gemini는 입력을 모델 학습·사람검수에 사용(약관이 PII 금지 명시) → 환자 상담 PII엔 부적합. PO가 빌링 켜고 env `GEMINI_PII_BILLING_CONFIRMED=true` 추가하면 즉시 활성(딸깍). 메인 챗은 이미 Gemini라 이건 신규 PII 흐름만 차단.
- **카드 사진 회복톤**: 면력한방 치료제 제품샷(주사기로 암세포 찌르는 3D 등)은 (a)한 병원 광고처럼 (b)"면역치료=암치료" 오해/의료광고 리스크 → 의도 배제, 회복 프로그램 사진으로.
- **ITCRN 전면 강등**: ITCRN은 면력한방 자사 브랜드 모델(immunehospital.com 출처). HEALO는 다병원 중립 컨시어지 + 한방은 보조케어 → 전면 헤드라인 부적합. 통계 라벨만 평이하게, 약자는 설명섹션에.
- **자동검사 구멍**: `@healo.kr` 잔재가 통과한 건 검사기가 `.com`만 막아서 → 가드 추가로 영구 차단.

**안 끝났거나 보류:**
- **Gemini 유료 결제** (PO 나중) → **회의록(#68) 활성화 대기.** 결제 후 env 한 줄.
- **RAG 개선 백로그** (`docs/RAG_AGENT_LEARNINGS.md`): ①출처강제·답변없음 프롬프트 ②LLM-judge 품질평가 ③크로스인코더 리랭킹 ④HyDE/청킹/BGE-M3. 책2권(위키독스 #2155 NLP·#19414 에이전트) 증류. 추천순서 A→D→B→C.
- **도메인 `healwith.co.kr` 결제** (결제담당 손, 우리 밖) → 등록 시 env 전환 + JSON-LD 14곳 grep치환(`DOMAIN_CUTOVER` §3).
- **로고**: PO가 SVG·PNG 옵션(h/hw/arc/h+) 다 거부("싹다 별로"). 전문 디자이너/도구 필요. 임시 파일은 `logo/`·바탕화면.
- **treatments 히어로 ITCRN 전면 재구성**: 제안만 했고 미적용(통계 라벨만 변경).
- 나머지 메신저 채널(Telegram·LINE·WeChat) 여전히 "준비 중"(링크 생기면 siteSettings에 추가).

**주의·함정:**
- **회의록 #68**: `GEMINI_PII_BILLING_CONFIRMED=true` 전엔 503(billing_required, 버튼 "유료 설정 후 켜집니다"). **실데이터 런타임 미검증.**
- **RAG 출처표기 #69**: 실제 답변에 출처 자연스럽게 붙는지·톤 해치는지 **런타임 미검증**(환자화면이라 톤 PO 확인 권장).
- **자동커밋 훅** 때문에 작업이 엉뚱한 브랜치에 섞일 수 있음(이번에 이메일PR에 회의록 섞여 분리수술함) → **기능별 브랜치 먼저 따고** 작업.
- `logo/` 폴더(PNG들) untracked, `public/images/hospitals/Hospitals_Rev1.zip`이 공개 주소로 노출(정리 권장, 미처리).
- **폰↔컴 세션 끊김/자동보관 = Claude Code 앱 동작**(우리 설정 무관, 끄는 설정 없음). "어디서나 싱크" 원하면 Remote Control(`claude --remote-control`, 컴 켜둬야). PO "일단 됐다".

**다음 세션이 먼저 할 일 (우선순위):**
1. **Gemini 유료 확인 → 회의록 활성화**(Vercel env `GEMINI_PII_BILLING_CONFIRMED=true`).
2. **라이브 클릭 검증**(이번 세션 미검증분): 회의록 실데이터 / RAG 답변 출처·톤 / WhatsApp 버튼(/inquiry) / 새 카드사진·대학병원 사진.
3. 도메인 `healwith.co.kr` 결제되면 컷오버.
4. (선택) RAG 개선 착수 — `RAG_AGENT_LEARNINGS.md` A1(프롬프트 규칙)부터.
5. KHIDI 중간평가(2026-08-27) 상시 — `docs/KHIDI_중간보고_베이스.md`.

**검증 상태:** PR #67~#73 = **CI(ci·smoke·Vercel) 전부 초록 + main 머지 + 배포 완료.** `next build --webpack`·`check:content`·회의록 라우트 등록 확인. **런타임(실제 동작) 미검증 항목**: 회의록 실데이터 생성, RAG 출처 렌더/톤, WhatsApp 버튼·새 사진 라이브 클릭 — **솔직히 다 PO/다음 세션 몫(직접 클릭 안 함).**

---


---

## 🔖 세션 핸드오프 (2026-06-18) — URL 언어화 phase 1~3 완료·main 머지 + DESIGN.md 정합성 보강

**이번 세션 한 일:**
- **URL 언어화(locale-in-path) phase 1~3 전부 완료 → main 머지** (PR [#63](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/63), 머지 `944d56f`, 2026-06-18 실서비스 배포됨):
  - **phase 1 (`5a4f654`)**: 언어감지 미들웨어 + 서버가 URL 언어로 렌더(SEO 핵심). 기존 `proxy.ts`(Next16, 구 middleware)에 통합 — 별도 `middleware.ts`는 Next16에서 proxy.ts와 **충돌 에러**. `app/[lang]/` 파일이동 대신 **rewrite 방식** 채택(같은 SEO·깨질 위험 훨씬 적음. 계획서 "락"이던 파일무브를 의도적으로 변경).
  - **phase 2 (`15bce8e`)**: 공개 페이지 **전체** 언어화(`proxy.ts`의 `PUBLIC_PREFIXES`). 내부도구(admin/patient 등)·auth·게스트(consultation/survey) 제외. 옛 `/ru`·`/kk` 랜딩은 `LEGACY_SKIP`로 보존(Yandex 자산). **구식 클라이언트 7개**(useEffect+쿠키 직독 → SSR이 영어 → 구글봇이 영어로 봄)를 `useLang()`로 교체. 언어 스위처가 reload→새 언어 URL 이동(`localeSwitchTarget`. 미들웨어가 쿠키를 URL언어로 덮어써 전환 깨지던 버그 수정). 언어목록 `src/lib/i18n/config.js` `LOCALES`로 단일화.
  - **phase 3a (`7233083`)**: hreflang/canonical 중앙화(`src/lib/i18n/metadata.js` — layout generateMetadata가 요청 언어별 생성, 공개페이지 상속). 공개페이지 16곳 자체 alternates 제거 + 옛 `?lang=` 폐기. 암종 상세 제목 언어화. sitemap 6언어 URL+hreflang.
  - **phase 3b (`02cf1c0`)**: 공개페이지 탭제목 한국어 잔존 제거. `seo.*` 사전키 14개×6언어(`check:content` 패리티가 누락 강제) + `localizedMeta` 헬퍼 + 7개 페이지 generateMetadata 전환(home·treatments·hospitals·telemedicine·care-journey·inquiry·immune). 제목 `{absolute}`로 루트 template "%s | healwith" 중복 회피. **`meta.*`가 기존 21곳 사용중이라 `seo.*` 신설(키 충돌 회피).**
  - **CI 막판 수정 (`d631fc2`)**: `check:i18n`(index.js를 eval하는 검사기)이 phase2에서 추가한 import문에서 깨짐 → import 제거+심볼 stub으로 견디게. **자동검사가 잡아준 케이스("기계가 잡는다" 실천).**
- **DESIGN.md 정합성(coherence) 보강 → main 머지** (PR [#64](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/64), `396d2d0`): StyleSeed(bitjaru) 칼럼 4편 분석 → **도구 미도입, 원칙만 흡수.** 우리 코드에 실재하던 "축 미고정"을 발견해 가이드에 명문화: elevation(그림자 5종 난무→용도별 1값), numeric(`tabular-nums` 0회→적용+숫자:단위 2:1), motion(duration 난무→200 통일), ux_states(빈/로딩/에러). **문서만 변경, 페이지 UI 미변경(change_authority=guide_only).**
- **세션 자동보관(archive) 진단**: PO가 "세션이 자꾸 보관됨" 문의 → 훅·예약루틴·settings 전수 확인 결과 **우리 설정 원인 아님(보관시키는 자동화 0).** = Claude Code 앱 차원 세션관리 동작. 거슬리면 앱 피드백으로 신고 사안.

**왜 그렇게 했는지:**
- **rewrite 방식 채택**: 계획서는 `app/[lang]/`로 39개 파일이동(위험 큰 방식)이었으나, 같은 SEO 결과를 내며 파일 안 옮기는 rewrite로 변경 → PO 최우선 가치("안 깨지게")에 부합. (PO에게 "같은 결과·덜 위험"으로 설명·승인).
- **구식 클라이언트 교체가 SEO 핵심**: 기본 디자인모드=`legacy`라 쿠키 없는 첫 방문(=구글봇)이 legacy 클라이언트를 받는데, 걔네가 SSR을 영어로 그려서 `/ru/`도 구글엔 영어로 보임 = URL 언어화가 헛수고될 뻔. 발견·수정함.
- **StyleSeed는 도구 미도입**: 우리 DESIGN.md가 이미 70%(단일강조색·모서리고정·AI느낌금지·자가체크) 보유 → 도구 도입은 락인·중복. 칼럼 통찰로 "우리 코드의 빈 축"만 점검해 흡수가 실속.

**안 끝났거나 보류:**
- **도메인 `healwith.co.kr` 결제** — 결제담당자 손(미결제, 우리 손 밖). 결제되면 컷오버(`docs/DOMAIN_CUTOVER_healwith.md`): Vercel 연결 + 구글 제출. **SEO 제출은 이 개편이 이미 main에 올라갔으니 도메인만 붙으면 됨.** `NEXT_PUBLIC_SITE_URL` env 한 줄만 새 도메인으로 바꾸면 sitemap/hreflang/canonical 전부 따라옴.
- **seo.* + 제목/콘텐츠 번역 정확도**: 기계초안 수준(빈칸은 검사가 보장, 정확도는 미보장). ru/kz/zh/ja 현지 검수 별도 트랙.
- **(선택) phase 5 가드 자동화**: 누출 e2e ROUTES·미들웨어 `PUBLIC_PREFIXES`가 아직 수동. app 폴더 자동발견화 미구현.
- **앱아이콘 PNG**(옛 H마크): 보류(`docs/KNOWN_ISSUES.md` P2).
- 해외 협력사 어드민 "번역": 기능 자체가 아직 없음 → 메모만(별개 트랙). phase 4=내부도구 언어화는 **삭제 확정**(SEO 무관).

**주의·함정:**
- **새 공개페이지 추가 시**: ① `proxy.ts`의 `PUBLIC_PREFIXES`에 경로 추가, ② 누출 e2e ROUTES에 추가 — 둘 다 수동(안 하면 언어화 안 되거나 검사 누락).
- **새 공개 클라이언트는 반드시 `useLang()` 패턴** (구식 `getLangCodeFromCookie()`+useEffect 금지) — 아니면 SSR이 영어로 그려져 SEO 깨짐.
- **제목/메타는 `seo.*` 네임스페이스** 사용(`meta.*`는 기존 다른 용도로 쓰임 — 충돌). 페이지 title은 `{absolute}`로 줘야 루트 template 중복 안 됨.
- `next start` 로컬 검증 시 옛 포트 프로세스가 안 죽어 stale 서버에 붙을 수 있음(Windows `pkill -f` 매칭 실패) → 새 포트 쓰거나 `taskkill //F //IM node.exe`.
- DESIGN.md elevation/numeric/motion은 **신규 작업용 가이드**일 뿐 — 기존 코드의 그림자 5종·숫자 tabular 일괄정리는 **안 함**(요청 시 별도, 화면 손대는 작업).

**다음 세션이 먼저 할 일 (우선순위):**
1. **라이브 실기기 클릭 검증** — 진짜 라이브는 **`healo-khidi.vercel.app`** (핸드오프가 "실서비스"라던 `khidi.healo.kr`은 **DNS·Vercel 어디에도 없는 죽은 주소** — 2026-06-18 검증). 언어 전환(스위처가 새 URL로 가나)·문의폼·화상상담 클릭은 아직 미검증(클라이언트 JS라 curl 불가). **⚠️ SEO 치명타: canonical·hreflang·sitemap·OG가 전부 죽은 khidi.healo.kr을 가리킴 → 색인 0. 도메인(healwith.co.kr) 등록 시 처리 — ① env 전환(sitemap/hreflang/canonical/OG) + ② 하드코딩 JSON-LD 14곳 grep 치환(env 안 따라옴). 둘 다 `docs/DOMAIN_CUTOVER_healwith.md` 최상단 ⚠️ 배너+§3에 박아둠.** (URL 언어화 SSR 엔진 자체는 정상: /ru→러시아어·/ko→한국어·/en→영어, hreflang 6+x-default 확인.)
2. 도메인 `healwith.co.kr` 결제되면 → 컷오버 + 구글/Yandex 제출.
3. (선택) phase 5 가드 자동발견화 / seo.* 현지 번역 검수.
4. KHIDI 중간평가(2026-08-27) 상시 기준 — `docs/KHIDI_중간보고_베이스.md`.

**검증 상태:** PR #63·#64 = **CI(ci·smoke·Vercel) 전부 초록 + main 머지 완료.** `next build --webpack` / `/ru/*` 서버 러시아어 렌더·`/en/*` 영어 / canonical=자기언어·hreflang 6+x-default / 탭제목 언어별 / 내부페이지 hreflang 0·`/admin` 보호·게스트링크·옛 러 랜딩 정상 / e2e 누출 40개 / check:content·i18n·cancer-i18n·legal 통과. **라이브 실기기 클릭(스위처·문의폼·화상상담)은 미검증 — PO/다음 세션 몫.**

---

---

## 🔖 세션 핸드오프 (2026-06-17 늦은 세션) — 다국어 누출 전수 차단 + URL 언어화 개편 착수

**이번 세션 한 일:**
- **법률문서 6개 언어 정합** (PR #61 머지): 개인정보처리방침 외국어 5개(en·ru·kz·zh·ja)가 한국어판보다 뒤처져 있던 것 동기화 — 자동화결정 고지(§37-2) 신규 삽입, 카자흐 관할 조항 6줄 stub→24줄 확장, 국외이전 안전조치 보강, 이메일 `admin@healwith.co.kr` 통일, 잘못된 교차참조(§15→§14) 수정. 가드 `scripts/check-legal-parity.mjs`(CI 편입).
- **다국어 누출 전수 차단** (PR #61): "영어 화면인데 한국어가 뜨는" 부류를 **검사기로 전수 발견** → 8개 라우트 ~150건(암종 상세 6페이지의 합병증·통계·FAQ·칩·수술후관리 제목 + telemedicine 자막 + privacy/terms/medical-disclaimer 하단 고지 + terms 목차). 전부 6개 언어로 채움. FAQ는 클라이언트→데이터 파일(`immuneCancerDetails.js`)로 이동(검사 가능하게). 번역은 에이전트 2대로(약 330셀).
- **가드 2개 신설**(이게 핵심 성과): `e2e/i18n-no-korean-leak.spec.ts`(@smoke, **PR마다**) — 공개 25개 라우트를 영어로 렌더해 한글 남으면 빌드 실패(출처 데이터·JSX·i18n키 불문). `scripts/check-cancer-i18n.mjs`(CI) — 암종 콘텐츠 6개 언어 완성 강제.
- **/treatments**: 칩(`focusPrograms`) 한국어 평문→다국어, 빈 teal 썸네일 블록→암종별 실사진(DESIGN.md Airbnb 톤).
- **URL 언어화 개편 착수** (브랜치 `feat/url-locale-i18n`, **phase 0만 커밋 66b077c**): 계획서 `docs/PLAN_URL_LOCALE.md`(6단계) + `src/lib/i18n/config.js`(LOCALES·localeHref 등, self-check 통과). **라우트는 아직 안 건드림 = 사이트 영향 0.**
- 반성문 `docs/POSTMORTEMS.md` #2(법률 누락)·#3(다국어 누출).

**왜 그렇게 했는지:**
- PO가 /treatments 언어 섞임을 또 스크린샷으로 발견 → "전수조사 몇 번을 시켰는데 왜 또?" 격노. **근본원인: 자동검사가 i18n "키"·브랜드 토큰만 보고, i18n 안 거치고 데이터/JSX에 박힌 한국어 raw 문자열은 사각지대.** 게다가 폴백(lang→en→ko)이 번역 없을 때 조용히 한국어로 떨어져 빌드도 통과. → **렌더된 화면을 보는 검사**(누출 e2e)를 만들어 이 부류를 통째로 차단. "기계가 잡는다"(CLAUDE.md 상시 루틴) 실천.
- URL 언어화 = PO가 "SEO 최강이면 개편 크더라도 정석대로 해" 결정. URL에 언어 박기(`/en/`·`/ru/` + hreflang)가 정석. **새 도메인 healwith.co.kr이 검색엔진에 색인되기 전에 끝내야** 함(색인 후 구조 변경 시 301·순위 손실). 새 도메인=색인 이력 0이라 지금이 적기.

**안 끝났거나 보류:**
- **URL 언어화 phase 1~5** (메인 작업): phase 0(계획+설정)만 됨. 다음이 본체 — 미들웨어·`app/[lang]/` 구조·전 라우트 이동·메타데이터/hreflang·내부도구·가드. **상세 단계·결정사항·위험 전부 `docs/PLAN_URL_LOCALE.md`에 박아둠.** PO가 "위험 작업이라 새 세션 맑은 정신에서" 하라고 2번(체크포인트) 택함.
- **도메인 `healwith.co.kr` 등록**: 결제 담당자에게 요청해둠(장바구니 담김), 담당자가 바빠서 **미결제 — 우리 손 밖**. 그동안 "도메인 없이 할 수 있는 오픈준비 싹 다" 하는 게 이번 방향(= URL 개편이 그 핵심).
- **앱아이콘 PNG**(옛 H마크): PO "일단 보류, 나중에"(`docs/KNOWN_ISSUES.md` P2).
- 번역 품질: 완성도(빈칸 없음)는 검사로 보장, **정확도는 기계 수준** — 의료/법률 현지 검수는 별도 트랙(파일 헤더 캐비엇 유지).

**주의·함정:**
- **phase 1부터 위험 구간.** 전 사이트 주소 이동 → 내부 링크 하나 놓치면 언어 풀림, 잘못하면 화면 깨짐. `localeHref()` 헬퍼로 일괄 + grep 점검. 게스트 상담링크·survey 토큰·인증 콜백은 prefix 정책 명확히(`PLAN_URL_LOCALE.md` 위험 섹션).
- 누출 e2e ROUTES 목록은 **아직 수동**(25개 하드코딩). phase 5에서 자동발견화 예정 — 그 전엔 새 공개페이지 추가 시 목록에 손수 넣어야 검사됨.
- 활성 콘텐츠 언어 6개=`en·ko·ru·kz·zh·ja`(쿠키 `healo_lang`). `LANG_OPTIONS`엔 20+개 있지만 DICTIONARY는 6개뿐.

**다음 세션이 먼저 할 일:**
1. **URL 언어화 phase 1** — `docs/PLAN_URL_LOCALE.md` 보고 시작. 미들웨어 + `app/[lang]/layout` + `useLang` param 기반 전환 + treatments 한 섹션만 옮겨 end-to-end 검증(빌드+누출 e2e 초록 확인 후 다음).
2. 이후 phase 2(공개 전체)→3(메타/hreflang, 탭제목 한국어 문제 여기서 해결)→4(내부도구, 진입 전 실익 재검토)→5(가드 자동발견).
3. 도메인 결제되면: Vercel 연결 + 컷오버(`DOMAIN_CUTOVER_healwith.md`)의 SEO 제출은 **URL 개편 끝난 뒤**.

**검증 상태:** PR #61 = CI(ci·smoke·Vercel) 전부 초록 + 머지 완료. 누출 e2e 25개 라우트·`check:legal`·`check:cancer-i18n`·`next build --webpack` 통과 확인. phase 0 커밋 = 설정 헬퍼 self-check 통과(라우트 미변경). **라이브 실기기 클릭 검증은 PO 몫 — 미검증.**

---

---
OJECT_CONTEXT 핸드오프 아카이브

> docs/PROJECT_CONTEXT.md 최상단은 최신 2개만 유지. 그 이전 세션 핸드오프는 여기로 이동(기록 보존, 본문 군살 제거).

---

## 🔖 세션 핸드오프 (2026-06-17) — 면력 사진 self-host + 법률 번역 + 하네스 개선 + specialty/docs 정리

**이번 세션 한 일 (전부 main 머지):**
- **면력 의료진 28명 사진 self-host** (PR #50): 강서7·광명7·신촌6·성동8. 병원 사이트 핫링크 → 로컬(`public/immune/doctor/`). 핫링크 부패 실증(강주안·김주완 URL 死, 배상근·조현실 회색→일반사진). 라이브 소스는 `src/lib/data/immuneHospitalInfo.js`의 `doctors[]`.
- **면력 시설/병원 사진 연결** (PR #50·#51): 시설·배너·로고 self-host(`/immune/site/`), `partnerHospitals.js`+DB에 면력4 + 대학병원4(이대서울·목동·구로·세브란스) 갤러리 연결. 대학병원 대표사진=위키미디어 CC(출처 `_sources-wikimedia.md`).
- **홈/카피 톤 교정** (PR #52): "가격 비교 마켓플레이스" → "맞춤 안내 컨시어지", 6개 언어 42문자열.
- **약관 §15 오인용 수정 + 5개 언어 완역** (PR #53): 의료해외진출법 §15는 "의료광고 특례"라 진료비 고지 근거로 부적절 → "관계 법령에 따라"로 일반화. EN·RU·KZ·ZH·JA 16조항 완역(이전엔 외국 환자가 한국어 약관 봄).
- **개인정보처리방침 RU·KZ·ZH·JA 완역** (PR #54): EN·KO 기존, 나머지 4개 스텁→완역.
- **하네스 개선** (PR #55): `session-orient.sh`(세션 시작 자동 오리엔테이션 훅) + `/handoff` 스킬(우리 첫 스킬) + `.gitignore`에 `.claude/skills/` 포함.
- **자동저장 훅 사고 수습** (PR #56): auto-commit-push 훅이 `git add -A`로 미추적 잡파일 쓸어담아 `Hospitals_Rev1` 중복폴더(~20MB) main 오염 → 제거 + 훅을 `git add -u`(추적분만)로 안전화.
- **docs 단일 SoR 일원화 + /bug 비활성** (PR #58): 핸드오프를 이 파일 한 곳으로(흩어진 3개 → `docs/archive/`), `DISABLE_BUG_COMMAND=1`(의료 PII).
- **specialty 치과·성형·피부 내림** (PR #59): sitemap 제거 + `robots:noindex`(코드·라우트 보존). 한방(korean-medicine)은 면력 관련이라 유지.

**왜:**
- 사진 self-host = 병원이 원본 바꾸면 우리 사이트 깨지는 핫링크 위험 제거(실제로 죽은 URL 발견).
- 법률 번역 = 핵심 타깃(러·카) 환자가 약관·방침을 모국어로 못 읽던 진짜 구멍. 변호사 검토 불가라 충실 번역+§15 일반화로 최선(파일 상단 ⚠️ 검토필요 유지).
- 하네스 개선 = 세션 끊김(앱 재시작)으로 맥락 날아가던 PO 불편 → 자동 오리엔테이션·핸드오프 스킬로 완화. 책(루프/하네스 엔지니어링) 참고했으나 **"우리 실제 문제냐"가 적용 기준**(책은 신 아님 — PO 강조).

**안 끝났거나 보류 (PO 결정/행동 대기):**
- **경쟁사(CloudHospital) 개선안**: PO "다 적용" 지시했으나 대부분 선행조건 막힘 — #1 통합인박스=4채널 URL 없음, #2·#4=의료 콘텐츠+번역 필요(의료광고법·정확성), #6=파트너 계정 필요. #5(의사 프로필)는 이미 거의 됨(`/hospitals/immune` 28명). **#3 신뢰지표만 즉시 가능** — 협진병원 8·전문의료진 28·6개 언어는 진짜 숫자라 넣을 수 있음(유치건수·만족도는 데이터 없어 **가짜 금지**). 홈 디자인 건드려서 PO "홈에 넣어" 확인 대기. 기획서 `docs/COMPETITOR_CLOUDHOSPITAL_기획.md`.
- **도메인 `healwith.co.kr` 등록 + 메일함**(admin@healwith.co.kr 수신): PO 행정작업(미완 — 메일함 없어 지금 그 주소 수신 안 됨).
- **메신저 4채널 URL**(WhatsApp·Telegram·WeChat·LINE): PO 가입 후 env 등록 필요 → 통합인박스(#1) 선행조건.
- **사진**: PO "그대로 두기" 결정(대학병원 갤러리 2~5·이대서울 출처 불명 — 권리는 나중에 PO 확인). 이대서울 대표사진만 위키미디어에 없어 PO 실사진 제공하면 교체.
- **§15 정확한 조문 + 법률 번역 현지 변호사 최종검토**(특히 RU·KZ).

**주의·함정:**
- **자동저장 로봇(Stop 훅)**: 이제 `git add -u`라 미추적 새 파일은 자동저장 안 됨 → 새 파일은 직접 커밋해야 함.
- **카자흐 직원 검수 체크리스트**: `docs/CHECKLIST_KZ.md`(한글).
- 면력 의사 데이터는 `immuneHospitalInfo.js`가 라이브(`immuneHospitalDoctors.ts`는 죽은 파일).

**다음 세션이 먼저 할 일:**
1. **홈 신뢰숫자(#3)** 넣을지 PO 확인 — 넣으면 협진병원 8·전문의료진 28·6개 언어(진짜 숫자만, DESIGN.md 톤). 즉시 가능한 유일한 경쟁사 항목.
2. 도메인/메일·메신저 채널 풀리면: 도메인 컷오버(`docs/DOMAIN_CUTOVER_healwith.md`) + 통합인박스(#1).
3. KHIDI 중간평가(8/27) 상시 기준 — `docs/KHIDI_중간보고_베이스.md`. PNG 앱아이콘(옛 H마크) 재생성 남음.

**검증 상태:** PR #50~#59 전부 CI(ci·smoke·Vercel) 초록 + 머지 완료. `check:content`·`next build --webpack` 통과 확인. **라이브 클릭 검증(실기기 화상상담·문의폼 등)은 PO 몫 — 미검증.**

---

## 🔖 세션 핸드오프 (2026-06-15) — 유치 전환 대시보드 + 보안 전수조사 + 중간평가 베이스

**🎯 최우선 상시 기준 — KHIDI 중간평가 2026-08-27 (70점=잔금 30%).**
앞으로 모든 작업은 이 평가를 염두에 두고 진행(8월 급조 금지). **`docs/KHIDI_중간보고_베이스.md` 참고.**
- 공식 성과지표: 유치 **12건** / 사전상담·사후관리 **120건** / 만족도 **90점** + 정성(ICT 체계·양한방 협진).
- 정량 2개는 **유치 전환 대시보드(`/admin/khidi/conversion`)가 자동 집계** = 그게 곧 점수.
- 작업할 때마다 베이스 문서 §4 월별 로그에 한 줄 기록.

**6/15 끝낸 것 (PR #39, 브랜치 `main-70uof-bzwxye`):**
- **유치 전환 성과 대시보드**(A+): 문의→사전상담→견적·비자→유치확정(코디 1클릭)→사후관리. 성과지표 자동 집계.
- **상담↔문의 연결 버그 수정**: 상담 생성이 `inquiry_id`·병원·의사 저장 안 하던 것 + snake/camel 필드 불일치로 생성 자체가 400이던 것.
- **화면↔서버 계약 불일치 버그 13건** 일괄 수정 (영상통화 토큰 항상 실패 등) + 계약 회귀 테스트(안전망) 추가.
- **보안 전수조사 2라운드**: 오픈 이메일 릴레이·PDF 위조·RAG 비용·normalize/step2 IDOR·에러메시지 노출·게스트 PII 노출·KST 시간대 3건·정규화 이중암호화·의료필드 평문 → 전부 수정. RLS·시크릿 이상 없음.
- 검증: build 통과, vitest 120개 통과. **단 라이브 클릭 검증은 PO 몫** (영상통화·상담생성·재예약·비자제출·문서함·문의폼 자동채움).
- ⏳ 라이브러리 취약점 high 5(간접 의존성) — `npm audit fix`도 빌드 깨져 보류, 수작업 필요.

**6/15 추가 (카자흐 현지 에이전시 요구 반영, PR #39):**
- **케이스 진행상황 추적**: 코디가 단계 설정(접수→사전상담→병원검토중→일정조율→비자→치료→사후관리) → 환자·에이전시가 확인. `/admin/khidi/cases`.
- **보험 입력칸**: 보험사·증권번호(암호화)·보장범위·상태 (보험사 연동 자체는 PO 컨택 대기).
- **에이전시 전용 포털** `/agency`: 의뢰 환자 진행 단계바·메모·타임라인. 계정 발급 `/admin/khidi/agencies`.
- ⏳ **서비스명**: HEALO 상표 문제 → healwith 등 후보 리서치 + 결정 후 코드 일괄 리네임(미착수, PO 결정 대기).
- ⚠️ **데모 테스트 시드 삭제**: `scripts/cleanup_test_seed_20260615.sql` (실보고 전 필수).

**한글 문서 도구**: kordoc(HWP/PDF→MD, `kordoc fill`로 양식 채우기) + poppler + olefile 설치됨. 8월에 베이스→양식 `.hwp` 출력에 사용.

---

## 🔖 세션 핸드오프 (2026-06-13) — 챗봇 의료 안전 + 모바일/UI

**6/13 끝낸 것 (PR #29~#34 전부 main 합침·배포):**
- **챗봇 의료 안전 풀스택** (핵심): 파인튜닝 대신 시스템 프롬프트로 톤·정책 주입
  - 연결·동행 톤(병원 비교 마켓플레이스 X) / 불안 환자 공감 / 비진료 포지셔닝
  - **의료 레드라인 8종** (`docs/AI_MEDICAL_REDLINES.md`): 진단·치료선택·약물·생존율·검사판독·사례보장·비용확정·한방완치 금지. 답변 끝 면책 한 줄
  - **자동 채점기 부활+강화**: `ai_regression_tests` 0건→23건(ko/en/ru/kz). 가짜 프롬프트 테스트하던 결함 수정→실제 buildSystemPrompt 채점. 매일 03:00 KST, 통과율<90%/평균<0.7 시 코디·어드민 알림
  - **라이브 채점(judge.ts)에도 레드라인 반영**: 실사용 답변마다 위반 감지→overall<0.6 시 코디 실시간 알림
- 모바일/전체 UI: 전역 명조체 강제 버그 수리(Pretendard), 히어로 여백·통계 그리드, 자료뷰어(같이보기 2단계)
- 🚨 서비스워커 stale 캐시 모바일 먹통 핫픽스(sw.js v2)
- Gemini 모델 `gemini-flash-latest`(자동최신) 원복 — **AI 임의 구형 고정 절대 금지(PO 격노)**

**⏳ 월요일/형 액션 대기 (6/13 형 부재 — 일요일까지 직접 작업 안 함 선언):**
- ① **자동 채점기 첫 실행 검증**: 배포됐으니 어드민 `/admin/khidi/ai-regression` "지금 실행" → 실제 점수 확인 = 오늘 넣은 정책이 진짜 먹히는지 검증 (로컬 키 없어 미검증 상태)
- ② Gemini spend cap(5분) / 폰 자막·버튼·자료뷰어 테스트 / AI 국외이전 고지 검토
- ③ 병원장 만날 때 `AI_MEDICAL_REDLINES.md` 8개 1회 확인
- ④ 경보 자동대응(claude-code-action) 원하면 Claude 키 등록

**🚧 다음 작업 (계획서 완비 — 승인 후 바로 구현):**
1. **RAG 자료 검수 도장** — `docs/PLAN_RAG_REVIEW_STAMP.md` (의료 안전 마지막 조각, 단계적 도입 필수)
2. 같이보기 3단계(페이지 동기화) — `docs/PLAN_DOC_COVIEW.md` (폰 2대 검증 필요)
3. Gemini Live Translate PoC(카자흐 확정) / i18n 27p 중앙화 / Supabase 신키 마이그레이션(연말)

---

## 🔖 세션 핸드오프 (2026-06-12) — 피버모드 대규모 정비

**이 세션(6/11~12)이 끝낸 것 (PR #19~#28 전부 main 합침·배포):**
- 자막 추임새 정리(3겹 필터) + TTS 임시 OFF(`TTS_FEATURE_ON` 플래그)
- **전체 E2E 53개 사상 첫 초록불** (깨진 14개 수리 + 브랜치 수동실행 트리거 + 실패알림 권한 수리)
- Next.js 16.2.9 보안패치 / 에러원문 노출 16개 라우트 차단 / **Sentry 가동**(빌드충돌+CSP 해소, DSN은 PO가 등록)
- **AI 토큰 방어 적용**: aiGuard(IP 50/일·전역 2000/일·Sentry 경보) + 공개 AI 5곳 DB 레이트리밋
- **전역 명조체 강제 버그 수리**(src/index.css `font,*` 핵) + 모바일 히어로/통계 정비 — UI 체감 대폭 개선
- **🚨 서비스워커 stale HTML 캐시 = 모바일 전체 먹통** 핫픽스(sw.js v2 — HTML 캐시 금지, 자동회복)
- 경로 별칭 @/ 262파일 / ESLint TS 부활(잔여 에러64·경고1천 백로그) / 코워크 리뷰 교차검증(docs/REVIEW_CROSSCHECK)
- 자료공유 1단계(상대 화면 실시간 표시+알림) / `/trend` 커맨드 / 심층리서치(docs/DEEP_RESEARCH_2026_06_11)

**⚠️ 절대 규칙 (PO가 화내며 직접 지시):**
- **Gemini 모델: `gemini-flash-latest`(자동 최신) 유지. AI가 임의로 구형 고정 금지.** 비용은 spend cap+aiGuard로.
- 배포는 평소 하루 1~2회로 묶기 (잦은 배포가 캐시류 사고 유발 — 6/12 교훈)
- 개발 용어는 쉽게 풀고 원어 병기 (PR=합치기 신청서, CI=자동 검사)

**⏳ PO 액션 대기:** ① Gemini 콘솔 spend cap(5분) ② 폰 자막 실테스트 ③ AI 국외이전 고지 초안 검토(docs/AI_PRIVACY_NOTICE_DRAFT.md) ④ Resend 도메인 인증(실패 메일용)

**🚧 다음 작업 후보 (우선순위):**
1. 자료 "같이 보기" — ✅2단계(방 안 뷰어) 구현됨(폰 PDF 렌더 실테스트 필요). 남은 건 3단계(페이지 동기화 "따라가기", 폰 2대 검증 필요) — `docs/PLAN_DOC_COVIEW.md`
2. 외부 글 2건 분석 (네트워크 전체허용 완료): https://wikidocs.net/366542 · https://discuss.pytorch.kr/t/openai-ai-feat-codex/10577
3. Gemini Live Translate PoC (카자흐어 확정, LiveKit 예제 있음 — 유료 전환과 묶어서)
4. i18n 인라인 27페이지 중앙화 / lint 잔여 정리 / Supabase 신형 키 마이그레이션(연말 마감)

---

