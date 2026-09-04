"use client";

/**
 * 코디 문의 상세 — 「병원 의뢰서 만들기」
 *
 * 왜 (2026-09-04 PO): 「이대, 세브란스 의뢰서가 이렇게 있잖아. 근데 의무기록에 말이 너무 어려워.
 *   각 병원별로 의뢰서 양식에 맞게 문서 만들어줘. 각 병원에서 요구하는 정보를 담아줘.」
 *   값은 이미 문의 안에 다 있었다 — 코디가 러시아어 검사지를 읽고 병원 양식을 열어
 *   칸을 하나씩 옮겨 적는 일만 남아 있었다.
 *
 * 무엇을 하나: 병원을 고르면 그 병원 «양식 그대로» 표를 채워 준다. 복사해서 메일에 붙이거나
 * 인쇄(PDF)해서 보내면 된다.
 *
 * 🛑 값이 없으면 지어내지 않고 빈칸으로 둔다 — 의뢰서의 빈칸은 「아직 못 받았다」는 정보다.
 *    빈칸이 몇 개인지 위에 세어 준다. 그게 「환자에게 더 물어봐야 할 것」 목록이다.
 */

import { useState, useEffect, useCallback } from "react";
import { FileText, Copy, Check, Printer, Languages, Loader2, Download } from "lucide-react";
import { HOSPITAL_FORMS } from "@/lib/inquiry/hospitalReferralForms";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { NATIONALITY_NAMES } from "@/lib/khidi/nationality";

const isBlank = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
// 한글이 하나라도 있으면 이미 우리말이다 — 다시 옮길 필요 없다.
const hasKo = (s) => /[가-힣]/.test(String(s || ""));
// 라틴 글자만 있으면 이미 영어로 볼 수 있다(사람 이름·파일 이름 포함).
// 키릴(러시아어)이 섞여 있으면 영문 양식에 그대로 못 낸다. 코드값으로 본다 —
// 정규식에 백슬래시로 범위를 적으면 이스케이프가 풀려 제어문자가 박힌다(2026-09-04 실측).
const looksLatin = (s) => ![...String(s || "")].some((c) => c.charCodeAt(0) > 0x2ff);

