/**
 * HEALO FAQ — 외국인 암환자가 가장 자주 묻는 Q&A
 * 카테고리: 서비스·상담·치료·비자·체류·결제·응급
 */

export const FAQ_CATEGORIES = [
  { id: "service", labels: { en: "About HEALO", ko: "HEALO 소개", ru: "О HEALO", kz: "HEALO туралы", zh: "关于 HEALO", ja: "HEALO について" } },
  { id: "consultation", labels: { en: "Consultation", ko: "상담", ru: "Консультация", kz: "Кеңес", zh: "咨询", ja: "相談" } },
  { id: "treatment", labels: { en: "Treatment", ko: "치료", ru: "Лечение", kz: "Емдеу", zh: "治疗", ja: "治療" } },
  { id: "visa", labels: { en: "Visa & stay", ko: "비자·체류", ru: "Виза и проживание", kz: "Виза және тұру", zh: "签证住宿", ja: "ビザと滞在" } },
  { id: "payment", labels: { en: "Payment", ko: "결제", ru: "Оплата", kz: "Төлем", zh: "付款", ja: "支払い" } },
  { id: "privacy", labels: { en: "Privacy & data", ko: "개인정보", ru: "Конфиденциальность", kz: "Құпиялылық", zh: "隐私数据", ja: "プライバシー" } },
];

