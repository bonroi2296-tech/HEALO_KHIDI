"""pptx 의 테마 기본 글꼴을 바꾼다: 새로 치는 글자가 대체 글꼴로 바뀌는 것을 막는다.

증상: 글자를 새로 치면 「맑은 고딕」이 된다.
원인 두 겹
  ① 테마의 한글 기본값(script="Hang")이 「맑은 고딕」으로 박혀 있다
  ② 동아시아 칸(<a:ea>)이 비어 있어서 한글이 ①로 떨어진다
낱글자에 붙은 지정에도 latin 만 있고 ea 가 없으면 같은 일이 생기므로 함께 채운다.

    python scripts/ppt/fix_theme_fonts.py 원본.pptx 결과.pptx "제목용글꼴" "본문용글꼴"
"""
import re, sys, zipfile

def 테마고치기(x, 제목, 본문):
    def 한덩이(m):
        종류, 블록 = m.group(1), m.group(2)
        글꼴 = 제목 if 종류 == "majorFont" else 본문
        블록 = re.sub(r'<a:latin typeface="[^"]*"', f'<a:latin typeface="{글꼴}"', 블록)
        블록 = re.sub(r'<a:ea typeface="[^"]*"',    f'<a:ea typeface="{글꼴}"',    블록)
        블록 = re.sub(r'(<a:font script="(?:Hang|Hani)" typeface=")[^"]*"', rf'\1{글꼴}"', 블록)
        return f"<a:{종류}>{블록}</a:{종류}>"
    return re.sub(r"<a:(majorFont|minorFont)>(.*?)</a:\1>", 한덩이, x, flags=re.S)

def 낱글자채우기(x):
    """latin 은 있는데 ea 가 없는 자리에 같은 글꼴로 ea 를 넣는다."""
    def 한자리(m):
        덩이 = m.group(0)
        if "<a:ea " in 덩이: return 덩이
        l = re.search(r'<a:latin typeface="([^"]*)"[^>]*/>', 덩이)
        if not l: return 덩이
        return 덩이.replace(l.group(0), l.group(0) + f'<a:ea typeface="{l.group(1)}"/>')
    return re.sub(r"<a:(?:rPr|defRPr|endParaRPr)\b[^>]*>.*?</a:(?:rPr|defRPr|endParaRPr)>", 한자리, x, flags=re.S)

def 고치기(원본, 결과, 제목, 본문):
    z = zipfile.ZipFile(원본)
    센 = {"테마": 0, "낱글자": 0}
    with zipfile.ZipFile(결과, "w", zipfile.ZIP_DEFLATED) as out:
        for it in z.infolist():
            데이터 = z.read(it.filename)
            if re.match(r"ppt/theme/theme\d+\.xml$", it.filename):
                x = 데이터.decode("utf-8"); 새 = 테마고치기(x, 제목, 본문)
                if 새 != x: 센["테마"] += 1
                데이터 = 새.encode("utf-8")
            elif re.match(r"ppt/(slides|slideLayouts|slideMasters)/\w+\d+\.xml$", it.filename):
                x = 데이터.decode("utf-8"); 새 = 낱글자채우기(x)
                if 새 != x: 센["낱글자"] += 1
                데이터 = 새.encode("utf-8")
            새정보 = zipfile.ZipInfo(it.filename, it.date_time)
            새정보.compress_type, 새정보.external_attr = it.compress_type, it.external_attr
            out.writestr(새정보, 데이터)
    return 센

if __name__ == "__main__":
    r = 고치기(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    print(f"theme {r['테마']}개 · 슬라이드/마스터 {r['낱글자']}개 손봄")
