try {
    $excel = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
    if ($excel) {
        foreach ($wb in $excel.Workbooks) {
            if ($wb.FullName -like "*CostModel_RGOM-024_v2.xlsx*" -or $wb.FullName -like "*CostModel_BLANK_TEMPLATE_v2.xlsx*") {
                $wb.Close($false)
                Write-Host "Closed open workbook: $($wb.FullName)"
            }
        }
    }
} catch {
    Write-Host "No active Excel lock found or already accessible."
}
