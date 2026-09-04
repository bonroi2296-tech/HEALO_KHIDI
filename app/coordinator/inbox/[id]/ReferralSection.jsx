"use client";

/**
 * 코디 받은편지함 — 「의뢰서」 카드.
 *
 * 새 의뢰서(/inquiry/referral)로 들어온 문의는 환자가 채운 칸이 intake_data(referral_v1) 에 있다.
 * 🛑 2026-08-19 실측: 이 카드가 없어서 환자가 진단명·불편한 곳·약물·비행 가능·받고 싶은 것을 다
 *    채워도 코디 화면엔 옛 6칸만 떴다. 개편의 존재 이유(코디가 다시 안 물어봐도 되게)가 통째로
 *    빠져 있었다. 그래서 만든 카드다.
 *
 * 무엇을 보여주나 — «의뢰서 화면과 같은 묶음·같은 이름·같은 순서». 라벨은 사전 referral.* 키를 그대로
 * 쓴다(코디가 편집기로 문구를 고치면 여기도 같이 바뀐다). 빈 칸은 숨기지 않고 «비어 있음»으로 세운다 —
 * 코디가 «뭘 더 받아야 하나»를 이 카드 하나로 보게.
 */
import { SECTIONS, lab } from "@/lib/inquiry/referralSchema";
import { kindLabel } from "@/lib/inquiry/docKinds";
import { stageLabel } from "@/lib/inquiry/intakeLabels";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";
import { formatMB } from "@/lib/inquiry/cdBundle";

// 접수 6칸(성·이름·이메일·언어·암종·전화)과 동의는 위쪽 카드가 이미 그린다 — 여기선 뺀다.
const SHOWN_ELSEWHERE = new Set(["lastName", "firstName", "email", "patientLang", "cancerType", "phone", "nationality", "preferredDate", "dateFlexible"]);
// 자료 묶음은 첨부 카드가 따로 있다 — 여기선 「무슨 서류로 판독됐나」만 한 줄로.
const DOC_SECTION = "documents";

