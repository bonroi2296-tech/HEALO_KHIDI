# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-30 (4) — 공개 AI챗 품질개선·자동평가 하니스·aiGuard 감지우선·Vercel env 제어 + 병렬세션 충돌정리 PR 4개 머지)

> PO "워크트리 새로 파서 작업 새로 시작" → 공개 AI챗(`/inquiry`) 영역. 빠른수정(#480) 후 PO가 울트라코드로 "내 작업 다시 검토" → 적대검토가 #480 회귀 적발 → #488. 이어 라이브 AI품질 제보들(서류목록·앵무새·병원순위) 수정 + **사람이 응답 일일이 못 보니** 다국어 자동평가 하니스(#493) 구축 + IP한도 막힘 → aiGuard 감지우선 개정(#500) + Vercel env 직접제어 셋업. **세션 중 컴 크래시 1회**(재개 완료). 끝에 PR 4개 머지하다 **다른 세션 #509(상담 비용가드)와 충돌·main 타입깨짐 발견 → 정리 후 전부 머지**.

**1. 이번 세션 한 일** (PR 전부 머지됨, 단 ⚠️배포는 6번 참조)
- **#480**(빠른 1차): 접수 시 연락채널 확인·PC 레이아웃 화면활용·전환버튼 한 줄·답변서식(마크다운)·PWA 설치유도. → 머지·배포됨.
- **#488**(울트라코드 적대검토 회귀수정): #480이 빌드초록인데 **실제론 깨진 회귀 2건**(InstallPrompt 숨김이 `/ko/inquiry` locale-prefix에 매칭실패 → splitLocale로 수정 / ai-chat 높이 이중차감 → md:h-auto+뷰포트). + 선재버그 **한·일 핸드오프 `\b`(CJK 무효)** → handoffDetect.ts 분리+부분일치. + **서류목록 매번 다름·앵무새**(프롬프트가 "5개 전부·1회만" 강제 안 함) 수정. + **병원 "톱3" 순위 줄세우기**(평가가 적발) → HOSPITAL_HARD_GUARD에 순위금지 룰. POSTMORTEMS #55.
- **#493**(자동평가 하니스): `scripts/chat-eval.mjs` + `eval/chat-cases.json`(87케이스 15차원×6언어) + cleanup + README. 실제 배포 API에 다국어 멀티턴 돌려 기계검사(언어·서류5개·앵무새·가격)+LLM심판→리포트. PO가 키우는 단일 리스트.
- **#500**(aiGuard 감지우선): IP 50/일 하드차단 → 3단계(normal/elevated 관측/likely_intrusion 알림/intrusion≥400 자동차단) + AI_IP_BLOCKLIST 수동차단. aiGuardClassify.ts 분리+테스트.
- **#516**(핫픽스): 다른 세션 #509가 aiGuard에 `ai_consult_*` 이벤트 쓰며 OperationalEventType 등록 누락 → **main 타입검사가 깨져 모든 PR CI 차단** → 2개 추가로 해소.
- **Vercel env 직접제어 셋업**: PO가 프로젝트한정 토큰 발급(.env.local `VERCEL_TOKEN`). 프로젝트 링크. `AI_DAILY_PER_IP_LIMIT=300`을 prod·preview·dev에 적용(50→300, preview는 CLI버그라 REST API 우회). [[vercel-env-control]] 메모리.

**2. 왜 그렇게 했는지**
- 평가 하니스는 **별개 신규**(기존 judge.ts·회귀105는 단일턴·DB·안전위주). PO가 한국어밖에 못하고 6언어 응답을 일일이 못 보니 멀티턴·행동검사·사람편집 리스트가 필요.
- **KHIDI 오염 방지 핵심**: 챗은 3턴째부터 inquiry 자동승격(=유치 대시보드=8/27 점수) → 평가 케이스 **≤2턴 강제** + `guest_country="__EVAL__"` 태그. 실측 18대화에도 inquiries 0건 확인.
- aiGuard "감지만+높은상한 자동차단"은 PO 선택(순수 감지만은 공격 시 비용 무한노출). 차단은 generic 코드(공격자에 '차단됨' 미노출).
- #500↔#509 둘 다 같은 aiGuard.ts → **버리지 않고 병합**(내 detect-first `checkAiGuards` + #509 `checkConsultationAiGuard` 공존). #509는 CFO 우선순위라 절대 안 죽임.

**3. 안 끝났거나 보류**
- **전체 87케이스 베이스라인 미실행**: 2026-06-30 대표 ~20케이스만 돌림(한도+크래시). Vercel 무료 일배포한도(100/일)·IP한도로 하루에 전수 불가 → 며칠 분할 or 한도조정.
- 평가가 잡을 추가 실문제들: 전수 돌리면 더 나올 것(고치며 회귀케이스 추가가 운영방식).
- aiGuard 침입판단은 현재 **일일카운트 휴리스틱**. 더 정교히(세션·동의·지역·봇패턴) + 엣지차단(Vercel BotID)은 후속.

**4. 주의·함정**
- ⚠️ **env 변경은 다음 배포부터 적용**(돌고 있는 배포엔 즉시 X). `AI_DAILY_PER_IP_LIMIT=300`은 그래서 **배포돼야 라이브**.
- ⚠️ **평가를 프로덕션에 돌리면 실DB에 테스트 스레드**가 쌓임(≤2턴이라 KHIDI 무오염이나 청소 필요): `delete from chat_threads where guest_country='__EVAL__'`(+messages·ai_response_evaluations). **프리뷰 우선.**
- ⚠️ **IP한도 캡은 글로벌2000 아니라 IP당(이제 300)** — 평가 대량은 IP당 한도에 먼저 걸림.
- 평가기 보정 진행형: 첫 실행은 종종 AI가 아니라 검사/심판이 빡빡해 false-실패(이미 price_range·empathy·detectLang·심판형식 4건 보정). 보고 시 "AI문제 vs 평가기문제" 구분.
- ⚠️ **병렬세션 충돌 재발**: 머지 도중 main이 계속 움직임(#509·#513 등 타세션). aiGuard.ts를 2세션이 동시 수정한 게 이번 충돌원인. 같은 핵심파일은 PO에게 영역배분 받기.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: #488(병원순위·서류·레이아웃)·#500(aiGuard)·env(IP300)는 **로컬 빌드·tsc·테스트만 통과, 프로덕션 라이브 검증 못 함**(2026-06-30 배포한도 소진 → 배포 미반영). **배포 됐는지 확인**(`healwith.co.kr` 새 커밋 반영) 후 **eval을 프로덕션에 돌려 병원순위 수정·서류 일관이 라이브로 먹는지 실측** + 끝나면 eval 스레드 청소.
2. **전체 87케이스 베이스라인**: `node scripts/chat-eval.mjs --base <프리뷰> --langs ko,ru,kz,en,zh,ja`를 며칠 분할로 돌려 실패=진짜 AI개선거리 추림(IP/배포 한도 유의).
3. (선택) 평가기 추가 보정·케이스 확장.

**6. 검증 상태**
- ✅ **머지 4개 전부 로컬에서 빌드(`next build --webpack`)·`tsc --noEmit`·vitest(chat 75, classify·handoffDetect)·`check:content` 통과 확인 후 --admin 머지**(Vercel 체크 fail은 배포한도일 뿐 코드무관). main에 두 가드함수·이벤트타입 공존 git show로 재확인.
- ✅ 한도 50→300 풀림 **프로덕션 실측**(eval 12케이스 무한도). KHIDI 무오염(inquiries 0) 실측.
- ❌ **미검증(솔직히)**: #488·#500·env 변경의 **프로덕션 라이브 동작**(2026-06-30 Vercel 일배포한도 소진 → 미배포). 병원순위 수정은 코드·테스트만, 라이브 미확인. 다음 세션 1번에서 갚을 것.
- PR/CI: 내 PR(#488·#493·#500·#516) 전부 머지. 열린 PR은 타세션 것.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-30 머지한 #488(병원순위·서류목록·레이아웃)·#500(aiGuard)·env(IP한도300)가 **배포돼서 healwith.co.kr에 라이브로 반영됐는지부터 확인**(2026-06-30 Vercel 일배포한도 소진이라 미배포였음). 반영됐으면 `node scripts/chat-eval.mjs --base https://healwith.co.kr --ids hospital-best-no-ranking,docs-consistency,no-parrot-logistics --langs ko,kz`로 병원순위 수정·서류 일관이 라이브로 먹는지 실측하고 끝나면 eval 스레드(`guest_country='__EVAL__'`) 청소해. 그다음 전체 87케이스 베이스라인을 한도 유의하며 분할로 돌려 진짜 AI 개선거리 추려줘.

## 🔖 세션 핸드오프 (2026-06-30 (3) — 밤샘 동기화 + 밀린 PR 6개 머지 + 울트라코드가 #459 보안회귀 적발·복구 → 보안가드 #492)

> PO "밤새 폰으로 작업 많이 했다, 핸드오프 분석하고 컴이랑 깃 싱크 맞춰놔(깃이 더 최신일 듯)"로 시작 → 동기화·정리 → 밀린 PR "싹 다 머지" → 도중 PO가 울트라코드 모드로 전환 "내가 작업한 거 다시 검토, 판단력 얼마나 바뀌나 보자". **핵심: 울트라코드 적대검토가 내가 "했다"고 보고한 보안수정이 실제 커밋엔 0곳인 걸 잡아냄(머지 직전 차단).**

**1. 이번 세션 한 일**
- **동기화·정리**: 핸드폰 밤샘작업(origin) 최신을 컴퓨터에 반영. worktree 13→정리, 죽은 작업본(브랜치) 55개 삭제(전부 머지완료/대체, origin 복구가능), 6/24 잔재파일 3개 삭제.
- **밀린 PR 6개 처리**: `#422`(처리방침 GDPR — 가는 길에 법률정합성 버그=국외이전 한국어 1줄 누락도 수정)·`#449`(코디 AI대화 읽기뷰)·`#455`(실시간 통역, 스위치 OFF)·`#424`(법무 계약서 초안)·`#459`(환자포털 6언어화) **전부 머지**, `#472`(옛 교육 핸드오프, 코드는 #467로 이미 반영) **닫음**.
- **🔴 #459 보안회귀 적발·복구(울트라코드)**: 충돌을 `git checkout --ours`(#459 통째)로 풀며 #463이 막아둔 err.message 화면노출 차단이 회귀 → 환자 비자·견적 화면 10곳 raw err.message 재노출. **내가 "graft 7곳 했다"고 보고했으나 실제 커밋엔 0곳**(add 후 Edit→다시 add 안 하고 commit, 검증도 워크트리만 봐서 거짓통과). 적대검토(푸시된 ref 기준)가 적발 → 실제 graft 적용+`console.error` parity 복원+미사용 `catch(_err)`까지 고쳐 누출0 재확인 후 머지.
- **보안가드 신설 `#492`**: `npm run check:err-exposure`(`scripts/check-no-raw-error-exposure.mjs`) CI 편입 — 환자/공개 화면 `setError(err.message)`·`alert(...+err.message)` 차단. **POSTMORTEMS #52** 기록. → 이 가드가 **다른 세션 `#496`(직원포털 55곳 정리+toast.error 보완)·`#498`(간접노출+LEAK_INDIRECT 룰)·POSTMORTEMS #53**로 연쇄됨.
- 옛 헤더 리디자인 초안(`claude/nostalgic-fermi-5204db`) **삭제** — PO가 전부터 지우라던 잔재(내가 "살릴 WIP"로 잘못 분류해 보존했다가 지적받음).

**2. 왜 그렇게 했는지**
- PR 6개가 오래된 작업본이라 충돌투성이 → rebase(커밋별 replay) 대신 **main을 브랜치로 머지**(충돌 1회에 모음) + 핸드오프문서 충돌은 PO_PREFERENCES=합집합·PROJECT_CONTEXT=main채택으로.
- #459는 #463과 절반 중복(둘 다 같은 환자목록 i18n)이라 처음엔 "버려라"였으나 **실측하니 #459가 더 완전(언어키 13·50·26 vs main 2·6·15)** → #459 채택 + #463 보안만 graft가 정답.
- 가드 스코프를 환자/공개로 한정: 직원포털 35곳 기존누출 때문에 가드가 막히지 않게(핵심존부터 보호, 직원은 후속). → #496이 직원까지 정리함.

**3. 안 끝났거나 보류**
- 직원포털 err.message 누출 35→55곳: 내가 작업칩으로 분리 → **다른 세션 #496이 처리 완료(보류 해소)**. 가드 스코프 직원 확장은 #496 후 가능할 수 있음(확인 필요).
- #424 계약서 = **법률자문 필수 초안**(효력문서 아님), #455 통역 = **env 스위치 OFF**(켜기 전 동작 0변화).

**4. 주의·함정**
- ⚠️ **멀티세션 같은 폴더 충돌 실재**: 이 메인 폴더(`HEALO_KHIDI`)가 작업 중 다른 세션 브랜치로 바뀌어 있었고(`claude/err-exposure-result-objects`), 자동저장 Stop훅이 **머지 도중 충돌마커를 커밋·푸시**한 사고도 있었음 → 신중한 머지는 **격리 worktree**에서, 훅은 머지작업 동안 임시 OFF(끝나면 복구).
- ⚠️ **"했다" 검증은 워크트리가 아니라 커밋/푸시된 ref로**(`git show <ref>:<file>`) — POSTMORTEMS #52 핵심.
- `git checkout --ours/--theirs`는 그 파일의 **모든** main 변경을 버림(직교한 보안패치까지). 그 후 수동 edit하면 **반드시 다시 git add**.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: #459 환자화면 6언어화·보안graft는 CI(빌드+스모크)·가드·로컬 eslint는 통과했으나 **실제 환자 로그인 런타임 클릭은 미검증**(SSR 쿠키라 로컬 자동화 안 됨) → 프리뷰/실계정으로 `/patient/visa/applications`·`/patient/cost-estimates` 6언어 표시 + 에러표시(일반 메시지) 실확인.
2. (선택) 보안가드 스코프를 직원포털까지 확장 — #496이 55곳 정리했으니 지금 가능한지 `check:err-exposure` SKIP에서 직원경로 빼고 돌려 확인.

**6. 검증 상태**
- 머지한 PR 전부 **CI 초록 확인 후 머지**(ci·smoke·check:legal 등). #422 법률정합성·#459 누출0·가드 통과는 **실측**(푸시된 ref 기준 git show로 재확인).
- ❌ **미검증(솔직히)**: 환자/코디 화면 **실로그인 런타임 클릭**(SSR 쿠키 자동화 불가). 못 함 명시.
- PR/CI: 이번 세션 PR(#422·#424·#449·#455·#459·#492) 전부 머지, #472·#494 닫음. 열린 PR은 다른 세션 것.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. #459 환자 비자·견적 화면(6언어화+에러표시) 실계정 또는 프리뷰로 런타임 클릭검증부터 해줘(직전 세션 CI는 통과했지만 실로그인 클릭은 못 했음). 그다음 보안가드(check:err-exposure)를 직원포털까지 확장 가능한지 확인.

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
