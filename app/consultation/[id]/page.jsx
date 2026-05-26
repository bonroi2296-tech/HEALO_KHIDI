"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  MessageSquare,
  Globe,
  Send,
  ChevronLeft,
  Languages,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { useToast } from "../../../src/components/Toast";
import { useSpeechRecognition, getEffectiveSttLang } from "../../../src/lib/consultation/useSpeechRecognition";
import { useTTS } from "../../../src/lib/consultation/useTTS";
import { useRealtimeMessages } from "../../../src/lib/consultation/useRealtimeMessages";
import { useLiveKitDataChannel } from "../../../src/lib/consultation/useLiveKitDataChannel";

const supabase = createSupabaseBrowserClient();

const LANG_LABELS = {
  ko: "한국어",
  ru: "Русский",
  en: "English",
  kz: "Қазақша",
  zh: "中文",
  ja: "日本語",
};

/* ───────── i18n (6개 언어) ───────── */
const COPY = {
  ko: {
    aiSubtitleDisclaimer: "AI 자막은 참고용입니다. 의학적 판단은 의료진과 직접 확인하세요.",
    // Guest join form
    guestTitle: "HEALO 원격 상담",
    guestLede: "초대 링크로 입장합니다. 본인 이름을 입력하고 카메라/마이크 사용을 허용해주세요.",
    nameLabel: "이름 (의료진에게 표시됨)",
    namePlaceholder: "예: Айжан Нурланова / Ji-hoon Park",
    joining: "접속 중…",
    startConsult: "상담 시작",
    guestSecurity1: "🔒 통신은 AES-256 암호화됩니다. 이 링크는 본인 상담 1회에만 유효합니다.",
    guestSecurity2: "녹화 / 녹음이 필요한 경우 의료진이 사전에 안내합니다.",
    // Validation / errors
    nameTooShort: "이름을 2자 이상 입력해주세요.",
    inviteExpired: "초대 링크가 만료되었거나 유효하지 않습니다. 관리자에게 새 링크를 요청하세요.",
    consultClosed: "이미 종료된 상담입니다.",
    rateLimited: "너무 많은 시도가 감지되어 차단됐습니다. 잠시 후 다시 시도해주세요.",
    connectFailed: "접속 실패",
    networkError: "네트워크 오류. 잠시 후 다시 시도해주세요.",
    // Loading / error states
    connecting: "상담 연결 중...",
    sessionNotFound: "상담 세션을 찾을 수 없습니다.",
    goBack: "돌아가기",
    // Session types
    sessionPre: "사전 상담",
    sessionFollowUp: "사후 관리",
    sessionEmergency: "긴급 상담",
    sessionDiagnostic: "진단 검토",
    consultationFallback: "Consultation",
    connected: "연결됨",
    // Header controls
    stopTranslation: "번역 중지",
    startTranslation: "실시간 번역 시작",
    interpretation: "통번역",
    ttsOff: "음성 출력 끄기",
    ttsOn: "음성 출력 켜기",
    subtitleSizeTitle: "자막 크기",
    subtitleSmall: "자막 小",
    subtitleMedium: "자막 中",
    subtitleLarge: "자막 大",
    endCall: "종료",
    // Admission states
    admissionRejectedTitle: "입장이 거절되었습니다",
    admissionRejectedBody: "의료진이 입장을 거절했습니다. 관리자 / 코디네이터에게 문의해주세요.",
    waitingRoomTitle: "대기실 (Waiting Room)",
    waitingRoomBody1: "의료진이 곧 입장을 승인합니다.",
    waitingRoomBody2: "잠시만 기다려주세요 — 이 화면은 자동으로 전환됩니다.",
    checkingStatus: "상태 확인 중...",
    waitingRoomPrivacy1: "이 대기실은 HIPAA / PIPA 기준 프라이버시 보호 대기실입니다.",
    waitingRoomPrivacy2: "진료 시작 전까지 카메라 / 마이크는 활성화되지 않습니다.",
    // Pending admissions banner (doctor)
    pendingWaiting: "입장 대기 중",
    anonymous: "익명",
    approve: "승인",
    reject: "거절",
    // Placeholder video tiles
    doctorTile: "Doctor (의사)",
    patientTile: "Patient (환자)",
    waiting: "대기 중...",
    myScreen: "내 화면",
    livekitDisabled: "LiveKit 미설정 — 화상 연결이 비활성화되었습니다. 채팅과 통번역은 사용 가능합니다.",
    // Chat panel
    chatEmpty: "상담 메시지가 여기에 표시됩니다.",
    messagePlaceholder: "메시지를 입력하세요...",
    // Translation panel
    translationEmpty1: "상단의 [통번역] 버튼을 눌러",
    translationEmpty2: "실시간 번역을 시작하세요.",
    sttUnsupported1: "이 브라우저는 음성 인식을 지원하지 않습니다.",
    sttUnsupported2: "Chrome 브라우저를 사용해 주세요.",
    you: "You",
    translationActive: "실시간 번역 활성",
    translatingNow: "번역 중...",
    // Toasts
    translationStopped: "실시간 번역 종료",
    translationStartedPrefix: "실시간 번역 시작",
    admissionApproved: "입장 승인됨",
    admissionRejectedToast: "입장 거절됨",
    decideFailed: "처리 실패",
    authError: "인증 오류. 다시 로그인하세요.",
    sessionNotFoundToast: "상담 세션을 찾을 수 없습니다.",
    loadFailed: "상담 정보 로드 실패",
    doctorApprovedEntry: "의료진이 입장을 승인했습니다",
    entryRejected: "입장이 거절되었습니다",
    endConfirm: "상담을 종료하시겠습니까?",
    consultEnded: "상담이 종료되었습니다.",
    endFailed: "상담 종료 실패",
  },
  en: {
    aiSubtitleDisclaimer: "AI subtitles are for reference only. Confirm any medical judgment directly with your medical team.",
    guestTitle: "HEALO Remote Consultation",
    guestLede: "You are joining via an invite link. Enter your name and allow camera/microphone access.",
    nameLabel: "Name (shown to the medical team)",
    namePlaceholder: "e.g. Айжан Нурланова / Ji-hoon Park",
    joining: "Connecting…",
    startConsult: "Start consultation",
    guestSecurity1: "🔒 Communication is AES-256 encrypted. This link is valid for your single consultation only.",
    guestSecurity2: "If recording is needed, the medical team will inform you in advance.",
    nameTooShort: "Please enter a name of at least 2 characters.",
    inviteExpired: "The invite link has expired or is invalid. Please ask the administrator for a new link.",
    consultClosed: "This consultation has already ended.",
    rateLimited: "Too many attempts were detected and you were blocked. Please try again shortly.",
    connectFailed: "Connection failed",
    networkError: "Network error. Please try again shortly.",
    connecting: "Connecting to consultation...",
    sessionNotFound: "Consultation session not found.",
    goBack: "Go back",
    sessionPre: "Pre-consultation",
    sessionFollowUp: "Follow-up care",
    sessionEmergency: "Emergency consultation",
    sessionDiagnostic: "Diagnostic review",
    consultationFallback: "Consultation",
    connected: "Connected",
    stopTranslation: "Stop translation",
    startTranslation: "Start live translation",
    interpretation: "Interpret",
    ttsOff: "Turn off voice output",
    ttsOn: "Turn on voice output",
    subtitleSizeTitle: "Subtitle size",
    subtitleSmall: "Subtitle S",
    subtitleMedium: "Subtitle M",
    subtitleLarge: "Subtitle L",
    endCall: "End",
    admissionRejectedTitle: "Entry was declined",
    admissionRejectedBody: "The medical team declined your entry. Please contact the administrator or coordinator.",
    waitingRoomTitle: "Waiting Room",
    waitingRoomBody1: "The medical team will approve your entry shortly.",
    waitingRoomBody2: "Please wait a moment — this screen will switch automatically.",
    checkingStatus: "Checking status...",
    waitingRoomPrivacy1: "This is a privacy-protected waiting room compliant with HIPAA / PIPA.",
    waitingRoomPrivacy2: "Your camera / microphone will not be activated until the consultation begins.",
    pendingWaiting: "Waiting to enter",
    anonymous: "Anonymous",
    approve: "Approve",
    reject: "Decline",
    doctorTile: "Doctor",
    patientTile: "Patient",
    waiting: "Waiting...",
    myScreen: "My view",
    livekitDisabled: "LiveKit not configured — video connection is disabled. Chat and interpretation are available.",
    chatEmpty: "Consultation messages will appear here.",
    messagePlaceholder: "Type a message...",
    translationEmpty1: "Press the [Interpret] button above",
    translationEmpty2: "to start live translation.",
    sttUnsupported1: "This browser does not support speech recognition.",
    sttUnsupported2: "Please use the Chrome browser.",
    you: "You",
    translationActive: "Live translation active",
    translatingNow: "Translating...",
    translationStopped: "Live translation stopped",
    translationStartedPrefix: "Live translation started",
    admissionApproved: "Entry approved",
    admissionRejectedToast: "Entry declined",
    decideFailed: "Action failed",
    authError: "Authentication error. Please log in again.",
    sessionNotFoundToast: "Consultation session not found.",
    loadFailed: "Failed to load consultation info",
    doctorApprovedEntry: "The medical team approved your entry",
    entryRejected: "Your entry was declined",
    endConfirm: "Are you sure you want to end the consultation?",
    consultEnded: "The consultation has ended.",
    endFailed: "Failed to end consultation",
  },
  ru: {
    aiSubtitleDisclaimer: "Субтитры ИИ носят справочный характер. Любые медицинские решения уточняйте напрямую у врача.",
    guestTitle: "Удалённая консультация HEALO",
    guestLede: "Вы входите по ссылке-приглашению. Введите своё имя и разрешите доступ к камере и микрофону.",
    nameLabel: "Имя (отображается медицинскому персоналу)",
    namePlaceholder: "напр.: Айжан Нурланова / Ji-hoon Park",
    joining: "Подключение…",
    startConsult: "Начать консультацию",
    guestSecurity1: "🔒 Связь зашифрована по стандарту AES-256. Ссылка действительна только для одной вашей консультации.",
    guestSecurity2: "Если потребуется запись, медицинский персонал предупредит вас заранее.",
    nameTooShort: "Введите имя длиной не менее 2 символов.",
    inviteExpired: "Ссылка-приглашение истекла или недействительна. Запросите новую ссылку у администратора.",
    consultClosed: "Эта консультация уже завершена.",
    rateLimited: "Обнаружено слишком много попыток, доступ заблокирован. Повторите попытку позже.",
    connectFailed: "Не удалось подключиться",
    networkError: "Ошибка сети. Повторите попытку позже.",
    connecting: "Подключение к консультации...",
    sessionNotFound: "Сессия консультации не найдена.",
    goBack: "Назад",
    sessionPre: "Предварительная консультация",
    sessionFollowUp: "Последующее наблюдение",
    sessionEmergency: "Срочная консультация",
    sessionDiagnostic: "Анализ диагностики",
    consultationFallback: "Консультация",
    connected: "Подключено",
    stopTranslation: "Остановить перевод",
    startTranslation: "Начать перевод в реальном времени",
    interpretation: "Перевод",
    ttsOff: "Выключить озвучивание",
    ttsOn: "Включить озвучивание",
    subtitleSizeTitle: "Размер субтитров",
    subtitleSmall: "Субтитры S",
    subtitleMedium: "Субтитры M",
    subtitleLarge: "Субтитры L",
    endCall: "Завершить",
    admissionRejectedTitle: "Вход отклонён",
    admissionRejectedBody: "Медицинский персонал отклонил ваш вход. Обратитесь к администратору или координатору.",
    waitingRoomTitle: "Комната ожидания",
    waitingRoomBody1: "Медицинский персонал скоро подтвердит ваш вход.",
    waitingRoomBody2: "Пожалуйста, подождите — этот экран переключится автоматически.",
    checkingStatus: "Проверка статуса...",
    waitingRoomPrivacy1: "Эта комната ожидания защищает конфиденциальность согласно стандартам HIPAA / PIPA.",
    waitingRoomPrivacy2: "Камера и микрофон не активируются до начала консультации.",
    pendingWaiting: "Ожидают входа",
    anonymous: "Аноним",
    approve: "Принять",
    reject: "Отклонить",
    doctorTile: "Врач",
    patientTile: "Пациент",
    waiting: "Ожидание...",
    myScreen: "Моё изображение",
    livekitDisabled: "LiveKit не настроен — видеосвязь отключена. Чат и перевод доступны.",
    chatEmpty: "Здесь будут отображаться сообщения консультации.",
    messagePlaceholder: "Введите сообщение...",
    translationEmpty1: "Нажмите кнопку [Перевод] вверху,",
    translationEmpty2: "чтобы начать перевод в реальном времени.",
    sttUnsupported1: "Этот браузер не поддерживает распознавание речи.",
    sttUnsupported2: "Пожалуйста, используйте браузер Chrome.",
    you: "Вы",
    translationActive: "Перевод в реальном времени активен",
    translatingNow: "Перевод...",
    translationStopped: "Перевод в реальном времени остановлен",
    translationStartedPrefix: "Перевод в реальном времени начат",
    admissionApproved: "Вход подтверждён",
    admissionRejectedToast: "Вход отклонён",
    decideFailed: "Не удалось выполнить действие",
    authError: "Ошибка авторизации. Войдите снова.",
    sessionNotFoundToast: "Сессия консультации не найдена.",
    loadFailed: "Не удалось загрузить данные консультации",
    doctorApprovedEntry: "Медицинский персонал подтвердил ваш вход",
    entryRejected: "Ваш вход отклонён",
    endConfirm: "Вы уверены, что хотите завершить консультацию?",
    consultEnded: "Консультация завершена.",
    endFailed: "Не удалось завершить консультацию",
  },
  kz: {
    aiSubtitleDisclaimer: "ЖИ субтитрлері тек анықтама үшін. Кез келген медициналық шешімді дәрігермен тікелей нақтылаңыз.",
    guestTitle: "HEALO қашықтан консультациясы",
    guestLede: "Сіз шақыру сілтемесі арқылы кіресіз. Атыңызды енгізіп, камера/микрофонға рұқсат беріңіз.",
    nameLabel: "Аты-жөні (медициналық қызметкерге көрсетіледі)",
    namePlaceholder: "мыс.: Айжан Нұрланова / Ji-hoon Park",
    joining: "Қосылуда…",
    startConsult: "Консультацияны бастау",
    guestSecurity1: "🔒 Байланыс AES-256 стандартымен шифрланады. Бұл сілтеме тек сіздің бір консультацияңызға жарамды.",
    guestSecurity2: "Жазу қажет болса, медициналық қызметкер алдын ала хабарлайды.",
    nameTooShort: "Кемінде 2 таңбадан тұратын атты енгізіңіз.",
    inviteExpired: "Шақыру сілтемесінің мерзімі өтті немесе жарамсыз. Әкімшіден жаңа сілтеме сұраңыз.",
    consultClosed: "Бұл консультация әлдеқашан аяқталды.",
    rateLimited: "Тым көп әрекет анықталып, бұғатталдыңыз. Біраздан кейін қайталап көріңіз.",
    connectFailed: "Қосылу сәтсіз аяқталды",
    networkError: "Желі қатесі. Біраздан кейін қайталап көріңіз.",
    connecting: "Консультацияға қосылуда...",
    sessionNotFound: "Консультация сессиясы табылмады.",
    goBack: "Артқа",
    sessionPre: "Алдын ала консультация",
    sessionFollowUp: "Кейінгі бақылау",
    sessionEmergency: "Шұғыл консультация",
    sessionDiagnostic: "Диагностиканы қарау",
    consultationFallback: "Консультация",
    connected: "Қосылды",
    stopTranslation: "Аударманы тоқтату",
    startTranslation: "Нақты уақыттағы аударманы бастау",
    interpretation: "Аударма",
    ttsOff: "Дауыстап оқуды өшіру",
    ttsOn: "Дауыстап оқуды қосу",
    subtitleSizeTitle: "Субтитр өлшемі",
    subtitleSmall: "Субтитр S",
    subtitleMedium: "Субтитр M",
    subtitleLarge: "Субтитр L",
    endCall: "Аяқтау",
    admissionRejectedTitle: "Кіруге рұқсат берілмеді",
    admissionRejectedBody: "Медициналық қызметкер кіруіңізден бас тартты. Әкімшіге немесе үйлестірушіге хабарласыңыз.",
    waitingRoomTitle: "Күту бөлмесі",
    waitingRoomBody1: "Медициналық қызметкер жақын арада кіруіңізді растайды.",
    waitingRoomBody2: "Сәл күте тұрыңыз — бұл экран автоматты түрде ауысады.",
    checkingStatus: "Күй тексерілуде...",
    waitingRoomPrivacy1: "Бұл күту бөлмесі HIPAA / PIPA стандарттарына сай құпиялылықты қорғайды.",
    waitingRoomPrivacy2: "Консультация басталғанға дейін камера / микрофон іске қосылмайды.",
    pendingWaiting: "Кіруді күтуде",
    anonymous: "Анонимді",
    approve: "Растау",
    reject: "Бас тарту",
    doctorTile: "Дәрігер",
    patientTile: "Науқас",
    waiting: "Күтуде...",
    myScreen: "Менің бейнем",
    livekitDisabled: "LiveKit бапталмаған — бейнебайланыс өшірілген. Чат пен аударма қолжетімді.",
    chatEmpty: "Консультация хабарламалары осында көрсетіледі.",
    messagePlaceholder: "Хабарлама енгізіңіз...",
    translationEmpty1: "Жоғарыдағы [Аударма] түймесін басып,",
    translationEmpty2: "нақты уақыттағы аударманы бастаңыз.",
    sttUnsupported1: "Бұл браузер сөзді тануды қолдамайды.",
    sttUnsupported2: "Chrome браузерін пайдаланыңыз.",
    you: "Сіз",
    translationActive: "Нақты уақыттағы аударма белсенді",
    translatingNow: "Аударылуда...",
    translationStopped: "Нақты уақыттағы аударма тоқтатылды",
    translationStartedPrefix: "Нақты уақыттағы аударма басталды",
    admissionApproved: "Кіру расталды",
    admissionRejectedToast: "Кіруден бас тартылды",
    decideFailed: "Әрекет сәтсіз аяқталды",
    authError: "Аутентификация қатесі. Қайта кіріңіз.",
    sessionNotFoundToast: "Консультация сессиясы табылмады.",
    loadFailed: "Консультация деректерін жүктеу сәтсіз аяқталды",
    doctorApprovedEntry: "Медициналық қызметкер кіруіңізді растады",
    entryRejected: "Сіздің кіруіңізден бас тартылды",
    endConfirm: "Консультацияны аяқтағыңыз келе ме?",
    consultEnded: "Консультация аяқталды.",
    endFailed: "Консультацияны аяқтау сәтсіз аяқталды",
  },
  zh: {
    aiSubtitleDisclaimer: "AI 字幕仅供参考。任何医疗判断请直接向医疗团队确认。",
    guestTitle: "HEALO 远程问诊",
    guestLede: "您正通过邀请链接进入。请输入您的姓名并允许使用摄像头/麦克风。",
    nameLabel: "姓名（向医疗团队显示）",
    namePlaceholder: "例如：Айжан Нурланова / Ji-hoon Park",
    joining: "连接中…",
    startConsult: "开始问诊",
    guestSecurity1: "🔒 通信采用 AES-256 加密。此链接仅对您的本次问诊有效一次。",
    guestSecurity2: "如需录制/录音，医疗团队将提前告知您。",
    nameTooShort: "请输入至少 2 个字符的姓名。",
    inviteExpired: "邀请链接已过期或无效。请向管理员索取新链接。",
    consultClosed: "本次问诊已结束。",
    rateLimited: "检测到过多尝试，您已被拦截。请稍后再试。",
    connectFailed: "连接失败",
    networkError: "网络错误。请稍后再试。",
    connecting: "正在连接问诊...",
    sessionNotFound: "未找到问诊会话。",
    goBack: "返回",
    sessionPre: "诊前咨询",
    sessionFollowUp: "诊后随访",
    sessionEmergency: "紧急问诊",
    sessionDiagnostic: "诊断复核",
    consultationFallback: "问诊",
    connected: "已连接",
    stopTranslation: "停止翻译",
    startTranslation: "开始实时翻译",
    interpretation: "口译",
    ttsOff: "关闭语音播报",
    ttsOn: "开启语音播报",
    subtitleSizeTitle: "字幕大小",
    subtitleSmall: "字幕 小",
    subtitleMedium: "字幕 中",
    subtitleLarge: "字幕 大",
    endCall: "结束",
    admissionRejectedTitle: "入室请求被拒绝",
    admissionRejectedBody: "医疗团队拒绝了您的入室请求。请联系管理员/协调员。",
    waitingRoomTitle: "候诊室",
    waitingRoomBody1: "医疗团队将很快批准您入室。",
    waitingRoomBody2: "请稍候——此页面将自动切换。",
    checkingStatus: "正在确认状态...",
    waitingRoomPrivacy1: "本候诊室符合 HIPAA / PIPA 隐私保护标准。",
    waitingRoomPrivacy2: "在问诊开始前，摄像头/麦克风不会被激活。",
    pendingWaiting: "等待入室",
    anonymous: "匿名",
    approve: "批准",
    reject: "拒绝",
    doctorTile: "医生",
    patientTile: "患者",
    waiting: "等待中...",
    myScreen: "我的画面",
    livekitDisabled: "LiveKit 未配置——视频连接已禁用。聊天和口译仍可使用。",
    chatEmpty: "问诊消息将显示在此处。",
    messagePlaceholder: "输入消息...",
    translationEmpty1: "点击上方的 [口译] 按钮",
    translationEmpty2: "开始实时翻译。",
    sttUnsupported1: "此浏览器不支持语音识别。",
    sttUnsupported2: "请使用 Chrome 浏览器。",
    you: "您",
    translationActive: "实时翻译已启用",
    translatingNow: "翻译中...",
    translationStopped: "实时翻译已停止",
    translationStartedPrefix: "实时翻译已开始",
    admissionApproved: "已批准入室",
    admissionRejectedToast: "已拒绝入室",
    decideFailed: "操作失败",
    authError: "认证错误。请重新登录。",
    sessionNotFoundToast: "未找到问诊会话。",
    loadFailed: "加载问诊信息失败",
    doctorApprovedEntry: "医疗团队已批准您入室",
    entryRejected: "您的入室请求被拒绝",
    endConfirm: "确定要结束问诊吗？",
    consultEnded: "问诊已结束。",
    endFailed: "结束问诊失败",
  },
  ja: {
    aiSubtitleDisclaimer: "AI字幕は参考用です。医学的な判断は医療スタッフに直接ご確認ください。",
    guestTitle: "HEALO オンライン診療",
    guestLede: "招待リンクから入室します。お名前を入力し、カメラ/マイクの使用を許可してください。",
    nameLabel: "お名前（医療スタッフに表示されます）",
    namePlaceholder: "例：Айжан Нурланова / Ji-hoon Park",
    joining: "接続中…",
    startConsult: "診療を開始",
    guestSecurity1: "🔒 通信はAES-256で暗号化されます。このリンクはご本人の診療1回のみ有効です。",
    guestSecurity2: "録画/録音が必要な場合は、医療スタッフが事前にご案内します。",
    nameTooShort: "お名前を2文字以上入力してください。",
    inviteExpired: "招待リンクの有効期限が切れているか、無効です。管理者に新しいリンクをご依頼ください。",
    consultClosed: "この診療はすでに終了しています。",
    rateLimited: "試行回数が多すぎたためブロックされました。しばらくしてから再度お試しください。",
    connectFailed: "接続に失敗しました",
    networkError: "ネットワークエラー。しばらくしてから再度お試しください。",
    connecting: "診療に接続中...",
    sessionNotFound: "診療セッションが見つかりません。",
    goBack: "戻る",
    sessionPre: "事前相談",
    sessionFollowUp: "事後ケア",
    sessionEmergency: "緊急相談",
    sessionDiagnostic: "診断レビュー",
    consultationFallback: "診療",
    connected: "接続済み",
    stopTranslation: "翻訳を停止",
    startTranslation: "リアルタイム翻訳を開始",
    interpretation: "通訳",
    ttsOff: "音声出力をオフ",
    ttsOn: "音声出力をオン",
    subtitleSizeTitle: "字幕サイズ",
    subtitleSmall: "字幕 小",
    subtitleMedium: "字幕 中",
    subtitleLarge: "字幕 大",
    endCall: "終了",
    admissionRejectedTitle: "入室が拒否されました",
    admissionRejectedBody: "医療スタッフが入室を拒否しました。管理者/コーディネーターにお問い合わせください。",
    waitingRoomTitle: "待合室",
    waitingRoomBody1: "医療スタッフがまもなく入室を承認します。",
    waitingRoomBody2: "少々お待ちください — この画面は自動的に切り替わります。",
    checkingStatus: "状態を確認中...",
    waitingRoomPrivacy1: "この待合室はHIPAA / PIPA基準のプライバシー保護待合室です。",
    waitingRoomPrivacy2: "診療開始まで、カメラ/マイクは有効になりません。",
    pendingWaiting: "入室待ち",
    anonymous: "匿名",
    approve: "承認",
    reject: "拒否",
    doctorTile: "医師",
    patientTile: "患者",
    waiting: "待機中...",
    myScreen: "自分の画面",
    livekitDisabled: "LiveKit未設定 — ビデオ接続が無効です。チャットと通訳はご利用いただけます。",
    chatEmpty: "診療メッセージがここに表示されます。",
    messagePlaceholder: "メッセージを入力してください...",
    translationEmpty1: "上部の[通訳]ボタンを押して",
    translationEmpty2: "リアルタイム翻訳を開始してください。",
    sttUnsupported1: "このブラウザは音声認識に対応していません。",
    sttUnsupported2: "Chromeブラウザをご使用ください。",
    you: "あなた",
    translationActive: "リアルタイム翻訳が有効",
    translatingNow: "翻訳中...",
    translationStopped: "リアルタイム翻訳を停止しました",
    translationStartedPrefix: "リアルタイム翻訳を開始しました",
    admissionApproved: "入室を承認しました",
    admissionRejectedToast: "入室を拒否しました",
    decideFailed: "処理に失敗しました",
    authError: "認証エラー。再度ログインしてください。",
    sessionNotFoundToast: "診療セッションが見つかりません。",
    loadFailed: "診療情報の読み込みに失敗しました",
    doctorApprovedEntry: "医療スタッフが入室を承認しました",
    entryRejected: "入室が拒否されました",
    endConfirm: "診療を終了しますか？",
    consultEnded: "診療が終了しました。",
    endFailed: "診療の終了に失敗しました",
  },
};

