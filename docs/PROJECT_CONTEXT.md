# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-21 심야) — AI 챗 "대장암 단정·정정 무시" 버그 코드강제 수정(#183·#188) + 재발방지 행동점검(#193) + Vercel 무료플랜 일일 배포한도(100/day) 초과로 prod 배포 지연

**이번 세션 한 일:** (PR 3개 모두 ✅머지)
- **🔴 AI 챗 핵심 버그 수정 — PO 신고**: PO가 /inquiry AI Agent에서 ① 암종을 안 밝혔는데 AI가 "대장암"으로 멋대로 단정, ② "대장암 아니라고" 정정해도 계속 대장암 우김, ③ 모델 내부 사고("Wait, let's keep it short"·"(32 words)")가 답변에 노출 — 스크린샷 신고.
  - **원인(DB 실측)**: 데이터 편중 아님(treatments·hospitals·rag 모두 대장암 0건). 그 스레드 앞부분에서 PO가 "대장암 치료법"을 6번+ 반복 → 대화기록에 깔린 옛 화제를 generic 질문에 **단정으로 끌고 오는 over-anchoring** + 정정 수용/최종출력 규칙 부재.
  - **#183 (1차, 프롬프트)**: `buildSystemPrompt`에 행동가드 3종(현재 메시지 안 밝힌 암종 단정 금지·정정 즉시 수용·최종메시지만 출력) + `systemPromptGuards.test.ts`. → **프리뷰는 됐지만 누적 스레드(대장암 6회+)에선 안 꺾임**(프롬프트는 확률적 LLM에 best-effort).
  - **#188 (2차, 코드 강제)**: 순수모듈 `src/lib/chat/topicGuards.ts` 분리(`mentionsCancerType`·`isTopicCorrection`·`correctionReply` 6언어) → 두 응답경로에서 **정정 감지 시 모델 미경유로 결정적 사과+재질문(화제 100% 리셋)** + 암종 미명시 시 프롬프트 최상단 강제 차단. `topicGuards.test.ts` 15개(PO 실패 문장 전부 검출·오탐 방지). **#188 프리뷰에서 before→after 100% 작동 확인.**
- **🟢 #193 재발방지 (PO 요청 "그냥 고치지 말고 앞으로 이런 일 없게")**: `scripts/check-ai-behavior.mjs`(`npm run check:ai-behavior [URL]`) — 실제 라우트로 적대적 대화(대장암 누적→정정→generic→영어정정) 재생해 invariant(정정 후 암종 언급 0·사과 수용) 자동 감지. **#188 프리뷰에 돌려 통과 확인.** POSTMORTEMS #15(1·2차) 기록.
- **만족도 설문 테스트 셋업(아침)**: 테스트 문의 #12(inquiry_id 12)+완료 상담(session `f0a36145-b593-4ded-a36d-ccd898a087e0`, updated_at `2026-06-20 06:00 UTC`)을 09:00 UTC cron 윈도(완료 후 24~30h)에 맞춰 심음. 이메일=`bonroi2296@gmail.com` 평문(decryptMaybe 통과). **→ 09:00 cron이 발송 안 함(설문 0건+cron 런타임로그 0).**

**왜 그렇게 했는지:**
- AI 챗 행동은 의료서비스 기본기라 PO가 직접 신고 → 끝까지(코드강제+테스트+행동점검) 수정. UI 레이아웃 변경 아니고 AI 응답 행동 교정이라 프리뷰로 보여주고 #183은 PO OK("바로 합쳐 배포"), #188·#193은 저위험(테스트·CI 초록)이라 머지.
- **프롬프트→코드 전환이 핵심 교훈**: "반드시 지켜야 할 AI 행동"은 프롬프트(부탁)가 아니라 코드 게이트(결정적 분기)로 강제해야 함. #183이 누적 스레드에서 깨진 게 증거.

