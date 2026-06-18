# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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
1. **라이브 실기기 클릭 검증** — 실서비스(`khidi.healo.kr`)에서 언어 전환(스위처가 새 URL로 가나)·문의폼·화상상담 직접 확인. (이번 세션 미검증분.)
2. 도메인 `healwith.co.kr` 결제되면 → 컷오버 + 구글/Yandex 제출.
3. (선택) phase 5 가드 자동발견화 / seo.* 현지 번역 검수.
4. KHIDI 중간평가(2026-08-27) 상시 기준 — `docs/KHIDI_중간보고_베이스.md`.

**검증 상태:** PR #63·#64 = **CI(ci·smoke·Vercel) 전부 초록 + main 머지 완료.** `next build --webpack` / `/ru/*` 서버 러시아어 렌더·`/en/*` 영어 / canonical=자기언어·hreflang 6+x-default / 탭제목 언어별 / 내부페이지 hreflang 0·`/admin` 보호·게스트링크·옛 러 랜딩 정상 / e2e 누출 40개 / check:content·i18n·cancer-i18n·legal 통과. **라이브 실기기 클릭(스위처·문의폼·화상상담)은 미검증 — PO/다음 세션 몫.**

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
