"use client";

/**
 * 새 원격상담 예약 모달 (공용) — admin·coordinator 둘 다 사용.
 * 단일 SoR: 상담 생성/초대링크 로직을 한 곳에만 둬 화면별 분기를 막는다(POSTMORTEM #28 교훈).
 * 드롭다운(문의/유저 picker)·생성·초대 API는 staff(admin·coordinator) 권한.
 */
import { useState, useEffect, useRef } from "react";
import { Video, X } from "lucide-react";
import { KHIDI_COUNTED_TYPES } from "@/lib/khidi/countState";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useBackofficeLang } from "@/lib/i18n/coordinator";
import QRCode from "qrcode";

const supabase = createSupabaseBrowserClient();

// 우리 팀은 어느 상담이든 사본을 받는다 (PO 2026-07-31). 「몰래」가 아니라 수신자 칸에 보이게 —
// 필요 없으면 × 로 빼면 된다. 계정이 없어도 되는 메일함 주소라 여기 고정으로 둔다.
const STAFF_ALWAYS_CC = [
  "admin@healwith.co.kr",
  "assel@healwith.co.kr",
  "coordinator@healwith.co.kr",
];

// 스태프 백오피스 6개 언어화(2026-07-09 PO 결정 — 예외 없이 전체 다국어 전환). admin·coordinator 공용.
const LOCALE_MAP = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };
const TR = {
  ko: {
    warnDeepLinkNotFound: "문의 #{id} 를 선택 목록(최근 50건)에서 못 찾았어요 — 아래에서 직접 골라 주세요.",
    errAuth: "인증 오류 — 다시 로그인하세요", errCreateFailedTpl: "생성 실패: {msg}", errCreateFailed: "생성 실패",
    errPastSchedule: "지난 시각으로는 예약할 수 없어요 — 시각을 다시 골라 주세요.",
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
    inquiryNotCountedTitle: "⚠️ 유치 전환 추적이 끊깁니다",
    inquiryNotCountedBody: "실적(사전상담·사후관리)은 «완료»만 누르면 잡힙니다. 다만 문의를 안 걸면 «이 상담이 어느 문의에서 왔는지»가 끊겨 유치 전환 분석에서 빠집니다. 나중에 상담 목록에서 이어붙일 수도 있습니다.",
    phInviteeName: "대표 수신자(환자) 이름 — 문의 선택 시 자동", phInviteeEmail: "이메일 입력 후 Enter — 여러 명 가능 (선택)", chipMe: "나",
    phInviteePhone: "휴대폰 번호 (선택) — 국가번호 포함, 예: +77011234567", waSend: "WhatsApp 으로 보내기",
    emailSentToTpl: "✉️ 초대장 보냄: {list}", emailNotSent: "✉️ 이메일을 안 넣어 초대장은 보내지 않았습니다 — 위 링크를 복사해 직접 전달하세요.",
    lblScheduledAt: "예약 시각 (KST · 한국 시간 기준)",
    lblSessionType: "세션 유형", sessionTypePlaceholder: "— 고르세요 —", sessionTypePre: "진료 전 평가", sessionTypeFollow: "추후 진료", sessionTypeEmergency: "긴급 상담", sessionTypePartner: "파트너 미팅(에이전시·병원)", sessionTypePartnerHint: "KHIDI 실적(사전상담·사후관리)에는 집계되지 않습니다.",
    notesInquiryPrefix: "문의",
    btnCancel: "취소", btnSubmitting: "생성 중…", btnSubmit: "상담 예약 생성",
    rolePatient: "🧑 환자", roleDoctorLabel: "👨‍⚕️ 의사", roleTranslator: "🗣 통역사", roleCoordinatorLabel: "🤝 코디네이터", roleObserver: "👁 참관자", roleGuest: "🔗 참여",
    defaultInviteLabel: "환자 초대 링크 (계정 불필요)", btnCopy: "복사", toastCopyDone: "링크 복사 완료", toastCopyFail: "복사 실패",
    expiresPrefix: "만료:", qrScanTitle: "📱 모바일 QR 스캔",
    qrScanDesc: "환자가 자기 핸드폰 카메라로 스캔하면 앱 설치 없이 바로 접속. 이메일에 링크 + QR 둘 다 넣는 걸 권장.",
    btnDownloadPng: "PNG 다운로드",
  },
  en: {
    warnDeepLinkNotFound: "Inquiry #{id} is not in the picker list (latest 50) — please choose it below.",
    errAuth: "Authentication error — please log in again", errCreateFailedTpl: "Creation failed: {msg}", errCreateFailed: "Creation failed",
    errPastSchedule: "You can't schedule a time in the past — please pick another time.",
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
    inquiryNotCountedTitle: "⚠️ Attraction tracking will be broken",
    inquiryNotCountedBody: "The figure itself counts as soon as you mark it complete. But without linking an inquiry we lose which inquiry this came from, so it drops out of attraction-conversion analysis. You can link it later from the consultation list.",
    phInviteeName: "Primary recipient (patient) name — auto-filled when an inquiry is selected", phInviteeEmail: "Type an email and press Enter — multiple allowed (optional)", chipMe: "me",
    phInviteePhone: "Phone number (optional) — with country code, e.g. +77011234567", waSend: "Send via WhatsApp",
    emailSentToTpl: "✉️ Invitation sent to: {list}", emailNotSent: "✉️ No email entered — no invitation was sent. Copy the link above and share it yourself.",
    lblScheduledAt: "Scheduled time (KST · Korea time)",
    lblSessionType: "Session type", sessionTypePlaceholder: "— Select —", sessionTypePre: "Pre-treatment assessment", sessionTypeFollow: "Follow-up", sessionTypeEmergency: "Emergency consult", sessionTypePartner: "Partner meeting (agency/hospital)", sessionTypePartnerHint: "Not counted toward KHIDI figures (pre-consultation / follow-up).",
    notesInquiryPrefix: "Inquiry",
    btnCancel: "Cancel", btnSubmitting: "Creating…", btnSubmit: "Schedule consultation",
    rolePatient: "🧑 Patient", roleDoctorLabel: "👨‍⚕️ Doctor", roleTranslator: "🗣 Interpreter", roleCoordinatorLabel: "🤝 Coordinator", roleObserver: "👁 Observer", roleGuest: "🔗 Participant",
    defaultInviteLabel: "Patient invite link (no account needed)", btnCopy: "Copy", toastCopyDone: "Link copied", toastCopyFail: "Copy failed",
    expiresPrefix: "Expires:", qrScanTitle: "📱 Scan on mobile",
    qrScanDesc: "The patient can scan with their phone camera to join instantly, no app install needed. Recommend including both the link and QR in the email.",
    btnDownloadPng: "Download PNG",
  },
  ru: {
    warnDeepLinkNotFound: "Запрос #{id} не найден в списке выбора (последние 50) — выберите его ниже.",
    errAuth: "Ошибка авторизации — войдите снова", errCreateFailedTpl: "Не удалось создать: {msg}", errCreateFailed: "Не удалось создать",
    errPastSchedule: "Нельзя назначить на прошедшее время — выберите другое время.",
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
    inquiryNotCountedTitle: "⚠️ Цепочка привлечения будет прервана",
    inquiryNotCountedBody: "Сам показатель засчитывается, как только вы отметите «завершено». Но без привязки заявки теряется связь «из какой заявки пришла эта консультация», и она выпадает из анализа привлечения. Привязать можно позже из списка консультаций.",
    phInviteeName: "Имя основного получателя (пациента) — заполняется автоматически при выборе заявки", phInviteeEmail: "Введите email и нажмите Enter — можно несколько (необязательно)", chipMe: "я",
    phInviteePhone: "Номер телефона (необязательно) — с кодом страны, напр. +77011234567", waSend: "Отправить в WhatsApp",
    emailSentToTpl: "✉️ Приглашение отправлено: {list}", emailNotSent: "✉️ Email не указан — приглашение не отправлено. Скопируйте ссылку выше и передайте сами.",
    lblScheduledAt: "Время консультации (KST · время Кореи)",
    lblSessionType: "Тип сессии", sessionTypePlaceholder: "— Выберите —", sessionTypePre: "Оценка перед лечением", sessionTypeFollow: "Повторный приём", sessionTypeEmergency: "Экстренная консультация", sessionTypePartner: "Встреча с партнёром (агентство/больница)", sessionTypePartnerHint: "Не учитывается в показателях KHIDI (предварительная консультация / наблюдение).",
    notesInquiryPrefix: "Заявка",
    btnCancel: "Отмена", btnSubmitting: "Создание…", btnSubmit: "Запланировать консультацию",
    rolePatient: "🧑 Пациент", roleDoctorLabel: "👨‍⚕️ Врач", roleTranslator: "🗣 Переводчик", roleCoordinatorLabel: "🤝 Координатор", roleObserver: "👁 Наблюдатель", roleGuest: "🔗 Участник",
    defaultInviteLabel: "Ссылка-приглашение для пациента (аккаунт не нужен)", btnCopy: "Копировать", toastCopyDone: "Ссылка скопирована", toastCopyFail: "Не удалось скопировать",
    expiresPrefix: "Истекает:", qrScanTitle: "📱 Сканировать на телефоне",
    qrScanDesc: "Пациент может отсканировать QR камерой телефона и войти сразу, без установки приложения. Рекомендуем включать в email и ссылку, и QR.",
    btnDownloadPng: "Скачать PNG",
  },
  kz: {
    warnDeepLinkNotFound: "#{id} сұрауы таңдау тізімінде (соңғы 50) табылмады — төменнен өзіңіз таңдаңыз.",
    errAuth: "Аутентификация қатесі — қайта кіріңіз", errCreateFailedTpl: "Жасау сәтсіз: {msg}", errCreateFailed: "Жасау сәтсіз",
    errPastSchedule: "Өткен уақытқа жоспарлау мүмкін емес — басқа уақыт таңдаңыз.",
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
    inquiryNotCountedTitle: "⚠️ Тарту тізбегі үзіледі",
    inquiryNotCountedBody: "Көрсеткіш «аяқталды» деп белгіленген бойда есептеледі. Бірақ өтінім байланбаса, «бұл кеңес қай өтінімнен келді» байланысы үзіліп, тарту талдауынан түсіп қалады. Кейін кеңестер тізімінен байланыстыруға болады.",
    phInviteeName: "Негізгі алушы (науқас) аты — өтінім таңдалғанда автоматты", phInviteeEmail: "Email енгізіп Enter басыңыз — бірнешеу болуы мүмкін (міндетті емес)", chipMe: "мен",
    phInviteePhone: "Телефон нөмірі (міндетті емес) — ел кодымен, мыс. +77011234567", waSend: "WhatsApp арқылы жіберу",
    emailSentToTpl: "✉️ Шақыру жіберілді: {list}", emailNotSent: "✉️ Email енгізілмеген — шақыру жіберілмеді. Жоғарыдағы сілтемені көшіріп өзіңіз жіберіңіз.",
    lblScheduledAt: "Кеңес уақыты (KST · Корея уақыты)",
    lblSessionType: "Сессия түрі", sessionTypePlaceholder: "— Таңдаңыз —", sessionTypePre: "Емдеу алдындағы бағалау", sessionTypeFollow: "Қайталама қабылдау", sessionTypeEmergency: "Шұғыл кеңес", sessionTypePartner: "Серіктеспен кездесу (агенттік/аурухана)", sessionTypePartnerHint: "KHIDI көрсеткіштеріне (алдын ала кеңес / бақылау) есептелмейді.",
    notesInquiryPrefix: "Өтінім",
    btnCancel: "Бас тарту", btnSubmitting: "Жасалуда…", btnSubmit: "Кеңесті жоспарлау",
    rolePatient: "🧑 Науқас", roleDoctorLabel: "👨‍⚕️ Дәрігер", roleTranslator: "🗣 Аудармашы", roleCoordinatorLabel: "🤝 Үйлестіруші", roleObserver: "👁 Бақылаушы", roleGuest: "🔗 Қатысушы",
    defaultInviteLabel: "Науқас шақыру сілтемесі (аккаунт қажет емес)", btnCopy: "Көшіру", toastCopyDone: "Сілтеме көшірілді", toastCopyFail: "Көшіру сәтсіз",
    expiresPrefix: "Мерзімі:", qrScanTitle: "📱 Телефоннан сканерлеу",
    qrScanDesc: "Науқас өз телефон камерасымен сканерлеп, қолданба орнатпай-ақ бірден кіре алады. Email-ге сілтеме мен QR екеуін де қосу ұсынылады.",
    btnDownloadPng: "PNG жүктеу",
  },
  zh: {
    warnDeepLinkNotFound: "在选择列表（最近 50 条）中找不到咨询 #{id} — 请在下方手动选择。",
    errAuth: "身份验证错误 — 请重新登录", errCreateFailedTpl: "创建失败：{msg}", errCreateFailed: "创建失败",
    errPastSchedule: "不能预约已过去的时间，请重新选择。",
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
    inquiryNotCountedTitle: "⚠️ 招引追踪将会中断",
    inquiryNotCountedBody: "指标本身在标记完成后即会计入。但未关联咨询时，将无法追溯此会诊来自哪条咨询，因而会从招引转化分析中脱落。之后可在会诊列表中补关联。",
    phInviteeName: "主要接收人（患者）姓名 — 选择咨询后自动填充", phInviteeEmail: "输入邮箱后按回车 — 可填多人（可选）", chipMe: "我",
    phInviteePhone: "手机号（可选）— 含国家代码，如 +77011234567", waSend: "通过 WhatsApp 发送",
    emailSentToTpl: "✉️ 已发送邀请：{list}", emailNotSent: "✉️ 未填写邮箱，未发送邀请 — 请复制上方链接自行转发。",
    lblScheduledAt: "预约时间（KST · 韩国时间）",
    lblSessionType: "会诊类型", sessionTypePlaceholder: "— 请选择 —", sessionTypePre: "治疗前评估", sessionTypeFollow: "复诊", sessionTypeEmergency: "紧急会诊", sessionTypePartner: "合作方会议（代理机构/医院）", sessionTypePartnerHint: "不计入 KHIDI 指标（术前咨询/术后随访）。",
    notesInquiryPrefix: "咨询",
    btnCancel: "取消", btnSubmitting: "创建中…", btnSubmit: "创建会诊预约",
    rolePatient: "🧑 患者", roleDoctorLabel: "👨‍⚕️ 医生", roleTranslator: "🗣 翻译", roleCoordinatorLabel: "🤝 协调员", roleObserver: "👁 观察员", roleGuest: "🔗 参与者",
    defaultInviteLabel: "患者邀请链接（无需账户）", btnCopy: "复制", toastCopyDone: "链接已复制", toastCopyFail: "复制失败",
    expiresPrefix: "过期时间：", qrScanTitle: "📱 手机扫码",
    qrScanDesc: "患者用手机摄像头扫描即可直接进入，无需安装应用。建议邮件中同时附上链接和二维码。",
    btnDownloadPng: "下载PNG",
  },
  ja: {
    warnDeepLinkNotFound: "問い合わせ #{id} が選択リスト（最新50件）にありません — 下から直接選んでください。",
    errAuth: "認証エラー — 再度ログインしてください", errCreateFailedTpl: "作成に失敗しました: {msg}", errCreateFailed: "作成に失敗しました",
    errPastSchedule: "過去の時刻には予約できません。別の時刻を選んでください。",
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
    inquiryNotCountedTitle: "⚠️ 誘致追跡が切れます",
    inquiryNotCountedBody: "実績そのものは「完了」にすれば計上されます。ただし問い合わせを紐づけないと「どの問い合わせから来た相談か」が切れ、誘致転換の分析から外れます。あとから相談一覧で紐づけることもできます。",
    phInviteeName: "代表受信者（患者）氏名 — 問い合わせ選択時に自動入力", phInviteeEmail: "メールを入力して Enter — 複数可（任意）", chipMe: "自分",
    phInviteePhone: "電話番号（任意）— 国番号を含む 例: +77011234567", waSend: "WhatsApp で送信",
    emailSentToTpl: "✉️ 招待状を送信: {list}", emailNotSent: "✉️ メール未入力のため招待状は送っていません — 上のリンクをコピーして直接お渡しください。",
    lblScheduledAt: "予定時刻（KST・韓国時間基準）",
    lblSessionType: "セッション種別", sessionTypePlaceholder: "— 選択してください —", sessionTypePre: "治療前評価", sessionTypeFollow: "再診", sessionTypeEmergency: "緊急相談", sessionTypePartner: "パートナー会議（代理店・病院）", sessionTypePartnerHint: "KHIDI 実績（事前相談・術後フォロー）には計上されません。",
    notesInquiryPrefix: "問い合わせ",
    btnCancel: "キャンセル", btnSubmitting: "作成中…", btnSubmit: "相談予約を作成",
    rolePatient: "🧑 患者", roleDoctorLabel: "👨‍⚕️ 医師", roleTranslator: "🗣 通訳", roleCoordinatorLabel: "🤝 コーディネーター", roleObserver: "👁 参観者", roleGuest: "🔗 参加",
    defaultInviteLabel: "患者招待リンク（アカウント不要）", btnCopy: "コピー", toastCopyDone: "リンクをコピーしました", toastCopyFail: "コピー失敗",
    expiresPrefix: "有効期限:", qrScanTitle: "📱 モバイルQRスキャン",
    qrScanDesc: "患者が自分のスマホカメラでスキャンすればアプリ不要ですぐ接続できます。メールにリンクとQRの両方を入れることを推奨。",
    btnDownloadPng: "PNGダウンロード",
  },
};

