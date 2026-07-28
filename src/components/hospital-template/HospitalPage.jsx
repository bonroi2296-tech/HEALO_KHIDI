"use client";

/**
 * 판의 속 페이지 — 병원 소개·진료 안내·의료진·해외 환자 안내·오시는 길.
 *
 * 페이지 하나 = `{ title, subtitle, blocks: [...] }`. **블록 목록만 데이터로 주면 페이지가 생긴다.**
 * 그래서 새 병원을 태울 때 화면을 짜는 게 아니라 **데이터를 채운다** — 그게 판이다.
 */

import { HospitalHeader, HospitalFooter, PageHero } from "./HospitalChrome";
import { Block } from "./blocks";

const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};

const FALLBACK_ACCENT = "#0F3D2E";

export default function HospitalPage({ site, page, slug, lang = "en", onInquiry, basePath = "" }) {
  if (!site || !page) return null;
  const t = (v) => pick(v, lang);
  const accent = site.brand?.accent || FALLBACK_ACCENT;
  const darkTone = site.brand?.darkTone || "#0C2233";
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];

  return (
    <div className="bg-[#FBF8F3] text-[#16211C] antialiased min-h-screen flex flex-col">
      <HospitalHeader site={site} lang={lang} accent={accent} onInquiry={onInquiry} basePath={basePath} current={slug} />
      <PageHero title={t(page.title)} subtitle={t(page.subtitle)} accent={accent} darkTone={darkTone} />

      <main className="flex-1">
        {blocks.map((block, i) => (
          // 배경을 번갈아 — 블록이 여러 개일 때 경계가 안 보이면 한 덩어리로 읽힌다.
          <section
            key={i}
            className={`py-14 md:py-20 ${block.tone === "sand" || (block.tone == null && i % 2 === 1) ? "bg-[#F4EFE7]" : "bg-[#FBF8F3]"}`}
          >
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <Block block={block} lang={lang} accent={accent} />
            </div>
          </section>
        ))}
      </main>

      {/* 어느 페이지에 있든 상담으로 돌아올 길 — 병원 사이트의 목적은 상담 요청 하나다. */}
      <section className="py-16 md:py-20" style={{ backgroundColor: darkTone }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 text-center">
          <h2
            className="text-white text-2xl md:text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {t(site.closing?.title)}
          </h2>
          {t(site.closing?.subtitle) && (
            <p className="mt-4 text-white/60 text-base leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
              {t(site.closing.subtitle)}
            </p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onInquiry}
              className="px-9 py-4 rounded-full text-white text-base font-medium shadow-xl transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: accent }}
            >
              {t(site.hero?.primaryCta) || "Consult Now"}
            </button>
            {site.contact?.phone && (
              <a
                href={`tel:${String(site.contact.phone).replace(/[^0-9+]/g, "")}`}
                className="px-9 py-4 rounded-full border border-white/25 text-white text-base font-medium hover:bg-white/10 transition-colors"
              >
                {site.contact.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <HospitalFooter site={site} lang={lang} darkTone={darkTone} />

      <button
        onClick={onInquiry}
        className="fixed bottom-5 right-5 z-40 md:hidden px-6 py-3.5 rounded-full text-white text-sm font-medium shadow-2xl"
        style={{ backgroundColor: accent }}
      >
        {t(site.hero?.primaryCta) || "Consult Now"}
      </button>
    </div>
  );
}
