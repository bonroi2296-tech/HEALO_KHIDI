# 한글 문서(HWP·HWPX) 만들기 — 파이썬 스크립트 짜기 전에 이 문서를 먼저 봐라

> **트리거**: 보고서·공문·계획서·회의록·서식·계약서를 hwp/hwpx 로 만들거나 고칠 때.
> **핵심 한 줄**: **도구가 두 개 붙어 있다(`kordoc`·`hwpx`). 채우기 스크립트를 새로 짜지 마라.**
> 어기면 훅(`.claude/hooks/doc-tooling-guard.mjs`)이 **막는다**. 문서로 부탁하는 게 아니라 기계가 막는다.

---

## 0. 왜 이 문서가 생겼나 (2026-08-25 PO 지적)

> *"kordoc 도 맨날 제대로 안쓰는거 같고 내가 얘기하면 아 맞아요 그거 있죵 ㅎ ㅈㅅ 이러던데 왜 자꾸 그러는거야"*

실측해보니 **게으름이 아니라 설정 부재**였다. 저장소 전체를 뒤졌을 때 kordoc 를 언급한 줄이 **0건**이었다(회의록 스킬 `~/.claude/skills/minutes/SKILL.md` 에만 있었고, 그건 회의록 작업에서만 읽힌다). 그래서 회의록 밖의 문서 작업에서는 매 세션 처음부터 파이썬을 짰다(`scripts/hwp/fill_*.py` 3개 = 12만 자. 같은 일을 마크다운 한 장이 한다).

**그리고 더 나쁜 게 있었다.** `scripts/md2docx.cjs` 주석에 **「kordoc 은 파싱·양식fill 전용이라 md→hwpx 생성 불가」**라고 박혀 있었다. 3.1.1 시절엔 맞는 말이었지만 그 뒤로 틀린 말이 됐고, 이후 세션들은 그 한 줄을 읽고 **「마크다운 → 워드 → 한글에서 수동 저장」이라는 우회로**를 탔다. 낡은 단정 한 줄이 도구 하나를 통째로 묻었다.

거기에 **붙어 있던 kordoc 이 3.1.1 이라 읽기 도구 8개만 보였다.** 생성·편집·렌더가 아예 없는 판이었다. 8/25 에 `kordoc@latest`(4.9.2, 15개)로 고정하고 `hwpx`(python-hwpx-automation, 40여 개)를 새로 붙였다.

---

## 1. 도구가 둘인 이유 — 잡는 게 서로 다르다

같은 보고서를 두 도구로 검사했더니 **각자 다른 결함을 잡았다**(8/25 실측). 하나만 쓰면 놓친다.

| | **kordoc** | **hwpx** (python-hwpx-automation) |
|---|---|---|
| 강점 | 문서를 **만들고 고치고 읽는** 일 전반 | **정부 문서 품질 검사**와 특수 조판 |
| 파싱 | HWP3~5·HWPX·PDF·XLSX·DOCX·이미지 OCR | HWPX 중심 |
| 만들기 | `generate_document` 마크다운 → HWPX | `create_document_from_plan` 구조 지정형 |
| 검사 | `lint` 표기법(마크다운 기준) | `inspect_official_document_style` **문서 실물 기준** |
| 못 잡던 것 | 「끝.」 누락을 못 잡았다 | ← 이걸 잡았다 |

**kordoc 에 없어서 `hwpx` 를 붙인 것들** (전부 정부과제 실무용):

- `inspect_reference_consistency` — **붙임 참조와 표·그림 번호 연속성** 검사 ([[report-audit-script-first]] 의 그 결함)
- `add_tracked_edit` — **변경 추적(redline)** 작성. 진흥원 보완요청 대응
- `mail_merge` — 명부(CSV·XLSX)로 **N부 일괄 생성**. 병원 협조요청서 다건 발송
- `add_toc`·`add_cross_reference`·`verify_toc` — 한컴 네이티브 차례·상호참조·**쪽번호 검증**
- `check_seal_compliance` — 직인이 발신명의 끝글자에 규칙대로 찍혔나 pass/fail
- `add_memo` — 본문·표 셀에 검토 메모
- `build_organization_chart`·`build_meeting_nameplates`·`build_image_grid` — 조직도·회의 명패·사진 그리드
- `repair_hwpx` — 깨진 hwpx 복구
- `inspect_document_quality` — 제안서 품질 루브릭 점검

---

