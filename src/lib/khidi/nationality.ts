/**
 * 국적 코드 → 한국어 표기 (순수 함수, KHIDI 리포트 가독성).
 *
 * kpi.ts 에서 분리: kpi.ts 는 `import "server-only"` 라 vitest 직접 임포트가 막힌다.
 * inquiries.nationality 는 ISO 2자리 코드(KZ/RU/UZ…)로 저장됨.
 * 대시보드 진행바 색상은 "카자흐"/"러시아" 또는 "KZ"/"RU" 둘 다 매칭하므로
 * 한국어로 바꿔도 색상 로직이 유지된다. 모르는 코드는 원문 그대로 둔다.
 */

export const NATIONALITY_NAMES: Record<string, string> = {
  KZ: "카자흐스탄",
  RU: "러시아",
  UZ: "우즈베키스탄",
  KG: "키르기스스탄",
  TJ: "타지키스탄",
  TM: "투르크메니스탄",
  AZ: "아제르바이잔",
  GE: "조지아",
  AM: "아르메니아",
  BY: "벨라루스",
  UA: "우크라이나",
  MN: "몽골",
  KR: "한국",
  CN: "중국",
  JP: "일본",
  US: "미국",
  // 아프리카 — UNHCR(난민) 경로로 들어온 장기이식 문의가 실제로 있다(2026-05-26 #87).
  // 없으면 화면에 코드 그대로("ET")가 떠서 코디가 어느 나라인지 못 읽는다.
  ET: "에티오피아",
  ER: "에리트레아",
};

/**
 * 국적 코드 정규화. 빈 값/공백은 "기타", 알려진 코드는 한국어, 미등록 코드는 원문 유지.
 */
export function normalizeNationality(raw: string | null | undefined): string {
  if (!raw) return "기타";
  const v = raw.trim();
  if (!v) return "기타";
  return NATIONALITY_NAMES[v.toUpperCase()] ?? v;
}

/**
 * 국적 다국어 라벨 (백오피스 포털용 — 외국인 코디/에이전시가 각 언어로 봄).
 * 활성 6개 언어(ko·en·ru·kz·zh·ja). 미등록 코드는 원문 유지, 빈 값은 "기타".
 */
export const NATIONALITY_NAMES_L: Record<string, Record<string, string>> = {
  KZ: { ko: "카자흐스탄", en: "Kazakhstan", ru: "Казахстан", kz: "Қазақстан", zh: "哈萨克斯坦", ja: "カザフスタン" },
  RU: { ko: "러시아", en: "Russia", ru: "Россия", kz: "Ресей", zh: "俄罗斯", ja: "ロシア" },
  UZ: { ko: "우즈베키스탄", en: "Uzbekistan", ru: "Узбекистан", kz: "Өзбекстан", zh: "乌兹别克斯坦", ja: "ウズベキスタン" },
  KG: { ko: "키르기스스탄", en: "Kyrgyzstan", ru: "Кыргызстан", kz: "Қырғызстан", zh: "吉尔吉斯斯坦", ja: "キルギス" },
  TJ: { ko: "타지키스탄", en: "Tajikistan", ru: "Таджикистан", kz: "Тәжікстан", zh: "塔吉克斯坦", ja: "タジキスタン" },
  TM: { ko: "투르크메니스탄", en: "Turkmenistan", ru: "Туркменистан", kz: "Түрікменстан", zh: "土库曼斯坦", ja: "トルクメニスタン" },
  AZ: { ko: "아제르바이잔", en: "Azerbaijan", ru: "Азербайджан", kz: "Әзербайжан", zh: "阿塞拜疆", ja: "アゼルバイジャン" },
  GE: { ko: "조지아", en: "Georgia", ru: "Грузия", kz: "Грузия", zh: "格鲁吉亚", ja: "ジョージア" },
  AM: { ko: "아르메니아", en: "Armenia", ru: "Армения", kz: "Армения", zh: "亚美尼亚", ja: "アルメニア" },
  BY: { ko: "벨라루스", en: "Belarus", ru: "Беларусь", kz: "Беларусь", zh: "白俄罗斯", ja: "ベラルーシ" },
  UA: { ko: "우크라이나", en: "Ukraine", ru: "Украина", kz: "Украина", zh: "乌克兰", ja: "ウクライナ" },
  MN: { ko: "몽골", en: "Mongolia", ru: "Монголия", kz: "Моңғолия", zh: "蒙古", ja: "モンゴル" },
  KR: { ko: "한국", en: "South Korea", ru: "Южная Корея", kz: "Оңтүстік Корея", zh: "韩国", ja: "韓国" },
  CN: { ko: "중국", en: "China", ru: "Китай", kz: "Қытай", zh: "中国", ja: "中国" },
  JP: { ko: "일본", en: "Japan", ru: "Япония", kz: "Жапония", zh: "日本", ja: "日本" },
  US: { ko: "미국", en: "USA", ru: "США", kz: "АҚШ", zh: "美国", ja: "アメリカ" },
  ET: { ko: "에티오피아", en: "Ethiopia", ru: "Эфиопия", kz: "Эфиопия", zh: "埃塞俄比亚", ja: "エチオピア" },
  ER: { ko: "에리트레아", en: "Eritrea", ru: "Эритрея", kz: "Эритрея", zh: "厄立特里亚", ja: "エリトリア" },
  OTHER: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" },
};

const OTHER_NAT: Record<string, string> = { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" };

/** 국적 코드 → 언어별 표기. 미등록 코드는 원문 유지, 빈 값은 "기타". */
export function nationalityLabelL(raw: string | null | undefined, lang = "en"): string {
  if (!raw) return OTHER_NAT[lang] || OTHER_NAT.en;
  const v = raw.trim();
  if (!v) return OTHER_NAT[lang] || OTHER_NAT.en;
  const row = NATIONALITY_NAMES_L[v.toUpperCase()];
  if (row) return row[lang] || row.en || row.ko || v;
  return v;
}
