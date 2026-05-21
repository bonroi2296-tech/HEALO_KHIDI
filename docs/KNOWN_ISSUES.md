# HEALO KHIDI — 알려진 이슈 / 전수 QA 발견사항

> 2026-05-21 전수 QA. 빌드·테스트는 정상. 아래는 발견된 개선점 — 심각도·범위 표기.

## 건강 상태 (정상)
- ✅ `npx next build --webpack` 통과
- ✅ 단위 테스트 12파일 / 106개 전부 통과 (vitest exclude 글롭 수정 후)
- ✅ i18n 커버리지 ru/kz 100%
- ✅ 공개 페이지 Premium 잔재 0 (전수 확인)

---

## 🔴 P1 — 클라이언트가 service_role 전용 테이블 직접 쿼리 (RLS로 빈 데이터)

`inquiries`·`chat_threads`·`consultation_sessions` 는 RLS상 **service_role(서버)만 읽기 가능**.
아래는 브라우저 client로 직접 쿼리 → **항상 0건 반환** (기능 작동 안 함). 서버 API 경유로 바꿔야 함.

| 파일 | 테이블 | 상태 | 비고 |
|---|---|---|---|
| `app/admin/consultations/page.jsx` (picker) | inquiries | ✅ **수정 완료** | `/api/admin/inquiries/picker` 서버 API로 교체 |
| `app/coordinator/inbox/page.jsx` | inquiries | ⬜ 미수정 | **메뉴 미연결(orphan)** — 코디 portal 활성화 시 서버 API 필요 |
| `app/patient/messages/MessagesClient.jsx` | chat_threads | ⬜ 미수정 | 환자 메시지 — portal 활성화 시 필요 |
| `app/coordinator/messages/CoordinatorMessagesClient.jsx` | chat_threads | ⬜ 미수정 | 코디 메시지 |
| `components/healo/NotificationBadge.jsx` | chat_threads, consultation_sessions | ⬜ 미수정 | 알림 뱃지 |
| `components/healo/EmergencyButton.jsx` | chat_threads | ⬜ 미수정 | |

**권장:** 환자/코디 portal 본격 사용 전, 위 데이터 조회를 서버 API(역할 인증 + 필요시 복호화)로 일괄 이관. 별도 집중 작업(반나절~1일).

---

## 🟡 P2 — ESLint 가 TS 파일 파싱 못 함 (설정 갭)

`eslint .` 실행 시 .ts/.tsx 에서 "Parsing error: Unexpected token interface/:" 다수 → eslint flat config 에 TS 파서 미설정. **실제 코드 버그 아님**(빌드는 통과). 다만 lint가 TS 파일 품질검사를 못 함.
**권장:** eslint TS 파서 설정 보강 → CI lint 실효성 확보.

## 🟢 P3 — 자잘한 미사용 변수
일부 파일에 unused var (colorClass, w, today, catch(e) 등). 빌드 영향 없음. 정리 시 lint-clean.

---

## 예방 (적용됨)
- `CLAUDE.md` 출시 전 self-QA 체크리스트 → service_role 테이블 client 직접 쿼리 금지 명시 (신규 코드 재발 방지)
