/**
 * 면력한방병원 속 페이지(탭) 데이터 — **목업**.
 *
 * 페이지 하나 = `{ title, subtitle, blocks: [...] }`. 블록 타입은 `blocks.jsx` 참고
 * (intro · cards · steps · table · doctors · gallery · branches).
 *
 * 📌 근거: immunehospital.com(센터·암종·진료시간·대표번호) · `hospitals` 테이블(4개 지점 주소)
 *        · `center_menu_items`(치료 항목) · 대한민국 의료 비자 제도(C-3-3 / G-1-10).
 *
 * 🚨 목업 한계 — 병원 확인 필요
 *   · 「해외 환자 안내」의 통역·픽업·체류 지원 범위는 **판이 제안하는 표준 항목**이지 면력이 확약한 게 아니다.
 *     실제 구축 때 병원과 하나씩 맞춰야 한다. 그래서 단정 대신 «상담 시 안내» 표현을 썼다.
 *   · 진료비는 국내 비급여 기준이라 외국인 진료비와 다를 수 있어 **숫자를 안 넣었다.**
 */

const D = (ko, en, ru, kz, zh, ja) => ({ ko, en, ru, kz, zh, ja });

/** 헤더 메뉴 — 병원마다 페이지 구성이 다르므로 목록도 데이터다. */
export const IMMUNE_NAV = [
  { slug: "about", label: D("병원 소개", "About", "О клинике", "Клиника туралы", "医院介绍", "病院紹介") },
  { slug: "treatments", label: D("진료 안내", "Treatments", "Лечение", "Емдеу", "诊疗项目", "診療案内") },
  { slug: "doctors", label: D("의료진", "Doctors", "Врачи", "Дәрігерлер", "医疗团队", "医療陣") },
  { slug: "international", label: D("해외 환자 안내", "International Patients", "Иностранным пациентам", "Шетелдік науқастарға", "海外患者指南", "海外患者の方へ") },
  { slug: "contact", label: D("오시는 길", "Visit Us", "Как добраться", "Мекенжай", "交通指南", "アクセス") },
];

