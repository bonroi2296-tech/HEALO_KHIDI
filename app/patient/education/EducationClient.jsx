'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n/LangContext';
import { BookOpen, ChevronDown, ChevronUp, Stethoscope, AlertTriangle, Heart, Utensils, Dumbbell, Brain, Leaf } from 'lucide-react';

export const CANCER_TYPES = [
  { value: 'stomach', emoji: '🫁', label: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', zh: '胃癌', ja: '胃がん', kz: 'Асқазан обыры' } },
  { value: 'breast', emoji: '🎀', label: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', zh: '乳腺癌', ja: '乳がん', kz: 'Сүт безі обыры' } },
  { value: 'liver', emoji: '🫀', label: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', zh: '肝癌', ja: '肝臓がん', kz: 'Бауыр обыры' } },
  { value: 'lung', emoji: '🫁', label: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', zh: '肺癌', ja: '肺がん', kz: 'Өкпе обыры' } },
  { value: 'thyroid', emoji: '🦋', label: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', zh: '甲状腺癌', ja: '甲状腺がん', kz: 'Қалқанша без обыры' } },
];

export const PAGE_LABELS = {
  title: { ko: '암 치료 가이드', en: 'Cancer Treatment Guide', ru: 'Руководство по лечению рака', zh: '癌症治疗指南', ja: 'がん治療ガイド', kz: 'Обыр емдеу нұсқаулығы' },
  subtitle: { ko: '한국에서의 암 치료, 준비부터 회복까지 알아야 할 모든 것', en: 'Everything you need to know about cancer treatment in Korea', ru: 'Всё, что нужно знать о лечении рака в Корее', zh: '关于在韩国治疗癌症，您需要了解的一切', ja: '韓国でのがん治療について知っておくべきすべて', kz: 'Кореядағы обыр емдеу туралы білуіңіз керек нәрселер' },
  selectCancer: { ko: '암종을 선택하세요', en: 'Select cancer type', ru: 'Выберите тип рака', zh: '选择癌症类型', ja: 'がん種を選択', kz: 'Обыр түрін таңдаңыз' },
  disclaimer: { ko: '이 자료는 일반적인 교육 목적으로 제공됩니다. 개별 치료 계획은 반드시 담당 의료진과 상의하세요.', en: 'This information is for general educational purposes. Always consult your medical team for individual treatment plans.', ru: 'Эта информация предоставлена в образовательных целях. Всегда консультируйтесь с вашей медицинской командой.', zh: '本资料仅供一般教育目的。个人治疗方案请务必咨询您的医疗团队。', ja: 'この情報は一般的な教育目的で提供されています。個別の治療計画は必ず担当医にご相談ください。', kz: 'Бұл ақпарат жалпы білім беру мақсатында берілген. Жеке емдеу жоспарын міндетті түрде дәрігерлермен талқылаңыз.' },
};

// 암종별 종합 가이드 콘텐츠
export const GUIDES = {
  stomach: {
    title: { ko: '위암 치료 종합 가이드', en: 'Stomach Cancer Treatment Guide', ru: 'Полное руководство по лечению рака желудка', zh: '胃癌治疗综合指南', ja: '胃がん治療総合ガイド', kz: 'Асқазан обыры емдеу нұсқаулығы' },
    sections: [
      {
        icon: Stethoscope,
        color: 'text-blue-600 bg-blue-50',
        image: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&auto=format&fit=crop&q=80',
        imageAlt: 'Doctor explaining CT scan results to patient',
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
          ko: '암 진단과 치료 과정에서 불안, 우울, 두려움을 느끼는 것은 매우 자연스러운 반응입니다.\n\n도움이 되는 방법:\n• 감정을 억누르지 말고 가족이나 의료진에게 솔직하게 이야기하세요\n• 규칙적인 수면과 가벼운 산책이 기분 개선에 효과적입니다\n• 같은 경험을 한 환자 커뮤니티에 참여해보세요\n• 필요하다면 전문 심리 상담을 요청하세요 — 이것은 약한 것이 아닙니다\n\n보호자를 위한 조언:\n• 환자의 감정을 있는 그대로 인정해주세요\n• "힘내"보다는 "내가 옆에 있어"라는 말이 더 도움이 됩니다\n• 보호자 자신의 건강도 돌보는 것이 중요합니다\n\nhealwith는 한국 체류 중 통역 지원은 물론 심리 상담 연결도 도와드립니다.',
          en: 'Feeling anxious, depressed, or fearful during cancer diagnosis and treatment is completely natural.\n\nWhat helps:\n• Don\'t suppress emotions — talk honestly to family or medical staff\n• Regular sleep and light walks effectively improve mood\n• Join patient communities with similar experiences\n• Request professional counseling if needed — it\'s not weakness\n\nFor caregivers:\n• Acknowledge the patient\'s emotions as they are\n• "I\'m here with you" is more helpful than "Stay strong"\n• Taking care of your own health matters too\n\nhealwith provides interpretation support and can connect you with psychological counseling during your stay in Korea.',
          ru: 'Чувство тревоги, депрессии и страха при диагностике и лечении рака — это абсолютно нормально.\n\nЧто помогает:\n• Не подавляйте эмоции — честно говорите с семьёй или медицинским персоналом\n• Регулярный сон и лёгкие прогулки улучшают настроение\n• Присоединяйтесь к сообществам пациентов с похожим опытом\n• При необходимости обратитесь к психологу — это не слабость\n\nДля ухаживающих:\n• Принимайте эмоции пациента такими, какие они есть\n• «Я рядом» помогает больше, чем «Будь сильным»\n• Заботьтесь и о своём здоровье тоже\n\nhealwith обеспечивает помощь с переводом и может организовать психологическую консультацию.',
          kz: 'Обыр диагнозы мен емдеу кезінде алаңдаушылық, көңіл-күйдің түсуі, қорқыныш сезіну — табиғи реакция.\n\nНе көмектеседі:\n• Эмоцияларды басуға тырыспаңыз — отбасыңызбен ашық сөйлесіңіз\n• Тұрақты ұйқы мен жеңіл серуен көңіл-күйді жақсартады\n• Ұқсас тәжірибесі бар науқастар қоғамдастығына қосылыңыз\n• Қажет болса, кәсіби психолог көмегін сұраңыз\n\nhealwith Кореяда болған кезде аударма қолдауын және психологиялық кеңес беруді қамтамасыз етеді.',
          zh: '在癌症诊断和治疗过程中感到焦虑、抑郁或恐惧是完全正常的反应。\n\n有帮助的方法：\n• 不要压抑情绪——坦诚地与家人或医护人员交谈\n• 规律睡眠和轻度散步能有效改善情绪\n• 加入有类似经历的患者社区\n• 如需要，请寻求专业心理咨询——这不是软弱\n\n给照护者的建议：\n• 接受患者的情绪\n• "我在你身边"比"加油"更有帮助\n• 照顾好自己的健康同样重要\n\nhealwith在韩国期间提供翻译支持，也可以帮助联系心理咨询。',
          ja: 'がんの診断や治療の過程で不安、うつ、恐怖を感じるのはとても自然な反応です。\n\n助けになること：\n• 感情を抑え込まず、家族や医療スタッフに正直に話しましょう\n• 規則的な睡眠と軽い散歩が気分の改善に効果的です\n• 同じ経験を持つ患者コミュニティに参加してみましょう\n• 必要であれば専門的なカウンセリングを依頼してください\n\n介護者の方へ：\n• 患者の感情をありのまま認めてあげてください\n• 「頑張って」より「そばにいるよ」の方が助けになります\n• 介護者自身の健康を大切にすることも重要です\n\nhealwithは韓国滞在中の通訳サポートや心理カウンセリングの手配もお手伝いします。',
        },
      },
    ],
  },
};

GUIDES.breast = {
  title: { ko: '유방암 치료 종합 가이드', en: 'Breast Cancer Treatment Guide', ru: 'Руководство по лечению рака молочной железы', zh: '乳腺癌治疗综合指南', ja: '乳がん治療総合ガイド', kz: 'Сүт безі обыры емдеу нұсқаулығы' },
  sections: [
    {
      icon: Stethoscope,
      color: 'text-blue-600 bg-blue-50',
      image: 'https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Healthcare professional with pink stethoscope heart',
      title: { ko: '한국에서의 유방암 치료', en: 'Breast Cancer Treatment in Korea', ru: 'Лечение рака молочной железы в Корее', zh: '韩国的乳腺癌治疗', ja: '韓国での乳がん治療', kz: 'Кореядағы сүт безі обыры емдеу' },
      body: {
        ko: '한국의 유방암 5년 생존율은 93.8%로 세계 최고 수준입니다. 유방 보존술(부분 절제) 비율이 70% 이상이며, 로봇 수술과 온코플라스틱 수술로 외형 보존까지 가능합니다.\n\n주요 치료 방법:\n• 유방 보존술 — 종양만 제거하고 유방 모양을 최대한 보존\n• 유방 전절제 + 즉시 재건 — 실리콘 또는 자가조직으로 동시 복원\n• 항암화학요법 — 수술 전 종양 크기를 줄이거나 수술 후 재발 방지\n• 표적치료/호르몬치료 — HER2 양성, 호르몬 수용체 양성에 맞춤 치료\n• 방사선치료 — 수술 후 잔여 암세포 제거\n\n치료 기간은 수술 1-2주 + 항암/방사선 3-6개월입니다.',
        en: 'Korea\'s breast cancer five-year survival rate is 93.8%, among the highest globally. Breast-conserving surgery rates exceed 70%, and oncoplastic techniques preserve appearance alongside treatment.\n\nMain treatment methods:\n• Breast-conserving surgery — removes only the tumor while preserving breast shape\n• Mastectomy + immediate reconstruction — silicone or autologous tissue restoration\n• Chemotherapy — shrinks tumors before surgery or prevents recurrence after\n• Targeted/Hormone therapy — personalized for HER2-positive or hormone-receptor-positive cases\n• Radiation therapy — eliminates remaining cancer cells after surgery\n\nTreatment timeline: 1-2 weeks surgery + 3-6 months chemo/radiation.',
        ru: 'Пятилетняя выживаемость при раке молочной железы в Корее составляет 93,8% — один из лучших показателей в мире. Органосохраняющие операции проводятся более чем в 70% случаев.\n\nОсновные методы лечения:\n• Органосохраняющая операция — удаление только опухоли с сохранением формы груди\n• Мастэктомия + немедленная реконструкция — восстановление силиконом или собственной тканью\n• Химиотерапия — уменьшает опухоль до операции или предотвращает рецидив после\n• Таргетная/гормональная терапия — персонализированная для HER2-положительных случаев\n• Лучевая терапия — уничтожает оставшиеся раковые клетки',
        kz: 'Кореядағы сүт безі обырының 5 жылдық тірі қалу деңгейі 93,8% — әлемдегі ең жоғары көрсеткіштердің бірі. Мүшені сақтайтын операциялар 70%-дан астам жағдайда жасалады.\n\nНегізгі емдеу әдістері:\n• Сүт безін сақтайтын операция — тек ісікті алу, безінің пішінін сақтау\n• Мастэктомия + жедел қалпына келтіру — силикон немесе өз тінімен\n• Химиотерапия — операциядан бұрын ісікті кішірейту немесе кейін қайталануды болдырмау\n• Таргетті/гормоналды терапия — HER2-оң жағдайлар үшін жекелендірілген\n• Сәулелік терапия — қалған обыр жасушаларын жою',
        zh: '韩国乳腺癌五年生存率达93.8%，全球领先。保乳手术率超过70%，整形保乳技术可在治疗的同时保留外观。\n\n主要治疗方法：\n• 保乳手术——仅切除肿瘤，最大程度保留乳房形态\n• 全切+即刻重建——硅胶或自体组织同步修复\n• 化疗——术前缩小肿瘤或术后防止复发\n• 靶向/内分泌治疗——针对HER2阳性或激素受体阳性的个性化治疗\n• 放疗——消除术后残余癌细胞\n\n治疗周期：手术1-2周 + 化疗/放疗3-6个月。',
        ja: '韓国の乳がん5年生存率は93.8%で世界トップクラスです。乳房温存手術の割合は70%以上で、オンコプラスティック手術により外見も保持できます。\n\n主な治療法：\n• 乳房温存手術——腫瘍のみを除去し乳房の形を最大限保存\n• 乳房全摘+即時再建——シリコンや自家組織で同時に復元\n• 化学療法——術前に腫瘍を縮小、または術後の再発を防止\n• 分子標的治療/ホルモン療法——HER2陽性やホルモン受容体陽性に合わせた個別治療\n• 放射線治療——手術後に残存がん細胞を除去\n\n治療期間は手術1-2週間＋化学療法/放射線3-6ヶ月です。',
      },
    },
    {
      icon: Utensils,
      color: 'text-green-600 bg-green-50',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Colorful healthy salad bowl',
      title: { ko: '치료 중 식사와 영양 관리', en: 'Diet & Nutrition During Treatment', ru: 'Питание во время лечения', zh: '治疗期间的饮食与营养', ja: '治療中の食事と栄養管理', kz: 'Емдеу кезіндегі тамақтану' },
      body: {
        ko: '유방암 치료 중 올바른 영양 섭취는 회복과 면역력 유지에 핵심적입니다.\n\n항암치료 중:\n• 구역감이 있을 때는 소량씩 자주 먹기\n• 생강차, 레몬수가 메스꺼움 완화에 도움\n• 고단백 식품 중심 — 달걀, 두부, 닭가슴살, 생선\n• 백혈구 수치가 낮을 때는 날 음식 주의\n\n호르몬 치료 중:\n• 체중 증가 관리가 중요 — 과식 주의\n• 콩류(이소플라본)는 담당의와 상의 후 섭취\n• 칼슘과 비타민 D 충분히 — 골밀도 보호\n• 규칙적인 식사 시간 유지\n\n일반 권장사항:\n• 채소, 과일, 통곡물 중심의 균형 잡힌 식단\n• 가공육과 알코올 제한\n• 충분한 수분 섭취 (하루 1.5-2L)',
        en: 'Proper nutrition during breast cancer treatment is essential for recovery and immune support.\n\nDuring chemotherapy:\n• Eat small, frequent meals when nauseous\n• Ginger tea and lemon water help ease nausea\n• Focus on high-protein foods — eggs, tofu, chicken, fish\n• Avoid raw foods when white blood cell count is low\n\nDuring hormone therapy:\n• Weight management is important — avoid overeating\n• Discuss soy (isoflavones) intake with your doctor\n• Adequate calcium and vitamin D — protect bone density\n• Maintain regular meal times\n\nGeneral recommendations:\n• Balanced diet with vegetables, fruits, whole grains\n• Limit processed meats and alcohol\n• Stay hydrated (1.5-2L per day)',
        ru: 'Правильное питание во время лечения рака молочной железы важно для восстановления и поддержания иммунитета.\n\nВо время химиотерапии:\n• Ешьте маленькими порциями при тошноте\n• Имбирный чай и лимонная вода помогают от тошноты\n• Высокобелковая пища — яйца, тофу, курица, рыба\n• Избегайте сырых продуктов при низком уровне лейкоцитов\n\nВо время гормонотерапии:\n• Контроль веса важен — избегайте переедания\n• Обсудите сою с врачом\n• Достаточно кальция и витамина D\n\nОбщие рекомендации:\n• Сбалансированная диета с овощами, фруктами, цельнозерновыми\n• Ограничьте переработанное мясо и алкоголь\n• Пейте 1,5-2 литра воды в день',
        kz: 'Сүт безі обырын емдеу кезінде дұрыс тамақтану қалпына келу мен иммунитетті қолдау үшін маңызды.\n\nХимиотерапия кезінде:\n• Жүрек айну кезінде аз мөлшерде жиі жеңіз\n• Зімбір шай мен лимон суы жүрек айнуды жеңілдетеді\n• Жоғары ақуызды тағамдар — жұмыртқа, тофу, тауық, балық\n\nГормоналды терапия кезінде:\n• Салмақты бақылау маңызды\n• Кальций мен D витаминін жеткілікті алыңыз\n\nЖалпы ұсыныстар:\n• Көкөніс, жеміс, бүтін дәнді дақылдар негізіндегі тепе-тең тамақтану\n• Өңделген ет пен алкогольді шектеңіз',
        zh: '乳腺癌治疗期间合理营养对恢复和免疫力维护至关重要。\n\n化疗期间：\n• 恶心时少量多餐\n• 姜茶和柠檬水有助缓解恶心\n• 以高蛋白食物为主——鸡蛋、豆腐、鸡肉、鱼\n• 白细胞低时避免生食\n\n内分泌治疗期间：\n• 体重管理很重要——避免过量进食\n• 豆制品（异黄酮）需咨询医生后食用\n• 充足的钙和维生素D——保护骨密度\n\n一般建议：\n• 以蔬菜、水果、全谷物为主的均衡饮食\n• 限制加工肉类和酒精\n• 充足饮水（每天1.5-2升）',
        ja: '乳がん治療中の適切な栄養摂取は回復と免疫力維持に不可欠です。\n\n化学療法中：\n• 吐き気がある時は少量ずつ頻繁に食べる\n• 生姜茶やレモン水が吐き気緩和に効果的\n• 高たんぱく食品を中心に — 卵、豆腐、鶏むね肉、魚\n• 白血球が低い時は生ものに注意\n\nホルモン療法中：\n• 体重管理が重要 — 食べすぎに注意\n• 大豆（イソフラボン）は担当医と相談して摂取\n• カルシウムとビタミンDを十分に — 骨密度保護\n\n一般的な推奨事項：\n• 野菜、果物、全粒穀物中心のバランスの取れた食事\n• 加工肉とアルコールを制限\n• 十分な水分摂取（1日1.5-2L）',
      },
    },
    {
      icon: Dumbbell,
      color: 'text-orange-600 bg-orange-50',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Couple walking outdoors',
      title: { ko: '수술 후 운동과 재활', en: 'Post-Surgery Exercise & Rehabilitation', ru: 'Упражнения и реабилитация после операции', zh: '术后运动与康复', ja: '術後の運動とリハビリ', kz: 'Операциядан кейінгі жаттығулар' },
      body: {
        ko: '유방암 수술 후 팔과 어깨 운동은 림프부종 예방과 기능 회복에 매우 중요합니다.\n\n수술 후 1-2주:\n• 손 주먹 쥐었다 펴기, 손목 돌리기\n• 팔꿈치 구부렸다 펴기\n• 어깨를 으쓱하는 동작\n\n2-4주:\n• 벽 기어오르기 운동 — 벽에 손을 대고 천천히 위로 올리기\n• 수건 스트레칭 — 수건을 잡고 등 뒤로 올리기\n• 15-20분 가벼운 산책\n\n1-3개월:\n• 요가, 필라테스 (수정 동작)\n• 가벼운 수영\n• 30분 걷기 매일\n\n주의사항:\n• 수술 쪽 팔로 무거운 물건 들지 않기 (처음 6주)\n• 팔이 부어오르면 즉시 의료진에게 알리기 (림프부종 의심)\n• 드레인 제거 전까지는 상체 스트레칭만',
        en: 'Arm and shoulder exercises after breast cancer surgery are crucial for preventing lymphedema and restoring function.\n\nWeeks 1-2 after surgery:\n• Clench and release fists, wrist circles\n• Bend and straighten elbows\n• Shoulder shrugs\n\nWeeks 2-4:\n• Wall climbing exercise — place hand on wall, slowly walk fingers upward\n• Towel stretching — hold towel behind back and lift\n• 15-20 minute gentle walks\n\n1-3 months:\n• Yoga, Pilates (modified poses)\n• Light swimming\n• 30-minute daily walks\n\nPrecautions:\n• Avoid lifting heavy objects with the affected arm (first 6 weeks)\n• Report arm swelling immediately (possible lymphedema)\n• Only upper body stretching until drains are removed',
        ru: 'Упражнения для руки и плеча после операции крайне важны для предотвращения лимфедемы и восстановления функций.\n\n1-2 недели после операции:\n• Сжимать и разжимать кулаки, вращение запястьями\n• Сгибание и разгибание локтей\n• Пожимание плечами\n\n2-4 недели:\n• Упражнение «лазание по стене» — медленно поднимайте руку по стене\n• Растяжка с полотенцем — держите полотенце за спиной и поднимайте\n• Прогулки 15-20 минут\n\n1-3 месяца:\n• Йога, пилатес (модифицированные позы)\n• Лёгкое плавание\n• Ежедневные прогулки 30 минут\n\nМеры предосторожности:\n• Не поднимайте тяжести поражённой рукой (первые 6 недель)\n• Сообщите врачу при отёке руки (возможна лимфедема)',
        kz: 'Сүт безі обыры операциясынан кейін қол мен иық жаттығулары лимфедеманы алдын алу және функцияны қалпына келтіру үшін өте маңызды.\n\n1-2 апта:\n• Жұдырық жұму және жазу, білек айналдыру\n• Шынтақты бүгу және жазу\n• Иық көтеру\n\n2-4 апта:\n• Қабырға бойлап жоғары жүру жаттығуы\n• Сүлгі керу жаттығуы\n• 15-20 минут жеңіл серуен\n\n1-3 ай:\n• Йога, пилатес\n• Жеңіл жүзу\n• Күнделікті 30 минут жүру',
        zh: '乳腺癌术后手臂和肩部运动对预防淋巴水肿和恢复功能至关重要。\n\n术后1-2周：\n• 握拳松开、手腕转圈\n• 弯曲伸直肘部\n• 耸肩运动\n\n2-4周：\n• 爬墙运动——手掌贴墙，手指慢慢向上走\n• 毛巾拉伸——在背后拉毛巾向上提\n• 15-20分钟轻度散步\n\n1-3个月：\n• 瑜伽、普拉提（调整动作）\n• 轻度游泳\n• 每天步行30分钟\n\n注意事项：\n• 术侧手臂6周内不要提重物\n• 手臂肿胀立即告知医生（疑似淋巴水肿）\n• 引流管拔除前仅做上半身拉伸',
        ja: '乳がん手術後の腕と肩の運動はリンパ浮腫の予防と機能回復に極めて重要です。\n\n術後1-2週間：\n• グーパー運動、手首回し\n• 肘の曲げ伸ばし\n• 肩をすくめる運動\n\n2-4週間：\n• 壁登り運動——壁に手を当てゆっくり上へ\n• タオルストレッチ——背中でタオルを持ち上げる\n• 15-20分の軽い散歩\n\n1-3ヶ月：\n• ヨガ、ピラティス（修正ポーズ）\n• 軽い水泳\n• 毎日30分ウォーキング\n\n注意事項：\n• 患側の腕で重い物を持たない（最初の6週間）\n• 腕のむくみは直ちに医療スタッフに報告（リンパ浮腫の可能性）',
      },
    },
    {
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Doctor consultation',
      title: { ko: '즉시 병원에 연락해야 하는 증상', en: 'When to Contact the Hospital Immediately', ru: 'Когда срочно обращаться в больницу', zh: '需要立即联系医院的症状', ja: 'すぐに病院に連絡すべき症状', kz: 'Дереу ауруханаға хабарласу керек белгілер' },
      body: {
        ko: '다음 증상이 나타나면 즉시 담당 병원에 연락하세요:\n\n🔴 긴급:\n• 38.5°C 이상 고열이 지속 (항암 중 감염 의심)\n• 수술 부위 심한 부기, 발적, 분비물\n• 갑작스러운 호흡곤란이나 가슴 통증\n• 수술 쪽 팔이 급격히 부어오름\n• 심한 출혈\n\n🟡 주의 (24시간 내):\n• 항암 후 구토가 24시간 이상 지속\n• 입 안 궤양으로 식사 불가\n• 손발 저림이 심해짐 (말초신경병증)\n• 수술 부위 주변 지속적인 통증\n• 극심한 피로로 일상생활 불가',
        en: 'Contact your hospital immediately if you notice:\n\n🔴 Emergency:\n• Persistent fever above 38.5°C (suspected infection during chemo)\n• Severe swelling, redness, or discharge at surgical site\n• Sudden difficulty breathing or chest pain\n• Rapid swelling of the arm on surgery side\n• Severe bleeding\n\n🟡 Caution (within 24h):\n• Vomiting lasting over 24 hours after chemo\n• Mouth sores preventing eating\n• Worsening numbness in hands/feet (peripheral neuropathy)\n• Persistent pain around surgical site\n• Extreme fatigue preventing daily activities',
        ru: 'Немедленно свяжитесь с больницей при:\n\n🔴 Экстренно:\n• Температура выше 38,5°C (подозрение на инфекцию при химиотерапии)\n• Сильный отёк, покраснение или выделения из раны\n• Внезапная одышка или боль в груди\n• Быстрый отёк руки со стороны операции\n• Сильное кровотечение\n\n🟡 Внимание (24 часа):\n• Рвота более 24 часов после химиотерапии\n• Язвы во рту, мешающие есть\n• Усиление онемения рук/ног\n• Постоянная боль в области операции',
        kz: 'Мына белгілер болса, дереу ауруханаға хабарласыңыз:\n\n🔴 Шұғыл:\n• 38,5°C-ден жоғары қызба (химиотерапия кезінде инфекция күдігі)\n• Операция аймағында қатты ісіну, қызару\n• Кенеттен тыныс алу қиындығы\n• Операция жағындағы қолдың тез ісінуі\n\n🟡 Сақтық (24 сағат):\n• Химиотерапиядан кейін 24 сағаттан артық құсу\n• Ауыз жаралары\n• Қол-аяқтың жансыздануы',
        zh: '出现以下症状请立即联系医院：\n\n🔴 紧急：\n• 38.5°C以上高热持续不退（化疗期间疑似感染）\n• 手术部位严重肿胀、发红、有分泌物\n• 突然呼吸困难或胸痛\n• 手术侧手臂急速肿胀\n• 严重出血\n\n🟡 注意（24小时内）：\n• 化疗后呕吐超过24小时\n• 口腔溃疡无法进食\n• 手脚麻木加重（周围神经病变）\n• 手术部位持续疼痛\n• 极度疲劳无法进行日常活动',
        ja: '以下の症状があればすぐに病院に連絡してください：\n\n🔴 緊急：\n• 38.5°C以上の高熱が続く（化学療法中の感染疑い）\n• 手術部位の激しい腫れ、赤み、分泌物\n• 突然の呼吸困難や胸痛\n• 手術側の腕の急激なむくみ\n• 重度の出血\n\n🟡 注意（24時間以内）：\n• 化学療法後24時間以上続く嘔吐\n• 口内炎で食事不可\n• 手足のしびれの悪化（末梢神経障害）\n• 手術部位周辺の持続的な痛み\n• 日常生活不能な極度の疲労',
      },
    },
    {
      icon: Brain,
      color: 'text-purple-600 bg-purple-50',
      image: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Counseling session',
      title: { ko: '마음 건강과 외모 변화 대처', en: 'Mental Health & Coping with Body Changes', ru: 'Психическое здоровье и изменения тела', zh: '心理健康与身体变化应对', ja: 'メンタルヘルスと身体の変化への対応', kz: 'Психологиялық денсаулық және дене өзгерістері' },
      body: {
        ko: '유방암 치료는 신체적 변화와 감정적 도전이 함께 옵니다. 이 모든 감정은 자연스럽습니다.\n\n외모 변화 대처:\n• 탈모 — 미리 가발이나 스카프를 준비하면 마음의 부담이 줄어듭니다\n• 유방 변화 — 재건 수술 외에도 보형물 속옷 등 다양한 옵션이 있습니다\n• 체중 변화 — 호르몬 치료로 인한 자연스러운 현상, 담당의와 상의\n\n감정 관리:\n• 불안과 우울은 치료 과정의 정상적인 반응입니다\n• 환자 커뮤니티에서 같은 경험을 나누는 것이 큰 도움이 됩니다\n• 파트너와의 소통이 중요합니다 — 걱정도 솔직하게 나누세요\n• 전문 심리 상담을 적극 활용하세요\n\nhealwith는 한국 체류 중 한국어-모국어 통역과 심리 상담 연결을 도와드립니다.',
        en: 'Breast cancer treatment brings physical changes and emotional challenges. All these feelings are natural.\n\nCoping with appearance changes:\n• Hair loss — preparing wigs or scarves in advance eases the emotional burden\n• Breast changes — besides reconstruction, prosthetic underwear and other options exist\n• Weight changes — natural with hormone therapy, discuss with your doctor\n\nEmotional management:\n• Anxiety and depression are normal responses during treatment\n• Sharing experiences in patient communities provides great comfort\n• Communication with your partner is important — share concerns openly\n• Actively seek professional psychological counseling\n\nhealwith provides interpretation support and psychological counseling connections during your stay in Korea.',
        ru: 'Лечение рака молочной железы сопровождается физическими изменениями и эмоциональными трудностями. Все эти чувства естественны.\n\nСправляемся с изменениями внешности:\n• Выпадение волос — подготовьте парик или платки заранее\n• Изменения груди — помимо реконструкции, есть протезное бельё\n• Изменения веса — естественны при гормонотерапии\n\nУправление эмоциями:\n• Тревога и депрессия — нормальная реакция на лечение\n• Общение в сообществах пациентов очень помогает\n• Важно общаться с партнёром — делитесь переживаниями открыто\n• Обращайтесь к психологу\n\nhealwith помогает с переводом и организацией психологической поддержки.',
        kz: 'Сүт безі обырын емдеу дене өзгерістері мен эмоционалдық қиындықтармен бірге жүреді.\n\nСыртқы өзгерістерге бейімделу:\n• Шаш түсу — алдын ала парик немесе орамал дайындаңыз\n• Сүт безі өзгерістері — қалпына келтіру операциясынан басқа да нұсқалар бар\n• Салмақ өзгерістері — гормоналды терапияның табиғи нәтижесі\n\nЭмоцияларды басқару:\n• Алаңдаушылық пен депрессия — табиғи реакция\n• Науқастар қоғамдастығындағы тәжірибе алмасу көмектеседі\n• Серіктесіңізбен ашық сөйлесу маңызды\n\nhealwith Кореяда аударма қолдауын және психологиялық көмек ұсынады.',
        zh: '乳腺癌治疗会带来身体变化和情感挑战。所有这些感受都是自然的。\n\n应对外观变化：\n• 脱发——提前准备假发或头巾可减轻心理负担\n• 乳房变化——除重建手术外，还有义乳内衣等选择\n• 体重变化——内分泌治疗的自然现象，与医生沟通\n\n情绪管理：\n• 焦虑和抑郁是治疗过程中的正常反应\n• 在患者社区分享经验能带来很大帮助\n• 与伴侣沟通很重要——坦诚分享担忧\n• 积极寻求专业心理咨询\n\nhealwith在韩国期间提供翻译支持和心理咨询对接。',
        ja: '乳がんの治療は身体的な変化と感情的な挑戦を伴います。これらの感情はすべて自然なことです。\n\n外見の変化への対処：\n• 脱毛——事前にウィッグやスカーフを準備すると心の負担が軽減します\n• 乳房の変化——再建手術以外にも補正下着など様々な選択肢があります\n• 体重変化——ホルモン療法による自然な現象、担当医と相談\n\n感情の管理：\n• 不安やうつは治療過程の正常な反応です\n• 患者コミュニティで同じ経験を共有することが大きな助けになります\n• パートナーとのコミュニケーションが大切——心配事も率直に分かち合いましょう\n• 専門的なカウンセリングを積極的に活用してください\n\nhealwithは韓国滞在中の通訳サポートと心理カウンセリングの手配をお手伝いします。',
      },
    },
  ],
};

GUIDES.liver = {
  title: { ko: '간암 치료 종합 가이드', en: 'Liver Cancer Treatment Guide', ru: 'Руководство по лечению рака печени', zh: '肝癌治疗综合指南', ja: '肝臓がん治療総合ガイド', kz: 'Бауыр обыры емдеу нұсқаулығы' },
  sections: [
    {
      icon: Stethoscope,
      color: 'text-blue-600 bg-blue-50',
      image: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Doctor consulting with patient',
      title: { ko: '한국에서의 간암 치료', en: 'Liver Cancer Treatment in Korea', ru: 'Лечение рака печени в Корее', zh: '韩国的肝癌治疗', ja: '韓国での肝臓がん治療', kz: 'Кореядағы бауыр обыры емдеу' },
      body: {
        ko: '한국은 간암 치료에서 세계적으로 인정받는 선도국입니다. 간 이식 성공률은 96% 이상이며, 5년 생존율도 38.3%로 꾸준히 향상되고 있습니다.\n\n주요 치료 방법:\n• 간 절제술 — 종양이 있는 간의 일부를 제거. 간 기능이 충분한 경우 선택\n• 간 이식 — 생체 또는 뇌사 기증자로부터 이식. 한국의 생체간이식 기술은 세계 최고\n• 고주파 열치료(RFA) — 바늘로 종양에 열을 가해 파괴. 3cm 이하 종양에 효과적\n• 경동맥 화학색전술(TACE) — 간동맥을 통해 항암제를 직접 주입\n• 표적치료/면역치료 — 소라페닙, 아테졸리주맙 등 진행성 간암 치료\n\n치료 기간: 수술 2-4주, 비수술적 치료 1-2주 입원.',
        en: 'Korea is a globally recognized leader in liver cancer treatment. Liver transplant success rates exceed 96%, and the five-year survival rate continues improving at 38.3%.\n\nMain treatment methods:\n• Liver resection — removes the tumor-bearing portion of the liver when function is sufficient\n• Liver transplant — from living or deceased donors. Korea\'s living-donor technique is world-leading\n• Radiofrequency ablation (RFA) — destroys tumors with heat via needle. Effective for tumors under 3cm\n• Transarterial chemoembolization (TACE) — delivers chemo directly via hepatic artery\n• Targeted/Immunotherapy — sorafenib, atezolizumab for advanced liver cancer\n\nTimeline: 2-4 weeks for surgery, 1-2 weeks for non-surgical treatments.',
        ru: 'Корея — мировой лидер в лечении рака печени. Успешность трансплантации печени превышает 96%, а 5-летняя выживаемость составляет 38,3%.\n\nОсновные методы лечения:\n• Резекция печени — удаление части печени с опухолью\n• Трансплантация печени — от живого или посмертного донора. Технология Кореи лучшая в мире\n• Радиочастотная абляция (РЧА) — разрушение опухоли теплом через иглу. Для опухолей до 3 см\n• Трансартериальная химиоэмболизация (ТАХЭ) — введение химиопрепаратов через печёночную артерию\n• Таргетная/иммунотерапия — сорафениб, атезолизумаб для прогрессирующего рака\n\nСроки: 2-4 недели хирургия, 1-2 недели нехирургическое лечение.',
        kz: 'Корея бауыр обырын емдеуде әлемде танылған көшбасшы. Бауыр трансплантациясының табыстылығы 96%-дан асады.\n\nНегізгі емдеу әдістері:\n• Бауыр резекциясы — ісігі бар бауыр бөлігін алу\n• Бауыр трансплантациясы — тірі немесе қайтыс болған донорлардан\n• Радиожиілік абляция (RFA) — ине арқылы ісікті жылумен жою\n• Трансартериалды химиоэмболизация (TACE) — бауыр артериясы арқылы химиопрепараттарды тікелей беру\n• Таргетті/иммунотерапия — озық бауыр обыры үшін',
        zh: '韩国是全球公认的肝癌治疗领先国家。肝移植成功率超过96%，五年生存率持续提高至38.3%。\n\n主要治疗方法：\n• 肝切除术——切除含肿瘤的部分肝脏，肝功能充足时首选\n• 肝移植——活体或脑死亡供体。韩国活体肝移植技术世界领先\n• 射频消融术(RFA)——通过针头用热量破坏肿瘤，3cm以下肿瘤有效\n• 经动脉化疗栓塞术(TACE)——通过肝动脉直接注入化疗药物\n• 靶向/免疫治疗——索拉非尼、阿替利珠单抗用于晚期肝癌\n\n治疗周期：手术2-4周，非手术治疗住院1-2周。',
        ja: '韓国は肝臓がん治療で世界的に認められたリーダーです。肝移植の成功率は96%以上、5年生存率は38.3%と着実に向上しています。\n\n主な治療法：\n• 肝切除術——腫瘍のある肝臓の一部を切除。肝機能が十分な場合に選択\n• 肝移植——生体または脳死ドナーから移植。韓国の生体肝移植技術は世界トップ\n• ラジオ波焼灼術（RFA）——針で腫瘍に熱を加えて破壊。3cm以下の腫瘍に効果的\n• 肝動脈化学塞栓術（TACE）——肝動脈から直接抗がん剤を注入\n• 分子標的治療/免疫療法——ソラフェニブ、アテゾリズマブなど進行性肝がんの治療\n\n治療期間：手術2-4週間、非手術治療1-2週間入院。',
      },
    },
    {
      icon: Utensils,
      color: 'text-green-600 bg-green-50',
      image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Fresh vegetables and fruits',
      title: { ko: '간 건강을 위한 식단', en: 'Diet for Liver Health', ru: 'Диета для здоровья печени', zh: '护肝饮食', ja: '肝臓の健康のための食事', kz: 'Бауыр денсаулығы үшін тамақтану' },
      body: {
        ko: '간암 치료 후 간에 부담을 주지 않는 식단이 회복의 핵심입니다.\n\n필수 원칙:\n• 절대 금주 — 알코올은 간에 직접적인 독성을 미침\n• 소금 제한 — 하루 5g 이하, 복수(배에 물이 차는 것) 예방\n• 고단백 식단 — 간 재생에 필수. 두부, 생선, 달걀, 닭가슴살\n• 탄수화물은 적당히 — 현미, 잡곡밥 권장\n\n좋은 음식:\n• 녹색 채소 (브로콜리, 시금치) — 항산화 효과\n• 블루베리, 포도 등 색이 짙은 과일\n• 올리브 오일, 아보카도 — 건강한 지방\n• 커피 — 간 섬유화 억제 효과 (하루 1-2잔)\n\n피해야 할 음식:\n• 알코올 (절대 금지)\n• 기름진 튀김류\n• 가공식품, 인스턴트 식품\n• 생선회 등 날 음식 (간기능 저하 시)',
        en: 'A liver-friendly diet is crucial for recovery after liver cancer treatment.\n\nEssential principles:\n• Absolute no alcohol — alcohol is directly toxic to the liver\n• Limit salt — under 5g/day to prevent ascites (fluid buildup)\n• High-protein diet — essential for liver regeneration: tofu, fish, eggs, chicken\n• Moderate carbohydrates — brown rice, mixed grains recommended\n\nBeneficial foods:\n• Green vegetables (broccoli, spinach) — antioxidant effects\n• Dark-colored fruits (blueberries, grapes)\n• Olive oil, avocado — healthy fats\n• Coffee — may inhibit liver fibrosis (1-2 cups/day)\n\nFoods to avoid:\n• Alcohol (strictly forbidden)\n• Deep-fried, greasy foods\n• Processed and instant foods\n• Raw fish/seafood (when liver function is impaired)',
        ru: 'Щадящая для печени диета — ключ к восстановлению после лечения рака печени.\n\nОсновные принципы:\n• Полный отказ от алкоголя — алкоголь токсичен для печени\n• Ограничение соли — менее 5 г/день для предотвращения асцита\n• Высокобелковая диета — тофу, рыба, яйца, курица\n• Умеренные углеводы — бурый рис, смешанные злаки\n\nПолезные продукты:\n• Зелёные овощи (брокколи, шпинат)\n• Тёмные фрукты (черника, виноград)\n• Оливковое масло, авокадо\n• Кофе — может подавлять фиброз печени (1-2 чашки/день)\n\nИзбегайте:\n• Алкоголь (строго запрещён)\n• Жареное и жирное\n• Переработанные продукты\n• Сырая рыба (при нарушении функции печени)',
        kz: 'Бауыр обырын емдеуден кейін бауырға жүктеме түсірмейтін тамақтану қалпына келудің кілті.\n\nНегізгі қағидалар:\n• Алкогольден толық бас тарту\n• Тұзды шектеу — күніне 5 г-нан аз\n• Жоғары ақуызды тамақтану — тофу, балық, жұмыртқа, тауық\n\nПайдалы тағамдар:\n• Жасыл көкөністер (брокколи, шпинат)\n• Қара түсті жемістер (көк жидек, жүзім)\n• Зәйтүн майы, авокадо\n• Кофе — бауыр фиброзын тежеуі мүмкін\n\nАулақ болу керек:\n• Алкоголь\n• Қуырылған тағамдар\n• Өңделген тағамдар',
        zh: '肝癌治疗后，不给肝脏增加负担的饮食是恢复的关键。\n\n基本原则：\n• 绝对戒酒——酒精对肝脏有直接毒性\n• 限盐——每天5克以下，预防腹水\n• 高蛋白饮食——肝脏再生必需：豆腐、鱼、鸡蛋、鸡肉\n• 适量碳水化合物——推荐糙米、杂粮\n\n有益食物：\n• 绿色蔬菜（西兰花、菠菜）——抗氧化\n• 深色水果（蓝莓、葡萄）\n• 橄榄油、牛油果——健康脂肪\n• 咖啡——可能抑制肝纤维化（每天1-2杯）\n\n应避免的食物：\n• 酒精（严格禁止）\n• 油炸高脂食物\n• 加工食品、即食食品\n• 生鱼片等生食（肝功能下降时）',
        ja: '肝臓がん治療後、肝臓に負担をかけない食事が回復の鍵です。\n\n必須原則：\n• 絶対禁酒——アルコールは肝臓に直接毒性がある\n• 塩分制限——1日5g以下、腹水予防\n• 高たんぱく食——肝臓再生に必須：豆腐、魚、卵、鶏むね肉\n• 炭水化物は適度に——玄米、雑穀米推奨\n\n良い食品：\n• 緑の野菜（ブロッコリー、ほうれん草）——抗酸化作用\n• 色の濃い果物（ブルーベリー、ぶどう）\n• オリーブオイル、アボカド——健康的な脂肪\n• コーヒー——肝線維化抑制効果（1日1-2杯）\n\n避けるべき食品：\n• アルコール（厳禁）\n• 脂っこい揚げ物\n• 加工食品、インスタント食品\n• 刺身など生もの（肝機能低下時）',
      },
    },
    {
      icon: Dumbbell,
      color: 'text-orange-600 bg-orange-50',
      image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Outdoor yoga exercise',
      title: { ko: '간암 환자의 운동 가이드', en: 'Exercise Guide for Liver Cancer Patients', ru: 'Упражнения для пациентов с раком печени', zh: '肝癌患者运动指南', ja: '肝臓がん患者の運動ガイド', kz: 'Бауыр обыры науқастарына жаттығулар' },
      body: {
        ko: '간암 치료 후 적절한 운동은 간 기능 회복과 체력 유지에 도움이 됩니다. 단, 간 기능 수치에 따라 운동 강도를 조절해야 합니다.\n\n수술 후 초기 (1-4주):\n• 침상 안정 후 천천히 보행 시작\n• 하루 10-15분 복도 걷기\n• 심호흡 운동으로 폐 합병증 예방\n\n회복기 (1-3개월):\n• 30분 산책 가능\n• 가벼운 스트레칭, 관절 운동\n• 피로감에 맞춰 강도 조절 — 무리하지 않기\n\n안정기 (3개월 이후):\n• 수영, 자전거 등 유산소 운동 가능\n• 가벼운 근력 운동 (고무밴드 등)\n• 요가, 태극권 권장\n\n주의사항:\n• 복수가 있을 때는 격렬한 운동 금지\n• 혈소판 수치가 낮으면 충돌 위험이 있는 운동 피하기\n• 피로감이 심하면 쉬는 것이 우선',
        en: 'Appropriate exercise after liver cancer treatment helps restore liver function and maintain stamina. Adjust intensity based on liver function levels.\n\nEarly post-surgery (1-4 weeks):\n• Start walking slowly after bed rest\n• 10-15 min hallway walks daily\n• Deep breathing exercises to prevent lung complications\n\nRecovery (1-3 months):\n• 30-minute walks possible\n• Light stretching, joint exercises\n• Adjust intensity to fatigue levels — don\'t overdo it\n\nStable phase (3+ months):\n• Aerobic exercises: swimming, cycling\n• Light resistance training (resistance bands)\n• Yoga, tai chi recommended\n\nPrecautions:\n• No vigorous exercise if ascites is present\n• Avoid contact sports when platelet count is low\n• Rest takes priority when fatigue is severe',
        ru: 'Умеренные упражнения после лечения помогают восстановить функцию печени и поддержать выносливость.\n\nРанний период (1-4 недели):\n• Начните ходить медленно после постельного режима\n• 10-15 минут ходьбы в день\n• Дыхательные упражнения для профилактики лёгочных осложнений\n\nВосстановление (1-3 месяца):\n• Прогулки 30 минут\n• Лёгкая растяжка, суставная гимнастика\n• Регулируйте нагрузку по уровню усталости\n\nСтабильный период (3+ месяца):\n• Аэробные упражнения: плавание, велосипед\n• Лёгкие силовые (резиновые ленты)\n• Йога, тай-чи рекомендуются\n\nМеры предосторожности:\n• Никаких интенсивных нагрузок при асците\n• Избегайте контактных видов спорта при низких тромбоцитах',
        kz: 'Бауыр обырын емдеуден кейін жаттығулар бауыр функциясын қалпына келтіруге көмектеседі.\n\nЕрте кезең (1-4 апта):\n• Төсек тынығуынан кейін баяу жүруді бастаңыз\n• Күніне 10-15 минут жүру\n• Тыныс алу жаттығулары\n\nҚалпына келу (1-3 ай):\n• 30 минут серуен\n• Жеңіл керу, буын жаттығулары\n\nТұрақты кезең (3+ ай):\n• Жүзу, велосипед\n• Йога, тайчи ұсынылады',
        zh: '肝癌治疗后适当运动有助于恢复肝功能和保持体力。需根据肝功能水平调整运动强度。\n\n术后早期（1-4周）：\n• 卧床休息后慢慢开始步行\n• 每天走廊步行10-15分钟\n• 深呼吸练习预防肺部并发症\n\n恢复期（1-3个月）：\n• 可步行30分钟\n• 轻度拉伸、关节运动\n• 根据疲劳程度调整强度——不要勉强\n\n稳定期（3个月以后）：\n• 有氧运动：游泳、骑车\n• 轻度力量训练（弹力带等）\n• 推荐瑜伽、太极拳\n\n注意事项：\n• 有腹水时禁止剧烈运动\n• 血小板低时避免碰撞性运动\n• 疲劳严重时休息优先',
        ja: '肝臓がん治療後の適切な運動は肝機能の回復と体力維持に役立ちます。肝機能の数値に応じて運動強度を調整してください。\n\n術後初期（1-4週間）：\n• 安静後にゆっくり歩行開始\n• 1日10-15分の廊下歩行\n• 深呼吸運動で肺合併症を予防\n\n回復期（1-3ヶ月）：\n• 30分散歩可能\n• 軽いストレッチ、関節運動\n• 疲労感に合わせて強度調整\n\n安定期（3ヶ月以降）：\n• 有酸素運動：水泳、自転車\n• 軽い筋力トレーニング（ゴムバンド等）\n• ヨガ、太極拳推奨\n\n注意事項：\n• 腹水がある時は激しい運動禁止\n• 血小板が低い時は衝突リスクのある運動を避ける',
      },
    },
    {
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Healthcare checkup',
      title: { ko: '즉시 병원에 연락해야 하는 증상', en: 'When to Contact the Hospital Immediately', ru: 'Когда срочно обращаться в больницу', zh: '需要立即联系医院的症状', ja: 'すぐに病院に連絡すべき症状', kz: 'Дереу ауруханаға хабарласу керек белгілер' },
      body: {
        ko: '간암 치료 후 다음 증상이 나타나면 즉시 의료진에게 연락하세요:\n\n🔴 긴급:\n• 피부와 눈이 노랗게 변함 (황달 악화)\n• 배가 급격히 부풀어 오름 (복수)\n• 토혈 또는 검은색 대변 (식도정맥류 출혈 의심)\n• 의식이 흐려지거나 혼란 상태 (간성 뇌증)\n• 38.5°C 이상 고열\n\n🟡 주의 (24시간 내):\n• 복통이 점점 심해짐\n• 소변 색이 진한 갈색으로 변함\n• 식욕이 완전히 사라짐\n• 출혈이 잘 멈추지 않음 (잇몸, 코피)\n• 극심한 가려움증',
        en: 'Contact your medical team immediately after liver cancer treatment if you notice:\n\n🔴 Emergency:\n• Skin and eyes turning yellow (worsening jaundice)\n• Abdomen rapidly swelling (ascites)\n• Vomiting blood or black stool (suspected variceal bleeding)\n• Confusion or altered consciousness (hepatic encephalopathy)\n• Persistent fever above 38.5°C\n\n🟡 Caution (within 24h):\n• Abdominal pain getting progressively worse\n• Urine turning dark brown\n• Complete loss of appetite\n• Bleeding that won\'t stop easily (gums, nosebleeds)\n• Severe itching',
        ru: 'Немедленно обратитесь к врачу после лечения рака печени при:\n\n🔴 Экстренно:\n• Кожа и глаза желтеют (усиление желтухи)\n• Живот быстро увеличивается (асцит)\n• Рвота кровью или чёрный стул (варикозное кровотечение)\n• Спутанность сознания (печёночная энцефалопатия)\n• Температура выше 38,5°C\n\n🟡 Внимание (24 часа):\n• Нарастающая боль в животе\n• Моча тёмно-коричневого цвета\n• Полная потеря аппетита\n• Кровотечение из дёсен, носа\n• Сильный зуд',
        kz: 'Бауыр обыры емдеуінен кейін мына белгілер болса дереу дәрігерге хабарласыңыз:\n\n🔴 Шұғыл:\n• Тері мен көздің сарғаюы (сарғаю нашарлауы)\n• Іштің тез ісінуі (асцит)\n• Қан құсу немесе қара нәжіс\n• Сананың бұлдырауы\n• 38,5°C-ден жоғары қызба\n\n🟡 Сақтық:\n• Іш ауырудың күшеюі\n• Несептің қоңыр түске айналуы\n• Тәбеттің толық жоғалуы',
        zh: '肝癌治疗后出现以下症状请立即联系医疗团队：\n\n🔴 紧急：\n• 皮肤和眼睛发黄（黄疸加重）\n• 腹部迅速膨胀（腹水）\n• 吐血或黑便（疑似食管静脉曲张出血）\n• 意识模糊或混乱（肝性脑病）\n• 38.5°C以上持续高热\n\n🟡 注意（24小时内）：\n• 腹痛逐渐加重\n• 尿液变成深褐色\n• 完全没有食欲\n• 出血不易止住（牙龈、鼻血）\n• 严重瘙痒',
        ja: '肝臓がん治療後、以下の症状があればすぐに医療チームに連絡してください：\n\n🔴 緊急：\n• 皮膚と目が黄色くなる（黄疸の悪化）\n• お腹が急激に膨れる（腹水）\n• 吐血または黒い便（食道静脈瘤出血の疑い）\n• 意識が朦朧とする、混乱状態（肝性脳症）\n• 38.5°C以上の高熱\n\n🟡 注意（24時間以内）：\n• 腹痛が徐々に悪化\n• 尿が濃い茶色に変わる\n• 食欲が完全になくなる\n• 出血が止まりにくい（歯茎、鼻血）\n• ひどいかゆみ',
      },
    },
    {
      icon: Brain,
      color: 'text-purple-600 bg-purple-50',
      image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Woman in meditation',
      title: { ko: '심리적 지원과 마음 건강', en: 'Psychological Support & Mental Health', ru: 'Психологическая поддержка', zh: '心理支持与心理健康', ja: '心理的サポートとメンタルヘルス', kz: 'Психологиялық қолдау' },
      body: {
        ko: '간암 진단은 특히 큰 충격을 줄 수 있습니다. B형간염이나 음주 이력이 있는 경우 자책감을 느끼기도 하지만, 자신을 탓하지 않는 것이 중요합니다.\n\n마음 관리 방법:\n• 진단에 대한 충격과 분노는 자연스러운 감정입니다\n• "왜 나인가"라는 질문보다 "지금 무엇을 할 수 있는가"에 집중하세요\n• 가족에게 모든 짐을 지우지 말고, 전문가의 도움을 적극 활용하세요\n• 규칙적인 일상 루틴을 유지하는 것이 안정감을 줍니다\n\n금주 스트레스 관리:\n• 음주 습관을 바꾸는 것은 쉽지 않습니다 — 필요 시 중독 상담도 가능\n• 대체 음료(무알코올 맥주, 탄산수, 허브티) 활용\n• 음주 대신 산책, 명상 등 새로운 스트레스 해소법 찾기\n\nhealwith는 한국 체류 중 통역 지원과 심리 상담 연결을 도와드립니다.',
        en: 'A liver cancer diagnosis can be particularly shocking. Those with hepatitis B or drinking history may feel guilt, but it\'s important not to blame yourself.\n\nMental care strategies:\n• Shock and anger at diagnosis are natural emotions\n• Focus on "what can I do now" rather than "why me"\n• Don\'t burden family with everything — actively seek professional help\n• Maintaining a regular daily routine provides stability\n\nManaging sobriety stress:\n• Changing drinking habits isn\'t easy — addiction counseling is available\n• Use alternatives (non-alcoholic beer, sparkling water, herbal tea)\n• Find new stress relief methods: walks, meditation instead of drinking\n\nhealwith provides interpretation support and psychological counseling connections during your stay in Korea.',
        ru: 'Диагноз рак печени может быть особенно шокирующим. Те, у кого есть гепатит B или история употребления алкоголя, могут чувствовать вину, но важно не винить себя.\n\nСтратегии заботы о психике:\n• Шок и гнев при диагнозе — естественные эмоции\n• Сосредоточьтесь на «что я могу сделать сейчас» вместо «почему я»\n• Не взваливайте всё на семью — обращайтесь к профессионалам\n• Регулярный распорядок дня обеспечивает стабильность\n\nУправление стрессом без алкоголя:\n• Изменить привычку пить нелегко — доступна помощь при зависимости\n• Используйте альтернативы (безалкогольное пиво, газированная вода, травяной чай)\n\nhealwith помогает с переводом и психологической поддержкой.',
        kz: 'Бауыр обыры диагнозы ерекше соққы болуы мүмкін. B гепатиті немесе ішімдік ішу тарихы бар адамдар кінәлі сезінуі мүмкін, бірақ өзіңізді кінәламау маңызды.\n\nПсихологиялық күтім:\n• Диагнозға деген дүрбелең мен ашу — табиғи эмоциялар\n• «Неге мен?» деген сұрақ орнына «қазір не істей аламын» деп ойланыңыз\n• Кәсіби көмекті белсенді пайдаланыңыз\n\nhealwith аударма қолдауын және психологиялық кеңес ұсынады.',
        zh: '肝癌诊断可能带来特别大的冲击。有乙肝或饮酒史的患者可能会自责，但不要责怪自己很重要。\n\n心理护理方法：\n• 诊断带来的冲击和愤怒是自然的情绪反应\n• 与其问"为什么是我"，不如关注"现在我能做什么"\n• 不要把所有负担都放在家人身上——积极寻求专业帮助\n• 保持规律的日常作息有助于稳定情绪\n\n戒酒压力管理：\n• 改变饮酒习惯并不容易——可寻求成瘾咨询\n• 使用替代饮品（无酒精啤酒、气泡水、花草茶）\n• 用散步、冥想等替代饮酒来缓解压力\n\nhealwith在韩国期间提供翻译支持和心理咨询对接。',
        ja: '肝臓がんの診断は特に大きなショックを与えることがあります。B型肝炎や飲酒歴がある場合、自責の念を感じることもありますが、自分を責めないことが大切です。\n\n心のケア方法：\n• 診断へのショックや怒りは自然な感情です\n• 「なぜ自分が」ではなく「今何ができるか」に集中しましょう\n• 家族にすべての負担をかけず、専門家の助けを積極的に活用\n• 規則的な日常ルーティンを維持することが安定感をもたらします\n\n禁酒ストレスの管理：\n• 飲酒習慣を変えるのは簡単ではありません——必要に応じて依存症カウンセリングも可能\n• 代替飲料（ノンアルコールビール、炭酸水、ハーブティー）の活用\n\nhealwithは韓国滞在中の通訳サポートと心理カウンセリングの手配をお手伝いします。',
      },
    },
  ],
};

GUIDES.lung = {
  title: { ko: '폐암 치료 종합 가이드', en: 'Lung Cancer Treatment Guide', ru: 'Руководство по лечению рака лёгких', zh: '肺癌治疗综合指南', ja: '肺がん治療総合ガイド', kz: 'Өкпе обыры емдеу нұсқаулығы' },
  sections: [
    {
      icon: Stethoscope,
      color: 'text-blue-600 bg-blue-50',
      image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Doctor examining medical scans',
      title: { ko: '한국에서의 폐암 치료', en: 'Lung Cancer Treatment in Korea', ru: 'Лечение рака лёгких в Корее', zh: '韩国的肺癌治疗', ja: '韓国での肺がん治療', kz: 'Кореядағы өкпе обыры емдеу' },
      body: {
        ko: '한국의 폐암 5년 생존율은 36.8%로, 10년 전 대비 크게 향상되었습니다. 특히 비소세포폐암 초기 단계에서는 생존율이 70% 이상입니다.\n\n주요 치료 방법:\n• 흉강경 수술(VATS) — 작은 절개로 폐엽 절제. 통증과 회복 기간 감소\n• 로봇 수술 — 정밀한 림프절 절제 가능\n• 방사선치료 — 수술 불가능한 경우 SBRT(정위방사선) 활용\n• 표적치료 — EGFR, ALK, ROS1 등 유전자 변이에 맞춤 치료\n• 면역관문억제제 — PD-L1 발현에 따른 면역치료 (키트루다, 옵디보)\n\n한국의 강점:\n• 유전체 분석 기반의 정밀의료\n• 다학제 협진 (외과, 종양내과, 방사선과 공동 진료)\n• 치료 기간: 수술 1-2주, 항암/방사선 3-6개월',
        en: 'Korea\'s lung cancer five-year survival rate is 36.8%, significantly improved over the past decade. Early-stage non-small cell lung cancer survival exceeds 70%.\n\nMain treatment methods:\n• VATS (Video-Assisted Thoracoscopic Surgery) — lobectomy through small incisions, less pain, faster recovery\n• Robotic surgery — precise lymph node dissection\n• Radiation therapy — SBRT (stereotactic body radiation) when surgery isn\'t possible\n• Targeted therapy — tailored to EGFR, ALK, ROS1 genetic mutations\n• Immune checkpoint inhibitors — immunotherapy based on PD-L1 expression (Keytruda, Opdivo)\n\nKorea\'s strengths:\n• Genomic analysis-based precision medicine\n• Multidisciplinary team approach (surgery, oncology, radiation jointly)\n• Timeline: surgery 1-2 weeks, chemo/radiation 3-6 months',
        ru: 'Пятилетняя выживаемость при раке лёгких в Корее составляет 36,8% — значительное улучшение. На ранних стадиях немелкоклеточного рака выживаемость превышает 70%.\n\nОсновные методы:\n• Видеоторакоскопическая хирургия (VATS) — лобэктомия через маленькие разрезы\n• Роботизированная хирургия — точная диссекция лимфоузлов\n• Лучевая терапия — SBRT при невозможности операции\n• Таргетная терапия — для мутаций EGFR, ALK, ROS1\n• Иммунотерапия — ингибиторы контрольных точек (Кейтруда, Опдиво)\n\nПреимущества Кореи:\n• Геномный анализ и точная медицина\n• Мультидисциплинарный подход\n• Сроки: операция 1-2 недели, химио/лучевая 3-6 месяцев',
        kz: 'Кореядағы өкпе обырының 5 жылдық тірі қалу деңгейі 36,8% — соңғы 10 жылда айтарлықтай жақсарды.\n\nНегізгі әдістер:\n• VATS хирургия — кішкентай кесінділер арқылы лобэктомия\n• Робот хирургия — дәл лимфа түйіндерін алу\n• Сәулелік терапия — операция мүмкін болмаған кезде SBRT\n• Таргетті терапия — EGFR, ALK, ROS1 мутацияларына бағытталған\n• Иммунотерапия — PD-L1 экспрессиясына негізделген',
        zh: '韩国肺癌五年生存率为36.8%，较十年前大幅提高。早期非小细胞肺癌生存率超过70%。\n\n主要治疗方法：\n• 胸腔镜手术(VATS)——小切口肺叶切除，疼痛少、恢复快\n• 机器人手术——精准淋巴结清扫\n• 放射治疗——不能手术时使用SBRT（立体定向放疗）\n• 靶向治疗——针对EGFR、ALK、ROS1等基因突变的精准治疗\n• 免疫检查点抑制剂——基于PD-L1表达的免疫治疗\n\n韩国优势：\n• 基于基因组分析的精准医疗\n• 多学科联合诊疗\n• 治疗周期：手术1-2周，化疗/放疗3-6个月',
        ja: '韓国の肺がん5年生存率は36.8%で、10年前から大幅に向上しました。早期の非小細胞肺がんでは生存率70%以上です。\n\n主な治療法：\n• 胸腔鏡手術（VATS）——小さな切開での肺葉切除、痛みと回復期間が短い\n• ロボット手術——精密なリンパ節郭清が可能\n• 放射線治療——手術不能の場合にSBRT（定位放射線）を活用\n• 分子標的治療——EGFR、ALK、ROS1など遺伝子変異に合わせた治療\n• 免疫チェックポイント阻害薬——PD-L1発現に基づく免疫治療\n\n韓国の強み：\n• ゲノム解析に基づく精密医療\n• 多職種連携チームアプローチ\n• 治療期間：手術1-2週間、化学療法/放射線3-6ヶ月',
      },
    },
    {
      icon: Utensils,
      color: 'text-green-600 bg-green-50',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Fresh salad with olive oil',
      title: { ko: '폐암 환자의 영양 관리', en: 'Nutrition for Lung Cancer Patients', ru: 'Питание при раке лёгких', zh: '肺癌患者的营养管理', ja: '肺がん患者の栄養管理', kz: 'Өкпе обыры науқастарына тамақтану' },
      body: {
        ko: '폐암 치료 중 체중 감소와 영양 부족은 흔한 문제입니다. 충분한 영양이 치료 효과와 체력 유지에 필수적입니다.\n\n핵심 영양 원칙:\n• 고단백·고열량 식단 — 체중 감소 방지가 최우선\n• 소량 다회식 — 호흡 곤란 시 큰 식사가 어려우므로 하루 5-6회\n• 부드러운 음식 — 삼키기 어려울 때 스무디, 수프, 죽 활용\n• 수분 보충 — 하루 1.5L 이상, 가래 묽게 하는 데 도움\n\n항암 부작용별 대처:\n• 입맛 변화 — 레몬, 생강으로 맛을 보정\n• 구내염 — 자극적인 음식 피하기, 부드러운 아이스크림 가능\n• 변비 — 섬유질 풍부한 채소, 과일 섭취\n\n금연 후 체중 증가가 걱정되지만, 치료 중에는 체중 유지가 더 중요합니다.',
        en: 'Weight loss and malnutrition are common during lung cancer treatment. Adequate nutrition is essential for treatment effectiveness and stamina.\n\nKey nutrition principles:\n• High-protein, high-calorie diet — preventing weight loss is top priority\n• Small, frequent meals — 5-6 times/day when breathing difficulty makes large meals hard\n• Soft foods — smoothies, soups, porridge when swallowing is difficult\n• Stay hydrated — 1.5L+ daily, helps thin mucus\n\nManaging chemo side effects:\n• Taste changes — use lemon, ginger to adjust flavors\n• Mouth sores — avoid spicy foods, soft ice cream is okay\n• Constipation — fiber-rich vegetables and fruits\n\nWeight gain after quitting smoking is a concern, but maintaining weight during treatment is more important.',
        ru: 'Потеря веса и недоедание часты при лечении рака лёгких. Адекватное питание необходимо.\n\nОсновные принципы:\n• Высокобелковая, высококалорийная диета — предотвращение потери веса приоритет\n• Маленькие частые приёмы — 5-6 раз/день при одышке\n• Мягкая пища — смузи, супы, каши при затруднённом глотании\n• Гидратация — 1,5+ литра в день, помогает разжижать мокроту\n\nПри побочных эффектах химиотерапии:\n• Изменение вкуса — лимон, имбирь\n• Стоматит — избегайте острого\n• Запор — овощи и фрукты с клетчаткой',
        kz: 'Өкпе обырын емдеу кезінде салмақ жоғалту жиі кездеседі. Жеткілікті тамақтану емдеу тиімділігі үшін маңызды.\n\nНегізгі қағидалар:\n• Жоғары ақуызды, жоғары калориялы тамақтану\n• Аз мөлшерде жиі тамақтану — күніне 5-6 рет\n• Жұмсақ тағамдар — тұтыну қиын болған кезде\n• Сұйықтық — күніне 1,5 л-ден астам',
        zh: '肺癌治疗期间体重下降和营养不足很常见。充足的营养对治疗效果和体力维持至关重要。\n\n核心营养原则：\n• 高蛋白高热量饮食——防止体重下降是首要任务\n• 少量多餐——呼吸困难时大餐难以完成，每天5-6餐\n• 软食——吞咽困难时用奶昔、汤、粥\n• 补充水分——每天1.5升以上，有助于稀释痰液\n\n化疗副作用应对：\n• 味觉改变——用柠檬、姜调味\n• 口腔溃疡——避免刺激性食物\n• 便秘——多吃富含纤维的蔬菜水果\n\n戒烟后体重增加令人担忧，但治疗期间维持体重更重要。',
        ja: '肺がん治療中の体重減少と栄養不足は一般的な問題です。十分な栄養は治療効果と体力維持に不可欠です。\n\n重要な栄養原則：\n• 高たんぱく・高カロリー食——体重減少の防止が最優先\n• 少量頻回食——呼吸困難で大食が難しい場合は1日5-6回\n• 柔らかい食品——飲み込みにくい時はスムージー、スープ、お粥を活用\n• 水分補給——1日1.5L以上、痰を薄くするのに役立つ\n\n抗がん剤の副作用対策：\n• 味覚変化——レモン、生姜で味を調整\n• 口内炎——刺激的な食べ物を避ける\n• 便秘——食物繊維豊富な野菜、果物を摂取\n\n禁煙後の体重増加が心配されますが、治療中は体重維持がより重要です。',
      },
    },
    {
      icon: Dumbbell,
      color: 'text-orange-600 bg-orange-50',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Exercise and fitness',
      title: { ko: '호흡 재활과 운동', en: 'Breathing Rehabilitation & Exercise', ru: 'Дыхательная реабилитация и упражнения', zh: '呼吸康复与运动', ja: '呼吸リハビリと運動', kz: 'Тыныс алу оңалтуы және жаттығулар' },
      body: {
        ko: '폐 수술 후 호흡 기능 회복은 가장 중요한 재활 목표입니다. 호흡 운동을 꾸준히 하면 폐활량이 상당히 회복됩니다.\n\n호흡 운동 (매일):\n• 복식호흡 — 코로 천천히 들이쉬고 (배 부풀리기), 입으로 천천히 내쉬기\n• 입술 오므려 불기 — 촛불 끄듯이 천천히 내쉬기, 기관지 확장 효과\n• 인센티브 스파이로미터 — 병원에서 제공하는 호흡 측정기로 매시간 10회\n\n단계별 운동:\n• 1-2주: 병실 내 걷기 + 호흡 운동\n• 1개월: 15-20분 산책, 가벼운 스트레칭\n• 3개월: 30분 걷기, 계단 오르기, 가벼운 자전거\n• 6개월: 수영, 조깅 등 유산소 운동 (담당의 허가 후)\n\n주의사항:\n• 운동 중 산소포화도 90% 이하로 떨어지면 중단\n• 숨이 차면 쉬었다가 다시 시작\n• 대기 오염이 심한 날은 실내 운동으로 대체',
        en: 'Recovering breathing function is the most important rehabilitation goal after lung surgery. Consistent breathing exercises can significantly restore lung capacity.\n\nBreathing exercises (daily):\n• Diaphragmatic breathing — inhale slowly through nose (belly rises), exhale slowly through mouth\n• Pursed-lip breathing — exhale slowly as if blowing out a candle, helps open airways\n• Incentive spirometer — use the hospital-provided device, 10 times every hour\n\nPhased exercise:\n• Weeks 1-2: Walk in room + breathing exercises\n• Month 1: 15-20 min walks, light stretching\n• Month 3: 30-min walks, stair climbing, light cycling\n• Month 6: Swimming, jogging (with doctor approval)\n\nPrecautions:\n• Stop if oxygen saturation drops below 90%\n• Rest when short of breath, then resume\n• Exercise indoors on high-pollution days',
        ru: 'Восстановление дыхательной функции — главная цель реабилитации после операции на лёгких.\n\nДыхательные упражнения (ежедневно):\n• Диафрагмальное дыхание — медленный вдох через нос (живот поднимается), медленный выдох через рот\n• Дыхание через сомкнутые губы — медленный выдох, как задувание свечи\n• Спирометрия — используйте больничное устройство 10 раз каждый час\n\nПоэтапные упражнения:\n• 1-2 недели: Ходьба в палате + дыхательные упражнения\n• 1 месяц: Прогулки 15-20 мин, лёгкая растяжка\n• 3 месяца: 30-минутные прогулки, подъём по лестнице\n• 6 месяцев: Плавание, бег (с разрешения врача)\n\nМеры предосторожности:\n• Остановитесь если сатурация ниже 90%\n• Отдыхайте при одышке',
        kz: 'Өкпе операциясынан кейін тыныс алу функциясын қалпына келтіру ең маңызды оңалту мақсаты.\n\nТыныс алу жаттығулары (күнделікті):\n• Диафрагмалық тыныс алу — мұрын арқылы баяу тыныс алу, ауыз арқылы баяу шығару\n• Ерін арқылы тыныс шығару — шам сөндіргендей баяу шығару\n\nКезеңдік жаттығулар:\n• 1-2 апта: Бөлме ішінде жүру\n• 1 ай: 15-20 минут серуен\n• 3 ай: 30 минут жүру, баспалдақ көтерілу\n• 6 ай: Жүзу, жүгіру (дәрігер рұқсатымен)',
        zh: '肺部手术后恢复呼吸功能是最重要的康复目标。坚持呼吸训练可显著恢复肺活量。\n\n呼吸练习（每天）：\n• 腹式呼吸——鼻子慢慢吸气（腹部鼓起），嘴巴慢慢呼气\n• 缩唇呼吸——像吹蜡烛一样慢慢呼气，有助扩张气管\n• 激励式肺量计——使用医院提供的呼吸训练器，每小时10次\n\n分阶段运动：\n• 1-2周：病房内走动 + 呼吸训练\n• 1个月：15-20分钟散步，轻度拉伸\n• 3个月：30分钟步行，爬楼梯，轻度骑车\n• 6个月：游泳、慢跑等有氧运动（经医生批准）\n\n注意事项：\n• 运动中血氧饱和度低于90%时停止\n• 气短时休息再继续\n• 空气污染严重时改为室内运动',
        ja: '肺手術後の呼吸機能回復は最も重要なリハビリ目標です。継続的な呼吸運動で肺活量はかなり回復します。\n\n呼吸運動（毎日）：\n• 腹式呼吸——鼻からゆっくり吸い（お腹を膨らませ）、口からゆっくり吐く\n• 口すぼめ呼吸——ろうそくを消すようにゆっくり吐く、気管支拡張効果\n• インセンティブスパイロメーター——病院提供の呼吸測定器で毎時10回\n\n段階別運動：\n• 1-2週間：病室内歩行＋呼吸運動\n• 1ヶ月：15-20分散歩、軽いストレッチ\n• 3ヶ月：30分歩行、階段昇降、軽い自転車\n• 6ヶ月：水泳、ジョギング（主治医の許可後）\n\n注意事項：\n• 酸素飽和度が90%以下になったら中止\n• 息切れしたら休んでから再開\n• 大気汚染がひどい日は室内運動に変更',
      },
    },
    {
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Doctor with stethoscope',
      title: { ko: '즉시 병원에 연락해야 하는 증상', en: 'When to Contact the Hospital Immediately', ru: 'Когда срочно обращаться в больницу', zh: '需要立即联系医院的症状', ja: 'すぐに病院に連絡すべき症状', kz: 'Дереу ауруханаға хабарласу керек белгілер' },
      body: {
        ko: '폐암 치료 후 다음 증상이 나타나면 즉시 연락하세요:\n\n🔴 긴급:\n• 갑작스러운 심한 호흡곤란\n• 객혈 (기침에 피가 섞임)\n• 38.5°C 이상 고열 (감염 의심)\n• 가슴의 급격한 통증\n• 얼굴이나 목이 부어오름 (상대정맥 증후군)\n\n🟡 주의 (24시간 내):\n• 기침이 점점 심해지거나 양상이 변함\n• 가래 색이 녹색이나 노란색으로 변함\n• 쉬어도 호흡곤란이 개선되지 않음\n• 체중이 급격히 감소 (1주일 2kg 이상)\n• 목소리가 갑자기 변함 (쉰 목소리)',
        en: 'Contact your hospital immediately after lung cancer treatment if you notice:\n\n🔴 Emergency:\n• Sudden severe difficulty breathing\n• Hemoptysis (blood in cough)\n• Persistent fever above 38.5°C (suspected infection)\n• Acute chest pain\n• Face or neck swelling (superior vena cava syndrome)\n\n🟡 Caution (within 24h):\n• Cough worsening or changing character\n• Sputum turning green or yellow\n• Breathlessness not improving with rest\n• Rapid weight loss (over 2kg per week)\n• Sudden voice changes (hoarseness)',
        ru: 'После лечения рака лёгких немедленно обратитесь при:\n\n🔴 Экстренно:\n• Внезапная сильная одышка\n• Кровохарканье (кровь при кашле)\n• Температура выше 38,5°C\n• Острая боль в груди\n• Отёк лица или шеи\n\n🟡 Внимание (24 часа):\n• Усиление или изменение кашля\n• Мокрота зелёного или жёлтого цвета\n• Одышка не улучшается при отдыхе\n• Быстрая потеря веса\n• Внезапная хрипота',
        kz: 'Өкпе обыры емдеуінен кейін мына белгілер болса дереу хабарласыңыз:\n\n🔴 Шұғыл:\n• Кенеттен қатты тыныс алу қиындығы\n• Қан жөтелу\n• 38,5°C-ден жоғары қызба\n• Кеудедегі қатты ауру\n\n🟡 Сақтық:\n• Жөтелдің күшеюі\n• Қақырықтың жасыл немесе сары түске айналуы\n• Тынығу кезінде тыныс алу жақсармауы',
        zh: '肺癌治疗后出现以下症状请立即联系：\n\n🔴 紧急：\n• 突然严重呼吸困难\n• 咯血（咳嗽带血）\n• 38.5°C以上持续高热（疑似感染）\n• 急性胸痛\n• 面部或颈部肿胀（上腔静脉综合征）\n\n🟡 注意（24小时内）：\n• 咳嗽加重或性质改变\n• 痰液变成绿色或黄色\n• 休息后呼吸困难未改善\n• 体重急速下降（每周超过2公斤）\n• 声音突然改变（嘶哑）',
        ja: '肺がん治療後、以下の症状があればすぐに連絡してください：\n\n🔴 緊急：\n• 突然の激しい呼吸困難\n• 喀血（咳に血が混じる）\n• 38.5°C以上の高熱（感染疑い）\n• 急性の胸痛\n• 顔や首のむくみ（上大静脈症候群）\n\n🟡 注意（24時間以内）：\n• 咳がひどくなる、または性質が変わる\n• 痰の色が緑や黄色に変わる\n• 安静にしても息切れが改善しない\n• 急激な体重減少（週2kg以上）\n• 突然の声の変化（嗄声）',
      },
    },
    {
      icon: Brain,
      color: 'text-purple-600 bg-purple-50',
      image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Meditation class',
      title: { ko: '심리적 지원과 금연 관리', en: 'Psychological Support & Smoking Cessation', ru: 'Психологическая поддержка и отказ от курения', zh: '心理支持与戒烟管理', ja: '心理的サポートと禁煙管理', kz: 'Психологиялық қолдау және темекіні тастау' },
      body: {
        ko: '폐암 진단 후 흡연 이력이 있는 환자는 특히 자책감을 느끼기 쉽습니다. 하지만 폐암은 비흡연자에게도 발생하며, 지금 할 수 있는 일에 집중하는 것이 중요합니다.\n\n금연 지원:\n• 진단 후에도 금연은 치료 효과를 높입니다\n• 니코틴 패치, 금연 상담 등 의료진의 도움을 받으세요\n• 주변에 흡연 유혹이 있을 때의 대처법을 미리 준비\n\n심리적 지원:\n• 호흡곤란으로 인한 불안감은 호흡 훈련으로 크게 개선됩니다\n• "숨 쉬는 것이 힘들다"는 공포감은 매우 흔합니다 — 의료진에게 솔직히 말씀하세요\n• 환자 모임이나 온라인 커뮤니티에서 같은 경험을 나누세요\n• 가족도 함께 상담을 받으면 서로에게 더 좋은 지지가 됩니다\n\nhealwith는 한국 체류 중 통역 지원과 심리 상담 연결을 도와드립니다.',
        en: 'Patients with a smoking history often feel guilt after a lung cancer diagnosis. But lung cancer also occurs in non-smokers, and focusing on what you can do now is what matters.\n\nSmoking cessation support:\n• Quitting after diagnosis improves treatment outcomes\n• Get help: nicotine patches, cessation counseling from medical staff\n• Prepare coping strategies for smoking temptations\n\nPsychological support:\n• Anxiety from breathing difficulty improves significantly with breathing training\n• Fear of "not being able to breathe" is very common — tell your medical team honestly\n• Share experiences in patient groups or online communities\n• Family counseling together provides better mutual support\n\nhealwith provides interpretation and psychological counseling connections during your Korea stay.',
        ru: 'Пациенты с историей курения часто чувствуют вину. Но рак лёгких бывает и у некурящих, важно сосредоточиться на том, что можно сделать сейчас.\n\nПомощь в отказе от курения:\n• Отказ после диагноза улучшает результаты лечения\n• Никотиновые пластыри, консультации по отказу от курения\n• Подготовьте стратегии для борьбы с соблазнами\n\nПсихологическая поддержка:\n• Тревога от одышки значительно уменьшается с дыхательными тренировками\n• Страх «не смочь дышать» очень распространён — скажите врачам честно\n• Делитесь опытом в группах пациентов\n• Семейное консультирование обеспечивает лучшую взаимную поддержку\n\nhealwith обеспечивает помощь с переводом и психологическую поддержку.',
        kz: 'Темекі шегу тарихы бар науқастар өкпе обыры диагнозынан кейін жиі кінәлі сезінеді. Бірақ өкпе обыры шекпейтіндерде де кездеседі.\n\nТемекіні тастау қолдауы:\n• Диагноздан кейін тастау емдеу нәтижелерін жақсартады\n• Никотин пластырьлері, тастау кеңестері\n\nПсихологиялық қолдау:\n• Тыныс алу қиындығынан алаңдаушылық тыныс алу жаттығуларымен жақсарады\n• Науқастар топтарында тәжірибе алмасыңыз\n\nhealwith аударма қолдауын және психологиялық кеңес ұсынады.',
        zh: '有吸烟史的患者在肺癌诊断后常常感到自责。但肺癌在非吸烟者中也会发生，重要的是关注现在能做什么。\n\n戒烟支持：\n• 诊断后戒烟仍能提高治疗效果\n• 寻求帮助：尼古丁贴片、医护人员的戒烟咨询\n• 提前准备应对吸烟诱惑的策略\n\n心理支持：\n• 呼吸困难引起的焦虑通过呼吸训练可显著改善\n• "无法呼吸"的恐惧很常见——请坦诚告诉医疗团队\n• 在患者群体或网络社区分享经验\n• 家庭一起接受咨询能提供更好的相互支持\n\nhealwith在韩国期间提供翻译支持和心理咨询对接。',
        ja: '喫煙歴のある患者さんは肺がん診断後、特に自責感を感じやすいです。しかし肺がんは非喫煙者にも発生し、今できることに集中することが大切です。\n\n禁煙サポート：\n• 診断後の禁煙でも治療効果が向上します\n• ニコチンパッチ、禁煙カウンセリングなど医療チームの助けを借りましょう\n• 喫煙の誘惑への対処法を事前に準備\n\n心理的サポート：\n• 呼吸困難による不安は呼吸トレーニングで大幅に改善します\n• 「息ができない」という恐怖は非常に一般的——医療チームに正直に伝えましょう\n• 患者会やオンラインコミュニティで同じ経験を共有\n• 家族と一緒にカウンセリングを受けるとより良い支えになります\n\nhealwithは韓国滞在中の通訳サポートと心理カウンセリングの手配をお手伝いします。',
      },
    },
  ],
};

GUIDES.thyroid = {
  title: { ko: '갑상선암 치료 종합 가이드', en: 'Thyroid Cancer Treatment Guide', ru: 'Руководство по лечению рака щитовидной железы', zh: '甲状腺癌治疗综合指南', ja: '甲状腺がん治療総合ガイド', kz: 'Қалқанша без обыры емдеу нұсқаулығы' },
  sections: [
    {
      icon: Stethoscope,
      color: 'text-blue-600 bg-blue-50',
      image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Professional doctor portrait',
      title: { ko: '한국에서의 갑상선암 치료', en: 'Thyroid Cancer Treatment in Korea', ru: 'Лечение рака щитовидной железы в Корее', zh: '韩国的甲状腺癌治疗', ja: '韓国での甲状腺がん治療', kz: 'Кореядағы қалқанша без обыры емдеу' },
      body: {
        ko: '한국의 갑상선암 5년 생존율은 100%에 가까운 99.9%로, 예후가 매우 좋은 암입니다. 한국은 갑상선암 수술 경험이 세계에서 가장 많으며, 흉터를 최소화하는 수술법이 발달해 있습니다.\n\n주요 치료 방법:\n• 갑상선 전절제술 — 갑상선 전체 제거. 이후 갑상선 호르몬제 평생 복용\n• 엽절제술 — 암이 작고 한쪽에만 있을 때 반만 제거. 호르몬제 불필요할 수도\n• 로봇/내시경 수술 — 겨드랑이나 입 안으로 접근하여 목에 흉터 없음\n• 방사성 요오드 치료 — 수술 후 잔여 갑상선 조직과 전이 부위 제거\n• 능동적 감시 — 매우 작은 미세암의 경우 수술 없이 경과 관찰\n\n치료 기간: 수술 2-3일 입원, 방사성 요오드 치료 시 2-3일 격리.',
        en: 'Korea\'s thyroid cancer five-year survival rate is nearly 100% at 99.9%, making it one of the most curable cancers. Korea has the most thyroid surgery experience globally and excels in scar-minimizing techniques.\n\nMain treatment methods:\n• Total thyroidectomy — removes entire thyroid. Lifelong thyroid hormone medication required\n• Lobectomy — removes only half when cancer is small and one-sided. Hormone meds may not be needed\n• Robotic/endoscopic surgery — access through armpit or mouth, no neck scar\n• Radioactive iodine therapy — eliminates remaining thyroid tissue and metastases after surgery\n• Active surveillance — monitoring without surgery for very small micro-cancers\n\nTimeline: 2-3 days hospitalization for surgery, 2-3 days isolation for radioactive iodine.',
        ru: 'Пятилетняя выживаемость при раке щитовидной железы в Корее составляет 99,9%. Корея имеет наибольший опыт хирургии щитовидной железы в мире.\n\nОсновные методы:\n• Тотальная тиреоидэктомия — полное удаление. Пожизненный приём гормонов\n• Лобэктомия — удаление только половины при маленькой опухоли\n• Роботизированная/эндоскопическая хирургия — доступ через подмышку или рот, без шрама на шее\n• Радиойодтерапия — уничтожение остаточной ткани и метастазов после операции\n• Активное наблюдение — при очень маленьких микрораках без операции\n\nСроки: 2-3 дня госпитализации, 2-3 дня изоляции при радиойодтерапии.',
        kz: 'Кореядағы қалқанша без обырының 5 жылдық тірі қалу деңгейі 99,9% — ең жақсы болжамды обырлардың бірі.\n\nНегізгі әдістер:\n• Жалпы тиреоидэктомия — қалқанша безін толық алу. Өмір бойы гормон қабылдау қажет\n• Лобэктомия — ісік кішкентай болған кезде жартысын ғана алу\n• Робот/эндоскопиялық хирургия — қолтық немесе ауыз арқылы кіру, мойында тыртық қалмайды\n• Радиоактивті йод терапиясы — операциядан кейін қалған тіндерді жою\n• Белсенді бақылау — өте кішкентай ісіктерде операциясыз бақылау',
        zh: '韩国甲状腺癌五年生存率接近100%，达99.9%，是预后最好的癌症之一。韩国甲状腺手术经验全球最多，疤痕最小化技术领先。\n\n主要治疗方法：\n• 甲状腺全切术——切除整个甲状腺，术后终身服用甲状腺激素\n• 腺叶切除术——癌灶小且局限一侧时仅切除一半，可能不需激素药\n• 机器人/内镜手术——从腋下或口腔入路，颈部无疤痕\n• 放射性碘治疗——术后清除残余甲状腺组织和转移灶\n• 积极监测——非常小的微小癌可不手术观察\n\n治疗周期：手术住院2-3天，放射性碘治疗隔离2-3天。',
        ja: '韓国の甲状腺がん5年生存率は99.9%とほぼ100%で、最も予後が良いがんの一つです。韓国は甲状腺手術の経験が世界で最も多く、傷跡を最小化する手術法が発達しています。\n\n主な治療法：\n• 甲状腺全摘出術——甲状腺全体を除去。以後、甲状腺ホルモン薬を生涯服用\n• 葉切除術——がんが小さく片側のみの場合、半分だけ除去。ホルモン薬不要の場合も\n• ロボット/内視鏡手術——腋窩や口腔内からアプローチ、首に傷跡なし\n• 放射性ヨウ素治療——手術後の残存甲状腺組織と転移部位を除去\n• 能動的監視——非常に小さな微小がんの場合、手術せず経過観察\n\n治療期間：手術入院2-3日、放射性ヨウ素治療時2-3日隔離。',
      },
    },
    {
      icon: Utensils,
      color: 'text-green-600 bg-green-50',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Nutritious meal with eggs and vegetables',
      title: { ko: '갑상선암 치료와 식단', en: 'Diet & Thyroid Cancer Treatment', ru: 'Диета при лечении рака щитовидной железы', zh: '甲状腺癌治疗与饮食', ja: '甲状腺がん治療と食事', kz: 'Қалқанша без обыры емдеуі мен тамақтану' },
      body: {
        ko: '갑상선암 치료 후 식단 관리는 특히 방사성 요오드 치료 전후로 중요합니다.\n\n방사성 요오드 치료 전 (2주간 저요오드 식단):\n• 해조류 (김, 미역, 다시마) 완전 금지\n• 유제품 제한 — 우유, 치즈, 요거트\n• 요오드 함유 소금 대신 무요오드 소금 사용\n• 달걀노른자 제한 (흰자는 가능)\n• 가공식품 주의 — 대부분 요오드 소금 포함\n\n수술 후 일반 식단:\n• 목이 불편할 수 있으므로 처음에는 부드러운 음식\n• 칼슘 보충 — 부갑상선 기능 저하 시 필수 (유제품, 멸치, 두부)\n• 비타민 D 충분히 — 칼슘 흡수 돕기\n• 셀레늄 함유 음식 — 견과류, 해바라기씨, 마늘\n\n호르몬제 복용 시:\n• 매일 아침 공복에 복용, 30분 후 식사\n• 카페인, 칼슘 보충제와 시간 간격 두기',
        en: 'Diet management after thyroid cancer is particularly important around radioactive iodine treatment.\n\nBefore radioactive iodine (2-week low-iodine diet):\n• No seaweed (nori, wakame, kelp) at all\n• Limit dairy — milk, cheese, yogurt\n• Use non-iodized salt instead of iodized salt\n• Limit egg yolks (whites are fine)\n• Watch processed foods — most contain iodized salt\n\nPost-surgery general diet:\n• Start with soft foods as throat may be uncomfortable\n• Calcium supplementation — essential if parathyroid function is reduced (dairy, tofu)\n• Adequate vitamin D — aids calcium absorption\n• Selenium-rich foods — nuts, sunflower seeds, garlic\n\nWhen taking hormone medication:\n• Take on empty stomach every morning, eat 30 min later\n• Space out from caffeine and calcium supplements',
        ru: 'Диета после лечения рака щитовидной железы особенно важна до и после радиойодтерапии.\n\nПеред радиойодтерапией (2 недели низкойодной диеты):\n• Полный запрет морских водорослей\n• Ограничение молочных продуктов\n• Используйте нейодированную соль\n• Ограничьте яичные желтки\n• Осторожно с переработанными продуктами\n\nОбщая диета после операции:\n• Начните с мягкой пищи (горло может болеть)\n• Кальций — обязательно при снижении функции паращитовидных желёз\n• Достаточно витамина D\n• Продукты с селеном — орехи, семена, чеснок\n\nПри приёме гормонов:\n• Утром натощак, еда через 30 минут\n• Разделяйте с кофеином и кальцием по времени',
        kz: 'Қалқанша без обырын емдеуден кейін тамақтану басқару, әсіресе радиоактивті йод емдеуі кезінде маңызды.\n\nРадиоактивті йоддан бұрын (2 апта аз йодты диета):\n• Теңіз балдырлары толық тыйым\n• Сүт өнімдерін шектеу\n• Йодсыз тұз қолдану\n\nОперациядан кейін:\n• Жұмсақ тағамдардан бастаңыз\n• Кальцийді толықтыру\n• D витаминін жеткілікті алу',
        zh: '甲状腺癌治疗后的饮食管理，在放射性碘治疗前后尤为重要。\n\n放射性碘治疗前（2周低碘饮食）：\n• 完全禁止海藻类（紫菜、海带）\n• 限制乳制品——牛奶、奶酪、酸奶\n• 用无碘盐替代加碘盐\n• 限制蛋黄（蛋白可以）\n• 注意加工食品——大多含碘盐\n\n术后一般饮食：\n• 喉咙可能不适，先吃软食\n• 补充钙——甲状旁腺功能减退时必需（乳制品、豆腐）\n• 充足维生素D——帮助钙吸收\n• 含硒食物——坚果、葵花籽、大蒜\n\n服用激素药物时：\n• 每天早晨空腹服用，30分钟后进食\n• 与咖啡因、钙补充剂错开时间',
        ja: '甲状腺がん治療後の食事管理は、特に放射性ヨウ素治療の前後で重要です。\n\n放射性ヨウ素治療前（2週間の低ヨウ素食）：\n• 海藻類（のり、わかめ、昆布）完全禁止\n• 乳製品制限——牛乳、チーズ、ヨーグルト\n• ヨウ素含有塩の代わりに無ヨウ素塩を使用\n• 卵黄制限（白身はOK）\n• 加工食品に注意——ほとんどにヨウ素塩が含まれる\n\n術後の一般的な食事：\n• 喉が不快なため最初は柔らかい食べ物から\n• カルシウム補給——副甲状腺機能低下時に必須（乳製品、豆腐）\n• ビタミンDを十分に——カルシウム吸収を助ける\n• セレン含有食品——ナッツ、ひまわりの種、にんにく\n\nホルモン薬服用時：\n• 毎朝空腹時に服用、30分後に食事\n• カフェインやカルシウムサプリとは時間を空ける',
      },
    },
    {
      icon: Dumbbell,
      color: 'text-orange-600 bg-orange-50',
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Gentle stretching exercise',
      title: { ko: '수술 후 회복과 운동', en: 'Post-Surgery Recovery & Exercise', ru: 'Восстановление и упражнения после операции', zh: '术后恢复与运动', ja: '術後の回復と運動', kz: 'Операциядан кейінгі қалпына келу' },
      body: {
        ko: '갑상선 수술은 비교적 회복이 빠른 수술입니다. 하지만 목 부위 수술이므로 주의할 점이 있습니다.\n\n수술 후 1주:\n• 목을 과도하게 젖히거나 돌리지 않기\n• 가벼운 산책 시작 (10-15분)\n• 부드러운 목 스트레칭 — 의료진 지시에 따라\n• 목소리를 과도하게 사용하지 않기\n\n2-4주:\n• 가벼운 운동 재개 가능 (걷기, 스트레칭)\n• 수영은 상처 완전 아물 때까지 대기\n• 무거운 물건 들기 자제\n\n1개월 이후:\n• 대부분의 일상 활동 복귀 가능\n• 조깅, 자전거, 요가 가능\n• 고강도 운동은 갑상선 호르몬 수치 안정 후\n\n갑상선 호르몬 관리:\n• 호르몬제 용량이 안정되면 피로감이 크게 개선됩니다\n• 정기적인 혈액 검사 (TSH)로 용량 조절\n• 체중, 체온, 기분 변화를 기록하면 의료진에게 도움이 됩니다',
        en: 'Thyroid surgery has a relatively quick recovery. However, as it\'s neck surgery, there are specific precautions.\n\nWeek 1 after surgery:\n• Don\'t tilt or turn neck excessively\n• Start gentle walks (10-15 min)\n• Soft neck stretching — follow medical team\'s guidance\n• Don\'t overuse your voice\n\nWeeks 2-4:\n• Light exercise can resume (walking, stretching)\n• Wait for wound to fully heal before swimming\n• Avoid lifting heavy objects\n\n1 month+:\n• Most daily activities can resume\n• Jogging, cycling, yoga possible\n• High-intensity exercise after thyroid hormone levels stabilize\n\nThyroid hormone management:\n• Fatigue improves significantly once hormone dosage stabilizes\n• Regular blood tests (TSH) to adjust dosage\n• Recording weight, temperature, and mood changes helps your medical team',
        ru: 'Операция на щитовидной железе имеет относительно быстрое восстановление, но есть особенности.\n\n1 неделя после операции:\n• Не наклоняйте и не поворачивайте шею чрезмерно\n• Начните лёгкие прогулки (10-15 мин)\n• Мягкая растяжка шеи по указанию врачей\n• Не перенапрягайте голос\n\n2-4 недели:\n• Лёгкие упражнения можно возобновить\n• Плавание — после полного заживления раны\n• Не поднимайте тяжести\n\n1 месяц+:\n• Большинство повседневных дел доступны\n• Бег, велосипед, йога возможны\n• Интенсивные тренировки после стабилизации гормонов\n\nУправление гормонами:\n• Усталость значительно уменьшается при стабильной дозе\n• Регулярные анализы крови (ТТГ)\n• Записывайте вес, температуру и настроение',
        kz: 'Қалқанша без операциясы салыстырмалы түрде тез қалпына келтірілетін операция.\n\n1 апта:\n• Мойынды артық еңкейтпеңіз\n• Жеңіл серуен бастаңыз (10-15 мин)\n• Дәрігер нұсқауымен мойын керу\n\n2-4 апта:\n• Жеңіл жаттығуларды жалғастыруға болады\n• Жүзу — жара толық жазылғанша күтіңіз\n\n1 ай+:\n• Күнделікті белсенділіктің көпшілігіне қайта кіріскіңіз\n• Гормондар тұрақтағаннан кейін қарқынды жаттығулар',
        zh: '甲状腺手术恢复相对较快，但由于是颈部手术，有一些注意事项。\n\n术后1周：\n• 不要过度仰头或转头\n• 开始轻度散步（10-15分钟）\n• 按医嘱进行柔和颈部拉伸\n• 不要过度使用声音\n\n2-4周：\n• 可恢复轻度运动（步行、拉伸）\n• 伤口完全愈合后再游泳\n• 避免提重物\n\n1个月以后：\n• 大部分日常活动可恢复\n• 可以慢跑、骑车、瑜伽\n• 甲状腺激素水平稳定后再进行高强度运动\n\n甲状腺激素管理：\n• 激素剂量稳定后疲劳感会明显改善\n• 定期血液检查（TSH）调整剂量\n• 记录体重、体温、情绪变化有助于医生诊断',
        ja: '甲状腺手術は比較的回復が早い手術ですが、首の手術なので注意点があります。\n\n術後1週間：\n• 首を過度に反らしたり回したりしない\n• 軽い散歩開始（10-15分）\n• 柔らかい首のストレッチ——医療チームの指示に従って\n• 声を過度に使わない\n\n2-4週間：\n• 軽い運動再開可能（ウォーキング、ストレッチ）\n• 水泳は傷が完全に治るまで待つ\n• 重い物を持つのは控える\n\n1ヶ月以降：\n• ほとんどの日常活動に復帰可能\n• ジョギング、自転車、ヨガ可能\n• 高強度運動は甲状腺ホルモン値安定後\n\n甲状腺ホルモン管理：\n• ホルモン薬の用量が安定すると疲労感が大幅に改善\n• 定期的な血液検査（TSH）で用量調整\n• 体重、体温、気分の変化を記録すると医療チームの参考に',
      },
    },
    {
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Medical medications',
      title: { ko: '주의해야 할 증상', en: 'Symptoms to Watch For', ru: 'Симптомы, на которые следует обратить внимание', zh: '需要注意的症状', ja: '注意すべき症状', kz: 'Назар аударатын белгілер' },
      body: {
        ko: '갑상선암은 예후가 좋지만, 다음 증상이 나타나면 의료진에게 연락하세요:\n\n🔴 즉시 연락:\n• 수술 부위에서 출혈이나 심한 부기\n• 호흡 곤란이나 삼키기 어려움이 갑자기 악화\n• 손발이 저리거나 경련 (저칼슘혈증 의심)\n• 목소리가 갑자기 나오지 않음\n• 38.5°C 이상 고열\n\n🟡 다음 진료 시 상의:\n• 목 앞쪽에 새로운 혹이 만져짐\n• 지속적인 피로감 (호르몬 용량 조절 필요 가능)\n• 체중이 급격히 증가하거나 감소\n• 추위를 잘 타거나 더위를 잘 탐 (호르몬 불균형 신호)\n• 기분 변화, 불안, 우울감 지속',
        en: 'Thyroid cancer has a good prognosis, but contact your medical team if you notice:\n\n🔴 Contact immediately:\n• Bleeding or severe swelling at surgical site\n• Sudden worsening of difficulty breathing or swallowing\n• Numbness or cramping in hands/feet (suspected hypocalcemia)\n• Sudden voice loss\n• Fever above 38.5°C\n\n🟡 Discuss at next appointment:\n• New lump felt in front of neck\n• Persistent fatigue (may need hormone dosage adjustment)\n• Rapid weight gain or loss\n• Sensitivity to cold or heat (hormone imbalance signal)\n• Persistent mood changes, anxiety, or depression',
        ru: 'Рак щитовидной железы имеет хороший прогноз, но обратитесь к врачу при:\n\n🔴 Немедленно:\n• Кровотечение или сильный отёк в области операции\n• Внезапное ухудшение дыхания или глотания\n• Онемение или судороги рук/ног (гипокальциемия)\n• Внезапная потеря голоса\n• Температура выше 38,5°C\n\n🟡 На следующем приёме:\n• Новое образование на передней части шеи\n• Постоянная усталость (может потребоваться коррекция дозы гормона)\n• Резкое изменение веса\n• Непереносимость холода или жары\n• Постоянные изменения настроения',
        kz: 'Қалқанша без обыры жақсы болжамға ие, бірақ мына белгілер болса дәрігерге хабарласыңыз:\n\n🔴 Дереу:\n• Операция аймағында қан кету немесе қатты ісіну\n• Тыныс алу немесе жұтыну қиындығының кенеттен нашарлауы\n• Қол-аяқтың жансыздануы (гипокальциемия күдігі)\n• Дауыстың кенеттен жоғалуы\n\n🟡 Келесі қабылдауда:\n• Мойын алдында жаңа ісік\n• Тұрақты шаршау\n• Салмақтың тез өзгеруі',
        zh: '甲状腺癌预后良好，但出现以下症状请联系医疗团队：\n\n🔴 立即联系：\n• 手术部位出血或严重肿胀\n• 突然呼吸困难或吞咽困难加重\n• 手脚麻木或抽搐（疑似低钙血症）\n• 突然失声\n• 38.5°C以上高热\n\n🟡 下次就诊时讨论：\n• 颈前方摸到新肿块\n• 持续疲劳（可能需要调整激素剂量）\n• 体重急速增减\n• 怕冷或怕热（激素失衡信号）\n• 持续情绪变化、焦虑或抑郁',
        ja: '甲状腺がんは予後が良いですが、以下の症状があれば医療チームに連絡してください：\n\n🔴 すぐに連絡：\n• 手術部位からの出血や激しい腫れ\n• 呼吸困難や飲み込みにくさの急激な悪化\n• 手足のしびれやけいれん（低カルシウム血症の疑い）\n• 突然声が出なくなる\n• 38.5°C以上の高熱\n\n🟡 次回診察時に相談：\n• 首の前側に新しいしこりが触れる\n• 持続的な疲労感（ホルモン用量調整が必要かも）\n• 急激な体重増減\n• 寒がりや暑がり（ホルモン不均衡のサイン）\n• 気分の変化、不安、うつ感の持続',
      },
    },
    {
      icon: Brain,
      color: 'text-purple-600 bg-purple-50',
      image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Peaceful sunrise for mental wellness',
      title: { ko: '마음 건강: "착한 암"이라는 말에 대하여', en: 'Mental Health: On Being Told It\'s "The Good Cancer"', ru: 'Психическое здоровье: когда говорят, что это «хороший рак»', zh: '心理健康：关于"好治的癌"这种说法', ja: 'メンタルヘルス：「おとなしいがん」と言われることについて', kz: 'Психологиялық денсаулық: «жақсы обыр» деген сөз туралы' },
      body: {
        ko: '"갑상선암은 착한 암이에요"라는 말을 자주 듣게 됩니다. 생존율은 높지만, 암 진단의 심리적 충격은 다른 암과 다르지 않습니다.\n\n흔한 감정들:\n• "착한 암이라 감사해야 하는데, 왜 이렇게 불안하지?" — 자연스러운 감정입니다\n• 주변의 "별거 아니야"라는 반응에 상처받을 수 있습니다\n• 평생 호르몬제를 먹어야 한다는 부담감\n• 재발 걱정은 생존율과 관계없이 누구나 느낍니다\n\n도움이 되는 것들:\n• 갑상선암 환자 커뮤니티에서 같은 경험을 나누세요\n• "착한 암"이라도 두려워할 권리가 있습니다 — 감정을 인정해주세요\n• 호르몬 변동으로 인한 기분 변화는 의료적 원인일 수 있으니 담당의와 상의\n• 외모 변화(목의 흉터)에 대한 고민도 솔직히 표현하세요\n\nhealwith는 한국 체류 중 통역 지원과 심리 상담 연결을 도와드립니다.',
        en: 'You\'ll often hear "thyroid cancer is the good cancer." While survival rates are high, the psychological impact of a cancer diagnosis is no different from other cancers.\n\nCommon emotions:\n• "I should be grateful it\'s the good cancer, so why am I so anxious?" — This is natural\n• Others\' "it\'s no big deal" responses can be hurtful\n• The burden of lifelong hormone medication\n• Fear of recurrence exists regardless of survival rates\n\nWhat helps:\n• Share experiences in thyroid cancer patient communities\n• You have the right to be scared even with "the good cancer" — validate your feelings\n• Mood changes from hormone fluctuations may have medical causes — discuss with your doctor\n• Express concerns about appearance changes (neck scar) openly\n\nhealwith provides interpretation and psychological counseling connections during your Korea stay.',
        ru: 'Вы часто услышите «рак щитовидной железы — это хороший рак». Несмотря на высокую выживаемость, психологическое воздействие диагноза не отличается от других видов рака.\n\nРаспространённые чувства:\n• «Мне надо радоваться, что это хороший рак, но почему мне так тревожно?» — Это нормально\n• Реакция «это ерунда» от окружающих может ранить\n• Бремя пожизненного приёма гормонов\n• Страх рецидива существует независимо от выживаемости\n\nЧто помогает:\n• Общайтесь в сообществах пациентов с раком щитовидной железы\n• Вы имеете право бояться даже при «хорошем раке»\n• Перепады настроения от гормонов могут иметь медицинские причины\n• Открыто говорите о переживаниях по поводу внешности (шрам на шее)\n\nhealwith помогает с переводом и психологической поддержкой.',
        kz: '«Қалқанша без обыры — жақсы обыр» деген сөзді жиі естисіз. Тірі қалу деңгейі жоғары болғанымен, обыр диагнозының психологиялық әсері басқа обырлардан өзгеше емес.\n\nЖиі кездесетін эмоциялар:\n• «Жақсы обырға ризашылық білдіруім керек, бірақ неге мен алаңдаймын?» — Бұл табиғи\n• Айналаңыздағылардың «бұл маңызды емес» деген реакциясы ренжітуі мүмкін\n• Өмір бойы гормон қабылдау ауыртпалығы\n\nНе көмектеседі:\n• Қалқанша без обыры науқастар қоғамдастығында тәжірибе алмасу\n• Сезімдеріңізді мойындаңыз\n\nhealwith аударма қолдауын және психологиялық кеңес ұсынады.',
        zh: '你经常会听到"甲状腺癌是好治的癌"。虽然生存率高，但癌症诊断的心理冲击与其他癌症并无不同。\n\n常见情绪：\n• "应该庆幸是好治的癌，但为什么我还是这么焦虑？"——这是自然的\n• 周围人"没什么大不了"的反应可能令人受伤\n• 终身服用激素药的负担感\n• 对复发的担忧与生存率无关，人人都会有\n\n有帮助的做法：\n• 在甲状腺癌患者社区分享经验\n• 即使是"好治的癌"，你也有害怕的权利——请认可自己的情绪\n• 激素波动引起的情绪变化可能有医学原因——与医生沟通\n• 对外观变化（颈部疤痕）的担忧也请坦诚表达\n\nhealwith在韩国期间提供翻译支持和心理咨询对接。',
        ja: '「甲状腺がんはおとなしいがんですよ」とよく言われます。生存率は高いですが、がん診断の心理的衝撃は他のがんと変わりません。\n\nよくある感情：\n• 「おとなしいがんだから感謝すべきなのに、なぜこんなに不安なんだろう」——自然な感情です\n• 周りの「大したことないよ」という反応に傷つくことがあります\n• 生涯ホルモン薬を飲み続ける負担感\n• 再発への不安は生存率に関係なく誰もが感じます\n\n助けになること：\n• 甲状腺がん患者コミュニティで同じ経験を共有\n• 「おとなしいがん」でも怖がる権利があります——感情を認めてあげてください\n• ホルモン変動による気分の変化は医学的原因かもしれません——担当医と相談\n• 外見の変化（首の傷跡）への悩みも率直に表現しましょう\n\nhealwithは韓国滞在中の通訳サポートと心理カウンセリングの手配をお手伝いします。',
      },
    },
  ],
};

// ── 모든 암종 공통: 양·한방 통합면역 케어 (면력한방병원 협진 모델) ──
const INTEGRATIVE_SECTION = {
  icon: Leaf,
  color: 'text-teal-600 bg-teal-50',
  title: { ko: '양·한방 통합면역 케어', en: 'Integrative Immune Care (East-West)', ru: 'Интегративная иммунная помощь', zh: '中西医结合免疫护理', ja: '洋・韓方統合免疫ケア', kz: 'Интегративті иммундық күтім' },
  body: {
    ko: '수술과 항암치료가 암을 직접 제거한다면, 통합면역 케어는 그 치료를 견디는 몸의 힘과 회복을 돕는 보조적 접근입니다. healwith는 수술·항암은 한국 암 전문병원에서, 치료 전후의 면역·체력 관리는 면력한방병원 통합암치료팀과 함께하는 양·한방 협진 모델을 운영합니다.\n\n통합면역 케어가 돕는 것:\n• 항암·방사선 치료 중 체력 저하와 식욕부진 완화\n• 메스꺼움·피로·수면장애 등 부작용 관리\n• 치료 사이 회복기의 면역력·컨디션 유지\n• 수술 후 체력 회복과 일상 복귀 지원\n\n진료 방식:\n• 대한통합암학회 인정의(한방내과·통합면역) 중심의 협진\n• 한약·약침 등 병행치료는 반드시 담당 종양내과와 상의 후 진행\n• 항암 일정에 맞춘 컨디션 관리 프로그램\n\n🟡 꼭 기억하세요:\n• 통합면역 케어는 표준 암 치료를 대체하지 않습니다\n• 검증되지 않은 치료를 위해 표준 치료를 미루지 마세요\n• 모든 병행 치료는 담당 의료진과 먼저 상의하세요',
    en: 'While surgery and chemotherapy remove the cancer directly, integrative immune care is a supportive approach that helps your body endure treatment and recover. healwith runs an East-West collaborative model: surgery and chemo at Korea\'s cancer specialty hospitals, with immune and stamina care before and after treatment provided by the integrative oncology team at Immune Hospital.\n\nWhat integrative immune care helps with:\n• Easing fatigue and appetite loss during chemo/radiation\n• Managing side effects like nausea, fatigue, and sleep problems\n• Maintaining immunity and condition during recovery between treatments\n• Supporting stamina recovery and return to daily life after surgery\n\nHow care works:\n• Collaboration led by board-certified integrative oncology / Korean internal medicine doctors\n• Herbal medicine and pharmacopuncture only alongside — and after consulting — your oncologist\n• Condition-management programs aligned with your chemotherapy schedule\n\n🟡 Please remember:\n• Integrative immune care does not replace standard cancer treatment\n• Never delay standard treatment for unproven therapies\n• Discuss every complementary therapy with your medical team first',
    ru: 'Если хирургия и химиотерапия удаляют рак напрямую, то интегративная иммунная помощь — это поддерживающий подход, помогающий организму перенести лечение и восстановиться. healwith использует модель восточно-западного сотрудничества: операции и химиотерапия в корейских онкоцентрах, а забота об иммунитете и силах до и после лечения — с командой интегративной онкологии Immune Hospital.\n\nВ чём помогает интегративная иммунная помощь:\n• Снижение усталости и потери аппетита во время химио/лучевой терапии\n• Управление побочными эффектами: тошнота, усталость, нарушения сна\n• Поддержание иммунитета и состояния в период восстановления между курсами\n• Поддержка восстановления сил и возвращения к обычной жизни после операции\n\nКак это работает:\n• Сотрудничество под руководством сертифицированных врачей интегративной онкологии / корейской внутренней медицины\n• Травяные средства и фармакопунктура — только параллельно и после консультации с онкологом\n• Программы поддержания состояния с учётом графика химиотерапии\n\n🟡 Помните:\n• Интегративная иммунная помощь не заменяет стандартное лечение рака\n• Никогда не откладывайте стандартное лечение ради недоказанных методов\n• Обсуждайте каждую дополнительную терапию с вашим врачом',
    zh: '手术和化疗直接清除癌症，而整合免疫护理是帮助身体耐受治疗并恢复的辅助方式。healwith采用中西医协作模式：手术与化疗在韩国癌症专科医院进行，治疗前后的免疫与体力管理则与免疫医院的整合肿瘤团队共同完成。\n\n整合免疫护理可帮助：\n• 缓解化疗/放疗期间的体力下降和食欲不振\n• 管理恶心、疲劳、睡眠障碍等副作用\n• 在治疗间歇的恢复期维持免疫力和状态\n• 支持术后体力恢复和回归日常生活\n\n诊疗方式：\n• 由整合肿瘤学/韩方内科认证医师主导的协作诊疗\n• 中药、药针等并用治疗须在咨询主治肿瘤科医生后进行\n• 配合化疗日程的状态管理方案\n\n🟡 请务必记住：\n• 整合免疫护理不能替代标准癌症治疗\n• 切勿为未经证实的疗法而推迟标准治疗\n• 所有辅助治疗请先与您的医疗团队沟通',
    ja: '手術や抗がん剤ががんを直接取り除くのに対し、統合免疫ケアは治療に耐える体の力と回復を助ける補助的なアプローチです。healwithは、手術・抗がん治療は韓国のがん専門病院で、治療前後の免疫・体力管理は免疫病院の統合腫瘍チームと行う、洋・韓方の協診モデルを運営しています。\n\n統合免疫ケアが助けること：\n• 抗がん剤・放射線治療中の体力低下や食欲不振の緩和\n• 吐き気・疲労・睡眠障害などの副作用の管理\n• 治療の合間の回復期における免疫力・コンディションの維持\n• 術後の体力回復と日常復帰のサポート\n\n診療の進め方：\n• 統合腫瘍学・韓方内科の認定医を中心とした協診\n• 漢方薬・薬鍼などの併用治療は必ず担当腫瘍内科と相談のうえで実施\n• 抗がんスケジュールに合わせたコンディション管理プログラム\n\n🟡 必ず覚えておいてください：\n• 統合免疫ケアは標準的ながん治療の代わりにはなりません\n• 証明されていない治療のために標準治療を遅らせないでください\n• すべての併用治療はまず担当医療チームに相談してください',
    kz: 'Хирургия мен химиотерапия обырды тікелей жойса, интегративті иммундық күтім — емді көтеруге және қалпына келуге көмектесетін қосымша тәсіл. healwith шығыс-батыс бірлескен моделін ұстанады: хирургия мен химиотерапия Кореяның обыр маманданған ауруханаларында, ал ем алдындағы және кейінгі иммунитет пен күш-қуат күтімі Immune Hospital интегративті онкология тобымен бірге жүреді.\n\nИнтегративті иммундық күтім немен көмектеседі:\n• Химио/сәулелік ем кезіндегі әлсіздік пен тәбеттің төмендеуін жеңілдету\n• Жүрек айну, шаршау, ұйқы бұзылуы сияқты жанама әсерлерді басқару\n• Емдеу аралығындағы қалпына келу кезеңінде иммунитет пен жағдайды сақтау\n• Операциядан кейінгі күш-қуатты қалпына келтіруге қолдау\n\nЕмдеу тәсілі:\n• Интегративті онкология / корей ішкі медицинасы сертификатталған дәрігерлері басқаратын бірлескен ем\n• Шөп дәрілері мен фармакопунктура тек онкологпен ақылдасқаннан кейін қатар жүргізіледі\n• Химиотерапия кестесіне сай жағдайды басқару бағдарламалары\n\n🟡 Есте сақтаңыз:\n• Интегративті иммундық күтім стандартты обыр емін алмастырмайды\n• Дәлелденбеген емдер үшін стандартты емді кешіктірмеңіз\n• Әрбір қосымша емді алдымен дәрігеріңізбен талқылаңыз',
  },
};

// 모든 암종 가이드에 통합면역 케어 섹션을 마지막에 한 번씩 추가
Object.values(GUIDES).forEach((g) => {
  if (!g.sections.some((s) => s.icon === Leaf)) g.sections.push(INTEGRATIVE_SECTION);
});

// 섹션 유형(아이콘)별 큐레이션 이미지 — 랜덤 스톡 대신 유형 일관 이미지.
// 경고(AlertTriangle)·통합면역(Leaf) 섹션은 콜아웃 박스가 주인공이라 이미지 없음.
const SECTION_IMAGE = new Map([
  [Stethoscope, { src: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&auto=format&fit=crop&q=80', alt: { ko: '의료진이 환자에게 검사 결과를 설명하는 모습', en: 'Doctor explaining test results to a patient', ru: 'Врач объясняет пациенту результаты', zh: '医生向患者讲解检查结果', ja: '医師が患者に検査結果を説明', kz: 'Дәрігер науқасқа нәтижелерді түсіндіруде' } }],
  [Utensils, { src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80', alt: { ko: '신선한 채소로 차린 건강한 식사', en: 'Healthy meal with fresh vegetables', ru: 'Здоровая еда из свежих овощей', zh: '新鲜蔬菜的健康餐', ja: '新鮮な野菜の健康的な食事', kz: 'Жаңа көкөністерден дайын тағам' } }],
  [Dumbbell, { src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80', alt: { ko: '부드러운 스트레칭 운동', en: 'Gentle stretching exercise', ru: 'Лёгкая растяжка', zh: '轻柔的拉伸运动', ja: '軽いストレッチ運動', kz: 'Жеңіл созылу жаттығуы' } }],
  [Brain, { src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80', alt: { ko: '명상과 마음 챙김', en: 'Meditation and mindfulness', ru: 'Медитация и осознанность', zh: '冥想与正念', ja: '瞑想とマインドフルネス', kz: 'Медитация және зейін' } }],
]);

// body 텍스트(\n\n 블록·• 불릿·🔴🟡 경고·"소제목:") 를 구조화 렌더링
function StructuredBody({ text }) {
  if (!text) return null;
  const blocks = text.split('\n\n').map((b) => b.split('\n').filter((ln) => ln.trim()));
  return (
    <div className="space-y-4">
      {blocks.map((lines, bi) => {
        const head = lines[0] || '';
        const level = head.startsWith('🔴') ? 'urgent' : head.startsWith('🟡') ? 'caution' : null;
        if (level) return <Callout key={bi} level={level} title={head} lines={lines.slice(1)} />;
        return (
          <div key={bi} className="space-y-2">
            {lines.map((ln, li) => <BodyLine key={li} text={ln.trim()} />)}
          </div>
        );
      })}
    </div>
  );
}

function BodyLine({ text }) {
  if (text.startsWith('•')) {
    return (
      <div className="flex gap-2.5 text-sm md:text-[15px] text-gray-700 leading-relaxed">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
        <span>{text.replace(/^•\s*/, '')}</span>
      </div>
    );
  }
  if (text.endsWith(':') || text.endsWith('：')) {
    return <p className="text-sm md:text-[15px] font-semibold text-gray-900 pt-1">{text.replace(/[:：]$/, '')}</p>;
  }
  // "라벨: 설명" 한 줄 (en/ru "Week 1: ...", zh/ja 전각 "1週目：...") — 라벨 볼드
  const m = text.match(/^([^:：•]{1,22})[:：]\s*(.+)$/);
  if (m) {
    return (
      <p className="text-sm md:text-[15px] text-gray-700 leading-relaxed">
        <span className="font-semibold text-gray-900">{m[1]}</span> · {m[2]}
      </p>
    );
  }
  return <p className="text-sm md:text-[15px] text-gray-700 leading-relaxed">{text}</p>;
}

function Callout({ level, title, lines }) {
  const urgent = level === 'urgent';
  const box = urgent ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
  const titleColor = urgent ? 'text-red-700' : 'text-amber-700';
  const dot = urgent ? 'bg-red-500' : 'bg-amber-500';
  const items = lines.filter((l) => l.trim().startsWith('•')).map((l) => l.replace(/^•\s*/, '').trim());
  return (
    <div className={`rounded-xl border ${box} p-4`}>
      <p className={`text-sm font-bold ${titleColor} mb-2.5`}>{title.replace(/[:：]$/, '')}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EducationClient() {
  const lang = useLang();
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
        <div className="flex items-center gap-2 text-teal-700 mb-2">
          <BookOpen size={20} />
          <span className="text-sm font-semibold uppercase tracking-wide">healwith Guide</span>
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
          const img = SECTION_IMAGE.get(section.icon);

          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
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
                <div className="px-5 pb-5 pt-1">
                  {img && (
                    <div className="mb-5 rounded-xl overflow-hidden bg-gray-50">
                      <img
                        src={img.src}
                        alt={l(img.alt)}
                        className="w-full h-44 md:h-56 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <StructuredBody text={l(section.body)} />
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
