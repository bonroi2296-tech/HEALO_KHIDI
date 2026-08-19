# 한글로 hwpx 를 열어 「손상」 거부 없이 열리는지 확인하고 PDF 로 내보낸다.
#   powershell -File scripts\hwp\hwp_check.ps1 -Src <문서.hwpx> -Pdf <나올.pdf>
#
# ⚠️ 2026-08-19 사고: 자동조종이 멈출 때마다 `Get-Process Hwp* | Stop-Process -Force` 를 8번 돌렸다.
#    그 명령은 «PO 가 열어둔 한글 창까지 전부» 강제로 닫는다. 저장 안 한 편집은 그대로 날아간다.
#    → 이제 «내가 띄운 한글»만 닫는다. 실행 «전»부터 떠 있던 것은 절대 건드리지 않는다.
#    → 앞으로 한글을 끌 일이 있으면 이 스크립트를 쓰고, Get-Process Hwp* 를 직접 죽이지 마라.
param([string]$Src, [string]$Pdf)

$before = @(Get-Process Hwp*, HwpApi* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
if ($before.Count -gt 0) { Write-Output ("이미 떠 있던 한글(건드리지 않음): " + ($before -join ', ')) }

try {
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
} catch {
    Write-Output ("FAIL: " + $_.Exception.Message)
} finally {
    # 이 실행으로 «새로 생긴» 한글만 정리한다
    Start-Sleep -Milliseconds 800
    $mine = @(Get-Process Hwp*, HwpApi* -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
    foreach ($p in $mine) {
        Write-Output ("내가 띄운 한글 정리: " + $p.Name + " (" + $p.Id + ")")
        try { $p | Stop-Process -Force -ErrorAction Stop } catch { }
    }
}
