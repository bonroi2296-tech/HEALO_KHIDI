const englishSentence = (t) =>
  !/[가-힣]/.test(t) && /(?:[A-Za-z]{2,}[ ,.'-]+){2,}[A-Za-z]{2,}/.test(t);
const cases = [
  ["I had stomach cancer surgery two months ago.", true,  "진짜 영어 자막"],
  ["How long is the recovery period?",             true,  "진짜 영어 자막"],
  ["E2E-ROBOT-B",                                  false, "이름표(낱말 하나)"],
  ["English",                                      false, "언어 라벨"],
  ["AI",                                           false, "면책 배너 조각"],
  ["안녕하세요. 위암 수술을 받았습니다.",           false, "통역 «전» 한국어 원문"],
  ["Привет, как дела сегодня",                     false, "러시아어"],
  ["안녕하세요 I had surgery",                      false, "한글 섞임(원문)"],
];
let bad = 0;
for (const [t, want, why] of cases) {
  const got = englishSentence(t);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? "✅" : "❌"} ${String(got).padEnd(5)} (기대 ${String(want).padEnd(5)}) ${why}  «${t.slice(0,42)}»`);
}
console.log(bad === 0 ? "\n모두 통과" : `\n실패 ${bad}건`);
process.exit(bad ? 1 : 0);
