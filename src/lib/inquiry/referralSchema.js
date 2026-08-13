/**
 * 환자 의뢰서 — 칸 정의 단일 SoR.
 *
 * 화면(app/inquiry/referral)·서버 검증·병원 양식 출력이 전부 이 파일 하나를 본다.
 * 세브란스 병원 환자 의뢰서 + 이화의료원 Patient Request Form 두 양식의 합집합이며,
 * 두 병원 국제팀 메일이 「없으면 진행 불가」라고 명시한 것만 req:"required" 로 올렸다.
 * 근거·경위: docs/design/INQUIRY_FORM_REDESIGN.md
 *
 * ⚠️ 문턱은 «두 개»다 (2026-08-11 PO 상의). 이걸 하나로 합치면 둘 중 하나가 반드시 깨진다.
 *   ①「접수」   = 우리가 이 사람에게 연락할 수 있나. 이것만 보내기 버튼을 막는다.
 *   ②「의뢰 준비」= 병원에 보낼 수 있나. 막지 않고 «몇 %»로만 보여준다.
 * 왜: 서류를 병원에서 떼 오는 데 1~2주가 걸린다. 「한 번에 다 채워야 보낼 수 있다」로 만들면
 *    그 1~2주 동안 사라진다. 반대로 다 선택으로 두면 아무도 안 채워 의뢰가 못 나간다.
 *
 * req 3층
 *   intake   — 비면 보내기 버튼이 안 눌린다. 지금 5칸 + 동의뿐이다. **여기를 늘리지 마라.**
 *   referral — 병원 의뢰에 필요. 안 막는다. 「의뢰 준비 n%」에 셈하고 코디 화면에 빠진 목록으로 뜬다.
 *   optional — 있으면 좋음. 어디에도 안 센다.
 *
 * ponytail: 라벨을 여기 {ko,en,ru} 로 직접 들고 있다. 칸 목록이 확정되면
 *   src/lib/i18n/dictionary.js 로 옮기고 labelKey → t() 로 바꾼다
 *   (코디 콘텐츠 편집기가 사전 키만 검색하므로 최종본은 사전에 있어야 한다).
 *   지금 옮기면 잘려나갈 칸까지 6개 언어로 번역하게 된다.
 */

// 국적·전화 국가번호·암종·병기 목록은 지금 폼과 같은 것을 쓴다(저장값 불변).
// 화면이 intakeLabels.js 에서 직접 가져다 쓴다 — 여기서 다시 정의하지 않는다.

const L =(ko, en, ru) => ({ ko, en, ru });

/** 성별 — 두 병원 양식 모두 필수 */
const SEX = [
  { value: "female", label: L("여성", "Female", "Женский") },
  { value: "male", label: L("남성", "Male", "Мужской") },
];

/** 과거력 — 세브란스 양식이 예시로 지목한 항목 그대로 */
const PAST_HISTORY = [
  { value: "hypertension", label: L("고혈압", "Hypertension", "Гипертония") },
  { value: "diabetes", label: L("당뇨", "Diabetes", "Диабет") },
  { value: "hepatitis", label: L("간염", "Hepatitis", "Гепатит") },
  { value: "tuberculosis", label: L("결핵", "Tuberculosis", "Туберкулёз") },
  { value: "allergy", label: L("알레르기", "Allergy", "Аллергия") },
  { value: "surgery", label: L("수술 이력", "Past surgery", "Перенесённые операции") },
  { value: "none", label: L("해당 없음", "None", "Нет") },
];

/** 장시간 비행 가능 여부 — 세브란스 메일이 「주치의 확인」을 명시한 항목 */
const FLIGHT_FITNESS = [
  { value: "yes", label: L("가능", "Fit to fly", "Может лететь") },
  { value: "no", label: L("불가", "Not fit", "Не может") },
  { value: "unknown", label: L("주치의에게 확인 안 됨", "Not confirmed by doctor", "Не подтверждено врачом") },
];

