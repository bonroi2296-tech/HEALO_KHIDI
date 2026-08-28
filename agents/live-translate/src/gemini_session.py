"""GeminiSession — 한 (화자 → 대상언어) 통역 스트림 하나를 담당.

하는 일:
  1. 화자의 마이크 오디오를 16kHz PCM 으로 받아 Gemini Live Translate 에 흘려보냄
  2. Gemini 가 돌려주는 통역 음성(24kHz)을 LiveKit 트랙 `tx:<speaker>:<lang>` 으로 발행
  3. (가능하면) 통역 자막을 텍스트 스트림 `lk.translation` 으로 발행

검증: 모든 Gemini Live / livekit rtc API 호출을 실제 설치 SDK(google-genai 2.x,
   livekit rtc)로 introspection 대조 확인함(시그니처·필드 일치). 대상 언어는 전용
   필드 translation_config.target_language_code(BCP-47, kz→kk 매핑)로, 자막은
   output_audio_transcription 으로 받는다. 남은 미검증 = 실 2인 통화 라이브 동작
   (배포 후 1회 사람 검증 필요). 자세한 검증 내역은 README 참고.
"""

from __future__ import annotations

import asyncio
import logging
import time

from livekit import rtc

from config import (
    GEMINI_MODEL,
    INPUT_SAMPLE_RATE,
    OUTPUT_SAMPLE_RATE,
    AUDIO_CHANNELS,
    TRACK_NAME_PREFIX,
    TRANSLATION_TEXT_TOPIC,
    GEMINI_RECONNECT_BACKOFF_SEC,
    GEMINI_FAIL_STREAK_TO_REPORT,
    GEMINI_HEALTHY_RUN_SEC,
    TRANSLATOR_STATUS_ATTR,
    TRANSLATOR_STATUS_FAILING,
    TRANSLATOR_STATUS_OK,
)

logger = logging.getLogger("translator.session")

# 우리 내부 언어코드 → Gemini translation_config 가 받는 BCP-47 코드.
# ⚠️ 카자흐어: 내부는 `kz`(프록시가 브라우저 kk→kz 로 매핑)지만 BCP-47 정본은 `kk`.
#    이 보정을 빼면 카자흐 환자 통역이 조용히 실패하거나 러시아어로 샐 수 있음.
_BCP47 = {
    "kz": "kk",  # Kazakh
    # ko/ru/en/zh/ja 는 BCP-47 과 동일.
}


