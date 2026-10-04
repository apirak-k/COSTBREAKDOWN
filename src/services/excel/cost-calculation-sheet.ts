import type ExcelJS from 'exceljs'

export interface CostCalculationSheetOptions {
  bomStartRow: number
  bomRowCount: number
  routingStartRow: number
  routingRowCount: number
  workCenterStartRow: number
  workCenterRowCount: number
}

const COLOR_DARK_NAVY = 'FF1E293B'
const COLOR_BORDER = 'FFE2E8F0'
const COLOR_WHITE = 'FFFFFFFF'
const COLOR_LINK = 'FF008000'
const COLOR_TEXT = 'FF0F172A'

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  left: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  right: { style: 'thin' as const, color: { argb: COLOR_BORDER } }
}

function getEndRow(startRow: number, rowCount: number): number {
  return startRow + Math.max(1, rowCount) - 1
}

function nonEmptyRowCountFormula(sheetName: string, columns: string[], startRow: number, rowCount: number): string {
  const endRow = getEndRow(startRow, rowCount)
  const nonEmptyTests = columns
    .map(column => `(${sheetName}!${column}${startRow}:${column}${endRow}<>"")`)
    .join('+')
  return `SUMPRODUCT(--((${nonEmptyTests})>0))`
}

function crossSheetValue(sheetName: string, column: string, row: number): string {
  return `${sheetName}!${column}${row}`
}

function setFormula(cell: ExcelJS.Cell, formula: string, linked = false): void {
  cell.value = { formula }
  cell.font = { name: 'Arial', size: 10, color: { argb: linked ? COLOR_LINK : COLOR_TEXT } }
  cell.border = thinBorder
}

function setHeader(row: ExcelJS.Row, columns: number): void {
  for (let column = 1; column <= columns; column += 1) {
    const cell = row.getCell(column)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DARK_NAVY } }
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_WHITE } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder
  }
}

function setSection(sheet: ExcelJS.Worksheet, rowNumber: number, title: string, columns: number): void {
  sheet.mergeCells(rowNumber, 1, rowNumber, columns)
  const cell = sheet.getCell(rowNumber, 1)
  cell.value = title
  cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLOR_DARK_NAVY } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF3F8' } }
}

function calcCostFormula(
  routingRow: number,
  rateColumn: 'B' | 'C',
  workCenterStartRow: number,
  workCenterRowCount: number
): string {
  const workCenterEndRow = getEndRow(workCenterStartRow, workCenterRowCount)
  const workCenterKeys = `$Z$${workCenterStartRow}:$Z$${workCenterEndRow}`
  const routingWC = crossSheetValue('ROUTING', 'B', routingRow)
  const key = `LOWER(TRIM(${routingWC}))`
  const matchCount = `COUNTIF(${workCenterKeys},${key})`
  const rateRange = `WORK_CENTER!$${rateColumn}$${workCenterStartRow}:$${rateColumn}$${workCenterEndRow}`
  const rate = `INDEX(${rateRange},MATCH(${key},${workCenterKeys},0))`
  const manning = crossSheetValue('ROUTING', 'C', routingRow)
  const capacity = crossSheetValue('ROUTING', 'D', routingRow)
  const yieldValue = crossSheetValue('ROUTING', 'E', routingRow)
  const hasNoData = `COUNTA(ROUTING!A${routingRow}:F${routingRow})=0`
  const invalidInputs = `OR(NOT(ISNUMBER(${manning})),NOT(ISNUMBER(${capacity})),NOT(ISNUMBER(${yieldValue})),${capacity}<=0,${yieldValue}<=0,TRIM(${routingWC})="")`

  return `IF(${hasNoData},"",IF(${invalidInputs},"Unavailable",IF(${matchCount}<>1,"Unavailable",IF(NOT(ISNUMBER(${rate})),"Unavailable",${manning}/(${capacity}*${yieldValue})*${rate}))))`
}

