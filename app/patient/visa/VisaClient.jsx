'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import { isNativeApp } from '@/lib/isNativeApp';

// 국적 선택지 — value 는 API 로직 키(그대로), 표시 라벨은 중앙 i18n 사전 patientVisa.nations.* 키.
const NATIONALITY_VALUES = ['ru', 'kz', 'mn', 'uz', 'kg', 'tj', 'az', 'zh', 'ja', 'en'];

// 공식 출처 — 사용자가 항상 최종 확인할 수 있게 노출
const OFFICIAL_KETA_URL = 'https://www.k-eta.go.kr/';

function fmt(template, n) {
  return template.replace('{n}', String(n));
}

function StatusBadge({ entry, lang }) {
  const map = {
    visa_free: { label: t('patientVisa.statusFree', lang), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    visa_required: { label: t('patientVisa.statusRequired', lang), cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    conditional: { label: t('patientVisa.statusConditional', lang), cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const s = map[entry.shortStay] || map.conditional;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>
      {s.label}
      {entry.shortStay === 'visa_free' && entry.visaFreeDays && (
        <span className="tabular-nums font-normal opacity-80">· {fmt(t('patientVisa.upToDays', lang), entry.visaFreeDays)}</span>
      )}
    </span>
  );
}

function CountryEntryCard({ entry, lang }) {
  if (!entry) return null;
  return (
    <section className="border border-teal-100 rounded-xl p-5 md:p-6 bg-teal-50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-base md:text-lg font-bold text-gray-900">{t('patientVisa.entryStatus', lang)}</h2>
        <StatusBadge entry={entry} lang={lang} />
      </div>

      <p className="text-sm md:text-base text-gray-700 leading-relaxed">{entry.summary}</p>

      {entry.note && (
        <div className="mt-3 bg-white border border-teal-100 rounded-lg p-3 text-[13px] text-gray-600 leading-relaxed">
          {entry.note}
        </div>
      )}

      {entry.embassyName && (
        <div className="mt-3 text-sm">
          <div className="text-xs text-gray-500 mb-0.5">{t('patientVisa.embassy', lang)}</div>
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

function VisaCard({ checklist, label, lang, sync, serverChecks, onPersist }) {
  // 준비 체크 저장:
  //  - 로그인(sync='account') → 계정(서버)에 저장, 다른 기기에서도 이어짐
  //  - 비로그인(sync='local') → 브라우저 localStorage 폴백
  const storageKey = checklist ? `healo:visa-checklist:${checklist.visaType}` : null;
  const visaType = checklist ? checklist.visaType : null;
  const [checks, setChecks] = useState({});

  // 소스에서 체크 복원 (SSR 안전 위해 effect에서 로드 → 하이드레이션 불일치 방지)
  useEffect(() => {
    if (sync === 'loading') return; // 아직 로그인 여부 판별 중
    if (sync === 'account') {
      setChecks(serverChecks || {});
      return;
    }
    // local 폴백
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      setChecks(saved ? JSON.parse(saved) : {});
    } catch {
      /* 저장소 접근 불가(프라이빗 모드 등) — 세션 내 체크만 동작 */
    }
  }, [sync, serverChecks, storageKey]);

  const toggle = (docId) => {
    setChecks(prev => {
      const next = { ...prev, [docId]: !prev[docId] };
      // localStorage 캐시(오프라인/비로그인용) — 항상 갱신
      try {
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* 저장 실패는 무시 — UI 체크는 계속 동작 */
      }
      // 로그인 상태면 계정(서버)에도 저장
      if (sync === 'account' && onPersist && visaType) onPersist(visaType, next);
      return next;
    });
  };

  if (!checklist) return null;

  const totalDocs = checklist.documents.length;
  const doneDocs = checklist.documents.filter(d => checks[d.id]).length;

  return (
    <div className="border border-gray-200 rounded-xl p-5 md:p-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gray-900">{checklist.visaName}</h3>
        <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full font-semibold">{label}</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{checklist.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-500">{t('patientVisa.maxStay', lang)}</div>
          <div className="text-base font-semibold tabular-nums">{checklist.maxStay} {t('patientVisa.days', lang)}</div>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-500">{t('patientVisa.processingTime', lang)}</div>
          <div className="text-sm font-semibold">{checklist.processingTime}</div>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-lg">
          <div className="text-xs text-gray-500">{t('patientVisa.fee', lang)}</div>
          <div className="text-base font-semibold tabular-nums">{checklist.fee}</div>
        </div>
      </div>

      {/* Document Checklist */}
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-[15px] font-semibold">{t('patientVisa.documents', lang)}</h4>
        <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full tabular-nums">
          {t('patientVisa.prepared', lang)} {doneDocs}/{totalDocs}
        </span>
      </div>
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
                {doc.required && <span className="text-red-600 ml-1">*</span>}
              </div>
              <div className="text-[13px] text-gray-500 mt-0.5">{doc.description}</div>
            </div>
          </label>
        ))}
      </div>

      <p className="text-[11px] text-gray-500 mb-3 print:hidden">{t(sync === 'account' ? 'patientVisa.savedHintAccount' : 'patientVisa.savedHint', lang)}</p>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-800">
        <strong>{t('patientVisa.note', lang)}:</strong> {checklist.notes}
      </div>
    </div>
  );
}

// initialGuide: 서버가 «기본값(러시아·90일 이하)»으로 미리 계산해 넘겨주는 안내.
// 이게 있어야 JS 를 안 돌리는 검색·AI 로봇도 비자 종류·필요 서류를 읽어 간다.
// initialGuideLang 을 같이 받아 지금 언어와 다를 때만 버린다(엉뚱한 언어가 첫 화면에 박히지 않게).
export default function VisaClient({ initialGuide = null, initialGuideLang = null } = {}) {
  const lang = useLang();
  const seed = initialGuide && initialGuideLang === lang ? initialGuide : null;

  const [nationality, setNationality] = useState('ru');
  const [duration, setDuration] = useState(30);
  const [data, setData] = useState(seed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // 스토어 앱 안에서는 「인쇄」를 감춘다 — 앱에 박힌 브라우저는 window.print() 를 받아도
  // 아무 일도 안 한다(안드로이드 웹뷰는 인쇄 기능이 아예 없다). 눌러도 반응 없는 버튼이 되므로.
  // ⚠️ 폰이라고 감추는 게 아니다 — 폰 «브라우저»는 「PDF 로 저장」이 되니 그대로 둔다.
  // (판정 함수는 브라우저에서만 참값 → 첫 그림에 쓰면 수화 불일치. 반드시 이펙트로 늦춘다.)
  const [inNativeApp, setInNativeApp] = useState(false);
  useEffect(() => { setInNativeApp(isNativeApp()); }, []);

  // 서류 체크 저장소 판별: 로그인 환자면 계정(서버), 아니면 localStorage 폴백
  const [sync, setSync] = useState('loading'); // 'loading' | 'account' | 'local'
  const [accountChecks, setAccountChecks] = useState({}); // { [visaType]: {docId:true} }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/patient/visa-checklist')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(res => {
        if (cancelled) return;
        if (res && res.ok) { setAccountChecks(res.data || {}); setSync('account'); }
        else setSync('local');
      })
      .catch(() => { if (!cancelled) setSync('local'); });
    return () => { cancelled = true; };
  }, []);

  // 로그인 상태에서 체크 변경 시 서버에 저장(fire-and-forget)
  const persistChecks = useCallback((visaType, checked) => {
    fetch('/api/patient/visa-checklist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visaType, checked }),
    }).catch(() => { /* 저장 실패는 조용히 무시 — localStorage 캐시가 백업 */ });
  }, []);

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
    <main className="max-w-[900px] mx-auto px-4 py-6 md:py-10" aria-label={t('patientVisa.title', lang)}>
      <h1 className="text-3xl md:text-4xl font-bold mb-1 text-gray-900">{t('patientVisa.title', lang)}</h1>
      <p className="text-gray-500 mb-6">{t('patientVisa.subtitle', lang)}</p>

      {/* Inputs */}
      <form onSubmit={e => e.preventDefault()} className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="visa-nationality" className="text-sm font-semibold block mb-1.5">{t('patientVisa.nationality', lang)}</label>
          <select
            id="visa-nationality"
            value={nationality}
            onChange={e => setNationality(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            {NATIONALITY_VALUES.map(v => (
              <option key={v} value={v}>{t(`patientVisa.nations.${v}`, lang)}</option>
            ))}
          </select>
        </div>
        {/* 왜 「단기/장기」 두 단추뿐인가 (2026-08-07 PO 재확인 — 뜯지 마라)
            치료 기간을 «숫자로» 입력받자는 안이 두 번 나왔는데 둘 다 접었다. 이유:
            암 환자는 진단·치료계획이 나오기 «전»에 이 화면을 본다 — 며칠 걸릴지 본인도 모른다.
            모르는 값을 물으면 아무 숫자나 넣게 되고, 그 숫자로 비자를 판정하면 «틀린 안내»가 된다.
            → 기간은 묻지 않는다. 대신 무비자 한도의 함정을 COUNTRY_ENTRY.note 로 «먼저» 알려준다
              (visaGuide.ts — "무비자 30일은 검진·2차 소견까지"). */}
        <div className="flex-1 min-w-[200px]">
          <span className="text-sm font-semibold block mb-1.5">{t('patientVisa.duration', lang)}</span>
          <div className="flex gap-2" role="group" aria-label={t('patientVisa.duration', lang)}>
            {[
              { key: 'short', days: 30, labelKey: 'patientVisa.stayShort' },
              { key: 'long', days: 120, labelKey: 'patientVisa.stayLong' },
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
                      ? 'bg-teal-700 text-white border-teal-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t(opt.labelKey, lang)}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {loading ? (
        <p className="text-center text-gray-500 py-10">{t('patientVisa.loading', lang)}</p>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-gray-600 mb-3">{t('patientVisa.errorTitle', lang)}</p>
          <button
            onClick={() => setDuration(d => d)}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition-all duration-200"
          >
            {t('patientVisa.retry', lang)}
          </button>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-5">
          {/* Country-specific entry status — the part that genuinely changes per country */}
          <CountryEntryCard entry={data.countryEntry} lang={lang} />

          {/* CTA: 안내에서 실제 신청(초청장 발급)으로 연결 */}
          <a
            href="/patient/visa/applications"
            className="block rounded-xl border border-teal-200 bg-gradient-to-br from-teal-600 to-teal-700 text-white p-5 md:p-6 shadow-sm hover:from-teal-700 hover:to-teal-800 transition-all duration-200 print:hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold">{t('patientVisa.applyTitle', lang)}</h2>
                <p className="text-[13px] md:text-sm text-teal-50/90 mt-1 leading-relaxed">{t('patientVisa.applyDesc', lang)}</p>
              </div>
              <span className="shrink-0 inline-flex items-center rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25 transition-colors">
                {t('patientVisa.applyCta', lang)}
              </span>
            </div>
          </a>

          <VisaCard
            checklist={data.recommended}
            label={t('patientVisa.recommended', lang)}
            lang={lang}
            sync={sync}
            serverChecks={data.recommended ? accountChecks[data.recommended.visaType] : null}
            onPersist={persistChecks}
          />
          {data.alternative && (
            <VisaCard
              checklist={data.alternative}
              label={t('patientVisa.alternative', lang)}
              lang={lang}
              sync={sync}
              serverChecks={accountChecks[data.alternative.visaType]}
              onPersist={persistChecks}
            />
          )}

          {/* Disclaimer + official source */}
          <div className="text-[13px] text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
            <p className="mb-1">{t('patientVisa.disclaimer', lang)}</p>
            <a
              href={OFFICIAL_KETA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 hover:text-teal-800 hover:underline font-medium"
            >
              {t('patientVisa.officialKeta', lang)} ↗
            </a>
          </div>

          {/* Print Button — 스토어 앱 안에서는 눌러도 아무 일이 없어서 감춘다(위 inNativeApp 주석) */}
          {!inNativeApp && (
            <button
              onClick={() => window.print()}
              className="self-center px-6 py-3 rounded-lg bg-teal-700 text-white text-[15px] font-semibold hover:bg-teal-700 transition-all duration-200"
            >
              {t('patientVisa.print', lang)}
            </button>
          )}
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
