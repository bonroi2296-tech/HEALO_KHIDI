/**
 * 2026-07-27 실회의에서 터진 순서·중복 사고를 «다시 나면 빨간불»로 고정한다.
 * 각 테스트 = 그날 PO 가 실제로 본 증상 1개.
 */
import { describe, it, expect } from "vitest";
import {
  chunkRank,
  shouldShowChunk,
  sortByTime,
  dedupeAgainstShown,
  isSameSpeakerRun,
} from "./transcriptOrder";

describe("shouldShowChunk — «이전 대화 자막이 뜬금없이 올라와»", () => {
  it("늦게 도착한 옛 조각은 안 띄운다", () => {
    // 5번 발화를 이미 봤는데 3번 응답이 뒤늦게 도착
    const r = shouldShowChunk(chunkRank(5, false), 3, false);
    expect(r.show).toBe(false);
    expect(r.nextRank).toBe(chunkRank(5, false)); // 본 기록은 안 뒷걸음질
  });

  it("확정 자막이 뜬 뒤 늦게 온 «말하는 중» 조각이 확정본을 도로 덮지 않는다", () => {
    const seen = chunkRank(7, false); // 7번 확정 표시됨 = 7.5
    const late = shouldShowChunk(seen, 7, true); // 7번 부분이 뒤늦게 도착 = 7.0
    expect(late.show).toBe(false);
  });

  it("같은 발화의 확정본은 부분 자막을 제자리 교체한다", () => {
    const afterPartial = shouldShowChunk(0, 7, true);
    expect(afterPartial.show).toBe(true);
    const final = shouldShowChunk(afterPartial.nextRank, 7, false);
    expect(final.show).toBe(true);
  });

  it("트랙 교체로 번호가 리셋되면 막지 않는다 (조용한 자막 사망 방지)", () => {
    // 20번까지 보다가 재연결로 1번부터 다시 — 여기서 막으면 자막이 영영 안 뜬다
    const r = shouldShowChunk(chunkRank(20, false), 1, false);
    expect(r.show).toBe(true);
    expect(r.nextRank).toBe(chunkRank(1, false));
  });

  it("정상 진행(다음 발화)은 당연히 띄운다", () => {
    expect(shouldShowChunk(chunkRank(4, false), 5, true).show).toBe(true);
  });
});

describe("sortByTime — «기록 순서가 뒤죽박죽»", () => {
  it("도착 순서가 아니라 말한 시각 순으로 읽는다", () => {
    const arrived = [
      { created_at: "2026-07-27T16:12:04Z", translated_text: "두번째" },
      { created_at: "2026-07-27T16:05:31Z", translated_text: "첫번째" }, // 폴링으로 늦게 옴
      { created_at: "2026-07-27T16:12:19Z", translated_text: "세번째" },
    ];
    expect(sortByTime(arrived).map((r) => r.translated_text)).toEqual([
      "첫번째",
      "두번째",
      "세번째",
    ]);
  });

  it("원본 배열을 건드리지 않는다 (React state 직접 변형 금지)", () => {
    const rows = [{ created_at: "2026-07-27T16:12:04Z" }, { created_at: "2026-07-27T16:05:31Z" }];
    const before = rows.map((r) => r.created_at);
    sortByTime(rows);
    expect(rows.map((r) => r.created_at)).toEqual(before);
  });
});

describe("dedupeAgainstShown — «한 명이 말했는데 두 명처럼 보임»", () => {
  it("원문이 없는 줄(상대 기기 자막)도 번역문이 같으면 중복으로 거른다", () => {
    // 그날의 실제 모양: 화면엔 원문+번역 있는 줄, 서버 기록엔 같은 번역문
    const shown = [
      {
        original_text: "",
        translated_text: "비자 서류는 언제까지 필요한가요",
        created_at: "2026-07-27T16:12:04Z",
        speaker_name: "Назерке",
      } as any,
    ];
    const incoming = [
      {
        translated_text: "비자 서류는 언제까지 필요한가요",
        created_at: "2026-07-27T16:12:06Z", // 2초 뒤 폴링
        speaker_name: null,
      },
    ];
    expect(dedupeAgainstShown(shown, incoming)).toHaveLength(0);
  });

  it("시간이 멀리 떨어진 같은 말은 «다시 말한 것»이라 안 거른다", () => {
    const shown = [{ translated_text: "네", created_at: "2026-07-27T16:00:00Z" }];
    const incoming = [{ translated_text: "네", created_at: "2026-07-27T16:05:00Z" }];
    expect(dedupeAgainstShown(shown, incoming)).toHaveLength(1);
  });

  it("다른 말은 통과시킨다", () => {
    const shown = [{ translated_text: "가", created_at: "2026-07-27T16:12:04Z" }];
    const incoming = [{ translated_text: "나", created_at: "2026-07-27T16:12:05Z" }];
    expect(dedupeAgainstShown(shown, incoming)).toHaveLength(1);
  });
});

describe("isSameSpeakerRun — 연속 발화 묶기", () => {
  const at = (s: string) => `2026-07-27T16:12:${s}Z`;

  it("같은 사람이 곧바로 이어 말하면 묶는다", () => {
    expect(
      isSameSpeakerRun(
        { speaker_name: "Assel", speaker_role: "other", created_at: at("04") },
        { speaker_name: "Assel", speaker_role: "other", created_at: at("11") }
      )
    ).toBe(true);
  });

  // speaker_role 은 «그 줄을 저장한 기기» 기준이라 같은 사람의 발화도 self/other 로 갈린다:
  // 내 화면에 실시간으로 쌓인 줄은 other, 상대 기기가 저장해 폴링으로 돌아온 같은 줄은 self.
  // 예전 규칙(role 도 같아야 묶음)에선 한 사람이 두 사람처럼 쪼개져 보였다(2026-09-01).
  it("이름이 같으면 speaker_role 이 달라도 묶는다", () => {
    expect(
      isSameSpeakerRun(
        { speaker_name: "Assel", speaker_role: "other", created_at: at("04") },
        { speaker_name: "Assel", speaker_role: "self", created_at: at("11") }
      )
    ).toBe(true);
  });

  it("사람이 바뀌면 안 묶는다 (여기가 눈에 띄어야 하는 지점)", () => {
    expect(
      isSameSpeakerRun(
        { speaker_name: "Assel", speaker_role: "other", created_at: at("04") },
        { speaker_name: "Назерке", speaker_role: "other", created_at: at("11") }
      )
    ).toBe(false);
  });

  it("이름 없는 줄끼리는 묶이되, 이름 있는 줄과는 안 묶인다", () => {
    const unknown = { speaker_name: null, speaker_role: "other", created_at: at("04") };
    expect(isSameSpeakerRun(unknown, { ...unknown, created_at: at("08") })).toBe(true);
    expect(
      isSameSpeakerRun(unknown, { speaker_name: "Assel", speaker_role: "other", created_at: at("08") })
    ).toBe(false);
  });

  it("한참 뒤에 다시 말하면 이름을 다시 보여준다", () => {
    expect(
      isSameSpeakerRun(
        { speaker_name: "Assel", speaker_role: "other", created_at: "2026-07-27T16:00:00Z" },
        { speaker_name: "Assel", speaker_role: "other", created_at: "2026-07-27T16:10:00Z" }
      )
    ).toBe(false);
  });

  it("맨 첫 줄은 항상 이름을 보여준다", () => {
    expect(isSameSpeakerRun(undefined, { speaker_name: "Assel", created_at: at("04") })).toBe(false);
  });
});
