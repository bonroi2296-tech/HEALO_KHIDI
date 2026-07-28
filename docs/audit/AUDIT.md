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

## ♿ 접근성 최신 실측 (2026-07-27, 대상: 프로덕션 `https://healwith.co.kr` **32화면**)

**결과: critical 0 · serious 0 · moderate 0 · minor 0 / 렌더검증 실패 0.**
공개 페이지만 보던 범위를 **로그인 뒤 5개 역할까지** 넓혀 다시 잰 값. 증거 파일은 이 폴더에 커밋돼 있다(아래 표).

| 범위 | 화면 | 결과 파일 | 위반 | 미판정 |
|---|---|---|---|---|
| 공개(무인증) | 10 | `a11y-report.json` | 0 | 54 |
| 어드민 | 8 | `a11y-admin.json` | 0 | 202 |
| 코디네이터 | 6 | `a11y-coordinator.json` | 0 | 12 |
| 환자 포털 | 6 | `a11y-patient.json` | 0 | 5 |
| 해외 에이전시 | 1 | `a11y-agency.json` | 0 | 5 |
| 해외 의료기관 | 1 | `a11y-clinic.json` | 0 | 0 |
| **합계** | **32** | | **🟢 0** | 278 |

- **출처**: GitHub Actions `Audit (live)` [run 30241732070](https://github.com/bonroi2296-tech/HEALO_KHIDI/actions/runs/30241732070) (main, 2026-07-27 06:07 UTC). 위 6개 파일은 그 실행이 만든 산출물 원본 그대로다 — 손으로 고친 숫자가 아니다.
- **미판정 278건은 «통과»가 아니다.** axe 가 사진·그라데이션 위 글씨의 배경색을 계산 못 해 판정을 보류한 것. 확정 위반은 아니지만 확인된 것도 아니다(각 파일 `incompleteByRule` 참고).
- **재현**: `AUDIT_BASE_URL=https://healwith.co.kr npm run audit:a11y` (공개) / `bash scripts/audit/a11y-authed.sh` (로그인 뒤 — `e2e/.auth/<role>.json` 쿠키 필요).
- ⚠️ **이 파일들은 CI 가 자동으로 커밋해 주지 않는다.** 스캔을 다시 돌렸으면 결과 파일도 같이 커밋할 것 — 안 하면 저장소 숫자만 옛날 값으로 남는다(실제로 2026-07-27 하루 동안 그랬다).

## 베이스라인 실측 (2026-06-20, 대상: `https://healo-khidi.vercel.app` 공개 7페이지)

### 🔐 보안
- **시크릿 스캔: 0건** (하드코딩 비밀키·공개접두사 비밀키 없음 — `NEXT_PUBLIC_CRON_SECRET` 누출 #113에서 제거 + 가드 신설).
- **의존성: high 0 / critical 0** (moderate 22 — 대부분 audit 도구(lighthouse) 등 devDependencies 전이 취약점, 프로덕션 미배포). → high+ 게이트 통과.

### ♿ 접근성 (axe-core WCAG 2.1 AA, 공개 7페이지 합계)
| 규칙 | 심각도 | **Before** | **After (측정)** | 조치 |
|---|---|---|---|---|
| `button-name` | **critical** | **7** | **0** ✅ | 전역 플로팅 버튼 aria-label |
| `aria-prohibited-attr` | serious | 7 | **0** ✅ | 알림 토스트 role=region |
| `color-contrast` | serious | **161** | **0** ✅ | 브랜드 teal/emerald-600·500 → 700 다크닝 + red/teal 배지 보정(PO 옵션1) |
| **합계** | | **critical 7 / serious 168** | **🟢 critical 0 / serious 0** | |

→ **추정 아님 — axe-core 실측 before→after.** Before=프로덕션(2026-06-20). After=배포본(#117+#121) 7페이지 재측정 = **위반 0** (critical·serious·moderate·minor 전부 0).
→ 잔여 **color-contrast 7** = 못 잡은 가장자리 케이스(특정 배경 색조합). 추가 정리 시 0 가능.

### ⚡ 성능 (Lighthouse)
- 도구는 붙였으나 **이 작업 샌드박스에선 외부망/프록시 제약으로 실측 실패**(`FAILED_DOCUMENT_REQUEST`). 깨끗한 망(로컬 `next start` 또는 CI)에서 `AUDIT_BASE_URL=... npm run audit:lighthouse` 로 측정.
- 정적 분석상 알려진 부담: 병원 갤러리 원본 JPEG 3MB대(다수)·`next/image` 미적용 `<img>`·LiveKit 정적 즉시 로딩. (성능 개선은 별도 트랙)

## 색상 대비(teal) — PO 옵션1 적용 완료 (#117)
브랜드 기본색 `teal-600(#0d9488)`가 흰 배경/흰 글자에서 ≈3.3:1 로 일반 텍스트 AA(4.5:1) 미달이었음(161건). PO 승인으로 **옵션1: 텍스트/배경 teal-600·500 → `teal-700(#0f766e, ≈4.7:1)` 전수 다크닝**(89파일, hover는 teal-800 폴백, border/ring/gradient는 비텍스트라 teal-600 유지). → 실측 161→7.
- `DESIGN.md` 의 teal 톤 기준은 이 변경에 맞춰 추후 갱신 검토.
