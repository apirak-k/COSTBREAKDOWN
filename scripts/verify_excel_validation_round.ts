import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { importSnapshotForCustom, importSnapshotForRole } from '../src/state/dataset-sizing'
import { calculateSnapshotCost } from '../src/core/calculations/snapshot-cost'
import type { CostSnapshot, MasterDataRole, SnapshotPair } from '../src/core/types'
import { normalizeMasterDataSnapshot } from '../src/core/utils/master-data-effective'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export'
import { generateDynamicExcelTemplate } from '../src/services/excel/dynamic-excel-generator'
import { parseSnapshotExcelInputFile, parseSnapshotWorkbookData } from '../src/services/excel/snapshot-parser'
import { readExactNumericCells } from '../src/services/excel/exact-numeric-cells'

const artifactDir = process.env.COSTBREAKDOWN_EXCEL_VALIDATION_DIR
  ?? '/tmp/costbreakdown-excel-validation-2026-10-26'

const exact = {
  sellingPrice: '123.4567890123456789',
  sgaPercent: '3.141592653589793238',
  usage: '12.34567890123456789',
  price: '987.6543210987654321',
  lossPercent: '2.718281828459045235',
  laborRate: '45.67890123456789012',
  burdenRate: '8.76543210987654321',
  manning: '1.234567890123456789',
  capacity: '123.4567890123456789',
  yieldPercent: '98.76543210987654321'
}

function n(value: string): number {
  return Number(value)
}

function snapshotFor(role: MasterDataRole): CostSnapshot {
  const tag = role[0].toUpperCase() + role.slice(1)
  return {
    id: `${role}-excel-validation-source`,
    ...(role === 'custom' ? {} : { comparisonRole: role }),
    status: 'draft',
    sourceRef: `Unsaved ${tag} Working`,
    product: {
      productName: `${tag} Precision Part`,
      productDescription: `${tag} Precision Part`,
      productCode: `${tag}-PRIVATE-CODE`,
      uom: 'custom lot / batch',
      sellingPrice: n(exact.sellingPrice),
      sgaPercent: n(exact.sgaPercent),
      exactDecimalInputs: { sellingPrice: exact.sellingPrice, sgaPercent: exact.sgaPercent },
      customer: 'Not represented in canonical workbook',
      effectiveDate: '2026-10-26'
    },
    remark: `${tag} Working remark`,
    sizing: { bomCount: 5, wcCount: 2, routingCount: 3 },
    rates: [
      { id: `${role}-wc-1`, workCenterCode: `${tag}-CUT`, description: `${tag} cutting`, laborRate: n(exact.laborRate), burdenRate: n(exact.burdenRate), exactDecimalInputs: { laborRate: exact.laborRate, burdenRate: exact.burdenRate }, effectiveDate: '', note: `${tag} WC note`, confidence: {} },
      { id: `${role}-wc-2`, workCenterCode: `${tag}-PACK`, description: `${tag} packing`, laborRate: 16.25, burdenRate: 4.5, effectiveDate: '', note: '', confidence: {} }
    ],
    bom: [
      { id: `${role}-bom-1`, itemCode: `${tag}-MAT-1`, description: `${tag} alloy`, consumption: n(exact.usage), unit: '', price: n(exact.price), loss: n('0.02718281828459045235'), exactDecimalInputs: { consumption: exact.usage, price: exact.price, loss: exact.lossPercent }, note: `${tag} alloy note`, confidence: {} },
      { id: `${role}-bom-2`, itemCode: `${tag}-MAT-2`, description: `${tag} film`, consumption: 2.5, unit: 'KG', price: 10.125, loss: 0, exactDecimalInputs: { loss: '0' }, note: '', confidence: {} },
      { id: `${role}-bom-3`, itemCode: `${tag}-MAT-3`, description: `${tag} carton`, consumption: 1.2, unit: 'BOX', price: 2.75, loss: 0.01, note: 'BOX note', confidence: {} },
      { id: `${role}-bom-4`, itemCode: `${tag}-MAT-4`, description: `${tag} lot`, consumption: 3.2, unit: 'LOT', price: 4.125, loss: 0.02, note: 'LOT note', confidence: {} },
      { id: `${role}-bom-5`, itemCode: `${tag}-MAT-5`, description: `${tag} batch`, consumption: 1.1, unit: 'custom lot / batch', price: 8.5, loss: 0.03, note: 'Free-text unit note', confidence: {} }
    ],
    routing: [
      { id: `${role}-route-1`, operationCode: 'OP-10', processName: `${tag} cut`, workCenterId: `${tag}-CUT`, manning: n(exact.manning), capacity: n(exact.capacity), yield: n('0.9876543210987654321'), exactDecimalInputs: { manning: exact.manning, capacity: exact.capacity, yield: exact.yieldPercent }, note: `${tag} route note`, confidence: {} },
      { id: `${role}-route-2`, operationCode: 'OP-20', processName: `${tag} pack`, workCenterId: `${tag}-PACK`, manning: 2, capacity: 60, yield: 1, note: '', confidence: {} },
      { id: `${role}-route-3`, operationCode: 'OP-30', processName: `${tag} inspect`, workCenterId: `${tag}-CUT`, manning: 1, capacity: 25, yield: 0.95, note: 'Final check', confidence: {} }
    ],
    additionalFields: { 'Internal marker': 'Not represented in canonical workbook' },
    warnings: []
  }
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true }) as unknown[][]
}

