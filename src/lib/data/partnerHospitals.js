/**
 * Static partner hospital data
 * These hospitals don't exist in the DB — they're our consortium / cooperating partners.
 */

const PARTNER_HOSPITALS = {
  /* ════════════════════════════════════════════
     면력한방병원 — 3개 지점 (제휴 병원)
     ════════════════════════════════════════════ */
  "immunehospital-magok": {
    slug: "immunehospital-magok",
    badge: "partner",
    name: { ko: "면력한방병원 강서점", en: "Immune Hospital Gangseo", ru: "Immune Hospital Кансо", kz: "Immune Hospital Кансо", zh: "Immune Hospital 江西院", ja: "Immune Hospital 江西院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "면력한방병원 강서점은 서울 마곡에 위치한 한방 면역치료 전문 본원입니다. 통합암치료 인정의를 포함한 6명의 전문 의료진이 한방 면역치료, 통증재활, 한방내과, 한방부인과, 한방신경정신과 등 다양한 분야에서 암환자의 면역력 강화와 항암 부작용 관리를 담당하고 있습니다. 사상체질 진단을 기반으로 한 맞춤형 면역 프로그램과 한약·침·약침 통합 치료를 제공합니다.",
      en: "Immune Hospital Gangseo is the headquarters located in Magok, Seoul, specializing in Korean Medicine immunotherapy. With 6 expert doctors including certified integrative oncology specialists, we offer personalized immune enhancement programs based on Sasang constitutional diagnosis, combined herbal medicine, acupuncture, and pharmacopuncture treatments for cancer patients.",
      ru: "Immune Hospital Кансо — главный офис в Магоке, Сеул, специализирующийся на иммунотерапии корейской медицины. 6 специалистов, включая сертифицированных онкологов, обеспечивают персонализированные программы укрепления иммунитета.",
      kz: "Immune Hospital Кансо — Сеул Магоктағы бас кеңсе, корей медицинасы иммунотерапиясына маманданған. 6 маман дәрігер қызмет көрсетеді.",
      zh: "Immune Hospital 江西本院位于首尔麻谷，是韩方免疫治疗专科总院。拥有6名专家医生，包括获认证的综合肿瘤治疗专家，提供基于四象体质诊断的个性化免疫增强方案。",
      ja: "Immune Hospital 江西本院はソウル麻谷に位置する韓方免疫治療専門の本院です。統合がん治療認定医を含む6名の専門医が在籍し、四象体質診断に基づく個別化された免疫プログラムを提供しています。",
    },
    website: "https://immunehospital.com",
    phone: "1522-8850",
    address: { ko: "서울특별시 강서구 마곡중앙6로 93 (마곡동, 열린프라자) 6,7,10층", en: "6F/7F/10F, 93 Magok Jungang 6-ro, Gangseo-gu, Seoul", ru: "Сеул, Кансо-гу, Магокчунан 6-ро, 93 (Магок-дон, Ёллин Плаза), 6, 7 и 10 этажи", kz: "Сеул, Кансо-гу, Магокчунан 6-ро, 93 (Магок-дон, Ёллин Плаза), 6, 7 және 10 қабаттар", zh: "首尔特别市江西区麻谷中央6路93号（麻谷洞，Open Plaza）6、7、10层", ja: "ソウル特別市江西区麻谷中央6路93（麻谷洞、オープンプラザ）6・7・10階" },
    lat: 37.5620, lng: 126.8282,
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "통증재활", "한방내과", "한방부인과", "한방신경정신과", "한방재활의학과", "양방 산부인과"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Pain Rehabilitation", "Korean Internal Medicine", "Korean OB/GYN", "Korean Neuropsychiatry", "Korean Rehabilitation Medicine", "Western OB/GYN"],
      ru: ["Иммунотерапия корейской медицины", "Интегративная онкология", "Реабилитация при боли", "Корейская терапия", "Корейская гинекология", "Корейская нейропсихиатрия", "Корейская реабилитационная медицина", "Западная гинекология"],
      kz: ["Корей медицинасы иммунотерапиясы", "Интегративті онкология", "Ауырсынуды оңалту", "Корей ішкі аурулары", "Корей гинекологиясы", "Корей нейропсихиатриясы", "Корей оңалту медицинасы", "Батыс гинекологиясы"],
      zh: ["韩方免疫治疗", "综合肿瘤治疗", "疼痛康复", "韩方内科", "韩方妇科", "韩方神经精神科", "韩方康复医学科", "西医妇产科"],
      ja: ["韓方免疫治療", "統合がん治療", "疼痛リハビリ", "韓方内科", "韓方婦人科", "韓方神経精神科", "韓方リハビリ医学科", "西洋医学産婦人科"],
    },
    highlights: {
      ko: ["외국인환자 유치의료기관 등록", "통합암치료 인정의 다수 보유", "사상체질 진단 기반 맞춤 면역 프로그램", "한약·침·약침 통합 치료 시스템", "6명 전문의 상주"],
      en: ["Registered for International Patient Care", "Multiple Certified Integrative Oncology Specialists", "Personalized Immune Programs via Sasang Diagnosis", "Integrated Herbal Medicine, Acupuncture & Pharmacopuncture", "6 Resident Specialists"],
      ru: ["Зарегистрировано для иностранных пациентов", "Несколько сертифицированных онкологов", "Индивидуальные иммунные программы по диагностике Сасан", "Интеграция фитотерапии, акупунктуры и фармакопунктуры", "6 штатных специалистов"],
      kz: ["Шетелдік науқастарға тіркелген", "Бірнеше сертификатталған онколог", "Сасан диагностикасы негізіндегі иммундық бағдарламалар", "Фитотерапия, акупунктура және фармакопунктура интеграциясы", "6 штаттық маман"],
      zh: ["外国患者诊疗机构注册", "多名综合肿瘤治疗认证医师", "基于四象体质诊断的定制免疫方案", "韩药·针灸·药针综合治疗系统", "6名专科医师常驻"],
      ja: ["外国人患者誘致医療機関登録", "統合がん治療認定医を複数保有", "四象体質診断に基づく免疫プログラム", "韓薬・鍼・薬鍼の統合治療システム", "6名の専門医が常駐"],
    },
    doctorCount: 6,
    certifications: ["외국인환자 유치의료기관 등록"],
    image: "/images/hospitals/immunehospital-magok/1.jpg",
    gallery: [
      "/images/hospitals/immunehospital-magok/2.jpg",
      "/images/hospitals/immunehospital-magok/3.jpg",
      "/images/hospitals/immunehospital-magok/4.jpg",
      "/images/hospitals/immunehospital-magok/5.jpg",
    ],
  },

  "immunehospital-sinchon": {
    slug: "immunehospital-sinchon",
    badge: "partner",
    name: { ko: "면력한방병원 신촌점", en: "Immune Hospital Sinchon", ru: "Immune Hospital Синчхон", kz: "Immune Hospital Синчон", zh: "Immune Hospital 新村院", ja: "Immune Hospital 新村院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "신촌면력한방병원은 서울 서대문구 연세로에 위치한 면력한방병원의 신촌 분원입니다. 피델리아타워 8-14층에 걸쳐 넓은 진료 공간을 운영하며, 대표원장을 포함한 6명의 전문 의료진이 한방 면역치료와 한방재활의학, 한방내과 분야에서 진료합니다. 신촌세브란스병원과 인접하여 양·한방 협진이 용이합니다.",
      en: "Immune Hospital Sinchon is located on Yonsei-ro, Seodaemun-gu, Seoul, occupying floors 8-14 of Fidelia Tower. With 6 specialist doctors including the chief director, it provides Korean Medicine immunotherapy, rehabilitation medicine, and internal medicine. Its proximity to Sinchon Severance Hospital facilitates integrated Western-Korean Medicine cooperation.",
      ru: "Immune Hospital Синчхон расположен на Ёнсе-ро, Содэмун-гу, Сеул, на 8-14 этажах башни Фиделия. 6 специалистов обеспечивают иммунотерапию корейской медицины, реабилитацию и внутреннюю медицину.",
      kz: "Immune Hospital Синчон Ёнсе-рода, Содэмун-гуда, Сеулде, Фиделия мұнарасының 8-14 қабаттарында орналасқан. 6 маман дәрігер қызмет көрсетеді.",
      zh: "新村 Immune Hospital 位于首尔西大门区延世路，占据Fidelia大厦8-14层。6名专家医生提供韩方免疫治疗、康复医学和内科诊疗。毗邻新村世福兰斯医院，便于中西医协诊。",
      ja: "新村 Immune Hospital はソウル西大門区延世路のフィデリアタワー8-14階に位置する分院です。代表院長を含む6名の専門医が韓方免疫治療、リハビリ医学、内科を担当。新村セブランス病院に隣接し洋韓方協診が容易です。",
    },
    website: "https://sc.immunehospital.com",
    phone: "1522-8850",
    address: { ko: "서울특별시 서대문구 연세로 12 (창천동, 피델리아타워) 8-14층", en: "8F-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul (Fidelia Tower)", ru: "Сеул, Содэмун-гу, Ёнсе-ро, 12 (Чханчхон-дон, Фиделия Тауэр), 8–14 этажи", kz: "Сеул, Содэмун-гу, Ёнсе-ро, 12 (Чханчхон-дон, Фиделия Тауэр), 8–14 қабаттар", zh: "首尔特别市西大门区延世路12号（沧川洞，Fidelia Tower）8-14层", ja: "ソウル特別市西大門区延世路12（滄川洞、フィデリアタワー）8〜14階" },
    lat: 37.5568, lng: 126.9366,
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "한방내과", "한방재활의학과"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Korean Internal Medicine", "Korean Rehabilitation Medicine"],
      ru: ["Иммунотерапия корейской медицины", "Интегративная онкология", "Корейская терапия", "Корейская реабилитационная медицина"],
      kz: ["Корей медицинасы иммунотерапиясы", "Интегративті онкология", "Корей ішкі аурулары", "Корей оңалту медицинасы"],
      zh: ["韩方免疫治疗", "综合肿瘤治疗", "韩方内科", "韩方康复医学科"],
      ja: ["韓方免疫治療", "統合がん治療", "韓方内科", "韓方リハビリ医学科"],
    },
    highlights: {
      ko: ["외국인환자 유치의료기관 등록", "신촌세브란스 인접 — 양·한방 협진 용이", "피델리아타워 8-14층 대규모 진료 공간", "6명 전문의 상주"],
      en: ["Registered for International Patient Care", "Adjacent to Severance Hospital — Easy East-West Cooperation", "Large clinic across floors 8-14 of Fidelia Tower", "6 Resident Specialists"],
      ru: ["Зарегистрировано для иностранных пациентов", "Рядом с больницей Северанс — удобное сотрудничество", "Большая клиника на этажах 8-14 башни Фиделия", "6 штатных специалистов"],
      kz: ["Шетелдік науқастарға тіркелген", "Северанс ауруханасына жақын — ыңғайлы бірлескен ем", "Фиделия мұнарасының 8-14 қабаттарындағы кең клиника", "6 штаттық маман"],
      zh: ["外国患者诊疗机构注册", "毗邻新村世福兰斯医院 — 中西医协诊便利", "Fidelia大厦8-14层大型诊疗空间", "6名专科医师常驻"],
      ja: ["外国人患者誘致医療機関登録", "新村セブランス病院に隣接 — 洋韓方協診が容易", "フィデリアタワー8-14階の大規模診療空間", "6名の専門医が常駐"],
    },
    doctorCount: 6,
    certifications: ["외국인환자 유치의료기관 등록"],
    image: "/images/hospitals/immunehospital-sinchon/1.jpg",
    gallery: [
      "/images/hospitals/immunehospital-sinchon/2.jpg",
      "/images/hospitals/immunehospital-sinchon/3.jpg",
      "/images/hospitals/immunehospital-sinchon/4.jpg",
      "/images/hospitals/immunehospital-sinchon/5.jpg",
    ],
  },

  "immunehospital-gwangmyeong": {
    slug: "immunehospital-gwangmyeong",
    badge: "partner",
    name: { ko: "면력한방병원 광명점", en: "Immune Hospital Gwangmyeong", ru: "Immune Hospital Кванмён", kz: "Immune Hospital Кванмён", zh: "Immune Hospital 光明院", ja: "Immune Hospital 光明院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "면력한방병원 광명점은 광명시 철산동 트라이앵글빌딩에 위치한 분원으로, 대표원장을 포함한 7명의 전문 의료진이 한방 면역치료, 통증재활, 한방신경정신과, 마취통증의학과 등 폭넓은 진료를 제공합니다. 스위스 정부 장학생 출신 제네바의대 면역학 연구원 등 해외 연구 경험이 풍부한 의료진이 특징입니다.",
      en: "Immune Hospital Gwangmyeong is located in the Triangle Building in Cheolsan-dong, Gwangmyeong, featuring 7 specialist doctors including the chief director. The team provides comprehensive care in immunotherapy, pain rehabilitation, Korean neuropsychiatry, and anesthesiology. The staff includes doctors with international research experience, including a former Swiss government scholar at the University of Geneva immunology lab.",
      ru: "Immune Hospital Кванмён расположен в здании Triangle в Чхольсан-доне, Кванмён. 7 специалистов обеспечивают иммунотерапию, реабилитацию, нейропсихиатрию и анестезиологию.",
      kz: "Immune Hospital Кванмён Кванмён қаласы Чхольсан-дондағы Triangle ғимаратында орналасқан. 7 маман дәрігер қызмет көрсетеді.",
      zh: "Immune Hospital 光明院位于光明市铁山洞Triangle大厦，7名专家医生提供免疫治疗、疼痛康复、韩方神经精神科、麻醉疼痛医学科等全面诊疗。",
      ja: "Immune Hospital 光明院は光明市鉄山洞のトライアングルビルに位置し、代表院長を含む7名の専門医が免疫治療、疼痛リハビリ、韓方神経精神科、麻酔疼痛医学科など幅広い診療を提供しています。",
    },
    website: "https://km.immunehospital.com",
    phone: "1522-8850",
    address: { ko: "경기도 광명시 철산로 16 (철산동, 트라이앵글빌딩) 6, 8~11층", en: "6F, 8-11F, Triangle Building, 16 Cheolsan-ro, Gwangmyeong-si, Gyeonggi-do", ru: "Кёнги-до, Кванмён-си, Чхольсан-ро, 16 (Чхольсан-дон, Трайэнгл билдинг), 6 и 8–11 этажи", kz: "Кёнги-до, Кванмён-си, Чхольсан-ро, 16 (Чхольсан-дон, Трайэнгл ғимараты), 6 және 8–11 қабаттар", zh: "京畿道光明市铁山路16号（铁山洞，Triangle大厦）6、8-11层", ja: "京畿道光明市鉄山路16（鉄山洞、トライアングルビル）6・8〜11階" },
    lat: 37.4784, lng: 126.8647,
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "통증재활", "한방내과", "한방신경정신과", "침구의학과", "마취통증의학과"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Pain Rehabilitation", "Korean Internal Medicine", "Korean Neuropsychiatry", "Acupuncture Medicine", "Anesthesiology & Pain Medicine"],
      ru: ["Иммунотерапия корейской медицины", "Интегративная онкология", "Реабилитация при боли", "Корейская терапия", "Корейская нейропсихиатрия", "Акупунктура и моксотерапия", "Анестезиология и медицина боли"],
      kz: ["Корей медицинасы иммунотерапиясы", "Интегративті онкология", "Ауырсынуды оңалту", "Корей ішкі аурулары", "Корей нейропсихиатриясы", "Акупунктура және моксотерапия", "Анестезиология және ауырсыну медицинасы"],
      zh: ["韩方免疫治疗", "综合肿瘤治疗", "疼痛康复", "韩方内科", "韩方神经精神科", "针灸科", "麻醉疼痛医学科"],
      ja: ["韓方免疫治療", "統合がん治療", "疼痛リハビリ", "韓方内科", "韓方神経精神科", "鍼灸科", "麻酔疼痛医学科"],
    },
    highlights: {
      ko: ["외국인환자 유치의료기관 등록", "7명 전문의 상주 (한방 + 양방)", "스위스 정부 장학생 출신 면역학 연구원 보유", "통합암치료 인정의 다수", "양방 마취통증의학과 협진"],
      en: ["Registered for International Patient Care", "7 Resident Specialists (Korean + Western Medicine)", "Former Swiss Government Scholar in Immunology", "Multiple Certified Integrative Oncology Specialists", "Western Anesthesiology & Pain Medicine Cooperation"],
      ru: ["Зарегистрировано для иностранных пациентов", "7 штатных специалистов (корейская + западная медицина)", "Бывший стипендиат правительства Швейцарии по иммунологии", "Несколько сертифицированных онкологов", "Сотрудничество с западной анестезиологией"],
      kz: ["Шетелдік науқастарға тіркелген", "7 штаттық маман (корей + батыс медицинасы)", "Швейцария үкіметінің иммунология бойынша бұрынғы стипендиаты", "Бірнеше сертификатталған онколог", "Батыс анестезиологиясымен бірлескен ем"],
      zh: ["外国患者诊疗机构注册", "7名专科医师常驻（韩方+西医）", "拥有瑞士政府奖学金免疫学研究员", "多名综合肿瘤治疗认证医师", "西医麻醉疼痛科协诊"],
      ja: ["外国人患者誘致医療機関登録", "7名の専門医が常駐（韓方+西洋医学）", "スイス政府奨学生出身の免疫学研究員が在籍", "統合がん治療認定医を複数保有", "西洋医学麻酔疼痛科との協診"],
    },
    doctorCount: 7,
    certifications: ["외국인환자 유치의료기관 등록"],
    image: "/images/hospitals/immunehospital-gwangmyeong/1.jpg",
    gallery: [
      "/images/hospitals/immunehospital-gwangmyeong/2.jpg",
      "/images/hospitals/immunehospital-gwangmyeong/3.jpg",
      "/images/hospitals/immunehospital-gwangmyeong/4.jpg",
      "/images/hospitals/immunehospital-gwangmyeong/5.jpg",
    ],
  },

  "immunehospital-seongdong": {
    slug: "immunehospital-seongdong",
    badge: "partner",
    name: { ko: "면력한방병원 성동점", en: "Immune Hospital Seongdong", ru: "Immune Hospital Сондон", kz: "Immune Hospital Сондон", zh: "Immune Hospital 城东院", ja: "Immune Hospital 城東院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "면력한방병원 성동점은 서울 성동구에 신규 개원한 분원으로, 대표원장을 포함한 9명의 전문 의료진이 통합면역센터·통증재활센터·항노화센터를 운영합니다. 한방 면역치료, 한방내과, 정형외과, 한방피부과 등 양·한방 통합 진료를 제공합니다.",
      en: "Immune Hospital Seongdong is a newly opened branch in Seongdong-gu, Seoul, with 9 specialist doctors operating an Integrative Immunity Center, Pain Rehabilitation Center, and Anti-Aging Center. It offers integrated Western-Korean Medicine care including immunotherapy, internal medicine, orthopedics, and dermatology.",
      ru: "Immune Hospital Сондон — новый филиал в Сондон-гу, Сеул. 9 специалистов, центры иммунотерапии, реабилитации и антивозрастной медицины.",
      kz: "Immune Hospital Сондон — Сеул Сондон-гудағы жаңа филиал. 9 маман дәрігер, иммунотерапия, оңалту және қартаюға қарсы орталықтар.",
      zh: "Immune Hospital 城东院是首尔城东区新开院的分院，9名专家医生运营综合免疫中心、疼痛康复中心和抗衰老中心。提供中西医结合诊疗。",
      ja: "Immune Hospital 城東院はソウル城東区に新規開院した分院で、9名の専門医が統合免疫センター・疼痛リハビリセンター・抗老化センターを運営しています。",
    },
    website: "https://sd.immunehospital.com",
    phone: "02-2295-8510",
    address: { ko: "서울특별시 성동구", en: "Seongdong-gu, Seoul", ru: "Сеул, Сондон-гу", kz: "Сеул, Сондон-гу", zh: "首尔特别市城东区", ja: "ソウル特別市城東区" },
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "한방내과", "통증재활", "정형외과", "한방피부과", "항노화"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Korean Internal Medicine", "Pain Rehabilitation", "Orthopedics", "Korean Dermatology", "Anti-Aging"],
      ru: ["Иммунотерапия корейской медицины", "Интегративная онкология", "Корейская терапия", "Реабилитация при боли", "Ортопедия", "Корейская дерматология", "Антивозрастная медицина"],
      kz: ["Корей медицинасы иммунотерапиясы", "Интегративті онкология", "Корей ішкі аурулары", "Ауырсынуды оңалту", "Ортопедия", "Корей дерматологиясы", "Қартаюға қарсы медицина"],
      zh: ["韩方免疫治疗", "综合肿瘤治疗", "韩方内科", "疼痛康复", "骨科", "韩方皮肤科", "抗衰老"],
      ja: ["韓方免疫治療", "統合がん治療", "韓方内科", "疼痛リハビリ", "整形外科", "韓方皮膚科", "抗老化"],
    },
    highlights: {
      ko: ["외국인환자 유치의료기관 등록", "9명 전문의 상주 (한방 + 양방)", "통합면역·통증재활·항노화 센터 운영", "신규 개원 (서울 성동구)", "양·한방 통합 진료"],
      en: ["Registered for International Patient Care", "9 Resident Specialists (Korean + Western Medicine)", "Integrative Immunity · Pain Rehab · Anti-Aging Centers", "Newly Opened (Seongdong-gu, Seoul)", "Integrated Western-Korean Medicine Care"],
      ru: ["Зарегистрировано для иностранных пациентов", "9 штатных специалистов (корейская + западная медицина)", "Центры иммунитета, реабилитации и антивозрастной медицины", "Новый филиал (Сондон-гу, Сеул)", "Интегрированная медицина"],
      kz: ["Шетелдік науқастарға тіркелген", "9 штаттық маман (корей + батыс медицинасы)", "Иммунитет, оңалту және қартаюға қарсы орталықтар", "Жаңа филиал (Сондон-гу, Сеул)", "Кешенді ем"],
      zh: ["外国患者诊疗机构注册", "9名专科医师常驻（韩方+西医）", "综合免疫·疼痛康复·抗衰老中心", "新开院（首尔城东区）", "中西医结合诊疗"],
      ja: ["外国人患者誘致医療機関登録", "9名の専門医が常駐（韓方+西洋医学）", "統合免疫・疼痛リハビリ・抗老化センター", "新規開院（ソウル城東区）", "洋韓方統合診療"],
    },
    doctorCount: 9,
    certifications: ["외국인환자 유치의료기관 등록"],
    image: "/images/hospitals/immunehospital-seongdong/1.jpg",
    gallery: [
      "/images/hospitals/immunehospital-seongdong/2.jpg",
      "/images/hospitals/immunehospital-seongdong/3.jpg",
      "/images/hospitals/immunehospital-seongdong/4.jpg",
      "/images/hospitals/immunehospital-seongdong/5.jpg",
    ],
  },

  /* ════════════════════════════════════════════
     협진 대학병원 4곳
     ════════════════════════════════════════════ */
  "ewha-seoul": {
    slug: "ewha-seoul",
    badge: "university",
    name: { ko: "이대서울병원", en: "Ewha Womans University Seoul Hospital", ru: "Сеульская больница университета Ихва", kz: "Ихва университеті Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "이대서울병원은 2019년 서울 마곡에 개원한 이화여자대학교 의료원 소속 최신 대학병원입니다. 756병상 규모로 최첨단 의료 장비와 쾌적한 환경을 갖추고 있으며, 암센터, 심장혈관센터, 장기이식센터 등 전문센터를 운영합니다. 면력한방병원 강서점과 같은 마곡 지역에 위치하여 양·한방 협진 체계가 원활합니다.",
      en: "Ewha Seoul Hospital opened in 2019 in Magok, Seoul, as a 756-bed state-of-the-art university hospital under Ewha Womans University Medical Center. It operates specialized centers including a Cancer Center, Cardiovascular Center, and Organ Transplant Center. Located in the same Magok area as Immune Hospital Gangseo, enabling seamless Western-Korean Medicine cooperation.",
      ru: "Сеульская больница Ихва открылась в 2019 году в Магоке — 756 коек, онкоцентр, кардиоваскулярный центр и центр трансплантации. Расположена рядом с Immune Hospital Кансо для удобной совместной работы.",
      kz: "Ихва Сеул ауруханасы 2019 жылы Магокта ашылды — 756 төсек-орын, онкологиялық, жүрек-қантамыр орталықтары бар. Immune Hospital Кансомен бірлесіп жұмыс істейді.",
      zh: "梨大首尔医院于2019年在首尔麻谷开院，拥有756张床位的最新大学医院。设有癌症中心、心血管中心、器官移植中心等专科中心。与 Immune Hospital 江西本院同处麻谷地区，中西医协诊便利。",
      ja: "梨大ソウル病院は2019年にソウル麻谷に開院した756床の最新大学病院です。がんセンター、心臓血管センター、臓器移植センターなどの専門センターを運営。Immune Hospital 江西本院と同じ麻谷地域に位置し、洋韓方協診がスムーズです。",
    },
    website: "https://seoulehospital.ewha.ac.kr",
    phone: "1666-5000",
    address: { ko: "서울특별시 강서구 공항대로 260", en: "260 Gonghang-daero, Gangseo-gu, Seoul", ru: "Сеул, Кансо-гу, Конхан-дэро, 260", kz: "Сеул, Кансо-гу, Конхан-дэро, 260", zh: "首尔特别市江西区空港大路260号", ja: "ソウル特別市江西区空港大路260" },
    lat: 37.5573, lng: 126.8358,
    specialties: {
      ko: ["암센터", "종양내과", "유방·갑상선외과", "소화기내과", "방사선종양학과", "영상의학과", "병리과", "핵의학과"],
      en: ["Cancer Center", "Oncology", "Breast & Thyroid Surgery", "Gastroenterology", "Radiation Oncology", "Radiology", "Pathology", "Nuclear Medicine"],
      ru: ["Онкоцентр", "Онкология", "Хирургия груди и щитовидной железы", "Гастроэнтерология", "Радиационная онкология", "Радиология", "Патология", "Ядерная медицина"],
      kz: ["Онкологиялық орталық", "Онкология", "Сүт безі және қалқанша без хирургиясы", "Гастроэнтерология", "Радиациялық онкология", "Радиология", "Патология", "Ядролық медицина"],
      zh: ["癌症中心", "肿瘤内科", "乳腺·甲状腺外科", "消化内科", "放射肿瘤科", "影像医学科", "病理科", "核医学科"],
      ja: ["がんセンター", "腫瘍内科", "乳腺・甲状腺外科", "消化器内科", "放射線腫瘍科", "放射線科", "病理科", "核医学科"],
    },
    highlights: {
      ko: ["2019년 개원 최신 시설 (756병상)", "암센터 운영 — 다학제 통합 진료", "면력한방병원 강서점과 마곡 인접", "외국인환자 전담 부서 운영", "최첨단 영상·수술 장비"],
      en: ["Opened 2019 with 756 Beds", "Cancer Center — Multidisciplinary Integrated Care", "Adjacent to Immune Hospital Gangseo in Magok", "Dedicated International Patient Department", "State-of-the-art Imaging & Surgical Equipment"],
      ru: ["Открыт в 2019 году, 756 коек", "Онкоцентр — мультидисциплинарная помощь", "Рядом с Immune Hospital Кансо в Магоке", "Отдел для иностранных пациентов", "Современное визуализационное и хирургическое оборудование"],
      kz: ["2019 жылы ашылды, 756 төсек-орын", "Онкологиялық орталық — мультидисциплинарлық ем", "Магоктағы Immune Hospital Кансоға жақын", "Шетелдік науқастарға арналған бөлім", "Заманауи бейнелеу және хирургиялық жабдық"],
      zh: ["2019年开院最新设施（756张床位）", "癌症中心 — 多学科综合诊疗", "毗邻麻谷 Immune Hospital 江西本院", "设有外国患者专属部门", "尖端影像·手术设备"],
      ja: ["2019年開院の最新施設（756床）", "がんセンター — 多職種統合診療", "麻谷の Immune Hospital 江西本院に隣接", "外国人患者専門部署を運営", "最先端の画像・手術設備"],
    },
    bedCount: 756,
    image: "/images/hospitals/ewha-seoul/1.jpg",
    gallery: [
      "/images/hospitals/ewha-seoul/2.jpg",
      "/images/hospitals/ewha-seoul/3.jpg",
      "/images/hospitals/ewha-seoul/4.jpg",
      "/images/hospitals/ewha-seoul/5.jpg",
    ],
  },

  "ewha-mokdong": {
    slug: "ewha-mokdong",
    badge: "university",
    name: { ko: "이대목동병원", en: "Ewha Womans University Mokdong Hospital", ru: "Больница Мокдон университета Ихва", kz: "Ихва университеті Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "이대목동병원은 1985년 개원한 이화여자대학교 의료원의 목동 캠퍼스 병원으로, 40년의 역사와 풍부한 임상 경험을 바탕으로 종합 의료서비스를 제공합니다. 특히 소아청소년 암, 여성 암 분야에서 높은 전문성을 보유하고 있으며, 암센터를 통해 수술·항암·방사선 치료를 통합 제공합니다.",
      en: "Ewha Mokdong Hospital, established in 1985, is a comprehensive medical center with 40 years of clinical expertise. It holds particular strengths in pediatric cancer and women's cancer treatment, providing integrated surgery, chemotherapy, and radiation therapy through its Cancer Center.",
      ru: "Больница Ихва Мокдон основана в 1985 году — 40 лет клинического опыта. Особая специализация: детская онкология и женские онкозаболевания. Интегрированная хирургия, химиотерапия и радиотерапия.",
      kz: "Ихва Мокдон ауруханасы 1985 жылы құрылған — 40 жылдық клиникалық тәжірибе. Балалар онкологиясы мен әйелдер онкологиясында мамандану.",
      zh: "梨大木洞医院创建于1985年，拥有40年临床经验。在小儿肿瘤和女性肿瘤领域具有高度专业性，通过癌症中心提供手术、化疗、放疗一体化治疗。",
      ja: "梨大木洞病院は1985年開院、40年の臨床実績を持つ総合医療センターです。小児がん・女性がん分野に高い専門性を有し、がんセンターで手術・化学療法・放射線治療を一体的に提供しています。",
    },
    website: "https://mokdong.ewha.ac.kr",
    phone: "1666-5000",
    address: { ko: "서울특별시 양천구 안양천로 1071", en: "1071 Anyangcheon-ro, Yangcheon-gu, Seoul", ru: "Сеул, Янчхон-гу, Аньянчхон-ро, 1071", kz: "Сеул, Янчхон-гу, Аньянчхон-ро, 1071", zh: "首尔特别市阳川区安养川路1071号", ja: "ソウル特別市陽川区安養川路1071" },
    lat: 37.5372, lng: 126.8861,
    specialties: {
      ko: ["암센터", "종양내과", "소아청소년과", "산부인과", "유방외과", "소화기내과", "방사선종양학과"],
      en: ["Cancer Center", "Oncology", "Pediatrics", "OB/GYN", "Breast Surgery", "Gastroenterology", "Radiation Oncology"],
      ru: ["Онкоцентр", "Онкология", "Педиатрия", "Акушерство и гинекология", "Маммология", "Гастроэнтерология", "Радиационная онкология"],
      kz: ["Онкологиялық орталық", "Онкология", "Педиатрия", "Акушерлік-гинекология", "Сүт безі хирургиясы", "Гастроэнтерология", "Радиациялық онкология"],
      zh: ["癌症中心", "肿瘤内科", "儿科", "妇产科", "乳腺外科", "消化内科", "放射肿瘤科"],
      ja: ["がんセンター", "腫瘍内科", "小児科", "産婦人科", "乳腺外科", "消化器内科", "放射線腫瘍科"],
    },
    highlights: {
      ko: ["1985년 개원 — 40년 임상 경험", "소아청소년 암 전문 치료", "여성 암 (유방암·자궁경부암) 특화", "암센터 수술·항암·방사선 통합 진료", "풍부한 임상 연구 및 학술 성과"],
      en: ["Established 1985 — 40 Years of Clinical Expertise", "Specialized Pediatric Cancer Treatment", "Women's Cancer Specialization (Breast, Cervical)", "Cancer Center: Integrated Surgery, Chemo & Radiation", "Extensive Clinical Research & Academic Achievements"],
      ru: ["Основан в 1985 году — 40 лет клинического опыта", "Специализированное лечение детского рака", "Специализация на женском раке (груди, шейки матки)", "Онкоцентр: хирургия, химио- и лучевая терапия", "Обширные клинические исследования"],
      kz: ["1985 жылы құрылған — 40 жылдық клиникалық тәжірибе", "Балалар обырын мамандандырылған емдеу", "Әйелдер обырына маманданған (сүт безі, жатыр мойны)", "Онкологиялық орталық: хирургия, химио- және сәулелік ем", "Кең клиникалық зерттеулер"],
      zh: ["1985年开院 — 40年临床经验", "儿童青少年癌症专科治疗", "女性癌症（乳腺·宫颈）特化", "癌症中心：手术·化疗·放疗综合诊疗", "丰富的临床研究与学术成果"],
      ja: ["1985年開院 — 40年の臨床経験", "小児・青少年がん専門治療", "女性がん（乳がん・子宮頸がん）特化", "がんセンター：手術・抗がん・放射線の統合診療", "豊富な臨床研究・学術成果"],
    },
    image: "/images/hospitals/ewha-mokdong/1.jpg",
    gallery: [
      "/images/hospitals/ewha-mokdong/2.jpg",
      "/images/hospitals/ewha-mokdong/3.jpg",
      "/images/hospitals/ewha-mokdong/4.jpg",
      "/images/hospitals/ewha-mokdong/5.jpg",
    ],
  },

  "korea-guro": {
    slug: "korea-guro",
    badge: "university",
    name: { ko: "고려대학교 구로병원", en: "Korea University Guro Hospital", ru: "Больница Куро Корёского университета", kz: "Корё университеті Куро ауруханасы", zh: "高丽大学九老医院", ja: "高麗大学九老病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "고려대학교 구로병원은 고려대학교 의과대학 부속 병원으로, 암센터를 중심으로 한 종합적인 암 치료 체계를 갖추고 있습니다. 간암·폐암·위암 등 주요 암종에 대해 로봇수술센터와 방사선종양학과를 통한 정밀 치료 체계를 운영합니다. 외국인환자 유치의료기관으로 등록되어 국제진료센터를 운영합니다.",
      en: "Korea University Guro Hospital features a comprehensive cancer treatment system centered around its Cancer Center. It provides precision treatment for liver, lung, and stomach cancers through its Robotic Surgery Center and Radiation Oncology department. Registered as an international patient care facility with a dedicated International Medical Center.",
      ru: "Больница Куро Корёского университета — комплексная система лечения рака печени, лёгких и желудка. Центр роботизированной хирургии и радиотерапии. Зарегистрирована как медучреждение для иностранных пациентов.",
      kz: "Корё университеті Куро ауруханасы — бауыр, өкпе, асқазан обырын емдейтін кешенді жүйе. Робот-хирургия орталығы мен радиотерапия бөлімі бар. Шетелдік науқастарға арналған медициналық мекеме.",
      zh: "高丽大学九老医院以癌症中心为核心，构建了全面的癌症治疗体系。针对肝癌、肺癌、胃癌等主要癌种，通过机器人手术中心和放射肿瘤学科提供精准治疗。设有面向外国患者的国际诊疗中心。",
      ja: "高麗大学九老病院はがんセンターを中心に総合的ながん治療体制を備えています。肝がん・肺がん・胃がんなど主要がん種に対し、ロボット手術センターと放射線腫瘍科による精密治療を提供します。外国人患者向けの国際診療センターを運営しています。",
    },
    website: "https://guro.kumc.or.kr",
    phone: "02-2626-1114",
    address: { ko: "서울특별시 구로구 구로동로 148", en: "148 Gurodong-ro, Guro-gu, Seoul", ru: "Сеул, Куро-гу, Куродон-ро, 148", kz: "Сеул, Куро-гу, Куродон-ро, 148", zh: "首尔特别市九老区九老洞路148号", ja: "ソウル特別市九老区九老洞路148" },
    lat: 37.4919, lng: 126.8845,
    specialties: {
      ko: ["암센터", "종양내과", "혈액종양내과", "간담췌외과", "흉부외과", "위장관외과", "방사선종양학과", "로봇수술센터", "핵의학과"],
      en: ["Cancer Center", "Oncology", "Hematologic Oncology", "Hepatobiliary & Pancreatic Surgery", "Thoracic Surgery", "GI Surgery", "Radiation Oncology", "Robotic Surgery Center", "Nuclear Medicine"],
      ru: ["Онкоцентр", "Онкология", "Гематоонкология", "Гепатобилиарная хирургия", "Торакальная хирургия", "Хирургия ЖКТ", "Радиационная онкология", "Центр роботизированной хирургии", "Ядерная медицина"],
      kz: ["Онкологиялық орталық", "Онкология", "Гематоонкология", "Гепатобилиарлық хирургия", "Кеуде хирургиясы", "Асқазан-ішек хирургиясы", "Радиациялық онкология", "Робот-хирургия орталығы", "Ядролық медицина"],
      zh: ["癌症中心", "肿瘤内科", "血液肿瘤内科", "肝胆胰外科", "胸外科", "胃肠外科", "放射肿瘤科", "机器人手术中心", "核医学科"],
      ja: ["がんセンター", "腫瘍内科", "血液腫瘍内科", "肝胆膵外科", "胸部外科", "消化管外科", "放射線腫瘍科", "ロボット手術センター", "核医学科"],
    },
    highlights: {
      ko: ["간암·폐암·위암 정밀 수술 치료", "로봇수술센터 운영", "국제진료센터 — 외국인환자 전담", "다학제 암 진료 체계 (Tumor Board)", "첨단 방사선치료 (IMRT, SBRT)"],
      en: ["Precision Surgery for Liver, Lung & Stomach Cancer", "Robotic Surgery Center", "International Medical Center for Foreign Patients", "Multidisciplinary Tumor Board", "Advanced Radiation Therapy (IMRT, SBRT)"],
      ru: ["Точная хирургия рака печени, лёгких и желудка", "Центр роботизированной хирургии", "Международный медцентр для иностранных пациентов", "Мультидисциплинарный онкоконсилиум", "Современная лучевая терапия (IMRT, SBRT)"],
      kz: ["Бауыр, өкпе, асқазан обырының дәл хирургиясы", "Робот-хирургия орталығы", "Шетелдік науқастарға арналған халықаралық медцентр", "Мультидисциплинарлық онкоконсилиум", "Заманауи сәулелік ем (IMRT, SBRT)"],
      zh: ["肝癌·肺癌·胃癌精准手术治疗", "机器人手术中心", "国际诊疗中心 — 外国患者专属", "多学科肿瘤会诊（Tumor Board）", "尖端放射治疗（IMRT, SBRT）"],
      ja: ["肝がん・肺がん・胃がんの精密手術治療", "ロボット手術センター運営", "国際診療センター — 外国人患者専門", "多職種がん診療体制（Tumor Board）", "先端放射線治療（IMRT, SBRT）"],
    },
    image: "/images/hospitals/korea-guro/1.jpg",
    gallery: [
      "/images/hospitals/korea-guro/2.jpg",
      "/images/hospitals/korea-guro/3.png",
      "/images/hospitals/korea-guro/4.jpg",
      "/images/hospitals/korea-guro/5.jpg",
    ],
  },

  "severance-sinchon": {
    slug: "severance-sinchon",
    badge: "university",
    name: { ko: "신촌세브란스병원", en: "Sinchon Severance Hospital", ru: "Больница Северанс Синчхон", kz: "Синчон Северанс ауруханасы", zh: "新村世福兰斯医院", ja: "新村セブランス病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "신촌세브란스병원은 연세대학교 의과대학 세브란스병원의 본원으로, 연세암병원을 운영합니다. 12개 주요 암종에 대한 다학제 통합 진료(MDT)를 통해 각 환자에게 최적화된 치료 계획을 제시하며, 양성자치료센터 등 첨단 치료 인프라를 갖추고 있습니다. 신촌면력한방병원과 인접하여 항암 치료 후 한방 면역 관리 협진이 원활합니다.",
      en: "Sinchon Severance Hospital is the main campus of Yonsei University's Severance Hospital, operating the Yonsei Cancer Hospital. Through multidisciplinary team (MDT) consultations across 12 major cancer types, it provides optimized treatment plans for each patient, supported by advanced infrastructure including a Proton Therapy Center. Adjacent to Immune Hospital Sinchon for seamless post-chemo Korean Medicine immune care.",
      ru: "Больница Северанс Синчхон — главный кампус с Онкобольницей Ёнсе. Мультидисциплинарные консилиумы (MDT) по 12 основным типам рака, центр протонной терапии. Рядом с Immune Hospital Синчхон для послехимиотерапевтической поддержки.",
      kz: "Синчон Северанс ауруханасы — Ёнсе университетінің бас кампусы, Ёнсе онкологиялық ауруханасы бар. 12 негізгі рак түрі бойынша мультидисциплинарлық кеңес (MDT), протонды терапия орталығы.",
      zh: "新村世福兰斯医院是延世大学世福兰斯医院本院，运营延世癌症医院。针对12种主要癌症提供多学科会诊(MDT)，配备质子治疗中心等先进治疗设施。毗邻新村 Immune Hospital，化疗后韩方免疫管理协诊便利。",
      ja: "新村セブランス病院は延世大学セブランス病院の本院で、延世がん病院を運営しています。12の主要がん種について多職種統合診療(MDT)を提供し、陽子線治療センターなど先端治療インフラを備えています。新村 Immune Hospital に隣接し、化学療法後の韓方免疫ケア協診がスムーズです。",
    },
    website: "https://sev.severance.healthcare",
    phone: "02-2228-0114",
    address: { ko: "서울특별시 서대문구 연세로 50-1", en: "50-1 Yonsei-ro, Seodaemun-gu, Seoul", ru: "Сеул, Содэмун-гу, Ёнсе-ро, 50-1", kz: "Сеул, Содэмун-гу, Ёнсе-ро, 50-1", zh: "首尔特别市西大门区延世路50-1号", ja: "ソウル特別市西大門区延世路50-1" },
    lat: 37.5622, lng: 126.9410,
    specialties: {
      ko: ["연세암병원", "종양내과", "유방외과", "간담췌외과", "대장항문외과", "흉부외과", "방사선종양학과", "핵의학과", "양성자치료센터"],
      en: ["Yonsei Cancer Hospital", "Oncology", "Breast Surgery", "Hepatobiliary & Pancreatic Surgery", "Colorectal Surgery", "Thoracic Surgery", "Radiation Oncology", "Nuclear Medicine", "Proton Therapy Center"],
      ru: ["Онкобольница Ёнсе", "Онкология", "Маммология", "Гепатобилиарная хирургия", "Колоректальная хирургия", "Торакальная хирургия", "Радиационная онкология", "Ядерная медицина", "Центр протонной терапии"],
      kz: ["Ёнсе онкологиялық ауруханасы", "Онкология", "Сүт безі хирургиясы", "Гепатобилиарлық хирургия", "Колоректальды хирургия", "Кеуде хирургиясы", "Радиациялық онкология", "Ядролық медицина", "Протонды терапия орталығы"],
      zh: ["延世癌症医院", "肿瘤内科", "乳腺外科", "肝胆胰外科", "大肠肛门外科", "胸外科", "放射肿瘤科", "核医学科", "质子治疗中心"],
      ja: ["延世がん病院", "腫瘍内科", "乳腺外科", "肝胆膵外科", "大腸肛門外科", "胸部外科", "放射線腫瘍科", "核医学科", "陽子線治療センター"],
    },
    highlights: {
      ko: ["연세암병원 — 12개 암종 다학제 통합 진료", "다학제 통합 진료 (MDT) 운영", "양성자치료센터 보유", "신촌면력한방병원 인접 — 양·한방 협진", "JCI 인증 — 국제 의료 품질 기준 충족", "외국인환자 전담 국제진료센터"],
      en: ["Yonsei Cancer Hospital — MDT Care Across 12 Cancer Types", "Multidisciplinary Team (MDT) Consultations", "Proton Therapy Center", "Adjacent to Immune Hospital Sinchon — East-West Cooperation", "JCI Accredited — International Quality Standards", "International Patient Center"],
      ru: ["Онкобольница Ёнсе — MDT-помощь по 12 типам рака", "Мультидисциплинарные консилиумы (MDT)", "Центр протонной терапии", "Рядом с Immune Hospital Синчхон — сотрудничество", "Аккредитация JCI — международные стандарты качества", "Международный центр для пациентов"],
      kz: ["Ёнсе онкологиялық ауруханасы — 12 рак түрі бойынша MDT ем", "Мультидисциплинарлық кеңес (MDT)", "Протонды терапия орталығы", "Immune Hospital Синчонға жақын — бірлескен ем", "JCI аккредитациясы — халықаралық сапа стандарттары", "Науқастарға арналған халықаралық орталық"],
      zh: ["延世癌症医院 — 12种癌症多学科综合诊疗", "多学科会诊（MDT）运营", "配备质子治疗中心", "毗邻新村 Immune Hospital — 中西医协诊", "JCI认证 — 符合国际医疗质量标准", "外国患者专属国际诊疗中心"],
      ja: ["延世がん病院 — 12がん種の多職種統合診療", "多職種統合診療（MDT）運営", "陽子線治療センター保有", "新村 Immune Hospital に隣接 — 洋韓方協診", "JCI認証 — 国際医療品質基準を充足", "外国人患者専門の国際診療センター"],
    },
    image: "/images/hospitals/severance-sinchon/1.jpg",
    gallery: [
      "/images/hospitals/severance-sinchon/2.jpg",
      "/images/hospitals/severance-sinchon/3.webp",
      "/images/hospitals/severance-sinchon/4.jpg",
      "/images/hospitals/severance-sinchon/5.jpg",
    ],
  },
};