// ── DataChannel bridge (LiveKitRoom 내부에서만 사용 가능) ──
// props 로 외부 state setter 를 받아서 DataChannel 수신 결과를 부모에 전달
function DataChannelBridge({ onRemoteSubtitle, publishRef }) {
  const { publishSubtitle } = useLiveKitDataChannel({ onRemoteSubtitle });

  // 부모가 publishSubtitle 을 호출할 수 있도록 ref 에 노출
  useEffect(() => {
    if (publishRef) publishRef.current = publishSubtitle;
  }, [publishSubtitle, publishRef]);

  return null; // 렌더링 없음
}

// ── LiveKit Video Grid ──
function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

// 자막 크기별 Tailwind 클래스
const SUBTITLE_SIZE_CLASS = {
  sm: { text: "text-xs", trans: "text-sm", meta: "text-xs" },
  md: { text: "text-sm", trans: "text-base", meta: "text-xs" },
  lg: { text: "text-base", trans: "text-lg", meta: "text-sm" },
};

// ── Subtitle overlay ──
// size: "sm" | "md" | "lg"
// remoteSubtitle: { text, lang, role } | null  — 상대방 자막 (DataChannel 수신)
function SubtitleOverlay({
  original,
  translated,
  interimText,
  sourceLang,
  targetLang,
  remoteSubtitle,
  size = "md",
}) {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const hasContent = original || interimText || remoteSubtitle?.text;
  if (!hasContent) return null;

  const sz = SUBTITLE_SIZE_CLASS[size] || SUBTITLE_SIZE_CLASS.md;

  // 역할별 색상
  const roleColor = {
    doctor: "text-yellow-300",
    patient: "text-teal-300",
    coordinator: "text-gray-300",
  };
  const remoteColor = roleColor[remoteSubtitle?.role] || "text-teal-300";

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none space-y-2">
      {/* 상대방 자막 (DataChannel 수신) */}
      {remoteSubtitle?.text && (
        <div className="bg-black/75 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-yellow-500/20">
          <p className="text-yellow-500/70 text-xs mb-0.5">
            {remoteSubtitle.role === "doctor" ? "Doctor" : "Patient"} — {LANG_LABELS[remoteSubtitle.lang] || remoteSubtitle.lang}
          </p>
          <p className={`${remoteColor} ${sz.trans} font-medium`}>{remoteSubtitle.text}</p>
        </div>
      )}

      {/* 내 음성 인식 중간 결과 */}
      {interimText && (
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
          <p className={`text-gray-300 ${sz.text} italic`}>🎤 {interimText}</p>
        </div>
      )}

      {/* 내 발화 번역 결과 */}
      {original && (
        <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
          <p className={`text-gray-400 ${sz.meta} mb-1`}>
            {LANG_LABELS[sourceLang] || sourceLang}
          </p>
          <p className={`text-white ${sz.text} mb-2`}>{original}</p>
          <div className="border-t border-gray-600 pt-2">
            <p className={`text-teal-400 ${sz.meta} mb-1`}>
              → {LANG_LABELS[targetLang] || targetLang}
            </p>
            <p className={`text-teal-300 ${sz.trans} font-medium`}>{translated}</p>
          </div>
        </div>
      )}

      {/* 의료 면책 문구 */}
      <p className="text-center text-gray-500 text-[10px] leading-tight">
        {c.aiSubtitleDisclaimer}
      </p>
    </div>
  );
}

