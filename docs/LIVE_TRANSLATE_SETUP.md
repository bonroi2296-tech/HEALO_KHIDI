# 실시간 통역(Gemini Live Translate) — 셋업 & 오픈 전 체크리스트

> 원격협진방에 **실시간 양방향 음성 통역 + 자막**(Gemini 3.5 Live Translate, 70+ 언어)
> 을 붙이는 작업. 코드는 전부 깔려 있고 **스위치(env)로 꺼둔 상태**라, 지금은 기존
> 상담방과 100% 동일하게 동작한다. 오픈 전에 아래 3가지만 켜면 통역이 활성화된다.

---

## 지금 상태 (이 PR로 들어간 것)

전부 **스위치 뒤**라 기본 동작 변화 0:

- **통역 에이전트(파이썬 워커)**: `agents/live-translate/` — 방마다 붙어 통역 음성·자막 생성.
- **토큰 발급 자동 디스패치**: `app/api/khidi/consultation/token`·`.../guest-join` —
  `LIVE_TRANSLATE_ENABLED=true` 일 때만 통역 에이전트(`gemini-translator`)를 방에 호출.
- **상담방 프론트 브릿지**: `src/lib/consultation/LiveTranslateBridge.jsx` —
  `NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED=true` 일 때만 내 언어 통역 음성·자막 구독.
- **설정 단일 SoR**: `src/lib/consultation/liveTranslate.js`.

> 스위치 둘 다 꺼져 있으면(기본값): 디스패치 안 함 + 프론트 무동작 = 지금과 똑같음.

---

## 비용 (요약)

- 통역 모델: 음성 1분 ≈ **$0.037**. 상담 1건(30분, 양방향) ≈ **$1~2**.
- 연간 목표 볼륨(사후관리 120건 수준) 다 켜도 **연 20~30만원 안짝.**
- 진짜 비용은 모델보다 **파이썬 워커 상시 가동**(LiveKit Cloud Agents) — 켜는 방식에서 확정.
- **무료/유료 갈림**: 무료 등급 키는 구글이 음성을 학습에 쓸 수 있음 → **실환자 금지.**
  테스트(내 목소리·가짜 대본)는 무료로 0원 가능.

---

## 테스트 (무료, 실환자 X)

내 목소리/가짜 대본으로 품질·지연만 확인. 무료 GEMINI_API_KEY 로 0원.

1. 통역 에이전트 로컬 실행:
   ```bash
   cd agents/live-translate
   uv sync && cp .env.example .env.local   # GEMINI_API_KEY=무료키
   uv run python src/agent.py dev
   ```
2. 프리뷰/로컬 앱에 스위치 켜기: `LIVE_TRANSLATE_ENABLED=true`,
   `NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED=true`.
3. 상담방에 2개 창(서로 다른 언어)으로 들어가 말해보고 통역 음성·자막 확인.

> ⚠️ `agents/live-translate/src/{router,gemini_session}.py` 는 best-effort 이식본.
> 특히 `gemini_session.py` 의 `_build_live_config()`(대상 언어 지정)를 공식 예제
> (livekit-examples/gemini-live-translate)·모델 카드와 대조해 확정할 것.

---

## 오픈 전 켜기 (유료 전환) — 3단계

1. **통역 에이전트 배포 + 유료 키**
   ```bash
   cd agents/live-translate
   lk agent create --secrets-file .env.local .   # 최초 1회 (GEMINI_API_KEY=유료키)
   lk agent deploy
   ```
   - Google AI Studio / Cloud 콘솔에서 **결제 연결(유료 등급)** + spend cap 설정.
2. **스위치 ON** (Vercel Production env):
   - `LIVE_TRANSLATE_ENABLED=true`
   - `NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED=true`
   - 재배포.
3. **실 2인 통화 검증**(필수, 아이폰 포함): 통역 음성이 원음을 안 덮고 잘 바뀌는지,
   자막 지연·정확도, 카자흐어↔러시아어 구분.

---

## 검증 안 된 것 (정직)

이 환경에선 실행·라이브 검증 불가:

- 파이썬 워커 실제 동작(LiveKit Cloud + Gemini Live 연결).
- 통역 **음성 라우팅**(원음 음소거 ↔ 통역 재생 전환) — 실 2인 통화 필요.
- `gemini-3.5-live-translate-preview` connect 설정의 대상 언어 지정 방식.

자막(텍스트 스트림) 경로와 토큰 디스패치/스위치 가드는 코드 레벨로 검증(빌드 통과).
음성·워커는 위 "테스트" 단계에서 사람이 1회 확인 필요.