export function getPartnerHospital(slug) {
  return PARTNER_HOSPITALS[slug] || null;
}

// next.config.js redirects() 가 /hospitals/immune 로 영구이동시키는 지점 slug.
// URL 을 만들어내는 쪽(사이트맵 등)이 이걸 쓰면 「리디렉션되는 URL 을 사이트맵에 광고」
// 하게 된다 — 2026-07 GSC «리디렉션이 포함된 페이지» 의 원인. 두 목록은 같이 움직여야 함
// (어긋나면 check:content §35 가 잡는다).
export const REDIRECTED_PARTNER_SLUGS = [
  "immunehospital-magok",
  "immunehospital-sinchon",
  "immunehospital-gwangmyeong",
  "immunehospital-seongdong",
];

// 피벗 때 비운 옛 한방 프로그램 slug — next.config.js 가 /specialties/korean-medicine 으로
// 영구이동시킨다. 지금은 treatments 테이블이 비어 사이트맵에 안 실리지만, 시드 스크립트
// (scripts/seed-myeonryeok.cjs)나 백업 복원으로 행이 되살아나면 곧바로 「리디렉션 URL 광고」가
// 재현된다(독립 리뷰 지적) → 사이트맵이 이 목록을 항상 걸러낸다.
export const REDIRECTED_TREATMENT_SLUGS = [
  "immune-boost-program",
  "pediatric-growth-immune-program",
  "wellness-detox-body-rebalance",
  "anti-aging-herbal-therapy",
  "fertility-support-program",
  "postpartum-recovery-program",
];

