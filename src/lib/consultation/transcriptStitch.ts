/**
 * 문장 중간에서 잘린 자막 이어 붙이기 — 상담방 화면에 꽂을 순수 판정.
 *
 * 왜 필요한가 (2026-08-27 실측):
 *   실서비스 자막 3,118건을 복호화해 세어보니 **980건(31%)이 문장부호 없이 끝난다**
 *   = 말이 끝나기 전에 조각이 잘렸다. 방향을 안 가린다(러시아어 30% · 한국어 36% ·
 *   영어 39% · 카자흐어 34%), 7월 33% → 8월 29% 로 거의 안 줄었다.
 *
 *   진범은 page.jsx 의 «1.2초 무음 = 말 끝» 판정이다. 사람은 문장 «안»에서도 숨을 쉬고
 *   생각한다. 원래 0.7초였다가 절단이 양산돼 1.2초로 늘렸는데(#1205, 한국어 59%→36%),
 *   거기서 멈췄다. **더 늘리면 자막이 그만큼 늦게 뜬다 — 문턱만으로는 여기가 한계다.**
 *   ⚠️ 10초 강제 컷은 진범이 아니다: 9~20자 짧은 발화도 31%가 잘린다(길이 무관).
 *
 * 그래서 방향을 바꾼다: 자르는 걸 막는 대신 **자른 뒤에 도로 붙인다.**
 *
 * ⚠️ 의료 상담이라 «잘못 붙이는 것»이 «안 붙이는 것»보다 훨씬 해롭다. 서로 다른 두 문장이
 *    한 줄로 붙으면 뜻이 바뀐다("수술은 어렵습니다" + "가능합니다"). 그래서 판정은
 *    **의심스러우면 안 붙인다**로 기울여 놓았다. 문턱을 낮추고 싶으면 반드시 실측부터.
 */

