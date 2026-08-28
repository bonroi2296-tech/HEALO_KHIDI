/**
 * 이어 붙이기 판정 — «잘못 붙이면 뜻이 바뀐다»를 빨간불로 고정한다.
 * 각 테스트 = 실서비스 자막에서 실제로 본 모양(2026-08-27 감사).
 */
import { describe, it, expect } from "vitest";
import {
  looksCut,
  startsNewSentence,
  endsWithConnector,
  shouldStitch,
  stitch,
  LIVE_TRANSLATE_STITCH,
} from "./transcriptStitch";

const at = 1_000_000;
const row = (source: string, t = at, speaker = "코디", lang = "ko") => ({
  source,
  translated: "",
  speaker,
  lang,
  at: t,
});

describe("looksCut — 말이 끝나기 전에 잘렸나", () => {
  it("문장부호 없이 끝나면 잘린 것", () => {
    expect(looksCut("하지만 암 환자들의 경우, 최근에는")).toBe(true);
    expect(looksCut("Но что касается онкологических пациентов, они в последнее время")).toBe(true);
  });
  it("마침표·물음표로 끝나면 안 잘린 것", () => {
    expect(looksCut("복통이 심하고 메스꺼움이 있습니다.")).toBe(false);
    expect(looksCut("제 말 들리세요?")).toBe(false);
  });
  it("닫는 따옴표·괄호가 뒤에 붙어도 끝으로 본다", () => {
    expect(looksCut('그가 "괜찮다"고 했습니다."')).toBe(false);
  });
  it("빈 줄은 잘린 것으로 치지 않는다", () => {
    expect(looksCut("")).toBe(false);
    expect(looksCut("   ")).toBe(false);
  });

  // ↓ 2026-08-27 실측: 마침표 없이 끝나는 한국어를 전부 «잘림»으로 봤더니
  //   이미 끝난 물음에 다음 질문이 통째로 붙었다.
  it("한국어는 마침표가 없어도 종결어미로 끝났으면 완결로 본다", () => {
    expect(looksCut("네, 그게 갑자기 암이 확 진행된 건지")).toBe(false);
    expect(looksCut("조직 검사를 먼저 받으셔야 합니다")).toBe(false);
    expect(looksCut("지금 오시는 건 의미가 없어요")).toBe(false);
  });

  it("한국어가 조사·연결어미로 끝나면 잘린 것", () => {
    expect(looksCut("국내 신약 출시된 것도")).toBe(true);
    expect(looksCut("일단 치료를 진행하시고")).toBe(true);
    expect(looksCut("조금 더 자세한")).toBe(true);
  });
});

describe("startsNewSentence — 뒤 조각이 새 문장인가", () => {
  it("키릴·로마자 대문자로 시작하면 새 문장", () => {
    expect(startsNewSentence("Получается, вы только в Индии работали?")).toBe(true);
    expect(startsNewSentence("I see.")).toBe(true);
  });
  it("소문자로 이어지면 새 문장이 아니다", () => {
    expect(startsNewSentence("они только занимаются вот этим")).toBe(false);
  });
  it("한국어 인사말·맞장구는 새 문장으로 본다", () => {
    expect(startsNewSentence("안녕하세요, 선생님")).toBe(true);
    expect(startsNewSentence("네, 알겠습니다")).toBe(true);
  });
  it("한국어 이어지는 말은 새 문장이 아니다", () => {
    expect(startsNewSentence("항암치료를 받으셨다고요")).toBe(false);
  });
});

