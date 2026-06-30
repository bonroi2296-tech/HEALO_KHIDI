"""TranslationRouter — 방 안의 통역쌍을 수요 기반으로 만들고 정리한다.

이식 출처: livekit-examples/gemini-live-translate (translator/src/router.py) 의
동작 계약. 핵심 규칙:

    세션 (S, T) 는 다음이 모두 참일 때만 존재한다 —
      · lang == T 인 청취자가 1명 이상 있고,
      · 화자 S 가 켜진 마이크 트랙을 갖고 있고,
      · S.lang != T  (자기 언어로는 통역 안 함)

⚠️ 정직: 이 파일은 위 계약·이벤트 모델을 바탕으로 한 best-effort 이식본이다.
   배포 전 상위 공식 예제와 대조 + 실제 2인 통화 검증이 필요하다(README 참고).
"""

from __future__ import annotations

import asyncio
import logging

from livekit import rtc

from config import (
    PARTICIPANT_LANG_ATTR,
    NATIVE_LANG,
    RECONCILE_DEBOUNCE_SEC,
    SESSION_GRACE_SEC,
)
from gemini_session import GeminiSession

logger = logging.getLogger("translator.router")


class TranslationRouter:
    def __init__(self, room: rtc.Room, *, gemini_api_key: str) -> None:
        self._room = room
        self._api_key = gemini_api_key
        # key: (speaker_identity, target_lang) -> GeminiSession
        self._sessions: dict[tuple[str, str], GeminiSession] = {}
        # 그레이스 기간 동안 종료 예약된 세션의 타이머
        self._teardown_tasks: dict[tuple[str, str], asyncio.Task] = {}
        self._reconcile_task: asyncio.Task | None = None
        self._closing = False

    # ── 수명주기 ──
    def start(self) -> None:
        room = self._room
        room.on("participant_connected", self._on_change)
        room.on("participant_disconnected", self._on_participant_disconnected)
        room.on("participant_attributes_changed", self._on_attrs_changed)
        room.on("track_subscribed", self._on_change)
        room.on("track_unsubscribed", self._on_change)
        room.on("track_muted", self._on_change)
        room.on("track_unmuted", self._on_change)
        # 입장 시점에 이미 있던 참가자 backfill
        self._schedule_reconcile()

    async def aclose(self) -> None:
        self._closing = True
        if self._reconcile_task:
            self._reconcile_task.cancel()
        for t in list(self._teardown_tasks.values()):
            t.cancel()
        self._teardown_tasks.clear()
        await asyncio.gather(
            *(s.aclose() for s in self._sessions.values()), return_exceptions=True
        )
        self._sessions.clear()

    # ── 이벤트 핸들러 (전부 디바운스된 reconcile 로 수렴) ──
    def _on_change(self, *args) -> None:
        self._schedule_reconcile()

    def _on_attrs_changed(self, *args) -> None:
        self._schedule_reconcile()

    def _on_participant_disconnected(self, participant: rtc.RemoteParticipant) -> None:
        # 화자가 나가면 그 화자의 세션은 그레이스 없이 즉시 종료.
        ident = participant.identity
        for key in [k for k in self._sessions if k[0] == ident]:
            self._kill_session(key)
        self._schedule_reconcile()

    def _schedule_reconcile(self) -> None:
        if self._closing:
            return
        if self._reconcile_task and not self._reconcile_task.done():
            return
        self._reconcile_task = asyncio.create_task(self._reconcile_after_debounce())

    async def _reconcile_after_debounce(self) -> None:
        try:
            await asyncio.sleep(RECONCILE_DEBOUNCE_SEC)
            await self._reconcile()
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("reconcile failed")

    # ── 핵심: 원하는 세션 집합 계산 후 차이만 적용 ──
    def _participant_lang(self, p) -> str | None:
        lang = (p.attributes or {}).get(PARTICIPANT_LANG_ATTR)
        if not lang or lang == NATIVE_LANG:
            return None
        return lang

    def _has_live_mic(self, p: rtc.RemoteParticipant) -> bool:
        for pub in p.track_publications.values():
            if pub.kind == rtc.TrackKind.KIND_AUDIO and not pub.muted:
                return True
        return False

    def _compute_desired_sessions(self) -> set[tuple[str, str]]:
        remotes = list(self._room.remote_participants.values())
        # 청취자들이 원하는 언어 집합
        listener_langs = {
            self._participant_lang(p) for p in remotes
        }
        listener_langs.discard(None)

        desired: set[tuple[str, str]] = set()
        for speaker in remotes:
            s_lang = self._participant_lang(speaker)
            if not self._has_live_mic(speaker):
                continue
            for t in listener_langs:
                if t == s_lang:
                    continue  # 같은 언어면 통역 불필요
                desired.add((speaker.identity, t))
        return desired

    async def _reconcile(self) -> None:
        if self._closing:
            return
        desired = self._compute_desired_sessions()
        current = set(self._sessions.keys())

        # 새로 필요한 세션 생성
        for key in desired - current:
            self._cancel_teardown(key)
            await self._create_session(key)

        # 더 이상 필요 없는 세션은 그레이스 후 종료
        for key in current - desired:
            self._schedule_teardown(key)

        # 다시 필요해진 세션은 종료 예약 취소
        for key in desired & set(self._teardown_tasks.keys()):
            self._cancel_teardown(key)

    async def _create_session(self, key: tuple[str, str]) -> None:
        if key in self._sessions:
            return
        speaker_identity, target_lang = key
        speaker = self._room.remote_participants.get(speaker_identity)
        if speaker is None:
            return
        try:
            session = GeminiSession(
                room=self._room,
                speaker=speaker,
                target_lang=target_lang,
                gemini_api_key=self._api_key,
            )
            await session.start()
            self._sessions[key] = session
            logger.info("session up: %s -> %s", speaker_identity, target_lang)
        except Exception:
            logger.exception("failed to create session %s", key)

    def _schedule_teardown(self, key: tuple[str, str]) -> None:
        if key in self._teardown_tasks:
            return

        async def _later() -> None:
            try:
                await asyncio.sleep(SESSION_GRACE_SEC)
                self._kill_session(key)
            except asyncio.CancelledError:
                pass

        self._teardown_tasks[key] = asyncio.create_task(_later())

    def _cancel_teardown(self, key: tuple[str, str]) -> None:
        t = self._teardown_tasks.pop(key, None)
        if t:
            t.cancel()

    def _kill_session(self, key: tuple[str, str]) -> None:
        self._cancel_teardown(key)
        session = self._sessions.pop(key, None)
        if session:
            asyncio.create_task(session.aclose())
            logger.info("session down: %s -> %s", key[0], key[1])
