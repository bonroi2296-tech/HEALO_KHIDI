"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

const STATUS_LABELS = {
  draft: {
    en: "Draft", ko: "작성 중", ru: "Черновик", kz: "Жоба", zh: "草稿", ja: "下書き",
    color: "bg-gray-100 text-gray-700",
  },
  documents_pending: {
    en: "Documents pending", ko: "서류 준비", ru: "Подготовка документов", kz: "Құжаттар дайындалуда", zh: "文件准备中", ja: "書類準備中",
    color: "bg-amber-100 text-amber-800",
  },
  under_review: {
    en: "Under review", ko: "코디 검수 중", ru: "На проверке координатора", kz: "Координатор тексеруде", zh: "协调员审核中", ja: "コーディネーター確認中",
    color: "bg-blue-100 text-blue-800",
  },
  changes_requested: {
    en: "Changes requested", ko: "수정 필요", ru: "Требуются изменения", kz: "Түзету қажет", zh: "需要修改", ja: "修正が必要",
    color: "bg-orange-100 text-orange-800",
  },
  invitation_ready: {
    en: "Invitation ready", ko: "초청장 발급 준비", ru: "Приглашение готовится", kz: "Шақыру дайын", zh: "邀请函准备就绪", ja: "招待状の準備完了",
    color: "bg-indigo-100 text-indigo-800",
  },
  invitation_issued: {
    en: "Invitation issued", ko: "초청장 발급 완료", ru: "Приглашение выдано", kz: "Шақыру берілді", zh: "邀请函已发放", ja: "招待状の発行完了",
    color: "bg-emerald-100 text-emerald-800",
  },
  submitted_embassy: {
    en: "Submitted to embassy", ko: "대사관 접수", ru: "Подано в посольство", kz: "Елшілікке тапсырылды", zh: "已提交至大使馆", ja: "大使館へ提出済み",
    color: "bg-teal-100 text-teal-800",
  },
  approved: {
    en: "Approved", ko: "비자 승인", ru: "Виза одобрена", kz: "Виза мақұлданды", zh: "签证已批准", ja: "ビザ承認",
    color: "bg-green-100 text-green-800",
  },
  rejected: {
    en: "Rejected", ko: "거절", ru: "Отклонено", kz: "Бас тартылды", zh: "已拒绝", ja: "却下",
    color: "bg-red-100 text-red-800",
  },
  cancelled: {
    en: "Cancelled", ko: "취소", ru: "Отменено", kz: "Бас тартылды", zh: "已取消", ja: "キャンセル済み",
    color: "bg-gray-100 text-gray-500",
  },
};

const VISA_TYPES = {
  en: [
    { value: "C-3-3", label: "C-3-3 (short-term medical, up to 90 days)" },
    { value: "G-1-10", label: "G-1-10 (long-term treatment, 91+ days)" },
  ],
  ko: [
    { value: "C-3-3", label: "C-3-3 (단기 의료 90일 이내)" },
    { value: "G-1-10", label: "G-1-10 (장기 치료 91일 이상)" },
  ],
  ru: [
    { value: "C-3-3", label: "C-3-3 (краткосрочное лечение, до 90 дней)" },
    { value: "G-1-10", label: "G-1-10 (длительное лечение, от 91 дня)" },
  ],
  kz: [
    { value: "C-3-3", label: "C-3-3 (қысқа мерзімді емдеу, 90 күнге дейін)" },
    { value: "G-1-10", label: "G-1-10 (ұзақ мерзімді емдеу, 91 күннен астам)" },
  ],
  zh: [
    { value: "C-3-3", label: "C-3-3（短期医疗，90天以内）" },
    { value: "G-1-10", label: "G-1-10（长期治疗，91天以上）" },
  ],
  ja: [
    { value: "C-3-3", label: "C-3-3（短期医療、90日以内）" },
    { value: "G-1-10", label: "G-1-10（長期治療、91日以上）" },
  ],
};

