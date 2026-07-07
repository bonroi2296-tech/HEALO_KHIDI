# HEALO KHIDI — DESIGN.md

> AI 에이전트(Claude Code, Cursor 등)가 신규 UI 코드를 작성할 때 자동으로 참고하는 디자인 가이드. **읽지 않고 만든 UI는 PR 머지 거부.**

> **핵심 원칙 — 정합성(coherence)이 미(美)보다 우선.**
> "AI가 만든 느낌"은 못생긴 부품이 아니라 **부품끼리 안 맞아서** 난다. 축(색·모서리·그림자·간격·전환·숫자)마다 **값을 하나로 정하고 전부 거기 맞춘다.** 예쁜 부품이 아니라 **일관된 부품**이 "설계된" 느낌을 만든다. → 아래 토큰이 각 축의 "정해진 한 값". 벗어나면 정당화 필요.

---

## 🔗 이 문서의 지위 — 세 도구가 읽는 단일 계약서(허브)

> **2026-07-06 확장 → 2026-07-07 정리:** DESIGN.md는 "AI가 신규 UI 짤 때 읽는 가이드"를 넘어, **여러 도구가 참조하는 단일 진실(SoR)**이다. 아래 토큰(§4)이 뇌, 각 도구가 그 뇌를 소비한다. (배경: Astryx·Google Stitch·제너레이티브 UI 3개 리서치 → "모듈+규칙 아키텍트" 방향. **Astryx는 실제 홈 A/B 결과 프런트에 부적합 판정 → 미채택**, 상세는 아래 「Astryx 평가 기록」·`docs/PROJECT_CONTEXT.md`.)

| 층 | 도구 | 이 문서를 어떻게 읽나 | 상태 |
|---|---|---|---|
| **컴포넌트(프런트)** | 우리 Tailwind (단일) | §4 토큰 그대로. 프런트(홈·랜딩 등 감정·전환 화면)는 우리 톤이 A/B에서 승 → **우리 Tailwind로 통일**. | ✅ 확정 |
| **런타임 생성** | Vercel AI SDK gen-UI (`ai` v6, 설치됨) | 챗봇이 아래 **「런타임 gen-UI 화이트리스트」** 안의 검증 컴포넌트만 상황맞춤 렌더. 자유생성 금지. | 저리스크·검증됨 |
| **디자인타임 생성** | 우리 Gemini (draft 엔드포인트) | §4 토큰(hex)을 프롬프트에 넣어 온-브랜드 화면 초안 생성. ⚠️ 생성물은 (강화된)`check:content` + 사람 리뷰 후에만 배포. | 선택적 액셀러레이터 |

**허브 규칙**: 색·간격·톤 값을 바꾸면 **여기(§4) 한 곳만** 바꾸고 도구가 다 따라오게 한다. 도구별로 값을 따로 두지 마라(드리프트 원인).

---

