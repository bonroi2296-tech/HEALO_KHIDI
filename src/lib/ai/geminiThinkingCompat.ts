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
 * 예고된 재발(2026-07-21 구글 공지 / 2026-07-25 확인): 샘플링 파라미터
 * `temperature`·`top_p`·`top_k` 가 폐기됐다. 현재는 **조용히 무시**되지만 구글 문서가
 * "future model generations 에서는 HTTP 400" 을 명시 → 별칭이 그 세대로 넘어가는 순간
 * 7-23 과 **완전히 같은 방식**으로 전면 불능이 된다. 그래서 같은 사다리에 칸을 끼웠다.
 *   출처: https://ai.google.dev/gemini-api/docs/latest-model#sampling-parameter-deprecation
 *
 * 별칭 최신 유지는 PO 결정(2026-06-12, 모델 임의 고정 금지)이므로 모델을 고정하지 않는다.
 * 대신 파라미터를 한 단계씩 낮춰 재시도하는 사다리로 어떤 세대가 와도 살아남는다.
 * 칸(mitigation)은 4종이고, **적용 가능한 것만** 골라 «해가 적은 순서» 로 조합한다:
 *   - strip        : temperature/topP/topK 제거 (비용 영향 0 — 그래서 가장 먼저)
 *   - minimal      : thinkingLevel:"minimal" (신세대 체계, 생각 최소화로 비용 억제)
 *   - low          : thinkingLevel:"low" (minimal 을 거절하는 세대의 최저 유효값 — 2026-08-14 추가)
 *   - dropThinking : thinkingConfig 제거 (모델 기본값 — 비용 늘지만 동작 우선)
 *   - dropGoogle   : google providerOptions 통째 제거 (safetySettings 등까지 방어, SDK 전용)
 *
 * ⚠️ 사다리 순서 설계 근거(중요 — 함부로 바꾸지 마라):
 *  ① strip 을 thinking 칸보다 **앞**에 둔다: 무시되는 파라미터를 떼는 건 비용·품질 손실이
 *     0 인데, thinking 칸은 강등될수록 생각 토큰이 늘어 **돈이 든다**. 새 세대가 샘플링만
 *     거절하는 경우(=지금 예고된 상황) 첫 강등에서 끝나므로 thinking 설정이 보존된다.
 *  ② memo 는 «성공한 칸» 에만 커밋한다. 7-23 형(thinking 거절) 상황에서 strip 칸은
 *     그대로 실패하므로 memo 에 남지 않는다 → **온도가 아직 유효한 세대에서 온도를
 *     엉뚱하게 떼어버리는 일이 없다**(번역 충실도 회귀 방지).
 *  ③ 두 가지가 동시에 거절될 수 있으므로 조합 칸(minimal+strip 등)까지 열거한다.
 *
 * memo 는 «칸 번호» 가 아니라 «적용한 mitigation 집합의 키» 다. 호출부마다 파라미터 모양이
 * 달라(어떤 곳은 thinkingConfig 없고 어떤 곳은 temperature 없음) 사다리 길이가 다르기
 * 때문에, 번호로 기억하면 A 호출부의 3번이 B 호출부의 3번과 다른 뜻이 된다.
 * 강등 발생 시 console.error 로 크게 남긴다(로그 = 세대 교체 감지 신호).
 */

/**
 * 실서비스 호출부 8곳이 공유하는 «생각 수준» 기본값 — 한 곳에서만 바꾼다.
 *
 * 왜 "minimal" 이 아니라 "low" 인가 (2026-09-06 실서비스 오류 로그 실측):
 *   별칭이 gemini-3.7+ 세대로 넘어간 뒤 "minimal" 은 **항상 400** 이다(2026-08-14 실측표, KNOWN_ISSUES).
 *   사다리가 받아주긴 하지만 memo 는 «서버리스 인스턴스 수명» 동안만 살아서, 인스턴스가 새로 뜰 때마다
 *   400 왕복을 한 번 버리고 답을 시작했다 — 공개 챗 21일 212건 중 23건(11%)이 그 왕복을 냈고
 *   (첫 글자 지연 + 오류 로그 23건), 첨부 번역·케이스 브리프 REST 경로도 23건. 지금 세대에서 실제로
 *   쓰이는 값이 "low" 이니 기본값을 거기에 두면 첫 요청부터 200 이다.
 *   "minimal" 을 받는 옛 세대가 돌아오면 그때는 이 상수만 되돌린다(사다리는 그대로 산다).
 */
export const DEFAULT_THINKING_LEVEL = "low" as const;

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

/** 폐기된 샘플링 파라미터 이름 — SDK(camelCase)·REST(camelCase) 공통. */
const SAMPLING_KEYS = ["temperature", "topP", "topK", "top_p", "top_k"] as const;

