/**
 * Immune Hospital (면력한방병원) — 공식 정보
 *
 * 출처: https://immunehospital.com/ (2026-04-20 정밀 분석)
 * 한방 면역치료 전문 의료기관 / healwith 직영 파트너
 */

export const IMMUNE_HOSPITAL = {
  slug: "immunehospital",
  officialName: {
    ko: "면력한방병원",
    en: "Immune Hospital",
    ru: "Иммунная Клиника",
    kz: "Иммундық клиника",
    zh: "免疫医院",
    ja: "免疫病院",
  },
  tagline: {
    ko: "Care You Need, Care You Trust",
    en: "Care You Need, Care You Trust",
    ru: "Забота, в которой вы нуждаетесь",
    kz: "Сізге қажетті күтім",
    zh: "您所需的照护，您能信赖的照护",
    ja: "必要なケア、信頼できるケア",
  },
  subtagline: {
    ko: "건강한 변화를 향한 여정, 지금 면력에서 시작하세요",
    en: "A journey to healthy change — starting now.",
    ru: "Путь к здоровым переменам — начните его сейчас.",
    kz: "Салауатты өзгеріске апарар жол — қазір бастаңыз.",
    zh: "迈向健康改变的旅程，现在就从这里开始。",
    ja: "健やかな変化への旅を、今ここから始めましょう。",
  },

  representative: { ko: "황이준", en: "Hwang Yi-jun" },
  foundedYear: 2017,
  mainPhone: "1588-2915",
  cumulativeCases: "50,000+",
  cumulativeAsOf: "2024-11-06",

  /* 🔴 2026-07-29 — 화면에 박혀 있던 숫자 두 개가 **병원이 공개한 값과 달랐다.**
     화면엔 「환자 만족도 98% · 전담 의료진 7+」이라 적고, 바로 밑에
     「환자 만족도는 면력한방병원 자체 조사 결과입니다(2024.11.06 · 전지점)」라는 출처를 달아 뒀다.
     그런데 병원이 그 조사 결과로 공개한 값은 **93.5%** 다 — 출처를 병원에 걸어 두고 숫자는
     우리가 올려 적은 셈이라, 단순 오타보다 나쁘다.
     전담 의료진도 병원은 **19명**이라고 쓰는데 우리는 7+ 로 낮춰 적고 있었다.

     출처(2026-07-29 직접 열어 확인):
       · https://immunehospital.com/ 및 /pages/cancer/home.php
         → 「만족도 93.5%, 전담 의료진 19명이 함께하는 양·한방…」 · `data-count="93.5"` · `data-count="19"`
         → 만족도 기준일 표기 「2024. 11. 06 기준, 전지점 조사결과」
       · /pages/hospital/about.php → 「29명의 의료진」(전체 인원. 화면 라벨이 «전담 의료진»이라 19를 쓴다)
     ⚠️ 이 값들은 **병원이 바꾸면 같이 바꿔야 한다.** 화면에 직접 적지 말고 여기만 고쳐라
        (`ImmuneHospitalClient.jsx` 가 여기서 읽는다 · `immuneHospitalInfo.test.ts` 가 지킨다). */
  satisfactionRate: "93.5%",
  satisfactionAsOf: "2024-11-06",
  dedicatedDoctors: "19",

  // ===== 4개 지점 =====
  branches: [
    // ⚠️ 지점 표기는 「강서점」으로 통일한다(PO 지시 2026-07-22). 예전엔 화면마다
    //    「강서점」/「마곡점」이 섞여 같은 지점이 두 곳처럼 보였다(DB 도 name=강서점·name_ko=마곡점).
    //    행정동(마곡)은 주소에만 남기고, 지점 이름은 강서점 하나로.
    {
      id: "magok",
      slug: "immunehospital-magok",   // DB(hospitals.slug) 조인용 — 구글 리뷰를 여기서 가져온다
      photo: "/images/hospitals/immunehospital-magok/1.jpg",
      name: {
        ko: "강서점 (본원)",
        en: "Gangseo (Main Branch)",
        kz: "Кансо (бас филиал)",
        zh: "江西店（总院）",
        ja: "江西店（本院）",
        ru: "Кансо (главный офис)",
      },
      address: {
        ko: "서울 강서구 마곡중앙6로 93 열린프라자 6층, 7층, 10층",
        en: "Open Plaza 6F/7F/10F, 93 Magokjungang 6-ro, Gangseo-gu, Seoul",
        ru: "Сеул, Кансо-гу, Магокчунан 6-ро, 93, Open Plaza, 6, 7, 10 этажи",
        kz: "Сеул, Кансо-гу, Магокчунан 6-ро, 93, Open Plaza, 6, 7, 10 қабат",
        zh: "首尔市江西区麻谷中央6路93号 Open Plaza 6层、7层、10层",
        ja: "ソウル市江西区麻谷中央6路93 Open Plaza 6階・7階・10階",
      },
      phone: "1588-2915",
      hours: {
        weekday: {
          ko: "평일 09:00-20:00 (점심 13:00-14:00, 야간진료)",
          en: "Mon-Fri 09:00-20:00 (lunch 13:00-14:00, evening clinic)",
          ru: "Пн-Пт 09:00-20:00 (обед 13:00-14:00, вечерние часы приёма)",
          kz: "Дс-Жм 09:00-20:00 (түскі үзіліс 13:00-14:00, кешкі қабылдау)",
          zh: "周一至周五 09:00-20:00（午休 13:00-14:00，夜间门诊）",
          ja: "月〜金 09:00-20:00（昼休み 13:00-14:00、夜間診療）",
        },
        weekend: {
          ko: "토·일·공휴일 09:00-15:00",
          en: "Sat/Sun/Holidays 09:00-15:00",
          ru: "Сб/Вс/праздники 09:00-15:00",
          kz: "Сб/Жс/мереке күндері 09:00-15:00",
          zh: "周六/周日/公休日 09:00-15:00",
          ja: "土・日・祝 09:00-15:00",
        },
      },
      parking: {
        ko: "입·퇴원 3시간 무료, 외래 3시간 무료 (초과 시 유료)",
        en: "3 hours free for admission/discharge & outpatient. Paid beyond.",
        ru: "3 часа бесплатно при госпитализации/выписке и амбулаторном визите (далее платно)",
        kz: "Жатқызу/шығару және амбулаторлық қабылдау кезінде 3 сағат тегін (одан кейін ақылы)",
        zh: "住院/出院及门诊3小时免费（超时收费）",
        ja: "入退院・外来とも3時間無料（超過分は有料）",
      },
      nearby: {
        ko: "이대서울병원 도보 1분",
        en: "1-min walk from Ewha Womans University Seoul Hospital",
        ru: "1 минута пешком от больницы Ewha Womans University Seoul",
        kz: "Ewha Womans University Seoul ауруханасынан жаяу 1 минут",
        zh: "距梨花女子大学首尔医院步行1分钟",
        ja: "梨花女子大学ソウル病院から徒歩1分",
      },
      director: {
        name: { ko: "황이준 대표원장", en: "Dr. Hwang I-jun", ru: "Д-р Хван Иджун", kz: "Д-р Хван Иджун", zh: "黄伊俊 代表院长", ja: "黄伊俊 代表院長" },
        photo: "/immune/doctor/gangeo-dr-hwang-ijun.png",
      },
      url: "https://immunehospital.com/",
    },
    // ⚠️ 신촌·광명은 예전에 {id,name,url} 뿐이라 화면 카드가 텅 비어 있었다(2026-07-22 PO 발견).
    //    주소·전화·시간은 src/lib/data/immuneBranches.js 에 멀쩡히 있었는데 화면은 이 파일만 봤다
    //    = 같은 데이터가 두 파일에 나뉜 채 빈약한 쪽을 렌더. 여기로 합쳐 이 파일을 SoR 로 둔다.
    {
      id: "sinchon",
      slug: "immunehospital-sinchon",
      photo: "/images/hospitals/immunehospital-sinchon/1.jpg",
      name: { ko: "신촌점", en: "Sinchon", ru: "Синчхон" },
      address: {
        ko: "서울 서대문구 연세로 12, 8층~14층",
        en: "8F-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul",
        kz: "Сеул, Содэмун-гу, Ёнсе-ро, 12, 8-14 қабат",
        zh: "首尔市西大门区延世路12号 8层至14层",
        ja: "ソウル市西大門区延世路12 8階〜14階",
        ru: "Сеул, Содэмун-гу, Ёнсе-ро, 12, 8-14 этажи",
      },
      phone: "1588-2915",
      hours: {
        weekday: {
          ko: "평일 09:00-20:00 (점심 13:00-14:00, 야간진료)",
          en: "Mon-Fri 09:00-20:00 (lunch 13:00-14:00, evening clinic)",
          ru: "Пн-Пт 09:00-20:00 (обед 13:00-14:00, вечерние часы приёма)",
          kz: "Дс-Жм 09:00-20:00 (түскі үзіліс 13:00-14:00, кешкі қабылдау)",
          zh: "周一至周五 09:00-20:00（午休 13:00-14:00，夜间门诊）",
          ja: "月〜金 09:00-20:00（昼休み 13:00-14:00、夜間診療）",
        },
        weekend: { ko: "토·일·공휴일 09:00-15:00", en: "Sat/Sun/Holidays 09:00-15:00", ru: "Сб/Вс/праздники 09:00-15:00", kz: "Сб/Жс/мереке күндері 09:00-15:00", zh: "周六/周日/公休日 09:00-15:00", ja: "土・日・祝 09:00-15:00" },
      },
      nearby: { ko: "신촌세브란스병원 인근", en: "Near Severance Hospital, Sinchon", ru: "Рядом с больницей Severance, Синчхон", kz: "Severance ауруханасының жанында, Синчхон", zh: "邻近新村Severance医院", ja: "新村セブランス病院の近く" },
      director: {
        name: { ko: "유형진 대표원장", en: "Dr. Yu Hyung-jin", ru: "Д-р Ю Хёнджин", kz: "Д-р Ю Хёнджин", zh: "柳炯进 代表院长", ja: "柳炯進 代表院長" },
        photo: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png",
      },
      url: "https://sc.immunehospital.com/",
    },
    {
      id: "gwangmyeong",
      slug: "immunehospital-gwangmyeong",
      photo: "/images/hospitals/immunehospital-gwangmyeong/1.jpg",
      name: { ko: "광명점", en: "Gwangmyeong", ru: "Кванмён" },
      address: {
        ko: "경기 광명시 철산로 16, 트라이앵글빌딩 6층·8층~11층",
        en: "Triangle Building 6F, 8F-11F, 16 Cheolsan-ro, Gwangmyeong-si, Gyeonggi-do",
        kz: "Кёнги-до, Кванмён-си, Чхольсан-ро, 16, Triangle Building, 6, 8-11 қабат",
        zh: "京畿道光明市铁山路16号 Triangle大厦 6层、8层至11层",
        ja: "京畿道光明市鉄山路16 トライアングルビル 6階・8階〜11階",
        ru: "Кёнги-до, Кванмён-си, Чхольсан-ро, 16, Трайэнгл билдинг, 6, 8-11 этажи",
      },
      phone: "1588-2915",
      hours: {
        weekday: {
          ko: "평일 09:00-20:00 (점심 13:00-14:00, 야간진료)",
          en: "Mon-Fri 09:00-20:00 (lunch 13:00-14:00, evening clinic)",
          ru: "Пн-Пт 09:00-20:00 (обед 13:00-14:00, вечерние часы приёма)",
          kz: "Дс-Жм 09:00-20:00 (түскі үзіліс 13:00-14:00, кешкі қабылдау)",
          zh: "周一至周五 09:00-20:00（午休 13:00-14:00，夜间门诊）",
          ja: "月〜金 09:00-20:00（昼休み 13:00-14:00、夜間診療）",
        },
        weekend: { ko: "토·일·공휴일 09:00-15:00", en: "Sat/Sun/Holidays 09:00-15:00", ru: "Сб/Вс/праздники 09:00-15:00", kz: "Сб/Жс/мереке күндері 09:00-15:00", zh: "周六/周日/公休日 09:00-15:00", ja: "土・日・祝 09:00-15:00" },
      },
      director: {
        name: { ko: "배길준 대표원장", en: "Dr. Bae Gil-jun", ru: "Д-р Пэ Гильчжун", kz: "Д-р Пэ Гильчжун", zh: "裴吉俊 代表院长", ja: "裴吉俊 代表院長" },
        photo: "/immune/doctor/gwangmyeong-dr-bae-giljun.png",
      },
      url: "https://km.immunehospital.com/",
    },
    {
      id: "seongdong",
      // ⚠️ 성동점은 DB(hospitals)에 행이 없다 → 구글 리뷰도 없음. 카드는 정보만 뜬다.
      slug: "immunehospital-seongdong",
      photo: "/images/hospitals/immunehospital-seongdong/1.jpg",
      name: { ko: "성동점", en: "Seongdong", ru: "Сондон" },
      address: {
        ko: "서울 성동구 천호대로 320, 2~7층, B101호 (용답동, 장안빌딩)",
        en: "2F-7F, B101, 320 Cheonho-daero, Seongdong-gu, Seoul (Jangan Building)",
        kz: "Сеул, Сондон-гу, Чхонхо-дэро, 320, 2-7 қабат, B101 (Чанган ғимараты)",
        zh: "首尔市城东区千户大路320号 2至7层、B101（长安大厦）",
        ja: "ソウル市城東区千戸大路320 2〜7階・B101（長安ビル）",
        ru: "Сеул, Сондон-гу, Чхонхо-дэро, 320, 2-7 этажи, B101 (здание Чанган)",
      },
      phone: "1588-2915",
      hours: {
        weekday: {
          ko: "평일 09:00-20:00 (점심 13:00-14:00, 야간진료)",
          en: "Mon-Fri 09:00-20:00 (lunch 13:00-14:00, evening clinic)",
          ru: "Пн-Пт 09:00-20:00 (обед 13:00-14:00, вечерние часы приёма)",
          kz: "Дс-Жм 09:00-20:00 (түскі үзіліс 13:00-14:00, кешкі қабылдау)",
          zh: "周一至周五 09:00-20:00（午休 13:00-14:00，夜间门诊）",
          ja: "月〜金 09:00-20:00（昼休み 13:00-14:00、夜間診療）",
        },
        weekend: {
          ko: "토·일·공휴일 09:00-15:00",
          en: "Sat/Sun/Holidays 09:00-15:00",
          ru: "Сб/Вс/праздники 09:00-15:00",
          kz: "Сб/Жс/мереке күндері 09:00-15:00",
          zh: "周六/周日/公休日 09:00-15:00",
          ja: "土・日・祝 09:00-15:00",
        },
      },
      director: {
        name: { ko: "강주안 대표원장", en: "Dr. Kang Ju-an", ru: "Д-р Кан Джуан", kz: "Д-р Кан Джуан", zh: "姜周安 代表院长", ja: "姜周安 代表院長" },
        photo: "/immune/doctor/seongdong-dr-kang-juan.png",
      },
      url: "https://sd.immunehospital.com/",
    },
  ],

  // ===== 3개 센터 =====
  centers: [
    {
      id: "cancer",
      name: { ko: "암면역센터", en: "Cancer Immunity Center", ru: "Центр иммунотерапии рака", kz: "Обыр иммунитеті орталығы", zh: "癌症免疫中心", ja: "がん免疫センター" },
      description: {
        ko: "주요 암종 수술 전후 한방 면역 통합 케어",
        en: "Integrated Korean Medicine immune care around cancer surgery",
        ru: "Интегративный иммунный уход средствами корейской медицины до и после операции при основных видах рака",
        kz: "Негізгі обыр түрлерінде отаға дейін және кейін корей медицинасының кешенді иммундық күтімі",
        zh: "针对主要癌种手术前后的韩医免疫综合照护",
        ja: "主要ながん種の手術前後における韓方免疫統合ケア",
      },
    },
    {
      id: "neuro",
      name: { ko: "신경면역센터", en: "Neuro-Immunity Center", ru: "Центр нейроиммунологии", kz: "Нейроиммунитет орталығы", zh: "神经免疫中心", ja: "神経免疫センター" },
      description: {
        ko: "대상포진·안면마비·줄기세포 치료",
        en: "Shingles, facial paralysis, stem cell therapy",
        ru: "Опоясывающий лишай, паралич лицевого нерва, терапия стволовыми клетками",
        kz: "Белдемелі теміреткі, бет жүйкесінің салдануы, дің жасушаларымен емдеу",
        zh: "带状疱疹、面瘫、干细胞治疗",
        ja: "帯状疱疹・顔面神経麻痺・幹細胞治療",
      },
    },
    {
      id: "rehab",
      name: { ko: "재활센터", en: "Rehabilitation Center", ru: "Реабилитационный центр", kz: "Оңалту орталығы", zh: "康复中心", ja: "リハビリセンター" },
      description: {
        ko: "부인과 수술 후·교통사고 후유증·수술 후 재활",
        en: "Post-gynecological surgery, traffic-accident, post-surgery rehab",
        ru: "Реабилитация после гинекологических операций, последствий ДТП и других операций",
        kz: "Гинекологиялық отадан кейінгі, жол апатынан кейінгі және басқа оталардан кейінгі оңалту",
        zh: "妇科手术后、交通事故后遗症、术后康复",
        ja: "婦人科手術後・交通事故後遺症・手術後のリハビリ",
      },
    },
  ],

  // ===== 핵심 치료 철학: ITCRN 5원칙  (I·T·C·R·N = 다섯 원칙의 영문 머리글자) =====
  // Immunity · Temperature · Circulation · Resistibility · Nutrition
  principles: [
    {
      letter: "I",
      id: "immunity",
      name: { ko: "면역", en: "Immunity", ru: "Иммунитет", kz: "Иммунитет", zh: "免疫", ja: "免疫" },
      description: {
        ko: "세포·체액 면역 복합 치료로 면역력 회복",
        en: "Cellular & humoral immunity treatments to restore immune function",
        ru: "Комплексная терапия клеточного и гуморального иммунитета для восстановления защитных сил",
        kz: "Иммундық қызметті қалпына келтіру үшін жасушалық және гуморальдық иммунитетті кешенді емдеу",
        zh: "通过细胞免疫与体液免疫的综合治疗恢复免疫力",
        ja: "細胞性・液性免疫の複合治療で免疫力を回復",
      },
    },
    {
      letter: "T",
      id: "temperature",
      name: { ko: "체온", en: "Temperature", ru: "Температура", kz: "Дене қызуы", zh: "体温", ja: "体温" },
      description: {
        ko: "고주파·적외선 온열로 심부 체온 상승",
        en: "High-frequency & infrared hyperthermia to raise core body temperature",
        ru: "Высокочастотная и инфракрасная гипертермия для повышения глубинной температуры тела",
        kz: "Дененің ішкі қызуын көтеру үшін жоғары жиілікті және инфрақызыл гипертермия",
        zh: "通过高频、红外线温热提升深部体温",
        ja: "高周波・赤外線温熱で深部体温を上昇",
      },
    },
    {
      letter: "C",
      id: "circulation",
      name: { ko: "순환", en: "Circulation", ru: "Кровообращение", kz: "Қан айналымы", zh: "循环", ja: "循環" },
      description: {
        ko: "림프도수·침전기물리치료로 혈액·림프 순환 개선",
        en: "Lymphatic drainage & electrotherapy to improve blood/lymph flow",
        ru: "Лимфодренаж и иглоэлектрофизиотерапия для улучшения крово- и лимфотока",
        kz: "Қан және лимфа айналымын жақсарту үшін лимфодренаж және ине-электрофизиотерапия",
        zh: "通过淋巴引流、电针物理治疗改善血液及淋巴循环",
        ja: "リンパドレナージ・鍼電気物理療法で血液・リンパの循環を改善",
      },
    },
    {
      letter: "R",
      id: "resistibility",
      name: { ko: "저항성", en: "Resistibility", ru: "Сопротивляемость", kz: "Төзімділік", zh: "抵抗力", ja: "抵抗力" },
      description: {
        ko: "항산화·항노화 요법으로 세포 저항력 강화",
        en: "Antioxidant & anti-aging therapy to strengthen cellular resistance",
        ru: "Антиоксидантная и антивозрастная терапия для укрепления клеточной устойчивости",
        kz: "Жасушалардың төзімділігін арттыру үшін антиоксиданттық және қартаюға қарсы терапия",
        zh: "通过抗氧化、抗衰老疗法增强细胞抵抗力",
        ja: "抗酸化・抗加齢療法で細胞の抵抗力を強化",
      },
    },
    {
      letter: "N",
      id: "nutrition",
      name: { ko: "영양", en: "Nutrition", ru: "Питание", kz: "Тамақтану", zh: "营养", ja: "栄養" },
      description: {
        ko: "임상 영양사 + 전담 셰프의 맞춤 치료식",
        en: "Custom therapeutic meals by clinical dietitian & in-house chef",
        ru: "Индивидуальное лечебное питание от клинического диетолога и штатного шеф-повара",
        kz: "Клиникалық диетолог пен арнайы аспаздың жеке емдік тағамы",
        zh: "临床营养师与专属厨师的定制治疗餐",
        ja: "臨床栄養士と専属シェフによるオーダーメイド治療食",
      },
    },
  ],

  // ===== 구체적 치료법 =====
  treatments: {
    cellular: {
      category: { ko: "세포면역", en: "Cellular Immunity", ru: "Клеточный иммунитет", kz: "Жасушалық иммунитет", zh: "细胞免疫", ja: "細胞性免疫" },
      items: [
        { ko: "싸이모신 알파1 요법", en: "Thymosin α1 therapy", ru: "Терапия Тимозин-α1", kz: "Тимозин α1 терапиясы", zh: "胸腺肽α1疗法", ja: "サイモシンα1療法" },
        { ko: "미슬토 요법", en: "Mistletoe therapy", ru: "Терапия Омелой", kz: "Омела терапиясы", zh: "槲寄生疗法", ja: "ミスルトー（ヤドリギ）療法" },
        { ko: "이뮤노시아닌", en: "Immunocyanin", ru: "Иммуноцианин", kz: "Иммуноцианин", zh: "免疫蓝蛋白 (Immunocyanin)", ja: "イムノシアニン" },
        { ko: "NK세포 치료제", en: "NK cell therapy", ru: "НК-клеточная Терапия", kz: "NK жасушалық терапия", zh: "NK细胞疗法", ja: "NK細胞療法" },
        { ko: "항암면역증강제", en: "Immune-enhancing adjuvants", ru: "Иммуностимулятор при Онкологии", kz: "Онкологиядағы иммунды күшейткіш", zh: "抗癌免疫增强剂", ja: "抗がん免疫増強剤" },
      ],
    },
    humoral: {
      category: { ko: "체액면역", en: "Humoral Immunity", ru: "Гуморальный иммунитет", kz: "Гуморальдық иммунитет", zh: "体液免疫", ja: "液性免疫" },
      items: [
        { ko: "글루타민 주사", en: "Glutamine injection", ru: "Инъекция Глутамина", kz: "Глутамин инъекциясы", zh: "谷氨酰胺注射", ja: "グルタミン注射" },
        { ko: "면역플러스 (황기 부정단 처방)", en: "ImmunePlus (Hwanggi Bujeongdan formula)", ru: "Иммун Плюс (рецепт Хванги Пуджондан)", kz: "Иммун Плюс (Хванги Пуджондан рецепті)", zh: "免疫加强方（黄芪扶正丹）", ja: "免疫プラス（黄耆扶正丹）" },
      ],
    },
    thermal: {
      category: { ko: "온열 치료", en: "Thermal Therapy", ru: "Термотерапия", kz: "Жылу терапиясы", zh: "温热治疗", ja: "温熱治療" },
      items: [
        { ko: "고주파 온열암치료", en: "High-frequency hyperthermia", ru: "Высокочастотная Гипертермия", kz: "Жоғары жиілікті гипертермия", zh: "高频热疗", ja: "高周波温熱療法" },
        { ko: "적외선 온열요법", en: "Infrared hyperthermia", ru: "Инфракрасная Термотерапия", kz: "Инфрақызыл термотерапия", zh: "红外线温热疗法", ja: "赤外線温熱療法" },
      ],
    },
    supportive: {
      category: { ko: "순환·보조", en: "Circulatory & Supportive", ru: "Кровообращение и поддержка", kz: "Қан айналымы және қосымша ем", zh: "循环·辅助", ja: "循環・補助" },
      items: [
        { ko: "림프 도수치료", en: "Manual lymphatic drainage", ru: "Лимфодренажный Массаж", kz: "Лимфодренаж массажы", zh: "淋巴引流按摩", ja: "リンパドレナージマッサージ" },
        { ko: "침전기물리치료", en: "Electro-acupuncture physical therapy", ru: "Иглоэлектрофизиотерапия", kz: "Ине-электрофизиотерапия (ICT)", zh: "电针物理治疗 (ICT)", ja: "鍼電気物理療法（ICT）" },
      ],
    },
    nutritional: {
      category: { ko: "영양 요법", en: "Nutritional Therapy", ru: "Нутритивная терапия", kz: "Тамақтану терапиясы", zh: "营养疗法", ja: "栄養療法" },
      items: [
        { ko: "셀레늄 요법", en: "Selenium therapy", ru: "Терапия Селеном", kz: "Селен терапиясы", zh: "硒疗法", ja: "セレン療法" },
        { ko: "글루타치온 요법", en: "Glutathione therapy", ru: "Терапия Глутатионом", kz: "Глутатион терапиясы", zh: "谷胱甘肽疗法", ja: "グルタチオン療法" },
        { ko: "고농도 비타민 요법", en: "High-dose vitamin therapy", ru: "Высокодозная Витаминная Терапия", kz: "Жоғары дозалы дәрумен терапиясы", zh: "高剂量维生素疗法", ja: "高濃度ビタミン療法" },
      ],
    },
  },

  // ===== 암종별 특화 =====
  cancerPrograms: [
    {
      id: "female",
      name: { ko: "유방·자궁·난소암", en: "Breast / Uterine / Ovarian", ru: "Рак груди / матки / яичников", kz: "Сүт безі / жатыр / аналық без обыры", zh: "乳腺癌·子宫癌·卵巢癌", ja: "乳がん・子宮がん・卵巣がん" },
      focus: {
        ko: "수술부위 관리(배액관·상처·일상·자세) + 기력 회복 + 맞춤 30여 종 면역 회복 선택식 + 셰프 라이브 코너",
        en: "Surgical site care (drain, wound, daily activity, posture) + strength recovery + 30+ custom immune meals + chef live corner",
        ru: "Уход за зоной операции (дренаж, рана, повседневная активность, осанка) + восстановление сил + 30+ индивидуальных блюд для восстановления иммунитета + живая кухня шефа",
        kz: "Ота аймағын күту (дренаж, жара, күнделікті белсенділік, дене қалпы) + әл-қуатты қалпына келтіру + иммунитетті қалпына келтіретін 30+ жеке таңдау тағамы + аспаздың тікелей дайындау бұрышы",
        zh: "手术部位管理（引流管、伤口、日常活动、姿势）+ 体力恢复 + 30+种定制免疫恢复自选餐 + 厨师现场烹饪区",
        ja: "手術部位の管理（ドレーン・創部・日常動作・姿勢）＋体力回復＋30+種のオーダーメイド免疫回復選択食＋シェフのライブキッチン",
      },
    },
    {
      id: "digest",
      name: { ko: "대장·위암", en: "Colorectal / Gastric", ru: "Рак толстой кишки / желудка", kz: "Тоқ ішек / асқазан обыры", zh: "结直肠癌·胃癌", ja: "大腸がん・胃がん" },
      focus: {
        ko: "수술 후 8대 증상(고열·문합부 누출·장기능 변화 등) 관리 + 장루 관리 + 저잔사식·위절제식 맞춤 식이",
        en: "Post-op 8-symptom management (fever, anastomotic leak, bowel changes) + ostomy care + low-residue/post-gastrectomy meal plans",
        ru: "Контроль 8 основных послеоперационных симптомов (лихорадка, несостоятельность анастомоза, изменения функции кишечника и др.) + уход за стомой + индивидуальная низкошлаковая диета и диета после резекции желудка",
        kz: "Отадан кейінгі 8 негізгі симптомды (жоғары қызу, анастомоз ағуы, ішек қызметінің өзгеруі және т.б.) бақылау + стоманы күту + аз қалдықты және асқазан резекциясынан кейінгі жеке диета",
        zh: "术后8大症状（高热、吻合口漏、肠功能变化等）管理 + 造口护理 + 低渣饮食、胃切除饮食定制",
        ja: "術後8大症状（高熱・縫合不全・腸機能の変化など）の管理＋ストーマケア＋低残渣食・胃切除後食のオーダーメイド食事",
      },
    },
    {
      id: "liver",
      name: { ko: "간·담도·췌장암", en: "Liver / Biliary / Pancreatic", ru: "Рак печени / желчных путей / поджелудочной железы", kz: "Бауыр / өт жолдары / ұйқы безі обыры", zh: "肝癌·胆道癌·胰腺癌", ja: "肝がん・胆道がん・膵がん" },
      focus: {
        ko: "간수치 정상화·황달·소화기능·영양흡수·체중감소 관리. NK세포 + 고주파 온열 + 항산화 요법 중심",
        en: "Liver enzyme normalization, jaundice, digestive function, nutrient absorption, weight loss. NK cell + hyperthermia + antioxidant therapy",
        ru: "Нормализация печёночных показателей, контроль желтухи, пищеварения, усвоения питательных веществ и потери веса. Основа — НК-клетки + высокочастотная гипертермия + антиоксидантная терапия",
        kz: "Бауыр көрсеткіштерін қалыпқа келтіру, сарғаю, ас қорыту, қоректік заттардың сіңуі және салмақ жоғалтуды бақылау. Негізі — NK-жасушалар + жоғары жиілікті гипертермия + антиоксиданттық терапия",
        zh: "肝功能指标正常化、黄疸、消化功能、营养吸收、体重下降管理。以NK细胞 + 高频热疗 + 抗氧化疗法为主",
        ja: "肝機能値の正常化・黄疸・消化機能・栄養吸収・体重減少の管理。NK細胞＋高周波温熱＋抗酸化療法が中心",
      },
    },
    {
      id: "lung",
      name: { ko: "폐암", en: "Lung", ru: "Рак лёгкого", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" },
      focus: {
        ko: "호흡곤란·기침·가래·흉통·체력저하 관리. 심호흡 훈련·풍선 불기 재활 + 면역 회복 프로그램",
        en: "Dyspnea, cough, sputum, chest pain, fatigue. Deep breathing drills, balloon therapy + immune recovery program",
        ru: "Контроль одышки, кашля, мокроты, боли в груди и упадка сил. Дыхательная гимнастика, реабилитация с надуванием шаров + программа восстановления иммунитета",
        kz: "Ентігу, жөтел, қақырық, кеуде ауыруы және әлсіздікті бақылау. Терең тыныс алу жаттығулары, шар үрлеу оңалтуы + иммунитетті қалпына келтіру бағдарламасы",
        zh: "呼吸困难、咳嗽、痰、胸痛、体力下降管理。深呼吸训练、吹气球康复 + 免疫恢复项目",
        ja: "呼吸困難・咳・痰・胸痛・体力低下の管理。深呼吸訓練・風船吹きリハビリ＋免疫回復プログラム",
      },
    },
    {
      id: "thyroid",
      name: { ko: "갑상선암", en: "Thyroid", ru: "Рак щитовидной железы", kz: "Қалқанша безі обыры", zh: "甲状腺癌", ja: "甲状腺がん" },
      focus: {
        ko: "목소리 변화·저칼슘혈증·호르몬 부족·경부 흉터 관리. ITCRN 5원칙 기반 회복",
        en: "Voice changes, hypocalcemia, hormone deficiency, neck scar care. Recovery via the 5 ITCRN principles",
        ru: "Контроль изменений голоса, гипокальциемии, дефицита гормонов, уход за рубцом на шее. Восстановление на основе 5 принципов ITCRN",
        kz: "Дауыстың өзгеруі, гипокальциемия, гормон жетіспеушілігі, мойындағы тыртықты күту. ITCRN 5 қағидасына негізделген қалпына келу",
        zh: "声音变化、低钙血症、激素不足、颈部疤痕管理。基于ITCRN 5原则的恢复",
        ja: "声の変化・低カルシウム血症・ホルモン不足・頸部の傷跡ケア。ITCRN 5原則に基づく回復",
      },
    },
    {
      id: "etc",
      name: { ko: "기타 암종", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌种", ja: "その他のがん" },
      focus: {
        ko: "각 암종 맞춤 상담 후 프로그램 구성",
        en: "Custom program after consultation for each cancer type",
        ru: "Программа составляется после индивидуальной консультации по каждому виду рака",
        kz: "Әр обыр түрі бойынша жеке кеңестен кейін бағдарлама құрылады",
        zh: "针对各癌种进行定制咨询后制定方案",
        ja: "がん種ごとに個別相談のうえプログラムを構成",
      },
    },
  ],

  // ===== 5단계 프로세스 =====
  process: [
    {
      step: 1,
      phase: { ko: "수술 전 면역관리", en: "Pre-surgery immune care", ru: "Иммунная подготовка до операции", kz: "Отаға дейінгі иммундық дайындық", zh: "术前免疫管理", ja: "手術前の免疫管理" },
      goals: {
        ko: ["체력 강화", "면역력 증진", "감염 예방"],
        en: ["Strength conditioning", "Immune boosting", "Infection prevention"],
        ru: ["Укрепление физических сил", "Повышение иммунитета", "Профилактика инфекций"],
        kz: ["Дене күшін нығайту", "Иммунитетті арттыру", "Инфекцияның алдын алу"],
        zh: ["增强体力", "提升免疫力", "预防感染"],
        ja: ["体力強化", "免疫力向上", "感染予防"],
      },
    },
    {
      step: 2,
      phase: { ko: "수술 후 회복·재활", en: "Post-surgery recovery", ru: "Восстановление и реабилитация после операции", kz: "Отадан кейінгі қалпына келу және оңалту", zh: "术后恢复·康复", ja: "手術後の回復・リハビリ" },
      goals: {
        ko: ["수술 후유증 완화", "체력·면역력 회복", "신체기능 정상화", "감염 관리"],
        en: ["Relieve aftereffects", "Restore strength & immunity", "Normalize function", "Infection control"],
        ru: ["Смягчение последствий операции", "Восстановление сил и иммунитета", "Нормализация функций организма", "Контроль инфекций"],
        kz: ["Ота салдарын жеңілдету", "Күш пен иммунитетті қалпына келтіру", "Дене қызметін қалыпқа келтіру", "Инфекцияны бақылау"],
        zh: ["缓解术后后遗症", "恢复体力与免疫力", "身体机能正常化", "感染管理"],
        ja: ["術後の後遺症の緩和", "体力・免疫力の回復", "身体機能の正常化", "感染管理"],
      },
    },
    {
      step: 3,
      phase: { ko: "항암·방사선 치료 효과 개선", en: "Improve chemo/radiation efficacy", ru: "Повышение эффективности химио- и лучевой терапии", kz: "Химиотерапия мен сәулелік емнің тиімділігін арттыру", zh: "提升化疗·放疗效果", ja: "抗がん剤・放射線治療の効果向上" },
      goals: {
        ko: ["항암치료율 향상", "부작용 감소", "내성 완화", "암성통증 관리", "손상 조직 회복", "면역 정상화"],
        en: ["Improve response", "Reduce side effects", "Reduce resistance", "Pain management", "Tissue recovery", "Immune normalization"],
        ru: ["Повышение ответа на лечение", "Снижение побочных эффектов", "Снижение резистентности", "Контроль боли при раке", "Восстановление повреждённых тканей", "Нормализация иммунитета"],
        kz: ["Емге жауапты арттыру", "Жанама әсерлерді азайту", "Резистенттілікті азайту", "Обыр ауырсынуын бақылау", "Зақымдалған тіндерді қалпына келтіру", "Иммунитетті қалыпқа келтіру"],
        zh: ["提高抗癌治疗有效率", "减少副作用", "缓解耐药性", "癌性疼痛管理", "受损组织恢复", "免疫正常化"],
        ja: ["治療効果の向上", "副作用の軽減", "耐性の緩和", "がん性疼痛の管理", "損傷組織の回復", "免疫の正常化"],
      },
    },
    {
      step: 4,
      phase: { ko: "2차암·전이·재발 관리", en: "Secondary cancer / recurrence", ru: "Контроль вторичного рака, метастазов и рецидива", kz: "Екінші обыр, метастаз және қайталануды бақылау", zh: "二次癌·转移·复发管理", ja: "二次がん・転移・再発の管理" },
      goals: {
        ko: ["면역세포 활성화", "암세포 증식 억제", "미세 잔존 암세포 사멸", "면역 안정화"],
        en: ["Immune cell activation", "Suppress proliferation", "Eliminate residual cells", "Immune stabilization"],
        ru: ["Активация иммунных клеток", "Подавление роста раковых клеток", "Уничтожение остаточных раковых клеток", "Стабилизация иммунитета"],
        kz: ["Иммундық жасушаларды белсендіру", "Ісік жасушаларының көбеюін тежеу", "Қалдық ісік жасушаларын жою", "Иммунитетті тұрақтандыру"],
        zh: ["激活免疫细胞", "抑制癌细胞增殖", "清除微小残留癌细胞", "免疫稳定化"],
        ja: ["免疫細胞の活性化", "がん細胞増殖の抑制", "微小残存がん細胞の死滅", "免疫の安定化"],
      },
    },
    {
      step: 5,
      phase: { ko: "지속적 추적 관찰", en: "Long-term follow-up", ru: "Долгосрочное наблюдение", kz: "Ұзақ мерзімді бақылау", zh: "持续跟踪观察", ja: "継続的な経過観察" },
      goals: {
        ko: ["정기 검진", "증상 모니터링", "생활습관 코칭"],
        en: ["Regular screenings", "Symptom monitoring", "Lifestyle coaching"],
        ru: ["Регулярные обследования", "Мониторинг симптомов", "Коучинг по образу жизни"],
        kz: ["Тұрақты тексерулер", "Симптомдарды бақылау", "Өмір салты бойынша кеңес беру"],
        zh: ["定期检查", "症状监测", "生活习惯指导"],
        ja: ["定期検診", "症状モニタリング", "生活習慣コーチング"],
      },
    },
  ],

  // ===== 심신통합 프로그램 =====
  integrativePrograms: [
    {
      id: "food",
      label: { ko: "셰프 푸드테라피", en: "Chef food therapy", ru: "Фуд-терапия от шефа", kz: "Аспаздың фуд-терапиясы", zh: "厨师食疗", ja: "シェフのフードセラピー" },
      desc: { ko: "2주 1회 전담 셰프와 함께하는 맞춤 치료식 + 라이브 코너", en: "Bi-weekly personalized therapeutic meals with in-house chef", ru: "Раз в две недели — индивидуальное лечебное питание вместе со штатным шеф-поваром + живая кухня", kz: "Екі аптада бір рет арнайы аспазбен бірге жеке емдік тағам + тікелей дайындау бұрышы", zh: "每两周一次与专属厨师共同准备的定制治疗餐 + 现场烹饪区", ja: "2週に1回、専属シェフと作るオーダーメイド治療食＋ライブキッチン" },
    },
    {
      id: "walking",
      label: { ko: "야외 산책", en: "Outdoor walking", ru: "Прогулки на свежем воздухе", kz: "Ашық ауада серуендеу", zh: "户外散步", ja: "屋外ウォーキング" },
      desc: { ko: "평일 오전 강변 산책 버스", en: "Weekday-morning riverside walking shuttle", ru: "По будням утром — автобус на прогулку вдоль реки", kz: "Жұмыс күндері таңертең өзен жағасында серуендеуге автобус", zh: "工作日上午的江边散步巴士", ja: "平日午前の川辺散策バス" },
    },
    {
      id: "exercise",
      label: { ko: "운동치료", en: "Movement therapy", ru: "Лечебная физкультура", kz: "Емдік дене шынықтыру", zh: "运动治疗", ja: "運動療法" },
      desc: { ko: "주 1회 전문 치료사 동반", en: "Weekly specialist-led session", ru: "Раз в неделю с профессиональным терапевтом", kz: "Аптасына бір рет кәсіби терапевтпен", zh: "每周一次专业治疗师陪同", ja: "週1回、専門セラピストが同伴" },
    },
    {
      id: "picnic",
      label: { ko: "힐링 소풍", en: "Healing picnic", ru: "Оздоровительный пикник", kz: "Сауықтыру пикнигі", zh: "治愈野餐", ja: "ヒーリングピクニック" },
      desc: { ko: "주 1회 병원 밖 휴식", en: "Weekly off-site rest", ru: "Раз в неделю отдых за пределами клиники", kz: "Аптасына бір рет клиникадан тыс демалыс", zh: "每周一次院外休憩", ja: "週1回、院外での休息" },
    },
    {
      id: "class",
      label: { ko: "원데이 클래스", en: "One-day class", ru: "Однодневный мастер-класс", kz: "Бір күндік шеберлік сабағы", zh: "一日课堂", ja: "ワンデークラス" },
      desc: { ko: "공예·명상·셀프케어 주제별", en: "Craft · meditation · self-care themes", ru: "Рукоделие, медитация, уход за собой — по темам", kz: "Қолөнер, медитация, өзін-өзі күту — тақырып бойынша", zh: "手工、冥想、自我照护等主题", ja: "工芸・瞑想・セルフケアなどテーマ別" },
    },
  ],

  // ===== 시설 =====
  facilities: [
    {
      id: "vip",
      name: { ko: "VIP 입원실", en: "VIP rooms", ru: "VIP-палаты", kz: "VIP палаталар", zh: "VIP病房", ja: "VIP入院室" },
      description: {
        ko: "프라이버시를 보장하는 1인실. 모션베드, 개인 냉장고, Smart TV, 안마의자, Wi-Fi, 병실 내 샤워실",
        en: "Private rooms with motion bed, personal fridge, smart TV, massage chair, Wi-Fi, in-room shower",
        ru: "Одноместные палаты с полной приватностью. Кровать с электроприводом, личный холодильник, Smart TV, массажное кресло, Wi-Fi, душ в палате",
        kz: "Жеке кеңістікті қамтамасыз ететін бір орындық палата. Моушн-кереует, жеке тоңазытқыш, Smart TV, массаж креслосы, Wi-Fi, палата ішіндегі душ",
        zh: "保障隐私的单人病房。电动床、个人冰箱、Smart TV、按摩椅、Wi-Fi、病房内淋浴间",
        ja: "プライバシーを守る個室。モーションベッド、個人用冷蔵庫、Smart TV、マッサージチェア、Wi-Fi、室内シャワー",
      },
      images: [
        "/immune/site/uploads/facilities/68be408d5f7644.95684766.jpg",
        "/immune/site/uploads/facilities/68be40b4b1d8c5.23151011.jpg",
        "/immune/site/uploads/facilities/68be40c36bec25.48300415.jpg",
        "/immune/site/uploads/facilities/68be40d00efbe8.92716455.jpg",
      ],
    },
    {
      id: "shared",
      name: { ko: "다인 입원실", en: "Shared rooms", ru: "Многоместные палаты", kz: "Көп орындық палаталар", zh: "多人病房", ja: "多床入院室" },
      description: {
        ko: "아늑한 공간과 효율적 동선. 모션베드, 개인 냉장고, Smart TV, 개인 캐비넷, Wi-Fi, 샤워실",
        en: "Comfortable with efficient flow. Motion bed, fridge, smart TV, personal cabinet, Wi-Fi, shower",
        ru: "Уютное пространство и продуманная планировка. Кровать с электроприводом, личный холодильник, Smart TV, личный шкафчик, Wi-Fi, душ",
        kz: "Жайлы кеңістік және ыңғайлы жоспарлау. Моушн-кереует, жеке тоңазытқыш, Smart TV, жеке шкаф, Wi-Fi, душ",
        zh: "舒适的空间与高效的动线。电动床、个人冰箱、Smart TV、个人储物柜、Wi-Fi、淋浴间",
        ja: "居心地の良い空間と効率的な動線。モーションベッド、個人用冷蔵庫、Smart TV、個人ロッカー、Wi-Fi、シャワー",
      },
      images: [
        "/immune/site/uploads/facilities/68be41219b4160.51146831.jpg",
        "/immune/site/uploads/facilities/68be412b85d8b7.40777135.jpg",
        "/immune/site/uploads/facilities/68be413524d368.74504271.jpg",
      ],
    },
    {
      id: "treatment",
      name: { ko: "치료 공간", en: "Treatment rooms", ru: "Лечебные кабинеты", kz: "Емдеу бөлмелері", zh: "治疗空间", ja: "治療スペース" },
      description: {
        ko: "고주파·적외선·침치료 등 통합 치료 전용 공간",
        en: "Dedicated rooms for hyperthermia, infrared, acupuncture",
        ru: "Отдельные кабинеты для интегративного лечения: гипертермия, инфракрасная терапия, иглоукалывание",
        kz: "Гипертермия, инфрақызыл терапия, ине терапиясы сияқты кешенді емге арналған арнайы бөлмелер",
        zh: "高频、红外线、针灸等综合治疗专用空间",
        ja: "高周波・赤外線・鍼治療など統合治療専用の空間",
      },
      images: [
        "/immune/site/uploads/facilities/6895d4fa2ed0b9.39462196.jpg",
        "/immune/site/uploads/facilities/6895d5060a54a4.33929598.jpg",
        "/immune/site/uploads/facilities/6895d50fd16de4.42589908.jpg",
        "/immune/site/uploads/facilities/6895d519331118.44767347.jpg",
      ],
    },
    {
      id: "healing",
      name: { ko: "힐링 공간", en: "Healing spaces", ru: "Пространства для отдыха", kz: "Сауықтыру кеңістіктері", zh: "治愈空间", ja: "ヒーリングスペース" },
      description: {
        ko: "24시간·365일 휴식할 수 있는 아늑한 환경",
        en: "Comfortable rest environment available 24/7/365",
        ru: "Уютная обстановка для отдыха 24/7/365",
        kz: "24/7/365 демалуға болатын жайлы орта",
        zh: "全年365天、24小时可休息的舒适环境（24/7/365）",
        ja: "24/7/365 くつろげる快適な環境",
      },
      images: [
        "/immune/site/uploads/facilities/6895e97c9bb5b9.72629469.jpg",
        "/immune/site/uploads/facilities/6895e984e72530.73501440.jpg",
        "/immune/site/uploads/facilities/6895e98da907d6.04767846.jpg",
        "/immune/site/uploads/facilities/68bea94b7914a9.24667654.jpg",
        "/immune/site/uploads/facilities/6895e996409ee8.20820981.jpg",
        "/immune/site/uploads/facilities/6895e9a27163b3.11074499.jpg",
      ],
    },
  ],

  // ===== 의료진 =====
  doctors: [
    {
      name: { ko: "황이준", en: "Hwang Yi-jun" },
      role: { ko: "대표원장", en: "Chief Director" },
      specialty: { ko: "통합면역 대표원장", en: "Integrative Immunology · Chief Director", ru: "Интегративная иммунология · главный директор", kz: "Интегративті иммунология · бас директор", zh: "综合免疫 · 代表院长", ja: "統合免疫 · 代表院長" },
      photo: "/immune/doctor/gangeo-dr-hwang-ijun.png",
      branch: "magok",
    },
    {
      name: { ko: "이우석", en: "Lee Woo-seok" },
      role: { ko: "양방 대표원장", en: "Chief (Western Medicine)" },
      specialty: { ko: "통합면역 · 부인과", en: "Integrative Immunology · Gynecology", ru: "Интегративная иммунология · гинекология", kz: "Интегративті иммунология · гинекология", zh: "综合免疫 · 妇科", ja: "統合免疫 · 婦人科" },
      photo: "/immune/doctor/gangeo-dr-lee-useok.jpg",
      branch: "magok",
    },
    {
      name: { ko: "임지성", en: "Im Ji-seong" },
      role: { ko: "의무원장", en: "Medical Director" },
      specialty: { ko: "통증재활 · 한방재활의학과", en: "Pain Rehab · KM Rehabilitation", ru: "Реабилитация при боли · реабилитационная медицина (корейская медицина)", kz: "Ауырсыну оңалтуы · корей медицинасының оңалту бөлімі", zh: "疼痛康复 · 韩方康复医学科", ja: "疼痛リハビリ · 韓方リハビリ医学科" },
      photo: "/immune/doctor/gangeo-dr-im-jisung.jpg",
      branch: "magok",
    },
    {
      name: { ko: "김지영", en: "Kim Ji-young" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역 · 한방내과", en: "Integrative Immunology · KM Internal Medicine", ru: "Интегративная иммунология · внутренние болезни (корейская медицина)", kz: "Интегративті иммунология · корей медицинасының ішкі аурулар бөлімі", zh: "综合免疫 · 韩方内科", ja: "統合免疫 · 韓方内科" },
      photo: "/immune/doctor/gangeo-dr-kim-jiyoung.jpg",
      branch: "magok",
    },
    {
      name: { ko: "김은지", en: "Kim Eun-ji" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역 · 한방내과", en: "Integrative Immunology · KM Internal Medicine", ru: "Интегративная иммунология · внутренние болезни (корейская медицина)", kz: "Интегративті иммунология · корей медицинасының ішкі аурулар бөлімі", zh: "综合免疫 · 韩方内科", ja: "統合免疫 · 韓方内科" },
      photo: "/immune/doctor/gangeo-dr-kim-eunji.jpg",
      branch: "magok",
    },
    {
      name: { ko: "배상근", en: "Bae Sang-geun" },
      role: { ko: "양방 원장", en: "Director (Western Medicine)" },
      specialty: { ko: "통합면역 · 가정의학", en: "Integrative Immunology · Family Medicine", ru: "Интегративная иммунология · семейная медицина", kz: "Интегративті иммунология · отбасылық медицина", zh: "综合免疫 · 家庭医学", ja: "統合免疫 · 家庭医学" },
      photo: "/immune/doctor/gangeo-dr-bae-sanggeun.jpg",
      branch: "magok",
    },
    {
      name: { ko: "배길준", en: "Bae Gil-jun" },
      role: { ko: "대표원장", en: "Chief Director" },
      specialty: { ko: "통합면역 한방재활의학과", en: "Integrative Immunology · KM Rehabilitation Medicine", ru: "Интегративная иммунология · реабилитационная медицина (корейская медицина)", kz: "Интегративті иммунология · корей медицинасының оңалту бөлімі", zh: "综合免疫 · 韩方康复医学科", ja: "統合免疫 · 韓方リハビリ医学科" },
      photo: "/immune/doctor/gwangmyeong-dr-bae-giljun.png",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "이정훈", en: "Lee Jeong-hun" },
      role: { ko: "양방 대표원장", en: "Chief (Western Medicine)" },
      specialty: { ko: "통합면역 · 마취통증의학과", en: "Integrative Immunology · Anesthesiology & Pain Medicine", ru: "Интегративная иммунология · анестезиология и лечение боли", kz: "Интегративті иммунология · анестезиология және ауырсынуды емдеу", zh: "综合免疫 · 麻醉疼痛医学科", ja: "統合免疫 · 麻酔痛症医学科" },
      photo: "/immune/doctor/gwangmyeong-dr-lee-jeonghun.png",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "하정빈", en: "Ha Jeong-bin" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역 · 한방내과", en: "Integrative Immunology · KM Internal Medicine", ru: "Интегративная иммунология · внутренние болезни (корейская медицина)", kz: "Интегративті иммунология · корей медицинасының ішкі аурулар бөлімі", zh: "综合免疫 · 韩方内科", ja: "統合免疫 · 韓方内科" },
      photo: "/immune/doctor/gwangmyeong-dr-ha-jeongbin.jpg",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "오재우", en: "Oh Jae-woo" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통증재활 · 한방신경정신과", en: "Pain Rehab · KM Neuropsychiatry", ru: "Реабилитация при боли · нейропсихиатрия (корейская медицина)", kz: "Ауырсыну оңалтуы · корей медицинасының нейропсихиатриясы", zh: "疼痛康复 · 韩方神经精神科", ja: "疼痛リハビリ · 韓方神経精神科" },
      photo: "/immune/doctor/gwangmyeong-dr-oh-jaewoo.jpg",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "김상현", en: "Kim Sang-hyeon" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역", en: "Integrative Immunology", ru: "Интегративная иммунология", kz: "Интегративті иммунология", zh: "综合免疫", ja: "統合免疫" },
      photo: "/immune/doctor/gwangmyeong-dr-kim-sanghyeon.jpg",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "김주완", en: "Kim Ju-wan" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통증재활", en: "Pain Rehab", ru: "Реабилитация при боли", kz: "Ауырсыну оңалтуы", zh: "疼痛康复", ja: "疼痛リハビリ" },
      photo: "/immune/doctor/gwangmyeong-dr-kim-juwan.jpg",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "조성원", en: "Jo Seong-won" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통증재활", en: "Pain Rehab", ru: "Реабилитация при боли", kz: "Ауырсыну оңалтуы", zh: "疼痛康复", ja: "疼痛リハビリ" },
      photo: "/immune/doctor/gwangmyeong-dr-jo-seongwon.jpg",
      branch: "gwangmyeong",
    },
    {
      name: { ko: "유형진", en: "Yoo Hyeong-jin" },
      role: { ko: "대표원장", en: "Chief Director" },
      specialty: { ko: "통합면역 대표원장", en: "Integrative Immunology · Chief Director", ru: "Интегративная иммунология · главный директор", kz: "Интегративті иммунология · бас директор", zh: "综合免疫 · 代表院长", ja: "統合免疫 · 代表院長" },
      photo: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png",
      branch: "sinchon",
    },
    {
      name: { ko: "조현실", en: "Jo Hyeon-sil" },
      role: { ko: "양방 대표원장", en: "Chief (Western Medicine)" },
      specialty: { ko: "통합면역 · 부인과", en: "Integrative Immunology · Gynecology", ru: "Интегративная иммунология · гинекология", kz: "Интегративті иммунология · гинекология", zh: "综合免疫 · 妇科", ja: "統合免疫 · 婦人科" },
      photo: "/immune/doctor/sinchon-dr-jo-hyeonsil.jpg",
      branch: "sinchon",
    },
    {
      name: { ko: "조수호", en: "Jo Su-ho" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "한방내과 전문의", en: "KM Internal Medicine Specialist", ru: "Специалист по внутренним болезням (корейская медицина)", kz: "Корей медицинасының ішкі аурулар маманы", zh: "韩方内科专科医师", ja: "韓方内科専門医" },
      photo: "/immune/doctor/sinchon-dr-jo-suho.jpg",
      branch: "sinchon",
    },
    {
      name: { ko: "김서진", en: "Kim Seo-jin" },
      role: { ko: "한방원장", en: "Director (Korean Medicine)" },
      specialty: { ko: "진료부", en: "Clinical Department", ru: "Лечебное отделение", kz: "Емдеу бөлімі", zh: "诊疗部", ja: "診療部" },
      photo: "/immune/doctor/sinchon-dr-kim-seojin.jpg",
      branch: "sinchon",
    },
    {
      name: { ko: "진수현", en: "Jin Su-hyeon" },
      role: { ko: "한방원장", en: "Director (Korean Medicine)" },
      specialty: { ko: "진료부", en: "Clinical Department", ru: "Лечебное отделение", kz: "Емдеу бөлімі", zh: "诊疗部", ja: "診療部" },
      photo: "/immune/doctor/sinchon-dr-jin-suhyeon.jpg",
      branch: "sinchon",
    },
    {
      name: { ko: "홍정화", en: "Hong Jeong-hwa" },
      role: { ko: "한방원장", en: "Director (Korean Medicine)" },
      specialty: { ko: "진료부", en: "Clinical Department", ru: "Лечебное отделение", kz: "Емдеу бөлімі", zh: "诊疗部", ja: "診療部" },
      photo: "/immune/doctor/sinchon-dr-hong-jeonghwa.jpg",
      branch: "sinchon",
    },
    {
      name: { ko: "강주안", en: "Kang Ju-an" },
      role: { ko: "대표원장", en: "Chief Director" },
      specialty: { ko: "통합면역 대표원장", en: "Integrative Immunology · Chief Director", ru: "Интегративная иммунология · главный директор", kz: "Интегративті иммунология · бас директор", zh: "综合免疫 · 代表院长", ja: "統合免疫 · 代表院長" },
      photo: "/immune/doctor/seongdong-dr-kang-juan.png",
      branch: "seongdong",
    },
    {
      name: { ko: "승현석", en: "Seung Hyeon-suk" },
      role: { ko: "의무원장", en: "Medical Director" },
      specialty: { ko: "통합면역센터 · 한방내과", en: "Integrative Immunity · KM Internal Medicine", ru: "Центр интегративного иммунитета · внутренние болезни (корейская медицина)", kz: "Интегративті иммунитет орталығы · корей медицинасының ішкі аурулар бөлімі", zh: "综合免疫中心 · 韩方内科", ja: "統合免疫センター · 韓方内科" },
      photo: "/immune/doctor/seongdong-dr-seung-hyeonsuk.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "임경수", en: "Im Gyeong-su" },
      role: { ko: "양방 대표원장", en: "Director (Western Medicine)" },
      specialty: { ko: "통합면역센터 · 정형외과", en: "Integrative Immunity · Orthopedics", ru: "Центр интегративного иммунитета · ортопедия", kz: "Интегративті иммунитет орталығы · ортопедия", zh: "综合免疫中心 · 骨科", ja: "統合免疫センター · 整形外科" },
      photo: "/immune/doctor/seongdong-dr-im-gyeongsu.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "고은상", en: "Go Eun-sang" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통증재활센터 · 한방내과", en: "Pain Rehab · KM Internal Medicine", ru: "Центр реабилитации при боли · внутренние болезни (корейская медицина)", kz: "Ауырсыну оңалту орталығы · корей медицинасының ішкі аурулар бөлімі", zh: "疼痛康复中心 · 韩方内科", ja: "疼痛リハビリセンター · 韓方内科" },
      photo: "/immune/doctor/seongdong-dr-go-eunsang.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "이문성", en: "Lee Mun-seong" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통증재활센터", en: "Pain Rehabilitation Center", ru: "Центр реабилитации при боли", kz: "Ауырсыну оңалту орталығы", zh: "疼痛康复中心", ja: "疼痛リハビリセンター" },
      photo: "/immune/doctor/seongdong-dr-lee-munseong.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "박정향", en: "Park Jeong-hyang" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역센터 · 한방내과", en: "Integrative Immunity · KM Internal Medicine", ru: "Центр интегративного иммунитета · внутренние болезни (корейская медицина)", kz: "Интегративті иммунитет орталығы · корей медицинасының ішкі аурулар бөлімі", zh: "综合免疫中心 · 韩方内科", ja: "統合免疫センター · 韓方内科" },
      photo: "/immune/doctor/seongdong-dr-park-jeonghyang.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "노현민", en: "Noh Hyeon-min" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "항노화센터 · 한방피부과", en: "Anti-Aging · KM Dermatology", ru: "Центр антивозрастной медицины · дерматология (корейская медицина)", kz: "Қартаюға қарсы орталық · корей медицинасының дерматологиясы", zh: "抗衰老中心 · 韩方皮肤科", ja: "アンチエイジングセンター · 韓方皮膚科" },
      photo: "/immune/doctor/seongdong-dr-noh-hyeonmin.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "이진영", en: "Lee Jin-yeong" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "항노화센터", en: "Anti-Aging Center", ru: "Центр антивозрастной медицины", kz: "Қартаюға қарсы орталық", zh: "抗衰老中心", ja: "アンチエイジングセンター" },
      photo: "/immune/doctor/seongdong-dr-lee-jinyeong.jpg",
      branch: "seongdong",
    },
    {
      name: { ko: "송시은", en: "Song Si-eun" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "항노화센터", en: "Anti-Aging Center", ru: "Центр антивозрастной медицины", kz: "Қартаюға қарсы орталық", zh: "抗衰老中心", ja: "アンチエイジングセンター" },
      photo: "/immune/doctor/seongdong-dr-song-sieun.jpg",
      branch: "seongdong",
    },
  ],

  // ===== 협진 체계 =====
  teamStructure: {
    ko: "의료진(한방+양방 협진) + 임상 영양사 + 치료식 전담 셰프의 3축 협진. 누적 50,000+ 사례.",
    en: "Three-axis collaboration: physicians (KM+Western) + clinical dietitian + in-house therapeutic chef. 50,000+ cumulative cases.",
    ru: "Трёхстороннее взаимодействие: врачи (корейская + западная медицина) + клинический диетолог + штатный шеф-повар лечебного питания. Более 50,000 накопленных случаев.",
    kz: "Үш бағытты ынтымақтастық: дәрігерлер (корей + батыс медицинасы) + клиникалық диетолог + емдік тағамның арнайы аспазы. Жинақталған 50,000+ жағдай.",
    zh: "医疗团队（韩医+西医协作）+ 临床营养师 + 治疗餐专属厨师的三轴协作。累计病例50,000+。",
    ja: "医療陣（韓方＋西洋医学の協診）＋臨床栄養士＋治療食専属シェフの3軸協診。累計50,000+件。",
  },

  // ===== 근거 자료 =====
  evidenceNote: {
    ko: "참고 논문: 말기 위암환자 수술 후 한방 병행 치료 시 생존율 개선 사례 보고됨. 개별 예후는 환자 상태에 따라 다를 수 있으며, 실제 효과는 의료진과 상담 필요.",
    en: "Reference: published cases report improved survival when combining Korean Medicine with post-surgical care for late-stage gastric cancer. Individual outcomes vary and require physician consultation.",
    ru: "Справочная публикация: описаны случаи улучшения выживаемости при сочетании корейской медицины с послеоперационным лечением у пациентов с раком желудка поздней стадии. Индивидуальный прогноз зависит от состояния пациента; фактический эффект требует консультации с врачом.",
    kz: "Анықтамалық жарияланым: асқазан обырының кеш сатысындағы науқастарда отадан кейінгі еммен корей медицинасын қатар қолданғанда өмір сүрудің жақсарған жағдайлары сипатталған. Жеке болжам науқастың жағдайына байланысты өзгеруі мүмкін; нақты әсер дәрігермен кеңесуді қажет етеді.",
    zh: "参考文献：有病例报告显示，晚期胃癌患者术后并行韩医治疗时生存率有所改善。个体预后因患者状况而异，实际效果需与医疗团队咨询。",
    ja: "参考文献：進行胃がん患者で術後に韓方併用治療を行い生存率が改善した症例が報告されています。個々の予後は患者の状態により異なり、実際の効果は医療陣との相談が必要です。",
  },

  website: "https://immunehospital.com/",
};
