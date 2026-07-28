"use client";

/**
 * 병원 사이트 「판」 v1 — B2B 로 병원에 찍어낼 템플릿.
 *
 * ⚠️ **healwith 사이트가 아니다.** 재사용이 아니라 별도 제품이다.
 *   · healwith = 중개자 → "왜 한국인가"(국가를 팔고 병원을 연결) · DESIGN.md teal 톤
 *   · 이 판     = 병원 본인 → "왜 우리인가"(경력·실적·의료진·인증) · 아래 자체 톤
 *   PO 지시(2026-07-28): "힐위드 포맷으로 하지 말고 외국인이 좋아하는 요즘 스타일로."
 *
 * 구조는 해외 환자용 병원 사이트의 사실상 표준을 따랐다(dekabi.com 실측 + 업계 통례):
 *   히어로 → 신뢰 숫자 → 진료 분야 → 왜 우리인가 → 의료진 → 프로그램
 *   → 후기 → 인증 → FAQ → 마무리 CTA, 그리고 **상담 버튼이 계속 따라다닌다.**
 *
 * 톤 (healwith 와 의도적으로 다르게):
 *   · 바탕 = 따뜻한 화이트(모래빛)  ← healwith 는 순백 + teal
 *   · 강조 = 딥 포레스트 그린        ← healwith 는 teal-600
 *   · 제목 = 세리프                  ← healwith 는 전부 산세리프
 *   · 섹션 라벨 = 작은 대문자 + 넓은 자간 (해외 의료 사이트의 관용구)
 *
 * 데이터: `src/lib/tenant/siteSchema.js` 형태. 빈 칸이면 그 블록을 통째로 안 그린다
 *        (자리표시자를 넣으면 그 글자가 화면에 뜬다 — 2026-07-28 에 실제로 겪음).
 */

import { useState } from "react";
import Image from "next/image";

// 판 기본 강조색. 병원마다 `brand.accent` 로 덮어쓴다 — 색은 판이 정하는 게 아니라
// **그 병원 로고에서 뽑는다**(면력은 로고 SVG 에서 #003D66 이 66회 나왔다).
const FALLBACK_ACCENT = "#0F3D2E";

/* 다국어 값 꺼내기: 문자열이면 그대로, 언어맵이면 그 언어 → en → 첫 값. */
const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};

const has = (arr) => Array.isArray(arr) && arr.length > 0;

/* 섹션 라벨 — 작은 대문자 + 넓은 자간. 해외 의료 사이트의 관용 표현. */
function Eyebrow({ children, accent }) {
  if (!children) return null;
  return (
    <p
      className="text-[11px] md:text-xs font-semibold uppercase mb-3"
      style={{ letterSpacing: "0.18em", color: accent }}
    >
      {children}
    </p>
  );
}

function Section({ id, children, tone = "light", className = "", darkTone }) {
    const bg = tone === "sand" ? "bg-[#F4EFE7]" : tone === "ink" ? "" : "bg-[#FBF8F3]";
  const style = tone === "ink" ? { backgroundColor: darkTone || "#0C2233" } : undefined;
  return (
    <section id={id} className={`${bg} py-16 md:py-24 ${className}`} style={style}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">{children}</div>
    </section>
  );
}

function Heading({ children, tone = "dark", size = "lg" }) {
  const color = tone === "light" ? "text-white" : "text-[#16211C]";
  const cls = size === "xl" ? "text-3xl md:text-5xl" : "text-2xl md:text-4xl";
  return (
    <h2 className={`${cls} ${color} font-semibold leading-[1.15] tracking-tight`} style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {children}
    </h2>
  );
}

