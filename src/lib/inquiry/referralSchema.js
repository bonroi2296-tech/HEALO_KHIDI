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

/**
 * 병기 4기를 고르면 그 자리에서 뜨는 안내.
 *
 * 왜: 세브란스는 「4기는 이메일 의뢰를 진행하지 않는다」고 명시했고, 이대서울병원은
 *     2026-08-13 방문에서 「말기라 교수님들이 답변 주기 어려웠다」고 확인해줬다.
 *     아무 말 없이 접수받으면 환자는 몇 주를 기다린 끝에 「현지에서 치료하시라」를 받는다.
 *
 * 🛑 숫자를 넣지 마라 (PO 결정 2026-08-13). 검사 비용·기간은 케이스마다 다르다고
 *    병원이 확인해줬다. 「애매한 건 알려주지 말자」 — 틀린 숫자는 안 준 것보다 나쁘다.
 * 🛑 「완치」·「보장」류 단어 금지(의료광고법). 문을 닫지도 마라 — 결정은 환자 몫이다.
 */
export const LATE_STAGE_NOTICE = {
  title: {
    ko: "먼저 알려드립니다.",
    en: "Before you continue.",
    ru: "Сразу предупредим.",
  },
  // 「진행된 병기」처럼 돌려 말하지 마라(PO 2026-08-13). 환자는 방금 «4기»를 직접 골랐다.
  // 에둘러 말하면 얼버무리는 것으로 읽히고, 무슨 얘긴지도 흐려진다. 고른 그대로 부른다.
  // 「직접 보지 않고는」이라고 쓰지 마라(PO 2026-08-13) — 얼굴을 본다는 뜻으로 읽힌다.
  // 실제로 필요한 건 «검사»다. 그대로 적는다.
  body: {
    ko: "4기는 서류만으로 치료 계획과 비용을 답변드리기 어렵습니다. 환자분의 상태를 검사하기 전에는 책임 있는 답을 드릴 수 없기 때문입니다.",
    en: "At stage IV the hospital cannot give a treatment plan or cost from documents alone — a responsible answer is only possible after the patient is examined.",
    ru: "При 4 стадии клиника не может дать план лечения и стоимость только по документам — ответственный ответ возможен только после обследования пациента.",
  },
  points: [
    // 「회신」의 주인을 밝힌다(PO 2026-08-13) — 안 밝히면 «우리» 회신으로 읽힌다.
    {
      ko: "대학병원으로부터 회신이 늦어지거나, 「현지에서 치료를 이어가시라」는 답을 받으실 수 있습니다",
      en: "The reply from the university hospital may be delayed, or may say it is better to continue treatment at home",
      ru: "Ответ из университетской клиники может задержаться или прийти в виде «лучше продолжить лечение дома»",
    },
    // 「검사만 받는 길」이라고 쓰지 마라 — 거기서 끝난다는 뜻으로 읽혀 문을 닫는다(PO 2026-08-13).
    // 실제로는 «검사부터» 시작하고 결과에 따라 치료로 이어진다. 다만 치료를 약속하는 문장이
    // 되면 안 되므로 「결과에 따라」를 반드시 남긴다(의료광고법).
    {
      ko: "대신 한국에 오셔서 검사부터 받아보는 길도 있습니다. 결과에 따라 치료 방향이 정해지며, 비용과 기간은 케이스마다 달라 확인 후 안내드립니다.",
      en: "Alternatively you can come to Korea and start with an examination. The results determine what treatment is possible; cost and duration vary by case, and we will confirm and let you know.",
      ru: "Есть другой путь — приехать в Корею и начать с обследования. По его результатам определяется тактика лечения; стоимость и сроки зависят от случая, мы уточним и сообщим.",
    },
  ],
};

/** 이 병기를 고르면 위 안내가 뜬다. */
export const LATE_STAGES = ["IV"];

/** 장시간 비행 가능 여부 — 세브란스 메일이 「주치의 확인」을 명시한 항목 */

