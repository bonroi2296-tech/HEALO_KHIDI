"use client";

/**
 * 판의 속 페이지 — 병원 소개·진료 안내·의료진·해외 환자 안내·오시는 길.
 *
 * 페이지 하나 = `{ title, subtitle, blocks: [...] }`. **블록 목록만 데이터로 주면 페이지가 생긴다.**
 * 그래서 새 병원을 태울 때 화면을 짜는 게 아니라 **데이터를 채운다** — 그게 판이다.
 */

import { HospitalHeader, HospitalFooter, PageHero } from "./HospitalChrome";
import QuickRail, { AnnouncementBar, MobileBar } from "./QuickRail";
import InquiryForm from "./InquiryForm";
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
    <div className="bg-[#FBF8F3] text-[#16211C] antialiased min-h-screen flex flex-col pb-[52px] sm:pb-0">
      <AnnouncementBar text={t(site.announcement?.text)} href={site.announcement?.href} darkTone={darkTone} />
      <HospitalHeader site={site} lang={lang} accent={accent} onInquiry={onInquiry} basePath={basePath} current={slug} />
      <PageHero title={t(page.title)} subtitle={t(page.subtitle)} darkTone={darkTone} />

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

      {/* 어느 페이지에 있든 상담으로 «돌아올 길»이 아니라 «신청할 자리»가 있어야 한다.
          탭에만 버튼을 두면 홈에서 폼을 본 사람이 탭으로 들어온 순간 다시 버튼만 남는다
          (검색으로 속 페이지에 바로 들어오는 사람이 많다). 홈과 같은 폼을 그대로 쓴다. */}
      <section className="py-16 md:py-24" style={{ backgroundColor: darkTone }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2
              className="text-white text-3xl md:text-5xl font-semibold leading-[1.08]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "-0.025em" }}
            >
              {t(site.closing?.title)}
            </h2>
            {t(site.closing?.subtitle) && (
              <p className="mt-5 text-white/60 text-base leading-relaxed whitespace-pre-line">
                {t(site.closing.subtitle)}
              </p>
            )}
            <dl className="mt-8 space-y-4 text-[15px]">
              {[
                [site.labels?.address, t(site.contact?.address)],
                [site.labels?.phone, site.contact?.phone],
                [site.labels?.hours, t(site.contact?.hours)],
              ].map(([k, v], i) =>
                v ? (
                  <div key={i} className="flex gap-5">
                    <dt className="w-24 shrink-0 text-white/35 text-[13px] pt-0.5">{t(k)}</dt>
                    <dd className="text-white/80 leading-relaxed">{v}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </div>

          {site.inquiryForm ? (
            <InquiryForm
              form={site.inquiryForm}
              contact={site.contact}
              lang={lang}
              accent={accent}
              labels={site.inquiryForm.labels || {}}
            />
          ) : (
            <button
              onClick={onInquiry}
              className="px-9 py-4 rounded-full text-white text-base font-medium shadow-xl transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: accent }}
            >
              {t(site.hero?.primaryCta) || "Consult Now"}
            </button>
          )}
        </div>
      </section>

      <HospitalFooter site={site} lang={lang} darkTone={darkTone} />

      {/* 오른쪽 고정 묶음(상담예약 + 메신저 + 전화). 폰에서는 아래 가로 바로 대신한다. */}
      <QuickRail
        channels={site.contact?.channels}
        accent={accent}
        label={t(site.labels?.chat)}
        onInquiry={onInquiry}
        phone={site.contact?.phone}
        ctaLabel={t(site.labels?.quickCta)}
      />
      <MobileBar
        channels={site.contact?.channels}
        accent={accent}
        onInquiry={onInquiry}
        phone={site.contact?.phone}
        ctaLabel={t(site.hero?.primaryCta)}
      />
    </div>
  );
}