/** 이 객체에 폐기 대상 샘플링 파라미터가 하나라도 있나. */
function hasSampling(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  return SAMPLING_KEYS.some((k) => obj[k] !== undefined);
}

/** 샘플링 파라미터만 뺀 얕은 복사. 뺄 게 없으면 **같은 객체**를 그대로 돌려준다. */
function withoutSampling<T extends Params>(obj: T): T {
  if (!hasSampling(obj)) return obj;
  const next: Params = { ...obj };
  for (const k of SAMPLING_KEYS) delete next[k];
  return next as T;
}

type Mitigation = "strip" | "minimal" | "low" | "dropThinking" | "dropGoogle";

/** 조합 키 — memo 비교용 안정 문자열. 빈 집합(원본)은 "none". */
function keyOf(set: readonly Mitigation[]): string {
  return set.length === 0 ? "none" : set.join("+");
}

/**
 * 이 파라미터 모양에 **실제로 적용 가능한** 칸만 골라 해가 적은 순서로 나열한다.
 * (적용 불가한 칸을 남기면 아무것도 안 바뀐 요청을 또 보내 왕복만 버린다.)
 */
function buildLadder(opts: {
  sampling: boolean;
  thinking: boolean;
  google: boolean;
  alreadyMinimal?: boolean;
  alreadyLow?: boolean;
}): Mitigation[][] {
  const { sampling, thinking, google } = opts;
  const { alreadyMinimal, alreadyLow } = opts;
  const ladder: Mitigation[][] = [[]]; // 0번은 항상 «원본 그대로»
  if (sampling) ladder.push(["strip"]);
  if (thinking) {
    // 원본이 이미 thinkingLevel:"minimal" 이면 minimal 칸은 «같은 요청 재전송» 이라 무의미.
    // (2026-07-27 기본값을 minimal 로 바꾼 뒤 생긴 상황 — 실패 경로에서 헛왕복 1회 절약.)
    // 원본이 이미 "low" 면 minimal 칸도 뺀다 — low 를 거절하는 세대가 그보다 낮은 minimal 을
    // 받을 리 없다(같은 enum 세대). 다음 유효한 칸은 «생각 제어 없음»이다. (2026-09-06)
    if (!alreadyMinimal && !alreadyLow) ladder.push(["minimal"]);
    if (sampling && !alreadyMinimal && !alreadyLow) ladder.push(["minimal", "strip"]);
    // low 는 dropThinking 「앞」에 둔다 — 2026-08-14 실측: gemini-3.7-flash 는 minimal 을
    // 400 으로 거절하고 "off" 라는 값이 없다. 그래서 minimal 이 막히면 곧장 «생각 제어 없음»
    // 으로 떨어졌다. low 는 그 세대에서 유효한 최저값이라 한 칸을 더 버틴다.
    // (같은 질문 실측 — 설정없음 생각 631 토큰 / low 593 토큰 / thinkingBudget:0 은 조용히 무시돼 874)
    if (!alreadyLow) ladder.push(["low"]);
    if (sampling && !alreadyLow) ladder.push(["low", "strip"]);
    ladder.push(["dropThinking"]);
    if (sampling) ladder.push(["dropThinking", "strip"]);
  }
  if (google) {
    ladder.push(["dropGoogle"]);
    if (sampling) ladder.push(["dropGoogle", "strip"]);
  }
  return ladder;
}

// ── SDK(ai / @ai-sdk-google) 경로 ──────────────────────────────────────────
// 샘플링 파라미터는 generateText 파라미터 **최상위**(temperature: 0.1)에 있고,
// thinking 설정은 providerOptions.google.thinkingConfig 에 있다.

function applySdk(params: Params, set: readonly Mitigation[]): Params {
  let next: Params = params;

  if (set.includes("dropGoogle")) {
    if (next?.providerOptions?.google) {
      const providerOptions = { ...next.providerOptions };
      delete providerOptions.google;
      next = { ...next, providerOptions };
    }
  } else if (set.includes("minimal") || set.includes("low") || set.includes("dropThinking")) {
    const g = next?.providerOptions?.google;
    if (g && typeof g === "object" && g.thinkingConfig) {
      const google = { ...g };
      if (set.includes("minimal")) google.thinkingConfig = { thinkingLevel: "minimal" };
      else if (set.includes("low")) google.thinkingConfig = { thinkingLevel: "low" };
      else delete google.thinkingConfig;
      next = { ...next, providerOptions: { ...next.providerOptions, google } };
    }
  }

  if (set.includes("strip")) next = withoutSampling(next);
  return next;
}

// 서버리스 인스턴스 수명 동안 유지되는 "현재 작동 칸"(mitigation 집합 키).
let sdkMemoKey = "none";
let restMemoKey = "none";

