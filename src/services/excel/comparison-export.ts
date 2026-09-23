import ExcelJS from 'exceljs'
import {
  ComparisonFinding,
  ConfidenceStatus,
  CostComparison,
  CostSnapshot,
  ProductMaster,
  SnapshotPair,
  getComparisonStatusLabels,
} from '../../core'

export interface ComparisonExportInput {
  product: ProductMaster
  snapshotPair: SnapshotPair
  comparison: CostComparison
}

export interface ComparisonExportSummaryRow {
  element: 'Material' | 'Labor' | 'Burden' | 'Total'
  reference: number | null
  current: number | null
  gap: number | null
  referenceStatus: string
  currentStatus: string
}

export interface ComparisonExportStatusCounts {
  matched: number
  changed: number
  added: number
  removed: number
  review: number
}

export interface ComparisonExportBOMRow {
  itemCode: string
  description: string
  comparison: string
  confidence: ConfidenceStatus
  referenceConsumption: number | null
  currentConsumption: number | null
  consumptionGap: number | null
  unit: string
  referencePrice: number | null
  currentPrice: number | null
  priceGap: number | null
  referenceLoss: number | null
  currentLoss: number | null
  lossGap: number | null
  referenceSource: string
  currentSource: string
}

export interface ComparisonExportRoutingRow {
  operationCode: string
  processName: string
  comparison: string
  confidence: ConfidenceStatus
  referenceSequence: number | null
  currentSequence: number | null
  referenceWorkCenter: string
  currentWorkCenter: string
  manning: number | null
  referenceCapacity: number | null
  currentCapacity: number | null
  capacityGap: number | null
  referenceYield: number | null
  currentYield: number | null
  yieldGap: number | null
  referenceSource: string
  currentSource: string
}

export interface ComparisonExportWorkCenterRow {
  workCenterCode: string
  description: string
  comparison: string
  confidence: ConfidenceStatus
  referenceLaborRate: number | null
  currentLaborRate: number | null
  laborGap: number | null
  referenceBurdenRate: number | null
  currentBurdenRate: number | null
  burdenGap: number | null
  referenceEffectiveDate: string
  currentEffectiveDate: string
  referenceSource: string
  currentSource: string
}

export interface ComparisonExportModel {
  metadata: {
    productCode: string
    productDescription: string
    uom: string
    customer: string
    comparisonId: string
    referenceSnapshotId: string
    currentSnapshotId: string
    referenceEffectiveDate: string
    currentEffectiveDate: string
    referenceSource: string
    currentSource: string
  }
  summaryRows: ComparisonExportSummaryRow[]
  statusCounts: ComparisonExportStatusCounts
  bomRows: ComparisonExportBOMRow[]
  routingRows: ComparisonExportRoutingRow[]
  workCenterRows: ComparisonExportWorkCenterRow[]
  warnings: string[]
}

type ComparisonExportRow = {
  comparison: string
  confidence: ConfidenceStatus
  referenceSource: string
  currentSource: string
}

function gap(current: number | null | undefined, reference: number | null | undefined): number | null {
  if (current === null || current === undefined || reference === null || reference === undefined) return null
  return current - reference
}

function sourceOf(row: { sourceRef?: string } | undefined, fallback: CostSnapshot): string {
  return row?.sourceRef || fallback.sourceRef || '—'
}

function confidenceOf(finding: ComparisonFinding | undefined): ConfidenceStatus {
  return finding?.confidence ?? 'missing'
}

function statusGroup(finding: ComparisonFinding | undefined, changed: boolean): keyof ComparisonExportStatusCounts {
  if (!finding || finding.matchStatus === 'ambiguous' || finding.matchStatus === 'unmatched') return 'review'
  if (finding.matchStatus === 'added') return 'added'
  if (finding.matchStatus === 'removed') return 'removed'
  return changed ? 'changed' : 'matched'
}

function addStatusCount(
  counts: ComparisonExportStatusCounts,
  finding: ComparisonFinding,
  changed: boolean
): void {
  counts[statusGroup(finding, changed)] += 1
}

function bomLabel(finding: ComparisonFinding | undefined): string {
  return getComparisonStatusLabels(finding).join(', ')
}

