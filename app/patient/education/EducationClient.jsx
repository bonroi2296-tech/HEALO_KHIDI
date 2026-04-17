'use client';

import { useState, useEffect } from 'react';
import { getLangCodeFromCookie } from '../../../src/lib/i18n';
import { BookOpen, ChevronDown, ChevronUp, Stethoscope, AlertTriangle, Heart, Utensils, Dumbbell, Brain } from 'lucide-react';

const CANCER_TYPES = [
  { value: 'stomach', emoji: '🫁', label: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', zh: '胃癌', ja: '胃がん', kz: 'Асқазан обыры' } },
  { value: 'breast', emoji: '🎀', label: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', zh: '乳腺癌', ja: '乳がん', kz: 'Сүт безі обыры' } },
  { value: 'liver', emoji: '🫀', label: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', zh: '肝癌', ja: '肝臓がん', kz: 'Бауыр обыры' } },
  { value: 'lung', emoji: '🫁', label: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', zh: '肺癌', ja: '肺がん', kz: 'Өкпе обыры' } },
  { value: 'thyroid', emoji: '🦋', label: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', zh: '甲状腺癌', ja: '甲状腺がん', kz: 'Қалқанша без обыры' } },
];

const PAGE_LABELS = {
  title: { ko: '암 치료 가이드', en: 'Cancer Treatment Guide', ru: 'Руководство по лечению рака', zh: '癌症治疗指南', ja: 'がん治療ガイド', kz: 'Обыр емдеу нұсқаулығы' },
  subtitle: { ko: '한국에서의 암 치료, 준비부터 회복까지 알아야 할 모든 것', en: 'Everything you need to know about cancer treatment in Korea', ru: 'Всё, что нужно знать о лечении рака в Корее', zh: '关于在韩国治疗癌症，您需要了解的一切', ja: '韓国でのがん治療について知っておくべきすべて', kz: 'Кореядағы обыр емдеу туралы білуіңіз керек нәрселер' },
  selectCancer: { ko: '암종을 선택하세요', en: 'Select cancer type', ru: 'Выберите тип рака', zh: '选择癌症类型', ja: 'がん種を選択', kz: 'Обыр түрін таңдаңыз' },
  disclaimer: { ko: '이 자료는 일반적인 교육 목적으로 제공됩니다. 개별 치료 계획은 반드시 담당 의료진과 상의하세요.', en: 'This information is for general educational purposes. Always consult your medical team for individual treatment plans.', ru: 'Эта информация предоставлена в образовательных целях. Всегда консультируйтесь с вашей медицинской командой.', zh: '本资料仅供一般教育目的。个人治疗方案请务必咨询您的医疗团队。', ja: 'この情報は一般的な教育目的で提供されています。個別の治療計画は必ず担当医にご相談ください。', kz: 'Бұл ақпарат жалпы білім беру мақсатында берілген. Жеке емдеу жоспарын міндетті түрде дәрігерлермен талқылаңыз.' },
};

// 암종별 종합 가이드 콘텐츠
const GUIDES = {
  stomach: {
    title: { ko: '위암 치료 종합 가이드', en: 'Stomach Cancer Treatment Guide', ru: 'Полное руководство по лечению рака желудка', zh: '胃癌治疗综合指南', ja: '胃がん治療総合ガイド', kz: 'Асқазан обыры емдеу нұсқаулығы' },
    sections: [
      {
        icon: Stethoscope,
        color: 'text-blue-600 bg-blue-50',
        image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&auto=format&fit=crop&q=80',
        imageAlt: 'Modern operating room',
        title: { ko: '한국에서의 위암 치료', en: 'Stomach Cancer Treatment in Korea', ru: 'Лечение рака желудка в Корее', zh: '韩国的胃癌治疗', ja: '韓国での胃がん治療', kz: 'Кореядағы асқазан обыры емдеу' },
        body: {
          ko: '한국은 위암 치료 분야에서 세계 최고 수준의 의료 기술을 보유하고 있습니다. 5년 생존율 78.4%로 세계 1위이며, 로봇 수술과 복강경 수술 등 최소침습 치료가 보편화되어 있습니다.\n\n주요 치료 방법:\n• 내시경 절제술 — 초기 위암의 경우, 수술 없이 내시경으로 종양 제거\n• 복강경/로봇 수술 — 절개 부위를 최소화하여 회복이 빠름\n• 항암화학요법 — 수술 전후로 병행하여 재발 방지\n• 면역요법 — 진행성 위암에 대한 최신 치료 옵션\n\n치료 기간은 보통 2-4주이며, 수술 후 1-2주 입원 후 퇴원합니다.',
          en: 'Korea has world-leading medical technology for stomach cancer treatment, with a 78.4% five-year survival rate — the highest globally. Minimally invasive treatments like robotic and laparoscopic surgery are widely available.\n\nMain treatment methods:\n• Endoscopic resection — removes tumors without surgery for early-stage cancer\n• Laparoscopic/Robotic surgery — minimal incisions, faster recovery\n• Chemotherapy — used before/after surgery to prevent recurrence\n• Immunotherapy — latest option for advanced stomach cancer\n\nTreatment typically takes 2-4 weeks, with 1-2 weeks hospitalization after surgery.',
          ru: 'Корея обладает ведущими медицинскими технологиями для лечения рака желудка: 5-летняя выживаемость 78,4% — лучший показатель в мире. Минимально инвазивные методы широко доступны.\n\nОсновные методы лечения:\n• Эндоскопическая резекция — удаление опухоли без операции при ранней стадии\n• Лапароскопическая/роботизированная хирургия — минимальные разрезы, быстрое восстановление\n• Химиотерапия — до/после операции для предотвращения рецидива\n• Иммунотерапия — новейший метод при прогрессирующем раке\n\nЛечение обычно занимает 2-4 недели, госпитализация после операции 1-2 недели.',
          kz: 'Корея асқазан обыры емдеуде әлемдегі ең озық медициналық технологияларға ие. 5 жылдық тірі қалу деңгейі 78,4% — әлемде бірінші. Минималды инвазивті емдеу кеңінен қол жетімді.\n\nНегізгі емдеу әдістері:\n• Эндоскопиялық резекция — ерте сатыдағы обыр кезінде операциясыз ісікті алу\n• Лапароскопиялық/робот хирургия — кішкентай кесінді, тез қалпына келу\n• Химиотерапия — операциядан бұрын/кейін қайталануды болдырмау\n• Иммунотерапия — озық обыр үшін жаңа әдіс',
          zh: '韩国拥有世界领先的胃癌治疗医疗技术，五年生存率78.4%，全球第一。微创治疗如机器人手术和腹腔镜手术已普及。\n\n主要治疗方法：\n• 内镜切除术——早期胃癌无需手术即可切除肿瘤\n• 腹腔镜/机器人手术——切口最小化，恢复更快\n• 化疗——手术前后配合使用，防止复发\n• 免疫疗法——晚期胃癌的最新治疗选择\n\n治疗通常需要2-4周，术后住院1-2周。',
          ja: '韓国は胃がん治療分野で世界最高水準の医療技術を保有しています。5年生存率78.4%で世界1位、ロボット手術や腹腔鏡手術など低侵襲治療が普及しています。\n\n主な治療法：\n• 内視鏡的切除術——早期胃がんの場合、手術なしで腫瘍を除去\n• 腹腔鏡/ロボット手術——切開を最小限に、回復が早い\n• 化学療法——手術前後に併用し再発を防止\n• 免疫療法——進行性胃がんに対する最新の治療選択肢\n\n治療期間は通常2-4週間、術後1-2週間入院します。',
        },
      },
      {
        icon: Utensils,
        color: 'text-green-600 bg-green-50',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
        imageAlt: 'Healthy food bowls',
        title: { ko: '수술 후 식사와 영양 관리', en: 'Post-Surgery Diet & Nutrition', ru: 'Питание после операции', zh: '术后饮食与营养管理', ja: '術後の食事と栄養管理', kz: 'Операциядан кейінгі тамақтану' },
        body: {
          ko: '위 절제 수술 후에는 식사 방법이 크게 달라집니다. 처음에는 불편하지만 몸이 적응하면 대부분의 음식을 즐길 수 있게 됩니다.\n\n초기 (1-2주):\n• 미음과 죽부터 시작, 소량씩 하루 6-8회\n• 충분히 씹고, 천천히 먹기\n• 식사 중 물은 적게, 식후 30분 뒤에 수분 보충\n\n적응기 (1-3개월):\n• 부드러운 밥으로 전환, 하루 4-5회\n• 단백질 충분히 (두부, 계란, 생선, 닭가슴살)\n• 지나치게 달거나 기름진 음식 주의 (덤핑증후군)\n\n안정기 (3개월 이후):\n• 일반식 가능하나 소량 다회식 유지\n• 비타민 B12, 철분, 칼슘 보충제 필요할 수 있음\n• 체중 변화를 정기적으로 확인',
          en: 'Eating habits change significantly after stomach surgery. It may be uncomfortable at first, but your body will adapt and you\'ll be able to enjoy most foods again.\n\nEarly stage (1-2 weeks):\n• Start with rice porridge, small amounts 6-8 times/day\n• Chew thoroughly, eat slowly\n• Drink little during meals, hydrate 30 min after\n\nAdaptation (1-3 months):\n• Transition to soft rice, 4-5 meals/day\n• Adequate protein (tofu, eggs, fish, chicken breast)\n• Watch out for overly sweet or greasy foods (dumping syndrome)\n\nStable phase (3+ months):\n• Regular diet possible but keep small, frequent meals\n• May need B12, iron, calcium supplements\n• Monitor weight changes regularly',
          ru: 'После операции на желудке режим питания значительно меняется. Сначала это непривычно, но организм адаптируется.\n\nРанний период (1-2 недели):\n• Начните с рисовой каши, маленькие порции 6-8 раз в день\n• Тщательно жуйте, ешьте медленно\n• Мало пейте во время еды, пейте через 30 минут после\n\nАдаптация (1-3 месяца):\n• Переходите на мягкий рис, 4-5 приёмов в день\n• Достаточно белка (тофу, яйца, рыба, куриная грудка)\n• Осторожно со сладким и жирным (демпинг-синдром)\n\nСтабильный период (3+ месяца):\n• Обычная диета возможна, но сохраняйте частые приёмы\n• Могут потребоваться B12, железо, кальций\n• Регулярно контролируйте вес',
          kz: 'Асқазан операциясынан кейін тамақтану тәртібі айтарлықтай өзгереді. Басында ыңғайсыз болады, бірақ организм бейімделеді.\n\nЕрте кезең (1-2 апта):\n• Ботқадан бастаңыз, аз мөлшерде күніне 6-8 рет\n• Жақсылап шайнаңыз, баяу жеңіз\n\nБейімделу (1-3 ай):\n• Жұмсақ күріш тағамына көшіңіз, күніне 4-5 рет\n• Жеткілікті ақуыз (тофу, жұмыртқа, балық)\n\nТұрақты кезең (3+ ай):\n• Қалыпты тамақ мүмкін, жиі тамақтануды сақтаңыз\n• B12, темір, кальций қажет болуы мүмкін',
          zh: '胃切除术后饮食习惯会发生很大变化。起初可能不适，但身体会适应，最终可以享受大部分食物。\n\n初期（1-2周）：\n• 从米粥开始，少量多餐每天6-8次\n• 充分咀嚼，慢慢吃\n• 用餐时少喝水，饭后30分钟补充水分\n\n适应期（1-3个月）：\n• 过渡到软饭，每天4-5餐\n• 充足蛋白质（豆腐、鸡蛋、鱼、鸡胸肉）\n• 注意过甜或油腻食物（倾倒综合征）\n\n稳定期（3个月以后）：\n• 可以正常饮食但保持少量多餐\n• 可能需要补充维生素B12、铁、钙\n• 定期监测体重变化',
          ja: '胃切除手術後は食事方法が大きく変わります。最初は不便ですが、体が適応すればほとんどの食事を楽しめるようになります。\n\n初期（1-2週間）：\n• お粥から始め、少量ずつ1日6-8回\n• よく噛んで、ゆっくり食べる\n• 食事中の水分は少なく、食後30分後に補給\n\n適応期（1-3ヶ月）：\n• 柔らかいご飯へ移行、1日4-5回\n• 十分なたんぱく質（豆腐、卵、魚、鶏むね肉）\n• 甘すぎる・脂っこい食べ物に注意（ダンピング症候群）\n\n安定期（3ヶ月以降）：\n• 通常食可能だが少量頻回食を維持\n• ビタミンB12、鉄分、カルシウムのサプリが必要な場合も',
        },
      },
      {
        icon: Dumbbell,
        color: 'text-orange-600 bg-orange-50',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
        imageAlt: 'Gentle stretching exercise',
        title: { ko: '회복 단계별 운동 가이드', en: 'Exercise Guide by Recovery Stage', ru: 'Упражнения по этапам восстановления', zh: '分阶段恢复运动指南', ja: '回復段階別の運動ガイド', kz: 'Қалпына келу кезеңдері бойынша жаттығулар' },
        body: {
          ko: '적절한 운동은 회복을 빠르게 하고 재발 위험을 줄입니다. 단, 반드시 담당의와 상의 후 시작하세요.\n\n1주차: 침대에서 일어나 하루 2-3회 짧은 복도 걷기 (5-10분). 심호흡 운동.\n2주차: 산책 15-20분으로 확대. 가벼운 스트레칭 시작.\n1개월: 30분 산책 가능. 의사 허가 시 수영, 자전거 가능.\n3개월: 가벼운 조깅, 요가, 태극권 등 가능. 복근 운동은 서서히.\n6개월 이후: 대부분의 일상 운동 가능. 격렬한 운동은 담당의와 상의.\n\n주의사항:\n• 운동 중 통증이 심해지면 즉시 중단\n• 식후 1시간 이내 격렬한 운동 금지\n• 탈수 방지를 위해 수분 충분히 섭취',
          en: 'Appropriate exercise speeds recovery and reduces recurrence risk. Always consult your doctor before starting.\n\nWeek 1: Get up and walk short distances 2-3 times/day (5-10 min). Deep breathing exercises.\nWeek 2: Extend walks to 15-20 min. Start light stretching.\nMonth 1: 30-min walks possible. Swimming/cycling with doctor approval.\nMonth 3: Light jogging, yoga, tai chi possible. Gradually add core exercises.\n6+ months: Most daily exercises possible. Consult doctor for intense workouts.\n\nPrecautions:\n• Stop immediately if pain worsens during exercise\n• No vigorous exercise within 1 hour after meals\n• Stay well hydrated',
          ru: 'Умеренные упражнения ускоряют восстановление и снижают риск рецидива. Всегда консультируйтесь с врачом.\n\n1 неделя: Вставайте и ходите 2-3 раза в день (5-10 мин). Дыхательные упражнения.\n2 неделя: Прогулки 15-20 мин. Лёгкая растяжка.\n1 месяц: Прогулки 30 мин. Плавание/велосипед с разрешения врача.\n3 месяца: Лёгкий бег, йога, тай-чи. Постепенно добавляйте упражнения для пресса.\n6+ месяцев: Большинство упражнений доступны.\n\nМеры предосторожности:\n• Остановитесь если боль усиливается\n• Не занимайтесь интенсивно в течение часа после еды\n• Пейте достаточно воды',
          kz: 'Қолайлы жаттығулар қалпына келуді жылдамдатады және қайталану қаупін азайтады.\n\n1 апта: Күніне 2-3 рет қысқа жүру (5-10 мин). Тыныс алу жаттығулары.\n2 апта: Серуенді 15-20 минутқа ұзартыңыз.\n1 ай: 30 минут серуен. Дәрігер рұқсатымен жүзу/велосипед.\n3 ай: Жеңіл жүгіру, йога мүмкін.\n6+ ай: Көпшілік жаттығулар мүмкін.',
          zh: '适当运动可加速恢复并降低复发风险。务必先咨询医生。\n\n第1周：起身每天走2-3次（5-10分钟）。深呼吸练习。\n第2周：延长步行至15-20分钟。开始轻度拉伸。\n第1个月：可步行30分钟。经医生批准可游泳、骑车。\n第3个月：可轻度慢跑、瑜伽、太极拳。逐渐增加核心训练。\n6个月以后：大部分日常运动均可。剧烈运动请咨询医生。',
          ja: '適切な運動は回復を早め、再発リスクを減らします。必ず担当医に相談してから始めてください。\n\n1週目：1日2-3回短い距離を歩く（5-10分）。深呼吸運動。\n2週目：散歩を15-20分に延長。軽いストレッチ開始。\n1ヶ月：30分散歩可能。医師許可後に水泳・自転車。\n3ヶ月：軽いジョギング、ヨガ、太極拳。腹筋運動は徐々に。\n6ヶ月以降：ほとんどの運動が可能。激しい運動は主治医と相談。',
        },
      },
      {
        icon: AlertTriangle,
        color: 'text-red-600 bg-red-50',
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&auto=format&fit=crop&q=80',
        imageAlt: 'Medical professional',
        title: { ko: '즉시 병원에 연락해야 하는 증상', en: 'When to Contact the Hospital Immediately', ru: 'Когда срочно обращаться в больницу', zh: '需要立即联系医院的症状', ja: 'すぐに病院に連絡すべき症状', kz: 'Дереу ауруханаға хабарласу керек белгілер' },
        body: {
          ko: '다음 증상이 나타나면 즉시 담당 병원에 연락하세요:\n\n🔴 긴급 (즉시 응급실):\n• 38.5°C 이상의 고열이 지속\n• 수술 부위에서 피나 고름이 나옴\n• 심한 복통이 갑자기 시작\n• 구토에 피가 섞여 나옴\n• 대변이 검은색이거나 피가 섞임\n\n🟡 주의 (24시간 내 연락):\n• 구토가 하루 이상 지속\n• 음식을 전혀 먹을 수 없음\n• 수술 부위가 점점 붉어지고 부어오름\n• 체중이 1주일에 2kg 이상 감소\n• 심한 피로감이나 어지러움',
          en: 'Contact your hospital immediately if you notice these symptoms:\n\n🔴 Emergency (go to ER):\n• Persistent fever above 38.5°C (101.3°F)\n• Bleeding or pus from surgical site\n• Sudden severe abdominal pain\n• Blood in vomit\n• Black or bloody stool\n\n🟡 Caution (contact within 24h):\n• Vomiting lasting more than 1 day\n• Complete inability to eat\n• Increasing redness/swelling at surgical site\n• Weight loss over 2kg per week\n• Severe fatigue or dizziness',
          ru: 'Немедленно свяжитесь с больницей при этих симптомах:\n\n🔴 Экстренно (скорая помощь):\n• Температура выше 38.5°C не спадает\n• Кровотечение или гной из раны\n• Внезапная сильная боль в животе\n• Кровь в рвоте\n• Чёрный или кровянистый стул\n\n🟡 Внимание (в течение 24 часов):\n• Рвота более суток\n• Полная невозможность есть\n• Нарастающее покраснение/отёк раны\n• Потеря веса более 2 кг в неделю\n• Сильная усталость или головокружение',
          kz: 'Мына белгілер болса, дереу ауруханаға хабарласыңыз:\n\n🔴 Шұғыл:\n• 38.5°C-ден жоғары қызба тоқтамайды\n• Операция жарасынан қан немесе іріңнің шығуы\n• Кенеттен қатты іш ауыруы\n• Құсықта қан\n• Қара немесе қанды нәжіс\n\n🟡 Сақтық:\n• Құсу 1 күннен артық\n• Тамақ мүлдем ішу мүмкін емес\n• Жара аймағының ісінуі\n• Аптасына 2 кг-нан артық салмақ жоғалту',
          zh: '出现以下症状请立即联系医院：\n\n🔴 紧急（立即去急诊）：\n• 38.5°C以上高热持续不退\n• 手术部位出血或流脓\n• 突然剧烈腹痛\n• 呕吐物中有血\n• 黑色或血便\n\n🟡 注意（24小时内联系）：\n• 呕吐持续超过1天\n• 完全无法进食\n• 手术部位逐渐发红肿胀\n• 每周体重下降超过2公斤\n• 严重疲劳或头晕',
          ja: '以下の症状があればすぐに病院に連絡してください：\n\n🔴 緊急（すぐに救急外来へ）：\n• 38.5°C以上の高熱が続く\n• 手術部位から出血や膿\n• 突然の激しい腹痛\n• 嘔吐物に血が混じる\n• 黒い便や血便\n\n🟡 注意（24時間以内に連絡）：\n• 嘔吐が1日以上続く\n• 全く食事ができない\n• 手術部位の赤みや腫れが増している\n• 1週間で2kg以上の体重減少\n• 強い疲労感やめまい',
        },
      },
      {
        icon: Brain,
        color: 'text-purple-600 bg-purple-50',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
        imageAlt: 'Meditation and mindfulness',
        title: { ko: '심리적 지원과 마음 건강', en: 'Psychological Support & Mental Health', ru: 'Психологическая поддержка', zh: '心理支持与心理健康', ja: '心理的サポートとメンタルヘルス', kz: 'Психологиялық қолдау' },
        body: {
          ko: '암 진단과 치료 과정에서 불안, 우울, 두려움을 느끼는 것은 매우 자연스러운 반응입니다.\n\n도움이 되는 방법:\n• 감정을 억누르지 말고 가족이나 의료진에게 솔직하게 이야기하세요\n• 규칙적인 수면과 가벼운 산책이 기분 개선에 효과적입니다\n• 같은 경험을 한 환자 커뮤니티에 참여해보세요\n• 필요하다면 전문 심리 상담을 요청하세요 — 이것은 약한 것이 아닙니다\n\n보호자를 위한 조언:\n• 환자의 감정을 있는 그대로 인정해주세요\n• "힘내"보다는 "내가 옆에 있어"라는 말이 더 도움이 됩니다\n• 보호자 자신의 건강도 돌보는 것이 중요합니다\n\nHEALO는 한국 체류 중 통역 지원은 물론 심리 상담 연결도 도와드립니다.',
          en: 'Feeling anxious, depressed, or fearful during cancer diagnosis and treatment is completely natural.\n\nWhat helps:\n• Don\'t suppress emotions — talk honestly to family or medical staff\n• Regular sleep and light walks effectively improve mood\n• Join patient communities with similar experiences\n• Request professional counseling if needed — it\'s not weakness\n\nFor caregivers:\n• Acknowledge the patient\'s emotions as they are\n• "I\'m here with you" is more helpful than "Stay strong"\n• Taking care of your own health matters too\n\nHEALO provides interpretation support and can connect you with psychological counseling during your stay in Korea.',
          ru: 'Чувство тревоги, депрессии и страха при диагностике и лечении рака — это абсолютно нормально.\n\nЧто помогает:\n• Не подавляйте эмоции — честно говорите с семьёй или медицинским персоналом\n• Регулярный сон и лёгкие прогулки улучшают настроение\n• Присоединяйтесь к сообществам пациентов с похожим опытом\n• При необходимости обратитесь к психологу — это не слабость\n\nДля ухаживающих:\n• Принимайте эмоции пациента такими, какие они есть\n• «Я рядом» помогает больше, чем «Будь сильным»\n• Заботьтесь и о своём здоровье тоже\n\nHEALO обеспечивает помощь с переводом и может организовать психологическую консультацию.',
          kz: 'Обыр диагнозы мен емдеу кезінде алаңдаушылық, көңіл-күйдің түсуі, қорқыныш сезіну — табиғи реакция.\n\nНе көмектеседі:\n• Эмоцияларды басуға тырыспаңыз — отбасыңызбен ашық сөйлесіңіз\n• Тұрақты ұйқы мен жеңіл серуен көңіл-күйді жақсартады\n• Ұқсас тәжірибесі бар науқастар қоғамдастығына қосылыңыз\n• Қажет болса, кәсіби психолог көмегін сұраңыз\n\nHEALO Кореяда болған кезде аударма қолдауын және психологиялық кеңес беруді қамтамасыз етеді.',
          zh: '在癌症诊断和治疗过程中感到焦虑、抑郁或恐惧是完全正常的反应。\n\n有帮助的方法：\n• 不要压抑情绪——坦诚地与家人或医护人员交谈\n• 规律睡眠和轻度散步能有效改善情绪\n• 加入有类似经历的患者社区\n• 如需要，请寻求专业心理咨询——这不是软弱\n\n给照护者的建议：\n• 接受患者的情绪\n• "我在你身边"比"加油"更有帮助\n• 照顾好自己的健康同样重要\n\nHEALO在韩国期间提供翻译支持，也可以帮助联系心理咨询。',
          ja: 'がんの診断や治療の過程で不安、うつ、恐怖を感じるのはとても自然な反応です。\n\n助けになること：\n• 感情を抑え込まず、家族や医療スタッフに正直に話しましょう\n• 規則的な睡眠と軽い散歩が気分の改善に効果的です\n• 同じ経験を持つ患者コミュニティに参加してみましょう\n• 必要であれば専門的なカウンセリングを依頼してください\n\n介護者の方へ：\n• 患者の感情をありのまま認めてあげてください\n• 「頑張って」より「そばにいるよ」の方が助けになります\n• 介護者自身の健康を大切にすることも重要です\n\nHEALOは韓国滞在中の通訳サポートや心理カウンセリングの手配もお手伝いします。',
        },
      },
    ],
  },
};

// 다른 암종은 위암 가이드를 기반으로 간단히 구성 (나중에 확장)
['breast', 'liver', 'lung', 'thyroid'].forEach(type => {
  if (!GUIDES[type]) {
    GUIDES[type] = { ...GUIDES.stomach };
  }
});

export default function EducationClient() {
  const [lang, setLang] = useState('en');
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

  const [cancerType, setCancerType] = useState('stomach');
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (idx) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 처음엔 전부 열려있게
  useEffect(() => {
    const guide = GUIDES[cancerType];
    if (guide) {
      const all = {};
      guide.sections.forEach((_, i) => { all[i] = true; });
      setExpandedSections(all);
    }
  }, [cancerType]);

  const guide = GUIDES[cancerType] || GUIDES.stomach;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8" aria-label={l(PAGE_LABELS.title)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-teal-600 mb-2">
          <BookOpen size={20} />
          <span className="text-sm font-semibold uppercase tracking-wide">HEALO Guide</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{l(PAGE_LABELS.title)}</h1>
        <p className="text-gray-500">{l(PAGE_LABELS.subtitle)}</p>
      </div>

      {/* Cancer Type Selector */}
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-500 mb-3">{l(PAGE_LABELS.selectCancer)}</p>
        <div className="flex gap-2 flex-wrap">
          {CANCER_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setCancerType(ct.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                cancerType === ct.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                  : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{ct.emoji}</span>
              {l(ct.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-4">
        {guide.sections.map((section, idx) => {
          const Icon = section.icon;
          const isOpen = expandedSections[idx] !== false;

          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection(idx)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.color}`}>
                  <Icon size={20} />
                </div>
                <h2 className="text-base md:text-lg font-semibold text-gray-900 flex-1">
                  {l(section.title)}
                </h2>
                {isOpen ? (
                  <ChevronUp size={20} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-0">
                  {section.image && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img
                        src={section.image}
                        alt={section.imageAlt || ''}
                        className="w-full h-48 md:h-56 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="pl-14">
                    <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">
                      {l(section.body)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        {l(PAGE_LABELS.disclaimer)}
      </div>

      {/* Photo Credit */}
      <p className="mt-4 text-center text-xs text-gray-400">
        Photos by{' '}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">
          Unsplash
        </a>
      </p>
    </main>
  );
}