const UI = {
  title:   { ko: "의뢰서", en: "Referral form", ru: "Направление", kz: "Жолдама", zh: "转诊申请表", ja: "紹介フォーム" },
  empty:   { ko: "비어 있음", en: "empty", ru: "не заполнено", kz: "толтырылмаған", zh: "未填写", ja: "未入力" },
  filled:  { ko: "{n}칸 채움 · {m}칸 비어 있음", en: "{n} filled · {m} empty", ru: "заполнено {n} · пусто {m}", kz: "{n} толтырылды · {m} бос", zh: "已填{n}项 · 空{m}项", ja: "{n}項目入力 · {m}項目未入力" },
  quick:   { ko: "「상담만」으로 보냄 — 의뢰서 칸은 아직 안 채웠습니다", en: "Sent as “consultation only” — referral fields not filled yet", ru: "Отправлено как «только консультация» — поля направления ещё не заполнены", kz: "«Тек кеңес» ретінде жіберілген — жолдама өрістері әлі толтырылмаған", zh: "以“仅咨询”提交 — 转诊栏目尚未填写", ja: "「相談のみ」で送信 — 紹介フォームの項目は未入力" },
  docs:    { ko: "올린 서류", en: "Documents", ru: "Документы", kz: "Құжаттар", zh: "上传的资料", ja: "アップロード書類" },
  link:    { ko: "링크로 받음", en: "via link", ru: "по ссылке", kz: "сілтеме арқылы", zh: "通过链接", ja: "リンクで受領" },
  cd:      { ko: "CD 폴더", en: "CD folder", ru: "Папка с диска", kz: "Диск қалтасы", zh: "光盘文件夹", ja: "CDフォルダ" },
  cdFiles: { ko: "{n}개 파일", en: "{n} files", ru: "{n} файлов", kz: "{n} файл", zh: "{n}个文件", ja: "{n}ファイル" },
  fixed:   { ko: "사람이 고침", en: "corrected by user", ru: "исправлено пользователем", kz: "адам түзеткен", zh: "用户已修正", ja: "本人が修正" },
  // 서류 종류를 못 알아본 것 — 환자 화면 문구(「저도 잘 모르겠습니다 — 코디네이터가 확인해 주세요」)를
  // 코디에게 그대로 보이면 이상하다. 코디에겐 «상태»로.
  unknownKind: { ko: "종류 미확인", en: "type not identified", ru: "тип не определён", kz: "түрі анықталмаған", zh: "类型未识别", ja: "種類未特定" },
  // 라벨 없는 딸린 칸(고르기 밑 설명 글칸)의 이름
  noteOf:  { ko: "{f} — 설명", en: "{f} — notes", ru: "{f} — пояснение", kz: "{f} — түсініктеме", zh: "{f} — 说明", ja: "{f} — 補足" },
  // 서류에서 빈 칸을 메우는 기능(2026-09-04 PO)
  scan:      { ko: "빈 칸을 서류에서 찾기", en: "Fill blanks from documents", ru: "Заполнить пустые поля из документов", kz: "Бос өрістерді құжаттардан толтыру", zh: "从资料中补全空白项", ja: "空欄を書類から補う" },
  scanAgain: { ko: "다시 찾기", en: "Search again", ru: "Искать снова", kz: "Қайта іздеу", zh: "重新查找", ja: "もう一度探す" },
  scanning:  { ko: "서류 읽는 중… ({d}/{t})", en: "Reading documents… ({d}/{t})", ru: "Чтение документов… ({d}/{t})", kz: "Құжаттар оқылуда… ({d}/{t})", zh: "正在读取资料…（{d}/{t}）", ja: "書類を読んでいます…（{d}/{t}）" },
  fromDoc:   { ko: "서류에서", en: "from document", ru: "из документа", kz: "құжаттан", zh: "来自资料", ja: "書類から" },
  scanNote:  { ko: "기계가 서류에서 읽은 값입니다 — 환자 칸에 옮기기 전에 원본과 대조해 주세요. 저장되지 않습니다.", en: "Read from the documents by machine — check against the originals before using. Not saved.", ru: "Прочитано из документов машиной — сверьте с оригиналами. Не сохраняется.", kz: "Машина құжаттардан оқыды — түпнұсқамен салыстырыңыз. Сақталмайды.", zh: "由机器从资料中读取 — 使用前请与原件核对。不会保存。", ja: "機械が書類から読み取った値です — 原本と照合してください。保存されません。" },
  scanNone:  { ko: "붙어 있는 서류가 없습니다.", en: "No documents attached.", ru: "Документов нет.", kz: "Құжат жоқ.", zh: "没有附件资料。", ja: "添付書類がありません。" },
  scanFail:  { ko: "서류를 읽지 못했습니다. 잠시 뒤 다시 눌러주세요.", en: "Could not read the documents. Try again shortly.", ru: "Не удалось прочитать документы. Попробуйте позже.", kz: "Құжаттарды оқу мүмкін болмады. Кейінірек қайталаңыз.", zh: "无法读取资料，请稍后重试。", ja: "書類を読み取れませんでした。しばらくして再度お試しください。" },
  scanFound: { ko: "서류 {n}건을 읽어 빈 칸 {m}개를 찾았습니다", en: "Read {n} documents, found {m} blank fields", ru: "Прочитано документов: {n}, найдено пустых полей: {m}", kz: "{n} құжат оқылды, {m} бос өріс табылды", zh: "已读取{n}份资料，补全{m}个空白项", ja: "{n}件の書類から空欄{m}件を見つけました" },
  glossary:  { ko: "이 말이 무슨 뜻이냐면", en: "What these terms mean", ru: "Что означают эти термины", kz: "Бұл терминдер нені білдіреді", zh: "这些术语的含义", ja: "この言葉の意味" },
};
const ui = (k, lang, vars) => {
  let s = UI[k]?.[lang] || UI[k]?.en || "";
  if (vars) for (const [n, v] of Object.entries(vars)) s = s.replaceAll(`{${n}}`, v);
  return s;
};