export const SECTIONS = [
  // ── ① 먼저, 이것만 ─────────────────────────────────────────────
  // 🛑 접수 문턱(req:"intake") 칸은 «전부 여기» 있어야 한다. 흩어놓으면 안 된다.
  //    2026-08-12 PO 실사용: 접수 6칸이 세 묶음에 흩어져 있어서 마지막 한 칸을
  //    «어디 있는지 찾기도 힘들다»고 했다. 「6칸 남음」이라고 세어주면서 어디인지는
  //    안 알려주는 화면은 사람을 헤매게 한다. 문턱은 한 자리에 모은다.
  {
    id: "essentials",
    title: L("먼저, 이것만", "First — just these", "Сначала только это"),
    lead: L("연락드리는 데 필요한 것만입니다. 여기까지만 채우셔도 보내실 수 있습니다.",
            "Only what we need to reach you. You can send it with just this filled in.",
            "Только то, что нужно, чтобы связаться с вами. Этого уже достаточно для отправки."),
    fields: [
      { name: "lastName", type: "text", req: "intake", half: true,
        label: L("성 (여권 영문 표기)", "Family name (as in passport)", "Фамилия (как в паспорте)") },
      { name: "firstName", type: "text", req: "intake", half: true,
        label: L("이름 (여권 영문 표기)", "Given name (as in passport)", "Имя (как в паспорте)") },
      { name: "_nameHint", type: "note",
        label: L(
          "여권에 적힌 라틴 문자 그대로 적어주세요. 영상 자료 속 이름과 다르면 병원이 등록을 거부합니다.",
          "Use the Latin spelling from the passport. If it differs from the name inside your imaging files, the hospital cannot register the case.",
          "Укажите латиницей как в паспорте. Если имя в файлах снимков отличается, больница не сможет зарегистрировать обращение.") },
      { name: "email", type: "email", req: "intake", half: true,
        label: L("이메일", "Email", "Электронная почта") },
      { name: "patientLang", type: "lang", req: "intake", half: true,
        label: L("환자가 쓰는 언어", "Patient's language", "Язык пациента"),
        hint: L("코디네이터가 이 언어로 연락합니다.",
                "Your coordinator will contact you in this language.",
                "Координатор свяжется с вами на этом языке.") },
      { name: "cancerType", type: "cancerType", req: "intake", half: true,
        label: L("어떤 암인가요?", "Cancer type", "Тип рака") },
      { name: "phone", type: "phone", req: "optional", half: true,
        label: L("휴대전화", "Mobile", "Мобильный телефон") },
    ],
  },

  // ── ② 환자 신원 ────────────────────────────────────────────────
  {
    id: "identity",
    title: L("환자 신원", "Patient details", "Данные пациента"),
    fields: [
      { name: "birthDate", type: "date", req: "referral", half: true,
        label: L("생년월일", "Date of birth", "Дата рождения") },
      { name: "sex", type: "chips", req: "referral", half: true, options: SEX,
        label: L("성별", "Gender", "Пол") },
      { name: "nationality", type: "nationality", req: "referral", half: true,
        label: L("국적", "Nationality", "Гражданство") },
      // 여권번호는 ⑥자료 묶음으로 내렸다. 「찾아와야 하는」 정보를 앞쪽에 두면
      // 그 자리에서 창을 닫는다. 내원이 확정될 때까지 없어도 의뢰는 진행된다.
    ],
  },

  // ── ③ 진단·현재 상태 ───────────────────────────────────────────
  {
    id: "diagnosis",
    title: L("진단 · 현재 상태", "Diagnosis & current condition", "Диагноз и состояние"),
    fields: [
      { name: "stage", type: "stage", req: "optional", half: true,
        label: L("병기", "Stage", "Стадия"),
        hint: L("모르면 비워두세요.", "Leave blank if unknown.", "Оставьте пустым, если не знаете.") },
      { name: "diagnosisNameRaw", type: "text", req: "referral",
        label: L("진단서에 적힌 병명", "Diagnosis as written on your medical document", "Диагноз, как указано в документе"),
        hint: L(
          "번역하지 말고 진단서에 적힌 그대로 적어주세요. 한국어·영어 번역은 저희가 합니다.",
          "Copy it exactly as written — do not translate. We handle the Korean/English translation.",
          "Скопируйте точно как написано — не переводите. Перевод на корейский/английский мы сделаем сами.") },
      // 코드는 «고르면 좋은 것»이지 관문이 아니다. 「모르겠습니다」가 기본값.
      { name: "icdCode", type: "icdSuggest", req: "optional",
        label: L("질병 코드 (아는 경우에만)", "Disease code (only if you know it)", "Код заболевания (если известен)"),
        hint: L(
          "진단서에 C18.2 같은 코드가 있으면 골라주세요. 몰라도 괜찮습니다 — 올려주신 서류를 보고 저희가 확인합니다.",
          "Pick it if your document shows a code like C18.2. It is fine not to know — we confirm it from your documents.",
          "Выберите, если в документе есть код вроде C18.2. Можно не знать — мы уточним по вашим документам.") },
      { name: "diagnosisDate", type: "month", req: "referral", half: true,
        label: L("진단 시기", "Time of diagnosis", "Время постановки диагноза") },
      { name: "onsetDate", type: "text", req: "optional", half: true,
        label: L("발병 시기", "Time of onset", "Начало заболевания"),
        placeholder: L("예: 2025년 12월경", "e.g. around Dec 2025", "например, декабрь 2025") },
      { name: "chiefComplaint", type: "textarea", req: "referral",
        label: L("주 호소 — 지금 가장 불편하거나 아픈 곳과 그 양상",
                 "Chief complaint — where it hurts now and how",
                 "Основная жалоба — что и как беспокоит сейчас") },
      { name: "testsAndTreatments", type: "textarea", req: "referral",
        label: L("지금까지 받은 검사와 치료",
                 "Tests and treatments performed so far",
                 "Проведённые обследования и лечение") },
      { name: "localDoctorOpinion", type: "textarea", req: "referral",
        label: L("현지 주치의 소견 — 현지에서 권고받은 치료",
                 "Local doctor's opinion — treatment recommended there",
                 "Заключение лечащего врача — рекомендованное лечение") },
    ],
  },

  // ── ③ 병력·약물 ────────────────────────────────────────────────
  {
    id: "history",
    title: L("병력 · 약물", "Medical history & medications", "Анамнез и препараты"),
    fields: [
      { name: "pastHistory", type: "chipsMulti", req: "referral", options: PAST_HISTORY,
        label: L("과거력", "Medical history", "Перенесённые заболевания") },
      { name: "pastHistoryNote", type: "textarea", req: "optional",
        placeholder: L("진단 연도·수술명 등을 아는 만큼 적어주세요",
                       "Add years, surgery names, etc. as far as you know",
                       "Укажите годы, названия операций и т.п.") },
      { name: "medications", type: "textarea", req: "referral", half: true,
        label: L("복용 중인 약물", "Current medications", "Принимаемые препараты") },
      { name: "familyHistory", type: "textarea", req: "optional", half: true,
        label: L("가족력", "Family medical history", "Семейный анамнез"),
        placeholder: L("부모·형제의 암 병력 등", "Cancer in parents or siblings, etc.", "Онкология у родителей, братьев, сестёр") },
      { name: "covidVaccine", type: "text", req: "optional", half: true,
        label: L("코로나 백신", "COVID-19 vaccination", "Вакцинация от COVID-19"),
        placeholder: L("백신명 / 접종 차수", "Vaccine name / doses", "Название вакцины / число доз") },
    ],
  },

  // ── ④ 의뢰 목적·일정 ───────────────────────────────────────────
  {
    id: "purpose",
    title: L("의뢰 목적 · 일정", "Purpose & schedule", "Цель обращения и сроки"),
    fields: [
      { name: "referralPurpose", type: "textarea", req: "referral",
        label: L("무엇을 알고 싶으신가요?", "What do you want to know?", "Что вы хотите узнать?"),
        placeholder: L(
          "예: 한국에서 수술이 가능한지, 어떤 치료를 받게 되는지, 비용이 얼마나 드는지",
          "e.g. whether surgery is possible in Korea, what treatment I would receive, how much it costs",
          "например: возможна ли операция в Корее, какое лечение предстоит, сколько это стоит"),
        hint: L(
          "병원이 이 질문에 답하는 형태로 소견을 보내옵니다. 구체적일수록 답도 구체적입니다.",
          "The hospital answers this question in its opinion. The more specific you are, the more specific the answer.",
          "Больница отвечает именно на этот вопрос. Чем конкретнее вопрос, тем конкретнее ответ.") },
      { name: "preferredDate", type: "date", req: "referral", half: true,
        label: L("내원 희망일", "Preferred visit date", "Желаемая дата приезда") },
      { name: "dateFlexible", type: "check", req: "optional", half: true,
        label: L("날짜는 조율 가능합니다", "The date is flexible", "Дата может быть скорректирована") },
      { name: "flightFitness", type: "chips", req: "referral", options: FLIGHT_FITNESS,
        label: L("장시간 비행이 가능한 상태인가요?", "Is the patient fit for a long flight?", "Может ли пациент перенести длительный перелёт?"),
        // 특정 병원 이름을 화면에 쓰지 않는다(PO 지시 2026-08-11). 「대학병원이 요구한다」로만.
        hint: L("한국 대학병원이 장거리 이동 전에 주치의 확인을 요청하는 항목입니다.",
                "Korean university hospitals ask the treating doctor to confirm this before long-distance travel.",
                "Корейские университетские клиники просят лечащего врача подтвердить это до дальней поездки.") },
    ],
  },

  // ── ⑤ 자료 첨부 ────────────────────────────────────────────────
  {
    id: "documents",
    title: L("자료 첨부", "Documents", "Документы"),
    fields: [
      // 🛑 종류별로 칸을 나누지 마라. 나눠도 이상한 게 오는 건 똑같고(칸 이름은 아무것도
      //    보장 안 한다) 환자에게 «판단»을 시켜서 안 내게 만들 뿐이다.
      //    실서비스에 실제로 올라온 파일 이름: `папка 2.rar` · `мед доки.pdf` · `image01.png`.
      //    분류는 우리가 한다 → /api/inquiry/classify-doc 가 올리는 즉시 열어보고 종류를 추정한다.
      { name: "envelope", type: "envelope", req: "referral", kind: "medicalDoc",
        label: L("가지고 계신 서류를 그대로 올려주세요",
                 "Upload whatever documents you have, as they are",
                 "Загрузите документы, которые у вас есть, как есть"),
        hint: L("무슨 서류인지 고르실 필요 없습니다. 올려주시면 저희가 읽고 무엇이 더 필요한지 알려드립니다.",
                "You don't have to sort them. We read them and tell you what is still missing.",
                "Сортировать не нужно. Мы прочитаем и скажем, чего ещё не хватает.") },
      { name: "imagingLink", type: "url", req: "optional",
        label: L("영상 자료가 너무 크면 링크로", "If the imaging files are too large, paste a link",
                 "Если снимки слишком большие — вставьте ссылку"),
        placeholder: L("구글 드라이브 · 드롭박스 링크", "Google Drive / Dropbox link", "Ссылка Google Drive / Dropbox"),
        hint: L("영상 CD는 200MB를 넘는 일이 많습니다. 그럴 땐 링크가 더 빠릅니다.",
                "Imaging CDs are often larger than 200MB — a link is faster in that case.",
                "Диски со снимками часто больше 200 МБ — в этом случае ссылка удобнее.") },

      // ── 내원이 확정된 뒤에 주시면 되는 것 ──
      // 근거: 대학병원 국제팀 안내 — 「여권 사본은 보내주시지 않더라도 의뢰 진행 가능합니다.
      //       다만 내원 확정시에는 꼭 보내주셔야 합니다.」
      { name: "passportNo", type: "text", req: "referral", half: true, sensitive: true, group: "onsite",
        label: L("여권번호", "Passport number", "Номер паспорта"),
        hint: L("암호화해서 보관하며 의뢰서에만 쓰입니다.",
                "Stored encrypted; used only on the referral form.",
                "Хранится в зашифрованном виде, используется только в направлении.") },
    ],
  },
];

