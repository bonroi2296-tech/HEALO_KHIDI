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
  // WARN 홑글자 «나» 는 뺐다(2026-08-28 실측): «이제 얼마나» 가 종결로 오인돼
  //    뒷말이 안 붙었다. 물음 «~나?» 는 물음표를 ENDED 가 잡고 «~나요» 는 목록에
  //    따로 있어 손해가 없다. 같은 표본에서 한국어가 23줄 -> 19줄로 합쳐졌고 러시아어는 그대로.
  /(습니다|읍니다|입니다|합니다|됩니다|세요|어요|아요|에요|예요|지요|나요|가요|까요|는지|은지|ㄴ지|든지|거죠|죠|네요|군요|다|요|까|지)\s*$/;

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
 *   ⚠️ 고유명사도 대문자다. 2026-08-28 실측에서 «Я из» + «Казахстана.» 가 이 규칙에
 *   걸려 안 붙었다(실시간 통역 자막 5회차 중 3회). 그래서 **앞 조각이 전치사·접속사로
 *   끝날 때만** 이 신호를 무시한다(endsWithConnector). 그 자리는 문장이 끝날 수 없는
 *   자리라, 뒤에 오는 대문자는 새 문장이 아니라 고유명사다.
 * · 한국어는 대소문자가 없어 이 신호를 못 쓴다 → 인사말·되묻기만 막는다.
 */
const SENTENCE_OPENERS =
  /^(안녕|여보세요|네[,.\s]|예[,.\s]|아니요|죄송|감사|그럼\s|자[,\s]|Здравствуйте|Привет|Спасибо|Извините|Да[,.\s]|Нет[,.\s]|Hello|Hi[,.\s]|Thanks|Sorry)/;

/**
 * 앞 조각이 «문장이 끝날 수 없는 낱말»로 끝나나? (전치사만)
 *
 * 전치사 뒤에는 명사가 «반드시» 온다. 그러니 뒤 조각이 대문자로 시작해도 새 문장이 아니라
 * 고유명사다. 한국어는 조사가 붙어 이 신호가 필요 없다(대소문자도 없다).
 *
 * ⚠️ 접속사(что·если·а·но·and·that…)는 **일부러 뺐다.** 2026-08-28 실서비스 자막
 *    3,554줄로 재보니, 접속사를 넣었을 때 새로 붙는 13건 중 6건이 «잘못» 붙었다:
 *    말하다 만 「Потом что」 에 다음 사람의 「Что вы хотите сделать?」 가 붙는 식이다.
 *    접속사 자리에서는 말이 실제로 끊긴다. 전치사 자리에서는 안 끊긴다. 그 차이다.
 * ⚠️ 목록을 넓히지 마라 — 넓힐수록 «잘못 붙이기»가 늘고, 그건 뜻을 바꾼다.
 */
const CONNECTOR_TAIL =
  /(^|\s)(из|в|во|на|с|со|к|ко|о|об|по|за|от|до|для|при|под|над|у|про|через|между|of|in|on|at|to|for|with|from|by)\s*$/i;

