"use client";

/**
 * 코디네이터 포털 전용 다국어 사전 (6개 언어: ko·en·ru·kz·zh·ja).
 *
 * 왜 별도 파일인가: 공개 사이트용 거대 사전(i18n/index.js, 400KB+)에 섞지 않고
 * 백오피스 문자열은 포털별로 분리한다(에이전시 포털 PartnerPortal.jsx의 로컬 TR 패턴과 동일 취지).
 * 코디는 페이지가 16개라 공용어(nav·상태·버튼)를 많이 공유 → 파일마다 TR을 복붙하는 대신
 * 이 공유 모듈 1개를 useCoordinatorL() 훅으로 가져다 쓴다.
 *
 * 구조(key-first): CT[key] = { ko, en, ru, kz, zh, ja }. 키 하나 추가 = 한 블록만 추가하면
 * 6개 언어가 같이 붙는다(언어별로 6군데 흩어지지 않게 — 사전이 커져도 유지보수 쉬움).
 * caseStatus.ts / medicalLabels.ts 의 라벨 맵과 같은 모양.
 *
 * 언어 전환: 포털 상단바 언어 스위처(ClientShell PortalLangSwitcher)가 쿠키를 바꾸고
 * healo:langchange 이벤트를 쏘면 useLang()이 즉시 리렌더 → 이 훅도 새 언어로 갱신된다.
 * 누락 안전장치: 특정 언어에 값이 없으면 en → ko 순으로 폴백해 빈 화면이 안 나온다.
 */

import { useLang } from "./LangContext";

