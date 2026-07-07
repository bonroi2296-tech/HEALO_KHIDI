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
