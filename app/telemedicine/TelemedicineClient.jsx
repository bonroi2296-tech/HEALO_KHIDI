"use client";

import Link from "next/link";
import {
  ArrowRight,
  Video,
  Languages,
  FileText,
  Stethoscope,
  Lock,
  Mail,
  Users,
  CreditCard,
  Mic,
  PhoneOff,
  ChevronLeft,
} from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";

/* features 카드용 lucide 아이콘 (이모지 대체, 순서 고정) */
const FEATURE_ICONS = [Video, Languages, FileText, Stethoscope, Lock, Mail, Users, CreditCard];

const COPY = {
  en: {
    eyebrow: "Telemedicine · Cancer-care concierge",
    heroTitle: "Meet a Korean specialist before you board the plane.",
    heroLede:
      "No visa, no flight needed. Real-time video consultation with Korea's cancer specialists — from Almaty, Astana, Moscow, or anywhere in the world. Decide whether to travel only after you know.",
    ctaPrimary: "Request consultation",
    ctaSecondary: "See how it works",
    mockup: { caption: "Example of an actual consultation screen", title: "Stomach cancer · Pre-consultation", endCall: "End", connected: "Connected", live: "Live interpretation", doctor: "Dr. Kim · Oncology", patient: "Patient · Almaty", srcTag: "Doctor · speaking Korean", srcLine: "The tumor has shrunk on the CT scan. Let me explain the next treatment steps.", transTag: "AI live translation", transLine: "The tumor has shrunk on the CT scan. Let me explain the next treatment steps." },
    stepsEyebrow: "How it works",
    stepsTitle: "From first request to consultation — under 48 hours.",
    steps: [
      { num: "01", title: "Request", body: "Share your diagnosis, past reports, and preferred language. Takes 10 minutes." },
      { num: "02", title: "Care assignment", body: "healwith assigns 2–3 specialists whose expertise fits your case." },
      { num: "03", title: "Receive link", body: "We email you a secure meeting link (patient + interpreter + family can join)." },
      { num: "04", title: "Consult", body: "30–60 min video session with live interpretation and document review." },
    ],
    featuresEyebrow: "What's included",
    features: [
      { title: "HD video + audio", body: "Ultra-low latency WebRTC. No app install." },
      { title: "Live medical interpretation", body: "Korean ↔ Russian / Kazakh / English / Chinese." },
      { title: "Document sharing", body: "MRI, CT, pathology reviewed live during the call." },
      { title: "Cancer specialists", body: "Board-certified oncologists from top Korean hospitals." },
      { title: "Medical-grade security", body: "AES-256 end-to-end, PIPA §28-8 compliant." },
      { title: "Guest access", body: "No account needed — patient joins by link only." },
      { title: "Coordinator follow-up", body: "Every session is followed by a written summary and next-step plan." },
      { title: "Transparent pricing", body: "Flat consultation fee. No hidden charges. Travel only if you choose." },
    ],
    docsEyebrow: "Helpful documents to prepare",
    docsNote: "Having these on hand makes your consultation more accurate. It's fine to start with just your contact details — your coordinator will guide you as the consultation proceeds.",
    docsItems: ["Diagnosis / medical certificate", "Pathology (biopsy) report", "Surgery confirmation", "Blood test results", "Medication / prescription history"],
    useCasesEyebrow: "When to use telemedicine",
    useCases: [
      { title: "Second opinion", body: "You have a diagnosis at home and want a Korean oncologist's view before committing to treatment." },
      { title: "Pre-travel screening", body: "You're considering flying to Korea. Telemedicine validates that your case is treatable here — no wasted trip." },
      { title: "Follow-up after surgery", body: "After surgery in Korea, post-care consultations can continue from home." },
      { title: "Family consultation", body: "Patient + spouse + adult children can join the same call from different cities." },
    ],
    faqEyebrow: "Frequently asked",
    faqs: [
      { q: "Do I need to download an app?", a: "No. Telemedicine works in any modern browser (Chrome, Safari, Edge) on PC, tablet, or mobile." },
      { q: "What if my English / Korean is limited?", a: "A professional medical interpreter joins the call. We support Russian, Kazakh, English, and Chinese." },
      { q: "Is this a replacement for in-person consultation?", a: "No. Telemedicine is for initial assessment, second opinions, and follow-ups. Surgery / treatment still requires travel." },
      { q: "How do I share my medical records?", a: "Upload securely via link before the call. MRI, CT, pathology reports — the specialist reviews them live." },
      { q: "Is this covered by insurance?", a: "Usually not by home-country insurance. The fee is paid directly. Some private plans reimburse — ask us." },
      { q: "What about privacy?", a: "All traffic is AES-256 encrypted end-to-end. Records follow PIPA §28-8 (Korea) and GDPR-equivalent standards." },
    ],
    ctaSection: {
      title: "Your first consultation can be this week.",
      body: "No payment, no commitment to travel. Share your case and we reply within 24 hours.",
      btn: "Request consultation",
    },
  },
  ko: {
    eyebrow: "원격협진 · 암 치료 컨시어지",
    heroTitle: "비행기 타기 전에 한국 전문의와 먼저 만나세요.",
    heroLede:
      "비자도, 항공편도 필요 없습니다. 알마티 · 아스타나 · 모스크바 어디에서든 한국의 암 전문의와 실시간 영상 상담. 한국 방문은 확신이 든 뒤에 결정하세요.",
    ctaPrimary: "상담 신청",
    ctaSecondary: "진행 방식 보기",
    mockup: { caption: "실제 상담 화면 예시", title: "위암 · 사전 상담", endCall: "종료", connected: "연결됨", live: "실시간 통역", doctor: "김민수 의사 · 종양내과", patient: "환자 · 알마티", srcTag: "의사 · 한국어", srcLine: "CT 검사상 종양이 줄었습니다. 다음 치료 단계를 설명드릴게요.", transTag: "AI 실시간 번역", transLine: "The tumor has shrunk on the CT scan. Let me explain the next treatment steps." },
    stepsEyebrow: "진행 방식",
    stepsTitle: "신청부터 상담까지 — 48시간 이내.",
    steps: [
      { num: "01", title: "신청", body: "진단명, 기존 검사지, 희망 언어를 알려주세요. 10분이면 충분합니다." },
      { num: "02", title: "상담 배정", body: "healwith가 증례에 맞는 전문의 2~3명을 배정합니다." },
      { num: "03", title: "링크 전송", body: "보안 미팅 링크를 이메일로 전송합니다 (환자 + 통역사 + 가족 입장 가능)." },
      { num: "04", title: "상담", body: "30~60분 영상 세션 + 실시간 통역 + 문서 검토." },
    ],
    featuresEyebrow: "포함된 기능",
    features: [
      { title: "HD 영상 + 음성", body: "초저지연 WebRTC. 앱 설치 불필요." },
      { title: "실시간 의료 통역", body: "한 ↔ 러 / 카자흐 / 영 / 중." },
      { title: "문서 공유", body: "MRI, CT, 조직검사 상담 중 실시간 판독." },
      { title: "암 전문의", body: "한국 상급종합병원 전문의 (보드 인증)." },
      { title: "의료 등급 보안", body: "End-to-end AES-256, PIPA §28조의8 준수." },
      { title: "계정 불필요", body: "링크 한 줄로 입장 — 환자는 가입하지 않아도 됩니다." },
      { title: "사후 코디", body: "모든 상담 후 요약본 + 다음 단계 계획 발송." },
      { title: "투명한 가격", body: "정액 상담료. 숨은 비용 없음. 한국 방문은 선택입니다." },
    ],
    docsEyebrow: "준비하면 좋은 서류",
    docsNote: "아래 서류가 있으면 상담이 더 정확해집니다. 처음엔 연락처만 주셔도 괜찮아요 — 상담을 진행하며 코디네이터가 안내해드립니다.",
    docsItems: ["진단서", "조직검사 결과지", "수술 확인서", "혈액검사 결과지", "투약 처방 내역"],
    useCasesEyebrow: "이럴 때 원격협진",
    useCases: [
      { title: "세컨드 오피니언", body: "자국 병원 진단을 받았지만 치료를 시작하기 전 한국 전문의 의견을 듣고 싶을 때." },
      { title: "방문 전 스크리닝", body: "한국 방문을 고민 중이라면 — 원격협진으로 '치료 가능한 증례인지' 먼저 확인하고 방문을 결정하세요." },
      { title: "수술 후 경과 확인", body: "한국에서 수술 후 귀국해도 경과 관리는 원격으로 지속됩니다." },
      { title: "가족 합동 상담", body: "환자 + 배우자 + 성인 자녀가 각자 도시에서 같은 방에 입장." },
    ],
    faqEyebrow: "자주 묻는 질문",
    faqs: [
      { q: "앱을 설치해야 하나요?", a: "아니요. PC · 태블릿 · 스마트폰의 최신 브라우저(Chrome, Safari, Edge)에서 작동합니다." },
      { q: "영어나 한국어가 어려워요.", a: "전문 의료 통역사가 상담에 동반합니다. 러시아어 · 카자흐어 · 영어 · 중국어를 지원합니다." },
      { q: "대면 진료를 대체하나요?", a: "아니요. 원격협진은 초기 평가 / 세컨드 오피니언 / 사후관리 용도입니다. 수술·치료는 대면이 필요합니다." },
      { q: "의료 기록은 어떻게 공유하나요?", a: "상담 전 보안 링크로 업로드합니다. MRI · CT · 조직검사지를 상담 중 의사가 실시간 판독합니다." },
      { q: "보험 적용되나요?", a: "자국 보험은 대체로 적용되지 않습니다. 상담료는 직접 결제하며, 일부 프라이빗 플랜은 환급됩니다 — 문의 바랍니다." },
      { q: "개인정보는 어떻게 보호되나요?", a: "전 구간 AES-256 암호화. PIPA §28조의8(한국) + GDPR 동등 기준을 준수합니다." },
    ],
    ctaSection: {
      title: "첫 상담을 이번 주에 받을 수 있습니다.",
      body: "결제 없음, 방문 의무 없음. 증례 공유 후 24시간 이내 회신드립니다.",
      btn: "상담 신청",
    },
  },
  ru: {
    eyebrow: "Телемедицина · Консьерж онкологической помощи",
    heroTitle: "Встретьтесь с корейским специалистом до того, как сядете в самолёт.",
    heroLede:
      "Не нужны ни виза, ни авиабилет. Видеоконсультация в реальном времени с онкологами Кореи — из Алматы, Астаны, Москвы или из любой точки мира. Решайте, ехать ли, только после того, как узнаете.",
    ctaPrimary: "Записаться на консультацию",
    ctaSecondary: "Как это работает",
    mockup: { caption: "Пример реального экрана консультации", title: "Рак желудка · Предварительная консультация", endCall: "Завершить", connected: "На связи", live: "Синхронный перевод", doctor: "Д-р Ким · онколог", patient: "Пациент · Алматы", srcTag: "Врач · говорит по-корейски", srcLine: "На КТ опухоль уменьшилась. Объясню следующие этапы лечения.", transTag: "ИИ-перевод в реальном времени", transLine: "На КТ опухоль уменьшилась. Объясню следующие этапы лечения." },
    stepsEyebrow: "Как это работает",
    stepsTitle: "От заявки до консультации — менее 48 часов.",
    steps: [
      { num: "01", title: "Заявка", body: "Укажите диагноз, прошлые обследования и удобный язык. Это займёт 10 минут." },
      { num: "02", title: "Назначение консультации", body: "healwith назначает 2–3 специалистов, чья экспертиза подходит вашему случаю." },
      { num: "03", title: "Получение ссылки", body: "Мы отправляем по email защищённую ссылку на встречу (пациент + переводчик + семья)." },
      { num: "04", title: "Консультация", body: "Видеосессия 30–60 минут с синхронным переводом и разбором документов." },
    ],
    featuresEyebrow: "Что входит",
    features: [
      { title: "HD видео и звук", body: "WebRTC со сверхнизкой задержкой. Без установки приложений." },
      { title: "Живой медицинский перевод", body: "Корейский ↔ русский / казахский / английский / китайский." },
      { title: "Обмен документами", body: "МРТ, КТ, гистология разбираются в прямом эфире во время звонка." },
      { title: "Онкологи-специалисты", body: "Сертифицированные онкологи ведущих больниц Кореи." },
      { title: "Медицинский уровень безопасности", body: "Сквозное шифрование AES-256, соответствие PIPA §28-8." },
      { title: "Гостевой доступ", body: "Аккаунт не нужен — пациент входит только по ссылке." },
      { title: "Сопровождение координатора", body: "После каждой сессии — письменное резюме и план дальнейших шагов." },
      { title: "Прозрачная цена", body: "Фиксированная стоимость консультации. Без скрытых платежей. Поездка — по вашему выбору." },
    ],
    docsEyebrow: "Документы, которые полезно подготовить",
    docsNote: "С этими документами консультация будет точнее. Для начала достаточно контактных данных — координатор подскажет остальное в ходе консультации.",
    docsItems: ["Медицинское заключение / диагноз", "Результат гистологии (биопсии)", "Подтверждение операции", "Результаты анализа крови", "История назначений и приёма лекарств"],
    useCasesEyebrow: "Когда нужна телемедицина",
    useCases: [
      { title: "Второе мнение", body: "У вас есть диагноз дома, и вы хотите услышать мнение корейского онколога перед началом лечения." },
      { title: "Скрининг перед поездкой", body: "Вы рассматриваете поездку в Корею. Телемедицина подтвердит, что ваш случай здесь лечится — без напрасной поездки." },
      { title: "Наблюдение после операции", body: "После операции в Корее наблюдение можно продолжить из дома." },
      { title: "Семейная консультация", body: "Пациент + супруг(а) + взрослые дети могут подключиться к одному звонку из разных городов." },
    ],
    faqEyebrow: "Частые вопросы",
    faqs: [
      { q: "Нужно ли устанавливать приложение?", a: "Нет. Телемедицина работает в любом современном браузере (Chrome, Safari, Edge) на ПК, планшете или телефоне." },
      { q: "А если я плохо владею английским / корейским?", a: "К звонку подключается профессиональный медицинский переводчик. Мы поддерживаем русский, казахский, английский и китайский." },
      { q: "Это замена очной консультации?", a: "Нет. Телемедицина — для первичной оценки, второго мнения и наблюдения. Операция и лечение по-прежнему требуют поездки." },
      { q: "Как передать медицинские записи?", a: "Загрузите их по защищённой ссылке перед звонком. МРТ, КТ, гистология — специалист разбирает их в прямом эфире." },
      { q: "Покрывается ли это страховкой?", a: "Как правило, страховка вашей страны не покрывает. Оплата производится напрямую. Некоторые частные планы возмещают — спросите нас." },
      { q: "Как обеспечивается конфиденциальность?", a: "Весь трафик зашифрован сквозным AES-256. Записи соответствуют PIPA §28-8 (Корея) и стандартам уровня GDPR." },
    ],
    ctaSection: {
      title: "Ваша первая консультация может состояться уже на этой неделе.",
      body: "Без оплаты и без обязательства ехать. Поделитесь своим случаем — мы ответим в течение 24 часов.",
      btn: "Записаться на консультацию",
    },
  },
  kz: {
    eyebrow: "Телемедицина · Онкологиялық күтім консьержі",
    heroTitle: "Ұшаққа отырмас бұрын корей маманымен алдымен кездесіңіз.",
    heroLede:
      "Виза да, авиабилет те қажет емес. Алматы, Астана, Мәскеу немесе әлемнің кез келген нүктесінен Кореяның онкологтарымен нақты уақыттағы бейне кеңес. Бару-бармауды білгеннен кейін ғана шешіңіз.",
    ctaPrimary: "Кеңеске өтініш беру",
    ctaSecondary: "Қалай жұмыс істейді",
    mockup: { caption: "Нақты кеңес экранының мысалы", title: "Асқазан обыры · Алдын ала кеңес", endCall: "Аяқтау", connected: "Байланыста", live: "Синхронды аударма", doctor: "Д-р Ким · онколог", patient: "Пациент · Алматы", srcTag: "Дәрігер · корейше сөйлеп жатыр", srcLine: "КТ-да ісік кішірейді. Келесі емдеу қадамдарын түсіндіремін.", transTag: "AI нақты уақыттағы аударма", transLine: "КТ-да ісік кішірейді. Келесі емдеу қадамдарын түсіндіремін." },
    stepsEyebrow: "Қалай жұмыс істейді",
    stepsTitle: "Өтініштен кеңеске дейін — 48 сағаттан аз.",
    steps: [
      { num: "01", title: "Өтініш", body: "Диагнозыңызды, бұрынғы тексерулерді және қалаған тіліңізді көрсетіңіз. 10 минут жеткілікті." },
      { num: "02", title: "Кеңес тағайындау", body: "healwith сіздің жағдайыңызға сай 2–3 маман тағайындайды." },
      { num: "03", title: "Сілтеме жіберу", body: "Қауіпсіз кездесу сілтемесін email арқылы жібереміз (пациент + аудармашы + отбасы)." },
      { num: "04", title: "Кеңес", body: "Синхронды аударма мен құжаттарды талдаумен 30–60 минуттық бейне сессия." },
    ],
    featuresEyebrow: "Не кіреді",
    features: [
      { title: "HD бейне + дыбыс", body: "Өте төмен кідірісті WebRTC. Қосымша орнатудың қажеті жоқ." },
      { title: "Тікелей медициналық аударма", body: "Корей ↔ орыс / қазақ / ағылшын / қытай." },
      { title: "Құжат алмасу", body: "МРТ, КТ, гистология қоңырау кезінде тікелей талданады." },
      { title: "Онколог мамандар", body: "Кореяның жетекші ауруханаларының сертификатталған онкологтары." },
      { title: "Медициналық деңгейдегі қауіпсіздік", body: "Ұштан-ұшқа AES-256, PIPA §28-8 талаптарына сай." },
      { title: "Қонақ ретінде кіру", body: "Аккаунт қажет емес — пациент тек сілтеме арқылы кіреді." },
      { title: "Координатор сүйемелдеуі", body: "Әр сессиядан кейін жазбаша қорытынды мен келесі қадам жоспары жіберіледі." },
      { title: "Ашық баға", body: "Тұрақты кеңес ақысы. Жасырын төлемдер жоқ. Сапар — сіздің таңдауыңыз." },
    ],
    docsEyebrow: "Дайындаған пайдалы құжаттар",
    docsNote: "Бұл құжаттар кеңесті дәлірек етеді. Алдымен байланыс деректерін берсеңіз де жеткілікті — координатор кеңес барысында қалғанын түсіндіреді.",
    docsItems: ["Медициналық қорытынды / диагноз", "Гистология (биопсия) нәтижесі", "Операцияны растау", "Қан анализінің нәтижесі", "Дәрі тағайындау тарихы"],
    useCasesEyebrow: "Телемедицина қашан қажет",
    useCases: [
      { title: "Екінші пікір", body: "Үйде диагноз қойылды, бірақ емді бастамас бұрын корей онкологының пікірін естігіңіз келеді." },
      { title: "Сапарға дейінгі скрининг", body: "Кореяға баруды ойлап жүрсіз — телемедицина жағдайыңыздың мұнда емделетінін растайды, бекер сапар болмайды." },
      { title: "Операциядан кейінгі бақылау", body: "Кореядағы операциядан кейін бақылауды үйден жалғастыруға болады." },
      { title: "Отбасылық кеңес", body: "Пациент + жұбайы + ересек балалары әртүрлі қаладан бір қоңырауға қосыла алады." },
    ],
    faqEyebrow: "Жиі қойылатын сұрақтар",
    faqs: [
      { q: "Қосымша орнату керек пе?", a: "Жоқ. Телемедицина ПК, планшет немесе телефондағы кез келген заманауи браузерде (Chrome, Safari, Edge) жұмыс істейді." },
      { q: "Ағылшын / корей тілім нашар болса ше?", a: "Қоңырауға кәсіби медициналық аудармашы қосылады. Орыс, қазақ, ағылшын және қытай тілдерін қолдаймыз." },
      { q: "Бұл бетпе-бет кеңесті алмастыра ма?", a: "Жоқ. Телемедицина бастапқы бағалау, екінші пікір және бақылау үшін. Операция мен ем әлі де сапарды талап етеді." },
      { q: "Медициналық жазбаларды қалай беремін?", a: "Қоңырауға дейін қауіпсіз сілтеме арқылы жүктейсіз. МРТ, КТ, гистологияны маман тікелей талдайды." },
      { q: "Сақтандыру жабады ма?", a: "Әдетте еліңіздің сақтандыруы жаппайды. Кеңес ақысы тікелей төленеді. Кейбір жеке жоспарлар өтейді — бізден сұраңыз." },
      { q: "Құпиялылық қалай қамтамасыз етіледі?", a: "Барлық трафик ұштан-ұшқа AES-256 шифрланады. Жазбалар PIPA §28-8 (Корея) және GDPR деңгейіндегі стандарттарға сай." },
    ],
    ctaSection: {
      title: "Алғашқы кеңесіңіз осы аптада өтуі мүмкін.",
      body: "Төлемсіз, бару міндеттемесінсіз. Жағдайыңызды бөлісіңіз — 24 сағат ішінде жауап береміз.",
      btn: "Кеңеске өтініш беру",
    },
  },
  zh: {
    eyebrow: "远程协诊 · 癌症护理礼宾",
    heroTitle: "在登机之前，先与韩国专科医生见面。",
    heroLede:
      "无需签证，无需航班。从阿拉木图、阿斯塔纳、莫斯科或世界任何地方，与韩国的癌症专科医生进行实时视频咨询。在确认之后，再决定是否前往韩国。",
    ctaPrimary: "申请咨询",
    ctaSecondary: "查看流程",
    mockup: { caption: "实际咨询界面示例", title: "胃癌 · 预咨询", endCall: "结束", connected: "已连接", live: "实时翻译", doctor: "金医生 · 肿瘤科", patient: "患者 · 阿拉木图", srcTag: "医生 · 正在说韩语", srcLine: "CT 显示肿瘤已缩小。我来说明下一步的治疗。", transTag: "AI 实时翻译", transLine: "CT 显示肿瘤已缩小。我来说明下一步的治疗。" },
    stepsEyebrow: "流程",
    stepsTitle: "从申请到咨询——48小时以内。",
    steps: [
      { num: "01", title: "申请", body: "告知诊断、既往检查与偏好语言。仅需10分钟。" },
      { num: "02", title: "安排咨询", body: "healwith 为您安排2~3名与病例契合的专科医生。" },
      { num: "03", title: "发送链接", body: "通过邮件发送安全会议链接（患者 + 翻译 + 家属可加入）。" },
      { num: "04", title: "咨询", body: "30~60分钟视频会话，含实时翻译与文档审阅。" },
    ],
    featuresEyebrow: "包含内容",
    features: [
      { title: "高清视频 + 音频", body: "超低延迟 WebRTC。无需安装应用。" },
      { title: "实时医疗翻译", body: "韩语 ↔ 俄语 / 哈萨克语 / 英语 / 中文。" },
      { title: "文档共享", body: "MRI、CT、病理在通话中实时判读。" },
      { title: "癌症专科医生", body: "来自韩国顶级医院的认证肿瘤科医生。" },
      { title: "医疗级安全", body: "端到端 AES-256 加密，符合 PIPA §28-8。" },
      { title: "访客访问", body: "无需账户——患者仅凭链接加入。" },
      { title: "协调员随访", body: "每次会话后发送书面总结与下一步计划。" },
      { title: "透明定价", body: "固定咨询费。无隐藏费用。是否前往由您选择。" },
    ],
    docsEyebrow: "建议准备的资料",
    docsNote: "备齐这些资料能让咨询更准确。一开始只需提供联系方式即可——协调员会在咨询过程中为您指引。",
    docsItems: ["诊断书 / 病历证明", "病理（活检）报告", "手术确认书", "血液检查结果", "用药处方记录"],
    useCasesEyebrow: "何时使用远程协诊",
    useCases: [
      { title: "第二诊疗意见", body: "您已在本国获得诊断，希望在开始治疗前听取韩国肿瘤科医生的意见。" },
      { title: "出行前筛查", body: "您正在考虑前往韩国——远程协诊先确认您的病例在此可治，避免白跑一趟。" },
      { title: "术后复查", body: "在韩国手术后回国，复查管理仍可远程进行。" },
      { title: "家庭联合咨询", body: "患者 + 配偶 + 成年子女可从不同城市加入同一通话。" },
    ],
    faqEyebrow: "常见问题",
    faqs: [
      { q: "需要下载应用吗？", a: "不需要。远程协诊可在 PC、平板或手机的任意现代浏览器（Chrome、Safari、Edge）中运行。" },
      { q: "我的英语 / 韩语不太好怎么办？", a: "专业医疗翻译会加入通话。我们支持俄语、哈萨克语、英语和中文。" },
      { q: "这能替代面诊吗？", a: "不能。远程协诊用于初步评估、第二诊疗意见和随访。手术与治疗仍需到院。" },
      { q: "如何共享我的病历？", a: "通话前通过安全链接上传。MRI、CT、病理报告由专科医生在通话中实时判读。" },
      { q: "保险报销吗？", a: "通常本国保险不予报销。咨询费直接支付。部分私人保险计划可报销——欢迎咨询。" },
      { q: "隐私如何保护？", a: "全程 AES-256 端到端加密。记录遵循 PIPA §28-8（韩国）及等同 GDPR 的标准。" },
    ],
    ctaSection: {
      title: "您的首次咨询，本周即可进行。",
      body: "无需付款，无前往义务。分享您的病例，我们将在24小时内回复。",
      btn: "申请咨询",
    },
  },
  ja: {
    eyebrow: "遠隔協診 · がん治療コンシェルジュ",
    heroTitle: "飛行機に乗る前に、韓国の専門医とまず会いましょう。",
    heroLede:
      "ビザも航空券も不要です。アルマトイ・アスタナ・モスクワ、世界のどこからでも、韓国のがん専門医とリアルタイムのビデオ相談。韓国訪問は、確信を得てから決めてください。",
    ctaPrimary: "相談を申し込む",
    ctaSecondary: "進め方を見る",
    mockup: { caption: "実際の相談画面の例", title: "胃がん · 事前相談", endCall: "終了", connected: "接続中", live: "リアルタイム通訳", doctor: "キム医師 · 腫瘍内科", patient: "患者 · アルマトイ", srcTag: "医師 · 韓国語で話しています", srcLine: "CTで腫瘍が縮小しています。次の治療ステップを説明します。", transTag: "AIリアルタイム翻訳", transLine: "CTで腫瘍が縮小しています。次の治療ステップを説明します。" },
    stepsEyebrow: "進め方",
    stepsTitle: "申し込みから相談まで — 48時間以内。",
    steps: [
      { num: "01", title: "申し込み", body: "診断名、これまでの検査結果、希望言語をお知らせください。10分で完了します。" },
      { num: "02", title: "相談の割り当て", body: "healwithが症例に合った専門医2~3名を割り当てます。" },
      { num: "03", title: "リンク送信", body: "安全なミーティングリンクをメールで送信します（患者 + 通訳 + 家族が参加可能）。" },
      { num: "04", title: "相談", body: "30~60分のビデオセッション + リアルタイム通訳 + 書類確認。" },
    ],
    featuresEyebrow: "含まれる内容",
    features: [
      { title: "HD映像 + 音声", body: "超低遅延WebRTC。アプリのインストール不要。" },
      { title: "リアルタイム医療通訳", body: "韓 ↔ 露 / カザフ / 英 / 中。" },
      { title: "書類共有", body: "MRI、CT、病理を相談中にリアルタイムで読影。" },
      { title: "がん専門医", body: "韓国の上級総合病院の専門医（ボード認定）。" },
      { title: "医療グレードのセキュリティ", body: "エンドツーエンドAES-256、PIPA §28-8準拠。" },
      { title: "ゲストアクセス", body: "アカウント不要 — 患者はリンクのみで参加。" },
      { title: "コーディネーターの事後対応", body: "すべての相談後に要約と次のステップ計画を送付。" },
      { title: "透明な料金", body: "定額の相談料。隠れた費用なし。訪問はご自身の選択です。" },
    ],
    docsEyebrow: "ご準備いただくと役立つ書類",
    docsNote: "これらがあると相談がより正確になります。最初は連絡先だけでも大丈夫です — 相談を進めながらコーディネーターがご案内します。",
    docsItems: ["診断書 / 診療情報提供書", "病理（生検）結果", "手術確認書", "血液検査結果", "服薬・処方履歴"],
    useCasesEyebrow: "こんなときに遠隔協診",
    useCases: [
      { title: "セカンドオピニオン", body: "自国で診断を受けたが、治療を始める前に韓国の腫瘍専門医の意見を聞きたいとき。" },
      { title: "訪問前スクリーニング", body: "韓国訪問を検討中なら — 遠隔協診で「治療可能な症例か」を先に確認し、無駄足を防ぎます。" },
      { title: "術後の経過確認", body: "韓国での手術後に帰国しても、経過管理は遠隔で継続できます。" },
      { title: "家族合同相談", body: "患者 + 配偶者 + 成人したお子様が、それぞれの都市から同じ部屋に参加。" },
    ],
    faqEyebrow: "よくある質問",
    faqs: [
      { q: "アプリをインストールする必要がありますか？", a: "いいえ。遠隔協診はPC・タブレット・スマートフォンの最新ブラウザ（Chrome、Safari、Edge）で動作します。" },
      { q: "英語や韓国語が苦手です。", a: "専門の医療通訳が相談に同席します。ロシア語・カザフ語・英語・中国語に対応しています。" },
      { q: "対面診療の代わりになりますか？", a: "いいえ。遠隔協診は初期評価・セカンドオピニオン・事後管理のためのものです。手術・治療には訪問が必要です。" },
      { q: "医療記録はどのように共有しますか？", a: "相談前に安全なリンクからアップロードします。MRI・CT・病理レポートを医師が相談中にリアルタイムで読影します。" },
      { q: "保険は適用されますか？", a: "自国の保険は通常適用されません。相談料は直接お支払いいただきます。一部のプライベートプランは払い戻し対象です — お問い合わせください。" },
      { q: "プライバシーはどう守られますか？", a: "全区間AES-256でエンドツーエンド暗号化。記録はPIPA §28-8（韓国）およびGDPR同等基準に準拠します。" },
    ],
    ctaSection: {
      title: "初回相談を今週受けることができます。",
      body: "支払い不要、訪問義務なし。症例を共有いただければ24時間以内に返信します。",
      btn: "相談を申し込む",
    },
  },
};

