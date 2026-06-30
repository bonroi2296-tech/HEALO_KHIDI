"""Gemini Live Translate 통역 에이전트 — 진입점.

출처: livekit-examples/gemini-live-translate (translator/src/agent.py) 원본 이식.
방 1개당 워커 프로세스 1개. 사람 마이크 트랙을 구독하고, 참가자별 `lang` 속성에
따라 통역 트랙(`tx:<speaker>:<lang>`)과 자막(`lk.translation`)을 만든다.
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from livekit.agents import (
    AgentServer,
    AutoSubscribe,
    JobContext,
    cli,
)

from router import TranslationRouter

logger = logging.getLogger("translator.agent")

load_dotenv(".env.local")

server = AgentServer()


@server.rtc_session(agent_name="gemini-translator")
async def translator_entrypoint(ctx: JobContext) -> None:
    """One worker process per room. Subscribes to all human mic tracks and
    publishes translator tracks based on per-participant `lang` attributes."""
    ctx.log_context_fields = {"room": ctx.room.name}

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set; refusing to start")
        return

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    try:
        await ctx.room.local_participant.set_attributes({"lk.agent.state": "listening"})
    except Exception as exc:
        logger.debug("set agent state attr failed: %s", exc)

    router = TranslationRouter(ctx.room, gemini_api_key=api_key)
    router.start()

    async def _shutdown() -> None:
        await router.aclose()

    ctx.add_shutdown_callback(_shutdown)

    logger.info("translation router ready for room=%s", ctx.room.name)


if __name__ == "__main__":
    cli.run_app(server)
