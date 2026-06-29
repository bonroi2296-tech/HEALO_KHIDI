"""GeminiSession — 한 (화자 → 대상언어) 통역 스트림 하나를 담당.

하는 일:
  1. 화자의 마이크 오디오를 16kHz PCM 으로 받아 Gemini Live Translate 에 흘려보냄
  2. Gemini 가 돌려주는 통역 음성(24kHz)을 LiveKit 트랙 `tx:<speaker>:<lang>` 으로 발행
  3. (가능하면) 통역 자막을 텍스트 스트림 `lk.translation` 으로 발행

⚠️ 정직(중요): 이 파일은 best-effort 이식본이다. 특히 **Gemini Live Translate
   프리뷰 모델의 정확한 connect 설정(대상 언어 지정 방식)** 은 상위 공식 예제
   (livekit-examples/gemini-live-translate) 및 모델 카드와 대조해 확정해야 한다.
   아래 `_build_live_config()` 의 TODO 를 반드시 검증할 것. 배포 전 실 2인 통화 검증 필수.
"""

from __future__ import annotations

import asyncio
import logging

from livekit import rtc

from config import (
    GEMINI_MODEL,
    INPUT_SAMPLE_RATE,
    OUTPUT_SAMPLE_RATE,
    AUDIO_CHANNELS,
    TRACK_NAME_PREFIX,
    TRANSLATION_TEXT_TOPIC,
    GEMINI_RECONNECT_BACKOFF_SEC,
)

logger = logging.getLogger("translator.session")

try:
    from google import genai
    from google.genai import types as genai_types
except Exception:  # pragma: no cover - 런타임에 의존성 없을 때 명확한 에러
    genai = None
    genai_types = None


class GeminiSession:
    def __init__(
        self,
        *,
        room: rtc.Room,
        speaker: rtc.RemoteParticipant,
        target_lang: str,
        gemini_api_key: str,
    ) -> None:
        self._room = room
        self._speaker = speaker
        self._target_lang = target_lang
        self._api_key = gemini_api_key

        self._track_name = f"{TRACK_NAME_PREFIX}{speaker.identity}:{target_lang}"
        self._closed = False
        self._tasks: list[asyncio.Task] = []

        self._audio_source: rtc.AudioSource | None = None
        self._published: rtc.LocalTrackPublication | None = None

    # ── 수명주기 ──
    async def start(self) -> None:
        if genai is None:
            raise RuntimeError(
                "google-genai 가 설치되지 않았습니다. pyproject.toml 의 의존성을 확인하세요."
            )

        # 통역 음성을 내보낼 LiveKit 오디오 트랙 발행
        self._audio_source = rtc.AudioSource(OUTPUT_SAMPLE_RATE, AUDIO_CHANNELS)
        track = rtc.LocalAudioTrack.create_audio_track(
            self._track_name, self._audio_source
        )
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        self._published = await self._room.local_participant.publish_track(
            track, options
        )

        self._tasks.append(asyncio.create_task(self._run()))

    async def aclose(self) -> None:
        self._closed = True
        for t in self._tasks:
            t.cancel()
        if self._published is not None:
            try:
                await self._room.local_participant.unpublish_track(
                    self._published.sid
                )
            except Exception:
                pass
        self._tasks.clear()

    # ── Gemini Live 설정 ──
    def _build_live_config(self):
        # TODO(검증): Live Translate 프리뷰 모델의 대상 언어 지정 방식 확인.
        # 후보 1) system_instruction 으로 "Translate everything you hear into <lang>."
        # 후보 2) 전용 translate 설정 필드(모델 카드 참조).
        # 아래는 후보 1(가장 호환성 높음) 기준. 상위 예제와 대조해 교체할 것.
        lang = self._target_lang
        return genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=genai_types.Content(
                parts=[
                    genai_types.Part(
                        text=(
                            "You are a simultaneous interpreter. Translate the "
                            f"incoming speech into language code '{lang}'. Output "
                            "only the spoken translation, naturally and continuously. "
                            "Do not add commentary."
                        )
                    )
                ]
            ),
        )

    # ── 메인 루프: 화자 오디오 → Gemini → 통역 트랙/자막 ──
    async def _run(self) -> None:
        backoff_idx = 0
        while not self._closed:
            try:
                await self._run_once()
                backoff_idx = 0
            except asyncio.CancelledError:
                return
            except Exception:
                logger.exception("gemini session error (%s)", self._track_name)
                delay = GEMINI_RECONNECT_BACKOFF_SEC[
                    min(backoff_idx, len(GEMINI_RECONNECT_BACKOFF_SEC) - 1)
                ]
                backoff_idx += 1
                await asyncio.sleep(delay)

    async def _run_once(self) -> None:
        client = genai.Client(
            api_key=self._api_key,
            http_options={"api_version": "v1alpha"},
        )
        config = self._build_live_config()

        async with client.aio.live.connect(
            model=GEMINI_MODEL, config=config
        ) as session:
            send_task = asyncio.create_task(self._pump_input(session))
            recv_task = asyncio.create_task(self._pump_output(session))
            try:
                await asyncio.gather(send_task, recv_task)
            finally:
                send_task.cancel()
                recv_task.cancel()

    async def _pump_input(self, session) -> None:
        """화자 마이크 트랙 → 16kHz PCM → Gemini 입력."""
        audio_pub = self._find_audio_publication()
        if audio_pub is None or audio_pub.track is None:
            # 아직 트랙이 없으면 잠깐 기다렸다가 재시도(상위 루프가 reconnect).
            await asyncio.sleep(0.5)
            raise RuntimeError("speaker audio track not available yet")

        stream = rtc.AudioStream(
            audio_pub.track,
            sample_rate=INPUT_SAMPLE_RATE,
            num_channels=AUDIO_CHANNELS,
        )
        async for ev in stream:
            if self._closed:
                break
            frame = ev.frame
            await session.send_realtime_input(
                audio=genai_types.Blob(
                    data=frame.data.tobytes(),
                    mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                )
            )

    async def _pump_output(self, session) -> None:
        """Gemini 통역 출력(오디오 24kHz + 텍스트) → LiveKit 트랙/자막."""
        async for response in session.receive():
            if self._closed:
                break
            data = getattr(response, "data", None)
            if data and self._audio_source is not None:
                # 24kHz mono PCM → AudioFrame 으로 트랙에 캡처
                samples = len(data) // 2  # 16-bit
                frame = rtc.AudioFrame(
                    data=data,
                    sample_rate=OUTPUT_SAMPLE_RATE,
                    num_channels=AUDIO_CHANNELS,
                    samples_per_channel=samples,
                )
                await self._audio_source.capture_frame(frame)

            text = getattr(response, "text", None)
            if text:
                await self._send_caption(text)

    async def _send_caption(self, text: str) -> None:
        try:
            await self._room.local_participant.send_text(
                text,
                topic=TRANSLATION_TEXT_TOPIC,
                attributes={
                    "target_lang": self._target_lang,
                    "speaker": self._speaker.identity,
                },
            )
        except Exception as exc:
            logger.debug("caption send failed: %s", exc)

    def _find_audio_publication(self):
        for pub in self._speaker.track_publications.values():
            if pub.kind == rtc.TrackKind.KIND_AUDIO:
                return pub
        return None
