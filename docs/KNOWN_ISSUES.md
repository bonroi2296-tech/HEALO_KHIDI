# HEALO KHIDI — 알려진 이슈 / 전수 QA 발견사항

> 2026-05-21 전수 QA. 빌드·테스트는 정상. 아래는 발견된 개선점 — 심각도·범위 표기.

---

## 🔴 P1 — AI 토큰 남용 방어 (PO 승인 대기 — 적용 시점 리마인드 필수)

> 2026-06-11 자체감사에서 확인 (`docs/SELF_AUDIT_2026_06_11.md`). PO 지시: **"기록해두고 적당한 시점에 계속 리마인드하면서 적용 시점을 물어봐라."**
> **리마인드 트리거: ① Gemini 유료(종량제) 전환 직전 — 이때는 필수 ② 실환자 오픈 전 ③ 다음 스프린트 계획 시.**

봇/악성 사용자가 공개 AI(챗봇 등)를 반복 호출하면 현재 구조로는 못 막음:
- 회수 제한이 메모리 기반 → Vercel 다중 인스턴스에서 분산 우회 가능 (DB 기반 `checkRateLimitPersistent`는 `inquiries/create`에만 적용)
- `generateReply.ts`에 maxOutputTokens 없음 → 호출당 비용 상한 없음
- 하루 총량 차단기 없음 → 밤새 봇 돌면 아침에야 인지

**합의된 처방 (약 1일 작업, 별도 PR):**
1. 공개 AI 엔드포인트 전부 DB 기반 레이트리밋으로 전환
2. AI 챗 maxOutputTokens 추가 (한 줄)
3. 하루 총량 차단기 — 초과 시 공개 챗봇만 "상담사 연결 안내" 모드 + PO 이메일 알림 (상담방 자막은 참가자 전용이라 유지)
4. IP당 일일 챗 상한 (예: 50회 — 실환자 영향 없는 수준)

현재는 Gemini 무료 플랜이라 금전 피해가 아닌 "한도 소진 → 실환자 서비스 중단"이 실제 리스크. **유료 전환 전 적용이 순서.**

---

## 건강 상태 (정상)
- ✅ `npx next build --webpack` 통과
- ✅ 단위 테스트 12파일 / 106개 전부 통과 (vitest exclude 글롭 수정 후)
- ✅ i18n 커버리지 ru/kz 100%
- ✅ 공개 페이지 Premium 잔재 0 (전수 확인)

---

## ✅ P1 — 클라이언트 service_role 테이블 직접 쿼리 → 서버 API 이관 (2026-06-10 완료)

`inquiries`·`chat_threads`·`chat_messages`·`consultation_sessions` 전부 service_role 전용 RLS (pg_policies 재확인됨).
`/api/portal/*` 서버 API 신설 (`requirePortalAuth` — staff = app_metadata.role ∈ admin/coordinator/doctor) 후 일괄 이관:

| 파일 | 상태 | 경유 API |
|---|---|---|
| `app/admin/consultations/page.jsx` (picker) | ✅ | `/api/admin/inquiries/picker` |
| `app/coordinator/inbox/page.jsx` | ✅ | `/api/portal/inbox` (이름 복호화+마스킹) |
| `app/patient/messages/MessagesClient.jsx` | ✅ | `/api/portal/threads`·`…/[id]/messages` (realtime→5초 폴링) |
| `app/coordinator/messages/CoordinatorMessagesClient.jsx` | ✅ | 동일 + `PATCH /api/portal/threads/[id]` (상태변경) |
| `components/healo/NotificationBadge.jsx` | ✅ | `/api/portal/badge` |
| `components/healo/EmergencyButton.jsx` | ✅ | `/api/portal/emergency` |

**미검증:** 코드·빌드·단위테스트(106개)는 통과했으나 **실제 코디/환자 계정으로 화면 동작은 미확인** (portal 메뉴 미연결 상태 동일). portal 활성화 때 실계정으로 1회 점검 필요.

---

## 🟡 P2 — ESLint 가 TS 파일 파싱 못 함 (설정 갭)

`eslint .` 실행 시 .ts/.tsx 에서 "Parsing error: Unexpected token interface/:" 다수 → eslint flat config 에 TS 파서 미설정. **실제 코드 버그 아님**(빌드는 통과). 다만 lint가 TS 파일 품질검사를 못 함.
**권장:** eslint TS 파서 설정 보강 → CI lint 실효성 확보.

## 🟢 P3 — 자잘한 미사용 변수
일부 파일에 unused var (colorClass, w, today, catch(e) 등). 빌드 영향 없음. 정리 시 lint-clean.

---

## 예방 (적용됨)
- `CLAUDE.md` 출시 전 self-QA 체크리스트 → service_role 테이블 client 직접 쿼리 금지 명시 (신규 코드 재발 방지)