const NATIONALITIES = {
  en: [
    { value: "KZ", label: "Kazakhstan" },
    { value: "RU", label: "Russia" },
    { value: "UZ", label: "Uzbekistan" },
    { value: "MN", label: "Mongolia" },
    { value: "CN", label: "China" },
    { value: "OTHER", label: "Other" },
  ],
  ko: [
    { value: "KZ", label: "카자흐스탄 (Kazakhstan)" },
    { value: "RU", label: "러시아 (Russia)" },
    { value: "UZ", label: "우즈베키스탄 (Uzbekistan)" },
    { value: "MN", label: "몽골 (Mongolia)" },
    { value: "CN", label: "중국 (China)" },
    { value: "OTHER", label: "기타" },
  ],
  ru: [
    { value: "KZ", label: "Казахстан" },
    { value: "RU", label: "Россия" },
    { value: "UZ", label: "Узбекистан" },
    { value: "MN", label: "Монголия" },
    { value: "CN", label: "Китай" },
    { value: "OTHER", label: "Другое" },
  ],
  kz: [
    { value: "KZ", label: "Қазақстан" },
    { value: "RU", label: "Ресей" },
    { value: "UZ", label: "Өзбекстан" },
    { value: "MN", label: "Моңғолия" },
    { value: "CN", label: "Қытай" },
    { value: "OTHER", label: "Басқа" },
  ],
  zh: [
    { value: "KZ", label: "哈萨克斯坦" },
    { value: "RU", label: "俄罗斯" },
    { value: "UZ", label: "乌兹别克斯坦" },
    { value: "MN", label: "蒙古" },
    { value: "CN", label: "中国" },
    { value: "OTHER", label: "其他" },
  ],
  ja: [
    { value: "KZ", label: "カザフスタン" },
    { value: "RU", label: "ロシア" },
    { value: "UZ", label: "ウズベキスタン" },
    { value: "MN", label: "モンゴル" },
    { value: "CN", label: "中国" },
    { value: "OTHER", label: "その他" },
  ],
};