// 환자가 «실제로» 물어보는 것. 기록으로 확인(2026-08-18):
//   진짜 문의 9건 중 «환자가 뭐를 원하는지»가 남은 건 1건뿐이었다 — 나머지는 진단명만 들어 있었다.
//   정작 병원이 회신하는 것은 「소견·예상비용」이다(이대서울 8/14 회신 실물).
//   자유 서술 칸 하나로만 받으면 비워 둔다 — 가장 흔한 둘을 누를 수 있게 놓는다.
const REFERRAL_WANTS = [
  { value: "opinion", label: L("소견서 (한국 의료진의 제2 의견)",
                               "A written second opinion from a Korean specialist",
                               "Письменное второе мнение корейского врача") },
  { value: "cost",    label: L("예상 치료비", "Estimated treatment cost", "Ориентировочная стоимость лечения") },
  { value: "feasible",label: L("한국에서 치료가 가능한지",
                               "Whether treatment in Korea is possible",
                               "Возможно ли лечение в Корее") },
  { value: "schedule",label: L("언제 갈 수 있는지 · 얼마나 걸리는지",
                               "When I could come and how long it would take",
                               "Когда можно приехать и сколько это займёт") },
];

const FLIGHT_FITNESS = [
  { value: "yes", label: L("가능", "Fit to fly", "Может лететь") },
  { value: "no", label: L("불가", "Not fit", "Не может") },
  { value: "unknown", label: L("주치의에게 확인 안 됨", "Not confirmed by doctor", "Не подтверждено врачом") },
];

