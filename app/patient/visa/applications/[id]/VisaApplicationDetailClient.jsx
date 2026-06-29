"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 비자 신청 상태 라벨 — 6개 언어. color 클래스는 공통.
const STATUS_LABELS = {
  draft: {
    color: "bg-gray-100 text-gray-700",
    en: "Draft", ko: "작성 중", ru: "Черновик", kz: "Жоба", zh: "草稿", ja: "下書き",
  },
  documents_pending: {
    color: "bg-amber-100 text-amber-800",
    en: "Documents pending", ko: "서류 준비", ru: "Подготовка документов", kz: "Құжаттарды дайындау", zh: "准备材料", ja: "書類準備中",
  },
  under_review: {
    color: "bg-blue-100 text-blue-800",
    en: "Under coordinator review", ko: "코디 검수 중", ru: "На проверке координатора", kz: "Координатор тексеруде", zh: "协调员审核中", ja: "コーディネーター審査中",
  },
  changes_requested: {
    color: "bg-orange-100 text-orange-800",
    en: "Changes requested", ko: "수정 필요", ru: "Нужны исправления", kz: "Түзету қажет", zh: "需要修改", ja: "修正が必要",
  },
  invitation_ready: {
    color: "bg-indigo-100 text-indigo-800",
    en: "Invitation letter ready", ko: "초청장 발급 준비", ru: "Приглашение готовится", kz: "Шақыру дайын", zh: "邀请函准备中", ja: "招待状発行準備中",
  },
  invitation_issued: {
    color: "bg-emerald-100 text-emerald-800",
    en: "Invitation letter issued", ko: "초청장 발급 완료", ru: "Приглашение выдано", kz: "Шақыру берілді", zh: "邀请函已发放", ja: "招待状発行済み",
  },
  submitted_embassy: {
    color: "bg-teal-100 text-teal-800",
    en: "Submitted to embassy", ko: "대사관 접수", ru: "Подано в посольство", kz: "Елшілікке тапсырылды", zh: "已递交大使馆", ja: "大使館へ提出済み",
  },
  approved: {
    color: "bg-green-100 text-green-800",
    en: "Visa approved", ko: "비자 승인", ru: "Виза одобрена", kz: "Виза мақұлданды", zh: "签证已批准", ja: "ビザ承認",
  },
  rejected: {
    color: "bg-red-100 text-red-800",
    en: "Rejected", ko: "거절", ru: "Отклонено", kz: "Бас тартылды", zh: "已拒绝", ja: "却下",
  },
  cancelled: {
    color: "bg-gray-100 text-gray-500",
    en: "Cancelled", ko: "취소", ru: "Отменено", kz: "Бас тартылды", zh: "已取消", ja: "キャンセル",
  },
};

// 서류 검수 상태 라벨 — 6개 언어.
const REVIEW_LABELS = {
  pending: {
    color: "text-amber-700",
    en: "Awaiting review", ko: "검수 대기", ru: "Ожидает проверки", kz: "Тексеруді күтуде", zh: "等待审核", ja: "審査待ち",
  },
  approved: {
    color: "text-emerald-700",
    en: "Approved", ko: "승인", ru: "Одобрено", kz: "Мақұлданды", zh: "已通过", ja: "承認",
  },
  rejected: {
    color: "text-red-700",
    en: "Rejected", ko: "반려", ru: "Отклонено", kz: "Қайтарылды", zh: "已退回", ja: "差し戻し",
  },
  needs_revision: {
    color: "text-orange-700",
    en: "Revision requested", ko: "수정 요청", ru: "Запрошены правки", kz: "Түзету сұралды", zh: "请求修改", ja: "修正依頼",
  },
};

