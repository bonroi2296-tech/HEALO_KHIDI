/**
 * 연락처 지문 — 「같은 사람이 다시 접수했나」를 판정하는 유일한 열쇠.
 *
 * 왜 필요한가 (2026-09-08 실사고):
 *   한 분이 25분 동안 네 번 접수했다(#328~#331). 같은 이메일인데도 매번 새 건이 생겨
 *   코디 화면에 세 명처럼 섰고, 접수확인 메일이 세 통 나갔다. 화면에 접수번호가 떴는데도
 *   다시 보낸 것을 보면, 사람은 「보내졌는지」 확신하지 못한 상태였다.
 *
 * 왜 이메일 칸으로 못 찾나:
 *   이메일은 AES-256-GCM 으로 저장한다(`encryptString`). 이 방식은 **같은 값을 넣어도
 *   매번 다른 암호문**이 나오므로(매번 새 IV), `where email = ?` 로는 절대 못 찾는다.
 *   실제로 2026-09-09 에 암호문 지문을 비교했다가 「서로 다른 이메일」이라고 오판할 뻔했다.
 *   그래서 «찾기 전용» 결정적 해시를 따로 둔다.
 *
 * 왜 HMAC 인가 (그냥 sha256 이 아니라):
 *   이메일은 경우의 수가 좁아서, 순수 해시는 흔한 주소를 하나씩 넣어 보면 되맞출 수 있다.
 *   서버만 아는 열쇠를 섞으면(HMAC) 표가 통째로 새도 원래 주소를 되돌릴 수 없다.
 *   열쇠는 암호화 열쇠를 그대로 쓴다 — 그 열쇠가 새면 어차피 이메일 본문도 열린다.
 *
 * 🛑 이 값을 «사람에게 보여주지» 마라. 화면·로그·메일 어디에도 나가면 안 된다.
 *    쓰임새는 오직 DB 조회 한 가지다.
 */

import crypto from "node:crypto";

/** 열쇠가 없으면 지문도 만들지 않는다 — 빈 문자열로 뭉치면 «모두가 같은 사람»이 된다. */
function secret(): string | null {
  const k = process.env.ENCRYPTION_KEY_V1 || process.env.ENCRYPTION_KEY;
  return k && k.length >= 16 ? k : null;
}

/**
 * 이메일 → 찾기용 지문. 같은 주소면 언제 넣어도 같은 값이 나온다.
 *
 * 표기 차이는 같은 것으로 본다: 앞뒤 공백과 대소문자.
 * ⚠️ 점·플러스(gmail 의 a.b+tag@) 는 «건드리지 않는다». 제공자마다 규칙이 달라서
 *    함부로 지우면 서로 다른 사람을 한 사람으로 묶는다 — 그게 훨씬 위험하다.
 */
export function contactKey(email: string | null | undefined): string | null {
  const s = secret();
  if (!s) return null;
  const v = String(email ?? "").trim().toLowerCase();
  if (!v || !v.includes("@")) return null;
  return crypto.createHmac("sha256", s).update(v).digest("hex");
}

/**
 * 「최근 접수」로 볼 시간 창.
 *
 * 24시간으로 잡은 이유: 같은 날 다시 보내는 것은 거의 확실히 «같은 건»이다(실사고는 25분).
 * 반대로 몇 달 뒤 다시 연락하는 것은 암 환자에게 흔한 일이라 새 건으로 받아야 한다.
 * 방침 §6 도 「일정 기간의 미이용을 관계 종료로 보기 어렵다」고 적어 두었다.
 */
export const RECENT_INQUIRY_WINDOW_HOURS = 24;
