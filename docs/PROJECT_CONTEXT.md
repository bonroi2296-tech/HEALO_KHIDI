# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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
