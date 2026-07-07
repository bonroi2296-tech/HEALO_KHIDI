"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle, Info, MapPin } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { COPY } from "./copy";

/* 대학병원 실사진 스트립 — 사진은 저장소 로컬 자산(/hospitals 상세와 동일 출처), 이름 표기는 care-journey와 통일 */
const HOSPITAL_STRIP = [
  { slug: "ewha-seoul", name: { ko: "이대서울병원", en: "Ewha Seoul Hospital", ru: "Больница Ихва Сеул", kz: "Ихва Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" } },
  { slug: "ewha-mokdong", name: { ko: "이대목동병원", en: "Ewha Mokdong Hospital", ru: "Больница Ихва Мокдон", kz: "Ихва Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" } },
  { slug: "korea-guro", name: { ko: "고려대 구로병원", en: "Korea Univ. Guro Hospital", ru: "Больница Куро", kz: "Куро ауруханасы", zh: "高丽大九老医院", ja: "高麗大九老病院" } },
  { slug: "severance-sinchon", name: { ko: "신촌세브란스병원", en: "Sinchon Severance Hospital", ru: "Больница Северанс Синчхон", kz: "Синчон Северанс ауруханасы", zh: "新村世福兰斯医院", ja: "新村セブランス病院" } },
];

/* 섹션 사진 = Unsplash 무료 라이선스 로컬 저장본(핫링크 아님). 대리석 아트(МСР 비주얼)는 PO 지시로 제거(2026-07-07).
   Madanes 관련 잔여 노출은 로고 2종뿐 — 서면허가·롤백 절차는 docs/marketing/madanes-insurance/ROLLBACK.md. */

