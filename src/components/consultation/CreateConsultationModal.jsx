"use client";

/**
 * 새 원격상담 예약 모달 (공용) — admin·coordinator 둘 다 사용.
 * 단일 SoR: 상담 생성/초대링크 로직을 한 곳에만 둬 화면별 분기를 막는다(POSTMORTEM #28 교훈).
 * 드롭다운(문의/유저 picker)·생성·초대 API는 staff(admin·coordinator) 권한.
 */
import { useState, useEffect } from "react";
import { Video, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useBackofficeLang } from "@/lib/i18n/coordinator";
import QRCode from "qrcode";

const supabase = createSupabaseBrowserClient();

// 스태프 백오피스 6개 언어화(2026-07-09 PO 결정 — 예외 없이 전체 다국어 전환). admin·coordinator 공용.
const LOCALE_MAP = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };
const TR = {
  ko: {
    errAuth: "인증 오류 — 다시 로그인하세요", errCreateFailedTpl: "생성 실패: {msg}", errCreateFailed: "생성 실패",
    doneTitle: "상담 예약 생성 완료", doneDesc: "아래 참여 링크를 모든 참여자에게 공유하세요.",
    inviteLinkLabelTpl: "{role} 초대 링크",
    noteHeading: "📋 전달 시 참고사항",
    noteItem1Prefix: "이 링크 ", noteItem1Bold: "하나", noteItem1Suffix: "를 환자·의사·통역 등 모든 참여자에게 공유 (각자 이름 입력 후 입장)",
    noteItem2: "환자는 이메일/카카오톡/SMS, 의료진은 내부 메신저 권장",
    noteItem3: "링크 유출 방지 — 공개된 곳에 올리지 않기",
    noteItem4: "예정 30분 전 자동 리마인더 발송됨 (환자 이메일 입력 시)",
    noInvitesMsg: "초대 링크 생성 대상이 없거나 모두 실패했습니다. 세션은 생성되었으니 목록에서 개별 발급하세요.",
    btnClose: "닫기", modalTitle: "새 원격 상담 예약", modalDesc: "환자-의사 간 WebRTC 화상 세션 생성",
    linkBoxTitle: "🔗 참여 링크 (계정 불필요)",
    linkBoxDescPrefix: "상담을 만들면 ", linkBoxDescBold: "참여 링크 1개", linkBoxDescSuffix: "가 생성됩니다. 환자·의사·통역 등 모든 참여자에게 이 링크 하나만 공유하세요. 각자 이름을 입력하고 입장합니다 (만료: 상담 시각 +12시간, 최소 72시간).",
    lblSelectFromInquiry: "문의에서 환자 선택 (선택)", inquirySelectPlaceholder: "— 문의 목록에서 선택 (이름·이메일·언어 자동 입력) —",
    inquiryNameUnknown: "(이름 미상)", inquiryHint: "문의를 고르면 환자 이름·이메일이 자동 입력됩니다(자동 발송용). 이메일이 없으면 링크를 복사해 직접 전달하세요.",
    phInviteeName: "대표 수신자(환자) 이름 — 문의 선택 시 자동", phInviteeEmail: "대표 수신자(환자) 이메일 (선택) — 입력 시 자동 발송·리마인더",
    lblScheduledAt: "예약 시각 (KST · 한국 시간 기준)",
    advancedOptions: "고급 옵션 (선택)", advancedOptionsHint: "세션 유형 · 코디 · 병원/의사 · 언어 · 비고",
    lblSessionType: "세션 유형", sessionTypePre: "진료 전 평가", sessionTypeFollow: "추후 진료", sessionTypeEmergency: "긴급 상담", sessionTypePartner: "파트너 미팅(에이전시·병원)", sessionTypePartnerHint: "KHIDI 실적(사전상담·사후관리)에는 집계되지 않습니다.",
    lblPatientAccount: "환자 계정 (선택 — 기존 계정)", phPatientAccount: "비워두면 게스트 링크 전용",
    lblCoordinatorSelect: "담당 코디네이터 (지정 코디 목록)",
    lblPatientLang: "환자 언어", langRu: "러시아어", langKz: "카자흐어", langEn: "영어", langZh: "중국어",
    lblDoctorLang: "의사 언어", langKo: "한국어",
    hospitalBoxTitle: "🏥 병원 / 의사 지정 (선택) — 환자 이메일 & UI 에 표시됨",
    lblHospital: "병원", optNone: "(선택 안함)", lblAssignedDoctor: "담당 의사",
    hintSelectHospitalFirst: "병원 먼저 선택", noDoctorsRegistered: "등록된 의사 없음",
    lblNotes: "비고 (선택)", phNotes: "상담 목적 / 주요 증상 / 사전 확인 필요 사항 등", notesInquiryPrefix: "문의",
    btnCancel: "취소", btnSubmitting: "생성 중…", btnSubmit: "상담 예약 생성",
    noRoleAccountsTpl: "등록된 {role} 계정 없음 — 회원가입 후 역할 부여 필요", roleDoctor: "의사", roleCoordinator: "코디네이터",
    selectPlaceholder: "— 선택 —", btnChange: "변경", phSearchEmail: "이메일로 검색", searching: "검색 중...", noMatchingAccounts: "일치하는 계정 없음",
    rolePatient: "🧑 환자", roleDoctorLabel: "👨‍⚕️ 의사", roleTranslator: "🗣 통역사", roleCoordinatorLabel: "🤝 코디네이터", roleObserver: "👁 참관자", roleGuest: "🔗 참여",
    defaultInviteLabel: "환자 초대 링크 (계정 불필요)", btnCopy: "복사", toastCopyDone: "링크 복사 완료", toastCopyFail: "복사 실패",
    expiresPrefix: "만료:", qrScanTitle: "📱 모바일 QR 스캔",
    qrScanDesc: "환자가 자기 핸드폰 카메라로 스캔하면 앱 설치 없이 바로 접속. 이메일에 링크 + QR 둘 다 넣는 걸 권장.",
    btnDownloadPng: "PNG 다운로드",
  },
  en: {
    errAuth: "Authentication error — please log in again", errCreateFailedTpl: "Creation failed: {msg}", errCreateFailed: "Creation failed",
    doneTitle: "Consultation scheduled", doneDesc: "Share the join link below with all participants.",
    inviteLinkLabelTpl: "{role} invite link",
    noteHeading: "📋 Notes when sharing",
    noteItem1Prefix: "Share this ", noteItem1Bold: "one link", noteItem1Suffix: " with all participants — patient, doctor, interpreter, etc. (each enters their own name to join)",
    noteItem2: "Recommend email/KakaoTalk/SMS for patients, internal messenger for medical staff",
    noteItem3: "Prevent link leaks — don't post it anywhere public",
    noteItem4: "An automatic reminder is sent 30 minutes before the scheduled time (if the patient's email is entered)",
    noInvitesMsg: "No invite target or all invite creations failed. The session was still created — issue links individually from the list.",
    btnClose: "Close", modalTitle: "New Telemedicine Consultation", modalDesc: "Create a WebRTC video session between patient and doctor",
    linkBoxTitle: "🔗 Join link (no account needed)",
    linkBoxDescPrefix: "Creating the consultation generates ", linkBoxDescBold: "one join link", linkBoxDescSuffix: ". Share this single link with all participants — patient, doctor, interpreter, etc. Each enters their name to join (valid until 12 hours after the scheduled time, at least 72 hours).",
    lblSelectFromInquiry: "Select patient from inquiries (optional)", inquirySelectPlaceholder: "— Select from inquiry list (auto-fills name / email / language) —",
    inquiryNameUnknown: "(name unknown)", inquiryHint: "Selecting an inquiry auto-fills the patient's name/email (for auto-send). If there's no email, copy the link and share it manually.",
    phInviteeName: "Primary recipient (patient) name — auto-filled when an inquiry is selected", phInviteeEmail: "Primary recipient (patient) email (optional) — enables auto-send & reminders",
    lblScheduledAt: "Scheduled time (KST · Korea time)",
    advancedOptions: "Advanced options (optional)", advancedOptionsHint: "Session type · coordinator · hospital/doctor · language · notes",
    lblSessionType: "Session type", sessionTypePre: "Pre-treatment assessment", sessionTypeFollow: "Follow-up", sessionTypeEmergency: "Emergency consult", sessionTypePartner: "Partner meeting (agency/hospital)", sessionTypePartnerHint: "Not counted toward KHIDI figures (pre-consultation / follow-up).",
    lblPatientAccount: "Patient account (optional — existing account)", phPatientAccount: "Leave blank for guest-link only",
    lblCoordinatorSelect: "Assigned coordinator (from coordinator list)",
    lblPatientLang: "Patient language", langRu: "Russian", langKz: "Kazakh", langEn: "English", langZh: "Chinese",
    lblDoctorLang: "Doctor language", langKo: "Korean",
    hospitalBoxTitle: "🏥 Assign hospital / doctor (optional) — shown in patient email & UI",
    lblHospital: "Hospital", optNone: "(none)", lblAssignedDoctor: "Assigned doctor",
    hintSelectHospitalFirst: "Select a hospital first", noDoctorsRegistered: "No doctors registered",
    lblNotes: "Notes (optional)", phNotes: "Purpose of the consultation / key symptoms / anything to check beforehand", notesInquiryPrefix: "Inquiry",
    btnCancel: "Cancel", btnSubmitting: "Creating…", btnSubmit: "Schedule consultation",
    noRoleAccountsTpl: "No {role} accounts registered — sign up and assign the role first", roleDoctor: "doctor", roleCoordinator: "coordinator",
    selectPlaceholder: "— Select —", btnChange: "Change", phSearchEmail: "Search by email", searching: "Searching...", noMatchingAccounts: "No matching accounts",
    rolePatient: "🧑 Patient", roleDoctorLabel: "👨‍⚕️ Doctor", roleTranslator: "🗣 Interpreter", roleCoordinatorLabel: "🤝 Coordinator", roleObserver: "👁 Observer", roleGuest: "🔗 Participant",
    defaultInviteLabel: "Patient invite link (no account needed)", btnCopy: "Copy", toastCopyDone: "Link copied", toastCopyFail: "Copy failed",
    expiresPrefix: "Expires:", qrScanTitle: "📱 Scan on mobile",
    qrScanDesc: "The patient can scan with their phone camera to join instantly, no app install needed. Recommend including both the link and QR in the email.",
    btnDownloadPng: "Download PNG",
  },
  ru: {
    errAuth: "Ошибка авторизации — войдите снова", errCreateFailedTpl: "Не удалось создать: {msg}", errCreateFailed: "Не удалось создать",
    doneTitle: "Консультация запланирована", doneDesc: "Отправьте ссылку для входа ниже всем участникам.",
    inviteLinkLabelTpl: "Ссылка-приглашение: {role}",
    noteHeading: "📋 При передаче учтите",
    noteItem1Prefix: "Отправьте эту ", noteItem1Bold: "одну ссылку", noteItem1Suffix: " всем участникам — пациенту, врачу, переводчику и т.д. (каждый вводит своё имя при входе)",
    noteItem2: "Пациентам — email/KakaoTalk/SMS, медперсоналу — внутренний мессенджер",
    noteItem3: "Не публикуйте ссылку — избегайте утечки",
    noteItem4: "Автоматическое напоминание отправляется за 30 минут до начала (если указан email пациента)",
    noInvitesMsg: "Нет получателей ссылки, или все попытки создания не удались. Сессия всё же создана — выдайте ссылки по отдельности из списка.",
    btnClose: "Закрыть", modalTitle: "Новая телеконсультация", modalDesc: "Создать видеосессию WebRTC между пациентом и врачом",
    linkBoxTitle: "🔗 Ссылка для входа (аккаунт не нужен)",
    linkBoxDescPrefix: "При создании консультации формируется ", linkBoxDescBold: "одна ссылка для входа", linkBoxDescSuffix: ". Отправьте эту единственную ссылку всем участникам — пациенту, врачу, переводчику и т.д. Каждый вводит своё имя при входе (действует до 12 часов после назначенного времени, но не менее 72 часов).",
    lblSelectFromInquiry: "Выбрать пациента из заявок (необязательно)", inquirySelectPlaceholder: "— Выбрать из списка заявок (имя/email/язык заполнятся автоматически) —",
    inquiryNameUnknown: "(имя неизвестно)", inquiryHint: "При выборе заявки имя/email пациента заполнятся автоматически (для автоотправки). Если email нет, скопируйте ссылку и передайте вручную.",
    phInviteeName: "Имя основного получателя (пациента) — заполняется автоматически при выборе заявки", phInviteeEmail: "Email основного получателя (пациента) (необязательно) — включает автоотправку и напоминания",
    lblScheduledAt: "Время консультации (KST · время Кореи)",
    advancedOptions: "Дополнительные настройки (необязательно)", advancedOptionsHint: "Тип сессии · координатор · больница/врач · язык · заметки",
    lblSessionType: "Тип сессии", sessionTypePre: "Оценка перед лечением", sessionTypeFollow: "Повторный приём", sessionTypeEmergency: "Экстренная консультация", sessionTypePartner: "Встреча с партнёром (агентство/больница)", sessionTypePartnerHint: "Не учитывается в показателях KHIDI (предварительная консультация / наблюдение).",
    lblPatientAccount: "Аккаунт пациента (необязательно — существующий)", phPatientAccount: "Оставьте пустым для гостевой ссылки",
    lblCoordinatorSelect: "Назначенный координатор (из списка координаторов)",
    lblPatientLang: "Язык пациента", langRu: "Русский", langKz: "Казахский", langEn: "Английский", langZh: "Китайский",
    lblDoctorLang: "Язык врача", langKo: "Корейский",
    hospitalBoxTitle: "🏥 Назначить больницу / врача (необязательно) — отображается в email пациента и интерфейсе",
    lblHospital: "Больница", optNone: "(не выбрано)", lblAssignedDoctor: "Лечащий врач",
    hintSelectHospitalFirst: "Сначала выберите больницу", noDoctorsRegistered: "Нет зарегистрированных врачей",
    lblNotes: "Заметки (необязательно)", phNotes: "Цель консультации / основные симптомы / что нужно уточнить заранее", notesInquiryPrefix: "Заявка",
    btnCancel: "Отмена", btnSubmitting: "Создание…", btnSubmit: "Запланировать консультацию",
    noRoleAccountsTpl: "Нет зарегистрированных аккаунтов с ролью «{role}» — сначала зарегистрируйтесь и назначьте роль", roleDoctor: "врач", roleCoordinator: "координатор",
    selectPlaceholder: "— Выбрать —", btnChange: "Изменить", phSearchEmail: "Поиск по email", searching: "Поиск...", noMatchingAccounts: "Совпадений не найдено",
    rolePatient: "🧑 Пациент", roleDoctorLabel: "👨‍⚕️ Врач", roleTranslator: "🗣 Переводчик", roleCoordinatorLabel: "🤝 Координатор", roleObserver: "👁 Наблюдатель", roleGuest: "🔗 Участник",
    defaultInviteLabel: "Ссылка-приглашение для пациента (аккаунт не нужен)", btnCopy: "Копировать", toastCopyDone: "Ссылка скопирована", toastCopyFail: "Не удалось скопировать",
    expiresPrefix: "Истекает:", qrScanTitle: "📱 Сканировать на телефоне",
    qrScanDesc: "Пациент может отсканировать QR камерой телефона и войти сразу, без установки приложения. Рекомендуем включать в email и ссылку, и QR.",
    btnDownloadPng: "Скачать PNG",
  },
  kz: {
    errAuth: "Аутентификация қатесі — қайта кіріңіз", errCreateFailedTpl: "Жасау сәтсіз: {msg}", errCreateFailed: "Жасау сәтсіз",
    doneTitle: "Кеңес жоспарланды", doneDesc: "Төмендегі кіру сілтемесін барлық қатысушыларға жіберіңіз.",
    inviteLinkLabelTpl: "{role} шақыру сілтемесі",
    noteHeading: "📋 Жіберу кезінде ескеріңіз",
    noteItem1Prefix: "Осы ", noteItem1Bold: "бір сілтемені", noteItem1Suffix: " барлық қатысушыларға — науқас, дәрігер, аудармашы т.б. — жіберіңіз (әрқайсысы өз атын енгізіп кіреді)",
    noteItem2: "Науқастарға email/KakaoTalk/SMS, медперсоналға ішкі мессенджер ұсынылады",
    noteItem3: "Сілтеме таралуын болдырмаңыз — көпшілік жерге салмаңыз",
    noteItem4: "Жоспарланған уақыттан 30 минут бұрын автоматты еске салғыш жіберіледі (науқас email енгізсе)",
    noInvitesMsg: "Сілтеме алушы жоқ немесе барлығы сәтсіз аяқталды. Сессия бәрібір жасалды — тізімнен жеке-жеке шығарыңыз.",
    btnClose: "Жабу", modalTitle: "Жаңа телемедицина кеңесі", modalDesc: "Науқас пен дәрігер арасында WebRTC бейнесессия жасау",
    linkBoxTitle: "🔗 Кіру сілтемесі (аккаунт қажет емес)",
    linkBoxDescPrefix: "Кеңесті жасағанда ", linkBoxDescBold: "бір кіру сілтемесі", linkBoxDescSuffix: " жасалады. Осы жалғыз сілтемені барлық қатысушыларға — науқас, дәрігер, аудармашы т.б. — жіберіңіз. Әрқайсысы өз атын енгізіп кіреді (жоспарланған уақыттан кейін 12 сағатқа дейін жарамды, кемінде 72 сағат).",
    lblSelectFromInquiry: "Науқасты өтінімдерден таңдау (міндетті емес)", inquirySelectPlaceholder: "— Өтінім тізімінен таңдау (аты/email/тіл автоматты толтырылады) —",
    inquiryNameUnknown: "(аты белгісіз)", inquiryHint: "Өтінімді таңдағанда науқастың аты/email автоматты толтырылады (автожіберу үшін). Email болмаса, сілтемені көшіріп қолмен жіберіңіз.",
    phInviteeName: "Негізгі алушы (науқас) аты — өтінім таңдалғанда автоматты", phInviteeEmail: "Негізгі алушы (науқас) email (міндетті емес) — енгізілсе автожіберу мен еске салғыштар қосылады",
    lblScheduledAt: "Кеңес уақыты (KST · Корея уақыты)",
    advancedOptions: "Кеңейтілген параметрлер (міндетті емес)", advancedOptionsHint: "Сессия түрі · үйлестіруші · аурухана/дәрігер · тіл · ескертпе",
    lblSessionType: "Сессия түрі", sessionTypePre: "Емдеу алдындағы бағалау", sessionTypeFollow: "Қайталама қабылдау", sessionTypeEmergency: "Шұғыл кеңес", sessionTypePartner: "Серіктеспен кездесу (агенттік/аурухана)", sessionTypePartnerHint: "KHIDI көрсеткіштеріне (алдын ала кеңес / бақылау) есептелмейді.",
    lblPatientAccount: "Науқас аккаунты (міндетті емес — бар аккаунт)", phPatientAccount: "Тек қонақ сілтемесі үшін бос қалдырыңыз",
    lblCoordinatorSelect: "Тағайындалған үйлестіруші (үйлестірушілер тізімінен)",
    lblPatientLang: "Науқас тілі", langRu: "Орысша", langKz: "Қазақша", langEn: "Ағылшынша", langZh: "Қытайша",
    lblDoctorLang: "Дәрігер тілі", langKo: "Корейше",
    hospitalBoxTitle: "🏥 Аурухана / дәрігер тағайындау (міндетті емес) — науқас email мен интерфейсте көрсетіледі",
    lblHospital: "Аурухана", optNone: "(таңдалмаған)", lblAssignedDoctor: "Емдеуші дәрігер",
    hintSelectHospitalFirst: "Алдымен ауруханды таңдаңыз", noDoctorsRegistered: "Тіркелген дәрігер жоқ",
    lblNotes: "Ескертпе (міндетті емес)", phNotes: "Кеңестің мақсаты / негізгі белгілер / алдын ала тексеру қажет мәселелер", notesInquiryPrefix: "Өтінім",
    btnCancel: "Бас тарту", btnSubmitting: "Жасалуда…", btnSubmit: "Кеңесті жоспарлау",
    noRoleAccountsTpl: "Тіркелген «{role}» аккаунты жоқ — алдымен тіркеліп рөл беріңіз", roleDoctor: "дәрігер", roleCoordinator: "үйлестіруші",
    selectPlaceholder: "— Таңдау —", btnChange: "Өзгерту", phSearchEmail: "Email бойынша іздеу", searching: "Ізделуде...", noMatchingAccounts: "Сәйкестік табылмады",
    rolePatient: "🧑 Науқас", roleDoctorLabel: "👨‍⚕️ Дәрігер", roleTranslator: "🗣 Аудармашы", roleCoordinatorLabel: "🤝 Үйлестіруші", roleObserver: "👁 Бақылаушы", roleGuest: "🔗 Қатысушы",
    defaultInviteLabel: "Науқас шақыру сілтемесі (аккаунт қажет емес)", btnCopy: "Көшіру", toastCopyDone: "Сілтеме көшірілді", toastCopyFail: "Көшіру сәтсіз",
    expiresPrefix: "Мерзімі:", qrScanTitle: "📱 Телефоннан сканерлеу",
    qrScanDesc: "Науқас өз телефон камерасымен сканерлеп, қолданба орнатпай-ақ бірден кіре алады. Email-ге сілтеме мен QR екеуін де қосу ұсынылады.",
    btnDownloadPng: "PNG жүктеу",
  },
  zh: {
    errAuth: "身份验证错误 — 请重新登录", errCreateFailedTpl: "创建失败：{msg}", errCreateFailed: "创建失败",
    doneTitle: "会诊预约创建完成", doneDesc: "请将以下加入链接分享给所有参与者。",
    inviteLinkLabelTpl: "{role}邀请链接",
    noteHeading: "📋 分享时请注意",
    noteItem1Prefix: "将此", noteItem1Bold: "一个链接", noteItem1Suffix: "分享给所有参与者 — 患者、医生、翻译等（各自输入姓名后进入）",
    noteItem2: "建议患者使用邮箱/KakaoTalk/短信，医护人员使用内部通讯工具",
    noteItem3: "防止链接泄露 — 请勿发布在公开场所",
    noteItem4: "预约前30分钟将自动发送提醒（如已填写患者邮箱）",
    noInvitesMsg: "没有邀请对象或全部生成失败。会话已创建，请在列表中逐个发放链接。",
    btnClose: "关闭", modalTitle: "新建远程会诊预约", modalDesc: "创建患者与医生之间的WebRTC视频会话",
    linkBoxTitle: "🔗 加入链接（无需账户）",
    linkBoxDescPrefix: "创建会诊后将生成", linkBoxDescBold: "一个加入链接", linkBoxDescSuffix: "。请将这唯一的链接分享给所有参与者 — 患者、医生、翻译等。各自输入姓名后即可进入（有效期至预约时间后12小时，至少72小时）。",
    lblSelectFromInquiry: "从咨询中选择患者（可选）", inquirySelectPlaceholder: "— 从咨询列表中选择（自动填充姓名/邮箱/语言）—",
    inquiryNameUnknown: "（姓名未知）", inquiryHint: "选择咨询后将自动填充患者姓名/邮箱（用于自动发送）。若无邮箱，请复制链接手动转发。",
    phInviteeName: "主要接收人（患者）姓名 — 选择咨询后自动填充", phInviteeEmail: "主要接收人（患者）邮箱（可选）— 填写后启用自动发送和提醒",
    lblScheduledAt: "预约时间（KST · 韩国时间）",
    advancedOptions: "高级选项（可选）", advancedOptionsHint: "会诊类型 · 协调员 · 医院/医生 · 语言 · 备注",
    lblSessionType: "会诊类型", sessionTypePre: "治疗前评估", sessionTypeFollow: "复诊", sessionTypeEmergency: "紧急会诊", sessionTypePartner: "合作方会议（代理机构/医院）", sessionTypePartnerHint: "不计入 KHIDI 指标（术前咨询/术后随访）。",
    lblPatientAccount: "患者账户（可选 — 已有账户）", phPatientAccount: "留空则仅使用访客链接",
    lblCoordinatorSelect: "指定协调员（协调员列表）",
    lblPatientLang: "患者语言", langRu: "俄语", langKz: "哈萨克语", langEn: "英语", langZh: "中文",
    lblDoctorLang: "医生语言", langKo: "韩语",
    hospitalBoxTitle: "🏥 指定医院 / 医生（可选）— 将显示在患者邮件与界面中",
    lblHospital: "医院", optNone: "（不选择）", lblAssignedDoctor: "主治医生",
    hintSelectHospitalFirst: "请先选择医院", noDoctorsRegistered: "暂无注册医生",
    lblNotes: "备注（可选）", phNotes: "会诊目的 / 主要症状 / 需提前确认的事项等", notesInquiryPrefix: "咨询",
    btnCancel: "取消", btnSubmitting: "创建中…", btnSubmit: "创建会诊预约",
    noRoleAccountsTpl: "暂无已注册的{role}账户 — 请先注册并分配角色", roleDoctor: "医生", roleCoordinator: "协调员",
    selectPlaceholder: "— 请选择 —", btnChange: "更改", phSearchEmail: "按邮箱搜索", searching: "搜索中...", noMatchingAccounts: "没有匹配的账户",
    rolePatient: "🧑 患者", roleDoctorLabel: "👨‍⚕️ 医生", roleTranslator: "🗣 翻译", roleCoordinatorLabel: "🤝 协调员", roleObserver: "👁 观察员", roleGuest: "🔗 参与者",
    defaultInviteLabel: "患者邀请链接（无需账户）", btnCopy: "复制", toastCopyDone: "链接已复制", toastCopyFail: "复制失败",
    expiresPrefix: "过期时间：", qrScanTitle: "📱 手机扫码",
    qrScanDesc: "患者用手机摄像头扫描即可直接进入，无需安装应用。建议邮件中同时附上链接和二维码。",
    btnDownloadPng: "下载PNG",
  },
  ja: {
    errAuth: "認証エラー — 再度ログインしてください", errCreateFailedTpl: "作成に失敗しました: {msg}", errCreateFailed: "作成に失敗しました",
    doneTitle: "相談予約を作成しました", doneDesc: "以下の参加リンクを全参加者に共有してください。",
    inviteLinkLabelTpl: "{role}招待リンク",
    noteHeading: "📋 共有時の注意事項",
    noteItem1Prefix: "このリンク", noteItem1Bold: "1つ", noteItem1Suffix: "を患者・医師・通訳など全参加者に共有してください（各自名前を入力して入室）",
    noteItem2: "患者にはメール/KakaoTalk/SMS、医療スタッフには社内メッセンジャーを推奨",
    noteItem3: "リンク漏洩防止 — 公開の場に掲載しない",
    noteItem4: "予定30分前に自動リマインダーを送信（患者のメールが入力されている場合）",
    noInvitesMsg: "招待対象がないか、すべて失敗しました。セッションは作成済みなので、一覧から個別に発行してください。",
    btnClose: "閉じる", modalTitle: "新規遠隔相談予約", modalDesc: "患者-医師間のWebRTCビデオセッションを作成",
    linkBoxTitle: "🔗 参加リンク（アカウント不要）",
    linkBoxDescPrefix: "相談を作成すると", linkBoxDescBold: "参加リンク1つ", linkBoxDescSuffix: "が生成されます。患者・医師・通訳など全参加者にこの1つのリンクだけを共有してください。各自名前を入力して入室します（予約時刻の12時間後まで有効、最低72時間）。",
    lblSelectFromInquiry: "問い合わせから患者を選択（任意）", inquirySelectPlaceholder: "— 問い合わせ一覧から選択（氏名・メール・言語を自動入力）—",
    inquiryNameUnknown: "（氏名不明）", inquiryHint: "問い合わせを選ぶと患者の氏名・メールが自動入力されます（自動送信用）。メールがない場合はリンクをコピーして直接お伝えください。",
    phInviteeName: "代表受信者（患者）氏名 — 問い合わせ選択時に自動入力", phInviteeEmail: "代表受信者（患者）メール（任意）— 入力すると自動送信・リマインダーが有効",
    lblScheduledAt: "予定時刻（KST・韓国時間基準）",
    advancedOptions: "詳細オプション（任意）", advancedOptionsHint: "セッション種別・コーディネーター・病院/医師・言語・備考",
    lblSessionType: "セッション種別", sessionTypePre: "治療前評価", sessionTypeFollow: "再診", sessionTypeEmergency: "緊急相談", sessionTypePartner: "パートナー会議（代理店・病院）", sessionTypePartnerHint: "KHIDI 実績（事前相談・術後フォロー）には計上されません。",
    lblPatientAccount: "患者アカウント（任意 — 既存アカウント）", phPatientAccount: "空欄でゲストリンク専用",
    lblCoordinatorSelect: "担当コーディネーター（指定コーディネーター一覧）",
    lblPatientLang: "患者の言語", langRu: "ロシア語", langKz: "カザフ語", langEn: "英語", langZh: "中国語",
    lblDoctorLang: "医師の言語", langKo: "韓国語",
    hospitalBoxTitle: "🏥 病院/医師を指定（任意）— 患者メール・UIに表示されます",
    lblHospital: "病院", optNone: "（選択しない）", lblAssignedDoctor: "担当医師",
    hintSelectHospitalFirst: "先に病院を選択", noDoctorsRegistered: "登録済み医師なし",
    lblNotes: "備考（任意）", phNotes: "相談の目的 / 主な症状 / 事前確認が必要な事項など", notesInquiryPrefix: "問い合わせ",
    btnCancel: "キャンセル", btnSubmitting: "作成中…", btnSubmit: "相談予約を作成",
    noRoleAccountsTpl: "登録済みの{role}アカウントがありません — 先に登録し役割を付与してください", roleDoctor: "医師", roleCoordinator: "コーディネーター",
    selectPlaceholder: "— 選択 —", btnChange: "変更", phSearchEmail: "メールで検索", searching: "検索中...", noMatchingAccounts: "一致するアカウントがありません",
    rolePatient: "🧑 患者", roleDoctorLabel: "👨‍⚕️ 医師", roleTranslator: "🗣 通訳", roleCoordinatorLabel: "🤝 コーディネーター", roleObserver: "👁 参観者", roleGuest: "🔗 参加",
    defaultInviteLabel: "患者招待リンク（アカウント不要）", btnCopy: "コピー", toastCopyDone: "リンクをコピーしました", toastCopyFail: "コピー失敗",
    expiresPrefix: "有効期限:", qrScanTitle: "📱 モバイルQRスキャン",
    qrScanDesc: "患者が自分のスマホカメラでスキャンすればアプリ不要ですぐ接続できます。メールにリンクとQRの両方を入れることを推奨。",
    btnDownloadPng: "PNGダウンロード",
  },
};

