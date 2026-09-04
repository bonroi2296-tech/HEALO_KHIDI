# -*- coding: utf-8 -*-
"""presentation.xml 의 saveSubsetFonts 를 0 으로 되돌린다.

글꼴 파일(ppt/fonts/*)은 손대지 않는다 — 이 값은 「다음 저장 때 글자를 잘라라」는 표시일 뿐이라
지금 담긴 글꼴이 온전하면 표시만 꺼도 「모든 글자」 방식이 된다. 파워포인트를 열 필요가 없다.
"""
import sys, io, zipfile, shutil, re, os

src = sys.argv[1]
tmp = src + ".tmp"
zin = zipfile.ZipFile(src, "r")
names = zin.namelist()
before = zin.read("ppt/presentation.xml").decode("utf-8")
after = re.sub(r'saveSubsetFonts="1"', 'saveSubsetFonts="0"', before)
if after == before:
    print("바꿀 것 없음 (이미 0 이거나 속성이 없음)")
    zin.close(); sys.exit(0)

zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
for n in names:
    data = zin.read(n)
    if n == "ppt/presentation.xml":
        data = after.encode("utf-8")
    zout.writestr(zin.getinfo(n), data)   # 압축정보를 그대로 물려준다
zout.close(); zin.close()
os.replace(tmp, src)
print("saveSubsetFonts 1 → 0 완료")