const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

/** 칸 하나의 «사람이 읽는 값». 고르기 칸은 사전 라벨로, 날짜는 그대로, 글은 그대로. */
function display(f, v, lang) {
  if (isEmpty(v)) return null;
  if (f.type === "chips" || f.type === "chipsMulti") {
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((x) => { const o = (f.options || []).find((o) => o.value === x); return o ? lab(o.label, lang) : String(x); }).join(" · ");
  }
  // ⚠️ optLabel 은 (항목, 언어)다 — (목록, 값, 언어)로 부르면 빈 문자열이 와서 날것(IV)이 뜬다(2026-08-19 실측).
  if (f.type === "stage") return stageLabel(v, lang) || String(v);
  if (f.type === "cancerType") return cancerTypeLabelL(v, lang) || String(v);
  if (f.type === "check") return v ? "✓" : null;
  // 폼이 저장하는 값은 `__unknown__` 이다(ReferralForm 의 icdSuggest 칸).
  // `unknown` 만 걸러내던 탓에 환자가 「모르겠습니다」를 고르면 코디 화면에 `__unknown__` 이 날것으로 떴다.
  if (f.type === "icdSuggest") return v === "__unknown__" || v === "unknown" ? null : String(v);
  return String(v);
}

/**
 * @param scan   null | {loading, done, total} | {data:{fields, from, glossary, readCount}} | {error}
 * @param onScan 「빈 칸을 서류에서 찾기」를 눌렀을 때. 판독·합치기는 부모가 한다.
 */
