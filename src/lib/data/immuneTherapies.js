/**
 * 면력한방병원 치료법 상세
 * 출처: https://immunehospital.com/pages/cancer/female-1.php 등 각 암종 페이지
 *       https://immunehospital.com/pages/hospital/nonpayment.php (비급여 가격 포함)
 * 수집일: 2026-04-21
 * 저작권: 면력한방병원 (자사 병원, 저작권 OK)
 *
 * 2026-09-05: name 에 kz·zh·ja 추가(ko·en·ru 는 그대로). 암종 페이지 5축 태그·JSON-LD(immuneCancerDetails.js)가 이 name 을
 *   «정본»으로 참조한다 — 같은 치료법을 두 파일에서 따로 번역하지 않는다(독립 리뷰 2026-09-05). ⚠️ kz·zh·ja 는 AI 번역, 코디 검수 전엔 「제안」.
 * 2026-09-05(2차): description 의 ru 10개·kz/zh/ja 19개와 evidence(3개 치료법) ru·kz·zh·ja 를 채웠다 — 암종 상세 카드가
 *   name·description·evidence 를 그리는데 이 칸들이 비어 영어로 조용히 폴백되고 있었다. scripts/check-cancer-i18n.mjs 가
 *   이제 이 세 칸의 6개 언어를 검사한다(천장 0). mechanism·indications 는 화면이 안 그려 비워 둔다. ⚠️ 역시 AI 번역 = 검수 전 「제안」.
 * 구조: ITCRN 5축 기준으로 정리
 *   I — Immunity (면역)
 *   T — Temperature (체온)
 *   C — Circulation (순환)
 *   R — Resistibility (저항성)
 *   N — Nutrition (영양)
 */

