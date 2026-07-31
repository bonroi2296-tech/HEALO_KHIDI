#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
한글 자막(하드섭) 지우개 — 이미지/영상에 「구워진」 자막만 지우거나 다른 문구로 갈아끼운다.

왜 만들었나:
  이미 자막이 박혀버린(하드섭) 사진·영상을 다시 쓰려면 자막만 걷어낸 「원본」이 필요하다.
  자막 파일이 따로 있는(소프트섭) 영상은 이 도구가 필요 없다 — 트랙만 빼면 끝
  (아래 --check 가 어느 쪽인지 먼저 알려준다).

쓰는 법:
  # 0) 이 영상이 하드섭인지 소프트섭인지부터 판정
  python3 clean_subtitles.py 입력.mp4 --check

  # 1) 어디를 자막으로 봤는지 눈으로 먼저 확인 (빨간 칠 미리보기)
  python3 clean_subtitles.py 입력.jpg --mode preview -o 미리보기.jpg

  # 2) 자막만 지우기
  python3 clean_subtitles.py 입력.jpg -o 원본.jpg
  python3 clean_subtitles.py 입력.mp4 -o 원본.mp4

  # 3) 지우고 새 문구 얹기
  python3 clean_subtitles.py 입력.jpg --mode replace --text "새 문구" -o 결과.jpg

  # 4) 자동 검출이 빗나가면 직접 영역 지정 (px 또는 %)
  python3 clean_subtitles.py 입력.mp4 --box 5%,78%,90%,18%

필요한 것: opencv-python-headless, pillow, numpy, imageio-ffmpeg (영상일 때)
  pip install opencv-python-headless pillow numpy imageio-ffmpeg
