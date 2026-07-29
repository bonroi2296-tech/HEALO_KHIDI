"use client";

/**
 * 오른쪽에 붙어 따라다니는 **빠른 상담 묶음** + 위쪽 공지 띠.
 *
 * 왜 이렇게 바꿨나 (2026-07-29, PO: *"아직도 너무 성의가 없잖아 그래가지고 돈 벌어 먹고 살겠니"*):
 *   유앤아이의원(uni114.co.kr) 실제 화면을 **띄워서 봤다**(그 전엔 CSS 숫자만 읽고 화면을 안 봤다).
 *   결정적 차이는 «디자인»이 아니라 **화면이 장사를 한다**는 점이었다:
 *     · 맨 위 검정 공지 띠(확장 오픈 안내)
 *     · 우측 고정 QUICK MENU(상담예약·전후사진) — 스크롤 내내 안 사라짐
 *     · 좌하단 배지 + 형광 「실시간 예약하기」 배너
 *     · 페이지 **안에** 상담 폼(다른 데로 안 보낸다)
 *   내 판은 메신저 아이콘 4개가 전부였다 = «브로슈어». 저건 «매대».
 *
 * ⚠️ 단, 그 병원은 성형외과다. 면력은 **암 병원**이라 할인가·전후사진을 그대로 못 옮긴다
 *   (의료광고 규제 + 우리가 가진 사실이 아님). **구조만 가져오고 내용은 암 병원 문법으로 바꾼다.**
 *
 * 채널이 하나도 없으면 아무것도 안 그린다(빈 바가 떠 있으면 더 이상하다).
 */

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", icon: "M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a14 14 0 0 1-5.9-5.2c-.4-.6-1-1.6-1-3s.8-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.1-.2.3 0 .6a9 9 0 0 0 4 3.5c.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3v.6Z" },
  { key: "telegram", label: "Telegram", color: "#229ED9", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 6.9-1.6 7.5c-.1.5-.4.7-.9.4l-2.4-1.8-1.2 1.1c-.1.1-.3.3-.6.3l.2-2.4 4.4-4c.2-.2 0-.3-.3-.1l-5.4 3.4-2.3-.7c-.5-.2-.5-.5.1-.7l9.1-3.5c.4-.2.8.1.9.5Z" },
  { key: "wechat", label: "WeChat", color: "#07C160", icon: "M8.7 4C5 4 2 6.5 2 9.6c0 1.8 1 3.4 2.6 4.4l-.7 2 2.3-1.2c.7.2 1.4.3 2.2.3h.6a5 5 0 0 1-.2-1.4c0-3 2.9-5.4 6.5-5.4h.6C15.3 5.7 12.3 4 8.7 4Zm-2.3 3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4.6 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4.4 2.6c-3 0-5.5 2.1-5.5 4.7 0 2.6 2.5 4.7 5.5 4.7.6 0 1.2-.1 1.8-.3l1.9 1-.5-1.7c1.3-.8 2.1-2.1 2.1-3.7 0-2.6-2.4-4.7-5.3-4.7Zm-1.8 3a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm3.6 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z" },
  { key: "line", label: "LINE", color: "#06C755", icon: "M12 3C6.9 3 2.8 6.4 2.8 10.5c0 3.7 3.2 6.8 7.6 7.4.3.1.7.2.8.5.1.3 0 .7 0 1l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.4-5.4c1.3-1.4 2-2.9 2-4.8C21.2 6.4 17.1 3 12 3ZM8.3 12.9H6.5c-.2 0-.4-.2-.4-.4V9c0-.2.2-.4.4-.4s.4.2.4.4v3.1h1.4c.2 0 .4.2.4.4s-.2.4-.4.4Zm1.6-.4c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9c0-.2.2-.4.4-.4s.4.2.4.4v3.5Zm3.9 0c0 .2-.1.3-.3.4h-.1c-.1 0-.3-.1-.3-.2l-1.5-2v1.8c0 .2-.2.4-.4.4s-.4-.2-.4-.4V9c0-.2.1-.3.3-.4h.1c.1 0 .2.1.3.2l1.5 2V9c0-.2.2-.4.4-.4s.4.2.4.4v3.5Zm2.6-2.2c.2 0 .4.2.4.4s-.2.4-.4.4h-1.4v.9h1.4c.2 0 .4.2.4.4s-.2.4-.4.4h-1.8c-.2 0-.4-.2-.4-.4V9c0-.2.2-.4.4-.4h1.8c.2 0 .4.2.4.4s-.2.4-.4.4h-1.4v.9h1.4Z" },
];

