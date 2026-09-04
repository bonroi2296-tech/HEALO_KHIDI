"""pptx 에서 파일에 심어 둔 글꼴만 들어낸다. 본문·그림·배치는 그대로 옮긴다.

왜 필요한가: 에스코어드림 9종 중 7종이 「보기·인쇄만 허용(fsType=4)」이라
파워포인트가 조각 글꼴로만 넣는다. 그러면 새로 치는 글자가 대체 글꼴로 바뀐다.
파일에서 글꼴을 빼면 PC 에 설치된 진짜 글꼴을 쓰므로 편집이 정상이 된다.
(발표장에 가져갈 최종본은 반대로 글꼴을 넣어 따로 저장할 것.)

    python scripts/ppt/strip_fonts.py 원본.pptx 결과.pptx
"""
import re, shutil, sys, zipfile

def strip(원본, 결과):
    z = zipfile.ZipFile(원본)
    글꼴 = [n for n in z.namelist() if re.search(r"ppt/fonts/font\d+\.fntdata$", n)]
    뺀id = set()

    with zipfile.ZipFile(결과, "w", zipfile.ZIP_DEFLATED) as out:
        for it in z.infolist():
            if it.filename in 글꼴:
                continue
            데이터 = z.read(it.filename)

            if it.filename == "ppt/_rels/presentation.xml.rels":
                x = 데이터.decode("utf-8")
                뺀id = set(re.findall(r'Id="([^"]+)"[^>]*fonts/font\d+\.fntdata', x))
                x = re.sub(r"<Relationship[^>]*fonts/font\d+\.fntdata[^>]*/>", "", x)
                데이터 = x.encode("utf-8")

            elif it.filename == "ppt/presentation.xml":
                x = 데이터.decode("utf-8")
                x = re.sub(r"<p:embeddedFontLst>.*?</p:embeddedFontLst>", "", x, flags=re.S)
                데이터 = x.encode("utf-8")

            elif it.filename == "[Content_Types].xml":
                x = 데이터.decode("utf-8")
                x = re.sub(r'<Default[^>]*Extension="fntdata"[^>]*/>', "", x)
                데이터 = x.encode("utf-8")

            # 압축 방식을 원본 그대로 유지해야 한글이 「파일이 손상됨」으로 거부하지 않는다
            새 = zipfile.ZipInfo(it.filename, it.date_time)
            새.compress_type, 새.external_attr = it.compress_type, it.external_attr
            out.writestr(새, 데이터)

    return len(글꼴), 뺀id

if __name__ == "__main__":
    개수, ids = strip(sys.argv[1], sys.argv[2])
    print(f"글꼴 {개수}개 들어냄 (관계 {len(ids)}개 정리)")
