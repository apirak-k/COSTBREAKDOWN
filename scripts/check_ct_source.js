import ExcelJS from 'exceljs'

async function scan() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile('Sources/250331 Cost declare XXXX-024,025,026-01.xlsx')
  console.log('Worksheets:', wb.worksheets.map(w => w.name))
  
  for (let ws of wb.worksheets) {
    console.log(`\n=== Worksheet: ${ws.name} ===`)
    ws.eachRow((row, r) => {
      if (r <= 35) {
        console.log(`Row ${r}:`, JSON.stringify(row.values))
      }
    })
  }
}
scan()
