#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""여러 이미지를 한꺼번에 훑어서 「글자 박힌 것」을 찾아내고 글자만 지운 판을 뽑는다.

원본은 절대 건드리지 않는다 — 결과는 지정한 출력 폴더에 원래 폴더 구조 그대로 쌓인다.

  # 1) 어디에 무슨 글자가 박혀 있는지 훑기만 (지우지 않음)
  python3 batch_clean.py public --scan --detector ocr --csv 목록.csv

  # 2) 글자 지운 판 뽑기
  python3 batch_clean.py public -o /tmp/clean --detector ocr --method lama
"""
import argparse
import csv
import os
import sys
import time

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean_subtitles import detect_text_mask, detect_text_mask_ocr, inpaint  # noqa: E402

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
SKIP_DIRS = {"node_modules", ".next", ".git", ".vercel", "dist", "build"}


def find_images(roots):
    out = []
    for root in roots:
        if os.path.isfile(root):
            out.append(root)
            continue
        for dirpath, dirnames, files in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for f in sorted(files):
                if os.path.splitext(f)[1].lower() in IMAGE_EXT:
                    out.append(os.path.join(dirpath, f))
    return sorted(out)


def read(path):
    """알파(투명) 채널이 있으면 따로 떼서 돌려준다 — 마지막에 다시 붙인다."""
    try:
        img = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_UNCHANGED)
    except Exception:
        return None, None
    if img is None:
        return None, None
    alpha = None
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:
        alpha = img[:, :, 3]
        img = img[:, :, :3]
    return img, alpha


def analyze_fast(img, band, sensitivity, grow):
    """모양으로 추측하는 빠른 방식."""
    mask, boxes = detect_text_mask(
        img, band=band, sensitivity=sensitivity, grow=grow, return_boxes=True
    )
    H, W = img.shape[:2]
    found = []
    for x, y, w, h in boxes:
        sub = mask[y : y + h, x : x + w]
        fill = sub.mean() / 255.0
        ok = w / W >= 0.08 and 0.015 <= h / H <= 0.30 and 0.05 <= fill <= 0.75
        found.append({"box": (x, y, w, h), "text": "", "conf": 0.0, "ok": ok})
    return mask, found


def analyze_ocr(img, band, grow, min_conf):
    """진짜로 읽어서 확인하는 방식."""
    mask, found = detect_text_mask_ocr(
        img, band=band, grow=grow, min_conf=min_conf, return_boxes=True
    )
    for f in found:
        f["ok"] = True  # 판독기가 읽어낸 것 = 글자가 맞다
    return mask, found


def main():
    ap = argparse.ArgumentParser(description="이미지 무더기에서 박힌 글자만 지우기")
    ap.add_argument("roots", nargs="+", help="폴더 또는 파일들")
    ap.add_argument("-o", "--out", help="결과를 쌓을 폴더 (없으면 훑기만)")
    ap.add_argument("--scan", action="store_true", help="찾기만 하고 지우지는 않는다")
    ap.add_argument("--detector", default="ocr", choices=["fast", "ocr"],
                    help="fast=모양으로 추측(빠름) / ocr=진짜로 읽어서 확인(정확, 기본)")
    ap.add_argument("--band", default="all", choices=["bottom", "top", "middle", "all"])
    ap.add_argument("--sensitivity", type=int, default=55)
    ap.add_argument("--min-conf", type=float, default=0.30, help="[ocr] 이 확신도 미만은 무시")
    ap.add_argument("--grow", type=int, default=4)
    ap.add_argument("--method", default="telea", choices=["telea", "ns", "lama"])
    ap.add_argument("--min-boxes", type=int, default=1, help="이만큼 이상 글자줄이 있어야 「글자 있음」")
    ap.add_argument("--max-side", type=int, default=2200, help="이보다 크면 줄여서 처리(속도)")
    ap.add_argument("--limit", type=int, help="앞에서 N개만 (시험용)")
    ap.add_argument("--csv", help="결과 목록을 csv 로 저장")
    args = ap.parse_args()

    files = find_images(args.roots)
    if args.limit:
        files = files[: args.limit]
    print(f"이미지 {len(files)}개 훑는다 (찾는방식={args.detector}, 구역={args.band})", flush=True)

    rows, hits = [], 0
    t0 = time.time()
    for i, path in enumerate(files, 1):
        img, alpha = read(path)
        if img is None:
            rows.append({"파일": os.path.relpath(path), "상태": "못읽음"})
            continue

        # 너무 큰 그림은 줄여서 찾고, 마스크만 원래 크기로 되돌린다
        H, W = img.shape[:2]
        scale = min(1.0, args.max_side / max(H, W))
        small = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else img

        if args.detector == "ocr":
            mask, found = analyze_ocr(small, args.band, args.grow, args.min_conf)
        else:
            mask, found = analyze_fast(small, args.band, args.sensitivity, args.grow)

        good = [f for f in found if f["ok"]]
        has_text = len(good) >= args.min_boxes

        texts = " / ".join(f["text"] for f in good if f["text"])[:300]
        row = {
            "파일": os.path.relpath(path),
            "크기": f"{W}x{H}",
            "상태": "글자있음" if has_text else "깨끗",
            "글자줄": len(good),
            "읽힌글자": texts,
            "글자비율%": round((mask > 0).mean() * 100, 2),
        }

        if has_text:
            hits += 1
            if not args.scan and args.out:
                m2 = np.zeros(mask.shape, np.uint8)
                for f in good:
                    x, y, w, h = f["box"]
                    m2[y : y + h, x : x + w] = mask[y : y + h, x : x + w]
                if scale < 1:
                    m2 = cv2.resize(m2, (W, H), interpolation=cv2.INTER_NEAREST)
                    m2 = cv2.dilate(m2, np.ones((3, 3), np.uint8))
                clean = inpaint(img, m2, method=args.method)

                base = args.roots[0] if os.path.isdir(args.roots[0]) else "."
                rel = os.path.relpath(path, base)
                dst = os.path.join(args.out, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                if alpha is not None and os.path.splitext(dst)[1].lower() == ".png":
                    cv2.imwrite(dst, np.dstack([clean, alpha]))
                else:
                    cv2.imwrite(dst, clean)
                row["결과"] = os.path.relpath(dst)

        rows.append(row)
        if i % 20 == 0 or i == len(files):
            el = time.time() - t0
            eta = el / i * (len(files) - i)
            print(f"  {i}/{len(files)}  글자있음 {hits}개  ({el/60:.1f}분 경과, 남은시간 {eta/60:.1f}분)",
                  flush=True)

    print(f"\n총 {len(files)}개 중 글자 박힌 것 {hits}개 ({hits*100//max(1,len(files))}%)")
    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as f:
            cols = ["파일", "크기", "상태", "글자줄", "읽힌글자", "글자비율%", "결과"]
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
        print(f"목록: {args.csv}")
    return rows


if __name__ == "__main__":
    main()
