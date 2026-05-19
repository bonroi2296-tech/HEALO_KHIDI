# HEALO KHIDI — DESIGN.md

> AI 에이전트(Claude Code, Cursor 등)가 신규 UI 코드를 작성할 때 자동으로 참고하는 디자인 가이드. **읽지 않고 만든 UI는 PR 머지 거부.**

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
    - "Legacy 톤 마이그레이션"

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
# 3. 표준 (Legacy 모드만 표준)
# ============================================================
standard:
  framework: "Next.js 16 + Tailwind CSS"
  design_mode: "legacy"   # src/lib/designMode.js — DEFAULT_MODE = 'legacy'
  reference_pages:
    - "/"          # 홈 — Airbnb 스타일 refactor (commit b7a0179)
    - "/hospitals" # 병원 목록
    - "/contact"
    - "/privacy"

# ============================================================
# 4. 토큰 — 실제 코드에서 추출한 값만
# ============================================================
colors:
  primary:           "teal-600"      # 영구 고정. 브랜드 색.
  primary_hover:     "teal-700"
  primary_subtle:    "teal-50"       # 배경 강조용
  primary_border:    "teal-100"
  primary_active:    "teal-500"
  text_primary:      "gray-900"
  text_secondary:    "gray-500"
  text_muted:        "gray-400"
  bg:                "white"
  bg_subtle:         "gray-50"
  border:            "gray-200"
  border_strong:     "gray-300"
  success:           "emerald-500"
  warning:           "amber-500"
  danger:            "red-500"

radii:
  default:   "rounded-xl"       # 12px — 카드/버튼 기본
  card_lg:   "rounded-2xl"      # 16px — 큰 카드만
  badge:     "rounded-full"
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

# ============================================================
# 5. i18n — 6개 언어 대응 (우리만의 제약)
# ============================================================
i18n:
  languages: ["ko", "en", "ru", "kk", "zh", "ja"]
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

---

## 변경 이력

- **2026-05-19**: 최초 작성. Legacy 모드 표준화. Premium 토큰 deprecated.

---

**Reference:**
- 원리: <https://yozm.wishket.com/magazine/detail/3736/> (Google Stitch DESIGN.md 표준)
- 우리 적용: 단독 PO + 6개 언어 + 의료 도메인 특화로 압축