// WhatsApp 전달 문구 — 환자 언어 기준(백오피스 언어와 별개).
// ponytail: 문자(SMS) 발송 업체가 아직 연동돼 있지 않다(src/lib/notifications/adminNotifier.ts →
// sms_not_configured). 그래서 번호는 저장·자동발송하지 않고, 스태프가 누르면 WhatsApp 이 열리고
// 문구가 채워지는 데까지만 한다. 실제 자동 발송이 필요해지면 그때 업체를 붙인다.
const WA_MSG = {
  ru: "healwith — онлайн-консультация\n🕒 {time} (время Кореи, GMT+9)\n🔗 {url}",
  kz: "healwith — онлайн-кеңес\n🕒 {time} (Корея уақыты, GMT+9)\n🔗 {url}",
  en: "healwith — online consultation\n🕒 {time} (Korea time, GMT+9)\n🔗 {url}",
  zh: "healwith — 在线会诊\n🕒 {time}（韩国时间 GMT+9）\n🔗 {url}",
};

function waLink(phone, patientLang, url, scheduledAtKst) {
  const digits = String(phone || "").replace(/\D/g, "");
  const time = String(scheduledAtKst || "").replace("T", " ");
  const tpl = WA_MSG[patientLang] || WA_MSG.ru;
  const text = tpl.replace("{time}", time).replace("{url}", url);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// ─── 새 상담 예약 모달 ──────────────────────────────────────────
export function CreateConsultationModal({ onClose, onSuccess, initialInquiryId = null }) {
  const toast = useToast();
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const fmt = (tpl, vals) => Object.entries(vals).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  // 지금(한국시간)을 datetime-local 이 쓰는 «YYYY-MM-DDTHH:mm» 문자열로.
  // 아래 제출부가 이 칸의 값을 «KST 로 해석»하므로, 기본값·하한도 반드시 KST 로 만들어야 한다.
  const kstInputNow = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16);
  // 지난 시각은 못 고르게 — 달력 위젯의 하한. 모달을 연 시점으로 고정(매 렌더 바뀌면 입력이 튄다).
  const [minScheduledAt] = useState(kstInputNow);

  const [form, setForm] = useState(() => {
    // 기본 값: 1시간 후, 정각으로.
    // ⚠️ 예전엔 `new Date(); d.setHours(+1); d.toISOString()` 이었다. toISOString() 은 **UTC** 인데
    //    제출부는 그 문자열을 **KST(+09:00)로 해석**한다 → 기본값이 **9시간 과거로 밀렸다.**
    //    2026-08-04 실측: 저녁 6시 18분에 모달을 열면 기본값이 그날 «오전 10시 18분»(이미 지난 시각).
    //    시각만 «오후 3시»로 고치면 날짜는 그날 그대로라 «만들자마자 지난 회의»가 됐고,
    //    목록에서 아래로 밀려 «내가 만든 게 안 보인다»가 됐다(2026-08-04 PO 제보).
    const d = new Date(Date.now() + 9 * 3600 * 1000);
    d.setUTCHours(d.getUTCHours() + 1, 0, 0, 0);
    return {
      selected_inquiry_id: "",
      // ⚠️ 기본값을 «비움»으로 둔다 — 고르지 않으면 저장이 안 된다(select required).
      //   왜: 예전 기본값이 pre_consultation 이었다. 그래서 에이전시·내부 미팅을 만들 때
      //   유형을 안 건드리면 그대로 「사전상담」으로 저장됐고, 그건 KHIDI 공식 실적에
      //   «집계되는» 유형이다. 실제로 5건(7/29·7/31·8/3×3)이 그렇게 잘못 찍혀 있었다
      //   (2026-08-04 PO 확인 후 partner_meeting 으로 정정). 실적 오분류는 허위실적으로
      //   이어지므로 «기본값으로 조용히 정해지는» 것보다 한 번 더 고르게 하는 편이 싸다.
      session_type: "",
      scheduled_at: d.toISOString().slice(0, 16),
      // 언어는 화면에서 고르지 않는다 — 문의를 고르면 그 환자 언어로 자동(없으면 러시아어).
      patient_language: "ru",
      notes: "",
      // 통합 초대 링크 1개(role=guest) — 환자·의사 등 모두 이 링크로 입장.
      // inviteeName/Email 은 자동 발송용 대표 수신자(보통 환자).
      inviteeName: "",
      // 수신자는 여러 명 — 주소마다 초대장(과 30분 전 리마인더)이 각자 나간다.
      inviteeEmails: [],
      // WhatsApp 전달용 번호 — 저장하지 않는다(SMS 발송 수단 미연동). 완료 화면의 «WhatsApp 으로 보내기» 에만 쓴다.
      inviteePhone: "",
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null); // 생성 후 initiate 결과 (세션 + invite)
  // 문의(inquiries) 옵션 — 환자를 직접 타이핑하지 않고 실제 문의에서 선택
  const [inquiryOptions, setInquiryOptions] = useState([]);
  // 딥링크(?inquiry=)로 열렸을 때 — 목록이 오면 그 문의를 «한 번만» 고른다 (2026-09-07, 사후관리 보드 [상담 잡기]).
  const appliedInitialRef = useRef(false);
  useEffect(() => {
    if (!initialInquiryId || appliedInitialRef.current || inquiryOptions.length === 0) return;
    appliedInitialRef.current = true;
    // 선택 목록은 최근 50건(step1 완료)만 — 사후관리 보드의 오래된 문의는 없을 수 있다. 조용히 빈 모달을 열지 말고 말해준다.
    if (!inquiryOptions.some((i) => String(i.id) === String(initialInquiryId))) {
      toast.warning(fmt(tt("warnDeepLinkNotFound"), { id: initialInquiryId }));
      return;
    }
    applyInquiry(String(initialInquiryId));
  }, [initialInquiryId, inquiryOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // 지금 로그인한 사람(= 만든 사람) 주소 — 수신자 칸에 «나» 표를 붙이기 위해서만 쓴다
  const [myEmail, setMyEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        // 문의는 RLS상 service_role 만 읽기 가능 + 이름 암호화 → 서버 picker API 사용
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        // 「만든 사람도 사본을 받는다」(PO 2026-07-31). 단 몰래 보내지 않는다 —
        // 수신자 칸에 «나» 표가 붙은 채로 보이고, 빼고 싶으면 × 로 빼면 된다.
        // (예전엔 화면에 안 보이는 채로 보내서 «왜 나한테 왔지» 사고가 났다.)
        const myEmail = sessionData?.session?.user?.email;
        if (!cancelled) {
          if (myEmail) setMyEmail(myEmail);
          const fixed = [...STAFF_ALWAYS_CC, ...(myEmail ? [myEmail] : [])];
          setForm((f) => ({
            ...f,
            inviteeEmails: [...new Set([...f.inviteeEmails, ...fixed])],
          }));
        }
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
        const inqEmail = result.inquiry.email;
        setForm((f) => ({
          ...f,
          inviteeEmails:
            inqEmail && inqEmail.includes("@") && !f.inviteeEmails.includes(inqEmail)
              ? [...f.inviteeEmails, inqEmail]
              : f.inviteeEmails,
          inviteeName: full || f.inviteeName,
        }));
      }
    } catch {
      // silent — 이메일 자동 채움 실패해도 수동 입력 가능
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // 지난 시각 차단 — 위 min 은 브라우저마다 강제 정도가 달라 여기서 한 번 더 막는다.
    // 1분 여유: 「지금」으로 잡고 저장을 누르는 사이에 초가 지나 반려되는 걸 막는다.
    if (new Date(`${form.scheduled_at}+09:00`).getTime() < Date.now() - 60000) {
      toast.error(tt("errPastSchedule"));
      return;
    }
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
        // datetime-local 은 tz 없는 naive 문자열 → KST(+09:00)로 해석해 UTC 저장.
        // (과거엔 브라우저 로컬 tz 로 해석돼, 어드민 PC 가 KST 가 아니면 예약시각·리마인더가 틀어짐)
        scheduled_at: new Date(`${form.scheduled_at}+09:00`).toISOString(),
      };
      // 게스트 관련 필드 / UI 플래그 제거
      delete payload.inviteeName;
      delete payload.inviteeEmails;
      delete payload.inviteePhone;
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

      // 2. 참여 링크(role=guest) 발급 — 수신자 한 명당 하나씩(각자 초대 메일 + 30분 전 리마인더).
      //    수신자를 아무도 안 넣었으면 링크만 1개 만들고 메일은 안 보낸다.
      const recipients = form.inviteeEmails.length > 0 ? form.inviteeEmails : [null];
      const invites = [];
      const sentTo = [];
      if (sessionId) {
        for (const email of recipients) {
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
                  inviteeEmail: email || undefined,
                  expiresInHours: 72,
                  // 회수 제한 없음(만료 전까지 무제한, PO 2026-07-15) — 재접속·공용 참여 자유, 안전선은 72h 만료
                  maxUses: 0,
                }),
              }
            );
            const inviteResult = await inviteRes.json();
            if (inviteRes.ok && inviteResult.ok) {
              // 링크는 하나만 보여준다 — 회수 제한이 없어 아무나 이 링크로 들어올 수 있다.
              if (invites.length === 0) {
                invites.push({
                  role: "guest",
                  url: inviteResult.inviteUrl,
                  expiresAt: inviteResult.expiresAt,
                });
              }
              if (inviteResult.emailSent) sentTo.push(email);
            } else {
              console.warn("[invite:guest] 실패:", inviteResult.error);
            }
          } catch (inviteErr) {
            console.error("[invite:guest] 예외:", inviteErr);
          }
        }
      }

      setCreated({
        sessionId,
        invites,
        sentTo,
        scheduledAtKst: form.scheduled_at,
        phone: form.inviteePhone,
        patientLang: form.patient_language,
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
                  {/* «어디로 나갔나»를 그 자리에서 보여준다 — 조용히 나가서 엉뚱한 사람이 받는 사고(2026-07-31) 재발 방지 */}
                  <p className="mt-2 text-xs text-gray-600">
                    {created.sentTo.length > 0
                      ? fmt(tt("emailSentToTpl"), { list: created.sentTo.join(", ") })
                      : tt("emailNotSent")}
                  </p>
                  {created.phone && (
                    <a
                      href={waLink(created.phone, created.patientLang, inv.url, created.scheduledAtKst)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm font-semibold hover:brightness-95"
                    >
                      <span>💬</span> {tt("waSend")}
                    </a>
                  )}
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

              {/* ⚠️ 실적에 안 잡히는 조합을 «만들기 전에» 알린다 (2026-07-29).
                  왜: 집계 조건이 「문의 연결 + 완료」인데, 문의 선택이 «(선택)» 이라 안 골라도
                  아무 신호가 없었다. 실측 결과 사전상담 방 66개가 전부 inquiry_id 비어 있어
                  KHIDI 사전상담·사후관리 실적이 구조적으로 0 이었다.
                  ※ 막지는 않는다 — 문의 없이 잡아야 하는 상담도 있다(picker 가 step1 미완 문의를
                    아직 안 보여주는 한계도 있음). 「모르고 놓치는 것」만 없앤다. */}
              {KHIDI_COUNTED_TYPES.includes(form.session_type) && !form.selected_inquiry_id && (
                <div
                  role="status"
                  className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-amber-900">{tt("inquiryNotCountedTitle")}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">{tt("inquiryNotCountedBody")}</p>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-teal-200 space-y-2">
              <input
                type="text"
                value={form.inviteeName}
                onChange={(e) => setForm({ ...form, inviteeName: e.target.value })}
                placeholder={tt("phInviteeName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <EmailChips
                emails={form.inviteeEmails}
                onChange={(emails) => setForm({ ...form, inviteeEmails: emails })}
                placeholder={tt("phInviteeEmail")}
                meEmail={myEmail}
                meLabel={tt("chipMe")}
              />
              <input
                type="tel"
                value={form.inviteePhone}
                onChange={(e) => setForm({ ...form, inviteePhone: e.target.value })}
                placeholder={tt("phInviteePhone")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* 예약 시각 — 필수. 기본 노출 (나머지는 고급 옵션으로 접음) */}
          <Field label={tt("lblScheduledAt")}>
            <input
              type="datetime-local"
              required
              // 지난 시각은 아예 못 고르게 — 「만들자마자 지난 회의」 재발 방지.
              // (브라우저마다 min 강제 정도가 다르므로 제출 때 한 번 더 막는다)
              min={minScheduledAt}
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          {/* 세션 유형 — 실적 집계가 여기서 갈린다(파트너 미팅은 KHIDI 실적에서 빠짐).
              나머지 옵션(환자계정·코디·언어·병원/의사·비고)은 2026-07-31 PO 지시로 제거:
              «상대 연락처 + 시각 + 어느 상담인지» 만 남긴다. 언어는 문의에서 자동으로 따라온다. */}
          <Field label={tt("lblSessionType")}>
            <select
              value={form.session_type}
              onChange={(e) => setForm({ ...form, session_type: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="" disabled>{tt("sessionTypePlaceholder")}</option>
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


// ─── 이메일 여러 개 입력 (Enter·쉼표로 한 칸씩 쌓임) ─────────────
function EmailChips({ emails, onChange, placeholder, meEmail, meLabel }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    // 쉼표·빈칸으로 여러 개 붙여넣기도 받는다
    const next = [...emails];
    for (const piece of String(raw).split(/[,\s;]+/)) {
      const v = piece.trim();
      if (v.includes("@") && !next.includes(v)) next.push(v);
    }
    if (next.length !== emails.length) onChange(next);
    setDraft("");
  };

  return (
    <div className="w-full flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-teal-500">
      {emails.map((em) => (
        <span
          key={em}
          className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 border border-teal-200 rounded text-xs text-teal-900"
        >
          {em}
          {em === meEmail && (
            <span className="px-1 rounded bg-teal-700 text-white text-[10px] font-semibold">{meLabel}</span>
          )}
          <button
            type="button"
            onClick={() => onChange(emails.filter((x) => x !== em))}
            className="text-teal-700 hover:text-teal-900 leading-none"
            aria-label={`${em} 제거`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            if (draft.trim()) {
              e.preventDefault(); // Enter 로 폼이 제출되지 않게
              add(draft);
            }
          } else if (e.key === "Backspace" && !draft && emails.length > 0) {
            onChange(emails.slice(0, -1));
          }
        }}
        // 입력만 해두고 «생성»을 눌러도 빠지지 않게 — 포커스가 떠나면 담는다
        onBlur={() => draft.trim() && add(draft)}
        placeholder={emails.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[180px] px-1 py-1 text-sm outline-none"
      />
    </div>
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
