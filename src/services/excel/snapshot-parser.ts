import * as XLSX from 'xlsx'
import {
  ComparisonRole,
  CostSnapshot,
  DataConfidence,
  FieldEvidence,
  SnapshotBOMItem,
  SnapshotImportResult,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  SnapshotImportOptions,
  DataQualityStatus,
  getFieldConfidence,
  migratePairedModelToSnapshots
} from '../../core'
import { parseExcelInputFile } from './excel-parser'

type CellValue = string | number | boolean | Date | null
type Row = CellValue[]
type NumericResult = { value: number | null; quality: DataQualityStatus }

const CANONICAL_SHEETS = ['META', 'PRODUCT', 'WORK_CENTER', 'BOM', 'ROUTING'] as const

function normalizeLabel(value: CellValue | undefined): string {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_\-/]+/g, '')
}

function textValue(value: CellValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function numberValue(
  value: CellValue | undefined,
  label: string,
  rowNumber: number,
  warnings: string[]
): NumericResult {
  if (value === null || value === undefined || textValue(value) === '') {
    warnings.push(`Missing ${label} at row ${rowNumber}`)
    return { value: null, quality: 'missing' }
  }
  const parsed = typeof value === 'number' ? value : Number(textValue(value).replace(/,/g, ''))
  if (!Number.isFinite(parsed)) {
    warnings.push(`Invalid ${label} at row ${rowNumber}`)
    return { value: null, quality: 'invalid' }
  }
  return { value: parsed, quality: 'valid' }
}

function findSheetName(workbook: XLSX.WorkBook, wanted: string): string | undefined {
  return workbook.SheetNames.find(name => normalizeLabel(name) === normalizeLabel(wanted))
}

function rowsFor(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const actualName = findSheetName(workbook, sheetName)
  if (!actualName) return []
  const sheet = workbook.Sheets[actualName]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as Row[]
}

function findHeaderRow(rows: Row[], groups: string[][]): number {
  return rows.findIndex(row => {
    const labels = row.map(normalizeLabel)
    return groups.every(group => group.some(alias => labels.includes(normalizeLabel(alias))))
  })
}

function columnMap(row: Row): Map<string, number> {
  const map = new Map<string, number>()
  row.forEach((value, index) => {
    const label = normalizeLabel(value)
    if (label) map.set(label, index)
  })
  return map
}

function additionalFields(row: Row, headers: Row, knownAliases: string[]): Record<string, unknown> | undefined {
  const known = new Set(knownAliases.map(normalizeLabel))
  const fields: Record<string, unknown> = {}
  const keyCounts = new Map<string, number>()

  headers.forEach((header, index) => {
    const label = textValue(header).trim()
    const normalized = normalizeLabel(header)
    if (!label || !normalized || known.has(normalized)) return

    const occurrence = (keyCounts.get(normalized) ?? 0) + 1
    keyCounts.set(normalized, occurrence)
    const key = occurrence === 1 ? label : `${label} (${occurrence})`
    fields[key] = row[index] ?? null
  })

  return Object.keys(fields).length > 0 ? fields : undefined
}

function columnIndex(map: Map<string, number>, aliases: string[]): number {
  for (const alias of aliases) {
    const index = map.get(normalizeLabel(alias))
    if (index !== undefined) return index
  }
  return -1
}

function cell(row: Row, map: Map<string, number>, aliases: string[]): CellValue | undefined {
  const index = columnIndex(map, aliases)
  return index >= 0 ? row[index] : undefined
}

function metaValues(rows: Row[]): Map<string, string> {
  const values = new Map<string, string>()
  const keyValueHeaderIndex = findHeaderRow(rows, [['key', 'field', 'name'], ['value']])
  if (keyValueHeaderIndex >= 0) {
    rows.slice(keyValueHeaderIndex + 1).forEach(row => {
      const key = textValue(row[0]).trim()
      if (key) values.set(key, textValue(row[1]))
    })
    return values
  }

  const remarkHeaderIndex = findHeaderRow(rows, [['remark']])
  if (remarkHeaderIndex >= 0) {
    const map = columnMap(rows[remarkHeaderIndex])
    const index = columnIndex(map, ['remark'])
    const row = rows.slice(remarkHeaderIndex + 1).find(candidate => candidate.some(value => textValue(value) !== ''))
    values.set('Remark', index >= 0 && row ? textValue(row[index]) : '')
  }
  return values
}

function metaValue(meta: Map<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const normalizedAlias = normalizeLabel(alias)
    const value = [...meta.entries()].find(([key]) => normalizeLabel(key) === normalizedAlias)?.[1]
    if (value) return value
  }
  return ''
}