function routingLabels(finding: ComparisonFinding | undefined): string {
  return getComparisonStatusLabels(finding).join(', ')
}

function workCenterLabel(finding: ComparisonFinding | undefined): string {
  return getComparisonStatusLabels(finding).join(', ')
}

function isBomChanged(finding: ComparisonFinding): boolean {
  return finding.matchStatus === 'matched' && Object.keys(finding.fieldDiffs).length > 0
}

function isRoutingChanged(finding: ComparisonFinding): boolean {
  return finding.matchStatus === 'matched' && (
    finding.changeFlags.reordered === true ||
    finding.changeFlags.movedWorkCenter === true ||
    finding.changeFlags.changedInputs === true
  )
}

function isWorkCenterChanged(finding: ComparisonFinding): boolean {
  return finding.matchStatus === 'matched' && finding.changeFlags.changedRate === true
}

function baseRow(
  finding: ComparisonFinding | undefined,
  reference: { sourceRef?: string } | undefined,
  current: { sourceRef?: string } | undefined,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  comparison: string
): ComparisonExportRow {
  return {
    comparison,
    confidence: confidenceOf(finding),
    referenceSource: sourceOf(reference, referenceSnapshot),
    currentSource: sourceOf(current, currentSnapshot)
  }
}

function buildBOMRows(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  findings: ComparisonFinding[],
  statusCounts: ComparisonExportStatusCounts
): ComparisonExportBOMRow[] {
  const referenceById = new Map(referenceSnapshot.bom.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )
  const rows = currentSnapshot.bom.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const comparison = bomLabel(finding)
    if (finding) addStatusCount(statusCounts, finding, isBomChanged(finding))

    return {
      ...baseRow(finding, reference, current, referenceSnapshot, currentSnapshot, comparison),
      itemCode: current.itemCode,
      description: current.description,
      referenceConsumption: reference?.consumption ?? null,
      currentConsumption: current.consumption,
      consumptionGap: gap(current.consumption, reference?.consumption),
      unit: current.unit || reference?.unit || '—',
      referencePrice: reference?.price ?? null,
      currentPrice: current.price,
      priceGap: gap(current.price, reference?.price),
      referenceLoss: reference?.loss ?? null,
      currentLoss: current.loss,
      lossGap: gap(current.loss, reference?.loss)
    }
  })

  findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .forEach(finding => {
      const reference = referenceById.get(finding.referenceId as string)
      if (!reference) return
      addStatusCount(statusCounts, finding, isBomChanged(finding))
      rows.push({
        ...baseRow(finding, reference, undefined, referenceSnapshot, currentSnapshot, bomLabel(finding)),
        itemCode: reference.itemCode,
        description: reference.description,
        referenceConsumption: reference.consumption,
        currentConsumption: null,
        consumptionGap: null,
        unit: reference.unit || '—',
        referencePrice: reference.price,
        currentPrice: null,
        priceGap: null,
        referenceLoss: reference.loss,
        currentLoss: null,
        lossGap: null
      })
    })

  return rows
}

function buildRoutingRows(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  findings: ComparisonFinding[],
  statusCounts: ComparisonExportStatusCounts
): ComparisonExportRoutingRow[] {
  const referenceById = new Map(referenceSnapshot.routing.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )
  const rows = currentSnapshot.routing.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const comparison = routingLabels(finding)
    if (finding) addStatusCount(statusCounts, finding, isRoutingChanged(finding))

    return {
      ...baseRow(finding, reference, current, referenceSnapshot, currentSnapshot, comparison),
      operationCode: current.operationCode || reference?.operationCode || current.id,
      processName: current.processName || reference?.processName || '—',
      referenceSequence: reference?.sequence ?? null,
      currentSequence: current.sequence ?? null,
      referenceWorkCenter: reference?.workCenterId || '—',
      currentWorkCenter: current.workCenterId || '—',
      manning: current.manning,
      referenceCapacity: reference?.capacity ?? null,
      currentCapacity: current.capacity,
      capacityGap: gap(current.capacity, reference?.capacity),
      referenceYield: reference?.yield ?? null,
      currentYield: current.yield,
      yieldGap: gap(current.yield, reference?.yield)
    }
  })

  findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .forEach(finding => {
      const reference = referenceById.get(finding.referenceId as string)
      if (!reference) return
      addStatusCount(statusCounts, finding, isRoutingChanged(finding))
      rows.push({
        ...baseRow(finding, reference, undefined, referenceSnapshot, currentSnapshot, routingLabels(finding)),
        operationCode: reference.operationCode || reference.id,
        processName: reference.processName || '—',
        referenceSequence: reference.sequence ?? null,
        currentSequence: null,
        referenceWorkCenter: reference.workCenterId || '—',
        currentWorkCenter: '—',
        manning: null,
        referenceCapacity: reference.capacity,
        currentCapacity: null,
        capacityGap: null,
        referenceYield: reference.yield,
        currentYield: null,
        yieldGap: null
      })
    })

  return rows
}

