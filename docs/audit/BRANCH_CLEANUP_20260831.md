# 2026-08-31 가지 정리 — 지운 것의 끝 SHA (되돌리기용)

판정 근거: 5축 감사 + 반증 재검증. 셋 다 만족하는 것만 지웠다 —
  ①본판에 «없는 파일» 0건  ②내용이 다른 파일은 전부 본판이 더 나중  ③PR 이 실제로 본판에 들어감(또는 내용이 다른 번호로 들어감)

되살리려면: git push origin <SHA>:refs/heads/<가지이름>

## ⚠️ 아직 «안 지워졌다» — 이 상자에서는 지우기가 막힌다 (2026-08-31)

`git push origin --delete <가지>` 가 **HTTP 403** 으로 거절된다. 커밋 밀기·새 가지 만들기는 되는데
**가지 «삭제»만** 막힌다 — 이 클라우드 세션의 깃 자격 범위 문제이지 「할 줄 몰라서」가 아니다.
(같은 시각 커밋 푸시는 정상이었고, 깃허브 MCP 도구에도 가지 삭제 도구가 없다.)

**그래서 지우는 방법 두 가지 — 아래 16개는 판정이 끝났으니 그냥 지우면 된다**
1. **PO 가 화면에서**: https://github.com/bonroi2296-tech/HEALO_KHIDI/branches → 각 줄 오른쪽 휴지통. 1분.
2. **PO PC 로컬 세션에서** 한 줄:
   ```
   git push origin --delete ops/encrypt-legacy-pii fix/apple-signup-label fix/gate-lang-public work/verify-main claude/google-login-issue-0czhte docs/handoff-0729-auth docs/handoff-ai-guards docs/ict6-handoff feat/editor-inline-preview fix/android-comments-0830 fix/idle-logout-device-split fix/nightly-lang-skip fix/test-domain-robot-inquiries work/e2e-selfcleanup work/khidi-capture fix/ai-alert-and-smalltalk-gate
   ```

🛑 **이 목록 «밖»의 가지는 지우지 마라.** 특히 `fix/push-notification-icon`(KHIDI 증빙 132MB) ·
`claude/cloud-hospital-business-model-ft66ln`(면력 입주판 27파일) · `production`(실서비스 배포 대상) —
근거는 `docs/KNOWN_ISSUES.md` 「지우면 안 되는 가지 3개」.

| 가지 | 끝 SHA | 마지막 커밋 |
|---|---|---|
| `ops/encrypt-legacy-pii` | `4d7159d9c12d6549cafb0b3b45dfa67b9c44a60f` | 2026-08-14 |
| `fix/apple-signup-label` | `d42c9436c2946f6cc391c3adb991f271cd4e45a0` | 2026-08-05 |
| `fix/gate-lang-public` | `81f842669bd06995fb6b462d2c837d828d3e7abf` | 2026-08-06 |
| `work/verify-main` | `859cf01c01f37d42c879eed39cd08ddeefe7afbf` | 2026-08-03 |
| `claude/google-login-issue-0czhte` | `4f44b5fd809f242631fe6a35e1d09332b9035175` | 2026-08-29 |
| `docs/handoff-0729-auth` | `c2f4607037c7f6fd08a8deb624df3bffa9939d16` | 2026-07-30 |
| `docs/handoff-ai-guards` | `a87b0ca38729bc81f58d1e2d589aae7c78a2b385` | 2026-08-28 |
| `docs/ict6-handoff` | `7dd8e4b40ab6df6311724ea21bdfc2125ded1c0d` | 2026-08-25 |
| `feat/editor-inline-preview` | `ad3e938e07e20efd44b245bf3e673df65da56916` | 2026-08-03 |
| `fix/android-comments-0830` | `3020f02975d0d6e02e3dca3c42a65efad34531ff` | 2026-08-30 |
| `fix/idle-logout-device-split` | `6478e8df6aad7249061b8c655c8e9fea3af5ddef` | 2026-08-05 |
| `fix/nightly-lang-skip` | `f1100efa2ae91974220cbc87da586931ae7e2d97` | 2026-07-30 |
| `fix/test-domain-robot-inquiries` | `54d5fa2e0085474f2e682f03ded5c9247e4410a7` | 2026-08-04 |
| `work/e2e-selfcleanup` | `38a0a4ef5421e57b3e7b6355fb48ed1e70d30f35` | 2026-08-25 |
| `work/khidi-capture` | `1e7196a369c6474f350667499a8cda58afa4a1ae` | 2026-07-29 |
| `fix/ai-alert-and-smalltalk-gate` | `67fe739bf301e399e2e927ea30c5ee622841f40b` | 2026-08-28 |

---

## 2026-09-01 재검 — 그날 살아 있어서 목록에서 뺐던 가지 2개

감사 시점(2026-08-31)엔 두 가지가 «작업 중»이라 판정을 미뤘다. 하루 지나 **주인 세션이 둘 다 끊겼으므로**
(`computer_unreachable`, 2026-08-31 11:20~11:21) 「갇힌 작업이 있나」를 다시 쟀다. 방법 = **파일 해시 대조**
(스쿼시 머지라 `git branch --merged` 로는 안 잡힌다).

| 가지 | 본판과 다른 파일 | 판정 |
|---|---|---|
| `fix/google-nonce-hash` | `ios/App/CapApp-SPM/Package.swift` **1개뿐** | ✅ **살릴 것 없음.** 진짜 수리(`googleNativeSignIn.ts`)와 시험(`.test.ts`)은 본판과 **바이트까지 동일**(#1562 로 들어감). 남은 1개는 `npx cap sync ios` 가 다시 만드는 **생성 파일**이고, 다른 점은 ①`node_modules` 상대경로 깊이(PO PC 에서 만들어 역슬래시) ②`@capgo/capacitor-social-login` 항목 — 그 의존성은 **이미 본판 `package.json:109` 에 있다.** |
| `local/main-mirror` | `scripts/ppt/beyondk_style.py` 1개 | ✅ **살릴 것 없음.** 이 파일의 내용은 #1565 에서 **다시 써서** 본판에 넣었다(본판에 `글꼴박기` 5곳). 갇힌 판은 저장소에 없는 모듈을 불러 그대로 쓰면 ImportError 였다. |

🛑 **그런데 둘 다 위 삭제 목록에는 «안 넣었다».** 「살릴 게 없다」와 「지워도 된다」는 다른 판정이다.
- `fix/google-nonce-hash` — **지금 살아 있는 세션**(`session_01JkUwMrhrb6AS7j4Dam9zyP`, 신청서 #1570 작업 중)이 **이 가지에서 갈라져 나갔다.** 그쪽이 끝난 뒤에 판단할 것.
- `local/main-mirror` — 이름·커밋 제목(「작업 자동 저장」)으로 보아 **PO PC 의 자동저장 훅이 미는 거울 가지**로 보인다. 지웠을 때 그 훅이 어떻게 되는지 이 상자에서는 못 쟀다.
