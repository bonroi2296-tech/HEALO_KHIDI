/**
 * healwith: Gemini 별칭 세대 교체 생존 사다리
 * (⚠️ server-only 미부착 이유: service_role·비밀키 접근이 없는 순수 로직 + fetch 래퍼라
 *  vitest 단위테스트로 사다리 동작을 잠그기 위함 — contactGate 분리와 같은 취지)
 *
 * 실사고(2026-07-23): 구글이 새 Flash 를 출시하며 `gemini-flash-latest` 별칭이 새 세대
 * 모델로 자동 교체 → 구세대 thinking 파라미터(`thinkingBudget: 0`)를 400 INVALID_ARGUMENT
 * 로 거절해 **모든 AI 응답이 전면 불능**(웹 챗·텔레그램·판사 동일). 전날 회귀채점 44/44
 * 정상 → 당일 전면 실패로 확인된 순수 외부 변화였다.
 *
 * 별칭 최신 유지는 PO 결정(2026-06-12, 모델 임의 고정 금지)이므로 모델을 고정하지 않는다.
 * 대신 파라미터를 한 단계씩 낮춰 재시도하는 사다리로 어떤 세대가 와도 살아남는다:
 *   0. 원본 그대로 (thinkingBudget:0 — 구세대용, 비용 최소)
 *   1. thinkingLevel:"minimal" (신세대 체계 — 생각 최소화로 비용 억제)
 *   2. thinkingConfig 제거 (모델 기본값 — 비용은 늘지만 동작 우선)
 *   3. google providerOptions 통째 제거 (safetySettings 등 다른 필드 거절까지 방어)
 * 성공한 칸은 인스턴스 수명 동안 기억(memo)해 이후 요청은 실패 왕복 없이 바로 그 칸으로.
 * 강등 발생 시 console.error 로 크게 남긴다(로그 = 세대 교체 감지 신호).
 */

// 파라미터 거절(영구 오류) 판별 — 재시도해도 같으므로 "설정을 바꿔" 재시도해야 하는 부류.
export function isParamRejection(err: any): boolean {
  const msg = String(err?.message || err || "");
  const code = (err?.statusCode ?? err?.status ?? "").toString();
  return (
    code === "400" ||
    /invalid argument|INVALID_ARGUMENT|is not supported|unknown field|unrecognized/i.test(msg)
  );
}

type Params = Record<string, any>;

function cloneWithGoogle(params: Params): { next: Params; google: Record<string, any> | null } {
  const g = params?.providerOptions?.google;
  if (!g || typeof g !== "object") return { next: params, google: null };
  const google = { ...g };
  return {
    next: { ...params, providerOptions: { ...params.providerOptions, google } },
    google,
  };
}

// SDK(ai/@ai-sdk-google) 파라미터용 사다리. 바꿀 게 없으면 이전 칸과 동일 객체를 반환한다
// (호출부가 중복 시도를 건너뛸 수 있게).
const SDK_LADDER: Array<(p: Params) => Params> = [
  (p) => p,
  (p) => {
    const { next, google } = cloneWithGoogle(p);
    if (!google || !google.thinkingConfig) return p;
    google.thinkingConfig = { thinkingLevel: "minimal" };
    return next;
  },
  (p) => {
    const { next, google } = cloneWithGoogle(p);
    if (!google || !google.thinkingConfig) return p;
    delete google.thinkingConfig;
    return next;
  },
  (p) => {
    if (!p?.providerOptions?.google) return p;
    const providerOptions = { ...p.providerOptions };
    delete providerOptions.google;
    return { ...p, providerOptions };
  },
];

// 서버리스 인스턴스 수명 동안 유지되는 "현재 작동 칸".
let sdkMemoRung = 0;

/** 테스트용 리셋. */
export function _resetThinkingCompat() {
  sdkMemoRung = 0;
  restMemoRung = 0;
}

/**
 * SDK 호출(generateText/streamText 소비 등)을 사다리로 감싼다.
 * fn 은 최종 파라미터를 받아 호출을 수행한다. 파라미터 거절이면 다음 칸으로 강등,
 * 그 외 오류는 그대로 던진다(일시 오류 재시도는 호출부 책임 유지).
 */
export async function callGeminiWithCompat<T>(
  fn: (params: Params) => Promise<T>,
  params: Params
): Promise<T> {
  let lastErr: any = null;
  let prevApplied: Params | null = null;
  for (let rung = sdkMemoRung; rung < SDK_LADDER.length; rung++) {
    const applied = SDK_LADDER[rung](params);
    // 이 칸이 이전 칸과 동일(바꿀 게 없음)이면 헛시도 생략
    if (prevApplied !== null && applied === prevApplied) continue;
    prevApplied = applied;
    try {
      const out = await fn(applied);
      if (rung !== sdkMemoRung) {
        console.error(
          `[geminiCompat] 파라미터 사다리 강등 ${sdkMemoRung}→${rung} 로 복구 — ` +
            `gemini-flash-latest 별칭 세대 교체 감지. thinking 설정 정리 필요.`
        );
        sdkMemoRung = rung;
      }
      return out;
    } catch (e: any) {
      if (!isParamRejection(e)) throw e;
      lastErr = e;
      console.warn(
        `[geminiCompat] rung ${rung} 거절: ${String(e?.message || e).slice(0, 100)}`
      );
    }
  }
  throw lastErr;
}

// ── REST 직호출(triage·caseBrief·translateDoc) 용 ──────────────────────────
// body.generationConfig.thinkingConfig 에 같은 사다리를 적용한다.

let restMemoRung = 0;

function applyRestRung(body: any, rung: number): any {
  const gc = body?.generationConfig;
  if (!gc || typeof gc !== "object" || !gc.thinkingConfig) return body;
  if (rung === 0) return body;
  const generationConfig = { ...gc };
  if (rung === 1) {
    generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  } else {
    delete generationConfig.thinkingConfig;
  }
  return { ...body, generationConfig };
}

const REST_MAX_RUNG = 2;

/**
 * Gemini REST 직호출용 fetch 래퍼 — 400(파라미터 거절)이면 thinking 설정을 강등해 재시도.
 * 400 이외의 실패 응답은 그대로 반환(호출부의 res.ok 처리 유지).
 */
export async function fetchGeminiWithCompat(url: string, body: any): Promise<Response> {
  let res: Response | null = null;
  for (let rung = restMemoRung; rung <= REST_MAX_RUNG; rung++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(applyRestRung(body, rung)),
    });
    if (res.status !== 400) {
      // memo 커밋은 "성공 증거(2xx)"가 있을 때만 — 강등 도중 만난 5xx·429 로 칸을 고착하면
      // 이후 모든 REST 호출이 근거 없이 강등된 설정으로 나간다(독립 리뷰 F2).
      if (res.ok && rung !== restMemoRung) {
        console.error(
          `[geminiCompat] REST 사다리 강등 ${restMemoRung}→${rung} 로 복구 — 별칭 세대 교체 감지.`
        );
        restMemoRung = rung;
      }
      return res;
    }
    console.warn(`[geminiCompat] REST rung ${rung} → 400, 다음 칸으로`);
  }
  return res as Response;
}