/** 실제로 200 을 내는 제휴 병원 slug (영구이동 대상 제외) */
export function getAllPartnerSlugs() {
  return Object.keys(PARTNER_HOSPITALS).filter((s) => !REDIRECTED_PARTNER_SLUGS.includes(s));
}

export function getAllPartnerHospitals() {
  return Object.values(PARTNER_HOSPITALS);
}

/**
 * Convert partner hospital data into the format HospitalDetailLegacyClient expects.
 * The `_i18n` field carries raw multilingual data so the client can re-resolve on lang change.
 */
export function convertPartnerToInitialData(partner) {
  if (!partner) return null;
  const l = (obj) => obj?.["en"] || obj?.["ko"] || "";
  const lArr = (obj) => {
    if (!obj) return [];
    return obj["en"] || obj["ko"] || [];
  };

  return {
    id: partner.slug,
    slug: partner.slug,
    name: l(partner.name),
    description: l(partner.description),
    location: l(partner.address),
    location_kr: partner.address?.ko || "",
    location_en: partner.address?.en || "",
    address_detail: "",
    latitude: partner.lat || null,
    longitude: partner.lng || null,
    // image = 메인 썸네일(1.jpg), gallery = 서브 이미지(2~5.jpg) — 폴더 구조: /images/hospitals/<slug>/N.jpg
    images: [partner.image, ...(partner.gallery || [])].filter(Boolean),
    thumbnail_image: partner.image || null,
    gallery_images: partner.gallery || [],
    specialties: lArr(partner.specialties),
    website: partner.website || null,
    is_partner: true,
    rating: null,
    reviews_count: 0,
    tags: [l(partner.type)],
    doctor_count: partner.doctorCount || null,
    doctor_profile: null,
    operating_hours: null,
    certifications: partner.certifications || [],
    medical_equipment: [],
    insurance_accepted: false,
    supported_languages: [],
    amenities: [],
    external_ratings: {
      phone: partner.phone || null,
      website: partner.website || null,
      google_reviews: [],
    },
    // Raw i18n data for client-side re-resolution on language change
    _i18n: {
      name: partner.name,
      description: partner.description,
      address: partner.address,
      specialties: partner.specialties,
      highlights: partner.highlights,
      type: partner.type,
      bedCount: partner.bedCount || null,
      doctorCount: partner.doctorCount || null,
    },
  };
}