def to_bcp47(lang: str) -> str:
    return _BCP47.get(lang, lang)

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
        self._reported_status: str | None = None
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
    # 대상 언어는 Live API 의 전용 필드 `translation_config.target_language_code`
    # (BCP-47)로 지정한다. 설치된 google-genai(2.x) introspection 으로 확정:
    #   LiveConnectConfig(response_modalities=["AUDIO"], translation_config=...)
    #   TranslationConfig(target_language_code=<BCP-47>, echo_target_language=False)
    def _build_live_config(self):
        return genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            translation_config=genai_types.TranslationConfig(
                target_language_code=to_bcp47(self._target_lang),
                # 대상 언어가 들릴 때 따라 말하기(parrot) 안 함 — 라우터가 이미
                # S.lang != T 만 통역쌍으로 만들므로 불필요.
                echo_target_language=False,
            ),
            # 통역 음성의 자막(텍스트)을 함께 받기 → lk.translation 스트림으로 발행.
            output_audio_transcription=genai_types.AudioTranscriptionConfig(),
        )

    # ── 메인 루프: 화자 오디오 → Gemini → 통역 트랙/자막 ──
    async def _run(self) -> None:
        backoff_idx = 0
        while not self._closed:
            started = time.monotonic()
            try:
                await self._run_once()
                backoff_idx = 0
                await self._report_status(TRANSLATOR_STATUS_OK)
            except asyncio.CancelledError:
                return
            except Exception:
                logger.exception("gemini session error (%s)", self._track_name)
                # 오래 «잘 돌다가» 끊긴 것은 연속 실패가 아니다. Gemini Live 세션은
                # 일정 시간이 지나면 스스로 닫히므로, 그걸 실패로 세면 긴 상담일수록
                # 재연결이 느려지고(0.5초 → 30초) 멀쩡한데도 「통역 안 됨」 안내가 뜬다.
                if time.monotonic() - started >= GEMINI_HEALTHY_RUN_SEC:
                    backoff_idx = 0
                    await self._report_status(TRANSLATOR_STATUS_OK)
                delay = GEMINI_RECONNECT_BACKOFF_SEC[
                    min(backoff_idx, len(GEMINI_RECONNECT_BACKOFF_SEC) - 1)
                ]
                backoff_idx += 1
                # ⚠️ 여기서 «조용히» 재시도만 하면 통역이 죽은 채로 화면은 「켜짐」이다.
                #    한두 번은 일시적 끊김이라 넘기고, 계속 실패하면 방에 알린다.
                if backoff_idx == GEMINI_FAIL_STREAK_TO_REPORT:
                    await self._report_status(TRANSLATOR_STATUS_FAILING)
                await asyncio.sleep(delay)

    async def _report_status(self, status: str) -> None:
        """통역 상태를 참가자 속성에 적는다. 화면이 이 값을 읽어 사용자에게 알린다.

        ⚠️ 기존 속성을 읽어 «합쳐서» 쓴다 — 통째로 덮으면 lk.agent.state 같은 값이 날아간다.
        같은 값이면 안 쓴다(속성 변경 이벤트가 방 전체에 퍼지므로).
        """
        if self._reported_status == status:
            return
        self._reported_status = status
        try:
            lp = self._room.local_participant
            attrs = dict(getattr(lp, "attributes", None) or {})
            attrs[TRANSLATOR_STATUS_ATTR] = status
            await lp.set_attributes(attrs)
            logger.info("통역 상태 알림: %s (%s)", status, self._track_name)
        except Exception as exc:
            logger.warning("통역 상태 알림 실패: %s", exc)

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
        # 흐름 계측 (2026-07-28) — «봇은 들어왔는데 자막이 없다» 를 진단하려면
        # 어디서 끊겼는지 알아야 한다: 들어가는 소리가 없나 / 나오는 게 없나 / 보내다 터지나.
        # ⚠️ 의료 대화 내용이라 **텍스트는 절대 로그에 남기지 않는다** — 개수·바이트만.
        sent = 0
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
            sent += 1
            if sent % 500 == 0:  # 20ms 프레임 기준 약 10초마다
                logger.info(
                    "gemini in: %d frames (%s)", sent, self._track_name
                )

    async def _pump_output(self, session) -> None:
        """Gemini 통역 출력(오디오 24kHz + 텍스트) → LiveKit 트랙/자막."""
        audio_chunks = 0
        captions = 0
        async for response in session.receive():
            if self._closed:
                break
            # 1) 통역 음성(24kHz mono PCM) → LiveKit 트랙으로 캡처.
            #    google-genai 의 편의 프로퍼티 response.data = server_content 의
            #    inline 오디오 바이트 합본.
            data = getattr(response, "data", None)
            if data and self._audio_source is not None:
                samples = len(data) // 2  # 16-bit
                frame = rtc.AudioFrame(
                    data=data,
                    sample_rate=OUTPUT_SAMPLE_RATE,
                    num_channels=AUDIO_CHANNELS,
                    samples_per_channel=samples,
                )
                await self._audio_source.capture_frame(frame)
                audio_chunks += 1
                if audio_chunks % 50 == 0:
                    logger.info(
                        "gemini out: %d audio chunks, %d captions (%s)",
                        audio_chunks,
                        captions,
                        self._track_name,
                    )

            # 2) 통역 음성의 자막 → lk.translation 스트림. output_audio_transcription
            #    을 켰을 때 server_content.output_transcription 으로 들어온다.
            sc = getattr(response, "server_content", None)
            ot = getattr(sc, "output_transcription", None) if sc else None
            text = getattr(ot, "text", None) if ot else None
            if text:
                captions += 1
                # 글자 수만 남긴다 — 내용은 환자 대화라 로그 금지.
                if captions <= 3 or captions % 20 == 0:
                    logger.info(
                        "caption -> %s: #%d (%d chars)",
                        self._target_lang,
                        captions,
                        len(text),
                    )
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
            # ⚠️ 여기가 debug 였다 (2026-07-28 승격). 자막이 안 뜨는데 로그도 없으면
            #    «Gemini 가 안 만든 건지 / 보내다 터진 건지» 를 못 가른다 — #100 과 같은
            #    «조용한 실패» 를 또 만드는 자리라 WARNING 으로 올린다(내용은 안 남김).
            logger.warning("caption send failed: %s", exc)

    def _find_audio_publication(self):
        for pub in self._speaker.track_publications.values():
            if pub.kind == rtc.TrackKind.KIND_AUDIO:
                return pub
        return None