export default function HospitalReferralSection({ inquiryId, values, attachments = [], onSaved }) {
  const [openId, setOpenId] = useState(null);
  const [copied, setCopied] = useState(false);
  const form = HOSPITAL_FORMS.find((f) => f.id === openId) || null;

  // ── 병원 언어로 옮기기 ──
  // 2026-09-04 PO: 「의무기록에 말이 너무 어려워」. 값은 러시아어 원문 그대로 들어 있다.
  // 세브란스 양식은 한글, 이대 양식은 영문 병기 → 병원마다 낼 말이 다르다.
  // 🛑 원문으로 되돌리는 길을 남긴다. 옮긴 글로 «의료 판단»을 하면 안 되고, 병원이 원문을
  //    요구할 때도 있다.
  // 어느 말로 낼까 — "ko" | "en" | "raw"(환자가 낸 그대로).
  // 2026-09-04 PO: 「영문버전, 한글버전 따로 만들 수 있게도 해줘」.
  //   병원마다 기본이 있지만(이대=영어·세브란스=한국어) 같은 병원에도 두 벌이 필요할 때가 있다 —
  //   병원엔 영문으로 내고 우리 기록엔 한글로 남기는 식. null 이면 그 병원 기본을 따른다.
  const [langPick, setLangPick] = useState(null);
  // 언어별로 나눠 담는다: { ko: { 원문: 번역문 }, en: {...} }
  // 🛑 언어를 열쇠 문자열에 «이어붙이지» 마라 — 그렇게 했다가 제어문자가 섞여 저장은 되는데
  //    화면은 계속 원문이었다(2026-09-04 실측: tmap 에 5칸이 찼는데 옮긴 칸은 0이었다).
  const [tmap, setTmap] = useState({});
  const [tBusy, setTBusy] = useState(false);

  const translate = useCallback(async (targetLang, texts) => {
    if (!texts.length) return;
    setTBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/coordinator/notes/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ lang: targetLang, texts }),
      });
      const d = await res.json();
      if (d.ok && d.map) {
        setTmap((p) => {
          const box = { ...(p[targetLang] || {}) };
          for (const [src, out] of Object.entries(d.map)) box[String(src).trim()] = out;
          return { ...p, [targetLang]: box };
        });
      }
    } catch (e) {
      console.error("[hospital-form] translate error:", e);   // 실패해도 원문 그대로 보인다
    } finally {
      setTBusy(false);
    }
  }, []);

  // 양식 칸 → 실제 값. 병원 양식에만 있는 «합쳐진 칸»은 여기서 만든다.
  function valueOf(field) {
    if (!field) return "";                       // 우리 문의에 없는 칸(예: 코로나 백신) — 빈칸으로 둔다
    if (field === "patientName") return values.patientName || "";
    // 성별·국적은 번역기를 안 태운다(옮길 글이 아니라 «정해진 값»이다). 대신 양식 언어에 맞는
    // 표기를 여기서 고른다 — 영문 병기 양식에 「남성」·「카자흐스탄」이 들어가면 안 어울린다.
    const lang = langPick && langPick !== "raw" ? langPick : (form?.contentLang || "ko");
    if (field === "sex") return (lang === "en" ? values.sexEn : values.sex) || "";
    if (field === "nationality") return (lang === "en" ? values.nationalityEn : values.nationality) || "";
    if (field === "contact") {
      const rows = [values.phone && `Mobile: ${values.phone}`, values.email && `E-mail: ${values.email}`];
      return rows.filter(Boolean).join("\n");
    }
    const v = values[field];
    return isBlank(v) ? "" : String(v);
  }

  // 고른 말이 있으면 그것을, 없으면 병원 기본을 쓴다. "raw" 는 옮기지 않는다는 뜻.
  const pick = langPick || form?.contentLang || "ko";
  const showRaw = pick === "raw";
  const target = showRaw ? (form?.contentLang || "ko") : pick;
  // 옮길 값 — 이미 그 말인 것, 이름·파일 목록·날짜처럼 옮길 것이 없는 칸은 뺀다.
  const NO_TRANSLATE = new Set(["patientName", "birthDate", "onsetDate", "diagnosisDate", "contact", "nationality", "sex"]);
  const rawRows = form ? form.rows.map((r) => ({ ...r, raw: valueOf(r.field) })) : [];
  const needTr = rawRows
    .filter((r) => r.raw && !NO_TRANSLATE.has(r.field))
    .filter((r) => (target === "ko" ? !hasKo(r.raw) : !looksLatin(r.raw)))
    .map((r) => r.raw);

  useEffect(() => {
    if (!form || showRaw) return;
    const box = tmap[target] || {};
    const todo = needTr.filter((s) => !box[String(s).trim()]);
    if (todo.length) translate(target, todo);
    // needTr 은 매 렌더 새 배열이라 «내용»으로 비교한다 — 안 그러면 무한 재요청이 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, showRaw, needTr.join("|"), target, translate]);

  // 첨부 파일 이름 — 번역하지 않는다(옮기면 병원이 메일에서 그 파일을 못 찾는다).
  const fileList = attachments.map((a) => a?.name).filter(Boolean).join("\n");
  const filesLabel = target === "en" ? "Attached files:" : "첨부 파일:";

  const rows = rawRows.map((r) => {
    const tr = !showRaw && r.raw ? (tmap[target] || {})[r.raw.trim()] : null;
    let value = tr || r.raw;
    // withFiles 칸은 «설명 + 파일 목록»이다. 설명이 없으면 파일 목록만 나온다.
    // 🛑 파일 이름만 넣던 자리다(2026-09-04 PO: 「검사 결과도 파일만 첨부할 게 아니라
    //    설명을 해줘야지」). 설명을 빼지 마라 — 병원은 파일을 열기 «전»에 이 칸을 읽는다.
    if (r.withFiles && fileList) value = value ? `${value}\n\n${filesLabel}\n${fileList}` : fileList;
    return { ...r, value, wasTranslated: !!tr };
  });
  const emptyCount = rows.filter((r) => !r.value).length;
  const trCount = rows.filter((r) => r.wasTranslated).length;
  // 빈칸 중 «코디가 적을 수 있는» 것. contact 는 전화·이메일을 합쳐 만든 칸이고,
  // attachmentsOnly 는 파일 목록 자리라 둘 다 저장할 칸이 없다. field 가 없는 칸(코로나 백신)도 같다.
  const NOT_EDITABLE = new Set(["contact", "attachmentsOnly"]);
  const emptyRows = rows.filter((r) => !r.value && r.field && !NOT_EDITABLE.has(r.field));

  function plainText() {
    if (!form) return "";
    const head = form.bilingual ? `${form.title.ko} (${form.title.en})` : form.title.ko;
    const body = rows
      .map((r) => {
        const label = form.bilingual && r.en ? `${r.ko} / ${r.en}` : r.ko;
        return `${label}\n${r.value || "(미기재)"}`;
      })
      .join("\n\n");
    return `${head}\n\n${body}\n`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* 클립보드가 막힌 브라우저 — 표를 직접 긁어 복사한다 */ }
  }

  /**
   * 병원이 준 원본 워드 양식에 값만 채워 내려받는다.
   * 화면이 이미 계산해 둔 값(번역 포함)을 그대로 보낸다 — 서버가 다시 번역하면 화면과 달라진다.
   */
  /**
   * 비어 있는 칸을 «그 자리에서» 적어 채운다.
   *
   * 왜 (2026-09-04 PO): 「이 케이스 왜 국적이 비어 있냐 카자흐스탄이라면서. 의뢰목적도 비어있고」
   *   실측해 보니 둘 다 «서류에서 나올 수 없는 값»이었다 — 국적은 여권이 없으면 서류에 안 적혀
   *   있고(판독기는 추론을 금지하고 있다), 의뢰 목적은 애초에 우리가 정하는 것이다.
   *   그런데 코디가 적을 자리가 없어서 영영 빈칸이었다. 여기서 적는다.
   * 🛑 이미 값이 있는 칸은 여기서 안 건드린다 — 고치는 일은 원래 화면(의뢰서 카드)의 몫이다.
   */
  const [editField, setEditField] = useState(null);
  const [editText, setEditText] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  async function saveField() {
    const v = editText.trim();
    if (!v || !editField) return;
    setEditBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/referral-fill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ fields: { [editField]: v }, from: { [editField]: "코디 입력" } }),
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "failed");
      // ⚠️ filled 가 비어도 «실패»가 아니다 — 그 사이 다른 사람이 같은 칸을 채웠으면
      //    창구가 「이미 있음」으로 건너뛰고 skipped 에 넣는다. 그때 「저장하지 못했습니다」를
      //    띄우면 실제로는 값이 있는데 코디가 계속 다시 누른다(2026-09-04 실측으로 잡음).
      if (!j.filled?.length && j.skipped?.length) {
        window.alert("그 사이 다른 값이 들어와 있어 덮어쓰지 않았습니다. 화면을 새로 고쳐 확인해 주세요.");
      }
      setEditField(null);
      setEditText("");
      onSaved?.();          // 부모가 문의를 다시 읽어 화면을 갱신한다
    } catch (e) {
      console.error("[hospital-form] field save error:", e);
      window.alert("저장하지 못했습니다. 잠시 뒤 다시 눌러주세요.");
    }
    setEditBusy(false);
  }

  /**
   * 미리보기 — 화면에 «원본 양식을 채운 결과»를 그대로 그린다.
   *
   * 왜 (2026-09-04 PO): 「니가 대충 만든 양식 말고 실제 각 병원 양식 그대로에다가 텍스트
   *   붙여줄 수 없냐. 지금 좀 이상해, 얼기설기 비슷한데 좀 다르잖아」
   *   전에는 이 화면이 표를 «새로 그렸다». 칸 병합·2단 배치·인쇄된 안내 문구가 원본과
   *   달라서, 코디가 화면에서 본 것과 병원에 나가는 파일이 서로 다르게 보였다.
   * 🛑 표를 여기서 다시 그리지 마라. 화면과 파일이 «같은 XML»에서 나와야 어긋나지 않는다.
   */
  const [preview, setPreview] = useState(null);
  const [pvBusy, setPvBusy] = useState(false);

  const [docxBusy, setDocxBusy] = useState(false);
  /** 창구에 보낼 값 — 화면이 이미 계산해 둔 것(번역·파일 목록 포함)을 그대로 보낸다. */
  function buildPayload() {
    const payload = {};
    for (const r of rows) if (r.field && r.value) payload[r.field] = r.value;
    return payload;
  }

  // 값이나 언어가 바뀔 때마다 «채운 양식»을 다시 받아 그린다. 번역이 도는 중에는 기다린다 —
  // 안 그러면 원문으로 한 번 그렸다가 번역문으로 또 그려서 화면이 두 번 튄다.
  const previewSig = form ? JSON.stringify([form.id, pick, rows.map((r) => [r.field, r.value])]) : "";
  useEffect(() => {
    if (!form) { setPreview(null); return; }
    if (tBusy) return;
    let dead = false;
    (async () => {
      setPvBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/referral-docx`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
          body: JSON.stringify({ hospital: form.id, values: buildPayload(), lang: pick, format: "html" }),
        });
        const j = await res.json();
        if (!dead && j?.ok) setPreview({ heading: j.heading || "", table: j.table || "" });
      } catch (e) {
        console.error("[hospital-form] preview error:", e);
      } finally {
        if (!dead) setPvBusy(false);
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSig, tBusy, inquiryId]);

  async function downloadDocx() {
    if (!form) return;
    setDocxBusy(true);
    try {
      const payload = buildPayload();
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/coordinator/inquiries/${inquiryId}/referral-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ hospital: form.id, values: payload, lang: pick }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      // 파일 이름은 서버가 정한다(환자 이름 + 병원). 헤더에서 꺼내 쓴다.
      const cd = res.headers.get("content-disposition") || "";
      const m = /filename\*=UTF-8''([^;]+)/.exec(cd);
      const name = m ? decodeURIComponent(m[1]) : "의뢰서.docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      console.error("[hospital-form] docx error:", e);
      window.alert("양식 파일을 만들지 못했습니다. 잠시 뒤 다시 눌러주세요.");
    }
    setDocxBusy(false);
  }

  // 인쇄는 «새 창에 표만» 띄운다. 이 화면을 그대로 인쇄하면 왼쪽 메뉴·단추까지 종이에 나온다.
  function print() {
    if (!form || !preview?.table) return;
    const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    // 화면에 그린 «그 표»를 그대로 인쇄한다 — 여기서 표를 다시 만들면 또 어긋난다.
    const title = preview.heading || form.title.ko;
    const w = window.open("", "_blank", "noopener,width=900,height=1000");
    if (!w) { window.alert("팝업이 막혀 있습니다. 주소창 옆에서 팝업을 허용해 주세요."); return; }
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  body{font:13px/1.65 "Malgun Gothic","맑은 고딕",sans-serif;margin:14mm;color:#111}
  h1{font-size:15px;margin:0 0 12px;text-align:center}
  table.docx{width:100%;border-collapse:collapse;table-layout:fixed}
  table.docx td{border:1px solid #666;padding:7px 9px;vertical-align:top;word-break:break-word}
  table.docx td.sh{background:#f2f2f2;font-weight:600}
</style></head><body>
${preview.heading ? `<h1>${esc(preview.heading)}</h1>` : ""}
${preview.table}
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <FileText size={17} className="text-teal-700" /> 병원 의뢰서 만들기
        </h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        병원을 고르면 그 병원 양식대로 채워 드립니다. 복사해 메일에 붙이거나 인쇄해 보내세요.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {HOSPITAL_FORMS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setOpenId((v) => (v === f.id ? null : f.id))}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              openId === f.id
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
            }`}
          >
            {f.name.ko}
          </button>
        ))}
      </div>

      {form && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-600">
              {emptyCount > 0 ? (
                <>
                  <b className="text-amber-700">{emptyCount}칸이 비어 있습니다</b> — 환자·에이전시에게 더 받아야 할 것입니다.
                </>
              ) : (
                <b className="text-teal-800">모든 칸이 채워졌습니다.</b>
              )}
              {trCount > 0 && (
                <span className="ml-1.5 text-gray-500">
                  · {trCount}칸을 {target === "ko" ? "한국어" : "영어"}로 옮겼습니다(기계 번역)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              {/* 어느 말로 낼까 — 한 병원에도 두 벌이 필요할 때가 있다(2026-09-04 PO).
                  「원문」은 환자가 낸 그대로 — 판단은 원문으로 해야 하니 길을 남긴다. */}
              <div className="inline-flex overflow-hidden rounded-md border border-gray-200" role="group" aria-label="문서 언어">
                {[
                  { key: "ko", label: "한국어" },
                  { key: "en", label: "English" },
                  { key: "raw", label: "원문" },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setLangPick(o.key)}
                    disabled={tBusy}
                    className={`px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      pick === o.key ? "bg-teal-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tBusy && pick === o.key ? <Loader2 size={12} className="inline animate-spin" /> : null} {o.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {copied ? <Check size={14} className="text-teal-700" /> : <Copy size={14} />}
                {copied ? "복사했습니다" : "글로 복사"}
              </button>
              <button
                type="button"
                onClick={print}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Printer size={14} /> 인쇄 · PDF
              </button>
              {/* 병원이 준 «원본 워드 양식» 그대로 값만 채워 내려준다(2026-09-04 PO:
                  「docx 그대로 줘야 바로 약간 손보고 보내지」). 새로 그리는 게 아니라 원본을 채운다. */}
              <button
                type="button"
                onClick={downloadDocx}
                disabled={docxBusy}
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
              >
                {docxBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {docxBusy ? "만드는 중…" : "양식 파일(Word) 받기"}
              </button>
            </div>
          </div>

          {/* 병원이 준 «원본 양식» 그대로 — 칸 병합·2단 배치·인쇄된 안내 문구까지 원본이다.
              값을 채운 뒤의 XML 을 서버가 표로 옮겨 준다(같은 XML 로 워드 파일도 만든다). */}
          <div className="docx-preview overflow-x-auto rounded-lg border border-gray-200 bg-white p-4">
            {preview?.heading && <div className="docx-heading">{preview.heading}</div>}
            {preview?.table ? (
              <div dangerouslySetInnerHTML={{ __html: preview.table }} />
            ) : (
              <p className="py-6 text-center text-xs text-gray-500">
                <Loader2 size={14} className="mr-1.5 inline animate-spin" />
                {tBusy ? "병원 언어로 옮기는 중입니다…" : "양식을 채우는 중입니다…"}
              </p>
            )}
            {pvBusy && preview?.table && (
              <p className="mt-2 text-right text-[11px] text-gray-500">
                <Loader2 size={11} className="mr-1 inline animate-spin" />새로 채우는 중
              </p>
            )}
          </div>

          {/* 아직 못 받은 칸 — 원본 표 안에는 빈칸으로 두고(그게 병원이 받을 모습이다),
              적을 자리는 표 밖에 둔다. 2026-09-04 PO: 「이 케이스 왜 국적이 비어 있냐」 */}
          {emptyRows.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">
                아직 못 받은 칸 {emptyRows.length}개 — 눌러서 그 자리에서 적을 수 있습니다.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {emptyRows.map((r) => (
                  <button
                    key={r.field}
                    type="button"
                    onClick={() => { setEditField(r.field); setEditText(""); }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                      editField === r.field
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    }`}
                  >
                    {r.ko}
                  </button>
                ))}
              </div>
              {editField && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {/* 국적은 «나라 코드»(KZ·RU…)로 저장해야 한다 — 화면·집계가 그 코드로 나라
                      이름을 만든다. 손으로 「카자흐스탄」이라 적으면 코드가 아니라서 그대로
                      「기타」가 된다(2026-09-04 실측). 그래서 고르기로 받는다. */}
                  {editField === "nationality" ? (
                    <select
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-w-0 flex-1 rounded border border-teal-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">나라를 고르세요</option>
                      {Object.entries(NATIONALITY_NAMES).map(([code, ko]) => (
                        <option key={code} value={code}>{ko}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveField(); if (e.key === "Escape") setEditField(null); }}
                      placeholder={`${emptyRows.find((r) => r.field === editField)?.ko || ""} — 여기에 적으세요`}
                      className="min-w-0 flex-1 rounded border border-teal-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-teal-100"
                    />
                  )}
                  <button type="button" onClick={saveField} disabled={editBusy || !editText.trim()}
                    className="rounded bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40">
                    {editBusy ? "저장 중" : "저장"}
                  </button>
                  <button type="button" onClick={() => setEditField(null)}
                    className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">취소</button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </section>
  );
}
