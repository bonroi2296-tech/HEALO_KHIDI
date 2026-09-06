#!/usr/bin/env node
/**
 * 「도구가 이미 있는데 매번 새로 짜는 것」을 손대기 «직전»에 막는 훅.
 *
 * 왜 (2026-08-25 PO 지적): *"kordoc 도 맨날 제대로 안쓰는거 같고 내가 얘기하면
 *   아 맞아요 그거 있죵 ㅎ ㅈㅅ 이러던데 왜 자꾸 그러는거야"*
 *   실측해보니 원인은 게으름이 아니라 «설정 부재»였다 — kordoc 는 도구 목록에 이름만 떠 있었고
 *   저장소 어디에도 「이걸 써라」가 **0줄**이었다. 그래서 매 세션 처음부터 파이썬을 짰다
 *   (scripts/hwp/fill_*.py 3개 = 12만 자. 같은 일을 마크다운 한 장이 한다).
 *
 * 무엇을 막나
 *   ① hwpx/hwp 를 zip·XML 로 직접 주무르는 코드 → kordoc 로 보낸다
 *      (직접 재압축하면 한글이 「손상된 문서」라며 거부한다 — 메모리 hwpx-editing-gotcha)
 *   ② python-pptx 로 발표자료를 새로 짜면서 beyondk_style 을 안 쓰는 것 → PPT_STYLE.md 로 보낸다
 *
 * 왜 «경고»가 아니라 «차단»인가: 경고는 이미 실패한 방식이다. 문서(경고)에 적어둬도
 *   안 읽혔다는 것이 위 실측이다. 그리고 여기서의 「우회」는 곧 «한글이 거부하는 파일»이라
 *   회피에 이득이 없다 (CLAUDE.md 규칙 7-③ 자문 통과).
 *
 * 예외: 훅 자신·규칙 문서·이미 있는 scripts/hwp 의 «기존» 파일 수정은 안 본다.
 */

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    main(JSON.parse(raw || "{}"));
  } catch {
    process.exit(0); // 훅이 깨져서 정상 작업을 막는 일은 없어야 한다
  }
});

function main(payload) {
  const input = payload.tool_input || {};
  const file = String(input.file_path || "");
  // 새로 쓰는 내용만 본다 (Write=content, Edit=new_string)
  const body = String(input.content ?? input.new_string ?? "");
  if (!body) process.exit(0);

  // 이 훅과 규칙 문서 자신은 예외 — 규칙을 적는 글에는 금지 패턴이 당연히 나온다
  if (/[\\/]\.claude[\\/]hooks[\\/]|[\\/]docs[\\/]rules[\\/]|\.md$/i.test(file)) process.exit(0);

  const hwpx = hwpxDirectEdit(body);
  if (hwpx) return block(hwpxMessage(hwpx));

  if (pptxWithoutHouseStyle(file, body)) return block(pptxMessage());

  process.exit(0);
}

/** hwpx/hwp 를 zip·XML 로 직접 여는 코드인가 */
function hwpxDirectEdit(body) {
  if (!/hwpx?/i.test(body)) return null;
  const zip = /\b(zipfile|ZipFile|AdmZip|adm-zip|JSZip|shutil\.make_archive)\b/.test(body);
  const xml = /Contents[\\/]section\d|section0\.xml|hp:secPr|<hp:|xmlns:hp=/.test(body);
  // 규약을 지켜 다시 싸는 코드는 막지 않는다 (2026-08-26 PO 승인).
  //   한글이 거부하는 건 「zip 을 썼다」가 아니라 「mimetype 이 첫 항목·무압축이 아니다」이다.
  //   근거 메모리 hwpx-editing-gotcha 도 「구조불변 + zip 구조복사」면 된다고 적고 있다.
  //   실측(2026-08-25): 이 규약대로 8회 다시 쌌고 한글이 매번 정상으로 열었으며,
  //   hwpx 도구의 openSafety 검증(validatePackage·validateDocument·reopen)도 통과했다.
  //   예외가 없으면 그림 한 장 바꾸는 데 base64 5만 자를 옮겨야 하는데, 그 문자열은
  //   읽는 것조차 도구 한도에 걸려 잘린다 — 막는 쪽이 되레 위험해진다.
  // 읽기만 하는 코드는 막을 이유가 없다. 문서를 «망가뜨리는» 건 다시 쓰는 쪽이다.
  //   2026-08-26: 세 문서를 대조하는 «읽기 전용» 검사기까지 막혀서 넣었다.
  if (zip && !writesZip(body)) return null;
  if (zip && keepsMimetypeContract(body)) return null;
  if (zip) return "zip";
  if (xml) return "xml";
  return null;
}

