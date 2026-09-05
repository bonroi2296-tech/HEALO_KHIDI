# 지운 작업본 복원 목록 (2026-09-05)

> PO 지시(「안 본 게 왜 있어 다 봐」)로 원격 작업본을 전수 판정한 뒤 지운 것들이다.
> **여기 SHA 가 있으면 되돌릴 수 있다** — `git branch <이름> <SHA>` 로 살린다.
> 판정법과 부류별 결과는 `docs/KNOWN_ISSUES.md` 「작업본 전수 감사」 항목에 있다.

| 작업본 | 마지막 커밋 SHA | 추가한 줄 | 본판에 없던 줄 | 마지막 |
|---|---|---|---|---|
| `claude/elated-meninsky-f3fc9b` | `48746ab82240` | 249 | 107 | 08-27 |
| `claude/google-login-issue-0czhte` | `4f44b5fd809f` | 93 | 82 | 08-29 |
| `claude/handoff-0827` | `0be1f0e48fb9` | 88 | 1 | 08-27 |
| `claude/header-whitespace-issue-cwju0h` | `ad298267eb72` | 67 | 2 | 08-04 |
| `claude/healwith-geo-aio-seo-audit-rrbqj9` | `1ea68d574bd4` | 115 | 112 | 09-01 |
| `docs/expense-receipts-index-0904` | `4345552c40ba` | 162 | 65 | 09-04 |
| `docs/fix-43-preconsult` | `2573ee0a0d16` | 9 | 9 | 08-18 |
| `docs/handoff-0803-deploy` | `6c144ea80b0b` | 72 | 33 | 08-03 |
| `docs/handoff-0807-store-gates` | `b058710a1771` | 88 | 1 | 08-07 |
| `docs/handoff-0814-apps` | `e42dc3a9956b` | 91 | 7 | 08-14 |
| `docs/handoff-0901` | `c8692d0414e4` | 103 | 22 | 09-02 |
| `docs/handoff-ai-guards` | `a87b0ca38729` | 95 | 1 | 08-28 |
| `docs/handoff-premium-doc-sweep` | `824e66016b7b` | 114 | 1 | 08-27 |
| `docs/handoff-seo-kz` | `29eb5038cc02` | 93 | 57 | 08-20 |
| `docs/handoff-zerorow` | `0cfa526c0ead` | 23 | 23 | 08-20 |
| `docs/ict6-handoff` | `7dd8e4b40ab6` | 73 | 4 | 08-25 |
| `docs/inquiry-alert-outage-0904` | `9d96b4f71e21` | 56 | 8 | 09-04 |
| `feat/rag-cancer-info` | `ce9b8fc488c3` | 2428 | 1480 | 08-28 |
| `feat/upload-audio-text` | `61bab927cd9c` | 170 | 22 | 09-02 |
| `fix/ai-alert-and-smalltalk-gate` | `67fe739bf301` | 293 | 32 | 08-28 |
| `fix/ai-quality-alert-and-smalltalk` | `55aeb7b9253d` | 2476 | 1482 | 08-28 |
| `fix/android-comments-0830` | `3020f02975d0` | 85 | 21 | 08-30 |
| `fix/gate-lang-public` | `81f842669bd0` | 10 | 4 | 08-06 |
| `fix/idle-logout-device-split` | `6478e8df6aad` | 233 | 9 | 08-05 |
| `fix/mobile-notif-and-drawer` | `ecbddad0ff85` | 20 | 14 | 08-04 |
| `fix/stale-android-comments-0830` | `ec4eb8f2ea30` | 177 | 5 | 08-30 |
| `fix/sweep-anon-key-0904b` | `bb3a6cdc7fda` | 305 | 6 | 09-04 |
| `fix/test-domain-robot-inquiries` | `54d5fa2e0085` | 78 | 2 | 08-04 |
| `local/main-mirror` | `ff0ac91d1bd1` | 17 | 7 | 08-31 |
| `work/cost-estimate-honest` | `acb2f477913f` | 2819 | 8 | 08-21 |
| `work/e2e-selfcleanup` | `38a0a4ef5421` | 27 | 2 | 08-25 |
| `work/patient-bo` | `32f89fa0d170` | 323 | 134 | 08-18 |
| `work/upload-size-limit` | `12aaac99b0c0` | 838 | 96 | 08-03 |
| `work/verify-main` | `859cf01c01f3` | 1 | 1 | 08-03 |

## 2차 — 「공통 조상이 없어」 1차에서 조용히 빠졌던 12개

⚠️ 1차 판정 스크립트가 `git merge-base` 가 빈 값이면 그냥 건너뛰었다. 이 12개가 거기 걸려
**「전수 판정」이 전수가 아니었다**(PO 되물음으로 발견). 본판과 직접 비교해 다시 쟀다.

**판정**: 전부 2026-07-28~31 의 스냅샷이다. 미반영이 5,500~6,900줄로 크지만 파일 분포가
거의 같아 «본판이 두 달간 바뀐 차이»이지 살릴 작업이 아니다. 「본판에 없는 파일」 36~66개도
표본을 확인하니 전부 **정상 신청서로 지워진 것**이었다(#1465·#1336·#1541·#1449 등).
중간·최종보고서 두 건은 **PO 결정(2026-08-20)으로 산출물 관리에서 뺀 것**이다(`e2a9244f`).

| 작업본 | 마지막 커밋 SHA | 마지막 |
|---|---|---|
| `claude/cloud-hospital-business-model-ft66ln` | `9254dac8252d` | 2026-07-31 |
| `claude/multi-session-work-issues-s9evvw` | `25b4a652d3cd` | 2026-07-29 |
| `docs/ga4-console-verify` | `8341117118f7` | 2026-07-31 |
| `docs/handoff-0729-auth` | `c2f4607037c7` | 2026-07-30 |
| `docs/po-pref-0728` | `8b5789fe156c` | 2026-07-28 |
| `feat/advanced-treatments` | `6cc8c08942db` | 2026-07-29 |
| `fix/nightly-lang-skip` | `f1100efa2ae9` | 2026-07-30 |
| `fix/prod-build-lock` | `6dba75995021` | 2026-07-28 |
| `work/app-install-link` | `089e78ef6da3` | 2026-07-30 |
| `work/appstore-tablet-shots` | `b3495b68f5d0` | 2026-07-29 |
| `work/handoff-0729-cmd` | `559305c7b1a7` | 2026-07-29 |
| `work/khidi-capture` | `1e7196a369c6` | 2026-07-29 |
