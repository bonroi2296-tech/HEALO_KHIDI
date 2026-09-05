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

import { useSyncExternalStore, useMemo, useEffect } from "react";
import { getBackofficeLangFromCookie, setBackofficeLangCookie } from "./index";

const CT = {
  // ── 레이아웃 / 내비게이션 ─────────────────────────────
  brandRole: { ko: "코디네이터", en: "Coordinator", ru: "Координатор", kz: "Үйлестіруші", zh: "协调员", ja: "コーディネーター" },
  // 관리자 계정이 코디 화면을 열었을 때의 이름표. 화면은 코디 것이지만 «지금 나는 관리자»라는 걸
  // 같이 보여준다 — 안 그러면 어드민으로 로그인했는데 「코디네이터」라고만 떠서 계정이 바뀐 줄 안다
  // (2026-08-25 PO 지적: «지금 계정은 어드민으로 들어간거 같은데 왜 코디네이터라고 표시되어 있냐?»).
  brandRoleAdminView: { ko: "관리자 · 코디 화면", en: "Admin · coordinator view", ru: "Админ · экран координатора", kz: "Әкімші · үйлестіруші экраны", zh: "管理员 · 协调员画面", ja: "管理者 · コーディネーター画面" },
  backToAdmin: { ko: "어드민 화면으로", en: "Back to admin", ru: "К админ-панели", kz: "Әкімші экранына", zh: "返回管理员画面", ja: "管理者画面へ" },
  navDashboard: { ko: "대시보드", en: "Dashboard", ru: "Панель", kz: "Басқару тақтасы", zh: "仪表盘", ja: "ダッシュボード" },
  navVoice: { ko: "음성 정리", en: "Voice notes", ru: "Голосовые заметки", kz: "Дауыстық жазбалар", zh: "语音整理", ja: "音声整理" },
  navInbox: { ko: "문의함", en: "Inbox", ru: "Входящие", kz: "Кіріс жәшігі", zh: "收件箱", ja: "受信箱" },
  navChat: { ko: "AI 상담 리드", en: "AI chat leads", ru: "AI-лиды чата", kz: "AI чат лидтері", zh: "AI 咨询线索", ja: "AIチャットリード" },
  navCases: { ko: "의뢰·케이스/병원배정", en: "Cases / Hospital assignment", ru: "Кейсы / Назначение больницы", kz: "Кейстер / Аурухана тағайындау", zh: "病例 / 医院分配", ja: "ケース / 病院割当" },
  navConsultations: { ko: "상담 일정", en: "Consultation schedule", ru: "Расписание консультаций", kz: "Консультация кестесі", zh: "咨询日程", ja: "相談スケジュール" },
  navConversion: { ko: "유치 전환", en: "Conversion", ru: "Конверсия", kz: "Тарту конверсиясы", zh: "招引转化", ja: "誘致コンバージョン" },
  navSatisfaction: { ko: "사후관리·만족도", en: "Follow-up & satisfaction", ru: "Сопровождение и удовлетворённость", kz: "Кейінгі бақылау және қанағаттану", zh: "随访与满意度", ja: "フォローアップと満足度" },
  navPartners: { ko: "파트너 발굴", en: "Partner outreach", ru: "Поиск партнёров", kz: "Серіктес іздеу", zh: "合作伙伴开发", ja: "パートナー開拓" },
  navIntakes: { ko: "인테이크 관리", en: "Intake management", ru: "Управление заявками", kz: "Өтінімдерді басқару", zh: "接诊管理", ja: "インテーク管理" },
  navMessages: { ko: "메시지", en: "Messages", ru: "Сообщения", kz: "Хабарлар", zh: "消息", ja: "メッセージ" },
  navVisa: { ko: "비자 트래킹", en: "Visa tracking", ru: "Отслеживание виз", kz: "Виза мониторингі", zh: "签证跟踪", ja: "ビザ管理" },
  navCostEstimates: { ko: "견적", en: "Quotes", ru: "Сметы", kz: "Смета", zh: "报价", ja: "見積もり" },
  navAlerts: { ko: "증상 알림", en: "Symptom alerts", ru: "Оповещения о симптомах", kz: "Симптом ескертулері", zh: "症状提醒", ja: "症状アラート" },
  // 왼쪽 메뉴에서 이 한 칸만 사전에 없어 러시아어 화면에도 한국어로 남아 있었다(2026-07-29 실측).
  navContent: { ko: "콘텐츠 편집", en: "Content editing", ru: "Редактирование контента", kz: "Мазмұнды өңдеу", zh: "内容编辑", ja: "コンテンツ編集" },
  navSettings: { ko: "설정", en: "Settings", ru: "Настройки", kz: "Параметрлер", zh: "设置", ja: "設定" },
  navRequests: { ko: "개선 요청함", en: "Improvement requests", ru: "Заявки на улучшение", kz: "Жақсарту өтінімдері", zh: "改进请求", ja: "改善リクエスト" },

  // 개선 요청함 (2026-08-04 PO 제안) — 쓰다가 불편한 걸 그 자리에서 한 줄 적어두는 칸.
  reqTitle: { ko: "개선 요청함", en: "Improvement requests", ru: "Заявки на улучшение", kz: "Жақсарту өтінімдері", zh: "改进请求", ja: "改善リクエスト" },
  reqLead: { ko: "쓰다가 불편한 점이 있으면 여기에 적어 주세요. 확인하고 고칩니다.", en: "Notice something awkward while working? Write it here. We will check and fix it.", ru: "Заметили неудобство в работе? Напишите здесь — мы проверим и исправим.", kz: "Жұмыс кезінде ыңғайсыз нәрсе байқасаңыз, осында жазыңыз. Тексеріп, түзетеміз.", zh: "使用中遇到不便，请写在这里。我们会确认并修复。", ja: "使っていて不便な点があればここに書いてください。確認して直します。" },
  reqPlaceholder: { ko: "예) 문의함에서 표가 잘려서 연락처가 안 보여요", en: "e.g. In the inbox the table is cut off and I cannot see the contact", ru: "напр. Во «Входящих» таблица обрезана, не видно контакт", kz: "мыс. Кіріс жәшігінде кесте қиылып, байланыс көрінбейді", zh: "例如：收件箱表格被截断，看不到联系方式", ja: "例）受信箱で表が切れて連絡先が見えません" },
  reqSubmit: { ko: "보내기", en: "Send", ru: "Отправить", kz: "Жіберу", zh: "发送", ja: "送信" },
  reqSending: { ko: "보내는 중…", en: "Sending…", ru: "Отправка…", kz: "Жіберілуде…", zh: "发送中…", ja: "送信中…" },
  reqSent: { ko: "보냈습니다. 확인하고 고치겠습니다.", en: "Sent. We will check and fix it.", ru: "Отправлено. Мы проверим и исправим.", kz: "Жіберілді. Тексеріп, түзетеміз.", zh: "已发送。我们会确认并修复。", ja: "送信しました。確認して直します。" },
  reqFailed: { ko: "보내지 못했습니다. 잠시 후 다시 시도해 주세요.", en: "Could not send. Please try again shortly.", ru: "Не удалось отправить. Повторите попытку позже.", kz: "Жіберу мүмкін болмады. Сәл кейін қайталаңыз.", zh: "发送失败，请稍后重试。", ja: "送信できませんでした。しばらくしてからもう一度お試しください。" },
  reqEmpty: { ko: "아직 적힌 것이 없습니다.", en: "Nothing here yet.", ru: "Пока ничего нет.", kz: "Әзірге ештеңе жоқ.", zh: "目前还没有内容。", ja: "まだ何もありません。" },
  reqOn: { ko: "화면", en: "Screen", ru: "Экран", kz: "Экран", zh: "画面", ja: "画面" },
  reqReply: { ko: "답", en: "Reply", ru: "Ответ", kz: "Жауап", zh: "回复", ja: "返信" },
  reqStatusOpen: { ko: "열림", en: "Open", ru: "Открыто", kz: "Ашық", zh: "待处理", ja: "未対応" },
  reqStatusDoing: { ko: "하는 중", en: "In progress", ru: "В работе", kz: "Орындалуда", zh: "处理中", ja: "対応中" },
  reqStatusDone: { ko: "완료", en: "Done", ru: "Готово", kz: "Дайын", zh: "已完成", ja: "完了" },
  reqStatusParked: { ko: "보류", en: "Parked", ru: "Отложено", kz: "Кейінге қалдырылды", zh: "暂缓", ja: "保留" },
  changePassword: { ko: "비밀번호 변경", en: "Change password", ru: "Сменить пароль", kz: "Құпиясөзді өзгерту", zh: "修改密码", ja: "パスワード変更" },
  logout: { ko: "로그아웃", en: "Log out", ru: "Выйти", kz: "Шығу", zh: "退出", ja: "ログアウト" },

  // ── 공용 (여러 페이지 공유) ─────────────────────────────
  all: { ko: "전체", en: "All", ru: "Все", kz: "Барлығы", zh: "全部", ja: "すべて" },
  status: { ko: "상태", en: "Status", ru: "Статус", kz: "Күйі", zh: "状态", ja: "ステータス" },
  refresh: { ko: "새로 고침", en: "Refresh", ru: "Обновить", kz: "Жаңарту", zh: "刷新", ja: "更新" },
  name: { ko: "이름", en: "Name", ru: "Имя", kz: "Аты", zh: "姓名", ja: "氏名" },
  nationality: { ko: "국적", en: "Nationality", ru: "Гражданство", kz: "Азаматтығы", zh: "国籍", ja: "国籍" },
  cancerType: { ko: "암종", en: "Cancer type", ru: "Тип рака", kz: "Обыр түрі", zh: "癌种", ja: "がん種" },
  ibIcdCode: { ko: "진단코드", en: "Diagnosis code", ru: "Код диагноза", kz: "Диагноз коды", zh: "诊断代码", ja: "診断コード" },
  ibIcdSuggest: { ko: "추천", en: "Suggested", ru: "Рекомендуется", kz: "Ұсынылады", zh: "推荐", ja: "推奨" },
  ibIcdSave: { ko: "코드 저장", en: "Save code", ru: "Сохранить код", kz: "Кодты сақтау", zh: "保存代码", ja: "コードを保存" },
  ibIcdNote: { ko: "부위 분류이며 확정 진단이 아니다", en: "Site classification, not a confirmed diagnosis", ru: "Классификация по локализации, не подтверждённый диагноз", kz: "Орналасу бойынша жіктеу, расталған диагноз емес", zh: "为部位分类，非确诊结果", ja: "部位分類であり確定診断ではありません" },
  contactMethod: { ko: "연락방법", en: "Contact method", ru: "Способ связи", kz: "Байланыс тәсілі", zh: "联系方式", ja: "連絡方法" },
  receivedDate: { ko: "접수일", en: "Received", ru: "Дата заявки", kz: "Қабылданған күні", zh: "接收日期", ja: "受付日" },
  viewAll: { ko: "전체 보기", en: "View all", ru: "Показать все", kz: "Барлығын көру", zh: "查看全部", ja: "すべて表示" },

  // ── 대시보드 ─────────────────────────────
  dashTitle: { ko: "코디네이터 대시보드", en: "Coordinator dashboard", ru: "Панель координатора", kz: "Үйлестіруші тақтасы", zh: "协调员仪表盘", ja: "コーディネーターダッシュボード" },
  dashSubtitle: { ko: "환자 인테이크 접수, 의사 배정, 상담 스케줄링을 관리합니다.", en: "Manage patient intake, doctor assignment, and consultation scheduling.", ru: "Управление приёмом пациентов, назначением врачей и планированием консультаций.", kz: "Пациенттерді қабылдау, дәрігерді тағайындау және консультация кестесін басқарыңыз.", zh: "管理患者接诊、医生分配和咨询排期。", ja: "患者インテーク、医師の割り当て、相談スケジュールを管理します。" },
  statPendingIntakes: { ko: "대기 문의", en: "Pending inquiries", ru: "Ожидающие запросы", kz: "Күтудегі сұраныстар", zh: "待处理咨询", ja: "保留中の問い合わせ" },
  statTodayConsult: { ko: "오늘 상담", en: "Today's consultations", ru: "Консультации сегодня", kz: "Бүгінгі консультациялар", zh: "今日咨询", ja: "本日の相談" },
  statActivePatients: { ko: "예정 상담", en: "Upcoming consultations", ru: "Предстоящие консультации", kz: "Алдағы консультациялар", zh: "预定咨询", ja: "予定の相談" },
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
  inboxDelayedDays: { ko: "{n}일째 정체", en: "Stalled {n}d", ru: "Застой {n} дн.", kz: "{n} күн тоқтап тұр", zh: "已停滞 {n} 天", ja: "{n}日間停滞" },
  // 환자가 진행상황 링크로 남긴 글을 직원이 아직 안 열어봤을 때(2026-09-05: 이게 안 떠서 이틀 방치).
  inboxFilterPatientUnread: { ko: "환자 새 글", en: "New from patient", ru: "Новое от пациента", kz: "Пациенттен жаңа хабар", zh: "患者新留言", ja: "患者から新着" },
  inboxPatientUnreadToday: { ko: "환자 새 글 · 오늘", en: "New from patient · today", ru: "Новое от пациента · сегодня", kz: "Пациенттен жаңа хабар · бүгін", zh: "患者新留言 · 今天", ja: "患者から新着 · 今日" },
  inboxPatientUnreadDays: { ko: "환자 새 글 · {n}일째 안 읽음", en: "New from patient · unread {n}d", ru: "Новое от пациента · не прочитано {n} дн.", kz: "Пациенттен жаңа хабар · {n} күн оқылмаған", zh: "患者新留言 · {n} 天未读", ja: "患者から新着 · {n}日間未読" },
  badgeAgency: { ko: "에이전시", en: "Agency", ru: "Агентство", kz: "Агенттік", zh: "代理机构", ja: "代理店" },
  agencyReferral: { ko: "에이전시 의뢰", en: "Agency referral", ru: "Направление от агентства", kz: "Агенттік жолдамасы", zh: "代理机构转介", ja: "代理店からの紹介" },
  invStatusReceived: { ko: "접수됨", en: "Received", ru: "Получено", kz: "Қабылданды", zh: "已接收", ja: "受付済み" },
  invStatusReviewing: { ko: "검토 중", en: "Reviewing", ru: "На рассмотрении", kz: "Қаралуда", zh: "审核中", ja: "確認中" },
  invStatusMatched: { ko: "매칭됨", en: "Matched", ru: "Подобрано", kz: "Сәйкестендірілді", zh: "已匹配", ja: "マッチ済み" },
  invStatusCompleted: { ko: "완료", en: "Completed", ru: "Завершено", kz: "Аяқталды", zh: "已完成", ja: "完了" },

  // ── 공용 (추가) ─────────────────────────────
  notes: { ko: "메모", en: "Notes", ru: "Заметки", kz: "Ескертпе", zh: "备注", ja: "メモ" },
  viewDetail: { ko: "상세 보기", en: "View details", ru: "Подробнее", kz: "Толығырақ", zh: "查看详情", ja: "詳細を見る" },
  processing: { ko: "처리 중...", en: "Processing…", ru: "Обработка…", kz: "Өңделуде…", zh: "处理中…", ja: "処理中…" },
  fieldStage: { ko: "병기", en: "Stage", ru: "Стадия", kz: "Сатысы", zh: "分期", ja: "病期" },
  fieldLanguage: { ko: "언어", en: "Language", ru: "Язык", kz: "Тіл", zh: "语言", ja: "言語" },

  // ── 인테이크 관리 ─────────────────────────────
  intakesSubtitle: { ko: "카자흐스탄 암환자 사전상담 접수를 검토하고 의사를 배정합니다.", en: "Review pre-consultation intakes from Kazakhstan cancer patients and assign a doctor.", ru: "Проверяйте заявки на предварительную консультацию от онкопациентов из Казахстана и назначайте врача.", kz: "Қазақстандық онкологиялық пациенттердің алдын ала консультация өтінімдерін қарап, дәрігер тағайындаңыз.", zh: "审核来自哈萨克斯坦癌症患者的预咨询接诊并分配医生。", ja: "カザフスタンのがん患者からの事前相談インテークを確認し、医師を割り当てます。" },
  intakeFilterUnassigned: { ko: "의사 미배정", en: "Doctor unassigned", ru: "Врач не назначен", kz: "Дәрігер тағайындалмаған", zh: "未分配医生", ja: "医師未割当" },
  intakeFilterAssigned: { ko: "배정 완료", en: "Assigned", ru: "Назначено", kz: "Тағайындалды", zh: "已分配", ja: "割当済み" },
  intakeEmpty: { ko: "해당 조건의 인테이크가 없습니다", en: "No intakes match this filter", ru: "Нет заявок по этому фильтру", kz: "Бұл сүзгіге сәйкес өтінім жоқ", zh: "没有符合此筛选条件的接诊", ja: "この条件に該当するインテークはありません" },
  badgeAssigned: { ko: "배정완료", en: "Assigned", ru: "Назначено", kz: "Тағайындалды", zh: "已分配", ja: "割当済み" },
  badgePending: { ko: "대기", en: "Pending", ru: "Ожидание", kz: "Күтуде", zh: "待处理", ja: "保留" },
  fieldConsultType: { ko: "상담 유형", en: "Consultation type", ru: "Тип консультации", kz: "Консультация түрі", zh: "咨询类型", ja: "相談タイプ" },
  assignDoctor: { ko: "의사 배정", en: "Assign doctor", ru: "Назначить врача", kz: "Дәрігер тағайындау", zh: "分配医生", ja: "医師を割り当て" },
  sessionDiagnostic: { ko: "검사결과 검토", en: "Test result review", ru: "Разбор результатов обследования", kz: "Тексеру нәтижелерін қарау", zh: "检查结果审查", ja: "検査結果レビュー" },
  unassigned: { ko: "미배정", en: "Unassigned", ru: "Не назначено", kz: "Тағайындалмаған", zh: "未分配", ja: "未割当" },

  // ── 상담 일정 관리 ─────────────────────────────
  consultTitle: { ko: "상담 일정 관리", en: "Consultation schedule", ru: "Управление расписанием консультаций", kz: "Консультация кестесін басқару", zh: "咨询日程管理", ja: "相談スケジュール管理" },
  consultSubtitle: { ko: "원격 화상 상담 스케줄링 및 진행 관리", en: "Schedule and manage remote video consultations", ru: "Планирование и ведение удалённых видеоконсультаций", kz: "Қашықтағы бейнеконсультацияларды жоспарлау және жүргізу", zh: "远程视频咨询的排期与进行管理", ja: "遠隔ビデオ相談のスケジュールと進行管理" },
  consultNew: { ko: "새 상담 생성", en: "New consultation", ru: "Новая консультация", kz: "Жаңа консультация", zh: "新建咨询", ja: "新規相談を作成" },
  cStatusScheduled: { ko: "예정", en: "Scheduled", ru: "Запланировано", kz: "Жоспарланған", zh: "已排期", ja: "予定" },
  // KHIDI 실적 집계 표시 (2026-07-29) — 「이 상담이 숫자에 잡히는지」를 코디가 화면에서 바로 알게.
  cCountedYes: { ko: "실적 집계됨", en: "Counted", ru: "Учтено", kz: "Есептелді", zh: "已计入", ja: "実績に計上" },
  cCountedNoLink: { ko: "문의 미연결 — 유치 추적 끊김", en: "No inquiry linked — attraction tracking broken", ru: "Заявка не привязана — цепочка привлечения прервана", kz: "Өтінім байланбаған — тарту тізбегі үзілген", zh: "未关联咨询 — 招引追踪中断", ja: "問い合わせ未連携 — 誘致追跡が切れます" },
  cCountedNotCounted: { ko: "완료 표시 안 함 — 실적 0", en: "Not marked complete — counts as zero", ru: "Нет отметки «завершено» — считается нулём", kz: "«Аяқталды» белгісі жоқ — нөл болып саналады", zh: "未标记完成 — 计为 0", ja: "「完了」未設定 — 実績は 0" },
  cUnclosedTitle: { ko: "지난 상담인데 「완료」를 안 눌렀습니다", en: "Past consultations still not marked complete", ru: "Прошедшие консультации без отметки «завершено»", kz: "Өткен кеңестер «аяқталды» деп белгіленбеген", zh: "已过期但未标记完成的会诊", ja: "終了予定を過ぎたのに「完了」が未設定です" },
  cLinkInquiryLabel: { ko: "문의 연결 (유치 전환 추적에 필요)", en: "Link an inquiry (needed for attraction tracking)", ru: "Привязать заявку (нужно для отслеживания привлечения)", kz: "Өтінім байланыстыру (тартуды бақылауға қажет)", zh: "关联咨询（招引追踪所需）", ja: "問い合わせを連携（誘致追跡に必要）" },
  cLinkInquiryPlaceholder: { ko: "— 문의 선택 —", en: "— Select inquiry —", ru: "— Выбрать заявку —", kz: "— Өтінім таңдау —", zh: "— 选择咨询 —", ja: "— 問い合わせを選択 —" },
  cLinkInquiryDone: { ko: "문의를 연결했습니다", en: "Inquiry linked", ru: "Заявка привязана", kz: "Өтінім байланыстырылды", zh: "已关联咨询", ja: "問い合わせを連携しました" },
  cLinkInquiryFail: { ko: "문의 연결 실패", en: "Failed to link inquiry", ru: "Не удалось привязать заявку", kz: "Өтінімді байланыстыру сәтсіз", zh: "关联咨询失败", ja: "問い合わせの連携に失敗しました" },
  cUnclosedBody: { ko: "완료로 바꿔야 KHIDI 실적(사전상담·사후관리)에 잡힙니다. 지금은 0 으로 셉니다.", en: "They only count toward KHIDI figures once marked complete. Right now they count as zero.", ru: "Они попадают в показатели KHIDI только после отметки «завершено». Сейчас считаются нулём.", kz: "KHIDI көрсеткіштеріне тек «аяқталды» белгісінен кейін кіреді. Қазір нөл болып саналады.", zh: "只有标记完成后才会计入 KHIDI 指标，目前计为 0。", ja: "「完了」にして初めて KHIDI 実績に計上されます。今は 0 として数えられます。" },
  cStatusActive: { ko: "진행 중", en: "In progress", ru: "В процессе", kz: "Жүріп жатыр", zh: "进行中", ja: "進行中" },
  cStatusCompleted: { ko: "완료", en: "Completed", ru: "Завершено", kz: "Аяқталды", zh: "已完成", ja: "完了" },
  cStatusCancelled: { ko: "취소", en: "Cancelled", ru: "Отменено", kz: "Болдырылмаған", zh: "已取消", ja: "キャンセル" },
  cStatusNoShow: { ko: "무응답", en: "No-show", ru: "Не явился", kz: "Келмеді", zh: "未出席", ja: "無応答" },
  consultEmpty: { ko: "해당 상태의 상담이 없습니다", en: "No consultations with this status", ru: "Нет консультаций с этим статусом", kz: "Бұл күйдегі консультация жоқ", zh: "没有该状态的咨询", ja: "このステータスの相談はありません" },
  fieldPatient: { ko: "환자", en: "Patient", ru: "Пациент", kz: "Пациент", zh: "患者", ja: "患者" },
  fieldCancerStage: { ko: "암종/병기", en: "Cancer / stage", ru: "Рак / стадия", kz: "Обыр / саты", zh: "癌种/分期", ja: "がん種/病期" },
  fieldDoctorAssign: { ko: "의사 배정", en: "Doctor assignment", ru: "Назначение врача", kz: "Дәрігер тағайындау", zh: "医生分配", ja: "医師の割り当て" },
  btnReenter: { ko: "상담 재진입", en: "Rejoin", ru: "Вернуться", kz: "Қайта кіру", zh: "重新进入", ja: "再入室" },
  btnStart: { ko: "상담 시작", en: "Start consultation", ru: "Начать консультацию", kz: "Консультацияны бастау", zh: "开始咨询", ja: "相談を開始" },
  btnCopyLink: { ko: "링크 복사", en: "Copy link", ru: "Копировать ссылку", kz: "Сілтемені көшіру", zh: "复制链接", ja: "リンクをコピー" },
  btnComplete: { ko: "상담 완료", en: "Complete", ru: "Завершить", kz: "Аяқтау", zh: "完成咨询", ja: "相談を完了" },
  ttStart: { ko: "이 링크로 내가 입장하고, 같은 링크가 복사됩니다 (복사해서 상대에게 전송)", en: "You join via this link, and the same link is copied (share it with the other party).", ru: "Вы входите по этой ссылке, и та же ссылка копируется (отправьте её собеседнику).", kz: "Осы сілтеме арқылы кіресіз, дәл сол сілтеме көшіріледі (қарсы тарапқа жіберіңіз).", zh: "您通过此链接进入，同一链接会被复制（复制后发送给对方）。", ja: "このリンクで入室し、同じリンクがコピーされます（相手に送ってください）。" },
  ttCopyLink: { ko: "입장 없이 링크만 복사(+등록 이메일 발송) — 「상담 시작」과 같은 링크", en: "Copy the link only (and email it) without joining — same link as \"Start consultation\".", ru: "Скопировать только ссылку (и отправить на email) без входа — та же ссылка, что и «Начать консультацию».", kz: "Кірмей тек сілтемені көшіру (+ email жіберу) — «Консультацияны бастау» сілтемесімен бірдей.", zh: "不进入，仅复制链接（并发送邮件）——与\"开始咨询\"相同的链接。", ja: "入室せずリンクだけコピー（＋メール送信）—「相談を開始」と同じリンク。" },
  ttComplete: { ko: "상담을 '완료'로 기록 (사전상담·사후관리 실적 집계) — 초대 링크도 폐기", en: "Mark the consultation as completed (counts toward pre-consultation / follow-up metrics) — the invite link is revoked.", ru: "Отметить консультацию завершённой (учитывается в показателях предконсультаций / наблюдения) — ссылка-приглашение аннулируется.", kz: "Консультацияны 'аяқталды' деп белгілеу (алдын ала консультация / бақылау көрсеткіштеріне есептеледі) — шақыру сілтемесі жойылады.", zh: "将咨询标记为\"已完成\"（计入预咨询/随访绩效）——邀请链接将作废。", ja: "相談を「完了」として記録（事前相談・フォローアップ実績に集計）—招待リンクは失効します。" },
  toastAuthErr: { ko: "인증 오류 — 다시 로그인해주세요", en: "Authentication error — please sign in again", ru: "Ошибка аутентификации — войдите снова", kz: "Аутентификация қатесі — қайта кіріңіз", zh: "认证错误——请重新登录", ja: "認証エラー — 再度ログインしてください" },
  toastLinkCreateFail: { ko: "상담 링크 생성 실패", en: "Failed to create consultation link", ru: "Не удалось создать ссылку на консультацию", kz: "Консультация сілтемесін жасау сәтсіз аяқталды", zh: "创建咨询链接失败", ja: "相談リンクの作成に失敗しました" },
  toastStartStopped: { ko: "상담 링크 발급이 안 돼 입장을 멈췄어요. 새로고침(또는 다시 로그인) 후 다시 눌러주세요.", en: "The consultation link couldn't be issued, so entry was stopped. Refresh (or sign in again) and try once more.", ru: "Ссылку на консультацию не удалось выдать, вход остановлен. Обновите страницу (или войдите снова) и повторите.", kz: "Консультация сілтемесі берілмегендіктен кіру тоқтатылды. Бетті жаңартып (немесе қайта кіріп) қайта басыңыз.", zh: "无法签发咨询链接，已停止进入。请刷新（或重新登录）后再试。", ja: "相談リンクを発行できず入室を中止しました。更新（または再ログイン）してもう一度押してください。" },
  toastStartCopied: { ko: "상담 링크를 복사했어요 — 상대에게 붙여넣어 보내세요. 나는 지금 입장합니다", en: "Copied the consultation link — paste and send it to the other party. Joining now.", ru: "Ссылка на консультацию скопирована — вставьте и отправьте её собеседнику. Вхожу.", kz: "Консультация сілтемесі көшірілді — қарсы тарапқа қойып жіберіңіз. Мен қазір кіремін.", zh: "已复制咨询链接——粘贴发送给对方。我现在进入。", ja: "相談リンクをコピーしました — 相手に貼り付けて送ってください。私は今入室します。" },
  confirmComplete: { ko: "이 상담을 '완료' 처리할까요?\n완료하면 발송된 초대 링크가 폐기되어 재입장할 수 없습니다.", en: "Mark this consultation as completed?\nOnce completed, the sent invite link is revoked and cannot be used to rejoin.", ru: "Отметить эту консультацию как завершённую?\nПосле завершения отправленная ссылка-приглашение аннулируется, и повторный вход невозможен.", kz: "Осы консультацияны 'аяқталды' деп белгілейсіз бе?\nАяқталғаннан кейін жіберілген шақыру сілтемесі жойылып, қайта кіру мүмкін болмайды.", zh: "将此咨询标记为\"已完成\"？\n完成后已发送的邀请链接将作废，无法再次进入。", ja: "この相談を「完了」にしますか？\n完了すると送信済みの招待リンクが失効し、再入室できなくなります。" },
  toastCompleteFail: { ko: "완료 처리 실패", en: "Failed to complete", ru: "Не удалось завершить", kz: "Аяқтау сәтсіз", zh: "完成处理失败", ja: "完了処理に失敗しました" },
  toastCompleted: { ko: "상담을 완료 처리했어요. (사전상담·사후관리 실적에 집계됩니다)", en: "Consultation marked as completed. (Counted toward pre-consultation / follow-up metrics.)", ru: "Консультация завершена. (Учтено в показателях предконсультаций / наблюдения.)", kz: "Консультация аяқталды деп белгіленді. (Алдын ала консультация / бақылау көрсеткіштеріне есептелді.)", zh: "已将咨询标记为完成。（已计入预咨询/随访绩效。）", ja: "相談を完了にしました。（事前相談・フォローアップ実績に集計されます。）" },
  toastCopiedEmailed: { ko: "상담 링크를 복사했고, 등록된 이메일로도 발송했습니다", en: "Copied the consultation link and also sent it to the registered email", ru: "Ссылка на консультацию скопирована и отправлена на зарегистрированный email", kz: "Консультация сілтемесі көшіріліп, тіркелген email-ге де жіберілді", zh: "已复制咨询链接，并已发送至注册邮箱", ja: "相談リンクをコピーし、登録済みのメールにも送信しました" },
  toastCopiedExpiry: { ko: "상담 링크가 클립보드에 복사됐습니다 (만료: {time})", en: "Consultation link copied to clipboard (expires: {time})", ru: "Ссылка на консультацию скопирована в буфер обмена (истекает: {time})", kz: "Консультация сілтемесі алмасу буферіне көшірілді (мерзімі: {time})", zh: "咨询链接已复制到剪贴板（过期时间：{time}）", ja: "相談リンクをクリップボードにコピーしました（有効期限：{time}）" },
  promptCopyShare: { ko: "아래 링크를 복사해 공유하세요:", en: "Copy the link below and share it:", ru: "Скопируйте ссылку ниже и поделитесь ею:", kz: "Төмендегі сілтемені көшіріп бөлісіңіз:", zh: "请复制下方链接并分享：", ja: "下のリンクをコピーして共有してください:" },
  toastCreated: { ko: "상담 예약이 생성되었습니다", en: "Consultation booking created", ru: "Запись на консультацию создана", kz: "Консультация жазбасы жасалды", zh: "已创建咨询预约", ja: "相談予約が作成されました" },

  // ── 증상 알림 (alerts) ─────────────────────────────
  alTitle: { ko: "증상 이상치 알림", en: "Symptom anomaly alerts", ru: "Оповещения об аномальных симптомах", kz: "Симптом ауытқулары туралы ескертулер", zh: "症状异常提醒", ja: "症状異常アラート" },
  alSubtitle: { ko: "환자 증상 이상치를 AI·규칙으로 자동 감지한 결과입니다.", en: "Patient symptom anomalies detected automatically by AI and rules.", ru: "Аномалии симптомов пациентов, автоматически обнаруженные ИИ и правилами.", kz: "AI мен ережелер арқылы автоматты түрде анықталған пациент симптомдарының ауытқулары.", zh: "由 AI 和规则自动检测出的患者症状异常结果。", ja: "AIとルールで自動検知した患者の症状異常の結果です。" },
  alNoticeLabel: { ko: "안내:", en: "Note:", ru: "Примечание:", kz: "Ескерту:", zh: "说明：", ja: "案内：" },
  alDisclaimer: { ko: "이 화면의 감지 결과는 의학적 진단이 아닙니다. 코디네이터가 직접 환자 상태를 확인하고 필요 시 의료진에게 연결하세요.", en: "The detection results on this screen are not a medical diagnosis. Coordinators should check the patient's condition directly and connect them to medical staff if needed.", ru: "Результаты обнаружения на этом экране не являются медицинским диагнозом. Координатор должен лично проверить состояние пациента и при необходимости связать его с медперсоналом.", kz: "Осы экрандағы анықтау нәтижелері медициналық диагноз емес. Үйлестіруші пациенттің жағдайын өзі тексеріп, қажет болса медицина қызметкерлеріне жалғауы тиіс.", zh: "本页面的检测结果并非医学诊断。协调员应亲自确认患者状态，必要时联系医护人员。", ja: "この画面の検知結果は医学的診断ではありません。コーディネーターが患者の状態を直接確認し、必要に応じて医療スタッフにつないでください。" },
  alAllSeverities: { ko: "모든 심각도", en: "All severities", ru: "Все уровни", kz: "Барлық деңгейлер", zh: "所有严重程度", ja: "すべての重大度" },
  alSeverityCritical: { ko: "긴급", en: "Critical", ru: "Критично", kz: "Шұғыл", zh: "紧急", ja: "緊急" },
  alSeverityHigh: { ko: "높음", en: "High", ru: "Высокий", kz: "Жоғары", zh: "高", ja: "高" },
  alSeverityMedium: { ko: "보통", en: "Medium", ru: "Средний", kz: "Орташа", zh: "中", ja: "中" },
  alSeverityLow: { ko: "낮음", en: "Low", ru: "Низкий", kz: "Төмен", zh: "低", ja: "低" },
  alTypeFeverHigh: { ko: "고열 감지", en: "High fever detected", ru: "Обнаружена высокая температура", kz: "Жоғары қызу анықталды", zh: "检测到高烧", ja: "高熱を検知" },
  alTypePainCritical: { ko: "통증 위험", en: "Critical pain", ru: "Критическая боль", kz: "Қауіпті ауырсыну", zh: "疼痛危险", ja: "痛みの危険" },
  alTypeSilenceLong: { ko: "장기 무입력", en: "Long silence", ru: "Долгое молчание", kz: "Ұзақ енгізілмеу", zh: "长期无输入", ja: "長期未入力" },
  alTypeSymptomWorsening: { ko: "증상 급악화", en: "Rapid worsening", ru: "Резкое ухудшение", kz: "Күрт нашарлау", zh: "症状急剧恶化", ja: "症状の急悪化" },
  alTypeAiRisk: { ko: "AI 위험 감지", en: "AI risk detected", ru: "ИИ обнаружил риск", kz: "AI қауіп анықтады", zh: "AI 检测到风险", ja: "AIがリスクを検知" },
  alFilterUnacknowledged: { ko: "미확인", en: "Unacknowledged", ru: "Непросмотренные", kz: "Расталмаған", zh: "未确认", ja: "未確認" },
  alFilterUnresolved: { ko: "미해결", en: "Unresolved", ru: "Нерешённые", kz: "Шешілмеген", zh: "未解决", ja: "未解決" },
  alEmptyTitle: { ko: "해당 조건의 알림이 없습니다", en: "No alerts match this filter", ru: "Нет оповещений по этому фильтру", kz: "Бұл сүзгіге сәйкес ескерту жоқ", zh: "没有符合此筛选条件的提醒", ja: "この条件に該当するアラートはありません" },
  alEmptyDesc: { ko: "모든 환자 상태가 양호합니다.", en: "All patients are in good condition.", ru: "Все пациенты в хорошем состоянии.", kz: "Барлық пациенттердің жағдайы жақсы.", zh: "所有患者状态良好。", ja: "すべての患者の状態は良好です。" },
  alBadgeResolved: { ko: "해결됨", en: "Resolved", ru: "Решено", kz: "Шешілді", zh: "已解决", ja: "解決済み" },
  alBadgeAcknowledged: { ko: "확인됨", en: "Acknowledged", ru: "Просмотрено", kz: "Расталды", zh: "已确认", ja: "確認済み" },
  alPatient: { ko: "환자", en: "Patient", ru: "Пациент", kz: "Пациент", zh: "患者", ja: "患者" },
  alInquiry: { ko: "문의", en: "Inquiry", ru: "Заявка", kz: "Сұраныс", zh: "咨询", ja: "問い合わせ" },
  alUnknown: { ko: "미상", en: "Unknown", ru: "Неизвестно", kz: "Белгісіз", zh: "未知", ja: "不明" },
  alDetectedByRule: { ko: "규칙", en: "Rule", ru: "Правило", kz: "Ереже", zh: "规则", ja: "ルール" },
  alTemperature: { ko: "체온", en: "Temp", ru: "Температура", kz: "Дене қызуы", zh: "体温", ja: "体温" },
  alPain: { ko: "통증", en: "Pain", ru: "Боль", kz: "Ауырсыну", zh: "疼痛", ja: "痛み" },
  alSilenceDays: { ko: "{days}일 무입력", en: "{days} days of silence", ru: "{days} дн. без активности", kz: "{days} күн енгізілмеді", zh: "{days} 天无输入", ja: "{days}日間 未入力" },
  alPainRise: { ko: "통증 +{delta}점 상승", en: "Pain up +{delta} pts", ru: "Боль +{delta} балла", kz: "Ауырсыну +{delta} ұпайға өсті", zh: "疼痛上升 +{delta} 分", ja: "痛みが+{delta}点 上昇" },
  alAcknowledge: { ko: "확인", en: "Acknowledge", ru: "Просмотрено", kz: "Растау", zh: "确认", ja: "確認" },
  alResolve: { ko: "해결", en: "Resolve", ru: "Решить", kz: "Шешу", zh: "解决", ja: "解決" },
  alDetectionData: { ko: "감지 데이터", en: "Detection data", ru: "Данные обнаружения", kz: "Анықтау деректері", zh: "检测数据", ja: "検知データ" },
  alAcknowledgedAt: { ko: "확인", en: "Acknowledged", ru: "Просмотрено", kz: "Расталды", zh: "确认", ja: "確認" },
  alResolutionNote: { ko: "해결 메모", en: "Resolution note", ru: "Заметка о решении", kz: "Шешім ескертпесі", zh: "解决备注", ja: "解決メモ" },
  alResolvedAt: { ko: "해결", en: "Resolved", ru: "Решено", kz: "Шешілді", zh: "解决", ja: "解決" },
  alResolveModalTitle: { ko: "알림 해결 처리", en: "Resolve alert", ru: "Закрыть оповещение", kz: "Ескертуді шешу", zh: "处理提醒解决", ja: "アラートを解決" },
  alResolveModalDesc: { ko: "환자 상태 확인 후 조치 내용을 기록하세요. (선택사항)", en: "Record the action taken after checking the patient's condition. (Optional)", ru: "Запишите принятые меры после проверки состояния пациента. (Необязательно)", kz: "Пациенттің жағдайын тексергеннен кейін қабылданған шараны жазыңыз. (Міндетті емес)", zh: "确认患者状态后记录处理内容。（可选）", ja: "患者の状態を確認後、対応内容を記録してください。（任意）" },
  alResolvePlaceholder: { ko: "예: 환자에게 연락하여 확인. 현재 안정 상태. 주치의에게 보고 완료.", en: "e.g. Contacted and checked the patient. Currently stable. Reported to the attending doctor.", ru: "напр.: Связались с пациентом и проверили. Состояние стабильное. Доложено лечащему врачу.", kz: "мыс.: Пациентпен байланысып тексерілді. Қазір тұрақты. Емдеуші дәрігерге хабарланды.", zh: "例如：已联系患者并确认。目前状态稳定。已向主治医生报告。", ja: "例：患者に連絡し確認。現在は安定。主治医へ報告済み。" },
  alResolveConfirm: { ko: "해결 완료", en: "Mark resolved", ru: "Отметить решённым", kz: "Шешілді деп белгілеу", zh: "标记为已解决", ja: "解決完了" },
  alCancel: { ko: "취소", en: "Cancel", ru: "Отмена", kz: "Болдырмау", zh: "取消", ja: "キャンセル" },
  alFooterDisclaimer: { ko: "감지 결과는 참고용입니다. 실제 의료적 판단은 반드시 면허 보유 의료 전문가가 수행해야 합니다.", en: "Detection results are for reference only. Actual medical decisions must be made by a licensed medical professional.", ru: "Результаты обнаружения носят справочный характер. Медицинские решения должен принимать только лицензированный медицинский специалист.", kz: "Анықтау нәтижелері тек анықтама үшін. Нақты медициналық шешімді тек лицензиясы бар медицина маманы қабылдауы тиіс.", zh: "检测结果仅供参考。实际的医疗判断必须由持证医疗专业人员做出。", ja: "検知結果は参考用です。実際の医療判断は必ず有資格の医療専門家が行ってください。" },

  // ── 비자 트래킹 (visa) ─────────────────────────────
  viTitle: { ko: "비자 트래킹 대시보드", en: "Visa tracking dashboard", ru: "Панель отслеживания виз", kz: "Виза мониторингі тақтасы", zh: "签证跟踪仪表盘", ja: "ビザ管理ダッシュボード" },
  viSubtitle: { ko: "환자 비자 발급 신청을 단계별로 관리하고 초청장을 발급합니다.", en: "Track patient visa applications by stage and issue invitation letters.", ru: "Управляйте заявками пациентов на визу по этапам и выдавайте приглашения.", kz: "Пациенттердің виза өтінімдерін кезеңдер бойынша басқарып, шақыру хаттарын беріңіз.", zh: "按阶段管理患者签证申请并签发邀请函。", ja: "患者のビザ申請を段階ごとに管理し、招待状を発行します。" },
  viStatusDraft: { ko: "작성 중", en: "Draft", ru: "Черновик", kz: "Жоба", zh: "草稿", ja: "作成中" },
  viStatusDocsPending: { ko: "서류 준비", en: "Documents pending", ru: "Ожидание документов", kz: "Құжаттар дайындалуда", zh: "待备材料", ja: "書類準備中" },
  viStatusUnderReview: { ko: "검수 중", en: "Under review", ru: "На проверке", kz: "Тексерілуде", zh: "审核中", ja: "審査中" },
  viStatusChangesRequested: { ko: "수정 요청", en: "Changes requested", ru: "Запрошены изменения", kz: "Түзету сұралды", zh: "已要求修改", ja: "修正依頼" },
  viStatusInvitationReady: { ko: "초청장 준비", en: "Invitation ready", ru: "Приглашение готово", kz: "Шақыру дайын", zh: "邀请函待发", ja: "招待状準備完了" },
  viStatusInvitationIssued: { ko: "초청장 발급", en: "Invitation issued", ru: "Приглашение выдано", kz: "Шақыру берілді", zh: "邀请函已发", ja: "招待状発行済み" },
  viStatusSubmittedEmbassy: { ko: "대사관 접수", en: "Submitted to embassy", ru: "Подано в посольство", kz: "Елшілікке тапсырылды", zh: "已递交使馆", ja: "大使館提出済み" },
  viStatusApproved: { ko: "비자 승인", en: "Visa approved", ru: "Виза одобрена", kz: "Виза мақұлданды", zh: "签证已批准", ja: "ビザ承認" },
  viStatusRejected: { ko: "거절", en: "Rejected", ru: "Отклонено", kz: "Қабылданбады", zh: "已拒签", ja: "却下" },
  viStatusCancelled: { ko: "취소", en: "Cancelled", ru: "Отменено", kz: "Болдырылмады", zh: "已取消", ja: "キャンセル" },
  viReviewPending: { ko: "대기", en: "Pending", ru: "Ожидание", kz: "Күтуде", zh: "待处理", ja: "保留" },
  viReviewApproved: { ko: "승인", en: "Approved", ru: "Одобрено", kz: "Мақұлданды", zh: "已通过", ja: "承認" },
  viReviewRejected: { ko: "반려", en: "Rejected", ru: "Отклонено", kz: "Қайтарылды", zh: "已退回", ja: "差戻し" },
  viReviewNeedsRevision: { ko: "수정 요청", en: "Needs revision", ru: "Требует правки", kz: "Түзету қажет", zh: "需修改", ja: "修正必要" },
  viColType: { ko: "비자 종류", en: "Visa type", ru: "Тип визы", kz: "Виза түрі", zh: "签证类型", ja: "ビザ種類" },
  viColPurpose: { ko: "목적", en: "Purpose", ru: "Цель", kz: "Мақсаты", zh: "目的", ja: "目的" },
  viColStay: { ko: "체류", en: "Stay", ru: "Пребывание", kz: "Болу мерзімі", zh: "停留", ja: "滞在" },
  viColCreated: { ko: "생성", en: "Created", ru: "Создано", kz: "Жасалды", zh: "创建", ja: "作成" },
  viDurationDays: { ko: "{n}일", en: "{n} days", ru: "{n} дн.", kz: "{n} күн", zh: "{n}天", ja: "{n}日" },
  viDetailArrow: { ko: "상세 →", en: "Details →", ru: "Подробнее →", kz: "Толығырақ →", zh: "详情 →", ja: "詳細 →" },
  viEmpty: { ko: "진행 중인 비자 신청이 없습니다.", en: "No visa applications in progress.", ru: "Нет активных заявок на визу.", kz: "Жүріп жатқан виза өтінімдері жоқ.", zh: "没有进行中的签证申请。", ja: "進行中のビザ申請はありません。" },
  viEmptyFiltered: { ko: "{status} 상태의 신청이 없습니다.", en: "No applications with status \"{status}\".", ru: "Нет заявок со статусом «{status}».", kz: "\"{status}\" күйіндегі өтінімдер жоқ.", zh: "没有\"{status}\"状态的申请。", ja: "「{status}」状態の申請はありません。" },
  viLoadListError: { ko: "목록을 불러오지 못했습니다.", en: "Failed to load the list.", ru: "Не удалось загрузить список.", kz: "Тізімді жүктеу мүмкін болмады.", zh: "无法加载列表。", ja: "一覧を読み込めませんでした。" },
  viErrorPrefix: { ko: "오류", en: "Error", ru: "Ошибка", kz: "Қате", zh: "错误", ja: "エラー" },
  viLoadDetailError: { ko: "신청 정보를 불러오지 못했습니다.", en: "Failed to load application details.", ru: "Не удалось загрузить данные заявки.", kz: "Өтінім деректерін жүктеу мүмкін болмады.", zh: "无法加载申请信息。", ja: "申請情報を読み込めませんでした。" },
  viBackShort: { ko: "← 목록", en: "← List", ru: "← Список", kz: "← Тізім", zh: "← 列表", ja: "← 一覧" },
  viBackToList: { ko: "← 비자 목록", en: "← Visa list", ru: "← Список виз", kz: "← Виза тізімі", zh: "← 签证列表", ja: "← ビザ一覧" },
  viPatientId: { ko: "환자 ID", en: "Patient ID", ru: "ID пациента", kz: "Пациент ID", zh: "患者 ID", ja: "患者 ID" },
  viCreatedLabel: { ko: "생성", en: "Created", ru: "Создано", kz: "Жасалды", zh: "创建", ja: "作成" },
  viCurrentLabel: { ko: "현재", en: "Current", ru: "Текущий", kz: "Ағымдағы", zh: "当前", ja: "現在" },
  viStatusChangeTitle: { ko: "상태 변경", en: "Change status", ru: "Изменить статус", kz: "Күйін өзгерту", zh: "变更状态", ja: "ステータス変更" },
  viPromptStatusChange: { ko: "\"{status}\" 로 상태 변경. 메모(선택):", en: "Change status to \"{status}\". Note (optional):", ru: "Изменить статус на «{status}». Заметка (необязательно):", kz: "Күйді \"{status}\" етіп өзгерту. Ескертпе (қаласаңыз):", zh: "将状态变更为\"{status}\"。备注（可选）：", ja: "ステータスを「{status}」に変更。メモ（任意）:" },
  viStatusChangeFail: { ko: "상태 변경 실패", en: "Failed to change status", ru: "Не удалось изменить статус", kz: "Күйді өзгерту сәтсіз аяқталды", zh: "状态变更失败", ja: "ステータス変更に失敗しました" },
  viPromptReviewReason: { ko: "사유(환자에게 보일 메모):", en: "Reason (note shown to the patient):", ru: "Причина (заметка для пациента):", kz: "Себебі (пациентке көрінетін ескертпе):", zh: "原因（将向患者显示的备注）：", ja: "理由（患者に表示されるメモ）:" },
  viReviewFail: { ko: "검수 실패", en: "Review failed", ru: "Проверка не удалась", kz: "Тексеру сәтсіз аяқталды", zh: "审核失败", ja: "検査に失敗しました" },
  viNotesSaved: { ko: "메모 저장됨", en: "Note saved", ru: "Заметка сохранена", kz: "Ескертпе сақталды", zh: "备注已保存", ja: "メモを保存しました" },
  viNotesSaveFail: { ko: "저장 실패", en: "Failed to save", ru: "Не удалось сохранить", kz: "Сақтау сәтсіз аяқталды", zh: "保存失败", ja: "保存に失敗しました" },
  viConfirmIssue: { ko: "초청장을 발급하시겠습니까? PDF 가 생성되고 상태가 '초청장 발급' 로 변경됩니다.", en: "Issue the invitation letter? A PDF will be generated and the status changes to \"Invitation issued\".", ru: "Выдать пригласительное письмо? Будет создан PDF, а статус изменится на «Приглашение выдано».", kz: "Шақыру хатын бересіз бе? PDF жасалып, күй \"Шақыру берілді\" болып өзгереді.", zh: "签发邀请函？将生成 PDF，状态变更为\"邀请函已发\"。", ja: "招待状を発行しますか？PDFが生成され、ステータスが「招待状発行済み」に変わります。" },
  viIssueDone: { ko: "초청장 발급 완료", en: "Invitation letter issued", ru: "Пригласительное письмо выдано", kz: "Шақыру хаты берілді", zh: "邀请函已签发", ja: "招待状を発行しました" },
  viIssueFail: { ko: "발급 실패", en: "Failed to issue", ru: "Не удалось выдать", kz: "Беру сәтсіз аяқталды", zh: "签发失败", ja: "発行に失敗しました" },
  viInvitationTitle: { ko: "초청장 (Invitation Letter)", en: "Invitation Letter", ru: "Пригласительное письмо (Invitation Letter)", kz: "Шақыру хаты (Invitation Letter)", zh: "邀请函 (Invitation Letter)", ja: "招待状 (Invitation Letter)" },
  viInvitationDesc: { ko: "서류 검수 완료 후 초청장 PDF 를 자동 발급합니다. 발급되면 환자에게 즉시 노출됩니다.", en: "After document review is complete, the invitation PDF is issued automatically. Once issued, it is shown to the patient immediately.", ru: "После проверки документов PDF-приглашение выдаётся автоматически. После выдачи оно сразу отображается пациенту.", kz: "Құжаттар тексерілгеннен кейін шақыру PDF-і автоматты түрде беріледі. Берілген соң пациентке бірден көрінеді.", zh: "文件审核完成后将自动签发邀请函 PDF。签发后立即向患者显示。", ja: "書類審査の完了後、招待状PDFを自動発行します。発行されると患者にすぐ表示されます。" },
  viIssuedDoneLabel: { ko: "발급 완료", en: "Issued", ru: "Выдано", kz: "Берілді", zh: "已签发", ja: "発行完了" },
  viPdfDownload: { ko: "PDF 다운로드", en: "Download PDF", ru: "Скачать PDF", kz: "PDF жүктеу", zh: "下载 PDF", ja: "PDFダウンロード" },
  viIssueDisabledHint: { ko: "현재 상태({status})에서는 발급 불가", en: "Cannot issue in the current status ({status})", ru: "Нельзя выдать в текущем статусе ({status})", kz: "Ағымдағы күйде ({status}) беру мүмкін емес", zh: "当前状态（{status}）无法签发", ja: "現在の状態（{status}）では発行できません" },
  viIssuing: { ko: "발급 중...", en: "Issuing…", ru: "Выдача…", kz: "Берілуде…", zh: "签发中…", ja: "発行中…" },
  viIssueBtn: { ko: "초청장 발급", en: "Issue invitation", ru: "Выдать приглашение", kz: "Шақыру беру", zh: "签发邀请函", ja: "招待状を発行" },
  viNotesTitle: { ko: "코디 메모 (환자에게도 표시됨)", en: "Coordinator note (also shown to the patient)", ru: "Заметка координатора (видна пациенту)", kz: "Үйлестіруші ескертпесі (пациентке де көрінеді)", zh: "协调员备注（也会显示给患者）", ja: "コーディネーターメモ（患者にも表示）" },
  viNotesPlaceholder: { ko: "환자에게 전달할 메모 (서류 수정 사항, 일정 공유 등)", en: "Note to pass on to the patient (document fixes, schedule sharing, etc.)", ru: "Заметка для пациента (правки документов, расписание и т. д.)", kz: "Пациентке жеткізілетін ескертпе (құжат түзетулері, кесте, т.б.)", zh: "转达给患者的备注（材料修改、日程共享等）", ja: "患者に伝えるメモ（書類の修正、日程共有など）" },
  viNotesSaving: { ko: "저장 중...", en: "Saving…", ru: "Сохранение…", kz: "Сақталуда…", zh: "保存中…", ja: "保存中…" },
  viNotesSaveBtn: { ko: "메모 저장", en: "Save note", ru: "Сохранить заметку", kz: "Ескертпені сақтау", zh: "保存备注", ja: "メモを保存" },
  viDocsTitle: { ko: "제출 서류 ({n}건)", en: "Submitted documents ({n})", ru: "Поданные документы ({n})", kz: "Тапсырылған құжаттар ({n})", zh: "已提交材料（{n}件）", ja: "提出書類（{n}件）" },
  viDocsEmpty: { ko: "제출된 서류 없음", en: "No documents submitted", ru: "Документы не поданы", kz: "Тапсырылған құжат жоқ", zh: "无已提交材料", ja: "提出書類なし" },
  viReviewNoteLabel: { ko: "메모", en: "Note", ru: "Заметка", kz: "Ескертпе", zh: "备注", ja: "メモ" },
  viDocView: { ko: "보기", en: "View", ru: "Открыть", kz: "Қарау", zh: "查看", ja: "表示" },
  viDocApprove: { ko: "승인", en: "Approve", ru: "Одобрить", kz: "Мақұлдау", zh: "通过", ja: "承認" },
  viDocRequestRevision: { ko: "수정요청", en: "Request revision", ru: "Запросить правку", kz: "Түзету сұрау", zh: "要求修改", ja: "修正依頼" },
  viDocReject: { ko: "반려", en: "Reject", ru: "Отклонить", kz: "Қайтару", zh: "退回", ja: "差戻し" },

  // ── 메시지 (messages) ─────────────────────────────
  msStatusOpen: { ko: "신규", en: "New", ru: "Новое", kz: "Жаңа", zh: "新", ja: "新規" },
  msStatusWaitingCoord: { ko: "응답 필요", en: "Needs reply", ru: "Требует ответа", kz: "Жауап қажет", zh: "需回复", ja: "要返信" },
  msStatusWaitingPatient: { ko: "환자 응답 대기", en: "Awaiting patient", ru: "Ожидание пациента", kz: "Пациентті күтуде", zh: "等待患者回复", ja: "患者の返信待ち" },
  msStatusResolved: { ko: "완료", en: "Resolved", ru: "Завершено", kz: "Аяқталды", zh: "已完成", ja: "完了" },
  msChannelLabel: { ko: "채널", en: "Channel", ru: "Канал", kz: "Арна", zh: "渠道", ja: "チャネル" },
  msChannelWeb: { ko: "웹", en: "Web", ru: "Веб", kz: "Веб", zh: "网页", ja: "ウェブ" },
  msChannelEmail: { ko: "이메일", en: "Email", ru: "Эл. почта", kz: "Email", zh: "邮件", ja: "メール" },
  msChannelKakao: { ko: "카카오", en: "KakaoTalk", ru: "KakaoTalk", kz: "KakaoTalk", zh: "KakaoTalk", ja: "カカオトーク" },
  msChannelAgency: { ko: "에이전시", en: "Agency", ru: "Агентство", kz: "Агенттік", zh: "代理机构", ja: "代理店" },
  msChannelHospital: { ko: "병원", en: "Hospital", ru: "Больница", kz: "Аурухана", zh: "医院", ja: "病院" },
  msSendFailed: { ko: "전송 실패 — 네트워크를 확인하고 다시 시도하세요", en: "Send failed — check your network and try again", ru: "Ошибка отправки — проверьте сеть и повторите", kz: "Жіберу сәтсіз — желіні тексеріп, қайталаңыз", zh: "发送失败 — 请检查网络后重试", ja: "送信失敗 — ネットワークを確認して再試行してください" },
  msRelayHint: { ko: "답장은 환자의 {channel} 채팅으로 바로 전송됩니다", en: "Replies are delivered straight to the patient's {channel} chat", ru: "Ответы отправляются прямо в {channel} пациента", kz: "Жауаптар пациенттің {channel} чатына тікелей жіберіледі", zh: "回复将直接发送到患者的 {channel} 聊天", ja: "返信は患者の{channel}チャットに直接送信されます" },
  msDeliveryFailed: { ko: "⚠️ 미전달 — 환자 메신저로 발송 실패", en: "⚠️ Not delivered — failed to send to the patient's messenger", ru: "⚠️ Не доставлено — не удалось отправить в мессенджер пациента", kz: "⚠️ Жеткізілмеді — пациенттің мессенджеріне жіберу сәтсіз", zh: "⚠️ 未送达 — 发送到患者通讯软件失败", ja: "⚠️ 未配信 — 患者のメッセンジャーへの送信に失敗" },
  msDeliveryWindowExpired: { ko: "⏰ 미전달 — 24시간 응답 창 만료(환자가 다시 말을 걸어야 전송 가능)", en: "⏰ Not delivered — 24h window expired (patient must message again)", ru: "⏰ Не доставлено — 24-часовое окно истекло (пациент должен написать снова)", kz: "⏰ Жеткізілмеді — 24 сағаттық терезе аяқталды (пациент қайта жазуы керек)", zh: "⏰ 未送达 — 24小时窗口已过期（需患者再次发消息）", ja: "⏰ 未配信 — 24時間ウィンドウ期限切れ（患者の再送信が必要）" },
  msActorPatient: { ko: "환자", en: "Patient", ru: "Пациент", kz: "Пациент", zh: "患者", ja: "患者" },
  msActorAI: { ko: "AI", en: "AI", ru: "ИИ", kz: "AI", zh: "AI", ja: "AI" },
  msActorMe: { ko: "나", en: "Me", ru: "Я", kz: "Мен", zh: "我", ja: "自分" },
  msActorAgency: { ko: "에이전시", en: "Agency", ru: "Агентство", kz: "Агенттік", zh: "代理机构", ja: "代理店" },
  msActorHospital: { ko: "병원", en: "Hospital", ru: "Больница", kz: "Аурухана", zh: "医院", ja: "病院" },
  msActorAdmin: { ko: "관리자", en: "Admin", ru: "Администратор", kz: "Әкімші", zh: "管理员", ja: "管理者" },
  msSenderMe: { ko: "나 (코디네이터)", en: "Me (coordinator)", ru: "Я (координатор)", kz: "Мен (үйлестіруші)", zh: "我（协调员）", ja: "自分（コーディネーター）" },
  msSenderOtherCoord: { ko: "다른 코디네이터", en: "Another coordinator", ru: "Другой координатор", kz: "Басқа үйлестіруші", zh: "其他协调员", ja: "他のコーディネーター" },
  msSenderSystem: { ko: "시스템", en: "System", ru: "Система", kz: "Жүйе", zh: "系统", ja: "システム" },
  msTitlePatientConsult: { ko: "환자 상담", en: "Patient consultation", ru: "Консультация пациента", kz: "Пациент консультациясы", zh: "患者咨询", ja: "患者相談" },
  msTitleAIConsult: { ko: "AI 건강 상담", en: "AI health consultation", ru: "ИИ-консультация по здоровью", kz: "AI денсаулық консультациясы", zh: "AI 健康咨询", ja: "AI健康相談" },
  msLoading: { ko: "불러오는 중…", en: "Loading…", ru: "Загрузка…", kz: "Жүктелуде…", zh: "加载中…", ja: "読み込み中…" },
  msNoThreads: { ko: "이 조건의 대화가 없습니다.", en: "No conversations match this filter.", ru: "Нет диалогов по этому фильтру.", kz: "Бұл сүзгіге сәйкес әңгіме жоқ.", zh: "没有符合此筛选条件的对话。", ja: "この条件に該当する会話はありません。" },
  msInquiry: { ko: "문의", en: "Inquiry", ru: "Заявка", kz: "Сұраныс", zh: "咨询", ja: "問い合わせ" },
  msNoMessages: { ko: "메시지 없음", en: "No messages", ru: "Нет сообщений", kz: "Хабар жоқ", zh: "无消息", ja: "メッセージなし" },
  msSelectConversation: { ko: "왼쪽에서 대화를 선택하세요.", en: "Select a conversation on the left.", ru: "Выберите диалог слева.", kz: "Сол жақтан әңгімені таңдаңыз.", zh: "请在左侧选择一个对话。", ja: "左側から会話を選択してください。" },
  // 알림 딥링크로 들어왔는데 그 대화가 목록에 없을 때. 「왼쪽에서 고르세요」는 폰에 왼쪽이
  // 없어서 틀린 안내가 된다(2026-08-28 완성도 감사).
  msThreadNotFound: { ko: "그 대화를 찾을 수 없습니다.", en: "That conversation could not be found.", ru: "Этот диалог не найден.", kz: "Бұл әңгіме табылмады.", zh: "未找到该对话。", ja: "その会話が見つかりません。" },
  msGuestBadge: { ko: "게스트(비회원)", en: "Guest (non-member)", ru: "Гость (не участник)", kz: "Қонақ (мүше емес)", zh: "访客（非会员）", ja: "ゲスト（非会員）" },
  msAIChat: { ko: "AI 채팅", en: "AI chat", ru: "AI-чат", kz: "AI чат", zh: "AI 聊天", ja: "AIチャット" },
  msNoMessagesYet: { ko: "아직 메시지가 없습니다.", en: "No messages yet.", ru: "Сообщений пока нет.", kz: "Әзірге хабар жоқ.", zh: "还没有消息。", ja: "まだメッセージがありません。" },
  msReplyPlaceholder: { ko: "환자에게 답장… (Ctrl+Enter 전송)", en: "Reply to the patient… (Ctrl+Enter to send)", ru: "Ответить пациенту… (Ctrl+Enter — отправить)", kz: "Пациентке жауап беру… (Ctrl+Enter — жіберу)", zh: "回复患者……（Ctrl+Enter 发送）", ja: "患者へ返信…（Ctrl+Enterで送信）" },
  msSuggestedReplies: { ko: "추천 답장", en: "Suggested replies", ru: "Готовые ответы", kz: "Дайын жауаптар", zh: "推荐回复", ja: "返信候補" },
  msSending: { ko: "전송 중…", en: "Sending…", ru: "Отправка…", kz: "Жіберілуде…", zh: "发送中…", ja: "送信中…" },
  msSend: { ko: "보내기", en: "Send", ru: "Отправить", kz: "Жіберу", zh: "发送", ja: "送信" },

  // ── AI 상담 리드 (chat) ─────────────────────────────
  chTitle: { ko: "AI 대화 · 환자자료", en: "AI chats · patient files", ru: "AI-чаты · файлы пациентов", kz: "AI чаттар · пациент файлдары", zh: "AI 对话 · 患者资料", ja: "AIチャット · 患者資料" },
  chSubtitle: { ko: "환자가 AI 챗에 올린 검사결과지·사진과 상담사 연결 요청을 확인합니다(읽기전용 — 검수·정정은 의사/관리자 화면). (AI는 판독하지 않음)", en: "Review test results, photos, and agent-connection requests patients submitted in the AI chat (read-only — review/correction is done on the doctor/admin screen). (AI does not interpret them.)", ru: "Просматривайте результаты обследований, фото и запросы на связь с консультантом, отправленные пациентами в AI-чате (только чтение — проверка/исправление выполняется на экране врача/администратора). (AI их не интерпретирует.)", kz: "Пациенттер AI чатқа жүктеген тексеру нәтижелерін, фотоларды және кеңесшіге қосылу сұраныстарын қараңыз (тек оқу — тексеру/түзету дәрігер/әкімші экранында). (AI оларды талдамайды.)", zh: "查看患者在 AI 对话中上传的检查结果、照片以及转接咨询师请求（只读——审核/更正在医生/管理员界面进行）。（AI 不做判读。）", ja: "患者がAIチャットに送った検査結果・写真と相談員接続リクエストを確認します（読み取り専用 — 検収・訂正は医師／管理者画面）。（AIは判読しません。）" },
  chTabReview: { ko: "검토요청", en: "Review requests", ru: "Запросы на проверку", kz: "Тексеру сұраныстары", zh: "审核请求", ja: "確認リクエスト" },
  chTabAttachments: { ko: "자료 첨부", en: "Attachments", ru: "Вложения", kz: "Тіркемелер", zh: "附件资料", ja: "資料添付" },
  chBadgeReview: { ko: "검토요청", en: "Review", ru: "Проверка", kz: "Тексеру", zh: "审核", ja: "確認" },
  chBadgeAttachment: { ko: "자료", en: "Files", ru: "Файлы", kz: "Файлдар", zh: "资料", ja: "資料" },
  chEmptyReview: { ko: "검토 대기 중인 요청이 없습니다.", en: "No requests awaiting review.", ru: "Нет запросов, ожидающих проверки.", kz: "Тексеруді күтіп тұрған сұраныстар жоқ.", zh: "没有待审核的请求。", ja: "確認待ちのリクエストはありません。" },
  chEmptyAttachments: { ko: "첨부 자료가 있는 대화가 없습니다.", en: "No conversations with attachments.", ru: "Нет диалогов с вложениями.", kz: "Тіркемесі бар сөйлесулер жоқ.", zh: "没有带附件的对话。", ja: "添付資料のある会話はありません。" },
  chEmptyThreads: { ko: "대화가 없습니다.", en: "No conversations.", ru: "Нет диалогов.", kz: "Сөйлесулер жоқ.", zh: "没有对话。", ja: "会話はありません。" },
  chNoMessages: { ko: "메시지가 없습니다.", en: "No messages.", ru: "Нет сообщений.", kz: "Хабарлар жоқ.", zh: "没有消息。", ja: "メッセージはありません。" },
  chLoading: { ko: "불러오는 중...", en: "Loading…", ru: "Загрузка…", kz: "Жүктелуде…", zh: "加载中…", ja: "読み込み中…" },
  chLoadingThread: { ko: "대화 불러오는 중...", en: "Loading conversation…", ru: "Загрузка диалога…", kz: "Сөйлесу жүктелуде…", zh: "加载对话中…", ja: "会話を読み込み中…" },
  chBackToList: { ko: "목록", en: "List", ru: "Список", kz: "Тізім", zh: "列表", ja: "一覧" },
  chBannerPending: { ko: "상담사 연결(검토) 대기 {n}건 — 아래 \"검토요청\" 탭부터 처리하세요.", en: "{n} agent-connection (review) request(s) pending — start with the \"Review requests\" tab below.", ru: "Ожидает запросов на связь с консультантом (проверку): {n} — начните с вкладки «Запросы на проверку» ниже.", kz: "Кеңесшіге қосылу (тексеру) сұраныстары күтуде: {n} — төмендегі «Тексеру сұраныстары» қойындысынан бастаңыз.", zh: "有 {n} 条转接咨询师（审核）请求待处理——请先处理下方的\"审核请求\"标签页。", ja: "相談員接続（確認）待ちが{n}件 — 下の「確認リクエスト」タブから対応してください。" },
  chBannerClear: { ko: "검토 대기 없음 — 모든 상담사 연결 요청을 처리했습니다.", en: "No pending reviews — all agent-connection requests are handled.", ru: "Нет ожидающих проверок — все запросы на связь обработаны.", kz: "Күтудегі тексеру жоқ — барлық қосылу сұраныстары өңделді.", zh: "无待审核项——所有转接咨询师请求均已处理。", ja: "確認待ちなし — すべての相談員接続リクエストを処理しました。" },
  chReviewQueueTitle: { ko: "검토 대기 {n}건", en: "{n} awaiting review", ru: "Ожидают проверки: {n}", kz: "Тексеруді күтуде: {n}", zh: "{n} 项待审核", ja: "確認待ち {n}件" },
  chReviewQueueHint: { ko: "오래 기다린 순 — 위에서부터 클릭해 확인·회신하세요.", en: "Oldest first — click from the top to review and respond.", ru: "Сначала самые старые — нажимайте сверху, чтобы проверить и ответить.", kz: "Ең ескісінен бастап — жоғарыдан бастап басып, тексеріп жауап беріңіз.", zh: "按等待时间排序——从上到下点击查看并回复。", ja: "待機の長い順 — 上からクリックして確認・返信してください。" },
  chNoReviewPending: { ko: "검토 대기 없음", en: "No pending reviews", ru: "Нет ожидающих проверок", kz: "Күтудегі тексеру жоқ", zh: "无待审核项", ja: "確認待ちなし" },
  chNoReviewHint: { ko: "왼쪽 목록에서 대화를 골라 내용을 확인할 수 있습니다.", en: "Pick a conversation from the list on the left to view its contents.", ru: "Выберите диалог из списка слева, чтобы просмотреть его содержимое.", kz: "Мазмұнын көру үшін сол жақтағы тізімнен сөйлесуді таңдаңыз.", zh: "从左侧列表中选择一个对话以查看内容。", ja: "左側の一覧から会話を選んで内容を確認できます。" },
  chWaitDays: { ko: "{n}일 대기", en: "waiting {n}d", ru: "ждёт {n} дн.", kz: "{n} күн күтуде", zh: "已等待 {n} 天", ja: "{n}日待機" },
  chWaitHours: { ko: "{n}시간 대기", en: "waiting {n}h", ru: "ждёт {n} ч.", kz: "{n} сағат күтуде", zh: "已等待 {n} 小时", ja: "{n}時間待機" },
  chWaitJustNow: { ko: "방금", en: "just now", ru: "только что", kz: "жаңа ғана", zh: "刚刚", ja: "たった今" },
  chPacketTitle: { ko: "진료의뢰 패킷 · AI 정리", en: "Referral packet · AI summary", ru: "Пакет направления · сводка AI", kz: "Жолдама пакеті · AI жинағы", zh: "转诊资料包 · AI 整理", ja: "診療依頼パケット · AI整理" },
  chReviewed: { ko: "검수완료", en: "Reviewed", ru: "Проверено", kz: "Тексерілді", zh: "已审核", ja: "検収完了" },
  chReviewPending: { ko: "검수 대기", en: "Awaiting review", ru: "Ожидает проверки", kz: "Тексеруді күтуде", zh: "待审核", ja: "検収待ち" },
  chUrgency: { ko: "시급도", en: "Urgency", ru: "Срочность", kz: "Жеделдік", zh: "紧急度", ja: "緊急度" },
  chUrgencyHigh: { ko: "높음", en: "High", ru: "Высокая", kz: "Жоғары", zh: "高", ja: "高" },
  chUrgencyMedium: { ko: "보통", en: "Medium", ru: "Средняя", kz: "Орташа", zh: "中", ja: "中" },
  chUrgencyLow: { ko: "낮음", en: "Low", ru: "Низкая", kz: "Төмен", zh: "低", ja: "低" },
  chCondition: { ko: "상태", en: "Condition", ru: "Состояние", kz: "Жағдайы", zh: "病情", ja: "状態" },
  chRequest: { ko: "요청", en: "Request", ru: "Запрос", kz: "Сұраныс", zh: "请求", ja: "リクエスト" },
  chSuggestedSpecialty: { ko: "추천 진료과", en: "Suggested specialty", ru: "Рекомендуемая специальность", kz: "Ұсынылған мамандық", zh: "推荐科室", ja: "推奨診療科" },
  chMissingDocs: { ko: "필요한데 빠진 자료", en: "Missing required documents", ru: "Отсутствующие необходимые документы", kz: "Қажет, бірақ жоқ құжаттар", zh: "缺少的必需资料", ja: "必要だが不足の資料" },
  chRedFlags: { ko: "주의해서 볼 점", en: "Points to watch", ru: "На что обратить внимание", kz: "Назар аударатын тұстар", zh: "需注意的要点", ja: "注意すべき点" },
  chCorrectionSent: { ko: "정정 발송됨", en: "Correction sent", ru: "Исправление отправлено", kz: "Түзету жіберілді", zh: "已发送更正", ja: "訂正送信済み" },
  chReviewWaitingNote: { ko: "의료진 검수 대기 — 검수·정정은 의사/관리자 화면에서 진행됩니다.", en: "Awaiting clinical review — review and corrections are done on the doctor/admin screen.", ru: "Ожидает медицинской проверки — проверка и исправления выполняются на экране врача/администратора.", kz: "Медициналық тексеруді күтуде — тексеру мен түзету дәрігер/әкімші экранында жүргізіледі.", zh: "等待医疗审核——审核与更正在医生/管理员界面进行。", ja: "医療スタッフの検収待ち — 検収・訂正は医師／管理者画面で行います。" },
  chLoadListFail: { ko: "목록 로딩 실패", en: "Failed to load the list", ru: "Не удалось загрузить список", kz: "Тізімді жүктеу сәтсіз", zh: "列表加载失败", ja: "一覧の読み込みに失敗しました" },
  chLoadThreadFail: { ko: "대화 로딩 실패", en: "Failed to load the conversation", ru: "Не удалось загрузить диалог", kz: "Сөйлесуді жүктеу сәтсіз", zh: "对话加载失败", ja: "会話の読み込みに失敗しました" },
  chOpenFileFail: { ko: "파일 열기 실패", en: "Failed to open the file", ru: "Не удалось открыть файл", kz: "Файлды ашу сәтсіз", zh: "打开文件失败", ja: "ファイルを開けませんでした" },

  // ── 견적 (cost-estimates) ─────────────────────────────
  coStatusAutoRange: { ko: "자동 범위", en: "Auto range", ru: "Автодиапазон", kz: "Автоматты ауқым", zh: "自动范围", ja: "自動レンジ" },
  coStatusFormalRequested: { ko: "정식 요청", en: "Formal request", ru: "Официальный запрос", kz: "Ресми сұраныс", zh: "正式请求", ja: "正式依頼" },
  coStatusHospitalPending: { ko: "병원 응답 대기", en: "Awaiting hospital", ru: "Ожидание больницы", kz: "Аурухана жауабын күту", zh: "等待医院回复", ja: "病院回答待ち" },
  coStatusDraft: { ko: "코디 작성 중", en: "Coordinator drafting", ru: "Координатор готовит", kz: "Үйлестіруші дайындауда", zh: "协调员编写中", ja: "コーディネーター作成中" },
  coStatusIssued: { ko: "견적서 발급", en: "Quote issued", ru: "Смета выдана", kz: "Смета берілді", zh: "已出具报价", ja: "見積書発行" },
  coStatusAccepted: { ko: "동의 완료", en: "Accepted", ru: "Согласовано", kz: "Келісілді", zh: "已同意", ja: "同意完了" },
  coStatusRejected: { ko: "거절", en: "Rejected", ru: "Отклонено", kz: "Қабылданбады", zh: "已拒绝", ja: "却下" },
  coStatusExpired: { ko: "만료", en: "Expired", ru: "Истёк срок", kz: "Мерзімі бітті", zh: "已过期", ja: "期限切れ" },
  coLoading: { ko: "불러오는 중...", en: "Loading…", ru: "Загрузка…", kz: "Жүктелуде…", zh: "加载中…", ja: "読み込み中…" },
  coError: { ko: "오류", en: "Error", ru: "Ошибка", kz: "Қате", zh: "错误", ja: "エラー" },
  coListTitle: { ko: "예상 진료비 견적 대시보드", en: "Estimated treatment cost dashboard", ru: "Панель смет на лечение", kz: "Болжамды емдеу құны тақтасы", zh: "预估诊疗费报价看板", ja: "予想診療費見積ダッシュボード" },
  coListSubtitle: { ko: "정식 견적 요청을 받아 병원 문의 후 견적서 PDF 를 발급합니다.", en: "Receive formal quote requests, inquire with the hospital, and issue a quotation PDF.", ru: "Принимайте официальные запросы смет, уточняйте в больнице и выдавайте PDF-смету.", kz: "Ресми смета сұранысын алып, ауруханадан сұрап, PDF смета беріңіз.", zh: "接收正式报价请求，向医院咨询后出具报价单 PDF。", ja: "正式な見積依頼を受け、病院に照会のうえ見積書PDFを発行します。" },
  coListLoadFail: { ko: "목록을 불러오지 못했습니다.", en: "Failed to load the list.", ru: "Не удалось загрузить список.", kz: "Тізімді жүктеу сәтсіз аяқталды.", zh: "无法加载列表。", ja: "一覧を読み込めませんでした。" },
  coNoStatus: { ko: "{status} 상태 없음", en: "No items with status \"{status}\"", ru: "Нет записей со статусом «{status}»", kz: "\"{status}\" күйіндегі жазба жоқ", zh: "无\"{status}\"状态的记录", ja: "「{status}」ステータスの項目なし" },
  coNoRequests: { ko: "견적 요청 없음", en: "No quote requests", ru: "Нет запросов смет", kz: "Смета сұранысы жоқ", zh: "无报价请求", ja: "見積依頼なし" },
  coColNo: { ko: "No.", en: "No.", ru: "№", kz: "№", zh: "编号", ja: "No." },
  coColSubject: { ko: "요청 내용", en: "Requested for", ru: "Запрос по", kz: "Сұраныс бойынша", zh: "咨询内容", ja: "依頼内容" },
  coColTotal: { ko: "확정 총액", en: "Final total", ru: "Итоговая сумма", kz: "Түпкі жиынтық", zh: "确定总额", ja: "確定総額" },
  coColCreated: { ko: "생성", en: "Created", ru: "Создано", kz: "Жасалды", zh: "创建", ja: "作成" },
  coDetailLoadFail: { ko: "견적 정보를 불러오지 못했습니다.", en: "Failed to load quote details.", ru: "Не удалось загрузить данные сметы.", kz: "Смета мәліметтерін жүктеу сәтсіз аяқталды.", zh: "无法加载报价信息。", ja: "見積情報を読み込めませんでした。" },
  coSaveDone: { ko: "저장 완료", en: "Saved", ru: "Сохранено", kz: "Сақталды", zh: "保存完成", ja: "保存完了" },
  coSaveFail: { ko: "저장 실패", en: "Save failed", ru: "Не удалось сохранить", kz: "Сақтау сәтсіз", zh: "保存失败", ja: "保存失敗" },
  coFail: { ko: "실패", en: "Failed", ru: "Ошибка", kz: "Сәтсіз", zh: "失败", ja: "失敗" },
  coStatusChangePrompt: { ko: "\"{status}\" 로 변경. 메모(선택):", en: "Change to \"{status}\". Note (optional):", ru: "Изменить на «{status}». Примечание (необязательно):", kz: "\"{status}\" күйіне өзгерту. Ескертпе (міндетті емес):", zh: "更改为\"{status}\"。备注（可选）：", ja: "「{status}」に変更。メモ（任意）：" },
  coAddItemFirst: { ko: "견적 항목을 먼저 추가하세요", en: "Add a quote item first", ru: "Сначала добавьте позицию сметы", kz: "Алдымен смета жолын қосыңыз", zh: "请先添加报价项目", ja: "先に見積項目を追加してください" },
  coIssueConfirm: { ko: "견적서 PDF 를 발급하시겠습니까? 상태가 'issued' 로 변경되고 환자에게 노출됩니다.", en: "Issue the quotation PDF? The status becomes 'issued' and it is shown to the patient.", ru: "Выдать PDF-смету? Статус изменится на «issued» и станет виден пациенту.", kz: "Смета PDF-ін бересіз бе? Күйі 'issued' болып, пациентке көрінеді.", zh: "确定出具报价单 PDF 吗？状态将变为\"issued\"并对患者可见。", ja: "見積書PDFを発行しますか？ステータスが「issued」になり患者に表示されます。" },
  coIssueDone: { ko: "견적서 발급 완료!", en: "Quotation issued!", ru: "Смета выдана!", kz: "Смета берілді!", zh: "报价单已出具！", ja: "見積書を発行しました！" },
  coIssueFail: { ko: "발급 실패", en: "Issue failed", ru: "Не удалось выдать", kz: "Беру сәтсіз", zh: "出具失败", ja: "発行失敗" },
  coBackList: { ko: "목록", en: "List", ru: "Список", kz: "Тізім", zh: "列表", ja: "一覧" },
  coQuoteList: { ko: "견적 목록", en: "Quote list", ru: "Список смет", kz: "Смета тізімі", zh: "报价列表", ja: "見積一覧" },
  coQuotePrefix: { ko: "견적", en: "Quote", ru: "Смета", kz: "Смета", zh: "报价", ja: "見積" },
  coCurrent: { ko: "현재", en: "Current", ru: "Текущий", kz: "Ағымдағы", zh: "当前", ja: "現在" },
  coStatusChange: { ko: "상태 변경", en: "Change status", ru: "Изменить статус", kz: "Күйін өзгерту", zh: "更改状态", ja: "ステータス変更" },
  coItems: { ko: "견적 항목", en: "Quote items", ru: "Позиции сметы", kz: "Смета жолдары", zh: "报价项目", ja: "見積項目" },
  coAddItem: { ko: "항목 추가", en: "Add item", ru: "Добавить позицию", kz: "Жол қосу", zh: "添加项目", ja: "項目追加" },
  coPickFromPrices: { ko: "가격표에서 고르기", en: "Pick from price list", ru: "Выбрать из прайса", kz: "Прайстан таңдау", zh: "从价目表选择", ja: "価格表から選ぶ" },
  coPriceListNote: { ko: "면력한방병원 확정 비급여 가격({date}). 고르면 항목과 금액이 채워집니다.", en: "Confirmed non-covered prices, Myeonlyeok Korean Medicine Hospital ({date}). Selecting fills in the item and amount.", ru: "Утверждённый прайс клиники Мёнрёк ({date}). При выборе позиция и сумма подставляются автоматически.", kz: "Мёнрёк клиникасының бекітілген прайсы ({date}). Таңдағанда жол мен сома толтырылады.", zh: "免疫韩方医院确定价格（{date}）。选择后自动填入项目和金额。", ja: "免疫韓方病院の確定価格（{date}）。選ぶと項目と金額が入ります。" },
  coColItem: { ko: "항목", en: "Item", ru: "Позиция", kz: "Жол", zh: "项目", ja: "項目" },
  coColNote: { ko: "비고", en: "Note", ru: "Примечание", kz: "Ескертпе", zh: "备注", ja: "備考" },
  coNoItems: { ko: "항목 없음", en: "No items", ru: "Нет позиций", kz: "Жол жоқ", zh: "无项目", ja: "項目なし" },
  coNoItemsHint: { ko: "— 위 버튼으로 추가", en: "— add with the button above", ru: "— добавьте кнопкой выше", kz: "— жоғарыдағы түймемен қосыңыз", zh: "— 用上方按钮添加", ja: "— 上のボタンで追加" },
  coItemPlaceholder: { ko: "예: 위절제술", en: "e.g. Gastrectomy", ru: "напр. Гастрэктомия", kz: "мыс. Гастрэктомия", zh: "例：胃切除术", ja: "例：胃切除術" },
  coNotePlaceholder: { ko: "병원 요금", en: "Hospital fee", ru: "Тариф больницы", kz: "Аурухана бағасы", zh: "医院收费", ja: "病院料金" },
  coRemove: { ko: "제거", en: "Remove", ru: "Удалить", kz: "Жою", zh: "移除", ja: "削除" },
  coTotal: { ko: "합계", en: "Total", ru: "Итого", kz: "Жиыны", zh: "合计", ja: "合計" },
  // 「누가 내는 돈인가」 — 유치수수료는 병원이 유치사업자에게 주는 돈이라 환자 합계에서 뺀다
  // (통합고시 제2조1호). 2026-08-04 이전엔 구분이 없어 수수료가 환자 부담으로 합산됐다.
  coColPayer: { ko: "부담 주체", en: "Paid by", ru: "Кто платит", kz: "Кім төлейді", zh: "承担方", ja: "負担者" },
  coPayerPatient: { ko: "환자", en: "Patient", ru: "Пациент", kz: "Науқас", zh: "患者", ja: "患者" },
  coPayerHospital: { ko: "병원(환자 청구 없음)", en: "Hospital (not billed to patient)", ru: "Больница (не выставляется пациенту)", kz: "Аурухана (науқасқа шот жоқ)", zh: "医院（不向患者收取）", ja: "病院（患者請求なし）" },
  coTotalPatient: { ko: "환자 부담 합계", en: "Total payable by patient", ru: "Итого к оплате пациентом", kz: "Науқас төлейтін жиыны", zh: "患者应付合计", ja: "患者負担合計" },
  // ── 유치수수료 법정 상한 차단 안내 ──────────────────────────────
  // 왜 이렇게 자세히 쓰나: 「저장 실패」 한 줄만 뜨면 코디가 무엇을 고쳐야 할지 몰라서
  // 가드가 있으나 마나가 된다. 막힌 이유 + 얼마 이하여야 하는지를 숫자로 알려준다.
  coFeeCapTitle: { ko: "유치수수료가 법정 상한을 넘어 저장할 수 없다", en: "Cannot save — the facilitation fee exceeds the statutory cap", ru: "Невозможно сохранить — комиссия превышает установленный законом предел", kz: "Сақтау мүмкін емес — тарту комиссиясы заңды шектен асып тұр", zh: "无法保存 — 招引手续费超过法定上限", ja: "誘致手数料が法定上限を超えるため保存できません" },
  coFeeCapLimit: { ko: "상한", en: "Cap", ru: "Предел", kz: "Шек", zh: "上限", ja: "上限" },
  coFeeCapCurrent: { ko: "현재 수수료", en: "Current fee", ru: "Текущая комиссия", kz: "Ағымдағы комиссия", zh: "当前手续费", ja: "現在の手数料" },
  coFeeCapMax: { ko: "최대 허용액", en: "Maximum allowed", ru: "Максимально допустимо", kz: "Рұқсат етілген ең көп", zh: "最高可收取", ja: "最大許容額" },
  coFeeCapBase: { ko: "환자 부담 진료비(기준)", en: "Patient-borne treatment cost (base)", ru: "Стоимость лечения, оплачиваемая пациентом (база)", kz: "Науқас төлейтін ем құны (негіз)", zh: "患者负担诊疗费（基准）", ja: "患者負担の診療費（基準）" },
  coFeeCapGradeUnknown: { ko: "이 병원의 종별이 등록돼 있지 않아 가장 엄격한 상급종합 기준(15%)을 적용했다. 종별을 등록하면 상한이 올라갈 수 있다.", en: "This hospital's institution grade is not on file, so the strictest tertiary-hospital cap (15%) was applied. Registering the grade may raise the cap.", ru: "Категория этой больницы не указана, поэтому применён самый строгий предел (15%). Указание категории может повысить предел.", kz: "Бұл аурухананың санаты тіркелмеген, сондықтан ең қатаң шек (15%) қолданылды. Санатты тіркесе шек жоғарылауы мүмкін.", zh: "该医院的机构类别未登记，因此适用最严格的三级医院上限（15%）。登记类别后上限可能提高。", ja: "この病院の種別が未登録のため、最も厳しい上級総合病院の上限（15%）を適用しました。種別を登録すると上限が上がる場合があります。" },
  coFeeCapNegative: { ko: "음수 금액이 들어 있다. 상쇄 줄로 수수료를 낮춰 적으면 견적서 PDF 에는 원래 금액이 그대로 찍혀 실제와 달라진다. 금액은 0 이상만 넣어라.", en: "A negative amount is present. Offsetting lines would understate the fee here while the issued PDF still prints the original figure. Amounts must be zero or above.", ru: "Указана отрицательная сумма. Компенсирующие строки занижают комиссию здесь, тогда как в выданном PDF остаётся исходная сумма. Суммы должны быть не меньше нуля.", kz: "Теріс сома бар. Өтеу жолдары комиссияны төмен көрсетеді, ал берілген PDF-те бастапқы сома қалады. Сомалар нөлден кем болмауы керек.", zh: "存在负数金额。用抵扣行压低手续费时，出具的报价单仍会印出原始金额，与实际不符。金额必须为零或以上。", ja: "マイナス金額が含まれています。相殺行で手数料を低く見せても、発行される見積書PDFには元の金額がそのまま印字されます。金額は0以上にしてください。" },
  coFeeCapNoBase: { ko: "수수료만 있고 환자 부담 진료비가 0원이라 상한 비율을 계산할 수 없다. 진료비 항목을 먼저 넣어라.", en: "There is a fee but the patient-borne treatment cost is zero, so the ratio cannot be calculated. Add the treatment cost items first.", ru: "Комиссия есть, но стоимость лечения для пациента равна нулю — соотношение вычислить нельзя. Сначала добавьте статьи лечения.", kz: "Комиссия бар, бірақ науқас төлейтін ем құны нөл — арақатынасты есептеу мүмкін емес. Алдымен ем баптарын қосыңыз.", zh: "只有手续费而患者负担诊疗费为零，无法计算比例。请先添加诊疗费项目。", ja: "手数料はありますが患者負担の診療費が0円のため比率を計算できません。先に診療費の項目を入れてください。" },
  coFeeCapLaw: { ko: "근거: 통합고시 제3조(상급종합 15% / 종합병원·병원 20% / 의원 30%). 초과는 의료해외진출법 제9조제1항 위반이며 제24조제1항제6호 등록취소 사유다.", en: "Basis: Article 3 of the Integrated Notice (tertiary 15% / general hospital and hospital 20% / clinic 30%). Exceeding it violates Article 9(1) of the Act and is a ground for registration cancellation under Article 24(1)6.", ru: "Основание: статья 3 Сводного уведомления (третичная 15% / многопрофильная и больница 20% / клиника 30%). Превышение нарушает статью 9(1) Закона и является основанием для аннулирования регистрации по статье 24(1)6.", kz: "Негіз: Біріктірілген хабарламаның 3-бабы (жоғары санатты 15% / көпбейінді және аурухана 20% / емхана 30%). Асып кету Заңның 9(1)-бабын бұзады және 24(1)6-бап бойынша тіркеуді жою негізі.", zh: "依据：统合告示第3条（三级综合15% / 综合医院·医院20% / 诊所30%）。超过即违反医疗海外拓展法第9条第1款，属第24条第1款第6项的登记撤销事由。", ja: "根拠：統合告示第3条（上級総合15% / 総合病院・病院20% / 医院30%）。超過は医療海外進出法第9条第1項違反であり、第24条第1項第6号の登録取消事由です。" },
  coNotesTitle: { ko: "코디 메모 (환자에게 표시됨)", en: "Coordinator note (shown to patient)", ru: "Заметка координатора (видна пациенту)", kz: "Үйлестіруші ескертпесі (пациентке көрінеді)", zh: "协调员备注（对患者显示）", ja: "コーディネーターメモ（患者に表示）" },
  coNotesPlaceholder: { ko: "환자에게 전달할 메모 (비용 구성, 결제 일정 등)", en: "Note to convey to the patient (cost breakdown, payment schedule, etc.)", ru: "Заметка для пациента (структура расходов, график оплаты и т. д.)", kz: "Пациентке жеткізетін ескертпе (шығын құрылымы, төлем кестесі, т.б.)", zh: "向患者传达的备注（费用构成、付款计划等）", ja: "患者へ伝えるメモ（費用構成・支払スケジュール等）" },
  coSaving: { ko: "저장 중...", en: "Saving…", ru: "Сохранение…", kz: "Сақталуда…", zh: "保存中…", ja: "保存中…" },
  coSaveItemsNotes: { ko: "항목/메모 저장", en: "Save items / note", ru: "Сохранить позиции / заметку", kz: "Жолдар / ескертпені сақтау", zh: "保存项目/备注", ja: "項目/メモを保存" },
  coIssuing: { ko: "발급 중...", en: "Issuing…", ru: "Выдача…", kz: "Берілуде…", zh: "出具中…", ja: "発行中…" },
  coIssuePdf: { ko: "견적서 PDF 발급", en: "Issue quotation PDF", ru: "Выдать PDF-смету", kz: "Смета PDF беру", zh: "出具报价单 PDF", ja: "見積書PDF発行" },
  coViewPdf: { ko: "발급된 PDF 보기", en: "View issued PDF", ru: "Открыть выданный PDF", kz: "Берілген PDF-ті көру", zh: "查看已出具的 PDF", ja: "発行済みPDFを見る" },
  coPatientAccepted: { ko: "환자 동의 완료", en: "Patient accepted", ru: "Пациент согласился", kz: "Пациент келісті", zh: "患者已同意", ja: "患者同意完了" },

  // ── 인박스 상세 (ib) ─────────────────────────────
  ibBackToInbox: { ko: "인박스로", en: "Back to inbox", ru: "К входящим", kz: "Кіріс жәшігіне", zh: "返回收件箱", ja: "受信箱へ" },
  ibLoginRequired: { ko: "로그인이 필요합니다.", en: "Sign-in required.", ru: "Требуется вход.", kz: "Кіру қажет.", zh: "需要登录。", ja: "ログインが必要です。" },
  ibLoadError: { ko: "조회 중 문제가 발생했습니다.", en: "Something went wrong while loading.", ru: "Произошла ошибка при загрузке.", kz: "Жүктеу кезінде қате шықты.", zh: "加载时出现问题。", ja: "読み込み中に問題が発生しました。" },
  ibLoadFailed: { ko: "문의를 불러오지 못했습니다.", en: "Failed to load the inquiry.", ru: "Не удалось загрузить заявку.", kz: "Сұранысты жүктеу мүмкін болмады.", zh: "无法加载咨询。", ja: "問い合わせを読み込めませんでした。" },
  ibRetry: { ko: "다시 시도", en: "Retry", ru: "Повторить", kz: "Қайталау", zh: "重试", ja: "再試行" },
  ibNotFoundTitle: { ko: "문의를 찾을 수 없습니다.", en: "Inquiry not found.", ru: "Заявка не найдена.", kz: "Сұраныс табылмады.", zh: "未找到咨询。", ja: "問い合わせが見つかりません。" },
  ibNotFoundDesc: { ko: "삭제되었거나 잘못된 주소예요.", en: "It was deleted or the address is wrong.", ru: "Она удалена или адрес неверный.", kz: "Ол жойылған немесе мекенжай қате.", zh: "已被删除或地址有误。", ja: "削除されたか、アドレスが正しくありません。" },
  ibNameUnknown: { ko: "(이름 미상)", en: "(Name unknown)", ru: "(Имя неизвестно)", kz: "(Аты белгісіз)", zh: "(姓名不详)", ja: "(氏名不明)" },
  ibPatientDirect: { ko: "환자 직접", en: "Patient direct", ru: "Напрямую от пациента", kz: "Пациенттен тікелей", zh: "患者直接", ja: "患者直接" },
  ibInquiryNo: { ko: "문의", en: "Inquiry", ru: "Заявка", kz: "Сұраныс", zh: "咨询", ja: "問い合わせ" },
  // 2026-08-25: 예전엔 「환자 연결 링크」였고 계정 없는 케이스에만 떴다. 이제 모든 케이스에 뜨고,
  //   하는 일도 «계정 연결»이 아니라 «진행상황·서류를 보여줄 주소를 건네주기»라 이름을 바꿨다.
  //   (PO: «왓츠앱이나 다른 경로로 문서 접수 받은거도 임시 링크 줄 수 있게 해줘»)
  ibClaimCopy: { ko: "링크 복사", en: "Copy link", ru: "Копировать ссылку", kz: "Сілтемені көшіру", zh: "复制链接", ja: "リンクをコピー" },
  ibClaimCopied: { ko: "복사됨!", en: "Copied!", ru: "Скопировано!", kz: "Көшірілді!", zh: "已复制！", ja: "コピーしました！" },
  ibShareWhatsapp: { ko: "왓츠앱으로 보내기", en: "Send via WhatsApp", ru: "Отправить в WhatsApp", kz: "WhatsApp арқылы жіберу", zh: "通过 WhatsApp 发送", ja: "WhatsAppで送る" },
  ibShareHint: { ko: "환자·보호자에게 주는 주소입니다. 가입·로그인 없이 진행상황과 공유 서류를 봅니다.", en: "A link for the patient or family. They can see progress and shared documents without signing up.", ru: "Ссылка для пациента или родственника. Прогресс и документы видны без регистрации.", kz: "Науқасқа немесе жақынына арналған сілтеме. Тіркелусіз барысы мен құжаттарды көреді.", zh: "给患者或家属的链接。无需注册即可查看进度和共享文件。", ja: "患者・ご家族に渡すリンクです。登録なしで進捗と共有書類を見られます。" },
  ibReceivedLabel: { ko: "접수", en: "Received", ru: "Получено", kz: "Қабылданды", zh: "接收", ja: "受付" },
  ibStepBothDone: { ko: "Step 1+2 완료", en: "Step 1+2 done", ru: "Этапы 1+2 завершены", kz: "1+2 кезең аяқталды", zh: "步骤 1+2 完成", ja: "ステップ1+2 完了" },
  ibStepOneNeedInfo: { ko: "Step 1만 (추가 정보 필요)", en: "Step 1 only (needs more info)", ru: "Только этап 1 (нужна доп. информация)", kz: "Тек 1-кезең (қосымша ақпарат қажет)", zh: "仅步骤 1（需补充信息）", ja: "ステップ1のみ（追加情報が必要）" },
  ibContactCard: { ko: "연락 정보", en: "Contact info", ru: "Контактная информация", kz: "Байланыс ақпараты", zh: "联系信息", ja: "連絡先情報" },
  ibContactId: { ko: "연락처(ID)", en: "Contact (ID)", ru: "Контакт (ID)", kz: "Байланыс (ID)", zh: "联系方式(ID)", ja: "連絡先(ID)" },
  ibEmail: { ko: "이메일", en: "Email", ru: "Эл. почта", kz: "Эл. пошта", zh: "电子邮件", ja: "メール" },
  ibPhone: { ko: "전화", en: "Phone", ru: "Телефон", kz: "Телефон", zh: "电话", ja: "電話" },
  ibArrival: { ko: "어디서 왔나", en: "Came from", ru: "Откуда пришёл", kz: "Қайдан келді", zh: "来源", ja: "流入元" },
  ibMedicalCard: { ko: "의료 · 여정 정보", en: "Medical & journey info", ru: "Медицинская информация и маршрут", kz: "Медициналық және сапар ақпараты", zh: "医疗与行程信息", ja: "医療・行程情報" },
  ibPreferredDate: { ko: "희망일", en: "Preferred date", ru: "Желаемая дата", kz: "Қалаған күні", zh: "期望日期", ja: "希望日" },
  ibFlexible: { ko: "조율 가능", en: "flexible", ru: "можно согласовать", kz: "келісуге болады", zh: "可协调", ja: "調整可能" },
  ibMessageCard: { ko: "문의 메시지", en: "Inquiry message", ru: "Сообщение заявки", kz: "Сұраныс хабары", zh: "咨询留言", ja: "問い合わせメッセージ" },
  ibNoMessage: { ko: "남긴 메시지가 없습니다.", en: "No message was left.", ru: "Сообщение не оставлено.", kz: "Хабар қалдырылмаған.", zh: "没有留言。", ja: "メッセージはありません。" },
  ibIntakeCard: { ko: "추가 정보 (인테이크)", en: "Additional info (intake)", ru: "Доп. информация (заявка)", kz: "Қосымша ақпарат (өтінім)", zh: "补充信息（接诊）", ja: "追加情報（インテーク）" },
  ibAttachmentsCard: { ko: "첨부 서류", en: "Attachments", ru: "Вложения", kz: "Тіркемелер", zh: "附件", ja: "添付書類" },
  ibAttachment: { ko: "첨부", en: "Attachment", ru: "Вложение", kz: "Тіркеме", zh: "附件", ja: "添付" },
  // 코디가 환자 대신 서류를 붙일 때 (메일·왓츠앱으로 따로 받은 자료)
  ibStaffUploadTitle: { ko: "환자 대신 서류 올리기", en: "Upload on patient's behalf", ru: "Загрузить за пациента", kz: "Науқас атынан жүктеу", zh: "代患者上传", ja: "患者に代わってアップロード" },
  ibStaffUploadHint: { ko: "메일·왓츠앱 등으로 따로 받은 자료를 여기에 올리면 문의에 함께 보관됩니다. PDF·이미지·Word, 각 200MB.", en: "Files received by email or WhatsApp can be attached here. PDF / image / Word, 200MB each.", ru: "Файлы, полученные по почте или WhatsApp, можно прикрепить здесь. PDF / изображение / Word, до 200 МБ.", kz: "Поштамен немесе WhatsApp арқылы алынған файлдарды осында тіркеңіз. PDF / сурет / Word, әрқайсысы 200МБ.", zh: "可在此上传通过邮件或 WhatsApp 收到的资料。PDF / 图片 / Word，每个 200MB。", ja: "メールや WhatsApp で受け取った資料をここに添付できます。PDF・画像・Word、各200MB。" },
  ibStaffUploadBtn: { ko: "파일 선택", en: "Choose file", ru: "Выбрать файл", kz: "Файл таңдау", zh: "选择文件", ja: "ファイルを選択" },
  ibStaffUploadOk: { ko: "올렸습니다.", en: "Uploaded.", ru: "Загружено.", kz: "Жүктелді.", zh: "已上传。", ja: "アップロードしました。" },
  ibStaffUploadFail: { ko: "업로드에 실패했습니다.", en: "Upload failed.", ru: "Не удалось загрузить.", kz: "Жүктеу сәтсіз аяқталды.", zh: "上传失败。", ja: "アップロードに失敗しました。" },
  ibStaffUploadTooLarge: { ko: "파일은 각 200MB 이하여야 합니다.", en: "Each file must be under 200MB.", ru: "Каждый файл — до 200 МБ.", kz: "Әр файл 200МБ-тан аз болуы керек.", zh: "每个文件需小于200MB。", ja: "各ファイルは200MB未満にしてください。" },
  // 환자가 자기 화면에서 치운 것 — 기록은 여기 남는다(2026-08-06 PO)
  ibPatientRemovedBadge: { ko: "환자가 지움", en: "Removed by patient", ru: "Удалено пациентом", kz: "Науқас жойған", zh: "患者已删除", ja: "患者が削除" },
  ibStaffUploadBadge: { ko: "코디 대신 올림", en: "Added by staff", ru: "Добавлено сотрудником", kz: "Қызметкер қосқан", zh: "工作人员代传", ja: "スタッフが追加" },
  ibCaseCard: { ko: "진행 단계 (설정하면 환자·에이전시에게 표시)", en: "Case stage (shown to patient & agency once set)", ru: "Этап дела (после установки виден пациенту и агентству)", kz: "Кезең (орнатылған соң пациент пен агенттікке көрінеді)", zh: "进展阶段（设置后向患者和代理机构显示）", ja: "進捗ステージ（設定すると患者・代理店に表示）" },
  ibCaseNotePlaceholder: { ko: '환자·에이전시에게 표시될 메모 (예: "병원 검토 중, 3일 내 회신")', en: 'Note shown to patient & agency (e.g. "Under hospital review, reply within 3 days")', ru: 'Заметка для пациента и агентства (напр. «На рассмотрении в больнице, ответ в течение 3 дней»)', kz: 'Пациент пен агенттікке көрінетін ескертпе (мыс. "Аурухана қарауда, 3 күн ішінде жауап")', zh: '向患者和代理机构显示的备注（例："医院评估中，3日内回复"）', ja: '患者・代理店に表示されるメモ（例：「病院検討中、3日以内に返信」）' },
  ibCaseSaving: { ko: "저장 중…", en: "Saving…", ru: "Сохранение…", kz: "Сақталуда…", zh: "保存中…", ja: "保存中…" },
  ibCaseSave: { ko: "진행 단계 저장", en: "Save case stage", ru: "Сохранить этап", kz: "Кезеңді сақтау", zh: "保存进展阶段", ja: "進捗ステージを保存" },
  ibCaseSaved: { ko: "저장됨", en: "Saved", ru: "Сохранено", kz: "Сақталды", zh: "已保存", ja: "保存済み" },
  ibIntakeInfoCard: { ko: "접수 정보", en: "Intake info", ru: "Информация о заявке", kz: "Қабылдау ақпараты", zh: "接收信息", ja: "受付情報" },
  ibIntakeChannel: { ko: "접수 경로", en: "Intake channel", ru: "Канал заявки", kz: "Қабылдау арнасы", zh: "接收渠道", ja: "受付経路" },
  // 「환자 직접 접수」라고 단정하지 않는다 — 공개 폼은 접수자가 본인인지 대리인인지 묻지 않고,
  // agency_id 는 «로그인한» 에이전시 계정일 때만 붙는다. 비회원 에이전시가 넣은 건이 여기 걸려
  // 코디가 환자 본인으로 오해했다(2026-08-03 PO 지적). 에이전시를 배정하면 이 줄은 자동으로 바뀐다.
  ibPatientDirectIntake: { ko: "직접 접수 · 에이전시 미배정", en: "Direct intake · no agency assigned", ru: "Прямая заявка · агентство не назначено", kz: "Тікелей өтінім · агенттік тағайындалмаған", zh: "直接接收 · 未分配代理机构", ja: "直接受付 · 代理店未割当" },
  ibStep1Done: { ko: "Step 1 완료", en: "Step 1 done", ru: "Этап 1 завершён", kz: "1-кезең аяқталды", zh: "步骤 1 完成", ja: "ステップ1 完了" },
  ibStep2Done: { ko: "Step 2 완료", en: "Step 2 done", ru: "Этап 2 завершён", kz: "2-кезең аяқталды", zh: "步骤 2 完成", ja: "ステップ2 完了" },
  ibReqCard: { ko: "추가 정보 요청", en: "Request more info", ru: "Запросить доп. информацию", kz: "Қосымша ақпарат сұрау", zh: "请求补充信息", ja: "追加情報をリクエスト" },
  ibReqDesc1: { ko: "환자에게 상세 정보(진단·치료 단계·희망 일정 등) 입력 링크를 보냅니다. 환자는", en: "Send the patient a link to enter details (diagnosis, treatment stage, preferred schedule, etc.). The patient", ru: "Отправьте пациенту ссылку для ввода данных (диагноз, этап лечения, желаемые сроки и т. д.). Пациент", kz: "Пациентке егжей-тегжейлі ақпарат (диагноз, емдеу кезеңі, қалаған кесте т.б.) енгізу сілтемесін жіберіңіз. Пациент", zh: "向患者发送填写详细信息（诊断、治疗阶段、期望日程等）的链接。患者", ja: "患者に詳細情報（診断・治療段階・希望日程など）を入力するリンクを送ります。患者は" },
  ibReqDescBold: { ko: "회원가입·앱 설치 없이", en: "without signing up or installing an app", ru: "без регистрации и установки приложения", kz: "тіркелусіз және қолданба орнатпай", zh: "无需注册或安装应用", ja: "会員登録・アプリ不要で" },
  ibReqDesc2: { ko: " 링크로 바로 작성하고, 완료되면 이 문의에 자동 반영됩니다.", en: " fills it in directly via the link, and it's automatically reflected in this inquiry once done.", ru: " заполняет её прямо по ссылке, и по завершении данные автоматически появляются в этой заявке.", kz: " сілтеме арқылы тікелей толтырады, аяқталған соң осы сұранысқа автоматты түрде енгізіледі.", zh: " 通过链接直接填写，完成后会自动反映到本咨询中。", ja: " リンクから直接入力でき、完了するとこの問い合わせに自動反映されます。" },
  ibReqSending: { ko: "발송 중…", en: "Sending…", ru: "Отправка…", kz: "Жіберілуде…", zh: "发送中…", ja: "送信中…" },
  ibReqButton: { ko: "추가 정보 요청", en: "Request more info", ru: "Запросить доп. информацию", kz: "Қосымша ақпарат сұрау", zh: "请求补充信息", ja: "追加情報をリクエスト" },
  ibReqLast: { ko: "마지막 요청", en: "Last request", ru: "Последний запрос", kz: "Соңғы сұраныс", zh: "上次请求", ja: "最終リクエスト" },
  ibReqSendError: { ko: "요청 발송 중 문제가 발생했습니다.", en: "Something went wrong while sending the request.", ru: "Произошла ошибка при отправке запроса.", kz: "Сұранысты жіберу кезінде қате шықты.", zh: "发送请求时出现问题。", ja: "リクエスト送信中に問題が発生しました。" },
  ibReqEmailSent: { ko: "이메일 발송 완료", en: "Email sent", ru: "Письмо отправлено", kz: "Email жіберілді", zh: "邮件已发送", ja: "メール送信完了" },
  ibReqEmailFailed: { ko: "메일 자동발송은 안 됐어요 ({email}) — 아래 링크를 직접 보내세요.", en: "Auto-email didn't go through ({email}) — send the link below yourself.", ru: "Автоотправка письма не прошла ({email}) — отправьте ссылку ниже вручную.", kz: "Email автожіберу өтпеді ({email}) — төмендегі сілтемені өзіңіз жіберіңіз.", zh: "邮件未能自动发送（{email}）——请手动发送下方链接。", ja: "メールの自動送信ができませんでした（{email}）— 下のリンクを直接送ってください。" },
  ibReqNoEmail: { ko: "이메일 주소가 없어요 — 아래 링크를 직접 보내세요.", en: "No email address — send the link below yourself.", ru: "Нет адреса эл. почты — отправьте ссылку ниже вручную.", kz: "Email мекенжайы жоқ — төмендегі сілтемені өзіңіз жіберіңіз.", zh: "没有电子邮件地址——请手动发送下方链接。", ja: "メールアドレスがありません — 下のリンクを直接送ってください。" },
  ibCopy: { ko: "복사", en: "Copy", ru: "Копировать", kz: "Көшіру", zh: "复制", ja: "コピー" },
  ibCopied: { ko: "복사됨", en: "Copied", ru: "Скопировано", kz: "Көшірілді", zh: "已复制", ja: "コピー済み" },
  ibWaMessage: { ko: "healwith: 치료 안내를 위해 추가 정보를 입력해 주세요", en: "healwith: please share a few more details for your care", ru: "healwith: пожалуйста, укажите ещё немного данных для вашего лечения", kz: "healwith: емдеуге қажет қосымша ақпаратты енгізіңіз", zh: "healwith：请填写更多信息以便为您安排治疗", ja: "healwith: 治療案内のため追加情報をご入力ください" },
  ibWaSend: { ko: "왓츠앱으로 보내기", en: "Send via WhatsApp", ru: "Отправить в WhatsApp", kz: "WhatsApp арқылы жіберу", zh: "通过 WhatsApp 发送", ja: "WhatsAppで送る" },
  ibNextStepDesc: { ko: "병원 치료가능 검토가 끝나면 환자와 화상 상담을 잡습니다.", en: "Once the hospital's feasibility review is done, schedule a video consultation with the patient.", ru: "После проверки возможности лечения в больнице назначьте видеоконсультацию с пациентом.", kz: "Аурухананың емдеу мүмкіндігін қарауы аяқталған соң пациентпен бейнеконсультация тағайындаңыз.", zh: "医院可治疗性评估完成后，安排与患者的视频咨询。", ja: "病院の治療可否検討が終わったら、患者とのビデオ相談を設定します。" },
  ibScheduleConsult: { ko: "상담 일정 잡기", en: "Schedule consultation", ru: "Назначить консультацию", kz: "Консультация жоспарлау", zh: "安排咨询日程", ja: "相談日程を組む" },
  ibFieldDiagnosisTiming: { ko: "진단 시기", en: "Diagnosis timing", ru: "Время постановки диагноза", kz: "Диагноз қою уақыты", zh: "确诊时间", ja: "診断時期" },
  ibFieldCurrentStatus: { ko: "현재 치료 상태", en: "Current treatment status", ru: "Текущий статус лечения", kz: "Ағымдағы емдеу жағдайы", zh: "当前治疗状态", ja: "現在の治療状況" },
  ibFieldEntryTiming: { ko: "입국 희망 시기", en: "Preferred arrival timing", ru: "Желаемое время прибытия", kz: "Қалаған келу уақыты", zh: "期望入境时间", ja: "入国希望時期" },
  ibFieldTreatmentsReceived: { ko: "받은 치료", en: "Treatments received", ru: "Полученное лечение", kz: "Алынған емдеу", zh: "已接受的治疗", ja: "受けた治療" },
  ibFieldDocuments: { ko: "보유 서류", en: "Documents on hand", ru: "Имеющиеся документы", kz: "Қолдағы құжаттар", zh: "持有的文件", ja: "保有書類" },
  ibUnknown: { ko: "모름", en: "Unknown", ru: "Неизвестно", kz: "Белгісіз", zh: "不清楚", ja: "不明" },
  ibDiagLt1m: { ko: "최근 1개월", en: "Within last month", ru: "За последний месяц", kz: "Соңғы 1 айда", zh: "最近1个月", ja: "直近1か月" },
  ibDiag1to6m: { ko: "1~6개월", en: "1–6 months ago", ru: "1–6 месяцев назад", kz: "1–6 ай бұрын", zh: "1~6个月", ja: "1〜6か月" },
  ibDiag6mto1y: { ko: "6개월~1년", en: "6 months–1 year ago", ru: "6 месяцев–1 год назад", kz: "6 ай–1 жыл бұрын", zh: "6个月~1年", ja: "6か月〜1年" },
  ibDiagGt1y: { ko: "1년 이상", en: "Over a year ago", ru: "Более года назад", kz: "1 жылдан астам", zh: "1年以上", ja: "1年以上" },
  ibStage1: { ko: "1기", en: "Stage 1", ru: "Стадия 1", kz: "1-саты", zh: "1期", ja: "1期" },
  ibStage2: { ko: "2기", en: "Stage 2", ru: "Стадия 2", kz: "2-саты", zh: "2期", ja: "2期" },
  ibStage3: { ko: "3기", en: "Stage 3", ru: "Стадия 3", kz: "3-саты", zh: "3期", ja: "3期" },
  ibStage4: { ko: "4기", en: "Stage 4", ru: "Стадия 4", kz: "4-саты", zh: "4期", ja: "4期" },
  ibStatDiagnosed: { ko: "진단만 받음", en: "Diagnosed only", ru: "Только поставлен диагноз", kz: "Тек диагноз қойылған", zh: "仅确诊", ja: "診断のみ" },
  ibStatSurgeryDone: { ko: "수술 받음", en: "Surgery done", ru: "Операция проведена", kz: "Ота жасалған", zh: "已手术", ja: "手術済み" },
  ibStatChemo: { ko: "항암치료 중", en: "On chemotherapy", ru: "Проходит химиотерапию", kz: "Химиотерапия алуда", zh: "化疗中", ja: "化学療法中" },
  ibStatRadiation: { ko: "방사선치료 중", en: "On radiation therapy", ru: "Проходит лучевую терапию", kz: "Сәулелік терапия алуда", zh: "放疗中", ja: "放射線治療中" },
  ibStatCompleted: { ko: "치료 완료", en: "Treatment completed", ru: "Лечение завершено", kz: "Емдеу аяқталды", zh: "治疗完成", ja: "治療完了" },
  ibStatRecurrence: { ko: "재발·전이", en: "Recurrence / metastasis", ru: "Рецидив / метастазы", kz: "Қайталану / метастаз", zh: "复发·转移", ja: "再発・転移" },
  ibEntryLt1m: { ko: "1개월 내", en: "Within 1 month", ru: "В течение 1 месяца", kz: "1 ай ішінде", zh: "1个月内", ja: "1か月以内" },
  ibEntry1to3m: { ko: "1~3개월", en: "1–3 months", ru: "1–3 месяца", kz: "1–3 ай", zh: "1~3个月", ja: "1〜3か月" },
  ibEntryGt3m: { ko: "3개월 이후", en: "After 3 months", ru: "Позже 3 месяцев", kz: "3 айдан кейін", zh: "3个月以后", ja: "3か月以降" },
  ibEntryUndecided: { ko: "미정", en: "Undecided", ru: "Не определено", kz: "Шешілмеген", zh: "未定", ja: "未定" },
  ibTxSurgery: { ko: "수술", en: "Surgery", ru: "Операция", kz: "Ота", zh: "手术", ja: "手術" },
  ibTxChemo: { ko: "항암", en: "Chemotherapy", ru: "Химиотерапия", kz: "Химиотерапия", zh: "化疗", ja: "化学療法" },
  ibTxRadiation: { ko: "방사선", en: "Radiation", ru: "Лучевая терапия", kz: "Сәулелік терапия", zh: "放疗", ja: "放射線" },
  ibTxImmuno: { ko: "면역", en: "Immunotherapy", ru: "Иммунотерапия", kz: "Иммунотерапия", zh: "免疫治疗", ja: "免疫療法" },
  ibTxOriental: { ko: "한방", en: "Oriental medicine", ru: "Восточная медицина", kz: "Шығыс медицинасы", zh: "韩方", ja: "漢方" },
  ibTxNone: { ko: "없음", en: "None", ru: "Нет", kz: "Жоқ", zh: "无", ja: "なし" },
  ibDocPathology: { ko: "병리결과", en: "Pathology report", ru: "Результаты патологии", kz: "Патология нәтижесі", zh: "病理结果", ja: "病理結果" },
  ibDocImaging: { ko: "영상(CT·MRI·PET)", en: "Imaging (CT/MRI/PET)", ru: "Снимки (КТ/МРТ/ПЭТ)", kz: "Бейнелеу (КТ/МРТ/ПЭТ)", zh: "影像(CT·MRI·PET)", ja: "画像(CT・MRI・PET)" },
  ibDocRecords: { ko: "진료기록", en: "Medical records", ru: "Медицинские записи", kz: "Медициналық жазбалар", zh: "诊疗记录", ja: "診療記録" },

  // ── 콘텐츠 편집(/coordinator/content) ─────────────────────
  // 2026-07-29: 이 화면만 한국어로 박혀 있었다 — 정작 매일 쓰는 사람이 러시아어 사용자다.
  // 「{n}」·「{t}」·「{q}」 자리는 부르는 쪽에서 .replace() 로 채운다(이 파일의 기존 관례).
  ceTitle: { ko: "콘텐츠 편집 · 전 화면", en: "Content editing · all screens", ru: "Редактирование контента · все экраны", kz: "Мазмұнды өңдеу · барлық экран", zh: "内容编辑 · 全部页面", ja: "コンテンツ編集 · 全画面" },
  ceSubtitle: { ko: "문구를 검색해 고치면 해당 화면에 바로 반영됩니다.", en: "Search for a phrase and edit it — the change appears on the screen right away.", ru: "Найдите фразу и отредактируйте — изменение сразу появится на экране.", kz: "Мәтінді іздеп өңдесеңіз, экранда бірден көрінеді.", zh: "搜索并修改文案，页面会立即生效。", ja: "文言を検索して直すと、その画面にすぐ反映されます。" },
  ceLogBtn: { ko: "변경 이력", en: "Change history", ru: "История изменений", kz: "Өзгерістер тарихы", zh: "修改记录", ja: "変更履歴" },
  ceEditBtn: { ko: "편집으로", en: "Back to editing", ru: "К редактированию", kz: "Өңдеуге қайту", zh: "返回编辑", ja: "編集に戻る" },
  ceLogEmpty: { ko: "아직 변경 이력이 없습니다.", en: "No changes yet.", ru: "Изменений пока нет.", kz: "Әзірге өзгеріс жоқ.", zh: "暂无修改记录。", ja: "まだ変更履歴はありません。" },
  ceLogSearchPh: { ko: "이력에서 찾기 — 문구·화면 이름·수정한 사람 (예: 췌장, 홈 화면, assel)", en: "Search history — text, screen name or editor (e.g. pancreas, Home, assel)", ru: "Поиск по истории — текст, название экрана или автор (напр.: поджелудочная, Главная, assel)", kz: "Тарихтан іздеу — мәтін, экран атауы, өңдеген адам (мыс.: ұйқы безі, Басты бет, assel)", zh: "搜索记录 — 文案、页面名称或修改人（例：胰腺、首页、assel）", ja: "履歴を検索 — 文言・画面名・修正者（例: 膵臓, ホーム, assel）" },
  ceLogCountAll: { ko: "전체 {t}건 중 {n}건 보는 중 · 최근 것부터", en: "Showing {n} of {t} · newest first", ru: "Показано {n} из {t} · сначала новые", kz: "{t} жазбаның {n} көрсетілді · алдымен жаңалары", zh: "共 {t} 条，显示 {n} 条 · 最新在前", ja: "全{t}件中{n}件を表示 · 新しい順" },
  ceLogCountFound: { ko: "전체 {t}건에서 {n}건 찾음", en: "Found {n} of {t}", ru: "Найдено {n} из {t}", kz: "{t} жазбадан {n} табылды", zh: "共 {t} 条中找到 {n} 条", ja: "全{t}件中{n}件が見つかりました" },
  ceLogLoadingAll: { ko: "전체 {t}건을 불러오는 중입니다 — 잠시만요", en: "Loading all {t} entries — one moment", ru: "Загружаем все {t} записей — секунду", kz: "Барлық {t} жазба жүктелуде — сәл күте тұрыңыз", zh: "正在加载全部 {t} 条 — 请稍候", ja: "全{t}件を読み込んでいます — 少々お待ちください" },
  ceLogNoMatch: { ko: "「{q}」로 찾은 이력이 없습니다.", en: "No history found for “{q}”.", ru: "По запросу «{q}» ничего не найдено.", kz: "«{q}» бойынша ештеңе табылмады.", zh: "未找到与「{q}」相关的记录。", ja: "「{q}」に一致する履歴はありません。" },
  ceLoadMore: { ko: "더 보기 (남은 {n}건)", en: "Load more ({n} left)", ru: "Показать ещё (осталось {n})", kz: "Тағы көрсету (қалғаны {n})", zh: "加载更多（还剩 {n} 条）", ja: "もっと見る（残り{n}件）" },
  ceLogEnd: { ko: "여기까지가 전부입니다 · 총 {n}건", en: "That is everything · {n} in total", ru: "Это всё · всего {n}", kz: "Осымен бітті · барлығы {n}", zh: "已全部显示 · 共 {n} 条", ja: "ここまでで全部です · 全{n}件" },
  ceLoading: { ko: "불러오는 중…", en: "Loading…", ru: "Загрузка…", kz: "Жүктелуде…", zh: "加载中…", ja: "読み込み中…" },
  ceScreenUnknown: { ko: "화면 미확인", en: "Screen unknown", ru: "Экран не определён", kz: "Экран анықталмаған", zh: "页面未确定", ja: "画面が未確認" },
  ceScreenNotFound: { ko: "화면 못 찾음", en: "Screen not found", ru: "Экран не найден", kz: "Экран табылмады", zh: "未找到页面", ja: "画面が見つからない" },
  ceScreenUnknownTitle: { ko: "이 문구가 어느 화면인지 아직 목록에 없습니다 — 알려주시면 채워 넣습니다", en: "We have not mapped this phrase to a screen yet — tell us and we will add it.", ru: "Мы ещё не определили, к какому экрану относится эта фраза — сообщите нам, и мы добавим.", kz: "Бұл мәтіннің қай экранға тиесілі екенін әлі белгілемедік — айтсаңыз, қосамыз.", zh: "我们尚未确定该文案属于哪个页面——告诉我们即可补上。", ja: "この文言がどの画面のものか、まだ一覧にありません — 教えていただければ追加します。" },
  ceOpenScreen: { ko: "화면 열기 ↗", en: "Open screen ↗", ru: "Открыть экран ↗", kz: "Экранды ашу ↗", zh: "打开页面 ↗", ja: "画面を開く ↗" },
  ceEmptyValue: { ko: "(빈칸)", en: "(empty)", ru: "(пусто)", kz: "(бос)", zh: "（空）", ja: "（空欄）" },
  ceRevertedToDefault: { ko: "(기본값으로 되돌림)", en: "(reverted to default)", ru: "(возврат к исходному)", kz: "(әдепкіге қайтарылды)", zh: "（已恢复默认）", ja: "（既定値に戻した）" },
  ceDefaultBadge: { ko: "기본값", en: "Default", ru: "Исходный", kz: "Әдепкі", zh: "默认", ja: "既定値" },
  ceDefaultBadgeTitle: { ko: "이 문구를 처음 고친 것 — 이전 값은 원래 기본 문구입니다", en: "First edit of this phrase — the “previous” side shows the original built-in wording.", ru: "Это первая правка фразы — слева показан исходный встроенный текст.", kz: "Бұл мәтін алғаш рет өңделді — сол жақта бастапқы мәтін тұр.", zh: "这是该文案的首次修改——左侧显示的是原始默认文案。", ja: "この文言を初めて直したものです — 「以前」側は元の既定文言です。" },
  ceSearchPh: { ko: "전 화면 텍스트 검색 (예: 상담, консультация)", en: "Search text across all screens (e.g. consultation, консультация)", ru: "Поиск текста по всем экранам (напр.: консультация, consultation)", kz: "Барлық экраннан мәтін іздеу (мыс.: консультация, consultation)", zh: "搜索全部页面文案（例：咨询、консультация）", ja: "全画面のテキスト検索（例: 相談, консультация）" },
  ceEditLang: { ko: "편집 언어", en: "Editing language", ru: "Язык правки", kz: "Өңдеу тілі", zh: "编辑语言", ja: "編集言語" },
  ceLangHint: { ko: "언어는 한 번 고르면 유지됩니다 · 줄마다 진한 언어 표시가 «직접 고친 언어»입니다(눌러서 그 언어로 전환) · 줄을 펼치면 6개어 전부 · 이미 고친 문구로도 검색됩니다", en: "The language you pick is remembered · A solid language mark on a row means that language was edited by hand (click it to switch) · Expand a row to see all 6 languages · You can also search by wording you already changed", ru: "Выбранный язык запоминается · Тёмная отметка языка в строке — этот язык правили вручную (нажмите, чтобы перейти на него) · Разверните строку, чтобы увидеть все 6 языков · Искать можно и по уже исправленным фразам", kz: "Таңдалған тіл есте сақталады · Жолдағы қою тіл белгісі — сол тіл қолмен өңделген (басып ауысыңыз) · Жолды ашсаңыз, 6 тілдің бәрі көрінеді · Өзгерткен мәтін бойынша да іздеуге болады", zh: "所选语言会被记住 · 行内深色语言标记表示该语言是手动修改过的（点击可切换）· 展开行可看到全部 6 种语言 · 也可以用已修改的文案搜索", ja: "選んだ言語は保持されます · 行の濃い言語表示は「手で直した言語」です（押すとその言語に切替）· 行を開くと6言語すべて · 直した文言でも検索できます" },
  ceLinebreakHint: { ko: "줄바꿈(Enter)은 화면에 그대로 반영됩니다 · 줄바꿈 없이 길게 쓰면 화면 폭에 맞춰 자동 줄바꿈 · 줄바꿈이 안 먹는 화면을 발견하면 알려주세요", en: "Line breaks (Enter) appear on the screen exactly as typed · Long text without breaks wraps automatically to the screen width · Tell us if you find a screen where line breaks do not work", ru: "Переносы строк (Enter) отображаются на экране как есть · Длинный текст без переносов переносится автоматически по ширине · Если на каком-то экране переносы не работают — сообщите", kz: "Жол ауыстыру (Enter) экранда сол күйінде көрінеді · Ұзын мәтін ені бойынша өздігінен тасымалданады · Жол ауыстыру жұмыс істемейтін экран кездессе, хабарлаңыз", zh: "换行（Enter）会原样显示在页面上 · 不换行的长文本会按页面宽度自动折行 · 如发现换行无效的页面请告知", ja: "改行（Enter）は画面にそのまま反映されます · 改行なしの長文は画面幅に合わせて自動折り返し · 改行が効かない画面を見つけたら教えてください" },
  ceSearching: { ko: "검색 중…", en: "Searching…", ru: "Идёт поиск…", kz: "Ізделуде…", zh: "搜索中…", ja: "検索中…" },
  ceNoResult: { ko: "「{q}」로 찾은 문구가 없습니다.", en: "No phrases found for “{q}”.", ru: "По запросу «{q}» фраз не найдено.", kz: "«{q}» бойынша мәтін табылмады.", zh: "未找到与「{q}」相关的文案。", ja: "「{q}」に一致する文言はありません。" },
  ceStartHint: { ko: "위에서 바꾸고 싶은 문구를 검색하세요 (한국어·러시아어 등 아무 언어).", en: "Search above for the phrase you want to change (in any language).", ru: "Найдите вверху фразу, которую хотите изменить (на любом языке).", kz: "Жоғарыдан өзгерткіңіз келетін мәтінді іздеңіз (кез келген тілде).", zh: "在上方搜索你想修改的文案（任何语言均可）。", ja: "上で直したい文言を検索してください（どの言語でも可）。" },
  ceBlockTitle: { ko: "같은 화면 블록의 다른 문구(제목·부제·카드)를 함께 보고 한 번에 고칠 수 있습니다", en: "See and edit the other phrases of the same screen block (title, subtitle, cards) in one place", ru: "Показать и править остальные фразы того же блока экрана (заголовок, подзаголовок, карточки) в одном месте", kz: "Сол экран блогының басқа мәтіндерін (тақырып, қосымша тақырып, карточка) бірге көріп өңдеу", zh: "一并查看并修改同一区块的其他文案（标题、副标题、卡片）", ja: "同じ画面ブロックの他の文言（見出し・小見出し・カード）をまとめて直せます" },
  ceMatchedOnly: { ko: "일치한 것만 보기", en: "Show matches only", ru: "Только совпадения", kz: "Тек сәйкестерін", zh: "仅显示匹配项", ja: "一致したものだけ" },
  ceBlockShow: { ko: "같은 블록 함께 보기 (+{n}줄)", en: "Show same block (+{n})", ru: "Показать весь блок (+{n})", kz: "Бүкіл блокты көрсету (+{n})", zh: "显示同一区块（+{n}）", ja: "同じブロックも表示（+{n}行）" },
  ceBlockBadge: { ko: "같은 블록", en: "Same block", ru: "Тот же блок", kz: "Сол блок", zh: "同一区块", ja: "同じブロック" },
  ceBlockBadgeTitle: { ko: "검색어와 직접 일치하진 않지만 같은 화면 블록이라 함께 표시", en: "Not a direct match — shown because it belongs to the same screen block", ru: "Не прямое совпадение — показано, потому что относится к тому же блоку экрана", kz: "Тікелей сәйкес емес — сол экран блогына жататындықтан көрсетілді", zh: "并非直接匹配——因属于同一区块而一并显示", ja: "検索語に直接一致はしませんが、同じ画面ブロックなので一緒に表示" },
  ceDup: { ko: "문구 중복", en: "Duplicate text", ru: "Дубликат текста", kz: "Мәтін қайталанған", zh: "文案重复", ja: "文言の重複" },
  ceDupTitle: { ko: "같은 묶음의 다른 선택지와 문구가 똑같습니다. 선택 버튼끼리 글자가 겹치면 환자가 무엇을 고르는지 알 수 없습니다 — 확인해 주세요.", en: "This text is identical to another option in the same group. If choice buttons share wording, the patient cannot tell what they are selecting — please check.", ru: "Этот текст совпадает с другим вариантом того же набора. Если кнопки выбора одинаковы, пациент не понимает, что выбирает, — проверьте, пожалуйста.", kz: "Бұл мәтін сол топтағы басқа нұсқамен бірдей. Таңдау түймелері бірдей болса, науқас нені таңдап тұрғанын білмейді — тексеріңіз.", zh: "该文案与同组的另一个选项完全相同。若选择按钮文字重复，患者无法分辨在选什么——请确认。", ja: "同じグループの別の選択肢と文言が同一です。選択ボタンの文字が重なると患者が何を選ぶか分かりません — ご確認ください。" },
  ceLangNow: { ko: "지금 편집 중", en: "editing now", ru: "сейчас редактируется", kz: "қазір өңделуде", zh: "正在编辑", ja: "編集中" },
  ceLangEdited: { ko: "직접 고친 언어", en: "edited by hand", ru: "правился вручную", kz: "қолмен өңделген", zh: "已手动修改", ja: "手で直した言語" },
  ceLangEditedLong: { ko: "코디가 직접 고친 언어", en: "edited by a coordinator", ru: "правил координатор", kz: "үйлестіруші өңдеген", zh: "协调员已修改", ja: "コーディネーターが直した言語" },
  ceLangDefault: { ko: "기본 문구 그대로", en: "built-in wording", ru: "исходный текст", kz: "әдепкі мәтін", zh: "使用默认文案", ja: "既定の文言のまま" },
  ceLangSwitchHint: { ko: "누르면 이 언어를 편집합니다", en: "click to edit this language", ru: "нажмите, чтобы править этот язык", kz: "басыңыз — осы тілді өңдейсіз", zh: "点击以编辑该语言", ja: "押すとこの言語を編集します" },
  ceCollapse: { ko: "접기 ▲", en: "Collapse ▲", ru: "Свернуть ▲", kz: "Жию ▲", zh: "收起 ▲", ja: "折りたたむ ▲" },
  ceExpand: { ko: "6개어 펼치기 ▾", en: "Show all 6 languages ▾", ru: "Показать все 6 языков ▾", kz: "6 тілді ашу ▾", zh: "展开 6 种语言 ▾", ja: "6言語を表示 ▾" },
  ceChangedCount: { ko: "{n}곳 변경됨", en: "{n} changed", ru: "Изменено: {n}", kz: "{n} орын өзгерді", zh: "已修改 {n} 处", ja: "{n}か所変更" },
  ceNoChange: { ko: "변경 없음", en: "No changes", ru: "Изменений нет", kz: "Өзгеріс жоқ", zh: "无修改", ja: "変更なし" },
  ceSave: { ko: "저장", en: "Save", ru: "Сохранить", kz: "Сақтау", zh: "保存", ja: "保存" },
  ceSaving: { ko: "저장 중…", en: "Saving…", ru: "Сохранение…", kz: "Сақталуда…", zh: "保存中…", ja: "保存中…" },
  ceSaved: { ko: "저장됨 ({n}건). 화면에 반영됩니다.", en: "Saved ({n}). The screens are updated.", ru: "Сохранено ({n}). Изменения применены к экранам.", kz: "Сақталды ({n}). Экранға қолданылды.", zh: "已保存（{n} 项），页面已更新。", ja: "保存しました（{n}件）。画面に反映されます。" },
  ceSaveFail: { ko: "저장 실패 (권한 또는 서버 오류).", en: "Save failed (permission or server error).", ru: "Не удалось сохранить (нет прав или ошибка сервера).", kz: "Сақталмады (рұқсат немесе сервер қатесі).", zh: "保存失败（权限或服务器错误）。", ja: "保存に失敗しました（権限またはサーバーエラー）。" },
  ceSaveFailNet: { ko: "저장 실패 (네트워크).", en: "Save failed (network).", ru: "Не удалось сохранить (сеть).", kz: "Сақталмады (желі).", zh: "保存失败（网络）。", ja: "保存に失敗しました（ネットワーク）。" },
  ceConfirmTitle: { ko: "저장 전 확인", en: "Check before saving", ru: "Проверка перед сохранением", kz: "Сақтау алдында тексеру", zh: "保存前确认", ja: "保存前の確認" },
  ceConfirmHead: { ko: "이렇게 바꿉니다 · {n}곳", en: "These {n} change(s) will be saved", ru: "Будет изменено: {n}", kz: "Мынау өзгереді · {n} орын", zh: "将做以下 {n} 处修改", ja: "このように変更します · {n}か所" },
  ceConfirmDesc: { ko: "항목과 바뀌는 내용을 한 번만 확인해 주세요. 엉뚱한 줄이 바뀌고 있진 않은지 보는 자리입니다.", en: "Please check the item and what it changes to. This is where you can spot the wrong row being changed.", ru: "Проверьте, пожалуйста, пункт и на что он меняется. Здесь видно, не меняется ли случайно не та строка.", kz: "Тармақ пен өзгеретін мазмұнды бір рет тексеріңіз. Бөтен жол өзгеріп жатқанын осы жерден байқайсыз.", zh: "请确认条目及其修改内容。这里可以发现是否改错了行。", ja: "項目と変わる内容を一度ご確認ください。違う行が変わっていないかを見る場所です。" },
  ceConfirmBack: { ko: "다시 볼게요", en: "Let me check again", ru: "Ещё посмотрю", kz: "Тағы қарайын", zh: "我再看看", ja: "もう一度見る" },
  ceConfirmSave: { ko: "이대로 저장", en: "Save as is", ru: "Сохранить так", kz: "Осылай сақтау", zh: "就这样保存", ja: "このまま保存" },

  // 변경 이력에 붙는 「어느 화면인가」 이름표. id 는 src/lib/content/keyLocation.js 의 앞머리와 같다.
  // 사전에 없으면 화면이 keyLocation 의 한국어 이름으로 폴백한다 — 새 화면을 넣어도 안 깨진다.
  ceScr_home: { ko: "홈 화면", en: "Home screen", ru: "Главная", kz: "Басты бет", zh: "首页", ja: "ホーム画面" },
  ceScr_socialProof: { ko: "홈·치료 여정 화면의 「신뢰 지표」 구역", en: "“Trust indicators” block on Home / Care journey", ru: "Блок «Показатели доверия» на Главной и в «Пути лечения»", kz: "Басты бет пен «Емдеу жолы» бетіндегі «Сенім көрсеткіштері» блогы", zh: "首页与治疗旅程页的「信任指标」区块", ja: "ホーム・治療の流れ画面の「信頼指標」ブロック" },
  ceScr_telemedicine: { ko: "원격협진 안내", en: "Telemedicine page", ru: "Страница телемедицины", kz: "Телемедицина беті", zh: "远程会诊介绍", ja: "遠隔協診の案内" },
  ceScr_careJourney: { ko: "치료 여정 안내", en: "Care journey page", ru: "Страница «Путь лечения»", kz: "«Емдеу жолы» беті", zh: "治疗旅程介绍", ja: "治療の流れ案内" },
  ceScr_costCalc: { ko: "비용 계산기", en: "Cost calculator", ru: "Калькулятор стоимости", kz: "Құн калькуляторы", zh: "费用计算器", ja: "費用計算ツール" },
  ceScr_hospitalsPage: { ko: "병원 목록", en: "Hospital list", ru: "Список больниц", kz: "Аурухана тізімі", zh: "医院列表", ja: "病院一覧" },
  ceScr_treatmentsPage: { ko: "치료 안내 목록", en: "Treatment list", ru: "Список методов лечения", kz: "Емдеу әдістерінің тізімі", zh: "治疗介绍列表", ja: "治療案内一覧" },
  ceScr_faqData: { ko: "자주 묻는 질문(문답 내용)", en: "FAQ (questions and answers)", ru: "Частые вопросы (вопросы и ответы)", kz: "Жиі қойылатын сұрақтар (сұрақ-жауап)", zh: "常见问题（问答内容）", ja: "よくある質問（Q&A本文）" },
  ceScr_about: { ko: "회사 소개", en: "About us", ru: "О компании", kz: "Компания туралы", zh: "公司介绍", ja: "会社紹介" },
  ceScr_km: { ko: "한방 특화 안내", en: "Korean medicine page", ru: "Страница корейской медицины", kz: "Корей медицинасы беті", zh: "韩方特色介绍", ja: "韓方特化の案内" },
  ceScr_detail: { ko: "병원·치료 상세 화면", en: "Hospital / treatment detail screen", ru: "Страница деталей больницы или лечения", kz: "Аурухана не емдеу егжей-тегжейі беті", zh: "医院·治疗详情页", ja: "病院・治療の詳細画面" },
  ceScr_signup: { ko: "회원가입 화면", en: "Sign-up screen", ru: "Экран регистрации", kz: "Тіркелу экраны", zh: "注册页面", ja: "会員登録画面" },
  ceScr_nav: { ko: "화면 위쪽 메뉴(전 화면 공통)", en: "Top menu (all screens)", ru: "Верхнее меню (на всех экранах)", kz: "Жоғарғы мәзір (барлық экранда)", zh: "页面顶部菜单（全站通用）", ja: "画面上部メニュー（全画面共通）" },
  ceScr_footer: { ko: "화면 맨 아래 정보(전 화면 공통)", en: "Footer (all screens)", ru: "Нижний блок (на всех экранах)", kz: "Төменгі блок (барлық экранда)", zh: "页面底部信息（全站通用）", ja: "画面最下部の情報（全画面共通）" },
  ceScr_cta: { ko: "여러 화면의 「상담 신청」 구역", en: "“Request a consultation” block on several screens", ru: "Блок «Оставить заявку» на нескольких экранах", kz: "Бірнеше экрандағы «Кеңеске жазылу» блогы", zh: "多个页面的「咨询申请」区块", ja: "複数画面の「相談申込」ブロック" },
  ceScr_inquiryFunnel: { ko: "문의폼", en: "Inquiry form", ru: "Форма заявки", kz: "Өтінім формасы", zh: "咨询表单", ja: "問い合わせフォーム" },
  ceScr_intakeLabels: { ko: "문의폼 선택 버튼(암종·병기 등)", en: "Inquiry form choice buttons (cancer type, stage…)", ru: "Кнопки выбора в форме заявки (тип рака, стадия…)", kz: "Өтінім формасындағы таңдау түймелері (қатерлі ісік түрі, сатысы…)", zh: "咨询表单选择按钮（癌种、分期等）", ja: "問い合わせフォームの選択ボタン（がん種・病期など）" },
  ceScr_chat: { ko: "문의 채팅창", en: "Inquiry chat window", ru: "Окно чата заявки", kz: "Өтінім чат терезесі", zh: "咨询聊天窗口", ja: "問い合わせチャット" },
  ceScr_patientChatUI: { ko: "환자 화면 · AI 채팅", en: "Patient screen · AI chat", ru: "Экран пациента · AI-чат", kz: "Науқас экраны · AI чат", zh: "患者页面 · AI 聊天", ja: "患者画面 · AIチャット" },
  ceScr_patientVisa: { ko: "환자 화면 · 비자", en: "Patient screen · Visa", ru: "Экран пациента · Виза", kz: "Науқас экраны · Виза", zh: "患者页面 · 签证", ja: "患者画面 · ビザ" },
  ceScr_patientConsults: { ko: "환자 화면 · 상담 목록", en: "Patient screen · Consultation list", ru: "Экран пациента · Список консультаций", kz: "Науқас экраны · Консультация тізімі", zh: "患者页面 · 咨询列表", ja: "患者画面 · 相談一覧" },
  ceScr_visaApps: { ko: "환자 화면 · 비자 신청 목록", en: "Patient screen · Visa applications", ru: "Экран пациента · Заявления на визу", kz: "Науқас экраны · Виза өтінімдері", zh: "患者页面 · 签证申请列表", ja: "患者画面 · ビザ申請一覧" },
  ceScr_visaAppDetail: { ko: "환자 화면 · 비자 신청 상세", en: "Patient screen · Visa application detail", ru: "Экран пациента · Детали заявления на визу", kz: "Науқас экраны · Виза өтінімінің егжей-тегжейі", zh: "患者页面 · 签证申请详情", ja: "患者画面 · ビザ申請の詳細" },
  ceScr_costDetail: { ko: "환자 화면 · 견적 상세", en: "Patient screen · Quote detail", ru: "Экран пациента · Детали сметы", kz: "Науқас экраны · Смета егжей-тегжейі", zh: "患者页面 · 报价详情", ja: "患者画面 · 見積もり詳細" },
  ceScr_seo: { ko: "검색엔진용 설명", en: "Search-engine description", ru: "Описание для поисковых систем", kz: "Іздеу жүйелеріне арналған сипаттама", zh: "搜索引擎用描述", ja: "検索エンジン用の説明" },
  ceScr_homeSearch: { ko: "홈 검색창", en: "Home search box", ru: "Поисковая строка на Главной", kz: "Басты беттегі іздеу жолағы", zh: "首页搜索框", ja: "ホームの検索窓" },

  // 이름표 옆에 붙는 비고(노란 배지)
  ceNote_deadGeneric: { ko: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다", en: "We could not find a screen using this — editing it may change nothing", ru: "Не нашли экран, где это используется — правка может ничего не изменить", kz: "Мұны қолданатын экранды таппадық — өңдеу ештеңе өзгертпеуі мүмкін", zh: "未找到使用该文案的页面——修改后可能不会显示", ja: "使っている画面が見つかりません — 直しても表示されない可能性があります" },
  ceNote_deadFaq: { ko: "쓰는 화면을 못 찾음 — 지금 「자주 묻는 질문」은 faqData 를 씁니다", en: "Not used — the FAQ page now uses faqData", ru: "Не используется — страница вопросов теперь берёт faqData", kz: "Қолданылмайды — сұрақтар беті енді faqData алады", zh: "未被使用——常见问题页现在使用 faqData", ja: "使われていません — 「よくある質問」は今 faqData を使います" },
  ceNote_deadMeta: { ko: "쓰는 화면을 못 찾음 — 지금은 seo 를 씁니다", en: "Not used — seo is used instead now", ru: "Не используется — сейчас используется seo", kz: "Қолданылмайды — қазір seo қолданылады", zh: "未被使用——现在使用 seo", ja: "使われていません — 今は seo を使います" },
  ceNote_deadSearch: { ko: "쓰는 화면을 못 찾음 — 옛 검색결과 화면 잔재(홈 검색창 2개만 예외)", en: "Left over from the old search-results screen (only the 2 home search-box items are live)", ru: "Остаток старого экрана результатов поиска (живы только 2 пункта строки поиска на Главной)", kz: "Ескі іздеу нәтижелері экранының қалдығы (тек Басты беттегі 2 іздеу жолағы жұмыс істейді)", zh: "旧搜索结果页的遗留（仅首页搜索框的 2 项仍在使用）", ja: "旧・検索結果画面の名残（ホーム検索窓の2件のみ有効）" },
  ceNote_patientOnly: { ko: "환자 로그인 후 화면", en: "Shown after the patient logs in", ru: "Экран после входа пациента", kz: "Науқас кіргеннен кейінгі экран", zh: "患者登录后的页面", ja: "患者ログイン後の画面" },
  ceNote_seoOnly: { ko: "화면에는 안 보이고 구글 검색 결과에 쓰입니다", en: "Not shown on screen — used in Google search results", ru: "На экране не видно — используется в результатах поиска Google", kz: "Экранда көрінбейді — Google іздеу нәтижелерінде қолданылады", zh: "页面上不显示——用于 Google 搜索结果", ja: "画面には出ず、Google の検索結果に使われます" },

  // 홈 문구의 «자리 이름» 낱말 — 「통계 / 항목1 · 문구」 처럼 조립된다.
  // 열쇠는 src/lib/content/registry.js 의 SECTION_LABELS · FIELD_LABELS 와 같다(그쪽이 한국어 원본).
  ceSec_hero: { ko: "히어로", en: "Hero", ru: "Первый экран", kz: "Бірінші экран", zh: "首屏", ja: "ヒーロー" },
  ceSec_stats: { ko: "통계", en: "Stats", ru: "Показатели", kz: "Көрсеткіштер", zh: "数据", ja: "統計" },
  ceSec_doctors: { ko: "의료진", en: "Doctors", ru: "Врачи", kz: "Дәрігерлер", zh: "医疗团队", ja: "医療陣" },
  ceSec_services: { ko: "서비스", en: "Services", ru: "Услуги", kz: "Қызметтер", zh: "服务", ja: "サービス" },
  ceSec_process: { ko: "절차", en: "Process", ru: "Как это работает", kz: "Қалай жұмыс істейді", zh: "流程", ja: "手順" },
  ceSec_cancers: { ko: "암종", en: "Cancer types", ru: "Виды рака", kz: "Қатерлі ісік түрлері", zh: "癌种", ja: "がん種" },
  ceSec_partners: { ko: "파트너", en: "Partners", ru: "Партнёры", kz: "Серіктестер", zh: "合作伙伴", ja: "パートナー" },
  ceSec_faq: { ko: "FAQ", en: "FAQ", ru: "Частые вопросы", kz: "Жиі сұрақтар", zh: "常见问题", ja: "FAQ" },
  ceSec_emergency: { ko: "응급안내", en: "Emergency info", ru: "Экстренная помощь", kz: "Шұғыл көмек", zh: "紧急指引", ja: "緊急案内" },
  ceSec_bottomCta: { ko: "CTA(하단)", en: "Bottom CTA", ru: "Нижний блок действия", kz: "Төменгі әрекет блогы", zh: "底部行动区", ja: "下部CTA" },
  ceSec_misc: { ko: "기타", en: "Other", ru: "Прочее", kz: "Басқа", zh: "其他", ja: "その他" },

  ceFld_badge: { ko: "배지", en: "Badge", ru: "Плашка", kz: "Белгі", zh: "标签", ja: "バッジ" },
  ceFld_title: { ko: "제목", en: "Title", ru: "Заголовок", kz: "Тақырып", zh: "标题", ja: "タイトル" },
  ceFld_subtitle: { ko: "부제", en: "Subtitle", ru: "Подзаголовок", kz: "Қосымша тақырып", zh: "副标题", ja: "サブタイトル" },
  ceFld_cta: { ko: "버튼", en: "Button", ru: "Кнопка", kz: "Түйме", zh: "按钮", ja: "ボタン" },
  ceFld_ctaSub: { ko: "버튼 소제목", en: "Button subtitle", ru: "Подпись кнопки", kz: "Түйме сипаттамасы", zh: "按钮副文案", ja: "ボタン小見出し" },
  ceFld_desc: { ko: "설명", en: "Description", ru: "Описание", kz: "Сипаттама", zh: "说明", ja: "説明" },
  ceFld_label: { ko: "문구", en: "Text", ru: "Текст", kz: "Мәтін", zh: "文案", ja: "文言" },
  ceFld_value: { ko: "수치", en: "Value", ru: "Значение", kz: "Мән", zh: "数值", ja: "数値" },
  ceFld_viewAll: { ko: "전체보기", en: "View all", ru: "Смотреть все", kz: "Барлығын көру", zh: "查看全部", ja: "すべて見る" },
  ceFld_name: { ko: "이름", en: "Name", ru: "Имя", kz: "Аты", zh: "名称", ja: "名前" },
  ceFld_items: { ko: "항목", en: "Item", ru: "Пункт", kz: "Тармақ", zh: "项", ja: "項目" },
  ceFld_steps: { ko: "단계", en: "Step", ru: "Шаг", kz: "Қадам", zh: "步骤", ja: "ステップ" },
  ceFld_q: { ko: "질문", en: "Question", ru: "Вопрос", kz: "Сұрақ", zh: "问题", ja: "質問" },
  ceFld_a: { ko: "답변", en: "Answer", ru: "Ответ", kz: "Жауап", zh: "回答", ja: "回答" },
  ceFld_specialty: { ko: "전문분야", en: "Specialty", ru: "Специализация", kz: "Мамандығы", zh: "专业领域", ja: "専門分野" },
  ceFld_tabs: { ko: "탭", en: "Tab", ru: "Вкладка", kz: "Қойынды", zh: "标签页", ja: "タブ" },
  ceFld_general: { ko: "일반", en: "General", ru: "Общее", kz: "Жалпы", zh: "一般", ja: "一般" },
  ceFld_cost: { ko: "비용", en: "Cost", ru: "Стоимость", kz: "Құны", zh: "费用", ja: "費用" },
  ceFld_consultation: { ko: "상담", en: "Consultation", ru: "Консультация", kz: "Кеңес", zh: "咨询", ja: "相談" },
  ceFld_badgePartner: { ko: "배지(파트너)", en: "Badge (partner)", ru: "Плашка (партнёр)", kz: "Белгі (серіктес)", zh: "标签（合作伙伴）", ja: "バッジ（パートナー）" },
  ceFld_badgeUniversity: { ko: "배지(대학병원)", en: "Badge (university hospital)", ru: "Плашка (университетская клиника)", kz: "Белгі (университет клиникасы)", zh: "标签（大学医院）", ja: "バッジ（大学病院）" },
  ceFld_fast: { ko: "신속", en: "Fast", ru: "Быстро", kz: "Жылдам", zh: "快速", ja: "迅速" },
  ceFld_free: { ko: "무료", en: "Free", ru: "Бесплатно", kz: "Тегін", zh: "免费", ja: "無料" },
  ceFld_noObligation: { ko: "부담없음", en: "No obligation", ru: "Без обязательств", kz: "Міндеттемесіз", zh: "无负担", ja: "負担なし" },
  ceFld_onlineInquiry: { ko: "온라인 문의", en: "Online inquiry", ru: "Онлайн-заявка", kz: "Онлайн өтінім", zh: "在线咨询", ja: "オンライン問い合わせ" },
  ceFld_viewTreatments: { ko: "치료법 보기", en: "View treatments", ru: "Смотреть методы лечения", kz: "Емдеу әдістерін көру", zh: "查看治疗方法", ja: "治療法を見る" },

  // ── 문의함 상세 · 전문의 소견(세컨드 오피니언) 블록 ─────────────
  // 2026-07-29: 코디가 매일 쓰는 화면인데 이 블록만 한국어로 박혀 있었다.
  soTitle: { ko: "전문의 소견 (세컨드 오피니언)", en: "Specialist opinion (second opinion)", ru: "Заключение специалиста (второе мнение)", kz: "Маман қорытындысы (екінші пікір)", zh: "专科医生意见（第二意见）", ja: "専門医の所見（セカンドオピニオン）" },
  soDesc: { ko: "협력병원·전문의에게 소견 요청 링크를 보내고, 받은 소견을 여기서 확인합니다. (코디·어드민 전용)", en: "Send a request link to a partner hospital or specialist and review the opinions you receive here. (Coordinators and admins only)", ru: "Отправьте ссылку-запрос партнёрской больнице или специалисту и просматривайте полученные заключения здесь. (Только для координаторов и админов)", kz: "Серіктес ауруханаға немесе маманға сұраныс сілтемесін жіберіп, келген қорытындыларды осында қараңыз. (Тек үйлестіруші мен әкімшіге)", zh: "向合作医院或专科医生发送意见请求链接，并在此查看收到的意见。（仅协调员和管理员）", ja: "提携病院・専門医に所見依頼リンクを送り、届いた所見をここで確認します。（コーディネーター・管理者専用）" },
  soLoading: { ko: "불러오는 중…", en: "Loading…", ru: "Загрузка…", kz: "Жүктелуде…", zh: "加载中…", ja: "読み込み中…" },
  soNewLink: { ko: "새 링크 만들기", en: "Create a new link", ru: "Создать новую ссылку", kz: "Жаңа сілтеме жасау", zh: "创建新链接", ja: "新しいリンクを作成" },
  soLinkHint: { ko: "링크를 카톡 등으로 원장님께 보내세요. 원장님은 로그인 없이 소견을 남깁니다.", en: "Send the link to the doctor (e.g. by messenger). They can leave an opinion without logging in.", ru: "Отправьте ссылку врачу (например, в мессенджере). Он оставит заключение без входа в систему.", kz: "Сілтемені дәрігерге жіберіңіз (мысалы, мессенджермен). Ол жүйеге кірмей-ақ қорытынды қалдырады.", zh: "把链接发给医生（例如通过聊天软件）。医生无需登录即可留下意见。", ja: "リンクを先生にメッセンジャー等で送ってください。ログインなしで所見を書けます。" },
  soCopySummary: { ko: "카톡 붙여넣기용 요약", en: "Summary to paste into a chat", ru: "Сводка для вставки в мессенджер", kz: "Мессенджерге қоюға арналған қысқаша мәтін", zh: "可粘贴到聊天软件的摘要", ja: "メッセンジャー貼り付け用の要約" },
  soNone: { ko: "아직 도착한 소견이 없습니다.", en: "No opinions have arrived yet.", ru: "Заключений пока нет.", kz: "Әзірге қорытынды келген жоқ.", zh: "尚未收到意见。", ja: "まだ届いた所見はありません。" },
  soManualEntry: { ko: "이미 받은 소견 직접 입력", en: "Enter an opinion you already received", ru: "Ввести уже полученное заключение", kz: "Бұрын алынған қорытындыны енгізу", zh: "手动录入已收到的意见", ja: "すでに受け取った所見を直接入力" },
  soAuthorPh: { ko: "소견 주신 분 (예: ○○대병원 종양내과 김○○)", en: "Who gave the opinion (e.g. Dr. Kim, Oncology, ○○ University Hospital)", ru: "Кто дал заключение (напр.: д-р Ким, онкология, больница ○○)", kz: "Қорытынды берген адам (мыс.: д-р Ким, онкология, ○○ ауруханасы)", zh: "提供意见的人（例：○○大学医院肿瘤内科 金医生）", ja: "所見をくださった方（例: ○○大学病院 腫瘍内科 金先生）" },
  soAuthorPhOpt: { ko: "소견 주신 분 — 환자 화면에 이 이름이 그대로 뜬다(환자 언어로: 예 Хван И Джун)", en: "Who gave the opinion — shown to the patient as typed (use the patient’s language)", ru: "Кто дал заключение (напр.: д-р Ким, онкология, больница ○○) — при необходимости", kz: "Қорытынды берген адам (мыс.: д-р Ким, онкология, ○○ ауруханасы) — қажет болса", zh: "提供意见的人（例：○○大学医院肿瘤内科 金医生）— 可选备注", ja: "所見をくださった方（例: ○○大学病院 腫瘍内科 金先生）— 必要ならメモ" },
  soBodyPh: { ko: "받은 소견 원문을 그대로 붙여넣으세요 (또는 아래에 문서·이미지로 첨부)", en: "Paste the original opinion text as received (or attach a document or image below)", ru: "Вставьте текст заключения как есть (или прикрепите документ либо изображение ниже)", kz: "Қорытынды мәтінін сол күйінде қойыңыз (немесе төменде құжат не сурет тіркеңіз)", zh: "请原样粘贴收到的意见原文（或在下方附上文档、图片）", ja: "受け取った所見の原文をそのまま貼り付けてください（または下に文書・画像を添付）" },
  soAttachLabel: { ko: "원장님이 주신 문서·이미지 첨부 (텍스트 대신 자동 번역)", en: "Attach the document or image from the doctor (translated automatically instead of text)", ru: "Прикрепите документ или изображение от врача (переводится автоматически вместо текста)", kz: "Дәрігер берген құжатты не суретті тіркеңіз (мәтіннің орнына автоматты аударылады)", zh: "附上医生提供的文档或图片（将自动翻译，替代文字）", ja: "先生からの文書・画像を添付（テキストの代わりに自動翻訳）" },
  soAttach: { ko: "첨부", en: "Attach", ru: "Прикрепить", kz: "Тіркеу", zh: "附件", ja: "添付" },
  soAdd: { ko: "추가", en: "Add", ru: "Добавить", kz: "Қосу", zh: "添加", ja: "追加" },
  soCancel: { ko: "취소", en: "Cancel", ru: "Отмена", kz: "Болдырмау", zh: "取消", ja: "キャンセル" },
  soSave: { ko: "저장", en: "Save", ru: "Сохранить", kz: "Сақтау", zh: "保存", ja: "保存" },
  soSaving: { ko: "저장 중", en: "Saving", ru: "Сохранение", kz: "Сақталуда", zh: "保存中", ja: "保存中" },
  soSaved: { ko: "저장됨", en: "Saved", ru: "Сохранено", kz: "Сақталды", zh: "已保存", ja: "保存しました" },
  soSavingLong: { ko: "저장·번역 중… (최대 1~2분)", en: "Saving and translating… (up to 1–2 minutes)", ru: "Сохранение и перевод… (до 1–2 минут)", kz: "Сақтау және аудару… (1–2 минутқа дейін)", zh: "保存并翻译中…（最多 1–2 分钟）", ja: "保存・翻訳中…（最大1〜2分）" },
  soUploading: { ko: "업로드 중…", en: "Uploading…", ru: "Загрузка файла…", kz: "Файл жүктелуде…", zh: "上传中…", ja: "アップロード中…" },
  soUploadFail: { ko: "업로드 실패 — 다시 시도해 주세요.", en: "Upload failed — please try again.", ru: "Не удалось загрузить — попробуйте ещё раз.", kz: "Жүктеу сәтсіз — қайта көріңіз.", zh: "上传失败——请重试。", ja: "アップロードに失敗しました — もう一度お試しください。" },
  soTranslating: { ko: "번역 중…", en: "Translating…", ru: "Перевод…", kz: "Аударылуда…", zh: "翻译中…", ja: "翻訳中…" },
  soRetranslate: { ko: "다시 번역", en: "Translate again", ru: "Перевести заново", kz: "Қайта аудару", zh: "重新翻译", ja: "再翻訳" },
  soTranslateFail: { ko: "번역 실패 — 다시 시도해 주세요.", en: "Translation failed — please try again.", ru: "Не удалось перевести — попробуйте ещё раз.", kz: "Аударма сәтсіз — қайта көріңіз.", zh: "翻译失败——请重试。", ja: "翻訳に失敗しました — もう一度お試しください。" },
  soProcessing: { ko: "처리 중…", en: "Working…", ru: "Обработка…", kz: "Өңделуде…", zh: "处理中…", ja: "処理中…" },
  soPublish: { ko: "에이전시에 공개", en: "Share with agency", ru: "Открыть агентству", kz: "Агенттікке ашу", zh: "向代理机构公开", ja: "エージェンシーに公開" },
  // 누르기 전 확인 — 환자 «본인»이 바로 읽는다는 사실을 그 자리에서 알린다.
  soPublishConfirm: { ko: "이 글은 에이전시 포털에만 보입니다. 환자 본인에게는 공식 문서를 올리고 「환자에게 보이기」를 켜서 전달하세요. 공개할까요?", en: "This text is shown only on the agency portal. To deliver it to the patient, upload the official document and turn on \"Visible to patient\". Share it?", ru: "Этот текст будет виден только в портале агентства. Чтобы передать его пациенту, загрузите официальный документ и включите «Показать пациенту». Открыть доступ?", kz: "Бұл мәтін тек агенттік порталында көрінеді. Науқасқа жеткізу үшін ресми құжатты жүктеп, «Науқасқа көрсету» дегенді қосыңыз. Ашасыз ба?", zh: "此文本仅在代理机构门户中显示。要传达给患者，请上传正式文件并开启「对患者可见」。确定公开吗？", ja: "この文章はエージェンシーポータルにのみ表示されます。患者本人に届けるには公式文書をアップロードし「患者に表示」をオンにしてください。公開しますか？" },
  soPublishing: { ko: "공개 중…", en: "Sharing…", ru: "Открываем доступ…", kz: "Ашылуда…", zh: "公开中…", ja: "公開中…" },
  soUnpublish: { ko: "공개 취소 (다시 비공개로)", en: "Undo sharing (make private again)", ru: "Отменить доступ (снова скрыть)", kz: "Ашуды болдырмау (қайта жабу)", zh: "取消公开（重新设为不公开）", ja: "公開を取り消す（再び非公開に）" },
  soPublished: { ko: "에이전시에 공개됨", en: "Shared with agency", ru: "Открыто агентству", kz: "Агенттікке ашылған", zh: "已向代理机构公开", ja: "エージェンシーに公開済み" },
  soPublishAuto: { ko: " — AI가 자동 번역해뒀습니다, 확인·교정 후 공개", en: " — AI has translated it; review and correct before sharing", ru: " — ИИ уже перевёл; проверьте и поправьте перед публикацией", kz: " — AI аударып қойды; ашпас бұрын тексеріп түзетіңіз", zh: " — AI 已自动翻译，请确认校正后再公开", ja: " — AIが自動翻訳済みです。確認・修正してから公開してください" },
  soPublishManual: { ko: " — 직접 교정 후 공개", en: " — correct it yourself before sharing", ru: " — поправьте вручную перед публикацией", kz: " — қолмен түзетіп барып ашыңыз", zh: " — 请手动校正后再公开", ja: " — ご自身で修正してから公開してください" },
  soOriginalInternal: { ko: "원장님 원문 (내부용 — 환자·에이전시에 안 보임)", en: "Doctor's original text (internal — not visible to patient or agency)", ru: "Оригинал от врача (внутренний — не виден пациенту и агентству)", kz: "Дәрігердің түпнұсқасы (ішкі — науқас пен агенттікке көрінбейді)", zh: "医生原文（内部用 — 患者与代理机构不可见）", ja: "先生の原文（内部用・患者とエージェンシーには見えません）" },
  soOriginalDraft: { ko: "원장님 원문 — AI 번역 초안(내부용 — 환자·에이전시에 안 보임)", en: "Doctor's original — AI draft translation (internal, not visible to patient or agency)", ru: "Оригинал врача — черновой перевод ИИ (внутренний, не виден пациенту и агентству)", kz: "Дәрігер түпнұсқасы — AI аударма жобасы (ішкі, науқас пен агенттікке көрінбейді)", zh: "医生原文 — AI 翻译草稿（内部用 — 患者与代理机构不可见）", ja: "先生の原文 — AI翻訳の下書き（内部用・患者とエージェンシーには見えません）" },
  soSaveUnconfirmed: { ko: "저장 여부가 확인되지 않았습니다. 다시 누르기 전에 아래 목록을 새로고침해 이미 들어갔는지 확인해 주세요.", en: "We could not confirm whether it saved. Refresh the list below to check before pressing again.", ru: "Не удалось подтвердить сохранение. Обновите список ниже и проверьте, прежде чем нажимать снова.", kz: "Сақталғаны расталмады. Қайта баспас бұрын төмендегі тізімді жаңартып тексеріңіз.", zh: "无法确认是否已保存。请先刷新下方列表确认，再重新点击。", ja: "保存されたか確認できませんでした。もう一度押す前に、下の一覧を更新して入っているか確認してください。" },

  // ── 문의함 상세 · 첨부 문서 번역 도구 ─────────────────────────
  // ⚠️ 여기는 «화면 언어»만 옮긴다. 번역 결과물의 언어 이름(TR_LABEL)과 인쇄 서식은
  //    병원·환자에게 나가는 «내용»이라 건드리지 않는다(엉뚱한 언어로 인쇄되면 더 나쁘다).
  atLangGroup: { ko: "번역 언어", en: "Translation language", ru: "Язык перевода", kz: "Аударма тілі", zh: "翻译语言", ja: "翻訳言語" },
  atConvert: { ko: "변환", en: "Convert", ru: "Перевести", kz: "Аудару", zh: "转换", ja: "変換" },
  atReconvert: { ko: "다시 변환", en: "Convert again", ru: "Перевести заново", kz: "Қайта аудару", zh: "重新转换", ja: "再変換" },
  atConvertTitle: { ko: "병원·환자 전달용 번역 (요약 아님·원문 그대로)", en: "Translation to hand to the hospital or patient (not a summary — the full text)", ru: "Перевод для передачи больнице или пациенту (не сводка — полный текст)", kz: "Ауруханаға не науқасқа беруге арналған аударма (қысқаша емес — толық мәтін)", zh: "供医院·患者使用的翻译（非摘要，为原文全文）", ja: "病院・患者に渡すための翻訳（要約ではなく原文どおり）" },
  atPreviewTitle: { ko: "새 탭에서 미리보기", en: "Preview in a new tab", ru: "Предпросмотр в новой вкладке", kz: "Жаңа қойындыда алдын ала қарау", zh: "在新标签页预览", ja: "新しいタブでプレビュー" },
  atPdfTitle: { ko: "PDF로 저장 (인쇄 → PDF로 저장 선택)", en: "Save as PDF (Print → Save as PDF)", ru: "Сохранить в PDF (Печать → Сохранить как PDF)", kz: "PDF етіп сақтау (Басып шығару → PDF етіп сақтау)", zh: "保存为 PDF（打印 → 另存为 PDF）", ja: "PDFで保存（印刷 → PDFで保存を選択）" },
  atVerifyTitle: { ko: "번역표 숫자를 원본과 대조", en: "Check the numbers in the translation against the original", ru: "Сверить числа перевода с оригиналом", kz: "Аудармадағы сандарды түпнұсқамен салыстыру", zh: "将译文中的数字与原件核对", ja: "翻訳の数値を原本と照合" },
  atCopy: { ko: "복사", en: "Copy", ru: "Копировать", kz: "Көшіру", zh: "复制", ja: "コピー" },
  atCopied: { ko: "복사됨", en: "Copied", ru: "Скопировано", kz: "Көшірілді", zh: "已复制", ja: "コピーしました" },
  atDownload: { ko: "다운로드", en: "Download", ru: "Скачать", kz: "Жүктеп алу", zh: "下载", ja: "ダウンロード" },
  atDownloadAll: { ko: "전부 받기", en: "Download all", ru: "Скачать все", kz: "Барлығын жүктеу", zh: "全部下载", ja: "すべて保存" },
  atDownloadAllBusy: { ko: "받는 중", en: "Downloading", ru: "Загрузка", kz: "Жүктелуде", zh: "下载中", ja: "保存中" },
  atDownloadAllTitle: { ko: "병원에 넘길 자료를 한 번에 — 파일이 낱개로 받아집니다(압축 안 함)", en: "Grab everything for the hospital at once — files download individually (not zipped)", ru: "Скачать все материалы для больницы сразу — файлы загружаются по отдельности (без архива)", kz: "Ауруханаға жіберетін материалдарды бірден — файлдар жеке жүктеледі (мұрағатсыз)", zh: "一次获取要发给医院的全部资料 — 文件逐个下载（不压缩）", ja: "病院に渡す資料を一度に — ファイルは個別に保存されます（圧縮しません）" },
  atTranslate: { ko: "번역", en: "Translation", ru: "Перевод", kz: "Аударма", zh: "翻译", ja: "翻訳" },
  atEdit: { ko: "수정", en: "Edit", ru: "Изменить", kz: "Өңдеу", zh: "修改", ja: "修正" },
  atCancel: { ko: "취소", en: "Cancel", ru: "Отмена", kz: "Болдырмау", zh: "取消", ja: "キャンセル" },
  atEditNote: { ko: "번역 수정(저장 시 보존)", en: "Edit the translation (kept when saved)", ru: "Правка перевода (сохраняется)", kz: "Аударманы өңдеу (сақталады)", zh: "修改译文（保存后保留）", ja: "翻訳の修正（保存時に保持）" },
  atDisclaimer: { ko: "원문을 그대로 옮긴 번역입니다(요약 아님). 숫자·정상범위는 원본과 대조하세요.", en: "This is a full translation of the original (not a summary). Check numbers and reference ranges against the original.", ru: "Это полный перевод оригинала (не сводка). Сверяйте числа и референсные значения с оригиналом.", kz: "Бұл түпнұсқаның толық аудармасы (қысқаша емес). Сандар мен қалыпты шектерді түпнұсқамен салыстырыңыз.", zh: "这是原件的完整翻译（非摘要）。请将数字与参考范围与原件核对。", ja: "原文をそのまま訳したものです（要約ではありません）。数値・基準範囲は原本と照合してください。" },
  atGlossaryAdd: { ko: "＋사전 등록", en: "+ Add to glossary", ru: "+ В словарь", kz: "+ Сөздікке қосу", zh: "＋加入词表", ja: "＋辞書に登録" },
  atGlossarySrc: { ko: "원문 용어", en: "Source term", ru: "Термин оригинала", kz: "Түпнұсқа термині", zh: "原文术语", ja: "原文の用語" },
  atGlossarySrcPh: { ko: "예: эндоцервикоз", en: "e.g. эндоцервикоз", ru: "напр.: эндоцервикоз", kz: "мыс.: эндоцервикоз", zh: "例：эндоцервикоз", ja: "例: эндоцервикоз" },
  atGlossaryTgtPh: { ko: "고정할 번역", en: "Translation to pin", ru: "Закреплённый перевод", kz: "Бекітілетін аударма", zh: "要固定的译法", ja: "固定する訳語" },
  atGlossaryDone: { ko: "등록됨 — 다음 번역부터 적용", en: "Added — applies from the next translation", ru: "Добавлено — применится со следующего перевода", kz: "Қосылды — келесі аудармадан бастап қолданылады", zh: "已添加——从下次翻译开始生效", ja: "登録しました — 次の翻訳から適用" },
  atVerifyOk: { ko: "✓ 번역 숫자가 원본 재판독과 일치했어요 (참고용 — 최종은 원본 대조).", en: "✓ The numbers match a fresh read of the original (for reference — always confirm against the original).", ru: "✓ Числа совпали с повторным прочтением оригинала (для справки — итог сверяйте с оригиналом).", kz: "✓ Сандар түпнұсқаны қайта оқығанмен сәйкес келді (анықтама үшін — соңғы тексеру түпнұсқамен).", zh: "✓ 数字与对原件的重新识别一致（仅供参考——最终请与原件核对）。", ja: "✓ 翻訳の数値が原本の再読取と一致しました（参考用 — 最終は原本と照合）。" },
  atVerifyWarn: { ko: "※ 검증기도 AI라 원본을 잘못 읽었을 수 있어요 — 원본이 맞으면 무시하세요.", en: "Note: the checker is also AI and may have misread the original — ignore this if the original is correct.", ru: "Примечание: проверяющий — тоже ИИ и мог неверно прочитать оригинал; если оригинал верен, игнорируйте.", kz: "Ескерту: тексеруші де AI, түпнұсқаны қате оқуы мүмкін — түпнұсқа дұрыс болса, елемеңіз.", zh: "注：校验器同样是 AI，可能误读原件——若原件无误请忽略。", ja: "※ 検証側もAIのため原本を読み違えた可能性があります — 原本が正しければ無視してください。" },
  atVerifyReread: { ko: "/ 원본재판독", en: "/ re-read of original", ru: "/ повторное чтение оригинала", kz: "/ түпнұсқаны қайта оқу", zh: "/ 原件重新识别", ja: "/ 原本の再読取" },
  atErrTranslate: { ko: "번역 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.", en: "Something went wrong while translating. Please try again in a moment.", ru: "При переводе произошла ошибка. Попробуйте ещё раз чуть позже.", kz: "Аудару кезінде қате шықты. Сәлден соң қайталап көріңіз.", zh: "翻译时出现问题，请稍后重试。", ja: "翻訳中に問題が発生しました。しばらくしてからお試しください。" },
  atErrVerify: { ko: "숫자검증에 실패했어요. 잠시 후 다시 시도해 주세요.", en: "The number check failed. Please try again in a moment.", ru: "Проверка чисел не удалась. Попробуйте ещё раз чуть позже.", kz: "Сан тексеруі сәтсіз болды. Сәлден соң қайталаңыз.", zh: "数字校验失败，请稍后重试。", ja: "数値の検証に失敗しました。しばらくしてからお試しください。" },
  // 「잠시 후 다시」는 거짓말이었다 — 크기 때문이면 몇 번을 눌러도 안 된다(문의 #60).
  atErrTooBig: { ko: "이 파일은 너무 커서 자동 번역이 안 돼요. 원본을 직접 확인해 주세요.", en: "This file is too large to translate automatically. Please open the original.", ru: "Файл слишком большой для автоперевода. Откройте оригинал.", kz: "Бұл файл автоматты аударуға тым үлкен. Түпнұсқаны ашыңыз.", zh: "该文件过大，无法自动翻译，请查看原件。", ja: "このファイルは大きすぎて自動翻訳できません。原本をご確認ください。" },
  atErrFormat: { ko: "이 형식(옛 .doc 등)은 자동 번역이 안 돼요. .docx 로 다시 저장해 올리면 번역됩니다.", en: "This format (legacy .doc, …) cannot be translated automatically. Re-save it as .docx and upload again.", ru: "Этот формат (старый .doc и т.п.) не переводится автоматически. Пересохраните в .docx и загрузите снова.", kz: "Бұл пішім (ескі .doc, т.б.) автоматты аударылмайды. .docx күйінде сақтап қайта жүктеңіз.", zh: "该格式（旧版 .doc 等）无法自动翻译。请另存为 .docx 后重新上传。", ja: "この形式（旧 .doc など）は自動翻訳できません。.docx で保存し直してアップロードしてください。" },
  atErrPopup: { ko: "팝업이 차단됐어요. 팝업 허용 후 다시 눌러주세요.", en: "The pop-up was blocked. Allow pop-ups and press again.", ru: "Всплывающее окно заблокировано. Разрешите всплывающие окна и нажмите снова.", kz: "Қалқымалы терезе бөгелді. Рұқсат беріп, қайта басыңыз.", zh: "弹出窗口被拦截。请允许弹窗后重试。", ja: "ポップアップがブロックされました。許可してからもう一度押してください。" },
  atErrStageBack: { ko: "이전 단계로는 되돌릴 수 없어요. 단계 버튼을 다시 눌러 확인 후 저장해주세요.", en: "You cannot move back to an earlier stage. Press the stage button again to confirm, then save.", ru: "Вернуться на предыдущий этап нельзя. Нажмите кнопку этапа ещё раз для подтверждения и сохраните.", kz: "Алдыңғы кезеңге қайту мүмкін емес. Кезең түймесін қайта басып растаңыз да, сақтаңыз.", zh: "无法退回到上一阶段。请再次点击阶段按钮确认后保存。", ja: "前の段階には戻せません。段階ボタンをもう一度押して確認後、保存してください。" },
  atItemFallback: { ko: "(항목)", en: "(item)", ru: "(пункт)", kz: "(тармақ)", zh: "（项目）", ja: "（項目）" },
  atStageBackConfirm: { ko: "「{from}」 단계에서 「{to}」 단계로 되돌립니다. 되돌릴까요?", en: "This moves the case back from “{from}” to “{to}”. Go back?", ru: "Дело вернётся с этапа «{from}» на «{to}». Вернуть?", kz: "Кезең «{from}» дегеннен «{to}» дегенге қайтарылады. Қайтарамыз ба?", zh: "将从「{from}」阶段退回到「{to}」阶段。确定退回吗？", ja: "「{from}」段階から「{to}」段階に戻します。戻しますか？" },};

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
/**
 * 백오피스(스태프) 포털 기본 언어 = 한국어. 쿠키로 다른 언어를 고르면 그 언어로.
 * 왜 ko 기본: 공개 사이트는 en 기본(SEO)이지만 스태프 화면(admin·coordinator)은 한국 운영이 기본이고,
 * 이전엔 하드코딩 한국어였다 — en 기본으로 두면 한국인 운영자·어드민 cases 보드가 영어로 떠 회귀한다.
 * 외국인 스태프는 상단 언어 스위처로 전환(선택은 쿠키에 유지). LangContext.useLang 과 같은
 * store(healo:langchange)를 구독하되 기본값만 ko. SSR/hydration 안전(useSyncExternalStore).
 */
function subscribeLang(cb) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener("healo:langchange", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("healo:langchange", cb);
  };
}
export function useBackofficeLang() {
  // 스태프 전용 쿠키(healo_bo_lang)만 본다 → 공개 healo_lang(en 등)에 안 휘둘리고 기본 ko.
  return useSyncExternalStore(subscribeLang, () => getBackofficeLangFromCookie() || "ko", () => "ko");
}

