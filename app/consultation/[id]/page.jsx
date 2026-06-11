"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  TrackToggle,
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
  Paperclip,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { useToast } from "../../../src/components/Toast";
import { useSpeechRecognition, getEffectiveSttLang } from "../../../src/lib/consultation/useSpeechRecognition";
import { isFillerOnly } from "../../../src/lib/consultation/fillerFilter";
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
    sttUnsupported2: "음성이 안 되면 아래에 직접 입력해 번역하세요.",
    manualPlaceholder: "번역할 내용을 입력하세요...",
    manualHint: "마이크가 안 되는 환경이면 직접 입력해 번역할 수 있어요.",
    togglePanel: "채팅·번역 열기/닫기",
    sttFailedNotice: "이 브라우저에서는 음성 인식이 안 됩니다. 아래 입력칸으로 번역하세요.",
    myLangLabel: "내가 말하는 언어",
    langTheirLabel: "상대방 언어",
    langChangeTitle: "번역 언어 설정",
    done: "확인",
    sttListening: "음성 인식 중",
    sttProcessing: "자막 생성 중…",
    emptyActiveHint1: "말하면 자막이 표시됩니다.",
    emptyActiveHint2: "음성이 안 되면 아래 입력칸에 쓰고 번역 버튼을 누르세요.",
    inAppNotice: "앱 안 브라우저에서는 영상·음성이 제한될 수 있어요.",
    openExternal: "브라우저에서 열기",
    linkCopied: "링크 복사됨 — 브라우저 주소창에 붙여넣으세요.",
    attachFile: "자료 첨부",
    sharedFiles: "공유 자료",
    uploadingFile: "업로드 중...",
    uploadFailed: "업로드 실패",
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
    sttUnsupported2: "No voice? Type below to translate instead.",
    manualPlaceholder: "Type text to translate...",
    manualHint: "No microphone? You can type to translate instead.",
    togglePanel: "Show/hide chat & translation",
    sttFailedNotice: "Voice recognition doesn't work in this browser. Type below to translate.",
    myLangLabel: "My language",
    langTheirLabel: "Their language",
    langChangeTitle: "Translation languages",
    done: "Done",
    sttListening: "Listening",
    sttProcessing: "Creating subtitles…",
    emptyActiveHint1: "Speak and subtitles will appear.",
    emptyActiveHint2: "If voice doesn't work, type below and press the translate button.",
    inAppNotice: "In-app browsers may limit video and audio.",
    openExternal: "Open in browser",
    linkCopied: "Link copied — paste it into your browser.",
    attachFile: "Attach file",
    sharedFiles: "Shared files",
    uploadingFile: "Uploading...",
    uploadFailed: "Upload failed",
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
    sttUnsupported2: "Нет голоса? Введите текст ниже для перевода.",
    manualPlaceholder: "Введите текст для перевода...",
    manualHint: "Нет микрофона? Можно ввести текст для перевода.",
    togglePanel: "Показать/скрыть чат и перевод",
    sttFailedNotice: "Распознавание речи не работает в этом браузере. Введите текст ниже.",
    myLangLabel: "Мой язык",
    langTheirLabel: "Язык собеседника",
    langChangeTitle: "Языки перевода",
    done: "Готово",
    sttListening: "Слушаю",
    sttProcessing: "Создание субтитров…",
    emptyActiveHint1: "Говорите — появятся субтитры.",
    emptyActiveHint2: "Если голос не работает, введите текст ниже и нажмите кнопку перевода.",
    inAppNotice: "Встроенные браузеры приложений могут ограничивать видео и звук.",
    openExternal: "Открыть в браузере",
    linkCopied: "Ссылка скопирована — вставьте её в браузер.",
    attachFile: "Прикрепить файл",
    sharedFiles: "Общие файлы",
    uploadingFile: "Загрузка...",
    uploadFailed: "Ошибка загрузки",
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
    sttUnsupported2: "Дауыс жоқ па? Аудару үшін төменге мәтін теріңіз.",
    manualPlaceholder: "Аударылатын мәтінді енгізіңіз...",
    manualHint: "Микрофон жоқ па? Мәтінді теріп аударуға болады.",
    togglePanel: "Чат пен аударманы көрсету/жасыру",
    sttFailedNotice: "Бұл браузерде дауыс тану жұмыс істемейді. Төменге мәтін теріңіз.",
    myLangLabel: "Менің тілім",
    langTheirLabel: "Әңгімелесушінің тілі",
    langChangeTitle: "Аударма тілдері",
    done: "Дайын",
    sttListening: "Тыңдап тұр",
    sttProcessing: "Субтитр жасалуда…",
    emptyActiveHint1: "Сөйлесеңіз — субтитрлер шығады.",
    emptyActiveHint2: "Дауыс жұмыс істемесе, төменге теріп, аудару түймесін басыңыз.",
    inAppNotice: "Қолданба ішіндегі браузер видео мен дыбысты шектеуі мүмкін.",
    openExternal: "Браузерде ашу",
    linkCopied: "Сілтеме көшірілді — браузерге қойыңыз.",
    attachFile: "Файл тіркеу",
    sharedFiles: "Ортақ файлдар",
    uploadingFile: "Жүктелуде...",
    uploadFailed: "Жүктеу сәтсіз",
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
    sttUnsupported2: "无法语音？可在下方输入文字进行翻译。",
    manualPlaceholder: "输入要翻译的内容...",
    manualHint: "没有麦克风？可直接输入文字进行翻译。",
    togglePanel: "显示/隐藏聊天和翻译",
    sttFailedNotice: "此浏览器不支持语音识别。请在下方输入文字进行翻译。",
    myLangLabel: "我说的语言",
    langTheirLabel: "对方语言",
    langChangeTitle: "翻译语言",
    done: "确定",
    sttListening: "正在聆听",
    sttProcessing: "正在生成字幕…",
    emptyActiveHint1: "说话即可显示字幕。",
    emptyActiveHint2: "如语音不可用，请在下方输入并点击翻译按钮。",
    inAppNotice: "应用内置浏览器可能限制视频和音频。",
    openExternal: "在浏览器中打开",
    linkCopied: "链接已复制——请粘贴到浏览器。",
    attachFile: "附加文件",
    sharedFiles: "共享资料",
    uploadingFile: "上传中...",
    uploadFailed: "上传失败",
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
    sttUnsupported2: "音声が使えない場合は下に入力して翻訳できます。",
    manualPlaceholder: "翻訳する内容を入力...",
    manualHint: "マイクが使えない場合は入力して翻訳できます。",
    togglePanel: "チャット・翻訳の表示/非表示",
    sttFailedNotice: "このブラウザでは音声認識が使えません。下に入力して翻訳してください。",
    myLangLabel: "話す言語",
    langTheirLabel: "相手の言語",
    langChangeTitle: "翻訳言語",
    done: "完了",
    sttListening: "音声認識中",
    sttProcessing: "字幕を生成中…",
    emptyActiveHint1: "話すと字幕が表示されます。",
    emptyActiveHint2: "音声が使えない場合は下に入力して翻訳ボタンを押してください。",
    inAppNotice: "アプリ内ブラウザでは映像・音声が制限される場合があります。",
    openExternal: "ブラウザで開く",
    linkCopied: "リンクをコピーしました — ブラウザに貼り付けてください。",
    attachFile: "ファイル添付",
    sharedFiles: "共有資料",
    uploadingFile: "アップロード中...",
    uploadFailed: "アップロード失敗",
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
  // 입장 시 고르는 "내가 말하는 언어" — 사이트 UI 언어로 미리 선택돼 있어 보통은 탭 불필요
  const [guestLang, setGuestLang] = useState(() =>
    ["ko", "en", "ru", "kz", "zh", "ja"].includes(lang) ? lang : "ru"
  );
  // Waiting Room — 의사 승인 대기
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionStatus, setAdmissionStatus] = useState(null);
  // 의사/관리자용 대기 목록 (pending 참가자)
  const [pendingAdmissions, setPendingAdmissions] = useState([]);

  // Panel state — Zoom/Meet 식: 기본 숨김(영상 풀스크린 + 자막 오버레이), 버튼으로 토글
  const [activePanel, setActivePanel] = useState("translation"); // "chat" | "translation"
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  // Translation state
  const [translations, setTranslations] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [interimText, setInterimText] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  // 언어 변경 바텀시트 (모바일에서도 언어쌍 변경 가능하게)
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  // 인앱 브라우저(카카오톡·라인·인스타 등) — 영상·음성 제한 많음 → 외부 브라우저 유도
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    setIsInAppBrowser(
      /KAKAOTALK|Line\/|Instagram|FBAN|FBAV|NAVER\(inapp|DaumApps|whale.*inapp|; wv\)/i.test(ua)
    );
  }, []);

  const openInExternalBrowser = useCallback(() => {
    const url = window.location.href;
    const ua = navigator.userAgent || "";
    if (/KAKAOTALK/i.test(ua)) {
      // 카카오톡 공식 외부 브라우저 열기 스킴
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
      return;
    }
    if (/Android/i.test(ua)) {
      // Android: 기본 브라우저로 강제 (intent)
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      return;
    }
    // iOS 등: 스킴 강제가 불가 → 링크 복사 안내
    navigator.clipboard?.writeText(url).then(
      () => toast.success(c.linkCopied),
      () => prompt("URL", url)
    );
  }, [toast, c]);

  // 공유 자료 (consultation_documents)
  const [sharedDocs, setSharedDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);
  // TTS(번역 음성 읽어주기) 임시 비활성화 — 기기 기본 음성 품질 문제로 보류,
  // 목소리 선택/개선 후 재활성화 예정. 켜려면 TTS_FEATURE_ON = true 한 줄만.
  const TTS_FEATURE_ON = false;
  const [ttsEnabled, setTtsEnabled] = useState(false);
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

  // ── Realtime subscription (계정 사용자만 — 게스트는 RLS상 구독 불가, 아래 폴링으로 대체) ──
  useRealtimeMessages(consultationId, (msg) => {
    const norm = {
      id: msg.id,
      sender_id: msg.sender_id || null,
      sender_role: msg.sender_role || "patient",
      sender_name:
        msg.sender_role === "doctor" ? "Doctor"
        : msg.sender_role === "coordinator" ? "Coordinator"
        : msg.sender_role === "translator" ? "Interpreter"
        : "Patient",
      message_text: msg.message ?? msg.message_text ?? "",
      created_at: msg.created_at || new Date().toISOString(),
    };
    setMessages((prev) => {
      if (prev.some((m) => m.id === norm.id)) return prev;
      return [...prev, norm];
    });
  });

  // ── TTS ──
  const tts = useTTS({ language: targetLang });

  // ── 번역 결과를 자막·기록·상대 전송·TTS 에 일괄 반영 ──
  // (브라우저 STT→번역 / 수동입력→번역 / 서버 STT 전사+번역 통합응답 공용)
  const applyTranslation = useCallback(
    (original, translated) => {
      const entry = {
        id: Date.now(),
        original_text: original,
        translated_text: translated,
        source_language: myLang,
        target_language: targetLang,
        speaker_role: "self",
        created_at: new Date().toISOString(),
      };

      // Add to translation log
      setTranslations((prev) => [...prev, entry]);

      // Show subtitle
      setCurrentSubtitle({ original, translated });

      // DataChannel: 내 STT 결과를 상대방에게 전송 (번역된 텍스트 전송)
      // 상대방은 본인 언어(targetLang)로 번역된 텍스트를 받아서 표시
      if (publishSubtitleRef.current) {
        publishSubtitleRef.current(translated, targetLang, myRole);
      }

      // Auto-hide subtitle after 6 seconds
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = setTimeout(() => setCurrentSubtitle(null), 6000);

      // TTS playback
      if (ttsEnabled) {
        tts.speak(translated);
      }

      // Clear interim
      setInterimText("");
    },
    [myLang, targetLang, myRole, ttsEnabled, tts]
  );

  // ── Translate function ──
  const translateText = useCallback(
    async (text) => {
      if (!text.trim() || isTranslating) return;
      setIsTranslating(true);

      try {
        const res = await fetch("/api/khidi/consultation/translate-realtime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // 게스트(초대링크)는 계정이 없으므로 invite 토큰으로 번역 API 인증
            ...(inviteToken ? { "X-Guest-Token": inviteToken } : {}),
          },
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
        // 번역 API 가 추임새 정리 후 빈 결과를 주면 자막 스킵
        if (!result.translated || !String(result.translated).trim()) return;

        applyTranslation(text, result.translated);
      } catch (err) {
        console.error("[Translation] Error:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [myLang, targetLang, consultationId, isTranslating, inviteToken, applyTranslation]
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
  // 브라우저 STT 가 마지막으로 결과(중간자막 포함)를 낸 시각 — "조용한 사망" 워치독용
  const lastBrowserSttRef = useRef(0);
  const [forceServerStt, setForceServerStt] = useState(false);
  const stt = useSpeechRecognition({
    language: myLang,
    enabled: translationEnabled,
    onInterim: useCallback((text) => {
      lastBrowserSttRef.current = Date.now();
      setInterimText(text);
    }, []),
    onResult: useCallback(
      (text) => {
        lastBrowserSttRef.current = Date.now();
        setInterimText("");
        // "음", "어" 같은 추임새뿐인 조각은 자막 안 띄움 (번역 호출도 절약)
        if (isFillerOnly(text)) return;
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
      // 이미 서버 STT 로 전환된 상태면 브라우저 STT 재시작 안 함 (이중 자막 방지)
      if (!forceServerStt) stt.start();
      setTranslationEnabled(true);
      // 패널은 자동으로 안 엶 — 자막은 영상 위 오버레이, 입력은 하단 미니 바 (Zoom/Meet 식)
      toast.success(`${c.translationStartedPrefix} (${LANG_LABELS[myLang]} → ${LANG_LABELS[targetLang]})`);
    }
  }, [translationEnabled, forceServerStt, stt, myLang, targetLang, toast]);

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
      // 언어: 입장 화면에서 고른 "내가 말하는 언어" 기준.
      // 상대 기본값 — 내가 한국어면 러시아어(주 환자군), 아니면 한국어(의료진).
      // 상담 중에도 언어 칩 탭으로 변경 가능.
      const ml = guestLang || (result.role === "patient" ? "ru" : "ko");
      setMyLang(ml);
      setTargetLang(ml === "ko" ? "ru" : "ko");
      setMyRole(result.role || "patient");
      setLoading(false);
    } catch (err) {
      console.error("[guest-join] error:", err);
      setGuestError(c.networkError);
    } finally {
      setGuestJoining(false);
    }
  }, [inviteToken, consultationId, guestName, guestLang]);

  // ── 의사/관리자용 대기열 polling ──
  // 게스트 의사/코디(초대링크 입장)도 X-Guest-Token 으로 대기열 조회·승인 가능
  const isStaffGuest = isGuestMode && (myRole === "doctor" || myRole === "coordinator");

  // 대기열 API 호출용 인증 헤더 (게스트 staff = invite 토큰 / 계정 = Bearer)
  const getAdmissionsAuthHeaders = useCallback(async () => {
    if (isStaffGuest) return { "X-Guest-Token": inviteToken };
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : null;
  }, [isStaffGuest, inviteToken]);

  useEffect(() => {
    if (isGuestMode && !isStaffGuest) return; // 게스트 환자/통역은 대기열 조회 불가
    if (!livekitToken) return;

    let cancelled = false;

    const fetchPending = async () => {
      try {
        const headers = await getAdmissionsAuthHeaders();
        if (!headers) return;
        const res = await fetch(
          `/api/khidi/consultation/${consultationId}/admissions`,
          { headers }
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
  }, [isGuestMode, isStaffGuest, livekitToken, consultationId, getAdmissionsAuthHeaders]);

  const decideAdmission = useCallback(
    async (admissionIdToDecide, status) => {
      try {
        const headers = await getAdmissionsAuthHeaders();
        if (!headers) return;
        await fetch(
          `/api/khidi/consultation/${consultationId}/admissions?admissionId=${admissionIdToDecide}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...headers,
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
    [consultationId, toast, getAdmissionsAuthHeaders]
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

        // Fetch existing messages (서버 row 필드 → 렌더 형태로 정규화)
        const msgRes = await fetch(
          `/api/khidi/consultation/${consultationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgResult = await msgRes.json();
        if (msgResult.ok) {
          setMessages(
            (msgResult.data || []).map((row) => ({
              id: row.id,
              sender_id: row.sender_id || null,
              sender_role: row.sender_role || "patient",
              sender_name:
                row.sender_role === "doctor" ? "Doctor"
                : row.sender_role === "coordinator" ? "Coordinator"
                : row.sender_role === "translator" ? "Interpreter"
                : "Patient",
              message_text: row.message ?? row.message_text ?? "",
              created_at: row.created_at || new Date().toISOString(),
            }))
          );
        }

        // Fetch existing translation logs
        const transRes = await fetch(
          `/api/khidi/consultation/${consultationId}/translate`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const transResult = await transRes.json();
        if (transResult.ok) {
          setTranslations(
            (transResult.data || []).map((row) => ({
              id: row.id,
              original_text: row.source_text ?? row.original_text ?? "",
              translated_text: row.translated_text ?? "",
              source_language: row.source_lang ?? row.source_language ?? "",
              target_language: row.target_lang ?? row.target_language ?? "",
              speaker_role: row.speaker_role || "unknown",
              created_at: row.created_at || new Date().toISOString(),
            }))
          );
        }
      } catch (error) {
        console.error("[ConsultationRoom] init error:", error);
        toast.error(c.loadFailed);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [consultationId, isGuestMode]);

  // ── 상담 API 공용 인증 헤더 (게스트=초대토큰 / 계정=Bearer) ──
  const getConsultAuthHeaders = useCallback(async () => {
    if (inviteToken) return { "X-Guest-Token": inviteToken };
    const { data } = await supabase.auth.getSession();
    const t = data?.session?.access_token;
    return t ? { Authorization: `Bearer ${t}` } : null;
  }, [inviteToken]);

  // 서버 메시지 row(message/sender_role) → 렌더 형태(message_text/sender_name)로 정규화
  const normalizeMsg = useCallback((row) => ({
    id: row.id,
    sender_id: row.sender_id || null,
    sender_role: row.sender_role || "patient",
    sender_name:
      row.sender_role === "doctor"
        ? "Doctor"
        : row.sender_role === "coordinator"
        ? "Coordinator"
        : row.sender_role === "translator"
        ? "Interpreter"
        : "Patient",
    message_text: row.message ?? row.message_text ?? "",
    created_at: row.created_at || new Date().toISOString(),
  }), []);

  // 서버 번역 row(source_text/source_lang) → 렌더 형태(original_text/source_language)로 정규화
  const normalizeTrans = useCallback((row) => ({
    id: row.id,
    original_text: row.source_text ?? row.original_text ?? "",
    translated_text: row.translated_text ?? "",
    source_language: row.source_lang ?? row.source_language ?? "",
    target_language: row.target_lang ?? row.target_language ?? "",
    speaker_role: row.speaker_role || "unknown",
    created_at: row.created_at || new Date().toISOString(),
  }), []);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput("");

    try {
      const headers = await getConsultAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/khidi/consultation/${consultationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ messageText: text }),
      });
      const result = await res.json();
      // 서버가 sender_role 을 인증 기준으로 강제 → 반환 row 를 그대로 표시
      if (res.ok && result.ok && result.data) {
        setMessages((prev) =>
          prev.some((m) => m.id === result.data.id)
            ? prev
            : [...prev, normalizeMsg(result.data)]
        );
      }
    } catch (error) {
      console.error("[ConsultationRoom] Send message error:", error);
    }
  }, [messageInput, consultationId, getConsultAuthHeaders, normalizeMsg]);

  // ── 게스트 메시지/번역 로그 폴링 ──
  // 게스트는 RLS상 Supabase realtime 구독이 안 됨 → 서버 API 폴링으로 채팅·번역기록 동기화.
  // (계정 사용자는 realtime + init 로드로 충분하므로 게스트일 때만 작동)
  useEffect(() => {
    if (!isGuestMode || !livekitToken || !inviteToken) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const headers = { "X-Guest-Token": inviteToken };
        const [mRes, tRes] = await Promise.all([
          fetch(`/api/khidi/consultation/${consultationId}/messages?limit=200`, { headers }),
          fetch(`/api/khidi/consultation/${consultationId}/translate?limit=200`, { headers }),
        ]);
        if (cancelled) return;
        const mJson = await mRes.json().catch(() => null);
        const tJson = await tRes.json().catch(() => null);
        if (mJson?.ok) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const incoming = (mJson.data || [])
              .filter((row) => !seen.has(row.id))
              .map(normalizeMsg);
            return incoming.length ? [...prev, ...incoming] : prev;
          });
        }
        if (tJson?.ok && Array.isArray(tJson.data)) {
          // 번역 로그는 서버 기록 기준으로 갱신 (내 입력은 이미 로컬에 있음 → id 중복 제거)
          setTranslations((prev) => {
            const seen = new Set(prev.map((t) => t.id));
            const incoming = tJson.data
              .filter((row) => !seen.has(row.id))
              .map(normalizeTrans)
              // 내 발화는 로컬 entry(다른 id)로 이미 추가됨 — 서버 기록이 같은 내용으로
              // 다시 오면 중복 표시되므로 내용+20초 시간창 기준으로 걸러냄
              .filter(
                (row) =>
                  !prev.some(
                    (p) =>
                      p.original_text === row.original_text &&
                      p.translated_text === row.translated_text &&
                      Math.abs(new Date(p.created_at) - new Date(row.created_at)) < 20000
                  )
              );
            return incoming.length ? [...prev, ...incoming] : prev;
          });
        }
      } catch {
        /* 폴링 실패는 무시 */
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isGuestMode, livekitToken, inviteToken, consultationId, normalizeMsg, normalizeTrans]);

  // ── 공유 자료: 목록 로드 + 업로드 ──
  const loadSharedDocs = useCallback(async () => {
    try {
      const headers = await getConsultAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/khidi/consultation/${consultationId}/documents`, { headers });
      const result = await res.json();
      if (result.ok) setSharedDocs(result.data || []);
    } catch {
      /* 목록 로드 실패는 무시 */
    }
  }, [consultationId, getConsultAuthHeaders]);

  useEffect(() => {
    if (!livekitToken) return;
    loadSharedDocs();
  }, [livekitToken, loadSharedDocs]);

  const handleFileUpload = useCallback(
    async (file) => {
      if (!file || uploadingDoc) return;
      setUploadingDoc(true);
      try {
        const headers = await getConsultAuthHeaders();
        if (!headers) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", "other");
        const res = await fetch(`/api/khidi/consultation/${consultationId}/documents`, {
          method: "POST",
          headers, // Content-Type 는 FormData 가 boundary 포함해 자동 설정
          body: formData,
        });
        const result = await res.json();
        if (res.ok && result.ok) {
          await loadSharedDocs();
        } else {
          toast.error(`${c.uploadFailed}: ${result.error || res.status}`);
        }
      } catch {
        toast.error(c.uploadFailed);
      } finally {
        setUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [consultationId, getConsultAuthHeaders, loadSharedDocs, uploadingDoc, toast, c]
  );

  // ── 서버 STT 폴백 — 브라우저 음성인식이 미지원/무음 사망이면 자동 전환 ──
  // 4초 단위로 녹음 조각을 서버(Gemini 전사)로 보내 자막 생성.
  // 크롬 외 브라우저(삼성·iOS Safari·인앱)와 카자흐어 음성까지 커버.
  const [mediaRecOk, setMediaRecOk] = useState(false);
  useEffect(() => {
    setMediaRecOk(
      typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia
    );
  }, []);
  const useServerStt =
    translationEnabled && (stt.failed || !stt.isSupported || forceServerStt) && mediaRecOk;

  // 워치독: "지원된다"는 브라우저 STT 가 결과·에러·종료 이벤트 없이 조용히 죽는 환경
  // (삼성 인터넷 등 실기기에서 확인) — 기존 휴리스틱(에러/빠른종료 3회)은 아무 신호도
  // 없으면 영영 안 걸림. 통번역 켠 뒤 8초간 브라우저 STT 결과가 전혀 없으면 서버 STT 로
  // 강제 전환. 크롬에서 8초간 말을 안 했어도 전환되지만, 서버 STT 도 같은 자막
  // 파이프라인 + 무음 스킵(VAD)이라 동작·비용 차이 없음.
  useEffect(() => {
    if (!translationEnabled || forceServerStt || !mediaRecOk) return;
    if (stt.failed || !stt.isSupported) return; // 이 경우는 기존 조건으로 이미 서버 STT
    const enabledAt = Date.now();
    const timer = setInterval(() => {
      if (lastBrowserSttRef.current > enabledAt) {
        clearInterval(timer); // 브라우저 STT 정상 동작 확인 — 전환 불필요
        return;
      }
      if (Date.now() - enabledAt >= 8000) {
        clearInterval(timer);
        stt.stop(); // 마이크 점유 해제 — 서버 STT 녹음과 충돌 방지
        setForceServerStt(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [translationEnabled, forceServerStt, mediaRecOk, stt.failed, stt.isSupported, stt.stop]);
  const translateTextRef = useRef(translateText);
  useEffect(() => {
    translateTextRef.current = translateText;
  }, [translateText]);
  const applyTranslationRef = useRef(applyTranslation);
  useEffect(() => {
    applyTranslationRef.current = applyTranslation;
  }, [applyTranslation]);
  // 서버 STT 상태 표시: idle(꺼짐) | listening(대기) | speaking(목소리 감지) | processing(자막 생성 중)
  const [serverSttStatus, setServerSttStatus] = useState("idle");

  useEffect(() => {
    if (!useServerStt) {
      setServerSttStatus("idle");
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    let stopped = false;
    let stream = null;
    let recorder = null;
    let stopTimer = null;
    let audioCtx = null;
    let analyser = null;
    let vadTimer = null;
    // 상태 표시는 변할 때만 setState (100ms 샘플링이 리렌더 폭주하지 않게)
    let lastStatus = "";
    const setStatus = (s) => {
      if (stopped || s === lastStatus) return;
      lastStatus = s;
      setServerSttStatus(s);
    };

    const mime = MediaRecorder.isTypeSupported?.("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported?.("audio/mp4")
      ? "audio/mp4"
      : "";

    // 발화 단위 녹음 — 고정 4초 컷은 단어가 잘려 인식률이 떨어지고, 말 끝나고도
    // 다음 컷까지 기다려 자막이 늦었음. 음량(RMS)으로 "말 끝(0.7초 무음)"을 감지해
    // 그 즉시 잘라 보낸다. 조각마다 MediaRecorder 재시작(이어붙인 조각은 컨테이너
    // 헤더가 없어 단독 디코딩 불가 → stop/start 사이클로 자립 블롭 생성).
    const recordCycle = () => {
      if (stopped || !stream) return;
      const chunks = [];
      let voicedFrames = 0; // 100ms 프레임 기준 누적 발화량
      let silentStreak = 0; // 발화 시작 후 연속 무음 프레임
      const startedAt = Date.now();

      try {
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      } catch {
        setMediaRecOk(false); // 녹음기 생성 불가 — "음성 안 됨" 안내로 정직하게 전환
        return;
      }
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        clearInterval(vadTimer);
        clearTimeout(stopTimer);
        const blob = new Blob(chunks, { type: mime || "audio/webm" });
        // 말한 흔적(0.3초 이상) + 최소 크기일 때만 전송 — 무음 조각 스킵
        const hasSpeech = analyser ? voicedFrames >= 3 : true;
        // 다음 발화는 즉시 듣기 시작 — 전송·전사와 병렬 (대기 공백 없음)
        if (!stopped) recordCycle();
        if (!stopped && hasSpeech && blob.size > 4000) {
          setStatus("processing");
          try {
            const headers = await getConsultAuthHeaders();
            if (headers) {
              const fd = new FormData();
              fd.append("audio", blob, "chunk.webm");
              fd.append("lang", myLang);
              fd.append("targetLang", targetLang);
              const res = await fetch(
                `/api/khidi/consultation/${consultationId}/stt`,
                { method: "POST", headers, body: fd }
              );
              const result = await res.json();
              if (result.ok && result.transcript) {
                if (result.translated) {
                  // 전사+번역 통합 응답 — 추가 번역 호출 없이 바로 자막 반영
                  applyTranslationRef.current(result.transcript, result.translated);
                } else {
                  // 번역이 비어 오면(파싱 실패 등) 기존 번역 API 로 폴백
                  translateTextRef.current(result.transcript);
                }
              }
            }
          } catch {
            /* 조각 실패는 무시 — 다음 사이클 */
          }
          if (lastStatus === "processing") setStatus("listening");
        }
      };
      recorder.start();
      setStatus("listening");

      if (analyser) {
        const buf = new Uint8Array(analyser.fftSize);
        vadTimer = setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          if (rms > 0.02) {
            voicedFrames += 1;
            silentStreak = 0;
            if (lastStatus === "listening") setStatus("speaking");
          } else if (voicedFrames >= 3) {
            silentStreak += 1;
          }
          const dur = Date.now() - startedAt;
          const shouldCut =
            (voicedFrames >= 3 && silentStreak >= 7) || // 말 끝남(0.7초 무음) → 즉시 전송
            (voicedFrames >= 3 && dur >= 12000) || // 너무 긴 발화는 강제 컷 (블롭 상한 보호)
            (voicedFrames < 3 && dur >= 5000); // 무음만 5초 — 버리고 새 사이클
          if (shouldCut) {
            try {
              if (recorder.state !== "inactive") recorder.stop();
            } catch {
              /* ignore */
            }
          }
        }, 100);
      } else {
        // 음량 분석 불가 환경 — 기존 4초 고정 컷으로 폴백
        stopTimer = setTimeout(() => {
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {
            /* ignore */
          }
        }, 4000);
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // 마이크 확보 실패(거부·이중 점유 차단 등) — 조용히 죽지 말고
        // "음성 안 됨 → 아래 입력칸" 안내가 뜨도록 서버 STT 불가로 표시
        setMediaRecOk(false);
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      // 음량 분석기 연결 (실패해도 녹음 자체는 진행)
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
      } catch {
        analyser = null;
      }
      recordCycle();
    })();

    return () => {
      stopped = true;
      clearTimeout(stopTimer);
      clearInterval(vadTimer);
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
      setServerSttStatus("idle");
    };
  }, [useServerStt, myLang, targetLang, consultationId, getConsultAuthHeaders]);

  // ── End call ──
  const handleEndCall = async () => {
    if (confirm(c.endConfirm)) {
      if (translationEnabled) stt.stop();
      tts.stop();

      try {
        const headers = await getConsultAuthHeaders();
        await fetch(`/api/khidi/consultation/${consultationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
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
            {/* 인앱 브라우저(카카오톡 등) → 영상·음성 제한 → 입장 전에 외부 브라우저 유도 */}
            {isInAppBrowser && (
              <div className="mt-4 flex items-center justify-between gap-3 bg-yellow-500/10 border border-yellow-600/40 rounded-lg px-3 py-2.5">
                <p className="text-xs text-yellow-200 leading-snug">{c.inAppNotice}</p>
                <button
                  type="button"
                  onClick={openInExternalBrowser}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg transition"
                >
                  <ExternalLink size={14} /> {c.openExternal}
                </button>
              </div>
            )}
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

            {/* 내가 말하는 언어 — 사이트 언어로 미리 선택돼 있음, 자막·번역 방향 결정 */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-200">
                {c.myLangLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setGuestLang(l)}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      guestLang === l
                        ? "bg-teal-600 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
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

  // 대기실/거절 화면 — 영상·채팅·번역 UI 없이 안내만 (혼란 방지)
  const isWaitingScreen =
    !!livekitToken && (admissionStatus === "pending" || admissionStatus === "rejected");

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-700 rounded-lg transition shrink-0"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold truncate">
                {consultation?.cancer_patient_intakes?.[0]?.cancer_type || c.consultationFallback}
                {consultation?.session_type === "pre_consultation" && <> — {c.sessionPre}</>}
                {consultation?.session_type === "follow_up" && <> — {c.sessionFollowUp}</>}
                {consultation?.session_type === "emergency" && <> — {c.sessionEmergency}</>}
                {consultation?.session_type === "diagnostic" && <> — {c.sessionDiagnostic}</>}
              </h1>
              <p className="text-xs text-gray-400 truncate">
                {consultation?.livekit_room_name && <>Room: {consultation.livekit_room_name}</>}
                {connected && <span className="ml-2 text-green-400">● {c.connected}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* 대기실에선 번역·언어 컨트롤 숨김 — 입장 후에만 의미 있음 */}
            {!isWaitingScreen && (
              <>
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

            {/* TTS toggle — 임시 비활성화 중엔 버튼 숨김 */}
            {TTS_FEATURE_ON && (
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
            )}

            {/* 언어쌍 선택 — 역할 기반 기본값이 있으므로 데스크톱에서만 노출 (모바일 단순화) */}
            <select
              value={myLang}
              onChange={(e) => setMyLang(e.target.value)}
              className="hidden md:inline-block bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
            <span className="hidden md:inline text-gray-500 text-xs">→</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="hidden md:inline-block bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="kz">Қазақша</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
            </select>

            {/* 자막 크기 선택 — 번역이 켜져 있을 때만, 데스크톱에서만 */}
            {translationEnabled && (
              <select
                value={subtitleSize}
                onChange={(e) => setSubtitleSize(e.target.value)}
                className="hidden md:inline-block bg-gray-700 text-white text-xs rounded px-2 py-1 border-0"
                title={c.subtitleSizeTitle}
              >
                <option value="sm">{c.subtitleSmall}</option>
                <option value="md">{c.subtitleMedium}</option>
                <option value="lg">{c.subtitleLarge}</option>
              </select>
            )}
            {/* 채팅·번역 패널 토글 (Zoom/Meet 식 — 기본 숨김, 영상이 주인공) */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className={`relative p-2 rounded-lg transition ${
                panelOpen
                  ? "bg-teal-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={c.togglePanel}
            >
              <MessageSquare size={16} />
              {!panelOpen && translations.length + messages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[10px] leading-none px-1 py-0.5 rounded-full">
                  {translations.length + messages.length > 9 ? "9+" : translations.length + messages.length}
                </span>
              )}
            </button>
              </>
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

      {/* 인앱 브라우저 경고 — 영상·음성 제한 가능 → 외부 브라우저 유도 */}
      {isInAppBrowser && (
        <div className="flex items-center justify-between gap-3 bg-yellow-500/10 border-b border-yellow-600/40 px-3 py-2">
          <p className="text-xs text-yellow-200 leading-snug">{c.inAppNotice}</p>
          <button
            onClick={openInExternalBrowser}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg transition"
          >
            <ExternalLink size={13} /> {c.openExternal}
          </button>
        </div>
      )}

      {/* ── Main content ── (relative: 모바일 패널 바텀시트 오버레이 기준) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
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
              {/* 의사용 대기자 승인 배너 — 1명 이상 대기 중일 때 표시 (게스트 의사/코디 포함) */}
              {pendingAdmissions.length > 0 && (
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
                {/* 서버 STT 상태 표시 — 듣는 중(회색)/목소리 감지(초록)/자막 생성 중(노랑).
                    "되는 건지 알 수 없다"는 피드백 해소용 생존 신호 */}
                {useServerStt && serverSttStatus !== "idle" && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1.5 pointer-events-none">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        serverSttStatus === "processing"
                          ? "bg-amber-400 animate-pulse"
                          : serverSttStatus === "speaking"
                          ? "bg-green-400 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <Mic size={12} className="text-gray-300" />
                    <span className="text-[11px] text-gray-200">
                      {serverSttStatus === "processing" ? c.sttProcessing : c.sttListening}
                    </span>
                  </div>
                )}
              </div>
              {/* 단순 컨트롤 — 기기 선택 메뉴 없이 켜기/끄기만.
                  소리는 기기 기본 출력(이어폰 연결 시 이어폰), 카메라는 기본(전면) 1개 */}
              <div className="lk-control-bar" style={{ justifyContent: "center" }}>
                <TrackToggle source={Track.Source.Microphone} />
                <TrackToggle source={Track.Source.Camera} />
                <TrackToggle source={Track.Source.ScreenShare} className="hidden sm:inline-flex" />
              </div>
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

        {/* ── Chat + Translation 패널 ── Zoom/Meet 식: 기본 숨김, 버튼으로 토글.
            모바일=영상 위 바텀시트 오버레이, 데스크톱=우측 사이드. 대기실에선 숨김. */}
        {!isWaitingScreen && panelOpen && (
        <div
          className="
            flex flex-col bg-gray-800 z-30
            absolute inset-x-0 bottom-0 top-auto h-[68vh] border-t border-gray-700 rounded-t-2xl shadow-2xl
            lg:static lg:inset-auto lg:h-auto lg:w-96 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none
          "
        >
          {/* Tab selector + 닫기 */}
          <div className="flex items-center border-b border-gray-700">
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
            <button
              onClick={() => setPanelOpen(false)}
              className="px-3 py-3 text-gray-400 hover:text-white shrink-0"
              title={c.togglePanel}
            >
              <X size={18} />
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

              {/* 공유 자료 목록 — 검사결과지·처방전 등 (양쪽 모두 보임) */}
              {sharedDocs.length > 0 && (
                <div className="border-t border-gray-700 px-4 py-2 max-h-28 overflow-y-auto">
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    {c.sharedFiles} ({sharedDocs.length})
                  </p>
                  <div className="space-y-1">
                    {sharedDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-teal-300 hover:text-teal-200 truncate"
                      >
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate">{doc.file_name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  {/* 자료 첨부 (PDF·이미지·DICOM, 20MB) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.dcm,application/pdf,image/jpeg,image/png,image/webp,application/dicom"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDoc}
                    className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg transition text-gray-300"
                    title={uploadingDoc ? c.uploadingFile : c.attachFile}
                  >
                    {uploadingDoc ? (
                      <span className="block w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Paperclip size={16} />
                    )}
                  </button>
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
                    {translationEnabled ? (
                      // 번역이 이미 켜져 있으면 "버튼 누르세요" 대신 사용법 안내
                      <>
                        <p>{c.emptyActiveHint1}</p>
                        <p>{c.emptyActiveHint2}</p>
                      </>
                    ) : (
                      <>
                        <p>{c.translationEmpty1}</p>
                        <p>{c.translationEmpty2}</p>
                      </>
                    )}
                    {(!stt.isSupported || stt.failed || forceServerStt) && !mediaRecOk && (
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
                    <span className="text-gray-400">{c.translationActive}</span>
                    <button
                      onClick={() => setLangSheetOpen(true)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-teal-300 font-medium transition"
                    >
                      {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
                    </button>
                    {isTranslating && (
                      <span className="text-yellow-400 ml-auto">{c.translatingNow}</span>
                    )}
                  </div>
                </div>
              )}

              {/* 음성 인식 실패 + 서버 폴백도 불가한 환경만 — 수동 입력 유도 */}
              {translationEnabled && (stt.failed || !stt.isSupported || forceServerStt) && !mediaRecOk && (
                <div className="border-t border-gray-700 px-4 py-2 bg-yellow-500/10">
                  <p className="text-xs text-yellow-300">{c.sttFailedNotice}</p>
                </div>
              )}

              {/* 수동 입력 — 마이크가 없거나 STT 미지원 브라우저(iOS Safari·삼성 등)에서도 번역 가능 */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualInput.trim()) {
                        translateText(manualInput.trim());
                        setManualInput("");
                      }
                    }}
                    placeholder={c.manualPlaceholder}
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => {
                      if (manualInput.trim()) {
                        translateText(manualInput.trim());
                        setManualInput("");
                      }
                    }}
                    disabled={isTranslating || !manualInput.trim()}
                    className="p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                    title={c.manualHint}
                  >
                    <Languages size={16} />
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">{c.manualHint}</p>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── 통번역 미니 바 — 패널 닫혀 있어도 입력·언어변경 가능 (영상은 안 가림) ── */}
      {!isWaitingScreen && translationEnabled && !panelOpen && (
        <div className="bg-gray-800 border-t border-gray-700 px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => setLangSheetOpen(true)}
            className="shrink-0 px-2.5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-teal-300 font-medium transition"
          >
            {LANG_LABELS[myLang]} → {LANG_LABELS[targetLang]}
          </button>
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualInput.trim()) {
                translateText(manualInput.trim());
                setManualInput("");
              }
            }}
            placeholder={c.manualPlaceholder}
            className="flex-1 min-w-0 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => {
              if (manualInput.trim()) {
                translateText(manualInput.trim());
                setManualInput("");
              }
            }}
            disabled={isTranslating || !manualInput.trim()}
            className="shrink-0 p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
            title={c.manualHint}
          >
            <Languages size={16} />
          </button>
        </div>
      )}

      {/* ── 언어 변경 바텀시트 — 모바일에서도 언어쌍 변경 가능 ── */}
      {langSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setLangSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-gray-800 rounded-t-2xl p-5 space-y-4 border-t border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-white">{c.langChangeTitle}</p>
            <div>
              <p className="text-xs text-gray-400 mb-2">{c.myLangLabel}</p>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setMyLang(l)}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      myLang === l
                        ? "bg-teal-600 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">{c.langTheirLabel}</p>
              <div className="flex flex-wrap gap-2">
                {["ko", "en", "ru", "kz", "zh", "ja"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setTargetLang(l)}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      targetLang === l
                        ? "bg-teal-600 border-teal-500 text-white font-semibold"
                        : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setLangSheetOpen(false)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-semibold transition"
            >
              {c.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
