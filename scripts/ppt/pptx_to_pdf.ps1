# Convert a .pptx to .pdf using PowerPoint itself.
#
#   powershell -File scripts\ppt\pptx_to_pdf.ps1 -Src <deck.pptx> -Pdf <out.pdf>
#
# WHY (2026-08-20, PO decision):
#   The PO reads the PDF and tells me what to change; I keep the editable file free.
#   If the PO opens the .pptx / .hwpx directly, Windows locks it and I cannot overwrite it,
#   which cost us a round trip. So every deliverable ships as a PAIR: editable file + PDF.
#
# SAFETY: only closes the presentation this script opened, and only quits PowerPoint if
#   it was not already running. The PO's own PowerPoint windows are never touched.
param([Parameter(Mandatory = $true)][string]$Src,
      [Parameter(Mandatory = $true)][string]$Pdf)

$Src = (Resolve-Path $Src).Path
$wasRunning = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
if ($wasRunning) { Write-Output "PowerPoint already running - will not quit it" }

$app = $null; $pres = $null
try {
    $app = New-Object -ComObject PowerPoint.Application
    $pres = $app.Presentations.Open($Src, $true, $false, $false)   # ReadOnly, no window
    Write-Output ("SLIDES=" + $pres.Slides.Count)
    $pres.SaveAs($Pdf, 32)                                          # 32 = ppSaveAsPDF
    Write-Output ("PDF=" + (Test-Path $Pdf))
} catch {
    Write-Output ("FAIL: " + $_.Exception.Message)
    exit 1
} finally {
    if ($pres) { try { $pres.Close() } catch {} }
    if ($app -and -not $wasRunning) { try { $app.Quit() } catch {} }
}
