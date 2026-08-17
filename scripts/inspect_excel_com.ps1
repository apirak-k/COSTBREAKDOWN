$filePath = "C:\Users\ai-project\Documents\Cost Breakdown Project\excel_models\v2_modular\CostModel_TEST_SCENARIOS_v2.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Open($filePath)
$excel.CalculateFull()

Write-Host "==================== SHEET 4: EXECUTIVE SUMMARY ===================="
$ws4 = $wb.Sheets.Item("4_SUMMARY_&_COMPARISON")
for ($r = 4; $r -le 8; $r++) {
    $rowText = ""
    for ($c = 1; $c -le 6; $c++) {
        $val = $ws4.Cells.Item($r, $c).Text
        $rowText += "[$val]`t"
    }
    Write-Host "Row $r : $rowText"
}

Write-Host "`n==================== SHEET 4: TOP COST DRIVERS ===================="
for ($r = 12; $r -le 22; $r++) {
    $rowText = ""
    for ($c = 1; $c -le 10; $c++) {
        $val = $ws4.Cells.Item($r, $c).Text
        $rowText += "[$val]`t"
    }
    Write-Host "Row $r : $rowText"
}

Write-Host "`n==================== SHEET 5: _CALC_ENGINE SAMPLES ===================="
$ws5 = $wb.Sheets.Item("_CALC_ENGINE")
for ($r = 3; $r -le 25; $r++) {
    $rowText = ""
    for ($c = 1; $c -le 8; $c++) {
        $val = $ws5.Cells.Item($r, $c).Text
        $rowText += "[$val]`t"
    }
    Write-Host "Row $r : $rowText"
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
