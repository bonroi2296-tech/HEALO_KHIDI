"""
시험 도구가 «실환자 방»을 건드리는 것을 기계로 막는다.

왜 (2026-08-28): 이 폴더의 시험 도구들은 방 이름을 인자로 받는다. 실수로 실환자 방 이름을
  넣으면 ①가짜 자막이 그 방에 뿌려지고 ②화면이 그걸 상담 기록에 저장한다
  (자막 저장 배선이 붙은 뒤로는 «화면에만 잠깐 뜨는» 사고가 아니라 «기록에 남는» 사고다).
  ③watch_captions 계열은 반대로 실환자 대화를 화면에 그대로 찍는다.

  주석으로 「실환자 방에 쓰지 마라」라고만 적어 두는 것은 방어가 아니다. 실측으로 확인한
  사실 하나가 이 문지기를 가능하게 한다:

    앱이 만드는 진짜 상담방 이름은 전부 `khidi-<hex>` 다(실측: 실제방 16개 · 시험방 127개
    가 모두 이 꼴). 손으로 만든 시험 방(`verify-…`)과 이름 규칙이 확실히 갈린다.
    ⚠️ is_test 로는 못 가른다 — 시험 방도 `khidi-` 로 만들어진다. 그래서 «앱이 만든 방이면
       무조건 막고», 정말 필요하면 사람이 눈으로 확인하고 뚫게 한다.

사용: 방 이름을 받은 «직후» 한 번 부른다.
    from test_guard import refuse_real_room
    refuse_real_room(args.room)

⚠️ 이 문지기를 «시험»할 때 진짜 방 이름을 쓰지 마라. `ALLOW_REAL_ROOM=1` 로 뚫는 쪽을
   확인하려다 실제 상담방에 자막을 보낼 뻔했다(2026-08-28: 다행히 이름을 12자로 잘라
   붙여 넣어서 «존재하지 않는 방»이 만들어졌고 아무에게도 안 갔다).
   문지기 시험은 `khidi-지어낸이름-검사용` 처럼 **어느 상담에도 없는** 이름으로 하라.
"""

import os
import sys

# 앱이 만드는 상담방 이름의 접두사. 이 꼴이면 «누군가의 진짜 상담일 수 있다»고 본다.
APP_ROOM_PREFIX = "khidi-"

# 정말 그 방에 붙어야 할 때 사람이 직접 켜는 문(예: 실서비스 사고를 재현할 때).
OVERRIDE_ENV = "ALLOW_REAL_ROOM"


def refuse_real_room(room: str) -> None:
    """앱이 만든 방이면 그 자리에서 멈춘다. 시험 방(verify-… 등)은 그냥 통과."""
    name = (room or "").strip()
    if not name.startswith(APP_ROOM_PREFIX):
        return
    if os.environ.get(OVERRIDE_ENV) == "1":
        print(
            f"⚠️ [{name}] 은 앱이 만든 상담방이다. {OVERRIDE_ENV}=1 이 켜져 있어 그대로 진행한다.",
            file=sys.stderr,
        )
        return
    print(
        f"\n⛔ [{name}] 은 «앱이 만든 상담방» 이름이다 — 실환자 상담일 수 있다.\n"
        f"   시험 도구는 여기에 붙지 않는다:\n"
        f"     · 자막을 보내는 도구는 가짜 자막이 그 방의 «상담 기록»에 저장된다\n"
        f"     · 자막을 보는 도구는 실환자 대화가 화면에 그대로 찍힌다\n"
        f"   시험은 손으로 만든 방(예: verify-…)에서 하라.\n"
        f"   정말 이 방이어야 하면: {OVERRIDE_ENV}=1 을 켜고 다시 실행하라.\n",
        file=sys.stderr,
    )
    raise SystemExit(2)
