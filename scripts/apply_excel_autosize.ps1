param (
    [string]$FilePath
)

if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

$resolvedPath = (Resolve-Path $FilePath).Path

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $wb = $excel.Workbooks.Open($resolvedPath)
    
    foreach ($ws in $wb.Worksheets) {
        # 1. Native Excel AutoFit on all used columns in each sheet
        $null = $ws.UsedRange.Columns.AutoFit()
        
        # 2. Native Excel AutoFit on all comments/notes
        foreach ($comment in $ws.Comments) {
            $comment.Shape.TextFrame.AutoSize = $true
        }
    }
    
    $wb.Save()
    $wb.Close()
    Write-Host "[SUCCESS] Excel Native Column AutoFit & Note AutoSize applied to: $resolvedPath"
} catch {
    Write-Error "Error applying AutoSize: $_"
    exit 1
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
