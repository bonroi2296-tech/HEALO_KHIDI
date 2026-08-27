> 🗄 **보관됨 (2026-08-27).** 이 문서는 **끝난 작업의 계획서**다. 아래 5단계 중 1~4단계는 완료됐고
> (`*Premium` 파일·`designMode.js`·`components/healo/Nav·Footer` 전부 삭제됨), 5단계 잔여물은
> `app/styles/healo-tokens.css` 와 `components/healo/Primitives.jsx` 둘뿐이며 별도 세션이 철거 중이다.
> **읽는 사람에게**: 여기 적힌 파일 경로·단계는 «그때의 지도»다. 되살릴 근거로 쓰지 마라.
> 지금 유효한 디자인 규칙은 `DESIGN.md` 하나뿐이다.

# 프리미엄 디자인 폐기 — 범위·단계 계획 (2026-06-23)

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
