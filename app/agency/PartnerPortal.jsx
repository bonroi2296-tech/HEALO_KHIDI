"use client";

/**
 * 에이전시 포털 — 의뢰한 환자들의 진행 상황을 확인.
 * 카자흐 현지 에이전시 요구: 병원 응답이 느려도 "지금 어느 단계인지" 가시화.
 * 다국어: 활성 6개 언어(ko·en·ru·kz·zh·ja). 상단바 언어 스위처로 전환(포털 공통).
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { kstDateTime } from "@/lib/datetime/kst";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";
import {
  UploadCloud, File as FileIcon, X, ClipboardList, Activity, CheckCircle2, PauseCircle,
  Plus, ArrowRight, ChevronDown, Paperclip, MessageCircle, FileText, Video, Send, Clock, Stethoscope, Languages,
  Link2, Check,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadAttachment, uploadDirect } from "@/lib/uploadAttachment";
import { useLang } from "@/lib/i18n/LangContext";
import { STAGES, optLabel, stageLabel } from "@/lib/inquiry/intakeLabels";
import { caseStatusLabelL } from "@/lib/khidi/caseStatus";
import { nextStepGuide } from "@/lib/khidi/nextStepGuide";
import ManualDrawer from "../_components/ManualDrawer";

const supabase = createSupabaseBrowserClient();

const EMPTY_FORM = {
  firstName: "", lastName: "", nationality: "", treatmentType: "",
  sex: "", birthYear: "", stage: "", stageUnknown: false,
  diagnosisDate: "", diagnosisUnknown: false, diagnosedHospital: "", priorTreatment: "", treatmentState: "",
  contactMethod: "whatsapp", contactId: "", email: "", message: "",
};

// 폼 입력 공통 스타일 (DESIGN: border gray-200 / rounded-lg / text-sm)
const INP = "border border-gray-200 rounded-lg px-3 py-2 text-sm";

// 인테이크 폼(UnifiedInquiryFunnel)과 동일한 칩 선택지 — 톤 일치.
// 병기는 사전으로 옮겨서(코디 콘텐츠 편집기에서 수정 가능) 복사본을 없애고 공용 STAGES 를 쓴다.
const SEX_OPTS = [{ v: "male", k: "optMale" }, { v: "female", k: "optFemale" }];
const TREATMENT_STATES = [
  { value: "pre_surgery", label: { ko: "수술 전", en: "Pre-surgery", ru: "До операции", kz: "Операцияға дейін", zh: "术前", ja: "術前" } },
  { value: "post_surgery", label: { ko: "수술 후", en: "Post-surgery", ru: "После операции", kz: "Операциядан кейін", zh: "术后", ja: "術後" } },
  { value: "chemotherapy", label: { ko: "항암 중", en: "Chemotherapy", ru: "Химиотерапия", kz: "Химиотерапия", zh: "化疗中", ja: "化学療法中" } },
  { value: "follow_up", label: { ko: "추적 관찰", en: "Follow-up", ru: "Наблюдение", kz: "Бақылау", zh: "随访", ja: "経過観察" } },
  { value: "other", label: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" } },
];

// 포털 정적 UI 문구 — 6개 언어. (환자가 입력한 자유 텍스트·국적·암종은 번역 대상 아님)
const TR = {
  en: {
    loading: "Loading…", loginRequired: "Please sign in.", loginLink: "Sign in",
    forbidden: "This account has no partner portal access. Please contact the administrator.",
    kindAgency: "Overseas agency", kindClinic: "Overseas medical institution",
    titleSuffix: "· Patient progress",
    subtitle: "Current stage of the patients you referred. Tap a stage to see its detailed history.",
    btnRefer: "Refer a patient", btnClose: "Close", manualBtn: "User guide",
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
    btnRefer: "환자 의뢰하기", btnClose: "닫기", manualBtn: "사용설명서",
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
    btnRefer: "Направить пациента", btnClose: "Закрыть", manualBtn: "Руководство",
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
    btnRefer: "Науқас жолдау", btnClose: "Жабу", manualBtn: "Нұсқаулық",
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
    btnRefer: "转介患者", btnClose: "关闭", manualBtn: "使用指南",
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
    btnRefer: "患者を紹介", btnClose: "閉じる", manualBtn: "利用ガイド",
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
    progressNotePh: "Findings / note (optional)", progressFile: "Choose file (PDF / image / DICOM, max 200MB)",
    progressSubmit: "Upload", progressSubmitting: "Uploading…", progressEmpty: "No progress uploaded yet.",
    progressErr: "Upload failed.", progressOk: "Progress uploaded.", progressView: "View", progressNoFile: "(note only)",
  },
  ko: {
    progressTitle: "경과 기록 (사후관리)", progressUpload: "경과 업로드",
    progressType_test_result: "검사결과", progressType_imaging: "영상정보",
    progressType_clinical_note: "임상소견", progressType_progress: "일반 경과",
    progressNotePh: "소견 / 메모 (선택)", progressFile: "파일 선택 (PDF / 이미지 / DICOM, 최대 200MB)",
    progressSubmit: "업로드", progressSubmitting: "업로드 중…", progressEmpty: "아직 업로드된 경과가 없습니다.",
    progressErr: "업로드 실패.", progressOk: "경과가 업로드되었습니다.", progressView: "보기", progressNoFile: "(메모만)",
  },
  ru: {
    progressTitle: "Записи о ходе (постлечение)", progressUpload: "Загрузить ход лечения",
    progressType_test_result: "Результат анализа", progressType_imaging: "Медицинский снимок",
    progressType_clinical_note: "Клиническая заметка", progressType_progress: "Общий ход",
    progressNotePh: "Заключение / заметка (необязательно)", progressFile: "Выбрать файл (PDF / изображение / DICOM, до 200МБ)",
    progressSubmit: "Загрузить", progressSubmitting: "Загрузка…", progressEmpty: "Записи о ходе ещё не загружены.",
    progressErr: "Не удалось загрузить.", progressOk: "Ход загружен.", progressView: "Открыть", progressNoFile: "(только заметка)",
  },
  kz: {
    progressTitle: "Барыс жазбалары (емнен кейінгі)", progressUpload: "Барысты жүктеу",
    progressType_test_result: "Талдау нәтижесі", progressType_imaging: "Медициналық сурет",
    progressType_clinical_note: "Клиникалық жазба", progressType_progress: "Жалпы барыс",
    progressNotePh: "Қорытынды / жазба (міндетті емес)", progressFile: "Файл таңдау (PDF / сурет / DICOM, 200МБ дейін)",
    progressSubmit: "Жүктеу", progressSubmitting: "Жүктелуде…", progressEmpty: "Барыс жазбалары әлі жүктелмеген.",
    progressErr: "Жүктеу сәтсіз.", progressOk: "Барыс жүктелді.", progressView: "Ашу", progressNoFile: "(тек жазба)",
  },
  zh: {
    progressTitle: "进展记录（术后随访）", progressUpload: "上传进展",
    progressType_test_result: "检查结果", progressType_imaging: "医学影像",
    progressType_clinical_note: "临床记录", progressType_progress: "总体进展",
    progressNotePh: "意见 / 备注（选填）", progressFile: "选择文件（PDF / 图片 / DICOM，最大 200MB）",
    progressSubmit: "上传", progressSubmitting: "上传中…", progressEmpty: "尚未上传进展记录。",
    progressErr: "上传失败。", progressOk: "进展已上传。", progressView: "查看", progressNoFile: "（仅备注）",
  },
  ja: {
    progressTitle: "経過記録（術後フォローアップ）", progressUpload: "経過をアップロード",
    progressType_test_result: "検査結果", progressType_imaging: "医療画像",
    progressType_clinical_note: "臨床所見", progressType_progress: "全体の経過",
    progressNotePh: "所見 / メモ（任意）", progressFile: "ファイルを選択（PDF / 画像 / DICOM、最大200MB）",
    progressSubmit: "アップロード", progressSubmitting: "アップロード中…", progressEmpty: "経過はまだアップロードされていません。",
    progressErr: "アップロードに失敗しました。", progressOk: "経過をアップロードしました。", progressView: "表示", progressNoFile: "（メモのみ）",
  },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_PROGRESS[l] || TR_PROGRESS.en);

// 의뢰 폼 강화(상세 진단정보 + 첨부서류) + 상단 요약 문구 — 6개 언어. 위 TR 에 병합.
const TR_FORM2 = {
  ko: {
    statTotal: "총 의뢰", statActive: "진행 중", statDone: "완료",
    secPatient: "환자 기본정보", secDiagnosis: "진단 정보", secDocs: "첨부 서류",
    phSex: "성별", optMale: "남성", optFemale: "여성", phBirthYear: "출생연도 (예: 1968)",
    phStage: "병기 (예: II기 / Stage II)", phDiagnosisDate: "진단 시기 (예: 2025-03)",
    phDiagnosedHospital: "진단받은 병원·지역", phPriorTreatment: "기존 치료 이력 (수술·항암·방사선 등)",
    docsHint: "환자 차트·진단서·검사결과 등 — PDF·이미지·Word, 각 200MB",
    docAdd: "+ 파일 추가", docUploading: "파일 올리는 중…", docRemove: "삭제",
    catChart: "환자 차트", catDiagnosis: "진단서", catTest: "검사결과", catOther: "기타",
    errUpload: "파일 업로드 실패. 다시 시도해 주세요.",
  },
  en: {
    statTotal: "Total referrals", statActive: "In progress", statDone: "Completed",
    secPatient: "Patient basics", secDiagnosis: "Diagnosis", secDocs: "Documents",
    phSex: "Sex", optMale: "Male", optFemale: "Female", phBirthYear: "Birth year (e.g. 1968)",
    phStage: "Stage (e.g. Stage II)", phDiagnosisDate: "Diagnosed (e.g. 2025-03)",
    phDiagnosedHospital: "Diagnosing hospital / region", phPriorTreatment: "Prior treatment (surgery, chemo, radiation…)",
    docsHint: "Patient chart, diagnosis, test results — PDF / image / Word, 200MB each",
    docAdd: "+ Add file", docUploading: "Uploading files…", docRemove: "Remove",
    catChart: "Patient chart", catDiagnosis: "Diagnosis report", catTest: "Test result", catOther: "Other",
    errUpload: "File upload failed. Please try again.",
  },
  ru: {
    statTotal: "Всего направлений", statActive: "В процессе", statDone: "Завершено",
    secPatient: "Данные пациента", secDiagnosis: "Диагноз", secDocs: "Документы",
    phSex: "Пол", optMale: "Мужской", optFemale: "Женский", phBirthYear: "Год рождения (напр. 1968)",
    phStage: "Стадия (напр. Stage II)", phDiagnosisDate: "Дата диагноза (напр. 2025-03)",
    phDiagnosedHospital: "Больница / регион диагноза", phPriorTreatment: "Предыдущее лечение (операция, химио, лучевая…)",
    docsHint: "Карта пациента, диагноз, результаты анализов — PDF / изображение / Word, до 200МБ каждый",
    docAdd: "+ Добавить файл", docUploading: "Загрузка файлов…", docRemove: "Удалить",
    catChart: "Карта пациента", catDiagnosis: "Заключение", catTest: "Результат анализа", catOther: "Другое",
    errUpload: "Не удалось загрузить файл. Попробуйте ещё раз.",
  },
  kz: {
    statTotal: "Барлық жолдамалар", statActive: "Орындалуда", statDone: "Аяқталды",
    secPatient: "Науқас деректері", secDiagnosis: "Диагноз", secDocs: "Құжаттар",
    phSex: "Жынысы", optMale: "Ер", optFemale: "Әйел", phBirthYear: "Туған жылы (мыс. 1968)",
    phStage: "Сатысы (мыс. Stage II)", phDiagnosisDate: "Диагноз қойылған кез (мыс. 2025-03)",
    phDiagnosedHospital: "Диагноз қойылған аурухана / аймақ", phPriorTreatment: "Бұрынғы емі (операция, химия, сәулелік…)",
    docsHint: "Науқас картасы, диагноз, талдау нәтижелері — PDF / сурет / Word, әрқайсысы 200МБ",
    docAdd: "+ Файл қосу", docUploading: "Файлдар жүктелуде…", docRemove: "Жою",
    catChart: "Науқас картасы", catDiagnosis: "Диагноз қорытындысы", catTest: "Талдау нәтижесі", catOther: "Басқа",
    errUpload: "Файл жүктелмеді. Қайталап көріңіз.",
  },
  zh: {
    statTotal: "转介总数", statActive: "进行中", statDone: "已完成",
    secPatient: "患者基本信息", secDiagnosis: "诊断信息", secDocs: "附件资料",
    phSex: "性别", optMale: "男", optFemale: "女", phBirthYear: "出生年份（如 1968）",
    phStage: "分期（如 II 期）", phDiagnosisDate: "确诊时间（如 2025-03）",
    phDiagnosedHospital: "确诊医院 / 地区", phPriorTreatment: "既往治疗（手术、化疗、放疗等）",
    docsHint: "患者病历、诊断书、检查结果 — PDF / 图片 / Word，每个 200MB",
    docAdd: "+ 添加文件", docUploading: "正在上传文件…", docRemove: "删除",
    catChart: "患者病历", catDiagnosis: "诊断书", catTest: "检查结果", catOther: "其他",
    errUpload: "文件上传失败，请重试。",
  },
  ja: {
    statTotal: "紹介の総数", statActive: "進行中", statDone: "完了",
    secPatient: "患者基本情報", secDiagnosis: "診断情報", secDocs: "添付書類",
    phSex: "性別", optMale: "男性", optFemale: "女性", phBirthYear: "生年（例: 1968）",
    phStage: "病期（例: ステージII）", phDiagnosisDate: "診断時期（例: 2025-03）",
    phDiagnosedHospital: "診断を受けた病院・地域", phPriorTreatment: "既往治療（手術・抗がん剤・放射線など）",
    docsHint: "患者カルテ・診断書・検査結果など — PDF / 画像 / Word、各200MB",
    docAdd: "+ ファイル追加", docUploading: "ファイルをアップロード中…", docRemove: "削除",
    catChart: "患者カルテ", catDiagnosis: "診断書", catTest: "検査結果", catOther: "その他",
    errUpload: "ファイルのアップロードに失敗しました。もう一度お試しください。",
  },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_FORM2[l] || TR_FORM2.en);

// 칩/드롭존 섹션 라벨(인테이크 폼 톤) — 6개 언어.
const TR_FORM3 = {
  ko: { secContact: "연락처", lblStage: "병기", lblTreatState: "현재 치료 상태", lblDiagDate: "진단 받은 날짜", optUnknown: "모름", uploadDrop: "파일을 여기에 드래그하거나 클릭하여 업로드", uploadHint: "PDF · JPG · PNG · Word · 각 200MB", lblPatientInfo: "환자 정보", lblTimeline: "진행 이력", lblBirthYear: "출생연도", lblHospital: "진단 병원·지역", lblPriorTx: "기존 치료 이력" , lblActivity: "환자 활동 (진행상황 링크)", activityEmpty: "최근 60일 환자가 남긴 글·증상·재진 요청이 없습니다.", actNote: "환자 글", actSymptom: "증상 기록", actRequest: "재진 상담 요청", actSeverity: "심각도", urg_low: "낮음", urg_medium: "주의", urg_high: "확인 필요", urg_emergency: "응급 의심" },
  en: { secContact: "Contact", lblStage: "Stage", lblTreatState: "Current treatment status", lblDiagDate: "Diagnosis date", optUnknown: "Unknown", uploadDrop: "Drag files here or click to upload", uploadHint: "PDF · JPG · PNG · Word · 200MB each", lblPatientInfo: "Patient info", lblTimeline: "Progress history", lblBirthYear: "Birth year", lblHospital: "Diagnosing hospital", lblPriorTx: "Prior treatment" , lblActivity: "Patient activity (progress link)", activityEmpty: "No notes, symptoms or follow-up requests from the patient in the last 60 days.", actNote: "Patient note", actSymptom: "Symptom entry", actRequest: "Follow-up consultation request", actSeverity: "Severity", urg_low: "Low", urg_medium: "Watch", urg_high: "Needs attention", urg_emergency: "Possible emergency" },
  ru: { secContact: "Контакты", lblStage: "Стадия", lblTreatState: "Текущий статус лечения", lblDiagDate: "Дата диагноза", optUnknown: "Не знаю", uploadDrop: "Перетащите файлы сюда или нажмите для загрузки", uploadHint: "PDF · JPG · PNG · Word · до 200МБ", lblPatientInfo: "Данные пациента", lblTimeline: "Ход лечения", lblBirthYear: "Год рождения", lblHospital: "Больница / регион", lblPriorTx: "Предыдущее лечение" , lblActivity: "Активность пациента (ссылка на статус)", activityEmpty: "За последние 60 дней пациент не оставлял сообщений, симптомов или запросов на консультацию.", actNote: "Сообщение пациента", actSymptom: "Запись о симптомах", actRequest: "Запрос на повторную консультацию", actSeverity: "Тяжесть", urg_low: "Низкая", urg_medium: "Наблюдать", urg_high: "Требует внимания", urg_emergency: "Возможна экстренная ситуация" },
  kz: { secContact: "Байланыс", lblStage: "Сатысы", lblTreatState: "Ағымдағы емдеу жағдайы", lblDiagDate: "Диагноз қойылған күн", optUnknown: "Білмеймін", uploadDrop: "Файлдарды осында сүйреңіз немесе жүктеу үшін басыңыз", uploadHint: "PDF · JPG · PNG · Word · әрқайсысы 200МБ", lblPatientInfo: "Науқас туралы", lblTimeline: "Барыс тарихы", lblBirthYear: "Туған жылы", lblHospital: "Аурухана / аймақ", lblPriorTx: "Бұрынғы емі" , lblActivity: "Науқас белсенділігі (барыс сілтемесі)", activityEmpty: "Соңғы 60 күнде науқастан хабарлама, белгі немесе қайта кеңес сұранысы жоқ.", actNote: "Науқас хабарламасы", actSymptom: "Белгі жазбасы", actRequest: "Қайта кеңес сұранысы", actSeverity: "Ауырлығы", urg_low: "Төмен", urg_medium: "Бақылау", urg_high: "Назар қажет", urg_emergency: "Шұғыл болуы мүмкін" },
  zh: { secContact: "联系方式", lblStage: "分期", lblTreatState: "当前治疗状态", lblDiagDate: "诊断日期", optUnknown: "不知道", uploadDrop: "将文件拖到此处或点击上传", uploadHint: "PDF · JPG · PNG · Word · 每个 200MB", lblPatientInfo: "患者信息", lblTimeline: "进展记录", lblBirthYear: "出生年份", lblHospital: "确诊医院 / 地区", lblPriorTx: "既往治疗" , lblActivity: "患者动态（进度链接）", activityEmpty: "最近60天患者没有留言、症状记录或复诊申请。", actNote: "患者留言", actSymptom: "症状记录", actRequest: "复诊咨询申请", actSeverity: "严重程度", urg_low: "低", urg_medium: "注意", urg_high: "需要关注", urg_emergency: "疑似紧急" },
  ja: { secContact: "連絡先", lblStage: "病期", lblTreatState: "現在の治療状況", lblDiagDate: "診断日", optUnknown: "不明", uploadDrop: "ファイルをここにドラッグまたはクリックしてアップロード", uploadHint: "PDF · JPG · PNG · Word · 各200MB", lblPatientInfo: "患者情報", lblTimeline: "進捗履歴", lblBirthYear: "生年", lblHospital: "診断病院・地域", lblPriorTx: "既往治療" , lblActivity: "患者の活動（進捗リンク）", activityEmpty: "直近60日間、患者からのメッセージ・症状記録・再診依頼はありません。", actNote: "患者メッセージ", actSymptom: "症状記録", actRequest: "再診相談の依頼", actSeverity: "重症度", urg_low: "低", urg_medium: "注意", urg_high: "要確認", urg_emergency: "緊急の疑い" },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_FORM3[l] || TR_FORM3.en);

// 케이스 액션(화상상담 요청·메시지·자료추가·첨부보기) 문구 — 6개 언어. 위 TR 에 병합.
const TR_ACT = {
  ko: {
    actConsult: "화상상담 요청", actMessage: "메시지", actAttach: "자료 추가",
    consultConfirm: "코디네이터에게 화상상담을 요청할까요?",
    actSent: "코디네이터에게 전달했습니다.", actErr: "요청 실패. 다시 시도해 주세요.",
    msgPh: "코디네이터에게 전할 메시지", msgSend: "보내기", msgSending: "보내는 중…",
    attTitle: "첨부 서류", attView: "보기", attUploading: "올리는 중…",
  },
  en: {
    actConsult: "Request video consult", actMessage: "Message", actAttach: "Add documents",
    consultConfirm: "Request a video consultation from the coordinator?",
    actSent: "Sent to the coordinator.", actErr: "Request failed. Please try again.",
    msgPh: "Message to the coordinator", msgSend: "Send", msgSending: "Sending…",
    attTitle: "Attached documents", attView: "View", attUploading: "Uploading…",
  },
  ru: {
    actConsult: "Запросить видеоконсультацию", actMessage: "Сообщение", actAttach: "Добавить документы",
    consultConfirm: "Запросить видеоконсультацию у координатора?",
    actSent: "Отправлено координатору.", actErr: "Не удалось отправить. Попробуйте ещё раз.",
    msgPh: "Сообщение координатору", msgSend: "Отправить", msgSending: "Отправка…",
    attTitle: "Прикреплённые документы", attView: "Открыть", attUploading: "Загрузка…",
  },
  kz: {
    actConsult: "Бейнекеңес сұрау", actMessage: "Хабарлама", actAttach: "Құжат қосу",
    consultConfirm: "Үйлестірушіден бейнекеңес сұрайсыз ба?",
    actSent: "Үйлестірушіге жіберілді.", actErr: "Жіберілмеді. Қайталап көріңіз.",
    msgPh: "Үйлестірушіге хабарлама", msgSend: "Жіберу", msgSending: "Жіберілуде…",
    attTitle: "Тіркелген құжаттар", attView: "Ашу", attUploading: "Жүктелуде…",
  },
  zh: {
    actConsult: "申请视频会诊", actMessage: "留言", actAttach: "添加资料",
    consultConfirm: "向协调员申请视频会诊吗？",
    actSent: "已发送给协调员。", actErr: "请求失败，请重试。",
    msgPh: "给协调员的留言", msgSend: "发送", msgSending: "发送中…",
    attTitle: "附件资料", attView: "查看", attUploading: "上传中…",
  },
  ja: {
    actConsult: "ビデオ相談を依頼", actMessage: "メッセージ", actAttach: "資料を追加",
    consultConfirm: "コーディネーターにビデオ相談を依頼しますか？",
    actSent: "コーディネーターに送信しました。", actErr: "依頼に失敗しました。もう一度お試しください。",
    msgPh: "コーディネーターへのメッセージ", msgSend: "送信", msgSending: "送信中…",
    attTitle: "添付書類", attView: "表示", attUploading: "アップロード中…",
  },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_ACT[l] || TR_ACT.en);

// 필터·검색 문구 — 6개 언어. 위 TR 에 병합.
const TR_FILTER = {
  ko: { fltAll: "전체", fltActive: "진행 중", fltDone: "완료", fltHold: "보류", searchPh: "이름·국적·암종 검색", noMatch: "검색 결과가 없습니다." },
  en: { fltAll: "All", fltActive: "In progress", fltDone: "Completed", fltHold: "On hold", searchPh: "Search name / country / cancer", noMatch: "No matching cases." },
  ru: { fltAll: "Все", fltActive: "В процессе", fltDone: "Завершено", fltHold: "Приостановлено", searchPh: "Поиск: имя / страна / рак", noMatch: "Совпадений не найдено." },
  kz: { fltAll: "Барлығы", fltActive: "Орындалуда", fltDone: "Аяқталды", fltHold: "Кідіртілген", searchPh: "Іздеу: аты / ел / ісік", noMatch: "Сәйкестік табылмады." },
  zh: { fltAll: "全部", fltActive: "进行中", fltDone: "已完成", fltHold: "暂停", searchPh: "搜索 姓名 / 国家 / 癌种", noMatch: "没有匹配的病例。" },
  ja: { fltAll: "すべて", fltActive: "進行中", fltDone: "完了", fltHold: "保留", searchPh: "氏名・国・がん種で検索", noMatch: "該当する症例がありません。" },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_FILTER[l] || TR_FILTER.en);

// 플랫폼 내 메신저(에이전시↔코디) · 견적 공유 · 화상상담 일정 · 문서함 문구 — 6개 언어. 위 TR 에 병합.
const TR_MSG = {
  ko: {
    msgrTitle: "코디네이터와 대화", msgrEmpty: "아직 대화가 없습니다. 메시지를 남기면 코디네이터에게 전달됩니다.",
    msgrPh: "메시지 입력…", msgrYou: "나", msgrCoord: "코디네이터", msgrSystem: "시스템",
    msgrHours: "코디 운영시간 · 한국시간(KST) 월–금 09:00–18:00", msgrOpen: "지금 운영 중", msgrClosed: "운영시간 외 — 다음 영업일에 답장드립니다", msgrNew: "새 답장",
    estTitle: "견적 (코디 발행)", estView: "PDF", estNo: "견적", estTotal: "총액",
    consTitle: "화상상담", consScheduled: "예정", consLive: "진행 중", consDone: "완료", consCancelled: "취소", consJoinNote: "입장 링크는 환자에게 발송됩니다. 필요 시 위 대화로 코디에게 요청하세요.",
    docsTitle: "문서함", opinTitle: "전문의 소견",
  },
  en: {
    msgrTitle: "Chat with coordinator", msgrEmpty: "No messages yet. Anything you send reaches our coordinator.",
    msgrPh: "Type a message…", msgrYou: "You", msgrCoord: "Coordinator", msgrSystem: "System",
    msgrHours: "Coordinator hours · Mon–Fri 09:00–18:00 KST", msgrOpen: "Open now", msgrClosed: "Outside hours — we reply on the next business day", msgrNew: "New reply",
    estTitle: "Quotation (issued)", estView: "PDF", estNo: "Quote", estTotal: "Total",
    consTitle: "Video consultation", consScheduled: "Scheduled", consLive: "Live", consDone: "Completed", consCancelled: "Cancelled", consJoinNote: "The join link is sent to the patient. Ask the coordinator in chat above if needed.",
    docsTitle: "Documents", opinTitle: "Specialist opinion",
  },
  ru: {
    msgrTitle: "Чат с координатором", msgrEmpty: "Сообщений пока нет. Всё, что вы напишете, получит наш координатор.",
    msgrPh: "Введите сообщение…", msgrYou: "Вы", msgrCoord: "Координатор", msgrSystem: "Система",
    msgrHours: "Часы координатора · Пн–Пт 09:00–18:00 (KST)", msgrOpen: "Сейчас на связи", msgrClosed: "Вне рабочих часов — ответим в следующий рабочий день", msgrNew: "Новый ответ",
    estTitle: "Смета (выставлена)", estView: "PDF", estNo: "Смета", estTotal: "Итого",
    consTitle: "Видеоконсультация", consScheduled: "Запланирована", consLive: "Идёт", consDone: "Завершена", consCancelled: "Отменена", consJoinNote: "Ссылка для входа отправляется пациенту. При необходимости спросите координатора в чате выше.",
    docsTitle: "Документы", opinTitle: "Мнение специалиста",
  },
  kz: {
    msgrTitle: "Үйлестірушімен чат", msgrEmpty: "Әзірге хабарлама жоқ. Жазғаныңызды үйлестіруші алады.",
    msgrPh: "Хабарлама жазыңыз…", msgrYou: "Сіз", msgrCoord: "Үйлестіруші", msgrSystem: "Жүйе",
    msgrHours: "Үйлестіруші уақыты · Дс–Жм 09:00–18:00 (KST)", msgrOpen: "Қазір желіде", msgrClosed: "Жұмыс уақытынан тыс — келесі жұмыс күні жауап береміз", msgrNew: "Жаңа жауап",
    estTitle: "Смета (берілген)", estView: "PDF", estNo: "Смета", estTotal: "Барлығы",
    consTitle: "Бейнекеңес", consScheduled: "Жоспарланған", consLive: "Жүруде", consDone: "Аяқталды", consCancelled: "Бас тартылды", consJoinNote: "Кіру сілтемесі науқасқа жіберіледі. Қажет болса жоғарыдағы чатта үйлестірушіден сұраңыз.",
    docsTitle: "Құжаттар", opinTitle: "Маман пікірі",
  },
  zh: {
    msgrTitle: "与协调员对话", msgrEmpty: "暂无消息。您发送的内容将转达给协调员。",
    msgrPh: "输入消息…", msgrYou: "我", msgrCoord: "协调员", msgrSystem: "系统",
    msgrHours: "协调员工作时间 · 周一至周五 09:00–18:00（韩国时间）", msgrOpen: "现在在线", msgrClosed: "非工作时间 — 将在下一个工作日回复", msgrNew: "新回复",
    estTitle: "报价（已出具）", estView: "PDF", estNo: "报价", estTotal: "合计",
    consTitle: "视频会诊", consScheduled: "已预约", consLive: "进行中", consDone: "已完成", consCancelled: "已取消", consJoinNote: "入会链接将发送给患者。如有需要，请在上方对话中向协调员咨询。",
    docsTitle: "资料库", opinTitle: "专家意见",
  },
  ja: {
    msgrTitle: "コーディネーターと会話", msgrEmpty: "まだメッセージはありません。送信内容はコーディネーターに届きます。",
    msgrPh: "メッセージを入力…", msgrYou: "あなた", msgrCoord: "コーディネーター", msgrSystem: "システム",
    msgrHours: "対応時間 · 月–金 09:00–18:00（韓国時間）", msgrOpen: "現在対応中", msgrClosed: "時間外 — 翌営業日に返信します", msgrNew: "新着返信",
    estTitle: "見積（発行済み）", estView: "PDF", estNo: "見積", estTotal: "合計",
    consTitle: "ビデオ相談", consScheduled: "予定", consLive: "進行中", consDone: "完了", consCancelled: "キャンセル", consJoinNote: "入室リンクは患者へ送信されます。必要なら上のチャットでコーディネーターにご依頼ください。",
    docsTitle: "書類", opinTitle: "専門医の所見",
  },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_MSG[l] || TR_MSG.en);

// 빈 화면 온보딩 + 환자 연결 링크 복사 — 6개 언어. 위 TR 에 병합.
// (단계별 "다음 단계 안내"는 src/lib/khidi/nextStepGuide.ts 로 옮겼다 — 공개 진행상황
//  화면과 같은 문구를 써야 해서. 여기 다시 넣지 말 것.)
const TR_GUIDE = {
  ko: {
    emptyHeading: "아직 의뢰한 환자가 없어요",
    emptySub: "첫 환자를 의뢰하면 여기서 진행 상황을 실시간으로 확인할 수 있어요.",
    emptyStep1: "환자 정보·서류로 의뢰",
    emptyStep2: "코디가 병원 매칭·견적·상담 조율",
    emptyStep3: "단계별 진행상황·메시지 확인",
    claimCopyBtn: "환자 연결 링크 복사",
    claimCopied: "복사됨!",
  },
  en: {
    emptyHeading: "No referred patients yet",
    emptySub: "Refer your first patient to track their progress here in real time.",
    emptyStep1: "Refer with patient info & documents",
    emptyStep2: "Coordinator matches hospital, quote & consult",
    emptyStep3: "Track each stage & message us",
    claimCopyBtn: "Copy patient link",
    claimCopied: "Copied!",
  },
  ru: {
    emptyHeading: "Пока нет направленных пациентов",
    emptySub: "Направьте первого пациента, чтобы отслеживать его ход здесь в реальном времени.",
    emptyStep1: "Направьте с данными и документами пациента",
    emptyStep2: "Координатор подбирает больницу, смету и консультацию",
    emptyStep3: "Отслеживайте этапы и пишите нам",
    claimCopyBtn: "Копировать ссылку пациента",
    claimCopied: "Скопировано!",
  },
  kz: {
    emptyHeading: "Әзірге жолданған науқас жоқ",
    emptySub: "Бірінші науқасты жолдаңыз, барысын осында нақты уақытта қадағалай аласыз.",
    emptyStep1: "Науқас деректері мен құжаттарымен жолдаңыз",
    emptyStep2: "Үйлестіруші аурухана, баға, кеңесті ұйымдастырады",
    emptyStep3: "Кезеңдерді қадағалап, бізге жазыңыз",
    claimCopyBtn: "Науқас сілтемесін көшіру",
    claimCopied: "Көшірілді!",
  },
  zh: {
    emptyHeading: "还没有转介的患者",
    emptySub: "转介第一位患者后，即可在此实时追踪进度。",
    emptyStep1: "用患者信息与资料转介",
    emptyStep2: "协调员匹配医院、报价与会诊",
    emptyStep3: "追踪各阶段并与我们沟通",
    claimCopyBtn: "复制患者链接",
    claimCopied: "已复制！",
  },
  ja: {
    emptyHeading: "まだ紹介した患者はいません",
    emptySub: "最初の患者を紹介すると、ここで進捗をリアルタイムに確認できます。",
    emptyStep1: "患者情報・書類で紹介",
    emptyStep2: "コーディネーターが病院・見積・相談を調整",
    emptyStep3: "各段階を確認しメッセージ",
    claimCopyBtn: "患者リンクをコピー",
    claimCopied: "コピーしました！",
  },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_GUIDE[l] || TR_GUIDE.en);

// 좌측 탭 라벨(진행 현황 / 환자 의뢰) + 진행 단계 표시 — 6개 언어. 위 TR 에 병합.
// stepWord = "단계 3/8" 의 '단계'. advanceHint = 단계가 코디 업데이트로만 전진함을 안내.
const TR_NAV = {
  ko: { navTrack: "진행 현황", navRefer: "환자 의뢰", stepWord: "단계", advanceHint: "단계는 담당 코디네이터가 진행을 업데이트할 때마다 올라갑니다." },
  en: { navTrack: "Progress", navRefer: "Refer patient", stepWord: "Step", advanceHint: "The step advances each time your coordinator updates the case." },
  ru: { navTrack: "Ход", navRefer: "Направить", stepWord: "Этап", advanceHint: "Этап продвигается каждый раз, когда координатор обновляет статус." },
  kz: { navTrack: "Барыс", navRefer: "Жолдау", stepWord: "Кезең", advanceHint: "Кезең үйлестіруші статусты жаңартқан сайын алға жылжиды." },
  zh: { navTrack: "进度", navRefer: "转介患者", stepWord: "步骤", advanceHint: "每当协调员更新病例时，步骤就会前进。" },
  ja: { navTrack: "進捗", navRefer: "患者紹介", stepWord: "ステップ", advanceHint: "ステップは担当コーディネーターが進捗を更新するたびに進みます。" },
};
for (const l of Object.keys(TR)) Object.assign(TR[l], TR_NAV[l] || TR_NAV.en);

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
  const [filter, setFilter] = useState("all"); // all | active | done | hold
  const [query, setQuery] = useState("");
  const [claimCopiedId, setClaimCopiedId] = useState(null); // 환자 연결 링크 복사 버튼 피드백

  const [view, setView] = useState("track"); // 좌측 탭: "track"(진행 현황) | "refer"(환자 의뢰)

  // 환자 의뢰하기 폼
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]); // [{ path, name, type, category }] — 추가 즉시 업로드(인테이크 방식)
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [noteTr, setNoteTr] = useState({}); // 코디 한글 메모 자동번역 { 원문 → 번역문 }
  const fileInputRef = useRef(null);

  // 첨부 추가 = 즉시 Storage 업로드 (path 참조만 보관). 최대 10개.
  const addFiles = async (fileList) => {
    const remaining = 10 - files.length;
    if (remaining <= 0) return;
    setUploading(true); setSubmitMsg(null);
    try {
      for (const file of Array.from(fileList).slice(0, remaining)) {
        const uj = await uploadAttachment(file);
        if (!uj.ok) { setSubmitMsg({ type: "err", text: tt("errUpload") }); continue; }
        setFiles((prev) => [...prev, { path: uj.path, name: uj.name, type: uj.type, category: "other" }]);
      }
    } finally { setUploading(false); }
  };

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

  // 코디 한글 메모 자동번역: 화면 언어가 한국어가 아니면 case_status_note + 타임라인 note 를
  // 한 번에 모아 서버에 번역 요청(캐시 우선). 결과는 원문→번역문 맵. 실패/한국어는 원문 폴백.
  useEffect(() => {
    const cases = data?.cases;
    if (!cases || lang === "ko") { setNoteTr({}); return; }
    const texts = [];
    for (const c of cases) {
      if (c.case_status_note) texts.push(c.case_status_note);
      for (const tl of (c.timeline || [])) if (tl.note) texts.push(tl.note);
    }
    if (texts.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/agency/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ texts, lang }),
        });
        const json = await res.json();
        if (!cancelled && json?.ok && json.translations) setNoteTr(json.translations);
      } catch { /* 실패 시 원문 유지 */ }
    })();
    return () => { cancelled = true; };
  }, [data, lang]);

  // 원문(한글) → 번역문. 없으면 원문 그대로. (서버가 trim 한 키로 저장하므로 trim 폴백)
  const trNote = (t) => (t && lang !== "ko" ? (noteTr[t] || noteTr[String(t).trim()] || t) : t);
  const noteIsTr = (t) => !!(t && lang !== "ko" && (noteTr[t] || noteTr[String(t).trim()]));

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

      // 첨부는 이미 업로드됨 → path 참조만 전달
      const attachments = files.map((f) => ({ path: f.path, name: f.name, type: f.type, category: f.category }));

      // 상세 진단정보(intake) — 빈 값은 제외, "모름" 처리 반영
      const intake = {};
      for (const k of ["sex", "birthYear", "diagnosedHospital", "priorTreatment", "treatmentState"]) {
        if (form[k] && String(form[k]).trim()) intake[k] = String(form[k]).trim();
      }
      intake.stage = form.stageUnknown ? "unknown" : (form.stage || undefined);
      intake.diagnosisDate = form.diagnosisUnknown ? "unknown" : (form.diagnosisDate || undefined);

      const res = await fetch("/api/agency/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, intake, attachments }),
      });
      const json = await res.json();
      if (json.ok) {
        setSubmitMsg({ type: "ok", text: tt("okSubmitted") });
        setForm(EMPTY_FORM);
        setFiles([]);
        setView("track");
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
  if (error) return <Center className="text-red-600">{tt("errServer")}</Center>;

  const steps = data?.statusSteps?.filter((s) => s.order < 90) ?? [];
  const orderOf = (k) => data?.statusSteps?.find((s) => s.key === k)?.order ?? 0;
  const isClinic = wantMedical;
  const partnerKind = isClinic ? tt("kindClinic") : tt("kindAgency");

  const cases = data?.cases ?? [];
  const isActive = (c) => c.case_status && c.case_status !== "completed" && c.case_status !== "on_hold";
  const cnt = {
    total: cases.length,
    active: cases.filter(isActive).length,
    done: cases.filter((c) => c.case_status === "completed").length,
    hold: cases.filter((c) => c.case_status === "on_hold").length,
  };
  const matchFilter = (c) =>
    filter === "all" ? true
      : filter === "done" ? c.case_status === "completed"
      : filter === "hold" ? c.case_status === "on_hold"
      : isActive(c);
  const matchQuery = (c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.nationality, c.cancer_type, c.case_status_note].some((v) => (v || "").toLowerCase().includes(q));
  };
  const filtered = cases.filter((c) => matchFilter(c) && matchQuery(c));
  const TABS = [
    { key: "all", label: "fltAll", count: cnt.total },
    { key: "active", label: "fltActive", count: cnt.active },
    { key: "done", label: "fltDone", count: cnt.done },
    ...(cnt.hold > 0 ? [{ key: "hold", label: "fltHold", count: cnt.hold }] : []),
  ];
  // 백오피스 지표 카드 (코디 대시보드 톤: 작은 컬러 사각 아이콘 + 큰 숫자). 누르면 해당 필터로.
  const STAT_CARDS = [
    { key: "all", icon: ClipboardList, value: cnt.total, label: tt("statTotal"), tone: "bg-teal-50 text-teal-600" },
    { key: "active", icon: Activity, value: cnt.active, label: tt("statActive"), tone: "bg-blue-50 text-blue-600" },
    { key: "done", icon: CheckCircle2, value: cnt.done, label: tt("statDone"), tone: "bg-emerald-50 text-emerald-600" },
    { key: "hold", icon: PauseCircle, value: cnt.hold, label: tt("fltHold"), tone: "bg-amber-50 text-amber-600" },
  ];

  return (
    <>
    {/* 위 여백 = 전역 포털 상단바(h-14 md:h-16) + 안전영역 + 보기용 간격.
        ⚠️ 숫자를 손으로 박지 마라 — 상단바가 커지거나 노치 기기에서 여백이 붙으면 화면이 «가린다».
        (2026-08-03: pt-20 고정값이라 스토어 앱에서 14px 가리고 있었다) */}
    <div className="max-w-5xl mx-auto px-4 pt-[calc(3.5rem+1.5rem+var(--healo-safe-top))] md:pt-[calc(4rem+2rem+var(--healo-safe-top))] pb-10">
      <div className="mb-6">
        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${isClinic ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}>{partnerKind}</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{data?.agency?.name} {tt("titleSuffix")}</h1>
        <p className="text-sm text-gray-500 mt-1">{tt("subtitle")}</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-5">
        {/* 좌측 탭: 진행 현황 ↔ 환자 의뢰 — 어드민 좌측 nav 톤(대문짝 사이즈: 컬러 아이콘칩+굵은 라벨) */}
        <nav className="flex md:flex-col gap-2 md:w-56 shrink-0">
          {[
            { key: "track", label: tt("navTrack"), icon: Activity, badge: cnt.total },
            { key: "refer", label: tt("navRefer"), icon: Plus, badge: null },
          ].map((it) => {
            const on = view === it.key;
            const NIcon = it.icon;
            return (
              <button key={it.key} type="button"
                onClick={() => { setView(it.key); setSubmitMsg(null); }}
                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold transition-all duration-200 ${on ? "bg-teal-700 text-white shadow-md" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"}`}>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-white/20 text-white" : "bg-teal-50 text-teal-600"}`}>
                  <NIcon size={20} />
                </span>
                <span className="flex-1 text-left">{it.label}</span>
                {it.badge != null && it.badge > 0 && (
                  <span className={`text-sm tabular-nums font-semibold rounded-full px-2 py-0.5 ${on ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>{it.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">

      {/* 요약 지표 카드 (코디 대시보드 톤) — 누르면 필터 */}
      {view === "track" && cnt.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const on = filter === card.key;
            return (
              <button key={card.key} type="button" onClick={() => setFilter(card.key)}
                className={`bg-white rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${on ? "border-teal-300 ring-1 ring-teal-200" : "border-gray-100"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.tone}`}>
                    <Icon size={20} />
                  </div>
                  <ArrowRight size={16} className={on ? "text-teal-400" : "text-gray-300"} />
                </div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* 단계가 코디 업데이트로만 전진함을 한 줄 안내 (완료·1단계 혼동 방지) */}
      {view === "track" && cnt.total > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-gray-500 mb-4 -mt-2">
          <Activity size={13} className="mt-0.5 shrink-0" />
          <span>{tt("advanceHint")}</span>
        </p>
      )}

      {submitMsg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${submitMsg.type === "ok" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {submitMsg.text}
        </div>
      )}

      {view === "refer" && (
        <form onSubmit={submitReferral} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-7 mb-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{tt("formHeading")}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{tt("formDesc")}</p>
          </div>

          {/* 환자 기본정보 */}
          <Section title={tt("secPatient")}>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={INP} placeholder={tt("phFirst")} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <input className={INP} placeholder={tt("phLast")} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 mr-1">{tt("phSex")}</span>
              {SEX_OPTS.map((s) => (
                <Chip key={s.v} active={form.sex === s.v} onClick={() => setForm((p) => ({ ...p, sex: p.sex === s.v ? "" : s.v }))}>{tt(s.k)}</Chip>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={INP} inputMode="numeric" placeholder={tt("phBirthYear")} value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
              <input className={INP} placeholder={tt("phNationality")} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            </div>
          </Section>

          {/* 진단 정보 */}
          <Section title={tt("secDiagnosis")}>
            <input className={`${INP} w-full`} placeholder={tt("phCancer")} value={form.treatmentType} onChange={(e) => setForm({ ...form, treatmentType: e.target.value })} />

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">{tt("lblStage")}</p>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <Chip key={s.value} active={form.stage === s.value && !form.stageUnknown} disabled={form.stageUnknown}
                    onClick={() => setForm((p) => ({ ...p, stage: p.stage === s.value ? "" : s.value }))}>{optLabel(s, lang)}</Chip>
                ))}
                <Chip active={form.stageUnknown} onClick={() => setForm((p) => ({ ...p, stageUnknown: !p.stageUnknown, stage: "" }))}>{tt("optUnknown")}</Chip>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">{tt("lblDiagDate")}</p>
              <div className="flex items-center gap-3">
                <input type="date" className={`${INP} flex-1 bg-white disabled:bg-gray-50 disabled:text-gray-500`}
                  value={form.diagnosisDate} disabled={form.diagnosisUnknown}
                  onChange={(e) => setForm({ ...form, diagnosisDate: e.target.value })} />
                <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" className="accent-teal-600" checked={form.diagnosisUnknown}
                    onChange={(e) => setForm({ ...form, diagnosisUnknown: e.target.checked, diagnosisDate: "" })} />
                  {tt("optUnknown")}
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">{tt("lblTreatState")}</p>
              <div className="flex flex-wrap gap-2">
                {TREATMENT_STATES.map((s) => (
                  <Chip key={s.value} active={form.treatmentState === s.value}
                    onClick={() => setForm((p) => ({ ...p, treatmentState: p.treatmentState === s.value ? "" : s.value }))}>
                    {s.label[lang] || s.label.en}
                  </Chip>
                ))}
              </div>
            </div>

            <input className={`${INP} w-full`} placeholder={tt("phDiagnosedHospital")} value={form.diagnosedHospital} onChange={(e) => setForm({ ...form, diagnosedHospital: e.target.value })} />
            <textarea className={`${INP} w-full`} rows={2} placeholder={tt("phPriorTreatment")} value={form.priorTreatment} onChange={(e) => setForm({ ...form, priorTreatment: e.target.value })} />
          </Section>

          {/* 첨부 서류 */}
          <Section title={tt("secDocs")}>
            <p className="text-xs text-gray-500 -mt-1">{tt("docsHint")}</p>
            <div onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-all duration-200 cursor-pointer">
              <UploadCloud size={24} className="mx-auto text-gray-500 mb-2" />
              <p className="text-xs text-gray-500">{uploading ? tt("docUploading") : tt("uploadDrop")}</p>
              <p className="text-[11px] text-gray-500 mt-1">{tt("uploadHint")}</p>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs">
                    <FileIcon size={14} className="text-teal-700 shrink-0" />
                    <span className="flex-1 truncate text-teal-800 font-medium">{it.name}</span>
                    <select className="border border-teal-200 rounded-md px-1.5 py-1 bg-white text-gray-600"
                      value={it.category} onChange={(e) => setFiles(files.map((f, j) => (j === i ? { ...f, category: e.target.value } : f)))}>
                      <option value="chart">{tt("catChart")}</option>
                      <option value="diagnosis">{tt("catDiagnosis")}</option>
                      <option value="test">{tt("catTest")}</option>
                      <option value="other">{tt("catOther")}</option>
                    </select>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="p-1 rounded-full text-teal-700 hover:bg-teal-100"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 연락처 */}
          <Section title={tt("secContact")}>
            <p className="text-xs text-gray-500 -mt-1">{tt("contactLabel")}</p>
            <input className={`${INP} w-full`} placeholder={tt("phEmail")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="flex gap-2">
              <select className={`${INP} bg-white shrink-0`} value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="wechat">WeChat</option>
                <option value="line">LINE</option>
                <option value="phone">{tt("optPhone")}</option>
              </select>
              <input className={`${INP} flex-1`} placeholder={tt("phContactId")} value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} />
            </div>
            <textarea className={`${INP} w-full`} rows={2} placeholder={tt("phMemo") || ""} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </Section>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setView("track"); setSubmitMsg(null); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">{tt("btnCancel")}</button>
            <button type="submit" disabled={submitting || uploading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all duration-200 disabled:opacity-40">
              {submitting ? tt("btnSubmitting") : tt("btnSubmit")}
            </button>
          </div>
        </form>
      )}

      {view === "track" && (cases.length === 0 ? (
        <div className="text-center py-14 px-4 bg-white border border-gray-100 rounded-2xl">
          <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-teal-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">{tt("emptyHeading")}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{tt("emptySub")}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5 mb-6 text-xs text-gray-600">
            {[tt("emptyStep1"), tt("emptyStep2"), tt("emptyStep3")].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setView("refer"); setSubmitMsg(null); }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition-all duration-200">
            <Plus size={16} />{tt("btnRefer")}
          </button>
        </div>
      ) : (
        <>
          {/* 필터 탭 + 검색 (DESIGN: 알약 rounded-full, tabular-nums, duration-200) */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${filter === t.key ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {tt(t.label)} <span className="tabular-nums opacity-70">{t.count}</span>
              </button>
            ))}
            <input className={`${INP} ml-auto w-full sm:w-56`} placeholder={tt("searchPh")}
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">{tt("noMatch")}</p>
          ) : (
            <div className="space-y-3">
          {filtered.map((c) => {
            const curOrder = orderOf(c.case_status);
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5">
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{c.name} · {c.cancer_type}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>{c.nationality}</span>
                        {c.attachments?.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-gray-500"><Paperclip size={11} />{c.attachments.length}</span>
                        )}
                        {c.estimates?.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600"><FileText size={11} />{c.estimates.length}</span>
                        )}
                        {c.thread?.unread > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-white bg-red-600 rounded-full px-1.5 font-semibold"><MessageCircle size={10} />{c.thread.unread}</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 shrink-0 ${openId === c.id ? "rotate-180" : ""}`} />
                  </div>
                  {/* 현재 단계 — 이름 + 위치(N/8) 크게, 완료·보류는 색으로 구분 */}
                  {(() => {
                    const isHold = c.case_status === "on_hold";
                    const isDone = c.case_status === "completed";
                    const total = steps.length; // 실단계 6 (보류 제외)
                    return (
                      <div className="flex items-center flex-wrap gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-lg ${
                          isHold ? "bg-amber-50 text-amber-700"
                          : isDone ? "bg-emerald-600 text-white"
                          : c.case_status ? "bg-teal-700 text-white"
                          : "bg-gray-100 text-gray-600"}`}>
                          {isDone && <CheckCircle2 size={14} className="shrink-0" />}
                          {isHold && <PauseCircle size={14} className="shrink-0" />}
                          {caseStatusLabelL(c.case_status, lang)}
                        </span>
                        {c.case_status && !isHold && (
                          <span className="text-xs font-semibold text-gray-600 tabular-nums">{tt("stepWord")} {curOrder}/{total}</span>
                        )}
                      </div>
                    );
                  })()}
                  {/* 단계 진행 바 — 완료는 진한 초록, 진행 중은 teal */}
                  <div className="flex items-center gap-1">
                    {steps.map((s) => {
                      const filled = s.order <= curOrder && c.case_status !== "on_hold";
                      const done = c.case_status === "completed";
                      return (
                        <div key={s.key} className="flex-1 h-2 rounded-full transition-colors"
                          style={{ background: filled ? (done ? "#059669" : "#14b8a6") : "#e5e7eb" }} title={caseStatusLabelL(s.key, lang)} />
                      );
                    })}
                  </div>
                  {c.case_status_note && (
                    <p className="text-xs text-gray-500 mt-2" title={noteIsTr(c.case_status_note) ? c.case_status_note : undefined}>
                      {trNote(c.case_status_note)}
                      {noteIsTr(c.case_status_note) && <Languages size={11} className="inline-block ml-1 -mt-0.5 text-gray-300" />}
                    </p>
                  )}
                  {/* 안내문구는 nextStepGuide.ts 단일 정의 — 공개 진행상황 화면(/claim/[token])이
                      같은 말을 해야 해서 꺼냈다. 구단계 값 별칭 해석도 그 안에서 한다. */}
                  {nextStepGuide(c.case_status, lang) && (
                    <p className="text-xs text-teal-700 bg-teal-50/70 rounded-lg px-2.5 py-1.5 mt-2 flex items-start gap-1.5">
                      <ArrowRight size={12} className="mt-0.5 shrink-0" />
                      <span>{nextStepGuide(c.case_status, lang)}</span>
                    </p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    {c.insurance_status && <span>{tt("insuranceLabel")} {c.insurance_status}</span>}
                    {c.case_status_updated_at && <span>{tt("updatedLabel")} {new Date(c.case_status_updated_at).toLocaleDateString()}</span>}
                  </div>
                </button>

                {/* 계정 미연결 케이스만 — 환자 계정연결(claim) 링크를 복사해 공유 */}
                {!c.has_account && c.public_token && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/claim/${c.public_token}`;
                      navigator.clipboard.writeText(url).then(() => {
                        setClaimCopiedId(c.id);
                        setTimeout(() => setClaimCopiedId((prev) => (prev === c.id ? null : prev)), 2000);
                      });
                    }}
                    className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                  >
                    {claimCopiedId === c.id ? <Check size={12} /> : <Link2 size={12} />} {claimCopiedId === c.id ? tt("claimCopied") : tt("claimCopyBtn")}
                  </button>
                )}

                {openId === c.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* 환자 정보 (의뢰 시 받은 상세) */}
                    {(detailRows(c.detail, tt, lang).length > 0 || c.detail?.priorTreatment) && (
                      <div>
                        <p className="text-xs font-bold text-gray-600 mb-2">{tt("lblPatientInfo")}</p>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                          {detailRows(c.detail, tt, lang).map((row) => (
                            <div key={row.label}>
                              <dt className="text-[11px] text-gray-500">{row.label}</dt>
                              <dd className="text-sm text-gray-800">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                        {c.detail?.priorTreatment && (
                          <div className="mt-2.5">
                            <dt className="text-[11px] text-gray-500">{tt("lblPriorTx")}</dt>
                            <dd className="text-sm text-gray-700 whitespace-pre-wrap">{c.detail.priorTreatment}</dd>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 진행 이력 (세로 타임라인) */}
                    <div>
                      <p className="text-xs font-bold text-gray-600 mb-2">{tt("lblTimeline")}</p>
                      {c.timeline.length === 0 ? (
                        <p className="text-xs text-gray-500">{tt("timelineEmpty")}</p>
                      ) : (
                        <ol className="relative border-l border-gray-200 ml-[5px] space-y-3.5">
                          {c.timeline.map((tl, i) => (
                            <li key={i} className="ml-4">
                              <span className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-white" />
                              <div className="text-[11px] text-gray-500">{new Date(tl.at).toLocaleDateString()}</div>
                              <div className="text-sm text-gray-700" title={noteIsTr(tl.note) ? tl.note : undefined}><b>{caseStatusLabelL(tl.status, lang)}</b>{tl.note ? ` — ${trNote(tl.note)}` : ""}{noteIsTr(tl.note) && <Languages size={11} className="inline-block ml-1 -mt-0.5 text-gray-300" />}</div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>

                    {/* 환자 활동 — 진행상황 링크에서 환자가 남긴 글·증상·재진 요청 (2026-09-06) */}
                    <PatientActivity a={c.activity} tt={tt} />

                    {/* 액션 + 첨부 (에이전시) / 경과 업로드 (의료기관) */}
                    {!isClinic && <CaseActions c={c} tt={tt} onDone={load} />}
                    {isClinic && <ClinicProgressPanel inquiryId={c.id} tt={tt} />}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </>
      ))}
        </div>
      </div>
    </div>
    <ManualDrawer role={isClinic ? "clinic" : "agency"} buttonLabel={tt("manualBtn")} />
    </>
  );
}

function Center({ children, className = "" }) {
  // 위 여백은 전역 포털 상단바 + 안전영역만큼 «먼저» 비우고 그 뒤에 보기용 간격을 준다.
  return <div className={`max-w-3xl mx-auto px-4 pt-[calc(3.5rem+4rem+var(--healo-safe-top))] pb-24 text-center text-gray-500 ${className}`}>{children}</div>;
}

// 폼 섹션 — 제목 + 내용 묶음 (인테이크 폼처럼 명확한 구획)
function Section({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1">{title}</legend>
      {children}
    </fieldset>
  );
}

// 선택 칩 (인테이크 폼과 동일 스타일: border-2, 선택 시 teal)
function Chip({ active, onClick, disabled = false, children }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
        active ? "border-teal-500 bg-teal-50 text-teal-700"
               : "border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40"
      }`}>
      {children}
    </button>
  );
}

const catKey = (c) => ({ chart: "catChart", diagnosis: "catDiagnosis", test: "catTest" }[c] || "catOther");

// 케이스 상세 — intake 화이트리스트(detail)를 라벨·값으로 변환 (priorTreatment 는 긴 텍스트라 따로)
function detailRows(d, tt, lang) {
  if (!d) return [];
  const rows = [];
  const push = (label, value) => { if (value != null && value !== "") rows.push({ label, value }); };
  if (d.sex) push(tt("phSex"), tt(d.sex === "male" ? "optMale" : "optFemale"));
  push(tt("lblBirthYear"), d.birthYear);
  // ⚠️ 2026-08-03 자가감사에서 잡힘: 위 「병기 칩」은 사전으로 옮겼는데 **여기 상세 표시만
  //    `Stage ${값}` 조립으로 남아 있었다.** 앞선 점검이 JSX 형태(`Stage {s}`)만 찾아
  //    이 글자 이어붙이기(백틱)를 놓쳤다 — 같은 화면 안에서 입력은 「3기」, 상세는 「Stage III」로 갈렸다.
  if (d.stage) push(tt("lblStage"), d.stage === "unknown" ? tt("optUnknown") : stageLabel(d.stage, lang));
  if (d.diagnosisDate) push(tt("lblDiagDate"), d.diagnosisDate === "unknown" ? tt("optUnknown") : d.diagnosisDate);
  if (d.treatmentState) {
    const s = TREATMENT_STATES.find((x) => x.value === d.treatmentState);
    push(tt("lblTreatState"), s ? (s.label[lang] || s.label.en) : d.treatmentState);
  }
  push(tt("lblHospital"), d.diagnosedHospital);
  return rows;
}

// 코디 운영시간: 한국시간(KST=UTC+9) 월–금 09:00–18:00
function kstHoursOpen() {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  const day = kst.getDay(); // 0=일 … 6=토
  const h = kst.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}

const fmtKRW = (n) => (n != null ? `₩${Number(n).toLocaleString()}` : null);
const fmtUSD = (n) => (n != null ? `$${Number(n).toLocaleString()}` : null);
const CONS_STATUS_KEY = {
  scheduled: "consScheduled", in_progress: "consLive", live: "consLive",
  completed: "consDone", done: "consDone", cancelled: "consCancelled", canceled: "consCancelled",
};

// 에이전시 케이스 액션: 견적 보기 / 화상상담 일정 / 문서함 / 화상상담 요청·자료추가 / 코디와 양방향 메신저
/** 환자 활동 — 에이전시·의료기관이 «환자가 플랫폼에 직접 남긴 것»을 본다. 판정 근거 문장은 코디만 본다. */
function PatientActivity({ a, tt }) {
  const notes = a?.notes || [], symptoms = a?.symptoms || [], requests = a?.requests || [];
  const items = [
    ...requests.map((r) => ({ kind: "request", at: r.at, text: r.reason || "" })),
    ...symptoms.map((x) => ({ kind: "symptom", at: x.at, text: x.text, severity: x.severity, urgency: x.urgency })),
    ...notes.map((n) => ({ kind: "note", at: n.at, text: n.text })),
  ].sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 12);
  const URG_CLS = { emergency: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-gray-100 text-gray-600" };
  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-600 mb-2">{tt("lblActivity")}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">{tt("activityEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${it.kind === "request" ? "bg-teal-100 text-teal-800" : it.kind === "symptom" ? (URG_CLS[it.urgency] || URG_CLS.low) : "bg-gray-100 text-gray-700"}`}>
                  {it.kind === "request" ? tt("actRequest") : it.kind === "symptom" ? `${tt("actSymptom")} · ${tt("urg_" + (it.urgency || "low"))}` : tt("actNote")}
                </span>
                {it.kind === "symptom" && it.severity != null && <span>{tt("actSeverity")} {it.severity}/10</span>}
                <span>{it.at ? new Date(it.at).toLocaleDateString() : ""}</span>
              </div>
              {it.text && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{it.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseActions({ c, tt, onDone }) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const getToken = async () => (await supabase.auth.getSession()).data?.session?.access_token;

  const post = async (payload) => {
    setBusy(true); setMsg(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/agency/cases/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) { setMsg({ type: "ok", text: tt("actSent") }); await onDone(); }
      else setMsg({ type: "err", text: tt("actErr") });
    } catch { setMsg({ type: "err", text: tt("actErr") }); }
    finally { setBusy(false); }
  };

  const onFiles = async (e) => {
    const fs = Array.from(e.target.files || []);
    e.target.value = "";
    if (!fs.length) return;
    setUploading(true); setMsg(null);
    try {
      const attachments = [];
      for (const file of fs) {
        const uj = await uploadAttachment(file);
        if (!uj.ok) { setMsg({ type: "err", text: tt("errUpload") }); return; }
        attachments.push({ path: uj.path, name: uj.name, type: uj.type, category: "other" });
      }
      await post({ action: "attach", attachments });
    } finally { setUploading(false); }
  };

  // 문서함: 카테고리별 그룹
  const docGroups = {};
  (c.attachments || []).forEach((a) => { (docGroups[a.category || "other"] ||= []).push(a); });

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
      {/* 견적 (코디 발행) */}
      {c.estimates?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1"><FileText size={13} className="text-emerald-600" />{tt("estTitle")}</p>
          <div className="space-y-1.5">
            {c.estimates.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-emerald-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="font-semibold text-emerald-800">
                    {[fmtKRW(e.total_krw), fmtUSD(e.total_usd)].filter(Boolean).join(" · ") || `${tt("estNo")} ${e.quotation_no || ""}`}
                  </div>
                  <div className="text-[11px] text-emerald-700/70">
                    {e.quotation_no ? `${tt("estNo")} ${e.quotation_no} · ` : ""}{e.issued_at ? new Date(e.issued_at).toLocaleDateString() : ""}
                  </div>
                </div>
                {e.pdf_url && <a href={e.pdf_url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700">{tt("estView")}</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 화상상담 일정·상태 */}
      {c.consultations?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1"><Video size={13} className="text-indigo-600" />{tt("consTitle")}</p>
          <div className="space-y-1.5">
            {c.consultations.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-xs bg-indigo-50 rounded-lg px-3 py-2">
                <span className="text-indigo-900">
                  {s.scheduled_at ? kstDateTime(s.scheduled_at) : "—"}
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-white text-indigo-700 font-semibold border border-indigo-200">
                  {tt(CONS_STATUS_KEY[s.status] || "consScheduled")}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{tt("consJoinNote")}</p>
        </div>
      )}

      {/* 전문의 소견 — 코디가 공개(교정본)한 것만 */}
      {c.opinions?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1"><Stethoscope size={13} className="text-blue-600" />{tt("opinTitle")}</p>
          <div className="space-y-1.5">
            {c.opinions.map((o, i) => (
              <div key={i} className="text-xs bg-blue-50 rounded-lg px-3 py-2">
                <div className="font-semibold text-blue-800 mb-0.5">{o.doctor}</div>
                <p className="text-blue-900 whitespace-pre-wrap leading-relaxed">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 문서함 (카테고리별) */}
      {c.attachments?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1"><Paperclip size={13} />{tt("docsTitle")}</p>
          <div className="space-y-2">
            {Object.entries(docGroups).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">{tt(catKey(cat))} <span className="opacity-60">{items.length}</span></p>
                <div className="space-y-1">
                  {items.map((a, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="truncate text-gray-700">{a.name || tt(catKey(cat))}</span>
                      {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline shrink-0">{tt("attView")}</a>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼: 코디와 대화(주요) / 화상상담 요청 / 자료 추가 */}
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={() => setChatOpen(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-teal-700 text-white hover:bg-teal-700 transition-all duration-200 flex items-center gap-1.5">
          <MessageCircle size={15} />{tt("msgrTitle")}
          {c.thread?.unread > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-teal-700 text-[11px] font-bold tabular-nums">{c.thread.unread}</span>
          )}
        </button>
        <button type="button" disabled={busy}
          onClick={() => { if (window.confirm(tt("consultConfirm"))) post({ action: "request_consult" }); }}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-all duration-200 disabled:opacity-40">
          {tt("actConsult")}
        </button>
        <label className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all duration-200 cursor-pointer">
          {uploading ? tt("attUploading") : tt("actAttach")}
          <input type="file" multiple className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/gif,image/webp"
            onChange={onFiles} />
        </label>
      </div>
      {msg && <p className={`text-xs ${msg.type === "ok" ? "text-teal-700" : "text-red-600"}`}>{msg.text}</p>}

      {/* 코디와 양방향 메신저 — 별도 대화창(드로어) */}
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} inquiryId={c.id} caseName={`${c.name} · ${c.cancer_type}`} tt={tt} getToken={getToken} />
    </div>
  );
}

// 에이전시 ↔ 코디 양방향 메신저 — 오른쪽 슬라이드 대화창(드로어). 열려 있을 때만 8초 폴링.
function ChatDrawer({ open, onClose, inquiryId, caseName, tt, getToken }) {
  const lang = useLang();
  const [messages, setMessages] = useState([]);
  const [msgTr, setMsgTr] = useState({}); // 코디 한글 메시지 자동번역 { 원문 → 번역문 }
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef(null);
  const hoursOpen = kstHoursOpen();

  const fetchMessages = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/agency/cases/${inquiryId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) setMessages(json.messages || []);
    } catch { /* 폴링 실패 무시 */ }
    finally { setLoaded(true); }
  };

  // 열렸을 때만 로드+폴링
  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    fetchMessages();
    // 탭이 안 보이는 동안엔 건너뛴다 — 대화창을 열어둔 채 다른 창으로 가도 8초 폴링은 계속
    // 돈다(2026-07-24 상담방 탭이 같은 이유로 IO 예산 고갈, POSTMORTEMS #120).
    // 탭이 다시 보이면 다음 tick(최대 8초)에 자동으로 따라잡는다.
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchMessages();
    }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inquiryId]);

  // ESC 로 닫기 + body 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: scrollBehavior() }); }, [messages.length, open]);

  // 코디(상대) 메시지 자동번역 — 내가 쓴 것(agency)은 제외, 나머지 한글 메시지만 상대 언어로.
  useEffect(() => {
    if (lang === "ko") { setMsgTr({}); return; }
    const texts = messages.filter((m) => m.actor_type !== "agency" && m.message_text).map((m) => m.message_text);
    if (texts.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/agency/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ texts, lang }),
        });
        const json = await res.json();
        if (!cancelled && json?.ok && json.translations) setMsgTr((prev) => ({ ...prev, ...json.translations }));
      } catch { /* 실패 시 원문 유지 */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, lang]);
  const trMsg = (t) => (t && lang !== "ko" ? (msgTr[t] || msgTr[String(t).trim()] || t) : t);
  const msgIsTr = (t) => !!(t && lang !== "ko" && (msgTr[t] || msgTr[String(t).trim()]));

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/agency/cases/${inquiryId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.ok && json.message) { setMessages((m) => [...m, json.message]); setDraft(""); }
    } finally { setSending(false); }
  };

  return (
    // inert: 닫혔을 때 안쪽 요소를 Tab 순서에서도 제거(ManualDrawer 와 같은 부류 — aria-hidden 인데 포커스 가능)
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} aria-hidden={!open} inert={!open}>
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* 패널 */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold text-gray-900 flex items-center gap-1.5"><MessageCircle size={16} className="text-teal-600" />{tt("msgrTitle")}</div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">{caseName}</div>
            <div className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${hoursOpen ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hoursOpen ? "bg-teal-500" : "bg-gray-400"}`} />
              {hoursOpen ? tt("msgrOpen") : tt("msgrClosed")}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="close"
            className="p-1.5 -mr-1 rounded-lg text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* 운영시간 외 안내 */}
        {!hoursOpen && (
          <div className="px-5 py-2.5 text-[12px] text-amber-700 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
            <Clock size={13} className="shrink-0" />{tt("msgrHours")}
          </div>
        )}

        {/* 메시지 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50 space-y-3">
          {!loaded ? (
            // 로딩 스켈레톤 (DESIGN: 빈 화면 대신 맥락)
            <div className="space-y-3 animate-pulse">
              <div className="flex justify-start"><div className="h-9 w-40 bg-gray-200 rounded-2xl rounded-bl-md" /></div>
              <div className="flex justify-end"><div className="h-9 w-32 bg-gray-200 rounded-2xl rounded-br-md" /></div>
              <div className="flex justify-start"><div className="h-9 w-48 bg-gray-200 rounded-2xl rounded-bl-md" /></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 mx-auto rounded-xl bg-teal-50 flex items-center justify-center mb-3"><MessageCircle size={18} className="text-teal-500" /></div>
              <p className="text-sm text-gray-500 max-w-[260px] mx-auto leading-relaxed">{tt("msgrEmpty")}</p>
            </div>
          ) : messages.map((m) => {
            const mine = m.actor_type === "agency";
            const coord = m.actor_type === "coordinator" || m.actor_type === "admin";
            if (!mine && !coord) {
              // 시스템 메시지 — 가운데 칩 (한글이면 상대 언어로 번역)
              return <div key={m.id} className="text-center"><span className="inline-block text-[11px] text-gray-600 bg-gray-100 rounded-full px-3 py-1" title={msgIsTr(m.message_text) ? m.message_text : undefined}>{trMsg(m.message_text)}</span></div>;
            }
            const who = mine ? tt("msgrYou") : tt("msgrCoord");
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <span className="text-[10px] text-gray-600 mb-1 px-1">{who} · {new Date(m.created_at).toLocaleString()}</span>
                <div className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                  mine ? "bg-teal-700 text-white rounded-2xl rounded-br-md" : "bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md"
                }`} title={!mine && msgIsTr(m.message_text) ? m.message_text : undefined}>
                  {mine ? m.message_text : trMsg(m.message_text)}
                  {!mine && msgIsTr(m.message_text) && <Languages size={11} className="inline-block ml-1 -mt-0.5 text-gray-300" />}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* 입력 */}
        <div className="border-t border-gray-100 bg-white p-3 flex gap-2 items-end">
          <textarea rows={1} value={draft}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 max-h-32"
            placeholder={tt("msgrPh")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button type="button" disabled={sending || !draft.trim()} onClick={send}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-700 text-white hover:bg-teal-700 transition-all duration-200 disabled:opacity-40 shrink-0 flex items-center gap-1.5">
            <Send size={15} />{sending ? tt("msgSending") : tt("msgSend")}
          </button>
        </div>
      </div>
    </div>
  );
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
      const authFetch = (url, init) =>
        fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
      const fields = { inquiryId: String(inquiryId), recordType, note: note.trim() || undefined };

      // 파일이 있으면 Storage 직행(서명 URL → PUT → 기록 저장), 없으면 메모만 저장.
      const json = file
        ? await uploadDirect("/api/khidi/progress", file, fields, { fetch: authFetch })
        : await authFetch("/api/khidi/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          }).then((r) => r.json().catch(() => ({ ok: false })));

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
        <p className="text-xs text-gray-500">…</p>
      ) : records.length === 0 ? (
        <p className="text-xs text-gray-500 mb-3">{tt("progressEmpty")}</p>
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
                <span className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
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
        <p className="text-[11px] text-gray-500">{tt("progressFile")}</p>
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
