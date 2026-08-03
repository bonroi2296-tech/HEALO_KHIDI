"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { kstDate, kstTime } from "@/lib/datetime/kst";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Phone,
  X,
  ChevronDown,
  Globe,
  AlertCircle,
  Plus,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useBackofficeLang } from "@/lib/i18n/coordinator";
// 병기 라벨은 사전 한 곳(코디 콘텐츠 편집기에서 수정 가능) — 화면마다 조립하지 않는다.
import { stageLabel } from "@/lib/inquiry/intakeLabels";
import { CreateConsultationModal } from "@/components/consultation/CreateConsultationModal";

const supabase = createSupabaseBrowserClient();

// 스태프 백오피스 6개 언어화(2026-07-09 PO 결정 — 예외 없이 전체 다국어 전환).
const LOCALE_MAP = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };
const TR = {
  ko: {
    errAuth: "인증 오류. 다시 로그인하세요.", errLoadFailedTpl: "상담 로딩 실패: {msg}", errLoadFailed: "상담 로딩 실패",
    errAuthSimple: "인증 오류", errInviteFailedTpl: "상담 링크 생성 실패: {msg}", errInviteFailed: "상담 링크 생성 실패",
    errJoinBlocked: "상담 링크 발급이 안 돼 입장을 멈췄어요. 새로고침(또는 다시 로그인) 후 다시 눌러주세요.",
    toastLinkCopiedJoin: "상담 링크를 복사했어요 — 상대에게 붙여넣어 보내세요. 나는 지금 입장합니다",
    toastLinkCopiedAndEmailed: "상담 링크를 복사했고, 등록된 이메일로도 발송했습니다",
    toastLinkCopiedExpiresTpl: "상담 링크가 클립보드에 복사됐습니다 (만료: {date})",
    promptCopyLink: "아래 링크를 복사해 공유하세요:",
    confirmCancel: "상담을 취소하시겠습니까? 발송된 초대 링크도 함께 폐기됩니다.",
    errAuthReLogin: "인증 오류 — 다시 로그인하세요.", errCancelFailedTpl: "취소 실패: {msg}",
    toastCancelled: "상담이 취소되었습니다. 초대 링크도 폐기됐습니다.", errCancelFailed: "취소 실패",
    confirmComplete: "이 상담을 '완료' 처리할까요?\n완료하면 발송된 초대 링크가 폐기되어 재입장할 수 없습니다.",
    errCompleteFailedTpl: "완료 처리 실패: {msg}", toastCompleted: "상담을 완료 처리했습니다. (사전상담·사후관리 실적에 집계됩니다)", errCompleteFailed: "완료 처리 실패",
    errBillingRequired: "AI 회의록은 Gemini 유료 설정 후 켜집니다 (현재 비활성).",
    errNoTranscript: "번역 기록이 없어 회의록을 만들 수 없어요.",
    errAiFailed: "AI 생성에 실패했어요. 잠시 후 다시 시도해 주세요.", errSummaryFailed: "회의록 생성 실패",
    toastSummaryDone: "AI 회의록을 만들었어요.",
    sessionTypePre: "진료 전 평가", sessionTypeFollow: "추후 진료", sessionTypeEmergency: "긴급 상담", sessionTypePartner: "파트너 미팅(에이전시·병원)", sessionTypePartnerHint: "KHIDI 실적(사전상담·사후관리)에는 집계되지 않습니다.",
    statusScheduled: "예정됨", statusActive: "진행 중", statusCompleted: "완료", statusCancelled: "취소됨", statusNoShow: "무응답",
    pageTitle: "원격협진 관리", pageDesc: "카자흐스탄 환자와 한국 병원 간 WebRTC 화상 상담", btnNewConsult: "새 상담 예약",
    tabAll: "전체", loadingText: "로딩 중...", emptyHeading: "상담이 없습니다.",
    emptyUpcoming: "예정된 상담이 없습니다.", emptyActive: "진행 중인 상담이 없습니다.", emptyCompleted: "완료된 상담이 없습니다.", emptyAll: "상담 기록이 없습니다.",
    lblDoctor: "담당 의사", lblCoordinator: "코디네이터", lblRoomInfo: "방 정보", lblNotes: "비고",
    btnJoin: "상담 시작", btnCopyLink: "🔗 링크 복사", titleCopyLink: "입장 없이 링크만 복사 — 「상담 시작」과 같은 링크",
    btnCompleteAction: "완료", titleCompleteAction: "상담을 '완료'로 기록 (사전상담·사후관리 실적 집계) — 초대 링크도 폐기",
    btnCancelAction: "취소", titleCancelAction: "상담 취소 (초대 링크도 폐기)",
    btnRejoin: "상담 재진입", completedBadge: "완료됨",
    btnGenSummary: "AI 회의록 생성", btnRegenSummary: "AI 회의록 다시 생성", summaryGenerating: "회의록 생성 중…",
    aiSummaryTitle: "AI 회의록", aiSummaryNote: "(AI 자동 생성 · 참고용, 의료진 확인 필요)",
    secSummary: "요약", secDecisions: "결정사항", secNextSteps: "다음 단계", secConcerns: "환자 우려",
    toastNewConsultCreated: "상담 예약이 생성되었습니다",
  },
  en: {
    errAuth: "Authentication error. Please log in again.", errLoadFailedTpl: "Failed to load consultations: {msg}", errLoadFailed: "Failed to load consultations",
    errAuthSimple: "Authentication error", errInviteFailedTpl: "Failed to create consultation link: {msg}", errInviteFailed: "Failed to create consultation link",
    errJoinBlocked: "Couldn't issue a consultation link, so we stopped before entering. Refresh (or log in again) and try again.",
    toastLinkCopiedJoin: "Consultation link copied — paste it to send to the other party. You're entering now.",
    toastLinkCopiedAndEmailed: "Consultation link copied, and also sent to the registered email",
    toastLinkCopiedExpiresTpl: "Consultation link copied to clipboard (expires: {date})",
    promptCopyLink: "Copy the link below to share:",
    confirmCancel: "Cancel this consultation? The sent invite link will also be revoked.",
    errAuthReLogin: "Authentication error — please log in again.", errCancelFailedTpl: "Cancellation failed: {msg}",
    toastCancelled: "The consultation was cancelled. The invite link was also revoked.", errCancelFailed: "Cancellation failed",
    confirmComplete: "Mark this consultation as 'completed'?\nOnce completed, the sent invite link is revoked and can't be re-entered.",
    errCompleteFailedTpl: "Failed to mark as completed: {msg}", toastCompleted: "Consultation marked as completed. (Counted toward pre-consultation / follow-up-care metrics)", errCompleteFailed: "Failed to mark as completed",
    errBillingRequired: "AI meeting notes require a paid Gemini setup (currently disabled).",
    errNoTranscript: "No translation transcript, so meeting notes can't be generated.",
    errAiFailed: "AI generation failed. Please try again shortly.", errSummaryFailed: "Failed to generate meeting notes",
    toastSummaryDone: "AI meeting notes generated.",
    sessionTypePre: "Pre-treatment assessment", sessionTypeFollow: "Follow-up", sessionTypeEmergency: "Emergency consult", sessionTypePartner: "Partner meeting (agency/hospital)", sessionTypePartnerHint: "Not counted toward KHIDI figures (pre-consultation / follow-up).",
    statusScheduled: "Scheduled", statusActive: "Active", statusCompleted: "Completed", statusCancelled: "Cancelled", statusNoShow: "No-show",
    pageTitle: "Telemedicine Management", pageDesc: "WebRTC video consultations between Kazakhstan patients and Korean hospitals", btnNewConsult: "New consultation",
    tabAll: "All", loadingText: "Loading...", emptyHeading: "No consultations.",
    emptyUpcoming: "No upcoming consultations.", emptyActive: "No active consultations.", emptyCompleted: "No completed consultations.", emptyAll: "No consultation records.",
    lblDoctor: "Attending doctor", lblCoordinator: "Coordinator", lblRoomInfo: "Room info", lblNotes: "Notes",
    btnJoin: "Start consultation", btnCopyLink: "🔗 Copy link", titleCopyLink: "Copy the link without entering — same link as \"Start consultation\"",
    btnCompleteAction: "Complete", titleCompleteAction: "Record this consultation as 'completed' (counted toward pre-consultation / follow-up-care metrics) — also revokes the invite link",
    btnCancelAction: "Cancel", titleCancelAction: "Cancel the consultation (also revokes the invite link)",
    btnRejoin: "Rejoin consultation", completedBadge: "Completed",
    btnGenSummary: "Generate AI meeting notes", btnRegenSummary: "Regenerate AI meeting notes", summaryGenerating: "Generating meeting notes…",
    aiSummaryTitle: "AI meeting notes", aiSummaryNote: "(Auto-generated by AI · for reference, needs medical staff review)",
    secSummary: "Summary", secDecisions: "Decisions", secNextSteps: "Next steps", secConcerns: "Patient concerns",
    toastNewConsultCreated: "The consultation was scheduled",
  },
  ru: {
    errAuth: "Ошибка авторизации. Войдите снова.", errLoadFailedTpl: "Не удалось загрузить консультации: {msg}", errLoadFailed: "Не удалось загрузить консультации",
    errAuthSimple: "Ошибка авторизации", errInviteFailedTpl: "Не удалось создать ссылку на консультацию: {msg}", errInviteFailed: "Не удалось создать ссылку на консультацию",
    errJoinBlocked: "Не удалось выдать ссылку на консультацию, вход остановлен. Обновите страницу (или войдите снова) и попробуйте ещё раз.",
    toastLinkCopiedJoin: "Ссылка на консультацию скопирована — вставьте и отправьте собеседнику. Вы входите сейчас.",
    toastLinkCopiedAndEmailed: "Ссылка на консультацию скопирована и отправлена на зарегистрированный email",
    toastLinkCopiedExpiresTpl: "Ссылка на консультацию скопирована в буфер обмена (истекает: {date})",
    promptCopyLink: "Скопируйте ссылку ниже, чтобы поделиться:",
    confirmCancel: "Отменить эту консультацию? Отправленная ссылка-приглашение также будет аннулирована.",
    errAuthReLogin: "Ошибка авторизации — войдите снова.", errCancelFailedTpl: "Не удалось отменить: {msg}",
    toastCancelled: "Консультация отменена. Ссылка-приглашение также аннулирована.", errCancelFailed: "Не удалось отменить",
    confirmComplete: "Отметить эту консультацию как «завершена»?\nПосле завершения отправленная ссылка-приглашение аннулируется и повторный вход невозможен.",
    errCompleteFailedTpl: "Не удалось отметить как завершённую: {msg}", toastCompleted: "Консультация отмечена как завершённая. (Учитывается в показателях предварительных консультаций / последующего наблюдения)", errCompleteFailed: "Не удалось отметить как завершённую",
    errBillingRequired: "Протоколы ИИ требуют платной настройки Gemini (сейчас отключено).",
    errNoTranscript: "Нет расшифровки перевода, протокол создать нельзя.",
    errAiFailed: "Не удалось сгенерировать через ИИ. Попробуйте ещё раз чуть позже.", errSummaryFailed: "Не удалось создать протокол",
    toastSummaryDone: "Протокол ИИ создан.",
    sessionTypePre: "Оценка перед лечением", sessionTypeFollow: "Повторный приём", sessionTypeEmergency: "Экстренная консультация", sessionTypePartner: "Встреча с партнёром (агентство/больница)", sessionTypePartnerHint: "Не учитывается в показателях KHIDI (предварительная консультация / наблюдение).",
    statusScheduled: "Запланирована", statusActive: "Идёт", statusCompleted: "Завершена", statusCancelled: "Отменена", statusNoShow: "Неявка",
    pageTitle: "Управление телемедициной", pageDesc: "Видеоконсультации WebRTC между пациентами из Казахстана и корейскими больницами", btnNewConsult: "Новая консультация",
    tabAll: "Все", loadingText: "Загрузка...", emptyHeading: "Нет консультаций.",
    emptyUpcoming: "Нет предстоящих консультаций.", emptyActive: "Нет активных консультаций.", emptyCompleted: "Нет завершённых консультаций.", emptyAll: "Нет записей консультаций.",
    lblDoctor: "Лечащий врач", lblCoordinator: "Координатор", lblRoomInfo: "Информация о комнате", lblNotes: "Примечания",
    btnJoin: "Начать консультацию", btnCopyLink: "🔗 Скопировать ссылку", titleCopyLink: "Скопировать ссылку без входа — та же ссылка, что и «Начать консультацию»",
    btnCompleteAction: "Завершить", titleCompleteAction: "Отметить консультацию как «завершена» (учитывается в показателях) — также аннулирует ссылку-приглашение",
    btnCancelAction: "Отменить", titleCancelAction: "Отменить консультацию (также аннулирует ссылку-приглашение)",
    btnRejoin: "Вернуться в консультацию", completedBadge: "Завершена",
    btnGenSummary: "Создать протокол ИИ", btnRegenSummary: "Пересоздать протокол ИИ", summaryGenerating: "Создание протокола…",
    aiSummaryTitle: "Протокол ИИ", aiSummaryNote: "(Автоматически создано ИИ · только для справки, требуется проверка медперсонала)",
    secSummary: "Резюме", secDecisions: "Решения", secNextSteps: "Следующие шаги", secConcerns: "Опасения пациента",
    toastNewConsultCreated: "Консультация запланирована",
  },
  kz: {
    errAuth: "Аутентификация қатесі. Қайта кіріңіз.", errLoadFailedTpl: "Кеңестерді жүктеу сәтсіз: {msg}", errLoadFailed: "Кеңестерді жүктеу сәтсіз",
    errAuthSimple: "Аутентификация қатесі", errInviteFailedTpl: "Кеңес сілтемесін жасау сәтсіз: {msg}", errInviteFailed: "Кеңес сілтемесін жасау сәтсіз",
    errJoinBlocked: "Кеңес сілтемесі шығарылмады, кіру тоқтатылды. Бетті жаңартып (немесе қайта кіріп) қайталап көріңіз.",
    toastLinkCopiedJoin: "Кеңес сілтемесі көшірілді — қарсы тарапқа жіберіңіз. Қазір кіресіз.",
    toastLinkCopiedAndEmailed: "Кеңес сілтемесі көшірілді және тіркелген email-ге жіберілді",
    toastLinkCopiedExpiresTpl: "Кеңес сілтемесі буферге көшірілді (мерзімі: {date})",
    promptCopyLink: "Бөлісу үшін төмендегі сілтемені көшіріңіз:",
    confirmCancel: "Бұл кеңесті бас тартасыз ба? Жіберілген шақыру сілтемесі де жойылады.",
    errAuthReLogin: "Аутентификация қатесі — қайта кіріңіз.", errCancelFailedTpl: "Бас тарту сәтсіз: {msg}",
    toastCancelled: "Кеңес бас тартылды. Шақыру сілтемесі де жойылды.", errCancelFailed: "Бас тарту сәтсіз",
    confirmComplete: "Бұл кеңесті «аяқталды» деп белгілейсіз бе?\nАяқталған соң жіберілген шақыру сілтемесі жойылады және қайта кіру мүмкін емес.",
    errCompleteFailedTpl: "Аяқталды деп белгілеу сәтсіз: {msg}", toastCompleted: "Кеңес аяқталды деп белгіленді. (Алдын ала кеңес / емнен кейінгі бақылау көрсеткіштеріне есептеледі)", errCompleteFailed: "Аяқталды деп белгілеу сәтсіз",
    errBillingRequired: "AI хаттамалары ақылы Gemini баптауын талап етеді (қазір өшірулі).",
    errNoTranscript: "Аударма жазбасы жоқ, хаттама жасау мүмкін емес.",
    errAiFailed: "AI жасау сәтсіз болды. Сәл кейін қайталап көріңіз.", errSummaryFailed: "Хаттама жасау сәтсіз",
    toastSummaryDone: "AI хаттамасы жасалды.",
    sessionTypePre: "Емдеу алдындағы бағалау", sessionTypeFollow: "Қайталама қабылдау", sessionTypeEmergency: "Шұғыл кеңес", sessionTypePartner: "Серіктеспен кездесу (агенттік/аурухана)", sessionTypePartnerHint: "KHIDI көрсеткіштеріне (алдын ала кеңес / бақылау) есептелмейді.",
    statusScheduled: "Жоспарланған", statusActive: "Жүруде", statusCompleted: "Аяқталды", statusCancelled: "Бас тартылды", statusNoShow: "Келмеді",
    pageTitle: "Телемедицинаны басқару", pageDesc: "Қазақстандық науқастар мен корей ауруханалары арасындағы WebRTC бейнекеңестер", btnNewConsult: "Жаңа кеңес",
    tabAll: "Барлығы", loadingText: "Жүктелуде...", emptyHeading: "Кеңестер жоқ.",
    emptyUpcoming: "Жоспарланған кеңестер жоқ.", emptyActive: "Белсенді кеңестер жоқ.", emptyCompleted: "Аяқталған кеңестер жоқ.", emptyAll: "Кеңес жазбалары жоқ.",
    lblDoctor: "Емдеуші дәрігер", lblCoordinator: "Үйлестіруші", lblRoomInfo: "Бөлме туралы ақпарат", lblNotes: "Ескертпе",
    btnJoin: "Кеңесті бастау", btnCopyLink: "🔗 Сілтемені көшіру", titleCopyLink: "Кірмей-ақ тек сілтемені көшіру — «Кеңесті бастаумен» бірдей сілтеме",
    btnCompleteAction: "Аяқтау", titleCompleteAction: "Кеңесті «аяқталды» деп белгілеу (көрсеткіштерге есептеледі) — шақыру сілтемесі де жойылады",
    btnCancelAction: "Бас тарту", titleCancelAction: "Кеңесті бас тарту (шақыру сілтемесі де жойылады)",
    btnRejoin: "Кеңеске қайта кіру", completedBadge: "Аяқталды",
    btnGenSummary: "AI хаттамасын жасау", btnRegenSummary: "AI хаттамасын қайта жасау", summaryGenerating: "Хаттама жасалуда…",
    aiSummaryTitle: "AI хаттамасы", aiSummaryNote: "(AI автоматты жасаған · анықтама үшін, медперсонал тексеруі қажет)",
    secSummary: "Қорытынды", secDecisions: "Шешімдер", secNextSteps: "Келесі қадамдар", secConcerns: "Науқас алаңдаушылығы",
    toastNewConsultCreated: "Кеңес жоспарланды",
  },
  zh: {
    errAuth: "身份验证错误，请重新登录。", errLoadFailedTpl: "会诊加载失败：{msg}", errLoadFailed: "会诊加载失败",
    errAuthSimple: "身份验证错误", errInviteFailedTpl: "会诊链接创建失败：{msg}", errInviteFailed: "会诊链接创建失败",
    errJoinBlocked: "会诊链接生成失败，已停止进入。请刷新（或重新登录）后再试。",
    toastLinkCopiedJoin: "会诊链接已复制 — 请粘贴发送给对方，您现在进入。",
    toastLinkCopiedAndEmailed: "会诊链接已复制，并已发送至注册邮箱",
    toastLinkCopiedExpiresTpl: "会诊链接已复制到剪贴板（过期时间：{date}）",
    promptCopyLink: "请复制以下链接分享：",
    confirmCancel: "确定取消此次会诊吗？已发送的邀请链接也将同时失效。",
    errAuthReLogin: "身份验证错误 — 请重新登录。", errCancelFailedTpl: "取消失败：{msg}",
    toastCancelled: "会诊已取消，邀请链接也已失效。", errCancelFailed: "取消失败",
    confirmComplete: "将此次会诊标记为“已完成”吗？\n完成后已发送的邀请链接将失效，无法再次进入。",
    errCompleteFailedTpl: "标记完成失败：{msg}", toastCompleted: "会诊已标记为完成。（计入术前咨询/术后随访绩效）", errCompleteFailed: "标记完成失败",
    errBillingRequired: "AI会议记录需先开通Gemini付费设置（当前未启用）。",
    errNoTranscript: "没有翻译记录，无法生成会议记录。",
    errAiFailed: "AI生成失败，请稍后重试。", errSummaryFailed: "会议记录生成失败",
    toastSummaryDone: "AI会议记录已生成。",
    sessionTypePre: "治疗前评估", sessionTypeFollow: "复诊", sessionTypeEmergency: "紧急会诊", sessionTypePartner: "合作方会议（代理机构/医院）", sessionTypePartnerHint: "不计入 KHIDI 指标（术前咨询/术后随访）。",
    statusScheduled: "已预约", statusActive: "进行中", statusCompleted: "已完成", statusCancelled: "已取消", statusNoShow: "未出席",
    pageTitle: "远程会诊管理", pageDesc: "哈萨克斯坦患者与韩国医院之间的WebRTC视频会诊", btnNewConsult: "新建会诊预约",
    tabAll: "全部", loadingText: "加载中...", emptyHeading: "暂无会诊。",
    emptyUpcoming: "暂无预约中的会诊。", emptyActive: "暂无进行中的会诊。", emptyCompleted: "暂无已完成的会诊。", emptyAll: "暂无会诊记录。",
    lblDoctor: "主治医生", lblCoordinator: "协调员", lblRoomInfo: "房间信息", lblNotes: "备注",
    btnJoin: "开始会诊", btnCopyLink: "🔗 复制链接", titleCopyLink: "不进入仅复制链接 — 与「开始会诊」相同的链接",
    btnCompleteAction: "完成", titleCompleteAction: "将会诊标记为“完成”（计入绩效）— 邀请链接也将失效",
    btnCancelAction: "取消", titleCancelAction: "取消会诊（邀请链接也将失效）",
    btnRejoin: "重新进入会诊", completedBadge: "已完成",
    btnGenSummary: "生成AI会议记录", btnRegenSummary: "重新生成AI会议记录", summaryGenerating: "正在生成会议记录…",
    aiSummaryTitle: "AI会议记录", aiSummaryNote: "（AI自动生成 · 仅供参考，需医护人员确认）",
    secSummary: "摘要", secDecisions: "决定事项", secNextSteps: "后续步骤", secConcerns: "患者关切",
    toastNewConsultCreated: "会诊预约已创建",
  },
  ja: {
    errAuth: "認証エラー。再度ログインしてください。", errLoadFailedTpl: "相談の読み込みに失敗しました: {msg}", errLoadFailed: "相談の読み込みに失敗しました",
    errAuthSimple: "認証エラー", errInviteFailedTpl: "相談リンクの作成に失敗しました: {msg}", errInviteFailed: "相談リンクの作成に失敗しました",
    errJoinBlocked: "相談リンクを発行できなかったため入室を中止しました。再読み込み（または再ログイン）後、もう一度お試しください。",
    toastLinkCopiedJoin: "相談リンクをコピーしました — 相手に貼り付けて送信してください。あなたは今すぐ入室します。",
    toastLinkCopiedAndEmailed: "相談リンクをコピーし、登録メールにも送信しました",
    toastLinkCopiedExpiresTpl: "相談リンクをクリップボードにコピーしました（有効期限: {date}）",
    promptCopyLink: "以下のリンクをコピーして共有してください：",
    confirmCancel: "この相談をキャンセルしますか？送信済みの招待リンクも同時に無効になります。",
    errAuthReLogin: "認証エラー — 再度ログインしてください。", errCancelFailedTpl: "キャンセル失敗: {msg}",
    toastCancelled: "相談をキャンセルしました。招待リンクも無効になりました。", errCancelFailed: "キャンセル失敗",
    confirmComplete: "この相談を「完了」にしますか？\n完了すると送信済みの招待リンクが無効になり、再入室できなくなります。",
    errCompleteFailedTpl: "完了処理に失敗しました: {msg}", toastCompleted: "相談を完了として記録しました。（事前相談・アフターケア実績に集計されます）", errCompleteFailed: "完了処理に失敗しました",
    errBillingRequired: "AI議事録はGeminiの有料設定後に利用できます（現在無効）。",
    errNoTranscript: "翻訳記録がないため議事録を作成できません。",
    errAiFailed: "AI生成に失敗しました。しばらくしてから再度お試しください。", errSummaryFailed: "議事録の生成に失敗しました",
    toastSummaryDone: "AI議事録を作成しました。",
    sessionTypePre: "治療前評価", sessionTypeFollow: "再診", sessionTypeEmergency: "緊急相談", sessionTypePartner: "パートナー会議（代理店・病院）", sessionTypePartnerHint: "KHIDI 実績（事前相談・術後フォロー）には計上されません。",
    statusScheduled: "予定", statusActive: "進行中", statusCompleted: "完了", statusCancelled: "キャンセル済み", statusNoShow: "無応答",
    pageTitle: "遠隔診療管理", pageDesc: "カザフスタンの患者と韓国の病院間のWebRTCビデオ相談", btnNewConsult: "新規相談予約",
    tabAll: "すべて", loadingText: "読み込み中...", emptyHeading: "相談はありません。",
    emptyUpcoming: "予定の相談はありません。", emptyActive: "進行中の相談はありません。", emptyCompleted: "完了した相談はありません。", emptyAll: "相談記録はありません。",
    lblDoctor: "担当医師", lblCoordinator: "コーディネーター", lblRoomInfo: "ルーム情報", lblNotes: "備考",
    btnJoin: "相談を開始", btnCopyLink: "🔗 リンクをコピー", titleCopyLink: "入室せずリンクのみコピー — 「相談を開始」と同じリンク",
    btnCompleteAction: "完了", titleCompleteAction: "相談を「完了」として記録（事前相談・アフターケア実績に集計）— 招待リンクも無効化",
    btnCancelAction: "キャンセル", titleCancelAction: "相談をキャンセル（招待リンクも無効化）",
    btnRejoin: "相談に再入室", completedBadge: "完了済み",
    btnGenSummary: "AI議事録を生成", btnRegenSummary: "AI議事録を再生成", summaryGenerating: "議事録を生成中…",
    aiSummaryTitle: "AI議事録", aiSummaryNote: "（AI自動生成 · 参考用、医療スタッフの確認が必要）",
    secSummary: "要約", secDecisions: "決定事項", secNextSteps: "次のステップ", secConcerns: "患者の懸念",
    toastNewConsultCreated: "相談予約を作成しました",
  },
};

