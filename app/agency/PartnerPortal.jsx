"use client";

/**
 * 에이전시 포털 — 의뢰한 환자들의 진행 상황을 확인.
 * 카자흐 현지 에이전시 요구: 병원 응답이 느려도 "지금 어느 단계인지" 가시화.
 * 다국어: 활성 6개 언어(ko·en·ru·kz·zh·ja). 상단바 언어 스위처로 전환(포털 공통).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { caseStatusLabelL } from "@/lib/khidi/caseStatus";

const supabase = createSupabaseBrowserClient();

const EMPTY_FORM = {
  firstName: "", lastName: "", nationality: "", treatmentType: "",
  contactMethod: "whatsapp", contactId: "", email: "", message: "",
};

// 포털 정적 UI 문구 — 6개 언어. (환자가 입력한 자유 텍스트·국적·암종은 번역 대상 아님)
const TR = {
  en: {
    loading: "Loading…", loginRequired: "Please sign in.", loginLink: "Sign in",
    forbidden: "This account has no partner portal access. Please contact the administrator.",
    kindAgency: "Overseas agency", kindClinic: "Overseas medical institution",
    titleSuffix: "· Patient progress",
    subtitle: "Current stage of the patients you referred. Tap a stage to see its detailed history.",
    btnRefer: "+ Refer a patient", btnClose: "Close",
    errCancerReq: "Please enter the cancer / treatment type.",
    errContactReq: "Either an email or a messenger contact is required.",
    okSubmitted: "Referral received. It will be added to the list below.",
    errMissingContact: "Please enter an email or a messenger contact.",
    errInvalidEmail: "The email format is invalid.",
    errUnauthorized: "Not authorized. Please sign in again.",
    errSubmitFail: "Submission failed. Please try again.", errServer: "Connection failed.",
    formHeading: "New patient referral",
    formDesc: "Once referred, it goes straight to our coordinators and you can track its progress in the list below.",
    phFirst: "First name", phLast: "Last name", phNationality: "Nationality (e.g. Kazakhstan)",
    phCancer: "Cancer / treatment type (required)",
    contactLabel: "Contact (email or messenger — at least one required)",
    phEmail: "Email (optional)", phContactId: "Messenger ID / number (optional)", phMemo: "Note (symptoms / diagnosis summary, optional)", optPhone: "Phone",
    btnCancel: "Cancel", btnSubmit: "Submit referral", btnSubmitting: "Submitting…",
    emptyList: "No patients to show yet.", timelineEmpty: "No progress history recorded yet.",
    insuranceLabel: "Insurance:", updatedLabel: "Updated",
  },
  ko: {
    loading: "불러오는 중…", loginRequired: "로그인이 필요합니다.", loginLink: "로그인",
    forbidden: "파트너 포털 권한이 없는 계정입니다. 관리자에게 문의하세요.",
    kindAgency: "해외 에이전시", kindClinic: "해외 의료기관",
    titleSuffix: "· 환자 진행 현황",
    subtitle: "의뢰하신 환자들의 현재 진행 단계입니다. 단계를 누르면 상세 이력이 보입니다.",
    btnRefer: "+ 환자 의뢰하기", btnClose: "닫기",
    errCancerReq: "암종/치료 종류를 입력하세요.",
    errContactReq: "이메일 또는 메신저 연락처 중 하나는 필수입니다.",
    okSubmitted: "의뢰가 접수되었습니다. 목록에 추가됩니다.",
    errMissingContact: "이메일 또는 메신저 연락처를 입력하세요.",
    errInvalidEmail: "이메일 형식이 올바르지 않습니다.",
    errUnauthorized: "권한이 없습니다. 다시 로그인해 주세요.",
    errSubmitFail: "접수 실패. 다시 시도해 주세요.", errServer: "서버 연결 실패.",
    formHeading: "환자 의뢰 접수",
    formDesc: "의뢰하면 우리 팀(코디네이터)에게 바로 전달되고, 아래 목록에서 진행 단계를 추적할 수 있습니다.",
    phFirst: "환자 이름(First name)", phLast: "환자 성(Last name)", phNationality: "국적 (예: Kazakhstan)",
    phCancer: "암종/치료 종류 (필수)",
    contactLabel: "연락처 (이메일 또는 메신저 중 하나 필수)",
    phEmail: "이메일 (선택)", phContactId: "메신저 아이디/번호 (선택)", phMemo: "메모 (증상·진단 요약 등, 선택)", optPhone: "전화",
    btnCancel: "취소", btnSubmit: "의뢰 접수", btnSubmitting: "접수 중…",
    emptyList: "표시할 환자가 없습니다.", timelineEmpty: "아직 기록된 진행 이력이 없습니다.",
    insuranceLabel: "보험:", updatedLabel: "업데이트",
  },
  ru: {
    loading: "Загрузка…", loginRequired: "Пожалуйста, войдите.", loginLink: "Войти",
    forbidden: "У этого аккаунта нет доступа к партнёрскому порталу. Обратитесь к администратору.",
    kindAgency: "Зарубежное агентство", kindClinic: "Зарубежное медучреждение",
    titleSuffix: "· Ход пациентов",
    subtitle: "Текущий этап пациентов, которых вы направили. Нажмите на этап, чтобы увидеть подробную историю.",
    btnRefer: "+ Направить пациента", btnClose: "Закрыть",
    errCancerReq: "Укажите тип рака / лечения.",
    errContactReq: "Требуется email или контакт в мессенджере.",
    okSubmitted: "Заявка принята. Она появится в списке ниже.",
    errMissingContact: "Укажите email или контакт в мессенджере.",
    errInvalidEmail: "Неверный формат email.",
    errUnauthorized: "Нет доступа. Войдите снова.",
    errSubmitFail: "Не удалось отправить. Попробуйте ещё раз.", errServer: "Ошибка соединения.",
    formHeading: "Новое направление пациента",
    formDesc: "После направления оно сразу поступает нашим координаторам, а его статус можно отслеживать в списке ниже.",
    phFirst: "Имя", phLast: "Фамилия", phNationality: "Гражданство (напр. Kazakhstan)",
    phCancer: "Тип рака / лечения (обязательно)",
    contactLabel: "Контакт (email или мессенджер — хотя бы один)",
    phEmail: "Email (необязательно)", phContactId: "ID / номер в мессенджере (необязательно)", phMemo: "Заметка (симптомы / краткий диагноз, необязательно)", optPhone: "Телефон",
    btnCancel: "Отмена", btnSubmit: "Отправить", btnSubmitting: "Отправка…",
    emptyList: "Пока нет пациентов для показа.", timelineEmpty: "История этапов пока не записана.",
    insuranceLabel: "Страховка:", updatedLabel: "Обновлено",
  },
  kz: {
    loading: "Жүктелуде…", loginRequired: "Жүйеге кіріңіз.", loginLink: "Кіру",
    forbidden: "Бұл аккаунтта серіктес порталына рұқсат жоқ. Әкімшіге хабарласыңыз.",
    kindAgency: "Шетелдік агенттік", kindClinic: "Шетелдік медициналық мекеме",
    titleSuffix: "· Науқастардың барысы",
    subtitle: "Сіз жолдаған науқастардың ағымдағы кезеңі. Толық тарихты көру үшін кезеңді басыңыз.",
    btnRefer: "+ Науқас жолдау", btnClose: "Жабу",
    errCancerReq: "Қатерлі ісік / емдеу түрін енгізіңіз.",
    errContactReq: "Email немесе мессенджер байланысының бірі қажет.",
    okSubmitted: "Өтінім қабылданды. Төмендегі тізімге қосылады.",
    errMissingContact: "Email немесе мессенджер байланысын енгізіңіз.",
    errInvalidEmail: "Email пішімі дұрыс емес.",
    errUnauthorized: "Рұқсат жоқ. Қайта кіріңіз.",
    errSubmitFail: "Жіберілмеді. Қайталап көріңіз.", errServer: "Байланыс қатесі.",
    formHeading: "Жаңа науқас жолдамасы",
    formDesc: "Жолдағаннан кейін ол бірден біздің үйлестірушілерге түседі, барысын төмендегі тізімнен қадағалай аласыз.",
    phFirst: "Аты", phLast: "Тегі", phNationality: "Азаматтығы (мыс. Kazakhstan)",
    phCancer: "Қатерлі ісік / емдеу түрі (міндетті)",
    contactLabel: "Байланыс (email немесе мессенджер — кемінде біреуі)",
    phEmail: "Email (міндетті емес)", phContactId: "Мессенджер ID / нөмірі (міндетті емес)", phMemo: "Ескертпе (симптомдар / диагноз қысқаша, міндетті емес)", optPhone: "Телефон",
    btnCancel: "Болдырмау", btnSubmit: "Жолдау", btnSubmitting: "Жіберілуде…",
    emptyList: "Әзірге көрсететін науқас жоқ.", timelineEmpty: "Барыс тарихы әлі жазылмаған.",
    insuranceLabel: "Сақтандыру:", updatedLabel: "Жаңартылды",
  },
  zh: {
    loading: "加载中…", loginRequired: "请先登录。", loginLink: "登录",
    forbidden: "该账户没有合作伙伴门户权限。请联系管理员。",
    kindAgency: "海外代理机构", kindClinic: "海外医疗机构",
    titleSuffix: "· 患者进度",
    subtitle: "您转介患者的当前阶段。点击阶段可查看详细记录。",
    btnRefer: "+ 转介患者", btnClose: "关闭",
    errCancerReq: "请输入癌种 / 治疗类型。",
    errContactReq: "电子邮箱或即时通讯联系方式至少需要一项。",
    okSubmitted: "转介已受理，将添加到下方列表。",
    errMissingContact: "请输入电子邮箱或即时通讯联系方式。",
    errInvalidEmail: "电子邮箱格式不正确。",
    errUnauthorized: "无权限，请重新登录。",
    errSubmitFail: "提交失败，请重试。", errServer: "连接失败。",
    formHeading: "新患者转介",
    formDesc: "转介后将直接发送给我们的协调员，您可在下方列表追踪进度。",
    phFirst: "名字", phLast: "姓氏", phNationality: "国籍（如 Kazakhstan）",
    phCancer: "癌种 / 治疗类型（必填）",
    contactLabel: "联系方式（电子邮箱或即时通讯，至少一项）",
    phEmail: "电子邮箱（选填）", phContactId: "即时通讯 ID / 号码（选填）", phMemo: "备注（症状 / 诊断摘要，选填）", optPhone: "电话",
    btnCancel: "取消", btnSubmit: "提交转介", btnSubmitting: "提交中…",
    emptyList: "暂无可显示的患者。", timelineEmpty: "暂无进度记录。",
    insuranceLabel: "保险：", updatedLabel: "更新",
  },
  ja: {
    loading: "読み込み中…", loginRequired: "ログインしてください。", loginLink: "ログイン",
    forbidden: "このアカウントにはパートナーポータルの権限がありません。管理者にお問い合わせください。",
    kindAgency: "海外エージェンシー", kindClinic: "海外医療機関",
    titleSuffix: "· 患者の進捗",
    subtitle: "紹介された患者の現在の段階です。段階をタップすると詳細履歴が表示されます。",
    btnRefer: "+ 患者を紹介", btnClose: "閉じる",
    errCancerReq: "がん種 / 治療の種類を入力してください。",
    errContactReq: "メールまたはメッセンジャー連絡先のいずれかが必須です。",
    okSubmitted: "紹介を受け付けました。下のリストに追加されます。",
    errMissingContact: "メールまたはメッセンジャー連絡先を入力してください。",
    errInvalidEmail: "メールの形式が正しくありません。",
    errUnauthorized: "権限がありません。再度ログインしてください。",
    errSubmitFail: "受付に失敗しました。もう一度お試しください。", errServer: "接続に失敗しました。",
    formHeading: "新規患者紹介",
    formDesc: "紹介するとすぐに当チーム（コーディネーター）へ届き、下のリストで進捗を追跡できます。",
    phFirst: "名 (First name)", phLast: "姓 (Last name)", phNationality: "国籍（例: Kazakhstan）",
    phCancer: "がん種 / 治療の種類（必須）",
    contactLabel: "連絡先（メールまたはメッセンジャーのいずれか必須）",
    phEmail: "メール（任意）", phContactId: "メッセンジャー ID / 番号（任意）", phMemo: "メモ（症状・診断の要約など、任意）", optPhone: "電話",
    btnCancel: "キャンセル", btnSubmit: "紹介を送信", btnSubmitting: "送信中…",
    emptyList: "表示する患者はまだありません。", timelineEmpty: "進捗履歴はまだ記録されていません。",
    insuranceLabel: "保険:", updatedLabel: "更新",
  },
};

// 경과 업로드(사후관리·해외 의료기관 전용) 문구 — 6개 언어. 위 TR 에 병합한다.
const TR_PROGRESS = {
  en: {
    progressTitle: "Progress records (follow-up)", progressUpload: "Upload progress",
    progressType_test_result: "Test result", progressType_imaging: "Medical image",
    progressType_clinical_note: "Clinical note", progressType_progress: "General progress",
    progressNotePh: "Findings / note (optional)", progressFile: "Choose file (PDF / image / DICOM, max 20MB)",
    progressSubmit: "Upload", progressSubmitting: "Uploading…", progressEmpty: "No progress uploaded yet.",
    progressErr: "Upload failed.", progressOk: "Progress uploaded.", progressView: "View", progressNoFile: "(note only)",
  },
  ko: {
    progressTitle: "경과 기록 (사후관리)", progressUpload: "경과 업로드",
    progressType_test_result: "검사결과", progressType_imaging: "영상정보",
    progressType_clinical_note: "임상소견", progressType_progress: "일반 경과",
    progressNotePh: "소견 / 메모 (선택)", progressFile: "파일 선택 (PDF / 이미지 / DICOM, 최대 20MB)",
    progressSubmit: "업로드", progressSubmitting: "업로드 중…", progressEmpty: "아직 업로드된 경과가 없습니다.",
    progressErr: "업로드 실패.", progressOk: "경과가 업로드되었습니다.", progressView: "보기", progressNoFile: "(메모만)",
  },
  ru: {
    progressTitle: "Записи о ходе (постлечение)", progressUpload: "Загрузить ход лечения",
    progressType_test_result: "Результат анализа", progressType_imaging: "Медицинский снимок",
    progressType_clinical_note: "Клиническая заметка", progressType_progress: "Общий ход",
    progressNotePh: "Заключение / заметка (необязательно)", progressFile: "Выбрать файл (PDF / изображение / DICOM, до 20МБ)",
    progressSubmit: "Загрузить", progressSubmitting: "Загрузка…", progressEmpty: "Записи о ходе ещё не загружены.",
    progressErr: "Не удалось загрузить.", progressOk: "Ход загружен.", progressView: "Открыть", progressNoFile: "(только заметка)",
  },
  kz: {
    progressTitle: "Барыс жазбалары (емнен кейінгі)", progressUpload: "Барысты жүктеу",
    progressType_test_result: "Талдау нәтижесі", progressType_imaging: "Медициналық сурет",
    progressType_clinical_note: "Клиникалық жазба", progressType_progress: "Жалпы барыс",
    progressNotePh: "Қорытынды / жазба (міндетті емес)", progressFile: "Файл таңдау (PDF / сурет / DICOM, 20МБ дейін)",
    progressSubmit: "Жүктеу", progressSubmitting: "Жүктелуде…", progressEmpty: "Барыс жазбалары әлі жүктелмеген.",
    progressErr: "Жүктеу сәтсіз.", progressOk: "Барыс жүктелді.", progressView: "Ашу", progressNoFile: "(тек жазба)",
  },
  zh: {
    progressTitle: "进展记录（术后随访）", progressUpload: "上传进展",
    progressType_test_result: "检查结果", progressType_imaging: "医学影像",
    progressType_clinical_note: "临床记录", progressType_progress: "总体进展",
    progressNotePh: "意见 / 备注（选填）", progressFile: "选择文件（PDF / 图片 / DICOM，最大 20MB）",
    progressSubmit: "上传", progressSubmitting: "上传中…", progressEmpty: "尚未上传进展记录。",
    progressErr: "上传失败。", progressOk: "进展已上传。", progressView: "查看", progressNoFile: "（仅备注）",
  },
  ja: {
    progressTitle: "経過記録（術後フォローアップ）", progressUpload: "経過をアップロード",
    progressType_test_result: "検査結果", progressType_imaging: "医療画像",
    progressType_clinical_note: "臨床所見", progressType_progress: "全体の経過",
    progressNotePh: "所見 / メモ（任意）", progressFile: "ファイルを選択（PDF / 画像 / DICOM、最大20MB）",
    progressSubmit: "アップロード", progressSubmitting: "アップロード中…", progressEmpty: "経過はまだアップロードされていません。",
    progressErr: "アップロードに失敗しました。", progressOk: "経過をアップロードしました。", progressView: "表示", progressNoFile: "（メモのみ）",
  },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_PROGRESS[l] || TR_PROGRESS.en);

// 해외 파트너 포털 본체. expected 로 이 URL이 어느 파트너 유형 전용인지 지정한다.
//  - /agency  → expected="agency"            (해외 에이전시)
//  - /clinic  → expected="medical_institution" (해외 의료기관, 경과 업로드 가능)
// 계정 partner_type 과 URL 이 안 맞으면 맞는 포털로 자동 이동(분리 보장).
export default function PartnerPortal({ expected = "agency" }) {
  const lang = useLang();
  const router = useRouter();
  const tt = (k) => (TR[lang] || TR.en)[k] || TR.en[k];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  // 환자 의뢰하기 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  const load = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { setError("login"); setLoading(false); return; }
      const res = await fetch("/api/agency/inquiries", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 403) { setError("forbidden"); setLoading(false); return; }
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "server"); setLoading(false); return; }
      setData(json); setError(null);
    } catch { setError("server"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // URL ↔ 계정 partner_type 불일치 시 올바른 포털로 이동 (에이전시/의료기관 분리 보장)
  const accountIsMedical = data?.agency?.partnerType === "medical_institution";
  const wantMedical = expected === "medical_institution";
  const portalMismatch = !!data?.agency && accountIsMedical !== wantMedical;
  useEffect(() => {
    if (portalMismatch) router.replace(accountIsMedical ? "/clinic" : "/agency");
  }, [portalMismatch, accountIsMedical, router]);

  const submitReferral = async (e) => {
    e.preventDefault();
    setSubmitMsg(null);
    if (!form.treatmentType.trim()) { setSubmitMsg({ type: "err", text: tt("errCancerReq") }); return; }
    if (!form.email.trim() && !form.contactId.trim()) {
      setSubmitMsg({ type: "err", text: tt("errContactReq") }); return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch("/api/agency/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setSubmitMsg({ type: "ok", text: tt("okSubmitted") });
        setForm(EMPTY_FORM);
        setShowForm(false);
        await load();
      } else {
        const map = {
          missing_contact: tt("errMissingContact"),
          invalid_email: tt("errInvalidEmail"),
          unauthorized: tt("errUnauthorized"),
        };
        setSubmitMsg({ type: "err", text: map[json.error] || tt("errSubmitFail") });
      }
    } catch {
      setSubmitMsg({ type: "err", text: tt("errServer") });
    } finally { setSubmitting(false); }
  };

  if (loading || portalMismatch) return <Center>{tt("loading")}</Center>;
  if (error === "login") return <Center>{tt("loginRequired")} <a className="text-teal-700 underline ml-1" href="/login">{tt("loginLink")}</a></Center>;
  if (error === "forbidden") return <Center>{tt("forbidden")}</Center>;
  if (error) return <Center className="text-red-500">{tt("errServer")}</Center>;

  const steps = data?.statusSteps?.filter((s) => s.order < 90) ?? [];
  const orderOf = (k) => data?.statusSteps?.find((s) => s.key === k)?.order ?? 0;
  const isClinic = wantMedical;
  const partnerKind = isClinic ? tt("kindClinic") : tt("kindAgency");

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 md:pt-24 pb-10">
      <div className="mb-6">
        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${isClinic ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}>{partnerKind}</span>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data?.agency?.name} {tt("titleSuffix")}</h1>
            <p className="text-sm text-gray-500 mt-1">{tt("subtitle")}</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setSubmitMsg(null); }}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition"
          >
            {showForm ? tt("btnClose") : tt("btnRefer")}
          </button>
        </div>
      </div>

      {submitMsg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${submitMsg.type === "ok" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {submitMsg.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={submitReferral} className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">{tt("formHeading")}</h2>
          <p className="text-xs text-gray-400 -mt-1">{tt("formDesc")}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={tt("phFirst")}
              value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={tt("phLast")}
              value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={tt("phNationality")}
              value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={tt("phCancer")}
              value={form.treatmentType} onChange={(e) => setForm({ ...form, treatmentType: e.target.value })} />
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">{tt("contactLabel")}</p>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder={tt("phEmail")}
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="flex gap-2">
              <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white shrink-0"
                value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="wechat">WeChat</option>
                <option value="line">LINE</option>
                <option value="phone">{tt("optPhone")}</option>
              </select>
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={tt("phContactId")}
                value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} />
            </div>
          </div>

          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder={tt("phMemo") || ""}
            value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setSubmitMsg(null); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">{tt("btnCancel")}</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">
              {submitting ? tt("btnSubmitting") : tt("btnSubmit")}
            </button>
          </div>
        </form>
      )}

      {(data?.cases ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">{tt("emptyList")}</p>
      ) : (
        <div className="space-y-3">
          {data.cases.map((c) => {
            const curOrder = orderOf(c.case_status);
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold text-gray-800">
                      {c.name} · {c.nationality} · {c.cancer_type}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${c.case_status ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                      {caseStatusLabelL(c.case_status, lang)}
                    </span>
                  </div>
                  {/* 단계 진행 바 */}
                  <div className="flex items-center gap-1">
                    {steps.map((s) => (
                      <div key={s.key} className="flex-1 h-1.5 rounded-full"
                        style={{ background: s.order <= curOrder ? "#14b8a6" : "#e5e7eb" }} title={caseStatusLabelL(s.key, lang)} />
                    ))}
                  </div>
                  {c.case_status_note && (
                    <p className="text-xs text-gray-500 mt-2">📌 {c.case_status_note}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {c.insurance_status && <span>{tt("insuranceLabel")} {c.insurance_status}</span>}
                    {c.case_status_updated_at && <span>{tt("updatedLabel")} {new Date(c.case_status_updated_at).toLocaleDateString()}</span>}
                  </div>
                </button>

                {openId === c.id && c.timeline.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {c.timeline.map((tl, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-gray-400 text-xs w-20 shrink-0">{new Date(tl.at).toLocaleDateString()}</span>
                        <span className="text-gray-700">
                          <b>{caseStatusLabelL(tl.status, lang)}</b>{tl.note ? ` — ${tl.note}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {openId === c.id && c.timeline.length === 0 && (
                  <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">{tt("timelineEmpty")}</p>
                )}

                {isClinic && openId === c.id && <ClinicProgressPanel inquiryId={c.id} tt={tt} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Center({ children, className = "" }) {
  return <div className={`max-w-3xl mx-auto px-4 py-24 text-center text-gray-500 ${className}`}>{children}</div>;
}

// 해외 의료기관 전용: 케이스별 경과(검사결과·영상·소견) 업로드 + 목록 (사후관리 ICT ④)
function ClinicProgressPanel({ inquiryId, tt }) {
  const TYPES = ["test_result", "imaging", "clinical_note", "progress"];
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordType, setRecordType] = useState("test_result");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0); // 업로드 후 file input 초기화용
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch(`/api/khidi/progress?inquiryId=${inquiryId}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) setRecords(json.records || []);
    } catch { /* noop */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [inquiryId]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!file && !note.trim()) { setMsg({ type: "err", text: tt("progressErr") }); return; }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const fd = new FormData();
      fd.append("inquiryId", String(inquiryId));
      fd.append("recordType", recordType);
      if (note.trim()) fd.append("note", note.trim());
      if (file) fd.append("file", file);
      const res = await fetch("/api/khidi/progress", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json();
      if (json.ok) {
        setMsg({ type: "ok", text: tt("progressOk") });
        setNote(""); setFile(null); setFileKey((k) => k + 1);
        await load();
      } else { setMsg({ type: "err", text: tt("progressErr") }); }
    } catch { setMsg({ type: "err", text: tt("progressErr") }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-xs font-bold text-indigo-700 mb-2">{tt("progressTitle")}</h4>

      {loading ? (
        <p className="text-xs text-gray-400">…</p>
      ) : records.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">{tt("progressEmpty")}</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-700 truncate">
                <b>{r.record_type_label}</b>
                {r.file_name ? ` · ${r.file_name}` : ` · ${tt("progressNoFile")}`}
                {r.note ? ` — ${r.note}` : ""}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">{tt("progressView")}</a>}
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-2 bg-indigo-50/40 rounded-xl p-3">
        <div className="flex gap-2">
          <select value={recordType} onChange={(e) => setRecordType(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white shrink-0">
            {TYPES.map((t) => <option key={t} value={t}>{tt(`progressType_${t}`)}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tt("progressNotePh")}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs" />
        </div>
        <input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.dcm,application/pdf,image/jpeg,image/png,image/webp,application/dicom"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-1.5 file:text-indigo-700" />
        <p className="text-[11px] text-gray-400">{tt("progressFile")}</p>
        {msg && <p className={`text-xs ${msg.type === "ok" ? "text-teal-700" : "text-red-600"}`}>{msg.text}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
            {busy ? tt("progressSubmitting") : tt("progressUpload")}
          </button>
        </div>
      </form>
    </div>
  );
}