function additionalMetaFields(meta: Map<string, string>): Record<string, unknown> | undefined {
  const known = new Set([
    'format version', 'template version', 'version',
    'product code', 'productcode', 'code',
    'product name', 'productname', 'product description', 'productdescription', 'description', 'name',
    'uom', 'unit', 'customer', 'customer application',
    'remark', 'note',
    'source ref', 'sourceref', 'source',
    'effective date', 'effectivedate',
    'snapshot id', 'snapshotid', 'id', 'comparison role',
    'status', 'dataset status'
  ].map(normalizeLabel))
  const fields = Object.fromEntries([...meta.entries()].filter(([key]) => !known.has(normalizeLabel(key))))
  return Object.keys(fields).length > 0 ? fields : undefined
}

function parseStatus(value: string, warnings: string[]): CostSnapshot['status'] {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'draft' || normalized === 'active' || normalized === 'archived') return normalized
  if (normalized) warnings.push(`Unknown snapshot status "${value}"; imported as draft`)
  return 'draft'
}

function parseConfidence(value: CellValue | undefined): DataConfidence | undefined {
  const normalized = textValue(value).toLowerCase()
  if (normalized === 'verified' || normalized === 'estimated' || normalized === 'missing') return normalized
  return undefined
}

function evidence(
  value: unknown,
  sourceRef: string,
  explicitConfidence: DataConfidence | undefined,
  quality: DataQualityStatus | undefined
): FieldEvidence {
  const resolvedQuality = quality ?? (textValue(value as CellValue) === '' ? 'missing' : 'valid')
  return {
    status: explicitConfidence ?? getFieldConfidence(value, sourceRef),
    quality: resolvedQuality,
    sourceRef: sourceRef || undefined,
    basis: explicitConfidence
      ? 'Imported row confidence'
      : sourceRef
        ? 'Derived from imported value and source reference'
        : 'No source reference provided',
    sourceValue: value,
    workingValue: value
  }
}

function productFromSheet(
  rows: Row[],
  meta: Map<string, string>,
  warnings: string[]
): { product: CostSnapshot['product']; rowCount: number } {
  const headerIndex = findHeaderRow(rows, [['productcode', 'code'], ['product name', 'productname', 'productdescription', 'description', 'name']])
  const header = headerIndex >= 0 ? rows[headerIndex] : []
  const map = columnMap(header)
  const dataRows = headerIndex >= 0
    ? rows.slice(headerIndex + 1).filter(candidate => candidate.some(value => textValue(value) !== ''))
    : []
  const row = dataRows[0] ?? []
  const productCode = textValue(cell(row, map, ['product code', 'productcode', 'code']))
  const productDescription = textValue(cell(row, map, ['product name', 'productname', 'product description', 'productdescription', 'description', 'name'])) || metaValue(meta, ['product name', 'productname', 'product description', 'productdescription'])
  const uom = textValue(cell(row, map, ['uom', 'unit'])) || metaValue(meta, ['uom', 'unit'])
  const customer = textValue(cell(row, map, ['customer', 'customer application'])) || metaValue(meta, ['customer'])
  const effectiveDate = textValue(cell(row, map, ['effective date', 'effectivedate'])) || metaValue(meta, ['effective date', 'effectivedate'])
  const note = textValue(cell(row, map, ['note']))

  if (!productCode) warnings.push('Missing product code in PRODUCT')
  if (!productDescription) warnings.push('Missing product description in PRODUCT')
  if (!uom) warnings.push('Missing UOM in PRODUCT')
  return {
    product: {
      productCode,
      productDescription,
      uom,
      note,
      customer,
      effectiveDate,
      additionalFields: additionalFields(row, header, [
        'product code', 'productcode', 'code',
        'product name', 'productname', 'product description', 'productdescription', 'description', 'name',
        'uom', 'unit', 'note', 'customer', 'customer application', 'effective date', 'effectivedate'
      ])
    },
    rowCount: dataRows.length
  }
}

