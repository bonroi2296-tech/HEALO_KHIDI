#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""데모 이미지 만들기 — 「원본 / 자막 / 지움(빠름) / 지움(딥러닝) / 문구교체」를 한 장에 붙인다."""
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
FONT = os.path.join(REPO, "src", "lib", "pdf", "fonts", "NotoSansKR-Bold.ttf")
TOOL = os.path.join(HERE, "clean_subtitles.py")

sys.path.insert(0, HERE)
from selftest import burn, run  # noqa: E402


def label(img, text, h=52):
    """이미지 위에 제목 띠를 붙인다."""
    W = img.shape[1]
    bar = np.full((h, W, 3), 28, np.uint8)
    pil = Image.fromarray(bar)
    d = ImageDraw.Draw(pil)
    f = ImageFont.truetype(FONT, int(h * 0.5))
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text(((W - (r - l)) // 2 - l, (h - (b - t)) // 2 - t), text, font=f, fill=(255, 255, 255))
    return np.vstack([np.array(pil), img])


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    samples = [
        ("public/doctors/68ac266eec3443.90360671.jpg", "한국 최고의 암 전문의", "Лучший онколог Кореи"),
        ("public/doctors/68a42d8de9e095.75488957.jpg", "무료 사전상담 신청하기", "Бесплатная консультация"),
    ]
    rows = []
    for i, (rel, ko, ru) in enumerate(samples):
        orig = cv2.imdecode(np.fromfile(os.path.join(REPO, rel), np.uint8), cv2.IMREAD_COLOR)
        orig = cv2.resize(orig, (620, int(620 * orig.shape[0] / orig.shape[1])),
                          interpolation=cv2.INTER_AREA)
        p = lambda s: os.path.join(out_dir, f"s{i}_{s}.png")  # noqa: E731

        subbed, _ = burn(orig, ko)
        cv2.imwrite(p("orig"), orig)
        cv2.imwrite(p("sub"), subbed)
        run([TOOL, p("sub"), "-o", p("telea"), "--method", "telea"])
        run([TOOL, p("sub"), "-o", p("lama"), "--method", "lama"])
        run([TOOL, p("sub"), "-o", p("repl"), "--method", "lama", "--mode", "replace",
             "--text", ru])

        cells = [
            (cv2.imread(p("orig")), "① 원본 (자막 없음)"),
            (cv2.imread(p("sub")), "② 한글 자막 구워짐"),
            (cv2.imread(p("telea")), "③ 지움 · 빠른방식"),
            (cv2.imread(p("lama")), "④ 지움 · 딥러닝"),
            (cv2.imread(p("repl")), "⑤ 러시아어로 교체"),
        ]
        H = min(c.shape[0] for c, _ in cells)
        rows.append(np.hstack([label(c[:H], t) for c, t in cells]))

    W = min(r.shape[1] for r in rows)
    sheet = np.vstack([r[:, :W] for r in rows])
    out = os.path.join(out_dir, "비교표.png")
    cv2.imwrite(out, sheet)
    print(out)
    return out


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "_demo_out"))