// 서류 종류 — 6개 언어. value 는 그대로(로직 키).
const DOCUMENT_TYPES = [
  { value: "passport", en: "Passport", ko: "여권", ru: "Паспорт", kz: "Төлқұжат", zh: "护照", ja: "パスポート" },
  { value: "photo", en: "Photo", ko: "증명사진", ru: "Фотография", kz: "Жеке фото", zh: "证件照", ja: "証明写真" },
  { value: "visa_application_form", en: "Visa application form", ko: "비자 신청서", ru: "Анкета на визу", kz: "Виза өтінімі", zh: "签证申请表", ja: "ビザ申請書" },
  { value: "medical_certificate", en: "Medical certificate", ko: "의료 확인서", ru: "Медицинская справка", kz: "Медициналық анықтама", zh: "医疗证明", ja: "医療証明書" },
  { value: "diagnosis_document", en: "Diagnosis document", ko: "진단서", ru: "Заключение о диагнозе", kz: "Диагноз құжаты", zh: "诊断书", ja: "診断書" },
  { value: "treatment_plan", en: "Treatment plan", ko: "치료 계획서", ru: "План лечения", kz: "Емдеу жоспары", zh: "治疗计划书", ja: "治療計画書" },
  { value: "bank_statement", en: "Bank statement", ko: "재정 증명", ru: "Выписка из банка", kz: "Қаржылық анықтама", zh: "财力证明", ja: "残高証明書" },
  { value: "hospital_confirmation", en: "Hospital confirmation", ko: "병원 확인서", ru: "Подтверждение больницы", kz: "Аурухана растамасы", zh: "医院确认函", ja: "病院確認書" },
  { value: "insurance", en: "Insurance certificate", ko: "보험 증서", ru: "Страховой полис", kz: "Сақтандыру полисі", zh: "保险凭证", ja: "保険証書" },
  { value: "other", en: "Other", ko: "기타", ru: "Прочее", kz: "Басқа", zh: "其他", ja: "その他" },
];