export default function TelemedicineClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {copy.eyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {copy.heroTitle}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {copy.heroLede}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
          >
            {copy.ctaPrimary} <ArrowRight size={18} />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-700 transition-colors"
          >
            {copy.ctaSecondary} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* CONSULTATION SCREEN MOCKUP — 실제 /consultation 화면 구조와 동일하게 (헤더+영상+자막오버레이+컨트롤바) */}
      <section className="max-w-4xl mx-auto px-4 pb-12 md:pb-16">
        <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-700 bg-gray-900">
          {/* 헤더 바 (실제와 동일: 제목 + Room + 연결됨 / 번역토글 + 종료) */}
          <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 md:px-4 md:py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ChevronLeft size={18} className="text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{copy.mockup.title}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  Room: healo-xxxx <span className="text-green-400 ml-1">● {copy.mockup.connected}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-white bg-teal-700 rounded-lg px-2.5 py-1.5">
                <Languages size={13} /> {copy.mockup.live}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-red-600 rounded-lg px-2.5 py-1.5">
                <PhoneOff size={13} /> {copy.mockup.endCall}
              </span>
            </div>
          </div>

          {/* 영상 영역 (자막 오버레이가 영상 위에 떠있음) */}
          <div className="relative bg-gray-950 p-3 md:p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-[4/3] rounded-lg bg-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
                  <Stethoscope size={24} className="text-teal-300" />
                </div>
                <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">{copy.mockup.doctor}</span>
              </div>
              <div className="aspect-[4/3] rounded-lg bg-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-500/20 border border-gray-400/30 flex items-center justify-center">
                  <Users size={24} className="text-gray-300" />
                </div>
                <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">{copy.mockup.patient}</span>
              </div>
            </div>

            {/* 자막 오버레이 (실제와 동일: 영상 하단에 중앙정렬 검은 박스, 원문 → 번역) */}
            <div className="absolute bottom-5 left-5 right-5 md:bottom-6 md:left-7 md:right-7">
              <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
                <p className="text-[11px] md:text-xs text-gray-400 mb-1">{copy.mockup.srcTag}</p>
                <p className="text-sm md:text-base text-white mb-2">{copy.mockup.srcLine}</p>
                <div className="border-t border-gray-600 pt-2">
                  <p className="text-[11px] md:text-xs text-teal-400 mb-1 inline-flex items-center gap-1">
                    <Languages size={12} /> {copy.mockup.transTag}
                  </p>
                  <p className="text-sm md:text-base font-bold text-teal-300 leading-snug">{copy.mockup.transLine}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 컨트롤 바 (실제 LiveKit ControlBar 자리: 마이크·카메라·종료) */}
          <div className="bg-gray-800 border-t border-gray-700 py-2.5 flex items-center justify-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center"><Mic size={16} className="text-white" /></span>
            <span className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center"><Video size={16} className="text-white" /></span>
            <span className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center"><PhoneOff size={16} className="text-white" /></span>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-3">{copy.mockup.caption}</p>
      </section>

      {/* STEPS */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {copy.stepsEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-snug max-w-2xl">
            {copy.stepsTitle}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {copy.steps.map((step, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <span className="inline-flex w-9 h-9 rounded-lg bg-teal-700 text-white font-bold items-center justify-center text-sm mb-3">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5 leading-snug">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-8">
          {copy.featuresEyebrow}
        </span>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {copy.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] || Video;
            return (
              <div key={i} className="border border-gray-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
                <span className="inline-flex w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 items-center justify-center mb-3">
                  <Icon size={18} className="text-teal-700" />
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* USE CASES */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-8">
            {copy.useCasesEyebrow}
          </span>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {copy.useCases.map((uc, i) => (
              <article key={i} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <div className="text-xs font-bold tracking-wide text-teal-700 mb-2">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{uc.title}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{uc.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 준비하면 좋은 서류 (안내 톤 — 필수 아님) */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {copy.docsEyebrow}
        </span>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl mb-6 md:mb-8">
          {copy.docsNote}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {copy.docsItems.map((d, i) => (
            <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3">
              <span className="inline-flex w-7 h-7 shrink-0 rounded-lg bg-teal-50 border border-teal-100 items-center justify-center">
                <FileText size={15} className="text-teal-700" />
              </span>
              <span className="text-sm md:text-base text-gray-700">{d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-6">
          {copy.faqEyebrow}
        </span>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {copy.faqs.map((faq, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-base md:text-lg font-bold text-gray-900">
                <span>{faq.q}</span>
                <ArrowRight
                  size={18}
                  className="shrink-0 mt-1 text-teal-700 transition-transform group-open:rotate-90"
                />
              </summary>
              <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
            {copy.ctaSection.title}
          </h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            {copy.ctaSection.body}
          </p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {copy.ctaSection.btn} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