export const IMMUNE_THERAPIES = {
  // ────────────────── I: 면역 (Immunity) ──────────────────
  thymosin: {
    id: "thymosin",
    axis: "immunity",
    name: { ko: "싸이모신α1 요법", en: "Thymosin α1 Therapy", ru: "Терапия Тимозин-α1", kz: "Тимозин α1 терапиясы", zh: "胸腺肽α1疗法", ja: "サイモシンα1療法" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "흉선에서 생성되는 펩타이드 호르몬으로, T세포와 NK세포를 직접 활성화시켜 암세포를 공격합니다. 항암치료 후 저하된 면역 기능 회복에 핵심적 역할을 합니다.",
      en: "A peptide hormone produced by the thymus that directly activates T-cells and NK cells to attack cancer cells. Plays a key role in restoring immune function after chemotherapy.",
      ru: "Пептидный гормон тимуса, напрямую активирующий Т-клетки и НК-клетки. Ключевую роль играет в восстановлении иммунных функций после химиотерапии.",
      kz: "Тимус безінде түзілетін пептидті гормон; Т-жасушалары мен NK жасушаларын тікелей белсендіріп, қатерлі ісік жасушаларына шабуыл жасайды. Химиотерапиядан кейін төмендеген иммундық қызметті қалпына келтіруде негізгі рөл атқарады.",
      zh: "由胸腺分泌的肽类激素，可直接激活T细胞和NK细胞攻击癌细胞。对恢复化疗后下降的免疫功能起关键作用。",
      ja: "胸腺で作られるペプチドホルモンで、T細胞とNK細胞を直接活性化してがん細胞を攻撃します。抗がん剤治療後に低下した免疫機能の回復に中心的な役割を果たします。",
    },
    mechanism: {
      ko: "T세포 성숙·분화 촉진, NK세포 활성화, 암세포 직접 파괴",
      en: "Promotes T-cell maturation and differentiation, NK cell activation, direct cancer cell destruction",
    },
    evidence: {
      ko: "국제 임상 연구를 통해 T세포 및 NK세포 활성화, 암세포 직접 파괴 기전 확인",
      en: "International clinical studies confirm T-cell and NK cell activation mechanisms",
      ru: "Международные клинические исследования подтверждают активацию Т-клеток и НК-клеток и механизм прямого уничтожения раковых клеток.",
      kz: "Халықаралық клиникалық зерттеулер Т-жасушалары мен NK жасушаларының белсенуін және қатерлі ісік жасушаларын тікелей жою механизмін растайды.",
      zh: "国际临床研究证实其激活T细胞和NK细胞、直接破坏癌细胞的机制。",
      ja: "国際的な臨床研究で、T細胞・NK細胞の活性化とがん細胞を直接破壊する機序が確認されています。",
    },
    image: "/immune/program/cancer-heal1-1.png",
    type: "injection",
  },

  mistletoe: {
    id: "mistletoe",
    axis: "immunity",
    name: { ko: "미슬토 요법", en: "Mistletoe Therapy", ru: "Терапия Омелой", kz: "Омела терапиясы", zh: "槲寄生疗法", ja: "ミスルトー（ヤドリギ）療法" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "유럽 겨우살이(Viscum album) 추출물로 제조된 항암 보조 주사제. NK세포와 T림프구 활성화로 면역력을 높이고 항암제 부작용을 줄여줍니다.",
      en: "An injectable anti-cancer adjuvant made from European mistletoe (Viscum album) extract. Enhances immunity by activating NK cells and T lymphocytes, and reduces chemotherapy side effects.",
      ru: "Инъекционный препарат из европейской омелы. Повышает иммунитет, активируя НК-клетки и Т-лимфоциты, снижает побочные эффекты химиотерапии.",
      kz: "Еуропалық омела (Viscum album) сығындысынан жасалған қосалқы ісікке қарсы инъекция. NK жасушалары мен Т-лимфоциттерді белсендіріп иммунитетті көтереді және химиотерапияның жанама әсерлерін азайтады.",
      zh: "以欧洲槲寄生（Viscum album）提取物制成的抗癌辅助注射剂。通过激活NK细胞和T淋巴细胞增强免疫力，并减轻化疗副作用。",
      ja: "ヨーロッパヤドリギ（Viscum album）抽出物から作られる抗がん補助注射剤。NK細胞とTリンパ球を活性化して免疫力を高め、抗がん剤の副作用を軽減します。",
    },
    mechanism: {
      ko: "NK세포·T림프구 활성화, 사이토카인 생성 촉진, 항암제 부작용(오심·피로) 완화",
      en: "NK cell and T lymphocyte activation, cytokine production promotion, chemotherapy side effect reduction",
    },
    image: "/immune/program/cancer-heal1-2.png",
    type: "injection",
  },

  immunocyanin: {
    id: "immunocyanin",
    axis: "immunity",
    name: { ko: "이뮤노시아닌", en: "Immunocyanin (KLH)", ru: "Иммуноцианин", kz: "Иммуноцианин (KLH)", zh: "免疫蓝蛋白 (Immunocyanin)", ja: "イムノシアニン" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "해양 연체동물에서 추출한 고분자 단백질로 강력한 면역 자극 효과를 가집니다. 비특이적 면역 강화와 항암 치료 보조로 사용됩니다.",
      en: "A high-molecular-weight protein extracted from marine mollusks with powerful immune-stimulating effects, used for non-specific immune enhancement and as a cancer treatment adjuvant.",
      ru: "Высокомолекулярный белок, выделенный из морских моллюсков, с мощным иммуностимулирующим действием. Применяется для неспецифического усиления иммунитета и как вспомогательное средство при лечении рака.",
      kz: "Теңіз моллюскаларынан алынған, күшті иммуностимуляциялық әсері бар жоғары молекулалы ақуыз. Бейспецификалық иммунитетті күшейту үшін және қатерлі ісік емінің қосалқы құралы ретінде қолданылады.",
      zh: "从海洋软体动物中提取的高分子蛋白，具有强效免疫刺激作用。用于非特异性免疫增强及癌症治疗的辅助手段。",
      ja: "海洋軟体動物から抽出した高分子タンパク質で、強力な免疫刺激作用があります。非特異的な免疫強化と、がん治療の補助として用いられます。",
    },
    type: "injection",
  },

  nkCell: {
    id: "nkCell",
    axis: "immunity",
    name: { ko: "NK세포치료제", en: "NK Cell Therapy", ru: "НК-клеточная Терапия", kz: "NK жасушалық терапия", zh: "NK细胞疗法", ja: "NK細胞療法" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "자연살해세포(Natural Killer Cell)를 활성화하여 암세포를 직접 공격하는 면역 치료입니다. 수술 후 잔존 암세포 관리에 효과적입니다.",
      en: "An immunotherapy that activates Natural Killer cells to directly attack cancer cells. Effective for managing residual cancer cells after surgery.",
      ru: "Иммунотерапия, активирующая NK-клетки для прямой атаки раковых клеток.",
      kz: "Табиғи киллер (NK) жасушаларын белсендіріп, қатерлі ісік жасушаларына тікелей шабуыл жасайтын иммундық ем. Отадан кейін қалған ісік жасушаларын бақылауда тиімді.",
      zh: "通过激活自然杀伤细胞（NK细胞）直接攻击癌细胞的免疫疗法。对术后残留癌细胞的管理有效。",
      ja: "ナチュラルキラー（NK）細胞を活性化し、がん細胞を直接攻撃する免疫療法です。手術後に残存するがん細胞の管理に有効です。",
    },
    image: "/immune/program/cancer-heal1-3.png",
    type: "injection",
  },

  immunoPlus: {
    id: "immunoPlus",
    axis: "immunity",
    name: { ko: "면역플러스 (황기 부정단)", en: "Immune Plus (Astragalus Formula)", ru: "Иммун Плюс", kz: "Иммун Плюс (астрагал негізіндегі шөп қоспасы)", zh: "免疫加强方（黄芪扶正丹）", ja: "免疫プラス（黄耆扶正丹）" },
    category: { ko: "체액면역", en: "Humoral Immunity" },
    description: {
      ko: "한방 면역 강화 처방. 황기(Astragalus) 등 면역 증강 한약재를 조합한 맞춤 처방으로, 체액면역 강화와 기력 회복을 돕습니다.",
      en: "Korean medicine immune-boosting formula combining Astragalus and other immune-enhancing herbs for humoral immunity and energy recovery.",
      ru: "Иммуноукрепляющий рецепт корейской медицины. Индивидуальная формула на основе астрагала (Astragalus) и других трав, усиливающих иммунитет; поддерживает гуморальный иммунитет и восстановление сил.",
      kz: "Корей медицинасының иммунитетті нығайтатын рецепті. Астрагал (Astragalus) және басқа иммунитетті күшейтетін шөптерден жасалған жеке құрам; гуморальды иммунитетті нығайтып, күш-қуатты қалпына келтіруге көмектеседі.",
      zh: "韩医免疫强化处方。以黄芪（Astragalus）等增强免疫的药材组成的个性化方剂，有助于强化体液免疫和恢复体力。",
      ja: "韓医学の免疫強化処方。黄耆（Astragalus）などの免疫増強生薬を組み合わせたオーダーメイド処方で、体液性免疫の強化と体力回復を助けます。",
    },
    type: "herbal",
  },

  glutamine: {
    id: "glutamine",
    axis: "immunity",
    name: { ko: "글루타민 주사", en: "Glutamine Injection", ru: "Инъекция Глутамина", kz: "Глутамин инъекциясы", zh: "谷氨酰胺注射", ja: "グルタミン注射" },
    category: { ko: "체액면역", en: "Humoral Immunity" },
    description: {
      ko: "면역세포의 주요 에너지원인 글루타민을 직접 공급하여 점막 면역 기능을 강화합니다. 항암치료 중 구내염, 장 점막 손상에 효과적입니다.",
      en: "Directly supplies glutamine, the primary energy source for immune cells, strengthening mucosal immunity. Effective against mucositis and intestinal mucosal damage during chemotherapy.",
      ru: "Напрямую восполняет глутамин — основной источник энергии иммунных клеток — и укрепляет иммунитет слизистых оболочек. Эффективен при стоматите и повреждении слизистой кишечника во время химиотерапии.",
      kz: "Иммундық жасушалардың негізгі энергия көзі — глутаминді тікелей жеткізіп, шырышты қабаттың иммундық қызметін нығайтады. Химиотерапия кезіндегі стоматит пен ішек шырышты қабатының зақымдануына тиімді.",
      zh: "直接补充免疫细胞的主要能量来源——谷氨酰胺，强化黏膜免疫功能。对化疗期间的口腔炎和肠黏膜损伤有效。",
      ja: "免疫細胞の主要なエネルギー源であるグルタミンを直接補給し、粘膜の免疫機能を強化します。抗がん剤治療中の口内炎や腸粘膜の損傷に有効です。",
    },
    type: "injection",
  },

  anticancerImmune: {
    id: "anticancerImmune",
    axis: "immunity",
    name: { ko: "항암면역증강제", en: "Anti-cancer Immune Enhancer", ru: "Иммуностимулятор при Онкологии", kz: "Онкологиядағы иммунды күшейткіш", zh: "抗癌免疫增强剂", ja: "抗がん免疫増強剤" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "항암치료 중 저하된 면역 기능을 보완하는 보조 치료제. 항암제의 효과를 최대화하면서 부작용은 최소화합니다.",
      en: "Adjuvant therapy that compensates for reduced immune function during chemotherapy, maximizing drug effects while minimizing side effects.",
      ru: "Вспомогательное средство, восполняющее сниженную во время химиотерапии иммунную функцию. Усиливает эффект противоопухолевых препаратов и сводит к минимуму побочные эффекты.",
      kz: "Химиотерапия кезінде төмендеген иммундық қызметті толықтыратын қосалқы ем. Ісікке қарсы препараттардың әсерін барынша арттырып, жанама әсерлерді азайтады.",
      zh: "补充化疗期间下降的免疫功能的辅助治疗。在最大化抗癌药效果的同时，将副作用降到最低。",
      ja: "抗がん剤治療中に低下した免疫機能を補う補助療法です。抗がん剤の効果を最大限に引き出しながら、副作用を最小限に抑えます。",
    },
    type: "injection",
  },

  // ────────────────── T: 체온 (Temperature) ──────────────────
  hyperthermia: {
    id: "hyperthermia",
    axis: "temperature",
    name: { ko: "고주파온열암치료", en: "High-Frequency Hyperthermia", ru: "Высокочастотная Гипертермия", kz: "Жоғары жиілікті гипертермия", zh: "高频热疗", ja: "高周波温熱療法" },
    description: {
      ko: "8MHz 고주파 전류를 암세포 부위에 집중시켜 42~43°C로 국소 가열합니다. 암세포는 정상 세포보다 열에 취약하므로 사멸을 유도하며, 항암제와 병행 시 시너지 효과가 있습니다.",
      en: "Concentrates 8MHz high-frequency current on cancer cell areas to locally heat to 42-43°C. Cancer cells are more heat-sensitive than normal cells, inducing their death with synergistic effects when combined with chemotherapy.",
      ru: "Высокочастотный ток 8 МГц концентрируется на зоне опухоли, локально нагревая её до 42–43°C. Раковые клетки более чувствительны к теплу, что вызывает их гибель; в сочетании с химиотерапией даёт синергетический эффект.",
      kz: "8 МГц жоғары жиілікті токты ісік аймағына шоғырландырып, жергілікті 42–43°C-қа дейін қыздырады. Қатерлі ісік жасушалары қалыпты жасушаларға қарағанда ыстыққа сезімтал болғандықтан жойылады; химиотерапиямен бірге қолданғанда синергиялық әсер береді.",
      zh: "将8MHz高频电流集中于癌细胞部位，局部加热至42～43°C。癌细胞比正常细胞更不耐热，从而诱导其死亡；与化疗并用时具有协同效应。",
      ja: "8MHzの高周波電流をがん細胞の部位に集中させ、42〜43°Cまで局所的に加熱します。がん細胞は正常細胞より熱に弱いため死滅が誘導され、抗がん剤と併用すると相乗効果があります。",
    },
    mechanism: {
      ko: "고열에 의한 암세포 사멸, 혈류 개선, 항암제 암세포 내 흡수율 증가",
      en: "Cancer cell death by heat, blood flow improvement, increased chemotherapy absorption in cancer cells",
    },
    evidence: {
      ko: "고주파온열 + 항암제 병행 시 생존기간 유의미 증가 (해외 임상 데이터)",
      en: "Significant survival time increase when combined with chemotherapy (international clinical data)",
      ru: "Значимое увеличение продолжительности жизни при сочетании с химиотерапией (международные клинические данные).",
      kz: "Химиотерапиямен бірге қолданғанда өмір сүру ұзақтығының айтарлықтай артуы (халықаралық клиникалық деректер).",
      zh: "与化疗并用时生存期显著延长（国际临床数据）。",
      ja: "抗がん剤と併用した場合に生存期間が有意に延長（海外臨床データ）。",
    },
    price: { amount: 250000, unit: "KRW/session" },
    image: "/immune/program/cancer-heal1-4.png",
    type: "physical",
  },

  infraredHeat: {
    id: "infraredHeat",
    axis: "temperature",
    name: { ko: "적외선온열요법", en: "Infrared Thermotherapy", ru: "Инфракрасная Термотерапия", kz: "Инфрақызыл термотерапия", zh: "红外线温热疗法", ja: "赤外線温熱療法" },
    description: {
      ko: "근적외선을 이용한 전신 온열 요법. 기관지 염증 완화, 혈액 순환 개선, 피로 회복에 효과적입니다. 폐암 수술 후 호흡 재활에도 활용됩니다.",
      en: "Whole-body thermotherapy using near-infrared. Effective for bronchial inflammation relief, blood circulation improvement, and fatigue recovery.",
      ru: "Общая термотерапия с использованием ближнего инфракрасного излучения. Эффективна для снятия воспаления бронхов, улучшения кровообращения и восстановления сил; применяется также при дыхательной реабилитации после операций по поводу рака лёгкого.",
      kz: "Жақын инфрақызыл сәулені қолданатын жалпы дене жылу емі. Бронх қабынуын басуға, қан айналымын жақсартуға және шаршауды басуға тиімді; өкпе обыры отасынан кейінгі тыныс алу реабилитациясында да қолданылады.",
      zh: "利用近红外线的全身温热疗法。对缓解支气管炎症、改善血液循环和消除疲劳有效，也用于肺癌术后的呼吸康复。",
      ja: "近赤外線を用いた全身温熱療法。気管支の炎症緩和、血行改善、疲労回復に有効で、肺がん手術後の呼吸リハビリにも活用されます。",
    },
    type: "physical",
  },

  // ────────────────── C: 순환 (Circulation) ──────────────────
  lymphDrainage: {
    id: "lymphDrainage",
    axis: "circulation",
    name: { ko: "림프도수 마사지", en: "Lymphatic Drainage Massage", ru: "Лимфодренажный Массаж", kz: "Лимфодренаж массажы", zh: "淋巴引流按摩", ja: "リンパドレナージマッサージ" },
    description: {
      ko: "숙련된 치료사가 림프관을 따라 마사지하여 림프액 순환을 돕습니다. 수술 후 림프절 제거로 발생하는 림프부종 치료에 필수적이며, 방치 시 평생 통증과 신경저림이 지속될 수 있습니다.",
      en: "Skilled therapists massage along lymph vessels to assist lymph circulation. Essential for treating post-surgical lymphedema; untreated lymphedema can cause lifelong pain and nerve tingling.",
      ru: "Специалисты массируют лимфатические сосуды. Незаменим при лимфедеме после удаления лимфоузлов.",
      kz: "Тәжірибелі маман лимфа тамырларының бағытымен уқалап, лимфа сұйықтығының айналымына көмектеседі. Отада лимфа түйіндері алынғаннан кейін пайда болатын лимфедеманы емдеуде міндетті; емделмесе ауырсыну мен жүйке ұюы өмір бойы сақталуы мүмкін.",
      zh: "由熟练治疗师沿淋巴管进行按摩，帮助淋巴液循环。对术后因淋巴结切除引起的淋巴水肿治疗必不可少；若置之不理，疼痛和神经麻木可能伴随终生。",
      ja: "熟練したセラピストがリンパ管に沿ってマッサージし、リンパ液の循環を助けます。手術でリンパ節を切除した後に起こるリンパ浮腫の治療に不可欠で、放置すると痛みや神経のしびれが生涯続くことがあります。",
    },
    type: "manual",
  },

  ict: {
    id: "ict",
    axis: "circulation",
    name: { ko: "침전기물리치료 (ICT)", en: "Acupuncture-Electrophysical Therapy (ICT)", ru: "Иглоэлектрофизиотерапия", kz: "Ине-электрофизиотерапия (ICT)", zh: "电针物理治疗 (ICT)", ja: "鍼電気物理療法（ICT）" },
    description: {
      ko: "침치료와 전기자극을 결합한 치료법. 혈액 및 림프 순환을 개선하고, 통증 완화와 조직 회복을 돕습니다.",
      en: "A treatment combining acupuncture and electrical stimulation to improve blood and lymph circulation, relieve pain, and aid tissue recovery.",
      ru: "Метод, сочетающий иглоукалывание с электростимуляцией. Улучшает крово- и лимфообращение, снимает боль и способствует восстановлению тканей.",
      kz: "Ине емі мен электр ынталандыруды біріктірген ем. Қан және лимфа айналымын жақсартып, ауырсынуды басады және тіндердің қалпына келуіне көмектеседі.",
      zh: "结合针灸与电刺激的治疗方法。改善血液和淋巴循环，缓解疼痛并促进组织恢复。",
      ja: "鍼治療と電気刺激を組み合わせた治療法。血液・リンパの循環を改善し、痛みの緩和と組織の回復を助けます。",
    },
    price: { amount: 5000, unit: "KRW/session" },
    type: "combined",
  },

  // ────────────────── R: 저항성 (Resistibility) ──────────────────
  selenium: {
    id: "selenium",
    axis: "resistibility",
    name: { ko: "셀레늄 요법", en: "Selenium Therapy", ru: "Терапия Селеном", kz: "Селен терапиясы", zh: "硒疗法", ja: "セレン療法" },
    description: {
      ko: "비타민E의 약 2,000배에 달하는 항산화력을 가진 필수 미네랄. 활성산소 억제, DNA 손상 방지, 암세포 사멸 유도 기전이 있습니다. 항암치료 중 세포 손상 최소화에 사용됩니다.",
      en: "An essential mineral with approximately 2,000 times the antioxidant power of vitamin E. Has mechanisms for suppressing free radicals, preventing DNA damage, and inducing cancer cell death.",
      ru: "Незаменимый минерал с антиоксидантной активностью ~2000 раз выше витамина Е. Подавляет свободные радикалы, предотвращает повреждение ДНК.",
      kz: "Антиоксиданттық қуаты Е витаминінен шамамен 2 000 есе жоғары маңызды минерал. Бос радикалдарды басады, ДНҚ зақымдануының алдын алады және қатерлі ісік жасушаларының жойылуын туындатады. Химиотерапия кезінде жасуша зақымдануын азайту үшін қолданылады.",
      zh: "抗氧化能力约为维生素E的2,000倍的必需矿物质。具有抑制自由基、防止DNA损伤、诱导癌细胞凋亡的机制。用于化疗期间尽量减少细胞损伤。",
      ja: "ビタミンEの約2,000倍の抗酸化力を持つ必須ミネラル。活性酸素の抑制、DNA損傷の防止、がん細胞の死滅誘導といった作用があり、抗がん剤治療中の細胞損傷を最小限に抑えるために用いられます。",
    },
    evidence: {
      ko: "셀레늄 보충 시 항암제 독성 감소, 면역 기능 개선 연구 다수 확인",
      en: "Multiple studies confirm reduced chemotherapy toxicity and improved immune function with selenium supplementation",
      ru: "Многочисленные исследования подтверждают снижение токсичности химиотерапии и улучшение иммунной функции при приёме селена.",
      kz: "Көптеген зерттеулер селен қабылдағанда химиотерапияның уыттылығы азайып, иммундық қызмет жақсаратынын растайды.",
      zh: "多项研究证实补充硒可降低化疗毒性并改善免疫功能。",
      ja: "セレン補給により抗がん剤の毒性が軽減し免疫機能が改善することが、多数の研究で確認されています。",
    },
    price: {
      oral: { amount: 800, unit: "KRW/tablet", product: "셀레나제퍼오랄" },
    },
    image: "/immune/program/cancer-heal1-5.png",
    type: "supplement",
  },

  glutathione: {
    id: "glutathione",
    axis: "resistibility",
    name: { ko: "글루타치온", en: "Glutathione", ru: "Глутатион", kz: "Глутатион", zh: "谷胱甘肽", ja: "グルタチオン" },
    description: {
      ko: "체내 강력한 항산화제로, 항암치료 후 세포 손상을 복구하고 간 해독 기능을 지원합니다. 피부 개선과 면역력 강화에도 효과적입니다.",
      en: "A powerful antioxidant that repairs cell damage after chemotherapy and supports liver detoxification. Also effective for skin improvement and immune enhancement.",
      ru: "Мощный антиоксидант, восстанавливающий клетки после химиотерапии и поддерживающий детоксикацию печени.",
      kz: "Ағзадағы күшті антиоксидант; химиотерапиядан кейінгі жасуша зақымдануын қалпына келтіріп, бауырдың детоксикация қызметін қолдайды. Тері жағдайын жақсартуға және иммунитетті нығайтуға да тиімді.",
      zh: "体内强效抗氧化剂，可修复化疗后的细胞损伤并支持肝脏解毒功能。对改善皮肤和增强免疫力也有效。",
      ja: "体内の強力な抗酸化物質で、抗がん剤治療後の細胞損傷を修復し、肝臓の解毒機能を支えます。肌の改善や免疫力の強化にも有効です。",
    },
    type: "injection",
  },

  highVitaminC: {
    id: "highVitaminC",
    axis: "resistibility",
    name: { ko: "고농도 비타민 요법", en: "High-Dose Vitamin Therapy", ru: "Высокодозная Витаминная Терапия", kz: "Жоғары дозалы дәрумен терапиясы", zh: "高剂量维生素疗法", ja: "高濃度ビタミン療法" },
    description: {
      ko: "고농도 비타민C를 정맥 주사로 직접 공급. 항산화 작용으로 암세포 성장 억제, 면역 강화, 항암 피로 회복에 사용됩니다.",
      en: "Directly delivers high-concentration vitamin C via IV. Used for cancer cell growth inhibition through antioxidant action, immune enhancement, and chemotherapy fatigue recovery.",
      ru: "Высокие дозы витамина С внутривенно. Тормозит рост раковых клеток, усиливает иммунитет, борется с усталостью при химиотерапии.",
      kz: "Жоғары концентрациялы С витаминін көктамыр ішіне тікелей енгізеді. Антиоксиданттық әсерімен қатерлі ісік жасушаларының өсуін тежеу, иммунитетті күшейту және химиотерапиядан кейінгі шаршауды басу үшін қолданылады.",
      zh: "通过静脉注射直接补充高浓度维生素C。利用其抗氧化作用抑制癌细胞生长、增强免疫力并缓解化疗疲劳。",
      ja: "高濃度ビタミンCを点滴で直接投与します。抗酸化作用によるがん細胞の増殖抑制、免疫強化、抗がん剤治療による疲労の回復に用いられます。",
    },
    type: "injection",
  },

  placentaExtract: {
    id: "placentaExtract",
    axis: "resistibility",
    name: { ko: "태반추출물", en: "Placenta Extract (Laennec/Melsmon)", ru: "Экстракт Плаценты", kz: "Плацента сығындысы (Laennec/Melsmon)", zh: "胎盘提取物 (Laennec/Melsmon)", ja: "プラセンタエキス（ラエンネック／メルスモン）" },
    description: {
      ko: "인태반 추출물(라이넥/멜스몬 등)로 세포 재생, 면역 조절, 간 기능 개선 효과가 있습니다. 수술 후 회복 기간 단축에 사용됩니다.",
      en: "Human placenta extract (Laennec/Melsmon etc.) with cell regeneration, immune regulation, and liver function improvement effects. Used to shorten post-surgical recovery periods.",
      ru: "Экстракт человеческой плаценты (Лаеннек, Мелсмон и др.) способствует регенерации клеток, регуляции иммунитета и улучшению функции печени. Применяется для сокращения периода восстановления после операции.",
      kz: "Адам плацентасының сығындысы (Лаеннек, Мелсмон және т.б.) жасушаның қалпына келуіне, иммунитетті реттеуге және бауыр қызметін жақсартуға көмектеседі. Отадан кейінгі қалпына келу мерзімін қысқарту үшін қолданылады.",
      zh: "人胎盘提取物（Laennec/Melsmon等），具有细胞再生、免疫调节和改善肝功能的作用。用于缩短术后恢复期。",
      ja: "ヒト胎盤エキス（ラエンネック／メルスモンなど）で、細胞再生・免疫調節・肝機能改善の効果があります。手術後の回復期間の短縮に用いられます。",
    },
    type: "injection",
  },

  // ────────────────── N: 영양 (Nutrition) ──────────────────
  chefLive: {
    id: "chefLive",
    axis: "nutrition",
    name: { ko: "셰프 라이브 코너", en: "Chef Live Station", ru: "Живая Кухня Шефа", kz: "Аспаздың тікелей дайындау бұрышы", zh: "厨师现场烹饪区", ja: "シェフのライブキッチン" },
    description: {
      ko: "전담 셰프가 환자 상태에 맞게 즉석에서 조리하는 맞춤 식단 코너. 30종 이상의 메뉴 중 선택 가능하며, 항암 맞춤, 저잔사, 위절제 식이 등 질환별 특화 메뉴가 있습니다.",
      en: "A dedicated chef station where food is prepared fresh according to each patient's condition. 30+ menu options with cancer-specific, low-residue, post-gastrectomy specialized menus.",
      ru: "Шеф-повар готовит свежие блюда для каждого пациента. Более 30 вариантов меню, включая специализированные противораковые диеты.",
      kz: "Арнайы аспаз әр науқастың жағдайына қарай тағамды сол жерде дайындайтын жеке мәзір бұрышы. 30-дан астам мәзірден таңдауға болады; ісікке қарсы ем кезіндегі, аз қалдықты, асқазан резекциясынан кейінгі сияқты ауруға арналған арнайы мәзірлер бар.",
      zh: "由专属厨师根据患者状态现场烹调的定制餐饮专区。可从30余种菜单中选择，并提供抗癌专用、低渣、胃切除术后等按疾病特化的菜单。",
      ja: "専属シェフが患者の状態に合わせてその場で調理するオーダーメイド食事コーナー。30種類以上のメニューから選べ、抗がん剤治療向け・低残渣・胃切除後など疾患別の特化メニューがあります。",
    },
    menuOptions: {
      ko: [
        "맞춤 면역 회복 선택식 (30종+)",
        "셰프 라이브 코너",
        "항암 맞춤 코너",
        "항암 쌈채소 코너",
        "제철 과일 코너",
        "수제 건강음료 코너",
        "비빔밥 코너",
      ],
      en: [
        "Custom immune recovery menu (30+ options)",
        "Chef Live Station",
        "Chemotherapy-specific menu",
        "Wrapped vegetables corner",
        "Seasonal fruit corner",
        "Artisan health drink corner",
        "Bibimbap corner",
      ],
    },
    images: [
      "/immune/program/cancer-heal5-1.png",
      "/immune/program/cancer-heal5-2.png",
      "/immune/program/cancer-heal5-3.png",
      "/immune/program/cancer-heal5-4.png",
      "/immune/program/cancer-heal6-1.jpg",
      "/immune/program/cancer-heal6-2.jpg",
      "/immune/program/cancer-heal6-3.jpg",
      "/immune/program/cancer-heal6-4.jpg",
      "/immune/program/cancer-heal6-5.jpg",
      "/immune/program/cancer-heal6-6.jpg",
      "/immune/program/cancer-heal6-7.jpg",
      "/immune/program/cancer-heal6-8.jpg",
    ],
    type: "nutrition",
  },

  lowResidueDiet: {
    id: "lowResidueDiet",
    axis: "nutrition",
    name: { ko: "저잔사 치료식이", en: "Low-Residue Therapeutic Diet", ru: "Низкошлаковая Лечебная Диета", kz: "Аз қалдықты емдік диета", zh: "低渣治疗饮食", ja: "低残渣治療食" },
    description: {
      ko: "대장·위 절제 수술 후 장에 부담을 최소화하는 식이요법. 소화가 잘 되고 장 자극이 적은 음식으로 구성됩니다.",
      en: "Diet therapy that minimizes intestinal burden after colorectal or gastric resection surgery.",
      ru: "Диетотерапия, сводящая к минимуму нагрузку на кишечник после резекции толстой кишки или желудка. Состоит из легкоусвояемых продуктов, мало раздражающих кишечник.",
      kz: "Тоқ ішек немесе асқазан резекциясынан кейін ішекке түсетін жүктемені азайтатын емдік тамақтану. Жеңіл қорытылатын, ішекті аз тітіркендіретін тағамдардан құралады.",
      zh: "在结直肠或胃切除手术后尽量减轻肠道负担的饮食疗法。由易消化、对肠道刺激少的食物组成。",
      ja: "大腸・胃の切除手術後に腸への負担を最小限にする食事療法。消化が良く腸への刺激が少ない食品で構成されます。",
    },
    indications: { ko: ["대장암 수술 후", "위암 수술 후", "장 기능 저하 환자"], en: ["Post-colorectal surgery", "Post-gastric surgery", "Patients with reduced bowel function"] },
    type: "nutrition",
  },

  gastrectomyDiet: {
    id: "gastrectomyDiet",
    axis: "nutrition",
    name: { ko: "위절제 치료식이 (덤핑증후군 관리)", en: "Post-Gastrectomy Diet (Dumping Syndrome Management)", ru: "Диета после Гастрэктомии", kz: "Асқазан резекциясынан кейінгі диета (демпинг-синдромды бақылау)", zh: "胃切除术后饮食（倾倒综合征管理）", ja: "胃切除後治療食（ダンピング症候群の管理）" },
    description: {
      ko: "위절제 후 발생하는 덤핑증후군(식사 직후 어지럼·저혈당)을 예방하는 소량 다회 식이 프로그램. 단순당 제한, 수분과 식사 분리 등 맞춤 관리를 제공합니다.",
      en: "A small, frequent meal program to prevent dumping syndrome (dizziness/hypoglycemia immediately after eating) after gastrectomy.",
      ru: "Программа дробного питания малыми порциями для профилактики демпинг-синдрома (головокружение и гипогликемия сразу после еды) после гастрэктомии. Включает ограничение простых сахаров, раздельный приём жидкости и пищи и другие индивидуальные меры.",
      kz: "Гастрэктомиядан кейін пайда болатын демпинг-синдромның (тамақтан кейін бірден бас айналу, гипогликемия) алдын алатын аз-аздап жиі тамақтану бағдарламасы. Қарапайым қанттарды шектеу, сұйықтық пен тамақты бөлек қабылдау сияқты жеке күтім ұсынылады.",
      zh: "预防胃切除后倾倒综合征（餐后即刻头晕、低血糖）的少量多餐饮食方案。提供限制单糖、水分与进餐分开等个性化管理。",
      ja: "胃切除後に起こるダンピング症候群（食後すぐのめまい・低血糖）を予防する少量頻回食のプログラム。単純糖の制限、水分と食事を分けるなどの個別管理を行います。",
    },
    indications: { ko: ["위절제 수술 후", "덤핑증후군 환자"], en: ["Post-gastrectomy", "Dumping syndrome patients"] },
    type: "nutrition",
  },

  lowIodideDiet: {
    id: "lowIodideDiet",
    axis: "nutrition",
    name: { ko: "저요오드 식이", en: "Low-Iodine Diet", ru: "Низкойодная Диета", kz: "Йоды аз диета", zh: "低碘饮食", ja: "低ヨウ素食" },
    description: {
      ko: "갑상선암 수술 후 방사성요오드 치료 전에 실시하는 저요오드 식이. 방사성요오드 치료 효과를 극대화하기 위해 요오드 섭취를 제한합니다.",
      en: "Low-iodine diet before radioiodine therapy after thyroid cancer surgery, restricting iodine intake to maximize treatment effectiveness.",
      ru: "Низкойодная диета перед радиойодтерапией после операции по поводу рака щитовидной железы. Ограничивает поступление йода, чтобы максимально повысить эффективность лечения радиоактивным йодом.",
      kz: "Қалқанша безі обыры отасынан кейін радиоактивті йодпен емдеу алдында қолданылатын йоды аз диета. Емнің тиімділігін барынша арттыру үшін йод қабылдауды шектейді.",
      zh: "甲状腺癌术后、放射性碘治疗前实施的低碘饮食。通过限制碘的摄入，最大化放射性碘治疗的效果。",
      ja: "甲状腺がん手術後、放射性ヨウ素治療の前に行う低ヨウ素食。治療効果を最大化するためにヨウ素の摂取を制限します。",
    },
    indications: { ko: ["갑상선암 수술 후", "방사성요오드 치료 예정 환자"], en: ["Post-thyroid surgery", "Patients scheduled for radioiodine therapy"] },
    type: "nutrition",
  },
};

// 비급여 가격표 (2026-04-21 기준, 강서 본원)
export const NON_COVERED_PRICES = {
  tests: {
    nkActivityTest: 100000,
    hairMineralTest: 150000,
    antioxidantTest: 100000,
    urineOrganicAcid: 270000,
    maleCancerMarker11: 150000,
    femaleCancerMarker12: 150000,
    maleComprehensive26: 220000,
    femaleComprehensive27: 200000,
  },
  therapy: {
    manualTherapy30min: 90000,
    manualTherapy40min: 120000,
    manualTherapy50min: 180000,
    manualTherapy60min: 230000,
    manualTherapy70min: 280000,
    painScrambler: "200,000–300,000",
    shockwave: 180000,
    cryo3min: 30000,
    hyperthermia: 250000,
    neurInjection: 50000,
    placentaInjection: 100000,
    ict: 5000,
  },
  room: {
    vipMin: 200000,
    vipMax: 600000,
    unit: "KRW/day",
  },
};

export const THERAPY_AXES = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];

export const THERAPY_LIST = Object.values(IMMUNE_THERAPIES);
