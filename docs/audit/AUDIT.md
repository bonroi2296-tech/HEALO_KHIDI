# healwith 자동 감리 — 실측 도구 & 베이스라인

> **목적:** "AI가 코드 읽고 추정한 점수"가 아니라, **표준 도구로 측정한 재현 가능한 숫자 + 증거 파일**로 품질을 본다.
> 추정 자가진단(ISO/IEC 25010 기반)은 `docs/PROJECT_CONTEXT.md` 감리 점수표 참고. 이 문서는 **실측치**다.

## 측정 도구 (전부 `npm run audit:*`)

| 명령 | 도구 | 무엇을 측정 | 결과 파일 | CI |
|---|---|---|---|---|
| `audit:secret` | 정적 정규식 스캔 | 하드코딩 비밀키·`NEXT_PUBLIC_*SECRET` 노출 | `docs/audit/secret-scan-report.json` | ✅ 차단 |
| `audit:deps` | `npm audit` | 의존성 취약점(high/critical) | (stdout) | ✅ high+ 차단 |
| `audit:a11y` | axe-core (WCAG 2.1 A/AA) | 웹접근성 위반 | `docs/audit/a11y-report.json` | on-demand* |
| `audit:lighthouse` | Google Lighthouse | 성능·접근성·모범사례·SEO | `docs/audit/lighthouse-report.json` | on-demand* |

\* axe/lighthouse 는 **실행 중인 앱 + 브라우저**가 필요해 CI 블로킹엔 안 넣음(앱 부팅·시크릿 필요). `AUDIT_BASE_URL` 로 배포 URL/로컬 서버를 지정해 돌린다. secret·deps 는 정적/레지스트리라 매 PR 자동.

## 베이스라인 실측 (2026-06-20, 대상: `https://healo-khidi.vercel.app` 공개 7페이지)

### 🔐 보안
- **시크릿 스캔: 0건** (하드코딩 비밀키·공개접두사 비밀키 없음 — `NEXT_PUBLIC_CRON_SECRET` 누출 #113에서 제거 + 가드 신설).
- **의존성: high 0 / critical 0** (moderate 22 — 대부분 audit 도구(lighthouse) 등 devDependencies 전이 취약점, 프로덕션 미배포). → high+ 게이트 통과.

### ♿ 접근성 (axe-core WCAG 2.1 AA, 공개 7페이지 합계)
| 규칙 | 심각도 | 노드 수 | 의미 | 조치 |
|---|---|---|---|---|
| 규칙 | 심각도 | **Before** | **After (측정)** | 조치 |
|---|---|---|---|---|
| `button-name` | **critical** | **7** | **0** ✅ | 전역 플로팅 버튼 aria-label |
| `aria-prohibited-attr` | serious | 7 | **0** ✅ | 알림 토스트 role=region |
| `color-contrast` | serious | **161** | **7** (97%↓) | 브랜드 teal-600/500 → teal-700 다크닝(PO 옵션1 승인) |
| **합계** | | **critical 7 / serious 168** | **critical 0 / serious 7** | |

→ **추정 아님 — axe-core 실측 before→after.** Before=프로덕션(2026-06-20), After=동일 코드 배포본(#117) 재측정.
→ 잔여 **color-contrast 7** = 못 잡은 가장자리 케이스(특정 배경 색조합). 추가 정리 시 0 가능.

### ⚡ 성능 (Lighthouse)
- 도구는 붙였으나 **이 작업 샌드박스에선 외부망/프록시 제약으로 실측 실패**(`FAILED_DOCUMENT_REQUEST`). 깨끗한 망(로컬 `next start` 또는 CI)에서 `AUDIT_BASE_URL=... npm run audit:lighthouse` 로 측정.
- 정적 분석상 알려진 부담: 병원 갤러리 원본 JPEG 3MB대(다수)·`next/image` 미적용 `<img>`·LiveKit 정적 즉시 로딩. (성능 개선은 별도 트랙)

## 색상 대비(teal) — PO 옵션1 적용 완료 (#117)
브랜드 기본색 `teal-600(#0d9488)`가 흰 배경/흰 글자에서 ≈3.3:1 로 일반 텍스트 AA(4.5:1) 미달이었음(161건). PO 승인으로 **옵션1: 텍스트/배경 teal-600·500 → `teal-700(#0f766e, ≈4.7:1)` 전수 다크닝**(89파일, hover는 teal-800 폴백, border/ring/gradient는 비텍스트라 teal-600 유지). → 실측 161→7.
- `DESIGN.md` 의 teal 톤 기준은 이 변경에 맞춰 추후 갱신 검토.
