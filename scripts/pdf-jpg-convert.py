# PDF ↔ JPG 양방향 변환 (PyMuPDF 하나로)
#
# 준 것을 보고 방향을 알아서 정한다:
#   PDF   → 쪽마다 JPG (PDF 바로 옆에. 1쪽이면 <이름>.jpg, 여러 쪽이면 <이름>-1.jpg ...)
#   사진  → PDF (한 장 = PDF 한 개. 절대 안 합친다. A4 세로에 비율 유지)
#   폴더  → 하위 폴더까지 훑어서 위 규칙대로 하나씩
#
# 사용:  python scripts/pdf-jpg-convert.py <파일·폴더 ...>
#        (PO PC 에서는 pythonw.exe 로 조용히 돈다 — 창이 안 뜬다)
# ponytail: 이미 깔려 있는 PyMuPDF 만 쓴다. 외부 프로그램(poppler 등) 안 부른다.

import os
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

IMG_EXT = {".jpg", ".jpeg", ".png"}
DPI = 150
A4 = fitz.paper_rect("a4")

# 창 없이(pythonw) 돌면 sys.stdout 이 None 이라 print 가 터진다 → 허공으로 흘린다
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")


def alert(msg: str):
    """조용히 도는 중이라 실패는 알림창으로만 알린다"""
    import ctypes

    ctypes.windll.user32.MessageBoxW(0, msg[:1500], "PDF-JPG 변환", 0x10)
    print(msg)


def natural_key(p: Path):
    """전표-2.jpg 가 전표-10.jpg 앞에 오도록 숫자는 숫자로 비교"""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]


# ---------- PDF → JPG ----------
def pdf_to_jpg(pdf: Path) -> int:
    with fitz.open(pdf) as doc:
        single = doc.page_count == 1
        for i, page in enumerate(doc, start=1):
            out = pdf.with_suffix(".jpg") if single else pdf.with_name(f"{pdf.stem}-{i}.jpg")
            page.get_pixmap(dpi=DPI).save(out, jpg_quality=85)  # 85 = 눈에 차이 없고 파일 30% 작음
        return doc.page_count


# ---------- 사진 → PDF ----------
def image_to_pdf(img: Path) -> Path:
    with fitz.open(img) as src:
        w, h = src[0].rect.width, src[0].rect.height
    scale = min(A4.width / w, A4.height / h)              # A4 안에 비율 유지, 가운데
    tw, th = w * scale, h * scale
    rect = fitz.Rect((A4.width - tw) / 2, (A4.height - th) / 2,
                     (A4.width + tw) / 2, (A4.height + th) / 2)
    out = img.with_suffix(".pdf")
    doc = fitz.open()
    doc.new_page(width=A4.width, height=A4.height).insert_image(rect, filename=str(img))
    doc.save(out)
    doc.close()
    return out


# ---------- 할 일 정하기 ----------
def plan(targets):
    """바꿀 것 목록(PDF들, 사진들)을 변환 «전»에 다 정해둔다 —
    안 그러면 방금 만든 JPG 를 다시 PDF 로 바꾸는 꼬리물기가 난다."""
    pdfs, images = [], []

    for t in targets:
        if t.is_dir():
            for folder in [t, *(d for d in t.rglob("*") if d.is_dir())]:
                files = [f for f in folder.iterdir() if f.is_file()]
                pdfs += [f for f in files if f.suffix.lower() == ".pdf"]
                images += [f for f in files if f.suffix.lower() in IMG_EXT]
        elif t.suffix.lower() == ".pdf":
            pdfs.append(t)
        elif t.suffix.lower() in IMG_EXT:
            images.append(t)

    # 사진은 한 장 = PDF 한 개 (여러 장 줘도 안 합친다)
    return sorted(pdfs, key=natural_key), sorted(images, key=natural_key)


def main(argv):
    if not argv:
        print("PDF·사진 파일이나 폴더를 끌어다 놓아라.")
        return 0

    targets = [Path(a) for a in argv]
    missing = [t for t in targets if not t.exists()]
    if missing:
        alert("못 찾은 것:\n" + "\n".join(str(m) for m in missing))
        return 1

    pdfs, images = plan(targets)
    if not pdfs and not images:
        alert("바꿀 PDF·사진이 없다:\n" + "\n".join(str(t) for t in targets))
        return 0
    print(f"PDF {len(pdfs)}개 → 사진 / 사진 {len(images)}장 → PDF. 하나씩 따로 만든다...")

    failed = []
    for pdf in pdfs:
        try:
            n = pdf_to_jpg(pdf)
            print(f"  {pdf.name} → JPG {n}장 ({pdf.parent})")
        except Exception as e:  # 하나 깨져도 나머지는 계속
            failed.append(f"{pdf} — {e}")
            print(f"  ✗ 실패: {pdf.name}")

    for img in images:
        try:
            out = image_to_pdf(img)
            print(f"  {img.name} → {out.name} ({out.parent})")
        except Exception as e:
            failed.append(f"{img} — {e}")
            print(f"  ✗ 실패: {img.name}")

    if failed:
        alert(f"{len(failed)}개 실패:\n\n" + "\n".join(failed))
    else:
        print("\n끝. 원본은 그대로 두고 옆에 새 파일만 만들었다.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Exception as e:  # 창 없이 도니까 터진 것도 알림창으로 알린다
        alert(f"변환 중 오류가 났다:\n\n{type(e).__name__}: {e}")
        sys.exit(1)