/** Adds a linked calculation view. Formulas mirror calculateSnapshotCost and leave incomplete costs unavailable. */
export function addCostCalculationSheet(
  workbook: ExcelJS.Workbook,
  options: CostCalculationSheetOptions
): void {
  const sheet = workbook.addWorksheet('COST_CALCULATION', { views: [{ showGridLines: true }] })
  const bomSlots = Math.max(1, options.bomRowCount)
  const routingSlots = Math.max(1, options.routingRowCount)
  const bomSectionRow = 12
  const bomHeaderRow = bomSectionRow + 1
  const bomDetailStartRow = bomHeaderRow + 1
  const routingSectionRow = bomDetailStartRow + bomSlots + 2
  const routingHeaderRow = routingSectionRow + 1
  const routingDetailStartRow = routingHeaderRow + 1

  sheet.columns = [
    { width: 30 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 20 }, { width: 22 }, { width: 22 }, { width: 24 }
  ]
  sheet.getCell('A1').value = 'STANDARD COST CALCULATION'
  sheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: COLOR_DARK_NAVY } }
  sheet.mergeCells('A1:I1')
  sheet.getCell('A2').value = 'Linked to this workbook’s dataset. Material = Usage × Price × (1 + Loss); Routing factor = Manning ÷ (Capacity × Yield); Labor and Burden use the matching Work Center rate. Formulas match the in-app Standard Cost engine. Missing or invalid inputs stay unavailable.'
  sheet.getCell('A2').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } }
  sheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' }
  sheet.mergeCells('A2:I2')
  sheet.getRow(2).height = 34

  setSection(sheet, 4, 'Standard Cost per Dataset Unit', 3)
  sheet.getRow(5).values = ['Component', 'THB / pc', 'Status']
  setHeader(sheet.getRow(5), 3)
  sheet.getCell('A6').value = 'Material'
  sheet.getCell('A7').value = 'Labor'
  sheet.getCell('A8').value = 'Burden'
  sheet.getCell('A9').value = 'Total Standard Cost'

  const bomCostRange = `F${bomDetailStartRow}:F${bomDetailStartRow + bomSlots - 1}`
  const laborCostRange = `G${routingDetailStartRow}:G${routingDetailStartRow + routingSlots - 1}`
  const burdenCostRange = `H${routingDetailStartRow}:H${routingDetailStartRow + routingSlots - 1}`
  const bomCountFormula = nonEmptyRowCountFormula('BOM', ['A', 'B', 'C', 'D', 'E', 'F'], options.bomStartRow, options.bomRowCount)
  const routingCountFormula = nonEmptyRowCountFormula('ROUTING', ['A', 'B', 'C', 'D', 'E', 'F'], options.routingStartRow, options.routingRowCount)
  setFormula(sheet.getCell('Z1'), `=${bomCountFormula}`)
  setFormula(sheet.getCell('Z2'), `=${routingCountFormula}`)
  sheet.getColumn('Z').hidden = true

  setFormula(sheet.getCell('C6'), '=IF($Z$1=0,"Unavailable: no BOM rows",IF(COUNT(' + bomCostRange + ')=$Z$1,"Available","Unavailable: check BOM inputs"))')
  setFormula(sheet.getCell('B6'), `=IF(C6="Available",SUM(${bomCostRange}),"")`)
  setFormula(sheet.getCell('C7'), '=IF($Z$2=0,"Unavailable: no Routing rows",IF(COUNT(' + laborCostRange + ')=$Z$2,"Available","Unavailable: check Routing or Work Center inputs"))')
  setFormula(sheet.getCell('B7'), `=IF(C7="Available",SUM(${laborCostRange}),"")`)
  setFormula(sheet.getCell('C8'), '=IF($Z$2=0,"Unavailable: no Routing rows",IF(COUNT(' + burdenCostRange + ')=$Z$2,"Available","Unavailable: check Routing or Work Center inputs"))')
  setFormula(sheet.getCell('B8'), `=IF(C8="Available",SUM(${burdenCostRange}),"")`)
  setFormula(sheet.getCell('C9'), '=IF(AND(C6="Available",C7="Available",C8="Available"),"Available","Unavailable: see components")')
  setFormula(sheet.getCell('B9'), '=IF(C9="Available",SUM(B6:B8),"")')
  for (const rowNumber of [6, 7, 8, 9]) {
    const label = sheet.getCell(`A${rowNumber}`)
    label.font = { name: 'Arial', size: 10, bold: rowNumber === 9, color: { argb: COLOR_TEXT } }
    label.border = thinBorder
    const amount = sheet.getCell(`B${rowNumber}`)
    amount.numFmt = '#,##0.0000;(#,##0.0000);-'
    amount.alignment = { horizontal: 'right' }
    amount.border = thinBorder
    sheet.getCell(`C${rowNumber}`).alignment = { wrapText: true }
  }

  setSection(sheet, bomSectionRow, 'Material Cost Detail — linked to BOM', 7)
  sheet.getRow(bomHeaderRow).values = ['Name', 'Usage', 'Unit', 'Price (THB)', 'Loss', 'Material Cost (THB / pc)', 'Status']
  setHeader(sheet.getRow(bomHeaderRow), 7)
  for (let index = 0; index < bomSlots; index += 1) {
    const rowNumber = bomDetailStartRow + index
    const sourceRow = options.bomStartRow + index
    const hasData = `COUNTA(BOM!A${sourceRow}:F${sourceRow})=0`
    for (const [column, sourceColumn] of [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E']] as const) {
      setFormula(sheet.getCell(`${column}${rowNumber}`), `=IF(BOM!${sourceColumn}${sourceRow}="","",BOM!${sourceColumn}${sourceRow})`, true)
    }
    setFormula(
      sheet.getCell(`F${rowNumber}`),
      `=IF(${hasData},"",IF(OR(NOT(ISNUMBER(BOM!B${sourceRow})),NOT(ISNUMBER(BOM!D${sourceRow})),NOT(ISNUMBER(BOM!E${sourceRow}))),"Unavailable",BOM!B${sourceRow}*BOM!D${sourceRow}*(1+BOM!E${sourceRow})))`
    )
    setFormula(sheet.getCell(`G${rowNumber}`), `=IF(${hasData},"",IF(ISNUMBER(F${rowNumber}),"Calculated","Unavailable: check Usage, Price, and Loss"))`)
    for (const column of ['B', 'D', 'F']) sheet.getCell(`${column}${rowNumber}`).numFmt = '#,##0.0000;(#,##0.0000);-'
    sheet.getCell(`E${rowNumber}`).numFmt = '0.00%'
  }

  setSection(sheet, routingSectionRow, 'Routing Cost Detail — linked to ROUTING and WORK_CENTER', 9)
  sheet.getRow(routingHeaderRow).values = ['Process', 'WC', 'Manning', 'Capacity', 'Yield', 'Routing Factor', 'Labor (THB / pc)', 'Burden (THB / pc)', 'Status']
  setHeader(sheet.getRow(routingHeaderRow), 9)
  for (let index = 0; index < routingSlots; index += 1) {
    const rowNumber = routingDetailStartRow + index
    const sourceRow = options.routingStartRow + index
    const hasData = `COUNTA(ROUTING!A${sourceRow}:F${sourceRow})=0`
    const manning = crossSheetValue('ROUTING', 'C', sourceRow)
    const capacity = crossSheetValue('ROUTING', 'D', sourceRow)
    const yieldValue = crossSheetValue('ROUTING', 'E', sourceRow)
    const invalidInputs = `OR(NOT(ISNUMBER(${manning})),NOT(ISNUMBER(${capacity})),NOT(ISNUMBER(${yieldValue})),${capacity}<=0,${yieldValue}<=0)`
    for (const [column, sourceColumn] of [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E']] as const) {
      setFormula(sheet.getCell(`${column}${rowNumber}`), `=IF(ROUTING!${sourceColumn}${sourceRow}="","",ROUTING!${sourceColumn}${sourceRow})`, true)
    }
    setFormula(sheet.getCell(`F${rowNumber}`), `=IF(${hasData},"",IF(${invalidInputs},"Unavailable",${manning}/(${capacity}*${yieldValue})))`)
    setFormula(sheet.getCell(`G${rowNumber}`), `=${calcCostFormula(sourceRow, 'B', options.workCenterStartRow, options.workCenterRowCount)}`)
    setFormula(sheet.getCell(`H${rowNumber}`), `=${calcCostFormula(sourceRow, 'C', options.workCenterStartRow, options.workCenterRowCount)}`)
    setFormula(sheet.getCell(`I${rowNumber}`), `=IF(${hasData},"",IF(AND(ISNUMBER(G${rowNumber}),ISNUMBER(H${rowNumber})),"Calculated","Unavailable: check Routing or Work Center inputs"))`)
    for (const column of ['C', 'D', 'F', 'G', 'H']) sheet.getCell(`${column}${rowNumber}`).numFmt = '#,##0.0000;(#,##0.0000);-'
    sheet.getCell(`E${rowNumber}`).numFmt = '0.00%'
  }

  for (let index = 0; index < Math.max(1, options.workCenterRowCount); index += 1) {
    const rawRow = options.workCenterStartRow + index
    setFormula(sheet.getCell(`Z${rawRow}`), `=LOWER(TRIM(WORK_CENTER!A${rawRow}))`, true)
  }

  sheet.views = [{ state: 'frozen', ySplit: 5, showGridLines: true }]
}
