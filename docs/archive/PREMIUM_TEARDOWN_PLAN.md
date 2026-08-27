# 프리미엄 디자인 폐기 — 범위·단계 계획 (2026-06-23) 〔완료·보관〕

> # ✅ 2026-08-27 철거 완료 — 이 문서는 보관본이다
> cream/ink/gold 토큰은 **코드에 한 글자도 남아 있지 않다.** 아래는 그때의 계획·경위 기록일
> 뿐이니 새 작업의 근거로 삼지 마라. 지금 유효한 디자인 규칙은 `DESIGN.md` 하나다.
>
> 마무리로 한 것: 알림·달력 화면 기본 톤 전환 → `app/styles/healo-tokens.css` ·
> `components/healo/Primitives.jsx` 삭제 → `app/layout.jsx` 의 import 제거 →
> 톤과 무관한 전역 규칙은 `src/index.css` 로 이사.

> ## 📍 (경위) 2026-08-27 작업 도중 기록 — 남은 건 화면 «한 개»뿐
>
> | 단계 | 상태 |
> |---|---|
> | 1~4 (죽은 코드·이중 헤더·토글 고정) | ✅ 끝 |
> | 5 (고아 컴포넌트·디자인시스템 제거) | 🔄 **거의 끝** — 아래 셋만 남음 |
>
> **왜 아직 안 끝났나:** 이 계획서가 「폐기」를 선언한 뒤에도 `app/styles/healo-tokens.css` 가
> `app/layout.jsx` 에서 전 페이지에 실리고 있었다. 그래서 새 화면을 만들 때마다 그 파일이
> 본보기가 돼 폐기된 톤이 되살아났다 (2026-08-26 PO 지적:
> *«왜 아직도 예전에 테스트 했던 톤이 남아있는거야»*).
>
> **2026-08-27 에 한 것**
> - `app/notifications/page.jsx` → 기본 톤(teal)으로 전환 완료. `var(--)` 참조 0건.
> - `healo-tokens.css` 토큰 101 → 22개. 톤과 무관한 규칙(포털 본문 여백 `.healo-portal-offset` ·
>   `.healo-safe-bottom` · 가로 스크롤 방지 · tap highlight · 입력칸 16px · 프린트)은
>   **`src/index.css` 로 이사**했다. 파일 첫 줄의 "Direction: D. Premium" 헤더도 제거.
> - 곁가지 1건: `app/patient/visa/applications` 의 카드 소제목이 전역 h2 규칙(clamp 36~64px
>   세리프)에 얹혀 거대하게 그려지고 있었다 → 크기를 클래스로 못 박아 정상화.
>
> **남은 것 (다른 세션이 진행 중 — 중복 작업 금지)**
> 1. `app/patient/calendar/CalendarClient.jsx` 를 기본 톤으로 (토큰 참조 48곳)
> 2. 그게 끝나면 `app/styles/healo-tokens.css` + `app/layout.jsx` 의 import 한 줄 삭제
> 3. 같이 `components/healo/Primitives.jsx` 삭제 (달력이 유일한 사용처)
>
> **이 세 개가 끝나면 이 문서를 `docs/archive/` 로 옮겨라.** 그게 철거 완료 신호다.
> (다른 문서의 premium 언급은 «이력»이라 남긴다 — POSTMORTEMS·KNOWN_ISSUES 등은 건드리지 마라.)


> PO 결정: 프리미엄(A/B 실험용) 안 씀 → 단일 디자인(legacy)으로 통일. 이 문서는 폐기 범위·영향·단계안.
> 근거: `src/lib/designMode.js`(토글), `components/healo/`(프리미엄 디자인시스템), `PageShell`(프리미엄 Nav 래퍼).

## 진단 — 지금 뭐가 깨졌나
**이중 헤더 = `PageShell`(프리미엄 Nav) + `ClientShell`(마케팅 Header)이 같은 페이지에 둘 다 렌더.**

| 상태 | URL |
|---|---|
| 상시 이중(토글 무관, 하드코딩) | `/patient/messages`, `/patient/calendar` |
| 기본(legacy) 상태에서 이중 | `/patient`, `/patient/symptoms`, `/patient/rebooking`, `/patient/documents` |

## 폐기 가능성 — 안전한가
- ✅ **legacy는 자립한다.** 토글 분기 21개 페이지 전부 legacy 전용 클라이언트가 실재 → 프리미엄 지워도 **빈 화면 안 됨**.
- ✅ `components/healo/`에서 legacy가 진짜 의존하는 건 **`EmergencyButton`(SOS) 하나** + `Photos.js`(데이터). 나머지(Nav·Footer·Primitives·Notification*·Skeleton·PageShell)는 전부 프리미엄 전용.
- ⚠️ **예외 2곳(리워크 필요):** `MessagesClient`·`CalendarClient`는 legacy 버전이 없고 `Primitives`에 직접 의존 → PageShell만 벗기면 깨짐. 표준 컴포넌트로 옮긴 뒤 정리.
- ⚠️ **시각 변화 큼:** `/treatments`(프리미엄 hub→legacy 목록), 홈/병원 등 프리미엄 자체 Nav 쓰던 곳은 헤더 톤이 마케팅 teal로 바뀜 → 프리뷰 검토 필요.
- 🧹 죽은 코드: `components/healo/NotificationBadge.jsx`(아무도 import 안 함), `DesignToggle`(항상 null).

## 단계안 (작고 안전한 것부터)
1. **죽은 코드 제거(위험 0):** `NotificationBadge.jsx` 삭제, layout의 `DesignToggle` import 정리.
2. **상시 이중 헤더 2곳(체감 큼·범위 좁음):** `MessagesClient`·`CalendarClient`에서 `<PageShell>` 래퍼 제거.
3. **legacy 분기 PageShell 4곳:** `patient/{page,symptoms,rebooking,documents}/page.jsx` legacy 분기에서 PageShell 제거 → 환자 영역 이중 헤더 전부 해소.
4. **토글 legacy 고정:** 21개 page.jsx의 premium 분기·import 삭제(legacy만). `/treatments` 별도 토글도 legacy 고정 — **단 시각 바뀌니 PO 프리뷰 확인 후.**
5. **고아 컴포넌트·디자인시스템 제거:** `*Premium` 16개 + terms/privacy/medical-disclaimer premium 3개 + healo/의 Nav·Footer·Primitives·Notification*·Skeleton·PageShell 삭제. `EmergencyButton`·`Photos.js` 보존. ClientShell의 premium 로직·`designMode.js` 제거.

**검증(단계마다):** `npx next build --webpack` + `npm run check:content` + 프리뷰에서 `/patient`·`/patient/messages`·`/patient/calendar`·`/`·`/hospitals`·`/treatments` 헤더 1개씩만 뜨는지.

> **1~3단계만으로 PO가 겪는 이중 헤더는 사라진다**(작고 안전). 4~5단계는 프리미엄 잔재 정리(큼·프리뷰 검토). 분리 실행 권장.