export default function ReferralSection({ referral, lang, scan, onScan }) {
  if (!referral || referral.version !== "referral_v1") return null;

  // 서류에서 읽어 온 값. 환자가 «이미 적은» 칸은 여기서도 안 건드린다 — 빈 칸에만 얹는다
  // (2026-09-04 PO: 「빠진거만 다시 읽게 하거나」).
  const scanned = scan?.data?.fields || {};
  const scannedFrom = scan?.data?.from || {};

  const rows = [];   // { sec, label, value, guess, from }
  let filled = 0, empty = 0, guessed = 0;
  for (const sec of SECTIONS) {
    if (sec.id === DOC_SECTION) continue;
    for (const f of sec.fields) {
      if (SHOWN_ELSEWHERE.has(f.name)) continue;
      if (f.type === "note") continue;
      if (f.showIf && !f.showIf(referral)) continue;
      const shown = display(f, referral[f.name], lang);
      if (shown) filled++; else empty++;
      // 비어 있는 칸에만 서류에서 읽은 값을 얹는다. 판독기 칸 이름은 의뢰서 스키마와 같다.
      const guess = !shown && !isEmpty(scanned[f.name]) ? display(f, scanned[f.name], lang) : null;
      if (guess) guessed++;
      // 라벨 없는 칸(예: 병력 설명 글칸)은 «바로 앞 칸 이름 — 설명»으로 부른다
      let label = lab(f.label, lang);
      if (!label) { const prev = rows[rows.length - 1]; label = ui("noteOf", lang, { f: prev?.label || "" }); }
      rows.push({ sec: lab(sec.title, lang), label, value: shown, guess, from: guess ? scannedFrom[f.name] : null });
    }
  }

  const env = Array.isArray(referral.envelope) ? referral.envelope : [];
  const cd = referral.cdFolder && typeof referral.cdFolder === "object" ? referral.cdFolder : null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900">{ui("title", lang)}</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 tabular-nums">{ui("filled", lang, { n: filled, m: empty })}</span>
          {/* 서류가 붙어 있으면 «빈 칸만» 서류에서 찾아 준다. 파일마다 누르지 않게(2026-09-04 PO). */}
          {onScan && empty > 0 && (
            <button
              type="button"
              onClick={onScan}
              disabled={scan?.loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
            >
              {scan?.loading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
              )}
              {scan?.loading
                ? ui("scanning", lang, { d: scan.done ?? 0, t: scan.total ?? 0 })
                : scan?.data ? ui("scanAgain", lang) : ui("scan", lang)}
            </button>
          )}
        </div>
      </div>
      {referral.mode === "quick" && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{ui("quick", lang)}</p>
      )}

      {scan?.error && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {scan.error === "no_docs" ? ui("scanNone", lang) : ui("scanFail", lang)}
        </p>
      )}
      {scan?.data && (
        <div className="mt-2 rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2">
          <p className="text-xs font-semibold text-teal-800">
            {ui("scanFound", lang, { n: scan.data.readCount, m: guessed })}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-600">{ui("scanNote", lang)}</p>
        </div>
      )}

      {/* 묶음별 표 — 의뢰서 화면과 같은 순서 */}
      {(() => {
        const groups = [];
        for (const r of rows) {
          const g = groups.find((x) => x.sec === r.sec);
          if (g) g.rows.push(r); else groups.push({ sec: r.sec, rows: [r] });
        }
        return groups.map((g) => (
          <div key={g.sec} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.sec}</p>
            <dl className="mt-1.5 divide-y divide-gray-100">
              {g.rows.map((r) => (
                <div key={r.label} className="flex gap-3 py-1.5 text-sm">
                  <dt className="w-44 shrink-0 text-gray-500">{r.label}</dt>
                  {/* 세 가지 상태: ①환자가 적음 ②비었는데 서류에서 찾음 ③그냥 빔.
                      ②는 «환자가 적은 값»과 눈으로 구별돼야 한다 — 색과 배지로 가른다. */}
                  {r.value ? (
                    <dd className="min-w-0 break-words whitespace-pre-wrap text-gray-900">{r.value}</dd>
                  ) : r.guess ? (
                    <dd className="min-w-0 break-words whitespace-pre-wrap text-teal-900">
                      {r.guess}
                      <span className="ml-1.5 whitespace-nowrap rounded bg-teal-100 px-1.5 py-0.5 text-[11px] font-medium text-teal-800">
                        {ui("fromDoc", lang)}
                      </span>
                      {r.from && <span className="ml-1 text-[11px] text-gray-500">{r.from}</span>}
                    </dd>
                  ) : (
                    <dd className="min-w-0 italic text-gray-500">{ui("empty", lang)}</dd>
                  )}
                </div>
              ))}
            </dl>
          </div>
        ));
      })()}

      {/* 서류 — 종류(AI 추정 또는 사람이 고친 값)·크기·200MB 초과 시 링크. 열람은 첨부 카드에서. */}
      {(env.length > 0 || cd) && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{ui("docs", lang)}</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {env.map((d, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-gray-800">
                <span className="font-medium">{d.kind && d.kind !== "unknown" ? kindLabel(d.kind, lang) : ui("unknownKind", lang)}</span>
                <span className="text-gray-500">{d.name}{d.size ? ` · ${formatMB(d.size)}` : ""}</span>
                {d.correctedByUser && <span className="rounded bg-gray-100 px-1.5 text-[11px] text-gray-600">{ui("fixed", lang)}</span>}
                {d.link && (
                  <a href={d.link} target="_blank" rel="noopener noreferrer" className="break-all text-teal-700 underline">
                    {ui("link", lang)} ↗
                  </a>
                )}
              </li>
            ))}
            {cd && (
              <li className="flex flex-wrap items-baseline gap-x-2 text-gray-800">
                <span className="font-medium">{ui("cd", lang)}</span>
                {cd.count != null && <span className="text-gray-500">{ui("cdFiles", lang, { n: cd.count })}{cd.size ? ` · ${formatMB(cd.size)}` : ""}</span>}
                {cd.link && (
                  <a href={cd.link} target="_blank" rel="noopener noreferrer" className="break-all text-teal-700 underline">
                    {ui("link", lang)} ↗
                  </a>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
