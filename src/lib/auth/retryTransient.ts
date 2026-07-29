/**
 * healwith: 인증·권한 조회 「한 번 더 물어보기」
 *
 * 왜 있나 (2026-07-29): 문지기들이 **「권한이 없다」와 「못 물어봤다」를 구별하지 않았다.**
 * 인증 서버·DB 가 한 번 삐끗하면 그 오류를 그대로 «거부» 로 바꿔서, 멀쩡히 로그인한
 * 사용자가 로그인 화면으로 튕기거나 「접근 권한 없음」 카드를 봤다. 실제로 자동검사에서
 * 1회 재현됐다(/hospital/treatments → /login?redirect=…, docs/KNOWN_ISSUES.md).
 *
 * 무엇을 하나: 오류일 때만 **즉시 1회** 더 물어본다. 두 번 다 실패하면 예전과 똑같이
 * 거부한다 — 보안은 그대로다(유효한 사용자만 통과).
 *
 * ponytail: 유예(sleep)·N회 재시도는 일부러 안 넣었다. 문지기는 모든 보호경로의 길목이라
 *   지연이 그대로 사용자에게 실린다. 같은 튕김이 또 잡히면 그때 「짧은 유예 + 2회」로 올려라.
 */

/**
 * 재시도해도 답이 같은 코드들 — 「진짜 없음」이라 한 번 더 묻는 건 DB 낭비다.
 * PGRST116 = PostgREST 「행이 0개인데 .single() 을 했다」 = 그 사람은 정말 구성원이 아니다.
 */
const DEFINITIVE_CODES = new Set(["PGRST116"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Answered = { data?: any; error?: any };

/**
 * @param ask 인증/권한 조회 한 번 (supabase 응답 `{ data, error }` 모양)
 * @returns 성공 응답 · 확정 거부 응답 · 두 번 다 실패면 마지막 응답(없으면 null)
 */
export async function askOnceMoreOnError<T extends Answered>(
  // PromiseLike: supabase 질의(PostgrestBuilder)는 Promise 가 아니라 thenable 이다
  ask: () => PromiseLike<T>
): Promise<T | null> {
  const once = async (): Promise<T | null> => {
    try {
      return await ask();
    } catch {
      return null;
    }
  };

  const first = await once();
  if (first && !first.error) return first;

  const code = (first?.error as { code?: string } | null | undefined)?.code;
  if (code && DEFINITIVE_CODES.has(code)) return first; // 확정 거부 → 그대로

  return (await once()) ?? first;
}