export function endsWithConnector(text: string): boolean {
  const t = (text || "").trim();
  if (!t || hasHangul(t)) return false;
  return CONNECTOR_TAIL.test(t);
}

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
  /**
   * 전치사로 끝난 앞줄에 «대문자로 시작하는 뒷줄»을 붙일까?
   *
   * 실시간 통역 경로에서만 켠다. 통역 모델은 «한 사람의 말»을 몇 글자씩 쪼개 보내므로
   * 전치사 뒤에 오는 대문자는 거의 고유명사다(「Я из」+「Казахстана.」).
   *
   * ⚠️ 기존 자막 경로에서는 끄고 둔다. 거긴 두 사람이 번갈아 말해서, 전치사로 끝나고
   *    «말하다 만» 줄에 상대의 새 문장이 붙는다. 2026-08-28 실서비스 자막 3,554줄로
   *    재보니 켰을 때 새로 붙는 3건 중 1건이 그런 오붙임이었다.
   */
  joinAfterPreposition?: boolean;
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
/**
 * 실시간 통역(agents/live-translate) 자막 전용 기본값.
 *
 * 왜 따로 두나 (2026-08-28 실측): 통역 모델은 말을 따라가며 몇 글자씩 즉시 내보내
 * 조각이 아주 잘다("Сейчас" 6자 · "я прохожу" 9자). 기본 minLen 8 로는 그 조각들이
 * 통째로 걸러져 붙일 것을 못 붙인다(문장 중간 절단 68% → 기본값 20% 에서 멈춤).
 *
 * 실측(8회차 131조각): 안 걸면 75%, minLen 4 면 23%, minLen 2·3 이면 8%.
 * ⚠️ 처음엔 5회차 74조각으로 재서 2·3·4 가 «전부 0%» 로 보여 4 를 골랐다. 표본을 늘리자
 *    갈렸다 — **작은 표본으로 고른 값은 못 믿는다.** 짧은 맞장구가 붙는 위험은 이제
 *    repeatsPrev 가 막으므로 3 까지 낮춰도 안전하다(2 와 결과가 같아 보수적인 3).
 */
/**
 * 뒤 조각이 앞 조각을 «되풀이»하고 있나?
 *
 * 자막은 같은 말이 두 번 오는 일이 잦다(경로가 둘이거나, 통역이 재전송하거나,
 * 「말하는 중」 조각이 확정본과 겹치거나). 그걸 이어 붙이면 한 줄 안에서 같은 말이
 * 두 번 찍힌다: 「카자흐스탄에서 카자흐스탄에서」.
 *
 * 2026-08-28 실측: 셋 다 붙고 있었다 — 같은 글 · 앞이 뒤에 통째로 들어간 글 ·
 * 러시아어 같은 글. 붙이기 판정보다 «먼저» 걸러야 한다.
 */
function repeatsPrev(a: string, b: string): boolean {
  const x = a.trim().toLowerCase().replace(/\s+/g, " ");
  const y = b.trim().toLowerCase().replace(/\s+/g, " ");
  if (!x || !y) return false;
  return y === x || y.startsWith(x) || x.startsWith(y);
}

// minLen 2: 코디가 읽는 한국어 자막은 조각이 더 짧아(「저는」 2자) 3에서 걸러졌다.
// 2026-08-28 실측 — 한국어 24% -> 17%, 러시아어는 0% 그대로(회귀 없음).
export const LIVE_TRANSLATE_STITCH: StitchOptions = { minLen: 2, joinAfterPreposition: true };

export function shouldStitch(
  { prev, next }: StitchInput,
  { maxGapMs = 10000, maxLen = 220, minLen = 8, joinAfterPreposition = false }: StitchOptions = {},
): boolean {
  if (!prev) return false;
  const a = (prev.source || "").trim();
  const b = (next.source || "").trim();
  if (!a || !b) return false;
  if (!looksCut(a)) return false;
  // 같은 말이 두 번 온 것이면 붙이지 않는다(한 줄에 같은 말이 두 번 찍힌다).
  if (repeatsPrev(a, b)) return false;                                    // ①
  const sa = (prev.speaker || "").trim();
  const sb = (next.speaker || "").trim();
  if (!sa || !sb || sa !== sb) return false;                         // ②
  if ((prev.lang || "") !== (next.lang || "")) return false;         // ③
  const gap = next.at - prev.at;
  if (!(gap >= 0 && gap <= maxGapMs)) return false;                  // ④
  // 앞이 전치사·접속사로 끝났으면 뒤의 대문자는 «새 문장»이 아니라 고유명사다(2026-08-28).
  if (startsNewSentence(b) && !(joinAfterPreposition && endsWithConnector(a))) return false;                            // ⑤
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