/**
 * 코디 포털 컴포넌트에서 현재 언어의 문구 묶음을 가져온다.
 * 사용: const L = useCoordinatorL();  →  L.navDashboard
 */
export function useCoordinatorL() {
  const lang = useBackofficeLang();
  // 참조 안정성 필수: flatten()은 매번 새 객체를 만들어서, 메모 없이 두면 L을 deps에 쓰는
  // useEffect/useCallback이 렌더마다 재실행 → 무한 재요청 루프(코디 AI 상담 리드 화면 rate_limited 원인).
  return useMemo(() => flatten(lang), [lang]);
}

// 훅을 못 쓰는 곳(명시적 lang — 예: 환자 언어로 WhatsApp 문구)에서 직접 뽑을 때.
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
  return dateLocale(useBackofficeLang());
}

export default CT;

/**
 * 백오피스 언어 쿠키가 «없으면» 기본값(ko)으로 심는다. 코디·어드민 레이아웃에서 한 번 부른다.
 *
 * 왜 필요 (2026-09-04 실측): 서버는 이 쿠키를 보고 브라우저에 실을 사전을 고른다(app/layout.jsx).
 * 스위처를 한 번도 안 만진 스태프는 쿠키가 없어 «영어 사전만» 실렸고, 사전을 거치는 문구가
 * 한국어 화면에도 영어로 떨어졌다 — 의뢰서 카드 라벨이 「Date of Birth」·
 * 「MEDICAL HISTORY & MEDICATIONS」, 서류 종류가 「Other document」.
 * 화면 대부분은 이 파일의 문구 묶음(L)을 써서 멀쩡했기 때문에 「가끔 영어가 섞인다」로만 보였다.
 *
 * 🛑 서버가 그냥 ko 를 얹게 하는 쪽으로 고치지 마라 — 그러면 «공개 화면 방문자 전원»이 쓰지도 않는
 *    한국어 사전 100KB 를 받는다(2026-09-04 실측: 첫 화면 HTML 392KB 중 사전이 100KB).
 * 🛑 에이전시·병원 포털에는 붙이지 마라 — 그쪽은 러시아어 사용자다.
 */
export function useEnsureBackofficeLangCookie() {
  useEffect(() => {
    try {
      if (!getBackofficeLangFromCookie()) setBackofficeLangCookie("ko");
    } catch { /* 쿠키가 막힌 브라우저 — 영어로 보이지만 화면은 정상 동작한다 */ }
  }, []);
}