/** 문장이 «끝난» 표시. 닫는 따옴표·괄호가 뒤에 붙어도 끝으로 본다. */
const ENDED = /[.!?…。？！]["'»）)]?\s*$/;

/**
 * 한국어 종결어미. 한국어 자막은 마침표가 자주 빠져서 «부호 없음 = 잘림»이 안 맞는다.
 *
 * 2026-08-27 실측: 이 판정 없이 붙였더니 «네, 그게 갑자기 암이 확 진행된 건지» 처럼
 * 이미 «끝난 물음»에 다음 질문이 통째로 붙었다. 어미로 끝났으면 완결로 본다.
 * ⚠️ 「없고요」처럼 «~고 + 요» 인 이어지는 말도 완결로 걸러진다 — 붙일 것을 못 붙이는
 *    쪽(안전한 실수)이라 그대로 둔다. 반대 방향 실수는 뜻을 바꾼다.
 */
const KO_ENDING =
  /(습니다|읍니다|입니다|합니다|됩니다|세요|어요|아요|에요|예요|지요|나요|가요|까요|는지|은지|ㄴ지|든지|거죠|죠|네요|군요|다|요|까|나|지)\s*$/;

const hasHangul = (s: string) => /[가-힣]/.test(s);

/** 이 자막은 말이 끝나기 전에 잘렸나? */
export function looksCut(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (ENDED.test(t)) return false;
  // 한국어는 부호가 없어도 종결어미로 끝났으면 완결로 본다
  if (hasHangul(t) && KO_ENDING.test(t)) return false;
  return true;
}

/**
 * 뒤 조각이 «새 문장의 시작»으로 보이나? 그러면 앞과 붙이지 않는다.
 *
 * · 로마자·키릴 대문자로 시작 = 새 문장(러시아어·영어에서 가장 믿을 만한 신호).
 *   ⚠️ 고유명사도 대문자라 «Антон 은 …» 같은 이어짐을 놓친다 — 붙일 것을 못 붙이는
 *   쪽(안전한 실수)이므로 그대로 둔다.
 * · 한국어는 대소문자가 없어 이 신호를 못 쓴다 → 인사말·되묻기만 막는다.
 */
const SENTENCE_OPENERS =
  /^(안녕|여보세요|네[,.\s]|예[,.\s]|아니요|죄송|감사|그럼\s|자[,\s]|Здравствуйте|Привет|Спасибо|Извините|Да[,.\s]|Нет[,.\s]|Hello|Hi[,.\s]|Thanks|Sorry)/;

export function startsNewSentence(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (SENTENCE_OPENERS.test(t)) return true;
  const first = t[0];
  // 로마자·키릴 대문자로 시작하면 새 문장으로 본다(소문자로 이어지는 것만 붙인다)
  return /[A-ZА-ЯЁ]/.test(first);
}

export type Chunk = {
  source: string;
  translated?: string;
  speaker?: string | null;
  /** 발화 언어. 다르면 애초에 다른 사람의 말이다 — 안 붙인다. */
  lang?: string | null;
  at: number;
};

export type StitchInput = {
  /** 앞 자막(화면에 이미 떠 있는 줄) */
  prev: Chunk | null;
  /** 방금 도착한 자막 */
  next: Chunk;
};

export type StitchOptions = {
  /**
   * 두 조각 사이 최대 간격(ms). 이보다 벌어지면 다른 발화로 본다.
   * 기본 10초 — 2026-08-27 실측으로 고른 값이다. 처음 6초로 잡았더니 «잘렸는데 간격이
   * 넘어서» 못 붙인 쌍이 111건이었고 그 중앙값이 8초였다(받아쓰기 왕복이 그만큼 걸린다).
   * 6→10초로 늘리니 붙는 게 67→90건, 절단률 28.0%→27.1%. 15초 이상은 더 안 는다.
   */
  maxGapMs?: number;
  /** 합친 뒤 최대 길이(자). 넘으면 안 붙인다 — 자막 한 줄이 화면을 덮는다. */
  maxLen?: number;
  /** 양쪽 조각의 최소 길이(자). 이보다 짧으면 맞장구로 보고 안 붙인다. */
  minLen?: number;
};

/**
 * 두 조각을 붙일까?
 *
 * 붙이는 조건(전부 참일 때만):
 *   ① 앞 조각이 문장부호 없이 끝났다 (= 잘렸다)
 *   ② 이름이 «둘 다 있고» 같다 — 이름이 비면 누가 말했는지 모르는 것이니 안 붙인다.
 *      (2026-08-27 실측: 맞장구 경로는 화자를 안 넘긴다 → 빈 이름끼리 «같다»로 통과해
 *       카자흐어 줄과 한국어 줄이 한 덩어리로 붙었다.)
 *   ③ 발화 언어가 같다 — 다르면 다른 사람이다.
 *   ④ 간격이 짧다 (기본 10초 — 아래 maxGapMs 주석의 실측 근거 참고)
 *   ⑤ 뒤 조각이 새 문장처럼 시작하지 않는다
 *   ⑥ 양쪽 다 맞장구가 아니다 — "예"+"예"를 "예 예"로 잇는 건 아무 도움이 안 된다.
 *   ⑦ 합쳐도 너무 길지 않다
 */
export function shouldStitch(
  { prev, next }: StitchInput,
  { maxGapMs = 10000, maxLen = 220, minLen = 8 }: StitchOptions = {},
): boolean {
  if (!prev) return false;
  const a = (prev.source || "").trim();
  const b = (next.source || "").trim();
  if (!a || !b) return false;
  if (!looksCut(a)) return false;                                    // ①
  const sa = (prev.speaker || "").trim();
  const sb = (next.speaker || "").trim();
  if (!sa || !sb || sa !== sb) return false;                         // ②
  if ((prev.lang || "") !== (next.lang || "")) return false;         // ③
  const gap = next.at - prev.at;
  if (!(gap >= 0 && gap <= maxGapMs)) return false;                  // ④
  if (startsNewSentence(b)) return false;                            // ⑤
  if (a.length < minLen || b.length < minLen) return false;          // ⑥
  if (a.length + b.length + 1 > maxLen) return false;                // ⑦
  return true;
}

/** 사이에 넣을 이음새. 앞이 쉼표로 끝나면 공백만, 아니면 공백 하나. */
function join(a: string, b: string): string {
  return `${a.replace(/\s+$/, "")} ${b.replace(/^\s+/, "")}`;
}

/** 붙인 결과. 원문과 번역문을 같은 규칙으로 잇는다. */
export function stitch({ prev, next }: StitchInput): { source: string; translated: string } {
  const a = prev!;
  return {
    source: join(a.source || "", next.source || ""),
    translated: join(a.translated || "", next.translated || ""),
  };
}
