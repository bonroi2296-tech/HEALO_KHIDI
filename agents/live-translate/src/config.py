"""Gemini Live Translate 통역 에이전트 — 설정 상수.

출처: livekit-examples/gemini-live-translate (translator/src/config.py) 의 값을 이식.
모델 ID·샘플레이트·디바운스/그레이스 타이밍은 공식 예제 기준.
"""

import os

# ── Gemini Live Translate 모델 ──
# 실시간 말→말 통역 전용(70+ 언어). 프리뷰 모델이라 정식 전 ID/스펙이 바뀔 수 있음.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-live-translate-preview")

# 오디오 포맷 (Gemini Live API 규격)
INPUT_SAMPLE_RATE = 16000  # 16kHz mono PCM 입력
OUTPUT_SAMPLE_RATE = 24000  # 24kHz mono PCM 출력
AUDIO_CHANNELS = 1

# ── 참가자/트랙 규약 (프론트 LiveTranslateBridge.jsx 와 반드시 일치) ──
PARTICIPANT_LANG_ATTR = "lang"   # 참가자가 자기 언어를 알리는 속성 키
NATIVE_LANG = "none"             # "통역 불필요"(원음) 센티넬
TRANSLATION_TRACK_KIND = "translation"
# 통역 음성 트랙 이름: f"tx:{speaker_identity}:{target_lang}"
TRACK_NAME_PREFIX = "tx:"
# 통역 자막 텍스트 스트림 토픽
TRANSLATION_TEXT_TOPIC = "lk.translation"

# ── 라우터 동작 ──
RECONCILE_DEBOUNCE_SEC = 0.25   # 방 상태 변화 디바운스(짧은 음소거 깜빡임으로 세션 난립 방지)
SESSION_GRACE_SEC = 10.0        # 수요가 사라진 뒤 세션 유지 시간(즉시 재개 대비)

# ── Gemini 연결 복원력 ──
GEMINI_RECONNECT_BACKOFF_SEC = [0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 30.0]

# 통역 연결이 «연속으로» 이만큼 실패하면 «지금 통역이 안 되고 있다»를 방에 알린다.
#
# 왜 (2026-08-28 실측): 열쇠를 일부러 망가뜨리고 30초를 돌렸더니 재연결을 15번 시도해
#   전부 실패했는데 **화면은 「통역 켜짐」 그대로였다.** 사용자는 봇도 있고 스위치도 켜져 있으니
#   기다리기만 한다(POSTMORTEMS #100 과 같은 «조용한 실패»). 로그는 사람이 안 본다.
#   3번이면 backoff 로 3.5초쯤 지난 시점 — 일시적 끊김(1~2번)은 조용히 넘기고,
#   진짜 고장만 알린다.
GEMINI_FAIL_STREAK_TO_REPORT = 3

# 세션이 이 시간 이상 «잘 돌다가» 끊겼으면 연속 실패로 세지 않는다.
# 왜: Gemini Live 세션은 일정 시간이 지나면 스스로 닫힌다. 그걸 실패로 세면
#     긴 상담일수록 재연결 대기가 0.5초에서 30초까지 늘어나고, 세 번째부터는
#     멀쩡한데도 화면에 「통역이 안 되고 있다」 안내가 뜬다.
GEMINI_HEALTHY_RUN_SEC = 60.0

# 통역봇이 «지금 상태»를 적는 참가자 속성. 화면(LiveTranslateBridge)이 이 값을 읽어 알린다.
TRANSLATOR_STATUS_ATTR = "tx_status"
TRANSLATOR_STATUS_FAILING = "failing"   # 연결이 계속 실패 중 — 통역이 안 나온다
TRANSLATOR_STATUS_OK = "ok"             # 정상으로 돌아옴
GEMINI_MAX_FAILURES_BEFORE_LONG_BACKOFF = 5

# ── 방 수명 (토큰 발급 RoomConfiguration 과 일치) ──
MAX_PARTICIPANTS = 8
SESSION_TTL_SEC = 4 * 60 * 60
EMPTY_ROOM_TIMEOUT_SEC = 60
