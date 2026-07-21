"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, BadgeCheck, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { COPY } from "./copy";

export default function PartnersClient() {
  const lang = useLang() || "en";
  const c = COPY[lang] || COPY.en;

  const [form, setForm] = useState({
    orgName: "", orgType: "agency", country: "", contactPerson: "",
    email: "", phone: "", volume: "", specialty: "", message: "", consent: false,
  });
  const [state, setState] = useState("idle"); // idle | sending | done | error

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (state === "sending" || !form.consent) return;
    setState("sending");
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      setState(res.ok && json.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  const ORG_TYPES = ["agency", "insurance", "clinic", "other"];
  const VOLUMES = ["lt5", "5to20", "gt20"];
  const inputCls = "w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white";

  return (
    <div className={lang === "ko" ? "bg-white break-keep" : "bg-white"}>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-14 md:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.15fr,0.85fr] gap-8 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
              {c.hero.eyebrow}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight whitespace-pre-line text-balance">
              {c.hero.title}
            </h1>
            <p className="mt-4 text-base md:text-lg text-gray-500 leading-relaxed text-pretty">{c.hero.lede}</p>
            <a
              href="#apply"
              className="inline-flex items-center gap-2 mt-7 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors duration-200"
            >
              {c.hero.cta} <ArrowRight size={18} />
            </a>
          </div>
          <div className="relative h-52 md:h-72 overflow-hidden rounded-2xl border border-gray-100">
            {/* 파트너십 사진 — Unsplash 무료 라이선스 로컬 저장본(/insurance 와 공용) */}
            <Image
              src="/images/insurance/partnership.jpg"
              alt={c.hero.eyebrow}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-8">{c.values.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {c.values.items.map((v, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1.5">{v.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed text-pretty">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-8 md:mb-10">{c.steps.title}</h2>
        <ol className="relative">
          <span className="absolute left-[18px] top-3 bottom-3 w-px bg-teal-200" aria-hidden="true" />
          {c.steps.items.map((s, i) => (
            <li key={i} className="relative flex gap-4 md:gap-6 pb-6 last:pb-0">
              <span className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-sm ring-4 ring-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 border border-gray-200 rounded-xl p-4 md:p-5">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed text-pretty">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust band */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-6">{c.trust.title}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.trust.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 items-start bg-white border border-gray-200 rounded-xl p-4">
                <BadgeCheck size={18} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-sm md:text-base text-gray-700 leading-relaxed text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Apply form */}
      <section id="apply" className="max-w-2xl mx-auto px-4 py-12 md:py-16 scroll-mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-3">{c.form.title}</h2>
        <p className="text-base text-gray-600 leading-relaxed text-pretty mb-8">{c.form.lede}</p>

        {state === "done" ? (
          <div className="flex gap-3 items-start bg-teal-50 border border-teal-100 rounded-xl p-5">
            <CheckCircle size={20} className="text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm md:text-base text-teal-900 leading-relaxed">{c.form.success}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.orgName} *</span>
                <input required maxLength={200} className={inputCls} value={form.orgName} onChange={set("orgName")} />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.orgType} *</span>
                <select className={inputCls} value={form.orgType} onChange={set("orgType")}>
                  {ORG_TYPES.map((v, i) => (
                    <option key={v} value={v}>{c.form.orgTypeOptions[i]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.country} *</span>
                <input required maxLength={100} className={inputCls} value={form.country} onChange={set("country")} />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.contactPerson}</span>
                <input maxLength={100} className={inputCls} value={form.contactPerson} onChange={set("contactPerson")} />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.email} *</span>
                <input required type="email" maxLength={200} className={inputCls} value={form.email} onChange={set("email")} />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.phone}</span>
                <input maxLength={100} className={inputCls} value={form.phone} onChange={set("phone")} />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.volume}</span>
                <select className={inputCls} value={form.volume} onChange={set("volume")}>
                  <option value="">—</option>
                  {VOLUMES.map((v, i) => (
                    <option key={v} value={v}>{c.form.volumeOptions[i]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.specialty}</span>
                <input maxLength={200} className={inputCls} value={form.specialty} onChange={set("specialty")} />
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">{c.form.message}</span>
              <textarea rows={4} maxLength={2000} className={inputCls} value={form.message} onChange={set("message")} />
            </label>
            <label className="flex items-start gap-2.5 text-sm text-gray-600">
              <input type="checkbox" required checked={form.consent} onChange={set("consent")} className="mt-0.5 accent-teal-700" />
              <span className="leading-relaxed">{c.form.consent}</span>
            </label>
            {state === "error" && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{c.form.error}</p>
            )}
            <button
              type="submit"
              disabled={state === "sending"}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white rounded-xl font-bold transition-colors duration-200"
            >
              {c.form.submit} <ArrowRight size={18} />
            </button>
          </form>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pt-0 pb-12 md:pb-16">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">{c.faq.title}</h2>
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
      </section>

      {/* Closing */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-balance">{c.closing.title}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-7 max-w-xl mx-auto leading-relaxed text-pretty">{c.closing.body}</p>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors duration-200"
          >
            {c.closing.cta} <ArrowRight size={18} />
          </a>
        </div>
      </section>
    </div>
  );
}
