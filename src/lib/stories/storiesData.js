/**
 * HEALO 환자 스토리 / 후기
 *
 * ⚠️ 프라이버시 정책:
 * - 실제 환자 동의 받은 후기만 게재 (서면 또는 전자 동의서)
 * - 이름은 성 + 이니셜, 또는 완전 가명화
 * - 얼굴 사진은 동의자에 한함. 없으면 배경 사진으로 대체
 * - 아래는 샘플/데모 스토리이며, 실제 환자 후기는 coordinator가
 *   reviews 테이블에 입력 후 여기에 반영.
 */

export const STORIES = [
  {
    id: "aigerim-breast-2026",
    anonymized: false,
    country: { en: "Kazakhstan", ko: "카자흐스탄", ru: "Казахстан", kz: "Қазақстан", zh: "哈萨克斯坦", ja: "カザフスタン" },
    countryCode: "kz",
    age: 43,
    cancerType: "breast",
    cancerLabel: { en: "Breast cancer", ko: "유방암", ru: "Рак молочной железы", kz: "Сүт безі обыры", zh: "乳腺癌", ja: "乳がん" },
    stage: "II",
    hospitalName: "Sinchon Severance Hospital",
    displayName: { en: "Aigerim N.", ko: "아이게림 N.", ru: "Айгерим Н.", kz: "Айгерім Н.", zh: "Aigerim N.", ja: "Aigerim N." },
    quote: {
      en: "From the first video call to the day I flew home, HEALO's coordinator knew exactly what I was worried about. The language barrier disappeared. I felt seen.",
      ko: "첫 화상 통화부터 귀국하는 날까지, HEALO 코디네이터는 제가 무엇을 걱정하는지 정확히 알고 있었습니다. 언어 장벽이 사라졌어요. 저 자신이 보이는 느낌이었습니다.",
      ru: "От первого видеозвонка до дня отъезда координатор HEALO точно знал, что меня тревожит. Языковой барьер исчез. Я чувствовала себя увиденной.",
      kz: "Алғашқы бейнеқоңыраудан бастап үйге ұшу күніне дейін HEALO үйлестірушісі не туралы алаңдайтынымды дәл білді. Тілдік кедергі жоғалды.",
      zh: "从第一次视频通话到回国那天，HEALO协调员清楚地知道我担心什么。语言障碍消失了，我感到被看见。",
      ja: "最初のビデオ通話から帰国の日まで、HEALOのコーディネーターは私が何を心配しているか正確に理解していました。言葉の壁が消え、本当に寄り添ってもらえたと感じました。",
    },
    body: {
      en: "After diagnosis in Almaty, I researched cancer centers across Asia for three weeks. Seoul came up often but the logistics felt impossible — visa, interpreter, where to stay. HEALO's intake form took 12 minutes. The next morning I had a call with Dr. Kim (in Russian, via simultaneous interpretation). Surgery was scheduled for two weeks later. My husband and I stayed near the hospital for a month. Everything — visa, airport pickup, groceries — was handled quietly.",
      ko: "알마티에서 진단받은 후 3주 동안 아시아 전역의 암센터를 조사했습니다. 서울이 자주 나왔지만 비자·통역·숙소 같은 현실적인 문제가 불가능해 보였어요. HEALO 인테이크 폼은 12분 걸렸습니다. 다음 날 아침 Kim 박사와 러시아어 실시간 통역으로 상담했고, 2주 후 수술 일정이 잡혔습니다. 남편과 저는 병원 근처에서 한 달 머물렀어요. 비자·공항 픽업·장보기 모든 것이 조용히 처리됐습니다.",
      ru: "После диагноза в Алматы я три недели изучала онкоцентры Азии. Сеул упоминался часто, но логистика казалась невозможной — виза, переводчик, жильё. Анкета HEALO заняла 12 минут. На следующее утро у меня был звонок с доктором Кимом на русском через синхронный перевод. Операцию назначили через две недели.",
      kz: "Алматыда диагноз қойғаннан кейін үш апта бойы Азиядағы онкоцентрлерді зерттедім. Сеул жиі аталды, бірақ виза, аудармашы, тұрғын үй мәселесі шешілмес болып көрінді. HEALO сауалнамасы 12 минут алды. Келесі күні Ким докторымен орыс тілінде бейнекеңес өткіздім.",
      zh: "在阿拉木图确诊后，我花了三周时间研究亚洲各地的癌症中心。首尔经常出现，但签证、翻译、住宿这些看起来不可能解决。HEALO问诊表用了12分钟。第二天早上我和Kim医生通过俄英同声传译通话。两周后安排了手术。",
      ja: "アルマトイで診断を受けた後、3週間アジア各地のがんセンターを調べました。ソウルはよく出てきましたが、ビザ・通訳・滞在先という現実的な壁が不可能に見えました。HEALOの問診フォームは12分で終わりました。翌朝、Kim医師とロシア語同時通訳で通話しました。",
    },
    outcome: { en: "Discharged after 7 days. Currently in follow-up year 1.", ko: "7일 후 퇴원. 현재 사후 관리 1년차." },
    consentDate: "2026-03-15",
    coverImage: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&auto=format&fit=crop&q=85",
  },
  {
    id: "dmitri-liver-2025",
    anonymized: false,
    country: { en: "Russia", ko: "러시아", ru: "Россия", kz: "Ресей", zh: "俄罗斯", ja: "ロシア" },
    countryCode: "ru",
    age: 58,
    cancerType: "liver",
    cancerLabel: { en: "Liver cancer", ko: "간암", ru: "Рак печени", kz: "Бауыр обыры", zh: "肝癌", ja: "肝がん" },
    stage: "II",
    hospitalName: "Asan Medical Center",
    displayName: { en: "Dmitri K.", ko: "드미트리 K.", ru: "Дмитрий К.", kz: "Дмитрий К.", zh: "Dmitri K.", ja: "Dmitri K." },
    quote: {
      en: "I was told my case was difficult. Two Korean hospitals reviewed my file in 48 hours and both accepted. The clarity saved me from months of uncertainty.",
      ko: "제 사례는 어렵다는 말을 들었습니다. 한국 병원 두 곳이 48시간 만에 제 파일을 검토했고, 둘 다 수용했습니다. 이 명확함이 몇 달의 불확실성에서 저를 구해냈어요.",
      ru: "Мне говорили, что мой случай сложный. Две корейские больницы рассмотрели моё дело за 48 часов и обе согласились. Эта ясность спасла меня от месяцев неопределённости.",
      kz: "Менің жағдайым күрделі деді. Кореяның екі клиникасы файлымды 48 сағат ішінде қарап, екеуі де қабылдады.",
      zh: "有人告诉我我的病例很棘手。两家韩国医院在48小时内审核了我的病历，都接受了。这种明确性让我免于几个月的不确定。",
      ja: "私のケースは難しいと言われました。韓国の2病院が48時間で書類を検討し、両方とも受け入れてくれました。その明確さが数ヶ月の不安から救ってくれました。",
    },
    body: {
      en: "Liver cancer with hepatitis B background. My local doctor said the waiting list was 4 months. HEALO matched me with Asan and Samsung — both responded with full treatment plans within two days. I chose Asan for the surgical team. Recovery was faster than predicted.",
      ko: "B형 간염 기반 간암. 현지 의사는 대기 명단 4개월이라고 했어요. HEALO가 아산병원과 삼성병원을 매칭해줬고, 두 병원 모두 이틀 내 완전한 치료 계획으로 응답했습니다. 저는 수술팀 때문에 아산을 선택했고, 회복은 예상보다 빨랐습니다.",
      ru: "Рак печени на фоне гепатита B. Местный врач сказал, что в очереди 4 месяца. HEALO подобрал Асан и Самсунг — оба ответили полным планом лечения за два дня. Выбрал Асан из-за хирургической команды.",
      kz: "В гепатитімен байланысты бауыр обыры. Жергілікті дәрігер кезек 4 ай деді. HEALO Asan және Samsung-ты ұсынды — екеуі де екі күн ішінде толық ем жоспарымен жауап берді.",
      zh: "乙肝相关肝癌。当地医生说要等4个月。HEALO为我匹配了峨山和三星医院——两家都在两天内给出了完整治疗方案。我因手术团队选择了峨山。",
      ja: "B型肝炎を背景とした肝がん。地元の医師は待機4ヶ月と言いました。HEALOがAsanとSamsungをマッチングしてくれ、両方が2日以内に完全な治療計画で応答。Asanを選びました。",
    },
    outcome: { en: "Successful resection. Year 3 follow-up, no recurrence.", ko: "수술 성공. 3년차 추적 관찰, 재발 없음." },
    consentDate: "2026-02-20",
    coverImage: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&auto=format&fit=crop&q=85",
  },
  {
    id: "mei-thyroid-2025",
    anonymized: true,
    country: { en: "China", ko: "중국", ru: "Китай", kz: "Қытай", zh: "中国", ja: "中国" },
    countryCode: "cn",
    age: 36,
    cancerType: "thyroid",
    cancerLabel: { en: "Thyroid cancer", ko: "갑상선암", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" },
    stage: "I",
    hospitalName: "Samsung Medical Center",
    displayName: { en: "M. L.", ko: "M. L.", ru: "М. Л.", kz: "М. Л.", zh: "M. L.", ja: "M. L." },
    quote: {
      en: "I was most worried about the scar. Korean endoscopic surgery left almost no visible mark. As a teacher, that mattered to me.",
      ko: "가장 걱정됐던 건 흉터였어요. 한국의 내시경 수술은 거의 눈에 띄는 자국을 남기지 않았습니다. 교사로서 저에게 이건 중요했어요.",
      ru: "Больше всего я волновалась о шраме. Корейская эндоскопическая хирургия почти не оставила следа. Как учителю, мне это было важно.",
      kz: "Ең алаңдатқаным тыртық еді. Корея эндоскопиялық хирургиясы дерлік із қалдырмады. Мұғалім ретінде маған бұл маңызды болды.",
      zh: "我最担心的是疤痕。韩国的内镜手术几乎没留下可见痕迹。作为一名教师，这对我很重要。",
      ja: "一番心配だったのは傷跡でした。韓国の内視鏡手術はほとんど見える跡が残りませんでした。教師として、これは重要でした。",
    },
    body: {
      en: "Thyroid cancer found in annual checkup. Korean hospitals have the most experience in thyroidectomy globally — over 500 cases per surgeon per year at Samsung. Endoscopic approach through the mouth meant zero visible scar.",
      ko: "연간 검진에서 갑상선암 발견. 한국 병원은 갑상선 절제술 경험이 세계 최다 — 삼성 의사는 연간 500건 이상. 입을 통한 내시경 접근으로 외부 흉터 없음.",
      ru: "Рак щитовидной железы обнаружили на ежегодном обследовании. Корея — мировой лидер по опыту тиреоидэктомии. Эндоскопический доступ через рот — никаких видимых шрамов.",
      kz: "Қалқанша без обыры жылдық тексеруде табылды. Корея тиреоидэктомияда әлемдегі ең көп тәжірибеге ие.",
      zh: "年检中发现甲状腺癌。韩国医院在甲状腺切除术上经验世界领先——三星医生每年500例以上。经口内镜入路，外部零疤痕。",
      ja: "健康診断で甲状腺がん発見。韓国は甲状腺切除術の経験が世界一——Samsungの医師は年500件超。口からの内視鏡アプローチで外部の傷跡ゼロ。",
    },
    outcome: { en: "Same-day discharge. Back to teaching after 10 days.", ko: "당일 퇴원. 10일 후 교단 복귀." },
    consentDate: "2026-01-10",
    coverImage: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1200&auto=format&fit=crop&q=85",
  },
];