export const SECTIONS = [
  // ── ① 자료 «먼저» ───────────────────
  // 왜 맨 앞이냐: 여권 한 장이면 성·이름·생년월일·성별·여권번호가 한꺼번에 채워진다.
  // 「기본 정보부터 손으로 치고 그다음 자료」로 두면 우리가 대신 채워줄 수 있는 걸
  // 사람에게 먼저 치게 시키는 셋이다(2026-08-14 PO 지적).
  {
    id: "documents",
    title: L("먼저, 자료부터", "Documents first", "Сначала документы"),
    // 🛑 머리말이 이미 «왜 필요한지»를 말한다 — 여기서 또 하면 같은 말이 두 번이다(2026-08-18 PO: 장황함).
    lead: L("올려주시면 저희가 읽고 아래 칸을 대신 채워드립니다.",
            "Upload what you have and we fill the fields below for you.",
            "Загрузите — мы прочитаем и заполним поля ниже за вас."),
    fields: [
      // 🛑 종류별로 칸을 나누지 마라. 나눠도 이상한 게 오는 건 똑같고(칸 이름은 아무것도
      //    보장 안 한다) 환자에게 «판단»을 시켜서 안 내게 만들 뿐이다.
      //    실서비스에 실제로 올라온 파일 이름: `папка 2.rar` · `мед доки.pdf` · `image01.png`.
      //    분류는 우리가 한다 → /api/inquiry/classify-doc 가 올리는 즉시 열어보고 종류를 추정한다.
      { name: "envelope", type: "envelope", req: "referral", kind: "medicalDoc",
        label: L("가지고 계신 서류를 그대로 올려주세요",
                 "Upload whatever documents you have, as they are",
                 "Загрузите документы, которые у вас есть, как есть"),
        hint: null },
      // 병원에서 받아온 CD 를 «폴더째» 고르게 한다. 압축은 브라우저가 한다.
      // 🛑 「구글 드라이브에 올려 링크 주세요」 칸을 여기 되살리지 마라(2026-08-13 결정):
      //    용량이 안 아껴지고(어차피 우리 저장소에 들어와야 뷰어가 돈다), 자료가 우리
      //    통제 밖으로 나가고, 링크는 죽는다. 200MB 를 넘으면 왓츠앱으로 코디가 받는다.
      // 🛑 여기(자료 묶음)에 «타이핑 칸» 을 되살리지 마라(2026-08-18 PO:
      //    «1번 섹션은 자료 업로드 파트인데 여권번호를 왜 입력하게 하냐»).
      //    여기는 «올리는» 자리다. 번호는 여권을 올리면 저절로 채워지고(실측 5칸),
      //    칸 자체는 ③환자 신원에 있다.
      { name: "cdFolder", type: "cdFolder", req: "optional",
        label: L("병원에서 받은 CD (CT · MRI)", "Hospital CD (CT / MRI)", "Диск из больницы (КТ / МРТ)"),
        // 🛑 여기에 안내를 되살리지 마라 — 자료 상자가 하나로 합쳐지면서 이 문구만 저 아래
        //    동떨어져 떠 있었다(2026-08-18 PO). 안내는 「CD 폴더 고르기」 버튼 바로 밑에 있다.
        hint: null },

      // ── 여권 ──
      // 틀렸던 전제 교정(2026-08-14 PO): 이대서울병원은 «예약 전»에도 여권을 요구한다.
      // 「내원이 확정된 뒤에 주셔도 된다」고 안내하면 다들 안 내고, 그럼 예약 단계에서 막힌다.
      // 근거: 대학병원 국제팀 안내 — 「여권 사본은 보내주시지 않더라도 의뢰 진행 가능합니다.
      //       다만 내원 확정시에는 꼭 보내주셔야 합니다.」
      // 🛑 번호를 «손으로 치게» 만들지 마라(2026-08-18 PO: «여권 번호도 그냥 여권을
      //    업로드해달라고 하면 되는거 아님?»). 실측: 여권을 봉투에 올리면
      //    번호·성·이름·생년월일·성별이 한꺼번에 채워진다. 병원도 어차피 사본을 요구한다.
      //    이 칸은 «읽은 것을 보여주고 고칠 수 있게» 하는 자리지 받아적는 자리가 아니다.

    ],
  },
  // ── ② 연락처 · 기본 정보 ─────────────────── ─────────────────────────────────────────────
  // 🛑 접수 문턱(req:"intake") 칸은 «전부 여기» 있어야 한다. 흩어놓으면 안 된다.
  //    2026-08-12 PO 실사용: 접수 6칸이 세 묶음에 흩어져 있어서 마지막 한 칸을
  //    «어디 있는지 찾기도 힘들다»고 했다. 「6칸 남음」이라고 세어주면서 어디인지는
  //    안 알려주는 화면은 사람을 헤매게 한다. 문턱은 한 자리에 모은다.
  {
    id: "essentials",
    title: L("연락처 · 기본 정보", "Contact · basics", "Контакты и основное"),
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
          "여권에 적힌 라틴 문자 그대로 적어주세요. 병원은 이 표기로 환자를 등록합니다.",
          "Use the Latin spelling exactly as in the passport — the hospital registers the patient under this spelling.",
          "Укажите латиницей точно как в паспорте — больница регистрирует пациента именно по этому написанию.") },
      { name: "email", type: "email", req: "intake", half: true,
        label: L("이메일", "Email", "Электронная почта") },
      { name: "patientLang", type: "lang", req: "intake", half: true,
        label: L("연락받으실 언어", "Language for us to contact you in", "Язык для связи с вами"),
        hint: L("코디네이터가 이 언어로 연락합니다.",
                "Your coordinator will contact you in this language.",
                "Координатор свяжется с вами на этом языке.") },
      { name: "cancerType", type: "cancerType", req: "intake", half: true,
        label: L("어떤 암인가요?", "Cancer type", "Тип рака") },
      { name: "phone", type: "phone", req: "optional", half: true,
        label: L("휴대전화", "Mobile", "Мобильный телефон") },
    ],
  },

  // ── ③ 환자 신원 ────────────────────────────────────────────────
  // ── ③ 무엇을 받고 싶은가 ─────────────────────────────────────
  // 🛑 이 묶음을 «맨 뒤»로 되돌리지 마라(2026-08-18 PO: «환자는 대학병원의 소견서나
  //    비용을 문의했던거 같은데?»). 실측: 진짜 문의 9건 중 «환자가 뭘 원하는지»가
  //    남은 건 1건뿐이었다 — 나머지는 진단명만 들어가 있었다. 사람이 여기 온 «이유»를
  //    맨 마지막에 묻고 있었으니 당연히 안 적고 나간다.
  {
    id: "purpose",
    title: L("의뢰 목적 · 일정", "Purpose & schedule", "Цель обращения и сроки"),
    fields: [
      { name: "referralWants", type: "chipsMulti", req: "referral", options: REFERRAL_WANTS,
        label: L("무엇을 받고 싶으세요? (여러 개 고르셔도 됩니다)",
                 "What would you like to receive? (choose as many as apply)",
                 "Что вы хотели бы получить? (можно несколько)"),
        hint: L("이것이 병원이 답해야 할 질문이 됩니다.",
                "This becomes the question the hospital has to answer.",
                "Именно на это будет отвечать больница.") },
      { name: "referralPurpose", type: "textarea", req: "optional",   // (선택)이라 써놓고 「진단에 필요」 딱지를 달면 모순이다
        label: L("병원에 더 물어보고 싶은 것 (선택)",
                 "Anything else to ask the hospital (optional)",
                 "Что ещё спросить у больницы (необязательно)"),
        placeholder: L(
          "예: 지금 먹는 약을 계속 먹어도 되는지, 보호자가 같이 있어야 하는지",
          "e.g. whether I can keep taking my current medication, whether a family member must stay with me",
          "например: можно ли продолжать принимать текущие лекарства, нужно ли сопровождение родственника"),
        hint: L("위에서 고르신 것 말고 따로 궁금한 게 있을 때만 적으시면 됩니다.",
                "Only if you have something beyond what you selected above.",
                "Только если есть что-то помимо выбранного выше.") },
      { name: "preferredDate", type: "date", req: "referral", half: true,
        label: L("한국에 오시고 싶은 날짜", "When would you like to come to Korea?", "Когда вы хотели бы приехать в Корею?") },
      { name: "dateFlexible", type: "check", req: "optional", half: true,
        label: L("날짜는 조율 가능합니다", "The date is flexible", "Дата может быть скорректирована") },
      { name: "flightFitness", type: "chips", req: "referral", options: FLIGHT_FITNESS,
        label: L("장시간 비행이 가능한 상태인가요?", "Is the patient fit for a long flight?", "Может ли пациент перенести длительный перелёт?"),
        // 특정 병원 이름을 화면에 쓰지 않는다(PO 지시 2026-08-11). 「대학병원이 요구한다」로만.
        hint: L("병원이 주치의 확인을 요청하는 항목입니다.",
                "The hospital asks the treating doctor to confirm this.",
                "Больница просит лечащего врача подтвердить это.") },
    ],
  },
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
      // 여권을 올리면 이 칸은 «저절로» 찬다(실측: 번호·성·이름·생년월일·성별 5칸).
      // 손으로 칠 수도 있게 남겨두되, 받아적는 자리는 자료 묶음이 아니라 여기다.
      // 🛑 필수로 되돌리지 마라 — 코디네이터 의견(2026-08-18): 처음부터 여권까지 달라고 하면
      //    환자가 부담스러워한다. 내원이 확정될 때 받아도 늦지 않다.
      { name: "passportNo", type: "text", req: "optional", half: true, sensitive: true,
        label: L("여권번호", "Passport number", "Номер паспорта"),
        hint: L("여권을 올리시면 저절로 채워집니다. 암호화해서 보관합니다.",
                "Fills in by itself if you upload the passport. Stored encrypted.",
                "Заполнится само, если загрузить паспорт. Хранится в зашифрованном виде.") },
    ],
  },

  // ── ④ 진단·현재 상태 ───────────────────────────────────────────
  {
    id: "diagnosis",
    title: L("진단 · 현재 상태", "Diagnosis & current condition", "Диагноз и состояние"),
    fields: [
      // ⚠️ 병기는 「있으면 좋은 값」이 아니라 «회신 속도를 가르는 값»이다.
      //    2026-08-13 이대서울병원: 지금까지 회신이 느렸던 건 우리가 보낸 케이스가 전부
      //    말기였기 때문이고, 비교적 쉬운 케이스는 병원 코디가 바로 답하거나 교수님도 빨리 답한다.
      //    세브란스는 아예 「4기는 이메일 의뢰를 진행하지 않는다」고 명시했다.
      //    그런데 실측상 실서비스 18건 중 병기가 채워진 건 1건뿐이다 → 안내 문구로 유도하고,
      //    올린 서류에서도 뽑는다(실측: 종합소견서에서 stage 3 fibrosis 추출됨).
      { name: "stage", type: "stage", req: "optional", half: true,
        label: L("병기", "Stage", "Стадия"),
        hint: L("모르시면 비워두세요 — 서류에서 저희가 확인합니다.",
                "Leave it blank if you are not sure — we read it from your documents.",
                "Не знаете — оставьте пустым, мы определим по документам.") },
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
          "진단서에 C18.2 같은 코드가 있으면 골라주세요. 몰라도 괜찮습니다.",
          "Pick it if your document shows a code like C18.2. It is fine not to know — we confirm it from your documents.",
          "Выберите, если в документе есть код вроде C18.2. Можно не знать — мы уточним по вашим документам.") },
      { name: "diagnosisDate", type: "month", req: "referral", half: true,
        label: L("진단 시기", "Time of diagnosis", "Время постановки диагноза") },
      { name: "onsetDate", type: "text", req: "optional", half: true,
        label: L("발병 시기", "Time of onset", "Начало заболевания"),
        placeholder: L("예: 2025년 12월경", "e.g. around Dec 2025", "например, декабрь 2025") },
      { name: "chiefComplaint", type: "textarea", req: "referral",
        label: L("지금 가장 불편한 곳", "Main symptom right now", "Что беспокоит сейчас больше всего"),
        hint: L("어디가 어떻게 아프신지 적어주세요.",
                "Tell us where it hurts and how it feels.",
                "Опишите, где болит и как именно.") },
      { name: "testsAndTreatments", type: "textarea", req: "referral",
        label: L("지금까지 받은 검사와 치료",
                 "Tests and treatments performed so far",
                 "Проведённые обследования и лечение") },
      { name: "localDoctorOpinion", type: "textarea", req: "referral",
        label: L("현지 주치의 소견", "Your doctor's opinion", "Заключение лечащего врача"),
        hint: L("지금 다니시는 병원에서 권고받은 치료를 적어주세요.",
                "What treatment your current hospital recommended.",
                "Какое лечение рекомендовали в вашей больнице.") },
    ],
  },

  // ── ⑤ 병력·약물 ────────────────────────────────────────────────
  {
    id: "history",
    title: L("병력 · 약물", "Medical history & medications", "Анамнез и препараты"),
    fields: [
      { name: "pastHistory", type: "chipsMulti", req: "referral", options: PAST_HISTORY,
        label: L("과거에 앓으셨거나 지금 앓고 계신 병", "Illnesses you have had or still have", "Перенесённые и текущие заболевания") },
      { name: "pastHistoryNote", type: "textarea", req: "optional",
        placeholder: L("진단 연도·수술명 등을 아는 만큼 적어주세요",
                       "Add years, surgery names, etc. as far as you know",
                       "Укажите годы, названия операций и т.п.") },
      { name: "medications", type: "textarea", req: "referral", half: true,
        label: L("복용 중인 약물", "Current medications", "Принимаемые препараты") },
      { name: "familyHistory", type: "textarea", req: "optional", half: true,
        label: L("가족 중 암을 앓으신 분", "Cancer in your family", "Онкология у родственников"),
        placeholder: L("부모·형제의 암 병력 등", "Cancer in parents or siblings, etc.", "Онкология у родителей, братьев, сестёр") },
      // 코로나 백신 칸은 뺐다. 이대 양식엔 아직 있지만 2026-08-13 이대서울병원 방문에서
      // 「코로나 여부는 중요하지 않다, 옛날에 코로나 심할 때 필요했던 것」이라고 확인받았다.
      // 🛑 이대 양식에 칸이 있다고 되살리지 마라 — 양식이 실제 요구보다 뒤처져 있는 것이다.
    ],
  },

  // ── ⑥ 의뢰 목적·일정 ───────────────────────────────────────────

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

/**
 * 다음에 갈 «묶음» — 아직 안 채운 「의뢰에 필요한」 칸이 남은 첫 묶음.
 * 「15가지 남음」은 막막해서 사람이 손을 놓는다. 「다음: 진단 · 현재 상태 5칸」은 누를 수 있다.
 * ⚠️ 칸 «이름»으로 지목하지 마라 — 라벨이 「가지고 계신 서류를 그대로 올려주세요」처럼 문장이라
 *    “다음: 가지고 계신 서류를 그대로 올려주세요” 가 된다(2026-08-14 실측).
 */
export function nextReferralSection(values) {
  const miss = missingForReferral(values);
  for (const sec of SECTIONS) {
    const mine = sec.fields.filter((f) => miss.includes(f.name));
    if (mine.length) return { secId: sec.id, title: sec.title, name: mine[0].name, n: mine.length };
  }
  return null;
}
