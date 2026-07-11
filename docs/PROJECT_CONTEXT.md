# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-11 — 화상상담 통역·자막 대수술: 로그 전수조사→파이프라인 수술+통역 스위치 통일, PR #731 머지 대기)

> 브랜치 `claude/video-conference-improvements-empqb0` · **[PR #731](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/731) 초안(draft) — PO 실기기 테스트(월요일 2026-07-14 예정) 후 머지.** 프리뷰: https://healo-khidi-git-claude-video-conference-c8d606-bonrois-projects.vercel.app

**1. 이번 세션 한 일**
- PO 실사용 제보(2026-07-10 카자흐 에이전시 미팅) 기반 화상상담 통역·자막 개선 — 커밋 13개, 전부 PR #731:
  - **자막 UI 4건**: ①채팅/번역기록 패널 열면 자막 숨김 ②자막 크기 실효화(小14/中18/大24px + localStorage 유지) ③배경 글자 폭만큼만(w-fit)·투명도 인하·내 자막 5줄→2줄·면책 문구 첫 15초만(번역기록 패널 상시 병기) ④언어 설정 "A ⇄ B 방향형" + 스왑 버튼(카피 6개어)
  - **통역 파이프라인**: 발화 언어 자동 감지(`stt` route `l` 필드 + `translate-realtime`에 `detectLanguage()` 결정론 echo 가드, source_lang 감지값 기록, kz 언어쌍이면 Pro 모델) / VAD 절단 완화(0.7→1.2초, 상한 10초) / 무음 환각 반복 필터 / 맞장구 6개어 사전(`backchannelMap.ts` — 물음표 발화 제외·큐 순서 보존·DB 로그 유지) / 직전 대화 6개 문맥 전달(`convoContextRef` → 두 route 프롬프트) + 존대·용어 규칙
  - **수신 자막 신기능**(`ListenModeBridge.jsx` 신규): 상대가 통역 안 켜도 원격 참가자별 트랙을 이쪽에서 STT — 화자 이름표 정확, DataChannel 자막 오면 60초 억제(중복 방지)
  - **통역 스위치 통일**(PO "하나로 통일 못해?"): "듣기 통역" 별도 토글 폐기 → 지구본 하나. 마이크 ON=송신+수신, 마이크 OFF=수신만(`MicStateBridge`로 마이크 게이트 — 음소거 중 발화가 자막으로 방송되던 privacy 구멍도 해결)
  - **화자 이름표**: DataChannel payload에 이름 자동 첨부, 자막·번역기록에 "이름·역할·언어", 화자별 자막 슬롯 2개(교대 대화 덮어쓰기 방지)
- **7/10 통화 로그 194건 전수조사**(Supabase 실데이터): 실질 발화 정상률 ~46%. 원인 — 문장 절단 52% > STT/언어 라우팅(한국어 echo 10건) 28% > 번역 자체(심각 1건뿐). 치명 사례: 수수료 지급 방향 반전 번역. → "모델 문제가 아니라 파이프라인 앞단 문제"로 확정하고 위 우선순위 도출.
- **독립 리뷰 게이트**(8관점 병렬 에이전트) → 결함 10건 확정, 전부 수정(대표: "네?"가 물음표 제거로 "네" 긍정으로 둔갑하는 백채널 버그, 반복 필터 슬라이딩 창으로 정당한 반복 발화 영구 억제, 수신 파이프라인 전체 재시작 시 녹음 중 문장 유실, VAD 실패 시 무음 4초 청크 무한 업로드 비용 폭주).
- 문서: POSTMORTEMS #83, KNOWN_ISSUES 2026-07-11 후속 7건, KHIDI 중간보고 §4 7월 로그 1줄, 코디 사용설명서 통역 섹션, 재현 평가 스크립트 `scripts/eval-translation-cases.mjs`.

**2. 왜 그렇게 했는지**
- **PO가 통역의 핵심 니즈를 확정**: "너와 나의 대화 번역"이 아니라 **제3자 간 외국어 대화를 듣기 위한 번역**(PO는 마이크·스피커 끄고 동석, 카자흐 직원↔외국인 대화를 자막으로 따라감). 수신 자막이 이 세션의 중심 기능인 이유.
- **스위치 통일**: PO "꼭 청취모드라고 따로 만들어야 해?" — 송신/수신이라는 내부 구분을 사용자에게 노출하지 않는다(Zoom/Meet 자막 멘탈모델). "듣기만"은 마이크 OFF로 자연 표현.
- 1:1 무통역 직접 소통은 "아직 어렵다" 공감대 — Gemini Live Translate GA 시 재검토(기존 관망 항목 유지).
- 번역 모델 업그레이드 대신 파이프라인 수술을 택한 근거 = 로그 전수조사(심각 오역 1건뿐, 절단·라우팅이 대부분). 비용도 오히려 절감(맞장구 사전 처리로 호출 ~40%↓).

**3. 안 끝났거나 보류**
- **PR #731 머지 대기** — PO가 "프리뷰 먼저 볼게" 선택, 월요일(2026-07-14) 실기기 테스트 예정. 테스트 통과 시 draft 해제 후 머지.
- **로그 재현 평가 미실행** — 이 환경에 Gemini API 키 없음. `node scripts/eval-translation-cases.mjs`(키 있는 환경) 한 번이면 실패 사례 10건의 기존↔신규 번역 비교 출력.
- 후속 과제 7건은 `docs/KNOWN_ISSUES.md` 2026-07-11 항목(프롬프트 공유화, 녹음 파이프라인 통합, confidence 수집, 수신 자막 iOS 검증, 이중 자막 경계, N명 중복 비용 관찰, 무음 환각 DB 오염).

**4. 주의·함정**
- **7/10 이전 `consultation_translations.source_lang`은 오염 데이터**(한국어 echo가 ru로 기록) — 이후 로그 분석 시 신뢰 금지. 이번부터 감지 언어로 기록됨.
- **통역·자막 용어**: "청취 모드"라는 별도 개념은 폐기됨 — 문서·대화에서 "수신 자막(통역 스위치에 통합)"으로 부를 것. 사용법 = 통역 ON + 마이크 OFF.
- `SUBTITLE_SIZE_CLASS`·VAD 임계(1.2초/10초)·반복 필터(5자/30초) 상수는 page.jsx와 `ListenModeBridge.jsx` **양쪽에 존재** — 튜닝 시 둘 다 고칠 것(KNOWN_ISSUES ②에 통합 과제로 기록).
- 프롬프트를 고치면 `translate-realtime/route.ts`·`stt/route.ts`·`scripts/eval-translation-cases.mjs` **3곳 수동 동기화**(KNOWN_ISSUES ①).
- 수신 자막 파이프라인은 `liveRef` 패턴(언어·헤더를 ref로 읽음)이라 **effect 의존성에 langHint/targetLang을 다시 넣으면 안 됨** — 넣는 순간 언어 변경마다 녹음 중 문장이 유실되는 버그가 부활한다(리뷰에서 잡은 버그).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **PO 월요일(2026-07-14) 실기기 테스트 지원** — 직전 미검증분 확인이 최우선: 프리뷰에서 2기기 통화로 PR #731 본문 체크리스트 8건(채팅↔자막, 크기 大 유지, 배경 축소, ⇄ 스왑, 통역 ON+마이크 OFF=수신만, 양쪽 통역 시 중복 없음, 같은 마이크 한·러 혼용, 대명사 문맥 번역). 문제 나오면 로그(`consultation_translations` + Vercel 런타임)로 진단·수정.
2. 테스트 통과 시 **PR #731 draft 해제 → 머지**(PO 확인 후) → 실서비스 반영 확인.
3. 여유 되면 `node scripts/eval-translation-cases.mjs`(API 키 필요)로 번역 개선 정량 확인 → PR/문서에 결과 첨부.
4. 백오피스 다국어화 섹션2(아래 2026-07-09~10 핸드오프 참고)는 별도 세션 트랙.

**6. 검증 상태**
- ✅ 커밋마다 `npx next build --webpack` + `npm run check:content` 통과(로컬 실행).
- ✅ PR #731 CI: 최종 커밋(`d429b42f`) 기준 Vercel 배포 success(GitHub MCP로 확인), 프리뷰 배포 완료.
- ⚠️ **실 2인 LiveKit 통화 검증 못 함**(이 환경 불가) — 자막·통역·수신 자막 전부 실기기 미검증 → 5-1로 승격.
- ⚠️ **로그 재현 평가 못 함**(API 키 없음) — 스크립트로 대비만.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 화상상담 통역 개선 PR #731이 프리뷰까지 나가 있고 내가 지금(2026-07-14) 실기기로 테스트할 거야. 체크리스트대로 같이 확인하고, 문제 나오면 로그 보고 바로 고쳐. 다 통과하면 머지하고 실서비스 반영해줘.

---

## 🔖 세션 핸드오프 (2026-07-09~10 — 백오피스 다국어화 정책결정 + 섹션1 구현·머지, 8시간 CI 정체 진단)

**1. 이번 세션 한 일**
- PO 질문("텍스트가 왜 가끔 한 언어로 고정되냐") 답변: i18n 사전(TR/COPY 딕셔너리)을 안 거치고 코드에 직접 문자열을 박으면 그 언어로 고정된다고 설명.
- 조사 중 `src/components/costs/CostEstimateCard.jsx`(환자용, 당시 미배선 컴포넌트)가 `alert()` 3곳 포함 전체 한국어 하드코딩인 걸 발견 → 6개 언어(`COPY`+`useLang()`)로 전면 수정 + 독립 리뷰(별도 에이전트)로 문구 누락 2건 보강 + `check-content-consistency.mjs` §7 스캔범위를 `app/patient` 밖 `src/components/{patient,costs}`까지 확장. **[PR #726](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/726) 머지 완료**(POSTMORTEMS #81 기록).
- PO가 그 김에 **"어드민도 그냥 예외 없이 다국어 적용해"**로 정책 전환 지시 → 기존 전제("백오피스는 스태프가 한국인이라 한국어 고정")를 명시적으로 폐기. 범위(admin·coordinator·hospital 전체)·진행방식(섹션별 순차 PR)을 버튼으로 확정.
- **섹션1 구현**: `app/admin/{consultations,users,staff}/page.jsx` + 공용 `src/components/consultation/CreateConsultationModal.jsx`(admin·coordinator 둘 다 씀) 6개 언어화. `app/agency/PartnerPortal.jsx`·`app/patient/documents/DocumentsClient.jsx`와 동일한 `TR/COPY`+훅+`tt()` 컨벤션 재사용.
- **버그 발견·수정**: 섹션1 초회 커밋이 공개용 `useLang()`(쿠키 없으면 en 기본)을 백오피스에 잘못 적용 → E2E Smoke(`consultation-create-modal.spec.ts`)가 3연속 실패로 적발 → `useBackofficeLang()`(쿠키 없으면 ko 기본)으로 교체. 재발방지로 `check-content-consistency.mjs` §16 신설(POSTMORTEMS #82).
- **8시간 CI 정체 진단·해결**: PR #727이 8시간 동안 CI가 전혀 안 도는 것처럼 보였음 — 처음엔 GitHub Actions 인프라 장애로 오판(전역 조사·빈 커밋 재트리거 등 시도). 실제 원인은 **다른 병렬 세션이 `docs/POSTMORTEMS.md` 같은 삽입 위치에 동시에 글을 써서 생긴 진짜 머지 충돌**(`git merge-tree`로 직접 재확인해서 발견) — 이게 CI 트리거 자체를 막고 있었던 것으로 보임. 두 세션 내용을 다 살려 순서(최신 #82 위, #81 아래) 맞춰 수동 병합 → 이후 CI 정상 작동.
- GitHub API(`merge_pull_request`)가 "충돌 있음"으로 반복 거부해 PO에게 "GitHub 화면에서 직접 머지" 요청 → **PO가 웹 UI에서 Squash and merge 직접 확정**. 이후 어시가 무심코 API 머지를 한 번 더 시도했다가 auto mode classifier가 "PO가 이미 수동 머지를 선택했는데 왜 또 시도하냐"고 정확히 차단(올바른 제지) — 이후 머지는 시도 안 함.
- **[PR #727](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/727) 머지 완료**(PO 수동 머지, main 반영). 후속 **[PR #728](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/728)**(진행표 갱신 문서 1줄)은 CI green 확인 후 어시가 자동머지.
- PO가 "브라우저로 GitHub 화면 직접 못 여냐"고 반복 질문 → 실측 재검증한 결과, 예전 문서("연결 자체 불가")가 부정확했음을 확인·정정: 실제로는 `curl`은 이 세션의 보안 프록시로 정상 접속되고, **Chromium만 프록시 TLS 인증서를 못 믿어서(`ERR_CERT_AUTHORITY_INVALID`) 막힘** — PO 기기(폰/PC)와 무관, 세션 서버 쪽 문제. TLS 검증 우회는 보안 규칙상 시도 안 함. 문서 정정.
- PO가 섹션1 완료 후 다음 액션을 묻자 **"PO가 먼저 직접 확인하고 싶음"**을 선택 → 실화면 클릭검증 방법(로그인·언어스위처·확인할 화면 3곳)을 딸깍 가능하게 안내하고 결과 대기 중.

**2. 왜 그렇게 했는지**
- `agency`·`clinic`은 이미 다국어 완료 상태였음을 뒤늦게 확인 — 처음엔 검사기 스크립트의 무관한 배열(직원→퍼널 리다이렉트 방지용, 언어와 무관)만 보고 "한국어 고정 그룹"이라 잘못 판단했다가, 코드(`PartnerPortal.jsx`)를 직접 열어 이미 `TR`+`useLang()`+언어스위처로 완비된 걸 확인하고 PO에게 정정 보고함.
- `useBackofficeLang()` vs `useLang()` 구분: 저장소에 두 개의 독립적인 언어 쿠키/훅 체계가 있음(`healo_lang`=공개·에이전시·의료기관용 en 기본, `healo_bo_lang`=국내 스태프용 ko 기본) — 인터페이스가 동일해 로컬에서 안 걸리고 실사용 흐름(로그인 직후)에서만 드러나는 부류라 E2E가 유일한 방어선이었음.
- 브라우저 TLS 우회를 시도하지 않은 이유: 세션 운영 규칙("TLS 검증 절대 끄지 말 것")이 보안 예외 없이 명시돼 있어, 기술적으로 가능해도 하지 않음.

**3. 안 끝났거나 보류**
- **섹션 2~6 전부 미착수**: `app/admin/khidi/*`(KHIDI 지표 대시보드)·`app/admin/{hospitals,treatments,doctors,import,rag}`·`app/admin` 나머지·`app/coordinator/*`(22개)·`app/hospital/*`(7개). 규모 약 26,500줄 남음(전체 28,469줄 중 섹션1 ~1940줄만 완료).
- **섹션1 실화면 클릭 검증**: PO가 직접 로그인해서 언어 스위처로 확인하기로 함 — 이 세션 종료 시점까지 결과 안 들어옴.

**4. 주의·함정**
- **언어 훅 선택을 섹션2부터도 매번 의식적으로 확인할 것**: `admin`/`coordinator`/`hospital` 안 파일은 `useBackofficeLang()`(`@/lib/i18n/coordinator`), `agency`/`clinic`/`patient`/공개 페이지는 `useLang()`(`@/lib/i18n/LangContext`). 헷갈리면 `check-content-consistency.mjs` §16이 `app/admin`·`coordinator`·`hospital` **디렉토리 안**은 잡아주지만, 그 세 디렉토리 밖에 있는 백오피스 전용 공용 컴포넌트(`src/components/` 하위 새 파일 등)는 못 잡음 — 코드리뷰에서 직접 확인 필요.
- **병렬 세션과 `docs/POSTMORTEMS.md`·`docs/PROJECT_CONTEXT.md` 최상단 동시 삽입 충돌 위험**: 2026-07-10에 실제로 발생(다른 세션이 같은 자리에 POSTMORTEMS #81을 이미 넣어놨는데 이 세션도 같은 자리에 #82를 넣으려다 충돌). 커밋 전 `git fetch origin main && git log origin/main -3`로 그 사이 다른 세션이 머지했는지 먼저 확인하는 습관 재확인(기존 규칙 I).
- **GitHub `mergeable_state`가 "dirty"/"blocked"라고 곧바로 인프라 장애로 단정하지 말 것**: 겉보기엔 애매하게 보여도 `git merge-tree <base> origin/main HEAD`로 직접 3-way 병합을 시뮬레이션해보면 진짜 충돌인지 바로 판별된다(오늘은 초반에 grep 패턴이 틀려서 "충돌 없음"으로 오판했다가, 나중에 정확한 패턴으로 재확인해 진짜 충돌을 찾음 — grep 시 `+<<<<<<<`처럼 diff 접두사가 붙을 수 있음에 주의).
- **PO가 명시적으로 "내가 직접 할게"로 경계를 정하면 그 뒤로 같은 행동(머지 등)을 어시가 다시 시도하지 말 것** — 2026-07-10에 auto mode classifier가 이를 정확히 차단해준 사례가 있었음, 앞으로도 같은 패턴 주의.
- **헤드리스 브라우저로 외부 사이트(GitHub 등) 화면을 열어 클릭하는 건 여전히 불가** — 원인이 "연결 자체 불가"가 아니라 "Chromium이 세션 프록시 인증서를 신뢰 안 함"으로 정정됐을 뿐, 결론(실화면 조작 불가)은 그대로. 우회 시도 금지.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **PO의 섹션1 실화면 검증 결과 확인** — 아직 안 왔으면 리마인드(로그인 후 `/admin/consultations`·`/admin/users`·`/admin/staff` + 새 상담 예약 모달에서 언어 스위처로 EN/RU 전환 확인 요청해둔 상태). 이상 있으면 먼저 고치고, 문제없으면 섹션2로.
2. **섹션2 착수**: `app/admin/khidi/*`(KHIDI 지표 대시보드) 6개 언어화. 섹션1과 동일한 `TR`+`useBackofficeLang()`+`tt()` 패턴, 독립 리뷰 후 CI green이면 자동머지(저위험 판단 기준 동일 — 순수 텍스트 치환, 로직 무변경).
3. 섹션3~6(병원/치료관리, admin 나머지, coordinator, hospital)은 위 섹션 진행표 순서대로.

**6. 검증 상태**
- ✅ **PR #726**: 머지 완료(GitHub MCP로 직접 확인), CI green.
- ✅ **PR #727**: 머지 완료(GitHub MCP로 직접 확인 — `merged:true`, `merged_by: bonroi2296-tech`), `ci`·`Smoke Tests(PR)` 최종 커밋 기준 둘 다 success.
- ✅ **PR #728**: 머지 완료(어시 자동머지), CI green, 문서 전용이라 독립리뷰 생략.
- ⚠️ **실화면 클릭 검증(언어 전환이 실제로 눈에 보이게 되는지)은 미실시** — 로그인 필요한 백오피스라 이 환경에서 자동화 불가(위 4번 참고), PO가 직접 확인하기로 확정. 결과 대기 중 → 5-1로 승격.
- ✅ `npm run check:content`·`npx next build --webpack` 매 커밋 후 로컬 실행, 전부 통과 확인.

**참고 자료 (다국어화 섹션2~6에서도 계속 쓸 고정 정보 — 이번 핸드오프에 흡수)**
- **패턴(고정)**: `app/agency/PartnerPortal.jsx`·`app/patient/documents/DocumentsClient.jsx`와 동일한 컨벤션. 모듈 최상단에 `TR`(또는 `COPY`) = `{ko,en,ru,kz,zh,ja}` 사전, `const tt = (k) => (TR[lang]||TR.en)[k] || TR.en[k]` (또는 `l = (obj) => obj?.[lang] || obj?.en`) 헬퍼로 조회. 이 화면들은 이미 `app/ClientShell.jsx`의 `isPortalPage`(admin·coordinator·hospital·agency·clinic·patient 전부 포함)가 상단바 언어 스위처(`PortalLangSwitcher`)를 띄우고 있어서 — **UI 스위처는 이미 있고, 화면 콘텐츠(라벨·버튼·alert 등)만 그 스위처를 따라가게 만드는 작업**.
- ⚠️ **언어 훅은 대상에 따라 다르다(섹션1에서 CI가 잡은 실수, POSTMORTEMS #82) — 반드시 맞는 쪽을 쓸 것**: `admin`·`coordinator`·`hospital`(국내 스태프, 기본 한국 운영) → `useBackofficeLang()` from `@/lib/i18n/coordinator`(쿠키 `healo_bo_lang`, 쿠키 없으면 ko 기본). `agency`·`clinic`·`patient`·공개 페이지(해외 파트너·환자·일반 방문자, 기본 SEO 영어) → `useLang()` from `@/lib/i18n/LangContext`(쿠키 `healo_lang`, 쿠키 없으면 en 기본). 자세한 내용은 위 4번 참고.
- **섹션 진행 상황** (완료마다 이 표를 갱신):

| # | 섹션 | 파일 | 상태 |
|---|------|------|------|
| 1 | `app/admin/consultations`·`users`·`staff` + 공용 `src/components/consultation/CreateConsultationModal.jsx`(admin·coordinator 공용, 이번에 같이 완료) | 4개, ~1940줄 | ✅ **머지 완료(PR #727·#728, main 반영)** — 자세한 경위는 위 1~6번 참고 |
| 2 | `app/admin/khidi/*` (KHIDI 지표 대시보드) | 미측정 | ⏳ 대기 |
| 3 | `app/admin/{hospitals,treatments,doctors,import,rag}` | 미측정 | ⏳ 대기 |
| 4 | `app/admin` 나머지(playbook·agent·ai-status·chat·observability·analytics·automation·audit·crawl·enrichment·leads·reminders·inquiries·settings·account 등) | 미측정 | ⏳ 대기 |
| 5 | `app/coordinator/*` | 22개 | ⏳ 대기 |
| 6 | `app/hospital/*` | 7개 | ⏳ 대기 |

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 백오피스(admin/coordinator/hospital) 다국어화 섹션1(상담·회원·직원관리) 머지 완료(PR #727·#728), PO 실화면 검증 결과부터 확인. 문제없으면 섹션2(app/admin/khidi/*) 진행 — TR+useBackofficeLang()+tt() 패턴, 언어훅 선택 실수 주의(4번 함정 참고).

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
