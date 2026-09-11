# -*- coding: utf-8 -*-
"""제안서 FEATURES 장에 쓸 화면 조각을 원본 2880px 캡처에서 잘라낸다.

왜 자르나: ui_*.png 는 720px 짜리라 224pt 칸에 넣으면 본문이 4pt 수준으로 줄어
「실제 서비스 화면입니다」라고 가리켜 놓고 아무도 못 읽는다(2026-09-10 PO 지적).
*_ru.png 는 2880px(논리 720px의 4배)이라, 텍스트 블록만 좁게 잘라 250pt 칸에 넣으면
표시 배율이 1.1배가 되어 원본 브라우저보다 오히려 크게 읽힌다.

  python scripts/ppt/org_intro_crops.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "docs", "presentations", "shots")

# 잘라낼 칸 크기를 셋 다 같게 잡아야 나란히 놓았을 때 높이가 맞는다.
CW, CH = 1070, 1198          # 원본 픽셀 (250pt : 280pt 비율). 옆 사진이 걸치지 않는 폭

# (원본파일, 왼쪽위 x, 왼쪽위 y, 내보낼 이름)
CROPS = [
    ("partners_ru.png", 480, 150, "crop_partners_ru.png"),
    ("insurance_ru.png", 500, 200, "crop_insurance_ru.png"),
]


def main():
    for src, x, y, out in CROPS:
        im = Image.open(os.path.join(SHOTS, src))
        w, h = im.size
        x = min(x, w - CW)
        y = min(y, h - CH)
        im.crop((x, y, x + CW, y + CH)).save(os.path.join(SHOTS, out))
        print("saved:", out, (CW, CH), "from", src, "at", (x, y))


if __name__ == "__main__":
    main()
