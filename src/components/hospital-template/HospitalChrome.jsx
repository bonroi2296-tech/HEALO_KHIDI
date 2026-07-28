"use client";

/**
 * 판의 헤더·푸터 — 홈과 속 페이지가 **같은 껍데기**를 쓰게 하는 부품.
 *
 * 왜 분리했나: 홈에만 헤더가 있고 속 페이지가 다르면 «다른 사이트»로 읽힌다.
 * 탭(속 페이지)이 생기면서 헤더에 메뉴가 필요해졌는데, 그 메뉴도 **데이터에서 온다**
 * (`site.nav`) — 병원마다 페이지 구성이 다르므로 판이 목록을 고정하면 안 된다.
 */

import Link from "next/link";

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

      {/* 좁은 화면 메뉴 — 가로로 흐른다(접이식 메뉴보다 한 번에 보인다). */}
      {nav.length > 0 && (
        <div className="lg:hidden border-t border-black/[0.05] overflow-x-auto">
          <nav className="flex items-center gap-5 px-5 py-3 min-w-max">
            {nav.map((n) => (
              <Link
                key={n.slug}
                href={`${basePath}/${n.slug}${q}`}
                className="text-[13px] whitespace-nowrap"
                style={{ color: current === n.slug ? accent : "rgba(0,0,0,0.55)", fontWeight: current === n.slug ? 600 : 400 }}
              >
                {t(n.label)}
              </Link>
            ))}
          </nav>
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
    <section className="py-14 md:py-20" style={{ backgroundColor: darkTone }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <h1 className="text-white text-3xl md:text-5xl font-semibold tracking-tight leading-[1.12]" style={SERIF}>
          {title}
        </h1>
        {subtitle && <p className="mt-5 text-white/60 text-base md:text-lg leading-relaxed max-w-2xl whitespace-pre-line">{subtitle}</p>}
      </div>
    </section>
  );
}