function buildWorkCenterRows(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  findings: ComparisonFinding[],
  statusCounts: ComparisonExportStatusCounts
): ComparisonExportWorkCenterRow[] {
  const referenceById = new Map(referenceSnapshot.rates.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )
  const rows = currentSnapshot.rates.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const comparison = workCenterLabel(finding)
    if (finding) addStatusCount(statusCounts, finding, isWorkCenterChanged(finding))

    return {
      ...baseRow(finding, reference, current, referenceSnapshot, currentSnapshot, comparison),
      workCenterCode: current.workCenterCode,
      description: current.description || reference?.description || '—',
      referenceLaborRate: reference?.laborRate ?? null,
      currentLaborRate: current.laborRate,
      laborGap: gap(current.laborRate, reference?.laborRate),
      referenceBurdenRate: reference?.burdenRate ?? null,
      currentBurdenRate: current.burdenRate,
      burdenGap: gap(current.burdenRate, reference?.burdenRate),
      referenceEffectiveDate: reference?.effectiveDate || '—',
      currentEffectiveDate: current.effectiveDate || '—'
    }
  })

  findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .forEach(finding => {
      const reference = referenceById.get(finding.referenceId as string)
      if (!reference) return
      addStatusCount(statusCounts, finding, isWorkCenterChanged(finding))
      rows.push({
        ...baseRow(finding, reference, undefined, referenceSnapshot, currentSnapshot, workCenterLabel(finding)),
        workCenterCode: reference.workCenterCode,
        description: reference.description || '—',
        referenceLaborRate: reference.laborRate,
        currentLaborRate: null,
        laborGap: null,
        referenceBurdenRate: reference.burdenRate,
        currentBurdenRate: null,
        burdenGap: null,
        referenceEffectiveDate: reference.effectiveDate || '—',
        currentEffectiveDate: '—'
      })
    })

  return rows
}

function countFindingStatuses(
  counts: ComparisonExportStatusCounts,
  findings: ComparisonFinding[],
  changed: (finding: ComparisonFinding) => boolean
): void {
  findings.forEach(finding => addStatusCount(counts, finding, changed(finding)))
}

