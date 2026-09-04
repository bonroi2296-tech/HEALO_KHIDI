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
 * 📐 안내를 어디에 쓰나 — «한 가지 규칙»만 지킨다 (2026-08-18 PO: 「뭐는 칸 안에 있고
 *    뭐는 밑에 있고 뒤죽박죽인데」).
 *      · 글로 쓰는 칸(text·textarea) → 안내는 **칸 안(placeholder)**. 밑에 줄을 달지 마라.
 *      · 고르는 칸(chips·select·날짜) → 안내를 달지 마라. 칸 이름으로 끝낸다.
 *    그리고 «우리 사정»(번역은 저희가 합니다·병원이 요청하는 항목입니다)은 어느 쪽에도 안 쓴다.
 *
 * ponytail: 라벨을 여기 {ko,en,ru} 로 직접 들고 있다. 칸 목록이 확정되면
 *   src/lib/i18n/dictionary.js 로 옮기고 labelKey → t() 로 바꾼다
 *   (코디 콘텐츠 편집기가 사전 키만 검색하므로 최종본은 사전에 있어야 한다).
 *   지금 옮기면 잘려나갈 칸까지 6개 언어로 번역하게 된다.
 */

// 국적·전화 국가번호·암종·병기 목록은 지금 폼과 같은 것을 쓴다(저장값 불변).
// 화면이 intakeLabels.js 에서 직접 가져다 쓴다 — 여기서 다시 정의하지 않는다.

import { t } from "@/lib/i18n";

// 📐 문구는 여기 없다 — 사전(src/lib/i18n/dictionary.js)에 있다.
//    그래야 코디 백오피스 편집기(/coordinator/content)로 «배포 없이» 고칠 수 있다
//    (2026-08-18 PO: 「코디 백오피스 편집기로 수정 가능한 거지?」 — 그때는 안 됐다).
//    여기가 들고 있는 건 «어느 키를 쓰는지»뿐이다.
// 🛑 문구를 다시 이 파일에 적지 마라. 적는 순간 편집기에서 안 보이고, 고치려면 배포를 기다려야 한다.
const K = (key) => ({ key });

/** 성별 — 두 병원 양식 모두 필수 */
const SEX = [
  { value: "female", label: K("referral.opt.sex.female") },
  { value: "male", label: K("referral.opt.sex.male") },
];

