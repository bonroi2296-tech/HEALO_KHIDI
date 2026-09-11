// 서버에서 «그 방문자 언어의 사전»을 HTML 안 <script> 로 인라인할 JSON 을 만든다.
// 브라우저의 t() 는 이 window.__I18N__ 을 읽는다 (i18n/index.js 의 dictOf 참고).
//
// (이스케이프 처리를 layout.jsx 안에 두면 읽기도 고치기도 나빠서 별도 파일로 뺐다.)
import { DICTIONARY } from "./dictionary";

// <script> 안에 들어가므로 '</script' 를 만들 수 있는 '<' 를 막고,
// JS 소스에서 「줄바꿈」으로 취급되는 U+2028/U+2029 도 막는다.
// 🛑 값의 백슬래시는 «두 개»여야 한다. "\\u003c" 는 여섯 글자 문자열 \u003c 를 만들지만
//    "\u003c" 는 그냥 «<» 자기 자신이라 치환이 아무것도 안 한다(무효 이스케이프).
//    2026-09-10 에 실제로 한 개로 줄어 «</script» 가 그대로 통과했다 → 시험으로 못박았다.
// ⚠️ 이 두 글자는 소스에 날것으로 못 적는다(적는 순간 이 파일이 파싱 에러) → 코드로 만든다.
// ⚠️ 셋 다 JSON 문자열 이스케이프로도 유효하다 → 이 결과는 JSON.parse() 로도 그대로 읽힌다
//    (app/_components/I18nDict.jsx 가 그 경로를 쓴다).
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const UNSAFE = new RegExp("[<\u2028\u2029]", "g");
const ESCAPES = { "<": "\\u003c", [LS]: "\\u2028", [PS]: "\\u2029" };

/**
 * @param {string[]} langs  브라우저에 심을 언어들(보통 1개, 쿠키 언어가 다르면 2개)
 * @param {string} primary  못 받은 언어로 t() 를 부를 때 되돌아갈 기본 언어
 * @returns {string} <script> 에도 JSON.parse() 에도 안전한 사전 JSON
 */
export function i18nDictJson(langs, primary) {
  const payload = { __primary: primary };
  for (const code of langs) {
    // en 을 깔고 그 언어를 덮는다 = 그 언어에 없는 키가 영어로 채워진 「완성본」.
    // 덕분에 브라우저가 en 사전을 따로 안 받아도 t() 의 영어 폴백이 그대로 동작한다.
    payload[code] = code === "en" ? DICTIONARY.en : { ...DICTIONARY.en, ...(DICTIONARY[code] || {}) };
  }
  return JSON.stringify(payload).replace(UNSAFE, (c) => ESCAPES[c]);
}