export default function HospitalSite({ site, lang = "en", onInquiry }) {
  const [openFaq, setOpenFaq] = useState(null);
  if (!site) return null;

  const t = (v) => pick(v, lang);
  const accent = site.brand?.accent || FALLBACK_ACCENT;
  const brandName = t(site.brand?.name);
  // 어두운 면(신뢰 숫자 바·후기·마무리·푸터)은 강조색을 깊게 눌러 만든다.
  // 고정 색을 쓰면 어느 병원이든 같은 검정이 되어 «판 티»가 난다.
  const darkTone = site.brand?.darkTone || "#0C2233";

  return (
    <div className="bg-[#FBF8F3] text-[#16211C] antialiased">
      {/* ══ 판 자체 헤더 — 병원 사이트지 healwith 사이트가 아니다 ══
          메뉴를 길게 달지 않는다: 해외 환자용 병원 사이트의 목적은 «상담 요청 하나»이고,
          메뉴가 많을수록 나갈 길만 늘어난다(dekabi 도 상단 CTA 하나). */}
      <header className="sticky top-0 z-30 bg-[#FBF8F3]/88 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {site.brand?.logoUrl ? (
              <img src={site.brand.logoUrl} alt={brandName} className="h-7 md:h-8 w-auto object-contain" />
            ) : (
              <span
                className="text-[17px] md:text-xl font-semibold tracking-tight truncate"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: accent }}
              >
                {brandName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {site.contact?.phone && (
              <a
                href={`tel:${String(site.contact.phone).replace(/[^0-9+]/g, "")}`}
                className="hidden md:block text-sm text-black/55 hover:text-black/80 transition-colors tabular-nums"
              >
                {site.contact.phone}
              </a>
            )}
            <button
              onClick={onInquiry}
              className="px-5 py-2.5 rounded-full text-white text-[13px] md:text-sm font-medium transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: accent }}
            >
              {t(site.hero?.primaryCta) || "Consult Now"}
            </button>
          </div>
        </div>
      </header>

      {/* ══ 히어로 — 좌우 분할 ══
          ⚠️ 처음엔 «사진 전면 + 어두운 오버레이 + 흰 글자»로 만들었는데 PO 지적: "너무 AI 톤".
             맞는 지적이었다. 그 조합은 스톡 사진을 아무거나 깔아도 그럴듯해 보이는 형태라
             **어느 병원이든 똑같아 보인다** = 템플릿 냄새의 정체.
             실제 병원 사진(로비·시설)은 밝고 따뜻해서 어둡게 덮으면 그 병원다움이 통째로 죽는다.
             → 사진을 덮지 않고 **옆에 그대로 세운다.** 글자는 병원 인테리어 톤의 배경 위에 앉는다. */}
      <section className="grid lg:grid-cols-[1.05fr_1fr] items-stretch">
        <div className="flex items-center px-5 md:px-10 lg:pl-[max(2rem,calc((100vw-72rem)/2+2rem))] lg:pr-14 py-16 md:py-24 lg:py-28">
          <div className="max-w-xl">
            {t(site.hero?.eyebrow) && (
              <p
                className="text-[11px] md:text-xs font-semibold uppercase mb-5"
                style={{ letterSpacing: "0.2em", color: accent }}
              >
                {t(site.hero.eyebrow)}
              </p>
            )}
            <h1
              className="text-[2.1rem] leading-[1.14] md:text-5xl md:leading-[1.1] font-semibold tracking-tight whitespace-pre-line text-[#16211C]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {t(site.hero?.title)}
            </h1>
            {t(site.hero?.subtitle) && (
              <p className="mt-6 text-black/60 text-base md:text-lg leading-relaxed whitespace-pre-line">
                {t(site.hero.subtitle)}
              </p>
            )}
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onInquiry}
                className="px-8 py-4 rounded-full text-white text-base font-medium transition-transform hover:scale-[1.02] shadow-lg"
                style={{ backgroundColor: accent }}
              >
                {t(site.hero?.primaryCta) || "Consult Now"}
              </button>
              {t(site.hero?.secondaryCta) && (
                <a
                  href={site.contact?.channels?.whatsapp || "#contact"}
                  className="px-8 py-4 rounded-full border text-base font-medium text-center transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: `${accent}33`, color: accent }}
                >
                  {t(site.hero.secondaryCta)}
                </a>
              )}
            </div>
          </div>
        </div>
        {site.hero?.image && (
          <div className="relative min-h-[42vh] lg:min-h-[86vh]">
            <Image
              src={site.hero.image}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )}
      </section>

      {/* ══ 신뢰 숫자 — 히어로 바로 아래(의료관광 사이트의 사실상 표준) ══ */}
      {has(site.proof) && (
        <div style={{ backgroundColor: darkTone }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
            {site.proof.map((p, i) => (
              <div key={i} className="text-center md:border-r md:last:border-r-0 border-white/12 px-2">
                <div
                  className="text-2xl md:text-4xl font-semibold text-white tracking-tight"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {t(p.value)}
                </div>
                <div className="mt-2 text-[11px] md:text-sm text-white/60 leading-snug whitespace-pre-line">
                  {t(p.label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ 진료 분야 ══ */}
      {has(site.specialties) && (
        <Section id="specialties">
          <div className="max-w-2xl mb-12">
            <Eyebrow accent={accent}>{t(site.labels?.specialties) || "Specialties"}</Eyebrow>
            <Heading>{t(site.specialtiesTitle) || t(site.labels?.specialtiesHeading)}</Heading>
          </div>
          {/* 카드에 사진이 있으면 위에 얹는다 — 글자 카드만 늘어놓으면 아래로 갈수록 밋밋해진다.
              사진이 없는 병원은 색 막대만 뜨고 레이아웃은 그대로(빈 자리가 안 생긴다). */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {site.specialties.map((s, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl overflow-hidden border border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition-all duration-300"
              >
                {s.image && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#EDE6DA]">
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                )}
                <div className="p-7">
                  {!s.image && (
                    <div
                      className="w-10 h-[3px] rounded-full mb-5 transition-all duration-300 group-hover:w-16"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                  <h3 className="text-lg md:text-xl font-semibold mb-3 tracking-tight">{t(s.title)}</h3>
                  <p className="text-[15px] text-black/55 leading-relaxed">{t(s.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 왜 우리인가 — 국가 자랑이 아니라 이 병원의 이유 ══ */}
      {has(site.whyUs) && (
        <Section tone="sand">
          <div className="max-w-2xl mb-12">
            <Eyebrow accent={accent}>{t(site.labels?.whyUs) || "Why Choose Us"}</Eyebrow>
            <Heading>{t(site.whyUsTitle)}</Heading>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {site.whyUs.map((w, i) => (
              <div key={i}>
                <div
                  className="text-4xl md:text-5xl font-light mb-4 opacity-25"
                  style={{ fontFamily: "Georgia, serif", color: accent }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-3 tracking-tight">{t(w.title)}</h3>
                <p className="text-[15px] text-black/55 leading-relaxed">{t(w.desc)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 의료진 — 얼굴이 신뢰의 핵심 ══ */}
      {has(site.doctors) && (
        <Section>
          <div className="max-w-2xl mb-12">
            <Eyebrow accent={accent}>{t(site.labels?.doctors) || "Medical Team"}</Eyebrow>
            <Heading>{t(site.doctorsTitle)}</Heading>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
            {site.doctors.map((d, i) => (
              <div key={i}>
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#EDE6DA] mb-4">
                  {d.photo && (
                    <Image src={d.photo} alt={t(d.name)} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover object-top" />
                  )}
                </div>
                <h3 className="font-semibold text-[15px] md:text-base tracking-tight">{t(d.name)}</h3>
                <p className="text-[13px] mt-1" style={{ color: accent }}>{t(d.title)}</p>
                {t(d.credentials) && (
                  <p className="text-[13px] text-black/45 mt-1.5 leading-snug">{t(d.credentials)}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 시설 갤러리 ══
          해외 환자는 «가 본 적 없는 나라의 병원»을 사진으로만 판단한다. 공간을 보여주는 것이
          문장 열 줄보다 낫다 — dekabi 도 시설·의료진 사진 비중이 크다.
          사진이 없는 병원은 이 섹션이 통째로 안 뜬다. */}
      {has(site.gallery) && (
        <Section>
          <div className="max-w-2xl mb-12">
            <Eyebrow accent={accent}>{t(site.labels?.gallery) || "Our Space"}</Eyebrow>
            <Heading>{t(site.galleryTitle)}</Heading>
          </div>
          {/* 첫 장을 크게 — 격자로만 깔면 카탈로그처럼 보인다. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {site.gallery.map((g, i) => (
              <figure
                key={i}
                className={`relative overflow-hidden rounded-2xl bg-[#EDE6DA] group ${
                  i === 0 ? "col-span-2 row-span-2 aspect-[4/3] lg:aspect-auto lg:min-h-[420px]" : "aspect-square"
                }`}
              >
                <Image
                  src={g.src}
                  alt={t(g.caption)}
                  fill
                  sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
                {t(g.caption) && (
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 text-[13px] text-white bg-gradient-to-t from-black/60 to-transparent pt-10">
                    {t(g.caption)}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 치료 프로그램 ══ */}
      {has(site.programs) && (
        <Section tone="sand">
          <div className="max-w-2xl mb-12">
            <Eyebrow accent={accent}>{t(site.labels?.programs) || "Programs"}</Eyebrow>
            <Heading>{t(site.programsTitle)}</Heading>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {site.programs.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-black/[0.06]">
                <h3 className="text-lg font-semibold mb-2.5 tracking-tight">{t(p.title)}</h3>
                <p className="text-[15px] text-black/55 leading-relaxed mb-5">{t(p.desc)}</p>
                {has(p.items) && (
                  <ul className="space-y-2.5 pt-5 border-t border-black/[0.07]">
                    {p.items.map((it, j) => (
                      <li key={j} className="text-[14px] text-black/65 flex gap-2.5">
                        <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                        {t(it)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 환자 후기 — 없으면 통째로 안 그린다 ══ */}
      {has(site.testimonials) && (
        <Section tone="ink" darkTone={darkTone}>
          <div className="max-w-2xl mb-12">
            <Eyebrow accent="#9BB8A5">{t(site.labels?.testimonials) || "Patient Stories"}</Eyebrow>
            <Heading tone="light">{t(site.testimonialsTitle)}</Heading>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {site.testimonials.map((r, i) => (
              <figure key={i} className="bg-white/[0.05] rounded-2xl p-7 border border-white/10">
                <blockquote
                  className="text-white/85 text-[15px] leading-relaxed"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  “{t(r.quote)}”
                </blockquote>
                <figcaption className="mt-6 text-[13px] text-white/45">
                  {t(r.author)}
                  {t(r.country) ? ` · ${t(r.country)}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 인증·실적 — 의료는 「누가 보증하나」가 신뢰의 절반 ══ */}
      {has(site.credentials) && (
        <Section>
          <div className="max-w-2xl mb-12">
            <Eyebrow accent={accent}>{t(site.labels?.credentials) || "Credentials"}</Eyebrow>
            <Heading>{t(site.credentialsTitle)}</Heading>
          </div>
          <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
            {site.credentials.map((c, i) => (
              <div key={i} className="py-5 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-8">
                {c.year && (
                  <span className="text-[13px] tabular-nums shrink-0 w-16" style={{ color: accent }}>
                    {c.year}
                  </span>
                )}
                <div>
                  <h3 className="font-medium text-[15px] md:text-base">{t(c.title)}</h3>
                  {t(c.desc) && <p className="text-[14px] text-black/50 mt-1 leading-relaxed">{t(c.desc)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ FAQ ══ */}
      {has(site.faq) && (
        <Section tone="sand">
          <div className="max-w-2xl mb-10">
            <Eyebrow accent={accent}>{t(site.labels?.faq) || "FAQ"}</Eyebrow>
            <Heading>{t(site.faqTitle)}</Heading>
          </div>
          <div className="max-w-3xl">
            {site.faq.map((f, i) => (
              <div key={i} className="border-b border-black/[0.09]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left py-5 flex items-start justify-between gap-6 group"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-medium text-[15px] md:text-base group-hover:opacity-70 transition-opacity">
                    {t(f.q)}
                  </span>
                  <span
                    className="text-xl leading-none shrink-0 transition-transform duration-200"
                    style={{ color: accent, transform: openFaq === i ? "rotate(45deg)" : "none" }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {/* 접힌 내용을 «지우지» 않고 감춘다 — 조건부 렌더로 지우면 크롤러에겐 빈 페이지가 된다
                    (2026-07-28 반성문 #143 에서 고친 부류. 판에도 같은 실수를 심지 않는다). */}
                <div className={openFaq === i ? "pb-6 pr-10" : "hidden"}>
                  <p className="text-[15px] text-black/60 leading-relaxed whitespace-pre-line">{t(f.a)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 마무리 CTA ══ */}
      <Section tone="ink" darkTone={darkTone} id="contact">
        <div className="text-center max-w-2xl mx-auto">
          <Heading tone="light" size="xl">{t(site.closing?.title)}</Heading>
          {t(site.closing?.subtitle) && (
            <p className="mt-5 text-white/65 text-base md:text-lg leading-relaxed whitespace-pre-line">
              {t(site.closing.subtitle)}
            </p>
          )}
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
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
          {t(site.contact?.hours) && (
            <p className="mt-6 text-[13px] text-white/40">{t(site.contact.hours)}</p>
          )}
        </div>
      </Section>

      {/* ══ 따라다니는 상담 버튼 — 해외 환자용 사이트의 사실상 표준 ══ */}
      <button
        onClick={onInquiry}
        className="fixed bottom-5 right-5 z-40 md:hidden px-6 py-3.5 rounded-full text-white text-sm font-medium shadow-2xl"
        style={{ backgroundColor: accent }}
      >
        {t(site.hero?.primaryCta) || "Consult Now"}
      </button>

      {/* ══ 푸터 — 아는 것만 적는다 ══ */}
      <footer className="text-white/45 py-12" style={{ backgroundColor: darkTone }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 text-[13px] space-y-1.5">
          <div className="text-white/85 font-medium text-base mb-3" style={{ fontFamily: "Georgia, serif" }}>
            {brandName}
          </div>
          {t(site.contact?.address) && <div>{t(site.contact.address)}</div>}
          {site.contact?.phone && <div>{site.contact.phone}</div>}
          {site.contact?.email && <div>{site.contact.email}</div>}
          {t(site.legalNote) && <div className="pt-3 text-white/30">{t(site.legalNote)}</div>}
        </div>
      </footer>
    </div>
  );
}