function getColumnValues(workbook: XLSX.WorkBook, sheetName: string, column: number): unknown[] {
  return readSheetRows(workbook, sheetName).slice(3).map(row => row[column] ?? null)
}

function rewriteWorkbook(bytes: ArrayBuffer, mutate: (workbook: XLSX.WorkBook) => void): Uint8Array {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  mutate(workbook)
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function rewriteTableRowCount(
  bytes: ArrayBuffer,
  sheetName: string,
  count: number,
  createRow: (index: number) => unknown[]
): Uint8Array {
  return rewriteWorkbook(bytes, workbook => {
    const sourceRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: true
    }) as unknown[][]
    const prefix = sourceRows.slice(0, 3)
    const existingRows = sourceRows.slice(3)
    const dataRows = Array.from({ length: count }, (_, index) => existingRows[index] ?? createRow(index))
    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet([...prefix, ...dataRows])
  })
}

async function assertValidXlsx(bytes: ArrayBuffer): Promise<void> {
  const zip = await JSZip.loadAsync(bytes)
  assert.ok(zip.file('[Content_Types].xml'), 'XLSX package contains the content types manifest')
  assert.ok(zip.file('xl/workbook.xml'), 'XLSX package contains the workbook manifest')
  assert.ok(zip.file('xl/_rels/workbook.xml.rels'), 'XLSX package contains workbook relationships')
  assert.ok(zip.file('xl/worksheets/sheet1.xml'), 'XLSX package contains worksheet XML')
  assert.match(await zip.file('xl/workbook.xml')!.async('string'), /fullCalcOnLoad="1"/, 'workbook requests formula recalculation on open')
}