## 2. 하려는 일 → 쓸 도구

| 하려는 일 | 도구 |
|---|---|
| 보고서·공문 **새로 만들기** | `kordoc generate_document` (표지·목차·결재란·쪽번호 자동) |
| 기존 문서 **글자만 고치기** | `kordoc patch_document` (원본 서식 **1바이트도 안 건드림**) |
| 빈칸 **서식 채우기** | `kordoc fill_form` (테두리·병합 100% 유지) |
| 눈으로 **확인** | `kordoc render_document`(SVG) 또는 `hwpx render_preview`(PNG) |
| 한글이 **받아주나** | `kordoc validate` |
| **공문서 규정** 검사 | `hwpx inspect_official_document_style` (⚠️ 오탐 많다. 아래 참고) |
| **붙임·표 번호** 정합성 | `hwpx inspect_reference_consistency` |
| **변경 추적**본 만들기 | `hwpx add_tracked_edit` |
| **여러 부** 만들기 | `hwpx mail_merge` |
| 도장 찍기 | `kordoc place_seal` → `hwpx check_seal_compliance` 로 검사 |
| 개인정보 지우기 | `kordoc redact_document` (**결과는 사람이 최종 확인**) |
| 신구대조표 | `kordoc compare_documents` 또는 `hwpx doc_diff` |
| 진흥원 양식 **표 서식 베끼기** | `kordoc extract_profile` → `generate --profile` |

---

## 2-1. ⚠️ 개조식 위계는 «들여쓰기 칸 수»로 정해진다 (2026-08-26 실측)

`kordoc generate` 는 **들여쓴 칸 수로 단계를 센다. 「가.」·「1)」 같은 글머리 기호는 보지 않는다.**
안 들여쓰면 3단계가 1단계로 튀어 올라 제목과 섞인다.

같은 내용을 표기만 바꿔 세 번 만들어 본 결과다.

| 원고에 이렇게 쓰면 | 문서에 이렇게 나온다 |
|---|---|
| `가.` 아래 **네 칸 들여쓴** `1)` | □ → ○ → `-`  ✅ 제대로 |
| `가.` 아래 **안 들여쓴** `1)` | □ → ○ → □  🔴 3단계가 1단계로 |
| 마크다운 중첩 목록(`- ` / `  - `) | □ → □ → ○  🔴 1·2단계가 붙는다 |

**그러니 이렇게 써라.**

```markdown
## 1. 마당

가. 둘째 수준

    1) 셋째 수준
```

⚠️ 그리고 **`kordoc validate` 통과는 「한글이 연다」를 뜻하지 않는다.** 구조만 본다.
정말 열리는지는 `mcp__hwpx__repair_hwpx` 의 openSafety 나 `scripts/hwp/hwp_check.ps1` 로 확인해라.

## 3. 정부과제 보고서 기본 흐름

```bash
npx -y kordoc@latest generate 보고서.md -o 보고서.hwpx --preset 개조식 --org "본로이" --approval "담당,대표"
```

- 프리셋: `기안문`·`보고서`·`계획서`·`통지`·`회의록`·**`개조식`**(표지·목차·장헤더 자동)·`보도자료`
- **PO 문체가 개조식이다**([[po-report-writing-style]]). 정부과제 보고서는 `--preset 개조식` 이 사실상 기본값이다.
- 2단계 말머리: 기안문·공고문은 `--bullet2 ㅇ`, 보고서 양식은 `--bullet2 ○`.

만든 뒤 **검사 세 줄을 반드시 돌려라.** 건너뛰면 「만들었는데 한글이 안 열어주는」·「붙임 번호가 어긋난」 사고가 그대로 재현된다.

```bash
npx -y kordoc@latest validate 보고서.hwpx && npx -y kordoc@latest lint 보고서.md
```

그다음 `hwpx` 도구로 `inspect_official_document_style` 과 `inspect_reference_consistency` 를 돌린다.
kordoc 검수를 통과해도 여기서 걸리는 게 있다(8/25 실측: 「끝.」 누락).

**⚠️ 다만 이 검사는 오탐이 많다. 「고쳐라」로 읽지 마라.** 2026-08-26 병렬 세션 실측: 중간평가 보고서에서 **16건이 나왔는데 고칠 것은 0건**이었다.
「끝.」 누락·「붙임 19」·「주관기관 : 」 공백이 **전부 진흥원이 준 서식 원본에 그렇게 되어 있었다.** 우리가 고치면 오히려 제출 양식에서 벗어난다.
→ **판정 순서: ①검사 결과가 나오면 ②그 항목이 «원본 양식에도 그런지» 먼저 열어 대조하고 ③원본에 없는 것만 고쳐라.**
공문(우리가 쓰는 기안문)이면 검사 결과가 대체로 맞고, **남이 준 서식을 채우는 문서면 원본이 기준**이다.