const COPY = {
  en: {
    title: "Visa application support",
    subtitle: "A healwith coordinator helps you from the invitation letter to the embassy submission.",
    visaGuide: "Visa types guide",
    startApplication: "+ Start application",
    cancel: "Cancel",
    newApplication: "New visa application",
    visaType: "Visa type",
    nationality: "Nationality",
    purpose: "Purpose of visit (diagnosis, etc.)",
    purposePlaceholder: "e.g., Stomach cancer surgery and chemotherapy",
    durationDays: "Planned length of stay (days)",
    arrivalDate: "Expected arrival date",
    departureDate: "Expected departure date",
    submitApplication: "Create application",
    submitting: "Creating…",
    createFailed: "Failed to create application: ",
    loading: "Loading…",
    errorPrefix: "Error: ",
    emptyTitle: "No visa applications in progress.",
    startFirst: "Start your first application",
    purposeFallback: "Purpose not provided",
    nationalityLabel: "Nationality",
    stayLabel: "Stay",
    daysSuffix: " days",
    createdLabel: "Created",
  },
  ko: {
    title: "비자 발급 지원",
    subtitle: "healwith 코디네이터가 초청장 발급부터 대사관 제출까지 돕습니다.",
    visaGuide: "비자 종류 안내",
    startApplication: "+ 신청 시작",
    cancel: "취소",
    newApplication: "새 비자 신청",
    visaType: "비자 유형",
    nationality: "국적",
    purpose: "방문 목적 (진단명 등)",
    purposePlaceholder: "예: 위암 수술 및 항암 치료",
    durationDays: "체류 예정 일수",
    arrivalDate: "예상 입국일",
    departureDate: "예상 출국일",
    submitApplication: "신청 생성",
    submitting: "생성 중...",
    createFailed: "신청 생성 실패: ",
    loading: "불러오는 중...",
    errorPrefix: "오류: ",
    emptyTitle: "진행 중인 비자 신청이 없습니다.",
    startFirst: "첫 신청 시작하기",
    purposeFallback: "목적 미작성",
    nationalityLabel: "국적",
    stayLabel: "체류",
    daysSuffix: "일",
    createdLabel: "생성",
  },
  ru: {
    title: "Помощь с оформлением визы",
    subtitle: "Координатор healwith поможет вам от приглашения до подачи в посольство.",
    visaGuide: "О типах виз",
    startApplication: "+ Подать заявление",
    cancel: "Отменить",
    newApplication: "Новое заявление на визу",
    visaType: "Тип визы",
    nationality: "Гражданство",
    purpose: "Цель визита (диагноз и т. п.)",
    purposePlaceholder: "напр.: Операция при раке желудка и химиотерапия",
    durationDays: "Планируемый срок пребывания (дней)",
    arrivalDate: "Предполагаемая дата въезда",
    departureDate: "Предполагаемая дата выезда",
    submitApplication: "Создать заявление",
    submitting: "Создание…",
    createFailed: "Не удалось создать заявление: ",
    loading: "Загрузка…",
    errorPrefix: "Ошибка: ",
    emptyTitle: "Нет активных заявлений на визу.",
    startFirst: "Подать первое заявление",
    purposeFallback: "Цель не указана",
    nationalityLabel: "Гражданство",
    stayLabel: "Пребывание",
    daysSuffix: " дн.",
    createdLabel: "Создано",
  },
  kz: {
    title: "Виза рәсімдеуге көмек",
    subtitle: "healwith координаторы шақырудан елшілікке тапсыруға дейін көмектеседі.",
    visaGuide: "Виза түрлері туралы",
    startApplication: "+ Өтінім беру",
    cancel: "Бас тарту",
    newApplication: "Жаңа виза өтінімі",
    visaType: "Виза түрі",
    nationality: "Азаматтық",
    purpose: "Сапар мақсаты (диагноз, т.б.)",
    purposePlaceholder: "мыс.: Асқазан обырын ота жасау және химиотерапия",
    durationDays: "Жоспарланған болу мерзімі (күн)",
    arrivalDate: "Болжамды келу күні",
    departureDate: "Болжамды кету күні",
    submitApplication: "Өтінім жасау",
    submitting: "Жасалуда…",
    createFailed: "Өтінім жасау сәтсіз аяқталды: ",
    loading: "Жүктелуде…",
    errorPrefix: "Қате: ",
    emptyTitle: "Қарастырылып жатқан виза өтінімі жоқ.",
    startFirst: "Алғашқы өтінімді бастау",
    purposeFallback: "Мақсаты көрсетілмеген",
    nationalityLabel: "Азаматтық",
    stayLabel: "Болу",
    daysSuffix: " күн",
    createdLabel: "Жасалды",
  },
  zh: {
    title: "签证办理协助",
    subtitle: "healwith 协调员将从邀请函发放到大使馆提交全程协助您。",
    visaGuide: "签证类型说明",
    startApplication: "+ 开始申请",
    cancel: "取消",
    newApplication: "新建签证申请",
    visaType: "签证类型",
    nationality: "国籍",
    purpose: "访问目的（诊断名称等）",
    purposePlaceholder: "例如：胃癌手术及化疗",
    durationDays: "计划停留天数",
    arrivalDate: "预计入境日期",
    departureDate: "预计出境日期",
    submitApplication: "创建申请",
    submitting: "创建中…",
    createFailed: "创建申请失败：",
    loading: "加载中…",
    errorPrefix: "错误：",
    emptyTitle: "暂无进行中的签证申请。",
    startFirst: "开始首次申请",
    purposeFallback: "未填写目的",
    nationalityLabel: "国籍",
    stayLabel: "停留",
    daysSuffix: " 天",
    createdLabel: "创建",
  },
  ja: {
    title: "ビザ申請サポート",
    subtitle: "healwith コーディネーターが招待状の発行から大使館への提出までサポートします。",
    visaGuide: "ビザの種類について",
    startApplication: "+ 申請を開始",
    cancel: "キャンセル",
    newApplication: "新しいビザ申請",
    visaType: "ビザの種類",
    nationality: "国籍",
    purpose: "訪問目的（診断名など）",
    purposePlaceholder: "例：胃がん手術および抗がん剤治療",
    durationDays: "滞在予定日数",
    arrivalDate: "入国予定日",
    departureDate: "出国予定日",
    submitApplication: "申請を作成",
    submitting: "作成中…",
    createFailed: "申請の作成に失敗しました: ",
    loading: "読み込み中…",
    errorPrefix: "エラー: ",
    emptyTitle: "進行中のビザ申請はありません。",
    startFirst: "最初の申請を開始",
    purposeFallback: "目的未記入",
    nationalityLabel: "国籍",
    stayLabel: "滞在",
    daysSuffix: "日",
    createdLabel: "作成",
  },
};

