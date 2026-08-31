# 📚 healwith 문서 안내 (Documentation Index)

> **새 세션·새 사람은 여기부터.** 살아있는 문서만 추렸음. 과거 리포트·일회성 문서는 `docs/archive/`(수납함)로 옮겼고, 안 쓰는 코드는 루트 `archive/dead-code/`에 보관(삭제 아님 — 언제든 복구 가능).

## ⭐ 가장 먼저 읽을 것
| 문서 | 용도 |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | 프로젝트 지침·규칙 (AI/개발 공통 단일 소스) |
| [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) | 세션 인수인계·왜 이렇게 결정했는지 (맥락) |
| [`../DESIGN.md`](../DESIGN.md) | 디자인 헌법 (Legacy 톤) |
| [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) | 알려진 이슈·다음 작업 |

## 🎯 KHIDI (정부과제)
- [`KHIDI_중간보고_베이스.md`](./KHIDI_중간보고_베이스.md) — 8/27 중간평가 준비 (상시 기준)
- [`유치사업자_사업계획서_HEALO.md`](./유치사업자_사업계획서_HEALO.md)

## 🔒 보안·운영 (런북)
- [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) · [`SECURITY_ACTION_ITEMS.md`](./SECURITY_ACTION_ITEMS.md)
- [`ENCRYPTION_GUIDE.md`](./ENCRYPTION_GUIDE.md) · [`KEY_ROTATION_RUNBOOK.md`](./KEY_ROTATION_RUNBOOK.md) ⚠️ ENCRYPTION_KEY 백업 필수
- [`OPERATIONAL_GUIDE.md`](./OPERATIONAL_GUIDE.md) · [`CRON_STATUS.md`](./CRON_STATUS.md) · [`배포_후_5분_점검.md`](./배포_후_5분_점검.md)
- 배포: [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md) · [`VERCEL_DEPLOYMENT_CHECKLIST.md`](./VERCEL_DEPLOYMENT_CHECKLIST.md)
- `runbooks/` (관리자·배포 절차서)

## 🏷️ 리브랜딩 / 도메인 (진행 중 TODO)
- [`REBRAND_HEALWITH_PLAN.md`](./REBRAND_HEALWITH_PLAN.md) — HEALO→healwith
- [`DOMAIN_CUTOVER_healwith.md`](./DOMAIN_CUTOVER_healwith.md) — healwith.co.kr 전환 절차
- [`IMAGE_APPLY_TODO.md`](./IMAGE_APPLY_TODO.md) — 병원 이미지 적용

## 🤖 AI / RAG
- [`AI_MEDICAL_REDLINES.md`](./AI_MEDICAL_REDLINES.md) ⚠️ 의료 레드라인 8종
- [`AI_QUALITY_ASSURANCE.md`](./AI_QUALITY_ASSURANCE.md) · [`AI_PROJECT_MAP.md`](./AI_PROJECT_MAP.md) · [`AI_PRIVACY_NOTICE_DRAFT.md`](./AI_PRIVACY_NOTICE_DRAFT.md)
- 런북: [`RAG_RUNBOOK_V1.md`](./RAG_RUNBOOK_V1.md) · [`시술_자동생성_RUNBOOK.md`](./시술_자동생성_RUNBOOK.md)

## 🧭 계획·백로그
- [`PLAN_DOC_COVIEW.md`](./PLAN_DOC_COVIEW.md) · [`PLAN_RAG_REVIEW_STAMP.md`](./PLAN_RAG_REVIEW_STAMP.md) · [`이어하기_백로그.md`](./archive/이어하기_백로그.md) *(보관됨)*
- 다국어: [`다국어_DB콘텐츠_번역_계획.md`](./다국어_DB콘텐츠_번역_계획.md)

## 🧑‍💼 대표님(비개발자)용
- [`대표님_서비스_이해_매뉴얼.md`](./대표님_서비스_이해_매뉴얼.md) · [`대표님_투자자_PR_스크립트.md`](./대표님_투자자_PR_스크립트.md)
- [`QA_GUIDE_LOCAL_STAFF.md`](./QA_GUIDE_LOCAL_STAFF.md)

## 🛠️ 셋업/기타 가이드
- [`QUICK_START.md`](./QUICK_START.md) · [`EXTERNAL_SETUP_GUIDE.md`](./EXTERNAL_SETUP_GUIDE.md) · [`STORAGE_SETUP.md`](./STORAGE_SETUP.md)
- [`EMAIL_NOTIFICATION_SETUP.md`](./EMAIL_NOTIFICATION_SETUP.md) · [`YANDEX_SEO_SETUP.md`](./YANDEX_SEO_SETUP.md) · [`DATA_SOURCE_GUIDE.md`](./DATA_SOURCE_GUIDE.md)
- [`과금_API_정리.md`](./과금_API_정리.md) · [`TASK_CARD_TEMPLATES.md`](./TASK_CARD_TEMPLATES.md) · [`LEGACY_IMPORT_GUARDRAIL.md`](./LEGACY_IMPORT_GUARDRAIL.md)

---

## 🗄️ 수납함 (보관 — 평소엔 안 봐도 됨)
- **`docs/archive/`** — 과거 리포트·완료문서·일회성 감사·구현노트 (105+개). 필요할 때만 참고.
- **`archive/dead-code/`** — 더 이상 안 쓰는 옛 컴포넌트(구 Intake/Inquiry 등). 삭제 아님, 나중에 참고/복구용.
- git 히스토리에도 전부 남아있어 영구 보존됨.

**마지막 업데이트:** 2026-06-16 (리브랜딩·문서 정리)