export const FAQS = [
  // === About HEALO ===
  {
    category: "service",
    q: {
      en: "What exactly is HEALO?",
      ko: "HEALO는 어떤 서비스인가요?",
      ru: "Что такое HEALO?",
      kz: "HEALO дегеніміз не?",
      zh: "HEALO 是什么？",
      ja: "HEALOとは何ですか？",
    },
    a: {
      en: "HEALO is a medical concierge platform that helps international cancer patients access care at Korea's top oncology hospitals. We handle hospital matching, visa support, translation, and end-to-end coordination — so you focus on recovery.",
      ko: "HEALO는 외국인 암환자가 한국 최상위 종양학 병원의 진료를 받을 수 있도록 돕는 메디컬 컨시어지 플랫폼입니다. 병원 매칭, 비자 지원, 통역, 전 과정 코디네이션을 담당해 환자는 회복에만 집중할 수 있습니다.",
      ru: "HEALO — платформа медицинского консьержа, которая помогает международным онкологическим пациентам получать помощь в ведущих корейских клиниках. Мы подбираем больницу, помогаем с визой, переводом и координируем весь процесс.",
      kz: "HEALO — халықаралық онкологиялық науқастарға Кореяның жетекші клиникаларында емделуге көмектесетін медициналық консьерж платформасы. Біз клиника таңдау, виза, аударма және толық үйлестіруді қамтамасыз етеміз.",
      zh: "HEALO 是一家医疗协调平台，帮助国际癌症患者在韩国顶级肿瘤医院就诊。我们负责医院匹配、签证支持、翻译和全程协调。",
      ja: "HEALOは、外国人がん患者が韓国のトップがん専門病院で治療を受けられるよう支援するメディカルコンシェルジュプラットフォームです。病院の選定、ビザ支援、通訳、全工程のコーディネートを行います。",
    },
  },
  {
    category: "service",
    q: {
      en: "Is HEALO a hospital?",
      ko: "HEALO가 병원인가요?",
      ru: "HEALO — это больница?",
      kz: "HEALO аурухана ма?",
      zh: "HEALO 是医院吗？",
      ja: "HEALOは病院ですか？",
    },
    a: {
      en: "No. HEALO is a registered international patient facilitator (Reg. A-2026-01-02-06761 by the Mayor of Seoul). We connect you with licensed Korean hospitals, but all diagnosis and treatment is performed by the hospital's medical team.",
      ko: "아닙니다. HEALO는 서울특별시장이 등록한 외국인환자 유치업자(등록번호 A-2026-01-02-06761)입니다. 한국의 면허 의료기관과 연결해드리며, 진단·치료는 해당 병원의 의료진이 수행합니다.",
      ru: "Нет. HEALO — зарегистрированный посредник по привлечению иностранных пациентов (Рег. A-2026-01-02-06761). Мы связываем вас с лицензированными корейскими клиниками, но диагностика и лечение проводятся врачами больницы.",
      kz: "Жоқ. HEALO — шетелдік науқастарды тарту бойынша тіркелген делдал. Біз сізді Кореяның лицензияланған клиникаларымен байланыстырамыз, ал диагностика мен емдеу клиника дәрігерлерімен жасалады.",
      zh: "不是。HEALO 是首尔市长注册的外国患者招揽服务商（注册号 A-2026-01-02-06761）。我们连接您和持牌韩国医院，但诊断和治疗由医院医疗团队执行。",
      ja: "いいえ。HEALOはソウル特別市長が登録した外国人患者誘致事業者（登録番号 A-2026-01-02-06761）です。韓国の認可医療機関とつなぎますが、診断・治療は病院の医療陣が行います。",
    },
  },
  {
    category: "service",
    q: {
      en: "How much does HEALO cost?",
      ko: "HEALO 이용료가 얼마인가요?",
      ru: "Сколько стоит HEALO?",
      kz: "HEALO қызметтерінің бағасы қандай?",
      zh: "HEALO 费用多少？",
      ja: "HEALOの費用は？",
    },
    a: {
      en: "Initial inquiry and consultation guidance are free. Our concierge fee is disclosed in the quotation before you commit — typically 5–10% of the total treatment cost, depending on complexity. Hospital fees are paid directly to the hospital.",
      ko: "최초 문의와 상담 안내는 무료입니다. 컨시어지 수수료는 치료 계약 전 견적서에 명시되며, 보통 전체 치료비의 5-10% 수준입니다. 병원 진료비는 병원에 직접 납부하십니다.",
      ru: "Первичная заявка и консультация бесплатны. Наша комиссия указывается в смете до заключения договора — обычно 5–10% от общей стоимости лечения. Расходы на лечение оплачиваются напрямую больнице.",
      kz: "Алғашқы өтінім мен кеңес тегін. Біздің комиссия келісімге дейін сметада көрсетіледі — әдетте емдеудің жалпы құнының 5–10%. Емдеу төлемі тікелей клиникаға төленеді.",
      zh: "初次咨询免费。我们的协调费会在合同签订前的报价单中明示，通常为总治疗费的5-10%。医院费用直接支付给医院。",
      ja: "初回問い合わせと相談は無料です。当社のコーディネーション料は契約前に見積書で開示され、通常は総治療費の5～10%です。病院費用は病院に直接お支払いいただきます。",
    },
  },

  // === Consultation ===
  {
    category: "consultation",
    q: {
      en: "How fast do you respond to inquiries?",
      ko: "문의 답변은 얼마나 빠른가요?",
      ru: "Как быстро вы отвечаете?",
      kz: "Сұраныстарға қаншалықты тез жауап бересіздер?",
      zh: "回复有多快？",
      ja: "問い合わせへの返信はどれくらい早いですか？",
    },
    a: {
      en: "Within one business day, in your preferred language. For urgent cases (e.g. time-sensitive diagnosis), we expedite to a few hours.",
      ko: "영업일 기준 하루 안에 선호 언어로 회신드립니다. 시급한 경우(시간 민감한 진단 등)는 몇 시간 내 대응합니다.",
      ru: "В течение одного рабочего дня, на вашем языке. В срочных случаях — в течение нескольких часов.",
      kz: "Бір жұмыс күні ішінде, таңдаған тіліңізде. Шұғыл жағдайларда — бірнеше сағат ішінде.",
      zh: "一个工作日内，以您偏好的语言回复。紧急情况几小时内响应。",
      ja: "営業日基準で1日以内、希望言語で返信します。緊急の場合は数時間以内に対応します。",
    },
  },
  {
    category: "consultation",
    q: {
      en: "Can I speak to a doctor before traveling?",
      ko: "방한 전에 의사와 직접 상담할 수 있나요?",
      ru: "Можно ли поговорить с врачом до приезда?",
      kz: "Келмес бұрын дәрігермен сөйлесуге бола ма?",
      zh: "可以在来韩前与医生通话吗？",
      ja: "渡航前に医師と話せますか？",
    },
    a: {
      en: "Yes. After intake, we arrange a pre-consultation video call with the matched specialist — with simultaneous medical interpretation in your language (Korean-Russian, Korean-English, etc.).",
      ko: "네. 인테이크 후 매칭된 전문의와 사전 상담 화상 통화를 주선합니다. 실시간 의료 통역(한-러, 한-영 등)이 제공됩니다.",
      ru: "Да. После заявки организуем видеоконсультацию с подобранным специалистом, с синхронным медицинским переводом.",
      kz: "Иә. Өтінімнен кейін таңдалған маманмен бейнекеңес ұйымдастырамыз, нақты уақыттағы медициналық аудармамен.",
      zh: "可以。申请后我们会安排与配对专科医生的预诊视频，并提供实时医疗翻译。",
      ja: "はい。問診後、マッチした専門医との事前ビデオ相談を手配します。リアルタイム医療通訳付きです。",
    },
  },

  // === Treatment ===
  {
    category: "treatment",
    q: {
      en: "What cancer types does HEALO specialize in?",
      ko: "HEALO가 지원하는 암종은?",
      ru: "Какие виды рака?",
      kz: "Қандай қатерлі ісік түрлерімен жұмыс жасайсыздар?",
      zh: "HEALO 擅长哪些癌症？",
      ja: "HEALOが対応するがんの種類は？",
    },
    a: {
      en: "Primary focus on stomach, breast, liver, lung, thyroid, and colorectal cancer — where Korea has world-leading survival rates. We also coordinate for other oncology cases through our partner hospital network.",
      ko: "위암, 유방암, 간암, 폐암, 갑상선암, 대장암이 주력이며, 한국이 세계 최고 수준의 생존율을 보이는 암종들입니다. 다른 암종도 제휴 병원 네트워크를 통해 코디네이션합니다.",
      ru: "Основные направления: рак желудка, молочной железы, печени, лёгких, щитовидной железы и колоректальный — Корея является мировым лидером по выживаемости. Другие случаи также координируем через партнёрскую сеть.",
      kz: "Негізгі бағыттар: асқазан, сүт безі, бауыр, өкпе, қалқанша без және ішек обыры. Басқа түрлерді де серіктес желі арқылы үйлестіреміз.",
      zh: "主要专长：胃癌、乳腺癌、肝癌、肺癌、甲状腺癌、大肠癌——韩国在这些领域的生存率世界领先。其他癌症也通过合作医院网络协调。",
      ja: "主な対応：胃がん、乳がん、肝がん、肺がん、甲状腺がん、大腸がん——韓国は世界トップクラスの生存率を誇ります。他の症例もパートナー病院ネットワークで対応可能です。",
    },
  },
  {
    category: "treatment",
    q: {
      en: "How do I know which hospital is right for me?",
      ko: "제게 맞는 병원은 어떻게 정하나요?",
      ru: "Как выбрать подходящую больницу?",
      kz: "Маған қандай клиника лайық?",
      zh: "如何选择适合我的医院？",
      ja: "自分に合った病院はどう選ぶ？",
    },
    a: {
      en: "Based on your diagnosis, stage, language needs, budget, and timeline, our matching algorithm suggests 2–3 suitable hospitals. A coordinator reviews the match and you make the final choice.",
      ko: "진단, 병기, 언어 필요사항, 예산, 일정을 바탕으로 매칭 알고리즘이 2-3곳을 제안합니다. 코디네이터가 검토하고, 최종 선택은 환자 본인의 몫입니다.",
      ru: "На основе диагноза, стадии, языка, бюджета и сроков наш алгоритм подбирает 2–3 подходящие клиники. Координатор проверяет, окончательный выбор за вами.",
      kz: "Диагноз, саты, тіл, бюджет пен уақытқа қарап алгоритм 2–3 клиниканы ұсынады. Үйлестіруші тексереді, соңғы шешім сіздікі.",
      zh: "根据您的诊断、分期、语言、预算和时间，算法推荐2-3家医院。协调员审核，最终由您决定。",
      ja: "診断・ステージ・言語・予算・日程に基づき、マッチングが2–3の病院を提案。コーディネーターが確認し、最終決定はあなたが行います。",
    },
  },

  // === Visa ===
  {
    category: "visa",
    q: {
      en: "Do I need a visa to receive treatment in Korea?",
      ko: "한국 진료에 비자가 필요한가요?",
      ru: "Нужна ли виза для лечения в Корее?",
      kz: "Кореяда емделу үшін виза керек пе?",
      zh: "在韩国治疗需要签证吗？",
      ja: "韓国での治療にビザは必要ですか？",
    },
    a: {
      en: "It depends on nationality. Most patients need a medical visa (C-3-3 for short-term under 90 days, G-1 for longer treatment). HEALO prepares the invitation letter and supports the entire application.",
      ko: "국적에 따라 다릅니다. 대부분 의료 비자(C-3-3 90일 이내 단기, G-1 장기)가 필요합니다. HEALO가 초청장을 발급하고 신청 전 과정을 지원합니다.",
      ru: "Зависит от гражданства. Большинству пациентов нужна медицинская виза (C-3-3 до 90 дней, G-1 для длительного лечения). HEALO готовит приглашение и сопровождает подачу.",
      kz: "Азаматтыққа байланысты. Көпшілігіне медициналық виза керек (C-3-3 қысқа мерзім, G-1 ұзақ мерзім). HEALO шақыру хатын дайындап, толық үдеріске қолдау көрсетеді.",
      zh: "取决于国籍。大多数患者需要医疗签证（C-3-3 短期、G-1 长期）。HEALO 发放邀请函并协助全程申请。",
      ja: "国籍によります。多くの場合、医療ビザ（C-3-3短期、G-1長期）が必要です。HEALOが招聘状を発行し、申請全体をサポートします。",
    },
  },
  {
    category: "visa",
    q: {
      en: "Can I bring a caregiver or family member?",
      ko: "보호자나 가족을 동반할 수 있나요?",
      ru: "Можно ли взять с собой сопровождающего?",
      kz: "Өзіммен бірге серіктес әкелуге бола ма?",
      zh: "可以带陪护或家人吗？",
      ja: "介護者や家族を同伴できますか？",
    },
    a: {
      en: "Yes. We assist one or more accompanying family members with their visa application (usually C-3-3 or C-3-9) and coordinate accommodations for them during your treatment.",
      ko: "네. 동반 가족(보통 1-2명)의 비자 신청(C-3-3 또는 C-3-9)을 지원하고, 치료 기간 중 숙소도 함께 안내합니다.",
      ru: "Да. Помогаем одному или нескольким сопровождающим членам семьи с визой (обычно C-3-3 или C-3-9) и жильём.",
      kz: "Иә. Бір немесе одан көп серіктестің визасын (әдетте C-3-3 немесе C-3-9) және тұрғын үйін ұйымдастырамыз.",
      zh: "可以。我们协助一位或多位陪同家属申请签证（通常 C-3-3 或 C-3-9），并安排治疗期间的住宿。",
      ja: "はい。同伴家族のビザ申請（通常C-3-3またはC-3-9）と、治療期間中の宿泊手配も行います。",
    },
  },

  // === Payment ===
  {
    category: "payment",
    q: {
      en: "How does payment work?",
      ko: "결제는 어떻게 진행되나요?",
      ru: "Как проходит оплата?",
      kz: "Төлем қалай жүзеге асады?",
      zh: "如何付款？",
      ja: "支払いはどのように？",
    },
    a: {
      en: "Hospital treatment fees are paid directly to the hospital (in KRW, by credit card, cash, or wire). HEALO's concierge fee, if applicable, is invoiced separately by your coordinator. No payment is collected by HEALO before you commit to treatment.",
      ko: "병원 진료비는 병원에 직접 납부합니다(원화, 신용카드, 현금, 송금 중 선택). HEALO 컨시어지 수수료는 해당되는 경우 코디네이터가 별도로 청구합니다. 치료 확정 전에는 HEALO에 어떤 비용도 지불하지 않습니다.",
      ru: "Расходы на лечение оплачиваются больнице напрямую (в KRW — картой, наличными или переводом). Наша комиссия выставляется координатором отдельно. До подтверждения лечения HEALO не взимает плату.",
      kz: "Емдеу ақысы клиникаға тікелей төленеді (KRW — карта, қолма-қол немесе аударым). Біздің комиссия жеке есеп-шотпен беріледі. Емдеу расталғанға дейін төлем алмаймыз.",
      zh: "医院治疗费用直接支付给医院（韩币，信用卡/现金/汇款）。如需支付 HEALO 协调费，由协调员单独开具。确认治疗前 HEALO 不收取任何费用。",
      ja: "病院の治療費は病院に直接お支払いいただきます（韓国ウォン、クレジットカード・現金・送金）。HEALOのコーディネーション料は該当する場合のみコーディネーターが別途請求します。治療確定前の費用請求はありません。",
    },
  },
  {
    category: "payment",
    q: {
      en: "Will I get a written estimate before committing?",
      ko: "계약 전 견적서를 받을 수 있나요?",
      ru: "Получу ли я смету до заключения договора?",
      kz: "Келісімге дейін смета аламын ба?",
      zh: "签约前能拿到报价单吗？",
      ja: "契約前に見積書はもらえますか？",
    },
    a: {
      en: "Yes — by Korean Medical Tourism Act §15, we are legally required to provide a written quotation (in your language) before any treatment contract. It details treatment costs, facilitator fees, and refund policy.",
      ko: "네. 「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」 제15조에 따라, 진료계약 전 견적서(환자 모국어 또는 영어)를 반드시 서면으로 제공합니다. 진료비, 유치 수수료, 환불 정책이 명시됩니다.",
      ru: "Да — согласно §15 Закона Кореи о привлечении иностранных пациентов, мы обязаны предоставить письменную смету (на вашем языке) до заключения договора.",
      kz: "Иә — Корея Заңының §15-іне сәйкес, келісімге дейін жазбаша сметаны (сіздің тіліңізде) беруге міндеттіміз.",
      zh: "是。根据韩国《医疗观光法》§15，签订治疗合同前必须以您的语言提供书面报价单。包含治疗费、协调费和退款政策。",
      ja: "はい — 韓国「医療海外進出・外国人患者誘致法」§15により、治療契約前に書面の見積書（ご希望言語）を必ず提供します。",
    },
  },

  // === Privacy ===
  {
    category: "privacy",
    q: {
      en: "How do you protect my medical data?",
      ko: "제 의료 데이터는 어떻게 보호되나요?",
      ru: "Как защищаются мои медицинские данные?",
      kz: "Медициналық деректерім қалай қорғалады?",
      zh: "我的医疗数据如何保护？",
      ja: "医療データはどう保護されますか？",
    },
    a: {
      en: "End-to-end encrypted (TLS 1.3 in transit, AES-256 at rest). Compliant with Korean PIPA, Kazakhstan Law 94-V, and EU GDPR. Sensitive health data requires explicit separate consent, is shared only with hospitals you choose, and is deleted after service completion.",
      ko: "종단 간 암호화(전송 TLS 1.3, 저장 AES-256)되어 있습니다. 한국 PIPA, 카자흐스탄 94-V, EU GDPR을 준수합니다. 민감 건강정보는 별도 명시적 동의를 받고, 이용자가 선택한 병원에만 공유되며, 서비스 완료 후 삭제됩니다.",
      ru: "Сквозное шифрование (TLS 1.3 при передаче, AES-256 при хранении). Соответствие корейскому PIPA, казахскому 94-V и GDPR. Чувствительные медданные требуют отдельного явного согласия и передаются только выбранным вами клиникам.",
      kz: "Толық шифрлау (TLS 1.3, AES-256). PIPA, 94-V және GDPR-ге сәйкес. Құпия медициналық деректер бөлек нақты келісімді қажет етеді және тек сіз таңдаған клиникаларға беріледі.",
      zh: "端到端加密（传输 TLS 1.3，存储 AES-256）。符合韩国 PIPA、哈萨克斯坦 94-V 和 GDPR。敏感健康数据需单独明示同意，仅与您选择的医院共享，服务完成后删除。",
      ja: "エンドツーエンド暗号化（TLS 1.3、AES-256）。韓国PIPA、カザフスタン94-V、EU GDPRに準拠。機微な医療データは別途明示的同意を得て、選択した病院のみと共有し、サービス完了後は削除されます。",
    },
  },
  {
    category: "privacy",
    q: {
      en: "Can I delete my data later?",
      ko: "나중에 제 데이터를 삭제할 수 있나요?",
      ru: "Могу ли я удалить свои данные позже?",
      kz: "Кейін деректерімді жоя аламын ба?",
      zh: "以后能删除我的数据吗？",
      ja: "後でデータを削除できますか？",
    },
    a: {
      en: "Yes. You can request access, correction, or deletion of your personal data at any time by contacting our DPO (roiimmunelab@immunelab.co.kr). Medical records retained by hospitals are subject to their own legal retention periods (typically 10 years under Korean Medical Service Act §22).",
      ko: "네. 개인정보 열람·정정·삭제를 DPO(roiimmunelab@immunelab.co.kr)에게 언제든 요청할 수 있습니다. 병원이 보유한 진료기록은 해당 병원의 법적 보관 의무(의료법 §22에 따라 보통 10년)에 따릅니다.",
      ru: "Да. Вы можете запросить доступ, исправление или удаление в любое время у DPO (roiimmunelab@immunelab.co.kr). Медицинские записи больницы хранятся согласно их правовым срокам (обычно 10 лет).",
      kz: "Иә. Кез келген уақытта DPO-дан (roiimmunelab@immunelab.co.kr) сұрата аласыз. Клиникадағы медициналық жазбалар олардың заңды мерзімі бойынша сақталады (әдетте 10 жыл).",
      zh: "可以。您可随时向 DPO（roiimmunelab@immunelab.co.kr）申请查询、更正或删除。医院保存的医疗记录按其法定保存期（通常10年）处理。",
      ja: "はい。DPO（roiimmunelab@immunelab.co.kr）にいつでも閲覧・訂正・削除を請求できます。病院保有の診療記録は医療法§22により通常10年間保存されます。",
    },
  },
];
