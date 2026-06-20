"use client";

/**
 * Калькулятор ориентировочной стоимости лечения рака в Корее (RU).
 * ⚠️ Это НЕ счёт и не медицинское предложение — только ориентир.
 *    Точный расчёт даём бесплатно после консультации (CTA → /inquiry).
 * Диапазоны согласованы с /ru/for-russian-patients (консервативные оценки).
 */

import { useState, useMemo } from "react";
import Link from "next/link";

// Программы лечения — диапазоны в USD (ориентировочно).
// Цена зависит от программы и срока, НЕ выставляется по диагнозу (мед.-этично).
const PROGRAMS = {
  diagnostics: { ru: "Диагностика и второе мнение", perMonth: false, low: 500, high: 1500 },
  immuno: { ru: "Курс иммунотерапии (корейская медицина)", perMonth: true, low: 3000, high: 6000 },
  complex: { ru: "Комплексное лечение (онкология + поддержка)", perMonth: true, low: 5000, high: 12000 },
};

const LODGING = { low: 800, high: 1500 }; // в месяц
const FLIGHT = { low: 400, high: 800 }; // туда-обратно, Алматы/Москва — Сеул
const DIAGNOSTICS_ONCE = { low: 500, high: 1500 }; // если выбран курс — диагностика отдельно

const CANCER_TYPES = [
  "Рак желудка",
  "Рак лёгких",
  "Рак молочной железы",
  "Рак печени",
  "Рак щитовидной железы",
  "Колоректальный рак",
  "Другое / не уверен(а)",
];

function fmtUSD(n) {
  return "$" + n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

export default function CostCalculatorClient() {
  const [cancer, setCancer] = useState(CANCER_TYPES[0]);
  const [programKey, setProgramKey] = useState("immuno");
  const [weeks, setWeeks] = useState(4);
  const [withLodging, setWithLodging] = useState(true);
  const [withFlight, setWithFlight] = useState(true);

  const result = useMemo(() => {
    const p = PROGRAMS[programKey];
    const months = weeks / 4;
    let low = 0;
    let high = 0;

    if (p.perMonth) {
      low += p.low * months;
      high += p.high * months;
      // курс лечения подразумевает первичную диагностику
      low += DIAGNOSTICS_ONCE.low;
      high += DIAGNOSTICS_ONCE.high;
    } else {
      low += p.low;
      high += p.high;
    }
    if (withLodging) {
      low += LODGING.low * months;
      high += LODGING.high * months;
    }
    if (withFlight) {
      low += FLIGHT.low;
      high += FLIGHT.high;
    }
    return { low: Math.round(low), high: Math.round(high) };
  }, [programKey, weeks, withLodging, withFlight]);

  const isCourse = PROGRAMS[programKey].perMonth;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
      {/* Hero */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-teal-700 mb-3">
          Сколько стоит лечение рака в Корее?
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Рассчитайте ориентировочную стоимость за 30 секунд. Точный расчёт и
          консультацию на русском языке мы предоставляем бесплатно.
        </p>
      </header>

      {/* Калькулятор */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-8 space-y-6">
        {/* Тип онкологии */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Тип заболевания</label>
          <select
            value={cancer}
            onChange={(e) => setCancer(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {CANCER_TYPES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Программа */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Программа</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {Object.entries(PROGRAMS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setProgramKey(key)}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  programKey === key
                    ? "bg-teal-50 text-teal-800 border-teal-200 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium block">{p.ru}</span>
                <span className="text-xs text-gray-400">
                  {p.perMonth ? `от ${fmtUSD(p.low)}/мес.` : `от ${fmtUSD(p.low)}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Срок (для курсов) */}
        {isCourse && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Срок лечения</label>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{weeks} нед.</span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="text-xs text-gray-400 mt-1">Средний срок для пациентов из СНГ — 4–8 недель.</p>
          </div>
        )}

        {/* Доп. опции */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={withLodging} onChange={(e) => setWithLodging(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            Проживание рядом с клиникой
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={withFlight} onChange={(e) => setWithFlight(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            Перелёт (туда-обратно)
          </label>
        </div>
      </section>

      {/* Результат */}
      <section className="bg-teal-600 text-white rounded-xl p-6 md:p-8 mt-5 text-center">
        <p className="text-sm text-teal-100 mb-1">Ориентировочная стоимость</p>
        <div className="text-3xl md:text-4xl font-bold tabular-nums">
          {fmtUSD(result.low)} – {fmtUSD(result.high)}
        </div>
        <p className="text-sm text-teal-100 mt-2">{cancer} · {PROGRAMS[programKey].ru}{isCourse ? ` · ${weeks} нед.` : ""}</p>
        <Link
          href="/inquiry"
          className="inline-block mt-5 bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
        >
          Получить точный расчёт бесплатно →
        </Link>
      </section>

      {/* Дисклеймер */}
      <p className="text-xs text-gray-400 leading-relaxed mt-4">
        ⚠️ Расчёт является <b>ориентировочным</b> и не является счётом, офертой или медицинским
        предложением. Итоговая стоимость определяется клиникой после изучения медицинских
        документов. Точный расчёт и план лечения предоставляются бесплатно после консультации.
      </p>

      {/* Почему healwith */}
      <section className="mt-10 grid sm:grid-cols-3 gap-4">
        {[
          { t: "Без визы из Казахстана", d: "Безвизовый въезд в Корею для граждан РК. Помогаем с документами." },
          { t: "Сопровождение на русском", d: "Переводчик и личный менеджер на всех этапах — от заявки до выписки." },
          { t: "Дешевле в 2 раза", d: "Стоимость на 30–60% ниже, чем в Германии или США при сопоставимом качестве." },
        ].map(({ t, d }) => (
          <div key={t} className="bg-gray-50 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">{t}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      {/* Внутренние ссылки */}
      <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
        <Link href="/ru/for-russian-patients" className="hover:text-teal-600">Лечение рака в Корее</Link>
        <Link href="/hospitals/immune" className="hover:text-teal-600">Immune Hospital</Link>
        <Link href="/inquiry" className="hover:text-teal-600">Бесплатная консультация</Link>
        <Link href="/visa" className="hover:text-teal-600">Виза</Link>
      </nav>
    </main>
  );
}
