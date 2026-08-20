/**
 * 자막 스택에서 「통역된 문장」을 가려내는 판정기.
 *
 * 왜 따로 뺐나 (2026-08-20):
 *   야간 로봇 통화 시험(`e2e/consultation-robot-call.spec.ts`)이 통역 자막을 확인할 때
 *   **키릴 문자를 찾는 코드가 시험 안에 박혀** 있었다. 로봇의 언어를 바꾸면 그 글자가
 *   영영 안 떠서 관측이 매일 밤 「자막 못 봄」으로 조용히 굳는다. 판정기를 밖으로 빼서
 *   ①언어와 함께 묶어 고르게 하고 ②사람 없이 이 파일만으로 시험할 수 있게 했다.
 *
 * 판정 기준 두 가지:
 *   ① **그 언어의 글자**로 되어 있어야 한다.
 *   ② **낱말 하나가 아니라 문장**이어야 한다. 자막 줄에는 참가자 이름표와 언어 라벨,
 *      AI 면책 배너도 같은 언어로 섞여 있어서, 낱말 하나만 봐도 걸리게 만들면
 *      봇이 아무 말도 안 해도 「자막 있음」이 된다(2026-07-28 실측: 라벨만 잡고
 *      통과할 뻔했다).
 *   ③ 통역 «전» 원문(한국어)이 섞여 있으면 제외한다. 원문은 통역 결과가 아니다.
 */
export type CaptionScript = "cyrillic" | "latin" | "hangul";

const RULES: Record<CaptionScript, RegExp> = {
  // 키릴 문자가 이어서 3글자 이상. 「Чат」(채팅) 같은 짧은 UI 낱말은 통과하지만
  // 아래 「낱말 두 개 이상」 조건에서 걸러진다.
  cyrillic: /(?:[Ѐ-ӿ]{2,}[ ,.'’-]+){2,}[Ѐ-ӿ]{2,}/,
  latin: /(?:[A-Za-z]{2,}[ ,.'’-]+){2,}[A-Za-z]{2,}/,
  hangul: /(?:[가-힣]{2,}[ ,.'’-]+){2,}[가-힣]{2,}/,
};

/** 통역 «전» 원문에만 쓰이는 글자. 이게 섞여 있으면 통역 결과가 아니다. */
const SOURCE_SCRIPT = /[가-힣]/;

export function translatedInto(script: CaptionScript) {
  const rule = RULES[script];
  return (text: string) => {
    if (script !== "hangul" && SOURCE_SCRIPT.test(text)) return false;
    return rule.test(text);
  };
}
