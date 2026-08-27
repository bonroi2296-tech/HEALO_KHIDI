---
name: ppt
description: PPT·발표자료·제안서 슬라이드·피치덱·보고서 덱을 만들거나 고칠 때 쓴다. BeyondK 표준 깔(teal)을 코드로 집행하는 scripts/ppt/beyondk_style.py 를 물려서, 매번 다른 톤이 나오는 것을 막는다. "PPT 만들어줘 / 발표자료 / 슬라이드 / 피치덱 / 제안서 / 덱 / pptx" 가 나오면 반드시 사용.
---

# PPT 만들기 — 코드로 집행한다

> **왜 이 스킬이 있나 (2026-08-27).** 규격 문서(`docs/rules/PPT_STYLE.md`)와 그걸 구현한
> 라이브러리(`scripts/ppt/beyondk_style.py`)가 **둘 다 있는데 서로를 안 가리키고 있었다.**
> 그래서 문서만 읽고 python-pptx 코드를 매번 새로 짜게 되고, **같은 규격인데 매번 조금씩 다른 깔이 나온다.**

## ⚠️ 색은 «원본 그대로»가 아니다 — 제일 자주 틀리는 곳

우리 PPT 는 비욘드케이 회사소개 PDF 를 **레퍼런스로 삼되 색만 우리 브랜드 teal 로 바꿔 쓴다**(PO 지시).
원본이 강조색으로 쓴 **라임 `#D9FE55` 를 그대로 칠하면 안 된다** — 구조·여백·타이포만 따라 하고,
칠하는 값은 `beyondk_style.py` 의 `BRAND`(teal-700 `#0F766E`)다.
문서 §2 는 두 색을 **나란히** 적어 둔다(왼쪽=원본 기록, 오른쪽=우리가 쓸 값). **오른쪽을 써라.**

## 0. 순서 (이 순서를 건너뛰지 마라)

1. **`docs/rules/PPT_STYLE.md` 를 읽는다** — 판형·글꼴·색·5종 뼈대. 규격의 «왜».
2. **`scripts/ppt/beyondk_style.py` 를 읽는다** — 규격의 «집행». 여기 있는 함수만 쓴다.
3. **`scripts/ppt/khidi_midterm_deck.py` 를 본다** — 430줄짜리 실제 사용 예시. 새 덱은 **이걸 베껴서 시작**하는 게 가장 빠르다.
4. 내용(글)을 먼저 확정하고 → 슬라이드로 나눈 뒤 → 코드를 짠다.
5. **뽑고 나서 눈으로 본다** (§3).

## 1. 절대 하지 마라

- ❌ `beyondk_style` 안 쓰고 `from pptx import Presentation` 부터 새로 짜기.
  → 색·글꼴·판형을 손으로 다시 옮기게 되고 **반드시 어긋난다**.
- ❌ 문서의 색·크기를 코드에 하드코딩으로 다시 적기. → `B.BRAND`, `B.PANEL` 처럼 **상수를 참조**해라.
- ❌ 강조색(teal `#0F766E`)을 한 슬라이드에 두 곳 이상 칠하기.
- ❌ 원본이 쓴 라임 `#D9FE55` 를 그대로 칠하기 → 위 경고 칸.
- ❌ 4:3 (`B.deck()` 이 16:9 로 잡아 준다 — 직접 `Presentation()` 부르지 마라).
- ❌ 새 색을 들이기(파랑·주황). `DESIGN.md` teal 이 영구 고정이다.

## 2. 뼈대 + 부품

```python
import sys; sys.path.insert(0, "scripts/ppt")
import beyondk_style as B

prs = B.deck()
B.cover(prs, "KICKER", ["제목 줄1", "제목 줄2"], "부제", "2026. 08. 27.")
B.chapter(prs, "Business background")
B.statement(prs, "제목", [("본문", False), ("강조 문장", True)], accent="한 줄 결론")
s = B.content(prs, "How", "제목", "부제")   # 이 위에 아래 부품을 얹는다
prs.save("out.pptx")
```

| 부품 | 하는 일 |
|---|---|
| `B.table(s, rows, x, y, widths, bordered=)` | 세로선 없는 기본형 표 / `bordered=True` 면 비교형 |
| `B.stat(s, x, y, w, value, label, sub, accent=)` | **숫자 카드.** 글 나열 대신 이걸 써라 |
| `B.step(...)` · `B.arrow(...)` | 흐름도 칸 · 화살표 |
| `B.picture(s, path, x, y, w=)` | 실화면 캡처(테두리 자동) |
| `B.panel` · `B.box` | `#F2F2F2` 라운드 박스 · 임의 사각형 |
| `B.band(s, "▶ 결론")` · `B.highlight` | 하단 강조 띠 · teal 형광펜 |
| `B.caption` · `B.note` · `B.rich` | 캡션 · 각주 · 한 줄 안 강조 섞기 |

전체 목록은 `grep "^def " scripts/ppt/beyondk_style.py`.

## 3. 뽑고 나서 «반드시» 눈으로 본다

빌드 통과 ≠ 제대로 나온 것이다. 글자 넘침·겹침은 코드로는 안 잡힌다.

```bash
pip install python-pptx                                   # 검증본 1.0.2
python3 scripts/ppt/<덱>.py                                # .pptx 생성
soffice --headless --convert-to pdf --outdir /tmp <덱>.pptx  # 클라우드 세션
pdftoppm -png -r 90 /tmp/<덱>.pdf /tmp/slide               # 장별 PNG
```

→ 나온 PNG 를 **Read 로 직접 열어 확인**하고, PO 에게도 **그림으로** 낸다(코드·파일명만 주지 마라).
글꼴은 이름만 파일에 박히므로 **리눅스에서 만들어도 되고**, 열어 볼 PC 에만 에스코어 드림이 깔려 있으면 된다.
⚠️ 단 이 상자엔 에스코어 드림이 없어 **PNG 미리보기의 글꼴은 대체 글꼴**이다 — 배치·넘침은 믿되 **글꼴 모양은 믿지 마라**.

## 4. 반복되는 덱은 스크립트로 남긴다

같은 덱을 또 만들 일이 있으면(월간 보고·과제 보고) 일회성 코드로 끝내지 말고
`scripts/ppt/<이름>_deck.py` 로 저장한다. 다음엔 내용만 바꿔 다시 돌린다.
