"use client";

/**
 * 판의 헤더·푸터 — 홈과 속 페이지가 **같은 껍데기**를 쓰게 하는 부품.
 *
 * 왜 분리했나: 홈에만 헤더가 있고 속 페이지가 다르면 «다른 사이트»로 읽힌다.
 * 탭(속 페이지)이 생기면서 헤더에 메뉴가 필요해졌는데, 그 메뉴도 **데이터에서 온다**
 * (`site.nav`) — 병원마다 페이지 구성이 다르므로 판이 목록을 고정하면 안 된다.
 */

import Link from "next/link";
import { Reveal } from "./motion";

const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};
const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" };

export function HospitalHeader({ site, lang, accent, onInquiry, basePath = "", current }) {
  const t = (v) => pick(v, lang);
  const brandName = t(site.brand?.name);
  const nav = Array.isArray(site.nav) ? site.nav : [];
  const q = lang ? `?lang=${lang}` : "";

  return (
    <header className="sticky top-0 z-30 bg-[#FBF8F3]/88 backdrop-blur-md border-b border-black/[0.06]">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-4">
        <Link href={`${basePath}${q}`} className="flex items-center gap-3 min-w-0 shrink-0">
          {site.brand?.logoUrl ? (
            <img src={site.brand.logoUrl} alt={brandName} className="h-7 md:h-8 w-auto object-contain" />
          ) : (
            <span className="text-[17px] md:text-xl font-semibold tracking-tight truncate" style={{ ...SERIF, color: accent }}>
              {brandName}
            </span>
          )}
        </Link>

        {/* 메뉴는 데이터에서. 좁은 화면에서는 가로 스크롤 — 이름이 긴 언어(러시아어)에서
            메뉴가 겹치던 문제를 «줄이기»가 아니라 «흐르게»로 푼다. */}
        {nav.length > 0 && (
          <nav className="hidden lg:flex items-center gap-6 overflow-x-auto min-w-0">
            {nav.map((n) => {
              const active = current === n.slug;
              return (
                <Link
                  key={n.slug}
                  href={`${basePath}/${n.slug}${q}`}
                  className="text-sm whitespace-nowrap transition-colors hover:opacity-70"
                  style={{ color: active ? accent : "rgba(0,0,0,0.6)", fontWeight: active ? 600 : 400 }}
                >
                  {t(n.label)}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {site.contact?.phone && (
            <a
              href={`tel:${String(site.contact.phone).replace(/[^0-9+]/g, "")}`}
              className="hidden xl:block text-sm text-black/55 hover:text-black/80 transition-colors tabular-nums"
            >
              {site.contact.phone}
            </a>
          )}
          <button
            onClick={onInquiry}
            className="px-5 py-2.5 rounded-full text-white text-[13px] md:text-sm font-medium transition-transform hover:scale-[1.03] whitespace-nowrap"
            style={{ backgroundColor: accent }}
          >
            {t(site.hero?.primaryCta) || "Consult Now"}
          </button>
        </div>
      </div>

      {/* 좁은 화면 메뉴 — 가로로 흐른다(접이식 메뉴보다 한 번에 보인다).
          ⚠️ 2026-07-29 휴대폰(390px)에서 실제로 보니, 마지막 항목이 **단어 중간에서 뚝 잘려** 있었다
             (러시아어 «Иностранным пацие…»). 넘길 수 있는 줄인데 그 표시가 없어서
             «옆으로 더 있다»가 아니라 «깨졌다»로 읽힌다 — 이름이 긴 언어일수록 심하다.
          → 오른쪽 끝에 **흐려지는 띠**를 얹어 «여기서 끝이 아니다»를 보이게 하고,
             마지막 항목 뒤에 여백을 둬 띠에 글자가 묻히지 않게 한다.
             띠는 `pointer-events-none` 이라 누르는 걸 막지 않는다. */}
      {nav.length > 0 && (
        <div className="lg:hidden relative border-t border-black/[0.05]">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="flex items-center gap-5 px-5 py-3 min-w-max">
              {nav.map((n) => (
                <Link
                  key={n.slug}
                  href={`${basePath}/${n.slug}${q}`}
                  className="text-[13px] whitespace-nowrap last:pr-8"
                  style={{ color: current === n.slug ? accent : "rgba(0,0,0,0.55)", fontWeight: current === n.slug ? 600 : 400 }}
                >
                  {t(n.label)}
                </Link>
              ))}
            </nav>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10"
            /* ⚠️ 헤더 배경(`bg-[#FBF8F3]`)과 **똑같은 색**이어야 한다 — 한 끗만 달라도 띠가 «얼룩»으로 보인다.
               (처음엔 #FAF7F2 로 적었다가 배경을 확인하고 맞췄다.) */
            style={{ background: "linear-gradient(to right, rgba(251,248,243,0), rgba(251,248,243,1))" }}
          />
        </div>
      )}
    </header>
  );
}

export function HospitalFooter({ site, lang, darkTone }) {
  const t = (v) => pick(v, lang);
  return (
    <footer className="text-white/45 py-12" style={{ backgroundColor: darkTone }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 text-[13px] space-y-1.5">
        <div className="text-white/85 font-medium text-base mb-3" style={SERIF}>
          {t(site.brand?.name)}
        </div>
        {t(site.contact?.address) && <div>{t(site.contact.address)}</div>}
        {site.contact?.phone && <div>{site.contact.phone}</div>}
        {site.contact?.email && <div>{site.contact.email}</div>}
        {t(site.legalNote) && <div className="pt-3 text-white/30">{t(site.legalNote)}</div>}
      </div>
    </footer>
  );
}

/** 속 페이지 상단 — 제목 띠. 홈의 히어로 자리를 대신한다. */
export function PageHero({ title, subtitle, darkTone }) {
  return (
    <section className="py-16 md:py-28" style={{ backgroundColor: darkTone }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <Reveal
          as="h1"
          className="text-white text-4xl md:text-[4rem] font-semibold leading-[1.05] max-w-4xl"
          style={{ ...SERIF, letterSpacing: "-0.03em" }}
        >
          {title}
        </Reveal>
        {subtitle && (
          <Reveal as="p" delay={120} className="mt-6 text-white/60 text-base md:text-lg leading-relaxed max-w-2xl whitespace-pre-line">
            {subtitle}
          </Reveal>
        )}
      </div>
    </section>
  );
}
