#!/usr/bin/env node
/**
 * 되돌리기 어려운 행동을 「실행 직전」에 붙잡아 PO 확인을 받게 하는 문지기.
 *
 * 왜 (2026-07-31, docs/audit/CONTEXT_ENGINEERING_2026-07-31.md):
 *   CLAUDE.md 에 「DB 삭제·컬럼 drop·데이터 파괴는 PO 확인」이라고 적혀 있었지만
 *   그건 «문서에 적힌 약속»일 뿐 기계가 막는 문턱이 아니었다.
 *   .claude/settings.json 에 권한 차단 설정이 아예 없었다(훅만 있었음).
 *   허깅페이스 침입 사건(2026-07)의 교훈 그대로 — 에이전트한테 중요한 건
 *   «어떤 지시를 받았나»보다 «실제로 어떤 행동까지 할 수 있나»다.
 *   CLAUDE.md 자기 규칙(「기계가 잴 수 있으면 CI·훅으로 박아라」)을
 *   우리 자신의 권한에도 적용한 것.
 *
 * 원리: PreToolUse 훅. 도구가 실제로 돌기 전에 입력값을 읽고
 *   - 파괴적이면  permissionDecision:"ask"  → PO 에게 확인 창이 뜬다
 *   - 아니면      아무 말 없이 통과(exit 0)
 *   막는 게 아니라 «한 번 물어보게» 만드는 것이라, 정당한 작업은 승인 한 번이면 그대로 된다.
 *
 * 일부러 안 막는 것: 되돌릴 수 있는 추가(CREATE TABLE·ADD COLUMN·CREATE INDEX).
 *   CLAUDE.md 「가역적 추가는 자동 OK」 그대로.
 */

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    main(JSON.parse(raw || "{}"));
  } catch {
    // 훅이 깨져서 정상 작업을 막는 일은 없어야 한다 — 못 읽으면 그냥 통과.
    process.exit(0);
  }
});

