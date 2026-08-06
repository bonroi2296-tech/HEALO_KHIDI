/**
 * 워드에서 뽑은 HTML 을 «허용 목록»으로 정제한다 (순수 문자열 처리 — 서버·시험 양쪽에서 돈다).
 *
 * 왜 따로 두나: 이 함수가 이 기능의 **유일한 안전장치**다(dangerouslySetInnerHTML 로 화면에 꽂힌다).
 * server-only 가 붙은 파일 안에 있으면 단위 시험을 못 돌린다 → 안전장치를 아무도 안 재게 된다.
 */
// mammoth 가 실제로 내는 것 + 표. 이 밖은 전부 버린다.
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "td", "th",
]);
const ALLOWED_ATTRS = new Set(["colspan", "rowspan"]);

/**
 * 허용 목록 정제. 태그 이름이 목록에 없으면 **태그만** 지우고 안의 글은 남긴다
 * (통째로 버리면 문서 내용이 조용히 사라진다 — 그게 더 나쁘다).
 * `<script>`·`<style>` 은 예외로 **안의 내용까지** 지운다.
 */
export function sanitizeDocHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, rawTag, rawAttrs) => {
      const tag = String(rawTag).toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (whole.startsWith("</")) return `</${tag}>`;

      const attrs: string[] = [];
      for (const m of String(rawAttrs).matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
        const name = m[1].toLowerCase();
        if (ALLOWED_ATTRS.has(name) && /^\d{1,3}$/.test(m[2])) attrs.push(`${name}="${m[2]}"`);
      }
      return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
    });
}
