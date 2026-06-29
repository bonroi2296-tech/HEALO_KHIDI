'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n/LangContext';

const NATIONALITIES = [
  { value: 'ru', label: { ko: '러시아', en: 'Russia', ru: 'Россия', zh: '俄罗斯', ja: 'ロシア', kz: 'Ресей' } },
  { value: 'kz', label: { ko: '카자흐스탄', en: 'Kazakhstan', ru: 'Казахстан', zh: '哈萨克斯坦', ja: 'カザフスタン', kz: 'Қазақстан' } },
  { value: 'mn', label: { ko: '몽골', en: 'Mongolia', ru: 'Монголия', zh: '蒙古', ja: 'モンゴル', kz: 'Моңғолия' } },
  { value: 'zh', label: { ko: '중국', en: 'China', ru: 'Китай', zh: '中国', ja: '中国', kz: 'Қытай' } },
  { value: 'ja', label: { ko: '일본', en: 'Japan', ru: 'Япония', zh: '日本', ja: '日本', kz: 'Жапония' } },
  { value: 'en', label: { ko: '기타', en: 'Other', ru: 'Другое', zh: '其他', ja: 'その他', kz: 'Басқа' } },
];

// 공식 출처 — 사용자가 항상 최종 확인할 수 있게 노출
const OFFICIAL_KETA_URL = 'https://www.k-eta.go.kr/';

const LABELS = {
  title: { ko: '의료비자 가이드', en: 'Medical Visa Guide', ru: 'Гид по медицинской визе', zh: '医疗签证指南', ja: '医療ビザガイド', kz: 'Медициналық виза нұсқаулығы' },
  subtitle: { ko: '국적과 치료 기간을 선택하면 필요한 비자와 서류를 안내합니다', en: 'Select your nationality and treatment duration to see the visa and documents you need', ru: 'Выберите гражданство и срок лечения — покажем нужную визу и документы', zh: '选择国籍和治疗时间，即可查看所需签证和文件', ja: '国籍と治療期間を選ぶと、必要なビザと書類をご案内します', kz: 'Азаматтық пен емделу мерзімін таңдаңыз — қажетті виза мен құжаттарды көрсетеміз' },
  nationality: { ko: '국적', en: 'Nationality', ru: 'Гражданство', zh: '国籍', ja: '国籍', kz: 'Азаматтық' },
  duration: { ko: '예상 치료 기간', en: 'Expected treatment duration', ru: 'Ожидаемый срок лечения', zh: '预计治疗时间', ja: '予想治療期間', kz: 'Болжалды емдеу мерзімі' },
  stayShort: { ko: '90일 이내', en: 'Within 90 days', ru: 'До 90 дней', zh: '90天以内', ja: '90日以内', kz: '90 күнге дейін' },
  stayLong: { ko: '91일 이상', en: '91+ days', ru: '91+ дней', zh: '91天以上', ja: '91日以上', kz: '91 күннен астам' },
  entryStatus: { ko: '입국 요건', en: 'Entry Requirement', ru: 'Условия въезда', zh: '入境要求', ja: '入国要件', kz: 'Кіру талаптары' },
  statusFree: { ko: '무비자 입국 가능', en: 'Visa-free entry', ru: 'Безвизовый въезд', zh: '可免签入境', ja: 'ビザ免除で入国可', kz: 'Визасыз кіруге болады' },
  statusRequired: { ko: '비자 필요', en: 'Visa required', ru: 'Нужна виза', zh: '需要签证', ja: 'ビザが必要', kz: 'Виза қажет' },
  statusConditional: { ko: '조건부 입국', en: 'Conditional entry', ru: 'Въезд с условиями', zh: '有条件入境', ja: '条件付き入国', kz: 'Шартты кіру' },
  upToDays: { ko: '최대 {n}일', en: 'up to {n} days', ru: 'до {n} дн.', zh: '最多{n}天', ja: '最大{n}日', kz: '{n} күнге дейін' },
  recommended: { ko: '추천 비자', en: 'Recommended Visa', ru: 'Рекомендуемая виза', zh: '推荐签证', ja: '推奨ビザ', kz: 'Ұсынылған виза' },
  alternative: { ko: '대안 비자', en: 'Alternative Visa', ru: 'Альтернативная виза', zh: '备选签证', ja: '代替ビザ', kz: 'Балама виза' },
  documents: { ko: '필요 서류', en: 'Required Documents', ru: 'Необходимые документы', zh: '所需文件', ja: '必要書類', kz: 'Қажетті құжаттар' },
  processingTime: { ko: '처리 기간', en: 'Processing Time', ru: 'Срок обработки', zh: '处理时间', ja: '処理期間', kz: 'Өңдеу мерзімі' },
  fee: { ko: '수수료', en: 'Fee', ru: 'Сбор', zh: '费用', ja: '手数料', kz: 'Алым' },
  maxStay: { ko: '최대 체류', en: 'Max Stay', ru: 'Макс. пребывание', zh: '最长停留', ja: '最大滞在', kz: 'Макс. тұру' },
  days: { ko: '일', en: 'days', ru: 'дней', zh: '天', ja: '日', kz: 'күн' },
  embassy: { ko: '관할 대한민국 대사관·영사관', en: 'Korean Embassy / Consulate', ru: 'Посольство / консульство Кореи', zh: '韩国大使馆 / 领事馆', ja: '管轄の大韓民国大使館・領事館', kz: 'Корея елшілігі / консулдығы' },
  print: { ko: '체크리스트 인쇄', en: 'Print Checklist', ru: 'Печать чек-листа', zh: '打印清单', ja: 'チェックリスト印刷', kz: 'Тізімді басып шығару' },
  note: { ko: '참고', en: 'Note', ru: 'Примечание', zh: '备注', ja: '備考', kz: 'Ескерту' },
  loading: { ko: '비자 정보를 불러오는 중…', en: 'Loading visa information…', ru: 'Загрузка информации о визе…', zh: '正在加载签证信息…', ja: 'ビザ情報を読み込み中…', kz: 'Виза ақпараты жүктелуде…' },
  errorTitle: { ko: '정보를 불러오지 못했습니다', en: 'Could not load information', ru: 'Не удалось загрузить информацию', zh: '无法加载信息', ja: '情報を読み込めませんでした', kz: 'Ақпаратты жүктеу мүмкін болмады' },
  retry: { ko: '다시 시도', en: 'Retry', ru: 'Повторить', zh: '重试', ja: '再試行', kz: 'Қайталау' },
  disclaimer: { ko: '출입국 규정은 수시로 변경됩니다. 신청 전 반드시 공식 K-ETA 사이트와 관할 대사관에서 최종 확인하세요.', en: 'Immigration rules change frequently. Always confirm on the official K-ETA site and your local embassy before applying.', ru: 'Иммиграционные правила часто меняются. Перед подачей всегда проверяйте на официальном сайте K-ETA и в посольстве.', zh: '出入境规定经常变化。申请前请务必在官方K-ETA网站及管辖大使馆最终确认。', ja: '出入国規定は随時変わります。申請前に必ず公式K-ETAサイトと管轄大使館で最終確認してください。', kz: 'Көші-қон ережелері жиі өзгереді. Өтінім бермес бұрын ресми K-ETA сайтынан және елшіліктен тексеріңіз.' },
  officialKeta: { ko: '공식 K-ETA 사이트', en: 'Official K-ETA site', ru: 'Официальный сайт K-ETA', zh: '官方K-ETA网站', ja: '公式K-ETAサイト', kz: 'Ресми K-ETA сайты' },
};

