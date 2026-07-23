import "server-only";

/**
 * healwith: 환자용 왓츠앱 봇 — 아웃바운드 어댑터 (Meta WhatsApp Cloud API)
 *
 * 텔레그램(telegram.ts)과 동일한 fail-safe 원칙: 외부 SDK 없음(fetch만),
 * throw 금지(발신 실패가 메인 로직을 죽이지 않게), 로그엔 상태·오류코드만(PII·토큰 금지).
 *
 * 텔레그램과 다른 왓츠앱 고유 제약:
 *  - 24시간 창: 환자의 마지막 수신 메시지 후 24시간이 지나면 자유 텍스트 발신이
 *    오류(코드 131047, re-engagement)로 거절된다 → windowExpired 로 구분해 돌려준다.
 *    (그때는 사전 승인된 템플릿 메시지로만 먼저 말 걸 수 있음 — v1 은 미지원, 코디에게 안내만.)
 *  - interactive 버튼 title 은 20자 하드리밋(CONSENT_BUTTON 은 전부 이내).
 *
 * env (docs/WHATSAPP_BOT_SETUP.md):
 *  - WHATSAPP_ACCESS_TOKEN     : System User 영구 토큰
 *  - WHATSAPP_PHONE_NUMBER_ID  : 발신 번호의 Phone number ID (전화번호 자체가 아님)
 *  - WHATSAPP_WEBHOOK_VERIFY_TOKEN / WHATSAPP_APP_SECRET 은 웹훅 라우트가 사용.
 */

import { stripMarkdownForTelegram, splitTelegramText } from "./telegramText";
import { CONSENT_PROMPT, CONSENT_BUTTON, pickTgText } from "./telegram";

const GRAPH_API = "https://graph.facebook.com/v21.0";

export function isWhatsAppBotConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

type GraphResult = { ok: boolean; errorCode: number | null };

async function callGraphApi(payload: Record<string, any>): Promise<GraphResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, errorCode: null }; // 미설정 = 조용히 스킵
  try {
    const res = await fetch(`${GRAPH_API}/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    if (!res.ok) {
      // 오류코드는 24시간 창(131047) 판별에 필요 — 코드 숫자만 읽고 본문은 버린다(PII 금지).
      let errorCode: number | null = null;
      try {
        const body = await res.json();
        errorCode = Number(body?.error?.code) || null;
      } catch {
        /* 본문 없음 */
      }
      console.error(`[messaging/whatsapp] send failed: ${res.status} code=${errorCode ?? "?"}`);
      return { ok: false, errorCode };
    }
    return { ok: true, errorCode: null };
  } catch (e: any) {
    console.error("[messaging/whatsapp] send exception:", e?.message);
    return { ok: false, errorCode: null };
  }
}

export type WaSendResult = { sent: boolean; windowExpired: boolean };

/** 환자에게 텍스트 발신. 마크다운 평문화 + 4096자 분할(텔레그램과 동일 유틸). */
export async function sendWhatsAppPatientMessage(
  waId: string,
  text: string
): Promise<WaSendResult> {
  const parts = splitTelegramText(stripMarkdownForTelegram(text));
  if (!parts.length) return { sent: false, windowExpired: false };
  let allOk = true;
  let windowExpired = false;
  for (const part of parts) {
    const r = await callGraphApi({
      to: waId,
      type: "text",
      text: { body: part, preview_url: false },
    });
    if (!r.ok) {
      allOk = false;
      if (r.errorCode === 131047) windowExpired = true;
    }
  }
  return { sent: allOk, windowExpired };
}

/** PIPA 동의 요청 — interactive 버튼(reply id = consent:<버전>, 텔레그램 callback_data 와 동일 관례). */
export const WA_CONSENT_VERSION = "1.0.0";

export async function sendWhatsAppConsentPrompt(waId: string, lang: string): Promise<boolean> {
  const r = await callGraphApi({
    to: waId,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: pickTgText(CONSENT_PROMPT, lang) },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: `consent:${WA_CONSENT_VERSION}`, title: pickTgText(CONSENT_BUTTON, lang) },
          },
        ],
      },
    },
  });
  return r.ok;
}
