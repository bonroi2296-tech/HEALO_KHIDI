// 용어집(glossary) — 「같은 개념은 어느 화면에서나 같은 단어로」의 단일 SoR.
//
// 왜 만들었나 (2026-08-20 실측):
//   화면 문구 2003개를 훑었더니 **같은 것을 가리키는 말이 언어마다 여러 개**로 흩어져 있었다.
//     · 면력한방병원 → ru/kz 안에서 5가지 이름(Иммунная Клиника / Клиника Мёнрёк /
//       клиника Myeonryeok / Immune Hospital / больница корейской медицины)
//     · 상담 → ru 에서 консультация(107) 와 приём(16) 혼용
//     · 문의 → ru 에서 заявка(37)·обращение(21)·запрос(31) 혼용
//     · 환자 → kz 에서 науқас(50) 와 пациент(15) 혼용
//   문장 하나만 보면 다 「틀린 말」이 아니라서 기계도 사람도 안 걸렀고, 결국 **원어민(코디네이터)이
//   매번 손으로 통일**하고 있었다. 번역기를 바꿔도 이건 안 고쳐진다 — 「어느 단어로 부를지」는
//   번역 문제가 아니라 **우리가 정해서 알려줘야 하는 정보**이기 때문이다.
//
// 쓰는 곳
//   1. `npm run check:i18n-quality` — 사전(dictionary.js) 전체를 이 표와 대조한다.
//   2. 새 문구를 번역할 때 — 이 표를 프롬프트에 같이 넣는다(`glossaryPrompt()`).
//
// 두 층으로 나눈 이유
//   · locked   = 확정. 어기면 자동검사가 **막는다**. (사실·표준·브랜드 표기처럼 다툼의 여지가 없는 것)
//   · proposed = 제안. 어기면 **경고만**. 원어민 코디네이터가 확정해 주면 locked 로 올린다.
//   섞어 두면 「아직 안 정한 것」 때문에 검사가 빨개져서 아무도 안 본다.

/**
 * @typedef {Object} GlossaryEntry
 * @property {string} id      개념 식별자
 * @property {string} ko      한국어 개념 이름 (사람이 표를 읽을 때의 기준)
 * @property {"locked"|"proposed"} status
 * @property {string} why     왜 이 표기인지 — 코디네이터가 판단할 수 있게 근거를 적는다
 * @property {Record<string,string>} use    언어별 써야 하는 표기
 * @property {Record<string,string[]>} avoid 언어별 쓰면 안 되는 표기(정규식 아님 — 단어 그대로)
 * @property {string[]} [exceptKeys] 이 규칙을 적용하지 않는 사전 키(접두어 일치)
 */