```yaml
# ============================================================
# 1. 변경 권한 (Change Authority) — 제일 중요
# ============================================================
change_authority:
  default_mode: "guide_only"   # 신규 코드 작성 시 참고만
  forbidden:
    - "기존 페이지 디자인 자동 변경 금지"
    - "겸사겸사 리팩터 금지"
    - "DESIGN.md 작성 직후 일괄 정리 금지"
  explicit_change_keywords:    # 이 키워드가 사용자 메시지에 있을 때만 기존 변경 허용
    - "X 페이지를 DESIGN.md 기준으로 다시 만들어줘"
    - "기본 톤 마이그레이션"

# ============================================================
# 2. 서비스 본질 (왜 이 톤인가)
# ============================================================
context:
  service: "KHIDI HEALO — 카자흐스탄·러시아 암환자를 한국 종양 병원으로 매칭"
  audience: "불안 상태의 암환자 + 보호자 (CIS·러시아 우선, 6개 언어)"
  emotional_state: "정보 갈증 + 신뢰 욕구 — 차분함과 전문성 필수"
  funding: "KHIDI 정부지원과제 — 공공의료 신뢰 톤"
  reference_brand: "Airbnb (현재 메인 페이지 톤이 이 방향)"

# ============================================================
# 3. 표준 (기본 톤 = 우리의 유일한 디자인)
# ============================================================
# ⚠️ 옛 모드 이름("legacy" / "premium")은 버렸다. "legacy"가 '옛날꺼'처럼 들려서
#    "레거시→프리미엄으로 업그레이드해야지"라는 정반대 오해를 계속 유발했음(드리프트의 원인).
#    과거 premium(고급/호텔 톤)은 A/B 실험용이었고 폐기됨(PREMIUM_TEARDOWN, 2026-06 — 토글 designMode.js 삭제).
#    → 이제 디자인은 하나뿐 = 아래 "기본 톤(teal)". 모드 토글 없음.
#    (파일명에 남은 "*Legacy*" 접미사는 그때의 정식본이란 뜻일 뿐 — 새 이름은 "기본 톤".)
standard:
  framework: "Next.js 16 + Tailwind CSS"
  design: "기본 톤 (teal) — 단일 디자인, 모드 토글 없음"
  reference_pages:
    - "/"          # 홈 — Airbnb 스타일 refactor (commit b7a0179)
    - "/hospitals" # 병원 목록
    - "/contact"
    - "/privacy"

# ============================================================
# 4. 토큰 — 실제 코드에서 추출한 값만
# ============================================================
# ⚠️ hex 병기(2026-07-06): Tailwind 안 쓰는 소비자(Stitch·AI SDK·Astryx)는 hex가 필요 → 이름+hex 단일 SoR.
colors:
  primary:           "teal-600"      # #0d9488 — 영구 고정. 브랜드 색.
  primary_hover:     "teal-700"      # #0f766e
  primary_subtle:    "teal-50"       # #f0fdfa — 배경 강조용
  primary_border:    "teal-100"      # #ccfbf1
  primary_active:    "teal-500"      # #14b8a6
  text_primary:      "gray-900"      # #111827
  text_secondary:    "gray-500"      # #6b7280
  text_muted:        "gray-400"      # #9ca3af
  bg:                "white"         # #ffffff
  bg_subtle:         "gray-50"       # #f9fafb
  border:            "gray-200"      # #e5e7eb
  border_strong:     "gray-300"      # #d1d5db
  success:           "emerald-500"   # #10b981
  warning:           "amber-500"     # #f59e0b
  danger:            "red-500"       # #ef4444

radii:
  default:   "rounded-xl"       # 12px — 카드·버튼·이미지 기본 (신규 작업 우선)
  card_lg:   "rounded-2xl"      # 16px — 큰 카드 예외적 허용 (홈 레퍼런스도 사용)
  badge:     "rounded-full"     # 알약 배지·아바타만
  forbidden: "rounded-3xl"      # 24px — Premium 잔재. 신규 코드 금지.

typography:
  font_family: "system-ui, -apple-system, sans-serif"   # 시스템 폰트만 (Playfair 등 serif 금지)
  heading_h1:  "text-3xl md:text-4xl font-bold"
  heading_h2:  "text-2xl md:text-3xl font-bold"
  heading_h3:  "text-lg md:text-xl font-bold"
  body:        "text-sm md:text-base"
  caption:     "text-xs text-gray-500"

spacing:
  card_padding:    "p-5 md:p-8"
  section_padding: "py-10 md:py-16"
  gap_default:     "gap-4 md:gap-5"

# elevation 축 — 그림자는 "용도별 1값". 코드에 sm/md/lg/xl/2xl 5종이 난무 중(축 미고정)이라 신규는 아래로 통일.
# 면(surface) 분리는 테두리(border)보다 **배경 톤(white vs gray-50) + 그림자**를 우선한다(테두리 남발 금지).
elevation:
  card_rest:    "shadow-sm"     # 정적 카드 기본
  card_hover:   "shadow-md"     # 카드 호버 1단계 상승 (확대·회전 X — 그림자만)
  floating:     "shadow-lg"     # 드롭다운·팝오버·툴팁 등 떠 있는 요소
  overlay:      "shadow-xl"     # 모달·전면 시트만
  forbidden:    "shadow-2xl 남발 — overlay에도 xl까지. 카드에 lg+ 금지(떠보임)"

# numeric 축 — 가격·건수·통계 (의료 신뢰 = 숫자 정렬). 현재 tabular-nums 0회 적용.
numeric:
  align:       "tabular-nums"   # 숫자 폭 고정 → 표·카운터 흔들림 방지 (가격·건수·통계엔 필수)
  hierarchy:   "숫자는 크고 굵게, 단위·라벨은 작게 (약 2:1). 예: 협진병원 '8'(text-3xl) + '곳'(text-base)"
  rule:        "KHIDI 신뢰지표(협진병원 8·전문의료진 28·6개 언어 등) 표시에 적용. 가짜 숫자 금지(의료 광고법)."

# motion 축 — 전환 시간 1값으로(현재 150~700 난무). 호버는 그림자/톤만.
motion:
  default:     "transition-all duration-200"   # 기본 전환 — 이거 하나로 통일
  emphasis:    "duration-300"                   # 큰 요소(모달 등장 등) 예외만
  forbidden:   "duration-500+ 남발 / 호버 확대(scale)·회전(rotate) / 의미 없는 fade"

# ============================================================
# 5. i18n — 6개 언어 대응 (우리만의 제약)
# ============================================================
i18n:
  languages: ["ko", "en", "ru", "kz", "zh", "ja"]   # 카자흐어는 kz (kk 아님 — i18n 시스템 표준)
  longest_lang: "ru"            # 러시아어가 한글 대비 1.5배 김
  fallback_chain: ["lang", "en", "ko"]
  rules:
    - "버튼 padding 최소 px-6 (러시아어 텍스트 안 잘리게)"
    - "navigation 텍스트 truncate 금지"
    - "i18n 키 값이 placeholder('FloatingHelp' 같은 영문 키 그대로) 아닌지 PR 머지 전 grep 확인"
    - "줄임표(...) 대신 줄바꿈 허용 — 모바일에서 2~3줄까지 OK"

# ============================================================
# 6. 금지 — "AI가 만든 느낌" 회피
# ============================================================
forbidden:
  ai_made_look:
    - "큰 컬러 원(w-16/w-20 rounded-full bg-color-50)에 큰 아이콘(size 28+) 박는 패턴 → 작은 사각형 아이콘(w-10/w-12 rounded-xl)으로"
    - "3~4개 카드가 똑같은 레이아웃·똑같은 그림자·똑같은 컬러 변형으로 반복"
    - "UI 크롬에 이모지 (🌐 🔔 💬 등) — 챗봇 말풍선 안 같은 컨텍스트에서만 허용"
    - "의미 없는 영문 카피 (Unleash your potential, Transform your journey 류)"
    - "스톡 일러스트 (undraw, storyset)"
  premium_drift:
    - "rounded-2xl 초과 (rounded-3xl 등)"
    - "그라데이션 배경 (purple→pink·teal→blue 같은 거)"
    - "Playfair Display·Noto Serif KR 등 serif 폰트"
    - "cream/ink/gold 컬러 토큰 사용 (healo-tokens.css)"
    - "이미지 위 텍스트 + 어둡게 오버레이 (호텔 톤)"
  brand_misuse:
    - "사업자등록번호·전화번호 헤더 상시 노출 (저가 여행사 인상)"
  imports:
    - "src/legacy-pages/** 신규 import (ESLint 룰 있음)"
    - "components/healo/Nav.jsx, Footer.jsx, Primitives.jsx — Premium 컴포넌트"
    - "app/styles/healo-tokens.css 토큰 (cream/gold/ink)"

# ============================================================
# 7. 의료 도메인 특화 룰
# ============================================================
medical_ui:
  pii_display: "환자 이름 마스킹 (홍O동 형태) — 풀네임 노출 시 인코딩 안 된 PII"
  ux_states:
    rule: "빈·로딩·에러 상태를 '실데이터처럼' 설계 — 빈 화면/날 에러코드 노출 = 의료 신뢰 즉시 붕괴."
    loading: "스피너 단독 금지 → 맥락 문구(번역된, 예 '병원 정보 불러오는 중…') 동반. 목록은 스켈레톤 권장."
    error:   "사용자 언어로 안내 + 재시도 동선. raw error.message·스택 노출 금지(보안 룰과 동일)."
    empty:   "'결과 없음'만 띄우지 말고 왜 비었는지 + 다음 행동(검색 바꾸기·문의하기) 제시."
  emergency_color: "red-500 (warning·error)"
  data_freshness:
    rule: "병원·의료진 정보 변경 시 토스트 또는 모달로 사용자 안내"
    example: "성동점 신규 오픈 → New 뱃지"
  trust_signals:
    - "외국인환자 유치기관 등록 뱃지"
    - "의사 본명·사진·자격증 출처 명시"
  forbidden:
    - "후기/리뷰만 강조하고 출처 의료기관 정보 누락"
    - "'완치 보장' '100% 성공' 등 의료 광고법 위반 카피"

# ============================================================
# 8. 미사용 (코드 보존, 신규 import 금지)
# ============================================================
deprecated:
  - "components/healo/Nav.jsx"          # Premium Nav
  - "components/healo/Footer.jsx"       # Premium Footer
  - "components/healo/Primitives.jsx"   # Eyebrow / Rule / ButtonGold
  - "app/styles/healo-tokens.css"       # cream/ink/gold 토큰 전체
  - "app/intake/_archive/IntakePremium.jsx"
  - "app/inquiry/_archive/InquiryClient.jsx"   # 참고용으로만, import X
```