describe("shouldStitch — 붙일까", () => {
  it("잘린 앞 + 소문자로 이어지는 뒤 = 붙인다", () => {
    const r = shouldStitch({
      prev: row("Но что касается онкологических пациентов,"),
      next: row("они в последнее время часто приезжают", at + 2000),
    });
    expect(r).toBe(true);
  });

  it("앞이 마침표로 끝났으면 안 붙인다", () => {
    expect(
      shouldStitch({ prev: row("수술은 어렵습니다."), next: row("가능합니다", at + 1000) }),
    ).toBe(false);
  });

  it("⚠️ 화자가 다르면 안 붙인다 — 남의 말이 내 문장에 붙으면 뜻이 뒤집힌다", () => {
    expect(
      shouldStitch({
        prev: row("수술은 어렵고", at, "코디"),
        next: row("가능합니다", at + 1000, "환자"),
      }),
    ).toBe(false);
  });

  it("간격이 벌어지면 다른 발화로 본다", () => {
    expect(
      shouldStitch({ prev: row("최근에는"), next: row("좋아졌어요", at + 20000) }),
    ).toBe(false);
  });

  it("뒤 조각이 대문자로 시작하면 안 붙인다", () => {
    expect(
      shouldStitch({ prev: row("и вот"), next: row("Спасибо большое", at + 1000) }),
    ).toBe(false);
  });

  it("합쳐서 너무 길면 안 붙인다 — 자막 한 줄이 화면을 덮는다", () => {
    expect(
      shouldStitch({ prev: row("가".repeat(150)), next: row("나".repeat(100), at + 1000) }),
    ).toBe(false);
  });

  it("앞 자막이 없으면(첫 줄) 안 붙인다", () => {
    expect(shouldStitch({ prev: null, next: row("이어지는 말") })).toBe(false);
  });

  it("뒤 조각이 앞보다 먼저 말한 것이면 안 붙인다", () => {
    expect(
      shouldStitch({
        prev: row("최근에는 많이 오시는데", at),
        next: row("좋아졌다고 합니다", at - 3000),
      }),
    ).toBe(false);
  });

  // ↓ 아래 셋은 2026-08-27 실서비스 3,118건에 처음 돌렸을 때 «실제로 잘못 붙은» 것들이다.
  it("⚠️ 발화 언어가 다르면 안 붙인다 (실측: 카자흐어 줄에 한국어 줄이 붙었다)", () => {
    expect(
      shouldStitch({
        prev: row("Асхат ағай айтқандай", at, "코디", "kz"),
        next: row("아드님께서 오신다고", at + 1000, "코디", "ko"),
      }),
    ).toBe(false);
  });

  it("⚠️ 화자 이름이 비어 있으면 안 붙인다 (실측: 빈 이름끼리 «같은 사람»으로 통과했다)", () => {
    expect(
      shouldStitch({
        prev: row("вы понимаете о чем я", at, "", "ru"),
        next: row("그러면 이제 다음으로", at + 1000, "", "ko"),
      }),
    ).toBe(false);
    // 언어까지 같아도 이름이 없으면 안 붙인다
    expect(
      shouldStitch({
        prev: row("치료를 계속하시면서", at, ""),
        next: row("경과를 지켜보시죠", at + 1000, ""),
      }),
    ).toBe(false);
  });

  it("⚠️ 맞장구끼리는 안 붙인다 (실측: \"예\"+\"예\"가 \"예 예\"로 이어졌다)", () => {
    expect(shouldStitch({ prev: row("예"), next: row("예", at + 800) })).toBe(false);
    expect(shouldStitch({ prev: row("네, 네"), next: row("네", at + 800) })).toBe(false);
  });
});