function parseWorkCenters(
  rows: Row[],
  fallbackSource: string,
  fallbackDate: string,
  warnings: string[]
): SnapshotWorkCenterRate[] {
  const headerIndex = findHeaderRow(rows, [['work center code', 'workcentercode', 'work center', 'wc'], ['labor rate'], ['burden rate']])
  if (headerIndex < 0) {
    warnings.push('WORK_CENTER header not found')
    return []
  }
  const map = columnMap(rows[headerIndex])
  const rates: SnapshotWorkCenterRate[] = []
  rows.slice(headerIndex + 1).forEach((row, index) => {
    const rowNumber = headerIndex + index + 2
    if (!row.some(value => textValue(value) !== '')) return
    const code = textValue(cell(row, map, ['work center code', 'workcentercode', 'work center', 'wc']))
    if (!code) {
      warnings.push(`Missing Work Center code at row ${rowNumber}`)
    }
    const sourceRef = textValue(cell(row, map, ['source ref', 'sourceref', 'source'])) || fallbackSource
    const explicitConfidence = parseConfidence(cell(row, map, ['confidence', 'status']))
    const laborRate = numberValue(cell(row, map, ['labor rate', 'laborrate']), 'laborRate', rowNumber, warnings)
    const burdenRate = numberValue(cell(row, map, ['burden rate', 'burdenrate']), 'burdenRate', rowNumber, warnings)
    const effectiveDate = textValue(cell(row, map, ['effective date', 'effectivedate'])) || fallbackDate
    const id = textValue(cell(row, map, ['id', 'work center id', 'workcenterid'])) || `rate-${rowNumber}`
    rates.push({
      id,
      workCenterCode: code,
      description: textValue(cell(row, map, ['work center name', 'workcentername', 'description', 'work center description', 'workcenterdescription'])) || code,
      laborRate: laborRate.value,
      burdenRate: burdenRate.value,
      effectiveDate,
      note: textValue(cell(row, map, ['note'])),
      sourceRef,
      confidence: {
        laborRate: evidence(laborRate.value, sourceRef, explicitConfidence, laborRate.quality),
        burdenRate: evidence(burdenRate.value, sourceRef, explicitConfidence, burdenRate.quality)
      },
      additionalFields: additionalFields(row, rows[headerIndex], [
        'work center code', 'workcentercode', 'work center', 'wc',
        'labor rate', 'laborrate', 'burden rate', 'burdenrate',
        'description', 'work center name', 'workcentername', 'work center description', 'workcenterdescription',
        'effective date', 'effectivedate', 'id', 'work center id', 'workcenterid',
        'source ref', 'sourceref', 'source', 'confidence', 'status', 'note'
      ])
    })
  })
  if (rates.length === 0) warnings.push('No Work Center rows found')
  return rates
}

function parseBOM(
  rows: Row[],
  fallbackSource: string,
  warnings: string[]
): SnapshotBOMItem[] {
  const headerIndex = findHeaderRow(rows, [['item code', 'itemcode', 'material', 'material code'], ['consumption', 'usage'], ['price']])
  if (headerIndex < 0) {
    warnings.push('BOM header not found')
    return []
  }
  const map = columnMap(rows[headerIndex])
  const items: SnapshotBOMItem[] = []
  rows.slice(headerIndex + 1).forEach((row, index) => {
    const rowNumber = headerIndex + index + 2
    if (!row.some(value => textValue(value) !== '')) return
    const itemCode = textValue(cell(row, map, ['item code', 'itemcode', 'material', 'material code']))
    if (!itemCode) {
      warnings.push(`Missing item code at row ${rowNumber}`)
    }
    const sourceRef = textValue(cell(row, map, ['source ref', 'sourceref', 'source'])) || fallbackSource
    const explicitConfidence = parseConfidence(cell(row, map, ['confidence', 'status']))
    const consumption = numberValue(cell(row, map, ['consumption', 'usage', 'quantity']), 'consumption', rowNumber, warnings)
    const price = numberValue(cell(row, map, ['price', 'material price']), 'price', rowNumber, warnings)
    const loss = numberValue(cell(row, map, ['loss', 'loss rate']), 'loss', rowNumber, warnings)
    const description = textValue(cell(row, map, ['description', 'material description']))
    const unit = textValue(cell(row, map, ['unit', 'uom']))
    if (!unit) warnings.push(`Missing unit at row ${rowNumber}`)
    items.push({
      id: textValue(cell(row, map, ['id', 'bom id', 'bomid'])) || `bom-${rowNumber}`,
      itemCode,
      description,
      consumption: consumption.value,
      unit,
      price: price.value,
      loss: loss.value,
      note: textValue(cell(row, map, ['note'])),
      sourceRef,
      confidence: {
        consumption: evidence(consumption.value, sourceRef, explicitConfidence, consumption.quality),
        price: evidence(price.value, sourceRef, explicitConfidence, price.quality),
        loss: evidence(loss.value, sourceRef, explicitConfidence, loss.quality)
      },
      additionalFields: additionalFields(row, rows[headerIndex], [
        'item code', 'itemcode', 'material', 'material code',
        'consumption', 'usage', 'quantity', 'price', 'material price',
        'loss', 'loss rate', 'description', 'material description', 'unit', 'uom',
        'id', 'bom id', 'bomid', 'source ref', 'sourceref', 'source', 'confidence', 'status', 'note'
      ])
    })
  })
  if (items.length === 0) warnings.push('No BOM rows found')
  return items
}