"""

import argparse
import json
import os
import subprocess
import sys
from collections import deque

import cv2
import numpy as np

# ─────────────────────────────────────────────────────────────
# 공통 유틸
# ─────────────────────────────────────────────────────────────

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv"}

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONT_REGULAR = os.path.join(REPO_ROOT, "src", "lib", "pdf", "fonts", "NotoSansKR-Regular.ttf")
FONT_BOLD = os.path.join(REPO_ROOT, "src", "lib", "pdf", "fonts", "NotoSansKR-Bold.ttf")


def ffmpeg_exe():
    """정적 ffmpeg 실행파일 경로. 시스템에 있으면 그걸, 없으면 imageio-ffmpeg 동봉본."""
    from shutil import which

    p = which("ffmpeg")
    if p:
        return p
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        raise SystemExit(
            "ffmpeg 을 못 찾았다. `pip install imageio-ffmpeg` 하거나 ffmpeg 을 설치해라."
        )


def ffprobe_exe():
    from shutil import which

    return which("ffprobe")


def parse_box(spec, W, H):
    """'x,y,w,h' 를 px 로. 각 값은 px 또는 % 허용. 예: '5%,78%,90%,18%'"""
    parts = [s.strip() for s in spec.split(",")]
    if len(parts) != 4:
        raise ValueError("--box 는 x,y,w,h 네 값이어야 한다")
    ref = [W, H, W, H]
    out = []
    for i, s in enumerate(parts):
        if s.endswith("%"):
            out.append(int(round(float(s[:-1]) / 100.0 * ref[i])))
        else:
            out.append(int(round(float(s))))
    x, y, w, h = out
    x = max(0, min(x, W - 1))
    y = max(0, min(y, H - 1))
    w = max(1, min(w, W - x))
    h = max(1, min(h, H - y))
    return x, y, w, h


def band_rect(band, W, H):
    """자막을 찾을 구역. 기본은 아래쪽 40%."""
    if band == "all":
        return 0, 0, W, H
    if band == "top":
        return 0, 0, W, int(H * 0.30)
    if band == "middle":
        return 0, int(H * 0.30), W, int(H * 0.40)
    # bottom (기본)
    return 0, int(H * 0.58), W, H - int(H * 0.58)


# ─────────────────────────────────────────────────────────────
# 1) 자막 영역 검출
# ─────────────────────────────────────────────────────────────


def _runs(flags, min_len):
    """True 가 연속으로 이어지는 구간들을 (시작, 끝) 으로 뽑는다."""
    out, start = [], None
    for i, v in enumerate(flags):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(flags) - start >= min_len:
        out.append((start, len(flags)))
    return out


def detect_text_mask(img, band="bottom", grow=4, fill_box=False, min_h=10,
                     max_h_ratio=0.45, sensitivity=55, return_boxes=False,
                     white_thresh=185, dark_thresh=95):
    """자막 글자 픽셀 마스크(255=자막)를 만든다.

    원리 — 자막을 다른 밝은 것(흰 가운·하늘)과 가르는 결정적 특징 2개를 쓴다.
      ① 「밝은 글자 바로 옆에 아주 어두운 테두리」가 있다. 자막은 어떤 배경에서도
         읽히도록 흰 글자 + 검은 테두리(또는 검은 띠 위 흰 글자)로 만든다.
         흰 가운은 밝지만 그런 테두리가 없다.
      ② 그런 점들이 「가로 한 줄」에 몰려 있다. 그래서 가로줄별 개수를 세면
         자막 줄에서만 봉우리가 솟는다(사영 프로파일).
    이 둘을 통과한 구간만 자막 줄로 보고, 그 안의 글자+테두리를 마스크로 만든다.
    """
    H, W = img.shape[:2]
    bx, by, bw, bh = band_rect(band, W, H)
    roi = img[by : by + bh, bx : bx + bw]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    # 민감도(기본 55)를 밝기 문턱에 반영 — 낮출수록 더 많이 잡는다
    wt = int(np.clip(white_thresh + (sensitivity - 55) * 1.2, 120, 250))
    dt = int(np.clip(dark_thresh - (sensitivity - 55) * 1.0, 30, 150))

    bright = (gray >= wt).astype(np.uint8)
    dark = (gray <= dt).astype(np.uint8)

    # 글자 획 굵기 어림값 — 테두리는 획의 1/3 정도 안쪽에 붙어 있다
    ring = max(3, int(min(H, W) * 0.008) | 1)
    dark_near = cv2.dilate(dark, np.ones((ring * 2 + 1, ring * 2 + 1), np.uint8))

    # ③ 「획이 가늘어야 한다」 — 이게 흰 가운·하늘 같은 「넓은 밝은 면」을 걸러낸다.
    #    열림연산으로 지워지는 것만 글자 획이다. 넓은 면은 열림에도 살아남는다.
    stroke_k = max(7, int(min(H, W) * 0.022) | 1)
    wide = cv2.morphologyEx(bright, cv2.MORPH_OPEN, np.ones((stroke_k, stroke_k), np.uint8))
    thin = cv2.subtract(bright, wide)

    cand = (thin & dark_near).astype(np.uint8)  # ①+③ 통과한 점들

    if cand.sum() < 30:
        return (np.zeros((H, W), np.uint8), []) if return_boxes else np.zeros((H, W), np.uint8)

    # ②번 조건 — 가로줄별 개수
    row = cand.sum(axis=1).astype(np.float32)
    kk = max(3, (bh // 60) | 1)
    row = cv2.GaussianBlur(row.reshape(-1, 1), (1, kk), 0).ravel()
    row_thr = max(bw * 0.010, row.max() * 0.22)
    max_h = max(min_h + 1, int(bh * max_h_ratio))

    boxes = []
    for y0, y1 in _runs(row > row_thr, min_h):
        if (y1 - y0) > max_h:
            continue
        strip = cand[y0:y1]
        col = strip.sum(axis=0).astype(np.float32)
        # 글자 사이 공백을 메워 한 줄로 잇는다
        gap = max(5, (y1 - y0))
        col_on = cv2.dilate(
            (col > 0).astype(np.uint8).reshape(1, -1), np.ones((1, gap * 2 + 1), np.uint8)
        ).ravel()
        for x0, x1 in _runs(col_on > 0, max(int(bw * 0.03), 12)):
            seg = strip[:, x0:x1]
            if seg.sum() < (x1 - x0) * 0.15:  # 너무 듬성듬성하면 글자가 아니다
                continue
            if (x1 - x0) < (y1 - y0) * 1.1:  # 자막 줄은 세로보다 가로가 길다
                continue
            boxes.append((bx + x0, by + y0, x1 - x0, y1 - y0))

    mask = np.zeros((H, W), np.uint8)
    for x, y, w, h in boxes:
        if fill_box:
            mask[y : y + h, x : x + w] = 255
        else:
            # 상자 안에서 「글자(밝은 가는 획)」를 뽑고 테두리까지 덮이도록 부풀린다
            sub_b = thin[y - by : y - by + h, x - bx : x - bx + w] * 255
            sub_d = dark[y - by : y - by + h, x - bx : x - bx + w] * 255
            core = cv2.dilate(sub_b, np.ones((ring * 2 + 1, ring * 2 + 1), np.uint8))
            outline = cv2.bitwise_and(sub_d, core)  # 글자에 붙은 어두운 테두리만
            m = cv2.bitwise_or(sub_b, outline)
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((ring, ring), np.uint8))
            mask[y : y + h, x : x + w] = np.maximum(mask[y : y + h, x : x + w], m)

    if grow > 0 and mask.any():
        g = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow * 2 + 1, grow * 2 + 1))
        mask = cv2.dilate(mask, g, iterations=1)

    if return_boxes:
        return mask, boxes
    return mask


_OCR = None


def ocr_reader(langs=("ko", "en")):
    """글자 판독기(OCR). 처음 쓸 때 한 번만 올린다(모델 자동 내려받음)."""
    global _OCR
    if _OCR is None:
        try:
            import easyocr
        except ImportError:
            raise SystemExit(
                "--detector ocr 를 쓰려면: pip install easyocr\n"
                "(torch·torchvision 이 서로 맞는 판이어야 한다)"
            )
        _OCR = easyocr.Reader(list(langs), gpu=False, verbose=False)
    return _OCR


def detect_text_mask_ocr(img, grow=4, fill_box=False, min_conf=0.30, band="all",
                         return_boxes=False, min_len=1):
    """진짜 글자 판독기로 「읽히는 글자」만 찾는다 — 추측이 아니라 판독 결과다.

    빠른 방식(모양으로 추측)이 옷깃·무늬를 글자로 오인하는 걸 근본적으로 막는다.
    대신 느리다(장당 1~3초, CPU 기준).
    """
    H, W = img.shape[:2]
    bx, by, bw, bh = band_rect(band, W, H)
    roi = img[by : by + bh, bx : bx + bw]

    results = ocr_reader().readtext(cv2.cvtColor(roi, cv2.COLOR_BGR2RGB))

    mask = np.zeros((H, W), np.uint8)
    boxes = []
    for quad, text, conf in results:
        if conf < min_conf or len(text.strip()) < min_len:
            continue
        pts = np.array(quad, np.int32)
        x, y, w, h = cv2.boundingRect(pts)
        x, y = x + bx, y + by
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(W, x + w), min(H, y + h)
        if x1 <= x0 or y1 <= y0:
            continue
        boxes.append({"box": (x0, y0, x1 - x0, y1 - y0), "text": text.strip(), "conf": float(conf)})

        if fill_box:
            mask[y0:y1, x0:x1] = 255
        else:
            # 상자 안에서 글자 획만 뽑는다 (글자 사이 배경은 살린다)
            cell = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
            _, a = cv2.threshold(cell, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            # 글자가 밝은 쪽인지 어두운 쪽인지는 「적은 쪽이 글자」로 판단
            m = a if (a > 0).mean() < 0.5 else cv2.bitwise_not(a)
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
            mask[y0:y1, x0:x1] = np.maximum(mask[y0:y1, x0:x1], m)

    if grow > 0 and mask.any():
        g = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow * 2 + 1, grow * 2 + 1))
        mask = cv2.dilate(mask, g, iterations=1)

    if return_boxes:
        return mask, boxes
    return mask


def mask_from_box(shape, box):
    H, W = shape[:2]
    m = np.zeros((H, W), np.uint8)
    x, y, w, h = box
    m[y : y + h, x : x + w] = 255
    return m


# ─────────────────────────────────────────────────────────────
# 2) 지우기(복원)
# ─────────────────────────────────────────────────────────────


_LAMA = None


def _lama_model():
    """딥러닝 복원 모델(LaMa). 처음 쓸 때 한 번만 올린다(약 200MB 내려받음)."""
    global _LAMA
    if _LAMA is None:
        try:
            from simple_lama_inpainting import SimpleLama
        except ImportError:
            raise SystemExit(
                "--method lama 를 쓰려면: pip install torch simple-lama-inpainting\n"
                "(설치가 부담되면 --method telea 로도 충분한 경우가 많다)"
            )
        _LAMA = SimpleLama()
    return _LAMA


def inpaint(img, mask, radius=5, method="telea"):
    """마스크 부분을 주변 배경으로 메운다.

    telea/ns = 가볍고 빠름. 배경이 단순하면 충분.
    lama     = 딥러닝. 배경이 복잡(사람 얼굴·글씨·무늬)해도 자연스럽게 그려낸다. 느림.
    """
    if not mask.any():
        return img.copy()
    if method == "lama":
        return _lama_inpaint(img, mask)
    flag = cv2.INPAINT_TELEA if method == "telea" else cv2.INPAINT_NS
    return cv2.inpaint(img, mask, radius, flag)


def _lama_inpaint(img, mask, pad=48):
    """LaMa 복원. 자막 주변만 잘라서 돌린다 — 전체 화면을 돌리면 몇 배 느리다."""
    from PIL import Image

    H, W = img.shape[:2]
    ys, xs = np.where(mask > 0)
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + 1 + pad)
    crop = img[y0:y1, x0:x1]
    cmask = mask[y0:y1, x0:x1]

    res = _lama_model()(
        Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)), Image.fromarray(cmask)
    )
    filled = cv2.cvtColor(np.array(res), cv2.COLOR_RGB2BGR)
    filled = filled[: crop.shape[0], : crop.shape[1]]  # 모델이 8의 배수로 패딩할 수 있다

    out = img.copy()
    region = out[y0:y1, x0:x1]
    m = cmask > 0
    region[m] = filled[m]
    out[y0:y1, x0:x1] = region
    return out


def temporal_fill(frame, mask, buf_frames, buf_masks, bbox, tol=10.0):
    """영상 전용 — 「다른 시점의 같은 자리」에서 배경을 그대로 빌려온다.

    자막은 몇 초마다 바뀌지만 그 뒤 배경은 남아 있다. 그래서 앞뒤 프레임 중
    ①그 자리에 자막이 없고 ②장면이 거의 같은 것들을 모아 중앙값을 쓰면
    「그려낸 배경」이 아니라 「진짜 배경」이 복원된다.

    반환: (복원된 프레임, 아직 못 메운 마스크)
    """
    x, y, w, h = bbox
    if w <= 0 or h <= 0:
        return frame, mask

    cur = frame[y : y + h, x : x + w].astype(np.float32)
    cur_m = mask[y : y + h, x : x + w] > 0
    if not cur_m.any():
        return frame, mask

    cands = []
    outside = ~cur_m
    for f, m in zip(buf_frames, buf_masks):
        crop = f[y : y + h, x : x + w].astype(np.float32)
        cm = m[y : y + h, x : x + w] > 0
        # 장면이 얼마나 같은지 — 자막 아닌 부분끼리 비교
        common = outside & ~cm
        if common.sum() < 50:
            continue
        diff = np.abs(crop - cur)[common].mean()
        if diff > tol:  # 카메라가 움직였다 → 빌려오면 잔상이 생긴다
            continue
        cands.append((crop, cm))

    if not cands:
        return frame, mask

    stack = np.stack([c for c, _ in cands])  # (T,h,w,3)
    valid = np.stack([~cm for _, cm in cands])  # (T,h,w)
    stack[~np.broadcast_to(valid[..., None], stack.shape)] = np.nan

    with np.errstate(all="ignore"):
        med = np.nanmedian(stack, axis=0)
    filled_ok = ~np.isnan(med[..., 0])

    use = cur_m & filled_ok
    if not use.any():
        return frame, mask

    out = frame.copy()
    region = out[y : y + h, x : x + w]
    region[use] = np.clip(med[use], 0, 255).astype(np.uint8)
    out[y : y + h, x : x + w] = region

    # 아직 못 메운 자리만 남겨서 돌려준다 (그건 그림 그려 메운다)
    rest = mask.copy()
    rest_region = rest[y : y + h, x : x + w]
    rest_region[use] = 0
    rest[y : y + h, x : x + w] = rest_region

    # 경계 티 안 나게 살짝 문지르기
    edge = cv2.dilate(use.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)) - (
        use.astype(np.uint8) * 255
    )
    if edge.any():
        blur = cv2.GaussianBlur(out[y : y + h, x : x + w], (3, 3), 0)
        eb = edge > 0
        rr = out[y : y + h, x : x + w]
        rr[eb] = blur[eb]
        out[y : y + h, x : x + w] = rr

    return out, rest


# ─────────────────────────────────────────────────────────────
# 3) 새 문구 얹기
# ─────────────────────────────────────────────────────────────


def draw_text(img, box, text, font_path=None, color=(255, 255, 255), stroke=(0, 0, 0)):
    """지운 자리에 새 문구를 같은 크기로 얹는다 (흰 글자 + 검은 테두리)."""
    from PIL import Image, ImageDraw, ImageFont

    font_path = font_path or (FONT_BOLD if os.path.exists(FONT_BOLD) else None)
    if not font_path or not os.path.exists(font_path):
        raise SystemExit(f"한글 폰트를 못 찾았다: {font_path}")

    x, y, w, h = box
    pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil)

    # 상자에 딱 맞게 글자 크기 자동 조절
    size = max(10, int(h * 0.9))
    while size > 8:
        font = ImageFont.truetype(font_path, size)
        l, t, r, b = draw.textbbox((0, 0), text, font=font, stroke_width=max(1, size // 14))
        if (r - l) <= w and (b - t) <= h * 1.15:
            break
        size -= 1
    font = ImageFont.truetype(font_path, size)
    sw = max(1, size // 14)
    l, t, r, b = draw.textbbox((0, 0), text, font=font, stroke_width=sw)
    tx = x + (w - (r - l)) // 2 - l
    ty = y + (h - (b - t)) // 2 - t
    draw.text(
        (tx, ty),
        text,
        font=font,
        fill=color[::-1],
        stroke_width=sw,
        stroke_fill=stroke[::-1],
    )
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


# ─────────────────────────────────────────────────────────────
# 4) 이미지 처리
# ─────────────────────────────────────────────────────────────


def process_image(args):
    img = cv2.imdecode(np.fromfile(args.input, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"이미지를 못 읽었다: {args.input}")
    H, W = img.shape[:2]

    if args.box:
        box = parse_box(args.box, W, H)
        mask = mask_from_box(img.shape, box)
        boxes = [box]
    elif args.detector == "ocr":
        mask, found = detect_text_mask_ocr(
            img, grow=args.grow, fill_box=args.fill_box, band=args.band, return_boxes=True
        )
        boxes = [f["box"] for f in found]
        for f in found:
            print(f"  읽힌 글자: {f['text']!r} (확신도 {f['conf']:.2f})")
    else:
        mask, boxes = detect_text_mask(
            img,
            band=args.band,
            grow=args.grow,
            fill_box=args.fill_box,
            sensitivity=args.sensitivity,
            return_boxes=True,
        )

    if args.mode == "preview":
        out = img.copy()
        red = np.zeros_like(img)
        red[:, :] = (0, 0, 255)
        m3 = mask > 0
        out[m3] = cv2.addWeighted(img, 0.35, red, 0.65, 0)[m3]
        for x, y, w, h in boxes:
            cv2.rectangle(out, (x, y), (x + w, y + h), (0, 255, 255), 2)
        _write_image(out, args.output)
        print(f"[미리보기] 자막으로 본 줄: {len(boxes)}개 → {args.output}")
        for i, b in enumerate(boxes, 1):
            print(f"  {i}. --box {b[0]},{b[1]},{b[2]},{b[3]}")
        return

    if not mask.any():
        print("[주의] 자막을 못 찾았다. --band all / --sensitivity 낮추기 / --box 직접지정 을 써봐라.")

    clean = inpaint(img, mask, args.radius, args.method)

    if args.mode == "replace":
        if not args.text:
            raise SystemExit("--mode replace 에는 --text '새 문구' 가 필요하다")
        target = boxes[0] if boxes else (int(W * 0.1), int(H * 0.8), int(W * 0.8), int(H * 0.08))
        # 여러 줄이면 가장 아래 줄에 얹는다
        if len(boxes) > 1:
            target = sorted(boxes, key=lambda b: b[1])[-1]
        clean = draw_text(clean, target, args.text, font_path=args.font)

    _write_image(clean, args.output)
    print(f"[완료] {args.input} → {args.output} (자막 줄 {len(boxes)}개 처리)")


def _write_image(img, path):
    ext = os.path.splitext(path)[1] or ".png"
    ok, buf = cv2.imencode(ext, img)
    if not ok:
        raise SystemExit(f"저장 실패: {path}")
    buf.tofile(path)


# ─────────────────────────────────────────────────────────────
# 5) 영상 처리
# ─────────────────────────────────────────────────────────────


def probe(path):
    """영상 정보 + 자막 트랙(소프트섭) 유무."""
    fp = ffprobe_exe()
    info = {"width": None, "height": None, "fps": None, "nb_frames": None, "sub_tracks": []}
    if fp:
        try:
            out = subprocess.run(
                [fp, "-v", "quiet", "-print_format", "json", "-show_streams", path],
                capture_output=True,
                text=True,
                check=True,
            ).stdout
            data = json.loads(out)
            for s in data.get("streams", []):
                if s.get("codec_type") == "video" and info["width"] is None:
                    info["width"] = s.get("width")
                    info["height"] = s.get("height")
                    r = s.get("r_frame_rate", "0/1")
                    try:
                        a, b = r.split("/")
                        info["fps"] = float(a) / float(b) if float(b) else None
                    except Exception:
                        pass
                    info["nb_frames"] = int(s["nb_frames"]) if s.get("nb_frames") else None
                elif s.get("codec_type") == "subtitle":
                    info["sub_tracks"].append(
                        {"index": s.get("index"), "codec": s.get("codec_name"),
                         "lang": (s.get("tags") or {}).get("language")}
                    )
        except Exception:
            pass
    if info["width"] is None:
        cap = cv2.VideoCapture(path)
        info["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        info["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        info["fps"] = cap.get(cv2.CAP_PROP_FPS) or 30.0
        info["nb_frames"] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or None
        cap.release()
    return info


def check_only(path):
    info = probe(path)
    print(f"해상도 {info['width']}x{info['height']}, {info['fps']:.2f}fps")
    if info["sub_tracks"]:
        print("→ 자막 트랙(소프트섭)이 있다. 이 도구 필요 없다. 트랙만 빼면 원본이 나온다:")
        print(f'   ffmpeg -i "{path}" -map 0 -map -0:s -c copy out.mp4')
        for t in info["sub_tracks"]:
            print(f"   - #{t['index']} {t['codec']} ({t['lang']})")
    else:
        print("→ 자막 트랙이 없다. 화면에 구워진 자막(하드섭)일 가능성이 높다 → 이 도구로 지운다.")
    return info


def process_video(args):
    ff = ffmpeg_exe()
    info = probe(args.input)
    W, H, fps = info["width"], info["height"], info["fps"] or 30.0
    total = info["nb_frames"]

    fixed_box = parse_box(args.box, W, H) if args.box else None

    dec = subprocess.Popen(
        [ff, "-v", "error", "-i", args.input, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
        stdout=subprocess.PIPE,
        bufsize=10 ** 8,
    )

    tmp_out = args.output + ".novideoaudio.mp4"
    enc_cmd = [
        ff, "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", f"{fps}", "-i", "-",
        "-c:v", "libx264", "-preset", args.preset, "-crf", str(args.crf), "-pix_fmt", "yuv420p",
        tmp_out,
    ]
    enc = subprocess.Popen(enc_cmd, stdin=subprocess.PIPE)

    fsize = W * H * 3
    win = args.window
    buf_f, buf_m = deque(maxlen=win * 2 + 1), deque(maxlen=win * 2 + 1)
    pending = deque()  # 아직 안 내보낸 프레임 인덱스
    written = 0
    read_n = 0
    temporal_hits = 0

    def compute_mask(frame):
        if fixed_box:
            return mask_from_box(frame.shape, fixed_box)
        if args.detector == "ocr":
            return detect_text_mask_ocr(
                frame, grow=args.grow, fill_box=args.fill_box, band=args.band
            )
        return detect_text_mask(
            frame, band=args.band, grow=args.grow, fill_box=args.fill_box,
            sensitivity=args.sensitivity,
        )

    def emit(idx_in_buf):
        nonlocal written, temporal_hits
        frame = buf_f[idx_in_buf]
        mask = buf_m[idx_in_buf]
        if mask.any():
            ys, xs = np.where(mask > 0)
            bbox = (xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)
            others_f = [f for i, f in enumerate(buf_f) if i != idx_in_buf]
            others_m = [m for i, m in enumerate(buf_m) if i != idx_in_buf]
            out = frame
            rest = mask
            if not args.no_temporal:
                before = mask.sum()
                out, rest = temporal_fill(frame, mask, others_f, others_m, bbox, tol=args.motion_tol)
                if rest.sum() < before:
                    temporal_hits += 1
            if rest.any():
                out = inpaint(out, rest, args.radius, args.method)
            if args.mode == "replace" and args.text:
                out = draw_text(out, bbox, args.text, font_path=args.font)
        else:
            out = frame
        enc.stdin.write(out.tobytes())
        written += 1

    first_full = True
    while True:
        raw = dec.stdout.read(fsize)
        if len(raw) < fsize:
            break
        frame = np.frombuffer(raw, np.uint8).reshape(H, W, 3).copy()
        buf_f.append(frame)
        buf_m.append(compute_mask(frame))
        read_n += 1
        # 버퍼가 차면 가운데 프레임부터 내보낸다 (앞뒤를 다 보고 배경을 빌려오려고)
        if len(buf_f) == buf_f.maxlen:
            if first_full:
                for i in range(0, win + 1):  # 맨 앞 프레임들도 빠뜨리지 않는다
                    emit(i)
                first_full = False
            else:
                emit(win)
        if args.progress and read_n % 60 == 0:
            tail = f"/{total}" if total else ""
            print(f"  ...{read_n}{tail} 프레임", flush=True)

    # 남은 꼬리 프레임 처리
    if first_full:  # 영상이 버퍼보다 짧았다 → 통째로 처리
        for i in range(len(buf_f)):
            emit(i)
    else:
        for i in range(win + 1, len(buf_f)):
            emit(i)

    dec.stdout.close()
    dec.wait()
    enc.stdin.close()
    enc.wait()

    # 원본 소리 다시 입히기
    has_audio = True
    mux = [
        ff, "-v", "error", "-y", "-i", tmp_out, "-i", args.input,
        "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "copy",
        "-shortest", args.output,
    ]
    r = subprocess.run(mux, capture_output=True, text=True)
    if r.returncode != 0:
        has_audio = False
        os.replace(tmp_out, args.output)
    else:
        os.remove(tmp_out)

    print(
        f"[완료] {args.input} → {args.output}\n"
        f"  프레임 {written}개 / 배경을 진짜로 복원한 프레임 {temporal_hits}개"
        f" ({temporal_hits * 100 // max(1, written)}%)\n"
        f"  소리 {'유지됨' if has_audio else '없음(원본에 오디오가 없거나 복사 실패)'}"
    )


# ─────────────────────────────────────────────────────────────


def main():
    ap = argparse.ArgumentParser(
        description="한글 자막(하드섭) 지우개 — 이미지·영상에서 자막만 지우거나 새 문구로 교체",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("input", help="입력 이미지 또는 영상")
    ap.add_argument("-o", "--output", help="출력 경로 (기본: 원본이름_clean.확장자)")
    ap.add_argument("--mode", choices=["remove", "replace", "preview"], default="remove",
                    help="remove=자막만 지움 / replace=지우고 새 문구 / preview=검출영역 미리보기")
    ap.add_argument("--text", help="--mode replace 일 때 얹을 새 문구")
    ap.add_argument("--check", action="store_true", help="영상이 하드섭인지 소프트섭인지만 판정")
    ap.add_argument("--box", help="자막 영역 직접 지정 x,y,w,h (px 또는 %% — 예: 5%%,78%%,90%%,18%%)")
    ap.add_argument("--detector", choices=["fast", "ocr"], default="fast",
                    help="글자 찾는 방식. fast=모양으로 추측(빠름) / ocr=진짜로 읽어서 확인(정확, 장당 1~3초)")
    ap.add_argument("--band", choices=["bottom", "top", "middle", "all"], default="bottom",
                    help="자막을 찾을 구역 (기본: 화면 아래쪽)")
    ap.add_argument("--sensitivity", type=int, default=55,
                    help="검출 민감도 임계값. 못 찾으면 낮추고(예 35), 너무 많이 잡으면 올려라(예 80)")
    ap.add_argument("--grow", type=int, default=4, help="마스크를 몇 px 부풀릴지 (테두리·그림자 덮기)")
    ap.add_argument("--fill-box", action="store_true", help="글자 모양이 아니라 줄 상자를 통째로 지움")
    ap.add_argument("--radius", type=int, default=5, help="복원 반경")
    ap.add_argument("--method", choices=["telea", "ns", "lama"], default="telea",
                    help="복원 방식. telea=빠름(기본) / lama=딥러닝, 복잡한 배경에서 훨씬 깨끗하지만 느림")
    ap.add_argument("--font", help="새 문구에 쓸 폰트 ttf 경로 (기본: NotoSansKR-Bold)")
    # 영상 전용
    ap.add_argument("--window", type=int, default=12, help="[영상] 앞뒤 몇 프레임에서 배경을 빌려올지")
    ap.add_argument("--motion-tol", type=float, default=10.0,
                    help="[영상] 장면이 이만큼까지 같아야 배경을 빌려온다 (움직임 많으면 올려라)")
    ap.add_argument("--no-temporal", action="store_true", help="[영상] 배경 빌려오기 끄고 전부 그려서 메움")
    ap.add_argument("--crf", type=int, default=18, help="[영상] 화질 (낮을수록 고화질, 18=거의 무손실)")
    ap.add_argument("--preset", default="medium", help="[영상] 인코딩 속도 프리셋")
    ap.add_argument("--progress", action="store_true", help="[영상] 진행상황 출력")

    args = ap.parse_args()

    if not os.path.exists(args.input):
        raise SystemExit(f"파일이 없다: {args.input}")

    ext = os.path.splitext(args.input)[1].lower()
    is_video = ext in VIDEO_EXT

    if args.check:
        if not is_video:
            print("이미지는 하드섭/소프트섭 구분이 없다. 그냥 --mode preview 로 확인해라.")
        else:
            check_only(args.input)
        return

    if not args.output:
        base, e = os.path.splitext(args.input)
        suffix = {"remove": "_clean", "replace": "_replaced", "preview": "_preview"}[args.mode]
        args.output = base + suffix + (e if e else (".mp4" if is_video else ".png"))

    if is_video:
        process_video(args)
    elif ext in IMAGE_EXT:
        process_image(args)
    else:
        raise SystemExit(f"지원 안 하는 확장자: {ext}")


if __name__ == "__main__":
    main()
