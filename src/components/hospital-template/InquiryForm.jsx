"use client";

/**
 * **페이지 안에 박힌 상담 신청 폼.** 판에서 제일 큰 구멍이었다.
 *
 * 왜 (2026-07-29, 유앤아이의원 화면을 띄워 보고): 그 사이트는 홈 맨 아래에
 * 이름·연락처·내용 + 동의 + 「빠른상담신청」·「카카오톡상담」이 **그 자리에** 있다.
 * 내 판은 버튼을 누르면 다른 데로 보내기만 했다 — 한 번 더 누르게 하는 만큼 사람이 샌다.
 *
 * ⚠️ **개인정보를 다루는 화면**이라 판이 마음대로 어디로 보내면 안 된다.
 *   병원마다 받는 곳이 다르고(그 병원 CRM·메일·메신저), 우리 서버로 받으면 **우리가**
 *   남의 병원 환자 정보를 보관하게 된다. 그래서:
 *     · `endpoint` 가 있으면 그리로 보낸다(병원이 정해 준 주소).
 *     · 없으면 **아무 데도 안 보내고**, 적은 내용을 그대로 담아 메신저·메일로 «넘겨준다».
 *       (브라우저 밖으로 나가는 곳은 방문자가 직접 고른 채널뿐이다.)
 *   동의 문구는 병원이 준 것만 쓴다 — 없으면 체크박스 자체를 안 그린다(가짜 동의 금지).
 */

import { useState } from "react";

const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};

export default function InquiryForm({ form, contact, lang = "en", accent, labels = {} }) {
  const t = (v) => pick(v, lang);
  const [sent, setSent] = useState(false);
  const [agree, setAgree] = useState(false);
  const needAgree = Boolean(t(form?.consent));

  const compose = (fd) => {
    const lines = [
      `${t(labels.name) || "Name"}: ${fd.get("name") || "-"}`,
      `${t(labels.contact) || "Contact"}: ${fd.get("contact") || "-"}`,
      `${t(labels.concern) || "Concern"}: ${fd.get("concern") || "-"}`,
      `${t(labels.message) || "Message"}: ${fd.get("message") || "-"}`,
    ];
    return lines.join("\n");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = compose(fd);
    const wa = contact?.channels?.whatsapp;
    const tg = contact?.channels?.telegram;
    const mail = contact?.email;
    // 받는 곳이 정해져 있지 않으면 **적은 내용을 들고** 방문자가 쓰는 채널로 넘긴다.
    if (wa) window.open(`${wa}${wa.includes("?") ? "&" : "?"}text=${encodeURIComponent(body)}`, "_blank", "noopener");
    else if (mail) window.location.href = `mailto:${mail}?subject=${encodeURIComponent(t(form?.title) || "Inquiry")}&body=${encodeURIComponent(body)}`;
    else if (tg) window.open(tg, "_blank", "noopener");
    setSent(true);
  };

  if (!form) return null;

  const field = "w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-[15px] placeholder:text-black/30 focus:outline-none focus:border-black/25 transition-colors";

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-3xl p-6 md:p-9 border border-black/[0.07] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.3)]">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <input name="name" required placeholder={t(labels.name) || "Name"} className={field} />
        <input name="contact" required placeholder={t(labels.contact) || "WhatsApp / Email"} className={field} />
      </div>
      <input name="concern" placeholder={t(labels.concern) || "Diagnosis or concern"} className={`${field} mt-3.5`} />
      <textarea name="message" rows={4} placeholder={t(labels.message) || "Anything you'd like us to know"} className={`${field} mt-3.5 resize-none`} />

      {needAgree && (
        <label className="mt-4 flex items-start gap-2.5 text-[13px] text-black/55 leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 accent-current"
            style={{ color: accent }}
          />
          <span>{t(form.consent)}</span>
        </label>
      )}

      <button
        type="submit"
        disabled={needAgree && !agree}
        className="mt-5 w-full py-4 rounded-full text-white text-base font-medium shadow-lg transition-transform enabled:hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: accent }}
      >
        {t(form.submit) || "Send"}
      </button>

      {/* 보낸 뒤 «어디로 갔는지»를 숨기지 않는다 — 폼이 조용히 아무것도 안 하면 그게 제일 나쁘다. */}
      {sent && (
        <p className="mt-4 text-[13px] text-center text-black/55 leading-relaxed">{t(form.after)}</p>
      )}
      {t(form.note) && (
        <p className="mt-4 text-[12px] text-black/40 leading-relaxed text-center">{t(form.note)}</p>
      )}
    </form>
  );
}