/** 동의 — 법(PIPA) 필수 4 + 선택 1. 지금 폼과 같은 값을 그대로 쓴다. */
export const CONSENTS = [
  { name: "pipa", required: true, label: L(
      "[필수] 개인정보(이름 · 연락처 · 국적 · 여권번호) 수집 · 이용",
      "[Required] Collection and use of personal data (name, contact, nationality, passport no.)",
      "[Обязательно] Сбор и использование персональных данных (имя, контакты, гражданство, номер паспорта)") },
  { name: "sensitive", required: true, label: L(
      "[필수] 민감정보(진단 · 치료 등 건강정보) 수집 · 이용",
      "[Required] Collection and use of health data (diagnosis, treatment)",
      "[Обязательно] Сбор и использование данных о здоровье (диагноз, лечение)") },
  { name: "thirdParty", required: true, label: L(
      "[필수] 한국 협력 의료기관 · 의뢰 에이전시에 정보 제공",
      "[Required] Sharing with partner hospitals in Korea and the referring agency",
      "[Обязательно] Передача партнёрским клиникам в Корее и направляющему агентству") },
  { name: "crossBorder", required: true, label: L(
      "[필수] 개인정보 국외 이전 (대한민국 ↔ 환자 소재국)",
      "[Required] Cross-border transfer of personal data (Korea ↔ patient's country)",
      "[Обязательно] Трансграничная передача данных (Корея ↔ страна пациента)") },
  { name: "marketing", required: false, label: L(
      "[선택] 마케팅 · 뉴스레터 수신",
      "[Optional] Marketing and newsletter",
      "[Необязательно] Маркетинг и рассылка") },
];