export function buildComparisonExportModel(input: ComparisonExportInput): ComparisonExportModel {
  const { product, snapshotPair, comparison } = input
  const statusCounts: ComparisonExportStatusCounts = {
    matched: 0,
    changed: 0,
    added: 0,
    removed: 0,
    review: 0
  }

  const bomRows = buildBOMRows(snapshotPair.reference, snapshotPair.current, comparison.bomFindings, statusCounts)
  const routingRows = buildRoutingRows(snapshotPair.reference, snapshotPair.current, comparison.routingFindings, statusCounts)
  const workCenterRows = buildWorkCenterRows(snapshotPair.reference, snapshotPair.current, comparison.workCenterFindings, statusCounts)

  // The row builders count visible rows. Keep findings without a usable row visible in the summary as review items.
  countFindingStatuses(statusCounts, comparison.bomFindings.filter(finding => !finding.currentId && !finding.referenceId), isBomChanged)
  countFindingStatuses(statusCounts, comparison.routingFindings.filter(finding => !finding.currentId && !finding.referenceId), isRoutingChanged)
  countFindingStatuses(statusCounts, comparison.workCenterFindings.filter(finding => !finding.currentId && !finding.referenceId), isWorkCenterChanged)

  return {
    metadata: {
      productCode: product.productCode,
      productDescription: product.productDescription,
      uom: product.uom,
      customer: product.customer,
      comparisonId: comparison.id,
      referenceSnapshotId: comparison.referenceSnapshotId,
      currentSnapshotId: comparison.currentSnapshotId,
      referenceEffectiveDate: snapshotPair.reference.effectiveDate,
      currentEffectiveDate: snapshotPair.current.effectiveDate,
      referenceSource: snapshotPair.reference.sourceRef,
      currentSource: snapshotPair.current.sourceRef
    },
    summaryRows: [
      {
        element: 'Material',
        reference: comparison.referenceCost.material,
        current: comparison.currentCost.material,
        gap: comparison.elementGaps.material,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      },
      {
        element: 'Labor',
        reference: comparison.referenceCost.labor,
        current: comparison.currentCost.labor,
        gap: comparison.elementGaps.labor,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      },
      {
        element: 'Burden',
        reference: comparison.referenceCost.burden,
        current: comparison.currentCost.burden,
        gap: comparison.elementGaps.burden,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      },
      {
        element: 'Total',
        reference: comparison.referenceCost.total,
        current: comparison.currentCost.total,
        gap: comparison.totalGap,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      }
    ],
    statusCounts,
    bomRows,
    routingRows,
    workCenterRows,
    warnings: comparison.warnings.map(warning => warning.message)
  }
}

const COLOR_DARK_NAVY = 'FF1E293B'
const COLOR_BORDER = 'FFE2E8F0'
const COLOR_WHITE = 'FFFFFFFF'
const COLOR_TEXT = 'FF0F172A'
const COLOR_MUTED = 'FF64748B'
const COLOR_GREEN = 'FFDCFCE7'
const COLOR_GREEN_TEXT = 'FF166534'
const COLOR_AMBER = 'FFFEF3C7'
const COLOR_AMBER_TEXT = 'FF92400E'
const COLOR_BLUE = 'FFE0F2FE'
const COLOR_BLUE_TEXT = 'FF0369A1'
const COLOR_RED = 'FFFFE4E6'
const COLOR_RED_TEXT = 'FFBE123C'
const COLOR_SLATE = 'FFF1F5F9'
const COLOR_SLATE_TEXT = 'FF334155'

const borderThin = {
  top: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  left: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin' as const, color: { argb: COLOR_BORDER } },
  right: { style: 'thin' as const, color: { argb: COLOR_BORDER } }
}

const fillHeader = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLOR_DARK_NAVY }
}

function styleTitle(sheet: ExcelJS.Worksheet, title: string): void {
  const cell = sheet.getCell('A1')
  cell.value = title
  cell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLOR_DARK_NAVY } }
  cell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 24
}

function styleHeaderRow(row: ExcelJS.Row, columnCount: number): void {
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = row.getCell(column)
    cell.fill = fillHeader
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = borderThin
  }
  row.height = 30
}

function styleDataRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  statusColumn: number,
  confidenceColumn: number,
  numberFormats: Record<number, string>
): void {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLOR_TEXT } }
      cell.border = borderThin
      cell.alignment = { vertical: 'middle', wrapText: false }
    })

    const status = String(row.getCell(statusColumn).value ?? '')
    const statusStyle = statusCellStyle(status)
    row.getCell(statusColumn).fill = statusStyle.fill
    row.getCell(statusColumn).font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: statusStyle.text }
    }

    const confidence = String(row.getCell(confidenceColumn).value ?? '')
    const confidenceStyle = confidenceCellStyle(confidence)
    row.getCell(confidenceColumn).fill = confidenceStyle.fill
    row.getCell(confidenceColumn).font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: confidenceStyle.text }
    }

    Object.entries(numberFormats).forEach(([column, format]) => {
      row.getCell(Number(column)).numFmt = format
      row.getCell(Number(column)).alignment = { horizontal: 'right', vertical: 'middle' }
    })
  }
}