export const IMMUNE_PAGES = {
  /* ─────────────── 병원 소개 ─────────────── */
  about: {
    title: D("면력한방병원", "About Immune Hospital", "О клинике", "Клиника туралы", "关于 Immune Hospital", "Immune Hospital について"),
    subtitle: D(
      "암 치료의 «사이»를 채우는 병원입니다.",
      "The hospital that fills the gaps between cancer treatments.",
      "Клиника, которая заполняет промежутки между этапами лечения рака.",
      "Обырды емдеу кезеңдерінің арасын толтыратын клиника.",
      "填补癌症治疗«间隙»的医院。",
      "がん治療の«あいだ»を埋める病院です。",
    ),
    blocks: [
      {
        type: "intro",
        image: "/immune/brand/lobby.jpg",
        title: D("우리가 맡는 자리", "Where We Fit In", "Наше место в лечении", "Емдеудегі біздің орнымыз", "我们所处的位置", "私たちが担う場所"),
        body: D(
          "암 치료는 수술과 항암으로 끝나지 않습니다.\n그 사이에 체력이 떨어지고, 통증이 오고, 먹는 것이 어려워집니다. 많은 환자가 이 구간에서 치료를 중단합니다.\n\n면력한방병원은 그 «사이»를 맡습니다. 수술과 항암은 협진 대학병원에서 받고, 면역·체력·회복 관리를 저희가 이어서 봅니다. 한의사와 양방 의료진이 같은 환자를 두고 함께 계획을 세웁니다.\n\n2024년 11월 기준 누적 치료 사례 50,000건. 서울·수도권 4개 지점에서 암면역·신경면역·재활 3개 센터를 운영합니다.",
          "Cancer treatment does not end with surgery and chemotherapy.\nIn between, strength drops, pain arrives, and eating becomes difficult. Many patients stop treatment in this gap.\n\nImmune Hospital takes care of that gap. Surgery and chemotherapy happen at cooperating university hospitals, while we continue immunity, strength and recovery care. Korean Medicine doctors and medical doctors build the plan together for the same patient.\n\n50,000+ cumulative treatment cases as of November 2024. Three centers — cancer immunity, neuro-immunity and rehabilitation — across four branches in the Seoul area.",
          "Лечение рака не заканчивается операцией и химиотерапией.\nВ промежутках падают силы, приходит боль, становится трудно есть. Многие пациенты именно здесь прерывают лечение.\n\nImmune Hospital берёт на себя этот промежуток. Операция и химиотерапия проходят в партнёрских университетских больницах, а мы продолжаем работу с иммунитетом, силами и восстановлением. Врачи корейской и западной медицины составляют план вместе.\n\nБолее 50 000 случаев лечения на ноябрь 2024 года. Три центра — онкоиммунитет, нейроиммунитет и реабилитация — в четырёх филиалах в Сеуле и пригороде.",
          "Обырды емдеу операция мен химиотерапиямен аяқталмайды.\nАралықта күш кетеді, ауырсыну келеді, тамақ ішу қиындайды. Көп науқас дәл осы кезеңде емді тоқтатады.\n\nImmune Hospital осы аралықты өз мойнына алады. Операция мен химиотерапия серіктес университеттік ауруханада өтеді, ал біз иммунитет, күш және қалпына келу жұмысын жалғастырамыз. Корей және батыс медицинасының дәрігерлері жоспарды бірге құрады.\n\n2024 жылғы қараша бойынша 50 000-нан астам емдеу жағдайы. Сеул мен маңында төрт филиалда үш орталық жұмыс істейді.",
          "癌症治疗并非止于手术与化疗。\n在这期间体力下降、疼痛出现、进食困难，许多患者正是在这一段中断了治疗。\n\nImmune Hospital 负责的正是这个«间隙»。手术与化疗在协诊大学医院进行，免疫、体力与康复管理由我们接续。韩医师与西医师针对同一位患者共同制定方案。\n\n截至2024年11月，累计诊疗50,000例。在首尔及首都圈4家分院运营癌症免疫、神经免疫、康复3大中心。",
          "がん治療は手術と抗がん治療で終わりません。\nその間に体力が落ち、痛みが来て、食べることが難しくなります。多くの患者がこの区間で治療を中断します。\n\nImmune Hospital はその«あいだ»を担います。手術と抗がん治療は連携大学病院で受け、免疫・体力・回復のケアを当院が続けます。韓方医と西洋医が同じ患者について一緒に計画を立てます。\n\n2024年11月時点で累計治療5万件。ソウル圏4拠点で、がん免疫・神経免疫・リハビリの3センターを運営しています。",
        ),
      },
      {
        type: "gallery",
        eyebrow: "Our Space",
        title: D("진료가 이루어지는 공간", "Where Treatment Happens", "Где проходит лечение", "Ем өтетін кеңістік", "诊疗所在的空间", "診療が行われる空間"),
        items: [
          // ⚠️ 이 자리엔 원래 **이 페이지 위쪽 소개글에 쓴 로비 사진**이 그대로 또 들어가 있었다
          //    (2026-07-29 자동검사가 잡음). 한 페이지 안에서 같은 사진이 두 번 나오면
          //    사진이 모자라 돌려 쓴 것처럼 읽힌다.
          { src: "/immune/facility/facility-ward-room-2.jpg", caption: D("입원 병실", "Inpatient room", "Стационарная палата", "Стационар палатасы", "住院病房", "入院病室") },
          { src: "/immune/brand/care-meal.jpg", caption: D("병원에서 직접 준비하는 치료식", "Therapeutic meals prepared in-house", "Лечебное питание собственного приготовления", "Ауруханада дайындалатын емдік тамақ", "院内自制治疗餐", "院内で用意する治療食") },
          { src: "/images/hospitals/immunehospital-magok/1.jpg", caption: D("진료 공간", "Consultation area", "Зона приёма", "Қабылдау аймағы", "诊疗区", "診療スペース") },
          { src: "/images/hospitals/immunehospital-magok/3.jpg", caption: D("치료실", "Treatment room", "Процедурный кабинет", "Ем бөлмесі", "治疗室", "治療室") },
          { src: "/images/hospitals/immunehospital-magok/5.jpg", caption: D("한방 케어 공간", "Korean Medicine care area", "Зона корейской медицины", "Корей медицинасы аймағы", "韩方护理区", "韓方ケア空間") },
        ],
      },
    ],
  },

  /* ─────────────── 진료 안내 ─────────────── */
  treatments: {
    title: D("진료 안내", "Treatments", "Лечение", "Емдеу", "诊疗项目", "診療案内"),
    subtitle: D(
      "3개 전문 센터에서 진단·면역치료·재활이 이어집니다.",
      "Diagnosis, immunotherapy and rehabilitation continue across three specialized centers.",
      "Диагностика, иммунотерапия и реабилитация — в трёх профильных центрах.",
      "Диагностика, иммунотерапия және оңалту үш мамандандырылған орталықта.",
      "在三大专业中心，诊断、免疫治疗与康复连续进行。",
      "3つの専門センターで診断・免疫治療・リハビリが続きます。",
    ),
    blocks: [
      {
        type: "cards",
        eyebrow: "Centers",
        title: D("3개 전문 센터", "Three Specialized Centers", "Три профильных центра", "Үш мамандандырылған орталық", "三大专业中心", "3つの専門センター"),
        items: [
          {
            image: "/images/hospitals/immunehospital-magok/2.jpg",
            title: D("암면역센터", "Cancer Immunity Center", "Центр онкоиммунитета", "Онкоиммунитет орталығы", "癌症免疫中心", "がん免疫センター"),
            desc: D("수술·항암과 병행하는 면역·체력 관리.", "Immunity and strength care alongside surgery and chemotherapy.", "Поддержка иммунитета и сил параллельно с операцией и химиотерапией.", "Операция мен химиотерапиямен қатар иммунитет пен күшті қолдау.", "与手术化疗并行的免疫与体力管理。", "手術・抗がん治療と並行する免疫・体力ケア。"),
            items: [
              D("유방·자궁·난소암", "Breast, uterine, ovarian", "Молочная железа, матка, яичники", "Сүт безі, жатыр, аналық без", "乳腺·子宫·卵巢癌", "乳房・子宮・卵巣がん"),
              D("대장·위암", "Colorectal, gastric", "Толстая кишка, желудок", "Ішек, асқазан", "大肠·胃癌", "大腸・胃がん"),
              D("간·담도·췌장암", "Liver, biliary, pancreatic", "Печень, жёлчные пути, поджелудочная", "Бауыр, өт жолдары, ұйқы безі", "肝·胆道·胰腺癌", "肝・胆道・膵臓がん"),
              D("폐암 · 갑상선암", "Lung, thyroid", "Лёгкие, щитовидная железа", "Өкпе, қалқанша без", "肺癌·甲状腺癌", "肺がん・甲状腺がん"),
            ],
          },
          {
            image: "/images/hospitals/immunehospital-magok/4.jpg",
            title: D("신경면역센터", "Neuro-Immunity Center", "Центр нейроиммунитета", "Нейроиммунитет орталығы", "神经免疫中心", "神経免疫センター"),
            desc: D("신경 손상과 통증의 회복.", "Recovery from nerve damage and pain.", "Восстановление после повреждения нервов и боли.", "Жүйке зақымы мен ауырсынудан қалпына келу.", "神经损伤与疼痛的恢复。", "神経損傷と痛みの回復。"),
            items: [
              D("대상포진", "Shingles", "Опоясывающий лишай", "Белдемше", "带状疱疹", "帯状疱疹"),
              D("안면마비", "Facial palsy", "Паралич лицевого нерва", "Бет нервінің салдануы", "面瘫", "顔面神経麻痺"),
              D("pDRN 신경주사 · 냉각치료(CRYO)", "pDRN injection · cryotherapy", "Инъекции pDRN · криотерапия", "pDRN инъекциясы · криотерапия", "pDRN神经注射·冷冻治疗", "pDRN神経注射・冷却治療"),
            ],
          },
          {
            image: "/images/hospitals/immunehospital-magok/5.jpg",
            title: D("재활센터", "Rehabilitation Center", "Центр реабилитации", "Оңалту орталығы", "康复中心", "リハビリセンター"),
            desc: D("수술 후 기능 회복.", "Functional recovery after surgery.", "Восстановление функций после операции.", "Оталған соң қызметті қалпына келтіру.", "术后功能恢复。", "術後の機能回復。"),
            items: [
              D("수술 후 재활", "Post-surgical rehabilitation", "Реабилитация после операции", "Оталған соң оңалту", "术后康复", "術後リハビリ"),
              D("부인과 수술 후 회복", "Recovery after gynecologic surgery", "Восстановление после гинекологических операций", "Гинекологиялық оталардан кейін", "妇科手术后恢复", "婦人科手術後の回復"),
              D("교통사고 후유증", "Post-accident care", "Последствия ДТП", "Жол апатының салдары", "交通事故后遗症", "交通事故後遺症"),
            ],
          },
        ],
      },
      {
        type: "cards",
        columns: 2,
        eyebrow: "Programs",
        title: D("주요 치료 프로그램", "Treatment Programs", "Программы лечения", "Емдеу бағдарламалары", "主要治疗项目", "主な治療プログラム"),
        items: [
          {
            title: D("면역·영양 수액", "Immune & Nutritional IV", "Иммунные и питательные капельницы", "Иммундық және тағамдық тамшылар", "免疫·营养输液", "免疫・栄養点滴"),
            desc: D("항암 중 떨어진 체력과 면역을 받쳐줍니다. 주 3회 이상 권장.", "Supports strength and immunity during chemotherapy. Typically three or more sessions per week.", "Поддерживает силы и иммунитет во время химиотерапии. Обычно от трёх сеансов в неделю.", "Химиотерапия кезінде күш пен иммунитетті қолдайды. Әдетте аптасына үш реттен.", "支持化疗期间的体力与免疫，建议每周3次以上。", "抗がん治療中の体力と免疫を支えます。週3回以上が目安。"),
            items: [
              D("항염증 수액", "Anti-inflammatory IV", "Противовоспалительная капельница", "Қабынуға қарсы тамшы", "抗炎输液", "抗炎症点滴"),
              D("점막면역 보강", "Mucosal immunity support", "Поддержка слизистого иммунитета", "Шырышты иммунитетті қолдау", "黏膜免疫支持", "粘膜免疫サポート"),
              D("비타민 D 고용량", "High-dose Vitamin D", "Витамин D в высокой дозе", "Жоғары дозадағы D дәрумені", "高剂量维生素D", "高用量ビタミンD"),
            ],
          },
          {
            title: D("재생·회복 치료", "Regenerative Care", "Регенеративная терапия", "Регенеративті ем", "再生·恢复治疗", "再生・回復治療"),
            desc: D("손상된 신경과 조직의 회복을 돕습니다.", "Supports recovery of damaged nerves and tissue.", "Способствует восстановлению повреждённых нервов и тканей.", "Зақымдалған жүйке мен тіндердің қалпына келуіне көмектеседі.", "帮助受损神经与组织恢复。", "傷んだ神経・組織の回復を助けます。"),
            items: [
              D("pDRN 신경주사 (주 2~3회)", "pDRN nerve injection (2–3×/week)", "Инъекции pDRN (2–3 раза в неделю)", "pDRN инъекциясы (аптасына 2–3 рет)", "pDRN神经注射（每周2~3次）", "pDRN神経注射（週2〜3回）"),
              D("냉각치료(CRYO) + 재활 (40~50분)", "Cryotherapy + rehab (40–50 min)", "Криотерапия и реабилитация (40–50 мин)", "Криотерапия және оңалту (40–50 мин)", "冷冻治疗+康复（40~50分钟）", "冷却治療＋リハビリ（40〜50分）"),
              D("자가재생 치료(GFC)", "Autologous regenerative (GFC)", "Аутологичная терапия (GFC)", "Аутологиялық ем (GFC)", "自体再生治疗(GFC)", "自家再生治療(GFC)"),
            ],
          },
          {
            title: D("한약 처방", "Korean Herbal Medicine", "Корейская фитотерапия", "Корей фитотерапиясы", "韩药处方", "韓方処方"),
            desc: D("체질과 치료 단계에 맞춰 조제합니다. 귀국 후에도 복용을 이어갈 수 있습니다.", "Formulated to your constitution and treatment stage — and can be continued after you return home.", "Составляется по конституции и стадии лечения; приём можно продолжить дома.", "Дене ерекшелігі мен ем кезеңіне сай дайындалады; үйде жалғастыруға болады.", "根据体质与治疗阶段配制，回国后也可继续服用。", "体質と治療段階に合わせて調剤し、帰国後も続けられます。"),
            items: [
              D("개인 맞춤 처방", "Personalized formula", "Индивидуальная формула", "Жеке формула", "个人定制处方", "オーダーメイド処方"),
              D("공진단 (녹용·원방)", "Gongjindan tonic", "Тоник Конджиндан", "Конжиндан тонигі", "拱辰丹", "拱辰丹"),
              D("소경활혈환", "Sogyeong-hwalhyeol formula", "Согён-хвальхёль", "Сокён-хвальхөл", "疏经活血丸", "疎経活血丸"),
            ],
          },
          {
            title: D("검사", "Diagnostics", "Диагностика", "Диагностика", "检查", "検査"),
            desc: D("치료 방향을 정하고 경과를 확인하기 위한 검사.", "Tests to set the treatment plan and track progress.", "Обследования для определения плана и контроля динамики.", "Ем жоспарын белгілеу және динамиканы бақылау үшін тексерулер.", "用于确定治疗方向与追踪病程的检查。", "治療方針を決め、経過を確認するための検査。"),
            items: [
              D("혈액 종합 검사", "Comprehensive blood panel", "Комплексный анализ крови", "Кешенді қан анализі", "血液综合检查", "血液総合検査"),
              D("자율신경 검사", "Autonomic nervous system test", "Исследование вегетативной нервной системы", "Вегетативті жүйке жүйесін тексеру", "自主神经检查", "自律神経検査"),
              D("영상 검사 (X-ray)", "Imaging (X-ray)", "Визуализация (рентген)", "Бейнелеу (рентген)", "影像检查（X光）", "画像検査（X線）"),
            ],
          },
        ],
      },
      {
        type: "steps",
        eyebrow: "Process",
        title: D("치료는 이렇게 진행됩니다", "How Treatment Works", "Как проходит лечение", "Емдеу қалай өтеді", "治疗如何进行", "治療の進み方"),
        items: [
          {
            title: D("상담 · 자료 검토", "Consultation & record review", "Консультация и разбор документов", "Кеңес және құжаттарды қарау", "咨询与资料审阅", "相談・資料確認"),
            desc: D("진단서와 검사 결과를 보내주시면 먼저 검토합니다.", "Send your diagnosis and test results — we review them first.", "Пришлите заключение и результаты обследования — мы сначала их изучим.", "Диагноз бен тексеру нәтижелерін жіберіңіз — алдымен қарап шығамыз.", "请提供诊断书与检查结果，我们会先行审阅。", "診断書と検査結果をお送りいただき、まず確認します。"),
          },
          {
            title: D("내원 · 검사", "Visit & tests", "Визит и обследование", "Келу және тексеру", "到院与检查", "来院・検査"),
            desc: D("현재 상태를 확인하는 검사를 진행합니다.", "We run tests to confirm your current condition.", "Проводим обследование, чтобы уточнить текущее состояние.", "Ағымдағы жағдайды нақтылау үшін тексеру жүргіземіз.", "进行检查以确认当前状态。", "現在の状態を確認する検査を行います。"),
          },
          {
            title: D("양·한방 협진 계획", "Joint treatment plan", "Совместный план лечения", "Бірлескен ем жоспары", "韩西医协诊方案", "韓方・西洋の協診計画"),
            desc: D("한방·양방 대표원장이 함께 치료 방향과 일정을 정합니다.", "Our Korean Medicine and medical directors decide the plan and schedule together.", "Главные врачи корейской и западной медицины вместе определяют план и график.", "Корей және батыс медицинасының бас дәрігерлері жоспар мен кестені бірге белгілейді.", "韩医与西医代表院长共同确定方案与日程。", "韓方・西洋の代表院長が治療方針と日程を一緒に決めます。"),
          },
          {
            title: D("치료 · 경과 확인", "Treatment & follow-up", "Лечение и наблюдение", "Ем және бақылау", "治疗与复诊", "治療・経過確認"),
            desc: D("치료를 진행하며 경과를 기록하고, 필요하면 계획을 조정합니다.", "We track progress during treatment and adjust the plan when needed.", "Во время лечения фиксируем динамику и при необходимости корректируем план.", "Ем барысында динамиканы жазып, қажет болса жоспарды түзетеміз.", "治疗过程中记录病程，必要时调整方案。", "治療しながら経過を記録し、必要に応じて計画を調整します。"),
          },
        ],
      },
      /* 2026-07-29 추가 — 병원 구글 드라이브(성동점 2차 촬영 저용량본 45장)에서 받은 실사진.
         왜 「진료 안내」에 붙였나: 해외 환자가 실제로 묻는 건 «치료받는 두 시간»이 아니라
         «치료와 치료 **사이**에 뭘 하나»다(입원 2~4주 프로그램이라 그 시간이 훨씬 길다).
         이 병원은 그 자리에 족욕·사우나·운동 층을 통째로 지어 놨는데 화면엔 하나도 없었다.
         ⚠️ 사진에 사람이 없다 = 환자 얼굴 문제 없음(전문 촬영 공간컷). */
      {
        type: "gallery",
        eyebrow: "Between Treatments",
        title: D("치료와 치료 사이", "Between Treatments", "Между процедурами", "Емдеу аралығында", "治疗与治疗之间", "治療と治療のあいだ"),
        items: [
          { src: "/immune/life/wellness-floor-1.jpg", caption: D("운동 공간과 사우나가 한 층에", "Fitness floor with sauna", "Этаж с тренажёрами и сауной", "Жаттығу залы мен сауна бір қабатта", "健身空间与桑拿同层", "運動スペースとサウナが同じ階に") },
          { src: "/immune/life/footbath-1.jpg", caption: D("족욕 좌석", "Foot-bath seats", "Места для ванночек для ног", "Аяқ ванналарына арналған орындар", "足浴座位", "足浴席") },
          { src: "/immune/life/sauna-cabin-1.jpg", caption: D("사우나 캐빈", "Sauna cabin", "Кабина сауны", "Сауна кабинасы", "桑拿房", "サウナキャビン") },
          { src: "/immune/life/rest-booth-1.jpg", caption: D("1인 휴식 부스", "Single rest booths", "Индивидуальные кабинки отдыха", "Жеке демалыс орындары", "单人休息位", "一人用の休憩ブース") },
          { src: "/immune/life/bike-1.jpg", caption: D("실내 자전거", "Exercise bikes", "Велотренажёры", "Велотренажёрлар", "室内单车", "エアロバイク") },
          { src: "/immune/life/dining-sauce-1.jpg", caption: D("약선 다이닝은 병원 주방에서 나옵니다", "The therapeutic course comes from the hospital's own kitchen", "Лечебное меню готовится на кухне клиники", "Емдік ас клиниканың өз асханасында дайындалады", "药膳套餐出自院内厨房", "薬膳ダイニングは院内の厨房から出ます") },
        ],
      },
    ],
  },

  /* ─────────────── 의료진 ─────────────── */
  doctors: {
    title: D("의료진", "Our Doctors", "Наши врачи", "Біздің дәрігерлер", "医疗团队", "医療陣"),
    subtitle: D(
      "한방과 양방 의료진이 같은 환자를 함께 봅니다.",
      "Korean Medicine and medical doctors see the same patient together.",
      "Врачи корейской и западной медицины ведут пациента совместно.",
      "Корей және батыс медицинасының дәрігерлері науқасты бірлесіп қарайды.",
      "韩医师与西医师共同诊治同一位患者。",
      "韓方医と西洋医が同じ患者を一緒に診ます。",
    ),
    blocks: [
      {
        type: "doctors",
        eyebrow: "Medical Team",
        title: D("지점별 대표원장", "Branch Directors", "Главные врачи филиалов", "Филиал бас дәрігерлері", "各院区代表院长", "拠点別 代表院長"),
        items: [
      /* ── 강서점 6명 ── */
      {
        name: { ko: "황이준", en: "Dr. Hwang I-jun", ru: "Д-р Хван И-джун", kz: "Д-р Хван И-джун", zh: "황이준", ja: "ファン・イジュン" },
        title: { ko: "강서점 대표원장", en: "Gangseo Director", ru: "Кансо Главный врач", kz: "Кансо Бас дәрігер", zh: "江西院区 代表院长", ja: "江西院 代表院長" },
        photo: "/immune/doctor/gangeo-dr-hwang-ijun.png",
      },
      {
        name: { ko: "이우석", en: "Dr. Lee Woo-seok", ru: "Д-р Ли У-сок", kz: "Д-р Ли У-сок", zh: "이우석", ja: "イ・ウソク" },
        title: { ko: "양방 대표원장", en: "Medical Director", ru: "Главврач (западная медицина)", kz: "Бас дәрігер (батыс медицинасы)", zh: "西医代表院长", ja: "西洋医代表院長" },
        credentials: { ko: "통합면역 부인과", en: "Integrative Immunity · Obstetrics & Gynecology", ru: "Интегративная иммунология · Гинекология", kz: "Интегративті иммунология · Гинекология", zh: "整合免疫 · 妇科", ja: "統合免疫 · 婦人科" },
        photo: "/immune/doctor/gangeo-dr-lee-useok.jpg",
      },
      {
        name: { ko: "임지성", en: "Dr. Im Ji-seong", ru: "Д-р Им Джи-сон", kz: "Д-р Им Джи-сон", zh: "임지성", ja: "イム・ジソン" },
        title: { ko: "의무원장", en: "Chief Medical Officer", ru: "Медицинский директор", kz: "Медициналық директор", zh: "医务院长", ja: "医務院長" },
        credentials: { ko: "통증재활 한방재활의학과", en: "Pain & Rehabilitation · Korean Rehabilitation Medicine", ru: "Боль и реабилитация · Корейская реабилитационная медицина", kz: "Ауырсыну және оңалту · Корей оңалту медицинасы", zh: "疼痛康复 · 韩方康复医学科", ja: "疼痛リハビリ · 韓方リハビリ医学科" },
        photo: "/immune/doctor/gangeo-dr-im-jisung.jpg",
      },
      {
        name: { ko: "김지영", en: "Dr. Kim Ji-young", ru: "Д-р Ким Джи-ён", kz: "Д-р Ким Джи-ён", zh: "김지영", ja: "キム・ジヨン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통합면역 한방내과", en: "Integrative Immunity · Korean Internal Medicine", ru: "Интегративная иммунология · Корейская терапия", kz: "Интегративті иммунология · Корей терапиясы", zh: "整合免疫 · 韩方内科", ja: "統合免疫 · 韓方内科" },
        photo: "/immune/doctor/gangeo-dr-kim-jiyoung.jpg",
      },
      {
        name: { ko: "김은지", en: "Dr. Kim Eun-ji", ru: "Д-р Ким Ын-джи", kz: "Д-р Ким Ын-джи", zh: "김은지", ja: "キム・ウンジ" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통합면역 한방내과", en: "Integrative Immunity · Korean Internal Medicine", ru: "Интегративная иммунология · Корейская терапия", kz: "Интегративті иммунология · Корей терапиясы", zh: "整合免疫 · 韩方内科", ja: "統合免疫 · 韓方内科" },
        photo: "/immune/doctor/gangeo-dr-kim-eunji.jpg",
      },
      {
        name: { ko: "배상근", en: "Dr. Bae Sang-geun", ru: "Д-р Пэ Сан-гын", kz: "Д-р Пэ Сан-гын", zh: "배상근", ja: "ペ・サングン" },
        title: { ko: "양방 원장", en: "Physician", ru: "Врач (западная медицина)", kz: "Дәрігер (батыс медицинасы)", zh: "西医院长", ja: "西洋医院長" },
        credentials: { ko: "통합면역 가정의학", en: "Integrative Immunity · Family Medicine", ru: "Интегративная иммунология · Семейная медицина", kz: "Интегративті иммунология · Отбасылық медицина", zh: "整合免疫 · 家庭医学", ja: "統合免疫 · 家庭医学" },
        photo: "",  // 병원 사이트에도 사진 없음(로고 자리표시) — 남의 얼굴을 붙이지 않는다
      },

      /* ── 광명점 7명 ── */
      {
        name: { ko: "배길준", en: "Dr. Bae Gil-jun", ru: "Д-р Пэ Гиль-джун", kz: "Д-р Пэ Гиль-джун", zh: "배길준", ja: "ペ・ギルジュン" },
        title: { ko: "광명점 대표원장", en: "Gwangmyeong Director", ru: "Кванмён Главный врач", kz: "Кванмён Бас дәрігер", zh: "光明院区 代表院长", ja: "光明院 代表院長" },
        photo: "/immune/doctor/gwangmyeong-dr-bae-giljun.png",
      },
      {
        name: { ko: "하정빈", en: "Dr. Ha Jeong-bin", ru: "Д-р Ха Чон-бин", kz: "Д-р Ха Чон-бин", zh: "하정빈", ja: "ハ・ジョンビン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통합면역 한방내과", en: "Integrative Immunity · Korean Internal Medicine", ru: "Интегративная иммунология · Корейская терапия", kz: "Интегративті иммунология · Корей терапиясы", zh: "整合免疫 · 韩方内科", ja: "統合免疫 · 韓方内科" },
        photo: "/immune/doctor/gwangmyeong-dr-ha-jeongbin.jpg",
      },
      {
        name: { ko: "오재우", en: "Dr. Oh Jae-woo", ru: "Д-р О Чжэ-у", kz: "Д-р О Чжэ-у", zh: "오재우", ja: "オ・ジェウ" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통증재활 한방신경정신과", en: "Pain & Rehabilitation · Korean Neuropsychiatry", ru: "Боль и реабилитация · Корейская нейропсихиатрия", kz: "Ауырсыну және оңалту · Корей нейропсихиатриясы", zh: "疼痛康复 · 韩方神经精神科", ja: "疼痛リハビリ · 韓方神経精神科" },
        photo: "/immune/doctor/gwangmyeong-dr-oh-jaewoo.jpg",
      },
      {
        name: { ko: "김상현", en: "Dr. Kim Sang-hyeon", ru: "Д-р Ким Сан-хён", kz: "Д-р Ким Сан-хён", zh: "김상현", ja: "キム・サンヒョン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통합면역", en: "Integrative Immunity", ru: "Интегративная иммунология", kz: "Интегративті иммунология", zh: "整合免疫", ja: "統合免疫" },
        photo: "/immune/doctor/gwangmyeong-dr-kim-sanghyeon.jpg",
      },
      {
        name: { ko: "김주완", en: "Dr. Kim Ju-wan", ru: "Д-р Ким Чжу-ван", kz: "Д-р Ким Чжу-ван", zh: "김주완", ja: "キム・ジュワン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통증재활", en: "Pain & Rehabilitation", ru: "Боль и реабилитация", kz: "Ауырсыну және оңалту", zh: "疼痛康复", ja: "疼痛リハビリ" },
        photo: "/immune/doctor/gwangmyeong-dr-kim-juwan.jpg",
      },
      {
        name: { ko: "조성원", en: "Dr. Cho Seong-won", ru: "Д-р Чо Сон-вон", kz: "Д-р Чо Сон-вон", zh: "조성원", ja: "チョ・ソンウォン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통증재활", en: "Pain & Rehabilitation", ru: "Боль и реабилитация", kz: "Ауырсыну және оңалту", zh: "疼痛康复", ja: "疼痛リハビリ" },
        photo: "/immune/doctor/gwangmyeong-dr-jo-seongwon.jpg",
      },
      {
        name: { ko: "이정훈", en: "Dr. Lee Jeong-hun", ru: "Д-р Ли Чон-хун", kz: "Д-р Ли Чон-хун", zh: "이정훈", ja: "イ・ジョンフン" },
        title: { ko: "양방 대표원장", en: "Medical Director", ru: "Главврач (западная медицина)", kz: "Бас дәрігер (батыс медицинасы)", zh: "西医代表院长", ja: "西洋医代表院長" },
        credentials: { ko: "통합면역 마취통증의학과", en: "Integrative Immunity · Anesthesiology & Pain Medicine", ru: "Интегративная иммунология · Анестезиология и лечение боли", kz: "Интегративті иммунология · Анестезиология және ауырсынуды емдеу", zh: "整合免疫 · 麻醉疼痛医学科", ja: "統合免疫 · 麻酔疼痛医学科" },
        photo: "/immune/doctor/gwangmyeong-dr-lee-jeonghun.png",
      },

      /* ── 신촌점 6명 ── */
      {
        name: { ko: "유형진", en: "Dr. Yoo Hyeong-jin", ru: "Д-р Ю Хён-джин", kz: "Д-р Ю Хён-джин", zh: "유형진", ja: "ユ・ヒョンジン" },
        title: { ko: "신촌점 대표원장", en: "Sinchon Director", ru: "Синчон Главный врач", kz: "Синчон Бас дәрігер", zh: "新村院区 代表院长", ja: "新村院 代表院長" },
        photo: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png",
      },
      {
        name: { ko: "조수호", en: "Dr. Cho Su-ho", ru: "Д-р Чо Су-хо", kz: "Д-р Чо Су-хо", zh: "조수호", ja: "チョ・スホ" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "한방내과 전문의", en: "Korean Internal Medicine · Board-certified", ru: "Корейская терапия · Специалист", kz: "Корей терапиясы · Маман", zh: "韩方内科 · 专科医师", ja: "韓方内科 · 専門医" },
        photo: "/immune/doctor/sinchon-dr-jo-suho.jpg",
      },
      {
        name: { ko: "조현실", en: "Dr. Cho Hyeon-sil", ru: "Д-р Чо Хён-силь", kz: "Д-р Чо Хён-силь", zh: "조현실", ja: "チョ・ヒョンシル" },
        title: { ko: "양방 대표원장", en: "Medical Director", ru: "Главврач (западная медицина)", kz: "Бас дәрігер (батыс медицинасы)", zh: "西医代表院长", ja: "西洋医代表院長" },
        credentials: { ko: "통합면역 부인과", en: "Integrative Immunity · Obstetrics & Gynecology", ru: "Интегративная иммунология · Гинекология", kz: "Интегративті иммунология · Гинекология", zh: "整合免疫 · 妇科", ja: "統合免疫 · 婦人科" },
        photo: "",  // 병원 사이트에도 사진 없음(로고 자리표시) — 남의 얼굴을 붙이지 않는다
      },
      {
        name: { ko: "김서진", en: "Dr. Kim Seo-jin", ru: "Д-р Ким Со-джин", kz: "Д-р Ким Со-джин", zh: "김서진", ja: "キム・ソジン" },
        title: { ko: "한방 원장", en: "Korean Medicine Doctor", ru: "Врач корейской медицины", kz: "Корей медицинасының дәрігері", zh: "韩方院长", ja: "韓方院長" },
        credentials: { ko: "진료부", en: "Clinical Department", ru: "Клиническое отделение", kz: "Клиникалық бөлім", zh: "诊疗部", ja: "診療部" },
        photo: "/immune/doctor/sinchon-dr-kim-seojin.jpg",
      },
      {
        name: { ko: "진수현", en: "Dr. Jin Su-hyeon", ru: "Д-р Чин Су-хён", kz: "Д-р Чин Су-хён", zh: "진수현", ja: "チン・スヒョン" },
        title: { ko: "한방 원장", en: "Korean Medicine Doctor", ru: "Врач корейской медицины", kz: "Корей медицинасының дәрігері", zh: "韩方院长", ja: "韓方院長" },
        credentials: { ko: "진료부", en: "Clinical Department", ru: "Клиническое отделение", kz: "Клиникалық бөлім", zh: "诊疗部", ja: "診療部" },
        photo: "/immune/doctor/sinchon-dr-jin-suhyeon.jpg",
      },
      {
        name: { ko: "홍정화", en: "Dr. Hong Jeong-hwa", ru: "Д-р Хон Чон-хва", kz: "Д-р Хон Чон-хва", zh: "홍정화", ja: "ホン・ジョンファ" },
        title: { ko: "한방 원장", en: "Korean Medicine Doctor", ru: "Врач корейской медицины", kz: "Корей медицинасының дәрігері", zh: "韩方院长", ja: "韓方院長" },
        credentials: { ko: "진료부", en: "Clinical Department", ru: "Клиническое отделение", kz: "Клиникалық бөлім", zh: "诊疗部", ja: "診療部" },
        photo: "/immune/doctor/sinchon-dr-hong-jeonghwa.jpg",
      },

      /* ── 성동점 9명 ── */
      {
        name: { ko: "강주안", en: "Dr. Kang Ju-an", ru: "Д-р Кан Чжу-ан", kz: "Д-р Кан Чжу-ан", zh: "강주안", ja: "カン・ジュアン" },
        title: { ko: "성동점 대표원장", en: "Seongdong Director", ru: "Сондон Главный врач", kz: "Сондон Бас дәрігер", zh: "城东院区 代表院长", ja: "城東院 代表院長" },
        photo: "/immune/doctor/seongdong-dr-kang-juan.png",
      },
      {
        name: { ko: "승현석", en: "Dr. Seung Hyeon-seok", ru: "Д-р Сын Хён-сок", kz: "Д-р Сын Хён-сок", zh: "승현석", ja: "スン・ヒョンソク" },
        title: { ko: "의무원장", en: "Chief Medical Officer", ru: "Медицинский директор", kz: "Медициналық директор", zh: "医务院长", ja: "医務院長" },
        credentials: { ko: "통합면역센터 한방내과", en: "Integrative Immunity Center · Korean Internal Medicine", ru: "Интегративная иммунология Центр · Корейская терапия", kz: "Интегративті иммунология Орталық · Корей терапиясы", zh: "整合免疫 中心 · 韩方内科", ja: "統合免疫 センター · 韓方内科" },
        photo: "/immune/doctor/seongdong-dr-seung-hyeonsuk.jpg",
      },
      {
        name: { ko: "임경수", en: "Dr. Im Gyeong-su", ru: "Д-р Им Гён-су", kz: "Д-р Им Гён-су", zh: "임경수", ja: "イム・ギョンス" },
        title: { ko: "양방 대표원장", en: "Medical Director", ru: "Главврач (западная медицина)", kz: "Бас дәрігер (батыс медицинасы)", zh: "西医代表院长", ja: "西洋医代表院長" },
        credentials: { ko: "통합면역센터 정형외과", en: "Integrative Immunity Center · Orthopedics", ru: "Интегративная иммунология Центр · Ортопедия", kz: "Интегративті иммунология Орталық · Ортопедия", zh: "整合免疫 中心 · 骨科", ja: "統合免疫 センター · 整形外科" },
        photo: "/immune/doctor/seongdong-dr-im-gyeongsu.jpg",
      },
      {
        name: { ko: "고은상", en: "Dr. Ko Eun-sang", ru: "Д-р Ко Ын-сан", kz: "Д-р Ко Ын-сан", zh: "고은상", ja: "コ・ウンサン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통증재활센터 한방내과", en: "Pain & Rehabilitation Center · Korean Internal Medicine", ru: "Боль и реабилитация Центр · Корейская терапия", kz: "Ауырсыну және оңалту Орталық · Корей терапиясы", zh: "疼痛康复 中心 · 韩方内科", ja: "疼痛リハビリ センター · 韓方内科" },
        photo: "/immune/doctor/seongdong-dr-go-eunsang.jpg",
      },
      {
        name: { ko: "이문성", en: "Dr. Lee Mun-seong", ru: "Д-р Ли Мун-сон", kz: "Д-р Ли Мун-сон", zh: "이문성", ja: "イ・ムンソン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통증재활센터", en: "Pain & Rehabilitation Center", ru: "Боль и реабилитация Центр", kz: "Ауырсыну және оңалту Орталық", zh: "疼痛康复 中心", ja: "疼痛リハビリ センター" },
        photo: "/immune/doctor/seongdong-dr-lee-munseong.jpg",
      },
      {
        name: { ko: "박정향", en: "Dr. Park Jeong-hyang", ru: "Д-р Пак Чон-хян", kz: "Д-р Пак Чон-хян", zh: "박정향", ja: "パク・ジョンヒャン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "통합면역센터 한방내과", en: "Integrative Immunity Center · Korean Internal Medicine", ru: "Интегративная иммунология Центр · Корейская терапия", kz: "Интегративті иммунология Орталық · Корей терапиясы", zh: "整合免疫 中心 · 韩方内科", ja: "統合免疫 センター · 韓方内科" },
        photo: "/immune/doctor/seongdong-dr-park-jeonghyang.jpg",
      },
      {
        name: { ko: "노현민", en: "Dr. Noh Hyeon-min", ru: "Д-р Но Хён-мин", kz: "Д-р Но Хён-мин", zh: "노현민", ja: "ノ・ヒョンミン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "항노화센터 한방피부과", en: "Anti-aging Center · Korean Dermatology", ru: "Антивозрастная медицина Центр · Корейская дерматология", kz: "Қартаюға қарсы Орталық · Корей дерматологиясы", zh: "抗衰老 中心 · 韩方皮肤科", ja: "抗加齢 センター · 韓方皮膚科" },
        photo: "/immune/doctor/seongdong-dr-noh-hyeonmin.jpg",
      },
      {
        name: { ko: "이진영", en: "Dr. Lee Jin-young", ru: "Д-р Ли Джин-ён", kz: "Д-р Ли Джин-ён", zh: "이진영", ja: "イ・ジニョン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "항노화센터", en: "Anti-aging Center", ru: "Антивозрастная медицина Центр", kz: "Қартаюға қарсы Орталық", zh: "抗衰老 中心", ja: "抗加齢 センター" },
        photo: "/immune/doctor/seongdong-dr-lee-jinyeong.jpg",
      },
      {
        name: { ko: "송시은", en: "Dr. Song Si-eun", ru: "Д-р Сон Си-ын", kz: "Д-р Сон Си-ын", zh: "송시은", ja: "ソン・シウン" },
        title: { ko: "진료원장", en: "Attending Physician", ru: "Лечащий врач", kz: "Емдеуші дәрігер", zh: "诊疗院长", ja: "診療院長" },
        credentials: { ko: "항노화센터", en: "Anti-aging Center", ru: "Антивозрастная медицина Центр", kz: "Қартаюға қарсы Орталық", zh: "抗衰老 中心", ja: "抗加齢 センター" },
        photo: "/immune/doctor/seongdong-dr-song-sieun.jpg",
      },
              ],
      },
      ],
  },

  /* ─────────────── 해외 환자 안내 (판의 핵심 탭) ─────────────── */
  international: {
    title: D("해외 환자 안내", "For International Patients", "Иностранным пациентам", "Шетелдік науқастарға", "海外患者指南", "海外の患者さまへ"),
    subtitle: D(
      "비자·통역·체류·결제까지, 오시기 전에 정리해 드립니다.",
      "Visa, interpretation, stay and payment — sorted out before you travel.",
      "Виза, перевод, проживание и оплата — всё решаем до вашего приезда.",
      "Виза, аударма, тұру және төлем — келуіңізден бұрын шешіледі.",
      "签证、翻译、住宿与支付——在您启程前先安排妥当。",
      "ビザ・通訳・滞在・支払いまで、渡航前に整えます。",
    ),
    blocks: [
      {
        type: "steps",
        eyebrow: "Before You Come",
        title: D("오시기 전에", "Before You Travel", "Перед поездкой", "Келер алдында", "启程之前", "ご来韓の前に"),
        items: [
          {
            title: D("자료를 보내주세요", "Send your records", "Пришлите документы", "Құжаттарыңызды жіберіңіз", "请发送资料", "資料をお送りください"),
            desc: D("진단서, 최근 검사 결과, 현재 복용 중인 약. 번역은 저희가 맡습니다.", "Diagnosis, recent test results and current medications. We handle the translation.", "Заключение, свежие результаты обследования и текущие препараты. Перевод — на нас.", "Диагноз, соңғы тексеру нәтижелері және қабылдап жүрген дәрілер. Аударманы біз жасаймыз.", "诊断书、近期检查结果、正在服用的药物。翻译由我们负责。", "診断書・直近の検査結果・服用中の薬。翻訳は当院が担当します。"),
          },
          {
            title: D("상담 일정을 잡습니다", "We schedule a consultation", "Назначаем консультацию", "Кеңес кестесін жасаймыз", "安排咨询时间", "相談の日程を決めます"),
            desc: D("자료 검토 후 치료 가능 여부와 예상 일정을 안내드립니다.", "After reviewing your records we advise whether treatment is possible and the likely schedule.", "После изучения документов сообщим, возможно ли лечение, и ориентировочный график.", "Құжаттарды қарағаннан кейін ем мүмкіндігі мен болжамды кестені хабарлаймыз.", "审阅资料后，告知是否可以治疗及预计日程。", "資料確認の後、治療の可否と想定日程をご案内します。"),
          },
          {
            title: D("비자 서류를 준비합니다", "We prepare visa documents", "Готовим документы для визы", "Виза құжаттарын дайындаймыз", "准备签证材料", "ビザ書類を準備します"),
            desc: D("치료 계획서 등 비자 신청에 필요한 서류를 발급해 드립니다.", "We issue the treatment plan and other documents your visa application needs.", "Выдаём план лечения и другие документы, необходимые для визы.", "Виза үшін қажет ем жоспары мен басқа құжаттарды береміз.", "签发治疗计划书等签证申请所需材料。", "治療計画書など、ビザ申請に必要な書類を発行します。"),
          },
          {
            title: D("도착 후 일정", "After you arrive", "После прибытия", "Келгеннен кейін", "抵达之后", "到着後の流れ"),
            desc: D("첫 내원일에 검사와 협진 상담을 함께 진행합니다.", "On your first visit we run the tests and hold the joint consultation together.", "В первый визит проводим обследование и совместную консультацию.", "Алғашқы келуде тексеру мен бірлескен кеңесті қатар өткіземіз.", "首次到院当天同时进行检查与协诊咨询。", "初回来院日に検査と協診相談を併せて行います。"),
          },
        ],
      },
      {
        type: "table",
        eyebrow: "Visa",
        title: D("의료 비자", "Medical Visa", "Медицинская виза", "Медициналық виза", "医疗签证", "医療ビザ"),
        rows: [
          {
            label: D("단기 치료 (C-3-3)", "Short-term (C-3-3)", "Краткосрочная (C-3-3)", "Қысқа мерзімді (C-3-3)", "短期治疗 (C-3-3)", "短期治療 (C-3-3)"),
            value: D("90일 이내 체류. 통원 치료 중심의 일정에 적합합니다.", "Stay up to 90 days. Suits outpatient-centered schedules.", "Пребывание до 90 дней. Подходит для амбулаторного графика.", "90 күнге дейін болу. Амбулаториялық кестеге қолайлы.", "停留90天以内，适合以门诊为主的日程。", "90日以内の滞在。通院中心の日程に適します。"),
          },
          {
            label: D("장기 치료 (G-1-10)", "Long-term (G-1-10)", "Долгосрочная (G-1-10)", "Ұзақ мерзімді (G-1-10)", "长期治疗 (G-1-10)", "長期治療 (G-1-10)"),
            value: D("90일을 넘는 치료·요양이 필요할 때. 국내에서 연장 신청이 가능합니다.", "For treatment or recovery beyond 90 days; extensions can be applied for inside Korea.", "Если лечение или восстановление превышает 90 дней; продление оформляется в Корее.", "Ем немесе қалпына келу 90 күннен асса; ұзартуды Кореяда рәсімдеуге болады.", "治疗或疗养超过90天时，可在韩国境内申请延长。", "90日を超える治療・療養が必要な場合。韓国内で延長申請が可能です。"),
          },
          {
            label: D("동반 보호자", "Accompanying carer", "Сопровождающий", "Ілесіп жүруші", "陪同人员", "同伴の保護者"),
            value: D("배우자·직계가족 1인이 함께 신청할 수 있습니다.", "One spouse or immediate family member can apply alongside you.", "Вместе с вами может подать заявление супруг(а) или ближайший родственник.", "Сізбен бірге жұбайыңыз немесе жақын туысыңыз өтініш бере алады.", "配偶或直系亲属1人可一同申请。", "配偶者・直系家族1名が一緒に申請できます。"),
          },
          {
            label: D("우리가 발급하는 것", "What we issue", "Что выдаём мы", "Біз беретін құжаттар", "我们签发的材料", "当院が発行するもの"),
            value: D("치료 계획서 · 예약 확인서 · 진료비 예상 안내.", "Treatment plan · appointment confirmation · estimated cost letter.", "План лечения · подтверждение записи · ориентировочная смета.", "Ем жоспары · жазылу растамасы · болжамды құн туралы хат.", "治疗计划书 · 预约确认书 · 费用预估说明。", "治療計画書・予約確認書・診療費の目安。"),
          },
        ],
        note: D(
          "※ 비자 발급 여부와 요건은 각국 대사관·영사관의 심사에 따릅니다. 최신 요건은 상담 시 확인해 드립니다.",
          "※ Visa issuance and requirements are decided by the embassy or consulate in your country. We confirm the current requirements during consultation.",
          "※ Выдача визы и требования определяются посольством или консульством в вашей стране. Актуальные требования уточняем на консультации.",
          "※ Виза беру және талаптар еліңіздегі елшілік немесе консулдықтың шешімімен анықталады. Ағымдағы талаптарды кеңес кезінде нақтылаймыз.",
          "※ 签证的签发与要求由所在国使领馆审核决定。最新要求将在咨询时确认。",
          "※ ビザの発給可否と要件は各国の大使館・領事館の審査によります。最新の要件は相談時にご案内します。",
        ),
      },
      {
        type: "cards",
        columns: 2,
        eyebrow: "Support",
        title: D("체류 중 지원", "Support During Your Stay", "Поддержка во время пребывания", "Болу кезіндегі қолдау", "停留期间的支持", "滞在中のサポート"),
        items: [
          {
            title: D("통역", "Interpretation", "Перевод", "Аударма", "翻译", "通訳"),
            desc: D("진료 전 상담은 러시아어·영어를 포함해 6개 언어로 가능합니다. 내원 시 통역 지원 범위는 예약할 때 안내드립니다.", "Pre-visit consultation is available in six languages including Russian and English. On-site interpretation arrangements are confirmed when you book.", "Консультация до визита доступна на шести языках, включая русский и английский. Условия перевода на приёме уточняем при записи.", "Келу алдындағы кеңес алты тілде қолжетімді. Қабылдаудағы аударма шарттары жазылу кезінде нақтыланады.", "就诊前咨询提供六种语言。到院时的翻译安排在预约时告知。", "受診前の相談は6言語で可能です。来院時の通訳対応は予約時にご案内します。"),
          },
          {
            title: D("숙소", "Accommodation", "Проживание", "Тұрғын үй", "住宿", "宿泊"),
            desc: D("병원 인근 숙소를 안내해 드립니다. 장기 치료는 주 단위 숙소가 더 경제적입니다.", "We can point you to accommodation near the hospital. For longer treatment, weekly stays are usually more economical.", "Подскажем жильё рядом с клиникой. При длительном лечении понедельная аренда обычно выгоднее.", "Клиника маңындағы тұрғын үйді ұсынамыз. Ұзақ емде апталық жалдау тиімдірек.", "为您介绍医院附近的住宿。长期治疗时按周租住通常更经济。", "病院近くの宿泊先をご案内します。長期治療では週単位の滞在が経済的です。"),
          },
          {
            title: D("진료비", "Costs", "Стоимость", "Құны", "费用", "診療費"),
            desc: D("치료 내용과 기간에 따라 달라 상담 후 개별 견적을 드립니다. 외국인 진료는 비급여 기준이라 국내 건강보험 가격과 다릅니다.", "Costs depend on the treatment and its length, so we issue an individual estimate after consultation. Care for international patients is non-covered, so prices differ from Korean national insurance rates.", "Стоимость зависит от лечения и его длительности — смету составляем после консультации. Лечение иностранных пациентов не покрывается корейской страховкой, поэтому цены отличаются.", "Құны ем мен оның ұзақтығына байланысты — сметаны кеңестен кейін береміз. Шетелдік науқастардың емі сақтандырумен өтелмейді, сондықтан баға өзгеше.", "费用视治疗内容与疗程而定，咨询后提供个别报价。外国患者诊疗属自费，与韩国医保价格不同。", "治療内容と期間により異なるため、相談後に個別のお見積りをお出しします。外国人診療は自費のため、韓国の健康保険価格とは異なります。"),
          },
          {
            title: D("결제", "Payment", "Оплата", "Төлем", "支付", "お支払い"),
            desc: D("현지 통화 송금·해외 카드 결제가 가능합니다. 방법과 시점은 예약 확정 시 안내드립니다.", "International transfer and overseas cards are accepted. We explain the method and timing when your booking is confirmed.", "Принимаем международные переводы и зарубежные карты. Способ и сроки сообщаем при подтверждении записи.", "Халықаралық аударым және шетелдік карталар қабылданады. Тәсілі мен мерзімін жазылу расталғанда хабарлаймыз.", "可使用国际汇款与境外银行卡。具体方式与时间在预约确认时告知。", "海外送金・海外カードでのお支払いが可能です。方法と時期は予約確定時にご案内します。"),
          },
        ],
      },
    ],
  },

  /* ─────────────── 오시는 길 ─────────────── */
  contact: {
    title: D("오시는 길", "Visit Us", "Как добраться", "Мекенжай", "交通指南", "アクセス"),
    subtitle: D(
      "서울·수도권 4개 지점. 평일 야간 20시까지 진료합니다.",
      "Four branches in the Seoul area. Evening clinic until 8 PM on weekdays.",
      "Четыре филиала в Сеуле и пригороде. По будням приём до 20:00.",
      "Сеул мен маңында төрт филиал. Жұмыс күндері 20:00-ге дейін қабылдау.",
      "首尔及首都圈4家分院，工作日夜诊至20时。",
      "ソウル圏に4拠点。平日は20時まで夜間診療。",
    ),
    blocks: [
      {
        type: "branches",
        eyebrow: "Branches",
        title: D("지점 안내", "Our Branches", "Наши филиалы", "Біздің филиалдар", "分院一览", "拠点一覧"),
        items: [
          {
            image: "/images/hospitals/immunehospital-magok/3.jpg",
            name: D("강서점 (본원)", "Gangseo (Main)", "Кансо (главный)", "Кансо (бас)", "江西院区（本院）", "江西院（本院）"),
            address: D("서울특별시 강서구 마곡중앙6로 93, 열린프라자 6·7·10층", "6F·7F·10F, 93 Magokjungang 6-ro, Gangseo-gu, Seoul", "6, 7, 10 этаж, 93 Магокчунан 6-ро, Кансо-гу, Сеул", "6, 7, 10 қабат, 93 Магокчунан 6-ро, Кансо-гу, Сеул", "首尔特别市江西区麻谷中央6路93号 6·7·10层", "ソウル特別市江西区麻谷中央6路93 6・7・10階"),
            phone: "1588-2915",
            note: D("암면역 · 신경면역 · 재활 전 센터 운영", "All three centers operate here", "Работают все три центра", "Үш орталық та осында жұмыс істейді", "三大中心均在此运营", "3センターすべてを運営"),
          },
          {
            image: "/images/hospitals/immunehospital-sinchon/2.jpg",
            name: D("신촌점", "Sinchon", "Синчон", "Синчон", "新村院区", "新村院"),
            address: D("서울특별시 서대문구 연세로 12, 8~14층", "8F–14F, 12 Yonsei-ro, Seodaemun-gu, Seoul", "8–14 этаж, 12 Ёнсе-ро, Содэмун-гу, Сеул", "8–14 қабат, 12 Ёнсе-ро, Содэмун-гу, Сеул", "首尔特别市西大门区延世路12号 8~14层", "ソウル特別市西大門区延世路12 8〜14階"),
            phone: "1588-2915",
          },
          {
            image: "/images/hospitals/immunehospital-gwangmyeong/2.jpg",
            name: D("광명점", "Gwangmyeong", "Кванмён", "Кванмён", "光明院区", "光明院"),
            address: D("경기도 광명시 철산로 16, 트라이앵글빌딩 6층·8~11층", "6F, 8F–11F, Triangle Bldg, 16 Cheolsan-ro, Gwangmyeong-si, Gyeonggi", "6, 8–11 этаж, зд. Триангл, 16 Чольсан-ро, Кванмён, Кёнгидо", "6, 8–11 қабат, Триангл ғимараты, 16 Чольсан-ро, Кванмён, Кёнгидо", "京畿道光明市铁山路16号 三角大厦 6层·8~11层", "京畿道光明市鉄山路16 トライアングルビル 6階・8〜11階"),
          },
          {
            image: "/images/hospitals/immunehospital-seongdong/3.jpg",
            name: D("성동점", "Seongdong", "Сондон", "Сондон", "城东院区", "城東院"),
            address: D("서울특별시 성동구 천호대로 320 (용답동, 장안빌딩) 2~7층", "2F–7F, 320 Cheonho-daero, Seongdong-gu, Seoul", "2–7 этаж, 320 Чхонхо-даэро, Сондон-гу, Сеул", "2–7 қабат, 320 Чхонхо-даэро, Сондон-гу, Сеул", "首尔特别市城东区千户大路320号 2~7层", "ソウル特別市城東区千戸大路320 2〜7階"),
            phone: "02-2295-8510",
          },
        ],
      },
      {
        type: "table",
        eyebrow: "Hours",
        title: D("진료 시간", "Opening Hours", "Часы приёма", "Қабылдау уақыты", "诊疗时间", "診療時間"),
        rows: [
          {
            label: D("평일", "Weekdays", "Будни", "Жұмыс күндері", "工作日", "平日"),
            value: D("09:00 – 20:00 (야간진료)", "09:00 – 20:00 (evening clinic)", "09:00 – 20:00 (вечерний приём)", "09:00 – 20:00 (кешкі қабылдау)", "09:00 – 20:00（夜诊）", "09:00 – 20:00（夜間診療）"),
          },
          {
            label: D("토·일·공휴일", "Weekends & holidays", "Выходные и праздники", "Демалыс және мереке", "周末及节假日", "土日祝"),
            value: D("09:00 – 15:00", "09:00 – 15:00", "09:00 – 15:00", "09:00 – 15:00", "09:00 – 15:00", "09:00 – 15:00"),
          },
          {
            label: D("해외 문의", "International enquiries", "Запросы из-за рубежа", "Шетелден сұраныстар", "海外咨询", "海外からのお問い合わせ"),
            value: D("WhatsApp · 웹 상담으로 24시간 접수, 진료시간에 순차 답변.", "Received 24/7 via WhatsApp and web enquiry; answered during clinic hours.", "Принимаем круглосуточно через WhatsApp и веб-форму; отвечаем в часы приёма.", "WhatsApp және веб-форма арқылы тәулік бойы қабылданады; қабылдау сағатында жауап береміз.", "通过WhatsApp与网页咨询24小时受理，于诊疗时间内依序回复。", "WhatsApp・ウェブ相談で24時間受付、診療時間内に順次回答します。"),
          },
        ],
      },
    ],
  },
};
