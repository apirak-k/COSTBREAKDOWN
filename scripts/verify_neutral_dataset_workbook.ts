import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { calculateScenarioBusinessMetrics } from '../src/core/calculations/scenario-business.ts'
import { calculateSnapshotCost } from '../src/core/calculations/snapshot-cost.ts'
import type { CostSnapshot } from '../src/core/types/snapshot.types.ts'
import { generateDynamicExcelTemplate } from '../src/services/excel/dynamic-excel-generator.ts'
import { parseSnapshotWorkbookData } from '../src/services/excel/snapshot-parser.ts'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export.ts'
import { importSnapshotForRole } from '../src/state/dataset-sizing.ts'

const SHEETS = ['META', 'BOM', 'WORK_CENTER', 'ROUTING']
const INPUT_FILL = 'FFFEF9C3'
const HEADER_FILL = 'FF1E293B'
const CALCULATED_FILL = 'FFF1F5F9'
const CALCULATED_BORDER = 'FFA6A6A6'
const FORMULA_NOTES = [
  'MAT = Σ[Usage × Price × (1 + Loss)]',
  'Labor = Σ[Routing Factor × Labor Rate]\nRouting Factor = Manning / (Capacity × Yield)',
  'Burden = Σ[Routing Factor × Burden Rate]\nRouting Factor = Manning / (Capacity × Yield)',
  'Standard Cost = MAT + Labor + Burden',
  'SG&A Amount = Selling Price × SG&A %',
  'OP = Selling Price - Standard Cost - SG&A Amount'
]

const workbook = XLSX.utils.book_new()
const addSheet = (name: string, rows: (string | number | null)[][]) => {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name)
}

// Deliberately place sheets out of order: Import is name-based, while generated
// workbooks have the canonical sheet order.
addSheet('ROUTING', [
  ['ROUTING'], [],
  ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'],
  ['Cut', 'WC-1', 1, 100, 0.95, 'Operation annotation']
])
addSheet('META', [
  ['META'], [],
  ['PRODUCT NAME', 'Fixture Product'],
  ['UOM', 'PC'],
  ['SELLING PRICE', 123.5],
  ['SG&A %', 8],
  ['DATASET REMARK', 'Prepared from approved neutral schema'],
  [],
  ['MAT', 999999],
  ['LABOR', 999999],
  ['BURDEN', 999999],
  ['STANDARD COST', 999999],
  ['SG&A AMOUNT', 999999],
  ['OP', 999999]
])
addSheet('WORK_CENTER', [
  ['WORK CENTER'], [],
  ['WC', 'Labor', 'Burden', 'Note'],
  ['WC-1', 100, 50, 'Rate annotation']
])
addSheet('BOM', [
  ['BOM'], [],
  ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'],
  ['Film', 2, 'SM', 10, 0.1, 'Material annotation']
])

const inputBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
const imported = parseSnapshotWorkbookData(inputBytes, 'reference')
assert.equal(imported.success, true, imported.message)
assert.ok(imported.snapshot)
assert.equal(imported.snapshot.remark, 'Prepared from approved neutral schema')
assert.equal(imported.snapshot.product.productName, 'Fixture Product')
assert.equal(imported.snapshot.product.uom, 'PC')
assert.equal(imported.snapshot.product.sellingPrice, 123.5)
assert.equal(imported.snapshot.product.sgaPercent, 8)
assert.equal(imported.snapshot.rates[0].note, 'Rate annotation')
assert.equal(imported.snapshot.bom[0].note, 'Material annotation')
assert.equal(imported.snapshot.routing[0].note, 'Operation annotation')
for (const output of ['MAT', 'LABOR', 'BURDEN', 'STANDARD COST', 'SG&A AMOUNT', 'OP']) {
  assert.equal(imported.snapshot.additionalFields?.[output], undefined, `${output} must not be imported as source data`)
}

const recalculated = calculateSnapshotCost(imported.snapshot)
assert.equal(recalculated.material, 22)
assert.ok(Math.abs((recalculated.total ?? 0) - 23.57894736842105) < 1e-12)
const business = calculateScenarioBusinessMetrics({ sellingPrice: 123.5, sgaPercent: 8 }, recalculated.total)
assert.equal(business.sgaAmountPerPiece, 9.88)
assert.ok(Math.abs((business.operatingProfitPerPiece ?? 0) - 90.04105263157895) < 1e-12)
assert.ok(
  calculateScenarioBusinessMetrics({ sellingPrice: 1, sgaPercent: 8 }, recalculated.total).operatingProfitPerPiece! < 0,
  'negative OP remains valid'
)