---

## 4. 눈으로 확인 (필수)

```bash
npx -y kordoc@latest render 보고서.hwpx -o 보고서.svg
```

PO 는 PNG 를 본다. SVG → PNG 는 `scripts/ppt/deck_to_png.py` 와 같은 방식이거나 `hwpx render_preview` 를 쓴다.

**「생성 성공 = 제대로 나옴」이 아니다.** 표가 밀렸는지·글자가 잘렸는지는 렌더로만 보인다.

---

## 5. 함정 (전부 8/25 실측)

- **⚠️ 직접 zip 을 풀어 XML 을 고치지 마라.** 복제·빈 런·재압축하면 한글이 「손상된 문서」라며 거부한다([[hwpx-editing-gotcha]]). 훅이 막는다.
- **⚠️ `hwpx` 도구는 작업 폴더 밖 파일을 거부한다.** 허용 폴더는 `바탕화면·문서·다운로드` 세 곳이며 **시스템 임시 폴더(scratchpad)는 서버가 막는다.** hwpx 로 검사할 파일은 프로젝트 폴더나 PO 문서 폴더에 두고 작업해라.
- **⚠️ 그 설정의 경로는 슬래시(`C:/Users/...`)여야 한다.** 백슬래시로 적으면 조용히 안 먹는다. 설정 위치는 `~/.claude.json` 의 `mcpServers.hwpx.env.HWPX_AUTOMATION_WORKSPACE_ROOTS`.
- **⚠️ 그림 미리보기(`render_preview`)는 브라우저 경로를 줘야 돈다.** 없으면 `status: blocked` 로 조용히 실패하고 HTML 만 남긴다.
  같은 `env` 에 `HWPX_AUTOMATION_CHROME_PATH` 를 넣어두었다(설정 완료, 8/25 실측으로 3쪽 PNG 확인).
- **한컴 공식 MCP(`HwpAssistantMCP.exe`)는 PC 에 깔려 있어도 못 쓴다** — *"unauthorized app"* 으로 한컴 자기 앱 외 실행을 거부한다.
- **✅ 한글로 직접 열기는 이제 «된다»** (2026-08-25 PO 승인으로 보안 모듈 등록 완료).

  ```bash
  python scripts/hwp/hwp_to_pdf.py 보고서.hwpx 보고서.pdf
  python scripts/ppt/deck_to_png.py 보고서.pdf 그림폴더
  ```

  진짜 한글이 열어 PDF 로 내보내므로 **이게 조판의 최종 판정**이다.
  ⚠️ 등록 전에는 «아무도 못 누르는 승인 대화상자»를 기다리며 멈추고 한글 프로세스가 쌓였다(3개 쌓여 정리한 적 있음).

  **⚠️ 등록은 «기계마다» 따로다.** 이 PC(PO 본체) 는 8/25 에 레지스트리 등록을 마쳤지만,
  다른 기계에서 돌린 병렬 세션은 **같은 스크립트에서 확인창이 떴다.** 다른 기계면 그 기계에서 다시 등록해야 한다.
  ⚠️ **`pyhwpx` 의 `register_regedit()` 는 이 PC 에서 값을 안 썼다**(실행 뒤에도 값 0개).
  `check_registry_key()` 도 미등록 상태에서 True 를 돌려줘 믿을 수 없다. **판정은 레지스트리를 직접 봐라**:
  `Get-Item 'HKCU:\Software\HNC\HwpAutomation\Modules'` 의 값 개수가 0 이면 미등록이다.
- **⚠️ 두 렌더러가 서로 다르게 그린다. 판정은 kordoc 쪽이 맞았다.** 같은 파일에서 hwpx `render_preview`(PNG)는
  표지 제목이 띠와 겹쳐 보였지만, **한글로 직접 열어보니 kordoc `render`(SVG)가 그린 대로 깔끔했다**(8/25 실측).
  조판이 의심스러우면 아래 「한글로 직접 열기」까지 가서 확정해라.
