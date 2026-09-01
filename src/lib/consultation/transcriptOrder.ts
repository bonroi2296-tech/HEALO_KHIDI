/**
 * 자막·기록의 «순서»와 «중복» 판정 — 상담방 화면(page.jsx)에서 꺼내온 순수 규칙.
 *
 * 왜 꺼냈나: 2026-07-27 실회의에서 터진 6가지 중 넷(순서 뒤섞임·옛 자막 튀어나옴·
 *   화자 중복·기록 뒤죽박죽)이 전부 이 판정들이었는데, 정작 화면 컴포넌트 안에 박혀 있어
 *   **테스트가 한 줄도 없었다**. 실통화 없이 검증할 수 있는 유일한 층이라 분리한다.
 *   (반성문 #134 — 이 규칙들이 없어서 생긴 사고들)
 */

/** 자막 한 조각의 순위. 같은 발화면 «말하는 중»(seq) 보다 «확정»(seq+0.5) 이 뒤. */
export function chunkRank(seq: number, interim?: boolean): number {
  return seq + (interim ? 0 : 0.5);
}

/**
 * 이 조각을 화면에 띄울까? (늦게 도착한 옛 조각 거르기)
 *
 * · 더 새 조각을 이미 봤으면 안 띄운다 — «이전 대화 자막이 뜬금없이» 뜨던 것.
 * · 단, 큰 폭 역행(> 3)은 «낡음»이 아니라 트랙 교체로 카운터가 리셋된 것이므로 받아준다.
 *   여기서 막아버리면 재연결 뒤 자막이 영영 안 뜬다(= 조용한 자막 사망 재발).
 */
export function shouldShowChunk(
  seenRank: number,
  seq: number,
  interim?: boolean
): { show: boolean; nextRank: number } {
  const rank = chunkRank(seq, interim);
  if (rank < seenRank - 3) return { show: true, nextRank: rank }; // 리셋으로 간주
  if (rank < seenRank) return { show: false, nextRank: seenRank }; // 늦게 온 옛 조각
  return { show: true, nextRank: rank };
}

type Row = {
  translated_text?: string | null;
  created_at?: string | null;
  speaker_role?: string | null;
  speaker_name?: string | null;
};

/** 기록 패널은 «도착 순»이 아니라 «말한 시각 순»으로 읽는다(서버 폴링이 4초 늦게 온다). */
export function sortByTime<T extends Row>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
}

/**
 * 서버에서 폴링해 온 줄 중 «이미 화면에 있는 발화»를 걸러낸다.
 *
 * 예전엔 원문+번역문을 **둘 다** 비교해서, 원문이 없는 경로(상대 기기가 보낸 자막은
 * 번역문만 받는다)는 매번 통과했다 → 한 사람만 말해도 「이름 있는 줄 + 화자 미상 줄」이
 * 짝으로 쌓였다. 번역문 일치만으로 같은 발화로 본다.
 */
export function dedupeAgainstShown<T extends Row>(
  shown: Row[],
  incoming: T[],
  windowMs = 60000
): T[] {
  return incoming.filter(
    (row) =>
      !shown.some(
        (p) =>
          p.translated_text &&
          p.translated_text === row.translated_text &&
          Math.abs(
            new Date(p.created_at || 0).getTime() - new Date(row.created_at || 0).getTime()
          ) < windowMs
      )
  );
}

/**
 * 앞 줄과 같은 사람이 이어 말한 것인가 — 맞으면 이름줄을 생략해 «화자가 바뀌는 지점»만
 * 눈에 띄게 한다. 시간이 많이 벌어지면(기본 2분) 다시 이름을 보여준다.
 */
export function isSameSpeakerRun(prev: Row | undefined, cur: Row, gapMs = 120000): boolean {
  if (!prev) return false;
  // 이름 비교는 대소문자·공백 차이를 무시한다 — 끊겨서 다시 들어온 사람이 이름을 다시 치면
  // «Эльдар» → «эльдар» 처럼 한 글자만 달라지는데, 그걸로 묶기가 끊기면 같은 사람이
  // 두 사람처럼 보인다(2026-07-29 실측). 색 배정도 같은 규칙(speakerColor.speakerKey).
  const norm = (v?: string | null) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
  const pn = norm(prev.speaker_name);
  const cn = norm(cur.speaker_name);
  // 이름을 아는 줄끼리는 «이름»만으로 판정한다. speaker_role 은 «그 줄을 저장한 기기» 기준이라
  // 같은 사람의 발화도 어느 줄이냐에 따라 self/other 로 갈린다(내 화면에 실시간으로 쌓인 줄 vs
  // 상대 기기가 저장해 폴링으로 돌아온 줄). role 까지 같기를 요구하면 한 사람이 두 사람처럼
  // 쪼개져 보인다(2026-09-01, speaker_role 을 실제로 저장하기 시작하면서 드러난 부류).
  if (pn || cn) {
    if (pn !== cn) return false;
  } else if ((prev.speaker_role || "") !== (cur.speaker_role || "")) {
    return false;
  }
  return (
    new Date(cur.created_at || 0).getTime() - new Date(prev.created_at || 0).getTime() < gapMs
  );
}
