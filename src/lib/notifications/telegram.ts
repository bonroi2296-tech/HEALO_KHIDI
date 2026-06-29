import "server-only";

/**
 * healwith: 텔레그램 알림 — 단일 운영자(PO)에게 새 문의 즉시 푸시.
 *
 * env 2개면 동작: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (둘 중 하나라도 없으면 조용히 스킵).
 * 봇 토큰은 @BotFather, chat_id 는 봇에게 아무 말 건 뒤
 *   https://api.telegram.org/bot<TOKEN>/getUpdates 에서 확인.
 *
 * ponytail: 수신자 1명(PO) → env 2개로 충분. 다중 수신자·구독관리 필요해지면 그때 테이블.
 * 외부 의존성 없음(fetch만). Resend/SES 와 같은 fail-safe(throw 안 함, 메인 로직 보호).
 */
export async function sendTelegramAlert(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false; // 미설정이면 조용히 스킵(거짓 'sent' 안 남김)

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[telegram] send failed:", res.status);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[telegram] exception:", e?.message);
    return false;
  }
}