const COPY = {
  en: {
    loading: "Loading…",
    errorPrefix: "Error: ",
    backToList: "← Back to list",
    backToVisaList: "← Visa applications",
    visaApplicationTitle: (t) => `${t} visa application`,
    nationality: "Nationality",
    coordinatorNotes: "Coordinator notes",
    applicationInfo: "Application details",
    purpose: "Purpose of visit",
    durationDays: "Planned length of stay",
    plannedArrival: "Expected arrival date",
    plannedDeparture: "Expected departure date",
    visaNumber: "Visa number",
    invitationIssued: "✅ Invitation letter issued",
    invitationDesc: "Download the invitation letter issued by your healwith coordinator and submit it to the embassy.",
    downloadInvitation: "Download invitation letter (PDF)",
    submittedDocs: "Submitted documents",
    documentType: "Document type",
    chooseFile: "Choose a file (PDF/JPG/PNG, up to 20MB)",
    uploadingFile: "Uploading…",
    noDocs: "No documents submitted yet.",
    reviewerNote: "Reviewer note: ",
    view: "View",
    delete: "Delete",
    requestReview: "Request coordinator review →",
    daysUnit: "days",
    confirmReview: "Request coordinator review? After this, document edits will be restricted.",
    confirmDelete: "Delete this document?",
    uploadFailed: "Upload failed: ",
    submitFailed: "Submission failed: ",
    deleteFailed: "Delete failed: ",
  },
  ko: {
    loading: "불러오는 중...",
    errorPrefix: "오류: ",
    backToList: "← 목록으로",
    backToVisaList: "← 비자 신청 목록",
    visaApplicationTitle: (t) => `${t} 비자 신청`,
    nationality: "국적",
    coordinatorNotes: "코디네이터 메모",
    applicationInfo: "신청 정보",
    purpose: "방문 목적",
    durationDays: "체류 예정 일수",
    plannedArrival: "예상 입국일",
    plannedDeparture: "예상 출국일",
    visaNumber: "비자 번호",
    invitationIssued: "✅ 초청장 발급 완료",
    invitationDesc: "healwith 코디네이터가 발급한 초청장을 다운로드 받아 대사관에 제출하세요.",
    downloadInvitation: "초청장 PDF 다운로드",
    submittedDocs: "제출 서류",
    documentType: "서류 종류",
    chooseFile: "파일 선택 (PDF/JPG/PNG, 20MB 이하)",
    uploadingFile: "업로드 중...",
    noDocs: "아직 제출된 서류가 없습니다.",
    reviewerNote: "검수자 메모: ",
    view: "보기",
    delete: "삭제",
    requestReview: "코디 검수 요청 →",
    daysUnit: "일",
    confirmReview: "코디 검수를 요청하시겠습니까? 이후에는 서류 수정이 제한됩니다.",
    confirmDelete: "이 서류를 삭제하시겠습니까?",
    uploadFailed: "업로드 실패: ",
    submitFailed: "제출 실패: ",
    deleteFailed: "삭제 실패: ",
  },
  ru: {
    loading: "Загрузка…",
    errorPrefix: "Ошибка: ",
    backToList: "← К списку",
    backToVisaList: "← Заявления на визу",
    visaApplicationTitle: (t) => `Заявление на визу ${t}`,
    nationality: "Гражданство",
    coordinatorNotes: "Заметки координатора",
    applicationInfo: "Данные заявления",
    purpose: "Цель визита",
    durationDays: "Планируемый срок пребывания",
    plannedArrival: "Предполагаемая дата въезда",
    plannedDeparture: "Предполагаемая дата выезда",
    visaNumber: "Номер визы",
    invitationIssued: "✅ Приглашение выдано",
    invitationDesc: "Скачайте приглашение, выданное координатором healwith, и подайте его в посольство.",
    downloadInvitation: "Скачать приглашение (PDF)",
    submittedDocs: "Поданные документы",
    documentType: "Тип документа",
    chooseFile: "Выберите файл (PDF/JPG/PNG, до 20 МБ)",
    uploadingFile: "Загрузка…",
    noDocs: "Документы ещё не поданы.",
    reviewerNote: "Заметка проверяющего: ",
    view: "Открыть",
    delete: "Удалить",
    requestReview: "Запросить проверку координатора →",
    daysUnit: "дн.",
    confirmReview: "Запросить проверку координатора? После этого редактирование документов будет ограничено.",
    confirmDelete: "Удалить этот документ?",
    uploadFailed: "Ошибка загрузки: ",
    submitFailed: "Ошибка отправки: ",
    deleteFailed: "Ошибка удаления: ",
  },
  kz: {
    loading: "Жүктелуде…",
    errorPrefix: "Қате: ",
    backToList: "← Тізімге",
    backToVisaList: "← Виза өтінімдері",
    visaApplicationTitle: (t) => `${t} виза өтінімі`,
    nationality: "Азаматтығы",
    coordinatorNotes: "Координатор жазбалары",
    applicationInfo: "Өтінім мәліметтері",
    purpose: "Сапар мақсаты",
    durationDays: "Болжамды болу мерзімі",
    plannedArrival: "Болжамды келу күні",
    plannedDeparture: "Болжамды кету күні",
    visaNumber: "Виза нөмірі",
    invitationIssued: "✅ Шақыру берілді",
    invitationDesc: "healwith координаторы берген шақыруды жүктеп алып, елшілікке тапсырыңыз.",
    downloadInvitation: "Шақыруды жүктеу (PDF)",
    submittedDocs: "Тапсырылған құжаттар",
    documentType: "Құжат түрі",
    chooseFile: "Файлды таңдаңыз (PDF/JPG/PNG, 20 МБ дейін)",
    uploadingFile: "Жүктелуде…",
    noDocs: "Әзірге құжат тапсырылмаған.",
    reviewerNote: "Тексеруші жазбасы: ",
    view: "Ашу",
    delete: "Жою",
    requestReview: "Координатор тексеруін сұрау →",
    daysUnit: "күн",
    confirmReview: "Координатор тексеруін сұрайсыз ба? Бұдан кейін құжаттарды өңдеу шектеледі.",
    confirmDelete: "Бұл құжатты жоясыз ба?",
    uploadFailed: "Жүктеу қатесі: ",
    submitFailed: "Жіберу қатесі: ",
    deleteFailed: "Жою қатесі: ",
  },
  zh: {
    loading: "加载中…",
    errorPrefix: "错误：",
    backToList: "← 返回列表",
    backToVisaList: "← 签证申请列表",
    visaApplicationTitle: (t) => `${t} 签证申请`,
    nationality: "国籍",
    coordinatorNotes: "协调员备注",
    applicationInfo: "申请信息",
    purpose: "访问目的",
    durationDays: "预计停留天数",
    plannedArrival: "预计入境日期",
    plannedDeparture: "预计出境日期",
    visaNumber: "签证号码",
    invitationIssued: "✅ 邀请函已发放",
    invitationDesc: "请下载 healwith 协调员发放的邀请函并递交大使馆。",
    downloadInvitation: "下载邀请函 (PDF)",
    submittedDocs: "提交材料",
    documentType: "材料类型",
    chooseFile: "选择文件（PDF/JPG/PNG，20MB 以内）",
    uploadingFile: "上传中…",
    noDocs: "尚未提交任何材料。",
    reviewerNote: "审核员备注：",
    view: "查看",
    delete: "删除",
    requestReview: "申请协调员审核 →",
    daysUnit: "天",
    confirmReview: "确定申请协调员审核吗？之后将限制修改材料。",
    confirmDelete: "确定删除此材料吗？",
    uploadFailed: "上传失败：",
    submitFailed: "提交失败：",
    deleteFailed: "删除失败：",
  },
  ja: {
    loading: "読み込み中…",
    errorPrefix: "エラー: ",
    backToList: "← 一覧へ",
    backToVisaList: "← ビザ申請一覧",
    visaApplicationTitle: (t) => `${t} ビザ申請`,
    nationality: "国籍",
    coordinatorNotes: "コーディネーターのメモ",
    applicationInfo: "申請情報",
    purpose: "訪問目的",
    durationDays: "滞在予定日数",
    plannedArrival: "入国予定日",
    plannedDeparture: "出国予定日",
    visaNumber: "ビザ番号",
    invitationIssued: "✅ 招待状発行済み",
    invitationDesc: "healwith コーディネーターが発行した招待状をダウンロードし、大使館へ提出してください。",
    downloadInvitation: "招待状PDFをダウンロード",
    submittedDocs: "提出書類",
    documentType: "書類の種類",
    chooseFile: "ファイルを選択（PDF/JPG/PNG、20MB以下）",
    uploadingFile: "アップロード中…",
    noDocs: "まだ提出された書類はありません。",
    reviewerNote: "審査者メモ: ",
    view: "表示",
    delete: "削除",
    requestReview: "コーディネーター審査を依頼 →",
    daysUnit: "日",
    confirmReview: "コーディネーター審査を依頼しますか？以降は書類の修正が制限されます。",
    confirmDelete: "この書類を削除しますか？",
    uploadFailed: "アップロード失敗: ",
    submitFailed: "提出失敗: ",
    deleteFailed: "削除失敗: ",
  },
};

