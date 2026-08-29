#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""무더기 처리 결과를 「전 / 후」 한 장으로 붙여 눈으로 검수할 수 있게 만든다.

  python3 make_contact_sheet.py 목록.csv -o 검수표.jpg --cols 4 --limit 24
"""
import argparse
import csv
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
FONT = os.path.join(REPO, "src", "lib", "pdf", "fonts", "NotoSansKR-Bold.ttf")


def cell(before_path, after_path, text, w=380):
    """한 칸 = [전 | 후] 나란히 + 밑에 읽힌 글자."""
    a = cv2.imread(before_path)
    b = cv2.imread(after_path)
    if a is None or b is None:
        return None
    half = w // 2 - 3
    ra = cv2.resize(a, (half, int(a.shape[0] * half / a.shape[1])), interpolation=cv2.INTER_AREA)
    rb = cv2.resize(b, (half, int(b.shape[0] * half / b.shape[1])), interpolation=cv2.INTER_AREA)
    h = min(ra.shape[0], rb.shape[0], int(w * 1.1))
    pair = np.hstack([ra[:h], np.full((h, 6, 3), 255, np.uint8), rb[:h]])

    cap_h = 46
    cap = np.full((cap_h, pair.shape[1], 3), 245, np.uint8)
    pil = Image.fromarray(cap)
    d = ImageDraw.Draw(pil)
    f = ImageFont.truetype(FONT, 15)
    label = f"지운 글자: {text}" if text else "글자"
    while d.textbbox((0, 0), label, font=f)[2] > pair.shape[1] - 10 and len(label) > 8:
        label = label[:-2] + "…"
    d.text((6, 4), label, font=f, fill=(20, 20, 20))
    d.text((6, 25), "← 전     |     후 →", font=ImageFont.truetype(FONT, 13), fill=(120, 120, 120))
    return np.vstack([pair, np.array(pil)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("-o", "--out", default="검수표.jpg")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--limit", type=int, default=24)
    ap.add_argument("--width", type=int, default=380)
    args = ap.parse_args()

    rows = [
        r
        for r in csv.DictReader(open(args.csv_path, encoding="utf-8-sig"))
        if r.get("결과") and r.get("상태") == "글자있음"
    ]
    rows = rows[: args.limit]
    cells = []
    for r in rows:
        c = cell(r["파일"], r["결과"], r.get("읽힌글자", ""), args.width)
        if c is not None:
            cells.append(c)
    if not cells:
        raise SystemExit("붙일 게 없다")

    H = max(c.shape[0] for c in cells)
    cells = [
        np.vstack([c, np.full((H - c.shape[0], c.shape[1], 3), 255, np.uint8)]) for c in cells
    ]
    W = max(c.shape[1] for c in cells)
    cells = [
        np.hstack([c, np.full((c.shape[0], W - c.shape[1], 3), 255, np.uint8)]) for c in cells
    ]

    lines = []
    for i in range(0, len(cells), args.cols):
        chunk = cells[i : i + args.cols]
        while len(chunk) < args.cols:
            chunk.append(np.full_like(cells[0], 255))
        lines.append(np.hstack(chunk))
    sheet = np.vstack(lines)
    cv2.imwrite(args.out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f"{args.out}  ({len(cells)}건, {sheet.shape[1]}x{sheet.shape[0]})")


if __name__ == "__main__":
    main()
