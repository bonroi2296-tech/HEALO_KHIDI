# HTML → HWPX + PDF 변환 (한글 Office COM 자동화)
#
# 사용:  pwsh -File scripts/html-to-hwpx.ps1 "docs/marketing/이대서울_촬영기획안.html"
#        → 같은 폴더에 .hwpx / .pdf 생성
#
# ⚠️ hwpx 를 Python·zip 으로 직접 조립하지 마라. 한글이 "손상된 파일"로 거부한다(실패 이력 있음).
#    반드시 한글 프로그램이 직접 저장하게 할 것 = 이 스크립트.
#
# ⚠️ 한글의 HTML 필터는 CSS class 를 읽지 않는다. 색·배경·정렬은 반드시 인라인 속성으로:
#    bgcolor="#E8F0F0" align="center" border="1" cellpadding="5"  (style= 은 글자크기·색 정도만 먹음)
#    class 로 스타일 주면 전부 회색으로 날아가고 정렬이 가운데로 튄다.

param([Parameter(Mandatory=$true)][string]$HtmlPath)

$html = (Resolve-Path $HtmlPath).Path
$hwpx = [IO.Path]::ChangeExtension($html, "hwpx")
$pdf  = [IO.Path]::ChangeExtension($html, "pdf")

$hwp = New-Object -ComObject HWPFrame.HwpObject
try { $hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule") | Out-Null } catch {}
try { $hwp.XHwpWindows.Item(0).Visible = $false } catch {}

if (-not $hwp.Open($html, "HTML", "")) { throw "HTML 열기 실패: $html" }
if (-not $hwp.SaveAs($hwpx, "HWPX", "")) { throw "HWPX 저장 실패" }
if (-not $hwp.SaveAs($pdf,  "PDF",  "")) { throw "PDF 저장 실패" }

"$($hwp.PageCount)쪽 → $hwpx"
"$($hwp.PageCount)쪽 → $pdf"

$hwp.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($hwp) | Out-Null
