"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

const STATUS_CLS = {
  auto_range: "bg-gray-100 text-gray-700",
  formal_requested: "bg-amber-100 text-amber-800",
  hospital_pending: "bg-blue-100 text-blue-800",
  draft: "bg-indigo-100 text-indigo-800",
  issued: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
};

const LOCALE = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };

// 페이지-로컬 6개어 카피(중앙 사전 미수정). 핵심시장 ru·kz 포함 필수.
const COPY = {
  ko: {
    title: "내 예상 진료비 견적",
    subtitle: "코디네이터가 병원에 문의 후 정식 견적서를 발급합니다. 법적 효력은 발급된 견적서에만 있습니다.",
    loading: "불러오는 중...", errorMsg: "견적을 불러오지 못했습니다.",
    emptyMsg: "진행 중인 견적 요청이 없습니다.", emptyCta: "챗봇으로 예상비용 먼저 확인하기",
    defaultQuotation: "견적 요청", totalPrefix: "총", autoRangePrefix: "자동 범위",
    noRange: "범위 미산출", createdPrefix: "생성",
    status: { auto_range: "자동 범위", formal_requested: "정식 요청", hospital_pending: "병원 응답 대기", draft: "코디 작성 중", issued: "견적서 발급", accepted: "동의 완료", rejected: "거절", expired: "만료" },
  },
  en: {
    title: "My estimated cost quotes",
    subtitle: "A coordinator issues a formal quote after contacting the hospital. Only an issued quote is legally binding.",
    loading: "Loading...", errorMsg: "Couldn't load your quotes.",
    emptyMsg: "No quote requests in progress.", emptyCta: "Check estimated costs with the chatbot first",
    defaultQuotation: "Quote request", totalPrefix: "Total", autoRangePrefix: "Auto range",
    noRange: "Range not calculated", createdPrefix: "Created",
    status: { auto_range: "Auto range", formal_requested: "Formal request", hospital_pending: "Awaiting hospital", draft: "Coordinator drafting", issued: "Quote issued", accepted: "Accepted", rejected: "Rejected", expired: "Expired" },
  },
  ru: {
    title: "Мои предварительные сметы лечения",
    subtitle: "Координатор оформляет официальную смету после обращения в больницу. Юридическую силу имеет только выданная смета.",
    loading: "Загрузка...", errorMsg: "Не удалось загрузить сметы.",
    emptyMsg: "Нет активных запросов на смету.", emptyCta: "Сначала узнайте примерную стоимость через чат-бот",
    defaultQuotation: "Запрос сметы", totalPrefix: "Итого", autoRangePrefix: "Авто-диапазон",
    noRange: "Диапазон не рассчитан", createdPrefix: "Создано",
    status: { auto_range: "Авто-диапазон", formal_requested: "Официальный запрос", hospital_pending: "Ожидание больницы", draft: "Координатор готовит", issued: "Смета выдана", accepted: "Принято", rejected: "Отклонено", expired: "Истекло" },
  },
  kz: {
    title: "Емделу құнының болжамды бағалары",
    subtitle: "Үйлестіруші ауруханаға хабарласқаннан кейін ресми смета береді. Заңды күші тек берілген сметада ғана.",
    loading: "Жүктелуде...", errorMsg: "Сметаларды жүктеу мүмкін болмады.",
    emptyMsg: "Жүргізіліп жатқан смета сұраулары жоқ.", emptyCta: "Алдымен чат-бот арқылы болжамды құнды біліңіз",
    defaultQuotation: "Смета сұрауы", totalPrefix: "Барлығы", autoRangePrefix: "Авто ауқым",
    noRange: "Ауқым есептелмеген", createdPrefix: "Жасалды",
    status: { auto_range: "Авто ауқым", formal_requested: "Ресми сұрау", hospital_pending: "Аурухана жауабын күту", draft: "Үйлестіруші дайындауда", issued: "Смета берілді", accepted: "Келісілді", rejected: "Қабылданбады", expired: "Мерзімі бітті" },
  },
  zh: {
    title: "我的预估诊疗费用报价",
    subtitle: "协调员联系医院后出具正式报价单。仅已出具的报价单具有法律效力。",
    loading: "加载中...", errorMsg: "无法加载报价。",
    emptyMsg: "暂无进行中的报价请求。", emptyCta: "先用聊天机器人查询预估费用",
    defaultQuotation: "报价请求", totalPrefix: "合计", autoRangePrefix: "自动范围",
    noRange: "未计算范围", createdPrefix: "创建",
    status: { auto_range: "自动范围", formal_requested: "正式请求", hospital_pending: "等待医院", draft: "协调员编写中", issued: "已出具报价", accepted: "已同意", rejected: "已拒绝", expired: "已过期" },
  },
  ja: {
    title: "私の概算治療費見積もり",
    subtitle: "コーディネーターが病院に確認後、正式な見積書を発行します。法的効力は発行された見積書にのみあります。",
    loading: "読み込み中...", errorMsg: "見積もりを読み込めませんでした。",
    emptyMsg: "進行中の見積もり依頼はありません。", emptyCta: "まずチャットボットで概算費用を確認する",
    defaultQuotation: "見積もり依頼", totalPrefix: "合計", autoRangePrefix: "自動レンジ",
    noRange: "レンジ未算出", createdPrefix: "作成",
    status: { auto_range: "自動レンジ", formal_requested: "正式依頼", hospital_pending: "病院の回答待ち", draft: "コーディネーター作成中", issued: "見積書発行", accepted: "同意完了", rejected: "却下", expired: "期限切れ" },
  },
};

export default function CostEstimatesListClient() {
  const langCode = useLang();
  const c = COPY[langCode] || COPY.en;
  const locale = LOCALE[langCode] || "en-US";
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/khidi/cost-estimates", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "failed");
      setEstimates(json.data || []);
    } catch (err) {
      // 원시 에러메시지 노출 금지 — 번역된 일반 안내만
      console.error("[patient/cost-estimates]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
      <p className="text-gray-500 mt-2 text-sm">
        {c.subtitle}
      </p>

      {loading && <p className="mt-8 text-sm text-gray-500">{c.loading}</p>}
      {error && <p className="mt-8 text-sm text-red-600">{c.errorMsg}</p>}

      {!loading && estimates.length === 0 && (
        <div className="mt-8 text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">{c.emptyMsg}</p>
          <Link
            href="/patient/chat"
            className="mt-4 inline-block text-sm underline underline-offset-4"
          >
            {c.emptyCta}
          </Link>
        </div>
      )}

      {estimates.length > 0 && (
        <div className="mt-8 space-y-3">
          {estimates.map((est) => {
            const stKey = c.status[est.status] ? est.status : "auto_range";
            return (
              <Link
                key={est.id}
                href={`/patient/cost-estimates/${est.id}`}
                className="block border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {est.quotation_no || c.defaultQuotation}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${STATUS_CLS[stKey]}`}
                      >
                        {c.status[stKey]}
                      </span>
                    </div>
                    {est.total_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {c.totalPrefix} {Number(est.total_krw).toLocaleString(locale)} KRW
                        {est.total_usd
                          ? ` · $${Number(est.total_usd).toLocaleString("en-US")}`
                          : ""}
                      </p>
                    ) : est.auto_min_krw ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {c.autoRangePrefix}: {Number(est.auto_min_krw).toLocaleString(locale)} ~{" "}
                        {Number(est.auto_max_krw).toLocaleString(locale)} KRW
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">{c.noRange}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {c.createdPrefix} {new Date(est.created_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
