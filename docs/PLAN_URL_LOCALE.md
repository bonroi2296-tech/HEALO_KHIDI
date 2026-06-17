# URL 언어화(locale-in-path) 마이그레이션 계획

> 목표: `/treatments` → `/en/treatments`·`/ru/treatments` … 6개 언어 URL + `hreflang` + 언어별 메타데이터.
> 정석 SEO 구조(Airbnb·Booking식). **새 도메인 healwith.co.kr이 검색엔진에 색인되기 전에 끝낸다** — 색인 후 구조 변경 시 301 리다이렉트·순위 손실 지옥. 새 도메인=색인 이력 0이라 지금이 적기.
> PO 결정(2026-06-17): 범위 **전체**(공개+내부 도구). 단 공개 페이지 먼저(SEO 실익), 내부 도구는 마지막(실익 적음 — 4단계 진입 전 재검토).

## 현재 상태 (코드만 봐선 안 보이는 것)
- 언어 출처 = **쿠키**. `src/lib/i18n/LangContext.jsx`(`useLang()`), `getLangCodeFromCookie()`. SSR/기본 = `en`.
- URL에 언어 없음. 미들웨어 없음.
- `app/layout.jsx`: `<html lang="en">` 하드코딩, metadata `alternates` 1개, `metadataBase`=`NEXT_PUBLIC_SITE_URL`.
- `app/sitemap.js`·`robots.js`: 평면 URL, baseUrl=env.
- 활성 언어 6개: ko·en·ru·kz·zh·ja. 폴백 lang→en→ko.
- 콘텐츠 다국어 테이블은 이미 있음(`COPY[lang]`, `l()` 패턴, `src/lib/i18n/index.js`). **언어 출처만 쿠키→URL로 바꾸면 본문은 그대로 동작.**

## 결정 사항 (락)
- **패턴**: Next.js App Router 표준 `app/[lang]/...` 동적 세그먼트 + `generateStaticParams`(6 locale).
- **URL 정책**: 항상 prefix(`/en/...` 포함). default도 prefix → hreflang 정합·redirect 단순.
- **언어 감지**: middleware — prefix 없으면 쿠키 → `Accept-Language` → `en` 순으로 골라 308 redirect. prefix 있으면 통과 + 쿠키 갱신.
- **내부 도구**(admin/patient/coordinator/partner): URL은 언어화하되 **UI는 한국어 단일 유지**(번역 안 함). prefix만 입힘. ← 실익 적어 마지막 단계, 진입 전 재검토.

## 단계 (각 단계 끝마다 `next build --webpack` + 누출 e2e 초록 확인)

- **0. 토대 (additive·무위험)** ← 지금
  - `src/lib/i18n/config.js`: `LOCALES`, `DEFAULT_LOCALE`, `isLocale()`.
  - locale-aware `Link`/`href` 헬퍼(현재 언어 prefix 자동).
  - 아직 아무 라우트도 안 움직임 → 사이트 영향 0.
- **1. 뼈대 + 1개 섹션 증명**
  - `middleware.ts`(감지·redirect). `app/[lang]/layout.jsx`(`<html lang>`, LangProvider를 param 기반으로). `useLang`이 param 우선·쿠키 폴백 되게.
  - treatments 한 섹션만 `app/[lang]/treatments`로 옮겨 end-to-end 검증.
- **2. 공개 페이지 전체 이동**
  - 홈·hospitals·telemedicine·care-journey·faq·about·contact·privacy·terms·inquiry·search·visa·education·specialties 등 `app/[lang]/`로.
  - **모든 내부 `<Link>`/`router.push` 언어 유지**(헬퍼 적용). 게스트 초대링크·인증 redirect 점검.
- **3. SEO 마감**
  - 페이지별 `generateMetadata({params})`: 언어별 title/description + `alternates.languages`(hreflang 6) + canonical.
  - `sitemap.js`: 라우트 × 6 locale + hreflang. `robots.js` 점검. `layout` 메타 정리.
  - ← **탭 제목 한국어 문제 여기서 해결**(언어별로 맞춰짐).
- **4. 내부 도구 이동** (진입 전 재검토 — 실익 낮음)
  - admin/patient/coordinator/partner를 `[lang]` 아래로(UI는 ko 유지). 인증·미들웨어 매처 점검.
- **5. 가드**
  - 누출 e2e ROUTES **자동발견**화(app 폴더 스캔 → 새 페이지 자동 포함). dynamic segment 처리.
  - `hreflang`/canonical 정합 검사 추가 검토.

## 위험·주의
- **내부 링크 누락 = 클릭 시 언어 풀림.** 헬퍼로 일괄 처리 + grep 점검.
- 게스트 상담 초대링크(`/consultation/[id]`)·survey 토큰·인증 콜백 = 언어 prefix 정책 명확히(아마 prefix 없이 default 처리).
- 도메인 컷오버(`DOMAIN_CUTOVER_healwith.md`)의 SEO 제출 단계는 **이 개편 후** 실행.
- 미들웨어 매처에서 `/_next`·`/api`·정적파일·`/immune` 등 제외.