/** 테스트용 리셋. */
export function _resetThinkingCompat() {
  sdkMemoKey = "none";
  restMemoKey = "none";
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
  const ladder = buildLadder({
    sampling: hasSampling(params),
    thinking: !!params?.providerOptions?.google?.thinkingConfig,
    google: !!params?.providerOptions?.google,
    alreadyMinimal:
      params?.providerOptions?.google?.thinkingConfig?.thinkingLevel === "minimal",
    alreadyLow: params?.providerOptions?.google?.thinkingConfig?.thinkingLevel === "low",
  });

  // memo 된 칸이 이 모양에도 있으면 거기서 출발(실패 왕복 생략). 없으면 처음부터.
  const start = Math.max(
    0,
    ladder.findIndex((s) => keyOf(s) === sdkMemoKey)
  );

  let lastErr: any = null;
  for (let i = start; i < ladder.length; i++) {
    const set = ladder[i];
    try {
      const out = await fn(applySdk(params, set));
      const key = keyOf(set);
      if (key !== sdkMemoKey) {
        console.error(
          `[geminiCompat] 파라미터 사다리 강등 "${sdkMemoKey}"→"${key}" 로 복구 — ` +
            `gemini-flash-latest 별칭 세대 교체 감지. 해당 파라미터 정리 필요.`
        );
        sdkMemoKey = key;
      }
      return out;
    } catch (e: any) {
      if (!isParamRejection(e)) throw e;
      lastErr = e;
      console.warn(
        `[geminiCompat] 칸 "${keyOf(set)}" 거절: ${String(e?.message || e).slice(0, 100)}`
      );
    }
  }
  throw lastErr;
}

// ── REST 직호출(triage·caseBrief·translateDoc 등) 용 ────────────────────────
// thinking·샘플링 모두 body.generationConfig 안에 있다.

function applyRest(body: any, set: readonly Mitigation[]): any {
  const gc = body?.generationConfig;
  if (!gc || typeof gc !== "object") return body;
  let generationConfig: Params = gc;

  if (set.includes("minimal") || set.includes("low") || set.includes("dropThinking")) {
    if (generationConfig.thinkingConfig) {
      generationConfig = { ...generationConfig };
      if (set.includes("minimal")) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
      else if (set.includes("low")) generationConfig.thinkingConfig = { thinkingLevel: "low" };
      else delete generationConfig.thinkingConfig;
    }
  }
  if (set.includes("strip")) generationConfig = withoutSampling(generationConfig);

  return generationConfig === gc ? body : { ...body, generationConfig };
}

/**
 * Gemini REST 직호출용 fetch 래퍼 — 400(파라미터 거절)이면 설정을 강등해 재시도.
 * 400 이외의 실패 응답은 그대로 반환(호출부의 res.ok 처리 유지).
 *
 * `init` 으로 signal 등 추가 fetch 옵션을 넘길 수 있다(자동화·cron 경로의
 * `AbortSignal.timeout` 보존용 — 안 받으면 감싸는 순간 타임아웃이 사라진다).
 * ⚠️ signal 은 사다리 재시도 전체에 공유된다 = 타임아웃이 «총 예산» 으로 동작한다.
 *    강등 왕복마다 시계를 리셋해 무한정 늘어나는 것보다 안전하다는 판단.
 */
export async function fetchGeminiWithCompat(
  url: string,
  body: any,
  init?: Omit<RequestInit, "method" | "body">
): Promise<Response> {
  const ladder = buildLadder({
    sampling: hasSampling(body?.generationConfig),
    thinking: !!body?.generationConfig?.thinkingConfig,
    google: false, // REST 에는 providerOptions 개념이 없다
    alreadyMinimal: body?.generationConfig?.thinkingConfig?.thinkingLevel === "minimal",
    alreadyLow: body?.generationConfig?.thinkingConfig?.thinkingLevel === "low",
  });
  const start = Math.max(
    0,
    ladder.findIndex((s) => keyOf(s) === restMemoKey)
  );

  let res: Response | null = null;
  for (let i = start; i < ladder.length; i++) {
    const set = ladder[i];
    res = await fetch(url, {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers as any) },
      body: JSON.stringify(applyRest(body, set)),
    });
    if (res.status !== 400) {
      // memo 커밋은 "성공 증거(2xx)"가 있을 때만 — 강등 도중 만난 5xx·429 로 칸을 고착하면
      // 이후 모든 REST 호출이 근거 없이 강등된 설정으로 나간다(독립 리뷰 F2).
      const key = keyOf(set);
      if (res.ok && key !== restMemoKey) {
        console.error(
          `[geminiCompat] REST 사다리 강등 "${restMemoKey}"→"${key}" 로 복구 — 별칭 세대 교체 감지.`
        );
        restMemoKey = key;
      }
      return res;
    }
    console.warn(`[geminiCompat] REST 칸 "${keyOf(set)}" → 400, 다음 칸으로`);
  }
  return res as Response;
}