function fmt(template, n) {
  return template.replace('{n}', String(n));
}

function StatusBadge({ entry, l }) {
  const map = {
    visa_free: { label: l(LABELS.statusFree), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    visa_required: { label: l(LABELS.statusRequired), cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    conditional: { label: l(LABELS.statusConditional), cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const s = map[entry.shortStay] || map.conditional;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>
      {s.label}
      {entry.shortStay === 'visa_free' && entry.visaFreeDays && (
        <span className="tabular-nums font-normal opacity-80">· {fmt(l(LABELS.upToDays), entry.visaFreeDays)}</span>
      )}
    </span>
  );
}

function CountryEntryCard({ entry, l }) {
  if (!entry) return null;
  return (
    <section className="border border-teal-100 rounded-xl p-5 md:p-6 bg-teal-50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base md:text-lg font-bold text-gray-900">{l(LABELS.entryStatus)}</h2>
        <StatusBadge entry={entry} l={l} />
      </div>

      <p className="text-sm md:text-base text-gray-700 leading-relaxed">{entry.summary}</p>

      {entry.note && (
        <div className="mt-3 bg-white border border-teal-100 rounded-lg p-3 text-[13px] text-gray-600 leading-relaxed">
          {entry.note}
        </div>
      )}

      {entry.embassyName && (
        <div className="mt-3 text-sm">
          <div className="text-xs text-gray-500 mb-0.5">{l(LABELS.embassy)}</div>
          <a
            href={entry.embassyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
          >
            {entry.embassyName} ↗
          </a>
        </div>
      )}
    </section>
  );
}

function VisaCard({ checklist, label, l }) {
  const [checks, setChecks] = useState({});

  const toggle = (docId) => {
    setChecks(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  if (!checklist) return null;

  return (
    <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gray-900">{checklist.visaName}</h3>
        <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full font-semibold">{label}</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{checklist.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-400">{l(LABELS.maxStay)}</div>
          <div className="text-base font-semibold tabular-nums">{checklist.maxStay} {l(LABELS.days)}</div>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-400">{l(LABELS.processingTime)}</div>
          <div className="text-sm font-semibold">{checklist.processingTime}</div>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-400">{l(LABELS.fee)}</div>
          <div className="text-base font-semibold tabular-nums">{checklist.fee}</div>
        </div>
      </div>

      {/* Document Checklist */}
      <h4 className="text-[15px] font-semibold mb-2.5">{l(LABELS.documents)}</h4>
      <div className="flex flex-col gap-2 mb-4">
        {checklist.documents.map(doc => (
          <label
            key={doc.id}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all duration-200 ${
              checks[doc.id]
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={!!checks[doc.id]}
              onChange={() => toggle(doc.id)}
              className="mt-0.5 accent-teal-600"
            />
            <div>
              <div className="font-medium text-sm">
                {doc.name}
                {doc.required && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className="text-[13px] text-gray-500 mt-0.5">{doc.description}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-800">
        <strong>{l(LABELS.note)}:</strong> {checklist.notes}
      </div>
    </div>
  );
}

export default function VisaClient() {
  const lang = useLang();
  const l = (obj) => obj[lang] || obj['en'] || '';

  const [nationality, setNationality] = useState('ru');
  const [duration, setDuration] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ nationality, duration: String(duration), lang });

    fetch(`/api/khidi/visa?${params}`)
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        if (res.ok) setData(res);
        else { setData(null); setError(true); }
      })
      .catch(() => { if (!cancelled) { setData(null); setError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [nationality, duration, lang]);

  return (
    <main className="max-w-[900px] mx-auto px-4 py-6 md:py-10" aria-label={l(LABELS.title)}>
      <h1 className="text-3xl md:text-4xl font-bold mb-1 text-gray-900">{l(LABELS.title)}</h1>
      <p className="text-gray-500 mb-6">{l(LABELS.subtitle)}</p>

      {/* Inputs */}
      <form onSubmit={e => e.preventDefault()} className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="visa-nationality" className="text-sm font-semibold block mb-1.5">{l(LABELS.nationality)}</label>
          <select
            id="visa-nationality"
            value={nationality}
            onChange={e => setNationality(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            {NATIONALITIES.map(n => (
              <option key={n.value} value={n.value}>{l(n.label)}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <span className="text-sm font-semibold block mb-1.5">{l(LABELS.duration)}</span>
          <div className="flex gap-2" role="group" aria-label={l(LABELS.duration)}>
            {[
              { key: 'short', days: 30, label: LABELS.stayShort },
              { key: 'long', days: 120, label: LABELS.stayLong },
            ].map(opt => {
              const active = opt.key === 'short' ? duration <= 90 : duration > 90;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDuration(opt.days)}
                  aria-pressed={active}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {l(opt.label)}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {loading ? (
        <p className="text-center text-gray-400 py-10">{l(LABELS.loading)}</p>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-gray-600 mb-3">{l(LABELS.errorTitle)}</p>
          <button
            onClick={() => setDuration(d => d)}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition-all duration-200"
          >
            {l(LABELS.retry)}
          </button>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-5">
          {/* Country-specific entry status — the part that genuinely changes per country */}
          <CountryEntryCard entry={data.countryEntry} l={l} />

          <VisaCard checklist={data.recommended} label={l(LABELS.recommended)} l={l} />
          {data.alternative && (
            <VisaCard checklist={data.alternative} label={l(LABELS.alternative)} l={l} />
          )}

          {/* Disclaimer + official source */}
          <div className="text-[13px] text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
            <p className="mb-1">{l(LABELS.disclaimer)}</p>
            <a
              href={OFFICIAL_KETA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 hover:text-teal-800 hover:underline font-medium"
            >
              {l(LABELS.officialKeta)} ↗
            </a>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="self-center px-6 py-3 rounded-lg bg-teal-600 text-white text-[15px] font-semibold hover:bg-teal-700 transition-all duration-200"
          >
            {l(LABELS.print)}
          </button>
        </div>
      ) : null}

      <style>{`
        @media print {
          button { display: none !important; }
          select, input { border: 1px solid #000 !important; }
        }
      `}</style>
    </main>
  );
}