// ── Main Page ──
export default function ConsultationRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const consultationId = params.id;

  // Guest mode: URL 에 ?invite=<token> 있으면 계정 없이 입장 가능
  const inviteToken = searchParams?.get("invite") || null;
  const isGuestMode = !!inviteToken;

  // Core state
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(!isGuestMode); // 게스트는 초기엔 이름 입력 폼 표시
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [connected, setConnected] = useState(false);

  // Guest mode state
  const [guestName, setGuestName] = useState("");
  const [guestJoining, setGuestJoining] = useState(false);
  const [guestError, setGuestError] = useState("");
  // Waiting Room — 의사 승인 대기
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionStatus, setAdmissionStatus] = useState(null);
  // 의사/관리자용 대기 목록 (pending 참가자)
  const [pendingAdmissions, setPendingAdmissions] = useState([]);

  // Panel state
  const [activePanel, setActivePanel] = useState("translation"); // "chat" | "translation"
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  // Translation state
  const [translations, setTranslations] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [interimText, setInterimText] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  // 자막 크기: "sm" | "md" | "lg"
  const [subtitleSize, setSubtitleSize] = useState("md");
  // 상대방 자막 (DataChannel 수신)
  const [remoteSubtitle, setRemoteSubtitle] = useState(null);
  const remoteSubtitleTimerRef = useRef(null);
  // 내 역할 (token metadata 에서 추론: guest=patient 기본)
  const [myRole, setMyRole] = useState("patient");

  // Language settings — default: doctor=ko, patient=ru
  const [myLang, setMyLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("ru");

  const translationsEndRef = useRef(null);
  const subtitleTimerRef = useRef(null);
  // DataChannel publish 함수 ref (LiveKitRoom 내부 DataChannelBridge 에서 주입)
  const publishSubtitleRef = useRef(null);

  // ── Realtime subscription ──
  useRealtimeMessages(consultationId, (msg) => {
    // Avoid duplicating messages we sent ourselves (optimistic update)
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  });

  // ── TTS ──
  const tts = useTTS({ language: targetLang });

  // ── Translate function ──
  const translateText = useCallback(
    async (text) => {
      if (!text.trim() || isTranslating) return;
      setIsTranslating(true);

      try {
        const res = await fetch("/api/khidi/consultation/translate-realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sourceLang: myLang,
            targetLang,
            consultationId,
            speakerRole: "self",
          }),
        });

        const result = await res.json();
        if (!result.ok) return;

        const entry = {
          id: Date.now(),
          original_text: text,
          translated_text: result.translated,
          source_language: myLang,
          target_language: targetLang,
          speaker_role: "self",
          created_at: new Date().toISOString(),
        };

        // Add to translation log
        setTranslations((prev) => [...prev, entry]);

        // Show subtitle
        setCurrentSubtitle({
          original: text,
          translated: result.translated,
        });

        // DataChannel: 내 STT 결과를 상대방에게 전송 (번역된 텍스트 전송)
        // 상대방은 본인 언어(targetLang)로 번역된 텍스트를 받아서 표시
        if (publishSubtitleRef.current) {
          publishSubtitleRef.current(result.translated, targetLang, myRole);
        }

        // Auto-hide subtitle after 6 seconds
        if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
        subtitleTimerRef.current = setTimeout(() => setCurrentSubtitle(null), 6000);

        // TTS playback
        if (ttsEnabled) {
          tts.speak(result.translated);
        }

        // Clear interim
        setInterimText("");
      } catch (err) {
        console.error("[Translation] Error:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [myLang, targetLang, consultationId, ttsEnabled, tts, isTranslating]
  );

  // ── 상대방 자막 수신 핸들러 (DataChannel) ──
  const handleRemoteSubtitle = useCallback(
    ({ text, lang, role }) => {
      setRemoteSubtitle({ text, lang, role });
      // 8초 후 자동 숨김
      if (remoteSubtitleTimerRef.current) clearTimeout(remoteSubtitleTimerRef.current);
      remoteSubtitleTimerRef.current = setTimeout(() => setRemoteSubtitle(null), 8000);
    },
    []
  );

  // ── Speech Recognition ──
  const stt = useSpeechRecognition({
    language: myLang,
    enabled: translationEnabled,
    onInterim: useCallback((text) => setInterimText(text), []),
    onResult: useCallback(
      (text) => {
        setInterimText("");
        translateText(text);
      },
      [translateText]
    ),
  });

  // Toggle translation on/off
  const toggleTranslation = useCallback(() => {
    if (translationEnabled) {
      stt.stop();
      setTranslationEnabled(false);
      setInterimText("");
      toast.success(c.translationStopped);
    } else {
      stt.start();
      setTranslationEnabled(true);
      toast.success(`${c.translationStartedPrefix} (${LANG_LABELS[myLang]} → ${LANG_LABELS[targetLang]})`);
    }
  }, [translationEnabled, stt, myLang, targetLang, toast]);

  // Scroll to bottom of translations
  useEffect(() => {
    translationsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [translations]);

  // ── Guest join (invite 토큰으로 계정 없이 입장) ──
  const joinAsGuest = useCallback(async () => {
    if (!inviteToken) return;
    if (!guestName.trim() || guestName.trim().length < 2) {
      setGuestError(c.nameTooShort);
      return;
    }

    setGuestJoining(true);
    setGuestError("");

    try {
      const res = await fetch(
        `/api/khidi/consultation/${consultationId}/guest-join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: inviteToken,
            displayName: guestName.trim(),
          }),
        }
      );
      const result = await res.json();

      if (!res.ok || !result.ok) {
        const msg =
          result.error === "invalid_or_expired_invite"
            ? c.inviteExpired
            : result.error === "consultation_closed"
            ? c.consultClosed
            : result.error === "rate_limited"
            ? c.rateLimited
            : `${c.connectFailed}: ${result.error || res.statusText}`;
        setGuestError(msg);
        return;
      }

      setLivekitToken(result.livekitToken);
      setLivekitUrl(result.livekitUrl);
      setAdmissionId(result.admissionId || null);
      setAdmissionStatus(result.admissionStatus || "approved");
      // 게스트도 번역/언어는 역할 기반 기본값
      if (result.role === "patient") {
        setMyLang("ru");
        setTargetLang("ko");
        setMyRole("patient");
      } else {
        setMyLang("ko");
        setTargetLang("ru");
        setMyRole(result.role || "patient");
      }
      setLoading(false);
    } catch (err) {
      console.error("[guest-join] error:", err);
      setGuestError(c.networkError);
    } finally {
      setGuestJoining(false);
    }
  }, [inviteToken, consultationId, guestName]);

  // ── 의사/관리자용 대기열 polling (인증 사용자만) ──
  useEffect(() => {
    if (isGuestMode) return; // 게스트는 대기열 조회 불가
    if (!livekitToken) return;

    let cancelled = false;

    const fetchPending = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/admissions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const result = await res.json();
        if (cancelled) return;
        if (result.ok) setPendingAdmissions(result.pending || []);
      } catch {
        // silent
      }
    };

    const interval = setInterval(fetchPending, 3000);
    fetchPending();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isGuestMode, livekitToken, consultationId]);

  const decideAdmission = useCallback(
    async (admissionIdToDecide, status) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        await fetch(
          `/api/khidi/consultation/${consultationId}/admissions?admissionId=${admissionIdToDecide}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
          }
        );
        // 즉시 UI 반영 (polling 으로도 곧 갱신됨)
        setPendingAdmissions((prev) =>
          prev.filter((a) => a.id !== admissionIdToDecide)
        );
        toast.success(
          status === "approved" ? c.admissionApproved : c.admissionRejectedToast
        );
      } catch (err) {
        console.error("[admission decide] error:", err);
        toast.error(c.decideFailed);
      }
    },
    [consultationId, toast]
  );

  // ── Waiting Room polling: admissionId 가 있고 pending 인 동안 2초마다 상태 확인 ──
  useEffect(() => {
    if (!admissionId || admissionStatus !== "pending") return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/admission-status?admissionId=${admissionId}`
        );
        const result = await res.json();
        if (cancelled) return;
        if (result.ok && result.status !== admissionStatus) {
          setAdmissionStatus(result.status);
          if (result.status === "approved") {
            toast.success(c.doctorApprovedEntry);
          } else if (result.status === "rejected") {
            toast.error(c.entryRejected);
          }
        }
      } catch {
        // polling failure — retry
      }
    };

    const interval = setInterval(check, 2500);
    check();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [admissionId, admissionStatus, consultationId, toast]);

  // ── Fetch consultation + LiveKit token (authenticated mode) ──
  useEffect(() => {
    if (isGuestMode) return; // guest 는 별도 플로우
    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          toast.error(c.authError);
          setLoading(false);
          return;
        }

        const detailRes = await fetch(
          `/api/khidi/consultation/${consultationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const detailResult = await detailRes.json();

        if (!detailResult.ok) {
          toast.error(c.sessionNotFoundToast);
          setLoading(false);
          return;
        }

        const session = detailResult.data;
        setConsultation(session);

        // Set language from consultation data
        if (session.patient_language) setTargetLang(session.patient_language);
        if (session.doctor_language) setMyLang(session.doctor_language);

        // Get LiveKit token
        const user = sessionData?.session?.user;
        const participantName = user?.email || user?.id || "participant";

        const tokenRes = await fetch("/api/khidi/consultation/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomName: session.livekit_room_name,
            participantName,
            participantRole: "patient",
          }),
        });

        const tokenResult = await tokenRes.json();
        if (tokenResult.ok && tokenResult.token) {
          setLivekitToken(tokenResult.token);
          setLivekitUrl(tokenResult.livekitUrl);
          if (tokenResult.role) setMyRole(tokenResult.role);
        }

        // Fetch existing messages
        const msgRes = await fetch(
          `/api/khidi/consultation/${consultationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgResult = await msgRes.json();
        if (msgResult.ok) setMessages(msgResult.data || []);

        // Fetch existing translation logs
        const transRes = await fetch(
          `/api/khidi/consultation/${consultationId}/translate`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const transResult = await transRes.json();
        if (transResult.ok) setTranslations(transResult.data || []);
      } catch (error) {
        console.error("[ConsultationRoom] init error:", error);
        toast.error(c.loadFailed);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [consultationId, isGuestMode]);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender_id: "current-user",
      sender_role: "patient",
      sender_name: "You",
      message_text: messageInput,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    const text = messageInput;
    setMessageInput("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      await fetch(`/api/khidi/consultation/${consultationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: "current-user",
          senderRole: "patient",
          senderName: "You",
          messageText: text,
        }),
      });
    } catch (error) {
      console.error("[ConsultationRoom] Send message error:", error);
    }
  }, [messageInput, consultationId]);

  // ── End call ──
  const handleEndCall = async () => {
    if (confirm(c.endConfirm)) {
      if (translationEnabled) stt.stop();
      tts.stop();

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        await fetch(`/api/khidi/consultation/${consultationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "completed",
            ended_at: new Date().toISOString(),
          }),
        });
        toast.success(c.consultEnded);
        router.push("/");
      } catch (error) {
        console.error("[ConsultationRoom] End call error:", error);
        toast.error(c.endFailed);
      }
    }
  };

  // ── Guest mode: 이름 입력 폼 먼저 표시 ──
  if (isGuestMode && !livekitToken) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 text-white p-4">
        <div className="max-w-md w-full bg-gray-800/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="p-8 border-b border-gray-700">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <Video size={28} />
            </div>
            <h1 className="text-2xl font-bold mb-2">{c.guestTitle}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {c.guestLede}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinAsGuest();
            }}
            className="p-8 space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-200">
                {c.nameLabel}
              </label>
              <input
                type="text"
                autoFocus
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setGuestError("");
                }}
                placeholder={c.namePlaceholder}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={50}
              />
            </div>

            {guestError && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-800">
                {guestError}
              </p>
            )}

            <button
              type="submit"
              disabled={guestJoining || !guestName.trim()}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {guestJoining ? c.joining : c.startConsult}
            </button>

            <p className="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-700 mt-6">
              {c.guestSecurity1}
              <br />
              {c.guestSecurity2}
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>{c.connecting}</p>
        </div>
      </div>
    );
  }

  // 게스트는 consultation 상세를 못 가져오지만 livekitToken 만 있으면 접속 가능
  if (!consultation && !isGuestMode) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <p className="mb-4">{c.sessionNotFound}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg"
          >
            {c.goBack}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-lg font-bold">
                {consultation.cancer_patient_intakes?.[0]?.cancer_type || c.consultationFallback} —{" "}
                {consultation.session_type === "pre_consultation" && c.sessionPre}
                {consultation.session_type === "follow_up" && c.sessionFollowUp}
                {consultation.session_type === "emergency" && c.sessionEmergency}
                {consultation.session_type === "diagnostic" && c.sessionDiagnostic}
              </h1>
              <p className="text-xs text-gray-400">
                Room: {consultation.livekit_room_name}
                {connected && <span className="ml-2 text-green-400">● {c.connected}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 flex-wrap justify-end">
            {/* Translation toggle */}
            <button
              onClick={toggleTranslation}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                translationEnabled
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={translationEnabled ? c.stopTranslation : c.startTranslation}
            >
              <Languages size={16} />
              {translationEnabled ? (
                <span className="hidden sm:inline">
                  {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                  {isTranslating && (
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </span>
              ) : (
                <span className="hidden sm:inline">{c.interpretation}</span>
              )}
            </button>

            {/* TTS toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-lg transition ${
                ttsEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-teal-400"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-500"
              }`}
              title={ttsEnabled ? c.ttsOff : c.ttsOn}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Language swap */}
            <select
              value={myLang}
              onChange={(e) => setMyLang(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
            <span className="text-gray-500 text-xs">→</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="kz">Қазақша</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>

            {/* 자막 크기 선택 — 번역이 켜져 있을 때만 표시 */}
            {translationEnabled && (
              <select
                value={subtitleSize}
                onChange={(e) => setSubtitleSize(e.target.value)}
                className="bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
                title={c.subtitleSizeTitle}
              >
                <option value="sm">{c.subtitleSmall}</option>
                <option value="md">{c.subtitleMedium}</option>
                <option value="lg">{c.subtitleLarge}</option>
              </select>
            )}

            <button
              onClick={handleEndCall}
              className="px-3 py-2 md:px-4 rounded-lg bg-red-600 hover:bg-red-700 transition flex items-center gap-1.5 md:gap-2 text-sm"
            >
              <Phone size={16} /> <span className="hidden xs:inline">{c.endCall}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col relative min-h-[40vh] lg:min-h-0">
          {livekitToken && livekitUrl && admissionStatus === "rejected" ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-red-950 p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-4xl mx-auto mb-6">
                  ✕
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">{c.admissionRejectedTitle}</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {c.admissionRejectedBody}
                </p>
              </div>
            </div>
          ) : livekitToken && livekitUrl && admissionStatus === "pending" ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-teal-950 p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">
                  ⏳
                </div>
                <h2 className="text-2xl font-bold mb-3 text-white">{c.waitingRoomTitle}</h2>
                <p className="text-sm text-gray-300 leading-relaxed mb-6">
                  {c.waitingRoomBody1}
                  <br />
                  {c.waitingRoomBody2}
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span>{c.checkingStatus}</span>
                </div>
                <p className="text-xs text-gray-500 mt-6 border-t border-gray-800 pt-4">
                  {c.waitingRoomPrivacy1}
                  <br />
                  {c.waitingRoomPrivacy2}
                </p>
              </div>
            </div>
          ) : livekitToken && livekitUrl ? (
            <>
              {/* 의사용 대기자 승인 배너 — 1명 이상 대기 중일 때 표시 */}
              {!isGuestMode && pendingAdmissions.length > 0 && (
                <div className="absolute top-4 right-4 z-30 bg-teal-900/95 backdrop-blur border border-teal-500 rounded-xl shadow-2xl max-w-sm p-4 space-y-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    ⏳ {c.pendingWaiting} ({pendingAdmissions.length})
                  </p>
                  {pendingAdmissions.map((adm) => (
                    <div
                      key={adm.id}
                      className="flex items-center gap-2 bg-black/30 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {adm.display_name || c.anonymous}
                        </p>
                        <p className="text-xs text-teal-200">
                          {adm.participant_role}
                        </p>
                      </div>
                      <button
                        onClick={() => decideAdmission(adm.id, "approved")}
                        className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded"
                      >
                        {c.approve}
                      </button>
                      <button
                        onClick={() => decideAdmission(adm.id, "rejected")}
                        className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-xs font-semibold rounded"
                      >
                        {c.reject}
                      </button>
                    </div>
                  ))}
                </div>
              )}

            <LiveKitRoom
              token={livekitToken}
              serverUrl={livekitUrl}
              connect={true}
              onConnected={() => setConnected(true)}
              onDisconnected={() => setConnected(false)}
              style={{ height: "100%" }}
              data-lk-theme="default"
            >
              {/* DataChannel 수신/송신 브릿지 — 렌더링 없음 */}
              <DataChannelBridge
                onRemoteSubtitle={handleRemoteSubtitle}
                publishRef={publishSubtitleRef}
              />
              <div className="flex-1 relative" style={{ height: "calc(100% - 64px)" }}>
                <VideoGrid />
                <RoomAudioRenderer />
                <SubtitleOverlay
                  original={currentSubtitle?.original}
                  translated={currentSubtitle?.translated}
                  interimText={interimText}
                  sourceLang={myLang}
                  targetLang={targetLang}
                  remoteSubtitle={remoteSubtitle}
                  size={subtitleSize}
                />
              </div>
              <ControlBar
                variation="minimal"
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: true,
                  leave: false,
                }}
              />
            </LiveKitRoom>
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 bg-gray-950 relative">
                <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center min-h-[30vh] sm:min-h-0">
                  <Video size={64} className="mb-4 text-gray-500" />
                  <p className="text-gray-400 font-semibold">{c.doctorTile}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.waiting}</p>
                </div>
                <div className="flex-1 bg-gray-800 rounded-lg flex flex-col items-center justify-center min-h-[30vh] sm:min-h-0">
                  <Video size={64} className="mb-4 text-gray-500" />
                  <p className="text-gray-400 font-semibold">{c.patientTile}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.myScreen}</p>
                </div>
                <SubtitleOverlay
                  original={currentSubtitle?.original}
                  translated={currentSubtitle?.translated}
                  interimText={interimText}
                  sourceLang={myLang}
                  targetLang={targetLang}
                  remoteSubtitle={remoteSubtitle}
                  size={subtitleSize}
                />
              </div>
              <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center text-sm text-yellow-400">
                {c.livekitDisabled}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: Chat + Translation log ── */}
        <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-700 bg-gray-800 max-h-[45vh] lg:max-h-none">
          {/* Tab selector */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActivePanel("chat")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                activePanel === "chat"
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <MessageSquare size={16} className="inline mr-2" />
              Chat
            </button>
            <button
              onClick={() => setActivePanel("translation")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                activePanel === "translation"
                  ? "border-b-2 border-teal-500 text-teal-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Globe size={16} className="inline mr-2" />
              Translation
              {translations.length > 0 && (
                <span className="ml-1 bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {translations.length}
                </span>
              )}
            </button>
          </div>

          {/* Chat panel */}
          {activePanel === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    {c.chatEmpty}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.sender_role === "patient" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                          msg.sender_role === "patient"
                            ? "bg-teal-600 text-white"
                            : "bg-gray-700 text-gray-100"
                        }`}
                      >
                        <p className="font-semibold text-xs mb-1">{msg.sender_name}</p>
                        <p>{msg.message_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder={c.messagePlaceholder}
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Translation log panel */}
          {activePanel === "translation" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {translations.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <Languages size={32} className="mx-auto mb-3 text-gray-600" />
                    <p>{c.translationEmpty1}</p>
                    <p>{c.translationEmpty2}</p>
                    {!stt.isSupported && (
                      <p className="mt-3 text-yellow-500 text-xs">
                        {c.sttUnsupported1}
                        <br />
                        {c.sttUnsupported2}
                      </p>
                    )}
                  </div>
                ) : (
                  translations.map((trans) => (
                    <div
                      key={trans.id}
                      className="border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {trans.speaker_role === "doctor"
                            ? "Doctor"
                            : trans.speaker_role === "patient"
                            ? "Patient"
                            : c.you}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(trans.created_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-0.5">
                          {LANG_LABELS[trans.source_language] || trans.source_language}
                        </p>
                        <p className="text-sm text-gray-200">{trans.original_text}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-xs text-teal-600 mb-0.5">
                          {LANG_LABELS[trans.target_language] || trans.target_language}
                        </p>
                        <p className="text-sm text-teal-300">{trans.translated_text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={translationsEndRef} />
              </div>

              {/* Translation status bar */}
              {translationEnabled && (
                <div className="border-t border-gray-700 px-4 py-2 bg-gray-750">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-gray-400">
                      {c.translationActive} — {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                    </span>
                    {isTranslating && (
                      <span className="text-yellow-400 ml-auto">{c.translatingNow}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