---

## 🧩 Astryx 평가 기록 — 미채택 (2026-07-07)

> **결론: Astryx(Meta 오픈소스 디자인 시스템)는 평가 후 도입하지 않기로 확정.** 파일럿(단독·A/B·백오피스·실제 홈 재현)까지 만들어 검증한 뒤 내린 결정 — 다음 세션이 "다시 검토"로 되돌리지 않게 근거를 남긴다.

**왜 미채택인가:**
- **프런트(홈·랜딩)**: 실제 홈 A/B 결과 **우리 현재 톤이 승**. 홈의 일 = 감정적 신뢰·전환인데 Astryx의 균일 카드 그리드는 오히려 차갑고 "AI 찍어낸 느낌"에 가까웠음(불안한 암환자에 부적합).
- **백오피스**: Astryx `Table`이 유일하게 우위였으나, 그거 하나 위해 **베타 npm 의존성 + ~1,300 패키지 + 글로벌 `@layer` 수술**을 안고 가는 건 1인 운영에 손해. 필요 시 우리 Tailwind로 조밀 테이블을 직접 만드는 편이 쌈.
- **통합 함정(기록용)**: 우리 Tailwind 3.4는 `@tailwind base`(unlayered)라 preflight가 Astryx의 `@layer` 컴포넌트 스타일을 이겨 버튼이 투명해짐 → 도입하려면 글로벌 Tailwind `@layer` 재편이 강제됨(1회성이지만 리스크).