**안 끝났거나 보류 (⚠️ 둘 다 인프라/타이밍 — 코드는 끝):**
- **#188이 본서비스(prod)에 아직 안 떴음 — 진짜 원인 = Vercel 무료플랜 일일 배포 100건 한도 초과**: 머지·검증 다 됐는데 2026-06-21에 여러 세션이 PR을 쏟아내 **Vercel 무료플랜 일일 배포한도(100/day)를 넘김**(에러 `api-deployments-free-per-day` → "try again in 24 hours"). 그래서 c9b9bb3·afec814(main HEAD)의 production 배포가 **아예 생성도 안 됨**(새 배포 전면 차단). **24시간 지나 한도 리셋되면**, 다음 main 변경 시 자동 배포로 #188 올라옴. 즉시 원하면 **Pro 업그레이드(유료)** — PO 결정 사항(돈). 이 클라우드 env엔 Vercel CLI 없고 main 직접 푸시 불가라 어시스턴트가 강제 못 함.
- **만족도 설문 cron 미발송**: 09:00 UTC dispatch-surveys가 안 돔(또는 로그 미수집). 2026-06-21 배포 혼잡 영향 가능. KHIDI K-03 직결이라 **cron이 매일 진짜 도는지 점검 필요.** 테스트 상담은 2026-06-21 12:00 UTC까지만 윈도 내.

**주의·함정:**
- **prod 현재 = #187(6bc613b)**, #188 없음. healo-khidi.vercel.app에서 정정 테스트하면 아직 옛 동작(모델이 사과하되 대장암 언급)일 수 있음 → **#188 떴는지 확인법: 정정 시 "앗, 죄송합니다. 제가 잘못 짚었어요. 말씀하지 않으신 내용을…"(고정 문구) 나오면 #188 라이브.**
- **AI 챗 테스트는 일일 회수제한(aiGuard) 소모** — 2026-06-21 어시스턴트가 많이 때려 `ai_daily_limit` 걸림. prod 확인은 한도 회복 후(2026-06-22 이후).
- `topicGuards.ts`는 server-only 아님(테스트 위해). 정정 패턴은 "A 말고 B"(새 화제) 제외 — 순수 부정만.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인:** (a) **prod에 #188 떴는지** — healo-khidi.vercel.app/inquiry에서 대장암 여러 번→"난 대장암 안 물어봤는데?" → 고정 사과문구 나오면 OK(안 떴으면 Vercel 대시보드 c905ed5 Promote to Production). (b) **만족도 설문 cron이 매일 도는지** — Vercel cron 로그/`reminders_scheduled` 확인, 안 돌면 KHIDI K-03 위해 수리(테스트 상담 다시 윈도 맞춰 심기).
2. `npm run check:ai-behavior https://healo-khidi.vercel.app` 한 번 돌려 prod 행동 자동 점검(한도 회복 후).
3. KHIDI 중간평가(2026-08-27) 상시 — 설문(K-03)·사후관리 알림 작동 복구 직결.