export default function ConsultationsPage() {
  const router = useRouter();
  const toast = useToast();
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const fmt = (tpl, vals) => Object.entries(vals).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  const locale = LOCALE_MAP[lang] || "en-US";

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming"); // upcoming, active, completed, all
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // AI 회의록 생성 상태: { [consultationId]: { loading, data, error } }
  const [summaryState, setSummaryState] = useState({});

  // Fetch consultations
  useEffect(() => {
    fetchConsultations();
  }, [filter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error(tt("errAuth"));
        return;
      }

      let url = "/api/khidi/consultation?limit=100";

      if (filter !== "all") {
        url += `&status=${filter === "upcoming" ? "scheduled" : filter}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.ok) {
        setConsultations(result.data || []);
      } else {
        toast.error(fmt(tt("errLoadFailedTpl"), { msg: result.error }));
      }
    } catch (error) {
      console.error("[ConsultationsPage] fetchConsultations error:", error);
      toast.error(tt("errLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 상담 링크(초대 토큰 포함) 1개 발급 → API 응답 반환. 링크 하나로 입장 + 환자 공유 통일.
  const issueInvite = async (consultationId) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast.error(tt("errAuthSimple"));
      return null;
    }
    try {
      const res = await fetch(
        `/api/khidi/consultation/${consultationId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            // 「통합 참여 링크」 하나로 통일 (role='guest', PO 2026-07-23 — 역할별 권한 차이 없음).
            // 언어 기본값은 guest 를 환자와 같게 봐서 그대로 유지된다.
            role: "guest",
            expiresInHours: 72,
            // 회수 제한 없음(만료 전까지 무제한) — 끊김·새로고침·재입장이 잦은 실환경에서
            // "1회 쓰면 링크 죽음"이 진짜 문제였다(PO 2026-07-15). 안전선은 72h 만료.
            maxUses: 0,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(fmt(tt("errInviteFailedTpl"), { msg: result.error }));
        return null;
      }
      return result;
    } catch (err) {
      console.error("[issueInvite] error:", err);
      toast.error(tt("errInviteFailed"));
      return null;
    }
  };

  // 상담 시작 = 링크 하나로 통일: 어드민도 이 초대 링크로 입장(로그인돼 있어 자동으로 staff 인식).
  //   주소창에 뜨는 게 곧 환자에게 그대로 보내면 되는 링크 → 편하게 클립보드에도 복사.
  const handleJoinConsultation = async (consultation) => {
    const result = await issueInvite(consultation.id);
    if (!result?.inviteUrl) {
      // ⚠️ 발급 실패 시 입장권 없는 맨주소로 조용히 입장하지 않는다 — 그 주소창을 복사해 공유하면
      //   받는 사람 전원이 "입장권 없음"에 막힘(2026-07-02 '남들만 안 됨' 함정, POSTMORTEMS #61 연관).
      toast.error(tt("errJoinBlocked"));
      return;
    }
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success(tt("toastLinkCopiedJoin"));
    } catch { /* 클립보드 권한 없으면 조용히 패스 — 입장은 계속 */ }
    router.push(result.inviteUrl.replace(/^https?:\/\/[^/]+/, ""));
  };

  // 링크만 복사(입장 없이 환자에게 먼저 보낼 때) — 위와 같은 종류의 링크.
  const handleIssueInvite = async (consultation) => {
    const result = await issueInvite(consultation.id);
    if (!result?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success(
        result.emailSent
          ? tt("toastLinkCopiedAndEmailed")
          : fmt(tt("toastLinkCopiedExpiresTpl"), { date: new Date(result.expiresAt).toLocaleString(locale) })
      );
    } catch {
      // 클립보드 권한 없으면 prompt 로
      prompt(tt("promptCopyLink"), result.inviteUrl);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm(tt("confirmCancel"))) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error(tt("errAuthReLogin"));
        return;
      }

      // 실제 취소: 상담 상태를 cancelled 로 PATCH (서버가 게스트 초대 토큰도 폐기함).
      // (과거엔 API 호출 없이 토스트만 띄우는 '가짜 성공'이라 실제론 취소 안 됨 — POSTMORTEMS #58)
      const res = await fetch(`/api/khidi/consultation/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(fmt(tt("errCancelFailedTpl"), { msg: result.error || res.statusText }));
        return;
      }

      toast.success(tt("toastCancelled"));
      setConsultations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c))
      );
    } catch (error) {
      console.error("[ConsultationsPage] handleCancel error:", error);
      toast.error(tt("errCancelFailed"));
    }
  };

  // 상담 완료 처리 — status=completed 로 PATCH (KHIDI K-02 사전상담·K-04 사후관리 실적 집계).
  //   방의 '통화 나가기'는 상태를 안 바꾸므로(재입장 회귀 방지), 완료 기록은 여기 staff 액션이 유일한 경로.
  //   서버가 completed 시 게스트 초대 토큰도 폐기하고 case_status 를 전진시킴.
  const handleComplete = async (id) => {
    if (!confirm(tt("confirmComplete"))) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error(tt("errAuthReLogin"));
        return;
      }
      const res = await fetch(`/api/khidi/consultation/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed", ended_at: new Date().toISOString() }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(fmt(tt("errCompleteFailedTpl"), { msg: result.error || res.statusText }));
        return;
      }
      toast.success(tt("toastCompleted"));
      setConsultations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, status: "completed" } : c))
      );
    } catch (error) {
      console.error("[ConsultationsPage] handleComplete error:", error);
      toast.error(tt("errCompleteFailed"));
    }
  };

  const handleGenerateSummary = async (consultation) => {
    const id = consultation.id;
    setSummaryState((s) => ({ ...s, [id]: { loading: true } }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(
        `/api/khidi/consultation/${id}/summarize`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const msg =
          json.error === "billing_required"
            ? tt("errBillingRequired")
            : json.error === "no_transcript"
            ? tt("errNoTranscript")
            : json.error === "ai_failed" || json.error === "ai_parse_failed"
            ? tt("errAiFailed")
            : tt("errSummaryFailed");
        setSummaryState((s) => ({ ...s, [id]: { error: msg } }));
        toast.error(msg);
        return;
      }
      setSummaryState((s) => ({ ...s, [id]: { data: json.data } }));
      setConsultations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, ai_summary: json.data } : c))
      );
      toast.success(tt("toastSummaryDone"));
    } catch (error) {
      console.error("[ConsultationsPage] handleGenerateSummary error:", error);
      setSummaryState((s) => ({ ...s, [id]: { error: tt("errSummaryFailed") } }));
      toast.error(tt("errSummaryFailed"));
    }
  };

  const sessionTypeLabel = {
    pre_consultation: tt("sessionTypePre"),
    follow_up: tt("sessionTypeFollow"),
    emergency: tt("sessionTypeEmergency"),
    // partner_meeting = 에이전시·병원 미팅(KHIDI 지표 제외).
    // diagnostic 은 DB CHECK 가 안 받던 죽은 값이라 제거(2026-07-27).
    partner_meeting: tt("sessionTypePartner"),
  };

  const statusLabel = {
    scheduled: tt("statusScheduled"),
    active: tt("statusActive"),
    completed: tt("statusCompleted"),
    cancelled: tt("statusCancelled"),
    no_show: tt("statusNoShow"),
  };

  const statusColor = {
    scheduled: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-yellow-100 text-yellow-800",
  };

  const filteredConsultations = consultations.filter((c) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return c.status === "scheduled";
    return c.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tt("pageTitle")}</h1>
          <p className="text-gray-500 mt-2">
            {tt("pageDesc")}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-teal-700 text-white rounded-lg font-semibold shadow-md hover:bg-teal-800 active:scale-[0.98] transition"
        >
          <Plus size={18} />
          {tt("btnNewConsult")}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "upcoming", label: tt("statusScheduled") },
          { key: "active", label: tt("statusActive") },
          { key: "completed", label: tt("statusCompleted") },
          { key: "all", label: tt("tabAll") },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              filter === tab.key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{tt("loadingText")}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredConsultations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-600 font-semibold">{tt("emptyHeading")}</p>
          <p className="text-gray-500 text-sm mt-1">
            {filter === "upcoming" && tt("emptyUpcoming")}
            {filter === "active" && tt("emptyActive")}
            {filter === "completed" && tt("emptyCompleted")}
            {filter === "all" && tt("emptyAll")}
          </p>
        </div>
      )}

      {/* Consultations list */}
      {!loading && filteredConsultations.length > 0 && (
        <div className="space-y-4">
          {filteredConsultations.map((consultation) => (
            <div
              key={consultation.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {/* Summary row */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition"
                onClick={() =>
                  setExpandedId(
                    expandedId === consultation.id ? null : consultation.id
                  )
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {consultation.cancer_patient_intakes?.[0]?.first_name ||
                            "Patient"}{" "}
                          - {consultation.cancer_patient_intakes?.[0]?.cancer_type || "N/A"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {sessionTypeLabel[consultation.session_type] || consultation.session_type}
                        </p>
                        {/* 병원 / 의사 배지 */}
                        {(consultation.hospitals?.name ||
                          consultation.partner_doctors?.name_ko ||
                          consultation.partner_doctors?.name_en) && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {consultation.hospitals?.name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200">
                                🏥 {consultation.hospitals.name}
                              </span>
                            )}
                            {(consultation.partner_doctors?.name_ko ||
                              consultation.partner_doctors?.name_en) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                👨‍⚕️ Dr. {consultation.partner_doctors.name_ko || consultation.partner_doctors.name_en}
                                {consultation.partner_doctors.subspecialty && (
                                  <span className="text-amber-600">
                                    · {consultation.partner_doctors.subspecialty}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          statusColor[consultation.status] || "bg-gray-100"
                        }`}
                      >
                        {statusLabel[consultation.status] || consultation.status}
                      </span>
                    </div>

                    {/* Key info grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>
                          {kstDate(consultation.scheduled_at, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        <span>
                          {kstTime(consultation.scheduled_at, locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe size={16} />
                        <span>
                          {consultation.patient_language.toUpperCase()} ↔{" "}
                          {consultation.doctor_language.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={16} />
                        {/* 2026-08-03 자가감사: 여기만 「Stage: III」 날코드로 남아 있었다.
                            병기 라벨은 사전 한 곳(코디 콘텐츠 편집기에서 수정 가능)으로 모은다. */}
                        <span>
                          {stageLabel(
                            consultation.cancer_patient_intakes?.[0]?.cancer_stage,
                            lang
                          ) || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <ChevronDown
                      size={24}
                      className={`text-gray-500 transition ${
                        expandedId === consultation.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === consultation.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
                  {/* Doctor info */}
                  {consultation.doctor_id && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <Stethoscope size={20} className="text-teal-700 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {tt("lblDoctor")}
                        </p>
                        <p className="text-sm text-gray-600">
                          {consultation.doctor_id}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coordinator info */}
                  {consultation.coordinator_id && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <User size={20} className="text-teal-700 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {tt("lblCoordinator")}
                        </p>
                        <p className="text-sm text-gray-600">
                          {consultation.coordinator_id}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Room info */}
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                    <AlertCircle size={20} className="text-gray-500 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {tt("lblRoomInfo")}
                      </p>
                      <p className="text-xs text-gray-600 font-mono mt-1">
                        {consultation.livekit_room_name}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {consultation.notes && (
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        {tt("lblNotes")}
                      </p>
                      <p className="text-sm text-gray-600">
                        {consultation.notes}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-4 flex-wrap">
                    {consultation.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          {tt("btnJoin")}
                        </button>
                        <button
                          onClick={() => handleIssueInvite(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium flex items-center justify-center gap-2"
                          title={tt("titleCopyLink")}
                        >
                          {tt("btnCopyLink")}
                        </button>
                        <button
                          onClick={() => handleComplete(consultation.id)}
                          className="px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition font-medium flex items-center gap-1.5"
                          title={tt("titleCompleteAction")}
                        >
                          <CheckCircle size={16} /> {tt("btnCompleteAction")}
                        </button>
                        <button
                          onClick={() => handleCancel(consultation.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center gap-1.5"
                          title={tt("titleCancelAction")}
                        >
                          <X size={16} /> {tt("btnCancelAction")}
                        </button>
                      </>
                    )}
                    {consultation.status === "active" && (
                      <>
                        <button
                          onClick={() => handleJoinConsultation(consultation)}
                          className="flex-1 min-w-[140px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          {tt("btnRejoin")}
                        </button>
                        <button
                          onClick={() => handleComplete(consultation.id)}
                          className="px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition font-medium flex items-center gap-1.5"
                          title={tt("titleCompleteAction")}
                        >
                          <CheckCircle size={16} /> {tt("btnCompleteAction")}
                        </button>
                      </>
                    )}
                    {consultation.status === "completed" && (
                      <>
                        <span className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium flex items-center">
                          {tt("completedBadge")}
                        </span>
                        <button
                          onClick={() => handleGenerateSummary(consultation)}
                          disabled={summaryState[consultation.id]?.loading}
                          className="flex-1 min-w-[160px] px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {summaryState[consultation.id]?.loading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              {tt("summaryGenerating")}
                            </>
                          ) : (
                            <>
                              <FileText size={16} />
                              {consultation.ai_summary
                                ? tt("btnRegenSummary")
                                : tt("btnGenSummary")}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* AI 회의록 결과 */}
                  {(() => {
                    const ai =
                      summaryState[consultation.id]?.data ||
                      consultation.ai_summary;
                    if (!ai) return null;
                    const section = (title, items) =>
                      Array.isArray(items) && items.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {title}
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {items.map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null;
                    return (
                      <div className="p-4 bg-white rounded-lg border border-teal-200">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={16} className="text-teal-700" />
                          <p className="text-sm font-semibold text-gray-900">
                            {tt("aiSummaryTitle")}
                          </p>
                          <span className="text-xs text-gray-500">
                            {tt("aiSummaryNote")}
                          </span>
                        </div>
                        {section(tt("secSummary"), ai.summary)}
                        {section(tt("secDecisions"), ai.decisions)}
                        {section(tt("secNextSteps"), ai.next_steps)}
                        {section(tt("secConcerns"), ai.patient_concerns)}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 새 상담 예약 모달 */}
      {showCreateModal && (
        <CreateConsultationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchConsultations();
            toast.success(tt("toastNewConsultCreated"));
          }}
        />
      )}
    </div>
  );
}
