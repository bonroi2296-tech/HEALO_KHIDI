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

> ✅ `agents/live-translate/src/{router,gemini_session}.py` 의 모든 SDK 호출은
> 실제 설치 SDK(google-genai 2.x·livekit rtc)로 대조 검증됨(대상 언어=BCP-47
> translation_config, kz→kk 매핑, 자막=output_audio_transcription). 남은 건
> 실 2인 통화 라이브 동작 확인뿐.

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

**검증된 것**(코드 레벨):
- 워커 SDK 호출 전부 실제 설치 SDK로 introspection 대조(google-genai 2.x·livekit rtc) —
  connect/오디오 송수신/번역 대상언어(BCP-47, kz→kk)/자막(output_audio_transcription)/
  트랙 발행 시그니처 일치. `py_compile`·실 import·config 빌드 통과.
- 토큰 디스패치·스위치 가드: tsc·next build·check:content 통과.

**아직 검증 못 한 것**(실 통화 필요):
- 파이썬 워커 실연결(LiveKit Cloud + Gemini Live) 라이브 동작.
- 통역 **음성 라우팅**(원음 음소거 ↔ 통역 재생 전환), 지연, 정확도 — 실 2인 통화(아이폰 포함).

→ 위 "테스트" 단계에서 사람이 1회 확인.