function loadExcel(blob: Blob): Promise<ExcelJS.Workbook> {
  const result = new ExcelJS.Workbook()
  return blob.arrayBuffer().then(bytes => result.xlsx.load(Buffer.from(bytes)).then(() => result))
}

function formulaAt(sheet: ExcelJS.Worksheet, address: string): string {
  return (sheet.getCell(address).value as { formula?: string } | null)?.formula ?? ''
}

function visibleText(sheet: ExcelJS.Worksheet): string[] {
  return sheet.getSheetValues().flatMap(row => Array.isArray(row) ? row : [])
    .filter((value): value is string => typeof value === 'string')
}

function tableDataRowCount(workbook: ExcelJS.Workbook, sheetName: string, tableName: string): number {
  const ref = workbook.getWorksheet(sheetName)!.getTable(tableName).table.tableRef as string
  const range = XLSX.utils.decode_range(ref)
  return range.e.r - range.s.r
}

function assertWorkbookSurface(excel: ExcelJS.Workbook): void {
  assert.deepEqual(excel.worksheets.map(sheet => sheet.name), SHEETS)
  for (const sheetName of ['BOM', 'WORK_CENTER', 'ROUTING']) {
    const sheet = excel.getWorksheet(sheetName)!
    const title = { BOM: 'BILL OF MATERIALS', WORK_CENTER: 'WORK CENTERS', ROUTING: 'PROCESS ROUTING' }[sheetName]
    assert.equal(sheet.getCell('A1').value, title)
    assert.equal(sheet.getCell('A1').fill.fgColor, undefined, `${sheetName} title has no filled background`)
    assert.equal(sheet.getCell('A1').font.bold, true)
    assert.deepEqual(sheet.getCell('A1').alignment, { vertical: 'middle', horizontal: 'center' })
    assert.equal(sheet.getCell('A2').value, null)
    assert.equal(sheet.getCell('A3').fill.fgColor?.argb, HEADER_FILL)
    assert.equal(sheet.getCell('A3').font.color?.argb, 'FFFFFFFF')
    assert.equal(sheet.getCell('A3').font.bold, true)
    assert.equal(sheet.getCell('A3').alignment.horizontal, 'center')
    assert.equal(sheet.getCell('A3').alignment.vertical, 'middle')
    for (const text of visibleText(sheet)) {
      assert.doesNotMatch(text, /example|instruction|yellow cells|leave unknown|editable inputs/i)
    }
  }

  const meta = excel.getWorksheet('META')!
  assert.equal(meta.getCell('A1').value, 'META DATA')
  assert.equal(meta.getCell('A1').fill.fgColor, undefined, 'META title has no filled background')
  assert.equal(meta.getCell('A1').font.bold, true)
  assert.deepEqual(meta.getCell('A1').alignment, { vertical: 'middle', horizontal: 'center' })
  assert.deepEqual(meta.getColumn(1).values.slice(3, 8), [
    'PRODUCT NAME', 'UOM', 'SELLING PRICE', 'SG&A %', 'DATASET REMARK'
  ])
  assert.deepEqual(meta.getColumn(1).values.slice(9, 15), [
    'MAT', 'LABOR', 'BURDEN', 'STANDARD COST', 'SG&A AMOUNT', 'OP'
  ])
  for (let row = 3; row <= 7; row += 1) {
    assert.equal(meta.getCell(`A${row}`).fill.fgColor?.argb, HEADER_FILL)
    assert.equal(meta.getCell(`B${row}`).fill.fgColor?.argb, INPUT_FILL)
    assert.equal(meta.getCell(`A${row}`).alignment.horizontal, 'center')
    assert.equal(meta.getCell(`A${row}`).alignment.vertical, 'middle')
    assert.equal(meta.getCell(`B${row}`).alignment.horizontal, 'center')
    assert.equal(meta.getCell(`B${row}`).alignment.vertical, 'middle')
  }
  for (let row = 9; row <= 14; row += 1) {
    assert.equal(meta.getCell(`A${row}`).fill.fgColor?.argb, HEADER_FILL)
    assert.equal(meta.getCell(`B${row}`).fill.fgColor?.argb, CALCULATED_FILL)
    assert.equal(meta.getCell(`B${row}`).border.top.color?.argb, CALCULATED_BORDER)
    assert.equal(meta.getCell(`B${row}`).border.left.color?.argb, CALCULATED_BORDER)
    assert.equal(meta.getCell(`B${row}`).alignment.horizontal, 'center')
    assert.equal(meta.getCell(`B${row}`).alignment.vertical, 'middle')
    assert.equal(meta.getCell(`B${row}`).note, FORMULA_NOTES[row - 9])
    assert.ok(formulaAt(meta, `B${row}`), `META.B${row} must contain a formula`)
  }
  assert.equal(meta.getCell('B6').numFmt, '0.00"%"')
  assert.equal(meta.getCell('B5').numFmt, '#,##0.00')
  for (let row = 9; row <= 14; row += 1) assert.equal(meta.getCell(`B${row}`).numFmt, '#,##0.00')
  assert.equal(meta.getCell('B8').value, null)
  assert.equal(meta.getCell('C3').value, null, 'unused worksheet area stays blank')

  const bom = excel.getWorksheet('BOM')!
  const workCenter = excel.getWorksheet('WORK_CENTER')!
  const routing = excel.getWorksheet('ROUTING')!
  assert.deepEqual(bom.getRow(3).values.slice(1), ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'])
  assert.deepEqual(workCenter.getRow(3).values.slice(1), ['WC', 'Labor', 'Burden', 'Note'])
  assert.deepEqual(routing.getRow(3).values.slice(1), ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'])
  assert.equal(bom.getCell('E4').numFmt, '0.00%')
  assert.equal(bom.getCell('B4').numFmt, '#,##0.00')
  assert.equal(bom.getCell('D4').numFmt, '#,##0.00')
  assert.equal(routing.getCell('E4').numFmt, '0.00%')
  assert.equal(routing.getCell('C4').numFmt, '#,##0.00')
  assert.equal(routing.getCell('D4').numFmt, '#,##0.00')
  assert.equal(workCenter.getCell('B4').numFmt, '#,##0.00')
  assert.equal(workCenter.getCell('C4').numFmt, '#,##0.00')
  for (const [sheetName, tableName, columns] of [
    ['BOM', 'BOMData', 6], ['WORK_CENTER', 'WorkCenterData', 4], ['ROUTING', 'RoutingData', 6]
  ] as const) {
    const rows = tableDataRowCount(excel, sheetName, tableName)
    for (let row = 4; row < 4 + rows; row += 1) {
      for (let column = 1; column <= columns; column += 1) {
        assert.equal(excel.getWorksheet(sheetName)!.getCell(row, column).fill.fgColor?.argb, INPUT_FILL)
        assert.equal(excel.getWorksheet(sheetName)!.getCell(row, column).alignment.horizontal, 'center')
        assert.equal(excel.getWorksheet(sheetName)!.getCell(row, column).alignment.vertical, 'middle')
      }
    }
  }

  const formulas = [9, 10, 11, 12, 13, 14].map(row => formulaAt(meta, `B${row}`))
  assert.match(formulas[0], /BOMData\[Usage\].*BOMData\[Price\].*BOMData\[Loss\]/)
  assert.match(formulas[0], /SUMPRODUCT|SUM\(/)
  assert.match(formulas[1], /RoutingData\[Manning\].*RoutingData\[Cap\].*RoutingData\[Yield\]/)
  assert.match(formulas[1], /WorkCenterData\[Labor\].*SUMIF/)
  assert.match(formulas[2], /WorkCenterData\[Burden\].*SUMIF/)
  assert.match(formulas[3], /B9.*B10.*B11/)
  assert.match(formulas[4], /B5.*B6.*\/100/)
  assert.match(formulas[5], /B5.*B12.*B13/)
  assert.doesNotMatch(formulas[0], /RoutingData|WorkCenterData/)
  assert.doesNotMatch(formulas[1], /BOMData/)
  assert.doesNotMatch(formulas[2], /BOMData/)
  assert.doesNotMatch(formulas[4], /BOMData|RoutingData|WorkCenterData/)
  for (const formula of formulas) {
    assert.match(formula, /IFERROR\(/, 'formula errors resolve to blank')
    assert.match(formula, /""/, 'incomplete inputs resolve to blank')
    assert.doesNotMatch(formula, /COST_CALCULATION|\$[A-Z]+\$?\d+/)
  }
  assert.doesNotMatch(formulas[5], /MAX\(/, 'OP is not clamped at zero')
}

async function verify(): Promise<void> {
  const exportedBlob = await exportSnapshotToExcel(imported.snapshot!)
  const exported = await loadExcel(exportedBlob)
  assertWorkbookSurface(exported)
  const exportRows = [
    ['BOM', 'BOMData', 1], ['WORK_CENTER', 'WorkCenterData', 1], ['ROUTING', 'RoutingData', 1]
  ] as const
  for (const [sheetName, tableName, count] of exportRows) {
    assert.equal(tableDataRowCount(exported, sheetName, tableName), count)
  }

  const exportedBytes = await exportedBlob.arrayBuffer()
  const exportAsXlsx = XLSX.read(exportedBytes, { type: 'array' })
  assert.deepEqual(exportAsXlsx.SheetNames, SHEETS)
  const roundTrip = parseSnapshotWorkbookData(XLSX.write(exportAsXlsx, { type: 'array', bookType: 'xlsx' }), 'current')
  assert.equal(roundTrip.success, true, roundTrip.message)
  assert.ok(roundTrip.snapshot)
  assert.equal(roundTrip.snapshot.remark, imported.snapshot!.remark)
  assert.deepEqual(
    [roundTrip.snapshot.product.productName, roundTrip.snapshot.product.uom, roundTrip.snapshot.product.sellingPrice, roundTrip.snapshot.product.sgaPercent],
    [imported.snapshot!.product.productName, imported.snapshot!.product.uom, imported.snapshot!.product.sellingPrice, imported.snapshot!.product.sgaPercent]
  )
  assert.equal(roundTrip.snapshot.bom[0].note, imported.snapshot!.bom[0].note)
  assert.equal(roundTrip.snapshot.rates[0].note, imported.snapshot!.rates[0].note)
  assert.equal(roundTrip.snapshot.routing[0].note, imported.snapshot!.routing[0].note)

  const emptyExport = await exportSnapshotToExcel({
    ...imported.snapshot!,
    bom: [],
    rates: [],
    routing: []
  })
  const emptyWorkbook = await loadExcel(emptyExport)
  assert.deepEqual(emptyWorkbook.worksheets.map(sheet => sheet.name), SHEETS)
  assert.equal(tableDataRowCount(emptyWorkbook, 'BOM', 'BOMData'), 0)
  assert.equal(tableDataRowCount(emptyWorkbook, 'WORK_CENTER', 'WorkCenterData'), 0)
  assert.equal(tableDataRowCount(emptyWorkbook, 'ROUTING', 'RoutingData'), 0)
  const emptyRoundTrip = parseSnapshotWorkbookData(XLSX.write(
    XLSX.read(await emptyExport.arrayBuffer(), { type: 'array' }),
    { type: 'array', bookType: 'xlsx' }
  ), 'current')
  assert.equal(emptyRoundTrip.success, true, emptyRoundTrip.message)
  assert.equal(emptyRoundTrip.snapshot?.bom.length, 0)
  assert.equal(emptyRoundTrip.snapshot?.rates.length, 0)
  assert.equal(emptyRoundTrip.snapshot?.routing.length, 0)

  const templateBlob = await generateDynamicExcelTemplate({
    product: imported.snapshot!.product,
    snapshot: imported.snapshot,
    wcCount: 2,
    bomCount: 3,
    routingCount: 4
  })
  const template = await loadExcel(templateBlob)
  assertWorkbookSurface(template)
  for (const [sheetName, tableName, count] of [
    ['BOM', 'BOMData', 3], ['WORK_CENTER', 'WorkCenterData', 2], ['ROUTING', 'RoutingData', 4]
  ] as const) {
    assert.equal(tableDataRowCount(template, sheetName, tableName), count)
    for (let row = 4; row < 4 + count; row += 1) {
      assert.ok(template.getWorksheet(sheetName)!.getRow(row).values.slice(1).every(value => value === null || value === undefined || value === ''))
    }
  }

  const bomFormula = formulaAt(template.getWorksheet('META')!, 'B9')
  assert.match(bomFormula, /BOMData\[Usage\]/, 'the formula spans the expandable Excel Table')
  assert.equal(tableDataRowCount(template, 'BOM', 'BOMData'), 3)
  assert.doesNotMatch(bomFormula, /BOM!.*\$?\d+/)

  const templateBytes = XLSX.read(await templateBlob.arrayBuffer(), { type: 'array' })
  const templateRoundTrip = parseSnapshotWorkbookData(XLSX.write(templateBytes, { type: 'array', bookType: 'xlsx' }), 'reference')
  assert.equal(templateRoundTrip.success, true, templateRoundTrip.message)
  assert.equal(templateRoundTrip.snapshot?.remark, imported.snapshot!.remark)
  assert.equal(templateRoundTrip.snapshot?.rates.length, 2)
  assert.equal(templateRoundTrip.snapshot?.bom.length, 3)
  assert.equal(templateRoundTrip.snapshot?.routing.length, 4)

  const sizedForRoundTrip: CostSnapshot = {
    ...imported.snapshot!,
    bom: [imported.snapshot!.bom[0], ...Array.from({ length: 5 }, (_, index) => ({
      ...imported.snapshot!.bom[0],
      id: `sized-bom-${index + 1}`,
      itemCode: '',
      description: '',
      consumption: null,
      unit: 'PC',
      price: null,
      loss: null,
      confidence: {
        consumption: { status: 'missing' as const },
        price: { status: 'missing' as const },
        loss: { status: 'missing' as const }
      },
      isGeneratedSizingPlaceholder: true
    }))],
    rates: [imported.snapshot!.rates[0], ...Array.from({ length: 2 }, (_, index) => ({
      ...imported.snapshot!.rates[0],
      id: `sized-rate-${index + 1}`,
      workCenterCode: '',
      description: '',
      laborRate: null,
      burdenRate: null,
      confidence: {
        laborRate: { status: 'missing' as const },
        burdenRate: { status: 'missing' as const }
      },
      isGeneratedSizingPlaceholder: true
    }))],
    routing: [imported.snapshot!.routing[0], ...Array.from({ length: 3 }, (_, index) => ({
      ...imported.snapshot!.routing[0],
      id: `sized-routing-${index + 1}`,
      processName: '',
      workCenterId: undefined,
      manning: null,
      capacity: null,
      yield: null,
      confidence: {
        manning: { status: 'missing' as const },
        capacity: { status: 'missing' as const },
        yield: { status: 'missing' as const }
      },
      isGeneratedSizingPlaceholder: true
    }))]
  }
  assert.deepEqual([sizedForRoundTrip.bom.length, sizedForRoundTrip.rates.length, sizedForRoundTrip.routing.length], [6, 3, 4])
  const sizedExport = await exportSnapshotToExcel(sizedForRoundTrip)
  const sizedWorkbook = await loadExcel(sizedExport)
  assert.deepEqual([
    tableDataRowCount(sizedWorkbook, 'BOM', 'BOMData'),
    tableDataRowCount(sizedWorkbook, 'WORK_CENTER', 'WorkCenterData'),
    tableDataRowCount(sizedWorkbook, 'ROUTING', 'RoutingData')
  ], [6, 3, 4], 'Export preserves the exact BOM/WC/Routing row counts')
  const sizedRoundTrip = parseSnapshotWorkbookData(XLSX.write(
    XLSX.read(await sizedExport.arrayBuffer(), { type: 'array' }),
    { type: 'array', bookType: 'xlsx' }
  ), 'current')
  assert.equal(sizedRoundTrip.success, true, sizedRoundTrip.message)
  assert.deepEqual([
    sizedRoundTrip.snapshot?.bom.length,
    sizedRoundTrip.snapshot?.rates.length,
    sizedRoundTrip.snapshot?.routing.length
  ], [6, 3, 4], 'Import preserves the exact BOM/WC/Routing row counts')
  assert.deepEqual(
    importSnapshotForRole(
      { reference: imported.snapshot!, current: imported.snapshot! },
      {},
      'current',
      sizedRoundTrip.snapshot!
    ).datasetSizing.current,
    { bomCount: 6, wcCount: 3, routingCount: 4 },
    'Import initializes Sizing from actual round-trip row counts'
  )
  assert.equal(sizedRoundTrip.snapshot?.bom[1].consumption, null)
  assert.equal(sizedRoundTrip.snapshot?.bom[1].loss, null, 'blank numeric fields stay blank on round-trip')
  assert.equal(sizedRoundTrip.snapshot?.bom[1].description, 'Material 1', 'generated BOM identities export as effective names')
  assert.equal(sizedRoundTrip.snapshot?.bom[2].description, 'Material 2', 'generated BOM numbering is preserved through export/import')
  assert.equal(calculateSnapshotCost(sizedRoundTrip.snapshot!).status, 'missing')

  const incomplete: CostSnapshot = {
    ...imported.snapshot!,
    bom: [{ ...imported.snapshot!.bom[0], price: null }]
  }
  assert.equal(calculateSnapshotCost(incomplete).material, null, 'the application engine keeps incomplete material cost unavailable')
  assert.equal(calculateSnapshotCost(incomplete).total, null)

  console.log('Neutral Master Data workbook verification passed.')
}

verify().catch(error => {
  console.error(error)
  process.exitCode = 1
})