const DATE_LOCALES = {
  ko: "ko-KR", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP", en: "en-US",
};

export default function VisaApplicationsClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const visaTypes = VISA_TYPES[lang] || VISA_TYPES.en;
  const nationalities = NATIONALITIES[lang] || NATIONALITIES.en;
  const dateLocale = DATE_LOCALES[lang] || DATE_LOCALES.en;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    visa_type: "C-3-3",
    nationality: "KZ",
    purpose: "",
    duration_days: "",
    planned_arrival_date: "",
    planned_departure_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/khidi/visa/applications", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "failed");
      }
      setApplications(json.data || []);
    } catch (err) {
      console.error("[patient/visa/list]", err);
      // 원시 err.message 노출 금지 — 일반 실패 안내(보안+UX)
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.duration_days) delete payload.duration_days;
      if (!payload.planned_arrival_date) delete payload.planned_arrival_date;
      if (!payload.planned_departure_date) delete payload.planned_departure_date;

      const res = await fetch("/api/khidi/visa/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "failed");
      }
      setShowCreate(false);
      await loadApplications();
    } catch (_err) {
      alert(copy.createFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {copy.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/visa"
            className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
          >
            {copy.visaGuide}
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
          >
            {showCreate ? copy.cancel : copy.startApplication}
          </button>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="border border-gray-200 rounded-lg p-6 mb-8 bg-white shadow-sm"
        >
          <h2 className="font-medium mb-4">{copy.newApplication}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700">{copy.visaType}</span>
              <select
                value={form.visa_type}
                onChange={(e) => setForm({ ...form, visa_type: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {visaTypes.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">{copy.nationality}</span>
              <select
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {nationalities.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm text-gray-700">{copy.purpose}</span>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder={copy.purposePlaceholder}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">{copy.durationDays}</span>
              <input
                type="number"
                min="1"
                max="730"
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">{copy.arrivalDate}</span>
              <input
                type="date"
                value={form.planned_arrival_date}
                onChange={(e) =>
                  setForm({ ...form, planned_arrival_date: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">{copy.departureDate}</span>
              <input
                type="date"
                value={form.planned_departure_date}
                onChange={(e) =>
                  setForm({ ...form, planned_departure_date: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {copy.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? copy.submitting : copy.submitApplication}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-gray-500 text-sm">{copy.loading}</p>}
      {error && <p className="text-red-600 text-sm">{copy.errorPrefix}</p>}

      {!loading && applications.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">{copy.emptyTitle}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-sm underline underline-offset-4 text-gray-700"
          >
            {copy.startFirst}
          </button>
        </div>
      )}

      {applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => {
            const label = STATUS_LABELS[app.status] || STATUS_LABELS.draft;
            return (
              <Link
                key={app.id}
                href={`/patient/visa/applications/${app.id}`}
                className="block border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{app.visa_type}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${label.color}`}
                      >
                        {label[lang] || label.en}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {app.purpose || copy.purposeFallback}
                    </p>
                    <div className="text-xs text-gray-400 mt-2 flex gap-4">
                      <span>{copy.nationalityLabel}: {app.nationality}</span>
                      {app.duration_days && (
                        <span>{copy.stayLabel}: {app.duration_days}{copy.daysSuffix}</span>
                      )}
                      <span>{copy.createdLabel}: {new Date(app.created_at).toLocaleDateString(dateLocale)}</span>
                    </div>
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
