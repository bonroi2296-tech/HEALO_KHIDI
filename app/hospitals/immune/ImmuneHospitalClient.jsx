"use client";

import Link from "next/link";
// 사진은 전부 로컬(/immune/...) 이라 next/image 로 webp·크기맞춤 변환이 그대로 먹는다.
// 날 <img> 로 두면 원본 PNG(장당 ~290KB)를 그대로 내려받는다 (2026-07-27 PageSpeed 실측).
import Image from "next/image";
import { ArrowRight, ArrowLeft, Phone, MapPin, Clock, Car } from "lucide-react";
import { IMMUNE_PHOTOS } from "../../../components/healo/Photos";
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";
import { t } from "@/lib/i18n";
import { IMMUNE_HOSPITAL as H } from "@/lib/data/immuneHospitalInfo";

/* ───────── 섹션 라벨 문구는 전부 중앙 i18n 사전 immuneHospital.* 으로 이동 (2026-07-24) ───────── */

const PROGRAM_PHOTOS = [
  IMMUNE_PHOTOS.programFoodTherapy,
  IMMUNE_PHOTOS.programWalking,
  IMMUNE_PHOTOS.programExercise,
  IMMUNE_PHOTOS.programPicnic,
  IMMUNE_PHOTOS.programClass,
];