/** 맨 위 공지 띠 — 「지금 무슨 일이 있나」. 값이 없으면 안 그린다. */
export function AnnouncementBar({ text, href, darkTone }) {
  if (!text) return null;
  const Tag = href ? "a" : "div";
  return (
    <Tag
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
      className="block text-center text-white text-[12px] md:text-[13px] py-2.5 px-4 leading-snug"
      style={{ backgroundColor: darkTone || "#0C2233" }}
    >
      {text}
      {href && <span className="ml-2 opacity-70">→</span>}
    </Tag>
  );
}

/**
 * 우측 고정 묶음: 상담 예약(제일 큼) → 메신저들 → 전화 → 맨 위로.
 * 모바일은 화면이 좁아 아래쪽 가로 바로 따로 그린다(`MobileBar`).
 */
export default function QuickRail({ channels, accent, label, onInquiry, phone, ctaLabel }) {
  const active = CHANNELS.filter((c) => channels?.[c.key]);
  if (active.length === 0 && !phone && !onInquiry) return null;

  return (
    <div className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-2">
      {label && (
        <span
          className="text-[10px] text-center uppercase font-semibold"
          style={{ letterSpacing: "0.12em", color: accent }}
        >
          {label}
        </span>
      )}

      {/* 제일 굵은 유도 — 아이콘이 아니라 «글자 버튼»이라야 눌린다(유앤아이도 여기만 글자). */}
      {onInquiry && (
        <button
          onClick={onInquiry}
          className="w-14 md:w-16 rounded-2xl py-3 text-white text-[11px] md:text-[12px] font-semibold leading-tight shadow-lg transition-transform hover:scale-105 whitespace-pre-line"
          style={{ backgroundColor: accent }}
        >
          {ctaLabel || "상담\n예약"}
        </button>
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

      {phone && (
        <a
          href={`tel:${String(phone).replace(/[^0-9+]/g, "")}`}
          aria-label={phone}
          title={phone}
          className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg bg-white border border-black/10 transition-transform hover:scale-110"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ fill: accent }} aria-hidden="true">
            <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z" />
        </svg>
        </a>
      )}
    </div>
  );
}

/** 좁은 화면(폰) 하단 고정 바 — 상담 버튼 하나만 있으면 전화·메신저를 놓친다. */
export function MobileBar({ channels, accent, onInquiry, phone, ctaLabel }) {
  const first = CHANNELS.find((c) => channels?.[c.key]);
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden flex border-t border-black/10 bg-white/95 backdrop-blur">
      {phone && (
        <a
          href={`tel:${String(phone).replace(/[^0-9+]/g, "")}`}
          className="flex-1 py-3.5 text-center text-[13px] font-medium border-r border-black/10"
          style={{ color: accent }}
        >
          {phone}
        </a>
      )}
      {first && (
        <a
          href={channels[first.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3.5 text-center text-[13px] font-medium text-white"
          style={{ backgroundColor: first.color }}
        >
          {first.label}
        </a>
      )}
      <button
        onClick={onInquiry}
        className="flex-1 py-3.5 text-center text-[13px] font-semibold text-white"
        style={{ backgroundColor: accent }}
      >
        {ctaLabel || "Consult"}
      </button>
    </div>
  );
}