**검증 상태:** **PR #183·#188·#193 셋 다 CI(`ci`·`Smoke`) 초록 + squash 머지**(main에 2964b19·c9b9bb3·afec814). 로컬 **vitest 279개(+29) / tsc 0 / check:content / next build --webpack** 통과. **#188 프리뷰에서 정정→사과리셋·generic 암종0·영어정정 before→after 실측 통과**(check-ai-behavior도 프리뷰 통과). **❌ 미검증(인프라/타이밍): prod 본서비스 #188 미반영(Vercel 무료 빌드큐 백로그) / 만족도 설문 cron 09:00 미발송(원인 미규명) / prod 챗 행동 실클릭(일일한도).** 열린 PR: 내 것 없음(셋 다 머지).

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-21 심야) 읽어. 지난 세션에 AI 챗 "대장암 멋대로 단정·정정 무시" 버그를 코드로 강제 수정(#188)하고 재발방지 점검(#193)까지 머지했는데, Vercel 무료플랜 일일 배포한도(100/day)를 2026-06-21에 초과해서 본서비스 배포만 안 떴어(24h 뒤 리셋되면 자동으로 올라옴). 1) healo-khidi.vercel.app/inquiry에서 대장암 여러 번→"난 대장암 안 물어봤는데?" 쳐서 "앗, 죄송합니다 제가 잘못 짚었어요…" 고정 문구 나오면 #188 라이브(안 나오면 Vercel 대시보드에서 c905ed5를 Promote to Production). 2) 만족도 설문 09:00 cron이 2026-06-21 발송을 안 했어 — Vercel cron 로그/reminders_scheduled 확인해서 매일 진짜 도는지 점검(KHIDI K-03 직결). 3) ai_daily_limit 회복됐으면 npm run check:ai-behavior로 prod 자동점검.

---

## 🔖 세션 핸드오프 (2026-06-21 저녁) — 만족도 설문 진짜 복구(#167) + 침묵환자 cron 전면 리팩터(#171) + AI 스트리밍 체감속도(#176) + prod 스트리밍 실측

**이번 세션 한 일:** (PR 3개 모두 ✅머지·배포)
- **🔴 #167 만족도 설문 — #157이 반쪽이라 여전히 0건이던 걸 진짜로 복구 (8/27 평가 K-03 직결)**: 실DB 재확인 결과 #157(patient_id→inquiry_id 폴백) 배포 후에도 설문 0건. 진짜 원인 = `inquiries.email`이 **AES-256-GCM 암호화 저장**인데 cron이 암호문을 복호화 없이 `resolveSurveyRecipient`에 넘겨 `@` 없어 전부 버려짐 → 영구 0건. 수정: `dispatch-surveys` cron에서 `decryptMaybe(email/first_name/last_name)` 복호화 후 사용(옛 평문 행도 통과·하위호환). 계약 테스트(암호문 blob→null) + POSTMORTEMS #13.
- **🟠 #171 침묵환자 감지 cron — inquiry_id 기준 전면 리팩터 (PO "제대로 싹 다 고침" 선택)**: 같은 patient_id null 부류 + 더 깊은 문제(`consultation_sessions.patient_id`는 사실 bigint→cancer_patient_intakes, `symptom_alerts.patient_id`는 uuid→auth.users라 타입 불일치로 `getCoordinatorIds`도 깨짐). **마이그레이션 프로덕션 적용 완료**(`symptom_alerts.inquiry_id` bigint 추가 + patient_id nullable + CHECK 둘 중 하나 필수 + 인덱스, 0행이라 안전·멱등). 순수 로직 `src/lib/symptoms/silence.ts`(`buildSilenceAlert`·`uniqueInquiryIds`) 분리 + cron 재작성(활성 문의→최근 증상보고→3일↑ 무입력→inquiry 기준 알림) + `alertService` inquiry_id 대응 + 코디 화면 `문의 #N` 표기 + 계약 테스트. POSTMORTEMS #14, KNOWN_ISSUES 해결 표기.
- **🟢 #176 AI 스트리밍 체감속도 (prod 실측 후)**: prod /inquiry 스트리밍을 실제 호출해 측정 → 타이핑은 매끄러우나 **첫 글자까지 ~1.7~2.2초(웜)·2.75초(콜드)**, 그동안 빈 말풍선+스피너 겹쳐 어색. 수정: ①ChatGPT식 '생각중' 타이핑 점(`TypingDots`)으로 통일(빈 말풍선·잔존 스피너 제거, 언어무관). ②`getEmbedding` 결과를 `BoundedCache`(LRU 200) 메모이즈 — 같은 텍스트=같은 벡터(결정적)라 100% 안전, 반복 질문 임베딩 왕복(~0.6~1s) 제거. PO 프리뷰 확인 후 "머지 ㄱㄱ".
- **검증(요청 1~2)**: prod AI Agent 스트리밍 **실측**(200·토큰단위 4청크·메타 구분자 정상). 만족도 설문 **DB 실측 0건 — 정상**(발송 윈도(완료 24~30h) 내 완료 상담 0건이라 보낼 게 없음. #167로 새 상담 완료 시 발송 시작).

**왜 그렇게 했는지:**
- #167은 "어느 행을 보느냐"(#157)에서 "그 값을 복호화하느냐"가 누락된 후속 버그 → 완료한 기능을 진짜 작동시키는 거라 바로 수정·머지(저위험 백엔드, 화면변화 0).
- #171은 PO가 보류 추천 대신 "제대로 싹 다 고침" 선택 → 스키마까지 손대는 큰 작업이지만 끝까지. 단 기존 증상보고 제출 경로(로그인 환자 patient_id)는 안 건드리고 보존(CHECK·테스트로 보장).
- #176 백엔드 추가 단축은 답변 품질(검색 정확도) 깎을 위험이라 **의료 AI 레드라인**으로 보고 안전한 부분(임베딩 캐시)만. 남은 ~1.5초는 구글 임베딩·모델 응답 시간이라 우리가 못 줄이는 영역.

**안 끝났거나 보류:**
- **화상방 다자 카메라(#160) 실렌더**: 여러 명 동시 입장 라이브 필요 → PO 동석.
- **만족도 응답·침묵 알림 실제 수신**: 둘 다 새 상담/증상보고가 쌓여야 발생 → 며칠 뒤 KPI 대시보드·코디 알림에서 확인.
- 스트리밍 타이핑 속도(25ms·step remaining/8)는 기본값 — PO가 빠르게/느리게 원하면 숫자 조정(미요청).
- (기존) 갤러리 next/image·any 813 축소·slug 한글 — 변동 없음.

**주의·함정:**
- **암호화 컬럼은 읽는 쪽이 복호화 책임**(POSTMORTEMS #13 규칙): `inquiries.email`/`first_name`/`last_name`/`contact_id`/`message`는 암호문 저장 → cron·집계·발송에서 쓸 때 `decryptMaybe`/`decrypt*ForAdmin` 필수.
- **`consultation_sessions.patient_id` 쓰지 마라**(bigint·전 행 null): 실제 키는 `inquiry_id`(문의) 또는 `patient_user_id`(auth uuid). #12·#13·#14 동일 뿌리.
- **다른 세션 동시 작업**: 이번에 #169·#172·#175(AI 가르치기·상태화면)가 다른 세션에서 main에 머지됨. 새 작업 전 `git fetch origin main` 후 origin/main 기준 새 브랜치(squash 머지한 브랜치 이어쓰면 충돌).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인(라이브/시간 — 자동 불가):** (a) **화상방에 여러 명 들어가 전원 카메라 켜지는지**(#160 — PO 동석 라이브) (b) prod /inquiry AI Agent 눌러 **'생각중' 점→타이핑 전환** 눈으로 1회(#176 배포분) (c) 며칠 뒤 `/admin/khidi/kpi-dashboard` 만족도 응답·코디 알림에 침묵 알림 들어오기 시작하는지(#167·#171 효과).
2. 스트리밍 속도감 PO 피드백 있으면 `app/inquiry/ThreadChat.jsx` 타자기 상수(25ms·÷8) 조정.
3. KHIDI 중간평가(2026-08-27) 상시 — #167(만족도)·#171(사후관리 알림) 둘 다 측정/작동 복구로 평가 직결.

**검증 상태:** **PR #167·#171·#176 셋 다 CI(`ci`·`Smoke`) 초록 + squash 머지·배포 확인**(check_runs로 확인, main에 984a732·cdb3c6e·49205eb). 로컬 **tsc 0 / vitest 250개(+19) / check:content / next build --webpack** 통과. #171 마이그레이션 프로덕션 적용·컬럼 확인. prod 스트리밍 **실측**(TTFT·청크). 만족도 0건은 **DB 실측 + 원인규명(윈도 내 완료상담 0)**. **❌ 미검증(라이브/시간 필요, 자동 불가): 화상방 다자 영상 실렌더 / '생각중' 점 prod 실클릭(프리뷰는 PO 확인) / 만족도·침묵 알림 실제 수신(데이터 쌓여야).**

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-21 저녁) 읽어. 지난 세션에 만족도 설문 진짜 복구(#167)·침묵환자 감지 cron 전면 리팩터(#171)·AI '생각중' 점+속도(#176) 다 머지·배포함. 그다음: 1) prod healo-khidi.vercel.app /inquiry에서 AI Agent 눌러 '생각중' 점→타이핑 매끄러운지 1회. 2) 화상방 다자 카메라(#160)는 너랑 라이브로 같이 확인. 3) 며칠 됐으면 /admin/khidi/kpi-dashboard 만족도 응답·코디 침묵알림 들어왔는지 확인. 새 작업은 git fetch origin main 후 origin/main 기준 새 브랜치로.

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