describe("stitch — 붙인 결과", () => {
  it("원문과 번역문을 같은 규칙으로 잇는다", () => {
    const prev = { source: "하지만 암 환자들의 경우,", translated: "Но что касается", speaker: "코디", at };
    const next = { source: "최근에는 많이 옵니다.", translated: "они часто приезжают.", speaker: "코디", at: at + 1000 };
    const r = stitch({ prev, next });
    expect(r.source).toBe("하지만 암 환자들의 경우, 최근에는 많이 옵니다.");
    expect(r.translated).toBe("Но что касается они часто приезжают.");
  });

  // ── 2026-08-28: 실시간 통역 자막으로 실측하다 나온 것 ──
  // 러시아어는 고유명사도 대문자다. 「대문자 = 새 문장」 규칙이 이어지는 말을 막았다.
  describe("전치사·접속사로 끝나면 뒤가 대문자여도 붙인다", () => {
    it("Я из + Казахстана. 를 붙인다 (실제로 못 붙였던 사례)", () => {
      expect(
        shouldStitch({
          prev: { source: "Я из", speaker: "bot", lang: "ru", at: 1000 },
          next: { source: "Казахстана.", speaker: "bot", lang: "ru", at: 1600 },
        }, LIVE_TRANSLATE_STITCH)
      ).toBe(true);
    });

    it("и я перенес операцию в + Сеуле. 를 붙인다", () => {
      expect(
        shouldStitch({
          prev: { source: "и я перенес операцию в", speaker: "bot", lang: "ru", at: 1000 },
          next: { source: "Сеуле.", speaker: "bot", lang: "ru", at: 1500 },
        }, LIVE_TRANSLATE_STITCH)
      ).toBe(true);
    });

    it("앞이 끝난 문장이면 전치사가 없으니 그대로 안 붙인다", () => {
      expect(
        shouldStitch({
          prev: { source: "Здравствуйте, доктор.", speaker: "bot", lang: "ru", at: 1000 },
          next: { source: "Казахстана нет.", speaker: "bot", lang: "ru", at: 1500 },
        })
      ).toBe(false);
    });

    it("전치사로 안 끝나면 대문자를 여전히 새 문장으로 본다", () => {
      expect(
        shouldStitch({
          prev: { source: "мне поставили диагноз", speaker: "bot", lang: "ru", at: 1000 },
          next: { source: "Сейчас я прохожу", speaker: "bot", lang: "ru", at: 1500 },
        })
      ).toBe(false);
    });

    it("한국어에는 이 완화를 적용하지 않는다", () => {
      expect(endsWithConnector("수술을 받았고")).toBe(false);
      expect(endsWithConnector("Я из")).toBe(true);
      expect(endsWithConnector("Изучение")).toBe(false);
    });

    it("통역봇 기본값에서도 짧은 맞장구는 안 붙는다", () => {
      expect(
        shouldStitch({
          prev: { source: "Да", speaker: "bot", lang: "ru", at: 1000 },
          next: { source: "Да", speaker: "bot", lang: "ru", at: 1400 },
        }, LIVE_TRANSLATE_STITCH)
      ).toBe(false);
    });
  });


  // ── 2026-08-28: 같은 말이 두 번 오는 경우 ──
  // 자막 경로가 둘이거나 통역이 재전송하면 같은 말이 두 번 온다. 붙이면 한 줄에 두 번 찍힌다.
  describe("되풀이된 자막은 붙이지 않는다", () => {
    const P = { speaker: "p1", lang: "ko", at: 1000 };
    const N = { speaker: "p1", lang: "ko", at: 1600 };

    it("같은 글이 두 번 오면 안 붙인다", () => {
      expect(
        shouldStitch(
          { prev: { ...P, source: "카자흐스탄에서" }, next: { ...N, source: "카자흐스탄에서" } },
          LIVE_TRANSLATE_STITCH
        )
      ).toBe(false);
    });

    it("앞 조각이 뒤 조각에 통째로 들어가 있으면 안 붙인다", () => {
      expect(
        shouldStitch(
          {
            prev: { ...P, source: "위암 3기 진단을" },
            next: { ...N, source: "위암 3기 진단을 받았고" },
          },
          LIVE_TRANSLATE_STITCH
        )
      ).toBe(false);
    });

    it("러시아어에서도 같은 글은 안 붙인다", () => {
      expect(
        shouldStitch(
          {
            prev: { ...P, source: "рака желудка", lang: "ru" },
            next: { ...N, source: "рака желудка", lang: "ru" },
          },
          LIVE_TRANSLATE_STITCH
        )
      ).toBe(false);
    });

    it("되풀이가 아니면 그대로 붙인다", () => {
      expect(
        shouldStitch(
          { prev: { ...P, source: "카자흐스탄에서" }, next: { ...N, source: "왔습니다." } },
          LIVE_TRANSLATE_STITCH
        )
      ).toBe(true);
    });
  });

});
