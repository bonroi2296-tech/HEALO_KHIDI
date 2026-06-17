# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).

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