export default function ImmuneHospitalClient() {
  const lang = useLang() || "ko";
  const tr = (key) => t(`immuneHospital.${key}`, lang);
  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  const years = new Date().getFullYear() - H.foundedYear;

  return (
    <div className="bg-white">
      {/* ── HERO ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        {/* 병원 목록으로 — 스토어 앱에는 브라우저 뒤로가기가 없다(아이폰은 쓸어넘기기도 꺼져 있음).
            2026-08-04 화면 확인: 이 화면에서 목록으로 돌아갈 수단이 0개였다. */}
        <Link
          href={localeHref("/hospitals", lang)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={14} /> {t("partnerHospital.back", lang)}
        </Link>
        <div className="grid md:grid-cols-[6fr_5fr] gap-8 md:gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
              {tr("eyebrow")}
            </span>
            <h1 translate="no" className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {l(H.officialName)}
            </h1>
            <p className="mt-3 text-base md:text-lg text-teal-700 font-semibold">
              {l(H.tagline)}
            </p>
            <div className="w-12 h-px bg-teal-700 mt-5 mb-5" />
            <p className="text-sm md:text-base text-gray-500 leading-relaxed max-w-xl">
              {tr("heroLede")}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                href={localeHref("/inquiry", lang)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
              >
                {tr("requestConsult")} <ArrowRight size={18} />
              </Link>
              <a
                href={`tel:${H.mainPhone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-700 transition-colors"
              >
                <Phone size={16} /> {H.mainPhone}
              </a>
            </div>
          </div>

          {/* 히어로는 의료진 단체사진 금지 — 「그 병원임을 보여주는 공간 실사」를 쓴다.
              (PO 지시 2026-07-22: "병원 현판이나 그런걸루". docs/PO_PREFERENCES.md 참조) */}
          <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl bg-gray-100">
            <Image
              src={IMMUNE_PHOTOS.signage}
              /* 대체텍스트도 화면 글자다 — 러/카 환자의 스크린리더·이미지 실패 시 한국어가 읽혔다.
                 이 파일이 useLang/t() 를 쓰는 덕에 check-content-consistency §7(하드코딩 한국어)이
                 파일 «전체»를 면제해서 이 한 줄만 3개월 살아남았다. 사전 키로 옮긴다. */
              alt={tr("heroPhotoAlt")}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* 통계 바 */}
        <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6">
          {[
            /* ⚠️ 숫자를 여기 직접 적지 마라 — 병원이 공개한 값과 어긋난다.
               2026-07-29 실제로 어긋나 있었다: 만족도 98%(병원은 93.5%) · 전담 의료진 7+(병원은 19명).
               게다가 바로 아래 「면력 자체 조사 결과」라는 출처를 달아 둔 상태였다.
               값은 전부 `src/lib/data/immuneHospitalInfo.js` 한 곳에서만 고친다. */
            { num: H.cumulativeCases, label: tr("statCases") },
            { num: H.satisfactionRate, label: tr("statSatisfaction") },
            { num: String(years), unit: tr("yearsUnit"), label: tr("statYears") },
            { num: String(H.branches.length), label: tr("statBranches") },
            { num: H.dedicatedDoctors, label: tr("statDoctors") },
            { num: "24/7", label: tr("statHealing") },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">
                {stat.num}
                {stat.unit ? <span className="text-base ml-0.5">{stat.unit}</span> : null}
              </div>
              <div className="mt-1.5 text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
        {/* 만족도 출처 명기 — 면력 자체조사(2024.11.06 전지점).
            ⚠️ 출처를 다는 것만으로는 부족하다. 2026-07-29 까지 이 자리엔 «출처는 병원, 숫자는 우리»가
               걸려 있었다(화면 98% vs 병원 공개 93.5%). 숫자와 출처는 항상 같이 확인해야 한다. */}
        <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">{tr("satisfactionNote")}</p>
      </section>

      {/* ── ITCRN 5원칙 ───────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("philosophyEyebrow")}
          </span>
          <div className="grid md:grid-cols-[5fr_7fr] gap-8 md:gap-12 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                {tr("philosophyTitle")}
              </h2>
              <div className="w-12 h-px bg-teal-700 mb-4" />
              <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-md">
                {tr("philosophyBody")}
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {/* 원칙 표기: 이니셜 뱃지(I·T·C·R·N)만 두면 그 글자가 왜 그 글자인지 알 수가 없다
                  — 한국어 「면역」 옆에 I, 「체온」 옆에 T 가 붙어 있으니 무의미(PO 지적 2026-07-22).
                  머리글자는 영문 단어에서 나오므로 **영문 전체 표기를 주(主)로** 두고,
                  그 아래 각 언어 번역을 붙인다. 한국어 화면에서도 영문이 함께 보여야 ITCRN 이 성립. */}
              {H.principles.map((p) => (
                <div key={p.id} className="flex gap-4 py-4 items-start">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
                    {p.letter}
                  </span>
                  <div>
                    <div className="text-base font-bold text-gray-900 leading-snug">
                      <span translate="no">{p.name.en}</span>
                      {lang !== "en" && (
                        <span className="ml-1.5 font-semibold text-gray-500">{l(p.name)}</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 leading-relaxed">{l(p.description)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 암종별 프로그램 ─────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {tr("cancerEyebrow")}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
          {tr("cancerTitle")}
        </h2>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {H.cancerPrograms.map((cp, i) => (
            <div
              key={cp.id}
              className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_3fr_6fr] gap-x-4 md:gap-x-8 gap-y-2 py-6 items-start"
            >
              <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-bold text-gray-900 leading-snug self-center md:self-start">
                {l(cp.name)}
              </h3>
              <p className="col-span-2 md:col-span-1 text-sm md:text-base text-gray-500 leading-relaxed">
                {l(cp.focus)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 치료법 상세 ─────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("treatEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
            {tr("treatTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {/* 변수명 t 금지 — 모듈 최상단 i18n t() 를 가린다(섀도잉). tg = treatment group */}
            {Object.entries(H.treatments).map(([key, tg]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <div className="text-xs font-bold tracking-wide text-teal-700 uppercase mb-3">
                  {l(tg.category)}
                </div>
                <ul className="divide-y divide-gray-200 border-t border-gray-200">
                  {tg.items.map((item, i) => (
                    <li key={i} className="py-2.5 text-sm text-gray-700 leading-relaxed">
                      {l(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-gray-500 leading-relaxed max-w-2xl">
            ※ {l(H.evidenceNote)}
          </p>
        </div>
      </section>

      {/* ── 심신통합 프로그램 갤러리 ─────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {tr("progEyebrow")}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
          {tr("progTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {H.integrativePrograms.map((prog, i) => (
            <article key={prog.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="relative w-full aspect-[4/5] overflow-hidden bg-gray-100">
                <Image
                  src={PROGRAM_PHOTOS[i]}
                  alt={l(prog.label)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4 md:p-5">
                <div className="text-xs font-bold tracking-wide text-teal-700 mb-1.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{l(prog.label)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{l(prog.desc)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 의료진 ───────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("doctorsEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
            {tr("doctorsTitle")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {H.doctors.map((d, i) => (
              <article key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-100">
                  <Image
                    src={d.photo}
                    alt={l(d.name)}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-xs font-bold tracking-wide text-teal-700 mb-1">{l(d.role)}</div>
                  <h3 translate="no" className="text-base font-bold text-gray-900 mb-1 leading-snug">
                    {l(d.name)}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{l(d.specialty)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 시설 갤러리 ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {tr("facilitiesEyebrow")}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
          {tr("facilitiesTitle")}
        </h2>
        <div className="space-y-10 md:space-y-12">
          {H.facilities.map((f) => (
            <div key={f.id}>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1.5">{l(f.name)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mb-4">{l(f.description)}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {f.images.map((img, i) => (
                  <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                    <Image
                      src={img}
                      alt={l(f.name)}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 지점 & 오시는 길 ─────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {tr("branchesEyebrow")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
            {tr("branchesTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {H.branches.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* 지점 실사 — 옛 지점 상세 페이지에서 가치 있던 두 가지(사진·구글리뷰) 중 하나.
                    통합하면서 버리지 않고 카드로 끌어왔다. */}
                {b.photo && (
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    <Image
                      src={b.photo}
                      alt={l(b.name)}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-5 md:p-6">
                <h3 translate="no" className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                  {l(b.name)}
                </h3>
                {/* 지점 대표원장 — 4개 지점 모두 실명·실사가 있다(홈 「협력 의료진」과 같은 원본).
                    PO 지시 2026-07-22: 지점 카드에는 리뷰 대신 병원 정보만. 대표원장은 병원 정보다. */}
                {b.director && (
                  <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-100">
                    <Image
                      src={b.director.photo}
                      alt={l(b.director.name)}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover object-top bg-gray-100 shrink-0"
                    />
                    <span translate="no" className="text-sm font-semibold text-gray-800 leading-snug">
                      {l(b.director.name)}
                    </span>
                  </div>
                )}
                {b.address && (
                  <p className="flex gap-2 text-sm text-gray-600 leading-relaxed mb-3">
                    <MapPin size={15} className="shrink-0 mt-0.5 text-teal-700" />
                    <span>{l(b.address)}</span>
                  </p>
                )}
                {b.phone && (
                  <a
                    href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-700 transition-colors mb-3"
                  >
                    <Phone size={15} className="shrink-0" /> {b.phone}
                  </a>
                )}
                {b.hours && (
                  <div className="flex gap-2 text-xs text-gray-500 leading-relaxed mb-3">
                    <Clock size={15} className="shrink-0 mt-0.5 text-gray-400" />
                    <div>
                      <div>{l(b.hours.weekday)}</div>
                      <div>{l(b.hours.weekend)}</div>
                    </div>
                  </div>
                )}
                {b.parking && (
                  <p className="flex gap-2 text-xs text-gray-500 leading-relaxed mb-3">
                    <Car size={15} className="shrink-0 mt-0.5 text-gray-400" />
                    <span>{l(b.parking)}</span>
                  </p>
                )}
                {b.nearby && (
                  <p className="text-xs font-semibold text-teal-700 leading-relaxed">{l(b.nearby)}</p>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────── */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-snug">{tr("ctaTitle")}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">{tr("ctaBody")}</p>
          <Link
            href={localeHref("/inquiry", lang)}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {tr("requestConsult")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