function parseRouting(
  rows: Row[],
  fallbackSource: string,
  warnings: string[]
): SnapshotRoutingStep[] {
  const headerIndex = findHeaderRow(rows, [['sequence', 'seq', 'op seq'], ['process name', 'process', 'description'], ['work center code', 'work center id', 'work center', 'wc']])
  if (headerIndex < 0) {
    warnings.push('ROUTING header not found')
    return []
  }
  const map = columnMap(rows[headerIndex])
  const steps: SnapshotRoutingStep[] = []
  const usedIds = new Set<string>()
  rows.slice(headerIndex + 1).forEach((row, index) => {
    const rowNumber = headerIndex + index + 2
    const operationCode = textValue(cell(row, map, ['operation code', 'operationcode', 'operation']))
    const processCode = textValue(cell(row, map, ['process code', 'processcode']))
    const hasData = row.some(value => textValue(value) !== '')
    if (!hasData) return
    const preferredId = textValue(cell(row, map, ['id', 'routing id', 'routingid'])) || operationCode || processCode || `routing-${rowNumber}`
    let id = preferredId
    if (usedIds.has(id)) {
      id = `routing-${rowNumber}`
      while (usedIds.has(id)) id = `${id}-imported`
    }
    usedIds.add(id)
    if (!operationCode) warnings.push(`Missing Operation Code at row ${rowNumber}; Routing row will not be matched.`)
    const sourceRef = textValue(cell(row, map, ['source ref', 'sourceref', 'source'])) || fallbackSource
    const explicitConfidence = parseConfidence(cell(row, map, ['confidence', 'status']))
    const sequence = numberValue(cell(row, map, ['sequence', 'seq', 'op seq']), 'sequence', rowNumber, warnings)
    const manning = numberValue(cell(row, map, ['manning', 'headcount']), 'manning', rowNumber, warnings)
    const capacity = numberValue(cell(row, map, ['capacity', 'cap']), 'capacity', rowNumber, warnings)
    const yieldValue = numberValue(cell(row, map, ['yield', 'yield rate']), 'yield', rowNumber, warnings)
    const processName = textValue(cell(row, map, ['process name', 'process', 'description']))
    const workCenterId = textValue(cell(row, map, ['work center id', 'workcenterid', 'work center code', 'work center', 'wc']))
    if (!processName) warnings.push(`Missing processName at row ${rowNumber}`)
    if (!workCenterId) warnings.push(`Missing workCenterId at row ${rowNumber}`)
    steps.push({
      id,
      operationCode: operationCode || undefined,
      sequence: sequence.value ?? undefined,
      processCode: processCode || undefined,
      processName,
      workCenterId: workCenterId || undefined,
      manning: manning.value,
      capacity: capacity.value,
      yield: yieldValue.value,
      note: textValue(cell(row, map, ['note'])),
      sourceRef,
      confidence: {
        sequence: evidence(sequence.value, sourceRef, explicitConfidence, sequence.quality),
        manning: evidence(manning.value, sourceRef, explicitConfidence, manning.quality),
        capacity: evidence(capacity.value, sourceRef, explicitConfidence, capacity.quality),
        yield: evidence(yieldValue.value, sourceRef, explicitConfidence, yieldValue.quality)
      },
      additionalFields: additionalFields(row, rows[headerIndex], [
        'operation code', 'operationcode', 'operation', 'id', 'routing id', 'routingid',
        'process code', 'processcode',
        'sequence', 'seq', 'op seq', 'manning', 'headcount', 'capacity', 'cap', 'yield', 'yield rate',
        'process name', 'process', 'description', 'work center id', 'workcenterid',
        'work center code', 'work center', 'wc', 'source ref', 'sourceref', 'source', 'confidence', 'status', 'note'
      ])
    })
  })
  if (steps.length === 0) warnings.push('No Routing rows found')
  return steps
}

function isCanonicalWorkbook(workbook: XLSX.WorkBook): boolean {
  return CANONICAL_SHEETS.every(sheet => Boolean(findSheetName(workbook, sheet)))
}