async function inspectGeneratedTemplate(name: string, counts: { bom: number; workCenters: number; routing: number }, productName: string, remark: string): Promise<ArrayBuffer> {
  const product = { productName, productDescription: productName, uom: 'draft unit', sellingPrice: 77.125, sgaPercent: 3.25 }
  const blob = await generateDynamicExcelTemplate({
    product,
    snapshot: { ...snapshotFor('custom'), product, remark },
    bomCount: counts.bom,
    wcCount: counts.workCenters,
    routingCount: counts.routing
  })
  const buffer = await blob.arrayBuffer()
  await writeFile(join(artifactDir, name), new Uint8Array(buffer))
  await assertValidXlsx(buffer)

  // SheetJS is independent of the production ExcelJS writer.
  const inspected = XLSX.read(buffer, { type: 'array', cellDates: true })
  assert.deepEqual(inspected.SheetNames, ['META', 'BOM', 'WORK_CENTER', 'ROUTING'])
  assert.deepEqual(readSheetRows(inspected, 'BOM')[2], ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'])
  assert.deepEqual(readSheetRows(inspected, 'WORK_CENTER')[2].slice(0, 4), ['WC', 'Labor', 'Burden', 'Note'])
  assert.deepEqual(readSheetRows(inspected, 'ROUTING')[2], ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'])
  assert.deepEqual(readSheetRows(inspected, 'META').slice(2, 7), [
    ['PRODUCT NAME', productName], ['UOM', 'draft unit'], ['SELLING PRICE', 77.125], ['SG&A %', 3.25], ['DATASET REMARK', remark]
  ])
  assert.equal(readSheetRows(inspected, 'BOM').length - 3, counts.bom)
  assert.equal(readSheetRows(inspected, 'WORK_CENTER').length - 3, counts.workCenters)
  assert.equal(readSheetRows(inspected, 'ROUTING').length - 3, counts.routing)
  assert.ok(readSheetRows(inspected, 'BOM').slice(3).every(row => row[2] == null || row[2] === ''), 'newly generated BOM Unit inputs stay blank')
  assert.equal(inspected.SheetNames.some(sheet => /additional|base price|active price/i.test(sheet)), false)

  const excel = new ExcelJS.Workbook()
  await excel.xlsx.load(new Uint8Array(buffer))
  assert.equal(excel.worksheets.length, 4)
  assert.equal(excel.getWorksheet('WORK_CENTER')?.getColumn(5).hidden, true)
  assert.equal(typeof excel.getWorksheet('META')?.getCell('B9').value, 'object', 'META MAT is a formula cell')
  return buffer
}

function businessProjection(snapshot: CostSnapshot) {
  const normalized = normalizeMasterDataSnapshot(snapshot)
  return {
    productName: normalized.product.productName,
    uom: normalized.product.uom,
    sellingPrice: normalized.product.sellingPrice,
    sgaPercent: normalized.product.sgaPercent,
    remark: normalized.remark,
    bom: normalized.bom.map(row => ({ name: row.description || row.itemCode, usage: row.consumption, unit: row.unit, price: row.price, loss: row.loss, note: row.note || '' })),
    workCenters: normalized.rates.map(row => ({ wc: row.workCenterCode, labor: row.laborRate, burden: row.burdenRate, note: row.note || '' })),
    routing: normalized.routing.map(row => ({ process: row.processName, wc: row.workCenterId || '', manning: row.manning, capacity: row.capacity, yield: row.yield, note: row.note || '' }))
  }
}

function importedProjection(snapshot: CostSnapshot) {
  return {
    productName: snapshot.product.productName,
    uom: snapshot.product.uom,
    sellingPrice: snapshot.product.sellingPrice,
    sgaPercent: snapshot.product.sgaPercent,
    remark: snapshot.remark,
    bom: snapshot.bom.map(row => ({ name: row.description || row.itemCode, usage: row.consumption, unit: row.unit, price: row.price, loss: row.loss, note: row.note || '' })),
    workCenters: snapshot.rates.map(row => ({ wc: row.workCenterCode, labor: row.laborRate, burden: row.burdenRate, note: row.note || '' })),
    routing: snapshot.routing.map(row => ({ process: row.processName, wc: row.workCenterId || '', manning: row.manning, capacity: row.capacity, yield: row.yield, note: row.note || '' }))
  }
}

function close(actual: number | null | undefined, expected: number | null | undefined, label: string): void {
  assert.equal(typeof actual, 'number', `${label} is calculated`)
  assert.equal(typeof expected, 'number', `${label} application result is calculated`)
  assert.ok(Math.abs(actual! - expected!) <= Math.max(1e-7, Math.abs(expected!) * 1e-10), `${label}: workbook=${actual}, application=${expected}`)
}

function calculateWorkbookFormulaContract(workbook: XLSX.WorkBook) {
  const bomRows = readSheetRows(workbook, 'BOM').slice(3)
  const workCenterRows = readSheetRows(workbook, 'WORK_CENTER').slice(3)
  const routingRows = readSheetRows(workbook, 'ROUTING').slice(3)
  const metaRows = readSheetRows(workbook, 'META')
  const numeric = (value: unknown): number => {
    assert.equal(typeof value, 'number', `formula input is numeric: ${String(value)}`)
    return value as number
  }
  const normalizedCode = (value: unknown): string => String(value ?? '').trim().toUpperCase()
  const rateFor = (code: unknown, column: number): number => {
    const matches = workCenterRows.filter(row => normalizedCode(row[0]) === normalizedCode(code))
    assert.equal(matches.length, 1, `formula Work Center lookup resolves exactly once for ${String(code)}`)
    return numeric(matches[0][column])
  }
  const material = bomRows.reduce((total, row) => total + numeric(row[1]) * numeric(row[3]) * (1 + numeric(row[4])), 0)
  const labor = routingRows.reduce((total, row) => total + numeric(row[2]) / (numeric(row[3]) * numeric(row[4])) * rateFor(row[1], 1), 0)
  const burden = routingRows.reduce((total, row) => total + numeric(row[2]) / (numeric(row[3]) * numeric(row[4])) * rateFor(row[1], 2), 0)
  const standardCost = material + labor + burden
  const sellingPrice = numeric(metaRows[4]?.[1])
  const sgaPercent = numeric(metaRows[5]?.[1])
  const sgaAmount = sellingPrice * (sgaPercent / 100)
  return { material, labor, burden, standardCost, sgaAmount, operatingProfit: sellingPrice - standardCost - sgaAmount }
}

async function main(): Promise<void> {
  await mkdir(artifactDir, { recursive: true })
  const minimumTemplate = await inspectGeneratedTemplate('template-minimum.xlsx', { bom: 1, workCenters: 1, routing: 1 }, 'Minimum Draft Product', 'Minimum draft remark')
  const mixedTemplate = await inspectGeneratedTemplate('template-mixed-draft.xlsx', { bom: 5, workCenters: 2, routing: 3 }, 'Unapplied Draft Product', 'Unapplied draft remark')
  await inspectGeneratedTemplate('template-normal.xlsx', { bom: 16, workCenters: 4, routing: 10 }, 'Normal Template Product', 'Normal template remark')
  console.log('Templates: minimum, mixed draft, and normal multi-row structures verified by SheetJS and ExcelJS.')

  const baseline = snapshotFor('reference')
  const pair: SnapshotPair = { reference: baseline, current: snapshotFor('current') }
  const priorSizing = { reference: { bomCount: 9 }, current: { wcCount: 7 } }
  const priorLastSaved = { current: { marker: 'preserved Last Saved' } }
  const exportBuffers = new Map<MasterDataRole, ArrayBuffer>()

  for (const role of ['reference', 'current', 'custom'] as const) {
    const source = snapshotFor(role)
    const blob = await exportSnapshotToExcel(source)
    const buffer = await blob.arrayBuffer()
    exportBuffers.set(role, buffer)
    await writeFile(join(artifactDir, `export-${role}.xlsx`), new Uint8Array(buffer))
    await assertValidXlsx(buffer)
    const inspected = XLSX.read(buffer, { type: 'array', cellDates: true })
    assert.deepEqual(inspected.SheetNames, ['META', 'BOM', 'WORK_CENTER', 'ROUTING'])
    const excel = new ExcelJS.Workbook()
    await excel.xlsx.load(new Uint8Array(buffer))
    assert.deepEqual(excel.getWorksheet('BOM')?.getRow(3).values.slice(1), ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note'])
    assert.deepEqual(excel.getWorksheet('WORK_CENTER')?.getRow(3).values.slice(1, 5), ['WC', 'Labor', 'Burden', 'Note'])
    assert.deepEqual(excel.getWorksheet('ROUTING')?.getRow(3).values.slice(1), ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note'])
    const formula = (cell: string) => excel.getWorksheet('META')?.getCell(cell).value as { formula?: string } | null
    assert.match(formula('B9')?.formula ?? '', /SUMPRODUCT/, 'MAT formula is present')
    assert.match(formula('B10')?.formula ?? '', /RoutingData\[Manning\]/, 'Labor formula uses Routing factor inputs')
    assert.match(formula('B11')?.formula ?? '', /WorkCenterData\[Burden\]/, 'Burden formula uses Work Center Burden rates')
    assert.match(formula('B12')?.formula ?? '', /SUM\(B9:B11\)/, 'Standard Cost sums MAT, Labor, and Burden')
    assert.match(formula('B13')?.formula ?? '', /B5\*\(B6\/100\)/, 'SG&A formula converts percentage points once')
    assert.match(formula('B14')?.formula ?? '', /B5-B12-B13/, 'OP formula subtracts Standard Cost and SG&A from Selling Price')
    assert.equal(formula('B9')?.result, undefined, 'export stores formulas without cached values and requests recalculation on open')
    assert.equal(excel.getWorksheet('BOM')?.getTable('BOMData')?.table.tableRef, 'A3:F8')
    assert.equal(excel.getWorksheet('WORK_CENTER')?.getTable('WorkCenterData')?.table.tableRef, 'A3:D5')
    assert.equal(excel.getWorksheet('ROUTING')?.getTable('RoutingData')?.table.tableRef, 'A3:F6')

    const exactCells = await readExactNumericCells(buffer)
    assert.equal(exactCells.META?.get('B5'), exact.sellingPrice)
    assert.equal(exactCells.META?.get('B6'), exact.sgaPercent)
    assert.equal(exactCells.BOM?.get('B4'), exact.usage)
    assert.equal(exactCells.BOM?.get('D4'), exact.price)
    assert.equal(exactCells.BOM?.get('E4'), '0.02718281828459045235')
    assert.equal(exactCells.WORK_CENTER?.get('B4'), exact.laborRate)
    assert.equal(exactCells.WORK_CENTER?.get('C4'), exact.burdenRate)
    assert.equal(exactCells.ROUTING?.get('C4'), exact.manning)
    assert.equal(exactCells.ROUTING?.get('D4'), exact.capacity)
    assert.equal(exactCells.ROUTING?.get('E4'), '0.9876543210987654321')
    assert.equal(typeof excel.getWorksheet('BOM')?.getCell('D4').value, 'number', 'exact decimal cells remain numeric XLSX cells')

    const parserResult = await parseSnapshotExcelInputFile(new File([buffer], `export-${role}.xlsx`), role)
    assert.equal(parserResult.success, true, parserResult.message)
    assert.equal(parserResult.role, role)
    assert.ok(parserResult.snapshot)
    assert.deepEqual(importedProjection(parserResult.snapshot!), businessProjection(source), `${role} business data round-trips through production Export and Import paths`)
    assert.equal(parserResult.snapshot?.product.exactDecimalInputs?.sellingPrice, exact.sellingPrice)
    assert.equal(parserResult.snapshot?.product.exactDecimalInputs?.sgaPercent, exact.sgaPercent)
    assert.equal(parserResult.snapshot?.bom[0].exactDecimalInputs?.consumption, exact.usage)
    assert.equal(parserResult.snapshot?.bom[0].exactDecimalInputs?.price, exact.price)
    assert.equal(parserResult.snapshot?.bom[0].exactDecimalInputs?.loss, exact.lossPercent)
    assert.equal(parserResult.snapshot?.rates[0].exactDecimalInputs?.laborRate, exact.laborRate)
    assert.equal(parserResult.snapshot?.rates[0].exactDecimalInputs?.burdenRate, exact.burdenRate)
    assert.equal(parserResult.snapshot?.routing[0].exactDecimalInputs?.manning, exact.manning)
    assert.equal(parserResult.snapshot?.routing[0].exactDecimalInputs?.capacity, exact.capacity)
    assert.equal(parserResult.snapshot?.routing[0].exactDecimalInputs?.yield, exact.yieldPercent)
    assert.equal(parserResult.snapshot?.comparisonRole, role === 'custom' ? undefined : role)

    const expectedCost = calculateSnapshotCost(source)
    assert.equal(expectedCost.status, 'complete')
    assert.equal(expectedCost.exactValues?.material == null, false)
    const formulaValues = calculateWorkbookFormulaContract(inspected)
    close(formulaValues.material, expectedCost.material, `${role} MAT workbook formula semantics`)
    close(formulaValues.labor, expectedCost.labor, `${role} Labor workbook formula semantics`)
    close(formulaValues.burden, expectedCost.burden, `${role} Burden workbook formula semantics`)
    close(formulaValues.standardCost, expectedCost.total, `${role} Standard Cost workbook formula semantics`)
    close(formulaValues.sgaAmount, source.product.sellingPrice * source.product.sgaPercent / 100, `${role} SG&A workbook formula semantics`)
    close(formulaValues.operatingProfit, source.product.sellingPrice - formulaValues.standardCost - formulaValues.sgaAmount, `${role} OP workbook formula semantics`)
    const fileRows = {
      bom: readSheetRows(inspected, 'BOM'),
      workCenters: readSheetRows(inspected, 'WORK_CENTER'),
      routing: readSheetRows(inspected, 'ROUTING')
    }
    assert.equal(fileRows.bom.length - 3, source.bom.length)
    assert.equal(fileRows.workCenters.length - 3, source.rates.length)
    assert.equal(fileRows.routing.length - 3, source.routing.length)
    assert.ok(fileRows.bom.slice(3).every(row => typeof row[1] === 'number'))
    assert.ok(fileRows.workCenters.slice(3).every(row => typeof row[1] === 'number' && typeof row[2] === 'number'))
    assert.ok(fileRows.routing.slice(3).every(row => typeof row[2] === 'number' && typeof row[3] === 'number' && typeof row[4] === 'number'))
  }
  console.log('Reference / Current / Custom exports round-trip all contract business fields and exact numeric lexemes; role-local import metadata is assigned by destination.')

  const zeroSnapshot = snapshotFor('reference')
  zeroSnapshot.product.sgaPercent = 0
  zeroSnapshot.product.exactDecimalInputs = { ...zeroSnapshot.product.exactDecimalInputs, sgaPercent: '0' }
  zeroSnapshot.bom[1].consumption = 0
  zeroSnapshot.bom[1].price = 0
  zeroSnapshot.bom[1].exactDecimalInputs = { consumption: '0', price: '0', loss: '0' }
  zeroSnapshot.rates[1].laborRate = 0
  zeroSnapshot.rates[1].burdenRate = 0
  zeroSnapshot.rates[1].exactDecimalInputs = { laborRate: '0', burdenRate: '0' }
  zeroSnapshot.routing[1].manning = 0
  zeroSnapshot.routing[1].exactDecimalInputs = { manning: '0' }
  const zeroBuffer = await (await exportSnapshotToExcel(zeroSnapshot)).arrayBuffer()
  await writeFile(join(artifactDir, 'export-zero-inclusive.xlsx'), new Uint8Array(zeroBuffer))
  await assertValidXlsx(zeroBuffer)
  const zeroWorkbook = XLSX.read(zeroBuffer, { type: 'array', cellDates: true })
  const zeroImport = await parseSnapshotExcelInputFile(new File([zeroBuffer], 'export-zero-inclusive.xlsx'), 'reference')
  assert.equal(zeroImport.success, true, zeroImport.message)
  assert.equal(zeroImport.snapshot?.product.sgaPercent, 0, 'zero SG&A remains an explicit value through Export → Import')
  assert.equal(zeroImport.snapshot?.bom[1].consumption, 0, 'zero BOM Usage remains an explicit value through Export → Import')
  assert.equal(zeroImport.snapshot?.bom[1].price, 0, 'zero BOM Price remains an explicit value through Export → Import')
  assert.equal(zeroImport.snapshot?.rates[1].laborRate, 0, 'zero Labor Rate remains an explicit value through Export → Import')
  assert.equal(zeroImport.snapshot?.rates[1].burdenRate, 0, 'zero Burden Rate remains an explicit value through Export → Import')
  assert.equal(zeroImport.snapshot?.routing[1].manning, 0, 'zero Manning remains an explicit value through Export → Import')
  const zeroCost = calculateSnapshotCost(zeroSnapshot)
  assert.equal(zeroCost.status, 'complete')
  const zeroFormulaValues = calculateWorkbookFormulaContract(zeroWorkbook)
  close(zeroFormulaValues.material, zeroCost.material, 'zero-inclusive workbook MAT formula semantics')
  close(zeroFormulaValues.labor, zeroCost.labor, 'zero-inclusive workbook Labor formula semantics')
  close(zeroFormulaValues.burden, zeroCost.burden, 'zero-inclusive workbook Burden formula semantics')
  close(zeroFormulaValues.standardCost, zeroCost.total, 'zero-inclusive workbook Standard Cost formula semantics')
  console.log('Valid zero inputs remain numeric zero through workbook export/import and formula-contract calculation.')

  const firstRoundTrip = await parseSnapshotExcelInputFile(new File([exportBuffers.get('reference')!], 'round-trip.xlsx'), 'reference')
  assert.ok(firstRoundTrip.success && firstRoundTrip.snapshot)
  const importedReference = importSnapshotForRole(pair, priorSizing, 'reference', firstRoundTrip.snapshot)
  assert.equal(importedReference.snapshotPair.current, pair.current, 'Reference Import leaves Current Working untouched')
  assert.equal(importedReference.datasetSizing.reference.bomCount, 5)
  assert.equal(importedReference.datasetSizing.reference.wcCount, 2)
  assert.equal(importedReference.datasetSizing.reference.routingCount, 3)
  assert.equal(importedReference.datasetSizing.current.wcCount, 7, 'Reference Import leaves other-role Sizing untouched')
  assert.equal(priorLastSaved.current.marker, 'preserved Last Saved', 'Last Saved is independent from import transformation')
  const customImport = importSnapshotForCustom(firstRoundTrip.snapshot)
  assert.deepEqual(customImport.sizing, { wcCount: 2, bomCount: 5, routingCount: 3 })
  assert.equal(customImport.snapshot.comparisonRole, undefined)
  console.log('Import transforms initialize target Sizing from rows, preserve peer state, and keep Custom outside the comparison pair.')

  const referenceBytes = exportBuffers.get('reference')!
  const validPercentageBoundary = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.META.B6 = { t: 's', v: '100%' }
    workbook.Sheets.BOM.E4 = { t: 's', v: '100%' }
    workbook.Sheets.ROUTING.E4 = { t: 's', v: '100%' }
  })
  const validPercentageBoundaryResult = parseSnapshotWorkbookData(toArrayBuffer(validPercentageBoundary), 'current')
  assert.equal(validPercentageBoundaryResult.success, true, validPercentageBoundaryResult.message)
  assert.equal(validPercentageBoundaryResult.snapshot?.product.sgaPercent, 100)
  assert.equal(validPercentageBoundaryResult.snapshot?.bom[0].loss, 1)
  assert.equal(validPercentageBoundaryResult.snapshot?.routing[0].yield, 1)

  const exactPercentageOverMaximum = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.META.B6 = { t: 's', v: '100.000000000000001%' }
    workbook.Sheets.BOM.E4 = { t: 's', v: '100.000000000000001%' }
    workbook.Sheets.ROUTING.E4 = { t: 's', v: '100.000000000000001%' }
  })
  const exactPercentageOverMaximumResult = parseSnapshotWorkbookData(toArrayBuffer(exactPercentageOverMaximum), 'current')
  assert.equal(exactPercentageOverMaximumResult.success, false,
    'exact percentage values above 100% are rejected when their Number projection equals 100%')
  assert.equal(exactPercentageOverMaximumResult.snapshot, undefined,
    'invalid exact percentage workbooks do not produce an importable snapshot')

  const invalid101Percent = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.META.B6 = { t: 's', v: '101%' }
    workbook.Sheets.BOM.E4 = { t: 's', v: '101%' }
    workbook.Sheets.ROUTING.E4 = { t: 's', v: '101%' }
  })
  const invalid101PercentResult = parseSnapshotWorkbookData(toArrayBuffer(invalid101Percent), 'current')
  assert.equal(invalid101PercentResult.success, false, '101% is rejected for each Master Data percentage field')
  console.log('Master Data percentage imports accept 100% and reject exact values above 100% and 101%.')

  const rowLimitCases = [
    {
      sheet: 'WORK_CENTER', field: 'rates' as const, label: 'Work Center', limit: 500,
      row: (index: number) => [`Limit-WC-${index}`, 0, 0, '']
    },
    {
      sheet: 'BOM', field: 'bom' as const, label: 'BOM', limit: 1000,
      row: (index: number) => [`Limit-Material-${index}`, 1, 'PC', 1, 0, '']
    },
    {
      sheet: 'ROUTING', field: 'routing' as const, label: 'Routing', limit: 500,
      row: (index: number) => [`Limit-Process-${index}`, 'Reference-CUT', 1, 1, '100%', '']
    }
  ]
  for (const { sheet, field, label, limit, row } of rowLimitCases) {
    const atLimitWorkbook = rewriteTableRowCount(referenceBytes, sheet, limit, row)
    const atLimitResult = parseSnapshotWorkbookData(toArrayBuffer(atLimitWorkbook), 'current')
    assert.equal(atLimitResult.success, true, `${label} import accepts exactly ${limit} rows: ${atLimitResult.message}`)
    assert.equal(atLimitResult.snapshot?.[field].length, limit, `${label} import preserves all ${limit} rows`)

    const overLimitWorkbook = rewriteTableRowCount(referenceBytes, sheet, limit + 1, row)
    const overLimitResult = parseSnapshotWorkbookData(toArrayBuffer(overLimitWorkbook), 'current')
    assert.equal(overLimitResult.success, false, `${label} import rejects ${limit + 1} rows`)
    assert.equal(overLimitResult.snapshot, undefined, `${label} import does not silently truncate an oversized workbook`)
    assert.ok(overLimitResult.warnings.some(warning => warning.includes(`${label} rows`)),
      `${label} import reports its configured row limit`)
  }
  console.log('Excel import accepts WC 500, BOM 1000, Routing 500 and rejects the next row without truncation.')

  const missingSheet = rewriteWorkbook(referenceBytes, workbook => {
    workbook.SheetNames = workbook.SheetNames.filter(name => name !== 'ROUTING')
    delete workbook.Sheets.ROUTING
  })
  const missingSheetResult = parseSnapshotWorkbookData(missingSheet.buffer.slice(missingSheet.byteOffset, missingSheet.byteOffset + missingSheet.byteLength) as ArrayBuffer, 'current')
  assert.equal(missingSheetResult.success, false, 'missing required sheet is rejected')

  const wrongSheetName = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.WORK_CENTRE = workbook.Sheets.WORK_CENTER
    delete workbook.Sheets.WORK_CENTER
    workbook.SheetNames = workbook.SheetNames.map(name => name === 'WORK_CENTER' ? 'WORK_CENTRE' : name)
  })
  const wrongSheetResult = parseSnapshotWorkbookData(wrongSheetName.buffer.slice(wrongSheetName.byteOffset, wrongSheetName.byteOffset + wrongSheetName.byteLength) as ArrayBuffer, 'current')
  assert.equal(wrongSheetResult.success, false, 'unsupported wrong sheet name is rejected')

  const badHeader = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.BOM.A3 = { t: 's', v: 'Unrecognized header' }
  })
  const badHeaderResult = parseSnapshotWorkbookData(badHeader.buffer.slice(badHeader.byteOffset, badHeader.byteOffset + badHeader.byteLength) as ArrayBuffer, 'current')
  assert.equal(badHeaderResult.success, false, 'a missing required BOM header is rejected')

  const malformedNumeric = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.BOM.D4 = { t: 's', v: 'not a number' }
  })
  const malformedResult = parseSnapshotWorkbookData(malformedNumeric.buffer.slice(malformedNumeric.byteOffset, malformedNumeric.byteOffset + malformedNumeric.byteLength) as ArrayBuffer, 'current')
  assert.equal(malformedResult.success, false, 'malformed numeric data is rejected')

  const invalidLoss = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.BOM.E4 = { t: 'n', v: -0.01 }
  })
  const invalidLossResult = parseSnapshotWorkbookData(invalidLoss.buffer.slice(invalidLoss.byteOffset, invalidLoss.byteOffset + invalidLoss.byteLength) as ArrayBuffer, 'current')
  assert.equal(invalidLossResult.success, false, 'out-of-domain Loss is rejected')

  const invalidCapacity = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.ROUTING.D4 = { t: 'n', v: 0 }
  })
  const invalidCapacityResult = parseSnapshotWorkbookData(invalidCapacity.buffer.slice(invalidCapacity.byteOffset, invalidCapacity.byteOffset + invalidCapacity.byteLength) as ArrayBuffer, 'current')
  assert.equal(invalidCapacityResult.success, false, 'non-positive Routing Capacity is rejected')

  const invalidYield = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.ROUTING.E4 = { t: 'n', v: 1.2 }
  })
  const invalidYieldResult = parseSnapshotWorkbookData(invalidYield.buffer.slice(invalidYield.byteOffset, invalidYield.byteOffset + invalidYield.byteLength) as ArrayBuffer, 'current')
  assert.equal(invalidYieldResult.success, false, 'Routing Yield above one is rejected')

  const unresolvedWorkCenter = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.ROUTING.B4 = { t: 's', v: 'MISSING-WC' }
  })
  const unresolvedResult = parseSnapshotWorkbookData(unresolvedWorkCenter.buffer.slice(unresolvedWorkCenter.byteOffset, unresolvedWorkCenter.byteOffset + unresolvedWorkCenter.byteLength) as ArrayBuffer, 'current')
  assert.equal(unresolvedResult.success, false, 'unavailable Routing Work Center is rejected')
  console.log('Invalid workbooks: missing/wrong sheet, wrong header, malformed/out-of-domain numerics, and unresolved Routing Work Center rejected.')

  const blankOptional = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.BOM.B4 = { t: 'z' }
  })
  const blankBuffer = blankOptional.buffer.slice(blankOptional.byteOffset, blankOptional.byteOffset + blankOptional.byteLength) as ArrayBuffer
  const blankResult = parseSnapshotWorkbookData(blankBuffer, 'current')
  assert.equal(blankResult.success, true, blankResult.message)
  assert.equal(blankResult.snapshot?.bom[0].consumption, null, 'blank numeric cell remains missing rather than silently becoming zero')
  assert.equal(blankResult.snapshot?.bom[0].confidence.consumption.quality, 'missing')

  const extraColumn = rewriteWorkbook(referenceBytes, workbook => {
    workbook.Sheets.BOM.G3 = { t: 's', v: 'Supplier Group' }
    workbook.Sheets.BOM.G4 = { t: 's', v: 'Vendor-01' }
    workbook.Sheets.BOM['!ref'] = 'A1:G8'
  })
  const extraColumnBuffer = extraColumn.buffer.slice(extraColumn.byteOffset, extraColumn.byteOffset + extraColumn.byteLength) as ArrayBuffer
  const extraColumnResult = parseSnapshotWorkbookData(extraColumnBuffer, 'current')
  assert.equal(extraColumnResult.success, true, extraColumnResult.message)
  assert.equal(extraColumnResult.snapshot?.bom[0].additionalFields?.['Supplier Group'], 'Vendor-01', 'noncanonical extra input columns are staged as additional fields')

  assert.ok(minimumTemplate.byteLength > 0 && mixedTemplate.byteLength > 0)

  console.log('Missing optional numeric values remain null; extra data columns are retained only as import-side fields.')
  console.log(`Artifacts: ${artifactDir}`)
  console.log('EXCEL VALIDATION SERVICE VERIFIER: PASS')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