export default function InsuranceClient() {
  const lang = useLang() || "ko";
  const c = COPY[lang] || COPY.ko;

  return (
    // break-keep(word-break: keep-all)은 한국어만 — 단어 중간 줄바꿈 방지. zh/ja는 공백이 없어 적용 시 넘침.
    <div className={lang === "ko" ? "bg-white break-keep" : "bg-white"}>
      {/* Hero — 후킹: 헤드라인 + 혜택 불릿 3 + CTA (첫 화면에서 핵심 전부) */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-14 md:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.15fr,0.85fr] gap-8 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
              {c.hero.eyebrow}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight whitespace-pre-line text-balance">
              {c.hero.title}
            </h1>
            {/* lede의 \n = 문장 단위 단락 분리 (PO 지시: 사실 문장 / 제안 문장 나눠 보이게) */}
            <p className="mt-4 text-base md:text-lg text-gray-500 leading-relaxed text-pretty whitespace-pre-line">{c.hero.lede}</p>
            <ul className="mt-5 space-y-2.5">
              {(c.hero.bullets || []).map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm md:text-base font-semibold text-gray-800">
                  <CheckCircle size={18} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="tabular-nums">{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 mt-7 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors duration-200"
            >
              {c.hero.cta} <ArrowRight size={18} />
            </Link>
            <p className="mt-3 text-sm text-gray-500">{c.hero.note}</p>
          </div>
          <div className="relative h-56 md:h-[26rem] overflow-hidden rounded-2xl border border-gray-100">
            {/* 의사-환자 상담+서류(보험 확인) — Unsplash 무료 라이선스, 로컬 저장(출처: photo-1758691461935) */}
            <Image
              src="/images/insurance/hero-consult.jpg"
              alt={c.hero.eyebrow}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 보험이 부담하는 것 — 혜택 먼저 (두괄식) */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-3">{c.coverage.title}</h2>
          <p className="text-base text-gray-600 leading-relaxed text-pretty max-w-3xl mb-8">{c.coverage.lede}</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {c.coverage.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <CheckCircle size={18} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-sm md:text-base font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-0.5 text-sm text-gray-500 leading-relaxed text-pretty">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 절차 5단계 — 타임라인 */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-8 md:mb-10">{c.steps.title}</h2>
        <ol className="relative">
          <span className="absolute left-[18px] top-3 bottom-3 w-px bg-teal-200" aria-hidden="true" />
          {c.steps.items.map((s, i) => (
            <li key={i} className="relative flex gap-4 md:gap-6 pb-6 last:pb-0">
              <span className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-sm ring-4 ring-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 border border-gray-200 rounded-xl p-4 md:p-5 hover:border-teal-300 hover:shadow-sm transition-all duration-200">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed text-pretty">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 보험 상품 상세 — 스펙 칩 카드 (+ 보험 서류 검토 사진) */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,220px] gap-6 items-center mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-3">{c.products.title}</h2>
              <p className="text-base text-gray-600 leading-relaxed text-pretty">{c.products.lede}</p>
            </div>
            <div className="relative hidden md:block h-40 overflow-hidden rounded-xl border border-gray-100">
              <Image
                src="/images/insurance/policy-review.jpg"
                alt={c.products.title}
                fill
                sizes="220px"
                className="object-cover"
              />
            </div>
          </div>
          {/* 대기기간 고지 콜아웃 */}
          <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 max-w-3xl">
            <Info size={18} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-gray-700 leading-relaxed text-pretty">{c.products.waitNote}</p>
          </div>
          <div className="space-y-4 md:space-y-5">
            {c.products.items.map((p, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${i === 2 ? "bg-gray-100 text-gray-600" : "bg-teal-50 text-teal-700 border border-teal-100"}`}>
                    {p.tag}
                  </span>
                  {i === 2 && (
                    <Image src="/images/insurance/managedcare-ru-logo.png" alt="ManagedCare Russia (МСР)" width={87} height={28} className="h-6 w-auto" />
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">{p.name}</h3>
                <p className="mt-1.5 text-sm md:text-base text-gray-500 leading-relaxed text-pretty">{p.desc}</p>
                <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {p.specs.map((s, j) => (
                    <div key={j} className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <dt className="text-xs text-gray-500">{s.label}</dt>
                      <dd className="mt-0.5 text-sm md:text-base font-bold text-gray-900 tabular-nums">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-teal-700">
                  <MapPin size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
                  {p.korea}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 왜 한국 — 큰 숫자 + 동행(텍스트) + 병원 실사진 스트립 */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-3">{c.whyKorea.title}</h2>
        <p className="text-base text-gray-600 leading-relaxed text-pretty max-w-3xl mb-8">{c.whyKorea.lede}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div className="border border-teal-100 bg-teal-50/50 rounded-xl p-6 md:p-7 flex flex-col justify-center">
            <div className="text-5xl md:text-6xl font-extrabold text-teal-700 tabular-nums leading-none">
              {c.whyKorea.stat.value}
            </div>
            <p className="mt-3 text-sm md:text-base text-gray-700 leading-relaxed text-pretty">{c.whyKorea.stat.label}</p>
            <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">{c.whyKorea.stat.source}</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-6 md:p-7 flex flex-col justify-center">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">{c.whyKorea.support.title}</h3>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed text-pretty">{c.whyKorea.support.body}</p>
          </div>
        </div>
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mt-10 mb-2">{c.whyKorea.hospitals.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed text-pretty max-w-3xl mb-5">{c.whyKorea.hospitals.caption}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {HOSPITAL_STRIP.map((h) => (
            <figure key={h.slug}>
              <div className="relative h-24 md:h-28 overflow-hidden rounded-xl border border-gray-100">
                <Image
                  src={`/images/hospitals/${h.slug}/1.jpg`}
                  alt={h.name[lang] || h.name.ko}
                  fill
                  sizes="(max-width: 768px) 50vw, 220px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-1.5 text-xs text-gray-600 text-center">{h.name[lang] || h.name.ko}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* B2B — 제휴 안내 (파트너십 사진 + 로고) */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,280px] gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-4">{c.partner.title}</h2>
              <p className="text-base text-gray-600 leading-relaxed text-pretty">{c.partner.body}</p>
              {/* 로고·이미지 = 로컬 자산(핫링크 아님). 서면 사용허가 전 실서비스 반영 금지(RESEARCH.md §6) */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-8">
                <Image src="/images/insurance/managedcare-ru-logo.png" alt="ManagedCare Russia (МСР)" width={130} height={41} className="h-9 w-auto" />
                <Image src="/images/insurance/madanes-global-logo.png" alt="Madanes Global" width={200} height={25} className="h-6 w-auto" />
              </div>
            </div>
            <div className="relative hidden md:block h-48 overflow-hidden rounded-xl border border-gray-100">
              <Image
                src="/images/insurance/partnership.jpg"
                alt={c.partner.title}
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — 네이티브 details */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-6 md:mb-8">{c.faq.title}</h2>
        <div className="space-y-3">
          {c.faq.items.map((f, i) => (
            <details key={i} className="group border border-gray-200 rounded-xl px-5 py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-base font-bold text-gray-900">
                {f.q}
                <span className="text-gray-400 transition-transform duration-200 group-open:rotate-90" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              </summary>
              <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed text-pretty">{f.a}</p>
            </details>
          ))}
        </div>
        {/* Disclaimer */}
        <div className="mt-10 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2">{c.disclaimer.title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-3xl text-pretty">{c.disclaimer.body}</p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-balance">{c.closing.title}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed text-pretty">{c.closing.body}</p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors duration-200"
          >
            {c.closing.cta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