/** Parses the canonical one-snapshot workbook without defaulting blank numeric cells to zero. */
export function parseSnapshotWorkbookData(
  data: ArrayBuffer,
  role: ComparisonRole
): SnapshotImportResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const warnings: string[] = []

  if (!isCanonicalWorkbook(workbook)) {
    return {
      success: false,
      message: 'Canonical snapshot workbook not recognized. Required sheets: META, PRODUCT, WORK_CENTER, BOM, ROUTING.',
      format: undefined,
      warnings: ['Workbook is not in the canonical one-Product/one-Dataset format.'],
      role
    }
  }

  const meta = metaValues(rowsFor(workbook, 'META'))
  const productResult = productFromSheet(rowsFor(workbook, 'PRODUCT'), meta, warnings)
  const product = productResult.product
  if (productResult.rowCount !== 1) {
    return {
      success: false,
      message: `PRODUCT must contain exactly one Product row; found ${productResult.rowCount}.`,
      format: 'canonical',
      warnings,
      role
    }
  }
  const sourceRef = metaValue(meta, ['source ref', 'sourceref', 'source'])
  const effectiveDate = product.effectiveDate || metaValue(meta, ['effective date', 'effectivedate'])
  const snapshotId = metaValue(meta, ['snapshot id', 'snapshotid', 'id']) || `${product.productCode || 'snapshot'}:${role}`
  const status = parseStatus(metaValue(meta, ['status', 'dataset status']), warnings)

  const snapshot: CostSnapshot = {
    id: snapshotId,
    product,
    effectiveDate,
    sourceRef: sourceRef || 'Imported Excel (source not provided)',
    comparisonRole: role,
    status,
    remark: metaValue(meta, ['remark']),
    rates: parseWorkCenters(rowsFor(workbook, 'WORK_CENTER'), sourceRef, effectiveDate, warnings),
    bom: parseBOM(rowsFor(workbook, 'BOM'), sourceRef, warnings),
    routing: parseRouting(rowsFor(workbook, 'ROUTING'), sourceRef, warnings),
    additionalFields: additionalMetaFields(meta),
    warnings
  }

  const workCenterCodes = new Set(snapshot.rates.map(rate => rate.workCenterCode.trim().toLowerCase()).filter(Boolean))
  snapshot.routing.forEach(step => {
    const workCenter = step.workCenterId?.trim().toLowerCase()
    if (workCenter && !workCenterCodes.has(workCenter)) {
      warnings.push(`Unknown Work Center "${step.workCenterId}" referenced by Routing ${step.id}`)
    }
  })

  return {
    success: true,
    message: `Imported ${role} snapshot: ${snapshot.rates.length} Work Centers, ${snapshot.bom.length} BOM Items, ${snapshot.routing.length} Routing Steps.`,
    format: 'canonical',
    snapshot,
    warnings,
    role
  }
}

export async function parseSnapshotExcelInputFile(
  file: File,
  role: ComparisonRole,
  options: SnapshotImportOptions = {}
): Promise<SnapshotImportResult> {
  const data = await file.arrayBuffer()
  const canonicalResult = parseSnapshotWorkbookData(data, role)
  if (canonicalResult.success) return canonicalResult

  if (options.allowLegacy === false) return canonicalResult

  const legacyResult = await parseExcelInputFile(file)
  if (!legacyResult.success) {
    return {
      success: false,
      message: `${canonicalResult.message} Legacy parser: ${legacyResult.message}`,
      warnings: [...(canonicalResult.warnings ?? []), ...(legacyResult.warnings ?? [])],
      role
    }
  }

  const legacyPair = migratePairedModelToSnapshots({
    id: `legacy-import:${file.name}`,
    product: legacyResult.product ?? {
      productCode: '',
      productDescription: '',
      uom: '',
      customer: '',
      effectiveDate: ''
    },
    rates: legacyResult.rates ?? [],
    bom: legacyResult.bom ?? [],
    routing: legacyResult.routing ?? [],
    status: 'draft',
    sourceRef: file.name
  })
  const snapshot = role === 'reference' ? legacyPair.reference : legacyPair.current

  return {
    success: true,
    message: `Imported ${role} snapshot through legacy paired workbook adapter: ${snapshot.rates.length} Work Centers, ${snapshot.bom.length} BOM Items, ${snapshot.routing.length} Routing Steps.`,
    format: 'legacy',
    snapshot,
    warnings: [
      ...(legacyResult.warnings ?? []),
      'Imported through legacy paired workbook adapter; review defaulted fields and confidence before using the comparison.'
    ],
    role
  }
}
