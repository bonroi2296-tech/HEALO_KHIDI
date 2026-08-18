# 한글로 hwpx 를 열어 「손상」 거부 없이 열리는지 확인하고 PDF 로 내보낸다.
#   powershell -File scripts\hwp\hwp_check.ps1 -Src <문서.hwpx> -Pdf <나올.pdf>
param([string]$Src, [string]$Pdf)

$hwp = New-Object -ComObject HWPFrame.HwpObject
try { $hwp.RegisterModule('FilePathCheckDLL', 'FilePathChecker') | Out-Null } catch { }
$opened = $hwp.Open($Src, 'HWPX', 'forceopen:true')
Write-Output "OPEN=$opened"
if ($opened) {
    Write-Output ("PAGES=" + $hwp.PageCount)
    if ($Pdf) {
        $hwp.HAction.GetDefault('FileSaveAsPdf', $hwp.HParameterSet.HFileOpenSave.HSet) | Out-Null
        $hwp.HParameterSet.HFileOpenSave.filename = $Pdf
        $hwp.HParameterSet.HFileOpenSave.Format = 'PDF'
        $hwp.HAction.Execute('FileSaveAsPdf', $hwp.HParameterSet.HFileOpenSave.HSet) | Out-Null
        Write-Output ("PDF=" + (Test-Path $Pdf))
    }
}
$hwp.Clear(1)
$hwp.Quit()