export default function VisaApplicationDetailClient({ applicationId }) {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [_role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationUrl, setInvitationUrl] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("passport");

  useEffect(() => {
    loadAll();
  }, [applicationId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [appRes, docRes] = await Promise.all([
        fetch(`/api/khidi/visa/applications/${applicationId}`, { credentials: "include" }),
        fetch(`/api/khidi/visa/applications/${applicationId}/documents`, { credentials: "include" }),
      ]);
      const appJson = await appRes.json();
      const docJson = await docRes.json();

      if (!appRes.ok || !appJson.ok) {
        throw new Error(appJson.error || "failed_to_load");
      }
      setApplication(appJson.data);
      setRole(appJson.role);
      setDocuments(docJson.data || []);

      // 초청장 발급되어 있으면 signed URL 가져오기
      if (appJson.data.invitation_letter_url) {
        const invRes = await fetch(
          `/api/khidi/visa/applications/${applicationId}/invitation`,
          { credentials: "include" }
        );
        const invJson = await invRes.json();
        if (invJson.ok) {
          setInvitationUrl(invJson.invitation_letter_url);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", uploadType);
      const docType = DOCUMENT_TYPES.find((d) => d.value === uploadType);
      formData.append(
        "document_label",
        docType ? (docType[lang] || docType.en) : uploadType
      );
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/documents`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "upload_failed");
      }
      await loadAll();
      e.target.value = "";
    } catch (err) {
      alert(copy.uploadFailed + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!confirm(copy.confirmReview)) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "under_review" }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.detail || "failed");
      }
      await loadAll();
    } catch (err) {
      alert(copy.submitFailed + err.message);
    }
  }

  async function handleDeleteDoc(docId) {
    if (!confirm(copy.confirmDelete)) return;
    try {
      const res = await fetch(
        `/api/khidi/visa/applications/${applicationId}/documents/${docId}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "delete_failed");
      await loadAll();
    } catch (err) {
      alert(copy.deleteFailed + err.message);
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10"><p className="text-gray-500 text-sm">{copy.loading}</p></div>;
  }
  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-red-600 text-sm">{copy.errorPrefix}{error}</p>
        <Link href="/patient/visa/applications" className="text-sm underline mt-4 inline-block">
          {copy.backToList}
        </Link>
      </div>
    );
  }

  const status = STATUS_LABELS[application.status] || STATUS_LABELS.draft;
  const canUpload = ["draft", "documents_pending", "changes_requested"].includes(
    application.status
  );
  const canSubmit = application.status === "documents_pending" && documents.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/patient/visa/applications"
        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
      >
        {copy.backToVisaList}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {copy.visaApplicationTitle(application.visa_type)}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
              {status[lang] || status.en}
            </span>
            <span className="text-sm text-gray-500">
              {copy.nationality} {application.nationality}
            </span>
          </div>
        </div>
      </div>

      {/* 코디 메모 (코디가 남긴 메모 표시) */}
      {application.coordinator_notes && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">{copy.coordinatorNotes}</p>
          <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">
            {application.coordinator_notes}
          </p>
        </div>
      )}

      {/* 기본 정보 */}
      <section className="mt-8">
        <h2 className="text-lg font-medium mb-3">{copy.applicationInfo}</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">{copy.purpose}</dt>
            <dd>{application.purpose || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{copy.durationDays}</dt>
            <dd>{application.duration_days ? `${application.duration_days}${copy.daysUnit}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{copy.plannedArrival}</dt>
            <dd>{application.planned_arrival_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{copy.plannedDeparture}</dt>
            <dd>{application.planned_departure_date || "—"}</dd>
          </div>
          {application.visa_number && (
            <div>
              <dt className="text-gray-500">{copy.visaNumber}</dt>
              <dd className="font-mono">{application.visa_number}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* 초청장 */}
      {invitationUrl && (
        <section className="mt-8 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h2 className="font-medium text-emerald-900">{copy.invitationIssued}</h2>
          <p className="text-sm text-emerald-800 mt-1">
            {copy.invitationDesc}
          </p>
          <a
            href={invitationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block bg-emerald-700 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700"
          >
            {copy.downloadInvitation}
          </a>
        </section>
      )}

      {/* 서류 업로드 */}
      <section className="mt-8">
        <h2 className="text-lg font-medium mb-3">{copy.submittedDocs}</h2>

        {canUpload && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white mb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <label className="flex-1 w-full">
                <span className="text-sm text-gray-700">{copy.documentType}</span>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d[lang] || d.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 w-full">
                <span className="text-sm text-gray-700">{copy.chooseFile}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-1 block w-full text-sm"
                />
              </label>
            </div>
            {uploading && (
              <p className="text-sm text-gray-500 mt-2">{copy.uploadingFile}</p>
            )}
          </div>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border-2 border-dashed border-gray-200 rounded">
            {copy.noDocs}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {documents.map((doc) => {
              const review = REVIEW_LABELS[doc.review_status] || REVIEW_LABELS.pending;
              return (
                <li key={doc.id} className="p-4 bg-white flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{doc.document_label || doc.document_type}</span>
                      <span className={`text-xs ${review.color}`}>· {review[lang] || review.en}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{doc.file_name}</p>
                    {doc.review_note && (
                      <p className="text-xs text-orange-700 mt-1">
                        {copy.reviewerNote}{doc.review_note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {copy.view}
                      </a>
                    )}
                    {canUpload && doc.document_type !== "invitation_letter" && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {copy.delete}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canSubmit && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmitForReview}
              className="bg-black text-white px-5 py-2 rounded-md text-sm hover:bg-gray-800"
            >
              {copy.requestReview}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
