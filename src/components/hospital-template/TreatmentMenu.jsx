"use client";

/**
 * 「내 경우엔 뭘 받나」를 **한 화면에서 골라 보는** 자리.
 *
 * 왜 만들었나 (2026-07-29, 유앤아이의원 실제 화면을 띄워 보고):
 *   그 사이트 한가운데는 **필터 칩 20여 개 + 가격 카드 격자**였다. 방문자가 «리프팅»을 누르면
 *   그것만 남는다. 즉 화면이 **묻지 않고 고르게** 한다. 반면 내 판은 진료 분야 카드 3장이
 *   전부라, 방문자가 «그래서 내 암은?» 을 물으려면 상담을 걸어야만 했다 = 이탈 지점.
 *
 * ⚠️ 성형외과처럼 **할인가를 크게 박는 방식은 그대로 못 쓴다** — 암 치료는 상태에 따라
 *   달라져서 «정찰가»가 존재하지 않고, 확정 안 된 금액을 적으면 그게 허위가 된다.
 *   대신 해외 환자가 실제로 궁금해하는 **①기간 ②포함 내역 ③입원 여부**를 카드에 박는다.
 *   금액은 병원이 확정해 주면 `priceNote` 한 줄로만 (없으면 그 줄이 안 뜬다).
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { Reveal } from "./motion";

const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};

export default function TreatmentMenu({ menu, lang = "en", accent, onInquiry, labels = {} }) {
  const t = (v) => pick(v, lang);
  const items = Array.isArray(menu?.items) ? menu.items : [];
  const [tag, setTag] = useState("all");

  // 칩 목록은 **자료에서 자동으로** 뽑는다 — 병원마다 다루는 암종이 달라서
  // 판이 목록을 고정하면 다음 병원에서 바로 틀린다.
  const tags = useMemo(() => {
    const seen = new Map();
    items.forEach((it) => (it.tags || []).forEach((g) => { if (!seen.has(g.key)) seen.set(g.key, g); }));
    return [...seen.values()];
  }, [items]);

  const shown = tag === "all" ? items : items.filter((it) => (it.tags || []).some((g) => g.key === tag));
  if (items.length === 0) return null;

  const chip = (key, label) => {
    const on = tag === key;
    return (
      <button
        key={key}
        onClick={() => setTag(key)}
        aria-pressed={on}
        className="px-4 py-2 rounded-full text-[13px] md:text-sm whitespace-nowrap border transition-colors"
        style={
          on
            ? { backgroundColor: accent, borderColor: accent, color: "#fff", fontWeight: 600 }
            : { borderColor: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.62)", backgroundColor: "#fff" }
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      {/* 칩 줄 — 좁은 화면에선 가로로 흐른다(접으면 뭐가 있는지 안 보인다). */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-8 -mx-5 px-5 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chip("all", t(labels.all) || "All")}
        {tags.map((g) => chip(g.key, t(g.label)))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((it, i) => (
          <Reveal
            key={`${tag}-${i}`}
            delay={i * 70}
            y={18}
            className="group bg-white rounded-2xl overflow-hidden border border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition-all duration-300 flex flex-col"
          >
            {/* 2026-07-31 사진 비율 16:10 → 4:3. PO: *"텍스트랑 이미지가 최적화가 안된거 같은데"*
                실측 — 카드 높이 ~500px 중 사진이 ~130px(26%)였다. 글이 카드의 4분의 3이었던 셈.
                비율만 바꿔도 사진이 ~1.25배 커진다(글은 그대로 두고 «보는 몫»만 늘린다).
                ⚠️ 이 주석을 `{it.image && (` 괄호 **안**에 넣었다가 화면이 500 으로 죽었다 —
                   그 괄호 안엔 요소가 하나만 올 수 있다. JSX 주석은 조건식 바깥에 둔다. */}
            {it.image && (
              <div className="relative aspect-[4/3] overflow-hidden bg-[#EDE6DA]">
                <Image
                  src={it.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
            )}
            <div className="p-5 md:p-6 flex flex-col flex-1">
              {/* 어떤 암종에 해당하는지 — 방문자가 «내 얘긴가»를 0.5초에 판단하는 지점 */}
              {(it.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {/* 모든 암종에 해당하는 치료는 칩이 6개까지 붙어 카드 절반을 먹는다
                      → 3개만 보이고 나머지는 «+N». 거르는 데는 전부 쓰이되 눈에는 안 시끄럽게. */}
                  {it.tags.slice(0, 3).map((g) => (
                    <span
                      key={g.key}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: `${accent}14`, color: accent }}
                    >
                      {t(g.label)}
                    </span>
                  ))}
                  {it.tags.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-black/40 bg-black/[0.05]">
                      +{it.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
              <h3 className="text-lg md:text-xl font-semibold mb-2.5 tracking-tight">{t(it.title)}</h3>
              <p className="text-[15px] text-black/55 leading-relaxed mb-4">{t(it.desc)}</p>

              {/* 해외 환자가 실제로 묻는 3가지. 없는 값은 그 줄이 통째로 안 뜬다. */}
              <dl className="mt-auto space-y-2 pt-4 border-t border-black/[0.07] text-[14px]">
                {[
                  [labels.duration, it.duration],
                  [labels.includes, it.includes],
                  [labels.stay, it.stay],
                  /* 2026-07-31 — 가격은 원래 표 «밖»에 따로 떠 있는 문단이었다. 카드마다 2~4줄로
                     길이가 달라 **버튼 줄이 카드마다 어긋났다**(PO 가 본 «최적화 안 된» 느낌의 정체 중 하나).
                     같은 표의 한 줄로 넣으면 이름표 자리가 맞아 세 카드가 나란히 선다. */
                  [labels.price, it.priceNote],
                ].map(([k, v], j) =>
                  t(v) ? (
                    /* ⚠️ 이름표 칸이 `w-20`(80px) 고정이라 **긴 낱말이 단어 중간에서 잘렸다.**
                       2026-07-29 휴대폰에서 러시아어를 보니 「Пребывание」(체류)이 «Пребыван / ие» 로
                       쪼개져 오타처럼 보였다. 한국어(3~4자)만 보고 정한 폭이라 안 드러났던 것 —
                       **칸 폭을 글자 수로 정하면 언어가 바뀔 때 반드시 깨진다.**
                       → 좁은 화면에서는 위아래로 쌓고(이름표 한 줄, 값 한 줄), 넓은 화면에서만 두 칸으로.
                       `break-keep` 으로 낱말 중간 줄바꿈도 막는다. */
                    <div key={j} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
                      <dt className="sm:w-24 sm:shrink-0 text-black/40 [word-break:keep-all]">{t(k)}</dt>
                      <dd className="text-black/70 flex-1">{t(v)}</dd>
                    </div>
                  ) : null,
                )}
              </dl>

              <button
                onClick={onInquiry}
                className="mt-4 w-full py-3 rounded-full text-[14px] font-medium border transition-colors hover:bg-black/[0.03]"
                style={{ borderColor: `${accent}33`, color: accent }}
              >
                {t(labels.ask) || "Ask about this"}
              </button>
            </div>
          </Reveal>
        ))}
      </div>

      {/* 왜 금액이 안 적혀 있는지 **화면에서 먼저 설명한다** — 안 그러면 «숨긴다»로 읽힌다. */}
      {t(menu.note) && (
        <p className="mt-8 text-[13px] text-black/45 leading-relaxed max-w-3xl">{t(menu.note)}</p>
      )}
    </div>
  );
}
