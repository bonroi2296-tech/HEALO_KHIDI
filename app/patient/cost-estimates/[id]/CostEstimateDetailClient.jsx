"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 원시 err.message 노출 금지 — 6개어 일반 실패 안내(보안+UX)
const FAIL_MSG = {
  ko: "요청 처리에 실패했습니다. 다시 시도해 주세요.",
  en: "The request failed. Please try again.",
  ru: "Не удалось выполнить запрос. Попробуйте ещё раз.",
  kz: "Сұрауды орындау мүмкін болмады. Қайталап көріңіз.",
  zh: "请求失败，请重试。",
  ja: "リクエストに失敗しました。もう一度お試しください。",
};

function fmtKRW(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("ko-KR") + " KRW";
}
function fmtUSD(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// 상태 라벨 — 6개 활성언어(ko·en·ru·kz·zh·ja)
const STATUS_LABELS = {
  auto_range: { ko: "자동 범위", en: "Auto estimate range", ru: "Автоматический диапазон", kz: "Автоматты диапазон", zh: "自动预估范围", ja: "自動見積り範囲" },
  formal_requested: { ko: "정식 요청", en: "Formal request", ru: "Официальный запрос", kz: "Ресми сұрау", zh: "正式申请", ja: "正式依頼" },
  hospital_pending: { ko: "병원 응답 대기", en: "Awaiting hospital", ru: "Ожидание ответа больницы", kz: "Аурухана жауабын күту", zh: "等待医院回复", ja: "病院の回答待ち" },
  draft: { ko: "코디 작성 중", en: "Coordinator drafting", ru: "Координатор готовит", kz: "Координатор дайындауда", zh: "协调员编写中", ja: "コーディネーター作成中" },
  issued: { ko: "견적서 발급", en: "Estimate issued", ru: "Смета выдана", kz: "Смета берілді", zh: "预估已出具", ja: "見積り発行済み" },
  accepted: { ko: "동의 완료", en: "Accepted", ru: "Одобрено", kz: "Мақұлданды", zh: "已批准", ja: "承認済み" },
  rejected: { ko: "거절", en: "Rejected", ru: "Отклонено", kz: "Қабылданбады", zh: "已拒绝", ja: "却下" },
  expired: { ko: "만료", en: "Expired", ru: "Истёк срок", kz: "Мерзімі өтті", zh: "已过期", ja: "期限切れ" },
};

// 사용자 노출 문자열 — 6개 활성언어(ko·en·ru·kz·zh·ja)
const LABELS = {
  loading: { ko: "불러오는 중...", en: "Loading...", ru: "Загрузка...", kz: "Жүктелуде...", zh: "加载中...", ja: "読み込み中..." },
  backToList: { ko: "← 목록", en: "← List", ru: "← Список", kz: "← Тізім", zh: "← 列表", ja: "← 一覧" },
  backToEstimates: { ko: "← 견적 목록", en: "← Cost estimates", ru: "← Сметы расходов", kz: "← Шығындар сметалары", zh: "← 费用预估列表", ja: "← 費用見積もり一覧" },
  formalRequestTitle: { ko: "정식 견적 요청", en: "Formal estimate request", ru: "Запрос официальной сметы", kz: "Ресми смета сұрауы", zh: "正式费用预估申请", ja: "正式見積もり依頼" },
  statusLabel: { ko: "상태", en: "Status", ru: "Статус", kz: "Күйі", zh: "状态", ja: "ステータス" },
  createdSuffix: { ko: "생성", en: "created", ru: "создано", kz: "жасалды", zh: "创建", ja: "作成" },
  autoRangeTitle: { ko: "자동 예상 범위 (참고용)", en: "Auto estimate range (reference)", ru: "Автоматический диапазон (для справки)", kz: "Автоматты болжам диапазоны (анықтама үшін)", zh: "自动预估范围（仅供参考）", ja: "自動予想範囲（参考用）" },
  medianLabel: { ko: "중앙값", en: "Median", ru: "Медиана", kz: "Медиана", zh: "中位数", ja: "中央値" },
  aiAnalysisLabel: { ko: "AI 분석", en: "AI analysis", ru: "ИИ-анализ", kz: "AI талдауы", zh: "AI 分析", ja: "AI分析" },
  coordinatorNotes: { ko: "코디네이터 메모", en: "Coordinator notes", ru: "Заметки координатора", kz: "Координатор ескертпелері", zh: "协调员备注", ja: "コーディネーターのメモ" },
  issuedTitle: { ko: "✅ 정식 견적서 발급됨", en: "✅ Formal estimate issued", ru: "✅ Официальная смета выдана", kz: "✅ Ресми смета берілді", zh: "✅ 正式费用预估已出具", ja: "✅ 正式見積もりが発行されました" },
  totalPrefix: { ko: "총", en: "Total", ru: "Итого", kz: "Барлығы", zh: "总计", ja: "合計" },
  approxPrefix: { ko: "약", en: "approx.", ru: "около", kz: "шамамен", zh: "约", ja: "約" },
  downloadPdf: { ko: "견적서 PDF 다운로드", en: "Download estimate PDF", ru: "Скачать смету (PDF)", kz: "Сметаны жүктеу (PDF)", zh: "下载预估 PDF", ja: "見積もりPDFをダウンロード" },
  acceptBtn: { ko: "동의하기", en: "Accept", ru: "Принять", kz: "Қабылдау", zh: "同意", ja: "同意する" },
  rejectBtn: { ko: "거절", en: "Reject", ru: "Отклонить", kz: "Бас тарту", zh: "拒绝", ja: "却下する" },
  auditNotice: { ko: "※ 동의 시각과 IP 가 감사 목적으로 기록됩니다 (의료해외진출법 §15)", en: "※ Acceptance time and IP are recorded for audit purposes (Medical Overseas Expansion Act §15)", ru: "※ Время согласия и IP-адрес фиксируются для целей аудита (Закон о зарубежном медицинском развитии §15)", kz: "※ Келісім уақыты мен IP аудит мақсатында тіркеледі (Медициналық шетелдік даму туралы заң §15)", zh: "※ 同意时间与IP将出于审计目的记录（医疗海外拓展法 §15）", ja: "※ 同意時刻とIPは監査目的で記録されます（医療海外進出法 §15）" },
  acceptedSuffix: { ko: "동의 완료", en: "accepted", ru: "согласие получено", kz: "келісім берілді", zh: "已同意", ja: "同意完了" },
  itemDetailTitle: { ko: "항목별 상세", en: "Itemized details", ru: "Детализация по позициям", kz: "Тармақ бойынша егжей-тегжей", zh: "分项明细", ja: "項目別明細" },
  thItem: { ko: "항목", en: "Item", ru: "Позиция", kz: "Тармақ", zh: "项目", ja: "項目" },
  thNote: { ko: "비고", en: "Note", ru: "Примечание", kz: "Ескертпе", zh: "备注", ja: "備考" },
  disclaimer: { ko: "⚠️ 자동 범위는 통계 기반 참고치이며, 실제 비용은 발급된 정식 견적서를 기준으로 합니다. 의료해외진출법 §15 에 따라 진료 계약 전 견적서 수령과 확인이 법적으로 요구됩니다.", en: "⚠️ The auto range is a statistical reference; actual costs are based on the issued formal estimate. Under the Medical Overseas Expansion Act §15, receiving and confirming an estimate before a treatment contract is legally required.", ru: "⚠️ Автоматический диапазон — это статистический ориентир; фактическая стоимость определяется выданной официальной сметой. Согласно Закону о зарубежном медицинском развитии §15, получение и подтверждение сметы до заключения договора на лечение обязательно по закону.", kz: "⚠️ Автоматты диапазон — статистикалық анықтама; нақты шығындар берілген ресми сметаға негізделеді. Медициналық шетелдік даму туралы заң §15 бойынша емдеу шартына дейін сметаны алу және растау заңмен талап етіледі.", zh: "⚠️ 自动范围为基于统计的参考值，实际费用以出具的正式预估为准。根据医疗海外拓展法 §15，在诊疗合同签订前领取并确认预估为法律要求。", ja: "⚠️ 自動範囲は統計に基づく参考値であり、実際の費用は発行された正式見積もりに基づきます。医療海外進出法 §15 により、診療契約前の見積もり受領と確認が法的に義務付けられています。" },
  confirmAccept: { ko: "이 견적서에 동의하시겠습니까? 의료해외진출법 §15 에 따라 동의 시각과 IP 가 기록됩니다.", en: "Do you agree to this estimate? Under the Medical Overseas Expansion Act §15, the acceptance time and IP will be recorded.", ru: "Вы согласны с этой сметой? Согласно Закону о зарубежном медицинском развитии §15, время согласия и IP-адрес будут зафиксированы.", kz: "Осы сметамен келісесіз бе? Медициналық шетелдік даму туралы заң §15 бойынша келісім уақыты мен IP тіркеледі.", zh: "您是否同意此费用预估？根据医疗海外拓展法 §15，将记录同意时间与IP。", ja: "この見積もりに同意しますか？医療海外進出法 §15 により、同意時刻とIPが記録されます。" },
  confirmReject: { ko: "이 견적서를 거절하시겠습니까?", en: "Do you want to reject this estimate?", ru: "Вы хотите отклонить эту смету?", kz: "Осы сметадан бас тартқыңыз келе ме?", zh: "您要拒绝此费用预估吗？", ja: "この見積もりを却下しますか？" },
};

export default function CostEstimateDetailClient({ estimateId }) {
  const langCode = useLang();
  const lang = langCode;
  const l = (o) => o?.[lang] || o?.en || "";
  const failMsg = FAIL_MSG[langCode] || FAIL_MSG.en;
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
      // 원시 err.message 노출 금지
      console.error("[patient/cost-estimate]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!confirm(l(LABELS.confirmAccept))) return;
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
    } catch (_err) {
      alert(failMsg);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!confirm(l(LABELS.confirmReject))) return;
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
    } catch (_err) {
      alert(failMsg);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">{l(LABELS.loading)}</p>
      </div>
    );
  }
  if (error || !estimate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">{failMsg}</p>
        <Link href="/patient/cost-estimates" className="text-sm underline mt-4 inline-block">{l(LABELS.backToList)}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/patient/cost-estimates"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        {l(LABELS.backToEstimates)}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {estimate.quotation_no || l(LABELS.formalRequestTitle)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {l(LABELS.statusLabel)}: {l(STATUS_LABELS[estimate.status]) || estimate.status} ·{" "}
            {new Date(estimate.created_at).toLocaleString("ko-KR")} {l(LABELS.createdSuffix)}
          </p>
        </div>
      </div>

      {/* 자동 범위 */}
      {estimate.auto_min_krw && (
        <section className="mt-6 border border-gray-200 rounded-lg p-5 bg-white">
          <h2 className="text-sm font-medium text-gray-700">자동 예상 범위 (참고용)</h2>
          <p className="mt-2 text-lg">
            {fmtKRW(estimate.auto_min_krw)} ~ {fmtKRW(estimate.auto_max_krw)}
          </p>
          {estimate.auto_median_krw && (
            <p className="text-xs text-gray-500 mt-1">
              중앙값: {fmtKRW(estimate.auto_median_krw)}
            </p>
          )}
          {estimate.ai_personalization && (
            <p className="text-xs text-blue-700 mt-2 italic">
              AI 분석: {estimate.ai_personalization}
            </p>
          )}
        </section>
      )}

      {/* 코디 메모 */}
      {estimate.coordinator_notes && (
        <section className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">코디네이터 메모</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {estimate.coordinator_notes}
          </p>
        </section>
      )}

      {/* 정식 견적서 */}
      {estimate.status === "issued" && (
        <section className="mt-6 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="font-medium text-emerald-900">✅ 정식 견적서 발급됨</h2>
          <p className="text-sm text-emerald-800 mt-1">
            총 {fmtKRW(estimate.total_krw)}{" "}
            {estimate.total_usd ? `(약 ${fmtUSD(estimate.total_usd)})` : ""}
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
            >
              견적서 PDF 다운로드
            </a>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAccept}
              disabled={acting}
              className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              동의하기
            </button>
            <button
              onClick={handleReject}
              disabled={acting}
              className="border border-gray-300 px-4 py-2 rounded text-sm hover:border-black"
            >
              거절
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ※ 동의 시각과 IP 가 감사 목적으로 기록됩니다 (의료해외진출법 §15)
          </p>
        </section>
      )}

      {estimate.status === "accepted" && (
        <section className="mt-6 border border-green-200 bg-green-50 rounded-lg p-5">
          <p className="text-sm text-green-900">
            ✓ {new Date(estimate.patient_accepted_at).toLocaleString("ko-KR")} 동의 완료
          </p>
        </section>
      )}

      {/* 견적 항목 */}
      {estimate.quotation_items && estimate.quotation_items.length > 0 && (
        <section className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
          <h2 className="px-4 py-3 font-medium text-sm bg-gray-50 border-b border-gray-200">
            항목별 상세
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">항목</th>
                <th className="px-4 py-2 text-left">비고</th>
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
        ⚠️ 자동 범위는 통계 기반 참고치이며, 실제 비용은 발급된 정식 견적서를 기준으로 합니다.
        의료해외진출법 §15 에 따라 진료 계약 전 견적서 수령과 확인이 법적으로 요구됩니다.
      </p>
    </div>
  );
}
