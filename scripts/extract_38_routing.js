import ExcelJS from 'exceljs'

async function extractFull38Routing() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile('Sources/250331 Cost declare XXXX-024,025,026-01.xlsx')
  const ws = wb.getWorksheet('XXXX-024,025,026-01')
  
  const rows = []
  ws.eachRow((row, r) => {
    if (r >= 28 && r <= 79) {
      const vals = row.values
      // Col B = Section, Col C = Process Name, Col D = Cap (pc/hr), Col E = Hr/pc, Col F = Man, Col G = Run time, Col H = Labor rate, Col I = Burden rate, Col J = Labor cost, Col K = Burden cost, Col L = Total, Col M = %, Col O = Yield
      if (vals[2] || vals[3]) {
        rows.push({
          rowNum: r,
          section: vals[2] || '',
          name: vals[3] || '',
          cap: typeof vals[4] === 'number' ? vals[4] : null,
          man: typeof vals[6] === 'number' ? vals[6] : (vals[6]?.result || null),
          runtime: typeof vals[7] === 'number' ? vals[7] : (vals[7]?.result || null),
          lRate: typeof vals[8] === 'number' ? vals[8] : (vals[8]?.result || null),
          bRate: typeof vals[9] === 'number' ? vals[9] : (vals[9]?.result || null),
          lCost: typeof vals[10] === 'number' ? vals[10] : (vals[10]?.result || null),
          bCost: typeof vals[11] === 'number' ? vals[11] : (vals[11]?.result || null),
          totalCost: typeof vals[12] === 'number' ? vals[12] : (vals[12]?.result || null),
          yieldPct: typeof vals[15] === 'number' ? vals[15] : (vals[15]?.result || null)
        })
      }
    }
  })
  console.log(JSON.stringify(rows, null, 2))
}
extractFull38Routing()
