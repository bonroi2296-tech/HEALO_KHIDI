"use client";

/**
 * 환자 의뢰서 — 한 장 · 접이식 6묶음 · 보내기 버튼 하나.
 *
 * 칸은 하나도 여기서 정의하지 않는다. 전부 src/lib/inquiry/referralSchema.js 를 그려낸다.
 * 칸을 더하거나 빼려면 그 파일만 고쳐라(화면·서버 검증·병원 양식 출력이 같은 파일을 본다).
 *
 * 지금 상태: 화면과 검증만. 보내기(서버 저장)는 아직 안 붙였다.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, ChevronDown, AlertTriangle, Paperclip, X } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { CANCER_TYPES, STAGES, optLabel } from "@/lib/inquiry/intakeLabels";
import { describeUpload } from "@/lib/uploadPolicy";
import {
  SECTIONS, CONSENTS, DOC_CHECKLIST,
  lab, fieldsByReq, missingIntake, missingForReferral, referralReadiness,
} from "@/lib/inquiry/referralSchema";

const DRAFT_KEY = "healo_referral_draft_v1";

// 국적·언어 — 지금 폼과 같은 목록(저장값 불변).
const NATIONALITIES = [
  { value: "KZ", label: "Kazakhstan / Қазақстан" },
  { value: "RU", label: "Russia / Россия" },
  { value: "UZ", label: "Uzbekistan / Ўзбекистон" },
  { value: "KG", label: "Kyrgyzstan / Кыргызстан" },
  { value: "MN", label: "Mongolia / Монгол" },
  { value: "CN", label: "China / 中国" },
  { value: "JP", label: "Japan / 日本" },
  { value: "KR", label: "Korea / 한국" },
  { value: "OTHER", label: "Other / 기타" },
];
const LANGS = [
  { value: "ru", label: "Русский" }, { value: "kz", label: "Қазақша" },
  { value: "en", label: "English" }, { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" }, { value: "ko", label: "한국어" },
];

const TR = {
  title:      { ko: "환자 의뢰서", en: "Patient referral form", ru: "Направление пациента" },
  sub:        { ko: "한국 대학병원이 진료 의뢰를 받을 때 요구하는 내용입니다. 저희가 대신 정리해 전달해 드립니다 — 아는 만큼만 채우셔도 됩니다.",
                en: "These are the items Korean university hospitals ask for when accepting a referral. We compile and forward it for you — fill in only what you know.",
                ru: "Это сведения, которые запрашивают корейские университетские клиники при приёме направления. Мы соберём и передадим их за вас — заполняйте только то, что знаете." },
  barIntake:  { ko: "접수", en: "Get in touch", ru: "Приём обращения" },
  barIntakeOk:{ ko: "지금 보낼 수 있습니다", en: "You can send it now", ru: "Можно отправить сейчас" },
  barIntakeNo:{ ko: "{n}칸만 채우면 보낼 수 있습니다", en: "{n} more field(s) and you can send", ru: "Ещё {n} — и можно отправить" },
  barReferral:{ ko: "대학병원 의뢰 준비", en: "Ready for the university hospital", ru: "Готовность для клиники" },
  barRefMeta: { ko: "{pct}% — 대학병원이 요구하는 항목 {n}가지가 아직 비어 있습니다",
                en: "{pct}% — {n} item(s) the university hospital asks for are still empty",
                ru: "{pct}% — не заполнено {n} пунктов, которые запрашивает клиника" },
  barRefDone: { ko: "100% — 대학병원이 요구하는 항목이 모두 채워졌습니다", en: "100% — everything the hospital asks for is filled in", ru: "100% — заполнено всё, что запрашивает клиника" },
  laterNote:  { ko: "지금 다 못 채워도 됩니다. 보내신 뒤에도 같은 링크에서 이어서 채울 수 있고, 준비가 되면 저희가 대학병원에 전달합니다.",
                en: "You don't have to finish now. You can keep filling it in from the same link after sending — we forward it once it's ready.",
                ru: "Не обязательно заполнять всё сразу. После отправки можно продолжить по той же ссылке — мы передадим, когда всё будет готово." },
  extraDocs:  { ko: "대학병원마다 요구하는 자료가 조금씩 다릅니다. 병원이 케이스를 본 뒤 추가 자료를 요청하는 경우가 있는데, 그때는 저희가 무엇이 필요한지 정리해서 따로 알려드립니다.",
                en: "Each university hospital asks for slightly different documents. If the hospital requests more after reviewing the case, we will tell you exactly what is needed.",
                ru: "Каждая клиника запрашивает немного разные документы. Если после изучения случая клиника попросит дополнительные материалы, мы сообщим, что именно нужно." },
  grpPrimary: { ko: "지금 필요한 자료 — 대학병원이 「치료가 가능한지」를 판단하는 근거입니다",
                en: "Needed now — this is what the hospital uses to judge whether treatment is possible",
                ru: "Нужно сейчас — на основании этого клиника решает, возможно ли лечение" },
  grpOnsite:  { ko: "내원이 확정된 뒤에 주시면 되는 것 — 지금 없어도 의뢰는 진행됩니다",
                en: "Only once the visit is confirmed — the referral proceeds without these",
                ru: "Только после подтверждения визита — направление можно отправить и без этого" },
  done:       { ko: "완료", en: "done", ru: "готово" },
  left:       { ko: "{n}칸 남음", en: "{n} left", ru: "осталось {n}" },
  optional:   { ko: "(선택)", en: "(optional)", ru: "(необязательно)" },
  forReferral:{ ko: "의뢰용", en: "for referral", ru: "для направления" },
  submit:     { ko: "의뢰서 보내기", en: "Send referral", ru: "Отправить направление" },
  submitOff:  { ko: "{n}칸만 더 채우면 보낼 수 있습니다", en: "Fill {n} more field(s) to send", ru: "Заполните ещё {n} — и можно отправить" },
  autosave:   { ko: "쓰던 내용은 자동 저장됩니다 — 창을 닫아도 그대로 있습니다",
                en: "Your answers are saved automatically — closing the window is safe.",
                ru: "Ответы сохраняются автоматически — можно закрыть окно." },
  saved:      { ko: "마지막 저장 {t}", en: "Saved {t}", ru: "Сохранено {t}" },
  consentTitle:{ ko: "개인정보 수집 · 이용 동의", en: "Consent", ru: "Согласие на обработку данных" },
  consentAll: { ko: "모두 동의 (선택 포함)", en: "Agree to all (including optional)", ru: "Согласен со всем (включая необязательное)" },
  checklist:  { ko: "대학병원이 공통으로 요구하는 자료입니다 — 가지고 계신 것만 체크해 두세요 (필수 아님)",
                en: "Documents university hospitals commonly ask for — tick the ones you have (not required)",
                ru: "Документы, которые обычно запрашивают клиники — отметьте те, что у вас есть (необязательно)" },
  warnTitle:  { ko: "검사 자료가 아직 없습니다", en: "Medical documents are still missing", ru: "Медицинские документы ещё не приложены" },
  warnBody:   { ko: "대학병원은 이 자료를 보고 판단합니다. 없으면 병원이 소견을 못 내고 자료를 다시 요청하게 되어 보통 1~2주가 더 걸립니다. 지금 없어도 보내실 수 있고, 구하시는 대로 이어서 올리시면 됩니다.",
                en: "University hospitals base their opinion on these. Without them the hospital has to request them again, which usually adds 1–2 weeks. You can still send now and add them later.",
                ru: "Клиника принимает решение на основании этих материалов. Без них она запросит их повторно — обычно это добавляет 1–2 недели. Отправить можно и сейчас, а материалы добавить позже." },
  warnAck:    { ko: "지금은 없습니다. 구한 뒤에 따로 보내겠습니다.",
                en: "I don't have them yet. I will send them later.",
                ru: "Их пока нет. Отправлю позже." },
  icdUnknown: { ko: "모르겠습니다 — 서류 보고 정해주세요", en: "I don't know — please determine it from my documents", ru: "Не знаю — определите по моим документам" },
  pick:       { ko: "선택", en: "Select", ru: "Выберите" },
  addFile:    { ko: "파일 고르기", en: "Choose file", ru: "Выбрать файл" },
};
const tr = (k, lang, vars) => {
  let s = TR[k]?.[lang] || TR[k]?.en || TR[k]?.ko || "";
  if (vars) for (const [n, v] of Object.entries(vars)) s = s.replaceAll(`{${n}}`, v);
  return s;
};

export default function ReferralForm() {
  // useLang() 은 문자열을 그대로 돌려준다({lang} 으로 꺼내면 undefined 라 전부 영어로 떨어진다).
  const lang = useLang();
  const [values, setValues] = useState({});
  const [consents, setConsents] = useState({});
  const [checklist, setChecklist] = useState([]);
  const [docAck, setDocAck] = useState(false);
  const [open, setOpen] = useState({ identity: true });
  const [savedAt, setSavedAt] = useState(null);
  const loaded = useRef(false);

  // 쓰던 내용 복구 — 긴 폼의 유일한 진짜 위험은 「쓰다 날림」이다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setValues(d.values || {});
        setConsents(d.consents || {});
        setChecklist(d.checklist || []);
      }
    } catch { /* 저장본이 깨졌으면 그냥 빈 폼으로 시작한다 */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, consents, checklist }));
      setSavedAt(new Date());
    } catch { /* 저장 공간이 없어도 폼은 계속 쓸 수 있어야 한다 */ }
  }, [values, consents, checklist]);

  const set = (name, v) => setValues((p) => ({ ...p, [name]: v }));

  // 문턱 ① 접수 — 보내기 버튼을 막는 유일한 것. 5칸 + 동의.
  const missIntake = useMemo(() => missingIntake(values), [values]);
  const consentOk = CONSENTS.filter((c) => c.required).every((c) => consents[c.name]);
  const intakeTotal = fieldsByReq("intake").length + 1; // 동의 묶음을 한 칸으로 센다
  const intakeLeft = missIntake.length + (consentOk ? 0 : 1);
  const canSend = intakeLeft === 0;

  // 문턱 ② 의뢰 준비 — 아무것도 막지 않는다. 얼마나 왔는지만 보여준다.
  const missRef = useMemo(() => missingForReferral(values), [values]);
  const readiness = useMemo(() => referralReadiness(values), [values]);

  // 묶음 머리의 「n칸 남음」은 «의뢰용으로 아직 빈 칸» 수. 접수 문턱과 헷갈리지 않게
  // 묶음 안에서 접수 칸이 비어 있으면 그것부터 센다.
  const secState = (sec) => {
    if (sec.id === "consent") return consentOk ? 0 : 1;
    return sec.fields.filter((f) => (f.req === "intake" && missIntake.includes(f.name))
                                 || (f.req === "referral" && missRef.includes(f.name))).length;
  };

  const allSections = [...SECTIONS, { id: "consent", title: TR.consentTitle, fields: [] }];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">

        {/* 머리 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{tr("title", lang)}</h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">{tr("sub", lang)}</p>
          {/* 막대가 «두 개»인 게 이 화면의 핵심이다.
              위: 지금 보낼 수 있나(문턱)  ·  아래: 병원까지 얼마나 왔나(안 막음). */}
          <div className="mt-6 space-y-4">
            <Bar label={tr("barIntake", lang)}
                 pct={((intakeTotal - intakeLeft) / intakeTotal) * 100}
                 tone={canSend ? "done" : "todo"}
                 meta={canSend ? tr("barIntakeOk", lang) : tr("barIntakeNo", lang, { n: intakeLeft })} />
            <Bar label={tr("barReferral", lang)}
                 pct={readiness} tone="soft"
                 meta={readiness === 100
                   ? tr("barRefDone", lang)
                   : tr("barRefMeta", lang, { pct: readiness, n: missRef.length })} />
          </div>
          <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-xs leading-relaxed text-teal-800 md:text-sm">
            {tr("laterNote", lang)}
          </p>
        </div>

        {/* 묶음 */}
        <div className="mt-5 space-y-3">
          {allSections.map((sec, i) => {
            const left = secState(sec);
            const isOpen = !!open[sec.id];
            return (
              <section key={sec.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <button type="button" onClick={() => setOpen((p) => ({ ...p, [sec.id]: !p[sec.id] }))}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left md:px-6">
                  <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-xs font-bold ${
                    left === 0 ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {left === 0 ? <Check size={15} /> : i + 1}
                  </span>
                  <span className="flex-1 font-bold text-gray-900">{lab(sec.title, lang)}</span>
                  <span className="text-xs text-gray-600 tabular-nums md:text-sm">
                    {left === 0 ? tr("done", lang) : tr("left", lang, { n: left })}
                  </span>
                  <ChevronDown size={16} className={`text-gray-500 transition-all duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 px-4 pb-6 md:px-6">
                    {sec.id === "consent" ? (
                      <ConsentBlock lang={lang} consents={consents} setConsents={setConsents} />
                    ) : sec.id === "documents" ? (
                      <DocSection lang={lang} sec={sec} values={values} set={set} missRef={missRef}
                                  docAck={docAck} setDocAck={setDocAck}
                                  checklist={checklist} setChecklist={setChecklist} />
                    ) : (
                      <div className="flex flex-wrap gap-x-4">
                        {sec.fields.map((f) => (
                          <Field key={f.name} f={f} lang={lang} value={values[f.name]} onChange={set} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* 바닥 */}
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <button type="button" disabled={!canSend}
                  className={`w-full rounded-xl px-6 py-3.5 text-base font-bold transition-all duration-200 ${
                    canSend ? "bg-teal-700 text-white hover:bg-teal-800" : "cursor-not-allowed bg-gray-200 text-gray-600"}`}>
            {canSend ? tr("submit", lang) : tr("submitOff", lang, { n: intakeLeft })}
          </button>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-600">
            <span>{tr("autosave", lang)}</span>
            {savedAt && <span className="tabular-nums">{tr("saved", lang, {
              t: savedAt.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-GB", { hour: "2-digit", minute: "2-digit" }) })}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 칸 하나 ─────────────────────────────────────────────── */
function Field({ f, lang, value, onChange }) {
  if (f.type === "note") {
    return <p className="mt-2 w-full text-xs leading-relaxed text-gray-600">{lab(f.label, lang)}</p>;
  }

  const label = lab(f.label, lang);
  const ph = f.placeholder ? lab(f.placeholder, lang) : "";
  const box = "w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 " +
              "placeholder:text-gray-500 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700";

  let control = null;
  switch (f.type) {
    case "text": case "email": case "url": case "phone":
      control = <input type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                       className={box} placeholder={ph} value={value || ""}
                       onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "date":
      control = <input type="date" className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "month":
      control = <input type="month" className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "textarea":
      control = <textarea rows={3} className={box} placeholder={ph} value={value || ""}
                          onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "check":
      return (
        <div className="mt-4 flex-1 basis-full md:basis-[calc(50%-0.5rem)]">
          <Toggle checked={!!value} onClick={() => onChange(f.name, !value)} label={label} />
        </div>
      );
    case "chips": case "chipsMulti": {
      const multi = f.type === "chipsMulti";
      const cur = multi ? (value || []) : value;
      control = (
        <div className="flex flex-wrap gap-2">
          {f.options.map((o) => {
            const on = multi ? cur.includes(o.value) : cur === o.value;
            return (
              <button key={o.value} type="button"
                onClick={() => onChange(f.name, multi
                  ? (on ? cur.filter((x) => x !== o.value) : [...cur, o.value])
                  : (on ? "" : o.value))}
                className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
                  on ? "border-teal-700 bg-teal-50 font-semibold text-teal-800" : "border-gray-300 text-gray-700 hover:border-gray-400"}`}>
                {lab(o.label, lang)}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "nationality": case "lang": case "cancerType": case "stage": {
      const opts =
        f.type === "nationality" ? NATIONALITIES.map((o) => ({ value: o.value, text: o.label })) :
        f.type === "lang" ? LANGS.map((o) => ({ value: o.value, text: o.label })) :
        f.type === "cancerType" ? CANCER_TYPES.map((o) => ({ value: o.value, text: optLabel(o, lang) })) :
        STAGES.map((o) => ({ value: o.value, text: optLabel(o, lang) }));
      control = (
        <select className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)}>
          <option value="">{tr("pick", lang)}</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
        </select>
      );
      break;
    }
    case "icdSuggest":
      // 코드를 못 고르는 게 정상이다 — 「모르겠습니다」가 기본이고 관문이 아니다.
      control = (
        <>
          <input className={box} placeholder="C18.2" value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />
          <Toggle checked={value === "__unknown__"} onClick={() => onChange(f.name, value === "__unknown__" ? "" : "__unknown__")}
                  label={tr("icdUnknown", lang)} className="mt-2" />
        </>
      );
      break;
    case "file":
      control = <FileBox f={f} lang={lang} value={value} onChange={onChange} />;
      break;
    default:
      control = <input className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
  }

  return (
    <div className={`mt-4 min-w-0 ${f.half ? "flex-1 basis-full md:basis-[calc(50%-0.5rem)]" : "w-full"}`}>
      {/* 라벨 없는 칸(바로 위 칸에 딸린 서술 칸)은 「(선택)」만 덩그러니 뜨지 않게 통째로 뺀다. */}
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          {label}
          {/* 별표는 «접수 문턱»에만. 의뢰용 칸은 막지 않으므로 별표가 아니라 회색 꼬리표다 —
              별표를 14개 붙이면 사람은 그걸 «다 채워야 한다»로 읽고 창을 닫는다. */}
          {f.req === "intake" && <span className="ml-0.5 text-red-600">*</span>}
          {f.req === "referral" && (
            <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              {tr("forReferral", lang)}
            </span>
          )}
          {f.req === "optional" && <span className="ml-1.5 text-xs font-normal text-gray-500">{tr("optional", lang)}</span>}
        </label>
      )}
      {control}
      {f.hint && <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{lab(f.hint, lang)}</p>}
    </div>
  );
}

