import { describe, it, expect } from "vitest";
import { speakerColor, speakerInitial, SPEAKER_COLORS } from "./speakerColor";

describe("speakerColor — 자막 화자 구분(사람 단위)", () => {
  it("같은 화자면 항상 같은 색 (재입장·새로고침에도 안 바뀜)", () => {
    const a = speakerColor("Assel");
    const b = speakerColor("Assel");
    expect(a).toBe(b);
    expect(SPEAKER_COLORS).toContain(a);
  });

  it("이름 앞뒤 공백은 같은 사람으로 본다", () => {
    expect(speakerColor(" Assel ")).toBe(speakerColor("Assel"));
  });

  it("다른 화자는 서로 다른 색을 받는다 (실제 참가자 이름 기준)", () => {
    const names = ["Assel", "Radmila", "healwith_moon", "Жанат"];
    const colors = names.map((n) => speakerColor(n).text);
    expect(new Set(colors).size).toBe(names.length);
  });

  it("이름이 없으면(구버전 클라·통역봇) 기본색으로 떨어지고 터지지 않는다", () => {
    expect(speakerColor(undefined)).toBe(SPEAKER_COLORS[0]);
    expect(speakerColor("")).toBe(SPEAKER_COLORS[0]);
    expect(speakerColor("   ")).toBe(SPEAKER_COLORS[0]);
    // @ts-expect-error — 잘못된 타입이 와도 죽지 않아야 한다(자막은 통화 중 경로)
    expect(speakerColor(null)).toBe(SPEAKER_COLORS[0]);
  });

  it("팔레트는 오버레이용(text·border·dot)과 기록 패널용(chip·bar)을 다 갖는다", () => {
    for (const c of SPEAKER_COLORS) {
      expect(c.text).toMatch(/^text-/);
      expect(c.border).toMatch(/^border-/);
      expect(c.dot).toMatch(/^bg-/);
      expect(c.chip).toMatch(/^bg-.+ text-/); // 색 배경 + 어두운 글자
      expect(c.bar).toMatch(/^bg-/);
    }
  });
});

describe("speakerInitial — 기록 패널 아바타 글자", () => {
  it("구분자가 있으면 두 토막의 머리글자", () => {
    expect(speakerInitial("healwith_moon")).toBe("HM");
    expect(speakerInitial("Roy Kang")).toBe("RK");
  });

  it("한 단어면 앞 두 글자", () => {
    expect(speakerInitial("Assel")).toBe("AS");
    expect(speakerInitial("Назерке")).toBe("НА");
  });

  it("이름이 없으면 물음표 — 화면이 깨지지 않게", () => {
    expect(speakerInitial("")).toBe("?");
    expect(speakerInitial(undefined)).toBe("?");
    expect(speakerInitial(null)).toBe("?");
  });
});
