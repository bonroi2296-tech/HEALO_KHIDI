/**
 * 요청 출처(Origin) 허용 판정 — 남의 사이트가 우리 API 를 대신 호출하는 것(CSRF) 방지.
 *
 * 왜 따로 뺐나: `translate-realtime` 라우트에 허용목록이 **localhost:3000·3001 만**
 *   하드코딩돼 있었다. 우리는 세션을 여러 개 띄우며 3241·3251·3097 같은 포트를 쓰는데,
 *   그 포트의 개발 서버에서는 실시간 번역이 통째로 **403** 으로 막힌다 —
 *   화면엔 「자막이 안 뜬다」로만 보여서 원인을 찾는 데 시간이 든다(2026-08-06 실제로 걸림).
 *
 * 무엇을 바꿨나: **개발 환경에서만** localhost 의 아무 포트나 허용한다.
 *   실서비스(production)에서는 예전 그대로 — 도메인 목록만 통과한다.
 *   (형제 라우트 `api/translate-text` 는 환경 구분 없이 아무 localhost 나 허용하고 있다.
 *    그쪽이 더 느슨하다 — 이 함수가 더 엄격한 쪽이다. 그쪽 정리는 별건.)
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** 실서비스에서도 항상 허용하는 우리 도메인. */
function isOwnDomain(hostname: string): boolean {
  return (
    hostname === "healwith.co.kr" ||
    hostname.endsWith(".healwith.co.kr") ||
    hostname === "khidi.healo.kr" ||
    hostname.endsWith(".healo.kr")
  );
  // ⚠️ `.vercel.app` 은 일부러 뺐다(2026-08-14 보안감사). vercel.app 서브도메인은
  //    «누구나» 원하는 이름으로 선점할 수 있어(전역 유니크), `.vercel.app` 접미사 허용은
  //    남의 `evil.vercel.app` 이 우리 API 를 대신 호출(CSRF)하는 문을 열어준다.
  //    프리뷰는 2026-07-31 PO 지시로 어차피 차단 중이라 지금 손해 0. 프리뷰에서 API 를
  //    실제로 호출해야 하면 그때 정확한 호스트를 env 허용목록으로 넣어라.
}

export function isAllowedOrigin(
  originHeader: string | null | undefined,
  { isProduction = process.env.NODE_ENV === "production" } = {}
): boolean {
  if (!originHeader) return false;
  let hostname: string;
  try {
    hostname = new URL(originHeader).hostname;
  } catch {
    return false;
  }
  if (isOwnDomain(hostname)) return true;
  // 개발·시험 환경에서만 내 컴퓨터의 아무 포트나 허용(포트를 미리 못 정한다).
  if (!isProduction && LOCAL_HOSTS.has(hostname)) return true;
  return false;
}
