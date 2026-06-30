# HEALO 실시간 통역 에이전트 (Gemini 3.5 Live Translate)

원격협진방에서 환자↔의사 말을 **실시간 양방향 통역**(음성+자막)하는 LiveKit Agents
워커. 방마다 워커 1개가 붙어, 참가자가 알린 언어(`lang` 속성)를 보고 필요한
`(화자 → 대상언어)` 통역 세션만 켠다.

```
[환자/의사 브라우저] ──→ LiveKit 상담방 ←──→ [이 워커] ←──→ Gemini Live Translate
                            tx:<화자>:<언어> 오디오 + lk.translation 자막
```

메인 앱 연동 지점:
- 토큰 발급(`app/api/khidi/consultation/token`·`.../guest-join`)이 `LIVE_TRANSLATE_ENABLED=true`
  일 때 이 에이전트(`gemini-translator`)를 방에 자동 디스패치.
- 프론트(`src/lib/consultation/LiveTranslateBridge.jsx`)가 내 언어 통역 음성·자막만 구독.

---

## 상태 — SDK 대조 검증 완료 / 라이브 통화는 미검증

- `src/agent.py`, `src/config.py` = 공식 예제(livekit-examples/gemini-live-translate)
  값 그대로 이식.
- `src/router.py`, `src/gemini_session.py` = 공식 예제 동작 계약 기반 구현. **실제
  설치된 SDK(google-genai 2.x, livekit rtc)로 모든 API 호출을 introspection 대조
  검증함**:
  - `client.aio.live.connect(model, config)` / `send_realtime_input(audio=Blob)` /
    `session.receive()` — 시그니처 일치 확인.
  - 대상 언어 = `translation_config.target_language_code`(BCP-47) 전용 필드 사용
    (초기 system_instruction 꼼수에서 교체). **`kz`→`kk` 매핑**(카자흐어 BCP-47,
    안 하면 조용히 실패) 포함.
  - 자막 = `output_audio_transcription` 켜고 `server_content.output_transcription`
    에서 수신.
  - livekit rtc: `AudioSource`/`AudioStream`/`AudioFrame`/`publish_track`/`send_text`
    /`set_attributes` 시그니처 일치 확인.
- ❗ **남은 미검증 = 실제 2인 통화(아이폰 포함) 라이브 동작**: 통역 음성 라우팅
  (원음 음소거↔통역 재생), 지연, 정확도. 코드/계약은 맞지만 LiveKit Cloud + Gemini
  Live 실연결은 배포 후 1회 사람 검증이 필요하다.

---

## 로컬 실행

```bash
cd agents/live-translate
uv sync                      # 의존성 설치 (https://docs.astral.sh/uv/)
cp .env.example .env.local   # 값 채우기 (GEMINI_API_KEY 는 테스트=무료 키 가능)
uv run python src/agent.py dev
```

## 배포 (LiveKit Cloud Agents)

```bash
cd agents/live-translate
lk agent create --secrets-file .env.local .   # 최초 1회
lk agent deploy                               # 이후 업데이트
```

에이전트 이름은 `gemini-translator` (코드의 `@server.rtc_session(agent_name=...)` 및
메인 앱 `src/lib/consultation/liveTranslate.js` 의 `TRANSLATOR_AGENT_NAME` 과 일치).

---

전체 셋업·오픈 전 체크리스트: `docs/LIVE_TRANSLATE_SETUP.md`