- **⚠️ hwpx 서버는 부를 때마다 새로 뜨고 안 죽는다.** 하루 쓰다 보면 프로세스가 쌓인다(6개까지 쌓인 걸 확인).
  이상하게 느려지면 `Get-Process hwpx-automation-mcp | Stop-Process -Force` 로 정리해라.
- **⚠️ `describe_capabilities` 는 2분 넘게 응답이 없다.** 부르지 마라. 도구 목록은 이 문서로 충분하다.
- **`treesoop/hwp-mcp` 는 붙이지 마라** — 의존성(zod) 문제로 실행 자체가 안 된다(재조사 불필요).

---

## 6. PPT 는 이쪽이 아니다

발표자료는 `docs/rules/PPT_STYLE.md`(BeyondK 깔) + `scripts/ppt/beyondk_style.py`. 집 규격 없이 `python-pptx` 로 새로 짜면 **같은 훅이 막는다.** 확인 그림은 아래 한 줄.

```bash
python scripts/ppt/deck_to_png.py 발표자료.pptx 그림폴더
```


---

## 7. 워드·PDF·엑셀 (2026-08-25 전수 조사)

PO PC 실측: **PDF 3,426개 · 워드 1,154개.** 적지 않게 다루므로 아래 지도를 먼저 보고 움직여라.

### 워드(.docx)

| 하려는 일 | 쓸 것 |
|---|---|
| 받은 워드 문서 읽기 | `kordoc parse_document` |
| 워드 문서 «만들기» | `scripts/md-to-docx.cjs` (워드 자체가 목적일 때만) |
| 변경 추적·검토 의견 | **한글 문서면 `hwpx add_tracked_edit`.** 워드 전용 도구는 안 붙였다(아래) |

⚠️ **한글 문서가 목적이면 워드를 거치지 마라.** 예전에 「kordoc 은 생성 불가」라는 잘못된 단정이
`scripts/md2docx.cjs` 주석에 박혀 있어서 여러 세션이 「마크다운 → 워드 → 한글에서 수동 저장」 우회로를 탔다(정정함).

### PDF

| 하려는 일 | 쓸 것 |
|---|---|
| 읽기·OCR·표 뽑기 | `kordoc parse_document` (수식 OCR 도 있다) |
| 그림으로 바꾸기 | `scripts/ppt/deck_to_png.py 파일.pdf 폴더` |
| 양식 채우기·주석·도장·서명 | **PDF 뷰어 플러그인**(`mcp__plugin_pdf-viewer_pdf__*` + `pdf-viewer:*` 스킬) |
| 병합·분할·암호화 | `anthropic-skills:pdf` 스킬 |
| **글자 영구 지우기** | **아직 방법 없음**(아래) |

⚠️ **PDF 뷰어는 붙어 있으나 「허용 폴더」가 비어 있어 로컬 파일을 못 연다**(8/25 실측: 절대경로를 줘도 거부).
이건 앱 쪽 설정이라 어시가 못 고친다. 쓰려면 PO 가 앱 설정에서 폴더를 열어줘야 한다.

🛑 **PDF 글자 영구 지우기는 외부 도구로도 안 풀린다. 재조사하지 마라.**
후보(`pdf-redaction-mcp`·`mcp-pdf` 등)가 전부 PyMuPDF 기반이라 **우리가 이미 겪은 것과 같은 벽**
(사각형 획·폼XObject 를 못 지움: [[outline-pdf-text-removal]])에 부딪힌다.
내용 스트림을 직접 도려내는 수밖에 없다.

### 엑셀

`anthropic-skills:xlsx` 스킬을 쓴다. 집 규격은 아직 없다.
엑셀 전용 서버(도구 34개짜리들)가 여럿 있으나 **정산·사업비 표 만들 일이 생길 때 붙인다**(2026-08-25 PO 결정: 나중에).

### 왜 워드·PDF 서버를 안 붙였나

| 후보 | 뺀 이유 |
|---|---|
| SecurityRonin/docx-mcp (도구 200개+, 변경 추적 읽기·쓰기) | 우리가 «만드는» 워드가 드물고, 한글 변경 추적은 `hwpx` 로 이미 된다. 도구 200개는 과하다 |
| rsp2k/mcp-pdf (도구 49개) | 양식·도장·주석은 **PDF 뷰어가 이미 한다.** OCR·표는 kordoc 이 한다. 별 10개에 외부 프로그램 설치도 필요 |
| pdf-redaction-mcp | 위 🛑 참고 |
