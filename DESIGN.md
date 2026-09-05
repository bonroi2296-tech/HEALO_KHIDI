# HEALO KHIDI — DESIGN.md

> AI 에이전트(Claude Code, Cursor 등)가 신규 UI 코드를 작성할 때 자동으로 참고하는 디자인 가이드. **읽지 않고 만든 UI는 PR 머지 거부.**

> 🎨 **실물 시안(참조본) = [`docs/design/기본톤_시안.html`](docs/design/기본톤_시안.html) — 새 화면 만들기 전에 이걸 먼저 봐라.**
> 색·모서리·그림자·간격·상태 화면(빈/로딩/오류)·「AI가 만든 느낌」 대조를 **실제로 그려서** 보여준다. 브라우저로 열면 끝(서버 불필요).
> 왜 시안이 따로 있나: 시각적인 건 글로 옮기는 순간 손실이 난다. 앤트로픽 「컨텍스트 엔지니어링의 새 규칙」(2026-07-24)이
> *"HTML 시안이 디자인 설명보다, 그리고 **화면 사진보다도** 낫다"*고 명시 — 우리는 글 + 화면 사진 둘 다 쓰고 있었다.
> 경위: `docs/audit/CONTEXT_ENGINEERING_2026-07-31.md`
> **어긋나면**: 토큰 값은 **시안**이, 규칙 문장(금지·의료·다국어)은 **이 문서**가 기준. 색을 바꿀 땐 **둘 다** 고쳐라.

> **핵심 원칙 — 정합성(coherence)이 미(美)보다 우선.**
> "AI가 만든 느낌"은 못생긴 부품이 아니라 **부품끼리 안 맞아서** 난다. 축(색·모서리·그림자·간격·전환·숫자)마다 **값을 하나로 정하고 전부 거기 맞춘다.** 예쁜 부품이 아니라 **일관된 부품**이 "설계된" 느낌을 만든다. → 아래 토큰이 각 축의 "정해진 한 값". 벗어나면 정당화 필요.

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
# ⚠️ 디자인은 «하나»뿐이다 = 아래 "기본 톤(teal)". 고를 수 있는 다른 톤은 없다.
#    옛 모드 이름("legacy" / "premium")은 2026-07-01 에 버렸다 — "legacy"가 '옛날꺼'처럼 들려
#    "레거시→프리미엄으로 업그레이드해야지"라는 정반대 오해를 반복 유발했기 때문이다(드리프트의 근본원인).
# 🚫 premium 은 2026-06 에 **완전히 폐기**됐다. 토글(designMode.js)·컴포넌트·페이지가 전부 삭제됐고,
#    되살리는 것도 «참고본으로 여는 것»도 금지다. 지나간 실험이지 대안이 아니다.
#    경위만 필요하면 보관 문서(docs/archive/PREMIUM_TEARDOWN_PLAN.md)를 보되, 거기 적힌 값은 «금지 목록»으로 읽어라.
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
colors:
  # ⚠️ 2026-07-31 정정: primary 가 teal-600 으로 적혀 있었으나 «자기 문서의 대비 규칙을 스스로 위반»했다.
  #    teal-600 은 흰 배경 위 글씨 3.74:1, 흰 글씨를 얹은 배경도 3.74:1 — 양쪽 다 AA 미달이라 쓸 자리가 없다.
  #    실제 코드는 이미 teal-700 을 쓰고 있었다(배경 306회 vs 24회 = 12.75배 / 글씨 625회 vs 54회 = 11.6배).
  #    즉 문서만 뒤처져 있었고, 이대로 두면 새 화면이 «AA 미달 + 나머지 306곳과 색이 다른» 버튼을 달게 된다.
  primary:           "teal-700"      # 영구 고정. 브랜드 색. 버튼 배경·글씨 모두 이 값 (흰 배경 5.47:1 ✅)
  primary_hover:     "teal-800"      # 7.58:1 ✅
  primary_subtle:    "teal-50"       # 배경 강조용
  primary_border:    "teal-100"
  primary_active:    "teal-800"
  forbidden_primary: "teal-600"      # ⛔ 3.74:1 — 글씨로도, 흰 글씨를 얹는 배경으로도 미달
  text_primary:      "gray-900"      # 17.7:1
  text_secondary:    "gray-500"      # 4.83:1 (흰 배경 전용 — 회색/연색 배경 위에선 gray-600)
  text_muted:        "gray-400"      # ⛔ 2.53:1 — «글씨로 쓰지 마라». 아이콘·장식 전용
  bg:                "white"
  bg_subtle:         "gray-50"
  border:            "gray-200"
  border_strong:     "gray-300"
  # ⚠️ 상태색 3종은 «배경·아이콘·테두리» 전용이다. 글씨로 쓰면 전부 AA 미달(2026-07-27 실측).
  success:           "emerald-500"   # 흰 배경 글씨 2.54:1 ⛔ → 글씨는 green-700 / emerald-700
  warning:           "amber-500"     # 2.15:1 ⛔ → 글씨는 amber-700
  danger:            "red-500"       # 3.76:1 ⛔ → 글씨는 red-600 (연빨강 배경 위면 red-700)

