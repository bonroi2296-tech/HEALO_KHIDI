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

const LABELS = {
  title: { ko: '의료비자 가이드', en: 'Medical Visa Guide', ru: 'Гид по медицинской визе', zh: '医疗签证指南', ja: '医療ビザガイド', kz: 'Медициналық виза нұсқаулығы' },
  subtitle: { ko: '한국 의료 비자 신청에 필요한 정보', en: 'Information for Korean medical visa application', ru: 'Информация для получения медицинской визы в Корею', zh: '韩国医疗签证申请所需信息', ja: '韓国医療ビザ申請に必要な情報', kz: 'Корея медициналық визасына қажетті ақпарат' },
  nationality: { ko: '국적', en: 'Nationality', ru: 'Гражданство', zh: '国籍', ja: '国籍', kz: 'Азаматтық' },
  duration: { ko: '예상 치료 기간 (일)', en: 'Expected treatment duration (days)', ru: 'Ожидаемый срок лечения (дни)', zh: '预计治疗时间（天）', ja: '予想治療期間（日）', kz: 'Болжалды емдеу мерзімі (күн)' },
  recommended: { ko: '추천 비자', en: 'Recommended Visa', ru: 'Рекомендуемая виза', zh: '推荐签证', ja: '推奨ビザ', kz: 'Ұсынылған виза' },
  alternative: { ko: '대안 비자', en: 'Alternative Visa', ru: 'Альтернативная виза', zh: '备选签证', ja: '代替ビザ', kz: 'Балама виза' },
  documents: { ko: '필요 서류', en: 'Required Documents', ru: 'Необходимые документы', zh: '所需文件', ja: '必要書類', kz: 'Қажетті құжаттар' },
  processingTime: { ko: '처리 기간', en: 'Processing Time', ru: 'Срок обработки', zh: '处理时间', ja: '処理期間', kz: 'Өңдеу мерзімі' },
  fee: { ko: '수수료', en: 'Fee', ru: 'Сбор', zh: '费用', ja: '手数料', kz: 'Алым' },
  maxStay: { ko: '최대 체류', en: 'Max Stay', ru: 'Макс. пребывание', zh: '最长停留', ja: '最大滞在', kz: 'Макс. тұру' },
  days: { ko: '일', en: 'days', ru: 'дней', zh: '天', ja: '日', kz: 'күн' },
  embassy: { ko: '대사관 정보', en: 'Embassy Info', ru: 'Информация о посольстве', zh: '大使馆信息', ja: '大使館情報', kz: 'Елшілік ақпараты' },
  print: { ko: '체크리스트 인쇄', en: 'Print Checklist', ru: 'Печать чек-листа', zh: '打印清单', ja: 'チェックリスト印刷', kz: 'Тізімді басып шығару' },
  note: { ko: '참고', en: 'Note', ru: 'Примечание', zh: '备注', ja: '備考', kz: 'Ескерту' },
  loading: { ko: '로딩 중...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...', ja: '読み込み中...', kz: 'Жүктелуде...' },
};

function VisaCard({ checklist, label, l }) {
  const [checks, setChecks] = useState({});

  const toggle = (docId) => {
    setChecks(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  if (!checklist) return null;

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-blue-800">{checklist.visaName}</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-xl font-semibold">{label}</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{checklist.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-400">{l(LABELS.maxStay)}</div>
          <div className="text-base font-semibold">{checklist.maxStay} {l(LABELS.days)}</div>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-400">{l(LABELS.processingTime)}</div>
          <div className="text-sm font-semibold">{checklist.processingTime}</div>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-400">{l(LABELS.fee)}</div>
          <div className="text-base font-semibold">{checklist.fee}</div>
        </div>
      </div>

      {/* Document Checklist */}
      <h4 className="text-[15px] font-semibold mb-2.5">{l(LABELS.documents)}</h4>
      <div className="flex flex-col gap-2 mb-4">
        {checklist.documents.map(doc => (
          <label
            key={doc.id}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border ${
              checks[doc.id]
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={!!checks[doc.id]}
              onChange={() => toggle(doc.id)}
              className="mt-0.5"
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

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ nationality, duration: String(duration), lang });

    fetch(`/api/khidi/visa?${params}`)
      .then(r => r.json())
      .then(res => {
        if (res.ok) setData(res);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [nationality, duration, lang]);

  return (
    <main className="max-w-[900px] mx-auto px-4 py-6" aria-label={l(LABELS.title)}>
      <h1 className="text-[28px] font-bold mb-1">{l(LABELS.title)}</h1>
      <p className="text-gray-500 mb-6">{l(LABELS.subtitle)}</p>

      {/* Inputs */}
      <form onSubmit={e => e.preventDefault()} className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="visa-nationality" className="text-sm font-semibold block mb-1.5">{l(LABELS.nationality)}</label>
          <select
            id="visa-nationality"
            value={nationality}
            onChange={e => setNationality(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
          >
            {NATIONALITIES.map(n => (
              <option key={n.value} value={n.value}>{l(n.label)}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="visa-duration" className="text-sm font-semibold block mb-1.5">{l(LABELS.duration)}</label>
          <input
            id="visa-duration"
            type="number"
            value={duration}
            onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={365}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
          />
        </div>
      </form>

      {loading ? (
        <p className="text-center text-gray-400 py-10">{l(LABELS.loading)}</p>
      ) : data ? (
        <div className="flex flex-col gap-5">
          <VisaCard checklist={data.recommended} label={l(LABELS.recommended)} l={l} />
          {data.alternative && (
            <VisaCard checklist={data.alternative} label={l(LABELS.alternative)} l={l} />
          )}

          {/* Embassy Info */}
          {data.embassy && (
            <div className="border border-gray-200 rounded-xl p-4 bg-slate-50">
              <h4 className="text-[15px] font-semibold mb-2">{l(LABELS.embassy)}</h4>
              <p className="text-sm mb-1">{data.embassy.ko || data.embassy.en}</p>
              {data.embassy.url && (
                <a href={data.embassy.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-600 hover:underline">
                  {data.embassy.url}
                </a>
              )}
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="self-center px-6 py-3 rounded-lg bg-blue-600 text-white text-[15px] font-semibold hover:bg-blue-700 transition"
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