/** zip 을 «쓰는» 코드인가 (쓰기 모드로 열거나 항목을 써 넣는가) */
function writesZip(body) {
  return (
    /ZipFile\([^)]*["'][wax]["']/.test(body) ||   // ZipFile(..., "w"/"a"/"x")
    /\.writestr\(|\.write\(/.test(body) ||        // 항목 써 넣기
    /make_archive|ZipInfo\(/.test(body)
  );
}

/** mimetype 을 첫 항목·무압축으로 두고 나머지 항목의 압축방식도 그대로 베끼는가 */
function keepsMimetypeContract(body) {
  if (!/mimetype/.test(body)) return false;
  return (
    /compress_type\s*=\s*\w+\.compress_type/.test(body) ||  // 항목별 압축방식을 그대로 베낌
    /ZIP_STORED/.test(body) ||                              // mimetype 을 무압축으로 명시
    /\binfolist\(\)/.test(body)                             // 원본 항목 순서를 그대로 순회
  );
}

/** 발표자료를 집 규격 없이 새로 짜는가 */
function pptxWithoutHouseStyle(file, body) {
  if (!/\bPresentation\(|python-pptx|from pptx\b/.test(body)) return false;
  if (/beyondk_style|import\s+beyondk/.test(body)) return false;
  // 규격 모듈 자신과 변환기는 예외
  if (/beyondk_style\.py|deck_to_png\.py|pptx_to_pdf/.test(file)) return false;
  // 읽기만 하는 코드는 막을 이유가 없다 — 규격은 «만들 때» 지키는 것이다.
  //   2026-08-26: 평가 적합도 검사기(check_eval_fit.py)가 여기 걸렸다. 한 줄도 안 고치고
  //   쪽 글만 읽는데 「집 규격 없이 짠다」로 잡혔다. hwpx 쪽에 이미 같은 예외가 있어 맞춘다.
  if (!writesPptx(body)) return false;
  return true;
}

/** 발표자료를 «바꾸는» 코드인가 (저장하거나 도형·쪽을 넣는가) */
function writesPptx(body) {
  return (
    /\.save\(/.test(body) ||
    /add_slide|add_picture|add_textbox|add_table|add_shape|add_chart/.test(body)
  );
}

function hwpxMessage(kind) {
  const how = kind === "zip" ? "zip 으로 다시 압축" : "내부 XML 을 직접 편집";
  return [
    `🛑 한글 문서를 ${how}하려 하고 있다. 이 경로는 한글이 「손상된 문서」라며 거부한다.`,
    "",
    "⚠️ **도구 목록에 뜨는 kordoc 8개가 전부가 아니다.** 그건 MCP 로 노출된 일부이고,",
    "   «명령줄 kordoc» 에는 만들기·고치기·검증이 다 있다. 목록만 보고 「기능이 없다」고 단정하지 마라",
    "   (2026-08-26 실측: 그렇게 단정했다가 문서 결함 하나를 놓쳤다).",
    "",
    "  • 새로 만들기      → `npx -y kordoc@latest generate 원고.md -o 결과.hwpx --preset 보고서`",
    "  • 서식 살려 고치기 → `npx -y kordoc@latest patch 원본.hwpx 편집.md -o 결과.hwpx`",
    "  • 한글이 받아주나  → `npx -y kordoc@latest validate 문서.hwpx`   ← 몇 초면 답이 나온다",
    "  • 표기법 검수      → `npx -y kordoc@latest lint 원고.md`  (⚠️오탐 많다: 양식이 정한 단위·표",
    "                      세로쓰기 칸을 위반으로 잡는다. 「우리가 쓴 것」만 골라 봐라)",
    "  • 도장·개인정보    → `kordoc seal` · `kordoc redact` (마스킹 결과는 사람이 최종 확인)",
    "",
    "  • 글자 고치기      → hwpx search_and_replace · apply_edits  (바뀐 칸을 전후 대조로 보여준다)",
    "  • 표 칸 고치기     → hwpx set_table_cell_text",
    "  • 읽고 대조하기    → kordoc parse_table · parse_document · **compare_documents**",
    "                      ← 「내가 뭘 바꿨나」를 문단·표 단위로 낸다. 고친 뒤 마지막에 꼭 돌려라",
    "  • 그림 갈아끼우기  → `python scripts/hwp/swap_picture.py <문서> image5.BMP <새그림>`",
    "                      (hwpx replace_picture 는 base64 를 받는데 A4 그림 하나가 5만 자라 못 넘긴다)",
    "  • 파일이 성하냐    → hwpx repair_hwpx  ← 다시 포장하면서 «한글이 열 수 있나»까지 검사해 준다",
    "  • 눈으로 확인      → hwpx render_preview · `scripts/hwp/hwp_check.ps1`",
    "  • 공문서 규정 검사 → hwpx inspect_official_document_style  ← 실물 기준이라 더 잡는다",
    "",
    "⚠️ hwpx 도구가 «파일을 못 읽겠다»고 하면(TOOL_EXECUTION_FAILED) 먼저 repair_hwpx 로 한 번",
    "   다시 포장해라. 그 뒤로는 읽힌다. 작업공간은 Desktop·Documents·Downloads 뿐이다.",
    "📖 자세한 것은 `docs/rules/HWP_DOC.md`. 이 문서는 «맞게» 적혀 있다. 안 읽어서 헤맨 것이다.",
    "  • 붙임·표 번호     → hwpx inspect_reference_consistency",
    "  • 변경 추적·N부    → hwpx add_tracked_edit · mail_merge",
    "",
    "규칙 문서: docs/rules/HWP_DOC.md — **읽고 나서 다시 시도해라.**",
    "두 도구로도 정말 안 되는 일이면 그 이유를 PO 에게 한 줄로 말하고 판단을 받아라.",
  ].join("\n");
}

function pptxMessage() {
  return [
    "🛑 발표자료를 집 규격 없이 새로 짜고 있다. PPT 는 BeyondK 깔로 고정돼 있다 (2026-07-31 PO 지시).",
    "",
    "  • 규격 모듈 → `scripts/ppt/beyondk_style.py` (표지·챕터·표·통계·강조 함수 25개 완비)",
    "  • 규격 문서 → `docs/rules/PPT_STYLE.md` (판형 960×540, 에스코어 드림, 라임 #D9FE55 한 곳)",
    "  • 기계 검사 → `python scripts/ppt/check_deck.py 발표자료.pptx` (넘침·겹침·규격 밖 글꼴/색)",
    "  • 확인 그림 → `python scripts/ppt/deck_to_png.py 발표자료.pptx 그림폴더`",
    "",
    "`import beyondk_style as B` 로 다시 짜라. 규격을 벗어나야 할 이유가 있으면 PO 에게 먼저 말해라.",
  ].join("\n");
}

function block(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2); // 2 = 도구 실행 차단, stderr 가 모델에게 전달된다
}