function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function main(ev) {
  const tool = ev.tool_name || "";
  const input = ev.tool_input || {};

  // ── 1. DB 를 파괴하는 SQL ────────────────────────────────────────
  if (tool === "mcp__Supabase__execute_sql" || tool === "mcp__Supabase__apply_migration") {
    const sql = String(input.query || input.sql || "");
    // 문자열·주석 안의 단어에 낚이지 않게 대충 걷어낸다(완벽할 필요는 없다 — 놓치면 통과가 아니라 «덜 묻는» 쪽).
    const bare = sql
      .replace(/--[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/'(?:[^']|'')*'/g, " '' ")
      .toUpperCase();

    const 위험 = [
      [/\bDROP\s+(TABLE|COLUMN|SCHEMA|DATABASE|TYPE|VIEW|FUNCTION|POLICY|TRIGGER)\b/, "테이블·컬럼 등을 지우는 DROP"],
      [/\bALTER\s+TABLE\b[\s\S]*\bDROP\b/, "ALTER TABLE ... DROP (컬럼·제약 삭제)"],
      [/\bTRUNCATE\b/, "테이블을 통째로 비우는 TRUNCATE"],
      [/\bDELETE\s+FROM\b/, "행을 지우는 DELETE"],
      [/\bDROP\s+EXTENSION\b/, "확장 기능 제거"],
      [/\bREVOKE\b/, "권한 회수(REVOKE) — 접근권한 규칙에 영향"],
      [/\bALTER\s+(TABLE|DEFAULT\s+PRIVILEGES)\b[\s\S]*\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/, "접근권한 규칙(RLS) 끄기"],
    ];
    for (const [re, 설명] of 위험) {
      if (re.test(bare)) {
        ask(
          `🛑 되돌리기 어려운 데이터베이스 작업입니다 — ${설명}.\n` +
            `CLAUDE.md 「DB 삭제·컬럼 drop·데이터 파괴는 PO 확인」 규칙에 걸렸습니다.\n` +
            `실행할 SQL 첫 300자:\n${sql.slice(0, 300)}`
        );
      }
    }
    process.exit(0);
  }

  // ── 2. Supabase 프로젝트/브랜치 자체를 건드리는 것 ────────────────
  const 위험도구 = {
    mcp__Supabase__delete_branch: "데이터베이스 작업본(브랜치) 삭제",
    mcp__Supabase__reset_branch: "작업본 초기화(쌓인 변경 날아감)",
    mcp__Supabase__pause_project: "실서비스 데이터베이스 정지",
    mcp__Supabase__restore_project: "데이터베이스 복원(현재 상태 덮어씀)",
    mcp__Supabase__merge_branch: "작업본을 실서비스 데이터베이스에 반영",
  };
  if (위험도구[tool]) {
    ask(`🛑 ${위험도구[tool]} — 되돌리기 어렵습니다. PO 확인이 필요합니다.`);
  }

  // ── 3. 되돌리기 어려운 셸 명령 ───────────────────────────────────
  if (tool === "Bash") {
    const cmd = String(input.command || "");
    const 위험셸 = [
      [/git\s+push\b[^|;&]*(--force\b(?!-with-lease)|(^|\s)-f(\s|$))/, "강제 푸시(--force) — 원격 저장소 기록이 덮어써집니다"],
      [/rm\s+-[a-zA-Z]*r[a-zA-Z]*f|rm\s+-[a-zA-Z]*f[a-zA-Z]*r/, "rm -rf — 폴더 통째 삭제"],
      [/git\s+branch\s+(-D|--delete\s+--force)/, "작업본(브랜치) 강제 삭제"],
      [/git\s+(clean\s+-[a-zA-Z]*f|reset\s+--hard)/, "작업 내용 되돌리기(git reset --hard / clean -f) — 저장 안 한 변경이 사라집니다"],
      [/supabase\s+db\s+reset/, "로컬 데이터베이스 초기화"],
      [/\bpsql\b[\s\S]*\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i, "psql 로 직접 데이터 파괴"],
    ];
    // 임시 폴더 안에서 벌어지는 «삭제»만 통과시킨다.
    //
    // ⚠️ 2026-08-03 자기감사에서 «구멍»을 찾아 고쳤다. 예전엔 이랬다:
    //      const 임시작업 = /scratchpad|\/tmp\/claude-/.test(cmd);
    //    명령 «어디든» 그 글자가 있으면 통째로 면제라서, 실제로 이런 게 통과했다:
    //      rm -rf /home/user/HEALO_KHIDI/src  # scratchpad     ← 주석에 단어만 있어도 면제
    //      cp x /tmp/claude-0/a && rm -rf src/lib              ← 앞 명령에 경로만 있어도 면제
    //    즉 «막는다»고 보고해 놓고 우회가 가능했다 — 문지기의 최악 상태(고친 것처럼 보이는데 안 고쳐짐).
    //
    // 지금 규칙: ①삭제(rm) 명령에만 예외를 준다(강제 푸시·reset --hard 등엔 예외 없음)
    //           ②명령이 «복합»이면(;·&&·||·파이프·명령치환) 예외 없음
    //           ③지우려는 «대상 경로가 전부» 임시 폴더 아래일 때만 예외
    const isTempTarget = (t) => t.startsWith("/tmp/") || /(^|\/)scratchpad(\/|$)/.test(t);
    const rmTargetsAllTemp = () => {
      const bare = cmd.replace(/#[^\n]*/g, " "); // 주석은 근거가 될 수 없다
      if (/[;&|]|\$\(|`|\n/.test(bare)) return false; // 복합 명령이면 예외 안 준다
      const m = bare.match(/\brm\s+((?:-\S+\s+)*)(.+)$/);
      if (!m) return false;
      const targets = m[2].trim().split(/\s+/).filter((t) => t && !t.startsWith("-"));
      return targets.length > 0 && targets.every(isTempTarget);
    };
    for (const [re, 설명] of 위험셸) {
      const 임시작업 = 설명.startsWith("rm -rf") && rmTargetsAllTemp();
      if (re.test(cmd) && !임시작업) {
        ask(`🛑 되돌리기 어려운 명령입니다 — ${설명}.\n실행할 명령:\n${cmd.slice(0, 300)}`);
      }
    }
  }

  process.exit(0);
}
