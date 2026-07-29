# 프리뷰·화면 확인 팁

> **트리거:** 프리뷰·스크린샷·브라우저·화면 확인·로그인 뒤 화면·백오피스 눈으로 보기
> **원래 위치:** `CLAUDE.md` 「프리뷰 팁」 (2026-07-28 이관)

---

> ⚠️ 2026-07-27 정정: 여기 있던 `preview_screenshot`·`preview_eval` 은 **존재하지 않는 도구 이름**이었다.
> 없는 도구를 쓰라는 규칙은 안 지켜지는 게 아니라 **엉뚱한 시도를 하게 만든다.**

- 브라우저 조작은 `preview_start`(dev 서버) → `read_page`(구조·텍스트) → `javascript_tool`(계산된 스타일 등) 순으로.
  스크린샷은 `computer{action:"screenshot"}` — 다만 **텍스트·구조 확인은 `read_page` 가 더 빠르고 정확**하다.
- 시각 확인 필요 시 Vercel preview URL 사용자에게 제공.

## 로그인 뒤 화면 (2026-07-28 정정 — 이전 서술이 도구 현실보다 낡았다)

**옛 서술(원문 그대로 보존):**

> - **로그인 뒤 화면은 로컬에서 못 연다** (미들웨어 `proxy.ts` 가 세션 없으면 `/login` 으로 보냄).
>   백오피스·환자포털을 눈으로 봐야 하면 **Vercel preview URL 을 PO 에게 주고 확인받는다** — 로컬에서 본 척하지 말 것.

**실제:** 브라우저로 그냥 열면 못 보는 게 맞다(미들웨어 `proxy.ts` 가 세션 없으면 `/login` 으로 보냄). 하지만 **자동 검증(Playwright)에는 역할별 로그인 세션을 파일로 저장해 두는 장치가 이미 있다** — `e2e/auth.setup.ts` 가 역할당 1회만 로그인하고 `storageState` 로 쿠키를 저장한다.

- **세션 저장이 되는 역할(5개):** `patient` · `admin` · `coordinator` · `agency` · `clinic`
  — 각각 `E2E_TEST_USER_EMAIL` · `E2E_ADMIN_EMAIL` · `E2E_COORDINATOR_EMAIL` · `E2E_AGENCY_EMAIL` · `E2E_CLINIC_EMAIL` 이 설정된 경우에만. 미설정 역할은 스킵된다.
- **🕳 구멍: `hospital`(국내병원) 역할은 아예 목록에 없다.** 그래서 `/hospital/profile`·`/hospital/treatments` 는 **어떤 방법으로도 자동 확인이 안 된다.** 2026-07-28 핸드오프의 "계정 접근 불가로 못 봄" 이 바로 이것 — 계정을 몰라서가 아니라 **애초에 목록에 없어서**다.
- `E2E_*` 키는 `.env.example` 에도 없어서 새로 세팅하는 사람이 존재 자체를 모른다.

**그래서 지금 규칙:**
1. 백오피스 화면을 확인해야 하면 **먼저 해당 역할의 E2E 세션으로 여는 길이 있는지 본다**(위 5개면 있다).
2. 없으면(= `hospital`) **로컬에서 본 척하지 말고** Vercel preview URL 을 PO 에게 주고 확인받는다.
3. 어느 쪽도 못 했으면 **"직접 동작 검증 못 함"이라고 명시**한다.
