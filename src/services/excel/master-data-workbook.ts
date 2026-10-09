import type ExcelJS from 'exceljs'
import type { ProductMaster } from '../../core'

type CellRow = (string | number | null)[]

export interface MasterDataWorkbookOptions {
  product?: ProductMaster
  remark?: string
  rows: {
    bom: CellRow[]
    workCenters: CellRow[]
    routing: CellRow[]
  }
  startingRows?: {
    bom: number
    workCenters: number
    routing: number
  }
}

const DARK = 'FF1E293B'
const WHITE = 'FFFFFFFF'
const YELLOW = 'FFFEF9C3'
const GRAY = 'FFF1F5F9'
const BORDER = 'FFE2E8F0'
const CALCULATED_BORDER = 'FFA6A6A6'
const INPUT_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: YELLOW } }
const LABEL_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: DARK } }
const CALCULATED_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: GRAY } }
function cellBorder(color: string) {
  return {
    top: { style: 'thin' as const, color: { argb: color } },
    left: { style: 'thin' as const, color: { argb: color } },
    bottom: { style: 'thin' as const, color: { argb: color } },
    right: { style: 'thin' as const, color: { argb: color } }
  }
}
const border = cellBorder(BORDER)
const calculatedBorder = cellBorder(CALCULATED_BORDER)

const headers = {
  bom: ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'],
  workCenters: ['WC', 'Labor', 'Burden', 'Note'],
  routing: ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note']
}

function activeRows(table: string, columns: string[]): string {
  return `(${columns.map(column => `(${table}[${column}]<>"")`).join('+')}>0)`
}

function noMissingNumbers(table: string, mask: string, column: string): string {
  return `SUMPRODUCT(--${mask},--(ISNUMBER(${table}[${column}])=FALSE))=0`
}

function ifComplete(conditions: string[], value: string): string {
  return `IFERROR(IF(AND(${conditions.join(',')}),${value},""),"")`
}

function formulae(): string[] {
  const bom = activeRows('BOMData', headers.bom)
  const routing = activeRows('RoutingData', headers.routing)
  const wcMatches = 'COUNTIF(WorkCenterData[WC],TRIM(RoutingData[WC]))'
  const laborRates = 'COUNTIFS(WorkCenterData[WC],TRIM(RoutingData[WC]),WorkCenterData[Labor],">=0")+COUNTIFS(WorkCenterData[WC],TRIM(RoutingData[WC]),WorkCenterData[Labor],"<0")'
  const burdenRates = 'COUNTIFS(WorkCenterData[WC],TRIM(RoutingData[WC]),WorkCenterData[Burden],">=0")+COUNTIFS(WorkCenterData[WC],TRIM(RoutingData[WC]),WorkCenterData[Burden],"<0")'
  const routingBase = [
    `SUMPRODUCT(--${routing})>0`,
    noMissingNumbers('RoutingData', routing, 'Manning'),
    noMissingNumbers('RoutingData', routing, 'Cap'),
    noMissingNumbers('RoutingData', routing, 'Yield'),
    `SUMPRODUCT(--${routing},--(RoutingData[WC]=""))=0`,
    `SUMPRODUCT(--${routing},--(RoutingData[Cap]<=0))=0`,
    `SUMPRODUCT(--${routing},--(RoutingData[Yield]<=0))=0`,
    `SUMPRODUCT(--${routing},--(${wcMatches}<>1))=0`
  ]

  return [
    ifComplete([
      `SUMPRODUCT(--${bom})>0`,
      noMissingNumbers('BOMData', bom, 'Usage'),
      noMissingNumbers('BOMData', bom, 'Price'),
      noMissingNumbers('BOMData', bom, 'Loss')
    ], `SUMPRODUCT(--${bom},BOMData[Usage],BOMData[Price],1+BOMData[Loss])`),
    ifComplete([
      ...routingBase,
      `SUMPRODUCT(--${routing},--((${laborRates})<>1))=0`
    ], `SUMPRODUCT(--${routing},IFERROR(RoutingData[Manning]/(RoutingData[Cap]*RoutingData[Yield]),0),SUMIF(WorkCenterData[WC],TRIM(RoutingData[WC]),WorkCenterData[Labor]))`),
    ifComplete([
      ...routingBase,
      `SUMPRODUCT(--${routing},--((${burdenRates})<>1))=0`
    ], `SUMPRODUCT(--${routing},IFERROR(RoutingData[Manning]/(RoutingData[Cap]*RoutingData[Yield]),0),SUMIF(WorkCenterData[WC],TRIM(RoutingData[WC]),WorkCenterData[Burden]))`),
    ifComplete(['ISNUMBER(B9)', 'ISNUMBER(B10)', 'ISNUMBER(B11)'], 'SUM(B9:B11)'),
    ifComplete(['ISNUMBER(B5)', 'ISNUMBER(B6)'], 'B5*(B6/100)'),
    ifComplete(['ISNUMBER(B5)', 'ISNUMBER(B12)', 'ISNUMBER(B13)'], 'B5-B12-B13')
  ]
}

