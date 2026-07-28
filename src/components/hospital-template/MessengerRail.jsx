"use client";

/**
 * 상시 노출 상담 채널 — 화면 오른쪽에 붙어 따라다닌다.
 *
 * 왜: 상위 의료관광 사이트(Braun 등)를 실측해 보니 상담 유도가 **10~12회** 반복되고,
 * 그중 가장 강한 게 «우측 고정 메신저 바»였다(카카오톡·라인·바이버). 우리 판은
 * CTA 가 3~4회뿐이라 «읽고 나가는» 구조였다.
 *
 * 해외 환자는 전화보다 메신저를 쓴다 — 국제전화 요금·시차·언어 부담 때문이다.
 * 그래서 병원 전화번호 하나만 두면 실제 문의로 이어지지 않는다.
 *
 * 채널이 하나도 없는 병원이면 **아무것도 안 그린다**(빈 바가 떠 있으면 더 이상하다).
 */

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", icon: "M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a14 14 0 0 1-5.9-5.2c-.4-.6-1-1.6-1-3s.8-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.1-.2.3 0 .6a9 9 0 0 0 4 3.5c.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3v.6Z" },
  { key: "telegram", label: "Telegram", color: "#229ED9", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 6.9-1.6 7.5c-.1.5-.4.7-.9.4l-2.4-1.8-1.2 1.1c-.1.1-.3.3-.6.3l.2-2.4 4.4-4c.2-.2 0-.3-.3-.1l-5.4 3.4-2.3-.7c-.5-.2-.5-.5.1-.7l9.1-3.5c.4-.2.8.1.9.5Z" },
  { key: "wechat", label: "WeChat", color: "#07C160", icon: "M8.7 4C5 4 2 6.5 2 9.6c0 1.8 1 3.4 2.6 4.4l-.7 2 2.3-1.2c.7.2 1.4.3 2.2.3h.6a5 5 0 0 1-.2-1.4c0-3 2.9-5.4 6.5-5.4h.6C15.3 5.7 12.3 4 8.7 4Zm-2.3 3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4.6 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4.4 2.6c-3 0-5.5 2.1-5.5 4.7 0 2.6 2.5 4.7 5.5 4.7.6 0 1.2-.1 1.8-.3l1.9 1-.5-1.7c1.3-.8 2.1-2.1 2.1-3.7 0-2.6-2.4-4.7-5.3-4.7Zm-1.8 3a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm3.6 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z" },
  { key: "line", label: "LINE", color: "#06C755", icon: "M12 3C6.9 3 2.8 6.4 2.8 10.5c0 3.7 3.2 6.8 7.6 7.4.3.1.7.2.8.5.1.3 0 .7 0 1l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.4-5.4c1.3-1.4 2-2.9 2-4.8C21.2 6.4 17.1 3 12 3ZM8.3 12.9H6.5c-.2 0-.4-.2-.4-.4V9c0-.2.2-.4.4-.4s.4.2.4.4v3.1h1.4c.2 0 .4.2.4.4s-.2.4-.4.4Zm1.6-.4c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9c0-.2.2-.4.4-.4s.4.2.4.4v3.5Zm3.9 0c0 .2-.1.3-.3.4h-.1c-.1 0-.3-.1-.3-.2l-1.5-2v1.8c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9c0-.2.1-.3.3-.4h.1c.1 0 .2.1.3.2l1.5 2V9c0-.2.2-.4.4-.4s.4.2.4.4v3.5Zm2.6-2.2c.2 0 .4.2.4.4s-.2.4-.4.4h-1.4v.9h1.4c.2 0 .4.2.4.4s-.2.4-.4.4h-1.8c-.2 0-.4-.2-.4-.4V9c0-.2.2-.4.4-.4h1.8c.2 0 .4.2.4.4s-.2.4-.4.4h-1.4v.9h1.4Z" },
];

export default function MessengerRail({ channels, accent, label }) {
  const active = CHANNELS.filter((c) => channels?.[c.key]);
  if (active.length === 0) return null;

  return (
    <div className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col gap-2">
      {label && (
        <span className="text-[10px] text-center uppercase mb-1 font-semibold" style={{ letterSpacing: "0.12em", color: accent }}>
          {label}
        </span>
      )}
      {active.map((c) => (
        <a
          key={c.key}
          href={channels[c.key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={c.label}
          title={c.label}
          className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          style={{ backgroundColor: c.color }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 fill-white" aria-hidden="true">
            <path d={c.icon} />
          </svg>
        </a>
      ))}
    </div>
  );
}