function statusCellStyle(status: string): { fill: ExcelJS.Fill; text: string } {
  if (status === 'Matched') return { fill: solidFill(COLOR_GREEN), text: COLOR_GREEN_TEXT }
  if (status.includes('Changed') || status.includes('Reordered') || status.includes('Moved')) {
    return { fill: solidFill(COLOR_AMBER), text: COLOR_AMBER_TEXT }
  }
  if (status === 'Added') return { fill: solidFill(COLOR_BLUE), text: COLOR_BLUE_TEXT }
  if (status === 'Removed') return { fill: solidFill(COLOR_RED), text: COLOR_RED_TEXT }
  return { fill: solidFill(COLOR_SLATE), text: COLOR_SLATE_TEXT }
}

function confidenceCellStyle(status: string): { fill: ExcelJS.Fill; text: string } {
  if (status === 'Verified') return { fill: solidFill(COLOR_GREEN), text: COLOR_GREEN_TEXT }
  if (status === 'Estimated') return { fill: solidFill(COLOR_AMBER), text: COLOR_AMBER_TEXT }
  return { fill: solidFill(COLOR_RED), text: COLOR_RED_TEXT }
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function confidenceLabel(status: ConfidenceStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function excelDate(value: string): Date | string | null {
  if (!value || value === '—') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function columnName(columnNumber: number): string {
  let number = columnNumber
  let name = ''
  while (number > 0) {
    const remainder = (number - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    number = Math.floor((number - 1) / 26)
  }
  return name
}

export function getComparisonExportFilename(productCode: string): string {
  const safeProductCode = productCode.trim().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'PRODUCT'
  return `CostBreakdown_Comparison_${safeProductCode}.xlsx`
}

function createDetailSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  columns: Array<{ header: string; width: number }>
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ showGridLines: true, state: 'frozen', ySplit: 4 }] })
  sheet.columns = columns
  styleTitle(sheet, title)
  const header = sheet.getRow(4)
  header.values = columns.map(column => column.header)
  styleHeaderRow(header, columns.length)
  sheet.autoFilter = { from: 'A4', to: `${columnName(columns.length)}4` }
  return sheet
}