function styleLabel(cell: ExcelJS.Cell): void {
  cell.fill = LABEL_FILL
  cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
  cell.alignment = { vertical: 'middle', horizontal: 'center' }
  cell.border = border
}

function writeMetaSheet(workbook: ExcelJS.Workbook, options: MasterDataWorkbookOptions): void {
  const sheet = workbook.addWorksheet('META')
  sheet.columns = [{ width: 24 }, { width: 42 }]
  sheet.getCell('A1').value = 'META DATA'
  sheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: DARK } }
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
  sheet.getRow(1).height = 22

  const inputs: CellRow[] = [
    ['PRODUCT NAME', options.product?.productName || options.product?.productDescription || ''],
    ['UOM', options.product?.uom || ''],
    ['SELLING PRICE', options.product?.sellingPrice ?? null],
    ['SG&A %', options.product?.sgaPercent ?? null],
    ['DATASET REMARK', options.remark || '']
  ]
  inputs.forEach(([label, value], index) => {
    const row = index + 3
    sheet.getCell(row, 1).value = label
    styleLabel(sheet.getCell(row, 1))
    const input = sheet.getCell(row, 2)
    input.value = value
    input.fill = INPUT_FILL
    input.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } }
    input.border = border
    input.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  sheet.getCell('B5').numFmt = '#,##0.00'
  sheet.getCell('B6').numFmt = '0.00"%"'

  const outputLabels = ['MAT', 'LABOR', 'BURDEN', 'STANDARD COST', 'SG&A AMOUNT', 'OP']
  const notes = [
    'MAT = Σ[Usage × Price × (1 + Loss)]',
    'Labor = Σ[Routing Factor × Labor Rate]\nRouting Factor = Manning / (Capacity × Yield)',
    'Burden = Σ[Routing Factor × Burden Rate]\nRouting Factor = Manning / (Capacity × Yield)',
    'Standard Cost = MAT + Labor + Burden',
    'SG&A Amount = Selling Price × SG&A %',
    'OP = Selling Price - Standard Cost - SG&A Amount'
  ]
  formulae().forEach((formula, index) => {
    const row = index + 9
    sheet.getCell(row, 1).value = outputLabels[index]
    styleLabel(sheet.getCell(row, 1))
    const result = sheet.getCell(row, 2)
    result.value = { formula }
    result.fill = CALCULATED_FILL
    result.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } }
    result.alignment = { vertical: 'middle', horizontal: 'center' }
    result.border = calculatedBorder
    result.numFmt = '#,##0.00'
    result.note = notes[index]
  })
  sheet.views = [{ state: 'frozen', ySplit: 2 }]
}

function writeTableSheet(
  workbook: ExcelJS.Workbook,
  name: 'BOM' | 'WORK_CENTER' | 'ROUTING',
  tableName: string,
  columnNames: string[],
  rows: CellRow[],
  startingRows: number,
  widths: number[],
  numericColumns: number[],
  percentColumns: number[]
): void {
  const title = {
    BOM: 'BILL OF MATERIALS',
    WORK_CENTER: 'WORK CENTERS',
    ROUTING: 'PROCESS ROUTING'
  }[name]
  const sheet = workbook.addWorksheet(name)
  sheet.columns = widths.map(width => ({ width }))
  sheet.getCell('A1').value = title
  sheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: DARK } }
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
  sheet.getRow(1).height = 22

  const tableRows = [...rows]
  while (tableRows.length < startingRows) tableRows.push(columnNames.map(() => ''))
  sheet.addTable({
    name: tableName,
    ref: 'A3',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleLight1', showRowStripes: false, showColumnStripes: false },
    columns: columnNames.map(column => ({ name: column, filterButton: true })),
    rows: tableRows
  })

  const header = sheet.getRow(3)
  for (let column = 1; column <= columnNames.length; column += 1) {
    const cell = header.getCell(column)
    cell.fill = LABEL_FILL
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border
  }
  tableRows.forEach((_, index) => {
    const row = sheet.getRow(index + 4)
    for (let column = 1; column <= columnNames.length; column += 1) {
      const cell = row.getCell(column)
      cell.fill = INPUT_FILL
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } }
      cell.border = border
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (numericColumns.includes(column)) cell.numFmt = '#,##0.00'
      if (percentColumns.includes(column)) cell.numFmt = '0.00%'
    }
  })
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
}

export function addMasterDataWorkbook(workbook: ExcelJS.Workbook, options: MasterDataWorkbookOptions): void {
  writeMetaSheet(workbook, options)
  writeTableSheet(workbook, 'BOM', 'BOMData', headers.bom, options.rows.bom, options.startingRows?.bom ?? 0,
    [36, 16, 12, 16, 14, 48], [2, 4], [5])
  writeTableSheet(workbook, 'WORK_CENTER', 'WorkCenterData', headers.workCenters, options.rows.workCenters, options.startingRows?.workCenters ?? 0,
    [24, 18, 18, 48], [2, 3], [])
  writeTableSheet(workbook, 'ROUTING', 'RoutingData', headers.routing, options.rows.routing, options.startingRows?.routing ?? 0,
    [32, 24, 14, 14, 14, 48], [3, 4], [5])
}