/** @type {GlossaryEntry[]} */
export const GLOSSARY = [
  {
    id: "brand.healwith",
    ko: "healwith (서비스 이름)",
    status: "locked",
    why: "상표·도메인·앱스토어 등록명이 모두 소문자 라틴 'healwith'. 키릴 음차는 검색에서도 안 잡히고 등록명과 달라진다.",
    use: { ru: "healwith", kz: "healwith", en: "healwith", zh: "healwith", ja: "healwith" },
    avoid: {
      ru: ["Хилвиз", "Хилвис", "Хилвит", "Хилвиc"],
      kz: ["Хилвиз", "Хилвис", "Хилвит"],
    },
  },
  {
    id: "term.patient",
    ko: "환자",
    status: "locked",
    why:
      "카자흐어 화면인데 러시아어 차용어 'пациент' 가 섞이면 원어민에게 번역기 티가 난다. " +
      "카자흐어 표준 의료 용어는 науқас (격변화형 науқасқа/науқастың… 모두 허용).",
    use: { kz: "науқас" },
    avoid: { kz: ["пациент", "Пациент", "пациенттер", "Пациенттер", "пациенттің", "пациентпен"] },
  },
  {
    id: "term.saturday",
    ko: "토요일 (달력 약자)",
    status: "locked",
    why: "카자흐어 토요일은 сенбі → 약자 «Сн». 'Сб' 는 러시아어 суббота 의 약자라 카자흐 달력에 나오면 안 된다.",
    use: { kz: "Сн" },
    avoid: { kz: ["Сб"] },
    exceptKeys: [],
  },
  {
    id: "term.secondOpinion",
    ko: "세컨드 오피니언 (2차 소견)",
    status: "locked",
    why: "의료·법률 문서에서 굳어진 표현. 영어를 그대로 쓰면 환자가 못 읽는다.",
    use: { ru: "второе мнение", kz: "екінші пікір" },
    avoid: { ru: ["second opinion", "Second Opinion"], kz: ["second opinion", "второе мнение"] },
  },
  {
    id: "term.interpretation",
    ko: "의료 통역",
    status: "locked",
    why: "사람이 하는 통역(перевод/аударма)이지 기계 번역이 아니다 — 환자가 가장 자주 확인하는 항목이라 표기를 흔들면 안 된다.",
    use: { ru: "медицинский перевод", kz: "медициналық аударма" },
    avoid: { ru: ["машинный перевод"], kz: ["машиналық аударма"] },
    // 「이 글은 기계가 옮긴 것」이라고 «일부러» 알리는 화면 — 여기서 машинный перевод 는 정확한 말이다.
    exceptKeys: ["claimPage.machineTranslated", "status.translating"],
  },

  // ── 아래부터는 「제안」 — 원어민 코디네이터 확정 대기 (경고만 뜬다) ──
  {
    id: "org.myeonryeok",
    ko: "면력한방병원 (제휴 면역케어 병원)",
    status: "proposed",
    why:
      "현재 한 사이트에서 5가지로 불린다(Иммунная Клиника / Клиника Мёнрёк / клиника Myeonryeok / " +
      "Immune Hospital / больница корейской медицины). 환자는 이걸 서로 다른 병원으로 읽는다. " +
      "무엇으로 부를지는 **브랜드 결정**이라 코디네이터·PO 확정 전까지 경고만 띄운다.",
    use: { ru: "клиника Мёнрёк", kz: "Мёнрёк клиникасы" },
    avoid: {
      ru: ["Иммунная Клиника", "Immune Hospital", "клиника Myeonryeok", "Myeonryeok"],
      kz: ["Иммунная Клиника", "Immune Hospital", "Myeonryeok клиникасы", "Myeonryeok"],
    },
  },
  {
    id: "term.quote",
    ko: "견적서 (병원이 주는 예상 진료비 문서)",
    status: "proposed",
    why:
      "법정 고지 문서라 문서를 가리킬 땐 смета 로 고정하는 편이 낫다. 계산 행위는 расчёт, 금액 자체는 стоимость — " +
      "지금은 세 단어가 같은 뜻으로 섞여 있다.",
    use: { ru: "смета", kz: "смета" },
    avoid: {},
  },
  {
    id: "term.inquiry",
    ko: "문의 (환자가 처음 보내는 신청)",
    status: "proposed",
    why: "заявка(37)·обращение(21)·запрос(31) 세 단어가 같은 화면 흐름 안에서 섞인다. 하나로 고르면 흐름이 한 줄로 읽힌다.",
    use: { ru: "заявка", kz: "өтініш" },
    avoid: {},
  },
  {
    id: "term.consultation",
    ko: "상담",
    status: "proposed",
    why: "консультация(107) 와 приём(16) 혼용. приём 은 «내원 진료»에 가까워 원격상담에 쓰면 환자가 방문으로 오해한다.",
    use: { ru: "консультация", kz: "кеңес" },
    avoid: {},
  },
];

/** 언어별로 적용되는 항목만 추린다. */
export function glossaryForLang(lang) {
  return GLOSSARY.filter((e) => e.use?.[lang] || (e.avoid?.[lang]?.length ?? 0) > 0);
}

/**
 * 새 문구를 번역할 때 프롬프트에 붙일 표.
 * 「locked 는 반드시, proposed 는 되도록」이 프롬프트에도 그대로 드러나게 적는다.
 */
export function glossaryPrompt(lang) {
  const rows = glossaryForLang(lang);
  if (!rows.length) return "";
  const line = (e) => {
    const use = e.use?.[lang] ? `use "${e.use[lang]}"` : "";
    const avoid = e.avoid?.[lang]?.length ? ` / never "${e.avoid[lang].join('", "')}"` : "";
    return `- ${e.ko}: ${use}${avoid}${e.status === "proposed" ? " (preferred)" : " (REQUIRED)"}`;
  };
  return [
    "GLOSSARY — the product already uses these exact words. Reuse them verbatim; do not invent synonyms.",
    ...rows.map(line),
  ].join("\n");
}