function writeSummarySheet(workbook: ExcelJS.Workbook, model: ComparisonExportModel): void {
  const sheet = workbook.addWorksheet('Summary', { views: [{ showGridLines: true }] })
  sheet.columns = [
    { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 26 }
  ]
  styleTitle(sheet, 'Cost Breakdown Comparison')

  sheet.getCell('A2').value = 'Product'
  sheet.getCell('B2').value = `${model.metadata.productCode} — ${model.metadata.productDescription}`
  sheet.getCell('A3').value = 'Reference Snapshot'
  sheet.getCell('B3').value = model.metadata.referenceSnapshotId
  sheet.getCell('D3').value = 'Current Snapshot'
  sheet.getCell('E3').value = model.metadata.currentSnapshotId
  sheet.getCell('A4').value = 'Reference Source'
  sheet.getCell('B4').value = model.metadata.referenceSource
  sheet.getCell('D4').value = 'Current Source'
  sheet.getCell('E4').value = model.metadata.currentSource
  sheet.getCell('A5').value = 'Reference Date'
  sheet.getCell('B5').value = excelDate(model.metadata.referenceEffectiveDate)
  sheet.getCell('D5').value = 'Current Date'
  sheet.getCell('E5').value = excelDate(model.metadata.currentEffectiveDate)
  ;['A2', 'A3', 'A4', 'A5', 'D3', 'D4', 'D5'].forEach(address => {
    const cell = sheet.getCell(address)
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_MUTED } }
  })
  ;['B2', 'B3', 'B4', 'B5', 'E3', 'E4', 'E5'].forEach(address => {
    const cell = sheet.getCell(address)
    cell.font = { name: 'Calibri', size: 10, color: { argb: COLOR_TEXT } }
    cell.border = borderThin
  })
  sheet.getCell('B5').numFmt = 'yyyy-mm-dd'
  sheet.getCell('E5').numFmt = 'yyyy-mm-dd'

  const summaryHeader = sheet.getRow(6)
  summaryHeader.values = ['Element', 'Reference', 'Current', 'Gap', 'Reference Status', 'Current Status']
  styleHeaderRow(summaryHeader, 6)
  model.summaryRows.forEach(summaryRow => {
    const row = sheet.addRow([
      summaryRow.element,
      summaryRow.reference,
      summaryRow.current,
      summaryRow.gap,
      summaryRow.referenceStatus,
      summaryRow.currentStatus
    ])
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLOR_TEXT } }
      cell.border = borderThin
    })
    row.getCell(2).numFmt = '#,##0.0000'
    row.getCell(3).numFmt = '#,##0.0000'
    row.getCell(4).numFmt = '#,##0.0000;[Red]-#,##0.0000;—'
  })

  const totalRow = sheet.getRow(10)
  totalRow.eachCell({ includeEmpty: true }, cell => {
    cell.fill = solidFill(COLOR_SLATE)
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_TEXT } }
    cell.border = borderThin
  })

  sheet.getCell('A12').value = 'Comparison Status Counts'
  sheet.getCell('A12').font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_DARK_NAVY } }
  const countHeader = sheet.getRow(13)
  countHeader.values = ['Status', 'Count']
  styleHeaderRow(countHeader, 2)
  const statusRows: Array<[string, number]> = [
    ['Matched', model.statusCounts.matched],
    ['Changed', model.statusCounts.changed],
    ['Added', model.statusCounts.added],
    ['Removed', model.statusCounts.removed],
    ['Review', model.statusCounts.review]
  ]
  statusRows.forEach(([status, count]) => {
    const row = sheet.addRow([status, count])
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLOR_TEXT } }
      cell.border = borderThin
    })
    row.getCell(1).fill = statusCellStyle(status).fill
    row.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: statusCellStyle(status).text } }
  })

  const warningTitleRow = 20
  sheet.getCell(`A${warningTitleRow}`).value = 'Warnings'
  sheet.getCell(`A${warningTitleRow}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_DARK_NAVY } }
  const warnings = model.warnings.length > 0 ? model.warnings : ['None']
  warnings.forEach((warning, index) => {
    const row = sheet.getRow(warningTitleRow + 1 + index)
    row.getCell(1).value = warning
    row.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: COLOR_TEXT } }
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' }
  })
}

function writeBOMSheet(workbook: ExcelJS.Workbook, model: ComparisonExportModel): void {
  const sheet = createDetailSheet(workbook, 'BOM Comparison', 'BOM Comparison', [
    { header: 'Item Code', width: 16 }, { header: 'Description', width: 32 },
    { header: 'Comparison', width: 18 }, { header: 'Confidence', width: 14 },
    { header: 'Reference Consumption', width: 18 }, { header: 'Current Consumption', width: 18 },
    { header: 'Δ Consumption', width: 16 }, { header: 'Unit', width: 10 },
    { header: 'Reference Price', width: 16 }, { header: 'Current Price', width: 16 },
    { header: 'Δ Price', width: 14 }, { header: 'Reference Loss', width: 14 },
    { header: 'Current Loss', width: 14 }, { header: 'Δ Loss', width: 12 },
    { header: 'Reference Source', width: 24 }, { header: 'Current Source', width: 24 }
  ])

  model.bomRows.forEach(row => {
    sheet.addRow([
      row.itemCode, row.description, row.comparison, confidenceLabel(row.confidence),
      row.referenceConsumption, row.currentConsumption, row.consumptionGap, row.unit,
      row.referencePrice, row.currentPrice, row.priceGap, row.referenceLoss,
      row.currentLoss, row.lossGap, row.referenceSource, row.currentSource
    ])
  })
  styleDataRows(sheet, 5, 4 + model.bomRows.length, 3, 4, {
    5: '#,##0.0000', 6: '#,##0.0000', 7: '#,##0.0000;[Red]-#,##0.0000;—',
    9: '#,##0.0000', 10: '#,##0.0000', 11: '#,##0.0000;[Red]-#,##0.0000;—',
    12: '0.00%', 13: '0.00%', 14: '0.00%;[Red]-0.00%;—'
  })
}

function writeRoutingSheet(workbook: ExcelJS.Workbook, model: ComparisonExportModel): void {
  const sheet = createDetailSheet(workbook, 'Routing Comparison', 'Routing Comparison', [
    { header: 'Operation Code', width: 18 }, { header: 'Process', width: 28 },
    { header: 'Comparison', width: 28 }, { header: 'Confidence', width: 14 },
    { header: 'Reference Sequence', width: 18 }, { header: 'Current Sequence', width: 18 },
    { header: 'Reference Work Center', width: 22 }, { header: 'Current Work Center', width: 22 },
    { header: 'Manning', width: 12 }, { header: 'Reference Capacity', width: 18 },
    { header: 'Current Capacity', width: 18 }, { header: 'Δ Capacity', width: 14 },
    { header: 'Reference Yield', width: 16 }, { header: 'Current Yield', width: 16 },
    { header: 'Δ Yield', width: 12 }, { header: 'Reference Source', width: 24 },
    { header: 'Current Source', width: 24 }
  ])

  model.routingRows.forEach(row => {
    sheet.addRow([
      row.operationCode, row.processName, row.comparison, confidenceLabel(row.confidence),
      row.referenceSequence, row.currentSequence, row.referenceWorkCenter, row.currentWorkCenter,
      row.manning, row.referenceCapacity, row.currentCapacity, row.capacityGap,
      row.referenceYield, row.currentYield, row.yieldGap, row.referenceSource, row.currentSource
    ])
  })
  styleDataRows(sheet, 5, 4 + model.routingRows.length, 3, 4, {
    5: '0', 6: '0', 9: '#,##0.0', 10: '#,##0.0000', 11: '#,##0.0000',
    12: '#,##0.0000;[Red]-#,##0.0000;—', 13: '0.00%', 14: '0.00%',
    15: '0.00%;[Red]-0.00%;—'
  })
}

function writeWorkCenterSheet(workbook: ExcelJS.Workbook, model: ComparisonExportModel): void {
  const sheet = createDetailSheet(workbook, 'Work Center Comparison', 'Work Center Comparison', [
    { header: 'Work Center', width: 22 }, { header: 'Description', width: 30 },
    { header: 'Comparison', width: 18 }, { header: 'Confidence', width: 14 },
    { header: 'Labor Ref', width: 14 }, { header: 'Labor Current', width: 16 },
    { header: 'Labor Δ', width: 14 }, { header: 'Burden Ref', width: 14 },
    { header: 'Burden Current', width: 16 }, { header: 'Burden Δ', width: 14 },
    { header: 'Effective Date Ref', width: 18 }, { header: 'Effective Date Current', width: 20 },
    { header: 'Source Ref', width: 24 }, { header: 'Source Current', width: 24 }
  ])

  model.workCenterRows.forEach(row => {
    sheet.addRow([
      row.workCenterCode, row.description, row.comparison, confidenceLabel(row.confidence),
      row.referenceLaborRate, row.currentLaborRate, row.laborGap,
      row.referenceBurdenRate, row.currentBurdenRate, row.burdenGap,
      excelDate(row.referenceEffectiveDate), excelDate(row.currentEffectiveDate),
      row.referenceSource, row.currentSource
    ])
  })
  styleDataRows(sheet, 5, 4 + model.workCenterRows.length, 3, 4, {
    5: '#,##0.00', 6: '#,##0.00', 7: '#,##0.00;[Red]-#,##0.00;—',
    8: '#,##0.00', 9: '#,##0.00', 10: '#,##0.00;[Red]-#,##0.00;—'
  })
  for (let rowNumber = 5; rowNumber <= 4 + model.workCenterRows.length; rowNumber += 1) {
    sheet.getRow(rowNumber).getCell(11).numFmt = 'yyyy-mm-dd'
    sheet.getRow(rowNumber).getCell(12).numFmt = 'yyyy-mm-dd'
  }
}

/** Generates a comparison workbook without mutating the current application state. */
export async function generateSnapshotComparisonExcel(input: ComparisonExportInput): Promise<Blob> {
  const model = buildComparisonExportModel(input)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  writeSummarySheet(workbook, model)
  writeBOMSheet(workbook, model)
  writeRoutingSheet(workbook, model)
  writeWorkCenterSheet(workbook, model)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}
