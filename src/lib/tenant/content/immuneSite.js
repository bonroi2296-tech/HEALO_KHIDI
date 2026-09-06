/**
 * 면력한방병원 — 「판」에 채워 넣은 데이터 1호. **목업(로컬 확인용)**.
 *
 * 형식은 `src/lib/tenant/siteSchema.js`. 이 파일이 곧 «판에 병원 하나를 태우면 이렇게 된다»의 실물이다.
 *
 * 📌 사실 근거 (지어낸 것 없음)
 *   · 3개 센터·다루는 암종·의료진 구성·진료시간·대표번호 = immunehospital.com
 *   · 누적 치료사례 50,000건(2024-11) = 병원 자체 표기
 *   · 4개 지점(강서 마곡·신촌·광명·성동)·주소 = `hospitals` 테이블 실데이터
 *   · 치료 항목(pDRN 신경주사·CRYO 냉각치료·줄기세포 GFC·면역 수액·한약 처방) = `center_menu_items` 실데이터
 *
 * 🚨 비워 둔 칸 = 병원에서 받아야 하는 것 (판은 빈 칸이면 그 블록을 안 그린다)
 *   · testimonials(환자 후기) — 없어서 후기 블록이 통째로 안 뜬다. 지어내면 허위 후기다.
 *   · credentials(인증·수상) — 공개 확인 못 함.
 *   · 로고 파일 · 외국인 진료비.
 *   · 외국인 대상 통역·비자 지원 범위는 **가정**이라 단정형으로 안 썼다.
 */

import { IMMUNE_NAV } from "./immunePages";

