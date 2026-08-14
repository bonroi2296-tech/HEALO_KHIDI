"use client";

/**
 * 환자 의뢰서 — 한 장 · 접이식 6묶음 · 보내기 버튼 하나.
 *
 * 칸은 하나도 여기서 정의하지 않는다. 전부 src/lib/inquiry/referralSchema.js 를 그려낸다.
 * 칸을 더하거나 빼려면 그 파일만 고쳐라(화면·서버 검증·병원 양식 출력이 같은 파일을 본다).
 *
 * 지금 상태: 화면과 검증만. 보내기(서버 저장)는 아직 안 붙였다.
 */

import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { Check, ChevronDown, AlertTriangle, Paperclip, X, Loader2 } from "lucide-react";
import { DOC_KINDS, kindLabel, missingKinds } from "@/lib/inquiry/docKinds";
import { useLang } from "@/lib/i18n/LangContext";
import { CANCER_TYPES, STAGES, optLabel } from "@/lib/inquiry/intakeLabels";
import { describeUpload, MAX_DOC_BYTES as MAX_UPLOAD_BYTES } from "@/lib/uploadPolicy";
import { canPickFolder, pickImagingFiles, sumBytes, bundleToZip, formatMB } from "@/lib/inquiry/cdBundle";
import { SITE_INFO } from "@/lib/siteSettings";
import {
  SECTIONS, CONSENTS, LATE_STAGE_NOTICE, LATE_STAGES,
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
  // ── 갈림길 화면 (맨 처음) ──────────────────────────────────────
  // 15칸을 처음부터 다 펼쳐 보이면 부담스럽다(PO 2026-08-13). 그렇다고 안 받을 수도
  // 없는 정보라, «받을 양을 사용자가 고르게» 한다. 제출은 여전히 한 번이다.
  pickTitle:  { ko: "어떻게 도와드릴까요?", en: "How can we help?", ru: "Чем мы можем помочь?" },
  pickSub:    { ko: "지금 정하지 않으셔도 됩니다. 나중에 언제든 바꾸실 수 있습니다.",
                en: "You don't have to decide now — you can switch at any time.",
                ru: "Решать сейчас необязательно — вы можете передумать в любой момент." },
  quickTitle: { ko: "먼저 상담만 신청할게요", en: "Just request a consultation first", ru: "Сначала просто заявка на консультацию" },
  quickBody:  { ko: "연락처만 남겨주시면 코디네이터가 먼저 연락드려 하나씩 도와드립니다.",
                en: "Leave your contact details and a coordinator will reach out and walk you through the rest.",
                ru: "Оставьте контакты — координатор свяжется с вами и поможет со всем остальным." },
  quickMeta:  { ko: "{n}칸 · 1분", en: "{n} fields · 1 minute", ru: "{n} полей · 1 минута" },
  fullTitle:  { ko: "대학병원 소견을 빨리 받고 싶어요", en: "I want the hospital's opinion as soon as possible", ru: "Хочу быстрее получить заключение клиники" },
  fullBody:   { ko: "번거로우시겠지만 대학병원이 요구하는 내용을 함께 적어주셔야 합니다. 가지고 계신 검사 자료를 올려주시면 훨씬 빨라집니다.",
                en: "It takes more effort — the university hospital needs these details. Uploading the documents you already have makes it much faster.",
                ru: "Это займёт больше времени — клинике нужны эти сведения. Если приложите имеющиеся документы, всё пойдёт заметно быстрее." },
  fullMeta:   { ko: "{n}칸 · 자료 첨부", en: "{n} fields · with documents", ru: "{n} полей · с документами" },
  switchToFull:{ ko: "대학병원 소견도 받고 싶으신가요? 이어서 채우기",
                en: "Also want the hospital's opinion? Continue filling it in",
                ru: "Хотите ещё и заключение клиники? Продолжить заполнение" },
  backToPick: { ko: "처음으로", en: "Back", ru: "Назад" },
  sending:    { ko: "보내는 중입니다…", en: "Sending…", ru: "Отправляем…" },
  errSend:    { ko: "보내지 못했습니다. 잠시 뒤 다시 시도해 주세요. 쓰신 내용은 그대로 있습니다.",
                en: "We couldn't send it. Please try again shortly — your answers are still here.",
                ru: "Не удалось отправить. Попробуйте ещё раз чуть позже — ваши ответы сохранены." },
  errTooMany: { ko: "요청이 너무 잦습니다. 1분 뒤에 다시 시도해 주세요.",
                en: "Too many attempts. Please try again in a minute.",
                ru: "Слишком много попыток. Повторите через минуту." },
  doneTitle:  { ko: "접수되었습니다", en: "We've received it", ru: "Заявка принята" },
  doneBody:   { ko: "코디네이터가 확인하고 곧 연락드리겠습니다. 아래 주소를 저장해 두시면 진행 상황을 보시거나 자료를 더 올리실 수 있습니다.",
                en: "A coordinator will review it and contact you shortly. Save the link below to track progress or add more documents.",
                ru: "Координатор рассмотрит заявку и свяжется с вами. Сохраните ссылку ниже, чтобы следить за ходом и добавить документы." },
  doneNo:     { ko: "접수번호", en: "Reference no.", ru: "Номер обращения" },
  title:      { ko: "환자 의뢰서", en: "Patient referral form", ru: "Направление пациента" },
  titleQuick: { ko: "상담 신청", en: "Consultation request", ru: "Заявка на консультацию" },
  subQuick:   { ko: "연락드리는 데 필요한 것만 여쭙니다. 나머지는 코디네이터가 도와드립니다.",
                en: "We only ask what we need to reach you — a coordinator helps with the rest.",
                ru: "Спрашиваем только то, что нужно для связи — с остальным поможет координатор." },
  sub:        { ko: "한국 대학병원이 진료 의뢰를 받을 때 요구하는 내용입니다. 저희가 대신 정리해 전달해 드립니다 — 아는 만큼만 채우셔도 됩니다.",
                en: "These are the items Korean university hospitals ask for when accepting a referral. We compile and forward it for you — fill in only what you know.",
                ru: "Это сведения, которые запрашивают корейские университетские клиники при приёме направления. Мы соберём и передадим их за вас — заполняйте только то, что знаете." },
  barIntake:  { ko: "상담 신청", en: "Consultation request", ru: "Заявка на консультацию" },
  jump:       { ko: "남은 칸으로", en: "Take me there", ru: "Перейти к полю" },
  restNote:   { ko: "여기까지가 필수입니다. 아래는 대학병원이 요구하는 항목이라 지금 안 채우셔도 되고, 보내신 뒤에 이어서 채우셔도 됩니다.",
                en: "That's all that's required. Everything below is what the university hospital asks for — you can leave it for now and continue after sending.",
                ru: "На этом обязательная часть закончена. Ниже — то, что запрашивает клиника: можно заполнить позже, уже после отправки." },
  barIntakeOk:{ ko: "지금 보낼 수 있습니다", en: "You can send it now", ru: "Можно отправить сейчас" },
  barIntakeNo:{ ko: "{n}칸만 채우면 보낼 수 있습니다", en: "{n} more field(s) and you can send", ru: "Ещё {n} — и можно отправить" },
  barReferral:{ ko: "대학병원 제출 준비", en: "Ready to send to the university hospital", ru: "Готовность к отправке в клинику" },
  barRefMeta: { ko: "{pct}% — 대학병원이 요구하는 항목 {n}가지가 아직 비어 있습니다",
                en: "{pct}% — {n} item(s) the university hospital asks for are still empty",
                ru: "{pct}% — не заполнено {n} пунктов, которые запрашивает клиника" },
  barRefDone: { ko: "100% — 대학병원이 요구하는 항목이 모두 채워졌습니다", en: "100% — everything the hospital asks for is filled in", ru: "100% — заполнено всё, что запрашивает клиника" },
  laterNote:  { ko: "지금 다 못 채워도 됩니다. 보내신 뒤에도 같은 링크에서 이어서 채울 수 있고, 준비가 되면 저희가 대학병원에 전달합니다.",
                en: "You don't have to finish now. You can keep filling it in from the same link after sending — we forward it once it's ready.",
                ru: "Не обязательно заполнять всё сразу. После отправки можно продолжить по той же ссылке — мы передадим, когда всё будет готово." },
  // 2026-08-13 이대서울병원 확인: 보험은 병원이 관여하지 않는다.
  // 환자가 먼저 결제하고 보험사와 처리하거나, 에이전시가 대신 진행한다.
  // → 나중에 알면 분쟁이 되므로 폼에서 미리 알린다.
  insuranceNote: { ko: "치료비는 병원에 직접 결제하시게 됩니다. 보험을 이용하시는 경우, 결제 후 보험사에 청구하시거나 저희가 도와드릴 수 있습니다 — 병원이 보험사와 직접 정산하지는 않습니다.",
                en: "Treatment costs are paid directly to the hospital. If you use insurance, you claim it from your insurer after payment — the hospital does not settle with insurers directly. We can help with the claim.",
                ru: "Лечение оплачивается напрямую клинике. При использовании страховки возмещение запрашивается у страховой после оплаты — клиника не рассчитывается со страховой напрямую. Мы можем помочь с оформлением." },
  extraDocs:  { ko: "대학병원마다 요구하는 자료가 조금씩 다릅니다. 병원이 케이스를 본 뒤 추가 자료를 요청하는 경우가 있는데, 그때는 저희가 무엇이 필요한지 정리해서 따로 알려드립니다.",
                en: "Each university hospital asks for slightly different documents. If the hospital requests more after reviewing the case, we will tell you exactly what is needed.",
                ru: "Каждая клиника запрашивает немного разные документы. Если после изучения случая клиника попросит дополнительные материалы, мы сообщим, что именно нужно." },
  grpOnsite:  { ko: "내원이 확정된 뒤에 주시면 되는 것 — 지금 없어도 의뢰는 진행됩니다",
                en: "Only once the visit is confirmed — the referral proceeds without these",
                ru: "Только после подтверждения визита — направление можно отправить и без этого" },
  done:       { ko: "완료", en: "done", ru: "готово" },
  left:       { ko: "{n}칸 남음", en: "{n} left", ru: "осталось {n}" },
  optional:   { ko: "(선택)", en: "(optional)", ru: "(необязательно)" },
  forReferral:{ ko: "병원 제출용", en: "for the hospital", ru: "для клиники" },
  submit:     { ko: "의뢰서 보내기", en: "Send referral", ru: "Отправить направление" },
  submitOff:  { ko: "{n}칸만 더 채우면 보낼 수 있습니다", en: "Fill {n} more field(s) to send", ru: "Заполните ещё {n} — и можно отправить" },
  autosave:   { ko: "쓰던 내용은 자동 저장됩니다 — 창을 닫아도 그대로 있습니다",
                en: "Your answers are saved automatically — closing the window is safe.",
                ru: "Ответы сохраняются автоматически — можно закрыть окно." },
  saved:      { ko: "마지막 저장 {t}", en: "Saved {t}", ru: "Сохранено {t}" },
  consentTitle:{ ko: "개인정보 수집 · 이용 동의", en: "Consent", ru: "Согласие на обработку данных" },
  consentAll: { ko: "모두 동의 (선택 포함)", en: "Agree to all (including optional)", ru: "Согласен со всем (включая необязательное)" },
  reading:    { ko: "읽는 중입니다…", en: "Reading it…", ru: "Читаем документ…" },
  readingN:   { ko: "{n}개를 읽고 있습니다. 잠시만요.", en: "Reading {n} file(s)…", ru: "Читаем {n} файл(ов)…" },
  readAs:     { ko: "이렇게 읽었습니다. 다르면 직접 고쳐주세요.",
                en: "This is what we read. Please correct it if we got it wrong.",
                ru: "Мы прочитали это так. Если неверно — исправьте." },
  cantRead:   { ko: "이 파일은 저희가 못 읽었습니다. 코디네이터가 직접 확인합니다 — 아시면 골라주세요.",
                en: "We couldn't read this one. A coordinator will check it — pick the type if you know it.",
                ru: "Этот файл прочитать не удалось. Проверит координатор — выберите тип, если знаете." },
  stillNeed:  { ko: "이런 서류가 아직 없습니다", en: "These are still missing", ru: "Ещё не хватает" },
  stillNeedWhy:{ ko: "대학병원이 「치료가 가능한지」를 판단하는 데 쓰는 서류입니다. 지금 없어도 보내실 수 있고, 담당 병원에서 받으시는 대로 이어서 올리시면 됩니다.",
                en: "The hospital uses these to judge whether treatment is possible. You can still send now and add them once your hospital issues them.",
                ru: "На основании этих документов клиника решает, возможно ли лечение. Отправить можно и сейчас, а добавить — когда получите их в своей больнице." },
  docsAllSet: { ko: "대학병원이 요구하는 서류가 모두 확인되었습니다.",
                en: "Everything the hospital asks for is here.",
                ru: "Все документы, которые запрашивает клиника, получены." },
  icdUnknown: { ko: "모르겠습니다 — 서류 보고 정해주세요", en: "I don't know — please determine it from my documents", ru: "Не знаю — определите по моим документам" },
  pick:       { ko: "선택", en: "Select", ru: "Выберите" },
  addFile:    { ko: "파일 고르기", en: "Choose file", ru: "Выбрать файл" },
  cdPick:     { ko: "CD 폴더 고르기", en: "Pick the CD folder", ru: "Выбрать папку с диска" },
  cdPickSub:  { ko: "안에 든 파일을 하나씩 고르실 필요 없습니다", en: "No need to pick files one by one", ru: "Выбирать файлы по одному не нужно" },
  cdZipping:  { ko: "파일 {n}개 ({mb}) 를 하나로 묶고 있습니다", en: "Bundling {n} files ({mb})", ru: "Собираем {n} файлов ({mb})" },
  cdZipWait:  { ko: "창을 닫지 말고 잠시만 기다려 주세요. 보통 10~40초 걸립니다.",
                en: "Please keep this window open — it usually takes 10–40 seconds.",
                ru: "Не закрывайте окно — обычно это занимает 10–40 секунд." },
  cdDone:     { ko: "파일 {n}개 준비 완료 ({from} → {to})", en: "{n} files ready ({from} → {to})", ru: "Готово: {n} файлов ({from} → {to})" },
  cdRedo:     { ko: "다시 고르기", en: "Pick again", ru: "Выбрать заново" },
  cdTooBig:   { ko: "파일이 커서 바로 올리기 어렵습니다. 코디네이터가 대신 받아드릴게요.",
                en: "The files are too large to upload here. A coordinator will take them for you.",
                ru: "Файлы слишком большие для загрузки здесь. Координатор примет их за вас." },
  cdHelp:     { ko: "코디네이터에게 연락하기", en: "Contact a coordinator", ru: "Связаться с координатором" },
  cdPhone:    { ko: "휴대폰에서는 CD 폴더를 고를 수 없습니다. 지금은 문의만 보내주시면, 영상 올리는 링크를 따로 보내드립니다.",
                en: "Phones cannot pick a CD folder. Just send the inquiry for now — we will email you a separate link for the images.",
                ru: "С телефона нельзя выбрать папку с диска. Отправьте обращение сейчас — ссылку для загрузки снимков мы пришлём отдельно." },
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
  // 처음엔 「먼저, 이것만」 하나만 펼친다. 나머지는 접힌 줄로만 보인다 —
  // 18칸을 한꺼번에 펼쳐 보여주니 PO 가 «아직도 뭔가 너무 많다»고 했다(2026-08-12).
  const [open, setOpen] = useState({ essentials: true });
  const [savedAt, setSavedAt] = useState(null);
  const [highlight, setHighlight] = useState(null); // 「남은 칸으로」로 데려간 칸
  // null = 아직 안 고름(갈림길 화면) · "quick" = 연락처만 · "full" = 병원 제출까지
  const [mode, setMode] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(null); // { inquiryId, publicToken }
  const loaded = useRef(false);

  // 쓰던 내용 복구 — 긴 폼의 유일한 진짜 위험은 「쓰다 날림」이다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setValues(d.values || {});
        setConsents(d.consents || {});
        // 돌아온 사람에게 갈림길을 다시 묻지 않는다 — 쓰던 자리로 바로 보낸다.
        if (d.mode) setMode(d.mode);
      }
    } catch { /* 저장본이 깨졌으면 그냥 빈 폼으로 시작한다 */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, consents, mode }));
      setSavedAt(new Date());
    } catch { /* 저장 공간이 없어도 폼은 계속 쓸 수 있어야 한다 */ }
  }, [values, consents, mode]);

  // v 에 함수를 줄 수 있다 — 서류 판독처럼 «먼저 목록에 올리고 나중에 결과를 끼워 넣는»
  // 경우엔 그때의 최신 목록을 받아야 한다(안 그러면 여러 개 올릴 때 앞의 결과가 지워진다).
  const set = (name, v) =>
    setValues((p) => ({ ...p, [name]: typeof v === "function" ? v(p[name]) : v }));

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
    const n = sec.fields.filter((f) => (f.req === "intake" && missIntake.includes(f.name))
                                    || (f.req === "referral" && missRef.includes(f.name))).length;
    // 동의는 「먼저, 이것만」 묶음 안에 들어 있으므로 그 묶음이 같이 센다.
    return sec.id === "essentials" ? n + (consentOk ? 0 : 1) : n;
  };

  // 아직 안 채운 접수 칸으로 데려간다. 「6칸 남음」이라고 세어주면서 어디인지 안 알려주면
  // 사람이 화면을 뒤진다(2026-08-12 PO: «마지막 한 칸은 어디 있는지 찾기도 힘들다»).
  const jumpToNext = () => {
    setOpen((p) => ({ ...p, essentials: true }));
    const name = missIntake[0] || (consentOk ? null : "consent");
    if (!name) return;
    setHighlight(name);
    requestAnimationFrame(() => {
      document.getElementById(name === "consent" ? "consent-block" : `f-${name}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  async function send() {
    if (!canSend || sending) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/inquiries/referral", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          mode,
          consents,
          sourceLocale: lang,
          landingPath: typeof location !== "undefined" ? location.pathname : null,
          referrerHost: typeof document !== "undefined" && document.referrer
            ? new URL(document.referrer).host : null,
        }),
      });
      const j = await res.json();
      if (!j?.ok) {
        // 서버는 코드형 오류만 준다(보안 규칙). 사람 말로 바꾸는 건 여기서 한다.
        setSendError(tr(j?.error === "rate_limit_exceeded" ? "errTooMany" : "errSend", lang));
        return;
      }
      setSent(j);
      // 보냈으면 임시저장은 지운다 — 남겨두면 다음에 열었을 때 이미 보낸 내용이 다시 뜬다.
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    } catch {
      setSendError(tr("errSend", lang));
    } finally {
      setSending(false);
    }
  }

  // 데려간 칸에 테두리를 잠깐 켜 둔다. 포커스만으론 어느 칸인지 눈에 안 들어온다
  // (실측: 스크롤은 됐는데 focus 가 다시 풀려 아무 표시도 안 남았다).
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(t);
  }, [highlight]);

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700">
              <Check size={22} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{tr("doneTitle", lang)}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">{tr("doneBody", lang)}</p>
            <p className="mt-5 text-sm text-gray-600">
              {tr("doneNo", lang)} <span className="font-bold text-gray-900 tabular-nums">#{sent.inquiryId}</span>
            </p>
            {sent.publicToken && (
              <p className="mt-2 break-all rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                {typeof location !== "undefined" ? location.origin : ""}/t/{sent.publicToken}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 아직 안 골랐으면 갈림길만 보여준다. 15칸을 먼저 들이대지 않는다.
  if (mode === null) {
    return <ModePicker lang={lang} onPick={setMode}
                       quickN={fieldsByReq("intake").length + 1}
                       fullN={fieldsByReq("intake").length + fieldsByReq("referral").length + 1} />;
  }
  const quick = mode === "quick";
  // 「연락처만」이면 첫 묶음만 그린다. 나머지는 아예 «안 보여준다» — 접어두기만 해도
  // 묶음 줄 5개가 보여서 「아직 이만큼 남았구나」로 읽힌다(PO 2026-08-13).
  const shownSections = quick ? SECTIONS.slice(0, 1) : SECTIONS;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">

        {/* 머리 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {quick ? tr("titleQuick", lang) : tr("title", lang)}
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            {quick ? tr("subQuick", lang) : tr("sub", lang)}
          </p>
          {/* 「연락처만」일 땐 막대도 하나다 — 안 채울 것의 진행률을 보여주면 그게 곧 부담이다. */}
          <div className="mt-6 space-y-4">
            {/* 「연락처만」일 땐 제목이 이미 «상담 신청»이라 막대 이름을 또 달면 같은 말이 두 번 뜬다. */}
            <Bar label={quick ? "" : tr("barIntake", lang)}
                 pct={((intakeTotal - intakeLeft) / intakeTotal) * 100}
                 tone={canSend ? "done" : "todo"}
                 meta={canSend ? tr("barIntakeOk", lang) : tr("barIntakeNo", lang, { n: intakeLeft })}
                 action={canSend ? null : { label: tr("jump", lang), onClick: jumpToNext }} />
            {!quick && (
              <Bar label={tr("barReferral", lang)}
                   pct={readiness} tone="soft"
                   meta={readiness === 100
                     ? tr("barRefDone", lang)
                     : tr("barRefMeta", lang, { pct: readiness, n: missRef.length })} />
            )}
          </div>
          {!quick && (
            <>
              <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-xs leading-relaxed text-teal-800 md:text-sm">
                {tr("laterNote", lang)}
              </p>
              <p className="mt-2 px-1 text-xs leading-relaxed text-gray-600">{tr("insuranceNote", lang)}</p>
            </>
          )}
        </div>

        {/* 묶음 */}
        <div className="mt-5 space-y-3">
          {shownSections.map((sec, i) => {
            const left = secState(sec);
            const isOpen = !!open[sec.id];
            const card = (
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
                    {sec.lead && (
                      <p className="mt-4 text-xs leading-relaxed text-gray-600 md:text-sm">{lab(sec.lead, lang)}</p>
                    )}
                    {sec.id === "documents" ? (
                      <DocSection lang={lang} sec={sec} values={values} set={set} />
                    ) : (
                      <div className="flex flex-wrap gap-x-4">
                        {sec.fields.map((f) => (
                          <Fragment key={f.name}>
                            <Field f={f} lang={lang} value={values[f.name]} onChange={set}
                                   lit={highlight === f.name} />
                            {/* 안내는 «고른 칸 바로 밑»에 붙는다. 묶음 끝에 두면 758px 아래라
                                화면 밖이고, 골라도 아무 일 없는 것처럼 보인다(2026-08-13 PO 실사용). */}
                            {f.name === "stage" && LATE_STAGES.includes(values.stage) && (
                              <div className="w-full">
                                <LateStageNotice lang={lang} values={values} set={set} />
                              </div>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    )}
                    {/* 동의는 접수 문턱이므로 「먼저, 이것만」 안에 둔다 — 문턱 칸을 흩어놓지 않는다. */}
                    {sec.id === "essentials" && (
                      <div id="consent-block"
                           className={`mt-6 border-t border-gray-200 pt-5 ${
                             highlight === "consent" ? "-mx-2 rounded-xl bg-teal-50 px-2 pb-3 ring-2 ring-teal-700" : ""}`}>
                        <p className="text-sm font-semibold text-gray-700">{tr("consentTitle", lang)}</p>
                        <ConsentBlock lang={lang} consents={consents} setConsents={setConsents} />
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
            // 「먼저, 이것만」 바로 아래에서 한 번 더 말해준다 — 여기부터는 안 채워도 보낼 수 있다.
            return i === 0 && !quick ? (
              <div key={sec.id} className="space-y-3">
                {card}
                <p className="px-1 pt-2 text-xs leading-relaxed text-gray-600 md:text-sm">{tr("restNote", lang)}</p>
              </div>
            ) : card;
          })}
        </div>

        {/* 「연락처만」으로 시작해도 문은 열어둔다 — 마음이 바뀌면 이어서 채운다. */}
        {quick && (
          <button type="button" onClick={() => setMode("full")}
                  className="mt-4 w-full rounded-xl border border-teal-100 bg-teal-50 px-4 py-3.5 text-left text-sm font-semibold text-teal-800 transition-all duration-200 hover:bg-teal-100">
            {tr("switchToFull", lang)} →
          </button>
        )}

        {/* 바닥 */}
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <button type="button" disabled={!canSend || sending} onClick={send}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold transition-all duration-200 ${
                    canSend && !sending ? "bg-teal-700 text-white hover:bg-teal-800" : "cursor-not-allowed bg-gray-200 text-gray-600"}`}>
            {sending && <Loader2 size={16} className="animate-spin" />}
            {sending ? tr("sending", lang)
                     : canSend ? tr("submit", lang)
                               : tr("submitOff", lang, { n: intakeLeft })}
          </button>
          {sendError && (
            <p className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {sendError}
            </p>
          )}
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
function Field({ f, lang, value, onChange, lit }) {
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
    case "cdFolder":
      return <CdFolder f={f} lang={lang} value={value} onChange={onChange} />;
    default:
      control = <input className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
  }

  return (
    <div id={`f-${f.name}`}
         className={`mt-4 min-w-0 transition-all duration-200 ${
           f.half ? "flex-1 basis-full md:basis-[calc(50%-0.5rem)]" : "w-full"
         } ${lit ? "-mx-2 rounded-xl bg-teal-50 px-2 py-2 ring-2 ring-teal-700" : ""}`}>
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

/**
 * 갈림길 — 맨 처음 화면. 「받을 양」을 사용자가 고르게 한다.
 *
 * 왜: 15칸을 처음부터 다 보여주면 부담스러워 창을 닫는다. 그렇다고 안 받을 수도 없는
 *     정보다(병원이 요구한다). 그래서 «안 받는 것»이 아니라 «언제 받을지»를 나눈다.
 *     제출은 여전히 한 번이고, 「연락처만」으로 시작해도 언제든 이어서 채울 수 있다.
 */
function ModePicker({ lang, onPick, quickN, fullN }) {
  const Card = ({ onClick, title, body, meta, primary }) => (
    <button type="button" onClick={onClick}
            className={`w-full rounded-xl border p-5 text-left transition-all duration-200 md:p-6 ${
              primary ? "border-teal-700 bg-white shadow-sm hover:bg-teal-50"
                      : "border-gray-200 bg-white shadow-sm hover:border-gray-300"}`}>
      <p className="text-base font-bold text-gray-900 md:text-lg">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
      <p className="mt-3 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 tabular-nums">
        {meta}
      </p>
    </button>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{tr("pickTitle", lang)}</h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">{tr("pickSub", lang)}</p>
        <div className="mt-6 space-y-3">
          <Card primary onClick={() => onPick("quick")}
                title={tr("quickTitle", lang)} body={tr("quickBody", lang)}
                meta={tr("quickMeta", lang, { n: quickN })} />
          <Card onClick={() => onPick("full")}
                title={tr("fullTitle", lang)} body={tr("fullBody", lang)}
                meta={tr("fullMeta", lang, { n: fullN })} />
        </div>
      </div>
    </div>
  );
}

/**
 * 진행된 병기 안내 — 막지 않는다. 알리고, 다른 길을 열어두고, 결정은 환자가 한다.
 * 숫자(비용·기간)는 넣지 않는다 — 케이스마다 다르다는 게 병원 확인 사항이다.
 */
function LateStageNotice({ lang }) {
  const N = LATE_STAGE_NOTICE;
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 flex-none text-amber-700" />
        <div>
          <p className="text-sm font-bold text-amber-700">{lab(N.title, lang)}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">{lab(N.body, lang)}</p>
          <ul className="mt-2.5 space-y-1.5">
            {N.points.map((p, i) => (
              <li key={i} className="text-sm leading-relaxed text-amber-700">· {lab(p, lang)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** 진행 막대 하나. tone: done=다 참 · todo=아직 · soft=막지 않는 준비도 */
function Bar({ label, pct, meta, tone, action }) {
  const fill = tone === "done" ? "bg-emerald-700" : tone === "soft" ? "bg-teal-700" : "bg-gray-400";
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-xs tabular-nums md:text-sm ${tone === "done" ? "font-semibold text-emerald-700" : "text-gray-600"}`}>
          {meta}
          {action && (
            <button type="button" onClick={action.onClick}
                    className="ml-2 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white transition-all duration-200 hover:bg-teal-800">
              {action.label}
            </button>
          )}
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

/**
 * 병원 CD 받기 — 폴더째 고르기 → 브라우저에서 묶기 → 그 결과를 봉투에 넣는다.
 *
 * 지켜야 할 것:
 *   · 고른 «즉시» 총 용량을 보여준다 (10분 기다린 뒤 실패 금지)
 *   · 묶는 동안 진행 표시 (멈춘 줄 알고 창을 닫는다)
 *   · 상한을 넘으면 막다른 골목 대신 왓츠앱으로 사람에게 연결
 *   · 폰이면 아예 요구하지 않는다 (폴더 고르기가 안 된다)
 */
function CdFolder({ f, lang, value, onChange }) {
  const ref = useRef(null);
  const [state, setState] = useState({ phase: "idle" }); // idle | picked | zipping | done | toobig
  const [canPick, setCanPick] = useState(true);

  useEffect(() => { setCanPick(canPickFolder()); }, []);

  async function onPick(fileList) {
    const files = pickImagingFiles(fileList);
    if (!files.length) return;
    const raw = sumBytes(files);
    setState({ phase: "zipping", count: files.length, raw, percent: 0 });
    try {
      const zip = await bundleToZip(files, {
        onProgress: ({ percent }) => setState((s) => ({ ...s, percent })),
      });
      if (zip.size > MAX_UPLOAD_BYTES) {
        setState({ phase: "toobig", count: files.length, raw, zipped: zip.size });
        return;
      }
      setState({ phase: "done", count: files.length, raw, zipped: zip.size });
      onChange(f.name, { name: zip.name, size: zip.size, count: files.length, rawSize: raw });
    } catch {
      // 묶다 실패해도 막다른 골목으로 두지 않는다 — 사람에게 연결한다.
      setState({ phase: "toobig", count: files.length, raw });
    }
  }

  if (!canPick) {
    // 폰에서는 폴더를 못 고른다. 요구하지 말고 나중에 올릴 길만 알려준다.
    return (
      <div id={`f-${f.name}`} className="mt-4 w-full">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">{lab(f.label, lang)}</label>
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">{tr("cdPhone", lang)}</p>
      </div>
    );
  }

  return (
    <div id={`f-${f.name}`} className="mt-4 w-full">
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">{lab(f.label, lang)}</label>

      {state.phase !== "done" && state.phase !== "toobig" && (
        <button type="button" disabled={state.phase === "zipping"} onClick={() => ref.current?.click()}
                className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all duration-200 ${
                  state.phase === "zipping" ? "border-gray-200" : "border-gray-300 hover:border-gray-400"}`}>
          <span className="block text-sm font-semibold text-gray-700">{tr("cdPick", lang)}</span>
          <span className="mt-1 block text-xs text-gray-600">{tr("cdPickSub", lang)}</span>
        </button>
      )}
      {/* webkitdirectory: 폴더 안 파일 전부를 한 번에 넘겨준다 */}
      <input ref={ref} type="file" className="hidden" webkitdirectory="" directory=""
             onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />

      {state.phase === "zipping" && (
        <div className="mt-3 rounded-xl border border-gray-200 p-3">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <Loader2 size={14} className="animate-spin" />
            {tr("cdZipping", lang, { n: state.count, mb: formatMB(state.raw) })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-teal-700 transition-all duration-200"
                 style={{ width: `${state.percent || 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-600">{tr("cdZipWait", lang)}</p>
        </div>
      )}

      {state.phase === "done" && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-700">
            {tr("cdDone", lang, { n: state.count, from: formatMB(state.raw), to: formatMB(state.zipped) })}
          </p>
          <button type="button" onClick={() => { setState({ phase: "idle" }); onChange(f.name, null); }}
                  className="mt-1.5 text-xs text-gray-600 underline">{tr("cdRedo", lang)}</button>
        </div>
      )}

      {state.phase === "toobig" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm leading-relaxed text-amber-700">{tr("cdTooBig", lang)}</p>
          <a href={SITE_INFO?.messenger?.whatsapp || "#"} target="_blank" rel="noopener noreferrer"
             className="mt-2 inline-block rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            {tr("cdHelp", lang)}
          </a>
        </div>
      )}
      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{lab(f.hint, lang)}</p>
    </div>
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
 * 자료 묶음 — 봉투째 받고, 올리는 즉시 «우리가» 열어본다.
 *
 * 종류별 칸으로 나누지 않는 이유는 referralSchema.js 의 envelope 칸 주석에 있다.
 * 여기서는 그 결과를 세 덩어리로 보여준다:
 *   ① 올린 서류 — 무엇으로 읽혔는지 + «틀렸으면 직접 고치기»
 *   ② 아직 없는 것 — 대학병원이 요구하는 종류 중 안 온 것
 *   ③ 내원 확정 후 · 병원별 추가 요청 안내
 */
function DocSection({ lang, sec, values, set }) {
  const docs = values.envelope || [];
  const missing = missingKinds(docs);
  const envelopeField = sec.fields.find((f) => f.name === "envelope");
  const rest = sec.fields.filter((f) => f.name !== "envelope" && f.group !== "onsite");
  const onsite = sec.fields.filter((f) => f.group === "onsite");

  return (
    <>
      <Envelope f={envelopeField} lang={lang} docs={docs} onChange={set} />

      {docs.length > 0 && (
        missing.length === 0 ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-700">
            {tr("docsAllSet", lang)}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="mt-0.5 flex-none text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-700">{tr("stillNeed", lang)}</p>
                <ul className="mt-2 space-y-1">
                  {missing.map((k) => (
                    <li key={k} className="text-sm text-amber-700">· {kindLabel(k, lang)}</li>
                  ))}
                </ul>
                <p className="mt-2.5 text-xs leading-relaxed text-amber-700">{tr("stillNeedWhy", lang)}</p>
              </div>
            </div>
          </div>
        )
      )}

      <div className="flex flex-wrap gap-x-4">
        {rest.map((f) => <Field key={f.name} f={f} lang={lang} value={values[f.name]} onChange={set} />)}
      </div>

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

/** 봉투 — 고르는 즉시 서버로 보내 「무슨 서류인지」를 물어보고 그 자리에서 보여준다. */
function Envelope({ f, lang, docs, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(0);

  async function add(files) {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    // 먼저 목록에 「읽는 중」으로 올린다 — 7초쯤 걸리므로 화면이 멈춘 것처럼 보이면 안 된다.
    const base = docs.length;
    onChange(f.name, [...docs, ...picked.map((x) => ({
      name: x.name, size: x.size, kind: null, reading: true,
    }))]);
    setBusy((n) => n + picked.length);

    for (let i = 0; i < picked.length; i++) {
      let r = { kind: "unknown" };
      try {
        const fd = new FormData();
        fd.append("file", picked[i]);
        const res = await fetch("/api/inquiry/classify-doc", { method: "POST", body: fd });
        const j = await res.json();
        if (j?.ok) r = j;
      } catch { /* 판별 실패해도 파일은 그대로 남는다 — 코디가 확인한다 */ }
      // eslint-disable-next-line no-loop-func
      onChange(f.name, (prev) => {
        const next = [...(prev || [])];
        next[base + i] = {
          ...next[base + i], reading: false,
          kind: r.kind || "unknown",
          confidence: r.confidence ?? null,
          docDate: r.docDate ?? null,
          diagnosisText: r.diagnosisText ?? null,
          skipped: r.skipped ?? null,
        };
        return next;
      });
      setBusy((n) => n - 1);
    }
  }

  const setKind = (i, kind) =>
    onChange(f.name, docs.map((d, j) => (j === i ? { ...d, kind, corrected: true } : d)));

  return (
    <div id={`f-${f.name}`} className="mt-4">
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {lab(f.label, lang)}
        <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          {tr("forReferral", lang)}
        </span>
      </label>
      <button type="button" onClick={() => ref.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-center transition-all duration-200 hover:border-gray-400">
        <span className="block text-sm font-semibold text-gray-700">{tr("addFile", lang)}</span>
        <span className="mt-1 block text-xs text-gray-600">{describeUpload("medicalDoc", lang)}</span>
      </button>
      <input ref={ref} type="file" multiple className="hidden"
             onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{lab(f.hint, lang)}</p>

      {docs.map((d, i) => (
        <div key={i} className="mt-2 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Paperclip size={14} className="flex-none text-gray-500" />
            <span className="min-w-0 flex-1 truncate text-gray-900">{d.name}</span>
            <span className="flex-none text-xs text-gray-600 tabular-nums">
              {Math.round((d.size / 1024 / 1024) * 10) / 10}MB
            </span>
            <button type="button" onClick={() => onChange(f.name, docs.filter((_, j) => j !== i))}
                    className="flex-none text-gray-500 hover:text-gray-700"><X size={14} /></button>
          </div>

          {d.reading ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <Loader2 size={13} className="animate-spin" />{tr("reading", lang)}
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-xs text-gray-600">
                {d.skipped ? tr("cantRead", lang) : tr("readAs", lang)}
              </p>
              {/* ⚠️ AI 판독은 «추정»이다. 고르는 칸으로 두어 사용자가 언제든 고칠 수 있게 한다
                  (PO 결정 2026-08-12). 의료 서류라 우리 추정을 사실로 박으면 안 된다. */}
              <select value={d.kind || "unknown"} onChange={(e) => setKind(i, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                {DOC_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{kindLabel(k.value, lang)}</option>
                ))}
              </select>
              {(d.docDate || d.diagnosisText) && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                  {d.docDate && <span className="tabular-nums">{d.docDate}</span>}
                  {d.docDate && d.diagnosisText && " · "}
                  {d.diagnosisText}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      {busy > 0 && <p className="mt-2 text-xs text-gray-600">{tr("readingN", lang, { n: busy })}</p>}
    </div>
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
