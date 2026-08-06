/**
 * 워드 미리보기 정제기 시험 — 이 함수가 **유일한 안전장치**라서(정제한 HTML 을 환자 화면에
 * 그대로 꽂는다) 깨지면 바로 XSS 다. 「실행될 수 있는 것이 하나도 안 남는가」만 잰다.
 */
import { describe, it, expect } from "vitest";
import { sanitizeDocHtml } from "./sanitizeDocHtml";

describe("sanitizeDocHtml", () => {
  it("문단·목록·제목은 그대로 남긴다", () => {
    const out = sanitizeDocHtml("<h2>제목</h2><p>본문</p><ul><li>가</li><li>나</li></ul>");
    expect(out).toBe("<h2>제목</h2><p>본문</p><ul><li>가</li><li>나</li></ul>");
  });

  it("표는 남기되 병합 속성만 숫자로 통과시킨다", () => {
    const out = sanitizeDocHtml(
      '<table><tr><td colspan="2" style="color:red" onclick="x()">칸</td></tr></table>'
    );
    expect(out).toBe('<table><tr><td colspan="2">칸</td></tr></table>');
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("style");
  });

  it("콜스팬 값이 숫자가 아니면 버린다", () => {
    expect(sanitizeDocHtml('<td colspan="javascript:alert(1)">x</td>')).toBe("<td>x</td>");
  });

  it("script 는 내용까지 지운다", () => {
    expect(sanitizeDocHtml("<p>앞</p><script>alert(1)</script><p>뒤</p>")).toBe("<p>앞</p><p>뒤</p>");
  });

  it("허용 목록 밖 태그는 태그만 지우고 «글은 남긴다»", () => {
    // 통째로 버리면 문서 내용이 조용히 사라진다 — 그게 더 나쁘다.
    expect(sanitizeDocHtml("<div><span>내용</span></div>")).toBe("내용");
  });

  it("링크·이미지처럼 실행 경로가 있는 태그는 남지 않는다", () => {
    const out = sanitizeDocHtml('<a href="javascript:alert(1)">누르기</a><img src=x onerror="alert(1)">');
    expect(out).toBe("누르기");
    expect(out).not.toContain("<a");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
  });

  it("닫는 태그가 없는 script 도 실행 태그로 남지 않는다", () => {
    const out = sanitizeDocHtml("<p>앞</p><script>alert(1)");
    expect(out).not.toContain("<script");
  });

  it("이벤트 속성은 허용 태그에 붙어 있어도 전부 버린다", () => {
    expect(sanitizeDocHtml('<p onmouseover="steal()">글</p>')).toBe("<p>글</p>");
  });
});
