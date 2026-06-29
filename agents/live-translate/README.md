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

## ⚠️ 상태 — best-effort 이식본 (배포 전 검증 필수)

- `src/agent.py`, `src/config.py` = 공식 예제(livekit-examples/gemini-live-translate)
  값 그대로 이식(신뢰도 높음).
- `src/router.py`, `src/gemini_session.py` = 공식 예제의 **동작 계약**을 바탕으로 한
  best-effort 구현. 특히 `gemini_session.py` 의 **Gemini Live Translate 프리뷰 모델
  connect 설정(대상 언어 지정)** 은 상위 예제·모델 카드와 대조해 확정해야 한다
  (`_build_live_config()` 의 TODO).
- 이 워커는 이 저장소가 만들어진 환경에서 **실행·라이브 검증되지 않았다.** 배포 시
  실제 2인 통화(아이폰 포함)로 통역 음성·자막·지연을 반드시 검증할 것.
- 가장 안전한 길: 위 공식 예제 레포의 `translator/` 를 받아 대조 후, 모델 ID·언어·
  에이전트 이름(`gemini-translator`)만 우리 값으로 맞춰 쓰는 것.

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
