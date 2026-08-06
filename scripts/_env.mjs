/**
 * .env.local 을 «직접» 읽는 스크립트들이 같이 쓰는 로더. (dotenv 없이 도는 독립 스크립트용)
 *
 * 왜 한 곳으로 모았나 (2026-08-06):
 *   이 저장소의 `.env.local` 에는 값이 **리터럴 `\n` 으로 끝나는 줄**이 있다
 *   (`SUPABASE_SERVICE_ROLE_KEY="eyJ...GJERDk\n"`). 따옴표만 벗기는 흔한 파서로 읽으면
 *   그 두 글자가 열쇠에 붙어 `401 {"message":"Invalid API key"}` 가 난다.
 *   → **멀쩡한 열쇠를 「폐기됐다」고 오진**하게 된다. 실제로 그렇게 헛짚어 PO 에게
 *     재발급을 요청했다가 취소했다. 같은 파서가 스크립트 3곳에 복사돼 있었고
 *     그중 2곳(dev-login-as·check-attachment-upload)은 «돌리면 반드시 401» 인 상태였다.
 *
 *   Next.js·Vercel 의 로더는 이 형태를 정상 처리한다 → 실서비스는 무관하다.
 *   문제는 이렇게 직접 읽는 스크립트뿐이라, 읽는 방법을 한 곳에만 두고 전부 여기를 쓰게 한다.
 *
 * 교훈: 401 을 보면 열쇠를 의심하기 «전에» 내가 그 값을 어떻게 읽었는지부터 봐라.
 *       anon 은 되는데 service_role 만 안 되면, 대개 열쇠가 아니라 파서 문제다.
 */
import { readFileSync } from "node:fs";

/** 따옴표를 벗기고, 값 안의 `\n` 을 실제 줄바꿈으로 바꾼 뒤 앞뒤 공백을 턴다. */
export function unquoteEnvValue(raw) {
  const s = raw.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  return s.replace(/\\n/g, "\n").trim();
}

/**
 * .env.local 을 읽어 객체로 준다. 없으면 빈 객체(스크립트가 스스로 안내하고 끝내도록).
 * applyToProcess=true 면 아직 안 정해진 값만 process.env 에 채운다(이미 있는 값은 안 덮음).
 */
export function loadEnvLocal({ path = ".env.local", applyToProcess = false } = {}) {
  const env = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return env;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    env[m[1]] = unquoteEnvValue(m[2]);
    if (applyToProcess && process.env[m[1]] === undefined) process.env[m[1]] = env[m[1]];
  }
  return env;
}