/** 라벨 읽기 — 그 언어가 없으면 영어, 영어도 없으면 한국어. */
export function lab(label, lang) {
  if (!label) return "";
  return label[lang] || label.en || label.ko || "";
}

/** 그 층에 해당하는 칸 이름들. 화면·서버가 같은 목록을 본다. */
export function fieldsByReq(req) {
  return SECTIONS.flatMap((s) => s.fields).filter((f) => f.req === req && f.type !== "note");
}

const isBlank = (v) => {
  if (Array.isArray(v)) return v.length === 0;
  return v === undefined || v === null || String(v).trim() === "";
};

/** 접수 문턱 — 이게 비어 있으면 보내기 버튼이 안 열린다. 화면·서버가 같은 함수를 본다. */
export function missingIntake(values) {
  return fieldsByReq("intake").filter((f) => isBlank(values?.[f.name])).map((f) => f.name);
}

/** 병원 의뢰에 아직 없는 것. 보내기를 «막지 않는다» — 준비도 표시와 코디 화면의 근거일 뿐. */
export function missingForReferral(values) {
  return fieldsByReq("referral").filter((f) => isBlank(values?.[f.name])).map((f) => f.name);
}

/** 의뢰 준비도 0~100. 「지금 보낼 수 있다」와 별개로 «얼마나 왔나»를 계속 보여주는 값. */
export function referralReadiness(values) {
  const all = fieldsByReq("referral");
  if (all.length === 0) return 100;
  const filled = all.length - missingForReferral(values).length;
  return Math.round((filled / all.length) * 100);
}