/** 과거력 — 세브란스 양식이 예시로 지목한 항목 그대로 */
const PAST_HISTORY = [
  { value: "hypertension", label: K("referral.opt.past.hypertension") },
  { value: "diabetes", label: K("referral.opt.past.diabetes") },
  { value: "hepatitis", label: K("referral.opt.past.hepatitis") },
  { value: "tuberculosis", label: K("referral.opt.past.tuberculosis") },
  { value: "allergy", label: K("referral.opt.past.allergy") },
  { value: "surgery", label: K("referral.opt.past.surgery") },
  { value: "none", label: K("referral.opt.past.none") },
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
  title: K("referral.late.title"),
  // 「진행된 병기」처럼 돌려 말하지 마라(PO 2026-08-13). 환자는 방금 «4기»를 직접 골랐다.
  // 에둘러 말하면 얼버무리는 것으로 읽히고, 무슨 얘긴지도 흐려진다. 고른 그대로 부른다.
  // 「직접 보지 않고는」이라고 쓰지 마라(PO 2026-08-13) — 얼굴을 본다는 뜻으로 읽힌다.
  // 실제로 필요한 건 «검사»다. 그대로 적는다.
  body: K("referral.late.body"),
  points: [
    // 「회신」의 주인을 밝힌다(PO 2026-08-13) — 안 밝히면 «우리» 회신으로 읽힌다.
    K("referral.late.p1"),
    // 「검사만 받는 길」이라고 쓰지 마라 — 거기서 끝난다는 뜻으로 읽혀 문을 닫는다(PO 2026-08-13).
    // 실제로는 «검사부터» 시작하고 결과에 따라 치료로 이어진다. 다만 치료를 약속하는 문장이
    // 되면 안 되므로 「결과에 따라」를 반드시 남긴다(의료광고법).
    K("referral.late.p2"),
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
  { value: "opinion", label: K("referral.opt.wants.opinion") },
  { value: "cost",    label: K("referral.opt.wants.cost") },
  { value: "feasible",label: K("referral.opt.wants.feasible") },
  { value: "schedule",label: K("referral.opt.wants.schedule") },
];

const FLIGHT_FITNESS = [
  { value: "yes", label: K("referral.opt.flight.yes") },
  { value: "no", label: K("referral.opt.flight.no") },
  // 🛑 「확인 안 됨」으로 되돌리지 마라(2026-08-18 PO) — 안 한 일을 탓하는 말로 읽힌다.
  //    「확인 필요함」은 «앞으로 할 일»이라 고르기도 쉽고 코디네이터에게도 그대로 할 일이 된다.
  { value: "unknown", label: K("referral.opt.flight.unknown") },
];

export const SECTIONS = [
  // ── ① 자료 «먼저» ───────────────────
  // 왜 맨 앞이냐: 여권 한 장이면 성·이름·생년월일·성별·여권번호가 한꺼번에 채워진다.
  // 「기본 정보부터 손으로 치고 그다음 자료」로 두면 우리가 대신 채워줄 수 있는 걸
  // 사람에게 먼저 치게 시키는 셋이다(2026-08-14 PO 지적).
  {
    id: "documents",
    title: K("referral.sec.documents.title"),
    // 🛑 머리말이 이미 «왜 필요한지»를 말한다 — 여기서 또 하면 같은 말이 두 번이다(2026-08-18 PO: 장황함).
    lead: K("referral.sec.documents.lead"),
    fields: [
      // 🛑 종류별로 칸을 나누지 마라. 나눠도 이상한 게 오는 건 똑같고(칸 이름은 아무것도
      //    보장 안 한다) 환자에게 «판단»을 시켜서 안 내게 만들 뿐이다.
      //    실서비스에 실제로 올라온 파일 이름: `папка 2.rar` · `мед доки.pdf` · `image01.png`.
      //    분류는 우리가 한다 → /api/inquiry/classify-doc 가 올리는 즉시 열어보고 종류를 추정한다.
      { name: "envelope", type: "envelope", req: "referral", kind: "medicalDoc",
        label: K("referral.f.envelope.label"),
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
        label: K("referral.f.cdFolder.label"),
        // 🛑 여기에 안내를 되살리지 마라 — 자료 상자가 하나로 합쳐지면서 이 문구만 저 아래
        //    동떨어져 떠 있었다(2026-08-18 PO). 안내는 자료 상자 밑 한 줄(200MB 규칙)에 있다.
      },

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
    title: K("referral.sec.essentials.title"),
    lead: K("referral.sec.essentials.lead"),
    fields: [
      // 🛑 「라틴 문자 그대로」 같은 설명을 따로 붙이지 마라(2026-08-18 PO: 「그게 무슨 말이야,
      //    영문이면 어떡할라고?」). 러시아어 여권엔 키릴·라틴이 같이 적혀 있어 «어느 줄»인지만
      //    말하면 된다 — 그건 칸 이름 한 줄로 충분하고, 밑에 또 적으면 같은 말 두 번이다.
      { name: "lastName", type: "text", req: "intake", half: true,
        label: K("referral.f.lastName.label") },
      { name: "firstName", type: "text", req: "intake", half: true,
        label: K("referral.f.firstName.label") },
      { name: "email", type: "email", req: "intake", half: true,
        label: K("referral.f.email.label") },
      { name: "patientLang", type: "lang", req: "intake", half: true,
        // 🛑 「이 언어로 연락합니다」를 되살리지 마라 — 칸 이름이 이미 그 말이다(2026-08-18 PO).
        label: K("referral.f.patientLang.label") },
      { name: "cancerType", type: "cancerType", req: "intake", half: true,
        label: K("referral.f.cancerType.label") },
      { name: "phone", type: "phone", req: "optional", half: true,
        label: K("referral.f.phone.label") },
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
    title: K("referral.sec.purpose.title"),
    fields: [
      { name: "referralWants", type: "chipsMulti", req: "referral", options: REFERRAL_WANTS,
        label: K("referral.f.referralWants.label") },
      // 🛑 칸 이름에 「(선택)」을 다시 박지 마라 — 화면이 꼬리표를 따로 붙여서 「(선택)(선택)」이 됐다.
      { name: "referralPurpose", type: "textarea", req: "optional",
        label: K("referral.f.referralPurpose.label"),
        placeholder: K("referral.f.referralPurpose.ph"),
      },
      { name: "preferredDate", type: "date", req: "referral", half: true,
        label: K("referral.f.preferredDate.label") },
      { name: "dateFlexible", type: "check", req: "optional", half: true,
        label: K("referral.f.dateFlexible.label") },
      { name: "flightFitness", type: "chips", req: "referral", options: FLIGHT_FITNESS,
        label: K("referral.f.flightFitness.label"),
      },
    ],
  },
  {
    id: "identity",
    title: K("referral.sec.identity.title"),
    fields: [
      { name: "birthDate", type: "date", req: "referral", half: true,
        label: K("referral.f.birthDate.label") },
      { name: "sex", type: "chips", req: "referral", half: true, options: SEX,
        label: K("referral.f.sex.label") },
      { name: "nationality", type: "nationality", req: "referral", half: true,
        label: K("referral.f.nationality.label") },
      // 여권을 올리면 이 칸은 «저절로» 찬다(실측: 번호·성·이름·생년월일·성별 5칸).
      // 손으로 칠 수도 있게 남겨두되, 받아적는 자리는 자료 묶음이 아니라 여기다.
      // 🛑 필수로 되돌리지 마라 — 코디네이터 의견(2026-08-18): 처음부터 여권까지 달라고 하면
      //    환자가 부담스러워한다. 내원이 확정될 때 받아도 늦지 않다.
      { name: "passportNo", type: "text", req: "optional", half: true, sensitive: true,
        // 🛑 「여권을 올리시면 저절로 채워집니다 · 암호화해서 보관합니다」를 되살리지 마라
        //    (2026-08-18 PO). 우리 사정이지 사람이 여기서 알고 싶은 게 아니다.
        label: K("referral.f.passportNo.label") },
    ],
  },

  // ── ④ 진단·현재 상태 ───────────────────────────────────────────
  {
    id: "diagnosis",
    title: K("referral.sec.diagnosis.title"),
    fields: [
      // ⚠️ 병기는 「있으면 좋은 값」이 아니라 «회신 속도를 가르는 값»이다.
      //    2026-08-13 이대서울병원: 지금까지 회신이 느렸던 건 우리가 보낸 케이스가 전부
      //    말기였기 때문이고, 비교적 쉬운 케이스는 병원 코디가 바로 답하거나 교수님도 빨리 답한다.
      //    세브란스는 아예 「4기는 이메일 의뢰를 진행하지 않는다」고 명시했다.
      //    그런데 실측상 실서비스 18건 중 병기가 채워진 건 1건뿐이다 → 안내 문구로 유도하고,
      //    올린 서류에서도 뽑는다(실측: 종합소견서에서 stage 3 fibrosis 추출됨).
      { name: "stage", type: "stage", req: "optional", half: true,
        label: K("referral.f.stage.label") },
      { name: "diagnosisNameRaw", type: "text", req: "referral",
        label: K("referral.f.diagnosisNameRaw.label"),
        // 🛑 「번역하지 마시고 적힌 그대로」를 되살리지 마라(2026-08-18 PO) —
        //    칸 이름이 이미 「진단서에 적힌 병명」이다.
      },
      // 코드는 «고르면 좋은 것»이지 관문이 아니다. 「모르겠습니다」가 기본값.
      { name: "icdCode", type: "icdSuggest", req: "optional",
        label: K("referral.f.icdCode.label") },
      { name: "diagnosisDate", type: "month", req: "referral", half: true,
        label: K("referral.f.diagnosisDate.label") },
      { name: "onsetDate", type: "text", req: "optional", half: true,
        label: K("referral.f.onsetDate.label"),
        placeholder: K("referral.f.onsetDate.ph") },
      { name: "chiefComplaint", type: "textarea", req: "referral",
        label: K("referral.f.chiefComplaint.label"),
        placeholder: K("referral.f.chiefComplaint.ph") },
      { name: "testsAndTreatments", type: "textarea", req: "referral",
        label: K("referral.f.testsAndTreatments.label") },
      { name: "localDoctorOpinion", type: "textarea", req: "referral",
        label: K("referral.f.localDoctorOpinion.label"),
        placeholder: K("referral.f.localDoctorOpinion.ph") },
    ],
  },

  // ── ⑤ 병력·약물 ────────────────────────────────────────────────
  {
    id: "history",
    title: K("referral.sec.history.title"),
    fields: [
      { name: "pastHistory", type: "chipsMulti", req: "referral", options: PAST_HISTORY,
        label: K("referral.f.pastHistory.label") },
      // 🛑 이 칸을 «항상» 열어두지 마라(2026-08-18 PO: 「선택을 할 거면 선택만, 입력을 할 거면
      //    입력만 — 중간이 없나」). 고르기 칸 밑에 빈 글칸이 늘 떠 있으면 «둘 다 해야 하나»로
      //    읽힌다. 고른 게 있을 때만 «그것에 대해» 더 적는 자리로 나온다.
      { name: "pastHistoryNote", type: "textarea", req: "optional",
        showIf: (v) => Array.isArray(v.pastHistory) && v.pastHistory.some((x) => x !== "none"),
        // 칸 안 안내는 «~해주세요»가 아니라 «무엇을 적는 자리인지»로 통일한다.
        placeholder: K("referral.f.pastHistoryNote.ph") },
      { name: "medications", type: "textarea", req: "referral", half: true,
        label: K("referral.f.medications.label") },
      { name: "familyHistory", type: "textarea", req: "optional", half: true,
        label: K("referral.f.familyHistory.label"),
        placeholder: K("referral.f.familyHistory.ph") },
      // 코로나 백신 칸은 뺐다. 이대 양식엔 아직 있지만 2026-08-13 이대서울병원 방문에서
      // 「코로나 여부는 중요하지 않다, 옛날에 코로나 심할 때 필요했던 것」이라고 확인받았다.
      // 🛑 이대 양식에 칸이 있다고 되살리지 마라 — 양식이 실제 요구보다 뒤처져 있는 것이다.
    ],
  },

  // ── ⑥ 의뢰 목적·일정 ───────────────────────────────────────────

];

/** 동의 — 법(PIPA) 필수 4 + 선택 1. 지금 폼과 같은 값을 그대로 쓴다. */
export const CONSENTS = [
  { name: "pipa", required: true, label: K("referral.consent.pipa") },
  { name: "sensitive", required: true, label: K("referral.consent.sensitive") },
  { name: "thirdParty", required: true, label: K("referral.consent.thirdParty") },
  { name: "crossBorder", required: true, label: K("referral.consent.crossBorder") },
  { name: "marketing", required: false, label: K("referral.consent.marketing") },
];

/** 라벨 읽기 — 그 언어가 없으면 영어, 영어도 없으면 한국어. */
export function lab(label, lang) {
  if (!label) return "";
  // 지금은 전부 사전 키다. {ko,en,ru} 를 그대로 든 옛 모양도 받아준다(다른 화면이 넘겨줄 수 있다).
  if (label.key) return t(label.key, lang);
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

/**
 * 임시저장(localStorage)에서 «되살릴 수 있는 값»만 남긴다.
 * 🛑 2026-08-19 실측: 옛 모양·깨진 임시저장(envelope 이 문자열, 고르기 여러 개 칸이 문자열)이 들어오자
 *    자료 묶음이 그리다 죽어(docs.map is not a function) 폼 «전체»가 오류 화면이 됐다.
 *    사용자는 저장소를 지울 줄 모른다 — 그 브라우저로는 영영 못 들어온다.
 *    그래서 복원은 «모양이 맞는 칸만». 모르는 칸·모양이 다른 칸은 조용히 버린다(빈 폼이 죽은 폼보다 낫다).
 */
export function sanitizeDraftValues(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const sec of SECTIONS) {
    for (const f of sec.fields) {
      const v = raw[f.name];
      if (v == null) continue;
      switch (f.type) {
        case "chipsMulti":
          if (Array.isArray(v)) out[f.name] = v.filter((x) => typeof x === "string");
          break;
        case "envelope":
          // 올리다 만 항목(경로 없음)은 되살려도 «영원히 돌아가는 진행 막대»가 된다 — 버린다.
          // 화면용 진행 상태(uploading·pct·reading)도 떼어낸다. (독립 리뷰 2명이 짚음)
          if (Array.isArray(v))
            out[f.name] = v
              .filter((x) => x && typeof x === "object" && !Array.isArray(x) && (typeof x.path === "string" || x.error))
              .map(({ uploading: _u, pct: _p, reading: _r, ...d }) => d);
          break;
        case "cdFolder":
          if (v && typeof v === "object" && !Array.isArray(v)) out[f.name] = v;
          break;
        case "check":
          out[f.name] = v === true;
          break;
        default:   // text · textarea · date · month · select 류 — 문자열만
          if (typeof v === "string") out[f.name] = v;
      }
    }
  }
  return out;
}

/**
 * 서류를 여러 장 읽었을 때 «덮어쓰면 틀리는» 칸.
 *
 * 진단명·병기는 최신 한 장이 정답이다(서류끼리 어긋나면 최근 것을 쓴다). 그런데 「시행한 검사와
 * 치료」는 다르다 — CT 판독지·혈액검사·내시경 결과가 각각 다른 파일에 있고, 병원은 그 셋을 다
 * 봐야 한다. 2026-09-04 실측: 서류 세 장에서 982·1,786·1,434자가 나왔는데 마지막 하나만 남고
 * 나머지는 버려졌다. 이 칸은 파일 이름을 머리에 달아 이어 붙이고, 다시 읽을 때 통째로 갈아 낀다.
 *
 * 쓰는 곳: 코디 문의 상세(모아 담기·덮어쓰기 지정), 의뢰서 카드(값이 있어도 새로 읽은 것을 보여줌).
 */
export const ACCUMULATE_FIELDS = new Set(["testsAndTreatments"]);