# ============================================================
# 4-b. 대비(contrast) 축 — 2026-07-27 실측으로 신설
# ============================================================
# 왜: 로그인 뒤 화면을 처음 실측하자 WCAG AA 위반 serious 414건이 나왔고, 대부분이 «흐린 회색»
#     한 토큰이었다. 지금은 32화면 0건이며 매주 자동 측정으로 지킨다(scripts/audit/a11y-scan.mjs).
#     ⛔ 재유입은 check:content 의 [저대비회색] 가드가 막는다(백오피스·환자포털·공유부품).
contrast:
  rule_text:    "본문 글씨 4.5:1 이상 (18px 미만 기준)"
  rule_ui:      "아이콘·테두리·상태 점 3:1 이상"
  gotcha_bg:    "배경이 흰색이 아니면 한 단계 더 진하게 — gray-500 은 흰 배경 4.83 통과지만 gray-100 위에선 4.39 미달"
  gotcha_photo: "사진·그라데이션 위 글씨는 axe 가 «미판정»으로 남긴다 = 통과가 아님. 오버레이 최악값으로 직접 계산할 것"
  # ⚠️ 2026-07-31 신설 — «어두운 화면 예외». 위 4-b 규칙은 흰/연회색 배경 전제다.
  #    화상상담 방(app/consultation, bg-gray-800/900)에서는 순서가 **뒤집힌다**:
  #      teal-700 = 2.68~3.24 ⛔  ·  teal-600 = 3.92~4.74  ·  teal-500 = 5.90~7.13 ✅  ·  teal-400 = 7.89~9.53 ✅
  #    즉 «주색은 무조건 teal-700» 은 밝은 화면에서만 옳다.
  gotcha_dark:
    rule:    "어두운 배경(bg-gray-800/900) 위 «글씨·아이콘» 색은 teal-400 또는 teal-500. teal-700 은 미달이다."
    button:  "단 «버튼 채움색»은 예외의 예외 — 흰 글씨 vs 채움색 대비라 페이지 배경과 무관하다. 어두운 화면에서도 bg-teal-700(5.47:1) 이 정답."
    where:   "app/consultation/**, 영상 위 오버레이(bg-black/80) 등"
    guard:   "check:content 의 [주색미달] 가드가 이 두 갈래를 구분해 안내한다(밝은 화면/어두운 화면·글씨/채움색)."
  forbidden:
    - "text-gray-400 을 글씨로 (2.54:1)"
    - "상태색 500번대를 글씨로 (emerald 2.54 · amber 2.15 · red 3.76)"
    - "흰 글씨를 500~600번대 배경 위에 (sky-500 2.77 · red-500 3.76 · teal-600 3.74) → 700번대로"
  # 위 숫자는 2026-07-31 에 WCAG 공식으로 전부 재계산해 확인함(전건 일치, gray-400 만 2.53→2.54 반올림 정정).
  # 700번대 실측: teal-700 5.47 · emerald-700 5.48 · amber-700 5.02 · red-600 4.83 — 전부 통과.
  # 눈으로 보려면 → docs/design/기본톤_시안.html 「1. 색」

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
  # ♿ 「움직임 줄이기」는 이제 신경 안 써도 된다 — src/index.css 전역 블록이 CSS 움직임을 전부 끈다.
  #    단 하나 예외: 자바스크립트로 «부드럽게»를 «옵션에 박는» 부류(scrollIntoView/scrollTo의
  #    behavior:"smooth")는 CSS 가 못 이긴다 → scrollBehavior() from "@/lib/a11y/prefersReducedMotion".
  #    (check:content 의 [움직임줄이기] 가드가 둘 다 막는다. 왜 필요한가: 항암 중 구역·어지럼)
  reduced_motion: "전역 자동 — JS 의 behavior:\"smooth\" 만 scrollBehavior() 로"

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
    # 2026-08-27 로 premium 잔재는 «코드에서 0개»가 됐다. 아래는 전부 없는 파일이니 찾지 마라 —
    # Nav.jsx · Footer.jsx · Primitives.jsx · healo-tokens.css · src/legacy-pages/** (2026-06~08 삭제).
    # 전역 CSS 는 이제 src/index.css 하나뿐이다. 새 전역 스타일 파일을 또 만들지 마라.

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
# 8. 폐기된 premium 잔재 — 되살리지 마라
# ============================================================
# 🚫 "나중에 쓸지 모르니 보존"이 아니다. 아래는 이미 지웠거나 지우는 중인 것들이고,
#    신규 import 는 물론 «디자인 참고본으로 여는 것»도 금지다.
removed:            # 삭제 완료 — 없는 파일이다. 되살리지도, 찾지도 마라.
  - "src/lib/designMode.js"                    # 톤 토글 (2026-06)
  - "components/healo/Nav.jsx"                 # Premium Nav
  - "components/healo/Footer.jsx"              # Premium Footer
  - "src/legacy-pages/**"
  - "app/intake/_archive/IntakePremium.jsx"
  - "app/inquiry/_archive/InquiryClient.jsx"
  - "app/**/*Premium.jsx"                      # 홈·가입·문의 등 16개
  - "components/healo/Primitives.jsx"          # ButtonGold 등. 2026-08-27 삭제: 마지막 사용처 app/patient/calendar 가 기본 톤으로 바뀌어 0건이 됐다
  - "app/styles/healo-tokens.css"              # cream/ink/gold 토큰 + serif. 2026-08-27 삭제: 아직 쓰이던 전역 규칙 7개(본문 15px/1.7 · overflow-x:clip · tap-highlight · .healo-portal-offset · 폰 입력칸 16px · 인쇄 · safe-bottom)는 src/index.css 로 옮겼다
