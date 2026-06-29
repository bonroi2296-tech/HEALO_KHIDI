"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

function fmtKRW(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("ko-KR") + " KRW";
}
function fmtUSD(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function localeOf(lang) {
  return lang === "ko"
    ? "ko-KR"
    : lang === "ru"
    ? "ru-RU"
    : lang === "kz"
    ? "kk-KZ"
    : lang === "zh"
    ? "zh-CN"
    : lang === "ja"
    ? "ja-JP"
    : "en-US";
}

const COPY = {
  en: {
    statusLabels: {
      auto_range: "Estimated range",
      formal_requested: "Formal request",
      hospital_pending: "Awaiting hospital response",
      draft: "Coordinator drafting",
      issued: "Quote issued",
      accepted: "Agreed",
      rejected: "Declined",
      expired: "Expired",
    },
    loading: "Loading…",
    errorLabel: "Error",
    backList: "← Back to list",
    backQuotes: "← Quote list",
    formalRequestFallback: "Formal quote request",
    statusPrefix: "Status",
    createdSuffix: "created",
    autoRangeTitle: "Estimated range (for reference)",
    median: "Median",
    aiAnalysis: "AI analysis",
    coordinatorNotes: "Coordinator notes",
    issuedTitle: "✅ Formal quote issued",
    total: "Total",
    approx: "approx.",
    downloadPdf: "Download quote PDF",
    agree: "Agree",
    decline: "Decline",
    auditNote: "※ Your consent timestamp and IP are recorded for audit purposes (Act on Overseas Expansion of Medical Services §15)",
    agreedAt: "Agreed on",
    itemDetails: "Item details",
    colItem: "Item",
    colNote: "Note",
    legalFootnote:
      "⚠️ The estimated range is a statistics-based reference; actual costs are based on the issued formal quote. Under the Act on Overseas Expansion of Medical Services §15, receiving and confirming a quote before a treatment contract is legally required.",
    confirmAccept: "Do you agree to this quote? Under the Act on Overseas Expansion of Medical Services §15, the time of your consent and your IP address will be recorded.",
    confirmReject: "Do you want to decline this quote?",
    failed: "Failed: ",
  },
  ko: {
    statusLabels: {
      auto_range: "자동 범위",
      formal_requested: "정식 요청",
      hospital_pending: "병원 응답 대기",
      draft: "코디 작성 중",
      issued: "견적서 발급",
      accepted: "동의 완료",
      rejected: "거절",
      expired: "만료",
    },
    loading: "불러오는 중...",
    errorLabel: "오류",
    backList: "← 목록",
    backQuotes: "← 견적 목록",
    formalRequestFallback: "정식 견적 요청",
    statusPrefix: "상태",
    createdSuffix: "생성",
    autoRangeTitle: "자동 예상 범위 (참고용)",
    median: "중앙값",
    aiAnalysis: "AI 분석",
    coordinatorNotes: "코디네이터 메모",
    issuedTitle: "✅ 정식 견적서 발급됨",
    total: "총",
    approx: "약",
    downloadPdf: "견적서 PDF 다운로드",
    agree: "동의하기",
    decline: "거절",
    auditNote: "※ 동의 시각과 IP 가 감사 목적으로 기록됩니다 (의료해외진출법 §15)",
    agreedAt: "동의 완료",
    itemDetails: "항목별 상세",
    colItem: "항목",
    colNote: "비고",
    legalFootnote:
      "⚠️ 자동 범위는 통계 기반 참고치이며, 실제 비용은 발급된 정식 견적서를 기준으로 합니다. 의료해외진출법 §15 에 따라 진료 계약 전 견적서 수령과 확인이 법적으로 요구됩니다.",
    confirmAccept: "이 견적서에 동의하시겠습니까? 의료해외진출법 §15 에 따라 동의 시각과 IP 가 기록됩니다.",
    confirmReject: "이 견적서를 거절하시겠습니까?",
    failed: "실패: ",
  },
  ru: {
    statusLabels: {
      auto_range: "Ориентировочный диапазон",
      formal_requested: "Официальный запрос",
      hospital_pending: "Ожидание ответа клиники",
      draft: "Координатор готовит",
      issued: "Расчёт выдан",
      accepted: "Согласовано",
      rejected: "Отклонено",
      expired: "Истёк срок",
    },
    loading: "Загрузка…",
    errorLabel: "Ошибка",
    backList: "← К списку",
    backQuotes: "← Список расчётов",
    formalRequestFallback: "Запрос официального расчёта",
    statusPrefix: "Статус",
    createdSuffix: "создан",
    autoRangeTitle: "Ориентировочный диапазон (справочно)",
    median: "Медиана",
    aiAnalysis: "Анализ ИИ",
    coordinatorNotes: "Заметки координатора",
    issuedTitle: "✅ Официальный расчёт выдан",
    total: "Итого",
    approx: "около",
    downloadPdf: "Скачать расчёт в PDF",
    agree: "Согласиться",
    decline: "Отклонить",
    auditNote: "※ Время вашего согласия и IP-адрес записываются для целей аудита (Закон о зарубежном развитии медицинских услуг §15)",
    agreedAt: "Согласовано",
    itemDetails: "Детализация по позициям",
    colItem: "Позиция",
    colNote: "Примечание",
    legalFootnote:
      "⚠️ Ориентировочный диапазон — это справочное значение на основе статистики; фактическая стоимость определяется выданным официальным расчётом. Согласно Закону о зарубежном развитии медицинских услуг §15, получение и подтверждение расчёта до заключения договора на лечение требуется по закону.",
    confirmAccept: "Вы согласны с этим расчётом? Согласно Закону о зарубежном развитии медицинских услуг §15, время вашего согласия и IP-адрес будут записаны.",
    confirmReject: "Вы хотите отклонить этот расчёт?",
    failed: "Ошибка: ",
  },
  kz: {
    statusLabels: {
      auto_range: "Болжамды ауқым",
      formal_requested: "Ресми сұрау",
      hospital_pending: "Аурухана жауабын күту",
      draft: "Координатор дайындауда",
      issued: "Баға ұсынысы берілді",
      accepted: "Келісілді",
      rejected: "Бас тартылды",
      expired: "Мерзімі өтті",
    },
    loading: "Жүктелуде…",
    errorLabel: "Қате",
    backList: "← Тізімге",
    backQuotes: "← Баға ұсыныстары тізімі",
    formalRequestFallback: "Ресми баға сұрауы",
    statusPrefix: "Күй",
    createdSuffix: "жасалды",
    autoRangeTitle: "Болжамды ауқым (анықтама үшін)",
    median: "Медиана",
    aiAnalysis: "ЖИ талдауы",
    coordinatorNotes: "Координатор жазбалары",
    issuedTitle: "✅ Ресми баға ұсынысы берілді",
    total: "Барлығы",
    approx: "шамамен",
    downloadPdf: "Баға ұсынысын PDF жүктеу",
    agree: "Келісу",
    decline: "Бас тарту",
    auditNote: "※ Келісім уақыты мен IP-мекенжайы аудит мақсатында тіркеледі (Медициналық қызметтерді шетелде дамыту туралы заң §15)",
    agreedAt: "Келісілді",
    itemDetails: "Баптар бойынша егжей-тегжей",
    colItem: "Бап",
    colNote: "Ескертпе",
    legalFootnote:
      "⚠️ Болжамды ауқым — статистикаға негізделген анықтамалық мән; нақты құн берілген ресми баға ұсынысы бойынша анықталады. Медициналық қызметтерді шетелде дамыту туралы заң §15 бойынша емдеу шартына дейін баға ұсынысын алу және растау заңмен талап етіледі.",
    confirmAccept: "Осы баға ұсынысымен келісесіз бе? Медициналық қызметтерді шетелде дамыту туралы заң §15 бойынша келісім уақыты мен IP-мекенжайы тіркеледі.",
    confirmReject: "Осы баға ұсынысынан бас тартқыңыз келе ме?",
    failed: "Қате: ",
  },
  zh: {
    statusLabels: {
      auto_range: "预估范围",
      formal_requested: "正式请求",
      hospital_pending: "等待医院回复",
      draft: "协调员编制中",
      issued: "报价已出具",
      accepted: "已同意",
      rejected: "已拒绝",
      expired: "已过期",
    },
    loading: "加载中…",
    errorLabel: "错误",
    backList: "← 返回列表",
    backQuotes: "← 报价列表",
    formalRequestFallback: "正式报价请求",
    statusPrefix: "状态",
    createdSuffix: "创建",
    autoRangeTitle: "自动预估范围（仅供参考）",
    median: "中位数",
    aiAnalysis: "AI 分析",
    coordinatorNotes: "协调员备注",
    issuedTitle: "✅ 正式报价已出具",
    total: "合计",
    approx: "约",
    downloadPdf: "下载报价 PDF",
    agree: "同意",
    decline: "拒绝",
    auditNote: "※ 您的同意时间和 IP 地址将出于审计目的予以记录（《医疗海外拓展法》第15条）",
    agreedAt: "已同意",
    itemDetails: "分项明细",
    colItem: "项目",
    colNote: "备注",
    legalFootnote:
      "⚠️ 自动预估范围为基于统计的参考值，实际费用以出具的正式报价为准。根据《医疗海外拓展法》第15条，在诊疗合同签订前接收并确认报价为法律要求。",
    confirmAccept: "您是否同意此报价？根据《医疗海外拓展法》第15条，您的同意时间和 IP 地址将被记录。",
    confirmReject: "您是否要拒绝此报价？",
    failed: "失败：",
  },
  ja: {
    statusLabels: {
      auto_range: "概算範囲",
      formal_requested: "正式依頼",
      hospital_pending: "病院の回答待ち",
      draft: "コーディネーター作成中",
      issued: "見積もり発行済み",
      accepted: "同意済み",
      rejected: "辞退",
      expired: "期限切れ",
    },
    loading: "読み込み中…",
    errorLabel: "エラー",
    backList: "← 一覧",
    backQuotes: "← 見積もり一覧",
    formalRequestFallback: "正式見積もり依頼",
    statusPrefix: "ステータス",
    createdSuffix: "作成",
    autoRangeTitle: "自動概算範囲（参考用）",
    median: "中央値",
    aiAnalysis: "AI 分析",
    coordinatorNotes: "コーディネーターのメモ",
    issuedTitle: "✅ 正式見積もり発行済み",
    total: "合計",
    approx: "約",
    downloadPdf: "見積もり PDF をダウンロード",
    agree: "同意する",
    decline: "辞退する",
    auditNote: "※ 同意した日時と IP アドレスは監査目的で記録されます（医療海外進出法 §15）",
    agreedAt: "同意済み",
    itemDetails: "項目別明細",
    colItem: "項目",
    colNote: "備考",
    legalFootnote:
      "⚠️ 自動概算範囲は統計に基づく参考値であり、実際の費用は発行された正式見積もりに基づきます。医療海外進出法 §15 により、診療契約前に見積もりを受領・確認することが法的に求められます。",
    confirmAccept: "この見積もりに同意しますか？医療海外進出法 §15 に従い、同意した日時と IP アドレスが記録されます。",
    confirmReject: "この見積もりを辞退しますか？",
    failed: "失敗しました: ",
  },
};

export default function CostEstimateDetailClient({ estimateId }) {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const dateLocale = localeOf(lang);

  const [estimate, setEstimate] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    load();
  }, [estimateId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setEstimate(json.data);

      if (json.data.quotation_pdf_url) {
        const qr = await fetch(
          `/api/khidi/cost-estimates/${estimateId}/quotation`,
          { credentials: "include" }
        );
        const qj = await qr.json();
        if (qj.ok) setPdfUrl(qj.quotation_pdf_url);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!confirm(copy.confirmAccept)) return;
    setActing(true);
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accept: true }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await load();
    } catch (err) {
      alert(copy.failed + err.message);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!confirm(copy.confirmReject)) return;
    setActing(true);
    try {
      const res = await fetch(
        `/api/khidi/cost-estimates/${estimateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reject: true }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      await load();
    } catch (err) {
      alert(copy.failed + err.message);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">{copy.loading}</p>
      </div>
    );
  }
  if (error || !estimate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">{copy.errorLabel}: {error}</p>
        <Link href="/patient/cost-estimates" className="text-sm underline mt-4 inline-block">{copy.backList}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/patient/cost-estimates"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        {copy.backQuotes}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {estimate.quotation_no || copy.formalRequestFallback}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {copy.statusPrefix}: {copy.statusLabels[estimate.status] || estimate.status} ·{" "}
            {new Date(estimate.created_at).toLocaleString(dateLocale)} {copy.createdSuffix}
          </p>
        </div>
      </div>

      {/* 자동 범위 */}
      {estimate.auto_min_krw && (
        <section className="mt-6 border border-gray-200 rounded-lg p-5 bg-white">
          <h2 className="text-sm font-medium text-gray-700">{copy.autoRangeTitle}</h2>
          <p className="mt-2 text-lg">
            {fmtKRW(estimate.auto_min_krw)} ~ {fmtKRW(estimate.auto_max_krw)}
          </p>
          {estimate.auto_median_krw && (
            <p className="text-xs text-gray-500 mt-1">
              {copy.median}: {fmtKRW(estimate.auto_median_krw)}
            </p>
          )}
          {estimate.ai_personalization && (
            <p className="text-xs text-blue-700 mt-2 italic">
              {copy.aiAnalysis}: {estimate.ai_personalization}
            </p>
          )}
        </section>
      )}

      {/* 코디 메모 */}
      {estimate.coordinator_notes && (
        <section className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">{copy.coordinatorNotes}</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {estimate.coordinator_notes}
          </p>
        </section>
      )}

      {/* 정식 견적서 */}
      {estimate.status === "issued" && (
        <section className="mt-6 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="font-medium text-emerald-900">{copy.issuedTitle}</h2>
          <p className="text-sm text-emerald-800 mt-1">
            {copy.total} {fmtKRW(estimate.total_krw)}{" "}
            {estimate.total_usd ? `(${copy.approx} ${fmtUSD(estimate.total_usd)})` : ""}
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
            >
              {copy.downloadPdf}
            </a>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAccept}
              disabled={acting}
              className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {copy.agree}
            </button>
            <button
              onClick={handleReject}
              disabled={acting}
              className="border border-gray-300 px-4 py-2 rounded text-sm hover:border-black"
            >
              {copy.decline}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {copy.auditNote}
          </p>
        </section>
      )}

      {estimate.status === "accepted" && (
        <section className="mt-6 border border-green-200 bg-green-50 rounded-lg p-5">
          <p className="text-sm text-green-900">
            ✓ {new Date(estimate.patient_accepted_at).toLocaleString(dateLocale)} {copy.agreedAt}
          </p>
        </section>
      )}

      {/* 견적 항목 */}
      {estimate.quotation_items && estimate.quotation_items.length > 0 && (
        <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
          <h2 className="px-4 py-3 font-medium text-sm bg-gray-50 border-b border-gray-200">
            {copy.itemDetails}
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">{copy.colItem}</th>
                <th className="px-4 py-2 text-left">{copy.colNote}</th>
                <th className="px-4 py-2 text-right">KRW</th>
                <th className="px-4 py-2 text-right">USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimate.quotation_items.map((it, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{it.label}</td>
                  <td className="px-4 py-2 text-gray-600">{it.note || ""}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {it.krw != null ? Number(it.krw).toLocaleString("ko-KR") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {it.usd != null ? `$${Number(it.usd).toLocaleString("en-US")}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-xs text-gray-500 mt-6 italic leading-relaxed">
        {copy.legalFootnote}
      </p>
    </div>
  );
}
