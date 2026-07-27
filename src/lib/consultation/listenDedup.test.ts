/**
 * 같은 목소리가 여러 마이크에 잡혀 «여러 사람»으로 갈라지던 것(2026-07-27 실회의) 가드.
 * 한 공간에 기기가 여럿이면 각 트랙이 같은 발화를 조금씩 다르게 전사해 온다 —
 * 단어 겹침으로 같은 발화임을 알아채야 한다.
 */
import { describe, it, expect } from "vitest";
import { looksDuplicate } from "./ListenModeBridge";

describe("looksDuplicate", () => {
  it("같은 발화를 다른 마이크가 조금 다르게 전사해도 중복으로 본다", () => {
    expect(
      looksDuplicate(
        "Мы хотим отправить пациента в Корею на лечение",
        "мы хотим отправить пациента в корею на лечение."
      )
    ).toBe(true);
    // 단어 하나가 빠지거나 틀려도 겹침이 크면 같은 발화
    expect(
      looksDuplicate(
        "Мы хотим отправить пациента в Корею на лечение",
        "Мы хотим отправить пациента в Корею лечение сейчас"
      )
    ).toBe(true);
  });

  it("서로 다른 발화는 중복이 아니다", () => {
    expect(
      looksDuplicate(
        "Мы хотим отправить пациента в Корею на лечение",
        "Сколько стоит консультация в этой больнице сегодня"
      )
    ).toBe(false);
  });

  it("짧은 조각은 우연히 겹칠 수 있으므로 중복 판정하지 않는다", () => {
    // 세 단어짜리 맞장구가 서로를 지워버리면 대화가 통째로 사라진다
    expect(looksDuplicate("да конечно хорошо", "да конечно хорошо")).toBe(false);
  });

  it("빈 값·null 에도 죽지 않는다", () => {
    expect(looksDuplicate("", "")).toBe(false);
    expect(looksDuplicate(null as any, "무슨 말이든 네 단어 이상")).toBe(false);
  });
});
