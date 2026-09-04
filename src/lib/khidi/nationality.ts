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
  OTHER: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" },
};

const OTHER_NAT: Record<string, string> = { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" };

/**
 * 국적 코드 → 언어별 표기. 빈 값도, 목록에 없는 코드도 "기타"로 묶는다.
 *
 * 🛑 나라를 하나씩 늘리지 마라(2026-09-04 PO): 「모든 국적을 다 표기할 수도 없고」.
 *    이 목록은 우리가 «실제로 유치하는» 중앙아시아·CIS 중심이고, 그 밖은 «기타»로 충분하다.
 *    다만 코드는 괄호로 남긴다 — 「기타」만 뜨면 코디가 어느 나라 환자인지 알 방법이 없어진다
 *    (2026-09-04 실측: 에티오피아 난민 케이스 #87 이 화면에 「ET」라는 날코드로 떠 있었다).
 */
export function nationalityLabelL(raw: string | null | undefined, lang = "en"): string {
  const other = OTHER_NAT[lang] || OTHER_NAT.en;
  if (!raw) return other;
  const v = raw.trim();
  if (!v) return other;
  const row = NATIONALITY_NAMES_L[v.toUpperCase()];
  if (row) return row[lang] || row.en || row.ko || v;
  // 2~3글자 국가코드로 보이면 「기타(ET)」, 그 밖의 잡값이면 그냥 「기타」.
  return /^[A-Za-z]{2,3}$/.test(v) ? `${other}(${v.toUpperCase()})` : other;
}
