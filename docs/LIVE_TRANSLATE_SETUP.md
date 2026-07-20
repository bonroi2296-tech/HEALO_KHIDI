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

---

## 마이크 없이 통역을 실검증하는 법 (2026-07-20 확립 — POSTMORTEMS #100)

**왜 필요한가**: 자동화 환경(에이전트 브라우저·CI)에는 마이크가 없어 "통역봇이 방에 들어온다"까지만 확인하고 멈추기 쉽다. 실제로 그 상태에서 **통역이 전혀 안 되는 버그(#100)를 놓쳤다.** 아래 방법이면 사람 없이도 실제 음성을 방에 흘려 통역 경로를 끝까지 태울 수 있다.

```bash
# 1) TTS 로 음성 생성 (한국어 예시) — Gemini TTS, 응답은 24kHz s16le PCM
#    모델: gemini-2.5-flash-preview-tts / responseModalities: ["AUDIO"]
#    → inlineData.data (base64) 를 디코드해 ko_speech.pcm 으로 저장

# 2) LiveKit 규격(Ogg Opus 48kHz mono)으로 변환
ffmpeg -y -f s16le -ar 24000 -ac 1 -i ko_speech.pcm \
       -c:a libopus -b:a 32k -ar 48000 -ac 1 ko_speech.ogg

# 3) 청취자 먼저 넣기 (마이크 불필요 — 언어만 알리면 통역 대상이 된다)
lk room join --project healo --identity listener-ru --attribute lang=ru \
             --auto-subscribe <room-name> &

# 4) 발화자로 음성 발행 (--exit-after-publish 로 재생 후 자동 퇴장)
lk room join --project healo --identity doctor-ko --attribute lang=ko \
             --publish ko_speech.ogg --exit-after-publish <room-name>

# 5) 판정 — 에이전트 로그에 통역쌍이 떠야 성공
lk agent logs --project healo | grep "session up"
#   기대: session up: doctor-ko -> ru
```

**핵심 판정 기준**: `session up: <발화자> -> <대상언어>` 로그가 떠야 **실제로 통역이 도는 것**이다.
봇이 방에 들어오는 것(`translation router ready`)만으로는 부족하다 — #100 이 정확히 그 함정이었다.

**참가자 속성 확인**(통역쌍이 안 만들어질 때 1순위로 볼 곳):
```bash
lk room participants get --project healo -r <room> -i <identity>
#   attributes 에 lang 이 있어야 한다. 비어 있으면 클라이언트가 못 보낸 것(#100).
```