// ─── 새 상담 예약 모달 ──────────────────────────────────────────
export function CreateConsultationModal({ onClose, onSuccess }) {
  const toast = useToast();
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const fmt = (tpl, vals) => Object.entries(vals).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  const [form, setForm] = useState(() => {
    // 기본 값: 1시간 후로 예약
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return {
      selected_inquiry_id: "",
      patient_user_id: "",
      coordinator_user_id: "",
      session_type: "pre_consultation",
      scheduled_at: d.toISOString().slice(0, 16),
      patient_language: "ru",
      doctor_language: "ko",
      hospital_id: "",
      partner_doctor_id: "",
      notes: "",
      // 통합 초대 링크 1개(role=guest) — 환자·의사 등 모두 이 링크로 입장.
      // inviteeName/Email 은 자동 발송용 대표 수신자(보통 환자).
      inviteeName: "",
      inviteeEmail: "",
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null); // 생성 후 initiate 결과 (세션 + invite)
  // 병원/의사 옵션 (DB 에서 lazy load)
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [doctorOptions, setDoctorOptions] = useState([]);
  // 문의(inquiries) 옵션 — 환자를 직접 타이핑하지 않고 실제 문의에서 선택
  const [inquiryOptions, setInquiryOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const { data: hospitalsData } = await supabase
          .from("hospitals")
          .select("id, name, address")
          .eq("is_active", true)
          .order("name");
        if (!cancelled && hospitalsData) setHospitalOptions(hospitalsData);
      } catch {
        // silent
      }
      try {
        // 문의는 RLS상 service_role 만 읽기 가능 + 이름 암호화 → 서버 picker API 사용
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch("/api/admin/inquiries/picker", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (!cancelled && result.ok) setInquiryOptions(result.inquiries || []);
      } catch {
        // silent
      }
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // 문의 선택 시 환자 정보 자동 채움 (이름·언어·메모 즉시 + 이메일은 서버에서 복호화해 보강)
  async function applyInquiry(inquiryId) {
    const inq = inquiryOptions.find((i) => String(i.id) === String(inquiryId));
    if (!inq) {
      setForm((f) => ({ ...f, selected_inquiry_id: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      selected_inquiry_id: inquiryId,
      inviteeName: inq.name && inq.name !== "(이름 미상)" ? inq.name : f.inviteeName,
      patient_language: inq.preferred_language || f.patient_language,
      notes: f.notes || `${tt("notesInquiryPrefix")} #${inq.id} · ${inq.nationality || ""} · ${inq.cancer_type || ""}`.trim(),
    }));
    // 이메일은 암호화돼 있어 picker 목록엔 없음 → 단건 상세 API로 복호화해 자동 채움(자동 발송용)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/portal/inbox/${inquiryId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await res.json();
      if (res.ok && result.ok && result.inquiry) {
        const full = [result.inquiry.first_name, result.inquiry.last_name].filter(Boolean).join(" ").trim();
        setForm((f) => ({
          ...f,
          inviteeEmail: result.inquiry.email && result.inquiry.email.includes("@") ? result.inquiry.email : f.inviteeEmail,
          inviteeName: full || f.inviteeName,
        }));
      }
    } catch {
      // silent — 이메일 자동 채움 실패해도 수동 입력 가능
    }
  }

  // 병원 변경 시 해당 병원의 의사 목록 로드
  useEffect(() => {
    if (!form.hospital_id) {
      setDoctorOptions([]);
      return;
    }
    let cancelled = false;
    async function loadDoctors() {
      try {
        // partner_doctors 는 branch_id 참조, branches 가 hospital_id 참조
        const { data: branchesData } = await supabase
          .from("partner_branches")
          .select("id")
          .eq("hospital_id", form.hospital_id);
        const branchIds = (branchesData || []).map((b) => b.id);
        if (branchIds.length === 0) {
          if (!cancelled) setDoctorOptions([]);
          return;
        }
        const { data: doctorsData } = await supabase
          .from("partner_doctors")
          .select("id, name_ko, name_en, position_ko, subspecialty")
          .eq("is_active", true)
          .in("branch_id", branchIds)
          .order("display_order", { ascending: true, nullsFirst: false });
        if (!cancelled && doctorsData) setDoctorOptions(doctorsData);
      } catch {
        // silent
      }
    }
    loadDoctors();
    return () => {
      cancelled = true;
    };
  }, [form.hospital_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error(tt("errAuth"));
        return;
      }

      // 1. 세션 생성
      // 게스트 전용이면 서버는 patient_user_id 필수로 요구할 수 있으므로
      // admin 본인 ID 를 placeholder 로 세팅 (후속 PATCH 로 환자 확정 가능)
      const payload = {
        ...form,
        patient_user_id: form.patient_user_id || sessionData.session.user.id,
        // datetime-local 은 tz 없는 naive 문자열 → KST(+09:00)로 해석해 UTC 저장.
        // (과거엔 브라우저 로컬 tz 로 해석돼, 어드민 PC 가 KST 가 아니면 예약시각·리마인더가 틀어짐)
        scheduled_at: new Date(`${form.scheduled_at}+09:00`).toISOString(),
      };
      // 게스트 관련 필드 / UI 플래그 제거
      delete payload.inviteeName;
      delete payload.inviteeEmail;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] == null) delete payload[k];
      });

      const res = await fetch("/api/khidi/consultation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(fmt(tt("errCreateFailedTpl"), { msg: result.error || res.statusText }));
        return;
      }

      const sessionId = result.data?.id;

      // 2. 통합 초대 링크(role=guest) 1개 발급 — 환자·의사 등 모든 참여자가 이 링크로 입장.
      //    inviteeName/Email 이 있으면(보통 환자) 자동 발송 + 리마인더에 사용.
      const invites = [];
      if (sessionId) {
        try {
          const inviteRes = await fetch(
            `/api/khidi/consultation/${sessionId}/invite`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                role: "guest",
                inviteeName: form.inviteeName || undefined,
                inviteeEmail: form.inviteeEmail || undefined,
                expiresInHours: 72,
                // 회수 제한 없음(만료 전까지 무제한, PO 2026-07-15) — 재접속·공용 참여 자유, 안전선은 72h 만료
                maxUses: 0,
              }),
            }
          );
          const inviteResult = await inviteRes.json();
          if (inviteRes.ok && inviteResult.ok) {
            invites.push({
              role: "guest",
              url: inviteResult.inviteUrl,
              expiresAt: inviteResult.expiresAt,
            });
          } else {
            console.warn("[invite:guest] 실패:", inviteResult.error);
          }
        } catch (inviteErr) {
          console.error("[invite:guest] 예외:", inviteErr);
        }
      }

      setCreated({
        sessionId,
        invites,
      });
    } catch (err) {
      console.error("[CreateConsultationModal] error:", err);
      toast.error(tt("errCreateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  // 생성 완료 화면
  if (created) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={() => {
          onSuccess();
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{tt("doneTitle")}</h2>
              <p className="text-sm text-gray-500">
                {tt("doneDesc")}
              </p>
            </div>
          </div>

          {created.invites && created.invites.length > 0 ? (
            <div className="space-y-4">
              {created.invites.map((inv) => (
                <div key={inv.role} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                  <InviteLinkBlock
                    url={inv.url}
                    expiresAt={inv.expiresAt}
                    toast={toast}
                    label={fmt(tt("inviteLinkLabelTpl"), { role: roleLabel(inv.role, lang) })}
                  />
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">{tt("noteHeading")}</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>{tt("noteItem1Prefix")}<b>{tt("noteItem1Bold")}</b>{tt("noteItem1Suffix")}</li>
                  <li>{tt("noteItem2")}</li>
                  <li>{tt("noteItem3")}</li>
                  <li>{tt("noteItem4")}</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {tt("noInvitesMsg")}
            </p>
          )}

          <button
            onClick={onSuccess}
            className="w-full mt-6 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800"
          >
            {tt("btnClose")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Video size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{tt("modalTitle")}</h2>
              <p className="text-sm text-gray-500">{tt("modalDesc")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 통합 초대 링크 — 1개로 모두 입장 */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <p className="font-semibold text-sm text-gray-900 mb-1">
              {tt("linkBoxTitle")}
            </p>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              {tt("linkBoxDescPrefix")}<b>{tt("linkBoxDescBold")}</b>{tt("linkBoxDescSuffix")}
            </p>

            {/* 문의에서 환자 선택 — 직접 타이핑 대신 실제 문의 목록에서 (오타·중복 입력 방지) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tt("lblSelectFromInquiry")}</label>
              <select
                value={form.selected_inquiry_id}
                onChange={(e) => applyInquiry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">{tt("inquirySelectPlaceholder")}</option>
                {inquiryOptions.map((inq) => (
                  <option key={inq.id} value={inq.id}>
                    #{inq.id} · {inq.name || tt("inquiryNameUnknown")} · {inq.nationality || "?"} · {inq.cancer_type || "?"} · {inq.status || ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">{tt("inquiryHint")}</p>
            </div>

            <div className="mt-3 pt-3 border-t border-teal-200 space-y-2">
              <input
                type="text"
                value={form.inviteeName}
                onChange={(e) => setForm({ ...form, inviteeName: e.target.value })}
                placeholder={tt("phInviteeName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="email"
                value={form.inviteeEmail}
                onChange={(e) => setForm({ ...form, inviteeEmail: e.target.value })}
                placeholder={tt("phInviteeEmail")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* 예약 시각 — 필수. 기본 노출 (나머지는 고급 옵션으로 접음) */}
          <Field label={tt("lblScheduledAt")}>
            <input
              type="datetime-local"
              required
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          {/* 고급 옵션 — 평소 접어둠. 문의를 고르면 언어·세션유형은 기본값/자동입력으로 충분,
              코디·병원/의사·비고는 필요할 때만 편다. (필드 과다 → 기본 최소화, POSTMORTEM 상담모달 복잡도) */}
          <details className="border border-gray-200 rounded-xl">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between gap-2">
              <span>{tt("advancedOptions")}</span>
              <span className="text-xs font-normal text-gray-500">{tt("advancedOptionsHint")}</span>
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100">
              <Field label={tt("lblSessionType")}>
                <select
                  value={form.session_type}
                  onChange={(e) => setForm({ ...form, session_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="pre_consultation">{tt("sessionTypePre")}</option>
                  <option value="follow_up">{tt("sessionTypeFollow")}</option>
                  <option value="emergency">{tt("sessionTypeEmergency")}</option>
                  {/* 파트너 미팅 = 에이전시·병원과의 회의. KHIDI 실적(사전상담·사후관리)에 안 잡힌다.
                      ※ 여기 있던 "diagnostic" 은 DB CHECK 가 안 받는 값이라 고르면 저장이 깨졌다 → 제거(2026-07-27). */}
                  <option value="partner_meeting">{tt("sessionTypePartner")}</option>
                </select>
                {form.session_type === "partner_meeting" && (
                  <p className="mt-1.5 text-xs text-gray-600">{tt("sessionTypePartnerHint")}</p>
                )}
              </Field>

              <UserSearchField
                label={tt("lblPatientAccount")}
                value={form.patient_user_id}
                onSelect={(id) => setForm({ ...form, patient_user_id: id })}
                placeholder={tt("phPatientAccount")}
              />
              <RoleUserSelect
                label={tt("lblCoordinatorSelect")}
                role="coordinator"
                value={form.coordinator_user_id}
                onSelect={(id) => setForm({ ...form, coordinator_user_id: id })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Field label={tt("lblPatientLang")}>
                  <select
                    value={form.patient_language}
                    onChange={(e) => setForm({ ...form, patient_language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ru">{tt("langRu")}</option>
                    <option value="kz">{tt("langKz")}</option>
                    <option value="en">{tt("langEn")}</option>
                    <option value="zh">{tt("langZh")}</option>
                  </select>
                </Field>
                <Field label={tt("lblDoctorLang")}>
                  <select
                    value={form.doctor_language}
                    onChange={(e) => setForm({ ...form, doctor_language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ko">{tt("langKo")}</option>
                    <option value="en">{tt("langEn")}</option>
                  </select>
                </Field>
              </div>

              {/* 병원 / 의사 (브랜딩용) */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700">
                  {tt("hospitalBoxTitle")}
                </p>
                <Field label={tt("lblHospital")}>
                  <select
                    value={form.hospital_id}
                    onChange={(e) =>
                      setForm({ ...form, hospital_id: e.target.value, partner_doctor_id: "" })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">{tt("optNone")}</option>
                    {hospitalOptions.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={tt("lblAssignedDoctor")} hint={form.hospital_id ? "" : tt("hintSelectHospitalFirst")}>
                  <select
                    value={form.partner_doctor_id}
                    onChange={(e) =>
                      setForm({ ...form, partner_doctor_id: e.target.value })
                    }
                    disabled={!form.hospital_id || doctorOptions.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">
                      {!form.hospital_id
                        ? tt("hintSelectHospitalFirst")
                        : doctorOptions.length === 0
                        ? tt("noDoctorsRegistered")
                        : tt("optNone")}
                    </option>
                    {doctorOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name_ko || d.name_en}
                        {d.position_ko ? ` · ${d.position_ko}` : ""}
                        {d.subspecialty ? ` · ${d.subspecialty}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label={tt("lblNotes")}>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder={tt("phNotes")}
                />
              </Field>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              {tt("btnCancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-60"
            >
              {submitting ? tt("btnSubmitting") : tt("btnSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 사용자 검색 필드 ─────────────────────────────
// 이메일로 auth.users 검색 → 선택 → UUID 자동 입력
// 역할(doctor/coordinator) 회원을 드롭다운으로 — 이메일 검색 대신 지정 명단에서 선택
function RoleUserSelect({ label, role, value, onSelect }) {
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const fmt = (tpl, vals) => Object.entries(vals).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  const [options, setOptions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/admin/users/search?role=${encodeURIComponent(role)}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!cancelled && result.ok) setOptions(result.users || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option value="">
          {loaded && options.length === 0 ? fmt(tt("noRoleAccountsTpl"), { role: role === "doctor" ? tt("roleDoctor") : tt("roleCoordinator") }) : tt("selectPlaceholder")}
        </option>
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name ? `${u.full_name} (${u.email})` : u.email}
          </option>
        ))}
      </select>
    </div>
  );
}

function UserSearchField({ label, value, onSelect, placeholder }) {
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");

  // value 가 바깥에서 변경되면 보이는 텍스트도 맞춤
  useEffect(() => {
    if (!value) setSelectedEmail("");
  }, [value]);

  // debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(query)}&limit=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();
        if (cancelled) return;
        if (result.ok) setResults(result.users || []);
      } catch (err) {
        console.error("[UserSearchField] error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handlePick = (user) => {
    onSelect(user.id);
    setSelectedEmail(user.email);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect("");
    setSelectedEmail("");
    setQuery("");
    setResults([]);
  };

  return (
    <Field label={label}>
      <div className="relative">
        {value && selectedEmail ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
            <span className="flex-1 text-sm text-teal-900 truncate">
              ✓ {selectedEmail}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-teal-700 hover:text-teal-800 text-sm"
            >
              {tt("btnChange")}
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder={placeholder || tt("phSearchEmail")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {showDropdown && query.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto z-20">
                {loading ? (
                  <div className="px-3 py-3 text-sm text-gray-500">{tt("searching")}</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    {tt("noMatchingAccounts")}
                  </div>
                ) : (
                  results.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      onMouseDown={() => handlePick(user)}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm text-gray-900 truncate">
                        {user.email}
                      </div>
                      {user.full_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {user.full_name}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Field>
  );
}

function roleLabel(role, lang) {
  const t = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  return (
    {
      patient: t("rolePatient"),
      doctor: t("roleDoctorLabel"),
      translator: t("roleTranslator"),
      coordinator: t("roleCoordinatorLabel"),
      observer: t("roleObserver"),
      guest: t("roleGuest"),
    }[role] || role
  );
}

// ─── 초대 링크 + QR 코드 블록 ─────────────────────────────
function InviteLinkBlock({ url, expiresAt, toast, label }) {
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const resolvedLabel = label || tt("defaultInviteLabel");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!url) return;
    // QR 생성 (512x512, 에러 정정 M 레벨)
    QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [url]);

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `healo-consultation-qr-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">{resolvedLabel}</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-800"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(url).then(
                () => toast.success(tt("toastCopyDone")),
                () => toast.error(tt("toastCopyFail"))
              );
            }}
            className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800"
          >
{tt("btnCopy")}
          </button>
        </div>
        {expiresAt && (
          <p className="text-xs text-gray-500 mt-2">
            {tt("expiresPrefix")} {new Date(expiresAt).toLocaleString(LOCALE_MAP[lang] || "en-US")}
          </p>
        )}
      </div>

      {/* QR 코드 — 환자 모바일 스캔용 */}
      {qrDataUrl && (
        <div className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <img
            src={qrDataUrl}
            alt={tt("qrScanTitle")}
            className="w-32 h-32 rounded-lg bg-white p-1 shadow-sm"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-1">{tt("qrScanTitle")}</p>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              {tt("qrScanDesc")}
            </p>
            <button
              onClick={handleDownloadQR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <span>⬇</span> {tt("btnDownloadPng")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