/** 진행 막대 하나. tone: done=다 참 · todo=아직 · soft=막지 않는 준비도 */
function Bar({ label, pct, meta, tone }) {
  const fill = tone === "done" ? "bg-emerald-700" : tone === "soft" ? "bg-teal-700" : "bg-gray-400";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-xs tabular-nums md:text-sm ${tone === "done" ? "font-semibold text-emerald-700" : "text-gray-600"}`}>
          {meta}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all duration-200 ${fill}`}
             style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function Toggle({ checked, onClick, label, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-start gap-2.5 text-left ${className}`}>
      <span className={`mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded border-2 transition-all duration-200 ${
        checked ? "border-teal-700 bg-teal-700" : "border-gray-300"}`}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

function FileBox({ f, lang, value, onChange }) {
  const files = value || [];
  const ref = useRef(null);
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-5 text-center transition-all duration-200 hover:border-gray-400">
        <span className="block text-sm font-semibold text-gray-700">{tr("addFile", lang)}</span>
        <span className="mt-1 block text-xs text-gray-600">{describeUpload(f.kind || "medicalDoc", lang)}</span>
      </button>
      {/* 실제 올리기는 서버 붙일 때. 지금은 고른 파일만 보여준다. */}
      <input ref={ref} type="file" multiple className="hidden"
             onChange={(e) => onChange(f.name, [...files, ...Array.from(e.target.files || [])
               .map((x) => ({ name: x.name, size: x.size }))])} />
      {files.map((x, i) => (
        <div key={i} className="mt-2 flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <Paperclip size={14} className="flex-none text-gray-500" />
          <span className="min-w-0 flex-1 truncate text-gray-900">{x.name}</span>
          <span className="flex-none text-xs text-gray-600 tabular-nums">{Math.round(x.size / 1024 / 1024 * 10) / 10}MB</span>
          <button type="button" onClick={() => onChange(f.name, files.filter((_, j) => j !== i))}
                  className="flex-none text-gray-500 hover:text-gray-700"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

/**
 * 자료 묶음 — 「지금 필요한 것」과 「내원 확정 후」를 갈라서 보여준다.
 * 왜: 여권 사본은 대학병원 안내에 「보내주시지 않더라도 의뢰 진행 가능, 내원 확정시에는 필수」라고
 *     명시돼 있다. 그런데 한 덩어리로 늘어놓으면 지금 못 구하는 사람이 전체를 포기한다.
 */
function DocSection({ lang, sec, values, set, missRef, docAck, setDocAck, checklist, setChecklist }) {
  const primary = sec.fields.filter((f) => f.group !== "onsite");
  const onsite = sec.fields.filter((f) => f.group === "onsite");
  return (
    <>
      <p className="mt-5 text-xs font-semibold leading-relaxed text-gray-700 md:text-sm">{tr("grpPrimary", lang)}</p>
      <div className="flex flex-wrap gap-x-4">
        {primary.map((f) => <Field key={f.name} f={f} lang={lang} value={values[f.name]} onChange={set} />)}
      </div>

      <DocExtras lang={lang} missRef={missRef} docAck={docAck} setDocAck={setDocAck}
                 checklist={checklist} setChecklist={setChecklist} />

      <div className="mt-6 border-t border-gray-200 pt-5">
        <p className="text-xs font-semibold leading-relaxed text-gray-700 md:text-sm">{tr("grpOnsite", lang)}</p>
        <div className="flex flex-wrap gap-x-4">
          {onsite.map((f) => <Field key={f.name} f={f} lang={lang} value={values[f.name]} onChange={set} />)}
        </div>
      </div>

      <p className="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
        {tr("extraDocs", lang)}
      </p>
    </>
  );
}

function DocExtras({ lang, missRef, docAck, setDocAck, checklist, setChecklist }) {
  // 「지금 필요한」 자료 3종 중 하나라도 비었을 때만 뜬다(여권은 내원 확정 후라 안 센다).
  // 막는 게 아니라 «없으면 얼마나 늦어지는지»를 알려준다.
  const show = ["dischargeSummary", "testResults", "imaging"].some((n) => missRef.includes(n));
  return (
    <>
      {show && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 flex-none text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-700">{tr("warnTitle", lang)}</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-700">{tr("warnBody", lang)}</p>
              <Toggle checked={docAck} onClick={() => setDocAck(!docAck)} label={tr("warnAck", lang)} className="mt-3" />
            </div>
          </div>
        </div>
      )}
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-bold text-gray-700">{tr("checklist", lang)}</p>
        <div className="space-y-2.5">
          {DOC_CHECKLIST.map((d) => (
            <Toggle key={d.value} checked={checklist.includes(d.value)} label={lab(d.label, lang)}
                    onClick={() => setChecklist(checklist.includes(d.value)
                      ? checklist.filter((x) => x !== d.value) : [...checklist, d.value])} />
          ))}
        </div>
      </div>
    </>
  );
}

function ConsentBlock({ lang, consents, setConsents }) {
  const all = CONSENTS.every((c) => consents[c.name]);
  return (
    <div className="space-y-2.5 pt-4">
      <Toggle checked={all} label={tr("consentAll", lang)}
              onClick={() => setConsents(all ? {} : Object.fromEntries(CONSENTS.map((c) => [c.name, true])))} />
      <div className="h-px bg-gray-200" />
      {CONSENTS.map((c) => (
        <Toggle key={c.name} checked={!!consents[c.name]} label={lab(c.label, lang)}
                onClick={() => setConsents((p) => ({ ...p, [c.name]: !p[c.name] }))} />
      ))}
    </div>
  );
}