**남긴 것(Astryx 없이도 우리 자산):** ①§4 토큰 hub(hex 단일 SoR) ②「런타임 gen-UI 화이트리스트」(챗봇) ③디자인타임 draft 생성기(우리 Gemini) ④의료광고 가드 강화(POSTMORTEM #66). = Astryx의 "개념"만 우리 스택으로 흡수, 라이브러리 자체는 제거.

---

## 🤖 런타임 gen-UI 컴포넌트 화이트리스트 + 가드레일 (AI 챗봇용)

> **언제:** AI 문의 챗봇(`ai` v6 = Vercel AI SDK, 이미 설치)이 상황에 맞춰 UI를 렌더할 때. 브런치 "제너레이티브 UI" 개념의 **의료 안전판** — 자유생성이 아니라 **검증된 레고만 조립**.
> **핵심 규칙:** 챗봇은 아래 화이트리스트의 컴포넌트만 렌더한다. 목록 밖 UI를 즉석 생성하지 않는다(환각 UI·의료광고법·6언어 일관성 리스크 차단).

**허용 컴포넌트(검증된 데이터 기반 · 확장 시 이 목록에 추가):**
- 병원 비교 카드 (등록 유치기관·협진 정보 — 실데이터 API)
- 예약/상담 슬롯 피커 (LiveKit 상담 생성 흐름 연동)
- 치료여정 단계 카드 (`/care-journey` 정적 데이터)
- 비용 추정 요약 (공식 진료비 자료 기준 — 가짜 수치 금지)
- 문의 CTA / 채널 선택 (WhatsApp·Telegram·WeChat·LINE)

**가드레일(전부 필수):**
1. **화이트리스트 외 생성 금지** — 자유 텍스트→임의 UI 금지.
2. **§4 토큰·§5 i18n(6언어)·§6 금지목록·`medical_ui` 준수** — gen 컴포넌트도 일반 UI와 동일 검열.
3. **PII 마스킹**(환자명 홍O동/이니셜) · **미검증 수치·진단/처방 UI 금지**(의료광고법).
4. **ux_states**: 빈·로딩·에러도 맥락 문구+다음행동(날 에러코드 노출 금지).

---

## Airbnb 스타일 — 우리가 추구하는 구체적 패턴

**좋은 예 (현재 메인 페이지 `app/home/HomeClient.jsx`):**
- 큰 사진 + 짧은 헤드라인 + 가격/평점 한 줄
- 카드별로 사진이 다르고, 글자 길이도 제각각
- 호버 시 그림자 변화만 (확대·회전 X)
- 색은 brand teal + 사진의 자연색
- 둥근 모서리 `rounded-xl` (12px) 정도

**피해야 할 예 ("AI가 만든 느낌"):**
- 컬러 원(`w-20 h-20 rounded-full bg-teal-50`) 안에 큰 아이콘
- 카드 4개가 색깔만 다르고 레이아웃 똑같음
- 모든 카드에 동일한 그림자·동일한 호버 효과
- 본문 카피가 죄다 "Powerful · Seamless · Intuitive" 류

---

## AI 에이전트가 따라야 할 체크리스트

신규 UI를 만들 때 **이 순서로 자가 검열**:

1. ✅ `colors.primary` (teal-600) 외 다른 메인 컬러 사용했는가? → 정당화 필요
2. ✅ `rounded-3xl` 이상 사용했는가? → 금지
3. ✅ Lucide 아이콘을 `size={28+}` + `w-16 h-16 rounded-full` 배경에 박았는가? → "AI 느낌" 신호. 작은 사각형으로 줄이기
4. ✅ 카드 3~4개가 색깔만 다른 동일 레이아웃인가? → 다양화 필요
5. ✅ healo-tokens.css의 cream/gold/ink 변수 참조했는가? → 금지
6. ✅ 러시아어 버전에서 텍스트 truncate 발생하는가? → padding 늘리기
7. ✅ i18n 키 값이 placeholder 그대로 ('FloatingHelp', 'TODO')인가? → 번역 필수
8. ✅ 환자 풀네임 노출되는가? → 마스킹 (홍O동)
9. ✅ 의료 광고법 위반 카피 ('완치 보장' 등)? → 금지
10. ✅ 이모지를 UI 크롬(헤더·버튼)에 썼는가? → 챗 말풍선만 허용
11. ✅ 그림자를 용도와 무관하게 골랐는가? → `elevation` 축대로(카드 sm, 호버 md, 팝오버 lg, 모달 xl). 면 분리는 톤+그림자 우선, 테두리 남발 금지
12. ✅ 가격·건수·통계 숫자에 `tabular-nums` 뺐는가? → 추가(흔들림 방지). 숫자:단위 위계 2:1
13. ✅ 전환에 `duration-500+`·`scale`·`rotate` 호버 썼는가? → 기본 `duration-200`, 호버는 그림자/톤만
14. ✅ 빈·로딩·에러 상태를 방치(빈 화면·날 에러코드)했는가? → 맥락 문구+재시도+다음행동(의료 신뢰)

---

## 변경 이력

- **2026-05-19**: 최초 작성. Legacy 모드 표준화. Premium 토큰 deprecated.
- **2026-05-21**: /treatments·/telemedicine·/faq·/hospitals/immune·404·500 Legacy 재구성 완료. radii 기본값 rounded-xl 명확화.
- **2026-06-18**: 정합성(coherence) 원칙 명문화 + 빈 축 4개 보강 — elevation(그림자 용도별 1값), numeric(tabular-nums·숫자 위계), motion(전환 duration-200 통일), ux_states(빈/로딩/에러). StyleSeed(bitjaru) 칼럼 분석에서 우리 코드에 실재하던 축 미고정(그림자 5종 난무·tabular-nums 0회)을 발견해 반영. 도구는 미도입, 원칙만 흡수.
- **2026-07-01**: 활성 디자인 명칭을 "legacy 모드" → **"기본 톤"** 으로 개명. 이유: "legacy(옛날꺼)"라는 이름이 "premium으로 업그레이드해야 한다"는 정반대 오해를 반복 유발(premium_drift의 근본원인 중 하나). "두 모드(legacy/premium)" 틀을 버리고 "단일 디자인 + 금지요소 목록"으로 단순화. 삭제된 참조(`src/lib/designMode.js`·`src/legacy-pages/`) 정정. 컴포넌트 파일명의 `*Legacy*` 접미사는 그대로 둠(import·충돌 위험, 오해와 무관).
- **2026-07-06**: **허브화** — DESIGN.md를 "세 도구가 읽는 단일 계약서"로 확장(상단 「이 문서의 지위」표). 계기: Astryx·Google Stitch·제너레이티브 UI 3개 리서치 → "모듈+규칙 아키텍트" 방향. 추가: ①§4 토큰에 hex 병기(Tailwind 안 쓰는 소비자용) ②「Astryx teal 토큰 매핑」(백오피스 컴포넌트) ③「런타임 gen-UI 화이트리스트+가드레일」(챗봇 = Vercel AI SDK, 자유생성 금지·검증 컴포넌트만·의료 가드). 기존 톤 규칙·금지목록은 그대로(추가만).
- **2026-07-07**: **Astryx 미채택 확정·제거.** 실제 홈 A/B에서 우리 톤이 승(프런트=감정·전환엔 우리 톤이 맞고 Astryx는 차갑다는 판정) → Astryx npm 의존성 3개·파일럿 컴포넌트 화면 4개·de-layer 벤더 CSS 삭제. 「Astryx teal 토큰 매핑」 → 「Astryx 평가 기록(미채택)」으로 대체(재검토 방지 근거 보존). 남긴 것: §4 토큰 hub·gen-UI 화이트리스트·draft 생성기·의료광고 가드 강화(#66) — Astryx의 '개념'만 우리 Tailwind/스택으로 흡수. 상단 「이 문서의 지위」표를 3도구→우리 실제 자산 기준으로 갱신.

---

**Reference:**
- 원리: <https://yozm.wishket.com/magazine/detail/3736/> (Google Stitch DESIGN.md 표준)
- 우리 적용: 단독 PO + 6개 언어 + 의료 도메인 특화로 압축