export const IMMUNE_SITE = {
  // 헤더 메뉴 — 병원마다 페이지 구성이 다르므로 목록도 데이터다(판이 고정하지 않는다).
  nav: IMMUNE_NAV,
  brand: {
    name: {
      ko: "면력한방병원",
      en: "Immune Hospital",
      ru: "Immune Hospital",
      kz: "Immune Hospital",
      zh: "Immune Hospital",
      ja: "Immune Hospital",
    },
    // ⚠️ 색은 **추측하지 않고 로고에서 뽑았다.** 처음엔 "한방이니 초록"이라 넘겨짚어 딥 그린을
    //    썼는데, 면력 공식 로고 SVG 를 받아 보니 #003D66(딥 네이비)이 66회로 유일한 브랜드 색이었다.
    //    실물 로비 사진은 웜 베이지·크림에 골드 사인 → 바탕을 크림으로, 어두운 면을 네이비로 맞춘다.
    accent: "#003D66",
    darkTone: "#062A45",
    logoUrl: "/immune/brand/logo.svg",
  },

  hero: {
    eyebrow: {
      ko: "양·한방 협진 · 누적 치료 50,000건",
      en: "Korean & Western Medicine · 50,000+ Treatments",
      ru: "Корейская и западная медицина · 50 000+ случаев",
      kz: "Корей және батыс медицинасы · 50 000+ емдеу",
      zh: "韩医与西医协诊 · 累计诊疗50,000例",
      ja: "韓方・西洋医学の協診 · 累計5万件",
    },
    title: {
      ko: "암 치료 중에도\n일상을 지킬 수 있도록",
      en: "Stay Yourself\nThrough Cancer Treatment",
      ru: "Оставайтесь собой\nво время лечения рака",
      kz: "Ем кезінде де\nөзіңіз болып қалыңыз",
      zh: "在抗癌治疗中\n守护您的日常",
      ja: "がん治療の間も\n日常を守れるように",
    },
    subtitle: {
      ko: "수술과 항암은 대학병원에서. 면역력과 회복은 면력에서.\n한의사와 양방 의료진이 한 팀으로 봅니다.",
      en: "Surgery and chemotherapy at university hospitals. Immunity and recovery with us.\nKorean Medicine doctors and medical doctors work as one team.",
      ru: "Операция и химиотерапия — в университетской больнице. Иммунитет и восстановление — у нас.\nВрачи корейской и западной медицины работают одной командой.",
      kz: "Операция мен химиотерапия — университеттік ауруханада. Иммунитет пен қалпына келу — бізде.\nКорей және батыс медицинасының дәрігерлері бір команда болып жұмыс істейді.",
      zh: "手术与化疗在大学医院，免疫与康复在免力。\n韩医师与西医师组成一个团队共同诊疗。",
      ja: "手術と抗がん治療は大学病院で。免疫と回復は免力で。\n韓方医と西洋医が一つのチームとして診ます。",
    },
    primaryCta: {
      ko: "상담 예약",
      en: "Book a Consultation",
      ru: "Записаться",
      kz: "Кеңеске жазылу",
      zh: "预约咨询",
      ja: "相談を予約",
    },
    secondaryCta: {
      ko: "WhatsApp 문의",
      en: "Ask on WhatsApp",
      ru: "Написать в WhatsApp",
      kz: "WhatsApp арқылы сұрау",
      zh: "WhatsApp咨询",
      ja: "WhatsAppで問い合わせ",
    },
    // 스톡 사진(공원 산책) → **실제 병원 로비**. 그 병원 공간이 보여야 «그 병원 사이트»가 된다.
    // 출처: immunehospital.com 배너. 제휴 병원 이미지라 기존 의료진 사진과 같은 관행으로 self-host.
    image: "/immune/brand/lobby.jpg",
  },

  proof: [
    {
      value: "50,000+",
      label: {
        ko: "누적 치료 사례\n(2024.11 기준)",
        en: "Treatment Cases\n(as of Nov 2024)",
        ru: "Случаев лечения\n(ноябрь 2024)",
        kz: "Емдеу жағдайы\n(2024 қараша)",
        zh: "累计诊疗病例\n（2024年11月）",
        ja: "累計治療実績\n（2024年11月）",
      },
    },
    {
      value: "3",
      label: {
        ko: "전문 센터",
        en: "Specialized Centers",
        ru: "Профильных центра",
        kz: "Мамандандырылған орталық",
        zh: "专业中心",
        ja: "専門センター",
      },
    },
    {
      value: "4",
      label: {
        ko: "서울·수도권 지점",
        en: "Branches in Seoul Area",
        ru: "Филиала в Сеуле",
        kz: "Сеулдегі филиал",
        zh: "首尔圈分院",
        ja: "ソウル圏の拠点",
      },
    },
    {
      value: { ko: "20시", en: "8 PM", ru: "20:00", kz: "20:00", zh: "20时", ja: "20時" },
      label: {
        ko: "평일 야간진료",
        en: "Weekday Evening Clinic",
        ru: "Вечерний приём в будни",
        kz: "Жұмыс күндері кешкі қабылдау",
        zh: "工作日夜诊",
        ja: "平日の夜間診療",
      },
    },
  ],


  // 화면 폭을 꽉 채우는 사진 한 장. 해외 환자는 «한국 병원이 어떤 곳인지»를 여기서 판단한다.
  showcase: {
    /* 원래 «빈 1인 병실»이었다. 2026-07-29 PO 지적으로 네이버 블로그(면력 공식)를 캐서
       **옥상 잔디에서 열리는 모닝 요가 클래스** 사진으로 바꿨다.
       해외 환자에게 「치료 중에도 일상을 지킨다」는 말은 문장이 아니라 이 사진이 증명한다. */
    /* 2026-07-29 재교체: 병원 구글 드라이브 「16_모닝요가/최종」에서 받은 컷.
       ⚠️ 이 폴더의 「최종」은 전부 **얼굴합성** 파일이었다 = 병원이 환자 얼굴을 가공해 쓴다는 뜻.
          이 사진은 **뒷모습이라 얼굴이 아예 안 나온다** — 가공본을 쓸 필요조차 없는 컷이라 골랐다. */
    image: "/immune/life/rooftop-sky-1.jpg",
    eyebrow: { ko: "입원 · 회복", en: "Stay & Recovery", ru: "Пребывание и восстановление", kz: "Болу және қалпына келу", zh: "住院·康复", ja: "入院・回復" },
    title: {
      ko: "치료받는 동안에도\n하루가 비어 있지 않게",
      en: "So the days in treatment\nare never empty",
      ru: "Чтобы дни лечения\nне были пустыми",
      kz: "Ем күндері\nбос болмауы үшін",
      zh: "让治疗期间的每一天\n都不空虚",
      ja: "治療の日々が\n空にならないように",
    },
    desc: {
      ko: "옥상 정원에서 여는 모닝 요가, 맨발 산책길, 사우나와 라운지. 병원 안에 하루를 보낼 곳이 있습니다.",
      en: "Morning yoga on the rooftop garden, a barefoot walking path, a sauna and lounges — there is somewhere to spend the day inside the hospital.",
      ru: "Утренняя йога в саду на крыше, дорожка для ходьбы босиком, сауна и лаунджи — внутри больницы есть где провести день.",
      kz: "Шатыр бақшасында таңғы йога, жалаңаяқ серуен жолы, сауна мен лаунж — ауруханада күнді өткізетін орын бар.",
      zh: "屋顶花园的晨间瑜伽、赤足步道、桑拿与休息区——院内有可以度过一天的地方。",
      ja: "屋上庭園のモーニングヨガ、裸足で歩く小道、サウナとラウンジ。病院の中に一日を過ごす場所があります。",
    },
  },


  // ── 병원에서의 시간 (유튜브) ────────────────────────────────────
  // 🔎 면력 유튜브 채널을 실제로 열어 30편을 훑어보니 홍보 영상이 아니라 **환자 생활 콘텐츠**였다:
  //    셰프특식(호텔 다이닝급 병원 식사) · 면역밥상(환자용 레시피) · 원데이클래스(공예·정서 프로그램).
  //    히어로에 쓴 «치료 중에도 일상을 지킨다»가 말이 아니라 실제로 하고 있는 일이었다.
  // ⚠️ 영상은 전부 **한국어**다. 음식·공예는 보면 알기에 실었지만, 그 사실을 아래 note 로 밝힌다.
  //    (자막이 붙으면 훨씬 강해진다 — 병원에 제안할 것.)

  /* ══ 병원 안에서 보내는 하루 — «사진으로 보여주는» 자리 ══
     2026-07-29 PO: *"네이버 블로그에 콘텐츠 많이 올린댔어 거기꺼 가져와봐"* → 맞았다.
     면력 공식 블로그에 **매주 올라오는 실제 프로그램 기록**이 있었다(요가·어싱워크·약선다이닝).
     그전까지 이 섹션은 한국어 유튜브 영상뿐이라 «읽어야 아는» 자리였는데, 이제 사진으로 보인다.
     ⚠️ 병원이 실제로 «하고 있는 것»만 싣는다 — 블로그에 기록이 있는 것만 골랐다. */
  lifeTitle: {
    ko: "병원 안에서 보내는 하루",
    en: "A day inside the hospital",
    ru: "День внутри клиники",
    kz: "Клиника ішіндегі бір күн",
    zh: "在医院里的一天",
    ja: "病院で過ごす一日",
  },
  lifeLead: {
    ko: "치료는 하루 중 일부입니다. 나머지 시간을 어디서 어떻게 보내는지가 회복에 남습니다.",
    en: "Treatment takes up only part of the day. Where and how you spend the rest is what stays with your recovery.",
    ru: "Лечение занимает лишь часть дня. То, где и как проходит остальное время, и остаётся в восстановлении.",
    kz: "Ем күннің бір бөлігі ғана. Қалған уақытты қайда әрі қалай өткізу — қалпына келуде із қалдырады.",
    zh: "治疗只占一天中的一部分。其余时间在哪里、怎样度过，才是留在康复里的东西。",
    ja: "治療は一日の一部にすぎません。残りの時間をどこでどう過ごすかが、回復に残ります。",
  },
  life: [
    {
      image: "/immune/life/rooftop-yoga-3.jpg",
      title: { ko: "모닝 요가 클래스", en: "Morning Yoga Class", ru: "Утренняя йога", kz: "Таңғы йога сабағы", zh: "晨间瑜伽课", ja: "モーニングヨガクラス" },
      desc: { ko: "성동점 옥상 잔디에서 아침에 엽니다.", en: "Held in the morning on the rooftop lawn of the Seongdong branch.", ru: "Проходит утром на газоне крыши филиала Сондон.", kz: "Сондон филиалының шатыр көгалында таңертең өтеді.", zh: "于城东院区屋顶草坪的清晨举行。", ja: "城東院の屋上芝生で朝に行われます。" },
    },
    {
      image: "/immune/life/earthing-walk-2.jpg",
      title: { ko: "맨발 산책길 · 어싱워크", en: "Barefoot Walking (Earthing Walk)", ru: "Ходьба босиком (Earthing Walk)", kz: "Жалаңаяқ серуен (Earthing Walk)", zh: "赤足步行（Earthing Walk）", ja: "裸足の散歩（アーシングウォーク）" },
      desc: { ko: "1,100평 이뮨포레스트 안의 흙길을 맨발로 걷습니다.", en: "A soil path inside the 3,600 m² Immune Forest, walked barefoot.", ru: "Земляная тропа в «Иммунном лесу» площадью 3 600 м², по которой ходят босиком.", kz: "3 600 м² «Иммундық орман» ішіндегі топырақ жол — жалаңаяқ жүреді.", zh: "在3,600平方米的免疫森林中赤足行走的土路。", ja: "3,600㎡のイミューンフォレスト内の土の道を裸足で歩きます。" },
    },
    {
      image: "/immune/life/chef-1.jpg",
      title: { ko: "셰프가 만드는 약선 다이닝", en: "Chef-prepared Therapeutic Dining", ru: "Лечебное меню от шефа", kz: "Аспаз дайындайтын емдік ас", zh: "主厨制作的药膳餐饮", ja: "シェフが作る薬膳ダイニング" },
      desc: { ko: "병원 안 주방에서 코스로 냅니다. 치료식이 «참는 밥»이 되지 않게.", en: "Served as a course from the hospital's own kitchen — so therapeutic food is not something to endure.", ru: "Подаётся курсом из собственной кухни клиники — чтобы лечебное питание не было испытанием.", kz: "Клиниканың өз асханасынан курс ретінде беріледі — емдік тамақ азап болмауы үшін.", zh: "由院内厨房以套餐形式供应——让治疗餐不再是「忍着吃」。", ja: "院内の厨房からコースで提供します。治療食が«我慢する食事»にならないように。" },
    },
    {
      image: "/immune/life/pergola-3.jpg",
      title: { ko: "옥상 정원 · 스카이가든", en: "Rooftop Garden", ru: "Сад на крыше", kz: "Шатыр бақшасы", zh: "屋顶花园", ja: "屋上庭園" },
      desc: { ko: "보호자와 앉아 있을 수 있는 자리가 실내·실외 모두 있습니다.", en: "Places to sit with your carer, both indoors and outdoors.", ru: "Места, где можно посидеть с сопровождающим — и внутри, и снаружи.", kz: "Ілесіп жүрушімен бірге отыратын орындар — іште де, сыртта да.", zh: "室内外均设有可与陪同者同坐的空间。", ja: "付き添いの方と座れる場所が屋内・屋外の両方にあります。" },
    },
    {
      image: "/immune/life/sauna-stones.jpg",
      title: { ko: "사우나 · 안마 라운지", en: "Sauna & Massage Lounge", ru: "Сауна и массажный лаундж", kz: "Сауна және массаж лаунжы", zh: "桑拿·按摩休息区", ja: "サウナ・マッサージラウンジ" },
      desc: { ko: "치료 사이에 몸을 풀 수 있는 공간입니다.", en: "A place to loosen up between treatments.", ru: "Место, где можно расслабиться между процедурами.", kz: "Емдер арасында денені босататын орын.", zh: "可在治疗之间放松身体的空间。", ja: "治療の合間に体をほぐせる空間です。" },
    },
    {
      image: "/immune/life/massage-chair-2.jpg",
      title: { ko: "안마 라운지", en: "Massage Lounge", ru: "Массажный лаундж", kz: "Массаж лаунжы", zh: "按摩休息区", ja: "マッサージラウンジ" },
      desc: { ko: "치료 사이 대기 시간에 쓸 수 있습니다.", en: "Free to use while waiting between treatments.", ru: "Можно пользоваться в перерывах между процедурами.", kz: "Емдер арасында күту кезінде пайдалануға болады.", zh: "可在治疗间隙的等待时间使用。", ja: "治療の合間の待ち時間に使えます。" },
    },
  ],

  videosTitle: {
    ko: "치료 밖의 시간",
    en: "Life Beyond Treatment",
    ru: "Жизнь вне лечения",
    kz: "Емнен тыс өмір",
    zh: "治疗之外的时间",
    ja: "治療の外の時間",
  },
  videosNote: {
    ko: "병원에서 실제로 진행하는 식단과 프로그램입니다. 영상은 한국어로 제작되었습니다.",
    en: "Meals and programmes that actually run at the hospital. The videos are in Korean.",
    ru: "Питание и программы, которые действительно проводятся в клинике. Видео на корейском языке.",
    kz: "Клиникада шынымен өткізілетін тағам мен бағдарламалар. Бейнелер корей тілінде.",
    zh: "这些是医院实际进行的餐食与项目。视频为韩语制作。",
    ja: "病院で実際に行っている食事とプログラムです。動画は韓国語です。",
  },
  videos: [
    {
      id: "IWmJCs_mW8w",
      thumb: "/immune/video/IWmJCs_mW8w.jpg",
      tag: { ko: "셰프특식", en: "Chef's Table", ru: "Шеф-меню", kz: "Шеф мәзірі", zh: "主厨特餐", ja: "シェフ特食" },
      title: {
        ko: "병원에서 맛보는 호텔 다이닝 — 연어웰링턴 & 버섯리조또",
        en: "Hotel dining at the hospital — salmon Wellington & mushroom risotto",
        ru: "Ресторанный ужин в клинике — лосось Веллингтон и грибное ризотто",
        kz: "Клиникадағы қонақүй асханасы — Веллингтон албырты мен саңырауқұлақ ризоттосы",
        zh: "在医院品尝酒店级料理——惠灵顿三文鱼与蘑菇烩饭",
        ja: "病院で味わうホテルダイニング — サーモンウェリントン＆きのこリゾット",
      },
    },
    {
      id: "HerihoNTKvY",
      thumb: "/immune/video/HerihoNTKvY.jpg",
      tag: { ko: "셰프특식", en: "Chef's Table", ru: "Шеф-меню", kz: "Шеф мәзірі", zh: "主厨特餐", ja: "シェフ特食" },
      title: {
        ko: "환자를 위한 중식 한 상 — 왕갈비 짜장 · 삼선짬뽕 · 삼색 탕수육",
        en: "A Chinese course for patients — jjajang, seafood jjamppong and sweet-and-sour pork",
        ru: "Китайский обед для пациентов — чачжан, морской чампон и свинина в кисло-сладком соусе",
        kz: "Науқастарға арналған қытай асы — чачжан, теңіз чампоны және қышқыл-тәтті шошқа еті",
        zh: "为患者准备的中餐——黑椒排骨炸酱·三鲜炒码面·三色糖醋肉",
        ja: "患者さんのための中華一膳 — カルビジャージャー・海鮮チャンポン・三色酢豚",
      },
    },
    {
      id: "8ensMKRE9fw",
      thumb: "/immune/video/8ensMKRE9fw.jpg",
      tag: { ko: "면역밥상", en: "Immune Table", ru: "Иммунный стол", kz: "Иммундық дастархан", zh: "免疫餐桌", ja: "免疫ごはん" },
      title: {
        ko: "초간단 호박죽 — 맛 차이를 만드는 한 가지 비밀",
        en: "Simple pumpkin porridge — the one thing that changes the taste",
        ru: "Простая тыквенная каша — секрет, который меняет вкус",
        kz: "Қарапайым асқабақ ботқасы — дәмді өзгертетін бір құпия",
        zh: "超简单南瓜粥——决定味道的一个秘诀",
        ja: "超簡単かぼちゃ粥 — 味の差を生む一つの秘密",
      },
    },
    {
      id: "818HiZt53mA",
      thumb: "/immune/video/818HiZt53mA.jpg",
      tag: { ko: "면역밥상", en: "Immune Table", ru: "Иммунный стол", kz: "Иммундық дастархан", zh: "免疫餐桌", ja: "免疫ごはん" },
      title: {
        ko: "색다른 재료로 면역력 UP — 메밀 포케 샐러드",
        en: "Buckwheat poke salad for immunity",
        ru: "Гречневый поке-салат для иммунитета",
        kz: "Иммунитетке арналған қарақұмық поке салаты",
        zh: "用不同食材提升免疫力——荞麦波奇沙拉",
        ja: "違う食材で免疫力アップ — そば粉のポキサラダ",
      },
    },
    {
      id: "mIfa-CTkA_Y",
      thumb: "/immune/video/mIfa-CTkA_Y.jpg",
      tag: { ko: "원데이클래스", en: "One-day Class", ru: "Мастер-класс", kz: "Шеберлік сабақ", zh: "一日课程", ja: "ワンデイクラス" },
      title: {
        ko: "손끝에 담은 나전칠기 — 자개공예 원데이 클래스",
        en: "Korean mother-of-pearl inlay — a one-day craft class",
        ru: "Корейская перламутровая инкрустация — мастер-класс на один день",
        kz: "Корей седеп өнері — бір күндік шеберлік сабағы",
        zh: "指尖上的螺钿漆器——贝壳工艺一日课程",
        ja: "指先に宿る螺鈿 — 螺鈿工芸ワンデイクラス",
      },
    },
    {
      id: "19q9-hEjeSs",
      thumb: "/immune/video/19q9-hEjeSs.jpg",
      tag: { ko: "원데이클래스", en: "One-day Class", ru: "Мастер-класс", kz: "Шеберлік сабақ", zh: "一日课程", ja: "ワンデイクラス" },
      title: {
        ko: "병원에서 피어난 작은 쉼표 — 앙금 컵케이크 클래스",
        en: "A small pause at the hospital — bean-paste cupcake class",
        ru: "Небольшая пауза в клинике — мастер-класс по капкейкам",
        kz: "Клиникадағы шағын үзіліс — капкейк шеберлік сабағы",
        zh: "在医院绽放的小小逗号——豆沙杯子蛋糕课程",
        ja: "病院で咲いた小さな休符 — あんこカップケーキ教室",
      },
    },
  ],

  labels: {
    specialties: "Centers",
    whyUs: "Why Immune Hospital",
    doctors: "Medical Team",
    programs: "Treatments",
    menu: "Treatment Menu",
    branches: "Locations",
    life: "Life Inside",
    gallery: "Our Space",
    chat: "Chat",
    videos: "Life at the Hospital",
    credentials: "Certifications",
    faq: "FAQ",
    quickCta: { ko: "상담\n예약", en: "Book\nNow", ru: "Запись", kz: "Жазылу", zh: "预约", ja: "予約" },
    address: { ko: "주소", en: "Address", ru: "Адрес", kz: "Мекенжай", zh: "地址", ja: "住所" },
    phone: { ko: "전화", en: "Phone", ru: "Телефон", kz: "Телефон", zh: "电话", ja: "電話" },
    hours: { ko: "진료시간", en: "Hours", ru: "Часы работы", kz: "Жұмыс уақыты", zh: "门诊时间", ja: "診療時間" },
    directions: { ko: "길찾기", en: "Directions", ru: "Как добраться", kz: "Бағыт", zh: "路线", ja: "アクセス" },
  },

  specialtiesTitle: {
    ko: "3개 전문 센터",
    en: "Three Specialized Centers",
    ru: "Три профильных центра",
    kz: "Үш мамандандырылған орталық",
    zh: "三大专业中心",
    ja: "3つの専門センター",
  },
  /* 3개 센터 카드 사진 — 원래 «빈 방» 3장이었다(2026-07-29 교체).
     면력 공식 블로그에서 **각 센터가 실제로 쓰는 장비** 사진을 찾아 바꿨다:
     고압산소챔버(병원 로고가 박혀 있다) · 초음파 진단기 · 도수치료 침대.
     빈 방은 어느 병원이나 비슷하지만 «그 병원 장비»는 그 병원만의 것이다. */
  specialties: [
    {
      image: "/immune/life/equip-o2-chamber.jpg",
      title: {
        ko: "암면역센터",
        en: "Cancer Immunity Center",
        ru: "Центр онкоиммунитета",
        kz: "Онкоиммунитет орталығы",
        zh: "癌症免疫中心",
        ja: "がん免疫センター",
      },
      desc: {
        ko: "유방·자궁·난소, 대장·위, 간·담도·췌장, 폐, 갑상선암. 수술·항암과 병행하는 면역 관리.",
        en: "Breast, uterine, ovarian, colorectal, gastric, liver, biliary, pancreatic, lung and thyroid cancer — immune care alongside surgery and chemotherapy.",
        ru: "Рак груди, матки, яичников, кишечника, желудка, печени, жёлчных путей, поджелудочной, лёгких, щитовидной железы — поддержка иммунитета параллельно с операцией и химиотерапией.",
        kz: "Сүт безі, жатыр, аналық без, ішек, асқазан, бауыр, өт жолдары, ұйқы безі, өкпе, қалқанша безі обыры — операция мен химиотерапиямен қатар иммундық қолдау.",
        zh: "乳腺·子宫·卵巢、大肠·胃、肝·胆道·胰腺、肺、甲状腺癌。与手术化疗并行的免疫管理。",
        ja: "乳房・子宮・卵巣、大腸・胃、肝・胆道・膵臓、肺、甲状腺がん。手術・抗がん治療と並行する免疫ケア。",
      },
    },
    {
      image: "/immune/life/equip-ultrasound.jpg",
      title: {
        ko: "신경면역센터",
        en: "Neuro-Immunity Center",
        ru: "Центр нейроиммунитета",
        kz: "Нейроиммунитет орталығы",
        zh: "神经免疫中心",
        ja: "神経免疫センター",
      },
      desc: {
        ko: "대상포진, 안면마비. pDRN 신경주사 · 냉각치료(CRYO) · 자가재생 치료.",
        en: "Shingles and facial palsy — pDRN nerve injection, cryotherapy, and autologous regenerative treatment.",
        ru: "Опоясывающий лишай и паралич лицевого нерва — инъекции pDRN, криотерапия, аутологичная регенеративная терапия.",
        kz: "Белдемше және бет нервінің салдануы — pDRN инъекциясы, криотерапия, аутологиялық регенеративті ем.",
        zh: "带状疱疹、面瘫。pDRN神经注射·冷冻治疗·自体再生治疗。",
        ja: "帯状疱疹・顔面神経麻痺。pDRN神経注射・冷却治療・自家再生治療。",
      },
    },
    {
      image: "/immune/life/equip-manual-therapy.jpg",
      title: {
        ko: "재활센터",
        en: "Rehabilitation Center",
        ru: "Центр реабилитации",
        kz: "Оңалту орталығы",
        zh: "康复中心",
        ja: "リハビリセンター",
      },
      desc: {
        ko: "수술 후 재활, 부인과 수술 후 회복, 교통사고 후유증.",
        en: "Post-surgical rehabilitation, recovery after gynecologic surgery, and post-accident care.",
        ru: "Реабилитация после операции, восстановление после гинекологических операций, последствия ДТП.",
        kz: "Оталған соң оңалту, гинекологиялық оталардан кейінгі қалпына келу, жол апатының салдары.",
        zh: "术后康复、妇科手术后恢复、交通事故后遗症。",
        ja: "術後リハビリ、婦人科手術後の回復、交通事故後遺症。",
      },
    },
  ],

  galleryTitle: {
    ko: "진료가 이루어지는 공간",
    en: "Where Treatment Happens",
    ru: "Где проходит лечение",
    kz: "Ем өтетін кеңістік",
    zh: "诊疗所在的空间",
    ja: "診療が行われる空間",
  },
  // 실제 면력 시설 사진(강서·신촌 지점) + 병원이 직접 만드는 치료식.
  // 해외 환자는 가 본 적 없는 나라의 병원을 사진으로 판단한다 — 문장보다 공간이 낫다.
  // ⚠️ 옛 메모: 「5장이 격자에 딱 맞는다(6장이면 마지막이 혼자 떨어진다)」 — **이제 해당 없다.**
  //    격자를 가로로 흐르는 줄(SnapRow)로 바꿨기 때문에 홀수·짝수가 상관없다.
  //    2026-07-29: 유앤아이의원 사진 **391장** vs 우리 27장을 실측하고 밀도를 올렸다.
  //    창고에 25장을 두고 5장만 쓰고 있었다 — 가로줄에서는 장수가 늘어도 화면이 안 길어진다.
  //    ⚠️ 2026-07-29 **순서 교정**: 새 사진을 뒤에 붙였더니 «가로줄 24장 중 21~24번»이라
  //       스크롤을 끝까지 밀어야 나왔다. 처음 보이는 3장이 병실·병실·치료실 = 전부 «빈 방»이었다.
  //       가로줄은 길이가 공짜지만 **첫 3장은 공짜가 아니다** — 제일 센 사진을 앞으로 옮겼다.
  gallery: [
    {
      src: "/immune/life/rest-pods-1.jpg",
      caption: { ko: "정원을 마주한 휴식 좌석", en: "Rest pods facing the garden", ru: "Кресла отдыха с видом на сад", kz: "Бақшаға қараған демалыс орындары", zh: "面向花园的休息舱", ja: "庭に面した休憩ポッド" },
    },
    {
      // ⚠️ 여기 원래 **히어로와 같은 로비 사진**이 들어가 있었다(2026-07-29 자동검사가 잡음).
      //    맨 위에서 본 사진이 중간에 또 나오면 «사진이 없어서 돌려 쓴 티»가 난다.
      src: "/immune/facility/facility-vip-room-2.jpg",
      caption: { ko: "1인 병실", en: "Private room", ru: "Одноместная палата", kz: "Жеке палата", zh: "单人病房", ja: "個室" },
    },
    {
      src: "/immune/life/sauna-interior-1.jpg",
      caption: { ko: "사우나 내부", en: "Inside the sauna", ru: "Внутри сауны", kz: "Сауна ішінде", zh: "桑拿内部", ja: "サウナ内部" },
    },
    {
      src: "/immune/facility/facility-ward-room-1.jpg",
      caption: { ko: "병실", en: "Patient room", ru: "Палата", kz: "Палата", zh: "病房", ja: "病室" },
    },
    {
      src: "/immune/facility/facility-treatment-room-3.jpg",
      caption: { ko: "치료실", en: "Treatment room", ru: "Процедурный кабинет", kz: "Ем бөлмесі", zh: "治疗室", ja: "治療室" },
    },
    {
      src: "/immune/facility/facility-healing-space-4.jpg",
      caption: { ko: "회복 공간", en: "Recovery space", ru: "Зона восстановления", kz: "Қалпына келу аймағы", zh: "康复空间", ja: "回復スペース" },
    },
    {
      // 재활센터 카드와 같은 사진이던 자리 — 실제 힐링 공간 사진으로 바꿨다.
      src: "/immune/facility/facility-healing-space-2.jpg",
      caption: { ko: "힐링 공간", en: "Healing space", ru: "Зона отдыха", kz: "Демалыс кеңістігі", zh: "疗愈空间", ja: "ヒーリング空間" },
    },
    {
      src: "/immune/facility/facility-vip-room-3.jpg",
      caption: { ko: "1인 병실", en: "Private room", ru: "Одноместная палата", kz: "Жеке палата", zh: "单人病房", ja: "個室" },
    },
    {
      src: "/immune/facility/facility-seongdong-treatment-1.jpg",
      caption: { ko: "처치실", en: "Procedure room", ru: "Процедурная", kz: "Ем бөлмесі", zh: "处置室", ja: "処置室" },
    },
    {
      src: "/immune/facility/facility-healing-space-3.jpg",
      caption: { ko: "휴게 공간", en: "Lounge", ru: "Зона отдыха", kz: "Демалыс аймағы", zh: "休息区", ja: "休憩スペース" },
    },
    {
      src: "/immune/facility/facility-ward-room-3.jpg",
      caption: { ko: "다인 병실", en: "Shared room", ru: "Общая палата", kz: "Ортақ палата", zh: "多人病房", ja: "多床室" },
    },
    {
      src: "/immune/facility/facility-vip-room-4.jpg",
      caption: { ko: "보호자 동반 병실", en: "Room with companion bed", ru: "Палата с местом для сопровождающего", kz: "Серіктеске орны бар палата", zh: "可陪同病房", ja: "付き添い可の病室" },
    },
    {
      src: "/immune/facility/facility-healing-space-7.jpg",
      caption: { ko: "회복 라운지", en: "Recovery lounge", ru: "Лаунж для восстановления", kz: "Қалпына келу лаунджы", zh: "康复休息区", ja: "回復ラウンジ" },
    },
    /* ↓ 2026-07-29 추가 — PO: *"네이버 블로그에 콘텐츠 많이 올린댔어 거기꺼 가져와봐"*
       면력 공식 네이버 블로그(blog.naver.com/olbodiuai)에서 267장을 받아 **한글 글자가 없는
       실사진 32장**을 골랐다. 그전까지 우리 사진은 거의 «빈 방»이었는데, 여기엔
       옥상 요가·맨발 산책길·사우나·셰프 조리 같은 **사람이 있는 장면**이 있다. */
    {
      src: "/immune/life/rooftop-yoga-1.jpg",
      caption: { ko: "옥상 정원 모닝 요가", en: "Morning yoga, rooftop garden", ru: "Утренняя йога в саду на крыше", kz: "Шатыр бақшасындағы таңғы йога", zh: "屋顶花园晨间瑜伽", ja: "屋上庭園のモーニングヨガ" },
    },
    {
      src: "/immune/life/earthing-walk-1.jpg",
      caption: { ko: "맨발 산책길 (어싱워크)", en: "Barefoot walking path", ru: "Дорожка для ходьбы босиком", kz: "Жалаңаяқ серуен жолы", zh: "赤足步道", ja: "裸足の散歩道" },
    },
    {
      src: "/immune/life/indoor-garden-1.jpg",
      caption: { ko: "실내 정원", en: "Indoor garden", ru: "Крытый сад", kz: "Ішкі бақ", zh: "室内花园", ja: "屋内庭園" },
    },
    {
      src: "/immune/life/pergola-2.jpg",
      caption: { ko: "옥상 정원 라운지", en: "Rooftop garden lounge", ru: "Лаундж в саду на крыше", kz: "Шатыр бақшасының лаунжы", zh: "屋顶花园休息区", ja: "屋上庭園ラウンジ" },
    },
    {
      src: "/immune/life/sauna-1.jpg",
      caption: { ko: "사우나", en: "Sauna", ru: "Сауна", kz: "Сауна", zh: "桑拿", ja: "サウナ" },
    },
    {
      src: "/immune/life/gym-1.jpg",
      caption: { ko: "운동 공간", en: "Fitness room", ru: "Тренажёрный зал", kz: "Жаттығу залы", zh: "健身空间", ja: "フィットネスルーム" },
    },
    {
      src: "/immune/life/massage-chairs-1.jpg",
      caption: { ko: "안마 라운지", en: "Massage lounge", ru: "Массажный лаундж", kz: "Массаж лаунжы", zh: "按摩休息区", ja: "マッサージラウンジ" },
    },
    {
      src: "/immune/life/garden-path-1.jpg",
      caption: { ko: "정원 산책로", en: "Garden path", ru: "Садовая дорожка", kz: "Бақ соқпағы", zh: "花园步道", ja: "庭園の小道" },
    },
    {
      src: "/immune/life/rooftop-view-1.jpg",
      caption: { ko: "옥상에서 보는 서울", en: "Seoul from the rooftop", ru: "Сеул с крыши", kz: "Шатырдан көрінетін Сеул", zh: "从屋顶眺望首尔", ja: "屋上から見るソウル" },
    },
    /* ↓ 2026-07-29 추가 — PO: *"최근에 업데이트 해준거야 그냥 그런거 따지지 말고 다 가져와"*
       병원 구글 드라이브 `01_인테리어/…/260618_2차_저용량` 45장을 전부 받아 눈으로 고른 9장.
       블로그 사진과 겹치지 않는 «처음 나오는 공간»만 남겼다(러닝머신·사우나 돌은 이미 있어서 뺐다). */
    {
      src: "/immune/life/footbath-2.jpg",
      caption: { ko: "족욕 공간", en: "Foot-bath area", ru: "Зона ванночек для ног", kz: "Аяқ ванна аймағы", zh: "足浴区", ja: "足浴スペース" },
    },
    {
      src: "/immune/life/sauna-entrance-1.jpg",
      caption: { ko: "사우나 입구", en: "Sauna entrance", ru: "Вход в сауну", kz: "Саунаға кіреберіс", zh: "桑拿入口", ja: "サウナ入口" },
    },
    /* 성동점 약선다이닝 촬영(2026-07-13, 드라이브 33장) 중 **접시와 손만 나오는** 3장.
       같은 폴더의 홀 사진 `C1_09009` 에는 항암 환자(두건)의 얼굴이 그대로 나와 안 썼다. */
    {
      src: "/immune/life/dining-plated-1.jpg",
      caption: { ko: "약선 다이닝 한 접시", en: "A plate from the therapeutic course", ru: "Блюдо из лечебного меню", kz: "Емдік ас мәзірінен бір табақ", zh: "药膳套餐中的一道", ja: "薬膳ダイニングの一皿" },
    },
    {
      src: "/immune/life/dining-pass-1.jpg",
      caption: { ko: "코스가 나가는 자리", en: "Plating for service", ru: "Раздача блюд", kz: "Тағам таратылатын орын", zh: "出餐台", ja: "コースが出ていく場所" },
    },
  ],

  whyUsTitle: {
    ko: "왜 면력한방병원인가",
    en: "Why Immune Hospital",
    ru: "Почему Immune Hospital",
    kz: "Неге Immune Hospital",
    zh: "为什么选择 Immune Hospital",
    ja: "なぜ Immune Hospital なのか",
  },
  whyUs: [
    {
      image: "/immune/facility/facility-treatment-room-2.jpg",
      title: {
        ko: "한 팀으로 보는 양·한방 협진",
        en: "One Team, Two Disciplines",
        ru: "Одна команда, два подхода",
        kz: "Бір команда, екі тәсіл",
        zh: "一个团队，中西医协诊",
        ja: "一つのチームで韓方と西洋医学",
      },
      desc: {
        ko: "한방 대표원장과 양방 대표원장이 같은 환자를 두고 함께 진료 방향을 정합니다. 서로 다른 병원을 오갈 필요가 없습니다.",
        en: "Our Korean Medicine director and medical director decide the plan together for the same patient — no need to travel between separate clinics.",
        ru: "Главный врач корейской медицины и главный врач западной медицины определяют план вместе — не нужно ездить между разными клиниками.",
        kz: "Корей медицинасы мен батыс медицинасының бас дәрігерлері жоспарды бірге белгілейді — түрлі клиникалар арасында жүрудің қажеті жоқ.",
        zh: "韩医代表院长与西医代表院长针对同一位患者共同确定诊疗方向，无需在不同医院间奔波。",
        ja: "韓方の代表院長と西洋医学の代表院長が同じ患者について一緒に方針を決めます。別々の病院を行き来する必要がありません。",
      },
    },
    {
      image: "/immune/facility/facility-healing-space-1.jpg",
      title: {
        ko: "진단부터 재활까지 한 곳에서",
        en: "Diagnosis to Rehabilitation, One Place",
        ru: "От диагностики до реабилитации — в одном месте",
        kz: "Диагностикадан оңалтуға дейін бір жерде",
        zh: "从诊断到康复，在同一处",
        ja: "診断からリハビリまで一か所で",
      },
      desc: {
        ko: "검사, 면역치료, 재활이 한 건물 안에서 이어집니다. 치료가 끊기지 않고 경과가 한 기록에 남습니다.",
        en: "Tests, immunotherapy and rehabilitation continue in one building — treatment is not interrupted and progress stays in one record.",
        ru: "Обследование, иммунотерапия и реабилитация проходят в одном здании — лечение не прерывается, а динамика остаётся в одной карте.",
        kz: "Тексеру, иммунотерапия және оңалту бір ғимаратта жалғасады — ем үзілмейді, динамика бір жазбада қалады.",
        zh: "检查、免疫治疗与康复在同一栋楼内连续进行，治疗不中断，病程记录统一。",
        ja: "検査・免疫治療・リハビリが一つの建物で続きます。治療が途切れず、経過が一つの記録に残ります。",
      },
    },
    {
      image: "/immune/brand/care-meal.jpg",
      title: {
        ko: "치료 중 컨디션을 함께 관리",
        en: "Managing How You Feel During Treatment",
        ru: "Забота о самочувствии во время лечения",
        kz: "Ем кезіндегі жағдайыңызды бірге бақылау",
        zh: "同步管理治疗期间的身体状态",
        ja: "治療中の体調も一緒に管理",
      },
      desc: {
        ko: "항암 중 체력 저하, 통증, 식이 문제를 함께 봅니다. 치료를 끝까지 받을 수 있게 하는 것이 목표입니다.",
        en: "We address fatigue, pain and nutrition during chemotherapy — the goal is to help you complete the treatment you started.",
        ru: "Мы работаем с усталостью, болью и питанием во время химиотерапии — цель в том, чтобы вы смогли пройти лечение до конца.",
        kz: "Химиотерапия кезіндегі әлсіздік, ауырсыну және тамақтану мәселелерімен айналысамыз — мақсат емді аяғына дейін алу.",
        zh: "我们同时处理化疗期间的体力下降、疼痛与饮食问题，目标是让治疗能够坚持到底。",
        ja: "抗がん治療中の体力低下・痛み・食事の問題も一緒に診ます。治療を最後まで受けられるようにすることが目標です。",
      },
    },
  ],

  /* 의료진 단체 사진 — 배경이 지워진(누끼) 원본이라 어느 바탕에도 얹힌다.
     출처: 병원이 공유해 준 구글 드라이브 `01_사진/02_의료진/01_강서` (2026-07-29).
     ⚠️ 얼굴 하나하나보다 «같이 서 있는 팀»이 먼저 보이는 게 이 병원의 강점(양·한방 협진)이다. */
  teamPhoto: "/immune/team/team-gangseo.png",

  doctorsTitle: {
    ko: "면력 의료진",
    en: "Our Medical Team",
    ru: "Наши врачи",
    kz: "Біздің дәрігерлер",
    zh: "免力医疗团队",
    ja: "免力の医療チーム",
  },
  /* ⚠️ 중국어 이름에 **한자를 쓰지 않는다** (2026-07-29 정정).
       전에는 黄利俊·柳亨镇·裴吉俊·姜周安 이 들어가 있었는데, **병원 사이트 어디에도 한자 이름이 없다.**
       한글 이름에서 한자는 유추할 수 없다(황이준 = 黃利俊 일 수도 黃二準 일 수도 있다).
       실존 인물의 이름을 틀리게 쓰는 것이라 지점 주소를 지어낸 것과 같은 부류(반성문 #159).
       → 한자가 확인되기 전까지 한글 그대로 둔다. 병원 확인 후 채울 항목. */
  doctors: [
    {
      name: { ko: "황이준 대표원장", en: "Dr. Hwang I-jun", ru: "Д-р Хван И-джун", kz: "Д-р Хван И-джун", zh: "황이준 代表院长", ja: "ファン・イジュン代表院長" },
      title: { ko: "강서점 대표원장", en: "Director, Gangseo", ru: "Главный врач, Кансо", kz: "Бас дәрігер, Кансо", zh: "江西院区代表院长", ja: "江西院 代表院長" },
      photo: "/immune/doctor/gangeo-dr-hwang-ijun.png",
    },
    {
      name: { ko: "유형진 대표원장", en: "Dr. Yoo Hyeong-jin", ru: "Д-р Ю Хён-джин", kz: "Д-р Ю Хён-джин", zh: "유형진 代表院长", ja: "ユ・ヒョンジン代表院長" },
      title: { ko: "신촌점 대표원장", en: "Director, Sinchon", ru: "Главный врач, Синчон", kz: "Бас дәрігер, Синчон", zh: "新村院区代表院长", ja: "新村院 代表院長" },
      photo: "/immune/doctor/sinchon-dr-yoo-hyeongjin.png",
    },
    {
      name: { ko: "배길준 대표원장", en: "Dr. Bae Gil-jun", ru: "Д-р Пэ Гиль-джун", kz: "Д-р Пэ Гиль-джун", zh: "배길준 代表院长", ja: "ペ・ギルジュン代表院長" },
      title: { ko: "광명점 대표원장", en: "Director, Gwangmyeong", ru: "Главный врач, Кванмён", kz: "Бас дәрігер, Кванмён", zh: "光明院区代表院长", ja: "光明院 代表院長" },
      photo: "/immune/doctor/gwangmyeong-dr-bae-giljun.png",
    },
    {
      name: { ko: "강주안 대표원장", en: "Dr. Kang Ju-an", ru: "Д-р Кан Чжу-ан", kz: "Д-р Кан Чжу-ан", zh: "강주안 代表院长", ja: "カン・ジュアン代表院長" },
      title: { ko: "성동점 대표원장", en: "Director, Seongdong", ru: "Главный врач, Сондон", kz: "Бас дәрігер, Сондон", zh: "城东院区代表院长", ja: "城東院 代表院長" },
      photo: "/immune/doctor/seongdong-dr-kang-juan.png",
    },
  ],

  programsTitle: {
    ko: "주요 치료 프로그램",
    en: "Treatment Programs",
    ru: "Программы лечения",
    kz: "Емдеу бағдарламалары",
    zh: "主要治疗项目",
    ja: "主な治療プログラム",
  },
  programs: [
    {
      image: "/immune/facility/facility-treatment-room-1.jpg",
      title: { ko: "면역·영양 수액", en: "Immune & Nutritional IV", ru: "Иммунные и питательные капельницы", kz: "Иммундық және тағамдық тамшылар", zh: "免疫·营养输液", ja: "免疫・栄養点滴" },
      desc: {
        ko: "항암 중 떨어진 체력과 면역을 받쳐주는 정맥·근육 주사.",
        en: "IV and IM support for strength and immunity during chemotherapy.",
        ru: "Внутривенная и внутримышечная поддержка сил и иммунитета во время химиотерапии.",
        kz: "Химиотерапия кезінде күш пен иммунитетті қолдайтын тамырішілік және бұлшықет ішілік ем.",
        zh: "支持化疗期间体力与免疫的静脉·肌肉注射。",
        ja: "抗がん治療中の体力と免疫を支える点滴・注射。",
      },
      items: [
        { ko: "항염증 수액 (큐펜·카비)", en: "Anti-inflammatory IV", ru: "Противовоспалительная капельница", kz: "Қабынуға қарсы тамшы", zh: "抗炎输液", ja: "抗炎症点滴" },
        { ko: "점막면역 (디펩티벤)", en: "Mucosal immunity support", ru: "Поддержка слизистого иммунитета", kz: "Шырышты иммунитетті қолдау", zh: "黏膜免疫支持", ja: "粘膜免疫サポート" },
        { ko: "비타민 D 고용량", en: "High-dose Vitamin D", ru: "Витамин D в высокой дозе", kz: "Жоғары дозадағы D дәрумені", zh: "高剂量维生素D", ja: "高用量ビタミンD" },
      ],
    },
    {
      // ⚠️ 여기 원래 위 카드와 **같은 사진**이 들어가 있었다(2026-07-29 전체 화면 확인에서 잡음).
      //    같은 사진이 나란히 두 장 뜨면 «내용이 없어서 채운 티»가 난다 = 판 냄새.
      //    병원 사진은 25장 갖고 있으니 굳이 겹칠 이유가 없다.
      image: "/immune/facility/facility-treatment-room-4.jpg",
      title: { ko: "재생·회복 치료", en: "Regenerative Care", ru: "Регенеративная терапия", kz: "Регенеративті ем", zh: "再生·恢复治疗", ja: "再生・回復治療" },
      desc: {
        ko: "손상된 신경·조직의 회복을 돕는 주사와 냉각치료.",
        en: "Injections and cryotherapy that support recovery of damaged nerves and tissue.",
        ru: "Инъекции и криотерапия для восстановления повреждённых нервов и тканей.",
        kz: "Зақымдалған жүйке мен тіндердің қалпына келуіне көмектесетін инъекция және криотерапия.",
        zh: "帮助受损神经与组织恢复的注射与冷冻治疗。",
        ja: "傷んだ神経・組織の回復を助ける注射と冷却治療。",
      },
      items: [
        { ko: "pDRN 신경주사", en: "pDRN nerve injection", ru: "Инъекция pDRN", kz: "pDRN инъекциясы", zh: "pDRN神经注射", ja: "pDRN神経注射" },
        { ko: "냉각치료(CRYO) + 재활", en: "Cryotherapy + rehab", ru: "Криотерапия и реабилитация", kz: "Криотерапия және оңалту", zh: "冷冻治疗+康复", ja: "冷却治療＋リハビリ" },
        { ko: "자가재생 치료(GFC)", en: "Autologous regenerative (GFC)", ru: "Аутологичная терапия (GFC)", kz: "Аутологиялық ем (GFC)", zh: "自体再生治疗(GFC)", ja: "自家再生治療(GFC)" },
      ],
    },
    {
      image: "/immune/facility/facility-healing-space-6.jpg",
      title: { ko: "한약 처방", en: "Korean Herbal Medicine", ru: "Корейская фитотерапия", kz: "Корей фитотерапиясы", zh: "韩药处方", ja: "韓方処方" },
      desc: {
        ko: "체질과 치료 단계에 맞춰 조제하는 개인 처방.",
        en: "Individually formulated prescriptions matched to constitution and treatment stage.",
        ru: "Индивидуальные прописи с учётом конституции и стадии лечения.",
        kz: "Дене ерекшелігі мен ем кезеңіне сай жеке дайындалатын рецепт.",
        zh: "根据体质与治疗阶段配制的个人处方。",
        ja: "体質と治療段階に合わせて調剤する個別処方。",
      },
      items: [
        { ko: "개인 맞춤 처방", en: "Personalized formula", ru: "Индивидуальная формула", kz: "Жеке формула", zh: "个人定制处方", ja: "オーダーメイド処方" },
        { ko: "공진단 (녹용·원방)", en: "Gongjindan tonic", ru: "Тоник Конджиндан", kz: "Конжиндан тонигі", zh: "拱辰丹", ja: "拱辰丹" },
        { ko: "소경활혈환", en: "Sogyeong-hwalhyeol formula", ru: "Согён-хвальхёль", kz: "Сокён-хвальхөл", zh: "疏经活血丸", ja: "疎経活血丸" },
      ],
    },
  ],

  faqTitle: {
    ko: "해외 환자가 자주 묻는 질문",
    en: "Questions from International Patients",
    ru: "Вопросы иностранных пациентов",
    kz: "Шетелдік науқастардың сұрақтары",
    zh: "海外患者常见问题",
    ja: "海外の患者さまからよくある質問",
  },
  faq: [
    {
      q: {
        ko: "한국 대학병원에서 수술을 받는데, 면력에서 같이 치료받을 수 있나요?",
        en: "I'm having surgery at a university hospital in Korea. Can I be treated here at the same time?",
        ru: "Мне предстоит операция в университетской больнице Кореи. Можно ли параллельно лечиться у вас?",
        kz: "Кореядағы университеттік ауруханада ота жасалады. Сонымен қатар сізде ем алуға бола ма?",
        zh: "我在韩国大学医院手术，能同时在贵院接受治疗吗？",
        ja: "韓国の大学病院で手術を受けます。同時に貴院でも治療を受けられますか？",
      },
      a: {
        ko: "네, 그것이 저희가 하는 일입니다. 수술·항암은 협진 대학병원에서 받고, 그 사이의 면역·체력 관리와 이후 회복을 저희가 맡습니다. 진단서와 치료 계획을 보내주시면 일정에 맞춰 프로그램을 짭니다.",
        en: "Yes — that is exactly what we do. Surgery and chemotherapy take place at cooperating university hospitals, while we handle immunity, strength and recovery in between and afterwards. Send us your diagnosis and treatment plan and we will build a schedule around it.",
        ru: "Да, именно этим мы и занимаемся. Операция и химиотерапия проходят в партнёрских университетских больницах, а мы ведём иммунитет, силы и восстановление в промежутках и после. Пришлите заключение и план лечения — мы составим программу под ваш график.",
        kz: "Иә, біз дәл осымен айналысамыз. Операция мен химиотерапия серіктес университеттік ауруханада өтеді, ал біз аралықта және одан кейін иммунитет пен қалпына келуді жүргіземіз. Диагноз бен ем жоспарын жіберіңіз — кестеңізге сай бағдарлама құрамыз.",
        zh: "是的，这正是我们所做的。手术与化疗在协诊大学医院进行，其间与之后的免疫、体力管理与康复由我们负责。请提供诊断书与治疗方案，我们会据此安排日程。",
        ja: "はい、まさにそれが私たちの役割です。手術・抗がん治療は連携大学病院で受けていただき、その間と以後の免疫・体力管理と回復を当院が担当します。診断書と治療計画をお送りいただければ、日程に合わせてプログラムを組みます。",
      },
    },
    {
      q: {
        ko: "통역이 되나요?",
        en: "Is interpretation available?",
        ru: "Есть ли перевод?",
        kz: "Аударма бар ма?",
        zh: "提供翻译吗？",
        ja: "通訳はありますか？",
      },
      a: {
        ko: "진료 전 상담은 러시아어·영어를 포함해 6개 언어로 받으실 수 있습니다. 내원 시 통역 지원 범위는 예약 시 안내드립니다.",
        en: "Pre-visit consultation is available in six languages including Russian and English. Interpretation arrangements for your on-site visit are confirmed when you book.",
        ru: "Консультация до визита доступна на шести языках, включая русский и английский. Условия перевода на приёме уточняются при записи.",
        kz: "Келу алдындағы кеңес орыс және ағылшын тілін қоса алты тілде қолжетімді. Қабылдаудағы аударма шарттары жазылу кезінде нақтыланады.",
        zh: "就诊前咨询提供包括俄语、英语在内的六种语言。到院时的翻译安排将在预约时告知。",
        ja: "受診前の相談はロシア語・英語を含む6言語で可能です。来院時の通訳対応の範囲は予約時にご案内します。",
      },
    },
    {
      q: {
        ko: "치료 비용은 어떻게 되나요?",
        en: "How much does treatment cost?",
        ru: "Сколько стоит лечение?",
        kz: "Емдеу қанша тұрады?",
        zh: "治疗费用如何？",
        ja: "治療費はどのくらいですか？",
      },
      a: {
        ko: "치료 내용과 기간에 따라 달라져 상담 후 개별 견적을 드립니다. 진단서와 최근 검사 결과를 함께 보내주시면 더 정확한 범위를 안내드릴 수 있습니다.",
        en: "It depends on the treatment and duration, so we provide an individual estimate after consultation. Sending your diagnosis and recent test results lets us give a more precise range.",
        ru: "Стоимость зависит от лечения и его длительности, поэтому смету мы составляем после консультации. Заключение и свежие результаты обследования помогут назвать более точный диапазон.",
        kz: "Құны ем мен оның ұзақтығына байланысты, сондықтан кеңестен кейін жеке смета береміз. Диагноз бен соңғы тексеру нәтижелері дәлірек аралық айтуға көмектеседі.",
        zh: "费用视治疗内容与疗程而定，咨询后提供个别报价。如能一并提供诊断书与近期检查结果，可给出更准确的范围。",
        ja: "治療内容と期間によって異なるため、相談後に個別のお見積りをお出しします。診断書と直近の検査結果をお送りいただくと、より正確な範囲をご案内できます。",
      },
    },
    {
      q: {
        ko: "얼마나 머물러야 하나요?",
        en: "How long do I need to stay in Korea?",
        ru: "Как долго нужно оставаться в Корее?",
        kz: "Кореяда қанша уақыт болу керек?",
        zh: "需要在韩国停留多久？",
        ja: "韓国にどのくらい滞在が必要ですか？",
      },
      a: {
        ko: "프로그램에 따라 다릅니다. 주사·재활 치료는 주 2~3회가 기준이라 몇 주 단위의 체류가 필요할 수 있고, 한약 처방은 귀국 후 복용이 가능합니다. 상담 때 일정 안을 함께 잡아드립니다.",
        en: "It depends on the program. Injection and rehabilitation courses are typically 2–3 sessions per week, so a stay of several weeks may be needed, while herbal prescriptions can be continued after you return home. We plan the schedule with you during consultation.",
        ru: "Зависит от программы. Курсы инъекций и реабилитации обычно 2–3 раза в неделю, поэтому может понадобиться пребывание в несколько недель; фитотерапию можно продолжать дома. График составим вместе на консультации.",
        kz: "Бағдарламаға байланысты. Инъекция мен оңалту курстары әдетте аптасына 2–3 рет, сондықтан бірнеше апта болу қажет болуы мүмкін; фитотерапияны үйге оралған соң жалғастыруға болады. Кестені кеңес кезінде бірге жасаймыз.",
        zh: "视项目而定。注射与康复通常每周2~3次，可能需要数周的停留；韩药处方可在回国后继续服用。我们会在咨询时与您共同安排日程。",
        ja: "プログラムによります。注射・リハビリは週2〜3回が目安のため数週間の滞在が必要な場合があり、韓方処方は帰国後の服用が可能です。相談時に日程案を一緒に組みます。",
      },
    },
  ],

  closing: {
    title: {
      ko: "먼저 상태부터 알려주세요",
      en: "Tell Us About Your Condition First",
      ru: "Расскажите о своём состоянии",
      kz: "Алдымен жағдайыңызды айтыңыз",
      zh: "请先告诉我们您的状况",
      ja: "まずは状態をお聞かせください",
    },
    subtitle: {
      ko: "진단서와 검사 결과를 함께 보내주시면 상담이 훨씬 빨라집니다.",
      en: "Sending your diagnosis and test results makes the consultation much faster.",
      ru: "Если пришлёте заключение и результаты обследования, консультация пройдёт значительно быстрее.",
      kz: "Диагноз бен тексеру нәтижелерін жіберсеңіз кеңес әлдеқайда жылдам өтеді.",
      zh: "一并提供诊断书与检查结果，咨询会快得多。",
      ja: "診断書と検査結果をお送りいただくと、相談がずっと早く進みます。",
    },
  },

  contact: {
    phone: "1588-2915",
    email: "", // 미확인 — 비워 두면 화면에 안 뜬다
    address: {
      ko: "서울특별시 강서구 마곡중앙6로 93, 열린프라자 6·7·10층",
      en: "6F·7F·10F, 93 Magokjungang 6-ro, Gangseo-gu, Seoul, Republic of Korea",
      ru: "6, 7, 10 этаж, 93 Магокчунан 6-ро, Кансо-гу, Сеул, Республика Корея",
      kz: "6, 7, 10 қабат, 93 Магокчунан 6-ро, Кансо-гу, Сеул, Корея Республикасы",
      zh: "韩国首尔特别市江西区麻谷中央6路93号 6·7·10层",
      ja: "大韓民国ソウル特別市江西区麻谷中央6路93 6・7・10階",
    },
    hours: {
      ko: "평일 09:00–20:00 · 토·일·공휴일 09:00–15:00",
      en: "Weekdays 09:00–20:00 · Weekends & holidays 09:00–15:00",
      ru: "Будни 09:00–20:00 · Выходные и праздники 09:00–15:00",
      kz: "Жұмыс күндері 09:00–20:00 · Демалыс және мереке 09:00–15:00",
      zh: "工作日 09:00–20:00 · 周末及节假日 09:00–15:00",
      ja: "平日 09:00–20:00 · 土日祝 09:00–15:00",
    },
    channels: {
      // 목업이라 healwith 채널을 그대로 씀 — 실제 구축 때는 병원 전용 번호를 새로 받아야 한다.
      whatsapp: "https://wa.me/821047721075",
    },
    // 주소를 그대로 넘기는 검색 주소 — 지도 이미지를 우리가 저장하지 않는다
    // (카카오/구글 지도 이미지는 저작물이고, 지점이 바뀌면 조용히 틀린 그림이 남는다).
    mapUrl: "https://map.kakao.com/?q=%EB%A9%B4%EB%A0%A5%ED%95%9C%EB%B0%A9%EB%B3%91%EC%9B%90%20%EB%A7%88%EA%B3%A1",
  },


  /* ══ 지점 4곳 ══
     PO 지적(2026-07-29): *"4개 지점도 우리 힐위드에서 쓰던 외관 사진 쓰면 좋지 않겄냐?"* — 맞았다.
     `public/images/hospitals/immunehospital-*` 에 **4개 지점 × 5장 = 20장**이 이미 있었는데
     나는 마곡(강서) 것만 쓰고 있었다. (또 「있는 자산부터 뒤져라」를 어겼다.)
     ⚠️ 주소는 DB 에 광명·성동이 비어 있어 **각 지점 사이트에서 직접 확인**해 채웠다
        (km./sc./sd..immunehospital.com 푸터 = 법정 공개 정보).
     해외 환자에게 지점 안내는 «자랑»이 아니라 **「어디로 가면 되나」라는 실제 질문**이다. */
  branchesTitle: {
    ko: "어느 지점으로 오시면 되나",
    en: "Which branch to visit",
    ru: "В какой филиал приехать",
    kz: "Қай филиалға келу керек",
    zh: "该前往哪家院区",
    ja: "どの院にお越しいただくか",
  },
  branchesLead: {
    ko: "서울 3곳·경기 1곳. 치료 내용은 같고, 입원 가능 여부와 위치가 다릅니다. 어디로 오실지는 상담 때 함께 정합니다.",
    en: "Three in Seoul, one in Gyeonggi. The treatment is the same; what differs is location and inpatient capacity. We decide together during your consultation.",
    ru: "Три в Сеуле, один в Кёнги. Лечение одинаковое — различаются расположение и возможность стационара. Выберем вместе на консультации.",
    kz: "Сеулде үшеу, Кёнгиде біреу. Ем бірдей — орналасуы мен стационар мүмкіндігі әртүрлі. Кеңес кезінде бірге таңдаймыз.",
    zh: "首尔3家、京畿1家。诊疗内容相同，区别在于位置与住院条件。前往哪家将在咨询时共同确定。",
    ja: "ソウル3か所・京畿1か所。治療内容は同じで、立地と入院可否が異なります。どこに来ていただくかは相談時に一緒に決めます。",
  },
  branches: [
    {
      image: "/images/hospitals/immunehospital-magok/1.jpg",
      name: {ko:  "강서(마곡) 본원", en:  "Gangseo (Magok) — Main", ru:  "Кансо (Магок) — главный", kz:  "Кансо (Магок) — бас", zh:  "江西（麻谷）总院", ja:  "江西（麻谷）本院"},
      address: {ko:  "서울 강서구 마곡중앙6로 93 열린프라자 6·7·10층", en:  "6F·7F·10F, Yeollin Plaza, 93 Magokjungang 6-ro, Gangseo-gu, Seoul", ru:  "6, 7, 10 эт., Ёллин Плаза, 93 Магокчунан 6-ро, Кансо-гу, Сеул", kz:  "6, 7, 10 қабат, Ёллин Плаза, 93 Магокчунан 6-ро, Кансо-гу, Сеул", zh:  "首尔市江西区麻谷中央6路93号 悦邻广场 6·7·10层", ja:  "ソウル市江西区麻谷中央6路93 ヨルリンプラザ 6・7・10階"},
      note: {ko:  "암면역·신경면역·재활 3개 센터", en:  "Three centers: cancer, neuro-immunity, rehabilitation", ru:  "Три центра: онкоиммунология, нейроиммунология, реабилитация", kz:  "Үш орталық: онкоиммунология, нейроиммунология, оңалту", zh:  "三大中心：癌症免疫·神经免疫·康复", ja:  "3センター：がん免疫・神経免疫・リハビリ"},
      phone: "1588-2915",
    },
    {
      image: "/images/hospitals/immunehospital-sinchon/1.jpg",
      name: {ko:  "신촌점", en:  "Sinchon", ru:  "Синчон", kz:  "Синчон", zh:  "新村院区", ja:  "新村院"},
      address: {ko:  "서울 서대문구 연세로 12 8~14층", en:  "8F–14F, 12 Yonsei-ro, Seodaemun-gu, Seoul", ru:  "8–14 эт., 12 Ёнсе-ро, Содэмун-гу, Сеул", kz:  "8–14 қабат, 12 Ёнсе-ро, Содэмун-гу, Сеул", zh:  "首尔市西大门区延世路12号 8~14层", ja:  "ソウル市西大門区延世路12 8〜14階"},
      note: {ko:  "연세대 인근 · 1인 병실 중심", en:  "Near Yonsei University · private rooms", ru:  "Рядом с университетом Ёнсе · одноместные палаты", kz:  "Ёнсе университетіне жақын · жеке палаталар", zh:  "邻近延世大学·以单人病房为主", ja:  "延世大学近く・個室中心"},
      phone: "1588-2915",
    },
    {
      image: "/images/hospitals/immunehospital-seongdong/1.jpg",
      name: {ko:  "성동점", en:  "Seongdong", ru:  "Сондон", kz:  "Сондон", zh:  "城东院区", ja:  "城東院"},
      address: {ko:  "서울 성동구 천호대로 320, 2~7층·B101호 (용답동 장안빌딩)", en:  "2F–7F & B101, Jangan Bldg, 320 Cheonho-daero, Seongdong-gu, Seoul", ru:  "2–7 эт. и B101, зд. Чанан, 320 Чонхо-даэро, Сондон-гу, Сеул", kz:  "2–7 қабат және B101, Чанан ғимараты, 320 Чонхо-даэро, Сондон-гу, Сеул", zh:  "首尔市城东区川虎大路320号 长安大厦 2~7层·B101", ja:  "ソウル市城東区川虎大路320 チャンアンビル 2〜7階・B101"},
      note: {ko:  "건물 전체 사용 · 지하철 용답역 인근", en:  "Whole building · near Yongdap Station", ru:  "Всё здание · рядом со станцией Ёндап", kz:  "Бүкіл ғимарат · Ёндап станциясына жақын", zh:  "整栋使用·邻近龙踏站", ja:  "建物全体・龍踏駅近く"},
      phone: "02-2295-8510",
    },
    {
      image: "/images/hospitals/immunehospital-gwangmyeong/1.jpg",
      name: {ko:  "광명점", en:  "Gwangmyeong", ru:  "Кванмён", kz:  "Кванмён", zh:  "光明院区", ja:  "光明院"},
      address: {ko:  "경기 광명시 철산로 16 트라이앵글빌딩 6층·8~11층", en:  "6F, 8F–11F, Triangle Bldg, 16 Cheolsan-ro, Gwangmyeong-si, Gyeonggi", ru:  "6, 8–11 эт., зд. Триангл, 16 Чольсан-ро, Кванмён, Кёнги", kz:  "6, 8–11 қабат, Триангл ғимараты, 16 Чольсан-ро, Кванмён, Кёнги", zh:  "京畿道光明市铁山路16号 三角大厦 6层·8~11层", ja:  "京畿道光明市鉄山路16 トライアングルビル 6階・8〜11階"},
      note: {ko:  "수도권 서남부 · 지하철 철산역 인근", en:  "Southwest metro area · near Cheolsan Station", ru:  "Юго-запад столичного региона · рядом со станцией Чольсан", kz:  "Астана маңының оңтүстік-батысы · Чольсан станциясына жақын", zh:  "首都圈西南部·邻近铁山站", ja:  "首都圏南西部・鉄山駅近く"},
      phone: "1588-2915",
    },
  ],

  /* 맨 위 공지 띠. 유앤아이의원은 여기에 「확장 오픈」을 건다.
     해외 환자용 병원에서 이 자리에 걸 값은 «지금 오면 뭐가 되는가» — 통역·검사 일정 같은 것.
     ⚠️ 병원이 확인해 준 사실만 적는다. 아래는 이미 화면 다른 곳에 있는 사실(러시아어 상담)의 재진술. */
  announcement: {
    text: {
      ko: "러시아어·카자흐어 상담 가능 · 진단서와 검사 결과를 보내시면 2일 안에 회신드립니다",
      en: "Russian & Kazakh consultation available · Send your records and we reply within 2 days",
      ru: "Консультация на русском и казахском · Пришлите выписку — ответим в течение 2 дней",
      kz: "Орыс және қазақ тілінде кеңес · Құжаттарыңызды жіберіңіз, 2 күнде жауап береміз",
      zh: "提供俄语·哈萨克语咨询 · 发送诊断与检查结果，2日内回复",
      ja: "ロシア語・カザフ語の相談可 · 診断書と検査結果をお送りいただければ2日以内に返信します",
    },
  },

  /* ══ 치료 메뉴 — 「내 경우엔 뭘 받나」를 골라 보는 자리 ══
     유앤아이의원 실측: 필터 칩 20여 개 + 카드 격자가 화면 한가운데를 차지한다.
     ⚠️ 그쪽은 **취소선 정가 + 빨간 할인가**를 박는다. 암 치료는 상태에 따라 달라져
        «정찰가»가 없고, 확정 안 된 금액을 적으면 허위가 된다. 그래서 금액 대신
        해외 환자가 실제로 묻는 **기간·포함내역·입원 여부**를 박았다.
     여기 적힌 내용은 전부 이미 이 파일의 다른 섹션(진료 분야·프로그램)에 있는 사실의 재배열이다.
     ✅ 병원에서 받아야 채워지는 칸 = `priceNote`(전부 비어 있음). */
  menu: {
    title: {
      ko: "내 경우엔 무엇을 받게 되나",
      en: "What treatment would I receive",
      ru: "Какое лечение я получу",
      kz: "Мен қандай ем аламын",
      zh: "我会接受哪些治疗",
      ja: "私の場合はどの治療を受けるのか",
    },
    lead: {
      ko: "암종을 누르면 해당하는 것만 남습니다. 기간·포함 내역과 병원이 공개한 비급여 금액을 먼저 보고 상담하세요.",
      en: "Tap your diagnosis to filter. Duration, what's included and the hospital's published rates are shown before you ask.",
      ru: "Выберите диагноз — останется только подходящее. Сначала посмотрите сроки и что входит.",
      kz: "Диагнозды таңдаңыз — тек қатыстысы қалады. Алдымен мерзім мен не кіретінін қараңыз.",
      zh: "点击癌种即可筛选。先了解疗程与包含内容，再进行咨询。",
      ja: "がん種を選ぶと該当するものだけが残ります。期間と含まれる内容を先にご確認ください。",
    },
    labels: {
      all: { ko: "전체", en: "All", ru: "Все", kz: "Барлығы", zh: "全部", ja: "すべて" },
      duration: { ko: "기간", en: "Duration", ru: "Срок", kz: "Мерзімі", zh: "疗程", ja: "期間" },
      includes: { ko: "포함", en: "Includes", ru: "Входит", kz: "Кіреді", zh: "包含", ja: "含む" },
      stay: { ko: "입원", en: "Stay", ru: "Пребывание", kz: "Жату", zh: "住院", ja: "入院" },
      ask: { ko: "이 치료 문의하기", en: "Ask about this", ru: "Спросить об этом", kz: "Осы туралы сұрау", zh: "咨询此项", ja: "この治療を相談" },
    },
    note: {
      ko: "※ 위 금액은 면력한방병원이 법에 따라 공개한 비급여 진료비(2026.06.16 고지)에서 옮긴 것으로, 항목 1회 기준입니다. 처방·상태에 따라 실제 비용은 달라지며, 전체 항목은 병원 「비급여안내」에서 볼 수 있습니다. 진단서와 검사 결과를 보내주시면 병원이 확인한 예상 범위를 회신드립니다.",
      en: "※ The amounts above are taken from the hospital's legally published uninsured price list (posted 2026-06-16) and are per single item. Actual cost varies with the prescription and your condition. Send your records and the hospital replies with a confirmed estimate range.",
      ru: "※ Суммы выше взяты из официально опубликованного прейскуранта клиники на услуги вне страховки (от 16.06.2026) и указаны за одну процедуру. Итоговая стоимость зависит от назначений и состояния. Пришлите документы — клиника ответит с подтверждённым диапазоном.",
      kz: "※ Жоғарыдағы сомалар клиниканың заңға сай жарияланған сақтандырусыз баға тізімінен (16.06.2026) алынған, бір рет үшін. Нақты құн тағайындау мен жағдайға байланысты өзгереді. Құжаттарыңызды жіберіңіз — клиника расталған баға аралығын жібереді.",
      zh: "※ 上述金额取自医院依法公示的非医保诊疗费（2026.06.16公示），按单项单次计。实际费用因处方与病情而异。发送诊断与检查结果后，医院将回复确认的预估范围。",
      ja: "※ 上記金額は病院が法令に基づき公示した非給付診療費（2026.06.16告示）から転記したもので、項目1回あたりです。実際の費用は処方・状態により異なります。診断書と検査結果をお送りいただければ、病院が確認した概算範囲をお返しします。",
    },
    items: [
      {
        image: "/immune/facility/treatment-iv-inprogress.jpg",
        tags: [
          { key: "breast", label: { ko: "유방/자궁/난소암", en: "Breast · Uterine · Ovarian", ru: "Рак груди, матки, яичников", kz: "Сүт безі, жатыр, аналық без обыры", zh: "乳腺/子宫/卵巢癌", ja: "乳がん・子宮・卵巣がん" } },
          { key: "gastro", label: { ko: "대장/위암", en: "Colorectal · Gastric", ru: "Рак толстой кишки и желудка", kz: "Тоқ ішек және асқазан обыры", zh: "结直肠/胃癌", ja: "大腸・胃がん" } },
          { key: "liver", label: { ko: "간/담도/췌장암", en: "Liver · Biliary · Pancreatic", ru: "Рак печени, желчных путей, поджелудочной", kz: "Бауыр, өт жолы, ұйқы безі обыры", zh: "肝/胆道/胰腺癌", ja: "肝・胆道・膵臓がん" } },
          { key: "lung", label: { ko: "폐암", en: "Lung cancer", ru: "Рак лёгкого", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" } },
          { key: "thyroid", label: { ko: "갑상선암", en: "Thyroid cancer", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" } },
          { key: "other", label: { ko: "기타암", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌症", ja: "その他のがん" } },
        ],
        title: { ko: "면역·영양 수액 프로그램", en: "Immune & Nutrition IV Program", ru: "Программа иммунных и питательных капельниц", kz: "Иммундық және нутритивтік тамшы бағдарламасы", zh: "免疫·营养输液项目", ja: "免疫・栄養点滴プログラム" },
        desc: {
          ko: "항암 중 떨어진 체력과 면역을 받쳐주는 정맥·근육 주사를 주기로 맞습니다.",
          en: "Scheduled IV and IM injections that support strength and immunity lowered by chemotherapy.",
          ru: "Плановые внутривенные и внутримышечные инъекции для поддержки сил и иммунитета, сниженных химиотерапией.",
          kz: "Химиотерапиядан төмендеген күш пен иммунитетті қолдайтын жоспарлы вена және бұлшықет инъекциялары.",
          zh: "按周期进行的静脉·肌肉注射，支撑化疗期间下降的体力与免疫力。",
          ja: "抗がん剤治療で低下した体力と免疫を支える静脈・筋肉注射を定期的に行います。",
        },
        duration: { ko: "2~4주 (주 2~3회)", en: "2–4 weeks (2–3× a week)", ru: "2–4 недели (2–3 раза в неделю)", kz: "2–4 апта (аптасына 2–3 рет)", zh: "2~4周（每周2~3次）", ja: "2〜4週間（週2〜3回）" },
        includes: { ko: "항염증 수액 · 점막면역 · 고용량 비타민 D", en: "Anti-inflammatory IV · mucosal immunity · high-dose vitamin D", ru: "Противовоспалительная капельница · слизистый иммунитет · витамин D", kz: "Қабынуға қарсы тамшы · шырышты иммунитет · D дәрумені", zh: "抗炎输液 · 黏膜免疫 · 高剂量维生素D", ja: "抗炎症点滴 · 粘膜免疫 · 高用量ビタミンD" },
        stay: { ko: "통원 가능 (입원 선택)", en: "Outpatient (inpatient optional)", ru: "Амбулаторно (стационар по желанию)", kz: "Амбулаторлық (стационар таңдау бойынша)", zh: "可门诊（可选住院）", ja: "通院可（入院は選択）" },
        priceNote: {
          ko: "비급여 참고가 — 이스카도·압노바 100,000원 · 라이넥 30,000원 · 글루타치온 60,000원 (1회, 2026.06.16 고지)",
          en: "Published rates — Iscador/Abnoba ₩100,000 · Laennec ₩30,000 · Glutathione ₩60,000 (per dose, posted 2026-06-16)",
          ru: "Опубликованные цены — Искадор/Абноба 100 000 ₩ · Лаэннек 30 000 ₩ · Глутатион 60 000 ₩ (за дозу, от 16.06.2026)",
          kz: "Жарияланған баға — Искадор/Абноба 100 000 ₩ · Лаэннек 30 000 ₩ · Глутатион 60 000 ₩ (бір рет, 16.06.2026)",
          zh: "公示价格 — 槲寄生制剂 100,000韩元 · 爱茉 30,000韩元 · 谷胱甘肽 60,000韩元（每次，2026.06.16公示）",
          ja: "公示価格 — イスカドール/アブノーバ 100,000ウォン · ラエンネック 30,000ウォン · グルタチオン 60,000ウォン（1回・2026.06.16告示）",
        },
      },
      {
        image: "/immune/facility/treatment-device-inprogress.jpg",
        tags: [
          { key: "neuro", label: { ko: "신경 (대상포진·안면마비)", en: "Neuro (shingles · facial palsy)", ru: "Неврология (опоясывающий лишай, парез лица)", kz: "Неврология (белдеме теміреткі, бет салдануы)", zh: "神经（带状疱疹·面瘫）", ja: "神経（帯状疱疹・顔面麻痺）" } },
          { key: "rehab", label: { ko: "재활 (수술 후·사고)", en: "Rehab (post-op · accident)", ru: "Реабилитация (после операции, ДТП)", kz: "Оңалту (отадан кейін, апат)", zh: "康复（术后·事故）", ja: "リハビリ（術後・事故）" } },
          { key: "other", label: { ko: "기타암", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌症", ja: "その他のがん" } },
        ],
        title: { ko: "재생·회복 치료", en: "Regenerative Recovery", ru: "Регенеративное восстановление", kz: "Регенеративті қалпына келтіру", zh: "再生·恢复治疗", ja: "再生・回復治療" },
        desc: {
          ko: "항암 뒤 남은 손발 저림 같은 신경·조직 손상의 회복을 돕는 주사와 냉각치료입니다.",
          en: "Injections and cryotherapy for nerve and tissue damage such as numbness left after chemotherapy.",
          ru: "Инъекции и криотерапия при повреждении нервов и тканей, например при онемении после химиотерапии.",
          kz: "Химиотерапиядан кейінгі ұю сияқты жүйке және тін зақымына арналған инъекция мен криотерапия.",
          zh: "针对化疗后残留的手足麻木等神经·组织损伤的注射与冷冻治疗。",
          ja: "抗がん剤治療後に残るしびれなど、神経・組織の損傷回復を助ける注射と冷却治療です。",
        },
        duration: { ko: "4~8주", en: "4–8 weeks", ru: "4–8 недель", kz: "4–8 апта", zh: "4~8周", ja: "4〜8週間" },
        includes: { ko: "pDRN 신경주사 · 냉각치료(CRYO) · 자가재생 치료(GFC)", en: "pDRN nerve injection · cryotherapy · autologous regeneration (GFC)", ru: "Нейроинъекция pDRN · криотерапия · аутологичная регенерация (GFC)", kz: "pDRN жүйке инъекциясы · криотерапия · аутологиялық регенерация (GFC)", zh: "pDRN神经注射 · 冷冻治疗 · 自体再生治疗(GFC)", ja: "pDRN神経注射 · 冷却治療 · 自家再生治療(GFC)" },
        stay: { ko: "통원", en: "Outpatient", ru: "Амбулаторно", kz: "Амбулаторлық", zh: "门诊", ja: "通院" },
        priceNote: {
          ko: "비급여 참고가 — 냉각치료(CRYO) 3분 100,000원 · 체외충격파 180,000원 · 고주파 온열치료 250,000원 (2026.06.16 고지)",
          en: "Published rates — Cryotherapy 3 min ₩100,000 · Shockwave ₩180,000 · RF hyperthermia ₩250,000 (posted 2026-06-16)",
          ru: "Опубликованные цены — Криотерапия 3 мин 100 000 ₩ · Ударно-волновая 180 000 ₩ · РЧ-гипертермия 250 000 ₩ (16.06.2026)",
          kz: "Жарияланған баға — Криотерапия 3 мин 100 000 ₩ · Соққы толқыны 180 000 ₩ · РЖ гипертермия 250 000 ₩ (16.06.2026)",
          zh: "公示价格 — 冷冻治疗3分钟 100,000韩元 · 体外冲击波 180,000韩元 · 高频热疗 250,000韩元（2026.06.16公示）",
          ja: "公示価格 — 冷却治療3分 100,000ウォン · 体外衝撃波 180,000ウォン · 高周波温熱治療 250,000ウォン（2026.06.16告示）",
        },
      },
      {
        image: "/immune/facility/facility-treatment-suite-1.jpg",
        tags: [
          { key: "breast", label: { ko: "유방/자궁/난소암", en: "Breast · Uterine · Ovarian", ru: "Рак груди, матки, яичников", kz: "Сүт безі, жатыр, аналық без обыры", zh: "乳腺/子宫/卵巢癌", ja: "乳がん・子宮・卵巣がん" } },
          { key: "gastro", label: { ko: "대장/위암", en: "Colorectal · Gastric", ru: "Рак толстой кишки и желудка", kz: "Тоқ ішек және асқазан обыры", zh: "结直肠/胃癌", ja: "大腸・胃がん" } },
          { key: "liver", label: { ko: "간/담도/췌장암", en: "Liver · Biliary · Pancreatic", ru: "Рак печени, желчных путей, поджелудочной", kz: "Бауыр, өт жолы, ұйқы безі обыры", zh: "肝/胆道/胰腺癌", ja: "肝・胆道・膵臓がん" } },
          { key: "lung", label: { ko: "폐암", en: "Lung cancer", ru: "Рак лёгкого", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" } },
          { key: "thyroid", label: { ko: "갑상선암", en: "Thyroid cancer", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" } },
          { key: "other", label: { ko: "기타암", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌症", ja: "その他のがん" } },
        ],
        title: { ko: "한약 처방 (한·양방 협진)", en: "Korean Medicine Prescription", ru: "Назначение корейской медицины", kz: "Корей медицинасының тағайындауы", zh: "韩药处方（韩·西医协诊）", ja: "韓方処方（韓・西洋医協診）" },
        desc: {
          ko: "체질과 치료 단계에 맞춰 조제하는 개인 처방. 한방·양방 대표원장이 같이 방향을 정합니다.",
          en: "Individually compounded prescriptions matched to constitution and treatment stage, decided jointly by the Korean-medicine and Western-medicine directors.",
          ru: "Индивидуальные назначения по конституции и стадии лечения — направление определяют вместе главврачи корейской и западной медицины.",
          kz: "Дене бітімі мен ем сатысына сай жеке тағайындау — бағытты корей және батыс медицинасының бас дәрігерлері бірге шешеді.",
          zh: "根据体质与治疗阶段调配的个人处方，由韩医与西医院长共同决定方向。",
          ja: "体質と治療段階に合わせて調剤する個人処方。韓方・西洋医の代表院長が一緒に方針を決めます。",
        },
        duration: { ko: "1개월 단위 재평가", en: "Reviewed monthly", ru: "Пересмотр раз в месяц", kz: "Ай сайын қайта бағалау", zh: "每月复评", ja: "1か月ごとに再評価" },
        includes: { ko: "개인 맞춤 처방 · 공진단(녹용·원방) · 소경활혈탕", en: "Custom prescription · Gongjindan · Sogyeonghwalhyeol-tang", ru: "Индивидуальный сбор · Конджиндан · Согёнхвальхёль-тан", kz: "Жеке тағайындау · Гонджиндан · Согёнхвальхёль-тан", zh: "个人定制处方 · 拱辰丹（鹿茸·原方）· 疏经活血汤", ja: "個人処方 · 拱辰丹（鹿茸・原方）· 疎経活血湯" },
        stay: { ko: "통원", en: "Outpatient", ru: "Амбулаторно", kz: "Амбулаторлық", zh: "门诊", ja: "通院" },
        priceNote: {
          ko: "비급여 참고가 — 녹용공진단 10환 200,000원 · 원방공진단 10환 550,000원 · 항암단 60,000원 (2026.06.16 고지)",
          en: "Published rates — Gongjindan (deer antler) 10 pills ₩200,000 · original formula ₩550,000 · Hangam-dan ₩60,000 (posted 2026-06-16)",
          ru: "Опубликованные цены — Конджиндан 10 шт 200 000 ₩ · оригинальная формула 550 000 ₩ · Хангам-дан 60 000 ₩ (16.06.2026)",
          kz: "Жарияланған баға — Гонджиндан 10 дана 200 000 ₩ · түпнұсқа формула 550 000 ₩ · Хангам-дан 60 000 ₩ (16.06.2026)",
          zh: "公示价格 — 鹿茸拱辰丹10丸 200,000韩元 · 原方拱辰丹 550,000韩元 · 抗癌丹 60,000韩元（2026.06.16公示）",
          ja: "公示価格 — 鹿茸拱辰丹10丸 200,000ウォン · 原方拱辰丹 550,000ウォン · 抗がん丹 60,000ウォン（2026.06.16告示）",
        },
      },
      {
        image: "/immune/facility/treatment-care-inprogress.jpg",
        tags: [
          { key: "rehab", label: { ko: "재활 (수술 후·사고)", en: "Rehab (post-op · accident)", ru: "Реабилитация (после операции, ДТП)", kz: "Оңалту (отадан кейін, апат)", zh: "康复（术后·事故）", ja: "リハビリ（術後・事故）" } },
          { key: "breast", label: { ko: "유방/자궁/난소암", en: "Breast · Uterine · Ovarian", ru: "Рак груди, матки, яичников", kz: "Сүт безі, жатыр, аналық без обыры", zh: "乳腺/子宫/卵巢癌", ja: "乳がん・子宮・卵巣がん" } },
          { key: "other", label: { ko: "기타암", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌症", ja: "その他のがん" } },
        ],
        title: { ko: "수술 후 재활", en: "Post-surgical Rehabilitation", ru: "Реабилитация после операции", kz: "Отадан кейінгі оңалту", zh: "术后康复", ja: "術後リハビリ" },
        desc: {
          ko: "수술 후 재활, 부인과 수술 후 회복, 교통사고 후유증까지 재활센터에서 이어집니다.",
          en: "Rehabilitation after surgery, recovery following gynecologic operations, and post-accident care — all in the rehabilitation center.",
          ru: "Реабилитация после операций, восстановление после гинекологических вмешательств и последствия ДТП — всё в центре реабилитации.",
          kz: "Отадан кейінгі оңалту, гинекологиялық оталардан кейінгі қалпына келу және жол апатының салдары — бәрі оңалту орталығында.",
          zh: "术后康复、妇科手术后恢复、交通事故后遗症，均在康复中心进行。",
          ja: "術後リハビリ、婦人科手術後の回復、交通事故後遺症まで、リハビリセンターで続きます。",
        },
        duration: { ko: "상태에 따라 (재평가 주 1회)", en: "Varies (weekly review)", ru: "По состоянию (пересмотр раз в неделю)", kz: "Жағдайға қарай (аптасына бір рет)", zh: "视状态而定（每周复评）", ja: "状態により（週1回の再評価）" },
        includes: { ko: "도수·운동 재활 · 통증 관리", en: "Manual and exercise therapy · pain management", ru: "Мануальная и лечебная физкультура · контроль боли", kz: "Қол және жаттығу терапиясы · ауырсынуды бақылау", zh: "手法·运动康复 · 疼痛管理", ja: "徒手・運動リハビリ · 疼痛管理" },
        stay: { ko: "입원 가능", en: "Inpatient available", ru: "Возможен стационар", kz: "Стационар мүмкін", zh: "可住院", ja: "入院可" },
        priceNote: {
          ko: "비급여 참고가 — 재활치료 30분 120,000원 · 50분 200,000원 · 60분 230,000원 · 70분 280,000원 (2026.06.16 고지)",
          en: "Published rates — Rehab 30 min ₩120,000 · 50 min ₩200,000 · 60 min ₩230,000 · 70 min ₩280,000 (posted 2026-06-16)",
          ru: "Опубликованные цены — Реабилитация 30 мин 120 000 ₩ · 50 мин 200 000 ₩ · 60 мин 230 000 ₩ · 70 мин 280 000 ₩ (16.06.2026)",
          kz: "Жарияланған баға — Оңалту 30 мин 120 000 ₩ · 50 мин 200 000 ₩ · 60 мин 230 000 ₩ · 70 мин 280 000 ₩ (16.06.2026)",
          zh: "公示价格 — 康复治疗30分钟 120,000韩元 · 50分钟 200,000韩元 · 60分钟 230,000韩元 · 70分钟 280,000韩元（2026.06.16公示）",
          ja: "公示価格 — リハビリ30分 120,000ウォン · 50分 200,000ウォン · 60分 230,000ウォン · 70分 280,000ウォン（2026.06.16告示）",
        },
      },
      {
        image: "/immune/facility/facility-lounge-sofa-1.jpg",
        tags: [
          { key: "breast", label: { ko: "유방/자궁/난소암", en: "Breast · Uterine · Ovarian", ru: "Рак груди, матки, яичников", kz: "Сүт безі, жатыр, аналық без обыры", zh: "乳腺/子宫/卵巢癌", ja: "乳がん・子宮・卵巣がん" } },
          { key: "gastro", label: { ko: "대장/위암", en: "Colorectal · Gastric", ru: "Рак толстой кишки и желудка", kz: "Тоқ ішек және асқазан обыры", zh: "结直肠/胃癌", ja: "大腸・胃がん" } },
          { key: "liver", label: { ko: "간/담도/췌장암", en: "Liver · Biliary · Pancreatic", ru: "Рак печени, желчных путей, поджелудочной", kz: "Бауыр, өт жолы, ұйқы безі обыры", zh: "肝/胆道/胰腺癌", ja: "肝・胆道・膵臓がん" } },
          { key: "lung", label: { ko: "폐암", en: "Lung cancer", ru: "Рак лёгкого", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" } },
          { key: "thyroid", label: { ko: "갑상선암", en: "Thyroid cancer", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" } },
          { key: "other", label: { ko: "기타암", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌症", ja: "その他のがん" } },
        ],
        title: { ko: "면역 식단 · 병원 생활", en: "Immune Meals & Daily Life", ru: "Иммунное питание и быт", kz: "Иммундық тамақ және күнделікті өмір", zh: "免疫饮食·住院生活", ja: "免疫食・病院生活" },
        desc: {
          ko: "병원에서 직접 준비하는 치료식과 원데이 클래스. 치료 중에도 하루가 비어 있지 않게 합니다.",
          en: "Therapeutic meals prepared in-house and one-day classes, so days in treatment are not empty.",
          ru: "Лечебное питание собственного приготовления и однодневные занятия — чтобы дни лечения не были пустыми.",
          kz: "Ауруханада дайындалатын емдік тамақ және бір күндік сабақтар — ем күндері бос болмауы үшін.",
          zh: "院内自制治疗餐与一日课程，让治疗期间的每一天都不空虚。",
          ja: "院内で用意する治療食とワンデイクラス。治療中の一日が空にならないようにします。",
        },
        duration: { ko: "입원 기간 내내", en: "Throughout the stay", ru: "Весь период пребывания", kz: "Жату кезеңі бойы", zh: "住院期间全程", ja: "入院期間中ずっと" },
        includes: { ko: "셰프 특식 · 면역밥상 · 자개공예·화과자 클래스", en: "Chef's specials · immune meals · mother-of-pearl craft and wagashi classes", ru: "Блюда от шефа · иммунное меню · мастер-классы (перламутр, вагаси)", kz: "Аспаз тағамдары · иммундық ас · қолөнер сабақтары", zh: "主厨特餐 · 免疫餐 · 螺钿工艺·和果子课程", ja: "シェフ特別食 · 免疫ごはん · 螺鈿工芸・和菓子クラス" },
        stay: { ko: "입원", en: "Inpatient", ru: "Стационар", kz: "Стационар", zh: "住院", ja: "入院" },
        priceNote: "", // 이 카드는 입원비에 포함되는 내용이라 별도 고지 항목이 없다
      },
      {
        image: "/immune/facility/facility-treatment-bed-1.jpg",
        tags: [
          { key: "breast", label: { ko: "유방/자궁/난소암", en: "Breast · Uterine · Ovarian", ru: "Рак груди, матки, яичников", kz: "Сүт безі, жатыр, аналық без обыры", zh: "乳腺/子宫/卵巢癌", ja: "乳がん・子宮・卵巣がん" } },
          { key: "gastro", label: { ko: "대장/위암", en: "Colorectal · Gastric", ru: "Рак толстой кишки и желудка", kz: "Тоқ ішек және асқазан обыры", zh: "结直肠/胃癌", ja: "大腸・胃がん" } },
          { key: "liver", label: { ko: "간/담도/췌장암", en: "Liver · Biliary · Pancreatic", ru: "Рак печени, желчных путей, поджелудочной", kz: "Бауыр, өт жолы, ұйқы безі обыры", zh: "肝/胆道/胰腺癌", ja: "肝・胆道・膵臓がん" } },
          { key: "lung", label: { ko: "폐암", en: "Lung cancer", ru: "Рак лёгкого", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" } },
          { key: "thyroid", label: { ko: "갑상선암", en: "Thyroid cancer", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" } },
          { key: "other", label: { ko: "기타암", en: "Other cancers", ru: "Другие виды рака", kz: "Басқа обыр түрлері", zh: "其他癌症", ja: "その他のがん" } },
        ],
        title: { ko: "1인 병실 · 보호자 동반", en: "Private Room with Companion", ru: "Одноместная палата с сопровождающим", kz: "Серіктесі бар жеке палата", zh: "单人病房·陪同入住", ja: "個室・付き添い可" },
        desc: {
          ko: "1인 병실과 회복 라운지. 보호자가 함께 머무를 수 있어 먼 길을 온 가족이 흩어지지 않습니다.",
          en: "Private rooms and a recovery lounge. A companion can stay, so families who travelled far are not split up.",
          ru: "Одноместные палаты и лаунж для восстановления. Сопровождающий может остаться — семья, приехавшая издалека, не разделяется.",
          kz: "Жеке палаталар және демалыс лаунджы. Серіктес бірге қала алады — алыстан келген отбасы бөлінбейді.",
          zh: "单人病房与康复休息区。陪同者可一同入住，远道而来的家人不必分开。",
          ja: "個室と回復ラウンジ。付き添いが一緒に滞在でき、遠方から来たご家族が離れずに済みます。",
        },
        duration: { ko: "치료 일정에 맞춰", en: "Matched to the treatment schedule", ru: "По графику лечения", kz: "Ем кестесіне сай", zh: "配合治疗日程", ja: "治療日程に合わせて" },
        includes: { ko: "1인 병실 · 회복 라운지 · 보호자 동반", en: "Private room · recovery lounge · companion stay", ru: "Одноместная палата · лаунж · сопровождающий", kz: "Жеке палата · лаундж · серіктес", zh: "单人病房 · 康复休息区 · 陪同", ja: "個室 · 回復ラウンジ · 付き添い" },
        stay: { ko: "입원", en: "Inpatient", ru: "Стационар", kz: "Стационар", zh: "住院", ja: "入院" },
        priceNote: {
          ko: "비급여 참고가 — 상급병실 1일 200,000~600,000원 (2026.06.16 고지)",
          en: "Published rate — Upgraded room ₩200,000–600,000 per night (posted 2026-06-16)",
          ru: "Опубликованная цена — Палата повышенной комфортности 200 000–600 000 ₩ за ночь (16.06.2026)",
          kz: "Жарияланған баға — Жоғары деңгейлі палата тәулігіне 200 000–600 000 ₩ (16.06.2026)",
          zh: "公示价格 — 高级病房 每日 200,000~600,000韩元（2026.06.16公示）",
          ja: "公示価格 — 上級病室 1日 200,000〜600,000ウォン（2026.06.16告示）",
        },
      },
    ],
  },

  /* ══ 상담 신청 폼 — 페이지 «안»에서 신청하게 한다 ══
     ⚠️ 개인정보를 다루므로 판이 마음대로 어디로 보내지 않는다. 받는 곳이 정해지기 전에는
        적은 내용을 그대로 담아 **방문자가 직접 고른 메신저로 넘긴다**(브라우저 밖으로 나가는 곳은
        그 채널뿐). 실제 구축 때 병원이 받는 주소를 정하면 그리로 바꾼다.
     ✅ 병원에서 받아야 하는 것: 개인정보 수집·이용 동의 문구(아래는 «목업»임을 명시한 임시 문구). */
  inquiryForm: {
    labels: {
      name: { ko: "이름", en: "Name", ru: "Имя", kz: "Аты", zh: "姓名", ja: "お名前" },
      contact: { ko: "연락처 (왓츠앱·이메일)", en: "WhatsApp or Email", ru: "WhatsApp или e-mail", kz: "WhatsApp немесе e-mail", zh: "WhatsApp 或邮箱", ja: "WhatsApp・メール" },
      concern: { ko: "진단명 또는 궁금한 점", en: "Diagnosis or concern", ru: "Диагноз или вопрос", kz: "Диагноз немесе сұрақ", zh: "诊断名称或疑问", ja: "診断名またはご相談内容" },
      message: { ko: "더 알려주실 내용", en: "Anything you'd like us to know", ru: "Что ещё нам следует знать", kz: "Бізге не білу керек", zh: "希望我们了解的内容", ja: "お伝えいただきたいこと" },
    },
    consent: {
      ko: "상담을 위해 입력한 내용이 병원에 전달되는 데 동의합니다. (시연용 화면 — 실제 수집·보관 문구는 병원 확인 후 확정)",
      en: "I agree that the details I entered are passed to the hospital for consultation. (Demo screen — the final privacy notice is confirmed with the hospital.)",
      ru: "Я согласен(на), что указанные данные будут переданы клинике для консультации. (Демо — окончательный текст согласия подтверждается клиникой.)",
      kz: "Енгізілген деректер кеңес алу үшін клиникаға берілуіне келісемін. (Демо — түпкілікті мәтін клиникамен расталады.)",
      zh: "我同意将所填内容转交医院用于咨询。（演示界面——最终隐私条款经医院确认后确定）",
      ja: "入力内容が相談のため病院に伝わることに同意します。（デモ画面 — 最終的な同意文は病院確認後に確定）",
    },
    submit: { ko: "상담 신청", en: "Request a consultation", ru: "Записаться на консультацию", kz: "Кеңеске жазылу", zh: "申请咨询", ja: "相談を申し込む" },
    after: {
      ko: "적으신 내용을 담아 상담 채널이 열립니다. 그 창에서 보내주시면 접수됩니다.",
      en: "Your message opens in the consultation channel — send it there to reach us.",
      ru: "Ваше сообщение откроется в канале консультаций — отправьте его там.",
      kz: "Хабарыңыз кеңес арнасында ашылады — сол жерден жіберіңіз.",
      zh: "您填写的内容将在咨询渠道中打开，请在该窗口发送。",
      ja: "入力内容を持って相談チャネルが開きます。その画面から送信してください。",
    },
    note: {
      ko: "※ 시연용 화면이라 아직 병원 서버로 저장되지 않습니다. 실제 구축 시 병원이 지정한 곳으로 접수됩니다.",
      en: "※ Demo screen — nothing is stored on a hospital server yet. In the live build, submissions go where the hospital specifies.",
      ru: "※ Демо — данные пока не сохраняются на сервере клиники. В рабочей версии заявки идут туда, куда укажет клиника.",
      kz: "※ Демо — деректер әзірге клиника серверінде сақталмайды. Нақты нұсқада клиника көрсеткен жерге түседі.",
      zh: "※ 演示界面，暂不保存至医院服务器。正式版本将发送至医院指定的接收处。",
      ja: "※ デモ画面のため、まだ病院サーバーには保存されません。実構築時は病院が指定する窓口に届きます。",
    },
  },

  legalNote: {
    ko: "※ 이 화면은 판(템플릿) 시연용 목업입니다. 법인정보·인증·환자 후기는 병원 확인 후 채웁니다.",
    en: "※ This page is a template demo. Legal details, certifications and patient stories are filled in after confirmation with the hospital.",
    ru: "※ Эта страница — демонстрация шаблона. Юридические данные, сертификаты и отзывы заполняются после подтверждения клиникой.",
    kz: "※ Бұл бет — үлгі демонстрациясы. Заңды деректер, сертификаттар және пікірлер клиника растағаннан кейін толтырылады.",
    zh: "※ 本页为模板演示。法人信息、认证与患者评价将在医院确认后填写。",
    ja: "※ このページはテンプレートのデモです。法人情報・認証・患者の声は病院の確認後に記載します。",
  },
};
