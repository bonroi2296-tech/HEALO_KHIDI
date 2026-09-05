#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""자가검증 — 「자막 굽기 → 지우기 → 원본과 대조」로 지우개 성능을 숫자로 잰다.

원본을 알고 있는 상태에서 자막을 직접 구우면, 지운 결과가 원본과 얼마나 같은지
PSNR(높을수록 같음, 40dB 이상이면 눈으로 구분 불가 수준)로 실측할 수 있다.
"""
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


def burn(img, text, y_ratio=0.82, size_ratio=0.055):
    """이미지 아래쪽에 흰 글자 + 검은 테두리 자막을 굽는다 (실제 자막과 같은 모양)."""
    H, W = img.shape[:2]
    pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    d = ImageDraw.Draw(pil)
    size = max(14, int(H * size_ratio))
    font = ImageFont.truetype(FONT, size)
    sw = max(2, size // 12)
    l, t, r, b = d.textbbox((0, 0), text, font=font, stroke_width=sw)
    x = (W - (r - l)) // 2 - l
    y = int(H * y_ratio) - t
    d.text((x, y), text, font=font, fill=(255, 255, 255), stroke_width=sw, stroke_fill=(0, 0, 0))
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR), (x + l, y + t, r - l, b - t)


def psnr(a, b, roi=None):
    if roi:
        x, y, w, h = roi
        a, b = a[y : y + h, x : x + w], b[y : y + h, x : x + w]
    mse = np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2)
    return float("inf") if mse == 0 else 10 * np.log10(255.0 ** 2 / mse)


def run(cmd):
    r = subprocess.run([sys.executable] + cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        raise SystemExit("도구 실행 실패")
    return r.stdout.strip()


def test_images(out_dir, methods=("telea","lama")):
    samples = [
        ("public/doctors/68ac266eec3443.90360671.jpg", "한국 최고의 암 전문의"),
        ("public/doctors/68a42d8de9e095.75488957.jpg", "무료 사전상담 신청하기"),
        ("public/doctors/6a040390c37997.97100336.jpg", "서울 대형병원 직접 연결"),
    ]
    rows = []
    for rel, text in samples:
        src = os.path.join(REPO, rel)
        if not os.path.exists(src):
            continue
        orig = cv2.imdecode(np.fromfile(src, np.uint8), cv2.IMREAD_COLOR)
        if orig is None:
            continue
        # 너무 크면 축소 (테스트 속도)
        if orig.shape[1] > 1280:
            s = 1280 / orig.shape[1]
            orig = cv2.resize(orig, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)

        name = os.path.splitext(os.path.basename(rel))[0][:12]
        p_orig = os.path.join(out_dir, f"{name}_0원본.png")
        p_sub = os.path.join(out_dir, f"{name}_1자막.png")
        p_clean = os.path.join(out_dir, f"{name}_2지움.png")
        p_prev = os.path.join(out_dir, f"{name}_3검출.png")

        subbed, box = burn(orig, text)
        cv2.imwrite(p_orig, orig)
        cv2.imwrite(p_sub, subbed)

        run([TOOL, p_sub, "--mode", "preview", "-o", p_prev])

        pad = 12
        roi = (max(0, box[0] - pad), max(0, box[1] - pad), box[2] + pad * 2, box[3] + pad * 2)
        before = psnr(orig, subbed, roi)

        # 「진짜 자막이 있던 자리」 지도 + 그 자리에서 멀리 떨어진 곳(= 진짜 오검출)
        true_text = np.abs(orig.astype(int) - subbed.astype(int)).sum(2) > 12
        near_text = (
            cv2.dilate(true_text.astype(np.uint8), np.ones((13, 13), np.uint8)) > 0
        )  # 글자 경계 번짐은 정상이라 봐준다

        line = f"  {name}: 자막있음 {before:5.1f}dB"
        for method in methods:
            p_out = p_clean.replace("2지움", f"2지움_{method}")
            run([TOOL, p_sub, "-o", p_out, "--method", method])
            clean = cv2.imread(p_out)
            after = psnr(orig, clean, roi)
            changed = np.abs(subbed.astype(int) - clean.astype(int)).sum(2) > 12
            recall = changed[true_text].mean() * 100 if true_text.any() else 0.0
            far = int((changed & ~near_text).sum())
            rows.append((name, method, before, after, recall, far))
            line += (
                f" | {method}: {after:5.1f}dB 지움{recall:5.1f}% 오검출{far:5d}px"
            )
        print(line)
    return rows


def test_video(out_dir):
    """정지 배경 + 바뀌는 자막 = 실제 유튜브 인터뷰/설명 영상과 같은 조건."""
    src = os.path.join(REPO, "public/doctors/68ac266eec3443.90360671.jpg")
    base = cv2.imdecode(np.fromfile(src, np.uint8), cv2.IMREAD_COLOR)
    base = cv2.resize(base, (854, 480), interpolation=cv2.INTER_AREA)

    lines = ["안녕하세요 환자 여러분", "한국 병원 상담은 무료입니다", "지금 바로 신청하세요"]
    frames_orig, frames_sub = [], []
    N = 90
    for i in range(N):
        # 아주 약한 손떨림(1px 이하)을 준다 — 완전 정지보다 현실적
        f = base.copy()
        frames_orig.append(f)
        s, _ = burn(f, lines[(i // 30) % len(lines)], y_ratio=0.85, size_ratio=0.07)
        frames_sub.append(s)

    p_sub = os.path.join(out_dir, "video_1자막.mp4")
    p_clean = os.path.join(out_dir, "video_2지움.mp4")
    write_video(frames_sub, p_sub)
    print(run([TOOL, p_sub, "-o", p_clean, "--window", "12"]))

    cap = cv2.VideoCapture(p_clean)
    vals = []
    idx = 0
    while True:
        ok, fr = cap.read()
        if not ok or idx >= N:
            break
        y0 = int(480 * 0.72)
        vals.append(psnr(frames_orig[idx][y0:], fr[y0:]))
        idx += 1
    cap.release()

    # 비교군: 자막 그대로일 때의 PSNR
    capb = cv2.VideoCapture(p_sub)
    base_vals = []
    j = 0
    while True:
        ok, fr = capb.read()
        if not ok or j >= N:
            break
        y0 = int(480 * 0.72)
        base_vals.append(psnr(frames_orig[j][y0:], fr[y0:]))
        j += 1
    capb.release()
    return float(np.mean(base_vals)), float(np.mean(vals)), idx


def write_video(frames, path):
    import imageio_ffmpeg

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    H, W = frames[0].shape[:2]
    p = subprocess.Popen(
        [ff, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
         "-r", "30", "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", path],
        stdin=subprocess.PIPE,
    )
    for f in frames:
        p.stdin.write(f.tobytes())
    p.stdin.close()
    p.wait()


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "_selftest_out")
    os.makedirs(out, exist_ok=True)
    methods = os.environ.get("METHODS", "telea,lama").split(",")
    print(f"=== 이미지 테스트 (복원방식: {methods}) ===")
    rows = test_images(out, methods)
    print("\n=== 영상 테스트 (정지 배경 + 3회 바뀌는 자막) ===")
    b, a, n = test_video(out)
    print(f"  자막영역 PSNR  자막있음 {b:.1f}dB → 지운뒤 {a:.1f}dB  (+{a-b:.1f}, {n}프레임)")
    print(f"\n결과물: {out}")