const CT = {
  // ── 레이아웃 / 내비게이션 ─────────────────────────────
  brandRole: { ko: "코디네이터", en: "Coordinator", ru: "Координатор", kz: "Үйлестіруші", zh: "协调员", ja: "コーディネーター" },
  navDashboard: { ko: "대시보드", en: "Dashboard", ru: "Панель", kz: "Басқару тақтасы", zh: "仪表盘", ja: "ダッシュボード" },
  navInbox: { ko: "문의함", en: "Inbox", ru: "Входящие", kz: "Кіріс жәшігі", zh: "收件箱", ja: "受信箱" },
  navChat: { ko: "AI 상담 리드", en: "AI chat leads", ru: "AI-лиды чата", kz: "AI чат лидтері", zh: "AI 咨询线索", ja: "AIチャットリード" },
  navCases: { ko: "의뢰·케이스/병원배정", en: "Cases / Hospital assignment", ru: "Кейсы / Назначение больницы", kz: "Кейстер / Аурухана тағайындау", zh: "病例 / 医院分配", ja: "ケース / 病院割当" },
  navConsultations: { ko: "상담 일정", en: "Consultation schedule", ru: "Расписание консультаций", kz: "Консультация кестесі", zh: "咨询日程", ja: "相談スケジュール" },
  navPartners: { ko: "파트너 발굴", en: "Partner outreach", ru: "Поиск партнёров", kz: "Серіктес іздеу", zh: "合作伙伴开发", ja: "パートナー開拓" },
  navIntakes: { ko: "인테이크 관리", en: "Intake management", ru: "Управление заявками", kz: "Өтінімдерді басқару", zh: "接诊管理", ja: "インテーク管理" },
  navMessages: { ko: "메시지", en: "Messages", ru: "Сообщения", kz: "Хабарлар", zh: "消息", ja: "メッセージ" },
  navVisa: { ko: "비자 트래킹", en: "Visa tracking", ru: "Отслеживание виз", kz: "Виза мониторингі", zh: "签证跟踪", ja: "ビザ管理" },
  navCostEstimates: { ko: "견적", en: "Quotes", ru: "Сметы", kz: "Смета", zh: "报价", ja: "見積もり" },
  navAlerts: { ko: "증상 알림", en: "Symptom alerts", ru: "Оповещения о симптомах", kz: "Симптом ескертулері", zh: "症状提醒", ja: "症状アラート" },
  changePassword: { ko: "비밀번호 변경", en: "Change password", ru: "Сменить пароль", kz: "Құпиясөзді өзгерту", zh: "修改密码", ja: "パスワード変更" },
  logout: { ko: "로그아웃", en: "Log out", ru: "Выйти", kz: "Шығу", zh: "退出", ja: "ログアウト" },

  // ── 공용 (여러 페이지 공유) ─────────────────────────────
  all: { ko: "전체", en: "All", ru: "Все", kz: "Барлығы", zh: "全部", ja: "すべて" },
  status: { ko: "상태", en: "Status", ru: "Статус", kz: "Күйі", zh: "状态", ja: "ステータス" },
  refresh: { ko: "새로 고침", en: "Refresh", ru: "Обновить", kz: "Жаңарту", zh: "刷新", ja: "更新" },
  name: { ko: "이름", en: "Name", ru: "Имя", kz: "Аты", zh: "姓名", ja: "氏名" },
  nationality: { ko: "국적", en: "Nationality", ru: "Гражданство", kz: "Азаматтығы", zh: "国籍", ja: "国籍" },
  cancerType: { ko: "암종", en: "Cancer type", ru: "Тип рака", kz: "Обыр түрі", zh: "癌种", ja: "がん種" },
  contactMethod: { ko: "연락방법", en: "Contact method", ru: "Способ связи", kz: "Байланыс тәсілі", zh: "联系方式", ja: "連絡方法" },
  receivedDate: { ko: "접수일", en: "Received", ru: "Дата заявки", kz: "Қабылданған күні", zh: "接收日期", ja: "受付日" },
  viewAll: { ko: "전체 보기", en: "View all", ru: "Показать все", kz: "Барлығын көру", zh: "查看全部", ja: "すべて表示" },

  // ── 대시보드 ─────────────────────────────
  dashTitle: { ko: "코디네이터 대시보드", en: "Coordinator dashboard", ru: "Панель координатора", kz: "Үйлестіруші тақтасы", zh: "协调员仪表盘", ja: "コーディネーターダッシュボード" },
  dashSubtitle: { ko: "환자 인테이크 접수, 의사 배정, 상담 스케줄링을 관리합니다.", en: "Manage patient intake, doctor assignment, and consultation scheduling.", ru: "Управление приёмом пациентов, назначением врачей и планированием консультаций.", kz: "Пациенттерді қабылдау, дәрігерді тағайындау және консультация кестесін басқарыңыз.", zh: "管理患者接诊、医生分配和咨询排期。", ja: "患者インテーク、医師の割り当て、相談スケジュールを管理します。" },
  statPendingIntakes: { ko: "대기 인테이크", en: "Pending intakes", ru: "Ожидающие заявки", kz: "Күтудегі өтінімдер", zh: "待处理接诊", ja: "保留中のインテーク" },
  statTodayConsult: { ko: "오늘 상담", en: "Today's consultations", ru: "Консультации сегодня", kz: "Бүгінгі консультациялар", zh: "今日咨询", ja: "本日の相談" },
  statActivePatients: { ko: "활성 환자", en: "Active patients", ru: "Активные пациенты", kz: "Белсенді пациенттер", zh: "活跃患者", ja: "アクティブ患者" },
  statUrgentAlerts: { ko: "긴급 알림", en: "Urgent alerts", ru: "Срочные оповещения", kz: "Шұғыл ескертулер", zh: "紧急提醒", ja: "緊急アラート" },
  upcomingConsult: { ko: "예정 상담", en: "Upcoming consultations", ru: "Предстоящие консультации", kz: "Алдағы консультациялар", zh: "即将进行的咨询", ja: "予定の相談" },
  noUpcoming: { ko: "예정된 상담이 없습니다", en: "No upcoming consultations", ru: "Нет предстоящих консультаций", kz: "Алдағы консультациялар жоқ", zh: "暂无即将进行的咨询", ja: "予定の相談はありません" },
  sessionPre: { ko: "사전상담", en: "Pre-consultation", ru: "Предварительная консультация", kz: "Алдын ала консультация", zh: "预咨询", ja: "事前相談" },
  sessionFollow: { ko: "추후진료", en: "Follow-up", ru: "Повторный приём", kz: "Қайта қабылдау", zh: "复诊", ja: "フォローアップ" },
  sessionEmergency: { ko: "긴급상담", en: "Emergency consultation", ru: "Экстренная консультация", kz: "Шұғыл консультация", zh: "紧急咨询", ja: "緊急相談" },
  sessionGeneric: { ko: "상담", en: "Consultation", ru: "Консультация", kz: "Консультация", zh: "咨询", ja: "相談" },
  qaIntakeTitle: { ko: "인테이크 접수", en: "Receive intake", ru: "Приём заявок", kz: "Өтінім қабылдау", zh: "接收接诊", ja: "インテーク受付" },
  qaIntakeDesc: { ko: "새 환자 접수 확인 및 의사 배정", en: "Review new patient intakes and assign a doctor", ru: "Проверка новых заявок и назначение врача", kz: "Жаңа өтінімдерді тексеру және дәрігер тағайындау", zh: "确认新患者接诊并分配医生", ja: "新規患者の受付確認と医師の割り当て" },
  qaSchedTitle: { ko: "상담 스케줄링", en: "Consultation scheduling", ru: "Планирование консультаций", kz: "Консультацияны жоспарлау", zh: "咨询排期", ja: "相談スケジューリング" },
  qaSchedDesc: { ko: "화상 상담 일정 관리", en: "Manage video consultation schedules", ru: "Управление расписанием видеоконсультаций", kz: "Бейнеконсультация кестесін басқару", zh: "管理视频咨询日程", ja: "ビデオ相談スケジュールの管理" },
  qaAlertDesc: { ko: "고위험 증상 보고 확인", en: "Review high-risk symptom reports", ru: "Проверка отчётов о симптомах высокого риска", kz: "Жоғары қауіпті симптом есептерін тексеру", zh: "查看高危症状报告", ja: "高リスク症状レポートの確認" },

  // ── 인박스 (신규 상담) ─────────────────────────────
  inboxTitle: { ko: "신규 상담 인박스", en: "New consultation inbox", ru: "Входящие новых консультаций", kz: "Жаңа консультация кіріс жәшігі", zh: "新咨询收件箱", ja: "新規相談の受信箱" },
  inboxSubtitle: { ko: "접수된 모든 상담 문의 목록입니다 (퍼널·메신저·에이전시 포함).", en: "All received consultation inquiries (funnel, messenger, and agency).", ru: "Все полученные заявки на консультацию (воронка, мессенджеры, агентства).", kz: "Барлық қабылданған консультация сұраныстары (воронка, мессенджер, агенттіктер).", zh: "所有已接收的咨询请求（漏斗、即时通讯、代理机构）。", ja: "受け付けたすべての相談問い合わせ（ファネル・メッセンジャー・代理店を含む）。" },
  inboxFilterNeedInfo: { ko: "추가 정보 필요", en: "Needs more info", ru: "Нужна доп. информация", kz: "Қосымша ақпарат қажет", zh: "需补充信息", ja: "追加情報が必要" },
  inboxFilterReady: { ko: "매칭 준비 완료", en: "Ready to match", ru: "Готово к подбору", kz: "Сәйкестендіруге дайын", zh: "可匹配", ja: "マッチング準備完了" },
  inboxEmpty: { ko: "해당 조건의 상담이 없습니다.", en: "No consultations match this filter.", ru: "Нет консультаций по этому фильтру.", kz: "Бұл сүзгіге сәйкес консультация жоқ.", zh: "没有符合此筛选条件的咨询。", ja: "この条件に該当する相談はありません。" },
  inboxColStep: { ko: "Step 완료", en: "Step done", ru: "Этап", kz: "Кезең", zh: "步骤完成", ja: "ステップ完了" },
  inboxColMatch: { ko: "매칭 정확도", en: "Match accuracy", ru: "Точность подбора", kz: "Сәйкестік дәлдігі", zh: "匹配准确度", ja: "マッチング精度" },
  inboxStepOneOnly: { ko: "Step 1만", en: "Step 1 only", ru: "Только этап 1", kz: "Тек 1-кезең", zh: "仅步骤 1", ja: "ステップ1のみ" },
  badgeAgency: { ko: "에이전시", en: "Agency", ru: "Агентство", kz: "Агенттік", zh: "代理机构", ja: "代理店" },
  agencyReferral: { ko: "에이전시 의뢰", en: "Agency referral", ru: "Направление от агентства", kz: "Агенттік жолдамасы", zh: "代理机构转介", ja: "代理店からの紹介" },
  invStatusReceived: { ko: "접수됨", en: "Received", ru: "Получено", kz: "Қабылданды", zh: "已接收", ja: "受付済み" },
  invStatusReviewing: { ko: "검토 중", en: "Reviewing", ru: "На рассмотрении", kz: "Қаралуда", zh: "审核中", ja: "確認中" },
  invStatusMatched: { ko: "매칭됨", en: "Matched", ru: "Подобрано", kz: "Сәйкестендірілді", zh: "已匹配", ja: "マッチ済み" },
  invStatusCompleted: { ko: "완료", en: "Completed", ru: "Завершено", kz: "Аяқталды", zh: "已完成", ja: "完了" },
};

// 현재 언어(lang)로 CT 전체를 평탄화 — L.key 로 바로 문자열이 나오게. 누락은 en→ko 폴백.
function flatten(lang) {
  const out = {};
  for (const key in CT) {
    const row = CT[key];
    out[key] = row[lang] || row.en || row.ko || key;
  }
  return out;
}

/**
 * 코디 포털 컴포넌트에서 현재 언어의 문구 묶음을 가져온다.
 * 사용: const L = useCoordinatorL();  →  L.navDashboard
 */
export function useCoordinatorL() {
  return flatten(useLang());
}

// 훅을 못 쓰는 곳(예: 유틸)에서 언어 코드로 직접 뽑을 때.
export function coordinatorL(lang) {
  return flatten(lang);
}

// 날짜/시간 toLocaleString용 BCP47 로케일 — 앱 언어코드를 매핑.
// (ko-KR 하드코딩 시 러시아어 화면에도 한국식 표기가 새어나오는 걸 방지)
const LOCALE_MAP = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };
export function dateLocale(lang) {
  return LOCALE_MAP[lang] || "en-US";
}
export function useDateLocale() {
  return dateLocale(useLang());
}

export default CT;
