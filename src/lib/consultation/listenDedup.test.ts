/**
 * 같은 목소리가 여러 마이크에 잡혀 «여러 사람»으로 갈라지던 것(2026-07-27 실회의) 가드.
 * 한 공간에 기기가 여럿이면 각 트랙이 같은 발화를 조금씩 다르게 전사해 온다 —
 * 단어 겹침으로 같은 발화임을 알아채야 한다.
 */
import { describe, it, expect } from "vitest";
import { looksDuplicate, dominantSpeaker } from "./ListenModeBridge";

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

/**
 * 화자 귀속 — «화면 테두리와 같은 신호»(LiveKit 활성 화자)로 자막의 주인을 정한다.
 * 2026-07-29 실회의: 러시아어를 한 마디도 안 한 한국인 참가자 이름으로 러시아어 자막 8줄이
 * 붙었다(같은 사무실 마이크가 남의 발화를 잡았는데, 응답이 먼저 도착한 트랙이 주인이 됐다).
 */
describe("dominantSpeaker", () => {
  const log = [
    { at: 1000, identity: "roy", name: "ROY KANG", level: 0.05 },
    { at: 1200, identity: "eldar", name: "Эльдар", level: 0.8 },
    { at: 1400, identity: "eldar", name: "Эльдар", level: 0.9 },
    { at: 1600, identity: "roy", name: "ROY KANG", level: 0.04 },
  ];

  it("발화 구간에 가장 크게 잡힌 사람이 화자다 (마이크 주인이 아니라)", () => {
    expect(dominantSpeaker(log, 1000, 1700)?.name).toBe("Эльдар");
  });

  it("구간 밖 기록은 안 센다", () => {
    // 3초 뒤 구간 — 로그가 전부 창 밖이라 판정 보류
    expect(dominantSpeaker(log, 5000, 6000)).toBe(null);
  });

  it("오디오 레벨을 안 주는 브라우저(전부 0)면 잡힌 횟수로 가른다", () => {
    const flat = [
      { at: 100, identity: "a", name: "A", level: 0 },
      { at: 200, identity: "b", name: "B", level: 0 },
      { at: 300, identity: "b", name: "B", level: 0 },
    ];
    expect(dominantSpeaker(flat, 100, 400)?.name).toBe("B");
  });

  it("빈 로그에도 죽지 않는다", () => {
    expect(dominantSpeaker([], 0, 100)).toBe(null);
  });
});