# 🤖 이 절은 «기계가 지킨다» (2026-08-27): check-content-consistency.mjs §8-b 가
#    app/·src/·components/ 전체에서 Playfair·#c8a96a·#f5f0e8·#0a0a0a·#c7c2b8 와
#    healo/Primitives 신규 import 를 잡는다(삭제된 뒤에도 되살아나지 못하게 남겨 둔다).
#    ✅ 기준선(UI_PREMIUM_BASELINE)은 «비어 있다» — 지금은 한 건이라도 나오면 바로 빨간불이다.
#    새 잔재를 그 표에 적어 통과시키지 마라. 거기는 «고치는 중인 것»의 임시 통행증이지 면제권이 아니다.
#    (2026-08-27 실측: 위반 화면을 넣은 신청서를 실제로 올려 CI 가 exit 1 로 막는 것까지 확인했다.)
# ✅ pending_removal 은 «비었다» — 코드에 남은 premium 잔재는 0개다(2026-08-27, healo-tokens.css 철거로 닫힘).
#    칸을 지우지 마라: 다시 생기면 여기에 적고 위 기계 검사의 기준선도 같이 올려라.
```

---

## Airbnb 스타일 — 우리가 추구하는 구체적 패턴

> 🎨 **이 절의 「좋은 예 / AI가 만든 느낌」은 말로 읽지 말고 [실물 시안](docs/design/기본톤_시안.html)에서 나란히 놓고 봐라**
> (시안 3절 = 아이콘·복제된 카드, 6절 = 움직임). 시각적인 걸 글로 옮기면 손실이 난다.
> 아래는 시안을 못 열 때를 위한 요약이고, **판정 기준은 시안이다.**

**좋은 예** — 진짜 참조본은 두 가지: ①위 시안 파일 ②실제 코드 `app/home/HomeClient.jsx`
- 큰 사진 + 짧은 헤드라인 + 한 줄 요약
- **카드마다 내용이 달라서 생김새가 다르다** (틀을 복제하고 색만 바꾸는 게 아니라)
- 마우스 올리면 그림자만 한 단계 (확대·회전 X)
- 색은 brand teal + 사진의 자연색 / 모서리 `rounded-xl`

**피해야 할 예("AI가 만든 느낌")** — 이 4가지가 신호다
- 큰 컬러 원(`w-20 h-20 rounded-full bg-teal-50`) 안에 큰 아이콘 → 작은 사각형(`w-10 rounded-xl`)으로
- 카드 3~4개가 레이아웃 똑같고 색만 다름
- 모든 카드에 같은 그림자·같은 호버
- 알맹이 없는 형용사 카피("Powerful · Seamless · Intuitive", "빠릅니다·안전합니다·정확합니다")

---

## AI 에이전트가 따라야 할 체크리스트

신규 UI를 만들 때 **이 순서로 자가 검열**:

1. ✅ `colors.primary` (**teal-700**) 외 다른 메인 컬러 사용했는가? → 정당화 필요. **`teal-600`은 그냥 금지**(3.74:1 미달)
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
15. ✅ **글씨에 `text-gray-400`·상태색 500번대를 썼는가?** → 전부 AA 미달. gray-500↑ / 상태색은 600~700번대 (`contrast` 축)
16. ✅ **흰 글씨를 500번대 색 배경 위에 얹었는가?** → sky/red/teal-500~600은 미달. 700번대로
17. ✅ **배경이 흰색이 아닌데 gray-500을 썼는가?** → 회색·연색 배경 위에선 gray-600 (흰 배경 4.83 → gray-100 위 4.39)
18. ✅ **스태프가 매번 고르거나 입력해야 하는 칸을 새로 만들었는가?** → 만들기 전에 3개를 먼저 답하라 — ①이 값을 기계가 알 수 있나 ②표준 파일·규격이 대신 해주나(예: 일정은 `.ics` 첨부가 받는 사람 시간대로 알아서 그린다) ③틀리게 고르면 어떤 잘못된 결과가 밖으로 나가나. **③이 환자에게 잘못 나가는 종류면 칸을 만들지 마라** — 언어·국적으로 추측해 미리 채우는 기본값은 더 나쁘다(러시아어 쓰는 카자흐 환자가 많다). 근거: 2026-08-04 PO — *"매번 확인해야 하고 휴먼에러가 나올 수도 있는거 아닌가"* → 만들었던 「상대 국가」 드롭다운을 전부 되돌림.
19. ✅ **사용자에게 «그 시점에 알 수 없는 값»을 물어보는 칸을 만들었는가?** → 만들지 마라. 18번이 「스태프가 답하기 귀찮은 칸」이라면 이건 **「사용자가 답을 «모르는» 칸」**이다. 모르는 값을 물으면 아무 숫자나 넣고, **그 값으로 판정하면 틀린 안내가 나간다.** 대신 **우리가 아는 함정을 먼저 알려줘라.** 근거: 2026-08-07 PO — 비자 화면에 「치료 예상 기간」 입력을 두 번 제안했고 두 번 다 접힘(*"치료기간을 단정짓기 어려우니깐 빼기로 했던거같아"*). **암 환자는 진단·치료계획이 나오기 «전»에 그 화면을 본다.** → 기간을 묻는 대신 «무비자 30일은 검진·2차 소견까지»를 먼저 띄우는 쪽으로 갔다(`src/lib/visa/visaGuide.ts`, 이유는 `app/patient/visa/VisaClient.jsx` 주석에 고정).

20. ✅ **사진·로고·아이콘 «밑»에 작은 회색 글씨로 부연을 달았는가?** → 빼라. 설명이 필요하면 **제목으로 올려라**. 근거: 2026-09-04 리플렛 작업에서 PO 가 세 번 지적 — *"쓸데없는 주석은 좀 빼고"* → *"주석은 빼라니깐. 그리고 뭐 설명을 해줘야지 이미지만 딸랑 던지니 이상하잖아"* → 이어진 정답이 ***"설명을 타이틀로"***. **제목이 될 만큼 중요하지 않으면 그건 빼도 되는 것이다.** 사진 밑 캡션·로고 밑 라벨·아이콘 밑 부연이 전부 같은 부류.

---

## 변경 이력

- **2026-05-19**: 최초 작성. Legacy 모드 표준화. Premium 토큰 deprecated.
- **2026-05-21**: /treatments·/telemedicine·/faq·/hospitals/immune·404·500 Legacy 재구성 완료. radii 기본값 rounded-xl 명확화.
- **2026-06-18**: 정합성(coherence) 원칙 명문화 + 빈 축 4개 보강 — elevation(그림자 용도별 1값), numeric(tabular-nums·숫자 위계), motion(전환 duration-200 통일), ux_states(빈/로딩/에러). StyleSeed(bitjaru) 칼럼 분석에서 우리 코드에 실재하던 축 미고정(그림자 5종 난무·tabular-nums 0회)을 발견해 반영. 도구는 미도입, 원칙만 흡수.
- **2026-07-31**: **실물 시안 `docs/design/기본톤_시안.html` 신설** + **주색 정정(teal-600 → teal-700)**.
  ①앤트로픽 「컨텍스트 엔지니어링의 새 규칙」이 *"HTML 시안 > 디자인 설명 > 화면 사진"* 이라고 명시 — 우리는 열등한 두 방식만 쓰고 있었다.
  색·그림자·간격·상태 화면은 이제 시안이 「보여주고」, 이 문서는 「금지·의료·다국어 규칙」을 맡는다.
  ②감사 중 발견: **`primary: teal-600` 이 이 문서 자신의 대비 규칙을 위반**하고 있었다(흰 배경 글씨 3.74:1, 흰 글씨 배경 3.74:1 — 양쪽 미달).
  실제 코드는 이미 `teal-700` 을 쓰고 있었다(배경 12.75배·글씨 11.6배). **문서만 뒤처져 있었고, 그대로 뒀으면 새 화면이 AA 미달 버튼을 달 뻔했다.**
  ③대비 숫자 전건을 WCAG 공식으로 재계산해 확인(전부 일치, `gray-400` 2.53→2.54 반올림만 정정).
  경위: `docs/audit/CONTEXT_ENGINEERING_2026-07-31.md`
- **2026-07-01**: 활성 디자인 명칭을 "legacy 모드" → **"기본 톤"** 으로 개명. 이유: "legacy(옛날꺼)"라는 이름이 "premium으로 업그레이드해야 한다"는 정반대 오해를 반복 유발(premium_drift의 근본원인 중 하나). "두 모드(legacy/premium)" 틀을 버리고 "단일 디자인 + 금지요소 목록"으로 단순화. 삭제된 참조(`src/lib/designMode.js`·`src/legacy-pages/`) 정정. 컴포넌트 파일명의 `*Legacy*` 접미사는 그대로 둠(import·충돌 위험, 오해와 무관).

---

**Reference:**
- 원리: <https://yozm.wishket.com/magazine/detail/3736/> (Google Stitch DESIGN.md 표준)
- 우리 적용: 단독 PO + 6개 언어 + 의료 도메인 특화로 압축
